import { safePath, readJson as storageReadJson } from '@moldable-ai/storage'
import {
  mergeMoneyFlowReportingValues,
  normalizeCurrencyCode,
  normalizeFxRates,
} from './currency'
import {
  normalizeAccountLiquidity,
  normalizeInvestmentAccountKind,
  normalizeInvestmentAssetClass,
  normalizeTaxTreatment,
} from './investments'
import { getDataDir } from './moldable'
import type {
  CollectionDefinition,
  MaterializedMetric,
  MoneyAccount,
  MoneyAllocationTarget,
  MoneyBalanceSnapshot,
  MoneyBalanceSnapshotKind,
  MoneyCardDefinition,
  MoneyConnection,
  MoneyDashboard,
  MoneyDataMode,
  MoneyDebt,
  MoneyExtensionDefinition,
  MoneyExtensionEntity,
  MoneyExtensionPrimitive,
  MoneyExtensionProposal,
  MoneyExtensionRegistry,
  MoneyExtensionValue,
  MoneyForecastScenario,
  MoneyForecastScenarioChange,
  MoneyFormulaDefinition,
  MoneyFxRate,
  MoneyHolding,
  MoneyMerchant,
  MoneyPerson,
  MoneyRecommendation,
  MoneyRecommendationKind,
  MoneyRecommendationSeverity,
  MoneyRecommendationStatus,
  MoneySettings,
  MoneySummary,
  MoneyTaxContributionLimit,
  MoneyTaxContributionLimitVariant,
  MoneyTaxContributionType,
  MoneyTransaction,
  MoneyTransactionLabelRule,
  MoneyTransactionLabelRuleMatch,
  RawMoneyData,
  RawPlaidSyncEvidence,
  RawPlaidSyncEvidenceSummary,
  SyncState,
  TransactionSearchFilters,
} from './money-types'
import type { Context } from 'hono'
import fs from 'node:fs/promises'
import path from 'node:path'

const EMPTY_RAW_DATA: RawMoneyData = {
  accounts: [],
  transactions: [],
}

async function readJson<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    return await storageReadJson<T>(filePath, defaultValue)
  } catch (error) {
    if (!isJsonCorruptionError(error)) throw error
    await quarantineCorruptJson(filePath, error)
    return defaultValue
  }
}

