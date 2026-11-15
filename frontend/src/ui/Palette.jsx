// Cmd+K (Ctrl+K): jump to a point of view, a next step, a source, or a tool by typing.
// It makes the whole player reachable from the keyboard in a few keystrokes.
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Search } from 'lucide-react'
import { DURATION, EASING, SPRING } from './theme.js'
import { sec, spring, useCalmMotion } from './motionMode.js'
import { Kbd } from './controls.jsx'
import './palette.css'

/** @param {{ items: {id: string, group: string, label: string, hint?: string, color?: string, run: () => void}[], onClose: () => void }} props */
export default function Palette({ items, onClose }) {
  const isCalm = useCalmMotion()
  const [query, setQuery] = useState('')
  const [at, setAt] = useState(0)
  const list = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    return items.filter((it) => words.every((w) => `${it.group} ${it.label} ${it.hint || ''}`.toLowerCase().includes(w)))
  }, [query, items])
  useEffect(() => setAt(0), [query])
  const opener = useRef(null)
  useEffect(() => {
    opener.current = document.activeElement
    return () => opener.current?.focus?.({ preventScroll: true })
  }, [])
  const run = (it) => {
    if (!it) return
    opener.current = null // the action decides where focus goes next
    onClose()
    it.run()
  }

  return (
    <motion.div className="ui-pal-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: sec(DURATION.quick) }}>
      <motion.div
        className="ui-pal"
        role="dialog"
        aria-modal="true"
        aria-label="jump to"
        initial={{ opacity: 0, y: isCalm ? 0 : 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: sec(DURATION.quick), ease: EASING.enter }}
      >
        <div className="ui-pal-in">
          <Search aria-hidden="true" size={18} strokeWidth={1.7} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="jump to..."
            aria-label="jump to"
            role="combobox"
            aria-expanded="true"
            aria-controls="ui-pal-list"
            aria-activedescendant={list[at] ? `ui-pal-${at}` : undefined}
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') (e.preventDefault(), setAt((n) => Math.min(list.length - 1, n + 1)))
              else if (e.key === 'ArrowUp') (e.preventDefault(), setAt((n) => Math.max(0, n - 1)))
              else if (e.key === 'Enter') (e.preventDefault(), run(list[at]))
              else if (e.key === 'Escape') (e.preventDefault(), onClose())
              else if (e.key === 'Tab') e.preventDefault() // focus stays in the field; arrows move the list
            }}
          />
          <Kbd>esc</Kbd>
        </div>
        <ul id="ui-pal-list" role="listbox" aria-label="results">
          {list.length === 0 && <li className="ui-pal-none">nothing matches.</li>}
          {list.map((it, n) => (
            <li
              key={it.id}
              id={`ui-pal-${n}`}
              role="option"
              aria-selected={n === at}
              className={n === at ? 'is-at' : ''}
              onMouseMove={() => n !== at && setAt(n)}
              onClick={() => run(it)}
              ref={(el) => n === at && el?.scrollIntoView({ block: 'nearest' })}
            >
              {/* row 48: one highlight slides between rows */}
              {n === at && <motion.span layoutId="ui-pal-at" className="ui-pal-at" transition={isCalm ? { duration: 0 } : spring({ ...SPRING, stiffness: 520, damping: 40 })} />}
              <span className="mono ui-pal-group">{it.group}</span>
              <span className="ui-pal-label" style={it.color ? { '--accent': it.color } : undefined}>
                {it.color && <i aria-hidden="true" />}
                {it.label}
              </span>
              {it.hint && <span className="mono ui-pal-hint">{it.hint}</span>}
            </li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  )
}
