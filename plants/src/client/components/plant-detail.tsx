'use client'

import {
  ArrowLeft,
  Heart,
  ImageOff,
  MapPin,
  MoreVertical,
  Sprout,
  Sun,
  Trash2,
} from 'lucide-react'
import {
  type JSX,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { MarkdownEditor } from '@moldable-ai/editor'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  cn,
} from '@moldable-ai/ui'
import type { IdCandidate, Plant } from '../../lib/types'
import { CareView } from './care-view'
import { IdConfirm } from './id-confirm'
import { EditableChip, InlineInput } from './inline-edit'
import { fallbackGradient } from './plant-card'
import { PlantJournal } from './plant-journal'
import { WaterStatus } from './water-status'

// ── Hero: full-bleed photo (slow Ken-Burns) or a tonal gradient + sprout ──
function Hero({
  url,
  name,
  children,
}: {
  url: string | undefined
  name: string
  children: React.ReactNode
}): JSX.Element {
  const [broken, setBroken] = useState(false)
  useEffect(() => setBroken(false), [url])
  const showImage = Boolean(url) && !broken

  return (
    <div className="relative h-[42vh] max-h-[460px] min-h-[280px] w-full overflow-hidden">
      {showImage ? (
        <img
          src={url}
          alt={name}
          className="plant-kenburns absolute inset-0 size-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: fallbackGradient(name || 'plant') }}
        >
          {url && broken ? (
            <ImageOff className="size-12 text-white/40" />
          ) : (
            <Sprout className="size-16 text-white/30" />
          )}
        </div>
      )}

      {/* Scrims: top for floating controls, bottom for the title block. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

      {children}
    </div>
  )
}

// A round glass control that reads over any photo.
function GlassButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
  className?: string
}): JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'inline-grid size-9 cursor-pointer place-items-center rounded-full bg-black/30 text-white backdrop-blur-md transition-colors hover:bg-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function PlantDetail(props: {
  plant: Plant
  mediaUrl: (path?: string) => string | undefined
  onBack: () => void
  onPatch: (patch: Partial<Plant>) => void
  onWater: () => void
  onSnooze: (untilISO: string) => void
  onGenerateCare: () => void
  regenerating: boolean
  onFavorite: (next: boolean) => void
  onDelete: () => void
  onAddPhoto: (file: File) => Promise<void> | void
  onSetHero: (path: string) => void
  addingPhoto?: boolean
}): JSX.Element {
  const {
    plant,
    mediaUrl,
    onBack,
    onPatch,
    onWater,
    onSnooze,
    onGenerateCare,
    regenerating,
    onFavorite,
    onDelete,
    onAddPhoto,
    onSetHero,
    addingPhoto,
  } = props

  const [confirmDelete, setConfirmDelete] = useState(false)

  // Always open a plant at the very top. Depending on the host the scroller may
  // be our own container, the window, or the document — reset all of them before
  // paint, and again next frame (the host posts chat-state/safe-padding right
  // after load, which can nudge layout), so navigating in never lands mid-page.
  const scrollRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const toTop = () => {
      scrollRef.current?.scrollTo?.({ top: 0 })
      if (scrollRef.current) scrollRef.current.scrollTop = 0
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0)
        const doc = document.scrollingElement as HTMLElement | null
        if (doc) doc.scrollTop = 0
        if (document.body) document.body.scrollTop = 0
      }
    }
    toTop()
    const raf = requestAnimationFrame(toTop)
    return () => cancelAnimationFrame(raf)
  }, [plant.id])

  // Notes: debounced save with a quiet "Saved" flash.
  const [notes, setNotes] = useState(plant.notes ?? '')
  const [saved, setSaved] = useState(false)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setNotes(plant.notes ?? '')
  }, [plant.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const onNotesChange = useCallback(
    (next: string) => {
      setNotes(next)
      if (notesTimer.current) clearTimeout(notesTimer.current)
      notesTimer.current = setTimeout(() => {
        onPatch({ notes: next })
        setSaved(true)
        if (savedTimer.current) clearTimeout(savedTimer.current)
        savedTimer.current = setTimeout(() => setSaved(false), 1500)
      }, 600)
    },
    [onPatch],
  )

  useEffect(
    () => () => {
      if (notesTimer.current) clearTimeout(notesTimer.current)
      if (savedTimer.current) clearTimeout(savedTimer.current)
    },
    [],
  )

  const heroUrl = mediaUrl(plant.heroImageUrl)
  const confirmName = (plant.scientificName ?? plant.commonName ?? '').trim()
  const idSource = plant.identification?.source
  // Only nudge for confirmation on machine guesses that haven't been confirmed.
  const needsConfirm =
    (idSource === 'chat' || idSource === 'vision') &&
    !plant.identification?.confirmedAt

  const confirmId = useCallback(() => {
    onPatch({
      identification: {
        ...plant.identification,
        confirmedAt: new Date().toISOString(),
      },
    })
  }, [onPatch, plant.identification])

  const pickCandidate = useCallback(
    (c: IdCandidate) => {
      onPatch({
        commonName: c.commonName?.trim() || c.name.trim(),
        scientificName: c.name.trim(),
        identification: {
          ...plant.identification,
          confirmedAt: new Date().toISOString(),
        },
      })
    },
    [onPatch, plant.identification],
  )

  // Per-block entrance stagger.
  let block = 0
  const rise = () => ({
    className: 'animate-plant-rise',
    style: { animationDelay: `${Math.min(block++, 6) * 60}ms` },
  })

  return (
    <main className="animate-plant-view-in bg-background relative flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <Hero url={heroUrl} name={plant.commonName}>
          {/* Floating controls */}
          <div className="absolute left-3 top-3 z-10">
            <GlassButton label="Back" onClick={onBack}>
              <ArrowLeft className="size-[18px]" />
            </GlassButton>
          </div>
          <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
            <GlassButton
              label={
                plant.isFavorite ? 'Remove from favorites' : 'Add to favorites'
              }
              onClick={() => onFavorite(!plant.isFavorite)}
            >
              <Heart
                className={cn(
                  'size-[18px]',
                  plant.isFavorite && 'fill-rose-400 text-rose-400',
                )}
              />
            </GlassButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="More actions"
                  className="inline-grid size-9 cursor-pointer place-items-center rounded-full bg-black/30 text-white backdrop-blur-md transition-colors hover:bg-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <MoreVertical className="size-[18px]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setConfirmDelete(true)}
                  className="cursor-pointer"
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete plant
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Title block over the scrim */}
          <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4">
            <div className="mx-auto w-full max-w-[640px]">
              <InlineInput
                value={plant.commonName}
                placeholder="Name your plant"
                ariaLabel="Plant name"
                onCommit={(v) => onPatch({ commonName: v })}
                className="plant-serif text-[28px] font-semibold leading-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] placeholder:text-white/45 focus:bg-black/25 focus-visible:ring-white/60 sm:text-[32px]"
              />
              <InlineInput
                value={plant.scientificName ?? ''}
                placeholder="Add a scientific name"
                ariaLabel="Scientific name"
                allowEmpty
                onCommit={(v) => onPatch({ scientificName: v || undefined })}
                className="mt-0.5 text-[13px] italic text-white/75 drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)] placeholder:text-white/40 focus:bg-black/25 focus-visible:ring-white/60"
              />
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <EditableChip
                  variant="hero"
                  icon={<MapPin />}
                  value={plant.room ?? ''}
                  placeholder="Add a room"
                  ariaLabel="Room"
                  onCommit={(v) => onPatch({ room: v || undefined })}
                />
                <EditableChip
                  variant="hero"
                  icon={<Sun />}
                  value={plant.location ?? ''}
                  placeholder="Add a spot"
                  ariaLabel="Spot"
                  onCommit={(v) => onPatch({ location: v || undefined })}
                />
              </div>
            </div>
          </div>
        </Hero>

        {/* Content column */}
        <div className="mx-auto w-full max-w-[640px] space-y-5 px-4 pb-[calc(var(--chat-safe-padding,0px)+5rem)] pt-5">
          <div {...rise()}>
            <WaterStatus
              plant={plant}
              onWater={onWater}
              onSnooze={onSnooze}
              onSetInterval={(days) => onPatch({ waterIntervalDays: days })}
              onGenerateCare={onGenerateCare}
              generating={regenerating}
            />
          </div>

          <div {...rise()}>
            <PlantJournal
              plant={plant}
              mediaUrl={mediaUrl}
              onAddPhoto={onAddPhoto}
              onSetHero={onSetHero}
              busy={addingPhoto}
            />
          </div>

          {needsConfirm && confirmName && (
            <div {...rise()}>
              <IdConfirm
                name={confirmName}
                confirmed={false}
                candidates={plant.identification?.candidates}
                onConfirm={confirmId}
                onPickCandidate={pickCandidate}
              />
            </div>
          )}

          <div {...rise()}>
            <CareView
              plant={plant}
              onRegenerate={onGenerateCare}
              generating={regenerating}
            />
          </div>

          {/* Notes — quiet journal, not a boxed form field */}
          <div {...rise()}>
            <div className="mb-1.5 flex items-baseline justify-between px-1">
              <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.12em]">
                Notes
              </span>
              <span
                className={cn(
                  'text-muted-foreground text-[11px] transition-opacity',
                  saved ? 'opacity-100' : 'opacity-0',
                )}
              >
                Saved
              </span>
            </div>
            <div className="bg-muted/30 focus-within:bg-muted/45 rounded-xl px-3 py-1 transition-colors">
              <MarkdownEditor
                value={notes}
                onChange={onNotesChange}
                placeholder="Where it came from, how it's doing, anything to remember…"
                minHeight="120px"
                className="text-sm"
                hideMarkdownHint
              />
            </div>
          </div>

          {/* Confirmed plants keep a quiet reference-photo disclosure */}
          {!needsConfirm && confirmName && (
            <div {...rise()}>
              <IdConfirm
                name={confirmName}
                confirmed
                onConfirm={confirmId}
                onPickCandidate={pickCandidate}
              />
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent
          size="sm"
          className="top-[calc((100dvh-var(--chat-safe-padding,0px))/2)] max-h-[calc(100dvh-var(--chat-safe-padding,0px)-2rem)] overflow-y-auto"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this plant?</AlertDialogTitle>
            <AlertDialogDescription>
              {plant.commonName} and its watering history will be removed. This
              can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="cursor-pointer"
              onClick={() => {
                setConfirmDelete(false)
                onDelete()
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
