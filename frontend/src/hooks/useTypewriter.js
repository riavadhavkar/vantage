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

  useEffect(() => {
    cancelAnimationFrame(raf.current)
    if (isInstant) {
      setCount(text.length)
      return
    }
    setCount(0)
    if (!isActive) return
    const start = performance.now()
    const tick = (now) => {
      const n = Math.min(text.length, Math.floor((now - start) / speedMs))
      setCount(n)
      if (n < text.length) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [text, isActive, isInstant, speedMs])

  const complete = useCallback(() => {
    cancelAnimationFrame(raf.current)
    setCount(text.length)
  }, [text])

  return { shown: text.slice(0, count), isDone: count >= text.length, complete }
}
