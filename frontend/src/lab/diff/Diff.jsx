// Direction C, "Diff": an evidence tool. Perspectives are columns, the path is a commit
// graph, every claim carries a blame gutter, and a contradiction is a hunk.
import './diff.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { ArrowUpRight, CornerDownLeft, GitBranch, Pause, Play, Search, X } from 'lucide-react'
import useStory, { FIRST_CONTRADICTION, STATS, SOURCES, SOURCES_BY_ID, TOPIC, labParams, sentencesOf } from '../shared/useStory.js'
import { AiLabel, SAMPLE_NOTE, sourceTypeLabel, useIllustration, useKey, isTypingTarget } from '../shared/bits.jsx'
import { toneOn } from '../shared/color.js'
import useTypewriter from '../../hooks/useTypewriter.js'
import useMediaQuery from '../../hooks/useMediaQuery.js'
import { CHOICE_TYPE_LABEL } from '../../constants/labels.js'

const BG = '#0D0E10'
const LANES = Object.fromEntries(
  TOPIC.perspectives.map((p, i) => [p.perspective_id, { color: toneOn(p.color, BG, { from: 0.78, min: 7, boost: 1.7, maxC: 0.15 }), label: p.label, i }]),
)
const NEUTRAL = { color: '#B7BEC7', label: '', i: 0 }
const laneOf = (id) => LANES[id] || NEUTRAL
const params = labParams()
const isMac = /Mac|iPhone|iPad/.test(navigator.platform)

function Hunk({ c, sourcesById, onBlame, selected }) {
  const row = (s, letter) => {
    const src = sourcesById[s.source_id]
    const lane = laneOf(src?.perspective)
    const Tag = onBlame ? 'button' : 'div'
    return (
      <Tag {...(onBlame ? { type: 'button', onClick: () => onBlame(s.source_id), 'aria-pressed': selected === s.source_id } : {})} className={`df-hunk-row df-hunk-${letter.toLowerCase()}`} style={{ '--lane': lane.color }}>
        <span className="df-hunk-letter">{letter}</span>
        <span className="df-blame">{s.source_id}<span>{sourceTypeLabel(src).toLowerCase()}</span></span>
        <span className="df-hunk-text"><span className="df-hunk-who">Account {letter}, {lane.label.toLowerCase()}</span>{s.text}</span>
      </Tag>
    )
  }
  return (
    <section className="df-hunk" aria-label="Sources disagree">
      <header><span className="df-flag"><span aria-hidden="true">≠</span>Sources disagree</span><span className="df-hunk-claim">{c.claim}</span></header>
      {row(c.side_a, 'A')}
      {row(c.side_b, 'B')}
      {c.explanation && <p className="df-hunk-why"><span>Why they differ</span>{c.explanation}</p>}
    </section>
  )
}

function Landing({ onBegin, isStarting }) {
  useKey((e) => e.key === 'Enter' && !isTypingTarget(e) && e.target.tagName !== 'BUTTON' && onBegin())
  return (
    <main className="df-landing">
      <header className="df-top">
        <p className="df-brand"><GitBranch aria-hidden="true" size={16} />vantage</p>
        <p className="df-top-note">{SAMPLE_NOTE}</p>
      </header>
      <div className="df-hero">
        <h1>History has merge conflicts.</h1>
        <p className="df-sub">Vantage lays every account side by side, traces each claim to its source, and marks where the sources disagree.</p>
        <div className="df-open">
          <button type="button" className="df-btn" onClick={onBegin} disabled={isStarting} aria-busy={isStarting}>
            <span className="df-prompt" aria-hidden="true">›</span>
            {isStarting ? 'Opening the archive' : `Open ${TOPIC.title.replace(/^The /, 'the ')}`}
            <kbd aria-hidden="true"><CornerDownLeft size={14} /></kbd>
          </button>
          <p className="df-stats">{STATS.perspectives} perspectives<i>/</i>{STATS.sources} sources<i>/</i>{STATS.disagreements} conflicts</p>
        </div>
        {FIRST_CONTRADICTION && <Hunk c={FIRST_CONTRADICTION} sourcesById={SOURCES_BY_ID} />}
      </div>
    </main>
  )
}

