// OWNER: Person B
// Choices arrive after the narration ends. Rows, not cards: an aperture in the
// choice's grade, the label, and what kind of step it is in plain words.
import { motion, useReducedMotion } from 'motion/react'
import { CHOICE_TYPE_LABEL } from '../constants/labels.js'
import ApertureGlyph from './ApertureGlyph.jsx'
import { STAGGER_MS, EASE_FOCUS, FALLBACK_GRADE } from '../constants/theme.js'


export default function ChoiceButtons({ choices, onChoose, isVisible, grades = {}, isDisabled = false, pendingChoiceId = null }) {
  const reduce = useReducedMotion()
  if (!isVisible || !choices?.length) return null
  return (
    <nav aria-label="Where to go next">
      <ul className="border-t border-print/12">
        {choices.map((choice, i) => {
          const grade = grades[choice.perspective] || FALLBACK_GRADE
          const isPending = pendingChoiceId === choice.choice_id
          return (
            <motion.li
              key={choice.choice_id}
              className="border-b border-print/12"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: reduce ? 0 : (i * STAGGER_MS) / 1000, ease: EASE_FOCUS }}
            >
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => onChoose(choice)}
                className="group relative flex min-h-14 w-full items-center gap-4 py-3 pr-2 pl-3 text-left hover:bg-developer/60 disabled:cursor-wait disabled:opacity-60"
                style={{ '--grade': grade.text }}
              >
                <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 bg-[var(--grade)] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
                <ApertureGlyph color={grade.text} isOpen={choice.choice_type === 'perspective_shift'} />
                <span className="flex-1 text-base font-medium text-print">{choice.label}</span>
                <span className="hidden shrink-0 text-sm text-fog sm:inline">
                  {isPending ? 'Opening...' : CHOICE_TYPE_LABEL[choice.choice_type] || ''}
                </span>
              </button>
            </motion.li>
          )
        })}
      </ul>
    </nav>
  )
}
