// Landing: one frame cut into three panels, one per point of view. Moving across them
// pulls focus from one account to the next, which is the whole idea of the product.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Aperture, ArrowRight, Volume2, VolumeX } from 'lucide-react'
import { SAMPLE_BUNDLES } from '../mocks/index.js'
import { sceneDataUrl, sceneKindFor } from '../lib/scene.js'
import { unlockAudio } from '../lib/audio.js'
import { messageFor } from '../api/errors.js'
import { DURATION, EASING } from '../constants/theme.js'
import { ms, sec, useCalmMotion } from '../lib/motionMode.js'
import { lookFor } from './looks.js'
import LanguageSelects from '../components/LanguageSelects.jsx'
import { Btn, DataBadge, IconBtn, Waiting } from './ui.jsx'
import './landing.css'

const firstSentence = (text) => (String(text || '').match(/[^.!?]+[.!?]+["')\]]*/) || [''])[0].trim()

/** What the landing page shows for a topic. Every number and line is read from the bundle. */
function featuredFrom(bundle) {
  const t = bundle.topic
  const first = bundle.segments.find((s) => s.segment_id === bundle.start_segment_id) || bundle.segments[0]
  return {
    id: t.topic_id,
    title: t.title,
    oneLine: t.one_line,
    hero: sceneDataUrl({ seed: `hero-${t.topic_id}`, kind: sceneKindFor(`${first?.scene_prompt} ${t.one_line}`), width: 2400, height: 1200 }),
    perspectiveCount: t.perspectives.length,
    sourceCount: bundle.sources.length,
    disagreementCount: bundle.segments.filter((s) => s.contradiction).length,
    panels: t.perspectives.slice(0, 3).map((p) => ({
      id: p.perspective_id,
      label: p.label,
      look: lookFor(p.color, p.label),
      lead: firstSentence(bundle.segments.find((s) => s.perspective === p.perspective_id)?.narrative_text),
    })),
  }
}

export default function Landing({ onStart, isStarting, error, dataSource, isSoundOn, onToggleSound, language }) {
  const isCalm = useCalmMotion()
  const topics = useMemo(() => SAMPLE_BUNDLES.map(featuredFrom), [])
  const [topicIndex, setTopicIndex] = useState(0)
  const [value, setValue] = useState('')
  const [focus, setFocus] = useState(1)
  const [isSettled, setIsSettled] = useState(isCalm)
  const frame = useRef(null)
  const input = useRef(null)
  const topic = topics[topicIndex]
  const panel = topic.panels[Math.min(focus, topic.panels.length - 1)]

  // Load: once the frame has opened, focus runs across the panels one time to teach the gesture.
  useEffect(() => {
    if (isCalm) return
    const order = [0, 1, 2, 1]
    const timers = order.map((i, n) => setTimeout(() => setFocus(Math.min(i, topic.panels.length - 1)), ms(DURATION.slow + n * DURATION.panel)))
    timers.push(setTimeout(() => setIsSettled(true), ms(DURATION.slow + order.length * DURATION.panel)))
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fine pointers only: the panel under the pointer comes into focus, and the scene shifts against it.
  const raf = useRef(0)
  const onPointerMove = (e) => {
    if (e.pointerType !== 'mouse' || !isSettled || isCalm) return
    const r = frame.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    const i = Math.max(0, Math.min(topic.panels.length - 1, Math.floor(x * topic.panels.length)))
    if (i !== focus) setFocus(i)
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      frame.current?.style.setProperty('--px', (x * 2 - 1).toFixed(3))
      frame.current?.style.setProperty('--py', (y * 2 - 1).toFixed(3))
    })
  }
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const begin = useCallback(
    (title) => {
      if (isStarting || !title) return
      unlockAudio()
      onStart(title)
    },
    [isStarting, onStart],
  )
  const suggestions = error?.code === 'topic_not_supported' ? error.suggestions : []

  return (
    <main className={`v2-landing ${isSettled ? 'is-settled' : ''}`}>
      <header className="v2-bar">
        <p className="v2-brand"><Aperture aria-hidden="true" size={20} strokeWidth={1.6} />Vantage</p>
        <span className="v2-bar-gap" />
        <DataBadge source={dataSource} className="v2-wide-only" />
        <IconBtn label={isSoundOn ? 'Sound on' : 'Sound off'} icon={isSoundOn ? Volume2 : VolumeX} isPressed={isSoundOn} onClick={onToggleSound} tip="left" />
      </header>

      <div ref={frame} className="v2-lframe" style={{ '--panels': topic.panels.length }} onPointerMove={onPointerMove}>
        {topic.panels.map((p, i) => (
          <button
            key={`${topic.id}-${p.id}`}
            type="button"
            className={`v2-panel ${i === focus ? 'is-focus' : ''}`}
            style={{ '--i': i, '--accent': p.look.accent }}
            aria-pressed={i === focus}
            aria-label={`${p.label}. ${p.lead}`}
            onClick={() => setFocus(i)}
            onFocus={() => setFocus(i)}
          >
            <span className="v2-panel-art" aria-hidden="true">
              <img src={topic.hero} alt="" className="print-gray" />
              <img src={topic.hero} alt="" className="print-gray v2-panel-soft" />
              <i className="grade-hi" style={{ backgroundColor: p.look.highlight }} />
              <i className="grade-lo" style={{ backgroundColor: p.look.shadow }} />
            </span>
            <span className="v2-panel-shade" aria-hidden="true" />
            <span className="v2-panel-label" aria-hidden="true"><i />{p.label}</span>
          </button>
        ))}
        <p className="v2-wordmark" aria-hidden="true">
          <span className="v2-wordmark-soft">Vantage</span>
          <span className="v2-wordmark-sharp">Vantage</span>
        </p>
      </div>

      <section className="v2-start">
        <div className="v2-pitch">
          <h1>See what happened from every side, and check every claim against its source.</h1>
          <div className="v2-account" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p key={`${topic.id}-${panel.id}`} initial={{ opacity: 0, y: isCalm ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: sec(DURATION.quick), ease: EASING.enter }}>
                <span style={{ color: panel.look.accent }}>{panel.label}</span>
                {panel.lead}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <form
          className="v2-go"
          onSubmit={(e) => {
            e.preventDefault()
            begin(value.trim() || topic.title)
          }}
        >
          <label htmlFor="v2-topic">Choose a story</label>
          <div className="v2-field">
            <input ref={input} id="v2-topic" value={value} onChange={(e) => setValue(e.target.value)} placeholder={topic.title} autoComplete="off" disabled={isStarting} />
            <Btn type="submit" variant="primary" isLoading={isStarting}>
              {isStarting ? 'Opening' : 'Begin'}
              {!isStarting && <ArrowRight aria-hidden="true" size={18} />}
            </Btn>
          </div>
          {language && (
            <LanguageSelects
              className="v2-langs"
              languages={language.languages}
              narration={language.narrationLanguage}
              subtitles={language.subtitleLanguage}
              onNarration={language.setNarrationLanguage}
              onSubtitles={language.setSubtitleLanguage}
              isOffline={language.isOffline}
            />
          )}
          <ul className="v2-topics" aria-label="Stories with sources">
            {topics.map((t, i) => (
              <li key={t.id}>
                <button type="button" className="v2-topic" aria-pressed={i === topicIndex && !value} disabled={isStarting} onClick={() => (setTopicIndex(i), setValue(''), setFocus(1))}>
                  {t.title}
                </button>
              </li>
            ))}
          </ul>
          <div className="v2-go-status">
            {isStarting ? (
              <Waiting message="Opening the archive" slowMessage="Still reading the sources. The first scene can take a few seconds." />
            ) : error ? (
              <div role="alert" className="v2-note">
                <p>{messageFor(error)}</p>
                {suggestions.map((s) => (
                  <button key={s} type="button" className="v2-link" onClick={() => begin(s)}>{s}</button>
                ))}
              </div>
            ) : (
              <p className="mono v2-counts">{topic.perspectiveCount} points of view · {topic.sourceCount} sources · {topic.disagreementCount} disagreements</p>
            )}
          </div>
        </form>
      </section>

      <footer className="v2-lfoot">
        <p>Every documentary is one cut. This is the whole story, and it shows its sources.</p>
        <p>AI images and voices are always labeled. Previews use the demo sources.</p>
        <DataBadge source={dataSource} className="v2-narrow-only" />
      </footer>
    </main>
  )
}
