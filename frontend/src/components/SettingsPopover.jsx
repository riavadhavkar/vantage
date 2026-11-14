// Settings next to the sound button (a chevron, not a sixth icon): narration and subtitle
// languages, ambient sound, and the phone link. Changing narration asks first, because the
// language is set when a session starts.
import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import LanguageSelects from './LanguageSelects.jsx'
import AmbientPlayer from './AmbientPlayer.jsx'
import ContinueOnPhone from './ContinueOnPhone.jsx'
import IconButton from './IconButton.jsx'

export default function SettingsPopover({ language, onRestart, mood, isAmbientOn, onToggleAmbient, linkCode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [pending, setPending] = useState(null) // narration code awaiting confirmation
  const root = useRef(null)
  const trigger = useRef(null)
  const panelId = useId()

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setPending(null)
        trigger.current?.focus()
      }
    }
    const onDown = (e) => {
      if (root.current && !root.current.contains(e.target)) setIsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [isOpen])

  const confirm = () => {
    const code = pending
    setPending(null)
    setIsOpen(false)
    onRestart(code)
  }

  return (
    <div ref={root} className="relative">
      <IconButton tipAlign="end" ref={trigger} label="subtitles and languages" onClick={() => setIsOpen((v) => !v)} isPressed={isOpen} aria-expanded={isOpen} aria-controls={isOpen ? panelId : undefined} className="!w-7 sm:!w-8">
        <ChevronDown aria-hidden="true" size={16} strokeWidth={1.75} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </IconButton>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={panelId}
            role="group"
            aria-label="subtitles and languages"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-print/30 bg-prussian p-4 shadow-2xl"
          >
            <LanguageSelects
              layout="stack"
              languages={language.languages}
              narration={language.narrationLanguage}
              subtitles={language.subtitleLanguage}
              onNarration={(code) => (code === language.narrationLanguage ? setPending(null) : setPending(code))}
              onSubtitles={language.setSubtitleLanguage}
              isOffline={language.isOffline}
            />
            {pending && (
              <div role="alertdialog" aria-label="restart the story" className="mt-3 rounded-md border border-print/30 bg-developer p-3">
                <p className="chrome text-sm text-print">restart the story in {language.nameOf(pending)}?</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" autoFocus onClick={confirm} className="chrome min-h-11 rounded-md bg-print px-4 text-sm font-semibold text-prussian hover:bg-white">
                    restart
                  </button>
                  <button type="button" onClick={() => setPending(null)} className="chrome min-h-11 rounded-md border border-print/40 px-4 text-sm text-print hover:bg-prussian">
                    cancel
                  </button>
                </div>
              </div>
            )}
            <div className="mt-3 flex flex-col gap-1 border-t border-print/20 pt-3">
              <AmbientPlayer mood={mood} isOn={isAmbientOn} onToggle={onToggleAmbient} />
              <ContinueOnPhone linkCode={linkCode} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
