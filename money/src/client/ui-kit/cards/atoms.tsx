import { PiggyBank } from 'lucide-react'
import { type ReactNode } from 'react'
import { cn } from '@moldable-ai/ui'
import { useCountUp } from '../lib/motion'
import type { MoneyValueFormat } from '../lib/types'

/* ------------------------------------------------------------- micro label */

/** The uppercase 11–12px label above a value — the premium-fintech tell. */
export function MicroLabel({
  children,
  icon,
  className,
}: {
  children: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'text-muted-foreground flex min-w-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em]',
        className,
      )}
    >
      {icon ? (
        <span className="text-muted-foreground/80 shrink-0 [&>svg]:size-3.5">
          {icon}
        </span>
      ) : null}
      <span className="truncate">{children}</span>
    </div>
  )
}

/* -------------------------------------------------------------- hero value */

interface HeroParts {
  /** A full-size, legible leading sign ('-' for negatives). */
  sign: string
  /** The de-emphasized currency symbol. */
  symbol: string
  intPart: string
  fracPart: string
  trail: string
}

function heroParts(value: number, format: MoneyValueFormat): HeroParts {
  if (!Number.isFinite(value))
    return { sign: '', symbol: '', intPart: '—', fracPart: '', trail: '' }

  if (format === 'percent') {
    const pct = value * 100
    const decimals =
      Math.abs(pct) > 0 && Math.abs(pct) < 10 && !Number.isInteger(pct) ? 1 : 0
    const rounded = Number(Math.abs(pct).toFixed(decimals))
    const sign = pct < 0 && rounded > 0 ? '-' : ''
    const [i, f] = rounded.toFixed(decimals).split('.')
    return {
      sign,
      symbol: '',
      intPart: i,
      fracPart: f ? `.${f}` : '',
      trail: '%',
    }
  }

  const isCurrency = format === 'currency'
  const compact =
    format === 'compact' || (isCurrency && Math.abs(value) >= 1_000_000)
  const showCents =
    isCurrency && Math.abs(value) < 1000 && !Number.isInteger(value)
  const parts = new Intl.NumberFormat('en-US', {
    style: isCurrency ? 'currency' : 'decimal',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : showCents ? 2 : 0,
    minimumFractionDigits: showCents ? 2 : 0,
  }).formatToParts(value)

  let sign = ''
  let symbol = ''
  let intPart = ''
  let fracPart = ''
  let trail = ''
  for (const p of parts) {
    if (p.type === 'minusSign' || p.type === 'plusSign') sign += p.value
    else if (p.type === 'currency') symbol += p.value
    else if (p.type === 'integer' || p.type === 'group') intPart += p.value
    else if (p.type === 'decimal' || p.type === 'fraction') fracPart += p.value
    else if (
      p.type === 'compact' ||
      p.type === 'unit' ||
      p.type === 'percentSign'
    )
      trail += p.value
  }
  // Drop a negative sign that survives rounding to zero (avoids "-$0").
  if (
    sign === '-' &&
    intPart === '0' &&
    (!fracPart || /^[.,]0*$/.test(fracPart))
  )
    sign = ''
  return { sign, symbol, intPart, fracPart, trail }
}

const HERO_SIZES = {
  hero: 'text-[clamp(2.4rem,5vw,3.4rem)] leading-[1.02]',
  card: 'text-[1.9rem] leading-[1.05]',
  inline: 'text-xl leading-tight',
} as const

/**
 * The hero number. Currency symbol + cents + units render dimmer/smaller so the
 * integer dollars dominate. Tabular, semibold, tight tracking, optional count-up.
 */
export function HeroValue({
  value,
  format,
  size = 'card',
  countUp = false,
  tone,
  className,
}: {
  value: number
  format: MoneyValueFormat
  size?: keyof typeof HERO_SIZES
  countUp?: boolean
  tone?: 'positive' | 'negative'
  className?: string
}) {
  const animated = useCountUp(value, 850, countUp)
  const shown = countUp ? animated : value
  const { sign, symbol, intPart, fracPart, trail } = heroParts(shown, format)
  const toneClass =
    tone === 'positive'
      ? 'text-success'
      : tone === 'negative'
        ? 'text-destructive'
        : 'text-foreground'

  return (
    <div
      className={cn(
        'uk-nums flex items-baseline font-semibold tracking-tight',
        HERO_SIZES[size],
        toneClass,
        className,
      )}
    >
      {sign ? <span>{sign}</span> : null}
      {symbol ? (
        <span className="text-muted-foreground mr-[0.03em] text-[0.56em]">
          {symbol}
        </span>
      ) : null}
      <span>{intPart}</span>
      {fracPart ? (
        <span className="text-muted-foreground text-[0.62em]">{fracPart}</span>
      ) : null}
      {trail ? (
        <span className="text-muted-foreground ml-[0.06em] text-[0.62em]">
          {trail}
        </span>
      ) : null}
    </div>
  )
}

/* --------------------------------------------------------- drawdown state */

/**
 * The "living off savings" presentation for a savings-rate card when there's no
 * meaningful income — the monthly burn, framed calmly, instead of a nonsensical
 * "-653%". Pairs with the Runway card ("N months left").
 */
export function DrawdownState({
  monthlyBurn,
  center = false,
}: {
  monthlyBurn: number
  center?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5',
        center ? 'items-center py-2 text-center' : 'my-auto',
      )}
    >
      <span className="bg-muted text-muted-foreground inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium">
        <PiggyBank className="size-3" /> Living off savings
      </span>
      <HeroValue value={Math.abs(monthlyBurn)} format="currency" size="card" />
      <span className="text-muted-foreground text-xs">
        drawn from savings · / mo
      </span>
    </div>
  )
}

/* ----------------------------------------------------------- secondary stat */

/** A small label → value pair for the secondary stat row at the card foot. */
export function SecondaryStat({
  label,
  value,
  tone,
  className,
}: {
  label: string
  value: ReactNode
  tone?: 'positive' | 'negative' | 'muted'
  className?: string
}) {
  const valueTone =
    tone === 'positive'
      ? 'text-success'
      : tone === 'negative'
        ? 'text-destructive'
        : 'text-foreground/90'
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', className)}>
      <span className="text-muted-foreground/80 truncate text-[11px] font-medium uppercase tracking-wide">
        {label}
      </span>
      <span className={cn('uk-nums text-sm font-medium', valueTone)}>
        {value}
      </span>
    </div>
  )
}

/* -------------------------------------------------------------- status dot */

export type StatusTone = 'success' | 'warning' | 'destructive' | 'neutral'

const STATUS_BG: Record<StatusTone, string> = {
  success: 'var(--success)',
  warning: 'var(--warning)',
  destructive: 'var(--destructive)',
  neutral: 'var(--muted-foreground)',
}

export function StatusDot({
  tone = 'neutral',
  size = 8,
}: {
  tone?: StatusTone
  size?: number
}) {
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, backgroundColor: STATUS_BG[tone] }}
      aria-hidden
    />
  )
}

/** A rounded pill used for runway/duration parts and timeframe-ish chips. */
export function ValuePill({
  children,
  active,
  className,
}: {
  children: ReactNode
  active?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'uk-nums inline-flex items-center rounded-full px-3 py-1 text-sm font-medium',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted/70 text-foreground/90',
        className,
      )}
    >
      {children}
    </span>
  )
}
