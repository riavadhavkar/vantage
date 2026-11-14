// Screenshots of the sketch layout. Mock dev server on 5175.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const BASE = 'http://localhost:5175/'
const out = resolve(dirname(fileURLToPath(import.meta.url)), '../screenshots')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
for (const vp of [{ n: '390', w: 390, h: 844, m: true }, { n: '768', w: 768, h: 1024, m: true }, { n: '1440', w: 1440, h: 900, m: false }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: vp.m, hasTouch: vp.m })
  const page = await ctx.newPage()
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && console.log(`[${vp.n}] console ${m.type()}: ${m.text()}`))
  page.on('pageerror', (e) => console.log(`[${vp.n}] pageerror: ${e.message}`))
  await page.goto(BASE)
  await page.waitForTimeout(3500)
  await page.screenshot({ path: `${out}/sketch-v2-landing-${vp.n}.png` })
  await page.getByRole('button', { name: /begin/i }).first().click()
  await page.getByRole('button', { name: 'open full transcript' }).waitFor({ timeout: 20000 })
  await page.waitForTimeout(5000)
  await page.screenshot({ path: `${out}/sketch-v2-player-${vp.n}.png` })
  await page.getByRole('button', { name: 'subtitles and languages' }).click()
  await page.getByLabel('subtitles', { exact: true }).selectOption('es')
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${out}/sketch-v2-subtitles-es-${vp.n}.png` })
  await page.keyboard.press('Escape')
  await page.evaluate(() => {
    const el = document.querySelector('button[aria-label="open full transcript"] span span')
    if (el) { el.setAttribute('lang', 'hi'); el.textContent = 'यह एक नमूना उपशीर्षक है, जो हिंदी लिपि दिखाता है।' }
  })
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${out}/sketch-v2-hindi-${vp.n}.png` })
  await ctx.close()
}
await browser.close()
