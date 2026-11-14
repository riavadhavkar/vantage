// OWNER: Person B
// The full-bleed stage: illustration (or a drawn scene), soft vignette, top and bottom scrims
// for the HUD, and paper source pins. Title, date, icons and subtitles are drawn by the Player
// over it. The perspective pull closes the iris over it.
import { useMemo } from 'react'
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

export default function Stage({ segment, grade, imageUrl, imageStatus, pull, pullMessage, sourcesById, onOpenSource }) {
  const reduce = useReducedMotion()
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
                <GradedImage
                  src={imageUrl}
                  grade={grade}
                  alt={segment.scene_prompt ? `Illustration: ${segment.title}` : ''}
                  shouldPan={!reduce}
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="vignette pointer-events-none absolute inset-0" />

      {/* scrims: legible HUD at the top, legible subtitles at the bottom */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-prussian/85 via-prussian/40 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-prussian/95 via-prussian/65 to-transparent" />

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
