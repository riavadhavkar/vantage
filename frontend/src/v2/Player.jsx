// The new player: a full-bleed stage with the story on glass over it, and a lens ring that
// decides who is telling it. Data and actions come from usePlayer (same calls as classic).
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useTransform } from 'motion/react'
import { FileText, Map as MapIcon, Maximize2, Minimize2, Pause, Play, Share2, Volume2, VolumeX, Waypoints } from 'lucide-react'
import usePlayer from './usePlayer.js'
import Frame from './Frame.jsx'
import Shutter from './Shutter.jsx'
import Logo from './Logo.jsx'
import LensRing from './LensRing.jsx'
import Evidence from './Evidence.jsx'
import Disagreement from './Disagreement.jsx'
import AskPill from '../components/AskPill.jsx'
import Subtitles from '../components/Subtitles.jsx'
import Ungrounded from '../components/Ungrounded.jsx'
import LanguagePopover from './LanguagePopover.jsx'
import useSubtitleText from '../hooks/useSubtitleText.js'
import useToast from '../hooks/useToast.js'
import { aiKindFor } from '../lib/aiKind.js'
import { messageFor } from '../api/errors.js'
import { DURATION, EASING } from '../constants/theme.js'
import { ms, sec } from '../lib/motionMode.js'
import { AiBadge, Btn, DataBadge, IconBtn, Sheet, Skeleton, Waiting } from './ui.jsx'
import { sourceLabel } from './labels.js'
import { CHOICE_TYPE_LABEL } from '../constants/labels.js'
import './player.css'
import './sketch.css'

// The graph and the map load on demand.
const Graph = lazy(() => import('./Graph.jsx'))
const TravelMap = lazy(() => import('./TravelMap.jsx'))
const ShareCard = lazy(() => import('./ShareCard.jsx'))
const Palette = lazy(() => import('./Palette.jsx'))

/** After this long behind the shutter, offer to go on with the drawn scene. */
const IMAGE_WAIT_MS = 20000

/** undefined while an image is loading, true once decoded, 'error' if it failed. */
function useDecoded(url) {
  const [state, setState] = useState({})
  useEffect(() => {
    if (!url) return
    let isLive = true
    const img = new Image()
    img.onload = () => isLive && setState((s) => ({ ...s, [url]: true }))
    img.onerror = () => isLive && setState((s) => ({ ...s, [url]: 'error' }))
    img.src = url
    return () => {
      isLive = false
    }
  }, [url])
  return url ? state[url] : undefined
}

