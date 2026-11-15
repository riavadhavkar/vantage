// OWNER: Person B
// Shared motion. Transforms and opacity only (cheap on phones). MotionConfig in App
// sets reducedMotion="user", so with reduced motion on, these become plain fades.
export const EASE = [0.2, 0.7, 0.1, 1]

export const rise = (delay = 0, y = 14) => ({
  initial: { opacity: 0, y },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: EASE },
})
