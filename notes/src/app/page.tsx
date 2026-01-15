'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  ArchiveRestore,
  Hash,
  Inbox,
  Pin,
  PinOff,
  Plus,
  Search,
  StickyNote,
  Tag,
  Trash,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { MarkdownEditor } from '@moldable/editor'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Markdown,
  ScrollArea,
  cn,
  useWorkspace,
} from '@moldable/ui'
import type { Note } from '../lib/types'
import { EmptyState } from '../components/empty-state'
import { Masonry } from 'masonic'

type ViewType = 'all' | 'archive' | 'trash' | `label:${string}`

// Move toCapitalCase outside component to avoid recreation
const toCapitalCase = (str: string) => {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default function NotesPage() {
  const queryClient = useQueryClient()
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [currentView, setCurrentView] = useState<ViewType>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ['notes', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/notes')
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  // Grouping labels
  const allLabels = useMemo(() => {
    const labels = new Set<string>()
    notes.forEach((note) => {
      if (!note.isDeleted) {
        note.labels?.forEach((label) => labels.add(toCapitalCase(label)))
      }
    })
    return Array.from(labels).sort()
  }, [notes])

  const saveNotesMutation = useMutation({
    mutationFn: async (updatedNotes: Note[]) => {
      const res = await fetchWithWorkspace('/api/notes', {
        method: 'POST',
        body: JSON.stringify(updatedNotes),
      })
      if (!res.ok) throw new Error('Failed to save')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', workspaceId] })
    },
  })

  const handleSaveNote = (noteUpdate: Partial<Note>) => {
    const now = new Date().toISOString()
    let updatedNotes: Note[]

    if (editingNote) {
      updatedNotes = notes.map((n) =>
        n.id === editingNote.id ? { ...n, ...noteUpdate, updatedAt: now } : n,
      )
    } else {
      const newNote: Note = {
        id: crypto.randomUUID(),
        title: noteUpdate.title ?? '',
        content: noteUpdate.content ?? '',
        isPinned: noteUpdate.isPinned ?? false,
        isArchived: false,
        isDeleted: false,
        labels: noteUpdate.labels ?? [],
        createdAt: now,
        updatedAt: now,
      }
      updatedNotes = [newNote, ...notes]
    }

    saveNotesMutation.mutate(updatedNotes)
    setEditingNote(null)
    setIsCreating(false)
  }

  const handleMoveToTrash = useCallback(
    (id: string) => {
      saveNotesMutation.mutate(
        notes.map((n) =>
          n.id === id ? { ...n, isDeleted: true, isPinned: false } : n,
        ),
      )
    },
    [notes, saveNotesMutation],
  )

  const handleRestoreFromTrash = useCallback(
    (id: string) => {
      saveNotesMutation.mutate(
        notes.map((n) => (n.id === id ? { ...n, isDeleted: false } : n)),
      )
    },
    [notes, saveNotesMutation],
  )

  const handlePermanentDelete = useCallback(
    (id: string) => {
      saveNotesMutation.mutate(notes.filter((n) => n.id !== id))
    },
    [notes, saveNotesMutation],
  )

  const handleEmptyTrash = useCallback(() => {
    saveNotesMutation.mutate(notes.filter((n) => !n.isDeleted))
  }, [notes, saveNotesMutation])

  const togglePin = useCallback(
    (id: string) => {
      saveNotesMutation.mutate(
        notes.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n)),
      )
    },
    [notes, saveNotesMutation],
  )

  const toggleArchive = useCallback(
    (id: string) => {
      saveNotesMutation.mutate(
        notes.map((n) =>
          n.id === id
            ? { ...n, isArchived: !n.isArchived, isPinned: false }
            : n,
        ),
      )
    },
    [notes, saveNotesMutation],
  )

  const handleEditNote = useCallback((note: Note) => {
    setEditingNote(note)
  }, [])

  const filteredNotes = useMemo(() => {
    let result = notes

    // Filter by view
    if (currentView === 'trash') {
      result = result.filter((n) => n.isDeleted)
    } else if (currentView === 'archive') {
      result = result.filter((n) => n.isArchived && !n.isDeleted)
    } else if (currentView === 'all') {
      result = result.filter((n) => !n.isArchived && !n.isDeleted)
    } else if (currentView.startsWith('label:')) {
      const label = currentView.split('label:')[1]
      result = result.filter(
        (n) =>
          !n.isDeleted && n.labels?.some((l) => toCapitalCase(l) === label),
      )
    }

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.content?.toLowerCase().includes(q) ||
          n.labels?.some((l) => l.toLowerCase().includes(q)),
      )
    }

    return result
  }, [notes, currentView, searchQuery])

  const pinnedNotes = filteredNotes.filter((n) => n.isPinned)
  const otherNotes = filteredNotes.filter((n) => !n.isPinned)

  const viewTitle = useMemo(() => {
    if (currentView === 'all') return 'Notes'
    if (currentView === 'archive') return 'Archive'
    if (currentView === 'trash') return 'Trash'
    if (currentView.startsWith('label:')) return currentView.split('label:')[1]
    return 'Notes'
  }, [currentView])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="bg-background flex h-screen w-full">
      {/* Sidebar */}
      <aside className="bg-sidebar flex w-64 shrink-0 flex-col border-r">
        <ScrollArea className="flex-1 px-3 pt-4">
          <nav className="space-y-1">
            <SidebarItem
              icon={<Inbox className="size-4" />}
              label="Notes"
              active={currentView === 'all'}
              onClick={() => setCurrentView('all')}
            />
            {/* Labels section */}
            <div className="mt-6 px-3">
              <h2 className="text-muted-foreground/70 mb-2 text-xs font-semibold uppercase tracking-wider">
                Labels
              </h2>
              {allLabels.length > 0 ? (
                allLabels.map((label) => (
                  <SidebarItem
                    key={label}
                    icon={<Tag className="size-4" />}
                    label={label}
                    active={currentView === `label:${label}`}
                    onClick={() => setCurrentView(`label:${label}`)}
                  />
                ))
              ) : (
                <div className="text-muted-foreground/50 px-3 py-2 text-xs italic">
                  No labels yet
                </div>
              )}
            </div>
          </nav>
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="space-y-1 border-t p-3">
          <SidebarItem
            icon={<Archive className="size-4" />}
            label="Archive"
            active={currentView === 'archive'}
            onClick={() => setCurrentView('archive')}
          />
          <SidebarItem
            icon={<Trash2 className="size-4" />}
            label="Trash"
            active={currentView === 'trash'}
            onClick={() => setCurrentView('trash')}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header / Search */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-6">
          <div className="flex flex-1 items-center gap-4">
            <div className="relative w-full max-w-md">
              <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search notes..."
                className="bg-muted/50 focus:bg-background focus:ring-primary/20 w-full rounded-md border py-2 pl-10 pr-4 text-sm outline-none transition-colors focus:ring-1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {currentView === 'trash' && notes.some((n) => n.isDeleted) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleEmptyTrash}
              >
                Empty Trash
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setIsCreating(true)}
              className="gap-2"
            >
              <Plus className="size-4" />
              New Note
            </Button>
          </div>
        </header>

        {/* Notes Grid */}
        <MasonryNotesGrid
          pinnedNotes={pinnedNotes}
          otherNotes={otherNotes}
          filteredNotes={filteredNotes}
          viewTitle={viewTitle}
          searchQuery={searchQuery}
          onEdit={handleEditNote}
          onTrash={handleMoveToTrash}
          onRestore={handleRestoreFromTrash}
          onDelete={handlePermanentDelete}
          onTogglePin={togglePin}
          onToggleArchive={toggleArchive}
        />
      </main>

      {/* Editor Modal */}
      {(isCreating || editingNote) && (
        <NoteEditor
          initialNote={editingNote ?? undefined}
          allLabels={allLabels}
          onSave={handleSaveNote}
          onCancel={() => {
            setEditingNote(null)
            setIsCreating(false)
          }}
        />
      )}
    </div>
  )
}

