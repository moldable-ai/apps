'use client'

import { Folder as FolderIcon, Trash2, UtensilsCrossed } from 'lucide-react'
import type { CSSProperties } from 'react'
import { cn } from '@moldable-ai/ui'
import type { Folder, Recipe } from '@/lib/types'
import { useRecipeMedia } from '@/client/use-recipe-media'

interface FolderCardProps {
  folder: Folder
  recipes: Recipe[]
  index?: number
  onOpen: () => void
  onDelete: () => void
}

export function FolderCard({
  folder,
  recipes,
  index = 0,
  onOpen,
  onDelete,
}: FolderCardProps) {
  const { resolveMediaUrl } = useRecipeMedia()
  const byId = new Map(recipes.map((r) => [r.id, r]))
  const contained = folder.recipeIds
    .map((id) => byId.get(id))
    .filter((r): r is Recipe => Boolean(r) && !r!.isDeleted)
  const previews = contained.slice(0, 4)
  const count = contained.length
  const style = {
    animationDelay: `${Math.min(index, 12) * 35}ms`,
    ['--folder-tone' as string]: folder.tone,
  } as CSSProperties

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      style={style}
      className={cn(
        'animate-recipe-card-in group relative isolate flex aspect-[3/4] cursor-pointer flex-col overflow-hidden rounded-3xl',
        'border-border/60 bg-card border shadow-sm transition-all duration-300 ease-out',
        'focus-visible:ring-primary/40 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2',
      )}
    >
      {/* Thumbnail mosaic */}
      <div className="bg-muted/40 relative grid flex-1 grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden">
        {previews.length === 0 ? (
          <div className="col-span-2 row-span-2 flex items-center justify-center">
            <UtensilsCrossed className="text-muted-foreground/30 size-10" />
          </div>
        ) : (
          Array.from({ length: 4 }).map((_, i) => {
            const r = previews[i]
            const url = r ? resolveMediaUrl(r.imageUrl) : ''
            const span = previews.length === 1 ? 'col-span-2 row-span-2' : ''
            if (!r) {
              return previews.length < 4 ? null : (
                <div key={i} className="bg-muted/60" />
              )
            }
            return url ? (
              <img
                key={i}
                src={url}
                alt=""
                loading="lazy"
                className={cn('size-full object-cover', span)}
              />
            ) : (
              <div
                key={i}
                className={cn(
                  'bg-muted/60 flex items-center justify-center',
                  span,
                )}
              >
                <UtensilsCrossed className="text-muted-foreground/30 size-6" />
              </div>
            )
          })
        )}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1"
          style={{ background: folder.tone }}
        />
      </div>

      {/* Delete (hover) */}
      <button
        type="button"
        aria-label={`Delete folder ${folder.name}`}
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="bg-background/70 text-foreground/80 hover:text-destructive border-border/50 absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full border opacity-0 backdrop-blur transition-all focus-visible:opacity-100 group-hover:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>

      {/* Footer */}
      <div className="bg-card relative z-10 px-4 py-3.5">
        <p className="text-muted-foreground/80 mb-0.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em]">
          <FolderIcon className="size-3" style={{ color: folder.tone }} />
          {count} {count === 1 ? 'recipe' : 'recipes'}
        </p>
        <h3 className="truncate text-base font-semibold tracking-tight">
          {folder.name}
        </h3>
      </div>
    </div>
  )
}
