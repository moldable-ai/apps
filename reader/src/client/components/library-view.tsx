import {
  BookOpen,
  ChevronLeft,
  Import,
  Plus,
  Search,
  Store,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
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
  Input,
  ScrollArea,
  Skeleton,
  Spinner,
  cn,
  useMoldableCommands,
  useWorkspace,
} from '@moldable-ai/ui'
import type { BookSummary } from '../../shared/book'
import type { Folder } from '../../shared/folder'
import type { LibraryViewProps } from '../reader-types'
import { useBooks } from '../use-books'
import { useFolders } from '../use-folders'
import { BookCard } from './book-card'
import { NewFolderDialog } from './new-folder-dialog'
import { StoreView } from './store-view'
import {
  DndContext,
  type DragEndEvent,
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
import { CSS } from '@dnd-kit/utilities'

const ACCEPTED = ['.epub', '.txt']

function isAccepted(name: string) {
  const lower = name.toLowerCase()
  return ACCEPTED.some((ext) => lower.endsWith(ext))
}

interface FileDropMessage {
  type?: string
  paths?: unknown
}

export function LibraryView(props: LibraryViewProps) {
  const { workspaceId } = useWorkspace()
  const {
    books,
    isLoading,
    importFiles,
    importByPath,
    isImporting,
    importError,
    deleteBook,
  } = useBooks()
  const { folders, addFolder, reorderFolders, moveBook } = useFolders()

  const [search, setSearch] = useState('')
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<BookSummary | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [storeOpen, setStoreOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)

  const activeFolder = useMemo(
    () => folders.find((folder) => folder.id === activeFolderId) ?? null,
    [folders, activeFolderId],
  )

  // The active folder may be deleted elsewhere; fall back to the full library.
  useEffect(() => {
    if (
      activeFolderId &&
      !folders.some((folder) => folder.id === activeFolderId)
    ) {
      setActiveFolderId(null)
    }
  }, [folders, activeFolderId])

  const folderIdsByBook = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const folder of folders) {
      for (const bookId of folder.bookIds) {
        const current = map.get(bookId) ?? []
        current.push(folder.id)
        map.set(bookId, current)
      }
    }
    return map
  }, [folders])

  const visibleBooks = useMemo(() => {
    const query = search.trim().toLowerCase()
    const inScope = activeFolder
      ? books.filter((book) => activeFolder.bookIds.includes(book.id))
      : books
    const filtered = query
      ? inScope.filter((book) => {
          const title = book.title.toLowerCase()
          const author = (book.author ?? '').toLowerCase()
          return title.includes(query) || author.includes(query)
        })
      : inScope
    return [...filtered].sort((a, b) => {
      const aRead = a.progress?.updatedAt
      const bRead = b.progress?.updatedAt
      if (aRead && bRead && aRead !== bRead) return bRead.localeCompare(aRead)
      if (aRead && !bRead) return -1
      if (!aRead && bRead) return 1
      return b.addedAt.localeCompare(a.addedAt)
    })
  }, [books, activeFolder, search])

  function openFilePicker() {
    fileInputRef.current?.click()
  }

  async function handleFilePick(event: React.ChangeEvent<HTMLInputElement>) {
    const list = event.target.files
    if (list && list.length > 0) {
      const files = Array.from(list).filter((file) => isAccepted(file.name))
      if (files.length > 0) await importFiles(files).catch(() => {})
    }
    event.target.value = ''
  }

  async function importRealFiles(fileList: FileList) {
    const files = Array.from(fileList).filter((file) => isAccepted(file.name))
    if (files.length > 0) await importFiles(files).catch(() => {})
  }

  useMoldableCommands({
    'import-book': () => openFilePicker(),
    'new-folder': () => setNewFolderOpen(true),
    'search-library': () => searchRef.current?.focus(),
  })

  // Native file-drop bridge from the Moldable host.
  useEffect(() => {
    function onMessage(event: MessageEvent<FileDropMessage>) {
      const data = event.data
      if (!data || typeof data !== 'object') return
      if (data.type === 'moldable:file-drag-over') {
        setIsDragging(true)
      } else if (data.type === 'moldable:file-drag-leave') {
        setIsDragging(false)
      } else if (data.type === 'moldable:file-drop') {
        setIsDragging(false)
        const paths = Array.isArray(data.paths) ? data.paths : []
        for (const path of paths) {
          if (typeof path === 'string' && isAccepted(path)) {
            void importByPath(path).catch(() => {})
          }
        }
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [importByPath])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleFolderDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = folders.findIndex((folder) => folder.id === active.id)
    const newIndex = folders.findIndex((folder) => folder.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const next = arrayMove(folders, oldIndex, newIndex)
    void reorderFolders(next.map((folder) => folder.id))
  }

  function handleCreateFolder(name: string) {
    void addFolder(name).catch(() => {})
  }

  function bookCount(folder: Folder) {
    return folder.bookIds.length
  }

  return (
    <div
      className="bg-background relative flex h-full min-h-0 flex-col overflow-hidden"
      onDragEnter={(event) => {
        if (event.dataTransfer?.types?.includes('Files')) {
          event.preventDefault()
          dragDepth.current += 1
          setIsDragging(true)
        }
      }}
      onDragOver={(event) => {
        if (event.dataTransfer?.types?.includes('Files')) event.preventDefault()
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) setIsDragging(false)
      }}
      onDrop={(event) => {
        if (event.dataTransfer?.files?.length) {
          event.preventDefault()
          dragDepth.current = 0
          setIsDragging(false)
          void importRealFiles(event.dataTransfer.files)
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub,.txt"
        multiple
        className="hidden"
        onChange={handleFilePick}
      />

      {/* Toolbar */}
      <div className="border-border flex h-11 shrink-0 items-center gap-2 border-b px-3">
        {activeFolder ? (
          <button
            type="button"
            onClick={() => setActiveFolderId(null)}
            aria-label="Back to library"
            className="hover:text-foreground focus-visible:ring-ring flex cursor-pointer items-center gap-1 rounded-md text-sm font-medium focus:outline-none focus-visible:ring-2"
          >
            <ChevronLeft className="text-muted-foreground size-4" />
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: activeFolder.tone }}
            />
            <span className="truncate">{activeFolder.name}</span>
          </button>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {isImporting ? (
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Spinner className="size-3.5" />
              Importing…
            </span>
          ) : null}
          {importError ? (
            <span className="text-destructive max-w-48 truncate text-xs">
              {importError}
            </span>
          ) : null}

          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              aria-label="Search library"
              className="h-8 w-40 pl-7"
            />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="cursor-pointer gap-1.5"
            onClick={() => setStoreOpen(true)}
          >
            <Store className="size-4" />
            Store
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="cursor-pointer gap-1.5"
            onClick={openFilePicker}
            disabled={isImporting}
          >
            <Import className="size-4" />
            Import
          </Button>
        </div>
      </div>

      {/* Folder chips */}
      {folders.length > 0 || !isLoading ? (
        <div className="border-border flex shrink-0 items-center gap-2 overflow-x-auto border-b px-3 py-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleFolderDragEnd}
          >
            <SortableContext
              items={folders.map((folder) => folder.id)}
              strategy={rectSortingStrategy}
            >
              <div className="flex items-center gap-2">
                {folders.map((folder) => (
                  <FolderChip
                    key={folder.id}
                    folder={folder}
                    count={bookCount(folder)}
                    active={folder.id === activeFolderId}
                    onSelect={() =>
                      setActiveFolderId((current) =>
                        current === folder.id ? null : folder.id,
                      )
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <button
            type="button"
            onClick={() => setNewFolderOpen(true)}
            aria-label="New folder"
            className="border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground focus-visible:ring-ring flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-dashed px-2.5 text-xs transition-colors focus:outline-none focus-visible:ring-2"
          >
            <Plus className="size-3.5" />
            Folder
          </button>
        </div>
      ) : null}

      {/* Grid */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-3 pb-[calc(var(--chat-safe-padding,0px)+4rem)] pt-3">
          {isLoading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="flex flex-col gap-1.5">
                  <Skeleton className="aspect-[2/3] w-full rounded-md" />
                  <Skeleton className="h-3.5 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              ))}
            </div>
          ) : visibleBooks.length === 0 ? (
            <EmptyState
              inFolder={Boolean(activeFolder)}
              searching={search.trim().length > 0}
              onImport={openFilePicker}
            />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
              {visibleBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  coverUrl={
                    book.hasCover
                      ? `/api/books/${book.id}/cover?w=${workspaceId}`
                      : null
                  }
                  folders={folders}
                  currentFolderIds={folderIdsByBook.get(book.id) ?? []}
                  onOpen={() => props.onOpenBook(book.id)}
                  onToggleFolder={(folderId, inFolder) => {
                    void moveBook(book.id, folderId, inFolder).catch(() => {})
                  }}
                  onClearFolders={() => {
                    void moveBook(book.id, null).catch(() => {})
                  }}
                  onCreateFolder={() => setNewFolderOpen(true)}
                  onDelete={() => setPendingDelete(book)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Drop overlay */}
      {isDragging ? (
        <div className="bg-background/80 pointer-events-none absolute inset-0 z-20 flex items-center justify-center backdrop-blur-sm">
          <div className="border-primary/50 bg-card text-muted-foreground flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-8 py-6 text-sm">
            <BookOpen className="text-muted-foreground size-6" />
            Drop books to import
          </div>
        </div>
      ) : null}

      <NewFolderDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        onCreate={handleCreateFolder}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setPendingDelete(null)
        }}
      >
        <AlertDialogContent className="max-h-[calc(100dvh-var(--chat-safe-padding,0px)-2rem)] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete book</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `Remove "${pendingDelete.title}" from your library. This cannot be undone.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
              onClick={() => {
                if (pendingDelete)
                  void deleteBook(pendingDelete.id).catch(() => {})
                setPendingDelete(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {storeOpen ? (
        <div className="animate-reader-fade-in absolute inset-0 z-30">
          <StoreView onClose={() => setStoreOpen(false)} />
        </div>
      ) : null}
    </div>
  )
}

function FolderChip({
  folder,
  count,
  active,
  onSelect,
}: {
  folder: Folder
  count: number
  active: boolean
  onSelect: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: folder.id })

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      style={{
        transform: CSS.Transform.toString(
          transform && { ...transform, scaleX: 1, scaleY: 1 },
        ),
        transition,
      }}
      {...attributes}
      {...listeners}
      className={cn(
        'focus-visible:ring-ring flex h-7 shrink-0 cursor-pointer touch-none select-none items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors focus:outline-none focus-visible:ring-2',
        active
          ? 'bg-primary text-primary-foreground border-transparent'
          : 'border-border bg-card text-foreground hover:bg-muted',
        isDragging && 'opacity-60',
      )}
    >
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: folder.tone }}
      />
      <span className="max-w-32 truncate">{folder.name}</span>
      <span
        className={cn(
          'tabular-nums',
          active ? 'text-primary-foreground/70' : 'text-muted-foreground',
        )}
      >
        {count}
      </span>
    </button>
  )
}

function EmptyState({
  inFolder,
  searching,
  onImport,
}: {
  inFolder: boolean
  searching: boolean
  onImport: () => void
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <BookOpen className="text-muted-foreground size-5" />
      </div>
      {searching ? (
        <p className="text-muted-foreground text-sm">
          No books match your search
        </p>
      ) : inFolder ? (
        <p className="text-muted-foreground text-sm">No books in this folder</p>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">No books</p>
          <Button
            type="button"
            size="sm"
            className="cursor-pointer"
            onClick={onImport}
          >
            <Import className="size-4" />
            Import
          </Button>
        </>
      )}
    </div>
  )
}
