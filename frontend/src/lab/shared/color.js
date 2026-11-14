// Lab only. OKLCH helpers so each direction can derive its palette from a
// perspective's hue (perspective colors always come from the topic data).
import { hexToRgb, rgbToHex, contrast } from '../../constants/theme.js'

export { contrast }

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

export function toOklch(hex) {
  const [r, g, b] = (hexToRgb(hex) || [0.6, 0.6, 0.6]).map(toLinear)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { l: L, c: Math.hypot(A, B), h: Math.atan2(B, A) }
}

function inGamut({ l, c, h }) {
  const A = c * Math.cos(h)
  const B = c * Math.sin(h)
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3
  const rgb = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ]
  return { rgb, ok: rgb.every((v) => v >= -0.0005 && v <= 1.0005) }
}

/**
 * The perspective's hue at a chosen lightness. `boost` multiplies the source chroma
 * (topic colors are muted), `maxC` caps it. Chroma is reduced until the color fits sRGB,
 * so a neutral perspective color stays neutral.
 */
export function tone(hex, l, { boost = 1, maxC = 0.37 } = {}) {
  const base = toOklch(hex)
  let c = Math.min(base.c * boost, maxC)
  let out = inGamut({ l, c, h: base.h })
  while (!out.ok && c > 0.002) {
    c -= 0.004
    out = inGamut({ l, c, h: base.h })
  }
  return rgbToHex(out.rgb.map((v) => clamp01(toGamma(clamp01(v)))))
}

/** Lightest-to-darkest search for a tone of this hue that meets a contrast ratio on `bg`. */
export function toneOn(hex, bg, { min = 4.5, from = 0.7, dir = 1, boost = 1, maxC = 0.37 } = {}) {
  let best = tone(hex, from, { boost, maxC })
  for (let l = from; l >= 0.05 && l <= 0.98; l += 0.02 * dir) {
    best = tone(hex, l, { boost, maxC })
    if (contrast(best, bg) >= min) break
  }
  return best
}
