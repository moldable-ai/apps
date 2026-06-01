'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { isInMoldable, sendToMoldable } from '@moldable-ai/ui'

export interface UseSystemAudioOptions {
  onAudioData?: (event: SystemAudioDataEvent) => void
  onError?: (error: Error) => void
  onStateChange?: (isCapturing: boolean) => void
}

export type CaptureMode = 'systemAudio' | 'systemMicrophone'

interface AudioCaptureArchitecture {
  microphonePath?: string
  systemPath?: string
  sourceSeparation?: string
  userFacingMixedStream?: boolean
  mixedStreamAecRequired?: boolean
  nativeAecLayer?: string
  echoCancellationPolicy?: string
  mixedStreamPolicy?: string
}

export interface AudioCaptureCapabilities {
  osVersion?: string
  osSupported?: boolean
  microphonePermission?: string
  canCaptureMicrophone?: boolean
  screenCapturePermission?: string
  systemAudioPermission?: string
  systemAudioPermissionPreflight?: string
  systemAudioPermissionRequest?: string
  systemAudioPermissionGuidance?: string
  screenCaptureKitAvailable?: boolean
  coreAudioProcessTapAvailable?: boolean
  defaultInputDeviceAvailable?: boolean
  defaultInputDevice?: string
  defaultOutputDeviceAvailable?: boolean
  defaultOutputDevice?: string
  canRequestSystemAudioPermission?: boolean
  systemAudioPermissionRequired?: boolean
  canCaptureSystemAudio?: boolean
  architecture?: AudioCaptureArchitecture
  degradedReason?: string
}

export interface SystemAudioDataEvent {
  data: ArrayBuffer
  source: 'microphone' | 'system'
  sequence: number
  sessionId?: string
  sampleRate?: number
  channels?: number
  frameCount?: number
  peak?: number
  rms?: number
}

interface SystemAudioRequestMessage {
  type: 'moldable:system-audio-request'
  requestId: string
  action:
    | 'availability'
    | 'start'
    | 'stop'
    | 'requestPermission'
    | 'status'
    | 'replay'
  captureMode?: CaptureMode
  sampleRate?: number
  channels?: number
  reason?: string
  afterSequence?: number
  limit?: number
}

interface SystemAudioResponseMessage {
  type: 'moldable:system-audio-response'
  requestId: string
  ok: boolean
  result?: {
    available?: boolean
    started?: boolean
    stopped?: boolean
    replayed?: number
    sessionId?: string
    capabilities?: AudioCaptureCapabilities
    requested?: boolean
    status?: unknown
  }
  error?: {
    code?: string
    message?: string
  }
}

interface SystemAudioEventMessage {
  type: 'moldable:system-audio-event'
  event: 'started' | 'stopped' | 'data' | 'error'
  payload?: string
  data?: ArrayBuffer
  source?: 'microphone' | 'system'
  sequence?: number
  sessionId?: string
  sampleRate?: number
  channels?: number
  frameCount?: number
  peak?: number
  rms?: number
}

