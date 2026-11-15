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
  const data = await request('/start', { method: 'POST', body: language ? { topic, language } : { topic }, timeoutMs: 120000 })
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

/**
 * The study map: a centre title and five branches of points, each citing sources. The first call
 * for a story takes about 20 seconds (the backend caches it after that).
 * @returns {Promise<{center: string, branches: {id: string, label: string, points: {text: string, source_ids: string[]}[]}[]}>}
 */
export async function getAnalysis(sessionId) {
  const d = await request('/analysis', { method: 'POST', body: { session_id: sessionId }, timeoutMs: 60000 })
  return {
    center: d.center || '',
    branches: (d.branches || []).map((b) => ({
      id: b.id,
      label: b.label,
      points: (b.points || []).filter((p) => p?.text).map((p) => ({ text: p.text, source_ids: Array.isArray(p.source_ids) ? p.source_ids : [] })),
    })),
  }
}

// Computed facts for a scene (Wolfram|Alpha). Asked once per text; a failed call can be retried.
const facts = new Map()
/** @returns {Promise<{label: string, query: string, answer: string}[]>} */
export function getFacts(text) {
  if (facts.has(text)) return facts.get(text)
  const promise = request('/facts', { method: 'POST', body: { text }, timeoutMs: 30000 })
    .then((d) => (Array.isArray(d.facts) ? d.facts.filter((f) => f?.label && f?.answer) : []))
    .catch((err) => {
      facts.delete(text)
      throw err
    })
  facts.set(text, promise)
  return promise
}

// Image and voice calls are paid. A repeat of a request that is in flight, or already done (a
// re-render, React running an effect twice in development, going back to a scene), reuses the one
// call instead of making another. A failed call, or one that came back without a file, is dropped
// from the cache so it can be retried.
const MEDIA_CACHE_MAX = 200
const media = new Map()
function once(key, make, isUsable) {
  if (media.has(key)) return media.get(key)
  const promise = make().then(
    (result) => {
      if (!isUsable(result)) media.delete(key)
      return result
    },
    (err) => {
      media.delete(key)
      throw err
    },
  )
  media.set(key, promise)
  if (media.size > MEDIA_CACHE_MAX) media.delete(media.keys().next().value)
  return promise
}

/** @returns {Promise<{audio_url: string, audio_duration_ms: number}>} */
export function generateAudio({ segment_id, text, voice_id }) {
  return once(
    `tts|${segment_id}|${voice_id}|${text}`,
    async () => {
      const data = await request('/tts', { method: 'POST', body: { segment_id, text, voice_id }, timeoutMs: 60000 })
      return { ...data, audio_url: absolute(data.audio_url) }
    },
    (d) => !!d.audio_url,
  )
}

/** @returns {Promise<{image_url: string}>} */
export function generateImage({ segment_id, scene_prompt }) {
  return once(
    `image|${segment_id}|${scene_prompt}`,
    async () => {
      const data = await request('/image', { method: 'POST', body: { segment_id, scene_prompt }, timeoutMs: 100000 })
      return { ...data, image_url: absolute(data.image_url) }
    },
    (d) => !!d.image_url,
  )
}

/** @param {Blob} audioBlob @returns {Promise<{text: string}>} */
export function transcribeAudio(audioBlob) {
  const form = new FormData()
  form.append('audio', audioBlob, 'question.webm')
  return request('/transcribe', { method: 'POST', body: form, isForm: true, timeoutMs: 30000 })
}
