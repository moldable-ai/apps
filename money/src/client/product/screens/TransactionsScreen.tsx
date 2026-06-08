import { Landmark, Loader2, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@moldable-ai/ui'
import { formatDate, formatMoney } from '../../ui-kit/lib/format'
import type {
  MoneyTransactionRow,
  TransactionFilters,
} from '../../ui-kit/lib/types'
import { TransactionDetailSheet } from '../components/TransactionDetailSheet'
import { CardShell } from '../../ui-kit/cards'
import { MerchantChip } from '../../ui-kit/cards/MerchantChip'
import { useTransactions } from '../data/transactions'

type Direction = 'all' | 'income' | 'expense' | 'transfer'
type Period = 'all' | 'month' | '30d' | 'year'

const PAGE = 50
const DIRECTIONS: Array<{ id: Direction; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'expense', label: 'Expense' },
  { id: 'income', label: 'Income' },
  { id: 'transfer', label: 'Transfer' },
]
const PERIODS: Array<{ id: Period; label: string }> = [
  { id: 'all', label: 'All time' },
  { id: 'month', label: 'This month' },
  { id: '30d', label: '30 days' },
  { id: 'year', label: 'This year' },
]

function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** "FOOD_AND_DRINK" → "Food And Drink". */
function humanizeCategory(raw: string): string {
  return raw
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Map a period to a closed [startDate, endDate] (or undefined for all time). */
function periodRange(period: Period): { startDate?: string; endDate?: string } {
  if (period === 'all') return {}
  const now = new Date()
  const end = iso(now)
  if (period === 'month')
    return {
      startDate: iso(new Date(now.getFullYear(), now.getMonth(), 1)),
      endDate: end,
    }
  if (period === 'year')
    return { startDate: iso(new Date(now.getFullYear(), 0, 1)), endDate: end }
  const back = new Date(now)
  back.setDate(back.getDate() - 30)
  return { startDate: iso(back), endDate: end }
}

/** Full transactions list: search, direction filter, day-grouped rows, paging. */
export function TransactionsScreen({
  demo = false,
  onConnect,
}: {
  demo?: boolean
  onConnect?: () => void
}) {
  const [direction, setDirection] = useState<Direction>('all')
  const [period, setPeriod] = useState<Period>('all')
  const [category, setCategory] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [detail, setDetail] = useState<MoneyTransactionRow | null>(null)
  // Category options accumulate as you page/filter, so the picker stays stable
  // even once a single category is selected (which would otherwise collapse it).
  const [seenCategories, setSeenCategories] = useState<string[]>([])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])
  useEffect(() => setLimit(PAGE), [debounced, direction, period, category])

  const filters = useMemo<TransactionFilters>(
    () => ({
      q: debounced || undefined,
      direction: direction === 'all' ? undefined : direction,
      category: category === 'all' ? undefined : category,
      ...periodRange(period),
      limit,
      offset: 0,
    }),
    [debounced, direction, period, category, limit],
  )

  const query = useTransactions(filters, !demo)
  const page = query.data
  const rows = page?.transactions ?? []
  const groups = useMemo(() => groupByDay(page?.transactions ?? []), [page])

  // Merge any new primary categories into the stable option list.
  useEffect(() => {
    const fresh = new Set<string>()
    for (const tx of page?.transactions ?? []) {
      const c = tx.category?.[0]
      if (c) fresh.add(c)
    }
    if (fresh.size === 0) return
    setSeenCategories((prev) => {
      const next = new Set(prev)
      let changed = false
      for (const c of fresh)
        if (!next.has(c)) {
          next.add(c)
          changed = true
        }
      return changed ? [...next].sort() : prev
    })
  }, [page])

  if (demo) {
    return (
      <ScreenFrame>
        <div className="border-border/70 bg-card/40 flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-14 text-center">
          <Landmark className="text-muted-foreground size-8" />
          <div>
            <p className="font-medium">Your transactions live here</p>
            <p className="text-muted-foreground text-sm">
              Connect an account to see and search every transaction.
            </p>
          </div>
          {onConnect ? (
            <Button onClick={onConnect}>
              <Landmark className="size-4" />
              Connect an account
            </Button>
          ) : null}
        </div>
      </ScreenFrame>
    )
  }

  return (
    <ScreenFrame
      title="Transactions"
      subtitle={page ? `${page.total.toLocaleString()} total` : undefined}
    >
      <div className="bg-background/85 sticky top-0 z-10 -mx-4 mb-3 space-y-3 px-4 pb-3 pt-1 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="relative">
          <Search className="text-muted-foreground absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search merchant or description…"
            className="h-9 pl-8"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {DIRECTIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDirection(d.id)}
              aria-pressed={direction === d.id}
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
          <span className="bg-border/70 mx-1 h-4 w-px" />
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              aria-pressed={period === p.id}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                period === p.id
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p.label}
            </button>
          ))}
          {seenCategories.length > 0 ? (
            <>
              <span className="bg-border/70 mx-1 h-4 w-px" />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger
                  size="sm"
                  className="h-7 w-auto gap-1 text-xs"
                  aria-label="Filter by category"
                >
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {seenCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {humanizeCategory(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : null}
        </div>
      </div>

      {query.isLoading ? (
        <RowSkeletons />
      ) : query.isError ? (
        <CardShell
          title="Transactions"
          state="error"
          errorMessage="Couldn’t load transactions."
          onRetry={() => void query.refetch()}
        />
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          No transactions match this view.
        </p>
      ) : (
        <div
          className={cn(
            'space-y-5 transition-opacity',
            query.isFetching && 'opacity-60',
          )}
        >
          {groups.map((g) => (
            <div key={g.date}>
              <div className="text-muted-foreground/70 mb-1.5 text-xs font-medium uppercase tracking-wide">
                {formatDate(g.date, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <ul className="divide-border/50 border-border/50 bg-card divide-y overflow-hidden rounded-xl border">
                {g.rows.map((tx) => (
                  <Row key={tx.id} tx={tx} onClick={() => setDetail(tx)} />
                ))}
              </ul>
            </div>
          ))}

          {page?.hasMore ? (
            <div className="flex justify-center pt-1">
              <Button
                variant="outline"
                size="sm"
                disabled={query.isFetching}
                onClick={() => setLimit((l) => l + PAGE)}
              >
                {query.isFetching ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : null}
                Load more
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <TransactionDetailSheet tx={detail} onClose={() => setDetail(null)} />
    </ScreenFrame>
  )
}

function ScreenFrame({
  title,
  subtitle,
  children,
}: {
  title?: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-[calc(var(--chat-safe-padding,0px)+5rem)] pt-6 sm:px-6">
      {title ? (
        <div className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  )
}

function Row({
  tx,
  onClick,
}: {
  tx: MoneyTransactionRow
  onClick: () => void
}) {
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
    <li>
      <button
        type="button"
        onClick={onClick}
        className="hover:bg-muted/40 flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors"
      >
        <MerchantChip name={label} size={32} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{label}</div>
          {subtitle ? (
            <div className="text-muted-foreground truncate text-xs">
              {subtitle}
            </div>
          ) : null}
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
      </button>
    </li>
  )
}

function groupByDay(
  rows: MoneyTransactionRow[],
): Array<{ date: string; rows: MoneyTransactionRow[] }> {
  const map = new Map<string, MoneyTransactionRow[]>()
  for (const r of rows) {
    const day = (r.date || '').slice(0, 10)
    map.set(day, [...(map.get(day) ?? []), r])
  }
  return [...map.entries()].map(([date, rs]) => ({ date, rows: rs }))
}

function RowSkeletons() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="border-border/50 bg-card flex items-center gap-3 rounded-xl border px-3.5 py-2.5"
        >
          <div className="bg-muted size-8 animate-pulse rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <div className="bg-muted h-3.5 w-1/2 animate-pulse rounded" />
            <div className="bg-muted/70 h-3 w-1/3 animate-pulse rounded" />
          </div>
          <div className="bg-muted h-3.5 w-14 animate-pulse rounded" />
        </div>
      ))}
    </div>
  )
}