function makeRequestId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `system-audio-${crypto.randomUUID()}`
  }

  return `system-audio-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function requestSystemAudio(
  message: Omit<SystemAudioRequestMessage, 'type' | 'requestId'>,
) {
  return new Promise<SystemAudioResponseMessage>((resolve, reject) => {
    if (!isInMoldable()) {
      reject(new Error('System audio is only available inside Moldable.'))
      return
    }

    const requestId = makeRequestId()
    console.log('[SystemAudio] Sending request', { requestId, ...message })
    const timeout = window.setTimeout(() => {
      window.removeEventListener('message', handleResponse)
      reject(new Error('System audio request timed out.'))
    }, 30_000)

    function handleResponse(event: MessageEvent) {
      if (event.data?.type !== 'moldable:system-audio-response') return
      if (event.data?.requestId !== requestId) return

      window.clearTimeout(timeout)
      window.removeEventListener('message', handleResponse)
      console.log('[SystemAudio] Received response', event.data)
      resolve(event.data as SystemAudioResponseMessage)
    }

    window.addEventListener('message', handleResponse)
    sendToMoldable({
      type: 'moldable:system-audio-request',
      requestId,
      ...message,
    } satisfies SystemAudioRequestMessage)
  })
}

/**
 * Hook to capture native system audio through the Moldable desktop bridge.
 */
export function useSystemAudio(options: UseSystemAudioOptions = {}) {
  const { onAudioData, onError, onStateChange } = options

  const [available, setAvailable] = useState(false)
  const [capabilities, setCapabilities] =
    useState<AudioCaptureCapabilities | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [runningInMoldable, setRunningInMoldable] = useState(false)

  const onAudioDataRef = useRef(onAudioData)
  const onErrorRef = useRef(onError)
  const onStateChangeRef = useRef(onStateChange)

  onAudioDataRef.current = onAudioData
  onErrorRef.current = onError
  onStateChangeRef.current = onStateChange

  useEffect(() => {
    const insideMoldable = isInMoldable()
    setRunningInMoldable(insideMoldable)

    if (!insideMoldable) {
      setAvailable(false)
      setCapabilities(null)
      return
    }

    requestSystemAudio({ action: 'availability' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            response.error?.message ||
              'Failed to check system audio availability.',
          )
        }

        const nextCapabilities = response.result?.capabilities ?? null
        setCapabilities(nextCapabilities)
        setAvailable(response.result?.available === true)
      })
      .catch((error) => {
        console.error('[SystemAudio] Failed to check availability:', error)
        setAvailable(false)
        setCapabilities(null)
      })
  }, [])

  const canCaptureSystemAudio = capabilities?.canCaptureSystemAudio ?? available
  const canCaptureSystemMicrophone =
    canCaptureSystemAudio && capabilities?.canCaptureMicrophone !== false

  useEffect(() => {
    if (!runningInMoldable) return

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'moldable:system-audio-event') return

      const message = event.data as SystemAudioEventMessage
      if (message.event !== 'data') {
        console.log('[SystemAudio] Received event', message)
      }

      switch (message.event) {
        case 'started':
          setCapturing(true)
          onStateChangeRef.current?.(true)
          break
        case 'stopped':
          setCapturing(false)
          if (message.payload) {
            console.warn(
              '[SystemAudio] Capture stopped reason:',
              message.payload,
            )
          }
          onStateChangeRef.current?.(false)
          break
        case 'data':
          if (
            message.data &&
            message.source &&
            message.sequence !== undefined
          ) {
            onAudioDataRef.current?.({
              data: message.data,
              source: message.source,
              sequence: message.sequence,
              sessionId: message.sessionId,
              sampleRate: message.sampleRate,
              channels: message.channels,
              frameCount: message.frameCount,
              peak: message.peak,
              rms: message.rms,
            })
          }
          break
        case 'error': {
          const error = new Error(
            message.payload || 'System audio capture failed.',
          )
          onErrorRef.current?.(error)
          break
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [runningInMoldable])

  const start = useCallback(
    async (captureMode: CaptureMode = 'systemMicrophone') => {
      const captureModeAvailable =
        captureMode === 'systemAudio'
          ? canCaptureSystemAudio
          : canCaptureSystemMicrophone

      if (!runningInMoldable || !captureModeAvailable) {
        onErrorRef.current?.(new Error('System audio capture not available'))
        return false
      }

      try {
        const response = await requestSystemAudio({
          action: 'start',
          captureMode,
          sampleRate: 48_000,
          channels: 1,
        })

        if (!response.ok) {
          throw new Error(
            response.error?.message || 'Failed to start system audio capture.',
          )
        }

        return response.result?.started === true
      } catch (error) {
        console.error('[SystemAudio] Failed to start:', error)
        onErrorRef.current?.(error as Error)
        return false
      }
    },
    [canCaptureSystemAudio, canCaptureSystemMicrophone, runningInMoldable],
  )

  const stop = useCallback(
    async (reason?: string) => {
      if (!runningInMoldable) return false

      try {
        const response = await requestSystemAudio({ action: 'stop', reason })

        if (!response.ok) {
          throw new Error(
            response.error?.message || 'Failed to stop system audio capture.',
          )
        }

        return response.result?.stopped === true
      } catch (error) {
        console.error('[SystemAudio] Failed to stop:', error)
        onErrorRef.current?.(error as Error)
        return false
      }
    },
    [runningInMoldable],
  )

  return {
    isInMoldable: runningInMoldable,
    isAvailable: available,
    capabilities,
    canCaptureSystemAudio,
    canCaptureSystemMicrophone,
    isCapturing: capturing,
    start,
    stop,
  }
}
