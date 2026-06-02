'use client'

import { Droplet, Droplets } from 'lucide-react'
import type { ComponentProps, JSX, MouseEvent } from 'react'
import { Button, cn } from '@moldable-ai/ui'
import { type Plant, dueState, nextDueAt } from '../../lib/types'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Short human label for a plant's current watering status, e.g. "Water today",
 * "Overdue 2 days", "Due in 3 days", or "No schedule". Used by the gallery card
 * chip and (loosely) by the detail water button.
 */
export function waterStatusLabel(plant: Plant): string {
  const due = nextDueAt(plant)
  if (!due) return 'No schedule'

  const diffMs = new Date(due).getTime() - Date.now()
  const days = Math.round(diffMs / DAY_MS)

  if (diffMs < 0) {
    const overdue = Math.max(1, Math.abs(days))
    return `Overdue ${overdue} ${overdue === 1 ? 'day' : 'days'}`
  }
  if (days === 0) return 'Water today'
  if (days === 1) return 'Due tomorrow'
  return `Due in ${days} days`
}

/**
 * Primary "Water" action. The button stays calm by default and shifts to a
 * destructive accent once the plant is overdue, so an at-risk plant reads at a
 * glance. Semantic tokens only — no raw tailwind colors.
 */
export function WaterButton(props: {
  plant: Plant
  onWater: () => void
  size?: ComponentProps<typeof Button>['size']
  className?: string
}): JSX.Element {
  const { plant, onWater, size = 'sm', className } = props
  const state = dueState(plant)
  const overdue = state === 'overdue'

  return (
    <Button
      type="button"
      size={size}
      variant={overdue ? 'destructive' : 'default'}
      onClick={onWater}
      aria-label={`Water ${plant.commonName}`}
      title={waterStatusLabel(plant)}
      className={cn('cursor-pointer gap-1.5', className)}
    >
      <Droplets className="size-4" />
      Water
    </Button>
  )
}

/**
 * Compact icon-only "mark watered" action for gallery cards. Ghost styling with
 * a translucent backdrop so it reads over either a photo or a plain card. Lives
 * as an overlay sibling of the card's open button — stop propagation so a tap
 * waters without opening the detail view.
 */
export function WaterIconButton(props: {
  plant: Plant
  onWater: () => void
  className?: string
}): JSX.Element {
  const { plant, onWater, className } = props
  const overdue = dueState(plant) === 'overdue'

  return (
    <button
      type="button"
      onClick={(e: MouseEvent) => {
        e.stopPropagation()
        onWater()
      }}
      aria-label={`Water ${plant.commonName}`}
      title={waterStatusLabel(plant)}
      className={cn(
        'bg-background/80 inline-flex size-8 cursor-pointer items-center justify-center rounded-full backdrop-blur transition-colors',
        overdue
          ? 'text-destructive hover:text-destructive'
          : 'text-muted-foreground hover:text-primary',
        className,
      )}
    >
      <Droplet className="size-4" />
    </button>
  )
}
