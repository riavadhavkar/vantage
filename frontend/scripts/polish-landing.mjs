// Landing screenshots: each load stage and each step, at 390, 768 and 1440.
// Needs the mock dev server: VITE_VANTAGE_USE_MOCKS=1 npm run dev -- --port 5178
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.env.BASE || 'http://localhost:5178'
const out = resolve(dirname(fileURLToPath(import.meta.url)), '../screenshots')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
const errors = []
for (const vp of [{ n: '390', w: 390, h: 844, m: true }, { n: '768', w: 768, h: 1024, m: true }, { n: '1440', w: 1440, h: 900, m: false }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: vp.m, hasTouch: vp.m })
  const page = await ctx.newPage()
  page.on('console', (m) => m.type() === 'error' && errors.push(`[${vp.n}] ${m.text()}`))
  page.on('pageerror', (e) => errors.push(`[${vp.n}] ${e.message}`))
  await page.goto(BASE)
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${out}/polish-landing-1-blur-${vp.n}.png` })
  await page.waitForTimeout(1250)
  await page.screenshot({ path: `${out}/polish-landing-2-shrink-${vp.n}.png` })
  await page.waitForTimeout(1300)
  await page.screenshot({ path: `${out}/polish-landing-3-step1-${vp.n}.png` })
  const scroll = await page.evaluate(() => [document.documentElement.scrollWidth > innerWidth, document.documentElement.scrollHeight > innerHeight])
  console.log(`[${vp.n}] horizontal overflow: ${scroll[0]}, vertical overflow: ${scroll[1]}`)
  await page.getByRole('radio', { name: 'spanish' }).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${out}/polish-landing-4-step2-${vp.n}.png` })
  await page.getByRole('radio', { name: 'same as narration' }).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${out}/polish-landing-5-step3-${vp.n}.png` })
  await ctx.close()
}
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
