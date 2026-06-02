import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  Eraser,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  PanelTop,
  Plus,
  RotateCcw,
  Shuffle,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent, ReactNode } from 'react'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
  downloadFile,
  popMoldableNavigation,
  pushMoldableNavigation,
  resetMoldableNavigation,
  useMoldableNavigationPop,
  useWorkspace,
} from '@moldable-ai/ui'
import { ZoomableImage } from './components/zoomable-image'

type AspectRatioId =
  | 'square'
  | 'portrait'
  | 'story'
  | 'landscape'
  | 'widescreen'

type AspectRatio = {
  id: AspectRatioId
  label: string
  ratio: string
}

type ImageQuality = 'low' | 'medium' | 'high' | 'auto'

type ImageIteration = {
  id: string
  prompt: string
  kind: 'generation' | 'edit' | 'upload' | 'background-removal'
  aspectRatio: AspectRatioId
  size: string
  quality: ImageQuality
  mimeType: string
  model?: string
  parentIterationId?: string
  width?: number
  height?: number
  originalName?: string
  imageUrl: string
  imagePath?: string
  createdAt: string
}

type PendingIteration = {
  id?: string
  kind: 'generation' | 'edit'
  prompt: string
  aspectRatio: AspectRatioId
  quality: ImageQuality
  baseIterationId?: string
  requestId?: string
  startedAt: string
}

type ImageThread = {
  id: string
  title: string
  prompt: string
  aspectRatio: AspectRatioId
  quality?: ImageQuality
  status: 'generating' | 'ready' | 'failed'
  errorMessage?: string
  pendingIteration?: PendingIteration
  pendingIterations?: PendingIteration[]
  coverIterationId?: string
  createdAt: string
  updatedAt: string
  latestImageUrl: string | null
  iterations: ImageIteration[]
}

type ThumbnailItem =
  | {
      id: string
      type: 'image'
      imageUrl: string
      aspectRatio: AspectRatioId
      label: string
      iteration: ImageIteration
      children: ImageIteration[]
      selectedBranchIteration: ImageIteration
      isSelected: boolean
    }
  | {
      id: string
      type: 'pending'
      imageUrl: null
      aspectRatio: AspectRatioId
      label: string
      iteration: null
      children: ImageIteration[]
      selectedBranchIteration: null
      isSelected: boolean
    }

function HeaderTooltip({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{children}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

type RpcResponse<T> =
  | {
      ok: true
      result: T
    }
  | {
      ok: false
      error?: {
        message?: string
      }
    }

type DeleteIterationResult = {
  deleted: true
  deletedThread: boolean
  deletedIterationIds: string[]
  notFoundIterationIds: string[]
  thread?: ImageThread
}

type RemoveBgStatus = {
  available: boolean
}

const ASPECT_RATIOS: AspectRatio[] = [
  { id: 'square', label: 'Square', ratio: '1:1' },
  { id: 'portrait', label: 'Portrait', ratio: '3:4' },
  { id: 'story', label: 'Story', ratio: '9:16' },
  { id: 'landscape', label: 'Landscape', ratio: '4:3' },
  { id: 'widescreen', label: 'Widescreen', ratio: '16:9' },
]

const PENDING_ITERATION_ID = '__pending_iteration__'
const PENDING_ITERATION_ID_PREFIX = '__pending_iteration__:'

const ASPECT_PREVIEW_CLASS: Record<AspectRatioId, string> = {
  square: 'aspect-square',
  portrait: 'aspect-[3/4]',
  story: 'aspect-[9/16]',
  landscape: 'aspect-[4/3]',
  widescreen: 'aspect-[16/9]',
}

const MAIN_PENDING_WIDTH_CLASS: Record<AspectRatioId, string> = {
  square: 'max-w-2xl',
  portrait: 'max-w-xl',
  story: 'max-w-md',
  landscape: 'max-w-5xl',
  widescreen: 'max-w-6xl',
}

const THUMBNAIL_SIZE = 56
const THUMBNAIL_SELECTED_SCALE = 1.21429
const THUMBNAIL_SELECTED_SIZE = THUMBNAIL_SIZE * THUMBNAIL_SELECTED_SCALE
const THUMBNAIL_GAP = 8
const THUMBNAIL_RAIL_ITEM_LEFT = 11
const THUMBNAIL_RAIL_WIDTH = 84
const THUMBNAIL_FLYOUT_GAP = 12
const GALLERY_ALBUM_PREVIEW_LIMIT = 8
const GALLERY_ALBUM_PREVIEW_SIZE = 72
const GALLERY_ALBUM_PREVIEW_GAP = 8
const GALLERY_ALBUM_PREVIEW_MAX_COLUMNS = 3

function aspectLabel(id: AspectRatioId) {
  return ASPECT_RATIOS.find((ratio) => ratio.id === id) ?? ASPECT_RATIOS[0]
}

function sendToChatInput(text: string) {
  window.parent.postMessage({ type: 'moldable:set-chat-input', text }, '*')
}

function sendChatInstructions(text: string) {
  window.parent.postMessage(
    {
      type: 'moldable:set-chat-instructions',
      text,
    },
    '*',
  )
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()

  try {
    if (!document.execCommand('copy')) {
      throw new Error('Copy command was not available')
    }
  } finally {
    document.body.removeChild(textarea)
  }
}

async function parseResponse<T>(response: Response, fallback: string) {
  const json = (await response.json().catch(() => null)) as
    | T
    | { error?: string }
    | null
  if (!response.ok) {
    const message =
      json &&
      typeof json === 'object' &&
      'error' in json &&
      typeof json.error === 'string'
        ? json.error
        : fallback
    throw new Error(message)
  }
  return json as T
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }

  return btoa(binary)
}

function extensionFromMime(mimeType: string): string {
  switch (mimeType.toLowerCase()) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg'
    case 'image/webp':
      return 'webp'
    case 'image/gif':
      return 'gif'
    case 'image/svg+xml':
      return 'svg'
    default:
      return 'png'
  }
}

function hasSupportedImageExtension(name: string): boolean {
  return /\.(png|jpe?g|webp|gif|svg|heic|heif)$/i.test(name)
}

async function downloadImage(iteration: ImageIteration) {
  const response = await fetch(iteration.imageUrl)
  if (!response.ok) {
    throw new Error('Failed to read image for download')
  }

  const mimeType = response.headers.get('content-type') ?? iteration.mimeType
  await downloadFile({
    filename: `image-${iteration.id}.${extensionFromMime(mimeType)}`,
    data: arrayBufferToBase64(await response.arrayBuffer()),
    mimeType,
    isBase64: true,
  })
}

function GenerationLoadingPreview({
  aspectRatio = 'square',
  className,
  label = 'Making the first draft',
}: {
  aspectRatio?: AspectRatioId
  className?: string
  label?: string | null
}) {
  return (
    <div
      className={cn(
        'image-generation-loading relative overflow-hidden rounded-lg',
        ASPECT_PREVIEW_CLASS[aspectRatio],
        className,
      )}
      aria-label={label ?? 'Generating image'}
    >
      {label ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-4">
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
        </div>
      ) : null}
      <div className="image-generation-dots absolute inset-0" />
      <div className="image-generation-sheen absolute inset-0" />
    </div>
  )
}

function pendingIterationsForThread(
  thread: ImageThread | null,
): PendingIteration[] {
  if (!thread || thread.status !== 'generating') return []
  const pending = thread.pendingIterations ?? []
  return thread.pendingIteration
    ? [thread.pendingIteration, ...pending]
    : pending
}

function pendingIterationItemId(
  pending: PendingIteration,
  index: number,
): string {
  return pending.id || pending.requestId || `${index}`
}

function pendingThumbnailId(pending: PendingIteration, index: number): string {
  if (!pending.id && !pending.requestId && index === 0) {
    return PENDING_ITERATION_ID
  }
  return `${PENDING_ITERATION_ID_PREFIX}${pendingIterationItemId(pending, index)}`
}

function pendingIterationByThumbnailId(
  thread: ImageThread | null,
  id: string | null,
): PendingIteration | null {
  if (!thread || !id) return null
  const pending = pendingIterationsForThread(thread)
  const index =
    id === PENDING_ITERATION_ID
      ? 0
      : id.startsWith(PENDING_ITERATION_ID_PREFIX)
        ? pending.findIndex(
            (iteration, iterationIndex) =>
              pendingIterationItemId(iteration, iterationIndex) ===
              id.slice(PENDING_ITERATION_ID_PREFIX.length),
          )
        : -1
  return index >= 0 ? (pending[index] ?? null) : null
}

function isAspectRatioOnlyEdit(thread: ImageThread): boolean {
  return Boolean(
    thread.pendingIteration?.prompt.startsWith(
      'Regenerate this image with a ',
    ) && thread.pendingIteration.prompt.includes(' aspect ratio.'),
  )
}

function pendingMainLabel(
  thread: ImageThread,
  aspectRatio: AspectRatioId,
): string {
  return isAspectRatioOnlyEdit(thread)
    ? `Generating ${aspectLabel(aspectRatio).ratio} version`
    : 'Remixing image'
}

function selectedIterationIdForThread(thread: ImageThread): string | null {
  const pending = pendingIterationsForThread(thread)
  return pending.length > 0
    ? pendingThumbnailId(pending[pending.length - 1], pending.length - 1)
    : (thread.coverIterationId ?? thread.iterations.at(-1)?.id ?? null)
}

function selectableIterationIds(thread: ImageThread): string[] {
  const ids = thread.iterations.map((iteration) => iteration.id)
  pendingIterationsForThread(thread).forEach((pending, index) => {
    ids.push(pendingThumbnailId(pending, index))
  })
  return ids
}

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false

  return Boolean(
    target.isContentEditable ||
      target.closest(
        'input, textarea, select, [contenteditable="true"], [role="textbox"]',
      ),
  )
}

function upsertThread(threads: ImageThread[] | undefined, thread: ImageThread) {
  const current = threads ?? []
  return [thread, ...current.filter((candidate) => candidate.id !== thread.id)]
}

function latestIterationForAspectRatio(
  thread: ImageThread,
  aspectRatio: AspectRatioId,
): ImageIteration | null {
  for (let index = thread.iterations.length - 1; index >= 0; index -= 1) {
    const iteration = thread.iterations[index]
    if (iteration?.aspectRatio === aspectRatio) return iteration
  }
  return null
}

type ImportMode = 'group' | 'separate'

type MoldableFileDropMessage =
  | {
      type: 'moldable:file-drag-over'
      paths?: string[]
    }
  | {
      type: 'moldable:file-drag-leave'
    }
  | {
      type: 'moldable:file-drop'
      paths?: string[]
    }

