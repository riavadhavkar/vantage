// Adds tEXt chunks (keyword and text, Latin-1) to a PNG, right after the IHDR chunk, so a saved
// share image says in its own metadata that the illustration is AI-generated.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(bytes) {
  let c = 0xffffffff
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function textChunk(keyword, text) {
  const data = new TextEncoder().encode(`${keyword}\0${text.replace(/[^\x20-\x7e]/g, '')}`)
  const chunk = new Uint8Array(12 + data.length)
  const view = new DataView(chunk.buffer)
  view.setUint32(0, data.length)
  chunk.set([0x74, 0x45, 0x58, 0x74], 4) // "tEXt"
  chunk.set(data, 8)
  view.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)))
  return chunk
}

/** @param {Blob} png @param {Record<string, string>} entries @returns {Promise<Blob>} */
export async function withPngText(png, entries) {
  const bytes = new Uint8Array(await png.arrayBuffer())
  const afterIhdr = 8 + 25 // signature, then IHDR (4 length + 4 type + 13 data + 4 crc)
  const chunks = Object.entries(entries).map(([k, v]) => textChunk(k, v))
  const size = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(bytes.length + size)
  out.set(bytes.subarray(0, afterIhdr), 0)
  let at = afterIhdr
  for (const c of chunks) (out.set(c, at), (at += c.length))
  out.set(bytes.subarray(afterIhdr), at)
  return new Blob([out], { type: 'image/png' })
}
