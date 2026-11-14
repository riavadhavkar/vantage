// /lab: every direction side by side in live frames, with a viewport and view switcher.
import './lab.css'
import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Laptop, RotateCw, Smartphone, Tablet } from 'lucide-react'
import { DIRECTIONS } from './index.jsx'

const VIEWPORTS = [
  { id: 'both', label: 'Phone and laptop', frames: ['phone', 'laptop'] },
  { id: 'phone', label: 'Phone', icon: Smartphone, frames: ['phone'] },
  { id: 'tablet', label: 'Tablet', icon: Tablet, frames: ['tablet'] },
  { id: 'laptop', label: 'Laptop', icon: Laptop, frames: ['laptop'] },
]
const SIZES = { phone: [390, 844], tablet: [768, 1024], laptop: [1440, 900] }
const VIEWS = [
  { id: 'landing', label: 'Landing' },
  { id: 'player', label: 'Player' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'contradiction', label: 'Contradiction' },
]

function Frame({ id, name, kind, view, nonce, height }) {
  const [w, h] = SIZES[kind]
  const scale = height / h
  const src = `/lab/${id}?view=${view}${view === 'landing' ? '' : '&instant=1'}`
  return (
    <div className={`lab-frame lab-frame-${kind}`} style={{ width: w * scale, height }}>
      <iframe key={`${src}-${nonce}`} title={`${name}, ${view}, ${kind}`} src={src} width={w} height={h} style={{ transform: `scale(${scale})` }} loading="lazy" />
    </div>
  )
}

export default function LabIndex() {
  const [vp, setVp] = useState('both')
  const [view, setView] = useState('landing')
  const [nonce, setNonce] = useState(0)
  const frames = VIEWPORTS.find((v) => v.id === vp).frames
  // Frames scale to fit their column, so a phone and a laptop always sit side by side without scrolling.
  const probe = useRef(null)
  const [colW, setColW] = useState(720)
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setColW(e.contentRect.width))
    ro.observe(probe.current)
    return () => ro.disconnect()
  }, [])
  const ratio = frames.reduce((n, k) => n + SIZES[k][0] / SIZES[k][1], 0)
  const height = Math.round(Math.min(vp === 'laptop' ? 520 : 640, (colW - 16 * (frames.length - 1) - 2 * frames.length) / ratio))
  return (
    <main className="lab">
      <header className="lab-head">
        <div>
          <h1>Vantage design lab</h1>
          <p>Four directions on the same sample story. Every frame is live: click, type, and switch perspective inside it.</p>
        </div>
        <div className="lab-controls">
          <div className="lab-seg" role="radiogroup" aria-label="Screen">
            {VIEWS.map((v) => (
              <button key={v.id} type="button" role="radio" aria-checked={view === v.id} onClick={() => setView(v.id)}>{v.label}</button>
            ))}
          </div>
          <div className="lab-seg" role="radiogroup" aria-label="Viewport">
            {VIEWPORTS.map((v) => (
              <button key={v.id} type="button" role="radio" aria-checked={vp === v.id} onClick={() => setVp(v.id)}>
                {v.icon ? <v.icon aria-hidden="true" size={16} /> : null}{v.label}
              </button>
            ))}
          </div>
          <button type="button" className="lab-reload" onClick={() => setNonce((n) => n + 1)}><RotateCw aria-hidden="true" size={16} />Replay</button>
        </div>
      </header>
      <div className={`lab-grid lab-grid-${vp}`}>
        {DIRECTIONS.map((d) => (
          <section key={d.id} className="lab-dir" aria-labelledby={`lab-${d.id}`}>
            <header>
              <h2 id={`lab-${d.id}`}>{d.name}</h2>
              <p>{d.line}</p>
              <a href={`/lab/${d.id}`} target="_blank" rel="noreferrer">Open full screen<ArrowUpRight aria-hidden="true" size={14} /></a>
            </header>
            <div className="lab-frames" ref={d === DIRECTIONS[0] ? probe : undefined}>
              {frames.map((kind) => <Frame key={kind} id={d.id} name={d.name} kind={kind} view={view} nonce={nonce} height={height} />)}
            </div>
          </section>
        ))}
      </div>
      <footer className="lab-foot">Sample content from the bundled mock story. No network calls. Briefs, wireframes and scores are in frontend/design/DIRECTIONS.md. <a href="/lab/motion">Motion bench</a> shows the duration and easing tokens.</footer>
    </main>
  )
}
