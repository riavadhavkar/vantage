// Every network call to the backend lives here. The frontend never holds an API key.
import { ApiError } from './errors.js'
import { normalizeSegment, normalizeSource } from './normalize.js'

export { ApiError }

export const API_URL = (import.meta.env.VITE_VANTAGE_API_URL || 'http://localhost:8000/api').replace(/\/+$/, '')

/** Shown when the languages endpoint cannot be reached. */
export const FALLBACK_LANGUAGES = Object.freeze([
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'hi', name: 'Hindi' },
  { code: 'fr', name: 'French' },
])

async function request(path, { method = 'GET', body, query, timeoutMs = 45000, isForm = false, signal: outer } = {}) {
  const url = new URL(API_URL + path)
  if (query) for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  if (outer) outer.addEventListener('abort', () => ctrl.abort(), { once: true })
  let res
  try {
    res = await fetch(url, {
      method,
      signal: ctrl.signal,
      headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    })
  } catch (e) {
    throw new ApiError(e?.name === 'AbortError' ? 'llm_timeout' : 'network', 'Request failed')
  } finally {
    clearTimeout(timer)
  }
  let data = null
  try {
    data = await res.json()
  } catch {
    if (res.ok) throw new ApiError('bad_response', 'Response was not JSON', { status: res.status })
  }
  if (!res.ok || data?.error_code) {
    throw new ApiError(data?.error_code || 'network', data?.message || res.statusText, {
      suggestions: data?.suggestions,
      status: res.status,
    })
  }
  return data
}

/** Media paths from the backend may be relative to its origin. */
export function absolute(url) {
  if (!url || /^(https?:|data:|blob:)/.test(url)) return url
  const origin = new URL(API_URL).origin
  return url.startsWith('/') ? origin + url : `${origin}/${url}`
}

/** @param {string} [sessionId] the session's topic; without it, the server's default */
export const getTopic = (sessionId) => request('/topic', sessionId ? { query: { session_id: sessionId } } : {})

/** @param {string} topic @param {string} [language] narration language code, fixed when the session starts */
export async function startSession(topic, language) {
  const data = await request('/start', { method: 'POST', body: language ? { topic, language } : { topic } })
  return { ...data, segment: normalizeSegment(data.segment) }
}

/** @returns {Promise<{languages: {code: string, name: string}[]}>} */
export async function getLanguages() {
  const data = await request('/languages', { timeoutMs: 5000 })
  const list = (data?.languages || []).filter((l) => l?.code && l?.name)
  return { languages: list.length ? list : [...FALLBACK_LANGUAGES] }
}

/** Subtitles in another language. @returns {Promise<{text: string}>} */
export const translateText = (text, target, { signal } = {}) => request('/translate', { method: 'POST', body: { text, target }, timeoutMs: 30000, signal })

/** @returns {Promise<{segment: object}>} */
export async function getNextSegment(sessionId, choiceId) {
  const data = await request('/next-segment', { method: 'POST', body: { session_id: sessionId, choice_id: choiceId } })
  return { segment: normalizeSegment(data.segment) }
}

/** @returns {Promise<{segment: object}>} */
export async function askQuestion(sessionId, question) {
  const data = await request('/ask', { method: 'POST', body: { session_id: sessionId, question } })
  return { segment: normalizeSegment(data.segment) }
}

/** @returns {Promise<{sources: object[]}>} */
export async function getSources(sessionId) {
  const data = await request('/sources', { query: { session_id: sessionId } })
  return { sources: (data.sources || []).map(normalizeSource) }
}

/** @returns {Promise<{nodes: object[], edges: object[]}>} */
export const getGraph = (sessionId) => request('/graph', { query: { session_id: sessionId } })

/** @returns {Promise<{audio_url: string, audio_duration_ms: number}>} */
export async function generateAudio({ segment_id, text, voice_id }) {
  const data = await request('/tts', { method: 'POST', body: { segment_id, text, voice_id }, timeoutMs: 60000 })
  return { ...data, audio_url: absolute(data.audio_url) }
}

/** @returns {Promise<{image_url: string}>} */
export async function generateImage({ segment_id, scene_prompt }) {
  const data = await request('/image', { method: 'POST', body: { segment_id, scene_prompt }, timeoutMs: 100000 })
  return { ...data, image_url: absolute(data.image_url) }
}

/** @param {Blob} audioBlob @returns {Promise<{text: string}>} */
export function transcribeAudio(audioBlob) {
  const form = new FormData()
  form.append('audio', audioBlob, 'question.webm')
  return request('/transcribe', { method: 'POST', body: form, isForm: true, timeoutMs: 30000 })
}
