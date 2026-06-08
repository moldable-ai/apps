import { readJson, safePath, writeJson } from '@moldable-ai/storage'
import { convertMoney, normalizeCurrencyCode } from './currency'
import {
  DEFAULT_CARD_DEFINITIONS,
  DEFAULT_COLLECTION_DEFINITIONS,
  buildCollections,
  diagnoseFormula,
  evaluateCards,
  evaluateFormulaTransactionRows,
  evaluateFormulaValue,
  formatValue,
  parseFormula,
  referencedCollections,
  referencedExtensionRequirements,
} from './formulas'
import type { FormulaValidationOptions, MoneyFormulaData } from './formulas'
import { generateJson, getDataDir, getWorkspaceId, jsonError } from './moldable'
import {
  buildMerchantFacts,
  buildMoneySummary,
  buildPersonFacts,
  deleteExtensionValue,
  deleteMaterializedMetric,
  deriveBalanceSnapshots,
  deriveRecommendationFacts,
  mergeMerchants,
  mergePersons,
  mergeRawMoneyData,
  paginateItems,
  patchTransaction,
  readAccounts,
  readAllocationTargets,
  readCardDefinitions,
  readCollectionDefinitions,
  readConnections,
  readDashboards,
  readDebts,
  readExtensionProposals,
  readExtensionRegistry,
  readExtensionValues,
  readForecastScenarios,
  readFormulaDefinitions,
  readFxRates,
  readHoldings,
  readMaterializedMetrics,
  readMerchants,
  readMoneyData,
  readPersons,
  readRawMoneyData,
  readRawPlaidSyncEvidence,
  readRecommendations,
  readSettings,
  readSyncState,
  readTaxContributionLimits,
  readTransactionLabelRules,
  readTransactions,
  readVisibleAccounts,
  readVisibleBalanceSnapshots,
  readVisibleMoneyData,
  readVisibleMoneyState,
  refreshDerivedTransactionExtensions,
  removeBalanceSnapshotsForItem,
  searchTransactions,
  searchVisibleTransactions as searchVisibleTransactionsFromStorage,
  upsertBalanceSnapshots,
  upsertExtensionProposals,
  upsertExtensionValues,
  writeAccounts,
  writeAllocationTargets,
  writeCardDefinitions,
  writeCollectionDefinitions,
  writeConnections,
  writeDashboards,
  writeDebts,
  writeExtensionRegistry,
  writeForecastScenarios,
  writeFormulaDefinitions,
  writeFxRates,
  writeHoldings,
  writeMaterializedMetric,
  writeMoneyData,
  writeRawPlaidSyncEvidence,
  writeRecommendations,
  writeSettings,
  writeSyncState,
  writeTaxContributionLimits,
  writeTransactionLabelRules,
} from './money-storage'
import type {
  CollectionDefinition,
  CollectionMetric,
  FormulaResultValue,
  MaterializedMetric,
  MoneyAccount,
  MoneyAllocationTarget,
  MoneyBalanceSnapshotKind,
  MoneyCardDefinition,
  MoneyConnection,
  MoneyDashboard,
  MoneyDebt,
  MoneyExtensionPrimitive,
  MoneyExtensionProposal,
  MoneyExtensionRegistry,
  MoneyExtensionValue,
  MoneyForecastScenario,
  MoneyFormulaDefinition,
  MoneyFxRate,
  MoneyMerchant,
  MoneyRecommendation,
  MoneySettings,
  MoneySnapshot,
  MoneyTaxContributionLimit,
  MoneyTransaction,
  MoneyTransactionLabelRule,
  MoneyTransactionLabelRuleMatch,
  RawMoneyData,
  RawPlaidSyncEvidence,
  RawPlaidSyncEvidenceSummary,
  SyncState,
  TransactionDirection,
  TransactionSearchFilters,
} from './money-types'
import {
  createPlaidBrowserConnectSession,
  isPlaidAivaultSystemError,
  plaidSyncErrorMessage,
  removePlaidConnection,
  syncPlaidConnection,
} from './plaid'
import { createSeedMoneyData } from './seed-data'
import { Hono } from 'hono'
import type { Context } from 'hono'
import type { Dirent } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { z } from 'zod'

const MIN_SYNC_INTERVAL_MINUTES = 15
const MAX_SYNC_INTERVAL_MINUTES = 1440
const READ_CACHE_TTL_MS = 15_000
const WAREHOUSE_SCHEMA_VERSION = 1
const syncLocks = new Set<string>()
const warehouseRebuildLocks = new Set<string>()
const importLocks = new Set<string>()
let warehouseAtomicWriteCounter = 0
const readResponseCache = new Map<
  string,
  { expiresAt: number; value: unknown }
>()

type WarehouseProjectionKind = 'cards' | 'data-health'
type WarehouseJobState = 'idle' | 'running' | 'complete' | 'error'
type WarehouseRebuildScope = 'full' | 'dirty'
type ImportJobPhase =
  | 'queued'
  | 'writing-facts'
  | 'refreshing-derived'
  | 'rebuilding-warehouse'
  | 'complete'
  | 'error'

interface WarehouseProjectionEnvelope<T> {
  schemaVersion: number
  kind: WarehouseProjectionKind
  generatedAt: string
  sourceMtimeMs: number
  buildMs: number
  value: T
}

interface WarehouseDirtyPartition {
  scope: string
  partition?: string
  reason?: string
  markedAt: string
}

interface WarehouseManifest {
  schemaVersion: number
  generatedAt: string
  sourceMtimeMs: number
  dirty: WarehouseDirtyPartition[]
  artifacts: {
    projections: Record<WarehouseProjectionKind, WarehouseArtifactStatus>
    aggregates: Record<string, WarehouseArtifactStatus>
    indexes: Record<string, WarehouseArtifactStatus>
  }
}

interface WarehouseArtifactStatus {
  exists: boolean
  stale: boolean
  generatedAt?: string
  sourceMtimeMs?: number
  buildMs?: number
  count?: number
}

interface WarehouseJobStatus {
  schemaVersion: number
  id: string
  state: WarehouseJobState
  scope?: WarehouseRebuildScope
  requestedScope?: WarehouseRebuildScope
  startedAt?: string
  completedAt?: string
  failedAt?: string
  error?: string
  sourceMtimeMs?: number
  buildMs?: number
  dirtyBefore?: WarehouseDirtyPartition[]
  dirtyMonths?: string[]
  artifacts?: Record<string, WarehouseArtifactStatus>
}

interface ImportJobStatus {
  schemaVersion: number
  id: string
  state: WarehouseJobState
  phase: ImportJobPhase
  startedAt?: string
  completedAt?: string
  failedAt?: string
  error?: string
  buildMs?: number
  incomingAccounts?: number
  incomingTransactions?: number
  accounts?: number
  transactions?: number
  refreshedMetrics?: number
  warehouseJob?: WarehouseJobStatus | null
}

interface WarehouseMonthlyAggregateEnvelope {
  schemaVersion: number
  kind: 'monthly-aggregates'
  generatedAt: string
  sourceMtimeMs: number
  buildMs: number
  months: string[]
  totals: WarehouseMonthlyTotals
}

interface WarehouseMonthlyTotals {
  income: number
  expenses: number
  transfers: number
  cashFlow: number
  transactionCount: number
  byMonth: Record<string, WarehouseMonthlyRollup>
}

interface WarehouseMonthlyRollup {
  month: string
  income: number
  expenses: number
  transfers: number
  cashFlow: number
  transactionCount: number
  byCategory: Record<string, WarehouseRollupBucket>
  byMerchant: Record<string, WarehouseRollupBucket>
  byAccount: Record<string, WarehouseRollupBucket>
  byCurrency: Record<string, WarehouseRollupBucket>
  byDirection: Record<TransactionDirection, WarehouseRollupBucket>
}

interface WarehouseRollupBucket {
  id: string
  label: string
  amount: number
  income: number
  expenses: number
  transfers: number
  count: number
}

interface WarehouseTransactionIndexesEnvelope {
  schemaVersion: number
  kind: 'transaction-indexes'
  generatedAt: string
  sourceMtimeMs: number
  buildMs: number
  transactionCount: number
  indexCounts: Record<string, number>
}

interface WarehouseTransactionIndexFile {
  schemaVersion: number
  kind: 'transaction-index'
  index: 'account' | 'merchant' | 'category' | 'transfer-reason'
  key: string
  label: string
  generatedAt: string
  sourceMtimeMs: number
  total: number
  transactionIds: string[]
  entries: WarehouseTransactionIndexEntry[]
}

interface WarehouseTransactionIndexEntry {
  id: string
  month: string
  date: string
  amount: number
  reportingValue?: number
  direction: TransactionDirection
  accountId?: string
  merchantName?: string
  category?: string
  transferReason?: string
}
const ACCOUNT_FACT_COLLECTIONS = [
  'Accounts',
  'Assets',
  'LiquidAssets',
  'IlliquidAssets',
  'Liabilities',
  'Cash',
  'CardAccounts',
  'Investments',
  'Debt',
  'TaxSheltered',
] as const
const BALANCE_SNAPSHOT_COLLECTIONS = [
  'BalanceSnapshots',
  'NetWorthHistory',
  'AssetHistory',
  'LiabilityHistory',
  'InvestmentHistory',
] as const
const TRANSACTION_FACT_COLLECTIONS = [
  'Income',
  'Expenses',
  'Transfers',
  'Subscriptions',
  'RecurringObligations',
  'JoyReview',
  'SharedExpenses',
  'TaxContributions',
  'BudgetLabels',
  'CashFlow',
] as const
const DEFAULT_TRANSACTION_EXTENSION_COLLECTIONS = {
  Subscriptions: 'subscription',
  RecurringObligations: 'recurringObligation',
  JoyReview: 'joyReview',
  SharedExpenses: 'sharedExpense',
  TaxContributions: 'taxContribution',
  BudgetLabels: 'budget',
} as const
const DEBT_FACT_COLLECTIONS = ['Debt', 'Liabilities'] as const
const HOLDING_FACT_COLLECTIONS = ['Investments'] as const
const RECOMMENDATION_FACT_COLLECTIONS = [
  'ReviewActions',
  'Warnings',
  'Opportunities',
] as const

const accountSchema = z.object({
  id: z.string().min(1),
  source: z.enum(['plaid', 'manual', 'seed']),
  connectionId: z.string().optional(),
  institutionName: z.string().optional(),
  name: z.string().min(1),
  officialName: z.string().optional(),
  type: z.enum(['cash', 'credit', 'investment', 'loan', 'mortgage', 'other']),
  subtype: z.string().optional(),
  mask: z.string().optional(),
  currentBalance: z.number(),
  isoCurrencyCode: z.string().min(1),
  currencyCode: z.string().min(1).optional(),
  asOf: z.string().min(1),
  valueForSum: z.number().nullable().optional(),
  isAsset: z.boolean().optional(),
  isLiability: z.boolean().optional(),
  creditLimit: z.number().positive().optional(),
  availableCredit: z.number().min(0).optional(),
  utilization: z.number().min(0).optional(),
  investmentAccountKind: z
    .enum([
      'brokerage',
      '401k',
      'ira',
      'roth_ira',
      'rrsp',
      'tfsa',
      'hsa',
      '529',
      'other',
    ])
    .optional(),
  taxTreatment: z
    .enum(['taxable', 'tax_deferred', 'tax_free', 'education', 'hsa', 'other'])
    .optional(),
  liquidityTier: z
    .union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])
    .optional(),
  liquidity: z
    .enum(['cash', 'near_cash', 'marketable', 'illiquid', 'na'])
    .optional(),
  liquidityClass: z.enum(['liquid', 'illiquid', 'na']).optional(),
  contributionLimitAnnual: z.number().positive().optional(),
  contributionLimitYear: z.number().int().positive().optional(),
})

const manualAccountCreateSchema = accountSchema
  .omit({ id: true, source: true, asOf: true })
  .extend({
    id: z.string().min(1).optional(),
    asOf: z.string().min(1).optional(),
  })

const manualAccountPatchSchema = manualAccountCreateSchema.partial()

const debtTypeSchema = z.enum([
  'credit',
  'mortgage',
  'student',
  'loan',
  'other',
])

const debtPatchSchema = z.object({
  accountId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  type: debtTypeSchema.optional(),
  balance: z.number().nonnegative().optional(),
  apr: z.number().min(0).max(100).optional(),
  creditLimit: z.number().nonnegative().optional(),
  availableCredit: z.number().nonnegative().optional(),
  statementBalance: z.number().nonnegative().optional(),
  minimumPayment: z.number().nonnegative().optional(),
  nextPaymentDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  lastPaymentAmount: z.number().nonnegative().optional(),
  lastPaymentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  isOverdue: z.boolean().optional(),
  currencyCode: z.string().min(1).optional(),
})

const transactionSchema = z.object({
  id: z.string().min(1),
  source: z.enum(['plaid', 'manual', 'seed']),
  connectionId: z.string().optional(),
  accountId: z.string().optional(),
  merchantName: z.string().optional(),
  name: z.string().min(1),
  amount: z.number().nonnegative(),
  direction: z.enum(['income', 'expense', 'transfer']),
  category: z.array(z.string()),
  providerCategoryPrimary: z.string().optional(),
  providerCategoryDetailed: z.string().optional(),
  providerPaymentChannel: z.string().optional(),
  transferReason: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isoCurrencyCode: z.string().min(1),
  recurring: z.boolean(),
})

const rawMoneyDataSchema = z.object({
  accounts: z.array(accountSchema),
  transactions: z.array(transactionSchema),
})

const formulaRequestSchema = z.object({
  formula: z.string().min(1),
})

const formulaCompletionRequestSchema = z.object({
  formula: z.string().default(''),
  cursor: z.number().int().min(0).optional(),
})

const filterClauseSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['=', '!=', '<', '<=', '>', '>=', 'contains', 'in']),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.array(z.number()),
  ]),
})

const collectionDefinitionSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  entity: z.enum([
    'account',
    'transaction',
    'holding',
    'debt',
    'recurring',
    'merchant',
    'person',
    'recommendation',
    'balanceSnapshot',
  ]),
  filters: z.array(filterClauseSchema).default([]),
  defaultMeasure: z.enum(['amount', 'balance', 'marketValue', 'payment']),
  description: z.string().optional(),
})

const allocationTargetSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  allocations: z.record(z.string().min(1), z.number().min(0).max(1)),
  description: z.string().optional(),
})

const taxContributionLimitSchema = z.object({
  id: z.string().min(1).optional(),
  type: z.enum(['401k', 'ira', 'hsa', '529']),
  taxYear: z.number().int().min(2000).max(2200),
  label: z.string().min(1),
  limit: z.number().positive().max(10_000_000),
  variant: z.enum(['standard', 'self', 'family']).optional(),
  catchUpLimit: z.number().min(0).max(10_000_000).optional(),
  catchUpAge: z.number().int().min(0).max(120).optional(),
  sourceLabel: z.string().min(1).optional(),
  sourceUrl: z.string().url().optional(),
})

const forecastScenarioStatusSchema = z.enum([
  'draft',
  'accepted',
  'rejected',
  'archived',
])

const recommendationStatusSchema = z.enum([
  'required',
  'suggested',
  'accepted',
  'rejected',
  'done',
  'ignored',
])

const recommendationSourceEntitySchema = z.enum([
  'transaction',
  'account',
  'holding',
  'debt',
  'merchant',
  'person',
])

const LARGE_MONEY_FLOW_REVIEW_MIN_AMOUNT = 5_000

const recommendationPatchSchema = z.object({
  status: recommendationStatusSchema,
})

const queryBooleanSchema = z.preprocess((value) => {
  if (value === 'true') return true
  if (value === 'false') return false
  return value
}, z.boolean())

const recommendationQuerySchema = z.object({
  status: recommendationStatusSchema
    .or(z.enum(['active', 'all']))
    .default('active'),
  kind: z.enum(['action', 'warning', 'opportunity']).optional(),
  severity: z.enum(['low', 'medium', 'high']).optional(),
  sourceEntity: recommendationSourceEntitySchema.optional(),
  sourceEntityId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  cursor: z.string().optional(),
})

const recommendationGroupQuerySchema = recommendationQuerySchema.extend({
  groupBy: z.enum(['merchant', 'source', 'kind']).default('merchant'),
  minCount: z.coerce.number().int().min(1).max(500).default(1),
  includeRecommendations: queryBooleanSchema.default(false),
  includeRecommendationIds: queryBooleanSchema.default(false),
  includeSourceLinks: queryBooleanSchema.default(false),
  recommendationSampleLimit: z.coerce.number().int().min(0).max(25).default(3),
})

const recommendationBulkPatchSchema = z
  .object({
    status: recommendationStatusSchema,
    ids: z.array(z.string().min(1)).max(500).optional(),
    groupBy: z.enum(['merchant', 'source', 'kind']).optional(),
    groupId: z.string().min(1).optional(),
    kind: z.enum(['action', 'warning', 'opportunity']).optional(),
    severity: z.enum(['low', 'medium', 'high']).optional(),
    currentStatus: recommendationStatusSchema.or(z.enum(['active'])).optional(),
    sourceEntity: recommendationSourceEntitySchema.optional(),
    sourceEntityId: z.string().min(1).optional(),
    dryRun: z.boolean().default(false),
    limit: z.number().int().min(1).max(500).default(100),
  })
  .refine(
    (request) =>
      Boolean(
        request.ids?.length ||
          request.groupId ||
          request.kind ||
          request.severity ||
          request.currentStatus ||
          request.sourceEntity ||
          request.sourceEntityId,
      ),
    {
      message:
        'Bulk recommendation patch requires ids or at least one filter besides target status.',
    },
  )

const forecastScenarioChangeSchema = z.object({
  id: z.string().min(1).optional(),
  label: z.string().min(1),
  amountMonthly: z.number().min(-1_000_000).max(1_000_000).optional(),
  amountAnnual: z.number().min(-12_000_000).max(12_000_000).optional(),
  percentChange: z.number().min(-100).max(100).optional(),
  entity: z
    .enum(['transaction', 'account', 'holding', 'debt', 'merchant', 'person'])
    .optional(),
  entityId: z.string().min(1).optional(),
  namespace: z.string().min(1).optional(),
  status: forecastScenarioStatusSchema.optional(),
})

const forecastScenarioSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  status: forecastScenarioStatusSchema.default('draft'),
  horizonPeriods: z.number().int().min(1).max(120).optional(),
  confidence: z.number().min(0).max(1).optional(),
  changes: z.array(forecastScenarioChangeSchema).default([]),
})

const MONEY_VALUE_FORMATS = [
  'currency',
  'percent',
  'number',
  'compact',
  'duration',
  'date',
] as const

const FORMULA_OUTPUT_TYPES = [
  'money',
  'percent',
  'count',
  'number',
  'duration',
  'date',
  'forecast',
  'series',
  'table',
  'entity-list',
] as const

const moneyValueFormatSchema = z.enum(MONEY_VALUE_FORMATS)

const formulaOutputTypeSchema = z.enum(FORMULA_OUTPUT_TYPES)

const formulaDefinitionSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  formula: z.string().min(1),
  outputType: formulaOutputTypeSchema.default('number'),
  format: moneyValueFormatSchema.default('number'),
  description: z.string().optional(),
})

const CARD_KINDS = [
  'metric',
  'ratio',
  'list',
  'status',
  'trend',
  'breakdown',
  'entity-list',
  'optimizer',
  'comparison',
  'forecast',
] as const

const cardKindSchema = z.enum(CARD_KINDS)

const CARD_TEMPLATE_CATEGORIES = [
  'overview',
  'cash-flow',
  'recurring',
  'credit-debt',
  'investing',
  'tax',
  'review',
  'sharing',
  'forecasting',
  'merchants',
] as const

type CardTemplateCategory = (typeof CARD_TEMPLATE_CATEGORIES)[number]

const cardTemplateCategorySchema = z.enum(CARD_TEMPLATE_CATEGORIES)

const cardTemplateQuerySchema = z.object({
  category: cardTemplateCategorySchema.optional(),
  ids: z.string().optional(),
  includeEvaluation: queryBooleanSchema.default(true),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  cursor: z.string().optional(),
})

const timeWindowSchema = z.enum(['1M', '3M', '6M', 'YTD', '1Y', 'ALL'])

const cardDefinitionSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1),
  kind: cardKindSchema.default('metric'),
  formula: z.string().min(1).optional(),
  primaryFormula: z.string().min(1).optional(),
  secondaryFormulas: z.record(z.string(), z.string()).optional(),
  visualization: z.string().optional(),
  timeWindow: timeWindowSchema.optional(),
  filters: z.array(filterClauseSchema).optional(),
  outputType: formulaOutputTypeSchema.optional(),
  format: moneyValueFormatSchema.default('number'),
  description: z.string().optional(),
})

const cardTestRequestSchema = z.object({
  cards: z.array(cardDefinitionSchema).min(1).max(50),
})

const cardTransactionQuerySchema = z.object({
  cardId: z.string().min(1).optional(),
  formula: z.string().min(1).optional(),
  formulaKey: z.string().min(1).optional(),
  collection: z.string().min(1).optional(),
  q: z.string().optional(),
  accountId: z.string().optional(),
  direction: z.enum(['income', 'expense', 'transfer']).optional(),
  category: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  cursor: z.string().optional(),
})

const cardReadinessStatusSchema = z.enum([
  'ready',
  'empty',
  'needs-labels',
  'needs-review',
  'error',
])

const cardReadinessQuerySchema = z.object({
  ids: z.string().optional(),
  status: cardReadinessStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  cursor: z.string().optional(),
})

const cardPatchSchema = cardDefinitionSchema.partial().extend({
  id: z.string().min(1).optional(),
})

const dashboardPatchSchema = z.object({
  name: z.string().min(1).optional(),
  cardIds: z.array(z.string().min(1)).optional(),
  order: z.number().int().min(0).optional(),
})

const dashboardReorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
})

const idRequestSchema = z.object({
  id: z.string().min(1),
})

const patchTransactionSchema = z.object({
  name: z.string().min(1).optional(),
  merchantName: z.string().optional(),
  direction: z.enum(['income', 'expense', 'transfer']).optional(),
  category: z.array(z.string()).optional(),
  userCategory: z.string().optional(),
  notes: z.string().optional(),
  recurring: z.boolean().optional(),
})

const extensionPrimitiveSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
])

const extensionFieldSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum([
    'string',
    'number',
    'boolean',
    'date',
    'money',
    'percent',
    'enum',
  ]),
  required: z.boolean().optional(),
  enumValues: z.array(z.string()).optional(),
  description: z.string().optional(),
  formulaAliases: z.array(z.string()).optional(),
})

const extensionEntitySchema = z.enum([
  'transaction',
  'account',
  'holding',
  'debt',
  'merchant',
  'person',
])

const extensionCollectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  entity: extensionEntitySchema,
  baseCollection: z.string().min(1),
  predicate: z.string().min(1),
  description: z.string().optional(),
  examples: z.array(z.string()).optional(),
})

const extensionDefinitionSchema = z.object({
  namespace: z.string().min(1),
  label: z.string().min(1),
  entity: extensionEntitySchema,
  description: z.string().optional(),
  coverage: z.enum(['exhaustive', 'sparse']).optional(),
  fields: z.array(extensionFieldSchema),
  derivedCollections: z.array(extensionCollectionSchema).optional(),
  examples: z.array(z.string()).optional(),
})

const extensionRegistrySchema = z.object({
  version: z.number().int().min(1).default(1),
  extensions: z.array(extensionDefinitionSchema),
})

const genericExtensionValueSchema = z.object({
  entity: extensionEntitySchema,
  entityId: z.string().min(1),
  namespace: z.string().min(1),
  values: z.record(z.string(), extensionPrimitiveSchema),
  source: z.enum(['user', 'agent', 'rule', 'provider']),
  confidence: z.number().min(0).max(1).optional(),
  updatedAt: z.string().optional(),
})

const genericExtensionValueBatchSchema = z.object({
  extensions: z.array(genericExtensionValueSchema).min(1),
})

const genericExtensionValuePatchSchema = z
  .object({
    values: z.record(z.string(), extensionPrimitiveSchema).optional(),
    replaceValues: z.boolean().default(false),
    source: z.enum(['user', 'agent', 'rule', 'provider']).optional(),
    confidence: z.number().min(0).max(1).nullable().optional(),
    updatedAt: z.string().optional(),
  })
  .refine(
    (patch) =>
      patch.values !== undefined ||
      patch.source !== undefined ||
      patch.confidence !== undefined ||
      patch.updatedAt !== undefined,
    'At least one extension field must be patched.',
  )

const genericExtensionValueKeySchema = z.object({
  entity: extensionEntitySchema,
  namespace: z.string().min(1),
  entityId: z.string().min(1),
})

const genericExtensionValueQuerySchema = z.object({
  entity: extensionEntitySchema.optional(),
  namespace: z.string().optional(),
  entityId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  cursor: z.string().optional(),
})

const extensionProposalStatusSchema = z.enum([
  'pending',
  'accepted',
  'rejected',
])

const extensionProposalQuerySchema = z.object({
  entity: extensionEntitySchema.optional(),
  namespace: z.string().optional(),
  entityId: z.string().optional(),
  status: extensionProposalStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  cursor: z.string().optional(),
})

const extensionProposalDecisionSchema = z.object({
  reason: z.string().max(1000).optional(),
})

const extensionProposalBatchDecisionSchema = z
  .object({
    action: z.enum(['accept', 'reject', 'correct']),
    ids: z.array(z.string().min(1)).max(500).optional(),
    entity: extensionEntitySchema.optional(),
    namespace: z.string().optional(),
    entityId: z.string().optional(),
    status: extensionProposalStatusSchema.default('pending'),
    batchId: z.string().optional(),
    model: z.string().optional(),
    minConfidence: z.number().min(0).max(1).optional(),
    maxConfidence: z.number().min(0).max(1).optional(),
    reason: z.string().max(1000).optional(),
    correctedNamespace: z.string().min(1).optional(),
    values: z.record(z.string(), extensionPrimitiveSchema).optional(),
    source: z.enum(['user', 'agent', 'rule', 'provider']).default('user'),
    confidence: z.number().min(0).max(1).optional(),
    teachRule: z.boolean().default(false),
    rule: z
      .object({
        id: z.string().min(1).optional(),
        name: z.string().min(1).optional(),
        scope: z.enum(['merchant', 'pattern']).default('merchant'),
        match: z.lazy(() => transactionLabelRuleMatchSchema).optional(),
      })
      .optional(),
    dryRun: z.boolean().default(false),
    limit: z.number().int().min(1).max(500).default(100),
  })
  .refine(
    (request) => request.action !== 'correct' || Boolean(request.values),
    {
      message: 'Correct proposal decisions require corrected values.',
    },
  )
  .refine(
    (request) =>
      Boolean(
        request.ids?.length ||
          request.entity ||
          request.namespace ||
          request.entityId ||
          request.batchId ||
          request.model ||
          request.minConfidence !== undefined ||
          request.maxConfidence !== undefined,
      ),
    {
      message:
        'Batch proposal decisions require ids or at least one filter besides status.',
    },
  )

const transactionLabelSelectorSchema = z
  .object({
    transactionIds: z.array(z.string().min(1)).optional(),
    merchantIds: z.array(z.string().min(1)).optional(),
    merchantNames: z.array(z.string().min(1)).optional(),
    q: z.string().min(1).optional(),
    textPattern: z.string().min(1).optional(),
    accountId: z.string().min(1).optional(),
    direction: z.enum(['income', 'expense', 'transfer']).optional(),
    category: z.string().min(1).optional(),
    currencyCode: z.string().min(1).optional(),
    minAmount: z.number().min(0).optional(),
    maxAmount: z.number().min(0).optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    missingNamespace: z.string().min(1).optional(),
    limit: z.number().int().min(1).max(2000).default(500),
  })
  .refine(
    (selector) =>
      Boolean(
        selector.transactionIds?.length ||
          selector.merchantIds?.length ||
          selector.merchantNames?.length ||
          selector.q ||
          selector.textPattern ||
          selector.accountId ||
          selector.direction ||
          selector.category ||
          selector.currencyCode ||
          selector.minAmount !== undefined ||
          selector.maxAmount !== undefined ||
          selector.startDate ||
          selector.endDate ||
          selector.missingNamespace,
      ),
    { message: 'At least one transaction selector is required.' },
  )

const transactionLabelRuleMatchSchema = z
  .object({
    merchantId: z.string().min(1).optional(),
    merchantIds: z.array(z.string().min(1)).optional(),
    merchantName: z.string().min(1).optional(),
    merchantNames: z.array(z.string().min(1)).optional(),
    q: z.string().min(1).optional(),
    textPattern: z.string().min(1).optional(),
    accountId: z.string().min(1).optional(),
    direction: z.enum(['income', 'expense', 'transfer']).optional(),
    category: z.string().min(1).optional(),
    currencyCode: z.string().min(1).optional(),
    minAmount: z.number().min(0).optional(),
    maxAmount: z.number().min(0).optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .refine(
    (match) =>
      Boolean(
        match.merchantId ||
          match.merchantIds?.length ||
          match.merchantName ||
          match.merchantNames?.length ||
          match.q ||
          match.textPattern ||
          match.accountId ||
          match.direction ||
          match.category ||
          match.currencyCode ||
          match.minAmount !== undefined ||
          match.maxAmount !== undefined ||
          match.startDate ||
          match.endDate,
      ),
    { message: 'At least one rule match field is required.' },
  )

const transactionLabelRuleScopeSchema = z.enum(['merchant', 'pattern'])

const transactionLabelRuleCreateRequestSchema = z
  .object({
    id: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    scope: transactionLabelRuleScopeSchema.default('merchant'),
    match: transactionLabelRuleMatchSchema.optional(),
    selector: transactionLabelSelectorSchema.optional(),
    namespace: z.string().min(1),
    values: z.record(z.string(), extensionPrimitiveSchema),
    createdBy: z.enum(['user', 'agent']).default('user'),
    confidence: z.number().min(0).max(1).optional(),
    status: z.enum(['active', 'disabled']).default('active'),
    applyExisting: z.boolean().default(true),
    dryRun: z.boolean().default(false),
  })
  .refine((request) => Boolean(request.match || request.selector), {
    message: 'A rule match or transaction selector is required.',
  })

const transactionLabelRequestSchema = z.object({
  selector: transactionLabelSelectorSchema,
  namespace: z.string().min(1),
  values: z.record(z.string(), extensionPrimitiveSchema),
  source: z.enum(['user', 'agent', 'rule', 'provider']).default('agent'),
  confidence: z.number().min(0).max(1).optional(),
  dryRun: z.boolean().default(false),
  teachRule: z.boolean().default(false),
  rule: z
    .object({
      id: z.string().min(1).optional(),
      name: z.string().min(1).optional(),
      scope: transactionLabelRuleScopeSchema.default('merchant'),
      match: transactionLabelRuleMatchSchema.optional(),
    })
    .optional(),
})

const transactionClassificationRequestSchema = z.object({
  selector: transactionLabelSelectorSchema,
  targetNamespaces: z.array(z.string().min(1)).min(1).max(8),
  instructions: z.string().max(2000).optional(),
  model: z.string().min(1).default('openai/gpt-5.5'),
  maxTransactions: z.number().int().min(1).max(100).default(50),
  saveProposals: z.boolean().default(true),
  apply: z.boolean().default(false),
  minConfidenceToApply: z.number().min(0).max(1).default(0.9),
})

const transactionClassificationProposalSchema = z.object({
  transactionId: z.string().min(1),
  namespace: z.string().min(1),
  values: z.record(z.string(), extensionPrimitiveSchema),
  confidence: z.number().min(0).max(1),
  reason: z.string().optional(),
})

const transactionClassificationResultSchema = z.object({
  proposals: z.array(transactionClassificationProposalSchema),
})

const transactionReviewQueueReasonSchema = z.enum([
  'needs_review',
  'has_proposals',
  'has_recommendations',
  'missing_namespace',
  'unlabeled',
  'recurring',
])

const transactionReviewQueueQuerySchema = z.object({
  reason: transactionReviewQueueReasonSchema.default('needs_review'),
  namespace: z.string().min(1).optional(),
  q: z.string().min(1).optional(),
  accountId: z.string().min(1).optional(),
  direction: z.enum(['income', 'expense', 'transfer']).optional(),
  category: z.string().min(1).optional(),
  currencyCode: z.string().min(1).optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  cursor: z.string().optional(),
})

const transactionReviewGroupsQuerySchema =
  transactionReviewQueueQuerySchema.extend({
    groupBy: z.enum(['merchant']).default('merchant'),
    minCount: z.coerce.number().int().min(1).max(500).default(1),
    sort: z.enum(['impact', 'priority', 'count', 'recency']).default('impact'),
    transactionSampleLimit: z.coerce.number().int().min(0).max(25).default(10),
    includeTransactions: queryBooleanSchema.default(true),
    includeTransactionIds: queryBooleanSchema.default(true),
  })

const transactionReviewGroupSuggestionApplySchema =
  transactionReviewGroupsQuerySchema.extend({
    reason: z.literal('has_proposals').default('has_proposals'),
    dryRun: z.boolean().default(true),
    maxGroups: z.number().int().min(1).max(50).default(25),
    minConfidence: z.number().min(0).max(1).default(0),
    includeResultDetails: z.boolean().default(false),
  })

const merchantReviewStatusSchema = z.enum([
  'needs-group',
  'grouped',
  'low-volume',
  'all',
])

const merchantReviewQuerySchema = z.object({
  status: merchantReviewStatusSchema.default('needs-group'),
  minTransactions: z.coerce.number().int().min(1).max(100).default(2),
  minExpenses: z.coerce.number().min(0).default(100),
  transactionSampleLimit: z.coerce.number().int().min(0).max(25).default(5),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  cursor: z.string().optional(),
})

const transactionLabelPlanQuerySchema = z.object({
  namespaces: z.string().optional(),
  includeComplete: queryBooleanSchema.default(false),
  limitPerJob: z.coerce.number().int().min(1).max(100).default(50),
})

const recurringSeriesNamespaceSchema = z.enum([
  'subscription',
  'recurringObligation',
])
const recurringSeriesStatusSchema = z.enum([
  'active',
  'stale',
  'skipped',
  'dismissed',
  'all',
])

const recurringSeriesQuerySchema = z.object({
  namespace: recurringSeriesNamespaceSchema.optional(),
  status: recurringSeriesStatusSchema.default('active'),
  dueWithinDays: z.coerce.number().int().min(0).max(730).optional(),
  minConfidence: z.coerce.number().min(0).max(1).optional(),
  includeTransactionIds: queryBooleanSchema.default(true),
  includeReviewActions: queryBooleanSchema.default(true),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  cursor: z.string().optional(),
})

const moneyFlowRoleSchema = z.enum([
  'source',
  'destination',
  'bridge',
  'transfer',
  'fee',
  'external_spend',
  'ignored',
])

const moneyFlowStatusSchema = z.enum([
  'all',
  'needs-review',
  'balanced',
  'external',
  'unbalanced',
  'incomplete',
])

const moneyFlowQuerySchema = z.object({
  status: moneyFlowStatusSchema.default('all'),
  flowId: z.string().min(1).optional(),
  role: moneyFlowRoleSchema.optional(),
  reportingCurrency: z.string().min(1).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  includeTransactions: queryBooleanSchema.default(true),
  includeTransactionIds: queryBooleanSchema.default(true),
  includeCandidateSearches: queryBooleanSchema.default(true),
  candidateSearchLimit: z.coerce.number().int().min(0).max(100).default(25),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  cursor: z.string().optional(),
})

const moneyFlowExternalDestinationRequestSchema = z.object({
  flowId: z.string().min(1),
  transactionId: z.string().min(1).optional(),
  targetCurrency: z.string().min(1).optional(),
  reportingCurrency: z.string().min(1).optional(),
  externalAccountName: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
  source: z.enum(['user', 'agent']).default('agent'),
  confidence: z.number().min(0).max(1).default(0.9),
  dryRun: z.boolean().default(false),
})

const balanceSnapshotQuerySchema = z.object({
  kind: z
    .enum([
      'account',
      'holding',
      'netWorth',
      'assets',
      'liabilities',
      'investment',
    ])
    .optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(200),
  offset: z.coerce.number().int().min(0).default(0),
  cursor: z.string().optional(),
})

const rpcRequestSchema = z.object({
  method: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional(),
})

const formulaPreviewRpcParamsSchema = formulaRequestSchema.extend({
  format: moneyValueFormatSchema.default('number'),
  outputType: formulaOutputTypeSchema.optional(),
})

const cardRefreshRpcParamsSchema = z.object({
  id: z.string().min(1),
})

const plaidConnectSessionRpcParamsSchema = z.object({
  products: z.array(z.string().min(1)).optional(),
  optionalProducts: z.array(z.string().min(1)).optional(),
  additionalConsentedProducts: z.array(z.string().min(1)).optional(),
  itemId: z.string().min(1).optional(),
  countryCodes: z.array(z.string().min(2)).optional(),
  transactionsDaysRequested: z.number().optional(),
  timeoutMs: z.number().optional(),
})

const plaidConnectSessionsRpcParamsSchema = z.object({
  sessions: z
    .array(
      plaidConnectSessionRpcParamsSchema.extend({
        itemId: z.string().min(1),
        additionalConsentedProducts: z.array(z.string().min(1)).min(1),
      }),
    )
    .min(1)
    .max(20),
  timeoutMs: z.number().optional(),
})

const connectionSyncRpcParamsSchema = z.object({
  itemId: z.string().min(1),
})

const connectionDeleteRpcParamsSchema = z.object({
  itemId: z.string().min(1),
})

const debtPatchRpcParamsSchema = debtPatchSchema.extend({
  id: z.string().min(1),
})

const syncSettingsPatchSchema = z.object({
  scheduledRefreshEnabled: z.boolean().optional(),
  intervalMinutes: z
    .number()
    .int()
    .min(MIN_SYNC_INTERVAL_MINUTES)
    .max(MAX_SYNC_INTERVAL_MINUTES)
    .optional(),
})

const attentionSettingsPatchSchema = z.object({
  largeTransactionThreshold: z.number().min(0).max(1_000_000).optional(),
  lookbackDays: z.number().int().min(1).max(365).optional(),
  categoryThresholds: z
    .array(
      z.object({
        category: z.string().min(1),
        monthlyLimit: z.number().min(0).max(1_000_000),
        enabled: z.boolean().default(true),
      }),
    )
    .max(50)
    .optional(),
})

const dataModePatchSchema = z.object({
  dataMode: z.enum(['live', 'demo']),
})

const currencySettingsPatchSchema = z.object({
  reportingCurrency: z.string().trim().min(3).max(12),
})

const fxRateSchema = z.object({
  id: z.string().min(1).optional(),
  baseCurrency: z.string().trim().min(3).max(12),
  quoteCurrency: z.string().trim().min(3).max(12),
  rate: z.number().positive(),
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.enum(['user', 'agent', 'provider', 'market']).default('agent'),
  status: z.enum(['locked', 'estimated']).default('estimated'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

const fxRatesPutSchema = z.object({
  rates: z.array(fxRateSchema).max(5000),
})

const runDueRequestSchema = z.object({
  force: z.boolean().optional(),
})

const warehouseRebuildRequestSchema = z.object({
  async: queryBooleanSchema.default(false),
  scope: z.enum(['full', 'dirty']).default('full'),
})

const rawImportQuerySchema = z.object({
  async: queryBooleanSchema.default(false),
})

const rawPlaidQuerySchema = z.object({
  itemId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  includeResponses: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
})

const FORMULA_OPERATORS = [
  '+',
  '-',
  '*',
  '/',
  '%',
  '=',
  '!=',
  '<',
  '<=',
  '>',
  '>=',
  'and',
  'or',
  'not',
] as const

const FORMULA_LITERALS = [
  {
    kind: 'number',
    examples: ['42', '3.14'],
  },
  {
    kind: 'string',
    examples: ['"Food"'],
  },
  {
    kind: 'boolean',
    examples: ['true', 'false'],
  },
  {
    kind: 'date',
    examples: ['2026-06-03'],
  },
  {
    kind: 'duration',
    examples: ['6mo', '2years'],
  },
] as const

const REPORTING_FORMULA_FIELDS = [
  { name: 'reportingCurrency', type: 'string' },
  { name: 'reportingValue', type: 'number' },
  { name: 'reportingValueStatus', type: 'string' },
  { name: 'reportingFxRate', type: 'number' },
  { name: 'reportingFxAsOf', type: 'date' },
  { name: 'reportingFxSource', type: 'string' },
] as const

const FORMULA_ENTITY_SCHEMAS = [
  {
    id: 'account',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'institutionName', type: 'string' },
      { name: 'type', type: 'string' },
      { name: 'subtype', type: 'string' },
      { name: 'currency', type: 'string' },
      { name: 'currencyCode', type: 'string' },
      { name: 'isoCurrencyCode', type: 'string' },
      { name: 'currentBalance', type: 'number' },
      {
        name: 'balance',
        type: 'number',
        description: 'Absolute summable balance.',
      },
      { name: 'creditLimit', type: 'number' },
      { name: 'availableCredit', type: 'number' },
      { name: 'utilization', type: 'number' },
      { name: 'investmentAccountKind', type: 'string' },
      { name: 'taxTreatment', type: 'string' },
      { name: 'liquidity', type: 'string' },
      { name: 'liquidityClass', type: 'string' },
      { name: 'liquidityTier', type: 'number' },
      { name: 'contributionLimitAnnual', type: 'number' },
      { name: 'contributionLimitYear', type: 'number' },
      { name: 'isAsset', type: 'boolean' },
      { name: 'isLiability', type: 'boolean' },
      { name: 'asOf', type: 'date' },
      ...REPORTING_FORMULA_FIELDS,
    ],
  },
  {
    id: 'transaction',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'accountId', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'merchantName', type: 'string' },
      {
        name: 'amount',
        type: 'number',
        description: 'Positive normalized value.',
      },
      { name: 'direction', type: 'string' },
      { name: 'currency', type: 'string' },
      { name: 'currencyCode', type: 'string' },
      { name: 'isoCurrencyCode', type: 'string' },
      { name: 'category', type: 'string' },
      { name: 'providerCategoryPrimary', type: 'string' },
      { name: 'providerCategoryDetailed', type: 'string' },
      { name: 'providerPaymentChannel', type: 'string' },
      { name: 'transferReason', type: 'string' },
      { name: 'userCategory', type: 'string' },
      { name: 'pending', type: 'boolean' },
      { name: 'recurring', type: 'boolean' },
      { name: 'cadence', type: 'string' },
      { name: 'need', type: 'string' },
      { name: 'recurringStatus', type: 'string' },
      { name: 'recurringConfidence', type: 'number' },
      { name: 'confidence', type: 'number' },
      { name: 'observedCount', type: 'number' },
      { name: 'firstDate', type: 'date' },
      { name: 'amountVariancePercent', type: 'number' },
      { name: 'joy', type: 'string' },
      { name: 'sharedStatus', type: 'string' },
      { name: 'sharedExpense_status', type: 'string' },
      { name: 'sharedExpense_personId', type: 'string' },
      { name: 'sharedExpense_amount', type: 'number' },
      { name: 'sharedExpense_percent', type: 'number' },
      { name: 'sharedExpense_dueDate', type: 'date' },
      { name: 'sharedExpense_settledAt', type: 'date' },
      { name: 'dueDate', type: 'date' },
      { name: 'settledAt', type: 'date' },
      { name: 'moneyFlowId', type: 'string' },
      { name: 'moneyFlowRole', type: 'string' },
      { name: 'moneyFlow_flowId', type: 'string' },
      { name: 'moneyFlow_role', type: 'string' },
      { name: 'moneyFlow_status', type: 'string' },
      { name: 'moneyFlow_sourceCurrency', type: 'string' },
      { name: 'moneyFlow_targetCurrency', type: 'string' },
      { name: 'moneyFlow_sourceAmount', type: 'number' },
      { name: 'moneyFlow_targetAmount', type: 'number' },
      { name: 'moneyFlow_feeAmount', type: 'number' },
      { name: 'moneyFlow_fxRate', type: 'number' },
      { name: 'moneyFlow_reportingCurrency', type: 'string' },
      { name: 'moneyFlow_reportingValue', type: 'number' },
      { name: 'moneyFlow_reportingValueStatus', type: 'string' },
      { name: 'moneyFlow_reportingFxRate', type: 'number' },
      { name: 'moneyFlow_reportingFxAsOf', type: 'date' },
      { name: 'moneyFlow_reportingFxSource', type: 'string' },
      { name: 'taxContribution', type: 'string' },
      { name: 'taxContributionSource', type: 'string' },
      { name: 'reviewActionStatus', type: 'string' },
      { name: 'reviewActionType', type: 'string' },
      { name: 'recommendationSeverity', type: 'string' },
      { name: 'estimatedImpact', type: 'number' },
      { name: 'scenarioId', type: 'string' },
      { name: 'subscriptionKey', type: 'string' },
      { name: 'nextDueDate', type: 'date' },
      { name: 'isIncome', type: 'boolean' },
      { name: 'isExpense', type: 'boolean' },
      { name: 'date', type: 'date' },
      ...REPORTING_FORMULA_FIELDS,
    ],
  },
  {
    id: 'holding',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'accountId', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'tickerSymbol', type: 'string' },
      { name: 'type', type: 'string' },
      { name: 'assetClass', type: 'string' },
      { name: 'accountSubtype', type: 'string' },
      { name: 'accountName', type: 'string' },
      { name: 'investmentAccountKind', type: 'string' },
      { name: 'taxTreatment', type: 'string' },
      { name: 'currency', type: 'string' },
      { name: 'currencyCode', type: 'string' },
      { name: 'isoCurrencyCode', type: 'string' },
      { name: 'quantity', type: 'number' },
      { name: 'price', type: 'number' },
      { name: 'marketValue', type: 'number' },
      { name: 'asOf', type: 'date' },
      ...REPORTING_FORMULA_FIELDS,
    ],
  },
  {
    id: 'debt',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'accountId', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'type', type: 'string' },
      { name: 'currency', type: 'string' },
      { name: 'currencyCode', type: 'string' },
      { name: 'balance', type: 'number' },
      { name: 'apr', type: 'number' },
      { name: 'creditLimit', type: 'number' },
      { name: 'availableCredit', type: 'number' },
      { name: 'statementBalance', type: 'number' },
      { name: 'utilization', type: 'number' },
      { name: 'minimumPayment', type: 'number' },
      { name: 'nextPaymentDueDate', type: 'date' },
      { name: 'isOverdue', type: 'boolean' },
      ...REPORTING_FORMULA_FIELDS,
    ],
  },
  {
    id: 'merchant',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'displayName', type: 'string' },
      { name: 'transactionCount', type: 'number' },
      { name: 'income', type: 'number' },
      { name: 'expenses', type: 'number' },
      { name: 'netAmount', type: 'number' },
      { name: 'lastTransactionDate', type: 'date' },
    ],
  },
  {
    id: 'person',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'displayName', type: 'string' },
      { name: 'transactionCount', type: 'number' },
      { name: 'amountOwedToMe', type: 'number' },
      { name: 'amountIOwe', type: 'number' },
      { name: 'amountSettled', type: 'number' },
      { name: 'lastActivityDate', type: 'date' },
    ],
  },
  {
    id: 'recommendation',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'kind', type: 'string' },
      { name: 'status', type: 'string' },
      { name: 'severity', type: 'string' },
      { name: 'title', type: 'string' },
      { name: 'reason', type: 'string' },
      { name: 'source', type: 'string' },
      { name: 'confidence', type: 'number' },
      { name: 'estimatedImpact', type: 'number' },
      { name: 'amount', type: 'number' },
      { name: 'scenarioId', type: 'string' },
      { name: 'sourceEntity', type: 'string' },
      { name: 'sourceEntityId', type: 'string' },
      { name: 'createdAt', type: 'date' },
      { name: 'updatedAt', type: 'date' },
    ],
  },
  {
    id: 'balanceSnapshot',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'kind', type: 'string' },
      { name: 'date', type: 'date' },
      { name: 'asOf', type: 'date' },
      { name: 'value', type: 'number' },
      { name: 'amount', type: 'number' },
      { name: 'balance', type: 'number' },
      { name: 'source', type: 'string' },
      { name: 'accountId', type: 'string' },
      { name: 'holdingId', type: 'string' },
      { name: 'itemId', type: 'string' },
      { name: 'institutionName', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'accountType', type: 'string' },
      { name: 'accountSubtype', type: 'string' },
      { name: 'assetClass', type: 'string' },
      { name: 'createdAt', type: 'date' },
      ...REPORTING_FORMULA_FIELDS,
    ],
  },
  {
    id: 'recurring',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'merchantName', type: 'string' },
      { name: 'amount', type: 'number' },
      { name: 'category', type: 'string' },
      { name: 'date', type: 'date' },
      { name: 'recurring', type: 'boolean' },
      { name: 'cadence', type: 'string' },
      { name: 'need', type: 'string' },
      { name: 'recurringStatus', type: 'string' },
      { name: 'recurringConfidence', type: 'number' },
      { name: 'confidence', type: 'number' },
      { name: 'observedCount', type: 'number' },
      { name: 'firstDate', type: 'date' },
      { name: 'amountVariancePercent', type: 'number' },
      { name: 'subscriptionKey', type: 'string' },
      { name: 'nextDueDate', type: 'date' },
      ...REPORTING_FORMULA_FIELDS,
    ],
  },
] as const

const FORMULA_METHOD_SCHEMAS = [
  {
    name: 'Where',
    target: 'collection',
    args: [{ name: 'predicate', type: 'boolean-expression' }],
    returns: 'collection',
    examples: ['Expenses.Where(category = "Food").Sum()'],
  },
  {
    name: 'Sum',
    target: 'collection',
    args: [],
    returns: 'number',
    examples: ['Accounts.Sum()'],
  },
  {
    name: 'Count',
    target: 'collection',
    args: [],
    returns: 'count',
    examples: ['Subscriptions.Monthly().Count()'],
  },
  {
    name: 'Average',
    target: 'collection',
    args: [],
    returns: 'number',
    examples: ['Expenses.Average()'],
  },
  {
    name: 'Min',
    target: 'collection',
    args: [],
    returns: 'number',
    examples: ['Expenses.Min()'],
  },
  {
    name: 'Max',
    target: 'collection',
    args: [],
    returns: 'number',
    examples: ['Expenses.Max()'],
  },
  {
    name: 'ThisMonth',
    target: 'collection',
    args: [],
    returns: 'collection',
    examples: ['Expenses.ThisMonth().Sum()'],
  },
  {
    name: 'LastMonth',
    target: 'collection',
    args: [],
    returns: 'collection',
    examples: ['Expenses.LastMonth().Sum()'],
  },
  {
    name: 'YTD',
    target: 'collection',
    args: [],
    returns: 'collection',
    examples: ['Income.YTD().Sum()', 'Expenses.YTD().Monthly().Trend()'],
  },
  {
    name: 'ThisYear',
    target: 'collection',
    args: [],
    returns: 'collection',
    examples: ['Income.ThisYear().Sum()'],
  },
  {
    name: 'LastYear',
    target: 'collection',
    args: [],
    returns: 'collection',
    examples: ['Expenses.LastYear().Sum()'],
  },
  {
    name: 'Between',
    target: 'collection',
    args: [
      { name: 'start', type: 'date' },
      { name: 'end', type: 'date' },
    ],
    returns: 'collection',
    examples: ['Expenses.Between(2026-01-01, 2026-03-31).Sum()'],
  },
  {
    name: 'PreviousPeriod',
    target: 'windowed-collection',
    args: [],
    returns: 'collection',
    examples: [
      'ChangeVs(Expenses.ThisMonth().Sum(), Expenses.ThisMonth().PreviousPeriod().Sum())',
      'Expenses.Rolling(30d).PreviousPeriod().Sum()',
    ],
  },
  {
    name: 'DueSoon',
    target: 'collection',
    args: [
      { name: 'duration', type: 'duration', optional: true, default: '30d' },
    ],
    returns: 'collection',
    examples: [
      'RecurringObligations.DueSoon(45d).Unique(key).Sum()',
      'Subscriptions.DueSoon(30d).Unique(subscriptionKey).Count()',
    ],
  },
  {
    name: 'Rolling',
    target: 'collection',
    args: [
      { name: 'duration', type: 'duration', optional: true, default: '30d' },
    ],
    returns: 'collection',
    examples: ['Expenses.Rolling(30d).Sum()', 'Income.Rolling(6mo).Sum()'],
  },
  {
    name: 'Daily',
    target: 'collection',
    args: [],
    returns: 'collection',
    examples: ['Expenses.Daily().Trend()'],
  },
  {
    name: 'Weekly',
    target: 'collection',
    args: [],
    returns: 'collection',
    examples: ['Expenses.Weekly().Trend()'],
  },
  {
    name: 'Monthly',
    target: 'collection',
    args: [],
    returns: 'collection',
    examples: ['Subscriptions.Monthly().Trend()'],
  },
  {
    name: 'Yearly',
    target: 'collection',
    args: [],
    returns: 'collection',
    examples: ['Income.Yearly().Trend()'],
  },
  {
    name: 'PeriodSum',
    target: 'collection',
    args: [],
    returns: 'number',
    examples: ['Expenses.ThisMonth().PeriodSum()'],
  },
  {
    name: 'PeriodAverage',
    target: 'collection',
    args: [{ name: 'periods', type: 'number', optional: true }],
    returns: 'number',
    examples: ['Expenses.Rolling(6mo).Monthly().PeriodAverage(6)'],
  },
  {
    name: 'MonthlyAverage',
    target: 'collection',
    args: [{ name: 'months', type: 'number', optional: true, default: 6 }],
    returns: 'number',
    examples: ['Expenses.MonthlyAverage(6)'],
  },
  {
    name: 'Unique',
    target: 'collection',
    args: [{ name: 'field', type: 'field-reference' }],
    returns: 'collection',
    examples: ['Subscriptions.ThisMonth().Unique(subscriptionKey).Count()'],
  },
  {
    name: 'Limit',
    target: 'collection',
    args: [
      { name: 'count', type: 'number' },
      { name: 'offset', type: 'number', optional: true, default: 0 },
    ],
    returns: 'collection',
    examples: ['Expenses.Sort(amount, "desc").Limit(25, 50)'],
  },
  {
    name: 'Offset',
    target: 'collection',
    args: [{ name: 'offset', type: 'number' }],
    returns: 'collection',
    examples: ['Expenses.Sort(date, "desc").Offset(100).Limit(25)'],
  },
  {
    name: 'Sort',
    target: 'collection',
    args: [
      { name: 'field', type: 'field-reference', optional: true },
      {
        name: 'direction',
        type: 'string',
        optional: true,
        values: ['asc', 'desc'],
      },
    ],
    returns: 'collection',
    examples: ['Expenses.Sort(amount, "desc")'],
  },
  {
    name: 'Top',
    target: 'collection',
    args: [
      { name: 'count', type: 'number' },
      { name: 'field', type: 'field-reference', optional: true },
    ],
    returns: 'collection',
    examples: ['Expenses.Top(5, amount)'],
  },
  {
    name: 'Bottom',
    target: 'collection',
    args: [
      { name: 'count', type: 'number' },
      { name: 'field', type: 'field-reference', optional: true },
    ],
    returns: 'collection',
    examples: ['Expenses.Bottom(5, amount)'],
  },
  {
    name: 'MinBy',
    target: 'collection',
    args: [{ name: 'field', type: 'field-reference' }],
    returns: 'collection',
    examples: ['Debt.MinBy(apr)'],
  },
  {
    name: 'MaxBy',
    target: 'collection',
    args: [{ name: 'field', type: 'field-reference' }],
    returns: 'collection',
    examples: ['Debt.MaxBy(apr)'],
  },
  {
    name: 'GroupBy',
    target: 'collection',
    args: [{ name: 'field', type: 'field-reference' }],
    returns: 'table',
    examples: ['Expenses.GroupBy(category)'],
  },
  {
    name: 'Trend',
    target: 'collection',
    args: [],
    returns: 'series',
    examples: ['Expenses.Trend()'],
  },
  {
    name: 'MovingAverage',
    target: 'series',
    args: [{ name: 'periods', type: 'number', optional: true, default: 3 }],
    returns: 'series',
    examples: ['Expenses.Monthly().Trend().MovingAverage(3)'],
  },
  {
    name: 'Cumulative',
    target: 'series',
    args: [],
    returns: 'series',
    examples: ['Investments.Monthly().Trend().Cumulative()'],
  },
  {
    name: 'PercentOfTotal',
    target: 'collection-or-table',
    args: [],
    returns: 'percent-or-table',
    examples: ['Expenses.GroupBy(category).PercentOfTotal()'],
  },
] as const

const FORMULA_FUNCTION_SCHEMAS = [
  {
    name: 'Runway',
    args: [
      { name: 'cash', type: 'number' },
      { name: 'monthlySpend', type: 'number' },
    ],
    returns: 'duration',
    examples: ['Runway(Cash.Sum(), Expenses.MonthlyAverage(6))'],
  },
  {
    name: 'SavingsRate',
    args: [
      { name: 'income', type: 'number' },
      { name: 'expenses', type: 'number' },
    ],
    returns: 'percent',
    examples: ['SavingsRate(Income.Sum(), Expenses.Sum())'],
  },
  {
    name: 'ChangeVs',
    args: [
      { name: 'current', type: 'number' },
      { name: 'previous', type: 'number' },
    ],
    returns: 'percent',
    examples: ['ChangeVs(Expenses.Sum(), 3500)'],
  },
  {
    name: 'TableChange',
    args: [
      { name: 'current', type: 'table' },
      { name: 'previous', type: 'table' },
    ],
    returns: 'table',
    examples: [
      'TableChange(Expenses.ThisMonth().GroupBy(category).PercentOfTotal(), Expenses.LastMonth().GroupBy(category).PercentOfTotal())',
    ],
  },
  {
    name: 'Aging',
    args: [
      { name: 'collection', type: 'collection' },
      {
        name: 'dueField',
        type: 'field-reference',
        optional: true,
        default: 'nextDueDate',
      },
    ],
    returns: 'table',
    examples: ['Aging(SharedExpenses.Where(status = "owed"), dueDate)'],
  },
  {
    name: 'DebtPayoff',
    args: [
      { name: 'debts', type: 'collection-or-number' },
      { name: 'monthlyBudget', type: 'number', optional: true },
      {
        name: 'strategy',
        type: 'string',
        optional: true,
        values: ['avalanche', 'snowball', 'highest-balance'],
      },
    ],
    returns: 'table-or-number',
    examples: [
      'DebtPayoff(Debt.Where(balance > 0 and apr > 0), 500, "avalanche")',
      'DebtPayoff(Debt.Sum())',
    ],
  },
  {
    name: 'InterestDrag',
    args: [
      { name: 'debts', type: 'collection' },
      {
        name: 'period',
        type: 'string',
        optional: true,
        default: 'annual',
        values: ['annual', 'monthly', 'daily'],
      },
    ],
    returns: 'money',
    examples: [
      'InterestDrag(Debt.Where(balance > 0 and apr > 0))',
      'InterestDrag(Debt.Where(apr > 0.15), "monthly")',
    ],
  },
  {
    name: 'AllocationDrift',
    args: [
      { name: 'allocation', type: 'table' },
      { name: 'target', type: 'string', optional: true },
    ],
    returns: 'table',
    examples: [
      'AllocationDrift(Investments.GroupBy(assetClass).PercentOfTotal(), "default")',
      'AllocationDrift(Investments.GroupBy(assetClass).PercentOfTotal(), "funds:0.90,cash:0.10")',
      'AllocationDrift(Investments.GroupBy(assetClass).PercentOfTotal(), "stocks:80%,bonds:20%")',
    ],
  },
  {
    name: 'CreditUtilization',
    args: [{ name: 'cards', type: 'collection' }],
    returns: 'table',
    examples: [
      'CreditUtilization(CardAccounts.Where(creditLimit > 0))',
      'CreditUtilization(Debt.Where(type = "credit"))',
    ],
  },
  {
    name: 'FreedomAge',
    args: [
      { name: 'assets', type: 'number' },
      { name: 'monthlyExpenses', type: 'number', optional: true },
      { name: 'monthlyIncome', type: 'number', optional: true },
      { name: 'currentAge', type: 'number', optional: true, default: 0 },
      {
        name: 'withdrawalRate',
        type: 'percent',
        optional: true,
        default: 0.04,
      },
      { name: 'maxAge', type: 'number', optional: true, default: 99 },
    ],
    returns: 'number',
    examples: [
      'FreedomAge(Assets.Sum(), Expenses.MonthlyAverage(6), Income.MonthlyAverage(6), 42)',
      'FreedomAge(Assets.Sum(), Expenses.MonthlyAverage(6), Income.MonthlyAverage(6), 42, 0.04, 99)',
    ],
  },
  {
    name: 'Forecast',
    args: [
      { name: 'value', type: 'number-or-series' },
      { name: 'periods', type: 'number', optional: true, default: 3 },
      { name: 'confidence', type: 'percent', optional: true },
    ],
    returns: 'forecast',
    examples: [
      'Forecast(Expenses.MonthlyAverage(6))',
      'Forecast(Expenses.Monthly().Trend(), 3, 0.8)',
    ],
  },
  {
    name: 'ForecastScenario',
    args: [
      { name: 'value', type: 'number-or-series' },
      {
        name: 'scenarioId',
        type: 'string',
        optional: true,
        default: 'default',
      },
      { name: 'periods', type: 'number', optional: true },
    ],
    returns: 'forecast',
    examples: [
      'ForecastScenario(Expenses.MonthlyAverage(6), "default")',
      'ForecastScenario(Expenses.Monthly().Trend(), "trim-subscriptions", 6)',
    ],
  },
  {
    name: 'ContributionRoom',
    args: [
      { name: 'contributions', type: 'collection' },
      {
        name: 'type',
        type: 'string',
        optional: true,
        values: ['401k', 'ira', 'hsa', '529'],
      },
      { name: 'taxYear', type: 'number', optional: true },
      {
        name: 'variant',
        type: 'string',
        optional: true,
        values: ['standard', 'self', 'family'],
      },
    ],
    returns: 'table',
    examples: [
      'ContributionRoom(TaxContributions.ThisYear())',
      'ContributionRoom(TaxContributions.ThisYear(), "401k", 2026)',
      'ContributionRoom(TaxContributions.ThisYear(), "hsa", 2026, "self")',
    ],
  },
] as const

export const moneyRoutes = new Hono()

function devSeedEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' ||
    process.env.MONEY_ENABLE_DEV_SEED === 'true'
  )
}

moneyRoutes.get('/api/money/snapshot', async (c) => {
  return c.json(
    await cachedReadResponse(c, 'money-snapshot', async () => {
      const [formulaData, cardDefinitions] = await Promise.all([
        readVisibleFormulaData(c),
        readCardDefinitions(c, DEFAULT_CARD_DEFINITIONS),
      ])
      const snapshot: MoneySnapshot = {
        generatedAt: new Date().toISOString(),
        accounts: formulaData.accounts,
        transactions: formulaData.transactions,
        debts: formulaData.debts ?? [],
        holdings: formulaData.holdings ?? [],
        balanceSnapshots: formulaData.balanceSnapshots ?? [],
        merchants: formulaData.merchants ?? [],
        persons: formulaData.persons ?? [],
        recommendations: formulaData.recommendations ?? [],
        collections: buildCollections(formulaData),
        cards: evaluateCards(formulaData, cardDefinitions),
      }
      return snapshot
    }),
  )
})

moneyRoutes.get('/api/cards', async (c) => {
  return c.json(
    await cachedReadResponse(c, 'cards', () => readOrBuildCardsProjection(c)),
  )
})

moneyRoutes.get('/api/cards/readiness', async (c) => {
  const parsed = cardReadinessQuerySchema.safeParse(c.req.query())
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_card_readiness_query',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  return c.json(await buildCardReadinessList(c, parsed.data))
})

moneyRoutes.get('/api/cards/templates', async (c) => {
  const parsed = cardTemplateQuerySchema.safeParse(c.req.query())
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_card_template_query',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  return c.json(await buildCardTemplateList(c, parsed.data))
})

moneyRoutes.get('/api/cards/:id/transactions', async (c) => {
  const parsed = cardTransactionQuerySchema.safeParse({
    ...c.req.query(),
    cardId: c.req.param('id'),
  })
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_card_transaction_query',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const result = await buildCardTransactionDrilldown(c, parsed.data)
  if (!result.ok) return c.json({ error: result.error }, result.status)
  return c.json(result.value)
})

moneyRoutes.post('/api/cards/evaluate', async (c) => {
  const parsed = formulaRequestSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return jsonError(c, 'formula is required', 400)
  }

  try {
    const formulaData = await readVisibleFormulaData(c)
    const collections = buildCollections(formulaData)
    return c.json({
      formula: parsed.data.formula,
      value: evaluateFormulaValue(
        parsed.data.formula,
        collections,
        formulaData,
      ),
      collections,
    })
  } catch (error) {
    return c.json(
      {
        error: {
          code: 'formula_evaluation_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Formula evaluation failed',
        },
      },
      400,
    )
  }
})

moneyRoutes.post('/api/cards/test', async (c) => {
  const parsed = cardTestRequestSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_card_test_request',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  return c.json(await testCardDefinitions(c, parsed.data.cards))
})

moneyRoutes.get('/api/collections', async (c) => {
  const formulaData = await readVisibleFormulaData(c)
  const definitions = await readCollectionDefinitions(
    c,
    DEFAULT_COLLECTION_DEFINITIONS,
  )
  return c.json({
    definitions,
    metrics: buildCollections(formulaData),
  })
})

moneyRoutes.post('/api/collections', async (c) => {
  const parsed = collectionDefinitionSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_collection_definition',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const definition: CollectionDefinition = {
    ...parsed.data,
    id: parsed.data.id ?? slugify(parsed.data.name),
  }
  const definitions = upsertById(
    await readCollectionDefinitions(c, DEFAULT_COLLECTION_DEFINITIONS),
    [definition],
  )
  await writeCollectionDefinitions(c, definitions)
  return c.json({ ok: true, definition, definitions })
})

moneyRoutes.get('/api/allocation-targets', async (c) => {
  return c.json({
    targets: await readAllocationTargets(c),
    generatedAt: new Date().toISOString(),
  })
})

moneyRoutes.post('/api/allocation-targets', async (c) => {
  const parsed = allocationTargetSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_allocation_target',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const now = new Date().toISOString()
  const existing = await readAllocationTargets(c)
  const id = parsed.data.id ?? slugify(parsed.data.name)
  const previous = existing.find((target) => target.id === id)
  const target: MoneyAllocationTarget = {
    ...parsed.data,
    id,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  }
  const targets = upsertById(existing, [target])
  await writeAllocationTargets(c, targets)
  const refreshedMetrics = await refreshMaterializedMetrics(c, ['Investments'])

  return c.json({
    ok: true,
    target,
    targets: await readAllocationTargets(c),
    refreshedMetrics,
  })
})

moneyRoutes.get('/api/forecast-scenarios', async (c) => {
  return c.json({
    scenarios: await readForecastScenarios(c),
    generatedAt: new Date().toISOString(),
  })
})

moneyRoutes.post('/api/forecast-scenarios', async (c) => {
  const parsed = forecastScenarioSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_forecast_scenario',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const now = new Date().toISOString()
  const existing = await readForecastScenarios(c)
  const id = parsed.data.id ?? slugify(parsed.data.name)
  const previous = existing.find((scenario) => scenario.id === id)
  const scenario: MoneyForecastScenario = {
    ...parsed.data,
    id,
    changes: parsed.data.changes.map((change, index) => ({
      ...change,
      id: change.id ?? slugify(change.label || `change-${index + 1}`),
    })),
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  }
  const scenarios = upsertById(existing, [scenario])
  await writeForecastScenarios(c, scenarios)
  const refreshedMetrics = await refreshMaterializedMetrics(c, ['Expenses'])
  const savedScenarios = await readForecastScenarios(c)

  return c.json({
    ok: true,
    scenario:
      savedScenarios.find((entry) => entry.id === slugify(id)) ??
      savedScenarios.find((entry) => entry.name === scenario.name),
    scenarios: savedScenarios,
    refreshedMetrics,
  })
})

moneyRoutes.get('/api/tax-contribution-limits', async (c) => {
  return c.json({
    limits: await readTaxContributionLimits(c),
    generatedAt: new Date().toISOString(),
  })
})

moneyRoutes.post('/api/tax-contribution-limits', async (c) => {
  const parsed = taxContributionLimitSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_tax_contribution_limit',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const now = new Date().toISOString()
  const existing = await readTaxContributionLimits(c)
  const id =
    parsed.data.id ??
    slugify(
      `${parsed.data.type}-${parsed.data.taxYear}-${parsed.data.variant ?? 'standard'}`,
    )
  const previous = existing.find((limit) => limit.id === id)
  const limit: MoneyTaxContributionLimit = {
    ...parsed.data,
    id,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  }
  const limits = upsertById(existing, [limit])
  await writeTaxContributionLimits(c, limits)
  const refreshedMetrics = await refreshMaterializedMetrics(c, [
    'TaxContributions',
  ])

  return c.json({
    ok: true,
    limit,
    limits: await readTaxContributionLimits(c),
    refreshedMetrics,
  })
})

moneyRoutes.get('/api/formulas', async (c) => {
  return c.json(await buildFormulasList(c))
})

moneyRoutes.get('/api/formulas/schema', async (c) => {
  return c.json(await buildFormulaSchema(c))
})

moneyRoutes.post('/api/formulas/complete', async (c) => {
  const parsed = formulaCompletionRequestSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_formula_completion_request',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  return c.json(
    await completeFormula(c, parsed.data.formula, parsed.data.cursor),
  )
})

moneyRoutes.post('/api/formulas/preview', async (c) => {
  const parsed = formulaPreviewRpcParamsSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) return jsonError(c, 'formula is required', 400)

  const preview = await previewFormula(
    c,
    parsed.data.formula,
    parsed.data.format,
    parsed.data.outputType,
  )
  if (!preview.ok) return c.json(preview, 400)
  return c.json(preview)
})

moneyRoutes.post('/api/formulas', async (c) => {
  const parsed = formulaDefinitionSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_formula_definition',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const preview = await previewFormula(
    c,
    parsed.data.formula,
    parsed.data.format,
    parsed.data.outputType,
  )
  if (!preview.ok) return c.json(preview, 400)

  const now = new Date().toISOString()
  const id = parsed.data.id ?? slugify(parsed.data.name)
  const existing = await readFormulaDefinitions(c)
  const previous = existing.find((formula) => formula.id === id)
  const definition: MoneyFormulaDefinition = {
    ...parsed.data,
    id,
    referencedCollections: preview.result.referencedCollections,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  }
  const formulas = upsertById(existing, [definition])
  await writeFormulaDefinitions(c, formulas)
  await writeMaterializedMetric(c, {
    ...preview.result,
    id,
    formulaId: id,
  })

  return c.json({ ok: true, formula: definition, result: preview.result })
})

moneyRoutes.post('/api/cards', async (c) => {
  const parsed = cardDefinitionSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_card_definition',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const formula = parsed.data.primaryFormula ?? parsed.data.formula
  if (!formula)
    return jsonError(c, 'formula or primaryFormula is required', 400)

  const saved = await saveCardDefinition(c, parsed.data)
  if (!saved.ok) return c.json(cardRepairPayload(saved, parsed.data), 400)
  return c.json(saved)
})

moneyRoutes.patch('/api/cards/:id', async (c) => {
  const parsed = cardPatchSchema.safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_card_patch',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const id = c.req.param('id')
  const definitions = await readCardDefinitions(c, DEFAULT_CARD_DEFINITIONS)
  const existing = definitions.find((card) => card.id === id)
  if (!existing) return jsonError(c, 'card not found', 404)

  const saved = await saveCardDefinition(c, { ...existing, ...parsed.data, id })
  if (!saved.ok)
    return c.json(
      cardRepairPayload(saved, { ...existing, ...parsed.data, id }),
      400,
    )
  return c.json(saved)
})

moneyRoutes.post('/api/cards/:id/refresh', async (c) => {
  const id = c.req.param('id')
  const definitions = await readCardDefinitions(c, DEFAULT_CARD_DEFINITIONS)
  const definition = definitions.find((card) => card.id === id)
  if (!definition) return jsonError(c, 'card not found', 404)

  const refreshed = await refreshCardDefinition(c, definition)
  if (!refreshed.ok) return c.json(refreshed, 400)
  return c.json(refreshed)
})

moneyRoutes.get('/api/dashboards', async (c) => {
  return c.json(await buildDashboardList(c))
})

moneyRoutes.patch('/api/dashboards/reorder', async (c) => {
  const parsed = dashboardReorderSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_dashboard_reorder',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const result = await reorderDashboards(c, parsed.data.ids)
  if (!result.ok) {
    return c.json(
      {
        error: {
          code: 'unknown_dashboard_ids',
          message: `Unknown dashboard ids: ${result.unknownIds.join(', ')}`,
          unknownIds: result.unknownIds,
        },
      },
      400,
    )
  }
  return c.json(result)
})

moneyRoutes.patch('/api/dashboards/:id', async (c) => {
  const parsed = dashboardPatchSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_dashboard_patch',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const id = c.req.param('id')
  const cardDefinitions = await readCardDefinitions(c, DEFAULT_CARD_DEFINITIONS)
  const dashboards = orderDashboards(
    await readDashboards(c, [
      defaultDashboard(cardDefinitions.map((card) => card.id)),
    ]),
  )
  const existing =
    dashboards.find((dashboard) => dashboard.id === id) ??
    defaultDashboard(
      cardDefinitions.map((card) => card.id),
      id,
      dashboards.length,
    )
  const now = new Date().toISOString()
  const updated: MoneyDashboard = {
    ...existing,
    ...parsed.data,
    id,
    order: parsed.data.order ?? existing.order ?? dashboards.length,
    createdAt: existing.createdAt,
    updatedAt: now,
  }
  const next = normalizeDashboardOrder(upsertById(dashboards, [updated]))
  await writeDashboards(c, next)
  return c.json({
    ok: true,
    dashboard: next.find((dashboard) => dashboard.id === id) ?? updated,
  })
})

moneyRoutes.delete('/api/dashboards/:id', async (c) => {
  const result = await deleteDashboard(c, c.req.param('id'))
  if (!result.ok) return jsonError(c, 'dashboard not found', 404)
  return c.json(result)
})

moneyRoutes.post('/api/import/raw', async (c) => {
  const query = rawImportQuerySchema.safeParse(c.req.query())
  if (!query.success) {
    return c.json(
      {
        error: {
          code: 'invalid_raw_import_query',
          message: z.prettifyError(query.error),
        },
      },
      400,
    )
  }
  const parsed = rawMoneyDataSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_raw_money_data',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  if (query.data.async) {
    const result = await startRawImportJob(c, parsed.data)
    return c.json(result, result.started ? 202 : 200)
  }

  return c.json(await runRawImport(c, parsed.data))
})

moneyRoutes.get('/api/import/status', async (c) => {
  return c.json({
    job: await readImportJob(c),
    warehouse: await buildWarehouseStatus(c),
  })
})

moneyRoutes.post('/api/dev/seed', async (c) => {
  if (!devSeedEnabled()) {
    return c.json(
      {
        error: {
          code: 'dev_seed_disabled',
          message: 'Demo seed data is disabled in production builds.',
        },
      },
      404,
    )
  }

  const existing = await readRawMoneyData(c)
  const next = mergeRawMoneyData(existing, createSeedMoneyData())
  await writeMoneyData(c, next)
  const settings = await readSettings(c)
  await writeSettings(c, {
    ...settings,
    display: {
      dataMode: 'demo',
      updatedAt: new Date().toISOString(),
    },
  })
  const refreshedMetrics = await refreshMaterializedMetrics(c)
  const formulaData = await readVisibleFormulaData(c)
  return c.json({
    ok: true,
    dataMode: 'demo',
    accounts: next.accounts.length,
    transactions: next.transactions.length,
    refreshedMetrics,
    cards: evaluateCards(formulaData),
  })
})

moneyRoutes.get('/api/summary', async (c) => {
  const state = await readVisibleMoneyState(c)
  return c.json({
    ...buildMoneySummary(state.raw, state.debts, state.holdings),
    dataMode: state.dataMode,
  })
})

moneyRoutes.get('/api/data-health', async (c) => {
  return c.json(
    await cachedReadResponse(c, 'data-health', () =>
      readOrBuildDataHealthProjection(c),
    ),
  )
})

moneyRoutes.get('/api/warehouse/status', async (c) => {
  return c.json(await buildWarehouseStatus(c))
})

moneyRoutes.post('/api/warehouse/rebuild', async (c) => {
  const parsed = warehouseRebuildRequestSchema.safeParse(c.req.query())
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_warehouse_rebuild_query',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }
  invalidateMoneyReadCache(c, { markWarehouseDirty: false })
  if (parsed.data.async) {
    const result = await startWarehouseRebuild(c, { scope: parsed.data.scope })
    return c.json(result, result.started ? 202 : 200)
  }
  const result = await rebuildWarehouseProjections(c, {
    scope: parsed.data.scope,
  })
  return c.json(result)
})

moneyRoutes.get('/api/first-run', async (c) => {
  return c.json(await buildFirstRunState(c))
})

moneyRoutes.get('/api/accounts', async (c) => {
  const [accounts, settings, rates] = await Promise.all([
    readVisibleAccounts(c),
    readSettings(c),
    readFxRates(c),
  ])
  const accountsWithReporting = accounts.map((account) =>
    withAccountReportingValue(account, settings, rates),
  )
  return c.json({
    accounts: accountsWithReporting,
    total: accountsWithReporting.length,
  })
})

function withAccountReportingValue(
  account: MoneyAccount,
  settings: MoneySettings,
  rates: MoneyFxRate[],
): MoneyAccount {
  const converted = convertMoney(
    account.valueForSum ?? account.currentBalance,
    account.currencyCode ??
      account.isoCurrencyCode ??
      account.balance?.currencyCode,
    settings.currency.reportingCurrency,
    account.asOf,
    rates,
  )
  if (!converted) return account
  return {
    ...account,
    reportingCurrency: converted.currency,
    reportingValue: converted.amount,
    reportingValueStatus: converted.status,
    reportingFxRate: converted.rate,
    reportingFxAsOf: converted.asOf,
    reportingFxSource: converted.source,
  }
}

moneyRoutes.post('/api/accounts', async (c) => {
  const parsed = manualAccountCreateSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_manual_account',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const accounts = await readAccounts(c)
  const account = buildManualAccount(parsed.data)
  if (accounts.some((entry) => entry.id === account.id)) {
    return c.json(
      {
        error: {
          code: 'account_exists',
          message: `Account ${account.id} already exists.`,
        },
      },
      409,
    )
  }

  const nextAccounts = [...accounts, account]
  const refreshedMetrics = await writeAccountSetAndRefresh(c, nextAccounts)
  return c.json({ account, refreshedMetrics })
})

moneyRoutes.patch('/api/accounts/:id', async (c) => {
  const parsed = manualAccountPatchSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_manual_account_patch',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const id = c.req.param('id')
  const accounts = await readAccounts(c)
  const existing = accounts.find((account) => account.id === id)
  if (!existing) return jsonError(c, `Account ${id} was not found.`, 404)
  if (existing.source !== 'manual') {
    return c.json(
      {
        error: {
          code: 'provider_account_readonly',
          message:
            'Linked provider accounts are read-only; add a manual adjustment account instead.',
        },
      },
      409,
    )
  }

  const nextInput = {
    ...existing,
    ...parsed.data,
    id: existing.id,
  }
  if (
    Object.prototype.hasOwnProperty.call(parsed.data, 'currentBalance') &&
    !Object.prototype.hasOwnProperty.call(parsed.data, 'valueForSum')
  ) {
    nextInput.valueForSum = undefined
  }
  const nextAccount = buildManualAccount(nextInput)
  const nextAccounts = accounts.map((account) =>
    account.id === id ? nextAccount : account,
  )
  const refreshedMetrics = await writeAccountSetAndRefresh(c, nextAccounts)
  return c.json({ account: nextAccount, refreshedMetrics })
})

moneyRoutes.delete('/api/accounts/:id', async (c) => {
  const id = c.req.param('id')
  const accounts = await readAccounts(c)
  const existing = accounts.find((account) => account.id === id)
  if (!existing) return jsonError(c, `Account ${id} was not found.`, 404)
  if (existing.source !== 'manual') {
    return c.json(
      {
        error: {
          code: 'provider_account_readonly',
          message:
            'Linked provider accounts are read-only; disconnect or relink the provider item instead.',
        },
      },
      409,
    )
  }

  const nextAccounts = accounts.filter((account) => account.id !== id)
  const refreshedMetrics = await writeAccountSetAndRefresh(c, nextAccounts)
  return c.json({ deleted: true, id, refreshedMetrics })
})

moneyRoutes.get('/api/debts', async (c) => {
  const debts = (await readVisibleMoneyState(c)).debts
  return c.json({
    debts,
    total: debts.length,
  })
})

moneyRoutes.patch('/api/debts/:id', async (c) => {
  const parsed = debtPatchSchema.safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_debt_patch',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const result = await patchDebtMetadata(c, c.req.param('id'), parsed.data)
  if (!result.ok) return c.json(result, 404)
  return c.json(result)
})

moneyRoutes.get('/api/holdings', async (c) => {
  const holdings = (await readVisibleMoneyState(c)).holdings
  return c.json({
    holdings,
    total: holdings.length,
  })
})

moneyRoutes.get('/api/balance-snapshots', async (c) => {
  const parsed = balanceSnapshotQuerySchema.safeParse(c.req.query())
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_balance_snapshot_query',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const { limit, offset, cursor, ...query } = parsed.data
  const snapshots = await readVisibleBalanceSnapshots(c, query)
  const page = paginateItems(snapshots, { limit, offset, cursor })
  return c.json({
    snapshots: page.items,
    total: snapshots.length,
    limit,
    offset: page.offset,
    hasMore: page.hasMore,
    nextOffset: page.nextOffset,
    nextCursor: page.nextCursor,
  })
})

moneyRoutes.get('/api/merchants', async (c) => {
  const merchants = (await readVisibleFormulaData(c)).merchants ?? []
  return c.json({
    merchants,
    total: merchants.length,
  })
})

moneyRoutes.get('/api/merchants/review', async (c) => {
  const parsed = merchantReviewQuerySchema.safeParse(c.req.query())
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_merchant_review_query',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  return c.json(await buildMerchantReviewQueue(c, parsed.data))
})

moneyRoutes.get('/api/persons', async (c) => {
  const persons = (await readVisibleFormulaData(c)).persons ?? []
  return c.json({
    persons,
    total: persons.length,
  })
})

moneyRoutes.get('/api/recommendations', async (c) => {
  const parsed = recommendationQuerySchema.safeParse(c.req.query())
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_recommendation_query',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }
  const recommendations = recommendationQueryFilter(
    (await readVisibleFormulaData(c)).recommendations ?? [],
    parsed.data,
  )
  const page = paginateItems(recommendations, parsed.data)
  return c.json({
    recommendations: page.items,
    total: recommendations.length,
    limit: page.limit,
    offset: page.offset,
    hasMore: page.hasMore,
    nextOffset: page.nextOffset,
    nextCursor: page.nextCursor,
    counts: recommendationCounts(recommendations),
    filters: recommendationFiltersForResponse(parsed.data),
  })
})

moneyRoutes.get('/api/recommendations/groups', async (c) => {
  const parsed = recommendationGroupQuerySchema.safeParse(c.req.query())
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_recommendation_group_query',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  return c.json(await buildRecommendationGroups(c, parsed.data))
})

moneyRoutes.patch('/api/recommendations', async (c) => {
  const parsed = recommendationBulkPatchSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_recommendation_bulk_patch',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const result = await patchRecommendations(c, parsed.data)
  return c.json(result)
})

moneyRoutes.get('/api/recurring/series', async (c) => {
  const parsed = recurringSeriesQuerySchema.safeParse(c.req.query())
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_recurring_series_query',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  return c.json(await buildRecurringSeriesList(c, parsed.data))
})

moneyRoutes.get('/api/money-flows', async (c) => {
  const parsed = moneyFlowQuerySchema.safeParse(c.req.query())
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_money_flow_query',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  return c.json(await buildMoneyFlowList(c, parsed.data))
})

moneyRoutes.post('/api/money-flows/:flowId/external-destination', async (c) => {
  const parsed = moneyFlowExternalDestinationRequestSchema.safeParse({
    ...(await c.req.json().catch(() => ({}))),
    flowId: c.req.param('flowId'),
  })
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_money_flow_external_destination_request',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const result = await markMoneyFlowExternalDestination(c, parsed.data)
  if (!result.ok) return c.json(result, result.status)
  return c.json(result)
})

moneyRoutes.patch('/api/recommendations/:id', async (c) => {
  const parsed = recommendationPatchSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_recommendation_patch',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const id = c.req.param('id')
  const recommendations = await readRecommendations(c)
  const existing = recommendations.find(
    (recommendation) => recommendation.id === id,
  )
  if (!existing) return jsonError(c, 'Recommendation not found', 404)

  const now = new Date().toISOString()
  const next = recommendations.map((recommendation) =>
    recommendation.id === id
      ? patchRecommendationStatus(recommendation, parsed.data.status, now)
      : recommendation,
  )
  await writeRecommendations(c, next)
  return c.json({
    recommendation: next.find((recommendation) => recommendation.id === id),
    recommendations: await readRecommendations(c),
  })
})

moneyRoutes.get('/api/raw/plaid', async (c) => {
  const parsed = rawPlaidQuerySchema.safeParse(c.req.query())
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_raw_plaid_query',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const evidence = await readRawPlaidSyncEvidence(c, parsed.data)
  return c.json({
    evidence,
    total: evidence.length,
  })
})

moneyRoutes.get('/api/extensions/registry', async (c) => {
  const registry = await readExtensionRegistry(c)
  return c.json({
    registry,
    generatedAt: new Date().toISOString(),
  })
})

moneyRoutes.put('/api/extensions/registry', async (c) => {
  const parsed = extensionRegistrySchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_extension_registry',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const registry: MoneyExtensionRegistry = parsed.data
  await writeExtensionRegistry(c, registry)
  return c.json({ ok: true, registry: await readExtensionRegistry(c) })
})

moneyRoutes.get('/api/extensions/values', async (c) => {
  const parsed = genericExtensionValueQuerySchema.safeParse(c.req.query())
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_extension_query',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const { limit, offset, ...filters } = parsed.data
  const cursor = filters.cursor
  delete filters.cursor
  const extensions = await readExtensionValues(c, filters)
  const page = paginateItems(extensions, { limit, offset, cursor })
  return c.json({
    extensions: page.items,
    total: extensions.length,
    limit,
    offset: page.offset,
    hasMore: page.hasMore,
    nextOffset: page.nextOffset,
    nextCursor: page.nextCursor,
    counts: genericExtensionCounts(extensions),
  })
})

moneyRoutes.post('/api/extensions/values', async (c) => {
  const parsed = genericExtensionValueBatchSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_extension_values',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const now = new Date().toISOString()
  const extensions = parsed.data.extensions.map((extension) => ({
    ...extension,
    updatedAt: extension.updatedAt ?? now,
  }))
  const validation = validateExtensionValues(
    extensions,
    await readExtensionRegistry(c),
  )
  if (validation.length > 0) {
    return c.json(
      {
        error: {
          code: 'invalid_extension_values',
          message: validation.join('\n'),
          issues: validation,
        },
      },
      400,
    )
  }

  let next = await upsertExtensionValues(c, extensions)
  if (
    extensions.some(
      (extension) =>
        extension.entity === 'transaction' &&
        extension.namespace === 'merchantGroup',
    )
  ) {
    next = await refreshDerivedTransactionExtensions(c)
  }
  const refreshedMetrics = await refreshMaterializedMetrics(c)

  return c.json({
    ok: true,
    total: next.length,
    counts: genericExtensionCounts(next),
    reviewAfter: await buildTransactionExtensionReviewAfter(c, {
      extensions,
    }),
    refreshedMetrics,
  })
})

moneyRoutes.patch(
  '/api/extensions/values/:entity/:namespace/:entityId',
  async (c) => {
    const key = genericExtensionValueKeySchema.safeParse({
      entity: c.req.param('entity'),
      namespace: c.req.param('namespace'),
      entityId: c.req.param('entityId'),
    })
    if (!key.success) return jsonError(c, z.prettifyError(key.error), 400)

    const parsed = genericExtensionValuePatchSchema.safeParse(
      await c.req.json().catch(() => ({})),
    )
    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: 'invalid_extension_value_patch',
            message: z.prettifyError(parsed.error),
          },
        },
        400,
      )
    }

    const result = await patchGenericExtensionValue(c, key.data, parsed.data)
    if (!result.ok) return c.json(result, result.status)
    return c.json(result)
  },
)

moneyRoutes.delete(
  '/api/extensions/values/:entity/:namespace/:entityId',
  async (c) => {
    const key = genericExtensionValueKeySchema.safeParse({
      entity: c.req.param('entity'),
      namespace: c.req.param('namespace'),
      entityId: c.req.param('entityId'),
    })
    if (!key.success) return jsonError(c, z.prettifyError(key.error), 400)

    const result = await deleteGenericExtensionValue(c, key.data)
    if (!result.ok) return c.json(result, result.status)
    return c.json(result)
  },
)

moneyRoutes.get('/api/extensions/proposals', async (c) => {
  const parsed = extensionProposalQuerySchema.safeParse(c.req.query())
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_extension_proposal_query',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const { limit, offset, cursor, ...filters } = parsed.data
  const proposals = await readExtensionProposals(c, filters)
  const page = paginateItems(proposals, { limit, offset, cursor })
  return c.json({
    proposals: page.items,
    total: proposals.length,
    limit,
    offset: page.offset,
    hasMore: page.hasMore,
    nextOffset: page.nextOffset,
    nextCursor: page.nextCursor,
    counts: extensionProposalCounts(proposals),
  })
})

moneyRoutes.post('/api/extensions/proposals/decide', async (c) => {
  const parsed = extensionProposalBatchDecisionSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_extension_proposal_batch_decision',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const result = await decideExtensionProposals(c, parsed.data)
  if (!result.ok) return c.json(result, result.status)
  return c.json(result)
})

moneyRoutes.post('/api/extensions/proposals/:id/accept', async (c) => {
  const parsed = extensionProposalDecisionSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_extension_proposal_decision',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const result = await acceptExtensionProposal(
    c,
    c.req.param('id'),
    parsed.data.reason,
  )
  if (!result.ok) return c.json(result, result.status)
  return c.json(result)
})

moneyRoutes.post('/api/extensions/proposals/:id/reject', async (c) => {
  const parsed = extensionProposalDecisionSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_extension_proposal_decision',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const result = await rejectExtensionProposal(
    c,
    c.req.param('id'),
    parsed.data.reason,
  )
  if (!result.ok) return c.json(result, result.status)
  return c.json(result)
})

moneyRoutes.post('/api/labels/transactions', async (c) => {
  const parsed = transactionLabelRequestSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_transaction_label_request',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const result = await applyTransactionLabels(c, parsed.data)
  if (!result.ok) return c.json(result, 400)
  return c.json(result)
})

moneyRoutes.get('/api/labels/rules', async (c) => {
  const rules = await readTransactionLabelRules(c)
  return c.json({
    rules,
    total: rules.length,
    counts: transactionLabelRuleCounts(rules),
    generatedAt: new Date().toISOString(),
  })
})

moneyRoutes.post('/api/labels/rules', async (c) => {
  const parsed = transactionLabelRuleCreateRequestSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_transaction_label_rule_request',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const result = await createTransactionLabelRule(c, parsed.data)
  if (!result.ok) return c.json(result, 400)
  return c.json(result)
})

moneyRoutes.delete('/api/labels/rules/:id', async (c) => {
  const result = await deleteTransactionLabelRule(c, c.req.param('id'))
  if (!result.ok) return c.json(result, 404)
  return c.json(result)
})

moneyRoutes.post('/api/classify/transactions', async (c) => {
  const parsed = transactionClassificationRequestSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_transaction_classification_request',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const result = await classifyTransactions(c, parsed.data)
  if (!result.ok) return c.json(result, 400)
  return c.json(result)
})

moneyRoutes.get('/api/plaid/connection-check', async (c) => {
  return c.json(await buildPlaidConnectionCheck(c))
})

moneyRoutes.get('/api/transactions', async (c) => {
  const filters = transactionFiltersFromQuery(c.req.query())
  const result = await searchVisibleTransactionsWithWarehouse(c, filters)
  return c.json(result)
})

moneyRoutes.get('/api/transactions/label-plan', async (c) => {
  const parsed = transactionLabelPlanQuerySchema.safeParse(c.req.query())
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_transaction_label_plan_query',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  return c.json(await buildTransactionLabelPlan(c, parsed.data))
})

moneyRoutes.get('/api/transactions/review', async (c) => {
  const parsed = transactionReviewQueueQuerySchema.safeParse(c.req.query())
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_transaction_review_query',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  return c.json(await buildTransactionReviewQueue(c, parsed.data))
})

moneyRoutes.get('/api/transactions/review/groups', async (c) => {
  const rawQuery = c.req.query()
  const parsed = transactionReviewGroupsQuerySchema.safeParse(rawQuery)
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_transaction_review_groups_query',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  return c.json(
    await buildTransactionReviewGroups(
      c,
      transactionReviewGroupsProductDefault(parsed.data, rawQuery),
    ),
  )
})

moneyRoutes.get('/api/transactions/:id', async (c) => {
  const transaction = await getVisibleTransaction(c, c.req.param('id'))
  if (!transaction) return jsonError(c, 'transaction not found', 404)
  return c.json({ transaction })
})

moneyRoutes.patch('/api/transactions/:id', async (c) => {
  const parsed = patchTransactionSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_transaction_patch',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const transaction = await patchTransaction(c, c.req.param('id'), parsed.data)
  if (!transaction) return jsonError(c, 'transaction not found', 404)
  const refreshedMetrics = await refreshMaterializedMetrics(
    c,
    TRANSACTION_FACT_COLLECTIONS,
    { markWarehouseDirty: false },
  )
  await markWarehouseDirty(c, {
    scope: 'transactions',
    partition: transaction.date.slice(0, 7),
    reason: 'transaction-patched',
  })

  return c.json({ transaction, refreshedMetrics })
})

moneyRoutes.get('/api/data-mode', async (c) => {
  const [settings, state] = await Promise.all([
    readSettings(c),
    readVisibleMoneyState(c),
  ])
  return c.json({
    dataMode: settings.display.dataMode,
    generatedAt: new Date().toISOString(),
  })
})

moneyRoutes.patch('/api/data-mode', async (c) => {
  const parsed = dataModePatchSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_data_mode',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const settings = await readSettings(c)
  const nextSettings: MoneySettings = {
    ...settings,
    display: {
      dataMode: parsed.data.dataMode,
      updatedAt: new Date().toISOString(),
    },
  }
  await writeSettings(c, nextSettings)
  const refreshedMetrics = await refreshMaterializedMetrics(c)
  const state = await readVisibleMoneyState(c)

  return c.json({
    dataMode: nextSettings.display.dataMode,
    refreshedMetrics,
    generatedAt: new Date().toISOString(),
  })
})

moneyRoutes.get('/api/currency/settings', async (c) => {
  const settings = await readSettings(c)
  return c.json({
    settings: settings.currency,
    generatedAt: new Date().toISOString(),
  })
})

moneyRoutes.patch('/api/currency/settings', async (c) => {
  const parsed = currencySettingsPatchSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_currency_settings',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const settings = await readSettings(c)
  const nextSettings: MoneySettings = {
    ...settings,
    currency: {
      reportingCurrency: parsed.data.reportingCurrency.toUpperCase(),
      updatedAt: new Date().toISOString(),
    },
  }
  await writeSettings(c, nextSettings)
  const refreshedMetrics = await refreshMaterializedMetrics(c)
  return c.json({
    settings: nextSettings.currency,
    refreshedMetrics,
    generatedAt: new Date().toISOString(),
  })
})

moneyRoutes.get('/api/fx-rates', async (c) => {
  const rates = await readFxRates(c)
  return c.json({
    rates,
    total: rates.length,
    generatedAt: new Date().toISOString(),
  })
})

moneyRoutes.put('/api/fx-rates', async (c) => {
  const parsed = fxRatesPutSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_fx_rates',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const now = new Date().toISOString()
  const rates: MoneyFxRate[] = parsed.data.rates.map((rate) => ({
    id:
      rate.id ??
      `${rate.baseCurrency}-${rate.quoteCurrency}-${rate.asOf}-${rate.source}`,
    baseCurrency: rate.baseCurrency,
    quoteCurrency: rate.quoteCurrency,
    rate: rate.rate,
    asOf: rate.asOf,
    source: rate.source,
    status: rate.status,
    createdAt: rate.createdAt ?? now,
    updatedAt: rate.updatedAt ?? now,
  }))
  await writeFxRates(c, rates)
  const normalizedRates = await readFxRates(c)
  const refreshedMetrics = await refreshMaterializedMetrics(c)
  return c.json({
    rates: normalizedRates,
    total: normalizedRates.length,
    refreshedMetrics,
    generatedAt: new Date().toISOString(),
  })
})

moneyRoutes.get('/api/attention/settings', async (c) => {
  const settings = await readSettings(c)
  return c.json({
    settings: settings.attention,
    generatedAt: new Date().toISOString(),
  })
})

moneyRoutes.patch('/api/attention/settings', async (c) => {
  const parsed = attentionSettingsPatchSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_attention_settings',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const settings = await readSettings(c)
  const nextSettings: MoneySettings = {
    ...settings,
    attention: {
      ...settings.attention,
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    },
  }
  await writeSettings(c, nextSettings)

  return c.json({
    settings: nextSettings.attention,
    generatedAt: new Date().toISOString(),
  })
})

moneyRoutes.get('/api/connections', async (c) => {
  const list = await buildConnectionList(c)
  return c.json(list.connections)
})

moneyRoutes.delete('/api/connections/:itemId', async (c) => {
  const itemId = c.req.param('itemId')
  const result = await deletePlaidConnection(c, itemId)
  if (result.ok) return c.json(result)
  if (result.status === 404) return jsonError(c, result.error.message, 404)
  return c.json(result, result.status)
})

async function deletePlaidConnection(c: Context, itemId: string) {
  const connections = await readConnections(c)
  const connection = connections.find((entry) => entry.itemId === itemId)
  if (!connection) {
    return {
      ok: false as const,
      status: 404 as const,
      error: {
        code: 'connection_not_found',
        message: 'connection not found',
      },
    }
  }

  try {
    const revokeResult = await removePlaidConnection(c, connection)
    const [existingData, existingDebts, existingHoldings, syncState] =
      await Promise.all([
        readMoneyData(c),
        readDebts(c),
        readHoldings(c),
        readSyncState(c),
      ])
    const nextConnections = connections.filter(
      (entry) => entry.itemId !== itemId,
    )
    const nextData = {
      accounts: existingData.accounts.filter(
        (account) =>
          account.itemId !== itemId && account.connectionId !== itemId,
      ),
      transactions: existingData.transactions.filter(
        (transaction) =>
          transaction.itemId !== itemId && transaction.connectionId !== itemId,
      ),
    }
    const itemCursors = { ...syncState.itemCursors }
    delete itemCursors[itemId]
    const nextDebts = existingDebts.filter(
      (debt) => debt.itemId !== itemId && debt.connectionId !== itemId,
    )
    const nextHoldings = existingHoldings.filter(
      (holding) => holding.itemId !== itemId && holding.connectionId !== itemId,
    )

    const removedBalanceSnapshots = await removeBalanceSnapshotsForItem(
      c,
      itemId,
    )
    await Promise.all([
      writeConnections(c, nextConnections),
      writeMoneyData(c, nextData),
      writeDebts(c, nextDebts),
      writeHoldings(c, nextHoldings),
      writeSyncState(c, {
        ...syncState,
        generatedAt: new Date().toISOString(),
        status: 'idle',
        lastError: undefined,
        itemCursors,
      }),
    ])
    const dirtyCollections = new Set<string>()
    addDirtyCollections(dirtyCollections, ACCOUNT_FACT_COLLECTIONS)
    addDirtyCollections(dirtyCollections, TRANSACTION_FACT_COLLECTIONS)
    addDirtyCollections(dirtyCollections, DEBT_FACT_COLLECTIONS)
    addDirtyCollections(dirtyCollections, HOLDING_FACT_COLLECTIONS)
    addDirtyCollections(dirtyCollections, BALANCE_SNAPSHOT_COLLECTIONS)
    const refreshedMetrics = await refreshMaterializedMetrics(
      c,
      dirtyCollections,
    )

    return {
      ok: true as const,
      removedConnection: connection,
      revokeResult,
      remainingConnections: nextConnections.length,
      refreshedMetrics,
      removedAccounts: existingData.accounts.length - nextData.accounts.length,
      removedTransactions:
        existingData.transactions.length - nextData.transactions.length,
      removedDebts: existingDebts.length - nextDebts.length,
      removedHoldings: existingHoldings.length - nextHoldings.length,
      removedBalanceSnapshots,
    }
  } catch (error) {
    return {
      ok: false as const,
      status: 502 as const,
      error: {
        code: 'connection_revoke_failed',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to revoke Plaid connection',
      },
    }
  }
}

moneyRoutes.get('/api/sync/settings', async (c) => {
  return c.json(await getSyncScheduleStatus(c))
})

moneyRoutes.get('/api/sync/status', async (c) => {
  return c.json(await buildSyncStatusSummary(c))
})

moneyRoutes.patch('/api/sync/settings', async (c) => {
  const parsed = syncSettingsPatchSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_sync_settings',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const [settings, syncState] = await Promise.all([
    readSettings(c),
    readSyncState(c),
  ])
  const nextSettings: MoneySettings = {
    ...settings,
    sync: {
      ...settings.sync,
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    },
  }
  const nextSyncState = {
    ...syncState,
    generatedAt: new Date().toISOString(),
    nextScheduledRunAt: computeNextScheduledRunAt(nextSettings, syncState),
  }
  await Promise.all([
    writeSettings(c, nextSettings),
    writeSyncState(c, nextSyncState),
  ])

  return c.json(await getSyncScheduleStatus(c))
})

moneyRoutes.post('/api/sync/run-due', async (c) => {
  const parsed = runDueRequestSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_run_due_request',
          message: z.prettifyError(parsed.error),
        },
      },
      400,
    )
  }

  const schedule = await getSyncScheduleStatus(c)
  if (!schedule.due && !parsed.data.force) {
    return c.json({
      ok: true,
      skipped: true,
      reason: schedule.reason,
      schedule,
    })
  }

  const result = await runMoneySync(c, 'scheduled')
  return c.json(
    {
      ...result.body,
      skipped: false,
      schedule: await getSyncScheduleStatus(c),
    },
    result.status,
  )
})

moneyRoutes.post('/api/sync', async (c) => {
  const result = await runMoneySync(c, 'manual')
  return c.json(result.body, result.status)
})

moneyRoutes.post('/api/connections/:itemId/sync', async (c) => {
  const result = await runMoneySync(c, 'manual', {
    itemIds: [c.req.param('itemId')],
  })
  return c.json(result.body, result.status)
})

moneyRoutes.post('/api/moldable/rpc', async (c) => {
  const parsed = rpcRequestSchema.safeParse(
    await c.req.json().catch(() => ({})),
  )
  if (!parsed.success) return jsonError(c, 'RPC method is required', 400)

  if (parsed.data.method === 'money.summary') {
    const state = await readVisibleMoneyState(c)
    return c.json({
      ok: true,
      result: {
        ...buildMoneySummary(state.raw, state.debts, state.holdings),
        dataMode: state.dataMode,
      },
    })
  }

  if (parsed.data.method === 'money.data.health') {
    return c.json({
      ok: true,
      result: await readOrBuildDataHealthProjection(c),
    })
  }

  if (parsed.data.method === 'money.warehouse.status') {
    return c.json({ ok: true, result: await buildWarehouseStatus(c) })
  }

  if (parsed.data.method === 'money.import.status') {
    return c.json({
      ok: true,
      result: {
        job: await readImportJob(c),
        warehouse: await buildWarehouseStatus(c),
      },
    })
  }

  if (parsed.data.method === 'money.warehouse.rebuild') {
    invalidateMoneyReadCache(c, { markWarehouseDirty: false })
    const params = warehouseRebuildRequestSchema.safeParse(
      parsed.data.params ?? {},
    )
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    if (params.data.async) {
      return c.json({
        ok: true,
        result: await startWarehouseRebuild(c, { scope: params.data.scope }),
      })
    }
    return c.json({
      ok: true,
      result: await rebuildWarehouseProjections(c, {
        scope: params.data.scope,
      }),
    })
  }

  if (parsed.data.method === 'money.data.firstRun') {
    return c.json({ ok: true, result: await buildFirstRunState(c) })
  }

  if (parsed.data.method === 'money.accounts.list') {
    return c.json({
      ok: true,
      result: { accounts: await readVisibleAccounts(c) },
    })
  }

  if (parsed.data.method === 'money.debts.list') {
    return c.json({
      ok: true,
      result: { debts: (await readVisibleMoneyState(c)).debts },
    })
  }

  if (parsed.data.method === 'money.debts.patch') {
    const params = debtPatchRpcParamsSchema.safeParse(parsed.data.params ?? {})
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    const { id, ...patch } = params.data
    const result = await patchDebtMetadata(c, id, patch)
    if (!result.ok) return c.json(result, 404)
    return c.json({ ok: true, result })
  }

  if (parsed.data.method === 'money.holdings.list') {
    return c.json({
      ok: true,
      result: { holdings: (await readVisibleMoneyState(c)).holdings },
    })
  }

  if (parsed.data.method === 'money.currency.settings') {
    const settings = await readSettings(c)
    return c.json({ ok: true, result: { settings: settings.currency } })
  }

  if (parsed.data.method === 'money.currency.settings.patch') {
    const params = currencySettingsPatchSchema.safeParse(
      parsed.data.params ?? {},
    )
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    const settings = await readSettings(c)
    const nextSettings: MoneySettings = {
      ...settings,
      currency: {
        reportingCurrency: params.data.reportingCurrency.toUpperCase(),
        updatedAt: new Date().toISOString(),
      },
    }
    await writeSettings(c, nextSettings)
    return c.json({
      ok: true,
      result: {
        settings: nextSettings.currency,
        refreshedMetrics: await refreshMaterializedMetrics(c),
      },
    })
  }

  if (parsed.data.method === 'money.fxRates.list') {
    const rates = await readFxRates(c)
    return c.json({ ok: true, result: { rates, total: rates.length } })
  }

  if (parsed.data.method === 'money.fxRates.replace') {
    const params = fxRatesPutSchema.safeParse(parsed.data.params ?? {})
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    const now = new Date().toISOString()
    await writeFxRates(
      c,
      params.data.rates.map((rate) => ({
        id:
          rate.id ??
          `${rate.baseCurrency}-${rate.quoteCurrency}-${rate.asOf}-${rate.source}`,
        baseCurrency: rate.baseCurrency,
        quoteCurrency: rate.quoteCurrency,
        rate: rate.rate,
        asOf: rate.asOf,
        source: rate.source,
        status: rate.status,
        createdAt: rate.createdAt ?? now,
        updatedAt: rate.updatedAt ?? now,
      })),
    )
    const rates = await readFxRates(c)
    return c.json({
      ok: true,
      result: {
        rates,
        total: rates.length,
        refreshedMetrics: await refreshMaterializedMetrics(c),
      },
    })
  }

  if (parsed.data.method === 'money.balanceSnapshots.list') {
    const params = balanceSnapshotQuerySchema.safeParse(
      parsed.data.params ?? {},
    )
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    const { limit, offset, cursor, ...query } = params.data
    const snapshots = await readVisibleBalanceSnapshots(c, query)
    const page = paginateItems(snapshots, { limit, offset, cursor })
    return c.json({
      ok: true,
      result: {
        snapshots: page.items,
        total: snapshots.length,
        limit,
        offset: page.offset,
        hasMore: page.hasMore,
        nextOffset: page.nextOffset,
        nextCursor: page.nextCursor,
      },
    })
  }

  if (parsed.data.method === 'money.allocationTargets.list') {
    return c.json({
      ok: true,
      result: { targets: await readAllocationTargets(c) },
    })
  }

  if (parsed.data.method === 'money.forecastScenarios.list') {
    return c.json({
      ok: true,
      result: { scenarios: await readForecastScenarios(c) },
    })
  }

  if (parsed.data.method === 'money.taxContributionLimits.list') {
    return c.json({
      ok: true,
      result: { limits: await readTaxContributionLimits(c) },
    })
  }

  if (parsed.data.method === 'money.merchants.list') {
    return c.json({
      ok: true,
      result: { merchants: (await readVisibleFormulaData(c)).merchants ?? [] },
    })
  }

  if (parsed.data.method === 'money.merchants.review') {
    const params = merchantReviewQuerySchema.safeParse(parsed.data.params ?? {})
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }

    return c.json({
      ok: true,
      result: await buildMerchantReviewQueue(c, params.data),
    })
  }

  if (parsed.data.method === 'money.persons.list') {
    return c.json({
      ok: true,
      result: { persons: (await readVisibleFormulaData(c)).persons ?? [] },
    })
  }

  if (parsed.data.method === 'money.recommendations.list') {
    const params = recommendationQuerySchema.safeParse(parsed.data.params ?? {})
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    const recommendations = recommendationQueryFilter(
      (await readVisibleFormulaData(c)).recommendations ?? [],
      params.data,
    )
    const page = paginateItems(recommendations, params.data)
    return c.json({
      ok: true,
      result: {
        recommendations: page.items,
        total: recommendations.length,
        limit: page.limit,
        offset: page.offset,
        hasMore: page.hasMore,
        nextOffset: page.nextOffset,
        nextCursor: page.nextCursor,
        counts: recommendationCounts(recommendations),
        filters: recommendationFiltersForResponse(params.data),
      },
    })
  }

  if (parsed.data.method === 'money.recommendations.groups') {
    const params = recommendationGroupQuerySchema.safeParse(
      parsed.data.params ?? {},
    )
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    return c.json({
      ok: true,
      result: await buildRecommendationGroups(c, params.data),
    })
  }

  if (parsed.data.method === 'money.recommendations.patch') {
    const params = recommendationBulkPatchSchema.safeParse(
      parsed.data.params ?? {},
    )
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    return c.json({
      ok: true,
      result: await patchRecommendations(c, params.data),
    })
  }

  if (parsed.data.method === 'money.recurring.series') {
    const params = recurringSeriesQuerySchema.safeParse(
      parsed.data.params ?? {},
    )
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    return c.json({
      ok: true,
      result: await buildRecurringSeriesList(c, params.data),
    })
  }

  if (parsed.data.method === 'money.moneyFlows.list') {
    const params = moneyFlowQuerySchema.safeParse(parsed.data.params ?? {})
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    return c.json({
      ok: true,
      result: await buildMoneyFlowList(c, params.data),
    })
  }

  if (parsed.data.method === 'money.moneyFlows.markExternalDestination') {
    const params = moneyFlowExternalDestinationRequestSchema.safeParse(
      parsed.data.params ?? {},
    )
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    const result = await markMoneyFlowExternalDestination(c, params.data)
    if (!result.ok)
      return c.json({ ok: false, error: result.error }, result.status)
    return c.json({ ok: true, result })
  }

  if (parsed.data.method === 'money.sync.status') {
    return c.json({ ok: true, result: await getSyncScheduleStatus(c) })
  }

  if (parsed.data.method === 'money.sync.history') {
    return c.json({ ok: true, result: await buildSyncStatusSummary(c) })
  }

  if (parsed.data.method === 'money.connections.list') {
    return c.json({ ok: true, result: await buildConnectionList(c) })
  }

  if (parsed.data.method === 'money.connections.sync') {
    const params = connectionSyncRpcParamsSchema.safeParse(
      parsed.data.params ?? {},
    )
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    const result = await runMoneySync(c, 'manual', {
      itemIds: [params.data.itemId],
    })
    return c.json({ ok: true, result: result.body })
  }

  if (parsed.data.method === 'money.connections.delete') {
    const params = connectionDeleteRpcParamsSchema.safeParse(
      parsed.data.params ?? {},
    )
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    const result = await deletePlaidConnection(c, params.data.itemId)
    if (!result.ok)
      return c.json({ ok: false, error: result.error }, result.status)
    return c.json({ ok: true, result })
  }

  if (parsed.data.method === 'money.transactions.search') {
    const filters = transactionFiltersFromParams(parsed.data.params ?? {})
    const result = await searchVisibleTransactionsWithWarehouse(c, filters)
    return c.json({ ok: true, result })
  }

  if (parsed.data.method === 'money.transactions.get') {
    const params = idRequestSchema.safeParse(parsed.data.params ?? {})
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    const transaction = await getVisibleTransaction(c, params.data.id)
    if (!transaction) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'transaction_not_found',
            message: 'Transaction not found.',
          },
        },
        404,
      )
    }
    return c.json({ ok: true, result: { transaction } })
  }

  if (parsed.data.method === 'money.dashboards.list') {
    return c.json({ ok: true, result: await buildDashboardList(c) })
  }

  if (parsed.data.method === 'money.dashboards.reorder') {
    const params = dashboardReorderSchema.safeParse(parsed.data.params ?? {})
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    const result = await reorderDashboards(c, params.data.ids)
    if (!result.ok) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'unknown_dashboard_ids',
            message: `Unknown dashboard ids: ${result.unknownIds.join(', ')}`,
            unknownIds: result.unknownIds,
          },
        },
        400,
      )
    }
    return c.json({ ok: true, result })
  }

  if (parsed.data.method === 'money.dashboards.delete') {
    const params = idRequestSchema.safeParse(parsed.data.params ?? {})
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    const result = await deleteDashboard(c, params.data.id)
    if (!result.ok) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'dashboard_not_found',
            message: 'Dashboard not found.',
          },
        },
        404,
      )
    }
    return c.json({ ok: true, result })
  }

  if (parsed.data.method === 'money.transactions.labelPlan') {
    const params = transactionLabelPlanQuerySchema.safeParse(
      parsed.data.params ?? {},
    )
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    return c.json({
      ok: true,
      result: await buildTransactionLabelPlan(c, params.data),
    })
  }

  if (parsed.data.method === 'money.transactions.review') {
    const params = transactionReviewQueueQuerySchema.safeParse(
      parsed.data.params ?? {},
    )
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    return c.json({
      ok: true,
      result: await buildTransactionReviewQueue(c, params.data),
    })
  }

  if (parsed.data.method === 'money.transactions.reviewGroups') {
    const rawParams = parsed.data.params ?? {}
    const params = transactionReviewGroupsQuerySchema.safeParse(rawParams)
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    return c.json({
      ok: true,
      result: await buildTransactionReviewGroups(
        c,
        transactionReviewGroupsProductDefault(params.data, rawParams),
      ),
    })
  }

  if (
    parsed.data.method === 'money.transactions.reviewGroups.applySuggestions'
  ) {
    const params = transactionReviewGroupSuggestionApplySchema.safeParse(
      parsed.data.params ?? {},
    )
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    const result = await applyTransactionReviewGroupSuggestions(c, params.data)
    if (!result.ok) return c.json(result, 400)
    return c.json({ ok: true, result })
  }

  if (
    parsed.data.method === 'money.transactions.labelPreview' ||
    parsed.data.method === 'money.transactions.labelApply'
  ) {
    const params = transactionLabelRequestSchema.safeParse({
      ...(parsed.data.params ?? {}),
      dryRun:
        parsed.data.method === 'money.transactions.labelPreview'
          ? true
          : (parsed.data.params?.dryRun ?? false),
    })
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }

    const result = await applyTransactionLabels(c, params.data)
    if (!result.ok) return c.json(result, 400)
    return c.json({ ok: true, result })
  }

  if (parsed.data.method === 'money.transactions.labelRules.list') {
    const rules = await readTransactionLabelRules(c)
    return c.json({
      ok: true,
      result: {
        rules,
        total: rules.length,
        counts: transactionLabelRuleCounts(rules),
        generatedAt: new Date().toISOString(),
      },
    })
  }

  if (parsed.data.method === 'money.transactions.labelRules.create') {
    const params = transactionLabelRuleCreateRequestSchema.safeParse(
      parsed.data.params ?? {},
    )
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }

    const result = await createTransactionLabelRule(c, params.data)
    if (!result.ok) return c.json(result, 400)
    return c.json({ ok: true, result })
  }

  if (parsed.data.method === 'money.transactions.labelRules.delete') {
    const params = z
      .object({ id: z.string().min(1) })
      .safeParse(parsed.data.params ?? {})
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    const result = await deleteTransactionLabelRule(c, params.data.id)
    if (!result.ok) return c.json(result, 404)
    return c.json({ ok: true, result })
  }

  if (parsed.data.method === 'money.transactions.classify') {
    const params = transactionClassificationRequestSchema.safeParse(
      parsed.data.params ?? {},
    )
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }

    const result = await classifyTransactions(c, params.data)
    if (!result.ok) return c.json(result, 400)
    return c.json({ ok: true, result })
  }

  if (parsed.data.method === 'money.extensions.values.list') {
    const params = genericExtensionValueQuerySchema.safeParse(
      parsed.data.params ?? {},
    )
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    const { limit, offset, cursor, ...filters } = params.data
    const extensions = await readExtensionValues(c, filters)
    const page = paginateItems(extensions, { limit, offset, cursor })
    return c.json({
      ok: true,
      result: {
        extensions: page.items,
        total: extensions.length,
        limit,
        offset: page.offset,
        hasMore: page.hasMore,
        nextOffset: page.nextOffset,
        nextCursor: page.nextCursor,
        counts: genericExtensionCounts(extensions),
      },
    })
  }

  if (parsed.data.method === 'money.extensions.values.patch') {
    const key = genericExtensionValueKeySchema.safeParse(
      parsed.data.params ?? {},
    )
    const patch = genericExtensionValuePatchSchema.safeParse(
      parsed.data.params ?? {},
    )
    if (!key.success || !patch.success) {
      const message = !key.success
        ? z.prettifyError(key.error)
        : !patch.success
          ? z.prettifyError(patch.error)
          : 'Invalid RPC params.'
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message,
          },
        },
        400,
      )
    }
    const result = await patchGenericExtensionValue(c, key.data, patch.data)
    if (!result.ok)
      return c.json({ ok: false, error: result.error }, result.status)
    return c.json({ ok: true, result })
  }

  if (parsed.data.method === 'money.extensions.values.delete') {
    const params = genericExtensionValueKeySchema.safeParse(
      parsed.data.params ?? {},
    )
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    const result = await deleteGenericExtensionValue(c, params.data)
    if (!result.ok)
      return c.json({ ok: false, error: result.error }, result.status)
    return c.json({ ok: true, result })
  }

  if (parsed.data.method === 'money.extensions.proposals.list') {
    const params = extensionProposalQuerySchema.safeParse(
      parsed.data.params ?? {},
    )
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    const { limit, offset, cursor, ...filters } = params.data
    const proposals = await readExtensionProposals(c, filters)
    const page = paginateItems(proposals, { limit, offset, cursor })
    return c.json({
      ok: true,
      result: {
        proposals: page.items,
        total: proposals.length,
        limit,
        offset: page.offset,
        hasMore: page.hasMore,
        nextOffset: page.nextOffset,
        nextCursor: page.nextCursor,
        counts: extensionProposalCounts(proposals),
      },
    })
  }

  if (parsed.data.method === 'money.extensions.proposals.decide') {
    const params = extensionProposalBatchDecisionSchema.safeParse(
      parsed.data.params ?? {},
    )
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    const result = await decideExtensionProposals(c, params.data)
    if (!result.ok)
      return c.json({ ok: false, error: result.error }, result.status)
    return c.json({ ok: true, result })
  }

  if (
    parsed.data.method === 'money.extensions.proposals.accept' ||
    parsed.data.method === 'money.extensions.proposals.reject'
  ) {
    const params = z
      .object({ id: z.string().min(1) })
      .merge(extensionProposalDecisionSchema)
      .safeParse(parsed.data.params ?? {})
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    const result =
      parsed.data.method === 'money.extensions.proposals.accept'
        ? await acceptExtensionProposal(c, params.data.id, params.data.reason)
        : await rejectExtensionProposal(c, params.data.id, params.data.reason)
    if (!result.ok)
      return c.json({ ok: false, error: result.error }, result.status)
    return c.json({ ok: true, result })
  }

  if (parsed.data.method === 'money.plaid.connectionCheck') {
    return c.json({ ok: true, result: await buildPlaidConnectionCheck(c) })
  }

  if (parsed.data.method === 'money.plaid.connectSession') {
    const params = plaidConnectSessionRpcParamsSchema.safeParse(
      parsed.data.params ?? {},
    )
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    try {
      return c.json({
        ok: true,
        result: await createPlaidBrowserConnectSession(c, params.data),
      })
    } catch {
      return c.json(
        {
          ok: false,
          error: {
            code: 'plaid_connect_session_failed',
            message: 'Failed to create Plaid connect session.',
          },
        },
        502,
      )
    }
  }

  if (parsed.data.method === 'money.plaid.connectSessions') {
    const params = plaidConnectSessionsRpcParamsSchema.safeParse(
      parsed.data.params ?? {},
    )
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    const sessions = []
    for (const sessionParams of params.data.sessions) {
      try {
        sessions.push({
          ok: true as const,
          request: sessionParams,
          session: await createPlaidBrowserConnectSession(c, {
            ...sessionParams,
            timeoutMs: sessionParams.timeoutMs ?? params.data.timeoutMs,
          }),
        })
      } catch (error) {
        sessions.push({
          ok: false as const,
          request: sessionParams,
          error: {
            code: 'plaid_connect_session_failed',
            message:
              error instanceof Error
                ? error.message
                : 'Failed to create Plaid connect session.',
          },
        })
      }
    }
    return c.json({
      ok: true,
      result: {
        sessions,
        created: sessions.filter((session) => session.ok).length,
        failed: sessions.filter((session) => !session.ok).length,
      },
    })
  }

  if (parsed.data.method === 'money.formulas.schema') {
    return c.json({ ok: true, result: await buildFormulaSchema(c) })
  }

  if (parsed.data.method === 'money.formulas.list') {
    return c.json({ ok: true, result: await buildFormulasList(c) })
  }

  if (parsed.data.method === 'money.formulas.complete') {
    const params = formulaCompletionRequestSchema.safeParse(
      parsed.data.params ?? {},
    )
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }

    return c.json({
      ok: true,
      result: await completeFormula(c, params.data.formula, params.data.cursor),
    })
  }

  if (parsed.data.method === 'money.formulas.preview') {
    const params = formulaPreviewRpcParamsSchema.safeParse(
      parsed.data.params ?? {},
    )
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }

    const preview = await previewFormula(
      c,
      params.data.formula,
      params.data.format,
      params.data.outputType,
    )
    if (!preview.ok) return c.json(preview, 400)
    return c.json({ ok: true, result: preview })
  }

  if (parsed.data.method === 'money.cards.list') {
    return c.json({ ok: true, result: await readOrBuildCardsProjection(c) })
  }

  if (parsed.data.method === 'money.cards.readiness') {
    const params = cardReadinessQuerySchema.safeParse(parsed.data.params ?? {})
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }

    return c.json({
      ok: true,
      result: await buildCardReadinessList(c, params.data),
    })
  }

  if (parsed.data.method === 'money.cards.transactions') {
    const params = cardTransactionQuerySchema.safeParse(
      parsed.data.params ?? {},
    )
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    const result = await buildCardTransactionDrilldown(c, params.data)
    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, result.status)
    }
    return c.json({ ok: true, result: result.value })
  }

  if (parsed.data.method === 'money.cards.templates.list') {
    const params = cardTemplateQuerySchema.safeParse(parsed.data.params ?? {})
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }

    return c.json({
      ok: true,
      result: await buildCardTemplateList(c, params.data),
    })
  }

  if (parsed.data.method === 'money.cards.preview') {
    const params = cardDefinitionSchema.safeParse(parsed.data.params ?? {})
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }

    const preview = await previewCardDefinition(c, params.data)
    if (!preview.ok) return c.json(cardRepairPayload(preview, params.data), 400)
    return c.json({ ok: true, result: preview })
  }

  if (parsed.data.method === 'money.cards.test') {
    const params = cardTestRequestSchema.safeParse(parsed.data.params ?? {})
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }

    return c.json({
      ok: true,
      result: await testCardDefinitions(c, params.data.cards),
    })
  }

  if (parsed.data.method === 'money.cards.save') {
    const params = cardDefinitionSchema.safeParse(parsed.data.params ?? {})
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }

    const saved = await saveCardDefinition(c, params.data)
    if (!saved.ok) return c.json(cardRepairPayload(saved, params.data), 400)
    return c.json({ ok: true, result: saved })
  }

  if (parsed.data.method === 'money.cards.refresh') {
    const params = cardRefreshRpcParamsSchema.safeParse(
      parsed.data.params ?? {},
    )
    if (!params.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_rpc_params',
            message: z.prettifyError(params.error),
          },
        },
        400,
      )
    }
    const definitions = await readCardDefinitions(c, DEFAULT_CARD_DEFINITIONS)
    const definition = definitions.find((card) => card.id === params.data.id)
    if (!definition) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'card_not_found',
            message: `Card not found: ${params.data.id}`,
          },
        },
        404,
      )
    }

    const refreshed = await refreshCardDefinition(c, definition)
    if (!refreshed.ok) return c.json(refreshed, 400)
    return c.json({ ok: true, result: refreshed })
  }

  return c.json(
    {
      ok: false,
      error: {
        code: 'unknown_rpc_method',
        message: `Unknown Money RPC method: ${parsed.data.method}`,
      },
    },
    404,
  )
})

async function runRawImport(c: Context, data: RawMoneyData) {
  const existing = await readRawMoneyData(c)
  const next = mergeRawMoneyData(existing, data)
  await writeMoneyData(c, next)
  const refreshedMetrics = await refreshMaterializedMetrics(
    c,
    dirtyCollectionsForRawData(data),
  )
  return {
    ok: true,
    accounts: next.accounts.length,
    transactions: next.transactions.length,
    refreshedMetrics,
  }
}

async function startRawImportJob(c: Context, data: RawMoneyData) {
  const lockKey = getWorkspaceId(c) ?? 'default'
  const runningJob = await readImportJob(c)
  if (importLocks.has(lockKey)) {
    return {
      ok: true,
      started: false,
      running: true,
      job: runningJob,
      warehouse: await buildWarehouseStatus(c),
    }
  }

  importLocks.add(lockKey)
  const job: ImportJobStatus = {
    schemaVersion: WAREHOUSE_SCHEMA_VERSION,
    id: `import-${Date.now()}`,
    state: 'running',
    phase: 'queued',
    startedAt: new Date().toISOString(),
    incomingAccounts: data.accounts.length,
    incomingTransactions: data.transactions.length,
  }
  await writeImportJob(c, job)
  void runRawImportJob(c, data, job).catch(() => {
    // runRawImportJob persists the error; callers observe it through status.
  })
  return {
    ok: true,
    started: true,
    running: true,
    job,
    warehouse: await buildWarehouseStatus(c),
  }
}

async function runRawImportJob(
  c: Context,
  data: RawMoneyData,
  job: ImportJobStatus,
): Promise<void> {
  const lockKey = getWorkspaceId(c) ?? 'default'
  const startedAt = performance.now()
  try {
    await writeImportJob(c, {
      ...job,
      state: 'running',
      phase: 'writing-facts',
    })
    const existing = await readRawMoneyData(c)
    const next = mergeRawMoneyData(existing, data)
    await writeMoneyData(c, next)
    invalidateMoneyReadCache(c, {
      ...warehouseDirtyForCollections(dirtyCollectionsForRawData(data)),
      reason: 'raw-import-async',
    })

    await writeImportJob(c, {
      ...job,
      state: 'running',
      phase: 'refreshing-derived',
      accounts: next.accounts.length,
      transactions: next.transactions.length,
    })
    const refreshedMetrics = await refreshMaterializedMetrics(
      c,
      dirtyCollectionsForRawData(data),
      { markWarehouseDirty: false },
    )

    await writeImportJob(c, {
      ...job,
      state: 'running',
      phase: 'rebuilding-warehouse',
      accounts: next.accounts.length,
      transactions: next.transactions.length,
      refreshedMetrics,
    })
    const warehouse = await rebuildWarehouseProjections(c, { scope: 'full' })
    const warehouseJob = await readWarehouseJob(c)
    const buildMs = Math.round(performance.now() - startedAt)
    await writeImportJob(c, {
      ...job,
      state: 'complete',
      phase: 'complete',
      completedAt: new Date().toISOString(),
      buildMs,
      accounts: next.accounts.length,
      transactions: next.transactions.length,
      refreshedMetrics,
      warehouseJob: warehouseJob ?? {
        schemaVersion: WAREHOUSE_SCHEMA_VERSION,
        id: `warehouse-${Date.now()}`,
        state: 'complete',
        buildMs: warehouse.buildMs,
      },
    })
  } catch (error) {
    const buildMs = Math.round(performance.now() - startedAt)
    await writeImportJob(c, {
      ...job,
      state: 'error',
      phase: 'error',
      failedAt: new Date().toISOString(),
      buildMs,
      error: error instanceof Error ? error.message : String(error),
    })
  } finally {
    importLocks.delete(lockKey)
  }
}

async function buildCardsList(c: Context) {
  const [formulaData, definitions, materialized] = await Promise.all([
    readVisibleFormulaData(c),
    readCardDefinitions(c, DEFAULT_CARD_DEFINITIONS),
    readMaterializedMetrics(c),
  ])
  const currentMaterialized = await pruneStaleCardMaterializedMetrics(
    c,
    materialized,
    definitions,
  )
  return {
    definitions,
    cards: evaluateCards(formulaData, definitions),
    materialized: currentMaterialized,
  }
}

async function readOrBuildCardsProjection(c: Context) {
  return readOrBuildWarehouseProjection(c, 'cards', () => buildCardsList(c))
}

async function refreshCardsProjection(c: Context): Promise<void> {
  invalidateMoneyReadCache(c, { markWarehouseDirty: false })
  await writeWarehouseProjection(
    c,
    'cards',
    () => buildCardsList(c),
    await latestWarehouseSourceMtimeMs(getDataDir(c)),
  )
}

async function readOrBuildDataHealthProjection(c: Context) {
  return readOrBuildWarehouseProjection(c, 'data-health', () =>
    buildDataHealth(c),
  )
}

async function readOrBuildWarehouseProjection<T>(
  c: Context,
  kind: WarehouseProjectionKind,
  build: () => Promise<T>,
): Promise<T> {
  const sourceMtimeMs = await latestWarehouseSourceMtimeMs(getDataDir(c))
  const envelope = await readWarehouseProjection<T>(c, kind)
  if (
    envelope &&
    envelope.schemaVersion === WAREHOUSE_SCHEMA_VERSION &&
    envelope.sourceMtimeMs >= sourceMtimeMs
  ) {
    return annotateWarehouseValue(envelope.value, {
      stale: false,
      recomputing: false,
      source: 'projection',
      generatedAt: envelope.generatedAt,
      sourceMtimeMs: envelope.sourceMtimeMs,
      buildMs: envelope.buildMs,
    })
  }
  if (envelope?.schemaVersion === WAREHOUSE_SCHEMA_VERSION) {
    void markWarehouseDirty(c, {
      scope: kind,
      reason: 'source-newer-than-projection',
    })
    const job = await readWarehouseJob(c)
    return annotateWarehouseValue(envelope.value, {
      stale: true,
      recomputing: job?.state === 'running',
      source: 'projection',
      generatedAt: envelope.generatedAt,
      sourceMtimeMs: envelope.sourceMtimeMs,
      latestSourceMtimeMs: sourceMtimeMs,
      buildMs: envelope.buildMs,
    })
  }
  const rebuilt = await writeWarehouseProjection(c, kind, build, sourceMtimeMs)
  return annotateWarehouseValue(rebuilt.value, {
    stale: false,
    recomputing: false,
    source: 'projection',
    generatedAt: rebuilt.generatedAt,
    sourceMtimeMs: rebuilt.sourceMtimeMs,
    buildMs: rebuilt.buildMs,
  })
}

async function rebuildWarehouseProjections(
  c: Context,
  options: { scope?: WarehouseRebuildScope } = {},
) {
  const lockKey = getWorkspaceId(c) ?? 'default'
  if (warehouseRebuildLocks.has(lockKey)) {
    return {
      ok: true,
      skipped: true,
      reason: 'warehouse_rebuild_already_running',
      job: await readWarehouseJob(c),
    }
  }
  warehouseRebuildLocks.add(lockKey)
  const startedAt = performance.now()
  const sourceMtimeMs = await latestWarehouseSourceMtimeMs(getDataDir(c))
  const dirtyBefore = (await readWarehouseManifest(c))?.dirty ?? []
  const plan = await planWarehouseRebuild(
    c,
    options.scope ?? 'full',
    dirtyBefore,
  )
  const jobId = `warehouse-${Date.now()}`
  try {
    await writeWarehouseJob(c, {
      schemaVersion: WAREHOUSE_SCHEMA_VERSION,
      id: jobId,
      state: 'running',
      scope: plan.scope,
      requestedScope: plan.requestedScope,
      startedAt: new Date().toISOString(),
      sourceMtimeMs,
      dirtyBefore,
      dirtyMonths: plan.dirtyMonths,
    })
    const visibleData =
      plan.scope === 'dirty' ? await readVisibleFormulaData(c) : undefined
    const [monthlyAggregates, transactionIndexes, cards, dataHealth] =
      await Promise.all([
        plan.scope === 'dirty'
          ? writeWarehouseDirtyMonthlyAggregates(
              c,
              sourceMtimeMs,
              plan.dirtyMonths,
              visibleData,
            )
          : writeWarehouseMonthlyAggregates(c, sourceMtimeMs),
        plan.scope === 'dirty'
          ? writeWarehouseDirtyTransactionIndexes(
              c,
              sourceMtimeMs,
              plan.dirtyMonths,
              visibleData,
            )
          : writeWarehouseTransactionIndexes(c, sourceMtimeMs),
        writeWarehouseProjection(
          c,
          'cards',
          () => buildCardsList(c),
          sourceMtimeMs,
        ),
        writeWarehouseProjection(
          c,
          'data-health',
          () => buildDataHealth(c),
          sourceMtimeMs,
        ),
      ])
    const buildMs = Math.round(performance.now() - startedAt)
    const artifacts = {
      cards: projectionSummary(cards),
      dataHealth: projectionSummary(dataHealth),
      monthlyAggregates: aggregateSummary(monthlyAggregates),
      transactionIndexes: indexSummary(transactionIndexes),
    }
    await writeWarehouseManifest(c, {
      schemaVersion: WAREHOUSE_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      sourceMtimeMs: Math.max(
        cards.sourceMtimeMs,
        dataHealth.sourceMtimeMs,
        monthlyAggregates.sourceMtimeMs,
        transactionIndexes.sourceMtimeMs,
      ),
      dirty: [],
      artifacts: {
        projections: {
          cards: projectionSummary(cards),
          'data-health': projectionSummary(dataHealth),
        },
        aggregates: {
          monthly: aggregateSummary(monthlyAggregates),
        },
        indexes: {
          transactions: indexSummary(transactionIndexes),
        },
      },
    })
    await writeWarehouseJob(c, {
      schemaVersion: WAREHOUSE_SCHEMA_VERSION,
      id: jobId,
      state: 'complete',
      scope: plan.scope,
      requestedScope: plan.requestedScope,
      startedAt: new Date(Date.now() - buildMs).toISOString(),
      completedAt: new Date().toISOString(),
      sourceMtimeMs,
      buildMs,
      dirtyBefore,
      dirtyMonths: plan.dirtyMonths,
      artifacts,
    })
    invalidateMoneyReadCache(c, { markWarehouseDirty: false })
    return {
      ok: true,
      scope: plan.scope,
      requestedScope: plan.requestedScope,
      generatedAt: new Date().toISOString(),
      sourceMtimeMs,
      buildMs,
      dirtyBefore,
      dirtyMonths: plan.dirtyMonths,
      projections: {
        cards: projectionSummary(cards),
        dataHealth: projectionSummary(dataHealth),
      },
      aggregates: {
        monthly: aggregateSummary(monthlyAggregates),
      },
      indexes: {
        transactions: indexSummary(transactionIndexes),
      },
    }
  } catch (error) {
    const buildMs = Math.round(performance.now() - startedAt)
    await writeWarehouseJob(c, {
      schemaVersion: WAREHOUSE_SCHEMA_VERSION,
      id: jobId,
      state: 'error',
      scope: plan.scope,
      requestedScope: plan.requestedScope,
      startedAt: new Date(Date.now() - buildMs).toISOString(),
      failedAt: new Date().toISOString(),
      sourceMtimeMs,
      buildMs,
      dirtyBefore,
      dirtyMonths: plan.dirtyMonths,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  } finally {
    warehouseRebuildLocks.delete(lockKey)
  }
}

async function startWarehouseRebuild(
  c: Context,
  options: { scope?: WarehouseRebuildScope } = {},
) {
  const lockKey = getWorkspaceId(c) ?? 'default'
  const runningJob = await readWarehouseJob(c)
  if (warehouseRebuildLocks.has(lockKey)) {
    return {
      ok: true,
      started: false,
      running: true,
      job: runningJob,
      status: await buildWarehouseStatus(c),
    }
  }

  const sourceMtimeMs = await latestWarehouseSourceMtimeMs(getDataDir(c))
  const dirtyBefore = (await readWarehouseManifest(c))?.dirty ?? []
  const plan = await planWarehouseRebuild(
    c,
    options.scope ?? 'full',
    dirtyBefore,
  )
  const job: WarehouseJobStatus = {
    schemaVersion: WAREHOUSE_SCHEMA_VERSION,
    id: `warehouse-${Date.now()}`,
    state: 'running',
    scope: plan.scope,
    requestedScope: plan.requestedScope,
    startedAt: new Date().toISOString(),
    sourceMtimeMs,
    dirtyBefore,
    dirtyMonths: plan.dirtyMonths,
  }
  await writeWarehouseJob(c, job)
  void rebuildWarehouseProjections(c, { scope: options.scope }).catch(() => {
    // rebuildWarehouseProjections persists the error job; callers observe it via status.
  })
  return {
    ok: true,
    started: true,
    running: true,
    job,
    status: await buildWarehouseStatus(c),
  }
}

async function buildWarehouseStatus(c: Context) {
  const sourceMtimeMs = await latestWarehouseSourceMtimeMs(getDataDir(c))
  const [
    cards,
    dataHealth,
    monthlyAggregates,
    transactionIndexes,
    manifest,
    job,
    importJob,
  ] = await Promise.all([
    readWarehouseProjection(c, 'cards'),
    readWarehouseProjection(c, 'data-health'),
    readWarehouseMonthlyAggregates(c),
    readWarehouseTransactionIndexes(c),
    readWarehouseManifest(c),
    readWarehouseJob(c),
    readImportJob(c),
  ])
  const dirty = manifest?.dirty ?? []
  return {
    schemaVersion: WAREHOUSE_SCHEMA_VERSION,
    sourceMtimeMs,
    generatedAt: new Date().toISOString(),
    busy: job?.state === 'running' || importJob?.state === 'running',
    importing: importJob?.state === 'running',
    recomputing: job?.state === 'running',
    job: job ?? null,
    importJob: importJob ?? null,
    dirty,
    projections: {
      cards: warehouseProjectionStatus(cards, sourceMtimeMs, dirty),
      dataHealth: warehouseProjectionStatus(dataHealth, sourceMtimeMs, dirty),
    },
    aggregates: {
      monthly: warehouseAggregateStatus(
        monthlyAggregates,
        sourceMtimeMs,
        dirty,
      ),
    },
    indexes: {
      transactions: warehouseIndexStatus(
        transactionIndexes,
        sourceMtimeMs,
        dirty,
      ),
    },
  }
}

async function planWarehouseRebuild(
  c: Context,
  requestedScope: WarehouseRebuildScope,
  dirty: WarehouseDirtyPartition[],
): Promise<{
  requestedScope: WarehouseRebuildScope
  scope: WarehouseRebuildScope
  dirtyMonths: string[]
}> {
  if (requestedScope === 'full') {
    return { requestedScope, scope: 'full', dirtyMonths: [] }
  }

  const dirtyMonths = dirtyTransactionMonths(dirty)
  if (dirtyMonths.length === 0 || hasBroadWarehouseDirtyScope(dirty)) {
    return { requestedScope, scope: 'full', dirtyMonths }
  }

  const [monthlyAggregates, transactionIndexes] = await Promise.all([
    readWarehouseMonthlyAggregates(c),
    readWarehouseTransactionIndexes(c),
  ])
  if (!monthlyAggregates || !transactionIndexes) {
    return { requestedScope, scope: 'full', dirtyMonths }
  }

  return { requestedScope, scope: 'dirty', dirtyMonths }
}

function dirtyTransactionMonths(dirty: WarehouseDirtyPartition[]): string[] {
  return [
    ...new Set(
      dirty
        .filter(
          (entry) =>
            entry.scope === 'transactions' &&
            typeof entry.partition === 'string' &&
            /^\d{4}-\d{2}$/.test(entry.partition),
        )
        .map((entry) => entry.partition as string),
    ),
  ].sort()
}

function hasBroadWarehouseDirtyScope(
  dirty: WarehouseDirtyPartition[],
): boolean {
  return dirty.some((entry) => {
    if (
      entry.scope === 'transactions' &&
      /^\d{4}-\d{2}$/.test(entry.partition ?? '')
    ) {
      return false
    }
    if (entry.scope === 'cards' || entry.scope === 'data-health') {
      return false
    }
    return true
  })
}

function projectionSummary<T>(envelope: WarehouseProjectionEnvelope<T>) {
  return {
    exists: true,
    stale: false,
    generatedAt: envelope.generatedAt,
    sourceMtimeMs: envelope.sourceMtimeMs,
    buildMs: envelope.buildMs,
  }
}

function aggregateSummary(envelope: WarehouseMonthlyAggregateEnvelope) {
  return {
    exists: true,
    stale: false,
    generatedAt: envelope.generatedAt,
    sourceMtimeMs: envelope.sourceMtimeMs,
    buildMs: envelope.buildMs,
    count: envelope.months.length,
  }
}

function indexSummary(envelope: WarehouseTransactionIndexesEnvelope) {
  return {
    exists: true,
    stale: false,
    generatedAt: envelope.generatedAt,
    sourceMtimeMs: envelope.sourceMtimeMs,
    buildMs: envelope.buildMs,
    count: envelope.transactionCount,
  }
}

function warehouseProjectionStatus<T>(
  envelope: WarehouseProjectionEnvelope<T> | null,
  sourceMtimeMs: number,
  dirty: WarehouseDirtyPartition[] = [],
) {
  if (!envelope) {
    return {
      exists: false,
      stale: true,
    }
  }
  return {
    exists: true,
    stale:
      envelope.schemaVersion !== WAREHOUSE_SCHEMA_VERSION ||
      envelope.sourceMtimeMs < sourceMtimeMs ||
      (dirtyAffectsWarehouseKind(dirty, envelope.kind) &&
        envelope.sourceMtimeMs < sourceMtimeMs),
    generatedAt: envelope.generatedAt,
    sourceMtimeMs: envelope.sourceMtimeMs,
    buildMs: envelope.buildMs,
  }
}

function warehouseAggregateStatus(
  envelope: WarehouseMonthlyAggregateEnvelope | null,
  sourceMtimeMs: number,
  dirty: WarehouseDirtyPartition[] = [],
) {
  if (!envelope) return { exists: false, stale: true }
  return {
    exists: true,
    stale:
      envelope.schemaVersion !== WAREHOUSE_SCHEMA_VERSION ||
      envelope.sourceMtimeMs < sourceMtimeMs ||
      dirtyAffectsWarehouseKind(dirty, 'monthly-aggregates'),
    generatedAt: envelope.generatedAt,
    sourceMtimeMs: envelope.sourceMtimeMs,
    buildMs: envelope.buildMs,
    count: envelope.months.length,
  }
}

function warehouseIndexStatus(
  envelope: WarehouseTransactionIndexesEnvelope | null,
  sourceMtimeMs: number,
  dirty: WarehouseDirtyPartition[] = [],
) {
  if (!envelope) return { exists: false, stale: true }
  return {
    exists: true,
    stale:
      envelope.schemaVersion !== WAREHOUSE_SCHEMA_VERSION ||
      envelope.sourceMtimeMs < sourceMtimeMs ||
      dirtyAffectsWarehouseKind(dirty, 'transaction-indexes'),
    generatedAt: envelope.generatedAt,
    sourceMtimeMs: envelope.sourceMtimeMs,
    buildMs: envelope.buildMs,
    count: envelope.transactionCount,
  }
}

async function readWarehouseProjection<T>(
  c: Context,
  kind: WarehouseProjectionKind,
): Promise<WarehouseProjectionEnvelope<T> | null> {
  return readWarehouseJson<WarehouseProjectionEnvelope<T>>(
    warehouseProjectionPath(getDataDir(c), kind),
  )
}

async function writeWarehouseProjection<T>(
  c: Context,
  kind: WarehouseProjectionKind,
  build: () => Promise<T>,
  sourceMtimeMs: number,
): Promise<WarehouseProjectionEnvelope<T>> {
  const startedAt = performance.now()
  const value = await build()
  const finalSourceMtimeMs = await latestWarehouseSourceMtimeMs(getDataDir(c))
  const envelope: WarehouseProjectionEnvelope<T> = {
    schemaVersion: WAREHOUSE_SCHEMA_VERSION,
    kind,
    generatedAt: new Date().toISOString(),
    sourceMtimeMs: Math.max(sourceMtimeMs, finalSourceMtimeMs),
    buildMs: Math.round(performance.now() - startedAt),
    value,
  }
  const filePath = warehouseProjectionPath(getDataDir(c), kind)
  await writeWarehouseJsonAtomic(filePath, envelope)
  return envelope
}

function warehouseProjectionPath(
  dataDir: string,
  kind: WarehouseProjectionKind,
): string {
  return safePath(dataDir, 'projections', kind, 'current.json')
}

async function writeWarehouseMonthlyAggregates(
  c: Context,
  sourceMtimeMs: number,
): Promise<WarehouseMonthlyAggregateEnvelope> {
  const startedAt = performance.now()
  const data = await readVisibleFormulaData(c)
  const byMonth = buildWarehouseMonthlyRollups(data.transactions)

  const { months, totals } = buildWarehouseMonthlyTotals(byMonth)

  const finalSourceMtimeMs = await latestWarehouseSourceMtimeMs(getDataDir(c))
  const envelope: WarehouseMonthlyAggregateEnvelope = {
    schemaVersion: WAREHOUSE_SCHEMA_VERSION,
    kind: 'monthly-aggregates',
    generatedAt: new Date().toISOString(),
    sourceMtimeMs: Math.max(sourceMtimeMs, finalSourceMtimeMs),
    buildMs: Math.round(performance.now() - startedAt),
    months,
    totals,
  }
  const dataDir = getDataDir(c)
  await Promise.all([
    writeWarehouseJsonAtomic(warehouseMonthlyAggregatesPath(dataDir), envelope),
    ...months.map((month) =>
      writeWarehouseJsonAtomic(
        warehouseMonthlyAggregateMonthPath(dataDir, month),
        {
          schemaVersion: WAREHOUSE_SCHEMA_VERSION,
          kind: 'monthly-aggregate',
          generatedAt: envelope.generatedAt,
          sourceMtimeMs: envelope.sourceMtimeMs,
          month,
          rollup: byMonth[month],
        },
      ),
    ),
  ])
  return envelope
}

async function writeWarehouseDirtyMonthlyAggregates(
  c: Context,
  sourceMtimeMs: number,
  dirtyMonths: string[],
  formulaData?: MoneyFormulaData,
): Promise<WarehouseMonthlyAggregateEnvelope> {
  const startedAt = performance.now()
  const previous = await readWarehouseMonthlyAggregates(c)
  if (!previous || previous.schemaVersion !== WAREHOUSE_SCHEMA_VERSION) {
    return writeWarehouseMonthlyAggregates(c, sourceMtimeMs)
  }

  const data = formulaData ?? (await readVisibleFormulaData(c))
  const dirtyMonthSet = new Set(dirtyMonths)
  const dirtyRollups = buildWarehouseMonthlyRollups(
    data.transactions.filter((transaction) =>
      dirtyMonthSet.has(transaction.date.slice(0, 7)),
    ),
  )
  const byMonth: Record<string, WarehouseMonthlyRollup> = {
    ...previous.totals.byMonth,
  }
  for (const month of dirtyMonths) {
    const rollup = dirtyRollups[month]
    if (rollup && rollup.transactionCount > 0) {
      byMonth[month] = rollup
    } else {
      delete byMonth[month]
    }
  }

  const { months, totals } = buildWarehouseMonthlyTotals(byMonth)
  const finalSourceMtimeMs = await latestWarehouseSourceMtimeMs(getDataDir(c))
  const envelope: WarehouseMonthlyAggregateEnvelope = {
    schemaVersion: WAREHOUSE_SCHEMA_VERSION,
    kind: 'monthly-aggregates',
    generatedAt: new Date().toISOString(),
    sourceMtimeMs: Math.max(sourceMtimeMs, finalSourceMtimeMs),
    buildMs: Math.round(performance.now() - startedAt),
    months,
    totals,
  }
  const dataDir = getDataDir(c)
  await Promise.all([
    writeWarehouseJsonAtomic(warehouseMonthlyAggregatesPath(dataDir), envelope),
    ...dirtyMonths.map((month) => {
      const rollup = byMonth[month]
      if (!rollup)
        return fs.rm(warehouseMonthlyAggregateMonthPath(dataDir, month), {
          force: true,
        })
      return writeWarehouseJsonAtomic(
        warehouseMonthlyAggregateMonthPath(dataDir, month),
        {
          schemaVersion: WAREHOUSE_SCHEMA_VERSION,
          kind: 'monthly-aggregate',
          generatedAt: envelope.generatedAt,
          sourceMtimeMs: envelope.sourceMtimeMs,
          month,
          rollup,
        },
      )
    }),
  ])
  return envelope
}

async function readWarehouseMonthlyAggregates(
  c: Context,
): Promise<WarehouseMonthlyAggregateEnvelope | null> {
  return readWarehouseJson<WarehouseMonthlyAggregateEnvelope>(
    warehouseMonthlyAggregatesPath(getDataDir(c)),
  )
}

function buildWarehouseMonthlyRollups(
  transactions: MoneyTransaction[],
): Record<string, WarehouseMonthlyRollup> {
  const byMonth: Record<string, WarehouseMonthlyRollup> = {}
  for (const transaction of transactions) {
    const month = transaction.date.slice(0, 7)
    const rollup =
      byMonth[month] ?? (byMonth[month] = emptyWarehouseMonthlyRollup(month))
    addTransactionToWarehouseRollup(rollup, transaction)
  }
  return byMonth
}

function emptyWarehouseMonthlyRollup(month: string): WarehouseMonthlyRollup {
  return {
    month,
    income: 0,
    expenses: 0,
    transfers: 0,
    cashFlow: 0,
    transactionCount: 0,
    byCategory: {},
    byMerchant: {},
    byAccount: {},
    byCurrency: {},
    byDirection: {
      income: emptyWarehouseBucket('income', 'Income'),
      expense: emptyWarehouseBucket('expense', 'Expenses'),
      transfer: emptyWarehouseBucket('transfer', 'Transfers'),
    },
  }
}

function buildWarehouseMonthlyTotals(
  byMonth: Record<string, WarehouseMonthlyRollup>,
): { months: string[]; totals: WarehouseMonthlyTotals } {
  const months = Object.keys(byMonth).sort()
  const totals: WarehouseMonthlyTotals = {
    income: 0,
    expenses: 0,
    transfers: 0,
    cashFlow: 0,
    transactionCount: 0,
    byMonth,
  }
  for (const month of months) {
    const rollup = byMonth[month]
    if (!rollup) continue
    totals.income += rollup.income
    totals.expenses += rollup.expenses
    totals.transfers += rollup.transfers
    totals.cashFlow += rollup.cashFlow
    totals.transactionCount += rollup.transactionCount
  }
  return { months, totals }
}

async function writeWarehouseTransactionIndexes(
  c: Context,
  sourceMtimeMs: number,
): Promise<WarehouseTransactionIndexesEnvelope> {
  const startedAt = performance.now()
  const data = await readVisibleFormulaData(c)
  const generatedAt = new Date().toISOString()
  const indexes = buildWarehouseTransactionIndexMaps(
    data.transactions,
    generatedAt,
    sourceMtimeMs,
  )

  const dataDir = getDataDir(c)
  const finalDir = warehouseTransactionIndexesDir(dataDir)
  await fs.mkdir(finalDir, { recursive: true })

  const writeTasks: Promise<void>[] = []
  const indexCounts: Record<string, number> = {}
  for (const [indexName, files] of Object.entries(indexes) as Array<
    [
      WarehouseTransactionIndexFile['index'],
      Map<string, WarehouseTransactionIndexFile>,
    ]
  >) {
    indexCounts[indexName] = files.size
    for (const file of files.values()) {
      file.entries.sort(compareWarehouseTransactionIndexEntries)
      file.total = file.entries.length
      file.transactionIds = file.entries.map((entry) => entry.id)
      writeTasks.push(
        writeWarehouseJsonAtomic(
          warehouseTransactionIndexPath(dataDir, indexName, file.key),
          file,
        ),
      )
    }
  }
  await Promise.all(writeTasks)

  const finalSourceMtimeMs = await latestWarehouseSourceMtimeMs(dataDir)
  const envelope: WarehouseTransactionIndexesEnvelope = {
    schemaVersion: WAREHOUSE_SCHEMA_VERSION,
    kind: 'transaction-indexes',
    generatedAt,
    sourceMtimeMs: Math.max(sourceMtimeMs, finalSourceMtimeMs),
    buildMs: Math.round(performance.now() - startedAt),
    transactionCount: data.transactions.length,
    indexCounts,
  }
  await writeWarehouseJsonAtomic(
    warehouseTransactionIndexesManifestPath(dataDir),
    envelope,
  )
  return envelope
}

async function writeWarehouseDirtyTransactionIndexes(
  c: Context,
  sourceMtimeMs: number,
  dirtyMonths: string[],
  formulaData?: MoneyFormulaData,
): Promise<WarehouseTransactionIndexesEnvelope> {
  const startedAt = performance.now()
  const previous = await readWarehouseTransactionIndexes(c)
  if (!previous || previous.schemaVersion !== WAREHOUSE_SCHEMA_VERSION) {
    return writeWarehouseTransactionIndexes(c, sourceMtimeMs)
  }

  const data = formulaData ?? (await readVisibleFormulaData(c))
  const generatedAt = new Date().toISOString()
  const dirtyMonthSet = new Set(dirtyMonths)
  const dirtyIndexes = buildWarehouseTransactionIndexMaps(
    data.transactions.filter((transaction) =>
      dirtyMonthSet.has(transaction.date.slice(0, 7)),
    ),
    generatedAt,
    sourceMtimeMs,
  )
  const dataDir = getDataDir(c)
  const indexNames = [
    'account',
    'merchant',
    'category',
    'transfer-reason',
  ] as const satisfies readonly WarehouseTransactionIndexFile['index'][]

  await Promise.all(
    indexNames.map(async (indexName) => {
      const existingFiles = await readWarehouseTransactionIndexFiles(
        dataDir,
        indexName,
      )
      const existingByKey = new Map(
        existingFiles.map((file) => [file.key, file]),
      )
      const touchedKeys = new Set<string>(dirtyIndexes[indexName].keys())
      for (const file of existingFiles) {
        if (file.entries.some((entry) => dirtyMonthSet.has(entry.month))) {
          touchedKeys.add(file.key)
        }
      }

      await Promise.all(
        [...touchedKeys].map(async (key) => {
          const existing = existingByKey.get(key)
          const nextDirty = dirtyIndexes[indexName].get(key)
          const cleanEntries =
            existing?.entries.filter(
              (entry) => !dirtyMonthSet.has(entry.month),
            ) ?? []
          const entriesById = new Map<string, WarehouseTransactionIndexEntry>()
          for (const entry of cleanEntries) entriesById.set(entry.id, entry)
          for (const entry of nextDirty?.entries ?? [])
            entriesById.set(entry.id, entry)
          const entries = [...entriesById.values()].sort(
            compareWarehouseTransactionIndexEntries,
          )
          const filePath = warehouseTransactionIndexPath(
            dataDir,
            indexName,
            key,
          )
          if (entries.length === 0) {
            await fs.rm(filePath, { force: true })
            return
          }
          const file: WarehouseTransactionIndexFile = {
            schemaVersion: WAREHOUSE_SCHEMA_VERSION,
            kind: 'transaction-index',
            index: indexName,
            key,
            label: nextDirty?.label ?? existing?.label ?? key,
            generatedAt,
            sourceMtimeMs,
            total: entries.length,
            transactionIds: entries.map((entry) => entry.id),
            entries,
          }
          await writeWarehouseJsonAtomic(filePath, file)
        }),
      )
    }),
  )

  const finalSourceMtimeMs = await latestWarehouseSourceMtimeMs(dataDir)
  const indexCounts: Record<string, number> = {}
  await Promise.all(
    indexNames.map(async (indexName) => {
      indexCounts[indexName] = await countWarehouseTransactionIndexFiles(
        dataDir,
        indexName,
      )
    }),
  )
  const envelope: WarehouseTransactionIndexesEnvelope = {
    schemaVersion: WAREHOUSE_SCHEMA_VERSION,
    kind: 'transaction-indexes',
    generatedAt,
    sourceMtimeMs: Math.max(sourceMtimeMs, finalSourceMtimeMs),
    buildMs: Math.round(performance.now() - startedAt),
    transactionCount: data.transactions.length,
    indexCounts,
  }
  await writeWarehouseJsonAtomic(
    warehouseTransactionIndexesManifestPath(dataDir),
    envelope,
  )
  return envelope
}

async function readWarehouseTransactionIndexes(
  c: Context,
): Promise<WarehouseTransactionIndexesEnvelope | null> {
  return readWarehouseJson<WarehouseTransactionIndexesEnvelope>(
    warehouseTransactionIndexesManifestPath(getDataDir(c)),
  )
}

async function readWarehouseTransactionIndex(
  c: Context,
  index: WarehouseTransactionIndexFile['index'],
  key: string,
): Promise<WarehouseTransactionIndexFile | null> {
  return readWarehouseJson<WarehouseTransactionIndexFile>(
    warehouseTransactionIndexPath(getDataDir(c), index, key),
  )
}

async function searchVisibleTransactionsWithWarehouse(
  c: Context,
  filters: TransactionSearchFilters,
) {
  const indexed = await searchVisibleTransactionsFromWarehouseIndex(c, filters)
  if (indexed) return indexed
  const result = await searchVisibleTransactionsFromStorage(c, filters)
  return {
    ...result,
    warehouse: {
      source: 'fact-scan',
      indexed: false,
    },
  }
}

async function searchVisibleTransactionsFromWarehouseIndex(
  c: Context,
  filters: TransactionSearchFilters,
): Promise<
  | (ReturnType<typeof searchTransactions> & {
      warehouse: {
        source: 'index'
        indexed: true
        index: WarehouseTransactionIndexFile['index']
        key: string
        generatedAt: string
        sourceMtimeMs: number
        stale: false
      }
    })
  | null
> {
  const indexRef = transactionIndexRefForFilters(filters)
  if (!indexRef) return null

  const [manifest, sourceMtimeMs] = await Promise.all([
    readWarehouseTransactionIndexes(c),
    latestWarehouseSourceMtimeMs(getDataDir(c)),
  ])
  if (
    !manifest ||
    manifest.schemaVersion !== WAREHOUSE_SCHEMA_VERSION ||
    manifest.sourceMtimeMs < sourceMtimeMs
  ) {
    return null
  }

  const file = await readWarehouseTransactionIndex(
    c,
    indexRef.index,
    indexRef.key,
  )
  if (!file || file.schemaVersion !== WAREHOUSE_SCHEMA_VERSION) return null

  const filteredEntries = file.entries
    .filter((entry) =>
      transactionIndexEntryMatchesFilters(entry, filters, indexRef),
    )
    .sort(compareWarehouseTransactionIndexEntries)
  const limit = clampNumber(filters.limit ?? 100, 1, 500)
  const offset =
    pageOffsetFromCursorValue(filters.cursor) ??
    Math.max(0, filters.offset ?? 0)
  const pageEntries = filteredEntries.slice(offset, offset + limit)
  const transactions = await hydrateWarehouseTransactionIndexEntries(
    c,
    pageEntries,
  )
  const nextOffset = offset + limit
  const hasMore = nextOffset < filteredEntries.length

  return {
    transactions,
    total: filteredEntries.length,
    limit,
    offset,
    hasMore,
    nextOffset: hasMore ? nextOffset : undefined,
    nextCursor: hasMore ? `offset:${nextOffset}` : undefined,
    warehouse: {
      source: 'index',
      indexed: true,
      index: indexRef.index,
      key: indexRef.key,
      generatedAt: file.generatedAt,
      sourceMtimeMs: file.sourceMtimeMs,
      stale: false,
    },
  }
}

function transactionIndexRefForFilters(
  filters: TransactionSearchFilters,
): { index: WarehouseTransactionIndexFile['index']; key: string } | null {
  if (filters.q || filters.currencyCode) return null
  if (filters.accountId) return { index: 'account', key: filters.accountId }
  if (filters.category)
    return { index: 'category', key: slugify(filters.category) }
  return null
}

function transactionIndexEntryMatchesFilters(
  entry: WarehouseTransactionIndexEntry,
  filters: TransactionSearchFilters,
  indexRef: { index: WarehouseTransactionIndexFile['index']; key: string },
): boolean {
  if (
    indexRef.index !== 'account' &&
    filters.accountId &&
    entry.accountId !== filters.accountId
  ) {
    return false
  }
  if (filters.direction && entry.direction !== filters.direction) return false
  if (filters.startDate && entry.date < filters.startDate) return false
  if (filters.endDate && entry.date > filters.endDate) return false
  const amount = Math.abs(entry.reportingValue ?? entry.amount)
  if (filters.minAmount !== undefined && amount < filters.minAmount)
    return false
  if (filters.maxAmount !== undefined && amount > filters.maxAmount)
    return false
  return true
}

function compareWarehouseTransactionIndexEntries(
  a: WarehouseTransactionIndexEntry,
  b: WarehouseTransactionIndexEntry,
): number {
  return b.date.localeCompare(a.date) || a.id.localeCompare(b.id)
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function pageOffsetFromCursorValue(
  cursor: string | undefined,
): number | undefined {
  if (!cursor) return undefined
  const match = /^offset:(\d+)$/.exec(cursor)
  if (!match) return undefined
  const offset = Number(match[1])
  return Number.isFinite(offset) ? offset : undefined
}

async function hydrateWarehouseTransactionIndexEntries(
  c: Context,
  entries: WarehouseTransactionIndexEntry[],
): Promise<MoneyTransaction[]> {
  if (entries.length === 0) return []
  const ids = new Set(entries.map((entry) => entry.id))
  const months = [...new Set(entries.map((entry) => entry.month))]
  const transactionsById = new Map<string, MoneyTransaction>()
  await Promise.all(
    months.map(async (month) => {
      const transactions = await readJson<MoneyTransaction[]>(
        safePath(getDataDir(c), 'transactions', `${month}.json`),
        [],
      )
      for (const transaction of transactions) {
        if (ids.has(transaction.id))
          transactionsById.set(transaction.id, transaction)
      }
    }),
  )
  return entries
    .map((entry) => transactionsById.get(entry.id))
    .filter((transaction): transaction is MoneyTransaction =>
      Boolean(transaction),
    )
}

function addTransactionToWarehouseRollup(
  rollup: WarehouseMonthlyRollup,
  transaction: MoneyTransaction,
): void {
  const amount = warehouseTransactionAmount(transaction)
  rollup.transactionCount += 1
  if (transaction.direction === 'income') rollup.income += amount
  if (transaction.direction === 'expense') rollup.expenses += amount
  if (transaction.direction === 'transfer') rollup.transfers += amount
  rollup.cashFlow = rollup.income - rollup.expenses
  addWarehouseBucket(
    rollup.byDirection,
    transaction.direction,
    titleFromId(transaction.direction),
    transaction,
  )
  const category = warehouseTransactionFormulaCategory(transaction)
  addWarehouseBucket(
    rollup.byCategory,
    slugify(category),
    category,
    transaction,
  )
  if (transaction.merchantName || transaction.name) {
    const merchant = transaction.merchantName ?? transaction.name
    addWarehouseBucket(
      rollup.byMerchant,
      slugify(merchant),
      merchant,
      transaction,
    )
  }
  if (transaction.accountId) {
    addWarehouseBucket(
      rollup.byAccount,
      transaction.accountId,
      transaction.accountId,
      transaction,
    )
  }
  addWarehouseBucket(
    rollup.byCurrency,
    normalizeCurrencyCode(
      transaction.reportingCurrency ?? transaction.isoCurrencyCode,
    ),
    normalizeCurrencyCode(
      transaction.reportingCurrency ?? transaction.isoCurrencyCode,
    ),
    transaction,
  )
}

function addWarehouseBucket(
  buckets: Record<string, WarehouseRollupBucket>,
  id: string,
  label: string,
  transaction: MoneyTransaction,
): void {
  const bucket = buckets[id] ?? (buckets[id] = emptyWarehouseBucket(id, label))
  const amount = warehouseTransactionAmount(transaction)
  bucket.amount += amount
  bucket.count += 1
  if (transaction.direction === 'income') bucket.income += amount
  if (transaction.direction === 'expense') bucket.expenses += amount
  if (transaction.direction === 'transfer') bucket.transfers += amount
}

function emptyWarehouseBucket(
  id: string,
  label: string,
): WarehouseRollupBucket {
  return {
    id,
    label,
    amount: 0,
    income: 0,
    expenses: 0,
    transfers: 0,
    count: 0,
  }
}

function warehouseTransactionAmount(transaction: MoneyTransaction): number {
  return Math.abs(
    transaction.reportingValue ?? transaction.valueForSum ?? transaction.amount,
  )
}

function warehouseTransactionCategories(
  transaction: MoneyTransaction,
): string[] {
  return [
    transaction.userCategory,
    ...transaction.category,
    transaction.providerCategoryDetailed,
    transaction.providerCategoryPrimary,
  ].filter((category): category is string => Boolean(category))
}

function warehouseTransactionFormulaCategory(
  transaction: MoneyTransaction,
): string {
  return (
    transaction.userCategory ??
    (transaction.category.length > 0
      ? transaction.category.join(' ')
      : undefined) ??
    transaction.providerCategoryDetailed ??
    transaction.providerCategoryPrimary ??
    'Other'
  )
}

function warehouseTransactionIndexEntry(
  transaction: MoneyTransaction,
): WarehouseTransactionIndexEntry {
  return {
    id: transaction.id,
    month: transaction.date.slice(0, 7),
    date: transaction.date,
    amount: transaction.amount,
    reportingValue: transaction.reportingValue,
    direction: transaction.direction,
    accountId: transaction.accountId,
    merchantName: transaction.merchantName,
    category: warehouseTransactionFormulaCategory(transaction),
    transferReason: transaction.transferReason,
  }
}

function buildWarehouseTransactionIndexMaps(
  transactions: MoneyTransaction[],
  generatedAt: string,
  sourceMtimeMs: number,
): Record<
  WarehouseTransactionIndexFile['index'],
  Map<string, WarehouseTransactionIndexFile>
> {
  const indexes = {
    account: new Map<string, WarehouseTransactionIndexFile>(),
    merchant: new Map<string, WarehouseTransactionIndexFile>(),
    category: new Map<string, WarehouseTransactionIndexFile>(),
    'transfer-reason': new Map<string, WarehouseTransactionIndexFile>(),
  } satisfies Record<
    WarehouseTransactionIndexFile['index'],
    Map<string, WarehouseTransactionIndexFile>
  >

  for (const transaction of transactions) {
    const entry = warehouseTransactionIndexEntry(transaction)
    if (transaction.accountId) {
      addWarehouseIndexEntry(
        indexes.account,
        'account',
        transaction.accountId,
        transaction.accountId,
        entry,
        generatedAt,
        sourceMtimeMs,
      )
    }
    const merchantLabel = transaction.merchantName ?? transaction.name
    if (merchantLabel) {
      addWarehouseIndexEntry(
        indexes.merchant,
        'merchant',
        slugify(merchantLabel),
        merchantLabel,
        entry,
        generatedAt,
        sourceMtimeMs,
      )
    }
    for (const category of warehouseTransactionCategories(transaction)) {
      addWarehouseIndexEntry(
        indexes.category,
        'category',
        slugify(category),
        category,
        entry,
        generatedAt,
        sourceMtimeMs,
      )
    }
    if (transaction.transferReason) {
      addWarehouseIndexEntry(
        indexes['transfer-reason'],
        'transfer-reason',
        slugify(transaction.transferReason),
        transaction.transferReason,
        entry,
        generatedAt,
        sourceMtimeMs,
      )
    }
  }

  return indexes
}

function addWarehouseIndexEntry(
  files: Map<string, WarehouseTransactionIndexFile>,
  index: WarehouseTransactionIndexFile['index'],
  key: string,
  label: string,
  entry: WarehouseTransactionIndexEntry,
  generatedAt: string,
  sourceMtimeMs: number,
): void {
  const file = files.get(key) ?? {
    schemaVersion: WAREHOUSE_SCHEMA_VERSION,
    kind: 'transaction-index',
    index,
    key,
    label,
    generatedAt,
    sourceMtimeMs,
    total: 0,
    transactionIds: [],
    entries: [],
  }
  file.entries.push(entry)
  files.set(key, file)
}

async function readWarehouseTransactionIndexFiles(
  dataDir: string,
  index: WarehouseTransactionIndexFile['index'],
): Promise<WarehouseTransactionIndexFile[]> {
  const dir = safePath(warehouseTransactionIndexesDir(dataDir), index)
  let entries: Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) =>
        readWarehouseJson<WarehouseTransactionIndexFile>(
          safePath(dir, entry.name),
        ),
      ),
  )
  return files.filter(
    (file): file is WarehouseTransactionIndexFile =>
      file !== null &&
      file.schemaVersion === WAREHOUSE_SCHEMA_VERSION &&
      file.index === index,
  )
}

async function countWarehouseTransactionIndexFiles(
  dataDir: string,
  index: WarehouseTransactionIndexFile['index'],
): Promise<number> {
  return (await readWarehouseTransactionIndexFiles(dataDir, index)).length
}

function warehouseMonthlyAggregatesPath(dataDir: string): string {
  return safePath(dataDir, 'aggregates', 'monthly', 'current.json')
}

function warehouseMonthlyAggregateMonthPath(
  dataDir: string,
  month: string,
): string {
  return safePath(dataDir, 'aggregates', 'monthly', `${month}.json`)
}

function warehouseTransactionIndexesDir(dataDir: string): string {
  return safePath(dataDir, 'indexes', 'transactions')
}

function warehouseTransactionIndexesManifestPath(dataDir: string): string {
  return safePath(warehouseTransactionIndexesDir(dataDir), 'current.json')
}

function warehouseTransactionIndexPath(
  dataDir: string,
  index: WarehouseTransactionIndexFile['index'],
  key: string,
): string {
  return safePath(warehouseTransactionIndexesDir(dataDir), index, `${key}.json`)
}

async function readWarehouseJson<T>(filePath: string): Promise<T | null> {
  try {
    return await readJson<T | null>(filePath, null)
  } catch {
    return null
  }
}

async function writeWarehouseJsonAtomic(
  filePath: string,
  value: unknown,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  warehouseAtomicWriteCounter += 1
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.${warehouseAtomicWriteCounter}.tmp`
  await fs.writeFile(tmpPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await fs.rename(tmpPath, filePath)
}

async function readWarehouseManifest(
  c: Context,
): Promise<WarehouseManifest | null> {
  return readWarehouseJson<WarehouseManifest>(
    warehouseManifestPath(getDataDir(c)),
  )
}

async function writeWarehouseManifest(
  c: Context,
  manifest: WarehouseManifest,
): Promise<void> {
  await writeWarehouseJsonAtomic(warehouseManifestPath(getDataDir(c)), manifest)
}

async function markWarehouseDirty(
  c: Context,
  dirty: Omit<WarehouseDirtyPartition, 'markedAt'>,
): Promise<void> {
  const dataDir = getDataDir(c)
  const sourceMtimeMs = await latestWarehouseSourceMtimeMs(dataDir)
  const manifest = await readWarehouseManifest(c)
  const nextDirty: WarehouseDirtyPartition[] = [
    ...(manifest?.dirty ?? []),
    { ...dirty, markedAt: new Date().toISOString() },
  ]
  const deduped = new Map<string, WarehouseDirtyPartition>()
  for (const entry of nextDirty) {
    deduped.set(
      `${entry.scope}:${entry.partition ?? ''}:${entry.reason ?? ''}`,
      entry,
    )
  }
  await writeWarehouseManifest(c, {
    schemaVersion: WAREHOUSE_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    sourceMtimeMs,
    dirty: [...deduped.values()].slice(-200),
    artifacts: manifest?.artifacts ?? {
      projections: {
        cards: { exists: false, stale: true },
        'data-health': { exists: false, stale: true },
      },
      aggregates: {
        monthly: { exists: false, stale: true },
      },
      indexes: {
        transactions: { exists: false, stale: true },
      },
    },
  })
}

async function readWarehouseJob(
  c: Context,
): Promise<WarehouseJobStatus | null> {
  return readWarehouseJson<WarehouseJobStatus>(warehouseJobPath(getDataDir(c)))
}

async function writeWarehouseJob(
  c: Context,
  job: WarehouseJobStatus,
): Promise<void> {
  await writeWarehouseJsonAtomic(warehouseJobPath(getDataDir(c)), job)
}

async function readImportJob(c: Context): Promise<ImportJobStatus | null> {
  return readWarehouseJson<ImportJobStatus>(importJobPath(getDataDir(c)))
}

async function writeImportJob(c: Context, job: ImportJobStatus): Promise<void> {
  await writeWarehouseJsonAtomic(importJobPath(getDataDir(c)), job)
}

function warehouseManifestPath(dataDir: string): string {
  return safePath(dataDir, 'warehouse', 'manifest.json')
}

function warehouseJobPath(dataDir: string): string {
  return safePath(dataDir, 'jobs', 'warehouse-current.json')
}

function importJobPath(dataDir: string): string {
  return safePath(dataDir, 'jobs', 'import-current.json')
}

function dirtyAffectsWarehouseKind(
  dirty: WarehouseDirtyPartition[],
  kind: WarehouseProjectionKind | 'monthly-aggregates' | 'transaction-indexes',
): boolean {
  if (dirty.length === 0) return false
  if (dirty.some((entry) => entry.scope === 'all')) return true
  if (kind === 'cards')
    return dirty.some((entry) => entry.scope !== 'data-health')
  if (kind === 'data-health')
    return dirty.some((entry) => entry.scope !== 'cards')
  if (kind === 'monthly-aggregates') {
    return dirty.some((entry) =>
      ['transactions', 'extensions', 'settings', 'fx-rates', 'all'].includes(
        entry.scope,
      ),
    )
  }
  return dirty.some((entry) =>
    ['transactions', 'extensions', 'all'].includes(entry.scope),
  )
}

function annotateWarehouseValue<T>(
  value: T,
  warehouse: Record<string, unknown>,
): T {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  return {
    ...value,
    warehouse,
  }
}

async function evaluateFormulaFromWarehouse(
  c: Context,
  formula: string,
): Promise<{
  value: FormulaResultValue
  generatedAt: string
  stale: boolean
} | null> {
  const aggregates = await readWarehouseMonthlyAggregates(c)
  if (!aggregates || aggregates.schemaVersion !== WAREHOUSE_SCHEMA_VERSION)
    return null
  const sourceMtimeMs = await latestWarehouseSourceMtimeMs(getDataDir(c))
  if (aggregates.sourceMtimeMs < sourceMtimeMs) return null

  const normalizedFormula = formula.replace(/\s+/g, '')
  const sumMatch = /^(Income|Expenses|Transfers|CashFlow)\.Sum\(\)$/.exec(
    normalizedFormula,
  )
  if (sumMatch?.[1]) {
    return {
      value: aggregateCollectionTotal(aggregates, sumMatch[1]),
      generatedAt: aggregates.generatedAt,
      stale: false,
    }
  }

  const monthlyAverageMatch =
    /^(Income|Expenses|Transfers|CashFlow)\.MonthlyAverage\((\d+)?\)$/.exec(
      normalizedFormula,
    )
  if (monthlyAverageMatch?.[1]) {
    return {
      value: aggregateCollectionMonthlyAverage(
        aggregates,
        monthlyAverageMatch[1],
        Number(monthlyAverageMatch[2] ?? 6),
      ),
      generatedAt: aggregates.generatedAt,
      stale: false,
    }
  }

  const monthlyTrendMatch =
    /^(Income|Expenses|Transfers|CashFlow)\.Monthly\(\)\.Trend\(\)$/.exec(
      normalizedFormula,
    )
  if (monthlyTrendMatch?.[1]) {
    return {
      value: {
        type: 'series',
        points: aggregates.months.map((month) => {
          const rollup = aggregates.totals.byMonth[month]
          return {
            key: month,
            label: month,
            value: rollup
              ? aggregateRollupValue(rollup, monthlyTrendMatch[1])
              : 0,
            count: rollup?.transactionCount ?? 0,
            startDate: `${month}-01`,
          }
        }),
      },
      generatedAt: aggregates.generatedAt,
      stale: false,
    }
  }

  const categoryBreakdownMatch =
    /^Expenses\.GroupBy\(category\)\.PercentOfTotal\(\)$/.exec(
      normalizedFormula,
    )
  if (categoryBreakdownMatch) {
    const rows = aggregateBucketsAcrossMonths(aggregates, 'byCategory')
      .filter((bucket) => bucket.expenses > 0)
      .sort((a, b) => b.expenses - a.expenses)
    const total = rows.reduce((sum, row) => sum + row.expenses, 0)
    return {
      value: {
        type: 'table',
        columns: [
          { key: 'key', label: 'Category', kind: 'string' },
          { key: 'value', label: 'Value', kind: 'number' },
          { key: 'percentOfTotal', label: 'Percent of Total', kind: 'percent' },
          { key: 'count', label: 'Count', kind: 'number' },
        ],
        rows: rows.map((row) => ({
          key: row.label,
          value: row.expenses,
          percentOfTotal: total === 0 ? 0 : row.expenses / total,
          count: row.count,
        })),
      },
      generatedAt: aggregates.generatedAt,
      stale: false,
    }
  }

  return null
}

function aggregateCollectionTotal(
  aggregates: WarehouseMonthlyAggregateEnvelope,
  collection: string,
): number {
  if (collection === 'Income') return aggregates.totals.income
  if (collection === 'Expenses') return aggregates.totals.expenses
  if (collection === 'Transfers') return aggregates.totals.transfers
  if (collection === 'CashFlow') return aggregates.totals.cashFlow
  return 0
}

function aggregateCollectionMonthlyAverage(
  aggregates: WarehouseMonthlyAggregateEnvelope,
  collection: string,
  months: number,
): number {
  const selectedMonths = aggregates.months.slice(-Math.max(1, months))
  if (selectedMonths.length === 0) return 0
  const total = selectedMonths.reduce((sum, month) => {
    const rollup = aggregates.totals.byMonth[month]
    return sum + (rollup ? aggregateRollupValue(rollup, collection) : 0)
  }, 0)
  return total / selectedMonths.length
}

function aggregateRollupValue(
  rollup: WarehouseMonthlyRollup,
  collection: string,
): number {
  if (collection === 'Income') return rollup.income
  if (collection === 'Expenses') return rollup.expenses
  if (collection === 'Transfers') return rollup.transfers
  if (collection === 'CashFlow') return rollup.cashFlow
  return 0
}

function aggregateBucketsAcrossMonths(
  aggregates: WarehouseMonthlyAggregateEnvelope,
  key: 'byCategory' | 'byMerchant' | 'byAccount' | 'byCurrency',
): WarehouseRollupBucket[] {
  const buckets = new Map<string, WarehouseRollupBucket>()
  for (const month of aggregates.months) {
    const rollup = aggregates.totals.byMonth[month]
    if (!rollup) continue
    for (const bucket of Object.values(rollup[key])) {
      const existing =
        buckets.get(bucket.id) ?? emptyWarehouseBucket(bucket.id, bucket.label)
      existing.amount += bucket.amount
      existing.income += bucket.income
      existing.expenses += bucket.expenses
      existing.transfers += bucket.transfers
      existing.count += bucket.count
      buckets.set(bucket.id, existing)
    }
  }
  return [...buckets.values()]
}

async function latestWarehouseSourceMtimeMs(dataDir: string): Promise<number> {
  return latestMtimeMs(
    dataDir,
    new Set([
      'projections',
      'aggregates',
      'indexes',
      'warehouse',
      'tmp',
      'jobs',
    ]),
  )
}

async function latestMtimeMs(
  dir: string,
  ignoredNames: Set<string>,
): Promise<number> {
  let latest = 0
  let entries: Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return latest
  }
  for (const entry of entries) {
    if (ignoredNames.has(entry.name)) continue
    const entryPath = safePath(dir, entry.name)
    const stats = await fs.stat(entryPath).catch(() => null)
    if (!stats) continue
    latest = Math.max(latest, stats.mtimeMs)
    if (entry.isDirectory()) {
      latest = Math.max(latest, await latestMtimeMs(entryPath, ignoredNames))
    }
  }
  return latest
}

async function pruneStaleCardMaterializedMetrics(
  c: Context,
  materialized: MaterializedMetric[],
  definitions: MoneyCardDefinition[],
) {
  const definitionsById = new Map(
    definitions.map((definition) => [definition.id, definition]),
  )
  const current: MaterializedMetric[] = []
  const staleIds: string[] = []

  for (const metric of materialized) {
    if (!metric.cardId) continue
    const definition = definitionsById.get(metric.cardId)
    if (definition && metric.formula === definition.formula) {
      current.push(metric)
    } else {
      staleIds.push(metric.id)
    }
  }

  await Promise.all(staleIds.map((id) => deleteMaterializedMetric(c, id)))
  return current
}

async function buildDashboardList(c: Context) {
  const cardDefinitions = await readCardDefinitions(c, DEFAULT_CARD_DEFINITIONS)
  const dashboards = orderDashboards(
    await readDashboards(c, [
      defaultDashboard(cardDefinitions.map((card) => card.id)),
    ]),
  )
  return { dashboards }
}

async function patchDebtMetadata(
  c: Context,
  id: string,
  patch: z.infer<typeof debtPatchSchema>,
): Promise<
  | {
      ok: true
      debt: MoneyDebt
      created: boolean
      refreshedMetrics: number
      generatedAt: string
    }
  | {
      ok: false
      error: { code: string; message: string }
    }
> {
  const [raw, existingDebts] = await Promise.all([
    readMoneyData(c),
    readDebts(c),
  ])
  const accountId = patch.accountId ?? id
  const account = raw.accounts.find((candidate) => candidate.id === accountId)
  const existing = existingDebts.find(
    (candidate) => candidate.id === id || candidate.accountId === accountId,
  )

  if (!existing && !account) {
    return {
      ok: false,
      error: {
        code: 'debt_or_account_not_found',
        message: `No debt or account found for ${id}.`,
      },
    }
  }

  const now = new Date().toISOString()
  const debt: MoneyDebt = {
    id: existing?.id ?? `manual-debt-${slugify(account?.id ?? id)}`,
    source: existing?.source ?? 'manual',
    itemId: existing?.itemId,
    connectionId: existing?.connectionId,
    accountId: existing?.accountId ?? account?.id ?? patch.accountId,
    institutionName: existing?.institutionName ?? account?.institutionName,
    name: patch.name ?? existing?.name ?? account?.name ?? titleFromId(id),
    type: patch.type ?? existing?.type ?? debtTypeForAccount(account),
    balance:
      patch.balance ??
      existing?.balance ??
      (account ? Math.abs(account.currentBalance) : 0),
    apr:
      patch.apr === undefined
        ? existing?.apr
        : normalizeManualAprRate(patch.apr),
    creditLimit:
      patch.creditLimit ??
      existing?.creditLimit ??
      account?.creditLimit ??
      account?.balance?.limit,
    availableCredit:
      patch.availableCredit ??
      existing?.availableCredit ??
      account?.availableCredit,
    statementBalance: patch.statementBalance ?? existing?.statementBalance,
    utilization: existing?.utilization ?? account?.utilization,
    minimumPayment: patch.minimumPayment ?? existing?.minimumPayment,
    nextPaymentDueDate:
      patch.nextPaymentDueDate ?? existing?.nextPaymentDueDate,
    lastPaymentAmount: patch.lastPaymentAmount ?? existing?.lastPaymentAmount,
    lastPaymentDate: patch.lastPaymentDate ?? existing?.lastPaymentDate,
    isOverdue: patch.isOverdue ?? existing?.isOverdue,
    currencyCode:
      patch.currencyCode ??
      existing?.currencyCode ??
      account?.currencyCode ??
      account?.isoCurrencyCode,
    reportingValue: existing?.reportingValue,
    reportingCurrency: existing?.reportingCurrency,
    reportingValueStatus: existing?.reportingValueStatus,
    reportingFxRate: existing?.reportingFxRate,
    reportingFxAsOf: existing?.reportingFxAsOf,
    reportingFxSource: existing?.reportingFxSource,
    updatedAt: now,
  }

  const nextDebts = upsertById(existingDebts, [debt])
  await writeDebts(c, nextDebts)
  await writeRecommendations(c, deriveRecommendationFacts(raw, nextDebts))
  const refreshedMetrics = await refreshMaterializedMetrics(
    c,
    new Set([...DEBT_FACT_COLLECTIONS, ...RECOMMENDATION_FACT_COLLECTIONS]),
  )

  return {
    ok: true,
    debt:
      (await readDebts(c)).find((candidate) => candidate.id === debt.id) ??
      debt,
    created: !existing,
    refreshedMetrics,
    generatedAt: now,
  }
}

function debtTypeForAccount(
  account: MoneyAccount | undefined,
): MoneyDebt['type'] {
  if (!account) return 'other'
  const subtype = account.subtype?.toLowerCase() ?? ''
  if (subtype.includes('student')) return 'student'
  if (account.type === 'credit') return 'credit'
  if (account.type === 'mortgage') return 'mortgage'
  if (account.type === 'loan') return 'loan'
  return 'other'
}

function normalizeManualAprRate(value: number): number {
  return value > 1 ? value / 100 : value
}

async function deleteDashboard(c: Context, id: string) {
  const { dashboards } = await buildDashboardList(c)
  const existing = dashboards.find((dashboard) => dashboard.id === id)
  if (!existing) return { ok: false as const }

  const next = normalizeDashboardOrder(removeByIds(dashboards, [id]))
  await writeDashboards(c, next)
  return {
    ok: true as const,
    dashboard: existing,
    dashboards: next,
  }
}

async function reorderDashboards(c: Context, ids: string[]) {
  const { dashboards } = await buildDashboardList(c)
  const byId = new Map(dashboards.map((dashboard) => [dashboard.id, dashboard]))
  const unknownIds = ids.filter((id) => !byId.has(id))
  if (unknownIds.length > 0) return { ok: false as const, unknownIds }

  const listed = ids
    .map((id) => byId.get(id))
    .filter((dashboard): dashboard is MoneyDashboard => Boolean(dashboard))
  const listedIds = new Set(ids)
  const remaining = dashboards.filter(
    (dashboard) => !listedIds.has(dashboard.id),
  )
  const now = new Date().toISOString()
  const next = [...listed, ...remaining].map((dashboard, order) => ({
    ...dashboard,
    order,
    updatedAt: dashboard.order === order ? dashboard.updatedAt : now,
  }))
  await writeDashboards(c, next)
  return {
    ok: true as const,
    dashboards: next,
  }
}

function orderDashboards(dashboards: MoneyDashboard[]): MoneyDashboard[] {
  return dashboards
    .map((dashboard, index) => ({ dashboard, index }))
    .sort(
      (a, b) =>
        dashboardOrder(a.dashboard, a.index) -
        dashboardOrder(b.dashboard, b.index),
    )
    .map(({ dashboard }, order) => ({
      ...dashboard,
      order: Number.isFinite(dashboard.order) ? dashboard.order : order,
    }))
}

function normalizeDashboardOrder(
  dashboards: MoneyDashboard[],
): MoneyDashboard[] {
  return orderDashboards(dashboards).map((dashboard, order) => ({
    ...dashboard,
    order,
  }))
}

function dashboardOrder(dashboard: MoneyDashboard, fallback: number): number {
  return Number.isFinite(dashboard.order) ? Number(dashboard.order) : fallback
}

async function buildFirstRunState(c: Context) {
  const [state, connections] = await Promise.all([
    readVisibleMoneyState(c),
    readConnections(c),
  ])
  return {
    accountsConnected: state.raw.accounts.length > 0,
    accountCount: state.raw.accounts.length,
    connectionCount: connections.length,
    dataMode: state.dataMode,
  }
}

async function getVisibleTransaction(c: Context, id: string) {
  return (await readVisibleMoneyData(c)).transactions.find(
    (transaction) => transaction.id === id,
  )
}

async function buildDataHealth(c: Context) {
  const [
    state,
    formulaData,
    cardDefinitions,
    transactionExtensions,
    transactionProposals,
    connections,
  ] = await Promise.all([
    readVisibleMoneyState(c),
    readVisibleFormulaData(c),
    readCardDefinitions(c, DEFAULT_CARD_DEFINITIONS),
    readExtensionValues(c, { entity: 'transaction' }),
    readExtensionProposals(c, { entity: 'transaction' }),
    readConnections(c),
  ])
  const transactions = formulaData.transactions
  const visibleIds = new Set(transactions.map((transaction) => transaction.id))
  const visibleExtensions = transactionExtensions.filter((extension) =>
    visibleIds.has(extension.entityId),
  )
  const visibleProposals = transactionProposals.filter((proposal) =>
    visibleIds.has(proposal.entityId),
  )
  const pendingProposals = visibleProposals.filter(
    (proposal) => proposal.status === 'pending',
  )
  const extensionsByTransaction = groupByEntityId(visibleExtensions)
  const proposalsByTransaction = groupByEntityId(pendingProposals)
  const recommendationsByTransaction = recommendationsByTransactionId(
    formulaData.recommendations ?? [],
  )
  const summary = buildMoneySummary(state.raw, state.debts, state.holdings)
  const directionCounts = countTransactionsByDirection(transactions)
  const directionAmounts = amountTransactionsByDirection(transactions)
  const transferReasons = countTransferReasons(transactions)
  const moneyFlowReview = buildMoneyFlowReviewDiagnostics(transactions)
  const moneyFlowResolution = buildMoneyFlowResolutionDiagnostics(transactions)
  const providerCategoryCounts = countProviderCategories(transactions)
  const dateRange = transactionDateRange(transactions)
  const transactionNamespaces = transactionExtensionNamespaces(
    formulaData.extensionRegistry,
  )
  const transactionNamespaceDefinitions = new Map(
    (formulaData.extensionRegistry?.extensions ?? [])
      .filter((extension) => extension.entity === 'transaction')
      .map((extension) => [extension.namespace, extension]),
  )
  const cardHealth = evaluateDataHealthCards(formulaData, cardDefinitions)
  const cardReadiness = buildCardReadinessItems(
    formulaData,
    cardDefinitions,
    pendingProposals,
  )
  const readinessLabelNamespaces = uniqueStrings(
    cardReadiness
      .filter(
        (card) =>
          card.status === 'needs-labels' || card.status === 'needs-review',
      )
      .flatMap((card) => card.extensionNamespaces),
  )
  const labelPlan =
    readinessLabelNamespaces.length > 0
      ? buildTransactionLabelPlanFromData(formulaData, pendingProposals, {
          namespaces: readinessLabelNamespaces.join(','),
          includeComplete: false,
          limitPerJob: 50,
        })
      : buildTransactionLabelPlanFromJobs([])
  const providerProducts = dataHealthProviderProducts(connections, formulaData)

  return {
    generatedAt: new Date().toISOString(),
    dataMode: state.dataMode,
    counts: {
      accounts: formulaData.accounts.length,
      transactions: transactions.length,
      debts: formulaData.debts?.length ?? 0,
      holdings: formulaData.holdings?.length ?? 0,
      balanceSnapshots: formulaData.balanceSnapshots?.length ?? 0,
      merchants: formulaData.merchants?.length ?? 0,
      persons: formulaData.persons?.length ?? 0,
      recommendations: formulaData.recommendations?.length ?? 0,
      cards: cardDefinitions.length,
    },
    transactions: {
      directionCounts,
      directionAmounts,
      dateRange,
      monthsObserved: transactionMonthCount(transactions),
      providerCategoryCounts,
      categorized: transactions.filter(
        (transaction) => transaction.category.length > 0,
      ).length,
      uncategorized: transactions.filter(
        (transaction) => transaction.category.length === 0,
      ).length,
      pending: transactions.filter((transaction) => transaction.pending).length,
    },
    cashFlow: {
      income: summary.income,
      expenses: summary.expenses,
      cashFlow: summary.cashFlow,
      savingsRate: summary.savingsRate,
      transferCount: directionCounts.transfer,
      transferAmount: directionAmounts.transfer,
      transferReasons,
      moneyFlowReview,
      moneyFlowResolution,
    },
    providerProducts,
    extensions: {
      counts: genericExtensionCounts(visibleExtensions),
      proposalCounts: extensionProposalCounts(visibleProposals),
      namespaces: transactionNamespaces.map((namespace) =>
        transactionNamespaceHealth(
          namespace,
          eligibleTransactionsForNamespace(
            transactions,
            transactionNamespaceDefinitions.get(namespace),
          ),
          visibleExtensions,
          pendingProposals,
          transactionNamespaceDefinitions.get(namespace),
        ),
      ),
    },
    review: {
      counts: transactionReviewCounts(
        transactions,
        extensionsByTransaction,
        proposalsByTransaction,
        recommendationsByTransaction,
      ),
      namespaces: Object.fromEntries(
        transactionNamespaces.map((namespace) => [
          namespace,
          transactionReviewCounts(
            eligibleTransactionsForNamespace(
              transactions,
              transactionNamespaceDefinitions.get(namespace),
            ),
            extensionsByTransaction,
            proposalsByTransaction,
            recommendationsByTransaction,
            namespace,
            {
              countMissingNamespace:
                extensionCoverage(
                  transactionNamespaceDefinitions.get(namespace),
                ) === 'exhaustive',
              countGlobalSignals: false,
            },
          ),
        ]),
      ),
    },
    cards: {
      ...cardHealth,
      readiness: summarizeCardReadiness(cardReadiness),
    },
    nextActions: dataHealthNextActions({
      cardFailures: cardHealth.failed,
      cardReadiness: summarizeCardReadiness(cardReadiness),
      labelPlan,
      pendingProposalCount: pendingProposals.length,
      pendingProposalNamespaces: proposalNamespaceCounts(pendingProposals),
      providerProducts,
      moneyFlowReview,
      moneyFlowResolution,
    }),
    labelPlan: {
      summary: labelPlan.summary,
      jobs: labelPlan.jobs.slice(0, 5).map((job) => ({
        namespace: job.namespace,
        status: job.status,
        eligibleDirection: job.eligibleDirection,
        eligibleTotal: job.eligibleTotal,
        labeledTotal: job.labeledTotal,
        missingTotal: job.missingTotal,
        pendingProposalTotal: job.pendingProposalTotal,
        selector: job.selector,
        classifyRequest: job.classifyRequest,
        reviewQuery: job.reviewQuery,
        recommendedRpc: job.recommendedRpc,
      })),
    },
    warnings: dataHealthWarnings({
      transactionCount: transactions.length,
      accountCount: formulaData.accounts.length,
      directionCounts,
      summary,
      pendingProposalCount: pendingProposals.length,
      cardFailures: cardHealth.failed,
      dateRange,
      providerProducts,
      moneyFlowReview,
      moneyFlowResolution,
    }),
  }
}

function countTransactionsByDirection(transactions: MoneyTransaction[]) {
  return transactions.reduce<Record<TransactionDirection, number>>(
    (counts, transaction) => {
      counts[transaction.direction] += 1
      return counts
    },
    { income: 0, expense: 0, transfer: 0 },
  )
}

function amountTransactionsByDirection(transactions: MoneyTransaction[]) {
  return transactions.reduce<Record<TransactionDirection, number>>(
    (amounts, transaction) => {
      amounts[transaction.direction] += Math.abs(
        transaction.valueForSum ?? transaction.amount,
      )
      return amounts
    },
    { income: 0, expense: 0, transfer: 0 },
  )
}

function countTransferReasons(transactions: MoneyTransaction[]) {
  return transactions.reduce<Record<string, number>>((counts, transaction) => {
    if (transaction.direction !== 'transfer') return counts
    const reason = transaction.transferReason ?? 'unknown'
    counts[reason] = (counts[reason] ?? 0) + 1
    return counts
  }, {})
}

function buildMoneyFlowReviewDiagnostics(transactions: MoneyTransaction[]) {
  const candidates = transactions.filter((transaction) => {
    if (transaction.direction !== 'expense') return false
    if (
      Math.abs(transaction.valueForSum ?? transaction.amount) <
      LARGE_MONEY_FLOW_REVIEW_MIN_AMOUNT
    ) {
      return false
    }
    const role = transaction.extensions?.moneyFlow?.role
    return typeof role !== 'string' || role.length === 0
  })
  const merchantIds = uniqueStrings(
    candidates.map(transactionMerchantId).filter(Boolean),
  )
  return {
    minAmount: LARGE_MONEY_FLOW_REVIEW_MIN_AMOUNT,
    count: candidates.length,
    totalAmount:
      Math.round(
        candidates.reduce(
          (total, transaction) =>
            total + Math.abs(transaction.valueForSum ?? transaction.amount),
          0,
        ) * 100,
      ) / 100,
    merchantCount: merchantIds.length,
    recommendedRpc:
      candidates.length > 0 ? 'money.transactions.reviewGroups' : undefined,
    params:
      candidates.length > 0
        ? {
            reason: 'missing_namespace',
            namespace: 'moneyFlow',
            direction: 'expense',
            minAmount: LARGE_MONEY_FLOW_REVIEW_MIN_AMOUNT,
            minCount: 1,
            limit: 50,
            includeTransactions: false,
            includeTransactionIds: false,
            transactionSampleLimit: 0,
          }
        : undefined,
  }
}

function buildMoneyFlowResolutionDiagnostics(transactions: MoneyTransaction[]) {
  const groups = new Map<
    string,
    Array<{
      transaction: MoneyTransaction
      values: Record<string, MoneyExtensionPrimitive>
      role: MoneyFlowRole
    }>
  >()
  for (const transaction of transactions) {
    const values = transaction.extensions?.moneyFlow
    if (!values || values.status === 'dismissed') continue
    const flowId = stringPrimitive(values.flowId)
    const role = moneyFlowRole(values.role)
    if (!flowId || !role || role === 'ignored') continue
    const entries = groups.get(flowId) ?? []
    entries.push({ transaction, values, role })
    groups.set(flowId, entries)
  }

  const flows = [...groups.entries()]
    .map(([flowId, entries]) => moneyFlowGroup(flowId, entries))
    .filter((flow) => flow.needsReview)
    .sort(compareMoneyFlowGroups)
  const counts = moneyFlowCounts(flows)

  return {
    count: flows.length,
    counts,
    flowIds: flows.slice(0, 20).map((flow) => flow.flowId),
    totalSource:
      Math.round(
        flows.reduce((total, flow) => total + flow.totals.source, 0) * 100,
      ) / 100,
    totalDestination:
      Math.round(
        flows.reduce((total, flow) => total + flow.totals.destination, 0) * 100,
      ) / 100,
    totalFees:
      Math.round(
        flows.reduce((total, flow) => total + flow.totals.fees, 0) * 100,
      ) / 100,
    warnings: uniqueStrings(flows.flatMap((flow) => flow.warnings)),
    recommendedRpc: flows.length > 0 ? 'money.moneyFlows.list' : undefined,
    params:
      flows.length > 0
        ? {
            status: 'needs-review',
            limit: 50,
            includeTransactions: false,
            includeTransactionIds: false,
            includeCandidateSearches: false,
            candidateSearchLimit: 0,
          }
        : undefined,
  }
}

function countProviderCategories(transactions: MoneyTransaction[]) {
  return {
    primary: countTransactionField(
      transactions,
      (transaction) => transaction.providerCategoryPrimary,
    ),
    detailed: countTransactionField(
      transactions,
      (transaction) => transaction.providerCategoryDetailed,
    ),
    paymentChannel: countTransactionField(
      transactions,
      (transaction) => transaction.providerPaymentChannel,
    ),
  }
}

function countTransactionField(
  transactions: MoneyTransaction[],
  getValue: (transaction: MoneyTransaction) => string | undefined,
) {
  return transactions.reduce<Record<string, number>>((counts, transaction) => {
    const value = getValue(transaction)
    if (!value) return counts
    counts[value] = (counts[value] ?? 0) + 1
    return counts
  }, {})
}

function transactionDateRange(transactions: MoneyTransaction[]) {
  const dates = transactions.map((transaction) => transaction.date).sort()
  return {
    first: dates[0],
    last: dates.at(-1),
  }
}

function transactionMonthCount(transactions: MoneyTransaction[]) {
  return new Set(
    transactions
      .map((transaction) => transaction.date.slice(0, 7))
      .filter((month) => /^\d{4}-\d{2}$/.test(month)),
  ).size
}

function transactionExtensionNamespaces(
  registry: MoneyExtensionRegistry | undefined,
): string[] {
  return uniqueStrings([
    ...Object.values(DEFAULT_TRANSACTION_EXTENSION_COLLECTIONS),
    ...(registry?.extensions ?? [])
      .filter((extension) => extension.entity === 'transaction')
      .map((extension) => extension.namespace),
  ]).sort()
}

function transactionNamespaceHealth(
  namespace: string,
  transactions: MoneyTransaction[],
  extensions: MoneyExtensionValue[],
  pendingProposals: MoneyExtensionProposal[],
  definition?: MoneyExtensionRegistry['extensions'][number],
) {
  const coverage = extensionCoverage(definition)
  const eligibleTransactionIds = new Set(
    transactions.map((transaction) => transaction.id),
  )
  const labeledTransactionIds = new Set(
    extensions
      .filter(
        (extension) =>
          extension.namespace === namespace &&
          eligibleTransactionIds.has(extension.entityId) &&
          Object.keys(extension.values).length > 0,
      )
      .map((extension) => extension.entityId),
  )
  const pendingProposalTransactionIds = new Set(
    pendingProposals
      .filter(
        (proposal) =>
          proposal.namespace === namespace &&
          eligibleTransactionIds.has(proposal.entityId),
      )
      .map((proposal) => proposal.entityId),
  )
  return {
    namespace,
    coverage,
    eligibleTotal: transactions.length,
    labeledTotal: labeledTransactionIds.size,
    missingNamespaceTotal:
      coverage === 'exhaustive'
        ? Math.max(0, transactions.length - labeledTransactionIds.size)
        : 0,
    pendingProposalTotal: pendingProposals.filter(
      (proposal) =>
        proposal.namespace === namespace &&
        eligibleTransactionIds.has(proposal.entityId),
    ).length,
    pendingProposalTransactionTotal: pendingProposalTransactionIds.size,
  }
}

function proposalNamespaceCounts(
  proposals: MoneyExtensionProposal[],
): Array<{ namespace: string; count: number }> {
  const counts = new Map<string, number>()
  for (const proposal of proposals) {
    counts.set(proposal.namespace, (counts.get(proposal.namespace) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([namespace, count]) => ({ namespace, count }))
    .sort((a, b) => b.count - a.count || a.namespace.localeCompare(b.namespace))
}

function extensionCoverage(
  definition: MoneyExtensionRegistry['extensions'][number] | undefined,
): NonNullable<MoneyExtensionRegistry['extensions'][number]['coverage']> {
  return definition?.coverage === 'exhaustive' ? 'exhaustive' : 'sparse'
}

function dataHealthProviderProducts(
  connections: MoneyConnection[],
  formulaData: MoneyFormulaData,
) {
  const activeConnections = connections.filter(isSyncableConnection)
  const products = [
    'auth',
    'transactions',
    'liabilities',
    'investments',
  ] as const
  return {
    connectedItems: activeConnections.length,
    errorItems: activeConnections.filter(
      (connection) => connection.status === 'error',
    ).length,
    products: Object.fromEntries(
      products.map((product) => {
        const requestedConnections = activeConnections.filter((connection) =>
          connection.products.some((entry) => entry.toLowerCase() === product),
        )
        const importedFacts = importedFactCountForProduct(
          product,
          requestedConnections,
          formulaData,
        )
        return [
          product,
          {
            requestedItems: requestedConnections.length,
            importedFacts,
            missingItems:
              requestedConnections.length > 0 && importedFacts === 0
                ? requestedConnections.length
                : 0,
          },
        ]
      }),
    ) as Record<
      (typeof products)[number],
      { requestedItems: number; importedFacts: number; missingItems: number }
    >,
    accountHints: optionalPlaidProductAccountHints(
      formulaData.accounts,
      activeConnections,
    ),
  }
}

function optionalPlaidProductAccountHints(
  accounts: MoneyAccount[],
  connections: MoneyConnection[],
) {
  const activeItemIds = new Set(
    connections.map((connection) => connection.itemId),
  )
  const connectionProducts = new Map(
    connections.map((connection) => [
      connection.itemId,
      new Set(connection.products),
    ]),
  )
  const plaidAccounts = accounts.filter(
    (account) =>
      account.source === 'plaid' &&
      Boolean(account.itemId ?? account.connectionId) &&
      activeItemIds.has(account.itemId ?? account.connectionId ?? ''),
  )
  return {
    liabilities: optionalPlaidProductHintForAccounts(
      plaidAccounts,
      connectionProducts,
      'liabilities',
      accountSuggestsLiabilitiesProduct,
    ),
    investments: optionalPlaidProductHintForAccounts(
      plaidAccounts,
      connectionProducts,
      'investments',
      accountSuggestsInvestmentsProduct,
    ),
  }
}

function optionalPlaidProductHintForAccounts(
  accounts: MoneyAccount[],
  connectionProducts: Map<string, Set<string>>,
  product: 'liabilities' | 'investments',
  predicate: (account: MoneyAccount) => boolean,
) {
  const hintAccounts = accounts.filter(predicate)
  const hintedItemIds = uniqueStrings(
    hintAccounts
      .map((account) => account.itemId ?? account.connectionId)
      .filter((itemId): itemId is string => Boolean(itemId)),
  )
  const requestedItemIds = hintedItemIds.filter((itemId) =>
    connectionProducts.get(itemId)?.has(product),
  )
  const missingItemIds = hintedItemIds.filter(
    (itemId) => !connectionProducts.get(itemId)?.has(product),
  )
  const itemAccountCounts = Object.fromEntries(
    hintedItemIds.map((itemId) => [
      itemId,
      hintAccounts.filter(
        (account) => (account.itemId ?? account.connectionId) === itemId,
      ).length,
    ]),
  )
  return {
    accountCount: hintAccounts.length,
    itemCount: hintedItemIds.length,
    itemIds: hintedItemIds,
    itemAccountCounts,
    requestedItems: requestedItemIds.length,
    requestedItemIds,
    missingProductItems: Math.max(
      0,
      hintedItemIds.length - requestedItemIds.length,
    ),
    missingItemIds,
  }
}

function optionalPlaidProductHintsForItem(accounts: MoneyAccount[]) {
  return {
    liabilities: accounts.filter(accountSuggestsLiabilitiesProduct).length,
    investments: accounts.filter(accountSuggestsInvestmentsProduct).length,
  }
}

function accountSuggestsLiabilitiesProduct(account: MoneyAccount): boolean {
  return (
    account.isLiability === true ||
    account.type === 'credit' ||
    account.type === 'loan' ||
    account.type === 'mortgage' ||
    account.currentBalance < 0
  )
}

function accountSuggestsInvestmentsProduct(account: MoneyAccount): boolean {
  const subtype = account.subtype?.toLowerCase().replace(/[\s_-]+/g, '') ?? ''
  return (
    account.type === 'investment' ||
    Boolean(account.investmentAccountKind) ||
    [
      '401k',
      '529',
      'hsa',
      'ira',
      'rothira',
      'traditionalira',
      'rrsp',
      'tfsa',
    ].includes(subtype)
  )
}

function importedFactCountForProduct(
  product: 'auth' | 'transactions' | 'liabilities' | 'investments',
  connections: MoneyConnection[],
  formulaData: MoneyFormulaData,
) {
  const itemIds = new Set(connections.map((connection) => connection.itemId))
  if (itemIds.size === 0) return 0
  if (product === 'auth') {
    return formulaData.accounts.filter((account) =>
      itemIds.has(account.itemId ?? account.connectionId ?? ''),
    ).length
  }
  if (product === 'transactions') {
    return formulaData.transactions.filter((transaction) =>
      itemIds.has(transaction.itemId ?? transaction.connectionId ?? ''),
    ).length
  }
  if (product === 'liabilities') {
    return (formulaData.debts ?? []).filter((debt) =>
      itemIds.has(debt.itemId ?? debt.connectionId ?? ''),
    ).length
  }
  return (formulaData.holdings ?? []).filter((holding) =>
    itemIds.has(holding.itemId ?? holding.connectionId ?? ''),
  ).length
}

function evaluateDataHealthCards(
  formulaData: MoneyFormulaData,
  definitions: MoneyCardDefinition[],
) {
  const failures: Array<{ id: string; title: string; message: string }> = []
  let evaluated = 0

  const results = evaluateCardDefinitionsById(formulaData, definitions, {
    includeSecondary: false,
  })
  for (const definition of definitions) {
    const result = results.get(definition.id)
    if (result?.ok) {
      evaluated += 1
    } else {
      failures.push({
        id: definition.id,
        title: definition.title,
        message: result?.message ?? 'Card evaluation failed',
      })
    }
  }

  return {
    total: definitions.length,
    evaluated,
    failed: failures.length,
    failures,
  }
}

function evaluateCardDefinitionsById(
  formulaData: MoneyFormulaData,
  definitions: MoneyCardDefinition[],
  options: { includeSecondary?: boolean } = {},
): Map<
  string,
  | { ok: true; card: ReturnType<typeof evaluateCards>[number] }
  | { ok: false; message: string }
> {
  const results = new Map<
    string,
    | { ok: true; card: ReturnType<typeof evaluateCards>[number] }
    | { ok: false; message: string }
  >()

  const evaluationDefinitions =
    options.includeSecondary === false
      ? definitions.map((definition) => ({
          ...definition,
          secondaryFormulas: undefined,
        }))
      : definitions

  try {
    for (const card of evaluateCards(formulaData, evaluationDefinitions)) {
      results.set(card.id, { ok: true, card })
    }
    return results
  } catch {
    // Fall back to per-card checks only when a malformed custom card breaks the batch.
  }

  for (const definition of evaluationDefinitions) {
    try {
      const [card] = evaluateCards(formulaData, [definition])
      if (card) {
        results.set(definition.id, { ok: true, card })
      } else {
        results.set(definition.id, {
          ok: false,
          message: 'Card evaluation returned no result',
        })
      }
    } catch (error) {
      results.set(definition.id, {
        ok: false,
        message:
          error instanceof Error ? error.message : 'Card evaluation failed',
      })
    }
  }

  return results
}

function dataHealthWarnings(input: {
  transactionCount: number
  accountCount: number
  directionCounts: Record<TransactionDirection, number>
  summary: ReturnType<typeof buildMoneySummary>
  pendingProposalCount: number
  cardFailures: number
  dateRange: { first?: string; last?: string }
  providerProducts: ReturnType<typeof dataHealthProviderProducts>
  moneyFlowReview: ReturnType<typeof buildMoneyFlowReviewDiagnostics>
  moneyFlowResolution: ReturnType<typeof buildMoneyFlowResolutionDiagnostics>
}) {
  const warnings: string[] = []
  if (input.accountCount === 0) warnings.push('no_accounts')
  if (input.transactionCount === 0) warnings.push('no_transactions')
  if (input.transactionCount >= 100 && input.directionCounts.transfer === 0) {
    warnings.push('large_import_has_no_transfers')
  }
  if (input.transactionCount > 0 && input.summary.income === 0)
    warnings.push('no_income')
  if (input.transactionCount > 0 && input.summary.expenses === 0)
    warnings.push('no_expenses')
  if (input.pendingProposalCount > 0)
    warnings.push('pending_extension_proposals')
  if (input.moneyFlowReview.count > 0) warnings.push('money_flow_review_needed')
  if (input.moneyFlowResolution.count > 0)
    warnings.push('money_flow_resolution_needed')
  if (input.cardFailures > 0) warnings.push('card_evaluation_failures')
  if (input.transactionCount > 0 && !input.dateRange.last)
    warnings.push('missing_transaction_dates')
  if (input.providerProducts.products.liabilities.missingItems > 0) {
    warnings.push('connected_liabilities_missing_debts')
  }
  if (input.providerProducts.products.investments.missingItems > 0) {
    warnings.push('connected_investments_missing_holdings')
  }
  if (input.providerProducts.accountHints.liabilities.missingProductItems > 0) {
    warnings.push('linked_liability_accounts_missing_liabilities_product')
  }
  if (input.providerProducts.accountHints.investments.missingProductItems > 0) {
    warnings.push('linked_investment_accounts_missing_investments_product')
  }
  return warnings
}

function dataHealthNextActions(input: {
  cardFailures: number
  cardReadiness: Record<CardReadinessStatus, number>
  labelPlan: ReturnType<typeof buildTransactionLabelPlanFromJobs>
  pendingProposalCount: number
  pendingProposalNamespaces: Array<{ namespace: string; count: number }>
  providerProducts?: ReturnType<typeof dataHealthProviderProducts>
  moneyFlowReview: ReturnType<typeof buildMoneyFlowReviewDiagnostics>
  moneyFlowResolution: ReturnType<typeof buildMoneyFlowResolutionDiagnostics>
}) {
  const actions: Array<{
    action: string
    priority: number
    reason: string
    rpc: string
    count?: number
    params?: Record<string, unknown>
    namespaces?: string[]
    namespaceParams?: Array<{
      namespace: string
      count: number
      params: Record<string, unknown>
    }>
    allParams?: Record<string, unknown>
    drilldownParams?: Record<string, unknown>
    items?: Array<{
      itemId: string
      additionalConsentedProducts: Array<'liabilities' | 'investments'>
      accountHints: {
        liabilities: number
        investments: number
      }
      reason: string
    }>
  }> = []
  if (input.cardFailures > 0 || input.cardReadiness.error > 0) {
    actions.push({
      action: 'repair-cards',
      priority: 1,
      reason: 'Some card formulas fail to evaluate.',
      rpc: 'money.cards.readiness',
      count: Math.max(input.cardFailures, input.cardReadiness.error),
      params: { status: 'error' },
    })
  }
  if (
    input.pendingProposalCount > 0 ||
    input.labelPlan.summary['review-proposals'] > 0
  ) {
    const topProposalNamespace = input.pendingProposalNamespaces[0]
    const baseProposalParams = {
      reason: 'has_proposals',
      minCount: 1,
      limit: 50,
      includeTransactions: false,
      includeTransactionIds: false,
      transactionSampleLimit: 0,
    }
    actions.push({
      action: 'review-label-proposal-groups',
      priority: 2,
      reason:
        'Pending transaction extension proposals can improve cards once confirmed or corrected by merchant group.',
      rpc: 'money.transactions.reviewGroups',
      count: input.pendingProposalCount,
      namespaces: input.pendingProposalNamespaces.map(
        (namespace) => namespace.namespace,
      ),
      params: {
        ...baseProposalParams,
        ...(topProposalNamespace
          ? { namespace: topProposalNamespace.namespace }
          : {}),
      },
      allParams: baseProposalParams,
      namespaceParams: input.pendingProposalNamespaces.map((namespace) => ({
        namespace: namespace.namespace,
        count: namespace.count,
        params: {
          ...baseProposalParams,
          namespace: namespace.namespace,
        },
      })),
    })
  }
  if (input.moneyFlowReview.count > 0 && input.moneyFlowReview.params) {
    actions.push({
      action: 'review-money-flow-candidates',
      priority: 2.5,
      reason:
        'Large expense rows are missing money-flow labels; reconcile transfer principal before trusting spend and cash-flow cards.',
      rpc: 'money.transactions.reviewGroups',
      count: input.moneyFlowReview.count,
      params: input.moneyFlowReview.params,
    })
  }
  if (input.moneyFlowResolution.count > 0 && input.moneyFlowResolution.params) {
    actions.push({
      action: 'resolve-money-flows',
      priority: 3,
      reason:
        'Some labeled money-flow chains are incomplete or unbalanced; inspect missing destination, fee, or bridge legs before treating transfer paths as fully reconciled.',
      rpc: 'money.moneyFlows.list',
      count: input.moneyFlowResolution.count,
      params: input.moneyFlowResolution.params,
      drilldownParams: {
        ...input.moneyFlowResolution.params,
        includeTransactions: false,
        includeTransactionIds: false,
        includeCandidateSearches: true,
        candidateSearchLimit: 10,
      },
    })
  }
  const optionalProductRepairs = [
    {
      product: 'liabilities' as const,
      hint: input.providerProducts?.accountHints.liabilities,
    },
    {
      product: 'investments' as const,
      hint: input.providerProducts?.accountHints.investments,
    },
  ]
  const productsByItem = new Map<string, Array<'liabilities' | 'investments'>>()
  for (const repair of optionalProductRepairs) {
    for (const itemId of repair.hint?.missingItemIds ?? []) {
      productsByItem.set(itemId, [
        ...(productsByItem.get(itemId) ?? []),
        repair.product,
      ])
    }
  }
  const productConsentSessions = [...productsByItem.entries()].map(
    ([itemId, products]) => ({
      itemId,
      additionalConsentedProducts: [...new Set(products)],
    }),
  )
  if (productConsentSessions.length > 0) {
    const accountHintCountsByItem = optionalProductAccountHintCountsByItem(
      input.providerProducts,
    )
    const productConsentItems = productConsentSessions.map((session) => {
      const accountHints = accountHintCountsByItem.get(session.itemId) ?? {
        liabilities: 0,
        investments: 0,
      }
      return {
        ...session,
        accountHints,
        reason: optionalProductConsentReason(
          session.additionalConsentedProducts,
          accountHints,
        ),
      }
    })
    const uniqueProducts = [
      ...new Set(
        productConsentSessions.flatMap(
          (session) => session.additionalConsentedProducts,
        ),
      ),
    ]
    actions.push({
      action: 'update-plaid-item-consent',
      priority: 3.5,
      reason:
        uniqueProducts.length > 1
          ? 'Linked account types indicate multiple Plaid product consents are missing across Items.'
          : uniqueProducts[0] === 'liabilities'
            ? 'Linked debt-like accounts indicate liabilities detail may be available, but the Plaid liabilities product was not requested for some Items.'
            : 'Linked investment-like accounts indicate holdings may be available, but the Plaid investments product was not requested for some Items.',
      rpc: 'money.plaid.connectSessions',
      count: productConsentSessions.length,
      params: {
        sessions: productConsentSessions,
        itemIds: productConsentSessions.map((session) => session.itemId),
        additionalConsentedProducts: uniqueProducts,
      },
      items: productConsentItems,
    })
  }
  if (input.labelPlan.summary.classify > 0) {
    actions.push({
      action: 'classify-missing-labels',
      priority: 4,
      reason:
        'Cards depend on transaction extension namespaces that are missing labels.',
      rpc: 'money.transactions.labelPlan',
      count: input.labelPlan.summary.missingTotal,
      params: {
        namespaces: input.labelPlan.jobs.map((job) => job.namespace).join(','),
        limitPerJob: 50,
      },
    })
  }
  const missingOptionalProducts = [
    input.providerProducts?.products.liabilities.missingItems
      ? 'liabilities'
      : undefined,
    input.providerProducts?.products.investments.missingItems
      ? 'investments'
      : undefined,
  ].filter((product): product is string => Boolean(product))
  if (missingOptionalProducts.length > 0) {
    actions.push({
      action: 'verify-plaid-optional-products',
      priority: 5,
      reason: 'A connected Plaid optional product has no normalized facts yet.',
      rpc: 'money.sync.history',
      count: missingOptionalProducts.length,
      params: { products: missingOptionalProducts },
    })
  }
  if (actions.length === 0 && input.cardReadiness.ready > 0) {
    actions.push({
      action: 'inspect-ready-cards',
      priority: 10,
      reason:
        'No immediate backend repair action is required for evaluated cards.',
      rpc: 'money.cards.readiness',
      count: input.cardReadiness.ready,
      params: { status: 'ready' },
    })
  }
  return actions.sort((a, b) => a.priority - b.priority)
}

function optionalProductAccountHintCountsByItem(
  providerProducts: ReturnType<typeof dataHealthProviderProducts> | undefined,
) {
  const counts = new Map<string, { liabilities: number; investments: number }>()
  for (const itemId of providerProducts?.accountHints.liabilities
    .missingItemIds ?? []) {
    counts.set(itemId, {
      ...(counts.get(itemId) ?? { liabilities: 0, investments: 0 }),
      liabilities: optionalProductHintAccountCountForItem(
        providerProducts,
        'liabilities',
        itemId,
      ),
    })
  }
  for (const itemId of providerProducts?.accountHints.investments
    .missingItemIds ?? []) {
    counts.set(itemId, {
      ...(counts.get(itemId) ?? { liabilities: 0, investments: 0 }),
      investments: optionalProductHintAccountCountForItem(
        providerProducts,
        'investments',
        itemId,
      ),
    })
  }
  return counts
}

function optionalProductHintAccountCountForItem(
  providerProducts: ReturnType<typeof dataHealthProviderProducts> | undefined,
  product: 'liabilities' | 'investments',
  itemId: string,
) {
  const hint = providerProducts?.accountHints[product]
  if (!hint?.missingItemIds.includes(itemId)) return 0
  return Math.max(1, hint.itemAccountCounts[itemId] ?? 0)
}

function optionalProductConsentReason(
  products: Array<'liabilities' | 'investments'>,
  accountHints: { liabilities: number; investments: number },
) {
  const parts = []
  if (products.includes('liabilities')) {
    parts.push(
      `${accountHints.liabilities || 1} debt-like account${(accountHints.liabilities || 1) === 1 ? '' : 's'}`,
    )
  }
  if (products.includes('investments')) {
    parts.push(
      `${accountHints.investments || 1} investment-like account${(accountHints.investments || 1) === 1 ? '' : 's'}`,
    )
  }
  return `Request ${products.join(' and ')} consent because this Item has ${parts.join(' and ')} but was connected without ${products.join(' and ')}.`
}

type CardTransactionQuery = z.infer<typeof cardTransactionQuerySchema>
type CardReadinessQuery = z.infer<typeof cardReadinessQuerySchema>
type CardReadinessStatus = z.infer<typeof cardReadinessStatusSchema>

async function buildCardReadinessList(c: Context, query: CardReadinessQuery) {
  const [formulaData, definitions, proposals, connections] = await Promise.all([
    readVisibleFormulaData(c),
    readCardDefinitions(c, DEFAULT_CARD_DEFINITIONS),
    readExtensionProposals(c, { entity: 'transaction' }),
    readConnections(c),
  ])
  const visibleTransactionIds = new Set(
    formulaData.transactions.map((transaction) => transaction.id),
  )
  const visiblePendingProposals = proposals.filter(
    (proposal) =>
      proposal.status === 'pending' &&
      visibleTransactionIds.has(proposal.entityId),
  )
  const requestedIds = query.ids
    ? new Set(
        query.ids
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean),
      )
    : undefined
  const readiness = buildCardReadinessItems(
    formulaData,
    definitions.filter((definition) =>
      requestedIds ? requestedIds.has(definition.id) : true,
    ),
    visiblePendingProposals,
    connections,
  ).filter((item) => (query.status ? item.status === query.status : true))
  const page = paginateItems(readiness, query)

  return {
    generatedAt: new Date().toISOString(),
    cards: page.items,
    total: page.total,
    limit: page.limit,
    offset: page.offset,
    hasMore: page.hasMore,
    nextOffset: page.nextOffset,
    nextCursor: page.nextCursor,
    summary: summarizeCardReadiness(readiness),
    filters: {
      ids: query.ids,
      status: query.status,
    },
  }
}

function buildCardReadinessItems(
  formulaData: MoneyFormulaData,
  definitions: MoneyCardDefinition[],
  pendingProposals: MoneyExtensionProposal[],
  connections: MoneyConnection[] = [],
) {
  const collections = buildCollections(formulaData)
  const collectionCounts = buildReadinessCollectionCounts(collections)
  const evaluatedById = evaluateCardDefinitionsById(formulaData, definitions, {
    includeSecondary: false,
  })
  const optionalProductHints = optionalPlaidProductAccountHints(
    formulaData.accounts,
    connections.filter(isSyncableConnection),
  )

  return definitions.map((definition) => {
    const primaryFormula = definition.primaryFormula ?? definition.formula
    const formulaEntries = [
      { key: 'primary', formula: primaryFormula },
      ...Object.entries(definition.secondaryFormulas ?? {}).map(
        ([key, formula]) => ({
          key,
          formula,
        }),
      ),
    ].filter((entry) => Boolean(entry.formula))
    const referenced = uniqueStrings(
      formulaEntries.flatMap((entry) =>
        referencedCollectionsForFormula(entry.formula),
      ),
    )
    const transactionCollections = referenced.filter((collection) =>
      isTransactionBackedCollection(collection, formulaData.extensionRegistry),
    )
    const extensionNamespaces = uniqueStrings(
      transactionCollections
        .map((collection) =>
          transactionExtensionNamespaceForCollection(
            collection,
            formulaData.extensionRegistry,
          ),
        )
        .filter((namespace): namespace is string => Boolean(namespace)),
    )
    const matchingTransactionIds = new Set<string>()
    for (const collection of transactionCollections) {
      for (const transaction of transactionsForCollection(
        formulaData.transactions,
        collection,
        formulaData.extensionRegistry,
      )) {
        matchingTransactionIds.add(transaction.id)
      }
    }
    const namespaceGaps = extensionNamespaces.map((namespace) => {
      const definition = formulaData.extensionRegistry?.extensions.find(
        (extension) =>
          extension.entity === 'transaction' &&
          extension.namespace === namespace,
      )
      const health = transactionNamespaceHealth(
        namespace,
        eligibleTransactionsForNamespace(formulaData.transactions, definition),
        formulaData.extensions ?? [],
        pendingProposals,
      )
      return {
        namespace,
        coverage: health.coverage,
        eligibleTotal: health.eligibleTotal,
        labeledTotal: health.labeledTotal,
        pendingProposalTotal: health.pendingProposalTotal,
        missingNamespaceTotal: health.missingNamespaceTotal,
      }
    })
    const metadataGaps = cardMetadataGaps(formulaData, formulaEntries)

    const evaluated = evaluatedById.get(definition.id)
    if (evaluated?.ok) {
      const pendingProposalTotal = namespaceGaps.reduce(
        (sum, gap) => sum + gap.pendingProposalTotal,
        0,
      )
      const missingLabelTotal = namespaceGaps.reduce(
        (sum, gap) => sum + gap.missingNamespaceTotal,
        0,
      )
      const status = cardReadinessStatus({
        referenced,
        transactionCollections,
        extensionNamespaces,
        matchingTransactionTotal: matchingTransactionIds.size,
        collectionCounts,
        pendingProposalTotal,
        missingLabelTotal,
        metadataGapTotal: metadataGaps.length,
        result: evaluated.card.value,
      })

      return {
        id: definition.id,
        title: definition.title,
        kind: definition.kind,
        status,
        resultType: formulaResultType(evaluated.card.value),
        referencedCollections: referenced,
        transactionCollections,
        matchingTransactionTotal: matchingTransactionIds.size,
        collectionCounts: Object.fromEntries(
          referenced.map((collection) => [
            collection,
            collectionCounts.get(collection) ?? 0,
          ]),
        ),
        extensionNamespaces,
        namespaceGaps,
        metadataGaps,
        recommendedNextStep: cardReadinessNextStep(status, namespaceGaps),
        nextActions: cardReadinessNextActions({
          status,
          referenced,
          collectionCounts,
          namespaceGaps,
          metadataGaps,
          optionalProductHints,
          transactions: formulaData.transactions,
        }),
      }
    }

    return {
      id: definition.id,
      title: definition.title,
      kind: definition.kind,
      status: 'error' as const,
      resultType: 'error',
      referencedCollections: referenced,
      transactionCollections,
      matchingTransactionTotal: matchingTransactionIds.size,
      collectionCounts: Object.fromEntries(
        referenced.map((collection) => [
          collection,
          collectionCounts.get(collection) ?? 0,
        ]),
      ),
      extensionNamespaces,
      namespaceGaps,
      metadataGaps,
      error: {
        message: evaluated?.message ?? 'Card evaluation failed',
      },
      recommendedNextStep: 'repair-card-formula',
      nextActions: [
        {
          action: 'repair-card-formula',
          reason:
            'The card formula failed to evaluate; preview the card to get structured diagnostics.',
          rpc: 'money.cards.preview',
          priority: 1,
          params: { id: definition.id },
        },
      ],
    }
  })
}

function buildReadinessCollectionCounts(
  collections: CollectionMetric[],
): Map<string, number> {
  const counts = new Map(
    collections.map((collection) => [collection.id, collection.count]),
  )
  return counts
}

function cardReadinessStatus(input: {
  referenced: string[]
  transactionCollections: string[]
  extensionNamespaces: string[]
  matchingTransactionTotal: number
  collectionCounts: Map<string, number>
  pendingProposalTotal: number
  missingLabelTotal: number
  metadataGapTotal: number
  result?: FormulaResultValue
}): CardReadinessStatus {
  if (input.metadataGapTotal > 0) return 'empty'
  if (input.result !== undefined && !formulaResultHasData(input.result)) {
    if (
      input.extensionNamespaces.length > 0 &&
      input.pendingProposalTotal > 0
    ) {
      return 'needs-review'
    }
    if (input.extensionNamespaces.length > 0 && input.missingLabelTotal > 0) {
      return 'needs-labels'
    }
    return 'empty'
  }
  if (input.transactionCollections.length === 0) {
    return input.referenced.some(
      (collection) => (input.collectionCounts.get(collection) ?? 0) > 0,
    )
      ? 'ready'
      : 'empty'
  }
  if (input.matchingTransactionTotal > 0) return 'ready'
  if (input.extensionNamespaces.length > 0 && input.pendingProposalTotal > 0) {
    return 'needs-review'
  }
  if (input.extensionNamespaces.length > 0 && input.missingLabelTotal > 0) {
    return 'needs-labels'
  }
  return 'empty'
}

function formulaResultHasData(value: FormulaResultValue): boolean {
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value === 'string') return value.length > 0
  if (typeof value === 'boolean') return true
  if ('type' in value) {
    if (value.type === 'table') return value.rows.length > 0
    if (value.type === 'entity-list') return value.entities.length > 0
    if (value.type === 'series') return value.points.length > 0
    if (value.type === 'forecast') {
      return value.basis.observations > 0 || value.value !== 0
    }
    if (value.type === 'duration') return Number.isFinite(value.days)
    if (value.type === 'date') return value.isoDate.length > 0
  }
  return true
}

function cardMetadataGaps(
  formulaData: MoneyFormulaData,
  formulaEntries: Array<{ key: string; formula: string }>,
) {
  const formulas = formulaEntries.map((entry) => entry.formula)
  const requiresDebtApr = formulas.some(
    (formula) => /\bDebt\b/.test(formula) && /\bapr\s*>\s*0\b/.test(formula),
  )
  if (!requiresDebtApr) return []

  const openDebts = [
    ...(formulaData.debts ?? []).filter((debt) => Math.abs(debt.balance) > 0),
    ...formulaData.accounts.filter(
      (account) =>
        account.isLiability === true ||
        account.type === 'credit' ||
        account.type === 'loan' ||
        account.type === 'mortgage',
    ),
  ]
  if (openDebts.length === 0) return []
  const openDebtsWithApr = openDebts.filter(
    (debt) => positiveAprRate(aprFromDebtMetadata(debt)) > 0,
  )
  if (openDebtsWithApr.length > 0) return []

  return [
    {
      collection: 'Debt',
      field: 'apr',
      required: 'positive',
      eligibleTotal: openDebts.length,
      presentTotal: 0,
      message:
        'This card needs APR metadata for at least one open debt before it can produce a useful result.',
    },
  ]
}

function positiveAprRate(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return value > 1 ? value / 100 : Math.max(0, value)
}

function aprFromDebtMetadata(
  row: MoneyAccount | NonNullable<MoneyFormulaData['debts']>[number],
) {
  return 'apr' in row ? row.apr : undefined
}

function cardReadinessNextStep(
  status: CardReadinessStatus,
  namespaceGaps: Array<{
    namespace: string
    pendingProposalTotal: number
    missingNamespaceTotal: number
  }>,
) {
  if (status === 'needs-review') {
    return {
      action: 'review-proposals',
      namespaces: namespaceGaps
        .filter((gap) => gap.pendingProposalTotal > 0)
        .map((gap) => gap.namespace),
      rpc: 'money.extensions.proposals.list',
    }
  }
  if (status === 'needs-labels') {
    return {
      action: 'classify-or-label-transactions',
      namespaces: namespaceGaps
        .filter((gap) => gap.missingNamespaceTotal > 0)
        .map((gap) => gap.namespace),
      rpc: 'money.transactions.classify',
    }
  }
  if (status === 'error') {
    return {
      action: 'repair-card-formula',
      rpc: 'money.cards.preview',
    }
  }
  return undefined
}

type CardReadinessNextAction = {
  action: string
  reason: string
  rpc: string
  priority: number
  params?: Record<string, unknown>
  namespaces?: string[]
  product?: 'liabilities' | 'investments'
  candidateCount?: number
  candidateReasons?: string[]
  fallbackParams?: Record<string, unknown>
  paramsTemplate?: Record<string, unknown>
}

function cardReadinessNextActions(input: {
  status: CardReadinessStatus
  referenced: string[]
  collectionCounts: Map<string, number>
  namespaceGaps: Array<{
    namespace: string
    coverage: string
    eligibleTotal: number
    labeledTotal: number
    pendingProposalTotal: number
    missingNamespaceTotal: number
  }>
  metadataGaps: ReturnType<typeof cardMetadataGaps>
  optionalProductHints: ReturnType<typeof optionalPlaidProductAccountHints>
  transactions: MoneyTransaction[]
}): CardReadinessNextAction[] {
  const actions: CardReadinessNextAction[] = []

  if (
    input.metadataGaps.some(
      (gap) => gap.collection === 'Debt' && gap.field === 'apr',
    )
  ) {
    if (input.optionalProductHints.liabilities.missingProductItems > 0) {
      const itemId = input.optionalProductHints.liabilities.missingItemIds[0]
      actions.push({
        action: 'relink-plaid-liabilities',
        reason:
          'Debt-like linked accounts are present, but the Plaid liabilities product was not requested; relink to import APR/payment metadata.',
        rpc: 'money.plaid.connectSession',
        priority: 1,
        product: 'liabilities',
        params: {
          ...(itemId ? { itemId } : {}),
          itemIds: input.optionalProductHints.liabilities.missingItemIds,
          additionalConsentedProducts: ['liabilities'],
        },
      })
    } else {
      actions.push({
        action: 'inspect-debt-metadata',
        reason:
          'Debt rows exist but lack positive APR metadata; inspect debts before trusting debt payoff or interest cards.',
        rpc: 'money.debts.list',
        priority: 2,
        params: {},
      })
    }
    actions.push({
      action: 'patch-debt-metadata',
      reason:
        'If the user or agent knows APR/payment metadata, patch the matching debt or account id instead of waiting for Plaid liabilities detail.',
      rpc: 'money.debts.patch',
      priority:
        input.optionalProductHints.liabilities.missingProductItems > 0 ? 2 : 1,
      paramsTemplate: {
        id: '<debt-or-account-id>',
        apr: 0.12,
        minimumPayment: 0,
        nextPaymentDueDate: 'YYYY-MM-DD',
      },
    })
  }

  const missingInvestmentHistory =
    input.referenced.includes('InvestmentHistory') &&
    (input.collectionCounts.get('InvestmentHistory') ?? 0) === 0 &&
    ((input.collectionCounts.get('Investments') ?? 0) > 0 ||
      input.optionalProductHints.investments.accountCount > 0)
  if (missingInvestmentHistory) {
    if (input.optionalProductHints.investments.missingProductItems > 0) {
      const itemId = input.optionalProductHints.investments.missingItemIds[0]
      actions.push({
        action: 'relink-plaid-investments',
        reason:
          'Investment-like linked accounts are present, but the Plaid investments product was not requested; relink to import holdings and investment history snapshots.',
        rpc: 'money.plaid.connectSession',
        priority: 1,
        product: 'investments',
        params: {
          ...(itemId ? { itemId } : {}),
          itemIds: input.optionalProductHints.investments.missingItemIds,
          additionalConsentedProducts: ['investments'],
        },
      })
    } else {
      actions.push({
        action: 'inspect-investment-history',
        reason:
          'Investment accounts exist but no investment history points are available for this card.',
        rpc: 'money.holdings.list',
        priority: 2,
        params: {},
      })
    }
  }

  for (const gap of input.namespaceGaps) {
    if (gap.pendingProposalTotal > 0) {
      actions.push({
        action: 'review-label-proposal-groups',
        reason:
          'Pending extension proposals can make this card useful once accepted or corrected.',
        rpc: 'money.transactions.reviewGroups',
        priority: 2,
        namespaces: [gap.namespace],
        params: {
          reason: 'has_proposals',
          namespace: gap.namespace,
          minCount: 1,
          limit: 50,
          includeTransactions: false,
          includeTransactionIds: false,
          transactionSampleLimit: 0,
        },
      })
      continue
    }

    if (gap.missingNamespaceTotal > 0) {
      actions.push({
        action: 'plan-transaction-labeling',
        reason:
          'This card depends on labels that are missing from eligible transactions.',
        rpc: 'money.transactions.labelPlan',
        priority: 3,
        namespaces: [gap.namespace],
        params: { namespaces: gap.namespace, limitPerJob: 50 },
      })
      continue
    }

    if (
      input.status === 'empty' &&
      gap.coverage === 'sparse' &&
      gap.eligibleTotal > 0 &&
      gap.labeledTotal === 0
    ) {
      actions.push(
        sparseNamespaceDiscoveryAction(gap.namespace, input.transactions),
      )
    }
  }

  return uniqueCardReadinessActions(actions).sort(
    (a, b) => a.priority - b.priority,
  )
}

function sparseNamespaceDiscoveryAction(
  namespace: string,
  transactions: MoneyTransaction[],
): CardReadinessNextAction {
  if (namespace === 'subscription' || namespace === 'recurringObligation') {
    return {
      action: 'review-recurring-series',
      reason:
        'This recurring card is empty because no active labels exist; inspect detected series and activate, skip, or dismiss candidates.',
      rpc: 'money.recurring.series',
      priority: 3,
      namespaces: [namespace],
      params: { namespace, status: 'all', minConfidence: 0.6, limit: 50 },
    }
  }
  if (namespace === 'merchantGroup') {
    return {
      action: 'review-merchant-groups',
      reason:
        'This merchant card is empty because no canonical merchant groups exist; inspect structural grouping candidates before writing labels.',
      rpc: 'money.merchants.review',
      priority: 3,
      namespaces: [namespace],
      params: { status: 'needs-group', limit: 50 },
    }
  }
  if (
    namespace === 'sharedExpense' ||
    namespace === 'taxContribution' ||
    namespace === 'joyReview'
  ) {
    const fallbackParams = sparseNamespaceClassificationRequest(namespace)
    const candidateParams = sparseNamespaceClassificationRequest(
      namespace,
      sparseNamespaceCandidateTransactions(namespace, transactions),
    )
    return {
      action: 'classify-sparse-extension-candidates',
      reason:
        'This card depends on optional extension labels. Run the ranked transaction-id bounded proposal-first classifier pass, then review/correct proposals before formulas consume them.',
      rpc: 'money.transactions.classify',
      priority: 3,
      namespaces: [namespace],
      params: candidateParams,
      candidateCount: candidateParams.selector.transactionIds?.length ?? 0,
      candidateReasons: sparseNamespaceCandidateReasons(
        candidateParams.selector.transactionIds ?? [],
        namespace,
        transactions,
      ),
      fallbackParams,
    }
  }
  return {
    action: 'plan-sparse-extension-labeling',
    reason:
      'This card depends on optional extension labels; create or classify labels for matching transactions before expecting non-empty results.',
    rpc: 'money.transactions.labelPlan',
    priority: 3,
    namespaces: [namespace],
    params: { namespaces: namespace, limitPerJob: 50 },
  }
}

function sparseNamespaceClassificationRequest(
  namespace: string,
  candidates: MoneyTransaction[] = [],
): TransactionClassificationRequest {
  const selector: TransactionLabelSelector = {
    missingNamespace: namespace,
    limit: 50,
  }
  if (namespace === 'sharedExpense' || namespace === 'joyReview') {
    selector.direction = 'expense'
  }
  if (candidates.length > 0) {
    selector.transactionIds = candidates.map((transaction) => transaction.id)
    selector.limit = Math.min(candidates.length, 50)
    if (namespace === 'taxContribution') {
      delete selector.direction
    }
  }
  return {
    selector,
    targetNamespaces: [namespace],
    instructions: sparseNamespaceClassificationInstructions(namespace),
    model: 'openai/gpt-5.5',
    maxTransactions: Math.min(selector.limit, 50),
    saveProposals: true,
    apply: false,
    minConfidenceToApply: 0.9,
  }
}

function sparseNamespaceCandidateTransactions(
  namespace: string,
  transactions: MoneyTransaction[],
): MoneyTransaction[] {
  if (namespace === 'taxContribution') {
    return transactions
      .filter((transaction) => !hasTransactionNamespace(transaction, namespace))
      .map((transaction) => ({
        transaction,
        score: taxContributionCandidateScore(transaction),
      }))
      .filter((entry) => entry.score > 0)
      .sort(compareSparseCandidateScores)
      .slice(0, 50)
      .map((entry) => entry.transaction)
  }

  if (namespace === 'sharedExpense') {
    return transactions
      .filter(
        (transaction) =>
          transaction.direction === 'expense' &&
          !transaction.extensions?.moneyFlow &&
          !hasTransactionNamespace(transaction, namespace),
      )
      .map((transaction) => ({
        transaction,
        score: sharedExpenseCandidateScore(transaction),
      }))
      .filter((entry) => entry.score > 0)
      .sort(compareSparseCandidateScores)
      .slice(0, 50)
      .map((entry) => entry.transaction)
  }

  if (namespace === 'joyReview') {
    return transactions
      .filter(
        (transaction) =>
          transaction.direction === 'expense' &&
          !transaction.extensions?.moneyFlow &&
          !hasTransactionNamespace(transaction, namespace),
      )
      .map((transaction) => ({
        transaction,
        score: discretionaryCandidateScore(transaction),
      }))
      .filter((entry) => entry.score > 0)
      .sort(compareSparseCandidateScores)
      .slice(0, 50)
      .map((entry) => entry.transaction)
  }

  return []
}

function compareSparseCandidateScores(
  a: { transaction: MoneyTransaction; score: number },
  b: { transaction: MoneyTransaction; score: number },
): number {
  return (
    b.score - a.score ||
    transactionComparableAmount(b.transaction) -
      transactionComparableAmount(a.transaction) ||
    b.transaction.date.localeCompare(a.transaction.date)
  )
}

function sparseNamespaceCandidateReasons(
  transactionIds: string[],
  namespace: string,
  transactions: MoneyTransaction[],
): string[] {
  if (transactionIds.length === 0) return []
  const byId = new Map(
    transactions.map((transaction) => [transaction.id, transaction]),
  )
  const reasons = new Set<string>()
  for (const id of transactionIds) {
    const transaction = byId.get(id)
    if (!transaction) continue
    for (const reason of sparseNamespaceCandidateReason(
      namespace,
      transaction,
    )) {
      reasons.add(reason)
      if (reasons.size >= 4) return [...reasons]
    }
  }
  return [...reasons]
}

function sparseNamespaceCandidateReason(
  namespace: string,
  transaction: MoneyTransaction,
): string[] {
  const categories = normalizedTransactionCategories(transaction)
  const reasons: string[] = []
  if (namespace === 'taxContribution') {
    if (categories.some((category) => category.includes('RETIREMENT'))) {
      reasons.push('provider category references retirement')
    }
    if (categories.some((category) => category.includes('INVESTMENT'))) {
      reasons.push('provider category references investments')
    }
    if (transaction.direction === 'transfer') {
      reasons.push('transaction direction is transfer, not ordinary spending')
    }
    if (
      (transaction.direction === 'transfer' ||
        transaction.direction === 'income') &&
      transactionComparableAmount(transaction) >= 1000
    ) {
      reasons.push(
        'large non-money-flow transfer/income merits contribution review',
      )
    }
  }
  if (namespace === 'sharedExpense') {
    if (sharedExpenseCategoryScore(categories) > 0) {
      reasons.push('provider category is commonly split or reimbursed')
    }
    if (!transaction.recurring) {
      reasons.push('non-recurring expense is suitable for reimbursement review')
    }
    if (transactionComparableAmount(transaction) >= 100) {
      reasons.push('larger expense merits split/reimbursement review')
    }
  }
  if (namespace === 'joyReview' && discretionaryCategoryScore(categories) > 0) {
    reasons.push('provider category is discretionary')
  }
  return reasons
}

function taxContributionCandidateScore(transaction: MoneyTransaction): number {
  if (transaction.extensions?.moneyFlow) return 0
  const categories = normalizedTransactionCategories(transaction)
  let score = 0
  if (transaction.direction === 'transfer') score += 1.5
  if (transaction.direction === 'income') score += 0.5
  if (categories.some((category) => category.includes('RETIREMENT'))) score += 5
  if (categories.some((category) => category.includes('INVESTMENT'))) score += 2
  if (categories.some((category) => category.includes('PAYROLL'))) score += 1
  if (categories.some((category) => category.includes('TAX'))) score += 1
  if (transactionComparableAmount(transaction) >= 100) score += 0.25
  if (
    (transaction.direction === 'transfer' ||
      transaction.direction === 'income') &&
    transactionComparableAmount(transaction) >= 1000
  ) {
    score += 0.5
  }
  return score >= 2 ? score : 0
}

function sharedExpenseCandidateScore(transaction: MoneyTransaction): number {
  const categories = normalizedTransactionCategories(transaction)
  let score = sharedExpenseCategoryScore(categories)
  if (!transaction.recurring) score += 0.5
  const amount = transactionComparableAmount(transaction)
  if (amount >= 100) score += 1
  if (amount >= 500) score += 0.5
  return score
}

function discretionaryCandidateScore(transaction: MoneyTransaction): number {
  const categories = normalizedTransactionCategories(transaction)
  let score = discretionaryCategoryScore(categories)
  if (!transaction.recurring) score += 0.25
  if (transactionComparableAmount(transaction) >= 25) score += 0.25
  return score
}

function sharedExpenseCategoryScore(categories: string[]): number {
  let score = 0
  if (categories.some((category) => category.includes('RENT'))) score += 2
  if (categories.some((category) => category.includes('LODGING'))) score += 1.5
  if (categories.some((category) => category.includes('TRAVEL'))) score += 1
  if (categories.some((category) => category.includes('HOME_IMPROVEMENT')))
    score += 1
  if (categories.some((category) => category.includes('GROCER'))) score += 0.75
  if (categories.some((category) => category.includes('UTILITY'))) score += 0.75
  return score
}

function discretionaryCategoryScore(categories: string[]): number {
  let score = 0
  if (categories.some((category) => category.includes('FOOD_AND_DRINK')))
    score += 1
  if (categories.some((category) => category.includes('RESTAURANT'))) score += 1
  if (categories.some((category) => category.includes('ENTERTAINMENT')))
    score += 1
  if (categories.some((category) => category.includes('TRAVEL'))) score += 1
  if (categories.some((category) => category.includes('GENERAL_MERCHANDISE')))
    score += 0.75
  if (categories.some((category) => category.includes('DIGITAL_PURCHASE')))
    score += 0.75
  return score
}

function normalizedTransactionCategories(
  transaction: MoneyTransaction,
): string[] {
  return [
    transaction.providerCategoryPrimary,
    transaction.providerCategoryDetailed,
    transaction.providerPaymentChannel,
    ...transaction.category,
    transaction.userCategory,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toUpperCase())
}

function sparseNamespaceClassificationInstructions(namespace: string): string {
  if (namespace === 'sharedExpense') {
    return 'Only propose sharedExpense labels for transactions that clearly look reimbursable, split with another person, household-shared, roommate-related, or explicitly owed/paid back. Omit ordinary personal spending.'
  }
  if (namespace === 'taxContribution') {
    return 'Only propose taxContribution labels for transactions that clearly indicate IRA, 401k, HSA, 529, retirement, employer, payroll, or manual tax-advantaged contributions. Omit ordinary transfers, bills, and spending.'
  }
  if (namespace === 'joyReview') {
    return 'Only propose joyReview labels when the merchant and transaction context are clear enough to classify as positive, neutral, or negative discretionary spending. Omit ambiguous necessities.'
  }
  return `Only propose ${namespace} labels when the transaction is clearly relevant to this optional extension. Omit ambiguous rows.`
}

function uniqueCardReadinessActions(
  actions: CardReadinessNextAction[],
): CardReadinessNextAction[] {
  const seen = new Set<string>()
  return actions.filter((action) => {
    const key = `${action.action}:${action.rpc}:${JSON.stringify(action.params ?? {})}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function summarizeCardReadiness(
  readiness: Array<{ status: CardReadinessStatus }>,
) {
  return readiness.reduce<Record<CardReadinessStatus, number>>(
    (summary, item) => {
      summary[item.status] += 1
      return summary
    },
    {
      ready: 0,
      empty: 0,
      'needs-labels': 0,
      'needs-review': 0,
      error: 0,
    },
  )
}

function formulaResultType(value: FormulaResultValue): string {
  if (typeof value !== 'object' || value === null) return typeof value
  if ('type' in value && typeof value.type === 'string') return value.type
  return 'object'
}

async function buildCardTransactionDrilldown(
  c: Context,
  query: CardTransactionQuery,
) {
  const [formulaData, definitions] = await Promise.all([
    readVisibleFormulaData(c),
    readCardDefinitions(c, DEFAULT_CARD_DEFINITIONS),
  ])
  const cards = evaluateCards(formulaData, definitions)
  const card = query.cardId
    ? cards.find((entry) => entry.id === query.cardId)
    : undefined

  if (query.cardId && !card) {
    return {
      ok: false as const,
      status: 404 as const,
      error: {
        code: 'card_not_found',
        message: `Card not found: ${query.cardId}`,
      },
    }
  }

  if (query.formulaKey && !card) {
    return {
      ok: false as const,
      status: 400 as const,
      error: {
        code: 'card_required_for_formula_key',
        message: 'formulaKey requires cardId.',
      },
    }
  }

  const secondaryFormula = query.formulaKey
    ? card?.secondaryFormulas?.[query.formulaKey]
    : undefined
  if (query.formulaKey && !secondaryFormula) {
    return {
      ok: false as const,
      status: 404 as const,
      error: {
        code: 'card_formula_key_not_found',
        message: `Card formula key not found: ${query.formulaKey}`,
        details: {
          cardId: query.cardId,
          availableFormulaKeys: Object.keys(
            card?.secondaryFormulas ?? {},
          ).sort(),
        },
      },
    }
  }

  const formula =
    query.formula ?? secondaryFormula ?? card?.primaryFormula ?? card?.formula
  const formulaDrilldown = formula
    ? safeEvaluateFormulaTransactionRows(formula, formulaData)
    : undefined
  const referenced =
    card?.referencedCollections ?? referencedCollectionsForFormula(formula)
  const availableCollections = uniqueStrings(
    referenced.filter((collection) =>
      isTransactionBackedCollection(collection, formulaData.extensionRegistry),
    ),
  )
  if (
    formulaDrilldown?.collection &&
    isTransactionBackedCollection(
      formulaDrilldown.collection,
      formulaData.extensionRegistry,
    ) &&
    !availableCollections.includes(formulaDrilldown.collection)
  ) {
    availableCollections.push(formulaDrilldown.collection)
  }
  const collection =
    query.collection ?? formulaDrilldown?.collection ?? availableCollections[0]

  if (!collection) {
    const empty = searchTransactions([], transactionFiltersForCardQuery(query))
    return {
      ok: true as const,
      value: {
        cardId: query.cardId,
        formulaKey: query.formulaKey,
        formula,
        collection,
        availableCollections,
        drilldownBasis: 'collection',
        formulaFiltered: false,
        formulaUnsupportedReason: formulaDrilldown?.unsupportedReason,
        transactions: empty.transactions,
        total: empty.total,
        limit: empty.limit,
        offset: empty.offset,
        hasMore: empty.hasMore,
        nextOffset: empty.nextOffset,
        nextCursor: empty.nextCursor,
        filters: cardTransactionFiltersEcho(query),
        generatedAt: new Date().toISOString(),
      },
    }
  }

  if (
    !isTransactionBackedCollection(collection, formulaData.extensionRegistry)
  ) {
    return {
      ok: false as const,
      status: 400 as const,
      error: {
        code: 'unsupported_card_transaction_collection',
        message: `Collection is not transaction-backed: ${collection}`,
        details: { availableCollections },
      },
    }
  }

  const useFormulaCandidates =
    formulaDrilldown?.formulaFiltered === true &&
    formulaDrilldown.collection === collection
  const candidates = useFormulaCandidates
    ? formulaDrilldown.transactions
    : transactionsForCollection(
        formulaData.transactions,
        collection,
        formulaData.extensionRegistry,
      )
  const page = searchTransactions(
    candidates,
    transactionFiltersForCardQuery(query),
  )

  return {
    ok: true as const,
    value: {
      cardId: query.cardId,
      formulaKey: query.formulaKey,
      formula,
      collection,
      availableCollections,
      drilldownBasis: useFormulaCandidates ? 'formula' : 'collection',
      formulaFiltered: useFormulaCandidates,
      formulaUnsupportedReason: useFormulaCandidates
        ? undefined
        : formulaDrilldown?.unsupportedReason,
      transactions: page.transactions,
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      hasMore: page.hasMore,
      nextOffset: page.nextOffset,
      nextCursor: page.nextCursor,
      filters: cardTransactionFiltersEcho(query),
      generatedAt: new Date().toISOString(),
    },
  }
}

function referencedCollectionsForFormula(
  formula: string | undefined,
): string[] {
  if (!formula) return []
  try {
    return [...referencedCollections(parseFormula(formula))]
  } catch {
    return []
  }
}

function safeEvaluateFormulaTransactionRows(
  formula: string,
  formulaData: MoneyFormulaData,
): ReturnType<typeof evaluateFormulaTransactionRows> | undefined {
  try {
    return evaluateFormulaTransactionRows(
      formula,
      buildCollections(formulaData),
      formulaData,
    )
  } catch {
    return undefined
  }
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)]
}

function isTransactionBackedCollection(
  collection: string,
  registry?: MoneyExtensionRegistry,
): boolean {
  return (
    collection === 'Income' ||
    collection === 'Expenses' ||
    collection === 'CashFlow' ||
    transactionExtensionNamespaceForCollection(collection, registry) !==
      undefined
  )
}

function transactionsForCollection(
  transactions: MoneyTransaction[],
  collection: string,
  registry?: MoneyExtensionRegistry,
): MoneyTransaction[] {
  if (collection === 'Income') {
    return transactions.filter(
      (transaction) => transaction.direction === 'income',
    )
  }
  if (collection === 'Expenses') {
    return transactions.filter(
      (transaction) => transaction.direction === 'expense',
    )
  }
  if (collection === 'CashFlow') {
    return transactions.filter(
      (transaction) => transaction.direction !== 'transfer',
    )
  }

  const namespace = transactionExtensionNamespaceForCollection(
    collection,
    registry,
  )
  if (!namespace) return []
  return transactions.filter((transaction) => {
    const values = transaction.extensions?.[namespace]
    if (!values || Object.keys(values).length === 0) return false
    if (namespace === 'subscription' || namespace === 'recurringObligation') {
      return recurringSeriesStatus(values) === 'active'
    }
    return true
  })
}

function transactionExtensionNamespaceForCollection(
  collection: string,
  registry?: MoneyExtensionRegistry,
): string | undefined {
  const defaultNamespace =
    DEFAULT_TRANSACTION_EXTENSION_COLLECTIONS[
      collection as keyof typeof DEFAULT_TRANSACTION_EXTENSION_COLLECTIONS
    ]
  if (defaultNamespace) return defaultNamespace

  for (const extension of registry?.extensions ?? []) {
    if (extension.entity !== 'transaction') continue
    for (const derived of extension.derivedCollections ?? []) {
      if (derived.entity === 'transaction' && derived.id === collection) {
        return extension.namespace
      }
    }
  }
  return undefined
}

function transactionFiltersForCardQuery(
  query: CardTransactionQuery,
): TransactionSearchFilters {
  return {
    q: query.q,
    accountId: query.accountId,
    direction: query.direction,
    category: query.category,
    startDate: query.startDate,
    endDate: query.endDate,
    limit: query.limit,
    offset: query.offset,
    cursor: query.cursor,
  }
}

function cardTransactionFiltersEcho(query: CardTransactionQuery) {
  return {
    q: query.q,
    accountId: query.accountId,
    direction: query.direction,
    category: query.category,
    startDate: query.startDate,
    endDate: query.endDate,
    limit: query.limit,
    offset: query.offset,
    cursor: query.cursor,
  }
}

async function readVisibleFormulaData(c: Context): Promise<MoneyFormulaData> {
  const [
    state,
    extensions,
    extensionRegistry,
    storedMerchants,
    storedPersons,
    storedRecommendations,
    balanceSnapshots,
    allocationTargets,
    forecastScenarios,
    taxContributionLimits,
    settings,
    fxRates,
  ] = await Promise.all([
    readVisibleMoneyState(c),
    readExtensionValues(c),
    readExtensionRegistry(c),
    readMerchants(c),
    readPersons(c),
    readRecommendations(c),
    readVisibleBalanceSnapshots(c),
    readAllocationTargets(c),
    readForecastScenarios(c),
    readTaxContributionLimits(c),
    readSettings(c),
    readFxRates(c),
  ])
  const merchants = mergeMerchants(
    buildMerchantFacts(state.raw.transactions, extensions),
    storedMerchants,
  )
  const persons = mergePersons(buildPersonFacts(extensions), storedPersons)
  const visibleRecommendationIds = visibleRecommendationSourceIds(state)
  const visibleStoredRecommendations = storedRecommendations.filter(
    (recommendation) =>
      recommendation.sourceLinks.length === 0 ||
      recommendation.sourceLinks.some((link) =>
        visibleRecommendationIds.has(`${link.entity}:${link.entityId}`),
      ),
  )
  const recommendationIds = new Set(
    visibleStoredRecommendations.map((entry) => entry.id),
  )
  const recommendations = [
    ...visibleStoredRecommendations,
    ...deriveRecommendationFacts(state.raw, state.debts).filter(
      (recommendation) => !recommendationIds.has(recommendation.id),
    ),
  ]
  return {
    ...state.raw,
    debts: state.debts,
    holdings: state.holdings,
    merchants,
    persons,
    recommendations,
    balanceSnapshots,
    extensions,
    extensionRegistry,
    allocationTargets,
    forecastScenarios,
    taxContributionLimits,
    settings,
    fxRates,
  }
}

type TransactionReviewQueueQuery = z.infer<
  typeof transactionReviewQueueQuerySchema
>
type TransactionReviewGroupsQuery = z.infer<
  typeof transactionReviewGroupsQuerySchema
>
type TransactionReviewReason = z.infer<
  typeof transactionReviewQueueReasonSchema
>
type MerchantReviewQuery = z.infer<typeof merchantReviewQuerySchema>
type TransactionLabelPlanQuery = z.infer<typeof transactionLabelPlanQuerySchema>
type RecurringSeriesQuery = z.infer<typeof recurringSeriesQuerySchema>
type RecurringSeriesNamespace = z.infer<typeof recurringSeriesNamespaceSchema>
type RecurringSeriesStatus = Exclude<
  z.infer<typeof recurringSeriesStatusSchema>,
  'all'
>
type MoneyFlowQuery = z.infer<typeof moneyFlowQuerySchema>
type MoneyFlowRole = z.infer<typeof moneyFlowRoleSchema>
type MoneyFlowComputedStatus = Exclude<
  z.infer<typeof moneyFlowStatusSchema>,
  'all' | 'needs-review'
>
type MoneyFlowExternalDestinationRequest = z.infer<
  typeof moneyFlowExternalDestinationRequestSchema
>

function transactionReviewGroupsProductDefault(
  query: TransactionReviewGroupsQuery,
  rawParams: unknown,
): TransactionReviewGroupsQuery {
  const raw =
    rawParams && typeof rawParams === 'object' && !Array.isArray(rawParams)
      ? (rawParams as Record<string, unknown>)
      : {}
  if (raw.reason !== undefined || raw.namespace !== undefined) return query

  return {
    ...query,
    reason: 'missing_namespace',
    namespace: 'budget',
    direction: query.direction ?? 'expense',
  }
}

type MoneyFlowEntry = {
  transaction: MoneyTransaction
  values: Record<string, MoneyExtensionPrimitive>
  role: MoneyFlowRole
}

async function buildMerchantReviewQueue(
  c: Context,
  query: MerchantReviewQuery,
) {
  const formulaData = await readVisibleFormulaData(c)
  const reviewGroups = merchantReviewGroups(formulaData)
  const items = reviewGroups
    .map((group) =>
      merchantReviewItem(group.merchant, group.transactions, query),
    )
    .filter((item) => query.status === 'all' || item.status === query.status)
    .sort(compareMerchantReviewItems)
  const page = paginateItems(items, {
    limit: query.limit,
    offset: query.offset,
    cursor: query.cursor,
  })

  return {
    generatedAt: new Date().toISOString(),
    items: page.items,
    total: items.length,
    limit: page.limit,
    offset: page.offset,
    hasMore: page.hasMore,
    nextOffset: page.nextOffset,
    nextCursor: page.nextCursor,
    summary: merchantReviewSummary(
      reviewGroups.map((group) =>
        merchantReviewItem(group.merchant, group.transactions, query),
      ),
    ),
    filters: {
      status: query.status,
      minTransactions: query.minTransactions,
      minExpenses: query.minExpenses,
      transactionSampleLimit: query.transactionSampleLimit,
    },
  }
}

function merchantReviewGroups(formulaData: MoneyFormulaData) {
  const merchantsById = new Map(
    (formulaData.merchants ?? []).map((merchant) => [merchant.id, merchant]),
  )
  const groups = new Map<string, MoneyTransaction[]>()
  for (const transaction of formulaData.transactions) {
    const merchantId = currentMerchantIdForReview(transaction)
    if (!merchantId) continue
    const bucket = groups.get(merchantId) ?? []
    bucket.push(transaction)
    groups.set(merchantId, bucket)
  }

  return [...groups.entries()].map(([merchantId, transactions]) => ({
    merchant: merchantForReviewGroup(merchantId, transactions, merchantsById),
    transactions,
  }))
}

function currentMerchantIdForReview(transaction: MoneyTransaction): string {
  const merchantGroup = activeMerchantGroupValues(transaction)
  if (merchantGroup?.merchantId) return slugify(merchantGroup.merchantId)
  return merchantReviewCandidateId(transaction)
}

function activeMerchantGroupValues(
  transaction: MoneyTransaction,
): { merchantId: string; name?: string } | undefined {
  const values = transaction.extensions?.merchantGroup
  const merchantId = stringPrimitive(values?.merchantId)
  if (!merchantId) return undefined
  const status = stringPrimitive(values?.status)
  if (status === 'dismissed') return undefined
  return {
    merchantId,
    name: stringPrimitive(values?.name),
  }
}

function merchantForReviewGroup(
  merchantId: string,
  transactions: MoneyTransaction[],
  merchantsById: Map<string, MoneyMerchant>,
): MoneyMerchant {
  const rawMerchantIds = uniqueStrings(
    transactions.map(transactionMerchantId).filter(Boolean),
  ).sort()
  if (rawMerchantIds.length === 1) {
    const existing = merchantsById.get(rawMerchantIds[0] ?? merchantId)
    if (existing) return existing
  }

  const name =
    merchantReviewCandidateName(transactions) ?? titleFromId(merchantId)
  const updatedAt = new Date(0).toISOString()
  const initialMerchant: MoneyMerchant = {
    id: merchantId,
    source: 'derived',
    name,
    transactionCount: 0,
    income: 0,
    expenses: 0,
    netAmount: 0,
    updatedAt,
  }
  return transactions.reduce((merchant, transaction) => {
    merchant.transactionCount += 1
    if (transaction.direction === 'income') {
      merchant.income += transaction.valueForSum ?? transaction.amount
    } else if (transaction.direction === 'expense') {
      merchant.expenses += transaction.valueForSum ?? transaction.amount
    }
    merchant.netAmount = merchant.income - merchant.expenses
    merchant.lastTransactionDate = laterStringDate(
      merchant.lastTransactionDate,
      transaction.date,
    )
    return merchant
  }, initialMerchant)
}

function laterStringDate(
  a: string | undefined,
  b: string | undefined,
): string | undefined {
  if (!a) return b
  if (!b) return a
  return a > b ? a : b
}

function merchantReviewCandidateId(transaction: MoneyTransaction): string {
  const display = transaction.merchantName ?? transaction.name
  const compact = display.toLowerCase().replace(/[^a-z0-9]+/g, '')
  return compact || transactionMerchantId(transaction)
}

function merchantReviewCandidateName(
  transactions: MoneyTransaction[],
): string | undefined {
  const counts = new Map<string, { count: number; lastDate: string }>()
  for (const transaction of transactions) {
    const name = (transaction.merchantName ?? transaction.name).trim()
    if (!name) continue
    const existing = counts.get(name) ?? { count: 0, lastDate: '' }
    existing.count += 1
    existing.lastDate =
      laterStringDate(existing.lastDate, transaction.date) ?? transaction.date
    counts.set(name, existing)
  }
  return [...counts.entries()]
    .sort(
      (a, b) =>
        b[1].count - a[1].count ||
        b[1].lastDate.localeCompare(a[1].lastDate) ||
        a[0].localeCompare(b[0]),
    )
    .map(([name]) => name)[0]
}

function merchantReviewItem(
  merchant: MoneyMerchant,
  transactions: MoneyTransaction[],
  query: Pick<
    MerchantReviewQuery,
    'minTransactions' | 'minExpenses' | 'transactionSampleLimit'
  >,
) {
  const groupedTransactionCount = transactions.filter(
    activeMerchantGroupValues,
  ).length
  const ungroupedTransactionCount = Math.max(
    0,
    transactions.length - groupedTransactionCount,
  )
  const rawMerchantIds = uniqueStrings(
    transactions.map(transactionMerchantId).filter(Boolean),
  ).sort()
  const rawMerchantNames = uniqueStrings(
    transactions
      .map((transaction) => transaction.merchantName ?? transaction.name)
      .filter(Boolean),
  ).sort()
  const qualifies =
    merchant.transactionCount >= query.minTransactions ||
    merchant.expenses >= query.minExpenses
  const hasExplicitGroup = groupedTransactionCount > 0
  const needsCanonicalGrouping =
    !hasExplicitGroup &&
    (rawMerchantIds.length > 1 || rawMerchantNames.length > 1)
  const status = needsCanonicalGrouping
    ? qualifies
      ? 'needs-group'
      : 'low-volume'
    : 'grouped'
  const selector = {
    merchantIds: rawMerchantIds.length > 0 ? rawMerchantIds : [merchant.id],
    limit: 2000,
  }
  const suggestedValues = {
    merchantId: merchant.id,
    name: merchant.displayName ?? merchant.name,
    status: 'active',
    confidence: groupedTransactionCount > 0 ? 1 : 0.75,
  }
  const labelRequest = {
    selector,
    namespace: 'merchantGroup',
    source: 'agent',
    confidence: suggestedValues.confidence,
    values: suggestedValues,
  }

  return {
    merchant: {
      id: merchant.id,
      name: merchant.name,
      displayName: merchant.displayName,
      transactionCount: merchant.transactionCount,
      income: merchant.income,
      expenses: merchant.expenses,
      netAmount: merchant.netAmount,
      lastTransactionDate: merchant.lastTransactionDate,
    },
    status,
    groupedTransactionCount,
    ungroupedTransactionCount,
    rawMerchantIds,
    rawMerchantNames,
    transactionSamples: merchantReviewTransactionSamples(
      transactions,
      query.transactionSampleLimit,
    ),
    selector,
    suggestedValues,
    previewRequest: {
      ...labelRequest,
      dryRun: true,
    },
    applyRequest: {
      ...labelRequest,
      dryRun: false,
    },
    recommendedRpc: 'money.transactions.labelPreview',
  }
}

function merchantReviewTransactionSamples(
  transactions: MoneyTransaction[],
  limit: number,
) {
  if (limit <= 0) return []
  return [...transactions]
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        Math.abs(b.valueForSum ?? b.amount) -
          Math.abs(a.valueForSum ?? a.amount) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, limit)
    .map((transaction) => ({
      id: transaction.id,
      accountId: transaction.accountId,
      date: transaction.date,
      name: transaction.name,
      merchantName: transaction.merchantName,
      amount: transaction.valueForSum ?? transaction.amount,
      direction: transaction.direction,
      category: transaction.category,
      userCategory: transaction.userCategory,
      providerCategoryPrimary: transaction.providerCategoryPrimary,
      providerCategoryDetailed: transaction.providerCategoryDetailed,
      providerPaymentChannel: transaction.providerPaymentChannel,
      transferReason: transaction.transferReason,
      pending: transaction.pending,
      recurring: transaction.recurring,
      notes: transaction.notes,
      extensions: transaction.extensions ?? {},
    }))
}

function compareMerchantReviewItems(
  a: ReturnType<typeof merchantReviewItem>,
  b: ReturnType<typeof merchantReviewItem>,
): number {
  return (
    merchantReviewStatusRank(a.status) - merchantReviewStatusRank(b.status) ||
    b.ungroupedTransactionCount - a.ungroupedTransactionCount ||
    b.merchant.expenses - a.merchant.expenses ||
    b.merchant.transactionCount - a.merchant.transactionCount ||
    (b.merchant.lastTransactionDate ?? '').localeCompare(
      a.merchant.lastTransactionDate ?? '',
    ) ||
    a.merchant.name.localeCompare(b.merchant.name)
  )
}

function merchantReviewStatusRank(status: string): number {
  if (status === 'needs-group') return 0
  if (status === 'grouped') return 1
  return 2
}

function merchantReviewSummary(
  items: Array<ReturnType<typeof merchantReviewItem>>,
) {
  return items.reduce(
    (summary, item) => {
      summary.total += 1
      summary[item.status] = (summary[item.status] ?? 0) + 1
      if (item.status === 'needs-group' || item.status === 'low-volume') {
        summary.ungroupedTransactions += item.ungroupedTransactionCount
      }
      if (item.status === 'grouped') {
        summary.groupedTransactions += item.merchant.transactionCount
      }
      return summary
    },
    {
      total: 0,
      'needs-group': 0,
      grouped: 0,
      'low-volume': 0,
      ungroupedTransactions: 0,
      groupedTransactions: 0,
    } as Record<string, number>,
  )
}

export async function buildRecurringSeriesList(
  c: Context,
  query: RecurringSeriesQuery,
) {
  const formulaData = await readVisibleFormulaData(c)
  const namespaces: RecurringSeriesNamespace[] = query.namespace
    ? [query.namespace]
    : ['subscription', 'recurringObligation']
  const groups = new Map<
    string,
    {
      namespace: RecurringSeriesNamespace
      key: string
      entries: Array<{
        transaction: MoneyTransaction
        values: Record<string, MoneyExtensionPrimitive>
      }>
    }
  >()

  for (const transaction of formulaData.transactions) {
    for (const namespace of namespaces) {
      const values = transaction.extensions?.[namespace]
      if (!values) continue
      const key =
        stringPrimitive(values.key) ??
        stringPrimitive(values.subscriptionKey) ??
        slugify(transaction.merchantName ?? transaction.name)
      const groupId = `${namespace}:${key}`
      const group = groups.get(groupId) ?? { namespace, key, entries: [] }
      group.entries.push({ transaction, values })
      groups.set(groupId, group)
    }
  }

  const generatedAt = new Date().toISOString()
  const series = [...groups.values()]
    .map((group) =>
      recurringSeriesFromGroup(group, generatedAt, {
        includeTransactionIds: query.includeTransactionIds,
        includeReviewActions: query.includeReviewActions,
      }),
    )
    .filter((entry) => recurringSeriesMatchesQuery(entry, query, generatedAt))
    .sort(compareRecurringSeries)
  const page = paginateItems(series, {
    limit: query.limit,
    offset: query.offset,
    cursor: query.cursor,
  })

  return {
    series: page.items,
    total: series.length,
    limit: page.limit,
    offset: page.offset,
    hasMore: page.hasMore,
    nextOffset: page.nextOffset,
    nextCursor: page.nextCursor,
    counts: recurringSeriesCounts(series),
    filters: {
      namespace: query.namespace,
      status: query.status,
      dueWithinDays: query.dueWithinDays,
      minConfidence: query.minConfidence,
      includeTransactionIds: query.includeTransactionIds,
      includeReviewActions: query.includeReviewActions,
    },
    generatedAt,
  }
}

function recurringSeriesFromGroup(
  group: {
    namespace: RecurringSeriesNamespace
    key: string
    entries: Array<{
      transaction: MoneyTransaction
      values: Record<string, MoneyExtensionPrimitive>
    }>
  },
  generatedAt: string,
  options: {
    includeTransactionIds?: boolean
    includeReviewActions?: boolean
  } = {},
) {
  const entries = [...group.entries].sort((a, b) =>
    a.transaction.date.localeCompare(b.transaction.date),
  )
  const latest = entries.at(-1) ?? entries[0]
  const latestValues = latest?.values ?? {}
  const status = recurringSeriesStatus(latestValues, generatedAt)
  const transactionIds = entries.map((entry) => entry.transaction.id)
  const transactionDates = entries.map((entry) => entry.transaction.date).sort()
  const monthlyAmounts = entries
    .map((entry) => numberPrimitive(entry.values.monthlyAmount))
    .filter((value): value is number => value !== undefined)
  const intervalDays = entries
    .map((entry) => numberPrimitive(entry.values.intervalDays))
    .filter((value): value is number => value !== undefined)
  const confidences = entries
    .map((entry) => numberPrimitive(entry.values.confidence))
    .filter((value): value is number => value !== undefined)
  const observedCounts = entries
    .map((entry) => numberPrimitive(entry.values.observedCount))
    .filter((value): value is number => value !== undefined)
  const firstDate =
    stringPrimitive(latestValues.firstDate) ??
    transactionDates[0] ??
    generatedAt.slice(0, 10)
  const lastDate =
    stringPrimitive(latestValues.lastDate) ??
    transactionDates.at(-1) ??
    generatedAt.slice(0, 10)
  const name =
    stringPrimitive(latestValues.name) ??
    latest?.transaction.merchantName ??
    latest?.transaction.name ??
    titleFromId(group.key)
  const seriesValues = {
    key: group.key,
    name,
    cadence: stringPrimitive(latestValues.cadence),
    need: stringPrimitive(latestValues.need),
    monthlyAmount:
      medianNumber(monthlyAmounts) ?? latest?.transaction.amount ?? 0,
    intervalDays: medianNumber(intervalDays),
    firstDate,
    lastDate,
    nextDueDate: stringPrimitive(latestValues.nextDueDate),
    confidence: averageNumber(confidences),
    observedCount: Math.max(...observedCounts, transactionIds.length),
    amountVariancePercent: numberPrimitive(latestValues.amountVariancePercent),
  }

  return {
    id: `${group.namespace}:${group.key}`,
    namespace: group.namespace,
    key: group.key,
    name,
    status,
    active: status === 'active',
    cadence: seriesValues.cadence,
    need: seriesValues.need,
    monthlyAmount: seriesValues.monthlyAmount,
    intervalDays: seriesValues.intervalDays,
    firstDate,
    lastDate,
    nextDueDate: seriesValues.nextDueDate,
    confidence: seriesValues.confidence,
    observedCount: seriesValues.observedCount,
    amountVariancePercent: seriesValues.amountVariancePercent,
    transactionCount: transactionIds.length,
    ...(options.includeTransactionIds !== false ? { transactionIds } : {}),
    latestTransaction: latest
      ? {
          id: latest.transaction.id,
          date: latest.transaction.date,
          name: latest.transaction.name,
          merchantName: latest.transaction.merchantName,
          amount: latest.transaction.amount,
          isoCurrencyCode: latest.transaction.isoCurrencyCode,
          currencyCode: latest.transaction.currencyCode,
          valueForSum: latest.transaction.valueForSum,
          reportingValue: latest.transaction.reportingValue,
          reportingCurrency: latest.transaction.reportingCurrency,
          direction: latest.transaction.direction,
          accountId: latest.transaction.accountId,
        }
      : undefined,
    ...(options.includeTransactionIds !== false
      ? { labelSelector: { transactionIds } }
      : {
          labelSelectorSummary: {
            kind: 'transactionIds',
            transactionCount: transactionIds.length,
          },
        }),
    ...(options.includeReviewActions !== false &&
    options.includeTransactionIds !== false
      ? {
          reviewActions: recurringSeriesReviewActions(
            group.namespace,
            { transactionIds },
            seriesValues,
          ),
        }
      : {
          reviewActionSummary: {
            actions: ['activate', 'skip', 'dismiss'],
            requiresTransactionIds: true,
          },
        }),
    reviewLinks: {
      transactionsReview: {
        reason: 'recurring',
        namespace: group.namespace,
        q: name,
      },
    },
  }
}

function recurringSeriesReviewActions(
  namespace: RecurringSeriesNamespace,
  selector: { transactionIds: string[] },
  seriesValues: Record<string, MoneyExtensionPrimitive | undefined>,
) {
  return {
    activate: recurringSeriesReviewAction(namespace, selector, {
      ...seriesValues,
      active: true,
      status: 'active',
    }),
    skip: recurringSeriesReviewAction(namespace, selector, {
      ...seriesValues,
      active: false,
      status: 'skipped',
    }),
    dismiss: recurringSeriesReviewAction(namespace, selector, {
      ...seriesValues,
      active: false,
      status: 'dismissed',
    }),
  }
}

async function buildMoneyFlowList(c: Context, query: MoneyFlowQuery) {
  const formulaData = await readVisibleFormulaData(c)
  const groups = new Map<
    string,
    Array<{
      transaction: MoneyTransaction
      values: Record<string, MoneyExtensionPrimitive>
      role: MoneyFlowRole
    }>
  >()
  const reportingCurrency = query.reportingCurrency?.trim().toUpperCase()

  for (const transaction of formulaData.transactions) {
    const values = transaction.extensions?.moneyFlow
    if (!values || values.status === 'dismissed') continue
    const flowId = stringPrimitive(values.flowId)
    const role = moneyFlowRole(values.role)
    if (!flowId || !role || role === 'ignored') continue
    if (query.flowId && flowId !== query.flowId) continue
    if (query.role && role !== query.role) continue
    if (query.startDate && transaction.date < query.startDate) continue
    if (query.endDate && transaction.date > query.endDate) continue
    if (
      reportingCurrency &&
      stringPrimitive(values.reportingCurrency)?.toUpperCase() !==
        reportingCurrency
    ) {
      continue
    }

    const entries = groups.get(flowId) ?? []
    entries.push({ transaction, values, role })
    groups.set(flowId, entries)
  }

  const linkedCurrencies = moneyFlowSearchCurrencyCodes(formulaData)
  const flows = [...groups.entries()]
    .map(([flowId, entries]) =>
      moneyFlowGroup(flowId, entries, {
        transactions: formulaData.transactions,
        linkedCurrencies,
        includeTransactions: query.includeTransactions,
        includeTransactionIds: query.includeTransactionIds,
        includeCandidateSearches: query.includeCandidateSearches,
        candidateSearchLimit: query.candidateSearchLimit,
      }),
    )
    .filter((flow) => moneyFlowMatchesQueryStatus(flow.status, query.status))
    .sort(compareMoneyFlowGroups)
  const page = paginateItems(flows, {
    limit: query.limit,
    offset: query.offset,
    cursor: query.cursor,
  })

  return {
    flows: page.items,
    total: flows.length,
    limit: page.limit,
    offset: page.offset,
    hasMore: page.hasMore,
    nextOffset: page.nextOffset,
    nextCursor: page.nextCursor,
    counts: moneyFlowCounts(flows),
    filters: {
      status: query.status,
      flowId: query.flowId,
      role: query.role,
      reportingCurrency: query.reportingCurrency,
      startDate: query.startDate,
      endDate: query.endDate,
      includeTransactions: query.includeTransactions,
      includeTransactionIds: query.includeTransactionIds,
      includeCandidateSearches: query.includeCandidateSearches,
      candidateSearchLimit: query.candidateSearchLimit,
    },
    generatedAt: new Date().toISOString(),
  }
}

async function markMoneyFlowExternalDestination(
  c: Context,
  request: MoneyFlowExternalDestinationRequest,
): Promise<
  | {
      ok: true
      dryRun: boolean
      flowId: string
      selectedTransaction: ReturnType<typeof moneyFlowTransactionSample>
      patchRequest: {
        method: 'money.extensions.values.patch'
        params: GenericExtensionValueKey & GenericExtensionValuePatch
      }
      extension?: MoneyExtensionValue
      flow?: ReturnType<typeof moneyFlowGroup>
      refreshedMetrics?: number
    }
  | {
      ok: false
      status: 400 | 404
      error: { code: string; message: string }
    }
> {
  const formulaData = await readVisibleFormulaData(c)
  const entries = formulaData.transactions
    .map((transaction): MoneyFlowEntry | undefined => {
      const values = transaction.extensions?.moneyFlow
      if (!values || values.status === 'dismissed') return undefined
      const flowId = stringPrimitive(values.flowId)
      if (flowId !== request.flowId) return undefined
      const role = moneyFlowRole(values.role)
      if (!role || role === 'ignored') return undefined
      return { transaction, values, role }
    })
    .filter((entry): entry is MoneyFlowEntry => Boolean(entry))

  if (entries.length === 0) {
    return {
      ok: false,
      status: 404,
      error: {
        code: 'money_flow_not_found',
        message: `Money flow not found: ${request.flowId}`,
      },
    }
  }

  const candidateEntries = entries
    .filter(
      (entry) =>
        entry.role === 'source' ||
        entry.role === 'transfer' ||
        entry.role === 'bridge',
    )
    .sort(
      (a, b) =>
        a.transaction.date.localeCompare(b.transaction.date) ||
        a.transaction.id.localeCompare(b.transaction.id),
    )
  const selected = request.transactionId
    ? candidateEntries.find(
        (entry) => entry.transaction.id === request.transactionId,
      )
    : candidateEntries[0]

  if (!selected) {
    return {
      ok: false,
      status: 400,
      error: {
        code: 'money_flow_source_leg_not_found',
        message: request.transactionId
          ? `Transaction ${request.transactionId} is not a source, transfer, or bridge leg in flow ${request.flowId}.`
          : `Flow ${request.flowId} has no source, transfer, or bridge leg to mark as an unlinked owned destination.`,
      },
    }
  }

  const values = compactExtensionValues({
    destinationKind: 'unlinked_owned',
    targetCurrency: request.targetCurrency?.trim().toUpperCase(),
    reportingCurrency: request.reportingCurrency?.trim().toUpperCase(),
    externalAccountName: request.externalAccountName,
    note: request.note,
  })
  const params: GenericExtensionValueKey & GenericExtensionValuePatch = {
    entity: 'transaction',
    entityId: selected.transaction.id,
    namespace: 'moneyFlow',
    values,
    replaceValues: false,
    source: request.source,
    confidence: request.confidence,
  }
  const patchRequest = {
    method: 'money.extensions.values.patch' as const,
    params,
  }

  if (request.dryRun) {
    return {
      ok: true,
      dryRun: true,
      flowId: request.flowId,
      selectedTransaction: moneyFlowTransactionSample(selected),
      patchRequest,
    }
  }

  const result = await patchGenericExtensionValue(c, params, params)
  if (!result.ok) return result
  const refreshed = await buildMoneyFlowList(c, {
    status: 'all',
    flowId: request.flowId,
    includeTransactions: true,
    includeTransactionIds: true,
    includeCandidateSearches: true,
    candidateSearchLimit: 25,
    limit: 1,
    offset: 0,
  })
  return {
    ok: true,
    dryRun: false,
    flowId: request.flowId,
    selectedTransaction: moneyFlowTransactionSample(selected),
    patchRequest,
    extension: result.extension,
    flow: refreshed.flows[0],
    refreshedMetrics: result.refreshedMetrics,
  }
}

function moneyFlowGroup(
  flowId: string,
  entries: MoneyFlowEntry[],
  options: {
    transactions?: MoneyTransaction[]
    linkedCurrencies?: string[]
    includeTransactions?: boolean
    includeTransactionIds?: boolean
    includeCandidateSearches?: boolean
    candidateSearchLimit?: number
  } = {},
) {
  const sorted = [...entries].sort(
    (a, b) =>
      a.transaction.date.localeCompare(b.transaction.date) ||
      a.transaction.id.localeCompare(b.transaction.id),
  )
  const transactionIds = sorted.map((entry) => entry.transaction.id)
  const dates = sorted.map((entry) => entry.transaction.date).sort()
  const roleCounts = moneyFlowRoleCounts(sorted.map((entry) => entry.role))
  const sourceValue = moneyFlowRoleTotal(sorted, [
    'source',
    'transfer',
    'bridge',
  ])
  const destinationValue = moneyFlowRoleTotal(sorted, ['destination'])
  const feeValue = moneyFlowRoleTotal(sorted, ['fee'])
  const externalSpendValue = moneyFlowRoleTotal(sorted, ['external_spend'])
  const externalDestination = moneyFlowExternalDestination(sorted)
  const imbalance =
    destinationValue > 0
      ? Math.round((sourceValue - destinationValue - feeValue) * 100) / 100
      : undefined
  const status = moneyFlowComputedStatus({
    roleCounts,
    sourceValue,
    destinationValue,
    feeValue,
    imbalance,
    externalDestination,
  })
  const warnings = moneyFlowWarnings({
    roleCounts,
    status,
    imbalance,
    externalSpendValue,
    externalDestination,
  })
  const reportingCurrencies = uniqueStrings(
    sorted
      .map((entry) =>
        stringPrimitive(entry.values.reportingCurrency)?.toUpperCase(),
      )
      .filter((value): value is string => Boolean(value)),
  )
  const sourceCurrencies = uniqueStrings(
    sorted
      .map((entry) =>
        stringPrimitive(entry.values.sourceCurrency)?.toUpperCase(),
      )
      .filter((value): value is string => Boolean(value)),
  )
  const targetCurrencies = uniqueStrings(
    sorted
      .map((entry) =>
        stringPrimitive(entry.values.targetCurrency)?.toUpperCase(),
      )
      .filter((value): value is string => Boolean(value)),
  )
  const currencies = {
    source: sourceCurrencies,
    target: targetCurrencies,
    reporting: reportingCurrencies,
  }

  return {
    id: flowId,
    flowId,
    status,
    needsReview: moneyFlowStatusNeedsReview(status),
    warnings,
    roles: Object.keys(roleCounts).sort(),
    roleCounts,
    transactionCount: transactionIds.length,
    startDate: dates[0],
    endDate: dates.at(-1),
    currencies,
    externalDestination,
    totals: {
      source: sourceValue,
      destination: destinationValue,
      fees: feeValue,
      externalSpend: externalSpendValue,
      imbalance,
    },
    ...(options.includeTransactionIds !== false ? { transactionIds } : {}),
    ...(options.includeTransactions !== false
      ? {
          transactions: sorted.map((entry) =>
            moneyFlowTransactionSample(entry),
          ),
        }
      : {}),
    ...(options.includeTransactionIds !== false
      ? { labelSelector: { transactionIds } }
      : {
          labelSelectorSummary: {
            kind: 'transactionIds',
            transactionCount: transactionIds.length,
          },
        }),
    nextActions: moneyFlowNextActions({
      flowId,
      entries: sorted,
      warnings,
      startDate: dates[0],
      endDate: dates.at(-1),
      transactions: options.transactions ?? [],
      currencies,
      linkedCurrencies: options.linkedCurrencies ?? [],
      sourceValue,
      destinationValue,
      feeValue,
      imbalance,
      includeCandidateSearches: options.includeCandidateSearches !== false,
      candidateSearchLimit: options.candidateSearchLimit ?? 25,
    }),
    reviewLinks: {
      transactionsReview: {
        reason: 'missing_namespace',
        namespace: 'moneyFlow',
        q: flowId,
      },
    },
  }
}

function moneyFlowNextActions(input: {
  flowId: string
  entries: MoneyFlowEntry[]
  transactions: MoneyTransaction[]
  warnings: string[]
  startDate?: string
  endDate?: string
  currencies: {
    source: string[]
    target: string[]
    reporting: string[]
  }
  linkedCurrencies: string[]
  sourceValue: number
  destinationValue: number
  feeValue: number
  imbalance?: number
  includeCandidateSearches: boolean
  candidateSearchLimit: number
}) {
  const actions: Array<{
    action: string
    priority: number
    reason: string
    rpc:
      | 'money.transactions.search'
      | 'money.moneyFlows.markExternalDestination'
    params: TransactionSearchFilters | MoneyFlowExternalDestinationRequest
    labelTemplate?: {
      namespace: 'moneyFlow'
      values: Record<string, MoneyExtensionPrimitive>
    }
    candidateSearchCount?: number
    candidateSearches?: Array<{
      transactionId: string
      date: string
      amount: number
      currencyCode?: string
      params: TransactionSearchFilters
      labelTemplate: {
        namespace: 'moneyFlow'
        values: Record<string, MoneyExtensionPrimitive>
      }
      previewRequest: TransactionLabelRequest
      applyRequest: TransactionLabelRequest
    }>
    candidateMatchCount?: number
    candidateMatchGroupCount?: number
    candidateMatches?: Array<{
      transactionId: string
      date: string
      amount: number
      currencyCode?: string
      direction: MoneyTransaction['direction']
      accountId?: string
      sourceTransactionId?: string
      sourceDate?: string
      sourceAmount?: number
      sourceCurrencyCode?: string
      sourceDistanceDays?: number
      score: number
      reasons: string[]
      labelTemplate: {
        namespace: 'moneyFlow'
        values: Record<string, MoneyExtensionPrimitive>
      }
      previewRequest: TransactionLabelRequest
      applyRequest: TransactionLabelRequest
    }>
    candidateMatchGroups?: Array<{
      sourceTransactionId: string
      sourceDate: string
      sourceAmount: number
      sourceCurrencyCode?: string
      candidateCount: number
      candidates: Array<{
        transactionId: string
        date: string
        amount: number
        currencyCode?: string
        score: number
        reasons: string[]
        previewRequest: TransactionLabelRequest
        applyRequest: TransactionLabelRequest
      }>
    }>
  }> = []
  if (input.warnings.includes('missing_destination')) {
    const currency = firstDefinedCurrency(
      input.currencies.target,
      input.currencies.reporting,
      input.currencies.source,
    )
    const candidateSearches = moneyFlowLegCandidateSearches({
      entries: input.entries,
      roles: ['source', 'transfer', 'bridge'],
      targetRole: 'destination',
      currencyCode: currency,
      currencyField: 'targetCurrency',
    })
    actions.push({
      action: 'find-destination-leg',
      priority: 1,
      reason:
        'This flow has source/transfer principal but no destination leg. Search nearby transactions for the receiving account or currency conversion deposit, then label the matching row as moneyFlow.destination.',
      rpc: 'money.transactions.search',
      params: moneyFlowCandidateSearchParams({
        startDate: input.startDate,
        endDate: input.endDate,
        currencyCode: currency,
        amount: Math.max(0, input.sourceValue - input.feeValue),
      }),
      labelTemplate: {
        namespace: 'moneyFlow',
        values: compactExtensionValues({
          flowId: input.flowId,
          role: 'destination',
          status: 'active',
          targetCurrency: currency,
          reportingCurrency: input.currencies.reporting[0] ?? currency,
        }),
      },
      candidateSearchCount: candidateSearches.length,
      ...(input.includeCandidateSearches
        ? {
            candidateSearches: withMoneyFlowCandidateLabelRequests(
              candidateSearches.slice(0, input.candidateSearchLimit),
            ),
          }
        : {}),
    })
    const crossCurrencyCandidateSearches =
      moneyFlowLinkedCurrencyDestinationSearches({
        entries: input.entries,
        linkedCurrencies: input.linkedCurrencies,
        sourceCurrencies: input.currencies.source,
        reportingCurrencies: input.currencies.reporting,
        flowId: input.flowId,
      })
    const crossCurrencyCandidateMatches =
      moneyFlowLinkedCurrencyDestinationMatches({
        transactions: input.transactions,
        entries: input.entries,
        linkedCurrencies: input.linkedCurrencies,
        sourceCurrencies: input.currencies.source,
        reportingCurrencies: input.currencies.reporting,
        flowId: input.flowId,
        limit: input.candidateSearchLimit,
      })
    if (crossCurrencyCandidateSearches.length > 0) {
      const targetCurrency =
        crossCurrencyCandidateMatches[0]?.currencyCode ??
        crossCurrencyCandidateSearches[0]?.currencyCode
      actions.push({
        action: 'find-cross-currency-destination-leg',
        priority: 1,
        reason:
          'This flow may land in a linked account with a different currency. Search nearby transfer deposits in linked non-source currencies, then label the matching row as moneyFlow.destination with its locked target amount.',
        rpc: 'money.transactions.search',
        params: moneyFlowCandidateSearchParams({
          startDate: input.startDate,
          endDate: input.endDate,
          currencyCode: targetCurrency,
          direction: 'transfer',
        }),
        labelTemplate: {
          namespace: 'moneyFlow',
          values: compactExtensionValues({
            flowId: input.flowId,
            role: 'destination',
            status: 'active',
            targetCurrency,
            reportingCurrency: input.currencies.reporting[0] ?? targetCurrency,
          }),
        },
        candidateSearchCount: crossCurrencyCandidateSearches.length,
        ...(input.includeCandidateSearches
          ? {
              candidateMatchCount: crossCurrencyCandidateMatches.length,
              candidateMatchGroupCount: moneyFlowCandidateMatchGroups(
                crossCurrencyCandidateMatches,
              ).length,
              candidateSearches: withMoneyFlowCandidateLabelRequests(
                crossCurrencyCandidateSearches.slice(
                  0,
                  input.candidateSearchLimit,
                ),
              ),
              candidateMatches: crossCurrencyCandidateMatches,
              candidateMatchGroups: moneyFlowCandidateMatchGroups(
                crossCurrencyCandidateMatches,
              ),
            }
          : {}),
      })
    }
    const sourceEntry = input.entries.find(
      (entry) =>
        entry.role === 'source' ||
        entry.role === 'transfer' ||
        entry.role === 'bridge',
    )
    if (sourceEntry) {
      const reportingCurrency = input.currencies.reporting[0]
      const sourceCurrency = input.currencies.source[0]
      const targetCurrency =
        input.currencies.target[0] ??
        (reportingCurrency && reportingCurrency !== sourceCurrency
          ? reportingCurrency
          : undefined)
      actions.push({
        action: 'mark-unlinked-owned-destination',
        priority: 2,
        reason:
          'If the receiving account is owned by the user but not linked yet, mark this flow as landing in an unlinked owned destination. This keeps the principal classified as a transfer without requiring an impossible destination match.',
        rpc: 'money.moneyFlows.markExternalDestination',
        params: {
          flowId: input.flowId,
          transactionId: sourceEntry.transaction.id,
          targetCurrency,
          reportingCurrency,
          source: 'agent',
          confidence: 0.9,
          dryRun: true,
        },
      })
    }
  }
  if (input.warnings.includes('missing_source')) {
    const currency = firstDefinedCurrency(
      input.currencies.source,
      input.currencies.reporting,
      input.currencies.target,
    )
    const candidateSearches = moneyFlowLegCandidateSearches({
      entries: input.entries,
      roles: ['destination'],
      targetRole: 'source',
      currencyCode: currency,
      currencyField: 'sourceCurrency',
    })
    actions.push({
      action: 'find-source-leg',
      priority: 1,
      reason:
        'This flow has a destination leg but no source/transfer principal. Search nearby transactions for the sending account withdrawal, then label the matching row as moneyFlow.source or moneyFlow.transfer.',
      rpc: 'money.transactions.search',
      params: moneyFlowCandidateSearchParams({
        startDate: input.startDate,
        endDate: input.endDate,
        currencyCode: currency,
        amount: Math.max(0, input.destinationValue + input.feeValue),
      }),
      labelTemplate: {
        namespace: 'moneyFlow',
        values: compactExtensionValues({
          flowId: input.flowId,
          role: 'source',
          status: 'active',
          sourceCurrency: currency,
          reportingCurrency: input.currencies.reporting[0] ?? currency,
        }),
      },
      candidateSearchCount: candidateSearches.length,
      ...(input.includeCandidateSearches
        ? {
            candidateSearches: withMoneyFlowCandidateLabelRequests(
              candidateSearches.slice(0, input.candidateSearchLimit),
            ),
          }
        : {}),
    })
  }
  if (
    input.warnings.includes('unbalanced') &&
    Math.abs(input.imbalance ?? 0) > 0
  ) {
    const currency = firstDefinedCurrency(
      input.currencies.reporting,
      input.currencies.source,
      input.currencies.target,
    )
    actions.push({
      action: 'find-fee-or-adjustment-leg',
      priority: 2,
      reason:
        'This flow has source and destination legs, but the reporting totals do not balance. Search nearby transactions for FX fees, transfer fees, withholding, penalties, or final external spend before treating the chain as fully reconciled.',
      rpc: 'money.transactions.search',
      params: moneyFlowCandidateSearchParams({
        startDate: input.startDate,
        endDate: input.endDate,
        currencyCode: currency,
        amount: Math.abs(input.imbalance ?? 0),
      }),
      labelTemplate: {
        namespace: 'moneyFlow',
        values: compactExtensionValues({
          flowId: input.flowId,
          role: 'fee',
          status: 'active',
          feeAmount: Math.abs(input.imbalance ?? 0),
          reportingCurrency: input.currencies.reporting[0] ?? currency,
        }),
      },
    })
  }
  return actions.sort(
    (a, b) => a.priority - b.priority || a.action.localeCompare(b.action),
  )
}

function moneyFlowCandidateSearchParams(input: {
  startDate?: string
  endDate?: string
  currencyCode?: string
  direction?: TransactionSearchFilters['direction']
  amount?: number
}): TransactionSearchFilters {
  const params: TransactionSearchFilters = { limit: 25 }
  const startDate = input.startDate ? shiftDate(input.startDate, -7) : undefined
  const endDate = input.endDate ? shiftDate(input.endDate, 7) : undefined
  if (startDate) params.startDate = startDate
  if (endDate) params.endDate = endDate
  if (input.currencyCode) params.currencyCode = input.currencyCode
  if (input.direction) params.direction = input.direction
  if (input.amount && input.amount > 0) {
    params.minAmount = roundMoney(input.amount * 0.85)
    params.maxAmount = roundMoney(input.amount * 1.15)
  }
  return params
}

function withMoneyFlowCandidateLabelRequests<
  T extends {
    params: TransactionSearchFilters
    labelTemplate: {
      namespace: 'moneyFlow'
      values: Record<string, MoneyExtensionPrimitive>
    }
  },
>(
  candidates: T[],
): Array<
  T & {
    previewRequest: TransactionLabelRequest
    applyRequest: TransactionLabelRequest
  }
> {
  return candidates.map((candidate) => {
    const selector: TransactionLabelSelector = {
      ...candidate.params,
      limit: candidate.params.limit ?? 25,
      missingNamespace: 'moneyFlow',
    }
    const request: Omit<TransactionLabelRequest, 'dryRun'> = {
      selector,
      namespace: candidate.labelTemplate.namespace,
      values: candidate.labelTemplate.values,
      source: 'agent',
      confidence: 0.9,
      teachRule: false,
    }
    return {
      ...candidate,
      previewRequest: {
        ...request,
        dryRun: true,
      },
      applyRequest: {
        ...request,
        dryRun: false,
      },
    }
  })
}

function moneyFlowLegCandidateSearches(input: {
  entries: MoneyFlowEntry[]
  roles: MoneyFlowRole[]
  targetRole: MoneyFlowRole
  currencyCode?: string
  currencyField: 'sourceCurrency' | 'targetCurrency'
}) {
  const roleSet = new Set(input.roles)
  return input.entries
    .filter((entry) => roleSet.has(entry.role))
    .map((entry) => {
      const amount = moneyFlowEntryAmount(entry)
      const currencyCode =
        input.currencyCode ??
        stringPrimitive(entry.values.reportingCurrency)?.toUpperCase() ??
        stringPrimitive(entry.values.sourceCurrency)?.toUpperCase() ??
        stringPrimitive(entry.values.targetCurrency)?.toUpperCase() ??
        (
          entry.transaction.currencyCode ?? entry.transaction.isoCurrencyCode
        )?.toUpperCase()
      return {
        transactionId: entry.transaction.id,
        date: entry.transaction.date,
        amount,
        ...(currencyCode ? { currencyCode } : {}),
        params: moneyFlowCandidateSearchParams({
          startDate: entry.transaction.date,
          endDate: entry.transaction.date,
          currencyCode,
          amount,
        }),
        labelTemplate: {
          namespace: 'moneyFlow' as const,
          values: compactExtensionValues({
            flowId: stringPrimitive(entry.values.flowId),
            role: input.targetRole,
            status: 'active',
            [input.currencyField]: currencyCode,
            reportingCurrency:
              stringPrimitive(entry.values.reportingCurrency)?.toUpperCase() ??
              currencyCode,
          }),
        },
      }
    })
}

function moneyFlowLinkedCurrencyDestinationSearches(input: {
  entries: MoneyFlowEntry[]
  linkedCurrencies: string[]
  sourceCurrencies: string[]
  reportingCurrencies: string[]
  flowId: string
}) {
  const sourceCurrencySet = new Set(
    input.sourceCurrencies.map((currency) => currency.toUpperCase()),
  )
  const targetCurrencies = uniqueStrings(
    input.linkedCurrencies
      .map((currency) => currency.toUpperCase())
      .filter((currency) => currency && !sourceCurrencySet.has(currency)),
  )
  if (targetCurrencies.length === 0) return []

  return input.entries
    .filter(
      (entry) =>
        entry.role === 'source' ||
        entry.role === 'transfer' ||
        entry.role === 'bridge',
    )
    .flatMap((entry) =>
      targetCurrencies.map((currencyCode) => ({
        transactionId: entry.transaction.id,
        date: entry.transaction.date,
        amount: moneyFlowEntryAmount(entry),
        currencyCode,
        params: moneyFlowCandidateSearchParams({
          startDate: entry.transaction.date,
          endDate: entry.transaction.date,
          currencyCode,
          direction: 'transfer',
        }),
        labelTemplate: {
          namespace: 'moneyFlow' as const,
          values: compactExtensionValues({
            flowId: input.flowId,
            role: 'destination',
            status: 'active',
            targetCurrency: currencyCode,
            reportingCurrency: input.reportingCurrencies[0] ?? currencyCode,
          }),
        },
      })),
    )
}

function moneyFlowLinkedCurrencyDestinationMatches(input: {
  transactions: MoneyTransaction[]
  entries: MoneyFlowEntry[]
  linkedCurrencies: string[]
  sourceCurrencies: string[]
  reportingCurrencies: string[]
  flowId: string
  limit: number
}) {
  const sourceCurrencySet = new Set(
    input.sourceCurrencies.map((currency) => currency.toUpperCase()),
  )
  const targetCurrencySet = new Set(
    input.linkedCurrencies
      .map((currency) => currency.toUpperCase())
      .filter((currency) => currency && !sourceCurrencySet.has(currency)),
  )
  if (targetCurrencySet.size === 0) return []

  const sourceEntries = input.entries.filter(
    (entry) =>
      entry.role === 'source' ||
      entry.role === 'transfer' ||
      entry.role === 'bridge',
  )
  if (sourceEntries.length === 0) return []
  const sourceDates = sourceEntries.map((entry) => entry.transaction.date)

  return input.transactions
    .filter((transaction) => {
      if (transaction.extensions?.moneyFlow) return false
      if (transaction.direction !== 'transfer') return false
      const currency = transactionCurrencyCode(transaction)
      if (!currency || !targetCurrencySet.has(currency)) return false
      return minDateDistanceDays(transaction.date, sourceDates) <= 14
    })
    .map((transaction) =>
      moneyFlowDestinationCandidateMatch(
        transaction,
        input.flowId,
        input.reportingCurrencies,
        sourceEntries,
      ),
    )
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.date.localeCompare(a.date) ||
        Math.abs(b.amount) - Math.abs(a.amount) ||
        a.transactionId.localeCompare(b.transactionId),
    )
    .slice(0, Math.max(0, input.limit))
}

function moneyFlowDestinationCandidateMatch(
  transaction: MoneyTransaction,
  flowId: string,
  reportingCurrencies: string[],
  sourceEntries: MoneyFlowEntry[],
) {
  const currencyCode = transactionCurrencyCode(transaction)
  const amount = Math.abs(transaction.valueForSum ?? transaction.amount ?? 0)
  const closestSource = closestMoneyFlowSourceEntry(
    transaction.date,
    sourceEntries,
  )
  const distanceDays = closestSource?.distanceDays ?? Number.POSITIVE_INFINITY
  const sourceCurrencyCode = closestSource
    ? (transactionCurrencyCode(closestSource.entry.transaction) ??
      stringPrimitive(
        closestSource.entry.values.sourceCurrency,
      )?.toUpperCase() ??
      stringPrimitive(
        closestSource.entry.values.reportingCurrency,
      )?.toUpperCase())
    : undefined
  const reportingCurrency = reportingCurrencies[0] ?? currencyCode
  const values = compactExtensionValues({
    flowId,
    role: 'destination',
    status: 'active',
    destinationKind: 'linked',
    toAccountId: transaction.accountId,
    targetAmount: amount,
    targetCurrency: currencyCode,
    reportingCurrency,
    reportingValue: reportingCurrency === currencyCode ? amount : undefined,
    reportingValueStatus:
      reportingCurrency === currencyCode ? 'locked' : undefined,
  })
  const labelTemplate = {
    namespace: 'moneyFlow' as const,
    values,
  }
  const request = moneyFlowExactTransactionLabelRequest(
    transaction.id,
    labelTemplate,
  )
  return {
    transactionId: transaction.id,
    date: transaction.date,
    amount,
    ...(currencyCode ? { currencyCode } : {}),
    direction: transaction.direction,
    ...(transaction.accountId ? { accountId: transaction.accountId } : {}),
    ...(closestSource
      ? {
          sourceTransactionId: closestSource.entry.transaction.id,
          sourceDate: closestSource.entry.transaction.date,
          sourceAmount: moneyFlowEntryAmount(closestSource.entry),
          ...(sourceCurrencyCode ? { sourceCurrencyCode } : {}),
          sourceDistanceDays: closestSource.distanceDays,
        }
      : {}),
    score: Math.max(0, 100 - distanceDays * 6),
    reasons: [
      'linked_non_source_currency',
      'transfer_direction',
      ...(closestSource ? ['closest_source_leg'] : []),
      `within_${distanceDays}_days_of_source_leg`,
    ],
    labelTemplate,
    previewRequest: {
      ...request,
      dryRun: true,
    },
    applyRequest: {
      ...request,
      dryRun: false,
    },
  }
}

function moneyFlowCandidateMatchGroups(
  matches: ReturnType<typeof moneyFlowLinkedCurrencyDestinationMatches>,
) {
  const groups = new Map<
    string,
    ReturnType<typeof moneyFlowLinkedCurrencyDestinationMatches>
  >()
  for (const match of matches) {
    if (!match.sourceTransactionId || !match.sourceDate) continue
    const group = groups.get(match.sourceTransactionId) ?? []
    group.push(match)
    groups.set(match.sourceTransactionId, group)
  }
  return [...groups.entries()].map(([sourceTransactionId, candidates]) => {
    const first = candidates[0]
    return {
      sourceTransactionId,
      sourceDate: first?.sourceDate ?? '',
      sourceAmount: first?.sourceAmount ?? 0,
      ...(first?.sourceCurrencyCode
        ? { sourceCurrencyCode: first.sourceCurrencyCode }
        : {}),
      candidateCount: candidates.length,
      candidates: candidates.slice(0, 5).map((candidate) => ({
        transactionId: candidate.transactionId,
        date: candidate.date,
        amount: candidate.amount,
        ...(candidate.currencyCode
          ? { currencyCode: candidate.currencyCode }
          : {}),
        score: candidate.score,
        reasons: candidate.reasons,
        previewRequest: candidate.previewRequest,
        applyRequest: candidate.applyRequest,
      })),
    }
  })
}

function moneyFlowExactTransactionLabelRequest(
  transactionId: string,
  labelTemplate: {
    namespace: 'moneyFlow'
    values: Record<string, MoneyExtensionPrimitive>
  },
): Omit<TransactionLabelRequest, 'dryRun'> {
  return {
    selector: {
      transactionIds: [transactionId],
      missingNamespace: 'moneyFlow',
      limit: 1,
    },
    namespace: labelTemplate.namespace,
    values: labelTemplate.values,
    source: 'agent',
    confidence: 0.9,
    teachRule: false,
  }
}

function accountCurrencyCodes(accounts: MoneyAccount[]): string[] {
  return uniqueStrings(
    accounts
      .map((account) =>
        (account.currencyCode ?? account.isoCurrencyCode)?.toUpperCase(),
      )
      .filter((currency): currency is string => Boolean(currency)),
  )
}

function moneyFlowSearchCurrencyCodes(formulaData: MoneyFormulaData): string[] {
  const accountCurrencies = accountCurrencyCodes(formulaData.accounts)
  if (accountCurrencies.length > 1) return accountCurrencies
  return uniqueStrings([
    ...accountCurrencies,
    ...formulaData.transactions
      .map((transaction) =>
        (
          transaction.currencyCode ?? transaction.isoCurrencyCode
        )?.toUpperCase(),
      )
      .filter((currency): currency is string => Boolean(currency)),
  ])
}

function firstDefinedCurrency(...groups: string[][]): string | undefined {
  for (const group of groups) {
    const currency = group.find(Boolean)
    if (currency) return currency
  }
  return undefined
}

function shiftDate(date: string, days: number): string | undefined {
  const parsed = new Date(`${date}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return undefined
  parsed.setUTCDate(parsed.getUTCDate() + days)
  return parsed.toISOString().slice(0, 10)
}

function transactionCurrencyCode(
  transaction: MoneyTransaction,
): string | undefined {
  return (
    transaction.currencyCode ?? transaction.isoCurrencyCode
  )?.toUpperCase()
}

function minDateDistanceDays(date: string, candidates: string[]): number {
  const parsed = dateToUtcDay(date)
  if (!Number.isFinite(parsed)) return Number.POSITIVE_INFINITY
  let min = Number.POSITIVE_INFINITY
  for (const candidate of candidates) {
    const distance = Math.abs(parsed - dateToUtcDay(candidate))
    if (Number.isFinite(distance)) min = Math.min(min, distance)
  }
  return min
}

function closestMoneyFlowSourceEntry(date: string, entries: MoneyFlowEntry[]) {
  const parsed = dateToUtcDay(date)
  if (!Number.isFinite(parsed)) return undefined
  return entries
    .map((entry) => ({
      entry,
      distanceDays: Math.abs(parsed - dateToUtcDay(entry.transaction.date)),
    }))
    .filter((candidate) => Number.isFinite(candidate.distanceDays))
    .sort(
      (a, b) =>
        a.distanceDays - b.distanceDays ||
        a.entry.transaction.date.localeCompare(b.entry.transaction.date) ||
        a.entry.transaction.id.localeCompare(b.entry.transaction.id),
    )[0]
}

function dateToUtcDay(date: string): number {
  const timestamp = Date.parse(`${date}T00:00:00.000Z`)
  return Number.isFinite(timestamp)
    ? Math.floor(timestamp / 86_400_000)
    : Number.POSITIVE_INFINITY
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function moneyFlowMatchesQueryStatus(
  status: MoneyFlowComputedStatus,
  queryStatus: MoneyFlowQuery['status'],
): boolean {
  if (queryStatus === 'all') return true
  if (queryStatus === 'needs-review') return moneyFlowStatusNeedsReview(status)
  return status === queryStatus
}

function moneyFlowComputedStatus(input: {
  roleCounts: Record<string, number>
  sourceValue: number
  destinationValue: number
  feeValue: number
  imbalance?: number
  externalDestination?: MoneyFlowExternalDestination
}): MoneyFlowComputedStatus {
  const hasSource =
    (input.roleCounts.source ?? 0) > 0 ||
    (input.roleCounts.transfer ?? 0) > 0 ||
    (input.roleCounts.bridge ?? 0) > 0
  const hasDestination = (input.roleCounts.destination ?? 0) > 0
  if (hasSource && !hasDestination && input.externalDestination)
    return 'external'
  if (!hasSource || !hasDestination) return 'incomplete'
  const tolerance = Math.max(1, Math.abs(input.sourceValue) * 0.01)
  return Math.abs(input.imbalance ?? 0) <= tolerance ? 'balanced' : 'unbalanced'
}

function moneyFlowWarnings(input: {
  roleCounts: Record<string, number>
  status: MoneyFlowComputedStatus
  imbalance?: number
  externalSpendValue: number
  externalDestination?: MoneyFlowExternalDestination
}): string[] {
  const warnings: string[] = []
  const hasSource =
    (input.roleCounts.source ?? 0) > 0 ||
    (input.roleCounts.transfer ?? 0) > 0 ||
    (input.roleCounts.bridge ?? 0) > 0
  if (!hasSource) warnings.push('missing_source')
  if ((input.roleCounts.destination ?? 0) === 0 && !input.externalDestination) {
    warnings.push('missing_destination')
  }
  if (input.status === 'unbalanced') warnings.push('unbalanced')
  if (input.externalSpendValue > 0) warnings.push('contains_external_spend')
  return warnings
}

type MoneyFlowExternalDestination = {
  kind: 'unlinked_owned' | 'external'
  targetCurrency?: string
  reportingCurrency?: string
  externalAccountName?: string
  note?: string
}

function moneyFlowExternalDestination(
  entries: MoneyFlowEntry[],
): MoneyFlowExternalDestination | undefined {
  const entry = entries.find((candidate) => {
    const kind = stringPrimitive(candidate.values.destinationKind)
    return kind === 'unlinked_owned' || kind === 'external'
  })
  if (!entry) return undefined
  const kind = stringPrimitive(entry.values.destinationKind)
  if (kind !== 'unlinked_owned' && kind !== 'external') return undefined
  return {
    kind,
    targetCurrency: stringPrimitive(entry.values.targetCurrency)?.toUpperCase(),
    reportingCurrency: stringPrimitive(
      entry.values.reportingCurrency,
    )?.toUpperCase(),
    externalAccountName: stringPrimitive(entry.values.externalAccountName),
    note: stringPrimitive(entry.values.note),
  }
}

function moneyFlowStatusNeedsReview(status: MoneyFlowComputedStatus): boolean {
  return status === 'incomplete' || status === 'unbalanced'
}

function moneyFlowRoleTotal(
  entries: Array<{
    transaction: MoneyTransaction
    values: Record<string, MoneyExtensionPrimitive>
    role: MoneyFlowRole
  }>,
  roles: MoneyFlowRole[],
): number {
  const roleSet = new Set<MoneyFlowRole>(roles)
  return (
    Math.round(
      entries
        .filter((entry) => roleSet.has(entry.role))
        .reduce((total, entry) => total + moneyFlowEntryAmount(entry), 0) * 100,
    ) / 100
  )
}

function moneyFlowEntryAmount(entry: {
  transaction: MoneyTransaction
  values: Record<string, MoneyExtensionPrimitive>
  role: MoneyFlowRole
}): number {
  const values = entry.values
  const candidates =
    entry.role === 'fee'
      ? [
          values.reportingValue,
          values.feeAmount,
          entry.transaction.valueForSum,
          entry.transaction.amount,
        ]
      : entry.role === 'destination'
        ? [
            values.reportingValue,
            values.targetAmount,
            entry.transaction.valueForSum,
            entry.transaction.amount,
          ]
        : [
            values.reportingValue,
            values.sourceAmount,
            entry.transaction.valueForSum,
            entry.transaction.amount,
          ]
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return Math.abs(candidate)
    }
  }
  return 0
}

function moneyFlowRole(
  value: MoneyExtensionPrimitive | undefined,
): MoneyFlowRole | undefined {
  return value === 'source' ||
    value === 'destination' ||
    value === 'bridge' ||
    value === 'transfer' ||
    value === 'fee' ||
    value === 'external_spend' ||
    value === 'ignored'
    ? value
    : undefined
}

function moneyFlowRoleCounts(roles: MoneyFlowRole[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const role of roles) counts[role] = (counts[role] ?? 0) + 1
  return counts
}

function moneyFlowCounts(
  flows: Array<ReturnType<typeof moneyFlowGroup>>,
): Record<'all' | 'needsReview' | MoneyFlowComputedStatus, number> {
  return flows.reduce(
    (counts, flow) => {
      counts.all += 1
      counts[flow.status] += 1
      if (flow.needsReview) counts.needsReview += 1
      return counts
    },
    {
      all: 0,
      needsReview: 0,
      balanced: 0,
      external: 0,
      unbalanced: 0,
      incomplete: 0,
    },
  )
}

function compareMoneyFlowGroups(
  a: ReturnType<typeof moneyFlowGroup>,
  b: ReturnType<typeof moneyFlowGroup>,
): number {
  return (
    Number(b.needsReview) - Number(a.needsReview) ||
    (b.endDate ?? '').localeCompare(a.endDate ?? '') ||
    a.flowId.localeCompare(b.flowId)
  )
}

function moneyFlowTransactionSample(entry: {
  transaction: MoneyTransaction
  values: Record<string, MoneyExtensionPrimitive>
  role: MoneyFlowRole
}) {
  return {
    id: entry.transaction.id,
    date: entry.transaction.date,
    name: entry.transaction.name,
    merchantName: entry.transaction.merchantName,
    accountId: entry.transaction.accountId,
    amount: entry.transaction.amount,
    valueForSum: entry.transaction.valueForSum,
    direction: entry.transaction.direction,
    currencyCode:
      entry.transaction.currencyCode ?? entry.transaction.isoCurrencyCode,
    role: entry.role,
    moneyFlow: entry.values,
  }
}

function recurringSeriesReviewAction(
  namespace: RecurringSeriesNamespace,
  selector: { transactionIds: string[] },
  values: Record<string, MoneyExtensionPrimitive | undefined>,
) {
  const cleanValues = compactExtensionValues(values)
  const request = {
    selector,
    namespace,
    source: 'agent' as const,
    confidence: numberPrimitive(cleanValues.confidence) ?? 0.9,
    values: cleanValues,
  }
  return {
    recommendedRpc: 'money.transactions.labelPreview',
    previewRequest: {
      ...request,
      dryRun: true,
    },
    applyRequest: {
      ...request,
      dryRun: false,
    },
  }
}

function compactExtensionValues(
  values: Record<string, MoneyExtensionPrimitive | undefined>,
): Record<string, MoneyExtensionPrimitive> {
  return Object.fromEntries(
    Object.entries(values).filter(
      (entry): entry is [string, MoneyExtensionPrimitive] => {
        const value = entry[1]
        return value !== undefined && value !== null && value !== ''
      },
    ),
  )
}

function recurringSeriesMatchesQuery(
  series: ReturnType<typeof recurringSeriesFromGroup>,
  query: RecurringSeriesQuery,
  generatedAt: string,
): boolean {
  if (query.status !== 'all' && series.status !== query.status) return false
  if (
    query.minConfidence !== undefined &&
    (series.confidence ?? 0) < query.minConfidence
  ) {
    return false
  }
  if (query.dueWithinDays !== undefined) {
    if (!series.nextDueDate) return false
    const dueMillis = Date.parse(`${series.nextDueDate}T00:00:00Z`)
    if (!Number.isFinite(dueMillis)) return false
    const today = Date.parse(`${generatedAt.slice(0, 10)}T00:00:00Z`)
    const dueBy = today + query.dueWithinDays * 24 * 60 * 60 * 1000
    if (dueMillis > dueBy) return false
  }
  return true
}

function recurringSeriesStatus(
  values: Record<string, MoneyExtensionPrimitive>,
  generatedAt?: string,
): RecurringSeriesStatus {
  if (values.status === 'skipped' || values.status === 'dismissed') {
    return values.status
  }
  if (values.active === false) return 'dismissed'
  if (recurringSeriesIsStale(values, generatedAt)) return 'stale'
  return 'active'
}

function recurringSeriesIsStale(
  values: Record<string, MoneyExtensionPrimitive>,
  generatedAt?: string,
): boolean {
  if (!generatedAt) return false
  const nextDueDate = stringPrimitive(values.nextDueDate)
  if (!nextDueDate) return false
  const dueMillis = Date.parse(`${nextDueDate.slice(0, 10)}T00:00:00Z`)
  const anchorMillis = Date.parse(`${generatedAt.slice(0, 10)}T00:00:00Z`)
  if (!Number.isFinite(dueMillis) || !Number.isFinite(anchorMillis))
    return false
  const intervalDays =
    numberPrimitive(values.intervalDays) ??
    recurringCadenceIntervalDays(values.cadence)
  const graceDays = recurringStaleGraceDays(intervalDays)
  return dueMillis < anchorMillis - graceDays * 86_400_000
}

function recurringCadenceIntervalDays(
  value: MoneyExtensionPrimitive | undefined,
): number {
  if (value === 'weekly') return 7
  if (value === 'quarterly') return 91
  if (value === 'yearly') return 365
  return 30
}

function recurringStaleGraceDays(intervalDays: number): number {
  if (intervalDays <= 8) return 3
  if (intervalDays <= 35) return 10
  if (intervalDays <= 100) return 21
  return 45
}

function compareRecurringSeries(
  a: ReturnType<typeof recurringSeriesFromGroup>,
  b: ReturnType<typeof recurringSeriesFromGroup>,
): number {
  return (
    recurringSeriesStatusRank(a.status) - recurringSeriesStatusRank(b.status) ||
    (a.nextDueDate ?? '9999-12-31').localeCompare(
      b.nextDueDate ?? '9999-12-31',
    ) ||
    b.monthlyAmount - a.monthlyAmount ||
    a.name.localeCompare(b.name)
  )
}

function recurringSeriesStatusRank(status: RecurringSeriesStatus): number {
  if (status === 'active') return 0
  if (status === 'stale') return 1
  if (status === 'skipped') return 2
  return 3
}

function recurringSeriesCounts(
  series: Array<ReturnType<typeof recurringSeriesFromGroup>>,
) {
  return {
    total: series.length,
    active: series.filter((entry) => entry.status === 'active').length,
    stale: series.filter((entry) => entry.status === 'stale').length,
    skipped: series.filter((entry) => entry.status === 'skipped').length,
    dismissed: series.filter((entry) => entry.status === 'dismissed').length,
    byNamespace: {
      subscription: series.filter((entry) => entry.namespace === 'subscription')
        .length,
      recurringObligation: series.filter(
        (entry) => entry.namespace === 'recurringObligation',
      ).length,
    },
    monthlyAmount: series
      .filter((entry) => entry.status === 'active')
      .reduce((total, entry) => total + entry.monthlyAmount, 0),
  }
}

function stringPrimitive(
  value: MoneyExtensionPrimitive | undefined,
): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function numberPrimitive(
  value: MoneyExtensionPrimitive | undefined,
): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function averageNumber(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  return values.reduce((total, value) => total + value, 0) / values.length
}

function medianNumber(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle]
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

async function buildTransactionLabelPlan(
  c: Context,
  query: TransactionLabelPlanQuery,
) {
  const [formulaData, pendingProposals] = await Promise.all([
    readVisibleFormulaData(c),
    readExtensionProposals(c, { entity: 'transaction', status: 'pending' }),
  ])
  return buildTransactionLabelPlanFromData(formulaData, pendingProposals, query)
}

function buildTransactionLabelPlanFromData(
  formulaData: MoneyFormulaData,
  pendingProposals: MoneyExtensionProposal[],
  query: TransactionLabelPlanQuery,
) {
  const registry = formulaData.extensionRegistry ?? {
    version: 1,
    extensions: [],
  }
  const registryNamespaces = registry.extensions
    .filter((extension) => extension.entity === 'transaction')
    .map((extension) => extension.namespace)
  const requestedNamespaces = query.namespaces
    ? uniqueStrings(
        query.namespaces
          .split(',')
          .map((namespace) => namespace.trim())
          .filter(Boolean),
      )
    : registryNamespaces
  const visibleTransactionIds = new Set(
    formulaData.transactions.map((transaction) => transaction.id),
  )
  const visiblePendingProposals = pendingProposals.filter((proposal) =>
    visibleTransactionIds.has(proposal.entityId),
  )
  const jobs = requestedNamespaces
    .map((namespace) =>
      transactionLabelPlanJob({
        namespace,
        formulaData: { ...formulaData, extensionRegistry: registry },
        pendingProposals: visiblePendingProposals,
        limitPerJob: query.limitPerJob,
      }),
    )
    .filter((job) => query.includeComplete || job.status !== 'complete')
    .sort(compareTransactionLabelPlanJobs)

  return buildTransactionLabelPlanFromJobs(jobs, {
    namespaces: query.namespaces,
    includeComplete: query.includeComplete,
    limitPerJob: query.limitPerJob,
  })
}

function buildTransactionLabelPlanFromJobs(
  jobs: Array<ReturnType<typeof transactionLabelPlanJob>>,
  filters: {
    namespaces?: string
    includeComplete?: boolean
    limitPerJob?: number
  } = {},
) {
  return {
    generatedAt: new Date().toISOString(),
    jobs,
    total: jobs.length,
    summary: summarizeTransactionLabelPlan(jobs),
    filters,
  }
}

function transactionLabelPlanJob(input: {
  namespace: string
  formulaData: MoneyFormulaData
  pendingProposals: MoneyExtensionProposal[]
  limitPerJob: number
}) {
  const definition = input.formulaData.extensionRegistry?.extensions.find(
    (extension) =>
      extension.entity === 'transaction' &&
      extension.namespace === input.namespace,
  )
  const direction = defaultDirectionForTransactionNamespace(definition)
  const eligibleTransactions = eligibleTransactionsForNamespace(
    input.formulaData.transactions,
    definition,
  )
  const coverage = extensionCoverage(definition)
  const labeledTransactionIds = new Set(
    eligibleTransactions
      .filter((transaction) =>
        hasTransactionNamespace(transaction, input.namespace),
      )
      .map((transaction) => transaction.id),
  )
  const pendingForNamespace = input.pendingProposals.filter(
    (proposal) => proposal.namespace === input.namespace,
  )
  const pendingTransactionIds = new Set(
    pendingForNamespace
      .filter((proposal) =>
        eligibleTransactions.some(
          (transaction) => transaction.id === proposal.entityId,
        ),
      )
      .map((proposal) => proposal.entityId),
  )
  const missingTotal =
    coverage === 'exhaustive'
      ? Math.max(0, eligibleTransactions.length - labeledTransactionIds.size)
      : 0
  const selector = {
    missingNamespace: input.namespace,
    direction,
    limit: input.limitPerJob,
  }
  const status =
    pendingForNamespace.length > 0
      ? 'review-proposals'
      : missingTotal > 0
        ? 'classify'
        : 'complete'
  const reviewQuery = {
    reason:
      pendingForNamespace.length > 0 ? 'has_proposals' : 'missing_namespace',
    namespace: input.namespace,
    direction,
    limit: Math.min(input.limitPerJob, 200),
  }
  const reviewGroupsRequest =
    pendingForNamespace.length > 0
      ? {
          ...reviewQuery,
          includeTransactions: false,
          includeTransactionIds: false,
          transactionSampleLimit: 0,
        }
      : undefined
  const applySuggestionsRequest = reviewGroupsRequest
    ? {
        ...reviewGroupsRequest,
        dryRun: true,
        maxGroups: Math.min(input.limitPerJob, 50),
        minConfidence: 0,
        includeResultDetails: false,
      }
    : undefined

  return {
    namespace: input.namespace,
    label: definition?.label ?? titleFromId(input.namespace),
    description: definition?.description,
    coverage,
    status,
    eligibleDirection: direction,
    eligibleTotal: eligibleTransactions.length,
    labeledTotal: labeledTransactionIds.size,
    missingTotal,
    pendingProposalTotal: pendingForNamespace.length,
    pendingProposalTransactionTotal: pendingTransactionIds.size,
    selector,
    reviewQuery,
    reviewGroupsRequest,
    applySuggestionsRequest,
    classifyRequest:
      missingTotal > 0
        ? {
            selector,
            targetNamespaces: [input.namespace],
            maxTransactions: input.limitPerJob,
            saveProposals: true,
            apply: false,
          }
        : undefined,
    recommendedRpc:
      pendingForNamespace.length > 0
        ? 'money.transactions.reviewGroups'
        : missingTotal > 0
          ? 'money.transactions.classify'
          : undefined,
    secondaryRpc:
      pendingForNamespace.length > 0
        ? 'money.transactions.reviewGroups.applySuggestions'
        : undefined,
  }
}

function defaultDirectionForTransactionNamespace(
  definition: MoneyExtensionRegistry['extensions'][number] | undefined,
): TransactionDirection | undefined {
  const baseCollections = new Set(
    (definition?.derivedCollections ?? []).map(
      (collection) => collection.baseCollection,
    ),
  )
  if (baseCollections.has('Expenses')) return 'expense'
  if (baseCollections.has('Income')) return 'income'
  return undefined
}

function hasTransactionNamespace(
  transaction: MoneyTransaction,
  namespace: string,
): boolean {
  const values = transaction.extensions?.[namespace]
  return Boolean(values && Object.keys(values).length > 0)
}

function compareTransactionLabelPlanJobs(
  a: ReturnType<typeof transactionLabelPlanJob>,
  b: ReturnType<typeof transactionLabelPlanJob>,
): number {
  return (
    labelPlanStatusRank(a.status) - labelPlanStatusRank(b.status) ||
    b.pendingProposalTotal - a.pendingProposalTotal ||
    b.missingTotal - a.missingTotal ||
    a.namespace.localeCompare(b.namespace)
  )
}

function eligibleTransactionsForNamespace(
  transactions: MoneyTransaction[],
  definition:
    | NonNullable<MoneyFormulaData['extensionRegistry']>['extensions'][number]
    | undefined,
): MoneyTransaction[] {
  const direction = defaultDirectionForTransactionNamespace(definition)
  return transactions.filter((transaction) =>
    direction ? transaction.direction === direction : true,
  )
}

function labelPlanStatusRank(status: string): number {
  if (status === 'review-proposals') return 0
  if (status === 'classify') return 1
  return 2
}

function summarizeTransactionLabelPlan(
  jobs: Array<ReturnType<typeof transactionLabelPlanJob>>,
) {
  return jobs.reduce(
    (summary, job) => {
      if (job.status === 'classify') summary.classify += 1
      if (job.status === 'review-proposals') summary['review-proposals'] += 1
      if (job.status === 'complete') summary.complete += 1
      summary.missingTotal += job.missingTotal
      summary.pendingProposalTotal += job.pendingProposalTotal
      return summary
    },
    {
      classify: 0,
      'review-proposals': 0,
      complete: 0,
      missingTotal: 0,
      pendingProposalTotal: 0,
    },
  )
}

async function buildRecommendationGroups(
  c: Context,
  query: RecommendationGroupQuery,
) {
  const formulaData = await readVisibleFormulaData(c)
  const transactionsById = new Map(
    formulaData.transactions.map((transaction) => [
      transaction.id,
      transaction,
    ]),
  )
  const recommendations = recommendationQueryFilter(
    formulaData.recommendations ?? [],
    query,
  )
  const groups = new Map<string, MoneyRecommendation[]>()
  for (const recommendation of recommendations) {
    const key = recommendationGroupKey(
      recommendation,
      query.groupBy,
      transactionsById,
    )
    const entries = groups.get(key.id) ?? []
    entries.push(recommendation)
    groups.set(key.id, entries)
  }
  const grouped = [...groups.entries()]
    .map(([id, entries]) =>
      recommendationGroupItem(id, entries, query, transactionsById),
    )
    .filter((group) => group.count >= query.minCount)
    .sort(compareRecommendationGroups)
  const page = paginateItems(grouped, query)
  return {
    groups: page.items,
    total: grouped.length,
    limit: page.limit,
    offset: page.offset,
    hasMore: page.hasMore,
    nextOffset: page.nextOffset,
    nextCursor: page.nextCursor,
    counts: recommendationGroupCounts(grouped),
    filters: {
      ...recommendationFiltersForResponse(query),
      groupBy: query.groupBy,
      minCount: query.minCount,
      includeRecommendations: query.includeRecommendations,
      includeRecommendationIds: query.includeRecommendationIds,
      includeSourceLinks: query.includeSourceLinks,
      recommendationSampleLimit: query.recommendationSampleLimit,
    },
    generatedAt: new Date().toISOString(),
  }
}

function recommendationGroupItem(
  id: string,
  recommendations: MoneyRecommendation[],
  query: RecommendationGroupQuery,
  transactionsById: Map<string, MoneyTransaction>,
) {
  const groupBy = query.groupBy
  const sorted = [...recommendations].sort(compareRecommendationsForReview)
  const first = sorted[0]
  const sourceLinks = uniqueRecommendationSourceLinks(sorted)
  const recommendationIds = sorted.map((recommendation) => recommendation.id)
  const totalEstimatedImpact =
    Math.round(
      sorted.reduce(
        (total, recommendation) =>
          total + (recommendation.estimatedImpact ?? 0),
        0,
      ) * 100,
    ) / 100
  return {
    id,
    groupBy,
    name: recommendationGroupName(id, groupBy, sorted, transactionsById),
    count: sorted.length,
    activeCount: sorted.filter(isActiveRecommendation).length,
    totalEstimatedImpact,
    maxSeverity: maxRecommendationSeverity(sorted),
    kinds: uniqueStrings(
      sorted.map((recommendation) => recommendation.kind),
    ).sort(),
    statuses: uniqueStrings(
      sorted.map((recommendation) => recommendation.status),
    ).sort(),
    sourceLinkCount: sourceLinks.length,
    recommendationIdCount: recommendationIds.length,
    ...(query.includeSourceLinks ? { sourceLinks } : {}),
    ...(query.includeRecommendationIds ? { recommendationIds } : {}),
    bulkActions: recommendationGroupBulkActions(id, groupBy, query.status),
    ...(query.includeRecommendations
      ? {
          recommendations: sorted.slice(0, query.recommendationSampleLimit),
        }
      : {}),
  }
}

function recommendationGroupKey(
  recommendation: MoneyRecommendation,
  groupBy: RecommendationGroupQuery['groupBy'],
  transactionsById: Map<string, MoneyTransaction>,
): { id: string } {
  if (groupBy === 'kind') {
    return { id: `kind:${recommendation.kind}` }
  }
  const source = recommendation.sourceLinks[0]
  if (!source) return { id: 'source:unknown' }
  if (groupBy === 'merchant' && source.entity === 'transaction') {
    const transaction = transactionsById.get(source.entityId)
    if (transaction)
      return { id: `merchant:${transactionMerchantId(transaction)}` }
  }
  return { id: `source:${source.entity}:${source.entityId}` }
}

function recommendationGroupName(
  id: string,
  groupBy: RecommendationGroupQuery['groupBy'],
  recommendations: MoneyRecommendation[],
  transactionsById: Map<string, MoneyTransaction>,
): string {
  const first = recommendations[0]
  if (!first) return titleFromId(id)
  if (groupBy === 'kind') return titleFromId(first.kind)
  const source = first.sourceLinks[0]
  if (groupBy === 'merchant' && source?.entity === 'transaction') {
    const transaction = transactionsById.get(source.entityId)
    if (transaction) return transaction.merchantName ?? transaction.name
  }
  if (source)
    return `${titleFromId(source.entity)}: ${titleFromId(source.entityId)}`
  return first.title
}

function recommendationGroupBulkActions(
  groupId: string,
  groupBy: RecommendationGroupQuery['groupBy'],
  currentStatus: RecommendationGroupQuery['status'],
) {
  const groupRequest = {
    groupBy,
    groupId,
    ...(currentStatus === 'all' ? {} : { currentStatus }),
  }
  return [
    {
      action: 'mark-done',
      label: 'Mark done',
      request: { ...groupRequest, status: 'done' as const },
    },
    {
      action: 'ignore',
      label: 'Ignore',
      request: { ...groupRequest, status: 'ignored' as const },
    },
    {
      action: 'reject',
      label: 'Reject',
      request: { ...groupRequest, status: 'rejected' as const },
    },
  ]
}

function compareRecommendationGroups(
  a: ReturnType<typeof recommendationGroupItem>,
  b: ReturnType<typeof recommendationGroupItem>,
): number {
  return (
    b.activeCount - a.activeCount ||
    recommendationSeveritySortValue(b.maxSeverity) -
      recommendationSeveritySortValue(a.maxSeverity) ||
    b.totalEstimatedImpact - a.totalEstimatedImpact ||
    b.count - a.count ||
    a.name.localeCompare(b.name)
  )
}

function recommendationGroupCounts(
  groups: Array<ReturnType<typeof recommendationGroupItem>>,
) {
  return groups.reduce(
    (counts, group) => {
      counts.groups += 1
      counts.recommendations += group.count
      counts.activeRecommendations += group.activeCount
      return counts
    },
    { groups: 0, recommendations: 0, activeRecommendations: 0 },
  )
}

async function patchRecommendations(
  c: Context,
  request: RecommendationBulkPatch,
) {
  const [recommendations, formulaData] = await Promise.all([
    readRecommendations(c),
    readVisibleFormulaData(c),
  ])
  const visibleRecommendationIds = new Set(
    (formulaData.recommendations ?? []).map(
      (recommendation) => recommendation.id,
    ),
  )
  const transactionsById = new Map(
    formulaData.transactions.map((transaction) => [
      transaction.id,
      transaction,
    ]),
  )
  const visibleRecommendations = recommendations.filter((recommendation) =>
    visibleRecommendationIds.has(recommendation.id),
  )
  const matched = recommendationQueryFilter(visibleRecommendations, {
    status: request.currentStatus ?? 'all',
    kind: request.kind,
    severity: request.severity,
    sourceEntity: request.sourceEntity,
    sourceEntityId: request.sourceEntityId,
  })
    .filter((recommendation) =>
      request.ids?.length ? request.ids.includes(recommendation.id) : true,
    )
    .filter((recommendation) =>
      request.groupId
        ? recommendationGroupKey(
            recommendation,
            request.groupBy ?? 'merchant',
            transactionsById,
          ).id === request.groupId
        : true,
    )
  const selected = matched.slice(0, request.limit)
  const now = new Date().toISOString()
  const selectedIds = new Set(
    selected.map((recommendation) => recommendation.id),
  )
  const patched = selected.map((recommendation) =>
    patchRecommendationStatus(recommendation, request.status, now),
  )
  if (request.dryRun) {
    return {
      ok: true,
      dryRun: true,
      matched: recommendationPatchMatchedSummary(
        matched,
        selected,
        request.limit,
      ),
      recommendations: patched,
      counts: recommendationCounts(recommendations),
    }
  }
  const next = recommendations.map((recommendation) =>
    selectedIds.has(recommendation.id)
      ? patchRecommendationStatus(recommendation, request.status, now)
      : recommendation,
  )
  await writeRecommendations(c, next)
  return {
    ok: true,
    dryRun: false,
    matched: recommendationPatchMatchedSummary(
      matched,
      selected,
      request.limit,
    ),
    recommendations: selected.map((recommendation) =>
      patchRecommendationStatus(recommendation, request.status, now),
    ),
    counts: recommendationCounts(next),
  }
}

function recommendationQueryFilter(
  recommendations: MoneyRecommendation[],
  query: Pick<
    RecommendationQuery,
    'status' | 'kind' | 'severity' | 'sourceEntity' | 'sourceEntityId'
  >,
) {
  return recommendations
    .filter((recommendation) => {
      if (query.status === 'active' && !isActiveRecommendation(recommendation))
        return false
      if (query.status && query.status !== 'active' && query.status !== 'all') {
        if (recommendation.status !== query.status) return false
      }
      if (query.kind && recommendation.kind !== query.kind) return false
      if (query.severity && recommendation.severity !== query.severity)
        return false
      if (
        query.sourceEntity &&
        !recommendation.sourceLinks.some(
          (link) => link.entity === query.sourceEntity,
        )
      ) {
        return false
      }
      if (
        query.sourceEntityId &&
        !recommendation.sourceLinks.some(
          (link) => link.entityId === query.sourceEntityId,
        )
      ) {
        return false
      }
      return true
    })
    .sort(compareRecommendationsForReview)
}

function recommendationPatchMatchedSummary(
  matched: MoneyRecommendation[],
  selected: MoneyRecommendation[],
  limit: number,
) {
  return {
    total: matched.length,
    selected: selected.length,
    limit,
    hasMore: matched.length > selected.length,
  }
}

function patchRecommendationStatus(
  recommendation: MoneyRecommendation,
  status: MoneyRecommendation['status'],
  now: string,
): MoneyRecommendation {
  return {
    ...recommendation,
    ...recommendationStatusTimestamp(status, now),
    status,
    updatedAt: now,
  }
}

function recommendationStatusTimestamp(
  status: MoneyRecommendation['status'],
  now: string,
) {
  if (status === 'accepted') return { acceptedAt: now }
  if (status === 'rejected') return { rejectedAt: now }
  if (status === 'done') return { doneAt: now }
  if (status === 'ignored') return { ignoredAt: now }
  return {}
}

function recommendationCounts(recommendations: MoneyRecommendation[]) {
  return recommendations.reduce<{
    status: Record<string, number>
    kind: Record<string, number>
    severity: Record<string, number>
  }>(
    (counts, recommendation) => {
      counts.status[recommendation.status] =
        (counts.status[recommendation.status] ?? 0) + 1
      counts.kind[recommendation.kind] =
        (counts.kind[recommendation.kind] ?? 0) + 1
      counts.severity[recommendation.severity] =
        (counts.severity[recommendation.severity] ?? 0) + 1
      return counts
    },
    { status: {}, kind: {}, severity: {} },
  )
}

function recommendationFiltersForResponse(
  query: Pick<
    RecommendationQuery,
    'status' | 'kind' | 'severity' | 'sourceEntity' | 'sourceEntityId'
  >,
) {
  return {
    status: query.status,
    kind: query.kind,
    severity: query.severity,
    sourceEntity: query.sourceEntity,
    sourceEntityId: query.sourceEntityId,
  }
}

function compareRecommendationsForReview(
  a: MoneyRecommendation,
  b: MoneyRecommendation,
): number {
  return (
    recommendationStatusSortValue(a.status) -
      recommendationStatusSortValue(b.status) ||
    recommendationSeveritySortValue(b.severity) -
      recommendationSeveritySortValue(a.severity) ||
    (b.estimatedImpact ?? 0) - (a.estimatedImpact ?? 0) ||
    b.updatedAt.localeCompare(a.updatedAt) ||
    a.id.localeCompare(b.id)
  )
}

function recommendationStatusSortValue(
  status: MoneyRecommendation['status'],
): number {
  return {
    required: 0,
    suggested: 1,
    accepted: 2,
    rejected: 3,
    done: 4,
    ignored: 5,
  }[status]
}

function recommendationSeveritySortValue(
  severity: MoneyRecommendation['severity'],
): number {
  return { low: 0, medium: 1, high: 2 }[severity]
}

function maxRecommendationSeverity(recommendations: MoneyRecommendation[]) {
  return recommendations.reduce<MoneyRecommendation['severity']>(
    (max, recommendation) =>
      recommendationSeveritySortValue(recommendation.severity) >
      recommendationSeveritySortValue(max)
        ? recommendation.severity
        : max,
    'low',
  )
}

function uniqueRecommendationSourceLinks(
  recommendations: MoneyRecommendation[],
) {
  const seen = new Set<string>()
  const links: MoneyRecommendation['sourceLinks'] = []
  for (const recommendation of recommendations) {
    for (const link of recommendation.sourceLinks) {
      const key = `${link.entity}:${link.entityId}`
      if (seen.has(key)) continue
      seen.add(key)
      links.push(link)
    }
  }
  return links
}

async function buildTransactionReviewQueue(
  c: Context,
  query: TransactionReviewQueueQuery,
) {
  const [formulaData, transactionExtensions, pendingProposals] =
    await Promise.all([
      readVisibleFormulaData(c),
      readExtensionValues(c, { entity: 'transaction' }),
      readExtensionProposals(c, {
        entity: 'transaction',
        namespace: query.namespace,
        status: 'pending',
      }),
    ])
  const visibleIds = new Set(
    formulaData.transactions.map((transaction) => transaction.id),
  )
  const extensionsByTransaction = groupByEntityId(
    transactionExtensions.filter((extension) =>
      visibleIds.has(extension.entityId),
    ),
  )
  const proposalsByTransaction = groupByEntityId(
    pendingProposals.filter((proposal) => visibleIds.has(proposal.entityId)),
  )
  const recommendationsByTransaction = recommendationsByTransactionId(
    formulaData.recommendations ?? [],
  )
  const effectiveQuery = transactionReviewEffectiveQuery(query, formulaData)
  const baseTransactions = formulaData.transactions.filter((transaction) =>
    transactionMatchesReviewQuery(transaction, effectiveQuery),
  )
  const annotated = baseTransactions
    .map((transaction) =>
      transactionReviewItem(transaction, {
        extensions: extensionsByTransaction.get(transaction.id) ?? [],
        proposals: proposalsByTransaction.get(transaction.id) ?? [],
        recommendations: recommendationsByTransaction.get(transaction.id) ?? [],
        namespace: query.namespace,
        linkedAccountTransfer: isLikelyLinkedAccountTransfer(
          transaction,
          formulaData.accounts,
        ),
      }),
    )
    .filter((item) => item.reasons.includes(query.reason))
    .sort(compareTransactionReviewItems)
  const page = paginateItems(annotated, {
    limit: query.limit,
    offset: query.offset,
    cursor: query.cursor,
  })

  return {
    reason: query.reason,
    namespace: query.namespace,
    items: page.items,
    total: annotated.length,
    limit: page.limit,
    offset: page.offset,
    hasMore: page.hasMore,
    nextOffset: page.nextOffset,
    nextCursor: page.nextCursor,
    counts: transactionReviewCounts(
      baseTransactions,
      extensionsByTransaction,
      proposalsByTransaction,
      recommendationsByTransaction,
      query.namespace,
    ),
    generatedAt: new Date().toISOString(),
  }
}

async function buildTransactionReviewGroups(
  c: Context,
  query: TransactionReviewGroupsQuery,
) {
  const [formulaData, transactionExtensions, pendingProposals] =
    await Promise.all([
      readVisibleFormulaData(c),
      readExtensionValues(c, { entity: 'transaction' }),
      readExtensionProposals(c, {
        entity: 'transaction',
        namespace: query.namespace,
        status: 'pending',
      }),
    ])
  const visibleIds = new Set(
    formulaData.transactions.map((transaction) => transaction.id),
  )
  const extensionsByTransaction = groupByEntityId(
    transactionExtensions.filter((extension) =>
      visibleIds.has(extension.entityId),
    ),
  )
  const proposalsByTransaction = groupByEntityId(
    pendingProposals.filter((proposal) => visibleIds.has(proposal.entityId)),
  )
  const recommendationsByTransaction = recommendationsByTransactionId(
    formulaData.recommendations ?? [],
  )
  const effectiveQuery = transactionReviewEffectiveQuery(query, formulaData)
  const baseTransactions = formulaData.transactions.filter((transaction) =>
    transactionMatchesReviewQuery(transaction, effectiveQuery),
  )
  const reviewItems = baseTransactions
    .map((transaction) =>
      transactionReviewItem(transaction, {
        extensions: extensionsByTransaction.get(transaction.id) ?? [],
        proposals: proposalsByTransaction.get(transaction.id) ?? [],
        recommendations: recommendationsByTransaction.get(transaction.id) ?? [],
        namespace: query.namespace,
        linkedAccountTransfer: isLikelyLinkedAccountTransfer(
          transaction,
          formulaData.accounts,
        ),
      }),
    )
    .filter((item) => item.reasons.includes(query.reason))
    .filter((item) => !shouldExcludeFromReviewGroup(item, query.namespace))

  const grouped = transactionReviewGroupBuckets(reviewItems, query)
    .filter((group) => group.count >= query.minCount)
    .sort((a, b) => compareTransactionReviewGroups(a, b, query.sort))
  const page = paginateItems(grouped, {
    limit: query.limit,
    offset: query.offset,
    cursor: query.cursor,
  })

  return {
    groups: page.items,
    total: grouped.length,
    limit: page.limit,
    offset: page.offset,
    hasMore: page.hasMore,
    nextOffset: page.nextOffset,
    nextCursor: page.nextCursor,
    counts: transactionReviewGroupCounts(grouped),
    filters: {
      reason: query.reason,
      namespace: query.namespace,
      groupBy: query.groupBy,
      minCount: query.minCount,
      q: query.q,
      accountId: query.accountId,
      direction: effectiveQuery.direction,
      category: query.category,
      currencyCode: query.currencyCode,
      minAmount: query.minAmount,
      maxAmount: query.maxAmount,
      startDate: query.startDate,
      endDate: query.endDate,
      sort: query.sort,
      transactionSampleLimit: query.transactionSampleLimit,
      includeTransactions: query.includeTransactions,
      includeTransactionIds: query.includeTransactionIds,
    },
    generatedAt: new Date().toISOString(),
  }
}

async function applyTransactionReviewGroupSuggestions(
  c: Context,
  request: z.infer<typeof transactionReviewGroupSuggestionApplySchema>,
): Promise<
  | {
      ok: true
      dryRun: boolean
      matched: {
        totalGroups: number
        actionableGroups: number
        selectedGroups: number
        skippedGroups: number
        failedGroups: number
        hasMore: boolean
      }
      summary: {
        dryRun: boolean
        totalGroups: number
        actionableGroups: number
        selectedGroups: number
        skippedGroups: number
        failedGroups: number
        matchedTransactions: number
        selectedTransactions: number
        wouldWriteTotal: number
        wroteTotal: number
        hasMore: boolean
        byNamespace: Record<
          string,
          {
            groups: number
            matchedTransactions: number
            selectedTransactions: number
            wouldWriteTotal: number
            wroteTotal: number
          }
        >
      }
      groups: Array<{
        id: string
        namespace?: string
        merchantId: string
        name: string
        confidence?: number
        request: TransactionLabelRequest
        values: Record<string, MoneyExtensionPrimitive>
        resultSummary: {
          ok: boolean
          dryRun: boolean
          matchedTotal: number
          selectedTotal: number
          wouldWriteTotal: number
          wroteTotal: number
          hasMore: boolean
        }
        result?: Awaited<ReturnType<typeof applyTransactionLabels>>
      }>
      skipped: Array<{ id: string; reason: string }>
      failures: Array<{ id: string; reason: string }>
      reviewQuery: TransactionReviewGroupsQuery
    }
  | {
      ok: false
      error: {
        code: string
        message: string
      }
    }
> {
  const reviewQuery: TransactionReviewGroupsQuery = {
    ...request,
    reason: 'has_proposals',
    limit: Math.min(request.limit, request.maxGroups),
    includeTransactions: false,
    includeTransactionIds: false,
    transactionSampleLimit: 0,
  }
  const review = await buildTransactionReviewGroups(c, reviewQuery)
  const actionable = review.groups.filter((group) => group.suggestedLabelAction)
  const selected = actionable
    .filter((group) => (group.confidence ?? 0) >= request.minConfidence)
    .slice(0, request.maxGroups)
  const selectedIds = new Set(selected.map((group) => group.id))
  const skipped = [
    ...review.groups
      .filter((group) => !group.suggestedLabelAction)
      .map((group) => ({
        id: group.id,
        reason: 'missing_suggested_label_action',
      })),
    ...actionable
      .filter(
        (group) =>
          (group.confidence ?? 0) < request.minConfidence &&
          !selectedIds.has(group.id),
      )
      .map((group) => ({ id: group.id, reason: 'confidence_below_threshold' })),
  ]

  const groups: Array<{
    id: string
    namespace?: string
    merchantId: string
    name: string
    confidence?: number
    request: TransactionLabelRequest
    values: Record<string, MoneyExtensionPrimitive>
    resultSummary: {
      ok: boolean
      dryRun: boolean
      matchedTotal: number
      selectedTotal: number
      wouldWriteTotal: number
      wroteTotal: number
      hasMore: boolean
    }
    result?: Awaited<ReturnType<typeof applyTransactionLabels>>
  }> = []
  const failures: Array<{ id: string; reason: string }> = []

  for (const group of selected) {
    const requestToApply = request.dryRun
      ? group.suggestedLabelAction?.previewRequest
      : group.suggestedLabelAction?.applyRequest
    if (!requestToApply) {
      failures.push({ id: group.id, reason: 'missing_suggested_label_action' })
      continue
    }
    const result = await applyTransactionLabels(c, {
      ...requestToApply,
      dryRun: request.dryRun,
    })
    if (!result.ok) {
      failures.push({ id: group.id, reason: result.error.message })
      continue
    }
    groups.push({
      id: group.id,
      namespace: group.namespace,
      merchantId: group.merchantId,
      name: group.name,
      confidence: group.confidence,
      request: {
        ...requestToApply,
        dryRun: request.dryRun,
      },
      values: requestToApply.values,
      resultSummary: transactionLabelResultSummary(result),
      ...(request.includeResultDetails ? { result } : {}),
    })
  }

  const summary = transactionReviewGroupApplySummary({
    dryRun: request.dryRun,
    matched: {
      totalGroups: review.total,
      actionableGroups: actionable.length,
      selectedGroups: selected.length,
      skippedGroups: skipped.length,
      failedGroups: failures.length,
      hasMore: review.hasMore || actionable.length > selected.length,
    },
    groups,
  })

  return {
    ok: true,
    dryRun: request.dryRun,
    matched: summaryToMatched(summary),
    summary,
    groups,
    skipped,
    failures,
    reviewQuery,
  }
}

function transactionLabelResultSummary(
  result: Awaited<ReturnType<typeof applyTransactionLabels>>,
) {
  return {
    ok: result.ok,
    dryRun: result.ok ? result.dryRun : true,
    matchedTotal: result.ok ? result.summary.matchedTotal : 0,
    selectedTotal: result.ok ? result.summary.selectedTotal : 0,
    wouldWriteTotal: result.ok ? result.summary.wouldWriteTotal : 0,
    wroteTotal: result.ok ? result.summary.wroteTotal : 0,
    hasMore: result.ok ? result.summary.hasMore : false,
  }
}

function transactionReviewGroupApplySummary(input: {
  dryRun: boolean
  matched: {
    totalGroups: number
    actionableGroups: number
    selectedGroups: number
    skippedGroups: number
    failedGroups: number
    hasMore: boolean
  }
  groups: Array<{
    namespace?: string
    resultSummary: {
      matchedTotal: number
      selectedTotal: number
      wouldWriteTotal: number
      wroteTotal: number
    }
  }>
}) {
  const byNamespace: Record<
    string,
    {
      groups: number
      matchedTransactions: number
      selectedTransactions: number
      wouldWriteTotal: number
      wroteTotal: number
    }
  > = {}
  for (const group of input.groups) {
    const namespace = group.namespace ?? 'unknown'
    const summary = byNamespace[namespace] ?? {
      groups: 0,
      matchedTransactions: 0,
      selectedTransactions: 0,
      wouldWriteTotal: 0,
      wroteTotal: 0,
    }
    summary.groups += 1
    summary.matchedTransactions += group.resultSummary.matchedTotal
    summary.selectedTransactions += group.resultSummary.selectedTotal
    summary.wouldWriteTotal += group.resultSummary.wouldWriteTotal
    summary.wroteTotal += group.resultSummary.wroteTotal
    byNamespace[namespace] = summary
  }
  return {
    dryRun: input.dryRun,
    ...input.matched,
    matchedTransactions: input.groups.reduce(
      (total, group) => total + group.resultSummary.matchedTotal,
      0,
    ),
    selectedTransactions: input.groups.reduce(
      (total, group) => total + group.resultSummary.selectedTotal,
      0,
    ),
    wouldWriteTotal: input.groups.reduce(
      (total, group) => total + group.resultSummary.wouldWriteTotal,
      0,
    ),
    wroteTotal: input.groups.reduce(
      (total, group) => total + group.resultSummary.wroteTotal,
      0,
    ),
    byNamespace,
  }
}

function summaryToMatched(
  summary: ReturnType<typeof transactionReviewGroupApplySummary>,
) {
  return {
    totalGroups: summary.totalGroups,
    actionableGroups: summary.actionableGroups,
    selectedGroups: summary.selectedGroups,
    skippedGroups: summary.skippedGroups,
    failedGroups: summary.failedGroups,
    hasMore: summary.hasMore,
  }
}

function transactionReviewGroupBuckets(
  reviewItems: Array<ReturnType<typeof transactionReviewItem>>,
  query: TransactionReviewGroupsQuery,
) {
  if (query.reason === 'has_proposals' && !query.namespace) {
    const groups = new Map<
      string,
      {
        merchantId: string
        namespace: string
        items: Array<ReturnType<typeof transactionReviewItem>>
      }
    >()
    for (const item of reviewItems) {
      const merchantId = transactionMerchantId(item.transaction)
      for (const namespace of uniqueStrings(
        item.proposals.map((proposal) => proposal.namespace),
      )) {
        if (shouldExcludeFromReviewGroup(item, namespace)) continue
        const key = `${namespace}:${merchantId}`
        const group = groups.get(key) ?? { merchantId, namespace, items: [] }
        group.items.push(item)
        groups.set(key, group)
      }
    }
    return [...groups.values()].map((group) =>
      transactionReviewGroupItem(group.merchantId, group.items, query, {
        namespace: group.namespace,
        includeNamespaceInId: true,
      }),
    )
  }

  const groups = new Map<
    string,
    Array<ReturnType<typeof transactionReviewItem>>
  >()
  for (const item of reviewItems) {
    const merchantId = transactionMerchantId(item.transaction)
    const entries = groups.get(merchantId) ?? []
    entries.push(item)
    groups.set(merchantId, entries)
  }

  return [...groups.entries()].map(([merchantId, items]) =>
    transactionReviewGroupItem(merchantId, items, query),
  )
}

function transactionReviewEffectiveQuery<
  T extends { direction?: TransactionDirection; namespace?: string },
>(query: T, formulaData: MoneyFormulaData): T {
  if (query.direction || !query.namespace) return query
  const definition = formulaData.extensionRegistry?.extensions.find(
    (extension) =>
      extension.entity === 'transaction' &&
      extension.namespace === query.namespace,
  )
  const direction = defaultDirectionForTransactionNamespace(definition)
  return direction ? { ...query, direction } : query
}

function transactionReviewGroupItem(
  merchantId: string,
  items: Array<ReturnType<typeof transactionReviewItem>>,
  query: TransactionReviewGroupsQuery,
  options: { namespace?: string; includeNamespaceInId?: boolean } = {},
) {
  const namespace = options.namespace ?? query.namespace
  const sorted = [...items].sort(
    (a, b) =>
      b.transaction.date.localeCompare(a.transaction.date) ||
      a.transaction.id.localeCompare(b.transaction.id),
  )
  const transactions = sorted.map((item) => item.transaction)
  const first = sorted[0]
  const name =
    first?.transaction.merchantName ??
    first?.transaction.name ??
    titleFromId(merchantId)
  const transactionIds = transactions.map((transaction) => transaction.id)
  const selector: TransactionLabelSelector = {
    merchantIds: [merchantId],
    limit: 2000,
  }
  const direction = commonTransactionDirection(transactions)
  if (direction) selector.direction = direction
  if (namespace) selector.missingNamespace = namespace
  const totalAmount =
    Math.round(
      transactions.reduce(
        (total, transaction) =>
          total + Math.abs(transaction.valueForSum ?? transaction.amount),
        0,
      ) * 100,
    ) / 100
  const dates = transactions.map((transaction) => transaction.date).sort()
  const reasons = uniqueStrings(sorted.flatMap((item) => item.reasons)).sort()
  const currentLabel = namespace
    ? mostCommonReviewValue(
        sorted.flatMap((item) =>
          item.extensions
            .filter((extension) => extension.namespace === namespace)
            .map((extension) => extension.values),
        ),
      )
    : undefined
  const suggested = namespace
    ? reviewGroupSuggestion(sorted, namespace)
    : undefined
  const pendingProposalIds = uniqueStrings(
    sorted.flatMap((item) =>
      item.proposals
        .filter((proposal) => !namespace || proposal.namespace === namespace)
        .map((proposal) => proposal.id),
    ),
  )
  const confidence = averageNumber(
    sorted.flatMap((item) =>
      item.proposals
        .filter((proposal) => !namespace || proposal.namespace === namespace)
        .map((proposal) => proposal.confidence)
        .filter((value): value is number => value !== undefined),
    ),
  )

  return {
    id:
      options.includeNamespaceInId && namespace
        ? `merchant:${merchantId}:${namespace}`
        : `merchant:${merchantId}`,
    groupBy: 'merchant' as const,
    merchantId,
    name,
    count: transactions.length,
    totalAmount,
    startDate: dates[0],
    endDate: dates.at(-1),
    reasons,
    kind: reviewGroupKind(sorted),
    namespace,
    currentLabel,
    suggested,
    impact: transactionReviewGroupImpact(transactions, suggested, namespace),
    confidence,
    pendingProposalIds,
    pendingProposalCount: sorted.reduce(
      (total, item) => total + item.proposals.length,
      0,
    ),
    activeRecommendationCount: sorted.reduce(
      (total, item) => total + item.recommendations.length,
      0,
    ),
    ...(query.includeTransactionIds ? { transactionIds } : {}),
    labelSelector: selector,
    labelActions: first
      ? transactionReviewGroupLabelActions(
          first.transaction,
          namespace,
          selector,
          merchantId,
          name,
        )
      : undefined,
    suggestedLabelAction:
      suggested && namespace
        ? transactionReviewSuggestedLabelAction(
            merchantId,
            name,
            namespace,
            selector,
            suggested,
          )
        : undefined,
    notSpendingAction: first
      ? transactionReviewNotSpendingAction(
          first.transaction,
          merchantId,
          name,
          namespace,
        )
      : undefined,
    ...(query.includeTransactions
      ? {
          transactions: transactions
            .slice(0, query.transactionSampleLimit)
            .map((transaction) => ({
              id: transaction.id,
              date: transaction.date,
              name: transaction.name,
              merchantName: transaction.merchantName,
              amount: transaction.amount,
              valueForSum: transaction.valueForSum,
              direction: transaction.direction,
              accountId: transaction.accountId,
              category: transaction.category,
              currencyCode:
                transaction.currencyCode ?? transaction.isoCurrencyCode,
              extensions: transaction.extensions,
            })),
        }
      : {}),
  }
}

function commonTransactionDirection(
  transactions: MoneyTransaction[],
): TransactionDirection | undefined {
  const directions = [
    ...new Set(transactions.map((transaction) => transaction.direction)),
  ]
  return directions.length === 1 ? directions[0] : undefined
}

function transactionReviewGroupImpact(
  transactions: MoneyTransaction[],
  suggested:
    | {
        namespace: string
        values: Record<string, MoneyExtensionPrimitive>
        confidence?: number
        source: 'proposal' | 'rule'
        count?: number
      }
    | undefined,
  namespace?: string,
) {
  const monthTotals = new Map<string, number>()
  let totalAmount = 0
  for (const transaction of transactions) {
    const amount = Math.abs(transaction.valueForSum ?? transaction.amount)
    totalAmount += amount
    const month = transaction.date.slice(0, 7)
    monthTotals.set(month, (monthTotals.get(month) ?? 0) + amount)
  }
  const months = [...monthTotals.keys()].sort()
  const roundedTotal = roundMoney(totalAmount)
  const monthsObserved = Math.max(1, months.length)
  return {
    amount: roundedTotal,
    transactionCount: transactions.length,
    monthsObserved,
    firstMonth: months[0],
    lastMonth: months.at(-1),
    averageMonthlyAmount: roundMoney(roundedTotal / monthsObserved),
    annualizedAmount: roundMoney((roundedTotal / monthsObserved) * 12),
    suggestedNamespace: suggested?.namespace ?? namespace,
    suggestedValues: suggested?.values,
    rollupFormula: transactionReviewGroupRollupFormula(suggested, namespace),
  }
}

function transactionReviewGroupRollupFormula(
  suggested:
    | {
        namespace: string
        values: Record<string, MoneyExtensionPrimitive>
      }
    | undefined,
  namespace?: string,
): string | undefined {
  const activeNamespace = suggested?.namespace ?? namespace
  if (
    activeNamespace === 'budget' &&
    typeof suggested?.values.need === 'string'
  ) {
    return `BudgetLabels.Where(need = ${formulaStringLiteral(suggested.values.need)}).Sum()`
  }
  if (
    activeNamespace === 'joyReview' &&
    typeof suggested?.values.rating === 'string'
  ) {
    return `JoyReview.Where(rating = ${formulaStringLiteral(suggested.values.rating)}).Sum()`
  }
  return undefined
}

function formulaStringLiteral(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function transactionReviewSuggestedLabelAction(
  merchantId: string,
  merchantName: string,
  namespace: string,
  selector: TransactionLabelSelector,
  suggested: {
    values: Record<string, MoneyExtensionPrimitive>
    confidence?: number
    source: 'proposal' | 'rule'
  },
) {
  const teachRule = namespace === 'budget'
  const request: TransactionLabelRequest = {
    selector,
    namespace,
    values: { ...suggested.values },
    source: 'user',
    confidence: suggested.confidence,
    dryRun: false,
    teachRule,
    ...(teachRule
      ? {
          rule: {
            name: `${merchantName} ${namespace} label`,
            scope: 'merchant' as const,
            match: {
              merchantIds: [merchantId],
              ...(selector.direction ? { direction: selector.direction } : {}),
            },
          },
        }
      : {}),
  }
  return {
    action: 'apply-suggested-label',
    label: 'Apply suggested label',
    description:
      'Apply this group suggestion through labelApply so matching transactions, forward rules, materialized cards, and pending proposals stay in sync.',
    recommendedRpc: 'money.transactions.labelApply',
    previewRequest: {
      ...request,
      dryRun: true,
    },
    applyRequest: request,
  }
}

function transactionReviewGroupLabelActions(
  transaction: MoneyTransaction,
  namespace: string | undefined,
  selector: TransactionLabelSelector,
  merchantId: string,
  merchantName: string,
) {
  if (!namespace) return undefined
  const actions = transactionReviewLabelActionValues(transaction, namespace)
  if (actions.length === 0) return undefined
  return actions.map((action) => {
    const teachRule = namespace === 'budget'
    const request: TransactionLabelRequest = {
      selector,
      namespace,
      source: 'user',
      confidence: action.confidence,
      values: action.values,
      dryRun: false,
      teachRule,
      ...(teachRule
        ? {
            rule: {
              name: `${merchantName} ${namespace} label`,
              scope: 'merchant' as const,
              match: {
                merchantIds: [merchantId],
                ...(selector.direction
                  ? { direction: selector.direction }
                  : {}),
              },
            },
          }
        : {}),
    }
    return {
      action: action.action,
      label: action.label,
      recommendedRpc: 'money.transactions.labelApply',
      previewRequest: {
        ...request,
        dryRun: true,
      },
      applyRequest: request,
    }
  })
}

function transactionReviewNotSpendingAction(
  transaction: MoneyTransaction,
  merchantId: string,
  merchantName: string,
  namespace?: string,
) {
  if (namespace !== 'budget') return undefined
  if (transaction.direction !== 'expense') return undefined
  const selector: TransactionLabelSelector = {
    merchantIds: [merchantId],
    direction: 'expense',
    missingNamespace: 'moneyFlow',
    limit: 2000,
  }
  const request: TransactionLabelRequest = {
    selector,
    namespace: 'moneyFlow',
    source: 'user',
    confidence: 1,
    dryRun: false,
    teachRule: true,
    rule: {
      name: `${merchantName} is not spending`,
      scope: 'merchant',
      match: {
        merchantIds: [merchantId],
        direction: 'expense',
      },
    },
    values: {
      flowId: `not-spending-${merchantId}`,
      role: 'ignored',
      status: 'active',
      note: 'Marked as not spending from budget review.',
    },
  }
  return {
    action: 'mark-not-spending',
    label: 'Not spending',
    description:
      'Label this merchant group as money movement/ignored so it leaves budget categorization and future matches stay out.',
    recommendedRpc: 'money.transactions.labelApply',
    previewRequest: {
      ...request,
      dryRun: true,
    },
    applyRequest: request,
  }
}

function shouldExcludeFromReviewGroup(
  item: ReturnType<typeof transactionReviewItem>,
  namespace?: string,
): boolean {
  return (
    namespace === 'budget' && transactionReviewItemKind(item) === 'transfer'
  )
}

function reviewGroupKind(
  items: Array<ReturnType<typeof transactionReviewItem>>,
): 'transfer' | 'spending' {
  return items.every((item) => transactionReviewItemKind(item) === 'transfer')
    ? 'transfer'
    : 'spending'
}

function transactionReviewItemKind(
  item: ReturnType<typeof transactionReviewItem>,
): 'transfer' | 'spending' {
  if (item.signals.linkedAccountTransfer) return 'transfer'
  if (item.transaction.direction === 'transfer') return 'transfer'
  const moneyFlowRole = transactionReviewItemMoneyFlowRole(item)
  if (
    moneyFlowRole &&
    ['source', 'destination', 'bridge', 'transfer', 'ignored'].includes(
      moneyFlowRole,
    )
  ) {
    return 'transfer'
  }
  return 'spending'
}

function transactionReviewItemMoneyFlowRole(
  item: ReturnType<typeof transactionReviewItem>,
): string | undefined {
  const extension = item.extensions.find(
    (entry) => entry.namespace === 'moneyFlow',
  )
  const value =
    extension?.values.role ?? item.transaction.extensions?.moneyFlow?.role
  return typeof value === 'string' ? value : undefined
}

function isLikelyLinkedAccountTransfer(
  transaction: MoneyTransaction,
  accounts: MoneyAccount[],
): boolean {
  if (transaction.direction !== 'expense') return false
  const providerCategories = [
    transaction.providerCategoryPrimary,
    transaction.providerCategoryDetailed,
    ...transaction.category,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toUpperCase())
  if (
    providerCategories.some(
      (category) =>
        category.includes('TRANSFER_OUT') ||
        category.includes('CREDIT_CARD_PAYMENT') ||
        category.includes('LOAN_PAYMENTS_CREDIT_CARD_PAYMENT'),
    )
  ) {
    return true
  }

  const text = normalizeAccountReferenceText(
    [transaction.name, transaction.merchantName].filter(Boolean).join(' '),
  )
  if (!text) return false

  return accounts.some((account) => {
    if (!isTransferTargetAccount(account)) return false
    const mask = account.mask?.replace(/\D/g, '')
    if (mask && mask.length >= 4 && text.includes(mask)) return true
    return (
      linkedAccountNameMatches(text, account.name) ||
      linkedAccountNameMatches(text, account.officialName)
    )
  })
}

function isTransferTargetAccount(account: MoneyAccount): boolean {
  if (['credit', 'loan', 'mortgage', 'investment'].includes(account.type))
    return true
  const subtype = account.subtype?.toLowerCase()
  return Boolean(
    subtype &&
      ['credit', 'loan', 'mortgage', 'ira', '401k', 'rrsp', 'tfsa', 'hsa'].some(
        (entry) => subtype.includes(entry),
      ),
  )
}

function linkedAccountNameMatches(
  text: string,
  name: string | undefined,
): boolean {
  const normalizedName = normalizeAccountReferenceText(name ?? '')
  if (!normalizedName) return false
  const tokens = normalizedName.split(' ').filter((token) => token.length >= 3)
  const hasSpecificAccountToken = tokens.some((token) =>
    [
      'visa',
      'mastercard',
      'amex',
      'mortgage',
      'loan',
      'credit',
      'card',
      'ira',
      'rrsp',
      'tfsa',
      '401k',
    ].includes(token),
  )
  if (tokens.length < 2 && !hasSpecificAccountToken) return false
  if (text.includes(normalizedName)) return true
  return (
    hasSpecificAccountToken && tokens.every((token) => text.includes(token))
  )
}

function normalizeAccountReferenceText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function reviewGroupSuggestion(
  items: Array<ReturnType<typeof transactionReviewItem>>,
  namespace: string,
):
  | {
      namespace: string
      values: Record<string, MoneyExtensionPrimitive>
      confidence?: number
      source: 'proposal' | 'rule'
      count?: number
    }
  | undefined {
  const proposalSuggestion = mostCommonProposalReviewValue(
    items.flatMap((item) =>
      item.proposals
        .filter((proposal) => proposal.namespace === namespace)
        .map((proposal) => ({
          values: proposal.values,
          confidence: proposal.confidence,
        })),
    ),
  )
  if (proposalSuggestion) {
    return {
      namespace,
      values: proposalSuggestion.values,
      confidence: proposalSuggestion.confidence,
      source: 'proposal',
      count: proposalSuggestion.count,
    }
  }
  if (namespace !== 'budget') return undefined
  return suggestedBudgetNeed(items)
}

function suggestedBudgetNeed(
  items: Array<ReturnType<typeof transactionReviewItem>>,
):
  | {
      namespace: 'budget'
      values: { need: 'required' | 'useful' | 'optional' | 'waste' }
      confidence: number
      source: 'rule'
    }
  | undefined {
  const needs = items
    .map((item) => suggestedBudgetNeedForTransaction(item.transaction))
    .filter(
      (
        value,
      ): value is {
        need: 'required' | 'useful' | 'optional' | 'waste'
        confidence: number
      } => Boolean(value),
    )
  if (needs.length === 0) return undefined
  const counts = new Map<
    'required' | 'useful' | 'optional' | 'waste',
    { count: number; confidence: number }
  >()
  for (const need of needs) {
    const existing = counts.get(need.need) ?? { count: 0, confidence: 0 }
    existing.count += 1
    existing.confidence += need.confidence
    counts.set(need.need, existing)
  }
  const [need, summary] = [...counts.entries()].sort(
    (a, b) => b[1].count - a[1].count || b[1].confidence - a[1].confidence,
  )[0]
  return {
    namespace: 'budget',
    values: { need },
    confidence: Math.round((summary.confidence / summary.count) * 100) / 100,
    source: 'rule',
  }
}

function suggestedBudgetNeedForTransaction(
  transaction: MoneyTransaction,
):
  | { need: 'required' | 'useful' | 'optional' | 'waste'; confidence: number }
  | undefined {
  const categories = [
    transaction.providerCategoryPrimary,
    transaction.providerCategoryDetailed,
    ...transaction.category,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toUpperCase())
  if (categories.length === 0) return undefined
  if (
    categories.some(
      (category) =>
        category.includes('RENT') ||
        category.includes('UTILITIES') ||
        category.includes('LOAN_PAYMENTS') ||
        category.includes('MORTGAGE') ||
        category.includes('INSURANCE') ||
        category.includes('MEDICAL') ||
        category.includes('HEALTHCARE'),
    )
  ) {
    return { need: 'required', confidence: 0.82 }
  }
  if (
    categories.some(
      (category) =>
        category.includes('GROCER') ||
        category.includes('SUPERMARKET') ||
        category.includes('TRANSPORTATION') ||
        category.includes('GAS') ||
        category.includes('HOME_IMPROVEMENT') ||
        category.includes('BANK_FEES'),
    )
  ) {
    return { need: 'useful', confidence: 0.72 }
  }
  if (
    categories.some(
      (category) =>
        category.includes('FOOD_AND_DRINK') ||
        category.includes('RESTAURANT') ||
        category.includes('ENTERTAINMENT') ||
        category.includes('TRAVEL') ||
        category.includes('GENERAL_MERCHANDISE') ||
        category.includes('DIGITAL_PURCHASE'),
    )
  ) {
    return { need: 'optional', confidence: 0.68 }
  }
  return undefined
}

function mostCommonReviewValue(
  values: Array<Record<string, MoneyExtensionPrimitive>>,
):
  | { values: Record<string, MoneyExtensionPrimitive>; count: number }
  | undefined {
  if (values.length === 0) return undefined
  const counts = new Map<
    string,
    { values: Record<string, MoneyExtensionPrimitive>; count: number }
  >()
  for (const value of values) {
    const key = JSON.stringify(value, Object.keys(value).sort())
    const existing = counts.get(key)
    if (existing) existing.count += 1
    else counts.set(key, { values: value, count: 1 })
  }
  return [...counts.values()].sort((a, b) => b.count - a.count)[0]
}

function mostCommonProposalReviewValue(
  proposals: Array<{
    values: Record<string, MoneyExtensionPrimitive>
    confidence?: number
  }>,
):
  | {
      values: Record<string, MoneyExtensionPrimitive>
      count: number
      confidence?: number
    }
  | undefined {
  if (proposals.length === 0) return undefined
  const counts = new Map<
    string,
    {
      values: Record<string, MoneyExtensionPrimitive>
      count: number
      confidenceTotal: number
      confidenceCount: number
    }
  >()
  for (const proposal of proposals) {
    const key = JSON.stringify(
      proposal.values,
      Object.keys(proposal.values).sort(),
    )
    const existing = counts.get(key) ?? {
      values: proposal.values,
      count: 0,
      confidenceTotal: 0,
      confidenceCount: 0,
    }
    existing.count += 1
    if (proposal.confidence !== undefined) {
      existing.confidenceTotal += proposal.confidence
      existing.confidenceCount += 1
    }
    counts.set(key, existing)
  }
  const [best] = [...counts.values()].sort((a, b) => {
    const confidenceA =
      a.confidenceCount > 0 ? a.confidenceTotal / a.confidenceCount : 0
    const confidenceB =
      b.confidenceCount > 0 ? b.confidenceTotal / b.confidenceCount : 0
    return b.count - a.count || confidenceB - confidenceA
  })
  return {
    values: best.values,
    count: best.count,
    confidence:
      best.confidenceCount > 0
        ? Math.round((best.confidenceTotal / best.confidenceCount) * 1000) /
          1000
        : undefined,
  }
}

function transactionReviewGroupCounts(
  groups: Array<ReturnType<typeof transactionReviewGroupItem>>,
) {
  return groups.reduce(
    (counts, group) => {
      counts.groups += 1
      counts.transactions += group.count
      counts.pendingProposals += group.pendingProposalCount
      counts.activeRecommendations += group.activeRecommendationCount
      return counts
    },
    {
      groups: 0,
      transactions: 0,
      pendingProposals: 0,
      activeRecommendations: 0,
    },
  )
}

function compareTransactionReviewGroups(
  a: ReturnType<typeof transactionReviewGroupItem>,
  b: ReturnType<typeof transactionReviewGroupItem>,
  sort: TransactionReviewGroupsQuery['sort'] = 'impact',
): number {
  const priorityOrder =
    b.pendingProposalCount - a.pendingProposalCount ||
    b.activeRecommendationCount - a.activeRecommendationCount ||
    b.count - a.count ||
    b.totalAmount - a.totalAmount
  const impactOrder =
    b.impact.annualizedAmount - a.impact.annualizedAmount ||
    b.impact.amount - a.impact.amount ||
    b.pendingProposalCount - a.pendingProposalCount ||
    b.activeRecommendationCount - a.activeRecommendationCount
  const countOrder =
    b.count - a.count ||
    b.totalAmount - a.totalAmount ||
    b.pendingProposalCount - a.pendingProposalCount ||
    b.activeRecommendationCount - a.activeRecommendationCount
  const recencyOrder =
    (b.endDate ?? '').localeCompare(a.endDate ?? '') ||
    b.totalAmount - a.totalAmount ||
    b.pendingProposalCount - a.pendingProposalCount ||
    b.activeRecommendationCount - a.activeRecommendationCount

  const primaryOrder =
    sort === 'priority'
      ? priorityOrder
      : sort === 'count'
        ? countOrder
        : sort === 'recency'
          ? recencyOrder
          : impactOrder

  return (
    primaryOrder ||
    (b.endDate ?? '').localeCompare(a.endDate ?? '') ||
    a.name.localeCompare(b.name)
  )
}

function groupByEntityId<T extends { entityId: string }>(
  items: T[],
): Map<string, T[]> {
  const grouped = new Map<string, T[]>()
  for (const item of items) {
    const existing = grouped.get(item.entityId) ?? []
    existing.push(item)
    grouped.set(item.entityId, existing)
  }
  return grouped
}

function recommendationsByTransactionId(
  recommendations: MoneyRecommendation[],
): Map<string, MoneyRecommendation[]> {
  const grouped = new Map<string, MoneyRecommendation[]>()
  for (const recommendation of recommendations) {
    for (const link of recommendation.sourceLinks) {
      if (link.entity !== 'transaction') continue
      const existing = grouped.get(link.entityId) ?? []
      existing.push(recommendation)
      grouped.set(link.entityId, existing)
    }
  }
  return grouped
}

function transactionMatchesReviewQuery(
  transaction: MoneyTransaction,
  query: TransactionReviewQueueQuery,
): boolean {
  if (query.accountId && transaction.accountId !== query.accountId) return false
  if (query.direction && transaction.direction !== query.direction) return false
  if (
    query.currencyCode &&
    (transaction.currencyCode ?? transaction.isoCurrencyCode)?.toUpperCase() !==
      query.currencyCode.toUpperCase()
  ) {
    return false
  }
  if (
    query.minAmount !== undefined &&
    transactionComparableAmount(transaction) < query.minAmount
  ) {
    return false
  }
  if (
    query.maxAmount !== undefined &&
    transactionComparableAmount(transaction) > query.maxAmount
  ) {
    return false
  }
  if (query.startDate && transaction.date < query.startDate) return false
  if (query.endDate && transaction.date > query.endDate) return false
  if (query.category) {
    const category = query.category.toLowerCase()
    const matchesCategory =
      transaction.category.some((entry) =>
        entry.toLowerCase().includes(category),
      ) || transaction.userCategory?.toLowerCase() === category
    if (!matchesCategory) return false
  }
  if (query.q) {
    const q = query.q.toLowerCase()
    const haystack = [
      transaction.name,
      transaction.merchantName,
      transaction.notes,
      transaction.userCategory,
      ...transaction.category,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    if (!haystack.includes(q)) return false
  }
  return true
}

function transactionComparableAmount(transaction: MoneyTransaction): number {
  return Math.abs(transaction.valueForSum ?? transaction.amount)
}

function transactionReviewItem(
  transaction: MoneyTransaction,
  context: {
    extensions: MoneyExtensionValue[]
    proposals: MoneyExtensionProposal[]
    recommendations: MoneyRecommendation[]
    namespace?: string
    linkedAccountTransfer?: boolean
  },
) {
  const activeRecommendations = context.recommendations.filter(
    isActiveRecommendation,
  )
  const extensionNamespaces = [
    ...new Set(context.extensions.map((entry) => entry.namespace)),
  ].sort()
  const missingNamespace =
    context.namespace !== undefined &&
    !extensionNamespaces.includes(context.namespace)
  const reasons = transactionReviewReasons({
    hasPendingProposals: context.proposals.length > 0,
    hasActiveRecommendations: activeRecommendations.length > 0,
    missingNamespace,
    unlabeled: context.extensions.length === 0,
    recurring: transaction.recurring,
  })
  return {
    transaction,
    labelSelector: { transactionIds: [transaction.id] },
    labelActions: transactionReviewLabelActions(
      transaction,
      context.namespace,
      { transactionIds: [transaction.id], limit: 1 },
    ),
    reasons,
    signals: {
      pendingProposalCount: context.proposals.length,
      activeRecommendationCount: activeRecommendations.length,
      extensionNamespaces,
      missingNamespaces:
        missingNamespace && context.namespace ? [context.namespace] : [],
      recurring: transaction.recurring,
      transfer:
        transaction.direction === 'transfer' ||
        Boolean(context.linkedAccountTransfer),
      linkedAccountTransfer: Boolean(context.linkedAccountTransfer),
    },
    extensions: context.extensions,
    proposals: context.proposals,
    recommendations: activeRecommendations,
  }
}

function transactionReviewLabelActions(
  transaction: MoneyTransaction,
  namespace: string | undefined,
  selector: TransactionLabelSelector,
) {
  if (!namespace) return undefined
  const actions = transactionReviewLabelActionValues(transaction, namespace)
  if (actions.length === 0) return undefined
  return actions.map((action) => {
    const request = {
      selector,
      namespace,
      source: 'agent' as const,
      confidence: action.confidence,
      values: action.values,
    }
    return {
      action: action.action,
      label: action.label,
      recommendedRpc: 'money.transactions.labelPreview',
      previewRequest: {
        ...request,
        dryRun: true,
      },
      applyRequest: {
        ...request,
        dryRun: false,
      },
    }
  })
}

function transactionReviewLabelActionValues(
  transaction: MoneyTransaction,
  namespace: string,
): Array<{
  action: string
  label: string
  confidence: number
  values: Record<string, MoneyExtensionPrimitive>
}> {
  if (namespace === 'budget') {
    return [
      budgetAction('required', 'Required'),
      budgetAction('useful', 'Useful'),
      budgetAction('optional', 'Optional'),
      budgetAction('waste', 'Waste'),
    ]
  }
  if (namespace === 'joyReview') {
    const reviewedAt = new Date().toISOString().slice(0, 10)
    return [
      {
        action: 'joy-positive',
        label: 'Positive',
        confidence: 0.8,
        values: { rating: 'positive', decision: 'keep', reviewedAt },
      },
      {
        action: 'joy-neutral',
        label: 'Neutral',
        confidence: 0.75,
        values: { rating: 'neutral', decision: 'keep', reviewedAt },
      },
      {
        action: 'joy-negative',
        label: 'Negative',
        confidence: 0.75,
        values: { rating: 'negative', decision: 'reduce', reviewedAt },
      },
    ]
  }
  if (namespace === 'sharedExpense') {
    const half = Math.round(transaction.amount * 50) / 100
    return [
      {
        action: 'shared-owed-half',
        label: 'Owed 50%',
        confidence: 0.75,
        values: { status: 'owed', percent: 0.5, amount: half },
      },
      {
        action: 'shared-paid',
        label: 'Paid',
        confidence: 0.75,
        values: { status: 'paid', amount: transaction.amount },
      },
      {
        action: 'shared-ignore',
        label: 'Ignore',
        confidence: 0.75,
        values: { status: 'ignored' },
      },
    ]
  }
  if (namespace === 'moneyFlow') {
    const flowId = `flow-${transaction.id}`
    return [
      {
        action: 'money-flow-transfer',
        label: 'Transfer Flow',
        confidence: 0.75,
        values: {
          flowId,
          role: 'transfer',
          status: 'active',
          sourceCurrency:
            transaction.currencyCode ?? transaction.isoCurrencyCode,
          sourceAmount: transaction.valueForSum ?? transaction.amount,
        },
      },
      {
        action: 'money-flow-fee',
        label: 'Flow Fee',
        confidence: 0.75,
        values: {
          flowId,
          role: 'fee',
          status: 'active',
          feeAmount: transaction.valueForSum ?? transaction.amount,
        },
      },
      {
        action: 'money-flow-external-spend',
        label: 'External Spend',
        confidence: 0.75,
        values: {
          flowId,
          role: 'external_spend',
          status: 'active',
        },
      },
    ]
  }
  if (namespace === 'taxContribution') {
    const taxYear = Number.parseInt(transaction.date.slice(0, 4), 10)
    const amount = transaction.valueForSum ?? transaction.amount
    return ['401k', 'ira', 'hsa', '529'].map((type) => ({
      action: `tax-${type}`,
      label: type.toUpperCase(),
      confidence: 0.7,
      values: compactExtensionValues({
        type,
        taxYear: Number.isFinite(taxYear) ? taxYear : undefined,
        amount,
        contributionSource:
          transaction.direction === 'transfer' ? 'transfer' : 'manual',
      }),
    }))
  }
  return []
}

function budgetAction(
  need: 'required' | 'useful' | 'optional' | 'waste',
  label: string,
) {
  return {
    action: `budget-${need}`,
    label,
    confidence: 0.75,
    values: { need },
  }
}

function transactionReviewReasons(flags: {
  hasPendingProposals: boolean
  hasActiveRecommendations: boolean
  missingNamespace: boolean
  unlabeled: boolean
  recurring: boolean
}): TransactionReviewReason[] {
  const reasons = new Set<TransactionReviewReason>()
  if (flags.hasPendingProposals) reasons.add('has_proposals')
  if (flags.hasActiveRecommendations) reasons.add('has_recommendations')
  if (flags.missingNamespace) reasons.add('missing_namespace')
  if (flags.unlabeled) reasons.add('unlabeled')
  if (flags.recurring) reasons.add('recurring')
  if (
    flags.hasPendingProposals ||
    flags.hasActiveRecommendations ||
    flags.missingNamespace ||
    flags.recurring
  ) {
    reasons.add('needs_review')
  }
  return [...reasons]
}

function isActiveRecommendation(recommendation: MoneyRecommendation): boolean {
  return (
    recommendation.status === 'required' ||
    recommendation.status === 'suggested' ||
    recommendation.status === 'accepted'
  )
}

function compareTransactionReviewItems(
  a: ReturnType<typeof transactionReviewItem>,
  b: ReturnType<typeof transactionReviewItem>,
): number {
  return (
    reviewPriority(b) - reviewPriority(a) ||
    b.transaction.date.localeCompare(a.transaction.date) ||
    a.transaction.id.localeCompare(b.transaction.id)
  )
}

function reviewPriority(
  item: ReturnType<typeof transactionReviewItem>,
): number {
  return (
    item.signals.pendingProposalCount * 100 +
    item.signals.activeRecommendationCount * 50 +
    (item.signals.missingNamespaces.length > 0 ? 25 : 0) +
    (item.signals.recurring ? 10 : 0)
  )
}

function transactionReviewCounts(
  transactions: MoneyTransaction[],
  extensionsByTransaction: Map<string, MoneyExtensionValue[]>,
  proposalsByTransaction: Map<string, MoneyExtensionProposal[]>,
  recommendationsByTransaction: Map<string, MoneyRecommendation[]>,
  namespace?: string,
  options: {
    countMissingNamespace?: boolean
    countGlobalSignals?: boolean
  } = {},
): Record<TransactionReviewReason, number> {
  const counts: Record<TransactionReviewReason, number> = {
    needs_review: 0,
    has_proposals: 0,
    has_recommendations: 0,
    missing_namespace: 0,
    unlabeled: 0,
    recurring: 0,
  }
  for (const transaction of transactions) {
    const extensions = extensionsByTransaction.get(transaction.id) ?? []
    const extensionNamespaces = new Set(
      extensions.map((entry) => entry.namespace),
    )
    const pendingProposals = (
      proposalsByTransaction.get(transaction.id) ?? []
    ).filter(
      (proposal) => namespace === undefined || proposal.namespace === namespace,
    )
    const countGlobalSignals = options.countGlobalSignals !== false
    const reasons = transactionReviewReasons({
      hasPendingProposals: pendingProposals.length > 0,
      hasActiveRecommendations:
        countGlobalSignals &&
        (recommendationsByTransaction.get(transaction.id) ?? []).some(
          isActiveRecommendation,
        ),
      missingNamespace:
        namespace !== undefined &&
        options.countMissingNamespace !== false &&
        !extensionNamespaces.has(namespace),
      unlabeled: countGlobalSignals && extensions.length === 0,
      recurring: countGlobalSignals && transaction.recurring,
    })
    for (const reason of reasons) counts[reason] += 1
  }
  return counts
}

function visibleRecommendationSourceIds(
  state: Awaited<ReturnType<typeof readVisibleMoneyState>>,
): Set<string> {
  return new Set([
    ...state.raw.transactions.map(
      (transaction) => `transaction:${transaction.id}`,
    ),
    ...state.raw.accounts.map((account) => `account:${account.id}`),
    ...state.debts.map((debt) => `debt:${debt.id}`),
    ...state.holdings.map((holding) => `holding:${holding.id}`),
  ])
}

async function buildFormulasList(c: Context) {
  const [formulas, materialized] = await Promise.all([
    readFormulaDefinitions(c),
    readMaterializedMetrics(c),
  ])
  return {
    formulas,
    materialized: materialized.filter((metric) => metric.formulaId),
  }
}

async function buildFormulaSchema(c: Context) {
  const [
    formulaData,
    collectionDefinitions,
    formulaDefinitions,
    cardDefinitions,
    allocationTargets,
    forecastScenarios,
    taxContributionLimits,
  ] = await Promise.all([
    readVisibleFormulaData(c),
    readCollectionDefinitions(c, DEFAULT_COLLECTION_DEFINITIONS),
    readFormulaDefinitions(c),
    readCardDefinitions(c, DEFAULT_CARD_DEFINITIONS),
    readAllocationTargets(c),
    readForecastScenarios(c),
    readTaxContributionLimits(c),
  ])
  const extensionRegistry = formulaData.extensionRegistry

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    collections: {
      definitions: collectionDefinitions,
      metrics: buildCollections(formulaData),
    },
    entities: FORMULA_ENTITY_SCHEMAS,
    extensions: extensionRegistry,
    allocationTargets,
    forecastScenarios,
    taxContributionLimits,
    methods: FORMULA_METHOD_SCHEMAS,
    functions: FORMULA_FUNCTION_SCHEMAS,
    operators: FORMULA_OPERATORS,
    literals: FORMULA_LITERALS,
    formats: MONEY_VALUE_FORMATS,
    outputTypes: FORMULA_OUTPUT_TYPES,
    cardKinds: CARD_KINDS,
    examples: formulaSchemaExamples(formulaDefinitions, cardDefinitions),
  }
}

type FormulaSchema = Awaited<ReturnType<typeof buildFormulaSchema>>
type FormulaCompletionKind =
  | 'collection'
  | 'method'
  | 'function'
  | 'field'
  | 'enum'
  | 'operator'
  | 'literal'

type FormulaCompletion = {
  label: string
  kind: FormulaCompletionKind
  insert: string
  detail?: string
  signature?: string
  replaceRange: { start: number; end: number }
}

const FIELD_METHODS = new Set([
  'GroupBy',
  'Unique',
  'Sort',
  'Top',
  'Bottom',
  'MinBy',
  'MaxBy',
])
const COLLECTION_RESULT_METHODS = new Set([
  'Where',
  'ThisMonth',
  'LastMonth',
  'YTD',
  'ThisYear',
  'LastYear',
  'Between',
  'PreviousPeriod',
  'DueSoon',
  'Rolling',
  'Daily',
  'Weekly',
  'Monthly',
  'Yearly',
  'Unique',
  'Limit',
  'Offset',
  'Sort',
  'Top',
  'Bottom',
])

const SCALAR_RESULT_METHODS = new Set([
  'Sum',
  'Count',
  'Average',
  'Min',
  'Max',
  'PeriodSum',
  'PeriodAverage',
  'MonthlyAverage',
  'MinBy',
  'MaxBy',
])

const FORMULA_BUILT_IN_ENUMS: Record<string, string[]> = {
  'account.type': ['cash', 'credit', 'investment', 'loan', 'mortgage', 'other'],
  'account.investmentAccountKind': [
    'brokerage',
    '401k',
    'ira',
    'roth_ira',
    'rrsp',
    'tfsa',
    'hsa',
    '529',
    'other',
  ],
  'account.taxTreatment': [
    'taxable',
    'tax_deferred',
    'tax_free',
    'education',
    'hsa',
    'other',
  ],
  'account.liquidity': ['cash', 'near_cash', 'marketable', 'illiquid', 'na'],
  'account.liquidityClass': ['liquid', 'illiquid', 'na'],
  'debt.type': ['credit', 'mortgage', 'student', 'loan', 'other'],
  'holding.assetClass': [
    'stocks',
    'bonds',
    'cash',
    'crypto',
    'funds',
    'options',
    'other',
  ],
  'holding.investmentAccountKind': [
    'brokerage',
    '401k',
    'ira',
    'roth_ira',
    'rrsp',
    'tfsa',
    'hsa',
    '529',
    'other',
  ],
  'holding.taxTreatment': [
    'taxable',
    'tax_deferred',
    'tax_free',
    'education',
    'hsa',
    'other',
  ],
  'transaction.direction': ['income', 'expense', 'transfer'],
  assetClass: [
    'stocks',
    'bonds',
    'cash',
    'crypto',
    'funds',
    'options',
    'other',
  ],
  cadence: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'irregular'],
  contributionSource: ['payroll', 'employer', 'transfer', 'manual'],
  decision: ['keep', 'reduce', 'cancel'],
  direction: ['income', 'expense', 'transfer'],
  investmentAccountKind: [
    'brokerage',
    '401k',
    'ira',
    'roth_ira',
    'rrsp',
    'tfsa',
    'hsa',
    '529',
    'other',
  ],
  liquidity: ['cash', 'near_cash', 'marketable', 'illiquid', 'na'],
  liquidityClass: ['liquid', 'illiquid', 'na'],
  joy: ['positive', 'neutral', 'negative'],
  kind: ['action', 'warning', 'opportunity'],
  moneyFlowRole: [
    'source',
    'destination',
    'bridge',
    'transfer',
    'fee',
    'external_spend',
    'ignored',
  ],
  reportingValueStatus: ['locked', 'estimated'],
  need: ['required', 'useful', 'optional', 'waste'],
  rating: ['positive', 'neutral', 'negative'],
  recurringStatus: ['active', 'skipped', 'dismissed'],
  recommendationSeverity: ['low', 'medium', 'high'],
  reviewActionStatus: [
    'required',
    'suggested',
    'accepted',
    'rejected',
    'done',
    'ignored',
  ],
  reviewActionType: ['action', 'warning', 'opportunity'],
  severity: ['low', 'medium', 'high'],
  sharedStatus: ['owed', 'paid', 'ignored'],
  source: ['user', 'agent', 'rule', 'provider'],
  status: [
    'active',
    'skipped',
    'dismissed',
    'owed',
    'paid',
    'ignored',
    'required',
    'suggested',
    'accepted',
    'rejected',
    'done',
  ],
  taxContribution: ['401k', 'ira', 'hsa', '529'],
  taxContributionSource: ['payroll', 'employer', 'transfer', 'manual'],
  taxTreatment: [
    'taxable',
    'tax_deferred',
    'tax_free',
    'education',
    'hsa',
    'other',
  ],
  type: [
    'cash',
    'credit',
    'investment',
    'loan',
    'mortgage',
    'student',
    '401k',
    'ira',
    'hsa',
    '529',
  ],
}

async function completeFormula(
  c: Context,
  formula: string,
  rawCursor?: number,
) {
  const schema = await buildFormulaSchema(c)
  const cursor = Math.min(
    Math.max(rawCursor ?? formula.length, 0),
    formula.length,
  )
  const before = formula.slice(0, cursor)
  const methodContext = methodCompletionContext(before, schema)
  if (methodContext) {
    return {
      formula,
      cursor,
      context: methodContext.kind,
      completions: methodContext.completions,
    }
  }

  const argumentContext = argumentCompletionContext(before, cursor, schema)
  if (argumentContext) {
    return {
      formula,
      cursor,
      context: argumentContext.kind,
      completions: argumentContext.completions,
    }
  }

  const prefix = tokenPrefix(before)
  const replaceRange = { start: cursor - prefix.length, end: cursor }
  const expectsExpression = /^\s*$/.test(before) || /[\s(,+\-*/%]$/.test(before)
  const completions = expectsExpression
    ? expressionCompletions(schema, prefix, replaceRange)
    : operatorCompletions(prefix, replaceRange)

  return {
    formula,
    cursor,
    context: expectsExpression ? 'expression' : 'operator',
    completions,
  }
}

function expressionCompletions(
  schema: FormulaSchema,
  prefix: string,
  replaceRange: FormulaCompletion['replaceRange'],
): FormulaCompletion[] {
  const collections = formulaCompletionCollections(schema).map(
    (collection) => ({
      label: collection.id,
      kind: 'collection' as const,
      insert: collection.id,
      detail: `${collection.name} collection`,
      replaceRange,
    }),
  )
  const functions = schema.functions.map((fn) => ({
    label: fn.name,
    kind: 'function' as const,
    insert: `${fn.name}(`,
    detail: `Returns ${fn.returns}`,
    signature: `${fn.name}(${fn.args.map((arg) => arg.name).join(', ')})`,
    replaceRange,
  }))
  const literals = [
    completion('true', 'literal', 'true', replaceRange),
    completion('false', 'literal', 'false', replaceRange),
  ]
  return filterAndSortCompletions(
    [...collections, ...functions, ...literals],
    prefix,
  )
}

function methodCompletionContext(before: string, schema: FormulaSchema) {
  const match = before.match(/\.([A-Za-z_][A-Za-z0-9_]*)?$/)
  if (!match) return null
  const prefix = match[1] ?? ''
  const target = before.slice(0, before.length - match[0].length)
  const inferred = inferChainKind(target, schema)
  if (!inferred) return null
  const replaceRange = {
    start: before.length - prefix.length,
    end: before.length,
  }
  const completions = methodCompletions(
    schema,
    inferred.kind,
    prefix,
    replaceRange,
  )
  return { kind: 'method', completions }
}

function methodCompletions(
  schema: FormulaSchema,
  kind: 'collection' | 'table' | 'series' | 'scalar',
  prefix: string,
  replaceRange: FormulaCompletion['replaceRange'],
): FormulaCompletion[] {
  if (kind === 'scalar') return []
  const allowed = schema.methods.filter((method) => {
    if (kind === 'table') return method.name === 'PercentOfTotal'
    if (kind === 'series')
      return method.name === 'MovingAverage' || method.name === 'Cumulative'
    return (
      method.target === 'collection' ||
      method.target === 'windowed-collection' ||
      method.target === 'collection-or-table'
    )
  })

  return filterAndSortCompletions(
    allowed.map((method) => ({
      label: method.name,
      kind: 'method' as const,
      insert: `${method.name}(${method.args.length === 0 ? ')' : ''}`,
      detail: `Returns ${method.returns}`,
      signature: `${method.name}(${method.args.map((arg) => arg.name).join(', ')})`,
      replaceRange,
    })),
    prefix,
  )
}

function argumentCompletionContext(
  before: string,
  cursor: number,
  schema: FormulaSchema,
) {
  const match = before.match(
    /([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*\([^()]*\))*)\.([A-Za-z_][A-Za-z0-9_]*)\(([^()]*)$/,
  )
  if (!match) return null
  const collectionId = inferChainKind(match[1] ?? '', schema)?.collectionId
  const methodName = match[2] ?? ''
  const args = match[3] ?? ''
  if (!collectionId) return null

  const valueContext = enumValueContext(args, cursor, schema, collectionId)
  if (valueContext) return valueContext
  if (methodName === 'Where') {
    return fieldCompletionContext(cursor, args, schema, collectionId)
  }
  if (methodName === 'Sort' && currentArgumentIndex(args) === 1) {
    return enumCompletionsContext(
      args,
      cursor,
      ['asc', 'desc'],
      'enum',
      'Sort direction',
    )
  }
  if (!FIELD_METHODS.has(methodName)) return null
  if (
    (methodName === 'Top' || methodName === 'Bottom') &&
    currentArgumentIndex(args) === 0
  ) {
    return null
  }
  return fieldCompletionContext(cursor, args, schema, collectionId)
}

function fieldCompletionContext(
  cursor: number,
  args: string,
  schema: FormulaSchema,
  collectionId: string,
) {
  const prefix = tokenPrefix(args)
  const replaceRange = { start: cursor - prefix.length, end: cursor }
  return {
    kind: 'field',
    completions: filterAndSortCompletions(
      collectionFields(schema, collectionId).map((field) => ({
        label: field.name,
        kind: 'field' as const,
        insert: field.name,
        detail: `${field.type} field on ${collectionId}`,
        replaceRange,
      })),
      prefix,
    ),
  }
}

function enumValueContext(
  args: string,
  cursor: number,
  schema: FormulaSchema,
  collectionId: string,
) {
  const match = args.match(
    /([A-Za-z_][A-Za-z0-9_]*)\s*(=|!=|<=|>=|<|>)\s*["']?([A-Za-z0-9_-]*)$/,
  )
  if (!match) return null
  const fieldName = match[1] ?? ''
  const prefix = match[3] ?? ''
  const field = collectionFields(schema, collectionId).find(
    (entry) => entry.name === fieldName,
  )
  const values = enumValuesForField(
    schema,
    collectionId,
    fieldName,
    field?.enumValues,
  )
  if (values.length === 0) return null
  return enumCompletionsContext(
    args,
    cursor,
    values,
    'enum',
    `${fieldName} value`,
    prefix,
  )
}

function enumCompletionsContext(
  args: string,
  cursor: number,
  values: string[],
  kind: FormulaCompletionKind,
  detail: string,
  explicitPrefix?: string,
) {
  const prefix = explicitPrefix ?? tokenPrefix(args)
  const replaceRange = { start: cursor - prefix.length, end: cursor }
  const afterOperator =
    args.match(/(?:=|!=|<=|>=|<|>)\s*([^,)]*)$/)?.[1] ?? args
  const quoted = /["']/.test(afterOperator)
  return {
    kind,
    completions: filterAndSortCompletions(
      values.map((value) => ({
        label: value,
        kind,
        insert: quoted ? value : `"${value}"`,
        detail,
        replaceRange,
      })),
      prefix,
    ),
  }
}

function operatorCompletions(
  prefix: string,
  replaceRange: FormulaCompletion['replaceRange'],
): FormulaCompletion[] {
  return filterAndSortCompletions(
    FORMULA_OPERATORS.map((operator) =>
      completion(operator, 'operator', operator, replaceRange),
    ),
    prefix,
  )
}

function completion(
  label: string,
  kind: FormulaCompletionKind,
  insert: string,
  replaceRange: FormulaCompletion['replaceRange'],
): FormulaCompletion {
  return { label, kind, insert, replaceRange }
}

function filterAndSortCompletions(
  completions: FormulaCompletion[],
  prefix: string,
): FormulaCompletion[] {
  const normalizedPrefix = prefix.toLowerCase()
  const seen = new Set<string>()
  return completions
    .filter((entry) => entry.label.toLowerCase().startsWith(normalizedPrefix))
    .filter((entry) => {
      const key = `${entry.kind}:${entry.label}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort(
      (a, b) => a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label),
    )
}

function inferChainKind(
  rawTarget: string,
  schema: FormulaSchema,
): {
  collectionId: string
  kind: 'collection' | 'table' | 'series' | 'scalar'
} | null {
  const chain = rawTarget.match(
    /([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*\([^()]*\))*)$/,
  )?.[1]
  if (!chain) return null
  const collectionId = chain.match(/^([A-Za-z_][A-Za-z0-9_]*)/)?.[1]
  if (
    !collectionId ||
    !formulaCompletionCollections(schema).some(
      (entry) => entry.id === collectionId,
    )
  ) {
    return null
  }
  let kind: 'collection' | 'table' | 'series' | 'scalar' = 'collection'
  const methods = chain.matchAll(/\.([A-Za-z_][A-Za-z0-9_]*)\(/g)
  for (const method of methods) {
    const name = method[1] ?? ''
    if (kind === 'table') {
      kind = name === 'PercentOfTotal' ? 'table' : 'scalar'
    } else if (kind === 'series') {
      kind =
        name === 'MovingAverage' || name === 'Cumulative' ? 'series' : 'scalar'
    } else if (SCALAR_RESULT_METHODS.has(name)) {
      kind = 'scalar'
    } else if (name === 'GroupBy') {
      kind = 'table'
    } else if (name === 'Trend') {
      kind = 'series'
    } else if (
      COLLECTION_RESULT_METHODS.has(name) ||
      name === 'PercentOfTotal'
    ) {
      kind = name === 'PercentOfTotal' ? 'scalar' : 'collection'
    }
  }
  return { collectionId, kind }
}

function collectionFields(schema: FormulaSchema, collectionId: string) {
  const definition = formulaCompletionCollections(schema).find(
    (entry) => entry.id === collectionId,
  )
  if (!definition) return []
  const namespace = extensionNamespaceForCollection(schema, collectionId)
  const fields = new Map<
    string,
    { name: string; type: string; enumValues?: string[] }
  >()
  const entity = schema.entities.find((entry) => entry.id === definition.entity)
  for (const field of entity?.fields ?? []) {
    fields.set(field.name, { name: field.name, type: field.type })
  }
  for (const extension of schema.extensions?.extensions ?? []) {
    if (extension.entity !== definition.entity) continue
    for (const field of extension.fields) {
      const enumValues = field.enumValues?.filter(Boolean)
      fields.set(`${extension.namespace}_${field.name}`, {
        name: `${extension.namespace}_${field.name}`,
        type: field.type,
        enumValues,
      })
      for (const alias of field.formulaAliases ?? []) {
        fields.set(alias, { name: alias, type: field.type, enumValues })
      }
      if (namespace === extension.namespace) {
        fields.set(field.name, {
          name: field.name,
          type: field.type,
          enumValues,
        })
      }
    }
  }
  return [...fields.values()].sort((a, b) => a.name.localeCompare(b.name))
}

function extensionNamespaceForCollection(
  schema: FormulaSchema,
  collectionId: string,
) {
  return (schema.extensions?.extensions ?? []).find((extension) =>
    extension.derivedCollections?.some(
      (collection) => collection.id === collectionId,
    ),
  )?.namespace
}

function formulaCompletionCollections(schema: FormulaSchema) {
  const byId = new Map<string, { id: string; name: string; entity: string }>()
  for (const collection of schema.collections.definitions) {
    byId.set(collection.id, {
      id: collection.id,
      name: collection.name,
      entity: collection.entity,
    })
  }
  for (const extension of schema.extensions?.extensions ?? []) {
    for (const collection of extension.derivedCollections ?? []) {
      if (byId.has(collection.id)) continue
      byId.set(collection.id, {
        id: collection.id,
        name: collection.name,
        entity: collection.entity,
      })
    }
  }
  return [...byId.values()]
}

function enumValuesForField(
  schema: FormulaSchema,
  collectionId: string,
  fieldName: string,
  registryValues?: string[],
) {
  const definition = formulaCompletionCollections(schema).find(
    (entry) => entry.id === collectionId,
  )
  const entityScoped = definition
    ? FORMULA_BUILT_IN_ENUMS[`${definition.entity}.${fieldName}`]
    : undefined
  return [
    ...new Set([
      ...(registryValues ?? []),
      ...(entityScoped ?? []),
      ...(FORMULA_BUILT_IN_ENUMS[fieldName] ?? []),
    ]),
  ]
}

function currentArgumentIndex(args: string) {
  return args.split(',').length - 1
}

function tokenPrefix(value: string) {
  return value.match(/[A-Za-z_][A-Za-z0-9_]*$/)?.[0] ?? ''
}

function isSyncableConnection(connection: MoneyConnection): boolean {
  return connection.status === 'connected' || connection.status === 'error'
}

async function buildConnectionList(c: Context) {
  const summary = await buildSyncStatusSummary(c)
  return {
    generatedAt: summary.generatedAt,
    connections: summary.items,
    total: summary.items.length,
    counts: summary.counts,
    nextActions: summary.nextActions,
  }
}

async function buildSyncStatusSummary(c: Context) {
  const [
    schedule,
    connections,
    accounts,
    transactions,
    debts,
    holdings,
    rawEvidence,
  ] = await Promise.all([
    getSyncScheduleStatus(c),
    readConnections(c),
    readAccounts(c),
    readTransactions(c),
    readDebts(c),
    readHoldings(c),
    readRawPlaidSyncEvidence(c, { limit: 100 }),
  ])
  const evidenceSummaries = rawEvidence.map((entry) => {
    const { responses: _responses, ...summary } = entry as RawPlaidSyncEvidence
    return summary
  })
  const evidenceByItem = new Map<string, RawPlaidSyncEvidenceSummary[]>()
  for (const evidence of evidenceSummaries) {
    const entries = evidenceByItem.get(evidence.itemId) ?? []
    entries.push(evidence)
    evidenceByItem.set(evidence.itemId, entries)
  }

  const itemSummaries = connections.map((connection) => {
    const itemEvidence = evidenceByItem.get(connection.itemId) ?? []
    const lastEvidence = itemEvidence[0]
    const itemAccounts = accounts.filter((account) =>
      factBelongsToItem(account, connection.itemId),
    )
    const itemTransactions = transactions.filter((transaction) =>
      factBelongsToItem(transaction, connection.itemId),
    )
    const itemDebts = debts.filter((debt) =>
      factBelongsToItem(debt, connection.itemId),
    )
    const itemHoldings = holdings.filter((holding) =>
      factBelongsToItem(holding, connection.itemId),
    )
    const optionalProductHints = optionalPlaidProductHintsForItem(itemAccounts)
    const productCoverage = syncProductCoverage(
      connection.products,
      {
        accounts: itemAccounts.length,
        transactions: itemTransactions.length,
        debts: itemDebts.length,
        holdings: itemHoldings.length,
        rawEvidence: itemEvidence.length,
      },
      optionalProductHints,
    )

    const warnings = syncItemWarnings(
      connection,
      productCoverage,
      itemEvidence.length,
    )
    const nextActions = syncItemNextActions(
      connection,
      productCoverage,
      itemEvidence.length,
    )

    return {
      itemId: connection.itemId,
      institutionName: connection.institutionName,
      status: connection.status,
      products: connection.products,
      connectedAt: connection.connectedAt,
      lastSyncAt: connection.lastSyncAt,
      lastError: connection.lastError,
      hasCredentialRef: Boolean(connection.credentialRef),
      cursor: schedule.syncState.itemCursors?.[connection.itemId],
      productCoverage,
      counts: {
        accounts: itemAccounts.length,
        transactions: itemTransactions.length,
        debts: itemDebts.length,
        holdings: itemHoldings.length,
        rawEvidence: itemEvidence.length,
      },
      lastEvidence: lastEvidence
        ? {
            id: lastEvidence.id,
            generatedAt: lastEvidence.generatedAt,
            trigger: lastEvidence.trigger,
            products: lastEvidence.products,
            cursor: lastEvidence.cursor,
            nextCursor: lastEvidence.nextCursor,
            hasMore: lastEvidence.hasMore,
            counts: lastEvidence.counts,
          }
        : undefined,
      warnings,
      nextAction: nextActions[0],
      nextActions,
    }
  })

  return {
    generatedAt: new Date().toISOString(),
    schedule,
    syncState: schedule.syncState,
    counts: {
      connections: connections.length,
      activeConnections: connections.filter(isSyncableConnection).length,
      errorConnections: connections.filter(
        (connection) => connection.status === 'error',
      ).length,
      accounts: accounts.filter((account) => account.source === 'plaid').length,
      transactions: transactions.filter(
        (transaction) => transaction.source === 'plaid',
      ).length,
      debts: debts.filter((debt) => debt.source === 'plaid').length,
      holdings: holdings.filter((holding) => holding.source === 'plaid').length,
      rawEvidence: evidenceSummaries.length,
    },
    nextActions: syncStatusNextActions(itemSummaries),
    backfill: {
      transactionBackfillMode: 'plaid-sync-cursor',
      limitation:
        'Money imports transactions returned by Plaid transactions/sync for connected Items and then continues from the stored cursor. Historical coverage depends on the Link/session access granted by Plaid and the institution.',
      evidenceLimit: 100,
    },
    items: itemSummaries,
    recentEvidence: evidenceSummaries.slice(0, 10),
  }
}

async function buildPlaidConnectionCheck(c: Context) {
  const [
    connections,
    accounts,
    transactions,
    debts,
    holdings,
    syncState,
    rawEvidence,
  ] = await Promise.all([
    readConnections(c),
    readAccounts(c),
    readTransactions(c),
    readDebts(c),
    readHoldings(c),
    readSyncState(c),
    readRawPlaidSyncEvidence(c, { limit: 100 }),
  ])

  const activeConnections = connections.filter(isSyncableConnection)
  const activeItemIds = new Set(
    activeConnections.map((connection) => connection.itemId),
  )
  const itemAccounts = accounts.filter(
    (account) =>
      (account.itemId && activeItemIds.has(account.itemId)) ||
      (account.connectionId && activeItemIds.has(account.connectionId)),
  )
  const itemTransactions = transactions.filter(
    (transaction) =>
      (transaction.itemId && activeItemIds.has(transaction.itemId)) ||
      (transaction.connectionId && activeItemIds.has(transaction.connectionId)),
  )
  const itemDebts = debts.filter(
    (debt) =>
      (debt.itemId && activeItemIds.has(debt.itemId)) ||
      (debt.connectionId && activeItemIds.has(debt.connectionId)),
  )
  const itemHoldings = holdings.filter(
    (holding) =>
      (holding.itemId && activeItemIds.has(holding.itemId)) ||
      (holding.connectionId && activeItemIds.has(holding.connectionId)),
  )
  const connectedProducts = new Set(
    activeConnections.flatMap((connection) => connection.products),
  )
  const connectionPayload = JSON.stringify(connections)
  const credentialBoundaryOk =
    connections.every((connection) => Boolean(connection.credentialRef)) &&
    !/(access_token|accessToken|access-(sandbox|production)-|secret-(sandbox|production)-)/i.test(
      connectionPayload,
    )

  const checks = [
    {
      id: 'plaid_connection',
      ok: connections.length > 0,
      label: 'Plaid connection stored',
      detail: connections.length
        ? `${connections.length} connection(s) stored.`
        : 'No Plaid connections are stored yet.',
      count: connections.length,
    },
    {
      id: 'active_connection',
      ok: activeConnections.length > 0,
      label: 'Active Plaid connection',
      detail: activeConnections.length
        ? `${activeConnections.length} active connection(s).`
        : 'No active Plaid connections are ready to sync.',
      count: activeConnections.length,
    },
    {
      id: 'credential_boundary',
      ok: credentialBoundaryOk,
      label: 'Credential boundary',
      detail: credentialBoundaryOk
        ? 'Connections contain credential references, not Plaid access tokens.'
        : 'A connection is missing a credential reference or contains token-shaped data.',
      count: connections.filter((connection) => connection.credentialRef)
        .length,
    },
    {
      id: 'sync_success',
      ok: syncState.status !== 'error' && Boolean(syncState.lastSyncAt),
      label: 'Successful sync recorded',
      detail: syncState.lastSyncAt
        ? `Last successful sync: ${syncState.lastSyncAt}.`
        : 'No successful sync has been recorded yet.',
    },
    {
      id: 'accounts_imported',
      ok: itemAccounts.length > 0,
      label: 'Accounts imported',
      detail: itemAccounts.length
        ? `${itemAccounts.length} account(s) imported for active Items.`
        : 'No account facts have been imported for active Items.',
      count: itemAccounts.length,
    },
    {
      id: 'transactions_imported',
      ok: itemTransactions.length > 0,
      label: 'Transactions imported',
      detail: itemTransactions.length
        ? `${itemTransactions.length} transaction(s) imported for active Items.`
        : 'No transaction facts have been imported for active Items.',
      count: itemTransactions.length,
    },
    {
      id: 'raw_sync_evidence',
      ok: rawEvidence.length > 0,
      label: 'Raw Plaid sync evidence',
      detail: rawEvidence.length
        ? `${rawEvidence.length} raw sync evidence file(s) found.`
        : 'No raw Plaid sync evidence has been archived yet.',
      count: rawEvidence.length,
    },
    ...(connectedProducts.has('liabilities')
      ? [
          {
            id: 'liabilities_imported',
            ok: itemDebts.length > 0,
            label: 'Liabilities imported',
            detail: itemDebts.length
              ? `${itemDebts.length} debt fact(s) imported for active Items.`
              : 'Liabilities product is connected, but no debt facts are imported yet.',
            count: itemDebts.length,
          },
        ]
      : []),
    ...(connectedProducts.has('investments')
      ? [
          {
            id: 'investments_imported',
            ok: itemHoldings.length > 0,
            label: 'Investments imported',
            detail: itemHoldings.length
              ? `${itemHoldings.length} holding fact(s) imported for active Items.`
              : 'Investments product is connected, but no holding facts are imported yet.',
            count: itemHoldings.length,
          },
        ]
      : []),
  ]

  return {
    ok: checks.every((check) => check.ok),
    generatedAt: new Date().toISOString(),
    counts: {
      connections: connections.length,
      activeConnections: activeConnections.length,
      accounts: itemAccounts.length,
      transactions: itemTransactions.length,
      debts: itemDebts.length,
      holdings: itemHoldings.length,
      rawEvidence: rawEvidence.length,
    },
    syncState,
    checks,
  }
}

function factBelongsToItem(
  fact: { itemId?: string; connectionId?: string },
  itemId: string,
): boolean {
  return fact.itemId === itemId || fact.connectionId === itemId
}

function syncProductCoverage(
  products: string[],
  counts: {
    accounts: number
    transactions: number
    debts: number
    holdings: number
    rawEvidence: number
  },
  optionalProductHints: { liabilities: number; investments: number } = {
    liabilities: 0,
    investments: 0,
  },
) {
  return {
    auth: {
      requested: products.includes('auth'),
      imported: counts.accounts > 0,
      count: counts.accounts,
    },
    transactions: {
      requested: products.includes('transactions'),
      imported: counts.transactions > 0,
      count: counts.transactions,
    },
    liabilities: {
      requested: products.includes('liabilities'),
      imported: counts.debts > 0,
      count: counts.debts,
      suggestedByAccounts: optionalProductHints.liabilities > 0,
      suggestedAccountCount: optionalProductHints.liabilities,
    },
    investments: {
      requested: products.includes('investments'),
      imported: counts.holdings > 0,
      count: counts.holdings,
      suggestedByAccounts: optionalProductHints.investments > 0,
      suggestedAccountCount: optionalProductHints.investments,
    },
    rawEvidence: {
      imported: counts.rawEvidence > 0,
      count: counts.rawEvidence,
    },
  }
}

function syncItemWarnings(
  connection: MoneyConnection,
  coverage: ReturnType<typeof syncProductCoverage>,
  rawEvidenceCount: number,
): string[] {
  const warnings: string[] = []
  if (connection.status === 'error' && connection.lastError) {
    warnings.push(connection.lastError)
  }
  if (!connection.credentialRef) {
    warnings.push('Connection is missing a credential reference.')
  }
  if (rawEvidenceCount === 0) {
    warnings.push('No raw Plaid sync evidence has been archived for this Item.')
  }
  if (coverage.auth.requested && !coverage.auth.imported) {
    warnings.push(
      'Auth/accounts product is connected but no account facts are imported.',
    )
  }
  if (coverage.transactions.requested && !coverage.transactions.imported) {
    warnings.push(
      'Transactions product is connected but no transaction facts are imported.',
    )
  }
  if (
    !coverage.liabilities.requested &&
    coverage.liabilities.suggestedByAccounts
  ) {
    warnings.push(
      'Linked debt-like accounts are present, but the liabilities product was not requested.',
    )
  }
  if (coverage.liabilities.requested && !coverage.liabilities.imported) {
    warnings.push(
      'Liabilities product is connected but no debt facts are imported.',
    )
  }
  if (
    !coverage.investments.requested &&
    coverage.investments.suggestedByAccounts
  ) {
    warnings.push(
      'Linked investment-like accounts are present, but the investments product was not requested.',
    )
  }
  if (coverage.investments.requested && !coverage.investments.imported) {
    warnings.push(
      'Investments product is connected but no holding facts are imported.',
    )
  }
  return warnings
}

function syncItemNextActions(
  connection: MoneyConnection,
  coverage: ReturnType<typeof syncProductCoverage>,
  rawEvidenceCount: number,
): Array<{
  action: string
  reason: string
  rpc:
    | 'money.plaid.connectionCheck'
    | 'money.sync.status'
    | 'money.plaid.connectSession'
    | 'money.sync.history'
  itemId: string
  product?: 'transactions' | 'liabilities' | 'investments'
  products?: Array<'liabilities' | 'investments'>
  params?: {
    itemId: string
    additionalConsentedProducts?: Array<'liabilities' | 'investments'>
  }
}> {
  if (!connection.credentialRef) {
    return [
      {
        action: 'reconnect-item',
        reason: 'Connection is missing a credential reference.',
        rpc: 'money.plaid.connectionCheck',
        itemId: connection.itemId,
      },
    ]
  }
  if (connection.status === 'needs_reauth') {
    return [
      {
        action: 'reconnect-item',
        reason: 'Plaid Item requires reauthentication.',
        rpc: 'money.plaid.connectionCheck',
        itemId: connection.itemId,
      },
    ]
  }
  if (connection.status === 'error') {
    return [
      {
        action: 'retry-sync',
        reason: connection.lastError ?? 'Previous sync failed.',
        rpc: 'money.sync.status',
        itemId: connection.itemId,
      },
    ]
  }
  if (rawEvidenceCount === 0) {
    return [
      {
        action: 'run-sync',
        reason: 'No raw sync evidence has been archived for this Item.',
        rpc: 'money.sync.status',
        itemId: connection.itemId,
      },
    ]
  }
  const missingOptionalProducts: Array<'liabilities' | 'investments'> = []
  if (
    !coverage.liabilities.requested &&
    coverage.liabilities.suggestedByAccounts
  ) {
    missingOptionalProducts.push('liabilities')
  }
  if (
    !coverage.investments.requested &&
    coverage.investments.suggestedByAccounts
  ) {
    missingOptionalProducts.push('investments')
  }
  if (missingOptionalProducts.length > 0) {
    return [
      {
        action:
          missingOptionalProducts.length === 1
            ? 'relink-with-optional-product'
            : 'relink-with-optional-products',
        reason: optionalProductConsentReason(missingOptionalProducts, {
          liabilities: coverage.liabilities.suggestedAccountCount,
          investments: coverage.investments.suggestedAccountCount,
        }),
        rpc: 'money.plaid.connectSession',
        itemId: connection.itemId,
        ...(missingOptionalProducts.length === 1
          ? { product: missingOptionalProducts[0] }
          : {}),
        products: missingOptionalProducts,
        params: {
          itemId: connection.itemId,
          additionalConsentedProducts: missingOptionalProducts,
        },
      },
    ]
  }
  if (coverage.transactions.requested && !coverage.transactions.imported) {
    return [
      {
        action: 'verify-transaction-backfill',
        reason:
          'Transactions product is connected but no transaction facts are imported.',
        rpc: 'money.sync.history',
        itemId: connection.itemId,
        product: 'transactions',
      },
    ]
  }
  if (coverage.liabilities.requested && !coverage.liabilities.imported) {
    return [
      {
        action: 'verify-optional-product',
        reason:
          'Liabilities product is connected but no debt facts are imported.',
        rpc: 'money.sync.history',
        itemId: connection.itemId,
        product: 'liabilities',
      },
    ]
  }
  if (coverage.investments.requested && !coverage.investments.imported) {
    return [
      {
        action: 'verify-optional-product',
        reason:
          'Investments product is connected but no holding facts are imported.',
        rpc: 'money.sync.history',
        itemId: connection.itemId,
        product: 'investments',
      },
    ]
  }
  return []
}

function syncStatusNextActions(
  items: Array<{
    nextAction?: ReturnType<typeof syncItemNextActions>[number]
    nextActions?: ReturnType<typeof syncItemNextActions>
  }>,
) {
  type SyncAction = ReturnType<typeof syncItemNextActions>[number]
  type AggregateSyncAction = Omit<SyncAction, 'itemId'> & {
    count: number
  }
  const byKey = new Map<string, AggregateSyncAction>()
  for (const item of items) {
    const actions = item.nextActions?.length
      ? item.nextActions
      : item.nextAction
        ? [item.nextAction]
        : []
    for (const action of actions) {
      const { itemId: _itemId, ...aggregateAction } = action
      const key = `${aggregateAction.action}:${aggregateAction.product ?? aggregateAction.products?.join(',') ?? ''}`
      const existing = byKey.get(key)
      if (existing) {
        existing.count += 1
      } else {
        byKey.set(key, { ...aggregateAction, count: 1 })
      }
    }
  }
  return [...byKey.values()].sort(
    (a, b) => syncActionRank(a.action) - syncActionRank(b.action),
  )
}

function syncActionRank(action: string): number {
  if (action === 'reconnect-item') return 0
  if (action === 'retry-sync') return 1
  if (action === 'run-sync') return 2
  if (action === 'relink-with-optional-product') return 2.5
  if (action === 'relink-with-optional-products') return 2.5
  if (action === 'verify-transaction-backfill') return 3
  if (action === 'verify-optional-product') return 4
  return 10
}

async function runMoneySync(
  c: Context,
  trigger: 'manual' | 'scheduled',
  options: { itemIds?: string[] } = {},
): Promise<{
  status: 200 | 404 | 409 | 502
  body: {
    ok: boolean
    status: SyncState['status']
    syncedConnections: number
    failedConnections: number
    accounts: number
    transactions: number
    debts: number
    holdings: number
    rawEvidence: number
    removedTransactions: number
    refreshedMetrics: number
    errors: string[]
    syncState: SyncState
    message?: string
    error?: {
      code: string
      message: string
    }
  }
}> {
  const lockKey = getWorkspaceId(c) ?? 'default'
  const [settings, syncState] = await Promise.all([
    readSettings(c),
    readSyncState(c),
  ])
  if (syncLocks.has(lockKey)) {
    return {
      status: 409,
      body: {
        ok: false,
        status: 'syncing',
        syncedConnections: 0,
        failedConnections: 0,
        accounts: 0,
        transactions: 0,
        debts: 0,
        holdings: 0,
        rawEvidence: 0,
        removedTransactions: 0,
        refreshedMetrics: 0,
        errors: ['Money sync is already running for this workspace.'],
        syncState: {
          ...syncState,
          status: 'syncing',
          lastTrigger: trigger,
        },
      },
    }
  }

  syncLocks.add(lockKey)
  try {
    const connections = await readConnections(c)
    const attemptAt = new Date().toISOString()
    const selectedItemIds = options.itemIds
      ? new Set(options.itemIds.filter((itemId) => itemId.length > 0))
      : undefined

    if (connections.length === 0) {
      if (selectedItemIds) {
        const message = `Connection not found: ${[...selectedItemIds].join(', ')}`
        return {
          status: 404,
          body: {
            ok: false,
            status: syncState.status,
            syncedConnections: 0,
            failedConnections: 0,
            accounts: 0,
            transactions: 0,
            debts: 0,
            holdings: 0,
            rawEvidence: 0,
            removedTransactions: 0,
            refreshedMetrics: 0,
            errors: [message],
            syncState,
            error: {
              code: 'connection_not_found',
              message,
            },
          },
        }
      }
      const next = finalizeSyncState(settings, {
        ...syncState,
        generatedAt: attemptAt,
        lastAttemptAt: attemptAt,
        lastTrigger: trigger,
        status: 'idle',
        lastError: undefined,
        ...(trigger === 'scheduled' ? { lastScheduledRunAt: attemptAt } : {}),
      })
      await writeSyncState(c, next)
      return emptySyncResult(
        next,
        'No Plaid connections are configured for this workspace yet.',
      )
    }

    const selectedConnections = selectedItemIds
      ? connections.filter((connection) =>
          selectedItemIds.has(connection.itemId),
        )
      : connections

    if (
      selectedItemIds &&
      selectedConnections.length !== selectedItemIds.size
    ) {
      const found = new Set(
        selectedConnections.map((connection) => connection.itemId),
      )
      const missing = [...selectedItemIds].filter(
        (itemId) => !found.has(itemId),
      )
      return {
        status: 404,
        body: {
          ok: false,
          status: syncState.status,
          syncedConnections: 0,
          failedConnections: 0,
          accounts: 0,
          transactions: 0,
          debts: 0,
          holdings: 0,
          rawEvidence: 0,
          removedTransactions: 0,
          refreshedMetrics: 0,
          errors: [`Connection not found: ${missing.join(', ')}`],
          syncState,
          error: {
            code: 'connection_not_found',
            message: `Connection not found: ${missing.join(', ')}`,
          },
        },
      }
    }

    const activeConnections = selectedConnections.filter(isSyncableConnection)

    if (activeConnections.length === 0) {
      const message = selectedItemIds
        ? 'Selected Plaid connection is not active or has no credential reference.'
        : 'No active Plaid connections are ready to sync.'
      const next = finalizeSyncState(settings, {
        ...syncState,
        generatedAt: attemptAt,
        lastAttemptAt: attemptAt,
        lastTrigger: trigger,
        status: 'idle',
        lastError: undefined,
        ...(trigger === 'scheduled' ? { lastScheduledRunAt: attemptAt } : {}),
      })
      await writeSyncState(c, next)
      if (selectedItemIds) {
        const empty = emptySyncResult(next, message)
        return {
          ...empty,
          status: 409,
          body: {
            ...empty.body,
            ok: false,
            error: {
              code: 'connection_not_syncable',
              message,
            },
          },
        }
      }
      return emptySyncResult(next, message)
    }

    await writeSyncState(c, {
      ...syncState,
      generatedAt: attemptAt,
      lastAttemptAt: attemptAt,
      lastTrigger: trigger,
      status: 'syncing',
      lastError: undefined,
    })

    const [existing, existingDebts, existingHoldings] = await Promise.all([
      readMoneyData(c),
      readDebts(c),
      readHoldings(c),
    ])
    let accounts = existing.accounts
    let transactions = existing.transactions
    let debts = existingDebts
    let holdings = existingHoldings
    const nextConnections = [...connections]
    const itemCursors = { ...syncState.itemCursors }
    const errors: string[] = []
    let syncedConnections = 0
    let rawEvidence = 0
    let removedTransactions = 0
    const dirtyCollections = new Set<string>()

    for (const connection of activeConnections) {
      try {
        const requestCursor = itemCursors[connection.itemId]
        const result = await syncPlaidConnection(c, connection, requestCursor)
        accounts = upsertById(accounts, result.accounts)
        transactions = removeByIds(transactions, result.removedTransactionIds)
        transactions = upsertById(transactions, result.transactions)
        debts = replaceItemFacts(debts, connection.itemId, result.debts)
        holdings = replaceItemFacts(
          holdings,
          connection.itemId,
          result.holdings,
        )
        removedTransactions += result.removedTransactionIds.length
        addDirtyCollections(dirtyCollections, ACCOUNT_FACT_COLLECTIONS)
        if (result.transactions.length || result.removedTransactionIds.length) {
          addDirtyCollections(dirtyCollections, TRANSACTION_FACT_COLLECTIONS)
          addDirtyCollections(dirtyCollections, RECOMMENDATION_FACT_COLLECTIONS)
        }
        if (result.debts.length) {
          addDirtyCollections(dirtyCollections, DEBT_FACT_COLLECTIONS)
          addDirtyCollections(dirtyCollections, RECOMMENDATION_FACT_COLLECTIONS)
        }
        if (result.holdings.length) {
          addDirtyCollections(dirtyCollections, HOLDING_FACT_COLLECTIONS)
        }
        addDirtyCollections(dirtyCollections, BALANCE_SNAPSHOT_COLLECTIONS)
        if (result.nextCursor)
          itemCursors[connection.itemId] = result.nextCursor
        await writeRawPlaidSyncEvidence(
          c,
          buildRawPlaidSyncEvidence({
            connection,
            result,
            trigger,
            cursor: requestCursor,
          }),
        )
        rawEvidence += 1

        replaceConnection(nextConnections, {
          ...result.connection,
          lastError: undefined,
        })
        syncedConnections += 1
      } catch (error) {
        const message = plaidSyncErrorMessage(error)
        if (isPlaidAivaultSystemError(error)) {
          errors.push(message)
          break
        }
        errors.push(`${connection.institutionName}: ${message}`)
        replaceConnection(nextConnections, {
          ...connection,
          status: 'error',
          lastSyncAt: new Date().toISOString(),
          lastError: message,
        })
      }
    }

    await writeConnections(c, nextConnections)
    if (syncedConnections > 0) {
      await Promise.all([
        writeMoneyData(c, { accounts, transactions }),
        writeDebts(c, debts),
        writeHoldings(c, holdings),
      ])
      await upsertBalanceSnapshots(
        c,
        deriveBalanceSnapshots({ accounts, transactions }, holdings),
      )
      await writeRecommendations(
        c,
        deriveRecommendationFacts({ accounts, transactions }, debts),
      )
    }
    const refreshedMetrics =
      syncedConnections > 0
        ? await refreshMaterializedMetrics(c, dirtyCollections)
        : 0

    const finishedAt = new Date().toISOString()
    const next = finalizeSyncState(settings, {
      ...syncState,
      generatedAt: finishedAt,
      lastAttemptAt: attemptAt,
      lastSyncAt: syncedConnections > 0 ? finishedAt : syncState.lastSyncAt,
      lastScheduledRunAt:
        trigger === 'scheduled' ? finishedAt : syncState.lastScheduledRunAt,
      lastTrigger: trigger,
      status: errors.length > 0 ? 'error' : 'idle',
      itemCursors,
      lastError: errors.length > 0 ? errors.join('\n') : undefined,
    })
    await writeSyncState(c, next)

    return {
      status: syncedConnections === 0 && errors.length > 0 ? 502 : 200,
      body: {
        ok: errors.length === 0,
        status: next.status,
        syncedConnections,
        failedConnections: errors.length,
        accounts: accounts.length,
        transactions: transactions.length,
        debts: debts.length,
        holdings: holdings.length,
        rawEvidence,
        removedTransactions,
        refreshedMetrics,
        errors,
        syncState: next,
      },
    }
  } finally {
    syncLocks.delete(lockKey)
  }
}

function emptySyncResult(syncState: SyncState, message: string) {
  return {
    status: 200 as const,
    body: {
      ok: true,
      status: syncState.status,
      syncedConnections: 0,
      failedConnections: 0,
      accounts: 0,
      transactions: 0,
      debts: 0,
      holdings: 0,
      rawEvidence: 0,
      removedTransactions: 0,
      refreshedMetrics: 0,
      errors: [],
      message,
      syncState,
    },
  }
}

function buildRawPlaidSyncEvidence({
  connection,
  result,
  trigger,
  cursor,
}: {
  connection: MoneyConnection
  result: Awaited<ReturnType<typeof syncPlaidConnection>>
  trigger: 'manual' | 'scheduled'
  cursor?: string
}): RawPlaidSyncEvidence {
  const generatedAt = new Date().toISOString()
  const addedTransactions = result.raw.transactions.added?.length ?? 0
  const modifiedTransactions = result.raw.transactions.modified?.length ?? 0
  const removedTransactions = result.raw.transactions.removed?.length ?? 0

  return {
    id: `${generatedAt.replace(/[:.]/g, '-')}-${connection.itemId}`,
    itemId: connection.itemId,
    institutionName: connection.institutionName,
    generatedAt,
    trigger,
    products: connection.products,
    cursor,
    nextCursor: result.nextCursor,
    hasMore: result.hasMore,
    counts: {
      accounts: result.raw.accounts.accounts?.length ?? 0,
      addedTransactions,
      modifiedTransactions,
      removedTransactions,
      debts: result.debts.length,
      holdings: result.holdings.length,
    },
    responses: {
      accounts: result.raw.accounts,
      transactions: result.raw.transactions,
      liabilities: result.raw.liabilities,
      investments: result.raw.investments,
    },
  }
}

async function getSyncScheduleStatus(c: Context) {
  const [settings, syncState, connections] = await Promise.all([
    readSettings(c),
    readSyncState(c),
    readConnections(c),
  ])
  const activeConnections = connections.filter(isSyncableConnection)
  const nextScheduledRunAt =
    syncState.nextScheduledRunAt ??
    computeNextScheduledRunAt(settings, syncState)
  const now = new Date()
  const due =
    settings.sync.scheduledRefreshEnabled &&
    activeConnections.length > 0 &&
    (!nextScheduledRunAt ||
      new Date(nextScheduledRunAt).getTime() <= now.getTime())

  return {
    settings,
    syncState: {
      ...syncState,
      nextScheduledRunAt,
    },
    due,
    reason: syncDueReason(
      settings,
      activeConnections.length,
      nextScheduledRunAt,
      now,
    ),
    connectionCount: connections.length,
    activeConnectionCount: activeConnections.length,
    generatedAt: now.toISOString(),
  }
}

function syncDueReason(
  settings: MoneySettings,
  activeConnectionCount: number,
  nextScheduledRunAt: string | undefined,
  now: Date,
) {
  if (!settings.sync.scheduledRefreshEnabled)
    return 'scheduled_refresh_disabled'
  if (activeConnectionCount === 0) return 'no_active_connections'
  if (
    !nextScheduledRunAt ||
    new Date(nextScheduledRunAt).getTime() <= now.getTime()
  ) {
    return 'due'
  }
  return 'waiting_for_next_scheduled_run'
}

function finalizeSyncState(
  settings: MoneySettings,
  syncState: SyncState,
): SyncState {
  return {
    ...syncState,
    nextScheduledRunAt: computeNextScheduledRunAt(settings, syncState),
  }
}

function computeNextScheduledRunAt(
  settings: MoneySettings,
  syncState: SyncState,
): string | undefined {
  if (!settings.sync.scheduledRefreshEnabled) return undefined
  const lastRun =
    syncState.lastSyncAt ??
    syncState.lastScheduledRunAt ??
    syncState.lastAttemptAt
  if (!lastRun) return new Date().toISOString()
  const lastRunMs = new Date(lastRun).getTime()
  if (!Number.isFinite(lastRunMs)) return new Date().toISOString()
  return new Date(
    lastRunMs + settings.sync.intervalMinutes * 60_000,
  ).toISOString()
}

function inferFormulaOutputType(
  value: FormulaResultValue,
  format: MoneyCardDefinition['format'],
): MaterializedMetric['outputType'] {
  if (typeof value === 'object' && value !== null && 'type' in value) {
    if (value.type === 'date') return 'date'
    if (value.type === 'duration') return 'duration'
    if (value.type === 'forecast') return 'forecast'
    if (value.type === 'series') return 'series'
    if (value.type === 'table') return 'table'
    if (value.type === 'entity-list') return 'entity-list'
  }
  if (format === 'currency') return 'money'
  if (format === 'percent') return 'percent'
  return 'number'
}

function formulaValueOutputType(
  value: FormulaResultValue,
): MaterializedMetric['outputType'] | 'scalar' {
  if (typeof value === 'object' && value !== null && 'type' in value) {
    if (value.type === 'date') return 'date'
    if (value.type === 'duration') return 'duration'
    if (value.type === 'forecast') return 'forecast'
    if (value.type === 'series') return 'series'
    if (value.type === 'table') return 'table'
    if (value.type === 'entity-list') return 'entity-list'
  }
  return 'scalar'
}

function formulaOutputTypeMismatch(
  value: FormulaResultValue,
  expected: MaterializedMetric['outputType'] | undefined,
): string | null {
  if (!expected) return null
  const actual = formulaValueOutputType(value)
  const scalarExpected =
    expected === 'money' ||
    expected === 'percent' ||
    expected === 'count' ||
    expected === 'number'

  if (scalarExpected) {
    return typeof value === 'number'
      ? null
      : `Expected ${expected} output, but formula returned ${actual}.`
  }

  return actual === expected
    ? null
    : `Expected ${expected} output, but formula returned ${actual}.`
}

function cardKindOutputTypeMismatch(
  kind: MoneyCardDefinition['kind'],
  outputType: MaterializedMetric['outputType'],
): string | null {
  const allowed = CARD_KIND_OUTPUT_TYPES[kind]
  if (!allowed || allowed.includes(outputType)) return null
  return `Card kind "${kind}" cannot use ${outputType} output. Expected ${allowed.join(' or ')}.`
}

function cardKindDiagnostics(message: string) {
  return {
    ok: false as const,
    error: {
      code: 'card_kind_diagnostics',
      message,
      diagnostics: [{ message, range: null }],
    },
  }
}

const CARD_KIND_OUTPUT_TYPES: Record<
  MoneyCardDefinition['kind'],
  ReadonlyArray<MaterializedMetric['outputType']>
> = {
  metric: ['money', 'percent', 'count', 'number', 'duration', 'date'],
  ratio: ['percent', 'number'],
  list: ['count', 'number', 'table', 'entity-list'],
  status: ['count', 'number', 'percent', 'table'],
  trend: ['series', 'forecast'],
  breakdown: ['table'],
  'entity-list': ['entity-list', 'table'],
  optimizer: ['table', 'forecast', 'money', 'number', 'duration'],
  comparison: ['money', 'percent', 'count', 'number', 'table'],
  forecast: ['forecast', 'series', 'duration', 'money', 'number', 'table'],
}

function formulaSchemaExamples(
  formulas: MoneyFormulaDefinition[],
  cards: MoneyCardDefinition[],
) {
  const examples = [
    ...DEFAULT_CARD_DEFINITIONS.map((card) => ({
      title: card.title,
      kind: card.kind,
      formula: card.formula,
      format: card.format,
    })),
    ...formulas.map((formula) => ({
      title: formula.name,
      formula: formula.formula,
      format: formula.format,
      outputType: formula.outputType,
    })),
    ...cards.map((card) => ({
      title: card.title,
      kind: card.kind,
      formula: card.formula,
      format: card.format,
    })),
  ]
  const seen = new Set<string>()
  return examples.filter((example) => {
    const key = `${example.title}:${example.formula}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

type CardTemplateQuery = z.infer<typeof cardTemplateQuerySchema>

async function buildCardTemplateList(c: Context, query: CardTemplateQuery) {
  const [formulaData, collectionDefinitions] = await Promise.all([
    readVisibleFormulaData(c),
    readCollectionDefinitions(c, DEFAULT_COLLECTION_DEFINITIONS),
  ])
  const collections = buildCollections(formulaData)
  const validationOptions: FormulaValidationOptions = {
    collectionDefinitions,
    entities: FORMULA_ENTITY_SCHEMAS,
    extensionRegistry: formulaData.extensionRegistry,
  }
  const requestedIds = query.ids
    ? new Set(
        query.ids
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean),
      )
    : null
  const allTemplates = DEFAULT_CARD_DEFINITIONS.map((definition, index) => {
    const references = cardReferencedCollections(definition, collections)
    return {
      id: definition.id,
      title: definition.title,
      category: cardTemplateCategory(definition),
      priority: index + 1,
      definition,
      referencedCollections: references,
      requiredExtensions: cardRequiredExtensions(
        definition,
        collections,
        validationOptions,
      ),
      recommendedFor: cardTemplateUseCases(definition, references),
    }
  }).filter((template) => {
    if (query.category && template.category !== query.category) return false
    if (requestedIds && !requestedIds.has(template.id)) return false
    return true
  })
  const page = paginateItems(allTemplates, query)
  const testsById = new Map<string, unknown>()

  if (query.includeEvaluation && page.items.length > 0) {
    const tested = await testCardDefinitions(
      c,
      page.items.map((template) => template.definition),
    )
    for (const result of tested.cards) {
      const id = result.ok ? result.definition.id : result.input.id
      if (id) testsById.set(id, result)
    }
  }

  return {
    templates: page.items.map((template) => ({
      ...template,
      test: testsById.get(template.id),
    })),
    total: allTemplates.length,
    limit: query.limit,
    offset: page.offset,
    hasMore: page.hasMore,
    nextOffset: page.nextOffset,
    nextCursor: page.nextCursor,
    categories: CARD_TEMPLATE_CATEGORIES,
  }
}

function cardReferencedCollections(
  definition: MoneyCardDefinition,
  collections: CollectionMetric[],
): string[] {
  const references = new Set<string>()
  for (const formula of [
    definition.formula,
    definition.primaryFormula,
    ...Object.values(definition.secondaryFormulas ?? {}),
  ]) {
    if (!formula) continue
    for (const collection of safeReferencedCollections(formula, collections)) {
      references.add(collection)
    }
  }
  return [...references].sort()
}

function cardRequiredExtensions(
  definition: MoneyCardDefinition,
  collections: CollectionMetric[],
  validationOptions: FormulaValidationOptions,
): string[] {
  const requirements = new Set<string>()
  for (const formula of [
    definition.formula,
    definition.primaryFormula,
    ...Object.values(definition.secondaryFormulas ?? {}),
  ]) {
    if (!formula) continue
    for (const requirement of referencedExtensionRequirements(
      formula,
      collections,
      validationOptions,
    )) {
      requirements.add(requirement)
    }
  }
  return [...requirements].sort()
}

function cardTemplateCategory(
  definition: MoneyCardDefinition,
): CardTemplateCategory {
  const categoryById: Record<string, CardTemplateCategory> = {
    'net-worth': 'overview',
    'net-worth-trend': 'overview',
    'income-saved': 'cash-flow',
    'monthly-cash-flow': 'cash-flow',
    'transaction-activity': 'overview',
    'transaction-direction-mix': 'overview',
    'provider-category-mix': 'overview',
    'transfer-volume': 'cash-flow',
    'credit-card-payment-volume': 'cash-flow',
    'transfer-reasons': 'cash-flow',
    'money-flow-volume': 'cash-flow',
    'money-flow-fees': 'cash-flow',
    'monthly-spend': 'cash-flow',
    'spend-change-vs-last-month': 'cash-flow',
    'cash-flow-trend': 'cash-flow',
    'expense-trend': 'cash-flow',
    'active-subscriptions': 'recurring',
    'subscription-cost': 'recurring',
    'upcoming-subscriptions': 'recurring',
    'card-account-spend': 'credit-debt',
    'credit-utilization': 'credit-debt',
    'transaction-review-status': 'review',
    'spending-change-impact': 'forecasting',
    'debt-payoff-optimizer': 'credit-debt',
    'interest-drag': 'credit-debt',
    'high-apr-debts': 'credit-debt',
    investments: 'investing',
    'investment-allocation': 'investing',
    'investment-trend': 'investing',
    runway: 'forecasting',
    'recurring-spend-by-need': 'recurring',
    'savings-health': 'cash-flow',
    'upcoming-recurring-obligations': 'recurring',
    'tax-advantaged-contributions': 'tax',
    'income-sources': 'cash-flow',
    'joy-reviewed-spend': 'review',
    'shared-expense-reimbursements': 'sharing',
    'financial-independence-projection': 'forecasting',
    'expense-breakdown': 'cash-flow',
    'category-drift': 'cash-flow',
    'top-merchants': 'merchants',
    'monthly-merchant-spend': 'merchants',
    'largest-expenses': 'cash-flow',
  }
  return categoryById[definition.id] ?? 'overview'
}

function cardTemplateUseCases(
  definition: MoneyCardDefinition,
  references: string[],
): string[] {
  const useCases = new Set<string>()
  if (
    references.some((reference) =>
      ['Income', 'Expenses', 'CashFlow', 'Transfers', 'MoneyFlows'].includes(
        reference,
      ),
    )
  ) {
    useCases.add('cash-flow')
  }
  if (
    references.some((reference) =>
      ['Subscriptions', 'RecurringObligations'].includes(reference),
    )
  ) {
    useCases.add('recurring-review')
  }
  if (
    references.some((reference) => ['Debt', 'CardAccounts'].includes(reference))
  ) {
    useCases.add('debt-and-credit')
  }
  if (
    references.some((reference) =>
      ['Investments', 'TaxSheltered'].includes(reference),
    )
  ) {
    useCases.add('investing')
  }
  if (
    references.some((reference) =>
      ['JoyReview', 'ReviewActions'].includes(reference),
    )
  ) {
    useCases.add('review-workflow')
  }
  if (references.includes('SharedExpenses') || references.includes('Persons')) {
    useCases.add('shared-expenses')
  }
  if (definition.kind === 'forecast') {
    useCases.add('forecasting')
  }
  if (references.includes('Merchants')) {
    useCases.add('merchant-analysis')
  }
  return [...useCases].sort()
}

type CardDefinitionInput = z.infer<typeof cardDefinitionSchema> & {
  createdAt?: string
  updatedAt?: string
}

async function previewCardDefinition(
  c: Context,
  input: CardDefinitionInput,
): Promise<
  | {
      ok: true
      definition: MoneyCardDefinition
      card: ReturnType<typeof evaluateCards>[number]
      result: MaterializedMetric
    }
  | Extract<Awaited<ReturnType<typeof previewFormula>>, { ok: false }>
  | NonNullable<Awaited<ReturnType<typeof validateSecondaryFormulas>>>
  | ReturnType<typeof cardKindDiagnostics>
> {
  const formula = input.primaryFormula ?? input.formula
  if (!formula) {
    return {
      ok: false as const,
      error: {
        code: 'formula_diagnostics',
        message: 'formula or primaryFormula is required',
        diagnostics: [
          { message: 'formula or primaryFormula is required', range: null },
        ],
      },
    }
  }

  const preview = await previewFormula(
    c,
    formula,
    input.format,
    input.outputType,
  )
  if (!preview.ok) return preview
  const kindMismatch = cardKindOutputTypeMismatch(
    input.kind,
    preview.result.outputType,
  )
  if (kindMismatch) return cardKindDiagnostics(kindMismatch)
  const secondaryValidation = await validateSecondaryFormulas(
    c,
    input.secondaryFormulas,
  )
  if (secondaryValidation) return secondaryValidation

  const now = new Date().toISOString()
  const definition: MoneyCardDefinition = {
    ...input,
    id: input.id ?? slugify(input.title),
    formula,
    primaryFormula: formula,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  }
  const formulaData = await readVisibleFormulaData(c)
  const [card] = evaluateCards(formulaData, [definition])
  return { ok: true, definition, card, result: preview.result }
}

async function testCardDefinitions(c: Context, inputs: CardDefinitionInput[]) {
  const testedAt = new Date().toISOString()
  const formulaData = await readVisibleFormulaData(c)
  const cards = []

  for (const [index, input] of inputs.entries()) {
    const preview = await previewCardDefinition(c, input)
    if (preview.ok) {
      cards.push({
        index,
        ok: true as const,
        definition: preview.definition,
        card: preview.card,
        result: preview.result,
        drilldown: buildCardFormulaDrilldownPreview(
          formulaData,
          preview.definition.primaryFormula ?? preview.definition.formula,
        ),
        secondaryDrilldowns: buildCardSecondaryDrilldownPreviews(
          formulaData,
          preview.definition.secondaryFormulas,
        ),
        repairHints: [],
      })
      continue
    }

    cards.push({
      index,
      ok: false as const,
      input,
      error: preview.error,
      repairHints: repairHintsForCardError(preview.error, input),
      repairActions: repairActionsForCardError(preview.error, input),
    })
  }

  const failed = cards.filter((card) => !card.ok).length
  return {
    ok: failed === 0,
    testedAt,
    total: cards.length,
    passed: cards.length - failed,
    failed,
    cards,
    nextActions: cardTestNextActions(cards),
  }
}

function buildCardFormulaDrilldownPreview(
  formulaData: MoneyFormulaData,
  formula: string,
  formulaKey?: string,
) {
  const formulaDrilldown = safeEvaluateFormulaTransactionRows(
    formula,
    formulaData,
  )
  const referenced = referencedCollectionsForFormula(formula)
  const availableCollections = uniqueStrings(
    referenced.filter((collection) =>
      isTransactionBackedCollection(collection, formulaData.extensionRegistry),
    ),
  )
  if (
    formulaDrilldown?.collection &&
    isTransactionBackedCollection(
      formulaDrilldown.collection,
      formulaData.extensionRegistry,
    ) &&
    !availableCollections.includes(formulaDrilldown.collection)
  ) {
    availableCollections.push(formulaDrilldown.collection)
  }

  const collection = formulaDrilldown?.collection ?? availableCollections[0]
  if (
    !collection ||
    !isTransactionBackedCollection(collection, formulaData.extensionRegistry)
  ) {
    return undefined
  }

  const useFormulaCandidates =
    formulaDrilldown?.formulaFiltered === true &&
    formulaDrilldown.collection === collection
  const candidates = useFormulaCandidates
    ? formulaDrilldown.transactions
    : transactionsForCollection(
        formulaData.transactions,
        collection,
        formulaData.extensionRegistry,
      )
  const page = searchTransactions(candidates, { limit: 5, offset: 0 })

  return {
    formulaKey,
    formula,
    collection,
    availableCollections,
    drilldownBasis: useFormulaCandidates ? 'formula' : 'collection',
    formulaFiltered: useFormulaCandidates,
    formulaUnsupportedReason: useFormulaCandidates
      ? undefined
      : formulaDrilldown?.unsupportedReason,
    transactions: page.transactions,
    total: page.total,
    limit: page.limit,
    offset: page.offset,
    hasMore: page.hasMore,
    nextOffset: page.nextOffset,
    nextCursor: page.nextCursor,
  }
}

function buildCardSecondaryDrilldownPreviews(
  formulaData: MoneyFormulaData,
  secondaryFormulas: Record<string, string> | undefined,
) {
  if (!secondaryFormulas) return undefined
  const drilldowns = Object.fromEntries(
    Object.entries(secondaryFormulas)
      .map(([formulaKey, formula]) => [
        formulaKey,
        buildCardFormulaDrilldownPreview(formulaData, formula, formulaKey),
      ])
      .filter(
        (
          entry,
        ): entry is [
          string,
          NonNullable<ReturnType<typeof buildCardFormulaDrilldownPreview>>,
        ] => Boolean(entry[1]),
      ),
  )
  return Object.keys(drilldowns).length > 0 ? drilldowns : undefined
}

type CardTestError = {
  code: string
  message: string
  formulaKey?: string
  diagnostics?: Array<{ message: string; range?: unknown }>
}

type CardRepairAction = {
  action: string
  reason: string
  rpc: string
  params: Record<string, unknown>
  formulaKey?: string
}

function cardRepairPayload(
  preview: { ok: false; error: CardTestError },
  input: CardDefinitionInput,
) {
  return {
    ...preview,
    repairHints: repairHintsForCardError(preview.error, input),
    repairActions: repairActionsForCardError(preview.error, input),
  }
}

function repairHintsForCardError(
  error: CardTestError,
  input: CardDefinitionInput,
) {
  const hints = [
    'Call money.formulas.complete at the diagnostic cursor to discover valid collections, methods, fields, and enum values.',
    'Call money.formulas.preview on the primary formula after each edit before saving the card.',
  ]

  if (error.code === 'card_kind_diagnostics') {
    hints.push(
      'Change the card kind to match the evaluated output type, or change the formula so it returns the shape expected by the current kind.',
    )
  }

  if (error.code === 'secondary_formula_diagnostics') {
    hints.push(
      `Fix or remove secondary formula "${error.formulaKey ?? 'unknown'}"; secondary formulas must preview successfully before the card can be saved.`,
    )
  }

  const messages = (error.diagnostics ?? []).map(
    (diagnostic) => diagnostic.message,
  )
  if (messages.some((message) => /Unknown collection/i.test(message))) {
    hints.push(
      'Use money.formulas.schema or money.formulas.complete at expression start to choose an installed semantic or extension-backed collection.',
    )
  }
  if (messages.some((message) => /Unknown field/i.test(message))) {
    hints.push(
      'Use money.formulas.complete inside Where, GroupBy, Sort, Unique, Top, Bottom, MinBy, or MaxBy arguments to choose a field valid for that collection.',
    )
  }
  if (
    messages.some((message) =>
      /Expected .* output|formula returned/i.test(message),
    )
  ) {
    hints.push(
      `Adjust outputType (${input.outputType ?? 'not set'}) to the evaluated result shape or change the formula to produce the requested output.`,
    )
  }

  return [...new Set(hints)]
}

function repairActionsForCardError(
  error: CardTestError,
  input: CardDefinitionInput,
): CardRepairAction[] {
  const formulaKey = error.formulaKey ?? 'primaryFormula'
  const formula =
    error.formulaKey && input.secondaryFormulas?.[error.formulaKey]
      ? input.secondaryFormulas[error.formulaKey]
      : (input.primaryFormula ?? input.formula ?? '')
  const cursor = diagnosticCursor(error, formula)
  const actions: CardRepairAction[] = []

  if (
    formula &&
    (error.code === 'formula_diagnostics' ||
      error.code === 'secondary_formula_diagnostics')
  ) {
    actions.push({
      action: 'complete-formula',
      reason:
        'Ask the formula engine for valid completions at the diagnostic cursor.',
      rpc: 'money.formulas.complete',
      params: { formula, cursor },
      formulaKey,
    })
  }

  if (formula) {
    actions.push({
      action: 'preview-formula',
      reason:
        'Evaluate the current formula shape before editing or saving the card.',
      rpc: 'money.formulas.preview',
      params: {
        formula,
        format: input.format,
        outputType: input.outputType,
      },
      formulaKey,
    })
  }

  actions.push({
    action: 'preview-card',
    reason:
      'Re-run card validation after editing formula, kind, format, outputType, or secondary formulas.',
    rpc: 'money.cards.preview',
    params: { ...input },
  })

  actions.push({
    action: 'test-card',
    reason: 'Batch-test the edited card before saving it.',
    rpc: 'money.cards.test',
    params: { cards: [input] },
  })

  return actions
}

function diagnosticCursor(error: CardTestError, formula: string): number {
  const firstRange = error.diagnostics?.find(
    (diagnostic) => diagnostic.range,
  )?.range
  if (
    firstRange &&
    typeof firstRange === 'object' &&
    'start' in firstRange &&
    firstRange.start &&
    typeof firstRange.start === 'object' &&
    'offset' in firstRange.start &&
    typeof firstRange.start.offset === 'number' &&
    Number.isFinite(firstRange.start.offset)
  ) {
    return Math.max(0, Math.min(formula.length, firstRange.start.offset))
  }
  return formula.length
}

function cardTestNextActions(
  cards: Array<{ ok: boolean; repairActions?: CardRepairAction[] }>,
) {
  const actions = cards
    .filter((card) => !card.ok)
    .flatMap((card) => card.repairActions ?? [])
  const seen = new Set<string>()
  return actions.filter((action) => {
    const key = `${action.action}:${action.rpc}:${JSON.stringify(action.params)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function saveCardDefinition(c: Context, input: CardDefinitionInput) {
  const existing = await readCardDefinitions(c, DEFAULT_CARD_DEFINITIONS)
  const id = input.id ?? slugify(input.title)
  const previous = existing.find((card) => card.id === id)
  const preview = await previewCardDefinition(c, {
    ...input,
    id,
    createdAt: previous?.createdAt ?? input.createdAt,
  })
  if (!preview.ok) return preview

  const definition: MoneyCardDefinition = {
    ...preview.definition,
    createdAt: previous?.createdAt ?? preview.definition.createdAt,
    updatedAt: new Date().toISOString(),
  }
  await writeCardDefinitions(c, upsertById(existing, [definition]))
  const formulaData = await readVisibleFormulaData(c)
  const [card] = evaluateCards(formulaData, [definition])
  const result: MaterializedMetric = {
    ...preview.result,
    value: card.value,
    displayValue: card.displayValue,
    id: `card-${definition.id}`,
    cardId: definition.id,
  }
  await writeMaterializedMetric(c, result)
  await refreshCardsProjection(c)

  return { ok: true as const, definition, card, result }
}

async function refreshCardDefinition(
  c: Context,
  definition: MoneyCardDefinition,
) {
  const preview = await previewFormula(
    c,
    definition.formula,
    definition.format,
    definition.outputType,
  )
  if (!preview.ok) return preview
  const formulaData = await readVisibleFormulaData(c)
  const [card] = evaluateCards(formulaData, [definition])
  const result: MaterializedMetric = {
    ...preview.result,
    value: card.value,
    displayValue: card.displayValue,
    id: `card-${definition.id}`,
    cardId: definition.id,
  }
  await writeMaterializedMetric(c, result)
  return { ok: true as const, definition, card, result }
}

async function validateSecondaryFormulas(
  c: Context,
  secondaryFormulas: Record<string, string> | undefined,
): Promise<{
  ok: false
  error: {
    code: 'secondary_formula_diagnostics'
    message: string
    formulaKey: string
    diagnostics: ReturnType<typeof diagnoseFormula>
  }
} | null> {
  if (!secondaryFormulas) return null

  for (const [formulaKey, formula] of Object.entries(secondaryFormulas)) {
    const preview = await previewFormula(c, formula, 'number')
    if (preview.ok) continue
    return {
      ok: false,
      error: {
        code: 'secondary_formula_diagnostics',
        message: `Secondary formula "${formulaKey}" is invalid: ${preview.error.message}`,
        formulaKey,
        diagnostics: preview.error.diagnostics,
      },
    }
  }

  return null
}

async function previewFormula(
  c: Context,
  formula: string,
  format: MoneyCardDefinition['format'],
  outputType?: MaterializedMetric['outputType'],
): Promise<
  | { ok: true; result: MaterializedMetric; collections: CollectionMetric[] }
  | {
      ok: false
      error: {
        code: 'formula_diagnostics'
        message: string
        diagnostics: ReturnType<typeof diagnoseFormula>
      }
    }
> {
  const [formulaData, collectionDefinitions] = await Promise.all([
    readVisibleFormulaData(c),
    readCollectionDefinitions(c, DEFAULT_COLLECTION_DEFINITIONS),
  ])
  const collections = buildCollections(formulaData)
  const validationOptions = {
    collectionDefinitions,
    entities: FORMULA_ENTITY_SCHEMAS,
    extensionRegistry: formulaData.extensionRegistry,
  }
  const validationDiagnostics = diagnoseFormula(
    formula,
    collections,
    validationOptions,
  )
  if (validationDiagnostics.length > 0) {
    const message = validationDiagnostics
      .map((diagnostic) => diagnostic.message)
      .join('; ')
    return {
      ok: false,
      error: {
        code: 'formula_diagnostics',
        message,
        diagnostics: validationDiagnostics,
      },
    }
  }
  try {
    const ast = parseFormula(formula, collections)
    const warehouseValue = await evaluateFormulaFromWarehouse(c, formula)
    const value =
      warehouseValue?.value ??
      evaluateFormulaValue(formula, collections, formulaData)
    const outputTypeMismatch = formulaOutputTypeMismatch(value, outputType)
    if (outputTypeMismatch) {
      return {
        ok: false,
        error: {
          code: 'formula_diagnostics',
          message: outputTypeMismatch,
          diagnostics: [{ message: outputTypeMismatch, range: null }],
        },
      }
    }
    const result: MaterializedMetric = {
      id: `preview-${slugify(formula).slice(0, 48) || 'formula'}`,
      formula,
      value,
      displayValue: formatValue(
        value,
        format,
        formulaData.settings?.currency.reportingCurrency,
      ),
      outputType: outputType ?? inferFormulaOutputType(value, format),
      referencedCollections: [...referencedCollections(ast)],
      generatedAt: new Date().toISOString(),
      ...(warehouseValue
        ? {
            execution: {
              source: 'aggregate',
              artifact: 'aggregates/monthly/current.json',
              generatedAt: warehouseValue.generatedAt,
              stale: warehouseValue.stale,
            },
          }
        : {}),
    }
    return { ok: true, result, collections }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Formula validation failed'
    const diagnostics = diagnoseFormula(formula, collections, validationOptions)
    return {
      ok: false,
      error: {
        code: 'formula_diagnostics',
        message,
        diagnostics:
          diagnostics.length > 0 ? diagnostics : [{ message, range: null }],
      },
    }
  }
}

async function refreshMaterializedMetrics(
  c: Context,
  dirtyCollections?: Iterable<string>,
  options: {
    markWarehouseDirty?: boolean
    refreshCardsProjection?: boolean
  } = {},
): Promise<number> {
  invalidateMoneyReadCache(c, {
    ...warehouseDirtyForCollections(dirtyCollections),
    markWarehouseDirty: options.markWarehouseDirty,
    reason: 'materialized-metrics-refresh',
  })
  const [formulaDefinitions, cardDefinitions] = await Promise.all([
    readFormulaDefinitions(c),
    readCardDefinitions(c, DEFAULT_CARD_DEFINITIONS),
  ])
  const dirty = dirtyCollections ? new Set(dirtyCollections) : null
  const formulaData = await readVisibleFormulaData(c)
  const collections = buildCollections(formulaData)
  let refreshed = 0

  for (const definition of formulaDefinitions) {
    if (
      !shouldRefreshMaterializedFormula(definition.referencedCollections, dirty)
    ) {
      continue
    }
    const preview = await previewFormula(
      c,
      definition.formula,
      definition.format,
      definition.outputType,
    )
    if (!preview.ok) continue
    await writeMaterializedMetric(c, {
      ...preview.result,
      id: definition.id,
      formulaId: definition.id,
    })
    refreshed += 1
  }

  for (const definition of cardDefinitions) {
    const references = safeReferencedCollections(
      definition.formula,
      collections,
    )
    if (!shouldRefreshMaterializedFormula(references, dirty)) continue
    const preview = await previewFormula(
      c,
      definition.formula,
      definition.format,
      definition.outputType,
    )
    if (!preview.ok) continue
    const [card] = evaluateCards(formulaData, [definition])
    await writeMaterializedMetric(c, {
      ...preview.result,
      value: card.value,
      displayValue: card.displayValue,
      id: `card-${definition.id}`,
      cardId: definition.id,
    })
    refreshed += 1
  }

  if (options.refreshCardsProjection ?? true) {
    await refreshCardsProjection(c)
  }

  return refreshed
}

function shouldRefreshMaterializedFormula(
  referenced: Iterable<string>,
  dirty: Set<string> | null,
): boolean {
  if (!dirty) return true
  for (const collection of referenced) {
    if (dirty.has(collection)) return true
  }
  return false
}

function warehouseDirtyForCollections(dirtyCollections?: Iterable<string>): {
  scope: string
} {
  if (!dirtyCollections) return { scope: 'all' }
  const dirty = new Set(dirtyCollections)
  if (
    [...TRANSACTION_FACT_COLLECTIONS].some((collection) =>
      dirty.has(collection),
    )
  ) {
    return { scope: 'transactions' }
  }
  if (
    [...ACCOUNT_FACT_COLLECTIONS].some((collection) => dirty.has(collection))
  ) {
    return { scope: 'accounts' }
  }
  if (
    [...BALANCE_SNAPSHOT_COLLECTIONS].some((collection) =>
      dirty.has(collection),
    )
  ) {
    return { scope: 'balance-snapshots' }
  }
  return { scope: 'all' }
}

async function cachedReadResponse<T>(
  c: Context,
  name: string,
  read: () => Promise<T>,
): Promise<T> {
  const key = readResponseCacheKey(c, name)
  const now = Date.now()
  const cached = readResponseCache.get(key)
  if (cached && cached.expiresAt > now) return cached.value as T
  const value = await read()
  readResponseCache.set(key, { value, expiresAt: now + READ_CACHE_TTL_MS })
  return value
}

function invalidateMoneyReadCache(
  c?: Context,
  options: {
    markWarehouseDirty?: boolean
    reason?: string
    scope?: string
    partition?: string
  } = {},
): void {
  if (!c) {
    readResponseCache.clear()
    return
  }
  const prefix = `${getWorkspaceId(c) ?? 'default'}:`
  for (const key of readResponseCache.keys()) {
    if (key.startsWith(prefix)) readResponseCache.delete(key)
  }
  if (options.markWarehouseDirty ?? true) {
    void markWarehouseDirty(c, {
      scope: options.scope ?? 'all',
      partition: options.partition,
      reason: options.reason ?? 'app-data-mutated',
    }).catch(() => {
      // Dirty status is advisory; writes should not fail because status could not be updated.
    })
  }
}

function readResponseCacheKey(c: Context, name: string): string {
  const url = new URL(c.req.url)
  return `${getWorkspaceId(c) ?? 'default'}:${getDataDir(c)}:${name}:${url.pathname}${url.search}`
}

type ManualAccountInput = z.infer<typeof manualAccountCreateSchema> &
  Partial<Pick<MoneyAccount, 'id' | 'source' | 'updatedAt'>>

function buildManualAccount(input: ManualAccountInput): MoneyAccount {
  const now = new Date().toISOString()
  const slug = slugify(input.id ?? input.name)
  const id = slug.startsWith('manual-account-')
    ? slug
    : `manual-account-${slug}`
  const asOf = input.asOf ?? now
  return {
    id,
    source: 'manual',
    name: input.name,
    officialName: input.officialName,
    institutionName: input.institutionName,
    type: input.type,
    subtype: input.subtype,
    mask: input.mask,
    currentBalance: input.currentBalance,
    isoCurrencyCode: input.isoCurrencyCode,
    currencyCode: input.currencyCode ?? input.isoCurrencyCode,
    asOf,
    valueForSum: input.valueForSum ?? input.currentBalance,
    creditLimit: input.creditLimit,
    availableCredit: input.availableCredit,
    utilization: input.utilization,
    investmentAccountKind: input.investmentAccountKind,
    taxTreatment: input.taxTreatment,
    liquidityTier: input.liquidityTier,
    liquidity: input.liquidity,
    liquidityClass: input.liquidityClass,
    contributionLimitAnnual: input.contributionLimitAnnual,
    contributionLimitYear: input.contributionLimitYear,
    isAsset: input.isAsset,
    isLiability: input.isLiability,
    updatedAt: now,
  }
}

async function writeAccountSetAndRefresh(
  c: Context,
  accounts: MoneyAccount[],
): Promise<number> {
  await writeAccounts(c, accounts)
  const [transactions, holdings] = await Promise.all([
    readTransactions(c),
    readHoldings(c),
  ])
  await upsertBalanceSnapshots(
    c,
    deriveBalanceSnapshots({ accounts, transactions }, holdings),
  )
  const dirty = new Set<string>()
  addDirtyCollections(dirty, ACCOUNT_FACT_COLLECTIONS)
  addDirtyCollections(dirty, BALANCE_SNAPSHOT_COLLECTIONS)
  return refreshMaterializedMetrics(c, dirty)
}

function safeReferencedCollections(
  formula: string,
  collections: CollectionMetric[],
): Set<string> {
  try {
    return referencedCollections(parseFormula(formula, collections))
  } catch {
    return new Set()
  }
}

function dirtyCollectionsForRawData(data: RawMoneyData): Set<string> {
  const dirty = new Set<string>()
  if (data.accounts.length) {
    addDirtyCollections(dirty, ACCOUNT_FACT_COLLECTIONS)
    addDirtyCollections(dirty, BALANCE_SNAPSHOT_COLLECTIONS)
  }
  if (data.transactions.length) {
    addDirtyCollections(dirty, TRANSACTION_FACT_COLLECTIONS)
  }
  return dirty
}

function addDirtyCollections(
  dirty: Set<string>,
  collections: readonly string[],
): void {
  for (const collection of collections) dirty.add(collection)
}

function defaultDashboard(
  cardIds: string[],
  id = 'overview',
  order = 0,
): MoneyDashboard {
  const now = new Date().toISOString()
  return {
    id,
    name: id === 'overview' ? 'Overview' : titleFromId(id),
    cardIds,
    order,
    createdAt: now,
    updatedAt: now,
  }
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  )
}

function titleFromId(id: string): string {
  return id
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function transactionFiltersFromQuery(
  query: Record<string, string>,
): TransactionSearchFilters {
  return {
    q: stringParam(query.q),
    accountId: stringParam(query.accountId),
    direction: directionParam(query.direction),
    category: stringParam(query.category),
    currencyCode: stringParam(query.currencyCode),
    minAmount: numberParam(query.minAmount),
    maxAmount: numberParam(query.maxAmount),
    startDate: stringParam(query.startDate),
    endDate: stringParam(query.endDate),
    limit: numberParam(query.limit),
    offset: numberParam(query.offset),
    cursor: stringParam(query.cursor),
  }
}

function transactionFiltersFromParams(
  params: Record<string, unknown>,
): TransactionSearchFilters {
  return {
    q: typeof params.q === 'string' ? params.q : undefined,
    accountId:
      typeof params.accountId === 'string' ? params.accountId : undefined,
    direction:
      typeof params.direction === 'string'
        ? directionParam(params.direction)
        : undefined,
    category: typeof params.category === 'string' ? params.category : undefined,
    currencyCode:
      typeof params.currencyCode === 'string' ? params.currencyCode : undefined,
    minAmount: numberParamFromUnknown(params.minAmount),
    maxAmount: numberParamFromUnknown(params.maxAmount),
    startDate:
      typeof params.startDate === 'string' ? params.startDate : undefined,
    endDate: typeof params.endDate === 'string' ? params.endDate : undefined,
    limit: typeof params.limit === 'number' ? params.limit : undefined,
    offset: typeof params.offset === 'number' ? params.offset : undefined,
    cursor: typeof params.cursor === 'string' ? params.cursor : undefined,
  }
}

function stringParam(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function numberParam(value: string | undefined) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function numberParamFromUnknown(value: unknown) {
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : undefined
  if (typeof value !== 'string') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function directionParam(
  value: string | undefined,
): TransactionDirection | undefined {
  return value === 'income' || value === 'expense' || value === 'transfer'
    ? value
    : undefined
}

type TransactionLabelRequest = z.infer<typeof transactionLabelRequestSchema>
type TransactionLabelSelector = TransactionLabelRequest['selector']
type TransactionLabelRuleCreateRequest = z.infer<
  typeof transactionLabelRuleCreateRequestSchema
>
type TransactionLabelRuleMatchInput = z.infer<
  typeof transactionLabelRuleMatchSchema
>
type TransactionClassificationRequest = z.infer<
  typeof transactionClassificationRequestSchema
>
type TransactionClassificationProposal = z.infer<
  typeof transactionClassificationProposalSchema
>
type TransactionExtensionDefinition =
  MoneyExtensionRegistry['extensions'][number]
type RecommendationQuery = z.infer<typeof recommendationQuerySchema>
type RecommendationGroupQuery = z.infer<typeof recommendationGroupQuerySchema>
type RecommendationBulkPatch = z.infer<typeof recommendationBulkPatchSchema>
type GenericExtensionValueKey = z.infer<typeof genericExtensionValueKeySchema>
type GenericExtensionValuePatch = z.infer<
  typeof genericExtensionValuePatchSchema
>

type TransactionExtensionReviewAfter = {
  affectedTransactionIds: string[]
  namespaces: Array<{
    namespace: string
    affectedTransactionIds: string[]
    labeledTotal: number
    missingNamespaceTotal: number
    pendingProposalTotal: number
    affectedStillMissing: number
    affectedPendingProposalTotal: number
  }>
}

async function patchGenericExtensionValue(
  c: Context,
  key: GenericExtensionValueKey,
  patch: GenericExtensionValuePatch,
): Promise<
  | {
      ok: true
      extension: MoneyExtensionValue
      total: number
      counts: Record<string, Record<string, number>>
      reviewAfter?: TransactionExtensionReviewAfter
      refreshedMetrics: number
    }
  | {
      ok: false
      status: 400 | 404
      error: {
        code: 'extension_value_not_found' | 'invalid_extension_values'
        message: string
        issues?: string[]
      }
    }
> {
  const existing = (
    await readExtensionValues(c, {
      entity: key.entity,
      namespace: key.namespace,
      entityId: key.entityId,
    })
  )[0]

  if (!existing) {
    return {
      ok: false,
      status: 404,
      error: {
        code: 'extension_value_not_found',
        message: `Extension value not found: ${key.entity}/${key.namespace}/${key.entityId}`,
      },
    }
  }

  const extension: MoneyExtensionValue = {
    ...existing,
    values: patch.replaceValues
      ? { ...(patch.values ?? {}) }
      : { ...existing.values, ...(patch.values ?? {}) },
    source: patch.source ?? existing.source,
    confidence:
      patch.confidence === null
        ? undefined
        : patch.confidence === undefined
          ? existing.confidence
          : patch.confidence,
    updatedAt: patch.updatedAt ?? new Date().toISOString(),
  }
  const validation = validateExtensionValues(
    [extension],
    await readExtensionRegistry(c),
  )
  if (validation.length > 0) {
    return {
      ok: false,
      status: 400,
      error: {
        code: 'invalid_extension_values',
        message: validation.join('\n'),
        issues: validation,
      },
    }
  }

  let next = await upsertExtensionValues(c, [extension])
  if (
    extension.entity === 'transaction' &&
    extension.namespace === 'merchantGroup'
  ) {
    next = await refreshDerivedTransactionExtensions(c)
  }
  const refreshedMetrics = await refreshMaterializedMetrics(c)
  return {
    ok: true,
    extension,
    total: next.length,
    counts: genericExtensionCounts(next),
    reviewAfter: await buildTransactionExtensionReviewAfter(c, {
      extensions: [extension],
    }),
    refreshedMetrics,
  }
}

async function deleteGenericExtensionValue(
  c: Context,
  key: GenericExtensionValueKey,
): Promise<
  | {
      ok: true
      deleted: MoneyExtensionValue
      total: number
      counts: Record<string, Record<string, number>>
      reviewAfter?: TransactionExtensionReviewAfter
      refreshedMetrics: number
    }
  | {
      ok: false
      status: 404
      error: {
        code: 'extension_value_not_found'
        message: string
      }
    }
> {
  const result = await deleteExtensionValue(c, key)
  if (!result.deleted) {
    return {
      ok: false,
      status: 404,
      error: {
        code: 'extension_value_not_found',
        message: `Extension value not found: ${key.entity}/${key.namespace}/${key.entityId}`,
      },
    }
  }

  let next = result.extensions
  if (
    result.deleted.entity === 'transaction' &&
    result.deleted.namespace === 'merchantGroup'
  ) {
    next = await refreshDerivedTransactionExtensions(c)
  }
  const refreshedMetrics = await refreshMaterializedMetrics(c)
  return {
    ok: true,
    deleted: result.deleted,
    total: next.length,
    counts: genericExtensionCounts(next),
    reviewAfter: await buildTransactionExtensionReviewAfter(c, {
      extensions: [result.deleted],
    }),
    refreshedMetrics,
  }
}

async function acceptExtensionProposal(
  c: Context,
  id: string,
  reason?: string,
): Promise<
  | {
      ok: true
      proposal: MoneyExtensionProposal
      extension: MoneyExtensionValue
      counts: Record<string, Record<string, number>>
      proposalCounts: Record<string, Record<string, number>>
      reviewAfter?: TransactionExtensionReviewAfter
      refreshedMetrics: number
    }
  | {
      ok: false
      status: 400 | 404
      error: {
        code: 'extension_proposal_not_found' | 'invalid_extension_values'
        message: string
        issues?: string[]
      }
    }
> {
  const proposals = await readExtensionProposals(c)
  const existing = proposals.find((proposal) => proposal.id === id)
  if (!existing) {
    return {
      ok: false,
      status: 404,
      error: {
        code: 'extension_proposal_not_found',
        message: `Extension proposal not found: ${id}`,
      },
    }
  }

  const now = new Date().toISOString()
  const extension: MoneyExtensionValue = {
    entity: existing.entity,
    entityId: existing.entityId,
    namespace: existing.namespace,
    values: { ...existing.values },
    source: existing.source,
    confidence: existing.confidence,
    updatedAt: now,
  }
  const validation = validateExtensionValues(
    [extension],
    await readExtensionRegistry(c),
  )
  if (validation.length > 0) {
    return {
      ok: false,
      status: 400,
      error: {
        code: 'invalid_extension_values',
        message: validation.join('\n'),
        issues: validation,
      },
    }
  }

  const proposal: MoneyExtensionProposal = {
    ...existing,
    status: 'accepted',
    updatedAt: now,
    decidedAt: now,
    decisionReason: reason,
  }
  const proposalSet = await upsertExtensionProposals(c, [proposal])
  let next = await upsertExtensionValues(c, [extension])
  if (
    extension.entity === 'transaction' &&
    extension.namespace === 'merchantGroup'
  ) {
    next = await refreshDerivedTransactionExtensions(c)
  }
  const refreshedMetrics = await refreshMaterializedMetrics(c)
  return {
    ok: true,
    proposal,
    extension,
    counts: genericExtensionCounts(next),
    proposalCounts: extensionProposalCounts(proposalSet),
    reviewAfter: await buildTransactionExtensionReviewAfter(c, {
      extensions: [extension],
      proposals: [proposal],
    }),
    refreshedMetrics,
  }
}

type ExtensionProposalBatchDecision = z.infer<
  typeof extensionProposalBatchDecisionSchema
>

async function decideExtensionProposals(
  c: Context,
  request: ExtensionProposalBatchDecision,
): Promise<
  | {
      ok: true
      action: 'accept' | 'reject' | 'correct'
      dryRun: boolean
      matched: {
        total: number
        selected: number
        limit: number
        hasMore: boolean
      }
      proposals: MoneyExtensionProposal[]
      extensions?: MoneyExtensionValue[]
      counts?: Record<string, Record<string, number>>
      proposalCounts: Record<string, Record<string, number>>
      reviewAfter?: TransactionExtensionReviewAfter
      refreshedMetrics?: number
      taughtRule?: MoneyTransactionLabelRule
    }
  | {
      ok: false
      status: 400
      error: {
        code: string
        message: string
        issues?: string[]
      }
    }
> {
  const proposals = await readExtensionProposals(c)
  const ids = request.ids?.length ? new Set(request.ids) : undefined
  const matched = proposals.filter((proposal) => {
    if (ids && !ids.has(proposal.id)) return false
    if (!ids && proposal.status !== request.status) return false
    if (ids && request.status && proposal.status !== request.status)
      return false
    if (request.entity && proposal.entity !== request.entity) return false
    if (request.namespace && proposal.namespace !== request.namespace)
      return false
    if (request.entityId && proposal.entityId !== request.entityId) return false
    if (request.batchId && proposal.batchId !== request.batchId) return false
    if (request.model && proposal.model !== request.model) return false
    if (
      request.minConfidence !== undefined &&
      (proposal.confidence ?? 0) < request.minConfidence
    ) {
      return false
    }
    if (
      request.maxConfidence !== undefined &&
      (proposal.confidence ?? 0) > request.maxConfidence
    ) {
      return false
    }
    return true
  })
  const selected = matched.slice(0, request.limit)
  const now = new Date().toISOString()
  const decided = selected.map((proposal) => ({
    ...proposal,
    status:
      request.action === 'accept'
        ? ('accepted' as const)
        : ('rejected' as const),
    updatedAt: now,
    decidedAt: now,
    decisionReason: request.reason,
  }))

  if (request.action === 'reject') {
    if (request.dryRun) {
      return {
        ok: true,
        action: request.action,
        dryRun: true,
        matched: proposalDecisionMatchedSummary(
          matched,
          selected,
          request.limit,
        ),
        proposals: decided,
        proposalCounts: extensionProposalCounts(proposals),
      }
    }
    const proposalSet = await upsertExtensionProposals(c, decided)
    return {
      ok: true,
      action: request.action,
      dryRun: false,
      matched: proposalDecisionMatchedSummary(matched, selected, request.limit),
      proposals: decided,
      proposalCounts: extensionProposalCounts(proposalSet),
      reviewAfter: await buildTransactionExtensionReviewAfter(c, {
        proposals: decided,
      }),
    }
  }

  if (request.action === 'correct') {
    const values = request.values ?? {}
    const correctedExtensions: MoneyExtensionValue[] = selected.map(
      (proposal) => ({
        entity: proposal.entity,
        entityId: proposal.entityId,
        namespace: request.correctedNamespace ?? proposal.namespace,
        values: { ...values },
        source: request.source,
        confidence: request.confidence ?? proposal.confidence,
        updatedAt: now,
      }),
    )
    const validation = validateExtensionValues(
      correctedExtensions,
      await readExtensionRegistry(c),
    )
    if (validation.length > 0) {
      return {
        ok: false,
        status: 400,
        error: {
          code: 'invalid_extension_values',
          message: validation.join('\n'),
          issues: validation,
        },
      }
    }

    if (request.dryRun) {
      return {
        ok: true,
        action: request.action,
        dryRun: true,
        matched: proposalDecisionMatchedSummary(
          matched,
          selected,
          request.limit,
        ),
        proposals: decided,
        extensions: correctedExtensions,
        proposalCounts: extensionProposalCounts(proposals),
      }
    }

    const proposalSet = await upsertExtensionProposals(c, decided)
    let next = await upsertExtensionValues(c, correctedExtensions)
    if (
      correctedExtensions.some(
        (extension) =>
          extension.entity === 'transaction' &&
          extension.namespace === 'merchantGroup',
      )
    ) {
      next = await refreshDerivedTransactionExtensions(c)
    }
    let taughtRule: MoneyTransactionLabelRule | undefined
    if (request.teachRule && correctedExtensions.length > 0) {
      const ruleRequest =
        await transactionLabelRuleRequestFromProposalCorrection(
          c,
          request,
          selected,
          correctedExtensions,
        )
      if (!ruleRequest.ok) return ruleRequest
      const ruleResult = await createTransactionLabelRule(c, {
        ...ruleRequest.request,
        applyExisting: false,
      })
      if (!ruleResult.ok) {
        return {
          ok: false,
          status: 400,
          error: ruleResult.error,
        }
      }
      taughtRule = ruleResult.rule
      next = await refreshDerivedTransactionExtensions(c)
    }
    const refreshedMetrics = await refreshMaterializedMetrics(c)
    return {
      ok: true,
      action: request.action,
      dryRun: false,
      matched: proposalDecisionMatchedSummary(matched, selected, request.limit),
      proposals: decided,
      extensions: correctedExtensions,
      counts: genericExtensionCounts(next),
      proposalCounts: extensionProposalCounts(proposalSet),
      reviewAfter: await buildTransactionExtensionReviewAfter(c, {
        extensions: correctedExtensions,
        proposals: decided,
      }),
      refreshedMetrics,
      taughtRule,
    }
  }

  const extensions: MoneyExtensionValue[] = selected.map((proposal) => ({
    entity: proposal.entity,
    entityId: proposal.entityId,
    namespace: proposal.namespace,
    values: { ...proposal.values },
    source: proposal.source,
    confidence: proposal.confidence,
    updatedAt: now,
  }))
  const validation = validateExtensionValues(
    extensions,
    await readExtensionRegistry(c),
  )
  if (validation.length > 0) {
    return {
      ok: false,
      status: 400,
      error: {
        code: 'invalid_extension_values',
        message: validation.join('\n'),
        issues: validation,
      },
    }
  }

  if (request.dryRun) {
    return {
      ok: true,
      action: request.action,
      dryRun: true,
      matched: proposalDecisionMatchedSummary(matched, selected, request.limit),
      proposals: decided,
      extensions,
      proposalCounts: extensionProposalCounts(proposals),
    }
  }

  const proposalSet = await upsertExtensionProposals(c, decided)
  let next = await upsertExtensionValues(c, extensions)
  if (
    extensions.some(
      (extension) =>
        extension.entity === 'transaction' &&
        extension.namespace === 'merchantGroup',
    )
  ) {
    next = await refreshDerivedTransactionExtensions(c)
  }
  const refreshedMetrics = await refreshMaterializedMetrics(c)
  return {
    ok: true,
    action: request.action,
    dryRun: false,
    matched: proposalDecisionMatchedSummary(matched, selected, request.limit),
    proposals: decided,
    extensions,
    counts: genericExtensionCounts(next),
    proposalCounts: extensionProposalCounts(proposalSet),
    reviewAfter: await buildTransactionExtensionReviewAfter(c, {
      extensions,
      proposals: decided,
    }),
    refreshedMetrics,
  }
}

function proposalDecisionMatchedSummary(
  matched: MoneyExtensionProposal[],
  selected: MoneyExtensionProposal[],
  limit: number,
) {
  return {
    total: matched.length,
    selected: selected.length,
    limit,
    hasMore: matched.length > selected.length,
  }
}

async function rejectExtensionProposal(
  c: Context,
  id: string,
  reason?: string,
): Promise<
  | {
      ok: true
      proposal: MoneyExtensionProposal
      proposalCounts: Record<string, Record<string, number>>
      reviewAfter?: TransactionExtensionReviewAfter
    }
  | {
      ok: false
      status: 404
      error: {
        code: 'extension_proposal_not_found'
        message: string
      }
    }
> {
  const proposals = await readExtensionProposals(c)
  const existing = proposals.find((proposal) => proposal.id === id)
  if (!existing) {
    return {
      ok: false,
      status: 404,
      error: {
        code: 'extension_proposal_not_found',
        message: `Extension proposal not found: ${id}`,
      },
    }
  }

  const now = new Date().toISOString()
  const proposal: MoneyExtensionProposal = {
    ...existing,
    status: 'rejected',
    updatedAt: now,
    decidedAt: now,
    decisionReason: reason,
  }
  const proposalSet = await upsertExtensionProposals(c, [proposal])
  return {
    ok: true,
    proposal,
    proposalCounts: extensionProposalCounts(proposalSet),
    reviewAfter: await buildTransactionExtensionReviewAfter(c, {
      proposals: [proposal],
    }),
  }
}

async function createTransactionLabelRule(
  c: Context,
  request: TransactionLabelRuleCreateRequest,
): Promise<
  | {
      ok: true
      dryRun: boolean
      rule: MoneyTransactionLabelRule
      matched: ReturnType<typeof summarizeMatchedTransactions>
      rules: MoneyTransactionLabelRule[]
      counts: Record<string, Record<string, number>>
      refreshedMetrics?: number
    }
  | {
      ok: false
      error: {
        code: string
        message: string
        issues?: string[]
      }
    }
> {
  const now = new Date().toISOString()
  const match = transactionLabelRuleMatchFromRequest(request)
  if (!match) {
    return {
      ok: false,
      error: {
        code: 'invalid_transaction_label_rule_match',
        message:
          'A teachable rule needs a reusable merchant, pattern, category, account, direction, currency, amount, or date match.',
      },
    }
  }

  const namespace = request.namespace.trim()
  const rule: MoneyTransactionLabelRule = {
    id:
      request.id?.trim() ||
      slugify(`${namespace}-${request.scope}-${ruleMatchKey(match)}-${now}`),
    name: request.name?.trim(),
    scope: request.scope,
    status: request.status,
    namespace,
    values: { ...request.values },
    match,
    createdBy: request.createdBy,
    confidence: request.confidence,
    createdAt: now,
    updatedAt: now,
  }
  const validation = validateExtensionValues(
    [
      {
        entity: 'transaction',
        entityId: rule.id,
        namespace: rule.namespace,
        values: rule.values,
        source: 'rule',
        confidence: rule.confidence,
        updatedAt: now,
      },
    ],
    await readExtensionRegistry(c),
  )
  if (validation.length > 0) {
    return {
      ok: false,
      error: {
        code: 'invalid_extension_values',
        message: validation.join('\n'),
        issues: validation,
      },
    }
  }

  const transactions = (await readVisibleMoneyData(c)).transactions
  const selector = transactionLabelSelectorFromRuleMatch(match, rule.namespace)
  const matched = transactions.filter(createTransactionLabelMatcher(selector))
  const selected = matched.slice(0, selector.limit)
  const matchedSummary = summarizeMatchedTransactions(
    matched,
    selected,
    selector.limit,
  )

  const existing = await readTransactionLabelRules(c)
  const rules = [
    ...existing.filter((entry) => entry.id !== rule.id),
    rule,
  ].sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  )

  if (request.dryRun) {
    return {
      ok: true,
      dryRun: true,
      rule,
      matched: matchedSummary,
      rules,
      counts: transactionLabelRuleCounts(rules),
    }
  }

  await writeTransactionLabelRules(c, rules)
  let refreshedMetrics: number | undefined
  if (request.applyExisting) {
    await refreshDerivedTransactionExtensions(c)
    refreshedMetrics = await refreshMaterializedMetrics(
      c,
      TRANSACTION_FACT_COLLECTIONS,
    )
  }
  return {
    ok: true,
    dryRun: false,
    rule,
    matched: matchedSummary,
    rules,
    counts: transactionLabelRuleCounts(rules),
    refreshedMetrics,
  }
}

async function deleteTransactionLabelRule(
  c: Context,
  id: string,
): Promise<
  | {
      ok: true
      deleted: MoneyTransactionLabelRule
      rules: MoneyTransactionLabelRule[]
      counts: Record<string, Record<string, number>>
      refreshedMetrics: number
    }
  | {
      ok: false
      error: {
        code: 'transaction_label_rule_not_found'
        message: string
      }
    }
> {
  const normalizedId = slugify(id)
  const existing = await readTransactionLabelRules(c)
  const deleted = existing.find((rule) => rule.id === normalizedId)
  if (!deleted) {
    return {
      ok: false,
      error: {
        code: 'transaction_label_rule_not_found',
        message: `No transaction label rule found for id "${id}".`,
      },
    }
  }
  const rules = existing.filter((rule) => rule.id !== normalizedId)
  await writeTransactionLabelRules(c, rules)
  await refreshDerivedTransactionExtensions(c, [deleted.namespace])
  const refreshedMetrics = await refreshMaterializedMetrics(
    c,
    TRANSACTION_FACT_COLLECTIONS,
  )
  return {
    ok: true,
    deleted,
    rules,
    counts: transactionLabelRuleCounts(rules),
    refreshedMetrics,
  }
}

function transactionLabelRuleRequestFromLabelRequest(
  request: TransactionLabelRequest,
):
  | { ok: true; request: TransactionLabelRuleCreateRequest }
  | {
      ok: false
      error: {
        code: 'invalid_transaction_label_rule_match'
        message: string
      }
    } {
  const match = request.rule?.match
    ? normalizeTransactionLabelRuleMatchInput(request.rule.match)
    : transactionLabelRuleMatchFromSelector(request.selector)
  if (!match) {
    return {
      ok: false,
      error: {
        code: 'invalid_transaction_label_rule_match',
        message:
          'teachRule requires a reusable merchant, pattern, category, account, direction, currency, amount, or date selector.',
      },
    }
  }
  return {
    ok: true,
    request: {
      id: request.rule?.id,
      name: request.rule?.name,
      scope:
        request.rule?.scope ??
        (match.merchantIds?.length || match.merchantNames?.length
          ? 'merchant'
          : 'pattern'),
      match,
      namespace: request.namespace,
      values: request.values,
      createdBy: request.source === 'user' ? 'user' : 'agent',
      confidence: request.confidence,
      status: 'active',
      applyExisting: true,
      dryRun: false,
    },
  }
}

async function transactionLabelRuleRequestFromProposalCorrection(
  c: Context,
  request: ExtensionProposalBatchDecision,
  proposals: MoneyExtensionProposal[],
  extensions: MoneyExtensionValue[],
): Promise<
  | { ok: true; request: TransactionLabelRuleCreateRequest }
  | {
      ok: false
      status: 400
      error: {
        code: 'invalid_transaction_label_rule_match'
        message: string
      }
    }
> {
  const firstExtension = extensions[0]
  if (!firstExtension || firstExtension.entity !== 'transaction') {
    return {
      ok: false,
      status: 400,
      error: {
        code: 'invalid_transaction_label_rule_match',
        message:
          'Proposal correction teaching currently requires transaction proposals.',
      },
    }
  }
  const sharedNamespace = extensions.every(
    (extension) =>
      extension.entity === 'transaction' &&
      extension.namespace === firstExtension.namespace,
  )
  if (!sharedNamespace) {
    return {
      ok: false,
      status: 400,
      error: {
        code: 'invalid_transaction_label_rule_match',
        message:
          'Proposal correction teaching requires all corrected transaction labels to share one namespace.',
      },
    }
  }

  const explicitMatch = request.rule?.match
    ? normalizeTransactionLabelRuleMatchInput(request.rule.match)
    : null
  const match =
    explicitMatch ??
    (await transactionLabelRuleMatchFromProposalTransactions(c, proposals))
  if (!match) {
    return {
      ok: false,
      status: 400,
      error: {
        code: 'invalid_transaction_label_rule_match',
        message:
          'teachRule on proposal correction requires one merchant group or an explicit reusable rule.match.',
      },
    }
  }

  return {
    ok: true,
    request: {
      id: request.rule?.id,
      name: request.rule?.name,
      scope:
        request.rule?.scope ??
        (match.merchantIds?.length || match.merchantNames?.length
          ? 'merchant'
          : 'pattern'),
      match,
      namespace: firstExtension.namespace,
      values: firstExtension.values,
      createdBy: request.source === 'user' ? 'user' : 'agent',
      confidence: request.confidence ?? firstExtension.confidence,
      status: 'active',
      applyExisting: true,
      dryRun: false,
    },
  }
}

async function transactionLabelRuleMatchFromProposalTransactions(
  c: Context,
  proposals: MoneyExtensionProposal[],
): Promise<MoneyTransactionLabelRuleMatch | null> {
  const transactionProposalIds = proposals
    .filter((proposal) => proposal.entity === 'transaction')
    .map((proposal) => proposal.entityId)
  if (transactionProposalIds.length !== proposals.length) return null
  const proposalIdSet = new Set(transactionProposalIds)
  const transactions = (await readVisibleMoneyData(c)).transactions.filter(
    (transaction) => proposalIdSet.has(transaction.id),
  )
  if (transactions.length !== proposalIdSet.size) return null
  const merchantIds = [...new Set(transactions.map(transactionMerchantId))]
  if (merchantIds.length !== 1) return null
  const directions = [
    ...new Set(transactions.map((transaction) => transaction.direction)),
  ]
  return {
    merchantIds,
    direction: directions.length === 1 ? directions[0] : undefined,
  }
}

function transactionLabelRuleMatchFromRequest(
  request: TransactionLabelRuleCreateRequest,
): MoneyTransactionLabelRuleMatch | null {
  if (request.match)
    return normalizeTransactionLabelRuleMatchInput(request.match)
  return request.selector
    ? transactionLabelRuleMatchFromSelector(request.selector)
    : null
}

function transactionLabelRuleMatchFromSelector(
  selector: TransactionLabelSelector,
): MoneyTransactionLabelRuleMatch | null {
  return normalizeTransactionLabelRuleMatchInput({
    merchantIds: selector.merchantIds,
    merchantNames: selector.merchantNames,
    q: selector.q,
    textPattern: selector.textPattern,
    accountId: selector.accountId,
    direction: selector.direction,
    category: selector.category,
    currencyCode: selector.currencyCode,
    minAmount: selector.minAmount,
    maxAmount: selector.maxAmount,
    startDate: selector.startDate,
    endDate: selector.endDate,
  })
}

function normalizeTransactionLabelRuleMatchInput(
  input: TransactionLabelRuleMatchInput,
): MoneyTransactionLabelRuleMatch | null {
  const merchantIds = [
    ...(input.merchantId ? [input.merchantId] : []),
    ...(input.merchantIds ?? []),
  ]
    .map(slugify)
    .filter(Boolean)
  const merchantNames = [
    ...(input.merchantName ? [input.merchantName] : []),
    ...(input.merchantNames ?? []),
  ]
    .map((name) => name.trim())
    .filter(Boolean)
  const match: MoneyTransactionLabelRuleMatch = {}
  if (merchantIds.length > 0) match.merchantIds = [...new Set(merchantIds)]
  if (merchantNames.length > 0)
    match.merchantNames = [...new Set(merchantNames)]
  if (input.textPattern?.trim()) match.textPattern = input.textPattern.trim()
  if (input.q?.trim()) match.q = input.q.trim()
  if (input.accountId?.trim()) match.accountId = input.accountId.trim()
  if (input.direction) match.direction = input.direction
  if (input.category?.trim()) match.category = input.category.trim()
  if (input.currencyCode?.trim())
    match.currencyCode = input.currencyCode.trim().toUpperCase()
  if (input.minAmount !== undefined) match.minAmount = input.minAmount
  if (input.maxAmount !== undefined) match.maxAmount = input.maxAmount
  if (input.startDate) match.startDate = input.startDate
  if (input.endDate) match.endDate = input.endDate
  return Object.keys(match).length > 0 ? match : null
}

function transactionLabelSelectorFromRuleMatch(
  match: MoneyTransactionLabelRuleMatch,
  namespace: string,
): TransactionLabelSelector {
  return {
    merchantIds: match.merchantIds,
    merchantNames: match.merchantNames,
    q: match.q,
    textPattern: match.textPattern,
    accountId: match.accountId,
    direction: match.direction,
    category: match.category,
    currencyCode: match.currencyCode,
    minAmount: match.minAmount,
    maxAmount: match.maxAmount,
    startDate: match.startDate,
    endDate: match.endDate,
    missingNamespace: namespace,
    limit: 2000,
  }
}

function ruleMatchKey(match: MoneyTransactionLabelRuleMatch): string {
  return [
    ...(match.merchantIds ?? []),
    ...(match.merchantNames ?? []),
    match.textPattern,
    match.q,
    match.accountId,
    match.direction,
    match.category,
    match.currencyCode,
  ]
    .filter(Boolean)
    .join('-')
}

function transactionLabelRuleCounts(
  rules: MoneyTransactionLabelRule[],
): Record<string, Record<string, number>> {
  return rules.reduce<Record<string, Record<string, number>>>(
    (counts, rule) => {
      counts[rule.status] ??= {}
      counts[rule.status][rule.namespace] =
        (counts[rule.status][rule.namespace] ?? 0) + 1
      counts.scope ??= {}
      counts.scope[rule.scope] = (counts.scope[rule.scope] ?? 0) + 1
      return counts
    },
    {},
  )
}

async function applyTransactionLabels(
  c: Context,
  request: TransactionLabelRequest,
): Promise<
  | {
      ok: true
      dryRun: boolean
      matched: {
        transactions: Array<{
          id: string
          name: string
          merchantName?: string
          merchantId: string
          amount: number
          direction: TransactionDirection
          date: string
        }>
        total: number
        selected: number
        limit: number
        hasMore: boolean
      }
      summary: {
        namespace: string
        dryRun: boolean
        matchedTotal: number
        selectedTotal: number
        limit: number
        hasMore: boolean
        wouldWriteTotal: number
        wroteTotal: number
      }
      extensions: MoneyExtensionValue[]
      counts?: Record<string, Record<string, number>>
      resolvedProposals?: MoneyExtensionProposal[]
      proposalCounts?: Record<string, Record<string, number>>
      reviewAfter?: TransactionExtensionReviewAfter
      refreshedMetrics?: number
      taughtRule?: MoneyTransactionLabelRule
    }
  | {
      ok: false
      error: {
        code: string
        message: string
        issues?: string[]
      }
    }
> {
  const transactions = (await readVisibleMoneyData(c)).transactions
  const matchesSelector = createTransactionLabelMatcher(request.selector)
  const matched = transactions.filter(matchesSelector)
  const selected = matched.slice(0, request.selector.limit)
  const now = new Date().toISOString()
  const extensions: MoneyExtensionValue[] = selected.map((transaction) => ({
    entity: 'transaction',
    entityId: transaction.id,
    namespace: request.namespace,
    values: { ...request.values },
    source: request.source,
    confidence: request.confidence,
    updatedAt: now,
  }))
  const validation = validateExtensionValues(
    extensions,
    await readExtensionRegistry(c),
  )
  if (validation.length > 0) {
    return {
      ok: false,
      error: {
        code: 'invalid_extension_values',
        message: validation.join('\n'),
        issues: validation,
      },
    }
  }

  const matchedSummary = summarizeMatchedTransactions(
    matched,
    selected,
    request.selector.limit,
  )

  if (request.dryRun || extensions.length === 0) {
    return {
      ok: true,
      dryRun: true,
      matched: matchedSummary,
      summary: transactionLabelMutationSummary(
        request,
        matchedSummary,
        extensions.length,
        true,
      ),
      extensions,
    }
  }

  let next = await upsertExtensionValues(c, extensions)
  if (request.namespace === 'merchantGroup') {
    next = await refreshDerivedTransactionExtensions(c)
  }
  const resolvedProposals = await resolveAppliedLabelProposals(
    c,
    extensions,
    now,
  )
  let taughtRule: MoneyTransactionLabelRule | undefined
  if (request.teachRule) {
    const ruleRequest = transactionLabelRuleRequestFromLabelRequest(request)
    if (!ruleRequest.ok) return ruleRequest
    const ruleResult = await createTransactionLabelRule(c, {
      ...ruleRequest.request,
      applyExisting: false,
    })
    if (!ruleResult.ok) return ruleResult
    taughtRule = ruleResult.rule
    next = await refreshDerivedTransactionExtensions(c)
  }
  const refreshedMetrics = await refreshMaterializedMetrics(
    c,
    TRANSACTION_FACT_COLLECTIONS,
  )
  return {
    ok: true,
    dryRun: false,
    matched: matchedSummary,
    summary: transactionLabelMutationSummary(
      request,
      matchedSummary,
      extensions.length,
      false,
    ),
    extensions,
    counts: genericExtensionCounts(next),
    resolvedProposals: resolvedProposals.proposals,
    proposalCounts: resolvedProposals.counts,
    reviewAfter: await buildTransactionExtensionReviewAfter(c, {
      extensions,
      proposals: resolvedProposals.proposals,
    }),
    refreshedMetrics,
    taughtRule,
  }
}

async function resolveAppliedLabelProposals(
  c: Context,
  extensions: MoneyExtensionValue[],
  now: string,
): Promise<{
  proposals: MoneyExtensionProposal[]
  counts: Record<string, Record<string, number>>
}> {
  const transactionExtensions = extensions.filter(
    (extension) => extension.entity === 'transaction',
  )
  if (transactionExtensions.length === 0) {
    return { proposals: [], counts: {} }
  }

  const namespaces = [
    ...new Set(transactionExtensions.map((extension) => extension.namespace)),
  ]
  const appliedByKey = new Map(
    transactionExtensions.map((extension) => [
      `${extension.entityId}:${extension.namespace}`,
      extension,
    ]),
  )
  const pendingProposals = (
    await Promise.all(
      namespaces.map((namespace) =>
        readExtensionProposals(c, {
          entity: 'transaction',
          namespace,
          status: 'pending',
        }),
      ),
    )
  ).flat()
  const resolved = pendingProposals
    .filter((proposal) =>
      appliedByKey.has(`${proposal.entityId}:${proposal.namespace}`),
    )
    .map((proposal) => {
      const extension = appliedByKey.get(
        `${proposal.entityId}:${proposal.namespace}`,
      )
      const accepted = extensionValuesEqual(
        proposal.values,
        extension?.values ?? {},
      )
      return {
        ...proposal,
        status: accepted ? ('accepted' as const) : ('rejected' as const),
        updatedAt: now,
        decidedAt: now,
        decisionReason: accepted
          ? 'Accepted by transaction labelApply.'
          : 'Superseded by transaction labelApply.',
      }
    })

  if (resolved.length === 0) {
    return { proposals: [], counts: extensionProposalCounts(pendingProposals) }
  }

  const proposalSet = await upsertExtensionProposals(c, resolved)
  return {
    proposals: resolved,
    counts: extensionProposalCounts(proposalSet),
  }
}

async function classifyTransactions(
  c: Context,
  request: TransactionClassificationRequest,
) {
  const transactions = (await readVisibleMoneyData(c)).transactions
  const matchesSelector = createTransactionLabelMatcher(request.selector)
  const matched = transactions.filter(matchesSelector)
  const limit = Math.min(request.selector.limit, request.maxTransactions)
  const selected = matched.slice(0, limit)
  const registry = await readExtensionRegistry(c)
  const targetNamespaceSet = new Set(request.targetNamespaces)
  const targetDefinitions = registry.extensions.filter(
    (definition) =>
      definition.entity === 'transaction' &&
      targetNamespaceSet.has(definition.namespace),
  )
  const missingNamespaces = request.targetNamespaces.filter(
    (namespace) =>
      !targetDefinitions.some(
        (definition) => definition.namespace === namespace,
      ),
  )

  if (missingNamespaces.length > 0) {
    return {
      ok: false as const,
      error: {
        code: 'invalid_classification_namespaces',
        message: `Unknown transaction extension namespace(s): ${missingNamespaces.join(', ')}`,
        issues: missingNamespaces,
      },
    }
  }

  const matchedSummary = summarizeMatchedTransactions(matched, selected, limit)
  if (selected.length === 0) {
    return {
      ok: true as const,
      dryRun: !request.apply,
      model: request.model,
      matched: matchedSummary,
      summary: transactionClassificationSummary({
        request,
        matched: matchedSummary,
        proposalTotal: 0,
        savedProposalTotal: 0,
        appliedTotal: 0,
        skippedTotal: 0,
      }),
      targetNamespaces: request.targetNamespaces,
      proposals: [],
      applied: [],
      skipped: [],
    }
  }

  let response: {
    json: { proposals: TransactionClassificationProposal[] }
    model: string
    usage?: unknown
  }
  try {
    response = await generateJson<{
      proposals: TransactionClassificationProposal[]
    }>({
      workspaceId: getWorkspaceId(c),
      purpose: 'money.transaction_classification',
      model: request.model,
      reasoningEffort: 'low',
      maxOutputTokens: 3000,
      schemaName: 'money_transaction_label_proposals',
      schema: transactionClassificationJsonSchema(targetDefinitions),
      messages: [
        {
          role: 'system',
          content:
            'Classify personal finance transactions into registry-backed extension values. Return only valid JSON that matches the schema. Use only the supplied target namespaces and fields. Omit proposals when uncertain or unsupported. Do not change transaction direction or infer transfers as expenses.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            instructions: request.instructions,
            targetExtensions: targetDefinitions.map((definition) => ({
              namespace: definition.namespace,
              label: definition.label,
              description: definition.description,
              coverage: definition.coverage ?? 'sparse',
              fields: definition.fields.map((field) => ({
                name: field.name,
                label: field.label,
                type: field.type,
                required: Boolean(field.required),
                enumValues: field.enumValues,
                description: field.description,
              })),
            })),
            transactions: selected.map((transaction) => ({
              id: transaction.id,
              date: transaction.date,
              amount: transaction.amount,
              direction: transaction.direction,
              merchantName: transaction.merchantName,
              name: transaction.name,
              category: transaction.category,
              providerCategoryPrimary: transaction.providerCategoryPrimary,
              providerCategoryDetailed: transaction.providerCategoryDetailed,
              providerPaymentChannel: transaction.providerPaymentChannel,
              userCategory: transaction.userCategory,
              currencyCode:
                transaction.currencyCode ?? transaction.isoCurrencyCode,
              accountId: transaction.accountId,
              recurring: transaction.recurring,
              existingExtensions: transaction.extensions,
            })),
          }),
        },
      ],
    })
  } catch (error) {
    return {
      ok: false as const,
      error: {
        code: 'classification_failed',
        message:
          error instanceof Error
            ? error.message
            : 'Transaction classification failed',
        issues: [],
      },
    }
  }

  const parsed = transactionClassificationResultSchema.safeParse(response.json)
  if (!parsed.success) {
    return {
      ok: false as const,
      error: {
        code: 'invalid_classification_response',
        message: z.prettifyError(parsed.error),
        issues: [z.prettifyError(parsed.error)],
      },
    }
  }

  const selectedIds = new Set(selected.map((transaction) => transaction.id))
  const skipped: Array<{
    transactionId: string
    namespace: string
    reason: string
  }> = []
  const proposals = parsed.data.proposals.filter((proposal) => {
    if (!selectedIds.has(proposal.transactionId)) {
      skipped.push({
        transactionId: proposal.transactionId,
        namespace: proposal.namespace,
        reason: 'transaction_not_selected',
      })
      return false
    }
    if (!targetNamespaceSet.has(proposal.namespace)) {
      skipped.push({
        transactionId: proposal.transactionId,
        namespace: proposal.namespace,
        reason: 'namespace_not_requested',
      })
      return false
    }
    return true
  })

  const now = new Date().toISOString()
  const batchId = extensionProposalBatchId(now)
  const extensions: MoneyExtensionValue[] = proposals.map((proposal) => ({
    entity: 'transaction',
    entityId: proposal.transactionId,
    namespace: proposal.namespace,
    values: { ...proposal.values },
    source: 'agent',
    confidence: proposal.confidence,
    updatedAt: now,
  }))
  const proposalRecords: MoneyExtensionProposal[] = proposals.map(
    (proposal) => {
      const accepted =
        request.apply && proposal.confidence >= request.minConfidenceToApply
      return {
        id: extensionProposalId(
          'transaction',
          proposal.transactionId,
          proposal.namespace,
        ),
        entity: 'transaction',
        entityId: proposal.transactionId,
        namespace: proposal.namespace,
        values: { ...proposal.values },
        source: 'agent',
        confidence: proposal.confidence,
        reason: proposal.reason,
        status: accepted ? 'accepted' : 'pending',
        model: response.model,
        batchId,
        createdAt: now,
        updatedAt: now,
        decidedAt: accepted ? now : undefined,
        decisionReason: accepted
          ? 'auto_accepted_by_confidence_threshold'
          : undefined,
      }
    },
  )
  const validation = validateExtensionValues(extensions, registry)
  if (validation.length > 0) {
    return {
      ok: false as const,
      error: {
        code: 'invalid_classification_values',
        message: validation.join('\n'),
        issues: validation,
      },
      proposals,
      skipped,
    }
  }

  const savedProposals = request.saveProposals
    ? await upsertExtensionProposals(c, proposalRecords)
    : []
  const applied = request.apply
    ? extensions.filter(
        (extension) =>
          (extension.confidence ?? 0) >= request.minConfidenceToApply,
      )
    : []
  const belowThreshold = proposals
    .filter(
      (proposal) =>
        request.apply && proposal.confidence < request.minConfidenceToApply,
    )
    .map((proposal) => ({
      transactionId: proposal.transactionId,
      namespace: proposal.namespace,
      reason: 'confidence_below_apply_threshold',
    }))
  skipped.push(...belowThreshold)

  if (applied.length === 0) {
    return {
      ok: true as const,
      dryRun: !request.apply,
      model: response.model,
      usage: response.usage,
      matched: matchedSummary,
      summary: transactionClassificationSummary({
        request,
        matched: matchedSummary,
        proposalTotal: proposals.length,
        savedProposalTotal: request.saveProposals ? proposalRecords.length : 0,
        appliedTotal: 0,
        skippedTotal: skipped.length,
      }),
      targetNamespaces: request.targetNamespaces,
      proposals,
      proposalRecords,
      savedProposals: request.saveProposals ? proposalRecords : [],
      proposalCounts: request.saveProposals
        ? extensionProposalCounts(savedProposals)
        : {},
      applied,
      skipped,
      reviewAfter: request.saveProposals
        ? await buildTransactionExtensionReviewAfter(c, {
            proposals: proposalRecords,
          })
        : undefined,
    }
  }

  let next = await upsertExtensionValues(c, applied)
  if (applied.some((extension) => extension.namespace === 'merchantGroup')) {
    next = await refreshDerivedTransactionExtensions(c)
  }
  const refreshedMetrics = await refreshMaterializedMetrics(
    c,
    TRANSACTION_FACT_COLLECTIONS,
  )
  return {
    ok: true as const,
    dryRun: false,
    model: response.model,
    usage: response.usage,
    matched: matchedSummary,
    summary: transactionClassificationSummary({
      request,
      matched: matchedSummary,
      proposalTotal: proposals.length,
      savedProposalTotal: request.saveProposals ? proposalRecords.length : 0,
      appliedTotal: applied.length,
      skippedTotal: skipped.length,
    }),
    targetNamespaces: request.targetNamespaces,
    proposals,
    proposalRecords,
    savedProposals: request.saveProposals ? proposalRecords : [],
    proposalCounts: request.saveProposals
      ? extensionProposalCounts(savedProposals)
      : {},
    applied,
    skipped,
    counts: genericExtensionCounts(next),
    reviewAfter: await buildTransactionExtensionReviewAfter(c, {
      extensions: applied,
      proposals: request.saveProposals ? proposalRecords : [],
    }),
    refreshedMetrics,
  }
}

function summarizeMatchedTransactions(
  matched: MoneyTransaction[],
  selected: MoneyTransaction[],
  limit: number,
) {
  return {
    transactions: selected.map((transaction) => ({
      id: transaction.id,
      name: transaction.name,
      merchantName: transaction.merchantName,
      merchantId: transactionMerchantId(transaction),
      amount: transaction.amount,
      direction: transaction.direction,
      date: transaction.date,
    })),
    total: matched.length,
    selected: selected.length,
    limit,
    hasMore: matched.length > selected.length,
  }
}

function transactionLabelMutationSummary(
  request: TransactionLabelRequest,
  matched: ReturnType<typeof summarizeMatchedTransactions>,
  extensionTotal: number,
  dryRun: boolean,
) {
  return {
    namespace: request.namespace,
    dryRun,
    matchedTotal: matched.total,
    selectedTotal: matched.selected,
    limit: matched.limit,
    hasMore: matched.hasMore,
    wouldWriteTotal: dryRun ? extensionTotal : 0,
    wroteTotal: dryRun ? 0 : extensionTotal,
  }
}

function transactionClassificationSummary(input: {
  request: TransactionClassificationRequest
  matched: ReturnType<typeof summarizeMatchedTransactions>
  proposalTotal: number
  savedProposalTotal: number
  appliedTotal: number
  skippedTotal: number
}) {
  return {
    dryRun: !input.request.apply,
    targetNamespaces: input.request.targetNamespaces,
    matchedTotal: input.matched.total,
    selectedTotal: input.matched.selected,
    limit: input.matched.limit,
    hasMore: input.matched.hasMore,
    proposalTotal: input.proposalTotal,
    savedProposalTotal: input.savedProposalTotal,
    appliedTotal: input.appliedTotal,
    skippedTotal: input.skippedTotal,
    saveProposals: input.request.saveProposals,
    apply: input.request.apply,
    minConfidenceToApply: input.request.minConfidenceToApply,
  }
}

async function buildTransactionExtensionReviewAfter(
  c: Context,
  input: {
    extensions?: MoneyExtensionValue[]
    proposals?: MoneyExtensionProposal[]
  },
): Promise<TransactionExtensionReviewAfter | undefined> {
  const transactionExtensions = (input.extensions ?? []).filter(
    (extension) => extension.entity === 'transaction',
  )
  const transactionProposals = (input.proposals ?? []).filter(
    (proposal) => proposal.entity === 'transaction',
  )
  const namespaces = uniqueStrings([
    ...transactionExtensions.map((extension) => extension.namespace),
    ...transactionProposals.map((proposal) => proposal.namespace),
  ])
  const affectedTransactionIds = uniqueStrings([
    ...transactionExtensions.map((extension) => extension.entityId),
    ...transactionProposals.map((proposal) => proposal.entityId),
  ])

  if (namespaces.length === 0) return undefined

  const [transactions, extensionSets, pendingProposalSets] = await Promise.all([
    readVisibleMoneyData(c).then((data) => data.transactions),
    Promise.all(
      namespaces.map((namespace) =>
        readExtensionValues(c, { entity: 'transaction', namespace }),
      ),
    ),
    Promise.all(
      namespaces.map((namespace) =>
        readExtensionProposals(c, {
          entity: 'transaction',
          namespace,
          status: 'pending',
        }),
      ),
    ),
  ])
  const visibleTransactionIds = new Set(
    transactions.map((transaction) => transaction.id),
  )

  return {
    affectedTransactionIds: affectedTransactionIds.filter((id) =>
      visibleTransactionIds.has(id),
    ),
    namespaces: namespaces.map((namespace, index) => {
      const namespaceExtensions = extensionSets[index] ?? []
      const namespacePendingProposals = pendingProposalSets[index] ?? []
      const labeledTransactionIds = new Set(
        namespaceExtensions
          .filter(
            (extension) =>
              extension.entity === 'transaction' &&
              extension.namespace === namespace &&
              visibleTransactionIds.has(extension.entityId) &&
              Object.keys(extension.values).length > 0,
          )
          .map((extension) => extension.entityId),
      )
      const pendingProposalTransactionIds = new Set(
        namespacePendingProposals
          .filter((proposal) => visibleTransactionIds.has(proposal.entityId))
          .map((proposal) => proposal.entityId),
      )
      const affectedForNamespace = uniqueStrings([
        ...transactionExtensions
          .filter((extension) => extension.namespace === namespace)
          .map((extension) => extension.entityId),
        ...transactionProposals
          .filter((proposal) => proposal.namespace === namespace)
          .map((proposal) => proposal.entityId),
      ]).filter((id) => visibleTransactionIds.has(id))

      return {
        namespace,
        affectedTransactionIds: affectedForNamespace,
        labeledTotal: labeledTransactionIds.size,
        missingNamespaceTotal: transactions.length - labeledTransactionIds.size,
        pendingProposalTotal: namespacePendingProposals.filter((proposal) =>
          visibleTransactionIds.has(proposal.entityId),
        ).length,
        affectedStillMissing: affectedForNamespace.filter(
          (id) => !labeledTransactionIds.has(id),
        ).length,
        affectedPendingProposalTotal: affectedForNamespace.filter((id) =>
          pendingProposalTransactionIds.has(id),
        ).length,
      }
    }),
  }
}

function transactionClassificationJsonSchema(
  definitions: TransactionExtensionDefinition[],
) {
  const proposalSchemas = definitions.map((definition) =>
    transactionClassificationProposalJsonSchema(definition),
  )
  return {
    type: 'object',
    required: ['proposals'],
    additionalProperties: false,
    properties: {
      proposals: {
        type: 'array',
        items:
          proposalSchemas.length === 1
            ? proposalSchemas[0]
            : {
                anyOf: proposalSchemas,
              },
      },
    },
  }
}

function transactionClassificationProposalJsonSchema(
  definition: TransactionExtensionDefinition,
) {
  return {
    type: 'object',
    required: ['transactionId', 'namespace', 'values', 'confidence', 'reason'],
    additionalProperties: false,
    properties: {
      transactionId: { type: 'string' },
      namespace: { type: 'string', enum: [definition.namespace] },
      values: transactionClassificationValuesJsonSchema(definition),
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      reason: { type: 'string' },
    },
  }
}

function transactionClassificationValuesJsonSchema(
  definition: TransactionExtensionDefinition,
) {
  const properties = Object.fromEntries(
    definition.fields.map((field) => [
      field.name,
      extensionFieldJsonSchema(field),
    ]),
  )
  return {
    type: 'object',
    required: definition.fields.map((field) => field.name),
    additionalProperties: false,
    properties,
  }
}

function extensionFieldJsonSchema(
  field: TransactionExtensionDefinition['fields'][number],
) {
  if (
    field.type === 'number' ||
    field.type === 'money' ||
    field.type === 'percent'
  ) {
    return nullableSchema({ type: 'number' })
  }
  if (field.type === 'boolean') {
    return nullableSchema({ type: 'boolean' })
  }
  if (field.type === 'enum') {
    return nullableSchema({
      type: 'string',
      ...(field.enumValues ? { enum: field.enumValues } : {}),
    })
  }
  return nullableSchema({ type: 'string' })
}

function nullableSchema(schema: Record<string, unknown>) {
  if (Array.isArray(schema.enum)) {
    return {
      ...schema,
      type: [schema.type, 'null'].flat(),
      enum: [...schema.enum, null],
    }
  }
  return { ...schema, type: [schema.type, 'null'].flat() }
}

function createTransactionLabelMatcher(
  selector: TransactionLabelSelector,
): (transaction: MoneyTransaction) => boolean {
  const transactionIds = selector.transactionIds?.length
    ? new Set(selector.transactionIds)
    : null
  const merchantIds = selector.merchantIds?.length
    ? new Set(selector.merchantIds.map(slugify))
    : null
  const merchantNames = selector.merchantNames?.length
    ? new Set(selector.merchantNames.map((name) => name.trim().toLowerCase()))
    : null
  const category = selector.category?.trim().toLowerCase()
  const query = selector.q?.trim().toLowerCase()
  const textPattern = selector.textPattern?.trim().toLowerCase()
  const currencyCode = selector.currencyCode?.trim().toUpperCase()
  const missingNamespace = selector.missingNamespace?.trim()

  return (transaction) => {
    if (transactionIds && !transactionIds.has(transaction.id)) return false
    if (selector.accountId && transaction.accountId !== selector.accountId)
      return false
    if (selector.direction && transaction.direction !== selector.direction)
      return false
    if (
      currencyCode &&
      (
        transaction.currencyCode ?? transaction.isoCurrencyCode
      )?.toUpperCase() !== currencyCode
    ) {
      return false
    }
    if (
      selector.minAmount !== undefined &&
      transactionComparableAmount(transaction) < selector.minAmount
    ) {
      return false
    }
    if (
      selector.maxAmount !== undefined &&
      transactionComparableAmount(transaction) > selector.maxAmount
    ) {
      return false
    }
    if (
      missingNamespace &&
      hasTransactionNamespace(transaction, missingNamespace)
    )
      return false
    if (selector.startDate && transaction.date < selector.startDate)
      return false
    if (selector.endDate && transaction.date > selector.endDate) return false

    const merchantId = transactionMerchantId(transaction)
    if (merchantIds && !merchantIds.has(merchantId)) return false
    if (
      merchantNames &&
      !merchantNames.has(
        (transaction.merchantName ?? transaction.name).trim().toLowerCase(),
      )
    ) {
      return false
    }

    if (
      category &&
      !transaction.category.some((entry) =>
        entry.toLowerCase().includes(category),
      ) &&
      transaction.userCategory?.toLowerCase() !== category
    ) {
      return false
    }

    if (query || textPattern) {
      const haystack = [
        transaction.name,
        transaction.merchantName,
        transaction.notes,
        transaction.userCategory,
        ...transaction.category,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (query && !haystack.includes(query)) return false
      if (textPattern && !haystack.includes(textPattern)) return false
    }

    return true
  }
}

function transactionMerchantId(transaction: {
  merchantName?: string
  name: string
}): string {
  return slugify(transaction.merchantName ?? transaction.name)
}

function extensionProposalId(
  entity: string,
  entityId: string,
  namespace: string,
): string {
  return slugify(`${entity}-${entityId}-${namespace}`)
}

function extensionValuesEqual(
  a: Record<string, MoneyExtensionPrimitive>,
  b: Record<string, MoneyExtensionPrimitive>,
): boolean {
  const aKeys = Object.keys(a).sort()
  const bKeys = Object.keys(b).sort()
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((key, index) => {
    if (key !== bKeys[index]) return false
    return a[key] === b[key]
  })
}

function extensionProposalBatchId(timestamp: string): string {
  return slugify(`classification-${timestamp}`)
}

function genericExtensionCounts(
  extensions: Array<{ entity: string; namespace: string }>,
): Record<string, Record<string, number>> {
  return extensions.reduce<Record<string, Record<string, number>>>(
    (counts, extension) => {
      counts[extension.entity] ??= {}
      counts[extension.entity][extension.namespace] =
        (counts[extension.entity][extension.namespace] ?? 0) + 1
      return counts
    },
    {},
  )
}

function extensionProposalCounts(
  proposals: MoneyExtensionProposal[],
): Record<string, Record<string, number>> {
  return proposals.reduce<Record<string, Record<string, number>>>(
    (counts, proposal) => {
      counts[proposal.status] ??= {}
      const key = `${proposal.entity}:${proposal.namespace}`
      counts[proposal.status][key] = (counts[proposal.status][key] ?? 0) + 1
      return counts
    },
    {},
  )
}

function validateExtensionValues(
  extensions: MoneyExtensionValue[],
  registry: MoneyExtensionRegistry,
): string[] {
  const issues: string[] = []
  const byEntityNamespace = new Map(
    registry.extensions.map((extension) => [
      `${extension.entity}:${extension.namespace}`,
      extension,
    ]),
  )

  for (const extension of extensions) {
    const definition = byEntityNamespace.get(
      `${extension.entity}:${extension.namespace}`,
    )
    if (!definition) {
      issues.push(
        `${extension.entity}:${extension.entityId}:${extension.namespace} is not registered for that entity`,
      )
      continue
    }

    const fields = new Map(
      definition.fields.map((field) => [field.name, field]),
    )
    for (const field of definition.fields) {
      if (field.required && extension.values[field.name] === undefined) {
        issues.push(
          `${extension.entity}:${extension.entityId}:${extension.namespace}.${field.name} is required`,
        )
      }
    }

    for (const [fieldName, value] of Object.entries(extension.values)) {
      const field = fields.get(fieldName)
      if (!field) {
        issues.push(
          `${extension.entity}:${extension.entityId}:${extension.namespace}.${fieldName} is not registered`,
        )
        continue
      }
      if (value === null) continue
      if (field.type === 'enum') {
        if (typeof value !== 'string' || !field.enumValues?.includes(value)) {
          issues.push(
            `${extension.entity}:${extension.entityId}:${extension.namespace}.${fieldName} must be one of ${(field.enumValues ?? []).join(', ')}`,
          )
        }
      } else if (field.type === 'date') {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) {
          issues.push(
            `${extension.entity}:${extension.entityId}:${extension.namespace}.${fieldName} must be a date string`,
          )
        }
      } else if (
        ['number', 'money', 'percent'].includes(field.type) &&
        (typeof value !== 'number' || !Number.isFinite(value))
      ) {
        issues.push(
          `${extension.entity}:${extension.entityId}:${extension.namespace}.${fieldName} must be a finite number`,
        )
      } else if (field.type === 'percent' && typeof value === 'number') {
        if (value < 0 || value > 1) {
          issues.push(
            `${extension.entity}:${extension.entityId}:${extension.namespace}.${fieldName} must be between 0 and 1`,
          )
        }
      } else if (field.type === 'boolean' && typeof value !== 'boolean') {
        issues.push(
          `${extension.entity}:${extension.entityId}:${extension.namespace}.${fieldName} must be boolean`,
        )
      } else if (field.type === 'string' && typeof value !== 'string') {
        issues.push(
          `${extension.entity}:${extension.entityId}:${extension.namespace}.${fieldName} must be string`,
        )
      }
    }
  }

  return issues
}

function upsertById<T extends { id: string }>(
  existing: T[],
  incoming: T[],
): T[] {
  const byId = new Map(existing.map((entry) => [entry.id, entry]))
  for (const entry of incoming) {
    byId.set(entry.id, entry)
  }
  return [...byId.values()]
}

function removeByIds<T extends { id: string }>(
  existing: T[],
  ids: string[],
): T[] {
  if (ids.length === 0) return existing
  const removed = new Set(ids)
  return existing.filter((entry) => !removed.has(entry.id))
}

function replaceItemFacts<
  T extends { id: string; itemId?: string; connectionId?: string },
>(existing: T[], itemId: string, incoming: T[]): T[] {
  const retained = existing.filter(
    (entry) => entry.itemId !== itemId && entry.connectionId !== itemId,
  )
  return upsertById(retained, incoming)
}

function replaceConnection(
  connections: MoneyConnection[],
  replacement: MoneyConnection,
) {
  const index = connections.findIndex(
    (connection) => connection.itemId === replacement.itemId,
  )
  if (index === -1) {
    connections.push(replacement)
    return
  }
  connections[index] = replacement
}
