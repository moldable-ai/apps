'use client'

import { useQuery } from '@tanstack/react-query'
import { useWorkspace } from '@moldable/ui'
import { formatDuration, formatRelativeTime } from '@/lib/format'
import type { Meeting } from '@/types'

const GHOST_EXAMPLES = [
  { title: 'Weekly standup', time: 'Today', duration: '15:32' },
  { title: 'Product review', time: 'Yesterday', duration: '42:18' },
  { title: '1:1 with Sarah', time: '2d ago', duration: '28:45' },
]

export default function MeetingsWidget() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  const { data: meetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ['meetings', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/meetings')
      if (!res.ok) return []
      const data = (await res.json()) as Meeting[]
      return data
        .map((m) => ({
          ...m,
          createdAt: new Date(m.createdAt),
          updatedAt: new Date(m.updatedAt),
          endedAt: m.endedAt ? new Date(m.endedAt) : undefined,
          segments: m.segments.map((s) => ({
            ...s,
            createdAt: new Date(s.createdAt),
          })),
        }))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5)
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="border-primary size-6 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    )
  }

  // Empty state with ghost examples
  if (meetings.length === 0) {
    return (
      <div className="bg-background flex h-full flex-col overflow-hidden p-2">
        <div className="flex-1 space-y-1 overflow-hidden">
          {GHOST_EXAMPLES.map((example, idx) => (
            <div
              key={idx}
              className="border-border/40 bg-muted/20 rounded-md border px-2.5 py-1.5 opacity-50"
            >
              <div className="text-foreground line-clamp-1 text-[13px] font-medium">
                {example.title}
              </div>
              <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                <span>{example.time}</span>
                <span>•</span>
                <span>{example.duration}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground shrink-0 pt-1.5 text-center text-[11px]">
          No meetings yet. Click to start!
        </p>
      </div>
    )
  }

  // Meeting list
  return (
    <div className="bg-background flex h-full flex-col overflow-hidden p-2">
      <div className="flex-1 space-y-1 overflow-hidden">
        {meetings.map((meeting) => (
          <div
            key={meeting.id}
            className="bg-muted/50 rounded-md px-2.5 py-1.5"
          >
            <div className="text-foreground line-clamp-1 text-[13px] font-medium">
              {meeting.title}
            </div>
            <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
              <span>{formatRelativeTime(meeting.createdAt)}</span>
              <span>•</span>
              <span>{formatDuration(meeting.duration)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
