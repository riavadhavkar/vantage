// OWNER: Person B
// The one label for anything AI-generated. Used inside GradedImage and next to narration controls.
const COPY = {
  image: 'AI-generated illustration',
  voice: 'AI narration',
}

export default function AiBadge({ kind = 'image', className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[2px] bg-prussian/85 px-2 py-1 text-xs text-print ${className}`}
    >
      <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10">
        <path d="M5 0l1.2 3.8L10 5 6.2 6.2 5 10 3.8 6.2 0 5l3.8-1.2z" fill="currentColor" />
      </svg>
      {COPY[kind]}
    </span>
  )
}
