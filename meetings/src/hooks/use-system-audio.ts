'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Tauri types
declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>
      }
      event: {
        listen: <T>(
          event: string,
          handler: (event: { payload: T }) => void,
        ) => Promise<() => void>
      }
    }
  }
}

export interface UseSystemAudioOptions {
  onAudioData?: (data: ArrayBuffer) => void
  onError?: (error: Error) => void
  onStateChange?: (isCapturing: boolean) => void
}

export type CaptureMode = 'microphone' | 'systemAudio' | 'both'

/**
 * Hook to capture system audio via Moldable's native audio capture.
 * Only works when running inside the Moldable desktop app.
 */
export function useSystemAudio(options: UseSystemAudioOptions = {}) {
  const { onAudioData, onError, onStateChange } = options

  const [isAvailable, setIsAvailable] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isInMoldable, setIsInMoldable] = useState(false)

  const unlistenersRef = useRef<Array<() => void>>([])

  // Check if running in Moldable and if system audio is available
  useEffect(() => {
    const checkAvailability = async () => {
      const tauri = window.__TAURI__
      if (!tauri) {
        setIsInMoldable(false)
        setIsAvailable(false)
        return
      }

      setIsInMoldable(true)

      try {
        const available = await tauri.core.invoke<boolean>(
          'is_system_audio_available',
        )
        setIsAvailable(available)
        console.log('[SystemAudio] Available:', available)
      } catch (e) {
        console.error('[SystemAudio] Failed to check availability:', e)
        setIsAvailable(false)
      }
    }

    checkAvailability()
  }, [])

  // Setup event listeners
  useEffect(() => {
    const tauri = window.__TAURI__
    if (!tauri || !isInMoldable) return

    const setupListeners = async () => {
      // Listen for audio data
      const unlistenData = await tauri.event.listen<string>(
        'audio-capture-data',
        (event) => {
          try {
            // Decode base64 to ArrayBuffer (Int16 PCM data)
            const base64 = event.payload
            const binary = atob(base64)
            const bytes = new Uint8Array(binary.length)
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i)
            }
            onAudioData?.(bytes.buffer)
          } catch (e) {
            console.error('[SystemAudio] Failed to decode audio data:', e)
          }
        },
      )
      unlistenersRef.current.push(unlistenData)

      // Listen for started event
      const unlistenStarted = await tauri.event.listen(
        'audio-capture-started',
        () => {
          console.log('[SystemAudio] Capture started')
          setIsCapturing(true)
          onStateChange?.(true)
        },
      )
      unlistenersRef.current.push(unlistenStarted)

      // Listen for stopped event
      const unlistenStopped = await tauri.event.listen(
        'audio-capture-stopped',
        () => {
          console.log('[SystemAudio] Capture stopped')
          setIsCapturing(false)
          onStateChange?.(false)
        },
      )
      unlistenersRef.current.push(unlistenStopped)

      // Listen for errors
      const unlistenError = await tauri.event.listen<string>(
        'audio-capture-error',
        (event) => {
          console.error('[SystemAudio] Error:', event.payload)
          onError?.(new Error(event.payload))
        },
      )
      unlistenersRef.current.push(unlistenError)
    }

    setupListeners()

    return () => {
      unlistenersRef.current.forEach((unlisten) => unlisten())
      unlistenersRef.current = []
    }
  }, [isInMoldable, onAudioData, onError, onStateChange])

  const start = useCallback(
    async (mode: CaptureMode = 'systemAudio') => {
      const tauri = window.__TAURI__
      if (!tauri || !isAvailable) {
        onError?.(new Error('System audio capture not available'))
        return false
      }

      const modeMap: Record<CaptureMode, number> = {
        microphone: 0,
        systemAudio: 1,
        both: 2,
      }

      try {
        console.log('[SystemAudio] Starting capture, mode:', mode)
        const result = await tauri.core.invoke<boolean>('start_audio_capture', {
          mode: modeMap[mode],
          sampleRate: 48000,
          channels: 1,
        })
        return result
      } catch (e) {
        console.error('[SystemAudio] Failed to start:', e)
        onError?.(e as Error)
        return false
      }
    },
    [isAvailable, onError],
  )

  const stop = useCallback(async () => {
    const tauri = window.__TAURI__
    if (!tauri) return false

    try {
      console.log('[SystemAudio] Stopping capture')
      const result = await tauri.core.invoke<boolean>('stop_audio_capture')
      return result
    } catch (e) {
      console.error('[SystemAudio] Failed to stop:', e)
      return false
    }
  }, [])

  return {
    /** Whether running inside Moldable desktop app */
    isInMoldable,
    /** Whether system audio capture is available (macOS 14.2+) */
    isAvailable,
    /** Whether currently capturing */
    isCapturing,
    /** Start capturing audio */
    start,
    /** Stop capturing audio */
    stop,
  }
}
