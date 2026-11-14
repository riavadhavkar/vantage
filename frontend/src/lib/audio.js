// OWNER: Person B
// One shared narration element, unlocked by the Begin gesture so later segments can play.
let narration = null
const SILENCE =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='

export function getNarrationAudio() {
  if (!narration && typeof Audio !== 'undefined') {
    narration = new Audio()
    narration.preload = 'auto'
  }
  return narration
}

/** Call inside a click handler (Begin). Safe to call more than once. */
export function unlockAudio() {
  const el = getNarrationAudio()
  if (!el || el.dataset.unlocked) return
  el.dataset.unlocked = '1'
  el.src = SILENCE
  el.play().then(() => el.pause()).catch(() => {})
}
