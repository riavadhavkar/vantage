// Share sheet: preview, save (filename, PNG size, tEXt metadata), QR and sms link, at 390, 768, 1440.
import { chromium } from 'playwright'
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const BASE = process.env.BASE || 'http://localhost:5178'
const out = resolve(dirname(fileURLToPath(import.meta.url)), '../screenshots')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
const errors = []
for (const vp of [{ n: '390', w: 390, h: 844, m: true }, { n: '768', w: 768, h: 1024, m: true }, { n: '1440', w: 1440, h: 900, m: false }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: vp.m, hasTouch: vp.m, acceptDownloads: true })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`[${vp.n}] ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && errors.push(`[${vp.n}] ${m.text()}`))
  await page.goto(`${BASE}/?motion=off`)
  await page.getByRole('button', { name: 'step 3, story' }).click()
  await page.getByRole('radio', { name: /sinking/i }).click()
  await page.getByRole('button', { name: 'open full transcript' }).waitFor({ timeout: 20000 })
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: 'share' }).click()
  await page.getByRole('button', { name: 'save image' }).waitFor({ timeout: 10000 })
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${out}/polish-share-${vp.n}.png` })
  if (vp.n === '1440') {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'save image' }).click()])
    const file = resolve(out, '../screenshots/_share-download.png')
    await dl.saveAs(file)
    const buf = readFileSync(file)
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20)
    const text = buf.toString('latin1').match(/tEXt(Title|Description|Software)\0[^\0]{0,120}/g) || []
    console.log('saved:', dl.suggestedFilename(), `${w}x${h}`, '| metadata:', text.map((t) => t.slice(4).replace('\0', ': ')).join(' | '))
    const href = await page.locator('.v2-share-photon a').getAttribute('href')
    console.log('sms link:', href)
    console.log('qr image present:', await page.locator('.v2-share-qr').count())
    console.log('caption:', await page.locator('.v2-share-caption').innerText())
    await page.locator('.v2-share-tipzone').hover().catch(() => {})
    await page.waitForTimeout(200)
    console.log('tooltip:', await page.locator('.v2-share-tip').innerText().catch(() => '(none)'))
    await page.screenshot({ path: `${out}/polish-share-tooltip-1440.png` })
  }
  await ctx.close()
}
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
