import { Check, Copy, X } from 'lucide-react'
import { useState } from 'react'
import { Button, ScrollArea } from '@moldable-ai/ui'
import { resultValueString } from '../lib/format'

function detailValue(value: unknown) {
  const raw = resultValueString(value)
  if (typeof value !== 'string') return raw

  const trimmed = value.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return raw

  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2)
  } catch {
    return raw
  }
}

function rowJson(row: Record<string, unknown>) {
  return JSON.stringify(row, null, 2)
}

export function RowDetails({
  columns,
  row,
  onClose,
}: {
  columns: string[]
  row: Record<string, unknown>
  onClose: () => void
}) {
  const [copiedColumn, setCopiedColumn] = useState<string | null>(null)
  const [hoveredCopyTarget, setHoveredCopyTarget] = useState<string | null>(
    null,
  )

  async function copyValue(column: string, value: string) {
    await navigator.clipboard.writeText(value)
    setCopiedColumn(column)
    window.setTimeout(() => {
      setCopiedColumn((current) => (current === column ? null : current))
    }, 1200)
  }

  return (
    <aside
      className="bg-background flex h-full min-w-0 flex-col"
      onPointerLeave={() => setHoveredCopyTarget(null)}
    >
      <div className="border-border/70 flex h-9 shrink-0 items-center justify-between border-b px-3">
        <div
          className="flex min-w-0 items-center gap-1.5"
          onPointerEnter={() => setHoveredCopyTarget('__row__')}
          onPointerLeave={() => {
            setHoveredCopyTarget((current) =>
              current === '__row__' ? null : current,
            )
          }}
        >
          <div className="text-foreground text-xs font-semibold">Row</div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={[
              'text-muted-foreground size-6 cursor-pointer transition-opacity',
              hoveredCopyTarget === '__row__' || copiedColumn === '__row__'
                ? 'opacity-100'
                : 'pointer-events-none opacity-0',
            ].join(' ')}
            aria-label="Copy row"
            onPointerEnter={() => setHoveredCopyTarget('__row__')}
            onFocus={() => setHoveredCopyTarget('__row__')}
            onBlur={() => setHoveredCopyTarget(null)}
            onClick={() => void copyValue('__row__', rowJson(row))}
          >
            {copiedColumn === '__row__' ? (
              <Check className="size-3.5" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground size-7 cursor-pointer"
          onClick={onClose}
          aria-label="Close row details"
        >
          <X className="size-4" />
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="divide-border/70 divide-y pb-[var(--chat-safe-padding,0px)] text-xs">
          {columns.map((column, index) => {
            const copyTarget = `${column}-${index}`
            const showCopy =
              hoveredCopyTarget === copyTarget || copiedColumn === copyTarget

            return (
              <div
                key={copyTarget}
                className="px-3 py-2"
                onPointerEnter={() => setHoveredCopyTarget(copyTarget)}
                onPointerLeave={() => {
                  setHoveredCopyTarget((current) =>
                    current === copyTarget ? null : current,
                  )
                }}
              >
                <div className="mb-1 flex min-w-0 items-center justify-between gap-3">
                  <div className="text-muted-foreground truncate font-mono text-[11px]">
                    {column}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={[
                      'text-muted-foreground size-6 shrink-0 cursor-pointer transition-opacity',
                      showCopy
                        ? 'opacity-100'
                        : 'pointer-events-none opacity-0',
                    ].join(' ')}
                    aria-label={`Copy ${column}`}
                    onFocus={() => setHoveredCopyTarget(copyTarget)}
                    onBlur={() => setHoveredCopyTarget(null)}
                    onClick={() =>
                      void copyValue(copyTarget, detailValue(row[column]))
                    }
                  >
                    {copiedColumn === copyTarget ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                </div>
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-4">
                  {detailValue(row[column])}
                </pre>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </aside>
  )
}

export function RowDetailsEmpty({ onClose }: { onClose: () => void }) {
  return (
    <aside className="bg-background flex h-full min-w-0 flex-col">
      <div className="border-border/70 flex h-9 shrink-0 items-center justify-between border-b px-3">
        <div className="text-foreground text-xs font-semibold">Row</div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground size-7 cursor-pointer"
          onClick={onClose}
          aria-label="Close row details"
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 pb-[var(--chat-safe-padding,0px)] text-center">
        <div>
          <p className="text-sm font-medium">No row selected</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Select a result row to inspect its fields.
          </p>
        </div>
      </div>
    </aside>
  )
}
