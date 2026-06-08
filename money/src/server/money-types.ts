export type MoneyConnectionStatus = 'connected' | 'needs_reauth' | 'error'

export interface MoneyConnection {
  itemId: string
  credentialRef: string
  institutionId: string
  institutionName: string
  status: MoneyConnectionStatus
  products: string[]
  connectedAt: string
  lastSyncAt?: string
  lastError?: string
}

export type AccountType =
  | 'cash'
  | 'credit'
  | 'investment'
  | 'loan'
  | 'mortgage'
  | 'other'

export interface MoneyBalance {
  available?: number
  current?: number
  limit?: number
  currencyCode?: string
  updatedAt?: string
}

export interface MoneyReportingValue {
  reportingCurrency?: string
  reportingValue?: number
  reportingValueStatus?: MoneyFxRateStatus
  reportingFxRate?: number
  reportingFxAsOf?: string
  reportingFxSource?: MoneyFxRateSource | 'same-currency'
}

export type MoneyInvestmentAccountKind =
  | 'brokerage'
  | '401k'
  | 'ira'
  | 'roth_ira'
  | 'rrsp'
  | 'tfsa'
  | 'hsa'
  | '529'
  | 'other'

export type MoneyTaxTreatment =
  | 'taxable'
  | 'tax_deferred'
  | 'tax_free'
  | 'education'
  | 'hsa'
  | 'other'

export type MoneyAccountLiquidity =
  | 'cash'
  | 'near_cash'
  | 'marketable'
  | 'illiquid'
  | 'na'

export type MoneyLiquidityClass = 'liquid' | 'illiquid' | 'na'

export interface MoneyAccount extends MoneyReportingValue {
  id: string
  source: 'plaid' | 'manual' | 'seed'
  connectionId?: string
  itemId?: string
  institutionName?: string
  name: string
  officialName?: string
  type: AccountType
  subtype?: string
  mask?: string
  currentBalance: number
  isoCurrencyCode: string
  asOf: string
  balance?: MoneyBalance
  currencyCode?: string
  valueForSum?: number | null
  creditLimit?: number
  availableCredit?: number
  utilization?: number
  investmentAccountKind?: MoneyInvestmentAccountKind
  taxTreatment?: MoneyTaxTreatment
  liquidityTier?: 0 | 1 | 2 | 3
  liquidity?: MoneyAccountLiquidity
  liquidityClass?: MoneyLiquidityClass
  contributionLimitAnnual?: number
  contributionLimitYear?: number
  isAsset?: boolean
  isLiability?: boolean
  updatedAt?: string
  extensions?: Record<string, Record<string, MoneyExtensionPrimitive>>
}

export type TransactionDirection = 'income' | 'expense' | 'transfer'

export type MoneyExtensionPrimitive = string | number | boolean | null

export type MoneyExtensionEntity =
  | 'transaction'
  | 'account'
  | 'holding'
  | 'debt'
  | 'merchant'
  | 'person'

export type MoneyExtensionFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'money'
  | 'percent'
  | 'enum'

export type MoneyExtensionCoverage = 'exhaustive' | 'sparse'

export interface MoneyExtensionFieldDefinition {
  name: string
  label: string
  type: MoneyExtensionFieldType
  required?: boolean
  enumValues?: string[]
  description?: string
  formulaAliases?: string[]
}

export interface MoneyExtensionCollectionDefinition {
  id: string
  name: string
  entity: MoneyExtensionEntity
  baseCollection: string
  predicate: string
  description?: string
  examples?: string[]
}

export interface MoneyExtensionDefinition {
  namespace: string
  label: string
  entity: MoneyExtensionEntity
  description?: string
  coverage?: MoneyExtensionCoverage
  fields: MoneyExtensionFieldDefinition[]
  derivedCollections?: MoneyExtensionCollectionDefinition[]
  examples?: string[]
}

export interface MoneyExtensionRegistry {
  version: number
  extensions: MoneyExtensionDefinition[]
}

