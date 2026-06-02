'use client'

import { Droplet, Heart, Sprout } from 'lucide-react'
import { type JSX, type MouseEvent, useEffect, useState } from 'react'
import { cn } from '@moldable-ai/ui'
import { type Plant, dueState } from '../../lib/types'
import { waterStatusLabel } from './water-button'

/** Status dot color — a hint of OKLCH so urgency reads over any photo. */
function dotTone(state: ReturnType<typeof dueState>): string {
  switch (state) {
    case 'overdue':
      return 'bg-destructive'
    case 'today':
      return 'bg-[oklch(0.8_0.16_75)]'
    case 'soon':
      return 'bg-[oklch(0.82_0.14_120)]'
    case 'ok':
      return 'bg-[oklch(0.78_0.14_150)]'
    default:
      return 'bg-white/50'
  }
}

// Tasteful tonal gradients for plants without a photo yet — deterministic by
// name so a given plant always gets the same backdrop. Exported so folder
// mosaics can fill empty cells with the same palette.
const FALLBACKS: [string, string][] = [
  ['oklch(0.55 0.09 150)', 'oklch(0.38 0.07 155)'],
  ['oklch(0.53 0.08 178)', 'oklch(0.37 0.06 184)'],
  ['oklch(0.58 0.08 128)', 'oklch(0.41 0.06 134)'],
  ['oklch(0.5 0.07 108)', 'oklch(0.35 0.05 114)'],
]

export function fallbackFor(name: string): [string, string] {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return FALLBACKS[h % FALLBACKS.length]!
}

export function fallbackGradient(name: string): string {
  const [from, to] = fallbackFor(name)
  return `linear-gradient(150deg, ${from} 0%, ${to} 100%)`
}

export function PlantCard(props: {
  plant: Plant
  index: number
  mediaUrl: (path?: string) => string | undefined
  onOpen(): void
  onWater(): void
  onToggleFavorite(): void
}): JSX.Element {
  const { plant, index, mediaUrl, onOpen, onWater, onToggleFavorite } = props
  const image = mediaUrl(plant.heroImageUrl)
  const [imageBroken, setImageBroken] = useState(false)
  const state = dueState(plant)
  const label = waterStatusLabel(plant)
  const fav = Boolean(plant.isFavorite)
  const needsWater = state === 'overdue' || state === 'today'
  const [from, to] = fallbackFor(plant.commonName)
  const showImage = Boolean(image && !imageBroken)

  useEffect(() => {
    setImageBroken(false)
  }, [image])

  return (
    <div
      className={cn(
        'animate-plant-card-in bg-muted group relative aspect-[4/5] overflow-hidden rounded-2xl',
        'transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/25',
      )}
      style={{ animationDelay: `${Math.min(index, 14) * 35}ms` }}
    >
      {/* Photo (or tonal fallback) */}
      {showImage ? (
        <img
          src={image}
          alt={plant.commonName}
          loading="lazy"
          className="absolute inset-0 size-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.06]"
          onError={() => setImageBroken(true)}
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center transition-transform duration-[600ms] ease-out group-hover:scale-[1.06]"
          style={{
            background: `linear-gradient(150deg, ${from} 0%, ${to} 100%)`,
          }}
        >
          <Sprout className="size-12 text-white/35" />
        </div>
      )}

      {/* Whole-photo open target (stretched link). Sits above the image but
          below the scrim text + action buttons. */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${plant.commonName}`}
        className="focus-visible:ring-primary/60 absolute inset-0 z-10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
      />

      {/* Bottom scrim + name + status. Non-interactive so taps fall through to
          the open target. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 via-black/25 to-transparent px-3 pb-3 pt-12">
        <h3 className="truncate text-[15px] font-semibold text-white drop-shadow-sm">
          {plant.commonName}
        </h3>
        <div className="mt-1 flex items-center gap-1.5">
          <span
            className={cn('size-1.5 shrink-0 rounded-full', dotTone(state))}
          />
          <span className="truncate text-xs font-medium text-white/85">
            {label}
          </span>
        </div>
      </div>

      {/* Favorite — top-right, revealed on hover (always shown once favorited) */}
      <button
        type="button"
        onClick={(e: MouseEvent) => {
          e.stopPropagation()
          onToggleFavorite()
        }}
        aria-label={
          fav
            ? `Remove ${plant.commonName} from favorites`
            : `Add ${plant.commonName} to favorites`
        }
        aria-pressed={fav}
        className={cn(
          'absolute right-2 top-2 z-30 inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-white backdrop-blur-sm transition',
          'bg-black/25 hover:bg-black/40 focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100',
          fav ? 'opacity-100' : 'opacity-0',
        )}
      >
        <Heart className={cn('size-4', fav && 'fill-white')} />
      </button>

      {/* Mark watered — bottom-right, always shown when due (high-frequency) */}
      <button
        type="button"
        onClick={(e: MouseEvent) => {
          e.stopPropagation()
          onWater()
        }}
        aria-label={`Water ${plant.commonName}`}
        title={label}
        className={cn(
          'absolute bottom-2.5 right-2.5 z-30 inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-white backdrop-blur-sm transition',
          'hover:bg-black/50 focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100',
          needsWater ? 'bg-black/40 opacity-100' : 'bg-black/30 opacity-0',
        )}
      >
        <Droplet className="size-4" />
      </button>
    </div>
  )
}
