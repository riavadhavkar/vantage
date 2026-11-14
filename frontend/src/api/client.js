// OWNER: Person B
// Every network call lives here. The frontend never holds an API key and never picks a voice.
import { ApiError } from './errors.js'
import { normalizeSegment, normalizeSource } from './normalize.js'

export { ApiError }

const env = import.meta.env
const legacy = env.VITE_API_URL ? env.VITE_API_URL.replace(/\/+$/, '') + '/api' : null
export const API_URL = (env.VITE_VANTAGE_API_URL || legacy || 'http://localhost:8000/api').replace(/\/+$/, '')

const USE_MOCKS = env.VITE_VANTAGE_USE_MOCKS === '1'
const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
const WANTS_DEMO = env.VITE_VANTAGE_DEMO_MODE === '1' || params.get('demo') === '1'

/** 'live' | 'mock' | 'demo' | 'offline' (offline = API unreachable, playing the cached demo) */
let dataSource = USE_MOCKS ? 'mock' : WANTS_DEMO ? 'demo' : 'live'
let localServer = null

export const getDataSource = () => dataSource

async function loadDemoBundles() {
  try {
    const res = await fetch('/demo/demo_path.json', { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      const list = Array.isArray(data) ? data : data?.bundles
      if (Array.isArray(list) && list.length && list[0]?.topic && list[0]?.segments) return list
    }
  } catch {
    // fall through to the bundled sample path
  }
  const { SAMPLE_BUNDLES } = await import('../mocks/index.js')
  return SAMPLE_BUNDLES
}

async function server() {
  if (localServer) return localServer
  const { createMockServer } = await import('./mockServer.js')
  if (dataSource === 'mock') {
    const { SAMPLE_BUNDLES } = await import('../mocks/index.js')
    localServer = createMockServer({ bundles: SAMPLE_BUNDLES })
  } else {
    localServer = createMockServer({ bundles: await loadDemoBundles(), isDemo: true, mediaBase: '/demo/' })
  }
  return localServer
}

/**
 * Decide where data comes from. In live mode, checks /health and falls back to the
 * cached demo (labeled "Offline mode") when the API cannot be reached.
 */
export async function resolveDataSource() {
  if (dataSource !== 'live') {
    await server()
    return dataSource
  }
  try {
    await request('/health', { timeoutMs: 2500 })
  } catch {
    dataSource = 'offline'
    await server()
  }
  return dataSource
}

async function request(path, { method = 'GET', body, query, timeoutMs = 45000, isForm = false } = {}) {
  const url = new URL(API_URL + path)
  if (query) for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
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

const isLocal = () => dataSource !== 'live'

export async function getTopic() {
  if (isLocal()) return (await server()).getTopic()
  return request('/topic')
}

/** @returns {Promise<{session_id: string, segment: object}>} */
export async function startSession(topic) {
  const data = isLocal() ? await (await server()).startSession(topic) : await request('/start', { method: 'POST', body: { topic } })
  return { ...data, segment: normalizeSegment(data.segment) }
}

/** @returns {Promise<{segment: object}>} */
export async function getNextSegment(sessionId, choiceId) {
  const data = isLocal()
    ? await (await server()).getNextSegment(sessionId, choiceId)
    : await request('/next-segment', { method: 'POST', body: { session_id: sessionId, choice_id: choiceId } })
  return { segment: normalizeSegment(data.segment) }
}

/** @returns {Promise<{segment: object}>} */
export async function askQuestion(sessionId, question) {
  const data = isLocal()
    ? await (await server()).askQuestion(sessionId, question)
    : await request('/ask', { method: 'POST', body: { session_id: sessionId, question } })
  return { segment: normalizeSegment(data.segment) }
}

/** @returns {Promise<{sources: object[]}>} */
export async function getSources(sessionId) {
  const data = isLocal() ? await (await server()).getSources(sessionId) : await request('/sources', { query: { session_id: sessionId } })
  return { sources: (data.sources || []).map(normalizeSource) }
}

/** @returns {Promise<{nodes: object[], edges: object[]}>} */
export async function getGraph(sessionId) {
  if (isLocal()) return (await server()).getGraph(sessionId)
  return request('/graph', { query: { session_id: sessionId } })
}

/** @returns {Promise<{audio_url: string, audio_duration_ms: number}>} */
export async function generateAudio({ segment_id, text, voice_id }) {
  if (isLocal()) return (await server()).generateAudio({ segment_id, text, voice_id })
  const data = await request('/tts', { method: 'POST', body: { segment_id, text, voice_id }, timeoutMs: 60000 })
  return { ...data, audio_url: absolute(data.audio_url) }
}

/** @returns {Promise<{image_url: string}>} */
export async function generateImage({ segment_id, scene_prompt }) {
  if (isLocal()) return (await server()).generateImage({ segment_id, scene_prompt })
  const data = await request('/image', { method: 'POST', body: { segment_id, scene_prompt }, timeoutMs: 100000 })
  return { ...data, image_url: absolute(data.image_url) }
}

/** @param {Blob} audioBlob @returns {Promise<{text: string}>} */
export async function transcribeAudio(audioBlob) {
  if (isLocal()) return (await server()).transcribeAudio(audioBlob)
  const form = new FormData()
  form.append('audio', audioBlob, 'question.webm')
  return request('/transcribe', { method: 'POST', body: form, isForm: true, timeoutMs: 30000 })
}

/** Media paths from the backend may be relative to its origin. */
export function absolute(url) {
  if (!url || /^(https?:|data:|blob:)/.test(url) || isLocal()) return url
  const origin = new URL(API_URL).origin
  return url.startsWith('/') ? origin + url : `${origin}/${url}`
}
