// OWNER: Person B
// The full-bleed stage: illustration (or a drawn scene), soft vignette, top and bottom scrims
// for the HUD, and paper source pins. Title, date, icons and subtitles are drawn by the Player
// over it. The perspective pull closes the iris over it.
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { sceneDataUrl, sceneKindFor, hashString } from '../lib/scene.js'
import { DEVELOP_MS, EASE_FOCUS } from '../constants/theme.js'
import GradedImage from './GradedImage.jsx'
import GradeLayers from './GradeLayers.jsx'
import Iris from './Iris.jsx'
import { pop, staggerParent } from '../lib/motion.js'
import SourceTag from './SourceTag.jsx'

// kept in the middle band so pins never sit under the top HUD or the subtitles
const PIN_SLOTS = [
  [14, 42],
  [40, 38],
  [64, 46],
  [24, 54],
  [52, 50],
  [76, 40],
]

function pinsFor(segment, sourcesById) {
  const seen = new Set()
  const pins = []
  for (const c of segment?.claims || []) {
    if (!c.source_id || seen.has(c.source_id)) continue
    seen.add(c.source_id)
    pins.push({ claim: c, source: sourcesById[c.source_id] || null })
  }
  if (!pins.length) {
    for (const id of segment?.source_ids || []) {
      pins.push({ claim: { claim_id: `${segment.segment_id}-${id}`, source_id: id, text: null }, source: sourcesById[id] || null })
    }
  }
  const used = new Set()
  return pins.slice(0, 3).map((p) => {
    let slot = hashString(p.claim.claim_id) % PIN_SLOTS.length
    while (used.has(slot)) slot = (slot + 1) % PIN_SLOTS.length
    used.add(slot)
    return { ...p, pos: PIN_SLOTS[slot] }
  })
}

const SHOT_MS_MIN = 3000
const SHOT_MS_MAX = 8000

export default function Stage({ segment, grade, imageUrl, imageUrls, imageStatus, pull, pullMessage, sourcesById, onOpenSource }) {
  const reduce = useReducedMotion()
  // several shots per scene, paced to the narration (about 2.6 words a second)
  const shots = useMemo(() => {
    const list = (imageUrls || []).filter(Boolean)
    return list.length ? list : imageUrl ? [imageUrl] : []
  }, [imageUrls, imageUrl])
  const shotMs = useMemo(() => {
    const words = (segment?.narrative_text || '').split(/\s+/).filter(Boolean).length
    const planned = Math.max(segment?.scene_prompts?.length || shots.length || 1, 1)
    return Math.max(SHOT_MS_MIN, Math.min(SHOT_MS_MAX, Math.round((words / 2.6) * 1000 / planned)))
  }, [segment, shots.length])
  const [shotIdx, setShotIdx] = useState(0)
  useEffect(() => setShotIdx(0), [segment?.segment_id])
  useEffect(() => {
    if (reduce || shots.length < 2) return undefined
    const t = setInterval(() => setShotIdx((i) => (i + 1) % shots.length), shotMs)
    return () => clearInterval(t)
  }, [shots.length, reduce, shotMs])
  const currentShot = shots[shotIdx % (shots.length || 1)] || imageUrl
  const sceneUrl = useMemo(
    () =>
      segment
        ? sceneDataUrl({ seed: segment.segment_id, kind: sceneKindFor(`${segment.scene_prompt || ''} ${segment.title}`), width: 1600, height: 900 })
        : null,
    [segment],
  )
  const pins = useMemo(() => pinsFor(segment, sourcesById), [segment, sourcesById])
  const showPins = segment?.is_grounded && pull === 'idle'

  return (
    <div className="absolute inset-0 overflow-hidden bg-prussian">
      <AnimatePresence initial={false}>
        {segment && (
          <motion.div
            key={segment.segment_id}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.2 : 0.6, ease: EASE_FOCUS }}
          >
            {/* drawn scene: present immediately, graded like any print */}
            <div className={`absolute inset-0 ${reduce ? '' : 'ken-burns'}`}>
              <img src={sceneUrl} alt="" className="print-gray absolute inset-0 h-full w-full object-cover" />
              <GradeLayers grade={grade} />
            </div>

            {/* the illustration develops out of the dark when it arrives */}
            {imageStatus === 'ready' && imageUrl && (
              <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: reduce ? 0.2 : DEVELOP_MS / 1000, ease: EASE_FOCUS }}
              >
                <AnimatePresence initial={false}>
                  <motion.div
                    key={currentShot}
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduce ? 0.2 : 1.4, ease: EASE_FOCUS }}
                  >
                    <GradedImage src={currentShot} grade={grade} alt={segment.scene_prompt ? `Illustration: ${segment.title}` : ''} shouldPan={!reduce} />
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="vignette pointer-events-none absolute inset-0" />

      {/* scrims: legible HUD at the top, legible subtitles at the bottom */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-prussian/90 via-prussian/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-prussian/95 via-prussian/75 to-transparent" />

      {showPins && (
        <motion.ul
          key={`pins-${segment.segment_id}`}
          className="absolute inset-0 z-10"
          aria-label="Evidence in this scene"
          variants={staggerParent(0.12, 0.5)}
          initial="hidden"
          animate="show"
        >
          {pins.map(({ claim, source, pos }) => (
            <motion.li
              key={claim.claim_id}
              variants={pop}
              className="absolute flex flex-col items-center"
              style={{ left: `${pos[0]}%`, top: `${pos[1]}%`, transformOrigin: '50% 100%' }}
            >
              <SourceTag source={source} onOpen={() => onOpenSource(claim.source_id, claim.text ? claim : null)} className="shadow-[0_1px_0_rgb(10_30_48/0.4)]" />
              <span aria-hidden="true" className="h-3 w-px bg-fiber/80" />
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-fiber" />
            </motion.li>
          ))}
        </motion.ul>
      )}

      {pull !== 'idle' && !reduce && (
        <Iris isClosed={pull === 'closing' || pull === 'closed'}>
          {pull === 'closed' && pullMessage ? <p className="text-sm text-fog">{pullMessage}</p> : null}
        </Iris>
      )}
      {pull !== 'idle' && reduce && pullMessage && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-prussian/80">
          <p className="text-sm text-fog">{pullMessage}</p>
        </div>
      )}
    </div>
  )
}
