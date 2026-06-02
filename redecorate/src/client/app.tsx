import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Download,
  Heart,
  ImagePlus,
  Layers,
  Loader2,
  MoreVertical,
  PanelTop,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, DragEvent, ReactNode } from 'react'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
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
import { type Catalog, StyleLibrary } from './components/style-library'
import { ZoomableImage } from './components/zoomable-image'
import type { PromptTemplate, SpaceKind, StylePreset } from '../shared/catalog'

// ─── Types (mirror the server's serialized shapes) ───────────────────────────

type AspectRatioId =
  | 'square'
  | 'portrait'
  | 'story'
  | 'landscape'
  | 'widescreen'

type Iteration = {
  id: string
  prompt: string
  kind: 'generation' | 'edit' | 'upload' | 'background-removal'
  aspectRatio: AspectRatioId
  mimeType: string
  parentIterationId?: string
  imageUrl: string
  imagePath?: string
  createdAt: string
}

type PendingIteration = {
  id?: string
  kind: 'generation' | 'edit'
  prompt: string
  aspectRatio: AspectRatioId
  startedAt: string
}

type Design = {
  id: string
  title: string
  prompt: string
  aspectRatio: AspectRatioId
  status: 'generating' | 'ready' | 'failed'
  errorMessage?: string
  folderId?: string | null
  favorite?: boolean
  archived?: boolean
  presetId?: string
  coverIterationId?: string
  pendingIteration?: PendingIteration
  pendingIterations?: PendingIteration[]
  createdAt: string
  updatedAt: string
  latestImageUrl: string | null
  iterations: Iteration[]
}

type Folder = {
  id: string
  name: string
  emoji: string
  tone: string
  space: SpaceKind
  blurb?: string
  sortOrder?: number
  designCount: number
  covers: string[]
}

const ASPECT_RATIOS: { id: AspectRatioId; label: string; ratio: string }[] = [
  { id: 'square', label: 'Square', ratio: '1:1' },
  { id: 'landscape', label: 'Landscape', ratio: '4:3' },
  { id: 'widescreen', label: 'Widescreen', ratio: '16:9' },
  { id: 'portrait', label: 'Portrait', ratio: '3:4' },
  { id: 'story', label: 'Tall', ratio: '9:16' },
]

const ASPECT_PREVIEW_CLASS: Record<AspectRatioId, string> = {
  square: 'aspect-square',
  portrait: 'aspect-[3/4]',
  story: 'aspect-[9/16]',
  landscape: 'aspect-[4/3]',
  widescreen: 'aspect-[16/9]',
}

function aspectLabel(id: AspectRatioId) {
  return ASPECT_RATIOS.find((ratio) => ratio.id === id) ?? ASPECT_RATIOS[0]
}

// ─── Small helpers ───────────────────────────────────────────────────────────

function sendChatInstructions(text: string) {
  window.parent.postMessage(
    { type: 'moldable:set-chat-instructions', text },
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
  textarea.style.position = 'fixed'
  textarea.style.top = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    document.execCommand('copy')
  } finally {
    document.body.removeChild(textarea)
  }
}

async function parseJson<T>(response: Response, fallback: string): Promise<T> {
  const json = (await response.json().catch(() => null)) as
    | T
    | { error?: string }
    | null
  if (!response.ok) {
    const message =
      json && typeof json === 'object' && 'error' in json && json.error
        ? String(json.error)
        : fallback
    throw new Error(message)
  }
  return json as T
}

type RpcResponse<T> =
  | { ok: true; result: T }
  | { ok: false; error?: { message?: string } }

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

async function downloadIteration(iteration: Iteration) {
  const response = await fetch(iteration.imageUrl)
  if (!response.ok) throw new Error('Failed to read image for download')
  const mimeType = response.headers.get('content-type') ?? iteration.mimeType
  const extension = mimeType.includes('jpeg')
    ? 'jpg'
    : mimeType.includes('webp')
      ? 'webp'
      : 'png'
  await downloadFile({
    filename: `redecorate-${iteration.id}.${extension}`,
    data: arrayBufferToBase64(await response.arrayBuffer()),
    mimeType,
    isBase64: true,
  })
}

function imageFilesFromList(fileList: FileList): File[] {
  return Array.from(fileList).filter((file) => file.type.startsWith('image/'))
}

function imagePathsFromList(paths: string[]): string[] {
  return paths.filter((path) => /\.(png|jpe?g|webp|gif|heic|heif)$/i.test(path))
}

function hasFileDrag(event: DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes('Files')
}

function baseIterationFor(design: Design): Iteration | null {
  const upload = design.iterations.find(
    (iteration) => iteration.kind === 'upload',
  )
  return upload ?? design.iterations[0] ?? null
}

function pendingCount(design: Design): number {
  if (design.status !== 'generating') return 0
  const list = design.pendingIterations ?? []
  return (design.pendingIteration ? 1 : 0) + list.length
}

// ─── Shimmer ─────────────────────────────────────────────────────────────────

