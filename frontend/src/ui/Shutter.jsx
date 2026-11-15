// The shutter screen: the mark turning, and one bold line saying what is happening.
// `overlay` covers the whole stage (starting a story, waiting for an illustration);
// `inline` sits on the stage during a perspective pull, over the blurred frame.
import { motion } from 'motion/react'
import Logo from './Logo.jsx'
import { DURATION } from './theme.js'
import { sec, useCalmMotion } from './motionMode.js'

/** isInstant: appear without a fade (it takes over from the landing page's shutter). */
export default function Shutter({ message, variant = 'overlay', action = null, isInstant = false }) {
  const isCalm = useCalmMotion()
  return (
    <motion.div
      className={`ui-shutter is-${variant}`}
      initial={isInstant ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: sec(isCalm ? DURATION.quick : DURATION.panel) }}
    >
      <div className="ui-shutter-box" role="status" aria-live="polite">
        <Logo size={variant === 'overlay' ? 64 : 44} isTurning={!isCalm} />
        <p className="ui-shutter-text">{message}</p>
        {action}
      </div>
    </motion.div>
  )
}
