// OWNER: Person B
// The landing hero: one scene, two accounts, split by a draggable safelight seam.
// Each half is graded in its source's perspective. Dragging toward one side gives
// that account more of the frame and brings its caption forward.
// Data: the contradictions in the bundled demo path (labeled as an example).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { SOURCE_TYPE_LABEL } from '../constants/labels.js'
import { EASE } from '../lib/motion.js'
import GradeLayers from './GradeLayers.jsx'

const clamp = (v) => Math.max(6, Math.min(94, v))

function Side({ side, isLead, align }) {
  return (
    <div className={`flex-1 transition-opacity duration-300 ${isLead ? 'opacity-100' : 'opacity-45'} ${align === 'right' ? 'text-right' : ''}`}>
      <p className="text-[14px] leading-[21px] text-prussian sm:text-[16px] sm:leading-[24px]">{side.text}</p>
    </div>
  )
}

export default function SeamHero({ examples }) {
  const reduce = useReducedMotion()
  const [index] = useState(0)
  const [seam, setSeam] = useState(50)
  const [hasTouched, setHasTouched] = useState(false)
  const frame = useRef(null)
  const dragging = useRef(false)
  const ex = examples[index]

  // Teach the gesture once: the seam leans to each side, then settles.
  useEffect(() => {
    if (reduce || hasTouched) return
    const steps = [
      [900, 34],
      [1900, 66],
      [2900, 50],
    ]
    const timers = steps.map(([t, v]) => setTimeout(() => !dragging.current && setSeam(v), t))
    return () => timers.forEach(clearTimeout)
  }, [reduce, hasTouched, index])

  const fromPointer = useCallback((e) => {
    const r = frame.current?.getBoundingClientRect()
    if (!r) return
    setSeam(clamp(((e.clientX - r.left) / r.width) * 100))
  }, [])

  const onPointerDown = (e) => {
    dragging.current = true
    setHasTouched(true)
    e.currentTarget.setPointerCapture?.(e.pointerId)
    fromPointer(e)
  }
  const onPointerMove = (e) => dragging.current && fromPointer(e)
  const onPointerUp = () => (dragging.current = false)

  const onKeyDown = (e) => {
    const step = e.shiftKey ? 15 : 5
    const map = { ArrowLeft: -step, ArrowRight: step, Home: -100, End: 100 }
    if (map[e.key] == null) return
    e.preventDefault()
    setHasTouched(true)
    setSeam((v) => clamp(v + map[e.key]))
  }

  const spring = reduce ? { duration: 0 } : dragging.current ? { duration: 0 } : { duration: 0.9, ease: EASE }
  const lead = useMemo(() => (seam < 46 ? 'b' : seam > 54 ? 'a' : null), [seam])
  if (!ex) return null

  return (
    <section aria-label="Two sources that disagree" className="w-full">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={ex.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.15 : 0.45, ease: EASE }}
        >
          <p className="mx-auto mb-4 max-w-[60ch] text-center text-sm text-balance text-prussian">
            <span aria-hidden="true" className="mr-2 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-safelight align-middle" />
            <span className="text-safelight-ink">Sources disagree:</span> {ex.claim}
          </p>

          <div
            ref={frame}
            className="relative aspect-[4/3] w-full cursor-ew-resize touch-pan-y overflow-hidden rounded-2xl bg-prussian select-none sm:aspect-[9/4]"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* side B fills the frame; side A is clipped to the left of the seam */}
            <div className="absolute inset-0">
              <img src={ex.scene} alt="" draggable="false" className="print-gray absolute inset-0 h-full w-full object-cover" />
              <GradeLayers grade={ex.b.grade} />
            </div>
            <motion.div
              className="absolute inset-0"
              animate={{ clipPath: `inset(0 ${100 - seam}% 0 0)` }}
              transition={spring}
            >
              <img src={ex.scene} alt="" draggable="false" className="print-gray absolute inset-0 h-full w-full object-cover" />
              <GradeLayers grade={ex.a.grade} />
            </motion.div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-prussian/45 via-transparent to-transparent" />

            <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-prussian/55 px-2.5 py-1 text-xs text-print backdrop-blur-sm sm:bottom-4 sm:left-4">
              {ex.a.label}
            </span>
            <span className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-prussian/55 px-2.5 py-1 text-xs text-print backdrop-blur-sm sm:right-4 sm:bottom-4">
              {ex.b.label}
            </span>

            {/* the seam */}
            <motion.div
              className="absolute inset-y-0 w-0"
              animate={{ left: `${seam}%` }}
              transition={spring}
            >
              <div aria-hidden="true" className="absolute inset-y-0 -left-px w-0.5 bg-safelight shadow-[0_0_14px_rgb(210_64_47/0.6)]" />
              <button
                type="button"
                role="slider"
                aria-label="Move between the two accounts"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(seam)}
                aria-valuetext={lead === 'a' ? ex.a.label : lead === 'b' ? ex.b.label : 'Both accounts'}
                onKeyDown={onKeyDown}
                className="absolute top-1/2 -left-[22px] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-paper text-prussian shadow-[0_2px_12px_rgb(10_30_48/0.35)]"
              >
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6.5 5L2.5 9l4 4M11.5 5l4 4-4 4" />
                </svg>
              </button>
            </motion.div>
          </div>

          <div className="mt-4 flex gap-6 sm:gap-12">
            <Side side={ex.a} isLead={lead !== 'b'} />
            <Side side={ex.b} isLead={lead !== 'a'} align="right" />
          </div>
        </motion.div>
      </AnimatePresence>

    </section>
  )
}
