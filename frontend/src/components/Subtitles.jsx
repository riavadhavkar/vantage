// Subtitles above the timeline: centered, large, at most two lines, advancing chunk by chunk
// in step with the narration. The clock always runs (even with subtitles off) so choices
// still appear when the narration ends. Tapping opens the full transcript.
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { TYPE_SPEED_MS } from '../constants/theme.js'
import { chunkText } from '../lib/chunkText.js'

/**
 * @param {{ text: string, lang: string, durationMs?: number|null, resetKey: string, isPlaying: boolean,
 *   hasFinished: boolean, isVisible: boolean, isActive: boolean, onDoneChange: (done: boolean) => void,
 *   onOpen: () => void, note?: string|null }} props
 */
export default function Subtitles({ text, lang, durationMs, resetKey, isPlaying, hasFinished, isVisible, isActive, onDoneChange, onOpen, note }) {
  const chunks = useMemo(() => chunkText(text), [text])
  const totalMs = Math.max(2000, durationMs || text.length * TYPE_SPEED_MS)
  const [elapsed, setElapsed] = useState(0)
  const [started, setStarted] = useState(false)
  const startedRef = useRef(false)

  // New segment: start over. Audio starting to play re-syncs the clock once.
  useEffect(() => {
    startedRef.current = false
    setStarted(false)
    setElapsed(0)
  }, [resetKey])
  useEffect(() => {
    if (isPlaying && !startedRef.current) {
      startedRef.current = true
      setStarted(true)
      setElapsed(0)
    }
  }, [isPlaying])

  const isPaused = !isActive || (started && !isPlaying && !hasFinished)
  useEffect(() => {
    if (isPaused) return
    let last = performance.now()
    const t = setInterval(() => {
      const now = performance.now()
      setElapsed((e) => e + (now - last))
      last = now
    }, 100)
    return () => clearInterval(t)
  }, [isPaused, resetKey])

  const done = hasFinished || elapsed >= totalMs
  useEffect(() => onDoneChange(done && isActive), [done, isActive, onDoneChange])

  // chunk i owns a share of the time proportional to its length
  const total = chunks.reduce((n, c) => n + c.length, 0) || 1
  const fraction = done ? 1 : Math.min(elapsed / totalMs, 0.9999)
  let acc = 0
  let index = 0
  for (let i = 0; i < chunks.length; i++) {
    acc += chunks[i].length / total
    if (fraction < acc) {
      index = i
      break
    }
    index = i
  }
  const chunk = chunks[index] || ''
  const hasMore = index < chunks.length - 1

  return (
    <div className="mx-auto w-full max-w-4xl px-4 text-center">
      {/* screen readers get the whole text at once; the visual text steps through it */}
      <p className="sr-only" lang={lang} aria-live="polite">
        {isActive && isVisible ? text : ''}
      </p>
      {isVisible && text && (
        <button type="button" onClick={onOpen} aria-label="open full transcript" className="block min-h-11 w-full cursor-pointer rounded-md px-2 py-1">
          <span aria-hidden="true" className="block min-h-[2lh]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={`${resetKey}-${index}-${lang}`}
                lang={lang}
                className="line-clamp-2 text-[21px] leading-[32px] font-medium text-balance text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.9),0_0_18px_rgb(10_30_48/0.9)] sm:text-[28px] sm:leading-[40px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                {chunk}
                {hasMore ? ' ...' : ''}
              </motion.span>
            </AnimatePresence>
          </span>
        </button>
      )}
      {note && (
        <p role="status" className="chrome mt-1 text-xs text-print/85">
          {note}
        </p>
      )}
    </div>
  )
}
