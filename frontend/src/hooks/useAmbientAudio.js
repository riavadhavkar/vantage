// OWNER: Person B
import { useEffect, useRef, useState } from 'react'
import { FADE_MS } from '../constants/theme.js'

const TARGET_VOLUME = 0.22

/**
 * Crossfades ambient beds from public/ambient/<mood>.mp3. Silent until isOn.
 * @returns {{ isAvailable: boolean }}
 */
export default function useAmbientAudio(mood, isOn) {
  const players = useRef([])
  const active = useRef(0)
  const [isAvailable, setIsAvailable] = useState(true)

  useEffect(() => {
    players.current = [new Audio(), new Audio()]
    players.current.forEach((a) => {
      a.loop = true
      a.volume = 0
      a.preload = 'none'
    })
    return () => players.current.forEach((a) => a.pause())
  }, [])

  useEffect(() => {
    if (!mood || !players.current.length) return
    const [a, b] = active.current === 0 ? players.current : [...players.current].reverse()
    const next = b
    const prev = a
    let raf = 0
    const fade = () => {
      const start = performance.now()
      const step = (now) => {
        const t = Math.min(1, (now - start) / (FADE_MS * 2))
        next.volume = (isOn ? TARGET_VOLUME : 0) * t
        prev.volume = Math.max(0, prev.volume * (1 - t))
        if (t < 1) raf = requestAnimationFrame(step)
        else prev.pause()
      }
      raf = requestAnimationFrame(step)
    }
    if (!isOn) {
      players.current.forEach((p) => p.pause())
      return
    }
    const src = `/ambient/${mood}.mp3`
    if (!next.src.endsWith(src)) {
      next.src = src
      next.onerror = () => setIsAvailable(false)
    }
    next
      .play()
      .then(() => {
        setIsAvailable(true)
        active.current = active.current === 0 ? 1 : 0
        fade()
      })
      .catch(() => setIsAvailable(false))
    return () => cancelAnimationFrame(raf)
  }, [mood, isOn])

  return { isAvailable }
}
