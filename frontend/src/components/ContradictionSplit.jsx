// OWNER: Person B
// Two accounts that disagree, split by a thin safelight divider.
import SourceTag from './SourceTag.jsx'

function Side({ side, label, source, onOpenSource }) {
  return (
    <div className="flex-1 p-4 sm:p-5">
      <p className="text-xs text-fog">{label}</p>
      <p className="mt-2 text-[16px] leading-[25px] text-print">{side.text}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SourceTag source={source} onOpen={() => onOpenSource(side.source_id)} />
        {source?.title && <span className="text-xs text-fog">{source.title}</span>}
      </div>
    </div>
  )
}

export default function ContradictionSplit({ contradiction, sourcesById = {}, onOpenSource }) {
  if (!contradiction) return null
  const { side_a, side_b } = contradiction
  return (
    <section aria-label="Sources disagree" className="rounded-md border border-safelight/40 bg-developer">
      <header className="flex items-start gap-3 border-b border-print/10 px-4 py-3 sm:px-5">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full border border-safelight/50 px-2 py-0.5 text-xs font-medium text-safelight-text">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-safelight" />
            Sources disagree
          </p>
          <p className="mt-2 text-[16px] font-medium leading-[24px] text-print">{contradiction.claim}</p>
        </div>
      </header>
      <div className="flex flex-col sm:flex-row">
        <Side side={side_a} label="One account" source={sourcesById[side_a.source_id]} onOpenSource={onOpenSource} />
        <div aria-hidden="true" className="mx-4 h-px bg-safelight/80 sm:mx-0 sm:my-4 sm:h-auto sm:w-px" />
        <Side side={side_b} label="Another account" source={sourcesById[side_b.source_id]} onOpenSource={onOpenSource} />
      </div>
      {contradiction.explanation && (
        <p className="border-t border-print/10 px-4 py-3 text-sm text-fog sm:px-5">
          <span className="text-print">Why they differ. </span>
          {contradiction.explanation}
        </p>
      )}
    </section>
  )
}
