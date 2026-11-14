// The new player: a full-bleed stage with the story on glass over it.
import { useState } from 'react'
import { useTransform } from 'motion/react'
import { Aperture, Volume2, VolumeX } from 'lucide-react'
import usePlayer from './usePlayer.js'
import Frame from './Frame.jsx'
import Captions from './Captions.jsx'
import { DataBadge, IconBtn } from './ui.jsx'
import './player.css'

export default function Player({ session, topic, isSoundOn, onToggleSound, onExit, dataSource, shouldReveal = false }) {
  const P = usePlayer({ session, topic, isSoundOn })
  const { shown, pull, look, isCalm } = P
  const [, setIsTyped] = useState(false)
  const isPulling = pull.phase !== 'idle'
  const textOpacity = useTransform(pull.soft, (s) => 1 - 0.65 * s)
  if (!shown) return null

  return (
    <main className={`v2-player ${shouldReveal && !isCalm ? 'v2-reveal' : ''}`} style={{ '--accent': look.accent }}>
      <Frame segment={shown} look={look} imageUrl={P.narration.imageUrl} imageStatus={P.narration.imageStatus} soft={pull.soft} isPulling={isPulling} isCalm={isCalm} isUngrounded={!shown.is_grounded}>
        {shown.date_label && shown.is_grounded && !isPulling && (
          <p key={shown.segment_id} className="v2-titlecard" aria-hidden="true"><span>{shown.date_label}</span></p>
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
          lookOf={P.lookOf}
          textOpacity={textOpacity}
          onTyped={setIsTyped}
          onOpenEvidence={() => {}}
          onRecover={P.recover}
        />
        <div className="v2-side" />
      </div>
    </main>
  )
}
