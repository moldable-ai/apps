'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface MicrophonePcmState {
  isCapturing: boolean
  isPaused: boolean
  audioLevel: number
}

export interface UseMicrophonePcmOptions {
  onAudioData?: (data: ArrayBuffer) => void
  onError?: (error: Error) => void
  onStateChange?: (state: MicrophonePcmState) => void
}

function floatToInt16Pcm(input: Float32Array) {
  const output = new Int16Array(input.length)

  for (let index = 0; index < input.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, input[index] ?? 0))
    output[index] = Math.round(clamped * 32767)
  }

  return output
}

export function useMicrophonePcm(options: UseMicrophonePcmOptions = {}) {
  const { onAudioData, onError, onStateChange } = options

  const [state, setState] = useState<MicrophonePcmState>({
    isCapturing: false,
    isPaused: false,
    audioLevel: 0,
  })

  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)

  const updateState = useCallback(
    (updates: Partial<MicrophonePcmState>) => {
      setState((previous) => {
        const next = { ...previous, ...updates }
        onStateChange?.(next)
        return next
      })
    },
    [onStateChange],
  )

  const cleanupNodes = useCallback(() => {
    processorRef.current?.disconnect()
    processorRef.current = null

    sourceRef.current?.disconnect()
    sourceRef.current = null

    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    const audioContext = audioContextRef.current
    audioContextRef.current = null
    void audioContext?.close()
  }, [])

  const start = useCallback(async () => {
    try {
      cleanupNodes()

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 48_000,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })

      const audioContext = new AudioContext({ sampleRate: 48_000 })
      await audioContext.resume()

      const source = audioContext.createMediaStreamSource(stream)
      const processor = audioContext.createScriptProcessor(1024, 1, 1)

      processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0)
        const pcm = floatToInt16Pcm(input)

        let sumSquares = 0
        for (let index = 0; index < input.length; index += 1) {
          const sample = input[index] ?? 0
          sumSquares += sample * sample
        }

        const rms = Math.sqrt(sumSquares / Math.max(input.length, 1))
        updateState({ audioLevel: Math.min(1, rms * 3.5) })
        onAudioData?.(pcm.buffer.slice(0))
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      streamRef.current = stream
      audioContextRef.current = audioContext
      sourceRef.current = source
      processorRef.current = processor

      updateState({
        isCapturing: true,
        isPaused: false,
        audioLevel: 0,
      })

      return true
    } catch (error) {
      const normalizedError =
        error instanceof Error
          ? error
          : new Error('Failed to start microphone PCM capture')
      onError?.(normalizedError)
      updateState({
        isCapturing: false,
        isPaused: false,
        audioLevel: 0,
      })
      return false
    }
  }, [cleanupNodes, onAudioData, onError, updateState])

  const pause = useCallback(async () => {
    cleanupNodes()
    updateState({
      isCapturing: false,
      isPaused: true,
      audioLevel: 0,
    })
    return true
  }, [cleanupNodes, updateState])

  const resume = useCallback(async () => {
    const started = await start()
    if (!started) return false

    updateState({
      isCapturing: true,
      isPaused: false,
    })
    return true
  }, [start, updateState])

  const stop = useCallback(async () => {
    cleanupNodes()
    updateState({
      isCapturing: false,
      isPaused: false,
      audioLevel: 0,
    })
    return true
  }, [cleanupNodes, updateState])

  useEffect(() => {
    return () => {
      cleanupNodes()
    }
  }, [cleanupNodes])

  return {
    state,
    start,
    pause,
    resume,
    stop,
    cleanup: stop,
    isSupported:
      typeof window !== 'undefined' &&
      'mediaDevices' in navigator &&
      'AudioContext' in window,
  }
}
