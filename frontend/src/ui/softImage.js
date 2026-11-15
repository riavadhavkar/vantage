// The out-of-focus copy of a frame. Blurring a full-screen image with CSS means rasterizing a
// large blur every time a scene mounts, which is what dropped frames in the perspective switch.
// Instead the image is drawn once into a 256 px wide canvas with a small blur and kept as a tiny
// bitmap; stretched to full size by the GPU it reads as a deep blur, and costs almost nothing.
const ready = new Map() // url -> tiny data URL, or null when it cannot be made (cross-origin image)
const pending = new Map()

export const softUrl = (url) => ready.get(url)

/** @returns {Promise<string|null>} resolves when the tiny copy exists (or cannot be made) */
export function prepareSoft(url) {
  if (!url) return Promise.resolve(null)
  if (ready.has(url)) return Promise.resolve(ready.get(url))
  if (pending.has(url)) return pending.get(url)
  const job = new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      let out = null
      try {
        const w = 256
        const h = Math.max(1, Math.round((w * (img.naturalHeight || 9)) / (img.naturalWidth || 16)))
        const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h })
        const ctx = canvas.getContext('2d')
        ctx.filter = 'blur(3px)'
        ctx.drawImage(img, -10, -6, w + 20, h + 12) // overdraw so the blur has no transparent edge
        out = canvas.toDataURL('image/jpeg', 0.72)
      } catch {
        out = null // a cross-origin illustration taints the canvas; the caller falls back to CSS blur
      }
      ready.set(url, out)
      pending.delete(url)
      resolve(out)
    }
    img.onerror = () => {
      ready.set(url, null)
      pending.delete(url)
      resolve(null)
    }
    img.src = url
  })
  pending.set(url, job)
  return job
}