export interface MoneyExtensionValue {
  entity: MoneyExtensionEntity
  entityId: string
  namespace: string
  values: Record<string, MoneyExtensionPrimitive>
  source: 'user' | 'agent' | 'rule' | 'provider'
  confidence?: number
  updatedAt: string
}

export type MoneyTransactionLabelRuleScope = 'merchant' | 'pattern'
export type MoneyTransactionLabelRuleStatus = 'active' | 'disabled'

export interface MoneyTransactionLabelRuleMatch {
  merchantIds?: string[]
  merchantNames?: string[]
  textPattern?: string
  q?: string
  accountId?: string
  direction?: TransactionDirection
  category?: string
  currencyCode?: string
  minAmount?: number
  maxAmount?: number
  startDate?: string
  endDate?: string
}

export interface MoneyTransactionLabelRule {
  id: string
  name?: string
  scope: MoneyTransactionLabelRuleScope
  status: MoneyTransactionLabelRuleStatus
  namespace: string
  values: Record<string, MoneyExtensionPrimitive>
  match: MoneyTransactionLabelRuleMatch
  createdBy: 'user' | 'agent'
  confidence?: number
  createdAt: string
  updatedAt: string
}

export type MoneyExtensionProposalStatus = 'pending' | 'accepted' | 'rejected'

export interface MoneyExtensionProposal {
  id: string
  entity: MoneyExtensionEntity
  entityId: string
  namespace: string
  values: Record<string, MoneyExtensionPrimitive>
  source: 'agent' | 'rule' | 'provider'
  confidence?: number
  reason?: string
  status: MoneyExtensionProposalStatus
  model?: string
  batchId?: string
  createdAt: string
  updatedAt: string
  decidedAt?: string
  decisionReason?: string
}

export interface MoneyTransaction extends MoneyReportingValue {
  id: string
  source: 'plaid' | 'manual' | 'seed'
  connectionId?: string
  itemId?: string
  accountId?: string
  merchantName?: string
  name: string
  amount: number
  direction: TransactionDirection
  category: string[]
  providerCategoryPrimary?: string
  providerCategoryDetailed?: string
  providerPaymentChannel?: string
  transferReason?: string
  userCategory?: string
  notes?: string
  date: string
  isoCurrencyCode: string
  currencyCode?: string
  pending?: boolean
  recurring: boolean
  valueForSum?: number
  isIncome?: boolean
  isExpense?: boolean
  extensions?: Record<string, Record<string, MoneyExtensionPrimitive>>
}

export interface MoneyMerchant {
  id: string
  source: 'derived' | 'manual' | 'seed'
  name: string
  displayName?: string
  transactionCount: number
  income: number
  expenses: number
  netAmount: number
  lastTransactionDate?: string
  updatedAt: string
  extensions?: Record<string, Record<string, MoneyExtensionPrimitive>>
}

export interface MoneyPerson {
  id: string
  source: 'derived' | 'manual' | 'seed'
  name: string
  displayName?: string
  transactionCount: number
  amountOwedToMe: number
  amountIOwe: number
  amountSettled: number
  lastActivityDate?: string
  updatedAt: string
  extensions?: Record<string, Record<string, MoneyExtensionPrimitive>>
}

export type DebtType = 'credit' | 'mortgage' | 'student' | 'loan' | 'other'

export interface MoneyDebt extends MoneyReportingValue {
  id: string
  source: 'plaid' | 'manual' | 'seed'
  itemId?: string
  connectionId?: string
  accountId?: string
  institutionName?: string
  name: string
  type: DebtType
  balance: number
  apr?: number
  creditLimit?: number
  availableCredit?: number
  statementBalance?: number
  utilization?: number
  minimumPayment?: number
  nextPaymentDueDate?: string
  lastPaymentAmount?: number
  lastPaymentDate?: string
  isOverdue?: boolean
  currencyCode?: string
  updatedAt: string
}

export type MoneyAssetClass =
  | 'stocks'
  | 'bonds'
  | 'cash'
  | 'crypto'
  | 'funds'
  | 'options'
  | 'other'

export interface MoneyAllocationTarget {
  id: string
  name: string
  allocations: Partial<Record<MoneyAssetClass, number>>
  description?: string
  createdAt?: string
  updatedAt?: string
}

