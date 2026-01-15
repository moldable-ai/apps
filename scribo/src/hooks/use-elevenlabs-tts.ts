import { useCallback, useRef, useState } from 'react'

interface UseElevenLabsTTSOptions {
  onEnd?: () => void
  onError?: (error: Error) => void
}

/**
 * Hook for ElevenLabs text-to-speech with streaming audio playback
 */
export function useElevenLabsTTS(options: UseElevenLabsTTSOptions = {}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mediaSourceRef = useRef<MediaSource | null>(null)

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    if (
      mediaSourceRef.current &&
      mediaSourceRef.current.readyState === 'open'
    ) {
      try {
        mediaSourceRef.current.endOfStream()
      } catch {
        // Ignore errors when ending stream
      }
    }
    mediaSourceRef.current = null
    setIsPlaying(false)
    setIsLoading(false)
  }, [])

  const speak = useCallback(
    async (text: string, languageCode?: string) => {
      // Stop any currently playing audio
      stop()

      // Create Audio element immediately for user gesture association (iOS requirement)
      const audio = new Audio()
      audioRef.current = audio

      try {
        setIsLoading(true)

        // Fetch streaming audio from API
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text, languageCode }),
        })

        if (!response.ok) {
          const error = await response
            .json()
            .catch(() => ({ error: 'TTS failed' }))
          throw new Error(error.error || 'Failed to generate speech')
        }

        if (!response.body) {
          throw new Error('No response body')
        }

        // Check if MediaSource API is supported for streaming
        if (
          typeof MediaSource !== 'undefined' &&
          MediaSource.isTypeSupported('audio/mpeg')
        ) {
          // Use MediaSource for streaming playback
          const mediaSource = new MediaSource()
          mediaSourceRef.current = mediaSource
          audio.src = URL.createObjectURL(mediaSource)

          mediaSource.addEventListener('sourceopen', () => {
            const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg')
            const queue: Uint8Array[] = []
            let isAppending = false

            function processQueue() {
              if (queue.length > 0 && !sourceBuffer.updating) {
                const chunk = queue.shift()!
                sourceBuffer.appendBuffer(chunk.buffer as ArrayBuffer)
              }
            }

            const reader = response.body!.getReader()

            function push() {
              reader
                .read()
                .then(({ done, value }) => {
                  if (done) {
                    // Wait for buffer to finish before ending stream
                    const checkAndEnd = () => {
                      if (!sourceBuffer.updating && queue.length === 0) {
                        if (mediaSource.readyState === 'open') {
                          mediaSource.endOfStream()
                        }
                      } else {
                        setTimeout(checkAndEnd, 50)
                      }
                    }
                    checkAndEnd()
                    return
                  }

                  queue.push(value!)
                  if (!isAppending) {
                    isAppending = true
                    processQueue()
                  }
                  push()
                })
                .catch((error) => {
                  console.error('Stream reading error:', error)
                  options.onError?.(new Error('Failed to read audio stream'))
                })
            }

            sourceBuffer.addEventListener('updateend', () => {
              isAppending = false
              processQueue()
            })

            push()

            setIsLoading(false)
            setIsPlaying(true)
            audio.play().catch((error) => {
              console.error('Auto-play error:', error)
              options.onError?.(new Error('Failed to play audio'))
            })
          })
        } else {
          // Fallback: load entire audio as blob (for Safari/older browsers)
          const blob = await response.blob()
          audio.src = URL.createObjectURL(blob)

          setIsLoading(false)
          setIsPlaying(true)
          await audio.play()
        }

        audio.onended = () => {
          setIsPlaying(false)
          audioRef.current = null
          if (audio.src.startsWith('blob:')) {
            URL.revokeObjectURL(audio.src)
          }
          options.onEnd?.()
        }

        audio.onerror = () => {
          setIsPlaying(false)
          setIsLoading(false)
          audioRef.current = null
          if (audio.src.startsWith('blob:')) {
            URL.revokeObjectURL(audio.src)
          }
          options.onError?.(new Error('Failed to play audio'))
        }
      } catch (error) {
        setIsLoading(false)
        setIsPlaying(false)
        const err = error instanceof Error ? error : new Error('TTS failed')
        options.onError?.(err)
        console.error('TTS error:', error)
      }
    },
    [stop, options],
  )

  return {
    speak,
    stop,
    isPlaying,
    isLoading,
  }
}
