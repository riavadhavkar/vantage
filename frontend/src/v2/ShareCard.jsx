// Share this moment. A 1080 x 1350 (4:5) image drawn in the browser: the scene's AI illustration
// (fetched as a blob, so the canvas can be exported), the logo and "vantage", one line with the
// story and the date, and a small "i ai" mark in a corner. Nothing else is drawn on it.
// If the illustration cannot be read (no image yet, or the server does not allow it cross-origin),
// the drawn scene is used instead, and then the image carries no AI mark because nothing on it is AI.
import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import QRCode from 'qrcode'
import { Copy, Download, Info, Share2, X } from 'lucide-react'
import { DURATION, EASING } from '../constants/theme.js'
import { sec, useCalmMotion } from '../lib/motionMode.js'
import { PHOTON_NUMBER, photonMessage, smsHref } from '../lib/photon.js'
import { withPngText } from '../lib/pngText.js'
import useToast from '../hooks/useToast.js'
import { gradedSceneUrl, sceneOptsFor } from './gradedScene.js'
import { drawLogo } from './logoMark.js'
import { Btn } from './ui.jsx'
import './share.css'

export const SHARE_W = 1080
export const SHARE_H = 1350
const FONT = '"Archivo Variable", "Geist Variable", system-ui, sans-serif'
const MARK_H = Math.round(SHARE_H * 0.03) // the "i ai" mark: about 3 percent of the height

const slug = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48)

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** The illustration as a same-origin image (a blob URL), so drawing it does not taint the canvas. */
async function loadAsBlobImage(url) {
  const res = await fetch(url, { mode: 'cors', credentials: 'omit' })
  if (!res.ok) throw new Error(`image ${res.status}`)
  const objectUrl = URL.createObjectURL(await res.blob())
  try {
    return await loadImage(objectUrl)
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
  }
}

function wrap(ctx, text, maxWidth, maxLines) {
  const lines = []
  let line = ''
  for (const word of String(text).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > maxWidth && line) (lines.push(line), (line = word))
    else line = next
  }
  if (line) lines.push(line)
  if (lines.length > maxLines) {
    lines.length = maxLines
    lines[maxLines - 1] = lines[maxLines - 1].replace(/[\s,;:.]+\S*$/, '') + '…'
  }
  return lines
}

