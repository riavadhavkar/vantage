// The new UI's non-happy paths: ungrounded, error, offline, unknown topic, image and voice
// failures (mock mode), graph and map sheets. Saves a screenshot of each.
// Usage: node scripts/v2-states.mjs [--url http://localhost:5174] [--mock http://localhost:5175] [--width 1440]
import { chromium } from 'playwright'
const args = {}
process.argv.slice(2).forEach((a, i, all) => a.startsWith('--') && (args[a.slice(2)] = all[i + 1]))
const BASE = args.url || 'http://localhost:5174'
const MOCK = args.mock || 'http://localhost:5175'
const width = Number(args.width || 1440)
const out = new URL('../design/screens/', import.meta.url).pathname
const b = await chromium.launch()
let failures = 0

async function scenario(name, base, query, fn, { allowNetwork = false, prepare } = {}) {
  const ctx = await b.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, isMobile: width < 600, hasTouch: width < 600, deviceScaleFactor: width < 600 ? 2 : 1 })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  p.on('console', (m) => m.type() === 'error' && !(allowNetwork && /ERR_CONNECTION_REFUSED|Failed to load resource/.test(m.text())) && errs.push(m.text().slice(0, 160)))
  if (prepare) await prepare(p)
  const say = []
  try {
    await p.goto(`${base}/${query}`)
    await fn(p, say)
    await p.screenshot({ path: `${out}v2-state-${name}-${width}.png` })
  } catch (e) {
    errs.push('FLOW: ' + e.message.split('\n')[0])
  }
  if (errs.length) failures++
  console.log(`${name}: ${errs.length ? 'FAILED ' + errs.join(' | ') : 'ok'}${say.length ? ' | ' + say.join(', ') : ''}`)
  await ctx.close()
}
const begin = async (p) => {
  await p.waitForTimeout(1200)
  await p.getByRole('button', { name: 'Begin' }).click()
  await p.waitForSelector('#v2-title')
  await p.waitForTimeout(800)
  if (await p.locator('.v2-word:not(.is-in)').count()) await p.locator('.v2-captions').click().catch(() => {})
  await p.waitForTimeout(900)
}
const title = (p, t) => p.waitForFunction((x) => document.querySelector('#v2-title')?.textContent === x, t, { timeout: 15000 })

await scenario('ungrounded', BASE, '?demo=1&ui=v2&motion=off', async (p, say) => {
  await begin(p)
  await p.getByLabel('Ask a question about this moment').fill('zzzq xyzzy plugh')
  await p.getByRole('button', { name: 'Ask', exact: true }).click()
  await title(p, 'Not in the sources')
  await p.waitForTimeout(800)
  const text = await p.locator('.v2-card').innerText()
  if (!text.includes('We could not ground this part in the sources, so we are not narrating it.')) throw new Error('ungrounded note missing')
  if (await p.locator('.v2-captions').count()) throw new Error('an ungrounded segment was narrated')
  if (await p.getByText('AI narration').count()) throw new Error('a voice control is shown for an ungrounded segment')
  say.push('note shown, no captions, no voice control', `recover button: ${await p.getByRole('button', { name: 'Try another point of view' }).count()}`)
})

await scenario('error', BASE, '?demo=1&ui=v2&motion=off', async (p, say) => {
  await begin(p)
  await p.getByRole('button', { name: /What happened at 11:40 pm/ }).click()
  await p.getByRole('alert').waitFor({ timeout: 8000 })
  say.push('alert: "' + (await p.getByRole('alert').innerText()).replace(/\n/g, ' / ') + '"')
  if (!(await p.getByRole('button', { name: 'Try again' }).count())) throw new Error('no retry')
  if ((await p.locator('#v2-title').textContent()) !== 'Warnings on the wire') throw new Error('the scene changed after an error')
}, {
  // make one route fail inside the in-browser mock server, without touching the source file
  prepare: (p) => p.route('**/src/api/mockServer.js*', async (route) => {
    const res = await route.fetch()
    const body = (await res.text()).replace('const targetId = session.bundle.routes[choiceId]', "if (choiceId === 'ti-1-b') throw new ApiError('llm_timeout', 'simulated'); const targetId = session.bundle.routes[choiceId]")
    await route.fulfill({ response: res, body })
  }),
})

