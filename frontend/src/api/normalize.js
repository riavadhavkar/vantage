// Accept both the brief's contract and backend/schemas.py as merged on main:
// connected_to may be a string or a list; claims / is_grounded / grounding_notes may be absent.
// Unknown or missing fields get the contract defaults (null or []), never invented values.

export function normalizeSegment(seg) {
  if (!seg) return seg
  const connected = seg.connected_to
  return {
    ...seg,
    connected_to: Array.isArray(connected) ? connected : connected ? [connected] : [],
    claims: Array.isArray(seg.claims) ? seg.claims : [],
    source_ids: Array.isArray(seg.source_ids) ? seg.source_ids : [],
    choices: Array.isArray(seg.choices) ? seg.choices : [],
    is_grounded: seg.is_grounded !== false,
    grounding_notes: seg.grounding_notes ?? null,
    scene_prompt: seg.scene_prompt || null,
    scene_prompts: Array.isArray(seg.scene_prompts) ? seg.scene_prompts.filter(Boolean) : [],
    contradiction: seg.contradiction ?? null,
    location: seg.location ?? null,
    travel_from: seg.travel_from ?? null,
    date_label: seg.date_label ?? null,
  }
}

export function normalizeSource(src) {
  return { license: null, attribution: null, url: null, excerpt: '', ...src }
}

const DERIVED_COLORS = ['#6F9BC4', '#C49A6C', '#9DB29A', '#B49AAE', '#AEB4B1', '#8FB3B0']

const humanize = (id) => {
  const s = String(id).replace(/[_-]+/g, ' ').trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Until GET /api/topic exists, build a topic-shaped object from what the session has shown.
 * Perspectives stay data: ids come from segments, choices and sources, never a fixed list.
 */
export function deriveTopic({ title, segments = [], sources = [] }) {
  const ids = []
  const add = (id) => id && !ids.includes(id) && ids.push(id)
  for (const s of segments) {
    add(s.perspective)
    for (const c of s.choices || []) add(c.perspective)
  }
  for (const s of sources) add(s.perspective)
  return {
    topic_id: null,
    title: title || '',
    one_line: '',
    aliases: [],
    perspectives: ids.map((id, i) => ({
      perspective_id: id,
      label: humanize(id),
      color: DERIVED_COLORS[i % DERIVED_COLORS.length],
      voice_id: null,
      description: null,
    })),
  }
}
