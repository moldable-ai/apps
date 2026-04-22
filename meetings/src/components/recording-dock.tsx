'use client'

import {
  AlertCircle,
  Loader2,
  Mic,
  Pause,
  Play,
  Sparkles,
  Square,
} from 'lucide-react'
import { Button, cn } from '@moldable-ai/ui'
import { formatDuration } from '@/lib/format'
import { AudioLevelIndicator } from './audio-level-indicator'

type RecordingDockStatus = {
  message: string
  tone: 'loading' | 'warning' | 'danger'
}

interface RecordingDockProps {
  isRecording: boolean
  isPaused: boolean
  isStarting?: boolean
  duration: number
  audioLevel: number
  isEnhancing?: boolean
  transcriptionStatus?: RecordingDockStatus | null
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  disabled?: boolean
  className?: string
}

export function RecordingDock({
  isRecording,
  isPaused,
  isStarting = false,
  duration,
  audioLevel,
  isEnhancing = false,
  transcriptionStatus,
  onStart,
  onPause,
  onResume,
  onStop,
  disabled,
  className,
}: RecordingDockProps) {
  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4',
        className,
      )}
      style={{ bottom: 'calc(var(--chat-safe-padding, 0px) + 1.5rem)' }}
    >
      {transcriptionStatus && (
        <div className="absolute bottom-[4.75rem] flex w-full justify-center px-3">
          <div
            className={cn(
              'bg-background/95 shadow-foreground/10 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur-xl sm:max-w-none',
              transcriptionStatus.tone === 'danger'
                ? 'border-destructive/40 text-destructive'
                : 'border-border text-muted-foreground',
            )}
          >
            {transcriptionStatus.tone === 'loading' ? (
              <Loader2 className="size-3.5 shrink-0 animate-spin" />
            ) : (
              <AlertCircle className="size-3.5 shrink-0" />
            )}
            <span className="min-w-0 leading-5 sm:whitespace-nowrap">
              {transcriptionStatus.message}
            </span>
          </div>
        </div>
      )}

      <div className="meetings-recording-dock bg-background/95 shadow-foreground/10 pointer-events-auto flex h-16 max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border px-3 shadow-xl backdrop-blur-xl">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground h-10 cursor-pointer gap-2 rounded-full px-3"
          disabled
        >
          <AudioLevelIndicator
            level={audioLevel}
            isRecording={isRecording || isStarting}
            isPaused={isPaused}
          />
          <span className="hidden font-mono text-xs tabular-nums sm:inline">
            {formatDuration(duration)}
          </span>
        </Button>

        <div className="bg-border h-7 w-px" />

        {!isRecording ? (
          <Button
            size="icon"
            onClick={onStart}
            disabled={disabled || isStarting}
            className="size-10 cursor-pointer rounded-full"
            title="Start recording"
          >
            {isStarting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Mic className="size-4" />
            )}
          </Button>
        ) : isPaused ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={onResume}
            disabled={disabled}
            className="h-10 cursor-pointer gap-2 rounded-full px-4"
          >
            <Play className="size-4" fill="currentColor" />
            <span>Resume</span>
          </Button>
        ) : (
          <Button
            variant="destructive"
            size="icon"
            onClick={onPause}
            disabled={disabled}
            className="size-10 cursor-pointer rounded-full"
            title="Pause recording"
          >
            <Pause className="size-4" fill="currentColor" />
          </Button>
        )}

        {isRecording && isPaused && (
          <>
            <div className="bg-border h-7 w-px" />
            <Button
              variant="destructive"
              size="sm"
              onClick={onStop}
              disabled={disabled}
              className="h-10 cursor-pointer gap-2 rounded-full px-4"
            >
              {isEnhancing ? (
                <Sparkles className="size-4" />
              ) : (
                <Square className="size-3.5" fill="currentColor" />
              )}
              <span className="hidden sm:inline">End meeting</span>
              <span className="sm:hidden">End</span>
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
