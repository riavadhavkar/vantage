// Where to go next. Rows arrive in a short stagger once the narration has finished. The row
// you choose stays lit and shows that it is working; the others step back.
import { motion } from 'motion/react'
import { CHOICE_TYPE_LABEL } from '../constants/labels.js'
import { DURATION, EASING, STAGGER_STEP_MS } from '../constants/theme.js'
import { sec } from '../lib/motionMode.js'
import { Dots } from './ui.jsx'

/**
 * @param {{ choices: object[], lookOf: Function, onChoose: (choice: object, dot: Element|null) => void,
 *   isBusy: boolean, pendingChoiceId?: string|null, isCalm: boolean }} props
 */
export default function Choices({ choices, lookOf, onChoose, isBusy, pendingChoiceId = null, isCalm }) {
  if (!choices?.length) return null
  return (
    <nav aria-label="Where to go next">
      <ul className="v2-choices">
        {choices.map((choice, i) => {
          const isPending = pendingChoiceId === choice.choice_id
          return (
            <motion.li
              key={choice.choice_id}
              initial={isCalm ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: sec(DURATION.panel), delay: sec(i * STAGGER_STEP_MS), ease: EASING.enter }}
            >
              <button
                type="button"
                className={`v2-glass v2-choice ${isPending ? 'is-pending' : ''}`}
                style={{ '--accent': lookOf(choice.perspective).accent }}
                disabled={isBusy}
                aria-busy={isPending || undefined}
                onClick={(e) => onChoose(choice, e.currentTarget.querySelector('.v2-choice-dot'))}
              >
                <span aria-hidden="true" className="v2-choice-dot" />
                <span className="v2-choice-label">{choice.label}</span>
                <span className="v2-choice-meta">
                  {isPending ? (
                    <>
                      <Dots />
                      Tracing connections
                    </>
                  ) : (
                    <>
                      {CHOICE_TYPE_LABEL[choice.choice_type] || 'Next'}
                      {lookOf(choice.perspective).label ? ` · ${lookOf(choice.perspective).label}` : ''}
                    </>
                  )}
                </span>
              </button>
            </motion.li>
          )
        })}
      </ul>
    </nav>
  )
}
