// OWNER: Person B
// Two accounts that disagree, split by a film tear lit in safelight red.
import { useMemo } from 'react'
import { rng } from '../lib/scene.js'
import SourceTag from './SourceTag.jsx'

function tearPath(seed, vertical) {
  const r = rng(seed)
  const pts = []
  const n = 26
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * 100
    const off = 50 + (r() - 0.5) * 70 + (i % 2 ? 18 : -18) * r()
    pts.push(vertical ? `${off.toFixed(1)},${t.toFixed(1)}` : `${t.toFixed(1)},${off.toFixed(1)}`)
  }
  return 'M' + pts.join(' L')
}

function Tear({ seed, vertical }) {
  const d = useMemo(() => tearPath(seed, vertical), [seed, vertical])
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={vertical ? 'h-full w-6' : 'h-6 w-full'}
    >
      <path d={d} fill="none" stroke="#D2402F" strokeOpacity="0.28" strokeWidth="9" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 9 }} />
      <path d={d} fill="none" stroke="#D2402F" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function Side({ side, label, source, onOpenSource }) {
  return (
    <div className="flex-1 p-4 sm:p-5">
      <p className="text-xs text-fog">{label}</p>
      <p className="mt-2 font-serif text-[17px] leading-[27px] text-print">{side.text}</p>
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
    <section aria-label="Sources disagree" className="rounded-[2px] border border-safelight/40 bg-developer">
      <header className="flex items-start gap-3 border-b border-print/10 px-4 py-3 sm:px-5">
        <span aria-hidden="true" className="mt-2.5 block h-px w-5 shrink-0 bg-safelight" />
        <div>
          <p className="text-sm text-safelight-text">The sources disagree</p>
          <p className="mt-1 font-serif text-[17px] leading-[26px] text-print">{contradiction.claim}</p>
        </div>
      </header>
      <div className="flex flex-col sm:flex-row">
        <Side side={side_a} label="One account" source={sourcesById[side_a.source_id]} onOpenSource={onOpenSource} />
        <div className="hidden sm:flex">
          <Tear seed={contradiction.contradiction_id} vertical />
        </div>
        <div className="flex px-4 sm:hidden">
          <Tear seed={contradiction.contradiction_id} vertical={false} />
        </div>
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
