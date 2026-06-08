import { formatCount, formatPercent, formatScalar } from '../../lib/format'
import { RingGauge } from '../../charts'
import { CardShell } from '../CardShell'
import {
  DrawdownState,
  HeroValue,
  SecondaryStat,
  StatusDot,
  type StatusTone,
} from '../atoms'
import {
  drawdownInfo,
  humanizeKey,
  iconForCard,
  scalarOrNull,
  scalarSecondaries,
} from '../helpers'
import { type RendererProps, shellPropsFor } from '../renderer-types'

function toneForKey(key: string, index: number): StatusTone {
  if (/required|warning|overdue|alert|risk|over/i.test(key))
    return 'destructive'
  if (/suggest|pending|review|soon|watch/i.test(key)) return 'warning'
  if (/done|reviewed|complete|cleared|ok|covered|saved/i.test(key))
    return 'success'
  return (['destructive', 'warning', 'success'] as StatusTone[])[index % 3]
}

/** Health-as-percent → a ring gauge; status counts → a row of dotted stats. */
export function StatusCard({
  card,
  index,
  state,
  onRetry,
  action,
}: RendererProps) {
  // Accept a 0..1 fraction or a 0..100 percent; normalize to a fraction.
  const rawPct = card.format === 'percent' ? scalarOrNull(card.value) : null
  const pct =
    rawPct === null ? null : Math.abs(rawPct) > 1.5 ? rawPct / 100 : rawPct
  const secs = scalarSecondaries(card)

  // No meaningful income → reframe to the drawdown story instead of a -653% ring.
  const drawdown = drawdownInfo(card)
  if (drawdown) {
    return (
      <CardShell
        {...shellPropsFor(card, index, state, onRetry, action)}
        icon={iconForCard(card)}
      >
        <DrawdownState monthlyBurn={drawdown.monthlyBurn} center />
      </CardShell>
    )
  }

  if (pct !== null) {
    const negative = pct < 0
    const tone = negative
      ? 'var(--destructive)'
      : pct >= 0.2
        ? 'var(--success)'
        : pct >= 0.1
          ? 'var(--warning)'
          : 'var(--destructive)'
    return (
      <CardShell
        {...shellPropsFor(card, index, state, onRetry, action)}
        icon={iconForCard(card)}
        footer={secs.slice(0, 2).map((s) => (
          <SecondaryStat
            key={s.key}
            label={humanizeKey(s.key)}
            value={formatScalar(s.value, 'currency')}
          />
        ))}
      >
        <div className="flex flex-1 items-center justify-center">
          <RingGauge
            value={Math.min(1, Math.abs(pct))}
            color={tone}
            size={116}
            center={
              <>
                <div
                  className={`uk-nums text-2xl font-semibold tracking-tight ${negative ? 'text-destructive' : ''}`}
                >
                  {formatPercent(pct)}
                </div>
                <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                  {negative ? 'deficit' : 'saved'}
                </div>
              </>
            }
          />
        </div>
      </CardShell>
    )
  }

  return (
    <CardShell
      {...shellPropsFor(card, index, state, onRetry, action)}
      icon={iconForCard(card)}
    >
      {secs.length ? (
        <div className="grid grid-cols-3 gap-3 py-1">
          {secs.slice(0, 3).map((s, i) => (
            <div key={s.key} className="flex flex-col gap-1.5">
              <StatusDot tone={toneForKey(s.key, i)} size={9} />
              <span className="uk-nums text-2xl font-semibold tracking-tight">
                {formatCount(s.value)}
              </span>
              <span className="text-muted-foreground text-xs leading-tight">
                {humanizeKey(s.key)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <HeroValue
          value={scalarOrNull(card.value) ?? 0}
          format={card.format}
          size="card"
          countUp
        />
      )}
    </CardShell>
  )
}
