// OWNER: Person B
// Procedural grayscale scenes. They are graded like any print, so the page is
// beautiful with no generated assets. Topic-agnostic: the kind of scene is chosen
// from keywords in whatever text describes it, never from a hardcoded topic.

export function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function rng(seed) {
  let a = typeof seed === 'number' ? seed : hashString(seed)
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const KIND_WORDS = {
  sea: ['sea', 'ocean', 'ship', 'deck', 'boat', 'harbor', 'harbour', 'wave', 'ice', 'shore', 'river', 'water', 'voyage', 'liner'],
  interior: ['room', 'hall', 'inside', 'interior', 'office', 'cabin', 'chamber', 'courtroom', 'hearing', 'desk', 'wireless', 'library'],
  town: ['town', 'street', 'city', 'building', 'village', 'college', 'square', 'house'],
  land: ['field', 'orchard', 'hill', 'road', 'farm', 'forest', 'march', 'battle', 'camp', 'snow', 'winter'],
}

export function sceneKindFor(text = '') {
  const t = String(text).toLowerCase()
  let best = 'land'
  let bestScore = 0
  for (const [kind, words] of Object.entries(KIND_WORDS)) {
    const score = words.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0)
    if (score > bestScore) {
      best = kind
      bestScore = score
    }
  }
  return best
}

const g = (v) => {
  const n = Math.round(Math.max(0, Math.min(1, v)) * 255)
  return `rgb(${n},${n},${n})`
}

function ridge(r, { y, amp, step, w, h, rough = 0.5 }) {
  let pts = []
  let v = 0
  for (let x = -step; x <= w + step; x += step) {
    v = v * rough + (r() - 0.5) * (1 - rough) * 2
    pts.push([x, y + v * amp + Math.sin(x / (w / 2.3) + r()) * amp * 0.4])
  }
  return `M${-step},${h} ` + pts.map(([x, py]) => `L${x.toFixed(1)},${py.toFixed(1)}`).join(' ') + ` L${w + step},${h} Z`
}

function sky(id, top, bottom) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${g(top)}"/><stop offset="1" stop-color="${g(bottom)}"/></linearGradient>`
}

function glow(id, x, y, rad, strength) {
  return `<radialGradient id="${id}" cx="${x}" cy="${y}" r="${rad}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="${strength}"/><stop offset="0.35" stop-color="#fff" stop-opacity="${strength * 0.35}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`
}

function seaScene(r, w, h) {
  const hy = h * (0.56 + r() * 0.06)
  const lx = w * (0.25 + r() * 0.5)
  const ly = hy - h * (0.12 + r() * 0.12)
  let s = `<defs>${sky('sk', 0.08, 0.5)}${glow('gl', lx, ly, w * 0.45, 0.55)}<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${g(0.3)}"/><stop offset="1" stop-color="${g(0.04)}"/></linearGradient><filter id="hz"><feGaussianBlur stdDeviation="${h * 0.02}"/></filter></defs>`
  s += `<rect width="${w}" height="${h}" fill="url(#sk)"/><rect width="${w}" height="${h}" fill="url(#gl)"/>`
  s += `<circle cx="${lx}" cy="${ly}" r="${h * 0.025}" fill="${g(0.95)}"/>`
  for (let i = 0; i < 4; i++) {
    s += `<rect x="${-w * 0.1}" y="${hy - h * (0.05 + i * 0.07) - r() * 20}" width="${w * 1.2}" height="${h * 0.03}" fill="${g(0.75)}" opacity="${0.08 + r() * 0.1}" filter="url(#hz)"/>`
  }
  s += `<rect y="${hy}" width="${w}" height="${h - hy}" fill="url(#sea)"/>`
  for (let i = 0; i < 70; i++) {
    const yy = hy + Math.pow(r(), 1.6) * (h - hy)
    const spread = 0.04 + ((yy - hy) / (h - hy)) * 0.22
    const xx = lx + (r() - 0.5) * w * spread * 2
    const len = 8 + r() * 40 * (1 + (yy - hy) / 80)
    s += `<rect x="${xx}" y="${yy}" width="${len}" height="${1 + r() * 2}" fill="#fff" opacity="${(0.15 + r() * 0.45) * (1 - (yy - hy) / (h - hy))}"/>`
  }
  const sx = w * (0.15 + r() * 0.55)
  const sl = w * (0.22 + r() * 0.08)
  const sh = h * 0.035
  let ship = `<path d="M${sx},${hy - sh} L${sx + sl},${hy - sh} L${sx + sl * 0.97},${hy} L${sx + sl * 0.04},${hy} Z" fill="${g(0.03)}"/>`
  ship += `<rect x="${sx + sl * 0.12}" y="${hy - sh * 1.7}" width="${sl * 0.72}" height="${sh * 0.75}" fill="${g(0.03)}"/>`
  const stacks = 3 + Math.floor(r() * 2)
  for (let i = 0; i < stacks; i++) {
    const cx = sx + sl * (0.24 + (i * 0.5) / stacks)
    ship += `<path d="M${cx},${hy - sh * 1.7} L${cx + sl * 0.035},${hy - sh * 1.7} L${cx + sl * 0.045},${hy - sh * 3.6} L${cx + sl * 0.01},${hy - sh * 3.6} Z" fill="${g(0.03)}"/>`
  }
  for (let i = 0; i < 9; i++) ship += `<rect x="${sx + sl * (0.15 + i * 0.075)}" y="${hy - sh * 0.6}" width="3" height="2" fill="${g(0.85)}"/>`
  s += ship
  s += `<path d="${ridge(r, { y: h * 0.93, amp: h * 0.02, step: w / 30, w, h, rough: 0.3 })}" fill="${g(0.02)}" opacity="0.8"/>`
  return s
}

