// Sources, on paper. "How this was grounded" first (each claim of this scene and the source behind
// it), then one collapsible card per source: its type, its role in this scene (backbone: cited by
// the most claims; supporting: the rest), the perspectives it informed, and the original.
// Text only: this surface never shows a generated image.
import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { sourceLabel } from './labels.js'
import { Btn, Sheet, Skeleton, Waiting } from './controls.jsx'
import './evidence.css'

function SourceCard({ source, role, informed, citedFor, mark, isOpen, onToggle }) {
  const id = `src-${source.source_id}`
  // the highlighter sweeps once the card is open
  const [isSwept, setIsSwept] = useState(false)
  useEffect(() => {
    if (!isOpen) return setIsSwept(false)
    const f = requestAnimationFrame(() => setIsSwept(true))
    return () => cancelAnimationFrame(f)
  }, [isOpen])
  return (
    <li className={`ui-scard ${isOpen ? 'is-open' : ''}`} style={{ '--mark': mark }}>
      <h4 className="ui-scard-h">
        <button type="button" className="ui-scard-toggle" aria-expanded={isOpen} aria-controls={id} onClick={onToggle}>
          <span className="ui-scard-type">{sourceLabel(source).toLowerCase()}</span>
          <span className="ui-scard-title">{source.title}</span>
          <ChevronDown aria-hidden="true" size={18} className="ui-scard-chev" />
        </button>
      </h4>
      <div id={id} className="ui-scard-body" hidden={!isOpen}>
        {isOpen && (
          <>
            {role && <p className={`ui-scard-role is-${role}`}>{role}</p>}
            <dl className="ui-scard-rows">
              <div>
                <dt>informed perspective</dt>
                <dd>{informed.length ? informed.join(', ') : 'not cited yet'}</dd>
              </div>
              {citedFor && (
                <div>
                  <dt>cited for</dt>
                  <dd className="is-data">{citedFor}</dd>
                </div>
              )}
            </dl>
            {source.excerpt && (
              <blockquote className="ui-quote">
                <mark className={isSwept ? 'is-swept' : ''}>{source.excerpt}</mark>
              </blockquote>
            )}
            {source.url && (
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="ui-src-link">
                open original
                <ArrowUpRight aria-hidden="true" size={15} />
                <span className="ui-sr"> (opens in a new tab)</span>
              </a>
            )}
            {(source.attribution || source.license) && (
              <p className="ui-scard-fine">
                {source.attribution && <span className="is-data">{source.attribution}</span>}
                {source.attribution && source.license && ' · '}
                {source.license && <span className="is-data">{source.license}</span>}
              </p>
            )}
          </>
        )}
      </div>
    </li>
  )
}

function Body({ focus, segment, segments, sources, sourcesById, sourcesState, onRetry, lookOf }) {
  const claims = useMemo(() => segment.claims || [], [segment])
  // this scene's sources in citation order, with how many claims each one backs
  const here = useMemo(() => {
    const ids = [...new Set([...claims.map((c) => c.source_id), ...(segment.source_ids || [])])].filter(Boolean)
    const counts = Object.fromEntries(ids.map((id) => [id, claims.filter((c) => c.source_id === id).length]))
    const top = ids.reduce((best, id) => (counts[id] > (counts[best] ?? -1) ? id : best), ids[0])
    return { ids, counts, backbone: top }
  }, [claims, segment])
  const heard = useMemo(() => new Set(segments.flatMap((s) => [...(s.source_ids || []), ...(s.claims || []).map((c) => c.source_id)])), [segments])
  const earlier = sources.filter((s) => heard.has(s.source_id) && !here.ids.includes(s.source_id))
  const rest = sources.filter((s) => !heard.has(s.source_id) && !here.ids.includes(s.source_id))

  // perspectives a source informed: the views of every scene that cited it, and its own
  const informedBy = (src) => {
    const views = segments.filter((s) => s.source_ids?.includes(src.source_id) || s.claims?.some((c) => c.source_id === src.source_id)).map((s) => s.perspective)
    if (src.perspective) views.push(src.perspective)
    return [...new Set(views)].map((p) => (lookOf(p).label || '').toLowerCase()).filter(Boolean)
  }
  const citedFor = (id) => claims.filter((c) => c.source_id === id).map((c) => c.text).join(' ')

  const [open, setOpen] = useState(() => new Set([focus?.sourceId || here.backbone].filter(Boolean)))
  const toggle = (id) => setOpen((o) => (o.has(id) ? (o.delete(id), new Set(o)) : new Set(o).add(id)))
  const openAndShow = (id) => {
    setOpen((o) => new Set(o).add(id))
    requestAnimationFrame(() => document.getElementById(`src-${id}`)?.closest('li')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }

  const isLoading = sourcesState === 'loading' && sources.length === 0
  const hasError = sourcesState === 'error' && sources.length === 0
  const card = (src, role) => (
    <SourceCard
      key={src.source_id}
      source={src}
      role={role}
      informed={informedBy(src)}
      citedFor={role ? citedFor(src.source_id) : null}
      mark={lookOf(src.perspective).mark}
      isOpen={open.has(src.source_id)}
      onToggle={() => toggle(src.source_id)}
    />
  )

  if (isLoading)
    return (
      <div className="ui-ev ui-ev-wait">
        <Waiting message="loading sources" />
        <Skeleton lines={3} />
      </div>
    )
  if (hasError)
    return (
      <div className="ui-ev">
        <div role="alert" className="ui-note ui-ev-error">
          <p>sources could not load.</p>
          <Btn variant="quiet" onClick={onRetry}>try again</Btn>
        </div>
      </div>
    )

  return (
    <div className="ui-ev">
      <div className="ui-ground">
        {!segment.is_grounded ? (
          <p className="ui-ev-note">not narrated. no sources back this part.</p>
        ) : claims.length === 0 && here.ids.length === 0 ? (
          <p className="ui-ev-note">no sources cited yet.</p>
        ) : (
          <ol className="ui-ground-list">
            {claims.map((c, i) => (
              <li key={c.claim_id}>
                <span className="mono ui-ev-n" aria-hidden="true">{i + 1}</span>
                <p className="is-data">{c.text}</p>
                {sourcesById[c.source_id] && (
                  <button type="button" className="ui-chip" onClick={() => openAndShow(c.source_id)}>
                    {sourceLabel(sourcesById[c.source_id]).toLowerCase()}
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
        {segment.grounding_notes && <p className="ui-ev-note is-data">{segment.grounding_notes}</p>}
      </div>

      {here.ids.length > 0 && (
        <section aria-label="sources for this scene">
          <ul className="ui-scards">
            {here.ids.map((id) =>
              sourcesById[id] ? card(sourcesById[id], id === here.backbone ? 'backbone' : 'supporting') : (
                <li key={id} className="ui-ev-note">source not loaded.</li>
              ),
            )}
          </ul>
        </section>
      )}

      {earlier.length > 0 && (
        <section aria-labelledby="ev-earlier">
          <h3 id="ev-earlier">cited earlier</h3>
          <ul className="ui-scards">{earlier.map((s) => card(s, null))}</ul>
        </section>
      )}

      {rest.length > 0 && (
        <details className="ui-ev-rest">
          <summary>
            {rest.length} more, not cited yet
          </summary>
          <ul className="ui-scards">{rest.map((s) => card(s, null))}</ul>
        </details>
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
    <Sheet isOpen={!!focus} onClose={onClose} tone="paper" title="sources">
      {focus && <Body key={focus.sourceId || 'all'} focus={focus} {...rest} />}
    </Sheet>
  )
}
