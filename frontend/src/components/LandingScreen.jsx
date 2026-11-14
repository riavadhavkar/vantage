// OWNER: Person B
// Home screen in the shape of a streaming service: a full-bleed featured story,
// then rows of topics, points of view, and the places where sources disagree.
// No third-party branding: our own palette, and red only marks disagreement.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import HomeRow from './HomeRow.jsx'
import { TopicCard, PerspectiveCard, DisagreementCard } from './HomeCards.jsx'
import GradeLayers from './GradeLayers.jsx'
import LoadingState from './LoadingState.jsx'
import DataSourceNote from './DataSourceNote.jsx'
import SoundToggle from './SoundToggle.jsx'
import ApertureGlyph from './ApertureGlyph.jsx'
import { SAMPLE_BUNDLES } from '../mocks/index.js'
import { catalogFrom } from '../lib/catalog.js'
import { examplesFrom } from '../lib/seamExamples.js'
import { unlockAudio } from '../lib/audio.js'
import { messageFor } from '../api/errors.js'
import { EASE, tap } from '../lib/motion.js'

const ROTATE_MS = 9000

function SearchBox({ onSubmit, isStarting }) {
  const [isOpen, setIsOpen] = useState(false)
  const [value, setValue] = useState('')
  const input = useRef(null)
  useEffect(() => {
    if (isOpen) input.current?.focus()
  }, [isOpen])
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (value.trim()) onSubmit(value.trim())
      }}
      className={`flex h-11 items-center rounded-full transition-[background-color,border-color] duration-300 ${isOpen ? 'border border-print/25 bg-prussian/70 backdrop-blur-sm' : 'border border-transparent'}`}
    >
      <button
        type={isOpen && value.trim() ? 'submit' : 'button'}
        onClick={() => !isOpen && setIsOpen(true)}
        aria-label={isOpen ? 'Begin this topic' : 'Search for a topic'}
        className="flex h-11 w-11 shrink-0 items-center justify-center text-print"
        disabled={isStarting}
      >
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="M13 13l4 4" />
        </svg>
      </button>
      <motion.div initial={false} animate={{ width: isOpen ? 'min(52vw, 240px)' : 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
        <label htmlFor="topic-input" className="sr-only">
          Topic
        </label>
        <input
          ref={input}
          id="topic-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => !value && setIsOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && (setValue(''), setIsOpen(false))}
          placeholder="Type a topic"
          autoComplete="off"
          tabIndex={isOpen ? 0 : -1}
          className="h-11 w-full bg-transparent pr-4 text-sm text-print placeholder:text-fog focus:outline-none"
        />
      </motion.div>
    </form>
  )
}

/**
 * @param {{ onStart: (topic: string) => void, topic: object|null, isStarting: boolean,
 *   error: object|null, isSoundOn: boolean, onToggleSound: () => void, dataSource: string }} props
 */
