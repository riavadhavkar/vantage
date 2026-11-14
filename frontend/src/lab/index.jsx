// Design lab: four UI directions as live prototypes. Reached only at /lab and /lab/<id>
// (or ?lab=<id> on hosts without path rewrites). Nothing here is imported by the app.
import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { MotionConfig } from 'motion/react'

export const DIRECTIONS = [
  { id: 'aperture', name: 'Aperture', line: 'A dark stage you step into. Switching perspective pulls focus.', load: () => import('./aperture/Aperture.jsx') },
  { id: 'editorial', name: 'Editorial', line: 'A bright long read. Sources sit in the margin.', load: () => import('./editorial/Editorial.jsx') },
  { id: 'diff', name: 'Diff', line: 'A precise tool. Claims carry blame, conflicts are hunks.', load: () => import('./diff/Diff.jsx') },
  { id: 'stories', name: 'Stories', line: 'Full-screen cards. Tap to advance, swipe to change sides.', load: () => import('./stories/Stories.jsx') },
]

const LabIndex = lazy(() => import('./LabIndex.jsx'))

export function mount(rootEl, id) {
  const dir = DIRECTIONS.find((d) => d.id === id)
  const Page = dir ? lazy(dir.load) : LabIndex
  document.documentElement.dataset.lab = dir ? dir.id : 'index'
  document.title = dir ? `${dir.name} · Vantage lab` : 'Vantage design lab'
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <MotionConfig reducedMotion="user">
        <Suspense fallback={null}>
          <Page />
        </Suspense>
      </MotionConfig>
    </React.StrictMode>,
  )
}
