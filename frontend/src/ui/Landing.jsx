// Landing: one screen. A giant lowercase "vantage" sharpens into view over three panels (one per
// point of view, the dividers cutting across the letters), shrinks, and then a three-step bar
// arrives: narration language, subtitles language, story. Choosing a story starts the session.
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { sceneKindFor } from './scene.js'
import { unlockAudio } from './audio.js'
import { messageFor } from '../api/errors.js'
import { DURATION, EASING } from './theme.js'
import { ms, sec, useCalmMotion } from './motionMode.js'
import { lookFor } from './looks.js'
import { gradedSceneUrl } from './gradedScene.js'
import Logo from './Logo.jsx'
import Shutter from './Shutter.jsx'
import './landing.css'

/** Load sequence (ms): sharpen 0 to 1300, shrink 1300 to 2000, the step bar from 2000. */
const T = { sharp: 1300, shrink: 700, bar: 2000 }
const NUMBERS = ['1', '2', '3']
const STEP_NAMES = ['narration language', 'subtitles language', 'story']

/** Story choices: the topics named in the frontend config. */
const STORIES = (import.meta.env.VITE_VANTAGE_EXAMPLE_TOPICS || 'Titanic,Battle of Princeton')
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean)
  .map((title) => ({ id: title, title }))

/** Three drawn panels in the hero, one per point of view. */
const HERO_COLORS = ['#6F9BC4', '#C49A6C', '#9DB29A']
function heroPanels() {
  const kind = sceneKindFor('')
  return HERO_COLORS.map((color, i) => ({ id: `hero-${i}`, url: gradedSceneUrl({ seed: `hero-${i}`, kind, width: 1800, height: 1100 }, lookFor(color)) }))
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
      className={`ui-opts is-${columns}`}
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
          className="ui-opt"
          onFocus={() => setFocus(i)}
          onClick={() => onPick(o.value)}
          disabled={o.disabled}
        >
          <span className="ui-opt-title">{o.title}</span>
          {o.line && <span className="ui-opt-line">{o.line}</span>}
        </button>
      ))}
    </div>
  )
}

/**
 * @param {{ onStart: (title: string, narrationLanguage: string) => void, isStarting: boolean, error: object|null,
 *   language: object }} props
 */
