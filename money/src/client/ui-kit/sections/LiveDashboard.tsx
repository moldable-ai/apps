import { useQuery } from '@tanstack/react-query'
import { Receipt } from 'lucide-react'
import { useState } from 'react'
import { Badge, cn, useWorkspace } from '@moldable-ai/ui'
import type {
  CardSpan,
  DashboardCard,
  EvaluatedCard,
  MoneyValueFormat,
  PreviewResponse,
} from '../lib/types'
import { CardRenderer, CardShell } from '../cards'
import { valueShape } from '../cards'
import { useCardsQuery, useDataModeQuery } from '../data/hooks'
import { Bento } from './Bento'
import { SectionHeader } from './Shell'
import { TransactionDrilldown } from './TransactionDrilldown'

function liveSpan(card: EvaluatedCard): CardSpan {
  const shape = valueShape(card.value)
  if (shape === 'series' || shape === 'table' || shape === 'entity-list')
    return 2
  if (/trend|breakdown|optimizer|comparison/.test(card.kind)) return 2
  return 1
}

// Collections that are transaction-backed, so a row-level drilldown is meaningful.
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

const DRILL_BTN =
  'inline-flex size-6 items-center justify-center rounded-md text-muted-foreground/70 ' +
  'hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card'

/** Live evaluated cards from the real backend, plus a live formula→chart proof. */
export function LiveDashboard() {
  const cardsQuery = useCardsQuery()
  const dataModeQuery = useDataModeQuery()
  const cards = cardsQuery.data?.cards ?? []
  const mode = dataModeQuery.data?.dataMode
  const [drill, setDrill] = useState<EvaluatedCard | null>(null)

  const dashboardCards: DashboardCard[] = cards.map((card) => ({
    card,
    span: liveSpan(card),
    action: isDrillable(card) ? (
      <button
        type="button"
        onClick={() => setDrill(card)}
        aria-label="View underlying transactions"
        className={cn('-mr-0.5', DRILL_BTN)}
      >
        <Receipt className="size-3.5" />
      </button>
    ) : undefined,
  }))

  return (
    <div className="space-y-4">
      <SectionHeader
        label="Live data"
        title="Your real backend, rendered by the same legos"
        description="Cards from GET /api/cards and a formula evaluated against your workspace via POST /api/formulas/preview."
        action={
          mode ? (
            <Badge
              variant={mode === 'live' ? 'default' : 'secondary'}
              className="uppercase"
            >
              {mode === 'live' ? 'Live accounts' : 'Demo mode'}
            </Badge>
          ) : null
        }
      />

      <LiveTrendCard
        title="Monthly spending"
        formula="Expenses.Rolling(6mo).Monthly().Trend()"
        format="currency"
      />

      {cardsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardShell key={i} title="Loading" state="loading" />
          ))}
        </div>
      ) : cardsQuery.isError ? (
        <CardShell
          title="Cards"
          state="error"
          errorMessage={(cardsQuery.error as Error).message}
          onRetry={() => void cardsQuery.refetch()}
        />
      ) : cards.length === 0 ? (
        <CardShell
          title="Cards"
          state="empty"
          emptyMessage="No cards defined yet. Seed data or create one."
        />
      ) : (
        <Bento cards={dashboardCards} />
      )}

      <TransactionDrilldown card={drill} onClose={() => setDrill(null)} />
    </div>
  )
}

/** Evaluate one formula live and render the typed result as a trend card. */
function LiveTrendCard({
  title,
  formula,
  format,
}: {
  title: string
  formula: string
  format: MoneyValueFormat
}) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const query = useQuery({
    queryKey: ['ui-kit', 'live-trend', workspaceId, formula],
    queryFn: async (): Promise<PreviewResponse> => {
      const res = await fetchWithWorkspace('/api/formulas/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formula }),
      })
      return res.json()
    },
  })

  if (query.isLoading) return <CardShell title={title} state="loading" />
  if (query.isError || !query.data?.ok) {
    return (
      <CardShell
        title={title}
        state="error"
        errorMessage={
          query.data && !query.data.ok
            ? query.data.error.message
            : 'Preview failed'
        }
        onRetry={() => void query.refetch()}
      />
    )
  }

  const result = query.data.result
  const card: EvaluatedCard = {
    id: 'live-trend',
    title,
    kind: 'trend',
    format,
    value: result.value,
    displayValue: result.displayValue,
    formula: result.formula,
    description: 'Evaluated live against your workspace facts.',
  }
  return <CardRenderer card={card} variant="trend" />
}
