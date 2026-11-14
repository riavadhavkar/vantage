// OWNER: Person B
// The signature transition. The iris closes as soon as the viewer asks for another
// point of view, holds while the next segment loads, swaps the grade (and voice)
// under the closed iris, then opens: 260 + 180 + 260 = 700 ms when data is ready.
import { useCallback, useEffect, useRef, useState } from 'react'
import { PULL_CLOSE_MS, PULL_HOLD_MS, PULL_OPEN_MS } from '../constants/theme.js'

/** @returns {{ shown: object|null, pull: 'idle'|'closing'|'closed'|'opening', beginPull: () => void, cancelPull: () => void }} */
export default function usePerspectivePull(current, { isReduced = false } = {}) {
  const [shown, setShown] = useState(current)
  const [pull, setPull] = useState('idle')
  const startedAt = useRef(null)
  const timers = useRef([])
  const shownRef = useRef(current)

  const clear = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))

  const show = (seg) => {
    shownRef.current = seg
    setShown(seg)
  }

  const beginPull = useCallback(() => {
    clear()
    startedAt.current = performance.now()
    if (isReduced) {
      setPull('closed')
      return
    }
    setPull('closing')
    later(() => setPull((p) => (p === 'closing' ? 'closed' : p)), PULL_CLOSE_MS)
  }, [isReduced])

  const cancelPull = useCallback(() => {
    if (startedAt.current == null) return
    clear()
    startedAt.current = null
    if (isReduced) {
      setPull('idle')
      return
    }
    setPull('opening')
    later(() => setPull('idle'), PULL_OPEN_MS)
  }, [isReduced])

  useEffect(() => {
    const prev = shownRef.current
    if (!current) {
      clear()
      startedAt.current = null
      setPull('idle')
      show(null)
      return
    }
    if (!prev) {
      show(current)
      return
    }
    if (current.segment_id === prev.segment_id) return
    const isShift = current.perspective !== prev.perspective
    if (isReduced || (!isShift && startedAt.current == null)) {
      clear()
      startedAt.current = null
      setPull('idle')
      show(current)
      return
    }
    clear()
    if (startedAt.current == null) {
      startedAt.current = performance.now()
      setPull('closing')
    }
    const remaining = Math.max(0, PULL_CLOSE_MS - (performance.now() - startedAt.current))
    later(() => setPull('closed'), remaining)
    later(() => {
      show(current)
      setPull('opening')
    }, remaining + PULL_HOLD_MS)
    later(() => {
      setPull('idle')
      startedAt.current = null
    }, remaining + PULL_HOLD_MS + PULL_OPEN_MS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.segment_id])

  useEffect(() => clear, [])

  return { shown, pull, beginPull, cancelPull }
}