function Shimmer({
  aspectRatio = 'landscape',
  className,
  label,
}: {
  aspectRatio?: AspectRatioId
  className?: string
  label?: string | null
}) {
  return (
    <div
      className={cn(
        'image-generation-loading relative overflow-hidden rounded-xl',
        ASPECT_PREVIEW_CLASS[aspectRatio],
        className,
      )}
      aria-label={label ?? 'Rendering'}
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

// ─── Move-to-folder menu ─────────────────────────────────────────────────────

function MoveMenu({
  folders,
  design,
  onMove,
  onFavorite,
  onDelete,
}: {
  folders: Folder[]
  design: Design
  onMove: (folderId: string | null) => void
  onFavorite: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Design options"
          onClick={(event) => event.stopPropagation()}
          className={cn(
            'border-border/50 bg-background/80 text-foreground/80 hover:bg-background hover:text-foreground inline-flex size-7 cursor-pointer items-center justify-center rounded-full border backdrop-blur transition-all',
            'opacity-0 focus-visible:opacity-100 group-hover:opacity-100',
            open && 'opacity-100',
          )}
        >
          <MoreVertical className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={6}
        onClick={(event) => event.stopPropagation()}
        className="w-[230px] p-1"
      >
        <button
          type="button"
          onClick={() => {
            onFavorite()
            setOpen(false)
          }}
          className="hover:bg-muted/55 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px]"
        >
          <Heart
            className={cn(
              'size-3.5',
              design.favorite
                ? 'fill-rose-500 text-rose-500'
                : 'text-muted-foreground',
            )}
          />
          {design.favorite ? 'Remove favorite' : 'Add to favorites'}
        </button>
        <div className="bg-border/40 my-1 h-px" />
        <p className="text-muted-foreground/80 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em]">
          Move to
        </p>
        {design.folderId ? (
          <button
            type="button"
            onClick={() => {
              onMove(null)
              setOpen(false)
            }}
            className="hover:bg-muted/55 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px]"
          >
            <Layers className="text-muted-foreground size-3.5" />
            All designs (no folder)
          </button>
        ) : null}
        {folders.map((folder) => {
          const isCurrent = folder.id === design.folderId
          return (
            <button
              key={folder.id}
              type="button"
              onClick={() => {
                if (!isCurrent) onMove(folder.id)
                setOpen(false)
              }}
              className="hover:bg-muted/55 flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px]"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <span className="text-sm leading-none">{folder.emoji}</span>
                <span className="truncate">{folder.name}</span>
              </span>
              {isCurrent ? (
                <Check className="text-muted-foreground size-3.5" />
              ) : null}
            </button>
          )
        })}
        <div className="bg-border/40 my-1 h-px" />
        <button
          type="button"
          onClick={() => {
            onDelete()
            setOpen(false)
          }}
          className="text-destructive hover:bg-destructive/10 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px]"
        >
          <Trash2 className="size-3.5" />
          Delete design…
        </button>
      </PopoverContent>
    </Popover>
  )
}

// ─── Folder & design cards ───────────────────────────────────────────────────

function CoverMosaic({ covers, tone }: { covers: string[]; tone: string }) {
  if (covers.length === 0) {
    return (
      <div
        className="flex size-full items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${tone}22, ${tone}05)` }}
      >
        <ImagePlus className="text-foreground/25 size-7" />
      </div>
    )
  }
  if (covers.length === 1) {
    return (
      <img
        src={covers[0]}
        alt=""
        draggable="false"
        className="size-full object-cover"
      />
    )
  }
  const shown = covers.slice(0, covers.length >= 4 ? 4 : 2)
  return (
    <div
      className={cn(
        'grid size-full gap-0.5',
        shown.length >= 4 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-2',
      )}
    >
      {shown.map((cover, index) => (
        <img
          key={index}
          src={cover}
          alt=""
          draggable="false"
          className="size-full object-cover"
        />
      ))}
    </div>
  )
}

function FolderCard({
  folder,
  index,
  onOpen,
}: {
  folder: Folder
  index: number
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{ animationDelay: `${Math.min(index, 16) * 32}ms` }}
      className="animate-rd-card-in focus-visible:ring-ring group relative block w-full cursor-pointer overflow-hidden rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2"
    >
      <div className="bg-muted ring-border/35 relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-sm ring-1 transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-xl">
        <CoverMosaic covers={folder.covers} tone={folder.tone} />
        <div className="from-background/90 via-background/30 pointer-events-none absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t to-transparent p-3.5 pt-12">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base leading-none">{folder.emoji}</span>
              <h3 className="rd-serif text-foreground truncate text-lg font-semibold leading-tight drop-shadow-sm">
                {folder.name}
              </h3>
            </div>
            <p className="text-foreground/70 rd-mono mt-0.5 text-[11px]">
              {folder.designCount}{' '}
              {folder.designCount === 1 ? 'design' : 'designs'}
            </p>
          </div>
        </div>
      </div>
    </button>
  )
}

function DesignCard({
  design,
  index,
  folders,
  onOpen,
  onMove,
  onFavorite,
  onDelete,
  onRetry,
}: {
  design: Design
  index: number
  folders: Folder[]
  onOpen: () => void
  onMove: (folderId: string | null) => void
  onFavorite: () => void
  onDelete: () => void
  onRetry: () => void
}) {
  const cover =
    design.iterations.find((it) => it.id === design.coverIterationId) ??
    design.iterations.at(-1)
  const generating = design.status === 'generating'
  const failed = design.status === 'failed'
  const pendingAspect =
    design.pendingIterations?.at(-1)?.aspectRatio ??
    design.pendingIteration?.aspectRatio ??
    design.aspectRatio
  const variants = design.iterations.length

  return (
    <div className="animate-rd-card-in group relative min-w-0">
      <button
        type="button"
        onClick={onOpen}
        disabled={generating && !cover && !failed}
        style={{ animationDelay: `${Math.min(index, 16) * 28}ms` }}
        className="focus-visible:ring-ring relative block w-full cursor-pointer overflow-hidden rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 disabled:cursor-default"
      >
        <div className="bg-muted ring-border/35 relative aspect-square w-full overflow-hidden rounded-2xl shadow-sm ring-1 transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-xl">
          {generating && !cover ? (
            <Shimmer
              aspectRatio={pendingAspect}
              className="size-full rounded-none"
              label={null}
            />
          ) : cover ? (
            <img
              src={cover.imageUrl}
              alt={design.title}
              draggable="false"
              className="size-full object-cover"
            />
          ) : failed ? (
            <div className="bg-muted/50 flex size-full flex-col justify-between p-3">
              <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
                Render failed
              </span>
              <span className="text-foreground line-clamp-3 text-xs font-medium leading-5">
                {design.title}
              </span>
            </div>
          ) : null}

          {generating && cover ? (
            <div className="bg-background/75 text-foreground absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shadow-sm backdrop-blur">
              <Loader2 className="size-3 animate-spin" />
              Rendering
            </div>
          ) : null}

          {variants > 1 ? (
            <span className="border-border/60 bg-background/85 text-foreground absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium shadow-sm backdrop-blur">
              <Layers className="size-2.5" />
              {variants}
            </span>
          ) : null}

          {design.favorite ? (
            <span className="bg-background/85 absolute left-2 top-2 inline-flex size-6 items-center justify-center rounded-full shadow-sm backdrop-blur">
              <Heart className="size-3.5 fill-rose-500 text-rose-500" />
            </span>
          ) : null}

          {design.title.trim() && cover ? (
            <span className="from-background/85 via-background/25 pointer-events-none absolute inset-x-0 bottom-0 flex min-h-14 items-end bg-gradient-to-t to-transparent p-3">
              <span className="text-foreground line-clamp-2 text-sm font-semibold leading-5 drop-shadow-sm">
                {design.title}
              </span>
            </span>
          ) : null}
        </div>
      </button>

      <div className="absolute right-2 top-2 z-10">
        <MoveMenu
          folders={folders}
          design={design}
          onMove={onMove}
          onFavorite={onFavorite}
          onDelete={onDelete}
        />
      </div>

      {failed ? (
        <button
          type="button"
          onClick={onRetry}
          className="border-border/60 bg-muted/35 text-muted-foreground hover:bg-muted hover:text-foreground mt-2 flex h-7 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border text-xs font-medium transition-colors"
        >
          <RotateCcw className="size-3.5" />
          Retry
        </button>
      ) : null}
    </div>
  )
}

// ─── New folder dialog ───────────────────────────────────────────────────────

const FOLDER_EMOJIS = [
  '🛋️',
  '🍳',
  '🛏️',
  '🛁',
  '🖥️',
  '🌳',
  '🏡',
  '📐',
  '🚪',
  '🪟',
  '🌿',
  '🔥',
  '🛀',
  '🧺',
  '🎮',
  '📚',
]

function NewFolderDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string, emoji: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(FOLDER_EMOJIS[0])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setEmoji(FOLDER_EMOJIS[Math.floor(Math.random() * FOLDER_EMOJIS.length)])
    }
  }, [open])

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed || busy) return
    setBusy(true)
    try {
      await onCreate(trimmed, emoji)
      onOpenChange(false)
    } catch {
      // Parent mutation handlers surface the error.
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(24rem,calc(100vw-2rem))] rounded-xl p-5">
        <DialogTitle className="rd-serif text-lg font-semibold">
          New folder
        </DialogTitle>
        <DialogDescription className="text-muted-foreground text-[13px]">
          Group designs by room or zone — a kitchen, a backyard, a whole floor.
        </DialogDescription>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {FOLDER_EMOJIS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setEmoji(option)}
              className={cn(
                'flex size-8 cursor-pointer items-center justify-center rounded-lg text-lg transition-colors',
                emoji === option
                  ? 'bg-foreground/10 ring-foreground/30 ring-2'
                  : 'hover:bg-muted/60',
              )}
            >
              {option}
            </button>
          ))}
        </div>
        <Input
          autoFocus
          value={name}
          placeholder="Folder name"
          className="mt-3"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void submit()
          }}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            className="cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="cursor-pointer"
            disabled={!name.trim() || busy}
            onClick={() => void submit()}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Create folder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Aspect menu ─────────────────────────────────────────────────────────────

