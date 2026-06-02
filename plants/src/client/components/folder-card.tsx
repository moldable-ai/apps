'use client'

import { Sprout } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { JSX, ReactNode } from 'react'
import { cn } from '@moldable-ai/ui'
import { type Plant } from '../../lib/types'
import { fallbackGradient } from './plant-card'

/**
 * A folder tile for the home view — a 2x2 photo mosaic of the plants inside,
 * with the folder name + count over a scrim. Visually consistent with the
 * plant cards (rounded photo, overlay label, hover lift, staggered entrance).
 */
export function FolderCard(props: {
  title: string
  subtitle: string
  plants: Plant[]
  index: number
  icon?: ReactNode
  mediaUrl: (path?: string) => string | undefined
  onOpen(): void
}): JSX.Element {
  const { title, subtitle, plants, index, icon, mediaUrl, onOpen } = props
  const cells = plants.slice(0, 4)
  const single = cells.length <= 1
  const [brokenImages, setBrokenImages] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    setBrokenImages(new Set())
  }, [plants])

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${title}`}
      style={{ animationDelay: `${Math.min(index, 14) * 35}ms` }}
      className={cn(
        'animate-plant-card-in bg-muted group relative block aspect-[4/5] w-full overflow-hidden rounded-2xl text-left',
        'cursor-pointer transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/25',
        'focus-visible:ring-primary/60 focus-visible:outline-none focus-visible:ring-2',
      )}
    >
      {/* Mosaic cover */}
      {plants.length === 0 ? (
        <div
          className="absolute inset-0 flex items-center justify-center transition-transform duration-[600ms] ease-out group-hover:scale-[1.04]"
          style={{ background: fallbackGradient(title) }}
        >
          <Sprout className="size-12 text-white/35" />
        </div>
      ) : (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5 transition-transform duration-[600ms] ease-out group-hover:scale-[1.04]">
          {Array.from({ length: single ? 1 : 4 }).map((_, i) => {
            const p = cells[i]
            const url = p ? mediaUrl(p.heroImageUrl) : undefined
            const imageKey = p && url ? `${p.id}:${url}` : undefined
            const span = single ? 'col-span-2 row-span-2' : ''
            if (url && imageKey && !brokenImages.has(imageKey)) {
              return (
                <img
                  key={i}
                  src={url}
                  alt=""
                  loading="lazy"
                  className={cn('size-full object-cover', span)}
                  onError={() => {
                    setBrokenImages((current) => {
                      const next = new Set(current)
                      next.add(imageKey)
                      return next
                    })
                  }}
                />
              )
            }
            return (
              <div
                key={i}
                className={cn('size-full', span)}
                style={{
                  background: fallbackGradient(
                    p?.commonName ?? `${title}-${i}`,
                  ),
                }}
              />
            )
          })}
        </div>
      )}

      {/* Scrim + label */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent px-3 pb-3 pt-12">
        <div className="flex items-center gap-1.5">
          {icon && (
            <span className="text-white/85 [&>svg]:size-3.5">{icon}</span>
          )}
          <h3 className="truncate text-[15px] font-semibold text-white drop-shadow-sm">
            {title}
          </h3>
        </div>
        <p className="mt-0.5 truncate text-xs font-medium text-white/80">
          {subtitle}
        </p>
      </div>
    </button>
  )
}
