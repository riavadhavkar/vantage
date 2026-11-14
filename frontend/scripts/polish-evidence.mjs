// Before/after probe: run the same checks against main and against this branch, both on mock
// dev servers. Usage: node scripts/polish-evidence.mjs http://localhost:5180 http://localhost:5178
// Every check is tolerant: a control that does not exist in one build prints "absent".
import { chromium } from 'playwright'

const urls = process.argv.slice(2)
const browser = await chromium.launch()
const safe = async (fn, fallback = 'absent') => {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

for (const base of urls) {
  console.log(`\n===== ${base} =====`)
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(`${base}/`)
  await page.waitForTimeout(2700)

  // landing
  console.log('landing: step pills:', await page.locator('.v2-lsteps li').count(), '| footer:', await page.locator('footer').count(), '| sound button:', await page.getByRole('button', { name: /^sound/i }).count(), '| header title (h1 text):', JSON.stringify(await safe(() => page.locator('h1').first().innerText({ timeout: 1000 }))))

  // start the titanic story, by whichever control this build has
  if (await page.getByRole('button', { name: 'step 3, story' }).count()) {
    await page.getByRole('button', { name: 'step 3, story' }).click()
    await page.getByRole('radio', { name: /sinking/i }).click()
  } else {
    await page.getByRole('button', { name: /^begin/i }).first().click()
  }

  // the illustration gate: every 150 ms, is a full-screen shutter up, and is the ai image label up?
  const samples = []
  for (let i = 0; i < 24; i++) {
    const s = await page.evaluate(() => ({
      shutter: !!document.querySelector('.v2-shutter.is-overlay'),
      image: [...document.querySelectorAll('.v2-badge')].some((b) => /illustration/.test(b.textContent)),
      transcript: !!document.querySelector('button[aria-label="open full transcript"]'),
    }))
    samples.push(`${s.shutter ? 'S' : '-'}${s.image ? 'I' : '-'}`)
    await page.waitForTimeout(150)
  }
  console.log('first 3.6 s, every 150 ms (S = shutter up, I = ai image labelled):', samples.join(' '))

  await page.getByRole('button', { name: 'open full transcript' }).waitFor({ timeout: 20000 })
  await page.waitForTimeout(1500)

  // subtitles: how many lines the visible subtitle takes
  console.log('subtitle line count:', await safe(() => page.evaluate(() => {
    const el = document.querySelector('button[aria-label="open full transcript"] span')
    const lh = parseFloat(getComputedStyle(el).lineHeight)
    return `${Math.round(el.getBoundingClientRect().height / lh)} (${JSON.stringify(el.textContent.slice(0, 70))})`
  })))
  console.log('floating source tags on the stage (.v2-pin):', await page.locator('.v2-pin').count())

  // header controls
  console.log('header: language (globe) button:', await page.getByRole('button', { name: 'language', exact: true }).count(), '| settings chevron:', await page.getByRole('button', { name: 'subtitles and languages' }).count())
  const pop = page.getByRole('button', { name: 'language', exact: true }).or(page.getByRole('button', { name: 'subtitles and languages' }))
  await pop.first().click()
  await page.waitForTimeout(400)
  const popText = await safe(() => page.locator('[role="group"]').last().innerText({ timeout: 1000 }), '')
  console.log('language popover mentions: ambient =', /ambient/i.test(popText), '| photon / phone =', /photon|phone/i.test(popText), '| restart confirm on narration change =', await safe(async () => {
    await page.getByLabel('narration', { exact: true }).selectOption('es')
    await page.waitForTimeout(300)
    return (await page.getByRole('alertdialog').count()) > 0
  }))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  // the perspective pull: the "finding ..." text and its weight, size, color
  await page.getByRole('radio', { name: /cabin passengers/i }).click()
  await page.waitForTimeout(300)
  console.log('pull text:', await safe(() => page.evaluate(() => {
    const el = document.querySelector('.v2-shutter-text') || document.querySelector('.v2-stage-status .v2-waiting span:last-child')
    if (!el) return 'none'
    const cs = getComputedStyle(el)
    return `${JSON.stringify(el.textContent)} weight ${cs.fontWeight}, size ${cs.fontSize}, color ${cs.color}`
  })))
  await page.waitForTimeout(5000)

  // choice pills after the narration of this scene
  await page.waitForTimeout(8000)
  console.log('choice pills (nav "where to go next"):', await page.locator('nav[aria-label="Where to go next" i]').count())

  // graph
  await page.getByRole('button', { name: /story connections|how the story connects/i }).first().click()
  await page.waitForTimeout(1800)
  console.log('graph: react flow attribution:', await page.locator('.react-flow__attribution').count(), '| legend side:', await safe(() => page.evaluate(() => {
    const l = document.querySelector('.v2-graph-legend').getBoundingClientRect()
    return l.left + l.width / 2 > innerWidth / 2 ? 'right' : 'left'
  })), '| legend text:', JSON.stringify(await safe(() => page.locator('.v2-graph-legend li').first().innerText())))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)

  // map
  await page.getByRole('button', { name: /^map$|where this happened/i }).first().click()
  await page.waitForTimeout(2200)
  console.log('map: panel title:', JSON.stringify(await safe(() => page.locator('.v2-sheet-head h2').innerText())), '| zoom side:', await safe(() => page.evaluate(() => (document.querySelector('.leaflet-control-zoom')?.closest('.leaflet-right') ? 'right' : document.querySelector('.leaflet-control-zoom') ? 'left' : 'none'))))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)

  // sources
  await page.getByRole('button', { name: 'sources' }).first().click()
  await page.waitForTimeout(900)
  console.log('sources: panel title:', JSON.stringify(await safe(() => page.locator('.v2-sheet-head h2').innerText())), '| source cards:', await page.locator('.v2-scard').count(), '| roles:', JSON.stringify(await page.locator('.v2-scard-role').allInnerTexts()))
  const open = await safe(() => page.locator('.v2-scard.is-open').first().innerText({ timeout: 1000 }), '')
  console.log('sources: open card has "informed perspective":', /informed perspective/.test(open), '| "open original":', /open original/.test(open), '| "how this was grounded" section:', await page.getByText('how this was grounded', { exact: true }).count())

  console.log('console errors:', errors.length ? errors : 'none')
  await page.close()
}
await browser.close()
