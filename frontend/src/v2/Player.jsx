// The new player: a full-bleed stage with the story on glass over it, and a lens ring that
// decides who is telling it. Data and actions come from usePlayer (same calls as classic).
import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, useTransform } from 'motion/react'
import { Aperture, FileText, Volume2, VolumeX } from 'lucide-react'
import usePlayer from './usePlayer.js'
import Frame from './Frame.jsx'
import Captions from './Captions.jsx'
import LensRing from './LensRing.jsx'
import Choices from './Choices.jsx'
import Evidence from './Evidence.jsx'
import Disagreement from './Disagreement.jsx'
import VoiceInputButton from '../components/VoiceInputButton.jsx'
import ContinueOnPhone from '../components/ContinueOnPhone.jsx'
import { DURATION, EASING, SPRING } from '../constants/theme.js'
import { sec, spring } from '../lib/motionMode.js'
import { Btn, DataBadge, IconBtn, Waiting } from './ui.jsx'
import './player.css'

export default function Player({ session, topic, isSoundOn, onToggleSound, onExit, dataSource, shouldReveal = false }) {
  const P = usePlayer({ session, topic, isSoundOn })
  const { shown, pull, look, lookOf, isCalm, isLoading, pending } = P
  const [isTyped, setIsTyped] = useState(false)
  useEffect(() => setIsTyped(false), [shown?.segment_id])
  const isPulling = pull.phase !== 'idle'
  const textOpacity = useTransform(pull.soft, (s) => 1 - 0.65 * s)

  // Row 21: the chosen row's dot grows into a wash over the frame.
  const [wash, setWash] = useState(null)
  const choose = useCallback(
    (choice, dot) => {
      const r = dot?.getBoundingClientRect()
      if (r && !isCalm) setWash({ id: choice.choice_id, x: r.left + r.width / 2, y: r.top + r.height / 2, color: lookOf(choice.perspective).accent })
      P.doChoose(choice)
    },
    [P, isCalm, lookOf],
  )

  // Evidence: which source to open, and (row 26) the chip that travels from the card to the paper.
  const [evidence, setEvidence] = useState(null)
  const [ghost, setGhost] = useState(null)
  const openEvidence = useCallback(
    (sourceId, claim, el) => {
      const fromChip = !!el?.classList?.contains('v2-pin') && !isCalm
      if (fromChip) {
        const r = el.getBoundingClientRect()
        setGhost({ label: el.textContent, from: { x: r.left, y: r.top }, to: null })
      }
      setEvidence({ sourceId: sourceId || null, claim: claim || null, fromChip })
    },
    [isCalm],
  )
  const landGhost = useCallback((to) => setGhost((g) => (g && to ? { ...g, to } : null)), [])
  const closeEvidence = useCallback(() => (setEvidence(null), setGhost(null)), [])
  useEffect(() => closeEvidence(), [shown?.segment_id, closeEvidence])

  const [question, setQuestion] = useState('')
  const submitQuestion = (e) => {
    e.preventDefault()
    const q = question.trim()
    if (!q || isLoading) return
    setQuestion('')
    P.doAsk(q)
  }

  if (!shown) return null
  const showNext = isTyped && P.isCurrentShown && !isPulling
  // A contradiction splits the frame: each half takes the grade of the account on that side.
  const dis = showNext && shown.is_grounded ? shown.contradiction : null
  const sideLook = (side) => lookOf(P.sourcesById[side.source_id]?.perspective)
  const waitingView = pending?.perspective && isPulling ? lookOf(pending.perspective).label : null
  // The ring turns as soon as a view is asked for and keeps its target until the frame has caught up,
  // so it travels once: from the request to the moment the new scene is sharp.
  const known = (id) => (id && P.perspectives.some((p) => p.perspective_id === id) ? id : null)
  const ringTarget = known(pending?.perspective) || known(session.currentSegment?.perspective) || shown.perspective

  return (
    <main className={`v2-player ${shouldReveal && !isCalm ? 'v2-reveal' : ''}`} style={{ '--accent': look.accent }}>
      <Frame segment={shown} look={dis ? sideLook(dis.side_a) : look} splitLook={dis ? sideLook(dis.side_b) : null} imageUrl={P.narration.imageUrl} imageStatus={P.narration.imageStatus} soft={pull.soft} isPulling={isPulling} isCalm={isCalm} isPaused={!!evidence} isUngrounded={!shown.is_grounded}>
        {shown.date_label && shown.is_grounded && !isPulling && (
          <p key={shown.segment_id} className="v2-titlecard" aria-hidden="true"><span>{shown.date_label}</span></p>
        )}
        {waitingView && (
          <div className="v2-stage-status">
            <Waiting message={`Finding ${waitingView.replace(/^The /, 'the ')}`} slowMessage="Still writing this view from the sources. It can take a few seconds." />
          </div>
        )}
      </Frame>

      <header className="v2-bar">
        <button type="button" className="v2-brand" onClick={onExit} aria-label="Vantage. Start a new topic">
          <Aperture aria-hidden="true" size={20} strokeWidth={1.6} />
          Vantage
        </button>
        <p className="v2-bar-topic">{P.topic?.title}</p>
        <span className="v2-bar-gap" />
        <DataBadge source={dataSource} />
        <IconBtn label="Sources" icon={FileText} badge={P.citedCount || null} isPressed={!!evidence} onClick={() => openEvidence()} />
        <IconBtn label={isSoundOn ? 'Sound on' : 'Sound off'} icon={isSoundOn ? Volume2 : VolumeX} isPressed={isSoundOn} onClick={onToggleSound} tip="left" />
      </header>

      <div className="v2-body">
        <Captions
          key={shown.segment_id}
          segment={shown}
          isActive={!isPulling}
          isCalm={isCalm}
          narration={P.narration}
          sourcesById={P.sourcesById}
          lookOf={lookOf}
          textOpacity={textOpacity}
          onTyped={setIsTyped}
          onOpenEvidence={openEvidence}
          onRecover={P.recover}
        />

        <motion.div className="v2-side" style={{ opacity: textOpacity }}>
          {dis && <Disagreement key={dis.contradiction_id || shown.segment_id} contradiction={dis} sourcesById={P.sourcesById} lookOf={lookOf} onOpenEvidence={(id) => openEvidence(id, shown.claims.find((c) => c.source_id === id))} isCalm={isCalm} />}
          {showNext &&
            (shown.is_final ? (
              <div className="v2-glass v2-end">
                <p>This thread ends here.</p>
                <p>Hear the same story from another side, or start again.</p>
                <div className="v2-end-actions">
                  <Btn variant="quiet" onClick={P.recover} disabled={isLoading}>Try another point of view</Btn>
                  <Btn variant="ghost" onClick={onExit}>Start a new topic</Btn>
                </div>
              </div>
            ) : (
              <Choices key={shown.segment_id} choices={shown.is_grounded ? shown.choices : []} lookOf={lookOf} onChoose={choose} isBusy={isLoading} pendingChoiceId={pending?.choiceId} isCalm={isCalm} />
            ))}
          {showNext && (
            <form className="v2-glass v2-ask" onSubmit={submitQuestion}>
              <label htmlFor="v2-ask" className="v2-sr">Ask a question about this moment</label>
              <input id="v2-ask" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about this moment" autoComplete="off" />
              <VoiceInputButton onTranscript={setQuestion} isDisabled={isLoading} />
              <Btn type="submit" variant="ghost" disabled={!question.trim() || isLoading} isLoading={pending?.kind === 'ask' && !pending?.perspective}>Ask</Btn>
            </form>
          )}
          <ContinueOnPhone linkCode={session.linkCode} />
        </motion.div>
      </div>

      <div className="v2-ringwrap">
        <LensRing
          perspectives={P.perspectives}
          activeId={ringTarget}
          waitingId={pending?.perspective || null}
          heard={P.heard}
          lookOf={lookOf}
          onSelect={P.selectPerspective}
          isBusy={isLoading || isPulling}
        />
      </div>

      <Evidence
        focus={evidence}
        onClose={closeEvidence}
        segment={shown}
        segments={P.segments}
        sources={P.sources}
        sourcesById={P.sourcesById}
        sourcesState={P.sourcesState}
        onRetry={P.loadSources}
        lookOf={lookOf}
        onGhost={landGhost}
        isGhosting={!!ghost}
      />
      {ghost?.to && (
        <motion.span
          aria-hidden="true"
          className="v2-chip v2-ghost"
          initial={{ x: ghost.from.x, y: ghost.from.y }}
          animate={{ x: ghost.to.x, y: ghost.to.y }}
          transition={spring(SPRING)}
          onAnimationComplete={() => setGhost(null)}
        >
          {ghost.label}
        </motion.span>
      )}

      <AnimatePresence>
        {wash && (
          <motion.i
            key={wash.id}
            aria-hidden="true"
            className="v2-wash"
            style={{ left: wash.x, top: wash.y, backgroundColor: wash.color }}
            initial={{ scale: 0.5, opacity: 0.5 }}
            animate={{ scale: 90, opacity: 0 }}
            transition={{ duration: sec(DURATION.scene), ease: EASING.enter }}
            onAnimationComplete={() => setWash(null)}
          />
        )}
      </AnimatePresence>
    </main>
  )
}
