// Direction B, "Editorial": a bright long read. Perspectives are tabs, sources are margin
// notes, and switching perspective re-sets the page in a new ink.
import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource-variable/newsreader/opsz-italic.css'
import './editorial.css'
import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useReducedMotion } from 'motion/react'
import { ArrowRight, ArrowUpRight, Pause, Play } from 'lucide-react'
import useStory, { ACCOUNTS, FIRST_CONTRADICTION, STATS, SOURCES_BY_ID, TOPIC, labParams } from '../shared/useStory.js'
import { AiLabel, SAMPLE_NOTE, sourceTypeLabel, useIllustration } from '../shared/bits.jsx'
import { tone, toneOn } from '../shared/color.js'
import useTypewriter from '../../hooks/useTypewriter.js'
import { CHOICE_TYPE_LABEL } from '../../constants/labels.js'

const PAPER = '#FAF8F3'
const INKS = Object.fromEntries(
  TOPIC.perspectives.map((p) => [
    p.perspective_id,
    { ink: toneOn(p.color, PAPER, { from: 0.5, dir: -1, min: 5.5, boost: 1.8, maxC: 0.15 }), wash: tone(p.color, 0.92, { boost: 1.2, maxC: 0.05 }), label: p.label },
  ]),
)
const NEUTRAL = { ink: '#3D4249', wash: '#ECEAE3', label: '' }
const inkOf = (id) => INKS[id] || NEUTRAL
const params = labParams()

function Disagreement({ c, sourcesById, openNote }) {
  const side = (s, name) => {
    const src = sourcesById[s.source_id]
    const ink = inkOf(src?.perspective)
    return (
      <div className="ed-side" style={{ '--ink': ink.ink }}>
        <p className="ed-side-name">{name}, {ink.label.toLowerCase()}</p>
        <p className="ed-side-text">{s.text}</p>
        {openNote ? (
          <button type="button" className="ed-cite" onClick={() => openNote(s.source_id)}>{sourceTypeLabel(src)}, {src?.attribution}</button>
        ) : (
          <p className="ed-cite-static">{sourceTypeLabel(src)}, {src?.attribution}</p>
        )}
      </div>
    )
  }
  return (
    <section className="ed-disagree" aria-label="Sources disagree">
      <p className="ed-flag"><span aria-hidden="true">≠</span>Sources disagree</p>
      <h3>{c.claim}</h3>
      <div className="ed-sides">
        {side(c.side_a, 'One account')}
        <span aria-hidden="true" className="ed-versus"><i>≠</i></span>
        {side(c.side_b, 'Another account')}
      </div>
      {c.explanation && <p className="ed-why"><em>Why they differ.</em> {c.explanation}</p>}
    </section>
  )
}

function Landing({ onBegin, isStarting }) {
  const [active, setActive] = useState(0)
  const refs = useRef([])
  // The sticky column follows whichever account is at the middle of the screen.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(Number(e.target.dataset.i))),
      { rootMargin: '-45% 0px -45% 0px' },
    )
    refs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [])
  const ink = inkOf(ACCOUNTS[active].perspective.perspective_id)
  const cta = (
    <button type="button" className="ed-btn" onClick={onBegin} disabled={isStarting} aria-busy={isStarting}>
      {isStarting ? 'Opening the archive' : 'Begin reading'}
      <ArrowRight aria-hidden="true" size={18} />
    </button>
  )
  return (
    <main className="ed-landing">
      <header className="ed-mast">
        <p className="ed-brand">Vantage</p>
        <p className="ed-mast-note">{SAMPLE_NOTE}</p>
      </header>
      <section className="ed-hero">
        <h1>{TOPIC.title}</h1>
        <div className="ed-hero-foot">
          <p className="ed-deck">See what happened from every side, and check every claim against its source.</p>
          <div className="ed-hero-cta">
            {cta}
            <p className="ed-stats">{STATS.perspectives} points of view, {STATS.sources} sources, {STATS.disagreements} disagreements</p>
          </div>
        </div>
      </section>

      <section className="ed-accounts" style={{ '--ink': ink.ink, '--wash': ink.wash }} aria-label="The same story, by account">
        <div className="ed-sticky">
          <p className="ed-sticky-line">One story,</p>
          <p className="ed-sticky-line">as told by</p>
          <p className="ed-sticky-who" key={active} aria-live="polite">{ink.label.toLowerCase()}</p>
          <ol className="ed-sticky-index" aria-hidden="true">
            {ACCOUNTS.map((a, i) => (
              <li key={a.perspective.perspective_id} className={i === active ? 'is-on' : ''} style={{ '--ink': inkOf(a.perspective.perspective_id).ink }} />
            ))}
          </ol>
        </div>
        <ol className="ed-account-list">
          {ACCOUNTS.map((a, i) => {
            const k = inkOf(a.perspective.perspective_id)
            const n = new Set(a.segment.claims.map((c) => c.source_id)).size
            return (
              <li key={a.perspective.perspective_id} data-i={i} ref={(el) => (refs.current[i] = el)} className={`ed-account ${i === active ? 'is-on' : ''}`} style={{ '--ink': k.ink }}>
                <p className="ed-account-who">{k.label}</p>
                <h2>{a.segment.title}</h2>
                <p className="ed-account-lead">{a.lead}</p>
                <p className="ed-account-foot">{a.segment.date_label}. Grounded in {n} {n === 1 ? 'source' : 'sources'}.</p>
              </li>
            )
          })}
        </ol>
      </section>

      {FIRST_CONTRADICTION && (
        <section className="ed-landing-disagree">
          <p className="ed-lede">When the accounts cannot both be right, the page says so.</p>
          <Disagreement c={FIRST_CONTRADICTION} sourcesById={SOURCES_BY_ID} />
        </section>
      )}

      <footer className="ed-foot">
        {cta}
        <p>Every documentary is one cut. This is the whole story, and it shows its sources. AI images and voices are always labeled.</p>
      </footer>
    </main>
  )
}

