import {
  convertMoney,
  mergeMoneyFlowReportingValues,
  normalizeCurrencyCode,
} from './currency'
import {
  normalizeAccountLiquidity,
  normalizeInvestmentAccountKind,
  normalizeInvestmentAssetClass,
  normalizeTaxTreatment,
} from './investments'
import type {
  CollectionDefinition,
  CollectionId,
  CollectionMetric,
  EvaluatedMoneyCard,
  FormulaDateValue,
  FormulaDurationValue,
  FormulaEntityListValue,
  FormulaForecastValue,
  FormulaOutputType,
  FormulaResultValue,
  FormulaSeriesValue,
  FormulaTableValue,
  MoneyAccount,
  MoneyAllocationTarget,
  MoneyBalanceSnapshot,
  MoneyCardDefinition,
  MoneyDebt,
  MoneyExtensionPrimitive,
  MoneyExtensionRegistry,
  MoneyExtensionValue,
  MoneyForecastScenario,
  MoneyFxRate,
  MoneyHolding,
  MoneyMerchant,
  MoneyPerson,
  MoneyRecommendation,
  MoneySettings,
  MoneyTaxContributionLimit,
  MoneyTaxContributionLimitVariant,
  MoneyTaxContributionType,
  MoneyTransaction,
  RawMoneyData,
} from './money-types'
import type { AstNode } from 'langium'
import { createServicesForGrammar } from 'langium/grammar'

const MONEY_FORMULA_GRAMMAR = String.raw`
grammar MoneyFormula

interface Expression {}
interface BinaryExpression extends Expression {
  left: Expression
  operator: string
  right: Expression
}
interface UnaryExpression extends Expression {
  operator: string
  value: Expression
}
interface NumberLiteral extends Expression {
  value: number
}
interface StringLiteral extends Expression {
  value: string
}
interface BooleanLiteral extends Expression {
  value: boolean
}
interface DateLiteral extends Expression {
  value: string
}
interface DurationLiteral extends Expression {
  value: string
}
interface FieldReference extends Expression {
  name: string
}
interface FunctionCall extends Expression {
  name: string
  args: Expression[]
}
interface AggregateCall extends Expression {
  collection: string
  methods: MethodCall[]
}
interface MethodCall {
  name: string
  args: Expression[]
}

entry Formula:
  expression=Or;

Or returns Expression:
  And ({BinaryExpression.left=current} operator='or' right=And)*;

And returns Expression:
  Comparison ({BinaryExpression.left=current} operator='and' right=Comparison)*;

Comparison returns Expression:
  Addition ({BinaryExpression.left=current} operator=('=' | '!=' | '<' | '<=' | '>' | '>=') right=Addition)?;

Addition returns Expression:
  Multiplication ({BinaryExpression.left=current} operator=('+' | '-') right=Multiplication)*;

Multiplication returns Expression:
  Unary ({BinaryExpression.left=current} operator=('*' | '/' | '%') right=Unary)*;

Unary returns Expression:
  {UnaryExpression} operator=('-' | 'not') value=Unary | Primary;

Primary returns Expression:
  DateLiteral | DurationLiteral | NumberLiteral | StringLiteral | BooleanLiteral | AggregateCall | FunctionCall | FieldReference | '(' Or ')';

DateLiteral returns DateLiteral:
  value=DATE;

DurationLiteral returns DurationLiteral:
  value=DURATION;

NumberLiteral returns NumberLiteral:
  value=NUMBER;

StringLiteral returns StringLiteral:
  value=STRING;

BooleanLiteral returns BooleanLiteral:
  value=('true' | 'false');

AggregateCall returns AggregateCall:
  collection=ID methods+=MethodCall+;

FunctionCall returns FunctionCall:
  name=ID '(' (args+=Or (',' args+=Or)*)? ')';

MethodCall:
  '.' name=ID '(' (args+=Or (',' args+=Or)*)? ')';

FieldReference returns FieldReference:
  name=ID;

terminal DATE: /[0-9]{4}-[0-9]{2}-[0-9]{2}/;
terminal DURATION: /[0-9]+(\.[0-9]+)?(d|day|days|w|week|weeks|mo|month|months|y|year|years)/;
terminal NUMBER returns number: /[0-9]+(\.[0-9]+)?/;
terminal STRING: /"[^"\\]*(\\.[^"\\]*)*"/;
terminal ID: /[A-Za-z_][A-Za-z0-9_]*/;
hidden terminal WS: /\s+/;
`

type CollectionMethod =
  | 'Where'
  | 'Sum'
  | 'Count'
  | 'Average'
  | 'Min'
  | 'Max'
  | 'ThisMonth'
  | 'LastMonth'
  | 'YTD'
  | 'ThisYear'
  | 'LastYear'
  | 'Between'
  | 'PreviousPeriod'
  | 'DueSoon'
  | 'Rolling'
  | 'Daily'
  | 'Weekly'
  | 'Monthly'
  | 'Yearly'
  | 'PeriodSum'
  | 'PeriodAverage'
  | 'MonthlyAverage'
  | 'Unique'
  | 'Limit'
  | 'Offset'
  | 'PercentOfTotal'
  | 'Sort'
  | 'Top'
  | 'Bottom'
  | 'MinBy'
  | 'MaxBy'
  | 'GroupBy'
  | 'Trend'
  | 'MovingAverage'
  | 'Cumulative'

type MoneyFormulaAst = AstNode & {
  expression: MoneyExpression
}

export interface FormulaSourcePosition {
  line: number
  character: number
  offset: number
}

export interface FormulaSourceRange {
  start: FormulaSourcePosition
  end: FormulaSourcePosition
}

export interface FormulaDiagnostic {
  message: string
  range: FormulaSourceRange | null
}

export type FormulaValidationEntitySchema = {
  id: string
  fields: ReadonlyArray<{ name: string }>
}

export type FormulaValidationOptions = {
  collectionDefinitions?: ReadonlyArray<
    Pick<CollectionDefinition, 'id' | 'entity'>
  >
  entities?: ReadonlyArray<FormulaValidationEntitySchema>
  extensionRegistry?: MoneyExtensionRegistry
}

type MoneyExpression =
  | MoneyBinaryExpression
  | MoneyUnaryExpression
  | MoneyNumberLiteral
  | MoneyStringLiteral
  | MoneyBooleanLiteral
  | MoneyDateLiteral
  | MoneyDurationLiteral
  | MoneyFieldReference
  | MoneyFunctionCall
  | MoneyAggregateCall

type MoneyBinaryExpression = {
  left: MoneyExpression
  operator:
    | '+'
    | '-'
    | '*'
    | '/'
    | '%'
    | '='
    | '!='
    | '<'
    | '<='
    | '>'
    | '>='
    | 'and'
    | 'or'
  right: MoneyExpression
}

type MoneyUnaryExpression = {
  operator: '-' | 'not'
  value: MoneyExpression
}

type MoneyNumberLiteral = {
  value: number
}

type MoneyStringLiteral = {
  value: string
}

type MoneyBooleanLiteral = {
  value: boolean | 'true' | 'false'
}

type MoneyDateLiteral = {
  value: string
}

type MoneyDurationLiteral = {
  value: string
}

type MoneyFieldReference = {
  name: string
}

type MoneyFunctionCall = {
  name: string
  args: MoneyExpression[]
}

type MoneyMethodCall = {
  name: CollectionMethod
  args: MoneyExpression[]
}

type MoneyAggregateCall = {
  collection: string
  methods: MoneyMethodCall[]
}

type FormulaValue =
  | number
  | string
  | boolean
  | RuntimeCollection
  | FormulaDateValue
  | FormulaDurationValue
  | FormulaForecastValue
  | FormulaSeriesValue
  | FormulaTableValue
  | FormulaEntityListValue

export type MoneyFormulaData = RawMoneyData & {
  debts?: MoneyDebt[]
  holdings?: MoneyHolding[]
  merchants?: MoneyMerchant[]
  persons?: MoneyPerson[]
  recommendations?: MoneyRecommendation[]
  balanceSnapshots?: MoneyBalanceSnapshot[]
  extensions?: MoneyExtensionValue[]
  extensionRegistry?: MoneyExtensionRegistry
  allocationTargets?: MoneyAllocationTarget[]
  forecastScenarios?: MoneyForecastScenario[]
  taxContributionLimits?: MoneyTaxContributionLimit[]
  settings?: MoneySettings
  fxRates?: MoneyFxRate[]
}

export type MoneyFormulaTransactionRows = {
  collection?: string
  referencedCollections: string[]
  transactions: MoneyTransaction[]
  formulaFiltered: boolean
  unsupportedReason?: string
}

type RuntimeEntity =
  | MoneyAccount
  | MoneyTransaction
  | MoneyDebt
  | MoneyHolding
  | MoneyMerchant
  | MoneyPerson
  | MoneyRecommendation
  | MoneyBalanceSnapshot

type EvaluationContext = {
  collections: Map<string, RuntimeCollection>
  allocationTargets: Map<string, MoneyAllocationTarget>
  forecastScenarios: Map<string, MoneyForecastScenario>
  taxContributionLimits: MoneyTaxContributionLimit[]
  anchorDate?: Date
  row?: RuntimeEntity
  collection?: RuntimeCollection
}

type RuntimeCollection = {
  id: string
  label: string
  rows: RuntimeEntity[]
  anchorDate?: Date | null
  extensionNamespace?: string
  period?: PeriodUnit
  window?: CollectionWindow
  windowSourceRows?: RuntimeEntity[]
  fallbackValue?: number
  fallbackCount?: number
}

type PeriodUnit = 'day' | 'week' | 'month' | 'year'

type CollectionWindow = {
  startInclusive: Date
  endExclusive: Date
  shift: 'duration' | 'month' | 'year'
}

type NormalizedFormulaData = {
  accounts: MoneyAccount[]
  transactions: MoneyTransaction[]
  debts: MoneyDebt[]
  holdings: MoneyHolding[]
  merchants: MoneyMerchant[]
  persons: MoneyPerson[]
  recommendations: MoneyRecommendation[]
  balanceSnapshots: MoneyBalanceSnapshot[]
  extensionRegistry?: MoneyExtensionRegistry
  allocationTargets: MoneyAllocationTarget[]
  forecastScenarios: MoneyForecastScenario[]
  taxContributionLimits: MoneyTaxContributionLimit[]
  anchorDate?: Date
}

type ExtensionCollectionSpec = {
  id: string
  label: string
  namespace: string
  entity: 'account' | 'transaction' | 'debt' | 'holding' | 'merchant' | 'person'
}

const SUPPORTED_COLLECTION_METHODS = new Set<string>([
  'Where',
  'Sum',
  'Count',
  'Average',
  'Min',
  'Max',
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
  'PeriodSum',
  'PeriodAverage',
  'MonthlyAverage',
  'Unique',
  'Limit',
  'Offset',
  'PercentOfTotal',
  'Sort',
  'Top',
  'Bottom',
  'MinBy',
  'MaxBy',
  'GroupBy',
  'Trend',
  'MovingAverage',
  'Cumulative',
])

const SUPPORTED_FUNCTIONS = new Set<string>([
  'Runway',
  'SavingsRate',
  'ChangeVs',
  'DebtPayoff',
  'InterestDrag',
  'AllocationDrift',
  'CreditUtilization',
  'FreedomAge',
  'Forecast',
  'ForecastScenario',
  'ContributionRoom',
  'TableChange',
  'Aging',
])

const DEFAULT_EXTENSION_COLLECTIONS = [
  {
    id: 'RecurringObligations',
    label: 'Recurring Obligations',
    namespace: 'recurringObligation',
  },
  { id: 'JoyReview', label: 'Joy Review', namespace: 'joyReview' },
  {
    id: 'SharedExpenses',
    label: 'Shared Expenses',
    namespace: 'sharedExpense',
  },
  { id: 'MoneyFlows', label: 'Money Flows', namespace: 'moneyFlow' },
  {
    id: 'TaxContributions',
    label: 'Tax Contributions',
    namespace: 'taxContribution',
  },
  { id: 'BudgetLabels', label: 'Budget Labels', namespace: 'budget' },
] as const

const moneyFormulaServices = await createServicesForGrammar({
  grammar: MONEY_FORMULA_GRAMMAR,
  languageMetaData: {
    languageId: 'money-formula',
    fileExtensions: ['.moneyformula'],
    caseInsensitive: false,
    mode: 'production',
  },
  parserConfig: {
    skipValidations: false,
  },
})

export const DEFAULT_CARD_DEFINITIONS: MoneyCardDefinition[] = [
  {
    id: 'net-worth',
    title: 'Net Worth',
    kind: 'metric',
    formula: 'Accounts.Sum()',
    secondaryFormulas: {
      assets: 'Assets.Sum()',
      liabilities: 'Liabilities.Sum()',
      history: 'NetWorthHistory.Monthly().Trend()',
    },
    format: 'currency',
  },
  {
    id: 'net-worth-trend',
    title: 'Net Worth Trend',
    kind: 'trend',
    formula: 'NetWorthHistory.Monthly().Trend()',
    outputType: 'series',
    secondaryFormulas: {
      currentNetWorth: 'Accounts.Sum()',
      assets: 'Assets.Sum()',
      liabilities: 'Liabilities.Sum()',
    },
    format: 'currency',
    description:
      'Historical net-worth trend from balance snapshots, with current asset/liability context.',
  },
  {
    id: 'liquid-vs-illiquid',
    title: 'Liquid vs Illiquid',
    kind: 'breakdown',
    formula:
      'Accounts.Where(isAsset = true).GroupBy(liquidityClass).PercentOfTotal()',
    outputType: 'table',
    secondaryFormulas: {
      liquidAssets: 'LiquidAssets.Sum()',
      illiquidAssets: 'IlliquidAssets.Sum()',
      liquidRatio: 'LiquidAssets.Sum() / Assets.Sum()',
    },
    format: 'number',
    description:
      'FX-normalized asset liquidity split using account-level liquidity classification.',
  },
  {
    id: 'income-saved',
    title: '% Income Saved',
    kind: 'ratio',
    formula:
      'SavingsRate(Income.Rolling(6mo).Sum(), Expenses.Rolling(6mo).Sum())',
    secondaryFormulas: {
      allTime: 'SavingsRate(Income.Sum(), Expenses.Sum())',
      rollingIncome: 'Income.Rolling(6mo).Sum()',
      rollingExpenses: 'Expenses.Rolling(6mo).Sum()',
      currentMonth:
        'SavingsRate(Income.ThisMonth().Sum(), Expenses.ThisMonth().Sum())',
      currentMonthCashFlow: 'CashFlow.ThisMonth().Sum()',
    },
    timeWindow: '6M',
    format: 'percent',
    description:
      'Rolling six-month savings rate, with all-time and current-month context kept as secondary signals so partial months do not flatten the headline value.',
  },
  {
    id: 'monthly-cash-flow',
    title: 'Monthly Cash Flow',
    kind: 'metric',
    formula: 'Income.ThisMonth().Sum() - Expenses.ThisMonth().Sum()',
    timeWindow: '1M',
    format: 'currency',
  },
  {
    id: 'transaction-activity',
    title: 'Transaction Activity',
    kind: 'metric',
    formula: 'Transactions.ThisMonth().Count()',
    secondaryFormulas: {
      totalTransactions: 'Transactions.Count()',
      currentMonthVolume: 'Transactions.ThisMonth().Sum()',
      largestTransactions: 'Transactions.ThisMonth().Top(5)',
    },
    format: 'number',
    description:
      'Current-month transaction count with all-money-movement context.',
  },
  {
    id: 'transaction-direction-mix',
    title: 'Transaction Direction Mix',
    kind: 'breakdown',
    formula: 'Transactions.GroupBy(direction).PercentOfTotal()',
    outputType: 'table',
    secondaryFormulas: {
      incomeCount: 'Transactions.Where(direction = "income").Count()',
      expenseCount: 'Transactions.Where(direction = "expense").Count()',
      transferCount: 'Transactions.Where(direction = "transfer").Count()',
    },
    format: 'number',
    description:
      'Breakdown of income, expense, and transfer rows in the imported data.',
  },
  {
    id: 'provider-category-mix',
    title: 'Provider Category Mix',
    kind: 'breakdown',
    formula: 'Transactions.GroupBy(providerCategoryPrimary).PercentOfTotal()',
    outputType: 'table',
    secondaryFormulas: {
      uncategorized: 'Transactions.Where(providerCategoryPrimary = "").Count()',
      topDetailedCategories:
        'Transactions.GroupBy(providerCategoryDetailed).PercentOfTotal()',
    },
    format: 'number',
    description:
      'Provider category coverage for reviewing imported transaction classification.',
  },
  {
    id: 'transfer-volume',
    title: 'Transfer Volume',
    kind: 'metric',
    formula: 'Transfers.ThisMonth().Sum()',
    secondaryFormulas: {
      transferCount: 'Transfers.ThisMonth().Count()',
      creditCardPayments:
        'Transfers.ThisMonth().Where(transferReason = "credit_card_payment").Sum()',
      topTransfers: 'Transfers.ThisMonth().Top(5)',
    },
    format: 'currency',
    outputType: 'money',
    description:
      'Current-month money movement excluded from income and expenses.',
  },
  {
    id: 'credit-card-payment-volume',
    title: 'Credit Card Payment Volume',
    kind: 'metric',
    formula:
      'Transfers.ThisMonth().Where(transferReason = "credit_card_payment").Sum()',
    secondaryFormulas: {
      paymentCount:
        'Transfers.ThisMonth().Where(transferReason = "credit_card_payment").Count()',
      transferVolume: 'Transfers.ThisMonth().Sum()',
    },
    format: 'currency',
    outputType: 'money',
    description:
      'Structured credit-card payments normalized as transfers instead of expenses.',
  },
  {
    id: 'transfer-reasons',
    title: 'Transfer Reasons',
    kind: 'breakdown',
    formula: 'Transfers.GroupBy(transferReason).PercentOfTotal()',
    secondaryFormulas: {
      transferVolume: 'Transfers.Sum()',
      transferCount: 'Transfers.Count()',
    },
    format: 'number',
    outputType: 'table',
    description:
      'Breakdown of transfer classifications used to keep cash-flow cards clean.',
  },
  {
    id: 'money-flow-volume',
    title: 'Money Flow Volume',
    kind: 'metric',
    formula: 'MoneyFlows.Where(role != "fee").Sum()',
    secondaryFormulas: {
      flowCount: 'MoneyFlows.Where(role != "fee").Count()',
      fees: 'MoneyFlows.Where(role = "fee").Sum()',
      roles: 'MoneyFlows.GroupBy(role).PercentOfTotal()',
    },
    format: 'currency',
    outputType: 'money',
    description:
      'Labeled cross-account/cross-currency movement that should stay out of spending until final external spend or fees.',
  },
  {
    id: 'money-flow-fees',
    title: 'Money Flow Fees',
    kind: 'metric',
    formula: 'MoneyFlows.Where(role = "fee").Sum()',
    secondaryFormulas: {
      feeCount: 'MoneyFlows.Where(role = "fee").Count()',
      flowVolume: 'MoneyFlows.Where(role != "fee").Sum()',
    },
    format: 'currency',
    outputType: 'money',
    description:
      'Fees and losses attached to transfer flows, counted as spend while the principal remains a transfer.',
  },
  {
    id: 'monthly-spend',
    title: 'Monthly Spend',
    kind: 'metric',
    formula: 'Expenses.ThisMonth().Sum()',
    secondaryFormulas: {
      previousMonth: 'Expenses.LastMonth().Sum()',
      rollingAverage: 'Expenses.MonthlyAverage(6)',
      largestExpenses: 'Expenses.ThisMonth().Top(5)',
    },
    format: 'currency',
    outputType: 'money',
    description:
      'Current-month spend excluding transfers, with last-month and rolling-average context.',
  },
  {
    id: 'spend-change-vs-last-month',
    title: 'Spend Change vs Last Month',
    kind: 'comparison',
    formula: 'ChangeVs(Expenses.ThisMonth().Sum(), Expenses.LastMonth().Sum())',
    secondaryFormulas: {
      currentMonth: 'Expenses.ThisMonth().Sum()',
      previousMonth: 'Expenses.LastMonth().Sum()',
      rollingAverage: 'Expenses.MonthlyAverage(6)',
    },
    format: 'percent',
    outputType: 'percent',
    description:
      'Month-over-month spending change with current, previous, and rolling average spend.',
  },
  {
    id: 'cash-flow-trend',
    title: 'Cash Flow Trend',
    kind: 'trend',
    formula: 'CashFlow.Monthly().Trend().MovingAverage(3)',
    outputType: 'series',
    secondaryFormulas: {
      currentMonth: 'CashFlow.ThisMonth().Sum()',
      previousMonth: 'CashFlow.LastMonth().Sum()',
      monthOverMonth:
        'ChangeVs(CashFlow.ThisMonth().Sum(), CashFlow.LastMonth().Sum())',
    },
    format: 'currency',
    description:
      'Monthly cash-flow trend excluding transfers, with current and prior month context.',
  },
  {
    id: 'expense-trend',
    title: 'Expense Trend',
    kind: 'trend',
    formula: 'Expenses.Monthly().Trend().MovingAverage(3)',
    outputType: 'series',
    secondaryFormulas: {
      currentMonth: 'Expenses.ThisMonth().Sum()',
      previousMonth: 'Expenses.LastMonth().Sum()',
      monthOverMonth:
        'ChangeVs(Expenses.ThisMonth().Sum(), Expenses.LastMonth().Sum())',
    },
    format: 'currency',
    description:
      'Monthly spending trend with a moving average and month-over-month comparison.',
  },
  {
    id: 'active-subscriptions',
    title: 'Active Subscriptions',
    kind: 'list',
    formula: 'Subscriptions.Unique(subscriptionKey).Count()',
    secondaryFormulas: {
      monthlyCost: 'Subscriptions.Unique(subscriptionKey).Sum()',
      dueSoon: 'Subscriptions.DueSoon(45d).Unique(subscriptionKey).Count()',
    },
    format: 'number',
  },
  {
    id: 'subscription-cost',
    title: 'Subscription Cost',
    kind: 'metric',
    formula: 'Subscriptions.Unique(subscriptionKey).Sum()',
    secondaryFormulas: {
      activeSubscriptions: 'Subscriptions.Unique(subscriptionKey).Count()',
      dueSoon: 'Subscriptions.DueSoon(45d).Unique(subscriptionKey).Sum()',
    },
    format: 'currency',
  },
  {
    id: 'upcoming-subscriptions',
    title: 'Upcoming Subscriptions',
    kind: 'entity-list',
    formula:
      'Subscriptions.DueSoon(45d).Unique(subscriptionKey).Top(5, nextDueDate)',
    outputType: 'entity-list',
    secondaryFormulas: {
      dueSoonCost: 'Subscriptions.DueSoon(45d).Unique(subscriptionKey).Sum()',
      dueSoonCount:
        'Subscriptions.DueSoon(45d).Unique(subscriptionKey).Count()',
    },
    format: 'currency',
    description:
      'Upcoming active subscription renewals deduped by subscription key.',
  },
  {
    id: 'card-account-spend',
    title: 'Card Account Spend',
    kind: 'entity-list',
    formula: 'CardAccounts.Top(5, balance)',
    outputType: 'entity-list',
    secondaryFormulas: {
      cardBalance: 'CardAccounts.Sum()',
      utilization: 'CreditUtilization(CardAccounts.Where(creditLimit > 0))',
    },
    format: 'currency',
    description:
      'Credit/card-account balances with limits and utilization when available.',
  },
  {
    id: 'credit-utilization',
    title: 'Credit Utilization',
    kind: 'breakdown',
    formula: 'CreditUtilization(CardAccounts.Where(creditLimit > 0))',
    outputType: 'table',
    secondaryFormulas: {
      cardBalance: 'CardAccounts.Sum()',
    },
    format: 'percent',
  },
  {
    id: 'transaction-review-status',
    title: 'Transaction Review Status',
    kind: 'status',
    formula: 'ReviewActions.Where(status = "required").Count()',
    secondaryFormulas: {
      suggestions: 'ReviewActions.Where(status = "suggested").Count()',
      accepted: 'ReviewActions.Where(status = "accepted").Count()',
      rejected: 'ReviewActions.Where(status = "rejected").Count()',
      done: 'ReviewActions.Where(status = "done").Count()',
      opportunityEstimate: 'Opportunities.Sum()',
    },
    format: 'number',
    description:
      'Counts required, suggested, accepted, rejected, and completed review actions.',
  },
  {
    id: 'spending-change-impact',
    title: 'Spending Change Impact',
    kind: 'forecast',
    formula: 'ForecastScenario(Expenses.MonthlyAverage(6), "default")',
    secondaryFormulas: {
      annualizedSpend: 'Expenses.MonthlyAverage(6) * 12',
      possibleSavings:
        'ForecastScenario(Expenses.MonthlyAverage(6), "default")',
    },
    format: 'currency',
    description:
      'Applies selected spending-change scenarios to a monthly spending forecast.',
  },
  {
    id: 'debt-payoff-optimizer',
    title: 'Debt Payoff Optimizer',
    kind: 'optimizer',
    formula:
      'DebtPayoff(Debt.Where(balance > 0 and apr > 0), Debt.Where(balance > 0 and apr > 0).Sum() * 0.03, "avalanche")',
    outputType: 'table',
    secondaryFormulas: {
      totalDebt: 'Debt.Sum()',
      debtAccounts: 'Debt.Count()',
      highestApr: 'Debt.Where(balance > 0 and apr > 0).MaxBy(apr)',
      annualInterest: 'InterestDrag(Debt.Where(balance > 0 and apr > 0))',
    },
    format: 'currency',
  },
  {
    id: 'interest-drag',
    title: 'Interest Drag',
    kind: 'metric',
    formula: 'InterestDrag(Debt.Where(balance > 0 and apr > 0))',
    secondaryFormulas: {
      monthlyInterest:
        'InterestDrag(Debt.Where(balance > 0 and apr > 0), "monthly")',
      dailyInterest:
        'InterestDrag(Debt.Where(balance > 0 and apr > 0), "daily")',
      highAprDebts: 'Debt.Where(balance > 0 and apr > 0).Top(5, apr)',
    },
    format: 'currency',
    outputType: 'money',
    description:
      'Estimated interest cost from open debts, with monthly and daily context.',
  },
  {
    id: 'high-apr-debts',
    title: 'High APR Debts',
    kind: 'entity-list',
    formula: 'Debt.Where(balance > 0 and apr > 0).Top(5, apr)',
    secondaryFormulas: {
      annualInterest: 'InterestDrag(Debt.Where(balance > 0 and apr > 0))',
      monthlyInterest:
        'InterestDrag(Debt.Where(balance > 0 and apr > 0), "monthly")',
    },
    format: 'currency',
    outputType: 'entity-list',
    description: 'Highest APR open debts paired with estimated interest drag.',
  },
  {
    id: 'investments',
    title: 'Investments',
    kind: 'metric',
    formula: 'Investments.Sum()',
    format: 'currency',
  },
  {
    id: 'investment-allocation',
    title: 'Investment Allocation',
    kind: 'breakdown',
    formula:
      'AllocationDrift(Investments.GroupBy(assetClass).PercentOfTotal(), "default")',
    outputType: 'table',
    secondaryFormulas: {
      allocation: 'Investments.GroupBy(assetClass).PercentOfTotal()',
    },
    format: 'percent',
    description:
      'Compares current investment allocation with a configurable target mix.',
  },
  {
    id: 'investment-trend',
    title: 'Investment Trend',
    kind: 'trend',
    formula: 'InvestmentHistory.Monthly().Trend()',
    outputType: 'series',
    secondaryFormulas: {
      currentInvestments: 'Investments.Sum()',
      allocation: 'Investments.GroupBy(assetClass).PercentOfTotal()',
    },
    format: 'currency',
    description:
      'Historical investment balance trend from holding/account snapshots.',
  },
  {
    id: 'runway',
    title: 'Runway',
    kind: 'forecast',
    formula:
      'Runway(Cash.Sum(), Expenses.MonthlyAverage(6) - Income.MonthlyAverage(6))',
    secondaryFormulas: {
      cash: 'Cash.Sum()',
      monthlyBurn: 'Expenses.MonthlyAverage(6) - Income.MonthlyAverage(6)',
      monthlySpend: 'Expenses.MonthlyAverage(6)',
      monthlyIncome: 'Income.MonthlyAverage(6)',
    },
    timeWindow: '6M',
    format: 'duration',
    description:
      'Cash runway as a typed duration at the current rolling average monthly burn.',
  },
  {
    id: 'recurring-spend-by-need',
    title: 'Recurring Spend By Need',
    kind: 'comparison',
    formula: 'Expenses.ThisMonth().Where(recurring = true).Sum()',
    secondaryFormulas: {
      essentials: 'Expenses.ThisMonth().Where(need = "required").Sum()',
      lifestyleCreep: 'Expenses.ThisMonth().Where(need != "required").Sum()',
    },
    format: 'currency',
  },
  {
    id: 'savings-health',
    title: 'Savings Health',
    kind: 'status',
    formula:
      'SavingsRate(Income.Rolling(6mo).Sum(), Expenses.Rolling(6mo).Sum())',
    secondaryFormulas: {
      warnings: 'Expenses.Rolling(6mo).Top(3)',
      cashFlow: 'CashFlow.Rolling(6mo).Sum()',
      allTime: 'SavingsRate(Income.Sum(), Expenses.Sum())',
      rollingCashFlow: 'CashFlow.Rolling(6mo).Sum()',
      currentMonthCashFlow: 'CashFlow.ThisMonth().Sum()',
      currentMonthSavingsRate:
        'SavingsRate(Income.ThisMonth().Sum(), Expenses.ThisMonth().Sum())',
    },
    timeWindow: '6M',
    format: 'percent',
  },
  {
    id: 'upcoming-recurring-obligations',
    title: 'Upcoming Recurring Obligations',
    kind: 'forecast',
    formula: 'RecurringObligations.DueSoon(45d).Unique(key).Sum()',
    secondaryFormulas: {
      activeObligations: 'RecurringObligations.Unique(key).Count()',
      nextSubscriptions:
        'Subscriptions.DueSoon(45d).Unique(subscriptionKey).Top(5, nextDueDate)',
    },
    format: 'currency',
  },
  {
    id: 'tax-advantaged-contributions',
    title: 'Tax-Advantaged Contributions',
    kind: 'comparison',
    formula: 'ContributionRoom(TaxContributions.ThisYear())',
    outputType: 'table',
    secondaryFormulas: {
      contributed: 'TaxContributions.ThisYear().Sum()',
      hsaRoom:
        'ContributionRoom(TaxContributions.ThisYear(), "hsa", 2026, "self")',
      retirementRoom:
        'ContributionRoom(TaxContributions.ThisYear(), "401k", 2026)',
      unshelteredInvestments: 'Investments.Sum() - TaxSheltered.Sum()',
    },
    format: 'currency',
  },
  {
    id: 'income-sources',
    title: 'Income Sources',
    kind: 'status',
    formula: 'Income.Count()',
    secondaryFormulas: {
      monthlyIncome: 'Income.Rolling(6mo).Monthly().PeriodAverage(6)',
      incomeTrend: 'Income.Trend()',
    },
    format: 'number',
  },
  {
    id: 'joy-reviewed-spend',
    title: 'Joy-Reviewed Spend',
    kind: 'comparison',
    formula: 'JoyReview.Where(rating = "negative").Sum()',
    secondaryFormulas: {
      positiveSpend: 'JoyReview.Where(rating = "positive").Sum()',
      unreviewedSpend: 'Expenses.Where(joy = "").Sum()',
      discretionaryTop: 'JoyReview.Where(rating = "negative").Top(5)',
    },
    format: 'currency',
  },
  {
    id: 'shared-expense-reimbursements',
    title: 'Shared Expense Reimbursements',
    kind: 'entity-list',
    formula: 'SharedExpenses.Where(status = "owed").Top(5)',
    outputType: 'entity-list',
    secondaryFormulas: {
      owed: 'SharedExpenses.Where(status = "owed").Sum()',
      paid: 'SharedExpenses.Where(status = "paid").Sum()',
      people: 'Persons.Top(5, amountOwedToMe)',
    },
    format: 'currency',
    description:
      'Tracks shared expenses, reimbursement state, and people-level balances.',
  },
  {
    id: 'reimbursements-due',
    title: 'Reimbursements Due',
    kind: 'metric',
    formula: 'SharedExpenses.Where(status = "owed").Sum()',
    secondaryFormulas: {
      owedByPerson:
        'SharedExpenses.Where(status = "owed").GroupBy(personId).PercentOfTotal()',
      aging: 'Aging(SharedExpenses.Where(status = "owed"), dueDate)',
      paidThisYear: 'SharedExpenses.ThisYear().Where(status = "paid").Sum()',
    },
    format: 'currency',
    outputType: 'money',
    description:
      'Open reimbursable spend using shared-expense transaction labels.',
  },
  {
    id: 'reimbursements-by-person',
    title: 'Reimbursements By Person',
    kind: 'breakdown',
    formula:
      'SharedExpenses.Where(status = "owed").GroupBy(personId).PercentOfTotal()',
    outputType: 'table',
    secondaryFormulas: {
      owed: 'SharedExpenses.Where(status = "owed").Sum()',
      people: 'Persons.Top(5, amountOwedToMe)',
    },
    format: 'currency',
    description:
      'Open shared expenses grouped by personId for roommate and household tracking.',
  },
  {
    id: 'reimbursement-aging',
    title: 'Reimbursement Aging',
    kind: 'comparison',
    formula: 'Aging(SharedExpenses.Where(status = "owed"), dueDate)',
    outputType: 'table',
    secondaryFormulas: {
      owed: 'SharedExpenses.Where(status = "owed").Sum()',
      owedCount: 'SharedExpenses.Where(status = "owed").Count()',
    },
    format: 'currency',
    description:
      'Buckets open reimbursements by due date so overdue and upcoming money is visible.',
  },
  {
    id: 'financial-independence-projection',
    title: 'Financial Independence Projection',
    kind: 'forecast',
    formula:
      'FreedomAge(Assets.Sum(), Expenses.MonthlyAverage(6), Income.MonthlyAverage(6), 0, 0.04, 99)',
    secondaryFormulas: {
      monthsCovered: 'Assets.Sum() / Expenses.MonthlyAverage(6)',
      monthlySavings: 'Income.MonthlyAverage(6) - Expenses.MonthlyAverage(6)',
    },
    format: 'number',
    maxDisplayValue: 99,
    maxDisplayLabel: '99+',
  },
  {
    id: 'expense-breakdown',
    title: 'Expense Breakdown',
    kind: 'breakdown',
    formula: 'Expenses.Rolling(6mo).GroupBy(category).PercentOfTotal()',
    secondaryFormulas: {
      allTime: 'Expenses.GroupBy(category).PercentOfTotal()',
      currentMonth: 'Expenses.ThisMonth().GroupBy(category).PercentOfTotal()',
    },
    timeWindow: '6M',
    format: 'number',
  },
  {
    id: 'category-drift',
    title: 'Category Drift',
    kind: 'comparison',
    formula:
      'TableChange(Expenses.ThisMonth().GroupBy(category).PercentOfTotal(), Expenses.LastMonth().GroupBy(category).PercentOfTotal())',
    outputType: 'table',
    secondaryFormulas: {
      currentCategories:
        'Expenses.ThisMonth().GroupBy(category).PercentOfTotal()',
      previousCategories:
        'Expenses.LastMonth().GroupBy(category).PercentOfTotal()',
      spendChange:
        'ChangeVs(Expenses.ThisMonth().Sum(), Expenses.LastMonth().Sum())',
    },
    format: 'number',
    description: 'Current-month category mix compared with the previous month.',
  },
  {
    id: 'top-merchants',
    title: 'Top Merchants',
    kind: 'entity-list',
    formula: 'Merchants.Top(5, expenses)',
    outputType: 'entity-list',
    secondaryFormulas: {
      merchantCount: 'Merchants.Count()',
      totalMerchantSpend: 'Merchants.Sum()',
    },
    format: 'currency',
    description:
      'Canonical merchant rollup using provider merchant/name plus merchantGroup overrides.',
  },
  {
    id: 'monthly-merchant-spend',
    title: 'Monthly Merchant Spend',
    kind: 'breakdown',
    formula: 'Expenses.ThisMonth().GroupBy(merchantId).PercentOfTotal()',
    outputType: 'table',
    secondaryFormulas: {
      topTransactions: 'Expenses.ThisMonth().Top(5)',
    },
    format: 'currency',
    description:
      'Current-month spend grouped by canonical merchant id for merchant-level drilldowns.',
  },
  {
    id: 'largest-expenses',
    title: 'Largest Expenses',
    kind: 'entity-list',
    formula: 'Expenses.Rolling(6mo).Top(5)',
    secondaryFormulas: {
      currentMonth: 'Expenses.ThisMonth().Top(5)',
      allTime: 'Expenses.Top(5)',
    },
    timeWindow: '6M',
    format: 'currency',
  },
]

