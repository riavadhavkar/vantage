// OWNER: Person B
// Helpers that keep mock objects on the contract: optional fields null, lists [].

export function makeSegment(fields) {
  return {
    segment_id: null,
    session_id: null,
    title: '',
    narrative_text: '',
    perspective: null,
    mood: 'neutral',
    voice_id: null,
    scene_prompt: '',
    image_url: null,
    audio_url: null,
    location: null,
    travel_from: null,
    date_label: null,
    source_ids: [],
    claims: [],
    is_grounded: true,
    grounding_notes: null,
    connected_to: [],
    edge_type: null,
    choices: [],
    contradiction: null,
    is_final: false,
    ...fields,
  }
}

/** [text, source_id] pairs -> Claim objects. */
export function claims(segmentId, pairs) {
  return pairs.map(([text, source_id], i) => ({
    claim_id: `${segmentId}-claim-${i + 1}`,
    text,
    source_id,
    chunk_id: `SAMPLE-${source_id}-chunk-${i + 1}`,
  }))
}

// The team source list uses some types outside the SourceType enum. Map them for the mocks
// and flag them in docs/BUILD_LOG.md for Person C.
const TYPE_MAP = {
  secondary_with_primary: 'secondary',
  interpretive_first_person: 'secondary',
  official_modern: 'primary',
  press_1912: 'news',
}

/**
 * Build a Source from a row of data/documents.csv. The excerpt is the team's note,
 * labeled as a summary: verbatim chunks come from the backend retriever.
 */
export function sourceFromRow([source_id, title, publisher, url, source_type, perspective, note]) {
  return {
    source_id,
    title,
    source_type: TYPE_MAP[source_type] || source_type,
    perspective,
    url,
    excerpt: `SAMPLE: Summary from the team source list, not a quotation. ${note}`,
    license: null,
    attribution: publisher,
  }
}

/**
 * A story bundle is the unit the mock server and demo mode play:
 * { topic, sources, segments, start_segment_id, routes: {choice_id: segment_id} }
 * demo/demo_path.json may be an array of bundles in this shape, with cached
 * image_url and audio_url filled on each segment.
 */
export function finalizeBundle(bundle) {
  for (const s of bundle.segments) {
    if (!s.source_ids.length) s.source_ids = [...new Set(s.claims.map((c) => c.source_id))]
    const p = bundle.topic.perspectives.find((x) => x.perspective_id === s.perspective)
    if (p && !s.voice_id) s.voice_id = p.voice_id
  }
  return bundle
}
