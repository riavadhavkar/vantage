// OWNER: Person B
// The landing page is paper (light, evidence) and the story is a screen (dark).
// Hero: two sources that disagree, split by a seam the viewer can drag.
import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import SeamHero from './SeamHero.jsx'
import { examplesFrom } from '../lib/seamExamples.js'
import LoadingState from './LoadingState.jsx'
import DataSourceNote from './DataSourceNote.jsx'
import SoundToggle from './SoundToggle.jsx'
import ApertureGlyph from './ApertureGlyph.jsx'
import { SAMPLE_BUNDLES } from '../mocks/index.js'
import { unlockAudio } from '../lib/audio.js'
import { messageFor } from '../api/errors.js'
import { EASE, staggerParent, staggerChild, tap } from '../lib/motion.js'

const HEADLINE = 'Hear every side of the story.'
const SUBHEAD = 'Every documentary is one cut. This is the whole story, and it shows its sources.'

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

  // Paper surface while the landing page is up.
  useEffect(() => {
    const html = document.documentElement
    html.dataset.surface = 'paper'
    const meta = document.querySelector('meta[name=theme-color]')
    meta?.setAttribute('content', '#F4F3EE')
    return () => {
      delete html.dataset.surface
      meta?.setAttribute('content', '#0A1E30')
    }
  }, [])

  const examples = useMemo(() => {
    // Cached demo and mocks: offer each topic the demo can play.
    if (dataSource !== 'live') return SAMPLE_BUNDLES.map((b) => b.topic.title)
    if (topic) return [...new Set([topic.title, ...(topic.aliases || [])])].slice(0, 3)
    return EXAMPLE_TOPICS
  }, [topic, dataSource])

  const seamExamples = useMemo(() => examplesFrom(SAMPLE_BUNDLES), [])

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
  const enter = (delay) => (reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay, ease: EASE } })

  return (
    <main className="mx-auto flex min-h-dvh max-w-[1100px] flex-col px-4 pb-8 text-prussian sm:px-8">
      <header className="grid h-16 grid-cols-[1fr_auto_1fr] items-center">
        <span />
        <motion.p className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em]" {...enter(0)}>
          vantage
          <ApertureGlyph color="currentColor" isOpen size={18} />
        </motion.p>
        <div className="flex justify-end">
          <SoundToggle isOn={isSoundOn} onToggle={onToggleSound} className="text-prussian hover:bg-prussian/5" isCompact />
        </div>
      </header>

      <section className="mx-auto mt-14 max-w-[720px] text-center sm:mt-24">
        <h1 className="text-[40px] font-semibold leading-[44px] tracking-[-0.035em] text-balance sm:text-[64px] sm:leading-[66px]">
          <span className="sr-only">Vantage. {HEADLINE}</span>
          <motion.span aria-hidden="true" variants={staggerParent(0.06, 0.1)} initial={reduce ? false : 'hidden'} animate="show">
            {HEADLINE.split(' ').map((w, i) => (
              <motion.span key={i} variants={staggerChild(20)} className="inline-block">
                {w}&nbsp;
              </motion.span>
            ))}
          </motion.span>
        </h1>
        <motion.p className="mx-auto mt-5 max-w-[46ch] text-[17px] leading-[27px] text-ink-muted text-pretty sm:text-[18px] sm:leading-[28px]" {...enter(0.45)}>
          {SUBHEAD}
        </motion.p>

        <motion.form
          {...enter(0.6)}
          onSubmit={(e) => {
            e.preventDefault()
            begin()
          }}
          className="mx-auto mt-9 flex max-w-[520px] items-center gap-2 rounded-full border border-prussian/15 bg-white/70 p-1.5 focus-within:border-prussian/45"
          aria-label="Start a story"
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
            className="min-h-11 min-w-0 flex-1 bg-transparent px-4 text-base text-prussian placeholder:text-ink-muted focus:outline-none"
            aria-describedby={error ? 'start-error' : undefined}
          />
          <motion.button
            {...tap}
            type="submit"
            disabled={isStarting}
            className="min-h-11 shrink-0 rounded-full bg-prussian px-6 text-base font-medium text-paper hover:bg-developer disabled:cursor-wait disabled:opacity-70"
          >
            Begin
          </motion.button>
        </motion.form>

        <motion.div className="mt-3 min-h-11" {...enter(0.7)}>
          {isStarting ? (
            <LoadingState
              tone="paper"
              message="Opening the archive..."
              slowMessage="Still reading the sources. The first scene can take a few seconds."
              className="min-h-11 justify-center"
            />
          ) : error ? (
            <div id="start-error" role="alert" className="text-sm">
              <p className="text-prussian">{messageFor(error)}</p>
              {suggestions.length > 0 && (
                <p className="mt-1 flex flex-wrap justify-center gap-x-4">
                  {suggestions.map((s) => (
                    <button key={s} type="button" onClick={() => { setValue(s); begin(s) }} className="min-h-11 text-prussian underline decoration-prussian/30 underline-offset-4 hover:decoration-prussian">
                      {s}
                    </button>
                  ))}
                </p>
              )}
            </div>
          ) : (
            <p className="flex flex-wrap justify-center gap-x-5 text-sm">
              {examples.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => { setValue(ex); begin(ex) }}
                  className="min-h-11 text-ink-muted underline decoration-prussian/20 underline-offset-4 hover:text-prussian hover:decoration-prussian"
                >
                  {ex}
                </button>
              ))}
            </p>
          )}
        </motion.div>
      </section>

      <motion.div className="mt-12 sm:mt-16" {...enter(0.85)}>
        <SeamHero examples={seamExamples} />
      </motion.div>

      <footer className="mt-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-14 text-xs text-ink-muted">
        <span>AI images and voices are labeled</span>
        <DataSourceNote source={dataSource} className="!text-ink-muted" />
      </footer>
    </main>
  )
}
