import { Badge, cn } from '@moldable-ai/ui'
import { formatPercent, formatScalar } from '../../lib/format'
import type { EntityListEntity } from '../../lib/types'
import { CardShell } from '../CardShell'
import { DeltaBadge } from '../DeltaBadge'
import { HeroValue, MicroLabel, SecondaryStat } from '../atoms'
import {
  firstEntityList,
  humanizeKey,
  iconForCard,
  scalarOrNull,
  scalarSecondaries,
} from '../helpers'
import { type RendererProps, shellPropsFor } from '../renderer-types'

function aprOf(e: EntityListEntity): number | undefined {
  const v = e.fields?.apr
  return typeof v === 'number' ? v : undefined
}

/** APR color carries signal: high = destructive, mid = warning, low = muted. */
function aprTone(apr: number): string {
  return apr >= 0.2
    ? 'text-destructive'
    : apr >= 0.1
      ? 'text-warning'
      : 'text-muted-foreground'
}

/**
 * An optimizer card (debt payoff, tax sheltering): a hero target value, a
 * strategy chip, and a ranked priority list when one is available.
 */
export function OptimizerCard({
  card,
  index,
  delta,
  state,
  onRetry,
  action,
}: RendererProps) {
  const hero = scalarOrNull(card.value)
  const ranked = (firstEntityList(card) ?? []).slice(0, 4)
  const secs = scalarSecondaries(card).slice(0, 2)
  const strategy = card.visualization

  return (
    <CardShell
      {...shellPropsFor(card, index, state, onRetry, action)}
      icon={iconForCard(card)}
      footer={
        secs.length && !ranked.length
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
      <div className="flex flex-col gap-1.5">
        {hero !== null ? (
          <HeroValue value={hero} format={card.format} size="card" countUp />
        ) : (
          <div className="uk-nums text-[1.9rem] font-semibold">
            {card.displayValue}
          </div>
        )}
        <div className="flex items-center gap-2">
          {strategy ? (
            <Badge variant="secondary" className="font-medium">
              {strategy}
            </Badge>
          ) : null}
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
      </div>

      {ranked.length ? (
        <div className="mt-3.5">
          <MicroLabel className="mb-1.5">Payoff priority</MicroLabel>
          <ol className="divide-border/50 -mx-1 divide-y">
            {ranked.map((e, i) => (
              <li key={e.id} className="flex items-center gap-3 px-1 py-2">
                <span className="bg-muted text-muted-foreground flex size-5 shrink-0 items-center justify-center rounded-md text-xs font-semibold">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-foreground/90 truncate text-sm font-medium">
                    {e.label}
                  </div>
                </div>
                {aprOf(e) !== undefined ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      'uk-nums h-5 px-1.5 text-[10px]',
                      aprTone(aprOf(e) as number),
                    )}
                  >
                    {formatPercent(aprOf(e) as number)} APR
                  </Badge>
                ) : null}
                <div className="uk-nums shrink-0 text-sm font-medium">
                  {formatScalar(e.value, 'currency')}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </CardShell>
  )
}
