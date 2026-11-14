// OWNER: Person B
import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react'
import LandingScreen from './components/LandingScreen.jsx'
import Player from './components/Player.jsx'
import useSession from './hooks/useSession.js'
import { getTopic, resolveDataSource, getDataSource } from './api/client.js'

export default function App() {
  const [dataSource, setDataSource] = useState(getDataSource())
  const [topic, setTopic] = useState(null)
  const [view, setView] = useState('landing')
  const [isSoundOn, setIsSoundOn] = useState(true)
  const session = useSession()
  const reduce = useReducedMotion()
  const { startSession, reset } = session

  useEffect(() => {
    let isLive = true
    resolveDataSource()
      .then((src) => {
        if (!isLive) return
        setDataSource(src)
        return getTopic().then((t) => isLive && setTopic(t))
      })
      .catch(() => {})
    return () => {
      isLive = false
    }
  }, [])

  const onStart = useCallback(
    async (text) => {
      const data = await startSession(text)
      if (!data) return
      try {
        setTopic(await getTopic(data.session_id))
      } catch {
        // keep the landing topic
      }
      window.scrollTo(0, 0)
      setView('player')
    },
    [startSession],
  )

  const onExit = useCallback(() => {
    reset()
    setView('landing')
    window.scrollTo(0, 0)
  }, [reset])

  const isPlayer = view === 'player' && !!session.currentSegment
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
              onToggleSound={() => setIsSoundOn((v) => !v)}
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
              onToggleSound={() => setIsSoundOn((v) => !v)}
              dataSource={dataSource}
            />
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </MotionConfig>
  )
}
