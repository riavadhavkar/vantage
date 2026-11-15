// Landing: one screen. A giant lowercase "vantage" sharpens into view over three panels (one per
// point of view, the dividers cutting across the letters), shrinks, and then a three-step bar
// arrives: narration language, subtitles language, story. Choosing a story starts the session.
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { SAMPLE_BUNDLES } from '../mocks/index.js'
import { sceneKindFor } from '../lib/scene.js'
import { unlockAudio } from '../lib/audio.js'
import { messageFor } from '../api/errors.js'
import { DURATION, EASING } from '../constants/theme.js'
import { ms, sec, useCalmMotion } from '../lib/motionMode.js'
import { lookFor } from './looks.js'
import { gradedSceneUrl } from './gradedScene.js'
import { DataBadge } from './ui.jsx'
import Logo from './Logo.jsx'
import Shutter from './Shutter.jsx'
import './landing.css'

/** Load sequence (ms): sharpen 0 to 1300, shrink 1300 to 2000, the step bar from 2000. */
const T = { sharp: 1300, shrink: 700, bar: 2000 }
const NUMBERS = ['1', '2', '3']
const STEP_NAMES = ['narration language', 'subtitles language', 'story']

/** Stories with sources. Each line is read from the bundled topic data (the backend serves the same two). */
const STORIES = SAMPLE_BUNDLES.map((b) => ({ id: b.topic.topic_id, title: b.topic.title, line: b.topic.one_line }))

function heroFrom(bundle) {
  const t = bundle.topic
  const first = bundle.segments.find((s) => s.segment_id === bundle.start_segment_id) || bundle.segments[0]
  const kind = sceneKindFor(`${first?.scene_prompt} ${t.one_line}`)
  return t.perspectives.slice(0, 3).map((p) => ({ id: p.perspective_id, url: gradedSceneUrl({ seed: `hero-${t.topic_id}`, kind, width: 1800, height: 1100 }, lookFor(p.color, p.label)) }))
}

/** A group of large options with a roving focus: arrows move, Enter or a click accepts, Escape collapses. */
function Options({ label, options, value, onPick, onEscape, autoFocus, columns }) {
  const refs = useRef([])
  const current = Math.max(0, options.findIndex((o) => o.value === value))
  const [focus, setFocus] = useState(current)
  useEffect(() => {
    if (autoFocus) refs.current[current]?.focus({ preventScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus])
  const move = (i) => {
    const n = (i + options.length) % options.length
    setFocus(n)
    refs.current[n]?.focus()
  }
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`v2-opts is-${columns}`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') (e.preventDefault(), move(focus + 1))
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') (e.preventDefault(), move(focus - 1))
        else if (e.key === 'Home') (e.preventDefault(), move(0))
        else if (e.key === 'End') (e.preventDefault(), move(options.length - 1))
        else if (e.key === 'Escape') (e.preventDefault(), onEscape())
      }}
    >
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => (refs.current[i] = el)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={i === focus ? 0 : -1}
          lang={o.lang}
          className="v2-opt"
          onFocus={() => setFocus(i)}
          onClick={() => onPick(o.value)}
          disabled={o.disabled}
        >
          <span className="v2-opt-title">{o.title}</span>
          {o.line && <span className="v2-opt-line">{o.line}</span>}
        </button>
      ))}
    </div>
  )
}

/**
 * @param {{ onStart: (title: string, narrationLanguage: string) => void, isStarting: boolean, error: object|null,
 *   dataSource: string, language: object }} props
 */
