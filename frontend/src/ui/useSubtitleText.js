// Text shown as subtitles. Same language as the narration: the original text, no network.
// Different language: translated via /api/translate, cached in memory by segment and language.
// The original stays on screen while loading or if translation fails; narration is never blocked.
import { useEffect, useState } from 'react'
import { translateText } from '../api/client.js'

const cache = new Map() // `${segment_id}|${subtitleLanguage}` -> translated text

/**
 * segment: the scene as narrated (possibly a voiced translation); narrationLanguage: its language.
 * source: the session's own text and language, reused when the viewer reads in that language.
 * @returns {{ text: string, lang: string, status: 'off'|'original'|'loading'|'ready'|'failed' }}
 */
export default function useSubtitleText(segment, { narrationLanguage, subtitleLanguage, source = null }) {
  const original = segment?.is_grounded ? segment.narrative_text || '' : ''
  const id = segment?.segment_id
  const needsTranslation = subtitleLanguage !== 'off' && !!original && subtitleLanguage !== narrationLanguage
  const key = `${id}|${subtitleLanguage}`
  const [result, setResult] = useState({ key: null, status: 'idle', text: '' })

  const fromSource = !!source?.text && source.lang === subtitleLanguage
  useEffect(() => {
    if (!needsTranslation || fromSource) return
    if (cache.has(key)) return
    const ctrl = new AbortController()
    let isLive = true
    translateText(original, subtitleLanguage, { signal: ctrl.signal })
      .then((d) => {
        if (!d?.text) throw new Error('empty')
        cache.set(key, d.text)
        if (isLive) setResult({ key, status: 'ready', text: d.text })
      })
      .catch(() => isLive && setResult({ key, status: 'failed', text: '' }))
    return () => {
      isLive = false
      ctrl.abort()
    }
  }, [key, needsTranslation, original, subtitleLanguage, fromSource])

  if (subtitleLanguage === 'off') return { text: '', lang: narrationLanguage, status: 'off' }
  if (needsTranslation && source?.text && source.lang === subtitleLanguage) return { text: source.text, lang: subtitleLanguage, status: 'ready' }
  if (!needsTranslation) return { text: original, lang: narrationLanguage, status: 'original' }
  if (cache.has(key)) return { text: cache.get(key), lang: subtitleLanguage, status: 'ready' }
  if (result.key === key && result.status === 'failed') return { text: original, lang: narrationLanguage, status: 'failed' }
  return { text: original, lang: narrationLanguage, status: 'loading' }
}
