// The timeline at the very bottom: tick marks, then one item per point of view.
// Not heard yet: lowercase and dimmer. In focus: bold. Heard: normal.
import { FALLBACK_GRADE } from '../constants/theme.js'

export default function TimelineStrip({ perspectives = [], current, grades = {}, heardCounts = {}, onSelect, isBusy }) {
  if (!perspectives.length) return null
  return (
    <nav aria-label="points of view" className="border-t border-print/25 bg-prussian/95 pb-[env(safe-area-inset-bottom)]">
      <div aria-hidden="true" className="h-2 bg-[repeating-linear-gradient(to_right,rgb(238_240_234/0.45)_0_1px,transparent_1px_12px)]" />
      <ul className="flex items-stretch gap-1 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:justify-center sm:gap-4 sm:px-8">
        {perspectives.map((p) => {
          const isCurrent = p.perspective_id === current
          const isHeard = (heardCounts[p.perspective_id] || 0) > 0
          const grade = grades[p.perspective_id] || FALLBACK_GRADE
          return (
            <li key={p.perspective_id} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(p)}
                disabled={isBusy && !isCurrent}
                aria-current={isCurrent ? 'true' : undefined}
                title={p.description || undefined}
                className={`chrome relative flex min-h-11 items-center gap-2 rounded-md px-3 text-sm hover:text-white disabled:cursor-wait ${
                  isCurrent ? 'font-bold text-white' : isHeard ? 'font-normal text-print' : 'font-normal text-fog'
                }`}
              >
                <span aria-hidden="true" className="absolute top-0 left-3 h-2 w-0.5" style={{ backgroundColor: isCurrent ? grade.text : 'rgb(238 240 234 / 0.5)' }} />
                {p.label}
                <span className="sr-only">{isCurrent ? ', in focus' : isHeard ? ', heard' : ', not heard yet'}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
