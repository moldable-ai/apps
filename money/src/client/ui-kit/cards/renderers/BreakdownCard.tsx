import { categoryColor } from '../../lib/colors'
import { formatScalar } from '../../lib/format'
import type { FormulaTableValue } from '../../lib/types'
import {
  type BarItem,
  BarList,
  Donut,
  Legend,
  type LegendItem,
  resolveSegments,
} from '../../charts'
import { CardShell } from '../CardShell'
import { HeroValue, MicroLabel } from '../atoms'
import { firstTable, iconForCard, scalarOrNull } from '../helpers'
import { type RendererProps, shellPropsFor } from '../renderer-types'

interface Row {
  label: string
  value: number
  percent?: number
  /** Raw category key for drill-down (filter transactions by this). */
  key?: string
}

/**
 * Title-case a noisy Plaid category like "OTHER OTHER_OTHER" → "Other".
 * Leaves already-clean, mixed-case labels untouched ("US Stocks", "iCloud+").
 */
function prettyLabel(raw: string): string {
  const looksRaw = /_/.test(raw) || raw === raw.toUpperCase()
  if (!looksRaw) return raw
  const words = raw
    .replace(/_/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  const seen = new Set<string>()
  const deduped = words.filter((w) =>
    seen.has(w) ? false : (seen.add(w), true),
  )
  const out = deduped
    .slice(0, 3)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
  return out.join(' ') || raw
}

function extractRows(table: FormulaTableValue): Row[] {
  const valueCol =
    table.columns.find((c) => c.key === 'value') ??
    table.columns.find((c) => c.kind === 'number')
  const labelCol =
    table.columns.find((c) => c.key === 'label') ??
    table.columns.find((c) => c.kind === 'string')
  const pctCol = table.columns.find((c) => c.kind === 'percent')
  return table.rows
    .map((r) => ({
      label: prettyLabel(String(r[labelCol?.key ?? 'label'] ?? r.key ?? '—')),
      value: Number(r[valueCol?.key ?? 'value'] ?? 0),
      percent: pctCol ? Number(r[pctCol.key] ?? 0) : undefined,
      key: r.key !== undefined ? String(r.key) : undefined,
    }))
    .filter((r) => Number.isFinite(r.value) && r.value > 0)
    .sort((a, b) => b.value - a.value)
}

/**
 * A table-valued card. Few categories → a thin allocation donut + legend; many
 * categories → a ranked bar list (top 6 + a bucketed "Other").
 */
export function BreakdownCard({
  card,
  index,
  state,
  onRetry,
  action,
  onDrillRow,
}: RendererProps) {
  const table = firstTable(card)
  const rows = table ? extractRows(table) : []
  const total = rows.reduce((sum, r) => sum + r.value, 0)
  const useDonut = rows.length > 0 && rows.length <= 6

  return (
    <CardShell
      {...shellPropsFor(card, index, state, onRetry, action)}
      icon={iconForCard(card)}
    >
      {rows.length === 0 ? (
        <HeroValue
          value={scalarOrNull(card.value) ?? 0}
          format={card.format}
          size="card"
        />
      ) : useDonut ? (
        <DonutBreakdown rows={rows} total={total} />
      ) : (
        <BarBreakdown rows={rows} total={total} onDrillRow={onDrillRow} />
      )}
    </CardShell>
  )
}

function DonutBreakdown({ rows, total }: { rows: Row[]; total: number }) {
  const segments = resolveSegments(
    rows.map((r) => ({ label: r.label, value: r.value })),
    6,
  )
  const legend: LegendItem[] = segments.map((s, i) => ({
    label: s.label,
    color: s.color ?? categoryColor(i),
    value: formatScalar(s.value, 'currency'),
    percent: total ? s.value / total : 0,
  }))
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <Donut
        segments={segments}
        size={150}
        center={
          <>
            <div className="uk-nums text-xl font-semibold tracking-tight">
              {formatScalar(total, 'currency')}
            </div>
            <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
              Total
            </div>
          </>
        }
      />
      <Legend items={legend} className="min-w-0 flex-1" />
    </div>
  )
}

function BarBreakdown({
  rows,
  total,
  onDrillRow,
}: {
  rows: Row[]
  total: number
  onDrillRow?: (key: string, label: string) => void
}) {
  // Summary card: show the top few + a bucketed "Other" so it fits its tile;
  // the full breakdown is one tap away via the drilldown.
  const top = rows.slice(0, 4)
  const restValue = rows.slice(4).reduce((sum, r) => sum + r.value, 0)
  const items: BarItem[] = top.map((r) => ({
    label: r.label,
    value: r.value,
    displayValue: formatScalar(r.value, 'currency'),
    caption:
      r.percent !== undefined ? `${Math.round(r.percent * 100)}%` : undefined,
    key: r.key,
  }))
  if (restValue > 0) {
    // The bucketed "Other" rolls up several categories → not a single drill key.
    items.push({
      label: 'Other',
      value: restValue,
      displayValue: formatScalar(restValue, 'currency'),
      color: 'color-mix(in oklch, var(--muted-foreground) 45%, transparent)',
    })
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <MicroLabel>Total spend</MicroLabel>
        <span className="uk-nums text-lg font-semibold tracking-tight">
          {formatScalar(total, 'currency')}
        </span>
      </div>
      <BarList
        items={items}
        colorize
        onItemClick={
          onDrillRow
            ? (item) => {
                if (item.key) onDrillRow(item.key, item.label)
              }
            : undefined
        }
      />
    </div>
  )
}
