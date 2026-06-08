/**
 * Value formatting + runtime value-shape discrimination for the Money UI kit.
 *
 * The backend returns *typed values, not display strings* (per the formula PRD),
 * so the UI applies locale-aware formatting at render time. Renderers should
 * dispatch on these guards first, then fall back to a card's `format`/`kind`.
 */
import type {
  FormulaDateValue,
  FormulaDurationValue,
  FormulaEntityListValue,
  FormulaResultValue,
  FormulaSeriesValue,
  FormulaTableValue,
  MoneyValueFormat,
} from './types'

/* ------------------------------------------------------------------ guards */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

export function isSeriesValue(v: unknown): v is FormulaSeriesValue {
  return isRecord(v) && v.type === 'series' && Array.isArray(v.points)
}

export function isTableValue(v: unknown): v is FormulaTableValue {
  return isRecord(v) && v.type === 'table' && Array.isArray(v.rows)
}

export function isEntityListValue(v: unknown): v is FormulaEntityListValue {
  return isRecord(v) && v.type === 'entity-list' && Array.isArray(v.entities)
}

export function isDurationValue(v: unknown): v is FormulaDurationValue {
  return isRecord(v) && v.type === 'duration' && typeof v.days === 'number'
}

export function isDateValue(v: unknown): v is FormulaDateValue {
  return isRecord(v) && v.type === 'date' && typeof v.isoDate === 'string'
}

export function isScalarValue(v: unknown): v is number | string | boolean {
  return (
    typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean'
  )
}

/** Pull a plain number out of any value shape, when one is meaningful. */
export function asNumber(
  v: FormulaResultValue | undefined | null,
): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'boolean') return v ? 1 : 0
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^0-9.-]/g, ''))
    return Number.isFinite(n) ? n : null
  }
  if (isDurationValue(v)) return v.days
  if (isSeriesValue(v) && v.points.length)
    return v.points[v.points.length - 1].value
  return null
}

/* -------------------------------------------------------------- scalar fmt */

const DEFAULT_CURRENCY = 'USD'

export interface MoneyOptions {
  compact?: boolean
  /** 'auto' shows cents for small non-integers; true/false force it. */
  cents?: boolean | 'auto'
  signed?: boolean
  currency?: string
}

export function formatMoney(value: number, opts: MoneyOptions = {}): string {
  if (!Number.isFinite(value)) return '—'
  const {
    compact = false,
    cents = 'auto',
    signed = false,
    currency = DEFAULT_CURRENCY,
  } = opts
  const abs = Math.abs(value)
  const showCents =
    cents === 'auto' ? abs < 1000 && !Number.isInteger(value) : cents === true

  const fractionDigits = compact && abs >= 10000 ? 1 : showCents ? 2 : 0
  const fmt = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: compact && abs >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: showCents ? 2 : 0,
  })
  // Derive the sign from the ROUNDED magnitude so tiny negatives don't print "-$0".
  const factor = Math.pow(10, fractionDigits)
  const rounded = Math.round(value * factor) / factor
  const sign = rounded < 0 ? '-' : rounded > 0 && signed ? '+' : ''
  return `${sign}${fmt.format(Math.abs(rounded))}`
}

export function formatPercent(
  ratio: number,
  opts: { signed?: boolean; decimals?: number } = {},
): string {
  if (!Number.isFinite(ratio)) return '—'
  const pct = ratio * 100
  const abs = Math.abs(pct)
  const decimals =
    opts.decimals ?? (abs > 0 && abs < 10 && !Number.isInteger(pct) ? 1 : 0)
  const rounded = Number(abs.toFixed(decimals))
  const sign =
    pct < 0 && rounded > 0 ? '-' : rounded > 0 && opts.signed ? '+' : ''
  return `${sign}${rounded.toFixed(decimals)}%`
}

export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(
    value,
  )
}

export function formatNumber(
  value: number,
  opts: { signed?: boolean; decimals?: number } = {},
): string {
  if (!Number.isFinite(value)) return '—'
  const sign = value < 0 ? '-' : opts.signed ? '+' : ''
  return `${sign}${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: opts.decimals ?? 2,
  }).format(Math.abs(value))}`
}

export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatDate(
  iso: string,
  opts: Intl.DateTimeFormatOptions = {},
): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...opts,
  })
}

/**
 * Compact "time since" for sync/recency labels: "just now", "4m ago", "3h ago",
 * "2d ago", else a short date. The single source of truth for every
 * "Last synced …" / "Updated …" string (no more per-screen copies).
 */
