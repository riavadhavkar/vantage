// Subtitle chunking. Text is split into sentences, and each sentence into phrases that fit on
// ONE line at the current width (measured with the subtitle's real font, so it holds for any
// script). A line prefers to end after a comma or semicolon once it is at least half full.

/** Sentences, keeping their closing punctuation (Latin and Devanagari full stops). */
export function sentencesOf(text) {
  return (String(text).match(/[^.!?…।]+[.!?…।]*["”')\]]*\s*/g) || [String(text)]).map((s) => s.trim()).filter(Boolean)
}

/**
 * @param {string} text
 * @param {(s: string) => number} measure width in px of a string in the subtitle font
 * @param {number} width available width in px
 * @param {string} more the suffix shown while more text follows (its width is reserved)
 * @returns {string[]} one-line chunks
 */
export function fitChunks(text, measure, width, more = ' ...') {
  if (!text) return []
  if (!(width > 0)) return sentencesOf(text)
  const room = width - measure(more)
  const out = []
  for (const sentence of sentencesOf(text)) {
    let line = ''
    let lastBreak = -1 // index in `words` after which a comma or semicolon ends a phrase
    const words = sentence.split(/\s+/)
    let start = 0
    for (let i = 0; i < words.length; i++) {
      const next = line ? `${line} ${words[i]}` : words[i]
      if (line && measure(next) > room) {
        // break after the last comma if the line is at least half full there, else here
        const cut = lastBreak >= start && measure(words.slice(start, lastBreak + 1).join(' ')) >= room * 0.5 ? lastBreak + 1 : i
        out.push(words.slice(start, cut).join(' '))
        start = cut
        line = words.slice(start, i + 1).join(' ')
        lastBreak = -1
      } else line = next
      if (/[,;:]$/.test(words[i])) lastBreak = i
    }
    if (line) out.push(line)
  }
  return out
}
