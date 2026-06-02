'use client'

import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Heart,
  Inbox,
  LayoutGrid,
  MapPin,
  Plus,
  Search,
  Sprout,
  X,
} from 'lucide-react'
import {
  type DragEvent,
  type JSX,
  type ReactNode,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Button,
  Input,
  cn,
  isInMoldable,
  popMoldableNavigation,
  pushMoldableNavigation,
  resetMoldableNavigation,
  sendToMoldable,
  useMoldableCommands,
  useMoldableNavigationPop,
  useWorkspace,
} from '@moldable-ai/ui'
import type { MediaResult, Plant } from '../lib/types'
import { dueState } from '../lib/types'
import { AddPlant } from './components/add-plant'
import { AlertsHeader } from './components/alerts-header'
import { EmptyState } from './components/empty-state'
import { FolderCard } from './components/folder-card'
import { PlantDetail } from './components/plant-detail'
import { PlantGallery } from './components/plant-gallery'
import { usePlantMedia } from './use-plant-media'
import {
  type PlantCreateInput,
  resolveMediaUrl,
  useAddPlantPhoto,
  useCreatePlant,
  useDeletePlant,
  useFavoritePlant,
  useGenerateCare,
  useIdentifyPlantFromImage,
  usePlants,
  useUpdatePlant,
  useWaterPlant,
} from './use-plants'

// A folder is the home unit of navigation. `null` = the folder grid (home).
type FolderKey =
  | { kind: 'all' }
  | { kind: 'favorites' }
  | { kind: 'needswater' }
  | { kind: 'unplaced' }
  | { kind: 'room'; room: string }

// Plants that need water now or soon — used for badges and the Today route.
function isDue(p: Plant): boolean {
  const s = dueState(p)
  return s === 'overdue' || s === 'today' || s === 'soon'
}

// Plants that genuinely need water right now — drives the alert bar and
// "Water all". Excludes "soon" so we never push the user to water early.
function needsWaterNow(p: Plant): boolean {
  const s = dueState(p)
  return s === 'overdue' || s === 'today'
}

function folderKeyId(folder: FolderKey): string {
  return folder.kind === 'room' ? `room:${folder.room}` : folder.kind
}

function folderTitle(folder: FolderKey): string {
  switch (folder.kind) {
    case 'all':
      return 'All plants'
    case 'favorites':
      return 'Favorites'
    case 'needswater':
      return 'Needs water'
    case 'unplaced':
      return 'Unplaced'
    case 'room':
      return folder.room
  }
}

function emptyVariant(
  folder: FolderKey,
): 'all' | 'room' | 'favorites' | 'today' {
  switch (folder.kind) {
    case 'room':
      return 'room'
    case 'favorites':
      return 'favorites'
    case 'needswater':
      return 'today'
    default:
      return 'all'
  }
}

type MoldableFileDropMessage =
  | {
      type: 'moldable:file-drag-over'
      paths?: string[]
      position?: { x: number; y: number }
    }
  | { type: 'moldable:file-drag-leave' }
  | {
      type: 'moldable:file-drop'
      paths?: string[]
      position?: { x: number; y: number }
    }

function isImagePath(path: string): boolean {
  return /\.(png|jpe?g|gif|webp)$/i.test(path)
}

function isSupportedImageFile(file: File): boolean {
  if (isImagePath(file.name)) return true
  return ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(
    file.type,
  )
}

function imagePathsFromList(paths: string[]): string[] {
  return paths.filter(isImagePath)
}

