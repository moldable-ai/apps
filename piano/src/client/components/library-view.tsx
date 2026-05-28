import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  BookOpen,
  Folder as FolderIcon,
  FolderPlus,
  GraduationCap,
  GripVertical,
  Library as LibraryIcon,
  Play,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import type { CSSProperties, DragEvent } from 'react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
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
  cn,
  useWorkspace,
} from '@moldable-ai/ui'
import type { CourseSummary } from '../../shared/course'
import {
  type PianoNote,
  type SongSummary,
  getMeterLabel,
  getTempoLabel,
} from '../../shared/song'
import { formatDuration, midiToTone } from '../piano-utils'
import { type Folder, useFolders } from '../use-folders'
import { CatalogSearchDialog } from './catalog-search-dialog'
import { CoursesRow } from './courses-row'
import { MoveToMenu } from './move-to-menu'
import { NewFolderDialog } from './new-folder-dialog'
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS as DndCSS } from '@dnd-kit/utilities'

interface LibraryViewProps {
  songs: SongSummary[]
  isLoading: boolean
  isError: boolean
  notePreviewBySong: Map<string, PianoNote[]>
  openFolderId: string | null
  onOpenFolder: (folder: Folder) => void
  onCloseFolder: () => void
  onSelect: (song: SongSummary) => void
  courseSummaries: CourseSummary[]
  onOpenCourse: (courseId: string) => void
  tab: 'library' | 'courses'
  onTabChange: (tab: 'library' | 'courses') => void
}

function songTone(preview: PianoNote[] | undefined) {
  const firstMidi = preview?.[0]?.midi ?? 60
  return midiToTone(firstMidi)
}

function normalizeForSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function songByline(song: SongSummary) {
  return song.composer?.trim() || song.artist?.trim() || null
}

function compareSongsByTitle(a: SongSummary, b: SongSummary) {
  const titleCompare = a.title.localeCompare(b.title, undefined, {
    sensitivity: 'base',
    numeric: true,
  })
  if (titleCompare !== 0) return titleCompare
  return a.id.localeCompare(b.id, undefined, {
    sensitivity: 'base',
    numeric: true,
  })
}

function sortSongsByTitle(songs: SongSummary[]) {
  return [...songs].sort(compareSongsByTitle)
}

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

type MidiImportResult = {
  song?: SongSummary
}

function midiFilesFromList(fileList: FileList): File[] {
  return Array.from(fileList).filter((file) => /\.(mid|midi)$/i.test(file.name))
}

function midiPathsFromList(paths: string[]): string[] {
  return paths.filter((path) => /\.(mid|midi)$/i.test(path))
}

function hasFileDrag(event: DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes('Files')
}

function fileNameFromPath(path: string) {
  return path.split(/[\\/]/).pop() || path
}

function titleFromMidiName(name: string) {
  return name
    .replace(/\.(mid|midi)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugifySongId(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function uniqueSongId(sourceName: string, reserved: Set<string>) {
  const base = slugifySongId(titleFromMidiName(sourceName)) || 'imported-midi'
  let candidate = base
  let suffix = 2
  while (reserved.has(candidate)) {
    candidate = `${base}-${suffix}`
    suffix += 1
  }
  reserved.add(candidate)
  return candidate
}

async function readImportError(res: Response) {
  const body = (await res.json().catch(() => null)) as { error?: string } | null
  return body?.error ?? 'Failed to import MIDI file'
}

function MiniRoll({ notes, tone }: { notes: PianoNote[]; tone: string }) {
  if (notes.length === 0) {
    return (
      <div className="text-muted-foreground/70 piano-serif text-xs italic">
        no notes
      </div>
    )
  }

  const head = notes.slice(0, 24)
  const minMidi = Math.min(...head.map((n) => n.midi)) - 1
  const maxMidi = Math.max(...head.map((n) => n.midi)) + 1
  const span = Math.max(6, maxMidi - minMidi)
  const totalBeats = head.reduce((sum, n) => sum + Math.max(0.2, n.duration), 0)
  const width = 220
  const height = 56
  const widthPerBeat = width / Math.max(1, totalBeats)

  let cursor = 0

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      className="block"
      aria-hidden
    >
      <defs>
        <linearGradient id={`mini-${tone}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={tone} stopOpacity="0.95" />
          <stop offset="100%" stopColor={tone} stopOpacity="0.75" />
        </linearGradient>
      </defs>
      {head.map((note, index) => {
        const x = cursor * widthPerBeat
        const w = Math.max(2, Math.max(0.2, note.duration) * widthPerBeat - 1.5)
        const y = height - 6 - ((note.midi - minMidi) / span) * (height - 14)
        cursor += Math.max(0.2, note.duration)
        return (
          <rect
            key={`${note.id}-${index}`}
            x={x}
            y={y}
            width={w}
            height={4}
            rx="2"
            fill={`url(#mini-${tone})`}
          />
        )
      })}
    </svg>
  )
}

