// Verification for the new UI that is not a screenshot: keyboard-only walkthrough, touch target
// sizes, reduced motion, paused loops, and load metrics.
// Usage: node scripts/v2-verify.mjs [--url http://localhost:5174] [--prod http://localhost:5176]
import { chromium } from 'playwright'
const args = {}
process.argv.slice(2).forEach((a, i, all) => a.startsWith('--') && (args[a.slice(2)] = all[i + 1]))
const BASE = args.url || 'http://localhost:5174'
const PROD = args.prod || null
const b = await chromium.launch()
let failures = 0
const report = (name, ok, detail) => {
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`)
}
const title = (p, t) => p.waitForFunction((x) => document.querySelector('#v2-title')?.textContent === x, t, { timeout: 15000 })

// 1. Keyboard only: no mouse or touch at any point.
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  const focused = () => p.evaluate(() => { const el = document.activeElement; return (el?.getAttribute('aria-label') || el?.textContent || el?.id || el?.tagName || '').trim().replace(/\s+/g, ' ').slice(0, 60) })
  const tabTo = async (match, max = 40) => {
    for (let i = 0; i < max; i++) {
      await p.keyboard.press('Tab')
      if (match.test(await focused())) return true
    }
    return false
  }
  const steps = []
  try {
    await p.goto(`${BASE}/?demo=1`)
    await p.waitForTimeout(2600)
    if (!(await tabTo(/^Begin/))) throw new Error('could not reach Begin with Tab')
    await p.keyboard.press('Enter')
    await p.waitForSelector('#v2-title')
    await p.waitForTimeout(1500)
    steps.push('begin')
    // focus ring visible on the focused control
    if (!(await tabTo(/^(Pause|Play) narration/))) throw new Error('could not reach the narration control')
    const ring = await p.evaluate(() => { const cs = getComputedStyle(document.activeElement); return `${cs.outlineStyle} ${cs.outlineWidth}` })
    if (!/solid 2px/.test(ring)) throw new Error(`no visible focus ring (${ring})`)
    steps.push('focus ring ' + ring)
    await p.waitForSelector('.v2-choice', { timeout: 20000 }) // let the narration finish typing by itself
    if (!(await tabTo(/^Grounded in/))) throw new Error('could not reach Grounded in')
    await p.keyboard.press('Enter')
    await p.waitForSelector('[role=dialog] .v2-quote')
    const inDialog = await p.evaluate(() => !!document.activeElement?.closest('[role=dialog]'))
    for (let i = 0; i < 12; i++) await p.keyboard.press('Tab')
    const trapped = await p.evaluate(() => !!document.activeElement?.closest('[role=dialog]'))
    await p.keyboard.press('Escape')
    await p.waitForTimeout(700)
    const back = await focused()
    if (!inDialog || !trapped || !/^Grounded in/.test(back)) throw new Error(`evidence focus: in ${inDialog}, trapped ${trapped}, returned to "${back}"`)
    steps.push('evidence: focus in, trapped, returned')
    if (!(await tabTo(/What happened at 11:40 pm/))) throw new Error('could not reach a choice')
    await p.keyboard.press('Enter')
    await title(p, 'Iceberg right ahead')
    await p.waitForSelector('.v2-choice', { timeout: 25000 })
    steps.push('choice by Enter')
    if (!(await tabTo(/^Officers and crew/))) throw new Error('could not reach the lens ring')
    await p.keyboard.press('ArrowRight')
    await title(p, 'A slight jolt').catch(() => {})
    const now = await p.locator('#v2-title').textContent()
    if (now === 'Iceberg right ahead') throw new Error('arrow key on the ring did not switch perspective')
    steps.push(`ring by arrow key -> "${now}"`)
    await p.waitForTimeout(1500)
    await p.keyboard.press('Control+k')
    await p.waitForSelector('.v2-pal')
    await p.keyboard.type('graph')
    await p.keyboard.press('Enter')
    await p.waitForSelector('.react-flow__node', { timeout: 10000 })
    await p.keyboard.press('Escape')
    await p.waitForTimeout(600)
    if (await p.locator('[role=dialog]').count()) throw new Error('graph did not close on Escape')
    steps.push('palette to graph, Escape')
    report('keyboard only', errs.length === 0, steps.join(', ') + (errs.length ? ' | ' + errs.join(' | ') : ''))
  } catch (e) {
    report('keyboard only', false, `after [${steps.join(', ')}]: ${e.message.split('\n')[0]}`)
  }
  await p.close()
}

// 2. Touch targets at phone width: every control at least 44 px in the direction a finger needs.
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  const small = []
  const scan = async (where) => {
    const found = await p.evaluate(() => {
      const out = []
      for (const el of document.querySelectorAll('button, a[href], input, [role=radio], summary')) {
        const r = el.getBoundingClientRect()
        if (!r.width || !r.height || el.closest('[aria-hidden=true]') || getComputedStyle(el).visibility === 'hidden' || getComputedStyle(el).opacity === '0') continue
        // a pseudo-element may extend the hit area: read it
        const after = getComputedStyle(el, '::after')
        const grow = after.content !== 'none' && after.position === 'absolute' ? -parseFloat(after.top || 0) - parseFloat(after.bottom || 0) : 0
        const h = r.height + (grow > 0 ? grow : 0)
        if (h < 43.5 || r.width < 43.5) out.push(`${(el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 28)} ${Math.round(r.width)}x${Math.round(h)}`)
      }
      return out
    })
    found.forEach((f) => small.push(`${where}: ${f}`))
  }
  await p.goto(`${BASE}/?demo=1&motion=off`)
  await p.waitForTimeout(1200)
  await scan('landing')
  await p.getByRole('button', { name: 'Begin' }).click()
  await p.waitForSelector('#v2-title')
  await p.waitForTimeout(1500)
  await scan('player')
  await p.getByRole('button', { name: /Grounded in/ }).click()
  await p.waitForSelector('[role=dialog] .v2-quote')
  await p.waitForTimeout(500)
  await scan('evidence')
  report('touch targets at 390', small.length === 0, small.length ? small.join('; ') : 'all controls are at least 44 px')
  await ctx.close()
}

// 3. Reduced motion (OS setting): the story works, nothing is missing, the text is instant.
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  try {
    await p.goto(`${BASE}/?demo=1`)
    await p.waitForTimeout(800)
    const landing = await p.evaluate(() => ({ soft: !!document.querySelector('.v2-wordmark-soft') && getComputedStyle(document.querySelector('.v2-wordmark-soft')).display, frameAnim: getComputedStyle(document.querySelector('.v2-lframe')).animationName }))
    await p.getByRole('button', { name: 'Begin' }).click()
    await p.waitForSelector('#v2-title')
    await p.waitForTimeout(600)
    const hidden = await p.locator('.v2-word:not(.is-in)').count()
    const running = await p.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity).map((a) => a.animationName || 'transition'))
    await p.getByRole('radio', { name: /Cabin passengers/ }).click()
    await title(p, 'A slight jolt')
    await p.waitForTimeout(600)
    const softAfter = await p.evaluate(() => getComputedStyle(document.querySelector('.v2-softimg')).opacity)
    const choices = await p.getByRole('button', { name: /Hear it from third class/ }).count()
    report('reduced motion', errs.length === 0 && hidden === 0 && choices === 1 && Number(softAfter) === 0, `landing frame animation "${landing.frameAnim}", blurred wordmark "${landing.soft}", words still hidden ${hidden}, endless animations running [${[...new Set(running)].join(', ') || 'none'}], frame sharp after switch (soft ${softAfter}), choices shown ${choices}`)
  } catch (e) {
    report('reduced motion', false, e.message.split('\n')[0])
  }
  await ctx.close()
}

// 4. Loops stop when the tab is hidden or a sheet is open.
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.goto(`${BASE}/?demo=1`)
  await p.waitForTimeout(2600)
  await p.getByRole('button', { name: 'Begin' }).click()
  await p.waitForSelector('#v2-title')
  await p.waitForTimeout(2500)
  const pan = () => p.evaluate(() => getComputedStyle(document.querySelector('.v2-pan')).animationPlayState)
  const visible = await pan()
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')) })
  await p.waitForTimeout(300)
  const hidden = await pan()
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')) })
  await p.getByRole('button', { name: 'Sources', exact: true }).click()
  await p.waitForTimeout(600)
  const sheet = await pan()
  report('loops pause', visible === 'running' && hidden === 'paused' && sheet === 'paused', `pan while watching "${visible}", tab hidden "${hidden}", evidence open "${sheet}"`)
  await p.close()
}

// 5. Load: largest paint and layout shift on the production build.
if (PROD) {
  for (const [name, url, act] of [['landing', `${PROD}/?demo=1`, null], ['player', `${PROD}/?demo=1`, 'begin']]) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
    await p.addInitScript(() => {
      window.__lcp = 0
      window.__cls = 0
      new PerformanceObserver((l) => l.getEntries().forEach((e) => (window.__lcp = e.startTime))).observe({ type: 'largest-contentful-paint', buffered: true })
      new PerformanceObserver((l) => l.getEntries().forEach((e) => !e.hadRecentInput && (window.__cls += e.value))).observe({ type: 'layout-shift', buffered: true })
    })
    await p.goto(url)
    await p.waitForTimeout(3500)
    const lcp = await p.evaluate(() => Math.round(window.__lcp))
    if (act) {
      await p.evaluate(() => (window.__cls = 0))
      await p.getByRole('button', { name: 'Begin' }).click()
      await p.waitForSelector('#v2-title')
      await p.waitForTimeout(9000) // narration types, pins and choices arrive, nothing may push anything
    }
    const cls = await p.evaluate(() => +window.__cls.toFixed(4))
    report(`load, ${name}`, (act || lcp < 2000) && cls < 0.1, `${act ? '' : `largest paint ${lcp} ms, `}layout shift ${cls}`)
    await p.close()
  }
}

await b.close()
if (failures) process.exitCode = 1
