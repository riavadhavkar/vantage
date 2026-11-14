// OWNER: Person B
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import Stage from './Stage.jsx'
import Subtitles from './Subtitles.jsx'
import Ungrounded from './Ungrounded.jsx'
import ChoiceButtons from './ChoiceButtons.jsx'
import ContradictionSplit from './ContradictionSplit.jsx'
import TimelineStrip from './TimelineStrip.jsx'
import AskPill from './AskPill.jsx'
import IconButton from './IconButton.jsx'
import SettingsPopover from './SettingsPopover.jsx'
import SourcePanel from './SourcePanel.jsx'
import Sheet from './Sheet.jsx'
import LoadingState from './LoadingState.jsx'
import AiBadge from './AiBadge.jsx'
import { aiKindFor } from '../lib/aiKind.js'
import DataSourceNote from './DataSourceNote.jsx'
import { Share2, Network, Map as MapIcon, FileText, Volume2, VolumeX, Play, Pause } from 'lucide-react'
import useSubtitleText from '../hooks/useSubtitleText.js'
import { shareStory } from '../lib/share.js'
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

/**
 * @param {{ session: ReturnType<import('../hooks/useSession.js').default>, topic: object|null,
 *   isSoundOn: boolean, onToggleSound: () => void, language: object, onRestart: (code: string) => void,
 *   onExit: () => void, dataSource: string }} props
 */
