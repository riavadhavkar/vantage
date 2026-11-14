// OWNER: Person B
import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../api/client.js'
import { getNarrationAudio } from '../lib/audio.js'

/**
 * Requests narration audio and the illustration in parallel. Text shows immediately;
 * audio and image arrive when ready. The voice is always segment.voice_id.
 * @param {object|null} segment
 * @param {{ isSoundOn: boolean, shouldAutoplay: boolean }} opts
 */
export default function useNarration(segment, { isSoundOn = true, shouldAutoplay = true } = {}) {
  const [imageUrl, setImageUrl] = useState(null)
  const [imageStatus, setImageStatus] = useState('idle') // idle | loading | ready | failed
  const [audioUrl, setAudioUrl] = useState(null)
  const [audioStatus, setAudioStatus] = useState('idle') // idle | loading | ready | failed
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasFinished, setHasFinished] = useState(false)
  const currentId = useRef(null)
  const segmentId = segment?.segment_id ?? null

  useEffect(() => {
    if (!segment) return
    const id = segment.segment_id
    currentId.current = id
    const audio = getNarrationAudio()
    audio?.pause()
    setIsPlaying(false)
    setHasFinished(false)
    setImageUrl(null)
    setAudioUrl(null)

    if (!segment.is_grounded) {
      setImageStatus('idle')
      setAudioStatus('idle')
      return
    }

    if (segment.image_url) {
      setImageUrl(api.absolute(segment.image_url))
      setImageStatus('ready')
    } else if (segment.scene_prompt) {
      setImageStatus('loading')
      api
        .generateImage({ segment_id: id, scene_prompt: segment.scene_prompt })
        .then((d) => {
          if (currentId.current !== id) return
          setImageUrl(d.image_url)
          setImageStatus(d.image_url ? 'ready' : 'failed')
        })
        .catch(() => currentId.current === id && setImageStatus('failed'))
    } else {
      setImageStatus('failed')
    }

    if (segment.audio_url) {
      setAudioUrl(api.absolute(segment.audio_url))
      setAudioStatus('ready')
    } else if (segment.narrative_text) {
      setAudioStatus('loading')
      api
        .generateAudio({ segment_id: id, text: segment.narrative_text, voice_id: segment.voice_id })
        .then((d) => {
          if (currentId.current !== id) return
          setAudioUrl(d.audio_url)
          setAudioStatus(d.audio_url ? 'ready' : 'failed')
        })
        .catch(() => currentId.current === id && setAudioStatus('failed'))
    } else {
      setAudioStatus('failed')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentId])

  // Wire the shared element to this segment's audio.
  useEffect(() => {
    const audio = getNarrationAudio()
    if (!audio || !audioUrl) return
    audio.src = audioUrl
    audio.muted = !isSoundOn
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => {
      setIsPlaying(false)
      setHasFinished(true)
    }
    const onError = () => setAudioStatus('failed')
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)
    return () => {
      audio.pause()
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl])

  useEffect(() => {
    const audio = getNarrationAudio()
    if (audio) audio.muted = !isSoundOn
  }, [isSoundOn])

  useEffect(() => {
    const audio = getNarrationAudio()
    if (!audio || !audioUrl || !shouldAutoplay || hasFinished) return
    audio.play().catch(() => setIsPlaying(false))
  }, [audioUrl, shouldAutoplay, hasFinished])

  const play = useCallback(() => {
    const audio = getNarrationAudio()
    if (!audio || !audioUrl) return
    if (audio.ended) audio.currentTime = 0
    setHasFinished(false)
    audio.play().catch(() => {})
  }, [audioUrl])

  const pause = useCallback(() => getNarrationAudio()?.pause(), [])

  return { audioUrl, imageUrl, imageStatus, audioStatus, isPlaying, play, pause, hasFinished }
}
