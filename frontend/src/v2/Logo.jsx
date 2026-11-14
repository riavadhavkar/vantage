// The shutter mark. `isTurning` slowly rotates the blades (the loading screen); it stops under
// reduced motion through CSS.
import { LOGO_BLADES, LOGO_RING } from './logoMark.js'

export default function Logo({ size = 24, isTurning = false, className = '', title }) {
  return (
    <svg
      className={`v2-logo ${isTurning ? 'is-turning' : ''} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <circle cx={LOGO_RING.cx} cy={LOGO_RING.cy} r={LOGO_RING.r} />
      <path className="v2-logo-blades" d={LOGO_BLADES} />
    </svg>
  )
}