export default function Landing({ onStart, isStarting, error, dataSource, language }) {
  const isCalm = useCalmMotion()
  const panels = useMemo(() => heroFrom(SAMPLE_BUNDLES[0]), [])
  const { languages, narrationLanguage, subtitleLanguage, setNarrationLanguage, setSubtitleLanguage, nameOf, isOffline } = language
  // Offline, the cached story exists in English only.
  const langs = useMemo(() => (isOffline ? languages.filter((l) => l.code === 'en') : languages), [isOffline, languages])

  // ---------- load sequence ----------
  const [phase, setPhase] = useState(isCalm ? 'ready' : 'sharpen') // sharpen | shrink | ready
  useEffect(() => {
    if (isCalm) return setPhase('ready')
    const a = setTimeout(() => setPhase('shrink'), ms(T.sharp))
    const b = setTimeout(() => setPhase('ready'), ms(T.bar))
    return () => (clearTimeout(a), clearTimeout(b))
  }, [isCalm])

  // Where the wordmark ends up (a transform only, so nothing reflows), and where the bar starts.
  const markRef = useRef(null)
  const [fit, setFit] = useState({ scale: 0.4, y: -200, barTop: 300 })
  useLayoutEffect(() => {
    const measure = () => {
      const el = markRef.current
      if (!el) return
      const fontPx = parseFloat(getComputedStyle(el).fontSize) || 200
      const h = el.offsetHeight
      const vh = window.innerHeight
      const scale = Math.min(1, Math.max(48, fontPx * 0.34) / fontPx)
      const centre = vh * (vh < 700 ? 0.15 : 0.22)
      setFit({ scale, y: centre - vh / 2, barTop: Math.round(centre + (h * scale) / 2 + 20) })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])
  const isShrunk = phase !== 'sharpen'

  // ---------- the three steps ----------
  const [active, setActive] = useState(isOffline ? 2 : 0) // 0 | 1 | 2 | -1 (all collapsed)
  const [done, setDone] = useState(isOffline ? [true, true, false] : [false, false, false])
  const [hasMoved, setHasMoved] = useState(false) // focus moves into a step only after the viewer acts
  // Demo and offline: English and "same as narration" are the only choices, so steps 1 and 2 close.
  useEffect(() => {
    if (!isOffline) return
    setNarrationLanguage('en')
    setSubtitleLanguage('same')
    setDone([true, true, false])
    setActive(2)
  }, [isOffline, setNarrationLanguage, setSubtitleLanguage])

  const begin = useCallback(
    (title) => {
      if (isStarting || !title) return
      unlockAudio()
      onStart(title, isOffline ? 'en' : narrationLanguage)
    },
    [isStarting, onStart, isOffline, narrationLanguage],
  )
  const open = (i) => {
    setHasMoved(true)
    if (i === active) return setActive(-1)
    // opening a later step first: the earlier ones keep their defaults
    setDone((d) => d.map((x, k) => (k < i ? true : x)))
    setActive(i)
  }
  const pick = (i, value) => {
    setHasMoved(true)
    if (i === 0) setNarrationLanguage(value)
    if (i === 1) setSubtitleLanguage(value)
    setDone((d) => d.map((x, k) => (k === i ? true : x)))
    if (i === 2) return begin(STORIES.find((s) => s.id === value)?.title)
    setActive(i + 1)
  }

  const subtitleName = subtitleLanguage === 'off' ? 'off' : subtitleLanguage === 'same' ? 'same as narration' : nameOf(subtitleLanguage)
  const narrationName = nameOf(isOffline ? 'en' : narrationLanguage)
  // long text for the full pill, short text for the compact chip on phones
  const pills = [
    [`narration: ${narrationName}`, narrationName],
    [`subtitles: ${subtitleName}`, subtitleLanguage === 'same' ? 'same' : subtitleName],
    ['story', 'story'],
  ]
  const groups = [
    { columns: 'lang', value: narrationLanguage, options: langs.map((l) => ({ value: l.code, title: l.name.toLowerCase(), lang: l.code })) },
    {
      columns: 'lang',
      value: subtitleLanguage,
      options: [
        { value: 'off', title: 'off' },
        { value: 'same', title: 'same as narration' },
        ...langs.map((l) => ({ value: l.code, title: l.name.toLowerCase(), lang: l.code })),
      ],
    },
    { columns: 'story', value: null, options: STORIES.map((s) => ({ value: s.id, title: s.title, line: s.line, disabled: isStarting })) },
  ]
  const panelId = useId()
  const anyId = useId()
  const [anyEvent, setAnyEvent] = useState('')
  const suggestions = error?.code === 'topic_not_supported' ? error.suggestions : []
  const fade = { duration: sec(isCalm ? DURATION.quick : DURATION.panel), ease: EASING.enter }

  return (
    <main className={`v2-landing is-${phase}`} style={{ '--bar-top': `${fit.barTop}px` }}>
      {/* three panels, one per point of view; the dividers sit above the wordmark */}
      <div className="v2-lhero" aria-hidden="true">
        {panels.map((p, i) => (
          <div key={p.id} className="v2-lpanel" style={{ '--i': i, '--n': panels.length }}>
            <img src={p.url} alt="" />
          </div>
        ))}
        <i className="v2-lshade" />
      </div>

      <motion.h1
        className="v2-lmark-wrap"
        initial={false}
        animate={{ scale: isShrunk ? fit.scale : 1, y: isShrunk ? fit.y : 0 }}
        transition={{ duration: sec(isCalm ? 0 : T.shrink), ease: EASING.move }}
      >
        <span ref={markRef} className="v2-lmark" aria-label="vantage" role="img">
          {!isCalm && (
            <motion.span className="v2-lmark-soft" aria-hidden="true" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: sec(T.sharp), ease: EASING.enter }}>
              <Logo className="v2-lmark-logo" />
              vantage
            </motion.span>
          )}
          <motion.span
            className="v2-lmark-sharp"
            aria-hidden="true"
            initial={isCalm ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: sec(isCalm ? DURATION.quick : T.sharp), ease: EASING.enter }}
          >
            <Logo className="v2-lmark-logo" />
            vantage
          </motion.span>
        </span>
      </motion.h1>
      <div className="v2-ldividers" aria-hidden="true">
        <i style={{ left: '33.333%' }} />
        <i style={{ left: '66.666%' }} />
      </div>

      {phase === 'ready' && (
        <section className="v2-lbar" aria-label="start a story">
          <p className="v2-sr" aria-live="polite">
            {active >= 0 ? `step ${active + 1} of 3: ${STEP_NAMES[active]}` : ''}
          </p>
          <ol className="v2-lsteps">
            {pills.map(([long, short], i) => (
              <motion.li key={i} initial={{ opacity: 0, y: isCalm ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...fade, delay: isCalm ? 0 : sec(i * 90) }}>
                <button
                  type="button"
                  className={`v2-lpill ${active === i ? 'is-active' : ''} ${done[i] ? 'is-done' : ''}`}
                  aria-label={`step ${i + 1}, ${long}`}
                  aria-current={active === i ? 'step' : undefined}
                  aria-expanded={active === i}
                  aria-controls={active === i ? panelId : undefined}
                  onClick={() => open(i)}
                >
                  <span className="v2-lpill-n" aria-hidden="true">{NUMBERS[i]}</span>
                  <span className="v2-lpill-text">
                    <span className="is-long">{long}</span>
                    <span className="is-short" aria-hidden="true">{short}</span>
                  </span>
                </button>
              </motion.li>
            ))}
          </ol>

          <AnimatePresence mode="wait" initial={false}>
            {active >= 0 && (
              <motion.div
                key={active}
                id={panelId}
                className="v2-lpanel-open"
                initial={{ opacity: 0, y: isCalm ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ ...fade, delay: isCalm || hasMoved ? 0 : sec(3 * 90) }}
              >
                <h2 className="v2-lpanel-title">{STEP_NAMES[active]}</h2>
                <Options
                  label={STEP_NAMES[active]}
                  options={groups[active].options}
                  value={groups[active].value}
                  columns={groups[active].columns}
                  autoFocus={hasMoved}
                  onPick={(v) => pick(active, v)}
                  onEscape={() => setActive(-1)}
                />
                {active === 2 && isOffline && <p className="v2-lnote">offline demo: the cached story is in english.</p>}
                {active === 2 && !isOffline && (
                  <form className="v2-lany" onSubmit={(e) => { e.preventDefault(); begin(anyEvent.trim()) }}>
                    <label htmlFor={anyId} className="v2-lpanel-title">or type any event, past or present</label>
                    <div className="v2-lany-row">
                      <input
                        id={anyId}
                        className="v2-lany-input"
                        value={anyEvent}
                        onChange={(e) => setAnyEvent(e.target.value)}
                        placeholder="the eruption of Pompeii"
                        autoComplete="off"
                        disabled={isStarting}
                      />
                      <button type="submit" className="v2-lany-go" disabled={!anyEvent.trim() || isStarting}>
                        {isStarting && anyEvent.trim() ? 'finding sources…' : 'research it'}
                      </button>
                    </div>
                    {isStarting && anyEvent.trim() && (
                      <p className="v2-lnote" aria-live="polite">reading real sources and finding every side of the story. this takes about 30 seconds.</p>
                    )}
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {error && !isStarting && (
            <div role="alert" className="v2-note v2-lerror">
              <p>{messageFor(error)}</p>
              {suggestions.map((s) => (
                <button key={s} type="button" className="v2-link" onClick={() => begin(s)}>{s}</button>
              ))}
            </div>
          )}
        </section>
      )}

      <DataBadge source={dataSource} className="v2-lsource" />

      <AnimatePresence>{isStarting && <Shutter key="shutter" message="opening the archive..." />}</AnimatePresence>
    </main>
  )
}
