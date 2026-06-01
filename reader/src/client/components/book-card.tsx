import { BookOpen, FolderInput, Trash2 } from 'lucide-react'
import { Button } from '@moldable-ai/ui'
import type { BookSummary } from '../../shared/book'
import type { Folder } from '../../shared/folder'
import { MoveToMenu } from './move-to-menu'

interface BookCardProps {
  book: BookSummary
  coverUrl: string | null
  folders: Folder[]
  currentFolderId: string | null
  onOpen: () => void
  onMoveTo: (folderId: string | null) => void
  onCreateFolder: () => void
  onDelete: () => void
}

export function BookCard({
  book,
  coverUrl,
  folders,
  currentFolderId,
  onOpen,
  onMoveTo,
  onCreateFolder,
  onDelete,
}: BookCardProps) {
  const percent = book.progress?.percent ?? 0
  const showProgress = percent > 0 && percent < 1
  const author = book.author?.trim()

  return (
    <div className="group/card relative flex flex-col gap-1.5">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${book.title}`}
        className="border-border bg-muted focus-visible:ring-ring relative block aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-md border shadow-sm transition-shadow focus:outline-none focus-visible:ring-2 group-hover/card:shadow-md"
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <div
            className="flex size-full flex-col justify-between p-3 text-left"
            style={{ backgroundColor: book.coverColor }}
          >
            <BookOpen className="size-4 text-white/40" aria-hidden />
            <span className="line-clamp-4 text-sm font-medium leading-snug text-white">
              {book.title}
            </span>
          </div>
        )}

        {showProgress ? (
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-black/20">
            <div
              className="bg-primary h-full"
              style={{ width: `${Math.round(percent * 100)}%` }}
            />
          </div>
        ) : null}
      </button>

      <div className="pointer-events-none absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-focus-within/card:opacity-100 group-hover/card:opacity-100">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={`Open ${book.title}`}
          className="pointer-events-auto size-7 cursor-pointer shadow-sm"
          onClick={onOpen}
        >
          <BookOpen className="size-3.5" />
        </Button>
        <MoveToMenu
          folders={folders}
          currentFolderId={currentFolderId}
          onMove={onMoveTo}
          onCreateFolder={onCreateFolder}
          trigger={
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label={`Move ${book.title} to a folder`}
              className="pointer-events-auto size-7 cursor-pointer shadow-sm"
            >
              <FolderInput className="size-3.5" />
            </Button>
          }
        />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={`Delete ${book.title}`}
          className="text-destructive hover:text-destructive pointer-events-auto size-7 cursor-pointer shadow-sm"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="min-w-0 px-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="line-clamp-2 text-sm font-medium leading-snug">
            {book.title}
          </p>
          {showProgress ? (
            <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
              {Math.round(percent * 100)}%
            </span>
          ) : null}
        </div>
        {author ? (
          <p className="text-muted-foreground truncate text-xs">{author}</p>
        ) : null}
      </div>
    </div>
  )
}
