// Lab only. Unstyled trust and state primitives. Each direction styles them its own way,
// but the wording is fixed so no direction can soften a trust label.
import { useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { sceneDataUrl, sceneKindFor } from '../../lib/scene.js'
import { SOURCE_TYPE_LABEL } from '../../constants/labels.js'

export const AI_COPY = { image: 'AI-generated illustration', voice: 'AI narration' }
export const sourceTypeLabel = (source) => SOURCE_TYPE_LABEL[source?.source_type] || 'Source'
export const SAMPLE_NOTE = 'Sample content, not live'

export function AiLabel({ kind = 'image', className = '' }) {
  return (
    <span className={`ai-label ${className}`}>
      <Sparkles aria-hidden="true" size={12} strokeWidth={2} />
      {AI_COPY[kind]}
    </span>
  )
}

export const sceneFor = (segment, w = 1600, h = 900) =>
  sceneDataUrl({ seed: `img-${segment.segment_id}`, kind: sceneKindFor(`${segment.scene_prompt || ''} ${segment.title}`), width: w, height: h })

/**
 * The prototype stands in for image generation: the illustration "arrives" after a beat,
 * and only then may it be shown (with its AI label).
 */
export function useIllustration(segment, isInstant) {
  const [readyId, setReadyId] = useState(null)
  const id = segment?.segment_id
  useEffect(() => {
    if (!id) return
    if (isInstant) return setReadyId(id)
    const t = setTimeout(() => setReadyId(id), 900)
    return () => clearTimeout(t)
  }, [id, isInstant])
  return { isReady: readyId === id, url: segment ? sceneFor(segment) : null }
}

export function useKey(handler) {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    const on = (e) => ref.current(e)
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])
}

export const isTypingTarget = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName)

export const tick = () => {
  try {
    navigator.vibrate?.(8)
  } catch {
    // haptics are optional
  }
}
