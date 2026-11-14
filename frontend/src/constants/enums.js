// SHARED CONTRACT (all three must agree)
// Keep in sync with backend/enums.py and backend/schemas.py
// OWNER: Person B

export const MOOD = Object.freeze({
  TENSE: 'tense',
  SOMBER: 'somber',
  HOPEFUL: 'hopeful',
  CURIOUS: 'curious',
  TRIUMPHANT: 'triumphant',
  NEUTRAL: 'neutral',
})

export const EDGE_TYPE = Object.freeze({
  CAUSED_BY: 'caused_by',
  HAPPENED_NEXT: 'happened_next',
  SAME_EVENT: 'same_event',
  OPPOSING_VIEW: 'opposing_view',
  DEEPER_CONTEXT: 'deeper_context',
})

export const CHOICE_TYPE = Object.freeze({
  PERSPECTIVE_SHIFT: 'perspective_shift',
  GO_DEEPER: 'go_deeper',
  WHAT_NEXT: 'what_next',
  PRIMARY_SOURCE: 'primary_source',
})

export const SOURCE_TYPE = Object.freeze({
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  ORAL_HISTORY: 'oral_history',
  NEWS: 'news',
  ENCYCLOPEDIA: 'encyclopedia',
})

export const MODE = Object.freeze({
  WEB: 'web',
  IMESSAGE: 'imessage',
})

export const ERROR_CODE = Object.freeze({
  SESSION_NOT_FOUND: 'session_not_found',
  TOPIC_NOT_SUPPORTED: 'topic_not_supported',
  LLM_TIMEOUT: 'llm_timeout',
  TTS_FAILED: 'tts_failed',
  IMAGE_FAILED: 'image_failed',
  UNGROUNDED_OUTPUT: 'ungrounded_output',
})