function imageFilesFromList(fileList: FileList): File[] {
  return Array.from(fileList).filter(
    (file) =>
      file.type.startsWith('image/') || hasSupportedImageExtension(file.name),
  )
}

function imagePathsFromList(paths: string[]): string[] {
  return paths.filter(hasSupportedImageExtension)
}

function hasFileDrag(event: DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes('Files')
}

function childIterationsForThread(
  thread: ImageThread,
  parentIterationId: string,
): ImageIteration[] {
  const byParent = new Map<string, ImageIteration[]>()
  for (const iteration of thread.iterations) {
    if (!iteration.parentIterationId) continue
    const siblings = byParent.get(iteration.parentIterationId) ?? []
    siblings.push(iteration)
    byParent.set(iteration.parentIterationId, siblings)
  }

  const descendants: ImageIteration[] = []
  const visited = new Set<string>()
  const collect = (id: string) => {
    for (const child of byParent.get(id) ?? []) {
      if (visited.has(child.id)) continue
      visited.add(child.id)
      descendants.push(child)
      collect(child.id)
    }
  }

  collect(parentIterationId)
  return descendants
}

function rootIterationsForThread(thread: ImageThread): ImageIteration[] {
  const iterationIds = new Set(
    thread.iterations.map((iteration) => iteration.id),
  )
  return thread.iterations.filter(
    (iteration) =>
      !iteration.parentIterationId ||
      !iterationIds.has(iteration.parentIterationId),
  )
}

function containsIteration(
  iterations: ImageIteration[],
  iterationId: string | null,
) {
  return Boolean(
    iterationId && iterations.some((iteration) => iteration.id === iterationId),
  )
}

function StackCountBadge({
  count,
  compact = false,
}: {
  count: number
  compact?: boolean
}) {
  if (count <= 0) return null

  const label = count > 99 ? '+99' : `+${count}`

  return (
    <span
      className={cn(
        'border-border/65 bg-background/90 text-foreground pointer-events-none absolute z-20 flex items-center justify-center rounded-full border font-mono font-semibold shadow-sm backdrop-blur-sm',
        compact
          ? 'bottom-1 right-1 h-4 min-w-4 px-1 text-[9px] leading-none'
          : 'bottom-2 right-2 h-5 min-w-5 px-1.5 text-[11px] leading-none',
      )}
      aria-hidden="true"
    >
      {label}
    </span>
  )
}

function remixInstructionsForIteration(threadId: string, iterationId: string) {
  return `Images app is open to image thread ${threadId}, with image iteration ${iterationId} selected. Drive this app only through app RPC methods. When the user wants a new image based on this selected image, call images.generateFromReference with { id: "${threadId}", baseIterationId: "${iterationId}", prompt, aspectRatio? }; this adds a distinct new root image inside the current thread. When the user explicitly wants to edit/remix this image as a child of the selected image, call images.edit with { id: "${threadId}", baseIterationId: "${iterationId}", prompt, aspectRatio? }. To remove the selected image background, call images.removeBackground with { id: "${threadId}", iterationId: "${iterationId}" }. To delete this selected image, call images.deleteIteration with { id: "${threadId}", iterationId: ["${iterationId}"] }; include descendant iteration IDs from images.get only if the user asks to delete children too. To save a chat-generated image into this thread, call images.importGenerated with { id: "${threadId}", imagePath, prompt? }. To cancel stuck pending work, call images.cancel with { id: "${threadId}" }. To change the selected image ratio, call images.setAspectRatio with { id: "${threadId}", baseIterationId: "${iterationId}", aspectRatio }. Use images.get to inspect iteration history.`
}

