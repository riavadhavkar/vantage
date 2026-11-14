// OWNER: Person B
// Six-blade aperture over the stage. Blades only translate and the group only rotates,
// so the whole transition is transform-only.
import { motion } from 'motion/react'
import { PULL_CLOSE_MS, PULL_OPEN_MS, EASE_FOCUS } from '../constants/theme.js'

const OPEN = 150
const CLOSED = 9

export default function Iris({ isClosed, children }) {
  const d = isClosed ? CLOSED : OPEN
  const transition = {
    duration: (isClosed ? PULL_CLOSE_MS : PULL_OPEN_MS) / 1000,
    ease: EASE_FOCUS,
  }
  return (
    <div className="pointer-events-none absolute inset-0 z-30" aria-hidden={!children}>
      <svg className="absolute inset-0 h-full w-full" viewBox="-100 -100 200 200" preserveAspectRatio="xMidYMid slice">
        <motion.g initial={{ rotate: 0 }} animate={{ rotate: isClosed ? 28 : 0 }} transition={transition}>
          {Array.from({ length: 6 }, (_, k) => (
            <g key={k} transform={`rotate(${k * 60})`}>
              <motion.g initial={{ y: OPEN }} animate={{ y: d }} transition={transition}>
                <rect x="-400" y="0" width="800" height="400" fill="#06131F" />
                <line x1="-400" y1="0" x2="400" y2="0" stroke="#EEF0EA" strokeOpacity="0.16" strokeWidth="0.5" />
              </motion.g>
            </g>
          ))}
        </motion.g>
      </svg>
      {children && <div className="absolute inset-0 flex items-end justify-center pb-[18%]">{children}</div>}
    </div>
  )
}