async function writeJson<T>(
  filePath: string,
  data: T,
  pretty = true,
): Promise<void> {
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })

  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)
  const tempPath = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random()
      .toString(36)
      .slice(2)}.tmp`,
  )

  let handle: fs.FileHandle | undefined
  try {
    handle = await fs.open(tempPath, 'w')
    await handle.writeFile(content, 'utf-8')
    await handle.sync()
    await handle.close()
    handle = undefined
    await fs.rename(tempPath, filePath)
  } catch (error) {
    if (handle) {
      await handle.close().catch(() => {})
    }
    await fs.rm(tempPath, { force: true }).catch(() => {})
    throw error
  }
}

function isJsonCorruptionError(error: unknown): boolean {
  return error instanceof SyntaxError
}

async function quarantineCorruptJson(
  filePath: string,
  error: unknown,
): Promise<void> {
  const suffix = new Date().toISOString().replace(/[:.]/g, '-')
  const corruptPath = `${filePath}.corrupt-${suffix}`
  const metadataPath = `${corruptPath}.txt`

  try {
    await fs.rename(filePath, corruptPath)
    const message = error instanceof Error ? error.message : String(error)
    await fs.writeFile(
      metadataPath,
      `Quarantined corrupt JSON file.\nOriginal path: ${filePath}\nError: ${message}\n`,
      'utf-8',
    )
  } catch {
    // If quarantine fails, still let the app recover with the caller's default.
  }
}

const MONEY_EXTENSION_ENTITIES: MoneyExtensionEntity[] = [
  'transaction',
  'account',
  'holding',
  'debt',
  'merchant',
  'person',
]

const DEFAULT_SETTINGS: MoneySettings = {
  display: {
    dataMode: 'live',
    updatedAt: new Date(0).toISOString(),
  },
  currency: {
    reportingCurrency: 'USD',
    updatedAt: new Date(0).toISOString(),
  },
  sync: {
    scheduledRefreshEnabled: false,
    intervalMinutes: 360,
    updatedAt: new Date(0).toISOString(),
  },
  attention: {
    largeTransactionThreshold: 1000,
    lookbackDays: 30,
    categoryThresholds: [],
    updatedAt: new Date(0).toISOString(),
  },
}

const MONEY_ASSET_CLASSES = [
  'stocks',
  'bonds',
  'cash',
  'crypto',
  'funds',
  'options',
  'other',
] as const

const TRANSFER_CATEGORY_CODES = new Set([
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT',
])

const DEFAULT_ALLOCATION_TARGETS: MoneyAllocationTarget[] = [
  {
    id: 'default',
    name: 'Default 90/10',
    allocations: {
      funds: 0.9,
      cash: 0.1,
    },
    description: 'Default investment allocation target.',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
]

const DEFAULT_FORECAST_SCENARIOS: MoneyForecastScenario[] = [
  {
    id: 'default',
    name: 'Default Spending Reduction',
    description:
      'Draft scenario that models reducing selected monthly expenses by 10%.',
    status: 'draft',
    horizonPeriods: 12,
    confidence: 0.75,
    changes: [
      {
        id: 'reduce-discretionary-spend',
        label: 'Reduce discretionary spend by 10%',
        percentChange: -0.1,
        status: 'draft',
      },
    ],
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
]

const DEFAULT_TAX_CONTRIBUTION_LIMITS: MoneyTaxContributionLimit[] = [
  {
    id: '401k-2026-standard',
    type: '401k',
    taxYear: 2026,
    label: '401(k), 403(b), 457, and TSP elective deferral',
    limit: 24500,
    variant: 'standard',
    sourceLabel: 'IRS 2026 retirement plan limits',
    sourceUrl:
      'https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'ira-2026-standard',
    type: 'ira',
    taxYear: 2026,
    label: 'IRA annual contribution',
    limit: 7500,
    variant: 'standard',
    sourceLabel: 'IRS 2026 IRA limit',
    sourceUrl:
      'https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'hsa-2026-self',
    type: 'hsa',
    taxYear: 2026,
    label: 'HSA self-only coverage',
    limit: 4400,
    variant: 'self',
    sourceLabel: 'IRS Rev. Proc. 2025-19',
    sourceUrl: 'https://www.irs.gov/irb/2025-21_IRB',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'hsa-2026-family',
    type: 'hsa',
    taxYear: 2026,
    label: 'HSA family coverage',
    limit: 8750,
    variant: 'family',
    sourceLabel: 'IRS Rev. Proc. 2025-19',
    sourceUrl: 'https://www.irs.gov/irb/2025-21_IRB',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
]

const DEFAULT_EXTENSION_REGISTRY: MoneyExtensionRegistry = {
  version: 1,
  extensions: [
    {
      namespace: 'subscription',
      label: 'Subscription',
      entity: 'transaction',
      description:
        'Recurring paid product or service labels over transactions.',
      coverage: 'sparse',
      fields: [
        { name: 'active', label: 'Active', type: 'boolean', required: true },
        {
          name: 'key',
          label: 'Subscription Key',
          type: 'string',
          required: true,
          formulaAliases: ['subscriptionKey'],
        },
        { name: 'name', label: 'Name', type: 'string' },
        {
          name: 'cadence',
          label: 'Cadence',
          type: 'enum',
          enumValues: ['daily', 'weekly', 'monthly', 'yearly', 'irregular'],
          formulaAliases: ['cadence'],
        },
        { name: 'monthlyAmount', label: 'Monthly Amount', type: 'money' },
        { name: 'intervalDays', label: 'Interval Days', type: 'number' },
        { name: 'lastDate', label: 'Last Seen', type: 'date' },
        { name: 'nextDueDate', label: 'Next Due Date', type: 'date' },
        {
          name: 'need',
          label: 'Need',
          type: 'enum',
          enumValues: ['required', 'useful', 'optional', 'waste'],
          formulaAliases: ['need'],
        },
        {
          name: 'status',
          label: 'Status',
          type: 'enum',
          enumValues: ['active', 'skipped', 'dismissed'],
          formulaAliases: ['recurringStatus'],
        },
        {
          name: 'confidence',
          label: 'Confidence',
          type: 'percent',
          formulaAliases: ['recurringConfidence'],
        },
        { name: 'observedCount', label: 'Observed Count', type: 'number' },
        { name: 'firstDate', label: 'First Seen', type: 'date' },
        {
          name: 'amountVariancePercent',
          label: 'Amount Variance',
          type: 'percent',
        },
      ],
      derivedCollections: [
        {
          id: 'Subscriptions',
          name: 'Subscriptions',
          entity: 'transaction',
          baseCollection: 'Expenses',
          predicate: 'subscription = true',
          examples: [
            'Subscriptions.ThisMonth().Unique(subscriptionKey).Count()',
          ],
        },
      ],
      examples: ['Expenses.Where(subscription = true).Monthly().Trend()'],
    },
    {
      namespace: 'recurringObligation',
      label: 'Recurring Obligation',
      entity: 'transaction',
      description:
        'Required recurring bills and obligations, distinct from subscriptions.',
      coverage: 'sparse',
      fields: [
        { name: 'active', label: 'Active', type: 'boolean', required: true },
        {
          name: 'key',
          label: 'Obligation Key',
          type: 'string',
          required: true,
        },
        { name: 'name', label: 'Name', type: 'string' },
        {
          name: 'cadence',
          label: 'Cadence',
          type: 'enum',
          enumValues: ['weekly', 'monthly', 'quarterly', 'yearly', 'irregular'],
          formulaAliases: ['cadence'],
        },
        { name: 'monthlyAmount', label: 'Monthly Amount', type: 'money' },
        { name: 'intervalDays', label: 'Interval Days', type: 'number' },
        { name: 'lastDate', label: 'Last Seen', type: 'date' },
        { name: 'nextDueDate', label: 'Next Due Date', type: 'date' },
        {
          name: 'need',
          label: 'Need',
          type: 'enum',
          enumValues: ['required', 'useful', 'optional'],
          formulaAliases: ['need'],
        },
        {
          name: 'status',
          label: 'Status',
          type: 'enum',
          enumValues: ['active', 'skipped', 'dismissed'],
          formulaAliases: ['recurringStatus'],
        },
        {
          name: 'confidence',
          label: 'Confidence',
          type: 'percent',
          formulaAliases: ['recurringConfidence'],
        },
        { name: 'observedCount', label: 'Observed Count', type: 'number' },
        { name: 'firstDate', label: 'First Seen', type: 'date' },
        {
          name: 'amountVariancePercent',
          label: 'Amount Variance',
          type: 'percent',
        },
      ],
      derivedCollections: [
        {
          id: 'RecurringObligations',
          name: 'Recurring Obligations',
          entity: 'transaction',
          baseCollection: 'Expenses',
          predicate: 'recurringObligation = true',
          examples: ['RecurringObligations.ThisMonth().Sum()'],
        },
      ],
      examples: [
        'Expenses.Where(recurringObligation = true).Monthly().Trend()',
      ],
    },
    {
      namespace: 'merchantGroup',
      label: 'Merchant Group',
      entity: 'transaction',
      description:
        'Canonical merchant grouping for transactions without mutating provider facts.',
      coverage: 'sparse',
      fields: [
        {
          name: 'merchantId',
          label: 'Merchant ID',
          type: 'string',
          required: true,
          formulaAliases: ['merchantId'],
        },
        {
          name: 'name',
          label: 'Merchant Name',
          type: 'string',
          formulaAliases: ['merchantName'],
        },
        { name: 'confidence', label: 'Confidence', type: 'percent' },
        {
          name: 'status',
          label: 'Status',
          type: 'enum',
          enumValues: ['active', 'dismissed'],
        },
      ],
      derivedCollections: [
        {
          id: 'MerchantGroupedTransactions',
          name: 'Merchant Grouped Transactions',
          entity: 'transaction',
          baseCollection: 'Expenses',
          predicate: 'merchantId != ""',
          examples: ['Expenses.GroupBy(merchantId).Top(10, value)'],
        },
      ],
      examples: ['Expenses.GroupBy(merchantId).Top(10, value)'],
    },
    {
      namespace: 'moneyFlow',
      label: 'Money Flow',
      entity: 'transaction',
      description:
        'Links transactions that move value between accounts, currencies, and holding tanks before final external spend.',
      coverage: 'sparse',
      fields: [
        {
          name: 'flowId',
          label: 'Flow ID',
          type: 'string',
          required: true,
          formulaAliases: ['moneyFlowId'],
        },
        {
          name: 'role',
          label: 'Role',
          type: 'enum',
          enumValues: [
            'source',
            'destination',
            'bridge',
            'transfer',
            'fee',
            'external_spend',
            'ignored',
          ],
          formulaAliases: ['moneyFlowRole'],
        },
        {
          name: 'status',
          label: 'Status',
          type: 'enum',
          enumValues: ['active', 'dismissed'],
        },
        { name: 'fromAccountId', label: 'From Account', type: 'string' },
        { name: 'toAccountId', label: 'To Account', type: 'string' },
        {
          name: 'destinationKind',
          label: 'Destination Kind',
          type: 'enum',
          enumValues: ['linked', 'unlinked_owned', 'external'],
        },
        {
          name: 'externalAccountName',
          label: 'External Account',
          type: 'string',
        },
        { name: 'sourceCurrency', label: 'Source Currency', type: 'string' },
        { name: 'targetCurrency', label: 'Target Currency', type: 'string' },
        { name: 'sourceAmount', label: 'Source Amount', type: 'money' },
        { name: 'targetAmount', label: 'Target Amount', type: 'money' },
        { name: 'feeAmount', label: 'Fee Amount', type: 'money' },
        { name: 'fxRate', label: 'FX Rate', type: 'number' },
        {
          name: 'reportingCurrency',
          label: 'Reporting Currency',
          type: 'string',
        },
        { name: 'reportingValue', label: 'Reporting Value', type: 'money' },
        {
          name: 'reportingValueStatus',
          label: 'Reporting Value Status',
          type: 'enum',
          enumValues: ['locked', 'estimated'],
        },
        { name: 'reportingFxRate', label: 'Reporting FX Rate', type: 'number' },
        { name: 'reportingFxAsOf', label: 'Reporting FX As Of', type: 'date' },
        {
          name: 'reportingFxSource',
          label: 'Reporting FX Source',
          type: 'string',
        },
        { name: 'provider', label: 'Provider', type: 'string' },
        { name: 'note', label: 'Note', type: 'string' },
      ],
      derivedCollections: [
        {
          id: 'MoneyFlows',
          name: 'Money Flows',
          entity: 'transaction',
          baseCollection: 'Transactions',
          predicate: 'moneyFlowRole != ""',
          examples: ['MoneyFlows.Where(role != "fee").Sum()'],
        },
      ],
      examples: [
        'MoneyFlows.Where(role != "fee").Sum()',
        'MoneyFlows.Where(role = "fee").Sum()',
      ],
    },
    {
      namespace: 'budget',
      label: 'Budget Label',
      entity: 'transaction',
      coverage: 'exhaustive',
      fields: [
        {
          name: 'need',
          label: 'Need',
          type: 'enum',
          enumValues: ['required', 'useful', 'optional', 'waste'],
          formulaAliases: ['need'],
        },
        { name: 'goal', label: 'Goal', type: 'string' },
      ],
      derivedCollections: [
        {
          id: 'BudgetLabels',
          name: 'Budget Labels',
          entity: 'transaction',
          baseCollection: 'Expenses',
          predicate: 'budget_need != ""',
          examples: ['BudgetLabels.Where(need = "required").Sum()'],
        },
      ],
      examples: ['Expenses.ThisMonth().Where(need = "required").Sum()'],
    },
    {
      namespace: 'joyReview',
      label: 'Joy Review',
      entity: 'transaction',
      coverage: 'sparse',
      fields: [
        {
          name: 'rating',
          label: 'Rating',
          type: 'enum',
          enumValues: ['positive', 'neutral', 'negative'],
          formulaAliases: ['joy'],
        },
        { name: 'reviewedAt', label: 'Reviewed At', type: 'date' },
        {
          name: 'decision',
          label: 'Decision',
          type: 'enum',
          enumValues: ['keep', 'reduce', 'cancel'],
        },
      ],
      derivedCollections: [
        {
          id: 'JoyReview',
          name: 'Joy Review',
          entity: 'transaction',
          baseCollection: 'Expenses',
          predicate: 'joy != ""',
          examples: ['JoyReview.Where(rating = "negative").Sum()'],
        },
      ],
      examples: ['Expenses.Where(joy = "negative").Sum()'],
    },
    {
      namespace: 'sharedExpense',
      label: 'Shared Expense',
      entity: 'transaction',
      coverage: 'sparse',
      fields: [
        { name: 'personId', label: 'Person', type: 'string' },
        {
          name: 'status',
          label: 'Status',
          type: 'enum',
          enumValues: ['owed', 'i_owe', 'paid', 'ignored'],
          formulaAliases: ['sharedStatus'],
        },
        { name: 'amount', label: 'Shared Amount', type: 'money' },
        { name: 'percent', label: 'Shared Percent', type: 'percent' },
        { name: 'dueDate', label: 'Due Date', type: 'date' },
        { name: 'settledAt', label: 'Settled At', type: 'date' },
        { name: 'note', label: 'Note', type: 'string' },
      ],
      derivedCollections: [
        {
          id: 'SharedExpenses',
          name: 'Shared Expenses',
          entity: 'transaction',
          baseCollection: 'Expenses',
          predicate: 'sharedStatus != ""',
          examples: ['SharedExpenses.Where(status = "owed").Sum()'],
        },
      ],
      examples: ['Expenses.Where(sharedStatus = "owed").Sum()'],
    },
    {
      namespace: 'taxContribution',
      label: 'Tax Contribution',
      entity: 'transaction',
      coverage: 'sparse',
      fields: [
        {
          name: 'type',
          label: 'Type',
          type: 'enum',
          enumValues: ['401k', 'ira', 'hsa', '529'],
          formulaAliases: ['taxContribution'],
        },
        { name: 'taxYear', label: 'Tax Year', type: 'number' },
        { name: 'amount', label: 'Amount', type: 'money' },
        {
          name: 'contributionSource',
          label: 'Contribution Source',
          type: 'enum',
          enumValues: ['payroll', 'employer', 'transfer', 'manual'],
          formulaAliases: ['taxContributionSource'],
        },
      ],
      derivedCollections: [
        {
          id: 'TaxContributions',
          name: 'Tax Contributions',
          entity: 'transaction',
          baseCollection: 'Transactions',
          predicate: 'taxContribution != ""',
          examples: ['TaxContributions.Where(type = "hsa").ThisYear().Sum()'],
        },
      ],
      examples: ['Expenses.Where(taxContribution = "401k").ThisYear().Sum()'],
    },
    {
      namespace: 'reviewAction',
      label: 'Review Action',
      entity: 'transaction',
      coverage: 'sparse',
      fields: [
        {
          name: 'status',
          label: 'Status',
          type: 'enum',
          enumValues: [
            'required',
            'suggested',
            'accepted',
            'rejected',
            'done',
            'ignored',
          ],
          formulaAliases: ['reviewActionStatus'],
        },
        {
          name: 'type',
          label: 'Type',
          type: 'enum',
          enumValues: ['action', 'warning', 'opportunity'],
          formulaAliases: ['reviewActionType'],
        },
        {
          name: 'severity',
          label: 'Severity',
          type: 'enum',
          enumValues: ['low', 'medium', 'high'],
          formulaAliases: ['recommendationSeverity'],
        },
        { name: 'reason', label: 'Reason', type: 'string' },
        { name: 'estimatedImpact', label: 'Estimated Impact', type: 'money' },
        { name: 'scenarioId', label: 'Scenario Id', type: 'string' },
        { name: 'dueDate', label: 'Due Date', type: 'date' },
        { name: 'acceptedAt', label: 'Accepted At', type: 'date' },
        { name: 'rejectedAt', label: 'Rejected At', type: 'date' },
        { name: 'completedAt', label: 'Completed At', type: 'date' },
      ],
      derivedCollections: [
        {
          id: 'ReviewActions',
          name: 'Review Actions',
          entity: 'transaction',
          baseCollection: 'Expenses',
          predicate: 'reviewAction_status != ""',
          examples: ['ReviewActions.Where(status = "required").Count()'],
        },
      ],
      examples: ['Expenses.Where(reviewActionStatus = "required").Count()'],
    },
  ],
}

type PartialMoneySettings = {
  display?: Partial<MoneySettings['display']>
  currency?: Partial<MoneySettings['currency']>
  sync?: Partial<MoneySettings['sync']>
  attention?: Partial<MoneySettings['attention']>
}

export interface VisibleMoneyState {
  raw: RawMoneyData
  debts: MoneyDebt[]
  holdings: MoneyHolding[]
  dataMode: MoneyDataMode
}

export interface BalanceSnapshotQuery {
  startDate?: string
  endDate?: string
  kind?: MoneyBalanceSnapshotKind
}

export function connectionsPath(dataDir: string) {
  return safePath(dataDir, 'connections.json')
}

export function rawDataPath(dataDir: string) {
  return safePath(dataDir, 'raw-money-data.json')
}

export function rawDir(dataDir: string) {
  return safePath(dataDir, 'raw')
}

export function rawPlaidDir(dataDir: string) {
  return safePath(rawDir(dataDir), 'plaid')
}

export function rawPlaidItemDir(dataDir: string, itemId: string) {
  return safePath(rawPlaidDir(dataDir), safeFileSegment(itemId))
}

export function rawPlaidEvidencePath(
  dataDir: string,
  itemId: string,
  evidenceId: string,
) {
  return safePath(
    rawPlaidItemDir(dataDir, itemId),
    `${safeFileSegment(evidenceId)}.json`,
  )
}

export function accountsPath(dataDir: string) {
  return safePath(dataDir, 'accounts.json')
}

export function debtsPath(dataDir: string) {
  return safePath(dataDir, 'debts.json')
}

export function holdingsPath(dataDir: string) {
  return safePath(dataDir, 'holdings.json')
}

export function merchantsPath(dataDir: string) {
  return safePath(dataDir, 'merchants.json')
}

export function personsPath(dataDir: string) {
  return safePath(dataDir, 'persons.json')
}

export function recommendationsPath(dataDir: string) {
  return safePath(dataDir, 'recommendations.json')
}

export function transactionsDir(dataDir: string) {
  return safePath(dataDir, 'transactions')
}

export function balanceSnapshotsDir(dataDir: string) {
  return safePath(dataDir, 'balance-snapshots')
}

export function extensionsDir(dataDir: string) {
  return safePath(dataDir, 'extensions')
}

export function extensionRegistryPath(dataDir: string) {
  return safePath(extensionsDir(dataDir), 'registry.json')
}

export function transactionLabelRulesPath(dataDir: string) {
  return safePath(extensionsDir(dataDir), 'transaction-label-rules.json')
}

export function transactionExtensionsDir(dataDir: string) {
  return safePath(extensionsDir(dataDir), 'transactions')
}

export function transactionExtensionsPath(dataDir: string, namespace: string) {
  return safePath(
    transactionExtensionsDir(dataDir),
    `${safeExtensionNamespace(namespace)}.json`,
  )
}

export function extensionValuesDir(
  dataDir: string,
  entity: MoneyExtensionEntity,
) {
  return entity === 'transaction'
    ? transactionExtensionsDir(dataDir)
    : safePath(extensionsDir(dataDir), `${safeExtensionNamespace(entity)}s`)
}

export function extensionValuesPath(
  dataDir: string,
  entity: MoneyExtensionEntity,
  namespace: string,
) {
  return safePath(
    extensionValuesDir(dataDir, entity),
    `${safeExtensionNamespace(namespace)}.json`,
  )
}

export function extensionProposalsRootDir(dataDir: string) {
  return safePath(extensionsDir(dataDir), 'proposals')
}

export function extensionProposalsDir(
  dataDir: string,
  entity: MoneyExtensionEntity,
) {
  return safePath(
    extensionProposalsRootDir(dataDir),
    `${safeExtensionNamespace(entity)}s`,
  )
}

export function extensionProposalsPath(
  dataDir: string,
  entity: MoneyExtensionEntity,
  namespace: string,
) {
  return safePath(
    extensionProposalsDir(dataDir, entity),
    `${safeExtensionNamespace(namespace)}.json`,
  )
}

export function transactionShardPath(dataDir: string, month: string) {
  return safePath(transactionsDir(dataDir), `${month}.json`)
}

export function balanceSnapshotShardPath(dataDir: string, month: string) {
  return safePath(
    balanceSnapshotsDir(dataDir),
    `${safeFileSegment(month)}.json`,
  )
}

export function syncStatePath(dataDir: string) {
  return safePath(dataDir, 'sync-state.json')
}

export function settingsPath(dataDir: string) {
  return safePath(dataDir, 'settings.json')
}

export function semanticDir(dataDir: string) {
  return safePath(dataDir, 'semantic')
}

export function collectionDefinitionsPath(dataDir: string) {
  return safePath(semanticDir(dataDir), 'collections.json')
}

export function allocationTargetsPath(dataDir: string) {
  return safePath(semanticDir(dataDir), 'allocation-targets.json')
}

export function forecastScenariosPath(dataDir: string) {
  return safePath(semanticDir(dataDir), 'forecast-scenarios.json')
}

export function taxContributionLimitsPath(dataDir: string) {
  return safePath(semanticDir(dataDir), 'tax-contribution-limits.json')
}

export function fxRatesPath(dataDir: string) {
  return safePath(semanticDir(dataDir), 'fx-rates.json')
}

export function metricsDir(dataDir: string) {
  return safePath(dataDir, 'metrics')
}

export function formulaDefinitionsPath(dataDir: string) {
  return safePath(metricsDir(dataDir), 'formulas.json')
}

export function materializedMetricsDir(dataDir: string) {
  return safePath(metricsDir(dataDir), 'materialized')
}

export function materializedMetricPath(dataDir: string, id: string) {
  return safePath(materializedMetricsDir(dataDir), `${id}.json`)
}

export function cardsDir(dataDir: string) {
  return safePath(dataDir, 'cards')
}

export function cardDefinitionsPath(dataDir: string) {
  return safePath(cardsDir(dataDir), 'cards.json')
}

export function dashboardsPath(dataDir: string) {
  return safePath(cardsDir(dataDir), 'dashboards.json')
}

export async function readConnections(c: Context): Promise<MoneyConnection[]> {
  return readJson<MoneyConnection[]>(connectionsPath(getDataDir(c)), [])
}

export async function writeConnections(
  c: Context,
  connections: MoneyConnection[],
): Promise<void> {
  await writeJson(connectionsPath(getDataDir(c)), connections)
}

export async function readRawMoneyData(c: Context): Promise<RawMoneyData> {
  return readJson<RawMoneyData>(rawDataPath(getDataDir(c)), EMPTY_RAW_DATA)
}

export async function writeRawMoneyData(
  c: Context,
  data: RawMoneyData,
): Promise<void> {
  await writeJson(rawDataPath(getDataDir(c)), data)
}

export async function writeRawPlaidSyncEvidence(
  c: Context,
  evidence: RawPlaidSyncEvidence,
): Promise<void> {
  const dataDir = getDataDir(c)
  await fs.mkdir(rawPlaidItemDir(dataDir, evidence.itemId), { recursive: true })
  await writeJson(
    rawPlaidEvidencePath(dataDir, evidence.itemId, evidence.id),
    evidence,
  )
}

export async function readRawPlaidSyncEvidence(
  c: Context,
  options: { itemId?: string; limit?: number; includeResponses?: boolean } = {},
): Promise<Array<RawPlaidSyncEvidence | RawPlaidSyncEvidenceSummary>> {
  const dataDir = getDataDir(c)
  const root = rawPlaidDir(dataDir)
  const itemDirs = options.itemId
    ? [safeFileSegment(options.itemId)]
    : await fs.readdir(root).catch(() => [])
  const entries: RawPlaidSyncEvidence[] = []

  for (const itemDir of itemDirs) {
    const dir = safePath(root, itemDir)
    const files = await fs.readdir(dir).catch(() => [])
    const evidence = await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map((file) =>
          readJson<RawPlaidSyncEvidence | null>(safePath(dir, file), null),
        ),
    )
    entries.push(
      ...evidence.filter((entry): entry is RawPlaidSyncEvidence =>
        Boolean(entry),
      ),
    )
  }

  const limit = clamp(options.limit ?? 20, 1, 100)
  const sorted = entries
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
    .slice(0, limit)

  if (options.includeResponses) return sorted
  return sorted.map(({ responses: _responses, ...summary }) => summary)
}

export async function readAccounts(c: Context): Promise<MoneyAccount[]> {
  const dataDir = getDataDir(c)
  const accounts = await readJson<MoneyAccount[] | null>(
    accountsPath(dataDir),
    null,
  )
  if (accounts) return accounts

  return normalizeRawMoneyData(await readRawMoneyData(c)).accounts
}

export async function writeAccounts(
  c: Context,
  accounts: MoneyAccount[],
): Promise<void> {
  await writeJson(accountsPath(getDataDir(c)), normalizeAccounts(accounts))
}

export async function readDebts(c: Context): Promise<MoneyDebt[]> {
  return normalizeDebts(
    await readJson<MoneyDebt[]>(debtsPath(getDataDir(c)), []),
  )
}

export async function writeDebts(
  c: Context,
  debts: MoneyDebt[],
): Promise<void> {
  await writeJson(debtsPath(getDataDir(c)), normalizeDebts(debts))
}

export async function readHoldings(c: Context): Promise<MoneyHolding[]> {
  return normalizeHoldings(
    await readJson<MoneyHolding[]>(holdingsPath(getDataDir(c)), []),
  )
}

export async function writeHoldings(
  c: Context,
  holdings: MoneyHolding[],
): Promise<void> {
  await writeJson(holdingsPath(getDataDir(c)), normalizeHoldings(holdings))
}

export async function readBalanceSnapshots(
  c: Context,
  query: BalanceSnapshotQuery = {},
): Promise<MoneyBalanceSnapshot[]> {
  const dataDir = getDataDir(c)
  const dir = balanceSnapshotsDir(dataDir)
  const months = transactionMonthsForRange(query.startDate, query.endDate)
  const shardFiles = months
    ? months.map((month) => `${month}.json`)
    : (await fs.readdir(dir).catch(() => [])).filter((entry) =>
        /^\d{4}-\d{2}\.json$/.test(entry),
      )

  const shards = await Promise.all(
    shardFiles.map((entry) =>
      readJson<MoneyBalanceSnapshot[]>(safePath(dir, entry), []),
    ),
  )

  return normalizeBalanceSnapshots(shards.flat())
    .filter((snapshot) => {
      if (query.kind && snapshot.kind !== query.kind) return false
      if (query.startDate && snapshot.date < query.startDate.slice(0, 10))
        return false
      if (query.endDate && snapshot.date > query.endDate.slice(0, 10))
        return false
      return true
    })
    .sort(compareBalanceSnapshots)
}

export async function readVisibleBalanceSnapshots(
  c: Context,
  query: BalanceSnapshotQuery = {},
): Promise<MoneyBalanceSnapshot[]> {
  const [snapshots, settings, visibleState] = await Promise.all([
    readBalanceSnapshots(c, query),
    readSettings(c),
    readVisibleMoneyState(c),
  ])
  const visibleSnapshots = snapshots.filter((snapshot) =>
    sourceMatchesDataMode(snapshot.source, settings.display.dataMode),
  )
  const currentSnapshots = deriveBalanceSnapshots(
    visibleState.raw,
    visibleState.holdings,
  )
  const mergedSnapshots =
    visibleSnapshots.length > 0
      ? mergeCurrentBalanceSnapshots(visibleSnapshots, currentSnapshots)
      : currentSnapshots

  return filterBalanceSnapshots(mergedSnapshots, query).sort(
    compareBalanceSnapshots,
  )
}

function mergeCurrentBalanceSnapshots(
  persisted: MoneyBalanceSnapshot[],
  current: MoneyBalanceSnapshot[],
): MoneyBalanceSnapshot[] {
  const currentIds = new Set(current.map((snapshot) => snapshot.id))
  const currentAggregateDates = new Set(
    current.filter(isAggregateBalanceSnapshot).map((snapshot) => snapshot.date),
  )
  return [
    ...persisted.filter((snapshot) => {
      if (currentIds.has(snapshot.id)) return false
      if (
        isAggregateBalanceSnapshot(snapshot) &&
        currentAggregateDates.has(snapshot.date)
      ) {
        return false
      }
      return true
    }),
    ...current,
  ]
}

function isAggregateBalanceSnapshot(snapshot: MoneyBalanceSnapshot): boolean {
  return (
    snapshot.kind === 'netWorth' ||
    snapshot.kind === 'assets' ||
    snapshot.kind === 'liabilities' ||
    snapshot.kind === 'investment'
  )
}

export async function upsertBalanceSnapshots(
  c: Context,
  incoming: MoneyBalanceSnapshot[],
): Promise<MoneyBalanceSnapshot[]> {
  const dataDir = getDataDir(c)
  const dir = balanceSnapshotsDir(dataDir)
  await fs.mkdir(dir, { recursive: true })

  const normalized = normalizeBalanceSnapshots(incoming)
  const byMonth = new Map<string, MoneyBalanceSnapshot[]>()
  for (const snapshot of normalized) {
    const month = transactionMonth(snapshot.date)
    const entries = byMonth.get(month) ?? []
    entries.push(snapshot)
    byMonth.set(month, entries)
  }

  const written: MoneyBalanceSnapshot[] = []
  await Promise.all(
    [...byMonth.entries()].map(async ([month, entries]) => {
      const path = balanceSnapshotShardPath(dataDir, month)
      const existing = normalizeBalanceSnapshots(
        await readJson<MoneyBalanceSnapshot[]>(path, []),
      )
      const next = upsertById(existing, entries).sort(compareBalanceSnapshots)
      written.push(...next)
      await writeJson(path, next)
    }),
  )
  return written.sort(compareBalanceSnapshots)
}

function filterBalanceSnapshots(
  snapshots: MoneyBalanceSnapshot[],
  query: BalanceSnapshotQuery = {},
): MoneyBalanceSnapshot[] {
  return normalizeBalanceSnapshots(snapshots).filter((snapshot) => {
    if (query.kind && snapshot.kind !== query.kind) return false
    if (query.startDate && snapshot.date < query.startDate.slice(0, 10))
      return false
    if (query.endDate && snapshot.date > query.endDate.slice(0, 10))
      return false
    return true
  })
}

export async function removeBalanceSnapshotsForItem(
  c: Context,
  itemId: string,
): Promise<number> {
  const dataDir = getDataDir(c)
  const dir = balanceSnapshotsDir(dataDir)
  const shardFiles = (await fs.readdir(dir).catch(() => [])).filter((entry) =>
    /^\d{4}-\d{2}\.json$/.test(entry),
  )
  let removed = 0
  await Promise.all(
    shardFiles.map(async (entry) => {
      const path = safePath(dir, entry)
      const existing = normalizeBalanceSnapshots(
        await readJson<MoneyBalanceSnapshot[]>(path, []),
      )
      const next = existing.filter((snapshot) => snapshot.itemId !== itemId)
      removed += existing.length - next.length
      await writeJson(path, next.sort(compareBalanceSnapshots))
    }),
  )
  return removed
}

export async function readRecommendations(
  c: Context,
): Promise<MoneyRecommendation[]> {
  return normalizeRecommendations(
    await readJson<MoneyRecommendation[]>(
      recommendationsPath(getDataDir(c)),
      [],
    ),
  )
}

export async function writeRecommendations(
  c: Context,
  recommendations: MoneyRecommendation[],
): Promise<void> {
  await writeJson(
    recommendationsPath(getDataDir(c)),
    normalizeRecommendations(recommendations),
  )
}

export async function upsertRecommendations(
  c: Context,
  incoming: MoneyRecommendation[],
): Promise<MoneyRecommendation[]> {
  const existing = await readRecommendations(c)
  const next = upsertById(existing, normalizeRecommendations(incoming))
  await writeRecommendations(c, next)
  return next
}

export async function readMerchants(c: Context): Promise<MoneyMerchant[]> {
  return normalizeMerchants(
    await readJson<MoneyMerchant[]>(merchantsPath(getDataDir(c)), []),
  )
}

export async function writeMerchants(
  c: Context,
  merchants: MoneyMerchant[],
): Promise<void> {
  await writeJson(merchantsPath(getDataDir(c)), normalizeMerchants(merchants))
}

export async function readPersons(c: Context): Promise<MoneyPerson[]> {
  return normalizePersons(
    await readJson<MoneyPerson[]>(personsPath(getDataDir(c)), []),
  )
}

export async function writePersons(
  c: Context,
  persons: MoneyPerson[],
): Promise<void> {
  await writeJson(personsPath(getDataDir(c)), normalizePersons(persons))
}

export async function readTransactions(
  c: Context,
): Promise<MoneyTransaction[]> {
  const dataDir = getDataDir(c)
  const [extensions, settings, fxRates] = await Promise.all([
    readTransactionExtensions(c),
    readSettings(c),
    readFxRates(c),
  ])
  const transactions = await readTransactionShards(dataDir)
  if (transactions) {
    return applyTransactionExtensions(
      normalizeTransactions(transactions),
      extensions,
      { settings, fxRates },
    ).sort(compareTransactions)
  }

  return applyTransactionExtensions(
    normalizeRawMoneyData(await readRawMoneyData(c)).transactions,
    extensions,
    { settings, fxRates },
  )
}

async function readTransactionShards(
  dataDir: string,
  months?: string[],
): Promise<MoneyTransaction[] | null> {
  const dir = transactionsDir(dataDir)
  try {
    const entries = await fs.readdir(dir)
    const monthSet = months ? new Set(months) : null
    const allShards = entries
      .filter((entry) => /^\d{4}-\d{2}\.json$/.test(entry))
      .filter((entry) => !monthSet || monthSet.has(entry.slice(0, 7)))
      .sort()

    if (allShards.length > 0) {
      const transactions = await Promise.all(
        allShards.map((entry) =>
          readJson<MoneyTransaction[]>(safePath(dir, entry), []),
        ),
      )
      return transactions.flat()
    }
    if (months && entries.some((entry) => /^\d{4}-\d{2}\.json$/.test(entry))) {
      return []
    }
  } catch {
    // Fall back to raw-money-data.json for workspaces created before shards.
  }

  return null
}

export async function writeTransactions(
  c: Context,
  transactions: MoneyTransaction[],
): Promise<void> {
  const dataDir = getDataDir(c)
  const dir = transactionsDir(dataDir)
  await fs.mkdir(dir, { recursive: true })

  const existing = await fs.readdir(dir).catch(() => [])
  await Promise.all(
    existing
      .filter((entry) => /^\d{4}-\d{2}\.json$/.test(entry))
      .map((entry) => fs.rm(safePath(dir, entry), { force: true })),
  )

  const byMonth = new Map<string, MoneyTransaction[]>()
  for (const transaction of normalizeTransactions(transactions).map(
    stripTransactionRuntimeExtensions,
  )) {
    const month = transactionMonth(transaction.date)
    const entries = byMonth.get(month) ?? []
    entries.push(transaction)
    byMonth.set(month, entries)
  }

  await Promise.all(
    [...byMonth.entries()].map(([month, entries]) =>
      writeJson(
        transactionShardPath(dataDir, month),
        entries.sort(compareTransactions),
      ),
    ),
  )
}

export async function readTransactionExtensions(
  c: Context,
): Promise<MoneyExtensionValue[]> {
  return readExtensionValues(c, { entity: 'transaction' })
}

export async function readExtensionRegistry(
  c: Context,
): Promise<MoneyExtensionRegistry> {
  return normalizeExtensionRegistry(
    await readJson<MoneyExtensionRegistry>(
      extensionRegistryPath(getDataDir(c)),
      DEFAULT_EXTENSION_REGISTRY,
    ),
  )
}

export async function writeExtensionRegistry(
  c: Context,
  registry: MoneyExtensionRegistry,
): Promise<void> {
  await fs.mkdir(extensionsDir(getDataDir(c)), { recursive: true })
  await writeJson(
    extensionRegistryPath(getDataDir(c)),
    normalizeExtensionRegistry(registry),
  )
}

export async function readTransactionLabelRules(
  c: Context,
): Promise<MoneyTransactionLabelRule[]> {
  return normalizeTransactionLabelRules(
    await readJson<MoneyTransactionLabelRule[]>(
      transactionLabelRulesPath(getDataDir(c)),
      [],
    ),
  )
}

export async function writeTransactionLabelRules(
  c: Context,
  rules: MoneyTransactionLabelRule[],
): Promise<void> {
  await fs.mkdir(extensionsDir(getDataDir(c)), { recursive: true })
  await writeJson(
    transactionLabelRulesPath(getDataDir(c)),
    normalizeTransactionLabelRules(rules),
  )
}

export async function readExtensionValues(
  c: Context,
  filters: {
    entity?: MoneyExtensionEntity
    namespace?: string
    entityId?: string
  } = {},
): Promise<MoneyExtensionValue[]> {
  const dataDir = getDataDir(c)
  const entities = filters.entity ? [filters.entity] : MONEY_EXTENSION_ENTITIES
  const values: MoneyExtensionValue[] = []

  for (const entity of entities) {
    const dir = extensionValuesDir(dataDir, entity)
    const namespace = filters.namespace
      ? safeExtensionNamespace(filters.namespace)
      : undefined
    const shardFiles = namespace
      ? [`${namespace}.json`]
      : await fs.readdir(dir).catch(() => [])
    const shards = await Promise.all(
      shardFiles
        .filter((entry) => entry.endsWith('.json'))
        .map((entry) =>
          readJson<MoneyExtensionValue[]>(safePath(dir, entry), []),
        ),
    )
    values.push(...normalizeExtensionValuesForEntity(entity, shards.flat()))
  }

  const namespace = filters.namespace
    ? safeExtensionNamespace(filters.namespace)
    : undefined
  return dedupeExtensionValues(values).filter((extension) => {
    if (namespace && extension.namespace !== namespace) return false
    if (filters.entityId && extension.entityId !== filters.entityId)
      return false
    return true
  })
}

export async function writeExtensionValues(
  c: Context,
  extensions: MoneyExtensionValue[],
): Promise<void> {
  const normalized = dedupeExtensionValues(normalizeExtensionValues(extensions))
  const entitiesWithWrites = new Set(
    normalized.map((extension) => extension.entity),
  )
  if (entitiesWithWrites.size === 0) return
  await replaceExtensionValuesForEntities(
    c,
    [...entitiesWithWrites],
    normalized,
  )
}

async function writeEntityExtensionValues(
  c: Context,
  entity: MoneyExtensionEntity,
  extensions: MoneyExtensionValue[],
): Promise<void> {
  await replaceExtensionValuesForEntities(c, [entity], extensions)
}

async function replaceExtensionValuesForEntities(
  c: Context,
  entities: MoneyExtensionEntity[],
  extensions: MoneyExtensionValue[],
): Promise<void> {
  const dataDir = getDataDir(c)
  const entitySet = new Set(entities)
  const normalized = dedupeExtensionValues(
    normalizeExtensionValues(extensions).filter((extension) =>
      entitySet.has(extension.entity),
    ),
  )
  await Promise.all(
    [...entitySet].map(async (entity) => {
      const dir = extensionValuesDir(dataDir, entity)
      await fs.mkdir(dir, { recursive: true })
      const existing = await fs.readdir(dir).catch(() => [])
      await Promise.all(
        existing
          .filter((entry) => entry.endsWith('.json'))
          .map((entry) => fs.rm(safePath(dir, entry), { force: true })),
      )
    }),
  )

  const byEntityNamespace = new Map<string, MoneyExtensionValue[]>()
  for (const extension of normalized) {
    const key = `${extension.entity}:${extension.namespace}`
    const entries = byEntityNamespace.get(key) ?? []
    entries.push(extension)
    byEntityNamespace.set(key, entries)
  }

  await Promise.all(
    [...byEntityNamespace.entries()].map(([key, entries]) => {
      const [entity, namespace] = key.split(':') as [
        MoneyExtensionEntity,
        string,
      ]
      return writeJson(
        extensionValuesPath(dataDir, entity, namespace),
        entries.sort(compareExtensionValues),
      )
    }),
  )
}

export async function upsertExtensionValues(
  c: Context,
  incoming: MoneyExtensionValue[],
): Promise<MoneyExtensionValue[]> {
  const incomingNormalized = normalizeExtensionValues(incoming)
  const affectedEntities = new Set(
    incomingNormalized.map((extension) => extension.entity),
  )
  const existing = (
    await Promise.all(
      [...affectedEntities].map((entity) => readExtensionValues(c, { entity })),
    )
  ).flat()
  const next = dedupeExtensionValues([...existing, ...incomingNormalized])
  await writeExtensionValues(c, next)
  return next
}

export async function deleteExtensionValue(
  c: Context,
  key: {
    entity: MoneyExtensionEntity
    entityId: string
    namespace: string
  },
): Promise<{
  deleted: MoneyExtensionValue | null
  extensions: MoneyExtensionValue[]
}> {
  const namespace = safeExtensionNamespace(key.namespace)
  const existing = await readExtensionValues(c, { entity: key.entity })
  const deleted =
    existing.find(
      (extension) =>
        extension.entity === key.entity &&
        extension.entityId === key.entityId &&
        extension.namespace === namespace,
    ) ?? null
  const next = existing.filter(
    (extension) =>
      !(
        extension.entity === key.entity &&
        extension.entityId === key.entityId &&
        extension.namespace === namespace
      ),
  )
  await writeEntityExtensionValues(c, key.entity, next)
  return { deleted, extensions: next }
}

export async function readExtensionProposals(
  c: Context,
  filters: {
    entity?: MoneyExtensionEntity
    namespace?: string
    entityId?: string
    status?: MoneyExtensionProposal['status']
  } = {},
): Promise<MoneyExtensionProposal[]> {
  const dataDir = getDataDir(c)
  const entities = filters.entity ? [filters.entity] : MONEY_EXTENSION_ENTITIES
  const proposals: MoneyExtensionProposal[] = []

  for (const entity of entities) {
    const dir = extensionProposalsDir(dataDir, entity)
    const namespace = filters.namespace
      ? safeExtensionNamespace(filters.namespace)
      : undefined
    const shardFiles = namespace
      ? [`${namespace}.json`]
      : await fs.readdir(dir).catch(() => [])
    const shards = await Promise.all(
      shardFiles
        .filter((entry) => entry.endsWith('.json'))
        .map((entry) =>
          readJson<MoneyExtensionProposal[]>(safePath(dir, entry), []),
        ),
    )
    proposals.push(
      ...normalizeExtensionProposalsForEntity(entity, shards.flat()),
    )
  }

  const namespace = filters.namespace
    ? safeExtensionNamespace(filters.namespace)
    : undefined
  return dedupeExtensionProposals(proposals).filter((proposal) => {
    if (namespace && proposal.namespace !== namespace) return false
    if (filters.entityId && proposal.entityId !== filters.entityId) return false
    if (filters.status && proposal.status !== filters.status) return false
    return true
  })
}

export async function upsertExtensionProposals(
  c: Context,
  incoming: MoneyExtensionProposal[],
): Promise<MoneyExtensionProposal[]> {
  const incomingNormalized = normalizeExtensionProposals(incoming)
  const affectedEntities = new Set(
    incomingNormalized.map((proposal) => proposal.entity),
  )
  const existing = (
    await Promise.all(
      [...affectedEntities].map((entity) =>
        readExtensionProposals(c, { entity }),
      ),
    )
  ).flat()
  const next = dedupeExtensionProposals([...existing, ...incomingNormalized])
  await writeExtensionProposalsForEntities(c, [...affectedEntities], next)
  return next
}

async function writeExtensionProposalsForEntities(
  c: Context,
  entities: MoneyExtensionEntity[],
  proposals: MoneyExtensionProposal[],
): Promise<void> {
  const dataDir = getDataDir(c)
  const entitySet = new Set(entities)
  const normalized = dedupeExtensionProposals(
    normalizeExtensionProposals(proposals).filter((proposal) =>
      entitySet.has(proposal.entity),
    ),
  )

  await Promise.all(
    [...entitySet].map(async (entity) => {
      const dir = extensionProposalsDir(dataDir, entity)
      await fs.mkdir(dir, { recursive: true })
      const existing = await fs.readdir(dir).catch(() => [])
      await Promise.all(
        existing
          .filter((entry) => entry.endsWith('.json'))
          .map((entry) => fs.rm(safePath(dir, entry), { force: true })),
      )
    }),
  )

  const byEntityNamespace = new Map<string, MoneyExtensionProposal[]>()
  for (const proposal of normalized) {
    const key = `${proposal.entity}:${proposal.namespace}`
    const entries = byEntityNamespace.get(key) ?? []
    entries.push(proposal)
    byEntityNamespace.set(key, entries)
  }

  await Promise.all(
    [...byEntityNamespace.entries()].map(([key, entries]) => {
      const [entity, namespace] = key.split(':') as [
        MoneyExtensionEntity,
        string,
      ]
      return writeJson(
        extensionProposalsPath(dataDir, entity, namespace),
        entries.sort(compareExtensionProposals),
      )
    }),
  )
}

export async function readMoneyData(c: Context): Promise<RawMoneyData> {
  const [accounts, transactions] = await Promise.all([
    readAccounts(c),
    readTransactions(c),
  ])
  return { accounts, transactions }
}

export async function readVisibleMoneyState(
  c: Context,
): Promise<VisibleMoneyState> {
  const [raw, debts, holdings, settings] = await Promise.all([
    readMoneyData(c),
    readDebts(c),
    readHoldings(c),
    readSettings(c),
  ])
  return filterVisibleMoneyState(
    raw,
    debts,
    holdings,
    settings.display.dataMode,
  )
}

export async function readVisibleMoneyData(c: Context): Promise<RawMoneyData> {
  return (await readVisibleMoneyState(c)).raw
}

export async function readVisibleAccounts(c: Context): Promise<MoneyAccount[]> {
  return (await readVisibleMoneyData(c)).accounts
}

export async function readVisibleTransactions(
  c: Context,
): Promise<MoneyTransaction[]> {
  return (await readVisibleMoneyData(c)).transactions
}

export async function readVisibleDebts(c: Context): Promise<MoneyDebt[]> {
  return (await readVisibleMoneyState(c)).debts
}

export async function readVisibleHoldings(c: Context): Promise<MoneyHolding[]> {
  return (await readVisibleMoneyState(c)).holdings
}

export async function writeMoneyData(c: Context, data: RawMoneyData) {
  const normalized = normalizeRawMoneyData(data)
  const [existingTransactionExtensions, transactionLabelRules] =
    await Promise.all([
      readTransactionExtensions(c),
      readTransactionLabelRules(c),
    ])
  const nextTransactionExtensions = mergeDerivedTransactionExtensions(
    existingTransactionExtensions,
    deriveTransactionExtensions(
      normalized.transactions,
      existingTransactionExtensions,
      transactionLabelRules,
    ),
    transactionLabelRules.map((rule) => rule.namespace),
  )
  await Promise.all([
    writeRawMoneyData(c, normalized),
    writeAccounts(c, normalized.accounts),
    writeTransactions(c, normalized.transactions),
    upsertBalanceSnapshots(c, deriveBalanceSnapshots(normalized)),
    writeRecommendations(c, deriveRecommendationFacts(normalized)),
    writeEntityExtensionValues(c, 'transaction', nextTransactionExtensions),
  ])
}

export async function refreshDerivedTransactionExtensions(
  c: Context,
  extraRuleNamespaces: string[] = [],
): Promise<MoneyExtensionValue[]> {
  const [transactions, existingTransactionExtensions, transactionLabelRules] =
    await Promise.all([
      readTransactions(c),
      readTransactionExtensions(c),
      readTransactionLabelRules(c),
    ])
  const nextTransactionExtensions = mergeDerivedTransactionExtensions(
    existingTransactionExtensions,
    deriveTransactionExtensions(
      transactions,
      existingTransactionExtensions,
      transactionLabelRules,
    ),
    [
      ...transactionLabelRules.map((rule) => rule.namespace),
      ...extraRuleNamespaces,
    ],
  )
  await writeEntityExtensionValues(c, 'transaction', nextTransactionExtensions)
  return nextTransactionExtensions
}

export function mergeRawMoneyData(
  existing: RawMoneyData,
  incoming: RawMoneyData,
): RawMoneyData {
  const existingNormalized = normalizeRawMoneyData(existing)
  const incomingNormalized = normalizeRawMoneyData(incoming)
  const accounts = upsertById<MoneyAccount>(
    existingNormalized.accounts,
    incomingNormalized.accounts,
  )
  const transactions = upsertById<MoneyTransaction>(
    existingNormalized.transactions,
    incomingNormalized.transactions,
  )
  return { accounts, transactions }
}

export function normalizeRawMoneyData(data: RawMoneyData): RawMoneyData {
  return {
    accounts: normalizeAccounts(data.accounts),
    transactions: normalizeTransactions(data.transactions),
  }
}

export function filterVisibleMoneyState(
  data: RawMoneyData,
  debts: MoneyDebt[],
  holdings: MoneyHolding[],
  dataMode: MoneyDataMode,
): VisibleMoneyState {
  const raw = normalizeRawMoneyData(data)
  const normalizedDebts = normalizeDebts(debts)
  const normalizedHoldings = normalizeHoldings(holdings)
  return {
    raw: {
      accounts: raw.accounts.filter((account) =>
        sourceMatchesDataMode(account.source, dataMode),
      ),
      transactions: raw.transactions.filter((transaction) =>
        sourceMatchesDataMode(transaction.source, dataMode),
      ),
    },
    debts: normalizedDebts.filter((debt) =>
      sourceMatchesDataMode(debt.source, dataMode),
    ),
    holdings: normalizedHoldings.filter((holding) =>
      sourceMatchesDataMode(holding.source, dataMode),
    ),
    dataMode,
  }
}

function sourceMatchesDataMode(
  source: string,
  dataMode: MoneyDataMode,
): boolean {
  return dataMode === 'demo' ? source === 'seed' : source !== 'seed'
}

export function normalizeAccounts(accounts: MoneyAccount[]): MoneyAccount[] {
  return accounts.map((account) => {
    const isLiability =
      account.isLiability ??
      (account.currentBalance < 0 ||
        ['credit', 'loan', 'mortgage'].includes(account.type))
    const isAsset =
      account.isAsset ??
      (!isLiability || ['cash', 'investment'].includes(account.type))
    const updatedAt = account.updatedAt ?? account.asOf
    const currencyCode =
      account.currencyCode ??
      account.isoCurrencyCode ??
      account.balance?.currencyCode
    const creditLimit = finitePositiveMoney(
      account.creditLimit ?? account.balance?.limit,
    )
    const usedCredit = Math.abs(account.valueForSum ?? account.currentBalance)
    const availableCredit =
      account.availableCredit ??
      (account.type === 'credit' && creditLimit !== undefined
        ? Math.max(creditLimit - usedCredit, 0)
        : undefined)
    const utilization =
      account.utilization ??
      (account.type === 'credit' && creditLimit && creditLimit > 0
        ? usedCredit / creditLimit
        : undefined)
    const investmentAccountKind = normalizeInvestmentAccountKind(account)
    const taxTreatment = normalizeTaxTreatment({
      ...account,
      investmentAccountKind,
    })
    const liquidity = normalizeAccountLiquidity({
      ...account,
      investmentAccountKind,
      taxTreatment,
    })

    return {
      ...account,
      itemId: account.itemId ?? account.connectionId,
      balance: account.balance ?? {
        current: account.currentBalance,
        currencyCode,
        updatedAt,
      },
      currencyCode,
      valueForSum: account.valueForSum ?? account.currentBalance,
      creditLimit,
      availableCredit,
      utilization,
      investmentAccountKind,
      taxTreatment,
      ...liquidity,
      contributionLimitAnnual: finitePositiveMoney(
        account.contributionLimitAnnual,
      ),
      contributionLimitYear:
        typeof account.contributionLimitYear === 'number' &&
        Number.isFinite(account.contributionLimitYear)
          ? Math.floor(account.contributionLimitYear)
          : undefined,
      isAsset,
      isLiability,
      updatedAt,
    }
  })
}

export function normalizeTransactions(
  transactions: MoneyTransaction[],
): MoneyTransaction[] {
  return transactions.map((transaction) => {
    const direction = normalizedTransactionDirection(transaction)
    const directionChanged = direction !== transaction.direction
    const isIncome = directionChanged
      ? direction === 'income'
      : (transaction.isIncome ?? direction === 'income')
    const isExpense = directionChanged
      ? direction === 'expense'
      : (transaction.isExpense ?? direction === 'expense')
    const valueForSum =
      transaction.valueForSum ??
      (isIncome
        ? transaction.amount
        : isExpense
          ? Math.abs(transaction.amount)
          : transaction.amount)
    const transferReason = normalizedTransferReason(transaction, direction)

    return {
      ...transaction,
      direction,
      itemId: transaction.itemId ?? transaction.connectionId,
      currencyCode: transaction.currencyCode ?? transaction.isoCurrencyCode,
      pending: transaction.pending ?? false,
      valueForSum,
      isIncome,
      isExpense,
      ...(transferReason ? { transferReason } : {}),
    }
  })
}

function normalizedTransactionDirection(
  transaction: MoneyTransaction,
): MoneyTransaction['direction'] {
  if (normalizedTransferReason(transaction, transaction.direction)) {
    return 'transfer'
  }
  return transaction.direction
}

function normalizedTransferReason(
  transaction: MoneyTransaction,
  direction: MoneyTransaction['direction'],
): string | undefined {
  if (transaction.transferReason) return transaction.transferReason
  const categories = new Set(
    [
      ...transaction.category,
      transaction.providerCategoryPrimary,
      transaction.providerCategoryDetailed,
    ].filter((category): category is string => Boolean(category)),
  )
  if (categories.has('LOAN_PAYMENTS_CREDIT_CARD_PAYMENT'))
    return 'credit_card_payment'
  if (categories.has('TRANSFER_IN')) return 'provider_transfer_in'
  if (categories.has('TRANSFER_OUT')) return 'provider_transfer_out'
  if (
    [...categories].some((category) => TRANSFER_CATEGORY_CODES.has(category))
  ) {
    return 'provider_transfer'
  }
  return direction === 'transfer' ? 'explicit_transfer' : undefined
}

export function normalizeExtensionValues(
  extensions: MoneyExtensionValue[],
): MoneyExtensionValue[] {
  return extensions
    .map((extension) => ({
      entity: MONEY_EXTENSION_ENTITIES.includes(extension.entity)
        ? extension.entity
        : 'transaction',
      entityId: extension.entityId,
      namespace: safeExtensionNamespace(extension.namespace),
      values: normalizeExtensionValueRecord(extension.values),
      source: extension.source,
      confidence:
        typeof extension.confidence === 'number' &&
        Number.isFinite(extension.confidence)
          ? clamp(extension.confidence, 0, 1)
          : undefined,
      updatedAt:
        typeof extension.updatedAt === 'string' && extension.updatedAt.trim()
          ? extension.updatedAt
          : new Date().toISOString(),
    }))
    .filter(
      (extension) =>
        extension.entityId &&
        extension.namespace &&
        ['user', 'agent', 'rule', 'provider'].includes(extension.source),
    )
}

function normalizeExtensionValuesForEntity(
  entity: MoneyExtensionEntity,
  extensions: MoneyExtensionValue[],
): MoneyExtensionValue[] {
  return normalizeExtensionValues(
    extensions.map((extension) => {
      return { ...extension, entity }
    }),
  )
}

function normalizeTransactionLabelRules(
  rules: MoneyTransactionLabelRule[],
): MoneyTransactionLabelRule[] {
  const byId = new Map<string, MoneyTransactionLabelRule>()
  for (const rule of rules ?? []) {
    const namespace = safeExtensionNamespace(rule.namespace)
    const id = normalizeEntityId(
      rule.id || `${namespace}-${rule.name ?? 'rule'}`,
    )
    const match = normalizeTransactionLabelRuleMatch(rule.match)
    if (!id || !namespace || Object.keys(match).length === 0) continue
    byId.set(id, {
      id,
      name:
        typeof rule.name === 'string' && rule.name.trim()
          ? rule.name.trim()
          : undefined,
      scope: rule.scope === 'pattern' ? 'pattern' : 'merchant',
      status: rule.status === 'disabled' ? 'disabled' : 'active',
      namespace,
      values: normalizeExtensionValueRecord(rule.values),
      match,
      createdBy: rule.createdBy === 'agent' ? 'agent' : 'user',
      confidence:
        typeof rule.confidence === 'number' && Number.isFinite(rule.confidence)
          ? clamp(rule.confidence, 0, 1)
          : undefined,
      createdAt:
        typeof rule.createdAt === 'string' && rule.createdAt.trim()
          ? rule.createdAt
          : new Date().toISOString(),
      updatedAt:
        typeof rule.updatedAt === 'string' && rule.updatedAt.trim()
          ? rule.updatedAt
          : new Date().toISOString(),
    })
  }
  return [...byId.values()].sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  )
}

function normalizeTransactionLabelRuleMatch(
  match: MoneyTransactionLabelRuleMatch,
): MoneyTransactionLabelRuleMatch {
  const normalized: MoneyTransactionLabelRuleMatch = {}
  const merchantIds = (match?.merchantIds ?? [])
    .map(normalizeEntityId)
    .filter(Boolean)
  if (merchantIds.length > 0) normalized.merchantIds = [...new Set(merchantIds)]
  const merchantNames = (match?.merchantNames ?? [])
    .map((name) => name.trim())
    .filter(Boolean)
  if (merchantNames.length > 0)
    normalized.merchantNames = [...new Set(merchantNames)]
  if (typeof match?.textPattern === 'string' && match.textPattern.trim()) {
    normalized.textPattern = match.textPattern.trim()
  }
  if (typeof match?.q === 'string' && match.q.trim())
    normalized.q = match.q.trim()
  if (typeof match?.accountId === 'string' && match.accountId.trim()) {
    normalized.accountId = match.accountId.trim()
  }
  if (match?.direction) normalized.direction = match.direction
  if (typeof match?.category === 'string' && match.category.trim()) {
    normalized.category = match.category.trim()
  }
  if (typeof match?.currencyCode === 'string' && match.currencyCode.trim()) {
    normalized.currencyCode = match.currencyCode.trim().toUpperCase()
  }
  if (
    typeof match?.minAmount === 'number' &&
    Number.isFinite(match.minAmount)
  ) {
    normalized.minAmount = Math.max(0, match.minAmount)
  }
  if (
    typeof match?.maxAmount === 'number' &&
    Number.isFinite(match.maxAmount)
  ) {
    normalized.maxAmount = Math.max(0, match.maxAmount)
  }
  if (
    typeof match?.startDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(match.startDate)
  ) {
    normalized.startDate = match.startDate
  }
  if (
    typeof match?.endDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(match.endDate)
  ) {
    normalized.endDate = match.endDate
  }
  return normalized
}

export function normalizeExtensionProposals(
  proposals: MoneyExtensionProposal[],
): MoneyExtensionProposal[] {
  return proposals
    .map((proposal) => {
      const now = new Date().toISOString()
      const entity = MONEY_EXTENSION_ENTITIES.includes(proposal.entity)
        ? proposal.entity
        : 'transaction'
      const namespace = safeExtensionNamespace(proposal.namespace)
      const entityId = proposal.entityId?.trim()
      return {
        ...proposal,
        id: normalizeEntityId(
          proposal.id || `${entity}-${entityId || 'unknown'}-${namespace}`,
        ),
        entity,
        entityId,
        namespace,
        values: normalizeExtensionValueRecord(proposal.values),
        source: ['agent', 'rule', 'provider'].includes(proposal.source)
          ? proposal.source
          : 'agent',
        confidence:
          typeof proposal.confidence === 'number' &&
          Number.isFinite(proposal.confidence)
            ? clamp(proposal.confidence, 0, 1)
            : undefined,
        reason:
          typeof proposal.reason === 'string' && proposal.reason.trim()
            ? proposal.reason.trim()
            : undefined,
        status: normalizeExtensionProposalStatus(proposal.status),
        model:
          typeof proposal.model === 'string' && proposal.model.trim()
            ? proposal.model.trim()
            : undefined,
        batchId:
          typeof proposal.batchId === 'string' && proposal.batchId.trim()
            ? normalizeEntityId(proposal.batchId)
            : undefined,
        createdAt: proposal.createdAt ?? proposal.updatedAt ?? now,
        updatedAt: proposal.updatedAt ?? now,
        decidedAt: proposal.decidedAt,
        decisionReason:
          typeof proposal.decisionReason === 'string' &&
          proposal.decisionReason.trim()
            ? proposal.decisionReason.trim()
            : undefined,
      }
    })
    .filter(
      (proposal) => proposal.id && proposal.entityId && proposal.namespace,
    )
    .sort(compareExtensionProposals)
}

function normalizeExtensionProposalsForEntity(
  entity: MoneyExtensionEntity,
  proposals: MoneyExtensionProposal[],
): MoneyExtensionProposal[] {
  return normalizeExtensionProposals(
    proposals.map((proposal) => ({ ...proposal, entity })),
  )
}

export function normalizeExtensionRegistry(
  registry: MoneyExtensionRegistry,
): MoneyExtensionRegistry {
  const byEntityNamespace = new Map<string, MoneyExtensionDefinition>()
  for (const extension of registry.extensions ?? []) {
    const namespace = safeExtensionNamespace(extension.namespace)
    if (!namespace || !MONEY_EXTENSION_ENTITIES.includes(extension.entity))
      continue
    byEntityNamespace.set(`${extension.entity}:${namespace}`, {
      namespace,
      label: extension.label?.trim() || titleFromNamespace(namespace),
      entity: extension.entity,
      description: extension.description,
      coverage: normalizeExtensionCoverage(extension.coverage, namespace),
      fields: (extension.fields ?? [])
        .map((field) => ({
          name: safeExtensionNamespace(field.name),
          label: field.label?.trim() || titleFromNamespace(field.name),
          type: field.type,
          required: field.required,
          enumValues: field.enumValues?.filter(Boolean),
          description: field.description,
          formulaAliases: field.formulaAliases
            ?.map(safeExtensionNamespace)
            .filter(Boolean),
        }))
        .filter(
          (field) =>
            field.name &&
            [
              'string',
              'number',
              'boolean',
              'date',
              'money',
              'percent',
              'enum',
            ].includes(field.type),
        ),
      derivedCollections: (extension.derivedCollections ?? []).map(
        (collection) => ({
          id: collection.id,
          name: collection.name,
          entity: collection.entity,
          baseCollection: collection.baseCollection,
          predicate: collection.predicate,
          description: collection.description,
          examples: collection.examples,
        }),
      ),
      examples: extension.examples,
    })
  }

  return {
    version:
      typeof registry.version === 'number' && Number.isFinite(registry.version)
        ? Math.max(1, Math.floor(registry.version))
        : 1,
    extensions: [...byEntityNamespace.values()].sort(
      (a, b) =>
        a.entity.localeCompare(b.entity) ||
        a.namespace.localeCompare(b.namespace),
    ),
  }
}

function normalizeExtensionCoverage(
  coverage: MoneyExtensionDefinition['coverage'],
  namespace: string,
): NonNullable<MoneyExtensionDefinition['coverage']> {
  if (coverage === 'exhaustive' || coverage === 'sparse') return coverage
  return namespace === 'budget' ? 'exhaustive' : 'sparse'
}

function dedupeExtensionValues(
  extensions: MoneyExtensionValue[],
): MoneyExtensionValue[] {
  const byKey = new Map<string, MoneyExtensionValue>()
  for (const extension of extensions) {
    byKey.set(
      `${extension.entity}:${extension.entityId}:${extension.namespace}`,
      extension,
    )
  }
  return [...byKey.values()].sort(compareExtensionValues)
}

function dedupeExtensionProposals(
  proposals: MoneyExtensionProposal[],
): MoneyExtensionProposal[] {
  const byId = new Map<string, MoneyExtensionProposal>()
  for (const proposal of proposals) {
    byId.set(proposal.id, proposal)
  }
  return [...byId.values()].sort(compareExtensionProposals)
}

function compareExtensionValues(
  a: MoneyExtensionValue,
  b: MoneyExtensionValue,
): number {
  return (
    a.entity.localeCompare(b.entity) ||
    a.namespace.localeCompare(b.namespace) ||
    a.entityId.localeCompare(b.entityId)
  )
}

function compareExtensionProposals(
  a: MoneyExtensionProposal,
  b: MoneyExtensionProposal,
): number {
  return (
    extensionProposalStatusRank(a.status) -
      extensionProposalStatusRank(b.status) ||
    b.updatedAt.localeCompare(a.updatedAt) ||
    a.entity.localeCompare(b.entity) ||
    a.namespace.localeCompare(b.namespace) ||
    a.entityId.localeCompare(b.entityId) ||
    a.id.localeCompare(b.id)
  )
}

function normalizeExtensionProposalStatus(
  status: MoneyExtensionProposal['status'],
): MoneyExtensionProposal['status'] {
  return status === 'accepted' || status === 'rejected' ? status : 'pending'
}

function extensionProposalStatusRank(
  status: MoneyExtensionProposal['status'],
): number {
  if (status === 'pending') return 0
  if (status === 'accepted') return 1
  return 2
}

function normalizeExtensionValueRecord(
  values: Record<string, MoneyExtensionPrimitive>,
): Record<string, MoneyExtensionPrimitive> {
  const normalized: Record<string, MoneyExtensionPrimitive> = {}
  for (const [key, value] of Object.entries(values ?? {})) {
    if (!safeExtensionNamespace(key)) continue
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      normalized[key] = value
    }
  }
  return normalized
}

function applyTransactionExtensions(
  transactions: MoneyTransaction[],
  extensions: MoneyExtensionValue[],
  options: { settings?: MoneySettings; fxRates?: MoneyFxRate[] } = {},
): MoneyTransaction[] {
  if (extensions.length === 0) return transactions

  const byTransaction = new Map<
    string,
    Record<string, Record<string, MoneyExtensionPrimitive>>
  >()
  for (const extension of extensions.filter(
    (entry) => entry.entity === 'transaction',
  )) {
    const existing = byTransaction.get(extension.entityId) ?? {}
    existing[extension.namespace] = {
      ...(existing[extension.namespace] ?? {}),
      ...extension.values,
    }
    byTransaction.set(extension.entityId, existing)
  }

  const anchorDate = latestTransactionAnchorDate(transactions)
  return transactions.map((transaction) => {
    const transactionExtensions = byTransaction.get(transaction.id)
    if (!transactionExtensions) return transaction
    const subscription = transactionExtensions.subscription
    const recurringObligation = transactionExtensions.recurringObligation
    const subscriptionActive = recurringExtensionIsActive(
      subscription,
      anchorDate,
    )
    const obligationActive = recurringExtensionIsActive(
      recurringObligation,
      anchorDate,
    )
    const hasRecurringOverride =
      subscriptionActive !== undefined || obligationActive !== undefined
    const recurring =
      subscriptionActive === true ||
      obligationActive === true ||
      (!hasRecurringOverride && transaction.recurring)
    const mergedExtensions = {
      ...(transaction.extensions ?? {}),
      ...transactionExtensions,
    }
    const moneyFlow = mergedExtensions.moneyFlow
      ? mergeMoneyFlowReportingValues(
          transaction,
          mergedExtensions.moneyFlow,
          options.settings,
          options.fxRates,
        )
      : undefined
    return applyMoneyFlowTransactionSemantics({
      ...transaction,
      recurring,
      extensions: {
        ...mergedExtensions,
        ...(moneyFlow ? { moneyFlow } : {}),
      },
    })
  })
}

function applyMoneyFlowTransactionSemantics(
  transaction: MoneyTransaction,
): MoneyTransaction {
  const values = transaction.extensions?.moneyFlow
  if (!values || values.status === 'dismissed') return transaction
  const role = typeof values.role === 'string' ? values.role : undefined
  if (!role || role === 'ignored') return transaction

  if (role === 'fee' || role === 'external_spend') {
    const amount = Math.abs(
      moneyFlowNumber(values.reportingValue) ??
        moneyFlowNumber(values.feeAmount) ??
        transaction.valueForSum ??
        transaction.amount,
    )
    const { transferReason: _transferReason, ...rest } = transaction
    return {
      ...rest,
      direction: 'expense',
      isIncome: false,
      isExpense: true,
      valueForSum: amount,
    }
  }

  return {
    ...transaction,
    direction: 'transfer',
    isIncome: false,
    isExpense: false,
    valueForSum: Math.abs(
      moneyFlowNumber(values.reportingValue) ??
        moneyFlowNumber(values.sourceAmount) ??
        transaction.valueForSum ??
        transaction.amount,
    ),
    transferReason: transaction.transferReason ?? 'money_flow_transfer',
  }
}

function moneyFlowNumber(
  value: MoneyExtensionPrimitive | undefined,
): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function recurringExtensionIsActive(
  values: Record<string, MoneyExtensionPrimitive> | undefined,
  anchorDate?: Date,
): boolean | undefined {
  if (!values) return undefined
  if (values.active === false) return false
  if (values.status === 'skipped' || values.status === 'dismissed') return false
  if (recurringExtensionIsStale(values, anchorDate)) return false
  if (values.active === true) return true
  if (values.status === 'active') return true
  if (typeof values.cadence === 'string' && values.cadence.length > 0)
    return true
  return undefined
}

function recurringExtensionIsStale(
  values: Record<string, MoneyExtensionPrimitive>,
  anchorDate?: Date,
): boolean {
  if (!anchorDate) return false
  const nextDueDate =
    typeof values.nextDueDate === 'string' ? values.nextDueDate : undefined
  if (!nextDueDate) return false
  const dueMillis = Date.parse(`${nextDueDate.slice(0, 10)}T00:00:00Z`)
  if (!Number.isFinite(dueMillis)) return false
  const intervalDays = recurringIntervalDays(values)
  const graceDays = Math.max(14, Math.min(90, intervalDays * 1.5))
  const staleBefore = new Date(anchorDate)
  staleBefore.setUTCDate(staleBefore.getUTCDate() - graceDays)
  return (
    dueMillis <
    Date.UTC(
      staleBefore.getUTCFullYear(),
      staleBefore.getUTCMonth(),
      staleBefore.getUTCDate(),
    )
  )
}

function recurringIntervalDays(
  values: Record<string, MoneyExtensionPrimitive>,
): number {
  if (
    typeof values.intervalDays === 'number' &&
    Number.isFinite(values.intervalDays)
  ) {
    return Math.max(1, values.intervalDays)
  }
  if (values.cadence === 'weekly') return 7
  if (values.cadence === 'quarterly') return 91
  if (values.cadence === 'yearly') return 365
  return 30
}

function latestTransactionAnchorDate(
  transactions: MoneyTransaction[],
): Date | undefined {
  return transactions
    .map((transaction) =>
      Date.parse(`${transaction.date.slice(0, 10)}T00:00:00Z`),
    )
    .filter((millis) => Number.isFinite(millis))
    .sort((a, b) => b - a)
    .map((millis) => new Date(millis))[0]
}

function stripTransactionRuntimeExtensions(
  transaction: MoneyTransaction,
): MoneyTransaction {
  const { extensions: _extensions, ...persisted } = transaction
  return persisted
}

export function normalizeDebts(debts: MoneyDebt[]): MoneyDebt[] {
  return debts.map((debt) => {
    const balance = Math.abs(debt.balance)
    const creditLimit = finitePositiveMoney(debt.creditLimit)
    const statementBalance =
      typeof debt.statementBalance === 'number' &&
      Number.isFinite(debt.statementBalance)
        ? debt.statementBalance
        : undefined
    const availableCredit =
      debt.availableCredit ??
      (debt.type === 'credit' && creditLimit !== undefined
        ? Math.max(creditLimit - balance, 0)
        : undefined)
    const utilization =
      debt.utilization ??
      (debt.type === 'credit' && creditLimit && creditLimit > 0
        ? balance / creditLimit
        : undefined)
    return {
      ...debt,
      balance,
      creditLimit,
      availableCredit,
      statementBalance,
      utilization,
      itemId: debt.itemId ?? debt.connectionId,
      updatedAt: debt.updatedAt ?? new Date().toISOString(),
    }
  })
}

export function normalizeHoldings(holdings: MoneyHolding[]): MoneyHolding[] {
  return holdings.map((holding) => ({
    ...holding,
    itemId: holding.itemId ?? holding.connectionId,
    assetClass: normalizeInvestmentAssetClass(holding),
    investmentAccountKind: normalizeInvestmentAccountKind({
      type: 'investment',
      subtype: holding.accountSubtype,
      name: holding.accountName ?? holding.name,
      officialName: undefined,
      investmentAccountKind: holding.investmentAccountKind,
    }),
    taxTreatment: normalizeTaxTreatment({
      type: 'investment',
      subtype: holding.accountSubtype,
      name: holding.accountName ?? holding.name,
      officialName: undefined,
      investmentAccountKind: holding.investmentAccountKind,
      taxTreatment: holding.taxTreatment,
    }),
    marketValue:
      holding.marketValue ??
      Math.max(0, holding.quantity) * Math.max(0, holding.price),
  }))
}

export function normalizeBalanceSnapshots(
  snapshots: MoneyBalanceSnapshot[],
): MoneyBalanceSnapshot[] {
  return snapshots
    .map((snapshot) => {
      const kind = normalizeBalanceSnapshotKind(snapshot.kind)
      const date = normalizeSnapshotDate(snapshot.date || snapshot.asOf)
      const asOf = normalizeSnapshotDateTime(snapshot.asOf || date)
      const id = normalizeEntityId(
        snapshot.id ||
          [
            snapshot.kind,
            snapshot.accountId,
            snapshot.holdingId,
            snapshot.name,
            date,
          ]
            .filter(Boolean)
            .join('-'),
      )
      return {
        ...snapshot,
        id,
        source: normalizeFactSource(snapshot.source),
        kind,
        date,
        asOf,
        value: finiteMoney(snapshot.value),
        currencyCode: snapshot.currencyCode,
        createdAt: normalizeSnapshotDateTime(snapshot.createdAt || asOf),
      }
    })
    .filter((snapshot) => snapshot.id && Number.isFinite(snapshot.value))
}

export function deriveBalanceSnapshots(
  data: RawMoneyData,
  holdings: MoneyHolding[] = [],
  generatedAt = new Date().toISOString(),
): MoneyBalanceSnapshot[] {
  const accounts = normalizeAccounts(data.accounts)
  const normalizedHoldings = normalizeHoldings(holdings)
  const snapshots: MoneyBalanceSnapshot[] = []

  for (const account of accounts) {
    const date = normalizeSnapshotDate(account.updatedAt ?? account.asOf)
    const value = accountNetWorthContribution(account)
    snapshots.push({
      id: normalizeEntityId(`account-${account.id}-${date}`),
      source: account.source,
      kind: 'account',
      date,
      asOf: account.updatedAt ?? account.asOf,
      value,
      currencyCode: account.currencyCode ?? account.isoCurrencyCode,
      accountId: account.id,
      itemId: account.itemId,
      institutionName: account.institutionName,
      name: account.name,
      accountType: account.type,
      accountSubtype: account.subtype,
      createdAt: generatedAt,
    })
  }

  for (const holding of normalizedHoldings) {
    const date = normalizeSnapshotDate(holding.asOf)
    snapshots.push({
      id: normalizeEntityId(`holding-${holding.id}-${date}`),
      source: holding.source,
      kind: 'holding',
      date,
      asOf: holding.asOf,
      value: holding.marketValue,
      currencyCode: holding.currencyCode,
      accountId: holding.accountId,
      holdingId: holding.id,
      itemId: holding.itemId,
      institutionName: holding.institutionName,
      name: holding.tickerSymbol ?? holding.name,
      accountSubtype: holding.accountSubtype,
      assetClass: holding.assetClass,
      createdAt: generatedAt,
    })
  }

  const aggregateDate =
    latestSnapshotInputDate(accounts, normalizedHoldings) ??
    normalizeSnapshotDate(generatedAt)
  const aggregateSource = aggregateSnapshotSource(accounts, normalizedHoldings)
  const netWorth = accounts.reduce(
    (total, account) => total + accountNetWorthContribution(account),
    0,
  )
  const assets = accounts.reduce(
    (total, account) =>
      account.isAsset && !account.isLiability
        ? total + Math.max(0, account.valueForSum ?? account.currentBalance)
        : total,
    0,
  )
  const liabilities = accounts.reduce(
    (total, account) =>
      account.isLiability
        ? total + Math.abs(account.valueForSum ?? account.currentBalance)
        : total,
    0,
  )
  const investmentValue =
    normalizedHoldings.length > 0
      ? normalizedHoldings.reduce(
          (total, holding) => total + holding.marketValue,
          0,
        )
      : accounts.reduce(
          (total, account) =>
            isInvestmentLikeAccount(account)
              ? total +
                Math.max(0, account.valueForSum ?? account.currentBalance)
              : total,
          0,
        )
  const hasInvestmentFacts =
    normalizedHoldings.length > 0 || accounts.some(isInvestmentLikeAccount)

  snapshots.push(
    aggregateBalanceSnapshot(
      'netWorth',
      netWorth,
      aggregateDate,
      aggregateSource,
      generatedAt,
    ),
    aggregateBalanceSnapshot(
      'assets',
      assets,
      aggregateDate,
      aggregateSource,
      generatedAt,
    ),
    aggregateBalanceSnapshot(
      'liabilities',
      liabilities,
      aggregateDate,
      aggregateSource,
      generatedAt,
    ),
  )
  if (hasInvestmentFacts) {
    snapshots.push(
      aggregateBalanceSnapshot(
        'investment',
        investmentValue,
        aggregateDate,
        aggregateSource,
        generatedAt,
      ),
    )
  }

  return normalizeBalanceSnapshots(snapshots)
}

function isInvestmentLikeAccount(account: MoneyAccount): boolean {
  return account.type === 'investment' || Boolean(account.investmentAccountKind)
}

export function normalizeMerchants(
  merchants: MoneyMerchant[],
): MoneyMerchant[] {
  return merchants
    .map((merchant) => ({
      ...merchant,
      id: normalizeEntityId(merchant.id || merchant.name),
      name: merchant.name?.trim() || titleFromNamespace(merchant.id),
      transactionCount: Math.max(0, Math.floor(merchant.transactionCount ?? 0)),
      income: finiteMoney(merchant.income),
      expenses: finiteMoney(merchant.expenses),
      netAmount: Number.isFinite(merchant.netAmount)
        ? merchant.netAmount
        : finiteMoney(merchant.income) - finiteMoney(merchant.expenses),
      updatedAt: merchant.updatedAt ?? new Date().toISOString(),
    }))
    .filter((merchant) => merchant.id && merchant.name)
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
}

export function normalizePersons(persons: MoneyPerson[]): MoneyPerson[] {
  return persons
    .map((person) => ({
      ...person,
      id: normalizeEntityId(person.id || person.name),
      name: person.name?.trim() || titleFromNamespace(person.id),
      transactionCount: Math.max(0, Math.floor(person.transactionCount ?? 0)),
      amountOwedToMe: finiteMoney(person.amountOwedToMe),
      amountIOwe: finiteMoney(person.amountIOwe),
      amountSettled: finiteMoney(person.amountSettled),
      updatedAt: person.updatedAt ?? new Date().toISOString(),
    }))
    .filter((person) => person.id && person.name)
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
}

export function normalizeRecommendations(
  recommendations: MoneyRecommendation[],
): MoneyRecommendation[] {
  return recommendations
    .map((recommendation) => {
      const id = normalizeEntityId(recommendation.id || recommendation.title)
      const now = new Date().toISOString()
      return {
        ...recommendation,
        id,
        kind: normalizeRecommendationKind(recommendation.kind),
        status: normalizeRecommendationStatus(recommendation.status),
        severity: normalizeRecommendationSeverity(recommendation.severity),
        title: recommendation.title?.trim() || titleFromNamespace(id),
        source: ['user', 'agent', 'rule', 'provider'].includes(
          recommendation.source,
        )
          ? recommendation.source
          : 'rule',
        confidence:
          typeof recommendation.confidence === 'number' &&
          Number.isFinite(recommendation.confidence)
            ? clamp(recommendation.confidence, 0, 1)
            : undefined,
        estimatedImpact: finiteMoney(recommendation.estimatedImpact),
        sourceLinks: (recommendation.sourceLinks ?? [])
          .filter((link) => MONEY_EXTENSION_ENTITIES.includes(link.entity))
          .map((link) => ({
            entity: link.entity,
            entityId: link.entityId,
          }))
          .filter((link) => link.entityId),
        createdAt: recommendation.createdAt ?? recommendation.updatedAt ?? now,
        updatedAt: recommendation.updatedAt ?? now,
      }
    })
    .filter((recommendation) => recommendation.id && recommendation.title)
    .sort((a, b) => {
      const statusCompare =
        recommendationStatusRank(a.status) - recommendationStatusRank(b.status)
      if (statusCompare !== 0) return statusCompare
      const severityCompare =
        recommendationSeverityRank(b.severity) -
        recommendationSeverityRank(a.severity)
      if (severityCompare !== 0) return severityCompare
      return b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id)
    })
}

export function buildMerchantFacts(
  transactions: MoneyTransaction[],
  extensions: MoneyExtensionValue[] = [],
): MoneyMerchant[] {
  const byId = new Map<string, MoneyMerchant>()
  const merchantGroups = merchantGroupsByTransactionId(extensions)
  const now = new Date().toISOString()
  for (const transaction of normalizeTransactions(transactions)) {
    const group = merchantGroups.get(transaction.id)
    const rawName = group?.name ?? transaction.merchantName ?? transaction.name
    const id = normalizeEntityId(group?.merchantId ?? rawName)
    if (!id) continue
    const existing = byId.get(id) ?? {
      id,
      source: 'derived' as const,
      name: rawName,
      transactionCount: 0,
      income: 0,
      expenses: 0,
      netAmount: 0,
      updatedAt: now,
    }
    existing.transactionCount += 1
    if (transaction.direction === 'income') {
      existing.income += transaction.valueForSum ?? transaction.amount
    } else if (transaction.direction === 'expense') {
      existing.expenses += transaction.valueForSum ?? transaction.amount
    }
    existing.netAmount = existing.income - existing.expenses
    existing.lastTransactionDate = laterDate(
      existing.lastTransactionDate,
      transaction.date,
    )
    byId.set(id, existing)
  }
  return normalizeMerchants([...byId.values()])
}

function merchantGroupsByTransactionId(
  extensions: MoneyExtensionValue[],
): Map<string, { merchantId: string; name?: string }> {
  const groups = new Map<string, { merchantId: string; name?: string }>()
  for (const extension of normalizeExtensionValues(extensions)) {
    if (
      extension.entity !== 'transaction' ||
      extension.namespace !== 'merchantGroup'
    ) {
      continue
    }
    if (extension.values.status === 'dismissed') continue
    const merchantId = stringValue(extension.values.merchantId)
    if (!merchantId) continue
    groups.set(extension.entityId, {
      merchantId,
      name: stringValue(extension.values.name),
    })
  }
  return groups
}

export function buildPersonFacts(
  extensions: MoneyExtensionValue[],
): MoneyPerson[] {
  const byId = new Map<string, MoneyPerson>()
  const now = new Date().toISOString()
  for (const extension of normalizeExtensionValues(extensions)) {
    if (extension.entity === 'person') {
      const id = normalizeEntityId(extension.entityId)
      const name = stringValue(extension.values.name) ?? titleFromNamespace(id)
      const existing = byId.get(id) ?? {
        id,
        source: 'manual' as const,
        name,
        transactionCount: 0,
        amountOwedToMe: 0,
        amountIOwe: 0,
        amountSettled: 0,
        updatedAt: extension.updatedAt,
      }
      existing.name = name
      existing.updatedAt = laterDateTime(
        existing.updatedAt,
        extension.updatedAt,
      )
      byId.set(id, existing)
      continue
    }

    if (extension.entity !== 'transaction') continue
    const personId = stringValue(extension.values.personId)
    if (!personId) continue
    const id = normalizeEntityId(personId)
    const amount = Math.abs(numberValue(extension.values.amount))
    const status = stringValue(extension.values.status)
    const existing = byId.get(id) ?? {
      id,
      source: 'derived' as const,
      name: titleFromNamespace(id),
      transactionCount: 0,
      amountOwedToMe: 0,
      amountIOwe: 0,
      amountSettled: 0,
      updatedAt: now,
    }
    existing.transactionCount += 1
    if (status === 'owed') existing.amountOwedToMe += amount
    if (status === 'iOwe' || status === 'i_owe') existing.amountIOwe += amount
    if (status === 'paid') existing.amountSettled += amount
    existing.lastActivityDate = laterDate(
      existing.lastActivityDate,
      extension.updatedAt.slice(0, 10),
    )
    existing.updatedAt = laterDateTime(existing.updatedAt, extension.updatedAt)
    byId.set(id, existing)
  }
  return normalizePersons([...byId.values()])
}

export function mergeMerchants(
  derived: MoneyMerchant[],
  stored: MoneyMerchant[],
): MoneyMerchant[] {
  return mergeEntityFacts(
    normalizeMerchants(derived),
    normalizeMerchants(stored),
  )
}

export function mergePersons(
  derived: MoneyPerson[],
  stored: MoneyPerson[],
): MoneyPerson[] {
  return mergeEntityFacts(normalizePersons(derived), normalizePersons(stored))
}

function deriveTransactionExtensions(
  transactions: MoneyTransaction[],
  existingTransactionExtensions: MoneyExtensionValue[] = [],
  transactionLabelRules: MoneyTransactionLabelRule[] = [],
): MoneyExtensionValue[] {
  return [
    ...deriveRecurringExtensions(transactions, existingTransactionExtensions),
    ...deriveTaxContributionExtensions(transactions),
    ...deriveReviewActionExtensions(transactions),
    ...deriveTransactionLabelRuleExtensions(
      transactions,
      existingTransactionExtensions,
      transactionLabelRules,
    ),
  ]
}

type RecurringCadence =
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'irregular'

type RecurringSeries = {
  key: string
  name: string
  namespace: 'subscription' | 'recurringObligation'
  cadence: RecurringCadence
  intervalDays: number
  monthlyAmount: number
  lastDate: string
  nextDueDate: string
  confidence: number
  observedCount: number
  firstDate: string
  amountVariancePercent: number
  need: 'required' | 'useful'
  transactions: MoneyTransaction[]
}

const RECURRING_RULE_NAMESPACES = new Set([
  'subscription',
  'recurringObligation',
])
const TRANSACTION_RULE_NAMESPACES = new Set([
  ...RECURRING_RULE_NAMESPACES,
  'taxContribution',
  'reviewAction',
])

const OBLIGATION_PATTERN =
  /\b(rent|mortgage|insurance|utility|utilities|electric|electricity|gas|water|sewer|internet|phone|cell|mobile|loan|student loan|car payment|auto payment|hoa|property tax|childcare|daycare)\b/i
const TAX_CONTRIBUTION_ACTION_PATTERN =
  /\b(contribution|contrib|deposit|transfer|deferral|payroll|employee|employer)\b/i
const TAX_CONTRIBUTION_NEGATIVE_PATTERN =
  /\b(distribution|withdrawal|refund|reversal|reimbursement|rollover out)\b/i
const DISCRETIONARY_SPEND_PATTERN =
  /\b(restaurant|dining|bar|coffee|shopping|retail|travel|hotel|airline|entertainment|concert|ticket|gaming|app store|luxury)\b/i
const ESSENTIAL_SPEND_PATTERN =
  /\b(rent|mortgage|utility|utilities|insurance|grocery|groceries|pharmacy|medical|doctor|childcare|daycare|tuition|tax)\b/i

export function deriveRecurringExtensions(
  transactions: MoneyTransaction[],
  extensions: MoneyExtensionValue[] = [],
): MoneyExtensionValue[] {
  const groups = new Map<string, MoneyTransaction[]>()
  const merchantGroups = merchantGroupsByTransactionId(extensions)
  for (const transaction of normalizeTransactions(transactions)) {
    if (!transaction.isExpense || transaction.pending) continue
    const key = recurringTransactionKey(transaction, merchantGroups)
    if (!key) continue
    const entries = groups.get(key) ?? []
    entries.push(transaction)
    groups.set(key, entries)
  }

  const now = new Date().toISOString()
  return [...groups.entries()]
    .map(([key, entries]) => inferRecurringSeries(key, entries, merchantGroups))
    .filter((series): series is RecurringSeries => Boolean(series))
    .flatMap((series) =>
      series.transactions.map((transaction) => {
        const cadence =
          series.namespace === 'subscription' && series.cadence === 'quarterly'
            ? 'irregular'
            : series.cadence
        return {
          entity: 'transaction' as const,
          entityId: transaction.id,
          namespace: series.namespace,
          source: 'rule' as const,
          confidence: series.confidence,
          updatedAt: now,
          values: {
            active: true,
            key: series.key,
            name: series.name,
            cadence,
            monthlyAmount: series.monthlyAmount,
            intervalDays: series.intervalDays,
            lastDate: series.lastDate,
            nextDueDate: series.nextDueDate,
            need: series.need,
            status: 'active',
            confidence: series.confidence,
            observedCount: series.observedCount,
            firstDate: series.firstDate,
            amountVariancePercent: series.amountVariancePercent,
          },
        }
      }),
    )
}

export function deriveTaxContributionExtensions(
  transactions: MoneyTransaction[],
): MoneyExtensionValue[] {
  const now = new Date().toISOString()
  return normalizeTransactions(transactions)
    .filter((transaction) => !transaction.pending)
    .map((transaction) => {
      const type = inferTaxContributionType(transaction)
      if (!type) return null
      const amount = Math.abs(transaction.valueForSum ?? transaction.amount)
      if (!Number.isFinite(amount) || amount <= 0) return null
      const extension: MoneyExtensionValue = {
        entity: 'transaction' as const,
        entityId: transaction.id,
        namespace: 'taxContribution',
        source: 'rule' as const,
        confidence: taxContributionConfidence(transaction),
        updatedAt: now,
        values: {
          type,
          taxYear: taxContributionYear(transaction),
          amount,
          contributionSource: taxContributionSource(transaction),
        },
      }
      return extension
    })
    .filter((extension): extension is MoneyExtensionValue => Boolean(extension))
}

export function deriveReviewActionExtensions(
  transactions: MoneyTransaction[],
): MoneyExtensionValue[] {
  const now = new Date().toISOString()
  return normalizeTransactions(transactions)
    .filter((transaction) => transaction.isExpense && !transaction.pending)
    .map((transaction) => inferReviewActionExtension(transaction, now))
    .filter((extension): extension is MoneyExtensionValue => Boolean(extension))
}

export function deriveTransactionLabelRuleExtensions(
  transactions: MoneyTransaction[],
  existingTransactionExtensions: MoneyExtensionValue[],
  rules: MoneyTransactionLabelRule[],
): MoneyExtensionValue[] {
  const activeRules = normalizeTransactionLabelRules(rules).filter(
    (rule) => rule.status === 'active',
  )
  if (activeRules.length === 0) return []

  const explicitLabels = new Set(
    normalizeExtensionValues(existingTransactionExtensions)
      .filter(
        (extension) =>
          extension.entity === 'transaction' && extension.source !== 'rule',
      )
      .map((extension) => `${extension.entityId}:${extension.namespace}`),
  )
  const now = new Date().toISOString()
  return normalizeTransactions(transactions).flatMap((transaction) => {
    return activeRules
      .filter(
        (rule) => !explicitLabels.has(`${transaction.id}:${rule.namespace}`),
      )
      .filter((rule) => transactionMatchesLabelRule(transaction, rule.match))
      .map((rule) => ({
        entity: 'transaction' as const,
        entityId: transaction.id,
        namespace: rule.namespace,
        values: { ...rule.values },
        source: 'rule' as const,
        confidence: rule.confidence,
        updatedAt: now,
      }))
  })
}

export function deriveRecommendationFacts(
  data: RawMoneyData,
  debts: MoneyDebt[] = [],
): MoneyRecommendation[] {
  const now = new Date().toISOString()
  const transactionRecommendations = normalizeTransactions(data.transactions)
    .filter((transaction) => transaction.isExpense && !transaction.pending)
    .map((transaction) => {
      const extension = inferReviewActionExtension(transaction, now)
      if (!extension) return null
      return recommendationFromReviewActionExtension(
        extension,
        transaction,
        now,
      )
    })
    .filter((recommendation): recommendation is MoneyRecommendation =>
      Boolean(recommendation),
    )

  const debtRecommendations = normalizeDebts(debts)
    .map((debt) => recommendationFromDebt(debt, now))
    .filter((recommendation): recommendation is MoneyRecommendation =>
      Boolean(recommendation),
    )

  return normalizeRecommendations([
    ...transactionRecommendations,
    ...debtRecommendations,
  ])
}

function inferReviewActionExtension(
  transaction: MoneyTransaction,
  now: string,
): MoneyExtensionValue | null {
  const amount = Math.abs(transaction.valueForSum ?? transaction.amount)
  if (!Number.isFinite(amount) || amount <= 0) return null

  const haystack = transactionText(transaction)
  const discretionary = isDiscretionarySpend(transaction)
  const essential = ESSENTIAL_SPEND_PATTERN.test(haystack)
  const recurringOpportunity =
    transaction.recurring && !OBLIGATION_PATTERN.test(haystack)
  const largeDiscretionary = discretionary && amount >= 150
  const veryLargeExpense = !essential && amount >= 500

  if (!recurringOpportunity && !largeDiscretionary && !veryLargeExpense)
    return null

  const severity = veryLargeExpense || amount >= 500 ? 'high' : 'medium'
  const type = recurringOpportunity || discretionary ? 'opportunity' : 'warning'
  const status = severity === 'high' ? 'required' : 'suggested'
  const estimatedImpact = reviewActionEstimatedImpact(
    amount,
    recurringOpportunity,
    severity,
  )

  return {
    entity: 'transaction',
    entityId: transaction.id,
    namespace: 'reviewAction',
    source: 'rule',
    confidence: reviewActionConfidence(
      transaction,
      recurringOpportunity,
      severity,
    ),
    updatedAt: now,
    values: {
      status,
      type,
      severity,
      reason: reviewActionReason(transaction, recurringOpportunity, severity),
      estimatedImpact,
      scenarioId: `review-${normalizeEntityId(transaction.id)}`,
      dueDate: reviewActionDueDate(transaction.date),
    },
  }
}

function recommendationFromReviewActionExtension(
  extension: MoneyExtensionValue,
  transaction: MoneyTransaction,
  now: string,
): MoneyRecommendation | null {
  const values = extension.values
  const kind = stringValue(values.type) as MoneyRecommendationKind
  const status = stringValue(values.status) as MoneyRecommendationStatus
  const severity = stringValue(values.severity) as MoneyRecommendationSeverity
  const reason = stringValue(values.reason)
  return {
    id: `transaction-${transaction.id}-review`,
    kind,
    status,
    severity,
    title: recommendationTitle(transaction, kind, severity),
    reason,
    source: extension.source,
    confidence: extension.confidence,
    estimatedImpact: numberValue(values.estimatedImpact),
    scenarioId: stringValue(values.scenarioId),
    sourceLinks: [{ entity: 'transaction', entityId: transaction.id }],
    createdAt: now,
    updatedAt: extension.updatedAt,
  }
}

function recommendationFromDebt(
  debt: MoneyDebt,
  now: string,
): MoneyRecommendation | null {
  const apr = debt.apr ?? 0
  if (apr < 0.18 && !debt.isOverdue) return null
  const highApr = apr >= 0.18
  return {
    id: `debt-${debt.id}-review`,
    kind: highApr ? 'opportunity' : 'warning',
    status: debt.isOverdue || apr >= 0.24 ? 'required' : 'suggested',
    severity: debt.isOverdue || apr >= 0.24 ? 'high' : 'medium',
    title: highApr
      ? `Review high-APR debt: ${debt.name}`
      : `Review debt: ${debt.name}`,
    reason: debt.isOverdue
      ? 'Debt payment appears overdue.'
      : 'High APR debt may be worth prioritizing.',
    source: 'rule',
    confidence: debt.isOverdue ? 0.9 : 0.78,
    estimatedImpact: Math.round(debt.balance * Math.max(apr, 0) * 0.25),
    scenarioId: `debt-${normalizeEntityId(debt.id)}-payoff`,
    sourceLinks: [{ entity: 'debt', entityId: debt.id }],
    createdAt: now,
    updatedAt: now,
  }
}

function recommendationTitle(
  transaction: MoneyTransaction,
  kind: MoneyRecommendationKind,
  severity: MoneyRecommendationSeverity,
): string {
  const name = transaction.merchantName ?? transaction.name
  if (kind === 'opportunity') return `Review savings opportunity: ${name}`
  if (severity === 'high') return `Review large expense: ${name}`
  return `Review expense: ${name}`
}

function mergeDerivedTransactionExtensions(
  existing: MoneyExtensionValue[],
  derived: MoneyExtensionValue[],
  dynamicRuleNamespaces: string[] = [],
): MoneyExtensionValue[] {
  const ruleNamespaces = new Set([
    ...TRANSACTION_RULE_NAMESPACES,
    ...dynamicRuleNamespaces.map(safeExtensionNamespace).filter(Boolean),
  ])
  const retained = normalizeExtensionValues(existing).filter(
    (extension) =>
      !(
        extension.entity === 'transaction' &&
        extension.source === 'rule' &&
        ruleNamespaces.has(extension.namespace)
      ),
  )
  const retainedKeys = new Set(
    retained.map(
      (extension) =>
        `${extension.entity}:${extension.entityId}:${extension.namespace}`,
    ),
  )
  return dedupeExtensionValues([
    ...retained,
    ...normalizeExtensionValues(derived).filter(
      (extension) =>
        !retainedKeys.has(
          `${extension.entity}:${extension.entityId}:${extension.namespace}`,
        ),
    ),
  ])
}

function transactionMatchesLabelRule(
  transaction: MoneyTransaction,
  match: MoneyTransactionLabelRuleMatch,
): boolean {
  if (match.accountId && transaction.accountId !== match.accountId) return false
  if (match.direction && transaction.direction !== match.direction) return false
  if (
    match.currencyCode &&
    (transaction.currencyCode ?? transaction.isoCurrencyCode)?.toUpperCase() !==
      match.currencyCode.toUpperCase()
  ) {
    return false
  }
  const amount = Math.abs(transaction.valueForSum ?? transaction.amount)
  if (match.minAmount !== undefined && amount < match.minAmount) return false
  if (match.maxAmount !== undefined && amount > match.maxAmount) return false
  if (match.startDate && transaction.date < match.startDate) return false
  if (match.endDate && transaction.date > match.endDate) return false

  const merchantId = normalizeEntityId(
    transaction.merchantName ?? transaction.name,
  )
  if (match.merchantIds?.length) {
    const merchantIds = new Set(match.merchantIds.map(normalizeEntityId))
    if (!merchantIds.has(merchantId)) return false
  }

  if (match.merchantNames?.length) {
    const merchantName = (transaction.merchantName ?? transaction.name)
      .trim()
      .toLowerCase()
    const merchantNames = new Set(
      match.merchantNames.map((name) => name.trim().toLowerCase()),
    )
    if (!merchantNames.has(merchantName)) return false
  }

  if (
    match.category &&
    !transaction.category.some((entry) =>
      entry.toLowerCase().includes(match.category!.toLowerCase()),
    ) &&
    transaction.userCategory?.toLowerCase() !== match.category.toLowerCase()
  ) {
    return false
  }

  const pattern = match.textPattern ?? match.q
  if (pattern) {
    const haystack = transactionText(transaction).toLowerCase()
    if (!haystack.includes(pattern.toLowerCase())) return false
  }

  return true
}

function inferTaxContributionType(
  transaction: MoneyTransaction,
): '401k' | 'ira' | 'hsa' | '529' | null {
  const haystack = transactionText(transaction)
  if (TAX_CONTRIBUTION_NEGATIVE_PATTERN.test(haystack)) return null
  if (!TAX_CONTRIBUTION_ACTION_PATTERN.test(haystack)) return null
  if (
    /\b(401\s*k|401\(k\)|403\s*b|403\(b\)|retirement plan)\b/i.test(haystack)
  ) {
    return '401k'
  }
  if (/\b(hsa|health savings)\b/i.test(haystack)) return 'hsa'
  if (/\b(529|college savings)\b/i.test(haystack)) return '529'
  if (/\b(ira|roth ira|traditional ira)\b/i.test(haystack)) return 'ira'
  return null
}

function taxContributionConfidence(transaction: MoneyTransaction): number {
  const haystack = transactionText(transaction)
  const explicitContribution = /\b(contribution|contrib|deferral)\b/i.test(
    haystack,
  )
  const payroll = /\b(payroll|paycheck|salary|employer|employee)\b/i.test(
    haystack,
  )
  return clamp(
    0.74 + (explicitContribution ? 0.12 : 0) + (payroll ? 0.06 : 0),
    0,
    0.95,
  )
}

function taxContributionYear(transaction: MoneyTransaction): number {
  const year = Number(transaction.date.slice(0, 4))
  return Number.isInteger(year) && year > 1900
    ? year
    : new Date().getUTCFullYear()
}

function taxContributionSource(
  transaction: MoneyTransaction,
): 'payroll' | 'employer' | 'transfer' {
  const haystack = transactionText(transaction)
  if (/\b(employer|match|matching)\b/i.test(haystack)) return 'employer'
  if (/\b(payroll|paycheck|salary|employee|deferral)\b/i.test(haystack)) {
    return 'payroll'
  }
  return 'transfer'
}

function isDiscretionarySpend(transaction: MoneyTransaction): boolean {
  const haystack = transactionText(transaction)
  if (ESSENTIAL_SPEND_PATTERN.test(haystack)) return false
  return DISCRETIONARY_SPEND_PATTERN.test(haystack)
}

function reviewActionEstimatedImpact(
  amount: number,
  recurringOpportunity: boolean,
  severity: 'medium' | 'high',
): number {
  if (recurringOpportunity) return Math.round(amount * 12)
  return Math.round(amount * (severity === 'high' ? 0.5 : 0.25))
}

function reviewActionConfidence(
  transaction: MoneyTransaction,
  recurringOpportunity: boolean,
  severity: 'medium' | 'high',
): number {
  const categorySignal = transaction.category.length > 0 ? 0.05 : 0
  return clamp(
    0.68 +
      (recurringOpportunity ? 0.1 : 0) +
      (severity === 'high' ? 0.08 : 0) +
      categorySignal,
    0,
    0.92,
  )
}

function reviewActionReason(
  transaction: MoneyTransaction,
  recurringOpportunity: boolean,
  severity: 'medium' | 'high',
): string {
  if (recurringOpportunity) return 'Recurring discretionary spend to review.'
  if (severity === 'high') return 'Large non-essential expense to review.'
  return 'Discretionary expense to review.'
}

function reviewActionDueDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()))
    return new Date().toISOString().slice(0, 10)
  parsed.setUTCDate(parsed.getUTCDate() + 7)
  return parsed.toISOString().slice(0, 10)
}

function transactionText(transaction: MoneyTransaction): string {
  return [
    transaction.name,
    transaction.merchantName,
    transaction.userCategory,
    ...transaction.category,
  ]
    .filter(Boolean)
    .join(' ')
}

function inferRecurringSeries(
  key: string,
  transactions: MoneyTransaction[],
  merchantGroups: Map<
    string,
    { merchantId: string; name?: string }
  > = new Map(),
): RecurringSeries | null {
  const sorted = normalizeTransactions(transactions).sort((a, b) =>
    a.date.localeCompare(b.date),
  )
  const uniqueDates = [
    ...new Set(sorted.map((transaction) => transaction.date)),
  ].sort()
  const explicitRecurring = sorted.some((transaction) => transaction.recurring)
  if (uniqueDates.length < 2 && !explicitRecurring) return null

  const amounts = sorted.map((transaction) =>
    Math.abs(transaction.valueForSum ?? transaction.amount),
  )
  if (!amountsAreStable(amounts) && !explicitRecurring) return null

  const gaps = uniqueDates
    .slice(1)
    .map((date, index) => daysBetween(uniqueDates[index] ?? date, date))
    .filter((gap) => gap > 0)
  const medianGap = gaps.length ? median(gaps) : 30
  const cadence = inferCadence(medianGap, uniqueDates.length, explicitRecurring)
  if (!cadence) return null

  const namespace = recurringNamespaceForTransactions(sorted)
  const intervalDays = cadenceIntervalDays(cadence)
  const lastDate = uniqueDates.at(-1) ?? sorted.at(-1)?.date
  if (!lastDate) return null
  const monthlyAmount = normalizeMonthlyAmount(median(amounts), cadence)
  const observedCount = uniqueDates.length
  const firstDate = uniqueDates[0] ?? sorted[0]?.date
  if (!firstDate) return null
  const amountVariancePercent = relativeAmountVariance(amounts)
  const confidence = clamp(
    (explicitRecurring ? 0.72 : 0.58) +
      Math.min(observedCount, 6) * 0.06 +
      (amountsAreStable(amounts) ? 0.12 : 0),
    0,
    0.97,
  )

  return {
    key,
    name: recurringSeriesName(sorted, merchantGroups),
    namespace,
    cadence,
    intervalDays,
    monthlyAmount,
    lastDate,
    nextDueDate: nextDueDate(lastDate, cadence),
    confidence,
    observedCount,
    firstDate,
    amountVariancePercent,
    need: namespace === 'recurringObligation' ? 'required' : 'useful',
    transactions: sorted,
  }
}

function recurringTransactionKey(
  transaction: MoneyTransaction,
  merchantGroups: Map<
    string,
    { merchantId: string; name?: string }
  > = new Map(),
): string {
  const group = merchantGroups.get(transaction.id)
  return normalizeEntityId(
    group?.merchantId ?? transaction.merchantName ?? transaction.name,
  )
}

function recurringSeriesName(
  transactions: MoneyTransaction[],
  merchantGroups: Map<
    string,
    { merchantId: string; name?: string }
  > = new Map(),
): string {
  const latest = [...transactions].sort((a, b) =>
    b.date.localeCompare(a.date),
  )[0]
  if (latest) {
    const groupName = merchantGroups.get(latest.id)?.name
    if (groupName) return groupName
  }
  return latest?.merchantName ?? latest?.name ?? 'Recurring expense'
}

function recurringNamespaceForTransactions(
  transactions: MoneyTransaction[],
): RecurringSeries['namespace'] {
  const haystack = transactions
    .map((transaction) =>
      [
        transaction.name,
        transaction.merchantName,
        ...transaction.category,
      ].join(' '),
    )
    .join(' ')
  return OBLIGATION_PATTERN.test(haystack)
    ? 'recurringObligation'
    : 'subscription'
}

function inferCadence(
  medianGap: number,
  observationCount: number,
  explicitRecurring: boolean,
): RecurringCadence | null {
  if (medianGap >= 5 && medianGap <= 10 && observationCount >= 3)
    return 'weekly'
  if (medianGap >= 24 && medianGap <= 38 && observationCount >= 2)
    return 'monthly'
  if (medianGap >= 75 && medianGap <= 105 && observationCount >= 2)
    return 'quarterly'
  if (medianGap >= 330 && medianGap <= 400 && observationCount >= 2)
    return 'yearly'
  if (explicitRecurring) return 'monthly'
  return null
}

function amountsAreStable(amounts: number[]): boolean {
  if (amounts.length <= 1) return true
  const center = median(amounts)
  if (center <= 0) return false
  return amounts.every((amount) => {
    const delta = Math.abs(amount - center)
    return delta <= 10 || delta / center <= 0.25
  })
}

function relativeAmountVariance(amounts: number[]): number {
  if (amounts.length <= 1) return 0
  const center = median(amounts)
  if (center <= 0) return 0
  const maxDelta = Math.max(
    ...amounts.map((amount) => Math.abs(amount - center) / center),
  )
  return clamp(maxDelta, 0, 1)
}

function normalizeMonthlyAmount(
  amount: number,
  cadence: RecurringCadence,
): number {
  if (cadence === 'weekly') return (amount * 52) / 12
  if (cadence === 'quarterly') return amount / 3
  if (cadence === 'yearly') return amount / 12
  return amount
}

function cadenceIntervalDays(cadence: RecurringCadence): number {
  if (cadence === 'weekly') return 7
  if (cadence === 'quarterly') return 91
  if (cadence === 'yearly') return 365
  return 30
}

function nextDueDate(lastDate: string, cadence: RecurringCadence): string {
  const date = new Date(`${lastDate.slice(0, 10)}T00:00:00Z`)
  if (!Number.isFinite(date.getTime())) return lastDate
  if (cadence === 'weekly') date.setUTCDate(date.getUTCDate() + 7)
  else if (cadence === 'quarterly') date.setUTCMonth(date.getUTCMonth() + 3)
  else if (cadence === 'yearly') date.setUTCFullYear(date.getUTCFullYear() + 1)
  else date.setUTCMonth(date.getUTCMonth() + 1)
  return date.toISOString().slice(0, 10)
}

function daysBetween(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate.slice(0, 10)}T00:00:00Z`)
  const end = Date.parse(`${endDate.slice(0, 10)}T00:00:00Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0
  return Math.round((end - start) / 86_400_000)
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0)
}

export function normalizeSettings(
  settings: PartialMoneySettings,
): MoneySettings {
  const display = settings.display ?? {}
  const currency = settings.currency ?? {}
  const sync = settings.sync ?? {}
  const attention = settings.attention ?? {}
  const dataMode = display.dataMode === 'demo' ? 'demo' : 'live'
  const reportingCurrency = normalizeCurrencyCode(
    currency.reportingCurrency,
    DEFAULT_SETTINGS.currency.reportingCurrency,
  )
  const intervalMinutes =
    typeof sync.intervalMinutes === 'number' &&
    Number.isFinite(sync.intervalMinutes)
      ? clamp(Math.round(sync.intervalMinutes), 15, 1440)
      : DEFAULT_SETTINGS.sync.intervalMinutes
  const largeTransactionThreshold =
    typeof attention.largeTransactionThreshold === 'number' &&
    Number.isFinite(attention.largeTransactionThreshold)
      ? clamp(Math.round(attention.largeTransactionThreshold), 0, 1_000_000)
      : DEFAULT_SETTINGS.attention.largeTransactionThreshold
  const lookbackDays =
    typeof attention.lookbackDays === 'number' &&
    Number.isFinite(attention.lookbackDays)
      ? clamp(Math.round(attention.lookbackDays), 1, 365)
      : DEFAULT_SETTINGS.attention.lookbackDays
  const categoryThresholds = Array.isArray(attention.categoryThresholds)
    ? attention.categoryThresholds
        .map((threshold) => ({
          category:
            typeof threshold.category === 'string'
              ? threshold.category.trim()
              : '',
          monthlyLimit:
            typeof threshold.monthlyLimit === 'number' &&
            Number.isFinite(threshold.monthlyLimit)
              ? clamp(Math.round(threshold.monthlyLimit), 0, 1_000_000)
              : 0,
          enabled:
            typeof threshold.enabled === 'boolean' ? threshold.enabled : true,
        }))
        .filter((threshold) => threshold.category && threshold.monthlyLimit > 0)
        .slice(0, 50)
    : DEFAULT_SETTINGS.attention.categoryThresholds

  return {
    display: {
      dataMode,
      updatedAt:
        typeof display.updatedAt === 'string' && display.updatedAt.trim()
          ? display.updatedAt
          : DEFAULT_SETTINGS.display.updatedAt,
    },
    currency: {
      reportingCurrency,
      updatedAt:
        typeof currency.updatedAt === 'string' && currency.updatedAt.trim()
          ? currency.updatedAt
          : DEFAULT_SETTINGS.currency.updatedAt,
    },
    sync: {
      scheduledRefreshEnabled:
        typeof sync.scheduledRefreshEnabled === 'boolean'
          ? sync.scheduledRefreshEnabled
          : DEFAULT_SETTINGS.sync.scheduledRefreshEnabled,
      intervalMinutes,
      updatedAt:
        typeof sync.updatedAt === 'string' && sync.updatedAt.trim()
          ? sync.updatedAt
          : DEFAULT_SETTINGS.sync.updatedAt,
    },
    attention: {
      largeTransactionThreshold,
      lookbackDays,
      categoryThresholds,
      updatedAt:
        typeof attention.updatedAt === 'string' && attention.updatedAt.trim()
          ? attention.updatedAt
          : DEFAULT_SETTINGS.attention.updatedAt,
    },
  }
}

type MoneyAllocationTargetAssetClass = (typeof MONEY_ASSET_CLASSES)[number]

export function normalizeAllocationTargets(
  targets: MoneyAllocationTarget[],
): MoneyAllocationTarget[] {
  const now = new Date().toISOString()
  const normalized = targets
    .map((target) => {
      const id = normalizeEntityId(target.id || target.name)
      const allocations = normalizeAllocationMap(target.allocations ?? {})
      if (!id || Object.keys(allocations).length === 0) return null
      const normalizedTarget: MoneyAllocationTarget = {
        ...target,
        id,
        name: target.name?.trim() || titleFromNamespace(id),
        allocations,
        createdAt: target.createdAt ?? now,
        updatedAt: target.updatedAt ?? now,
      }
      return normalizedTarget
    })
    .filter((target): target is MoneyAllocationTarget => Boolean(target))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))

  return normalized.length > 0
    ? [...new Map(normalized.map((target) => [target.id, target])).values()]
    : DEFAULT_ALLOCATION_TARGETS
}

function normalizeAllocationMap(
  allocations: Partial<Record<string, number>>,
): MoneyAllocationTarget['allocations'] {
  const entries = Object.entries(allocations)
    .map(
      ([key, value]) =>
        [
          normalizeAllocationClass(key),
          typeof value === 'number' && Number.isFinite(value)
            ? clamp(value, 0, 1)
            : 0,
        ] as const,
    )
    .filter(
      (entry): entry is readonly [MoneyAllocationTargetAssetClass, number] =>
        Boolean(entry[0] && entry[1] > 0),
    )
  const total = entries.reduce((sum, [, value]) => sum + value, 0)
  if (total <= 0) return {}
  return Object.fromEntries(
    entries.map(([key, value]) => [key, value / total]),
  ) as MoneyAllocationTarget['allocations']
}

function normalizeAllocationClass(
  value: string,
): MoneyAllocationTargetAssetClass | null {
  const normalized = value.toLowerCase().replace(/[_\s]+/g, '-')
  if ((MONEY_ASSET_CLASSES as readonly string[]).includes(normalized)) {
    return normalized as MoneyAllocationTargetAssetClass
  }
  if (['stock', 'equity', 'equities'].includes(normalized)) return 'stocks'
  if (['bond', 'fixed-income'].includes(normalized)) return 'bonds'
  if (['fund', 'etf', 'mutual-fund'].includes(normalized)) return 'funds'
  if (['option', 'derivative'].includes(normalized)) return 'options'
  return null
}

export function normalizeTaxContributionLimits(
  limits: MoneyTaxContributionLimit[],
): MoneyTaxContributionLimit[] {
  const now = new Date().toISOString()
  const normalized = limits
    .map((limit): MoneyTaxContributionLimit | null => {
      const type = normalizeTaxContributionType(limit.type)
      const taxYear =
        typeof limit.taxYear === 'number' && Number.isFinite(limit.taxYear)
          ? Math.floor(limit.taxYear)
          : 0
      const amount =
        typeof limit.limit === 'number' && Number.isFinite(limit.limit)
          ? Math.max(0, limit.limit)
          : 0
      if (!type || taxYear < 2000 || taxYear > 2200 || amount <= 0) return null
      const variant = normalizeTaxContributionLimitVariant(limit.variant)
      const id =
        normalizeEntityId(
          limit.id || `${type}-${taxYear}-${variant ?? 'standard'}`,
        ) || `${type}-${taxYear}-${variant ?? 'standard'}`
      const catchUpLimit = finiteOptionalNumber(limit.catchUpLimit)
      const catchUpAge = finiteOptionalNumber(limit.catchUpAge)
      const normalizedLimit: MoneyTaxContributionLimit = {
        ...limit,
        id,
        type,
        taxYear,
        label: limit.label?.trim() || titleFromNamespace(id),
        limit: amount,
        catchUpLimit:
          catchUpLimit === undefined ? undefined : Math.max(0, catchUpLimit),
        catchUpAge:
          catchUpAge === undefined
            ? undefined
            : clamp(Math.floor(catchUpAge), 0, 120),
        sourceLabel: limit.sourceLabel?.trim() || undefined,
        sourceUrl: limit.sourceUrl?.trim() || undefined,
        createdAt: limit.createdAt ?? now,
        updatedAt: limit.updatedAt ?? now,
      }
      if (variant) normalizedLimit.variant = variant
      return normalizedLimit
    })
    .filter((limit): limit is MoneyTaxContributionLimit => Boolean(limit))
    .sort(
      (a, b) =>
        b.taxYear - a.taxYear ||
        a.type.localeCompare(b.type) ||
        (a.variant ?? '').localeCompare(b.variant ?? '') ||
        a.id.localeCompare(b.id),
    )

  return normalized.length > 0
    ? [...new Map(normalized.map((limit) => [limit.id, limit])).values()]
    : DEFAULT_TAX_CONTRIBUTION_LIMITS
}

function normalizeTaxContributionType(
  value: unknown,
): MoneyTaxContributionType | null {
  if (typeof value !== 'string') return null
  const normalized = value.toLowerCase().replace(/[_\s]+/g, '')
  if (
    normalized === '401k' ||
    normalized === '403b' ||
    normalized === '457' ||
    normalized === 'tsp'
  ) {
    return '401k'
  }
  if (
    normalized === 'ira' ||
    normalized === 'rothira' ||
    normalized === 'traditionalira'
  ) {
    return 'ira'
  }
  if (normalized === 'hsa') return 'hsa'
  if (normalized === '529') return '529'
  return null
}

function normalizeTaxContributionLimitVariant(
  value: unknown,
): MoneyTaxContributionLimitVariant | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.toLowerCase().replace(/[_\s]+/g, '-')
  if (normalized === 'self' || normalized === 'self-only') return 'self'
  if (normalized === 'family') return 'family'
  if (normalized === 'standard' || normalized === 'individual')
    return 'standard'
  return undefined
}

export function normalizeForecastScenarios(
  scenarios: MoneyForecastScenario[],
): MoneyForecastScenario[] {
  const now = new Date().toISOString()
  const normalized = scenarios
    .map((scenario) => {
      const id = normalizeEntityId(scenario.id || scenario.name)
      if (!id) return null
      const changes = normalizeScenarioChanges(scenario.changes ?? [])
      const confidence =
        typeof scenario.confidence === 'number' &&
        Number.isFinite(scenario.confidence)
          ? clamp(
              scenario.confidence > 1
                ? scenario.confidence / 100
                : scenario.confidence,
              0,
              1,
            )
          : undefined
      const horizonPeriods =
        typeof scenario.horizonPeriods === 'number' &&
        Number.isFinite(scenario.horizonPeriods)
          ? clamp(Math.floor(scenario.horizonPeriods), 1, 120)
          : undefined
      const normalizedScenario: MoneyForecastScenario = {
        ...scenario,
        id,
        name: scenario.name?.trim() || titleFromNamespace(id),
        status: normalizeScenarioStatus(scenario.status),
        horizonPeriods,
        confidence,
        changes,
        createdAt: scenario.createdAt ?? now,
        updatedAt: scenario.updatedAt ?? now,
      }
      return normalizedScenario
    })
    .filter((scenario): scenario is MoneyForecastScenario => Boolean(scenario))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))

  return normalized.length > 0
    ? [
        ...new Map(
          normalized.map((scenario) => [scenario.id, scenario]),
        ).values(),
      ]
    : DEFAULT_FORECAST_SCENARIOS
}

function normalizeScenarioChanges(
  changes: MoneyForecastScenarioChange[],
): MoneyForecastScenarioChange[] {
  return changes
    .map((change, index) => {
      const id = normalizeEntityId(
        change.id || change.label || `change-${index + 1}`,
      )
      if (!id) return null
      const amountMonthly = finiteOptionalNumber(change.amountMonthly)
      const amountAnnual = finiteOptionalNumber(change.amountAnnual)
      const percentChange = finiteOptionalNumber(change.percentChange)
      const entity =
        change.entity && MONEY_EXTENSION_ENTITIES.includes(change.entity)
          ? change.entity
          : undefined
      const normalizedChange: MoneyForecastScenarioChange = {
        id,
        label: change.label?.trim() || titleFromNamespace(id),
        amountMonthly,
        amountAnnual,
        percentChange:
          percentChange === undefined
            ? undefined
            : clamp(
                percentChange > 1 || percentChange < -1
                  ? percentChange / 100
                  : percentChange,
                -1,
                1,
              ),
        entity,
        entityId: change.entityId?.trim() || undefined,
        namespace: change.namespace
          ? safeExtensionNamespace(change.namespace)
          : undefined,
        status: normalizeScenarioStatus(change.status),
      }
      return normalizedChange
    })
    .filter((change): change is MoneyForecastScenarioChange => Boolean(change))
}

function normalizeScenarioStatus(value: unknown) {
  return value === 'accepted' || value === 'rejected' || value === 'archived'
    ? value
    : 'draft'
}

function finiteOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export async function searchVisibleTransactions(
  c: Context,
  filters: TransactionSearchFilters,
): Promise<{
  transactions: MoneyTransaction[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
  nextOffset?: number
  nextCursor?: string
}> {
  const [settings, extensions, fxRates] = await Promise.all([
    readSettings(c),
    readTransactionExtensions(c),
    readFxRates(c),
  ])
  const dataDir = getDataDir(c)
  const months = transactionMonthsForRange(filters.startDate, filters.endDate)
  const shardedTransactions = await readTransactionShards(dataDir, months)
  const transactions = shardedTransactions
    ? applyTransactionExtensions(
        normalizeTransactions(shardedTransactions),
        extensions,
        { settings, fxRates },
      )
    : applyTransactionExtensions(
        normalizeRawMoneyData(await readRawMoneyData(c)).transactions,
        extensions,
        { settings, fxRates },
      )

  return searchTransactions(
    transactions.filter((transaction) =>
      sourceMatchesDataMode(transaction.source, settings.display.dataMode),
    ),
    filters,
  )
}

export async function patchTransaction(
  c: Context,
  id: string,
  patch: Partial<
    Pick<
      MoneyTransaction,
      | 'name'
      | 'merchantName'
      | 'direction'
      | 'category'
      | 'userCategory'
      | 'notes'
      | 'recurring'
    >
  >,
): Promise<MoneyTransaction | null> {
  const dataDir = getDataDir(c)
  const shard = await readTransactionShardContainingId(dataDir, id)
  if (shard) {
    const [extensions, settings, fxRates] = await Promise.all([
      readTransactionExtensions(c),
      readSettings(c),
      readFxRates(c),
    ])
    const transactions = normalizeTransactions(shard.transactions)
    const index = transactions.findIndex((transaction) => transaction.id === id)
    if (index === -1) return null

    const updated = normalizeTransactions([
      {
        ...transactions[index],
        ...patch,
      },
    ])[0]
    transactions[index] = updated
    await writeJson(
      transactionShardPath(dataDir, shard.month),
      normalizeTransactions(transactions)
        .map(stripTransactionRuntimeExtensions)
        .sort(compareTransactions),
    )
    await patchRawTransactionIfPresent(c, id, updated)
    return applyTransactionExtensions([updated], extensions, {
      settings,
      fxRates,
    })[0]
  }

  const raw = await readRawMoneyData(c)
  const transactions = normalizeRawMoneyData(raw).transactions
  const index = transactions.findIndex((transaction) => transaction.id === id)
  if (index === -1) return null

  const updated = normalizeTransactions([
    {
      ...transactions[index],
      ...patch,
    },
  ])[0]
  transactions[index] = updated
  await writeRawMoneyData(
    c,
    normalizeRawMoneyData({ accounts: raw.accounts, transactions }),
  )

  return updated
}

export function searchTransactions(
  transactions: MoneyTransaction[],
  filters: TransactionSearchFilters,
): {
  transactions: MoneyTransaction[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
  nextOffset?: number
  nextCursor?: string
} {
  const query = filters.q?.trim().toLowerCase()
  const category = filters.category?.trim().toLowerCase()
  const currencyCode = filters.currencyCode?.trim().toUpperCase()
  const limit = clamp(filters.limit ?? 100, 1, 500)
  const offset =
    pageOffsetFromCursor(filters.cursor) ?? Math.max(0, filters.offset ?? 0)

  const filtered = transactions.filter((transaction) => {
    if (filters.accountId && transaction.accountId !== filters.accountId) {
      return false
    }
    if (filters.direction && transaction.direction !== filters.direction) {
      return false
    }
    if (
      currencyCode &&
      (
        transaction.currencyCode ?? transaction.isoCurrencyCode
      )?.toUpperCase() !== currencyCode
    ) {
      return false
    }
    if (
      filters.minAmount !== undefined &&
      transactionComparableAmount(transaction) < filters.minAmount
    ) {
      return false
    }
    if (
      filters.maxAmount !== undefined &&
      transactionComparableAmount(transaction) > filters.maxAmount
    ) {
      return false
    }
    if (filters.startDate && transaction.date < filters.startDate) return false
    if (filters.endDate && transaction.date > filters.endDate) return false
    if (
      category &&
      !transaction.category.some((entry) =>
        entry.toLowerCase().includes(category),
      ) &&
      transaction.userCategory?.toLowerCase() !== category
    ) {
      return false
    }
    if (query) {
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
      if (!haystack.includes(query)) return false
    }
    return true
  })

  const sorted = filtered.sort(compareTransactions)
  const page = paginateItems(sorted, { limit, offset })

  return {
    transactions: page.items,
    total: filtered.length,
    limit,
    offset,
    hasMore: page.hasMore,
    nextOffset: page.nextOffset,
    nextCursor: page.nextCursor,
  }
}

function transactionComparableAmount(transaction: MoneyTransaction): number {
  return Math.abs(transaction.valueForSum ?? transaction.amount)
}

export function paginateItems<T>(
  items: T[],
  options: { limit?: number; offset?: number; cursor?: string },
): {
  items: T[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
  nextOffset?: number
  nextCursor?: string
} {
  const limit = clamp(options.limit ?? 100, 1, 500)
  const offset =
    pageOffsetFromCursor(options.cursor) ?? Math.max(0, options.offset ?? 0)
  const nextOffset = offset + limit
  const hasMore = nextOffset < items.length
  return {
    items: items.slice(offset, nextOffset),
    total: items.length,
    limit,
    offset,
    hasMore,
    nextOffset: hasMore ? nextOffset : undefined,
    nextCursor: hasMore ? pageCursorForOffset(nextOffset) : undefined,
  }
}

export function pageCursorForOffset(offset: number): string {
  return `offset:${Math.max(0, Math.floor(offset))}`
}

export function pageOffsetFromCursor(
  cursor: string | undefined,
): number | undefined {
  if (!cursor) return undefined
  const match = /^offset:(\d+)$/.exec(cursor.trim())
  if (!match) return undefined
  return Number(match[1])
}

export function buildSummary(data: RawMoneyData): MoneySummary {
  const normalized = normalizeRawMoneyData(data)
  const assets = normalized.accounts
    .filter((account) => account.isAsset)
    .reduce(
      (total, account) => total + Math.max(account.valueForSum ?? 0, 0),
      0,
    )
  const liabilities = normalized.accounts
    .filter((account) => account.isLiability)
    .reduce(
      (total, account) =>
        total + Math.abs(Math.min(account.valueForSum ?? 0, 0)),
      0,
    )
  const income = normalized.transactions
    .filter((transaction) => transaction.isIncome)
    .reduce(
      (total, transaction) => total + Math.abs(transaction.valueForSum ?? 0),
      0,
    )
  const expenses = normalized.transactions
    .filter((transaction) => transaction.isExpense)
    .reduce(
      (total, transaction) => total + Math.abs(transaction.valueForSum ?? 0),
      0,
    )
  const lastTransactionDate = normalized.transactions
    .map((transaction) => transaction.date)
    .sort()
    .at(-1)
  const lastAccountUpdate = normalized.accounts
    .map((account) => account.updatedAt ?? account.asOf)
    .sort()
    .at(-1)

  return {
    generatedAt: new Date().toISOString(),
    accountCount: normalized.accounts.length,
    transactionCount: normalized.transactions.length,
    debtCount: 0,
    holdingCount: 0,
    netWorth: assets - liabilities,
    assets,
    liabilities,
    debtBalance: liabilities,
    investmentValue: assets,
    income,
    expenses,
    cashFlow: income - expenses,
    savingsRate: income > 0 ? (income - expenses) / income : null,
    lastTransactionDate,
    lastAccountUpdate,
  }
}

export function buildMoneySummary(
  data: RawMoneyData,
  debts: MoneyDebt[],
  holdings: MoneyHolding[],
): MoneySummary {
  const summary = buildSummary(data)
  const debtBalance = normalizeDebts(debts).reduce(
    (total, debt) => total + debt.balance,
    0,
  )
  const investmentValue = normalizeHoldings(holdings).reduce(
    (total, holding) => total + holding.marketValue,
    0,
  )
  return {
    ...summary,
    debtCount: debts.length,
    holdingCount: holdings.length,
    debtBalance: debtBalance || summary.liabilities,
    investmentValue: investmentValue || summary.assets,
  }
}

export async function readSyncState(c: Context): Promise<SyncState> {
  return readJson<SyncState>(syncStatePath(getDataDir(c)), {
    generatedAt: new Date().toISOString(),
    status: 'idle',
    itemCursors: {},
  })
}

export async function writeSyncState(c: Context, syncState: SyncState) {
  await writeJson(syncStatePath(getDataDir(c)), syncState)
}

export async function readSettings(c: Context): Promise<MoneySettings> {
  return normalizeSettings(
    await readJson<PartialMoneySettings>(settingsPath(getDataDir(c)), {}),
  )
}

export async function writeSettings(
  c: Context,
  settings: MoneySettings,
): Promise<void> {
  await writeJson(settingsPath(getDataDir(c)), normalizeSettings(settings))
}

export async function readFxRates(c: Context): Promise<MoneyFxRate[]> {
  return normalizeFxRates(
    await readJson<MoneyFxRate[]>(fxRatesPath(getDataDir(c)), []),
  )
}

export async function writeFxRates(
  c: Context,
  rates: MoneyFxRate[],
): Promise<void> {
  await fs.mkdir(semanticDir(getDataDir(c)), { recursive: true })
  await writeJson(fxRatesPath(getDataDir(c)), normalizeFxRates(rates))
}

export async function readCollectionDefinitions(
  c: Context,
  fallback: CollectionDefinition[] = [],
): Promise<CollectionDefinition[]> {
  return readJson<CollectionDefinition[]>(
    collectionDefinitionsPath(getDataDir(c)),
    fallback,
  )
}

export async function writeCollectionDefinitions(
  c: Context,
  definitions: CollectionDefinition[],
): Promise<void> {
  await fs.mkdir(semanticDir(getDataDir(c)), { recursive: true })
  await writeJson(collectionDefinitionsPath(getDataDir(c)), definitions)
}

export async function readAllocationTargets(
  c: Context,
  fallback: MoneyAllocationTarget[] = DEFAULT_ALLOCATION_TARGETS,
): Promise<MoneyAllocationTarget[]> {
  return normalizeAllocationTargets(
    await readJson<MoneyAllocationTarget[]>(
      allocationTargetsPath(getDataDir(c)),
      fallback,
    ),
  )
}

export async function writeAllocationTargets(
  c: Context,
  targets: MoneyAllocationTarget[],
): Promise<void> {
  await fs.mkdir(semanticDir(getDataDir(c)), { recursive: true })
  await writeJson(
    allocationTargetsPath(getDataDir(c)),
    normalizeAllocationTargets(targets),
  )
}

export async function readForecastScenarios(
  c: Context,
): Promise<MoneyForecastScenario[]> {
  return normalizeForecastScenarios(
    await readJson<MoneyForecastScenario[]>(
      forecastScenariosPath(getDataDir(c)),
      DEFAULT_FORECAST_SCENARIOS,
    ),
  )
}

export async function writeForecastScenarios(
  c: Context,
  scenarios: MoneyForecastScenario[],
): Promise<void> {
  await fs.mkdir(semanticDir(getDataDir(c)), { recursive: true })
  await writeJson(
    forecastScenariosPath(getDataDir(c)),
    normalizeForecastScenarios(scenarios),
  )
}

export async function readTaxContributionLimits(
  c: Context,
): Promise<MoneyTaxContributionLimit[]> {
  return normalizeTaxContributionLimits(
    await readJson<MoneyTaxContributionLimit[]>(
      taxContributionLimitsPath(getDataDir(c)),
      DEFAULT_TAX_CONTRIBUTION_LIMITS,
    ),
  )
}

export async function writeTaxContributionLimits(
  c: Context,
  limits: MoneyTaxContributionLimit[],
): Promise<void> {
  await fs.mkdir(semanticDir(getDataDir(c)), { recursive: true })
  await writeJson(
    taxContributionLimitsPath(getDataDir(c)),
    normalizeTaxContributionLimits(limits),
  )
}

export async function readFormulaDefinitions(
  c: Context,
): Promise<MoneyFormulaDefinition[]> {
  return readJson<MoneyFormulaDefinition[]>(
    formulaDefinitionsPath(getDataDir(c)),
    [],
  )
}

export async function writeFormulaDefinitions(
  c: Context,
  definitions: MoneyFormulaDefinition[],
): Promise<void> {
  await fs.mkdir(metricsDir(getDataDir(c)), { recursive: true })
  await writeJson(formulaDefinitionsPath(getDataDir(c)), definitions)
}

export async function writeMaterializedMetric(
  c: Context,
  metric: MaterializedMetric,
): Promise<void> {
  await fs.mkdir(materializedMetricsDir(getDataDir(c)), { recursive: true })
  await writeJson(materializedMetricPath(getDataDir(c), metric.id), metric)
}

export async function deleteMaterializedMetric(
  c: Context,
  id: string,
): Promise<void> {
  await fs.rm(materializedMetricPath(getDataDir(c), id), { force: true })
}

export async function readMaterializedMetrics(
  c: Context,
): Promise<MaterializedMetric[]> {
  const dir = materializedMetricsDir(getDataDir(c))
  const entries = await fs.readdir(dir).catch(() => [])
  const metrics = await Promise.all(
    entries
      .filter((entry) => entry.endsWith('.json'))
      .map((entry) =>
        readJson<MaterializedMetric | null>(safePath(dir, entry), null),
      ),
  )
  return metrics.filter((metric): metric is MaterializedMetric =>
    Boolean(metric),
  )
}

export async function readCardDefinitions(
  c: Context,
  fallback: MoneyCardDefinition[] = [],
): Promise<MoneyCardDefinition[]> {
  const stored = await readJson<MoneyCardDefinition[] | null>(
    cardDefinitionsPath(getDataDir(c)),
    null,
  )
  if (!stored) return fallback
  if (fallback.length === 0) return stored
  return mergeFallbackCardDefinitions(fallback, stored)
}

export async function writeCardDefinitions(
  c: Context,
  definitions: MoneyCardDefinition[],
): Promise<void> {
  await fs.mkdir(cardsDir(getDataDir(c)), { recursive: true })
  await writeJson(cardDefinitionsPath(getDataDir(c)), definitions)
}

function mergeFallbackCardDefinitions(
  fallback: MoneyCardDefinition[],
  stored: MoneyCardDefinition[],
): MoneyCardDefinition[] {
  const byId = new Map<string, MoneyCardDefinition>()
  for (const definition of fallback) byId.set(definition.id, definition)
  for (const definition of stored) byId.set(definition.id, definition)
  return [...byId.values()]
}

export async function readDashboards(
  c: Context,
  fallback: MoneyDashboard[] = [],
): Promise<MoneyDashboard[]> {
  return readJson<MoneyDashboard[]>(dashboardsPath(getDataDir(c)), fallback)
}

export async function writeDashboards(
  c: Context,
  dashboards: MoneyDashboard[],
): Promise<void> {
  await fs.mkdir(cardsDir(getDataDir(c)), { recursive: true })
  await writeJson(dashboardsPath(getDataDir(c)), dashboards)
}

function transactionMonth(date: string) {
  return /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : 'unknown'
}

function normalizeBalanceSnapshotKind(
  kind: MoneyBalanceSnapshotKind,
): MoneyBalanceSnapshotKind {
  return [
    'account',
    'holding',
    'netWorth',
    'assets',
    'liabilities',
    'investment',
  ].includes(kind)
    ? kind
    : 'account'
}

function normalizeFactSource(
  source: MoneyBalanceSnapshot['source'],
): MoneyBalanceSnapshot['source'] {
  return ['plaid', 'manual', 'seed', 'derived'].includes(source)
    ? source
    : 'manual'
}

function normalizeSnapshotDate(value: string | undefined): string {
  if (value && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  return new Date().toISOString().slice(0, 10)
}

function normalizeSnapshotDateTime(value: string | undefined): string {
  if (!value) return new Date().toISOString()
  const parsed = Date.parse(value)
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString()
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00.000Z`
  return new Date().toISOString()
}

