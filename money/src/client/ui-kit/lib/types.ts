/**
 * Client-side mirrors of the Money backend formula/card contracts.
 *
 * These intentionally duplicate the server `money-types.ts` shapes (rather than
 * importing across the server boundary) so the UI kit stays a self-contained,
 * portable set of "legos" that renders whatever the backend returns. Renderers
 * dispatch primarily on the *runtime value shape* (see `format.ts` guards) and
 * fall back to `kind` / `format`, so the UI keeps working as the backend adds
 * new collections, formulas, and card kinds.
 */
import type { ReactNode } from 'react'

export type MoneyValueFormat =
  | 'currency'
  | 'percent'
  | 'number'
  | 'compact'
  | 'duration'
  | 'date'

export type FormulaOutputType =
  | 'money'
  | 'percent'
  | 'count'
  | 'number'
  | 'duration'
  | 'date'
  | 'series'
  | 'table'
  | 'entity-list'
  | 'forecast'

export type CardKind =
  | 'metric'
  | 'ratio'
  | 'list'
  | 'status'
  | 'trend'
  | 'breakdown'
  | 'entity-list'
  | 'optimizer'
  | 'comparison'
  | 'forecast'

/** A point in a time series returned by `Trend()` / `Monthly()` etc. */
export interface SeriesPoint {
  key: string
  label: string
  value: number
  count: number
  startDate?: string
  endDate?: string
}

export interface FormulaSeriesValue {
  type: 'series'
  points: SeriesPoint[]
}

export interface FormulaTableColumn {
  key: string
  label: string
  kind: 'string' | 'number' | 'percent'
}

export interface FormulaTableValue {
  type: 'table'
  columns: FormulaTableColumn[]
  rows: Array<Record<string, string | number | boolean | null>>
}

export interface EntityListEntity {
  id: string
  label: string
  value: number
  kind: 'account' | 'transaction'
  subtitle?: string
  fields: Record<string, string | number | boolean | null>
}

export interface FormulaEntityListValue {
  type: 'entity-list'
  entities: EntityListEntity[]
}

export interface FormulaDurationValue {
  type: 'duration'
  amount: number
  unit: 'day' | 'week' | 'month' | 'year'
  days: number
}

export interface FormulaDateValue {
  type: 'date'
  isoDate: string
}

export type FormulaResultValue =
  | number
  | string
  | boolean
  | FormulaDateValue
  | FormulaDurationValue
  | FormulaSeriesValue
  | FormulaTableValue
  | FormulaEntityListValue

export interface CardDefinition {
  id: string
  title: string
  kind: CardKind
  formula: string
  primaryFormula?: string
  secondaryFormulas?: Record<string, string>
  visualization?: string
  timeWindow?: '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL'
  format: MoneyValueFormat
  description?: string
}

export interface EvaluatedCard extends CardDefinition {
  value: FormulaResultValue
  displayValue: string
  /** Collections the card's formulas reference, when the backend supplies them. */
  referencedCollections?: string[]
  secondaryReferencedCollections?: Record<string, string[]>
  /**
   * Evaluated secondary formula outputs, keyed by the same names as
   * `secondaryFormulas`. The UI kit supports this so one card can be backed by
   * several formulas (e.g. a hero metric + a trend series + a delta).
   */
  secondaryValues?: Record<string, FormulaResultValue>
  /**
   * The live API shape for the same data: each secondary keyed to a full result
   * object. `secondaryEntries()` normalizes this to plain values so renderers
   * don't care which shape the backend sent.
   */
  secondaryResults?: Record<
    string,
    { value?: FormulaResultValue; displayValue?: string; outputType?: string }
  >
}

export interface CollectionMetric {
  id: string
  label: string
  value: number
  count: number
}

/* ---- /api/formulas/schema ---- */

export interface SchemaCollection {
  id: string
  name: string
  entity: string
  filters: unknown[]
  defaultMeasure?: string
  description?: string
}

export interface SchemaMethod {
  name: string
  target?: string
  args: Array<{ name: string; type: string }>
  returns: string
  examples?: string[]
}

export interface SchemaFunction {
  name: string
  args: Array<{ name: string; type: string }>
  returns: string
  examples?: string[]
}

export interface SchemaExample {
  formula: string
  description?: string
  outputType?: string
  cardKind?: string
}

export interface FormulaSchema {
  version: number
  generatedAt: string
  collections: { definitions: SchemaCollection[]; metrics?: CollectionMetric[] }
  entities?: unknown
  extensions?: unknown
  methods: SchemaMethod[]
  functions: SchemaFunction[]
  operators: string[]
  literals: Array<{ kind: string; examples: string[] }>
  formats: MoneyValueFormat[]
  outputTypes: FormulaOutputType[]
  cardKinds: CardKind[]
  examples: Array<SchemaExample | string>
}

/* ---- /api/formulas/preview ---- */

