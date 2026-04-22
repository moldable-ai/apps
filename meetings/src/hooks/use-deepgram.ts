'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MeetingSettings, TranscriptSegment } from '@/types'
import {
  type DeepgramClientOptions,
  type ListenLiveClient,
  LiveTranscriptionEvents,
  SOCKET_STATES,
  createClient,
} from '@deepgram/sdk'
import { v4 as uuidv4 } from 'uuid'

type DeepgramState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'

export type DeepgramIssue = {
  code:
    | 'deepgram_permissions'
    | 'deepgram_token_unavailable'
    | 'deepgram_connection_lost'
    | 'deepgram_reconnect_exhausted'
  message: string
  retryable: boolean
}

type DeepgramTokenResponse = {
  access_token?: string
  expires_in?: number
  source?: 'auth-grant'
  error?: string
  code?: DeepgramIssue['code']
  retryable?: boolean
}

type DeepgramCloseEvent = {
  code?: unknown
  reason?: unknown
  wasClean?: unknown
  type?: unknown
}

function getCloseDiagnostics(event: unknown) {
  if (!event || typeof event !== 'object') {
    return {
      code: null as number | null,
      reason: null as string | null,
      wasClean: null as boolean | null,
      type: null as string | null,
    }
  }

  const closeEvent = event as DeepgramCloseEvent
  return {
    code:
      typeof closeEvent.code === 'number' && Number.isFinite(closeEvent.code)
        ? closeEvent.code
        : null,
    reason:
      typeof closeEvent.reason === 'string' && closeEvent.reason.trim()
        ? closeEvent.reason.trim()
        : null,
    wasClean:
      typeof closeEvent.wasClean === 'boolean' ? closeEvent.wasClean : null,
    type:
      typeof closeEvent.type === 'string' && closeEvent.type.trim()
        ? closeEvent.type.trim()
        : null,
  }
}

class DeepgramClientError extends Error {
  readonly code: DeepgramIssue['code']
  readonly retryable: boolean

  constructor(issue: DeepgramIssue) {
    super(issue.message)
    this.name = 'DeepgramClientError'
    this.code = issue.code
    this.retryable = issue.retryable
  }
}

export type AudioFormat = 'webm' | 'linear16'

interface UseDeepgramOptions {
  onSegment?: (segment: TranscriptSegment) => void
  onInterim?: (text: string | null) => void
  onError?: (error: Error) => void
  settings: MeetingSettings
  maxReconnectAttempts?: number
}

