// The shutter mark. `isTurning` slowly rotates the blades (the loading screen); it stops under
// reduced motion through CSS. The blades are clipped to the ring by a wrapper group, so the clip
// stays put while the blades inside it turn.
import { useId } from 'react'
import { LOGO_BLADES, LOGO_RING } from './logoMark.js'

export default function Logo({ size = 24, isTurning = false, className = '', title }) {
  // one clip per instance, so several logos on a page never share (or lose) an id
  const clipId = `logo-clip-${useId().replace(/:/g, '')}`
  return (
    <svg
      className={`ui-logo ${isTurning ? 'is-turning' : ''} ${className}`}
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
      <clipPath id={clipId}>
        <circle cx={LOGO_RING.cx} cy={LOGO_RING.cy} r={LOGO_RING.r} />
      </clipPath>
      <circle cx={LOGO_RING.cx} cy={LOGO_RING.cy} r={LOGO_RING.r} />
      <g clipPath={`url(#${clipId})`}>
        <path className="ui-logo-blades" d={LOGO_BLADES} />
      </g>
    </svg>
  )
}
