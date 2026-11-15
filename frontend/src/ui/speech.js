// Browser speech synthesis as the narration fallback. It uses voices installed on the
// device, so it works offline and costs nothing. It is still a synthetic voice, so the
// player labels it "AI narration".

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

let voicesCache = []
function loadVoices() {
  if (!canSpeak()) return []
  const all = window.speechSynthesis.getVoices()
  if (all.length) voicesCache = all
  return voicesCache
}
if (canSpeak()) window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices)

/** English voices, local (offline) ones first, novelty voices left out. */
function englishVoices() {
  const novelty = /bad news|bahh|bells|boing|bubbles|cellos|jester|organ|superstar|trinoids|whisper|wobble|zarvox|albert|good news/i
  const list = loadVoices().filter((v) => /^en(-|_|$)/i.test(v.lang) && !novelty.test(v.name))
  return [...list.filter((v) => v.localService), ...list.filter((v) => !v.localService)]
}

/** A different voice per perspective, chosen by the perspective's position in the topic. */
export function voiceForIndex(index) {
  const voices = englishVoices()
  if (!voices.length) return null
  return voices[Math.abs(index || 0) % voices.length]
}

/** Chrome stops long utterances after about 15 s, so speak sentence by sentence. */
function sentences(text) {
  return (String(text).match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [text]).map((s) => s.trim()).filter(Boolean)
}

/**
 * @returns {{ pause: () => void, resume: () => void, cancel: () => void }}
 */
export function speak(text, { voice, onStart, onEnd, onError } = {}) {
  const synth = window.speechSynthesis
  synth.cancel()
  let isCancelled = false
  const parts = sentences(text)
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part)
    if (voice) {
      u.voice = voice
      u.lang = voice.lang
    }
    u.rate = 0.98
    if (i === 0) u.onstart = () => !isCancelled && onStart?.()
    if (i === parts.length - 1) u.onend = () => !isCancelled && onEnd?.()
    u.onerror = (e) => {
      if (!isCancelled && e.error !== 'interrupted' && e.error !== 'canceled') onError?.(e)
    }
    synth.speak(u)
  })
  return {
    pause: () => synth.pause(),
    resume: () => synth.resume(),
    cancel: () => {
      isCancelled = true
      synth.cancel()
    },
  }
}

/** iOS needs one utterance inside a user gesture before later ones can play. */
export function unlockSpeech() {
  if (!canSpeak()) return
  const u = new SpeechSynthesisUtterance(' ')
  u.volume = 0
  window.speechSynthesis.speak(u)
}
