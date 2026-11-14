// Frame-rate check under CPU throttling (a proxy for a mid-range phone).
// Usage: node scripts/fps.mjs --url "http://localhost:5174/lab/aperture?view=player&instant=1" --click "Third class" [--rate 4] [--width 390]
// Records requestAnimationFrame intervals for 1.5 s after the click and reports them.
import { chromium } from 'playwright'

const args = {}
process.argv.slice(2).forEach((a, i, all) => a.startsWith('--') && (args[a.slice(2)] = all[i + 1]))
const rate = Number(args.rate || 4)
const width = Number(args.width || 1440)
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: width < 600 ? { width, height: 844 } : { width, height: 900 }, deviceScaleFactor: width < 600 ? 2 : 1, isMobile: width < 600, hasTouch: width < 600 })
const page = await ctx.newPage()
const cdp = await ctx.newCDPSession(page)
await page.goto(args.url)
await page.waitForTimeout(Number(args.settle || 2500))
await cdp.send('Emulation.setCPUThrottlingRate', { rate })
await page.evaluate(() => {
  window.__frames = []
  let last = performance.now()
  const tick = (now) => {
    window.__frames.push(now - last)
    last = now
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})
await page.waitForTimeout(300)
await page.evaluate(() => (window.__frames.length = 0))
if (args.click) await page.getByRole(args.role || 'radio', { name: new RegExp(args.click) }).first().click()
if (args.key) await page.keyboard.press(args.key)
await page.waitForTimeout(Number(args.window || 1500))
const frames = await page.evaluate(() => window.__frames.slice())
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
await browser.close()
const sorted = [...frames].sort((a, b) => a - b)
const total = frames.reduce((n, f) => n + f, 0)
const pct = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]
console.log(JSON.stringify({
  label: args.label || args.url, width, cpuThrottle: `${rate}x`,
  frames: frames.length, avgFps: +(1000 / (total / frames.length)).toFixed(1),
  medianMs: +pct(0.5).toFixed(1), p95Ms: +pct(0.95).toFixed(1), worstMs: +sorted[sorted.length - 1].toFixed(1),
  over33ms: frames.filter((f) => f > 33.4).length, over50ms: frames.filter((f) => f > 50).length,
}))