export default function Landing({ onStart, isStarting, error, language }) {
  const isCalm = useCalmMotion()
  const panels = useMemo(() => heroPanels(), [])
  const { languages, narrationLanguage, subtitleLanguage, setNarrationLanguage, setSubtitleLanguage, nameOf } = language

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
  const [active, setActive] = useState(0) // 0 | 1 | 2 | -1 (all collapsed)
  const [done, setDone] = useState([false, false, false])
  const [hasMoved, setHasMoved] = useState(false) // focus moves into a step only after the viewer acts

  const begin = useCallback(
    (title) => {
      if (isStarting || !title) return
      unlockAudio()
      onStart(title, narrationLanguage)
    },
    [isStarting, onStart, narrationLanguage],
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
  const narrationName = nameOf(narrationLanguage)
  // long text for the full pill, short text for the compact chip on phones
  const pills = [
    [`narration: ${narrationName}`, narrationName],
    [`subtitles: ${subtitleName}`, subtitleLanguage === 'same' ? 'same' : subtitleName],
    ['story', 'story'],
  ]
  const groups = [
    { columns: 'lang', value: narrationLanguage, options: languages.map((l) => ({ value: l.code, title: l.name.toLowerCase(), lang: l.code })) },
    {
      columns: 'lang',
      value: subtitleLanguage,
      options: [
        { value: 'off', title: 'off' },
        { value: 'same', title: 'same as narration' },
        ...languages.map((l) => ({ value: l.code, title: l.name.toLowerCase(), lang: l.code })),
      ],
    },
    { columns: 'story', value: null, options: STORIES.map((s) => ({ value: s.id, title: s.title, line: s.line, disabled: isStarting })) },
  ]
  const panelId = useId()
  const suggestions = error?.code === 'topic_not_supported' ? error.suggestions : []
  const fade = { duration: sec(isCalm ? DURATION.quick : DURATION.panel), ease: EASING.enter }

  return (
    <main className={`ui-landing is-${phase}`} style={{ '--bar-top': `${fit.barTop}px` }}>
      {/* three panels, one per point of view; the dividers sit above the wordmark */}
      <div className="ui-lhero" aria-hidden="true">
        {panels.map((p, i) => (
          <div key={p.id} className="ui-lpanel" style={{ '--i': i, '--n': panels.length }}>
            <img src={p.url} alt="" />
          </div>
        ))}
        <i className="ui-lshade" />
      </div>

      <motion.h1
        className="ui-lmark-wrap"
        initial={false}
        animate={{ scale: isShrunk ? fit.scale : 1, y: isShrunk ? fit.y : 0 }}
        transition={{ duration: sec(isCalm ? 0 : T.shrink), ease: EASING.move }}
      >
        <span ref={markRef} className="ui-lmark" aria-label="vantage" role="img">
          {!isCalm && (
            <motion.span className="ui-lmark-soft" aria-hidden="true" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: sec(T.sharp), ease: EASING.enter }}>
              <Logo className="ui-lmark-logo" />
              vantage
            </motion.span>
          )}
          <motion.span
            className="ui-lmark-sharp"
            aria-hidden="true"
            initial={isCalm ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: sec(isCalm ? DURATION.quick : T.sharp), ease: EASING.enter }}
          >
            <Logo className="ui-lmark-logo" />
            vantage
          </motion.span>
        </span>
      </motion.h1>
      <div className="ui-ldividers" aria-hidden="true">
        <i style={{ left: '33.333%' }} />
        <i style={{ left: '66.666%' }} />
      </div>

      {phase === 'ready' && (
        <section className="ui-lbar" aria-label="start a story">
          <p className="ui-sr" aria-live="polite">
            {active >= 0 ? `step ${active + 1} of 3: ${STEP_NAMES[active]}` : ''}
          </p>
          <ol className="ui-lsteps">
            {pills.map(([long, short], i) => (
              <motion.li key={i} initial={{ opacity: 0, y: isCalm ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...fade, delay: isCalm ? 0 : sec(i * 90) }}>
                <button
                  type="button"
                  className={`ui-lpill ${active === i ? 'is-active' : ''} ${done[i] ? 'is-done' : ''}`}
                  aria-label={`step ${i + 1}, ${long}`}
                  aria-current={active === i ? 'step' : undefined}
                  aria-expanded={active === i}
                  aria-controls={active === i ? panelId : undefined}
                  onClick={() => open(i)}
                >
                  <span className="ui-lpill-n" aria-hidden="true">{NUMBERS[i]}</span>
                  <span className="ui-lpill-text">
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
                className="ui-lpanel-open"
                initial={{ opacity: 0, y: isCalm ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ ...fade, delay: isCalm || hasMoved ? 0 : sec(3 * 90) }}
              >
                <h2 className="ui-lpanel-title">{STEP_NAMES[active]}</h2>
                <Options
                  label={STEP_NAMES[active]}
                  options={groups[active].options}
                  value={groups[active].value}
                  columns={groups[active].columns}
                  autoFocus={hasMoved}
                  onPick={(v) => pick(active, v)}
                  onEscape={() => setActive(-1)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {error && !isStarting && (
            <div role="alert" className="ui-note ui-lerror">
              <p>{messageFor(error)}</p>
              {suggestions.map((s) => (
                <button key={s} type="button" className="ui-link" onClick={() => begin(s)}>{s}</button>
              ))}
            </div>
          )}
        </section>
      )}

      <AnimatePresence>{isStarting && <Shutter key="shutter" message="opening the archive..." />}</AnimatePresence>
    </main>
  )
}