// Masonry grid item - wraps NoteCard for use with masonic
type MasonryItemData = {
  note: Note
  onEdit: (note: Note) => void
  onTrash: (id: string) => void
  onDelete: (id: string) => void
  onRestore: (id: string) => void
  onTogglePin: (id: string) => void
  onToggleArchive: (id: string) => void
}

const MasonryNoteCard = memo(function MasonryNoteCard({
  data,
}: {
  data: MasonryItemData
}) {
  return (
    <NoteCard
      note={data.note}
      onEdit={data.onEdit}
      onTrash={data.onTrash}
      onRestore={data.onRestore}
      onDelete={data.onDelete}
      onTogglePin={data.onTogglePin}
      onToggleArchive={data.onToggleArchive}
    />
  )
})

function MasonryNotesGrid({
  pinnedNotes,
  otherNotes,
  filteredNotes,
  viewTitle,
  searchQuery,
  onEdit,
  onTrash,
  onRestore,
  onDelete,
  onTogglePin,
  onToggleArchive,
}: {
  pinnedNotes: Note[]
  otherNotes: Note[]
  filteredNotes: Note[]
  viewTitle: string
  searchQuery: string
  onEdit: (note: Note) => void
  onTrash: (id: string) => void
  onDelete: (id: string) => void
  onRestore: (id: string) => void
  onTogglePin: (id: string) => void
  onToggleArchive: (id: string) => void
}) {
  // Masonic requires DOM measurements - only render after mount
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Prepare items for masonic - include handlers in each item's data
  const pinnedItems = useMemo(
    () =>
      pinnedNotes.map((note) => ({
        id: note.id,
        note,
        onEdit,
        onTrash,
        onDelete,
        onRestore,
        onTogglePin,
        onToggleArchive,
      })),
    [
      pinnedNotes,
      onEdit,
      onTrash,
      onDelete,
      onRestore,
      onTogglePin,
      onToggleArchive,
    ],
  )

  const otherItems = useMemo(
    () =>
      otherNotes.map((note) => ({
        id: note.id,
        note,
        onEdit,
        onTrash,
        onDelete,
        onRestore,
        onTogglePin,
        onToggleArchive,
      })),
    [
      otherNotes,
      onEdit,
      onTrash,
      onDelete,
      onRestore,
      onTogglePin,
      onToggleArchive,
    ],
  )

  if (filteredNotes.length === 0) {
    const getEmptyStateProps = () => {
      if (searchQuery) {
        return {
          title: 'No results found',
          description: `We couldn't find any notes matching "${searchQuery}"`,
          icon: <Search className="text-muted-foreground size-8" />,
        }
      }
      if (viewTitle === 'Trash') {
        return {
          title: 'Trash is empty',
          description: 'Deleted notes will appear here',
          icon: <Trash2 className="text-muted-foreground size-8" />,
        }
      }
      if (viewTitle === 'Archive') {
        return {
          title: 'Archive is empty',
          description: 'Archived notes will appear here',
          icon: <Archive className="text-muted-foreground size-8" />,
        }
      }
      return {
        title: `No ${viewTitle.toLowerCase()} notes`,
        description: 'Start by creating a new note',
        icon: <StickyNote className="text-muted-foreground size-8" />,
      }
    }

    const emptyStateProps = getEmptyStateProps()

    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="mx-auto w-full max-w-6xl px-6 pt-6 md:px-8 md:pt-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">{viewTitle}</h2>
            <span className="text-muted-foreground text-sm">0 notes</span>
          </div>
        </div>
        <div className="-mt-20 flex flex-1 flex-col items-center justify-center">
          <EmptyState {...emptyStateProps} />
        </div>
      </div>
    )
  }

  // Masonic needs DOM measurements - wait for client-side mount
  if (!isMounted) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-6 pb-[var(--chat-safe-padding)] pt-6 md:px-8 md:pt-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">{viewTitle}</h2>
            <span className="text-muted-foreground text-sm">
              {filteredNotes.length}{' '}
              {filteredNotes.length === 1 ? 'note' : 'notes'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-6xl px-6 pb-[var(--chat-safe-padding)] pt-6 md:px-8 md:pt-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{viewTitle}</h2>
          <span className="text-muted-foreground text-sm">
            {filteredNotes.length}{' '}
            {filteredNotes.length === 1 ? 'note' : 'notes'}
          </span>
        </div>

        <div className="space-y-8">
          {pinnedItems.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                Pinned
              </h3>
              <Masonry
                key={`pinned-${pinnedItems.length}`}
                items={pinnedItems}
                columnGutter={16}
                columnWidth={300}
                overscanBy={2}
                render={MasonryNoteCard}
              />
            </section>
          )}

          {otherItems.length > 0 && (
            <section className="space-y-4">
              {pinnedItems.length > 0 && (
                <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  Others
                </h3>
              )}
              <Masonry
                key={`other-${otherItems.length}`}
                items={otherItems}
                columnGutter={16}
                columnWidth={300}
                overscanBy={2}
                render={MasonryNoteCard}
              />
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function SidebarItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  )
}