export const DEFAULT_COLLECTION_DEFINITIONS: CollectionDefinition[] = [
  {
    id: 'Transactions',
    name: 'Transactions',
    entity: 'transaction',
    filters: [],
    defaultMeasure: 'amount',
  },
  {
    id: 'Accounts',
    name: 'Accounts',
    entity: 'account',
    filters: [],
    defaultMeasure: 'balance',
  },
  {
    id: 'Assets',
    name: 'Assets',
    entity: 'account',
    filters: [{ field: 'isAsset', operator: '=', value: true }],
    defaultMeasure: 'balance',
  },
  {
    id: 'LiquidAssets',
    name: 'Liquid Assets',
    entity: 'account',
    filters: [
      { field: 'isAsset', operator: '=', value: true },
      { field: 'liquidityClass', operator: '=', value: 'liquid' },
    ],
    defaultMeasure: 'balance',
  },
  {
    id: 'IlliquidAssets',
    name: 'Illiquid Assets',
    entity: 'account',
    filters: [
      { field: 'isAsset', operator: '=', value: true },
      { field: 'liquidityClass', operator: '=', value: 'illiquid' },
    ],
    defaultMeasure: 'balance',
  },
  {
    id: 'Liabilities',
    name: 'Liabilities',
    entity: 'account',
    filters: [{ field: 'isLiability', operator: '=', value: true }],
    defaultMeasure: 'balance',
  },
  {
    id: 'Income',
    name: 'Income',
    entity: 'transaction',
    filters: [{ field: 'isIncome', operator: '=', value: true }],
    defaultMeasure: 'amount',
  },
  {
    id: 'Expenses',
    name: 'Expenses',
    entity: 'transaction',
    filters: [{ field: 'isExpense', operator: '=', value: true }],
    defaultMeasure: 'amount',
  },
  {
    id: 'Transfers',
    name: 'Transfers',
    entity: 'transaction',
    filters: [{ field: 'direction', operator: '=', value: 'transfer' }],
    defaultMeasure: 'amount',
  },
  {
    id: 'Subscriptions',
    name: 'Subscriptions',
    entity: 'recurring',
    filters: [{ field: 'recurring', operator: '=', value: true }],
    defaultMeasure: 'amount',
  },
  {
    id: 'CardAccounts',
    name: 'Card Accounts',
    entity: 'account',
    filters: [{ field: 'type', operator: '=', value: 'credit' }],
    defaultMeasure: 'balance',
  },
  {
    id: 'Investments',
    name: 'Investments',
    entity: 'holding',
    filters: [],
    defaultMeasure: 'marketValue',
  },
  {
    id: 'Cash',
    name: 'Cash',
    entity: 'account',
    filters: [{ field: 'type', operator: '=', value: 'cash' }],
    defaultMeasure: 'balance',
  },
  {
    id: 'Debt',
    name: 'Debt',
    entity: 'debt',
    filters: [{ field: 'isLiability', operator: '=', value: true }],
    defaultMeasure: 'balance',
  },
  {
    id: 'TaxSheltered',
    name: 'Tax Sheltered',
    entity: 'account',
    filters: [
      {
        field: 'taxTreatment',
        operator: 'in',
        value: ['tax_deferred', 'tax_free', 'education', 'hsa'],
      },
    ],
    defaultMeasure: 'balance',
  },
  {
    id: 'ReviewActions',
    name: 'Review Actions',
    entity: 'recommendation',
    filters: [],
    defaultMeasure: 'amount',
  },
  {
    id: 'Warnings',
    name: 'Warnings',
    entity: 'recommendation',
    filters: [{ field: 'kind', operator: '=', value: 'warning' }],
    defaultMeasure: 'amount',
  },
  {
    id: 'Opportunities',
    name: 'Opportunities',
    entity: 'recommendation',
    filters: [{ field: 'kind', operator: '=', value: 'opportunity' }],
    defaultMeasure: 'amount',
  },
  {
    id: 'Merchants',
    name: 'Merchants',
    entity: 'merchant',
    filters: [],
    defaultMeasure: 'amount',
  },
  {
    id: 'Persons',
    name: 'Persons',
    entity: 'person',
    filters: [],
    defaultMeasure: 'amount',
  },
  {
    id: 'BalanceSnapshots',
    name: 'Balance Snapshots',
    entity: 'balanceSnapshot',
    filters: [],
    defaultMeasure: 'amount',
    description: 'Dated account, holding, and aggregate balance facts.',
  },
  {
    id: 'NetWorthHistory',
    name: 'Net Worth History',
    entity: 'balanceSnapshot',
    filters: [{ field: 'kind', operator: '=', value: 'netWorth' }],
    defaultMeasure: 'amount',
    description:
      'Snapshot-backed net worth history; Trend uses latest value per period.',
  },
  {
    id: 'AssetHistory',
    name: 'Asset History',
    entity: 'balanceSnapshot',
    filters: [{ field: 'kind', operator: '=', value: 'assets' }],
    defaultMeasure: 'amount',
    description: 'Snapshot-backed asset balance history.',
  },
  {
    id: 'LiabilityHistory',
    name: 'Liability History',
    entity: 'balanceSnapshot',
    filters: [{ field: 'kind', operator: '=', value: 'liabilities' }],
    defaultMeasure: 'amount',
    description: 'Snapshot-backed liability balance history.',
  },
  {
    id: 'InvestmentHistory',
    name: 'Investment History',
    entity: 'balanceSnapshot',
    filters: [{ field: 'kind', operator: '=', value: 'investment' }],
    defaultMeasure: 'amount',
    description: 'Snapshot-backed investment balance history.',
  },
]

export function buildCollections(data: MoneyFormulaData): CollectionMetric[] {
  const formulaData = normalizeFormulaData(data)
  const {
    accounts,
    transactions,
    debts,
    holdings,
    merchants,
    persons,
    recommendations,
    balanceSnapshots,
    extensionRegistry,
  } = formulaData
  const assets = accounts.filter((account) => !isLiabilityAccount(account))
  const liquidAssets = assets.filter(isLiquidAssetAccount)
  const illiquidAssets = assets.filter(isIlliquidAssetAccount)
  const liabilities = accounts.filter((account) => isLiabilityAccount(account))
  const income = transactions.filter(
    (transaction) => transaction.direction === 'income',
  )
  const expenses = transactions.filter(
    (transaction) => transaction.direction === 'expense',
  )
  const cashFlowRows = cashFlowRuntimeRows(income, expenses)
  const transfers = transactions.filter(
    (transaction) => transaction.direction === 'transfer',
  )
  const investmentAccounts = accounts.filter(isInvestmentAccount)
  const investments: RuntimeEntity[] =
    holdings.length > 0 ? holdings : investmentAccounts
  const cardAccounts = accounts.filter((account) => account.type === 'credit')
  const cash = accounts.filter((account) => account.type === 'cash')
  const debt: RuntimeEntity[] =
    debts.length > 0
      ? debts
      : accounts.filter(
          (account) =>
            account.currentBalance < 0 ||
            ['credit', 'loan', 'mortgage'].includes(account.type),
        )
  const taxSheltered = investmentAccounts.filter(
    isTaxShelteredInvestmentAccount,
  )
  const anchorDate = formulaData.anchorDate
  const subscriptions = expenses.filter((transaction) =>
    isSubscriptionTransaction(transaction, anchorDate),
  )
  const warnings = recommendations.filter(
    (recommendation) => recommendation.kind === 'warning',
  )
  const opportunities = recommendations.filter(
    (recommendation) => recommendation.kind === 'opportunity',
  )
  const netWorthHistory = balanceSnapshots.filter(
    (snapshot) => snapshot.kind === 'netWorth',
  )
  const assetHistory = balanceSnapshots.filter(
    (snapshot) => snapshot.kind === 'assets',
  )
  const liabilityHistory = balanceSnapshots.filter(
    (snapshot) => snapshot.kind === 'liabilities',
  )
  const investmentHistory = balanceSnapshots.filter(
    (snapshot) => snapshot.kind === 'investment',
  )
  const subscriptionRuntime = extensionRuntimeCollection(
    'Subscriptions',
    'Subscriptions',
    subscriptions,
    'subscription',
  )

  const metrics: CollectionMetric[] = [
    {
      id: 'Transactions',
      label: 'Transactions',
      value: sumRows('Transactions', 'Transactions', transactions),
      count: transactions.length,
    },
    {
      id: 'Accounts',
      label: 'Accounts',
      value: sumRows('Accounts', 'Accounts', accounts),
      count: accounts.length,
    },
    {
      id: 'Assets',
      label: 'Assets',
      value: sumRows('Assets', 'Assets', assets),
      count: assets.length,
    },
    {
      id: 'LiquidAssets',
      label: 'Liquid Assets',
      value: sumRows('LiquidAssets', 'Liquid Assets', liquidAssets),
      count: liquidAssets.length,
    },
    {
      id: 'IlliquidAssets',
      label: 'Illiquid Assets',
      value: sumRows('IlliquidAssets', 'Illiquid Assets', illiquidAssets),
      count: illiquidAssets.length,
    },
    {
      id: 'Liabilities',
      label: 'Liabilities',
      value: sumRows('Liabilities', 'Liabilities', liabilities),
      count: liabilities.length,
    },
    {
      id: 'Income',
      label: 'Income',
      value: sumRows('Income', 'Income', income),
      count: income.length,
    },
    {
      id: 'Expenses',
      label: 'Expenses',
      value: sumRows('Expenses', 'Expenses', expenses),
      count: expenses.length,
    },
    {
      id: 'Transfers',
      label: 'Transfers',
      value: sumRows('Transfers', 'Transfers', transfers),
      count: transfers.length,
    },
    {
      id: 'Investments',
      label: 'Investments',
      value: sum(
        investments.map((row) =>
          rowMeasure(
            runtimeCollection('Investments', 'Investments', [row]),
            row,
          ),
        ),
      ),
      count: investments.length,
    },
    {
      id: 'Subscriptions',
      label: 'Subscriptions',
      value: sumCollection(subscriptionRuntime),
      count: subscriptions.length,
    },
    {
      id: 'CardAccounts',
      label: 'Card Accounts',
      value: sumRows('CardAccounts', 'Card Accounts', cardAccounts),
      count: cardAccounts.length,
    },
    {
      id: 'Cash',
      label: 'Cash',
      value: sumRows('Cash', 'Cash', cash),
      count: cash.length,
    },
    {
      id: 'Debt',
      label: 'Debt',
      value: sum(
        debt.map((row) =>
          rowMeasure(runtimeCollection('Debt', 'Debt', [row]), row),
        ),
      ),
      count: debt.length,
    },
    {
      id: 'TaxSheltered',
      label: 'Tax Sheltered',
      value: sumRows('TaxSheltered', 'Tax Sheltered', taxSheltered),
      count: taxSheltered.length,
    },
    {
      id: 'Merchants',
      label: 'Merchants',
      value: sum(
        merchants.map((merchant) =>
          rowMeasure(
            runtimeCollection('Merchants', 'Merchants', [merchant]),
            merchant,
          ),
        ),
      ),
      count: merchants.length,
    },
    {
      id: 'Persons',
      label: 'Persons',
      value: sum(
        persons.map((person) =>
          rowMeasure(runtimeCollection('Persons', 'Persons', [person]), person),
        ),
      ),
      count: persons.length,
    },
    {
      id: 'ReviewActions',
      label: 'Review Actions',
      value: sum(
        recommendations.map(
          (recommendation) => recommendation.estimatedImpact ?? 0,
        ),
      ),
      count: recommendations.length,
    },
    {
      id: 'Warnings',
      label: 'Warnings',
      value: sum(
        warnings.map((recommendation) => recommendation.estimatedImpact ?? 0),
      ),
      count: warnings.length,
    },
    {
      id: 'Opportunities',
      label: 'Opportunities',
      value: sum(
        opportunities.map(
          (recommendation) => recommendation.estimatedImpact ?? 0,
        ),
      ),
      count: opportunities.length,
    },
    {
      id: 'BalanceSnapshots',
      label: 'Balance Snapshots',
      value: latestSnapshotValue(balanceSnapshots),
      count: balanceSnapshots.length,
    },
    {
      id: 'NetWorthHistory',
      label: 'Net Worth History',
      value: latestSnapshotValue(netWorthHistory),
      count: netWorthHistory.length,
    },
    {
      id: 'AssetHistory',
      label: 'Asset History',
      value: latestSnapshotValue(assetHistory),
      count: assetHistory.length,
    },
    {
      id: 'LiabilityHistory',
      label: 'Liability History',
      value: latestSnapshotValue(liabilityHistory),
      count: liabilityHistory.length,
    },
    {
      id: 'InvestmentHistory',
      label: 'Investment History',
      value: latestSnapshotValue(investmentHistory),
      count: investmentHistory.length,
    },
  ]

  metrics.push({
    id: 'CashFlow',
    label: 'Cash Flow',
    value: sum(cashFlowRows.map((transaction) => transaction.valueForSum ?? 0)),
    count: cashFlowRows.length,
  })

  const existingMetricIds = new Set(metrics.map((metric) => metric.id))
  metrics.push(
    ...buildExtensionCollectionMetrics(formulaData, extensionRegistry).filter(
      (metric) => !existingMetricIds.has(metric.id),
    ),
  )

  return metrics
}

function sumRows(id: string, label: string, rows: RuntimeEntity[]): number {
  const collection = runtimeCollection(id, label, rows)
  return sum(rows.map((row) => rowMeasure(collection, row)))
}

function cashFlowRuntimeRows(
  income: MoneyTransaction[],
  expenses: MoneyTransaction[],
): MoneyTransaction[] {
  return [
    ...income.map((transaction) => ({
      ...transaction,
      valueForSum: Math.abs(transaction.valueForSum ?? transaction.amount),
    })),
    ...expenses.map((transaction) => ({
      ...transaction,
      valueForSum: -Math.abs(transaction.valueForSum ?? transaction.amount),
    })),
  ]
}

function normalizeFormulaData(data: MoneyFormulaData): NormalizedFormulaData {
  const extensions = data.extensions ?? []
  const accounts = overlayEntityExtensions(
    data.accounts,
    'account',
    extensions,
  ).map((rawAccount) => {
    const account = applyFormulaAccountReporting(
      rawAccount,
      data.settings,
      data.fxRates,
    )
    const isLiability =
      account.isLiability ??
      (account.currentBalance < 0 ||
        ['credit', 'loan', 'mortgage'].includes(account.type))
    const isAsset =
      account.isAsset ??
      (!isLiability || ['cash', 'investment'].includes(account.type))
    const investmentAccountKind = normalizeInvestmentAccountKind(account)
    const taxTreatment = normalizeTaxTreatment({
      ...account,
      investmentAccountKind,
    })
    const liquidity = normalizeAccountLiquidity({
      ...account,
      isAsset,
      isLiability,
      investmentAccountKind,
      taxTreatment,
    })
    return {
      ...account,
      isAsset,
      isLiability,
      investmentAccountKind,
      taxTreatment,
      ...liquidity,
    }
  })
  const transactions = overlayEntityExtensions(
    data.transactions,
    'transaction',
    extensions,
  )
    .map((transaction) =>
      applyFormulaMoneyFlowSemantics(transaction, data.settings, data.fxRates),
    )
    .map((transaction) =>
      applyFormulaLinkedAccountTransferSemantics(transaction, accounts),
    )
    .map((transaction) =>
      applyFormulaTransactionReporting(
        transaction,
        data.settings,
        data.fxRates,
      ),
    )
  const merchants = mergeFormulaMerchants(
    buildFormulaMerchantFacts(transactions),
    overlayEntityExtensions(data.merchants ?? [], 'merchant', extensions),
  )
  const debts = overlayEntityExtensions(
    data.debts ?? [],
    'debt',
    extensions,
  ).map((debt) => applyFormulaDebtReporting(debt, data.settings, data.fxRates))
  const holdings = overlayEntityExtensions(
    data.holdings ?? [],
    'holding',
    extensions,
  ).map((rawHolding) => {
    const holding = applyFormulaHoldingReporting(
      rawHolding,
      data.settings,
      data.fxRates,
    )
    const account = accounts.find((entry) => entry.id === holding.accountId)
    const investmentAccountKind = normalizeInvestmentAccountKind({
      type: 'investment',
      subtype: holding.accountSubtype ?? account?.subtype,
      name: holding.accountName ?? account?.name ?? holding.name,
      officialName: account?.officialName,
      investmentAccountKind:
        holding.investmentAccountKind ?? account?.investmentAccountKind,
    })
    const taxTreatment = normalizeTaxTreatment({
      type: 'investment',
      subtype: holding.accountSubtype ?? account?.subtype,
      name: holding.accountName ?? account?.name ?? holding.name,
      officialName: account?.officialName,
      investmentAccountKind,
      taxTreatment: holding.taxTreatment ?? account?.taxTreatment,
    })
    return {
      ...holding,
      accountSubtype: holding.accountSubtype ?? account?.subtype,
      accountName: holding.accountName ?? account?.name,
      investmentAccountKind,
      taxTreatment,
      assetClass: normalizeInvestmentAssetClass(holding),
    }
  })
  const persons = overlayEntityExtensions(
    data.persons ?? [],
    'person',
    extensions,
  )
  const recommendations = data.recommendations ?? []
  const balanceSnapshots = (data.balanceSnapshots ?? []).map((snapshot) =>
    applyFormulaBalanceSnapshotReporting(snapshot, data.settings, data.fxRates),
  )
  const anchorDate = latestRuntimeAnchorDate([
    ...accounts,
    ...transactions,
    ...debts,
    ...holdings,
    ...merchants,
    ...persons,
    ...recommendations,
    ...balanceSnapshots,
  ])
  return {
    accounts,
    transactions,
    debts,
    holdings,
    merchants,
    persons,
    recommendations,
    balanceSnapshots,
    extensionRegistry: data.extensionRegistry,
    allocationTargets: data.allocationTargets ?? [],
    forecastScenarios: data.forecastScenarios ?? [],
    taxContributionLimits: data.taxContributionLimits ?? [],
    anchorDate,
  }
}

