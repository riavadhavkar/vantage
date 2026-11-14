// Frame-rate check under CPU throttling (a proxy for a mid-range phone; this is headless Chromium
// on a laptop, not a phone). Records requestAnimationFrame intervals during an action and reports them.
//
//   node scripts/fps.mjs --case landing-load|switch|choice|evidence|contradiction|graph|share [--width 390] [--rate 4]
//   node scripts/fps.mjs --url <url> --click "<name>" [--role radio]      (any page)
import { chromium } from 'playwright'

const args = {}
process.argv.slice(2).forEach((a, i, all) => a.startsWith('--') && (args[a.slice(2)] = all[i + 1]))
const rate = Number(args.rate || 4)
const width = Number(args.width || 1440)
const BASE = args.base || 'http://localhost:5174'
const V2 = `${BASE}/?demo=1&ui=v2`
const isPhone = width < 600

const RECORDER = () => {
  window.__frames = []
  let last = performance.now()
  const tick = (now) => {
    window.__frames.push(now - last)
    last = now
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width, height: isPhone ? 844 : 900 }, deviceScaleFactor: isPhone ? 2 : 1, isMobile: isPhone, hasTouch: isPhone })
const page = await ctx.newPage()
const cdp = await ctx.newCDPSession(page)
const throttle = (r) => cdp.send('Emulation.setCPUThrottlingRate', { rate: r })
const startRecording = async () => {
  await page.evaluate(RECORDER)
  await page.waitForTimeout(250)
  await page.evaluate(() => (window.__frames.length = 0))
}
const toPlayer = async () => {
  await page.goto(V2)
  await page.waitForTimeout(2600)
  await page.getByRole('button', { name: 'Begin' }).click()
  await page.waitForSelector('#v2-title')
  await page.waitForTimeout(1500)
  if (await page.locator('.v2-word:not(.is-in)').count()) await page.locator('.v2-captions').click().catch(() => {})
  await page.waitForTimeout(1500)
}
const title = (t) => page.waitForFunction((x) => document.querySelector('#v2-title')?.textContent === x, t, { timeout: 15000 })

const CASES = {
  // the whole landing load sequence, throttled from the first byte
  'landing-load': async () => {
    await throttle(rate)
    await page.addInitScript(RECORDER)
    await page.goto(V2)
    return 2600
  },
  // the signature: perspective switch through the ring
  switch: async () => {
    await toPlayer()
    await throttle(rate)
    await startRecording()
    await page.getByRole('radio', { name: /Cabin passengers/ }).click()
    return 1500
  },
  // a choice in the same perspective: wash, scene crossfade, new captions
  choice: async () => {
    await toPlayer()
    await throttle(rate)
    await startRecording()
    await page.getByRole('button', { name: /What happened at 11:40 pm/ }).click()
    return 1800
  },
  // a pin travels to the evidence paper, the sheet slides in, the highlighter sweeps
  evidence: async () => {
    await toPlayer()
    await page.waitForSelector('.v2-pin')
    await page.waitForTimeout(800)
    await throttle(rate)
    await startRecording()
    await page.locator('.v2-pin').first().click()
    return 1600
  },
  // the frame splits and the two accounts slide in
  contradiction: async () => {
    await toPlayer()
    await page.getByRole('button', { name: /Read what the inquiries found/ }).click()
    await title('Rockets in the night')
    await page.waitForTimeout(1600)
    await throttle(rate)
    await startRecording()
    await page.locator('.v2-captions').click()
    return 2200
  },
  graph: async () => {
    await toPlayer()
    await page.getByRole('radio', { name: /Cabin passengers/ }).click()
    await title('A slight jolt')
    await page.waitForTimeout(1800)
    await throttle(rate)
    await startRecording()
    await page.getByRole('button', { name: 'How the story connects' }).click()
    return 2200
  },
  share: async () => {
    await toPlayer()
    await throttle(rate)
    await startRecording()
    await page.getByRole('button', { name: 'Share this moment' }).click()
    return 2000
  },
}

let windowMs = Number(args.window || 1500)
if (args.case) {
  windowMs = await CASES[args.case]()
} else {
  await page.goto(args.url)
  await page.waitForTimeout(Number(args.settle || 2500))
  await throttle(rate)
  await startRecording()
  if (args.click) await page.getByRole(args.role || 'radio', { name: new RegExp(args.click) }).first().click()
}
await page.waitForTimeout(windowMs)
const frames = await page.evaluate(() => window.__frames.slice())
await throttle(1)
await browser.close()

const sorted = [...frames].sort((a, b) => a - b)
const total = frames.reduce((n, f) => n + f, 0)
const pct = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]
console.log(
  JSON.stringify({
    case: args.label || args.case || args.url,
    width,
    cpu: `${rate}x`,
    frames: frames.length,
    avgFps: +(1000 / (total / frames.length)).toFixed(1),
    p95Ms: +pct(0.95).toFixed(1),
    worstMs: +sorted[sorted.length - 1].toFixed(1),
    over33ms: frames.filter((f) => f > 33.4).length,
    over50ms: frames.filter((f) => f > 50).length,
    // when the long frames happened, in ms after recording started
    longAt: frames.reduce((acc, f, i) => (f > 33.4 ? [...acc, Math.round(frames.slice(0, i + 1).reduce((n, x) => n + x, 0))] : acc), []),
  }),
)
