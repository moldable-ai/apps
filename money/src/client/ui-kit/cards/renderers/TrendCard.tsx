import { useMemo, useState } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@moldable-ai/ui'
import { HERO_GRADIENT } from '../../lib/colors'
import {
  formatCompactNumber,
  formatMoney,
  formatPercent,
} from '../../lib/format'
import type { MoneyValueFormat } from '../../lib/types'
import { LineChart, type LinePoint } from '../../charts'
import { CardShell } from '../CardShell'
import { DeltaBadge } from '../DeltaBadge'
import { DrawdownState, HeroValue } from '../atoms'
import {
  drawdownInfo,
  firstSeries,
  iconForCard,
  scalarOrNull,
  seriesValues,
} from '../helpers'
import { type RendererProps, shellPropsFor } from '../renderer-types'

const RANGES: Array<{ id: string; frac: number }> = [
  { id: '1M', frac: 0.18 },
  { id: '3M', frac: 0.35 },
  { id: '6M', frac: 0.6 },
  { id: 'YTD', frac: 0.82 },
  { id: '1Y', frac: 1 },
]

function miniFormatter(format: MoneyValueFormat): (n: number) => string {
  if (format === 'currency') return (n) => formatMoney(n, { compact: true })
  if (format === 'percent') return (n) => formatPercent(n)
  return (n) => formatCompactNumber(n)
}

function isExpenseCard(id: string, title: string): boolean {
  return /expense|spend|debt|burn|cost|subscription/i.test(`${id} ${title}`)
}

/**
 * The signature trend card: a hero value, a polarity-aware delta, the gradient
 * line chart with min/max anchors + endpoint, a timeframe switch, and cursor
 * scrubbing that crossfades the hero value to the hovered point.
 */
export function TrendCard({
  card,
  index,
  delta,
  state,
  onRetry,
  action,
}: RendererProps) {
  const series = firstSeries(card)
  const allValues = series ? seriesValues(series) : []
  const [range, setRange] = useState('1Y')
  const [scrub, setScrub] = useState<LinePoint | null>(null)

  const windowed = useMemo(() => {
    if (!series) return { values: [] as number[], labels: [] as string[] }
    const frac = RANGES.find((r) => r.id === range)?.frac ?? 1
    const count = Math.max(2, Math.round(series.length * frac))
    const slice = series.slice(-count)
    return {
      values: slice.map((p) => p.value),
      labels: slice.map((p) => p.label),
    }
  }, [series, range])

  const inverse = isExpenseCard(card.id, card.title)
  const headline = scrub
    ? scrub.value
    : (scalarOrNull(card.value) ?? allValues[allValues.length - 1] ?? 0)
  // The hero trend keeps the signature orange→violet gradient; sentiment is
  // carried by the delta pill, not the line color.
  const gradient = HERO_GRADIENT

  // delta from the series when not provided explicitly
  const seriesDelta =
    delta ??
    (allValues.length > 1
      ? {
          value: allValues[allValues.length - 1] - allValues[0],
          format: card.format,
          inverse,
        }
      : undefined)
  const rawRatio =
    allValues.length > 1 && allValues[0] !== 0
      ? (allValues[allValues.length - 1] - allValues[0]) /
        Math.abs(allValues[0])
      : undefined
  // Avoid a confusing double-percent on percent metrics, and suppress a
  // near-total ratio (99.7% → "100%") that usually signals a data gap.
  const ratio =
    !delta &&
    card.format !== 'percent' &&
    rawRatio !== undefined &&
    Math.abs(rawRatio) < 0.995
      ? rawRatio
      : undefined

  // No meaningful income → reframe a "-653%" savings rate to the burn instead.
  const drawdown = drawdownInfo(card)
  if (drawdown) {
    return (
      <CardShell
        {...shellPropsFor(card, index, state, onRetry, action)}
        icon={iconForCard(card)}
      >
        <DrawdownState monthlyBurn={drawdown.monthlyBurn} />
      </CardShell>
    )
  }

  return (
    <CardShell
      {...shellPropsFor(card, index, state, onRetry, action)}
      icon={iconForCard(card)}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5">
          <HeroValue
            value={headline}
            format={card.format}
            size="hero"
            countUp={!scrub}
          />
          {/* Fixed height so scrubbing (label ↔ delta pill) never reflows the
              card and shifts the chart under the cursor. */}
          <div className="flex min-h-[1.625rem] items-center">
            {scrub ? (
              <span className="text-muted-foreground text-xs">
                {scrub.label ?? ' '}
              </span>
            ) : seriesDelta ? (
              <DeltaBadge
                value={seriesDelta.value}
                format={seriesDelta.format ?? card.format}
                label={seriesDelta.label}
                ratio={ratio}
                polarity={seriesDelta.inverse ? 'expense' : 'asset'}
                caption={delta?.caption ?? 'over period'}
                pill
              />
            ) : (
              <span className="text-muted-foreground text-xs">&nbsp;</span>
            )}
          </div>
        </div>
      </div>

      {windowed.values.length > 1 ? (
        <LineChart
          className="mt-3"
          values={windowed.values}
          labels={windowed.labels}
          height={172}
          gradient={gradient}
          showMinMax
          showEndpoint
          format={miniFormatter(card.format)}
          onScrub={setScrub}
        />
      ) : (
        // Compact empty state — don't reserve full chart height when there's no
        // series yet, so the card stays short in the masonry.
        <div className="text-muted-foreground mt-2 text-xs">
          Not enough history to chart yet.
        </div>
      )}

      {series && series.length >= 6 ? (
        <ToggleGroup
          type="single"
          value={range}
          onValueChange={(v) => v && setRange(v)}
          variant="default"
          size="sm"
          className="mt-3 self-start"
        >
          {RANGES.map((r) => (
            <ToggleGroupItem
              key={r.id}
              value={r.id}
              className="uk-nums px-2.5 text-xs"
            >
              {r.id}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ) : null}
    </CardShell>
  )
}
