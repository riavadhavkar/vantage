// OWNER: Person B
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { EASE } from '../lib/motion.js'
import Stage from './Stage.jsx'
import NarrativeCard from './NarrativeCard.jsx'
import ChoiceButtons from './ChoiceButtons.jsx'
import LensRail from './LensRail.jsx'
import SourcePanel from './SourcePanel.jsx'
import Sheet from './Sheet.jsx'
import LoadingState from './LoadingState.jsx'
import AiBadge from './AiBadge.jsx'
import DataSourceNote from './DataSourceNote.jsx'
import SoundToggle from './SoundToggle.jsx'
import VoiceInputButton from './VoiceInputButton.jsx'
import AmbientPlayer from './AmbientPlayer.jsx'
import ContinueOnPhone from './ContinueOnPhone.jsx'
import useNarration from '../hooks/useNarration.js'
import usePerspectivePull from '../hooks/usePerspectivePull.js'
import useMediaQuery from '../hooks/useMediaQuery.js'
import { gradesForTopic, FALLBACK_GRADE } from '../constants/theme.js'
import { getSources, getGraph } from '../api/client.js'
import { messageFor } from '../api/errors.js'
import { deriveTopic } from '../api/normalize.js'

// Activity from the phone (iMessage) lands in the server's graph, so the open graph polls.
const GRAPH_POLL_MS = 5000

const KnowledgeGraph = lazy(() => import('./KnowledgeGraph.jsx'))
const StoryMap = lazy(() => import('./StoryMap.jsx'))

function graphFromSegments(segments) {
  const ids = new Set(segments.map((s) => s.segment_id))
  const edges = segments.flatMap((s) =>
    (s.connected_to || [])
      .filter((from) => ids.has(from))
      .map((from) => ({ source: from, target: s.segment_id, edge_type: s.edge_type || 'happened_next' })),
  )
  return { nodes: segments, edges }
}

function PendingNote({ pending }) {
  if (!pending) return null
  const msg = pending.kind === 'ask' ? 'Looking through the sources...' : 'Tracing connections...'
  return (
    <LoadingState
      message={msg}
      slowMessage="Still writing the next part from the sources. This can take a few seconds."
      className="mt-6 min-h-11"
    />
  )
}

