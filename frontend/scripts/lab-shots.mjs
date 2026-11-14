// Design lab screenshots: every prototype, four views, three widths.
// Usage: npm run dev (in another shell), then: node scripts/lab-shots.mjs [--only aperture] [--url http://localhost:5173]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((a) => a.trim().split(/\s+/)))
const BASE = args.url || 'http://localhost:5173'
const IDS = args.only ? args.only.split(',') : ['aperture', 'editorial', 'diff', 'stories']
const VIEWS = args.views ? args.views.split(',') : ['landing', 'player', 'evidence', 'contradiction']
const out = resolve(dirname(fileURLToPath(import.meta.url)), '../design/screens')
mkdirSync(out, { recursive: true })

const WIDTHS = [
  { name: '390', width: 390, height: 844, scale: 2, isMobile: true },
  { name: '768', width: 768, height: 1024, scale: 1, isMobile: true },
  { name: '1440', width: 1440, height: 900, scale: 1, isMobile: false },
].filter((w) => !args.widths || args.widths.split(',').includes(w.name))

const browser = await chromium.launch()
let problems = 0
for (const vp of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, isMobile: vp.isMobile, hasTouch: vp.isMobile })
  for (const id of IDS) {
    for (const view of VIEWS) {
      const page = await ctx.newPage()
      const tag = `[${id} ${view} ${vp.name}]`
      const external = []
      page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && (problems++, console.log(`${tag} console ${m.type()}: ${m.text()}`)))
      page.on('pageerror', (e) => (problems++, console.log(`${tag} pageerror: ${e.message}`)))
      page.on('request', (r) => !r.url().startsWith(BASE) && !r.url().startsWith('data:') && !r.url().startsWith('blob:') && external.push(r.url()))
      await page.goto(`${BASE}/lab/${id}?view=${view}&instant=1`)
      await page.waitForTimeout(view === 'landing' ? 1200 : 2200)
      if (view === 'contradiction') {
        await page.locator('[aria-label="Sources disagree"]').first().scrollIntoViewIfNeeded().catch(() => (problems++, console.log(`${tag} no contradiction found`)))
        await page.waitForTimeout(900)
      }
      await page.screenshot({ path: `${out}/${id}-${view}-${vp.name}.png` })
      const overflow = await page.evaluate(() => {
        const els = [document.documentElement, document.body]
        els.forEach((e) => (e.style.overflowX = 'visible'))
        return document.documentElement.scrollWidth - window.innerWidth
      })
      if (overflow > 0) (problems++, console.log(`${tag} horizontal overflow: ${overflow}px`))
      if (external.length) (problems++, console.log(`${tag} network calls: ${external.join(', ')}`))
      await page.close()
    }
  }
  await ctx.close()
}
await browser.close()
console.log(`saved to ${out}${problems ? `, ${problems} problem(s) above` : ', no console errors, overflow, or network calls'}`)
