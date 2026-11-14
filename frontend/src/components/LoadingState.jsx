// OWNER: Person B
// Backend calls can take several seconds. After SLOW_MS the message says so plainly.
import { useEffect, useState } from 'react'

const SLOW_MS = 4000

export default function LoadingState({ message = 'Loading...', slowMessage, className = '', tone = 'dark' }) {
  const [isSlow, setIsSlow] = useState(false)
  useEffect(() => {
    if (!slowMessage) return
    const t = setTimeout(() => setIsSlow(true), SLOW_MS)
    return () => clearTimeout(t)
  }, [slowMessage])
  return (
    <div role="status" aria-live="polite" className={`flex items-center gap-3 text-sm ${tone === 'paper' ? 'text-prussian' : 'text-fog'} ${className}`}>
      <span aria-hidden="true" className="relative block h-px w-10 shrink-0 overflow-hidden bg-current/25">
        <span className="loading-bar absolute inset-y-0 left-0 w-1/2 bg-current" />
      </span>
      <span>{isSlow && slowMessage ? slowMessage : message}</span>
    </div>
  )
}
