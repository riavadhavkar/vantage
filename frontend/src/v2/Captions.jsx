// The caption card. Captions are always on: the typed text is the narration. Screen readers
// get the whole text at once. An ungrounded segment is never narrated; it gets an honest note.
import { useEffect, useMemo } from 'react'
import { motion } from 'motion/react'
import { FileText, Pause, Play } from 'lucide-react'
import useTypewriter from '../hooks/useTypewriter.js'
import { DURATION, EASING } from '../constants/theme.js'
import { sec } from '../lib/motionMode.js'
import { layoutText, matchClaims } from './claims.js'
import { AiBadge, Btn, IconBtn, Speaking } from './ui.jsx'
import { sourceLabel } from './labels.js'

function Ungrounded({ segment, onRecover }) {
  return (
    <div role="status" className="v2-ungrounded">
      <p>We could not ground this part in the sources, so we are not narrating it.</p>
      {segment.grounding_notes && <p className="v2-ungrounded-notes">{segment.grounding_notes}</p>}
      {onRecover && <Btn variant="quiet" onClick={onRecover}>Try another point of view</Btn>}
    </div>
  )
}

/**
 * @param {{ segment: object, isActive: boolean, isCalm: boolean, narration: object, sourcesById: object, lookOf: Function,
 *   textOpacity: import('motion/react').MotionValue<number>, onTyped: (done: boolean) => void,
 *   onOpenEvidence: (sourceId?: string, claim?: object, from?: Element) => void, onRecover?: Function }} props
 */
export default function Captions({ segment, isActive, isCalm, narration, sourcesById, lookOf, textOpacity, onTyped, onOpenEvidence, onRecover }) {
  const text = segment.is_grounded ? segment.narrative_text || '' : ''
  const { shown, isDone, complete } = useTypewriter(text, { isActive, isInstant: isCalm })
  const count = shown.length
  const sentences = useMemo(() => layoutText(text), [text])
  const cited = useMemo(() => matchClaims(sentences, segment.claims), [sentences, segment.claims])
  const sourceIds = useMemo(() => [...new Set([...(segment.claims || []).map((c) => c.source_id), ...(segment.source_ids || [])].filter(Boolean))], [segment])

  useEffect(() => {
    onTyped(segment.is_grounded ? isDone && isActive : isActive)
  }, [isDone, isActive, segment, onTyped])

  const { voiceSource, isPlaying, play, pause, audioStatus } = narration
  const hasVoice = voiceSource === 'remote' || voiceSource === 'device'

  return (
    <article className="v2-glass v2-card" aria-labelledby="v2-title">
      {segment.date_label && <p className="mono v2-date">{segment.date_label}</p>}
      <motion.h2
        id="v2-title"
        key={segment.segment_id}
        className="v2-title"
        style={{ opacity: textOpacity }}
        initial={isCalm ? false : { y: 8 }}
        animate={{ y: 0 }}
        transition={{ duration: sec(DURATION.panel), ease: EASING.enter }}
      >
        {segment.title}
      </motion.h2>

      {!segment.is_grounded ? (
        <Ungrounded segment={segment} onRecover={onRecover} />
      ) : (
        <>
          {/* screen readers get the whole text at once; the visual text reveals word by word */}
          <p className="v2-sr" aria-live="polite">{isActive ? text : ''}</p>
          <motion.p className="v2-captions" aria-hidden="true" style={{ opacity: textOpacity }} onClick={() => !isDone && complete()}>
            {sentences.map((s, i) => {
              const claim = cited.get(i)
              const isSaid = isDone || count >= s.end
              // While the text is still arriving, a tap anywhere finishes it; a sentence opens its source only after that.
              const open = claim && isDone ? (e) => (e.stopPropagation(), onOpenEvidence(claim.source_id, claim, e.currentTarget)) : undefined
              return (
                <span
                  key={i}
                  className={`v2-sent ${claim ? 'is-cited' : ''} ${isSaid ? 'is-said' : ''} ${open ? 'is-open' : ''}`}
                  style={claim ? { '--mark': lookOf(sourcesById[claim.source_id]?.perspective).accent } : undefined}
                  onClick={open}
                  title={open ? `Source: ${sourcesById[claim.source_id]?.title || 'open the evidence'}` : undefined}
                >
                  {s.words.map((w) => (
                    <span key={w.start} className={`v2-word ${isDone || w.start < count ? 'is-in' : ''}`}>{w.text}</span>
                  ))}
                </span>
              )
            })}
          </motion.p>

          <div className="v2-card-row">
            {hasVoice ? (
              <>
                <IconBtn label={isPlaying ? 'Pause narration' : 'Play narration'} icon={isPlaying ? Pause : Play} onClick={isPlaying ? pause : play} tip="above" />
                <Speaking isOn={isPlaying} />
                <AiBadge kind="voice" />
                {voiceSource === 'device' && <span className="mono v2-voice-note">Device voice</span>}
              </>
            ) : voiceSource === 'loading' ? (
              <span className="v2-voice-wait" role="status">Preparing the voice</span>
            ) : audioStatus === 'failed' ? (
              <span className="v2-voice-wait">Narration audio is unavailable. Captions only.</span>
            ) : null}
            <span className="v2-row-gap" />
            <Btn variant="quiet" icon={FileText} onClick={(e) => onOpenEvidence(undefined, undefined, e.currentTarget)}>
              Grounded in {sourceIds.length} {sourceIds.length === 1 ? 'source' : 'sources'}
            </Btn>
          </div>

          {isDone && isActive && sourceIds.length > 0 && (
            <ul className="v2-pins" aria-label="Evidence in this scene">
              {sourceIds.slice(0, 4).map((id, n) => {
                const source = sourcesById[id]
                return (
                  <li key={id}>
                    <button type="button" className="v2-chip v2-pin" style={{ '--n': n }} title={source?.title} onClick={(e) => onOpenEvidence(id, segment.claims.find((c) => c.source_id === id), e.currentTarget)}>
                      <span>{sourceLabel(source)}{source?.attribution ? ` · ${source.attribution}` : ''}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </article>
  )
}
