// OWNER: Person B
export default function LoadingState({ message = 'Loading...', className = '', tone = 'dark' }) {
  return (
    <div role="status" aria-live="polite" className={`flex items-center gap-3 text-sm ${tone === 'paper' ? 'text-prussian' : 'text-fog'} ${className}`}>
      <span aria-hidden="true" className="relative block h-px w-10 overflow-hidden bg-current/25">
        <span className="loading-bar absolute inset-y-0 left-0 w-1/2 bg-current" />
      </span>
      <span>{message}</span>
    </div>
  )
}
