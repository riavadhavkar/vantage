// Direction D, "Stories": full-screen cards. Tap to advance, swipe to change sides,
// one color block per perspective, source chips as stickers, any card saved as an image.
import '@fontsource-variable/bricolage-grotesque/wdth.css'
import './stories.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, ArrowUpRight, Download, FileText, Pause, Play, X } from 'lucide-react'
import useStory, { ACCOUNTS, STATS, TOPIC, labParams, sentencesOf } from '../shared/useStory.js'
import { AI_COPY, AiLabel, SAMPLE_NOTE, sourceTypeLabel, useIllustration, useKey, isTypingTarget, tick } from '../shared/bits.jsx'
import { tone } from '../shared/color.js'
import useMediaQuery from '../../hooks/useMediaQuery.js'
import { CHOICE_TYPE_LABEL } from '../../constants/labels.js'

const INK = '#121212'
const BLOCKS = Object.fromEntries(
  TOPIC.perspectives.map((p, i) => [p.perspective_id, { block: tone(p.color, 0.8, { boost: 2.6, maxC: 0.15 }), deep: tone(p.color, 0.3, { boost: 2, maxC: 0.09 }), label: p.label, i }]),
)
const NEUTRAL = { block: '#D8D4CA', deep: '#3A3A38', label: '', i: 0 }
const blockOf = (id) => BLOCKS[id] || NEUTRAL
const params = labParams()
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']

function cardsFor(seg) {
  const cards = [{ kind: 'cover' }, ...sentencesOf(seg.narrative_text).map((text) => ({ kind: 'line', text }))]
  if (seg.contradiction) cards.push({ kind: 'split' }, { kind: 'why' })
  cards.push({ kind: 'next' })
  return cards
}
const holdMs = (card) => (card.kind === 'cover' ? 2400 : card.kind === 'line' ? 1100 + card.text.split(/\s+/).length * 250 : 0)

/* Any text card as a 1080 x 1920 image, drawn on a canvas. No network, no libraries. */
async function saveCard({ text, label, block, sources }) {
  await document.fonts?.ready
  const c = Object.assign(document.createElement('canvas'), { width: 1080, height: 1920 })
  const x = c.getContext('2d')
  x.fillStyle = block
  x.fillRect(0, 0, 1080, 1920)
  x.fillStyle = INK
  x.textBaseline = 'top'
  x.font = '700 40px "Bricolage Grotesque Variable", sans-serif'
  x.fillText(label, 88, 120)
  x.font = '800 92px "Bricolage Grotesque Variable", sans-serif'
  let line = ''
  let y = 420
  for (const w of text.split(/\s+/)) {
    if (x.measureText(`${line} ${w}`).width > 900 && line) {
      x.fillText(line, 88, y)
      y += 100
      line = w
    } else line = line ? `${line} ${w}` : w
  }
  x.fillText(line, 88, y)
  x.font = '500 34px "Bricolage Grotesque Variable", sans-serif'
  x.fillText(`Grounded in: ${sources}`.slice(0, 58), 88, 1650)
  x.fillText(`${AI_COPY.voice}. ${SAMPLE_NOTE}.`, 88, 1700)
  x.font = '800 48px "Bricolage Grotesque Variable", sans-serif'
  x.fillText('Vantage', 88, 1780)
  const a = Object.assign(document.createElement('a'), { download: 'vantage-card.png', href: c.toDataURL('image/png') })
  a.click()
}

