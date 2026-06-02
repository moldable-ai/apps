'use client'

import { Check, ImagePlus } from 'lucide-react'
import { type JSX, useRef } from 'react'
import { Spinner, cn } from '@moldable-ai/ui'
import type { Plant } from '../../lib/types'

function shortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const days = Math.round((Date.now() - d.getTime()) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * The growth journal — a timeline of dated photos so you can watch a plant fill
 * out over months. Newest first; tap any photo to make it the portrait; the
 * add tile snaps a new one. Falls back to the hero image for plants that
 * predate the journal so the strip is never empty.
 */
export function PlantJournal(props: {
  plant: Plant
  mediaUrl: (path?: string) => string | undefined
  onAddPhoto: (file: File) => Promise<void> | void
  onSetHero: (path: string) => void
  busy?: boolean
}): JSX.Element {
  const { plant, mediaUrl, onAddPhoto, onSetHero, busy } = props
  const inputRef = useRef<HTMLInputElement>(null)

  const source =
    plant.photos && plant.photos.length > 0
      ? plant.photos
      : plant.heroImageUrl
        ? [{ path: plant.heroImageUrl, addedAt: plant.createdAt }]
        : []
  const photos = [...source].sort((a, b) => b.addedAt.localeCompare(a.addedAt))
  const heroPath = plant.heroImageUrl

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between px-1">
        <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.12em]">
          Journal
        </span>
        {photos.length > 0 && (
          <span className="text-muted-foreground/80 text-[11px]">
            {photos.length} photo{photos.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {/* px/py give the selected photo's ring (a box-shadow) room so the
          horizontal scroll container doesn't clip it. */}
      <div className="plant-no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground flex size-[84px] shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed transition-colors disabled:cursor-default disabled:opacity-60"
        >
          {busy ? (
            <Spinner className="size-4" />
          ) : (
            <ImagePlus className="size-5" />
          )}
          <span className="text-[10px] font-medium">
            {busy ? 'Adding…' : 'Add photo'}
          </span>
        </button>

        {photos.map((ph) => {
          const url = mediaUrl(ph.path)
          const isHero = ph.path === heroPath
          return (
            <button
              key={`${ph.path}-${ph.addedAt}`}
              type="button"
              onClick={() => {
                if (!isHero) onSetHero(ph.path)
              }}
              aria-label={
                isHero
                  ? `Current photo from ${shortDate(ph.addedAt)}`
                  : `Use the photo from ${shortDate(ph.addedAt)} as the main photo`
              }
              className={cn(
                'bg-muted relative size-[84px] shrink-0 cursor-pointer overflow-hidden rounded-xl ring-1 transition',
                isHero
                  ? 'ring-primary ring-2'
                  : 'hover:ring-foreground/25 ring-black/5',
              )}
            >
              {url && (
                <img src={url} alt="" className="size-full object-cover" />
              )}
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-5 text-[10px] font-medium text-white">
                {shortDate(ph.addedAt)}
              </span>
              {isHero && (
                <span className="bg-primary text-primary-foreground absolute right-1 top-1 inline-grid size-4 place-items-center rounded-full shadow">
                  <Check className="size-2.5" />
                </span>
              )}
            </button>
          )
        })}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void onAddPhoto(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
