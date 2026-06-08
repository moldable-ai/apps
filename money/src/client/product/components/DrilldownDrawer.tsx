import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  cn,
} from '@moldable-ai/ui'
import { MerchantChip } from '../../ui-kit/cards/MerchantChip'

export type DrillTone = 'default' | 'positive' | 'negative' | 'muted'

export interface DrillRow {
  id: string
  label: string
  sublabel?: string
  /** Right-side primary value (e.g. a formatted amount). */
  value?: string
  /** Right-side secondary line (small, muted). */
  valueSub?: string
  tone?: DrillTone
  /** Render a MerchantChip with this name as the leading visual. */
  chip?: string
  /** Leading icon (used when no `chip`). */
  icon?: ReactNode
  /** Inline content under the label (e.g. a utilization bar). */
  meta?: ReactNode
  /** When present the row is tappable and pushes the resolved level. */
  drill?: () => DrillLevel | Promise<DrillLevel>
}

export interface DrillLevel {
  title: string
  subtitle?: string
  rows: DrillRow[]
  emptyText?: string
}

const TONE: Record<DrillTone, string> = {
  default: 'text-foreground',
  positive: 'text-success',
  negative: 'text-destructive',
  muted: 'text-muted-foreground',
}

/**
 * A right-side drawer that drills into a roll-up: tap a row to push the list of
 * values behind it, and keep tapping to push further — a nav stack you can pop
 * back off. The single mechanism behind every "what went into this number?"
 * across the product (credit-card balances, asset buckets, grouped expenses).
 */
export function DrilldownDrawer({
  root,
  onClose,
}: {
  root: DrillLevel | null
  onClose: () => void
}) {
  const [stack, setStack] = useState<DrillLevel[]>([])
  const [loading, setLoading] = useState(false)
  const open = root !== null

  // Each time a new root opens, reset the nav stack to it.
  useEffect(() => {
    setStack(root ? [root] : [])
    setLoading(false)
  }, [root])

  const current = stack[stack.length - 1]
  const depth = stack.length

  const push = async (row: DrillRow) => {
    if (!row.drill || loading) return
    try {
      setLoading(true)
      const next = await row.drill()
      setStack((s) => [...s, next])
    } finally {
      setLoading(false)
    }
  }

  const pop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))

  return (
    <Sheet open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-border/60 gap-1 border-b px-5 py-4">
          <div className="flex items-center gap-2">
            {depth > 1 ? (
              <button
                type="button"
                onClick={pop}
                aria-label="Back"
                className="text-muted-foreground hover:bg-muted hover:text-foreground -ml-1.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md"
              >
                <ChevronLeft className="size-4.5" />
              </button>
            ) : null}
            <SheetTitle className="min-w-0 truncate text-base">
              {current?.title ?? ''}
            </SheetTitle>
            {loading ? (
              <Loader2
                role="status"
                aria-label="Loading"
                className="text-muted-foreground size-3.5 shrink-0 animate-spin"
              />
            ) : null}
          </div>
          {current?.subtitle ? (
            <SheetDescription>{current.subtitle}</SheetDescription>
          ) : null}
        </SheetHeader>

        {/* Announce level changes (push/pop) to screen readers. */}
        <div aria-live="polite" className="sr-only">
          {current?.title}
        </div>

        <div
          className={cn(
            'min-h-0 flex-1 overflow-y-auto pb-[var(--chat-safe-padding,0px)] transition-opacity',
            loading && 'opacity-60',
          )}
        >
          {!current || current.rows.length === 0 ? (
            <p className="text-muted-foreground px-5 py-10 text-center text-sm">
              {current?.emptyText ?? 'Nothing to show here.'}
            </p>
          ) : (
            <ul className="divide-border/50 divide-y">
              {current.rows.map((row) => (
                <Row key={row.id} row={row} onDrill={() => push(row)} />
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Row({ row, onDrill }: { row: DrillRow; onDrill: () => void }) {
  const tone = TONE[row.tone ?? 'default']
  const inner = (
    <>
      {row.chip ? (
        <MerchantChip name={row.chip} size={34} />
      ) : row.icon ? (
        <span className="bg-muted text-muted-foreground flex size-[34px] shrink-0 items-center justify-center rounded-lg [&>svg]:size-4">
          {row.icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="text-foreground truncate text-sm font-medium">
          {row.label}
        </div>
        {row.sublabel ? (
          <div className="text-muted-foreground truncate text-xs">
            {row.sublabel}
          </div>
        ) : null}
        {row.meta ? <div className="mt-1.5">{row.meta}</div> : null}
      </div>
      {row.value ? (
        <div className="shrink-0 text-right">
          <div
            className={cn('uk-nums text-sm font-semibold tabular-nums', tone)}
          >
            {row.value}
          </div>
          {row.valueSub ? (
            <div className="text-muted-foreground text-[11px]">
              {row.valueSub}
            </div>
          ) : null}
        </div>
      ) : null}
      {row.drill ? (
        <ChevronRight className="text-muted-foreground/50 size-4 shrink-0" />
      ) : null}
    </>
  )

  if (row.drill) {
    return (
      <li>
        <button
          type="button"
          onClick={onDrill}
          className="hover:bg-muted/40 flex w-full items-center gap-3 px-5 py-3 text-left transition-colors"
        >
          {inner}
        </button>
      </li>
    )
  }
  return <li className="flex items-center gap-3 px-5 py-3">{inner}</li>
}