function SongCard({
  song,
  preview,
  index,
  folders,
  currentFolderId,
  onSelect,
  onMove,
  onRequestNewFolder,
  onRequestDelete,
}: {
  song: SongSummary
  preview: PianoNote[]
  index: number
  folders: Folder[]
  currentFolderId: string | null
  onSelect: (song: SongSummary) => void
  onMove: (songId: string, folderId: string | null) => void
  onRequestNewFolder: (songId: string) => void
  onRequestDelete: (song: SongSummary) => void
}) {
  const tone = songTone(preview)
  const byline = songByline(song)
  const style = { ['--card-tone' as string]: tone } as CSSProperties

  const handleClick = () => onSelect(song)
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(song)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{ ...style, animationDelay: `${index * 35}ms` }}
      className={cn(
        'piano-card-tone animate-piano-card-in group relative isolate flex h-56 flex-col overflow-hidden rounded-2xl text-left',
        'border-border/50 border shadow-sm',
        'cursor-pointer transition-all duration-300 ease-out',
        'focus-visible:ring-primary/40 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2',
      )}
    >
      <div className="absolute right-3 top-3 z-20">
        <MoveToMenu
          folders={folders}
          currentFolderId={currentFolderId}
          onMove={(folderId) => onMove(song.id, folderId)}
          onNewFolder={() => onRequestNewFolder(song.id)}
          onDelete={() => onRequestDelete(song)}
        />
      </div>

      <div className="relative z-10 flex flex-1 flex-col gap-1 p-5">
        {song.isTutorial ? (
          <span
            className="mb-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{ background: `${tone}18`, color: tone }}
          >
            <BookOpen className="size-2.5" />
            Tutorial
          </span>
        ) : null}
        {byline ? (
          <p
            className="truncate pr-8 text-[10px] font-medium tracking-[0.08em]"
            style={{ color: tone }}
            title={byline}
          >
            {byline}
          </p>
        ) : null}
        <h3 className="piano-serif text-foreground line-clamp-2 pr-8 text-xl font-semibold leading-tight tracking-tight">
          {song.title}
        </h3>
      </div>

      <div className="bg-background/60 border-border/40 relative z-10 border-t px-4 pb-3 pt-2 backdrop-blur-sm">
        <MiniRoll notes={preview} tone={tone} />
        <div className="text-muted-foreground mt-1 flex items-center justify-between text-[11px]">
          <span className="piano-mono">
            {song.noteCount} notes · {formatDuration(song.duration)} ·{' '}
            {getTempoLabel(song)} · {getMeterLabel(song)}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium',
              'bg-foreground/[0.04] text-foreground/70',
              'group-hover:bg-foreground group-hover:text-background transition-colors',
            )}
          >
            <Play className="size-2.5" />
            Practice
          </span>
        </div>
      </div>
    </div>
  )
}

type FolderSortControls = {
  setNodeRef?: (element: HTMLElement | null) => void
  setActivatorNodeRef?: (element: HTMLElement | null) => void
  attributes?: DraggableAttributes
  listeners?: DraggableSyntheticListeners
  style?: CSSProperties
  isDragging?: boolean
  isDropTarget?: boolean
  isSorting?: boolean
}

