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

type AudioSourceKind = SystemAudioDataEvent['source']
type AudioCaptureDesiredState = 'starting' | 'capturing' | 'stopping'
type AudioCaptureActualState =
  | 'spawned'
  | 'ready'
  | 'capturing'
  | 'stopping'
  | 'stopped'
  | 'restarting'
  | 'degraded'
  | 'error'

interface AudioCaptureSourceState {
  active: boolean
  lastAudioAtMs?: number | null
  frameCount: number
  peak?: number | null
  rms?: number | null
}

export interface AudioCaptureStatus {
  active: boolean
  sessionId?: string | null
  ownerAppId?: string | null
  mode?: string | null
  desiredState?: AudioCaptureDesiredState | null
  actualState?: AudioCaptureActualState | null
  startedAtMs?: number | null
  lastHeartbeatAtMs?: number | null
  restartCount: number
  restartLimit: number
  restartWindowStartedAtMs?: number | null
  lastCrashReason?: string | null
  degradedReason?: string | null
  sidecarPid?: number | null
  sidecarMemoryBytes?: number | null
  memoryLimitBytes: number
  stopRequestedAtMs?: number | null
  stopReason?: string | null
  sources?: {
    microphone: AudioCaptureSourceState
    system: AudioCaptureSourceState
  } | null
  aec?: {
    enabled: boolean
    engine: string
    sampleRate: number
    channels: number
    renderFramesAnalyzed: number
    captureFramesProcessed: number
    headsetAecBypass: boolean
    outputDeviceIsHeadphones: boolean
    outputDeviceName?: string | null
    captureProcessingBypassed: boolean
    lastError?: string | null
  } | null
}

export interface SystemAudioSourceHealth extends AudioCaptureSourceState {
  required: boolean
  stale: boolean
  lastFrameReceivedAtMs?: number | null
}

interface PendingStart {
  requiredSources: Set<AudioSourceKind>
  resolve: (started: boolean) => void
  timeout: ReturnType<typeof setTimeout>
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
    status?: AudioCaptureStatus
  }
  error?: {
    code?: string
    message?: string
  }
}

const SOURCE_STALE_MS = 5_000
const STATUS_POLL_MS = 2_000

const emptySourceHealth: Record<AudioSourceKind, SystemAudioSourceHealth> = {
  microphone: {
    active: false,
    required: false,
    stale: false,
    frameCount: 0,
    peak: null,
    rms: null,
    lastAudioAtMs: null,
    lastFrameReceivedAtMs: null,
  },
  system: {
    active: false,
    required: false,
    stale: false,
    frameCount: 0,
    peak: null,
    rms: null,
    lastAudioAtMs: null,
    lastFrameReceivedAtMs: null,
  },
}

