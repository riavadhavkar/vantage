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
  session_not_found: 'This story session has ended. Start again from the beginning.',
  topic_not_supported: 'We do not have sources for that topic yet. Try one of these.',
  llm_timeout: 'The next part took too long to write. Try again.',
  tts_failed: 'The narration voice could not load. Captions continue below.',
  image_failed: 'The illustration could not load, so this scene is drawn instead.',
  ungrounded_output: 'We could not ground that answer in the sources, so we are not narrating it. Try another question or point of view.',
  network: 'The story could not load. Check the connection and try again.',
  bad_response: 'The story service sent something we could not read. Try again.',
}

export function messageFor(error) {
  if (!error) return ''
  return ERROR_COPY[error.code] || ERROR_COPY.network
}