const NoteCard = memo(function NoteCard({
  note,
  onEdit,
  onTrash,
  onDelete,
  onRestore,
  onTogglePin,
  onToggleArchive,
}: {
  note: Note
  onEdit: (note: Note) => void
  onTrash: (id: string) => void
  onDelete: (id: string) => void
  onRestore: (id: string) => void
  onTogglePin: (id: string) => void
  onToggleArchive: (id: string) => void
}) {
  // Memoize sorted labels to avoid recalculating on every render
  const sortedLabels = useMemo(() => {
    if (!note.labels?.length) return []
    return note.labels.map((l) => toCapitalCase(l)).sort()
  }, [note.labels])

  // Create stable click handlers that extract the id
  const handleClick = useCallback(() => onEdit(note), [onEdit, note])
  const handleTrash = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onTrash(note.id)
    },
    [onTrash, note.id],
  )
  const handleRestore = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onRestore(note.id)
    },
    [onRestore, note.id],
  )
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onDelete(note.id)
    },
    [onDelete, note.id],
  )
  const handleTogglePin = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onTogglePin(note.id)
    },
    [onTogglePin, note.id],
  )
  const handleToggleArchive = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onToggleArchive(note.id)
    },
    [onToggleArchive, note.id],
  )

  return (
    <Card
      onClick={handleClick}
      className="border-border hover:border-primary/50 group relative flex h-fit max-h-[400px] cursor-pointer flex-col overflow-hidden transition-[border-color,box-shadow] duration-150 hover:shadow-md"
    >
      <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {!note.isDeleted ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="bg-background/50 hover:bg-background size-8"
              onClick={handleTogglePin}
            >
              {note.isPinned ? (
                <PinOff className="size-4" />
              ) : (
                <Pin className="size-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="bg-background/50 hover:bg-background size-8"
              onClick={handleToggleArchive}
            >
              {note.isArchived ? (
                <ArchiveRestore className="size-4" />
              ) : (
                <Archive className="size-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="bg-background/50 hover:bg-background text-destructive size-8"
              onClick={handleTrash}
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="bg-background/50 hover:bg-background size-8"
              onClick={handleRestore}
              title="Restore"
            >
              <Undo2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="bg-background/50 hover:bg-background text-destructive size-8"
              onClick={handleDelete}
              title="Delete permanently"
            >
              <Trash className="size-4" />
            </Button>
          </>
        )}
      </div>

      <CardHeader className="p-4 pb-2">
        <CardTitle className="line-clamp-2 pr-12 text-lg font-semibold">
          {note.title || (note.content ? '' : 'Empty Note')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-4 pt-0">
        <div className="max-h-[160px] overflow-hidden">
          <NotePreview content={note.content} />
        </div>
        {sortedLabels.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1">
            {sortedLabels.map((label) => (
              <span
                key={label}
                className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
              >
                {label}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
})

// Separate memoized component for the markdown preview to avoid re-parsing on every hover
// Truncate content to ~500 chars for preview to avoid parsing huge markdown documents
const NotePreview = memo(function NotePreview({
  content,
}: {
  content: string
}) {
  const truncated = useMemo(() => {
    if (content.length <= 500) return content
    // Find a good break point (newline or space) near 500 chars
    const breakPoint = content.lastIndexOf('\n', 500)
    if (breakPoint > 300) return content.slice(0, breakPoint)
    const spacePoint = content.lastIndexOf(' ', 500)
    if (spacePoint > 300) return content.slice(0, spacePoint) + '…'
    return content.slice(0, 500) + '…'
  }, [content])

  return (
    <Markdown markdown={truncated} proseSize="xs" className="line-clamp-[8]" />
  )
})

function NoteEditor({
  initialNote,
  allLabels = [],
  onSave,
  onCancel,
}: {
  initialNote?: Note
  allLabels?: string[]
  onSave: (note: Partial<Note>) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initialNote?.title ?? '')
  const [content, setContent] = useState(initialNote?.content ?? '')
  const [isPinned, setIsPinned] = useState(initialNote?.isPinned ?? false)
  const [labels, setLabels] = useState<string[]>(initialNote?.labels ?? [])
  const [newLabel, setNewLabel] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const editorRef = useRef<HTMLDivElement>(null)

  const suggestions = useMemo(() => {
    if (!newLabel.trim()) return []
    const search = newLabel.toLowerCase()
    return allLabels
      .filter(
        (l) =>
          l.toLowerCase().includes(search) && !labels.includes(l.toLowerCase()),
      )
      .slice(0, 5)
  }, [allLabels, newLabel, labels])

  useEffect(() => {
    setActiveIndex(0)
  }, [suggestions])

  const handleAddLabel = (labelName: string) => {
    const label = labelName.trim().toLowerCase()
    if (label && !labels.includes(label)) {
      setLabels([...labels, label])
    }
    setNewLabel('')
    setShowSuggestions(false)
  }

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (suggestions.length > 0 && showSuggestions) {
        handleAddLabel(suggestions[activeIndex])
      } else {
        handleAddLabel(newLabel)
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setShowSuggestions(true)
      setActiveIndex((prev) => (prev + 1) % Math.max(suggestions.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setShowSuggestions(true)
      setActiveIndex(
        (prev) =>
          (prev - 1 + suggestions.length) % Math.max(suggestions.length, 1),
      )
    } else if (e.key === 'Escape') {
      if (showSuggestions) {
        e.stopPropagation()
        setShowSuggestions(false)
      }
    }
  }

  const removeLabel = (label: string) => {
    setLabels(labels.filter((l) => l !== label))
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  const handleAutoSave = () => {
    const hasChanges =
      title !== (initialNote?.title ?? '') ||
      content !== (initialNote?.content ?? '') ||
      isPinned !== (initialNote?.isPinned ?? false) ||
      JSON.stringify(labels.sort()) !==
        JSON.stringify([...(initialNote?.labels ?? [])].sort())

    if (!hasChanges || (!title.trim() && !content.trim())) {
      onCancel()
    } else {
      onSave({ title, content, isPinned, labels })
    }
  }

  return (
    <div
      className="bg-background/95 fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleAutoSave}
    >
      <div
        ref={editorRef}
        className="bg-card animate-in zoom-in-95 flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border shadow-2xl duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b p-3">
          <input
            autoFocus
            className="flex-1 bg-transparent px-2 py-1 text-xl font-bold outline-none"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={() => setIsPinned(!isPinned)}
            >
              {isPinned ? (
                <PinOff className="size-5" />
              ) : (
                <Pin className="size-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={onCancel}
            >
              <X className="size-5" />
            </Button>
          </div>
        </div>

        <div className="flex h-[50vh] w-full flex-col">
          <div className="min-h-0 flex-1 overflow-hidden p-4">
            <MarkdownEditor
              value={content}
              onChange={setContent}
              placeholder="Take a note..."
              hideMarkdownHint
              minHeight="100%"
              maxHeight="100%"
            />
          </div>
          <div className="flex shrink-0 justify-end px-4 pb-2">
            <span className="text-muted-foreground/60 text-xs">
              Markdown supported
            </span>
          </div>

          <div className="shrink-0 border-t p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {labels.sort().map((label) => (
                <span
                  key={label}
                  className="bg-primary/10 text-primary group flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                >
                  {toCapitalCase(label)}
                  <button
                    onClick={() => removeLabel(label)}
                    className="hover:bg-primary/20 flex size-3.5 cursor-pointer items-center justify-center rounded-full"
                  >
                    <X className="size-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="relative flex items-center">
              <Hash className="text-muted-foreground absolute left-3 size-4" />
              <input
                type="text"
                placeholder="Add label and press Enter..."
                className="bg-muted/30 focus:ring-primary/20 w-full rounded-md border py-1.5 pl-9 pr-4 text-sm outline-none focus:ring-1"
                value={newLabel}
                onChange={(e) => {
                  setNewLabel(e.target.value)
                  setShowSuggestions(true)
                }}
                onKeyDown={onInputKeyDown}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onFocus={() => setShowSuggestions(true)}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="bg-popover animate-in slide-in-from-bottom-1 absolute bottom-full left-0 mb-1 w-full rounded-md border p-1 shadow-md duration-100">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={suggestion}
                      className={cn(
                        'flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm transition-colors',
                        index === activeIndex
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-muted',
                      )}
                      onClick={() => handleAddLabel(suggestion)}
                    >
                      <Tag className="mr-2 size-3 opacity-50" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-muted/20 flex justify-end gap-2 border-t p-3">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleAutoSave}>
            {initialNote ? 'Save Changes' : 'Add Note'}
          </Button>
        </div>
      </div>
    </div>
  )
}
