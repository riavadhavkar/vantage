// The study map: the whole story as a centre title and five branches (causes, key people, turning
// points, where sources disagree, consequences). Every point cites sources; a chip opens the
// evidence panel on that source, like the chips on the disagreement card.
import { motion } from 'motion/react'
import { DURATION, EASING, STAGGER_STEP_MS } from './theme.js'
import { sec, useCalmMotion } from './motionMode.js'
import { Btn, Waiting } from './controls.jsx'
import './studymap.css'

/** Branch accents. Never the only cue: each branch also has its name. */
const ACCENT = {
  causes: '#6F9BC4',
  people: '#C49A6C',
  turning_points: '#9DB29A',
  disagreements: '#FF6A4D',
  consequences: '#B49AAE',
}

export default function StudyMap({ analysis, sourcesById, onOpenSource, onRetry }) {
  const isCalm = useCalmMotion()

  if (analysis.state === 'idle' || analysis.state === 'loading')
    return (
      <div className="ui-smap-wait">
        <Waiting message="building the study map" slowMessage="reading the sources. about 20 seconds" />
      </div>
    )
  if (analysis.state === 'error')
    return (
      <div className="ui-smap-wait">
        <div role="alert" className="ui-note">
          <p>the study map could not be built right now.</p>
          <Btn variant="quiet" onClick={onRetry}>try again</Btn>
        </div>
      </div>
    )

  const { center, branches } = analysis.data
  return (
    <div className="ui-smap">
      <motion.h3
        className="ui-smap-center"
        initial={isCalm ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: sec(isCalm ? DURATION.quick : DURATION.panel), ease: EASING.enter }}
      >
        {center}
      </motion.h3>
      <ul className="ui-smap-branches">
        {branches.map((b, i) => (
          <motion.li
            key={b.id}
            className="ui-smap-branch"
            style={{ '--accent': ACCENT[b.id] || 'var(--text)' }}
            initial={isCalm ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: sec(isCalm ? DURATION.quick : DURATION.panel), delay: sec(isCalm ? 0 : DURATION.panel + i * STAGGER_STEP_MS), ease: EASING.enter }}
          >
            <h4>{b.label}</h4>
            {b.points.length === 0 ? (
              <p className="ui-smap-empty">sources say nothing here.</p>
            ) : (
              <ul>
                {b.points.map((p, k) => {
                  const cited = p.source_ids.filter((id) => sourcesById[id])
                  return (
                    <li key={k}>
                      <p>{p.text}</p>
                      {cited.length > 0 && (
                        <span className="ui-smap-chips">
                          {cited.map((id) => (
                            <button key={id} type="button" className="ui-chip ui-smap-chip" title={sourcesById[id].title} onClick={() => onOpenSource(id)}>
                              {sourcesById[id].title}
                            </button>
                          ))}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </motion.li>
        ))}
      </ul>
    </div>
  )
}
