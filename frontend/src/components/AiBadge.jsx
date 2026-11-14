// OWNER: Person B
// The one label for anything AI-generated. The player shows it whenever an AI illustration
// or AI narration is on screen. Solid enough to stay legible over any image (AA).
import { Sparkles } from 'lucide-react'

const COPY = {
  both: 'ai generated illustration and narration',
  image: 'ai generated illustration',
  voice: 'ai narration',
}

/** @param {{ kind?: 'both'|'image'|'voice', className?: string }} props */
export default function AiBadge({ kind = 'image', className = '' }) {
  return (
    <span
      className={`chrome inline-flex max-w-full items-center gap-1.5 rounded-full border border-print/25 bg-prussian/95 px-3 py-1 text-xs leading-[18px] text-print ${className}`}
    >
      <Sparkles aria-hidden="true" size={12} strokeWidth={1.75} className="shrink-0" />
      {COPY[kind]}
    </span>
  )
}
