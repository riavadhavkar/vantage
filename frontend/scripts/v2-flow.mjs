// Click-through of the new UI's demo path, with frame captures of the perspective switch.
// Usage: node scripts/v2-flow.mjs [--url http://localhost:5174] [--query "&motion=slow"] [--frames 1] [--runs 1] [--widths 1440,390]
import { chromium } from 'playwright'
const args = {}
process.argv.slice(2).forEach((a, i, all) => a.startsWith('--') && (args[a.slice(2)] = all[i + 1]))
const BASE = args.url || 'http://localhost:5174'
const EXTRA = args.query || ''
const RUNS = Number(args.runs || 1)
const SLOW = /motion=slow/.test(EXTRA) ? 3 : 1
const out = new URL('../design/screens/', import.meta.url).pathname
const widths = (args.widths || '1440,390').split(',').map(Number)
const b = await chromium.launch()
let failures = 0
for (const width of widths) {
  for (let run = 1; run <= RUNS; run++) {
    const ctx = await b.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, isMobile: width < 600, hasTouch: width < 600, reducedMotion: args.reduced ? 'reduce' : 'no-preference' })
    const p = await ctx.newPage()
    const errs = []
    p.on('pageerror', (e) => errs.push(e.message))
    p.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errs.push(m.text().slice(0, 200)))
    p.on('request', (r) => !r.url().startsWith(BASE) && !/^(data|blob):/.test(r.url()) && errs.push('network: ' + r.url()))
    const title = (t) => p.waitForFunction((x) => document.querySelector('#v2-title')?.textContent === x, t, { timeout: 20000 })
    const skip = async () => {
      if (await p.locator('.v2-word:not(.is-in)').count()) await p.locator('.v2-captions').click({ timeout: 3000 }).catch(() => {})
      await p.waitForTimeout(700 * SLOW)
    }
    const steps = []
    try {
      await p.goto(`${BASE}/?demo=1&ui=v2${EXTRA}`)
      await p.waitForTimeout(2600 * SLOW)
      await p.getByRole('button', { name: 'Begin' }).click()
      await p.waitForSelector('#v2-title')
      await p.waitForTimeout(1300 * SLOW)
      await skip()
      steps.push('scene 1')
      // evidence: a pin opens the paper, Escape closes it and focus goes back to the pin
      await p.waitForSelector('.v2-pin', { timeout: 6000 })
      await p.waitForTimeout(600 * SLOW)
      await p.locator('.v2-pin').first().click()
      await p.waitForSelector('[role=dialog] .v2-quote')
      await p.waitForTimeout(1200 * SLOW)
      if (await p.locator('.v2-ghost').count()) throw new Error('the travelling chip never landed')
      if ((await p.locator('[data-ghost-target]').first().evaluate((el) => getComputedStyle(el).opacity)) !== '1') throw new Error('target chip stayed hidden')
      await p.keyboard.press('Escape')
      await p.waitForTimeout(600 * SLOW)
      if (await p.locator('[role=dialog]').count()) throw new Error('evidence did not close on Escape')
      if (!(await p.evaluate(() => document.activeElement?.classList.contains('v2-pin')))) throw new Error('focus did not return to the pin')
      steps.push('evidence')
      // perspective switch through the ring, with a frame sequence
      await p.getByRole('radio', { name: /Cabin passengers/ }).click()
      // Frames are named by the time they were actually taken, in nominal milliseconds since the click
      // (real time divided by the slow-motion factor), because a screenshot itself takes time.
      if (args.frames && run === 1) {
        const t0 = Date.now()
        for (let i = 0; i < 14; i++) {
          const at = Math.round((Date.now() - t0) / SLOW)
          await p.screenshot({ path: `${out}signature-${width}-${String(at).padStart(4, '0')}ms.png` })
        }
      }
      await title('A slight jolt')
      await p.waitForTimeout(1300 * SLOW)
      await skip()
      steps.push('switch by ring')
      await p.getByRole('button', { name: /Hear it from third class/ }).click()
      await title('Room for half')
      await p.waitForTimeout(1300 * SLOW)
      await skip()
      steps.push('switch by choice')
      await p.getByRole('button', { name: /Did she break in two/ }).click()
      await title('Did she break in two?')
      await p.waitForTimeout(1300 * SLOW)
      await skip()
      steps.push('contradiction scene')
      await p.getByRole('button', { name: /What the wreck showed/ }).click()
      await title('Found in two halves')
      await p.waitForTimeout(1300 * SLOW)
      await skip()
      await p.getByText('This thread ends here').waitFor({ timeout: 8000 })
      steps.push('end of thread')
    } catch (e) {
      errs.push('FLOW after [' + steps.join(', ') + ']: ' + e.message.split('\n')[0])
    }
    if (errs.length) failures++
    console.log(`${width} run ${run}: ${errs.length ? errs.join(' | ') : 'ok (' + steps.join(', ') + ')'}`)
    await ctx.close()
  }
}
await b.close()
if (failures) process.exitCode = 1
