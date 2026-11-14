// OWNER: Person B
// A small paper tag naming a source type. Paper = evidence, so tags are always fiber.
import { SOURCE_TYPE_LABEL } from '../constants/labels.js'

export default function SourceTag({ source, onOpen, className = '', label }) {
  const text = label || SOURCE_TYPE_LABEL[source?.source_type] || 'Source'
  const title = source?.title ? `Open source: ${source.title}` : 'Open source'
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${text}. ${title}`}
      title={source?.title}
      className={`on-paper inline-flex min-h-7 items-center rounded-[2px] border border-prussian/15 bg-fiber px-2 font-sans text-xs font-medium text-prussian hover:bg-white ${className}`}
    >
      {text}
    </button>
  )
}
