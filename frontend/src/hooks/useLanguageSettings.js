// Narration language (fixed per session) and subtitle language (changes any time).
// subtitleLanguage: 'off' | 'same' | a language code. Saved in localStorage; the app works without it.
import { useCallback, useEffect, useState } from 'react'
import { FALLBACK_LANGUAGES, getLanguages } from '../api/client.js'

const KEY = 'vantage.languages.v1'

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}')
    return {
      narrationLanguage: typeof v.narrationLanguage === 'string' ? v.narrationLanguage : 'en',
      subtitleLanguage: typeof v.subtitleLanguage === 'string' ? v.subtitleLanguage : 'same',
    }
  } catch {
    return { narrationLanguage: 'en', subtitleLanguage: 'same' }
  }
}

export default function useLanguageSettings() {
  const [settings, setSettings] = useState(load)
  const [languages, setLanguages] = useState(FALLBACK_LANGUAGES)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings))
    } catch {
      // storage can be blocked; the settings still work for this visit
    }
  }, [settings])

  useEffect(() => {
    let isLive = true
    getLanguages()
      .then((d) => isLive && setLanguages(d.languages))
      .catch(() => {})
    return () => {
      isLive = false
    }
  }, [])

  const setNarrationLanguage = useCallback((narrationLanguage) => setSettings((s) => ({ ...s, narrationLanguage })), [])
  const setSubtitleLanguage = useCallback((subtitleLanguage) => setSettings((s) => ({ ...s, subtitleLanguage })), [])
  const nameOf = useCallback((code) => (languages.find((l) => l.code === code)?.name || code).toLowerCase(), [languages])

  return { ...settings, languages, setNarrationLanguage, setSubtitleLanguage, nameOf }
}
