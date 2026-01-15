'use client'

import { Mic, Pause, Play, Square } from 'lucide-react'
import { cn } from '@moldable-ai/ui'
import { formatDuration } from '@/lib/format'

interface RecordingControlsProps {
  isRecording: boolean
  isPaused: boolean
  duration: number
  audioLevel: number
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  disabled?: boolean
}

export function RecordingControls({
  isRecording,
  isPaused,
  duration,
  audioLevel,
  onStart,
  onPause,
  onResume,
  onStop,
  disabled,
}: RecordingControlsProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      {/* Audio Level Indicator */}
      <div className="relative flex h-32 w-32 items-center justify-center">
        {/* Pulsing rings when recording */}
        {isRecording && !isPaused && (
          <>
            <div
              className="absolute inset-0 rounded-full bg-red-500/20 transition-transform duration-100"
              style={{
                transform: `scale(${1 + audioLevel * 0.3})`,
              }}
            />
            <div
              className="absolute inset-4 rounded-full bg-red-500/30 transition-transform duration-100"
              style={{
                transform: `scale(${1 + audioLevel * 0.2})`,
              }}
            />
          </>
        )}

        {/* Main record button */}
        <button
          onClick={isRecording ? (isPaused ? onResume : onPause) : onStart}
          disabled={disabled}
          className={cn(
            'relative z-10 flex h-20 w-20 items-center justify-center rounded-full transition-all',
            isRecording
              ? isPaused
                ? 'bg-amber-500 hover:bg-amber-600'
                : 'bg-red-500 hover:bg-red-600'
              : 'bg-primary hover:bg-primary/90',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          {isRecording ? (
            isPaused ? (
              <Play className="h-8 w-8 text-white" fill="white" />
            ) : (
              <Pause className="h-8 w-8 text-white" fill="white" />
            )
          ) : (
            <Mic className="h-8 w-8 text-white" />
          )}
        </button>
      </div>

      {/* Duration Display */}
      <div className="text-center">
        <div className="font-mono text-3xl font-semibold tabular-nums">
          {formatDuration(duration)}
        </div>
        <div className="text-muted-foreground text-sm">
          {isRecording
            ? isPaused
              ? 'Paused'
              : 'Recording...'
            : 'Ready to record'}
        </div>
      </div>

      {/* Stop button - only visible when recording */}
      {isRecording && (
        <button
          onClick={onStop}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex items-center gap-2 rounded-lg px-4 py-2 transition-colors"
        >
          <Square className="h-4 w-4" fill="currentColor" />
          <span>End Meeting</span>
        </button>
      )}
    </div>
  )
}
