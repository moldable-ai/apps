'use client'

import {
  ArrowLeft,
  ChevronRight,
  Heart,
  Loader2,
  RotateCw,
  Share2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useWorkspace } from '@moldable-ai/ui'
import { categories, getAffirmations } from '@/lib/affirmations'
import {
  useFavorites,
  useSaveFavorites,
  useUpdateFavoritesCache,
} from '@/hooks/use-favorites'
import { AnimatePresence, motion } from 'framer-motion'

function getLocalFavoritesKey(workspaceId: string) {
  return `affirmations-favorites-${workspaceId}`
}

function readLocalFavorites(workspaceId: string): string[] {
  try {
    const saved = localStorage.getItem(getLocalFavoritesKey(workspaceId))
    const parsed: unknown = saved ? JSON.parse(saved) : []
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

function writeLocalFavorites(workspaceId: string, favorites: string[]) {
  localStorage.setItem(
    getLocalFavoritesKey(workspaceId),
    JSON.stringify(favorites),
  )
}

export default function DailyAffirmations() {
  const { workspaceId } = useWorkspace()
  const { data: favorites = [], isLoading } = useFavorites()
  const { mutate: saveFavorites } = useSaveFavorites()
  const updateFavoritesCache = useUpdateFavoritesCache()

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [currentAffirmation, setCurrentAffirmation] = useState('')
  const [showFavorites, setShowFavorites] = useState(false)
  const [isMigrated, setIsMigrated] = useState(false)

  useEffect(() => {
    if (!workspaceId || isLoading || isMigrated) return

    const localFavorites = readLocalFavorites(workspaceId)
    if (localFavorites.length > 0 && favorites.length === 0) {
      updateFavoritesCache(() => localFavorites)
      saveFavorites(localFavorites)
    }

    setIsMigrated(true)
  }, [
    favorites.length,
    isLoading,
    isMigrated,
    saveFavorites,
    updateFavoritesCache,
    workspaceId,
  ])

  const generateNew = useCallback((catId: string) => {
    const list = getAffirmations(catId)
    const random = list[Math.floor(Math.random() * list.length)]
    setCurrentAffirmation(random)
  }, [])

  const toggleFavorite = useCallback(
    (e: React.MouseEvent, text: string) => {
      e.stopPropagation()

      updateFavoritesCache((prev) => {
        const nextFavorites = prev.includes(text)
          ? prev.filter((favorite) => favorite !== text)
          : [...prev, text]

        if (workspaceId) {
          writeLocalFavorites(workspaceId, nextFavorites)
        }
        saveFavorites(nextFavorites)
        return nextFavorites
      })
    },
    [saveFavorites, updateFavoritesCache, workspaceId],
  )

  const shareAffirmation = useCallback(() => {
    if (!currentAffirmation) return

    if (navigator.share) {
      void navigator.share({ text: currentAffirmation }).catch(() => {})
      return
    }

    void navigator.clipboard?.writeText(currentAffirmation)
  }, [currentAffirmation])

  const activeCat = useMemo(
    () => categories.find((category) => category.id === selectedCategory),
    [selectedCategory],
  )

  if (isLoading || !isMigrated) {
    return (
      <div className="bg-background flex h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col overflow-hidden font-sans antialiased">
      <AnimatePresence mode="wait">
        {!selectedCategory ? (
          <div
            key="dashboard"
            className="flex-1 overflow-y-auto px-6 pb-12 pt-20"
          >
            <div className="mx-auto max-w-4xl">
              <header className="mb-12">
                <h1 className="mb-4 text-5xl font-semibold tracking-tight">
                  Mindful Moments
                </h1>
                <p className="text-muted-foreground text-xl font-medium">
                  Daily focus for your mental well-being.
                </p>
              </header>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {categories.map((category) => {
                  const Icon = category.icon
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(category.id)
                        generateNew(category.id)
                      }}
                      className="bg-card border-border hover:border-primary/50 group relative cursor-pointer rounded-2xl border p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div
                        className="mb-3 flex size-9 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                        style={{ backgroundColor: category.color }}
                      >
                        <Icon size={18} style={{ color: category.accent }} />
                      </div>
                      <h3 className="text-sm font-semibold">{category.name}</h3>
                      <div className="text-muted-foreground/50 group-hover:text-foreground absolute right-4 top-4 transition-colors">
                        <ChevronRight size={16} />
                      </div>
                    </button>
                  )
                })}
              </div>

              {favorites.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowFavorites(true)}
                  className="text-primary mt-12 flex cursor-pointer items-center gap-2 font-medium hover:underline"
                >
                  View Saved Affirmations ({favorites.length})
                </button>
              )}
            </div>
          </div>
        ) : (
          <motion.div
            key="viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-background fixed inset-0 z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-8">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="bg-muted/80 hover:bg-muted flex size-10 cursor-pointer items-center justify-center rounded-full backdrop-blur-md transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={(event) => toggleFavorite(event, currentAffirmation)}
                  className="bg-muted/80 hover:bg-muted flex size-10 cursor-pointer items-center justify-center rounded-full backdrop-blur-md transition-colors"
                >
                  <Heart
                    size={20}
                    className={
                      favorites.includes(currentAffirmation)
                        ? 'fill-primary text-primary'
                        : ''
                    }
                  />
                </button>
                <button
                  type="button"
                  onClick={() => generateNew(selectedCategory)}
                  className="bg-muted/80 hover:bg-muted flex size-10 cursor-pointer items-center justify-center rounded-full backdrop-blur-md transition-colors"
                >
                  <RotateCw size={20} />
                </button>
              </div>
            </div>

            <div className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center p-12 text-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentAffirmation}
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.02, y: -10 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="text-muted-foreground mb-8 block text-[10px] font-bold uppercase tracking-[0.2em]">
                    {activeCat?.name}
                  </span>
                  <h2 className="text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
                    {currentAffirmation}
                  </h2>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex justify-center p-12">
              <button
                type="button"
                onClick={shareAffirmation}
                className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-2 text-sm font-medium transition-colors"
              >
                <Share2 size={16} /> Share daily inspiration
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showFavorites && (
        <div className="bg-background/95 fixed inset-0 z-[60] overflow-y-auto p-8 backdrop-blur-xl md:p-20">
          <div className="mx-auto max-w-2xl">
            <div className="mb-12 flex items-center justify-between">
              <h2 className="text-3xl font-semibold">Your Favorites</h2>
              <button
                type="button"
                onClick={() => setShowFavorites(false)}
                className="bg-muted hover:bg-muted/80 flex size-10 cursor-pointer items-center justify-center rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              {favorites.map((favorite, index) => (
                <div
                  key={`${favorite}-${index}`}
                  className="bg-card border-border group flex items-center justify-between gap-4 rounded-2xl border p-6"
                >
                  <p className="text-lg font-medium italic">
                    &ldquo;{favorite}&rdquo;
                  </p>
                  <button
                    type="button"
                    onClick={(event) => toggleFavorite(event, favorite)}
                    className="text-primary cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