function overlayEntityExtensions<T extends { id: string }>(
  rows: T[],
  entity: MoneyExtensionValue['entity'],
  extensions: MoneyExtensionValue[],
): T[] {
  const byEntityId = new Map<
    string,
    Record<string, Record<string, MoneyExtensionPrimitive>>
  >()
  for (const extension of extensions) {
    if (extension.entity !== entity) continue
    const existing = byEntityId.get(extension.entityId) ?? {}
    existing[extension.namespace] = {
      ...(existing[extension.namespace] ?? {}),
      ...extension.values,
    }
    byEntityId.set(extension.entityId, existing)
  }

  if (byEntityId.size === 0) return rows
  return rows.map((row) => {
    const rowExtensions = byEntityId.get(row.id)
    if (!rowExtensions) return row
    const existing = runtimeExtensions(row)
    return {
      ...row,
      extensions: {
        ...existing,
        ...rowExtensions,
      },
    }
  })
}

function applyFormulaAccountReporting(
  account: MoneyAccount,
  settings?: MoneySettings,
  fxRates?: MoneyFxRate[],
): MoneyAccount {
  const converted = convertFormulaReportingValue(
    account.valueForSum ?? account.currentBalance,
    account.currencyCode ?? account.isoCurrencyCode,
    account.asOf,
    settings,
    fxRates,
  )
  if (!converted) return account
  return {
    ...account,
    currentBalance: converted.amount,
    valueForSum: converted.amount,
    reportingCurrency: converted.currency,
    reportingValue: converted.amount,
    reportingValueStatus: converted.status,
    reportingFxRate: converted.rate,
    reportingFxAsOf: converted.asOf,
    reportingFxSource: converted.source,
  }
}

function applyFormulaTransactionReporting(
  transaction: MoneyTransaction,
  settings?: MoneySettings,
  fxRates?: MoneyFxRate[],
): MoneyTransaction {
  const moneyFlow = transaction.extensions?.moneyFlow
  const moneyFlowReportingValue = moneyFlowNumber(moneyFlow?.reportingValue)
  if (moneyFlowReportingValue !== undefined) {
    const reportingCurrency = normalizeCurrencyCode(
      moneyFlow?.reportingCurrency,
      settings?.currency.reportingCurrency ??
        transaction.currencyCode ??
        transaction.isoCurrencyCode,
    )
    const reportingValue = Math.abs(moneyFlowReportingValue)
    return {
      ...transaction,
      valueForSum: reportingValue,
      reportingCurrency,
      reportingValue,
      reportingValueStatus:
        moneyFlow?.reportingValueStatus === 'estimated'
          ? 'estimated'
          : 'locked',
      reportingFxRate: moneyFlowNumber(moneyFlow?.reportingFxRate) ?? 1,
      reportingFxAsOf:
        typeof moneyFlow?.reportingFxAsOf === 'string'
          ? moneyFlow.reportingFxAsOf
          : transaction.date,
      reportingFxSource: formulaReportingFxSource(moneyFlow?.reportingFxSource),
    }
  }

  const converted = convertFormulaReportingValue(
    Math.abs(transaction.valueForSum ?? transaction.amount),
    transaction.currencyCode ?? transaction.isoCurrencyCode,
    transaction.date,
    settings,
    fxRates,
  )
  if (!converted) return transaction
  return {
    ...transaction,
    valueForSum: converted.amount,
    reportingCurrency: converted.currency,
    reportingValue: converted.amount,
    reportingValueStatus: converted.status,
    reportingFxRate: converted.rate,
    reportingFxAsOf: converted.asOf,
    reportingFxSource: converted.source,
  }
}

function applyFormulaDebtReporting(
  debt: MoneyDebt,
  settings?: MoneySettings,
  fxRates?: MoneyFxRate[],
): MoneyDebt {
  const converted = convertFormulaReportingValue(
    debt.balance,
    debt.currencyCode,
    debt.updatedAt,
    settings,
    fxRates,
  )
  if (!converted) return debt
  return {
    ...debt,
    balance: converted.amount,
    reportingCurrency: converted.currency,
    reportingValue: converted.amount,
    reportingValueStatus: converted.status,
    reportingFxRate: converted.rate,
    reportingFxAsOf: converted.asOf,
    reportingFxSource: converted.source,
  }
}

function applyFormulaHoldingReporting(
  holding: MoneyHolding,
  settings?: MoneySettings,
  fxRates?: MoneyFxRate[],
): MoneyHolding {
  const converted = convertFormulaReportingValue(
    holding.marketValue,
    holding.currencyCode,
    holding.asOf,
    settings,
    fxRates,
  )
  if (!converted) return holding
  return {
    ...holding,
    marketValue: converted.amount,
    reportingCurrency: converted.currency,
    reportingValue: converted.amount,
    reportingValueStatus: converted.status,
    reportingFxRate: converted.rate,
    reportingFxAsOf: converted.asOf,
    reportingFxSource: converted.source,
  }
}

function applyFormulaBalanceSnapshotReporting(
  snapshot: MoneyBalanceSnapshot,
  settings?: MoneySettings,
  fxRates?: MoneyFxRate[],
): MoneyBalanceSnapshot {
  const converted = convertFormulaReportingValue(
    snapshot.value,
    snapshot.currencyCode,
    snapshot.date,
    settings,
    fxRates,
  )
  if (!converted) return snapshot
  return {
    ...snapshot,
    value: converted.amount,
    reportingCurrency: converted.currency,
    reportingValue: converted.amount,
    reportingValueStatus: converted.status,
    reportingFxRate: converted.rate,
    reportingFxAsOf: converted.asOf,
    reportingFxSource: converted.source,
  }
}

function formulaReportingFxSource(
  value: MoneyExtensionPrimitive | undefined,
): MoneyTransaction['reportingFxSource'] {
  return value === 'user' ||
    value === 'agent' ||
    value === 'provider' ||
    value === 'market' ||
    value === 'same-currency'
    ? value
    : 'provider'
}

function convertFormulaReportingValue(
  amount: number,
  fromCurrency: string | undefined,
  asOf: string | undefined,
  settings?: MoneySettings,
  fxRates?: MoneyFxRate[],
) {
  const reportingCurrency = settings?.currency.reportingCurrency
  if (!reportingCurrency) return undefined
  return convertMoney(
    amount,
    fromCurrency,
    reportingCurrency,
    asOf,
    fxRates ?? [],
  )
}

function applyFormulaMoneyFlowSemantics(
  row: MoneyTransaction,
  settings?: MoneySettings,
  fxRates?: MoneyFxRate[],
): MoneyTransaction {
  const rawValues = row.extensions?.moneyFlow
  const values = rawValues
    ? mergeMoneyFlowReportingValues(row, rawValues, settings, fxRates)
    : undefined
  if (!values || values.status === 'dismissed') return row
  const role = typeof values.role === 'string' ? values.role : undefined
  if (!role || role === 'ignored') return row

  if (role === 'fee' || role === 'external_spend') {
    const amount = Math.abs(
      moneyFlowNumber(values.reportingValue) ??
        moneyFlowNumber(values.feeAmount) ??
        row.valueForSum ??
        row.amount,
    )
    const { transferReason: _transferReason, ...rest } = row
    return {
      ...rest,
      extensions: {
        ...(row.extensions ?? {}),
        moneyFlow: values,
      },
      direction: 'expense',
      isIncome: false,
      isExpense: true,
      valueForSum: amount,
    } satisfies MoneyTransaction
  }

  return {
    ...row,
    extensions: {
      ...(row.extensions ?? {}),
      moneyFlow: values,
    },
    direction: 'transfer',
    isIncome: false,
    isExpense: false,
    valueForSum: Math.abs(
      moneyFlowNumber(values.reportingValue) ??
        moneyFlowNumber(values.sourceAmount) ??
        row.valueForSum ??
        row.amount,
    ),
    transferReason: row.transferReason ?? 'money_flow_transfer',
  } satisfies MoneyTransaction
}

function applyFormulaLinkedAccountTransferSemantics(
  row: MoneyTransaction,
  accounts: MoneyAccount[],
): MoneyTransaction {
  const transferReason = formulaLinkedAccountTransferReason(row, accounts)
  if (!transferReason) return row
  return {
    ...row,
    direction: 'transfer',
    isIncome: false,
    isExpense: false,
    valueForSum: Math.abs(row.valueForSum ?? row.amount),
    transferReason: row.transferReason ?? transferReason,
  }
}

function formulaLinkedAccountTransferReason(
  transaction: MoneyTransaction,
  accounts: MoneyAccount[],
): string | undefined {
  if (transaction.direction !== 'expense') return undefined
  const providerCategories = [
    transaction.providerCategoryPrimary,
    transaction.providerCategoryDetailed,
    ...transaction.category,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toUpperCase())

  if (
    providerCategories.some((category) =>
      category.includes('CREDIT_CARD_PAYMENT'),
    )
  ) {
    return 'credit_card_payment'
  }
  if (
    providerCategories.some((category) => category.includes('TRANSFER_OUT'))
  ) {
    return 'provider_transfer_out'
  }

  const text = normalizeFormulaAccountReferenceText(
    [transaction.name, transaction.merchantName].filter(Boolean).join(' '),
  )
  if (!text) return undefined

  const target = accounts.find((account) => {
    if (!isFormulaTransferTargetAccount(account)) return false
    const mask = account.mask?.replace(/\D/g, '')
    if (mask && mask.length >= 4 && text.includes(mask)) return true
    return (
      formulaLinkedAccountNameMatches(text, account.name) ||
      formulaLinkedAccountNameMatches(text, account.officialName)
    )
  })
  if (!target) return undefined
  if (target.type === 'credit') return 'credit_card_payment'
  if (target.type === 'loan' || target.type === 'mortgage')
    return 'debt_payment'
  if (isInvestmentAccount(target)) return 'investment_transfer'
  return 'linked_account_transfer'
}

function isFormulaTransferTargetAccount(account: MoneyAccount): boolean {
  if (['credit', 'loan', 'mortgage', 'investment'].includes(account.type)) {
    return true
  }
  const subtype = account.subtype?.toLowerCase()
  return Boolean(
    subtype &&
      ['credit', 'loan', 'mortgage', 'ira', '401k', 'rrsp', 'tfsa', 'hsa'].some(
        (entry) => subtype.includes(entry),
      ),
  )
}

