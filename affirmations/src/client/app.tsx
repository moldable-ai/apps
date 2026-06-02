'use client'

import {
  ArrowLeft,
  ChevronRight,
  Heart,
  Loader2,
  RotateCw,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  cn,
  popMoldableNavigation,
  pushMoldableNavigation,
  resetMoldableNavigation,
  useMoldableNavigationPop,
} from '@moldable-ai/ui'
import {
  type Category,
  categories,
  getAffirmations,
  getDailyAffirmation,
  getDayKey,
} from '@/lib/affirmations'
import {
  useFavorites,
  useSetFavorite,
  useUpdateFavoritesCache,
} from '@/hooks/use-favorites'
import { useStreak } from '@/hooks/use-streak'
import { EmptyState } from '@/components/empty-state'
import { ToastViewport, useToasts } from '@/components/toast'
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
} from 'framer-motion'

const DAILY_CATEGORY_ID = 'daily'

function dateFromDayKey(dayKey: string) {
  const [year, month, day] = dayKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** A low-alpha tint of an accent color that adapts to light and dark themes. */
function accentTint(accent: string, percent: number) {
  return `color-mix(in srgb, ${accent} ${percent}%, transparent)`
}

/** Fisher-Yates shuffle producing a new array. */
function shuffle<T>(input: T[]): T[] {
  const result = [...input]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export default function DailyAffirmations() {
  const { data: favorites = [], isLoading, isError } = useFavorites()
  const { mutate: setFavorite } = useSetFavorite()
  const updateFavoritesCache = useUpdateFavoritesCache()
  const reduceMotion = useReducedMotion()
  const { toasts, notify, dismiss } = useToasts()

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [currentAffirmation, setCurrentAffirmation] = useState('')
  const [deckPosition, setDeckPosition] = useState(0)
  const [showFavorites, setShowFavorites] = useState(false)
  const [dayKey, setDayKey] = useState(() => getDayKey())
  const streak = useStreak(dayKey)

  // A shuffled deck per category. The cursor is the index of the affirmation
  // currently on screen, so ← / → step through it and `r` jumps to a random one.
  const deckRef = useRef<string[]>([])
  const deckCursorRef = useRef(0)

  const today = useMemo(() => dateFromDayKey(dayKey), [dayKey])
  const dailyAffirmation = useMemo(() => getDailyAffirmation(today), [today])
  const dateLabel = useMemo(
    () =>
      today.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    [today],
  )

  useEffect(() => {
    const now = new Date()
    const nextDay = new Date(now)
    nextDay.setHours(24, 0, 0, 0)
    const delay = Math.max(1000, nextDay.getTime() - now.getTime() + 1000)
    const timeout = window.setTimeout(() => setDayKey(getDayKey()), delay)

    return () => window.clearTimeout(timeout)
  }, [dayKey])

  // Show the affirmation at `index`, wrapping around the deck in both directions.
  const showAt = useCallback((index: number) => {
    const deck = deckRef.current
    if (deck.length === 0) return
    const wrapped = ((index % deck.length) + deck.length) % deck.length
    deckCursorRef.current = wrapped
    setDeckPosition(wrapped)
    setCurrentAffirmation(deck[wrapped])
  }, [])

  const nextAffirmation = useCallback(
    () => showAt(deckCursorRef.current + 1),
    [showAt],
  )

  const prevAffirmation = useCallback(
    () => showAt(deckCursorRef.current - 1),
    [showAt],
  )

  // Jump to a random affirmation other than the one already showing.
  const randomAffirmation = useCallback(() => {
    const deck = deckRef.current
    if (deck.length <= 1) return
    let index = deckCursorRef.current
    while (index === deckCursorRef.current) {
      index = Math.floor(Math.random() * deck.length)
    }
    showAt(index)
  }, [showAt])

  // Build a fresh shuffled deck for a category and show its first card.
  const buildDeck = useCallback((catId: string) => {
    const shuffled = shuffle(getAffirmations(catId))
    deckRef.current = shuffled
    deckCursorRef.current = 0
    setDeckPosition(0)
    setCurrentAffirmation(shuffled[0] ?? '')
  }, [])

  const toggleFavorite = useCallback(
    (text: string) => {
      if (!text) return

      const wasFavorite = favorites.includes(text)
      updateFavoritesCache((prev) => {
        const nextFavorites = prev.includes(text)
          ? prev.filter((favorite) => favorite !== text)
          : [...prev, text]

        setFavorite(
          { text, favorite: !prev.includes(text) },
          {
            onError: () =>
              notify("Couldn't sync your favorites", { variant: 'error' }),
          },
        )
        return nextFavorites
      })

      notify(wasFavorite ? 'Removed from favorites' : 'Saved to favorites', {
        icon: wasFavorite ? (
          <Heart className="size-4" />
        ) : (
          <Heart className="size-4 fill-current" />
        ),
      })
    },
    [favorites, notify, setFavorite, updateFavoritesCache],
  )

  const activeCat = useMemo<Category | undefined>(
    () => categories.find((category) => category.id === selectedCategory),
    [selectedCategory],
  )

  const isDailyView = selectedCategory === DAILY_CATEGORY_ID
  const viewerAccent = activeCat?.accent

  const openCategory = useCallback(
    (categoryId: string) => {
      const category = categories.find((item) => item.id === categoryId)
      pushMoldableNavigation({
        id: `category:${categoryId}`,
        title: category?.name ?? 'Affirmation',
      })
      setSelectedCategory(categoryId)
      buildDeck(categoryId)
    },
    [buildDeck],
  )

  const openDaily = useCallback(() => {
    pushMoldableNavigation({
      id: `category:${DAILY_CATEGORY_ID}`,
      title: "Today's Affirmation",
    })
    deckRef.current = [dailyAffirmation]
    deckCursorRef.current = 0
    setDeckPosition(0)
    setCurrentAffirmation(dailyAffirmation)
    setSelectedCategory(DAILY_CATEGORY_ID)
  }, [dailyAffirmation])

  const closeCategory = useCallback((sync: 'pop' | 'none' = 'pop') => {
    if (sync === 'pop') popMoldableNavigation()
    setSelectedCategory(null)
  }, [])

  const openFavorites = useCallback(() => {
    pushMoldableNavigation({ id: 'favorites', title: 'Favorites' })
    setShowFavorites(true)
  }, [])

  const closeFavorites = useCallback((sync: 'pop' | 'none' = 'pop') => {
    if (sync === 'pop') popMoldableNavigation('favorites')
    setShowFavorites(false)
  }, [])

  const openAffirmationFromFavorite = useCallback((text: string) => {
    popMoldableNavigation('favorites')
    setShowFavorites(false)
    pushMoldableNavigation({
      id: `category:${DAILY_CATEGORY_ID}`,
      title: 'Affirmation',
    })
    deckRef.current = [text]
    deckCursorRef.current = 0
    setDeckPosition(0)
    setCurrentAffirmation(text)
    setSelectedCategory(DAILY_CATEGORY_ID)
  }, [])

  useEffect(() => {
    resetMoldableNavigation()
  }, [])

  // Keyboard navigation in the category viewer: ← / → step through the deck,
  // r jumps to a random affirmation. Disabled for the single-card daily and
  // favorite views and while the favorites overlay is open.
  useEffect(() => {
    if (!selectedCategory || isDailyView || showFavorites) return
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        nextAffirmation()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        prevAffirmation()
      } else if (event.key === 'r' || event.key === 'R') {
        event.preventDefault()
        randomAffirmation()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    selectedCategory,
    isDailyView,
    showFavorites,
    nextAffirmation,
    prevAffirmation,
    randomAffirmation,
  ])

  // Close the favorites overlay on Escape for keyboard users.
  useEffect(() => {
    if (!showFavorites) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeFavorites('pop')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showFavorites, closeFavorites])

  useMoldableNavigationPop((message) => {
    const entryId = message.entry?.id ?? ''

    if (entryId === 'favorites' || showFavorites) {
      closeFavorites('none')
      return
    }

    closeCategory('none')
  })

  const fav = useCallback(
    (text: string) => favorites.includes(text),
    [favorites],
  )

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col overflow-hidden font-sans antialiased">
      <AnimatePresence mode="wait">
        {!selectedCategory ? (
          <div key="dashboard" className="flex flex-1 flex-col overflow-y-auto">
            {/* Minimal top bar — just a quiet way back to saved affirmations */}
            <header className="bg-background/80 sticky top-0 z-20 backdrop-blur-md">
              <div className="mx-auto flex w-full max-w-4xl items-center justify-end px-5 pt-4 sm:px-6">
                <FavoritesButton
                  count={favorites.length}
                  loading={isLoading}
                  onClick={openFavorites}
                />
              </div>
            </header>

            <div className="mx-auto w-full max-w-4xl flex-1 px-5 pb-[calc(var(--chat-safe-padding,0px)+4rem)] pt-6 sm:px-6 sm:pt-8">
              <div className="mb-6 flex flex-col gap-1">
                <p className="text-muted-foreground text-sm font-medium">
                  {dateLabel}
                </p>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {greeting()}
                </h1>
              </div>

              {/* Hero — Today's Affirmation */}
              <DailyHero
                text={dailyAffirmation}
                streak={streak}
                isFavorite={fav(dailyAffirmation)}
                onOpen={openDaily}
                onToggleFavorite={() => toggleFavorite(dailyAffirmation)}
                reduceMotion={!!reduceMotion}
              />

              {/* Explore by theme */}
              <div className="mb-4 mt-10 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold tracking-tight">
                  Explore by theme
                </h2>
                <span className="text-muted-foreground text-xs font-medium">
                  {categories.length} themes
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {categories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    onClick={() => openCategory(category.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Viewer
            key="viewer"
            text={currentAffirmation}
            accent={viewerAccent}
            isFavorite={fav(currentAffirmation)}
            canRefresh={!isDailyView}
            deckPosition={deckPosition}
            deckSize={deckRef.current.length}
            reduceMotion={!!reduceMotion}
            onBack={() => closeCategory('pop')}
            onToggleFavorite={() => toggleFavorite(currentAffirmation)}
            onRefresh={randomAffirmation}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFavorites && (
          <FavoritesOverlay
            favorites={favorites}
            isError={isError}
            reduceMotion={!!reduceMotion}
            onClose={() => closeFavorites('pop')}
            onOpenAffirmation={openAffirmationFromFavorite}
            onToggleFavorite={toggleFavorite}
          />
        )}
      </AnimatePresence>

      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/* ---------------------------------------------------------------- */
/* Header favorites button                                          */
/* ---------------------------------------------------------------- */

function FavoritesButton({
  count,
  loading,
  onClick,
}: {
  count: number
  loading: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open favorites${count > 0 ? `, ${count} saved` : ''}`}
      title="Favorites"
      className="bg-card border-border hover:border-primary/50 hover:bg-muted relative flex h-10 items-center gap-2 rounded-full border pl-3 pr-3.5 text-sm font-medium transition-colors"
    >
      <Heart
        className={cn(
          'size-4',
          count > 0 ? 'fill-primary text-primary' : 'text-muted-foreground',
        )}
      />
      <span className="tabular-nums">
        {loading ? (
          <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
        ) : (
          count
        )}
      </span>
    </button>
  )
}

/* ---------------------------------------------------------------- */
/* Daily hero                                                       */
/* ---------------------------------------------------------------- */

function DailyHero({
  text,
  streak,
  isFavorite,
  onOpen,
  onToggleFavorite,
  reduceMotion,
}: {
  text: string
  streak: number
  isFavorite: boolean
  onOpen: () => void
  onToggleFavorite: () => void
  reduceMotion: boolean
}) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="bg-card border-border relative overflow-hidden rounded-3xl border p-6 shadow-sm sm:p-8"
    >
      <div
        aria-hidden
        className="bg-primary/5 pointer-events-none absolute -right-16 -top-16 size-48 rounded-full blur-2xl"
      />
      {streak > 0 && (
        <div className="relative mb-4 flex justify-end">
          <span className="text-muted-foreground text-xs font-medium tabular-nums">
            Day {streak}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={onOpen}
        className="group/hero block w-full cursor-pointer text-left"
        aria-label="Open today's affirmation"
      >
        <p className="text-balance text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
          &ldquo;{text}&rdquo;
        </p>
        <span className="text-muted-foreground group-hover/hero:text-foreground mt-4 inline-flex items-center gap-1 text-sm font-medium transition-colors">
          Reflect on this
          <ChevronRight className="size-4" />
        </span>
      </button>

      <div className="border-border/60 relative mt-6 flex items-center gap-2 border-t pt-4">
        <IconButton
          label={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
          onClick={onToggleFavorite}
          active={isFavorite}
          reduceMotion={reduceMotion}
        >
          <Heart
            className={cn('size-5', isFavorite && 'fill-primary text-primary')}
          />
        </IconButton>
        <span className="text-muted-foreground text-xs">
          {isFavorite ? 'Saved to your favorites' : 'Save this for later'}
        </span>
      </div>
    </motion.div>
  )
}

/* ---------------------------------------------------------------- */
/* Category card                                                    */
/* ---------------------------------------------------------------- */

function CategoryCard({
  category,
  onClick,
}: {
  category: Category
  onClick: () => void
}) {
  const Icon = category.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-card border-border group relative flex cursor-pointer items-center gap-4 overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
      style={{ ['--accent' as string]: category.accent }}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
        style={{ backgroundColor: 'var(--accent)' }}
      />
      <div
        className="flex size-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105"
        style={{
          color: category.accent,
          backgroundColor: accentTint(category.accent, 14),
        }}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-semibold tracking-tight">
          {category.name}
        </h3>
        <p className="text-muted-foreground mt-0.5 truncate text-xs">
          {category.blurb}
        </p>
      </div>
      <ChevronRight className="text-muted-foreground/40 group-hover:text-foreground size-4 shrink-0 transition-colors" />
    </button>
  )
}

/* ---------------------------------------------------------------- */
/* Shared icon button with heart-pop                                */
/* ---------------------------------------------------------------- */

function IconButton({
  label,
  onClick,
  children,
  active,
  reduceMotion,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
  active?: boolean
  reduceMotion?: boolean
}) {
  const controls = useAnimationControls()
  const prevActive = useRef(active)

  // Pop the button once, only on the transition into the active (saved) state.
  useEffect(() => {
    if (reduceMotion) return
    if (active && !prevActive.current) {
      void controls.start({
        scale: [1, 1.28, 1],
        transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
      })
    }
    prevActive.current = active
  }, [active, controls, reduceMotion])

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      whileTap={reduceMotion ? undefined : { scale: 0.88 }}
      animate={controls}
      className="bg-muted/70 hover:bg-muted flex size-11 cursor-pointer items-center justify-center rounded-full backdrop-blur-md transition-colors"
    >
      {children}
    </motion.button>
  )
}

/* ---------------------------------------------------------------- */
/* Viewer                                                           */
/* ---------------------------------------------------------------- */

function Viewer({
  text,
  accent,
  isFavorite,
  canRefresh,
  deckPosition,
  deckSize,
  reduceMotion,
  onBack,
  onToggleFavorite,
  onRefresh,
}: {
  text: string
  accent?: string
  isFavorite: boolean
  canRefresh: boolean
  deckPosition: number
  deckSize: number
  reduceMotion: boolean
  onBack: () => void
  onToggleFavorite: () => void
  onRefresh: () => void
}) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0 }}
      className="bg-background fixed inset-0 z-50 flex flex-col"
    >
      {/* Subtle accent wash so the viewer feels themed without glare */}
      {accent && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-64"
          style={{
            background: `radial-gradient(60% 100% at 50% 0%, ${accentTint(
              accent,
              12,
            )}, transparent)`,
          }}
        />
      )}

      <header className="relative flex items-center justify-between p-4 sm:p-6">
        <IconButton
          label="Go back"
          onClick={onBack}
          reduceMotion={reduceMotion}
        >
          <ArrowLeft className="size-5" />
        </IconButton>
        <div className="flex gap-2.5">
          <IconButton
            label={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
            onClick={onToggleFavorite}
            active={isFavorite}
            reduceMotion={reduceMotion}
          >
            <Heart
              className={cn(
                'size-5',
                isFavorite && 'fill-primary text-primary',
              )}
            />
          </IconButton>
          {canRefresh && (
            <IconButton
              label="Show another affirmation"
              onClick={onRefresh}
              reduceMotion={reduceMotion}
            >
              <RotateCw className="size-5" />
            </IconButton>
          )}
        </div>
      </header>

      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-4 text-center sm:px-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={text}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              reduceMotion ? undefined : { opacity: 0, scale: 1.02, y: -10 }
            }
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="text-balance text-3xl font-medium leading-[1.18] tracking-tight sm:text-5xl md:text-6xl">
              {text}
            </h2>
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="relative flex flex-col items-center gap-3 px-4 pb-[calc(var(--chat-safe-padding,0px)+1.5rem)] pt-4 sm:px-6 sm:pt-6">
        {canRefresh && deckSize > 1 && (
          <span className="text-muted-foreground text-xs font-medium tabular-nums">
            {(deckPosition % deckSize) + 1} of {deckSize}
          </span>
        )}
      </footer>
    </motion.div>
  )
}

/* ---------------------------------------------------------------- */
/* Favorites overlay                                                */
/* ---------------------------------------------------------------- */

function FavoritesOverlay({
  favorites,
  isError,
  reduceMotion,
  onClose,
  onOpenAffirmation,
  onToggleFavorite,
}: {
  favorites: string[]
  isError: boolean
  reduceMotion: boolean
  onClose: () => void
  onOpenAffirmation: (text: string) => void
  onToggleFavorite: (text: string) => void
}) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-background/95 fixed inset-0 z-[60] overflow-y-auto backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label="Your favorites"
    >
      <div className="bg-background/80 border-border/60 sticky top-0 z-10 border-b backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 py-3.5 sm:px-6">
          <h2 className="text-lg font-semibold tracking-tight">
            Your Favorites
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close favorites"
            title="Close"
            className="bg-muted hover:bg-muted/80 flex size-10 cursor-pointer items-center justify-center rounded-full transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl px-5 pb-[calc(var(--chat-safe-padding,0px)+1.5rem)] pt-6 sm:px-6">
        {isError ? (
          <EmptyState
            icon={<X className="size-5" />}
            title="Couldn't load your favorites"
            description="Something went wrong syncing your saved affirmations. Check your connection and try again."
          />
        ) : favorites.length === 0 ? (
          <EmptyState
            icon={<Heart className="size-5" />}
            title="No saved affirmations yet"
            description="Tap the heart on any affirmation to save it here, so you can return to the words that resonate."
            action={
              <button
                type="button"
                onClick={onClose}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 cursor-pointer items-center rounded-full px-5 text-sm font-medium transition-colors"
              >
                Browse affirmations
              </button>
            }
          />
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {favorites.map((favorite) => (
                <motion.li
                  key={favorite}
                  layout={!reduceMotion}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={
                    reduceMotion
                      ? undefined
                      : { opacity: 0, scale: 0.96, height: 0, marginTop: 0 }
                  }
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="bg-card border-border rounded-2xl border p-4"
                >
                  <button
                    type="button"
                    onClick={() => onOpenAffirmation(favorite)}
                    className="block w-full cursor-pointer text-left"
                    aria-label="Open this affirmation"
                  >
                    <p className="text-base font-medium italic leading-snug">
                      &ldquo;{favorite}&rdquo;
                    </p>
                  </button>
                  <div className="border-border/50 mt-3 flex items-center gap-1 border-t pt-2">
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(favorite)}
                      aria-label="Remove from favorites"
                      title="Remove from favorites"
                      className="hover:bg-muted flex size-11 cursor-pointer items-center justify-center rounded-full transition-colors"
                    >
                      <Heart className="fill-primary text-primary size-5" />
                    </button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </motion.div>
  )
}
