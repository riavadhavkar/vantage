// Subtitle chunking: sentences, with long ones split so they fit two lines.
const MAX_CHARS = 84

/** Split into sentences, then split any long sentence at a comma or space so it fits two lines. */
export function chunkText(text) {
  const sentences = (text.match(/[^.!?…।]+[.!?…।]*["”')\]]*\s*/g) || [text]).map((s) => s.trim()).filter(Boolean)
  const out = []
  for (const sentence of sentences) {
    let rest = sentence
    while (rest.length > MAX_CHARS) {
      const window = rest.slice(0, MAX_CHARS + 1)
      let cut = Math.max(window.lastIndexOf(', '), window.lastIndexOf('; '))
      if (cut < MAX_CHARS * 0.5) cut = window.lastIndexOf(' ')
      if (cut <= 0) cut = MAX_CHARS
      out.push(rest.slice(0, cut + 1).trim())
      rest = rest.slice(cut + 1).trim()
    }
    if (rest) out.push(rest)
  }
  return out
}