function FolderCard({
  folder,
  index,
  songs,
  notePreviewBySong,
  sortable,
  isDragOverlay = false,
  onOpen,
  onRequestDelete,
}: {
  folder: Folder
  index: number
  songs: SongSummary[]
  notePreviewBySong: Map<string, PianoNote[]>
  sortable?: FolderSortControls
  isDragOverlay?: boolean
  onOpen: (folderId: string) => void
  onRequestDelete: (folder: Folder) => void
}) {
  const songsInFolder = useMemo(() => {
    const byId = new Map(songs.map((song) => [song.id, song]))
    return sortSongsByTitle(
      folder.songIds
        .map((id) => byId.get(id))
        .filter((song): song is SongSummary => Boolean(song)),
    )
  }, [folder.songIds, songs])

  const previewSongs = songsInFolder.slice(0, 3)
  const remainder = Math.max(0, songsInFolder.length - previewSongs.length)
  const style = { ['--card-tone' as string]: folder.tone } as CSSProperties
  const dragHandleProps = {
    ...(sortable?.attributes ?? {}),
    ...(sortable?.listeners ?? {}),
  }

  return (
    <div
      ref={sortable?.setNodeRef}
      role={isDragOverlay ? undefined : 'button'}
      tabIndex={isDragOverlay ? undefined : 0}
      aria-label={isDragOverlay ? `Dragging ${folder.name}` : undefined}
      onClick={isDragOverlay ? undefined : () => onOpen(folder.id)}
      onKeyDown={
        isDragOverlay
          ? undefined
          : (event) => {
              if (event.target !== event.currentTarget) return
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onOpen(folder.id)
              }
            }
      }
      style={{
        ...style,
        ...sortable?.style,
        animationDelay: `${index * 35}ms`,
      }}
      className={cn(
        'piano-card-tone animate-piano-card-in group relative isolate flex h-56 flex-col overflow-hidden rounded-2xl text-left',
        'border-border/50 border shadow-sm',
        'transition-all duration-300 ease-out',
        isDragOverlay
          ? 'ring-primary/45 pointer-events-none cursor-grabbing shadow-2xl ring-2'
          : 'focus-visible:ring-primary/40 cursor-pointer hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2',
        sortable?.isSorting && 'will-change-transform',
        sortable?.isDragging &&
          'ring-primary/30 scale-[0.98] opacity-30 shadow-none ring-2',
        sortable?.isDropTarget &&
          !sortable.isDragging &&
          'ring-primary/65 ring-offset-background scale-[1.015] shadow-2xl ring-2 ring-offset-2',
      )}
    >
      {sortable?.isDropTarget && !sortable.isDragging ? (
        <div className="pointer-events-none absolute inset-x-4 top-3 z-30 flex justify-center">
          <span className="bg-primary text-primary-foreground shadow-primary/20 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] shadow-lg">
            Drop here
          </span>
        </div>
      ) : null}

      {sortable?.isDragging ? (
        <div className="bg-background/35 pointer-events-none absolute inset-0 z-30 flex items-center justify-center backdrop-blur-[1px]">
          <span className="bg-background/90 text-foreground border-border rounded-full border px-3 py-1 text-[11px] font-medium shadow-sm">
            Dragging
          </span>
        </div>
      ) : null}

      {sortable && !isDragOverlay ? (
        <div className="absolute left-3 top-3 z-20">
          <button
            ref={sortable.setActivatorNodeRef}
            type="button"
            aria-label={`Drag ${folder.name} to reorder`}
            onClick={(event) => event.stopPropagation()}
            className={cn(
              'inline-flex size-7 cursor-grab items-center justify-center rounded-full transition-all active:cursor-grabbing',
              'bg-background/70 text-foreground/70 hover:bg-background hover:text-foreground',
              'border-border/50 border backdrop-blur',
              sortable.isSorting
                ? 'opacity-100 shadow-sm'
                : 'opacity-0 focus-visible:opacity-100 group-hover:opacity-100',
            )}
            {...dragHandleProps}
          >
            <GripVertical className="size-3.5" />
          </button>
        </div>
      ) : null}

      {!isDragOverlay ? (
        <div className="absolute right-3 top-3 z-20">
          <button
            type="button"
            aria-label={`Delete folder ${folder.name}`}
            onClick={(event) => {
              event.stopPropagation()
              onRequestDelete(folder)
            }}
            className={cn(
              'inline-flex size-7 cursor-pointer items-center justify-center rounded-full transition-all',
              'bg-background/70 text-foreground/80 hover:bg-background hover:text-destructive',
              'border-border/50 border backdrop-blur',
              'opacity-0 focus-visible:opacity-100 group-hover:opacity-100',
            )}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ) : null}

      <div className="relative z-10 flex flex-1 flex-col gap-1 p-5">
        <p className="text-muted-foreground/70 flex h-4 items-center gap-1.5 text-[10px] font-medium uppercase leading-none tracking-[0.16em]">
          <FolderIcon className="size-3 shrink-0 opacity-70" aria-hidden />
          <span className="leading-none">
            {songsInFolder.length}{' '}
            {songsInFolder.length === 1 ? 'song' : 'songs'}
          </span>
        </p>
        <h3 className="piano-serif text-foreground line-clamp-2 pr-8 text-xl font-semibold leading-tight tracking-tight">
          {folder.name}
        </h3>
      </div>

      <div className="bg-background/60 border-border/40 relative z-10 flex flex-col gap-1 border-t px-4 pb-3 pt-2 backdrop-blur-sm">
        {previewSongs.length === 0 ? (
          <p className="text-muted-foreground/80 text-[11.5px] italic">
            Drop sheets here from the menu on any card.
          </p>
        ) : (
          previewSongs.map((song) => {
            const preview = notePreviewBySong.get(song.id) ?? []
            const tone = songTone(preview)
            return (
              <div
                key={song.id}
                className="flex items-center gap-2 text-[11.5px]"
              >
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ background: tone }}
                />
                <span className="piano-serif text-foreground truncate">
                  {song.title}
                </span>
                <span className="text-muted-foreground/70 piano-mono ml-auto shrink-0 text-[10px]">
                  {formatDuration(song.duration)}
                </span>
              </div>
            )
          })
        )}
        {remainder > 0 ? (
          <p className="text-muted-foreground/70 piano-mono mt-0.5 text-[10px]">
            +{remainder} more
          </p>
        ) : null}
      </div>
    </div>
  )
}

function SortableFolderCard({
  folder,
  index,
  songs,
  notePreviewBySong,
  isDropTarget,
  isSorting,
  onOpen,
  onRequestDelete,
}: {
  folder: Folder
  index: number
  songs: SongSummary[]
  notePreviewBySong: Map<string, PianoNote[]>
  isDropTarget: boolean
  isSorting: boolean
  onOpen: (folderId: string) => void
  onRequestDelete: (folder: Folder) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: folder.id })

  return (
    <FolderCard
      folder={folder}
      index={index}
      songs={songs}
      notePreviewBySong={notePreviewBySong}
      sortable={{
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        style: {
          transform: DndCSS.Transform.toString(transform),
          transition,
        },
        isDragging,
        isDropTarget,
        isSorting,
      }}
      onOpen={onOpen}
      onRequestDelete={onRequestDelete}
    />
  )
}

