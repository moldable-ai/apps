'use client'

import { Loader2, Play, Square } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, cn } from '@moldable-ai/ui'
import { formatDuration, formatTimestamp } from '@/lib/format'
import { SessionAudioPlayer } from './session-audio-player'
import type { RecordingSession, TranscriptSegment } from '@/types'

interface TranscriptViewProps {
  meetingId: string
  segments: TranscriptSegment[]
  recordingSessions?: RecordingSession[]
  currentInterim?: string | null
  currentRecordingSessionId?: string | null
  isLive?: boolean
  isPaused?: boolean
  startedAt?: Date
  duration?: number
  className?: string
  onResumeRecording?: () => void
  onPauseRecording?: () => void
}

const AUTO_SCROLL_THRESHOLD_PX = 48

type TranscriptSessionGroup = {
  id: string
  sessionNumber: number
  startedAt?: Date
  endedAt?: Date
  audioPath?: string
  segments: TranscriptSegment[]
}

function isScrolledNearBottom(element: HTMLDivElement): boolean {
  return (
    element.scrollHeight - element.clientHeight - element.scrollTop <=
    AUTO_SCROLL_THRESHOLD_PX
  )
}

function formatSessionTime(date?: Date): string {
  if (!date) return 'Session 1'
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function TranscriptView({
  meetingId,
  segments,
  recordingSessions = [],
  currentInterim,
  currentRecordingSessionId,
  isLive,
  isPaused,
  startedAt,
  duration,
  className,
  onResumeRecording,
  onPauseRecording,
}: TranscriptViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(Boolean(isLive))

  const groupedSessions = useMemo<TranscriptSessionGroup[]>(() => {
    const sortedSessions = [...recordingSessions].sort(
      (a, b) =>
        new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    )

    if (sortedSessions.length === 0) {
      if (segments.length === 0 && !currentInterim) return []
      return [
        {
          id: 'legacy-session',
          sessionNumber: 1,
          startedAt,
          segments,
        },
      ]
    }

    const segmentsBySession = new Map<string, TranscriptSegment[]>()
    for (const session of sortedSessions) {
      segmentsBySession.set(session.id, [])
    }

    for (const segment of segments) {
      const sessionId = segment.recordingSessionId ?? sortedSessions[0]?.id
      if (!sessionId) continue
      const sessionSegments = segmentsBySession.get(sessionId) ?? []
      sessionSegments.push(segment)
      segmentsBySession.set(sessionId, sessionSegments)
    }

    return sortedSessions.map((session, index) => ({
      id: session.id,
      sessionNumber: index + 1,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      audioPath: session.audioPath,
      segments: [...(segmentsBySession.get(session.id) ?? [])].sort(
        (a, b) => a.startTime - b.startTime,
      ),
    }))
  }, [currentInterim, recordingSessions, segments, startedAt])

  useEffect(() => {
    if (isLive) {
      setShouldAutoScroll(true)
    }
  }, [isLive])

  useEffect(() => {
    if (isLive && shouldAutoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [segments, currentInterim, isLive, shouldAutoScroll])

  const handleScroll = () => {
    if (!containerRef.current || !isLive) return
    const isNearBottom = isScrolledNearBottom(containerRef.current)
    setShouldAutoScroll((current) =>
      current === isNearBottom ? current : isNearBottom,
    )
  }

  const hasTranscriptContent =
    groupedSessions.length > 0 || Boolean(currentInterim)
  const hasControls = Boolean(onResumeRecording || onPauseRecording)

  const fallbackCurrentSessionId =
    currentRecordingSessionId ?? groupedSessions.at(-1)?.id ?? null

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn('relative', className)}
    >
      {hasControls ? (
        <div className="bg-background/95 sticky top-0 z-10 mb-4 flex max-w-full justify-start py-2 pr-28 backdrop-blur-sm sm:pr-36">
          <div className="border-border bg-muted/55 flex items-center gap-1.5 rounded-full border p-1">
            {isLive ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onPauseRecording}
                disabled={!onPauseRecording}
                className="text-destructive hover:text-destructive h-7 cursor-pointer rounded-full px-2.5 text-xs"
              >
                <Square className="mr-1.5 size-3" />
                Stop
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onResumeRecording}
                disabled={!onResumeRecording}
                className="h-7 cursor-pointer rounded-full px-2.5 text-xs"
              >
                <Play className="mr-1.5 size-3.5" />
                {isPaused ? 'Resume' : 'Resume recording'}
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {!hasTranscriptContent ? (
        <div className="text-muted-foreground py-8 text-center">
          <p className="text-sm">
            {isLive
              ? 'Transcription will appear here as you speak...'
              : 'No transcription available'}
          </p>
        </div>
      ) : (
        <div className="space-y-6 px-1 py-4">
          {groupedSessions.map((session) => {
            const firstSegmentStart = session.segments[0]?.startTime ?? 0
            const isCurrentSession = session.id === fallbackCurrentSessionId
            const showInterimInSession = Boolean(
              currentInterim && isCurrentSession,
            )
            const sessionDuration =
              session.startedAt && session.endedAt
                ? (new Date(session.endedAt).getTime() -
                    new Date(session.startedAt).getTime()) /
                  1000
                : isCurrentSession && session.startedAt
                  ? (Date.now() - new Date(session.startedAt).getTime()) / 1000
                  : isCurrentSession && duration !== undefined
                    ? duration
                    : undefined

            return (
              <div key={session.id} className="space-y-3">
                <div className="text-muted-foreground/75 w-fit text-xs">
                  <div className="flex items-center gap-1">
                    <span>Session {session.sessionNumber}:</span>
                    <span>{formatSessionTime(session.startedAt)}</span>
                    {sessionDuration !== undefined && sessionDuration > 0 && (
                      <span className="text-muted-foreground/70">
                        - {formatDuration(sessionDuration)}
                      </span>
                    )}
                    {session.audioPath ? (
                      <SessionAudioPlayer
                        meetingId={meetingId}
                        sessionId={session.id}
                        className="ml-1"
                      />
                    ) : null}
                    {isLive && showInterimInSession && (
                      <span className="text-muted-foreground/80 inline-flex items-center gap-1">
                        <Loader2 className="size-3 animate-spin" />
                        <span className="animate-pulse">Transcribing...</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {session.segments.map((segment) => (
                    <div key={segment.id} className="flex items-start gap-3">
                      <span className="text-muted-foreground mt-0.5 shrink-0 font-mono text-xs leading-relaxed">
                        {formatTimestamp(
                          Math.max(0, segment.startTime - firstSegmentStart),
                        )}
                      </span>
                      <div className="text-foreground flex-1 text-sm leading-relaxed">
                        {segment.text}
                      </div>
                    </div>
                  ))}

                  {showInterimInSession && (
                    <div className="flex items-start gap-3">
                      <span className="text-muted-foreground/70 mt-0.5 shrink-0 font-mono text-xs leading-relaxed">
                        --:--
                      </span>
                      <div className="text-muted-foreground flex-1 text-sm italic leading-relaxed">
                        {currentInterim}
                      </div>
                    </div>
                  )}

                  {session.segments.length === 0 && !showInterimInSession && (
                    <div className="text-muted-foreground/70 text-xs">
                      No transcript yet for this session.
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
