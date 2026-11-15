import { useId } from 'react'

const selectClass =
  'chrome min-h-11 w-full rounded-md border border-print/30 bg-prussian px-3 text-sm text-print focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60'

export default function LanguageSelects({ languages, narration, subtitles, onNarration, onSubtitles, layout = 'row', className = '' }) {
  const uid = useId()
  return (
    <div className={`flex ${layout === 'row' ? 'flex-col gap-3 sm:flex-row sm:items-end' : 'flex-col gap-3'} ${className}`}>
      <div className="flex min-w-0 flex-col gap-1 sm:min-w-40">
        <label htmlFor={`${uid}-narration`} className="chrome text-xs text-print/85">
          narration
        </label>
        <select id={`${uid}-narration`} value={narration} onChange={(e) => onNarration(e.target.value)} className={selectClass}>
          {languages.map((l) => (
            <option key={l.code} value={l.code} lang={l.code}>
              {l.name.toLowerCase()}
            </option>
          ))}
        </select>
      </div>
      <div className="flex min-w-0 flex-col gap-1 sm:min-w-40">
        <label htmlFor={`${uid}-subtitles`} className="chrome text-xs text-print/85">
          subtitles
        </label>
        <select id={`${uid}-subtitles`} value={subtitles} onChange={(e) => onSubtitles(e.target.value)} className={selectClass}>
          <option value="off">off</option>
          <option value="same">same as narration</option>
          {languages.map((l) => (
            <option key={l.code} value={l.code} lang={l.code}>
              {l.name.toLowerCase()}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
