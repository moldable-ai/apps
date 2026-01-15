'use client'

import { StickyNote } from 'lucide-react'
import { cn } from '@moldable-ai/ui'

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: React.ReactNode
  className?: string
}

export function EmptyState({
  title = 'No notes yet',
  description = 'Create your first note to get started',
  icon = <StickyNote className="text-muted-foreground/60 size-8" />,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        className,
      )}
    >
      <div className="bg-muted/50 border-background mb-4 flex size-20 items-center justify-center rounded-full border-4 shadow-sm">
        {icon}
      </div>
      <h3 className="text-foreground/90 text-lg font-medium">{title}</h3>
      <p className="text-muted-foreground mt-1 max-w-[280px] text-sm leading-relaxed">
        {description}
      </p>
    </div>
  )
}
