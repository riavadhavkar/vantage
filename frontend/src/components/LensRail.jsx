// OWNER: Person B
// Points of view, built from the topic's perspectives. The current lens is open;
// the others are stopped down, with how much of each you have heard.
import ApertureGlyph from './ApertureGlyph.jsx'
import { FALLBACK_GRADE } from '../constants/theme.js'

export default function LensRail({ perspectives = [], current, grades, heardCounts = {}, onSelect, isBusy, layout = 'rail' }) {
  if (!perspectives.length) return null
  const isRail = layout === 'rail'
  return (
    <nav aria-label="Points of view">
      {isRail && <h2 className="mb-3 text-sm text-fog">Points of view</h2>}
      <ul className={isRail ? 'flex flex-col gap-1' : 'flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none]'}>
        {perspectives.map((p) => {
          const grade = grades[p.perspective_id] || FALLBACK_GRADE
          const isCurrent = p.perspective_id === current
          const heard = heardCounts[p.perspective_id] || 0
          return (
            <li key={p.perspective_id} className={isRail ? '' : 'shrink-0'}>
              <button
                type="button"
                onClick={() => onSelect(p)}
                disabled={isBusy && !isCurrent}
                aria-current={isCurrent ? 'true' : undefined}
                title={p.description || undefined}
                className={`flex min-h-11 w-full items-center gap-3 rounded-md px-2 py-2 text-left disabled:cursor-wait ${
                  isCurrent ? 'bg-developer' : 'hover:bg-developer/60'
                }`}
              >
                <ApertureGlyph color={grade.text} isOpen={isCurrent} size={isRail ? 22 : 18} />
                <span className="flex flex-col">
                  <span className="text-sm font-medium" style={{ color: isCurrent ? grade.text : 'var(--color-print)' }}>
                    {p.label}
                  </span>
                  <span className="text-xs text-fog">
                    {isCurrent ? 'In focus' : heard > 0 ? `Heard ${heard}` : 'Not heard yet'}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
