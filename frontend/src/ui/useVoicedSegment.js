// Narration in a language other than the one the session started in.
//
// The backend fixes the narration language at /api/start and has no way to change it mid-session,
// and a new session would not reproduce the viewer's path (its segments and choices are generated
// fresh). So the change is applied on top of the same session: each scene's narration and title
// are translated with /api/translate and voiced with /api/tts (which reads any language with the
// same voice). The viewer keeps the same moment, the same perspective and the same story path.
//
// While a language swap is being prepared, the previous voiced version of the scene stays on
// (audio and text keep playing); the new one swaps in when ready. A new scene that is still being
// translated holds its voice (isHeld) so it never starts in the wrong language.
import { useEffect, useRef, useState } from 'react'
import { translateText } from '../api/client.js'

const cache = new Map() // `${segment_id}|${lang}` -> { narrative_text, title }

const keyOf = (segment, lang) => `${segment.segment_id}|${lang}`

// A title that is a question ("Who was Cleopatra?") can come back from the translator as an answer,
// a whole paragraph. A translated title is at most about three times as long as the original.
const isTitleSane = (translated, original) => !!translated && translated.length <= Math.max(original.length * 3, 60)

/**
 * @returns {{ segment: object|null, lang: string, isHeld: boolean, status: 'native'|'ready'|'switching'|'pending'|'failed' }}
 */
export default function useVoicedSegment(shown, { sessionLanguage, narrationLanguage }) {
  const wants = !!shown && shown.is_grounded && narrationLanguage && narrationLanguage !== sessionLanguage
  const key = wants ? keyOf(shown, narrationLanguage) : null
  const [, setTick] = useState(0)
  const [failed, setFailed] = useState(null) // key that failed
  const last = useRef(null) // { segment, lang } last version actually voiced, per scene

  useEffect(() => {
    if (!key || cache.has(key)) return
    let isLive = true
    Promise.all([translateText(shown.narrative_text || '', narrationLanguage), shown.title ? translateText(shown.title, narrationLanguage) : { text: '' }])
      .then(([body, title]) => {
        if (!body?.text) throw new Error('empty')
        cache.set(key, { narrative_text: body.text, title: isTitleSane(title?.text, shown.title || '') ? title.text : shown.title })
        if (isLive) setTick((n) => n + 1)
      })
      .catch(() => isLive && setFailed(key))
    return () => {
      isLive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  let result
  if (!shown) result = { segment: null, lang: sessionLanguage, isHeld: false, status: 'native' }
  else if (!wants) result = { segment: shown, lang: shown.is_grounded ? sessionLanguage : sessionLanguage, isHeld: false, status: 'native' }
  else if (cache.has(key)) {
    // a voiced copy: same scene, new words; audio_url belongs to the original text, so it is dropped
    result = { segment: { ...shown, ...cache.get(key), audio_url: null, audio_duration_ms: null }, lang: narrationLanguage, isHeld: false, status: 'ready' }
  } else if (failed === key) result = { segment: shown, lang: sessionLanguage, isHeld: false, status: 'failed' }
  else if (last.current?.segment.segment_id === shown.segment_id) result = { ...last.current, isHeld: false, status: 'switching' }
  else result = { segment: shown, lang: sessionLanguage, isHeld: true, status: 'pending' }

  if (result.segment && result.status !== 'switching' && result.status !== 'pending') last.current = { segment: result.segment, lang: result.lang }
  return result
}
