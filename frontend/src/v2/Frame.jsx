// The stage: one full-bleed frame. A drawn scene is there at once (graded as a duotone);
// when the AI illustration arrives it develops in over it, in color with a faint perspective
// tint (the "ai generated" badge is drawn by the player HUD). Focus pulls crossfade to a copy that was
// blurred once; the blur itself is never animated.
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { gradedSceneUrl, sceneOptsFor } from './gradedScene.js'
import { prepareSoft, softUrl } from './softImage.js'
import { DURATION, EASING, SIGNATURE } from '../constants/theme.js'
import { sec } from '../lib/motionMode.js'

/** The faint perspective tint over a color illustration, split down the middle for a contradiction. */
function Tint({ look, splitLook }) {
  return (
    <>
      <i aria-hidden="true" className="v2-grade grade-tint" style={{ backgroundColor: look.tint, clipPath: `inset(0 ${splitLook ? 50 : 0}% 0 0)` }} />
      {splitLook && <i aria-hidden="true" className="v2-grade grade-tint" style={{ backgroundColor: splitLook.tint, clipPath: 'inset(0 0 0 50%)' }} />}
    </>
  )
}

// Three bands of the same drawn scene (sky, middle, foreground) that move at different rates.
const NO_SHOTS = []

const BANDS = [
  { cls: 'v2-band-sky', depth: 4 },
  { cls: 'v2-band-mid', depth: 9 },
  { cls: 'v2-band-fore', depth: 16 },
]

// Storyboard: a scene can have several shots (useNarration fills imageUrls as they arrive).
// The frame cuts between them at the pace of the narration, with the same formula as the classic
// stage: the time it takes to say the text (2.6 words a second), shared between the planned shots.
function shotDuration(segment, shotCount) {
  const words = String(segment?.narrative_text || '').split(/\s+/).filter(Boolean).length
  const planned = Math.max(segment?.scene_prompts?.length || shotCount || 1, 1)
  return Math.max(3000, Math.min(8000, Math.round(((words / 2.6) * 1000) / planned)))
}

/** Only shots that have actually loaded are ever shown, so a failed image can never blank the frame. */
function useLoadedShots(urls) {
  const [loaded, setLoaded] = useState([])
  const tried = useRef(new Set())
  useEffect(() => {
    let isLive = true
    for (const url of urls) {
      if (tried.current.has(url)) continue
      tried.current.add(url)
      const img = new Image()
      img.onload = () => isLive && setLoaded((list) => (list.includes(url) ? list : [...list, url]))
      img.src = url
    }
    return () => {
      isLive = false
    }
  }, [urls])
  // keep story order, drop anything that is no longer offered
  return useMemo(() => urls.filter((u) => loaded.includes(u)), [urls, loaded])
}

