// OWNER: Person B
// Continuity: the same session can carry on over iMessage. Shown only when the live
// backend gave this session a link code and the number is configured.
import { motion } from 'motion/react'
import { EASE } from '../lib/motion.js'

const NUMBER = (import.meta.env.VITE_VANTAGE_PHOTON_NUMBER || '').trim()

function smsHref(number, body) {
  const digits = number.replace(/[^\d+]/g, '')
  const e164 = digits.startsWith('+') ? digits : `+1${digits}`
  return `sms:${e164}?&body=${encodeURIComponent(body)}`
}

export default function ContinueOnPhone({ linkCode, className = '' }) {
  if (!linkCode || !NUMBER) return null
  const message = `VANTAGE ${linkCode}`
  return (
    <motion.aside
      aria-label="Continue on your phone"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8, ease: EASE }}
      className={`rounded-lg border border-print/12 bg-developer/60 p-3 ${className}`}
    >
      <p className="flex items-center gap-2 text-sm font-medium text-print">
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <rect x="4" y="1.5" width="8" height="13" rx="1.8" />
          <path d="M7 12.2h2" strokeLinecap="round" />
        </svg>
        Continue on your phone
      </p>
      <p className="mt-1.5 text-sm text-fog">
        Text <span className="font-mono font-semibold tracking-wide text-print">{message}</span> to{' '}
        <a href={smsHref(NUMBER, message)} className="whitespace-nowrap text-print underline decoration-print/30 underline-offset-4 hover:decoration-print">
          {NUMBER}
        </a>
        .
      </p>
      <p className="mt-1 text-xs text-fog">What you do there shows up in this story's graph.</p>
    </motion.aside>
  )
}
