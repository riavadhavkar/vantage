// OWNER: Person B
export default function SoundToggle({ isOn, onToggle, className = '' }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isOn}
      className={`inline-flex min-h-11 items-center gap-2 rounded-[2px] px-2 text-sm text-print hover:bg-developer ${className}`}
    >
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M3 7h3l4-3v10l-4-3H3z" fill="currentColor" stroke="none" />
        {isOn ? (
          <>
            <path d="M12.5 6.5a3.5 3.5 0 010 5" />
            <path d="M14.5 4.5a6.5 6.5 0 010 9" />
          </>
        ) : (
          <path d="M12.5 7l4 4M16.5 7l-4 4" />
        )}
      </svg>
      {isOn ? 'Sound on' : 'Sound off'}
    </button>
  )
}
