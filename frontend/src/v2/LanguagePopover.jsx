// The language button (a globe, next to the sound button). Two controls: the language you hear
// and the language you read. A narration change applies in place (see useVoicedSegment), so
// there is nothing to confirm.
import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Globe } from 'lucide-react'
import LanguageSelects from '../components/LanguageSelects.jsx'
import { DURATION } from '../constants/theme.js'
import { sec } from '../lib/motionMode.js'
import { IconBtn } from './ui.jsx'

export default function LanguagePopover({ language, onNarrationChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const root = useRef(null)
  const trigger = useRef(null)
  const panelId = useId()

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setIsOpen(false)
      trigger.current?.focus()
    }
    const onDown = (e) => root.current && !root.current.contains(e.target) && setIsOpen(false)
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [isOpen])

  return (
    <div ref={root} className="v2-langpop">
      <IconBtn ref={trigger} label="language" icon={Globe} isPressed={isOpen} onClick={() => setIsOpen((v) => !v)} aria-expanded={isOpen} aria-controls={isOpen ? panelId : undefined} tip="left" />
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={panelId}
            role="group"
            aria-label="language"
            className="v2-langpop-panel"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: sec(DURATION.quick) }}
          >
            <LanguageSelects
              layout="stack"
              languages={language.languages}
              narration={language.narrationLanguage}
              subtitles={language.subtitleLanguage}
              onNarration={(code) => code !== language.narrationLanguage && onNarrationChange(code)}
              onSubtitles={language.setSubtitleLanguage}
              isOffline={language.isOffline}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
