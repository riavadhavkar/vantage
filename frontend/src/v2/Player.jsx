// The new player: a full-bleed stage with the story on glass over it, and a lens ring that
// decides who is telling it. Data and actions come from usePlayer (same calls as classic).
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useTransform } from 'motion/react'
import { Aperture, FileText, Map as MapIcon, Maximize2, Minimize2, Search, Share2, Volume2, VolumeX, Waypoints } from 'lucide-react'
import usePlayer from './usePlayer.js'
import Frame from './Frame.jsx'
import Captions from './Captions.jsx'
import LensRing from './LensRing.jsx'
import Choices from './Choices.jsx'
import Evidence from './Evidence.jsx'
import Disagreement from './Disagreement.jsx'
import VoiceInputButton from '../components/VoiceInputButton.jsx'
import ContinueOnPhone from '../components/ContinueOnPhone.jsx'
import AmbientPlayer from '../components/AmbientPlayer.jsx'
import { messageFor } from '../api/errors.js'
import { DURATION, EASING, SPRING } from '../constants/theme.js'
import { sec, spring } from '../lib/motionMode.js'
import { Btn, DataBadge, IconBtn, Kbd, Sheet, Skeleton, Waiting } from './ui.jsx'
import { sourceLabel } from './labels.js'
import { CHOICE_TYPE_LABEL } from '../constants/labels.js'
import './player.css'

