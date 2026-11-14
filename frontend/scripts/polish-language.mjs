// Narration change mid-story (seamless) and a subtitle-language change. Mock dev server on 5178.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const BASE = process.env.BASE || 'http://localhost:5178'
const out = resolve(dirname(fileURLToPath(import.meta.url)), '../screenshots')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await page.goto(`${BASE}/?motion=off`)
await page.getByRole('button', { name: 'step 3, story' }).click()
await page.getByRole('radio', { name: /sinking/i }).click()
await page.getByRole('button', { name: 'open full transcript' }).waitFor({ timeout: 20000 })
await page.waitForTimeout(2500)
const title0 = await page.locator('.v2-hud-title').innerText()
await page.getByRole('button', { name: 'language', exact: true }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: `${out}/polish-language-popover-1440.png` })
await page.getByLabel('narration', { exact: true }).selectOption('es')
await page.keyboard.press('Escape')
const toasts = new Set()
let shutter = false
for (let i = 0; i < 40; i++) {
  for (const t of await page.locator('.v2-toast').allInnerTexts()) toasts.add(t)
  if (await page.locator('.v2-shutter').count()) shutter = true
  await page.waitForTimeout(150)
}
console.log('title before:', title0, '| after:', await page.locator('.v2-hud-title').innerText())
console.log('subtitle now:', await page.locator('button[aria-label="open full transcript"] > span').innerText())
console.log('toasts seen:', [...toasts].join(' -> '))
console.log('shutter shown during the switch:', shutter)
await page.screenshot({ path: `${out}/polish-language-switched-1440.png` })
// subtitles in Hindi while narration is Spanish
await page.getByRole('button', { name: 'language', exact: true }).click()
await page.getByLabel('subtitles', { exact: true }).selectOption('hi')
await page.keyboard.press('Escape')
await page.waitForTimeout(1500)
console.log('subtitle (hi):', await page.locator('button[aria-label="open full transcript"] > span').innerText(), '| lang:', await page.locator('button[aria-label="open full transcript"] > span > span').getAttribute('lang'))
// a new scene from the timeline arrives in Spanish
await page.getByRole('radio', { name: /cabin passengers/i }).click()
await page.waitForTimeout(6000)
console.log('next scene title:', await page.locator('.v2-hud-title').innerText())
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
