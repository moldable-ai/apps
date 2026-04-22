'use client'

import { FileText, Plus } from 'lucide-react'
import { Button, cn } from '@moldable-ai/ui'

interface EmptyStateProps {
  className?: string
  onStart?: () => void
}

export function EmptyState({ className, onStart }: EmptyStateProps) {
  const examples = [
    {
      title: 'Weekly product sync',
      context: 'Decisions, action items, and follow-ups',
      time: '2:30 PM',
    },
    {
      title: 'Customer interview',
      context: 'Manual notes with a live transcript',
      time: '10:15 AM',
    },
    {
      title: 'Planning session',
      context: 'Enhanced notes after the meeting ends',
      time: '9:00 AM',
    },
  ]

  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center py-16',
        className,
      )}
    >
      <div className="mx-auto mb-8 w-full max-w-2xl space-y-2 px-4 md:px-0">
        {examples.map((example) => (
          <div
            key={example.title}
            className="border-border/40 bg-muted/20 flex w-full items-start justify-between rounded-lg border p-3 opacity-50 md:p-4"
          >
            <div className="flex min-w-0 items-start gap-3">
              <FileText className="bg-accent text-muted-foreground size-8 flex-shrink-0 rounded-lg p-1.5 opacity-50 md:size-10 md:p-2" />
              <div className="min-w-0">
                <p className="text-foreground truncate font-medium">
                  {example.title}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {example.context}
                </p>
              </div>
            </div>
            <span className="text-muted-foreground flex-shrink-0 pl-2 text-sm">
              {example.time}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-muted-foreground text-sm">
          No meetings yet. Start your first meeting to get going.
        </p>
        {onStart && (
          <Button onClick={onStart} className="cursor-pointer">
            <Plus className="mr-2 size-4" />
            New Meeting
          </Button>
        )}
      </div>
    </div>
  )
}
