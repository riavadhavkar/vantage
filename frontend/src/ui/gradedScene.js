// A drawn scene with its perspective grade baked in. The classic stage grades a grayscale scene
// with two full-screen blend layers; here the same duotone (multiply by the highlight, then keep
// the lighter of that and the shadow) is applied to the scene's own colors once, so the frame is
// a plain image and a focus pull has no blend layers to composite.
import { sceneSvg, sceneKindFor } from './scene.js'
import { hexToRgb } from './theme.js'

const cache = new Map()

export function gradedSceneUrl({ seed, kind, width = 1600, height = 900 }, look) {
  const key = `${seed}|${kind}|${width}|${height}|${look.highlight}|${look.shadow}`
  if (cache.has(key)) return cache.get(key)
  const hi = hexToRgb(look.highlight) || [1, 1, 1]
  const lo = hexToRgb(look.shadow) || [0, 0, 0]
  const tone = (v) => `rgb(${hi.map((h, i) => Math.round(Math.max(v * h, lo[i]) * 255)).join(',')})`
  const svg = sceneSvg({ seed, kind, width, height })
    .replace(/rgb\((\d+),\d+,\d+\)/g, (_, n) => tone(Number(n) / 255))
    .replace(/#fff\b/g, tone(1))
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  cache.set(key, url)
  return url
}

/** The drawn scene for a segment, at the size the stage uses. */
export const sceneOptsFor = (segment) => ({ seed: segment.segment_id, kind: sceneKindFor(`${segment.scene_prompt || ''} ${segment.title}`), width: 1600, height: 900 })
