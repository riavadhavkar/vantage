// OWNER: Person B
// In-browser stand-in for the backend. Plays story bundles (see src/mocks/makeSegment.js).
// Mock mode adds realistic delays and failures; demo mode is instant-ish and never fails on purpose.
import { ApiError } from './errors.js'
import { sceneDataUrl, sceneKindFor } from '../lib/scene.js'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const clone = (o) => JSON.parse(JSON.stringify(o))
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

function silentWavUrl(seconds) {
  const rate = 8000
  const n = Math.round(rate * seconds)
  const buf = new ArrayBuffer(44 + n)
  const v = new DataView(buf)
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true)
  str(36, 'data'); v.setUint32(40, n, true)
  new Uint8Array(buf, 44).fill(128)
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
}

/**
 * @param {{bundles: object[], isDemo?: boolean, mediaBase?: string}} opts
 */
export function createMockServer({ bundles, isDemo = false, mediaBase = '' }) {
  const sessions = new Map()
  const delay = (ms) => wait(isDemo ? Math.min(ms, 350) : ms)
  const segIndex = new Map()
  for (const b of bundles) for (const s of b.segments) segIndex.set(s.segment_id, { bundle: b, segment: s })
  let lastBundle = bundles[0]
  let counter = 0

  const media = (url) => (!url || /^(https?:|data:|blob:|\/)/.test(url) ? url : `${mediaBase}${url}`)

  function emit(session, segment, overrides = {}) {
    const out = { ...clone(segment), ...overrides, session_id: session.session_id }
    out.image_url = media(out.image_url)
    out.audio_url = media(out.audio_url)
    session.visited.push(out.segment_id)
    return out
  }

  function getSession(id) {
    const s = sessions.get(id)
    if (!s) throw new ApiError('session_not_found', 'Session not found')
    return s
  }

  function matchBundle(topic) {
    const q = norm(topic)
    if (!q) return null
    return bundles.find((b) => {
      const names = [b.topic.title, b.topic.topic_id, ...(b.topic.aliases || [])].map(norm)
      return names.some((n) => n && (q.includes(n) || n.includes(q)))
    })
  }

  return {
    async health() {
      return { status: 'ok' }
    },

    async getTopic() {
      await delay(250)
      return clone(lastBundle.topic)
    },

    async startSession(topic) {
      await delay(900)
      const bundle = matchBundle(topic)
      if (!bundle) {
        throw new ApiError('topic_not_supported', 'Topic not supported', {
          suggestions: bundles.map((b) => b.topic.title),
        })
      }
      lastBundle = bundle
      const session_id = `${isDemo ? 'demo' : 'mock'}-${Date.now().toString(36)}-${++counter}`
      const session = { session_id, bundle, visited: [], asks: 0 }
      sessions.set(session_id, session)
      const first = bundle.segments.find((s) => s.segment_id === bundle.start_segment_id) || bundle.segments[0]
      return { session_id, segment: emit(session, first) }
    },

    async getNextSegment(sessionId, choiceId) {
      await delay(1100)
      const session = getSession(sessionId)
      const targetId = session.bundle.routes[choiceId]
      const target = session.bundle.segments.find((s) => s.segment_id === targetId)
      if (!target) throw new ApiError('llm_timeout', 'No route for that choice')
      return { segment: emit(session, target) }
    },

    async askQuestion(sessionId, question) {
      await delay(1300)
      const session = getSession(sessionId)
      const { bundle } = session
      const q = norm(question)
      const current = session.visited[session.visited.length - 1]
      const currentSeg = segIndex.get(current)?.segment

      // A request for another point of view: pick that perspective's best segment.
      const persp = bundle.topic.perspectives.find((p) => {
        const label = norm(p.label).replace(/^the /, '')
        return q.includes(norm(p.perspective_id)) || label.split(' ').filter((w) => w.length > 3).some((w) => q.includes(w))
      })
      let pick = null
      if (persp) {
        const pool = bundle.segments.filter((s) => s.perspective === persp.perspective_id && s.segment_id !== current)
        pick = pool.find((s) => !session.visited.includes(s.segment_id)) || pool[0]
      }
      if (!pick) {
        const words = q.split(' ').filter((w) => w.length > 3)
        let best = 0
        for (const s of bundle.segments) {
          if (s.segment_id === current) continue
          const hay = norm(`${s.title} ${s.narrative_text}`)
          const score = words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0)
          if (score > best) {
            best = score
            pick = s
          }
        }
      }
      session.asks += 1
      if (!pick) {
        return {
          segment: emit(session, {
            segment_id: `${current}-ask-${session.asks}`,
            title: 'Not in the sources',
            narrative_text: '',
            perspective: currentSeg?.perspective ?? null,
            mood: 'neutral',
            voice_id: currentSeg?.voice_id ?? null,
            scene_prompt: currentSeg?.scene_prompt ?? '',
            image_url: null,
            audio_url: null,
            location: null,
            travel_from: null,
            date_label: null,
            source_ids: [],
            claims: [],
            is_grounded: false,
            grounding_notes: `SAMPLE: No passage in this topic's sources answers "${question}".`,
            connected_to: [current],
            edge_type: 'deeper_context',
            choices: (currentSeg?.choices || []).slice(0, 2),
            contradiction: null,
            is_final: false,
          }),
        }
      }
      return {
        segment: emit(session, pick, {
          segment_id: session.visited.includes(pick.segment_id) ? `${pick.segment_id}-ask-${session.asks}` : pick.segment_id,
          connected_to: [current],
          edge_type: persp ? 'opposing_view' : 'deeper_context',
        }),
      }
    },

    async getSources(sessionId) {
      await delay(400)
      return { sources: clone(getSession(sessionId).bundle.sources) }
    },

    async getGraph(sessionId) {
      await delay(300)
      const session = getSession(sessionId)
      const last = session.visited[session.visited.length - 1]
      const nodes = session.visited.map((id) => {
        const s = segIndex.get(id.replace(/-ask-\d+$/, ''))?.segment
        return { id, label: s?.title ?? '', perspective: s?.perspective ?? null, is_current: id === last }
      })
      const ids = new Set(session.visited)
      const edges = session.visited.flatMap((id) => {
        const s = segIndex.get(id.replace(/-ask-\d+$/, ''))?.segment
        return (s?.connected_to || []).filter((f) => ids.has(f)).map((f) => ({ id: `${f}->${id}`, source: f, target: id, edge_type: s.edge_type }))
      })
      return { nodes, edges }
    },

    async generateAudio({ segment_id, text }) {
      if (isDemo) {
        await wait(50)
        throw new ApiError('tts_failed', 'No cached narration for this segment')
      }
      await wait(2600)
      if (/-3$/.test(segment_id)) throw new ApiError('tts_failed', 'SAMPLE: simulated voice failure')
      const seconds = Math.max(4, String(text || '').length / 15)
      return { audio_url: silentWavUrl(seconds), audio_duration_ms: Math.round(seconds * 1000) }
    },

    async generateImage({ segment_id, scene_prompt }) {
      if (isDemo) {
        await wait(50)
        throw new ApiError('image_failed', 'No cached image for this segment')
      }
      await wait(1800)
      if (/-2$/.test(segment_id)) throw new ApiError('image_failed', 'SAMPLE: simulated image failure')
      return {
        image_url: sceneDataUrl({ seed: `img-${segment_id}`, kind: sceneKindFor(scene_prompt), width: 1600, height: 900 }),
      }
    },

    async transcribeAudio() {
      await delay(1200)
      return { text: 'What did the people in the lifeboats see?' }
    },
  }
}
