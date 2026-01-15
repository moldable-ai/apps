'use client'

import { Mic } from 'lucide-react'
import { cn } from '@moldable/ui'

interface EmptyStateProps {
  className?: string
}

export function EmptyState({ className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center text-center',
        className,
      )}
    >
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
        <Mic className="size-8 text-muted-foreground" />
      </div>
      <h3 className="mb-1 font-medium text-foreground">No meetings yet</h3>
      <p className="text-sm text-muted-foreground">
        Click &quot;New Meeting&quot; to start recording
      </p>
    </div>
  )
}