/* The path so far as a commit graph: one lane per perspective, read from the topic. */
function Log({ segments }) {
  const ROW = 52
  const X = (id) => 14 + laneOf(id).i * 16
  const w = 14 + TOPIC.perspectives.length * 16
  return (
    <nav className="df-log" aria-label="Path so far">
      <h2>Path</h2>
      <div className="df-log-body" style={{ '--graph-w': `${w}px` }}>
        <svg width={w} height={segments.length * ROW} aria-hidden="true">
          {segments.map((s, i) => {
            if (!i) return null
            const [x1, x2, y1, y2] = [X(segments[i - 1].perspective), X(s.perspective), (i - 1) * ROW + ROW / 2, i * ROW + ROW / 2]
            return <path key={s.segment_id} className="df-edge" pathLength="1" d={`M${x1},${y1} C${x1},${y1 + ROW * 0.6} ${x2},${y2 - ROW * 0.6} ${x2},${y2}`} stroke={laneOf(s.perspective).color} />
          })}
          {segments.map((s, i) => (
            <circle key={s.segment_id} cx={X(s.perspective)} cy={i * ROW + ROW / 2} r={i === segments.length - 1 ? 5 : 4} fill={i === segments.length - 1 ? laneOf(s.perspective).color : BG} stroke={laneOf(s.perspective).color} strokeWidth="2" />
          ))}
        </svg>
        <ol>
          {segments.map((s, i) => (
            <li key={s.segment_id} style={{ height: ROW }} aria-current={i === segments.length - 1 ? 'step' : undefined}>
              <span className="df-log-title">{s.title}</span>
              <span className="df-log-meta" style={{ color: laneOf(s.perspective).color }}>{laneOf(s.perspective).label}</span>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  )
}

function Inspector({ source, claim, segments, onClose, isSheet }) {
  const closeRef = useRef(null)
  useEffect(() => {
    if (isSheet) closeRef.current?.focus({ preventScroll: true })
  }, [isSheet, source?.source_id])
  if (!source) {
    return (
      <aside className="df-inspect" aria-label="Source">
        <h2>Source</h2>
        <p className="df-empty">Select a claim to read the source behind it.</p>
      </aside>
    )
  }
  const lane = laneOf(source.perspective)
  const cited = segments.filter((s) => s.claims.some((c) => c.source_id === source.source_id))
  return (
    <aside className={`df-inspect ${isSheet ? 'is-sheet' : ''}`} aria-label="Source" role={isSheet ? 'dialog' : undefined} aria-modal={isSheet || undefined}>
      <h2>
        Source {source.source_id}
        <button ref={closeRef} type="button" className="df-x" onClick={onClose} aria-label="Close source"><X aria-hidden="true" size={16} /></button>
      </h2>
      <div className="df-inspect-body" key={source.source_id}>
        <p className="df-kv"><span>type</span>{sourceTypeLabel(source)}</p>
        <p className="df-kv"><span>voice</span><b style={{ color: lane.color }}>{lane.label}</b></p>
        <p className="df-kv"><span>from</span>{source.attribution}</p>
        <h3>{source.title}</h3>
        {claim && <p className="df-cited"><span>Cited for</span>{claim.text}</p>}
        <blockquote>{source.excerpt}</blockquote>
        <p className="df-kv"><span>used in</span>{cited.map((s) => s.title).join(', ') || 'Not cited yet'}</p>
        <a href={source.url} target="_blank" rel="noreferrer noopener">Open the original<ArrowUpRight aria-hidden="true" size={14} /></a>
        <p className="df-noimg">Sources are text only. No generated images appear here.</p>
      </div>
    </aside>
  )
}

function Palette({ items, onClose }) {
  const [q, setQ] = useState('')
  const [at, setAt] = useState(0)
  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return items.filter((it) => words.every((w) => `${it.group} ${it.label} ${it.hint || ''}`.toLowerCase().includes(w)))
  }, [q, items])
  useEffect(() => setAt(0), [q])
  const run = (it) => (onClose(), it?.run())
  return (
    <div className="df-pal-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="df-pal" role="dialog" aria-modal="true" aria-label="Jump to">
        <div className="df-pal-in">
          <Search aria-hidden="true" size={16} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Jump to a perspective, a next step, or a source"
            aria-label="Jump to"
            role="combobox"
            aria-expanded="true"
            aria-controls="df-pal-list"
            aria-activedescendant={list[at] ? `df-pal-${at}` : undefined}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') (e.preventDefault(), setAt((n) => Math.min(list.length - 1, n + 1)))
              if (e.key === 'ArrowUp') (e.preventDefault(), setAt((n) => Math.max(0, n - 1)))
              if (e.key === 'Enter') (e.preventDefault(), run(list[at]))
              if (e.key === 'Escape') onClose()
            }}
          />
          <kbd>esc</kbd>
        </div>
        <ul id="df-pal-list" role="listbox">
          {list.length === 0 && <li className="df-pal-none">Nothing matches. Try a source number or a name.</li>}
          {list.map((it, n) => (
            <li key={it.id} id={`df-pal-${n}`} role="option" aria-selected={n === at} className={n === at ? 'is-at' : ''} onMouseMove={() => setAt(n)} onClick={() => run(it)} ref={(el) => n === at && el?.scrollIntoView({ block: 'nearest' })}>
              <span className="df-pal-group">{it.group}</span>
              <span className="df-pal-label" style={it.color ? { '--lane': it.color } : undefined}>{it.color && <i aria-hidden="true" />}{it.label}</span>
              {it.hint && <span className="df-pal-hint">{it.hint}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Player({ story, onExit }) {
  const reduce = useReducedMotion()
  const isNarrow = useMediaQuery('(max-width: 1099px)')
  const { current: seg, segments, pending, isLoading, sourcesById, heard } = story
  const [isPaused, setIsPaused] = useState(false)
  const [sel, setSel] = useState(params.view === 'evidence' && seg ? { sourceId: seg.claims[0]?.source_id, claim: seg.claims[0] } : null)
  const [isPalOpen, setIsPalOpen] = useState(false)
  const lines = useMemo(() => sentencesOf(seg?.narrative_text), [seg])
  const joined = lines.join(' ')
  const { shown: typed, isDone, complete } = useTypewriter(joined, { isActive: !isPaused && !isLoading, isInstant: !!reduce || params.isInstant })
  const art = useIllustration(seg, params.isInstant)
  const prevId = useRef(seg?.segment_id)
  useEffect(() => {
    if (prevId.current !== seg?.segment_id) (prevId.current = seg?.segment_id), setSel(null), setIsPaused(false)
  }, [seg])

  useKey((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') (e.preventDefault(), setIsPalOpen((v) => !v))
    if (e.key === 'Escape' && sel && !isPalOpen) setSel(null)
  })

  const items = useMemo(() => {
    if (!seg) return []
    return [
      ...TOPIC.perspectives.filter((p) => p.perspective_id !== seg.perspective).map((p) => ({ id: `p-${p.perspective_id}`, group: 'Switch to', label: p.label, color: laneOf(p.perspective_id).color, hint: heard[p.perspective_id] ? `${heard[p.perspective_id]} read` : 'not read yet', run: () => story.shiftTo(p.perspective_id) })),
      ...(isDone ? seg.choices : []).map((c) => ({ id: `c-${c.choice_id}`, group: 'Go to', label: c.label, color: laneOf(c.perspective).color, hint: CHOICE_TYPE_LABEL[c.choice_type].toLowerCase(), run: () => story.choose(c) })),
      ...SOURCES.map((s) => ({ id: `s-${s.source_id}`, group: 'Source', label: `${s.source_id}  ${s.title}`, hint: sourceTypeLabel(s).toLowerCase(), run: () => setSel({ sourceId: s.source_id, claim: seg.claims.find((c) => c.source_id === s.source_id) || null }) })),
      { id: 'exit', group: 'File', label: 'Close this topic', run: onExit },
    ]
  }, [seg, heard, isDone, story, onExit])

  if (!seg) return null
  const lane = laneOf(seg.perspective)
  let used = 0
  const typedLines = lines.map((l) => {
    const part = typed.slice(used, used + l.length)
    used += l.length + 1
    return part
  })
  const sourceCount = new Set(seg.claims.map((c) => c.source_id)).size
  const status = pending ? `checkout ${laneOf(pending.perspective).label.toLowerCase()}` : isDone ? 'grounded' : 'reading'

  return (
    <main className="df-player" style={{ '--lane': lane.color }}>
      <header className="df-top">
        <button type="button" className="df-brand" onClick={onExit} aria-label="Vantage. Back to the start"><GitBranch aria-hidden="true" size={16} />vantage</button>
        <p className="df-crumb"><span>{TOPIC.topic_id}</span><i>/</i><span style={{ color: lane.color }}>{lane.label.toLowerCase()}</span></p>
        <button type="button" className="df-jump" onClick={() => setIsPalOpen(true)} aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}>
          <Search aria-hidden="true" size={14} /><span>Jump to</span><kbd>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
        </button>
      </header>

      <Log segments={segments} />

      <div className="df-cols" role="tablist" aria-label="Point of view">
        {TOPIC.perspectives.map((p) => {
          const isOn = p.perspective_id === seg.perspective
          const l = laneOf(p.perspective_id)
          const isWaiting = pending?.perspective === p.perspective_id && !isOn
          return (
            <div key={p.perspective_id} className={`df-col ${isOn ? 'is-on' : ''}`} style={{ '--lane': l.color }}>
              <button type="button" role="tab" aria-selected={isOn} aria-busy={isWaiting} disabled={isLoading && !isOn} className={`df-col-tab ${isWaiting ? 'is-waiting' : ''}`} onClick={() => !isOn && story.shiftTo(p.perspective_id)}>
                <i aria-hidden="true" />
                <span>{p.label}</span>
                <small>{heard[p.perspective_id] || 0}</small>
              </button>
              {isOn && (
                <article key={seg.segment_id} className="df-file" aria-labelledby="df-title">
                  <header className="df-file-head">
                    <h1 id="df-title">{seg.title}</h1>
                    <p>{seg.date_label}</p>
                  </header>
                  <figure className="df-fig">
                    <img src={art.url} alt={art.isReady ? `Illustration: ${seg.title}` : ''} className={art.isReady ? 'is-ready' : ''} />
                    <figcaption>{art.isReady ? <AiLabel kind="image" /> : <span role="status">rendering illustration</span>}</figcaption>
                  </figure>

                  <div className="df-block-head">
                    <h2>Narration</h2>
                    <button type="button" className="df-x" onClick={() => setIsPaused((v) => !v)} disabled={isDone} aria-label={isPaused ? 'Play narration' : 'Pause narration'}>
                      {isPaused ? <Play aria-hidden="true" size={14} /> : <Pause aria-hidden="true" size={14} />}
                    </button>
                    <AiLabel kind="voice" />
                  </div>
                  <p className="sr-only-live" aria-live="polite">{joined}</p>
                  <ol className="df-lines" aria-hidden="true" onClick={complete}>
                    {lines.map((l, n) => (
                      <li key={n} style={{ '--i': n }} className={typedLines[n] ? '' : 'is-blank'}>
                        <span className="df-ln">{n + 1}</span>
                        <span>{typedLines[n]}{typedLines[n].length < l.length && typedLines[n].length > 0 && <span className="caret df-caret" />}<span className="df-ghost">{l.slice(typedLines[n].length)}</span></span>
                      </li>
                    ))}
                  </ol>

                  <div className="df-block-head">
                    <h2>How this was grounded</h2>
                    <p>{seg.claims.length} claims, {sourceCount} {sourceCount === 1 ? 'source' : 'sources'}</p>
                  </div>
                  <ul className="df-claims">
                    {seg.claims.map((c, n) => {
                      const s = sourcesById[c.source_id]
                      const isSel = sel?.claim?.claim_id === c.claim_id
                      return (
                        <li key={c.claim_id} style={{ '--i': lines.length + n }}>
                          <button type="button" className={`df-claim ${isSel ? 'is-sel' : ''}`} aria-pressed={isSel} onClick={() => setSel(isSel ? null : { sourceId: c.source_id, claim: c })} style={{ '--lane': laneOf(s?.perspective).color }}>
                            <span className="df-blame">{c.source_id}<span>{sourceTypeLabel(s).toLowerCase()}</span></span>
                            <span className="df-claim-text">{c.text}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>

                  {isDone && seg.contradiction && (
                    <Hunk c={seg.contradiction} sourcesById={sourcesById} selected={sel?.sourceId} onBlame={(id) => setSel({ sourceId: id, claim: seg.claims.find((c) => c.source_id === id) || null })} />
                  )}

                  {isDone && (
                    <>
                      <div className="df-block-head"><h2>Next</h2></div>
                      {seg.is_final ? (
                        <p className="df-end">End of this thread. <button type="button" className="df-link" onClick={onExit}>Close the topic</button></p>
                      ) : (
                        <ul className="df-next">
                          {seg.choices.map((ch) => {
                            const isBusy = pending?.choiceId === ch.choice_id
                            return (
                              <li key={ch.choice_id}>
                                <button type="button" className="df-branch" onClick={() => story.choose(ch)} disabled={isLoading} aria-busy={isBusy} style={{ '--lane': laneOf(ch.perspective).color }}>
                                  <GitBranch aria-hidden="true" size={14} />
                                  <span className="df-branch-label">{ch.label}</span>
                                  <span className="df-branch-meta">{isBusy ? 'loading' : `${CHOICE_TYPE_LABEL[ch.choice_type].toLowerCase()} · ${laneOf(ch.perspective).label.toLowerCase()}`}</span>
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </>
                  )}
                </article>
              )}
            </div>
          )
        })}
      </div>

      {(!isNarrow || sel) && (
        <>
          {isNarrow && <div className="df-scrim" onClick={() => setSel(null)} aria-hidden="true" />}
          <Inspector source={sel ? sourcesById[sel.sourceId] : null} claim={sel?.claim} segments={segments} onClose={() => setSel(null)} isSheet={isNarrow} />
        </>
      )}

      <footer className="df-status" role="status">
        <span className="df-status-lane"><i aria-hidden="true" />{status}</span>
        <span>{seg.claims.length} claims</span>
        <span>{sourceCount} sources</span>
        {seg.contradiction && <span className="df-status-conflict"><b aria-hidden="true">≠</b>1 conflict</span>}
        <span className="df-status-note">{SAMPLE_NOTE}</span>
      </footer>

      {isPalOpen && <Palette items={items} onClose={() => setIsPalOpen(false)} />}
    </main>
  )
}

export default function Diff() {
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
    <div className="df">
      {isPlayer ? <Player story={story} onExit={() => (story.reset(), setView('landing'))} /> : <Landing onBegin={begin} isStarting={status === 'starting'} />}
    </div>
  )
}
