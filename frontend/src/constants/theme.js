// OWNER: Person B
// Design tokens (see frontend/DESIGN.md). Mirrored in src/index.css @theme.

export const COLORS = Object.freeze({
  prussian: '#0A1E30',
  developer: '#12304A',
  print: '#EEF0EA',
  fog: '#9FB0BF',
  fiber: '#D9D8CC',
  safelight: '#D2402F',
  safelightText: '#F0715F',
  // Light paper surface for the landing page (evidence side of the product)
  paper: '#F4F3EE',
  inkMuted: '#5B6B78',
  safelightInk: '#B8321F',
})

export const FADE_MS = 700
export const STAGGER_MS = 200
export const TYPE_SPEED_MS = 30
/** Perspective pull: iris close, grade swap under the closed iris, iris open. */
export const PULL_MS = 700
export const PULL_CLOSE_MS = 260
export const PULL_HOLD_MS = 180
export const PULL_OPEN_MS = 260
/** Image arrival: the print develops out of the dark. */
export const DEVELOP_MS = 1200
export const EASE_FOCUS = [0.2, 0.7, 0.1, 1]

/* ---------- motion tokens (new UI). Mirrored in src/index.css @theme; scaled by ?motion= in src/lib/motionMode.js ---------- */

/** One duration scale for everything. micro: press and hover. quick: small reveals. panel: sheets and rows.
 *  scene: stage-level changes. slow: one-off arrivals (landing load, image develop). */
export const DURATION = Object.freeze({ micro: 120, quick: 200, panel: 320, scene: 600, slow: 900 })
/** The perspective switch: soften, swap under the blur, sharpen. 700 ms in total, one easing. */
export const SIGNATURE = Object.freeze({ soften: 260, swap: 180, sharpen: 260 })
/** enter: things arriving (ease-out). move: things travelling between two places (ease-in-out). exit: things leaving. */
export const EASING = Object.freeze({ enter: [0.2, 0.7, 0.1, 1], move: [0.65, 0, 0.2, 1], exit: [0.5, 0, 0.8, 0.4] })
/** Physical movement (the lens ring, sheets, shared elements). Near critical damping: it settles, it does not bounce. */
export const SPRING = Object.freeze({ type: 'spring', stiffness: 260, damping: 28, mass: 0.9 })
export const STAGGER_STEP_MS = 60

/* ---------- color math (sRGB <-> OKLCH, WCAG contrast) ---------- */

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

export function hexToRgb(hex) {
  let h = String(hex || '').replace('#', '').trim()
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255)
}

export function rgbToHex(rgb) {
  return '#' + rgb.map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()
}

function rgbToOklch([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map(toLinear)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { l: L, c: Math.hypot(A, B), h: Math.atan2(B, A) }
}

function oklchToRgb({ l, c, h }) {
  const A = c * Math.cos(h)
  const B = c * Math.sin(h)
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ].map((v) => clamp01(toGamma(v)))
}

const oklchHex = (lch) => rgbToHex(oklchToRgb(lch))

export function luminance(hex) {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  const [r, g, b] = rgb.map(toLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

/**
 * Derive a photographic grade from a perspective color.
 * shadow/highlight are the duotone ends; text is AA-safe on prussian and developer;
 * mark highlights excerpts on paper while keeping prussian ink at AA.
 * @param {string} color hex from GET /api/topic
 */
export function gradeFor(color) {
  const rgb = hexToRgb(color) || hexToRgb(COLORS.fog)
  const base = rgbToOklch(rgb)
  const shadow = oklchHex({ l: 0.2, c: Math.min(base.c, 0.06), h: base.h })
  const highlight = oklchHex({ l: 0.93, c: Math.min(base.c, 0.05), h: base.h })

  let text = rgbToHex(rgb)
  for (let l = Math.max(base.l, 0.62); l <= 0.98; l += 0.02) {
    text = oklchHex({ l, c: Math.min(base.c, 0.14), h: base.h })
    if (contrast(text, COLORS.prussian) >= 4.5 && contrast(text, COLORS.developer) >= 4.5) break
  }

  let mark = COLORS.fiber
  for (let c = Math.min(base.c, 0.1); c >= 0; c -= 0.01) {
    mark = oklchHex({ l: 0.84, c, h: base.h })
    if (contrast(mark, COLORS.prussian) >= 7) break
  }

  return { base: rgbToHex(rgb), shadow, highlight, text, mark }
}

/** Grades for the landing hero when no topic is available. Unnamed on purpose. */
export const NEUTRAL_GRADE_COLORS = ['#7F97AE', '#A8ACA4', '#B29A80']

/** Build a perspective_id -> grade lookup from a Topic. */
export function gradesForTopic(topic) {
  const map = {}
  for (const p of topic?.perspectives || []) map[p.perspective_id] = { ...gradeFor(p.color), label: p.label }
  return map
}

export const FALLBACK_GRADE = { ...gradeFor(COLORS.fog), label: '' }
