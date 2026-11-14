// Everything the new player needs to know and do. This is the same data logic as the
// classic Player (sources, graph polling, choosing, asking, retrying), copied here so the
// classic screen stays untouched as the fallback. Calls go through api/client.js as before.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useNarration from '../hooks/useNarration.js'
import usePull from './usePull.js'
import useVoicedSegment from './useVoicedSegment.js'
import { getSources, getGraph } from '../api/client.js'
import { deriveTopic } from '../api/normalize.js'
import { looksForTopic, NEUTRAL_LOOK } from './looks.js'
import { gradedSceneUrl, sceneOptsFor } from './gradedScene.js'
import { prepareSoft } from './softImage.js'
import { useCalmMotion } from '../lib/motionMode.js'

const GRAPH_POLL_MS = 5000

function graphFromSegments(segments) {
  const ids = new Set(segments.map((s) => s.segment_id))
  const edges = segments.flatMap((s) =>
    (s.connected_to || []).filter((from) => ids.has(from)).map((from) => ({ source: from, target: s.segment_id, edge_type: s.edge_type || 'happened_next' })),
  )
  return { nodes: segments, edges }
}

const tick = () => {
  try {
    navigator.vibrate?.(8)
  } catch {
    // haptics are optional
  }
}

export default function usePlayer({ session, topic, isSoundOn, isHeld = false, language }) {
  const isCalm = useCalmMotion()
  const { currentSegment, segments, sessionId, choose, ask, isLoading, pending, error, clearError } = session
  // Before a new scene swaps in under the blur, have its graded drawing and its soft copy ready.
  const looksRef = useRef({})
  const prepare = useCallback((seg) => prepareSoft(gradedSceneUrl(sceneOptsFor(seg), looksRef.current[seg.perspective] || NEUTRAL_LOOK)), [])
  const pull = usePull(currentSegment, { isCalm, prepare })
  const { shown: live, begin, cancel } = pull
  // Looking back: a scene picked in the graph is shown again without changing where the story is.
  const [viewedId, setViewedId] = useState(null)
  useEffect(() => setViewedId(null), [currentSegment?.segment_id])
  const shown = (viewedId && segments.find((s) => s.segment_id === viewedId)) || live
  const isLookingBack = !!live && !!shown && shown.segment_id !== live.segment_id
  const viewScene = useCallback((id) => setViewedId(id && id !== live?.segment_id ? id : null), [live])

  const [sources, setSources] = useState([])
  const [sourcesState, setSourcesState] = useState('idle')

  // Perspectives are data. Without GET /api/topic, derive them from what the session has shown.
  const effectiveTopic = useMemo(
    () => (topic?.perspectives?.length ? topic : deriveTopic({ title: topic?.title, segments, sources })),
    [topic, segments, sources],
  )
  const looks = useMemo(() => looksForTopic(effectiveTopic), [effectiveTopic])
  const perspectives = useMemo(() => effectiveTopic.perspectives || [], [effectiveTopic])
  looksRef.current = looks
  const look = (shown && looks[shown.perspective]) || NEUTRAL_LOOK
  const lookOf = useCallback((id) => looks[id] || NEUTRAL_LOOK, [looks])

  const voiceIndex = Math.max(0, perspectives.findIndex((p) => p.perspective_id === shown?.perspective))
  // The scene as it is narrated: the same scene, in the chosen narration language.
  const voice = useVoicedSegment(shown, language)
  // isHeld: the shutter is waiting for this scene's illustration, so the voice waits too.
  const narration = useNarration(voice.segment, { isSoundOn, shouldAutoplay: pull.phase === 'idle' && !isHeld, voiceIndex, holdAudio: voice.isHeld })
  // The first illustration each scene showed, for the graph's thumbnails.
  const [thumbs, setThumbs] = useState({})
  const shownKey = shown?.segment_id
  useEffect(() => {
    if (shownKey && narration.imageUrl) setThumbs((t) => (t[shownKey] ? t : { ...t, [shownKey]: narration.imageUrl }))
  }, [shownKey, narration.imageUrl])

  const loadSources = useCallback(() => {
    if (!sessionId) return
    setSourcesState('loading')
    return getSources(sessionId)
      .then((d) => (setSources(d.sources || []), setSourcesState('ready')))
      .catch(() => setSourcesState('error'))
  }, [sessionId])
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

  const lastAction = useRef(null)
  const doChoose = useCallback(
    async (choice) => {
      lastAction.current = () => doChoose(choice)
      const isShift = choice.perspective && shown && choice.perspective !== shown.perspective
      if (isShift) (tick(), begin())
      const seg = await choose(choice)
      if (!seg && isShift) cancel()
    },
    [choose, shown, begin, cancel],
  )
  const doAsk = useCallback(
    async (question, meta) => {
      lastAction.current = () => doAsk(question, meta)
      if (meta?.perspective) (tick(), begin())
      const seg = await ask(question, meta)
      if (!seg && meta?.perspective) cancel()
    },
    [ask, begin, cancel],
  )
  const selectPerspective = useCallback(
    (id) => {
      if (!shown || isLoading || isLookingBack || id === shown.perspective) return
      const p = perspectives.find((x) => x.perspective_id === id)
      if (!p) return
      const choice =
        (shown.choices || []).find((c) => c.perspective === id && c.choice_type === 'perspective_shift') || (shown.choices || []).find((c) => c.perspective === id)
      if (choice && shown.is_grounded) doChoose(choice)
      else doAsk(`Tell this moment from the point of view of ${p.label}.`, { perspective: id })
    },
    [shown, isLoading, isLookingBack, perspectives, doChoose, doAsk],
  )
  const recover = useCallback(() => {
    const other = perspectives.find((p) => p.perspective_id !== shown?.perspective)
    if (other) selectPerspective(other.perspective_id)
  }, [perspectives, shown, selectPerspective])
  const retry = useCallback(() => {
    clearError()
    lastAction.current?.()
  }, [clearError])

  // Counts what has actually been shown: a scene that has arrived but is still behind the
  // focus pull does not count as heard yet.
  const heard = useMemo(() => {
    const m = {}
    const shownIndex = segments.findIndex((s) => s.segment_id === live?.segment_id)
    const list = shownIndex >= 0 ? segments.slice(0, shownIndex + 1) : segments
    for (const s of list) if (s.is_grounded) m[s.perspective] = (m[s.perspective] || 0) + 1
    return m
  }, [segments, live])

  // Graph from GET /api/graph while it is open; falls back to the scenes this browser has seen.
  const [isGraphOpen, setIsGraphOpen] = useState(false)
  const [graphData, setGraphData] = useState(null)
  const [graphState, setGraphState] = useState('idle')
  useEffect(() => {
    if (!sessionId || !isGraphOpen) return
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
  }, [sessionId, isGraphOpen, segments.length])
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
    const edges = (graphData.edges || []).filter((e) => ids.has(e.source) && ids.has(e.target)).map((e) => ({ source: e.source, target: e.target, edge_type: e.edge_type || 'happened_next' }))
    return { nodes, edges, currentId: graphData.nodes.find((n) => n.is_current)?.id || currentSegment?.segment_id }
  }, [segments, graphData, currentSegment])

  const citedCount = useMemo(() => new Set(segments.flatMap((s) => s.source_ids || [])).size, [segments])

  return {
    isCalm,
    pull,
    shown,
    isCurrentShown: !!shown && !!currentSegment && shown.segment_id === currentSegment.segment_id,
    isLookingBack,
    viewScene,
    thumbs,
    segments,
    topic: effectiveTopic,
    perspectives,
    looks,
    look,
    lookOf,
    narration,
    voice,
    sources,
    sourcesById,
    sourcesState,
    loadSources,
    heard,
    citedCount,
    isLoading,
    pending,
    error,
    retry,
    doChoose,
    doAsk,
    selectPerspective,
    recover,
    graph,
    graphState,
    hasGraphData: !!graphData,
    setIsGraphOpen,
  }
}