function formulaLinkedAccountNameMatches(
  text: string,
  name: string | undefined,
): boolean {
  const normalizedName = normalizeFormulaAccountReferenceText(name ?? '')
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

function normalizeFormulaAccountReferenceText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function moneyFlowNumber(
  value: MoneyExtensionPrimitive | undefined,
): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function buildFormulaMerchantFacts(
  transactions: MoneyTransaction[],
): MoneyMerchant[] {
  const byId = new Map<string, MoneyMerchant>()
  const updatedAt = new Date(0).toISOString()

  for (const transaction of transactions) {
    const id = transactionMerchantId(transaction)
    if (!id) continue
    const existing = byId.get(id) ?? {
      id,
      source: 'derived' as const,
      name: transactionMerchantName(transaction),
      transactionCount: 0,
      income: 0,
      expenses: 0,
      netAmount: 0,
      updatedAt,
    }
    existing.transactionCount += 1
    if (transaction.direction === 'income') {
      existing.income += transaction.valueForSum ?? transaction.amount
    } else if (transaction.direction === 'expense') {
      existing.expenses += transaction.valueForSum ?? transaction.amount
    }
    existing.netAmount = existing.income - existing.expenses
    existing.lastTransactionDate = laterStringDate(
      existing.lastTransactionDate,
      transaction.date,
    )
    byId.set(id, existing)
  }

  return [...byId.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  )
}

function mergeFormulaMerchants(
  derived: MoneyMerchant[],
  stored: MoneyMerchant[],
): MoneyMerchant[] {
  const byId = new Map<string, MoneyMerchant>()
  for (const merchant of derived) byId.set(merchant.id, merchant)
  for (const merchant of stored) {
    const existing = byId.get(merchant.id)
    byId.set(merchant.id, {
      ...existing,
      ...merchant,
      transactionCount:
        merchant.transactionCount || existing?.transactionCount || 0,
      income: merchant.income || existing?.income || 0,
      expenses: merchant.expenses || existing?.expenses || 0,
      netAmount:
        merchant.netAmount ||
        existing?.netAmount ||
        (merchant.income || 0) - (merchant.expenses || 0),
      lastTransactionDate:
        merchant.lastTransactionDate ?? existing?.lastTransactionDate,
      updatedAt:
        merchant.updatedAt ?? existing?.updatedAt ?? new Date(0).toISOString(),
    })
  }
  return [...byId.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  )
}

function laterStringDate(
  a: string | undefined,
  b: string | undefined,
): string | undefined {
  if (!a) return b
  if (!b) return a
  return a > b ? a : b
}

export function evaluateCards(
  data: MoneyFormulaData,
  cards = DEFAULT_CARD_DEFINITIONS,
): EvaluatedMoneyCard[] {
  const collections = buildCollections(data)
  const context = createEvaluationContext(collections, data)
  return cards.map((card) => {
    const ast = parseFormula(card.formula, collections)
    const value = evaluateFormulaAstValue(ast, context)
    const primaryOutputType =
      card.outputType ??
      inferFormulaOutputType(value, card.format, card.formula, ast.expression)
    const primaryCollections = [...referencedCollections(ast)]
    const secondaryResults = Object.fromEntries(
      Object.entries(card.secondaryFormulas ?? {}).map(([key, formula]) => {
        const ast = parseFormula(formula, collections)
        const secondaryValue = evaluateFormulaAstValue(ast, context)
        const outputType = inferFormulaOutputType(
          secondaryValue,
          card.format,
          formula,
          ast.expression,
        )
        return [
          key,
          {
            formula,
            value: secondaryValue,
            displayValue: formatValue(
              secondaryValue,
              outputTypeFormat(outputType, card.format),
              data.settings?.currency.reportingCurrency,
            ),
            outputType,
            referencedCollections: [...referencedCollections(ast)],
          },
        ]
      }),
    )
    const secondaryReferencedCollections = Object.fromEntries(
      Object.entries(secondaryResults).map(([key, result]) => [
        key,
        result.referencedCollections,
      ]),
    )
    return {
      ...card,
      outputType: primaryOutputType,
      value,
      displayValue: formatCardDisplayValue(
        card,
        value,
        data.settings?.currency.reportingCurrency,
      ),
      referencedCollections: primaryCollections,
      secondaryResults:
        Object.keys(secondaryResults).length > 0 ? secondaryResults : undefined,
      secondaryReferencedCollections:
        Object.keys(secondaryReferencedCollections).length > 0
          ? secondaryReferencedCollections
          : undefined,
    }
  })
}

function evaluateFormulaAstValue(
  ast: MoneyFormulaAst,
  context: EvaluationContext,
): FormulaResultValue {
  return serializeFormulaValue(evaluateExpression(ast.expression, context))
}

function inferFormulaOutputType(
  value: FormulaResultValue,
  format: MoneyCardDefinition['format'],
  formula?: string,
  expression?: MoneyExpression,
): FormulaOutputType {
  if (typeof value === 'object' && value !== null && 'type' in value) {
    if (value.type === 'date') return 'date'
    if (value.type === 'duration') return 'duration'
    if (value.type === 'forecast') return 'forecast'
    if (value.type === 'series') return 'series'
    if (value.type === 'table') return 'table'
    if (value.type === 'entity-list') return 'entity-list'
  }

  const normalized = formula?.toLowerCase() ?? ''
  if (/\.(count)\s*\(/.test(normalized)) return 'count'
  if (
    normalized.includes('savingsrate(') ||
    normalized.includes('changevs(') ||
    normalized.includes('percentoftotal(') ||
    normalized.includes('utilization')
  ) {
    return 'percent'
  }
  const expressionType = expression
    ? inferScalarExpressionOutputType(expression, format)
    : undefined
  if (expressionType) return expressionType
  if (
    /\b(accounts|assets|liabilities|cash|income|expenses|cashflow|transfers|moneyflows|debt|investments|subscriptions|recurringobligations|taxcontributions|sharedexpenses|cardaccounts)\s*\./.test(
      normalized,
    )
  ) {
    return 'money'
  }
  if (format === 'currency') return 'money'
  if (format === 'percent') return 'percent'
  if (format === 'duration') return 'duration'
  if (format === 'date') return 'date'
  return 'number'
}

const MONEY_SCALAR_COLLECTIONS = new Set([
  'accounts',
  'assets',
  'liabilities',
  'cash',
  'income',
  'expenses',
  'cashflow',
  'transfers',
  'moneyflows',
  'debt',
  'investments',
  'subscriptions',
  'recurringobligations',
  'taxcontributions',
  'sharedexpenses',
  'cardaccounts',
])

const NON_MONEY_AGGREGATE_METHODS = new Set([
  'count',
  'groupby',
  'percentoftotal',
  'trend',
  'top',
  'bottom',
  'minby',
  'maxby',
])

function inferScalarExpressionOutputType(
  expression: MoneyExpression,
  format: MoneyCardDefinition['format'],
): FormulaOutputType | undefined {
  if (isFunctionCall(expression)) {
    if (
      ['SavingsRate', 'ChangeVs', 'CreditUtilization'].includes(expression.name)
    ) {
      return 'percent'
    }
    if (['InterestDrag', 'ContributionRoom'].includes(expression.name)) {
      return 'money'
    }
    if (expression.name === 'FreedomAge') return 'number'
  }

  if (isBinaryExpression(expression)) {
    if (
      ['=', '!=', '<', '<=', '>', '>=', 'and', 'or'].includes(
        expression.operator,
      )
    ) {
      return 'number'
    }
    const leftMoney = expressionYieldsMoneyScalar(expression.left)
    const rightMoney = expressionYieldsMoneyScalar(expression.right)
    if (expression.operator === '/' || expression.operator === '%') {
      if (format === 'percent') return 'percent'
      return leftMoney && !rightMoney ? 'money' : 'number'
    }
    if (
      expression.operator === '*' ||
      expression.operator === '+' ||
      expression.operator === '-'
    ) {
      return leftMoney || rightMoney ? 'money' : 'number'
    }
  }

  if (isUnaryExpression(expression)) {
    if (expression.operator === 'not') return 'number'
    return expressionYieldsMoneyScalar(expression.value) ? 'money' : 'number'
  }

  return undefined
}

function expressionYieldsMoneyScalar(expression: MoneyExpression): boolean {
  if (isAggregateCall(expression)) {
    const hasNonMoneyMethod = expression.methods.some((method) =>
      NON_MONEY_AGGREGATE_METHODS.has(method.name.toLowerCase()),
    )
    return (
      MONEY_SCALAR_COLLECTIONS.has(expression.collection.toLowerCase()) &&
      !hasNonMoneyMethod
    )
  }

  if (isFunctionCall(expression)) {
    return ['InterestDrag', 'ContributionRoom'].includes(expression.name)
  }

  if (isUnaryExpression(expression))
    return expressionYieldsMoneyScalar(expression.value)

  if (isBinaryExpression(expression)) {
    const leftMoney = expressionYieldsMoneyScalar(expression.left)
    const rightMoney = expressionYieldsMoneyScalar(expression.right)
    if (expression.operator === '/' || expression.operator === '%') {
      return leftMoney && !rightMoney
    }
    if (['+', '-', '*'].includes(expression.operator))
      return leftMoney || rightMoney
  }

  return false
}

function outputTypeFormat(
  outputType: FormulaOutputType,
  fallback: MoneyCardDefinition['format'],
): MoneyCardDefinition['format'] {
  if (outputType === 'money') return 'currency'
  if (outputType === 'percent') return 'percent'
  if (outputType === 'duration') return 'duration'
  if (outputType === 'date') return 'date'
  if (outputType === 'count' || outputType === 'number') return 'number'
  return fallback
}

export function evaluateFormula(
  formula: string,
  collections: CollectionMetric[],
  data?: MoneyFormulaData,
): number {
  return toNumber(evaluateFormulaValue(formula, collections, data))
}

export function evaluateFormulaValue(
  formula: string,
  collections: CollectionMetric[],
  data?: MoneyFormulaData,
): FormulaResultValue {
  const ast = parseFormula(formula, collections)
  const value = evaluateExpression(
    ast.expression,
    createEvaluationContext(collections, data),
  )
  return serializeFormulaValue(value)
}

export function evaluateFormulaTransactionRows(
  formula: string,
  collections: CollectionMetric[],
  data?: MoneyFormulaData,
): MoneyFormulaTransactionRows {
  const ast = parseFormula(formula, collections)
  const referenced = [...referencedCollections(ast)]

  if (!isAggregateCall(ast.expression)) {
    return {
      referencedCollections: referenced,
      transactions: [],
      formulaFiltered: false,
      unsupportedReason:
        'Only single collection method chains can produce formula-filtered rows.',
    }
  }

  const context = createEvaluationContext(collections, data)
  let collection = context.collections.get(ast.expression.collection)
  if (!collection) {
    throw new Error(`Unknown collection: ${ast.expression.collection}`)
  }

  let value: FormulaValue = collection
  let lastTransactionCollection = transactionCollectionSnapshot(collection)

  for (const method of ast.expression.methods) {
    if (isRuntimeCollection(value)) {
      value = evaluateCollectionMethod(value, method, context)
      if (isRuntimeCollection(value)) {
        collection = value
        lastTransactionCollection =
          transactionCollectionSnapshot(value) ?? lastTransactionCollection
      }
      continue
    }

    if (isFormulaTableValue(value)) {
      value = evaluateTableMethod(value, method)
      continue
    }

    if (isFormulaSeriesValue(value)) {
      value = evaluateSeriesMethod(value, method, context)
      continue
    }

    throw new Error(`Cannot call ${method.name} after a scalar result`)
  }

  if (!lastTransactionCollection) {
    return {
      collection: collection.id,
      referencedCollections: referenced,
      transactions: [],
      formulaFiltered: false,
      unsupportedReason: 'Formula does not resolve to transaction-backed rows.',
    }
  }

  return {
    collection: lastTransactionCollection.collection,
    referencedCollections: referenced,
    transactions: lastTransactionCollection.transactions,
    formulaFiltered: true,
  }
}

export function parseFormula(
  formula: string,
  collections: CollectionMetric[] = [],
): MoneyFormulaAst {
  const { ast, diagnostics } = parseFormulaWithDiagnostics(formula, collections)
  if (diagnostics.length > 0) {
    throw new Error(
      `Invalid formula: ${diagnostics.map((diagnostic) => diagnostic.message).join('; ')}`,
    )
  }

  return ast
}

export function diagnoseFormula(
  formula: string,
  collections: CollectionMetric[] = [],
  options: FormulaValidationOptions = {},
): FormulaDiagnostic[] {
  return parseFormulaWithDiagnostics(formula, collections, options).diagnostics
}

function parseFormulaWithDiagnostics(
  formula: string,
  collections: CollectionMetric[],
  options: FormulaValidationOptions = {},
): { ast: MoneyFormulaAst; diagnostics: FormulaDiagnostic[] } {
  const result = moneyFormulaServices.parser.LangiumParser.parse(formula)
  const parseDiagnostics: FormulaDiagnostic[] = [
    ...result.lexerErrors.map((error) => ({
      message: error.message,
      range: rangeFromParseIssue(error, formula),
    })),
    ...result.parserErrors.map((error) => ({
      message: error.message,
      range: rangeFromParseIssue(error, formula),
    })),
  ]
  const ast = result.value as MoneyFormulaAst

  if (parseDiagnostics.length > 0) {
    return { ast, diagnostics: parseDiagnostics }
  }

  const referenceDiagnostics = formulaValidationDiagnostics(
    ast,
    collections,
    formula,
    options,
  )
  return { ast, diagnostics: referenceDiagnostics }
}

function formulaValidationDiagnostics(
  ast: MoneyFormulaAst,
  collections: CollectionMetric[],
  formula: string,
  options: FormulaValidationOptions,
): FormulaDiagnostic[] {
  const knownCollections = new Set<string>(
    collections.map((collection) => collection.id),
  )
  const diagnostics: FormulaDiagnostic[] = []

  visitExpression(ast.expression, (expression) => {
    if (isAggregateCall(expression)) {
      if (
        collections.length > 0 &&
        !knownCollections.has(expression.collection)
      ) {
        diagnostics.push({
          message: `Unknown collection: ${expression.collection}`,
          range: rangeForAggregateCollection(expression, formula),
        })
      }
      for (const method of expression.methods) {
        if (!SUPPORTED_COLLECTION_METHODS.has(method.name)) {
          diagnostics.push({
            message: `Unsupported collection method: ${method.name}`,
            range: fullFormulaRange(formula),
          })
        }
      }
    }

    if (
      isFunctionCall(expression) &&
      !SUPPORTED_FUNCTIONS.has(expression.name)
    ) {
      diagnostics.push({
        message: `Unsupported function: ${expression.name}`,
        range: fullFormulaRange(formula),
      })
    }
  })

  diagnostics.push(...formulaMethodChainDiagnostics(ast, formula))
  diagnostics.push(
    ...formulaFunctionArgumentDiagnostics(ast, formula, knownCollections),
  )
  diagnostics.push(
    ...formulaFieldValidationDiagnostics(ast, collections, formula, options),
  )

  return diagnostics
}

type FormulaStaticKind =
  | 'collection'
  | 'scalar'
  | 'table'
  | 'series'
  | 'forecast'
  | 'date'
  | 'duration'
  | 'entity-list'
  | 'unknown'

type FormulaFunctionArgKind =
  | FormulaStaticKind
  | 'number-or-series'
  | 'collection-or-number'
  | 'any'

function formulaMethodChainDiagnostics(
  ast: MoneyFormulaAst,
  formula: string,
): FormulaDiagnostic[] {
  const diagnostics: FormulaDiagnostic[] = []

  visitExpression(ast.expression, (expression) => {
    if (!isAggregateCall(expression)) return
    let currentKind: FormulaStaticKind = 'collection'

    for (const method of expression.methods) {
      if (currentKind === 'scalar') {
        diagnostics.push({
          message: `Cannot call ${method.name} after a scalar result`,
          range: rangeForMethod(method, formula),
        })
        continue
      }
      if (currentKind === 'table') {
        if (method.name !== 'PercentOfTotal') {
          diagnostics.push({
            message: `Cannot call ${method.name} after a table result`,
            range: rangeForMethod(method, formula),
          })
          continue
        }
        currentKind = 'table'
        continue
      }
      if (currentKind === 'series') {
        if (method.name !== 'MovingAverage' && method.name !== 'Cumulative') {
          diagnostics.push({
            message: `Cannot call ${method.name} after a series result`,
            range: rangeForMethod(method, formula),
          })
          continue
        }
        currentKind = 'series'
        continue
      }

      currentKind = collectionMethodResultKind(method.name)
    }
  })

  return diagnostics
}

function formulaFunctionArgumentDiagnostics(
  ast: MoneyFormulaAst,
  formula: string,
  knownCollections: Set<string>,
): FormulaDiagnostic[] {
  const diagnostics: FormulaDiagnostic[] = []

  visitExpression(ast.expression, (expression) => {
    if (
      !isFunctionCall(expression) ||
      !SUPPORTED_FUNCTIONS.has(expression.name)
    )
      return
    const spec = FUNCTION_ARGUMENT_SPECS[expression.name]
    if (!spec) return

    if (
      expression.args.length < spec.minArgs ||
      expression.args.length > spec.maxArgs
    ) {
      diagnostics.push({
        message:
          spec.minArgs === spec.maxArgs
            ? `${expression.name} expects ${spec.minArgs} argument${spec.minArgs === 1 ? '' : 's'}, but received ${expression.args.length}.`
            : `${expression.name} expects ${spec.minArgs}-${spec.maxArgs} arguments, but received ${expression.args.length}.`,
        range: rangeForExpression(expression, formula),
      })
      return
    }

    expression.args.forEach((arg, index) => {
      const expected = spec.args[index]
      if (!expected) return
      const actual = expressionStaticKind(arg, knownCollections)
      if (functionArgKindMatches(actual, expected.kind)) return
      diagnostics.push({
        message: `${expression.name} argument ${index + 1} expects ${expected.label}, but received ${formulaStaticKindLabel(actual)}.`,
        range: rangeForExpression(arg, formula),
      })
    })
  })

  return diagnostics
}

type FormulaFunctionArgSpec = {
  minArgs: number
  maxArgs: number
  args: Array<{
    kind: FormulaFunctionArgKind
    label: string
  }>
}

const FUNCTION_ARGUMENT_SPECS: Record<string, FormulaFunctionArgSpec> = {
  Runway: {
    minArgs: 2,
    maxArgs: 2,
    args: [
      { kind: 'scalar', label: 'a number' },
      { kind: 'scalar', label: 'a number' },
    ],
  },
  SavingsRate: {
    minArgs: 2,
    maxArgs: 2,
    args: [
      { kind: 'scalar', label: 'a number' },
      { kind: 'scalar', label: 'a number' },
    ],
  },
  ChangeVs: {
    minArgs: 2,
    maxArgs: 2,
    args: [
      { kind: 'scalar', label: 'a number' },
      { kind: 'scalar', label: 'a number' },
    ],
  },
  DebtPayoff: {
    minArgs: 1,
    maxArgs: 3,
    args: [
      { kind: 'collection-or-number', label: 'a collection or number' },
      { kind: 'scalar', label: 'a number' },
      { kind: 'scalar', label: 'a string' },
    ],
  },
  InterestDrag: {
    minArgs: 1,
    maxArgs: 2,
    args: [
      { kind: 'collection', label: 'a collection' },
      { kind: 'scalar', label: 'a string' },
    ],
  },
  AllocationDrift: {
    minArgs: 1,
    maxArgs: 2,
    args: [
      { kind: 'table', label: 'a table' },
      { kind: 'scalar', label: 'a string' },
    ],
  },
  TableChange: {
    minArgs: 2,
    maxArgs: 2,
    args: [
      { kind: 'table', label: 'a table' },
      { kind: 'table', label: 'a table' },
    ],
  },
  Aging: {
    minArgs: 1,
    maxArgs: 2,
    args: [
      { kind: 'collection', label: 'a collection' },
      { kind: 'scalar', label: 'a date field' },
    ],
  },
  CreditUtilization: {
    minArgs: 1,
    maxArgs: 1,
    args: [{ kind: 'collection', label: 'a collection' }],
  },
  FreedomAge: {
    minArgs: 3,
    maxArgs: 6,
    args: [
      { kind: 'scalar', label: 'assets' },
      { kind: 'scalar', label: 'monthly expenses' },
      { kind: 'scalar', label: 'monthly income' },
      { kind: 'scalar', label: 'current age' },
      { kind: 'scalar', label: 'withdrawal rate' },
      { kind: 'scalar', label: 'max age' },
    ],
  },
  Forecast: {
    minArgs: 1,
    maxArgs: 3,
    args: [
      { kind: 'number-or-series', label: 'a number or series' },
      { kind: 'scalar', label: 'a number' },
      { kind: 'scalar', label: 'a percent' },
    ],
  },
  ForecastScenario: {
    minArgs: 1,
    maxArgs: 3,
    args: [
      { kind: 'number-or-series', label: 'a number or series' },
      { kind: 'scalar', label: 'a string' },
      { kind: 'scalar', label: 'a number' },
    ],
  },
  ContributionRoom: {
    minArgs: 1,
    maxArgs: 4,
    args: [
      { kind: 'collection', label: 'a collection' },
      { kind: 'scalar', label: 'a string' },
      { kind: 'scalar', label: 'a number' },
      { kind: 'scalar', label: 'a string' },
    ],
  },
}

function formulaFieldValidationDiagnostics(
  ast: MoneyFormulaAst,
  collections: CollectionMetric[],
  formula: string,
  options: FormulaValidationOptions,
): FormulaDiagnostic[] {
  if (!options.collectionDefinitions || !options.entities) return []

  const collectionShapes = formulaCollectionShapes(options)
  const knownCollections = new Set(
    collections.map((collection) => collection.id),
  )
  const diagnostics: FormulaDiagnostic[] = []

  visitExpression(ast.expression, (expression) => {
    if (
      !isAggregateCall(expression) ||
      !knownCollections.has(expression.collection)
    )
      return
    const currentShape = collectionShapes.get(expression.collection)
    let collectionResult = true

    for (const method of expression.methods) {
      if (!collectionResult || !currentShape) continue

      if (method.name === 'Where') {
        const predicate = method.args[0]
        if (predicate) {
          validateFieldReferences(
            predicate,
            currentShape.fields,
            formula,
            diagnostics,
            currentShape.id,
          )
        }
      } else {
        const fieldArgIndex = fieldArgumentIndex(method)
        const fieldArg =
          fieldArgIndex === null ? undefined : method.args[fieldArgIndex]
        if (
          fieldArgIndex !== null &&
          fieldArg &&
          isFieldReference(fieldArg) &&
          shouldValidateMethodField(method, fieldArgIndex, fieldArg)
        ) {
          validateFieldReference(
            fieldArg,
            currentShape.fields,
            formula,
            diagnostics,
            currentShape.id,
          )
        }
      }

      const result = collectionMethodResultKind(method.name)
      if (result !== 'collection') collectionResult = false
    }
  })

  return diagnostics
}

type FormulaCollectionShape = {
  id: string
  entity: string
  extensionNamespace?: string
  fields: Set<string>
}

function formulaCollectionShapes(
  options: FormulaValidationOptions,
): Map<string, FormulaCollectionShape> {
  const entityFields = new Map<string, Set<string>>()
  for (const entity of options.entities ?? []) {
    entityFields.set(
      entity.id,
      new Set(entity.fields.map((field) => field.name)),
    )
  }
  addRuntimeAliasFields(entityFields)

  const extensionFields = extensionFieldMaps(options.extensionRegistry)
  for (const [entity, fields] of extensionFields.prefixedByEntity) {
    const target = entityFields.get(entity) ?? new Set<string>()
    for (const field of fields) target.add(field)
    entityFields.set(entity, target)
  }

  const shapes = new Map<string, FormulaCollectionShape>()
  for (const definition of options.collectionDefinitions ?? []) {
    shapes.set(definition.id, {
      id: definition.id,
      entity: definition.entity,
      fields: new Set(entityFields.get(definition.entity) ?? []),
    })
  }

  for (const collection of DEFAULT_EXTENSION_COLLECTIONS) {
    shapes.set(
      collection.id,
      extensionCollectionShape(
        collection.id,
        'transaction',
        collection.namespace,
        entityFields,
        extensionFields,
      ),
    )
  }

  for (const extension of options.extensionRegistry?.extensions ?? []) {
    if (!isFormulaBackedExtensionEntity(extension.entity)) continue
    for (const collection of extension.derivedCollections ?? []) {
      if (!isFormulaBackedExtensionEntity(collection.entity)) continue
      if (shapes.has(collection.id)) continue
      shapes.set(
        collection.id,
        extensionCollectionShape(
          collection.id,
          collection.entity,
          extension.namespace,
          entityFields,
          extensionFields,
        ),
      )
    }
  }

  return shapes
}

function extensionCollectionShape(
  id: string,
  entity: string,
  extensionNamespace: string,
  entityFields: Map<string, Set<string>>,
  extensionFields: {
    plainByEntityNamespace: Map<string, Set<string>>
  },
): FormulaCollectionShape {
  const fields = new Set(entityFields.get(entity) ?? [])
  const namespaceFields = extensionFields.plainByEntityNamespace.get(
    `${entity}:${extensionNamespace}`,
  )
  for (const field of namespaceFields ?? []) fields.add(field)
  return { id, entity, extensionNamespace, fields }
}

function extensionFieldMaps(registry?: MoneyExtensionRegistry): {
  prefixedByEntity: Map<string, Set<string>>
  plainByEntityNamespace: Map<string, Set<string>>
} {
  const prefixedByEntity = new Map<string, Set<string>>()
  const plainByEntityNamespace = new Map<string, Set<string>>()

  for (const extension of registry?.extensions ?? []) {
    const prefixed = prefixedByEntity.get(extension.entity) ?? new Set<string>()
    const plainKey = `${extension.entity}:${extension.namespace}`
    const plain = plainByEntityNamespace.get(plainKey) ?? new Set<string>()
    for (const field of extension.fields) {
      prefixed.add(`${extension.namespace}_${field.name}`)
      plain.add(field.name)
    }
    prefixedByEntity.set(extension.entity, prefixed)
    plainByEntityNamespace.set(plainKey, plain)
  }

  return { prefixedByEntity, plainByEntityNamespace }
}

function addRuntimeAliasFields(entityFields: Map<string, Set<string>>) {
  const reportingFields = [
    'reportingCurrency',
    'reportingValue',
    'reportingValueStatus',
    'reportingFxRate',
    'reportingFxAsOf',
    'reportingFxSource',
  ]
  const transactionFields = entityFields.get('transaction') ?? new Set<string>()
  for (const field of [
    'merchant',
    'merchantId',
    'merchantName',
    'subscription',
    'subscriptionKey',
    'recurringObligation',
    'cadence',
    'intervalDays',
    'lastDate',
    'nextDueDate',
    'moneyFlowId',
    'moneyFlowRole',
    'need',
    'joy',
    'sharedStatus',
    'taxContribution',
    'taxContributionSource',
    'reviewActionStatus',
    'reviewActionType',
    'recommendationSeverity',
    'estimatedImpact',
    'scenarioId',
    ...reportingFields,
  ]) {
    transactionFields.add(field)
  }
  entityFields.set('transaction', transactionFields)

  const recurringFields = entityFields.get('recurring') ?? new Set<string>()
  for (const field of transactionFields) recurringFields.add(field)
  entityFields.set('recurring', recurringFields)

  for (const entity of ['account', 'debt', 'holding', 'balanceSnapshot']) {
    const fields = entityFields.get(entity) ?? new Set<string>()
    for (const field of reportingFields) fields.add(field)
    entityFields.set(entity, fields)
  }
}

function validateFieldReferences(
  expression: MoneyExpression,
  fields: Set<string>,
  formula: string,
  diagnostics: FormulaDiagnostic[],
  collectionId: string,
) {
  visitExpression(expression, (node) => {
    if (isFieldReference(node)) {
      validateFieldReference(node, fields, formula, diagnostics, collectionId)
    }
  })
}

function validateFieldReference(
  expression: MoneyFieldReference,
  fields: Set<string>,
  formula: string,
  diagnostics: FormulaDiagnostic[],
  collectionId: string,
) {
  if (fields.has(expression.name)) return
  diagnostics.push({
    message: `Unknown field "${expression.name}" for collection ${collectionId}`,
    range: rangeForExpression(expression, formula),
  })
}

function fieldArgumentIndex(method: MoneyMethodCall): number | null {
  if (method.name === 'Unique') return 0
  if (method.name === 'Sort') return 0
  if (method.name === 'Top' || method.name === 'Bottom') return 1
  if (method.name === 'MinBy' || method.name === 'MaxBy') return 0
  if (method.name === 'GroupBy') return 0
  return null
}

function shouldValidateMethodField(
  method: MoneyMethodCall,
  fieldArgIndex: number,
  fieldArg: MoneyFieldReference,
): boolean {
  if (
    method.name === 'Sort' &&
    fieldArgIndex === 0 &&
    ['asc', 'desc'].includes(fieldArg.name.toLowerCase())
  ) {
    return false
  }
  return true
}

function collectionMethodResultKind(
  methodName: string,
): 'collection' | 'scalar' | 'table' | 'series' {
  if (
    [
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
      'PercentOfTotal',
    ].includes(methodName)
  ) {
    return 'scalar'
  }
  if (methodName === 'GroupBy') return 'table'
  if (methodName === 'Trend') return 'series'
  return 'collection'
}

function expressionStaticKind(
  expression: MoneyExpression,
  knownCollections: Set<string> = new Set(),
): FormulaStaticKind {
  if (
    isNumberLiteral(expression) ||
    isStringLiteral(expression) ||
    isBooleanLiteral(expression)
  ) {
    return 'scalar'
  }
  if (isDateLiteral(expression)) return 'date'
  if (isDurationLiteral(expression)) return 'duration'
  if (isFieldReference(expression)) {
    return knownCollections.has(expression.name) ? 'collection' : 'scalar'
  }
  if (isUnaryExpression(expression) || isBinaryExpression(expression))
    return 'scalar'
  if (isAggregateCall(expression)) return aggregateStaticKind(expression)
  if (isFunctionCall(expression)) return functionStaticReturnKind(expression)
  return 'unknown'
}

function aggregateStaticKind(
  expression: MoneyAggregateCall,
): FormulaStaticKind {
  let currentKind: FormulaStaticKind = 'collection'

  for (const method of expression.methods) {
    if (currentKind === 'scalar') return 'unknown'
    if (currentKind === 'table') {
      if (method.name !== 'PercentOfTotal') return 'unknown'
      currentKind = 'table'
      continue
    }
    if (currentKind === 'series') {
      if (method.name !== 'MovingAverage' && method.name !== 'Cumulative') {
        return 'unknown'
      }
      currentKind = 'series'
      continue
    }
    if (currentKind !== 'collection') return 'unknown'
    currentKind = collectionMethodResultKind(method.name)
  }

  return currentKind
}

function functionStaticReturnKind(
  expression: MoneyFunctionCall,
): FormulaStaticKind {
  if (
    expression.name === 'Forecast' ||
    expression.name === 'ForecastScenario'
  ) {
    return 'forecast'
  }
  if (
    expression.name === 'AllocationDrift' ||
    expression.name === 'TableChange' ||
    expression.name === 'Aging' ||
    expression.name === 'CreditUtilization' ||
    expression.name === 'ContributionRoom'
  ) {
    return 'table'
  }
  if (expression.name === 'DebtPayoff') {
    return expression.args[0] &&
      expressionStaticKind(expression.args[0]) === 'collection'
      ? 'table'
      : 'scalar'
  }
  if (
    expression.name === 'Runway' ||
    expression.name === 'SavingsRate' ||
    expression.name === 'ChangeVs' ||
    expression.name === 'InterestDrag' ||
    expression.name === 'FreedomAge'
  ) {
    return 'scalar'
  }
  return 'unknown'
}

function functionArgKindMatches(
  actual: FormulaStaticKind,
  expected: FormulaFunctionArgKind,
): boolean {
  if (expected === 'any' || actual === 'unknown') return true
  if (expected === actual) return true
  if (expected === 'number-or-series')
    return actual === 'scalar' || actual === 'series'
  if (expected === 'collection-or-number') {
    return actual === 'collection' || actual === 'scalar'
  }
  return false
}

function formulaStaticKindLabel(kind: FormulaStaticKind): string {
  if (kind === 'scalar') return 'a scalar'
  if (kind === 'collection') return 'a collection'
  if (kind === 'table') return 'a table'
  if (kind === 'series') return 'a series'
  if (kind === 'forecast') return 'a forecast'
  if (kind === 'date') return 'a date'
  if (kind === 'duration') return 'a duration'
  if (kind === 'entity-list') return 'an entity list'
  return 'an unknown value'
}

function rangeFromParseIssue(
  issue: unknown,
  formula: string,
): FormulaSourceRange | null {
  const record = issue as {
    offset?: number
    length?: number
    token?: {
      startOffset?: number
      endOffset?: number
      image?: string
    }
  }

  if (record.token && typeof record.token.startOffset === 'number') {
    const start = record.token.startOffset
    const end =
      typeof record.token.endOffset === 'number'
        ? record.token.endOffset + 1
        : start + (record.token.image?.length ?? 1)
    return rangeFromOffsets(formula, start, end)
  }

  if (typeof record.offset === 'number') {
    return rangeFromOffsets(
      formula,
      record.offset,
      record.offset + Math.max(record.length ?? 1, 1),
    )
  }

  return fullFormulaRange(formula)
}

function rangeForAggregateCollection(
  expression: MoneyAggregateCall,
  formula: string,
): FormulaSourceRange | null {
  const cstRange = (expression as Partial<AstNode>).$cstNode?.range
  if (cstRange) {
    const startOffset = offsetFromLineCharacter(
      formula,
      cstRange.start.line,
      cstRange.start.character,
    )
    return rangeFromOffsets(
      formula,
      startOffset,
      startOffset + expression.collection.length,
    )
  }

  const offset = formula.indexOf(expression.collection)
  return offset === -1
    ? null
    : rangeFromOffsets(formula, offset, offset + expression.collection.length)
}

function rangeForExpression(
  expression: MoneyExpression,
  formula: string,
): FormulaSourceRange | null {
  const cstRange = (expression as Partial<AstNode>).$cstNode?.range
  if (!cstRange) return null
  const startOffset = offsetFromLineCharacter(
    formula,
    cstRange.start.line,
    cstRange.start.character,
  )
  const endOffset = offsetFromLineCharacter(
    formula,
    cstRange.end.line,
    cstRange.end.character,
  )
  return rangeFromOffsets(formula, startOffset, endOffset)
}

function rangeForMethod(
  method: MoneyMethodCall,
  formula: string,
): FormulaSourceRange | null {
  const cstRange = (method as Partial<AstNode>).$cstNode?.range
  if (cstRange) {
    const startOffset = offsetFromLineCharacter(
      formula,
      cstRange.start.line,
      cstRange.start.character,
    )
    const endOffset = offsetFromLineCharacter(
      formula,
      cstRange.end.line,
      cstRange.end.character,
    )
    return rangeFromOffsets(formula, startOffset, endOffset)
  }

  const methodPattern = `.${method.name}`
  const offset = formula.indexOf(methodPattern)
  return offset === -1
    ? fullFormulaRange(formula)
    : rangeFromOffsets(formula, offset, offset + methodPattern.length)
}

function fullFormulaRange(formula: string): FormulaSourceRange {
  return rangeFromOffsets(formula, 0, formula.length)
}

function rangeFromOffsets(
  formula: string,
  rawStart: number,
  rawEnd: number,
): FormulaSourceRange {
  const start = clampOffset(rawStart, formula.length)
  const end = clampOffset(Math.max(rawEnd, start), formula.length)
  return {
    start: positionFromOffset(formula, start),
    end: positionFromOffset(formula, end),
  }
}

function positionFromOffset(
  formula: string,
  offset: number,
): FormulaSourcePosition {
  const clamped = clampOffset(offset, formula.length)
  let line = 0
  let lineStart = 0
  for (let index = 0; index < clamped; index += 1) {
    if (formula[index] === '\n') {
      line += 1
      lineStart = index + 1
    }
  }
  return { line, character: clamped - lineStart, offset: clamped }
}

function offsetFromLineCharacter(
  formula: string,
  targetLine: number,
  targetCharacter: number,
): number {
  let line = 0
  let lineStart = 0
  for (let index = 0; index < formula.length; index += 1) {
    if (line === targetLine)
      return clampOffset(lineStart + targetCharacter, formula.length)
    if (formula[index] === '\n') {
      line += 1
      lineStart = index + 1
    }
  }
  return clampOffset(lineStart + targetCharacter, formula.length)
}

function clampOffset(offset: number, length: number): number {
  return Math.min(Math.max(Math.floor(offset), 0), length)
}

export function referencedCollections(ast: MoneyFormulaAst): Set<string> {
  const collections = new Set<string>()
  visitExpression(ast.expression, (expression) => {
    if (isAggregateCall(expression)) {
      collections.add(expression.collection)
    }
  })
  return collections
}

export function referencedExtensionRequirements(
  formula: string,
  collections: CollectionMetric[],
  options: FormulaValidationOptions = {},
): string[] {
  const { ast, diagnostics } = parseFormulaWithDiagnostics(
    formula,
    collections,
    options,
  )
  if (
    diagnostics.some((diagnostic) => diagnostic.message.includes('Expecting'))
  ) {
    return []
  }

  const requirements = new Set<string>()
  const collectionShapes = formulaCollectionShapes(options)
  const knownCollections = new Set(
    collections.map((collection) => collection.id),
  )

  visitExpression(ast.expression, (expression) => {
    if (
      !isAggregateCall(expression) ||
      !knownCollections.has(expression.collection)
    )
      return

    for (const requirement of extensionRequirementsForCollection(
      expression.collection,
      options.extensionRegistry,
    )) {
      requirements.add(requirement)
    }

    const currentShape = collectionShapes.get(expression.collection)
    let collectionResult = true

    for (const method of expression.methods) {
      if (!collectionResult || !currentShape) continue

      if (method.name === 'Where') {
        const predicate = method.args[0]
        if (predicate) {
          collectFieldReferences(predicate, (field) => {
            for (const requirement of extensionRequirementsForField(
              field.name,
            )) {
              requirements.add(requirement)
            }
          })
        }
      } else {
        const fieldArgIndex = fieldArgumentIndex(method)
        const fieldArg =
          fieldArgIndex === null ? undefined : method.args[fieldArgIndex]
        if (
          fieldArgIndex !== null &&
          fieldArg &&
          isFieldReference(fieldArg) &&
          shouldValidateMethodField(method, fieldArgIndex, fieldArg)
        ) {
          for (const requirement of extensionRequirementsForField(
            fieldArg.name,
          )) {
            requirements.add(requirement)
          }
        }
      }

      const result = collectionMethodResultKind(method.name)
      if (result !== 'collection') collectionResult = false
    }
  })

  return [...requirements].sort()
}

function collectFieldReferences(
  expression: MoneyExpression,
  visit: (field: MoneyFieldReference) => void,
) {
  visitExpression(expression, (node) => {
    if (isFieldReference(node)) visit(node)
  })
}

function extensionRequirementsForCollection(
  collectionId: string,
  registry?: MoneyExtensionRegistry,
): string[] {
  const semanticCollectionRequirements: Record<string, string[]> = {
    Subscriptions: ['transaction:subscription'],
    Merchants: ['transaction:merchantGroup'],
    Persons: ['person:profile', 'transaction:sharedExpense'],
    ReviewActions: ['transaction:reviewAction'],
  }
  const semanticRequirements = semanticCollectionRequirements[collectionId]
  if (semanticRequirements) return semanticRequirements

  for (const collection of DEFAULT_EXTENSION_COLLECTIONS) {
    if (collection.id === collectionId)
      return [`transaction:${collection.namespace}`]
  }

  const requirements: string[] = []
  for (const extension of registry?.extensions ?? []) {
    for (const collection of extension.derivedCollections ?? []) {
      if (collection.id === collectionId) {
        requirements.push(`${collection.entity}:${extension.namespace}`)
      }
    }
  }
  return requirements
}

function extensionRequirementsForField(field: string): string[] {
  const requirementsByField: Record<string, string[]> = {
    merchantId: ['transaction:merchantGroup'],
    merchantName: ['transaction:merchantGroup'],
    need: ['transaction:budget'],
    budget_need: ['transaction:budget'],
    budget_period: ['transaction:budget'],
    budget_category: ['transaction:budget'],
    joy: ['transaction:joyReview'],
    joyReview_rating: ['transaction:joyReview'],
    joyReview_reviewedAt: ['transaction:joyReview'],
    sharedStatus: ['transaction:sharedExpense'],
    sharedExpense_status: ['transaction:sharedExpense'],
    sharedExpense_personId: ['transaction:sharedExpense'],
    sharedExpense_percent: ['transaction:sharedExpense'],
    sharedExpense_amount: ['transaction:sharedExpense'],
    sharedExpense_dueDate: ['transaction:sharedExpense'],
    sharedExpense_settledAt: ['transaction:sharedExpense'],
    moneyFlowId: ['transaction:moneyFlow'],
    moneyFlowRole: ['transaction:moneyFlow'],
    moneyFlow_flowId: ['transaction:moneyFlow'],
    moneyFlow_role: ['transaction:moneyFlow'],
    moneyFlow_status: ['transaction:moneyFlow'],
    moneyFlow_feeAmount: ['transaction:moneyFlow'],
    moneyFlow_sourceCurrency: ['transaction:moneyFlow'],
    moneyFlow_targetCurrency: ['transaction:moneyFlow'],
    moneyFlow_reportingCurrency: ['transaction:moneyFlow'],
    moneyFlow_reportingValue: ['transaction:moneyFlow'],
    moneyFlow_reportingValueStatus: ['transaction:moneyFlow'],
    moneyFlow_reportingFxRate: ['transaction:moneyFlow'],
    moneyFlow_reportingFxAsOf: ['transaction:moneyFlow'],
    moneyFlow_reportingFxSource: ['transaction:moneyFlow'],
    taxContribution: ['transaction:taxContribution'],
    taxContributionSource: ['transaction:taxContribution'],
    taxContribution_type: ['transaction:taxContribution'],
    taxContribution_taxYear: ['transaction:taxContribution'],
    taxContribution_contributionSource: ['transaction:taxContribution'],
    reviewActionStatus: ['transaction:reviewAction'],
    reviewActionType: ['transaction:reviewAction'],
    recommendationSeverity: ['transaction:reviewAction'],
    estimatedImpact: ['transaction:reviewAction'],
    scenarioId: ['transaction:reviewAction'],
  }
  return requirementsByField[field] ?? []
}

function createEvaluationContext(
  collections: CollectionMetric[],
  data?: MoneyFormulaData,
): EvaluationContext {
  const runtimeCollections = new Map<string, RuntimeCollection>()
  for (const collection of collections) {
    runtimeCollections.set(collection.id, {
      id: collection.id,
      label: collection.label,
      rows: [],
      fallbackValue: collection.value,
      fallbackCount: collection.count,
    })
  }

  if (data) {
    for (const collection of buildRuntimeCollections(data)) {
      runtimeCollections.set(collection.id, collection)
    }
  }

  return {
    collections: runtimeCollections,
    allocationTargets: new Map(
      (data?.allocationTargets ?? []).map((target) => [target.id, target]),
    ),
    forecastScenarios: new Map(
      (data?.forecastScenarios ?? []).map((scenario) => [
        scenario.id,
        scenario,
      ]),
    ),
    taxContributionLimits: data?.taxContributionLimits ?? [],
    anchorDate: data ? dataAnchorDate(data) : undefined,
  }
}

function evaluateExpression(
  expression: MoneyExpression,
  context: EvaluationContext,
): FormulaValue {
  if (isNumberLiteral(expression)) return expression.value
  if (isStringLiteral(expression)) return expression.value
  if (isBooleanLiteral(expression)) {
    return expression.value === true || expression.value === 'true'
  }
  if (isDateLiteral(expression)) return dateValue(expression.value)
  if (isDurationLiteral(expression)) return durationValue(expression.value)
  if (isFieldReference(expression)) {
    if (context.row) {
      return fieldValue(context.row, expression.name, context.collection)
    }
    const collection = context.collections.get(expression.name)
    if (collection) return collection
    return expression.name
  }
  if (isAggregateCall(expression)) {
    return evaluateCollectionExpression(expression, context)
  }
  if (isFunctionCall(expression)) {
    return evaluateFunctionCall(expression, context)
  }
  if (isUnaryExpression(expression)) {
    const value = evaluateExpression(expression.value, context)
    return expression.operator === 'not' ? !toBoolean(value) : -toNumber(value)
  }
  if (isBinaryExpression(expression)) {
    return evaluateBinaryExpression(expression, context)
  }
  return 0
}

function evaluateBinaryExpression(
  expression: MoneyBinaryExpression,
  context: EvaluationContext,
): FormulaValue {
  const left = evaluateExpression(expression.left, context)
  const right = evaluateExpression(expression.right, context)

  if (expression.operator === 'and') return toBoolean(left) && toBoolean(right)
  if (expression.operator === 'or') return toBoolean(left) || toBoolean(right)
  if (expression.operator === '=') return valuesEqual(left, right)
  if (expression.operator === '!=') return !valuesEqual(left, right)
  if (expression.operator === '<') return compareValues(left, right) < 0
  if (expression.operator === '<=') return compareValues(left, right) <= 0
  if (expression.operator === '>') return compareValues(left, right) > 0
  if (expression.operator === '>=') return compareValues(left, right) >= 0

  const leftNumber = toNumber(left)
  const rightNumber = toNumber(right)
  if (expression.operator === '+') return leftNumber + rightNumber
  if (expression.operator === '-') return leftNumber - rightNumber
  if (expression.operator === '*') return leftNumber * rightNumber
  if (expression.operator === '%')
    return rightNumber === 0 ? 0 : leftNumber % rightNumber
  return rightNumber === 0 ? 0 : leftNumber / rightNumber
}

function evaluateCollectionExpression(
  expression: MoneyAggregateCall,
  context: EvaluationContext,
): FormulaValue {
  let collection = context.collections.get(expression.collection)
  if (!collection) {
    throw new Error(`Unknown collection: ${expression.collection}`)
  }

  let value: FormulaValue = collection
  for (const method of expression.methods) {
    if (isRuntimeCollection(value)) {
      const result = evaluateCollectionMethod(value, method, context)
      value = result
      if (isRuntimeCollection(result)) collection = result
      continue
    }
    if (isFormulaTableValue(value)) {
      value = evaluateTableMethod(value, method)
      continue
    }
    if (isFormulaSeriesValue(value)) {
      value = evaluateSeriesMethod(value, method, context)
      continue
    }

    throw new Error(`Cannot call ${method.name} after a scalar result`)
  }

  return value
}

function evaluateCollectionMethod(
  collection: RuntimeCollection,
  method: MoneyMethodCall,
  context: EvaluationContext,
): FormulaValue {
  if (method.name === 'Sum') return sumCollection(collection)
  if (method.name === 'Count')
    return collection.fallbackCount ?? collection.rows.length
  if (method.name === 'Average') return averageCollection(collection)
  if (method.name === 'Min') return minMaxCollection(collection, 'min')
  if (method.name === 'Max') return minMaxCollection(collection, 'max')
  if (method.name === 'ThisMonth')
    return calendarWindow(collection, 'this-month', context)
  if (method.name === 'LastMonth')
    return calendarWindow(collection, 'last-month', context)
  if (method.name === 'YTD') return calendarWindow(collection, 'ytd', context)
  if (method.name === 'ThisYear')
    return calendarWindow(collection, 'this-year', context)
  if (method.name === 'LastYear')
    return calendarWindow(collection, 'last-year', context)
  if (method.name === 'Between')
    return betweenWindow(collection, method, context)
  if (method.name === 'PreviousPeriod') return previousPeriodWindow(collection)
  if (method.name === 'DueSoon')
    return dueSoonWindow(collection, method, context)
  if (method.name === 'Rolling') {
    return rollingWindow(
      collection,
      method.args[0]
        ? evaluateExpression(method.args[0], context)
        : durationValue('30d'),
      context,
    )
  }
  if (method.name === 'Daily') return periodCollection(collection, 'day')
  if (method.name === 'Weekly') return periodCollection(collection, 'week')
  if (method.name === 'Monthly') return periodCollection(collection, 'month')
  if (method.name === 'Yearly') return periodCollection(collection, 'year')
  if (method.name === 'PeriodSum') return sumCollection(collection)
  if (method.name === 'PeriodAverage') {
    return periodAverage(
      collection,
      method.args[0]
        ? toNumber(evaluateExpression(method.args[0], context))
        : undefined,
    )
  }
  if (method.name === 'MonthlyAverage') {
    return periodAverage(
      periodCollection(collection, 'month'),
      toNumber(
        method.args[0] ? evaluateExpression(method.args[0], context) : 6,
      ),
    )
  }
  if (method.name === 'Where') {
    const predicate = method.args[0]
    if (!predicate) return collection
    return {
      ...collection,
      rows: collection.rows.filter((row) =>
        toBoolean(
          evaluateExpression(predicate, { ...context, row, collection }),
        ),
      ),
      fallbackCount: undefined,
      fallbackValue: undefined,
    }
  }
  if (method.name === 'Unique')
    return uniqueCollection(collection, method, context)
  if (method.name === 'Limit')
    return limitCollectionByOffset(collection, method, context)
  if (method.name === 'Offset')
    return offsetCollection(collection, method, context)
  if (method.name === 'Sort') return sortCollection(collection, method, context)
  if (method.name === 'Top')
    return limitCollection(collection, method, context, 'top')
  if (method.name === 'Bottom')
    return limitCollection(collection, method, context, 'bottom')
  if (method.name === 'MinBy')
    return minMaxBy(collection, method, context, 'min')
  if (method.name === 'MaxBy')
    return minMaxBy(collection, method, context, 'max')
  if (method.name === 'GroupBy')
    return groupCollection(collection, method, context)
  if (method.name === 'Trend') return trendCollection(collection)
  if (method.name === 'PercentOfTotal') {
    const total = sumCollection(
      context.collections.get(collection.id) ?? collection,
    )
    return total === 0 ? 0 : sumCollection(collection) / total
  }

  throw new Error(`Unsupported collection method: ${method.name}`)
}

function evaluateTableMethod(
  table: FormulaTableValue,
  method: MoneyMethodCall,
): FormulaValue {
  if (method.name !== 'PercentOfTotal') {
    throw new Error(`Cannot call ${method.name} after a table result`)
  }

  const total = table.rows.reduce(
    (sum, row) => sum + (typeof row.value === 'number' ? row.value : 0),
    0,
  )
  return {
    ...table,
    columns: [
      ...table.columns,
      { key: 'percentOfTotal', label: 'Percent of Total', kind: 'percent' },
    ],
    rows: table.rows.map((row) => ({
      ...row,
      percentOfTotal:
        total === 0 || typeof row.value !== 'number' ? 0 : row.value / total,
    })),
  }
}

function evaluateSeriesMethod(
  series: FormulaSeriesValue,
  method: MoneyMethodCall,
  context: EvaluationContext,
): FormulaValue {
  if (method.name === 'MovingAverage') {
    const periods = Math.max(
      1,
      Math.floor(
        toNumber(
          method.args[0] ? evaluateExpression(method.args[0], context) : 3,
        ),
      ),
    )
    return movingAverageSeries(series, periods)
  }

  if (method.name === 'Cumulative') return cumulativeSeries(series)

  throw new Error(`Cannot call ${method.name} after a series result`)
}

function movingAverageSeries(
  series: FormulaSeriesValue,
  periods: number,
): FormulaSeriesValue {
  return {
    ...series,
    points: series.points.map((point, index, points) => {
      const windowPoints = points.slice(
        Math.max(0, index - periods + 1),
        index + 1,
      )
      const total = sum(windowPoints.map((windowPoint) => windowPoint.value))
      return {
        ...point,
        value: total / windowPoints.length,
        count: sum(windowPoints.map((windowPoint) => windowPoint.count)),
      }
    }),
  }
}

function cumulativeSeries(series: FormulaSeriesValue): FormulaSeriesValue {
  let value = 0
  let count = 0
  const first = series.points[0]
  return {
    ...series,
    points: series.points.map((point) => {
      value += point.value
      count += point.count
      return {
        ...point,
        value,
        count,
        startDate: first?.startDate ?? first?.key ?? point.startDate,
        endDate: point.startDate ?? point.key,
      }
    }),
  }
}

function freedomAgeValue(args: FormulaValue[]): number {
  const currentAgeInput = safePositiveFormulaNumber(args[3], 0)
  const withdrawalRate = clampNumber(
    safePositiveFormulaNumber(args[4], 0.04),
    0.001,
    1,
  )
  const maxAge = Math.max(
    currentAgeInput,
    safePositiveFormulaNumber(args[5], 99),
  )
  const hasUsableAge = currentAgeInput >= 18

  const assets = safePositiveFormulaNumber(args[0], 0)
  const monthlyExpenses = safePositiveFormulaNumber(args[1], 0)
  const monthlyIncome = safePositiveFormulaNumber(args[2], 0)
  if (!hasUsableAge) return Math.ceil(maxAge)
  const currentAge = currentAgeInput
  if (monthlyExpenses === 0) return Math.ceil(currentAge)

  const targetAssets = (monthlyExpenses * 12) / withdrawalRate
  if (assets >= targetAssets) return Math.ceil(currentAge)

  const monthlySavings = monthlyIncome - monthlyExpenses
  if (monthlySavings <= 0) return Math.ceil(maxAge)

  const projectedAge =
    currentAge + (targetAssets - assets) / (monthlySavings * 12)
  if (!Number.isFinite(projectedAge) || projectedAge >= maxAge) {
    return Math.ceil(maxAge)
  }
  return Math.ceil(projectedAge)
}

function forecastValue(
  basis: FormulaValue | undefined,
  periodsValue?: FormulaValue,
  confidenceValue?: FormulaValue,
): FormulaForecastValue {
  const periods = Math.max(1, Math.floor(toNumber(periodsValue ?? 3)))
  const confidenceInput =
    confidenceValue === undefined ? undefined : toNumber(confidenceValue)
  const confidence =
    confidenceInput === undefined
      ? forecastConfidence(basis)
      : clampNumber(
          confidenceInput > 1 ? confidenceInput / 100 : confidenceInput,
          0,
          1,
        )

  if (basis && isFormulaSeriesValue(basis) && basis.points.length > 0) {
    return forecastSeriesValue(basis, periods, confidence)
  }

  const value = basis ? toNumber(basis) : 0
  const spread = Math.abs(value) * (1 - confidence) * 0.75
  return {
    type: 'forecast',
    value,
    low: value - spread,
    high: value + spread,
    confidence,
    method: 'point',
    periods,
    basis: {
      value,
      observations: basis ? 1 : 0,
    },
  }
}

function forecastScenarioValue(
  basis: FormulaValue | undefined,
  scenarioValue: FormulaValue | undefined,
  periodsValue: FormulaValue | undefined,
  context: EvaluationContext,
): FormulaForecastValue {
  const scenario = storedForecastScenario(scenarioValue, context)
  const periods =
    scenario?.horizonPeriods ??
    (periodsValue === undefined
      ? undefined
      : Math.max(1, Math.floor(toNumber(periodsValue))))
  const forecast = forecastValue(basis, periods, scenario?.confidence)
  if (!scenario) return forecast

  const acceptedChanges = scenario.changes.filter(
    (change) =>
      !change.status ||
      change.status === 'draft' ||
      change.status === 'accepted',
  )
  const rejectedChanges = scenario.changes.filter(
    (change) => change.status === 'rejected' || change.status === 'archived',
  )
  const monthlyDelta = sum(
    acceptedChanges.map((change) => {
      const fixedMonthly =
        change.amountMonthly ??
        (change.amountAnnual === undefined ? 0 : change.amountAnnual / 12)
      const percentMonthly =
        change.percentChange === undefined
          ? 0
          : forecast.basis.value * change.percentChange
      return fixedMonthly + percentMonthly
    }),
  )
  const adjustedValue = forecast.value + monthlyDelta
  const adjustedLow = forecast.low + monthlyDelta
  const adjustedHigh = forecast.high + monthlyDelta

  return {
    ...forecast,
    value: adjustedValue,
    low: adjustedLow,
    high: adjustedHigh,
    method:
      forecast.method === 'series-linear'
        ? 'scenario-series-linear'
        : 'scenario-point',
    scenario: {
      id: scenario.id,
      name: scenario.name,
      status: scenario.status,
      monthlyDelta,
      annualDelta: monthlyDelta * 12,
      percentDelta:
        forecast.basis.value === 0
          ? 0
          : monthlyDelta / Math.abs(forecast.basis.value),
      acceptedChanges: acceptedChanges.length,
      rejectedChanges: rejectedChanges.length,
    },
    points: forecast.points?.map((point) => ({
      ...point,
      value: point.value + monthlyDelta,
      low: point.low + monthlyDelta,
      high: point.high + monthlyDelta,
    })),
  }
}

function storedForecastScenario(
  value: FormulaValue | undefined,
  context: EvaluationContext,
): MoneyForecastScenario | undefined {
  if (context.forecastScenarios.size === 0) return undefined
  if (value === undefined) return context.forecastScenarios.get('default')
  if (typeof value !== 'string') return undefined
  const id = value.trim()
  if (!id || id.includes(':') || id.includes('=')) return undefined
  return context.forecastScenarios.get(normalizeTargetId(id))
}

function forecastSeriesValue(
  series: FormulaSeriesValue,
  periods: number,
  confidence: number,
): FormulaForecastValue {
  const points = series.points.filter((point) => Number.isFinite(point.value))
  const last = points.at(-1)
  const value = last?.value ?? 0
  const slope = linearSlope(points.map((point) => point.value))
  const residualSpread = forecastResidualSpread(
    points.map((point) => point.value),
    slope,
  )
  const unit = inferForecastUnit(points)
  const forecastPoints = Array.from({ length: periods }, (_, index) => {
    const step = index + 1
    const projected = value + slope * step
    const spread = residualSpread * Math.sqrt(step) * (1.25 - confidence)
    const key = nextForecastKey(last?.key, unit, step)
    return {
      key,
      label: key,
      value: projected,
      low: projected - spread,
      high: projected + spread,
    }
  })
  const terminal = forecastPoints.at(-1)
  return {
    type: 'forecast',
    value: terminal?.value ?? value,
    low: terminal?.low ?? value,
    high: terminal?.high ?? value,
    confidence,
    method: 'series-linear',
    periods,
    unit,
    basis: {
      value,
      observations: points.length,
    },
    points: forecastPoints,
  }
}

function forecastConfidence(basis: FormulaValue | undefined): number {
  if (basis && isFormulaSeriesValue(basis)) {
    const observations = basis.points.length
    return clampNumber(0.45 + Math.min(observations, 12) * 0.035, 0.45, 0.88)
  }
  return 0.6
}

function linearSlope(values: number[]): number {
  if (values.length < 2) return 0
  const n = values.length
  const meanX = (n - 1) / 2
  const meanY = sum(values) / n
  let numerator = 0
  let denominator = 0
  values.forEach((value, index) => {
    numerator += (index - meanX) * (value - meanY)
    denominator += (index - meanX) ** 2
  })
  return denominator === 0 ? 0 : numerator / denominator
}

function forecastResidualSpread(values: number[], slope: number): number {
  if (values.length < 2) return Math.abs(values[0] ?? 0) * 0.1
  const first = values[0] ?? 0
  const residuals = values.map((value, index) =>
    Math.abs(value - (first + slope * index)),
  )
  const average = sum(residuals) / residuals.length
  return Math.max(average, Math.abs(values.at(-1) ?? 0) * 0.05, 1)
}

function inferForecastUnit(
  points: FormulaSeriesValue['points'],
): FormulaForecastValue['unit'] {
  const keys = points.map((point) => point.key)
  if (keys.every((key) => /^\d{4}-\d{2}-\d{2}$/.test(key))) return 'day'
  if (keys.every((key) => /^\d{4}-W\d{2}$/.test(key))) return 'week'
  if (keys.every((key) => /^\d{4}-\d{2}$/.test(key))) return 'month'
  if (keys.every((key) => /^\d{4}$/.test(key))) return 'year'
  return undefined
}

function nextForecastKey(
  lastKey: string | undefined,
  unit: FormulaForecastValue['unit'],
  step: number,
): string {
  if (!lastKey || !unit) return `+${step}`
  if (unit === 'year') return String(Number(lastKey) + step)
  if (unit === 'month') {
    const date = new Date(`${lastKey}-01T00:00:00Z`)
    date.setUTCMonth(date.getUTCMonth() + step)
    return date.toISOString().slice(0, 7)
  }
  if (unit === 'day') {
    const date = new Date(`${lastKey}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() + step)
    return date.toISOString().slice(0, 10)
  }
  if (unit === 'week') {
    const start = periodStartDate(lastKey, 'week')
    const date = new Date(`${start}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() + 7 * step)
    return isoWeekKey(date)
  }
  return `+${step}`
}

function allocationDriftValue(
  allocationValue: FormulaValue | undefined,
  targetValue?: FormulaValue,
  context?: EvaluationContext,
): FormulaValue {
  if (!allocationValue || !isFormulaTableValue(allocationValue)) return 0

  const targets = allocationTargets(targetValue, context)
  const sourceRows = allocationValue.rows.map((row) => {
    const key = String(row.key ?? row.label ?? 'other').toLowerCase()
    const value = typeof row.value === 'number' ? row.value : 0
    const actualPercent =
      typeof row.percentOfTotal === 'number'
        ? row.percentOfTotal
        : allocationTableTotal(allocationValue) === 0
          ? 0
          : value / allocationTableTotal(allocationValue)
    return {
      ...row,
      key,
      label: String(row.label ?? row.key ?? key),
      value,
      count: typeof row.count === 'number' ? row.count : 0,
      actualPercent,
    }
  })

  const rowsByKey = new Map(sourceRows.map((row) => [row.key, row]))
  const total = allocationTableTotal(allocationValue)
  const keys = new Set([...sourceRows.map((row) => row.key), ...targets.keys()])
  const rows = [...keys]
    .map((key) => {
      const row = rowsByKey.get(key)
      const value = row?.value ?? 0
      const actualPercent = row?.actualPercent ?? 0
      const targetPercent = targets.get(key) ?? 0
      const drift = actualPercent - targetPercent
      return {
        key,
        label: row?.label ?? titleFromField(key),
        value,
        count: row?.count ?? 0,
        actualPercent,
        targetPercent,
        drift,
        driftAbs: Math.abs(drift),
        rebalanceAmount: -drift * total,
      }
    })
    .sort((a, b) => b.driftAbs - a.driftAbs || a.label.localeCompare(b.label))

  return {
    type: 'table',
    columns: [
      { key: 'label', label: 'Asset Class', kind: 'string' },
      { key: 'value', label: 'Value', kind: 'number' },
      { key: 'actualPercent', label: 'Actual', kind: 'percent' },
      { key: 'targetPercent', label: 'Target', kind: 'percent' },
      { key: 'drift', label: 'Drift', kind: 'percent' },
      { key: 'rebalanceAmount', label: 'Rebalance Amount', kind: 'number' },
    ],
    rows,
  }
}

function tableChangeValue(
  currentValue: FormulaValue | undefined,
  previousValue: FormulaValue | undefined,
): FormulaValue {
  if (!currentValue || !previousValue) return emptyTableChange()
  if (
    !isFormulaTableValue(currentValue) ||
    !isFormulaTableValue(previousValue)
  ) {
    return emptyTableChange()
  }

  const currentRows = tableRowsByKey(currentValue)
  const previousRows = tableRowsByKey(previousValue)
  const keys = new Set([...currentRows.keys(), ...previousRows.keys()])
  const rows = [...keys]
    .map((key) => {
      const current = currentRows.get(key)
      const previous = previousRows.get(key)
      const currentValue = current?.value ?? 0
      const previousValue = previous?.value ?? 0
      const currentPercent = current?.percentOfTotal ?? 0
      const previousPercent = previous?.percentOfTotal ?? 0
      const delta = currentValue - previousValue
      const percentDelta =
        previousValue === 0
          ? currentValue === 0
            ? 0
            : 1
          : delta / Math.abs(previousValue)
      const percentPointDelta = currentPercent - previousPercent

      return {
        key,
        label: current?.label ?? previous?.label ?? titleFromField(key),
        value: currentValue,
        currentValue,
        previousValue,
        delta,
        percentDelta,
        currentPercent,
        previousPercent,
        percentPointDelta,
        count: current?.count ?? 0,
        previousCount: previous?.count ?? 0,
      }
    })
    .sort(
      (a, b) =>
        Math.abs(b.delta) - Math.abs(a.delta) ||
        Math.abs(b.percentPointDelta) - Math.abs(a.percentPointDelta) ||
        a.label.localeCompare(b.label),
    )

  return {
    type: 'table',
    columns: tableChangeColumns(),
    rows,
  }
}

function emptyTableChange(): FormulaTableValue {
  return {
    type: 'table',
    columns: tableChangeColumns(),
    rows: [],
  }
}

function tableChangeColumns(): FormulaTableValue['columns'] {
  return [
    { key: 'label', label: 'Group', kind: 'string' },
    { key: 'currentValue', label: 'Current', kind: 'number' },
    { key: 'previousValue', label: 'Previous', kind: 'number' },
    { key: 'delta', label: 'Delta', kind: 'number' },
    { key: 'percentDelta', label: 'Percent Delta', kind: 'percent' },
    { key: 'currentPercent', label: 'Current Share', kind: 'percent' },
    { key: 'previousPercent', label: 'Previous Share', kind: 'percent' },
    { key: 'percentPointDelta', label: 'Share Delta', kind: 'percent' },
    { key: 'count', label: 'Current Count', kind: 'number' },
    { key: 'previousCount', label: 'Previous Count', kind: 'number' },
  ]
}

function agingValue(
  collectionValue: FormulaValue | undefined,
  dueFieldValue?: FormulaValue,
  context?: EvaluationContext,
): FormulaTableValue {
  if (!collectionValue || !isRuntimeCollection(collectionValue)) {
    return agingTable([])
  }

  const dueField =
    typeof dueFieldValue === 'string' && dueFieldValue.trim()
      ? dueFieldValue.trim()
      : 'nextDueDate'
  const anchor =
    context?.anchorDate ?? collectionAnchorDate(collectionValue) ?? new Date()
  const anchorDate = new Date(
    Date.UTC(
      anchor.getUTCFullYear(),
      anchor.getUTCMonth(),
      anchor.getUTCDate(),
    ),
  )
  const buckets = new Map(
    agingBucketDefs().map((bucket) => [
      bucket.key,
      {
        ...bucket,
        value: 0,
        count: 0,
        minDaysUntilDue: null as number | null,
        maxDaysUntilDue: null as number | null,
      },
    ]),
  )

  for (const row of collectionValue.rows) {
    const dueDate = rowDueDate(row, collectionValue, dueField)
    const daysUntilDue = dueDate
      ? Math.floor((dueDate.getTime() - anchorDate.getTime()) / 86_400_000)
      : null
    const bucket = buckets.get(agingBucketKey(daysUntilDue))
    if (!bucket) continue
    bucket.value += rowMeasure(collectionValue, row)
    bucket.count += 1
    if (daysUntilDue !== null) {
      bucket.minDaysUntilDue =
        bucket.minDaysUntilDue === null
          ? daysUntilDue
          : Math.min(bucket.minDaysUntilDue, daysUntilDue)
      bucket.maxDaysUntilDue =
        bucket.maxDaysUntilDue === null
          ? daysUntilDue
          : Math.max(bucket.maxDaysUntilDue, daysUntilDue)
    }
  }

  return agingTable([...buckets.values()])
}

function agingBucketDefs() {
  return [
    { key: 'overdue', label: 'Overdue', sort: 0 },
    { key: 'due_7d', label: 'Due 7d', sort: 1 },
    { key: 'due_30d', label: 'Due 30d', sort: 2 },
    { key: 'later', label: 'Later', sort: 3 },
    { key: 'no_due_date', label: 'No Due Date', sort: 4 },
  ]
}

function agingBucketKey(daysUntilDue: number | null): string {
  if (daysUntilDue === null) return 'no_due_date'
  if (daysUntilDue < 0) return 'overdue'
  if (daysUntilDue <= 7) return 'due_7d'
  if (daysUntilDue <= 30) return 'due_30d'
  return 'later'
}

function agingTable(
  rows: Array<{
    key: string
    label: string
    sort: number
    value: number
    count: number
    minDaysUntilDue: number | null
    maxDaysUntilDue: number | null
  }>,
): FormulaTableValue {
  return {
    type: 'table',
    columns: [
      { key: 'label', label: 'Bucket', kind: 'string' },
      { key: 'value', label: 'Amount', kind: 'number' },
      { key: 'count', label: 'Count', kind: 'number' },
      { key: 'minDaysUntilDue', label: 'Min Days Until Due', kind: 'number' },
      { key: 'maxDaysUntilDue', label: 'Max Days Until Due', kind: 'number' },
    ],
    rows: rows
      .sort((a, b) => a.sort - b.sort)
      .map((row) => ({
        key: row.key,
        label: row.label,
        value: row.value,
        count: row.count,
        minDaysUntilDue: row.minDaysUntilDue,
        maxDaysUntilDue: row.maxDaysUntilDue,
      })),
  }
}

function tableRowsByKey(table: FormulaTableValue) {
  const total = allocationTableTotal(table)
  const rows = new Map<
    string,
    {
      key: string
      label: string
      value: number
      count: number
      percentOfTotal: number
    }
  >()

  for (const row of table.rows) {
    const key = String(row.key ?? row.label ?? 'other').toLowerCase()
    const value = typeof row.value === 'number' ? row.value : 0
    rows.set(key, {
      key,
      label: String(row.label ?? row.key ?? key),
      value,
      count: typeof row.count === 'number' ? row.count : 0,
      percentOfTotal:
        typeof row.percentOfTotal === 'number'
          ? row.percentOfTotal
          : total === 0
            ? 0
            : value / total,
    })
  }

  return rows
}

function allocationTableTotal(table: FormulaTableValue): number {
  return sum(
    table.rows.map((row) => (typeof row.value === 'number' ? row.value : 0)),
  )
}

function allocationTargets(
  value: FormulaValue | undefined,
  context?: EvaluationContext,
): Map<string, number> {
  const stored = storedAllocationTarget(value, context)
  if (stored) return allocationMapFromRecord(stored.allocations)

  const targets = new Map<string, number>()
  if (typeof value !== 'string') return targets

  for (const part of value.split(',')) {
    const match = part
      .trim()
      .match(/^([^:=]+)\s*[:=]\s*([0-9]+(?:\.[0-9]+)?%?)$/)
    if (!match) continue
    const key =
      match[1]
        ?.trim()
        .toLowerCase()
        .replace(/[_\s]+/g, '-') ?? ''
    const rawAmount = match[2] ?? '0'
    const parsed = Number(rawAmount.replace('%', ''))
    if (!key || !Number.isFinite(parsed)) continue
    targets.set(
      key,
      clampNumber(
        rawAmount.endsWith('%') || parsed > 1 ? parsed / 100 : parsed,
        0,
        1,
      ),
    )
  }

  return targets
}

function storedAllocationTarget(
  value: FormulaValue | undefined,
  context?: EvaluationContext,
): MoneyAllocationTarget | undefined {
  if (!context || context.allocationTargets.size === 0) return undefined
  if (value === undefined) return context.allocationTargets.get('default')
  if (typeof value !== 'string') return undefined
  if (value.includes(':') || value.includes('=')) return undefined
  const id = normalizeTargetId(value)
  return context.allocationTargets.get(id)
}

function allocationMapFromRecord(
  allocations: MoneyAllocationTarget['allocations'],
): Map<string, number> {
  return new Map(
    Object.entries(allocations).filter((entry): entry is [string, number] => {
      const [, value] = entry
      return typeof value === 'number' && Number.isFinite(value) && value > 0
    }),
  )
}

function contributionRoomValue(
  contributionsValue: FormulaValue | undefined,
  typeValue: FormulaValue | undefined,
  yearValue: FormulaValue | undefined,
  variantValue: FormulaValue | undefined,
  context: EvaluationContext,
): FormulaValue {
  if (!contributionsValue || !isRuntimeCollection(contributionsValue)) {
    return contributionRoomTable([])
  }

  const requestedType = contributionTypeFromValue(typeValue)
  const requestedYear = contributionYearFromValue(yearValue, context)
  const requestedVariant = contributionVariantFromValue(variantValue)
  const contributionRows = contributionsValue.rows
    .map((row) => contributionFact(contributionsValue, row, requestedYear))
    .filter((fact): fact is TaxContributionFact => {
      if (!fact) return false
      if (requestedType && fact.type !== requestedType) return false
      return requestedYear === undefined || fact.taxYear === requestedYear
    })

  const observedKeys = new Set(
    contributionRows.map((fact) =>
      contributionLimitKey(fact.type, fact.taxYear, requestedVariant),
    ),
  )
  const limitRows = context.taxContributionLimits.filter((limit) => {
    if (requestedType && limit.type !== requestedType) return false
    if (requestedYear !== undefined && limit.taxYear !== requestedYear)
      return false
    if (requestedVariant && limit.variant !== requestedVariant) return false
    if (
      !requestedType &&
      !requestedYear &&
      !observedKeys.has(
        contributionLimitKey(limit.type, limit.taxYear, limit.variant),
      )
    ) {
      return false
    }
    return requestedType || requestedYear || observedKeys.size === 0
      ? true
      : observedKeys.has(
          contributionLimitKey(limit.type, limit.taxYear, limit.variant),
        )
  })

  const rowsByKey = new Map<string, TaxContributionRoomRow>()
  for (const limit of limitRows) {
    rowsByKey.set(
      contributionLimitKey(limit.type, limit.taxYear, limit.variant),
      {
        key: contributionLimitKey(limit.type, limit.taxYear, limit.variant),
        label: limit.label,
        value: limit.limit,
        type: limit.type,
        taxYear: limit.taxYear,
        variant: limit.variant ?? 'standard',
        used: 0,
        limit: limit.limit,
        remaining: limit.limit,
        utilization: 0,
        sourceLabel: limit.sourceLabel ?? '',
        sourceUrl: limit.sourceUrl ?? '',
      },
    )
  }

  for (const fact of contributionRows) {
    const matchingLimit = matchingContributionLimit(
      context.taxContributionLimits,
      fact.type,
      fact.taxYear,
      requestedVariant,
    )
    const variant = matchingLimit?.variant ?? requestedVariant ?? 'standard'
    const key = contributionLimitKey(fact.type, fact.taxYear, variant)
    const existing = rowsByKey.get(key) ?? {
      key,
      label:
        matchingLimit?.label ??
        `${fact.taxYear} ${fact.type.toUpperCase()} Contributions`,
      value: matchingLimit?.limit ?? 0,
      type: fact.type,
      taxYear: fact.taxYear,
      variant,
      used: 0,
      limit: matchingLimit?.limit ?? 0,
      remaining: matchingLimit?.limit ?? 0,
      utilization: 0,
      sourceLabel: matchingLimit?.sourceLabel ?? '',
      sourceUrl: matchingLimit?.sourceUrl ?? '',
    }
    existing.used += fact.amount
    existing.remaining = Math.max(existing.limit - existing.used, 0)
    existing.utilization =
      existing.limit > 0 ? existing.used / existing.limit : 0
    existing.value = existing.remaining
    rowsByKey.set(key, existing)
  }

  const rows = [...rowsByKey.values()].sort(
    (a, b) =>
      b.taxYear - a.taxYear ||
      a.type.localeCompare(b.type) ||
      a.variant.localeCompare(b.variant),
  )
  return contributionRoomTable(rows)
}

type TaxContributionFact = {
  type: MoneyTaxContributionType
  taxYear: number
  amount: number
}

type TaxContributionRoomRow = {
  key: string
  label: string
  value: number
  type: MoneyTaxContributionType
  taxYear: number
  variant: MoneyTaxContributionLimitVariant
  used: number
  limit: number
  remaining: number
  utilization: number
  sourceLabel: string
  sourceUrl: string
}

function contributionFact(
  collection: RuntimeCollection,
  row: RuntimeEntity,
  fallbackYear: number | undefined,
): TaxContributionFact | null {
  const extensions = runtimeExtensions(row).taxContribution ?? {}
  const type = contributionTypeFromValue(
    extensions.type ?? extensions.taxContribution,
  )
  if (!type) return null
  const rowYear =
    typeof extensions.taxYear === 'number' &&
    Number.isFinite(extensions.taxYear)
      ? Math.floor(extensions.taxYear)
      : rowDate(row)?.getUTCFullYear()
  const taxYear = rowYear ?? fallbackYear
  if (!taxYear) return null
  const amount = rowMeasure(collection, row)
  if (!Number.isFinite(amount) || amount <= 0) return null
  return { type, taxYear, amount }
}

function matchingContributionLimit(
  limits: MoneyTaxContributionLimit[],
  type: MoneyTaxContributionType,
  taxYear: number,
  variant?: MoneyTaxContributionLimitVariant,
): MoneyTaxContributionLimit | undefined {
  const candidates = limits.filter(
    (limit) =>
      limit.type === type &&
      limit.taxYear === taxYear &&
      (!variant || limit.variant === variant),
  )
  return (
    candidates.find((limit) => limit.variant === variant) ??
    candidates.find((limit) => limit.variant === 'standard') ??
    candidates[0]
  )
}

function contributionRoomTable(
  rows: TaxContributionRoomRow[],
): FormulaTableValue {
  return {
    type: 'table',
    columns: [
      { key: 'label', label: 'Limit', kind: 'string' },
      { key: 'used', label: 'Used', kind: 'number' },
      { key: 'limit', label: 'Limit', kind: 'number' },
      { key: 'remaining', label: 'Remaining', kind: 'number' },
      { key: 'utilization', label: 'Utilization', kind: 'percent' },
      { key: 'taxYear', label: 'Tax Year', kind: 'number' },
      { key: 'variant', label: 'Variant', kind: 'string' },
    ],
    rows,
  }
}

function contributionTypeFromValue(
  value: FormulaValue | MoneyExtensionPrimitive | undefined,
): MoneyTaxContributionType | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.toLowerCase().replace(/[_\s-]+/g, '')
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
  return undefined
}

function contributionYearFromValue(
  value: FormulaValue | undefined,
  context: EvaluationContext,
): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value))
    return Math.floor(value)
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return Math.floor(parsed)
  }
  return context.anchorDate?.getUTCFullYear()
}

