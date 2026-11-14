// OWNER: Person B
// Helpers that keep mock objects exactly on the contract: optional fields null, lists [].

/** @returns {import('./types').Segment} */
export function makeSegment(fields) {
  return {
    segment_id: null,
    session_id: null,
    title: '',
    narrative_text: '',
    perspective: null,
    mood: 'neutral',
    voice_id: null,
    scene_prompt: null,
    image_url: null,
    audio_url: null,
    location: null,
    travel_from: null,
    date_label: null,
    source_ids: [],
    claims: [],
    is_grounded: true,
    grounding_notes: null,
    connected_to: null,
    edge_type: null,
    choices: [],
    contradiction: null,
    is_final: false,
    ...fields,
  }
}

/** Claim helper: [text, source_id] pairs -> Claim objects. */
export function claims(segmentId, pairs) {
  return pairs.map(([text, source_id], i) => ({
    claim_id: `${segmentId}-claim-${i + 1}`,
    text,
    source_id,
    chunk_id: `SAMPLE-${source_id}-chunk-${i + 1}`,
  }))
}

export function sourceIdsOf(claimList) {
  return [...new Set(claimList.map((c) => c.source_id))]
}

/**
 * A story bundle is the unit the mock server and demo mode play:
 * { topic, sources, segments, start_segment_id, routes: {choice_id: segment_id} }
 * demo/demo_path.json may be an array of bundles in this shape, with cached
 * image_url and audio_url filled on each segment.
 */
export function finalizeBundle(bundle) {
  for (const s of bundle.segments) {
    s.source_ids = s.source_ids.length ? s.source_ids : sourceIdsOf(s.claims)
    const p = bundle.topic.perspectives.find((x) => x.perspective_id === s.perspective)
    if (p && !s.voice_id) s.voice_id = p.voice_id
  }
  return bundle
}
