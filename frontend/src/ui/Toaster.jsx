// One toast stack for the whole app: role="status" (a polite live region), about 4 seconds each,
// at most two on screen. A toast pushed with an id replaces the one with the same id, so
// "switching narration..." can turn into "narration is now in ..." in place.
import { useCallback, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ToastContext } from './useToast.js'
import { DURATION } from './theme.js'
import { sec, useCalmMotion } from './motionMode.js'

const LIFE_MS = 4000
const MAX = 2

export default function Toaster({ children }) {
  const isCalm = useCalmMotion()
  const [toasts, setToasts] = useState([])
  const timers = useRef({})
  const counter = useRef(0)

  const remove = useCallback((key) => {
    clearTimeout(timers.current[key])
    delete timers.current[key]
    setToasts((list) => list.filter((t) => t.key !== key))
  }, [])

  const push = useCallback(
    (text, { id } = {}) => {
      const key = id || `t${++counter.current}`
      clearTimeout(timers.current[key])
      timers.current[key] = setTimeout(() => remove(key), LIFE_MS)
      setToasts((list) => [...list.filter((t) => t.key !== key), { key, text }].slice(-MAX))
    },
    [remove],
  )
  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ui-toasts" role="status" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.p
              key={t.key}
              layout={!isCalm}
              className="ui-toast"
              initial={{ opacity: 0, y: isCalm ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: sec(DURATION.quick) }}
            >
              {t.text}
            </motion.p>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
