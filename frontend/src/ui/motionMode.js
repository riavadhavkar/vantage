// Review flags for motion. ?motion=slow plays every animation at 3x so timing can be judged by eye.
// ?motion=off makes everything instant, with the same replacements as prefers-reduced-motion.
// CSS reads the scaled tokens from src/index.css; JS timers and Motion transitions use the helpers here.
import { useReducedMotion } from 'motion/react'

const param = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('motion') : null

/** 'normal' | 'slow' | 'off' */
export const MOTION_MODE = param === 'slow' || param === 'off' ? param : 'normal'
export const MOTION_SCALE = MOTION_MODE === 'slow' ? 3 : MOTION_MODE === 'off' ? 0 : 1

if (MOTION_MODE !== 'normal' && typeof document !== 'undefined') document.documentElement.dataset.motion = MOTION_MODE

/** Milliseconds for setTimeout and friends. */
export const ms = (n) => Math.round(n * MOTION_SCALE)
/** Seconds for Motion's `duration` and `delay`. */
export const sec = (n) => (n * MOTION_SCALE) / 1000
/** A Motion spring at the current speed. Slowing time by k divides stiffness by k squared and damping by k. */
export const spring = (s) =>
  MOTION_MODE === 'off'
    ? { duration: 0 }
    : MOTION_MODE === 'slow'
      ? { ...s, stiffness: s.stiffness / (MOTION_SCALE * MOTION_SCALE), damping: s.damping / MOTION_SCALE }
      : s

/** True when motion should be replaced by its calm version: the OS setting, or ?motion=off. */
export function useCalmMotion() {
  return !!useReducedMotion() || MOTION_MODE === 'off'
}
