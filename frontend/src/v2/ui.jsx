// Primitives for the new UI. Each has hover, focus, pressed, disabled and loading states in v2.css.
import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Sparkles, X } from 'lucide-react'
import { DURATION, EASING, SPRING } from '../constants/theme.js'
import { sec, spring, useCalmMotion } from '../lib/motionMode.js'

/** The only wording for AI-made media. Nothing in the new UI may reword or hide it. */
const AI_COPY = { image: 'AI-generated illustration', voice: 'AI narration' }
const SOURCE_COPY = {
  mock: 'Sample content for development, not live',
  demo: 'Cached demo, not live',
  offline: 'Offline mode. Playing the cached demo',
}

export function AiBadge({ kind = 'image', className = '' }) {
  return (
    <span className={`v2-badge ${className}`}>
      <Sparkles aria-hidden="true" size={12} strokeWidth={2} />
      {AI_COPY[kind]}
    </span>
  )
}

/** Cached or sample content is never presented as live. */
export function DataBadge({ source, className = '' }) {
  if (!SOURCE_COPY[source]) return null
  return (
    <p className={`v2-databadge ${className}`}>
      <span aria-hidden="true" />
      {SOURCE_COPY[source]}
    </p>
  )
}

export function Btn({ variant = 'quiet', isLoading = false, icon: Icon, children, className = '', ...rest }) {
  return (
    <button type="button" {...rest} disabled={rest.disabled || isLoading} aria-busy={isLoading || undefined} className={`v2-btn v2-btn-${variant} ${className}`}>
      {Icon && <Icon aria-hidden="true" size={16} strokeWidth={1.8} />}
      <span>{children}</span>
      {isLoading && <Dots />}
    </button>
  )
}

/** Icon-only control. `label` is its accessible name and its tooltip. */
export function IconBtn({ label, icon: Icon, isPressed, badge, className = '', tip = 'below', children, ...rest }) {
  return (
    <button type="button" {...rest} aria-label={label} aria-pressed={isPressed} data-tip={label} data-tip-side={tip} className={`v2-icon ${className}`}>
      {Icon ? <Icon aria-hidden="true" size={18} strokeWidth={1.7} /> : children}
      {badge != null && <span className="v2-icon-count">{badge}</span>}
    </button>
  )
}

export const Kbd = ({ children }) => <kbd className="v2-kbd">{children}</kbd>

/** Three dots joined by a line; a pulse travels along them while something is being fetched. */
export function Dots({ className = '' }) {
  return (
    <span aria-hidden="true" className={`v2-dots ${className}`}>
      <i />
      <i />
      <i />
    </span>
  )
}

/** Shows that the voice is speaking. It is not a measured level. */
export function Speaking({ isOn }) {
  return (
    <span aria-hidden="true" className={`v2-speaking ${isOn ? 'is-on' : ''}`}>
      <i />
      <i />
      <i />
    </span>
  )
}

export function Skeleton({ lines = 3, className = '' }) {
  return (
    <span aria-hidden="true" className={`v2-skeleton ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <i key={i} style={{ width: `${[92, 100, 64, 84][i % 4]}%` }} />
      ))}
    </span>
  )
}

/** A status line that says plainly when something is taking long. */
export function Waiting({ message, slowMessage, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!slowMessage) return
    const t = setTimeout(() => ref.current && (ref.current.textContent = slowMessage), 4000)
    return () => clearTimeout(t)
  }, [slowMessage])
  return (
    <p role="status" aria-live="polite" className={`v2-waiting ${className}`}>
      <Dots />
      <span ref={ref}>{message}</span>
    </p>
  )
}

/**
 * A sheet. `tone="paper"` is the evidence surface (side sheet on desktop, bottom sheet on phones);
 * `tone="dark"` is a tall bottom sheet for the graph and the map. Focus moves in, Escape closes,
 * and focus returns to whatever opened it.
 */
export function Sheet({ isOpen, onClose, title, subtitle, tone = 'paper', children, headerExtra, className = '' }) {
  const isCalm = useCalmMotion()
  return (
    <AnimatePresence>
      {isOpen && <SheetBody key="sheet" {...{ onClose, title, subtitle, tone, headerExtra, className, isCalm }}>{children}</SheetBody>}
    </AnimatePresence>
  )
}

function SheetBody({ onClose, title, subtitle, tone, children, headerExtra, className, isCalm }) {
  const closeRef = useRef(null)
  const panel = useRef(null)
  useEffect(() => {
    const opener = document.activeElement
    closeRef.current?.focus({ preventScroll: true })
    const onKey = (e) => {
      if (e.key === 'Escape') return onClose()
      if (e.key !== 'Tab' || !panel.current) return
      const items = panel.current.querySelectorAll('button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])')
      if (!items.length) return
      const [first, last] = [items[0], items[items.length - 1]]
      if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus())
      else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus())
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      opener?.focus?.({ preventScroll: true })
    }
  }, [onClose])
  const from = isCalm ? { opacity: 0 } : { opacity: 0, x: 'var(--sheet-x)', y: 'var(--sheet-y)' }
  return (
    <>
      <motion.div className="v2-scrim" aria-hidden="true" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: sec(DURATION.quick) }} />
      <motion.aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`v2-sheet v2-sheet-${tone} ${className}`}
        initial={from}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ ...from, transition: { duration: sec(DURATION.quick), ease: EASING.exit } }}
        transition={isCalm ? { duration: sec(DURATION.quick) } : spring(SPRING)}
      >
        <header className="v2-sheet-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {headerExtra}
          <button ref={closeRef} type="button" className="v2-icon" onClick={onClose} aria-label="Close">
            <X aria-hidden="true" size={18} strokeWidth={1.7} />
          </button>
        </header>
        <div className="v2-sheet-body">{children}</div>
      </motion.aside>
    </>
  )
}