function CoursesTabContent({
  summaries,
  onOpenCourse,
}: {
  summaries: CourseSummary[]
  onOpenCourse: (courseId: string) => void
}) {
  return (
    <section className="animate-piano-chrome-in">
      <div className="mb-6">
        <h2 className="piano-serif text-foreground text-3xl font-semibold tracking-tight">
          Courses
        </h2>
        <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-6">
          Guided paths from absolute beginner to advanced expression. Each
          lesson is a short exercise paired with what to listen for. You can
          skip ahead any time.
        </p>
      </div>
      <CoursesRow summaries={summaries} onOpenCourse={onOpenCourse} />
    </section>
  )
}

function EditableFolderTitle({
  folder,
  onRename,
}: {
  folder: Folder
  onRename: (name: string) => void
}) {
  const ref = useRef<HTMLHeadingElement>(null)
  const [editing, setEditing] = useState(false)

  // Keep the DOM text in sync with the folder name whenever we are NOT editing.
  // Writing via ref (rather than JSX children) means React never overwrites
  // the user's in-progress edit during mid-typing re-renders.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || editing) return
    if (el.textContent !== folder.name) {
      el.textContent = folder.name
    }
  }, [editing, folder.name])

  // On entering edit mode: focus and select the title text so typing replaces it.
  useEffect(() => {
    if (!editing) return
    const el = ref.current
    if (!el) return
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }, [editing])

  const commit = () => {
    const next = (ref.current?.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (next && next !== folder.name) {
      onRename(next)
    } else if (ref.current) {
      ref.current.textContent = folder.name
    }
    setEditing(false)
  }

  const cancel = () => {
    if (ref.current) ref.current.textContent = folder.name
    setEditing(false)
  }

  return (
    <h2
      ref={ref}
      contentEditable={editing}
      suppressContentEditableWarning
      role={editing ? 'textbox' : undefined}
      aria-label={editing ? 'Folder name' : undefined}
      spellCheck={editing}
      onClick={() => {
        if (!editing) setEditing(true)
      }}
      onBlur={() => {
        if (editing) commit()
      }}
      onPaste={(event) => {
        // Strip rich text on paste so the heading stays plain.
        event.preventDefault()
        const text = event.clipboardData.getData('text/plain')
        const selection = window.getSelection()
        if (!selection || selection.rangeCount === 0) return
        const range = selection.getRangeAt(0)
        range.deleteContents()
        range.insertNode(document.createTextNode(text))
        range.collapse(false)
      }}
      onKeyDown={(event) => {
        if (!editing) return
        if (event.key === 'Enter') {
          event.preventDefault()
          ref.current?.blur()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          cancel()
        }
      }}
      className={cn(
        'piano-serif text-foreground text-3xl font-semibold tracking-tight',
        'inline cursor-text whitespace-pre-wrap break-words outline-none',
      )}
    />
  )
}

