'use client'

import { Droplets } from 'lucide-react'
import type { JSX } from 'react'
import { Button } from '@moldable-ai/ui'

/**
 * Soft, borderless notice for plants that need water now (overdue or due
 * today). Lets the user water everything at once or jump to Today without
 * opening each plant. Renders nothing when nothing needs attention.
 */
export function AlertsHeader(props: {
  count: number
  overdueCount: number
  onWaterAll(): void
  onReview(): void
}): JSX.Element | null {
  const { count, overdueCount, onWaterAll, onReview } = props
  if (count <= 0) return null

  const headline =
    count === 1 ? '1 plant needs water' : `${count} plants need water`
  const detail = overdueCount > 0 ? ` · ${overdueCount} overdue` : ''

  return (
    <div className="px-4 pb-1 pt-1">
      <div className="bg-primary/10 animate-plant-chrome-in flex items-center gap-2.5 rounded-xl px-3 py-2">
        <Droplets className="text-primary size-4 shrink-0" />
        <p className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
          {headline}
          <span className="text-muted-foreground font-normal">{detail}</span>
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReview}
          className="h-7 shrink-0 cursor-pointer px-2.5"
        >
          Review
        </Button>
        <Button
          size="sm"
          onClick={onWaterAll}
          className="h-7 shrink-0 cursor-pointer gap-1.5"
        >
          Water all
        </Button>
      </div>
    </div>
  )
}
