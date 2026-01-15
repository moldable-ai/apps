'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@moldable/ui'
import { formatTimestamp } from '@/lib/format'
import type { TranscriptSegment } from '@/types'

interface TranscriptViewProps {
  segments: TranscriptSegment[]
  isLive?: boolean
  className?: string
}

export function TranscriptView({
  segments,
  isLive,
  className,
}: TranscriptViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)

  // Auto-scroll when new segments arrive (only if user hasn't scrolled up)
  useEffect(() => {
    if (isLive && shouldAutoScrollRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [segments, isLive])

  // Track if user has scrolled up
  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100
    shouldAutoScrollRef.current = isAtBottom
  }

  if (segments.length === 0) {
    return (
      <div
        className={cn(
          'flex h-full items-center justify-center py-12 text-center text-muted-foreground',
          className,
        )}
      >
        <p className="text-sm">
          {isLive
            ? 'Transcript will appear here as you speak...'
            : 'No transcript available'}
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn('h-full overflow-y-auto', className)}
    >
      <div className="space-y-3 p-6">
        {segments.map((segment) => (
          <div key={segment.id} className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 font-mono text-xs leading-relaxed text-muted-foreground">
              {formatTimestamp(segment.startTime)}
            </span>
            <p className="flex-1 text-sm leading-relaxed text-foreground">
              {segment.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
