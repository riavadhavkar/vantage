// Two sources that cannot both be right. Never color alone: the words "Sources disagree",
// the unequal-sign badge and the letters A and B carry it; color is the fourth cue.
// The two accounts slide in from opposite sides and meet at the divider, the badge pulses
// once, and only then does the explanation appear.
import { motion } from 'motion/react'
import { DURATION, EASING, STAGGER_STEP_MS } from '../constants/theme.js'
import { sec } from '../lib/motionMode.js'
import { sourceLabel } from './labels.js'

function Account({ letter, side, source, look, from, delay, isCalm, onOpen }) {
  return (
    <motion.div
      className="v2-dis-side"
      style={{ '--accent': look.accent }}
      initial={isCalm ? { opacity: 0 } : { opacity: 0, x: from }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: sec(isCalm ? DURATION.quick : DURATION.panel), delay: sec(delay), ease: EASING.enter }}
    >
      <p className="v2-dis-who">
        <span className="mono v2-dis-letter" aria-hidden="true">{letter}</span>
        Account {letter}{look.label ? ` · ${look.label}` : ''}
      </p>
      <p className="v2-dis-text">{side.text}</p>
      <button type="button" className="v2-chip" title={source?.title} onClick={() => onOpen(side.source_id)}>
        {sourceLabel(source)}{source?.attribution ? ` · ${source.attribution}` : ''}
      </button>
    </motion.div>
  )
}

export default function Disagreement({ contradiction, sourcesById, lookOf, onOpenEvidence, isCalm }) {
  const { side_a, side_b, claim, explanation } = contradiction
  const [a, b] = [sourcesById[side_a.source_id], sourcesById[side_b.source_id]]
  const meet = DURATION.panel + DURATION.panel + STAGGER_STEP_MS // card in, then the accounts
  return (
    <motion.section
      className="v2-glass v2-dis"
      aria-label="sources disagree"
      initial={isCalm ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: sec(isCalm ? DURATION.quick : DURATION.panel), ease: EASING.enter }}
    >
      <p className="v2-dis-flag">
        <span className="v2-dis-icon" aria-hidden="true" style={{ animationDelay: `calc(${sec(meet)}s)` }}>≠</span>
        Sources disagree
      </p>
      <h3>{claim}</h3>
      <div className="v2-dis-sides">
        <Account letter="A" side={side_a} source={a} look={lookOf(a?.perspective)} from={-24} delay={DURATION.panel} isCalm={isCalm} onOpen={onOpenEvidence} />
        <motion.i aria-hidden="true" className="v2-dis-seam" initial={{ scaleY: isCalm ? 1 : 0 }} animate={{ scaleY: 1 }} transition={{ duration: sec(DURATION.panel), delay: sec(DURATION.panel), ease: EASING.move }} />
        <Account letter="B" side={side_b} source={b} look={lookOf(b?.perspective)} from={24} delay={DURATION.panel + STAGGER_STEP_MS} isCalm={isCalm} onOpen={onOpenEvidence} />
      </div>
      {explanation && (
        <motion.p className="v2-dis-why" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: sec(DURATION.panel), delay: sec(isCalm ? 0 : meet + DURATION.scene / 2), ease: EASING.enter }}>
          <strong>why they differ. </strong>
          {explanation}
        </motion.p>
      )}
    </motion.section>
  )
}
