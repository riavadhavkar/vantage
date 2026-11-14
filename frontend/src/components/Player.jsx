// OWNER: Person B
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
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
import useNarration from '../hooks/useNarration.js'
import usePerspectivePull from '../hooks/usePerspectivePull.js'
import useMediaQuery from '../hooks/useMediaQuery.js'
import { gradesForTopic, FALLBACK_GRADE } from '../constants/theme.js'
import { getSources } from '../api/client.js'
import { messageFor } from '../api/errors.js'

const KnowledgeGraph = lazy(() => import('./KnowledgeGraph.jsx'))
const StoryMap = lazy(() => import('./StoryMap.jsx'))

function graphFromSegments(segments) {
  const ids = new Set(segments.map((s) => s.segment_id))
  const edges = segments
    .filter((s) => s.connected_to && ids.has(s.connected_to))
    .map((s) => ({ source: s.connected_to, target: s.segment_id, edge_type: s.edge_type || 'happened_next' }))
  return { nodes: segments, edges }
}

function PendingNote({ pending }) {
  if (!pending) return null
  const msg = pending.kind === 'ask' ? 'Looking through the sources...' : 'Tracing connections...'
  return <LoadingState message={msg} className="mt-6 min-h-11" />
}

function IconButton({ label, onClick, children, isPressed, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isPressed}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-[2px] px-2 text-sm text-print hover:bg-prussian/60 sm:px-3"
    >
      {children}
      <span className="max-[400px]:sr-only">{label}</span>
      {badge != null && <span className="text-xs text-fog">{badge}</span>}
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
  const { currentSegment, segments, sessionId, choose, ask, isLoading, pending, error, clearError } = session
  const { shown, pull, beginPull, cancelPull } = usePerspectivePull(currentSegment, { isReduced: !!reduce })

  const grades = useMemo(() => gradesForTopic(topic), [topic])
  const perspectives = useMemo(() => topic?.perspectives || [], [topic])
  const grade = (shown && grades[shown.perspective]) || FALLBACK_GRADE

  const narration = useNarration(shown, { isSoundOn, shouldAutoplay: pull === 'idle' })
  const [isTyped, setIsTyped] = useState(false)
  useEffect(() => setIsTyped(false), [shown?.segment_id])

  // Sources
  const [sources, setSources] = useState([])
  const [sourcesState, setSourcesState] = useState('idle')
  useEffect(() => {
    if (!sessionId) return
    let isLive = true
    setSourcesState('loading')
    getSources(sessionId)
      .then((d) => isLive && (setSources(d.sources || []), setSourcesState('ready')))
      .catch(() => isLive && setSourcesState('error'))
    return () => {
      isLive = false
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

  const graph = useMemo(() => graphFromSegments(segments), [segments])

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
  const hasVoice = narration.audioStatus === 'ready' || narration.audioStatus === 'loading'

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-8">
        <div className="flex min-w-0 items-baseline gap-4">
          <button type="button" onClick={onExit} className="font-display text-[28px] leading-none text-print" aria-label="Vantage. Start a new topic">
            Vantage
          </button>
          <p className="hidden truncate text-sm text-fog sm:block">{topic?.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <DataSourceNote source={dataSource} className="hidden md:flex" />
          <button type="button" onClick={onExit} className="min-h-11 rounded-[2px] px-2 text-sm text-print hover:bg-developer">
            New topic
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1600px] flex-1 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden px-8 pt-4 lg:block">
          <div className="sticky top-6">
            <LensRail perspectives={perspectives} current={shown?.perspective} grades={grades} heardCounts={heardCounts} onSelect={selectLens} isBusy={isLoading} />
          </div>
        </aside>

        <main className="pb-44 sm:px-8 lg:pr-12 lg:pl-4 lg:pb-32">
          <div className="stage-wrap">
            <Stage
              segment={shown}
              grade={grade}
              imageUrl={narration.imageUrl}
              imageStatus={narration.imageStatus}
              pull={pull}
              pullMessage={pullMessage}
              sourcesById={sourcesById}
              onOpenSource={openSource}
            />
          </div>

          <div className="mt-3 px-4 sm:px-0 lg:hidden">
            <LensRail layout="strip" perspectives={perspectives} current={shown?.perspective} grades={grades} heardCounts={heardCounts} onSelect={selectLens} isBusy={isLoading} />
          </div>

          <div className="mt-6 px-4 sm:mt-8 sm:px-0">
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

            {narration.audioStatus === 'failed' && shown?.is_grounded && (
              <p className="mb-4 text-xs text-fog">The narration voice could not load. Captions continue below.</p>
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
                  <p className="font-serif text-[18px] leading-[30px] text-print">This thread ends here.</p>
                  <p className="mt-1 text-sm text-fog">Hear the same story from another side, or trace how it connects.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={recover} className="min-h-11 rounded-[2px] border border-print/30 px-4 text-sm text-print hover:bg-developer">
                      Try another point of view
                    </button>
                    <button type="button" onClick={() => setPanel('graph')} className="min-h-11 rounded-[2px] border border-print/30 px-4 text-sm text-print hover:bg-developer">
                      See how it connects
                    </button>
                    <button type="button" onClick={onExit} className="min-h-11 rounded-[2px] px-4 text-sm text-print underline underline-offset-4">
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
          </div>
        </main>
      </div>

      {/* control strip: graph, map, sources, ask, voice; narration and sound always reachable */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-print/10 bg-developer/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm">
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
              className="min-h-11 min-w-0 flex-1 rounded-[2px] border border-print/15 bg-prussian px-3 text-sm text-print placeholder:text-fog focus:border-print/50 focus:outline-none"
            />
            <VoiceInputButton onTranscript={(t) => setQuestion(t)} isDisabled={isLoading} />
            <button type="submit" disabled={!question.trim() || isLoading} className="min-h-11 rounded-[2px] px-3 text-sm font-medium text-print hover:bg-prussian/60 disabled:opacity-50">
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
              <SoundToggle isOn={isSoundOn} onToggle={onToggleSound} className="[&>svg~*]:sr-only" />
            </div>
          </div>

          <div className="order-3 hidden items-center gap-1 lg:flex">
            <NarrationControls narration={narration} hasVoice={hasVoice} />
            <SoundToggle isOn={isSoundOn} onToggle={onToggleSound} />
            <AmbientPlayer mood={shown?.mood} isOn={isAmbientOn} onToggle={() => setIsAmbientOn((v) => !v)} />
          </div>
        </div>
      </div>

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
        <Suspense fallback={<LoadingState message="Tracing connections..." className="p-6" />}>
          <KnowledgeGraph nodes={graph.nodes} edges={graph.edges} currentSegmentId={currentSegment?.segment_id} grades={grades} perspectives={perspectives} />
        </Suspense>
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
  const { isPlaying, play, pause, audioStatus } = narration
  const isReady = audioStatus === 'ready'
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
      {isReady ? <AiBadge kind="voice" className="max-sm:hidden" /> : <span className="text-xs text-fog max-sm:hidden">Preparing the voice...</span>}
    </div>
  )
}
