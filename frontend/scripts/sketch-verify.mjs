// Behavior checks for the sketch layout. Needs: mock dev server on 5175 (VITE_VANTAGE_USE_MOCKS=1)
// and a plain dev server on 5176 (for demo and offline). Prints findings; saves a few shots.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// UI=v2 runs every check against the v2 interface (?ui=v2)
const Q = process.env.UI === 'v2' ? 'ui=v2' : ''
const MOCK = `http://localhost:5175/?${Q}`
const PLAIN = 'http://localhost:5176'
const out = resolve(dirname(fileURLToPath(import.meta.url)), '../screenshots')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
const log = (...a) => console.log(...a)
const errors = []
const watch = (page, tag) => {
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag}: ${m.text()}`))
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`))
}

// 1. keyboard-only: tab order and popover
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  watch(page, 'keyboard')
  await page.goto(MOCK)
  await page.getByRole('button', { name: 'Begin' }).first().focus()
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'open full transcript' }).waitFor({ timeout: 15000 })
  await page.evaluate(() => document.activeElement?.blur())
  const order = []
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Tab')
    order.push(await page.evaluate(() => {
      const e = document.activeElement
      return e ? (e.getAttribute('aria-label') || e.id || e.textContent?.trim().slice(0, 30) || e.tagName) : 'none'
    }))
  }
  log('tab order:', order.join(' > '))
  // open settings by keyboard, change subtitles, confirm narration restart
  await page.getByRole('button', { name: 'subtitles and languages' }).focus()
  await page.keyboard.press('Enter')
  await page.getByLabel('narration', { exact: true }).selectOption('es')
  const confirmText = await page.getByRole('alertdialog').innerText()
  log('narration change shows:', JSON.stringify(confirmText.split('\n')[0]))
  await page.getByRole('button', { name: 'restart', exact: true }).click()
  await page.waitForTimeout(1800)
  log('restarted, subtitle button present:', await page.getByRole('button', { name: 'open full transcript' }).count())
  log('stored languages:', await page.evaluate(() => localStorage.getItem('vantage.languages.v1')))
  await ctx.close()
}

// 2. choices, contradiction, ungrounded
for (const vp of [{ w: 1440, h: 900 }, { w: 390, h: 844 }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } })
  const page = await ctx.newPage()
  watch(page, `flow-${vp.w}`)
  await page.goto(MOCK)
  await page.getByRole('button', { name: 'Begin' }).first().click()
  await page.getByRole('button', { name: 'open full transcript' }).waitFor({ timeout: 15000 })
  await page.getByRole('navigation', { name: 'where to go next' }).waitFor({ timeout: 60000 })
  log(`[${vp.w}] choices appeared after narration:`, await page.getByRole('navigation', { name: 'where to go next' }).getByRole('button').count())
  await page.screenshot({ path: `${out}/sketch-${Q ? 'v2-' : ''}choices-${vp.w}.png` })
  const input = page.getByLabel('ask a question about this moment')
  await input.fill('Did she break in two?')
  await input.press('Enter')
  await page.getByRole('region', { name: 'Sources disagree' }).waitFor({ timeout: 90000 })
  await page.waitForTimeout(1600)
  log(`[${vp.w}] contradiction view visible with text label:`, await page.getByText('Sources disagree').first().isVisible())
  await page.screenshot({ path: `${out}/sketch-${Q ? 'v2-' : ''}contradiction-${vp.w}.png` })
  await input.fill('zzzz qqqq nothing')
  await input.press('Enter')
  await page.getByText('not grounded').waitFor({ timeout: 30000 })
  log(`[${vp.w}] ungrounded notice shown, subtitle button count:`, await page.getByRole('button', { name: 'open full transcript' }).count())
  await page.screenshot({ path: `${out}/sketch-${Q ? 'v2-' : ''}ungrounded-${vp.w}.png` })
  await ctx.close()
}

// 3. reduced motion
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  watch(page, 'reduced')
  await page.goto(MOCK)
  await page.getByRole('button', { name: 'Begin' }).first().click()
  await page.getByRole('button', { name: 'open full transcript' }).waitFor({ timeout: 15000 })
  const first = await page.locator('form span[aria-hidden="true"]').innerText()
  await page.waitForTimeout(9000)
  const later = await page.locator('form span[aria-hidden="true"]').innerText()
  log('reduced motion placeholder static:', first === later, JSON.stringify(first))
  await ctx.close()
}

// 4. normal motion: placeholder rotates, pauses on focus
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(MOCK)
  await page.getByRole('button', { name: 'Begin' }).first().click()
  await page.getByRole('button', { name: 'open full transcript' }).waitFor({ timeout: 15000 })
  const seen = new Set()
  for (let i = 0; i < 6; i++) {
    seen.add(await page.locator('form span[aria-hidden="true"]').innerText())
    await page.waitForTimeout(2100)
  }
  log('placeholder phrases seen:', [...seen].join(' | '))
  await page.getByLabel('ask a question about this moment').focus()
  const a = await page.locator('form span[aria-hidden="true"]').innerText()
  await page.waitForTimeout(9000)
  log('paused while focused:', a === (await page.locator('form span[aria-hidden="true"]').innerText()))
  await ctx.close()
}

// 5. demo and offline: no requests beyond the dev server, none to the API
for (const [name, url] of [['demo', `${PLAIN}/?demo=1&${Q}`], ['offline', `${PLAIN}/?${Q}`]]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  watch(page, name)
  const hosts = new Map()
  page.on('request', (r) => {
    const u = new URL(r.url())
    if (u.protocol.startsWith('http')) hosts.set(u.origin, (hosts.get(u.origin) || 0) + 1)
  })
  const failedApi = []
  page.on('requestfailed', (r) => r.url().includes(':8000') && failedApi.push(r.url()))
  await page.goto(url)
  await page.getByRole('button', { name: 'Begin' }).first().click()
  await page.getByRole('button', { name: 'open full transcript' }).waitFor({ timeout: 30000 })
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: 'subtitles and languages' }).click()
  log(`[${name}] narration select disabled:`, await page.getByLabel('narration', { exact: true }).isDisabled(), '| hint:', await page.getByText('offline demo').count())
  await page.screenshot({ path: `${out}/sketch-${Q ? 'v2-' : ''}${name}-1440.png` })
  log(`[${name}] origins contacted:`, JSON.stringify([...hosts]), '| failed api calls:', failedApi.length)
  await ctx.close()
}
log('console errors:', errors.length ? errors : 'none')
await browser.close()
