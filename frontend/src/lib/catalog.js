// OWNER: Person B
// Turns story bundles into what the home screen shows: one entry per topic.
// Every count is computed from the data, never typed in.
import { sceneDataUrl, sceneKindFor } from './scene.js'
import { gradeFor } from '../constants/theme.js'

export function catalogFrom(bundles) {
  return bundles.map((b) => {
    const t = b.topic
    const first = b.segments.find((s) => s.segment_id === b.start_segment_id) || b.segments[0]
    const year = (b.segments.map((s) => s.date_label).join(' ').match(/\b(1[0-9]{3}|20[0-9]{2})\b/) || [])[1] || null
    const perspectives = t.perspectives.map((p) => ({
      id: p.perspective_id,
      label: p.label,
      grade: gradeFor(p.color),
      sourceCount: b.sources.filter((s) => s.perspective === p.perspective_id).length,
      segmentCount: b.segments.filter((s) => s.perspective === p.perspective_id).length,
      scene: sceneDataUrl({ seed: `${t.topic_id}-${p.perspective_id}`, kind: sceneKindFor(`${first?.scene_prompt} ${t.one_line}`), width: 640, height: 360 }),
    }))
    return {
      id: t.topic_id,
      title: t.title,
      oneLine: t.one_line,
      year,
      perspectives,
      sourceCount: b.sources.length,
      disagreementCount: b.segments.filter((s) => s.contradiction).length,
      hero: sceneDataUrl({ seed: `hero-${t.topic_id}`, kind: sceneKindFor(`${first?.scene_prompt} ${t.one_line}`), width: 2400, height: 1200 }),
      heroGrade: perspectives[0]?.grade,
    }
  })
}
