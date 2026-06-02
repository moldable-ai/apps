'use client'

import type { JSX } from 'react'
import { type Plant } from '../../lib/types'
import { EmptyState } from './empty-state'
import { PlantCard } from './plant-card'

export function PlantGallery(props: {
  plants: Plant[]
  mediaUrl: (path?: string) => string | undefined
  onOpen(p: Plant): void
  onWater(p: Plant): void
  onToggleFavorite(p: Plant): void
  emptyAction(): void
}): JSX.Element {
  const { plants, mediaUrl, onOpen, onWater, onToggleFavorite, emptyAction } =
    props

  if (plants.length === 0) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex h-full items-center justify-center pb-[calc(var(--chat-safe-padding,0px)+6rem)]">
          <EmptyState onAdd={emptyAction} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div
        className="grid gap-3 px-4 pb-[calc(var(--chat-safe-padding,0px)+6rem)] pt-1"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        }}
      >
        {plants.map((plant, i) => (
          <PlantCard
            key={plant.id}
            index={i}
            plant={plant}
            mediaUrl={mediaUrl}
            onOpen={() => onOpen(plant)}
            onWater={() => onWater(plant)}
            onToggleFavorite={() => onToggleFavorite(plant)}
          />
        ))}
      </div>
    </div>
  )
}
