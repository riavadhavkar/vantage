// Share this moment: a 1080 x 1350 card drawn on a canvas (no network, no libraries).
// It carries the scene, who is telling it, where the text is grounded, and whether the
// content is live. It uses the drawn scene, never the AI illustration, so it needs no AI
// image label; if that ever changes, the label must be drawn onto the card.
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Download, X } from 'lucide-react'
import { DURATION, EASING } from '../constants/theme.js'
import { ms, sec, useCalmMotion } from '../lib/motionMode.js'
import { gradedSceneUrl, sceneOptsFor } from './gradedScene.js'
import { Btn } from './ui.jsx'
import './share.css'

const W = 1080
const H = 1350
const FONT = '"Archivo Variable", "Geist Variable", system-ui, sans-serif'
const NOTE = { mock: 'Sample content, not live', demo: 'Cached demo, not live', offline: 'Offline mode, cached demo' }

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

function wrap(ctx, text, maxWidth, maxLines) {
  const lines = []
  let line = ''
  for (const word of String(text).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  if (lines.length > maxLines) {
    lines.length = maxLines
    lines[maxLines - 1] = lines[maxLines - 1].replace(/[\s,;:.]+\S*$/, '') + '…'
  }
  return lines
}

async function drawCard({ segment, look, topicTitle, line, sourcesLine, summary, dataSource }) {
  await document.fonts?.ready
  const canvas = Object.assign(document.createElement('canvas'), { width: W, height: H })
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#0A0C0F'
  ctx.fillRect(0, 0, W, H)
  try {
    const img = await loadImage(gradedSceneUrl(sceneOptsFor(segment), look))
    const scale = Math.max(W / img.width, (H * 0.62) / img.height)
    const [dw, dh] = [img.width * scale, img.height * scale]
    ctx.drawImage(img, (W - dw) / 2, 0, dw, dh)
  } catch {
    // the card still works without the drawing
  }
  const shade = ctx.createLinearGradient(0, H * 0.22, 0, H * 0.66)
  shade.addColorStop(0, 'rgba(10,12,15,0)')
  shade.addColorStop(1, 'rgba(10,12,15,1)')
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, W, H)

  const M = 72
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#F3F5F6'
  ctx.font = `680 40px ${FONT}`
  ctx.fillText('Vantage', M, 64)
  if (NOTE[dataSource]) {
    ctx.font = `500 26px ${FONT}`
    ctx.textAlign = 'right'
    ctx.fillStyle = '#C6CDD5'
    ctx.fillText(NOTE[dataSource], W - M, 72)
    ctx.textAlign = 'left'
  }

  let y = 596
  ctx.fillStyle = '#C6CDD5'
  ctx.font = `500 28px ${FONT}`
  ctx.fillText(wrap(ctx, topicTitle, W - M * 2, 1)[0] || '', M, y)
  y += 46
  ctx.fillStyle = look.accent
  ctx.font = `620 30px ${FONT}`
  ctx.fillText([look.label, segment.date_label].filter(Boolean).join('  ·  '), M, y)
  y += 52
  ctx.fillStyle = '#F3F5F6'
  ctx.font = `660 76px ${FONT}`
  for (const l of wrap(ctx, segment.title, W - M * 2, 2)) {
    ctx.fillText(l, M, y)
    y += 84
  }
  y += 20
  ctx.font = `440 38px ${FONT}`
  for (const l of wrap(ctx, line, W - M * 2, 5)) {
    ctx.fillText(l, M, y)
    y += 54
  }

  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.fillRect(M, H - 190, W - M * 2, 2)
  ctx.fillStyle = '#C6CDD5'
  ctx.font = `500 28px ${FONT}`
  ctx.fillText(wrap(ctx, sourcesLine, W - M * 2, 1)[0] || '', M, H - 164)
  ctx.fillStyle = '#F3F5F6'
  ctx.font = `560 28px ${FONT}`
  ctx.fillText(wrap(ctx, summary, W - M * 2, 1)[0] || '', M, H - 116)
  return canvas
}

/** Row 47: a number counts up to its value once. */
function CountUp({ value, isCalm }) {
  const [n, setN] = useState(isCalm ? value : 0)
  useEffect(() => {
    if (isCalm) return setN(value)
    const steps = 12
    let i = 0
    const t = setInterval(() => {
      i += 1
      setN(Math.round((value * i) / steps))
      if (i >= steps) clearInterval(t)
    }, Math.max(1, ms(DURATION.scene) / steps))
    return () => clearInterval(t)
  }, [value, isCalm])
  return <span className="mono v2-share-n">{n}</span>
}

