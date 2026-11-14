// The lens ring: marks slide under a fixed index, like turning a focus ring to a distance mark.
// It repeats in both directions and always turns the short way. Each mark carries a small
// coverage ring that draws itself the first time that point of view is heard.
import { useState } from 'react'
import useMediaQuery from '../hooks/useMediaQuery.js'

const mod = (a, n) => ((a % n) + n) % n

/**
 * @param {{ perspectives: object[], activeId: string, waitingId?: string|null, heard: object, lookOf: Function,
 *   onSelect: (perspectiveId: string) => void, isBusy: boolean }} props
 */
export default function LensRing({ perspectives, activeId, waitingId = null, heard = {}, lookOf, onSelect, isBusy }) {
  const isNarrow = useMediaQuery('(max-width: 720px)')
  const slot = isNarrow ? 168 : 236
  const n = perspectives.length
  const i = Math.max(0, perspectives.findIndex((p) => p.perspective_id === activeId))
  const [pos, setPos] = useState(i)
  if (n && mod(pos, n) !== i) {
    let d = i - mod(pos, n)
    if (d > n / 2) d -= n
    if (d < -n / 2) d += n
    setPos(pos + d)
  }
  if (!n) return null
  const x = -(pos + 0.5) * slot
  const go = (d) => onSelect(perspectives[mod(i + d, n)].perspective_id)
  const span = Math.max(n, 5)
  const marks = Array.from({ length: span * 2 + 1 }, (_, k) => pos - span + k)
  const lo = pos - Math.floor((n - 1) / 2)

  return (
    <div
      className="v2-ring"
      role="radiogroup"
      aria-label="Point of view"
      aria-busy={isBusy}
      onKeyDown={(e) => {
        if (isBusy) return
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') (e.preventDefault(), go(1))
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') (e.preventDefault(), go(-1))
      }}
    >
      <div aria-hidden="true" className="v2-ring-ticks" style={{ transform: `translate3d(${x}px,0,0)` }} />
      <span aria-hidden="true" className="v2-ring-index" />
      <div className="v2-ring-marks" style={{ transform: `translate3d(${x}px,0,0)` }}>
        {marks.map((k) => {
          const p = perspectives[mod(k, n)]
          const id = p.perspective_id
          const isOn = k === pos
          const isReal = k >= lo && k < lo + n // one copy of each perspective is exposed to assistive tech
          const count = heard[id] || 0
          const isWaiting = isOn && waitingId === id
          return (
            <button
              key={k}
              type="button"
              role={isReal ? 'radio' : undefined}
              aria-checked={isReal ? isOn : undefined}
              aria-hidden={isReal ? undefined : true}
              tabIndex={isOn ? 0 : -1}
              disabled={isBusy && !isOn}
              ref={(el) => isOn && el && document.activeElement?.closest?.('.v2-ring') && el.focus({ preventScroll: true })}
              onClick={() => !isOn && onSelect(id)}
              className={`v2-mark ${isOn ? 'is-on' : ''} ${count ? '' : 'is-unheard'} ${isReal ? '' : 'is-ghost'}`}
              style={{ width: slot, left: k * slot, '--accent': lookOf(id).accent, '--n': mod(k, n) }}
            >
              <span className="v2-mark-name">
                <svg className="v2-cov" viewBox="0 0 16 16" aria-hidden="true">
                  <circle cx="8" cy="8" r="6" className="v2-cov-track" />
                  <circle cx="8" cy="8" r="6" className="v2-cov-fill" pathLength="1" style={{ strokeDashoffset: count ? 0 : 1 }} />
                </svg>
                {p.label}
              </span>
              <span className="v2-mark-sub">{isWaiting ? 'Finding this view' : isOn ? 'In focus' : count ? `Heard ${count}` : 'Not heard yet'}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
