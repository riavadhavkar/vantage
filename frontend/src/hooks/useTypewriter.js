// OWNER: Person B
import { useCallback, useEffect, useRef, useState } from 'react'
import { TYPE_SPEED_MS } from '../constants/theme.js'

/**
 * Reveals text over time. Time-based (not per-tick), so it stays smooth when frames drop.
 * @returns {{ shown: string, isDone: boolean, complete: () => void }}
 */
export default function useTypewriter(text, { isActive = true, isInstant = false, speedMs = TYPE_SPEED_MS } = {}) {
  const [count, setCount] = useState(isInstant ? text.length : 0)
  const raf = useRef(0)
  const countRef = useRef(count)
  const textRef = useRef(text)

  useEffect(() => {
    cancelAnimationFrame(raf.current)
    if (isInstant) {
      setCount(text.length)
      return
    }
    // New text starts over; pausing (isActive false) keeps what is already shown.
    if (textRef.current !== text) {
      textRef.current = text
      countRef.current = 0
      setCount(0)
    }
    if (!isActive) return
    const start = performance.now() - countRef.current * speedMs
    const tick = (now) => {
      const n = Math.min(text.length, Math.floor((now - start) / speedMs))
      countRef.current = n
      setCount(n)
      if (n < text.length) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [text, isActive, isInstant, speedMs])

  const complete = useCallback(() => {
    cancelAnimationFrame(raf.current)
    countRef.current = text.length
    setCount(text.length)
  }, [text])

  return { shown: text.slice(0, count), isDone: count >= text.length, complete }
}
