'use client'

import { Plus, Sprout } from 'lucide-react'
import type { JSX } from 'react'
import { Button } from '@moldable-ai/ui'

type Variant = 'all' | 'room' | 'favorites' | 'today'

const COPY: Record<Variant, { title: string; body: string }> = {
  all: {
    title: 'No plants yet',
    body: 'Add your first plant — drop in a photo or add it by name.',
  },
  room: {
    title: 'Nothing here',
    body: 'Drop in a plant photo here, or add one by name.',
  },
  favorites: {
    title: 'No favorites',
    body: 'Mark a plant as a favorite to keep it here.',
  },
  today: {
    title: 'All watered',
    body: 'Nothing needs water right now.',
  },
}

export function EmptyState(props: {
  onAdd(): void
  variant?: Variant
}): JSX.Element {
  const { onAdd, variant = 'all' } = props
  const copy = COPY[variant]

  return (
    <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <div className="bg-muted flex size-14 items-center justify-center rounded-2xl">
        <Sprout className="text-muted-foreground size-7" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-foreground text-base font-medium">{copy.title}</h2>
        <p className="text-muted-foreground mx-auto max-w-xs text-sm">
          {copy.body}
        </p>
      </div>
      <Button onClick={onAdd} className="cursor-pointer gap-1.5">
        <Plus className="size-4" />
        Add plant
      </Button>
    </div>
  )
}
