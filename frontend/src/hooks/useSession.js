// OWNER: Person B
import { useCallback, useRef, useState } from 'react'
import * as api from '../api/client.js'

/**
 * Story session state. The current segment is always the newest one.
 * @returns {{ sessionId, currentSegment, segments, startSession, choose, ask, reset, isLoading, pending, error, clearError }}
 */
export default function useSession() {
  const [sessionId, setSessionId] = useState(null)
  /** 4-digit code that lets a phone continue this session over iMessage (live backend only) */
  const [linkCode, setLinkCode] = useState(null)
  const [segments, setSegments] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  /** What is loading: { kind: 'start'|'choose'|'ask', perspective?: string } */
  const [pending, setPending] = useState(null)
  const [error, setError] = useState(null)
  const sessionRef = useRef(null)

  const run = useCallback(async (meta, fn) => {
    setIsLoading(true)
    setPending(meta)
    setError(null)
    try {
      return await fn()
    } catch (e) {
      setError(e instanceof api.ApiError ? e : new api.ApiError('network', String(e?.message || e)))
      return null
    } finally {
      setIsLoading(false)
      setPending(null)
    }
  }, [])

  const startSession = useCallback(
    (topic, language) =>
      run({ kind: 'start' }, async () => {
        const data = await api.startSession(topic, language)
        sessionRef.current = data.session_id
        setSessionId(data.session_id)
        setLinkCode(data.link_code ?? null)
        setSegments([data.segment])
        return data
      }),
    [run],
  )

  const append = (segment) => setSegments((list) => [...list.filter((s) => s.segment_id !== segment.segment_id), segment])

  const choose = useCallback(
    (choice) =>
      run({ kind: 'choose', perspective: choice.perspective, choiceId: choice.choice_id }, async () => {
        const { segment } = await api.getNextSegment(sessionRef.current, choice.choice_id)
        append(segment)
        return segment
      }),
    [run],
  )

  const ask = useCallback(
    (question, meta = {}) =>
      run({ kind: 'ask', ...meta }, async () => {
        const { segment } = await api.askQuestion(sessionRef.current, question)
        append(segment)
        return segment
      }),
    [run],
  )

  const reset = useCallback(() => {
    sessionRef.current = null
    setSessionId(null)
    setLinkCode(null)
    setSegments([])
    setError(null)
  }, [])

  return {
    sessionId,
    linkCode,
    segments,
    currentSegment: segments[segments.length - 1] || null,
    startSession,
    choose,
    ask,
    reset,
    isLoading,
    pending,
    error,
    clearError: () => setError(null),
  }
}
