// OWNER: Person B
// Evidence lives on paper. Typed documents, the cited passage marked, and which
// parts of the story each source informed. Never shows generated images.
import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { SOURCE_TYPE_LABEL } from '../constants/labels.js'
import LoadingState from './LoadingState.jsx'
import { EASE_FOCUS, FALLBACK_GRADE } from '../constants/theme.js'
import { staggerParent, staggerChild } from '../lib/motion.js'

function SourceSheet({ source, grade, informed, isFocused, highlightClaim }) {
  const ref = useRef(null)
  useEffect(() => {
    if (isFocused) ref.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [isFocused])
  return (
    <motion.li variants={staggerChild(10)} ref={ref} className={`scroll-mt-4 border-t border-prussian/15 py-6 first:border-t-0 first:pt-2 ${isFocused ? '' : ''}`}>
      <p className="font-mono text-[12px] leading-[18px] text-prussian/80">
        {SOURCE_TYPE_LABEL[source.source_type] || 'Source'}
        {grade?.label ? ` · ${grade.label}` : ''}
      </p>
      <h3 className="mt-1 text-base font-semibold text-prussian">{source.title}</h3>
      {source.excerpt && (
        <blockquote className="mt-3 font-mono text-[14px] leading-[23px] text-prussian">
          <mark className="box-decoration-clone px-0.5 text-prussian" style={{ backgroundColor: isFocused ? grade.mark : 'transparent', boxShadow: isFocused ? 'none' : `inset 0 -0.35em 0 ${grade.mark}` }}>
            {source.excerpt}
          </mark>
        </blockquote>
      )}
      {isFocused && highlightClaim && (
        <p className="mt-3 font-mono text-[13px] leading-[20px] text-prussian/85">Cited for: {highlightClaim.text}</p>
      )}
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs text-prussian/85">
        {source.attribution && (
          <>
            <dt>Attribution</dt>
            <dd className="text-prussian">{source.attribution}</dd>
          </>
        )}
        {source.license && (
          <>
            <dt>License</dt>
            <dd className="text-prussian">{source.license}</dd>
          </>
        )}
        {informed.length > 0 && (
          <>
            <dt>Informed</dt>
            <dd className="text-prussian">{informed.join(', ')}</dd>
          </>
        )}
      </dl>
      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-3 inline-flex min-h-11 items-center text-sm text-prussian underline decoration-prussian/40 underline-offset-4 hover:decoration-prussian"
        >
          Open the original
        </a>
      )}
    </motion.li>
  )
}

/**
 * @param {{ sources: object[], isOpen: boolean, onToggle: () => void, focus: {sourceId: string, claim?: object}|null,
 *   segments: object[], grades: object, isLoading: boolean, isMobile: boolean }} props
 */
export default function SourcePanel({ sources = [], isOpen, onToggle, focus, segments = [], grades = {}, isLoading, isMobile, error }) {
  const reduce = useReducedMotion()
  const closeRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    closeRef.current?.focus({ preventScroll: true })
    const onKey = (e) => e.key === 'Escape' && onToggle()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onToggle])

  const ordered = focus?.sourceId
    ? [...sources].sort((a, b) => (a.source_id === focus.sourceId ? -1 : b.source_id === focus.sourceId ? 1 : 0))
    : sources

  const informedBy = (id) => segments.filter((s) => s.source_ids?.includes(id) || s.claims?.some((c) => c.source_id === id)).map((s) => s.title)
  const heardIds = new Set(segments.flatMap((s) => s.source_ids || []))
  const visible = ordered.filter((s) => heardIds.has(s.source_id) || s.source_id === focus?.sourceId)
  const rest = ordered.filter((s) => !visible.includes(s))

  const from = isMobile ? { y: '100%' } : { x: '100%' }
  const to = isMobile ? { y: 0 } : { x: 0 }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-40 bg-prussian/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            aria-hidden="true"
          />
          <motion.aside
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label="Sources"
            className={`on-paper fixed z-50 flex flex-col bg-fiber text-prussian ${
              isMobile ? 'inset-x-0 bottom-0 top-10 rounded-t-[2px]' : 'top-0 right-0 bottom-0 w-[440px] max-w-full'
            }`}
            initial={reduce ? { opacity: 0 } : from}
            animate={reduce ? { opacity: 1 } : to}
            exit={reduce ? { opacity: 0 } : from}
            transition={{ duration: reduce ? 0.2 : 0.45, ease: EASE_FOCUS }}
          >
            <header className="flex items-center justify-between border-b border-prussian/15 px-5 py-3">
              <div>
                <h2 className="text-[22px] font-semibold leading-[28px] tracking-[-0.02em]">Sources</h2>
                <p className="text-xs text-prussian/80">Evidence, not narration. Excerpts are set as typed.</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onToggle}
                className="min-h-11 min-w-11 rounded-md px-3 text-sm font-medium text-prussian hover:bg-prussian/10"
              >
                Close
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-5 pb-10">
              {isLoading && sources.length === 0 ? (
                <LoadingState tone="paper" message="Pulling the files..." slowMessage="Still pulling the files. This can take a few seconds." className="py-6" />
              ) : error && sources.length === 0 ? (
                <p className="py-6 text-sm">The sources could not load. Close this panel and try again.</p>
              ) : sources.length === 0 ? (
                <p className="py-6 text-sm">No sources yet. They appear here as the story cites them.</p>
              ) : (
                <>
                  {isLoading && <LoadingState tone="paper" message="Checking for new sources..." className="pt-4" />}
                  <motion.ul variants={staggerParent(0.07, 0.2)} initial="hidden" animate="show">
                    {visible.map((s) => (
                      <SourceSheet
                        key={s.source_id}
                        source={s}
                        grade={grades[s.perspective] || FALLBACK_GRADE}
                        informed={informedBy(s.source_id)}
                        isFocused={s.source_id === focus?.sourceId}
                        highlightClaim={s.source_id === focus?.sourceId ? focus?.claim : null}
                      />
                    ))}
                  </motion.ul>
                  {rest.length > 0 && (
                    <details className="mt-4 border-t border-prussian/15 pt-4">
                      <summary className="min-h-11 cursor-pointer text-sm font-medium">
                        {rest.length} more {rest.length === 1 ? 'source' : 'sources'} in this topic, not cited yet
                      </summary>
                      <motion.ul variants={staggerParent(0.05)} initial="hidden" animate="show">
                        {rest.map((s) => (
                          <SourceSheet key={s.source_id} source={s} grade={grades[s.perspective] || FALLBACK_GRADE} informed={[]} />
                        ))}
                      </motion.ul>
                    </details>
                  )}
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
