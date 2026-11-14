// OWNER: Person B
// One interface: v2. This file owns the session, the topic, the data source, language
// settings and sound; V2App renders the landing page and the player from them.
import { useCallback, useEffect, useRef, useState } from 'react'
import { MotionConfig } from 'motion/react'
import V2App from './v2/V2App.jsx'
import useSession from './hooks/useSession.js'
import useLanguageSettings from './hooks/useLanguageSettings.js'
import { getTopic, resolveDataSource, getDataSource } from './api/client.js'
import { MOTION_MODE } from './lib/motionMode.js'

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

  return (
    <MotionConfig reducedMotion={MOTION_MODE === 'off' ? 'always' : 'user'}>
      <V2App
        isPlayer={view === 'player' && !!session.currentSegment}
        session={session}
        topic={topic}
        onStart={onStart}
        onExit={onExit}
        isSoundOn={isSoundOn}
        onToggleSound={toggleSound}
        dataSource={dataSource}
        language={language}
        onRestart={onRestart}
      />
    </MotionConfig>
  )
}