export default function Player({ session, topic, isSoundOn, onToggleSound, language, onExit, dataSource, shouldReveal = false }) {
  // isHeld comes from the illustration gate below (the previous render's value, kept in state)
  const [isHeld, setIsHeld] = useState(false)
  const P = usePlayer({ session, topic, isSoundOn, isHeld, language })
  const { shown, pull, look, lookOf, isCalm, isLoading, pending } = P
  const isPulling = pull.phase !== 'idle'

  // The shutter holds a new scene until its illustration has loaded (decoded, not just requested).
  // It lets go when the image fails (the drawn scene stays), or when the viewer continues without it.
  const n = P.narration
  const [released, setReleased] = useState(() => new Set())
  const release = useCallback((id) => setReleased((r) => (r.has(id) ? r : new Set(r).add(id))), [])
  const decoded = useDecoded(n.imageStatus === 'ready' ? n.imageUrl : null)
  const liveId = shown && P.isCurrentShown && shown.is_grounded ? shown.segment_id : null
  const isMine = !!liveId && n.forId === liveId
  const waitsForImage =
    !!liveId &&
    !released.has(liveId) &&
    (isMine ? n.imageStatus === 'loading' || (n.imageStatus === 'ready' && decoded === undefined) : !!shown.scene_prompt && !shown.image_url)
  useEffect(() => {
    if (isMine && !waitsForImage && !released.has(liveId)) release(liveId)
  }, [isMine, waitsForImage, liveId, released, release])
  useEffect(() => setIsHeld(waitsForImage), [waitsForImage])
  const [slowId, setSlowId] = useState(null)
  useEffect(() => {
    if (!waitsForImage) return
    const t = setTimeout(() => setSlowId(liveId), ms(IMAGE_WAIT_MS))
    return () => clearTimeout(t)
  }, [waitsForImage, liveId])
  // Which scene has finished narrating. Keyed by scene, so an instant typewriter (reduced motion)
  // cannot be reset by a later effect, and a new scene never inherits "finished" from the last one.
  const [typedId, setTypedId] = useState(null)
  const shownId = shown?.segment_id
  const setIsTyped = useCallback((done) => setTypedId((id) => (done ? shownId : id === shownId ? null : id)), [shownId])
  const isTyped = typedId != null && typedId === shownId
  const voice = P.voice
  const subtitle = useSubtitleText(voice.segment, {
    narrationLanguage: voice.lang,
    subtitleLanguage: language.subtitleLanguage,
    source: shown?.is_grounded ? { text: shown.narrative_text || '', lang: language.sessionLanguage } : null,
  })
  const toast = useToast()
  // Narration language: applied in place, with a toast (the swap itself is in useVoicedSegment).
  const switching = useRef(null) // { code, audioUrl } while a narration change is being prepared
  const changeNarration = useCallback(
    (code) => {
      switching.current = { code, audioUrl: P.narration.audioUrl }
      language.setNarrationLanguage(code)
      toast.push(`switching narration to ${language.nameOf(code)}...`, { id: 'narration' })
    },
    [language, toast, P.narration.audioUrl],
  )
  // Confirmed once the new words are in and their voice has arrived (or there is no voice to wait for).
  useEffect(() => {
    const s = switching.current
    if (!s) return
    if (voice.status === 'failed') {
      toast.push(`narration in ${language.nameOf(s.code)} is unavailable right now. continuing in ${language.nameOf(voice.lang)}.`, { id: 'narration' })
      switching.current = null
    } else if (voice.lang === s.code && (P.narration.audioUrl !== s.audioUrl || P.narration.audioStatus === 'failed' || !s.audioUrl)) {
      toast.push(`narration is now in ${language.nameOf(s.code)}`, { id: 'narration' })
      switching.current = null
    }
  }, [voice.status, voice.lang, P.narration.audioUrl, P.narration.audioStatus, language, toast])
  // A translation that fails says so once, as a toast; the original text stays on screen.
  const failKey = subtitle.status === 'failed' ? `${shown?.segment_id}|${language.subtitleLanguage}` : null
  useEffect(() => {
    if (failKey) toast.push(`subtitles in ${language.nameOf(language.subtitleLanguage)} are unavailable right now. showing the original.`, { id: 'subtitles' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failKey])
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false)
  const closeTranscript = useCallback(() => setIsTranscriptOpen(false), [])
  const textOpacity = useTransform(pull.soft, (s) => 1 - 0.65 * s)

  // While the frame itself is changing, glass panels stop blurring what is behind them. Backdrop
  // blur over a moving full-screen layer is the most expensive thing on this page, and behind a
  // frame that is already soft or crossfading it is not visible anyway.
  const [isSettling, setIsSettling] = useState(false)
  useEffect(() => {
    setIsSettling(true)
    const t = setTimeout(() => setIsSettling(false), 900)
    return () => clearTimeout(t)
  }, [shownId])
  const isMoving = isPulling || isLoading || isSettling

  // Evidence: which source to open.
  const [evidence, setEvidence] = useState(null)
  const openEvidence = useCallback((sourceId, claim) => setEvidence({ sourceId: sourceId || null, claim: claim || null }), [])
  const closeEvidence = useCallback(() => setEvidence(null), [])
  useEffect(() => closeEvidence(), [shown?.segment_id, closeEvidence])

  // Graph and map sheets
  const [panel, setPanel] = useState(null) // 'graph' | 'map' | null
  const [isFull, setIsFull] = useState(false)
  const { setIsGraphOpen } = P
  useEffect(() => setIsGraphOpen(panel === 'graph'), [panel, setIsGraphOpen])
  const closePanel = useCallback(() => (setPanel(null), setIsFull(false)), [])
  // From the graph: reopen an earlier scene (or come back to the current one).
  const { viewScene } = P
  const lookBack = useCallback(
    (id) => {
      viewScene(id)
      setPanel(null)
      setIsFull(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [viewScene],
  )
  const [isSharing, setIsSharing] = useState(false)
  const closeShare = useCallback(() => setIsSharing(false), [])
  // Cmd+K / Ctrl+K
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const closePalette = useCallback(() => setIsPaletteOpen(false), [])

  if (!shown) return null
  const showNext = isTyped && P.isCurrentShown && !isPulling
  // A contradiction splits the frame: each half takes the grade of the account on that side.
  const dis = showNext && shown.is_grounded ? shown.contradiction : null
  const sideLook = (side) => lookOf(P.sourcesById[side.source_id]?.perspective)
  const waitingView = pending?.perspective && isPulling ? lookOf(pending.perspective).label : null
  const paletteItems = !isPaletteOpen
    ? []
    : [
        ...(isLoading || isPulling || P.isLookingBack ? [] : P.perspectives.filter((p) => p.perspective_id !== shown.perspective)).map((p) => ({
          id: `p-${p.perspective_id}`,
          group: 'switch to',
          label: p.label,
          color: lookOf(p.perspective_id).accent,
          hint: P.heard[p.perspective_id] ? `heard ${P.heard[p.perspective_id]}` : 'not heard yet',
          run: () => P.selectPerspective(p.perspective_id),
        })),
        ...(showNext && !isLoading && shown.is_grounded && !shown.is_final ? shown.choices : []).map((c) => ({
          id: `c-${c.choice_id}`,
          group: 'go to',
          label: c.label,
          color: lookOf(c.perspective).accent,
          hint: (CHOICE_TYPE_LABEL[c.choice_type] || '').toLowerCase(),
          run: () => P.doChoose(c),
        })),
        { id: 't-sources', group: 'open', label: 'how this was grounded', hint: 'sources', run: () => openEvidence() },
        { id: 't-graph', group: 'open', label: 'story connections', hint: 'graph', run: () => setPanel('graph') },
        { id: 't-map', group: 'open', label: 'map', hint: 'map', run: () => setPanel('map') },
        ...(shown.is_grounded ? [{ id: 't-share', group: 'open', label: 'share this moment', hint: 'image', run: () => setIsSharing(true) }] : []),
        ...P.sources
          .filter((src) => P.segments.some((seg) => seg.source_ids?.includes(src.source_id) || seg.claims?.some((c) => c.source_id === src.source_id)))
          .map((src) => ({
            id: `s-${src.source_id}`,
            group: 'source',
            label: src.title,
            hint: sourceLabel(src).toLowerCase(),
            run: () => openEvidence(src.source_id, shown.claims.find((c) => c.source_id === src.source_id)),
          })),
        { id: 't-sound', group: 'sound', label: isSoundOn ? 'turn sound off' : 'turn sound on', run: onToggleSound },
        { id: 't-exit', group: 'story', label: 'start a new topic', run: onExit },
      ]

  // The ring turns as soon as a view is asked for and keeps its target until the frame has caught up,
  // so it travels once: from the request to the moment the new scene is sharp.
  const known = (id) => (id && P.perspectives.some((p) => p.perspective_id === id) ? id : null)
  const ringTarget = known(pending?.perspective) || known(session.currentSegment?.perspective) || shown.perspective

  const narration = P.narration
  const aiKind = aiKindFor({ hasImage: narration.imageStatus === 'ready' && !!narration.imageUrl, hasVoice: narration.voiceSource === 'remote' })
  const hasPlayableVoice = narration.voiceSource === 'remote' || narration.voiceSource === 'device'
  const subtitleNote = subtitle.status === 'loading' ? 'translating...' : null
  const isTranslated = subtitle.status === 'ready'

  return (
    <main className={`v2-player is-sketch ${shouldReveal && !isCalm ? 'v2-reveal' : ''} ${isMoving ? 'is-moving' : ''}`} style={{ '--accent': look.accent }}>
      <Frame segment={shown} look={dis ? sideLook(dis.side_a) : look} splitLook={dis ? sideLook(dis.side_b) : null} imageUrl={narration.imageUrl} imageUrls={narration.imageUrls} imageStatus={narration.imageStatus} soft={pull.soft} isPulling={isPulling} isCalm={isCalm} isPaused={!!evidence || !!panel || isSharing || isTranscriptOpen} isUngrounded={!shown.is_grounded}>
        <AnimatePresence>
          {waitingView && <Shutter key="pull" variant="inline" message={`finding ${waitingView.toLowerCase()}...`} />}
        </AnimatePresence>
      </Frame>

      {/* top: wordmark and date | ask pill and title | five icons and the ai badge */}
      <header className="v2-hud">
        <div className="v2-hud-left">
          <button type="button" className="v2-brand v2-wordmark-btn" onClick={onExit} aria-label="vantage. start a new topic">
            <Logo size={24} />
            <span className="v2-wordmark-text">vantage</span>
          </button>
          <div className="v2-date-roll">
            <AnimatePresence mode="popLayout" initial={false}>
              {shown.date_label && (
                <motion.p
                  key={shown.date_label}
                  className="v2-date-text"
                  initial={{ opacity: 0, y: isCalm ? 0 : 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: isCalm ? 0 : -14 }}
                  transition={{ duration: sec(DURATION.panel), ease: EASING.enter }}
                >
                  {shown.date_label}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <DataBadge source={dataSource} className="v2-hud-databadge" />
        </div>

        <div className="v2-hud-center">
          <AskPill perspectives={P.perspectives} onSubmit={P.doAsk} isLoading={isLoading} />
          {shown.title && (
            <h2 key={shown.segment_id} className="v2-hud-title" lang={voice.lang}>
              {voice.segment?.title || shown.title}
            </h2>
          )}
          <DataBadge source={dataSource} className="v2-hud-databadge-narrow" />
          {aiKind && <AiBadge kind={aiKind} className="v2-hud-badge-narrow" />}
        </div>

        <div className="v2-hud-right">
          <div className="v2-tools" role="toolbar" aria-label="story tools">
            <IconBtn label="share" icon={Share2} isPressed={isSharing} onClick={() => shown.is_grounded && setIsSharing(true)} disabled={!shown.is_grounded} />
            <IconBtn label="story connections" icon={Waypoints} isPressed={panel === 'graph'} onClick={() => setPanel('graph')} />
            <IconBtn label="map" icon={MapIcon} isPressed={panel === 'map'} onClick={() => setPanel('map')} />
            <IconBtn label="sources" icon={FileText} badge={P.citedCount || null} isPressed={!!evidence} onClick={() => openEvidence()} />
            <IconBtn label={isSoundOn ? 'sound on' : 'sound off'} icon={isSoundOn ? Volume2 : VolumeX} onClick={onToggleSound} tip="left" />
            <LanguagePopover language={language} onNarrationChange={changeNarration} />
          </div>
          {aiKind && <AiBadge kind={aiKind} className="v2-hud-badge" />}
        </div>
      </header>

      {/* bottom: notes, disagreement, subtitles; then the ring */}
      <motion.div className="v2-lower" style={{ opacity: textOpacity }}>
        {P.isLookingBack && !isPulling && (
          <div className="v2-glass v2-back" role="status">
            <p>you are looking back at an earlier scene.</p>
            <Btn variant="quiet" onClick={() => viewScene(null)}>return to where you were</Btn>
          </div>
        )}
        {P.error && (
          <div role="alert" className="v2-glass v2-note v2-error">
            <p>{messageFor(P.error)}</p>
            {P.error.code === 'session_not_found' ? <Btn variant="quiet" onClick={onExit}>start again</Btn> : <Btn variant="quiet" onClick={P.retry}>try again</Btn>}
          </div>
        )}
        {pending && !pending.perspective && (
          <div className="v2-glass v2-asking">
            <Waiting
              message={pending.kind === 'ask' ? 'looking through the sources' : pending.kind === 'start' ? 'opening the archive' : 'tracing connections'}
              slowMessage="still working from the sources. this can take a few seconds."
            />
          </div>
        )}
        {dis && <Disagreement key={dis.contradiction_id || shown.segment_id} contradiction={dis} sourcesById={P.sourcesById} lookOf={lookOf} onOpenEvidence={(id) => openEvidence(id, shown.claims.find((c) => c.source_id === id))} isCalm={isCalm} />}
        {shown.is_grounded === false && !isPulling && <Ungrounded segment={shown} onRecover={P.recover} />}
        {/* choices are not shown as pills: the timeline and the ask bar move the story on */}
        {showNext && shown.is_final && (
            <div className="v2-glass v2-end">
              <p>this thread ends here.</p>
              <p>hear the same story from another side, or start again.</p>
              <div className="v2-end-actions">
                <Btn variant="quiet" onClick={P.recover} disabled={isLoading}>try another point of view</Btn>
                <Btn variant="ghost" onClick={() => setPanel('graph')}>see how it connects</Btn>
                <Btn variant="ghost" onClick={onExit}>start a new topic</Btn>
              </div>
            </div>
        )}

        <Subtitles
          text={subtitle.status === 'off' ? (shown.is_grounded ? voice.segment?.narrative_text || '' : '') : subtitle.text}
          lang={subtitle.lang}
          durationMs={narration.audioDurationMs}
          resetKey={shown.segment_id}
          isPlaying={narration.isPlaying}
          hasFinished={narration.hasFinished}
          isVisible={subtitle.status !== 'off' && !!shown.is_grounded}
          isActive={!isPulling && !waitsForImage && !voice.isHeld}
          onDoneChange={setIsTyped}
          onOpen={() => setIsTranscriptOpen(true)}
          note={subtitleNote}
        />

        <div className="v2-voice-row">
          {hasPlayableVoice ? (
            <IconBtn label={narration.isPlaying ? 'pause narration' : 'play narration'} icon={narration.isPlaying ? Pause : Play} onClick={narration.isPlaying ? narration.pause : narration.play} tip="above" />
          ) : narration.voiceSource === 'loading' ? (
            <span className="v2-voice-wait" role="status">preparing the voice...</span>
          ) : null}
          {narration.voiceSource === 'device' && <span className="v2-voice-wait">device voice</span>}
          {narration.audioStatus === 'failed' && !narration.voiceSource && shown.is_grounded && <span className="v2-voice-wait">narration audio is unavailable. subtitles only.</span>}
        </div>
      </motion.div>

      <div className="v2-ringwrap v2-ring-sketch">
        <LensRing
          perspectives={P.perspectives}
          activeId={ringTarget}
          waitingId={pending?.perspective || null}
          heard={P.heard}
          lookOf={lookOf}
          onSelect={P.selectPerspective}
          isBusy={isLoading || isPulling || P.isLookingBack}
        />
      </div>

      <Sheet tone="dark" isOpen={isTranscriptOpen} onClose={closeTranscript} title="transcript">
        <div className="v2-transcript">
          <h3>{shown.title}</h3>
          {subtitle.status !== 'off' && <p lang={subtitle.lang} className="v2-transcript-main">{subtitle.text}</p>}
          {isTranslated && (
            <>
              <h4>narration</h4>
              <p lang={voice.lang}>{voice.segment?.narrative_text}</p>
            </>
          )}
          <Btn variant="quiet" onClick={() => { setIsTranscriptOpen(false); openEvidence() }}>how this was grounded</Btn>
        </div>
      </Sheet>

      <Sheet
        tone="dark"
        isOpen={panel === 'graph'}
        onClose={closePanel}
        title="story connections"
        className={isFull ? 'is-full' : ''}
        headerExtra={<Btn variant="ghost" icon={isFull ? Minimize2 : Maximize2} aria-pressed={isFull} onClick={() => setIsFull((v) => !v)}>{isFull ? 'exit full view' : 'full view'}</Btn>}
      >
        {P.graphState === 'loading' && !P.hasGraphData ? (
          <div className="v2-sheet-wait">
            <Waiting message="tracing connections" slowMessage="still tracing connections. this can take a few seconds." />
            <Skeleton lines={3} />
          </div>
        ) : (
          <Suspense fallback={<div className="v2-sheet-wait"><Waiting message="tracing connections" /></div>}>
            <Graph nodes={P.graph.nodes} edges={P.graph.edges} currentSegmentId={P.graph.currentId} looks={P.looks} perspectives={P.perspectives} thumbs={P.thumbs} onSelectNode={lookBack} />
            {P.graphState === 'error' && <p className="v2-sheet-note" role="status">Showing the scenes seen so far. The full graph could not load.</p>}
          </Suspense>
        )}
      </Sheet>
      <Sheet
        tone="dark"
        isOpen={panel === 'map'}
        onClose={closePanel}
        title="map"
        subtitle={shown.location?.label || undefined}
        className={isFull ? 'is-full' : ''}
        headerExtra={<Btn variant="ghost" icon={isFull ? Minimize2 : Maximize2} aria-pressed={isFull} onClick={() => setIsFull((v) => !v)}>{isFull ? 'exit full view' : 'full view'}</Btn>}
      >
        <Suspense fallback={<div className="v2-sheet-wait"><Waiting message="unrolling the map" /></div>}>
          <TravelMap location={shown.location} travelFrom={shown.travel_from} isOffline={dataSource !== 'live' && dataSource !== 'mock'} />
        </Suspense>
      </Sheet>

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
      />

      <AnimatePresence>
        {waitsForImage && (
          <Shutter
            key="image"
            isInstant={P.segments.length <= 1}
            message={P.segments.length <= 1 ? 'opening the archive...' : 'developing the illustration...'}
            action={
              slowId === liveId ? (
                <button type="button" className="v2-link" onClick={() => release(liveId)}>
                  continue without the image
                </button>
              ) : null
            }
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPaletteOpen && (
          <Suspense fallback={null}>
            <Palette key="palette" items={paletteItems} onClose={closePalette} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSharing && (
          <Suspense fallback={null}>
            <ShareCard
              key="share"
              segment={shown}
              look={look}
              topicTitle={P.topic?.title || ''}
              imageUrl={n.imageStatus === 'ready' ? n.imageUrl : null}
              linkCode={session.linkCode}
              dataSource={dataSource}
              onClose={closeShare}
            />
          </Suspense>
        )}
      </AnimatePresence>

    </main>
  )
}
