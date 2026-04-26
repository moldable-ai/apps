import { ChevronDown, RefreshCcw, Sparkles } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Markdown,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from '@moldable-ai/ui'
import type { BriefingState } from '../hooks/use-briefing'

const COLLAPSED_HEIGHT = 148
const EXPAND_SLACK = 12

interface InboxBriefingProps {
  briefing: BriefingState & { refresh: () => void; available: boolean }
  unreadCount: number
  onRefresh?: () => void
}

export function InboxBriefing({
  briefing,
  unreadCount,
  onRefresh,
}: InboxBriefingProps) {
  const { status, markdown, generatedAt, error } = briefing
  const isLoading = status === 'loading' && !markdown
  const isRefreshing = status === 'loading' && !!markdown
  const isStreaming = status === 'streaming'
  const isBusy = status === 'loading' || isStreaming

  const subline = useMemo(() => {
    if (error) return 'Could not generate briefing'
    if (isLoading) return 'Reading your inbox...'
    if (isRefreshing) return 'Regenerating...'
    if (isStreaming) return 'Drafting...'
    if (markdown && generatedAt) {
      return `Updated ${formatRelative(generatedAt)}`
    }
    if (markdown) return 'Generated briefing'
    if (unreadCount > 0) return `${unreadCount} unread`
    return 'All caught up'
  }, [
    error,
    isLoading,
    isRefreshing,
    isStreaming,
    markdown,
    generatedAt,
    unreadCount,
  ])

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh()
      return
    }
    briefing.refresh()
  }

  const [expanded, setExpanded] = useState(false)
  const [contentHeight, setContentHeight] = useState<number | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const element = contentRef.current
    if (!element) return

    const update = () => setContentHeight(element.scrollHeight)
    update()

    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [markdown, isStreaming])

  useEffect(() => {
    if (!markdown && expanded) setExpanded(false)
  }, [markdown, expanded])

  const canExpand =
    !!markdown &&
    contentHeight !== null &&
    contentHeight > COLLAPSED_HEIGHT + EXPAND_SLACK

  const bodyHeight =
    expanded && canExpand
      ? (contentHeight ?? COLLAPSED_HEIGHT)
      : COLLAPSED_HEIGHT

  const fadeMask =
    !expanded && canExpand
      ? 'linear-gradient(to bottom, black 72%, transparent 100%)'
      : undefined

  return (
    <section className="border-border/70 from-muted/40 via-muted/20 dark:from-muted/25 dark:via-muted/10 relative overflow-hidden rounded-2xl border bg-gradient-to-br to-transparent px-5 pb-3 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-muted-foreground flex items-center gap-2">
          <span className="bg-background/60 text-foreground ring-border/80 inline-flex size-5 items-center justify-center rounded-full ring-1">
            <Sparkles className="size-3" />
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.14em]">
            Briefing
          </span>
          <span
            className="text-muted-foreground/80 text-[11px]"
            aria-live="polite"
          >
            {subline}
          </span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isBusy}
              className={cn(
                'text-muted-foreground inline-flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors',
                'hover:bg-background/70 hover:text-foreground',
                isBusy && 'cursor-not-allowed opacity-60',
              )}
              aria-label="Regenerate briefing"
            >
              <RefreshCcw
                className={cn('size-3.5', isBusy && 'animate-spin')}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Regenerate briefing</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div
        className={cn(
          'mt-3 overflow-hidden transition-[height] duration-300 ease-out',
          isBusy && 'opacity-90',
        )}
        style={{ height: bodyHeight }}
      >
        <div
          className="emails-briefing-body h-full"
          style={
            fadeMask
              ? {
                  WebkitMaskImage: fadeMask,
                  maskImage: fadeMask,
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                }
              : undefined
          }
        >
          <div ref={contentRef}>
            {isLoading ? (
              <BriefingSkeleton />
            ) : error && !markdown ? (
              <p className="text-muted-foreground text-[13.5px]">{error}</p>
            ) : markdown ? (
              <>
                <Markdown markdown={markdown} proseSize="sm" />
                {isStreaming ? (
                  <span className="emails-briefing-caret" aria-hidden />
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {markdown && canExpand ? (
        <div className="mt-1">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse briefing' : 'Expand briefing'}
            title={expanded ? 'Collapse' : 'Show more'}
            className={cn(
              'text-muted-foreground group flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors',
              'hover:bg-background/70 hover:text-foreground',
              'focus-visible:ring-ring/60 focus-visible:outline-none focus-visible:ring-2',
            )}
          >
            <span className="uppercase tracking-[0.14em]">
              {expanded ? 'Less' : 'More'}
            </span>
            <ChevronDown
              className={cn(
                'size-3.5 transition-transform duration-300 ease-out',
                expanded && 'rotate-180',
              )}
            />
          </button>
        </div>
      ) : null}
    </section>
  )
}

function BriefingSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="bg-foreground/10 h-3 w-4/5" />
      <Skeleton className="bg-foreground/10 h-3 w-3/5" />
      <div className="mt-3 space-y-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2 pl-2">
            <Skeleton className="bg-foreground/20 size-1 rounded-full" />
            <Skeleton className="bg-foreground/10 h-3 flex-1" />
          </div>
        ))}
      </div>
    </div>
  )
}

function formatRelative(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'just now'
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 14) return `${days}d ago`
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
