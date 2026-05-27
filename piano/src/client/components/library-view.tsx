import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FolderPlus, Play, Search, Trash2, X } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
import {
  type PianoNote,
  type SongSummary,
  getMeterLabel,
  getTempoLabel,
} from '../../shared/song'
import { formatDuration, midiToTone } from '../piano-utils'
import { type Folder, useFolders } from '../use-folders'
import { CatalogSearchDialog } from './catalog-search-dialog'
import { MoveToMenu } from './move-to-menu'
import { NewFolderDialog } from './new-folder-dialog'

interface LibraryViewProps {
  songs: SongSummary[]
  isLoading: boolean
  isError: boolean
  notePreviewBySong: Map<string, PianoNote[]>
  openFolderId: string | null
  onOpenFolder: (folder: Folder) => void
  onCloseFolder: () => void
  onSelect: (song: SongSummary) => void
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

function FolderCard({
  folder,
  index,
  songs,
  notePreviewBySong,
  onOpen,
  onRequestDelete,
}: {
  folder: Folder
  index: number
  songs: SongSummary[]
  notePreviewBySong: Map<string, PianoNote[]>
  onOpen: (folderId: string) => void
  onRequestDelete: (folder: Folder) => void
}) {
  const songsInFolder = useMemo(() => {
    const byId = new Map(songs.map((song) => [song.id, song]))
    return folder.songIds
      .map((id) => byId.get(id))
      .filter((song): song is SongSummary => Boolean(song))
  }, [folder.songIds, songs])

  const previewSongs = songsInFolder.slice(0, 3)
  const remainder = Math.max(0, songsInFolder.length - previewSongs.length)
  const style = { ['--card-tone' as string]: folder.tone } as CSSProperties

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(folder.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(folder.id)
        }
      }}
      style={{ ...style, animationDelay: `${index * 35}ms` }}
      className={cn(
        'piano-card-tone animate-piano-card-in group relative isolate flex h-56 flex-col overflow-hidden rounded-2xl text-left',
        'border-border/50 border shadow-sm',
        'cursor-pointer transition-all duration-300 ease-out',
        'focus-visible:ring-primary/40 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2',
      )}
    >
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

      <div className="relative z-10 flex flex-1 flex-col gap-1 p-5">
        <p
          className="text-[10px] font-medium uppercase tracking-[0.18em]"
          style={{ color: folder.tone }}
        >
          Folder · {songsInFolder.length}{' '}
          {songsInFolder.length === 1 ? 'song' : 'songs'}
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
}: LibraryViewProps) {
  const hasSongs = songs.length > 0
  const { folders, addFolder, deleteFolder, moveSong, renameFolder } =
    useFolders()

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
      return folder.songIds
        .map((id) => byId.get(id))
        .filter((song): song is SongSummary => Boolean(song))
    }
    return songs.filter((song) => !songFolderById.has(song.id))
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

  const showFilter = songsInActiveScope.length > 3
  const showFolders = !openFolderId && folders.length > 0
  const totalSongsInScope = songsInActiveScope.length

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
    <div className="animate-piano-view-back relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="piano-no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-6 pb-[calc(var(--chat-safe-padding,0px)+4rem)] pt-10">
          {openFolder ? (
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
                    Folder ·{' '}
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
                  Search public-domain pieces from the Mutopia Project or ask
                  Moldable chat to add one from a MIDI file.
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
                Browse public-domain pieces or ask Moldable chat to add one from
                a MIDI file.
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
                Open the “…” menu on any song card to move it into{' '}
                <span className="text-foreground/80">{openFolder.name}</span>.
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {showFolders && !trimmedFilter
                ? folders.map((folder, index) => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      index={index}
                      songs={songs}
                      notePreviewBySong={notePreviewBySong}
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
                  ))
                : null}

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
                    onRequestDelete={(target) => setSongPendingDelete(target)}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>

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