function contributionVariantFromValue(
  value: FormulaValue | undefined,
): MoneyTaxContributionLimitVariant | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.toLowerCase().replace(/[_\s]+/g, '-')
  if (normalized === 'self' || normalized === 'self-only') return 'self'
  if (normalized === 'family') return 'family'
  if (normalized === 'standard' || normalized === 'individual')
    return 'standard'
  return undefined
}

function contributionLimitKey(
  type: MoneyTaxContributionType,
  taxYear: number,
  variant?: MoneyTaxContributionLimitVariant,
): string {
  return `${type}-${taxYear}-${variant ?? 'standard'}`
}

function normalizeTargetId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function creditUtilizationValue(value: FormulaValue | undefined): FormulaValue {
  if (!value || !isRuntimeCollection(value)) return 0
  const rows = value.rows
    .filter((row) => isMoneyAccount(row) || isMoneyDebt(row))
    .map((row) => {
      const balance = rowCreditBalance(row)
      const creditLimit = rowCreditLimit(row)
      const availableCredit =
        rowAvailableCredit(row) ??
        (creditLimit > 0 ? Math.max(creditLimit - balance, 0) : 0)
      const utilization =
        rowUtilization(row) ?? (creditLimit > 0 ? balance / creditLimit : 0)
      return {
        key: row.id,
        label: row.name,
        value: balance,
        balance,
        creditLimit,
        availableCredit,
        statementBalance: isMoneyDebt(row)
          ? (row.statementBalance ?? null)
          : null,
        utilization,
        utilizationPercent: utilization,
        institutionName: row.institutionName ?? '',
        type: row.type,
      }
    })
    .filter((row) => row.creditLimit > 0)
    .sort((a, b) => b.utilization - a.utilization || b.balance - a.balance)
  const totalBalance = sum(rows.map((row) => row.balance))
  const totalLimit = sum(rows.map((row) => row.creditLimit))
  const totalUtilization = totalLimit > 0 ? totalBalance / totalLimit : 0

  return {
    type: 'table',
    columns: [
      { key: 'label', label: 'Card', kind: 'string' },
      { key: 'balance', label: 'Balance', kind: 'number' },
      { key: 'creditLimit', label: 'Credit Limit', kind: 'number' },
      { key: 'availableCredit', label: 'Available Credit', kind: 'number' },
      { key: 'utilization', label: 'Utilization', kind: 'percent' },
      { key: 'statementBalance', label: 'Statement Balance', kind: 'number' },
    ],
    rows: [
      {
        key: 'total',
        label: 'Total',
        value: totalBalance,
        balance: totalBalance,
        creditLimit: totalLimit,
        availableCredit: Math.max(totalLimit - totalBalance, 0),
        statementBalance: null,
        utilization: totalUtilization,
        utilizationPercent: totalUtilization,
        institutionName: '',
        type: 'credit',
      },
      ...rows,
    ],
  }
}