// The graph and the map load on demand.
const Graph = lazy(() => import('./Graph.jsx'))
const TravelMap = lazy(() => import('./TravelMap.jsx'))
const ShareCard = lazy(() => import('./ShareCard.jsx'))
const Palette = lazy(() => import('./Palette.jsx'))
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export default function Player({ session, topic, isSoundOn, onToggleSound, onExit, dataSource, shouldReveal = false }) {
  const P = usePlayer({ session, topic, isSoundOn })
  const { shown, pull, look, lookOf, isCalm, isLoading, pending } = P
  // Which scene has finished narrating. Keyed by scene, so an instant typewriter (reduced motion)
  // cannot be reset by a later effect, and a new scene never inherits "finished" from the last one.
  const [typedId, setTypedId] = useState(null)
  const shownId = shown?.segment_id
  const setIsTyped = useCallback((done) => setTypedId((id) => (done ? shownId : id === shownId ? null : id)), [shownId])
  const isTyped = typedId != null && typedId === shownId
  const isPulling = pull.phase !== 'idle'
  const textOpacity = useTransform(pull.soft, (s) => 1 - 0.65 * s)

  // While the frame itself is changing, glass panels stop blurring what is behind them. Backdrop
  // blur over a moving full-screen layer is the most expensive thing on this page, and behind a
  // frame that is already soft or crossfading it is not visible anyway.
  const [isSettling, setIsSettling] = useState(false)
  useEffect(() => {
    setIsSettling(true)
    const t = setTimeout(() => setIsSettling(false), 900)
    return () => clearTimeout(t)
  }, [shownId])
  const isMoving = isPulling || isLoading || isSettling

  // Row 21: the chosen row's dot grows into a wash over the frame.
  const [wash, setWash] = useState(null)
  const choose = useCallback(
    (choice, dot) => {
      const r = dot?.getBoundingClientRect()
      if (r && !isCalm) setWash({ id: choice.choice_id, x: r.left + r.width / 2, y: r.top + r.height / 2, color: lookOf(choice.perspective).accent })
      P.doChoose(choice)
    },
    [P, isCalm, lookOf],
  )

  // Evidence: which source to open, and (row 26) the chip that travels from the card to the paper.
  const [evidence, setEvidence] = useState(null)
  const [ghost, setGhost] = useState(null)
  const openEvidence = useCallback(
    (sourceId, claim, el) => {
      const fromChip = !!el?.classList?.contains('v2-pin') && !isCalm
      if (fromChip) {
        const r = el.getBoundingClientRect()
        setGhost({ label: el.textContent, from: { x: r.left, y: r.top }, to: null })
      }
      setEvidence({ sourceId: sourceId || null, claim: claim || null, fromChip })
    },
    [isCalm],
  )
  const landGhost = useCallback((to) => setGhost((g) => (g && to ? { ...g, to } : null)), [])
  const closeEvidence = useCallback(() => (setEvidence(null), setGhost(null)), [])
  useEffect(() => closeEvidence(), [shown?.segment_id, closeEvidence])

  // Graph and map sheets
  const [panel, setPanel] = useState(null) // 'graph' | 'map' | null
  const [isFull, setIsFull] = useState(false)
  const { setIsGraphOpen } = P
  useEffect(() => setIsGraphOpen(panel === 'graph'), [panel, setIsGraphOpen])
  const closePanel = useCallback(() => (setPanel(null), setIsFull(false)), [])
  // From the graph: reopen an earlier scene (or come back to the current one).
  const { viewScene } = P
  const lookBack = useCallback(
    (id) => {
      viewScene(id)
      setPanel(null)
      setIsFull(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [viewScene],
  )
  const [isAmbientOn, setIsAmbientOn] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const closeShare = useCallback(() => setIsSharing(false), [])
  const shareStats = useMemo(
    () => [
      { label: 'points of view heard', value: Object.keys(P.heard).length },
      { label: 'sources cited', value: P.citedCount },
      { label: 'disagreements seen', value: P.segments.filter((x) => x.contradiction).length },
    ],
    [P.heard, P.citedCount, P.segments],
  )
  const shareSummary = useMemo(() => {
    const [h, c, d] = shareStats.map((x) => x.value)
    const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
    return `Heard ${h} of ${plural(P.perspectives.length, 'point of view', 'points of view')}  ·  ${plural(c, 'source', 'sources')} cited${d ? `  ·  ${plural(d, 'disagreement', 'disagreements')}` : ''}`
  }, [shareStats, P.perspectives.length])

  const [question, setQuestion] = useState('')
  const submitQuestion = (e) => {
    e.preventDefault()
    const q = question.trim()
    if (!q || isLoading) return
    setQuestion('')
    P.doAsk(q)
  }

  // Cmd+K / Ctrl+K
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const closePalette = useCallback(() => setIsPaletteOpen(false), [])

  if (!shown) return null
  const showNext = isTyped && P.isCurrentShown && !isPulling
  // A contradiction splits the frame: each half takes the grade of the account on that side.
  const dis = showNext && shown.is_grounded ? shown.contradiction : null
  const sideLook = (side) => lookOf(P.sourcesById[side.source_id]?.perspective)
  const waitingView = pending?.perspective && isPulling ? lookOf(pending.perspective).label : null
  const paletteItems = !isPaletteOpen
    ? []
    : [
        ...(isLoading || isPulling || P.isLookingBack ? [] : P.perspectives.filter((p) => p.perspective_id !== shown.perspective)).map((p) => ({
          id: `p-${p.perspective_id}`,
          group: 'Switch to',
          label: p.label,
          color: lookOf(p.perspective_id).accent,
          hint: P.heard[p.perspective_id] ? `heard ${P.heard[p.perspective_id]}` : 'not heard yet',
          run: () => P.selectPerspective(p.perspective_id),
        })),
        ...(showNext && !isLoading && shown.is_grounded && !shown.is_final ? shown.choices : []).map((c) => ({
          id: `c-${c.choice_id}`,
          group: 'Go to',
          label: c.label,
          color: lookOf(c.perspective).accent,
          hint: (CHOICE_TYPE_LABEL[c.choice_type] || '').toLowerCase(),
          run: () => P.doChoose(c),
        })),
        { id: 't-sources', group: 'Open', label: 'How this was grounded', hint: 'sources', run: () => openEvidence() },
        { id: 't-graph', group: 'Open', label: 'How the story connects', hint: 'graph', run: () => setPanel('graph') },
        { id: 't-map', group: 'Open', label: 'Where this happened', hint: 'map', run: () => setPanel('map') },
        ...(shown.is_grounded ? [{ id: 't-share', group: 'Open', label: 'Share this moment', hint: 'image', run: () => setIsSharing(true) }] : []),
        ...P.sources
          .filter((src) => P.segments.some((seg) => seg.source_ids?.includes(src.source_id) || seg.claims?.some((c) => c.source_id === src.source_id)))
          .map((src) => ({
            id: `s-${src.source_id}`,
            group: 'Source',
            label: src.title,
            hint: sourceLabel(src).toLowerCase(),
            run: () => openEvidence(src.source_id, shown.claims.find((c) => c.source_id === src.source_id)),
          })),
        { id: 't-sound', group: 'Sound', label: isSoundOn ? 'Turn sound off' : 'Turn sound on', run: onToggleSound },
        { id: 't-exit', group: 'Story', label: 'Start a new topic', run: onExit },
      ]

  // The ring turns as soon as a view is asked for and keeps its target until the frame has caught up,
  // so it travels once: from the request to the moment the new scene is sharp.
  const known = (id) => (id && P.perspectives.some((p) => p.perspective_id === id) ? id : null)
  const ringTarget = known(pending?.perspective) || known(session.currentSegment?.perspective) || shown.perspective

  return (
    <main className={`v2-player ${shouldReveal && !isCalm ? 'v2-reveal' : ''} ${isMoving ? 'is-moving' : ''}`} style={{ '--accent': look.accent }}>
      <Frame segment={shown} look={dis ? sideLook(dis.side_a) : look} splitLook={dis ? sideLook(dis.side_b) : null} imageUrl={P.narration.imageUrl} imageUrls={P.narration.imageUrls} imageStatus={P.narration.imageStatus} soft={pull.soft} isPulling={isPulling} isCalm={isCalm} isPaused={!!evidence || !!panel || isSharing} isUngrounded={!shown.is_grounded}>
        {shown.date_label && shown.is_grounded && !isPulling && (
          <p key={shown.segment_id} className="v2-titlecard" aria-hidden="true"><span>{shown.date_label}</span></p>
        )}
        {waitingView && (
          <div className="v2-stage-status">
            <Waiting message={`Finding ${waitingView.replace(/^The /, 'the ')}`} slowMessage="Still writing this view from the sources. It can take a few seconds." />
          </div>
        )}
      </Frame>

      <header className="v2-bar">
        <button type="button" className="v2-brand" onClick={onExit} aria-label="Vantage. Start a new topic">
          <Aperture aria-hidden="true" size={20} strokeWidth={1.6} />
          Vantage
        </button>
        <p className="v2-bar-topic">{P.topic?.title}</p>
        <span className="v2-bar-gap" />
        <DataBadge source={dataSource} />
        <button type="button" className="v2-jump" onClick={() => setIsPaletteOpen(true)} aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}>
          <Search aria-hidden="true" size={14} strokeWidth={1.8} />
          Jump to
          <Kbd>{isMac ? '⌘K' : 'Ctrl K'}</Kbd>
        </button>
        <IconBtn label="How the story connects" icon={Waypoints} isPressed={panel === 'graph'} onClick={() => setPanel('graph')} />
        <IconBtn label="Where this happened" icon={MapIcon} isPressed={panel === 'map'} onClick={() => setPanel('map')} />
        {shown.is_grounded && <IconBtn label="Share this moment" icon={Share2} isPressed={isSharing} onClick={() => setIsSharing(true)} />}
        <IconBtn label="Sources" icon={FileText} badge={P.citedCount || null} isPressed={!!evidence} onClick={() => openEvidence()} />
        <span className="v2-ambient"><AmbientPlayer mood={shown.mood} isOn={isAmbientOn} onToggle={() => setIsAmbientOn((v) => !v)} /></span>
        <IconBtn label={isSoundOn ? 'Sound on' : 'Sound off'} icon={isSoundOn ? Volume2 : VolumeX} isPressed={isSoundOn} onClick={onToggleSound} tip="left" />
      </header>

      <div className="v2-body">
        <Captions
          key={shown.segment_id}
          segment={shown}
          isActive={!isPulling}
          isCalm={isCalm}
          narration={P.narration}
          sourcesById={P.sourcesById}
          lookOf={lookOf}
          textOpacity={textOpacity}
          onTyped={setIsTyped}
          onOpenEvidence={openEvidence}
          onRecover={P.recover}
        />

        <motion.div className="v2-side" style={{ opacity: textOpacity }}>
          {P.isLookingBack && !isPulling && (
            <div className="v2-glass v2-back" role="status">
              <p>You are looking back at an earlier scene.</p>
              <Btn variant="quiet" onClick={() => viewScene(null)}>Return to where you were</Btn>
            </div>
          )}
          {P.error && (
            <div role="alert" className="v2-glass v2-note v2-error">
              <p>{messageFor(P.error)}</p>
              {P.error.code === 'session_not_found' ? <Btn variant="quiet" onClick={onExit}>Start again</Btn> : <Btn variant="quiet" onClick={P.retry}>Try again</Btn>}
            </div>
          )}
          {pending?.kind === 'ask' && !pending.perspective && (
            <div className="v2-glass v2-asking">
              <Waiting message="Looking through the sources" slowMessage="Still looking. Answers are written from the sources, which can take a few seconds." />
            </div>
          )}
          {dis && <Disagreement key={dis.contradiction_id || shown.segment_id} contradiction={dis} sourcesById={P.sourcesById} lookOf={lookOf} onOpenEvidence={(id) => openEvidence(id, shown.claims.find((c) => c.source_id === id))} isCalm={isCalm} />}
          {showNext &&
            (shown.is_final ? (
              <div className="v2-glass v2-end">
                <p>This thread ends here.</p>
                <p>Hear the same story from another side, or start again.</p>
                <div className="v2-end-actions">
                  <Btn variant="quiet" onClick={P.recover} disabled={isLoading}>Try another point of view</Btn>
                  <Btn variant="ghost" onClick={onExit}>Start a new topic</Btn>
                </div>
              </div>
            ) : (
              <Choices key={shown.segment_id} choices={shown.is_grounded ? shown.choices : []} lookOf={lookOf} onChoose={choose} isBusy={isLoading} pendingChoiceId={pending?.choiceId} isCalm={isCalm} />
            ))}
          {showNext && (
            <form className="v2-glass v2-ask" onSubmit={submitQuestion}>
              <label htmlFor="v2-ask" className="v2-sr">Ask a question about this moment</label>
              <input id="v2-ask" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about this moment" autoComplete="off" />
              <VoiceInputButton onTranscript={setQuestion} isDisabled={isLoading} />
              <Btn type="submit" variant="ghost" disabled={!question.trim() || isLoading} isLoading={pending?.kind === 'ask' && !pending?.perspective}>Ask</Btn>
            </form>
          )}
          <ContinueOnPhone linkCode={session.linkCode} />
        </motion.div>
      </div>

      <div className="v2-ringwrap">
        <LensRing
          perspectives={P.perspectives}
          activeId={ringTarget}
          waitingId={pending?.perspective || null}
          heard={P.heard}
          lookOf={lookOf}
          onSelect={P.selectPerspective}
          isBusy={isLoading || isPulling || P.isLookingBack}
        />
      </div>

      <Sheet
        tone="dark"
        isOpen={panel === 'graph'}
        onClose={closePanel}
        title="How the story connects"
        className={isFull ? 'is-full' : ''}
        headerExtra={<Btn variant="ghost" icon={isFull ? Minimize2 : Maximize2} aria-pressed={isFull} onClick={() => setIsFull((v) => !v)}>{isFull ? 'Exit full view' : 'Full view'}</Btn>}
      >
        {P.graphState === 'loading' && !P.hasGraphData ? (
          <div className="v2-sheet-wait">
            <Waiting message="Tracing connections" slowMessage="Still tracing connections. This can take a few seconds." />
            <Skeleton lines={3} />
          </div>
        ) : (
          <Suspense fallback={<div className="v2-sheet-wait"><Waiting message="Tracing connections" /></div>}>
            <Graph nodes={P.graph.nodes} edges={P.graph.edges} currentSegmentId={P.graph.currentId} looks={P.looks} perspectives={P.perspectives} thumbs={P.thumbs} onSelectNode={lookBack} />
            {P.graphState === 'error' && <p className="v2-sheet-note" role="status">Showing the scenes seen so far. The full graph could not load.</p>}
          </Suspense>
        )}
      </Sheet>
      <Sheet
        tone="dark"
        isOpen={panel === 'map'}
        onClose={closePanel}
        title={shown.location?.label || 'Where this happened'}
        className={isFull ? 'is-full' : ''}
        headerExtra={<Btn variant="ghost" icon={isFull ? Minimize2 : Maximize2} aria-pressed={isFull} onClick={() => setIsFull((v) => !v)}>{isFull ? 'Exit full view' : 'Full view'}</Btn>}
      >
        <Suspense fallback={<div className="v2-sheet-wait"><Waiting message="Unrolling the map" /></div>}>
          <TravelMap location={shown.location} travelFrom={shown.travel_from} isOffline={dataSource !== 'live' && dataSource !== 'mock'} />
        </Suspense>
      </Sheet>

      <Evidence
        focus={evidence}
        onClose={closeEvidence}
        segment={shown}
        segments={P.segments}
        sources={P.sources}
        sourcesById={P.sourcesById}
        sourcesState={P.sourcesState}
        onRetry={P.loadSources}
        lookOf={lookOf}
        onGhost={landGhost}
        isGhosting={!!ghost}
      />
      {ghost?.to && (
        <motion.span
          aria-hidden="true"
          className="v2-chip v2-ghost"
          initial={{ x: ghost.from.x, y: ghost.from.y }}
          animate={{ x: ghost.to.x, y: ghost.to.y }}
          transition={spring(SPRING)}
          onAnimationComplete={() => setGhost(null)}
        >
          {ghost.label}
        </motion.span>
      )}

      <AnimatePresence>
        {isPaletteOpen && (
          <Suspense fallback={null}>
            <Palette key="palette" items={paletteItems} onClose={closePalette} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSharing && (
          <Suspense fallback={null}>
            <ShareCard key="share" segment={shown} look={look} topicTitle={P.topic?.title || ''} sourcesById={P.sourcesById} stats={shareStats} summary={shareSummary} dataSource={dataSource} onClose={closeShare} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {wash && (
          <motion.i
            key={wash.id}
            aria-hidden="true"
            className="v2-wash"
            style={{ left: wash.x, top: wash.y, backgroundColor: wash.color }}
            initial={{ scale: 0.5, opacity: 0.5 }}
            animate={{ scale: 90, opacity: 0 }}
            transition={{ duration: sec(DURATION.scene), ease: EASING.enter }}
            onAnimationComplete={() => setWash(null)}
          />
        )}
      </AnimatePresence>
    </main>
  )
}
