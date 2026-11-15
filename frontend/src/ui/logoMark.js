// The Vantage shutter mark (the same drawing as public/favicon.svg): a ring and six evenly spaced
// aperture blades, on a 32 x 32 grid. Each blade starts on the ring and is clipped to it, so a
// round cap can never poke out past the ring. Shared by the <Logo> component and the share-image canvas.
export const LOGO_RING = { cx: 16, cy: 16, r: 10 }
export const LOGO_BLADES = 'M15.61 5.30L20.99 15.01M25.07 10.31L19.36 19.83M25.46 21.01L14.36 20.82M16.39 26.70L11.01 16.99M6.93 21.69L12.64 12.17M6.54 10.99L17.64 11.18'

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
  // the blades are clipped to the ring; the ring is drawn on top, unclipped
  ctx.save()
  ctx.clip()
  ctx.stroke(new Path2D(LOGO_BLADES))
  ctx.restore()
  ctx.stroke()
  ctx.restore()
}