export type MoneyTaxContributionType = '401k' | 'ira' | 'hsa' | '529'
export type MoneyTaxContributionLimitVariant = 'standard' | 'self' | 'family'

export interface MoneyTaxContributionLimit {
  id: string
  type: MoneyTaxContributionType
  taxYear: number
  label: string
  limit: number
  variant?: MoneyTaxContributionLimitVariant
  catchUpLimit?: number
  catchUpAge?: number
  sourceLabel?: string
  sourceUrl?: string
  createdAt?: string
  updatedAt?: string
}

export type MoneyScenarioStatus = 'draft' | 'accepted' | 'rejected' | 'archived'

export interface MoneyForecastScenarioChange {
  id: string
  label: string
  amountMonthly?: number
  amountAnnual?: number
  percentChange?: number
  entity?: MoneyExtensionEntity
  entityId?: string
  namespace?: string
  status?: MoneyScenarioStatus
}

export interface MoneyForecastScenario {
  id: string
  name: string
  description?: string
  status: MoneyScenarioStatus
  horizonPeriods?: number
  confidence?: number
  changes: MoneyForecastScenarioChange[]
  createdAt?: string
  updatedAt?: string
}

export interface MoneyHolding extends MoneyReportingValue {
  id: string
  source: 'plaid' | 'manual' | 'seed'
  itemId?: string
  connectionId?: string
  accountId?: string
  institutionName?: string
  securityId?: string
  name: string
  tickerSymbol?: string
  type?: string
  assetClass?: MoneyAssetClass
  accountSubtype?: string
  accountName?: string
  investmentAccountKind?: MoneyInvestmentAccountKind
  taxTreatment?: MoneyTaxTreatment
  quantity: number
  price: number
  marketValue: number
  currencyCode?: string
  asOf: string
}

export type MoneyBalanceSnapshotKind =
  | 'account'
  | 'holding'
  | 'netWorth'
  | 'assets'
  | 'liabilities'
  | 'investment'

export interface MoneyBalanceSnapshot extends MoneyReportingValue {
  id: string
  source: 'plaid' | 'manual' | 'seed' | 'derived'
  kind: MoneyBalanceSnapshotKind
  date: string
  asOf: string
  value: number
  currencyCode?: string
  accountId?: string
  holdingId?: string
  itemId?: string
  institutionName?: string
  name?: string
  accountType?: AccountType
  accountSubtype?: string
  assetClass?: MoneyAssetClass
  createdAt: string
}

export interface RawMoneyData {
  accounts: MoneyAccount[]
  transactions: MoneyTransaction[]
}

export type MoneyRecommendationKind = 'action' | 'warning' | 'opportunity'
export type MoneyRecommendationStatus =
  | 'required'
  | 'suggested'
  | 'accepted'
  | 'rejected'
  | 'done'
  | 'ignored'
export type MoneyRecommendationSeverity = 'low' | 'medium' | 'high'

export interface MoneyRecommendationSourceLink {
  entity: MoneyExtensionEntity
  entityId: string
}

export interface MoneyRecommendation {
  id: string
  kind: MoneyRecommendationKind
  status: MoneyRecommendationStatus
  severity: MoneyRecommendationSeverity
  title: string
  reason?: string
  source: 'user' | 'agent' | 'rule' | 'provider'
  confidence?: number
  estimatedImpact?: number
  scenarioId?: string
  sourceLinks: MoneyRecommendationSourceLink[]
  createdAt: string
  updatedAt: string
  acceptedAt?: string
  rejectedAt?: string
  doneAt?: string
  ignoredAt?: string
}

export interface RawPlaidSyncEvidence {
  id: string
  itemId: string
  institutionName: string
  generatedAt: string
  trigger: 'manual' | 'scheduled'
  products: string[]
  cursor?: string
  nextCursor?: string
  hasMore: boolean
  counts: {
    accounts: number
    addedTransactions: number
    modifiedTransactions: number
    removedTransactions: number
    debts: number
    holdings: number
  }
  responses: {
    accounts: unknown
    transactions: unknown
    liabilities?: unknown
    investments?: unknown
  }
}

