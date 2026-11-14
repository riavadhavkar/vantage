// OWNER: Person B
// Honest demo: cached or sample content is never presented as live.
const COPY = {
  mock: 'Sample content for development, not live',
  demo: 'Cached demo, not live',
  offline: 'Offline mode. Playing the cached demo',
}

export default function DataSourceNote({ source, className = '' }) {
  if (!COPY[source]) return null
  return (
    <p className={`flex items-center gap-2 text-xs text-fog ${className}`}>
      <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full border border-fog" />
      {COPY[source]}
    </p>
  )
}
