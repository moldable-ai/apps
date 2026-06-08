import { cn } from '@moldable-ai/ui'
import { formatMoney, formatNumber, formatPercent } from '../lib/format'
import type { MoneyValueFormat } from '../lib/types'

export type Polarity = 'asset' | 'expense'

interface DeltaBadgeProps {
  /** Signed change amount. */
  value: number
  /** Format for the magnitude (default currency). */
  format?: MoneyValueFormat
  /** Optional percent change shown in parentheses. */
  ratio?: number
  /** asset: up=good (green). expense: up=bad (red). */
  polarity?: Polarity
  /** Pre-formatted magnitude label (overrides `format`). */
  label?: string
  /** Trailing caption, e.g. "vs last month". */
  caption?: string
  /** Pill chrome — reserve for hero numbers only. */
  pill?: boolean
  /** Subdued muted-parens style (matches a quiet "+$721" look). */
  muted?: boolean
  className?: string
}

const UP = '▲' // ▲
const DOWN = '▼' // ▼

function magnitude(
  value: number,
  format: MoneyValueFormat,
  label?: string,
): string {
  if (label) return label
  const abs = Math.abs(value)
  switch (format) {
    case 'currency':
      return formatMoney(abs)
    case 'percent':
      return formatPercent(abs)
    default:
      return formatNumber(abs)
  }
}

/**
 * A delta annotation that decouples *direction* (▲/▼ from the numeric sign)
 * from *sentiment* (color from asset/expense polarity) — the thing generic
 * dashboards get wrong. Color is never the sole signal; the glyph always rides along.
 */
export function DeltaBadge({
  value,
  format = 'currency',
  ratio,
  polarity = 'asset',
  label,
  caption,
  pill = false,
  muted = false,
  className,
}: DeltaBadgeProps) {
  const flat = value === 0 || !Number.isFinite(value)
  const up = value > 0
  const good = polarity === 'asset' ? up : !up
  const tone = flat ? 'neutral' : good ? 'positive' : 'negative'

  const toneText = flat
    ? 'text-muted-foreground'
    : tone === 'positive'
      ? 'text-success'
      : 'text-destructive'
  const glyph = flat ? '' : up ? UP : DOWN
  const mag = magnitude(value, format, label)
  const ratioText =
    ratio !== undefined && Number.isFinite(ratio)
      ? ` (${formatPercent(Math.abs(ratio))})`
      : ''
  // Muted callers use a +/- sign char (no glyph); colored callers use the glyph
  // and never a redundant sign char.
  const signChar = muted && !flat ? (up ? '+' : '-') : ''

  const inner = (
    <span className="uk-nums inline-flex items-baseline gap-1 font-medium">
      {!muted && glyph ? (
        <span className={toneText} style={{ fontSize: '0.72em' }}>
          {glyph}
        </span>
      ) : null}
      <span
        className={
          muted ? 'text-muted-foreground' : pill ? 'text-foreground' : toneText
        }
      >
        {signChar}
        {mag}
        {ratioText}
      </span>
    </span>
  )

  if (pill && !muted) {
    const pillBg =
      tone === 'positive'
        ? 'color-mix(in oklch, var(--success) 15%, transparent)'
        : tone === 'negative'
          ? 'color-mix(in oklch, var(--destructive) 15%, transparent)'
          : 'color-mix(in oklch, var(--muted-foreground) 15%, transparent)'
    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
          style={{ backgroundColor: pillBg }}
        >
          {inner}
        </span>
        {caption ? (
          <span className="text-muted-foreground text-xs">{caption}</span>
        ) : null}
      </span>
    )
  }

  return (
    <span
      className={cn('inline-flex items-baseline gap-1.5 text-sm', className)}
    >
      {inner}
      {caption ? (
        <span className="text-muted-foreground text-xs">{caption}</span>
      ) : null}
    </span>
  )
}