function landScene(r, w, h) {
  const lx = w * (0.2 + r() * 0.6)
  const ly = h * (0.28 + r() * 0.12)
  let s = `<defs>${sky('sk', 0.12, 0.62)}${glow('gl', lx, ly, w * 0.5, 0.6)}<filter id="hz"><feGaussianBlur stdDeviation="${h * 0.015}"/></filter></defs>`
  s += `<rect width="${w}" height="${h}" fill="url(#sk)"/><rect width="${w}" height="${h}" fill="url(#gl)"/>`
  const layers = [
    { y: 0.5, amp: 0.05, c: 0.48 },
    { y: 0.6, amp: 0.06, c: 0.32 },
    { y: 0.72, amp: 0.05, c: 0.17 },
    { y: 0.86, amp: 0.04, c: 0.05 },
  ]
  layers.forEach((L, i) => {
    s += `<path d="${ridge(r, { y: h * L.y, amp: h * L.amp, step: w / 24, w, h, rough: 0.55 })}" fill="${g(L.c)}"/>`
    if (i === 1 || i === 2) {
      let trees = ''
      const n = 26 + Math.floor(r() * 20)
      for (let k = 0; k < n; k++) {
        const tx = r() * w
        const th = h * (0.03 + r() * 0.05) * (i === 2 ? 1.5 : 1)
        const ty = h * L.y + (r() - 0.6) * h * L.amp
        trees += `<path d="M${tx},${ty - th} L${tx + th * 0.28},${ty} L${tx - th * 0.28},${ty} Z"/>`
      }
      s += `<g fill="${g(L.c)}">${trees}</g>`
    }
    if (i < 3) s += `<rect y="${h * L.y - h * 0.03}" width="${w}" height="${h * 0.05}" fill="#fff" opacity="0.07" filter="url(#hz)"/>`
  })
  const fy = h * 0.9
  let posts = ''
  for (let k = 0; k < 9; k++) {
    const px = w * 0.05 + k * w * (0.08 + r() * 0.02)
    posts += `<rect x="${px}" y="${fy - h * 0.06 + k * 2}" width="${w * 0.006}" height="${h * 0.09}"/>`
  }
  s += `<g fill="${g(0.02)}">${posts}</g><path d="M0,${fy - h * 0.04} L${w},${fy - h * 0.02}" stroke="${g(0.02)}" stroke-width="3"/>`
  return s
}