function rowCreditBalance(row: MoneyAccount | MoneyDebt): number {
  return Math.abs(
    isMoneyAccount(row) ? (row.valueForSum ?? row.currentBalance) : row.balance,
  )
}

function rowCreditLimit(row: MoneyAccount | MoneyDebt): number {
  return Math.max(
    0,
    row.creditLimit ?? (isMoneyAccount(row) ? (row.balance?.limit ?? 0) : 0),
  )
}

function rowAvailableCredit(row: MoneyAccount | MoneyDebt): number | undefined {
  return row.availableCredit
}

function rowUtilization(row: MoneyAccount | MoneyDebt): number | undefined {
  return row.utilization
}

function debtPayoffValue(
  debtsValue: FormulaValue | undefined,
  budgetValue?: FormulaValue,
  strategyValue?: FormulaValue,
): FormulaValue {
  if (!debtsValue || !isRuntimeCollection(debtsValue)) {
    return debtsValue ? toNumber(debtsValue) : 0
  }

  const debts = debtsValue.rows
    .map((row) => debtPayoffInput(debtsValue, row))
    .filter((debt): debt is DebtPayoffInput =>
      Boolean(debt && debt.balance > 0),
    )
  if (debts.length === 0) return debtPayoffTable([], 'avalanche', 0)

  const strategy = debtPayoffStrategy(strategyValue)
  const ordered = orderDebtPayoffInputs(debts, strategy)
  const minimumTotal = sum(ordered.map((debt) => debt.minimumPayment))
  const requestedBudget = budgetValue === undefined ? 0 : toNumber(budgetValue)
  const budget = Math.max(requestedBudget, minimumTotal)
  const plan = debtPayoffPlan(ordered, budget)
  const rows = ordered.map((debt, index) => {
    const projection = plan.get(debt.id)
    return {
      id: debt.id,
      label: debt.name,
      value: debt.balance,
      strategy,
      priority: index + 1,
      balance: debt.balance,
      apr: debt.aprRate,
      minimumPayment: debt.minimumPayment,
      monthlyPayment: projection?.firstMonthPayment ?? 0,
      payoffMonths: projection?.payoffMonths ?? null,
      payoffYears:
        projection?.payoffMonths === null ||
        projection?.payoffMonths === undefined
          ? null
          : projection.payoffMonths / 12,
      interestEstimate: projection?.interestEstimate ?? null,
      nextPaymentDueDate: debt.nextPaymentDueDate ?? null,
      isOverdue: debt.isOverdue,
    }
  })
  return debtPayoffTable(rows, strategy, budget)
}

function interestDragValue(
  debtsValue: FormulaValue | undefined,
  periodValue?: FormulaValue,
): number {
  if (!debtsValue || !isRuntimeCollection(debtsValue)) return 0
  const annualInterest = sum(
    debtsValue.rows.map((row) => {
      const debt = debtPayoffInput(debtsValue, row)
      return debt ? debt.balance * debt.aprRate : 0
    }),
  )
  const period =
    typeof periodValue === 'string' ? periodValue.toLowerCase() : 'annual'
  if (['monthly', 'month', 'mo'].includes(period)) return annualInterest / 12
  if (['daily', 'day', 'd'].includes(period)) return annualInterest / 365
  return annualInterest
}

type DebtPayoffStrategy = 'avalanche' | 'snowball' | 'highest-balance'

type DebtPayoffInput = {
  id: string
  name: string
  balance: number
  aprRate: number
  minimumPayment: number
  nextPaymentDueDate?: string
  isOverdue: boolean
}

type DebtPayoffProjection = {
  firstMonthPayment: number
  payoffMonths: number | null
  interestEstimate: number | null
}

type DebtPayoffState = DebtPayoffInput & {
  remaining: number
  firstMonthPayment: number
  payoffMonths: number | null
  interestEstimate: number
}

function debtPayoffInput(
  collection: RuntimeCollection,
  row: RuntimeEntity,
): DebtPayoffInput | null {
  const balance = Math.abs(rowMeasure(collection, row))
  if (balance <= 0) return null
  const record = row as unknown as Record<string, unknown>
  const rawApr = typeof record.apr === 'number' ? record.apr : 0
  const aprRate = rawApr > 1 ? rawApr / 100 : Math.max(0, rawApr)
  const rawMinimumPayment =
    typeof record.minimumPayment === 'number'
      ? record.minimumPayment
      : undefined
  const minimumPayment =
    rawMinimumPayment && rawMinimumPayment > 0
      ? rawMinimumPayment
      : Math.max(25, balance * 0.02)
  return {
    id: String(record.id ?? ''),
    name: String(record.name ?? record.officialName ?? record.id ?? 'Debt'),
    balance,
    aprRate,
    minimumPayment: Math.min(minimumPayment, balance),
    nextPaymentDueDate:
      typeof record.nextPaymentDueDate === 'string'
        ? record.nextPaymentDueDate
        : undefined,
    isOverdue: record.isOverdue === true,
  }
}

function debtPayoffStrategy(
  value: FormulaValue | undefined,
): DebtPayoffStrategy {
  if (typeof value !== 'string') return 'avalanche'
  const normalized = value.toLowerCase().replace(/[_\s]+/g, '-')
  if (normalized === 'snowball') return 'snowball'
  if (normalized === 'highest-balance' || normalized === 'balance') {
    return 'highest-balance'
  }
  return 'avalanche'
}

function orderDebtPayoffInputs(
  debts: DebtPayoffInput[],
  strategy: DebtPayoffStrategy,
): DebtPayoffInput[] {
  return [...debts].sort((a, b) => {
    if (strategy === 'snowball') {
      return (
        a.balance - b.balance ||
        b.aprRate - a.aprRate ||
        a.name.localeCompare(b.name)
      )
    }
    if (strategy === 'highest-balance') {
      return (
        b.balance - a.balance ||
        b.aprRate - a.aprRate ||
        a.name.localeCompare(b.name)
      )
    }
    return (
      b.aprRate - a.aprRate ||
      b.balance - a.balance ||
      a.name.localeCompare(b.name)
    )
  })
}

function debtPayoffPlan(
  debts: DebtPayoffInput[],
  monthlyBudget: number,
): Map<string, DebtPayoffProjection> {
  const maxMonths = 1200
  const epsilon = 0.005
  const states: DebtPayoffState[] = debts.map((debt) => ({
    ...debt,
    remaining: debt.balance,
    firstMonthPayment: 0,
    payoffMonths: null,
    interestEstimate: 0,
  }))

  for (let month = 1; month <= maxMonths; month += 1) {
    const activeBefore = states.filter((debt) => debt.remaining > epsilon)
    if (activeBefore.length === 0) break

    const startingBalance = sum(activeBefore.map((debt) => debt.remaining))
    for (const debt of activeBefore) {
      const interest = (debt.remaining * Math.max(0, debt.aprRate)) / 12
      debt.remaining += interest
      debt.interestEstimate += interest
    }

    let available = monthlyBudget
    for (const debt of states.filter((entry) => entry.remaining > epsilon)) {
      if (available <= epsilon) break
      available -= applyDebtPayment(
        debt,
        Math.min(debt.minimumPayment, available),
        month,
      )
    }

    while (available > epsilon) {
      const target = states.find((debt) => debt.remaining > epsilon)
      if (!target) break
      const paid = applyDebtPayment(target, available, month)
      available -= paid
      if (paid <= epsilon) break
    }

    const endingActive = states.filter((debt) => debt.remaining > epsilon)
    const endingBalance = sum(endingActive.map((debt) => debt.remaining))
    if (
      endingActive.length > 0 &&
      endingBalance >= startingBalance &&
      month > 1
    ) {
      break
    }
  }

  return new Map(
    states.map((debt) => [
      debt.id,
      {
        firstMonthPayment: debt.firstMonthPayment,
        payoffMonths: debt.payoffMonths,
        interestEstimate:
          debt.payoffMonths === null
            ? null
            : Math.max(0, debt.interestEstimate),
      },
    ]),
  )
}

function applyDebtPayment(
  debt: DebtPayoffState,
  requestedPayment: number,
  month: number,
): number {
  const payment = Math.min(Math.max(0, requestedPayment), debt.remaining)
  if (payment <= 0) return 0
  debt.remaining -= payment
  if (month === 1) debt.firstMonthPayment += payment
  if (debt.remaining <= 0.005) {
    debt.remaining = 0
    debt.payoffMonths = debt.payoffMonths ?? month
  }
  return payment
}

function debtPayoffTable(
  rows: FormulaTableValue['rows'],
  strategy: DebtPayoffStrategy,
  monthlyBudget: number,
): FormulaTableValue {
  return {
    type: 'table',
    columns: [
      { key: 'priority', label: 'Priority', kind: 'number' },
      { key: 'label', label: 'Debt', kind: 'string' },
      { key: 'balance', label: 'Balance', kind: 'number' },
      { key: 'apr', label: 'APR', kind: 'percent' },
      { key: 'minimumPayment', label: 'Minimum Payment', kind: 'number' },
      { key: 'monthlyPayment', label: 'Monthly Payment', kind: 'number' },
      { key: 'payoffMonths', label: 'Payoff Months', kind: 'number' },
      { key: 'interestEstimate', label: 'Interest Estimate', kind: 'number' },
      { key: 'nextPaymentDueDate', label: 'Next Due Date', kind: 'string' },
    ],
    rows: rows.map((row) => ({
      ...row,
      strategy,
      monthlyBudget,
    })),
  }
}

function evaluateFunctionCall(
  expression: MoneyFunctionCall,
  context: EvaluationContext,
): FormulaValue {
  const args = expression.args.map((arg) => evaluateExpression(arg, context))

  if (expression.name === 'Runway') {
    const cash = toNumber(args[0])
    const monthlyBurn = toNumber(args[1])
    return durationFromMonths(monthlyBurn <= 0 ? 99 * 12 : cash / monthlyBurn)
  }
  if (expression.name === 'SavingsRate') {
    const income = toNumber(args[0])
    const expenses = toNumber(args[1])
    return income <= 0 ? 0 : (income - expenses) / income
  }
  if (expression.name === 'ChangeVs') {
    const current = toNumber(args[0])
    const previous = toNumber(args[1])
    return previous === 0 ? 0 : (current - previous) / Math.abs(previous)
  }
  if (expression.name === 'DebtPayoff') {
    return debtPayoffValue(args[0], args[1], args[2])
  }
  if (expression.name === 'InterestDrag') {
    return interestDragValue(args[0], args[1])
  }
  if (expression.name === 'AllocationDrift') {
    return allocationDriftValue(args[0], args[1], context)
  }
  if (expression.name === 'TableChange') {
    return tableChangeValue(args[0], args[1])
  }
  if (expression.name === 'Aging') {
    return agingValue(args[0], args[1], context)
  }
  if (expression.name === 'CreditUtilization') {
    return creditUtilizationValue(args[0])
  }
  if (expression.name === 'Forecast') {
    return forecastValue(args[0], args[1], args[2])
  }
  if (expression.name === 'ForecastScenario') {
    return forecastScenarioValue(args[0], args[1], args[2], context)
  }
  if (expression.name === 'ContributionRoom') {
    return contributionRoomValue(args[0], args[1], args[2], args[3], context)
  }
  if (expression.name === 'FreedomAge') {
    return freedomAgeValue(args)
  }

  throw new Error(`Unsupported function: ${expression.name}`)
}

function buildRuntimeCollections(data: MoneyFormulaData): RuntimeCollection[] {
  const formulaData = normalizeFormulaData(data)
  const {
    accounts,
    transactions,
    debts,
    holdings,
    merchants,
    persons,
    recommendations,
    balanceSnapshots,
    extensionRegistry,
    allocationTargets: storedAllocationTargets,
    forecastScenarios,
    taxContributionLimits,
  } = formulaData
  const income = transactions.filter(
    (transaction) => transaction.direction === 'income',
  )
  const expenses = transactions.filter(
    (transaction) => transaction.direction === 'expense',
  )
  const cashFlowRows = cashFlowRuntimeRows(income, expenses)
  const transfers = transactions.filter(
    (transaction) => transaction.direction === 'transfer',
  )
  const liabilities = accounts.filter((account) => isLiabilityAccount(account))
  const assets = accounts.filter((account) => !isLiabilityAccount(account))
  const liquidAssets = assets.filter(isLiquidAssetAccount)
  const illiquidAssets = assets.filter(isIlliquidAssetAccount)
  const investmentAccounts = accounts.filter(isInvestmentAccount)
  const investments: RuntimeEntity[] =
    holdings.length > 0 ? holdings : investmentAccounts
  const cardAccounts = accounts.filter((account) => account.type === 'credit')
  const debt: RuntimeEntity[] = debtRuntimeRows(debts, liabilities)
  const anchorDate = formulaData.anchorDate
  const subscriptions = expenses.filter((transaction) =>
    isSubscriptionTransaction(transaction, anchorDate),
  )
  const warnings = recommendations.filter(
    (recommendation) => recommendation.kind === 'warning',
  )
  const opportunities = recommendations.filter(
    (recommendation) => recommendation.kind === 'opportunity',
  )
  const netWorthHistory = balanceSnapshots.filter(
    (snapshot) => snapshot.kind === 'netWorth',
  )
  const assetHistory = balanceSnapshots.filter(
    (snapshot) => snapshot.kind === 'assets',
  )
  const liabilityHistory = balanceSnapshots.filter(
    (snapshot) => snapshot.kind === 'liabilities',
  )
  const investmentHistory = balanceSnapshots.filter(
    (snapshot) => snapshot.kind === 'investment',
  )

  return [
    runtimeCollection('Transactions', 'Transactions', transactions),
    runtimeCollection('Accounts', 'Accounts', accounts),
    runtimeCollection('Assets', 'Assets', assets),
    runtimeCollection('LiquidAssets', 'Liquid Assets', liquidAssets),
    runtimeCollection('IlliquidAssets', 'Illiquid Assets', illiquidAssets),
    runtimeCollection('Liabilities', 'Liabilities', liabilities),
    runtimeCollection('Income', 'Income', income),
    runtimeCollection('Expenses', 'Expenses', expenses),
    runtimeCollection('CashFlow', 'Cash Flow', cashFlowRows),
    runtimeCollection('Transfers', 'Transfers', transfers),
    runtimeCollection('Investments', 'Investments', investments),
    runtimeCollection('CardAccounts', 'Card Accounts', cardAccounts),
    extensionRuntimeCollection(
      'Subscriptions',
      'Subscriptions',
      subscriptions,
      'subscription',
    ),
    runtimeCollection(
      'Cash',
      'Cash',
      accounts.filter((account) => account.type === 'cash'),
    ),
    runtimeCollection('Debt', 'Debt', debt),
    runtimeCollection(
      'TaxSheltered',
      'Tax Sheltered',
      investmentAccounts.filter(isTaxShelteredInvestmentAccount),
    ),
    runtimeCollection('Merchants', 'Merchants', merchants),
    runtimeCollection('Persons', 'Persons', persons),
    runtimeCollection('ReviewActions', 'Review Actions', recommendations),
    runtimeCollection('Warnings', 'Warnings', warnings),
    runtimeCollection('Opportunities', 'Opportunities', opportunities),
    runtimeCollection(
      'BalanceSnapshots',
      'Balance Snapshots',
      balanceSnapshots,
    ),
    runtimeCollection('NetWorthHistory', 'Net Worth History', netWorthHistory),
    runtimeCollection('AssetHistory', 'Asset History', assetHistory),
    runtimeCollection(
      'LiabilityHistory',
      'Liability History',
      liabilityHistory,
    ),
    runtimeCollection(
      'InvestmentHistory',
      'Investment History',
      investmentHistory,
    ),
    ...buildExtensionRuntimeCollections(
      {
        accounts,
        transactions,
        debts,
        holdings,
        merchants,
        persons,
        recommendations,
        balanceSnapshots,
        allocationTargets: storedAllocationTargets,
        forecastScenarios,
        taxContributionLimits,
        anchorDate: formulaData.anchorDate,
      },
      extensionRegistry,
    ),
  ]
}

function debtRuntimeRows(
  debts: MoneyDebt[],
  liabilities: MoneyAccount[],
): RuntimeEntity[] {
  if (debts.length === 0) return liabilities

  const debtsByAccountId = new Map(
    debts
      .filter((debt) => debt.accountId)
      .map((debt) => [debt.accountId as string, debt]),
  )
  const coveredDebtIds = new Set<string>()
  const rows: RuntimeEntity[] = liabilities.map((account) => {
    const debt = debtsByAccountId.get(account.id)
    if (!debt) return account
    coveredDebtIds.add(debt.id)
    return debt
  })

  for (const debt of debts) {
    if (!coveredDebtIds.has(debt.id)) rows.push(debt)
  }

  return rows
}

function runtimeCollection(
  id: string,
  label: string,
  rows: RuntimeEntity[],
): RuntimeCollection {
  return { id, label, rows, anchorDate: collectionRowsAnchorDate(rows) }
}

function extensionRuntimeCollection(
  id: string,
  label: string,
  rows: RuntimeEntity[],
  extensionNamespace: string,
): RuntimeCollection {
  return {
    id,
    label,
    rows,
    anchorDate: collectionRowsAnchorDate(rows),
    extensionNamespace,
  }
}

function buildExtensionCollectionMetrics(
  data: NormalizedFormulaData,
  registry?: MoneyExtensionRegistry,
): CollectionMetric[] {
  return extensionCollectionSpecs(registry).map((collection) => {
    const runtime = extensionRuntimeCollection(
      collection.id,
      collection.label,
      extensionRows(data, collection.entity, collection.namespace),
      collection.namespace,
    )
    return {
      id: collection.id,
      label: collection.label,
      value: sumCollection(runtime),
      count: runtime.rows.length,
    }
  })
}

