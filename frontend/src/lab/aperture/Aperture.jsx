// Direction A, "Aperture": a full-bleed stage with glass controls. The lens ring picks
// who is telling it, and switching pulls focus: the frame softens, regrades, and sharpens.
import '@fontsource-variable/archivo/wdth.css'
import './aperture.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Aperture as ApertureIcon, ArrowRight, ArrowUpRight, FileText, Pause, Play, X } from 'lucide-react'
import useStory, { ACCOUNTS, STATS, TOPIC, labParams } from '../shared/useStory.js'
import { AiLabel, SAMPLE_NOTE, sourceTypeLabel, useIllustration, useKey, tick } from '../shared/bits.jsx'
import { tone, toneOn } from '../shared/color.js'
import { gradeFor } from '../../constants/theme.js'
import { sceneDataUrl, sceneKindFor } from '../../lib/scene.js'
import usePerspectivePull from '../../hooks/usePerspectivePull.js'
import useTypewriter from '../../hooks/useTypewriter.js'
import useMediaQuery from '../../hooks/useMediaQuery.js'
import { CHOICE_TYPE_LABEL } from '../../constants/labels.js'

const BG = '#0A0C0F'
const EASE = [0.2, 0.7, 0.1, 1]
const LOOKS = Object.fromEntries(
  TOPIC.perspectives.map((p) => [p.perspective_id, { ...gradeFor(p.color), highlight: tone(p.color, 0.86, { maxC: 0.07 }), shadow: tone(p.color, 0.16, { maxC: 0.05 }), accent: toneOn(p.color, BG, { from: 0.8, min: 7, boost: 1.4, maxC: 0.14 }), label: p.label }]),
)
const NEUTRAL = { ...gradeFor('#9FB0BF'), accent: '#C9D1DA', label: '' }
const HERO = sceneDataUrl({ seed: `hero-${TOPIC.topic_id}`, kind: sceneKindFor(TOPIC.one_line), width: 2400, height: 1350 })
const params = labParams()

/* The frame: one scene, a pre-blurred copy to crossfade to (blur is never animated),
   and two duotone layers. A contradiction splits the grade down a visible seam. */