export type RawPlaidSyncEvidenceSummary = Omit<
  RawPlaidSyncEvidence,
  'responses'
>

export type CollectionId =
  | 'Accounts'
  | 'Assets'
  | 'LiquidAssets'
  | 'IlliquidAssets'
  | 'Liabilities'
  | 'Income'
  | 'Expenses'
  | 'Investments'
  | 'Subscriptions'
  | 'CardAccounts'
  | 'Cash'
  | 'Debt'
  | 'TaxSheltered'
  | 'ReviewActions'
  | 'Warnings'
  | 'Opportunities'
  | 'CashFlow'
  | 'Merchants'
  | 'Persons'
  | 'BalanceSnapshots'
  | 'NetWorthHistory'
  | 'AssetHistory'
  | 'LiabilityHistory'
  | 'InvestmentHistory'

export interface CollectionMetric {
  id: string
  label: string
  value: number
  count: number
}

export type FilterOperator =
  | '='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | 'contains'
  | 'in'

export interface FilterClause {
  field: string
  operator: FilterOperator
  value: string | number | boolean | string[] | number[]
}

export interface CollectionDefinition {
  id: string
  name: string
  entity:
    | 'account'
    | 'transaction'
    | 'holding'
    | 'debt'
    | 'recurring'
    | 'merchant'
    | 'person'
    | 'recommendation'
    | 'balanceSnapshot'
  filters: FilterClause[]
  defaultMeasure: 'amount' | 'balance' | 'marketValue' | 'payment'
  description?: string
}

export type FormulaOutputType =
  | 'money'
  | 'percent'
  | 'count'
  | 'number'
  | 'duration'
  | 'date'
  | 'forecast'
  | 'series'
  | 'table'
  | 'entity-list'

export interface MoneyFormulaDefinition {
  id: string
  name: string
  formula: string
  outputType: FormulaOutputType
  format: MoneyValueFormat
  description?: string
  referencedCollections: string[]
  createdAt: string
  updatedAt: string
}

export interface MaterializedMetric {
  id: string
  formulaId?: string
  cardId?: string
  formula: string
  value: FormulaResultValue
  displayValue: string
  outputType: FormulaOutputType
  referencedCollections: string[]
  generatedAt: string
}

export type MoneyValueFormat =
  | 'currency'
  | 'percent'
  | 'number'
  | 'compact'
  | 'duration'
  | 'date'

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

export interface MoneyCardDefinition {
  id: string
  title: string
  kind: CardKind
  formula: string
  primaryFormula?: string
  secondaryFormulas?: Record<string, string>
  visualization?: string
  timeWindow?: '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL'
  filters?: FilterClause[]
  outputType?: FormulaOutputType
  format: MoneyValueFormat
  maxDisplayValue?: number
  maxDisplayLabel?: string
  description?: string
  createdAt?: string
  updatedAt?: string
}

export interface EvaluatedMoneyCard extends MoneyCardDefinition {
  value: FormulaResultValue
  displayValue: string
  referencedCollections: string[]
  secondaryResults?: Record<string, EvaluatedMoneyCardSecondaryResult>
  secondaryReferencedCollections?: Record<string, string[]>
}

export type FormulaResultValue =
  | number
  | string
  | boolean
  | FormulaDateValue
  | FormulaDurationValue
  | FormulaForecastValue
  | FormulaSeriesValue
  | FormulaTableValue
  | FormulaEntityListValue

export interface EvaluatedMoneyCardSecondaryResult {
  formula: string
  value: FormulaResultValue
  displayValue: string
  outputType: FormulaOutputType
  referencedCollections: string[]
}

export interface FormulaDateValue {
  type: 'date'
  isoDate: string
}

export interface FormulaDurationValue {
  type: 'duration'
  amount: number
  unit: 'day' | 'week' | 'month' | 'year'
  days: number
}

