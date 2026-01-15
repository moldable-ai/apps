'use client'

import { memo, useEffect, useState } from 'react'
import { cn } from '@moldable/ui'

interface AudioLevelIndicatorProps {
  level: number
  isRecording?: boolean
  isPaused?: boolean
  className?: string
}

export const AudioLevelIndicator = memo(function AudioLevelIndicator({
  level,
  isRecording = false,
  isPaused = false,
  className,
}: AudioLevelIndicatorProps) {
  // Smooth the audio level for nicer animation
  const [smoothLevel, setSmoothLevel] = useState(0)

  useEffect(() => {
    // Quickly respond to increases, slowly decay
    setSmoothLevel((prev) => {
      if (level > prev) {
        return level // Jump up immediately
      }
      return prev * 0.85 + level * 0.15 // Slow decay
    })
  }, [level])

  // Calculate dynamic bar heights based on smoothed audio level
  // Each bar responds slightly differently for a more organic feel
  const amplifiedLevel = Math.min(100, smoothLevel * 150)

  // When actively recording, bars animate based on audio level
  // When paused or stopped, show static bars
  const isActive = isRecording && !isPaused

  const leftBarHeight = isActive ? Math.max(20, 30 + amplifiedLevel * 0.4) : 40
  const middleBarHeight = isActive
    ? Math.max(40, 50 + amplifiedLevel * 0.5)
    : 100
  const rightBarHeight = isActive
    ? Math.max(25, 35 + amplifiedLevel * 0.35)
    : 60

  // Determine bar color based on state
  const getBarStyles = () => {
    if (isRecording && !isPaused) {
      return 'bg-green-500'
    } else if (isPaused) {
      return 'bg-foreground'
    } else {
      return 'bg-foreground/50'
    }
  }

  const barStyles = getBarStyles()

  return (
    <div className={cn('flex h-5 items-center gap-[3px]', className)}>
      <div
        className={cn(
          'w-[3px] rounded-full transition-all',
          isActive ? 'duration-75' : 'duration-200',
          barStyles,
        )}
        style={{ height: `${leftBarHeight}%` }}
      />
      <div
        className={cn(
          'w-[3px] rounded-full transition-all',
          isActive ? 'duration-75' : 'duration-200',
          barStyles,
        )}
        style={{ height: `${middleBarHeight}%` }}
      />
      <div
        className={cn(
          'w-[3px] rounded-full transition-all',
          isActive ? 'duration-75' : 'duration-200',
          barStyles,
        )}
        style={{ height: `${rightBarHeight}%` }}
      />
    </div>
  )
})
