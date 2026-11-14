// Round icon button with a lowercase tooltip. Label is the accessible name; the tooltip
// shows on hover and on keyboard focus. 44px touch target.
import { forwardRef } from 'react'

const IconButton = forwardRef(function IconButton({ label, onClick, isPressed, badge, children, className = '', tipSide = 'bottom', ...rest }, ref) {
  return (
    <span className="group/tip relative inline-flex">
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={isPressed}
        className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-print/25 bg-prussian/70 text-print backdrop-blur-sm transition-colors hover:bg-developer aria-pressed:bg-developer aria-pressed:border-print/60 ${className}`}
        {...rest}
      >
        {children}
        {badge ? (
          <span aria-hidden="true" className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-print px-1 text-[11px] font-semibold leading-none text-prussian">
            {badge}
          </span>
        ) : null}
      </button>
      <span
        role="presentation"
        className={`chrome pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-prussian px-2 py-1 text-xs text-print opacity-0 shadow-lg ring-1 ring-print/20 transition-opacity group-focus-within/tip:opacity-100 group-hover/tip:opacity-100 max-md:hidden ${
          tipSide === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'
        }`}
      >
        {label}
      </span>
    </span>
  )
})

export default IconButton
