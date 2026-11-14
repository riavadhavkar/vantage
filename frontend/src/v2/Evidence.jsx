// Evidence lives on paper. Claims of this scene are numbered; each opens its source in place,
// with the quoted excerpt set in a serif (the one text on screen that Vantage did not write)
// and swept with a highlighter. Text only: this surface never shows a generated image.
import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { sourceLabel } from './labels.js'
import { Btn, Sheet, Skeleton, Waiting } from './ui.jsx'
import './evidence.css'

function SourceCard({ source, look, informed, citedFor }) {
  // The highlighter starts after the sheet has landed.
  const [isSwept, setIsSwept] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setIsSwept(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return (
    <div className="v2-src" style={{ '--mark': look.mark }}>
      <p className="mono v2-src-meta">{sourceLabel(source)}{look.label ? ` · ${look.label}` : ''}</p>
      <h4>{source.title}</h4>
      {source.excerpt && (
        <blockquote className="v2-quote">
          <mark className={isSwept ? 'is-swept' : ''}>{source.excerpt}</mark>
        </blockquote>
      )}
      <dl>
        {citedFor && (
          <>
            <dt>Cited for</dt>
            <dd>{citedFor}</dd>
          </>
        )}
        {source.attribution && (
          <>
            <dt>From</dt>
            <dd>{source.attribution}</dd>
          </>
        )}
        {source.license && (
          <>
            <dt>License</dt>
            <dd>{source.license}</dd>
          </>
        )}
        {informed.length > 0 && (
          <>
            <dt>Informed</dt>
            <dd>{informed.join(', ')}</dd>
          </>
        )}
      </dl>
      {source.url && (
        <a href={source.url} target="_blank" rel="noreferrer noopener" className="v2-src-link">
          Open the original
          <ArrowUpRight aria-hidden="true" size={14} />
        </a>
      )}
    </div>
  )
}

function Row({ id, isOpen, onToggle, number, text, source, look, informed, citedFor }) {
  return (
    <li className={`v2-ev-row ${isOpen ? 'is-open' : ''}`}>
      {number != null && <span className="mono v2-ev-n" aria-hidden="true">{number}</span>}
      <div className="v2-ev-main">
        {text && <p className="v2-ev-claim">{text}</p>}
        <button type="button" className="v2-ev-toggle" aria-expanded={isOpen} aria-controls={`ev-${id}`} onClick={onToggle}>
          <span className="v2-chip">
            {sourceLabel(source)}
            {source?.attribution ? ` · ${source.attribution}` : ''}
          </span>
          {!text && <span className="v2-ev-title">{source?.title || 'A cited source'}</span>}
          <ChevronDown aria-hidden="true" size={16} className="v2-ev-chev" />
        </button>
        <div id={`ev-${id}`} className="v2-ev-open" hidden={!isOpen}>
          {isOpen && source && <SourceCard source={source} look={look} informed={informed} citedFor={citedFor} />}
          {isOpen && !source && <p className="v2-ev-note">This source has not loaded yet.</p>}
        </div>
      </div>
    </li>
  )
}

function Body({ focus, segment, segments, sources, sourcesById, sourcesState, onRetry, lookOf }) {
  const claims = useMemo(() => segment.claims || [], [segment])
  const firstKey = () => {
    if (focus?.claim) return focus.claim.claim_id
    if (focus?.sourceId) return claims.find((c) => c.source_id === focus.sourceId)?.claim_id || `s-${focus.sourceId}`
    return claims[0]?.claim_id || (segment.source_ids?.[0] ? `s-${segment.source_ids[0]}` : null)
  }
  const [openKey, setOpenKey] = useState(firstKey)
  const toggle = (key) => setOpenKey((k) => (k === key ? null : key))
  const informedBy = (id) => segments.filter((s) => s.source_ids?.includes(id) || s.claims?.some((c) => c.source_id === id)).map((s) => s.title)

  const here = useMemo(() => new Set([...claims.map((c) => c.source_id), ...(segment.source_ids || [])]), [claims, segment])
  const heard = useMemo(() => new Set(segments.flatMap((s) => [...(s.source_ids || []), ...(s.claims || []).map((c) => c.source_id)])), [segments])
  const earlier = sources.filter((s) => heard.has(s.source_id) && !here.has(s.source_id))
  const rest = sources.filter((s) => !heard.has(s.source_id) && !here.has(s.source_id))
  const loose = (segment.source_ids || []).filter((id) => !claims.some((c) => c.source_id === id))

  const isLoading = sourcesState === 'loading' && sources.length === 0
  const hasError = sourcesState === 'error' && sources.length === 0

  return (
    <div className="v2-ev">
      {isLoading ? (
        <div className="v2-ev-wait">
          <Waiting message="Pulling the files" slowMessage="Still pulling the files. This can take a few seconds." />
          <Skeleton lines={3} />
          <Skeleton lines={3} />
        </div>
      ) : hasError ? (
        <div role="alert" className="v2-note v2-ev-error">
          <p>The sources could not load.</p>
          <Btn variant="quiet" onClick={onRetry}>Try again</Btn>
        </div>
      ) : (
        <>
          <section aria-labelledby="ev-here">
            <h3 id="ev-here">In this scene</h3>
            {claims.length === 0 && loose.length === 0 && (
              <p className="v2-ev-note">{segment.is_grounded ? 'No sources yet. They appear here as the story cites them.' : 'Nothing here is narrated, because it could not be grounded in the sources.'}</p>
            )}
            <ol className="v2-ev-list">
              {claims.map((c, n) => (
                <Row
                  key={c.claim_id}
                  id={c.claim_id}
                  number={n + 1}
                  text={c.text}
                  source={sourcesById[c.source_id]}
                  look={lookOf(sourcesById[c.source_id]?.perspective)}
                  informed={informedBy(c.source_id)}
                  isOpen={openKey === c.claim_id}
                  onToggle={() => toggle(c.claim_id)}
                />
              ))}
              {loose.map((id) => (
                <Row key={id} id={`s-${id}`} source={sourcesById[id]} look={lookOf(sourcesById[id]?.perspective)} informed={informedBy(id)} isOpen={openKey === `s-${id}`} onToggle={() => toggle(`s-${id}`)} />
              ))}
            </ol>
            {segment.grounding_notes && <p className="v2-ev-note">{segment.grounding_notes}</p>}
          </section>

          {earlier.length > 0 && (
            <section aria-labelledby="ev-earlier">
              <h3 id="ev-earlier">Cited earlier in this story</h3>
              <ul className="v2-ev-list">
                {earlier.map((s) => (
                  <Row key={s.source_id} id={`s-${s.source_id}`} source={s} look={lookOf(s.perspective)} informed={informedBy(s.source_id)} isOpen={openKey === `s-${s.source_id}`} onToggle={() => toggle(`s-${s.source_id}`)} />
                ))}
              </ul>
            </section>
          )}

          {rest.length > 0 && (
            <details className="v2-ev-rest">
              <summary>{rest.length} more {rest.length === 1 ? 'source' : 'sources'} in this topic, not cited yet</summary>
              <ul className="v2-ev-list">
                {rest.map((s) => (
                  <Row key={s.source_id} id={`s-${s.source_id}`} source={s} look={lookOf(s.perspective)} informed={[]} isOpen={openKey === `s-${s.source_id}`} onToggle={() => toggle(`s-${s.source_id}`)} />
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  )
}

/**
 * @param {{ focus: {sourceId?: string, claim?: object}|null, onClose: () => void, segment: object,
 *   segments: object[], sources: object[], sourcesById: object, sourcesState: string, onRetry: () => void,
 *   lookOf: Function }} props
 */
export default function Evidence({ focus, onClose, ...rest }) {
  return (
    <Sheet isOpen={!!focus} onClose={onClose} tone="paper" title="How this was grounded" subtitle="Evidence, not narration. No generated images appear here.">
      {focus && <Body focus={focus} {...rest} />}
    </Sheet>
  )
}
