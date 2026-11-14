// OWNER: Person B
// One scene, three vantage points. The pointer pulls focus between them.
// Performance: blur is never animated. Each panel holds a sharp and a pre-blurred
// layer and we crossfade their opacity; scale and a darkening veil do the rest.
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { sceneDataUrl } from '../lib/scene.js'
import { STAGGER_MS, EASE_FOCUS } from '../constants/theme.js'
import GradeLayers from './GradeLayers.jsx'

// How each vantage frames the shared scene: a crop, not a different picture.
const VANTAGES = [
  { scale: 1.7, origin: '34% 58%' }, // low and close
  { scale: 1.0, origin: '50% 50%' }, // wide
  { scale: 1.45, origin: '82% 38%' }, // high, from the far side
]

const PULL_S = 0.5

export default function HeroTriptych({ grades, sceneSeed, sceneKind, isIntroDone, onIntroDone }) {
  const reduce = useReducedMotion()
  const [focus, setFocus] = useState(1)
  const [hasInteracted, setHasInteracted] = useState(false)
  const ref = useRef(null)
  const src = useMemo(() => sceneDataUrl({ seed: sceneSeed, kind: sceneKind, width: 2400, height: 1100 }), [sceneSeed, sceneKind])

  // Teach the gesture once: A, B, C, then back to B.
  useEffect(() => {
    if (reduce) {
      onIntroDone?.()
      return
    }
    const base = 3 * STAGGER_MS + 700
    const steps = [0, 1, 2, 1]
    const timers = steps.map((i, k) => setTimeout(() => !hasInteracted && setFocus(i), base + k * 650))
    timers.push(setTimeout(() => onIntroDone?.(), base + steps.length * 650))
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce])

  const pickFromPointer = (e) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const i = Math.max(0, Math.min(2, Math.floor(((e.clientX - rect.left) / rect.width) * 3)))
    if (!hasInteracted) setHasInteracted(true)
    setFocus(i)
  }

  const transition = reduce ? { duration: 0 } : { duration: PULL_S, ease: EASE_FOCUS }

  return (
    <div
      ref={ref}
      onPointerMove={pickFromPointer}
      onPointerDown={pickFromPointer}
      className="hero-frame relative flex w-full touch-pan-y select-none gap-1 bg-prussian"
      style={{ containerType: 'inline-size' }}
      aria-hidden="true"
    >
      {grades.map((grade, i) => {
        const isFocused = focus === i
        const v = VANTAGES[i]
        return (
          <motion.div
            key={i}
            className="relative h-full flex-1 overflow-hidden rounded-lg"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: reduce ? 0 : (i * STAGGER_MS) / 1000, ease: EASE_FOCUS }}
          >
            {/* the developing print: starts dark, comes up */}
            <motion.div
              className="absolute inset-0"
              animate={{ scale: isFocused ? 1.03 : 1 }}
              transition={transition}
            >
              <div className="absolute inset-0" style={{ left: `-${i * 100}%`, width: '300%' }}>
                <div className="absolute inset-0 overflow-hidden">
                  <img
                    src={src}
                    alt=""
                    className="print-gray absolute inset-0 h-full w-full object-cover"
                    style={{ transform: `scale(${v.scale})`, transformOrigin: v.origin }}
                    draggable="false"
                  />
                </div>
              </div>
              <GradeLayers grade={grade} />
            </motion.div>

            {/* pre-blurred copy; only its opacity changes */}
            <motion.div
              className="absolute inset-0"
              initial={false}
              animate={{ opacity: isFocused ? 0 : 1 }}
              transition={transition}
            >
              <div className="absolute inset-0" style={{ left: `-${i * 100}%`, width: '300%' }}>
                <div className="absolute inset-0 overflow-hidden">
                  <img
                    src={src}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{
                      transform: `scale(${v.scale * 1.02})`,
                      transformOrigin: v.origin,
                      filter: 'grayscale(1) blur(9px)',
                    }}
                    draggable="false"
                  />
                </div>
              </div>
              <GradeLayers grade={grade} />
            </motion.div>

            <motion.div
              className="absolute inset-0 bg-prussian"
              initial={false}
              animate={{ opacity: isFocused ? 0 : 0.42 }}
              transition={transition}
            />
            <div className="vignette absolute inset-0" />

            {/* the wordmark, cut by the gutters; each slice takes its panel's focus */}
            <div className="wordmark-slice pointer-events-none absolute bottom-0" style={{ left: `calc(-${i * 100}% - ${i * 4}px)` }}>
              <motion.span
                className="wordmark block"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: isFocused ? 1 : 0, transition: { ...transition, delay: 0 } }}
                transition={transition}
              >
                Vantage
              </motion.span>
              <motion.span
                className="wordmark absolute inset-0 block"
                style={{ filter: 'blur(6px)' }}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: isFocused ? 0 : 0.75 }}
                transition={transition}
              >
                Vantage
              </motion.span>
            </div>
          </motion.div>
        )
      })}
      {!isIntroDone && <span className="sr-only">Loading</span>}
    </div>
  )
}
