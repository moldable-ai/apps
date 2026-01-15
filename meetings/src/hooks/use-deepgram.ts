'use client'

import { useCallback, useRef, useState } from 'react'
import type { MeetingSettings, TranscriptSegment } from '@/types'
import {
  type ListenLiveClient,
  LiveTranscriptionEvents,
  createClient,
} from '@deepgram/sdk'
import { v4 as uuidv4 } from 'uuid'

type DeepgramState = 'disconnected' | 'connecting' | 'connected' | 'error'

export type AudioFormat = 'webm' | 'linear16'

interface UseDeepgramOptions {
  onSegment?: (segment: TranscriptSegment) => void
  onError?: (error: Error) => void
  settings: MeetingSettings
}

export function useDeepgram(options: UseDeepgramOptions) {
  const { onSegment, onError, settings } = options

  const [state, setState] = useState<DeepgramState>('disconnected')
  const connectionRef = useRef<ListenLiveClient | null>(null)
  const keepAliveRef = useRef<NodeJS.Timeout | null>(null)
  const audioChunkCountRef = useRef(0)

  /**
   * Connect to Deepgram
   * @param format - 'webm' for browser MediaRecorder (default), 'linear16' for raw PCM from system audio
   */
  const connect = useCallback(
    async (format: AudioFormat = 'webm') => {
      if (connectionRef.current) {
        console.log('[Deepgram] Already connected, skipping')
        return
      }

      setState('connecting')
      audioChunkCountRef.current = 0
      console.log('[Deepgram] Starting connection with format:', format)

      try {
        // Get temporary token from our API
        console.log('[Deepgram] Fetching token...')
        const tokenRes = await fetch('/api/deepgram/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ttl_seconds: 600 }),
        })

        if (!tokenRes.ok) {
          const text = await tokenRes.text()
          throw new Error(
            `Failed to get Deepgram token: ${tokenRes.status} ${text}`,
          )
        }

        const { access_token } = await tokenRes.json()
        console.log('[Deepgram] Token received, creating client...')

        const client = createClient(access_token)

        // Build listen options based on audio format
        // For webm/opus (browser MediaRecorder): SDK auto-detects format
        // For linear16 (system audio): explicit encoding required
        const listenOptions: Record<string, unknown> = {
          model: settings.model,
          language: settings.language,
          punctuate: true,
          smart_format: true,
          diarize: settings.enableDiarization,
          interim_results: true,
          endpointing: 250,
        }

        if (format === 'linear16') {
          // Raw PCM from system audio capture
          listenOptions.encoding = 'linear16'
          listenOptions.sample_rate = 48000
          listenOptions.channels = 1
          console.log(
            '[Deepgram] Using linear16 encoding for system audio capture',
          )
        } else {
          // webm/opus from browser - SDK handles format detection
          console.log('[Deepgram] Using auto-detect for browser audio')
        }

        console.log('[Deepgram] Listen options:', listenOptions)

        const connection = client.listen.live(listenOptions)

        connection.on(LiveTranscriptionEvents.Open, () => {
          console.log(
            '[Deepgram] ✅ Connected via SDK - ready to receive audio',
          )
          setState('connected')

          // Start keep-alive
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
            const isFinal = data.is_final || false

            // Log ALL transcript events for debugging
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

            // Extract speaker info from multiple possible locations
            let speakerId: number | undefined
            if (alt?.words?.[0]?.speaker !== undefined) {
              speakerId = alt.words[0].speaker
            }

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

            // Only emit final segments to the UI
            if (isFinal) {
              console.log('[Deepgram] ✅ Emitting final segment:', segment.text)
              onSegment?.(segment)
            }
          } catch (e) {
            console.error('[Deepgram] Failed to handle transcript:', e)
          }
        })

        connection.on(LiveTranscriptionEvents.Metadata, (data) => {
          console.log('[Deepgram] 📊 Metadata:', data)
        })

        connection.on(LiveTranscriptionEvents.Error, (error) => {
          console.error('[Deepgram] ❌ Error:', error)
          setState('error')
          onError?.(
            new Error(
              typeof error?.message === 'string'
                ? error.message
                : 'Transcription connection error',
            ),
          )
        })

        connection.on(LiveTranscriptionEvents.Close, () => {
          console.log('[Deepgram] 🔌 Disconnected')
          setState('disconnected')

          if (keepAliveRef.current) {
            clearInterval(keepAliveRef.current)
            keepAliveRef.current = null
          }
        })

        // Log any unhandled events
        connection.on(LiveTranscriptionEvents.Unhandled, (data) => {
          console.log('[Deepgram] ⚠️ Unhandled event:', data)
        })

        connectionRef.current = connection
        console.log(
          '[Deepgram] Connection setup complete, waiting for Open event...',
        )
      } catch (error) {
        console.error('[Deepgram] ❌ Connection failed:', error)
        setState('error')
        onError?.(error as Error)
      }
    },
    [settings, onSegment, onError],
  )

  const sendAudio = useCallback((data: ArrayBuffer | Blob) => {
    if (connectionRef.current) {
      audioChunkCountRef.current++
      const size = data instanceof Blob ? data.size : data.byteLength

      // Log every 10th chunk to avoid spam, but always log first few
      if (
        audioChunkCountRef.current <= 5 ||
        audioChunkCountRef.current % 10 === 0
      ) {
        console.log(
          `[Deepgram] 🎤 Sending audio chunk #${audioChunkCountRef.current}:`,
          size,
          'bytes',
        )
      }

      try {
        connectionRef.current.send(data)
      } catch (e) {
        console.warn('[Deepgram] Failed to send audio:', e)
      }
    } else {
      console.warn('[Deepgram] ⚠️ Cannot send audio - no connection')
    }
  }, [])

  const disconnect = useCallback(() => {
    console.log('[Deepgram] Disconnecting...')
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current)
      keepAliveRef.current = null
    }

    if (connectionRef.current) {
      try {
        connectionRef.current.requestClose()
      } catch {
        // ignore
      }
      connectionRef.current = null
    }

    setState('disconnected')
    console.log(
      '[Deepgram] Disconnected, sent',
      audioChunkCountRef.current,
      'audio chunks total',
    )
  }, [])

  return {
    state,
    connect,
    sendAudio,
    disconnect,
    isConnected: state === 'connected',
  }
}