function buildExtensionRuntimeCollections(
  data: NormalizedFormulaData,
  registry?: MoneyExtensionRegistry,
): RuntimeCollection[] {
  return extensionCollectionSpecs(registry).map((collection) =>
    extensionRuntimeCollection(
      collection.id,
      collection.label,
      extensionRows(data, collection.entity, collection.namespace),
      collection.namespace,
    ),
  )
}

function extensionRows(
  data: NormalizedFormulaData,
  entity: ExtensionCollectionSpec['entity'],
  namespace: string,
): RuntimeEntity[] {
  const rows =
    entity === 'account'
      ? data.accounts
      : entity === 'debt'
        ? data.debts
        : entity === 'holding'
          ? data.holdings
          : entity === 'merchant'
            ? data.merchants
            : entity === 'person'
              ? data.persons
              : data.transactions

  return rows.filter((row) => {
    const values = runtimeExtensions(row)[namespace]
    if (!values || Object.keys(values).length === 0) return false
    if (namespace === 'subscription' || namespace === 'recurringObligation') {
      return recurringExtensionState(values, data.anchorDate) === true
    }
    return true
  })
}

function extensionCollectionSpecs(
  registry?: MoneyExtensionRegistry,
): ExtensionCollectionSpec[] {
  const specs = new Map<string, ExtensionCollectionSpec>()
  for (const collection of DEFAULT_EXTENSION_COLLECTIONS) {
    specs.set(collection.id, {
      id: collection.id,
      label: collection.label,
      namespace: collection.namespace,
      entity: 'transaction',
    })
  }

  for (const extension of registry?.extensions ?? []) {
    if (!isFormulaBackedExtensionEntity(extension.entity)) continue
    for (const collection of extension.derivedCollections ?? []) {
      if (!isFormulaBackedExtensionEntity(collection.entity)) continue
      specs.set(collection.id, {
        id: collection.id,
        label: collection.name,
        namespace: extension.namespace,
        entity: collection.entity,
      })
    }
  }

  return [...specs.values()].sort((a, b) => a.id.localeCompare(b.id))
}

function isFormulaBackedExtensionEntity(
  entity: string,
): entity is ExtensionCollectionSpec['entity'] {
  return (
    entity === 'account' ||
    entity === 'transaction' ||
    entity === 'debt' ||
    entity === 'holding' ||
    entity === 'merchant' ||
    entity === 'person'
  )
}

function sumCollection(collection: RuntimeCollection): number {
  if (collection.fallbackValue !== undefined) return collection.fallbackValue
  if (isBalanceHistoryCollection(collection)) {
    return latestSnapshotValue(collection.rows.filter(isMoneyBalanceSnapshot))
  }
  return sum(collection.rows.map((row) => rowMeasure(collection, row)))
}

function latestSnapshotValue(snapshots: MoneyBalanceSnapshot[]): number {
  const latest = [...snapshots].sort(
    (a, b) => b.date.localeCompare(a.date) || b.asOf.localeCompare(a.asOf),
  )[0]
  return latest?.value ?? 0
}

function averageCollection(collection: RuntimeCollection): number {
  const count = collection.fallbackCount ?? collection.rows.length
  return count === 0 ? 0 : sumCollection(collection) / count
}

function minMaxCollection(
  collection: RuntimeCollection,
  mode: 'min' | 'max',
): number {
  if (collection.fallbackValue !== undefined) return collection.fallbackValue
  const values = collection.rows.map((row) => rowMeasure(collection, row))
  if (values.length === 0) return 0
  return mode === 'min' ? Math.min(...values) : Math.max(...values)
}

function periodCollection(
  collection: RuntimeCollection,
  period: PeriodUnit,
): RuntimeCollection {
  return { ...collection, period }
}

function periodAverage(
  collection: RuntimeCollection,
  requestedPeriods?: number,
): number {
  if (collection.rows.length === 0) return sumCollection(collection)
  const period = collection.period ?? 'month'
  const observedPeriods = new Set(
    collection.rows.map((row) => rowPeriodKey(row, period)),
  )
  const observedCount = observedPeriods.size || 1
  const divisor =
    requestedPeriods && requestedPeriods > 0
      ? Math.min(requestedPeriods, observedCount)
      : observedCount
  return divisor === 0 ? 0 : sumCollection(collection) / divisor
}

function calendarWindow(
  collection: RuntimeCollection,
  window: 'this-month' | 'last-month' | 'ytd' | 'this-year' | 'last-year',
  context: EvaluationContext,
): RuntimeCollection {
  const anchor = context.anchorDate ?? collectionAnchorDate(collection)
  if (!anchor) return emptyRuntimeCollection(collection)

  if (window === 'this-month' || window === 'last-month') {
    const offset = window === 'last-month' ? -1 : 0
    const start = new Date(
      Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + offset, 1),
    )
    const end = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
    )
    return filterCollectionByDateRange(collection, start, end, 'month')
  }

  if (window === 'ytd') {
    const start = new Date(Date.UTC(anchor.getUTCFullYear(), 0, 1))
    const end = new Date(anchor)
    end.setUTCDate(end.getUTCDate() + 1)
    return filterCollectionByDateRange(collection, start, end, 'duration')
  }

  const year = anchor.getUTCFullYear() + (window === 'last-year' ? -1 : 0)
  const start = new Date(Date.UTC(year, 0, 1))
  const end = new Date(Date.UTC(year + 1, 0, 1))
  return filterCollectionByDateRange(collection, start, end, 'year')
}

function betweenWindow(
  collection: RuntimeCollection,
  method: MoneyMethodCall,
  context: EvaluationContext,
): RuntimeCollection {
  const startValue = method.args[0]
    ? evaluateExpression(method.args[0], context)
    : undefined
  const endValue = method.args[1]
    ? evaluateExpression(method.args[1], context)
    : undefined
  const start = dateFromFormulaValue(startValue)
  const end = dateFromFormulaValue(endValue)
  if (!start || !end) return emptyRuntimeCollection(collection)

  const [startInclusive, endInclusive] =
    start.getTime() <= end.getTime() ? [start, end] : [end, start]
  const endExclusive = new Date(endInclusive)
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1)
  return filterCollectionByDateRange(
    collection,
    startInclusive,
    endExclusive,
    'duration',
  )
}

function rollingWindow(
  collection: RuntimeCollection,
  duration: FormulaValue,
  context: EvaluationContext,
): RuntimeCollection {
  const anchor = context.anchorDate ?? collectionAnchorDate(collection)
  if (!anchor) return emptyRuntimeCollection(collection)
  const days = Math.max(
    1,
    isFormulaDurationValue(duration) ? duration.days : toNumber(duration),
  )
  const start = new Date(anchor)
  start.setUTCDate(start.getUTCDate() - days + 1)
  const end = new Date(anchor)
  end.setUTCDate(end.getUTCDate() + 1)
  return filterCollectionByDateRange(collection, start, end, 'duration')
}

function previousPeriodWindow(
  collection: RuntimeCollection,
): RuntimeCollection {
  if (!collection.window) return emptyRuntimeCollection(collection)

  const { startInclusive, endExclusive, shift } = collection.window
  const sourceCollection = {
    ...collection,
    rows: collection.windowSourceRows ?? collection.rows,
  }
  if (shift === 'month') {
    const previousStart = new Date(
      Date.UTC(
        startInclusive.getUTCFullYear(),
        startInclusive.getUTCMonth() - 1,
        1,
      ),
    )
    return filterCollectionByDateRange(
      sourceCollection,
      previousStart,
      startInclusive,
      'month',
    )
  }

  if (shift === 'year') {
    const previousStart = new Date(
      Date.UTC(startInclusive.getUTCFullYear() - 1, 0, 1),
    )
    return filterCollectionByDateRange(
      sourceCollection,
      previousStart,
      startInclusive,
      'year',
    )
  }

  const durationMs = Math.max(
    1,
    endExclusive.getTime() - startInclusive.getTime(),
  )
  const previousStart = new Date(startInclusive.getTime() - durationMs)
  return filterCollectionByDateRange(
    sourceCollection,
    previousStart,
    startInclusive,
    'duration',
  )
}

function dueSoonWindow(
  collection: RuntimeCollection,
  method: MoneyMethodCall,
  context: EvaluationContext,
): RuntimeCollection {
  const anchor = context.anchorDate ?? collectionAnchorDate(collection)
  if (!anchor) return emptyRuntimeCollection(collection)
  const duration = method.args[0]
    ? evaluateExpression(method.args[0], context)
    : durationValue('30d')
  const days = Math.max(
    1,
    isFormulaDurationValue(duration) ? duration.days : toNumber(duration),
  )
  const start = new Date(anchor)
  const end = new Date(anchor)
  end.setUTCDate(end.getUTCDate() + days + 1)
  return {
    ...collection,
    rows: collection.rows.filter((row) => {
      const dueDate = rowDueDate(row, collection)
      return Boolean(dueDate && dueDate >= start && dueDate < end)
    }),
    fallbackCount: undefined,
    fallbackValue: undefined,
  }
}

function filterCollectionByDateRange(
  collection: RuntimeCollection,
  startInclusive: Date,
  endExclusive: Date,
  shift: CollectionWindow['shift'] = 'duration',
): RuntimeCollection {
  const sourceRows = collection.windowSourceRows ?? collection.rows
  return {
    ...collection,
    rows: sourceRows.filter((row) => {
      const date = rowDate(row)
      return Boolean(date && date >= startInclusive && date < endExclusive)
    }),
    window: {
      startInclusive,
      endExclusive,
      shift,
    },
    windowSourceRows: sourceRows,
    fallbackCount: undefined,
    fallbackValue: undefined,
  }
}

function emptyRuntimeCollection(
  collection: RuntimeCollection,
): RuntimeCollection {
  return {
    ...collection,
    rows: [],
    fallbackCount: undefined,
    fallbackValue: undefined,
  }
}

function sortCollection(
  collection: RuntimeCollection,
  method: MoneyMethodCall,
  context: EvaluationContext,
): RuntimeCollection {
  const firstArg = method.args[0]
  const secondArg = method.args[1]
  const firstValue = firstArg ? evaluateExpression(firstArg, context) : 'desc'
  const secondValue = secondArg
    ? evaluateExpression(secondArg, context)
    : undefined
  const direction =
    String(secondValue ?? firstValue).toLowerCase() === 'asc' ? 'asc' : 'desc'
  const field =
    typeof firstValue === 'string' && !['asc', 'desc'].includes(firstValue)
      ? firstValue
      : undefined
  const rows = [...collection.rows].sort((a, b) => {
    const aValue = field
      ? fieldValue(a, field, collection)
      : rowMeasure(collection, a)
    const bValue = field
      ? fieldValue(b, field, collection)
      : rowMeasure(collection, b)
    const comparison = compareValues(aValue, bValue)
    return direction === 'asc' ? comparison : -comparison
  })
  return {
    ...collection,
    rows,
    fallbackCount: undefined,
    fallbackValue: undefined,
  }
}

function limitCollection(
  collection: RuntimeCollection,
  method: MoneyMethodCall,
  context: EvaluationContext,
  mode: 'top' | 'bottom',
): RuntimeCollection {
  const limit = Math.max(
    0,
    Math.floor(
      toNumber(
        method.args[0] ? evaluateExpression(method.args[0], context) : 5,
      ),
    ),
  )
  const sortField = method.args[1]
    ? String(evaluateExpression(method.args[1], context))
    : undefined
  const sorted = sortCollection(
    collection,
    {
      name: 'Sort',
      args: sortField ? method.args.slice(1, 2) : [],
    },
    context,
  )
  return {
    ...collection,
    rows: (mode === 'top' ? sorted.rows : sorted.rows.reverse()).slice(
      0,
      limit,
    ),
    fallbackCount: undefined,
    fallbackValue: undefined,
  }
}

function uniqueCollection(
  collection: RuntimeCollection,
  method: MoneyMethodCall,
  context: EvaluationContext,
): RuntimeCollection {
  const field = method.args[0]
    ? String(evaluateExpression(method.args[0], context))
    : 'id'
  const seen = new Set<string>()
  const rows: RuntimeEntity[] = []
  for (const row of collection.rows) {
    const value = fieldValue(row, field, collection)
    const key = String(value || row.id).toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    rows.push(row)
  }
  return {
    ...collection,
    rows,
    fallbackCount: undefined,
    fallbackValue: undefined,
  }
}

function limitCollectionByOffset(
  collection: RuntimeCollection,
  method: MoneyMethodCall,
  context: EvaluationContext,
): RuntimeCollection {
  const limit = Math.max(
    0,
    Math.floor(
      toNumber(
        method.args[0] ? evaluateExpression(method.args[0], context) : 100,
      ),
    ),
  )
  const offset = Math.max(
    0,
    Math.floor(
      toNumber(
        method.args[1] ? evaluateExpression(method.args[1], context) : 0,
      ),
    ),
  )
  return {
    ...collection,
    rows: collection.rows.slice(offset, offset + limit),
    fallbackCount: undefined,
    fallbackValue: undefined,
  }
}

function offsetCollection(
  collection: RuntimeCollection,
  method: MoneyMethodCall,
  context: EvaluationContext,
): RuntimeCollection {
  const offset = Math.max(
    0,
    Math.floor(
      toNumber(
        method.args[0] ? evaluateExpression(method.args[0], context) : 0,
      ),
    ),
  )
  return {
    ...collection,
    rows: collection.rows.slice(offset),
    fallbackCount: undefined,
    fallbackValue: undefined,
  }
}

function minMaxBy(
  collection: RuntimeCollection,
  method: MoneyMethodCall,
  context: EvaluationContext,
  mode: 'min' | 'max',
): number {
  const field = method.args[0]
    ? String(evaluateExpression(method.args[0], context))
    : ''
  if (!field || collection.rows.length === 0) return 0
  const values = collection.rows.map((row) =>
    toNumber(fieldValue(row, field, collection)),
  )
  return mode === 'min' ? Math.min(...values) : Math.max(...values)
}

function groupCollection(
  collection: RuntimeCollection,
  method: MoneyMethodCall,
  context: EvaluationContext,
): FormulaTableValue {
  const field = method.args[0]
    ? String(evaluateExpression(method.args[0], context))
    : 'category'
  const groups = new Map<
    string,
    { value: number; count: number; label: string }
  >()

  for (const row of collection.rows) {
    const rawKey = fieldValue(row, field, collection)
    const key = String(rawKey || 'Uncategorized')
    const label = groupLabelForField(row, field, key, collection)
    const existing = groups.get(key) ?? { value: 0, count: 0, label }
    existing.value += rowMeasure(collection, row)
    existing.count += 1
    if (existing.label === key && label !== key) existing.label = label
    groups.set(key, existing)
  }

  const rows = [...groups.entries()]
    .map(([key, group]) => ({
      key,
      label: group.label,
      value: group.value,
      count: group.count,
    }))
    .sort((a, b) => b.value - a.value)

  return {
    type: 'table',
    columns: [
      { key: 'label', label: titleFromField(field), kind: 'string' },
      { key: 'value', label: 'Value', kind: 'number' },
      { key: 'count', label: 'Count', kind: 'number' },
    ],
    rows,
  }
}

function groupLabelForField(
  row: RuntimeEntity,
  field: string,
  key: string,
  collection: RuntimeCollection,
): string {
  if (key === 'Uncategorized') return key
  if (isMoneyTransaction(row)) {
    if (
      field === 'merchantId' ||
      field === 'merchantName' ||
      field === 'merchant'
    ) {
      return transactionMerchantName(row)
    }
    if (
      field === 'category' ||
      field === 'providerCategoryPrimary' ||
      field === 'providerCategoryDetailed'
    ) {
      return humanizeCategoryKey(key)
    }
    if (field === 'transferReason') return humanizeEnumLabel(key)
  }
  if (
    [
      'direction',
      'assetClass',
      'taxTreatment',
      'investmentAccountKind',
      'liquidity',
      'liquidityClass',
      'type',
      'subtype',
      'status',
      'severity',
      'kind',
      'role',
    ].includes(field)
  ) {
    return humanizeEnumLabel(key)
  }
  if (collection.extensionNamespace && /^[a-z0-9_-]+$/i.test(key)) {
    return humanizeEnumLabel(key)
  }
  return key
}

function humanizeCategoryKey(key: string): string {
  const parts = key
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (!isMachineCategoryKey(parts)) return key
  if (parts.length === 0) return 'Uncategorized'
  const primary = parts[0] ?? ''
  const detailed = parts[parts.length - 1] ?? primary
  const prefix = `${primary}_`
  const useful = detailed.startsWith(prefix)
    ? detailed.slice(prefix.length)
    : detailed
  return humanizeEnumLabel(useful || primary)
}

function isMachineCategoryKey(parts: string[]): boolean {
  return (
    parts.length > 0 &&
    parts.every((part) => /^[A-Z0-9_]+$/.test(part)) &&
    parts.some((part) => part.includes('_') || part === part.toUpperCase())
  )
}

function humanizeEnumLabel(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word, index) => {
      const lower = word.toLowerCase()
      if (index > 0 && ['and', 'or', 'of', 'the', 'to'].includes(lower)) {
        return lower
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

function trendCollection(collection: RuntimeCollection): FormulaSeriesValue {
  if (isSnapshotCollection(collection))
    return snapshotTrendCollection(collection)
  const points = new Map<string, { value: number; count: number }>()
  const period = collection.period ?? 'month'

  for (const row of collection.rows) {
    const key = rowPeriodKey(row, period)
    const existing = points.get(key) ?? { value: 0, count: 0 }
    existing.value += rowMeasure(collection, row)
    existing.count += 1
    points.set(key, existing)
  }

  return {
    type: 'series',
    points: [...points.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, point]) => ({
        key,
        label: key,
        value: point.value,
        count: point.count,
        startDate: periodStartDate(key, period),
      })),
  }
}

function snapshotTrendCollection(
  collection: RuntimeCollection,
): FormulaSeriesValue {
  const points = new Map<
    string,
    { value: number; count: number; latestDate: string; latestAsOf: string }
  >()
  const period = collection.period ?? 'month'

  for (const row of collection.rows) {
    if (!isMoneyBalanceSnapshot(row)) continue
    const key = rowPeriodKey(row, period)
    const existing = points.get(key)
    const latestDate = row.date
    const latestAsOf = row.asOf
    if (
      !existing ||
      latestDate > existing.latestDate ||
      (latestDate === existing.latestDate && latestAsOf > existing.latestAsOf)
    ) {
      points.set(key, {
        value: row.value,
        count: (existing?.count ?? 0) + 1,
        latestDate,
        latestAsOf,
      })
    } else {
      points.set(key, { ...existing, count: existing.count + 1 })
    }
  }

  return {
    type: 'series',
    points: [...points.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, point]) => ({
        key,
        label: key,
        value: point.value,
        count: point.count,
        startDate: periodStartDate(key, period),
        endDate: point.latestDate,
      })),
  }
}

function isSnapshotCollection(collection: RuntimeCollection): boolean {
  return collection.rows.some(isMoneyBalanceSnapshot)
}

function isBalanceHistoryCollection(collection: RuntimeCollection): boolean {
  return [
    'NetWorthHistory',
    'AssetHistory',
    'LiabilityHistory',
    'InvestmentHistory',
  ].includes(collection.id)
}

function rowMeasure(collection: RuntimeCollection, row: RuntimeEntity): number {
  const baseValue = baseRowMeasure(collection, row)
  const extensionMeasure = collection.extensionNamespace
    ? extensionNumericMeasure(row, collection.extensionNamespace, baseValue)
    : undefined
  if (extensionMeasure !== undefined) return extensionMeasure

  if (
    collection.id === 'Liabilities' ||
    collection.id === 'Debt' ||
    collection.id === 'CardAccounts'
  ) {
    return Math.abs(baseValue)
  }
  return baseValue
}

function baseRowMeasure(
  collection: RuntimeCollection,
  row: RuntimeEntity,
): number {
  if (isMoneyTransaction(row)) {
    if (collection.id === 'CashFlow') return row.valueForSum ?? row.amount
    return row.valueForSum ?? row.amount
  }
  if (isMoneyDebt(row)) {
    return row.balance
  }
  if (isMoneyHolding(row)) {
    return row.marketValue
  }
  if (isMoneyMerchant(row)) {
    return row.expenses
  }
  if (isMoneyPerson(row)) {
    return row.amountOwedToMe - row.amountIOwe
  }
  if (isMoneyRecommendation(row)) {
    return row.estimatedImpact ?? 0
  }
  if (isMoneyBalanceSnapshot(row)) {
    return row.value
  }
  const value = row.valueForSum ?? row.currentBalance
  return value
}

function extensionNumericMeasure(
  row: RuntimeEntity,
  namespace: string,
  baseValue: number,
): number | undefined {
  const values = runtimeExtensions(row)[namespace]
  if (!values) return undefined
  const candidates = [
    values.reportingValue,
    values.amount,
    values.monthlyAmount,
    values.estimatedImpact,
    values.feeAmount,
    values.sourceAmount,
    values.targetAmount,
  ]
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return Math.abs(candidate)
    }
  }
  if (typeof values.percent === 'number' && Number.isFinite(values.percent)) {
    return Math.abs(baseValue) * values.percent
  }
  return undefined
}

function rowPeriodKey(row: RuntimeEntity, period: PeriodUnit): string {
  const date = rowDate(row)
  if (!date) return 'unknown'
  if (period === 'day') return isoDate(date)
  if (period === 'week') return isoWeekKey(date)
  if (period === 'year') return String(date.getUTCFullYear())
  return isoDate(date).slice(0, 7)
}