export interface FormulaForecastValue {
  type: 'forecast'
  value: number
  low: number
  high: number
  confidence: number
  method:
    | 'point'
    | 'series-linear'
    | 'scenario-point'
    | 'scenario-series-linear'
  periods: number
  unit?: 'day' | 'week' | 'month' | 'year'
  basis: {
    value: number
    observations: number
  }
  scenario?: {
    id: string
    name: string
    status: MoneyScenarioStatus
    monthlyDelta: number
    annualDelta: number
    percentDelta: number
    acceptedChanges: number
    rejectedChanges: number
  }
  points?: Array<{
    key: string
    label: string
    value: number
    low: number
    high: number
  }>
}

export interface FormulaSeriesValue {
  type: 'series'
  points: Array<{
    key: string
    label: string
    value: number
    count: number
    startDate?: string
    endDate?: string
  }>
}

export interface FormulaTableValue {
  type: 'table'
  columns: Array<{
    key: string
    label: string
    kind: 'string' | 'number' | 'percent'
  }>
  rows: Array<Record<string, string | number | boolean | null>>
}

export interface FormulaEntityListValue {
  type: 'entity-list'
  entities: Array<{
    id: string
    label: string
    value: number
    kind:
      | 'account'
      | 'transaction'
      | 'debt'
      | 'holding'
      | 'merchant'
      | 'person'
      | 'recommendation'
      | 'balanceSnapshot'
    subtitle?: string
    fields: Record<string, string | number | boolean | null>
  }>
}

export interface MoneySnapshot {
  generatedAt: string
  accounts: MoneyAccount[]
  transactions: MoneyTransaction[]
  debts: MoneyDebt[]
  holdings: MoneyHolding[]
  balanceSnapshots: MoneyBalanceSnapshot[]
  merchants: MoneyMerchant[]
  persons: MoneyPerson[]
  recommendations: MoneyRecommendation[]
  collections: CollectionMetric[]
  cards: EvaluatedMoneyCard[]
}

export interface MoneyDashboard {
  id: string
  name: string
  cardIds: string[]
  order?: number
  createdAt: string
  updatedAt: string
}

export interface MoneySummary {
  generatedAt: string
  accountCount: number
  transactionCount: number
  debtCount: number
  holdingCount: number
  netWorth: number
  assets: number
  liabilities: number
  debtBalance: number
  investmentValue: number
  income: number
  expenses: number
  cashFlow: number
  savingsRate: number | null
  lastTransactionDate?: string
  lastAccountUpdate?: string
}

export interface MoneySettings {
  display: {
    dataMode: MoneyDataMode
    updatedAt: string
  }
  currency: {
    reportingCurrency: string
    updatedAt: string
  }
  sync: {
    scheduledRefreshEnabled: boolean
    intervalMinutes: number
    updatedAt: string
  }
  attention: {
    largeTransactionThreshold: number
    lookbackDays: number
    categoryThresholds: MoneyCategoryThreshold[]
    updatedAt: string
  }
}

export type MoneyDataMode = 'live' | 'demo'

export type MoneyFxRateSource = 'user' | 'agent' | 'provider' | 'market'
export type MoneyFxRateStatus = 'locked' | 'estimated'

export interface MoneyFxRate {
  id: string
  baseCurrency: string
  quoteCurrency: string
  rate: number
  asOf: string
  source: MoneyFxRateSource
  status: MoneyFxRateStatus
  createdAt: string
  updatedAt: string
}

export interface MoneyCategoryThreshold {
  category: string
  monthlyLimit: number
  enabled: boolean
}

export interface TransactionSearchFilters {
  q?: string
  accountId?: string
  direction?: TransactionDirection
  category?: string
  currencyCode?: string
  minAmount?: number
  maxAmount?: number
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
  cursor?: string
}

export interface SyncState {
  generatedAt: string
  lastAttemptAt?: string
  lastSyncAt?: string
  lastScheduledRunAt?: string
  nextScheduledRunAt?: string
  lastTrigger?: 'manual' | 'scheduled'
  lastError?: string
  status: 'idle' | 'blocked' | 'syncing' | 'error'
  itemCursors: Record<string, string>
}