function accountNetWorthContribution(account: MoneyAccount): number {
  const value = finiteMoney(account.valueForSum ?? account.currentBalance)
  return account.isLiability ? -Math.abs(value) : value
}

function aggregateBalanceSnapshot(
  kind: Extract<
    MoneyBalanceSnapshotKind,
    'netWorth' | 'assets' | 'liabilities' | 'investment'
  >,
  value: number,
  date: string,
  source: MoneyBalanceSnapshot['source'],
  generatedAt: string,
): MoneyBalanceSnapshot {
  return {
    id: normalizeEntityId(`aggregate-${kind}-${date}`),
    source,
    kind,
    date,
    asOf: `${date}T00:00:00.000Z`,
    value,
    createdAt: generatedAt,
  }
}

function aggregateSnapshotSource(
  accounts: MoneyAccount[],
  holdings: MoneyHolding[],
): MoneyBalanceSnapshot['source'] {
  const sources = [...accounts, ...holdings].map((entry) => entry.source)
  if (sources.length === 0) return 'derived'
  if (sources.every((source) => source === 'seed')) return 'seed'
  if (sources.some((source) => source === 'plaid')) return 'plaid'
  return 'manual'
}

function latestSnapshotInputDate(
  accounts: MoneyAccount[],
  holdings: MoneyHolding[],
): string | undefined {
  return [
    ...accounts.map((account) => account.updatedAt ?? account.asOf),
    ...holdings.map((holding) => holding.asOf),
  ]
    .map(normalizeSnapshotDate)
    .sort((a, b) => b.localeCompare(a))[0]
}

