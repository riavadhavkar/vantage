// OWNER: Person B
// Shared motion. Transforms and opacity only (cheap on phones). MotionConfig in App
// sets reducedMotion="user", so with reduced motion on, these become plain fades.
export const EASE = [0.2, 0.7, 0.1, 1]

export const rise = (delay = 0, y = 14) => ({
  initial: { opacity: 0, y },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: EASE },
})

export const staggerParent = (stagger = 0.06, delayChildren = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren } },
})

export const staggerChild = (y = 12) => ({
  hidden: { opacity: 0, y },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
})

export const pop = {
  hidden: { opacity: 0, scale: 0.6, y: 6 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 420, damping: 24 } },
}

export const tap = { whileTap: { scale: 0.97 } }
