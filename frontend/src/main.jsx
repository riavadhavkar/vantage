// OWNER: Person B
import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/geist/wght.css'
import '@fontsource-variable/geist-mono/wght.css'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

const root = document.getElementById('root')
// The design lab (/lab, /lab/<id>, or ?lab=<id>) is a separate lazy chunk; the app itself is unchanged.
const lab = window.location.pathname.match(/^\/lab(?:\/([\w-]+))?\/?$/)
const labId = lab ? lab[1] || '' : new URLSearchParams(window.location.search).get('lab')

if (labId != null) {
  import('./lab/index.jsx').then((m) => m.mount(root, labId))
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  )
}
