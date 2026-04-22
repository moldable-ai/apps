'use client'

import { FileText } from 'lucide-react'
import { cn } from '@moldable-ai/ui'
import { formatRelativeTime } from '@/lib/format'
import type { Meeting } from '@/types'

interface MeetingCardProps {
  meeting: Meeting
  isSelected?: boolean
  onClick?: () => void
}

export function MeetingCard({
  meeting,
  isSelected,
  onClick,
}: MeetingCardProps) {
  const createdAtLabel = meeting.createdAt.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full cursor-pointer items-start justify-between rounded-lg p-3 text-left transition-colors',
        isSelected ? 'bg-accent/35' : 'hover:bg-accent/25',
      )}
    >
      <div className="flex min-w-0 items-start gap-3 pr-5">
        <FileText className="bg-accent text-muted-foreground size-8 flex-shrink-0 rounded-lg p-1.5 opacity-50" />
        <div className="min-w-0">
          <p className="text-foreground truncate text-sm font-medium">
            {meeting.title || 'Untitled meeting'}
          </p>
          <div className="text-muted-foreground mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
            <span>{formatRelativeTime(meeting.createdAt)}</span>
            {meeting.notes ? (
              <>
                <span>•</span>
                <span>Notes</span>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <span className="text-muted-foreground hidden flex-shrink-0 pl-2 text-xs transition-opacity group-hover:opacity-0 sm:inline">
        {createdAtLabel}
      </span>
    </button>
  )
}
