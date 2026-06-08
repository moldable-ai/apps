import { durationParts, formatScalar, isDurationValue } from '../../lib/format'
import { CardShell } from '../CardShell'
import { DeltaBadge } from '../DeltaBadge'
import { MerchantChip } from '../MerchantChip'
import { HeroValue, MicroLabel, ValuePill } from '../atoms'
import {
  firstEntityList,
  humanizeKey,
  iconForCard,
  scalarOrNull,
  scalarSecondaries,
} from '../helpers'
import { type RendererProps, shellPropsFor } from '../renderer-types'

/**
 * A forecast card. Three flavors keyed off value shape / format:
 *  • duration → runway pills ("4 years · 3 months · 2 weeks")
 *  • freedom age (number) → big age + "years old"
 *  • currency → projected amount + caption + optional surprise list
 */
export function ForecastCard({
  card,
  index,
  delta,
  state,
  onRetry,
  action,
}: RendererProps) {
  const shell = {
    ...shellPropsFor(card, index, state, onRetry, action),
    icon: iconForCard(card),
  }

  const durationDays = isDurationValue(card.value)
    ? card.value.days
    : card.format === 'duration'
      ? scalarOrNull(card.value)
      : null

  // ---- runway / duration ----
  if (durationDays !== null && Number.isFinite(durationDays)) {
    const parts = durationParts(durationDays)
    return (
      <CardShell {...shell}>
        <div className="my-auto flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {parts.map((p) => (
              <ValuePill key={p.unit} active>
                {p.label}
              </ValuePill>
            ))}
          </div>
          {delta ? (
            <DeltaBadge
              value={delta.value}
              label={delta.label}
              format="number"
              polarity={delta.inverse ? 'expense' : 'asset'}
              caption={delta.caption ?? 'vs last month'}
            />
          ) : (
            <span className="text-muted-foreground text-sm">
              until cash runs out at current burn
            </span>
          )}
        </div>
      </CardShell>
    )
  }

  // ---- freedom age ----
  const isAge =
    /freedom|independence|age|fire/i.test(`${card.id} ${card.title}`) &&
    card.format === 'number'
  if (isAge) {
    const age = scalarOrNull(card.value) ?? 0
    const cappedAgeLabel = card.displayValue.includes('+')
      ? card.displayValue
      : null
    return (
      <CardShell {...shell}>
        <div className="my-auto flex flex-col gap-2">
          <div className="flex items-baseline gap-2">
            {cappedAgeLabel ? (
              <div className="uk-nums text-foreground text-[3.3rem] font-semibold leading-none tracking-tight">
                {cappedAgeLabel}
              </div>
            ) : (
              <HeroValue value={age} format="number" size="hero" countUp />
            )}
            <span className="text-muted-foreground text-lg font-medium">
              years old
            </span>
          </div>
          {delta ? (
            <DeltaBadge
              value={delta.value}
              label={delta.label}
              format="number"
              polarity={delta.inverse ? 'expense' : 'asset'}
              caption={delta.caption ?? 'sooner than last month'}
            />
          ) : (
            <span className="text-muted-foreground text-sm">
              projected financial independence
            </span>
          )}
        </div>
      </CardShell>
    )
  }

  // ---- projected amount (obligations, spending impact) ----
  const hero = scalarOrNull(card.value) ?? 0
  const surprises = (firstEntityList(card) ?? []).slice(0, 3)
  const secs = scalarSecondaries(card).slice(0, 2)
  return (
    <CardShell {...shell}>
      <div className="flex flex-col gap-1.5">
        <HeroValue value={hero} format={card.format} size="card" countUp />
        {card.description ? (
          <span className="text-muted-foreground text-sm">
            {card.description}
          </span>
        ) : delta ? (
          <DeltaBadge
            value={delta.value}
            format={delta.format ?? card.format}
            label={delta.label}
            polarity={delta.inverse ? 'expense' : 'asset'}
            caption={delta.caption}
          />
        ) : null}
      </div>

      {surprises.length ? (
        <div className="mt-3.5">
          <MicroLabel className="mb-1.5">Largest upcoming</MicroLabel>
          <ul className="divide-border/50 -mx-1 divide-y">
            {surprises.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-1 py-2">
                <MerchantChip name={e.label} size={30} />
                <span className="text-foreground/90 min-w-0 flex-1 truncate text-sm">
                  {e.label}
                </span>
                <span className="uk-nums text-sm font-medium">
                  {formatScalar(e.value, 'currency')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : secs.length ? (
        <div className="border-border/50 mt-3.5 flex flex-wrap gap-x-6 gap-y-2 border-t pt-3">
          {secs.map((s) => (
            <div key={s.key} className="flex flex-col gap-0.5">
              <span className="text-muted-foreground/80 text-[11px] font-medium uppercase tracking-wide">
                {humanizeKey(s.key)}
              </span>
              <span className="uk-nums text-sm font-medium">
                {formatScalar(s.value, 'currency')}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </CardShell>
  )
}
