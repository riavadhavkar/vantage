// The Vantage shutter mark (the same drawing as public/favicon.svg): a ring and six aperture
// blades, on a 32 x 32 grid. Shared by the <Logo> component and the share-image canvas.
export const LOGO_RING = { cx: 16, cy: 16, r: 10 }
export const LOGO_BLADES = 'M16 6l5 9M26 16l-10 1M21 25l-5-9M11 25l1-9M6 16l10-1M11 7l5 9'

/** Draws the mark on a canvas, `size` px square, top-left at (x, y). */
export function drawLogo(ctx, x, y, size, color) {
  const k = size / 32
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(k, k)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(LOGO_RING.cx, LOGO_RING.cy, LOGO_RING.r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.stroke(new Path2D(LOGO_BLADES))
  ctx.restore()
}