function townScene(r, w, h) {
  const lx = w * (0.15 + r() * 0.7)
  const ly = h * 0.3
  let s = `<defs>${sky('sk', 0.1, 0.55)}${glow('gl', lx, ly, w * 0.45, 0.5)}</defs>`
  s += `<rect width="${w}" height="${h}" fill="url(#sk)"/><rect width="${w}" height="${h}" fill="url(#gl)"/>`
  s += `<path d="${ridge(r, { y: h * 0.58, amp: h * 0.04, step: w / 20, w, h })}" fill="${g(0.36)}"/>`
  const base = h * 0.78
  let x = -20
  let bld = ''
  let wins = ''
  while (x < w) {
    const bw = w * (0.06 + r() * 0.1)
    const bh = h * (0.12 + r() * 0.2)
    const top = base - bh
    bld += `<rect x="${x}" y="${top}" width="${bw}" height="${bh + h}" />`
    if (r() > 0.4) bld += `<path d="M${x - 4},${top} L${x + bw / 2},${top - bh * 0.35} L${x + bw + 4},${top} Z"/>`
    for (let wy = top + bh * 0.2; wy < base - 12; wy += bh * 0.22) {
      for (let wx = x + bw * 0.15; wx < x + bw * 0.85; wx += bw * 0.25) {
        if (r() > 0.72) wins += `<rect x="${wx}" y="${wy}" width="${bw * 0.08}" height="${bh * 0.08}"/>`
      }
    }
    x += bw + w * 0.004
  }
  const cx = w * (0.35 + r() * 0.3)
  bld += `<rect x="${cx - w * 0.012}" y="${base - h * 0.48}" width="${w * 0.024}" height="${h * 0.2}"/><path d="M${cx - w * 0.02},${base - h * 0.48} L${cx},${base - h * 0.56} L${cx + w * 0.02},${base - h * 0.48} Z"/>`
  s += `<g fill="${g(0.08)}">${bld}</g><g fill="${g(0.82)}" opacity="0.9">${wins}</g>`
  s += `<rect y="${base}" width="${w}" height="${h - base}" fill="${g(0.03)}"/>`
  return s
}

function interiorScene(r, w, h) {
  const wx = w * (0.2 + r() * 0.45)
  const ww = w * 0.2
  const wy = h * 0.14
  const wh = h * 0.5
  let s = `<defs><linearGradient id="wall" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${g(0.06)}"/><stop offset="0.5" stop-color="${g(0.16)}"/><stop offset="1" stop-color="${g(0.05)}"/></linearGradient><linearGradient id="shaft" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.32"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><filter id="sb"><feGaussianBlur stdDeviation="${w * 0.006}"/></filter></defs>`
  s += `<rect width="${w}" height="${h}" fill="url(#wall)"/>`
  s += `<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="${g(0.9)}"/>`
  s += `<g fill="${g(0.1)}"><rect x="${wx + ww / 2 - 4}" y="${wy}" width="8" height="${wh}"/>`
  for (let k = 1; k < 4; k++) s += `<rect x="${wx}" y="${wy + (wh * k) / 4 - 3}" width="${ww}" height="6"/>`
  s += `</g>`
  const fy = h * 0.74
  s += `<path d="M${wx},${wy + wh} L${wx + ww},${wy + wh} L${wx + ww + w * 0.32},${h} L${wx + w * 0.12},${h} Z" fill="url(#shaft)" filter="url(#sb)"/>`
  s += `<rect y="${fy}" width="${w}" height="${h - fy}" fill="${g(0.07)}"/>`
  const tx = w * (0.45 + r() * 0.2)
  s += `<g fill="${g(0.02)}"><rect x="${tx}" y="${fy - h * 0.12}" width="${w * 0.26}" height="${h * 0.02}"/><rect x="${tx + 10}" y="${fy - h * 0.1}" width="8" height="${h * 0.14}"/><rect x="${tx + w * 0.26 - 18}" y="${fy - h * 0.1}" width="8" height="${h * 0.14}"/>`
  s += `<rect x="${tx - w * 0.06}" y="${fy - h * 0.2}" width="${w * 0.035}" height="${h * 0.24}"/></g>`
  for (let k = 0; k < 40; k++) s += `<circle cx="${wx + r() * w * 0.4}" cy="${wy + wh + r() * (h - wy - wh)}" r="${0.8 + r() * 1.5}" fill="#fff" opacity="${r() * 0.35}"/>`
  return s
}

const BUILDERS = { sea: seaScene, land: landScene, town: townScene, interior: interiorScene }

/**
 * @param {{seed: string, kind?: string, width?: number, height?: number}} opts
 * @returns {string} grayscale SVG markup
 */
export function sceneSvg({ seed, kind, width = 1600, height = 900 }) {
  const r = rng(String(seed))
  const build = BUILDERS[kind] || BUILDERS[sceneKindFor(seed)]
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice">${build(r, width, height)}</svg>`
}