function Notes({ segment, sourcesById, openId, setOpenId }) {
  return (
    <aside className="ed-notes" aria-label="How this was grounded">
      <h2>How this was grounded</h2>
      <ol>
        {segment.claims.map((c, n) => {
          const s = sourcesById[c.source_id]
          const isOpen = openId === c.claim_id
          return (
            <li key={c.claim_id} className={isOpen ? 'is-open' : ''}>
              <span className="ed-note-n" aria-hidden="true">{n + 1}</span>
              <p>{c.text}</p>
              <button type="button" className="ed-cite" aria-expanded={isOpen} onClick={() => setOpenId(isOpen ? null : c.claim_id)}>
                {sourceTypeLabel(s)}, {s?.attribution}
              </button>
              {isOpen && (
                <div className="ed-source">
                  <h3>{s.title}</h3>
                  <blockquote><mark>{s.excerpt}</mark></blockquote>
                  <p className="ed-source-foot">
                    <span>{inkOf(s.perspective).label}</span>
                    <a href={s.url} target="_blank" rel="noreferrer noopener">Open the original<ArrowUpRight aria-hidden="true" size={14} /></a>
                  </p>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </aside>
  )
}

function Player({ story, onExit }) {
  const reduce = useReducedMotion()
  const { current, pending, isLoading, sourcesById, heard } = story
  const [shown, setShown] = useState(current)
  const [isSetting, setIsSetting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [openId, setOpenId] = useState(params.view === 'evidence' ? current?.claims[0]?.claim_id : null)

  // The signature: a new perspective re-sets the page. The old column fades, a rule in the
  // new ink sweeps across, and the new text is wiped in from the left like a fresh proof.
  useEffect(() => {
    if (!current || current === shown) return
    const isShift = shown && current.perspective !== shown.perspective
    const apply = () => {
      setShown(current)
      setOpenId(null)
      window.scrollTo(0, 0)
    }
    if (reduce || !document.startViewTransition) return apply()
    document.documentElement.dataset.vt = isShift ? 'reset' : 'turn'
    setIsSetting(true)
    const vt = document.startViewTransition(() => flushSync(apply))
    vt.finished.finally(() => setIsSetting(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  const text = shown?.narrative_text || ''
  const { shown: typed, isDone, complete } = useTypewriter(text, { isActive: !isSetting && !isPaused, isInstant: !!reduce || params.isInstant })
  const art = useIllustration(shown, params.isInstant)
  if (!shown) return null
  const ink = inkOf(shown.perspective)
  const openNote = (sourceId) => {
    const claim = shown.claims.find((c) => c.source_id === sourceId)
    if (claim) setOpenId(claim.claim_id)
    document.querySelector('.ed-notes')?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <main className="ed-player" style={{ '--ink': ink.ink, '--wash': ink.wash }}>
      <header className="ed-mast ed-mast-player">
        <button type="button" className="ed-brand" onClick={onExit} aria-label="Vantage. Back to the start">Vantage</button>
        <p className="ed-mast-topic">{TOPIC.title}</p>
        <div className="ed-listen">
          <button type="button" className="ed-round" onClick={() => setIsPaused((v) => !v)} disabled={isDone} aria-label={isPaused ? 'Play narration' : 'Pause narration'}>
            {isPaused ? <Play aria-hidden="true" size={16} /> : <Pause aria-hidden="true" size={16} />}
          </button>
          <AiLabel kind="voice" />
        </div>
      </header>

      <nav className="ed-tabs" role="tablist" aria-label="Point of view">
        {TOPIC.perspectives.map((p) => {
          const isOn = p.perspective_id === shown.perspective
          const isWaiting = pending?.perspective === p.perspective_id && !isOn
          return (
            <button
              key={p.perspective_id}
              type="button"
              role="tab"
              aria-selected={isOn}
              aria-busy={isWaiting}
              disabled={isLoading && !isOn}
              onClick={() => !isOn && story.shiftTo(p.perspective_id)}
              className={`ed-tab ${isOn ? 'is-on' : ''} ${isWaiting ? 'is-waiting' : ''}`}
              style={{ '--ink': inkOf(p.perspective_id).ink }}
            >
              {p.label}
              <span className="ed-tab-sub">{isWaiting ? 'Setting the page' : heard[p.perspective_id] ? `${heard[p.perspective_id]} read` : 'Not read yet'}</span>
            </button>
          )
        })}
      </nav>
      <div className="ed-rule" aria-hidden="true" />

      <div className="ed-page">
        <article className="ed-article" aria-labelledby="ed-title">
          <p className="ed-dateline">{shown.date_label}, as told by {ink.label.toLowerCase()}</p>
          <h1 id="ed-title">{shown.title}</h1>
          <figure className="ed-figure">
            <div className={`ed-plate ${art.isReady ? 'is-ready' : ''}`}>
              <img src={art.url} alt={art.isReady ? `Illustration: ${shown.title}` : ''} />
            </div>
            <figcaption>{art.isReady ? <AiLabel kind="image" /> : <span role="status">Preparing the illustration</span>}</figcaption>
          </figure>
          <p className="sr-only-live" aria-live="polite">{isSetting ? '' : text}</p>
          <p className="ed-body" aria-hidden="true" onClick={complete}>
            {typed}
            {!isDone && <><span className="caret ed-caret" /><span className="ed-ghost">{text.slice(typed.length)}</span></>}
          </p>
        </article>

        <Notes segment={shown} sourcesById={sourcesById} openId={openId} setOpenId={setOpenId} />

        {isDone && shown.contradiction && (
          <div className="ed-wide"><Disagreement c={shown.contradiction} sourcesById={sourcesById} openNote={openNote} /></div>
        )}

        {isDone && (
          <nav className="ed-onward" aria-label="Keep reading">
            {shown.is_final ? (
              <p className="ed-end">This thread ends here. <button type="button" className="ed-cite" onClick={onExit}>Start again</button></p>
            ) : (
              <ul>
                {shown.choices.map((ch) => {
                  const isBusy = pending?.choiceId === ch.choice_id
                  return (
                    <li key={ch.choice_id}>
                      <button type="button" className="ed-choice" onClick={() => story.choose(ch)} disabled={isLoading} aria-busy={isBusy} style={{ '--ink': inkOf(ch.perspective).ink }}>
                        <span className="ed-choice-label">{ch.label}</span>
                        <span className="ed-choice-meta">{isBusy ? 'Setting the page' : `${CHOICE_TYPE_LABEL[ch.choice_type]}, ${inkOf(ch.perspective).label.toLowerCase()}`}</span>
                        <ArrowRight aria-hidden="true" size={22} strokeWidth={1.5} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </nav>
        )}
      </div>
      <p className="ed-colophon">{SAMPLE_NOTE}</p>
    </main>
  )
}

export default function Editorial() {
  const story = useStory()
  const [view, setView] = useState(params.view === 'landing' ? 'landing' : 'player')
  const { start, status } = story
  useEffect(() => {
    if (params.view !== 'landing') start({ toContradiction: params.view === 'contradiction' })
  }, [start])
  const begin = async () => {
    await start()
    window.scrollTo(0, 0)
    setView('player')
  }
  const isPlayer = view === 'player' && status === 'ready'
  return (
    <div className="ed">
      {isPlayer ? <Player story={story} onExit={() => (story.reset(), setView('landing'), window.scrollTo(0, 0))} /> : <Landing onBegin={begin} isStarting={status === 'starting'} />}
    </div>
  )
}
