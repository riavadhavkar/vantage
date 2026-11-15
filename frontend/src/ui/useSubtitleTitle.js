// The scene title in the subtitle language. The title is written in the language the session
// started in; it follows the subtitles and never the narration: changing the narration language
// leaves it alone, changing the subtitle language translates it. With subtitles off it stays as
// the story named it. The original shows while the translation loads, and if it fails.
import { useEffect, useState } from 'react'
import { translateText } from '../api/client.js'

const cache = new Map() // `${segment_id}|${lang}` -> translated title

// A translated title is at most about three times as long as the original; anything longer is
// not a title (a model answering a question title instead of translating it).
const isTitleSane = (translated, original) => !!translated && translated.length <= Math.max(original.length * 3, 60)

export default function useSubtitleTitle(segment, { sessionLanguage, subtitleLanguage }) {
  const title = segment?.title || ''
  const needsTranslation = !!title && subtitleLanguage !== 'off' && subtitleLanguage !== sessionLanguage
  const key = needsTranslation ? `${segment.segment_id}|${subtitleLanguage}` : null
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!key || cache.has(key)) return
    let isLive = true
    translateText(title, subtitleLanguage)
      .then((d) => cache.set(key, isTitleSane(d?.text, title) ? d.text : title))
      .catch(() => cache.set(key, title)) // keep the original; do not ask again
      .finally(() => isLive && setTick((n) => n + 1))
    return () => {
      isLive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return key && cache.has(key) ? cache.get(key) : title
}
