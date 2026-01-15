'use client'

import { Mic } from 'lucide-react'
import { cn } from '@moldable-ai/ui'

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
      <div className="bg-muted mb-4 flex size-16 items-center justify-center rounded-full">
        <Mic className="text-muted-foreground size-8" />
      </div>
      <h3 className="text-foreground mb-1 font-medium">No meetings yet</h3>
      <p className="text-muted-foreground text-sm">
        Click &quot;New Meeting&quot; to start recording
      </p>
    </div>
  )
}
