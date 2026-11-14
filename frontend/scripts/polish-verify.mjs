// Polish verification: screenshots of the player, shutter, panels and popover at 390, 768, 1440,
// plus keyboard-only, reduced motion, demo offline, Hindi font, and landing frame rate at 4x CPU.
// Needs: mock dev server on 5178 (VITE_VANTAGE_USE_MOCKS=1) and a plain one on 5179 (for ?demo=1).
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const MOCK = process.env.MOCK || 'http://localhost:5178'
const PLAIN = process.env.PLAIN || 'http://localhost:5179'
const out = resolve(dirname(fileURLToPath(import.meta.url)), '../screenshots')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
const errors = []
const log = (...a) => console.log(...a)
const watch = (page, tag) => {
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag}: ${m.text()}`))
}
const start = async (page, base, query = '') => {
  await page.goto(`${base}/${query}`)
  await page.getByRole('button', { name: 'step 3, story' }).click({ timeout: 8000 })
  await page.getByRole('radio', { name: /sinking/i }).click()
}

// 1. per width: shutter, player, pull, popover, graph, map, sources
for (const vp of [{ n: '390', w: 390, h: 844, m: true }, { n: '768', w: 768, h: 1024, m: true }, { n: '1440', w: 1440, h: 900, m: false }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: vp.m, hasTouch: vp.m })
  const page = await ctx.newPage()
  watch(page, `w${vp.n}`)
  await page.goto(`${MOCK}/`)
  await page.waitForTimeout(2600)
  await page.getByRole('button', { name: 'step 3, story' }).click()
  await page.getByRole('radio', { name: /sinking/i }).click()
  await page.locator('.v2-shutter').first().waitFor({ timeout: 5000 })
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${out}/polish-shutter-start-${vp.n}.png` })
  await page.getByRole('button', { name: 'open full transcript' }).waitFor({ timeout: 20000 })
  await page.locator('.v2-shutter').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(4000)
  log(`[${vp.n}] choice pills on screen: ${await page.locator('.v2-choice, nav[aria-label="where to go next"]').count()} | floating source tags on stage: ${await page.locator('.v2-stage .v2-chip, .v2-pin').count()}`)
  await page.screenshot({ path: `${out}/polish-player-${vp.n}.png` })
  await page.getByRole('button', { name: 'language', exact: true }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${out}/polish-language-popover-${vp.n}.png` })
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'story connections' }).click()
  await page.waitForTimeout(1800)
  log(`[${vp.n}] react flow attribution visible: ${await page.locator('.react-flow__attribution').count()}`)
  await page.screenshot({ path: `${out}/polish-graph-${vp.n}.png` })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: 'map', exact: true }).click()
  await page.waitForTimeout(2200)
  await page.screenshot({ path: `${out}/polish-map-${vp.n}.png` })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: 'sources' }).click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${out}/polish-sources-expanded-${vp.n}.png` })
  await page.locator('.v2-scard-toggle[aria-expanded="true"]').first().click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${out}/polish-sources-collapsed-${vp.n}.png` })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  // the perspective pull: the timeline changes the view
  await page.getByRole('radio', { name: /cabin passengers/i }).click()
  await page.locator('.v2-shutter.is-inline').waitFor({ timeout: 4000 }).catch(() => {})
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${out}/polish-shutter-pull-${vp.n}.png` })
  log(`[${vp.n}] pull text: ${JSON.stringify(await page.locator('.v2-shutter-text').allInnerTexts())}`)
  await page.waitForTimeout(4000)
  log(`[${vp.n}] after timeline: title "${await page.locator('.v2-hud-title').innerText()}", in focus "${await page.locator('.v2-mark.is-on .v2-mark-name').first().innerText()}"`)
  await ctx.close()
}

// 2. keyboard only, end to end
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  watch(page, 'keyboard')
  await page.goto(`${MOCK}/?motion=off`)
  const focused = () => page.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim().slice(0, 30))
  const path = []
  for (let i = 0; i < 4; i++) (await page.keyboard.press('Tab'), path.push(await focused()))
  await page.keyboard.press('Enter') // step 1: accept english
  path.push(`enter -> ${await focused()}`)
  await page.keyboard.press('ArrowRight') // move within subtitles options
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('Enter') // step 2: accept same as narration
  path.push(`enter -> ${await focused()}`)
  await page.keyboard.press('Enter') // step 3: first story
  await page.getByRole('button', { name: 'open full transcript' }).waitFor({ timeout: 20000 })
  log('landing by keyboard:', path.join(' > '))
  await page.locator('.v2-shutter').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {})
  await page.evaluate(() => document.activeElement?.blur())
  const hud = []
  for (let i = 0; i < 12; i++) (await page.keyboard.press('Tab'), hud.push(await focused()))
  log('player tab order:', hud.join(' > '))
  await page.getByRole('button', { name: 'sources' }).focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  log('sources opened by keyboard:', await page.getByRole('dialog', { name: 'sources' }).count())
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await page.locator('.v2-mark.is-on').focus()
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(5000)
  log('timeline by arrow key, now in focus:', await page.locator('.v2-mark.is-on .v2-mark-name').first().innerText())
  await page.close()
}