async function readTransactionShardContainingId(
  dataDir: string,
  transactionId: string,
): Promise<{ month: string; transactions: MoneyTransaction[] } | null> {
  const dir = transactionsDir(dataDir)
  const entries = await fs.readdir(dir).catch(() => [])
  const shards = entries
    .filter((entry) => /^\d{4}-\d{2}\.json$/.test(entry))
    .sort()

  for (const shard of shards) {
    const transactions = await readJson<MoneyTransaction[]>(
      safePath(dir, shard),
      [],
    )
    if (transactions.some((transaction) => transaction.id === transactionId)) {
      return { month: shard.slice(0, 7), transactions }
    }
  }
  return null
}

async function patchRawTransactionIfPresent(
  c: Context,
  id: string,
  transaction: MoneyTransaction,
): Promise<void> {
  const raw = await readRawMoneyData(c)
  const rawIndex = raw.transactions.findIndex((entry) => entry.id === id)
  if (rawIndex === -1) return
  raw.transactions[rawIndex] = stripTransactionRuntimeExtensions(transaction)
  await writeRawMoneyData(c, normalizeRawMoneyData(raw))
}

function transactionMonthsForRange(
  startDate?: string,
  endDate?: string,
): string[] | undefined {
  if (!startDate || !endDate) return undefined
  if (!/^\d{4}-\d{2}/.test(startDate) || !/^\d{4}-\d{2}/.test(endDate)) {
    return undefined
  }
  const start = startDate.slice(0, 7)
  const end = endDate.slice(0, 7)
  if (start > end) return []

  const months: string[] = []
  let year = Number(start.slice(0, 4))
  let month = Number(start.slice(5, 7))
  const endYear = Number(end.slice(0, 4))
  const endMonth = Number(end.slice(5, 7))

  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return months
}

