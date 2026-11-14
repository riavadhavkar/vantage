// /lab/motion: every motion token, playable, so durations and curves can be judged by eye.
// Add ?motion=slow (3x) or ?motion=off (instant) to check the review flags.
import './lab.css'
import { useState } from 'react'
import { motion } from 'motion/react'
import { DURATION, EASING, SIGNATURE, SPRING, STAGGER_STEP_MS } from '../constants/theme.js'
import { MOTION_MODE, ms, sec, spring } from '../lib/motionMode.js'

const CSS_ROWS = [
  ...Object.entries(DURATION).map(([name, d]) => ({ label: `${name}, ${d} ms, enter`, duration: `var(--duration-${name})`, ease: 'var(--ease-enter)' })),
  { label: 'panel, 320 ms, move', duration: 'var(--duration-panel)', ease: 'var(--ease-move)' },
  { label: 'panel, 320 ms, exit', duration: 'var(--duration-panel)', ease: 'var(--ease-exit)' },
  { label: 'spring curve in CSS, 500 ms', duration: 'var(--duration-spring)', ease: 'var(--ease-spring)' },
]
const PHASES = ['soften', 'swap', 'sharpen']

export default function MotionBench() {
  const [isOn, setIsOn] = useState(false)
  const [phase, setPhase] = useState(-1)
  const play = () => {
    setIsOn((v) => !v)
    let at = 0
    PHASES.forEach((p, i) => {
      setTimeout(() => setPhase(i), ms(at))
      at += SIGNATURE[p]
    })
    setTimeout(() => setPhase(-1), ms(at))
  }
  return (
    <main className="lab bench">
      <header className="lab-head">
        <div>
          <h1>Motion bench</h1>
          <p>Every duration and easing token. Mode: {MOTION_MODE === 'normal' ? 'normal speed' : MOTION_MODE === 'slow' ? 'slow, 3x' : 'off, instant'}.</p>
        </div>
        <div className="lab-controls">
          <div className="lab-seg" role="group" aria-label="Speed">
            <a href="/lab/motion" aria-current={MOTION_MODE === 'normal' ? 'true' : undefined}>Normal</a>
            <a href="/lab/motion?motion=slow" aria-current={MOTION_MODE === 'slow' ? 'true' : undefined}>Slow 3x</a>
            <a href="/lab/motion?motion=off" aria-current={MOTION_MODE === 'off' ? 'true' : undefined}>Off</a>
          </div>
          <button type="button" className="lab-reload" onClick={play}>Play all</button>
        </div>
      </header>
      <ul className="bench-rows">
        {CSS_ROWS.map((r, i) => (
          <li key={r.label}>
            <span>{r.label}</span>
            <div className="bench-track"><i className={isOn ? 'is-on' : ''} style={{ transitionDuration: r.duration, transitionTimingFunction: r.ease, transitionDelay: `calc(var(--stagger) * ${i})` }} /></div>
          </li>
        ))}
        <li>
          <span>spring in Motion ({SPRING.stiffness} / {SPRING.damping} / {SPRING.mass})</span>
          <div className="bench-track"><motion.i animate={{ left: isOn ? 'calc(100% - 16px)' : '0%' }} transition={spring(SPRING)} /></div>
        </li>
        <li>
          <span>ease move in Motion, scene {DURATION.scene} ms</span>
          <div className="bench-track"><motion.i animate={{ left: isOn ? 'calc(100% - 16px)' : '0%' }} transition={{ duration: sec(DURATION.scene), ease: EASING.move }} /></div>
        </li>
        <li>
          <span>signature, {PHASES.map((p) => SIGNATURE[p]).join(' + ')} = 700 ms</span>
          <div className="bench-phases">{PHASES.map((p, i) => <b key={p} className={phase === i ? 'is-on' : ''} style={{ flexGrow: SIGNATURE[p] }}>{p}</b>)}</div>
        </li>
      </ul>
      <footer className="lab-foot">Rows start {STAGGER_STEP_MS} ms apart (the stagger step). Tokens live in src/constants/theme.js and the @theme block of src/index.css.</footer>
    </main>
  )
}
