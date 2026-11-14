// OWNER: Person B
// Captures the key views at 390, 768 and 1440 px for design review and the Devpost.
// Usage: npm run dev (in another shell), then: npm run screenshots [-- --url http://localhost:5173 --prefix devpost-]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((a) => a.trim().split(/\s+/)))
const BASE = args.url || 'http://localhost:5173'
const QUERY = args.query || '?demo=1'
const PREFIX = args.prefix || ''
const out = resolve(dirname(fileURLToPath(import.meta.url)), '../screenshots')
mkdirSync(out, { recursive: true })

const WIDTHS = [
  { name: '390', width: 390, height: 844, isMobile: true },
  { name: '768', width: 768, height: 1024, isMobile: true },
  { name: '1440', width: 1440, height: 900, isMobile: false },
]
const shot = (page, name) => page.screenshot({ path: `${out}/${PREFIX}${name}.png` })
const settle = (page, ms = 600) => page.waitForTimeout(ms)

const browser = await chromium.launch()
for (const vp of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: vp.isMobile,
    hasTouch: vp.isMobile,
    reducedMotion: 'no-preference',
  })
  const page = await ctx.newPage()
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && console.log(`[${vp.name}] console ${m.type()}: ${m.text()}`))
  page.on('pageerror', (e) => console.log(`[${vp.name}] pageerror: ${e.message}`))

  await page.goto(BASE + QUERY)
  await settle(page, 4200)
  await shot(page, `landing-${vp.name}`)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  if (overflow > 0) console.log(`[${vp.name}] horizontal overflow: ${overflow}px`)

  // first scene
  await page.fill('#topic-input', 'Titanic')
  await page.click('button[type=submit]')
  await page.waitForSelector('.stage h2')
  await settle(page, 1500)
  await page.getByRole('button', { name: 'Show all text' }).click().catch(() => {})
  await settle(page, 900)
  await shot(page, `player-${vp.name}`)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await settle(page)
  await shot(page, `player-choices-${vp.name}`)

  // grounding
  await page.getByRole('button', { name: /Grounded in/ }).click()
  await settle(page, 300)
  await shot(page, `grounding-${vp.name}`)

  // perspective pull to passengers via the first choice
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('button', { name: 'Hear it from the cabin passengers' }).click()
  await page.waitForTimeout(220)
  await shot(page, `pull-mid-${vp.name}`)
  await page.waitForFunction(() => document.querySelector('.stage h2')?.textContent === 'A slight jolt')
  await settle(page, 1200)
  await page.getByRole('button', { name: 'Show all text' }).click().catch(() => {})
  await settle(page, 600)
  await shot(page, `player-passengers-${vp.name}`)

  // to the contradiction
  await page.getByRole('button', { name: 'Hear it from third class' }).click()
  await page.waitForFunction(() => document.querySelector('.stage h2')?.textContent === 'Room for half')
  await settle(page, 900)
  await page.getByRole('button', { name: 'Show all text' }).click().catch(() => {})
  await settle(page, 600)
  await page.getByRole('button', { name: 'Did she break in two?' }).click()
  await page.waitForFunction(() => document.querySelector('.stage h2')?.textContent === 'Did she break in two?')
  await settle(page, 900)
  await page.getByRole('button', { name: 'Show all text' }).click().catch(() => {})
  await settle(page, 600)
  await page.locator('section[aria-label="Sources disagree"]').scrollIntoViewIfNeeded()
  await settle(page, 300)
  await shot(page, `contradiction-${vp.name}`)

  // source panel from a pin
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.locator('ul[aria-label="Evidence in this scene"] button').first().click()
  await settle(page, 800)
  await shot(page, `sources-${vp.name}`)
  await page.getByRole('button', { name: 'Close' }).click()
  await settle(page, 600)

  // graph
  await page.getByRole('button', { name: /Graph/ }).click()
  await settle(page, 1500)
  await shot(page, `graph-${vp.name}`)
  await page.getByRole('button', { name: 'Close' }).click()
  await settle(page, 500)

  // map
  await page.getByRole('button', { name: /^Map$/ }).click()
  await settle(page, 1200)
  await shot(page, `map-${vp.name}`)

  await ctx.close()
}
await browser.close()
console.log(`saved to ${out}`)
