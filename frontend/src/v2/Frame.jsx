// The stage: one full-bleed frame. A drawn scene is there at once (graded as a duotone);
// when the AI illustration arrives it develops in over it, in color with a faint perspective
// tint and its "AI-generated illustration" badge. Focus pulls crossfade to a copy that was
// blurred once; the blur itself is never animated.
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { sceneDataUrl, sceneKindFor } from '../lib/scene.js'
import { DURATION, EASING, SIGNATURE } from '../constants/theme.js'
import { sec } from '../lib/motionMode.js'
import { AiBadge } from './ui.jsx'

/** Duotone (drawn scenes) or tint (illustrations), optionally split down the middle for a contradiction. */
function Grade({ look, splitLook, kind }) {
  const sides = [
    [look, `inset(0 ${splitLook ? 50 : 0}% 0 0)`],
    [splitLook || look, `inset(0 0 0 ${splitLook ? 50 : 100}%)`],
  ]
  return sides.map(([l, clipPath], n) =>
    kind === 'tint' ? (
      <i key={n} aria-hidden="true" className="v2-grade grade-tint" style={{ backgroundColor: l.tint, clipPath }} />
    ) : (
      <span key={n} aria-hidden="true">
        <i className="v2-grade grade-hi" style={{ backgroundColor: l.highlight, clipPath }} />
        <i className="v2-grade grade-lo" style={{ backgroundColor: l.shadow, clipPath }} />
      </span>
    ),
  )
}

// Three bands of the same drawn scene (sky, middle, foreground) that move at different rates.
const BANDS = [
  { cls: 'v2-band-sky', depth: 4 },
  { cls: 'v2-band-mid', depth: 9 },
  { cls: 'v2-band-fore', depth: 16 },
]

function Plate({ segment, look, splitLook, imageUrl, canShowImage, soft, pointer, isCalm, isPaused, crossfade, onImage }) {
  const sceneUrl = useMemo(
    () => sceneDataUrl({ seed: segment.segment_id, kind: sceneKindFor(`${segment.scene_prompt || ''} ${segment.title}`), width: 1600, height: 900 }),
    [segment],
  )
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasFailed, setHasFailed] = useState(false)
  const [isDeveloped, setIsDeveloped] = useState(false)
  const showImage = canShowImage && !!imageUrl && !hasFailed
  const zoom = useTransform(soft, (s) => 1 + 0.03 * s)
  useEffect(() => onImage?.(showImage && isLoaded), [showImage, isLoaded, onImage])

  return (
    <motion.div className="v2-plate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: sec(crossfade), ease: EASING.move }}>
      <motion.div className="v2-plate-zoom" style={{ scale: zoom }}>
        <div className={`v2-pan ${isCalm ? '' : 'ken-burns'} ${isPaused ? 'is-paused' : ''}`}>
          {!isDeveloped && (
            <div className="v2-drawn">
              {isCalm ? (
                <img src={sceneUrl} alt="" className="print-gray v2-fill" />
              ) : (
                BANDS.map((b) => <Band key={b.cls} src={sceneUrl} cls={b.cls} depth={b.depth} pointer={pointer} />)
              )}
              <motion.img src={sceneUrl} alt="" aria-hidden="true" className="print-gray v2-fill v2-softimg" style={{ opacity: soft }} />
              <Grade look={look} splitLook={splitLook} kind="duotone" />
            </div>
          )}
          {showImage && (
            <motion.div
              className="v2-ai"
              initial={{ opacity: 0 }}
              animate={{ opacity: isLoaded ? 1 : 0 }}
              transition={{ duration: sec(isCalm ? DURATION.quick : DURATION.slow), ease: EASING.enter }}
              onAnimationComplete={() => isLoaded && setIsDeveloped(true)}
            >
              <img src={imageUrl} alt={`Illustration: ${segment.title}`} className="print-color v2-fill" decoding="async" onLoad={() => setIsLoaded(true)} onError={() => setHasFailed(true)} />
              <motion.img src={imageUrl} alt="" aria-hidden="true" className="v2-fill v2-softimg v2-softimg-color" style={{ opacity: soft }} />
              <Grade look={look} splitLook={splitLook} kind="tint" />
              {/* the print develops: a dark wash lifts as the image comes up */}
              {!isCalm && <motion.i aria-hidden="true" className="v2-develop" initial={{ opacity: 0.55 }} animate={{ opacity: isLoaded ? 0 : 0.55 }} transition={{ duration: sec(DURATION.slow * 1.3), ease: EASING.enter }} />}
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function Band({ src, cls, depth, pointer }) {
  const tx = useTransform(pointer.x, (v) => v * -depth)
  const ty = useTransform(pointer.y, (v) => v * -depth * 0.4)
  return <motion.img src={src} alt="" className={`print-gray v2-fill v2-band ${cls}`} style={{ x: tx, y: ty }} />
}

/**
 * @param {{ segment: object, look: object, splitLook?: object|null, imageUrl?: string|null, imageStatus: string,
 *   soft: import('motion/react').MotionValue<number>, isPulling: boolean, isCalm: boolean, isPaused?: boolean,
 *   isUngrounded?: boolean, status?: string|null }} props
 */
export default function Frame({ segment, look, splitLook = null, imageUrl, imageStatus, soft, isPulling, isCalm, isPaused = false, isUngrounded = false, children }) {
  const [hasImage, setHasImage] = useState(false)
  useEffect(() => setHasImage(false), [segment?.segment_id])

  // Pointer depth, fine pointers only. One spring per axis; the bands read from it.
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const px = useSpring(rawX, { stiffness: 60, damping: 18, mass: 0.6 })
  const py = useSpring(rawY, { stiffness: 60, damping: 18, mass: 0.6 })
  useEffect(() => {
    if (isCalm || !window.matchMedia('(pointer: fine)').matches) return
    const onMove = (e) => {
      rawX.set((e.clientX / window.innerWidth) * 2 - 1)
      rawY.set((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [isCalm, rawX, rawY])
  const pointer = useMemo(() => ({ x: px, y: py }), [px, py])

  // An ungrounded segment never comes into focus: there is nothing we may show as fact.
  const softness = useTransform(soft, (s) => (isUngrounded ? 1 : s))
  // Loops stop when the tab is hidden.
  const [isHidden, setIsHidden] = useState(false)
  useEffect(() => {
    const on = () => setIsHidden(document.visibilityState !== 'visible')
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])

  return (
    <div className={`v2-stage ${splitLook ? 'is-split' : ''}`}>
      <AnimatePresence initial={false}>
        {segment && (
          <Plate
            key={segment.segment_id}
            segment={segment}
            look={look}
            splitLook={splitLook}
            imageUrl={imageUrl}
            canShowImage={segment.is_grounded && imageStatus === 'ready'}
            soft={softness}
            pointer={pointer}
            isCalm={isCalm}
            isPaused={isPaused || isHidden || isPulling}
            crossfade={isCalm ? DURATION.quick : isPulling ? SIGNATURE.swap : DURATION.scene}
            onImage={setHasImage}
          />
        )}
      </AnimatePresence>
      {/* lite mode: a translucent fill stands in for the blurred copy */}
      <motion.i aria-hidden="true" className="v2-softfill" style={{ opacity: softness }} />
      <i aria-hidden="true" className="v2-seam" />
      <i aria-hidden="true" className="v2-shade" />
      {hasImage ? (
        <AiBadge kind="image" className="v2-stage-badge" />
      ) : (
        segment?.is_grounded && imageStatus === 'loading' && <p className="v2-stage-badge v2-stage-wait" role="status">Developing the illustration</p>
      )}
      {children}
    </div>
  )
}