function rowDate(row: RuntimeEntity): Date | null {
  const raw = rowDateString(row)
  if (!/^\d{4}-\d{2}-\d{2}/.test(raw)) return null
  const parsed = new Date(`${raw.slice(0, 10)}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) ? parsed : null
}

function rowDateString(row: RuntimeEntity): string {
  if (isMoneyTransaction(row)) return row.date
  if (isMoneyDebt(row)) return row.updatedAt
  if (isMoneyMerchant(row)) return row.lastTransactionDate ?? row.updatedAt
  if (isMoneyPerson(row)) return row.lastActivityDate ?? row.updatedAt
  if (isMoneyRecommendation(row)) return row.updatedAt
  if (isMoneyBalanceSnapshot(row)) return row.date
  return row.asOf
}

function rowDueDate(
  row: RuntimeEntity,
  collection: RuntimeCollection,
  field = 'nextDueDate',
): Date | null {
  const value = fieldValue(row, field, collection)
  if (isFormulaDateValue(value)) {
    const millis = Date.parse(`${value.isoDate.slice(0, 10)}T00:00:00Z`)
    return Number.isFinite(millis) ? new Date(millis) : null
  }
  if (typeof value !== 'string') return null
  const millis = Date.parse(`${value.slice(0, 10)}T00:00:00Z`)
  return Number.isFinite(millis) ? new Date(millis) : null
}

function collectionAnchorDate(collection: RuntimeCollection): Date | null {
  if (collection.anchorDate !== undefined) return collection.anchorDate
  return collectionRowsAnchorDate(collection.rows)
}

function collectionRowsAnchorDate(rows: RuntimeEntity[]): Date | null {
  const dates = rows
    .map(rowDate)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())
  return dates[0] ?? null
}

function dataAnchorDate(data: MoneyFormulaData): Date | undefined {
  return normalizeFormulaData(data).anchorDate
}

function latestRuntimeAnchorDate(rows: RuntimeEntity[]): Date | undefined {
  const dates = rows
    .map(rowDate)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())
  return dates[0]
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function isoWeekKey(date: Date): string {
  const current = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
  const day = current.getUTCDay() || 7
  current.setUTCDate(current.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(current.getUTCFullYear(), 0, 1))
  const week = Math.ceil(
    ((current.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  )
  return `${current.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function periodStartDate(key: string, period: PeriodUnit): string {
  if (period === 'day') return key
  if (period === 'month') return `${key}-01`
  if (period === 'year') return `${key}-01-01`
  const match = key.match(/^(\d{4})-W(\d{2})$/)
  if (!match) return key
  const year = Number(match[1])
  const week = Number(match[2])
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week - 1) * 7)
  return isoDate(monday)
}

function fieldValue(
  row: RuntimeEntity,
  field: string,
  collection?: RuntimeCollection,
): FormulaValue {
  if (field === 'currency') {
    if (isMoneyTransaction(row))
      return row.currencyCode ?? row.isoCurrencyCode ?? ''
    if (isMoneyAccount(row))
      return row.currencyCode ?? row.isoCurrencyCode ?? ''
    if (isMoneyDebt(row)) return row.currencyCode ?? ''
    if (isMoneyHolding(row)) return row.currencyCode ?? ''
    if (isMoneyBalanceSnapshot(row)) return row.currencyCode ?? ''
  }
  if (field === 'balance' && isMoneyDebt(row)) return Math.abs(row.balance)
  if (field === 'creditLimit' && isMoneyDebt(row)) return row.creditLimit ?? 0
  if (field === 'availableCredit' && isMoneyDebt(row))
    return row.availableCredit ?? 0
  if (field === 'statementBalance' && isMoneyDebt(row))
    return row.statementBalance ?? 0
  if (field === 'utilization' && isMoneyDebt(row)) return row.utilization ?? 0
  if (field === 'marketValue' && isMoneyHolding(row)) return row.marketValue
  if (field === 'quantity' && isMoneyHolding(row)) return row.quantity
  if (field === 'price' && isMoneyHolding(row)) return row.price
  if (field === 'accountSubtype' && isMoneyHolding(row))
    return row.accountSubtype ?? ''
  if (field === 'accountName' && isMoneyHolding(row))
    return row.accountName ?? ''
  if (field === 'investmentAccountKind' && isMoneyHolding(row)) {
    return row.investmentAccountKind ?? ''
  }
  if (field === 'taxTreatment' && isMoneyHolding(row))
    return row.taxTreatment ?? ''
  if (field === 'amount' && isMoneyMerchant(row)) return row.expenses
  if (field === 'amount' && isMoneyPerson(row))
    return row.amountOwedToMe - row.amountIOwe
  if (isMoneyRecommendation(row)) {
    if (field === 'amount' || field === 'estimatedImpact')
      return row.estimatedImpact ?? 0
    if (field === 'kind') return row.kind
    if (field === 'status') return row.status
    if (field === 'severity') return row.severity
    if (field === 'title') return row.title
    if (field === 'reason') return row.reason ?? ''
    if (field === 'source') return row.source
    if (field === 'confidence') return row.confidence ?? 0
    if (field === 'scenarioId') return row.scenarioId ?? ''
    if (field === 'sourceEntity') return row.sourceLinks[0]?.entity ?? ''
    if (field === 'sourceEntityId') return row.sourceLinks[0]?.entityId ?? ''
    if (field === 'createdAt') return row.createdAt
    if (field === 'updatedAt') return row.updatedAt
  }
  if (isMoneyBalanceSnapshot(row)) {
    if (field === 'amount' || field === 'value' || field === 'balance')
      return row.value
    if (field === 'kind') return row.kind
    if (field === 'date') return row.date
    if (field === 'asOf') return row.asOf
    if (field === 'source') return row.source
    if (field === 'accountId') return row.accountId ?? ''
    if (field === 'holdingId') return row.holdingId ?? ''
    if (field === 'itemId') return row.itemId ?? ''
    if (field === 'institutionName') return row.institutionName ?? ''
    if (field === 'name') return row.name ?? ''
    if (field === 'accountType') return row.accountType ?? ''
    if (field === 'accountSubtype') return row.accountSubtype ?? ''
    if (field === 'assetClass') return row.assetClass ?? ''
    if (field === 'createdAt') return row.createdAt
  }
  if (field === 'balance' && isMoneyAccount(row)) {
    return Math.abs(row.valueForSum ?? row.currentBalance)
  }
  if (field === 'creditLimit' && isMoneyAccount(row))
    return row.creditLimit ?? row.balance?.limit ?? 0
  if (field === 'availableCredit' && isMoneyAccount(row))
    return row.availableCredit ?? 0
  if (field === 'utilization' && isMoneyAccount(row))
    return row.utilization ?? 0
  if (field === 'investmentAccountKind' && isMoneyAccount(row)) {
    return row.investmentAccountKind ?? ''
  }
  if (field === 'taxTreatment' && isMoneyAccount(row))
    return row.taxTreatment ?? ''
  if (field === 'liquidity' && isMoneyAccount(row)) return row.liquidity ?? ''
  if (field === 'liquidityClass' && isMoneyAccount(row))
    return row.liquidityClass ?? ''
  if (field === 'liquidityTier' && isMoneyAccount(row))
    return row.liquidityTier ?? 99
  if (field === 'contributionLimitAnnual' && isMoneyAccount(row)) {
    return row.contributionLimitAnnual ?? 0
  }
  if (field === 'contributionLimitYear' && isMoneyAccount(row)) {
    return row.contributionLimitYear ?? 0
  }
  if (field === 'amount' && isMoneyTransaction(row))
    return row.valueForSum ?? row.amount
  if (field === 'merchant' && isMoneyTransaction(row)) {
    return transactionMerchantName(row)
  }
  if (field === 'merchantId' && isMoneyTransaction(row)) {
    return transactionMerchantId(row)
  }
  if (field === 'merchantName' && isMoneyTransaction(row)) {
    return transactionMerchantName(row)
  }
  if (field === 'subscriptionKey' && isMoneyTransaction(row)) {
    return row.extensions?.subscription?.key ?? transactionMerchantId(row)
  }
  if (field === 'category' && isMoneyTransaction(row)) {
    return row.userCategory ?? row.category.join(' ')
  }
  if (isMoneyTransaction(row)) {
    const extensionValue = transactionExtensionFieldValue(
      row,
      field,
      collection?.extensionNamespace,
      collection ? (collectionAnchorDate(collection) ?? undefined) : undefined,
    )
    if (extensionValue !== undefined) return extensionValue
  }
  const extensionValue = extensionFieldValue(
    row,
    field,
    collection?.extensionNamespace,
  )
  if (extensionValue !== undefined) return extensionValue
  const record = row as unknown as Record<string, unknown>
  const value = record[field]
  if (
    typeof value === 'number' ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value
  }
  if (Array.isArray(value)) return value.join(' ')
  return ''
}

function normalizeMerchantEntityId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function transactionMerchantId(transaction: MoneyTransaction): string {
  const group = transaction.extensions?.merchantGroup
  const groupId = group?.status === 'dismissed' ? undefined : group?.merchantId
  if (typeof groupId === 'string' && groupId.trim()) {
    return normalizeMerchantEntityId(groupId)
  }
  return normalizeMerchantEntityId(transaction.merchantName ?? transaction.name)
}

function transactionMerchantName(transaction: MoneyTransaction): string {
  const group = transaction.extensions?.merchantGroup
  const groupName = group?.status === 'dismissed' ? undefined : group?.name
  if (typeof groupName === 'string' && groupName.trim()) return groupName.trim()
  return transaction.merchantName ?? transaction.name
}

function transactionExtensionFieldValue(
  transaction: MoneyTransaction,
  field: string,
  extensionNamespace?: string,
  anchorDate?: Date,
): FormulaValue | undefined {
  const extensions = runtimeExtensions(transaction)
  if (extensionNamespace) {
    const value = extensions[extensionNamespace]?.[field]
    if (value !== undefined && value !== null) return value
  }
  if (field === 'subscription') {
    return isSubscriptionTransaction(transaction, anchorDate)
  }
  if (field === 'recurringObligation') {
    return isRecurringObligationTransaction(transaction, anchorDate)
  }
  if (field === 'cadence') {
    return primitiveFormulaValue(
      extensions.subscription?.cadence ??
        extensions.recurringObligation?.cadence,
    )
  }
  if (field === 'need') {
    return primitiveFormulaValue(
      extensions.budget?.need ??
        extensions.subscription?.need ??
        extensions.recurringObligation?.need,
    )
  }
  if (field === 'recurringStatus') {
    return primitiveFormulaValue(
      extensions.subscription?.status ?? extensions.recurringObligation?.status,
    )
  }
  if (field === 'recurringConfidence') {
    return primitiveFormulaValue(
      extensions.subscription?.confidence ??
        extensions.recurringObligation?.confidence,
    )
  }
  if (field === 'joy')
    return primitiveFormulaValue(extensions.joyReview?.rating)
  if (field === 'sharedStatus') {
    return primitiveFormulaValue(extensions.sharedExpense?.status)
  }
  if (field === 'moneyFlowId') {
    return primitiveFormulaValue(extensions.moneyFlow?.flowId)
  }
  if (field === 'moneyFlowRole') {
    return primitiveFormulaValue(extensions.moneyFlow?.role)
  }
  if (field === 'taxContribution') {
    return primitiveFormulaValue(extensions.taxContribution?.type)
  }
  if (field === 'taxContributionSource') {
    return primitiveFormulaValue(extensions.taxContribution?.contributionSource)
  }
  if (field === 'reviewActionStatus') {
    return primitiveFormulaValue(extensions.reviewAction?.status)
  }
  if (field === 'reviewActionType') {
    return primitiveFormulaValue(extensions.reviewAction?.type)
  }
  if (field === 'recommendationSeverity') {
    return primitiveFormulaValue(extensions.reviewAction?.severity)
  }
  if (field === 'estimatedImpact') {
    return primitiveFormulaValue(extensions.reviewAction?.estimatedImpact)
  }
  if (field === 'scenarioId') {
    return primitiveFormulaValue(extensions.reviewAction?.scenarioId)
  }
  if (field.includes('_')) {
    const [namespace, key] = field.split(/_(.*)/s)
    const value = key ? extensions[namespace]?.[key] : undefined
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function extensionFieldValue(
  row: RuntimeEntity,
  field: string,
  extensionNamespace?: string,
): FormulaValue | undefined {
  const extensions = runtimeExtensions(row)
  if (extensionNamespace) {
    const value = extensions[extensionNamespace]?.[field]
    if (value !== undefined && value !== null) return value
  }
  if (field.includes('_')) {
    const [namespace, key] = field.split(/_(.*)/s)
    const value = key ? extensions[namespace]?.[key] : undefined
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function runtimeExtensions(
  row: unknown,
): Record<string, Record<string, MoneyExtensionPrimitive>> {
  return (
    (
      row as {
        extensions?: Record<string, Record<string, MoneyExtensionPrimitive>>
      }
    ).extensions ?? {}
  )
}

function primitiveFormulaValue(
  value: string | number | boolean | null | undefined,
): FormulaValue | undefined {
  return value === null ? undefined : value
}

function serializeFormulaValue(value: FormulaValue): FormulaResultValue {
  if (isRuntimeCollection(value)) return entityListValue(value)
  return value
}

function entityListValue(
  collection: RuntimeCollection,
): FormulaEntityListValue {
  return {
    type: 'entity-list',
    entities: collection.rows.map(
      (row): FormulaEntityListValue['entities'][number] => {
        if (isMoneyTransaction(row)) {
          return {
            id: row.id,
            label: transactionMerchantName(row),
            value: rowMeasure(collection, row),
            kind: 'transaction',
            subtitle: row.date,
            fields: {
              accountId: row.accountId ?? null,
              direction: row.direction,
              category: row.userCategory ?? row.category.join(' '),
              recurring: row.recurring,
            },
          }
        }

        if (isMoneyDebt(row)) {
          return {
            id: row.id,
            label: row.name,
            value: rowMeasure(collection, row),
            kind: 'debt',
            subtitle: row.institutionName ?? row.type,
            fields: {
              type: row.type,
              balance: row.balance,
              apr: row.apr ?? null,
              creditLimit: row.creditLimit ?? null,
              availableCredit: row.availableCredit ?? null,
              statementBalance: row.statementBalance ?? null,
              utilization: row.utilization ?? null,
              minimumPayment: row.minimumPayment ?? null,
              nextPaymentDueDate: row.nextPaymentDueDate ?? null,
            },
          }
        }

        if (isMoneyHolding(row)) {
          return {
            id: row.id,
            label: row.tickerSymbol ?? row.name,
            value: rowMeasure(collection, row),
            kind: 'holding',
            subtitle: row.institutionName ?? row.type,
            fields: {
              accountId: row.accountId ?? null,
              name: row.name,
              tickerSymbol: row.tickerSymbol ?? null,
              assetClass: row.assetClass ?? null,
              accountSubtype: row.accountSubtype ?? null,
              accountName: row.accountName ?? null,
              investmentAccountKind: row.investmentAccountKind ?? null,
              taxTreatment: row.taxTreatment ?? null,
              quantity: row.quantity,
              price: row.price,
              marketValue: row.marketValue,
            },
          }
        }

        if (isMoneyMerchant(row)) {
          return {
            id: row.id,
            label: row.displayName ?? row.name,
            value: rowMeasure(collection, row),
            kind: 'merchant',
            subtitle: row.lastTransactionDate,
            fields: {
              transactionCount: row.transactionCount,
              income: row.income,
              expenses: row.expenses,
              netAmount: row.netAmount,
              lastTransactionDate: row.lastTransactionDate ?? null,
            },
          }
        }

        if (isMoneyPerson(row)) {
          return {
            id: row.id,
            label: row.displayName ?? row.name,
            value: rowMeasure(collection, row),
            kind: 'person',
            subtitle: row.lastActivityDate,
            fields: {
              transactionCount: row.transactionCount,
              amountOwedToMe: row.amountOwedToMe,
              amountIOwe: row.amountIOwe,
              amountSettled: row.amountSettled,
              lastActivityDate: row.lastActivityDate ?? null,
            },
          }
        }

        if (isMoneyRecommendation(row)) {
          return {
            id: row.id,
            label: row.title,
            value: rowMeasure(collection, row),
            kind: 'recommendation',
            subtitle: row.reason,
            fields: {
              kind: row.kind,
              status: row.status,
              severity: row.severity,
              source: row.source,
              confidence: row.confidence ?? null,
              estimatedImpact: row.estimatedImpact ?? null,
              scenarioId: row.scenarioId ?? null,
              sourceEntity: row.sourceLinks[0]?.entity ?? null,
              sourceEntityId: row.sourceLinks[0]?.entityId ?? null,
              createdAt: row.createdAt,
              updatedAt: row.updatedAt,
              acceptedAt: row.acceptedAt ?? null,
              rejectedAt: row.rejectedAt ?? null,
              doneAt: row.doneAt ?? null,
              ignoredAt: row.ignoredAt ?? null,
            },
          }
        }

        if (isMoneyBalanceSnapshot(row)) {
          return {
            id: row.id,
            label: row.name ?? row.kind,
            value: rowMeasure(collection, row),
            kind: 'balanceSnapshot',
            subtitle: row.date,
            fields: {
              kind: row.kind,
              date: row.date,
              asOf: row.asOf,
              source: row.source,
              accountId: row.accountId ?? null,
              holdingId: row.holdingId ?? null,
              itemId: row.itemId ?? null,
              institutionName: row.institutionName ?? null,
              accountType: row.accountType ?? null,
              accountSubtype: row.accountSubtype ?? null,
              assetClass: row.assetClass ?? null,
              createdAt: row.createdAt,
            },
          }
        }

        return {
          id: row.id,
          label: row.name,
          value: rowMeasure(collection, row),
          kind: 'account',
          subtitle: row.institutionName ?? row.type,
          fields: {
            type: row.type,
            subtype: row.subtype ?? null,
            mask: row.mask ?? null,
            institutionName: row.institutionName ?? null,
            balance: Math.abs(row.valueForSum ?? row.currentBalance),
            creditLimit: row.creditLimit ?? row.balance?.limit ?? null,
            availableCredit: row.availableCredit ?? null,
            utilization: row.utilization ?? null,
            investmentAccountKind: row.investmentAccountKind ?? null,
            taxTreatment: row.taxTreatment ?? null,
            liquidity: row.liquidity ?? null,
            liquidityClass: row.liquidityClass ?? null,
            liquidityTier: row.liquidityTier ?? null,
            contributionLimitAnnual: row.contributionLimitAnnual ?? null,
            contributionLimitYear: row.contributionLimitYear ?? null,
          },
        }
      },
    ),
  }
}

function dateValue(value: string): FormulaDateValue {
  return { type: 'date', isoDate: value }
}

function durationValue(raw: string): FormulaDurationValue {
  const match = raw.match(
    /^([0-9]+(?:\.[0-9]+)?)(d|day|days|w|week|weeks|mo|month|months|y|year|years)$/,
  )
  const amount = match ? Number(match[1]) : 0
  const rawUnit = match?.[2] ?? 'day'
  const unit = normalizeDurationUnit(rawUnit)
  return {
    type: 'duration',
    amount,
    unit,
    days: durationDays(amount, unit),
  }
}

function durationFromMonths(months: number): FormulaDurationValue {
  const amount = Number.isFinite(months) ? Math.max(0, months) : 0
  return {
    type: 'duration',
    amount,
    unit: 'month',
    days: durationDays(amount, 'month'),
  }
}

function normalizeDurationUnit(unit: string): FormulaDurationValue['unit'] {
  if (unit === 'w' || unit.startsWith('week')) return 'week'
  if (unit === 'mo' || unit.startsWith('month')) return 'month'
  if (unit === 'y' || unit.startsWith('year')) return 'year'
  return 'day'
}

function durationDays(
  amount: number,
  unit: FormulaDurationValue['unit'],
): number {
  if (unit === 'week') return amount * 7
  if (unit === 'month') return amount * 30
  if (unit === 'year') return amount * 365
  return amount
}

function formatDuration(value: FormulaDurationValue): string {
  const shouldDecompose =
    value.unit === 'month' || value.unit === 'year' || value.days >= 60
  if (!shouldDecompose) {
    const unit = value.amount === 1 ? value.unit : `${value.unit}s`
    return `${new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 1,
    }).format(value.amount)} ${unit}`
  }

  const totalDays = Math.max(0, Math.round(value.days))
  const years = Math.floor(totalDays / 365)
  const afterYears = totalDays - years * 365
  const months = Math.floor(afterYears / 30)
  const days = afterYears - months * 30
  const parts: string[] = []
  if (years > 0) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`)
  if (months > 0) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`)
  if (days > 0 || parts.length === 0) {
    parts.push(`${days} ${days === 1 ? 'day' : 'days'}`)
  }
  return parts.join(', ')
}

function visitExpression(
  expression: MoneyExpression,
  visitor: (expression: MoneyExpression) => void,
) {
  visitor(expression)
  if (isBinaryExpression(expression)) {
    visitExpression(expression.left, visitor)
    visitExpression(expression.right, visitor)
  } else if (isUnaryExpression(expression)) {
    visitExpression(expression.value, visitor)
  } else if (isAggregateCall(expression)) {
    for (const method of expression.methods) {
      for (const arg of method.args) visitExpression(arg, visitor)
    }
  } else if (isFunctionCall(expression)) {
    for (const arg of expression.args) visitExpression(arg, visitor)
  }
}

function isBinaryExpression(
  expression: MoneyExpression,
): expression is MoneyBinaryExpression {
  return 'left' in expression && 'right' in expression
}

function isUnaryExpression(
  expression: MoneyExpression,
): expression is MoneyUnaryExpression {
  return (
    'operator' in expression &&
    'value' in expression &&
    !isNumberLiteral(expression) &&
    !isStringLiteral(expression) &&
    !isBooleanLiteral(expression)
  )
}

function isNumberLiteral(
  expression: MoneyExpression,
): expression is MoneyNumberLiteral {
  return (
    nodeType(expression) === 'NumberLiteral' ||
    ('value' in expression && typeof expression.value === 'number')
  )
}

function isStringLiteral(
  expression: MoneyExpression,
): expression is MoneyStringLiteral {
  return nodeType(expression) === 'StringLiteral'
}

function isBooleanLiteral(
  expression: MoneyExpression,
): expression is MoneyBooleanLiteral {
  return nodeType(expression) === 'BooleanLiteral'
}

function isDateLiteral(
  expression: MoneyExpression,
): expression is MoneyDateLiteral {
  return nodeType(expression) === 'DateLiteral'
}

function isDurationLiteral(
  expression: MoneyExpression,
): expression is MoneyDurationLiteral {
  return nodeType(expression) === 'DurationLiteral'
}

function isFieldReference(
  expression: MoneyExpression,
): expression is MoneyFieldReference {
  return 'name' in expression && !('args' in expression)
}

function isFunctionCall(
  expression: MoneyExpression,
): expression is MoneyFunctionCall {
  return 'name' in expression && 'args' in expression
}

function isAggregateCall(
  expression: MoneyExpression,
): expression is MoneyAggregateCall {
  return 'collection' in expression && 'methods' in expression
}

function isRuntimeCollection(value: FormulaValue): value is RuntimeCollection {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'label' in value &&
    'rows' in value
  )
}

function isFormulaTableValue(value: FormulaValue): value is FormulaTableValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'table'
  )
}

function isMoneyTransaction(row: RuntimeEntity): row is MoneyTransaction {
  return 'direction' in row
}

function transactionCollectionSnapshot(
  collection: RuntimeCollection,
): { collection: string; transactions: MoneyTransaction[] } | undefined {
  const transactions = collection.rows.filter(isMoneyTransaction)
  if (transactions.length === collection.rows.length) {
    return { collection: collection.id, transactions }
  }

  if (
    collection.rows.length === 0 &&
    (collection.id === 'Income' ||
      collection.id === 'Expenses' ||
      collection.id === 'CashFlow' ||
      collection.extensionNamespace)
  ) {
    return { collection: collection.id, transactions: [] }
  }

  return undefined
}

function isMoneyAccount(row: RuntimeEntity): row is MoneyAccount {
  return 'currentBalance' in row
}

function isMoneyDebt(row: RuntimeEntity): row is MoneyDebt {
  return 'balance' in row && !('currentBalance' in row)
}

function isMoneyHolding(row: RuntimeEntity): row is MoneyHolding {
  return 'marketValue' in row
}

function isMoneyMerchant(row: RuntimeEntity): row is MoneyMerchant {
  return 'netAmount' in row
}

function isMoneyPerson(row: RuntimeEntity): row is MoneyPerson {
  return 'amountOwedToMe' in row
}

function isMoneyRecommendation(row: RuntimeEntity): row is MoneyRecommendation {
  return 'sourceLinks' in row
}

function isMoneyBalanceSnapshot(
  row: RuntimeEntity,
): row is MoneyBalanceSnapshot {
  return 'kind' in row && 'date' in row && 'value' in row && !('status' in row)
}

function isLiabilityAccount(account: MoneyAccount): boolean {
  return (
    account.isLiability ??
    (account.currentBalance < 0 ||
      ['credit', 'loan', 'mortgage'].includes(account.type))
  )
}

function isInvestmentAccount(account: MoneyAccount): boolean {
  return (
    account.type === 'investment' ||
    Boolean(account.investmentAccountKind) ||
    ['401k', '529', 'hsa', 'ira', 'roth_ira', 'rrsp', 'tfsa'].includes(
      account.subtype?.toLowerCase() ?? '',
    )
  )
}

function isTaxShelteredInvestmentAccount(account: MoneyAccount): boolean {
  return (
    isInvestmentAccount(account) &&
    ['tax_deferred', 'tax_free', 'education', 'hsa'].includes(
      account.taxTreatment ?? '',
    )
  )
}

function isLiquidAssetAccount(account: MoneyAccount): boolean {
  return !isLiabilityAccount(account) && account.liquidityClass === 'liquid'
}

function isIlliquidAssetAccount(account: MoneyAccount): boolean {
  return !isLiabilityAccount(account) && account.liquidityClass === 'illiquid'
}

function isSubscriptionTransaction(
  transaction: MoneyTransaction,
  anchorDate?: Date,
): boolean {
  const subscriptionState = recurringExtensionState(
    transaction.extensions?.subscription,
    anchorDate,
  )
  if (subscriptionState !== undefined) return subscriptionState

  const obligationState = recurringExtensionState(
    transaction.extensions?.recurringObligation,
    anchorDate,
  )
  if (obligationState !== undefined) return false

  return (
    !isRecurringObligationTransaction(transaction, anchorDate) &&
    transaction.recurring
  )
}

function isRecurringObligationTransaction(
  transaction: MoneyTransaction,
  anchorDate?: Date,
): boolean {
  const obligationState = recurringExtensionState(
    transaction.extensions?.recurringObligation,
    anchorDate,
  )
  if (obligationState !== undefined) return obligationState

  const haystack = [
    transaction.name,
    transaction.merchantName,
    ...transaction.category,
  ].join(' ')
  return /\b(rent|mortgage|insurance|utility|utilities|electric|electricity|gas|water|sewer|internet|phone|cell|mobile|loan|student loan|car payment|auto payment|hoa|property tax|childcare|daycare)\b/i.test(
    haystack,
  )
}

function recurringExtensionState(
  values: Record<string, unknown> | undefined,
  anchorDate?: Date,
): boolean | undefined {
  if (!values) return undefined
  if (values.active === false) return false
  if (values.status === 'skipped' || values.status === 'dismissed') return false
  if (recurringExtensionIsStale(values, anchorDate)) return false
  if (values.active === true) return true
  if (values.status === 'active') return true
  if (typeof values.cadence === 'string' && values.cadence.length > 0) {
    return true
  }
  return undefined
}

function recurringExtensionIsStale(
  values: Record<string, unknown>,
  anchorDate?: Date,
): boolean {
  if (!anchorDate) return false
  const nextDueDate =
    typeof values.nextDueDate === 'string' ? values.nextDueDate : undefined
  if (!nextDueDate) return false
  const dueMillis = Date.parse(`${nextDueDate.slice(0, 10)}T00:00:00Z`)
  if (!Number.isFinite(dueMillis)) return false
  const intervalDays = recurringIntervalDays(values)
  const graceDays = recurringStaleGraceDays(intervalDays)
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

function recurringIntervalDays(values: Record<string, unknown>): number {
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

function recurringStaleGraceDays(intervalDays: number): number {
  if (intervalDays <= 8) return 3
  if (intervalDays <= 35) return 10
  if (intervalDays <= 100) return 21
  return 45
}

function toNumber(value: FormulaValue | undefined): number {
  if (value === undefined) return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (isFormulaDurationValue(value))
    return value.unit === 'month' ? value.amount : value.days
  if (isFormulaDateValue(value))
    return Date.parse(`${value.isoDate}T00:00:00Z`) || 0
  if (isFormulaForecastValue(value)) return value.value
  if (isFormulaSeriesValue(value))
    return sum(value.points.map((point) => point.value))
  if (isFormulaTableValue(value)) {
    return sum(
      value.rows.map((row) => (typeof row.value === 'number' ? row.value : 0)),
    )
  }
  if (isFormulaEntityListValue(value)) {
    return sum(value.entities.map((entity) => entity.value))
  }
  return sumCollection(value)
}

function safePositiveFormulaNumber(
  value: FormulaValue | undefined,
  fallback: number,
): number {
  if (value === undefined) return fallback
  const number = toNumber(value)
  return Number.isFinite(number) && number >= 0 ? number : fallback
}

function toBoolean(value: FormulaValue): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') return value.length > 0 && value !== 'false'
  if (isRuntimeCollection(value)) {
    return (value.fallbackCount ?? value.rows.length) > 0
  }
  return toNumber(value) !== 0
}

function valuesEqual(left: FormulaValue, right: FormulaValue): boolean {
  if (typeof left === 'string' || typeof right === 'string') {
    const leftValue = String(left).toLowerCase()
    const rightValue = String(right).toLowerCase()
    return (
      leftValue === rightValue ||
      leftValue.split(/\s+/).filter(Boolean).includes(rightValue)
    )
  }
  return toNumber(left) === toNumber(right)
}

function compareValues(left: FormulaValue, right: FormulaValue): number {
  const leftDate = dateMillis(left)
  const rightDate = dateMillis(right)
  if (leftDate !== null && rightDate !== null) return leftDate - rightDate

  if (typeof left === 'string' || typeof right === 'string') {
    return String(left).localeCompare(String(right))
  }
  return toNumber(left) - toNumber(right)
}

function isFormulaDateValue(value: FormulaValue): value is FormulaDateValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'date'
  )
}

function isFormulaDurationValue(
  value: FormulaValue,
): value is FormulaDurationValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'duration'
  )
}

function isFormulaSeriesValue(
  value: FormulaValue,
): value is FormulaSeriesValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'series'
  )
}

function isFormulaForecastValue(
  value: FormulaValue,
): value is FormulaForecastValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'forecast'
  )
}

function isFormulaEntityListValue(
  value: FormulaValue,
): value is FormulaEntityListValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'entity-list'
  )
}

function dateMillis(value: FormulaValue): number | null {
  const raw = isFormulaDateValue(value) ? value.isoDate : value
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const millis = Date.parse(`${raw}T00:00:00Z`)
  return Number.isFinite(millis) ? millis : null
}

function dateFromFormulaValue(value: FormulaValue | undefined): Date | null {
  if (!value) return null
  const millis = dateMillis(value)
  if (millis === null) return null
  const date = new Date(millis)
  return Number.isFinite(date.getTime()) ? date : null
}

function nodeType(expression: MoneyExpression): string | undefined {
  return (expression as Partial<AstNode>).$type
}

function metricValue(
  collections: CollectionMetric[],
  id: CollectionId | string,
): number {
  return collections.find((collection) => collection.id === id)?.value ?? 0
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function titleFromField(field: string): string {
  return field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function formatValue(
  value: FormulaResultValue,
  format: MoneyCardDefinition['format'],
  currency = 'USD',
) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'string') return value
  if (isFormulaDateValue(value)) {
    return new Date(`${value.isoDate}T00:00:00Z`).toLocaleDateString('en-US')
  }
  if (isFormulaDurationValue(value)) {
    return formatDuration(value)
  }
  if (isFormulaForecastValue(value)) {
    return formatValue(value.value, format, currency)
  }
  if (isFormulaSeriesValue(value)) return `${value.points.length} points`
  if (isFormulaTableValue(value)) return `${value.rows.length} rows`
  if (isFormulaEntityListValue(value)) return `${value.entities.length} items`

  if (format === 'percent') {
    return `${Math.round(value * 100)}%`
  }
  if (format === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  }
  if (format === 'compact') {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }
  if (format === 'duration') {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 1,
    }).format(value)
  }
  if (format === 'date') {
    return new Date(value).toLocaleDateString('en-US')
  }
  return new Intl.NumberFormat('en-US').format(value)
}

function formatCardDisplayValue(
  card: MoneyCardDefinition,
  value: FormulaResultValue,
  currency = 'USD',
): string {
  if (
    typeof value === 'number' &&
    typeof card.maxDisplayValue === 'number' &&
    value >= card.maxDisplayValue
  ) {
    return card.maxDisplayLabel ?? `${card.maxDisplayValue}+`
  }
  return formatValue(value, card.format, currency)
}
