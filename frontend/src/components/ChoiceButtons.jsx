// Choices arrive after the narration ends, as a centered row of pills above the subtitles.
import { motion, useReducedMotion } from 'motion/react'
import { CHOICE_TYPE_LABEL } from '../constants/labels.js'
import ApertureGlyph from './ApertureGlyph.jsx'
import { STAGGER_MS, EASE_FOCUS, FALLBACK_GRADE } from '../constants/theme.js'

export default function ChoiceButtons({ choices, onChoose, isVisible, grades = {}, isDisabled = false, pendingChoiceId = null }) {
  const reduce = useReducedMotion()
  if (!isVisible || !choices?.length) return null
  return (
    <nav aria-label="where to go next">
      <ul className="flex flex-wrap items-center justify-center gap-2 px-4">
        {choices.map((choice, i) => {
          const grade = grades[choice.perspective] || FALLBACK_GRADE
          const type = CHOICE_TYPE_LABEL[choice.choice_type]
          return (
            <motion.li
              key={choice.choice_id}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: reduce ? 0 : (i * STAGGER_MS) / 1000, ease: EASE_FOCUS }}
            >
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                disabled={isDisabled}
                onClick={() => onChoose(choice)}
                aria-label={type ? `${choice.label}. ${type.toLowerCase()}` : choice.label}
                className="inline-flex min-h-11 max-w-[28rem] items-center gap-2.5 rounded-full border border-print/40 bg-prussian/85 px-4 py-2 text-left text-sm font-medium text-print backdrop-blur-sm hover:bg-developer disabled:cursor-wait disabled:opacity-60"
              >
                <ApertureGlyph color={grade.text} isOpen={choice.choice_type === 'perspective_shift'} />
                <span>{pendingChoiceId === choice.choice_id ? 'opening...' : choice.label}</span>
              </motion.button>
            </motion.li>
          )
        })}
      </ul>
    </nav>
  )
}
