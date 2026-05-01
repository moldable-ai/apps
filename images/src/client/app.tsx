import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  Image as ImageIcon,
  Loader2,
  PanelTop,
  RotateCcw,
  Shuffle,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { flushSync } from 'react-dom'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  cn,
  downloadFile,
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
  kind: 'generation' | 'edit' | 'upload'
  aspectRatio: AspectRatioId
  size: string
  quality: ImageQuality
  mimeType: string
  model?: string
  width?: number
  height?: number
  originalName?: string
  imageUrl: string
  createdAt: string
}

type PendingIteration = {
  kind: 'edit'
  prompt: string
  aspectRatio: AspectRatioId
  quality: ImageQuality
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
  coverIterationId?: string
  createdAt: string
  updatedAt: string
  latestImageUrl: string | null
  iterations: ImageIteration[]
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

type ViewTransitionDocument = Document & {
  startViewTransition?: (updateCallback: () => void) => unknown
}

const ASPECT_RATIOS: AspectRatio[] = [
  { id: 'square', label: 'Square', ratio: '1:1' },
  { id: 'portrait', label: 'Portrait', ratio: '3:4' },
  { id: 'story', label: 'Story', ratio: '9:16' },
  { id: 'landscape', label: 'Landscape', ratio: '4:3' },
  { id: 'widescreen', label: 'Widescreen', ratio: '16:9' },
]

const PENDING_ITERATION_ID = '__pending_iteration__'

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

function aspectLabel(id: AspectRatioId) {
  return ASPECT_RATIOS.find((ratio) => ratio.id === id) ?? ASPECT_RATIOS[0]
}

function sendToChatInput(text: string) {
  window.parent.postMessage({ type: 'moldable:set-chat-input', text }, '*')
}

function transitionNameForThread(threadId: string) {
  return `image-thread-${threadId.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

function runViewTransition(update: () => void) {
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches
  const startViewTransition = (document as ViewTransitionDocument)
    .startViewTransition

  if (!startViewTransition || prefersReducedMotion) {
    update()
    return
  }

  startViewTransition.call(document, () => {
    flushSync(update)
  })
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

function pendingAspectRatio(thread: ImageThread | null): AspectRatioId | null {
  return thread?.status === 'generating' && thread.pendingIteration
    ? thread.pendingIteration.aspectRatio
    : null
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
  return pendingAspectRatio(thread)
    ? PENDING_ITERATION_ID
    : (thread.coverIterationId ?? thread.iterations.at(-1)?.id ?? null)
}

function selectableIterationIds(thread: ImageThread): string[] {
  const ids = thread.iterations.map((iteration) => iteration.id)
  if (pendingAspectRatio(thread)) ids.push(PENDING_ITERATION_ID)
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
  return Array.from(fileList).filter((file) => file.type.startsWith('image/'))
}

function imagePathsFromList(paths: string[]): string[] {
  return paths.filter((path) =>
    /\.(png|jpe?g|webp|gif|svg|heic|heif)$/i.test(path),
  )
}

function hasFileDrag(event: DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes('Files')
}

function naturalAspectStyle(iteration?: ImageIteration | null) {
  if (!iteration?.width || !iteration.height) return undefined
  return { aspectRatio: `${iteration.width} / ${iteration.height}` }
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
      <button
        type="button"
        className="border-border bg-background hover:bg-muted flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2 text-xs font-medium shadow-sm transition-colors disabled:cursor-default disabled:opacity-60"
        disabled={busy}
        onClick={() => setOpen((next) => !next)}
      >
        <PanelTop className="text-muted-foreground size-3.5" />
        <span>Aspect</span>
        <span className="text-muted-foreground font-mono">{current.ratio}</span>
        <ChevronDown className="text-muted-foreground size-3.5" />
      </button>

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
  const dragDepthRef = useRef(0)
  const [downloadingIterationId, setDownloadingIterationId] = useState<
    string | null
  >(null)
  const [copiedPromptIterationId, setCopiedPromptIterationId] = useState<
    string | null
  >(null)
  const thumbnailScrollRef = useRef<HTMLDivElement | null>(null)
  const [thumbnailScrollState, setThumbnailScrollState] = useState({
    canScrollUp: false,
    canScrollDown: false,
  })

  const updateThumbnailScrollState = useCallback(() => {
    const node = thumbnailScrollRef.current
    if (!node) return

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

  const threads = useMemo(() => imagesQuery.data ?? [], [imagesQuery.data])
  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [selectedThreadId, threads],
  )
  const selectedPendingAspectRatio =
    selectedThread &&
    selectedIterationId === PENDING_ITERATION_ID &&
    pendingAspectRatio(selectedThread)
      ? pendingAspectRatio(selectedThread)
      : null
  const selectedIteration = selectedPendingAspectRatio
    ? null
    : (selectedThread?.iterations.find(
        (iteration) => iteration.id === selectedIterationId,
      ) ??
      selectedThread?.iterations.at(-1) ??
      null)

  useEffect(() => {
    if (selectedThreadId && !selectedThread && threads.length > 0) {
      setSelectedThreadId(null)
      setSelectedIterationId(null)
    }
  }, [selectedThread, selectedThreadId, threads.length])

  useEffect(() => {
    if (selectedThread && !selectedIterationId) {
      setSelectedIterationId(selectedIterationIdForThread(selectedThread))
    }
  }, [selectedIterationId, selectedThread])

  useEffect(() => {
    if (
      selectedThread &&
      selectedIterationId === PENDING_ITERATION_ID &&
      !pendingAspectRatio(selectedThread)
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
        : `Images app is open to image thread ${selectedThread.id}. Drive this app only through app RPC methods. To edit the current image, call images.edit with { id: "${selectedThread.id}", prompt, aspectRatio? }. To change ratio, call images.setAspectRatio with { id: "${selectedThread.id}", aspectRatio }. Use images.get to inspect iteration history.`
      : `Images app grid is open. Drive this app only through app RPC methods. To create a new image thread, call images.generate with { prompt, aspectRatio } when the user specifies a ratio; otherwise omit aspectRatio. To retry a failed generation, call images.retry with { id }. Use images.list or images.get to inspect existing image history.`

    window.parent.postMessage(
      {
        type: 'moldable:set-chat-instructions',
        text: context,
      },
      '*',
    )
  }, [selectedThread])

  const setAspectRatio = useMutation({
    mutationFn: async ({
      threadId,
      aspectRatio,
    }: {
      threadId: string
      aspectRatio: AspectRatioId
    }) => {
      const response = await fetchWithWorkspace('/api/moldable/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'images.setAspectRatio',
          params: { id: threadId, aspectRatio },
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
    onSuccess: (thread) => {
      setError(null)
      queryClient.setQueryData<ImageThread[]>(
        ['images', workspaceId],
        (current) => upsertThread(current, thread),
      )
      setSelectedIterationId(selectedIterationIdForThread(thread))
      void queryClient.invalidateQueries({ queryKey: ['images', workspaceId] })
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to change aspect ratio',
      )
    },
  })

  const retryGeneration = useMutation({
    mutationFn: async (threadId: string) => {
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
    onSuccess: () => {
      setError(null)
      void queryClient.invalidateQueries({ queryKey: ['images', workspaceId] })
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to retry image generation',
      )
    },
  })

  const importImages = useMutation({
    mutationFn: async ({
      files,
      mode,
    }: {
      files: File[]
      mode: ImportMode
    }) => {
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
    onSuccess: (imported) => {
      setError(null)
      setPendingImportFiles([])
      setPendingImportPaths([])
      queryClient.setQueryData<ImageThread[]>(
        ['images', workspaceId],
        (current) => [...imported, ...(current ?? [])],
      )
      void queryClient.invalidateQueries({ queryKey: ['images', workspaceId] })
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to import images',
      )
    },
  })

  const importImagePaths = useMutation({
    mutationFn: async ({
      paths,
      mode,
    }: {
      paths: string[]
      mode: ImportMode
    }) => {
      const response = await fetchWithWorkspace('/api/images/import-paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths, mode }),
      })
      return parseResponse<ImageThread[]>(response, 'Failed to import images')
    },
    onSuccess: (imported) => {
      setError(null)
      setPendingImportFiles([])
      setPendingImportPaths([])
      queryClient.setQueryData<ImageThread[]>(
        ['images', workspaceId],
        (current) => [...imported, ...(current ?? [])],
      )
      void queryClient.invalidateQueries({ queryKey: ['images', workspaceId] })
    },
    onError: (mutationError) => {
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
      importImages.mutate({ files, mode })
    },
    [importImages],
  )

  const importDroppedPaths = useCallback(
    (paths: string[], mode: ImportMode) => {
      if (paths.length === 0) return
      setError(null)
      setPendingImportFiles([])
      importImagePaths.mutate({ paths, mode })
    },
    [importImagePaths],
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
    setAspectRatio.isPending || Boolean(pendingAspectRatio(selectedThread))
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
    const thumbnailItems = [
      ...selectedThread.iterations.map((iteration, index) => ({
        id: iteration.id,
        type: 'image' as const,
        imageUrl: iteration.imageUrl,
        aspectRatio: iteration.aspectRatio,
        label: `View iteration ${index + 1}`,
        isSelected: selectedIteration?.id === iteration.id,
      })),
      ...(pendingAspectRatio(selectedThread)
        ? [
            {
              id: PENDING_ITERATION_ID,
              type: 'pending' as const,
              imageUrl: null,
              aspectRatio: displayedAspectRatio,
              label: pendingMainLabel(selectedThread, displayedAspectRatio),
              isSelected: Boolean(selectedPendingAspectRatio),
            },
          ]
        : []),
    ]
    let thumbnailOffset = 0
    const thumbnailStack = thumbnailItems.map((item) => {
      const offset = thumbnailOffset
      const visualSize = item.isSelected
        ? THUMBNAIL_SELECTED_SIZE
        : THUMBNAIL_SIZE
      thumbnailOffset += visualSize + THUMBNAIL_GAP
      return { ...item, offset }
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

    return (
      <main
        className="text-foreground relative flex h-full min-h-0 flex-col overflow-hidden"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <header className="border-border/70 flex h-12 shrink-0 items-center justify-between border-b px-4">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="cursor-pointer"
            aria-label="Close image"
            onClick={() => {
              runViewTransition(() => {
                setSelectedThreadId(null)
                setSelectedIterationId(null)
              })
            }}
          >
            <X className="size-3.5" />
          </Button>
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
                })
              }}
            />
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="cursor-pointer"
                aria-label="Remix image"
                title="Remix image"
                disabled={!selectedIteration}
                onClick={() => sendToChatInput('Remix this image: ')}
              >
                <Shuffle className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="cursor-pointer"
                aria-label="Copy prompt"
                title="Copy prompt"
                disabled={!canCopyPrompt}
                onClick={() => void handleCopyPrompt()}
              >
                {isPromptCopied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
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
                title="Download image"
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
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[84px_minmax(0,1fr)] overflow-hidden">
          <aside className="relative min-h-0 overflow-hidden">
            <div
              ref={thumbnailScrollRef}
              className="h-full overflow-y-auto px-2 py-4 pb-[calc(var(--chat-safe-padding,0px)+7rem)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onScroll={updateThumbnailScrollState}
            >
              <div
                className="relative mx-auto w-[74px] rounded-xl"
                style={{ height: thumbnailStackHeight }}
              >
                {thumbnailStack.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      'focus-visible:ring-ring absolute cursor-pointer select-none overflow-hidden text-left transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2',
                      item.isSelected ? 'z-10' : 'z-0',
                    )}
                    style={{
                      left: 6,
                      width: THUMBNAIL_SIZE,
                      height: THUMBNAIL_SIZE,
                      transform: `translateY(${item.offset}px) scale(${
                        item.isSelected ? THUMBNAIL_SELECTED_SCALE : 1
                      })`,
                      transformOrigin: 'left top',
                      borderRadius: 6,
                    }}
                    aria-label={item.label}
                    aria-current={item.isSelected ? 'true' : undefined}
                    data-selected-thumbnail={
                      item.isSelected ? 'true' : undefined
                    }
                    onClick={() => setSelectedIterationId(item.id)}
                  >
                    {item.type === 'pending' ? (
                      <GenerationLoadingPreview
                        aspectRatio={item.aspectRatio}
                        className="size-full rounded-none"
                        label={null}
                      />
                    ) : (
                      <img
                        src={item.imageUrl}
                        alt=""
                        draggable="false"
                        className="pointer-events-none size-full select-none object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
            {thumbnailScrollState.canScrollUp ? (
              <div className="from-background via-background/80 to-background/0 pointer-events-none absolute inset-x-0 top-0 z-20 h-12 bg-gradient-to-b" />
            ) : null}
            {thumbnailScrollState.canScrollDown ? (
              <div className="from-background via-background/80 to-background/0 pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t" />
            ) : null}
          </aside>

          <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-auto px-8 py-8 pb-[calc(var(--chat-safe-padding,0px)+1rem)]">
              <div className="mx-auto flex min-h-full max-w-6xl -translate-x-[42px] flex-col items-center justify-center gap-5">
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
                      style={{
                        viewTransitionName: transitionNameForThread(
                          selectedThread.id,
                        ),
                      }}
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

        {importChoiceDialog}
      </main>
    )
  }

  return (
    <main
      className="bg-background text-foreground relative flex h-full min-h-0 flex-col overflow-hidden"
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
          <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
            {threads.map((thread) => {
              const isGenerating = thread.status === 'generating'
              const isFailed = thread.status === 'failed'
              const generatingAspectRatio =
                pendingAspectRatio(thread) ?? thread.aspectRatio
              const canOpen = Boolean(thread.latestImageUrl) || isFailed
              const displayedIteration = thread.coverIterationId
                ? thread.iterations.find(
                    (iteration) => iteration.id === thread.coverIterationId,
                  )
                : thread.iterations.at(-1)
              const isGroup = thread.iterations.length > 1
              const stackIterations =
                isGroup && displayedIteration
                  ? thread.iterations
                      .filter(
                        (iteration) => iteration.id !== displayedIteration.id,
                      )
                      .slice(-2)
                      .reverse()
                  : []
              const previewAspectClass = displayedIteration
                ? !displayedIteration.width || !displayedIteration.height
                  ? ASPECT_PREVIEW_CLASS[displayedIteration.aspectRatio]
                  : ''
                : ASPECT_PREVIEW_CLASS[generatingAspectRatio]
              const previewAspectStyle = naturalAspectStyle(displayedIteration)
              const previewTransitionStyle = displayedIteration
                ? {
                    ...previewAspectStyle,
                    viewTransitionName: transitionNameForThread(thread.id),
                  }
                : previewAspectStyle

              return (
                <div key={thread.id} className="min-w-0 p-3">
                  <button
                    type="button"
                    className={cn(
                      'focus-visible:ring-ring group relative block w-full text-left focus-visible:outline-none focus-visible:ring-2 disabled:cursor-default',
                      canOpen ? 'cursor-pointer' : 'cursor-default',
                    )}
                    disabled={!canOpen}
                    onClick={() => {
                      runViewTransition(() => {
                        setSelectedThreadId(thread.id)
                        setSelectedIterationId(
                          selectedIterationIdForThread(thread),
                        )
                      })
                    }}
                  >
                    {stackIterations.map((iteration, index) => (
                      <span
                        key={iteration.id}
                        aria-hidden="true"
                        className={cn(
                          'absolute inset-0 z-0 block overflow-hidden rounded-md transition-transform duration-300 ease-out will-change-transform motion-reduce:transition-none',
                          previewAspectClass,
                          index === 0
                            ? 'translate-x-0.5 translate-y-1.5 -rotate-3 group-hover:-translate-x-1 group-hover:translate-y-2.5 group-hover:-rotate-6 group-hover:scale-[1.01]'
                            : 'translate-x-2 translate-y-2.5 rotate-3 group-hover:translate-x-3.5 group-hover:translate-y-3.5 group-hover:rotate-6 group-hover:scale-[1.015]',
                        )}
                        style={previewAspectStyle}
                      >
                        <img
                          src={iteration.imageUrl}
                          alt=""
                          className="size-full object-cover"
                          draggable="false"
                        />
                      </span>
                    ))}
                    <span
                      className={cn(
                        'relative z-10 block overflow-hidden rounded-md transition-transform duration-300 ease-out will-change-transform group-hover:-translate-x-0.5 group-hover:-translate-y-1 group-hover:scale-[1.012] motion-reduce:transition-none',
                        previewAspectClass,
                      )}
                      style={previewTransitionStyle}
                    >
                      {isGenerating ? (
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
                    </span>
                  </button>
                  {isFailed ? (
                    <button
                      type="button"
                      className="border-border/60 bg-muted/35 text-muted-foreground hover:bg-muted hover:text-foreground mt-2 flex h-7 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border text-xs font-medium transition-colors disabled:cursor-default disabled:opacity-60"
                      disabled={retryGeneration.isPending}
                      onClick={() => {
                        setSelectedThreadId(thread.id)
                        setSelectedIterationId(null)
                        retryGeneration.mutate(thread.id)
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
            setSelectedThreadId(null)
            setSelectedIterationId(null)
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
              onClick={() => {
                setSelectedThreadId(null)
                setSelectedIterationId(null)
              }}
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
                      retryGeneration.mutate(failedDialogThread.id)
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
