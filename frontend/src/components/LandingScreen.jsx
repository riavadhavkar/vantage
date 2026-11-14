// OWNER: Person B
import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import HeroTriptych from './HeroTriptych.jsx'
import LoadingState from './LoadingState.jsx'
import DataSourceNote from './DataSourceNote.jsx'
import SoundToggle from './SoundToggle.jsx'
import { NEUTRAL_GRADE_COLORS, gradeFor, EASE_FOCUS } from '../constants/theme.js'
import { sceneKindFor } from '../lib/scene.js'
import { unlockAudio } from '../lib/audio.js'
import { messageFor } from '../api/errors.js'

const EXAMPLE_TOPICS = (import.meta.env.VITE_VANTAGE_EXAMPLE_TOPICS || '')
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean)
  .slice(0, 3)

/**
 * @param {{ onStart: (topic: string) => void, topic: object|null, isStarting: boolean,
 *   error: object|null, isSoundOn: boolean, onToggleSound: () => void, dataSource: string }} props
 */
export default function LandingScreen({ onStart, topic, isStarting, error, isSoundOn, onToggleSound, dataSource }) {
  const reduce = useReducedMotion()
  const [value, setValue] = useState('')
  const [isIntroDone, setIsIntroDone] = useState(false)

  const grades = useMemo(() => {
    const colors = topic?.perspectives?.length >= 3 ? topic.perspectives.slice(0, 3).map((p) => p.color) : NEUTRAL_GRADE_COLORS
    return colors.map(gradeFor)
  }, [topic])

  // From GET /api/topic when it exists; otherwise from VITE_VANTAGE_EXAMPLE_TOPICS (config, not code).
  const examples = useMemo(() => {
    if (topic) return [...new Set([topic.title, ...(topic.aliases || [])])].slice(0, 3)
    return EXAMPLE_TOPICS
  }, [topic])

  const begin = (text) => {
    const t = (text ?? value).trim()
    if (isStarting) return
    if (!t) {
      document.getElementById('topic-input')?.focus()
      return
    }
    unlockAudio()
    onStart(t)
  }

  const suggestions = error?.code === 'topic_not_supported' ? error.suggestions : []
  const fadeIn = (delay) =>
    reduce
      ? {}
      : { initial: { opacity: 0 }, animate: { opacity: isIntroDone ? 1 : 0 }, transition: { duration: 0.5, delay, ease: EASE_FOCUS } }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[1600px] flex-col px-4 pb-8 sm:px-8">
      <header className="flex h-14 items-center justify-between">
        <span className="text-sm text-fog">{topic ? 'An interactive documentary' : ''}</span>
        <SoundToggle isOn={isSoundOn} onToggle={onToggleSound} />
      </header>

      <HeroTriptych
        grades={grades}
        sceneSeed={topic?.topic_id || 'vantage'}
        sceneKind={sceneKindFor(`${topic?.one_line || ''} ${topic?.title || ''}`)}
        isIntroDone={isIntroDone}
        onIntroDone={() => setIsIntroDone(true)}
      />

      <div className="mt-8 grid gap-8 md:mt-10 md:grid-cols-12 md:gap-6">
        <motion.div className="md:col-span-6" {...fadeIn(0)}>
          <h1 className="text-[30px] font-semibold leading-[36px] tracking-[-0.025em] text-balance text-print sm:text-[40px] sm:leading-[46px] lg:text-[48px] lg:leading-[54px]">
            <span className="sr-only">Vantage. </span>
            See what happened from every side, and check every claim against its source.
          </h1>
        </motion.div>

        <motion.div className="md:col-span-6 md:col-start-7 lg:col-span-5 lg:col-start-8" {...fadeIn(0.12)}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              begin()
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="topic-input" className="sr-only">
              Topic
            </label>
            <input
              id="topic-input"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Type a topic"
              autoComplete="off"
              className="min-h-12 flex-1 rounded-md border border-print/20 bg-developer px-4 text-base text-print placeholder:text-fog focus:border-print/60 focus:outline-none"
              aria-describedby={error ? 'start-error' : undefined}
            />
            <button
              type="submit"
              disabled={isStarting}
              className="min-h-12 rounded-full bg-print px-7 text-base font-semibold text-prussian hover:bg-white disabled:cursor-not-allowed disabled:opacity-55"
            >
              Begin
            </button>
          </form>

          <div className="mt-4 min-h-11">
            {isStarting ? (
              <LoadingState
                message="Opening the archive..."
                slowMessage="Still reading the sources. The first scene can take a few seconds."
                className="min-h-11"
              />
            ) : error ? (
              <div id="start-error" role="alert">
                <p className="flex items-start gap-2 text-sm text-print">
                  <span aria-hidden="true" className="mt-2.5 block h-px w-4 shrink-0 bg-safelight" />
                  {messageFor(error)}
                </p>
                {suggestions.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-x-4">
                    {suggestions.map((s) => (
                      <li key={s}>
                        <button type="button" onClick={() => { setValue(s); begin(s) }} className="min-h-11 text-sm text-print underline decoration-print/40 underline-offset-4 hover:decoration-print">
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : examples.length > 0 ? (
              <p className="flex flex-wrap items-center gap-x-4 text-sm text-fog">
                <span>Try</span>
                {examples.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => { setValue(ex); begin(ex) }}
                    className="min-h-11 text-print underline decoration-print/30 underline-offset-4 hover:decoration-print"
                  >
                    {ex}
                  </button>
                ))}
              </p>
            ) : null}
          </div>
        </motion.div>
      </div>

      <motion.footer className="mt-auto flex flex-col gap-3 pt-12 sm:flex-row sm:items-end sm:justify-between" {...fadeIn(0.24)}>
        <p className="max-w-[46ch] text-sm text-fog">
          Every documentary is one cut. This is the whole story, and it shows its sources.
        </p>
        <div className="flex flex-col gap-1 sm:items-end">
          <DataSourceNote source={dataSource} />
          <p className="text-xs text-fog">AI-generated images and voices are always labeled.</p>
        </div>
      </motion.footer>
    </main>
  )
}
