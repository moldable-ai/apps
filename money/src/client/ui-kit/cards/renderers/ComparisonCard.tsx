import { categoryColor } from '../../lib/colors'
import { formatScalar } from '../../lib/format'
import { Legend, type LegendItem, StackedBar } from '../../charts'
import { CardShell } from '../CardShell'
import { HeroValue } from '../atoms'
import {
  humanizeKey,
  iconForCard,
  scalarOrNull,
  scalarSecondaries,
} from '../helpers'
import { type RendererProps, shellPropsFor } from '../renderer-types'

interface Part {
  label: string
  value: number
}

/**
 * A comparison card (needs vs wants, sheltered vs unsheltered, this vs last):
 * a hero total split into a labeled stacked bar + legend.
 */
export function ComparisonCard({
  card,
  index,
  state,
  onRetry,
  action,
}: RendererProps) {
  const primary = scalarOrNull(card.value) ?? 0
  const secs = scalarSecondaries(card).filter((s) => s.value > 0)

  // If two+ secondaries exist, treat them as the parts; otherwise split the
  // primary against its single secondary.
  let parts: Part[]
  if (secs.length >= 2) {
    parts = secs.map((s) => ({ label: humanizeKey(s.key), value: s.value }))
  } else if (secs.length === 1) {
    parts = [
      { label: 'This metric', value: primary },
      { label: humanizeKey(secs[0].key), value: secs[0].value },
    ]
  } else {
    parts = [{ label: 'Total', value: primary }]
  }

  const total = parts.reduce((sum, p) => sum + p.value, 0)
  const segments = parts.map((p, i) => ({
    label: p.label,
    value: p.value,
    color: categoryColor(i),
  }))
  const legend: LegendItem[] = segments.map((s) => ({
    label: s.label,
    color: s.color,
    value: formatScalar(s.value, 'currency'),
    percent: total ? s.value / total : 0,
  }))

  return (
    <CardShell
      {...shellPropsFor(card, index, state, onRetry, action)}
      icon={iconForCard(card)}
    >
      <div className="flex flex-col gap-3">
        <HeroValue
          value={total}
          format={card.format === 'percent' ? 'currency' : card.format}
          size="card"
          countUp
        />
        <StackedBar segments={segments} height={12} />
        <Legend items={legend} />
      </div>
    </CardShell>
  )
}
