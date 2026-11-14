// OWNER: Person B
// Renders a segment's narration on the dark stage. The typed text is also the caption.
// An ungrounded segment is never narrated: it shows an honest fallback instead.
import { useEffect, useId, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import useTypewriter from '../hooks/useTypewriter.js'
import SourceTag from './SourceTag.jsx'
import ContradictionSplit from './ContradictionSplit.jsx'

function Grounding({ segment, sourcesById, onOpenSource }) {
  const [isOpen, setIsOpen] = useState(false)
  const id = useId()
  const count = new Set([...(segment.source_ids || []), ...segment.claims.map((c) => c.source_id)]).size
  return (
    <div className="mt-5">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={id}
        onClick={() => setIsOpen((v) => !v)}
        className="inline-flex min-h-11 items-center gap-2 text-sm text-print hover:text-white"
      >
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" className={isOpen ? 'rotate-90' : ''}>
          <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
        <span>
          Grounded in {count} {count === 1 ? 'source' : 'sources'}
          <span className="text-fog">. How this was grounded</span>
        </span>
      </button>
      {isOpen && (
        <div id={id} className="mt-2 border-l border-print/15 pl-4">
          {segment.claims.length === 0 && (
            <ul className="divide-y divide-print/10">
              {segment.source_ids.map((id) => (
                <li key={id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <p className="text-sm text-print">{sourcesById[id]?.title || 'A cited source'}</p>
                  <SourceTag source={sourcesById[id]} onOpen={() => onOpenSource(id)} className="self-start" />
                </li>
              ))}
            </ul>
          )}
          <ul className="divide-y divide-print/10">
            {segment.claims.map((c) => (
              <li key={c.claim_id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <p className="text-sm text-print">{c.text}</p>
                <SourceTag source={sourcesById[c.source_id]} onOpen={() => onOpenSource(c.source_id, c)} className="self-start" />
              </li>
            ))}
          </ul>
          {segment.grounding_notes && <p className="mt-2 text-xs text-fog">{segment.grounding_notes}</p>}
        </div>
      )}
    </div>
  )
}

function Ungrounded({ segment, onRecover }) {
  return (
    <div role="status" className="max-w-[64ch]">
      <div aria-hidden="true" className="mb-4 h-px w-16 bg-safelight" />
      <p className="text-[17px] leading-[27px] text-print sm:text-[19px] sm:leading-[30px]">
        We could not ground this part in the sources, so we are not narrating it.
      </p>
      {segment.grounding_notes && <p className="mt-3 text-sm text-fog">{segment.grounding_notes}</p>}
      {onRecover && (
        <button type="button" onClick={onRecover} className="mt-5 min-h-11 rounded-md border border-print/30 px-4 text-sm text-print hover:bg-developer">
          Try another point of view
        </button>
      )}
    </div>
  )
}

/**
 * @param {{ segment: object, isActive: boolean, sourcesById: object, onOpenSource: Function,
 *   onTypedChange?: (isDone: boolean) => void, onRecover?: Function }} props
 */
export default function NarrativeCard({ segment, isActive, sourcesById = {}, onOpenSource, onTypedChange, onRecover }) {
  const reduce = useReducedMotion()
  const text = segment?.is_grounded ? segment.narrative_text || '' : ''
  const { shown, isDone, complete } = useTypewriter(text, { isActive, isInstant: !!reduce })

  useEffect(() => {
    onTypedChange?.(segment?.is_grounded ? isDone && isActive : isActive)
  }, [isDone, isActive, segment, onTypedChange])

  if (!segment) return null
  if (!segment.is_grounded) return <Ungrounded segment={segment} onRecover={onRecover} />

  return (
    <article aria-labelledby={`seg-${segment.segment_id}`} className="max-w-[64ch]">
      <h3 id={`seg-${segment.segment_id}`} className="sr-only">
        {segment.title}
      </h3>
      {/* screen readers get the whole text at once; the visual text types out */}
      <p className="sr-only-live" aria-live="polite">
        {isActive ? text : ''}
      </p>
      <p
        aria-hidden="true"
        onClick={complete}
        className={`cursor-text text-[17px] leading-[27px] text-pretty text-print transition-opacity duration-200 sm:text-[19px] sm:leading-[30px] ${isActive ? '' : 'opacity-40'}`}
      >
        {shown}
        {!isDone && (
          <>
            <span className="caret ml-px inline-block h-[1em] w-px translate-y-[0.15em] bg-print" />
            <span className="invisible">{text.slice(shown.length)}</span>
          </>
        )}
      </p>
      {!isDone && isActive && (
        <button type="button" onClick={complete} className="mt-2 min-h-11 text-sm text-fog hover:text-print">
          Show all text
        </button>
      )}
      {isDone && (
        <>
          <Grounding segment={segment} sourcesById={sourcesById} onOpenSource={onOpenSource} />
          {segment.contradiction && (
            <div className="mt-6">
              <ContradictionSplit contradiction={segment.contradiction} sourcesById={sourcesById} onOpenSource={onOpenSource} />
            </div>
          )}
        </>
      )}
    </article>
  )
}
