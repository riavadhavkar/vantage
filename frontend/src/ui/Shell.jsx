// Root of the interface: the landing page or the player, under one toast stack.
import '@fontsource-variable/archivo/wdth.css'
import './ui.css'
import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import Landing from './Landing.jsx'
import Player from './Player.jsx'
import Toaster from './Toaster.jsx'
import { useCalmMotion } from './motionMode.js'

export default function Shell({ isPlayer, session, topic, onStart, onExit, isSoundOn, onToggleSound, language }) {
  const isCalm = useCalmMotion()
  const [view, setView] = useState(isPlayer ? 'player' : 'landing')

  // Landing to player: the frame grows into the stage. Uses the View Transitions API where the
  // browser has it (Chrome 111, Safari 18, Firefox 144); otherwise the player reveals itself (see Player).
  useEffect(() => {
    const next = isPlayer ? 'player' : 'landing'
    if (next === view) return
    if (isCalm || !document.startViewTransition) return setView(next)
    document.documentElement.dataset.vt = next
    const vt = document.startViewTransition(() => flushSync(() => setView(next)))
    vt.finished.finally(() => delete document.documentElement.dataset.vt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlayer])

  return (
    <div className="ui">
      <Toaster>
        {view === 'player' && session.currentSegment ? (
          <Player session={session} topic={topic} isSoundOn={isSoundOn} onToggleSound={onToggleSound} onExit={onExit} language={language} shouldReveal={!document.startViewTransition} />
        ) : (
          <Landing onStart={onStart} isStarting={session.isLoading} error={session.error} language={language} />
        )}
      </Toaster>
    </div>
  )
}
