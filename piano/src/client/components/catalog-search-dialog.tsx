import { Check, Download, Loader2, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  cn,
} from '@moldable-ai/ui'
import {
  type CatalogResult,
  useCatalogSearch,
  useCatalogStatus,
  useInstallCatalogSong,
} from '../use-song-catalog'

interface CatalogSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInstalled?: (songId: string) => void
}

const QUICK_QUERIES = [
  'Chopin',
  'Beethoven',
  'Satie',
  'Debussy',
  'Liszt',
  'Schubert',
  'Bach',
  'Tchaikovsky',
]

function useDebouncedValue<T>(value: T, delay = 220): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])
  return debounced
}

export function CatalogSearchDialog({
  open,
  onOpenChange,
  onInstalled,
}: CatalogSearchDialogProps) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 220)
  const [installError, setInstallError] = useState<string | null>(null)
  const [recentlyInstalledIds, setRecentlyInstalledIds] = useState<Set<string>>(
    () => new Set(),
  )
  const inputRef = useRef<HTMLInputElement>(null)

  const statusQuery = useCatalogStatus(open)
  const searchQuery = useCatalogSearch(debouncedQuery)
  const install = useInstallCatalogSong()

  // Focus the input when the dialog opens
  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      inputRef.current?.focus()
    }, 80)
    return () => window.clearTimeout(timer)
  }, [open])

  // Reset on close
  useEffect(() => {
    if (open) return
    const timer = window.setTimeout(() => {
      setQuery('')
      setInstallError(null)
      setRecentlyInstalledIds(new Set())
    }, 200)
    return () => window.clearTimeout(timer)
  }, [open])

  const handleInstall = async (result: CatalogResult) => {
    setInstallError(null)
    try {
      const response = await install.mutateAsync({
        provider: result.provider,
        id: result.id,
        mutopiaId: result.mutopiaId,
      })
      setRecentlyInstalledIds((current) => {
        const next = new Set(current)
        next.add(result.id)
        return next
      })
      onInstalled?.(response.song.id)
    } catch (error) {
      setInstallError(
        error instanceof Error
          ? error.message
          : `Could not install ${result.title}`,
      )
    }
  }

  const isSearching = searchQuery.isFetching && debouncedQuery.length >= 2
  const results = searchQuery.data?.results ?? []
  const hasQuery = debouncedQuery.trim().length >= 2

  const indexState = useMemo(() => {
    if (!statusQuery.data) return null
    if (!statusQuery.data.indexed) {
      return 'Preparing catalog…'
    }
    const date = new Date(statusQuery.data.generatedAt)
    const ago = isNaN(date.getTime())
      ? ''
      : ` · indexed ${date.toLocaleDateString()}`
    return `${statusQuery.data.entryCount} solo-piano pieces${ago}`
  }, [statusQuery.data])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(640px,calc(100vh-var(--chat-safe-padding,0px)-2rem))] w-[min(580px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[580px]">
        <div className="border-border/60 border-b px-5 pb-3 pt-5">
          <div className="flex items-start">
            <div className="min-w-0 pr-8">
              <DialogTitle className="piano-serif text-foreground text-lg font-semibold tracking-tight">
                Find sheet music
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1 text-[12px] leading-5">
                Public-domain pieces from the Mutopia Project. Install with one
                click — they appear in your library instantly.
              </DialogDescription>
            </div>
          </div>

          <div className="relative mt-4">
            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2" />
            {isSearching ? (
              <Loader2 className="text-muted-foreground absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin" />
            ) : query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full"
                aria-label="Clear search"
              >
                <X className="size-3" />
              </button>
            ) : null}
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by composer, piece, or opus…"
              className={cn(
                'border-border/70 bg-muted/30 focus:bg-background focus:border-foreground/30 h-10 w-full rounded-full border pl-9 pr-9 text-[13px] outline-none transition-colors',
                'placeholder:text-muted-foreground/80',
              )}
            />
          </div>
        </div>

        <div className="piano-scrollbar min-h-0 flex-1 overflow-y-auto">
          {installError ? (
            <div className="border-destructive/30 bg-destructive/10 text-destructive border-b px-5 py-2 text-[11px]">
              {installError}
            </div>
          ) : null}

          {!hasQuery ? (
            <div className="px-5 py-6">
              <p className="text-muted-foreground/80 mb-3 text-[10px] font-medium uppercase tracking-[0.16em]">
                Quick searches
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_QUERIES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setQuery(q)
                      inputRef.current?.focus()
                    }}
                    className={cn(
                      'border-border/70 bg-muted/30 hover:bg-muted/55 hover:text-foreground text-foreground/80 h-7 cursor-pointer rounded-full border px-3 text-[12px] transition-colors',
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <p className="text-muted-foreground/70 mt-6 text-[11px] leading-5">
                Tip: searching is fuzzy — try a composer name and then narrow
                with a piece name or opus number.
              </p>
            </div>
          ) : searchQuery.isLoading ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-[12px]">
              <Loader2 className="text-muted-foreground size-4 animate-spin" />
              <span className="text-muted-foreground">
                Searching Mutopia catalog…
              </span>
            </div>
          ) : searchQuery.isError ? (
            <div className="px-5 py-6 text-[12px]">
              <p className="text-destructive">Could not search the catalog.</p>
              <p className="text-muted-foreground mt-1">
                The catalog might still be building. Try again in a moment.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="piano-serif text-foreground text-base">
                Nothing matches “{debouncedQuery}”
              </p>
              <p className="text-muted-foreground mt-1 text-[12px]">
                Try a composer name like “Chopin” or “Debussy”.
              </p>
            </div>
          ) : (
            <ul className="divide-border/40 divide-y">
              {results.map((result) => {
                const justInstalled = recentlyInstalledIds.has(result.id)
                const isInstalled = result.installed || justInstalled
                const isInstalling =
                  install.isPending && install.variables?.id === result.id
                return (
                  <li
                    key={result.id}
                    className="flex items-start gap-3 px-5 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <h4 className="piano-serif text-foreground line-clamp-1 text-[14px] font-semibold leading-tight">
                          {result.title}
                        </h4>
                        {result.opus ? (
                          <span className="text-muted-foreground piano-mono shrink-0 text-[10px]">
                            {result.opus}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground mt-0.5 line-clamp-1 text-[12px] leading-5">
                        {result.composer}
                        {result.style ? (
                          <span className="text-muted-foreground/60">
                            {' · '}
                            {result.style}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    {isInstalled ? (
                      <span
                        className={cn(
                          'inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium',
                          'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400',
                        )}
                      >
                        <Check className="size-3" strokeWidth={3} />
                        In library
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 shrink-0 cursor-pointer rounded-full px-2.5 text-[11px]"
                        onClick={() => void handleInstall(result)}
                        disabled={isInstalling}
                      >
                        {isInstalling ? (
                          <Loader2 className="mr-1 size-3 animate-spin" />
                        ) : (
                          <Download className="mr-1 size-3" />
                        )}
                        {isInstalling ? 'Installing' : 'Install'}
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="border-border/60 bg-muted/15 text-muted-foreground border-t px-5 py-2 text-[10px] leading-4">
          {indexState ?? 'Public-domain scores from the Mutopia Project'}
        </div>
      </DialogContent>
    </Dialog>
  )
}