interface SystemAudioEventMessage {
  type: 'moldable:system-audio-event'
  event: 'started' | 'stopped' | 'data' | 'error'
  payload?: string
  recoverable?: boolean
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

function getRequiredSources(captureMode: CaptureMode): AudioSourceKind[] {
  return captureMode === 'systemMicrophone'
    ? ['microphone', 'system']
    : ['system']
}

function cloneEmptySourceHealth(): Record<
  AudioSourceKind,
  SystemAudioSourceHealth
> {
  return {
    microphone: { ...emptySourceHealth.microphone },
    system: { ...emptySourceHealth.system },
  }
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
    }, 75_000)

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
  const [status, setStatus] = useState<AudioCaptureStatus | null>(null)
  const [sourceHealth, setSourceHealth] = useState<
    Record<AudioSourceKind, SystemAudioSourceHealth>
  >(() => cloneEmptySourceHealth())

  const onAudioDataRef = useRef(onAudioData)
  const onErrorRef = useRef(onError)
  const onStateChangeRef = useRef(onStateChange)
  const capturingRef = useRef(false)
  const activeCaptureModeRef = useRef<CaptureMode | null>(null)
  const sourceActivityRef = useRef<Record<AudioSourceKind, boolean>>({
    microphone: false,
    system: false,
  })
  const sourceHealthRef = useRef<
    Record<AudioSourceKind, SystemAudioSourceHealth>
  >(cloneEmptySourceHealth())
  const pendingStartResolversRef = useRef<Set<PendingStart>>(new Set())

  onAudioDataRef.current = onAudioData
  onErrorRef.current = onError
  onStateChangeRef.current = onStateChange

  const applyCapabilities = useCallback(
    (nextCapabilities: AudioCaptureCapabilities | null) => {
      setCapabilities(nextCapabilities)
      setAvailable(nextCapabilities?.canCaptureSystemAudio === true)
    },
    [],
  )

  const requestCapabilities = useCallback(async () => {
    const response = await requestSystemAudio({ action: 'availability' })
    if (!response.ok) {
      throw new Error(
        response.error?.message || 'Failed to check system audio availability.',
      )
    }

    const nextCapabilities = response.result?.capabilities ?? null
    applyCapabilities(nextCapabilities)
    return nextCapabilities
  }, [applyCapabilities])

  const requestPermission = useCallback(async () => {
    const response = await requestSystemAudio({ action: 'requestPermission' })
    if (!response.ok) {
      throw new Error(
        response.error?.message || 'Failed to request system audio permission.',
      )
    }

    const nextCapabilities = response.result?.capabilities ?? null
    applyCapabilities(nextCapabilities)
    return nextCapabilities
  }, [applyCapabilities])

  const resolvePendingStarts = useCallback((started: boolean) => {
    for (const pendingStart of pendingStartResolversRef.current) {
      clearTimeout(pendingStart.timeout)
      pendingStart.resolve(started)
    }
    pendingStartResolversRef.current.clear()
  }, [])

  const updateSourceHealth = useCallback(
    (nextStatus: AudioCaptureStatus | null, now = Date.now()) => {
      const requiredSources = new Set(
        activeCaptureModeRef.current
          ? getRequiredSources(activeCaptureModeRef.current)
          : [],
      )
      const currentHealth = sourceHealthRef.current
      const nextHealth = cloneEmptySourceHealth()

      for (const source of ['microphone', 'system'] as AudioSourceKind[]) {
        const nativeSource = nextStatus?.sources?.[source]
        const currentSource = currentHealth[source]
        const lastAudioAtMs =
          nativeSource?.lastAudioAtMs ??
          currentSource.lastAudioAtMs ??
          currentSource.lastFrameReceivedAtMs ??
          null
        const lastFrameReceivedAtMs =
          currentSource.lastFrameReceivedAtMs ?? lastAudioAtMs
        const required = requiredSources.has(source)
        const lastSeenAtMs = lastFrameReceivedAtMs ?? lastAudioAtMs

        nextHealth[source] = {
          active: nativeSource?.active ?? currentSource.active,
          required,
          stale:
            capturingRef.current &&
            required &&
            (!lastSeenAtMs || now - lastSeenAtMs > SOURCE_STALE_MS),
          lastAudioAtMs,
          lastFrameReceivedAtMs,
          frameCount: nativeSource?.frameCount ?? currentSource.frameCount,
          peak: nativeSource?.peak ?? currentSource.peak ?? null,
          rms: nativeSource?.rms ?? currentSource.rms ?? null,
        }
      }

      sourceHealthRef.current = nextHealth
      setSourceHealth(nextHealth)
    },
    [],
  )

  const resetCaptureHealth = useCallback(() => {
    activeCaptureModeRef.current = null
    sourceActivityRef.current = { microphone: false, system: false }
    sourceHealthRef.current = cloneEmptySourceHealth()
    setSourceHealth(cloneEmptySourceHealth())
  }, [])

  const requestStatus = useCallback(async () => {
    const response = await requestSystemAudio({ action: 'status' })
    if (!response.ok) {
      throw new Error(
        response.error?.message || 'Failed to check system audio status.',
      )
    }
    return response.result?.status ?? null
  }, [])

  const applyStatus = useCallback(
    (nextStatus: AudioCaptureStatus | null) => {
      setStatus(nextStatus)
      updateSourceHealth(nextStatus)

      if (!nextStatus?.active && capturingRef.current) {
        capturingRef.current = false
        setCapturing(false)
        resolvePendingStarts(false)
        onStateChangeRef.current?.(false)
      }
    },
    [resolvePendingStarts, updateSourceHealth],
  )

  useEffect(() => {
    const insideMoldable = isInMoldable()
    setRunningInMoldable(insideMoldable)

    if (!insideMoldable) {
      setAvailable(false)
      setCapabilities(null)
      return
    }

    requestCapabilities().catch((error) => {
      console.error('[SystemAudio] Failed to check availability:', error)
      setAvailable(false)
      setCapabilities(null)
    })
  }, [requestCapabilities])

  const canCaptureSystemAudio = capabilities?.canCaptureSystemAudio ?? available
  const canCaptureSystemMicrophone =
    canCaptureSystemAudio && capabilities?.canCaptureMicrophone !== false
  const canRequestSystemAudioPermission =
    capabilities?.canRequestSystemAudioPermission === true

  const isCaptureModeAvailable = useCallback(
    (
      captureMode: CaptureMode,
      nextCapabilities: AudioCaptureCapabilities | null,
    ) => {
      const canCaptureSystem = nextCapabilities?.canCaptureSystemAudio === true
      if (captureMode === 'systemAudio') return canCaptureSystem
      return (
        canCaptureSystem && nextCapabilities?.canCaptureMicrophone !== false
      )
    },
    [],
  )

  const resolveReadyPendingStarts = useCallback(() => {
    let resolvedAny = false

    for (const pendingStart of [...pendingStartResolversRef.current]) {
      const hasRequiredSources = [...pendingStart.requiredSources].every(
        (source) => sourceActivityRef.current[source],
      )

      if (!hasRequiredSources) continue

      clearTimeout(pendingStart.timeout)
      pendingStartResolversRef.current.delete(pendingStart)
      pendingStart.resolve(true)
      resolvedAny = true
    }

    if (resolvedAny && !capturingRef.current) {
      capturingRef.current = true
      setCapturing(true)
      onStateChangeRef.current?.(true)
    }
    updateSourceHealth(status)
  }, [status, updateSourceHealth])

  const waitForCaptureStarted = useCallback(
    (captureMode: CaptureMode, timeoutMs = 8_000) => {
      const requiredSources = new Set(getRequiredSources(captureMode))
      const hasRequiredSources = [...requiredSources].every(
        (source) => sourceActivityRef.current[source],
      )

      if (capturingRef.current && hasRequiredSources) {
        return Promise.resolve(true)
      }

      return new Promise<boolean>((resolve) => {
        let pendingStart: PendingStart | null = null
        const timeout = setTimeout(() => {
          if (pendingStart) {
            pendingStartResolversRef.current.delete(pendingStart)
          }
          resolve(false)
        }, timeoutMs)

        pendingStart = {
          requiredSources,
          resolve,
          timeout,
        }

        pendingStartResolversRef.current.add(pendingStart)
      })
    },
    [],
  )

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
          break
        case 'stopped':
          capturingRef.current = false
          resetCaptureHealth()
          setStatus(null)
          setCapturing(false)
          resolvePendingStarts(false)
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
            const now = Date.now()
            sourceActivityRef.current[message.source] = true
            const currentSource = sourceHealthRef.current[message.source]
            sourceHealthRef.current = {
              ...sourceHealthRef.current,
              [message.source]: {
                ...currentSource,
                active: true,
                stale: false,
                lastAudioAtMs: now,
                lastFrameReceivedAtMs: now,
                frameCount:
                  currentSource.frameCount + (message.frameCount ?? 0),
                peak: message.peak ?? currentSource.peak ?? null,
                rms: message.rms ?? currentSource.rms ?? null,
              },
            }
            resolveReadyPendingStarts()
            updateSourceHealth(status, now)
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

          if (message.recoverable) {
            console.warn('[SystemAudio] Recoverable capture error:', error)
            onErrorRef.current?.(error)
            break
          }

          capturingRef.current = false
          resetCaptureHealth()
          setStatus(null)
          setCapturing(false)
          resolvePendingStarts(false)
          onErrorRef.current?.(error)
          break
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [
    resetCaptureHealth,
    resolvePendingStarts,
    resolveReadyPendingStarts,
    runningInMoldable,
    status,
    updateSourceHealth,
  ])

  useEffect(() => {
    if (!runningInMoldable || !capturing) return

    let cancelled = false
    const pollStatus = async () => {
      try {
        const nextStatus = await requestStatus()
        if (!cancelled) applyStatus(nextStatus)
      } catch (error) {
        console.warn('[SystemAudio] Failed to poll status:', error)
      }
    }

    void pollStatus()
    const interval = window.setInterval(() => {
      void pollStatus()
    }, STATUS_POLL_MS)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [applyStatus, capturing, requestStatus, runningInMoldable])

  const start = useCallback(
    async (captureMode: CaptureMode = 'systemMicrophone') => {
      let captureModeAvailable =
        captureMode === 'systemAudio'
          ? canCaptureSystemAudio
          : canCaptureSystemMicrophone

      if (!runningInMoldable) {
        onErrorRef.current?.(new Error('System audio capture not available'))
        return false
      }

      if (!captureModeAvailable && canRequestSystemAudioPermission) {
        try {
          const nextCapabilities = await requestPermission()
          captureModeAvailable = isCaptureModeAvailable(
            captureMode,
            nextCapabilities,
          )
        } catch (error) {
          console.error('[SystemAudio] Failed to request permission:', error)
          onErrorRef.current?.(error as Error)
          return false
        }
      }

      if (!captureModeAvailable) {
        onErrorRef.current?.(new Error('System audio capture not available'))
        return false
      }

      try {
        activeCaptureModeRef.current = captureMode
        sourceActivityRef.current = { microphone: false, system: false }
        sourceHealthRef.current = cloneEmptySourceHealth()
        updateSourceHealth(null)

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

        if (response.result?.started !== true) {
          resetCaptureHealth()
          return false
        }

        const started = await waitForCaptureStarted(captureMode)
        if (!started) resetCaptureHealth()
        return started
      } catch (error) {
        console.error('[SystemAudio] Failed to start:', error)
        resetCaptureHealth()
        onErrorRef.current?.(error as Error)
        return false
      }
    },
    [
      canCaptureSystemAudio,
      canCaptureSystemMicrophone,
      canRequestSystemAudioPermission,
      isCaptureModeAvailable,
      requestPermission,
      resetCaptureHealth,
      runningInMoldable,
      updateSourceHealth,
      waitForCaptureStarted,
    ],
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

        capturingRef.current = false
        resetCaptureHealth()
        setStatus(null)
        setCapturing(false)
        return response.result?.stopped === true
      } catch (error) {
        console.error('[SystemAudio] Failed to stop:', error)
        onErrorRef.current?.(error as Error)
        return false
      }
    },
    [resetCaptureHealth, runningInMoldable],
  )

  const recover = useCallback(
    async (
      captureMode: CaptureMode = 'systemMicrophone',
      options: { afterSequence?: number; replayLimit?: number } = {},
    ) => {
      if (!runningInMoldable) return false

      try {
        const nextStatus = await requestStatus()
        if (!nextStatus?.active) {
          applyStatus(nextStatus)
          resetCaptureHealth()
          return false
        }

        activeCaptureModeRef.current = captureMode
        capturingRef.current = true
        setCapturing(true)
        applyStatus(nextStatus)
        onStateChangeRef.current?.(true)

        const replayResponse = await requestSystemAudio({
          action: 'replay',
          afterSequence: options.afterSequence ?? 0,
          limit: options.replayLimit,
        })

        if (!replayResponse.ok) {
          throw new Error(
            replayResponse.error?.message ||
              'Failed to replay system audio capture.',
          )
        }

        return true
      } catch (error) {
        console.error('[SystemAudio] Failed to recover active capture:', error)
        resetCaptureHealth()
        setStatus(null)
        setCapturing(false)
        onErrorRef.current?.(error as Error)
        return false
      }
    },
    [applyStatus, requestStatus, resetCaptureHealth, runningInMoldable],
  )

  return {
    isInMoldable: runningInMoldable,
    isAvailable: available,
    capabilities,
    status,
    sourceHealth,
    canCaptureSystemAudio,
    canCaptureSystemMicrophone,
    canRequestSystemAudioPermission,
    isCapturing: capturing,
    recover,
    start,
    stop,
  }
}
