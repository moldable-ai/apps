'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface AudioRecorderState {
  isRecording: boolean
  isPaused: boolean
  duration: number
  audioLevel: number
}

export interface UseAudioRecorderOptions {
  onDataAvailable?: (data: Blob) => void
  onStateChange?: (state: AudioRecorderState) => void
  onError?: (error: Error) => void
  timeslice?: number
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}) {
  const { onDataAvailable, onStateChange, onError, timeslice = 250 } = options

  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioLevel: 0,
  })

  // Track browser support - start false to match SSR, update after hydration
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    setIsSupported('mediaDevices' in navigator && 'MediaRecorder' in window)
  }, [])

  // Get the best supported MIME type for audio recording
  const getSupportedMimeType = useCallback((): string | undefined => {
    if (typeof window === 'undefined' || !('MediaRecorder' in window)) {
      return undefined
    }

    // Preferred MIME types in order of preference
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ]

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType
      }
    }

    // Return undefined to let the browser choose
    return undefined
  }, [])

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mimeTypeRef = useRef<string>('audio/webm')
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const startTimeRef = useRef<number>(0)
  const pausedDurationRef = useRef<number>(0)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const levelIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const updateState = useCallback(
    (updates: Partial<AudioRecorderState>) => {
      setState((prev) => {
        const next = { ...prev, ...updates }
        onStateChange?.(next)
        return next
      })
    },
    [onStateChange],
  )

  const startDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) return

    durationIntervalRef.current = setInterval(() => {
      const elapsed =
        (Date.now() - startTimeRef.current) / 1000 + pausedDurationRef.current
      updateState({ duration: elapsed })
    }, 100)
  }, [updateState])

  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
  }, [])

  const startLevelMonitoring = useCallback(() => {
    if (!analyserRef.current || levelIntervalRef.current) return

    const analyser = analyserRef.current
    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    levelIntervalRef.current = setInterval(() => {
      analyser.getByteFrequencyData(dataArray)
      const sum = dataArray.reduce((acc, val) => acc + val, 0)
      const average = sum / dataArray.length
      const level = Math.min(average / 128, 1) // Normalize to 0-1
      updateState({ audioLevel: level })
    }, 50)
  }, [updateState])

  const stopLevelMonitoring = useCallback(() => {
    if (levelIntervalRef.current) {
      clearInterval(levelIntervalRef.current)
      levelIntervalRef.current = null
    }
  }, [])

  const start = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
          channelCount: 1,
        },
      })

      streamRef.current = stream

      // Setup audio context for level monitoring
      const audioContext = new AudioContext({ sampleRate: 48000 })
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      analyserRef.current = analyser

      // Create MediaRecorder with best supported MIME type
      const mimeType = getSupportedMimeType()
      const recorderOptions: MediaRecorderOptions = {
        audioBitsPerSecond: 128000,
      }
      if (mimeType) {
        recorderOptions.mimeType = mimeType
      }
      console.log(
        '[AudioRecorder] Creating MediaRecorder with MIME type:',
        mimeType,
      )

      const mediaRecorder = new MediaRecorder(stream, recorderOptions)
      mimeTypeRef.current = mediaRecorder.mimeType || mimeType || 'audio/webm'
      console.log('[AudioRecorder] Actual MIME type:', mimeTypeRef.current)

      let chunkCount = 0
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunkCount++
          if (chunkCount <= 3 || chunkCount % 10 === 0) {
            console.log(
              `[AudioRecorder] 🎤 Chunk #${chunkCount}: ${event.data.size} bytes, type: ${event.data.type}`,
            )
          }
          chunksRef.current.push(event.data)
          onDataAvailable?.(event.data)
        }
      }

      mediaRecorder.onerror = (event) => {
        onError?.(new Error(`MediaRecorder error: ${event.error}`))
      }

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      // Start recording
      mediaRecorder.start(timeslice)
      startTimeRef.current = Date.now()
      pausedDurationRef.current = 0

      startDurationTimer()
      startLevelMonitoring()

      updateState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        audioLevel: 0,
      })
    } catch (error) {
      onError?.(error as Error)
    }
  }, [
    getSupportedMimeType,
    onDataAvailable,
    onError,
    timeslice,
    startDurationTimer,
    startLevelMonitoring,
    updateState,
  ])

  const pause = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause()
      pausedDurationRef.current += (Date.now() - startTimeRef.current) / 1000
      stopDurationTimer()
      stopLevelMonitoring()
      updateState({ isPaused: true, audioLevel: 0 })
    }
  }, [stopDurationTimer, stopLevelMonitoring, updateState])

  const resume = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume()
      startTimeRef.current = Date.now()
      startDurationTimer()
      startLevelMonitoring()
      updateState({ isPaused: false })
    }
  }, [startDurationTimer, startLevelMonitoring, updateState])

  const stop = useCallback((): Blob | null => {
    stopDurationTimer()
    stopLevelMonitoring()

    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop()
    }

    // Cleanup stream
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    // Cleanup audio context
    audioContextRef.current?.close()
    audioContextRef.current = null
    analyserRef.current = null

    updateState({
      isRecording: false,
      isPaused: false,
      audioLevel: 0,
    })

    // Return recorded audio
    if (chunksRef.current.length > 0) {
      const blob = new Blob(chunksRef.current, {
        type: mimeTypeRef.current,
      })
      chunksRef.current = []
      return blob
    }

    return null
  }, [stopDurationTimer, stopLevelMonitoring, updateState])

  const cleanup = useCallback(() => {
    stop()
    mediaRecorderRef.current = null
  }, [stop])

  return {
    state,
    start,
    pause,
    resume,
    stop,
    cleanup,
    isSupported,
    mimeType: mimeTypeRef.current,
  }
}
