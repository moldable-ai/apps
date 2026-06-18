import { ArrowRight, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  Input,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Spinner,
  cn,
} from '@moldable-ai/ui'
import type { BookSearchResult } from '../../shared/book'
import { useBookSearch } from '../use-book'

interface SearchDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookId: string
  currentChapterIndex: number
  onSelect: (result: BookSearchResult, query: string) => void
}

export function SearchDrawer({
  open,
  onOpenChange,
  bookId,
  currentChapterIndex,
  onSelect,
}: SearchDrawerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => inputRef.current?.focus(), 80)
    return () => window.clearTimeout(id)
  }, [open])

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query.trim()), 180)
    return () => window.clearTimeout(id)
  }, [query])

  const search = useBookSearch(bookId, debouncedQuery)
  const results = search.data?.results ?? []
  const total = search.data?.total ?? 0
  const trimmed = query.trim()
  const canSearch = trimmed.length >= 2

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-md flex-col gap-0 p-0"
        style={{ maxHeight: '100dvh' }}
      >
        <SheetHeader className="border-border border-b px-5 py-4">
          <SheetTitle>Search book</SheetTitle>
          <div className="relative pt-2">
            <Search
              className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-[10%]"
              aria-hidden
            />
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a passage…"
              className="h-9 pl-9"
              spellCheck={false}
            />
          </div>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-2 py-3 pb-[calc(var(--chat-safe-padding,0px)+1.5rem)]">
            {!canSearch ? (
              <div className="text-muted-foreground px-3 py-10 text-center text-sm">
                Type at least two characters.
              </div>
            ) : search.isLoading || debouncedQuery !== trimmed ? (
              <div className="text-muted-foreground flex items-center justify-center gap-2 px-3 py-10 text-sm">
                <Spinner className="size-4" />
                Searching…
              </div>
            ) : search.isError ? (
              <div className="text-muted-foreground px-3 py-10 text-center text-sm">
                Search failed. Try again.
              </div>
            ) : results.length === 0 ? (
              <div className="text-muted-foreground px-3 py-10 text-center text-sm">
                No passages found.
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="text-muted-foreground px-3 pb-2 text-xs tabular-nums">
                  {total === 1 ? '1 passage' : `${total} passages`}
                  {search.data?.truncated ? ' · showing first 80' : ''}
                </div>
                {results.map((result) => {
                  const active = result.chapterIndex === currentChapterIndex
                  return (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => onSelect(result, trimmed)}
                      className={cn(
                        'group flex w-full cursor-pointer items-start gap-3 rounded-md px-3 py-3 text-left transition-colors',
                        active
                          ? 'bg-muted/70 hover:bg-muted'
                          : 'hover:bg-muted/60',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-muted-foreground mb-1 flex min-w-0 items-center gap-2 text-xs">
                          <span className="truncate">
                            {result.chapterTitle ||
                              `Chapter ${result.chapterIndex + 1}`}
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {Math.round(result.position * 100)}%
                          </span>
                        </div>
                        <p className="text-foreground line-clamp-4 text-sm leading-relaxed">
                          <span className="text-muted-foreground">
                            {result.before}
                          </span>
                          {result.before ? ' ' : ''}
                          <mark className="bg-primary/15 text-primary rounded-sm px-0.5 font-medium">
                            {result.match}
                          </mark>
                          {result.after ? ' ' : ''}
                          <span className="text-muted-foreground">
                            {result.after}
                          </span>
                        </p>
                      </div>
                      <ArrowRight
                        className="text-muted-foreground mt-1 size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                        aria-hidden
                      />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
