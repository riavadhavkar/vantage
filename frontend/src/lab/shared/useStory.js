// Lab only. Plays the existing mock bundle through the existing in-browser mock
// server (no network), so every prototype runs the same story with real async states.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SAMPLE_BUNDLES } from '../../mocks/index.js'
import { createMockServer } from '../../api/mockServer.js'
import { normalizeSegment, normalizeSource } from '../../api/normalize.js'

export const BUNDLE = SAMPLE_BUNDLES[0]
export const TOPIC = BUNDLE.topic
export const SOURCES = BUNDLE.sources.map(normalizeSource)
export const SOURCES_BY_ID = Object.fromEntries(SOURCES.map((s) => [s.source_id, s]))

export const sentencesOf = (text) =>
  (String(text || '').match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || []).map((s) => s.trim()).filter(Boolean)

/** One account per perspective, straight from the bundle: its first segment and lead sentence. */
export const ACCOUNTS = TOPIC.perspectives
  .map((p) => {
    const seg = BUNDLE.segments.find((s) => s.perspective === p.perspective_id)
    return seg ? { perspective: p, segment: seg, lead: sentencesOf(seg.narrative_text)[0] || '' } : null
  })
  .filter(Boolean)

export const FIRST_CONTRADICTION = BUNDLE.segments.find((s) => s.contradiction)?.contradiction || null

export const STATS = {
  perspectives: TOPIC.perspectives.length,
  sources: SOURCES.length,
  disagreements: BUNDLE.segments.filter((s) => s.contradiction).length,
}

/** Route to the first segment with a contradiction, found by walking the bundle's own routes. */
function pathToContradiction() {
  const start = BUNDLE.start_segment_id
  const queue = [[start, []]]
  const seen = new Set([start])
  while (queue.length) {
    const [id, path] = queue.shift()
    const seg = BUNDLE.segments.find((s) => s.segment_id === id)
    if (seg?.contradiction) return path
    for (const c of seg?.choices || []) {
      const next = BUNDLE.routes[c.choice_id]
      if (next && !seen.has(next)) {
        seen.add(next)
        queue.push([next, [...path, c.choice_id]])
      }
    }
  }
  return []
}

/** ?view=landing|player|evidence|contradiction and ?instant=1 let the screenshot script reach each state. */
export function labParams() {
  const q = new URLSearchParams(window.location.search)
  return { view: q.get('view') || 'landing', isInstant: q.get('instant') === '1' }
}

export default function useStory() {
  const server = useRef(null)
  const session = useRef(null)
  const [segments, setSegments] = useState([])
  const [status, setStatus] = useState('idle') // idle | starting | ready | error
  const [pending, setPending] = useState(null) // { perspective, choiceId }
  const busy = useRef(false)

  const srv = () => (server.current ||= createMockServer({ bundles: [BUNDLE], isDemo: true }))

  const start = useCallback(async ({ toContradiction = false } = {}) => {
    if (busy.current) return
    busy.current = true
    setStatus('starting')
    try {
      const data = await srv().startSession(TOPIC.title)
      session.current = data.session_id
      const list = [normalizeSegment(data.segment)]
      for (const choiceId of toContradiction ? pathToContradiction() : []) {
        const next = await srv().getNextSegment(session.current, choiceId)
        list.push(normalizeSegment(next.segment))
      }
      setSegments(list)
      setStatus('ready')
    } catch {
      setStatus('error')
    } finally {
      busy.current = false
    }
  }, [])

  const run = useCallback(async (meta, fn) => {
    if (busy.current) return null
    busy.current = true
    setPending(meta)
    try {
      const { segment } = await fn()
      const seg = normalizeSegment(segment)
      setSegments((l) => [...l.filter((s) => s.segment_id !== seg.segment_id), seg])
      return seg
    } catch {
      return null
    } finally {
      busy.current = false
      setPending(null)
    }
  }, [])

  const current = segments[segments.length - 1] || null

  const choose = useCallback(
    (choice) => run({ perspective: choice.perspective, choiceId: choice.choice_id }, () => srv().getNextSegment(session.current, choice.choice_id)),
    [run],
  )

  const shiftTo = useCallback(
    (perspectiveId) => {
      if (!current || perspectiveId === current.perspective) return null
      const choice =
        current.choices.find((c) => c.perspective === perspectiveId && c.choice_type === 'perspective_shift') ||
        current.choices.find((c) => c.perspective === perspectiveId)
      if (choice) return choose(choice)
      const p = TOPIC.perspectives.find((x) => x.perspective_id === perspectiveId)
      return run({ perspective: perspectiveId }, () => srv().askQuestion(session.current, `Tell this moment from the point of view of ${p?.label}.`))
    },
    [current, choose, run],
  )

  const reset = useCallback(() => {
    session.current = null
    setSegments([])
    setStatus('idle')
  }, [])

  const heard = useMemo(() => {
    const m = {}
    for (const s of segments) m[s.perspective] = (m[s.perspective] || 0) + 1
    return m
  }, [segments])

  useEffect(() => () => (session.current = null), [])

  return { topic: TOPIC, sources: SOURCES, sourcesById: SOURCES_BY_ID, segments, current, status, pending, isLoading: !!pending, heard, start, choose, shiftTo, reset }
}
