// Subtitles: every visible line must be one line (no wrap) at 390, 768 and 1440, for English
// and the mock Spanish translation. Mock dev server on 5178.
import { chromium } from 'playwright'
const BASE = process.env.BASE || 'http://localhost:5178'
const browser = await chromium.launch()
let bad = 0
for (const vp of [{ w: 390, h: 844 }, { w: 768, h: 1024 }, { w: 1440, h: 900 }]) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } })
  await page.goto(`${BASE}/?motion=off`)
  await page.getByRole('button', { name: 'step 3, story' }).click()
  await page.getByRole('radio', { name: /sinking/i }).click()
  await page.getByRole('button', { name: 'open full transcript' }).waitFor({ timeout: 20000 })
  const lines = new Set()
  for (let i = 0; i < 40; i++) {
    const r = await page.evaluate(() => {
      const el = document.querySelector('button[aria-label="open full transcript"] > span')
      if (!el) return null
      const lh = parseFloat(getComputedStyle(el).lineHeight)
      return { text: el.textContent, lines: Math.round(el.getBoundingClientRect().height / lh), clipped: el.scrollWidth > el.clientWidth + 1 }
    })
    if (r && r.text) {
      lines.add(r.text)
      if (r.lines > 1 || r.clipped) (bad++, console.log(`[${vp.w}] NOT ONE LINE:`, r))
    }
    await page.waitForTimeout(250)
  }
  console.log(`[${vp.w}] ${lines.size} distinct lines seen, e.g. ${JSON.stringify([...lines].slice(0, 3))}`)
  await page.close()
}
console.log(bad ? `FAIL: ${bad} wrapped or clipped lines` : 'PASS: every line fit on one line')
await browser.close()
