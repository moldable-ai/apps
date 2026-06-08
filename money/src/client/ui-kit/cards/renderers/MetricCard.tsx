import { cn } from '@moldable-ai/ui'
import { formatScalar } from '../../lib/format'
import { Sparkline } from '../../charts'
import { CardShell } from '../CardShell'
import { DeltaBadge } from '../DeltaBadge'
import { DrawdownState, HeroValue, SecondaryStat } from '../atoms'
import {
  drawdownInfo,
  firstSeries,
  humanizeKey,
  iconForCard,
  scalarOrNull,
  scalarSecondaries,
  seriesValues,
} from '../helpers'
import {
  type RendererProps,
  seriesTone,
  shellPropsFor,
} from '../renderer-types'

/**
 * The default scalar card: an uppercase label, a hero number, an optional
 * polarity-aware delta, and a mute trend sparkline when a series is available.
 */
export function MetricCard({
  card,
  index,
  delta,
  state,
  onRetry,
  action,
}: RendererProps) {
  const n = scalarOrNull(card.value)
  const drawdown = drawdownInfo(card)
  const series = firstSeries(card)
  const values = series ? seriesValues(series) : null
  const hasSpark = Boolean(values && values.length > 1) && !drawdown
  const secs = scalarSecondaries(card).slice(0, 3)

  return (
    <CardShell
      {...shellPropsFor(card, index, state, onRetry, action)}
      icon={iconForCard(card)}
      footer={
        !drawdown && secs.length
          ? secs.map((s) => (
              <SecondaryStat
                key={s.key}
                label={humanizeKey(s.key)}
                value={formatScalar(s.value, card.format)}
              />
            ))
          : undefined
      }
    >
      {drawdown ? (
        <DrawdownState monthlyBurn={drawdown.monthlyBurn} />
      ) : (
        <div className={cn('flex flex-col gap-1.5', !hasSpark && 'my-auto')}>
          {n !== null ? (
            <HeroValue value={n} format={card.format} size="card" countUp />
          ) : (
            <div className="uk-nums text-[1.9rem] font-semibold tracking-tight">
              {card.displayValue}
            </div>
          )}
          {delta ? (
            <DeltaBadge
              value={delta.value}
              format={delta.format ?? card.format}
              label={delta.label}
              polarity={delta.inverse ? 'expense' : 'asset'}
              caption={delta.caption}
            />
          ) : null}
        </div>
      )}

      {hasSpark ? (
        <Sparkline
          values={values as number[]}
          tone={seriesTone(values as number[], delta?.inverse)}
          height={56}
          fill
          className="mt-auto pt-4"
        />
      ) : null}
    </CardShell>
  )
}
