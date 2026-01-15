'use client'

import { FileText, Mic, MoreVertical, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '@moldable/ui'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@moldable/ui'
import { formatDuration, formatRelativeTime } from '@/lib/format'
import { exportTranscriptMarkdown } from '@/lib/storage'
import type { Meeting } from '@/types'

interface MeetingListProps {
  meetings: Meeting[]
  activeMeetingId?: string | null
  selectedId?: string
  onSelect: (meeting: Meeting) => void
  onDelete: (meetingId: string) => void
  className?: string
}

export function MeetingList({
  meetings,
  activeMeetingId,
  selectedId,
  onSelect,
  onDelete,
  className,
}: MeetingListProps) {
  const handleExport = (meeting: Meeting) => {
    const markdown = exportTranscriptMarkdown(meeting)
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${meeting.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Sort meetings by date, most recent first
  const sortedMeetings = useMemo(() => {
    return [...meetings].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )
  }, [meetings])

  if (sortedMeetings.length === 0) {
    return (
      <div
        className={cn(
          'flex h-full flex-col items-center justify-center p-4',
          className,
        )}
      >
        <div className="text-muted-foreground text-center">
          <Mic className="mx-auto mb-2 size-8 opacity-50" />
          <p className="text-sm">No meetings yet</p>
          <p className="text-xs">Start recording to create one</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('p-2', className)}>
      {sortedMeetings.map((meeting) => {
        const isRecording = meeting.id === activeMeetingId
        return (
          <div
            key={meeting.id}
            className={cn(
              'group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors',
              selectedId === meeting.id ? 'bg-accent' : 'hover:bg-accent/50',
            )}
            onClick={() => onSelect(meeting)}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {isRecording && (
                  <span className="size-2 shrink-0 animate-pulse rounded-full bg-red-500" />
                )}
                <h3 className="truncate text-sm font-medium">
                  {meeting.title}
                </h3>
              </div>
              <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                {isRecording ? (
                  <span>Recording</span>
                ) : (
                  <span>{formatRelativeTime(meeting.createdAt)}</span>
                )}
                <span>•</span>
                <span>{formatDuration(meeting.duration)}</span>
              </div>
            </div>

            {!isRecording && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 cursor-pointer opacity-0 group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport(meeting)}>
                    <FileText className="mr-2 size-4" />
                    Export transcript
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete(meeting.id)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )
      })}
    </div>
  )
}
