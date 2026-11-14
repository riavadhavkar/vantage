// OWNER: Person B
// A dark sheet for the graph and the map, with a full-view toggle.
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { EASE_FOCUS } from '../constants/theme.js'

export default function Sheet({ title, isOpen, onClose, children, canExpand = true }) {
  const reduce = useReducedMotion()
  const [isFull, setIsFull] = useState(false)
  const closeRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    closeRef.current?.focus({ preventScroll: true })
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.section
          role="dialog"
          aria-label={title}
          className={`fixed inset-x-0 z-40 flex flex-col border-t border-print/12 bg-prussian ${isFull ? 'top-0 bottom-0' : 'bottom-0 h-[min(64vh,640px)]'}`}
          initial={reduce ? { opacity: 0 } : { y: '100%' }}
          animate={reduce ? { opacity: 1 } : { y: 0 }}
          exit={reduce ? { opacity: 0 } : { y: '100%' }}
          transition={{ duration: reduce ? 0.2 : 0.4, ease: EASE_FOCUS }}
        >
          <header className="flex items-center justify-between gap-2 border-b border-print/10 px-4 py-2 sm:px-8">
            <h2 className="text-base font-medium text-print">{title}</h2>
            <div className="flex items-center gap-1">
              {canExpand && (
                <button type="button" onClick={() => setIsFull((v) => !v)} aria-pressed={isFull} className="min-h-11 rounded-md px-3 text-sm text-print hover:bg-developer">
                  {isFull ? 'Exit full view' : 'Full view'}
                </button>
              )}
              <button ref={closeRef} type="button" onClick={onClose} className="min-h-11 rounded-md px-3 text-sm text-print hover:bg-developer">
                Close
              </button>
            </div>
          </header>
          <div className="relative flex-1 overflow-hidden">{children}</div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