function Frame({ src, alt = '', look, splitLook, isSoft, canPan }) {
  const isSplit = !!splitLook
  return (
    <div className="ap-frame">
      <AnimatePresence initial={false}>
        <motion.div key={src} className={`ap-pan ${canPan ? 'ken-burns' : ''}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: EASE }}>
          <img src={src} alt={alt} className="ap-img" />
          <img src={src} alt="" aria-hidden="true" className="ap-img ap-img-soft" style={{ opacity: isSoft ? 1 : 0 }} />
        </motion.div>
      </AnimatePresence>
      {[[look, `inset(0 ${isSplit ? 50 : 0}% 0 0)`], [splitLook || look, `inset(0 0 0 ${isSplit ? 50 : 100}%)`]].map(([l, clipPath], n) => (
        <div key={n} aria-hidden="true">
          <div className="ap-grade grade-hi" style={{ backgroundColor: l.highlight, clipPath }} />
          <div className="ap-grade grade-lo" style={{ backgroundColor: l.shadow, clipPath }} />
        </div>
      ))}
      <div aria-hidden="true" className={`ap-seam ${isSplit ? 'is-on' : ''}`} />
      <div aria-hidden="true" className="ap-shade" />
    </div>
  )
}

/* The lens ring: marks slide under a fixed index, like turning a focus ring to a distance mark.
   It is a real ring: it repeats in both directions and always turns the short way round. */
const mod = (a, n) => ((a % n) + n) % n
function LensRing({ activeId, onSelect, heard, isBusy }) {
  const isNarrow = useMediaQuery('(max-width: 720px)')
  const slot = isNarrow ? 164 : 232
  const list = TOPIC.perspectives
  const n = list.length
  const i = Math.max(0, list.findIndex((p) => p.perspective_id === activeId))
  const [pos, setPos] = useState(i)
  if (mod(pos, n) !== i) {
    let d = i - mod(pos, n)
    if (d > n / 2) d -= n
    if (d < -n / 2) d += n
    setPos(pos + d)
  }
  const x = -(pos + 0.5) * slot
  const go = (d) => onSelect(list[mod(i + d, n)].perspective_id)
  const span = Math.max(n, 5)
  const marks = Array.from({ length: span * 2 + 1 }, (_, k) => pos - span + k)
  const lo = pos - Math.floor((n - 1) / 2)
  return (
    <div
      className="ap-ring"
      role="radiogroup"
      aria-label="Point of view"
      aria-busy={isBusy}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') (e.preventDefault(), go(1))
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') (e.preventDefault(), go(-1))
      }}
    >
      <div aria-hidden="true" className="ap-ticks" style={{ transform: `translate3d(${x}px,0,0)` }} />
      <span aria-hidden="true" className="ap-index" />
      <div className="ap-marks" style={{ transform: `translate3d(${x}px,0,0)` }}>
        {marks.map((k) => {
          const p = list[mod(k, n)]
          const isOn = k === pos
          const isReal = k >= lo && k < lo + n // one copy of each perspective is exposed to assistive tech
          const count = heard?.[p.perspective_id]
          return (
            <button
              key={k}
              type="button"
              role={isReal ? 'radio' : undefined}
              aria-checked={isReal ? isOn : undefined}
              aria-hidden={isReal ? undefined : true}
              tabIndex={isOn ? 0 : -1}
              disabled={isBusy && !isOn}
              ref={(el) => isOn && el && document.activeElement?.closest?.('.ap-ring') && el.focus({ preventScroll: true })}
              onClick={() => !isOn && onSelect(p.perspective_id)}
              className={`ap-mark ${isOn ? 'is-on' : ''}`}
              style={{ width: slot, left: k * slot, '--accent': LOOKS[p.perspective_id].accent }}
            >
              <span className="ap-mark-name">{p.label}</span>
              {heard && <span className="ap-mark-sub">{isOn ? 'In focus' : count ? `Heard ${count}` : 'Not heard yet'}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Landing({ onBegin, isStarting }) {
  const reduce = useReducedMotion()
  const [active, setActive] = useState(ACCOUNTS[0].perspective.perspective_id)
  const [isSoft, setIsSoft] = useState(false)
  const [isAuto, setIsAuto] = useState(!reduce && !params.isInstant)
  const timers = useRef([])
  const account = ACCOUNTS.find((a) => a.perspective.perspective_id === active) || ACCOUNTS[0]

  const pullTo = useCallback(
    (id) => {
      timers.current.forEach(clearTimeout)
      if (reduce) return setActive(id)
      setIsSoft(true)
      timers.current = [setTimeout(() => setActive(id), 260), setTimeout(() => setIsSoft(false), 440)]
    },
    [reduce],
  )
  // On load the ring turns once through every account, so the idea lands before anyone touches it.
  useEffect(() => {
    if (!isAuto) return
    const ids = ACCOUNTS.map((a) => a.perspective.perspective_id)
    let n = 0
    const t = setInterval(() => {
      n += 1
      pullTo(ids[n % ids.length])
      if (n >= ids.length) (clearInterval(t), setIsAuto(false))
    }, 2600)
    return () => clearInterval(t)
  }, [isAuto, pullTo])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const select = (id) => {
    setIsAuto(false)
    tick()
    pullTo(id)
  }

  return (
    <main className="ap-landing">
      <Frame src={HERO} look={LOOKS[active]} isSoft={isSoft} canPan={!reduce} />
      <header className="ap-bar">
        <p className="ap-brand"><ApertureIcon aria-hidden="true" size={20} strokeWidth={1.6} />Vantage</p>
        <p className="ap-note">{SAMPLE_NOTE}</p>
      </header>
      <div className="ap-hero">
        <h1 className="ap-h1">{TOPIC.title}</h1>
        <p className="ap-deck">See what happened from every side, and check every claim against its source.</p>
        <div className="ap-account" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.blockquote key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.26, ease: EASE }}>
              <p>{account.lead}</p>
              <footer style={{ color: LOOKS[active].accent }}>As told by {account.perspective.label.toLowerCase()}</footer>
            </motion.blockquote>
          </AnimatePresence>
        </div>
        <div className="ap-cta">
          <button type="button" className="ap-btn ap-btn-primary" onClick={onBegin} disabled={isStarting} aria-busy={isStarting}>
            {isStarting ? 'Opening the archive' : 'Step inside'}
            <ArrowRight aria-hidden="true" size={18} />
          </button>
          <p className="ap-stats">{STATS.perspectives} points of view · {STATS.sources} sources · {STATS.disagreements} disagreements</p>
        </div>
      </div>
      <div className="ap-ringwrap">
        <LensRing activeId={active} onSelect={select} />
        <p className="ap-hint">Turn the ring to change who is telling it</p>
      </div>
    </main>
  )
}

function EvidenceSheet({ segment, focusId, onFocus, onClose, sourcesById }) {
  const closeRef = useRef(null)
  useEffect(() => closeRef.current?.focus({ preventScroll: true }), [])
  useKey((e) => e.key === 'Escape' && onClose())
  const ids = [...new Set(segment.claims.map((c) => c.source_id))]
  return (
    <>
      <motion.div className="ap-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden="true" />
      <motion.aside
        className="ap-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="How this was grounded"
        initial={{ opacity: 0, x: 'var(--from-x)', y: 'var(--from-y)' }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, x: 'var(--from-x)', y: 'var(--from-y)' }}
        transition={{ duration: 0.34, ease: EASE }}
      >
        <header>
          <div>
            <h2>How this was grounded</h2>
            <p>Evidence, not narration. No generated images appear here.</p>
          </div>
          <button ref={closeRef} type="button" className="ap-icon on-paper" onClick={onClose} aria-label="Close"><X aria-hidden="true" size={20} /></button>
        </header>
        <ol className="ap-claims">
          {segment.claims.map((c, n) => (
            <li key={c.claim_id}>
              <span aria-hidden="true">{n + 1}</span>
              <p>{c.text}</p>
              <button type="button" className={`ap-tag ${focusId === c.source_id ? 'is-on' : ''}`} onClick={() => onFocus(c.source_id)}>
                {sourceTypeLabel(sourcesById[c.source_id])}
              </button>
            </li>
          ))}
        </ol>
        <ul className="ap-sources">
          {ids.map((id) => {
            const s = sourcesById[id]
            const isOn = id === focusId
            return (
              <li key={id} className={isOn ? 'is-on' : ''} style={{ '--mark': (LOOKS[s.perspective] || NEUTRAL).mark }}>
                <p className="ap-src-meta">{sourceTypeLabel(s)} · {(LOOKS[s.perspective] || NEUTRAL).label}</p>
                <h3>{s.title}</h3>
                <blockquote><mark>{s.excerpt}</mark></blockquote>
                <p className="ap-src-foot">
                  <span>{s.attribution}</span>
                  <a href={s.url} target="_blank" rel="noreferrer noopener">Open the original<ArrowUpRight aria-hidden="true" size={14} /></a>
                </p>
              </li>
            )
          })}
        </ul>
      </motion.aside>
    </>
  )
}

function Contradiction({ c, sourcesById, onOpen }) {
  const side = (s, name) => {
    const src = sourcesById[s.source_id]
    return (
      <div className="ap-side">
        <p className="ap-side-name" style={{ color: (LOOKS[src?.perspective] || NEUTRAL).accent }}>{name} · {(LOOKS[src?.perspective] || NEUTRAL).label}</p>
        <p>{s.text}</p>
        <button type="button" className="ap-tag" onClick={() => onOpen(s.source_id)}>{sourceTypeLabel(src)}</button>
      </div>
    )
  }
  return (
    <motion.section className="ap-glass ap-contra" aria-label="Sources disagree" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
      <p className="ap-contra-flag"><span aria-hidden="true">≠</span>Sources disagree</p>
      <h3>{c.claim}</h3>
      <div className="ap-sides">
        {side(c.side_a, 'One account')}
        <span aria-hidden="true" className="ap-sides-seam" />
        {side(c.side_b, 'Another account')}
      </div>
      {c.explanation && <p className="ap-why"><strong>Why they differ. </strong>{c.explanation}</p>}
    </motion.section>
  )
}

function Player({ story, onExit }) {
  const reduce = useReducedMotion()
  const { current, sourcesById, heard, isLoading, pending } = story
  const { shown, pull, beginPull, cancelPull } = usePerspectivePull(current, { isReduced: !!reduce })
  const look = (shown && LOOKS[shown.perspective]) || NEUTRAL
  const [isPaused, setIsPaused] = useState(false)
  const isActive = pull === 'idle' && !isPaused
  const text = shown?.narrative_text || ''
  const { shown: typed, isDone, complete } = useTypewriter(text, { isActive, isInstant: !!reduce || params.isInstant })
  const art = useIllustration(shown, params.isInstant)
  const [sheet, setSheet] = useState(params.view === 'evidence' ? { focusId: null } : null)
  const opener = useRef(null)

  const shift = useCallback(
    async (id) => {
      if (isLoading || !shown || id === shown.perspective) return
      tick()
      beginPull()
      const seg = await story.shiftTo(id)
      if (!seg) cancelPull()
    },
    [isLoading, shown, beginPull, cancelPull, story],
  )
  const choose = async (choice) => {
    const isShift = choice.perspective !== shown.perspective
    if (isShift) (tick(), beginPull())
    const seg = await story.choose(choice)
    if (!seg && isShift) cancelPull()
  }
  const openSheet = (focusId, e) => {
    opener.current = e?.currentTarget || document.activeElement
    setSheet({ focusId: focusId || shown.claims[0]?.source_id })
  }
  const closeSheet = () => {
    setSheet(null)
    opener.current?.focus?.()
  }

  const c = isDone && pull === 'idle' ? shown?.contradiction : null
  const splitLook = c ? LOOKS[sourcesById[c.side_b.source_id]?.perspective] || NEUTRAL : null
  const mainLook = c ? LOOKS[sourcesById[c.side_a.source_id]?.perspective] || look : look
  const sourceIds = useMemo(() => [...new Set((shown?.claims || []).map((x) => x.source_id))], [shown])
  if (!shown) return null

  return (
    <main className="ap-player" style={{ '--accent': look.accent }}>
      <div className="ap-stage">
        <Frame src={art.url} alt={art.isReady ? `Illustration: ${shown.title}` : ''} look={mainLook} splitLook={splitLook} isSoft={pull === 'closing' || pull === 'closed' || !art.isReady} canPan={!reduce} />
        {art.isReady ? <AiLabel kind="image" className="ap-ai" /> : <p className="ap-ai ap-ai-wait" role="status">Developing the illustration</p>}
        {pending?.perspective && pull !== 'idle' && <p className="ap-pulling" role="status">Finding {LOOKS[pending.perspective]?.label.toLowerCase()}</p>}
      </div>

      <header className="ap-bar">
        <button type="button" className="ap-brand" onClick={onExit} aria-label="Vantage. Back to the start">
          <ApertureIcon aria-hidden="true" size={20} strokeWidth={1.6} />Vantage
        </button>
        <p className="ap-topic">{TOPIC.title}</p>
        <p className="ap-note">{SAMPLE_NOTE}</p>
      </header>

      <div className="ap-body">
        <article className="ap-glass ap-card" aria-labelledby="ap-title">
          <p className="ap-date">{shown.date_label}</p>
          <h2 id="ap-title" className={`ap-title ${pull === 'idle' ? '' : 'is-soft'}`}>{shown.title}</h2>
          <p className="sr-only-live" aria-live="polite">{pull === 'idle' ? text : ''}</p>
          <p className={`ap-caption ${pull === 'idle' ? '' : 'is-soft'}`} aria-hidden="true" onClick={complete}>
            {typed}
            {!isDone && <><span className="caret ap-caret" /><span className="ap-ghost">{text.slice(typed.length)}</span></>}
          </p>
          <div className="ap-row">
            <button type="button" className="ap-icon" onClick={() => (isDone ? null : setIsPaused((v) => !v))} disabled={isDone} aria-label={isPaused ? 'Play narration' : 'Pause narration'}>
              {isPaused ? <Play aria-hidden="true" size={18} /> : <Pause aria-hidden="true" size={18} />}
            </button>
            <AiLabel kind="voice" />
            <span className="ap-row-gap" />
            <button type="button" className="ap-btn ap-btn-quiet" onClick={(e) => openSheet(null, e)}>
              <FileText aria-hidden="true" size={16} />
              Grounded in {sourceIds.length} {sourceIds.length === 1 ? 'source' : 'sources'}
            </button>
          </div>
          <ul className="ap-pins" aria-label="Evidence in this scene">
            {sourceIds.map((id) => (
              <li key={id}><button type="button" className="ap-tag" onClick={(e) => openSheet(id, e)} title={sourcesById[id]?.title}>{sourceTypeLabel(sourcesById[id])} · {sourcesById[id]?.attribution}</button></li>
            ))}
          </ul>
        </article>

        <div className="ap-next">
          {c && <Contradiction c={c} sourcesById={sourcesById} onOpen={(id) => openSheet(id)} />}
          {isDone && pull === 'idle' && (
            shown.is_final ? (
              <div className="ap-glass ap-end">
                <p>This thread ends here.</p>
                <button type="button" className="ap-btn ap-btn-quiet" onClick={onExit}>Start again</button>
              </div>
            ) : (
              <motion.ul className="ap-choices" aria-label="Where next" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
                {shown.choices.map((ch) => (
                  <motion.li key={ch.choice_id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } } }}>
                    <button type="button" className="ap-glass ap-choice" onClick={() => choose(ch)} disabled={isLoading} aria-busy={pending?.choiceId === ch.choice_id} style={{ '--accent': (LOOKS[ch.perspective] || NEUTRAL).accent }}>
                      <span aria-hidden="true" className="ap-dot" />
                      <span className="ap-choice-label">{ch.label}</span>
                      <span className="ap-choice-type">{pending?.choiceId === ch.choice_id ? 'Loading' : CHOICE_TYPE_LABEL[ch.choice_type]}</span>
                    </button>
                  </motion.li>
                ))}
              </motion.ul>
            )
          )}
        </div>
      </div>

      <div className="ap-ringwrap">
        <LensRing activeId={pending?.perspective || shown.perspective} onSelect={shift} heard={heard} isBusy={isLoading} />
      </div>

      <AnimatePresence>
        {sheet && <EvidenceSheet key="sheet" segment={shown} focusId={sheet.focusId} onFocus={(id) => setSheet({ focusId: id })} onClose={closeSheet} sourcesById={sourcesById} />}
      </AnimatePresence>
    </main>
  )
}

export default function Aperture() {
  const story = useStory()
  const [view, setView] = useState(params.view === 'landing' ? 'landing' : 'player')
  const { start, status } = story
  useEffect(() => {
    if (params.view !== 'landing') start({ toContradiction: params.view === 'contradiction' })
  }, [start])
  const begin = async () => {
    await start()
    setView('player')
  }
  const isPlayer = view === 'player' && status === 'ready'
  return (
    <div className="ap">
      {isPlayer ? <Player story={story} onExit={() => (story.reset(), setView('landing'))} /> : <Landing onBegin={begin} isStarting={status === 'starting'} />}
    </div>
  )
}