function fileUrlToPath(value: string): string {
  if (!value.startsWith('file://')) return value
  const encoded = value.replace(/^file:\/\//, '')
  try {
    return decodeURIComponent(encoded)
  } catch {
    return encoded
  }
}

function folderSubtitle(plants: Plant[]): string {
  const n = plants.length
  const due = plants.filter(needsWaterNow).length
  const base = `${n} plant${n === 1 ? '' : 's'}`
  return due > 0 ? `${base} · ${due} need water` : base
}

// ---------------------------------------------------------------------------
// Chat context: both the Add-plant dialog and gallery drops identify plants
// in-app via the vision endpoint (no chat handoff). We still give the desktop
// chat context about the selected plant so the assistant can help and diagnose.
// ---------------------------------------------------------------------------

function buildChatInstructions(selected: Plant | null): string {
  const lines = [
    'You are assisting inside the Plants app, which helps the user keep house plants alive.',
    'To add a plant from a photo, call the Plants RPC plants.identifyAndCreate with',
    '{ commonName, scientificName?, confidence?, candidates?, heroImagePath?, room?, location? }.',
    'To create without identification, use plants.create. Other methods: plants.list,',
    'plants.get, plants.update, plants.water, plants.generateCare, plants.favorite, plants.delete.',
  ]
  if (selected) {
    const sci = selected.scientificName ? ` (${selected.scientificName})` : ''
    const where = [selected.room, selected.location].filter(Boolean).join(', ')
    lines.push(
      `The user is currently viewing "${selected.commonName}"${sci}${where ? ` in ${where}` : ''} (id: ${selected.id}).`,
    )
  }
  return lines.join(' ')
}

// ---------------------------------------------------------------------------

export default function PlantsPage(): JSX.Element {
  const queryClient = useQueryClient()
  const { workspaceId } = useWorkspace()

  const plantsQuery = usePlants()
  const createPlant = useCreatePlant()
  const updatePlant = useUpdatePlant()
  const waterPlant = useWaterPlant()
  const generateCare = useGenerateCare()
  const identifyPlantFromImage = useIdentifyPlantFromImage()
  const favoritePlant = useFavoritePlant()
  const deletePlant = useDeletePlant()
  const addPhoto = useAddPlantPhoto()
  const { uploadFile, importPaths, uploading } = usePlantMedia()

  const [folder, setFolder] = useState<FolderKey | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [addOpen, setAddOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [dropError, setDropError] = useState<string | null>(null)

  const mediaUrl = useCallback(
    (path?: string) => resolveMediaUrl(workspaceId, path),
    [workspaceId],
  )

  // --- Live updates: chat mutations post `moldable:app-api-changed`; refetch. ---
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'moldable:app-api-changed') return
      void queryClient.invalidateQueries({ queryKey: ['plants', workspaceId] })
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [queryClient, workspaceId])

  useEffect(() => {
    resetMoldableNavigation()
  }, [])

  // --- Derived data ---
  const livePlants = useMemo(
    () => (plantsQuery.data ?? []).filter((p) => !p.isDeleted),
    [plantsQuery.data],
  )

  const dueCount = useMemo(() => livePlants.filter(isDue).length, [livePlants])
  const waterNow = useMemo(() => livePlants.filter(needsWaterNow), [livePlants])
  const overdueCount = useMemo(
    () => livePlants.filter((p) => dueState(p) === 'overdue').length,
    [livePlants],
  )
  const favorites = useMemo(
    () => livePlants.filter((p) => p.isFavorite),
    [livePlants],
  )
  const unplaced = useMemo(
    () => livePlants.filter((p) => !p.room?.trim()),
    [livePlants],
  )
  const rooms = useMemo(() => {
    const map = new Map<string, Plant[]>()
    for (const p of livePlants) {
      const room = p.room?.trim()
      if (!room) continue
      const arr = map.get(room)
      if (arr) arr.push(p)
      else map.set(room, [p])
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([room, plants]) => ({ room, plants }))
  }, [livePlants])

  // Folder tiles shown on the home view.
  const homeFolders = useMemo(() => {
    const list: {
      key: FolderKey
      title: string
      subtitle: string
      icon: ReactNode
      plants: Plant[]
    }[] = []
    if (livePlants.length > 0) {
      list.push({
        key: { kind: 'all' },
        title: 'All plants',
        subtitle: folderSubtitle(livePlants),
        icon: <LayoutGrid />,
        plants: livePlants,
      })
    }
    if (favorites.length > 0) {
      list.push({
        key: { kind: 'favorites' },
        title: 'Favorites',
        subtitle: folderSubtitle(favorites),
        icon: <Heart />,
        plants: favorites,
      })
    }
    for (const { room, plants } of rooms) {
      list.push({
        key: { kind: 'room', room },
        title: room,
        subtitle: folderSubtitle(plants),
        icon: <MapPin />,
        plants,
      })
    }
    if (unplaced.length > 0) {
      list.push({
        key: { kind: 'unplaced' },
        title: 'Unplaced',
        subtitle: folderSubtitle(unplaced),
        icon: <Inbox />,
        plants: unplaced,
      })
    }
    return list
  }, [livePlants, favorites, rooms, unplaced])

  const matchesQuery = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()
    return (p: Plant) => {
      if (!q) return true
      return [
        p.commonName,
        p.scientificName,
        p.nickname,
        p.room,
        p.location,
        p.family,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    }
  }, [deferredSearch])

  const hasQuery = deferredSearch.trim().length > 0

  // Plants for the currently open folder (ignored while searching).
  const openPlants = useMemo(() => {
    if (!folder) return []
    switch (folder.kind) {
      case 'all':
        return livePlants
      case 'favorites':
        return favorites
      case 'needswater':
        return waterNow
      case 'unplaced':
        return unplaced
      case 'room':
        return livePlants.filter((p) => p.room?.trim() === folder.room)
    }
  }, [folder, livePlants, favorites, waterNow, unplaced])

  const searchResults = useMemo(
    () => (hasQuery ? livePlants.filter(matchesQuery) : []),
    [hasQuery, livePlants, matchesQuery],
  )

  const selectedPlant = useMemo(
    () =>
      selectedId ? (livePlants.find((p) => p.id === selectedId) ?? null) : null,
    [selectedId, livePlants],
  )

  // If the selected plant disappears (deleted elsewhere), drop back to the
  // gallery and keep the desktop nav stack in sync.
  useEffect(() => {
    if (selectedId && !livePlants.some((p) => p.id === selectedId)) {
      popMoldableNavigation()
      setSelectedId(null)
    }
  }, [selectedId, livePlants])

  // --- Chat context: refresh instructions as the selection changes. ---
  useEffect(() => {
    if (!isInMoldable()) return
    sendToMoldable({
      type: 'moldable:set-chat-instructions',
      text: buildChatInstructions(selectedPlant),
    })
    return () => {
      sendToMoldable({ type: 'moldable:set-chat-instructions', text: '' })
    }
  }, [selectedPlant])

  // --- Mutations wired for the detail pane ---
  const patchTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const pendingPatches = useRef(new Map<string, Partial<Plant>>())

  const handlePatch = useCallback(
    (id: string, patch: Partial<Plant>) => {
      const timers = patchTimers.current
      const pending = pendingPatches.current
      const existing = timers.get(id)
      if (existing) clearTimeout(existing)
      pending.set(id, { ...(pending.get(id) ?? {}), ...patch })
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id)
          const merged = pending.get(id)
          pending.delete(id)
          if (!merged) return
          void updatePlant.mutateAsync({ id, ...merged }).catch(() => undefined)
        }, 500),
      )
    },
    [updatePlant],
  )

  useEffect(() => {
    const timers = patchTimers.current
    const pending = pendingPatches.current
    return () => {
      for (const t of timers.values()) clearTimeout(t)
      timers.clear()
      pending.clear()
    }
  }, [])

  const handleWater = useCallback(
    (id: string) => {
      void waterPlant.mutateAsync({ id }).catch(() => undefined)
    },
    [waterPlant],
  )

  // "Still moist" skip — push the next reminder without logging a watering.
  const handleSnooze = useCallback(
    (id: string, untilISO: string) => {
      void updatePlant
        .mutateAsync({ id, snoozeUntil: untilISO })
        .catch(() => undefined)
    },
    [updatePlant],
  )

  // Growth journal: upload a photo then append it (it becomes the new hero).
  const handleAddPhoto = useCallback(
    async (id: string, file: File) => {
      setDropError(null)
      try {
        const media = await uploadFile(file)
        await addPhoto.mutateAsync({ id, path: media.path })
      } catch (error) {
        setDropError(
          error instanceof Error ? error.message : "Couldn't add that photo.",
        )
      }
    },
    [addPhoto, uploadFile],
  )

  const handleSetHero = useCallback(
    (id: string, path: string) => {
      void updatePlant
        .mutateAsync({ id, heroImageUrl: path })
        .catch(() => undefined)
    },
    [updatePlant],
  )

  const waterAllNow = useCallback(() => {
    for (const p of waterNow) handleWater(p.id)
  }, [waterNow, handleWater])

  const handleToggleFavorite = useCallback(
    (p: Plant) => {
      void favoritePlant
        .mutateAsync({ id: p.id, isFavorite: !p.isFavorite })
        .catch(() => undefined)
    },
    [favoritePlant],
  )

  const handleGenerateCare = useCallback(
    (id: string) => {
      void generateCare.mutateAsync(id).catch(() => undefined)
    },
    [generateCare],
  )

  const handleFavorite = useCallback(
    (id: string, isFavorite: boolean) => {
      void favoritePlant.mutateAsync({ id, isFavorite }).catch(() => undefined)
    },
    [favoritePlant],
  )

  const handleDelete = useCallback(
    (id: string) => {
      popMoldableNavigation()
      setSelectedId(null)
      void deletePlant.mutateAsync(id).catch(() => undefined)
    },
    [deletePlant],
  )

  // --- Add-plant helpers passed into the dialog ---
  const createManual = useCallback(
    async (input: {
      commonName: string
      scientificName?: string
      room?: string
      heroImagePath?: string
    }) => {
      const body: PlantCreateInput = {
        commonName: input.commonName,
        scientificName: input.scientificName,
        room: input.room,
        heroImagePath: input.heroImagePath,
        identification: { source: 'manual' },
      }
      const created = await createPlant.mutateAsync(body)
      pushMoldableNavigation({
        id: `plant:${created.id}`,
        title: created.commonName || 'Plant',
      })
      setSelectedId(created.id)
    },
    [createPlant],
  )

  // --- Window-level drag & drop (image files + Finder paths) ---
  const dragDepth = useRef(0)

  const createFromMedia = useCallback(
    async (media: MediaResult) => {
      return identifyPlantFromImage.mutateAsync({
        heroImagePath: media.path,
        imagePath: media.absPath,
        room: folder?.kind === 'room' ? folder.room : undefined,
      })
    },
    [folder, identifyPlantFromImage],
  )

  const createFromMediaList = useCallback(
    async (mediaList: MediaResult[]) => {
      if (mediaList.length === 0) return
      setDropError(null)
      const errors: string[] = []
      let lastCreated: Plant | null = null
      for (const media of mediaList) {
        try {
          lastCreated = await createFromMedia(media)
        } catch (error) {
          errors.push(
            error instanceof Error
              ? error.message
              : "Couldn't create a plant from that image.",
          )
        }
      }
      if (lastCreated) {
        pushMoldableNavigation({
          id: `plant:${lastCreated.id}`,
          title: lastCreated.commonName || 'Plant',
        })
        setSelectedId(lastCreated.id)
      }
      if (errors.length > 0) {
        setDropError(
          mediaList.length === errors.length
            ? errors[0]!
            : `Created ${mediaList.length - errors.length} of ${mediaList.length} plants. ${errors[0]!}`,
        )
      }
    },
    [createFromMedia],
  )

  const handleDroppedImages = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return
      try {
        const mediaList: MediaResult[] = []
        for (const file of files) {
          mediaList.push(await uploadFile(file))
        }
        await createFromMediaList(mediaList)
      } catch (error) {
        setDropError(
          error instanceof Error
            ? error.message
            : "Couldn't import those images.",
        )
      }
    },
    [createFromMediaList, uploadFile],
  )

  const handleDroppedPaths = useCallback(
    async (paths: string[]) => {
      if (paths.length === 0) return
      try {
        const results = await importPaths(paths)
        await createFromMediaList(results)
      } catch (error) {
        setDropError(
          error instanceof Error
            ? error.message
            : "Couldn't import those images.",
        )
      }
    },
    [createFromMediaList, importPaths],
  )

  const onWindowDrop = useCallback(
    (event: DragEvent) => {
      if (addOpen) return // the Add-plant dialog owns its own drop zone
      event.preventDefault()
      dragDepth.current = 0
      setDragging(false)

      const files = Array.from(event.dataTransfer.files ?? []).filter((f) =>
        isSupportedImageFile(f),
      )
      if (files.length > 0) {
        void handleDroppedImages(files)
        return
      }
      if ((event.dataTransfer.files?.length ?? 0) > 0) {
        setDropError('Use PNG, JPEG, WebP, or GIF plant photos.')
        return
      }

      const uriList = event.dataTransfer.getData('text/uri-list')
      const plain = event.dataTransfer.getData('text/plain')
      const raw = uriList || plain
      const paths = raw
        .split(/[\r\n]+/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map(fileUrlToPath)
        .filter(isImagePath)
      if (paths.length > 0) void handleDroppedPaths(paths)
      else if (raw.trim())
        setDropError('Use PNG, JPEG, WebP, or GIF plant photos.')
    },
    [handleDroppedImages, handleDroppedPaths, addOpen],
  )

  function hasDropPayload(event: DragEvent): boolean {
    const types = Array.from(event.dataTransfer.types)
    return (
      types.includes('Files') ||
      types.includes('text/uri-list') ||
      types.includes('text/plain')
    )
  }

  useEffect(() => {
    const handleMessage = (event: MessageEvent<MoldableFileDropMessage>) => {
      const data = event.data
      if (!data || typeof data !== 'object') return

      // The Add-plant dialog owns drag & drop while it's open; stay out of its way.
      if (addOpen) {
        dragDepth.current = 0
        setDragging(false)
        return
      }

      if (data.type === 'moldable:file-drag-over') {
        setDragging(true)
        return
      }

      if (data.type === 'moldable:file-drag-leave') {
        dragDepth.current = 0
        setDragging(false)
        return
      }

      if (data.type !== 'moldable:file-drop') return

      dragDepth.current = 0
      setDragging(false)
      const paths = imagePathsFromList(data.paths ?? [])
      if (paths.length > 0) void handleDroppedPaths(paths)
      else if ((data.paths ?? []).length > 0) {
        setDropError('Use PNG, JPEG, WebP, or GIF plant photos.')
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleDroppedPaths, addOpen])

  // While the Add-plant dialog is open it owns drag & drop — clear any
  // window-level drag overlay so it can't hijack drops meant for the dialog.
  useEffect(() => {
    if (!addOpen) return
    dragDepth.current = 0
    setDragging(false)
  }, [addOpen])

  // --- Navigation helpers ---
  const openFolder = useCallback((key: FolderKey) => {
    setFolder(key)
    setSelectedId(null)
  }, [])

  const goHome = useCallback(() => {
    setFolder(null)
    setSelectedId(null)
  }, [])

  // Opening a plant pushes a desktop nav entry so the host's back button (and
  // our hero back chip) both return to the gallery. Close paths pop it to keep
  // the desktop header in sync.
  const openPlant = useCallback((p: Plant) => {
    pushMoldableNavigation({
      id: `plant:${p.id}`,
      title: p.commonName || 'Plant',
    })
    setSelectedId(p.id)
  }, [])

  const closePlant = useCallback(() => {
    popMoldableNavigation()
    setSelectedId(null)
  }, [])

  // Desktop header back button — it has already popped its own stack.
  useMoldableNavigationPop(() => {
    setSelectedId((cur) => (cur ? null : cur))
  })

  // --- Desktop command-menu handlers (Cmd+K). Safe no-op if not in Moldable. ---
  useMoldableCommands({
    'add-plant': () => setAddOpen(true),
    add: () => setAddOpen(true),
    'water-due': () => {
      for (const p of livePlants.filter(isDue)) handleWater(p.id)
    },
    search: () => {
      goHome()
      const el = document.getElementById(
        'plants-search',
      ) as HTMLInputElement | null
      el?.focus()
    },
    refresh: () => {
      void queryClient.invalidateQueries({ queryKey: ['plants', workspaceId] })
    },
  })

  // --- Render ---
  const showDetail = selectedPlant !== null
  const showAlert =
    !hasQuery && folder?.kind !== 'needswater' && waterNow.length > 0
  const dropPending = uploading || identifyPlantFromImage.isPending

  return (
    <main
      className="bg-background text-foreground flex h-full min-h-0 overflow-hidden"
      onDragEnter={(e) => {
        if (addOpen) return
        if (!hasDropPayload(e)) return
        e.preventDefault()
        dragDepth.current += 1
        setDragging(true)
      }}
      onDragOver={(e) => {
        if (addOpen) return
        if (!hasDropPayload(e)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
      }}
      onDragLeave={(e) => {
        if (addOpen) return
        if (!hasDropPayload(e)) return
        e.preventDefault()
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) setDragging(false)
      }}
      onDrop={onWindowDrop}
    >
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
        {showDetail ? (
          <div key={selectedPlant.id} className="flex min-h-0 flex-1 flex-col">
            <PlantDetail
              plant={selectedPlant}
              mediaUrl={mediaUrl}
              onBack={closePlant}
              onPatch={(patch) => handlePatch(selectedPlant.id, patch)}
              onWater={() => handleWater(selectedPlant.id)}
              onSnooze={(until) => handleSnooze(selectedPlant.id, until)}
              onGenerateCare={() => handleGenerateCare(selectedPlant.id)}
              regenerating={
                generateCare.isPending &&
                generateCare.variables === selectedPlant.id
              }
              onFavorite={(next) => handleFavorite(selectedPlant.id, next)}
              onDelete={() => handleDelete(selectedPlant.id)}
              onAddPhoto={(file) => handleAddPhoto(selectedPlant.id, file)}
              onSetHero={(path) => handleSetHero(selectedPlant.id, path)}
              addingPhoto={uploading || addPhoto.isPending}
            />
          </div>
        ) : (
          <>
            {/* Top rail: back + scope title, then search + add */}
            <div className="flex shrink-0 items-center gap-2 px-4 pb-1.5 pt-3">
              <div className="flex min-w-0 flex-1 items-center">
                {folder && !hasQuery && (
                  <button
                    type="button"
                    onClick={goHome}
                    className="text-foreground hover:text-foreground -ml-1.5 flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-sm font-semibold"
                  >
                    <ArrowLeft className="text-muted-foreground size-4 shrink-0" />
                    <span className="truncate">{folderTitle(folder)}</span>
                    <span className="text-muted-foreground shrink-0 font-normal tabular-nums">
                      {openPlants.length}
                    </span>
                  </button>
                )}
              </div>

              <div className="relative ml-1 hidden w-44 shrink-0 sm:block">
                <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  id="plants-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search"
                  className="bg-muted/60 h-9 rounded-full border-0 pl-8 pr-8"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                    className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              <Button
                size="icon"
                onClick={() => setAddOpen(true)}
                aria-label="Add plant"
                className="size-9 shrink-0 cursor-pointer rounded-full"
              >
                <Plus className="size-4" />
              </Button>
            </div>

            {/* Watering alert bar */}
            {showAlert && (
              <AlertsHeader
                count={waterNow.length}
                overdueCount={overdueCount}
                onWaterAll={waterAllNow}
                onReview={() => openFolder({ kind: 'needswater' })}
              />
            )}

            {/* Surface: search results · folder grid (home) · plant gallery */}
            {hasQuery ? (
              searchResults.length > 0 ? (
                <PlantGallery
                  key="search"
                  plants={searchResults}
                  mediaUrl={mediaUrl}
                  onOpen={openPlant}
                  onWater={(p) => handleWater(p.id)}
                  onToggleFavorite={handleToggleFavorite}
                  emptyAction={() => setAddOpen(true)}
                />
              ) : (
                <NoMatches query={deferredSearch.trim()} />
              )
            ) : folder ? (
              openPlants.length > 0 ? (
                <PlantGallery
                  key={folderKeyId(folder)}
                  plants={openPlants}
                  mediaUrl={mediaUrl}
                  onOpen={openPlant}
                  onWater={(p) => handleWater(p.id)}
                  onToggleFavorite={handleToggleFavorite}
                  emptyAction={() => setAddOpen(true)}
                />
              ) : (
                <CenteredEmpty>
                  <EmptyState
                    onAdd={() => setAddOpen(true)}
                    variant={emptyVariant(folder)}
                  />
                </CenteredEmpty>
              )
            ) : homeFolders.length > 0 ? (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div
                  className="grid gap-3 px-4 pb-[calc(var(--chat-safe-padding,0px)+6rem)] pt-1"
                  style={{
                    gridTemplateColumns:
                      'repeat(auto-fill, minmax(200px, 1fr))',
                  }}
                >
                  {homeFolders.map((f, i) => (
                    <FolderCard
                      key={folderKeyId(f.key)}
                      index={i}
                      title={f.title}
                      subtitle={f.subtitle}
                      icon={f.icon}
                      plants={f.plants}
                      mediaUrl={mediaUrl}
                      onOpen={() => openFolder(f.key)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <CenteredEmpty>
                <EmptyState onAdd={() => setAddOpen(true)} variant="all" />
              </CenteredEmpty>
            )}
          </>
        )}
      </div>

      {/* Window drop overlay */}
      {(dragging || dropPending) && (
        <div className="bg-background/80 pointer-events-none fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="border-primary bg-card flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-10 py-12 text-center shadow-lg">
            <div className="bg-primary/10 flex size-14 items-center justify-center rounded-2xl">
              <Sprout
                className={cn(
                  'text-primary size-7',
                  dropPending && 'animate-pulse',
                )}
              />
            </div>
            <div className="space-y-1">
              <p className="text-foreground text-base font-medium">
                {dropPending ? 'Creating plant' : 'Drop plant photos'}
              </p>
              <p className="text-muted-foreground text-sm">
                {dropPending
                  ? 'Identifying the photo and generating care.'
                  : "We'll identify and add them here."}
              </p>
            </div>
          </div>
        </div>
      )}

      {dropError && !dropPending && (
        <div className="pointer-events-none fixed bottom-[calc(var(--chat-safe-padding,0px)+1rem)] left-1/2 z-50 w-[min(28rem,calc(100%-2rem))] -translate-x-1/2">
          <div className="border-destructive/30 bg-background text-destructive rounded-lg border px-3 py-2 text-sm shadow-lg">
            {dropError}
          </div>
        </div>
      )}

      {/* Add plant dialog */}
      <AddPlant
        open={addOpen}
        onClose={() => setAddOpen(false)}
        uploadFile={uploadFile}
        createManual={createManual}
        importPaths={importPaths}
        onIdentifyPhoto={async (media) => {
          const plant = await createFromMedia(media)
          openPlant(plant)
        }}
      />
    </main>
  )
}

function CenteredEmpty({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex h-full items-center justify-center pb-[calc(var(--chat-safe-padding,0px)+6rem)]">
        {children}
      </div>
    </div>
  )
}

function NoMatches({ query }: { query: string }): JSX.Element {
  return (
    <CenteredEmpty>
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <div className="bg-muted flex size-14 items-center justify-center rounded-2xl">
          <Sprout className="text-muted-foreground size-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-foreground text-base font-medium">No matches</h2>
          <p className="text-muted-foreground max-w-xs text-sm">
            No plants match “{query}”.
          </p>
        </div>
      </div>
    </CenteredEmpty>
  )
}