function AspectMenu({
  value,
  busy,
  onChange,
}: {
  value: AspectRatioId
  busy: boolean
  onChange: (value: AspectRatioId) => void
}) {
  const [open, setOpen] = useState(false)
  const current = aspectLabel(value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Aspect ratio"
          disabled={busy}
          className="border-border bg-background hover:bg-muted flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2 text-xs font-medium shadow-sm transition-colors disabled:opacity-60"
        >
          <PanelTop className="text-muted-foreground size-3.5" />
          <span className="rd-mono">{current.ratio}</span>
          <ChevronDown className="text-muted-foreground size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={6}
        className="w-52 p-1.5"
      >
        <p className="text-muted-foreground mb-1 px-1.5 text-[11px]">
          Render a new aspect ratio
        </p>
        {ASPECT_RATIOS.map((ratio) => (
          <button
            key={ratio.id}
            type="button"
            onClick={() => {
              setOpen(false)
              if (ratio.id !== value) onChange(ratio.id)
            }}
            className="hover:bg-muted flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-xs"
          >
            <span className="min-w-0 flex-1 truncate font-medium">
              {ratio.label}
            </span>
            <span className="text-muted-foreground rd-mono">{ratio.ratio}</span>
            {ratio.id === value ? (
              <Check className="text-muted-foreground size-3.5" />
            ) : null}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

// ─── Header tooltip button ───────────────────────────────────────────────────

function IconAction({
  label,
  onClick,
  disabled,
  destructive,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  destructive?: boolean
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          className={cn(
            'cursor-pointer',
            destructive &&
              'text-destructive hover:bg-destructive/10 hover:text-destructive',
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

// ─── Main app ────────────────────────────────────────────────────────────────

type ImportMessage =
  | { type: 'moldable:file-drag-over'; paths?: string[] }
  | { type: 'moldable:file-drag-leave' }
  | { type: 'moldable:file-drop'; paths?: string[] }

const ALL_DESIGNS = '__all__'
const FAVORITES = '__favorites__'

export function App() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  const [collectionId, setCollectionId] = useState<string | null>(null)
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null)
  const [selectedIterationId, setSelectedIterationId] = useState<string | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragDepth = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [styleOpen, setStyleOpen] = useState(false)
  const [remixOpen, setRemixOpen] = useState(false)
  const [remixPrompt, setRemixPrompt] = useState('')
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [pendingDeleteDesign, setPendingDeleteDesign] = useState<Design | null>(
    null,
  )
  const [pendingDeleteFolder, setPendingDeleteFolder] = useState<Folder | null>(
    null,
  )
  const [showOriginal, setShowOriginal] = useState(false)
  const [copied, setCopied] = useState(false)
  const selectedCoverRef = useRef<{
    designId: string
    coverIterationId: string | null
  } | null>(null)

  // ── Queries ──
  const designsQuery = useQuery({
    queryKey: ['designs', workspaceId],
    queryFn: async () => {
      const response = await fetchWithWorkspace('/api/designs')
      return parseJson<Design[]>(response, 'Failed to load designs')
    },
    refetchInterval: 2_000,
  })
  const foldersQuery = useQuery({
    queryKey: ['folders', workspaceId],
    queryFn: async () => {
      const response = await fetchWithWorkspace('/api/folders')
      return parseJson<Folder[]>(response, 'Failed to load folders')
    },
    refetchInterval: 4_000,
  })
  const presetsQuery = useQuery({
    queryKey: ['presets'],
    queryFn: async () => {
      const response = await fetchWithWorkspace('/api/presets')
      return parseJson<Catalog>(response, 'Failed to load styles')
    },
    staleTime: Infinity,
  })

  const designs = useMemo(() => designsQuery.data ?? [], [designsQuery.data])
  const folders = useMemo(() => foldersQuery.data ?? [], [foldersQuery.data])

  const activeDesigns = useMemo(
    () => designs.filter((design) => !design.archived),
    [designs],
  )

  const selectedDesign = useMemo(
    () => designs.find((design) => design.id === selectedDesignId) ?? null,
    [designs, selectedDesignId],
  )
  const openFolder = useMemo(
    () =>
      collectionId && collectionId !== ALL_DESIGNS && collectionId !== FAVORITES
        ? (folders.find((folder) => folder.id === collectionId) ?? null)
        : null,
    [collectionId, folders],
  )

  const collectionDesigns = useMemo(() => {
    if (collectionId === ALL_DESIGNS) return activeDesigns
    if (collectionId === FAVORITES) {
      return activeDesigns.filter((design) => design.favorite)
    }
    if (openFolder) {
      return activeDesigns.filter((design) => design.folderId === openFolder.id)
    }
    return []
  }, [activeDesigns, collectionId, openFolder])

  const collectionSpace: SpaceKind | 'all' = openFolder
    ? openFolder.space
    : 'all'

  // ── Navigation (Moldable back gesture) ──
  useEffect(() => {
    resetMoldableNavigation()
  }, [])

  useMoldableNavigationPop(() => {
    if (selectedDesignId) {
      setSelectedDesignId(null)
      setSelectedIterationId(null)
    } else if (collectionId) {
      setCollectionId(null)
    }
  })

  const openCollection = useCallback((id: string, title: string) => {
    pushMoldableNavigation({ id: `collection:${id}`, title })
    setCollectionId(id)
  }, [])

  const openDesign = useCallback((design: Design) => {
    pushMoldableNavigation({
      id: `design:${design.id}`,
      title: design.title || 'Design',
    })
    setSelectedDesignId(design.id)
    setSelectedIterationId(null)
    setShowOriginal(false)
  }, [])

  const closeDesign = useCallback(() => {
    popMoldableNavigation()
    setSelectedDesignId(null)
    setSelectedIterationId(null)
  }, [])

  const closeCollection = useCallback(() => {
    popMoldableNavigation()
    setCollectionId(null)
  }, [])

  const upsertDesignInCache = useCallback(
    (design: Design) => {
      queryClient.setQueryData<Design[]>(
        ['designs', workspaceId],
        (current) => [
          design,
          ...(current ?? []).filter((item) => item.id !== design.id),
        ],
      )
    },
    [queryClient, workspaceId],
  )

  // Keep selected iteration valid; default to latest render.
  useEffect(() => {
    if (!selectedDesign) {
      selectedCoverRef.current = null
      return
    }
    const ids = selectedDesign.iterations.map((it) => it.id)
    const coverIterationId =
      selectedDesign.coverIterationId ??
      selectedDesign.iterations.at(-1)?.id ??
      null
    const previousCover = selectedCoverRef.current
    const coverChanged =
      previousCover?.designId === selectedDesign.id &&
      previousCover.coverIterationId !== null &&
      previousCover.coverIterationId !== coverIterationId
    selectedCoverRef.current = {
      designId: selectedDesign.id,
      coverIterationId,
    }
    if (!selectedIterationId || !ids.includes(selectedIterationId)) {
      setSelectedIterationId(coverIterationId)
    } else if (
      coverChanged &&
      selectedIterationId === previousCover.coverIterationId
    ) {
      setSelectedIterationId(coverIterationId)
    }
  }, [selectedDesign, selectedIterationId])

  // Drop the detail view if its design disappears.
  useEffect(() => {
    if (selectedDesignId && !selectedDesign && designsQuery.isFetched) {
      popMoldableNavigation()
      setSelectedDesignId(null)
      setSelectedIterationId(null)
    }
  }, [designsQuery.isFetched, selectedDesign, selectedDesignId])

  const selectedIteration = useMemo(() => {
    if (!selectedDesign) return null
    return (
      selectedDesign.iterations.find((it) => it.id === selectedIterationId) ??
      selectedDesign.iterations.at(-1) ??
      null
    )
  }, [selectedDesign, selectedIterationId])

  const baseIteration = selectedDesign ? baseIterationFor(selectedDesign) : null
  const designPending = selectedDesign
    ? pendingCount(selectedDesign) > 0
    : false

  // ── Chat context ──
  useEffect(() => {
    let context: string
    if (selectedDesign) {
      const base = baseIterationFor(selectedDesign)
      context = `Redecorate is open to design "${selectedDesign.title}" (id ${selectedDesign.id}). Drive this app only through app RPC methods. To restyle the original space, call redecorate.designs.remix with { id: "${selectedDesign.id}", baseIterationId: "${base?.id ?? ''}", prompt }. To tweak the currently shown render as a child, call redecorate.designs.remix with the shown iteration id as baseIterationId. To produce a distinct variant, call redecorate.designs.generateFromReference. To favorite it, call redecorate.designs.favorite with { id }. To move it to a folder, call redecorate.designs.move with { id, folderId }. Use redecorate.designs.get to inspect renders.`
    } else if (openFolder) {
      context = `Redecorate is open to the "${openFolder.name}" folder (id ${openFolder.id}). Drive this app only through app RPC methods. To add a redesign from a style, call redecorate.designs.generate with { prompt, folderId: "${openFolder.id}", presetId? }. To import a room photo from disk, call redecorate.images.import with { imagePath, id?, prompt? } then redecorate.designs.move into this folder. List built-in styles with redecorate.presets.list.`
    } else {
      context = `Redecorate is open to the folder gallery. Drive this app only through app RPC methods. List folders with redecorate.folders.list, designs with redecorate.designs.list, and built-in styles with redecorate.presets.list. Create a folder with redecorate.folders.create, generate a redesign with redecorate.designs.generate, and import a photo with redecorate.images.import.`
    }
    sendChatInstructions(context)
  }, [openFolder, selectedDesign])

  // ── Mutations ──
  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['designs', workspaceId] })
    void queryClient.invalidateQueries({ queryKey: ['folders', workspaceId] })
  }, [queryClient, workspaceId])

  const rpc = useCallback(
    async <T,>(method: string, params: unknown): Promise<T> => {
      const response = await fetchWithWorkspace('/api/moldable/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, params }),
      })
      const json = await parseJson<RpcResponse<T>>(response, 'Request failed')
      if (!json.ok) throw new Error(json.error?.message ?? 'Request failed')
      return json.result
    },
    [fetchWithWorkspace],
  )

  const importMutation = useMutation({
    mutationFn: async ({
      files,
      paths,
      folderId,
    }: {
      files?: File[]
      paths?: string[]
      folderId: string | null
    }) => {
      if (files && files.length > 0) {
        const form = new FormData()
        form.set('mode', 'separate')
        if (folderId) form.set('folderId', folderId)
        for (const file of files) form.append('files', file, file.name)
        const response = await fetchWithWorkspace('/api/designs/import', {
          method: 'POST',
          body: form,
        })
        return parseJson<Design[]>(response, 'Failed to import photos')
      }
      const response = await fetchWithWorkspace('/api/designs/import-paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths, mode: 'separate', folderId }),
      })
      return parseJson<Design[]>(response, 'Failed to import photos')
    },
    onSuccess: (imported) => {
      setError(null)
      if (imported.length === 1) {
        upsertDesignInCache(imported[0])
        openDesign(imported[0])
      }
      invalidate()
    },
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to import photos',
      ),
  })

  const patchDesign = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string
      patch: Record<string, unknown>
    }) => {
      const response = await fetchWithWorkspace(`/api/designs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      return parseJson<Design>(response, 'Failed to update design')
    },
    onSuccess: invalidate,
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to update design',
      ),
  })

  const generateMutation = useMutation({
    mutationFn: (params: {
      prompt: string
      folderId: string | null
      presetId?: string
      aspectRatio?: AspectRatioId
    }) => rpc<Design>('redecorate.designs.generate', params),
    onSuccess: (design) => {
      setError(null)
      upsertDesignInCache(design)
      openDesign(design)
      invalidate()
    },
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to generate render',
      ),
  })

  const editMutation = useMutation({
    mutationFn: (params: {
      method: string
      id: string
      baseIterationId?: string
      prompt: string
    }) =>
      rpc<Design>(params.method, {
        id: params.id,
        baseIterationId: params.baseIterationId,
        prompt: params.prompt,
      }),
    onSuccess: () => {
      setError(null)
      invalidate()
    },
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to render',
      ),
  })

  const simpleRpc = useMutation({
    mutationFn: (params: { method: string; params: unknown }) =>
      rpc<unknown>(params.method, params.params),
    onSuccess: invalidate,
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Request failed',
      ),
  })

  const createFolderMutation = useMutation({
    mutationFn: async ({ name, emoji }: { name: string; emoji: string }) => {
      const response = await fetchWithWorkspace('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, emoji }),
      })
      return parseJson<Folder>(response, 'Failed to create folder')
    },
    onSuccess: invalidate,
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to create folder',
      ),
  })

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetchWithWorkspace(`/api/folders/${id}`, {
        method: 'DELETE',
      })
      return parseJson(response, 'Failed to delete folder')
    },
    onSuccess: invalidate,
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to delete folder',
      ),
  })

  // ── Drag & drop import ──
  const targetFolderId = openFolder?.id ?? null

  const importFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return
      setError(null)
      importMutation.mutate({ files, folderId: targetFolderId })
    },
    [importMutation, targetFolderId],
  )
  const importPaths = useCallback(
    (paths: string[]) => {
      if (paths.length === 0) return
      setError(null)
      importMutation.mutate({ paths, folderId: targetFolderId })
    },
    [importMutation, targetFolderId],
  )

  useEffect(() => {
    const handler = (event: MessageEvent<ImportMessage>) => {
      const data = event.data
      if (!data || typeof data !== 'object') return
      if (data.type === 'moldable:file-drag-over') {
        setIsDragging(true)
      } else if (data.type === 'moldable:file-drag-leave') {
        dragDepth.current = 0
        setIsDragging(false)
      } else if (data.type === 'moldable:file-drop') {
        dragDepth.current = 0
        setIsDragging(false)
        importPaths(imagePathsFromList(data.paths ?? []))
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [importPaths])

  const onDragEnter = useCallback((event: DragEvent<HTMLElement>) => {
    if (!hasFileDrag(event)) return
    event.preventDefault()
    dragDepth.current += 1
    setIsDragging(true)
  }, [])
  const onDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    if (!hasFileDrag(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])
  const onDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    if (!hasFileDrag(event)) return
    event.preventDefault()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setIsDragging(false)
  }, [])
  const onDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!hasFileDrag(event)) return
      event.preventDefault()
      dragDepth.current = 0
      setIsDragging(false)
      importFiles(imageFilesFromList(event.dataTransfer.files))
    },
    [importFiles],
  )

  // ── Style / remix application ──
  const applyPreset = useCallback(
    (preset: StylePreset) => {
      setStyleOpen(false)
      if (selectedDesign) {
        const base = baseIterationFor(selectedDesign)
        editMutation.mutate({
          method: 'redecorate.designs.remix',
          id: selectedDesign.id,
          baseIterationId: base?.id,
          prompt: preset.prompt,
        })
      } else {
        const space =
          collectionSpace === 'interior'
            ? 'interior'
            : collectionSpace === 'exterior'
              ? 'exterior'
              : 'space'
        generateMutation.mutate({
          prompt: `A photorealistic ${space} render. ${preset.prompt}`,
          folderId: targetFolderId,
          presetId: preset.id,
        })
      }
    },
    [
      collectionSpace,
      editMutation,
      generateMutation,
      selectedDesign,
      targetFolderId,
    ],
  )

  const applyTemplate = useCallback(
    (_template: PromptTemplate, prompt: string) => {
      setStyleOpen(false)
      const trimmedPrompt = prompt.trim()
      if (!trimmedPrompt) return
      if (selectedDesign && selectedIteration) {
        editMutation.mutate({
          method: 'redecorate.designs.remix',
          id: selectedDesign.id,
          baseIterationId: selectedIteration.id,
          prompt: trimmedPrompt,
        })
      } else {
        generateMutation.mutate({
          prompt: trimmedPrompt,
          folderId: targetFolderId,
        })
      }
    },
    [
      editMutation,
      generateMutation,
      selectedDesign,
      selectedIteration,
      targetFolderId,
    ],
  )

  const submitRemix = useCallback(() => {
    const prompt = remixPrompt.trim()
    if (!prompt || !selectedDesign || !selectedIteration) return
    editMutation.mutate({
      method: 'redecorate.designs.remix',
      id: selectedDesign.id,
      baseIterationId: selectedIteration.id,
      prompt,
    })
    setRemixPrompt('')
    setRemixOpen(false)
  }, [editMutation, remixPrompt, selectedDesign, selectedIteration])

  const dropOverlay = isDragging ? (
    <div className="bg-background/72 pointer-events-none absolute inset-0 z-40 flex items-center justify-center backdrop-blur-sm">
      <div className="border-border/70 bg-background/95 text-foreground rounded-2xl border px-6 py-5 text-center shadow-xl">
        <Upload className="mx-auto mb-2 size-5" />
        <p className="rd-serif text-lg font-semibold">
          {openFolder ? `Drop photos into ${openFolder.name}` : 'Drop photos'}
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          Rooms, exteriors, backyards, or floorplans — then redesign them.
        </p>
      </div>
    </div>
  ) : null

  const hiddenFileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      multiple
      className="hidden"
      onChange={(event) => {
        const files = event.target.files
          ? imageFilesFromList(event.target.files)
          : []
        importFiles(files)
        event.target.value = ''
      }}
    />
  )

  const styleLibrary = (
    <StyleLibrary
      open={styleOpen}
      onOpenChange={setStyleOpen}
      catalog={presetsQuery.data}
      space={collectionSpace}
      busy={editMutation.isPending || generateMutation.isPending}
      applyLabel={selectedDesign ? 'Redesign' : 'Create'}
      subtitle={
        selectedDesign
          ? 'Applied to your original photo so the room keeps its bones.'
          : 'Pick a style to generate a fresh render in this folder.'
      }
      onApplyPreset={applyPreset}
      onApplyTemplate={applyTemplate}
    />
  )

  const errorToast = error ? (
    <div className="border-destructive/40 bg-destructive/10 text-destructive absolute bottom-[calc(var(--chat-safe-padding,0px)+1rem)] left-1/2 z-40 w-[min(720px,calc(100%-2rem))] -translate-x-1/2 rounded-lg border px-3 py-2 text-sm shadow-lg">
      {error}
    </div>
  ) : null

  // ════════════════════════════════════════════════════════════════════════
  // DESIGN DETAIL
  // ════════════════════════════════════════════════════════════════════════
  if (selectedDesign) {
    const design = selectedDesign
    const displayIteration =
      showOriginal && baseIteration ? baseIteration : selectedIteration
    const pendingAspect =
      design.pendingIterations?.at(-1)?.aspectRatio ??
      design.pendingIteration?.aspectRatio ??
      null
    const isRendering = design.status === 'generating' && !selectedIteration
    const isFailed = design.status === 'failed' && !selectedIteration
    const shimmerAspect = pendingAspect ?? design.aspectRatio
    const canCompare =
      baseIteration &&
      selectedIteration &&
      baseIteration.id !== selectedIteration.id

    return (
      <main
        className="animate-rd-view-in text-foreground relative flex h-full min-h-0 flex-col overflow-hidden"
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <header className="border-border/70 flex h-12 shrink-0 items-center justify-between gap-2 border-b px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Back"
              className="cursor-pointer"
              onClick={closeDesign}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <h1 className="rd-serif text-foreground truncate text-base font-semibold">
              {design.title || 'Untitled design'}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              className="cursor-pointer gap-1.5 rounded-full px-3.5 text-[12.5px]"
              disabled={designPending}
              onClick={() => setStyleOpen(true)}
            >
              <Sparkles className="size-3.5" />
              Redesign
            </Button>
            <IconAction
              label="Quick remix"
              disabled={designPending || !selectedIteration}
              onClick={() => {
                setRemixPrompt('')
                setRemixOpen(true)
              }}
            >
              <Wand2 className="size-3.5" />
            </IconAction>
            <IconAction
              label={design.favorite ? 'Remove favorite' : 'Favorite'}
              onClick={() =>
                patchDesign.mutate({
                  id: design.id,
                  patch: { favorite: !design.favorite },
                })
              }
            >
              <Heart
                className={cn(
                  'size-3.5',
                  design.favorite && 'fill-rose-500 text-rose-500',
                )}
              />
            </IconAction>
            <AspectMenu
              value={displayIteration?.aspectRatio ?? design.aspectRatio}
              busy={designPending}
              onChange={(aspectRatio) =>
                simpleRpc.mutate({
                  method: 'redecorate.designs.setAspectRatio',
                  params: {
                    id: design.id,
                    baseIterationId: displayIteration?.id,
                    aspectRatio,
                  },
                })
              }
            />
            <IconAction
              label="Copy prompt"
              disabled={!selectedIteration?.prompt}
              onClick={async () => {
                if (!selectedIteration?.prompt) return
                await copyText(selectedIteration.prompt)
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1500)
              }}
            >
              {copied ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </IconAction>
            <IconAction
              label="Download"
              disabled={!displayIteration}
              onClick={async () => {
                if (!displayIteration) return
                try {
                  await downloadIteration(displayIteration)
                } catch (downloadError) {
                  setError(
                    downloadError instanceof Error
                      ? downloadError.message
                      : 'Failed to download',
                  )
                }
              }}
            >
              <Download className="size-3.5" />
            </IconAction>
            <IconAction
              label="Delete design"
              destructive
              onClick={() => setPendingDeleteDesign(design)}
            >
              <Trash2 className="size-3.5" />
            </IconAction>
          </div>
        </header>

        <section className="relative min-h-0 flex-1 overflow-auto px-6 py-6 pb-[calc(var(--chat-safe-padding,0px)+1rem)]">
          <div className="mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center gap-4">
            {isRendering ? (
              <Shimmer
                aspectRatio={shimmerAspect}
                className="w-full max-w-3xl"
                label="Rendering your redesign"
              />
            ) : isFailed ? (
              <div className="border-border/60 bg-muted/20 mx-auto flex max-w-md flex-col items-center rounded-2xl border border-dashed px-6 py-12 text-center">
                <div className="bg-destructive/10 text-destructive mb-3 flex size-11 items-center justify-center rounded-full">
                  <RotateCcw className="size-5" />
                </div>
                <p className="rd-serif text-foreground text-lg">
                  This render didn’t finish
                </p>
                <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
                  {design.errorMessage ??
                    'Something interrupted the render. Try again.'}
                </p>
                <Button
                  type="button"
                  className="mt-4 cursor-pointer gap-1.5 rounded-full"
                  disabled={simpleRpc.isPending}
                  onClick={() =>
                    simpleRpc.mutate({
                      method: 'redecorate.designs.retry',
                      params: { id: design.id },
                    })
                  }
                >
                  <RotateCcw className="size-4" />
                  Retry render
                </Button>
              </div>
            ) : displayIteration ? (
              <div className="relative w-full">
                <ZoomableImage
                  src={displayIteration.imageUrl}
                  alt={design.title}
                  imageClassName="mx-auto max-h-[calc(100vh-var(--chat-safe-padding,0px)-13rem)] max-w-full rounded-xl object-contain shadow-lg"
                />
                {showOriginal ? (
                  <span className="bg-foreground text-background absolute left-1/2 top-3 -translate-x-1/2 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-md">
                    Original photo
                  </span>
                ) : null}
              </div>
            ) : null}

            {canCompare ? (
              <button
                type="button"
                onMouseDown={() => setShowOriginal(true)}
                onMouseUp={() => setShowOriginal(false)}
                onMouseLeave={() => setShowOriginal(false)}
                onTouchStart={() => setShowOriginal(true)}
                onTouchEnd={() => setShowOriginal(false)}
                className="border-border/70 bg-background/90 text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-medium shadow-sm transition-colors"
              >
                <Layers className="size-3.5" />
                Hold to see the original
              </button>
            ) : null}
          </div>
        </section>

        {/* Render strip */}
        <div className="border-border/60 bg-background/80 shrink-0 border-t px-4 py-3 backdrop-blur">
          <div className="rd-no-scrollbar mx-auto flex max-w-5xl items-center gap-2.5 overflow-x-auto">
            {design.iterations.map((iteration) => {
              const isOriginal = iteration.kind === 'upload'
              const isSelected = iteration.id === selectedIteration?.id
              return (
                <button
                  key={iteration.id}
                  type="button"
                  onClick={() => {
                    setShowOriginal(false)
                    setSelectedIterationId(iteration.id)
                  }}
                  className={cn(
                    'group/thumb relative size-16 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 transition-all',
                    isSelected
                      ? 'ring-foreground ring-2'
                      : 'ring-border/55 hover:ring-foreground/40',
                  )}
                >
                  <img
                    src={iteration.imageUrl}
                    alt=""
                    draggable="false"
                    className="size-full object-cover"
                  />
                  {isOriginal ? (
                    <span className="bg-foreground/80 text-background absolute inset-x-0 bottom-0 py-0.5 text-center text-[8px] font-semibold uppercase tracking-wide">
                      Original
                    </span>
                  ) : null}
                </button>
              )
            })}
            {pendingCount(design) > 0 ? (
              <div className="ring-border/55 relative size-16 shrink-0 overflow-hidden rounded-lg ring-1">
                <Shimmer className="size-full rounded-none" label={null} />
              </div>
            ) : null}
            <button
              type="button"
              disabled={designPending}
              onClick={() => setStyleOpen(true)}
              className="border-border/70 text-muted-foreground hover:border-foreground/40 hover:text-foreground flex size-16 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed transition-colors disabled:opacity-50"
            >
              <Plus className="size-4" />
              <span className="text-[9px] font-medium">Style</span>
            </button>
          </div>
        </div>

        {dropOverlay}
        {errorToast}
        {styleLibrary}

        {/* Quick remix dialog */}
        <Dialog open={remixOpen} onOpenChange={setRemixOpen}>
          <DialogContent className="w-[min(30rem,calc(100vw-2rem))] rounded-xl p-5">
            <DialogTitle className="rd-serif text-lg font-semibold">
              Describe a change
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-[13px]">
              Edits the render you’re viewing. Try “make the walls sage green”
              or “add a large arched window.”
            </DialogDescription>
            <textarea
              autoFocus
              value={remixPrompt}
              onChange={(event) => setRemixPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  submitRemix()
                }
              }}
              placeholder="What should change?"
              className="border-border/70 bg-muted/20 focus:bg-background focus:border-foreground/30 mt-3 h-24 w-full resize-none rounded-lg border p-3 text-sm outline-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                className="cursor-pointer"
                onClick={() => setRemixOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="cursor-pointer gap-1.5"
                disabled={!remixPrompt.trim()}
                onClick={submitRemix}
              >
                <Wand2 className="size-4" />
                Render
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <DeleteDesignDialog
          design={pendingDeleteDesign}
          busy={simpleRpc.isPending}
          onClose={() => setPendingDeleteDesign(null)}
          onConfirm={(target) => {
            simpleRpc.mutate(
              {
                method: 'redecorate.designs.delete',
                params: { id: target.id },
              },
              {
                onSuccess: () => {
                  setPendingDeleteDesign(null)
                  closeDesign()
                },
              },
            )
          }}
        />
      </main>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // COLLECTION (designs in a folder / all / favorites)
  // ════════════════════════════════════════════════════════════════════════
  if (collectionId) {
    const title =
      collectionId === ALL_DESIGNS
        ? 'All designs'
        : collectionId === FAVORITES
          ? 'Favorites'
          : (openFolder?.name ?? 'Folder')
    const emoji =
      collectionId === ALL_DESIGNS
        ? '🗂️'
        : collectionId === FAVORITES
          ? '❤️'
          : (openFolder?.emoji ?? '📁')

    return (
      <main
        className="animate-rd-view-in relative flex h-full min-h-0 flex-col overflow-hidden"
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="rd-no-scrollbar min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-6 pb-[calc(var(--chat-safe-padding,0px)+5rem)] pt-9">
            <button
              type="button"
              onClick={closeCollection}
              className="text-muted-foreground hover:text-foreground -ml-1.5 mb-3 inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-1.5 text-xs transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              Gallery
            </button>

            <section className="mb-7 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-2xl leading-none">{emoji}</span>
                  <h1 className="rd-serif text-foreground text-3xl font-semibold tracking-tight">
                    {title}
                  </h1>
                </div>
                {openFolder?.blurb ? (
                  <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-6">
                    {openFolder.blurb}
                  </p>
                ) : (
                  <p className="text-muted-foreground mt-2 text-sm">
                    {collectionDesigns.length}{' '}
                    {collectionDesigns.length === 1 ? 'design' : 'designs'}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {openFolder ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive cursor-pointer gap-1.5 rounded-full px-3 text-[12px]"
                    onClick={() => setPendingDeleteFolder(openFolder)}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer gap-1.5 rounded-full px-3.5 text-[12px]"
                  onClick={() => setStyleOpen(true)}
                >
                  <Sparkles className="size-3.5" />
                  Browse styles
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="cursor-pointer gap-1.5 rounded-full px-3.5 text-[12px]"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importMutation.isPending}
                >
                  {importMutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="size-3.5" />
                  )}
                  Add a photo
                </Button>
              </div>
            </section>

            {collectionDesigns.length === 0 ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="border-border/60 hover:border-foreground/30 hover:bg-muted/20 flex w-full cursor-pointer flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center transition-colors"
              >
                <div className="bg-muted/50 mb-3 flex size-12 items-center justify-center rounded-full">
                  <Upload className="text-muted-foreground size-5" />
                </div>
                <p className="rd-serif text-foreground text-lg">
                  Drop a photo of your space
                </p>
                <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
                  A room, exterior, backyard, or floorplan — then tap a style to
                  reimagine it. Or browse styles to start from scratch.
                </p>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {collectionDesigns.map((design, index) => (
                  <DesignCard
                    key={design.id}
                    design={design}
                    index={index}
                    folders={folders}
                    onOpen={() => openDesign(design)}
                    onMove={(folderId) =>
                      patchDesign.mutate({ id: design.id, patch: { folderId } })
                    }
                    onFavorite={() =>
                      patchDesign.mutate({
                        id: design.id,
                        patch: { favorite: !design.favorite },
                      })
                    }
                    onDelete={() => setPendingDeleteDesign(design)}
                    onRetry={() =>
                      simpleRpc.mutate({
                        method: 'redecorate.designs.retry',
                        params: { id: design.id },
                      })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {dropOverlay}
        {errorToast}
        {hiddenFileInput}
        {styleLibrary}

        <DeleteDesignDialog
          design={pendingDeleteDesign}
          busy={simpleRpc.isPending}
          onClose={() => setPendingDeleteDesign(null)}
          onConfirm={(target) =>
            simpleRpc.mutate(
              {
                method: 'redecorate.designs.delete',
                params: { id: target.id },
              },
              { onSuccess: () => setPendingDeleteDesign(null) },
            )
          }
        />
        <DeleteFolderDialog
          folder={pendingDeleteFolder}
          busy={deleteFolderMutation.isPending}
          onClose={() => setPendingDeleteFolder(null)}
          onConfirm={(target) => {
            deleteFolderMutation.mutate(target.id, {
              onSuccess: () => {
                setPendingDeleteFolder(null)
                closeCollection()
              },
            })
          }}
        />
      </main>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // GALLERY (folders)
  // ════════════════════════════════════════════════════════════════════════
  const favoriteCount = activeDesigns.filter((design) => design.favorite).length
  const loading = designsQuery.isLoading || foldersQuery.isLoading

  return (
    <main
      className="animate-rd-view-back relative flex h-full min-h-0 flex-col overflow-hidden"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="rd-no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-6 pb-[calc(var(--chat-safe-padding,0px)+5rem)] pt-10">
          <section className="mb-8 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="rd-serif text-foreground text-3xl font-semibold tracking-tight">
                Reimagine your space
              </h1>
              <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-6">
                Tap a folder to explore designs, drop a photo of any room or
                yard, then restyle it from 140+ curated looks.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer gap-1.5 rounded-full px-3.5 text-[12px]"
                onClick={() => setStyleOpen(true)}
              >
                <Sparkles className="size-3.5" />
                Browse styles
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer gap-1.5 rounded-full px-3.5 text-[12px]"
                onClick={() => setNewFolderOpen(true)}
              >
                <Plus className="size-3.5" />
                New folder
              </Button>
              <Button
                type="button"
                size="sm"
                className="cursor-pointer gap-1.5 rounded-full px-3.5 text-[12px]"
                onClick={() => fileInputRef.current?.click()}
                disabled={importMutation.isPending}
              >
                {importMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="size-3.5" />
                )}
                Add a photo
              </Button>
            </div>
          </section>

          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-muted/30 aspect-[4/3] animate-pulse rounded-2xl"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              <SmartCard
                emoji="🗂️"
                title="All designs"
                count={activeDesigns.length}
                tone="#6E8CA0"
                onOpen={() => openCollection(ALL_DESIGNS, 'All designs')}
              />
              {favoriteCount > 0 ? (
                <SmartCard
                  emoji="❤️"
                  title="Favorites"
                  count={favoriteCount}
                  tone="#C77B5C"
                  onOpen={() => openCollection(FAVORITES, 'Favorites')}
                />
              ) : null}

              {folders.map((folder, index) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  index={index}
                  onOpen={() => openCollection(folder.id, folder.name)}
                />
              ))}

              <button
                type="button"
                onClick={() => setNewFolderOpen(true)}
                className="border-border/60 text-muted-foreground hover:border-foreground/30 hover:bg-muted/20 hover:text-foreground flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed transition-colors"
              >
                <Plus className="size-5" />
                <span className="text-[12.5px] font-medium">New folder</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {dropOverlay}
      {errorToast}
      {hiddenFileInput}
      {styleLibrary}

      <NewFolderDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        onCreate={async (name, emoji) => {
          await createFolderMutation.mutateAsync({ name, emoji })
        }}
      />
    </main>
  )
}

function SmartCard({
  emoji,
  title,
  count,
  tone,
  onOpen,
}: {
  emoji: string
  title: string
  count: number
  tone: string
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{ ['--card-tone']: tone } as CSSProperties}
      className="rd-card-tone animate-rd-card-in border-border/45 group relative flex aspect-[4/3] cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <span className="text-2xl leading-none">{emoji}</span>
      <div>
        <h3 className="rd-serif text-foreground text-lg font-semibold leading-tight">
          {title}
        </h3>
        <p className="text-muted-foreground rd-mono mt-0.5 text-[11px]">
          {count} {count === 1 ? 'design' : 'designs'}
        </p>
      </div>
    </button>
  )
}

function DeleteDesignDialog({
  design,
  busy,
  onClose,
  onConfirm,
}: {
  design: Design | null
  busy: boolean
  onClose: () => void
  onConfirm: (design: Design) => void
}) {
  return (
    <AlertDialog
      open={Boolean(design)}
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <AlertDialogContent className="w-[min(24rem,calc(100vw-2rem))]">
        <AlertDialogHeader>
          <AlertDialogTitle className="rd-serif text-lg">
            Delete “{design?.title || 'this design'}”?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This removes the design and all of its renders. This can’t be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={busy}
            onClick={(event) => {
              event.preventDefault()
              if (design) onConfirm(design)
            }}
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DeleteFolderDialog({
  folder,
  busy,
  onClose,
  onConfirm,
}: {
  folder: Folder | null
  busy: boolean
  onClose: () => void
  onConfirm: (folder: Folder) => void
}) {
  return (
    <AlertDialog
      open={Boolean(folder)}
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <AlertDialogContent className="w-[min(24rem,calc(100vw-2rem))]">
        <AlertDialogHeader>
          <AlertDialogTitle className="rd-serif text-lg">
            Delete “{folder?.name}”?
          </AlertDialogTitle>
          <AlertDialogDescription>
            The folder is removed.{' '}
            {folder && folder.designCount > 0
              ? `Its ${folder.designCount} ${
                  folder.designCount === 1 ? 'design' : 'designs'
                } move to All designs — nothing is deleted.`
              : 'It has no designs inside.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={busy}
            onClick={(event) => {
              event.preventDefault()
              if (folder) onConfirm(folder)
            }}
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Delete folder
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