function Plate({ segment, look, splitLook, shotUrls, canShowImage, soft, pointer, isCalm, isPaused, crossfade, onImage }) {
  const scene = useMemo(() => sceneOptsFor(segment), [segment])
  const sceneUrl = useMemo(() => gradedSceneUrl(scene, look), [scene, look])
  const splitUrl = useMemo(() => (splitLook ? gradedSceneUrl(scene, splitLook) : null), [scene, splitLook])
  const shots = useLoadedShots(canShowImage ? shotUrls : NO_SHOTS)
  const [shotIndex, setShotIndex] = useState(0)
  const [isDeveloped, setIsDeveloped] = useState(false)
  const showImage = shots.length > 0
  const shot = shots[shotIndex % (shots.length || 1)]
  const zoom = useTransform(soft, (s) => 1 + 0.03 * s)
  useEffect(() => onImage?.(showImage), [showImage, onImage])
  useEffect(() => {
    if (isCalm || isPaused || shots.length < 2) return
    const t = setInterval(() => setShotIndex((i) => (i + 1) % shots.length), shotDuration(segment, shots.length))
    return () => clearInterval(t)
  }, [shots.length, isCalm, isPaused, segment])

  return (
    <motion.div className="v2-plate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: sec(crossfade), ease: EASING.move }}>
      <motion.div className="v2-plate-zoom" style={{ scale: zoom }}>
        <div className={`v2-pan ${isCalm ? '' : 'ken-burns'} ${isPaused ? 'is-paused' : ''}`}>
          {!isDeveloped && (
            <div className="v2-drawn">
              {isCalm ? (
                <img src={sceneUrl} alt="" className="v2-fill" />
              ) : (
                BANDS.map((b) => <Band key={b.cls} src={sceneUrl} cls={b.cls} depth={b.depth} pointer={pointer} />)
              )}
              {/* a contradiction: the right half takes the other account's grade */}
              <AnimatePresence>
                {splitUrl && (
                  <motion.img
                    key="split"
                    src={splitUrl}
                    alt=""
                    className="v2-fill"
                    initial={{ clipPath: 'inset(0% 0% 0% 100%)' }}
                    animate={{ clipPath: 'inset(0% 0% 0% 50%)' }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: sec(isCalm ? DURATION.quick : SIGNATURE.soften + SIGNATURE.swap + SIGNATURE.sharpen), ease: EASING.move }}
                  />
                )}
              </AnimatePresence>
              <Soft url={sceneUrl} soft={soft} />
            </div>
          )}
          {showImage && (
            <motion.div
              className="v2-ai"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: sec(isCalm ? DURATION.quick : DURATION.slow), ease: EASING.enter }}
              onAnimationComplete={() => setIsDeveloped(true)}
            >
              <AnimatePresence initial={false}>
                <motion.div key={shot} className="v2-shot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: sec(isCalm ? DURATION.quick : DURATION.slow), ease: EASING.move }}>
                  <img src={shot} alt={`Illustration: ${segment.title}`} className="print-color v2-fill" decoding="async" />
                  <Soft url={shot} soft={soft} />
                </motion.div>
              </AnimatePresence>
              <Tint look={look} splitLook={splitLook} />
              {/* the print develops: a dark wash lifts as the first image comes up */}
              {!isCalm && <motion.i aria-hidden="true" className="v2-develop" initial={{ opacity: 0.55 }} animate={{ opacity: 0 }} transition={{ duration: sec(DURATION.slow * 1.3), ease: EASING.enter }} />}
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

/** The out-of-focus copy: a tiny pre-blurred bitmap when it can be made, a CSS blur otherwise. */
function Soft({ url, soft }) {
  const [tiny, setTiny] = useState(() => softUrl(url))
  useEffect(() => {
    let isLive = true
    setTiny(softUrl(url))
    prepareSoft(url).then((t) => isLive && setTiny(t))
    return () => {
      isLive = false
    }
  }, [url])
  return <motion.img src={tiny || url} alt="" aria-hidden="true" className={`v2-fill v2-softimg ${tiny ? 'is-tiny' : ''}`} style={{ opacity: soft }} />
}

function Band({ src, cls, depth, pointer }) {
  const tx = useTransform(pointer.x, (v) => v * -depth)
  const ty = useTransform(pointer.y, (v) => v * -depth * 0.4)
  return <motion.img src={src} alt="" className={`v2-fill v2-band ${cls}`} style={{ x: tx, y: ty }} />
}

/**
 * @param {{ segment: object, look: object, splitLook?: object|null, imageUrl?: string|null, imageStatus: string,
 *   soft: import('motion/react').MotionValue<number>, isPulling: boolean, isCalm: boolean, isPaused?: boolean,
 *   isUngrounded?: boolean, status?: string|null }} props
 */
export default function Frame({ segment, look, splitLook = null, imageUrl, imageUrls, imageStatus, soft, isPulling, isCalm, isPaused = false, isUngrounded = false, children }) {
  const [hasImage, setHasImage] = useState(false)
  useEffect(() => setHasImage(false), [segment?.segment_id])
  const shotUrls = useMemo(() => {
    const list = (imageUrls || []).filter(Boolean)
    return list.length ? list : imageUrl ? [imageUrl] : NO_SHOTS
  }, [imageUrls, imageUrl])

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
            shotUrls={shotUrls}
            canShowImage={segment.is_grounded && (imageStatus === 'ready' || shotUrls.length > 0)}
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
      {/* the "ai generated" label is drawn by the player HUD, from the same image and voice state */}
      {!hasImage && segment?.is_grounded && imageStatus === 'loading' && <p className="v2-stage-badge v2-stage-wait" role="status">developing the illustration</p>}
      {children}
    </div>
  )
}
