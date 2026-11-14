// An ungrounded segment is never shown as normal narration: a safelight rule, a plain
// statement, and a way out. Not a subtitle.
import { motion } from 'motion/react'
import { rise } from '../lib/motion.js'

export default function Ungrounded({ segment, onRecover }) {
  return (
    <motion.div role="status" className="mx-auto max-w-[56ch] rounded-md border border-safelight/60 bg-prussian/90 px-5 py-4 text-center backdrop-blur-sm" {...rise(0.1)}>
      <p className="chrome text-xs font-medium text-safelight-text">not grounded</p>
      <p className="chrome mt-1 text-base text-print">we could not ground this part in the sources, so we are not narrating it.</p>
      {segment.grounding_notes && <p className="mt-2 text-sm text-fog">{segment.grounding_notes}</p>}
      {onRecover && (
        <button type="button" onClick={onRecover} className="chrome mt-3 min-h-11 rounded-full border border-print/40 px-4 text-sm text-print hover:bg-developer">
          try another point of view
        </button>
      )}
    </motion.div>
  )
}
