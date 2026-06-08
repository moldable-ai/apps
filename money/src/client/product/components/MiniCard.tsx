import { cn } from '@moldable-ai/ui'
import { categoryColor } from '../../ui-kit/lib/colors'
import {
  asNumber,
  formatDuration,
  formatScalar,
  isDurationValue,
} from '../../ui-kit/lib/format'
import type { EvaluatedCard } from '../../ui-kit/lib/types'
import {
  firstEntityList,
  firstSeries,
  firstTable,
  iconForCard,
  valueShape,
} from '../../ui-kit/cards'
import { MerchantChip } from '../../ui-kit/cards/MerchantChip'
import { MicroLabel } from '../../ui-kit/cards/atoms'
import { Sparkline } from '../../ui-kit/charts'
import { StackedBar } from '../../ui-kit/charts/StackedBar'

/**
 * A compact, read-only surface of a card's essence — hero value + the one chart
 * that tells the story (sparkline / split bar / top row). Used in the Dashboards
 * home rollup so each dashboard section previews its most important cards as
 * beautifully as the full cards, just denser. Dispatches on runtime value shape.
 */
export function MiniCard({
  card,
  onClick,
}: {
  card: EvaluatedCard
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'border-border/60 bg-card flex h-full flex-col gap-2.5 rounded-xl border p-4 text-left',
        'hover:border-border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/10',
      )}
    >
      <MicroLabel icon={iconForCard(card)}>{card.title}</MicroLabel>
      <MiniBody card={card} />
    </button>
  )
}

function Hero({ card }: { card: EvaluatedCard }) {
  const n = asNumber(card.value)
  const text =
    n !== null
      ? formatScalar(n, card.format)
      : isDurationValue(card.value)
        ? formatDuration(card.value)
        : card.displayValue || '—'
  return (
    <div className="uk-nums text-[1.6rem] font-semibold tabular-nums leading-none tracking-tight">
      {text}
    </div>
  )
}

function MiniBody({ card }: { card: EvaluatedCard }) {
  const shape = valueShape(card.value)

  // Trend / series → hero + sparkline.
  const series = firstSeries(card)
  if (shape === 'series' || (series && series.length > 1)) {
    const values = series ? series.map((p) => p.value) : []
    return (
      <div className="flex flex-1 flex-col justify-between gap-3">
        <Hero card={card} />
        {values.length > 1 ? (
          <Sparkline values={values} tone="accent" height={34} fill />
        ) : null}
      </div>
    )
  }

  // Breakdown / comparison table → total + a thin split bar.
  const table = firstTable(card)
  if (shape === 'table' && table) {
    const rows = table.rows
      .map((r, i) => {
        const label = String(r[table.columns[0]?.key] ?? '')
        const valueKey = table.columns.find((col) => col.kind === 'number')?.key
        const value = valueKey ? Number(r[valueKey]) || 0 : 0
        return { label, value, color: categoryColor(i) }
      })
      .filter((r) => r.value > 0)
    const total = rows.reduce((s, r) => s + r.value, 0)
    return (
      <div className="flex flex-1 flex-col justify-between gap-3">
        <div className="uk-nums text-[1.4rem] font-semibold tabular-nums">
          {formatScalar(
            total,
            card.format === 'number' ? 'currency' : card.format,
          )}
        </div>
        <div className="space-y-1.5">
          <StackedBar segments={rows} height={8} />
          {rows[0] ? (
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span className="truncate">{rows[0].label}</span>
              <span className="uk-nums tabular-nums">
                {formatScalar(rows[0].value, 'currency')}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  // Entity list → top one or two rows.
  const entities = firstEntityList(card)
  if (shape === 'entity-list' && entities?.length) {
    const top = entities.slice(0, 2)
    return (
      <div className="flex flex-1 flex-col justify-end gap-2">
        {top.map((e) => (
          <div key={e.id} className="flex items-center gap-2">
            <MerchantChip name={e.label} size={26} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {e.label}
            </span>
            <span className="uk-nums shrink-0 text-sm font-semibold tabular-nums">
              {formatScalar(e.value, 'currency')}
            </span>
          </div>
        ))}
        {entities.length > 2 ? (
          <span className="text-muted-foreground text-xs">
            +{entities.length - 2} more
          </span>
        ) : null}
      </div>
    )
  }

  // Scalar / status / duration → just the hero.
  return (
    <div className="flex flex-1 items-end">
      <Hero card={card} />
    </div>
  )
}