// 3. reduced motion
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  watch(page, 'reduced')
  await page.goto(`${MOCK}/`)
  await page.waitForTimeout(400)
  log('reduced motion: step bar visible at 400 ms:', await page.locator('.v2-lbar').count(), '| soft wordmark copy:', await page.locator('.v2-lmark-soft').count())
  await page.screenshot({ path: `${out}/polish-landing-reduced-1440.png` })
  await page.getByRole('button', { name: 'step 3, story' }).click()
  await page.getByRole('radio', { name: /sinking/i }).click()
  await page.locator('.v2-shutter').first().waitFor({ timeout: 5000 })
  log('reduced motion: shutter blades turning:', await page.locator('.v2-logo.is-turning').count())
  await ctx.close()
}

// 4. demo mode offline: no requests beyond the dev server
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  watch(page, 'demo')
  const origins = new Map()
  page.on('request', (r) => {
    const u = new URL(r.url())
    if (u.protocol.startsWith('http')) origins.set(u.origin, (origins.get(u.origin) || 0) + 1)
  })
  await page.goto(`${PLAIN}/?demo=1`)
  await page.waitForTimeout(2600)
  const steps = await page.locator('.v2-lpill').allInnerTexts()
  log('demo: pills', JSON.stringify(steps.map((s) => s.replace(/\s+/g, ' '))), '| active step:', await page.locator('.v2-lpill.is-active').innerText().catch(() => 'none'))
  await page.screenshot({ path: `${out}/polish-landing-demo-1440.png` })
  await page.getByRole('radio', { name: /sinking/i }).click()
  await page.getByRole('button', { name: 'open full transcript' }).waitFor({ timeout: 20000 })
  await page.waitForTimeout(3000)
  log('demo: origins contacted', JSON.stringify([...origins]))
  await page.close()
}

// 5. Hindi: the self-hosted Devanagari font renders
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  watch(page, 'hindi')
  await start(page, MOCK, '?motion=off')
  await page.getByRole('button', { name: 'open full transcript' }).waitFor({ timeout: 20000 })
  await page.locator('.v2-shutter').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {})
  await page.getByRole('button', { name: 'language', exact: true }).click()
  await page.getByLabel('subtitles', { exact: true }).selectOption('hi')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(1200)
  // the mock never invents a translation; put a generic Devanagari sentence in the line to test the font
  await page.evaluate(() => {
    const el = document.querySelector('button[aria-label="open full transcript"] > span > span')
    if (el) (el.textContent = 'यह एक नमूना उपशीर्षक है।'), el.setAttribute('lang', 'hi')
  })
  await page.waitForTimeout(400)
  const ok = await page.evaluate(() => document.fonts.check('28px "Noto Sans Devanagari"', 'यह'))
  log('hindi: Noto Sans Devanagari loaded:', ok, '| lang on line:', await page.locator('button[aria-label="open full transcript"] > span > span').getAttribute('lang'))
  await page.screenshot({ path: `${out}/polish-hindi-1440.png` })
  await page.close()
}

// 6. landing blur-in frame rate at 4x CPU throttling
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.addInitScript(() => {
    window.__frames = []
    const tick = (t) => (window.__frames.push(t), window.__frames.length < 400 && requestAnimationFrame(tick))
    requestAnimationFrame(tick)
  })
  await page.goto(`${MOCK}/`)
  await page.waitForTimeout(2600)
  const f = await page.evaluate(() => window.__frames)
  const d = f.slice(1).map((t, i) => t - f[i]).filter((x, i) => f[i + 1] < f[0] + 2100)
  const avg = d.reduce((a, b) => a + b, 0) / d.length
  log(`fps at 4x CPU during the first 2.1 s: average ${(1000 / avg).toFixed(1)} fps, frames over 50 ms: ${d.filter((x) => x > 50).length} of ${d.length}`)
  await page.close()
}

log('console errors:', errors.length ? errors : 'none')
await browser.close()
