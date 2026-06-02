'use client'

import {
  ArrowLeft,
  ExternalLink,
  ImageOff,
  MoreVertical,
  Sprout,
  Star,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
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
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Separator,
  Spinner,
  cn,
  sendToMoldable,
  useWorkspace,
} from '@moldable-ai/ui'
import type { Plant } from '../../lib/types'
import { CarePanel } from './care-panel'
import { WaterButton } from './water-button'
import { ZoomableImage } from './zoomable-image'

// ---------------------------------------------------------------------------
// ID-confirmation strip — fetches free reference photos (iNaturalist) and a
// Wikipedia summary so the user can visually confirm the plant ID is correct.
// ---------------------------------------------------------------------------

type InatMatch = {
  name: string
  commonName?: string
  photo?: string
  wikipediaUrl?: string
}

type WikiSummary = {
  title: string
  extract: string
  thumbnail?: string
}

type ConfirmResponse = {
  inaturalist: InatMatch[]
  wikipedia?: WikiSummary
}

function IdConfirmStrip({ name }: { name: string }) {
  const { fetchWithWorkspace } = useWorkspace()
  const [data, setData] = useState<ConfirmResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!name.trim()) {
      setData(null)
      return
    }
    setLoading(true)
    setData(null)
    fetchWithWorkspace(
      `/api/plants/identify-confirm?name=${encodeURIComponent(name)}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((body: ConfirmResponse | null) => {
        if (!cancelled) setData(body)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [name, fetchWithWorkspace])

  const photos = (data?.inaturalist ?? []).filter((m) => m.photo).slice(0, 6)
  const wiki = data?.wikipedia
  const wikiUrl = wiki
    ? `https://en.wikipedia.org/wiki/${encodeURIComponent(wiki.title.replace(/ /g, '_'))}`
    : undefined

  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <Spinner className="size-3.5" />
        Loading reference photos…
      </div>
    )
  }

  if (photos.length === 0 && !wiki) return null

  return (
    <div className="space-y-3">
      {photos.length > 0 && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium">
            Looks right? Hover to zoom in
          </p>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((m, i) => (
              <ZoomableImage
                key={i}
                src={m.photo!}
                alt={m.commonName ?? m.name}
                zoomScale={2.6}
                className="bg-muted aspect-square w-full rounded-lg"
                imageClassName="size-full rounded-lg object-cover"
              />
            ))}
          </div>
        </div>
      )}

      {wiki && (
        <div className="space-y-1.5">
          <p className="text-muted-foreground line-clamp-3 text-xs leading-relaxed">
            {wiki.extract}
          </p>
          {wikiUrl && (
            <button
              type="button"
              onClick={() =>
                sendToMoldable({ type: 'moldable:open-url', url: wikiUrl })
              }
              className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1 text-xs"
            >
              <ExternalLink className="size-3" />
              Open in browser
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hero image with graceful no-image / broken-image fallback.
// ---------------------------------------------------------------------------

function HeroImage({ url, alt }: { url: string | undefined; alt: string }) {
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    setBroken(false)
  }, [url])

  if (!url || broken) {
    return (
      <div className="bg-muted text-muted-foreground flex aspect-[4/3] w-full items-center justify-center rounded-2xl">
        {url && broken ? (
          <ImageOff className="size-8 opacity-50" />
        ) : (
          <Sprout className="size-9 opacity-50" />
        )}
      </div>
    )
  }

  return (
    <div className="bg-muted aspect-[4/3] w-full overflow-hidden rounded-2xl">
      <img
        src={url}
        alt={alt}
        className="size-full object-cover"
        onError={() => setBroken(true)}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// A quiet labelled inline field (room / location).
// ---------------------------------------------------------------------------

function QuickField({
  label,
  value,
  placeholder,
  onCommit,
}: {
  label: string
  value: string
  placeholder: string
  onCommit: (next: string) => void
}) {
  const [local, setLocal] = useState(value)
  useEffect(() => setLocal(value), [value])
  return (
    <label className="block space-y-1">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <Input
        value={local}
        placeholder={placeholder}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          if (local !== value) onCommit(local)
        }}
        className="h-8 text-sm"
      />
    </label>
  )
}

// ---------------------------------------------------------------------------
// Plant detail — two-pane (left: identity + notes, right: care + ID confirm).
// ---------------------------------------------------------------------------

export function PlantDetail(props: {
  plant: Plant
  mediaUrl: (path?: string) => string | undefined
  onBack: () => void
  onPatch: (patch: Partial<Plant>) => void
  onWater: () => void
  onGenerateCare: () => void
  regenerating: boolean
  onFavorite: (next: boolean) => void
  onDelete: () => void
}) {
  const {
    plant,
    mediaUrl,
    onBack,
    onPatch,
    onWater,
    onGenerateCare,
    regenerating,
    onFavorite,
    onDelete,
  } = props

  const [confirmDelete, setConfirmDelete] = useState(false)

  // Local mirrors for debounced text fields (name, scientific name).
  const [name, setName] = useState(plant.commonName)
  const [sci, setSci] = useState(plant.scientificName ?? '')
  const [notes, setNotes] = useState(plant.notes ?? '')
  const [saved, setSaved] = useState(false)

  // Re-sync local state when the selected plant changes.
  useEffect(() => {
    setName(plant.commonName)
    setSci(plant.scientificName ?? '')
    setNotes(plant.notes ?? '')
  }, [plant.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced notes save with a quiet "Saved" flash.
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashSaved = useCallback(() => {
    setSaved(true)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSaved(false), 1500)
  }, [])

  const onNotesChange = useCallback(
    (next: string) => {
      setNotes(next)
      if (notesTimer.current) clearTimeout(notesTimer.current)
      notesTimer.current = setTimeout(() => {
        onPatch({ notes: next })
        flashSaved()
      }, 600)
    },
    [onPatch, flashSaved],
  )

  useEffect(() => {
    return () => {
      if (notesTimer.current) clearTimeout(notesTimer.current)
      if (savedTimer.current) clearTimeout(savedTimer.current)
    }
  }, [])

  const heroUrl = mediaUrl(plant.heroImageUrl)
  const confirmName = (plant.scientificName ?? plant.commonName ?? '').trim()

  // -------------------------- Left identity pane --------------------------
  const leftPane = (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="space-y-6 p-5 pb-[calc(var(--chat-safe-padding,0px)+6rem)]">
        <HeroImage url={heroUrl} alt={plant.commonName} />

        {/* Editable identity */}
        <div className="space-y-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              const next = name.trim()
              if (next && next !== plant.commonName)
                onPatch({ commonName: next })
              else if (!next) setName(plant.commonName)
            }}
            placeholder="Common name"
            className="h-11 border-transparent bg-transparent px-0 text-xl font-semibold tracking-tight shadow-none focus-visible:ring-0"
          />
          <Input
            value={sci}
            onChange={(e) => setSci(e.target.value)}
            onBlur={() => {
              const next = sci.trim()
              if (next !== (plant.scientificName ?? ''))
                onPatch({ scientificName: next || undefined })
            }}
            placeholder="Scientific name"
            className="text-muted-foreground h-8 border-transparent bg-transparent px-0 text-sm italic shadow-none focus-visible:ring-0"
          />
        </div>

        {/* Location quick fields */}
        <div className="grid grid-cols-2 gap-3">
          <QuickField
            label="Room"
            value={plant.room ?? ''}
            placeholder="Living room"
            onCommit={(v) => onPatch({ room: v.trim() || undefined })}
          />
          <QuickField
            label="Spot"
            value={plant.location ?? ''}
            placeholder="South window"
            onCommit={(v) => onPatch({ location: v.trim() || undefined })}
          />
        </div>

        <Separator />

        {/* User notes (Markdown) */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground text-xs font-medium">
              Notes
            </span>
            <span
              className={cn(
                'text-muted-foreground text-xs transition-opacity',
                saved ? 'opacity-100' : 'opacity-0',
              )}
            >
              Saved
            </span>
          </div>
          <div className="border-input focus-within:ring-ring overflow-hidden rounded-xl border focus-within:ring-2">
            <MarkdownEditor
              value={notes}
              onChange={onNotesChange}
              placeholder="Where it lives, anything else…"
              minHeight="140px"
              className="px-3 py-2 text-sm"
              hideMarkdownHint
            />
          </div>
        </div>
      </div>
    </div>
  )

  // -------------------------- Right care pane --------------------------
  const rightPane = (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="space-y-6 p-5 pb-[calc(var(--chat-safe-padding,0px)+6rem)]">
        <CarePanel
          plant={plant}
          onRegenerate={onGenerateCare}
          regenerating={regenerating}
        />

        {confirmName && (
          <>
            <Separator />
            <IdConfirmStrip name={confirmName} />
          </>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Top bar: back, water, favorite, overflow */}
      <div className="border-border flex shrink-0 items-center gap-2 border-b px-4 py-2.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground -ml-1 cursor-pointer"
        >
          <ArrowLeft className="mr-1.5 size-4" />
          Back
        </Button>

        <div className="min-w-0 flex-1 truncate text-center text-sm font-medium">
          {plant.commonName}
        </div>

        <WaterButton plant={plant} onWater={onWater} size="sm" />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onFavorite(!plant.isFavorite)}
          aria-label={
            plant.isFavorite ? 'Remove from favorites' : 'Add to favorites'
          }
          className="cursor-pointer"
        >
          <Star
            className={cn(
              'size-4',
              plant.isFavorite
                ? 'fill-primary text-primary'
                : 'text-muted-foreground',
            )}
          />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="More actions"
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <MoreVertical className="size-4" />
            </Button>
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

      {/* Two-pane body — stable flex split (each pane scrolls independently) */}
      <div className="flex min-h-0 flex-1">
        <div className="border-border flex min-h-0 basis-[55%] flex-col border-r">
          {leftPane}
        </div>
        <div className="flex min-h-0 basis-[45%] flex-col">{rightPane}</div>
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
    </div>
  )
}
