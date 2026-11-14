// OWNER: Person B
import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../api/client.js'
import { getNarrationAudio } from '../lib/audio.js'
import { canSpeak, speak, voiceForIndex } from '../lib/speech.js'

/**
 * Requests narration audio and the illustration in parallel. Text shows immediately;
 * audio and image arrive when ready. The voice is always segment.voice_id.
 * @param {object|null} segment
 * When server audio is unavailable, falls back to the device's speech synthesis.
 * @param {{ isSoundOn: boolean, shouldAutoplay: boolean, voiceIndex: number }} opts
 */
export default function useNarration(segment, { isSoundOn = true, shouldAutoplay = true, voiceIndex = 0 } = {}) {
  const [imageUrl, setImageUrl] = useState(null)
  const [imageUrls, setImageUrls] = useState([])
  const [imageStatus, setImageStatus] = useState('idle') // idle | loading | ready | failed
  const [audioUrl, setAudioUrl] = useState(null)
  const [audioStatus, setAudioStatus] = useState('idle') // idle | loading | ready | failed
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasFinished, setHasFinished] = useState(false)
  const currentId = useRef(null)
  const speech = useRef(null)
  const [speechState, setSpeechState] = useState('idle') // idle | speaking | paused | done
  const segmentId = segment?.segment_id ?? null

  useEffect(() => {
    if (!segment) return
    const id = segment.segment_id
    currentId.current = id
    const audio = getNarrationAudio()
    audio?.pause()
    speech.current?.cancel()
    speech.current = null
    setSpeechState('idle')
    setIsPlaying(false)
    setHasFinished(false)
    setImageUrl(null)
    setAudioUrl(null)

    if (!segment.is_grounded) {
      setImageStatus('idle')
      setAudioStatus('idle')
      return
    }

    setImageUrls([])
    if (segment.image_url) {
      setImageUrl(api.absolute(segment.image_url))
      setImageUrls([api.absolute(segment.image_url)])
      setImageStatus('ready')
    } else if (segment.scene_prompt) {
      setImageStatus('loading')
      api
        .generateImage({ segment_id: id, scene_prompt: segment.scene_prompt })
        .then((d) => {
          if (currentId.current !== id) return
          setImageUrl(d.image_url)
          setImageUrls((prev) => { const next = [...prev]; next[0] = d.image_url; return next })
          setImageStatus(d.image_url ? 'ready' : 'failed')
        })
        .catch(() => currentId.current === id && setImageStatus('failed'))
      const extras = (segment.scene_prompts || []).filter((p) => p && p !== segment.scene_prompt).slice(0, 4)
      extras.forEach((p, i) => {
        api
          .generateImage({ segment_id: `${id}_shot${i + 2}`, scene_prompt: p })
          .then((d) => {
            if (currentId.current !== id || !d.image_url) return
            setImageUrls((prev) => { const next = [...prev]; next[i + 1] = d.image_url; return next })
          })
          .catch(() => {})
      })
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

  // Device voice fallback: only when the server could not give us audio.
  const isDeviceVoice = audioStatus === 'failed' && !!segment?.is_grounded && !!segment?.narrative_text && canSpeak()

  const startSpeech = useCallback(() => {
    if (!segment) return
    speech.current?.cancel()
    setHasFinished(false)
    // A device that rejects the voice must not take the player down: captions carry on without sound.
    try {
      speech.current = speak(segment.narrative_text, {
        voice: voiceForIndex(voiceIndex),
        onStart: () => {
          setSpeechState('speaking')
          setIsPlaying(true)
        },
        onEnd: () => {
          setSpeechState('done')
          setIsPlaying(false)
          setHasFinished(true)
        },
        onError: () => {
          setSpeechState('done')
          setIsPlaying(false)
        },
      })
    } catch {
      speech.current = null
      setSpeechState('done')
      setIsPlaying(false)
    }
  }, [segment, voiceIndex])

  useEffect(() => {
    if (!isDeviceVoice || !shouldAutoplay || !isSoundOn || speechState !== 'idle') return
    startSpeech()
  }, [isDeviceVoice, shouldAutoplay, isSoundOn, speechState, startSpeech])

  // Sound off pauses the device voice; sound on resumes it.
  useEffect(() => {
    if (!speech.current) return
    if (!isSoundOn && speechState === 'speaking') {
      speech.current.pause()
      setSpeechState('paused')
      setIsPlaying(false)
    } else if (isSoundOn && speechState === 'paused') {
      speech.current.resume()
      setSpeechState('speaking')
      setIsPlaying(true)
    }
  }, [isSoundOn, speechState])

  useEffect(() => () => speech.current?.cancel(), [])

  const play = useCallback(() => {
    if (isDeviceVoice) {
      if (speechState === 'paused') {
        speech.current?.resume()
        setSpeechState('speaking')
        setIsPlaying(true)
      } else if (speechState !== 'speaking') startSpeech()
      return
    }
    const audio = getNarrationAudio()
    if (!audio || !audioUrl) return
    if (audio.ended) audio.currentTime = 0
    setHasFinished(false)
    audio.play().catch(() => {})
  }, [audioUrl, isDeviceVoice, speechState, startSpeech])

  const pause = useCallback(() => {
    if (isDeviceVoice) {
      speech.current?.pause()
      setSpeechState('paused')
      setIsPlaying(false)
      return
    }
    getNarrationAudio()?.pause()
  }, [isDeviceVoice])

  const voiceSource = audioStatus === 'ready' ? 'remote' : isDeviceVoice ? 'device' : audioStatus === 'loading' ? 'loading' : null
  return { audioUrl, imageUrl, imageUrls, imageStatus, audioStatus, voiceSource, isPlaying, play, pause, hasFinished }
}
