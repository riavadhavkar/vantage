// The contract gives each claim its text and its source, but not where in the narration it
// sits. To underline "this sentence has a source" we match each claim to the sentence that
// shares the most content words, and keep only confident matches. Everything else stays in
// the grounding list, where every claim always appears. A wrong underline would point a
// source at text it does not support, so the thresholds are deliberately strict.

const STOP = new Set(
  'the a an of and to in on at for by with was were is are had has have that this it its his her their they he she from as not no but or be been into than then so if which who whom what when where while over about after before only also more most some few many all'.split(' '),
)
const MIN_SHARE = 0.5 // at least half of the claim's content words appear in the sentence
const MIN_LEAD = 0.15 // and it beats the next best sentence by this much

const contentWords = (text) => [
  ...new Set(
    String(text)
      .toLowerCase()
      .replace(/[^a-z0-9% ]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
      .map((w) => w.replace(/(ing|ed|es|s)$/, '')),
  ),
]

/** Sentences and words with their character positions, so reveal can follow the typewriter. */
export function layoutText(text) {
  const sentences = []
  const re = /[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g
  let m
  while ((m = re.exec(String(text || '')))) {
    const start = m.index
    const words = []
    const wre = /\S+\s*/g
    let w
    while ((w = wre.exec(m[0]))) words.push({ start: start + w.index, text: w[0] })
    if (words.length) sentences.push({ start, end: start + m[0].length, text: m[0], words })
  }
  return sentences
}

/** @returns {Map<number, object>} sentence index -> the claim it confidently supports */
export function matchClaims(sentences, claims) {
  const out = new Map()
  const bags = sentences.map((s) => contentWords(s.text))
  for (const claim of claims || []) {
    const words = contentWords(claim.text)
    if (!words.length || !claim.source_id) continue
    const scores = bags.map((bag) => words.filter((w) => bag.includes(w)).length / words.length)
    const best = Math.max(...scores, 0)
    const at = scores.indexOf(best)
    const next = Math.max(...scores.filter((_, i) => i !== at), 0)
    if (best >= MIN_SHARE && best - next >= MIN_LEAD && !out.has(at)) out.set(at, claim)
  }
  return out
}
