// The signature transition, on one clock. A single value runs 0 to 1 over 700 ms on the
// shared "move" easing, and everything that moves is a function of it: the frame softens
// (0 to 260 ms), the new scene and grade swap in under the blur (260 to 440 ms), and it
// sharpens (440 to 700 ms). If the next segment is late the clock holds at the halfway
// point, so the frame never sharpens onto stale content.
import { useCallback, useEffect, useRef, useState } from 'react'
import { animate, cubicBezier, useMotionValue, useTransform } from 'motion/react'
import { EASING, SIGNATURE } from '../constants/theme.js'
import { MOTION_MODE, sec } from '../lib/motionMode.js'

const TOTAL = SIGNATURE.soften + SIGNATURE.swap + SIGNATURE.sharpen
const HALF = TOTAL / 2
const easeMove = cubicBezier(...EASING.move)
const SOFT_IN = SIGNATURE.soften / TOTAL
const SOFT_OUT = (SIGNATURE.soften + SIGNATURE.swap) / TOTAL

/** After a pull, note whether this device kept up. More than 3 long frames turns on lite mode. */
function watchFrames() {
  if (MOTION_MODE !== 'normal') return () => {}
  let last = performance.now()
  let long = 0
  let id = requestAnimationFrame(function tick(now) {
    if (now - last > 33.4) long += 1
    last = now
    id = requestAnimationFrame(tick)
  })
  return () => {
    cancelAnimationFrame(id)
    if (long > 3) document.documentElement.dataset.lite = '1'
  }
}

/**
 * @returns {{ shown: object|null, phase: 'idle'|'out'|'in', soft: import('motion/react').MotionValue<number>,
 *   begin: () => void, cancel: () => void }}
 */
export default function usePull(current, { isCalm = false, prepare } = {}) {
  const [shown, setShown] = useState(current)
  const [phase, setPhase] = useState('idle')
  const clock = useMotionValue(0)
  const progress = useTransform(clock, (t) => easeMove(t))
  /** 0 = sharp, 1 = fully soft */
  const soft = useTransform(progress, [0, easeMove(SOFT_IN), easeMove(SOFT_OUT), 1], [0, 1, 1, 0])

  const shownRef = useRef(current)
  const run = useRef(null)
  const waiting = useRef(null)
  const isActive = useRef(false)
  const atHalf = useRef(false)
  const stopWatch = useRef(null)
  const prepareRef = useRef(prepare)
  prepareRef.current = prepare
  const turn = useRef(0)

  const show = useCallback((seg) => {
    shownRef.current = seg
    setShown(seg)
  }, [])
  const end = useCallback(() => {
    clock.set(0)
    isActive.current = false
    atHalf.current = false
    waiting.current = null
    setPhase('idle')
    stopWatch.current?.()
    stopWatch.current = null
  }, [clock])

  const sharpen = useCallback(
    (seg) => {
      const mine = ++turn.current
      let hasGone = false
      const go = () => {
        if (hasGone || mine !== turn.current) return
        hasGone = true
        show(seg)
        setPhase('in')
        run.current = animate(clock, 1, { duration: sec(HALF), ease: 'linear', onComplete: end })
      }
      // Let the next scene's out-of-focus copy get ready while the frame is fully soft (at most 150 ms),
      // so the swap under the blur never shows a sharp frame.
      const warm = prepareRef.current?.(seg)
      if (warm?.then) {
        warm.then(go, go)
        setTimeout(go, 150)
      } else go()
    },
    [clock, end, show],
  )

  const begin = useCallback(() => {
    turn.current += 1
    run.current?.stop()
    isActive.current = true
    atHalf.current = false
    waiting.current = null
    setPhase('out')
    if (isCalm) {
      atHalf.current = true
      return
    }
    stopWatch.current?.()
    stopWatch.current = watchFrames()
    clock.set(0)
    run.current = animate(clock, 0.5, {
      duration: sec(HALF),
      ease: 'linear',
      onComplete: () => {
        atHalf.current = true
        if (waiting.current) sharpen(waiting.current)
      },
    })
  }, [clock, isCalm, sharpen])

  /** The request failed: come back into focus on the scene we already had. */
  const cancel = useCallback(() => {
    if (!isActive.current) return
    turn.current += 1
    run.current?.stop()
    if (isCalm) return end()
    setPhase('in')
    run.current = animate(clock, 0, { duration: sec(SIGNATURE.sharpen), ease: 'linear', onComplete: end })
  }, [clock, isCalm, end])

  useEffect(() => {
    const prev = shownRef.current
    if (!current) {
      run.current?.stop()
      end()
      show(null)
      return
    }
    if (!prev) return show(current)
    if (current.segment_id === prev.segment_id) return
    const isShift = current.perspective !== prev.perspective
    if (isCalm) {
      end()
      return show(current)
    }
    // Same point of view and nobody asked for a pull: the frame crossfades, it does not pull focus.
    if (!isShift && !isActive.current) return show(current)
    if (!isActive.current) begin()
    if (atHalf.current) sharpen(current)
    else waiting.current = current
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.segment_id])

  useEffect(
    () => () => {
      run.current?.stop()
      stopWatch.current?.()
    },
    [],
  )

  return { shown, phase, soft, begin, cancel }
}
