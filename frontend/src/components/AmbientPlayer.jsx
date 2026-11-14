// OWNER: Person B
// Ambient bed by mood. Off until the viewer turns it on.
import useAmbientAudio from '../hooks/useAmbientAudio.js'

export default function AmbientPlayer({ mood, isOn, onToggle }) {
  const { isAvailable } = useAmbientAudio(mood, isOn)
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isOn}
      className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm text-print hover:bg-prussian/60"
      title={isOn && !isAvailable ? 'No ambient track for this mood' : undefined}
    >
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M1.5 9c1.5-3 3-3 4.5 0s3 3 4.5 0 3-3 4.5 0" opacity={isOn ? 1 : 0.5} />
      </svg>
      <span className="hidden lg:inline">{isOn ? (isAvailable ? 'Ambient on' : 'No ambient track') : 'Ambient off'}</span>
    </button>
  )
}
