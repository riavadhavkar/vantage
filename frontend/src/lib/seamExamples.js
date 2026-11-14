// OWNER: Person B
import { sceneDataUrl, sceneKindFor } from './scene.js'
import { gradeFor, FALLBACK_GRADE } from '../constants/theme.js'

/** Every contradiction in the bundles, with the scene and grades it needs. */
export function examplesFrom(bundles) {
  const out = []
  for (const b of bundles) {
    const sources = Object.fromEntries(b.sources.map((s) => [s.source_id, s]))
    const persp = Object.fromEntries(b.topic.perspectives.map((p) => [p.perspective_id, p]))
    for (const seg of b.segments) {
      const c = seg.contradiction
      if (!c) continue
      const side = (s) => {
        const src = sources[s.source_id]
        const p = persp[src?.perspective]
        return { ...s, source: src, label: p?.label || '', grade: p ? gradeFor(p.color) : FALLBACK_GRADE }
      }
      out.push({
        id: c.contradiction_id,
        topic: b.topic.title,
        claim: c.claim,
        a: side(c.side_a),
        b: side(c.side_b),
        scene: sceneDataUrl({ seed: seg.segment_id, kind: sceneKindFor(`${seg.scene_prompt} ${seg.title}`), width: 1800, height: 800 }),
      })
    }
  }
  return out
}
