// OWNER: Person B
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react'
import LandingScreen from './components/LandingScreen.jsx'
import Player from './components/Player.jsx'
import useSession from './hooks/useSession.js'
import useLanguageSettings from './hooks/useLanguageSettings.js'
import { getTopic, resolveDataSource, getDataSource } from './api/client.js'
import { UI } from './lib/ui.js'
import { MOTION_MODE } from './lib/motionMode.js'

// The v2 interface (?ui=v2) is a separate chunk. It receives the same session and callbacks.
const V2App = lazy(() => import('./v2/V2App.jsx'))

export default function App() {
  const [dataSource, setDataSource] = useState(getDataSource())
  const [topic, setTopic] = useState(null)
  const [view, setView] = useState('landing')
  const [isSoundOn, setIsSoundOn] = useState(() => {
    try {
      return localStorage.getItem('vantage.sound') !== 'off'
    } catch {
      return true
    }
  })
  const lastTopic = useRef(null)
  const [isSourceKnown, setIsSourceKnown] = useState(false)
  const lang = useLanguageSettings(isSourceKnown)
  const isOfflineData = dataSource === 'demo' || dataSource === 'offline'
  // Offline, the cached story is English: narration cannot change and subtitles cannot translate.
  const narrationLanguage = isOfflineData ? 'en' : lang.narrationLanguage
  const language = { ...lang, narrationLanguage, isOffline: isOfflineData }
  const session = useSession()
  const reduce = useReducedMotion()
  const { startSession, reset } = session

  useEffect(() => {
    let isLive = true
    resolveDataSource()
      .then((src) => {
        if (!isLive) return
        setDataSource(src)
        setIsSourceKnown(true)
        return getTopic().then((t) => isLive && setTopic(t))
      })
      .catch(() => {})
    return () => {
      isLive = false
    }
  }, [])

  const toggleSound = useCallback(() => {
    setIsSoundOn((v) => {
      try {
        localStorage.setItem('vantage.sound', v ? 'off' : 'on')
      } catch {
        // storage can be blocked
      }
      return !v
    })
  }, [])

  const onStart = useCallback(
    async (text) => {
      lastTopic.current = text
      const data = await startSession(text, narrationLanguage)
      if (!data) return
      try {
        setTopic(await getTopic(data.session_id))
      } catch {
        // keep the landing topic
      }
      window.scrollTo(0, 0)
      setView('player')
    },
    [startSession, narrationLanguage],
  )

  // The language is fixed when a session starts, so a new narration language starts the story over.
  const onRestart = useCallback(
    async (code) => {
      if (!lastTopic.current) return
      lang.setNarrationLanguage(code)
      await startSession(lastTopic.current, code)
    },
    [startSession, lang],
  )

  const onExit = useCallback(() => {
    reset()
    setView('landing')
    window.scrollTo(0, 0)
  }, [reset])

  const isPlayer = view === 'player' && !!session.currentSegment

  if (UI === 'v2') {
    return (
      <MotionConfig reducedMotion={MOTION_MODE === 'off' ? 'always' : 'user'}>
        <Suspense fallback={null}>
          <V2App
            isPlayer={isPlayer}
            session={session}
            topic={topic}
            onStart={onStart}
            onExit={onExit}
            isSoundOn={isSoundOn}
            onToggleSound={toggleSound}
            dataSource={dataSource}
          />
        </Suspense>
      </MotionConfig>
    )
  }
  // Paper to screen: the dark stage opens like an aperture over the landing page.
  const screenIn = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
    : {
        initial: { clipPath: 'circle(0% at 50% 62%)' },
        animate: { clipPath: 'circle(150% at 50% 62%)', transitionEnd: { clipPath: 'none' } },
        transition: { duration: 0.9, ease: [0.65, 0, 0.2, 1] },
      }

  return (
    <MotionConfig reducedMotion="user">
      {/* both pages share one grid cell so the stage can open over the paper */}
      <div className="grid grid-cols-1">
      <AnimatePresence initial={false}>
        {isPlayer ? (
          <motion.div key="screen" className="relative z-10 col-start-1 row-start-1 min-h-dvh min-w-0 bg-prussian" {...screenIn}>
            <Player
              session={session}
              topic={topic}
              isSoundOn={isSoundOn}
              onToggleSound={toggleSound}
              language={language}
              onRestart={onRestart}
              onExit={onExit}
              dataSource={dataSource}
            />
          </motion.div>
        ) : (
          <motion.div key="paper" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 1, transition: { duration: 0.9 } }} className="col-start-1 row-start-1 min-w-0">
            <LandingScreen
              onStart={onStart}
              topic={topic}
              isStarting={session.isLoading}
              error={session.error}
              isSoundOn={isSoundOn}
              onToggleSound={toggleSound}
              language={language}
              dataSource={dataSource}
            />
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </MotionConfig>
  )
}
