// OWNER: Person B
import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/gloock/latin-400.css'
import '@fontsource-variable/source-serif-4/opsz.css'
import '@fontsource-variable/hanken-grotesk/wght.css'
import '@fontsource/courier-prime/latin-400.css'
import '@fontsource/courier-prime/latin-700.css'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
