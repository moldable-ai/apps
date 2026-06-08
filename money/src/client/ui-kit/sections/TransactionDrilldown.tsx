import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  cn,
} from '@moldable-ai/ui'
import { formatDate, formatMoney } from '../lib/format'
import type {
  EvaluatedCard,
  MoneyTransactionRow,
  TransactionFilters,
} from '../lib/types'
import { MerchantChip } from '../cards/MerchantChip'
import { useCardTransactionsQuery } from '../data/hooks'

type Direction = 'all' | 'income' | 'expense' | 'transfer'

const PAGE_SIZE = 25

const DIRECTIONS: Array<{ id: Direction; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'expense', label: 'Expense' },
  { id: 'income', label: 'Income' },
  { id: 'transfer', label: 'Transfer' },
]

/**
 * Card → underlying transaction facts. A right-side sheet over the card-scoped
 * `GET /api/cards/:id/transactions` surface: the backend resolves the card's
 * formula/collection and returns the rows behind the number, so this shows what
 * the card actually counts (not every transaction). Direction is an optional
 * refinement here, not a guess. Read-only — it never mutates the rows.
 */
export function TransactionDrilldown({
  card,
  onClose,
}: {
  card: EvaluatedCard | null
  onClose: () => void
}) {
  const open = card !== null
  const [direction, setDirection] = useState<Direction>('all')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [offset, setOffset] = useState(0)

  // Reset the view each time a new card opens the drilldown.
  useEffect(() => {
    if (card) {
      setDirection('all')
      setSearch('')
      setDebounced('')
      setOffset(0)
    }
  }, [card])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  // Reset to the first page whenever the filters change.
  useEffect(() => {
    setOffset(0)
  }, [direction, debounced])

  const filters = useMemo<TransactionFilters>(
    () => ({
      q: debounced || undefined,
      direction: direction === 'all' ? undefined : direction,
      limit: PAGE_SIZE,
      offset,
    }),
    [debounced, direction, offset],
  )

  const query = useCardTransactionsQuery(card?.id ?? null, filters, open)
  const page = query.data
  const rows = page?.transactions ?? []
  const total = page?.total ?? 0
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + PAGE_SIZE, total)
  // What the backend scoped the card down to (the exact formula rows, or the
  // backing collection) — surfaced so the count isn't a mystery.
  const basis =
    page?.collection && !page.formulaFiltered
      ? `${page.collection} transactions`
      : 'Underlying transactions'

  return (
    <Sheet open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-border/60 gap-1 border-b px-5 py-4">
          <SheetTitle className="text-base">
            {card?.title ?? 'Transactions'}
          </SheetTitle>
          <SheetDescription>
            {basis}
            {total ? ` · ${total.toLocaleString()}` : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="border-border/60 space-y-3 border-b px-5 py-3">
          <div className="relative">
            <Search className="text-muted-foreground absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search merchant or name…"
              className="h-9 pl-8 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DIRECTIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDirection(d.id)}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                  direction === d.id
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {query.isLoading ? (
            <RowSkeletons />
          ) : query.isError ? (
            <div
              role="alert"
              className="flex flex-col items-start gap-2 px-5 py-8"
            >
              <p className="text-sm font-medium">Couldn’t load transactions</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void query.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground px-5 py-10 text-center text-sm">
              No transactions match this view.
            </p>
          ) : (
            // Keep the previous page visible while a filter change refetches
            // (placeholderData), just dimmed, so the count/rows don't flash.
            <ul
              className={cn(
                'divide-border/50 divide-y transition-opacity',
                query.isFetching && 'opacity-50',
              )}
            >
              {rows.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </ul>
          )}
        </div>

        <div className="border-border/60 flex items-center justify-between gap-3 border-t px-5 py-3">
          <span className="uk-nums text-muted-foreground text-xs">
            {total === 0
              ? 'No results'
              : `${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              disabled={offset === 0 || query.isFetching}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              disabled={!page?.hasMore || query.isFetching}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function TransactionRow({ tx }: { tx: MoneyTransactionRow }) {
  const label = tx.merchantName || tx.name
  const subtitle = tx.userCategory || tx.category?.[0]
  const money = formatMoney(Math.abs(tx.amount), {
    currency: tx.isoCurrencyCode,
    cents: true,
  })
  const sign =
    tx.direction === 'income' ? '+' : tx.direction === 'expense' ? '−' : ''
  const tone =
    tx.direction === 'income'
      ? 'text-success'
      : tx.direction === 'transfer'
        ? 'text-muted-foreground'
        : 'text-foreground'

  return (
    <li className="flex items-center gap-3 px-5 py-2.5">
      <MerchantChip name={label} size={34} />
      <div className="min-w-0 flex-1">
        <div className="text-foreground truncate text-sm font-medium">
          {label}
        </div>
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <span>{formatDate(tx.date, { month: 'short', day: 'numeric' })}</span>
          {subtitle ? (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{subtitle}</span>
            </>
          ) : null}
          {tx.pending ? (
            <Badge
              variant="outline"
              className="h-4 px-1 text-[9px] uppercase tracking-wide"
            >
              Pending
            </Badge>
          ) : null}
        </div>
      </div>
      <div
        className={cn(
          'uk-nums shrink-0 text-sm font-semibold tabular-nums',
          tone,
        )}
      >
        {sign}
        {money}
      </div>
    </li>
  )
}

function RowSkeletons() {
  return (
    <ul className="divide-border/50 divide-y">
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-5 py-2.5">
          <div className="bg-muted size-[34px] shrink-0 animate-pulse rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <div className="bg-muted h-3.5 w-1/2 animate-pulse rounded" />
            <div className="bg-muted/70 h-3 w-1/3 animate-pulse rounded" />
          </div>
          <div className="bg-muted h-3.5 w-12 animate-pulse rounded" />
        </li>
      ))}
    </ul>
  )
}