/** The small "i ai" mark, top right. Returns its box so the sheet can put a tooltip over it. */
function drawAiMark(ctx) {
  const h = MARK_H
  ctx.font = `640 ${Math.round(h * 0.72)}px ${FONT}`
  const textW = ctx.measureText('ai').width
  const w = h + 8 + textW + h * 0.9
  const x = SHARE_W - 48 - w
  const y = 48
  ctx.save()
  ctx.globalAlpha = 0.82
  ctx.fillStyle = 'rgba(10,12,15,0.72)'
  ctx.beginPath()
  ctx.roundRect(x, y, w, h + 12, (h + 12) / 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2.5
  const cx = x + h * 0.45 + 6
  const cy = y + (h + 12) / 2
  ctx.beginPath()
  ctx.arc(cx, cy, h * 0.4, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillRect(cx - 1.5, cy - h * 0.08, 3, h * 0.26)
  ctx.fillRect(cx - 1.5, cy - h * 0.22, 3, 3)
  ctx.textBaseline = 'middle'
  ctx.fillText('ai', cx + h * 0.4 + 8, cy + 1)
  ctx.restore()
  return { x, y, w, h: h + 12 }
}

async function drawShare({ segment, look, topicTitle, imageUrl }) {
  await document.fonts?.ready
  const canvas = Object.assign(document.createElement('canvas'), { width: SHARE_W, height: SHARE_H })
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#0A0C0F'
  ctx.fillRect(0, 0, SHARE_W, SHARE_H)

  let img = null
  let isAi = false
  if (imageUrl) {
    try {
      img = await loadAsBlobImage(imageUrl)
      isAi = true
    } catch {
      img = null // cross-origin or failed: fall back to the drawn scene below
    }
  }
  if (!img) img = await loadImage(gradedSceneUrl(sceneOptsFor(segment), look)).catch(() => null)
  if (img) {
    const scale = Math.max(SHARE_W / img.width, SHARE_H / img.height)
    const [dw, dh] = [img.width * scale, img.height * scale]
    ctx.drawImage(img, (SHARE_W - dw) / 2, (SHARE_H - dh) / 2, dw, dh)
  }
  // shade top and bottom so the name and the line read on any image
  const top = ctx.createLinearGradient(0, 0, 0, 260)
  top.addColorStop(0, 'rgba(10,12,15,0.7)')
  top.addColorStop(1, 'rgba(10,12,15,0)')
  ctx.fillStyle = top
  ctx.fillRect(0, 0, SHARE_W, 260)
  const bottom = ctx.createLinearGradient(0, SHARE_H - 520, 0, SHARE_H)
  bottom.addColorStop(0, 'rgba(10,12,15,0)')
  bottom.addColorStop(1, 'rgba(10,12,15,0.92)')
  ctx.fillStyle = bottom
  ctx.fillRect(0, SHARE_H - 520, SHARE_W, 520)

  const M = 72
  drawLogo(ctx, M, 56, 56, '#ffffff')
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'middle'
  ctx.font = `700 48px ${FONT}`
  ctx.fillText('vantage', M + 72, 56 + 29)
  const mark = isAi ? drawAiMark(ctx) : null

  const line = [topicTitle, segment.date_label].filter(Boolean).join(' • ').toLowerCase()
  ctx.textBaseline = 'alphabetic'
  ctx.font = `680 56px ${FONT}`
  const lines = wrap(ctx, line, SHARE_W - M * 2, 2)
  let y = SHARE_H - 96 - (lines.length - 1) * 66
  for (const l of lines) (ctx.fillText(l, M, y), (y += 66))
  return { canvas, isAi, mark, line }
}

/**
 * @param {{ segment: object, look: object, topicTitle: string, imageUrl: string|null, linkCode: string|null,
 *   dataSource: string, onClose: () => void }} props
 */
export default function ShareCard({ segment, look, topicTitle, imageUrl, linkCode, dataSource, onClose }) {
  const isCalm = useCalmMotion()
  const toast = useToast()
  const [card, setCard] = useState(null) // { url, blob, isAi, mark, filename }
  const [state, setState] = useState('drawing') // drawing | ready | failed
  const [qr, setQr] = useState(null)
  const [isTipOpen, setIsTipOpen] = useState(false)
  const closeRef = useRef(null)
  const photonText = linkCode ? photonMessage(linkCode) : null
  const sms = photonText && PHOTON_NUMBER ? smsHref(PHOTON_NUMBER, photonText) : null

  useEffect(() => {
    let isLive = true
    let objectUrl = null
    drawShare({ segment, look, topicTitle, imageUrl })
      .then(async ({ canvas, isAi, mark, line }) => {
        const raw = await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png'))
        const blob = await withPngText(raw, {
          Title: `vantage: ${line}`,
          Description: isAi ? 'ai-generated illustration (vantage). Not a photograph.' : 'drawn scene (vantage). No AI-generated image.',
          Software: 'vantage',
        })
        if (!isLive) return
        objectUrl = URL.createObjectURL(blob)
        const filename = `vantage-${slug(topicTitle)}-${slug(segment.date_label) || slug(segment.segment_id)}-${isAi ? 'ai-generated' : 'drawn-scene'}.png`
        setCard({ url: objectUrl, blob, isAi, mark, filename })
        setState('ready')
      })
      .catch(() => isLive && setState('failed'))
    return () => {
      isLive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment.segment_id, imageUrl])

  useEffect(() => {
    if (!sms) return
    let isLive = true
    QRCode.toDataURL(sms, { margin: 1, width: 360, color: { dark: '#0a0c0f', light: '#f3f5f6' } })
      .then((url) => isLive && setQr(url))
      .catch(() => isLive && setQr(null))
    return () => {
      isLive = false
    }
  }, [sms])

  useEffect(() => {
    const opener = document.activeElement
    closeRef.current?.focus({ preventScroll: true })
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      opener?.focus?.({ preventScroll: true })
    }
  }, [onClose])

  const save = () => {
    if (!card) return
    Object.assign(document.createElement('a'), { href: card.url, download: card.filename }).click()
    toast.push('image saved to your downloads')
  }
  const file = card && typeof File !== 'undefined' ? new File([card.blob], card.filename, { type: 'image/png' }) : null
  const canShareFile = !!file && !!navigator.canShare?.({ files: [file] })
  const shareFile = async () => {
    try {
      await navigator.share({ files: [file], title: 'vantage' })
    } catch {
      // the viewer closed the share sheet
    }
  }
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + window.location.pathname)
      toast.push('link copied')
    } catch {
      toast.push('could not copy the link')
    }
  }
  const tip = card?.mark
    ? { left: `${(card.mark.x / SHARE_W) * 100}%`, top: `${(card.mark.y / SHARE_H) * 100}%`, width: `${(card.mark.w / SHARE_W) * 100}%`, height: `${(card.mark.h / SHARE_H) * 100}%` }
    : null

  return (
    <>
      <motion.div className="v2-scrim" aria-hidden="true" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: sec(DURATION.quick) }} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-h"
        className="v2-share"
        initial={{ opacity: 0, y: isCalm ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, transition: { duration: sec(DURATION.quick) } }}
        transition={{ duration: sec(DURATION.panel), ease: EASING.enter }}
      >
        <figure className="v2-share-fig">
          <div className="v2-share-card" style={{ aspectRatio: `${SHARE_W} / ${SHARE_H}` }}>
            {card ? (
              <img src={card.url} alt={`share image: ${topicTitle}${segment.date_label ? `, ${segment.date_label}` : ''}`} />
            ) : (
              <p className="v2-share-wait">{state === 'failed' ? 'the image could not be drawn.' : 'developing...'}</p>
            )}
            {tip && (
              <button
                type="button"
                className="v2-share-tipzone"
                style={tip}
                aria-label="ai-generated illustration"
                aria-describedby="share-tip"
                onClick={() => setIsTipOpen((v) => !v)}
                onMouseEnter={() => setIsTipOpen(true)}
                onMouseLeave={() => setIsTipOpen(false)}
                onBlur={() => setIsTipOpen(false)}
              >
                {isTipOpen && (
                  <span id="share-tip" role="tooltip" className="v2-share-tip">
                    ai-generated illustration
                  </span>
                )}
              </button>
            )}
          </div>
          <figcaption className="v2-share-caption">
            {card?.isAi ? (
              <>
                <Info aria-hidden="true" size={13} /> ai-generated illustration
              </>
            ) : card ? (
              'drawn scene. the illustration could not be used for this image.'
            ) : null}
          </figcaption>
        </figure>

        <div className="v2-share-side">
          <div className="v2-share-head">
            <h2 id="share-h">share this moment</h2>
            <button ref={closeRef} type="button" className="v2-icon" onClick={onClose} aria-label="close">
              <X aria-hidden="true" size={18} strokeWidth={1.7} />
            </button>
          </div>

          <div className="v2-share-actions">
            <Btn variant="primary" icon={Download} onClick={save} disabled={state !== 'ready'} isLoading={state === 'drawing'}>
              {state === 'drawing' ? 'developing' : 'save image'}
            </Btn>
            <div className="v2-share-row">
              {canShareFile && (
                <Btn variant="quiet" icon={Share2} onClick={shareFile}>
                  share...
                </Btn>
              )}
              <Btn variant="quiet" icon={Copy} onClick={copyLink}>
                copy link
              </Btn>
            </div>
            <p className="v2-share-status">png, 1080 by 1350. made on this device; nothing is uploaded.</p>
          </div>

          {photonText && PHOTON_NUMBER && (
            <section className="v2-share-photon" aria-labelledby="photon-h">
              <h3 id="photon-h">text with photon</h3>
              <p className="v2-share-photon-copy">continue on your phone. what you do there shows up in this story&apos;s graph.</p>
              <div className="v2-share-photon-row">
                {qr && <img src={qr} alt="qr code: opens a text message to the number with the message prefilled" className="v2-share-qr" />}
                <p>
                  text <span className="mono v2-share-code">{photonText}</span> to{' '}
                  <a href={sms} className="v2-link">
                    {PHOTON_NUMBER}
                  </a>
                </p>
              </div>
            </section>
          )}

          <details className="v2-share-about">
            <summary>about vantage</summary>
            <p>every documentary is one cut. this is the whole story, and it shows its sources.</p>
            <p>ai images and voices are always labeled. previews use the demo sources.</p>
            {dataSource !== 'live' && <p>{dataSource === 'mock' ? 'sample content for development, not live.' : 'cached demo, not live.'}</p>}
            <p>credits: story graph by react flow (xyflow, mit). map tiles © openstreetmap contributors, map by leaflet.</p>
          </details>
        </div>
      </motion.div>
    </>
  )
}
