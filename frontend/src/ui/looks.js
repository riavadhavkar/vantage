// A "look" is everything the new UI derives from one perspective color in the topic data.
import { gradeFor } from './theme.js'
import { tone, toneOn } from './color.js'

export const STAGE = '#0A0C0F'

export function lookFor(color, label = '') {
  const grade = gradeFor(color)
  return {
    label,
    /** text and marks on the dark stage (7:1 or better) */
    accent: toneOn(color, STAGE, { from: 0.8, min: 7, boost: 1.4, maxC: 0.14 }),
    /** duotone ends for drawn scenes */
    highlight: tone(color, 0.86, { maxC: 0.07 }),
    shadow: tone(color, 0.16, { maxC: 0.05 }),
    /** faint wash over color illustrations, tint of the grade */
    tint: grade.highlight,
    /** highlighter on paper; ink on it stays above 7:1 */
    mark: tone(color, 0.84, { boost: 1.2, maxC: 0.09 }),
  }
}

export const NEUTRAL_LOOK = lookFor('#9FB0BF')

/** perspective_id -> look, from a Topic */
export function looksForTopic(topic) {
  const map = {}
  for (const p of topic?.perspectives || []) map[p.perspective_id] = lookFor(p.color, p.label)
  return map
}
