import { Check, ChevronDown, Copy } from 'lucide-react'
import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  ScrollArea,
  cn,
} from '@moldable-ai/ui'
import { formatTimestamp } from '../lib/format'
import { ensureSqlTerminator } from '../lib/sql'
import type { QueryHistoryItem } from '../../shared/types'

export function QueryHistoryDialog({
  items,
  onClose,
}: {
  items: QueryHistoryItem[]
  onClose: () => void
}) {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null)

  async function copySql(item: QueryHistoryItem) {
    await navigator.clipboard.writeText(ensureSqlTerminator(item.sql))
    setCopiedItemId(item.id)
    window.setTimeout(() => setCopiedItemId(null), 1200)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[min(64rem,calc(100vw-2rem))] max-w-none gap-0 overflow-hidden p-0">
        <DialogHeader className="border-border/70 border-b px-4 py-3">
          <DialogTitle className="text-base">Query history</DialogTitle>
          <DialogDescription className="text-xs">
            Recent statements for this connection.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[min(26rem,60vh)] min-w-0 overflow-hidden [&_[data-slot=scroll-area-viewport]]:overflow-x-hidden">
          <div className="box-border w-full min-w-0 max-w-full p-3">
            {items.length === 0 ? (
              <div className="text-muted-foreground px-1 py-8 text-center text-sm">
                No queries yet.
              </div>
            ) : (
              <div className="border-border/70 bg-muted/25 dark:bg-muted/15 box-border w-full min-w-0 max-w-full overflow-hidden rounded-2xl border">
                {items.map((item, index) => {
                  const sql = ensureSqlTerminator(item.sql)
                  const title = sql.split('\n')[0] ?? item.title

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'w-full min-w-0 overflow-hidden',
                        index < items.length - 1 && 'border-border/60 border-b',
                      )}
                    >
                      <button
                        type="button"
                        className="hover:bg-background/70 grid w-full min-w-0 cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 overflow-hidden px-3 py-2.5 text-left transition-colors"
                        onClick={() =>
                          setExpandedItemId((current) =>
                            current === item.id ? null : item.id,
                          )
                        }
                        aria-expanded={expandedItemId === item.id}
                      >
                        <span className="grid min-w-0 grid-cols-[minmax(0,1fr)]">
                          <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs font-medium">
                            {title}
                          </span>
                          <span className="text-muted-foreground mt-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px]">
                            {formatTimestamp(item.timestamp)}
                            {item.executionMs !== null
                              ? ` • ${item.executionMs} ms`
                              : ''}
                            {item.rowCount !== null
                              ? ` • ${item.rowCount} rows`
                              : ''}
                          </span>
                        </span>
                        <ChevronDown
                          className={cn(
                            'text-muted-foreground size-4 shrink-0 transition-transform',
                            expandedItemId === item.id && 'rotate-180',
                          )}
                        />
                      </button>

                      {expandedItemId === item.id ? (
                        <div className="border-border/60 bg-background/45 border-t px-3 py-3">
                          <div className="mb-2 flex items-center justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="text-muted-foreground cursor-pointer"
                              onClick={() => void copySql(item)}
                              aria-label="Copy SQL"
                            >
                              {copiedItemId === item.id ? (
                                <Check className="size-3.5" />
                              ) : (
                                <Copy className="size-3.5" />
                              )}
                            </Button>
                          </div>
                          <pre className="bg-muted/30 text-foreground max-h-64 min-w-0 overflow-auto whitespace-pre-wrap break-words rounded-lg p-3 font-mono text-[11px] leading-5">
                            {sql}
                          </pre>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
