// Which AI label applies, from what is actually on screen.
export function aiKindFor({ hasImage, hasVoice }) {
  if (hasImage && hasVoice) return 'both'
  if (hasImage) return 'image'
  if (hasVoice) return 'voice'
  return null
}
