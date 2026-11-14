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
  session_not_found: 'this story session has ended. start again from the beginning.',
  topic_not_supported: 'we do not have sources for that topic yet. try one of these.',
  llm_timeout: 'the next part took too long to write. try again.',
  tts_failed: 'the narration voice could not load. subtitles continue.',
  image_failed: 'the illustration could not load, so this scene is drawn instead.',
  ungrounded_output: 'we could not ground that answer in the sources, so we are not narrating it. try another question or point of view.',
  network: 'the story could not load. check the connection and try again.',
  bad_response: 'the story service sent something we could not read. try again.',
}

export function messageFor(error) {
  if (!error) return ''
  return ERROR_COPY[error.code] || ERROR_COPY.network
}