export default function Player({ session, topic, isSoundOn, onToggleSound, language, onRestart, onExit, dataSource }) {
  const reduce = useReducedMotion()
  const isMobile = useMediaQuery('(max-width: 1023px)')
  const { currentSegment, segments, sessionId, linkCode, choose, ask, isLoading, pending, error, clearError } = session
  const { shown: liveShown, pull, beginPull, cancelPull } = usePerspectivePull(currentSegment, { isReduced: !!reduce })
  // a graph node can reopen an earlier scene; the live scene returns when a new one arrives
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
    if (shown?.segment_id && narration.imageUrl) setThumbs((t) => (t[shown.segment_id] ? t : { ...t, [shown.segment_id]: narration.imageUrl }))
  }, [shown?.segment_id, narration.imageUrl])
  // Which scene has finished its subtitles. Keyed by scene so a reset effect cannot run after
  // the subtitles report "done" and hide the choices.
  const [typedId, setTypedId] = useState(null)
  const shownId = shown?.segment_id
  const setIsTyped = useCallback((done) => setTypedId((id) => (done ? shownId : id === shownId ? null : id)), [shownId])
  const isTyped = typedId != null && typedId === shownId
  const subtitle = useSubtitleText(shown, language)
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false)
  const [toast, setToast] = useState(null)

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

  const onShare = useCallback(async () => {
    const result = await shareStory({ title: shown?.title ? `${shown.title} | vantage` : 'vantage', url: window.location.href })
    setToast(result === 'copied' ? 'link copied' : result === 'failed' ? 'could not share. copy the link from the address bar' : null)
  }, [shown])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const pullMessage = pending?.perspective ? 'finding another perspective...' : null
  const isCurrentShown = shown && currentSegment && shown.segment_id === currentSegment.segment_id
  const showChoices = isTyped && isCurrentShown && pull === 'idle' && !isLoading
  const citedCount = new Set(segments.flatMap((s) => s.source_ids || [])).size
  const hasVoice = !!narration.voiceSource
  const isAiVoice = narration.voiceSource === 'remote'
  const aiKind = aiKindFor({ hasImage: narration.imageStatus === 'ready' && !!narration.imageUrl, hasVoice: isAiVoice })
  const isTranslated = subtitle.status === 'ready'
  const subtitleNote =
    subtitle.status === 'loading' ? 'translating...' : subtitle.status === 'failed' ? 'subtitles unavailable' : null

  const togglePanel = (name) => () => {
    setSourceFocus(null)
    setPanel((p) => (p === name ? null : name))
  }

  return (
    <div className="relative h-dvh min-h-[560px] overflow-hidden bg-prussian">
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

      {/* top HUD: wordmark and date | ask pill and title | icons and ai badge */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-3 sm:px-8 sm:pt-5">
        <div className="grid grid-cols-[1fr_auto] items-start gap-x-3 gap-y-3 lg:grid-cols-[1fr_minmax(0,36rem)_1fr]">
          <div className="pointer-events-auto min-w-0">
            <button type="button" onClick={onExit} aria-label="vantage. start a new topic" className="chrome -ml-1 flex min-h-11 items-center rounded-md px-1 text-[22px] font-semibold leading-none tracking-[-0.03em] text-white">
              vantage
            </button>
            <div className="relative -mt-1 min-h-6">
              <AnimatePresence mode="popLayout" initial={false}>
                {shown?.date_label && (
                  <motion.p
                    key={shown.date_label}
                    className="text-[15px] font-bold leading-6 text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.8)]"
                    initial={{ opacity: 0, y: reduce ? 0 : 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: reduce ? 0 : -14 }}
                    transition={{ duration: 0.3 }}
                  >
                    {shown.date_label}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            <DataSourceNote source={dataSource} className="mt-1 max-lg:hidden" />
          </div>

          <div className="pointer-events-auto col-span-2 row-start-2 min-w-0 lg:col-span-1 lg:col-start-2 lg:row-start-1">
            <AskPill perspectives={perspectives} onSubmit={doAsk} isLoading={isLoading} />
            {shown?.title && (
              <h2 key={shown.segment_id} className="mt-3 text-center text-[22px] font-semibold leading-[28px] tracking-[-0.02em] text-balance text-white [text-shadow:0_1px_4px_rgb(0_0_0/0.85)] sm:text-[28px] sm:leading-[34px]">
                {shown.title}
              </h2>
            )}
            <DataSourceNote source={dataSource} className="mt-2 justify-center lg:hidden" />
            {aiKind && (
              <div className="mt-2 flex justify-center lg:hidden">
                <AiBadge kind={aiKind} />
              </div>
            )}
          </div>

          <div className="pointer-events-auto col-start-2 row-start-1 flex flex-col items-end gap-2 lg:col-start-3">
            <div className="flex items-center gap-1 sm:gap-2" role="toolbar" aria-label="story tools">
              <IconButton label="share" onClick={onShare}>
                <Share2 aria-hidden="true" size={19} strokeWidth={1.75} />
              </IconButton>
              <IconButton label="story connections" onClick={togglePanel('graph')} isPressed={panel === 'graph'}>
                <Network aria-hidden="true" size={19} strokeWidth={1.75} />
              </IconButton>
              <IconButton label="map" onClick={togglePanel('map')} isPressed={panel === 'map'}>
                <MapIcon aria-hidden="true" size={19} strokeWidth={1.75} />
              </IconButton>
              <IconButton label="sources" onClick={togglePanel('sources')} isPressed={panel === 'sources'} badge={citedCount || null}>
                <FileText aria-hidden="true" size={19} strokeWidth={1.75} />
              </IconButton>
              <div className="flex items-center">
                <IconButton tipAlign="end" label={isSoundOn ? 'sound on' : 'sound off'} onClick={onToggleSound}>
                  {isSoundOn ? <Volume2 aria-hidden="true" size={19} strokeWidth={1.75} /> : <VolumeX aria-hidden="true" size={19} strokeWidth={1.75} />}
                </IconButton>
                <SettingsPopover language={language} onRestart={onRestart} mood={shown?.mood} isAmbientOn={isAmbientOn} onToggleAmbient={() => setIsAmbientOn((v) => !v)} linkCode={linkCode} />
              </div>
            </div>
            {aiKind && (
              <div className="hidden max-w-[20rem] justify-end lg:flex">
                <AiBadge kind={aiKind} />
              </div>
            )}
            {narration.imageStatus === 'loading' && shown?.is_grounded && <p className="chrome rounded-full bg-prussian/85 px-3 py-1 text-xs text-print">developing the illustration...</p>}
            {toast && (
              <p role="status" className="chrome rounded-full bg-print px-3 py-1 text-xs font-medium text-prussian">
                {toast}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* bottom: notes and choices, subtitles, then the timeline */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col">
        <div className="flex max-h-[58dvh] flex-col gap-3 overflow-y-auto pt-3 pb-2">
          {error && (
            <div role="alert" className="mx-auto flex max-w-[56ch] flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-md border border-safelight/60 bg-prussian/90 px-4 py-2">
              <p className="text-sm text-print">{messageFor(error)}</p>
              {error.code === 'session_not_found' ? (
                <button type="button" onClick={onExit} className="chrome min-h-11 text-sm text-print underline underline-offset-4">
                  start again
                </button>
              ) : (
                <button type="button" onClick={() => { clearError(); lastAction.current?.() }} className="chrome min-h-11 text-sm text-print underline underline-offset-4">
                  try again
                </button>
              )}
            </div>
          )}

          {pending && !pending.perspective && (
            <LoadingState
              message={pending.kind === 'ask' ? 'looking through the sources...' : pending.kind === 'start' ? 'opening the archive...' : 'tracing connections...'}
              slowMessage="still writing the next part from the sources. this can take a few seconds."
              className="chrome mx-auto rounded-full bg-prussian/85 px-4 py-1 !text-print"
            />
          )}

          {shown?.contradiction && isTyped && pull === 'idle' && (
            <div className="mx-auto w-full max-w-4xl px-4">
              <ContradictionSplit contradiction={shown.contradiction} sourcesById={sourcesById} onOpenSource={openSource} />
            </div>
          )}

          {shown && !shown.is_grounded && pull === 'idle' && <Ungrounded segment={shown} onRecover={recover} />}

          {shown?.is_final && showChoices ? (
            <div className="mx-auto max-w-[56ch] rounded-md bg-prussian/90 px-5 py-4 text-center">
              <p className="chrome text-base text-print">this thread ends here.</p>
              <p className="chrome mt-1 text-sm text-fog">hear the same story from another side, or trace how it connects.</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={recover} className="chrome min-h-11 rounded-full border border-print/40 px-4 text-sm text-print hover:bg-developer">
                  try another point of view
                </button>
                <button type="button" onClick={() => setPanel('graph')} className="chrome min-h-11 rounded-full border border-print/40 px-4 text-sm text-print hover:bg-developer">
                  see how it connects
                </button>
                <button type="button" onClick={onExit} className="chrome min-h-11 px-4 text-sm text-print underline underline-offset-4">
                  start a new topic
                </button>
              </div>
            </div>
          ) : (
            <ChoiceButtons choices={shown?.is_grounded ? shown?.choices : []} onChoose={doChoose} isVisible={showChoices} grades={grades} isDisabled={isLoading} pendingChoiceId={pending?.choiceId} />
          )}

          <Subtitles
            text={subtitle.status === 'off' ? (shown?.is_grounded ? shown.narrative_text || '' : '') : subtitle.text}
            lang={subtitle.lang}
            durationMs={narration.audioDurationMs}
            resetKey={shown?.segment_id || ''}
            isPlaying={narration.isPlaying}
            hasFinished={narration.hasFinished}
            isVisible={subtitle.status !== 'off' && !!shown?.is_grounded}
            isActive={pull === 'idle'}
            onDoneChange={setIsTyped}
            onOpen={() => setIsTranscriptOpen(true)}
            note={subtitleNote}
          />

          <div className="flex min-h-11 items-center justify-center gap-3 px-4">
            {narration.voiceSource === 'remote' || narration.voiceSource === 'device' ? (
              <button
                type="button"
                onClick={narration.isPlaying ? narration.pause : narration.play}
                aria-label={narration.isPlaying ? 'pause narration' : 'play narration'}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-print/30 bg-prussian/80 text-print hover:bg-developer"
              >
                {narration.isPlaying ? <Pause aria-hidden="true" size={18} strokeWidth={1.75} /> : <Play aria-hidden="true" size={18} strokeWidth={1.75} />}
              </button>
            ) : hasVoice ? (
              <span className="chrome text-xs text-print/85">preparing the voice...</span>
            ) : null}
            {narration.voiceSource === 'device' && <span className="chrome text-xs text-print/85">device voice</span>}
            {narration.audioStatus === 'failed' && !narration.voiceSource && shown?.is_grounded && (
              <span className="chrome text-xs text-print/85">narration audio is unavailable for this scene. subtitles only.</span>
            )}
          </div>
        </div>

        <TimelineStrip perspectives={perspectives} current={shown?.perspective} grades={grades} heardCounts={heardCounts} onSelect={selectLens} isBusy={isLoading} />
      </div>

      <Sheet title="transcript" isOpen={isTranscriptOpen} onClose={() => setIsTranscriptOpen(false)} canExpand={false}>
        <div className="h-full overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto max-w-[64ch]">
            <h3 className="text-lg font-semibold text-print">{shown?.title}</h3>
            {subtitle.status !== 'off' && (
              <p lang={subtitle.lang} className="mt-3 text-[19px] leading-[32px] text-print">
                {subtitle.text}
              </p>
            )}
            {isTranslated && (
              <>
                <h4 className="chrome mt-6 text-xs text-fog">original narration</h4>
                <p lang={language.narrationLanguage} className="mt-1 text-[17px] leading-[28px] text-print/90">
                  {shown?.narrative_text}
                </p>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setIsTranscriptOpen(false)
                setSourceFocus(null)
                setPanel('sources')
              }}
              className="chrome mt-6 min-h-11 text-sm text-print underline underline-offset-4"
            >
              how this was grounded
            </button>
          </div>
        </div>
      </Sheet>

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
        current={shown}
        onFocusSource={openSource}
      />

      <Sheet title="how the story connects" isOpen={panel === 'graph'} onClose={closePanel}>
        {graphState === 'loading' && !graphData ? (
          <LoadingState message="tracing connections..." slowMessage="still tracing connections. this can take a few seconds." className="chrome p-6" />
        ) : (
          <Suspense fallback={<LoadingState message="tracing connections..." className="chrome p-6" />}>
            <KnowledgeGraph nodes={graph.nodes} edges={graph.edges} currentSegmentId={graph.currentId} grades={grades} perspectives={perspectives} thumbs={thumbs} onSelectNode={(id) => { setViewedId(id === currentSegment?.segment_id ? null : id); closePanel() }} />
            {graphState === 'loading' && (
              <p className="chrome absolute top-3 left-4 text-xs text-fog sm:left-8" role="status">updating connections...</p>
            )}
            {graphState === 'error' && (
              <p className="chrome absolute top-3 left-4 text-xs text-fog sm:left-8" role="status">showing the scenes seen so far. the full graph could not load.</p>
            )}
          </Suspense>
        )}
      </Sheet>

      <Sheet title={shown?.location?.label || 'where this happened'} isOpen={panel === 'map'} onClose={closePanel}>
        <Suspense fallback={<LoadingState message="unrolling the map..." className="chrome p-6" />}>
          <StoryMap location={shown?.location} travelFrom={shown?.travel_from} isOffline={dataSource !== 'live' && dataSource !== 'mock'} />
        </Suspense>
      </Sheet>
    </div>
  )
}