function AspectRatioMenu({
  value,
  busy,
  generatedAspectRatios,
  onChange,
}: {
  value: AspectRatioId
  busy: boolean
  generatedAspectRatios: ReadonlySet<AspectRatioId>
  onChange: (value: AspectRatioId) => void
}) {
  const [open, setOpen] = useState(false)
  const current = aspectLabel(value)

  return (
    <div className="relative">
      <HeaderTooltip label="Aspect ratio">
        <button
          type="button"
          aria-label="Aspect ratio"
          className="border-border bg-background hover:bg-muted flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2 text-xs font-medium shadow-sm transition-colors disabled:cursor-default disabled:opacity-60"
          disabled={busy}
          onClick={() => setOpen((next) => !next)}
        >
          <PanelTop className="text-muted-foreground size-3.5" />
          <span>Aspect</span>
          <span className="text-muted-foreground font-mono">
            {current.ratio}
          </span>
          <ChevronDown className="text-muted-foreground size-3.5" />
        </button>
      </HeaderTooltip>

      {open ? (
        <div className="border-border bg-popover text-popover-foreground absolute right-0 top-9 z-20 w-56 rounded-lg border p-2 shadow-lg">
          <p className="text-muted-foreground mb-2 px-1 text-xs leading-4">
            Choose or generate a ratio
          </p>
          <div className="space-y-0.5">
            {ASPECT_RATIOS.map((ratio) => {
              const isCurrent = ratio.id === value
              const hasGenerated = generatedAspectRatios.has(ratio.id)

              return (
                <button
                  key={ratio.id}
                  type="button"
                  className="hover:bg-muted flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-xs transition-colors"
                  onClick={() => {
                    setOpen(false)
                    if (!isCurrent) onChange(ratio.id)
                  }}
                >
                  <span
                    className={cn(
                      'border-foreground/75 block shrink-0 rounded-[3px] border',
                      ratio.id === 'square' && 'size-3.5',
                      ratio.id === 'portrait' && 'h-5 w-3.5',
                      ratio.id === 'story' && 'h-5 w-3',
                      ratio.id === 'landscape' && 'h-3.5 w-5',
                      ratio.id === 'widescreen' && 'h-3 w-[22px]',
                    )}
                  />
                  <span className="text-foreground min-w-0 flex-1 truncate font-medium">
                    {ratio.label}
                  </span>
                  <span className="text-muted-foreground font-mono">
                    {ratio.ratio}
                  </span>
                  {hasGenerated ? (
                    <Check
                      className="text-muted-foreground size-3.5 shrink-0"
                      aria-label="Generated"
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function App() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [selectedIterationId, setSelectedIterationId] = useState<string | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [pendingImportFiles, setPendingImportFiles] = useState<File[]>([])
  const [pendingImportPaths, setPendingImportPaths] = useState<string[]>([])
  const [isDraggingImages, setIsDraggingImages] = useState(false)
  const [removeBgKeyDialogOpen, setRemoveBgKeyDialogOpen] = useState(false)
  const [removeBgApiKey, setRemoveBgApiKey] = useState('')
  const [removeBgKeyError, setRemoveBgKeyError] = useState<string | null>(null)
  const dragDepthRef = useRef(0)
  const [downloadingIterationId, setDownloadingIterationId] = useState<
    string | null
  >(null)
  const [copiedPromptIterationId, setCopiedPromptIterationId] = useState<
    string | null
  >(null)
  const [pendingDeleteIterationId, setPendingDeleteIterationId] = useState<
    string | null
  >(null)
  const [deleteDescendants, setDeleteDescendants] = useState(false)
  const [hoveredGalleryThreadId, setHoveredGalleryThreadId] = useState<
    string | null
  >(null)
  const [isGalleryAlbumOpen, setIsGalleryAlbumOpen] = useState(false)
  const [galleryAlbumAlign, setGalleryAlbumAlign] = useState<'left' | 'right'>(
    'left',
  )
  const galleryAlbumCloseTimeoutRef = useRef<number | null>(null)
  const galleryAlbumOpenFrameRef = useRef<number | null>(null)
  const [hoveredThumbnailId, setHoveredThumbnailId] = useState<string | null>(
    null,
  )
  const [isThumbnailFlyoutOpen, setIsThumbnailFlyoutOpen] = useState(false)
  const hoveredThumbnailIdRef = useRef<string | null>(null)
  const thumbnailFlyoutCloseTimeoutRef = useRef<number | null>(null)
  const thumbnailFlyoutOpenFrameRef = useRef<number | null>(null)
  const [thumbnailScrollTop, setThumbnailScrollTop] = useState(0)
  const thumbnailScrollRef = useRef<HTMLDivElement | null>(null)
  const [thumbnailScrollState, setThumbnailScrollState] = useState({
    canScrollUp: false,
    canScrollDown: false,
  })

  const openGalleryAlbum = useCallback(
    (threadId: string, triggerRect?: DOMRect, popoverWidth = 0) => {
      if (galleryAlbumCloseTimeoutRef.current !== null) {
        window.clearTimeout(galleryAlbumCloseTimeoutRef.current)
        galleryAlbumCloseTimeoutRef.current = null
      }
      if (galleryAlbumOpenFrameRef.current !== null) {
        window.cancelAnimationFrame(galleryAlbumOpenFrameRef.current)
        galleryAlbumOpenFrameRef.current = null
      }

      if (triggerRect && popoverWidth > 0) {
        setGalleryAlbumAlign(
          triggerRect.left + popoverWidth > window.innerWidth - 12
            ? 'right'
            : 'left',
        )
      } else {
        setGalleryAlbumAlign('left')
      }

      setHoveredGalleryThreadId(threadId)
      setIsGalleryAlbumOpen(false)
      galleryAlbumOpenFrameRef.current = window.requestAnimationFrame(() => {
        galleryAlbumOpenFrameRef.current = window.requestAnimationFrame(() => {
          setIsGalleryAlbumOpen(true)
          galleryAlbumOpenFrameRef.current = null
        })
      })
    },
    [],
  )

  const closeGalleryAlbum = useCallback(() => {
    if (galleryAlbumCloseTimeoutRef.current !== null) {
      window.clearTimeout(galleryAlbumCloseTimeoutRef.current)
    }
    if (galleryAlbumOpenFrameRef.current !== null) {
      window.cancelAnimationFrame(galleryAlbumOpenFrameRef.current)
      galleryAlbumOpenFrameRef.current = null
    }

    setIsGalleryAlbumOpen(false)
    galleryAlbumCloseTimeoutRef.current = window.setTimeout(() => {
      setHoveredGalleryThreadId(null)
      galleryAlbumCloseTimeoutRef.current = null
    }, 260)
  }, [])

  const openThumbnailFlyout = useCallback((thumbnailId: string) => {
    if (thumbnailFlyoutCloseTimeoutRef.current !== null) {
      window.clearTimeout(thumbnailFlyoutCloseTimeoutRef.current)
      thumbnailFlyoutCloseTimeoutRef.current = null
    }
    if (thumbnailFlyoutOpenFrameRef.current !== null) {
      window.cancelAnimationFrame(thumbnailFlyoutOpenFrameRef.current)
      thumbnailFlyoutOpenFrameRef.current = null
    }

    if (hoveredThumbnailIdRef.current === thumbnailId) {
      setIsThumbnailFlyoutOpen(true)
      return
    }

    hoveredThumbnailIdRef.current = thumbnailId
    setHoveredThumbnailId(thumbnailId)
    setIsThumbnailFlyoutOpen(false)
    thumbnailFlyoutOpenFrameRef.current = window.requestAnimationFrame(() => {
      thumbnailFlyoutOpenFrameRef.current = window.requestAnimationFrame(() => {
        setIsThumbnailFlyoutOpen(true)
        thumbnailFlyoutOpenFrameRef.current = null
      })
    })
  }, [])

  const closeThumbnailFlyout = useCallback(() => {
    if (thumbnailFlyoutCloseTimeoutRef.current !== null) {
      window.clearTimeout(thumbnailFlyoutCloseTimeoutRef.current)
    }
    if (thumbnailFlyoutOpenFrameRef.current !== null) {
      window.cancelAnimationFrame(thumbnailFlyoutOpenFrameRef.current)
      thumbnailFlyoutOpenFrameRef.current = null
    }
    setIsThumbnailFlyoutOpen(false)
    thumbnailFlyoutCloseTimeoutRef.current = window.setTimeout(() => {
      hoveredThumbnailIdRef.current = null
      setHoveredThumbnailId(null)
      thumbnailFlyoutCloseTimeoutRef.current = null
    }, 340)
  }, [])

  useEffect(() => {
    return () => {
      if (galleryAlbumCloseTimeoutRef.current !== null) {
        window.clearTimeout(galleryAlbumCloseTimeoutRef.current)
      }
      if (galleryAlbumOpenFrameRef.current !== null) {
        window.cancelAnimationFrame(galleryAlbumOpenFrameRef.current)
      }
      if (thumbnailFlyoutCloseTimeoutRef.current !== null) {
        window.clearTimeout(thumbnailFlyoutCloseTimeoutRef.current)
      }
      if (thumbnailFlyoutOpenFrameRef.current !== null) {
        window.cancelAnimationFrame(thumbnailFlyoutOpenFrameRef.current)
      }
    }
  }, [])

  const updateThumbnailScrollState = useCallback(() => {
    const node = thumbnailScrollRef.current
    if (!node) return

    setThumbnailScrollTop(node.scrollTop)

    const maxScrollTop = node.scrollHeight - node.clientHeight
    const nextState = {
      canScrollUp: node.scrollTop > 1,
      canScrollDown: node.scrollTop < maxScrollTop - 1,
    }

    setThumbnailScrollState((current) =>
      current.canScrollUp === nextState.canScrollUp &&
      current.canScrollDown === nextState.canScrollDown
        ? current
        : nextState,
    )
  }, [])

  const imagesQuery = useQuery({
    queryKey: ['images', workspaceId],
    queryFn: async () => {
      const response = await fetchWithWorkspace('/api/images')
      return parseResponse<ImageThread[]>(response, 'Failed to load images')
    },
    refetchInterval: 2_000,
  })

  const removeBgStatusQuery = useQuery({
    queryKey: ['remove-bg-status'],
    queryFn: async () => {
      const response = await fetchWithWorkspace('/api/remove-bg/status')
      return parseResponse<RemoveBgStatus>(
        response,
        'Failed to inspect remove.bg key',
      )
    },
  })

  const threads = useMemo(() => imagesQuery.data ?? [], [imagesQuery.data])
  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [selectedThreadId, threads],
  )
  const selectedPendingIteration = pendingIterationByThumbnailId(
    selectedThread,
    selectedIterationId,
  )
  const selectedPendingAspectRatio =
    selectedPendingIteration?.aspectRatio ?? null
  const selectedIteration = selectedPendingAspectRatio
    ? null
    : (selectedThread?.iterations.find(
        (iteration) => iteration.id === selectedIterationId,
      ) ??
      selectedThread?.iterations.at(-1) ??
      null)

  const closeSelectedThread = useCallback((sync: 'pop' | 'none' = 'pop') => {
    if (sync === 'pop') popMoldableNavigation()
    setSelectedThreadId(null)
    setSelectedIterationId(null)
  }, [])

  const openThread = useCallback(
    (
      thread: ImageThread,
      iterationId: string | null = selectedIterationIdForThread(thread),
      sync: 'push' | 'none' = 'push',
    ) => {
      if (sync === 'push') {
        pushMoldableNavigation({
          id: `thread:${thread.id}`,
          title: thread.title || 'Image',
        })
      }
      setSelectedThreadId(thread.id)
      setSelectedIterationId(iterationId)
    },
    [],
  )

  useEffect(() => {
    resetMoldableNavigation()
  }, [])

  useMoldableNavigationPop(() => {
    closeSelectedThread('none')
  })

  useEffect(() => {
    if (selectedThreadId && !selectedThread && threads.length > 0) {
      closeSelectedThread('none')
    }
  }, [closeSelectedThread, selectedThread, selectedThreadId, threads.length])

  useEffect(() => {
    if (selectedThread && !selectedIterationId) {
      setSelectedIterationId(selectedIterationIdForThread(selectedThread))
    }
  }, [selectedIterationId, selectedThread])

  useEffect(() => {
    if (
      selectedThread &&
      selectedIterationId &&
      (selectedIterationId === PENDING_ITERATION_ID ||
        selectedIterationId.startsWith(PENDING_ITERATION_ID_PREFIX)) &&
      !pendingIterationByThumbnailId(selectedThread, selectedIterationId)
    ) {
      setSelectedIterationId(selectedThread.iterations.at(-1)?.id ?? null)
    }
  }, [selectedIterationId, selectedThread])

  useEffect(() => {
    if (!selectedThread) return

    const thread = selectedThread
    const ids = selectableIterationIds(thread)
    if (ids.length <= 1) return

    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        isTextEntryTarget(event.target)
      ) {
        return
      }

      const direction =
        event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : event.key === 'ArrowRight' || event.key === 'ArrowDown'
            ? 1
            : 0

      if (direction === 0) return

      event.preventDefault()
      setSelectedIterationId((current) => {
        const fallbackId = selectedIterationIdForThread(thread)
        const currentId =
          current && ids.includes(current) ? current : fallbackId
        if (!currentId) return current

        const currentIndex = ids.indexOf(currentId)
        const nextIndex = Math.min(
          Math.max(currentIndex + direction, 0),
          ids.length - 1,
        )

        return ids[nextIndex] ?? currentId
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedThread])

  useEffect(() => {
    const frame = window.requestAnimationFrame(updateThumbnailScrollState)
    return () => window.cancelAnimationFrame(frame)
  }, [
    selectedIterationId,
    selectedThread?.iterations.length,
    selectedThread?.status,
    selectedThreadId,
    updateThumbnailScrollState,
  ])

  useEffect(() => {
    if (!selectedThread || !selectedIterationId) return

    const frame = window.requestAnimationFrame(() => {
      const node = thumbnailScrollRef.current
      const selectedThumbnail = node?.querySelector<HTMLElement>(
        '[data-selected-thumbnail="true"]',
      )
      if (!node || !selectedThumbnail) return

      const nodeRect = node.getBoundingClientRect()
      const thumbnailRect = selectedThumbnail.getBoundingClientRect()
      const topFadeGuard = 48
      const bottomFadeGuard = 64

      if (thumbnailRect.top < nodeRect.top + topFadeGuard) {
        node.scrollTop -= nodeRect.top + topFadeGuard - thumbnailRect.top
      } else if (thumbnailRect.bottom > nodeRect.bottom - bottomFadeGuard) {
        node.scrollTop +=
          thumbnailRect.bottom - (nodeRect.bottom - bottomFadeGuard)
      }

      window.requestAnimationFrame(updateThumbnailScrollState)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [
    selectedIterationId,
    selectedPendingAspectRatio,
    selectedThread,
    updateThumbnailScrollState,
  ])

  useEffect(() => {
    window.addEventListener('resize', updateThumbnailScrollState)
    return () =>
      window.removeEventListener('resize', updateThumbnailScrollState)
  }, [updateThumbnailScrollState])

  useEffect(() => {
    const context = selectedThread
      ? selectedThread.status === 'failed'
        ? `Images app is open to failed image thread ${selectedThread.id}. Drive this app only through app RPC methods. To retry this failed generation, call images.retry with { id: "${selectedThread.id}" }. Use images.get to inspect the failure details.`
        : selectedIteration
          ? remixInstructionsForIteration(
              selectedThread.id,
              selectedIteration.id,
            )
          : `Images app is open to image thread ${selectedThread.id}. Drive this app only through app RPC methods. To add another iteration to this same thread, call images.edit with { id: "${selectedThread.id}", prompt, aspectRatio? }. To remove the displayed image background, call images.removeBackground with { id: "${selectedThread.id}" }. To save a chat-generated image into this thread, call images.importGenerated with { id: "${selectedThread.id}", imagePath, prompt? }. To cancel stuck pending work, call images.cancel with { id: "${selectedThread.id}" }. To change ratio, call images.setAspectRatio with { id: "${selectedThread.id}", aspectRatio }. Use images.get to inspect iteration history.`
      : `Images app grid is open. Drive this app only through app RPC methods. To create a new image thread, call images.generate with { prompt, aspectRatio } when the user specifies a ratio; otherwise omit aspectRatio. To save a chat-generated image as a new image thread, call images.importGenerated with { imagePath, prompt? }. To retry a failed generation, call images.retry with { id }. To cancel stuck pending work, call images.cancel with { id }. Use images.list or images.get to inspect existing image history.`

    sendChatInstructions(context)
  }, [selectedIteration, selectedThread])

  const setAspectRatio = useMutation({
    mutationFn: async (variables: {
      threadId: string
      aspectRatio: AspectRatioId
      baseIterationId?: string
      workspaceId: string | undefined
    }) => {
      const { threadId, aspectRatio, baseIterationId } = variables
      const response = await fetchWithWorkspace('/api/moldable/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'images.setAspectRatio',
          params: { id: threadId, aspectRatio, baseIterationId },
        }),
      })
      const rpc = await parseResponse<RpcResponse<ImageThread>>(
        response,
        'Failed to change aspect ratio',
      )
      if (!rpc.ok) {
        throw new Error(rpc.error?.message ?? 'Failed to change aspect ratio')
      }
      return rpc.result
    },
    onSuccess: (thread, variables) => {
      setError(null)
      queryClient.setQueryData<ImageThread[]>(
        ['images', variables.workspaceId],
        (current) => upsertThread(current, thread),
      )
      if (workspaceId === variables.workspaceId) {
        setSelectedIterationId(selectedIterationIdForThread(thread))
      }
      void queryClient.invalidateQueries({
        queryKey: ['images', variables.workspaceId],
      })
    },
    onError: (mutationError, variables) => {
      if (workspaceId !== variables.workspaceId) return
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to change aspect ratio',
      )
    },
  })

  const retryGeneration = useMutation({
    mutationFn: async ({
      threadId,
    }: {
      threadId: string
      workspaceId: string | undefined
    }) => {
      const response = await fetchWithWorkspace('/api/moldable/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'images.retry',
          params: { id: threadId },
        }),
      })
      const rpc = await parseResponse<RpcResponse<ImageThread>>(
        response,
        'Failed to retry image generation',
      )
      if (!rpc.ok) {
        throw new Error(
          rpc.error?.message ?? 'Failed to retry image generation',
        )
      }
      return rpc.result
    },
    onSuccess: (_thread, variables) => {
      setError(null)
      void queryClient.invalidateQueries({
        queryKey: ['images', variables.workspaceId],
      })
    },
    onError: (mutationError, variables) => {
      if (workspaceId !== variables.workspaceId) return
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to retry image generation',
      )
    },
  })

  const deleteIteration = useMutation({
    mutationFn: async ({
      threadId,
      iterationIds,
    }: {
      threadId: string
      iterationIds: string[]
      workspaceId: string | undefined
    }) => {
      const response = await fetchWithWorkspace('/api/moldable/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'images.deleteIteration',
          params: { id: threadId, iterationId: iterationIds },
        }),
      })
      const rpc = await parseResponse<RpcResponse<DeleteIterationResult>>(
        response,
        'Failed to delete image',
      )
      if (!rpc.ok) {
        throw new Error(rpc.error?.message ?? 'Failed to delete image')
      }
      return rpc.result
    },
    onSuccess: (result, variables) => {
      setError(null)
      if (workspaceId === variables.workspaceId) {
        setPendingDeleteIterationId(null)
        setDeleteDescendants(false)
        closeThumbnailFlyout()
      }

      if (result.deletedThread) {
        queryClient.setQueryData<ImageThread[]>(
          ['images', variables.workspaceId],
          (current) =>
            (current ?? []).filter(
              (thread) => thread.id !== variables.threadId,
            ),
        )
        if (workspaceId === variables.workspaceId) {
          closeSelectedThread('pop')
        }
      } else if (result.thread) {
        const updatedThread = result.thread
        queryClient.setQueryData<ImageThread[]>(
          ['images', variables.workspaceId],
          (current) => upsertThread(current, updatedThread),
        )
        if (workspaceId === variables.workspaceId) {
          openThread(
            updatedThread,
            selectedIterationIdForThread(updatedThread),
            'none',
          )
        }
      }

      void queryClient.invalidateQueries({
        queryKey: ['images', variables.workspaceId],
      })
    },
    onError: (mutationError, variables) => {
      if (workspaceId !== variables.workspaceId) return
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to delete image',
      )
    },
  })

  const removeBackground = useMutation({
    mutationFn: async (variables: {
      threadId: string
      iterationId?: string
      workspaceId: string | undefined
    }) => {
      const { threadId, iterationId } = variables
      const response = await fetchWithWorkspace('/api/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: threadId, iterationId }),
      })
      return parseResponse<ImageThread>(response, 'Failed to remove background')
    },
    onSuccess: (thread, variables) => {
      setError(null)
      queryClient.setQueryData<ImageThread[]>(
        ['images', variables.workspaceId],
        (current) => upsertThread(current, thread),
      )
      if (workspaceId === variables.workspaceId) {
        setSelectedIterationId(selectedIterationIdForThread(thread))
      }
      void queryClient.invalidateQueries({
        queryKey: ['images', variables.workspaceId],
      })
    },
    onError: (mutationError, variables) => {
      if (workspaceId !== variables.workspaceId) return
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to remove background',
      )
    },
  })

  const saveRemoveBgKey = useMutation({
    mutationFn: async ({
      apiKey,
    }: {
      apiKey: string
      workspaceId: string | undefined
      threadId?: string
      iterationId?: string
    }) => {
      const response = await fetchWithWorkspace('/api/remove-bg/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })
      return parseResponse<RemoveBgStatus>(
        response,
        'Failed to save remove.bg key',
      )
    },
    onSuccess: (_status, variables) => {
      if (workspaceId === variables.workspaceId) {
        setRemoveBgApiKey('')
        setRemoveBgKeyError(null)
        setRemoveBgKeyDialogOpen(false)
      }
      void queryClient.invalidateQueries({
        queryKey: ['remove-bg-status'],
      })
      if (
        workspaceId === variables.workspaceId &&
        variables.threadId &&
        variables.iterationId
      ) {
        removeBackground.mutate({
          threadId: variables.threadId,
          iterationId: variables.iterationId,
          workspaceId: variables.workspaceId,
        })
      }
    },
    onError: (mutationError, variables) => {
      if (workspaceId !== variables.workspaceId) return
      setRemoveBgKeyError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to save remove.bg key',
      )
    },
  })

  const importImages = useMutation({
    mutationFn: async (variables: {
      files: File[]
      mode: ImportMode
      workspaceId: string | undefined
    }) => {
      const { files, mode } = variables
      const formData = new FormData()
      formData.set('mode', mode)
      for (const file of files) {
        formData.append('files', file, file.name)
      }

      const response = await fetchWithWorkspace('/api/images/import', {
        method: 'POST',
        body: formData,
      })
      return parseResponse<ImageThread[]>(response, 'Failed to import images')
    },
    onSuccess: (imported, variables) => {
      setError(null)
      if (workspaceId === variables.workspaceId) {
        setPendingImportFiles([])
        setPendingImportPaths([])
      }
      queryClient.setQueryData<ImageThread[]>(
        ['images', variables.workspaceId],
        (current) => [...imported, ...(current ?? [])],
      )
      void queryClient.invalidateQueries({
        queryKey: ['images', variables.workspaceId],
      })
    },
    onError: (mutationError, variables) => {
      if (workspaceId !== variables.workspaceId) return
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to import images',
      )
    },
  })

  const importImagePaths = useMutation({
    mutationFn: async (variables: {
      paths: string[]
      mode: ImportMode
      workspaceId: string | undefined
    }) => {
      const { paths, mode } = variables
      const response = await fetchWithWorkspace('/api/images/import-paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths, mode }),
      })
      return parseResponse<ImageThread[]>(response, 'Failed to import images')
    },
    onSuccess: (imported, variables) => {
      setError(null)
      if (workspaceId === variables.workspaceId) {
        setPendingImportFiles([])
        setPendingImportPaths([])
      }
      queryClient.setQueryData<ImageThread[]>(
        ['images', variables.workspaceId],
        (current) => [...imported, ...(current ?? [])],
      )
      void queryClient.invalidateQueries({
        queryKey: ['images', variables.workspaceId],
      })
    },
    onError: (mutationError, variables) => {
      if (workspaceId !== variables.workspaceId) return
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to import images',
      )
    },
  })

  const importDroppedFiles = useCallback(
    (files: File[], mode: ImportMode) => {
      if (files.length === 0) return
      setError(null)
      setPendingImportPaths([])
      importImages.mutate({ files, mode, workspaceId })
    },
    [importImages, workspaceId],
  )

  const importDroppedPaths = useCallback(
    (paths: string[], mode: ImportMode) => {
      if (paths.length === 0) return
      setError(null)
      setPendingImportFiles([])
      importImagePaths.mutate({ paths, mode, workspaceId })
    },
    [importImagePaths, workspaceId],
  )

  useEffect(() => {
    const handleMessage = (event: MessageEvent<MoldableFileDropMessage>) => {
      const data = event.data
      if (!data || typeof data !== 'object') return

      if (data.type === 'moldable:file-drag-over') {
        setIsDraggingImages(true)
        return
      }

      if (data.type === 'moldable:file-drag-leave') {
        dragDepthRef.current = 0
        setIsDraggingImages(false)
        return
      }

      if (data.type !== 'moldable:file-drop') return

      dragDepthRef.current = 0
      setIsDraggingImages(false)
      const paths = imagePathsFromList(data.paths ?? [])
      if (paths.length === 0) return
      if (paths.length === 1) {
        importDroppedPaths(paths, 'separate')
        return
      }
      setPendingImportFiles([])
      setPendingImportPaths(paths)
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [importDroppedPaths])

  const handleDragEnter = useCallback((event: DragEvent<HTMLElement>) => {
    if (!hasFileDrag(event)) return
    event.preventDefault()
    dragDepthRef.current += 1
    setIsDraggingImages(true)
  }, [])

  const handleDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    if (!hasFileDrag(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    if (!hasFileDrag(event)) return
    event.preventDefault()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setIsDraggingImages(false)
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!hasFileDrag(event)) return
      event.preventDefault()
      dragDepthRef.current = 0
      setIsDraggingImages(false)

      const files = imageFilesFromList(event.dataTransfer.files)
      if (files.length === 0) return
      if (files.length === 1) {
        importDroppedFiles(files, 'separate')
        return
      }
      setPendingImportPaths([])
      setPendingImportFiles(files)
    },
    [importDroppedFiles],
  )

  const busy =
    setAspectRatio.isPending ||
    removeBackground.isPending ||
    deleteIteration.isPending ||
    pendingIterationsForThread(selectedThread).length > 0
  const importPending = importImages.isPending || importImagePaths.isPending
  const failedDialogThread =
    selectedThread &&
    (selectedThread.status === 'failed' ||
      (selectedThread.status === 'generating' &&
        !selectedIteration &&
        !selectedPendingAspectRatio))
      ? selectedThread
      : null

  const importChoiceDialog = (
    <Dialog
      open={pendingImportFiles.length > 1 || pendingImportPaths.length > 1}
      onOpenChange={(open) => {
        if (!open && !importPending) {
          setPendingImportFiles([])
          setPendingImportPaths([])
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="w-[min(22rem,calc(100vw-2rem))] rounded-xl p-4"
      >
        <DialogTitle className="text-sm font-medium">Import as</DialogTitle>
        <DialogDescription className="sr-only">
          Choose whether dropped images should become one group or separate
          images.
        </DialogDescription>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            className="h-10 cursor-pointer"
            disabled={importPending}
            onClick={() => {
              if (pendingImportFiles.length > 0) {
                importDroppedFiles(pendingImportFiles, 'group')
              } else {
                importDroppedPaths(pendingImportPaths, 'group')
              }
            }}
          >
            Group
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-10 cursor-pointer"
            disabled={importPending}
            onClick={() => {
              if (pendingImportFiles.length > 0) {
                importDroppedFiles(pendingImportFiles, 'separate')
              } else {
                importDroppedPaths(pendingImportPaths, 'separate')
              }
            }}
          >
            Separate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )

  if (selectedThread && (selectedIteration || selectedPendingAspectRatio)) {
    const displayedAspectRatio =
      selectedPendingAspectRatio ??
      selectedIteration?.aspectRatio ??
      selectedThread.aspectRatio
    const canCopyPrompt = Boolean(selectedIteration?.prompt)
    const isPromptCopied =
      selectedIteration && copiedPromptIterationId === selectedIteration.id
    const rootIterations = rootIterationsForThread(selectedThread)
    const thumbnailItems: ThumbnailItem[] = [
      ...rootIterations.map((iteration, index) => {
        const children = childIterationsForThread(selectedThread, iteration.id)
        const branchIterations = [iteration, ...children]
        const selectedBranchIteration =
          branchIterations.find(
            (branchIteration) => branchIteration.id === selectedIteration?.id,
          ) ?? iteration
        return {
          id: iteration.id,
          type: 'image' as const,
          imageUrl: iteration.imageUrl,
          aspectRatio: iteration.aspectRatio,
          label:
            children.length > 0
              ? `View iteration ${index + 1}, ${children.length} more ${children.length === 1 ? 'image' : 'images'}`
              : `View iteration ${index + 1}`,
          iteration,
          children,
          selectedBranchIteration,
          isSelected: containsIteration(
            branchIterations,
            selectedIteration?.id ?? null,
          ),
        }
      }),
      ...pendingIterationsForThread(selectedThread).map((pending, index) => {
        const id = pendingThumbnailId(pending, index)
        return {
          id,
          type: 'pending' as const,
          imageUrl: null,
          aspectRatio: pending.aspectRatio,
          label: pendingMainLabel(selectedThread, pending.aspectRatio),
          iteration: null,
          children: [] as ImageIteration[],
          selectedBranchIteration: null,
          isSelected: selectedIterationId === id,
        }
      }),
    ]
    let thumbnailOffset = 0
    const thumbnailStack = thumbnailItems.map((item) => {
      const offset = thumbnailOffset
      const visualSize = item.isSelected
        ? THUMBNAIL_SELECTED_SIZE
        : THUMBNAIL_SIZE
      thumbnailOffset += visualSize + THUMBNAIL_GAP
      return { ...item, offset, visualSize }
    })
    const thumbnailStackHeight =
      thumbnailStack.length > 0
        ? Math.max(THUMBNAIL_SELECTED_SIZE, thumbnailOffset - THUMBNAIL_GAP)
        : 0

    async function handleCopyPrompt() {
      if (!selectedIteration?.prompt) return
      const iterationId = selectedIteration.id
      setError(null)
      try {
        await copyText(selectedIteration.prompt)
        setCopiedPromptIterationId(iterationId)
        window.setTimeout(() => {
          setCopiedPromptIterationId((current) =>
            current === iterationId ? null : current,
          )
        }, 1_500)
      } catch (copyError) {
        setError(
          copyError instanceof Error
            ? copyError.message
            : 'Failed to copy prompt',
        )
      }
    }

    const activeThreadId = selectedThread.id

    function remixIteration(iteration: ImageIteration | null | undefined) {
      if (!iteration) return
      setSelectedIterationId(iteration.id)
      sendChatInstructions(
        remixInstructionsForIteration(activeThreadId, iteration.id),
      )
      sendToChatInput('Remix this image: ')
    }

    function handleRemoveBackground() {
      if (!selectedIteration || removeBackground.isPending) return
      setError(null)
      setRemoveBgKeyError(null)

      if (!removeBgStatusQuery.data?.available) {
        setRemoveBgKeyDialogOpen(true)
        return
      }

      removeBackground.mutate({
        threadId: activeThreadId,
        iterationId: selectedIteration.id,
        workspaceId,
      })
    }

    function handleSaveRemoveBgKey() {
      const apiKey = removeBgApiKey.trim()
      if (!apiKey) {
        setRemoveBgKeyError('Enter a remove.bg API key.')
        return
      }
      saveRemoveBgKey.mutate({
        apiKey,
        workspaceId,
        threadId: selectedThread?.id,
        iterationId: selectedIteration?.id,
      })
    }

    const hoveredThumbnail = thumbnailStack.find(
      (item) => item.id === hoveredThumbnailId,
    )
    const hoveredBranchTarget = hoveredThumbnail?.iteration
      ? hoveredThumbnail.selectedBranchIteration
      : null
    const hoveredThumbnailVisualSize =
      hoveredThumbnail?.visualSize ?? THUMBNAIL_SIZE
    const hoveredFlyoutItemCount = hoveredThumbnail?.iteration
      ? hoveredThumbnail.children.length + 1
      : 0
    const hoveredFlyoutWidth =
      THUMBNAIL_FLYOUT_GAP +
      Math.max(
        0,
        hoveredFlyoutItemCount * THUMBNAIL_SIZE +
          Math.max(0, hoveredFlyoutItemCount - 1) * THUMBNAIL_GAP,
      )
    const pendingDeleteIteration = pendingDeleteIterationId
      ? (selectedThread.iterations.find(
          (iteration) => iteration.id === pendingDeleteIterationId,
        ) ?? null)
      : null
    const pendingDeleteChildren = pendingDeleteIteration
      ? childIterationsForThread(selectedThread, pendingDeleteIteration.id)
      : []
    const pendingDeleteIterationIds = pendingDeleteIteration
      ? [
          pendingDeleteIteration.id,
          ...(deleteDescendants
            ? pendingDeleteChildren.map((iteration) => iteration.id)
            : []),
        ]
      : []
    const pendingDeleteCount = pendingDeleteIterationIds.length
    const canDeleteSelectedIteration =
      Boolean(selectedIteration) &&
      pendingIterationsForThread(selectedThread).length === 0
    const closeDeleteDialog = () => {
      if (deleteIteration.isPending) return
      setPendingDeleteIterationId(null)
      setDeleteDescendants(false)
    }
    const deleteIterationDialog = (
      <AlertDialog
        open={Boolean(pendingDeleteIteration)}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog()
        }}
      >
        <AlertDialogContent className="w-[min(24rem,calc(100vw-2rem))]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete image?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteCount > 1
                ? `This will delete this image and ${pendingDeleteCount - 1} child ${pendingDeleteCount === 2 ? 'image' : 'images'}.`
                : 'This will delete the currently shown image.'}{' '}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {pendingDeleteIteration ? (
            <div className="border-border bg-muted/25 flex items-center gap-3 rounded-lg border p-3">
              <div
                className={cn(
                  'bg-muted ring-border/55 shrink-0 overflow-hidden rounded-md ring-1',
                  ASPECT_PREVIEW_CLASS[pendingDeleteIteration.aspectRatio],
                  pendingDeleteIteration.aspectRatio === 'story'
                    ? 'h-24 w-[54px]'
                    : pendingDeleteIteration.aspectRatio === 'portrait'
                      ? 'h-24 w-[72px]'
                      : pendingDeleteIteration.aspectRatio === 'landscape'
                        ? 'h-[72px] w-24'
                        : pendingDeleteIteration.aspectRatio === 'widescreen'
                          ? 'h-[54px] w-24'
                          : 'size-20',
                )}
              >
                <img
                  src={pendingDeleteIteration.imageUrl}
                  alt="Image selected for deletion"
                  className="size-full object-cover"
                  draggable="false"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-foreground line-clamp-2 text-sm font-medium leading-5">
                  {pendingDeleteIteration.prompt || selectedThread.title}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {aspectLabel(pendingDeleteIteration.aspectRatio).ratio} ·{' '}
                  {pendingDeleteIteration.kind}
                </p>
              </div>
            </div>
          ) : null}

          {pendingDeleteChildren.length > 0 ? (
            <div className="border-border bg-muted/30 flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0 space-y-1">
                <label
                  htmlFor="delete-image-children"
                  className="text-foreground block cursor-pointer text-sm font-medium"
                >
                  Delete children too
                </label>
                <p className="text-muted-foreground text-xs leading-5">
                  Also remove {pendingDeleteChildren.length} child{' '}
                  {pendingDeleteChildren.length === 1 ? 'image' : 'images'} in
                  this thread.
                </p>
              </div>
              <Switch
                id="delete-image-children"
                checked={deleteDescendants}
                disabled={deleteIteration.isPending}
                onCheckedChange={(checked: boolean) =>
                  setDeleteDescendants(checked)
                }
              />
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel
              className="cursor-pointer"
              disabled={deleteIteration.isPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="cursor-pointer"
              disabled={
                deleteIteration.isPending ||
                pendingDeleteIterationIds.length === 0
              }
              onClick={(event) => {
                event.preventDefault()
                if (
                  !pendingDeleteIteration ||
                  pendingDeleteIterationIds.length === 0
                )
                  return
                deleteIteration.mutate({
                  threadId: selectedThread.id,
                  iterationIds: pendingDeleteIterationIds,
                  workspaceId,
                })
              }}
            >
              {deleteIteration.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              Delete{' '}
              {pendingDeleteCount > 1
                ? `${pendingDeleteCount} images`
                : 'image'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    const removeBgKeyDialog = (
      <Dialog
        open={removeBgKeyDialogOpen}
        onOpenChange={(open) => {
          if (saveRemoveBgKey.isPending) return
          setRemoveBgKeyDialogOpen(open)
          if (!open) setRemoveBgKeyError(null)
        }}
      >
        <DialogContent className="w-[min(24rem,calc(100vw-2rem))] rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
              <KeyRound className="size-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="space-y-1">
                <DialogTitle className="text-sm font-medium">
                  Add remove.bg key
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Save a remove.bg API key in aivault to enable background
                  removal for Images.
                </DialogDescription>
              </div>
              <Input
                type="password"
                value={removeBgApiKey}
                placeholder="REMOVE_BG_API_KEY"
                className="font-mono text-sm"
                disabled={saveRemoveBgKey.isPending}
                onChange={(event) => {
                  setRemoveBgApiKey(event.target.value)
                  setRemoveBgKeyError(null)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSaveRemoveBgKey()
                }}
              />
              {removeBgKeyError ? (
                <p className="text-destructive text-xs">{removeBgKeyError}</p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="cursor-pointer"
                  disabled={saveRemoveBgKey.isPending}
                  onClick={() => setRemoveBgKeyDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="cursor-pointer"
                  disabled={saveRemoveBgKey.isPending}
                  onClick={handleSaveRemoveBgKey}
                >
                  {saveRemoveBgKey.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : null}
                  Save
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )

    return (
      <main
        className="image-view-emerge text-foreground relative flex h-full min-h-0 flex-col overflow-hidden"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <header className="border-border/70 flex h-12 shrink-0 items-center justify-between border-b px-4">
          <HeaderTooltip label="Close image">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="cursor-pointer"
              aria-label="Close image"
              onClick={() => closeSelectedThread('pop')}
            >
              <X className="size-3.5" />
            </Button>
          </HeaderTooltip>
          <div className="flex items-center gap-2">
            <AspectRatioMenu
              value={displayedAspectRatio}
              busy={busy}
              generatedAspectRatios={
                new Set(
                  selectedThread.iterations.map(
                    (iteration) => iteration.aspectRatio,
                  ),
                )
              }
              onChange={(aspectRatio) => {
                const existingIteration = latestIterationForAspectRatio(
                  selectedThread,
                  aspectRatio,
                )

                if (existingIteration) {
                  setError(null)
                  setSelectedIterationId(existingIteration.id)
                  return
                }

                setAspectRatio.mutate({
                  threadId: selectedThread.id,
                  aspectRatio,
                  baseIterationId: selectedIteration?.id,
                  workspaceId,
                })
              }}
            />
            <div className="flex shrink-0 items-center gap-1.5">
              <HeaderTooltip
                label={
                  removeBgStatusQuery.data?.available
                    ? 'Remove background'
                    : 'Add remove.bg key'
                }
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="cursor-pointer"
                  aria-label="Remove background"
                  disabled={!selectedIteration || removeBackground.isPending}
                  onClick={handleRemoveBackground}
                >
                  {removeBackground.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Eraser className="size-3.5" />
                  )}
                </Button>
              </HeaderTooltip>
              <HeaderTooltip label="Remix image">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="cursor-pointer"
                  aria-label="Remix image"
                  disabled={!selectedIteration}
                  onClick={() => remixIteration(selectedIteration)}
                >
                  <Shuffle className="size-3.5" />
                </Button>
              </HeaderTooltip>
              <HeaderTooltip label="Copy prompt">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="cursor-pointer"
                  aria-label="Copy prompt"
                  disabled={!canCopyPrompt}
                  onClick={() => void handleCopyPrompt()}
                >
                  {isPromptCopied ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
              </HeaderTooltip>
              <HeaderTooltip label="Download image">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="cursor-pointer"
                  disabled={
                    !selectedIteration ||
                    downloadingIterationId === selectedIteration.id
                  }
                  aria-label="Download image"
                  onClick={async () => {
                    if (!selectedIteration) return
                    setError(null)
                    setDownloadingIterationId(selectedIteration.id)
                    try {
                      await downloadImage(selectedIteration)
                    } catch (downloadError) {
                      setError(
                        downloadError instanceof Error
                          ? downloadError.message
                          : 'Failed to download image',
                      )
                    } finally {
                      setDownloadingIterationId(null)
                    }
                  }}
                >
                  {selectedIteration &&
                  downloadingIterationId === selectedIteration.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                </Button>
              </HeaderTooltip>
              <HeaderTooltip
                label={
                  canDeleteSelectedIteration
                    ? 'Delete image'
                    : 'Finish pending work before deleting'
                }
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                  disabled={
                    !canDeleteSelectedIteration || deleteIteration.isPending
                  }
                  aria-label="Delete image"
                  onClick={() => {
                    if (!selectedIteration) return
                    setError(null)
                    setDeleteDescendants(false)
                    setPendingDeleteIterationId(selectedIteration.id)
                  }}
                >
                  {deleteIteration.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </Button>
              </HeaderTooltip>
            </div>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 overflow-visible">
          <aside
            className="absolute inset-y-0 right-0 z-30 min-h-0 w-[84px] overflow-visible"
            onMouseLeave={closeThumbnailFlyout}
          >
            <div
              ref={thumbnailScrollRef}
              className="h-full overflow-y-auto overflow-x-visible px-2 py-4 pb-[calc(var(--chat-safe-padding,0px)+7rem)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onScroll={updateThumbnailScrollState}
            >
              <div
                className="relative mx-auto w-[74px] rounded-xl"
                style={{ height: thumbnailStackHeight }}
              >
                {thumbnailStack.map((item) => {
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'group/thumbnail absolute overflow-visible',
                        item.isSelected ? 'z-20' : 'z-0',
                      )}
                      style={{
                        left: 6,
                        top: item.offset,
                        width: item.visualSize,
                        height: item.visualSize,
                      }}
                      onMouseEnter={() => {
                        if (item.type === 'image') openThumbnailFlyout(item.id)
                      }}
                      onFocus={() => {
                        if (item.type === 'image') openThumbnailFlyout(item.id)
                      }}
                    >
                      <button
                        type="button"
                        className="focus-visible:ring-ring relative block size-full cursor-pointer select-none overflow-visible text-left focus-visible:outline-none focus-visible:ring-2"
                        aria-label={item.label}
                        aria-current={item.isSelected ? 'true' : undefined}
                        data-selected-thumbnail={
                          item.isSelected ? 'true' : undefined
                        }
                        onClick={() => {
                          if (item.iteration)
                            setSelectedIterationId(item.iteration.id)
                          else setSelectedIterationId(item.id)
                        }}
                      >
                        {item.type === 'image' && item.children.length > 0
                          ? item.children
                              .slice(-2)
                              .map((child, stackIndex, ledges) => {
                                const depth = ledges.length - stackIndex
                                const ledgeOffset = 3 * depth
                                return (
                                  <span
                                    key={child.id}
                                    aria-hidden="true"
                                    className="bg-muted ring-border/55 absolute inset-0 block overflow-hidden rounded-md shadow-sm ring-1 transition-[box-shadow,translate,scale] duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
                                    style={{
                                      transform: `translate3d(${ledgeOffset}px, ${ledgeOffset}px, 0)`,
                                      zIndex: stackIndex,
                                    }}
                                  >
                                    <img
                                      src={child.imageUrl}
                                      alt=""
                                      draggable="false"
                                      className="size-full object-cover"
                                    />
                                  </span>
                                )
                              })
                          : null}
                        <span
                          className={cn(
                            'ring-border/55 relative z-10 block size-full overflow-hidden rounded-md shadow-sm ring-1 transition-[translate,scale,box-shadow] duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover/thumbnail:-translate-x-0.5 group-hover/thumbnail:-translate-y-1 group-hover/thumbnail:scale-[1.035] group-hover/thumbnail:shadow-md group-focus-visible/thumbnail:-translate-x-0.5 group-focus-visible/thumbnail:-translate-y-1 group-focus-visible/thumbnail:scale-[1.035] motion-reduce:transition-none',
                            item.isSelected && 'ring-ring ring-2',
                          )}
                        >
                          {item.type === 'pending' ? (
                            <GenerationLoadingPreview
                              aspectRatio={item.aspectRatio}
                              className="size-full rounded-none"
                              label={null}
                            />
                          ) : item.iteration ? (
                            <img
                              src={item.iteration.imageUrl}
                              alt=""
                              draggable="false"
                              className="pointer-events-none size-full select-none object-cover"
                            />
                          ) : null}
                        </span>
                        {item.type === 'image' && item.children.length > 0 ? (
                          <StackCountBadge
                            count={item.children.length}
                            compact
                          />
                        ) : null}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {hoveredThumbnail?.iteration ? (
              <div
                className={cn(
                  'absolute z-40 origin-right motion-reduce:transition-none',
                  isThumbnailFlyoutOpen
                    ? 'pointer-events-auto'
                    : 'pointer-events-none',
                )}
                style={{
                  right: THUMBNAIL_RAIL_WIDTH - THUMBNAIL_RAIL_ITEM_LEFT,
                  height: hoveredThumbnailVisualSize,
                  top: 16 + hoveredThumbnail.offset - thumbnailScrollTop,
                  width: hoveredFlyoutWidth,
                }}
                onMouseEnter={() => openThumbnailFlyout(hoveredThumbnail.id)}
                onMouseLeave={closeThumbnailFlyout}
              >
                {hoveredThumbnail.children.map((child, index) => {
                  const openX =
                    THUMBNAIL_FLYOUT_GAP +
                    index * (THUMBNAIL_SIZE + THUMBNAIL_GAP)
                  const restingY =
                    (hoveredThumbnailVisualSize - THUMBNAIL_SIZE) / 2
                  const openY = restingY - Math.min(index * 1.5, 6)
                  const closeDelay = Math.max(
                    0,
                    hoveredFlyoutItemCount - index - 1,
                  )
                  return (
                    <button
                      key={child.id}
                      type="button"
                      className="group/fan-item focus-visible:ring-ring absolute right-0 top-0 size-14 cursor-pointer overflow-visible rounded-md text-left transition-[opacity,transform] duration-[220ms] ease-out focus-visible:outline-none focus-visible:ring-2 motion-reduce:transition-none"
                      style={{
                        opacity: isThumbnailFlyoutOpen ? 1 : 0,
                        transform: isThumbnailFlyoutOpen
                          ? `translate3d(${-openX}px, ${openY}px, 0) scale(1) rotate(0deg)`
                          : `translate3d(0px, ${restingY}px, 0) scale(0.68) rotate(${10 - index * 2}deg)`,
                        transformOrigin: 'right center',
                        transitionDelay: isThumbnailFlyoutOpen
                          ? `${Math.min(index * 26, 90)}ms`
                          : `${Math.min(closeDelay * 18, 90)}ms`,
                      }}
                      aria-label="View variant"
                      onClick={() => setSelectedIterationId(child.id)}
                    >
                      <span
                        className={cn(
                          'bg-muted ring-border/55 block size-full overflow-hidden rounded-md shadow-sm ring-1 transition-[box-shadow,translate,scale] duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover/fan-item:-translate-y-0.5 group-hover/fan-item:scale-[1.07] group-hover/fan-item:shadow-md group-focus-visible/fan-item:-translate-y-0.5 group-focus-visible/fan-item:scale-[1.07] motion-reduce:transition-none',
                          selectedIteration?.id === child.id &&
                            'ring-ring ring-2',
                        )}
                      >
                        <img
                          src={child.imageUrl}
                          alt=""
                          draggable="false"
                          className="pointer-events-none size-full select-none object-cover"
                        />
                      </span>
                    </button>
                  )
                })}
                {(() => {
                  const index = hoveredThumbnail.children.length
                  const openX =
                    THUMBNAIL_FLYOUT_GAP +
                    index * (THUMBNAIL_SIZE + THUMBNAIL_GAP)
                  const restingY =
                    (hoveredThumbnailVisualSize - THUMBNAIL_SIZE) / 2
                  return (
                    <button
                      type="button"
                      className="group/fan-item focus-visible:ring-ring absolute right-0 top-0 size-14 cursor-pointer overflow-visible rounded-md transition-[opacity,transform] duration-[220ms] ease-out focus-visible:outline-none focus-visible:ring-2 motion-reduce:transition-none"
                      style={{
                        opacity: isThumbnailFlyoutOpen ? 1 : 0,
                        transform: isThumbnailFlyoutOpen
                          ? `translate3d(${-openX}px, ${restingY - Math.min(index * 1.5, 6)}px, 0) scale(1) rotate(0deg)`
                          : `translate3d(0px, ${restingY}px, 0) scale(0.68) rotate(${10 - index * 2}deg)`,
                        transformOrigin: 'right center',
                        transitionDelay: isThumbnailFlyoutOpen
                          ? `${Math.min(index * 26, 100)}ms`
                          : '0ms',
                      }}
                      aria-label="Remix image"
                      title="Remix image"
                      onClick={() => remixIteration(hoveredBranchTarget)}
                    >
                      <span className="border-border/70 bg-background/95 text-muted-foreground group-hover/fan-item:text-foreground group-hover/fan-item:bg-muted flex size-full items-center justify-center rounded-md border shadow-sm transition-[background-color,border-color,color,box-shadow,translate,scale] duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover/fan-item:-translate-y-0.5 group-hover/fan-item:scale-[1.07] group-hover/fan-item:shadow-md group-focus-visible/fan-item:-translate-y-0.5 group-focus-visible/fan-item:scale-[1.07] motion-reduce:transition-none">
                        <Plus className="size-4" />
                      </span>
                    </button>
                  )
                })()}
              </div>
            ) : null}

            {thumbnailScrollState.canScrollUp ? (
              <div className="from-background via-background/80 to-background/0 pointer-events-none absolute inset-x-0 top-0 z-20 h-12 bg-gradient-to-b" />
            ) : null}
            {thumbnailScrollState.canScrollDown ? (
              <div className="from-background via-background/80 to-background/0 pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t" />
            ) : null}
          </aside>

          <section className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-auto px-8 py-8 pb-[calc(var(--chat-safe-padding,0px)+1rem)]">
              <div className="mx-auto flex min-h-full max-w-6xl flex-col items-center justify-center gap-5">
                {selectedPendingAspectRatio ? (
                  <>
                    <GenerationLoadingPreview
                      aspectRatio={selectedPendingAspectRatio}
                      className={cn(
                        'w-full rounded-sm',
                        MAIN_PENDING_WIDTH_CLASS[selectedPendingAspectRatio],
                      )}
                      label={pendingMainLabel(
                        selectedThread,
                        selectedPendingAspectRatio,
                      )}
                    />
                  </>
                ) : selectedIteration ? (
                  <>
                    <ZoomableImage
                      src={selectedIteration.imageUrl}
                      alt={selectedThread.title}
                      imageClassName="max-h-[calc(100vh-var(--chat-safe-padding,0px)-11rem)] max-w-full object-contain"
                    />
                  </>
                ) : null}
              </div>
            </div>

            {error ? (
              <div className="border-destructive/40 bg-destructive/10 text-destructive absolute bottom-[calc(var(--chat-safe-padding,0px)+1rem)] left-1/2 z-10 w-[min(720px,calc(100%-2rem))] -translate-x-1/2 rounded-lg border px-3 py-2 text-sm">
                {error}
              </div>
            ) : null}
          </section>
        </div>

        {isDraggingImages ? (
          <div className="bg-background/72 pointer-events-none absolute inset-0 z-20 flex items-center justify-center backdrop-blur-sm">
            <div className="border-border/70 bg-background/90 text-muted-foreground rounded-lg border px-4 py-2 text-sm shadow-lg">
              Drop images
            </div>
          </div>
        ) : null}

        {importPending ? (
          <div className="text-muted-foreground bg-background/85 fixed bottom-[calc(var(--chat-safe-padding,0px)+1rem)] left-1/2 z-30 -translate-x-1/2 rounded-full border px-3 py-1.5 text-xs shadow-sm">
            Importing
          </div>
        ) : null}

        {removeBackground.isPending ? (
          <div className="text-muted-foreground bg-background/85 fixed bottom-[calc(var(--chat-safe-padding,0px)+1rem)] left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border px-3 py-1.5 text-xs shadow-sm">
            <Loader2 className="size-3 animate-spin" />
            Removing background
          </div>
        ) : null}

        {importChoiceDialog}
        {deleteIterationDialog}
        {removeBgKeyDialog}
      </main>
    )
  }

  return (
    <main
      className="image-view-emerge bg-background text-foreground relative flex h-full min-h-0 flex-col overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header className="sr-only">
        <div className="flex min-w-0 items-center gap-2">
          {threads.length > 0 ? (
            <span className="text-muted-foreground text-xs">
              {threads.length} {threads.length === 1 ? 'thread' : 'threads'}
            </span>
          ) : null}
        </div>
      </header>

      <section className="relative min-h-0 flex-1 overflow-y-auto px-3 py-3 pb-[calc(var(--chat-safe-padding,0px)+8rem)] sm:px-4 sm:py-4">
        {imagesQuery.isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="text-muted-foreground size-4 animate-spin" />
          </div>
        ) : threads.length === 0 ? (
          <div className="flex h-full items-center justify-center pb-24">
            <div className="text-muted-foreground flex flex-col items-center gap-3 text-sm">
              <ImageIcon className="size-5" />
              <span>Drop images here</span>
            </div>
          </div>
        ) : (
          <div className="relative grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-x-4 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(168px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(196px,1fr))]">
            {threads.map((thread) => {
              const isGenerating = thread.status === 'generating'
              const isFailed = thread.status === 'failed'
              const generatingAspectRatio =
                pendingIterationsForThread(thread).at(-1)?.aspectRatio ??
                thread.aspectRatio
              const canOpen = Boolean(thread.latestImageUrl) || isFailed
              const displayedIteration = thread.coverIterationId
                ? thread.iterations.find(
                    (iteration) => iteration.id === thread.coverIterationId,
                  )
                : thread.iterations.at(-1)
              const isGroup = thread.iterations.length > 1
              const isGalleryAlbumHovered = hoveredGalleryThreadId === thread.id
              const galleryAlbumIterations =
                isGroup && displayedIteration
                  ? thread.iterations
                      .filter(
                        (iteration) => iteration.id !== displayedIteration.id,
                      )
                      .slice(-GALLERY_ALBUM_PREVIEW_LIMIT)
                      .reverse()
                  : []
              const hiddenGalleryAlbumCount = Math.max(
                0,
                thread.iterations.length -
                  (displayedIteration ? 1 : 0) -
                  galleryAlbumIterations.length,
              )
              const galleryAlbumItemCount =
                galleryAlbumIterations.length +
                (hiddenGalleryAlbumCount > 0 ? 1 : 0)
              const galleryAlbumColumnCount = Math.min(
                GALLERY_ALBUM_PREVIEW_MAX_COLUMNS,
                Math.max(1, Math.ceil(Math.sqrt(galleryAlbumItemCount))),
              )
              const galleryAlbumSurfaceWidth =
                galleryAlbumColumnCount * GALLERY_ALBUM_PREVIEW_SIZE +
                Math.max(0, galleryAlbumColumnCount - 1) *
                  GALLERY_ALBUM_PREVIEW_GAP
              const galleryAlbumRowCount = Math.ceil(
                galleryAlbumItemCount / galleryAlbumColumnCount,
              )
              const galleryAlbumSurfaceHeight =
                galleryAlbumRowCount * GALLERY_ALBUM_PREVIEW_SIZE +
                Math.max(0, galleryAlbumRowCount - 1) *
                  GALLERY_ALBUM_PREVIEW_GAP
              const galleryAlbumSurfaceOuterWidth =
                galleryAlbumSurfaceWidth + 16
              const galleryAlbumPreviewItems = [
                ...galleryAlbumIterations.map((iteration) => ({
                  id: iteration.id,
                  type: 'image' as const,
                  iteration,
                })),
                ...(hiddenGalleryAlbumCount > 0
                  ? [
                      {
                        id: `${thread.id}-more`,
                        type: 'more' as const,
                        count: hiddenGalleryAlbumCount,
                      },
                    ]
                  : []),
              ]

              return (
                <div
                  key={thread.id}
                  className={cn(
                    'group relative min-w-0',
                    isGalleryAlbumHovered ? 'z-30' : 'z-0',
                  )}
                  onMouseEnter={(event) => {
                    if (isGroup && galleryAlbumItemCount > 0) {
                      openGalleryAlbum(
                        thread.id,
                        event.currentTarget.getBoundingClientRect(),
                        galleryAlbumSurfaceOuterWidth,
                      )
                    }
                  }}
                  onMouseLeave={() => {
                    if (isGalleryAlbumHovered) closeGalleryAlbum()
                  }}
                  onFocus={(event) => {
                    if (isGroup && galleryAlbumItemCount > 0) {
                      openGalleryAlbum(
                        thread.id,
                        event.currentTarget.getBoundingClientRect(),
                        galleryAlbumSurfaceOuterWidth,
                      )
                    }
                  }}
                  onBlur={(event) => {
                    if (
                      isGalleryAlbumHovered &&
                      !event.currentTarget.contains(event.relatedTarget)
                    ) {
                      closeGalleryAlbum()
                    }
                  }}
                >
                  <button
                    type="button"
                    className={cn(
                      'focus-visible:ring-ring focus-visible:ring-offset-background relative block w-full overflow-visible rounded-[1.35rem] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-default',
                      canOpen ? 'cursor-pointer' : 'cursor-default',
                    )}
                    disabled={!canOpen}
                    aria-label={
                      isGroup
                        ? `Open ${thread.title}, ${thread.iterations.length - 1} more ${thread.iterations.length === 2 ? 'image' : 'images'}`
                        : `Open ${thread.title}`
                    }
                    onClick={() => {
                      openThread(thread)
                    }}
                  >
                    <span className="bg-muted ring-border/35 relative z-20 block aspect-square w-full overflow-hidden rounded-[1.35rem] shadow-sm ring-1 transition-[translate,scale,box-shadow] duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover:-translate-y-1 group-hover:scale-[1.018] group-hover:shadow-xl group-focus-visible:-translate-y-1 group-focus-visible:scale-[1.018] motion-reduce:transition-none">
                      {isGenerating && !displayedIteration ? (
                        <GenerationLoadingPreview
                          aspectRatio={generatingAspectRatio}
                          className="size-full rounded-none"
                          label={null}
                        />
                      ) : displayedIteration ? (
                        <img
                          src={displayedIteration.imageUrl}
                          alt={thread.title}
                          className="size-full object-cover"
                          draggable="false"
                        />
                      ) : isFailed ? (
                        <span className="bg-muted/45 border-border/50 flex size-full flex-col justify-between border p-3">
                          <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
                            Generation failed
                          </span>
                          <span className="text-foreground line-clamp-3 text-xs font-medium leading-5">
                            {thread.title}
                          </span>
                          <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                            <ImageIcon className="size-3.5" />
                            Open details
                          </span>
                        </span>
                      ) : null}

                      {!isFailed && thread.title.trim() ? (
                        <span className="from-background/85 via-background/40 pointer-events-none absolute inset-x-0 bottom-0 flex min-h-16 items-end bg-gradient-to-t to-transparent p-3">
                          <span className="text-foreground line-clamp-2 text-base font-semibold leading-5 drop-shadow-sm sm:text-lg sm:leading-6">
                            {thread.title}
                          </span>
                        </span>
                      ) : null}
                    </span>
                  </button>

                  {isGroup && galleryAlbumItemCount > 0 ? (
                    <div
                      className={cn(
                        'absolute top-full z-30 block pt-3 transition-[opacity,transform] duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
                        galleryAlbumAlign === 'right' ? 'right-0' : 'left-0',
                      )}
                      style={{
                        width: galleryAlbumSurfaceOuterWidth,
                        opacity:
                          isGalleryAlbumHovered && isGalleryAlbumOpen ? 1 : 0,
                        transform:
                          isGalleryAlbumHovered && isGalleryAlbumOpen
                            ? 'scale(1)'
                            : 'scale(0.96)',
                        transformOrigin:
                          galleryAlbumAlign === 'right'
                            ? 'top right'
                            : 'top left',
                      }}
                    >
                      <div
                        className="relative block rounded-xl p-2"
                        style={{
                          width: galleryAlbumSurfaceOuterWidth,
                          height: galleryAlbumSurfaceHeight + 16,
                        }}
                      >
                        {galleryAlbumPreviewItems.map(
                          (item, index, albumItems) => {
                            const column = index % galleryAlbumColumnCount
                            const row = Math.floor(
                              index / galleryAlbumColumnCount,
                            )
                            const openX =
                              column *
                              (GALLERY_ALBUM_PREVIEW_SIZE +
                                GALLERY_ALBUM_PREVIEW_GAP)
                            const openY =
                              row *
                              (GALLERY_ALBUM_PREVIEW_SIZE +
                                GALLERY_ALBUM_PREVIEW_GAP)
                            const closeDelay = Math.max(
                              0,
                              albumItems.length - index - 1,
                            )

                            return (
                              <button
                                key={item.id}
                                type="button"
                                className="group/album-preview-item focus-visible:ring-ring focus-visible:ring-offset-background absolute left-2 top-2 block cursor-pointer overflow-hidden rounded-md bg-transparent p-0 text-left outline-none transition-[opacity,transform,box-shadow] duration-[240ms] ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:transition-none"
                                style={{
                                  width: GALLERY_ALBUM_PREVIEW_SIZE,
                                  height: GALLERY_ALBUM_PREVIEW_SIZE,
                                  opacity:
                                    isGalleryAlbumHovered && isGalleryAlbumOpen
                                      ? 1
                                      : 0,
                                  transform:
                                    isGalleryAlbumHovered && isGalleryAlbumOpen
                                      ? `translate3d(${openX}px, ${openY}px, 0) scale(1) rotate(0deg)`
                                      : `translate3d(0px, 0px, 0) scale(0.72) rotate(${-8 + index * 2}deg)`,
                                  transformOrigin: 'left top',
                                  transitionDelay:
                                    isGalleryAlbumHovered && isGalleryAlbumOpen
                                      ? `${Math.min(index * 28, 130)}ms`
                                      : `${Math.min(closeDelay * 18, 120)}ms`,
                                }}
                                aria-label={
                                  item.type === 'image'
                                    ? `Open image ${index + 1} in ${thread.title}`
                                    : `Open ${thread.title}, ${item.count} more images`
                                }
                                onClick={(event) => {
                                  event.stopPropagation()
                                  openThread(
                                    thread,
                                    item.type === 'image'
                                      ? item.iteration.id
                                      : selectedIterationIdForThread(thread),
                                  )
                                  closeGalleryAlbum()
                                }}
                              >
                                {item.type === 'image' ? (
                                  <img
                                    src={item.iteration.imageUrl}
                                    alt=""
                                    className="size-full object-contain transition-[translate,scale,filter] duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/album-preview-item:-translate-y-0.5 group-hover/album-preview-item:scale-[1.045] group-focus-visible/album-preview-item:-translate-y-0.5 group-focus-visible/album-preview-item:scale-[1.045] motion-reduce:transition-none"
                                    draggable="false"
                                  />
                                ) : (
                                  <span className="border-border/70 bg-background/85 text-muted-foreground flex size-full items-center justify-center rounded-md border font-mono text-sm font-semibold shadow-sm">
                                    +{item.count}
                                  </span>
                                )}
                              </button>
                            )
                          },
                        )}
                      </div>
                    </div>
                  ) : null}

                  {isFailed ? (
                    <button
                      type="button"
                      className="border-border/60 bg-muted/35 text-muted-foreground hover:bg-muted hover:text-foreground mt-2 flex h-7 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border text-xs font-medium transition-colors disabled:cursor-default disabled:opacity-60"
                      disabled={retryGeneration.isPending}
                      onClick={() => {
                        openThread(thread, null)
                        retryGeneration.mutate({
                          threadId: thread.id,
                          workspaceId,
                        })
                      }}
                    >
                      {retryGeneration.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="size-3.5" />
                      )}
                      Retry
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}

        {isDraggingImages ? (
          <div className="bg-background/72 pointer-events-none absolute inset-0 z-20 flex items-center justify-center backdrop-blur-sm">
            <div className="border-border/70 bg-background/90 text-muted-foreground rounded-lg border px-4 py-2 text-sm shadow-lg">
              Drop images
            </div>
          </div>
        ) : null}

        {importPending ? (
          <div className="text-muted-foreground bg-background/85 fixed bottom-[calc(var(--chat-safe-padding,0px)+1rem)] left-1/2 z-30 -translate-x-1/2 rounded-full border px-3 py-1.5 text-xs shadow-sm">
            Importing
          </div>
        ) : null}

        {error ? (
          <div className="border-destructive/40 bg-destructive/10 text-destructive sticky bottom-4 z-30 mx-auto mt-4 w-[min(720px,100%)] rounded-lg border px-3 py-2 text-sm">
            {error}
          </div>
        ) : null}
      </section>

      {importChoiceDialog}

      <Dialog
        open={Boolean(failedDialogThread)}
        onOpenChange={(open) => {
          if (!open) {
            closeSelectedThread('pop')
          }
        }}
      >
        {failedDialogThread ? (
          <DialogContent
            showCloseButton={false}
            className="top-[calc((100dvh-var(--chat-safe-padding,0px))/2)] h-[calc(100dvh-var(--chat-safe-padding,0px)-1.5rem)] w-[calc(100vw-1.5rem)] max-w-none overflow-hidden rounded-xl border-0 p-0 shadow-2xl sm:max-w-none"
          >
            <DialogTitle className="sr-only">
              Failed image generation
            </DialogTitle>
            <DialogDescription className="sr-only">
              Image generation failed. Review the prompt, error, and retry the
              same image generation.
            </DialogDescription>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="absolute right-4 top-4 z-20 cursor-pointer shadow-sm"
              aria-label="Close failed image dialog"
              onClick={() => closeSelectedThread('pop')}
            >
              <X className="size-3.5" />
            </Button>

            <section className="grid h-full min-h-0 grid-cols-1 content-start gap-6 overflow-auto px-4 pb-6 pt-14 sm:px-6 md:grid-cols-[minmax(260px,0.95fr)_minmax(280px,0.75fr)] md:items-center md:gap-8 md:px-8 md:py-10 lg:grid-cols-[minmax(0,1.18fr)_minmax(340px,0.82fr)] lg:gap-16 lg:px-14 lg:py-16">
              <div className="flex min-h-0 items-center justify-center">
                <div className="bg-muted/45 relative aspect-square w-[min(100%,clamp(12rem,calc(100dvh-var(--chat-safe-padding,0px)-16rem),26rem))] overflow-hidden rounded-sm md:w-[min(100%,clamp(18rem,calc(100dvh-var(--chat-safe-padding,0px)-8rem),42rem))] xl:w-[min(100%,clamp(22rem,calc(100dvh-var(--chat-safe-padding,0px)-7rem),45rem))]">
                  {failedDialogThread.status === 'generating' ? (
                    <GenerationLoadingPreview
                      aspectRatio={failedDialogThread.aspectRatio}
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <ImageIcon className="text-muted-foreground/65 size-6" />
                    </div>
                  )}
                </div>
              </div>

              <aside className="mx-auto flex w-full min-w-0 max-w-xl flex-col justify-center md:max-w-none">
                <p className="text-foreground/80 max-w-[64ch] break-words text-base leading-7 md:text-[17px] md:leading-8">
                  {failedDialogThread.prompt}
                </p>
                <div className="text-muted-foreground mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                  <span>gpt-image-2</span>
                  <span>quality: {failedDialogThread.quality ?? 'medium'}</span>
                  <span>
                    aspect: {aspectLabel(failedDialogThread.aspectRatio).ratio}
                  </span>
                </div>
                {failedDialogThread.errorMessage &&
                failedDialogThread.status !== 'generating' ? (
                  <p className="text-destructive mt-5 text-sm leading-6">
                    {failedDialogThread.errorMessage}
                  </p>
                ) : null}
                <div className="mt-6 flex items-center gap-2">
                  <button
                    type="button"
                    className="bg-foreground text-background hover:bg-foreground/85 flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors disabled:cursor-default disabled:opacity-60"
                    disabled={
                      retryGeneration.isPending ||
                      failedDialogThread.status === 'generating'
                    }
                    onClick={() =>
                      retryGeneration.mutate({
                        threadId: failedDialogThread.id,
                        workspaceId,
                      })
                    }
                  >
                    {retryGeneration.isPending ||
                    failedDialogThread.status === 'generating' ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="size-3.5" />
                    )}
                    {failedDialogThread.status === 'generating'
                      ? 'Retrying'
                      : 'Retry'}
                  </button>
                </div>
              </aside>
            </section>
          </DialogContent>
        ) : null}
      </Dialog>
    </main>
  )
}