export function timeAgo(iso?: string, now: number = Date.now()): string {
  if (!iso) return 'never'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'never'
  const secs = Math.max(0, Math.round((now - then) / 1000))
  if (secs < 45) return 'just now'
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(then).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

/* ------------------------------------------------------------------ durations */

export interface DurationPart {
  unit: 'year' | 'month' | 'week' | 'day'
  amount: number
  label: string
}

/** Break a day count into human-friendly year/month/week/day parts. */
export function durationParts(days: number, max = 3): DurationPart[] {
  if (!Number.isFinite(days)) return [{ unit: 'day', amount: 0, label: '—' }]
  if (days >= 365 * 30)
    return [{ unit: 'year', amount: 30, label: '30+ years' }]
  if (days > 0 && days < 1)
    return [{ unit: 'day', amount: 0, label: '< 1 day' }]
  let remaining = Math.max(0, Math.round(days))
  const out: DurationPart[] = []
  const units: Array<[DurationPart['unit'], number]> = [
    ['year', 365],
    ['month', 30],
    ['week', 7],
    ['day', 1],
  ]
  for (const [unit, size] of units) {
    if (remaining < size && out.length === 0 && unit !== 'day') continue
    const amount = Math.floor(remaining / size)
    if (amount === 0 && out.length === 0 && unit !== 'day') continue
    if (amount === 0) continue
    remaining -= amount * size
    out.push({
      unit,
      amount,
      label: `${amount} ${unit}${amount === 1 ? '' : 's'}`,
    })
    if (out.length >= max) break
  }
  if (out.length === 0) out.push({ unit: 'day', amount: 0, label: '0 days' })
  return out
}

export function formatDuration(value: FormulaDurationValue | number): string {
  const days = typeof value === 'number' ? value : value.days
  return durationParts(days)
    .map((p) => p.label)
    .join(', ')
}

/* ---------------------------------------------------- format-driven dispatch */

/** Format a scalar number/string/bool with the card's declared format. */
export function formatScalar(
  value: number | string | boolean,
  format: MoneyValueFormat,
): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'string') return value
  switch (format) {
    case 'currency':
      return formatMoney(value)
    case 'percent':
      return formatPercent(value)
    case 'compact':
      return formatCompactNumber(value)
    case 'duration':
      return formatDuration(value)
    case 'date':
      return formatDate(new Date(value).toISOString())
    case 'number':
    default:
      return Number.isInteger(value) ? formatCount(value) : formatNumber(value)
  }
}

/**
 * Best-effort one-line summary for any value shape — used for chips, fallbacks,
 * and the formula playground result header.
 */
export function summarizeValue(
  value: FormulaResultValue,
  format: MoneyValueFormat = 'number',
): string {
  if (isSeriesValue(value)) {
    const n = value.points.length
    return `${n} point${n === 1 ? '' : 's'}`
  }
  if (isTableValue(value)) {
    const n = value.rows.length
    return `${n} row${n === 1 ? '' : 's'}`
  }
  if (isEntityListValue(value)) {
    const n = value.entities.length
    return `${n} item${n === 1 ? '' : 's'}`
  }
  if (isDurationValue(value)) return formatDuration(value)
  if (isDateValue(value)) return formatDate(value.isoDate)
  if (isScalarValue(value)) return formatScalar(value, format)
  return String(value)
}

/* ----------------------------------------------------------------- deltas */

export type DeltaTone = 'positive' | 'negative' | 'neutral'

export interface DeltaInfo {
  raw: number
  ratio: number | null
  direction: 'up' | 'down' | 'flat'
  tone: DeltaTone
}

/**
 * Compare current vs previous. `inverse` flips good/bad coloring so a rise in
 * spending reads as negative (red) while a rise in net worth reads positive.
 */
export function deltaInfo(
  current: number,
  previous: number,
  opts: { inverse?: boolean } = {},
): DeltaInfo {
  const raw = current - previous
  const ratio = previous !== 0 ? raw / Math.abs(previous) : null
  const direction = raw > 0 ? 'up' : raw < 0 ? 'down' : 'flat'
  let tone: DeltaTone = 'neutral'
  if (direction !== 'flat') {
    const good = opts.inverse ? direction === 'down' : direction === 'up'
    tone = good ? 'positive' : 'negative'
  }
  return { raw, ratio, direction, tone }
}

/** Tailwind text color class for a delta tone (semantic tokens only). */
export function toneTextClass(tone: DeltaTone): string {
  switch (tone) {
    case 'positive':
      return 'text-success'
    case 'negative':
      return 'text-destructive'
    default:
      return 'text-muted-foreground'
  }
}