export function LibraryView({
  songs,
  isLoading,
  isError,
  notePreviewBySong,
  openFolderId,
  onOpenFolder,
  onCloseFolder,
  onSelect,
  courseSummaries,
  onOpenCourse,
  tab: view,
  onTabChange: setView,
}: LibraryViewProps) {
  const hasSongs = songs.length > 0
  const {
    folders,
    addFolder,
    deleteFolder,
    moveSong,
    renameFolder,
    reorderFolders,
  } = useFolders()
  const folderIds = useMemo(() => folders.map((folder) => folder.id), [folders])
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const [catalogOpen, setCatalogOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [pendingMoveSongId, setPendingMoveSongId] = useState<string | null>(
    null,
  )
  const [folderPendingDelete, setFolderPendingDelete] = useState<Folder | null>(
    null,
  )
  const [isDeletingFolder, setIsDeletingFolder] = useState(false)
  const [songPendingDelete, setSongPendingDelete] =
    useState<SongSummary | null>(null)
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [overFolderId, setOverFolderId] = useState<string | null>(null)
  const [isDraggingMidi, setIsDraggingMidi] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileDragDepthRef = useRef(0)

  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const deleteSongMutation = useMutation({
    mutationFn: async (songId: string) => {
      const res = await fetchWithWorkspace(`/api/songs/${songId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(body?.error ?? 'Failed to delete song')
      }
      return songId
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['songs', workspaceId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['song-previews', workspaceId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['folders', workspaceId],
      })
    },
  })

  const invalidateLibrary = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['songs', workspaceId] })
    void queryClient.invalidateQueries({
      queryKey: ['song-previews', workspaceId],
    })
    void queryClient.invalidateQueries({ queryKey: ['folders', workspaceId] })
    void queryClient.invalidateQueries({
      queryKey: ['library-revision', workspaceId],
    })
  }, [queryClient, workspaceId])

  const existingSongIds = useMemo(
    () => new Set(songs.map((song) => song.id)),
    [songs],
  )

  const importMidiPathsMutation = useMutation({
    mutationFn: async ({
      paths,
      folderId,
    }: {
      paths: string[]
      folderId: string | null
    }) => {
      const reserved = new Set(existingSongIds)
      const imported: MidiImportResult[] = []
      for (const path of paths) {
        const fileName = fileNameFromPath(path)
        const title = titleFromMidiName(fileName) || 'Imported MIDI'
        const res = await fetchWithWorkspace('/api/song-import/midi-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath: path,
            songId: uniqueSongId(fileName, reserved),
            title,
            folderId: folderId ?? undefined,
            source: `Dropped MIDI: ${path}`,
          }),
        })
        if (!res.ok) throw new Error(await readImportError(res))
        imported.push((await res.json()) as MidiImportResult)
      }
      return imported
    },
    onMutate: () => {
      setImportError(null)
      setImportMessage('Importing MIDI…')
    },
    onSuccess: (imported) => {
      invalidateLibrary()
      const count = imported.length
      setImportMessage(
        count === 1 ? 'Imported 1 MIDI file.' : `Imported ${count} MIDI files.`,
      )
    },
    onError: (error) => {
      setImportMessage(null)
      setImportError(
        error instanceof Error ? error.message : 'Failed to import MIDI file',
      )
    },
  })

  const importMidiFilesMutation = useMutation({
    mutationFn: async ({
      files,
      folderId,
    }: {
      files: File[]
      folderId: string | null
    }) => {
      const reserved = new Set(existingSongIds)
      const imported: MidiImportResult[] = []
      for (const file of files) {
        const title = titleFromMidiName(file.name) || 'Imported MIDI'
        const form = new FormData()
        form.set('file', file)
        form.set('songId', uniqueSongId(file.name, reserved))
        form.set('title', title)
        form.set('source', `Dropped MIDI: ${file.name}`)
        if (folderId) form.set('folderId', folderId)
        const res = await fetchWithWorkspace('/api/song-import/midi-upload', {
          method: 'POST',
          body: form,
        })
        if (!res.ok) throw new Error(await readImportError(res))
        imported.push((await res.json()) as MidiImportResult)
      }
      return imported
    },
    onMutate: () => {
      setImportError(null)
      setImportMessage('Importing MIDI…')
    },
    onSuccess: (imported) => {
      invalidateLibrary()
      const count = imported.length
      setImportMessage(
        count === 1 ? 'Imported 1 MIDI file.' : `Imported ${count} MIDI files.`,
      )
    },
    onError: (error) => {
      setImportMessage(null)
      setImportError(
        error instanceof Error ? error.message : 'Failed to import MIDI file',
      )
    },
  })

  const songFolderById = useMemo(() => {
    const map = new Map<string, string>()
    for (const folder of folders) {
      for (const songId of folder.songIds) map.set(songId, folder.id)
    }
    return map
  }, [folders])

  const trimmedFilter = filter.trim()
  const normalizedFilter = trimmedFilter
    ? normalizeForSearch(trimmedFilter)
    : ''

  const songsInActiveScope = useMemo(() => {
    if (openFolderId) {
      const folder = folders.find((f) => f.id === openFolderId)
      if (!folder) return []
      const byId = new Map(songs.map((song) => [song.id, song]))
      return sortSongsByTitle(
        folder.songIds
          .map((id) => byId.get(id))
          .filter((song): song is SongSummary => Boolean(song)),
      )
    }
    return sortSongsByTitle(
      songs.filter((song) => !songFolderById.has(song.id)),
    )
  }, [folders, openFolderId, songFolderById, songs])

  const filteredSongs = useMemo(() => {
    if (!normalizedFilter) return songsInActiveScope
    return songsInActiveScope.filter((song) => {
      const haystack = normalizeForSearch(
        [song.title, song.composer ?? '', song.artist ?? ''].join(' '),
      )
      return haystack.includes(normalizedFilter)
    })
  }, [songsInActiveScope, normalizedFilter])

  const openFolder = openFolderId
    ? (folders.find((folder) => folder.id === openFolderId) ?? null)
    : null
  const activeFolder = activeFolderId
    ? (folders.find((folder) => folder.id === activeFolderId) ?? null)
    : null
  const isSortingFolders = activeFolderId !== null

  const showFilter = songsInActiveScope.length > 3
  const showFolders = !openFolderId && folders.length > 0
  const totalSongsInScope = songsInActiveScope.length
  const midiImportPending =
    importMidiPathsMutation.isPending || importMidiFilesMutation.isPending

  const importDroppedPaths = useCallback(
    (paths: string[]) => {
      const midiPaths = midiPathsFromList(paths)
      if (midiPaths.length === 0) return
      importMidiPathsMutation.mutate({
        paths: midiPaths,
        folderId: openFolderId,
      })
    },
    [importMidiPathsMutation, openFolderId],
  )

  const importDroppedFiles = useCallback(
    (files: File[]) => {
      const midiFiles = files.filter((file) => /\.(mid|midi)$/i.test(file.name))
      if (midiFiles.length === 0) return
      importMidiFilesMutation.mutate({
        files: midiFiles,
        folderId: openFolderId,
      })
    },
    [importMidiFilesMutation, openFolderId],
  )

  useEffect(() => {
    const handleMessage = (event: MessageEvent<MoldableFileDropMessage>) => {
      const data = event.data
      if (!data || typeof data !== 'object') return

      if (data.type === 'moldable:file-drag-over') {
        setIsDraggingMidi(true)
        return
      }

      if (data.type === 'moldable:file-drag-leave') {
        fileDragDepthRef.current = 0
        setIsDraggingMidi(false)
        return
      }

      if (data.type !== 'moldable:file-drop') return

      fileDragDepthRef.current = 0
      setIsDraggingMidi(false)
      importDroppedPaths(data.paths ?? [])
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [importDroppedPaths])

  useEffect(() => {
    if (!importMessage || midiImportPending) return
    const timer = window.setTimeout(() => setImportMessage(null), 3600)
    return () => window.clearTimeout(timer)
  }, [importMessage, midiImportPending])

  const handleDragEnter = useCallback((event: DragEvent<HTMLElement>) => {
    if (!hasFileDrag(event)) return
    event.preventDefault()
    fileDragDepthRef.current += 1
    setIsDraggingMidi(true)
  }, [])

  const handleDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    if (!hasFileDrag(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    if (!hasFileDrag(event)) return
    event.preventDefault()
    fileDragDepthRef.current = Math.max(0, fileDragDepthRef.current - 1)
    if (fileDragDepthRef.current === 0) setIsDraggingMidi(false)
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!hasFileDrag(event)) return
      event.preventDefault()
      fileDragDepthRef.current = 0
      setIsDraggingMidi(false)

      const files = midiFilesFromList(event.dataTransfer.files)
      if (files.length === 0) return
      importDroppedFiles(files)
    },
    [importDroppedFiles],
  )

  const handleNewFolderClick = () => {
    setPendingMoveSongId(null)
    setNewFolderOpen(true)
  }

  const handleRequestNewFolderForSong = (songId: string) => {
    setPendingMoveSongId(songId)
    setNewFolderOpen(true)
  }

  const handleCreateFolder = async (name: string) => {
    const folder = await addFolder(name)
    if (pendingMoveSongId) {
      await moveSong(pendingMoveSongId, folder.id)
      setPendingMoveSongId(null)
    }
  }

  const confirmDeleteFolder = async () => {
    if (!folderPendingDelete) return
    setIsDeletingFolder(true)
    try {
      await deleteFolder(folderPendingDelete.id)
      if (openFolderId === folderPendingDelete.id) onCloseFolder()
      setFolderPendingDelete(null)
    } finally {
      setIsDeletingFolder(false)
    }
  }

  const handleMoveSong = (songId: string, folderId: string | null) => {
    void moveSong(songId, folderId)
  }

  const resetFolderDragState = () => {
    setActiveFolderId(null)
    setOverFolderId(null)
  }

  const handleFolderDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id)
    setActiveFolderId(id)
    setOverFolderId(id)
  }

  const handleFolderDragOver = (event: DragOverEvent) => {
    setOverFolderId(event.over?.id ? String(event.over.id) : null)
  }

  const handleFolderDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id)
    const overId = event.over?.id ? String(event.over.id) : null
    resetFolderDragState()

    if (!overId || activeId === overId) return

    const oldIndex = folderIds.indexOf(activeId)
    const newIndex = folderIds.indexOf(overId)
    if (oldIndex === -1 || newIndex === -1) return

    const nextFolderIds = arrayMove(folderIds, oldIndex, newIndex)
    void reorderFolders(nextFolderIds).catch(() => {
      // The optimistic mutation rolls back and refetches if persistence fails.
    })
  }

  const confirmDeleteSong = async () => {
    if (!songPendingDelete) return
    try {
      await deleteSongMutation.mutateAsync(songPendingDelete.id)
      setSongPendingDelete(null)
    } catch {
      // mutation surfaces the error via isError; leave dialog open
    }
  }

  return (
    <div
      className="animate-piano-view-back relative flex h-full min-h-0 flex-col overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="piano-no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-6 pb-[calc(var(--chat-safe-padding,0px)+4rem)] pt-10">
          {!openFolder && courseSummaries.length > 0 ? (
            <div className="animate-piano-chrome-in mb-8 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setView('library')}
                className={cn(
                  'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium transition-colors',
                  view === 'library'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                )}
              >
                <LibraryIcon className="size-3.5" />
                Library
              </button>
              <button
                type="button"
                onClick={() => setView('courses')}
                className={cn(
                  'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium transition-colors',
                  view === 'courses'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                )}
              >
                <GraduationCap className="size-3.5" />
                Courses
                <span
                  className={cn(
                    'piano-mono ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] tabular-nums',
                    view === 'courses'
                      ? 'bg-background/15 text-background'
                      : 'bg-muted/50 text-muted-foreground',
                  )}
                >
                  {courseSummaries.length}
                </span>
              </button>
            </div>
          ) : null}

          {!openFolder && view === 'courses' ? (
            <CoursesTabContent
              summaries={courseSummaries}
              onOpenCourse={onOpenCourse}
            />
          ) : null}

          {!openFolder && view === 'courses' ? null : openFolder ? (
            <section className="animate-piano-chrome-in mb-10">
              <button
                type="button"
                onClick={() => {
                  setFilter('')
                  onCloseFolder()
                }}
                className="text-muted-foreground hover:text-foreground -ml-1.5 mb-2 inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-1.5 text-xs transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                Library
              </button>
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <p
                    className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em]"
                    style={{ color: openFolder.tone }}
                  >
                    {totalSongsInScope === 1
                      ? '1 song'
                      : `${totalSongsInScope} songs`}
                  </p>
                  <EditableFolderTitle
                    folder={openFolder}
                    onRename={(name) => {
                      void renameFolder(openFolder.id, name)
                    }}
                  />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive cursor-pointer gap-1.5 rounded-full px-3 text-[12px]"
                    onClick={() => setFolderPendingDelete(openFolder)}
                  >
                    <Trash2 className="size-3.5" />
                    Delete folder
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer gap-1.5 rounded-full px-3.5 text-[12px]"
                    onClick={() => setCatalogOpen(true)}
                  >
                    <Search className="size-3.5" />
                    Find sheet music
                  </Button>
                </div>
              </div>
            </section>
          ) : (
            <section className="animate-piano-chrome-in mb-10 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <h2 className="piano-serif text-foreground text-3xl font-semibold tracking-tight">
                  Tap a song to play it.
                </h2>
                <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-6">
                  Search public-domain pieces from the Mutopia Project or drop
                  MIDI files here to convert them automatically.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer gap-1.5 rounded-full px-3.5 text-[12px]"
                  onClick={handleNewFolderClick}
                >
                  <FolderPlus className="size-3.5" />
                  New folder
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer gap-1.5 rounded-full px-3.5 text-[12px]"
                  onClick={() => setCatalogOpen(true)}
                >
                  <Search className="size-3.5" />
                  Find sheet music
                </Button>
              </div>
            </section>
          )}

          {!openFolder && view === 'courses' ? null : (
            <>
              {showFilter ? (
                <div className="animate-piano-chrome-in mb-5 flex items-center gap-3">
                  <div className="relative max-w-sm flex-1">
                    <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2" />
                    <input
                      type="search"
                      value={filter}
                      onChange={(event) => setFilter(event.target.value)}
                      placeholder={
                        openFolder
                          ? `Filter ${openFolder.name}…`
                          : 'Filter your library…'
                      }
                      className={cn(
                        'border-border/70 bg-muted/30 focus:bg-background focus:border-foreground/30 h-8 w-full rounded-full border pl-9 pr-9 text-[12.5px] outline-none transition-colors',
                        'placeholder:text-muted-foreground/80',
                      )}
                    />
                    {filter ? (
                      <button
                        type="button"
                        onClick={() => setFilter('')}
                        className="text-muted-foreground hover:text-foreground absolute right-1.5 top-1/2 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full"
                        aria-label="Clear filter"
                      >
                        <X className="size-3" />
                      </button>
                    ) : null}
                  </div>
                  <span className="text-muted-foreground piano-mono shrink-0 text-[11px]">
                    {trimmedFilter
                      ? `${filteredSongs.length} of ${totalSongsInScope}`
                      : `${totalSongsInScope} song${totalSongsInScope === 1 ? '' : 's'}`}
                  </span>
                </div>
              ) : null}

              {isLoading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="bg-muted/30 h-52 animate-pulse rounded-2xl"
                    />
                  ))}
                </div>
              ) : isError ? (
                <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-6 text-sm">
                  Could not load songs.
                </div>
              ) : !hasSongs ? (
                <div className="border-border/60 rounded-2xl border border-dashed p-10 text-center">
                  <p className="piano-serif text-foreground text-lg">
                    No songs yet
                  </p>
                  <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
                    Browse public-domain pieces or drop a MIDI file here to
                    convert it automatically.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4 cursor-pointer gap-1.5 rounded-full"
                    onClick={() => setCatalogOpen(true)}
                  >
                    <Search className="size-3.5" />
                    Find sheet music
                  </Button>
                </div>
              ) : openFolder && totalSongsInScope === 0 ? (
                <div className="border-border/60 rounded-2xl border border-dashed p-10 text-center">
                  <p className="piano-serif text-foreground text-lg">
                    This folder is empty
                  </p>
                  <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
                    Drop MIDI files here to convert them into{' '}
                    <span className="text-foreground/80">
                      {openFolder.name}
                    </span>
                    .
                  </p>
                </div>
              ) : filteredSongs.length === 0 && trimmedFilter ? (
                <div className="border-border/60 rounded-2xl border border-dashed p-10 text-center">
                  <p className="piano-serif text-foreground text-lg">
                    Nothing matches “{filter.trim()}”
                  </p>
                  <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
                    Try a different title, composer, or artist.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4 cursor-pointer rounded-full"
                    onClick={() => setFilter('')}
                  >
                    Clear filter
                  </Button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleFolderDragStart}
                  onDragOver={handleFolderDragOver}
                  onDragCancel={resetFolderDragState}
                  onDragEnd={handleFolderDragEnd}
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {showFolders && !trimmedFilter ? (
                      <SortableContext
                        items={folderIds}
                        strategy={rectSortingStrategy}
                      >
                        {folders.map((folder, index) => (
                          <SortableFolderCard
                            key={folder.id}
                            folder={folder}
                            index={index}
                            songs={songs}
                            notePreviewBySong={notePreviewBySong}
                            isDropTarget={overFolderId === folder.id}
                            isSorting={isSortingFolders}
                            onOpen={(id) => {
                              const folder = folders.find(
                                (candidate) => candidate.id === id,
                              )
                              if (folder) onOpenFolder(folder)
                              setFilter('')
                            }}
                            onRequestDelete={(folder) =>
                              setFolderPendingDelete(folder)
                            }
                          />
                        ))}
                      </SortableContext>
                    ) : null}

                    {filteredSongs.map((song, songIndex) => {
                      const preview = notePreviewBySong.get(song.id) ?? []
                      const offset =
                        showFolders && !trimmedFilter ? folders.length : 0
                      return (
                        <SongCard
                          key={song.id}
                          song={song}
                          preview={preview}
                          index={songIndex + offset}
                          folders={folders}
                          currentFolderId={songFolderById.get(song.id) ?? null}
                          onSelect={onSelect}
                          onMove={handleMoveSong}
                          onRequestNewFolder={handleRequestNewFolderForSong}
                          onRequestDelete={(target) =>
                            setSongPendingDelete(target)
                          }
                        />
                      )
                    })}
                  </div>
                  <DragOverlay>
                    {activeFolder ? (
                      <div className="w-[min(20rem,calc(100vw-3rem))] rotate-1">
                        <FolderCard
                          folder={activeFolder}
                          index={0}
                          songs={songs}
                          notePreviewBySong={notePreviewBySong}
                          isDragOverlay
                          onOpen={() => undefined}
                          onRequestDelete={() => undefined}
                        />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </>
          )}
        </div>
      </div>

      {isDraggingMidi ? (
        <div className="bg-background/72 pointer-events-none absolute inset-0 z-30 flex items-center justify-center backdrop-blur-sm">
          <div className="border-border/70 bg-background/95 text-foreground rounded-2xl border px-6 py-5 text-center shadow-xl">
            <p className="piano-serif text-lg font-semibold">
              {openFolder
                ? `Drop MIDI into ${openFolder.name}`
                : 'Drop MIDI files'}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Piano will convert .mid and .midi files into playable songs.
            </p>
          </div>
        </div>
      ) : null}

      {midiImportPending || importMessage || importError ? (
        <div className="pointer-events-none absolute bottom-[calc(var(--chat-safe-padding,0px)+1rem)] left-1/2 z-40 -translate-x-1/2 px-4">
          <div
            className={cn(
              'border-border/70 bg-background/95 text-foreground rounded-full border px-4 py-2 text-[12px] shadow-lg backdrop-blur',
              importError && 'border-destructive/35 text-destructive',
            )}
          >
            {importError ?? importMessage ?? 'Importing MIDI…'}
          </div>
        </div>
      ) : null}

      <CatalogSearchDialog open={catalogOpen} onOpenChange={setCatalogOpen} />
      <NewFolderDialog
        open={newFolderOpen}
        onOpenChange={(open) => {
          setNewFolderOpen(open)
          if (!open) setPendingMoveSongId(null)
        }}
        onCreate={handleCreateFolder}
      />
      <AlertDialog
        open={folderPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeletingFolder) setFolderPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="piano-serif text-foreground text-lg">
              Delete “{folderPendingDelete?.name}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The folder will be removed.{' '}
              {folderPendingDelete && folderPendingDelete.songIds.length > 0
                ? `${folderPendingDelete.songIds.length} ${
                    folderPendingDelete.songIds.length === 1 ? 'song' : 'songs'
                  } inside will return to your library — no sheet music is deleted.`
                : 'No songs are inside, so nothing else changes.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingFolder}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingFolder}
              onClick={(event) => {
                event.preventDefault()
                void confirmDeleteFolder()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingFolder ? 'Deleting…' : 'Delete folder'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={songPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteSongMutation.isPending) {
            setSongPendingDelete(null)
            deleteSongMutation.reset()
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="piano-serif text-foreground text-lg">
              Delete “{songPendingDelete?.title}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the song from your library. You can re-install it
              from the Mutopia catalog or ask Moldable chat to transcribe it
              again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteSongMutation.isError ? (
            <p className="text-destructive -mt-2 text-[12px]">
              {deleteSongMutation.error instanceof Error
                ? deleteSongMutation.error.message
                : 'Could not delete song.'}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSongMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteSongMutation.isPending}
              onClick={(event) => {
                event.preventDefault()
                void confirmDeleteSong()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSongMutation.isPending ? 'Deleting…' : 'Delete song'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
