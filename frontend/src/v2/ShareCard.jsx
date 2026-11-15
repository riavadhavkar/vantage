// Share this moment. A 1080 x 1350 (4:5) PNG drawn in the browser: the logo and "vantage", and one
// line with the story and the date. Made on this device; nothing is uploaded.
import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import QRCode from 'qrcode'
import { Copy, Download, Share2, X } from 'lucide-react'
import { DURATION, EASING } from '../constants/theme.js'
import { sec, useCalmMotion } from '../lib/motionMode.js'
import { PHOTON_NUMBER, photonMessage, smsHref } from '../lib/photon.js'
import { withPngText } from '../lib/pngText.js'
import useToast from '../hooks/useToast.js'
import { drawLogo } from './logoMark.js'
import { Btn } from './ui.jsx'
import './share.css'

export const SHARE_W = 1080
export const SHARE_H = 1350
const FONT = '"Archivo Variable", "Geist Variable", system-ui, sans-serif'

const slug = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48)

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

async function drawShare({ segment, topicTitle }) {
  await document.fonts?.ready
  const canvas = Object.assign(document.createElement('canvas'), { width: SHARE_W, height: SHARE_H })
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#0A0C0F'
  ctx.fillRect(0, 0, SHARE_W, SHARE_H)

  const M = 72
  drawLogo(ctx, M, 56, 56, '#ffffff')
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'middle'
  ctx.font = `700 48px ${FONT}`
  ctx.fillText('vantage', M + 72, 56 + 29)

  const line = [topicTitle, segment.date_label].filter(Boolean).join(' • ').toLowerCase()
  ctx.textBaseline = 'alphabetic'
  ctx.font = `680 56px ${FONT}`
  const lines = wrap(ctx, line, SHARE_W - M * 2, 2)
  let y = SHARE_H - 96 - (lines.length - 1) * 66
  for (const l of lines) (ctx.fillText(l, M, y), (y += 66))
  return { canvas, line }
}

/**
 * @param {{ segment: object, topicTitle: string, linkCode: string|null, onClose: () => void }} props
 */
export default function ShareCard({ segment, topicTitle, linkCode, onClose }) {
  const isCalm = useCalmMotion()
  const toast = useToast()
  const [card, setCard] = useState(null) // { url, blob, filename }
  const [state, setState] = useState('drawing') // drawing | ready | failed
  const [qr, setQr] = useState(null)
  const closeRef = useRef(null)
  const photonText = linkCode ? photonMessage(linkCode) : null
  const sms = photonText && PHOTON_NUMBER ? smsHref(PHOTON_NUMBER, photonText) : null

  useEffect(() => {
    let isLive = true
    let objectUrl = null
    drawShare({ segment, topicTitle })
      .then(async ({ canvas, line }) => {
        const raw = await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png'))
        const blob = await withPngText(raw, { Title: `vantage: ${line}`, Software: 'vantage' })
        if (!isLive) return
        objectUrl = URL.createObjectURL(blob)
        const filename = `vantage-${slug(topicTitle)}-${slug(segment.date_label) || slug(segment.segment_id)}.png`
        setCard({ url: objectUrl, blob, filename })
        setState('ready')
      })
      .catch(() => isLive && setState('failed'))
    return () => {
      isLive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment.segment_id])

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
          </div>
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

        </div>
      </motion.div>
    </>
  )
}
