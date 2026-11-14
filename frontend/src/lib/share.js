// Share the current story link. Web Share API first, clipboard second. No share card exists yet.
/** @returns {Promise<'shared'|'copied'|'failed'>} */
export async function shareStory({ title, url }) {
  try {
    if (navigator.share) {
      await navigator.share({ title, url })
      return 'shared'
    }
  } catch (e) {
    if (e?.name === 'AbortError') return 'failed'
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
