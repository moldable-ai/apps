'use client'

import { Clock, Heart, UtensilsCrossed } from 'lucide-react'
import type { CSSProperties } from 'react'
import { cn } from '@moldable-ai/ui'
import type { Folder, Recipe } from '@/lib/types'
import { MoveToMenu } from './move-to-menu'
import { useRecipeMedia } from '@/client/use-recipe-media'

interface RecipeCardProps {
  recipe: Recipe
  folders: Folder[]
  currentFolderId: string | null
  index?: number
  onClick: () => void
  onToggleFavorite: (id: string) => void
  onMove: (folderId: string | null) => void
  onNewFolder: () => void
  onDelete: () => void
}

export function RecipeCard({
  recipe,
  folders,
  currentFolderId,
  index = 0,
  onClick,
  onToggleFavorite,
  onMove,
  onNewFolder,
  onDelete,
}: RecipeCardProps) {
  const { resolveMediaUrl } = useRecipeMedia()
  const image = resolveMediaUrl(recipe.imageUrl)
  const style = {
    animationDelay: `${Math.min(index, 12) * 35}ms`,
  } as CSSProperties

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      style={style}
      className={cn(
        'animate-recipe-card-in group relative isolate flex aspect-[3/4] cursor-pointer flex-col justify-end overflow-hidden rounded-3xl',
        'border-border/50 border shadow-sm transition-all duration-300 ease-out',
        'focus-visible:ring-primary/40 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2',
      )}
    >
      {/* Background */}
      {image ? (
        <img
          src={image}
          alt={recipe.title}
          loading="lazy"
          className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="from-muted to-muted/40 absolute inset-0 flex items-center justify-center bg-gradient-to-br">
          <UtensilsCrossed className="text-muted-foreground/30 size-12" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

      {/* Top actions */}
      <div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite(recipe.id)
          }}
          aria-label={recipe.isFavorite ? 'Unfavorite' : 'Favorite'}
          className={cn(
            'flex size-9 items-center justify-center rounded-full text-white backdrop-blur-md transition-all',
            'bg-black/30 hover:bg-black/50',
            recipe.isFavorite
              ? 'opacity-100'
              : 'opacity-0 focus-visible:opacity-100 group-hover:opacity-100',
          )}
        >
          <Heart
            className={cn(
              'size-4',
              recipe.isFavorite && 'fill-red-500 text-red-500',
            )}
          />
        </button>
        <MoveToMenu
          folders={folders}
          currentFolderId={currentFolderId}
          onMove={onMove}
          onNewFolder={onNewFolder}
          onDelete={onDelete}
          triggerClassName="bg-black/30 text-white hover:bg-black/50 border-white/20"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {recipe.category && (
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white backdrop-blur-sm">
              {recipe.category}
            </span>
          )}
          {recipe.cookingTime && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">
              <Clock className="size-3" />
              {recipe.cookingTime}
            </span>
          )}
        </div>
        <h3 className="text-xl font-semibold leading-tight text-white drop-shadow-sm">
          {recipe.title}
        </h3>
        {recipe.description && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-white/80">
            {recipe.description}
          </p>
        )}
      </div>
    </div>
  )
}