export interface PreviewResult {
  id: string
  formula: string
  value: FormulaResultValue
  displayValue: string
  outputType: FormulaOutputType
  referencedCollections: string[]
  generatedAt: string
}

export interface FormulaDiagnostic {
  message: string
  range?: {
    start: { line: number; character: number; offset: number }
    end: { line: number; character: number; offset: number }
  }
}

export interface PreviewSuccess {
  ok: true
  result: PreviewResult
  collections: CollectionMetric[]
}

export interface PreviewFailure {
  ok: false
  error: { code: string; message: string; diagnostics?: FormulaDiagnostic[] }
}

export type PreviewResponse = PreviewSuccess | PreviewFailure

/* ---- card authoring: /api/cards (POST), /api/cards/test, /api/cards/templates ---- */

/**
 * The writable shape an agent/user POSTs to `/api/cards` (or `/api/cards/test`).
 * A subset of `CardDefinition` — `id` is optional (slugified from `title`), and
 * `outputType` is an optional assertion validated against the evaluated shape.
 */
export interface CardDefinitionInput {
  id?: string
  title: string
  kind: CardKind
  formula?: string
  primaryFormula?: string
  secondaryFormulas?: Record<string, string>
  format?: MoneyValueFormat
  outputType?: FormulaOutputType
  description?: string
  timeWindow?: CardDefinition['timeWindow']
}

/** One curated starter card from `GET /api/cards/templates`. */
export interface CardTemplate {
  id: string
  title: string
  category: string
  priority: number
  definition: CardDefinition
  referencedCollections: string[]
  /** Extension namespaces (e.g. `transaction:subscription`) the card needs. */
  requiredExtensions: string[]
  recommendedFor: string[]
  /** Present when requested with `includeEvaluation=true`. */
  test?: CardTestResult
}

export interface CardTemplatesResponse {
  templates: CardTemplate[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
  nextOffset?: number
  nextCursor?: string
  categories: string[]
}

/** Per-card outcome from `POST /api/cards/test`. */
export type CardTestResult =
  | {
      index: number
      ok: true
      definition: CardDefinition
      card: EvaluatedCard
      result: PreviewResult
      repairHints: string[]
    }
  | {
      index: number
      ok: false
      input: CardDefinitionInput
      error: {
        code: string
        message: string
        formulaKey?: string
        diagnostics?: FormulaDiagnostic[]
      }
      repairHints: string[]
    }

export interface CardTestResponse {
  ok: boolean
  testedAt: string
  total: number
  passed: number
  failed: number
  cards: CardTestResult[]
}

/* ---- transaction drilldown: /api/transactions ---- */

export interface MoneyTransactionRow {
  id: string
  name: string
  merchantName?: string
  amount: number
  direction: 'income' | 'expense' | 'transfer'
  category: string[]
  userCategory?: string
  date: string
  isoCurrencyCode: string
  pending?: boolean
}

export interface TransactionFilters {
  q?: string
  category?: string
  direction?: 'income' | 'expense' | 'transfer'
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export interface TransactionsPage {
  transactions: MoneyTransactionRow[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
  nextOffset?: number
  nextCursor?: string
}

/**
 * `GET /api/cards/:id/transactions` — the card-scoped drilldown. Same paged
 * envelope as `TransactionsPage`, plus what the backend resolved the card down
 * to: the backing `collection`, whether the rows are the formula's exact matches
 * (`formulaFiltered`/`drilldownBasis`), and the other collections it could show.
 */
export interface CardTransactionsPage extends TransactionsPage {
  cardId?: string
  formula?: string
  collection?: string
  availableCollections?: string[]
  drilldownBasis?: 'formula' | 'collection'
  formulaFiltered?: boolean
}

/* ---- /api/dashboards ---- */

export interface DashboardDefinition {
  id: string
  name: string
  cardIds: string[]
  createdAt?: string
  updatedAt?: string
}

/* ---- UI-kit composition types ---- */

/**
 * A delta/comparison annotation a card can show under its hero value.
 * `inverse` flips the good/bad coloring — for spending, "up" is bad.
 */
export interface DeltaSpec {
  value: number
  /** Pre-formatted label, e.g. "+$721" or "+27 days". */
  label?: string
  /** Format used to render `value` when `label` is absent. */
  format?: MoneyValueFormat
  /** When true, a positive delta is treated as bad (red). */
  inverse?: boolean
  /** Caption shown after the delta, e.g. "vs last month". */
  caption?: string
}

/** Layout span for a card inside a bento grid (1–4 columns). */
export type CardSpan = 1 | 2 | 3 | 4

/** A card plus its layout intent, used by demo dashboards + the gallery. */
export interface DashboardCard {
  card: EvaluatedCard
  span?: CardSpan
  /** Optional explicit renderer override; otherwise dispatched by value shape. */
  variant?: CardKind
  delta?: DeltaSpec
  /** Optional header control (e.g. a drilldown trigger) for this card. */
  action?: ReactNode
}
