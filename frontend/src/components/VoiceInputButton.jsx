// OWNER: Person B
// Records a spoken question and sends it to /transcribe. Nothing is stored.
import { useRef, useState } from 'react'
import { transcribeAudio } from '../api/client.js'

const canRecord = () => typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'

export default function VoiceInputButton({ onTranscript, isDisabled }) {
  const [state, setState] = useState('idle') // idle | recording | transcribing | error
  const rec = useRef(null)
  const chunks = useRef([])

  if (!canRecord()) return null

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const r = new MediaRecorder(stream)
      chunks.current = []
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setState('transcribing')
        try {
          const { text } = await transcribeAudio(new Blob(chunks.current, { type: r.mimeType || 'audio/webm' }))
          setState('idle')
          if (text) onTranscript(text)
        } catch {
          setState('error')
          setTimeout(() => setState('idle'), 3000)
        }
      }
      rec.current = r
      r.start()
      setState('recording')
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  const stop = () => rec.current?.state === 'recording' && rec.current.stop()
  const isRecording = state === 'recording'
  const label = isRecording ? 'Stop recording' : state === 'transcribing' ? 'Transcribing your question' : state === 'error' ? 'Could not hear that. Try again' : 'Ask by voice'

  return (
    <button
      type="button"
      onClick={isRecording ? stop : start}
      disabled={isDisabled || state === 'transcribing'}
      aria-label={label}
      title={label}
      className={`relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
        isRecording ? 'bg-print text-prussian' : 'text-print hover:bg-prussian/60'
      } disabled:opacity-50`}
    >
      {isRecording ? (
        <span className="recording-dot block h-3 w-3 rounded-md bg-safelight" />
      ) : (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4">
          <rect x="6.5" y="2" width="5" height="9" rx="2.5" />
          <path d="M3.5 8.5a5.5 5.5 0 0011 0M9 14v2.5" />
        </svg>
      )}
      <span className="sr-only" aria-live="polite">
        {state === 'recording' ? 'Recording' : state === 'transcribing' ? 'Transcribing' : state === 'error' ? 'Could not hear that' : ''}
      </span>
    </button>
  )
}