/**
 * @param {{ segment: object, look: object, topicTitle: string, sourcesById: object, stats: {label: string, value: number}[], summary: string,
 *   dataSource: string, onClose: () => void }} props
 */
export default function ShareCard({ segment, look, topicTitle, sourcesById, stats, summary, dataSource, onClose }) {
  const isCalm = useCalmMotion()
  const [card, setCard] = useState(null) // { url, softUrl }
  const [state, setState] = useState('drawing') // drawing | ready | failed | saved
  const closeRef = useRef(null)
  const line = useMemo(() => (String(segment.narrative_text || '').match(/[^.!?]+[.!?]+["')\]]*/) || [''])[0].trim(), [segment])
  const sourcesLine = useMemo(() => {
    const names = [...new Set((segment.claims || []).map((c) => sourcesById[c.source_id]?.attribution).filter(Boolean))]
    return names.length ? `Grounded in: ${names.join(', ')}` : 'Sources are listed in the story'
  }, [segment, sourcesById])

  useEffect(() => {
    let isLive = true
    drawCard({ segment, look, topicTitle, line, sourcesLine, summary, dataSource })
      .then((canvas) => {
        if (!isLive) return
        // a small, overexposed, out-of-focus copy to develop from
        const tiny = Object.assign(document.createElement('canvas'), { width: 108, height: 135 })
        const t = tiny.getContext('2d')
        t.filter = 'blur(2px) brightness(1.5)'
        t.drawImage(canvas, 0, 0, 108, 135)
        setCard({ url: canvas.toDataURL('image/png'), softUrl: tiny.toDataURL('image/jpeg', 0.7) })
        setState('ready')
      })
      .catch(() => isLive && setState('failed'))
    return () => {
      isLive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment.segment_id])

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
    Object.assign(document.createElement('a'), { href: card.url, download: `vantage-${segment.segment_id}.png` }).click()
    setState('saved')
  }

  return (
    <>
      <motion.div className="v2-scrim" aria-hidden="true" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: sec(DURATION.quick) }} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Share this moment"
        className="v2-share"
        initial={{ opacity: 0, y: isCalm ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, transition: { duration: sec(DURATION.quick) } }}
        transition={{ duration: sec(DURATION.panel), ease: EASING.enter }}
      >
        <div className="v2-share-card" style={{ aspectRatio: `${W} / ${H}` }}>
          {card && (
            <>
              <img src={card.url} alt={`Share card: ${segment.title}, as told by ${look.label}. ${line}`} />
              {/* row 46: the card develops like a photograph */}
              {!isCalm && (
                <>
                  <motion.img src={card.softUrl} alt="" aria-hidden="true" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: sec(DURATION.slow), ease: EASING.enter }} />
                  <motion.i aria-hidden="true" className="v2-share-wash" initial={{ opacity: 0.4 }} animate={{ opacity: 0 }} transition={{ duration: sec(DURATION.slow), ease: EASING.enter }} />
                </>
              )}
            </>
          )}
        </div>
        <div className="v2-share-side">
          <div className="v2-share-head">
            <h2>Share this moment</h2>
            <button ref={closeRef} type="button" className="v2-icon" onClick={onClose} aria-label="Close">
              <X aria-hidden="true" size={18} strokeWidth={1.7} />
            </button>
          </div>
          <p className="v2-share-lede">A still of this scene, who is telling it, and where it is grounded.</p>
          <dl className="v2-share-stats">
            {stats.map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd><CountUp value={s.value} isCalm={isCalm} /></dd>
              </div>
            ))}
          </dl>
          <div className="v2-share-actions">
            <Btn variant="primary" icon={Download} onClick={save} disabled={state === 'drawing' || state === 'failed'} isLoading={state === 'drawing'}>
              {state === 'drawing' ? 'Developing' : 'Save image'}
            </Btn>
            <p role="status" className="v2-share-status">
              {state === 'saved' ? 'Saved to your downloads.' : state === 'failed' ? 'The card could not be drawn. Close this and try again.' : 'PNG, 1080 by 1350. Nothing is uploaded.'}
            </p>
          </div>
        </div>
      </motion.div>
    </>
  )
}
