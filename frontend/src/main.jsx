// OWNER: Person B
import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/geist/wght.css'
import '@fontsource/noto-sans-devanagari/devanagari-400.css'
import './index.css'
import './lib/motionMode.js'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
