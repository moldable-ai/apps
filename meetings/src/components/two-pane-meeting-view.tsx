'use client'

import { useCallback, useState } from 'react'
import { MarkdownEditor } from '@moldable/editor'
import { cn, useWorkspace } from '@moldable/ui'
import { formatDuration, formatRelativeTime } from '@/lib/format'
import { TranscriptView } from './transcript-view'
import type { Meeting } from '@/types'

interface TwoPaneMeetingViewProps {
  meeting: Meeting
  isActive?: boolean
  onUpdateMeeting?: (meeting: Meeting) => void
}

export function TwoPaneMeetingView({
  meeting,
  isActive = false,
  onUpdateMeeting,
}: TwoPaneMeetingViewProps) {
  const { fetchWithWorkspace } = useWorkspace()
  const [notes, setNotes] = useState(meeting.notes || '')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Handle notes changes with debounced save
  const handleNotesChange = useCallback(
    async (newNotes: string) => {
      setNotes(newNotes)

      setIsSaving(true)
      const updatedMeeting = {
        ...meeting,
        notes: newNotes,
        updatedAt: new Date(),
      }
      await fetchWithWorkspace('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMeeting),
      })
      onUpdateMeeting?.(updatedMeeting)
      setLastSaved(new Date())
      setIsSaving(false)
    },
    [meeting, onUpdateMeeting, fetchWithWorkspace],
  )

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Pane - Notes Editor */}
      <div className="border-border flex h-full w-1/2 flex-col overflow-hidden border-r">
        {/* Notes Header */}
        <div className="flex h-10 shrink-0 items-center justify-between px-4">
          <h2 className="text-sm font-medium">Notes</h2>
          <div>
            {isSaving ? (
              <span className="text-muted-foreground text-xs">Saving...</span>
            ) : lastSaved ? (
              <span className="text-muted-foreground text-xs">
                Saved {formatRelativeTime(lastSaved)}
              </span>
            ) : null}
          </div>
        </div>

        {/* Notes Editor */}
        <div className="flex-1 overflow-auto px-4 py-3 pb-[var(--chat-safe-padding)]">
          <MarkdownEditor
            value={notes}
            onChange={handleNotesChange}
            placeholder="Add your meeting notes here..."
            minHeight="100%"
            maxHeight="none"
            hideMarkdownHint
          />
        </div>
      </div>

      {/* Right Pane - Transcript */}
      <div className="flex h-full w-1/2 flex-col overflow-hidden">
        {/* Transcript Header */}
        <div className="flex h-10 shrink-0 items-center px-4">
          <h2 className="text-sm font-medium">Transcript</h2>
        </div>

        {/* Transcript Content */}
        <div className="flex-1 overflow-auto pb-[var(--chat-safe-padding)]">
          <TranscriptView
            segments={meeting.segments}
            isLive={isActive}
            className="h-full"
          />
        </div>
      </div>
    </div>
  )
}

// Compact version for sidebar/selection view
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
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full cursor-pointer rounded-md px-2.5 py-1.5 text-left transition-colors',
        isSelected
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted/50 hover:bg-muted',
      )}
    >
      <div className="line-clamp-1 pr-6 text-[13px] font-medium">
        {meeting.title || 'Untitled meeting'}
      </div>
      <div
        className={cn(
          'flex items-center gap-1.5 text-[11px]',
          isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground',
        )}
      >
        <span>{formatRelativeTime(meeting.createdAt)}</span>
        <span>•</span>
        <span>{formatDuration(meeting.duration)}</span>
        {meeting.notes && (
          <>
            <span>•</span>
            <span className="text-[10px] italic">Notes</span>
          </>
        )}
      </div>
    </button>
  )
}
