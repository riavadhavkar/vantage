// Screenshots of the interface at 390, 768 and 1440, with console, overflow and network checks.
// Usage: node scripts/v2-shots.mjs [--url http://localhost:5174] [--only landing,player,...] [--widths 390,1440] [--query "&motion=off"]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = {}
process.argv.slice(2).forEach((a, i, all) => a.startsWith('--') && (args[a.slice(2)] = all[i + 1]))
const BASE = args.url || 'http://localhost:5174'
const EXTRA = args.query || ''
const ONLY = args.only ? args.only.split(',') : null
const PREFIX = args.prefix || 'v2-'
const out = resolve(dirname(fileURLToPath(import.meta.url)), '../design/screens')
mkdirSync(out, { recursive: true })
const want = (name) => !ONLY || ONLY.includes(name)

const WIDTHS = [
  { name: '390', width: 390, height: 844, scale: 2, isMobile: true },
  { name: '768', width: 768, height: 1024, scale: 1, isMobile: true },
  { name: '1440', width: 1440, height: 900, scale: 1, isMobile: false },
].filter((w) => !args.widths || args.widths.split(',').includes(w.name))

let problems = 0
const browser = await chromium.launch()
for (const vp of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, isMobile: vp.isMobile, hasTouch: vp.isMobile })
  const page = await ctx.newPage()
  const tag = (s) => `[${s} ${vp.name}]`
  let step = 'landing'
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && (problems++, console.log(`${tag(step)} console ${m.type()}: ${m.text().slice(0, 300)}`)))
  page.on('pageerror', (e) => (problems++, console.log(`${tag(step)} pageerror: ${e.message}`)))
  page.on('request', (r) => !r.url().startsWith(BASE) && !/^(data|blob):/.test(r.url()) && (problems++, console.log(`${tag(step)} network call: ${r.url()}`)))
  const shot = async (name) => {
    if (!want(name)) return
    await page.screenshot({ path: `${out}/${PREFIX}${name}-${vp.name}.png` })
    const overflow = await page.evaluate(() => {
      const els = [document.documentElement, document.body]
      const prev = els.map((e) => e.style.overflowX)
      els.forEach((e) => (e.style.overflowX = 'visible'))
      const extra = document.documentElement.scrollWidth - window.innerWidth
      els.forEach((e, i) => (e.style.overflowX = prev[i]))
      return extra
    })
    if (overflow > 0) (problems++, console.log(`${tag(name)} horizontal overflow: ${overflow}px`))
  }
  const skip = async () => {
    if (await page.locator('.v2-word:not(.is-in)').count()) await page.locator('.v2-captions').click({ timeout: 2000 }).catch(() => {})
    await page.waitForTimeout(900)
  }
  const title = (t) => page.waitForFunction((x) => document.querySelector('#v2-title')?.textContent === x, t, { timeout: 15000 })
  const run = async (name, fn) => {
    step = name
    try {
      await fn()
    } catch (e) {
      problems++
      console.log(`${tag(name)} FLOW: ${e.message.split('\n')[0]}`)
    }
  }

  await run('landing', async () => {
    await page.goto(`${BASE}/?demo=1${EXTRA}`)
    await page.waitForTimeout(3200)
    await shot('landing')
  })
  if (ONLY && ONLY.length === 1 && ONLY[0] === 'landing') {
    await ctx.close()
    continue
  }
  await run('player', async () => {
    await page.getByRole('button', { name: 'Begin' }).click()
    await page.waitForSelector('#v2-title')
    await page.waitForTimeout(1200)
    await skip()
    await page.waitForTimeout(1600)
    await shot('player')
  })
  await run('evidence', async () => {
    if (!want('evidence')) return
    await page.getByRole('button', { name: /Grounded in/ }).click()
    await page.waitForSelector('[role=dialog]')
    await page.waitForTimeout(1400)
    await shot('evidence')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(700)
  })
  await run('switch', async () => {
    if (!want('switch') && !want('passengers') && !want('contradiction')) return
    await page.getByRole('button', { name: /Hear it from the cabin passengers/ }).click()
    await page.waitForTimeout(300)
    await shot('switch')
    await title('A slight jolt')
    await page.waitForTimeout(1200)
    await skip()
    await page.waitForTimeout(1200)
    await shot('passengers')
  })
  await run('contradiction', async () => {
    if (!want('contradiction')) return
    await page.getByRole('button', { name: /Hear it from third class/ }).click()
    await title('Room for half')
    await page.waitForTimeout(1200)
    await skip()
    await page.getByRole('button', { name: /Did she break in two/ }).click()
    await title('Did she break in two?')
    await page.waitForTimeout(1200)
    await skip()
    await page.waitForTimeout(1800)
    await page.locator('[aria-label="Sources disagree"]').first().scrollIntoViewIfNeeded()
    await page.waitForTimeout(1500)
    await shot('contradiction')
  })
  await ctx.close()
}
await browser.close()
console.log(`saved to ${out}${problems ? `, ${problems} problem(s) above` : ', no console errors, overflow, or network calls'}`)
