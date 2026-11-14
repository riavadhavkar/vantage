// Screenshots for the sketch layout: landing with dropdowns, player, subtitle language switch,
// and Hindi text rendering. Run the dev server with VITE_VANTAGE_USE_MOCKS=1 on port 5175 first.
// Usage: node scripts/sketch-shots.mjs [--url http://localhost:5175]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://localhost:5175'
const out = resolve(dirname(fileURLToPath(import.meta.url)), '../screenshots')
mkdirSync(out, { recursive: true })
const WIDTHS = [
  { name: '390', width: 390, height: 844, isMobile: true },
  { name: '768', width: 768, height: 1024, isMobile: true },
  { name: '1440', width: 1440, height: 900, isMobile: false },
]
const browser = await chromium.launch()
for (const vp of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, isMobile: vp.isMobile, hasTouch: vp.isMobile })
  const page = await ctx.newPage()
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && console.log(`[${vp.name}] console ${m.type()}: ${m.text()}`))
  page.on('pageerror', (e) => console.log(`[${vp.name}] pageerror: ${e.message}`))
  await page.goto(BASE)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${out}/sketch-landing-${vp.name}.png` })
  await page.getByRole('button', { name: 'Begin' }).first().click()
  await page.getByRole('button', { name: 'open full transcript' }).waitFor({ timeout: 15000 })
  await page.waitForTimeout(4500)
  await page.screenshot({ path: `${out}/sketch-player-${vp.name}.png` })
  await page.getByRole('button', { name: 'subtitles and languages' }).click()
  await page.getByLabel('subtitles', { exact: true }).selectOption('es')
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${out}/sketch-subtitles-es-${vp.name}.png` })
  await page.keyboard.press('Escape')
  // Hindi: the mock never invents real content, so render a generic Devanagari sample in the
  // subtitle slot to check the self-hosted font fallback.
  await page.evaluate(() => {
    const el = document.querySelector('button[aria-label="open full transcript"] span span')
    if (el) {
      el.setAttribute('lang', 'hi')
      el.textContent = 'यह एक नमूना उपशीर्षक है, जो हिंदी लिपि दिखाता है।'
    }
  })
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${out}/sketch-hindi-${vp.name}.png` })
  await ctx.close()
}
await browser.close()