function IconButton({ label, onClick, children, isPressed, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isPressed}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2 text-sm text-print hover:bg-prussian/60 sm:px-3"
    >
      {children}
      <span className="max-[400px]:sr-only">{label}</span>
      <AnimatePresence mode="popLayout" initial={false}>
        {badge != null && (
          <motion.span
            key={badge}
            className="inline-block text-xs text-fog"
            initial={{ opacity: 0, y: -6, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            {badge}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}

/**
 * @param {{ session: ReturnType<import('../hooks/useSession.js').default>, topic: object|null,
 *   isSoundOn: boolean, onToggleSound: () => void, onExit: () => void, dataSource: string }} props
 */
export default function Player({ session, topic, isSoundOn, onToggleSound, onExit, dataSource }) {
  const reduce = useReducedMotion()
  const isMobile = useMediaQuery('(max-width: 1023px)')
  const { currentSegment, segments, sessionId, linkCode, choose, ask, isLoading, pending, error, clearError } = session
  const { shown: liveShown, pull, beginPull, cancelPull } = usePerspectivePull(currentSegment, { isReduced: !!reduce })
  const [viewedId, setViewedId] = useState(null)
  useEffect(() => setViewedId(null), [currentSegment?.segment_id])
  const shown = (viewedId && (segments || []).find((s) => s.segment_id === viewedId)) || liveShown

  // Sources (declared early: a derived topic reads their perspectives)
  const [sources, setSources] = useState([])
  const [sourcesState, setSourcesState] = useState('idle')

  // Perspectives are data. Without GET /api/topic, derive them from what the session has shown.
  const effectiveTopic = useMemo(
    () => (topic?.perspectives?.length ? topic : deriveTopic({ title: topic?.title, segments, sources })),
    [topic, segments, sources],
  )
  const grades = useMemo(() => gradesForTopic(effectiveTopic), [effectiveTopic])
  const perspectives = useMemo(() => effectiveTopic.perspectives || [], [effectiveTopic])
  const grade = (shown && grades[shown.perspective]) || FALLBACK_GRADE

  const voiceIndex = Math.max(0, perspectives.findIndex((p) => p.perspective_id === shown?.perspective))
  const narration = useNarration(shown, { isSoundOn, shouldAutoplay: pull === 'idle', voiceIndex })
  const [thumbs, setThumbs] = useState({})
  useEffect(() => {
    if (shown?.segment_id && narration.imageUrl)
      setThumbs((t) => (t[shown.segment_id] ? t : { ...t, [shown.segment_id]: narration.imageUrl }))
  }, [shown?.segment_id, narration.imageUrl])
  // Which scene has finished typing. Keyed by scene: with reduced motion the text is instant, and a
  // plain reset effect here used to run after the card reported "done", so the choices never appeared.
  const [typedId, setTypedId] = useState(null)
  const shownId = shown?.segment_id
  const setIsTyped = useCallback((done) => setTypedId((id) => (done ? shownId : id === shownId ? null : id)), [shownId])
  const isTyped = typedId != null && typedId === shownId

  useEffect(() => {
    if (!sessionId) return
    let isLive = true
    const load = () => {
      setSourcesState('loading')
      getSources(sessionId)
        .then((d) => isLive && (setSources(d.sources || []), setSourcesState('ready')))
        .catch(() => isLive && setSourcesState('error'))
    }
    load()
    window.addEventListener('focus', load)
    return () => {
      isLive = false
      window.removeEventListener('focus', load)
    }
  }, [sessionId, segments.length])
  const sourcesById = useMemo(() => Object.fromEntries(sources.map((s) => [s.source_id, s])), [sources])

  const [panel, setPanel] = useState(null) // 'sources' | 'graph' | 'map' | null
  const [sourceFocus, setSourceFocus] = useState(null)
  const openSource = useCallback((sourceId, claim) => {
    setSourceFocus({ sourceId, claim })
    setPanel('sources')
  }, [])
  const closePanel = useCallback(() => setPanel(null), [])

  const [isAmbientOn, setIsAmbientOn] = useState(false)

  // Retry the last action after an error
  const lastAction = useRef(null)

  const doChoose = useCallback(
    async (choice) => {
      lastAction.current = () => doChoose(choice)
      const isShift = choice.perspective && shown && choice.perspective !== shown.perspective
      if (isShift) beginPull()
      const seg = await choose(choice)
      if (!seg && isShift) cancelPull()
    },
    [choose, shown, beginPull, cancelPull],
  )

  const doAsk = useCallback(
    async (question, meta) => {
      lastAction.current = () => doAsk(question, meta)
      if (meta?.perspective) beginPull()
      const seg = await ask(question, meta)
      if (!seg && meta?.perspective) cancelPull()
    },
    [ask, beginPull, cancelPull],
  )

  const selectLens = useCallback(
    (p) => {
      if (!shown || isLoading || p.perspective_id === shown.perspective) return
      const choice = (shown.choices || []).find((c) => c.perspective === p.perspective_id && c.choice_type === 'perspective_shift') ||
        (shown.choices || []).find((c) => c.perspective === p.perspective_id)
      if (choice) doChoose(choice)
      else doAsk(`Tell this moment from the point of view of ${p.label}.`, { perspective: p.perspective_id })
    },
    [shown, isLoading, doChoose, doAsk],
  )

  const recover = useCallback(() => {
    const other = perspectives.find((p) => p.perspective_id !== shown?.perspective)
    if (other) selectLens(other)
  }, [perspectives, shown, selectLens])

  const heardCounts = useMemo(() => {
    const m = {}
    for (const s of segments) if (s.is_grounded) m[s.perspective] = (m[s.perspective] || 0) + 1
    return m
  }, [segments])

  // Knowledge graph from GET /api/graph, fetched while the graph is open. If the call
  // fails, the graph is built from the segments this browser has already seen.
  const [graphData, setGraphData] = useState(null)
  const [graphState, setGraphState] = useState('idle')
  useEffect(() => {
    if (!sessionId || panel !== 'graph') return
    let isLive = true
    const load = (isFirst) => {
      if (isFirst) setGraphState('loading')
      getGraph(sessionId)
        .then((d) => isLive && (setGraphData(d), setGraphState('ready')))
        .catch(() => isLive && isFirst && setGraphState('error'))
    }
    load(true)
    const timer = setInterval(() => document.visibilityState === 'visible' && load(false), GRAPH_POLL_MS)
    const onFocus = () => load(false)
    const onVisible = () => document.visibilityState === 'visible' && load(false)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      isLive = false
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [sessionId, panel, segments.length])

  const graph = useMemo(() => {
    const local = graphFromSegments(segments)
    if (!graphData?.nodes?.length) return { ...local, currentId: currentSegment?.segment_id }
    const byId = Object.fromEntries(segments.map((s) => [s.segment_id, s]))
    const nodes = graphData.nodes.map((n) => ({
      ...(byId[n.id] || {}),
      segment_id: n.id,
      title: n.label ?? byId[n.id]?.title ?? '',
      perspective: n.perspective ?? byId[n.id]?.perspective ?? null,
    }))
    const ids = new Set(nodes.map((n) => n.segment_id))
    const edges = (graphData.edges || [])
      .filter((e) => ids.has(e.source) && ids.has(e.target))
      .map((e) => ({ source: e.source, target: e.target, edge_type: e.edge_type || 'happened_next' }))
    const currentId = graphData.nodes.find((n) => n.is_current)?.id || currentSegment?.segment_id
    return { nodes, edges, currentId }
  }, [segments, graphData, currentSegment])

  const [question, setQuestion] = useState('')
  const submitQuestion = (e) => {
    e?.preventDefault()
    const q = question.trim()
    if (!q || isLoading) return
    setQuestion('')
    doAsk(q)
  }

  const pullMessage = pending?.perspective ? 'Finding another perspective...' : null
  const isCurrentShown = shown && currentSegment && shown.segment_id === currentSegment.segment_id
  const showChoices = isTyped && isCurrentShown && pull === 'idle' && !isLoading
  const citedCount = new Set(segments.flatMap((s) => s.source_ids || [])).size
  const hasVoice = !!narration.voiceSource

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-8">
        <div className="flex min-w-0 items-baseline gap-4">
          <button type="button" onClick={onExit} className="text-[20px] font-semibold leading-none tracking-[-0.03em] text-print" aria-label="Vantage. Start a new topic">
            Vantage
          </button>
          <p className="hidden truncate text-sm text-fog sm:block">{topic?.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <DataSourceNote source={dataSource} className="hidden md:flex" />
          <button type="button" onClick={onExit} className="min-h-11 rounded-md px-2 text-sm text-print hover:bg-developer">
            New topic
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1600px] flex-1 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
        <motion.aside
          className="hidden px-8 pt-4 lg:block"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
        >
          <div className="sticky top-6">
            <LensRail perspectives={perspectives} current={shown?.perspective} grades={grades} heardCounts={heardCounts} onSelect={selectLens} isBusy={isLoading} />
            <ContinueOnPhone linkCode={linkCode} className="mt-8" />
          </div>
        </motion.aside>

        <main className="pb-44 sm:px-8 lg:pr-12 lg:pl-4 lg:pb-32">
          <div className="stage-wrap">
            <Stage
              segment={shown}
              grade={grade}
              imageUrl={narration.imageUrl}
              imageUrls={narration.imageUrls}
              imageStatus={narration.imageStatus}
              pull={pull}
              pullMessage={pullMessage}
              sourcesById={sourcesById}
              onOpenSource={openSource}
            />
          </div>

          <div className="mt-3 px-4 sm:px-8 lg:hidden">
            <LensRail layout="strip" perspectives={perspectives} current={shown?.perspective} grades={grades} heardCounts={heardCounts} onSelect={selectLens} isBusy={isLoading} />
          </div>

          <div className="mt-6 px-4 sm:mt-8 sm:px-8">
            {error && (
              <div role="alert" className="mb-6 flex max-w-[64ch] flex-wrap items-center gap-x-4 gap-y-2 border-l-2 border-safelight py-1 pl-4">
                <p className="text-sm text-print">{messageFor(error)}</p>
                {error.code === 'session_not_found' ? (
                  <button type="button" onClick={onExit} className="min-h-11 text-sm text-print underline underline-offset-4">Start again</button>
                ) : (
                  <button type="button" onClick={() => { clearError(); lastAction.current?.() }} className="min-h-11 text-sm text-print underline underline-offset-4">
                    Try again
                  </button>
                )}
              </div>
            )}

            {narration.audioStatus === 'failed' && !narration.voiceSource && shown?.is_grounded && (
              <p className="mb-4 text-xs text-fog">Narration audio is unavailable for this scene. Captions only.</p>
            )}

            <NarrativeCard
              key={shown?.segment_id}
              segment={shown}
              isActive={pull === 'idle'}
              sourcesById={sourcesById}
              onOpenSource={openSource}
              onTypedChange={setIsTyped}
              onRecover={recover}
            />

            <div className="mt-8 max-w-[64ch]">
              {pending && !pending.perspective ? (
                <PendingNote pending={pending} />
              ) : shown?.is_final && showChoices ? (
                <div className="border-t border-print/12 pt-5">
                  <p className="text-[17px] leading-[27px] text-print">This thread ends here.</p>
                  <p className="mt-1 text-sm text-fog">Hear the same story from another side, or trace how it connects.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={recover} className="min-h-11 rounded-md border border-print/30 px-4 text-sm text-print hover:bg-developer">
                      Try another point of view
                    </button>
                    <button type="button" onClick={() => setPanel('graph')} className="min-h-11 rounded-md border border-print/30 px-4 text-sm text-print hover:bg-developer">
                      See how it connects
                    </button>
                    <button type="button" onClick={onExit} className="min-h-11 rounded-md px-4 text-sm text-print underline underline-offset-4">
                      Start a new topic
                    </button>
                  </div>
                </div>
              ) : (
                <ChoiceButtons
                  choices={shown?.is_grounded ? shown?.choices : []}
                  onChoose={doChoose}
                  isVisible={showChoices}
                  grades={grades}
                  isDisabled={isLoading}
                  pendingChoiceId={pending?.choiceId}
                />
              )}
            </div>
            <ContinueOnPhone linkCode={linkCode} className="mt-10 max-w-[64ch] lg:hidden" />
          </div>
        </main>
      </div>

      {/* control strip: graph, map, sources, ask, voice; narration and sound always reachable */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-print/10 bg-developer/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm"
      >
        <div className="mx-auto flex max-w-[1600px] flex-col gap-1 px-2 py-2 sm:px-6 lg:flex-row lg:items-center lg:gap-4">
          <form onSubmit={submitQuestion} className="order-1 flex flex-1 items-center gap-1 lg:order-2">
            <label htmlFor="ask-input" className="sr-only">
              Ask a question about this moment
            </label>
            <input
              id="ask-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about this moment"
              autoComplete="off"
              className="min-h-11 min-w-0 flex-1 rounded-md border border-print/15 bg-prussian px-3 text-sm text-print placeholder:text-fog focus:border-print/50 focus:outline-none"
            />
            <VoiceInputButton onTranscript={(t) => setQuestion(t)} isDisabled={isLoading} />
            <button type="submit" disabled={!question.trim() || isLoading} className="min-h-11 rounded-md px-3 text-sm font-medium text-print hover:bg-prussian/60 disabled:opacity-50">
              Ask
            </button>
          </form>

          <div className="order-2 flex items-center justify-between gap-1 lg:order-1 lg:justify-start">
            <div className="flex items-center">
              <IconButton label="Graph" onClick={() => setPanel(panel === 'graph' ? null : 'graph')} isPressed={panel === 'graph'}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <rect x="1.5" y="3" width="5" height="4" /><rect x="11.5" y="2" width="5" height="4" /><rect x="8" y="12" width="5" height="4" />
                  <path d="M6.5 5h5M5 7l4 5" />
                </svg>
              </IconButton>
              <IconButton label="Map" onClick={() => setPanel(panel === 'map' ? null : 'map')} isPressed={panel === 'map'}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <path d="M1.5 4l5-2 5 2 5-2v12l-5 2-5-2-5 2z" /><path d="M6.5 2v12M11.5 4v12" />
                </svg>
              </IconButton>
              <IconButton label="Sources" onClick={() => { setSourceFocus(null); setPanel('sources') }} isPressed={panel === 'sources'} badge={citedCount || null}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <path d="M4 1.5h7l3 3v12H4z" /><path d="M6.5 8h5M6.5 11h5M6.5 14h3" />
                </svg>
              </IconButton>
            </div>
            <div className="flex items-center lg:hidden">
              <NarrationControls narration={narration} hasVoice={hasVoice} />
              <SoundToggle isOn={isSoundOn} onToggle={onToggleSound} isCompact />
            </div>
          </div>

          <div className="order-3 hidden items-center gap-1 lg:flex">
            <NarrationControls narration={narration} hasVoice={hasVoice} />
            <SoundToggle isOn={isSoundOn} onToggle={onToggleSound} />
            <AmbientPlayer mood={shown?.mood} isOn={isAmbientOn} onToggle={() => setIsAmbientOn((v) => !v)} />
          </div>
        </div>
      </motion.div>

      <SourcePanel
        sources={sources}
        isOpen={panel === 'sources'}
        onToggle={closePanel}
        focus={sourceFocus}
        segments={segments}
        grades={grades}
        isLoading={sourcesState === 'loading'}
        error={sourcesState === 'error'}
        isMobile={isMobile}
      />

      <Sheet title="How the story connects" isOpen={panel === 'graph'} onClose={closePanel}>
        {graphState === 'loading' && !graphData ? (
          <LoadingState message="Tracing connections..." slowMessage="Still tracing connections. This can take a few seconds." className="p-6" />
        ) : (
          <Suspense fallback={<LoadingState message="Tracing connections..." className="p-6" />}>
            <KnowledgeGraph nodes={graph.nodes} edges={graph.edges} currentSegmentId={graph.currentId} grades={grades} perspectives={perspectives} thumbs={thumbs} onSelectNode={(id) => { setViewedId(id === currentSegment?.segment_id ? null : id); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
            {graphState === 'loading' && (
              <p className="absolute top-3 left-4 text-xs text-fog sm:left-8" role="status">Updating connections...</p>
            )}
            {graphState === 'error' && (
              <p className="absolute top-3 left-4 text-xs text-fog sm:left-8" role="status">Showing the scenes seen so far. The full graph could not load.</p>
            )}
          </Suspense>
        )}
      </Sheet>

      <Sheet title={shown?.location?.label || 'Where this happened'} isOpen={panel === 'map'} onClose={closePanel}>
        <Suspense fallback={<LoadingState message="Unrolling the map..." className="p-6" />}>
          <StoryMap location={shown?.location} travelFrom={shown?.travel_from} isOffline={dataSource !== 'live' && dataSource !== 'mock'} />
        </Suspense>
      </Sheet>
    </div>
  )
}

function NarrationControls({ narration, hasVoice }) {
  if (!hasVoice) return null
  const { isPlaying, play, pause, voiceSource } = narration
  const isReady = voiceSource === 'remote' || voiceSource === 'device'
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={isPlaying ? pause : play}
        disabled={!isReady}
        aria-label={isPlaying ? 'Pause narration' : 'Play narration'}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-print hover:bg-prussian/60 disabled:opacity-50"
      >
        {isPlaying ? (
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="3.5" height="12" /><rect x="9.5" y="2" width="3.5" height="12" /></svg>
        ) : (
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2l10 6-10 6z" /></svg>
        )}
      </button>
      {isReady ? (
        <span className="flex items-center gap-2">
          <AiBadge kind="voice" />
          {voiceSource === 'device' && <span className="text-xs text-fog max-sm:hidden">Device voice</span>}
        </span>
      ) : (
        <span className="text-xs text-fog max-sm:hidden">Preparing the voice...</span>
      )}
    </div>
  )
}
