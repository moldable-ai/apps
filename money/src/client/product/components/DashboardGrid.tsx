import { Receipt, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { cn, useWorkspace } from '@moldable-ai/ui'
import { formatDate, formatMoney } from '../../ui-kit/lib/format'
import type { EvaluatedCard, MoneyTransactionRow } from '../../ui-kit/lib/types'
import { CardRenderer } from '../../ui-kit/cards'
import { drawdownInfo, pickRenderer } from '../../ui-kit/cards/helpers'
import { TransactionDrilldown } from '../../ui-kit/sections/TransactionDrilldown'
import { CardErrorBoundary } from './CardErrorBoundary'
import {
  type DrillLevel,
  type DrillRow,
  DrilldownDrawer,
} from './DrilldownDrawer'
import { type MasonryCell, MasonryGrid } from './MasonryGrid'

function txToRow(tx: MoneyTransactionRow): DrillRow {
  const label = tx.merchantName || tx.name
  const tone =
    tx.direction === 'income'
      ? 'positive'
      : tx.direction === 'transfer'
        ? 'muted'
        : 'default'
  const sign =
    tx.direction === 'income' ? '+' : tx.direction === 'expense' ? '−' : ''
  return {
    id: tx.id,
    label,
    sublabel: formatDate(tx.date, { month: 'short', day: 'numeric' }),
    chip: label,
    value: `${sign}${formatMoney(Math.abs(tx.amount), { currency: tx.isoCurrencyCode, cents: true })}`,
    tone,
  }
}

// Transaction-backed collections worth a row-level drilldown.
const TX_COLLECTIONS =
  /\b(Expenses?|Income|Subscriptions|RecurringObligations|Merchants|JoyReview|SharedExpenses|TaxContributions|Cash)\b/

function isDrillable(card: EvaluatedCard): boolean {
  const haystack = [
    card.formula,
    card.primaryFormula,
    ...(card.referencedCollections ?? []),
  ]
    .filter(Boolean)
    .join(' ')
  return TX_COLLECTIONS.test(haystack)
}

/**
 * The bento size palette — just two heights so pieces always tessellate: a
 * **small** tile (1 block = 2 base rows ≈ 192px) and a **big** tile (2 blocks =
 * 4 rows ≈ 400px, exactly double). Because big is an integer multiple of small,
 * every hole a big tile leaves is fillable by small tiles — no orphan gaps.
 * Width is 1 or 2 columns. Four resulting shapes (1×1, 1×2-block, 2×1, 2×2) give
 * diversity while staying commensurate.
 */
const SMALL = 2
const BIG = 4

function tileSize(card: EvaluatedCard): { colSpan: number; rowSpan: number } {
  // The compact "living off savings" reframe is a small stat, not a chart.
  if (drawdownInfo(card)) return { colSpan: 1, rowSpan: SMALL }
  switch (pickRenderer(card)) {
    case 'trend':
      return { colSpan: 2, rowSpan: BIG } // hero value + line chart + range switch
    case 'breakdown':
      return { colSpan: 2, rowSpan: BIG } // total + bars; wide reads best
    case 'optimizer':
      return { colSpan: 2, rowSpan: BIG }
    case 'entity-list':
      // A list is fine narrow — keep it 1-wide-tall so it fills the column
      // beside a 2-wide chart/breakdown instead of leaving an empty column.
      return { colSpan: 1, rowSpan: BIG }
    case 'metric':
    case 'status':
    case 'forecast':
    case 'comparison':
    default:
      return { colSpan: 1, rowSpan: SMALL } // a stat / gauge / duration
  }
}

const DRILL_BTN =
  'inline-flex size-6 items-center justify-center rounded-md text-muted-foreground/70 ' +
  'hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card'

/**
 * A dashboard's cards in a true masonry — each card at its natural height, no
 * stretching — with per-card transaction drilldown. Single source of truth for
 * how a dashboard's cards lay out on the product detail screen.
 */
export function DashboardGrid({
  cards,
  enableDrilldown = true,
  onRemoveCard,
}: {
  cards: EvaluatedCard[]
  /** Demo-preview cards aren't backed by /api/cards/:id/transactions. */
  enableDrilldown?: boolean
  /** When provided, the grid is in edit mode: each card shows a remove control. */
  onRemoveCard?: (cardId: string) => void
}) {
  const [drill, setDrill] = useState<EvaluatedCard | null>(null)
  const [rowDrill, setRowDrill] = useState<DrillLevel | null>(null)
  const { fetchWithWorkspace } = useWorkspace()
  const editing = Boolean(onRemoveCard)

  // Tap a rolled-up breakdown row → drawer of that category's transactions.
  const openRowDrill = useCallback(
    (card: EvaluatedCard, key: string, label: string) => {
      // Category group keys are "PRIMARY DETAILED"; the transactions endpoint
      // filters by the detailed category (the token after the space).
      const category = key.includes(' ') ? key.slice(key.indexOf(' ') + 1) : key
      setRowDrill({
        title: label,
        subtitle: 'Loading…',
        rows: [],
        emptyText: 'Loading…',
      })
      fetchWithWorkspace(
        `/api/cards/${encodeURIComponent(card.id)}/transactions?category=${encodeURIComponent(category)}&limit=50`,
      )
        .then((r) =>
          r.ok ? r.json() : Promise.reject(new Error('load failed')),
        )
        .then((body) => {
          const txns: MoneyTransactionRow[] = body.transactions ?? []
          setRowDrill({
            title: label,
            subtitle: `${(body.total ?? txns.length).toLocaleString()} transactions`,
            rows: txns.map(txToRow),
            emptyText: 'No transactions in this category.',
          })
        })
        .catch(() =>
          setRowDrill((cur) =>
            cur
              ? {
                  ...cur,
                  subtitle: 'Couldn’t load',
                  emptyText: 'Couldn’t load transactions.',
                }
              : null,
          ),
        )
    },
    [fetchWithWorkspace],
  )

  const cells: MasonryCell[] = cards.map((card, i) => {
    const renderer = (
      <CardErrorBoundary title={card.title}>
        <CardRenderer
          card={card}
          index={i}
          onDrillRow={
            // Only category breakdowns map row keys to the `?category=` filter.
            // Other groupings (assetClass, person, …) would send a bogus query.
            !editing &&
            enableDrilldown &&
            /GroupBy\(\s*category\s*\)/.test(card.formula ?? '')
              ? (key, label) => openRowDrill(card, key, label)
              : undefined
          }
          action={
            !editing && enableDrilldown && isDrillable(card) ? (
              <button
                type="button"
                onClick={() => setDrill(card)}
                aria-label="View underlying transactions"
                className={cn('-mr-0.5', DRILL_BTN)}
              >
                <Receipt className="size-3.5" />
              </button>
            ) : undefined
          }
        />
      </CardErrorBoundary>
    )
    const { colSpan, rowSpan } = tileSize(card)
    return {
      key: `${card.id}-${i}`,
      colSpan,
      rowSpan,
      node: editing ? (
        <div className="relative h-full">
          {renderer}
          <button
            type="button"
            onClick={() => onRemoveCard?.(card.id)}
            aria-label={`Remove ${card.title} from this dashboard`}
            className="border-border bg-card text-muted-foreground hover:text-destructive absolute -right-2 -top-2 z-10 flex size-6 items-center justify-center rounded-full border shadow-sm"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        renderer
      ),
    }
  })

  return (
    <>
      <MasonryGrid cells={cells} />
      <TransactionDrilldown card={drill} onClose={() => setDrill(null)} />
      <DrilldownDrawer root={rowDrill} onClose={() => setRowDrill(null)} />
    </>
  )
}
