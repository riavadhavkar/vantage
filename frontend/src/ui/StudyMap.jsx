// The study map: the whole story as a centre title and five branches (causes, key people, turning
// points, where sources disagree, consequences). The sources behind it are listed underneath as
// pills; one opens the evidence panel on that source.
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

/** The model sometimes writes its source ids into the sentence, e.g. "[WHO2, WHOW5]". The chips already say that. */
const stripIds = (text) => text.replace(/\s*\[[A-Za-z]{1,6}\d+(?:\s*,\s*[A-Za-z]{1,6}\d+)*\]/g, '').trim()

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
  // The sources behind the map, each once, in the order they first appear.
  const order = []
  for (const b of branches) for (const pt of b.points) for (const id of pt.source_ids) if (sourcesById[id] && !order.includes(id)) order.push(id)
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
                  return (
                    <li key={k}>
                      <p>{stripIds(p.text)}</p>
                    </li>
                  )
                })}
              </ul>
            )}
          </motion.li>
        ))}
      </ul>
      {order.length > 0 && (
        <ul className="ui-smap-key" aria-label="sources">
          {order.map((id) => (
            <li key={id}>
              <button type="button" className="ui-smap-pill" onClick={() => onOpenSource(id)}>
                {sourcesById[id].title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
