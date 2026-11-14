// The ask input: a pill with a microphone inside. The placeholder shuffles through the
// perspectives; it pauses while focused and stays still under reduced motion.
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import VoiceInputButton from './VoiceInputButton.jsx'

const ROTATE_MS = 4000

export default function AskPill({ perspectives = [], onSubmit, isLoading }) {
  const reduce = useReducedMotion()
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [index, setIndex] = useState(0)
  const phrases = useMemo(
    () => ['ask about this', ...perspectives.map((p) => `ask about ${String(p.label || '').toLowerCase()}`).filter((t) => t.length > 10)],
    [perspectives],
  )

  useEffect(() => {
    if (reduce || isFocused || value || phrases.length < 2) return
    const t = setInterval(() => setIndex((i) => (i + 1) % phrases.length), ROTATE_MS)
    return () => clearInterval(t)
  }, [reduce, isFocused, value, phrases.length])

  const phrase = reduce ? phrases[0] : phrases[index % phrases.length]

  const submit = (e) => {
    e.preventDefault()
    const q = value.trim()
    if (!q || isLoading) return
    setValue('')
    onSubmit(q)
  }

  return (
    <form onSubmit={submit} className="relative flex h-11 items-center rounded-full border border-print/35 bg-prussian/80 pl-4 backdrop-blur-sm focus-within:border-print/80">
      <label htmlFor="ask-input" className="sr-only">
        ask a question about this moment
      </label>
      <input
        id="ask-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoComplete="off"
        enterKeyHint="send"
        placeholder=""
        className="h-full min-w-0 flex-1 bg-transparent text-sm text-print focus:outline-none"
      />
      {/* the visible placeholder: crossfades between phrases */}
      {!value && (
        <span aria-hidden="true" className="chrome pointer-events-none absolute inset-y-0 left-4 right-14 flex items-center overflow-hidden text-sm text-print/85">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={phrase}
              className="truncate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              {phrase}
            </motion.span>
          </AnimatePresence>
        </span>
      )}
      <VoiceInputButton onTranscript={(t) => setValue(t)} isDisabled={isLoading} />
    </form>
  )
}
