'use client'

import { Plus } from 'lucide-react'
import { Button, cn } from '@moldable/ui'

interface EmptyStateProps {
  onCreateEntry: () => void
  className?: string
}

export function EmptyState({ onCreateEntry, className }: EmptyStateProps) {
  const examples = [
    {
      content: 'Today I learned how to order coffee in French...',
      source: '🇬🇧',
      target: '🇫🇷',
      date: 'Today',
    },
    {
      content: 'Mi familia vive en una casa grande cerca del mar...',
      source: '🇪🇸',
      target: '🇬🇧',
      date: 'Yesterday',
    },
    {
      content: '昨日、友達と映画を見に行きました...',
      source: '🇯🇵',
      target: '🇬🇧',
      date: '2 days ago',
    },
  ]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16',
        className,
      )}
    >
      <div className="mx-auto mb-8 w-full max-w-xl space-y-2 px-4">
        {examples.map((example, idx) => (
          <div
            key={idx}
            className="border-border/40 bg-muted/20 flex w-full items-start justify-between rounded-lg border p-4 opacity-50"
          >
            <div className="min-w-0 flex-1">
              <p className="text-foreground mb-1 line-clamp-1 text-sm font-medium">
                {example.content}
              </p>
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <span>
                  {example.source} → {example.target}
                </span>
                <span>·</span>
                <span>{example.date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4">
        <p className="text-muted-foreground text-sm">
          No entries yet. Start your language learning journey!
        </p>
        <Button onClick={onCreateEntry}>
          <Plus className="mr-2 size-4" />
          New Entry
        </Button>
      </div>
    </div>
  )
}
