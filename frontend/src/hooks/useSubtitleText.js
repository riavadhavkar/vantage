// Text shown as subtitles. Same language as the narration: the original text, no network.
// Different language: translated via /api/translate, cached in memory by segment and language.
// The original stays on screen while loading or if translation fails; narration is never blocked.
import { useEffect, useState } from 'react'
import { translateText, isOfflineData } from '../api/client.js'

const cache = new Map() // `${segment_id}|${target}` -> translated text

/**
 * segment: the scene as narrated (possibly a voiced translation); narrationLanguage: its language.
 * source: the session's own text and language, reused when the viewer reads in that language.
 * @returns {{ text: string, lang: string, status: 'off'|'original'|'loading'|'ready'|'failed'|'offline' }}
 */
export default function useSubtitleText(segment, { narrationLanguage, subtitleLanguage, source = null }) {
  const original = segment?.is_grounded ? segment.narrative_text || '' : ''
  const id = segment?.segment_id
  const target = subtitleLanguage === 'same' ? narrationLanguage : subtitleLanguage
  const needsTranslation = subtitleLanguage !== 'off' && !!original && target !== narrationLanguage
  const offline = isOfflineData()
  const key = `${id}|${target}`
  const [result, setResult] = useState({ key: null, status: 'idle', text: '' })

  const fromSource = !!source?.text && source.lang === target
  useEffect(() => {
    if (!needsTranslation || offline || fromSource) return
    if (cache.has(key)) return
    const ctrl = new AbortController()
    let isLive = true
    translateText(original, target, { signal: ctrl.signal })
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
  }, [key, needsTranslation, offline, original, target, fromSource])

  if (subtitleLanguage === 'off') return { text: '', lang: narrationLanguage, status: 'off' }
  if (needsTranslation && source?.text && source.lang === target) return { text: source.text, lang: target, status: 'ready' }
  if (!needsTranslation) return { text: original, lang: narrationLanguage, status: 'original' }
  if (offline) return { text: original, lang: narrationLanguage, status: 'offline' }
  if (cache.has(key)) return { text: cache.get(key), lang: target, status: 'ready' }
  if (result.key === key && result.status === 'failed') return { text: original, lang: narrationLanguage, status: 'failed' }
  return { text: original, lang: narrationLanguage, status: 'loading' }
}
