import {
  Activity,
  Banknote,
  CalendarClock,
  CircleDollarSign,
  CreditCard,
  Flame,
  Gauge,
  HandCoins,
  Landmark,
  PieChart,
  PiggyBank,
  Receipt,
  Repeat,
  Scale,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import { type ReactNode } from 'react'
import {
  isDateValue,
  isDurationValue,
  isEntityListValue,
  isScalarValue,
  isSeriesValue,
  isTableValue,
} from '../lib/format'
import type {
  CardKind,
  EntityListEntity,
  EvaluatedCard,
  FormulaResultValue,
  FormulaTableValue,
  SeriesPoint,
} from '../lib/types'

export type ValueShape =
  | 'series'
  | 'table'
  | 'entity-list'
  | 'duration'
  | 'date'
  | 'scalar'
export type RendererKey =
  | 'metric'
  | 'trend'
  | 'breakdown'
  | 'entity-list'
  | 'status'
  | 'optimizer'
  | 'comparison'
  | 'forecast'

export function valueShape(value: FormulaResultValue): ValueShape {
  if (isSeriesValue(value)) return 'series'
  if (isTableValue(value)) return 'table'
  if (isEntityListValue(value)) return 'entity-list'
  if (isDurationValue(value)) return 'duration'
  if (isDateValue(value)) return 'date'
  return 'scalar'
}

/**
 * Choose a renderer from the runtime value shape first, then the card kind, then
 * format. Structured values (series/table/entity-list/duration) always win so the
 * UI keeps working as the backend adds new formulas/kinds.
 */
export function pickRenderer(
  card: EvaluatedCard,
  variant?: CardKind,
): RendererKey {
  if (variant) return normalizeKind(variant)
  const shape = valueShape(card.value)
  if (shape === 'series') return 'trend'
  if (shape === 'table') return 'breakdown'
  if (shape === 'entity-list') return 'entity-list'
  if (shape === 'duration') return 'forecast'
  return normalizeKind(card.kind, card)
}

function normalizeKind(kind: CardKind, card?: EvaluatedCard): RendererKey {
  switch (kind) {
    case 'trend':
    case 'ratio':
      return 'trend'
    case 'breakdown':
      return 'breakdown'
    case 'entity-list':
    case 'list':
      return card && firstEntityList(card) ? 'entity-list' : 'metric'
    case 'status':
      return 'status'
    case 'optimizer':
      return 'optimizer'
    case 'comparison':
      return 'comparison'
    case 'forecast':
      return 'forecast'
    case 'metric':
    default:
      return 'metric'
  }
}

/* ------------------------------------------------------- secondary access */

export interface SecondaryScalar {
  key: string
  value: number
}

export function secondaryEntries(
  card: EvaluatedCard,
): Array<[string, FormulaResultValue]> {
  const fromValues = Object.entries(card.secondaryValues ?? {})
  if (fromValues.length) return fromValues
  // Live cards carry `secondaryResults: { key: { value, ... } }` instead.
  return Object.entries(card.secondaryResults ?? {}).map(([k, r]) => [
    k,
    r?.value as FormulaResultValue,
  ])
}

export function scalarSecondaries(card: EvaluatedCard): SecondaryScalar[] {
  return secondaryEntries(card)
    .filter(([, v]) => typeof v === 'number')
    .map(([key, v]) => ({ key, value: v as number }))
}

/**
 * A savings-rate card whose income is negligible (you're not earning) goes
 * absurdly negative — e.g. "-653%" — which reads as a glitch, not a fact. Detect
 * that "living off savings" state and surface the monthly burn instead, so the
 * card stays truthful and calm. Returns null unless the card is a deeply-negative
 * percent with a derivable burn (which scopes this to savings/cash-flow cards).
 */
export function drawdownInfo(
  card: EvaluatedCard,
): { monthlyBurn: number } | null {
  const rate = scalarOrNull(card.value)
  if (rate === null || card.format !== 'percent' || rate >= -1) return null
  const secs = Object.fromEntries(
    scalarSecondaries(card).map((s) => [s.key, s.value]),
  )
  let sixMonth: number | null = null
  if (
    typeof secs.rollingIncome === 'number' &&
    typeof secs.rollingExpenses === 'number'
  ) {
    sixMonth = secs.rollingIncome - secs.rollingExpenses
  } else if (typeof secs.cashFlow === 'number') {
    sixMonth = secs.cashFlow
  } else if (typeof secs.rollingCashFlow === 'number') {
    sixMonth = secs.rollingCashFlow
  }
  const monthlyBurn =
    sixMonth !== null
      ? sixMonth / 6
      : typeof secs.currentMonthCashFlow === 'number'
        ? secs.currentMonthCashFlow
        : null
  if (monthlyBurn === null || monthlyBurn >= 0) return null
  return { monthlyBurn }
}

/** Find a series in the primary value or any secondary value. */
export function firstSeries(card: EvaluatedCard): SeriesPoint[] | null {
  if (isSeriesValue(card.value)) return card.value.points
  for (const [, v] of secondaryEntries(card))
    if (isSeriesValue(v)) return v.points
  return null
}

export function firstEntityList(
  card: EvaluatedCard,
): EntityListEntity[] | null {
  if (isEntityListValue(card.value)) return card.value.entities
  for (const [, v] of secondaryEntries(card))
    if (isEntityListValue(v)) return v.entities
  return null
}

export function firstTable(card: EvaluatedCard): FormulaTableValue | null {
  if (isTableValue(card.value)) return card.value
  for (const [, v] of secondaryEntries(card)) if (isTableValue(v)) return v
  return null
}

export function seriesValues(points: SeriesPoint[]): number[] {
  return points.map((p) => p.value)
}

export function scalarOrNull(value: FormulaResultValue): number | null {
  return typeof value === 'number' ? value : null
}

/** Humanize a secondary-formula key like "lifestyleCreep" → "Lifestyle creep". */
export function humanizeKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/* --------------------------------------------------------------- icons */

const ICON_RULES: Array<[RegExp, ReactNode]> = [
  [/net.?worth/i, <Landmark key="i" />],
  [/savings.?health|savings.?rate/i, <Gauge key="i" />],
  [/income.?saved|saved/i, <PiggyBank key="i" />],
  [/cash.?flow/i, <Activity key="i" />],
  [/subscription/i, <Repeat key="i" />],
  [/card.?account|credit|debt.?payoff/i, <CreditCard key="i" />],
  [/debt/i, <Scale key="i" />],
  [/review/i, <Receipt key="i" />],
  [/runway/i, <Flame key="i" />],
  [/recurring/i, <CalendarClock key="i" />],
  [/tax/i, <PiggyBank key="i" />],
  [/income.?source|income/i, <Banknote key="i" />],
  [/joy/i, <Scale key="i" />],
  [/shared|reimburse/i, <Users key="i" />],
  [/freedom|independence|fire/i, <Target key="i" />],
  [/spending.?change|impact|forecast/i, <TrendingUp key="i" />],
  [/investment|allocation/i, <PieChart key="i" />],
  [/largest|expense/i, <Receipt key="i" />],
]

const KIND_ICON: Record<RendererKey, ReactNode> = {
  metric: <CircleDollarSign />,
  trend: <TrendingUp />,
  breakdown: <PieChart />,
  'entity-list': <Receipt />,
  status: <Gauge />,
  optimizer: <Target />,
  comparison: <Scale />,
  forecast: <CalendarClock />,
}

/** Domain-meaningful icon for a card (never a generic "AI" glyph). */
export function iconForCard(card: EvaluatedCard): ReactNode {
  const hay = `${card.id} ${card.title}`
  for (const [re, icon] of ICON_RULES) if (re.test(hay)) return icon
  return KIND_ICON[pickRenderer(card)] ?? <HandCoins />
}
