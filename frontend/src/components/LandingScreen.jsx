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
const SUBHEAD = 'One event, told from every point of view, with every claim tied to its source and every disagreement in plain sight.'

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
    <main className="mx-auto flex min-h-dvh max-w-[1200px] flex-col px-4 pb-8 text-prussian sm:px-8">
      <header className="grid h-16 grid-cols-[1fr_auto_1fr] items-center">
        <span />
        <motion.p className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em]" {...enter(0)}>
          vantage
          <ApertureGlyph color="currentColor" isOpen size={18} />
        </motion.p>
        <div className="flex justify-end">
          <SoundToggle isOn={isSoundOn} onToggle={onToggleSound} className="text-prussian hover:bg-prussian/5 sm:hidden" isCompact />
          <SoundToggle isOn={isSoundOn} onToggle={onToggleSound} className="hidden text-prussian hover:bg-prussian/5 sm:inline-flex" />
        </div>
      </header>

      <section className="mx-auto mt-10 max-w-[760px] text-center sm:mt-16">
        <h1 className="text-[38px] font-semibold leading-[42px] tracking-[-0.035em] text-balance sm:text-[60px] sm:leading-[62px] lg:text-[72px] lg:leading-[74px]">
          <span className="sr-only">Vantage. {HEADLINE}</span>
          <motion.span aria-hidden="true" variants={staggerParent(0.06, 0.1)} initial={reduce ? false : 'hidden'} animate="show">
            {HEADLINE.split(' ').map((w, i) => (
              <motion.span key={i} variants={staggerChild(20)} className="inline-block">
                {w}&nbsp;
              </motion.span>
            ))}
          </motion.span>
        </h1>
        <motion.p className="mx-auto mt-5 max-w-[56ch] text-[17px] leading-[27px] text-ink-muted text-pretty sm:text-[19px] sm:leading-[30px]" {...enter(0.5)}>
          {SUBHEAD}
        </motion.p>
      </section>

      <motion.div className="mt-10 sm:mt-14" {...enter(0.7)}>
        <SeamHero examples={seamExamples} />
      </motion.div>

      <motion.section className="mx-auto mt-12 w-full max-w-[640px] sm:mt-16" {...enter(0.9)} aria-label="Start a story">
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
            className="min-h-12 flex-1 rounded-full border border-prussian/20 bg-white/70 px-5 text-base text-prussian placeholder:text-ink-muted focus:border-prussian/60 focus:outline-none"
            aria-describedby={error ? 'start-error' : undefined}
          />
          <motion.button
            {...tap}
            type="submit"
            disabled={isStarting}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-prussian px-7 text-base font-medium text-paper hover:bg-developer disabled:cursor-wait disabled:opacity-70"
          >
            Begin
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <path d="M4 10L10 4M5 4h5v5" />
            </svg>
          </motion.button>
        </form>

        <div className="mt-4 min-h-11 text-center">
          {isStarting ? (
            <LoadingState
              tone="paper"
              message="Opening the archive..."
              slowMessage="Still reading the sources. The first scene can take a few seconds."
              className="min-h-11 justify-center"
            />
          ) : error ? (
            <div id="start-error" role="alert">
              <p className="inline-flex items-start gap-2 text-sm text-prussian">
                <span aria-hidden="true" className="mt-2.5 block h-px w-4 shrink-0 bg-safelight-ink" />
                {messageFor(error)}
              </p>
              {suggestions.length > 0 && (
                <ul className="mt-1 flex flex-wrap justify-center gap-x-4">
                  {suggestions.map((s) => (
                    <li key={s}>
                      <button type="button" onClick={() => { setValue(s); begin(s) }} className="min-h-11 text-sm text-prussian underline decoration-prussian/30 underline-offset-4 hover:decoration-prussian">
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : examples.length > 0 ? (
            <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-ink-muted">
              <span className="mr-1">Try</span>
              {examples.map((ex) => (
                <motion.button
                  {...tap}
                  key={ex}
                  type="button"
                  onClick={() => { setValue(ex); begin(ex) }}
                  className="min-h-11 rounded-full border border-prussian/15 px-4 text-prussian hover:border-prussian/40"
                >
                  {ex}
                </motion.button>
              ))}
            </p>
          ) : null}
        </div>
      </motion.section>

      <footer className="mt-auto flex flex-col items-center gap-2 pt-16 text-center">
        <p className="max-w-[52ch] text-sm text-ink-muted">Every documentary is one cut. This is the whole story, and it shows its sources.</p>
        <p className="text-xs text-ink-muted">AI-generated images and voices are always labeled.</p>
        <DataSourceNote source={dataSource} className="!text-ink-muted" />
      </footer>
    </main>
  )
}