function Landing({ onBegin, isStarting }) {
  const [front, setFront] = useState(0)
  const n = ACCOUNTS.length
  return (
    <main className="st-landing">
      <header className="st-top">
        <p className="st-brand">Vantage</p>
        <p className="st-note">{SAMPLE_NOTE}</p>
      </header>
      <div className="st-hero">
        <div className="st-pitch">
          <h1>{WORDS[STATS.perspectives] || STATS.perspectives} sides. One story.</h1>
          <p className="st-sub">{TOPIC.title}, told by everyone who was there. Tap through it, swipe to change sides, and check every claim against its source.</p>
          <button type="button" className="st-btn" onClick={onBegin} disabled={isStarting} aria-busy={isStarting}>
            {isStarting ? 'Opening the archive' : 'Start the story'}
            <ArrowRight aria-hidden="true" size={22} strokeWidth={2.5} />
          </button>
          <p className="st-stats">{STATS.sources} sources · {STATS.disagreements} disagreements · AI images and voices are labeled</p>
        </div>
        <ul className="st-fan" aria-label="The same story, by account">
          {ACCOUNTS.map((a, i) => {
            const k = (i - front + n) % n
            return (
              <li key={a.perspective.perspective_id} className={k === 0 ? 'is-front' : ''} style={{ '--k': k, '--block': blockOf(a.perspective.perspective_id).block, zIndex: n - k }}>
                <button type="button" onClick={() => (tick(), setFront(k === 0 ? (i + 1) % n : i))} aria-label={`${a.perspective.label}: ${a.lead}`} tabIndex={k === 0 ? 0 : -1}>
                  <span className="st-sticker">{a.perspective.label}</span>
                  <span className="st-fan-text">{a.lead}</span>
                  <span className="st-fan-foot">{a.segment.date_label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </main>
  )
}

function Grounding({ seg, sourcesById, openId, setOpenId }) {
  return (
    <ol className="st-ground">
      {seg.claims.map((c) => {
        const s = sourcesById[c.source_id]
        const isOpen = openId === c.claim_id
        return (
          <li key={c.claim_id}>
            <p>{c.text}</p>
            <button type="button" className="st-chip" aria-expanded={isOpen} onClick={() => setOpenId(isOpen ? null : c.claim_id)} style={{ '--block': blockOf(s?.perspective).block }}>
              <FileText aria-hidden="true" size={14} />{sourceTypeLabel(s)} · {s?.attribution}
            </button>
            {isOpen && (
              <div className="st-source">
                <h3>{s.title}</h3>
                <blockquote>{s.excerpt}</blockquote>
                <a href={s.url} target="_blank" rel="noreferrer noopener">Open the original<ArrowUpRight aria-hidden="true" size={14} /></a>
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function Player({ story, onExit }) {
  const reduce = useReducedMotion()
  const isWide = useMediaQuery('(min-width: 1000px)')
  const { current: seg, segments, pending, isLoading, sourcesById } = story
  const cards = useMemo(() => (seg ? cardsFor(seg) : []), [seg])
  const startAt = () => (params.isInstant ? (params.view === 'contradiction' ? Math.max(0, cards.findIndex((c) => c.kind === 'split')) : 1) : 0)
  const [at, setAt] = useState(startAt)
  const [isPaused, setIsPaused] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(params.view === 'evidence')
  const [openId, setOpenId] = useState(params.view === 'evidence' ? seg?.claims[0]?.claim_id : null)
  const [dir, setDir] = useState(1)
  const [toast, setToast] = useState('')
  const art = useIllustration(seg, params.isInstant)
  const segId = useRef(seg?.segment_id)
  useEffect(() => {
    if (segId.current !== seg?.segment_id) (segId.current = seg?.segment_id), setAt(0), setOpenId(null), setIsPaused(false)
  }, [seg])

  const card = cards[Math.min(at, cards.length - 1)]
  const here = blockOf(seg?.perspective)
  const isAuto = !reduce && !params.isInstant && !isPaused && !isLoading && !isSheetOpen && card && holdMs(card) > 0
  const next = useCallback(() => setAt((n) => Math.min(cards.length - 1, n + 1)), [cards.length])
  const back = () => setAt((n) => Math.max(0, n - 1))

  const shift = useCallback(
    (d) => {
      if (isLoading || !seg) return
      const list = TOPIC.perspectives
      const target = list[(here.i + d + list.length) % list.length]
      tick()
      setDir(d)
      story.shiftTo(target.perspective_id)
    },
    [isLoading, seg, here.i, story],
  )
  const pick = (id) => {
    if (isLoading || id === seg.perspective) return
    tick()
    setDir(blockOf(id).i > here.i ? 1 : -1)
    story.shiftTo(id)
  }
  const choose = (ch) => {
    setDir(1)
    if (ch.perspective !== seg.perspective) tick()
    story.choose(ch)
  }

  useKey((e) => {
    if (isTypingTarget(e) || isSheetOpen) return e.key === 'Escape' && setIsSheetOpen(false)
    if (e.key === 'ArrowRight') next()
    if (e.key === 'ArrowLeft') back()
    if (e.key === 'ArrowDown') (e.preventDefault(), shift(1))
    if (e.key === 'ArrowUp') (e.preventDefault(), shift(-1))
  })

  // Swipe sideways to change sides. A swipe must not also count as a tap.
  const drag = useRef(null)
  const swiped = useRef(false)
  const onDown = (e) => (drag.current = { x: e.clientX, y: e.clientY })
  const onUp = (e) => {
    if (!drag.current) return
    const [dx, dy] = [e.clientX - drag.current.x, e.clientY - drag.current.y]
    drag.current = null
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiped.current = true
      setTimeout(() => (swiped.current = false), 50)
      shift(dx < 0 ? 1 : -1)
    }
  }
  const tap = (fn) => () => !swiped.current && fn()

  if (!seg || !card) return null
  const sourceIds = [...new Set(seg.claims.map((c) => c.source_id))]
  const c = seg.contradiction
  const sideOf = (s) => ({ ...s, src: sourcesById[s.source_id], look: blockOf(sourcesById[s.source_id]?.perspective) })
  const share = async () => {
    const text = card.kind === 'line' ? card.text : card.kind === 'why' ? c.explanation : seg.title
    await saveCard({ text, label: here.label, block: here.block, sources: sourceIds.map((id) => sourcesById[id]?.attribution).join(', ') })
    setToast('Card saved as an image')
    setTimeout(() => setToast(''), 2400)
  }
  const openSources = () => (isWide ? document.querySelector('.st-rail-sources')?.focus() : setIsSheetOpen(true))

  return (
    <main className="st-player" style={{ '--block': here.block, '--deep': here.deep }}>
      <header className="st-top">
        <button type="button" className="st-brand" onClick={onExit} aria-label="Vantage. Back to the start">Vantage</button>
        <p className="st-note">{SAMPLE_NOTE}</p>
      </header>

      {isWide && (
        <nav className="st-rail st-rail-path" aria-label="Path so far">
          <h2>Your path</h2>
          <ol>
            {segments.map((s, i) => (
              <li key={s.segment_id} style={{ '--block': blockOf(s.perspective).block }} aria-current={i === segments.length - 1 ? 'step' : undefined}>
                <span>{s.title}</span>
                <small>{blockOf(s.perspective).label}</small>
              </li>
            ))}
          </ol>
          <p className="st-keys">Arrow left and right move through cards. Arrow up and down change sides.</p>
        </nav>
      )}

      <div className="st-phone" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => (drag.current = null)}>
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.section
            key={seg.segment_id}
            className={`st-card st-card-${card.kind}`}
            aria-label={`${seg.title}, ${here.label}`}
            style={{ '--block': here.block }}
            custom={dir}
            variants={{
              enter: (d) => (reduce ? { opacity: 0 } : { x: `${d * 105}%`, rotate: d * 5 }),
              center: { x: 0, rotate: 0, opacity: 1, transition: reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 240, damping: 27, mass: 0.9 } },
              exit: (d) => (reduce ? { opacity: 0 } : { x: `${d * -105}%`, rotate: d * -5, transition: { duration: 0.32, ease: [0.5, 0, 0.8, 0.4] } }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <ol className="st-bars" aria-label={`Card ${at + 1} of ${cards.length}`}>
              {cards.map((_, i) => (
                <li key={i} className={i < at ? 'is-done' : i === at ? 'is-on' : ''}>
                  {i === at && isAuto && <span key={`${seg.segment_id}-${at}`} style={{ animationDuration: `${holdMs(card)}ms` }} onAnimationEnd={next} />}
                </li>
              ))}
            </ol>
            <div className="st-head">
              <span className="st-sticker">{here.label}</span>
              <span className="st-date">{seg.date_label}</span>
            </div>

            <div className="st-face" key={at}>
              {card.kind === 'cover' && (
                <>
                  <div className={`st-art ${art.isReady ? 'is-ready' : ''}`}><img src={art.url} alt={art.isReady ? `Illustration: ${seg.title}` : ''} /></div>
                  {art.isReady ? <AiLabel kind="image" className="st-ai" /> : <p className="st-ai" role="status">Drawing the scene</p>}
                  <h1 className="st-title">{seg.title}</h1>
                </>
              )}
              {card.kind === 'line' && (
                <p className="st-line">
                  {card.text.split(/\s+/).map((w, i) => <span key={i} style={{ '--i': i }}>{w} </span>)}
                </p>
              )}
              {card.kind === 'split' && (
                <section className="st-split" aria-label="Sources disagree">
                  {[sideOf(c.side_a), sideOf(c.side_b)].map((s, i) => (
                    <div key={i} className="st-half" style={{ '--block': s.look.block }}>
                      <p className="st-half-who">{i ? 'Another account' : 'One account'} · {s.look.label}</p>
                      <p className="st-half-text">{s.text}</p>
                      <p className="st-half-src">{sourceTypeLabel(s.src)} · {s.src?.attribution}</p>
                    </div>
                  ))}
                  <div className="st-seam">
                    <p className="st-flag"><span aria-hidden="true">≠</span>Sources disagree</p>
                    <p className="st-claim">{c.claim}</p>
                  </div>
                </section>
              )}
              {card.kind === 'why' && (
                <div className="st-why">
                  <p className="st-flag"><span aria-hidden="true">≠</span>Why they differ</p>
                  <p>{c.explanation}</p>
                </div>
              )}
              {card.kind === 'next' && (
                <div className="st-nextcard">
                  {seg.is_final ? (
                    <>
                      <h2>That is the whole thread.</h2>
                      <button type="button" className="st-go" onClick={onExit} style={{ '--block': '#fff' }}><span>Start again</span></button>
                    </>
                  ) : (
                    <>
                      <h2>Where next?</h2>
                      <ul>
                        {seg.choices.map((ch) => {
                          const isBusy = pending?.choiceId === ch.choice_id
                          return (
                            <li key={ch.choice_id}>
                              <button type="button" className="st-go" onClick={() => choose(ch)} disabled={isLoading} aria-busy={isBusy} style={{ '--block': blockOf(ch.perspective).block }}>
                                <span>{ch.label}</span>
                                <small>{isBusy ? 'Loading' : `${CHOICE_TYPE_LABEL[ch.choice_type]} · ${blockOf(ch.perspective).label}`}</small>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>
            <p className="sr-only-live" aria-live="polite">{card.kind === 'line' ? card.text : card.kind === 'why' ? c.explanation : ''}</p>

            {card.kind !== 'next' && (
              <>
                <button type="button" className="st-zone st-zone-back" onClick={tap(back)} aria-label="Previous card" disabled={at === 0} />
                <button type="button" className="st-zone st-zone-next" onClick={tap(next)} aria-label="Next card" />
              </>
            )}

            <div className="st-tools">
              <button type="button" className="st-chip st-chip-tilt" onClick={openSources}><FileText aria-hidden="true" size={14} />{sourceIds.length} {sourceIds.length === 1 ? 'source' : 'sources'}</button>
              <span className="st-tools-gap" />
              <AiLabel kind="voice" />
              <button type="button" className="st-round" onClick={() => setIsPaused((v) => !v)} aria-label={isPaused ? 'Play narration' : 'Pause narration'}>
                {isPaused ? <Play aria-hidden="true" size={18} /> : <Pause aria-hidden="true" size={18} />}
              </button>
              <button type="button" className="st-round" onClick={share} aria-label="Save this card as an image" disabled={card.kind === 'split' || card.kind === 'next'}><Download aria-hidden="true" size={18} /></button>
            </div>
          </motion.section>
        </AnimatePresence>

        <div className="st-sides" role="radiogroup" aria-label="Point of view">
          {TOPIC.perspectives.map((p) => {
            const isOn = p.perspective_id === seg.perspective
            const isWaiting = pending?.perspective === p.perspective_id && !isOn
            return (
              <button key={p.perspective_id} type="button" role="radio" aria-checked={isOn} aria-busy={isWaiting} disabled={isLoading && !isOn} onClick={() => pick(p.perspective_id)} className={`st-side ${isOn ? 'is-on' : ''} ${isWaiting ? 'is-waiting' : ''}`} style={{ '--block': blockOf(p.perspective_id).block }}>
                <i aria-hidden="true" />{p.label}
              </button>
            )
          })}
        </div>
        {toast && <p className="st-toast" role="status">{toast}</p>}

        {!isWide && isSheetOpen && (
          <>
            <div className="st-scrim" onClick={() => setIsSheetOpen(false)} aria-hidden="true" />
            <aside className="st-sheet" role="dialog" aria-modal="true" aria-label="How this was grounded">
              <header><h2>How this was grounded</h2><button type="button" autoFocus className="st-round" onClick={() => setIsSheetOpen(false)} aria-label="Close"><X aria-hidden="true" size={18} /></button></header>
              <Grounding seg={seg} sourcesById={sourcesById} openId={openId} setOpenId={setOpenId} />
              <p className="st-fine">Sources are text only. No generated images appear here.</p>
            </aside>
          </>
        )}
      </div>

      {isWide && (
        <aside className="st-rail st-rail-sources" aria-label="How this was grounded" tabIndex={-1}>
          <h2>How this was grounded</h2>
          <Grounding seg={seg} sourcesById={sourcesById} openId={openId} setOpenId={setOpenId} />
          <p className="st-fine">Sources are text only. No generated images appear here.</p>
        </aside>
      )}
    </main>
  )
}

export default function Stories() {
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
    <div className="st">
      {isPlayer ? <Player story={story} onExit={() => (story.reset(), setView('landing'))} /> : <Landing onBegin={begin} isStarting={status === 'starting'} />}
    </div>
  )
}
