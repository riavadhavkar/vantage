// OWNER: Person B
export class ApiError extends Error {
  /** @param {string} code error_code from the backend, or 'network' / 'bad_response' */
  constructor(code, message, extra = {}) {
    super(message || code)
    this.name = 'ApiError'
    this.code = code
    this.suggestions = extra.suggestions || []
    this.status = extra.status ?? null
  }
}

/** Calm, specific copy for each failure. Says what happened and what to do. */
export const ERROR_COPY = {
  session_not_found: 'this session has ended. start again.',
  topic_not_supported: 'no sources for that topic yet. try one of these.',
  llm_timeout: 'that took too long. try again.',
  tts_failed: 'narration unavailable. subtitles continue.',
  image_failed: 'illustration unavailable. showing a drawn scene.',
  ungrounded_output: 'not narrated: we could not ground that in the sources. try another question.',
  network: 'could not load. check the connection and try again.',
  bad_response: 'unreadable response. try again.',
}

export function messageFor(error) {
  if (!error) return ''
  return ERROR_COPY[error.code] || ERROR_COPY.network
}
