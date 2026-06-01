import {
  Check,
  ChevronLeft,
  Download,
  Loader2,
  RotateCw,
  Search,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button, Input, ScrollArea, Spinner, cn } from '@moldable-ai/ui'
import { coverColorFromSeed } from '../../shared/book'
import { type StoreBook, useInstallFromStore, useStoreList } from '../use-store'

function useDebouncedValue<T>(value: T, delay = 280): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])
  return debounced
}

interface StoreCardProps {
  book: StoreBook
  installed: boolean
  installing: boolean
  onInstall: (book: StoreBook) => void
}

function StoreCard({ book, installed, installing, onInstall }: StoreCardProps) {
  const [imgError, setImgError] = useState(false)
  return (
    <div className="flex flex-col">
      <div className="border-border relative aspect-[2/3] overflow-hidden rounded-md border">
        {imgError ? (
          <div
            className="flex size-full items-end p-2.5"
            style={{ backgroundColor: coverColorFromSeed(String(book.id)) }}
          >
            <span className="line-clamp-5 text-sm font-medium leading-snug text-white">
              {book.title}
            </span>
          </div>
        ) : (
          <img
            src={book.coverUrl}
            alt=""
            loading="lazy"
            onError={() => setImgError(true)}
            className="size-full object-cover"
          />
        )}
        {installed ? (
          <div className="bg-background/85 text-foreground absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium backdrop-blur">
            <Check className="size-3" />
            In library
          </div>
        ) : null}
      </div>
      {/* Reserve a fixed 2-line title height and a 1-line author row so the
          Install button lands at the same Y on every card. */}
      <p className="mt-2 line-clamp-2 min-h-[2.75em] text-[13px] font-medium leading-snug">
        {book.title}
      </p>
      <p className="text-muted-foreground min-h-[1.3em] truncate text-xs">
        {book.author || ' '}
      </p>
      <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
        {book.sourceLabel}
      </p>
      <Button
        type="button"
        size="sm"
        variant={installed ? 'ghost' : 'secondary'}
        disabled={installed || installing}
        onClick={() => onInstall(book)}
        className="mt-2 h-7 w-full cursor-pointer gap-1.5 text-xs disabled:cursor-default"
      >
        {installing ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Installing
          </>
        ) : installed ? (
          <>
            <Check className="size-3.5" />
            Added
          </>
        ) : (
          <>
            <Download className="size-3.5" />
            Install
          </>
        )}
      </Button>
    </div>
  )
}

export function StoreView({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query)
  const listQuery = useStoreList(debouncedQuery)
  const install = useInstallFromStore()

  const [installingId, setInstallingId] = useState<string | null>(null)
  const [justInstalled, setJustInstalled] = useState<Set<string>>(
    () => new Set(),
  )
  const [installError, setInstallError] = useState<string | null>(null)

  const installedIds = useMemo(() => {
    const ids = new Set<string>(listQuery.data?.installed ?? [])
    for (const id of justInstalled) ids.add(id)
    return ids
  }, [listQuery.data?.installed, justInstalled])

  const handleInstall = async (book: StoreBook) => {
    setInstallError(null)
    setInstallingId(book.id)
    try {
      await install.mutateAsync(book.id)
      setJustInstalled((prev) => new Set(prev).add(book.id))
    } catch (error) {
      setInstallError(
        error instanceof Error
          ? error.message
          : `Could not install ${book.title}`,
      )
    } finally {
      setInstallingId(null)
    }
  }

  const results = listQuery.data?.results ?? []
  const isSearching = debouncedQuery.trim().length > 0

  return (
    <div className="bg-background flex h-full min-h-0 flex-col">
      {/* Toolbar */}
      <div className="border-border flex h-11 shrink-0 items-center gap-2 border-b px-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to library"
          className="hover:text-foreground focus-visible:ring-ring flex cursor-pointer items-center gap-1 rounded-md text-sm font-medium focus:outline-none focus-visible:ring-2"
        >
          <ChevronLeft className="text-muted-foreground size-4" />
          Book store
        </button>
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title or author"
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      {installError ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive border-b px-4 py-2 text-xs">
          {installError}
        </div>
      ) : null}

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4 pb-[calc(var(--chat-safe-padding,0px)+4rem)] pt-3">
          {!isSearching ? (
            <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide">
              Featured · direct-download public-domain books
            </p>
          ) : listQuery.isFetching ? null : (
            <p className="text-muted-foreground mb-3 text-xs">
              {listQuery.data?.total ?? results.length} results for “
              {debouncedQuery.trim()}”
            </p>
          )}

          {listQuery.isError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <p className="text-muted-foreground text-sm">
                {(listQuery.error as Error)?.message ??
                  'The store is unavailable right now'}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => listQuery.refetch()}
                className="cursor-pointer gap-1.5"
              >
                <RotateCw className="size-3.5" />
                Try again
              </Button>
            </div>
          ) : listQuery.isLoading || (isSearching && listQuery.isFetching) ? (
            <div className="flex items-center justify-center gap-2 py-16">
              <Spinner className="text-muted-foreground size-4" />
              <span className="text-muted-foreground text-sm">
                {isSearching ? 'Searching the catalog' : 'Loading'}
              </span>
            </div>
          ) : results.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-medium">No matches</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Try a different title or author.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
              {results.map((book) => (
                <StoreCard
                  key={book.id}
                  book={book}
                  installed={installedIds.has(book.id)}
                  installing={installingId === book.id}
                  onInstall={handleInstall}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