export default function LandingScreen({ onStart, isStarting, error, isSoundOn, onToggleSound, dataSource }) {
  const reduce = useReducedMotion()
  const catalog = useMemo(() => catalogFrom(SAMPLE_BUNDLES), [])
  const disagreements = useMemo(() => examplesFrom(SAMPLE_BUNDLES), [])
  const [featured, setFeatured] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(false)
  const item = catalog[featured]

  // The featured story changes every few seconds, unless the viewer is busy or prefers stillness.
  useEffect(() => {
    if (reduce || isPaused || isStarting || catalog.length < 2) return
    const t = setTimeout(() => setFeatured((i) => (i + 1) % catalog.length), ROTATE_MS)
    return () => clearTimeout(t)
  }, [featured, reduce, isPaused, isStarting, catalog.length])

  useEffect(() => {
    const onScroll = () => setHasScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const begin = useCallback(
    (title) => {
      if (isStarting || !title) return
      unlockAudio()
      onStart(title)
    },
    [isStarting, onStart],
  )

  const suggestions = error?.code === 'topic_not_supported' ? error.suggestions : []
  const meta = [item.year, `${item.perspectives.length} points of view`, `${item.sourceCount} sources`, `${item.disagreementCount} disagreements`].filter(Boolean)

  return (
    <div className="min-h-dvh bg-prussian text-print">
      {/* top bar: transparent over the hero, solid once scrolled */}
      <header
        className={`fixed inset-x-0 top-0 z-30 transition-colors duration-300 ${hasScrolled ? 'bg-prussian/95 backdrop-blur-sm' : 'bg-gradient-to-b from-prussian/80 to-transparent'}`}
      >
        <div className="flex h-16 items-center justify-between px-4 sm:px-12">
          <p className="flex items-center gap-2 text-[19px] font-semibold tracking-[-0.03em]">
            <ApertureGlyph color="currentColor" isOpen size={20} />
            vantage
          </p>
          <div className="flex items-center gap-1">
            <SearchBox onSubmit={begin} isStarting={isStarting} />
            <SoundToggle isOn={isSoundOn} onToggle={onToggleSound} isCompact />
          </div>
        </div>
      </header>

      {/* featured story */}
      <section
        aria-label="Featured story"
        className="relative h-[86svh] min-h-[520px] overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={() => setIsPaused(false)}
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={item.id}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.2 : 1.2, ease: EASE }}
          >
            <div className={`absolute inset-0 ${reduce ? '' : 'ken-burns'}`}>
              <img src={item.hero} alt="" className="print-gray absolute inset-0 h-full w-full object-cover object-[72%_center] sm:object-center" />
              {item.heroGrade && <GradeLayers grade={item.heroGrade} />}
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-r from-prussian via-prussian/55 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-prussian to-transparent" />

        <div className="absolute inset-x-0 bottom-[14%] px-4 sm:px-12">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="max-w-[620px]"
            >
              <h1 className="text-[42px] font-semibold leading-[44px] tracking-[-0.04em] text-balance sm:text-[72px] sm:leading-[72px]">{item.title}</h1>
              <p className="mt-4 flex flex-wrap items-center gap-x-2 text-sm text-print/85">
                {meta.map((m, i) => (
                  <span key={m} className="flex items-center gap-2">
                    {i > 0 && <span aria-hidden="true" className="text-fog">·</span>}
                    {m}
                  </span>
                ))}
              </p>
              <p className="mt-3 max-w-[48ch] text-[16px] leading-[25px] text-print/90 sm:text-[18px] sm:leading-[28px]">{item.oneLine}</p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <motion.button
              {...tap}
              type="button"
              onClick={() => begin(item.title)}
              disabled={isStarting}
              className="inline-flex min-h-12 items-center gap-2.5 rounded-md bg-print px-7 text-base font-semibold text-prussian hover:bg-white disabled:cursor-wait disabled:opacity-70"
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <path d="M5 3l10 6-10 6z" />
              </svg>
              Begin
            </motion.button>
            <motion.a
              {...tap}
              href="#disagreements"
              className="inline-flex min-h-12 items-center gap-2.5 rounded-md bg-print/20 px-6 text-base font-medium text-print backdrop-blur-sm hover:bg-print/30"
            >
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-safelight" />
              Where sources disagree
            </motion.a>
          </div>

          <div className="mt-4 min-h-6">
            {isStarting ? (
              <LoadingState message="Opening the archive..." slowMessage="Still reading the sources. The first scene can take a few seconds." />
            ) : error ? (
              <div role="alert" className="text-sm">
                <p className="text-print">{messageFor(error)}</p>
                {suggestions.length > 0 && (
                  <p className="mt-1 flex flex-wrap gap-x-4">
                    {suggestions.map((s) => (
                      <button key={s} type="button" onClick={() => begin(s)} className="min-h-11 underline underline-offset-4">
                        {s}
                      </button>
                    ))}
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* which story is featured */}
        {catalog.length > 1 && (
          <div className="absolute right-4 bottom-[14%] flex gap-1.5 sm:right-12" role="tablist" aria-label="Featured stories">
            {catalog.map((c, i) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={i === featured}
                aria-label={c.title}
                onClick={() => setFeatured(i)}
                className="flex h-11 items-center"
              >
                <span className={`block h-1 rounded-full transition-all duration-500 ${i === featured ? 'w-8 bg-print' : 'w-4 bg-print/35'}`} />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* rows */}
      <div className="relative z-10 -mt-[8svh] flex flex-col gap-8 pb-16">
        <HomeRow title="Stories">
          {catalog.map((c) => (
            <TopicCard key={c.id} item={c} onOpen={() => begin(c.title)} />
          ))}
        </HomeRow>

        <div id="disagreements" className="scroll-mt-20">
          <HomeRow title="Where the sources disagree">
            {disagreements.map((d) => (
              <DisagreementCard key={d.id} example={d} onOpen={() => begin(d.topic)} />
            ))}
          </HomeRow>
        </div>

        {catalog.map((c) => (
          <HomeRow key={c.id} title={`Points of view in ${c.title.replace(/^The /, 'the ')}`}>
            {c.perspectives.map((p) => (
              <PerspectiveCard key={p.id} perspective={p} topicTitle={c.title} onOpen={() => begin(c.title)} />
            ))}
          </HomeRow>
        ))}
      </div>

      <footer className="flex flex-col items-center gap-2 border-t border-print/10 px-4 py-8 text-center text-xs text-fog">
        <p>Every documentary is one cut. This is the whole story, and it shows its sources.</p>
        <p className="flex flex-wrap justify-center gap-x-4">
          <span>Previews use the demo sources</span>
          <span>AI images and voices are labeled</span>
        </p>
        <DataSourceNote source={dataSource} />
      </footer>
    </div>
  )
}
