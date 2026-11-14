// OWNER: Person B
import { useCallback, useEffect, useState } from 'react'
import { MotionConfig } from 'motion/react'
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
        setTopic(await getTopic())
      } catch {
        // keep the landing topic
      }
      setView('player')
      window.scrollTo(0, 0)
    },
    [startSession],
  )

  const onExit = useCallback(() => {
    reset()
    setView('landing')
    window.scrollTo(0, 0)
  }, [reset])

  const isPlayer = view === 'player' && session.currentSegment
  return (
    <MotionConfig reducedMotion="user">
      {isPlayer ? (
      <Player
        session={session}
        topic={topic}
        isSoundOn={isSoundOn}
        onToggleSound={() => setIsSoundOn((v) => !v)}
        onExit={onExit}
        dataSource={dataSource}
      />
      ) : (
    <LandingScreen
      onStart={onStart}
      topic={topic}
      isStarting={session.isLoading}
      error={session.error}
      isSoundOn={isSoundOn}
      onToggleSound={() => setIsSoundOn((v) => !v)}
      dataSource={dataSource}
    />
      )}
    </MotionConfig>
  )
}
