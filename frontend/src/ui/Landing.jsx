// Landing: a white page. The lowercase "vantage" wordmark sharpens into view, then a three-step bar
// arrives (narration language, subtitles language, story, with a search box for any event).
// Choosing a story starts the session.
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { unlockAudio } from './audio.js'
import { messageFor } from '../api/errors.js'
import { DURATION, EASING } from './theme.js'
import { ms, sec, useCalmMotion } from './motionMode.js'
import Logo from './Logo.jsx'
import Shutter from './Shutter.jsx'
import './landing.css'

/** Load sequence (ms): the wordmark sharpens big and alone for 1300, then shrinks for 700 while the step bar opens under it. */
const T = { sharp: 1300, shrink: 700 }

/** Wordmark size in px: big while it sharpens, smaller once the step bar is there. */
const markSize = (vw, isBig) => Math.round(Math.min(isBig ? 240 : 112, Math.max(56, vw * (isBig ? 0.145 : 0.12))))
const NUMBERS = ['1', '2', '3']
const STEP_NAMES = ['narration language', 'subtitles language', 'story']

/** Story choices: the topics named in the frontend config. */
const STORIES = (import.meta.env.VITE_VANTAGE_EXAMPLE_TOPICS || 'Titanic,Battle of Princeton')
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean)
  .map((title) => ({ id: title, title }))

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
 *   language: object, isReturning?: boolean }} props
 * isReturning: the viewer came back from a story, so skip the intro and open the story step.
 */
export default function Landing({ onStart, isStarting, error, language, isReturning = false }) {
  const isCalm = useCalmMotion()
  const { languages, narrationLanguage, subtitleLanguage, setNarrationLanguage, setSubtitleLanguage, nameOf } = language

  // ---------- load sequence ----------
  const [phase, setPhase] = useState(isCalm || isReturning ? 'ready' : 'sharpen') // sharpen | ready
  useEffect(() => {
    if (isCalm || isReturning) return setPhase('ready')
    const a = setTimeout(() => setPhase('ready'), ms(T.sharp))
    return () => clearTimeout(a)
  }, [isCalm, isReturning])

  // ---------- the three steps ----------
  const [active, setActive] = useState(isReturning ? 2 : 0) // 0 | 1 | 2 | -1 (all collapsed)
  const [done, setDone] = useState(isReturning ? [true, true, false] : [false, false, false])
  const [hasMoved, setHasMoved] = useState(isReturning) // focus moves into a step only after the viewer acts

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

  const subtitleName = subtitleLanguage === 'off' ? 'off' : nameOf(subtitleLanguage)
  const narrationName = nameOf(narrationLanguage)
  // long text for the full pill, short text for the compact chip on phones
  const pills = [
    [`narration: ${narrationName}`, narrationName],
    [`subtitles: ${subtitleName}`, subtitleName],
    ['story', 'story'],
  ]
  const groups = [
    { columns: 'lang', value: narrationLanguage, options: languages.map((l) => ({ value: l.code, title: l.name.toLowerCase(), lang: l.code })) },
    {
      columns: 'lang',
      value: subtitleLanguage,
      options: [{ value: 'off', title: 'off' }, ...languages.map((l) => ({ value: l.code, title: l.name.toLowerCase(), lang: l.code }))],
    },
    { columns: 'story', value: null, options: STORIES.map((s) => ({ value: s.id, title: s.title, line: s.line, disabled: isStarting })) },
  ]
  const panelId = useId()
  const anyId = useId()
  const [anyEvent, setAnyEvent] = useState('')
  const suggestions = error?.code === 'topic_not_supported' ? error.suggestions : []
  const fade = { duration: sec(isCalm ? DURATION.quick : DURATION.panel), ease: EASING.enter }
  const isReady = phase === 'ready'
  const [vw, setVw] = useState(() => window.innerWidth)
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const rise = (i) => ({ initial: { opacity: 0, y: isCalm ? 0 : 10 }, animate: isReady ? { opacity: 1, y: 0 } : {}, transition: { ...fade, delay: isCalm ? 0 : sec(i * 90) } })

  return (
    <main className={`ui-landing is-${phase}`}>
      <div className="ui-lwrap">
        <header className="ui-lhead">
          <motion.h1
            className="ui-lmark-wrap"
            initial={false}
            animate={{ fontSize: markSize(vw, !isReady) }}
            transition={{ duration: sec(isCalm ? 0 : T.shrink), ease: EASING.move }}
          >
            <span className="ui-lmark" aria-label="vantage" role="img">
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
        </header>

        {isReady && (
          <motion.section
            className="ui-lbar"
            aria-label="start a story"
            initial={isCalm || isReturning ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            transition={{ duration: sec(isCalm ? 0 : T.shrink), ease: EASING.move }}
          >
            <p className="ui-sr" aria-live="polite">
              {active >= 0 ? `step ${active + 1} of 3: ${STEP_NAMES[active]}` : ''}
            </p>
            <ol className="ui-lsteps">
              {pills.map(([long, short], i) => (
                <motion.li key={i} {...rise(i)}>
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
                  {active === 2 && (
                    <form className="ui-lany" onSubmit={(e) => { e.preventDefault(); begin(anyEvent.trim()) }}>
                      <label htmlFor={anyId} className="ui-lpanel-title">or search any event, past or present</label>
                      <div className="ui-lany-row">
                        <input
                          id={anyId}
                          className="ui-lany-input"
                          type="search"
                          value={anyEvent}
                          onChange={(e) => setAnyEvent(e.target.value)}
                          placeholder="the eruption of Pompeii"
                          autoComplete="off"
                          disabled={isStarting}
                        />
                        <button type="submit" className="ui-lany-go" disabled={!anyEvent.trim() || isStarting}>
                          {isStarting && anyEvent.trim() ? 'finding sources…' : 'research it'}
                        </button>
                      </div>
                      {isStarting && anyEvent.trim() && (
                        <p className="ui-lnote" aria-live="polite">reading real sources and finding every side of the story. this takes about 30 seconds.</p>
                      )}
                    </form>
                  )}
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
          </motion.section>
        )}

      </div>

      <AnimatePresence>{isStarting && <Shutter key="shutter" message="opening the archive..." />}</AnimatePresence>
    </main>
  )
}
