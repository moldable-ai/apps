'use client'

import { Pause, Play } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, cn, useWorkspace } from '@moldable-ai/ui'

interface SessionAudioPlayerProps {
  meetingId: string
  sessionId: string
  className?: string
}

export function SessionAudioPlayer({
  meetingId,
  sessionId,
  className,
}: SessionAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const { workspaceId } = useWorkspace()
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasError, setHasError] = useState(false)

  const audioSrc = useMemo(() => {
    const params = new URLSearchParams({ workspace: workspaceId })
    return `/api/meetings/${encodeURIComponent(meetingId)}/audio/${encodeURIComponent(sessionId)}?${params.toString()}`
  }, [meetingId, sessionId, workspaceId])

  useEffect(() => {
    setIsPlaying(false)
    setHasError(false)
  }, [audioSrc])

  const handleToggle = async () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      return
    }

    try {
      setHasError(false)
      await audio.play()
    } catch {
      setHasError(true)
    }
  }

  if (hasError) return null

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title={isPlaying ? 'Pause session audio' : 'Play session audio'}
        aria-label={isPlaying ? 'Pause session audio' : 'Play session audio'}
        onClick={handleToggle}
        className={cn(
          'border-border/80 bg-muted/45 text-muted-foreground/75 hover:bg-muted hover:text-foreground size-6 cursor-pointer rounded-full border',
          className,
        )}
      >
        {isPlaying ? (
          <Pause className="size-3" />
        ) : (
          <Play className="ml-0.5 size-3" />
        )}
      </Button>
      <audio
        ref={audioRef}
        src={audioSrc}
        preload="none"
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onError={() => setHasError(true)}
      />
    </>
  )
}
