// Which interface to render. The new UI is opt-in with ?ui=v2; anything else is today's UI.
const param = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ui') : null

/** 'v2' | 'classic' */
export const UI = param === 'v2' ? 'v2' : 'classic'

if (UI === 'v2' && typeof document !== 'undefined') document.documentElement.dataset.ui = 'v2'