function compareTransactions(a: MoneyTransaction, b: MoneyTransaction) {
  return b.date.localeCompare(a.date) || a.name.localeCompare(b.name)
}

function compareBalanceSnapshots(
  a: MoneyBalanceSnapshot,
  b: MoneyBalanceSnapshot,
) {
  return (
    b.date.localeCompare(a.date) ||
    a.kind.localeCompare(b.kind) ||
    a.id.localeCompare(b.id)
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function safeFileSegment(value: string) {
  return (
    value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'item'
  )
}

function safeExtensionNamespace(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
}

function normalizeEntityId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function titleFromNamespace(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function normalizeRecommendationKind(
  value: MoneyRecommendationKind | undefined,
): MoneyRecommendationKind {
  return value && ['action', 'warning', 'opportunity'].includes(value)
    ? value
    : 'action'
}

function normalizeRecommendationStatus(
  value: MoneyRecommendationStatus | undefined,
): MoneyRecommendationStatus {
  return value &&
    [
      'required',
      'suggested',
      'accepted',
      'rejected',
      'done',
      'ignored',
    ].includes(value)
    ? value
    : 'suggested'
}

function normalizeRecommendationSeverity(
  value: MoneyRecommendationSeverity | undefined,
): MoneyRecommendationSeverity {
  return value && ['low', 'medium', 'high'].includes(value) ? value : 'medium'
}

function recommendationStatusRank(status: MoneyRecommendationStatus): number {
  return {
    required: 0,
    suggested: 1,
    accepted: 2,
    rejected: 3,
    done: 4,
    ignored: 5,
  }[status]
}

function recommendationSeverityRank(
  severity: MoneyRecommendationSeverity,
): number {
  return { low: 0, medium: 1, high: 2 }[severity]
}

function finiteMoney(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function finitePositiveMoney(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined
}

function numberValue(value: MoneyExtensionPrimitive | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function stringValue(value: MoneyExtensionPrimitive | undefined) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function laterDate(a: string | undefined, b: string | undefined) {
  if (!a) return b
  if (!b) return a
  return a > b ? a : b
}

function laterDateTime(a: string | undefined, b: string | undefined) {
  return laterDate(a, b) ?? new Date().toISOString()
}

function mergeEntityFacts<T extends { id: string }>(
  derived: T[],
  stored: T[],
): T[] {
  const byId = new Map(derived.map((entry) => [entry.id, entry]))
  for (const entry of stored) {
    byId.set(entry.id, { ...(byId.get(entry.id) ?? {}), ...entry })
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))
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