export function useDeepgram(options: UseDeepgramOptions) {
  const {
    onSegment,
    onInterim,
    onError,
    settings,
    maxReconnectAttempts = 3,
  } = options

  const [state, setState] = useState<DeepgramState>('disconnected')
  const [issue, setIssue] = useState<DeepgramIssue | null>(null)
  const connectionRef = useRef<ListenLiveClient | null>(null)
  const isSocketOpenRef = useRef(false)
  const queuedAudioRef = useRef<ArrayBuffer[]>([])
  const keepAliveRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const activeFormatRef = useRef<AudioFormat>('webm')
  const intentionalCloseRef = useRef(false)
  const audioChunkCountRef = useRef(0)
  const connectRef = useRef<
    ((format: AudioFormat, reconnecting?: boolean) => Promise<void>) | null
  >(null)

  const clearKeepAlive = useCallback(() => {
    if (!keepAliveRef.current) return
    clearInterval(keepAliveRef.current)
    keepAliveRef.current = null
  }, [])

  const clearReconnectTimer = useCallback(() => {
    if (!reconnectTimerRef.current) return
    clearTimeout(reconnectTimerRef.current)
    reconnectTimerRef.current = null
  }, [])

  const emitError = useCallback(
    (nextIssue: DeepgramIssue) => {
      setIssue(nextIssue)
      onError?.(new DeepgramClientError(nextIssue))
    },
    [onError],
  )

  const closeCurrentConnection = useCallback(() => {
    clearKeepAlive()

    if (!connectionRef.current) return

    try {
      connectionRef.current.requestClose()
    } catch {
      // ignore close errors
    }

    connectionRef.current = null
    isSocketOpenRef.current = false
  }, [clearKeepAlive])

  const scheduleReconnect = useCallback(() => {
    if (intentionalCloseRef.current || reconnectTimerRef.current) return

    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      const exhaustedIssue: DeepgramIssue = {
        code: 'deepgram_reconnect_exhausted',
        message:
          'Live transcription could not reconnect. Your meeting can continue, but the transcript may be incomplete.',
        retryable: false,
      }
      setState('error')
      emitError(exhaustedIssue)
      return
    }

    const attempt = reconnectAttemptsRef.current + 1
    const delayMs = Math.min(
      1000 * 2 ** reconnectAttemptsRef.current + Math.random() * 750,
      10000,
    )

    reconnectAttemptsRef.current = attempt
    setState('reconnecting')
    setIssue({
      code: 'deepgram_connection_lost',
      message: `Live transcription paused. Reconnecting (${attempt}/${maxReconnectAttempts})...`,
      retryable: true,
    })

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null
      void connectRef.current?.(activeFormatRef.current, true)
    }, delayMs)
  }, [emitError, maxReconnectAttempts])

  /**
   * Connect to Deepgram.
   * @param format - 'webm' for browser MediaRecorder, 'linear16' for raw PCM from system audio.
   */
  const connect = useCallback(
    async (format: AudioFormat = 'webm', reconnecting = false) => {
      if (connectionRef.current) {
        console.log('[Deepgram] Already connected, skipping')
        return
      }

      intentionalCloseRef.current = false
      activeFormatRef.current = format
      setState(reconnecting ? 'reconnecting' : 'connecting')
      if (!reconnecting) {
        reconnectAttemptsRef.current = 0
        audioChunkCountRef.current = 0
      }

      console.log('[Deepgram] Starting connection with format:', format)

      try {
        console.log('[Deepgram] Fetching token...')
        const tokenRes = await fetch('/api/deepgram/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ttl_seconds: 600 }),
        })

        if (!tokenRes.ok) {
          const data = (await tokenRes
            .json()
            .catch(() => ({}))) as DeepgramTokenResponse
          throw new DeepgramClientError({
            code: data.code ?? 'deepgram_token_unavailable',
            message:
              data.error ??
              'Transcription could not start. Please check your Deepgram setup and try again.',
            retryable:
              typeof data.retryable === 'boolean'
                ? data.retryable
                : tokenRes.status >= 500,
          })
        }

        const { access_token, source } =
          (await tokenRes.json()) as DeepgramTokenResponse
        if (!access_token) {
          throw new DeepgramClientError({
            code: 'deepgram_token_unavailable',
            message:
              'Deepgram did not return a live transcription token. Please try again in a moment.',
            retryable: true,
          })
        }

        console.log(
          '[Deepgram] Token received, creating auth-grant client...',
          { source: source ?? 'unknown' },
        )
        const client = createClient({
          accessToken: access_token,
        } as unknown as DeepgramClientOptions)

        const listenOptions: Record<string, unknown> = {
          model: settings.model,
          language: settings.language,
          punctuate: true,
          smart_format: true,
          diarize: settings.enableDiarization,
          interim_results: true,
          endpointing: 250,
          mip_opt_out: settings.mipOptOut !== false,
        }

        if (format === 'linear16') {
          listenOptions.encoding = 'linear16'
          listenOptions.sample_rate = 48000
          listenOptions.channels = 1
          console.log(
            '[Deepgram] Using linear16 encoding for system audio capture',
          )
        } else {
          console.log('[Deepgram] Using auto-detect for browser audio')
        }

        console.log('[Deepgram] Listen options:', listenOptions)

        const connection = client.listen.live(listenOptions)
        connectionRef.current = connection

        connection.on(LiveTranscriptionEvents.Open, () => {
          console.log(
            '[Deepgram] ✅ Connected via SDK - ready to receive audio',
          )
          clearReconnectTimer()
          reconnectAttemptsRef.current = 0
          isSocketOpenRef.current = true
          setIssue(null)
          setState('connected')

          if (queuedAudioRef.current.length > 0) {
            console.log(
              '[Deepgram] Flushing queued audio chunks:',
              queuedAudioRef.current.length,
            )
            for (const chunk of queuedAudioRef.current) {
              connection.send(chunk)
            }
            queuedAudioRef.current = []
          }

          clearKeepAlive()
          keepAliveRef.current = setInterval(() => {
            try {
              connection.keepAlive()
            } catch {
              // ignore keepalive errors
            }
          }, 5000)
        })

        connection.on(LiveTranscriptionEvents.Transcript, (data) => {
          try {
            const alt = data.channel?.alternatives?.[0]
            const transcript = alt?.transcript || ''
            const speechFinal = (data as { speech_final?: boolean })
              .speech_final
            const isFinal = data.is_final || speechFinal || false

            console.log(
              `[Deepgram] 📝 Transcript (${isFinal ? 'FINAL' : 'interim'}):`,
              transcript || '(empty)',
              {
                confidence: alt?.confidence,
                start: data.start,
                duration: data.duration,
              },
            )

            if (!transcript) return

            if (!isFinal) {
              onInterim?.(transcript)
              return
            }

            const speakerId =
              alt?.words?.[0]?.speaker !== undefined
                ? alt.words[0].speaker
                : undefined

            const segment: TranscriptSegment = {
              id: uuidv4(),
              text: transcript,
              startTime: data.start || 0,
              endTime: (data.start || 0) + (data.duration || 0),
              confidence: alt?.confidence || 0,
              speaker:
                speakerId !== undefined
                  ? `Speaker ${speakerId + 1}`
                  : undefined,
              speakerId,
              isFinal,
              createdAt: new Date(),
            }

            console.log('[Deepgram] ✅ Emitting final segment:', segment.text)
            onInterim?.(null)
            onSegment?.(segment)
          } catch (error) {
            console.error('[Deepgram] Failed to handle transcript:', error)
          }
        })

        connection.on(LiveTranscriptionEvents.Metadata, (data) => {
          console.log('[Deepgram] 📊 Metadata:', data)
        })

        connection.on(LiveTranscriptionEvents.Error, (error) => {
          const detail =
            typeof error?.message === 'string'
              ? error.message
              : 'Transcription connection error'
          console.error('[Deepgram] ❌ Error:', {
            detail,
            statusCode:
              typeof error?.statusCode === 'number' ? error.statusCode : null,
            requestId:
              typeof error?.requestId === 'string' ? error.requestId : null,
            readyState:
              typeof error?.readyState === 'number' ? error.readyState : null,
          })
          isSocketOpenRef.current = false
          connectionRef.current = null
          clearKeepAlive()
          emitError({
            code: 'deepgram_connection_lost',
            message: `Live transcription connection was interrupted. ${detail}`,
            retryable: true,
          })
          scheduleReconnect()
        })

        connection.on(LiveTranscriptionEvents.Close, (event?: unknown) => {
          const closeDiagnostics = getCloseDiagnostics(event)
          console.log('[Deepgram] 🔌 Disconnected', closeDiagnostics)
          isSocketOpenRef.current = false
          connectionRef.current = null
          clearKeepAlive()

          if (intentionalCloseRef.current) {
            setState('disconnected')
            return
          }

          emitError({
            code: 'deepgram_connection_lost',
            message: closeDiagnostics.reason
              ? `Live transcription connection closed: ${closeDiagnostics.reason}`
              : 'Live transcription connection was interrupted. Reconnecting...',
            retryable: true,
          })
          scheduleReconnect()
        })

        connection.on(LiveTranscriptionEvents.Unhandled, (data) => {
          console.log('[Deepgram] ⚠️ Unhandled event:', data)
        })

        console.log(
          '[Deepgram] Connection setup complete, waiting for Open event...',
        )
      } catch (error) {
        console.error('[Deepgram] ❌ Connection failed:', error)
        closeCurrentConnection()

        const nextIssue =
          error instanceof DeepgramClientError
            ? {
                code: error.code,
                message: error.message,
                retryable: error.retryable,
              }
            : {
                code: 'deepgram_token_unavailable' as const,
                message:
                  'Transcription could not connect. Please try again in a moment.',
                retryable: true,
              }

        emitError(nextIssue)

        if (nextIssue.retryable) {
          scheduleReconnect()
        } else {
          setState('error')
        }
      }
    },
    [
      clearKeepAlive,
      clearReconnectTimer,
      closeCurrentConnection,
      emitError,
      onInterim,
      onSegment,
      scheduleReconnect,
      settings,
    ],
  )

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  const sendAudio = useCallback(
    (data: ArrayBuffer | Blob) => {
      if (intentionalCloseRef.current) {
        return
      }

      audioChunkCountRef.current++
      const size = data instanceof Blob ? data.size : data.byteLength

      if (
        audioChunkCountRef.current <= 5 ||
        audioChunkCountRef.current % 10 === 0
      ) {
        console.log(
          `[Deepgram] 🎤 Audio chunk #${audioChunkCountRef.current}:`,
          size,
          'bytes',
        )
      }

      try {
        if (!connectionRef.current || !isSocketOpenRef.current) {
          if (data instanceof ArrayBuffer) {
            queuedAudioRef.current.push(data)
          }

          if (queuedAudioRef.current.length > 120) {
            queuedAudioRef.current = queuedAudioRef.current.slice(-120)
          }
          return
        }

        const readyState = connectionRef.current.getReadyState?.()
        if (
          readyState === SOCKET_STATES.closing ||
          readyState === SOCKET_STATES.closed
        ) {
          console.warn('[Deepgram] Socket is closed while sending audio', {
            readyState,
          })
          connectionRef.current = null
          isSocketOpenRef.current = false
          scheduleReconnect()
          return
        }

        connectionRef.current.send(data)
      } catch (error) {
        console.warn('[Deepgram] Failed to send audio:', error)
        scheduleReconnect()
      }
    },
    [scheduleReconnect],
  )

  const disconnect = useCallback(() => {
    console.log('[Deepgram] Disconnecting...')
    intentionalCloseRef.current = true
    clearReconnectTimer()
    clearKeepAlive()
    closeCurrentConnection()

    isSocketOpenRef.current = false
    queuedAudioRef.current = []
    reconnectAttemptsRef.current = 0
    setIssue(null)
    onInterim?.(null)
    setState('disconnected')
    console.log(
      '[Deepgram] Disconnected, sent',
      audioChunkCountRef.current,
      'audio chunks total',
    )
  }, [clearKeepAlive, clearReconnectTimer, closeCurrentConnection, onInterim])

  return {
    state,
    issue,
    connect,
    sendAudio,
    disconnect,
    isConnected: state === 'connected',
    isReconnecting: state === 'reconnecting',
  }
}
