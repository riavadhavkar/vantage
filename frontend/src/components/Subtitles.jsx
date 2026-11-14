// Subtitles above the timeline: centered, large, always ONE line, advancing phrase by phrase in
// step with the narration (audio_duration_ms when known, otherwise the typing speed). Phrases
// are measured with the subtitle's own font and re-measured when the width changes. The clock
// always runs (even with subtitles off) so the end of the narration is still known.
// Tapping opens the full transcript.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { TYPE_SPEED_MS } from '../constants/theme.js'
import { fitChunks } from '../lib/chunkText.js'

const MORE = ' ...'

/** Width of the text box and a measure() in its font; both follow resizes. */
function useMeasure() {
  const ref = useRef(null)
  const [box, setBox] = useState({ width: 0, font: '', fontsLoaded: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const read = () => {
      const cs = getComputedStyle(el)
      const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
      setBox((b) => (b.width === el.clientWidth && b.font === font ? b : { ...b, width: el.clientWidth, font }))
    }
    // web fonts change the metrics: measure again whenever one finishes loading
    const onFonts = () => setBox((b) => ({ ...b, fontsLoaded: b.fontsLoaded + 1 }))
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    document.fonts?.ready.then(onFonts)
    document.fonts?.addEventListener?.('loadingdone', onFonts)
    return () => (ro.disconnect(), document.fonts?.removeEventListener?.('loadingdone', onFonts))
  }, [])
  const measure = useMemo(() => {
    const ctx = document.createElement('canvas').getContext('2d')
    ctx.font = box.font
    return (t) => ctx.measureText(t).width
    // fontsLoaded is a dependency on purpose: the same font string measures differently once loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box.font, box.fontsLoaded])
  // measured: the width is known and the fonts have settled at least once
  return { ref, width: box.font ? box.width : 0, measure, isMeasured: !!box.font && box.width > 0 && box.fontsLoaded > 0 }
}

/**
 * @param {{ text: string, lang: string, durationMs?: number|null, resetKey: string, isPlaying: boolean,
 *   hasFinished: boolean, isVisible: boolean, isActive: boolean, onDoneChange: (done: boolean) => void,
 *   onOpen: () => void, note?: string|null }} props
 */
export default function Subtitles({ text, lang, durationMs, resetKey, isPlaying, hasFinished, isVisible, isActive, onDoneChange, onOpen, note }) {
  const { ref: boxRef, width, measure, isMeasured } = useMeasure()
  const chunks = useMemo(() => fitChunks(text, measure, width, MORE), [text, measure, width])
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
  const isShown = isVisible && !!text
  const hasMore = index < chunks.length - 1

  return (
    <div className="mx-auto w-full max-w-4xl px-4 text-center">
      {/* screen readers get the whole text at once; the visual text steps through it */}
      <p className="sr-only" lang={lang} aria-live="polite">
        {isActive && isVisible ? text : ''}
      </p>
      {/* the line box stays mounted (zero height when hidden) so its width and font can be measured */}
      <button
        type="button"
        onClick={onOpen}
        aria-label="open full transcript"
        aria-hidden={isShown ? undefined : true}
        tabIndex={isShown ? 0 : -1}
        className={`block w-full cursor-pointer rounded-md px-2 ${isShown ? 'min-h-11 py-1' : 'pointer-events-none h-0 overflow-hidden'}`}
      >
        <span
          ref={boxRef}
          aria-hidden="true"
          className="block overflow-hidden text-[21px] leading-[32px] font-medium text-ellipsis whitespace-nowrap text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.9),0_0_18px_rgb(10_30_48/0.9)] sm:text-[28px] sm:leading-[40px]"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={`${resetKey}-${index}-${lang}-${chunk}`}
              lang={lang}
              className="inline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {isMeasured ? chunk : ''}
              {isMeasured && hasMore ? MORE : ''}
            </motion.span>
          </AnimatePresence>
        </span>
      </button>
      {note && (
        <p role="status" className="chrome mt-1 text-xs text-print/85">
          {note}
        </p>
      )}
    </div>
  )
}