await scenario('error-switch', BASE, '?demo=1&ui=v2', async (p, say) => {
  await begin(p)
  await p.getByRole('radio', { name: /Cabin passengers/ }).click()
  await p.getByRole('alert').waitFor({ timeout: 8000 })
  await p.waitForTimeout(1200)
  const soft = await p.evaluate(() => getComputedStyle(document.querySelector('.v2-softimg')).opacity)
  say.push(`after a failed switch the frame is sharp again (soft layer opacity ${soft})`, `ring back on: ${await p.getByRole('radio', { checked: true }).innerText().then((t) => t.split('\n')[0])}`)
  if (Number(soft) > 0.05) throw new Error('frame stayed soft after a failed switch')
}, {
  prepare: (p) => p.route('**/src/api/mockServer.js*', async (route) => {
    const res = await route.fetch()
    const body = (await res.text()).replace('const targetId = session.bundle.routes[choiceId]', "if (choiceId === 'ti-1-a') throw new ApiError('llm_timeout', 'simulated'); const targetId = session.bundle.routes[choiceId]")
    await route.fulfill({ response: res, body })
  }),
})

await scenario('offline', BASE, '?ui=v2&motion=off', async (p, say) => {
  await p.waitForTimeout(4200)
  say.push('badge: "' + (await p.locator('.v2-databadge').first().innerText()) + '"')
  await begin(p)
}, { allowNetwork: true })

await scenario('unknown-topic', BASE, '?demo=1&ui=v2&motion=off', async (p, say) => {
  await p.waitForTimeout(1200)
  await p.getByLabel('Choose a story').fill('The moon landing')
  await p.getByRole('button', { name: 'Begin' }).click()
  await p.getByRole('alert').waitFor({ timeout: 8000 })
  say.push('alert: "' + (await p.getByRole('alert').innerText()).replace(/\n/g, ' / ') + '"')
})

await scenario('image-failed', MOCK, '?ui=v2&motion=off', async (p, say) => {
  await begin(p)
  await p.getByRole('button', { name: /Hear it from the cabin passengers/ }).click()
  await title(p, 'A slight jolt')
  await p.waitForTimeout(3500)
  say.push(`AI image badge shown: ${await p.locator('.v2-stage-badge').filter({ hasText: 'AI-generated illustration' }).count()} (expected 0, the drawn scene stays)`)
  if (await p.locator('.v2-stage-badge').filter({ hasText: 'AI-generated illustration' }).count()) throw new Error('badge on a drawn scene')
})

await scenario('image-ready', MOCK, '?ui=v2&motion=off', async (p, say) => {
  await begin(p)
  await p.waitForTimeout(2500)
  say.push(`AI image badge shown: ${await p.locator('.v2-stage-badge').filter({ hasText: 'AI-generated illustration' }).count()} (expected 1)`, `voice: ${await p.getByText('AI narration').count() ? 'AI narration badge shown' : 'no badge'}`)
  if (!(await p.locator('.v2-stage-badge').filter({ hasText: 'AI-generated illustration' }).count())) throw new Error('no badge on a generated image')
})

await scenario('graph', BASE, '?demo=1&ui=v2', async (p) => {
  await begin(p)
  await p.getByRole('button', { name: /Hear it from the cabin passengers/ }).click()
  await title(p, 'A slight jolt')
  await p.waitForTimeout(1500)
  await p.getByRole('button', { name: 'How the story connects' }).click()
  await p.waitForSelector('.react-flow__node', { timeout: 10000 })
  await p.waitForTimeout(1500)
})

await scenario('map', BASE, '?demo=1&ui=v2', async (p) => {
  await begin(p)
  await p.getByRole('button', { name: 'Where this happened' }).click()
  await p.waitForSelector('[role=dialog] svg[role=img]', { timeout: 10000 })
  await p.waitForTimeout(1200)
})

await b.close()
if (failures) process.exitCode = 1
