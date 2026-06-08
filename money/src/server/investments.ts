import type {
  MoneyAccount,
  MoneyAccountLiquidity,
  MoneyAssetClass,
  MoneyInvestmentAccountKind,
  MoneyLiquidityClass,
  MoneyTaxTreatment,
} from './money-types'

const STOCK_MARKERS = [
  'stock',
  'equity',
  'common stock',
  'preferred stock',
  'adr',
  'reit',
]
const BOND_MARKERS = ['bond', 'fixed income', 'treasury', 'municipal', 'note']
const CASH_MARKERS = [
  'cash',
  'money market',
  'certificate of deposit',
  'cd',
  'sweep',
]
const CRYPTO_MARKERS = ['crypto', 'cryptocurrency', 'bitcoin', 'ethereum']
const FUND_MARKERS = ['etf', 'mutual fund', 'fund', 'index']
const OPTION_MARKERS = ['option', 'derivative', 'warrant']
const ILLIQUID_SUBTYPES = new Set([
  'real_estate',
  'real estate',
  'property',
  'home',
  'vehicle',
  'car',
  'auto',
])
const NEAR_CASH_SUBTYPES = new Set([
  'cd',
  'certificate of deposit',
  'treasury',
  't-bill',
  'tbill',
])
const CASH_SUBTYPES = new Set([
  'checking',
  'savings',
  'money_market',
  'money market',
  'cash management',
  'prepaid',
  'cash',
])
const ILLIQUID_INVESTMENT_KINDS = new Set<MoneyInvestmentAccountKind>([
  '401k',
  'ira',
  'roth_ira',
  'rrsp',
  'tfsa',
  '529',
])
const ILLIQUID_TAX_TREATMENTS = new Set<MoneyTaxTreatment>([
  'tax_deferred',
  'tax_free',
  'education',
])

export function normalizeInvestmentAssetClass(input: {
  assetClass?: string
  type?: string
  name?: string
  tickerSymbol?: string
  account?: Pick<MoneyAccount, 'type' | 'subtype' | 'name'> | undefined
}): MoneyAssetClass {
  const existing = normalizeAssetClassToken(input.assetClass)
  if (existing) return existing

  const haystack = [
    input.type,
    input.name,
    input.tickerSymbol,
    input.account?.subtype,
    input.account?.name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (matchesAny(haystack, CRYPTO_MARKERS)) return 'crypto'
  if (matchesAny(haystack, CASH_MARKERS)) return 'cash'
  if (matchesAny(haystack, BOND_MARKERS)) return 'bonds'
  if (matchesAny(haystack, STOCK_MARKERS)) return 'stocks'
  if (matchesAny(haystack, OPTION_MARKERS)) return 'options'
  if (matchesAny(haystack, FUND_MARKERS)) return 'funds'

  return 'other'
}

export function normalizeInvestmentAccountKind(
  account: Pick<
    MoneyAccount,
    'type' | 'subtype' | 'name' | 'officialName' | 'investmentAccountKind'
  >,
): MoneyInvestmentAccountKind | undefined {
  const existing = normalizeInvestmentAccountKindToken(
    account.investmentAccountKind,
  )
  if (existing) return existing

  const haystack = [account.subtype, account.name, account.officialName]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (/\b401\s*k\b|\b401k\b|\b403\s*b\b|\b403b\b|\b457\b/.test(haystack)) {
    return '401k'
  }
  if (/\broth\b/.test(haystack) && /\bira\b/.test(haystack)) return 'roth_ira'
  if (/\bira\b/.test(haystack)) return 'ira'
  if (/\brrsp\b|registered retirement savings/.test(haystack)) return 'rrsp'
  if (/\btfsa\b|tax[-\s]?free savings/.test(haystack)) return 'tfsa'
  if (/\bhsa\b|health savings/.test(haystack)) return 'hsa'
  if (/\b529\b|education savings|college savings/.test(haystack)) return '529'
  if (/\bbrokerage\b|individual|joint|taxable/.test(haystack))
    return 'brokerage'

  return account.type === 'investment' ? 'brokerage' : undefined
}

export function normalizeTaxTreatment(
  account: Pick<
    MoneyAccount,
    | 'type'
    | 'subtype'
    | 'name'
    | 'officialName'
    | 'investmentAccountKind'
    | 'taxTreatment'
  >,
): MoneyTaxTreatment | undefined {
  const existing = normalizeTaxTreatmentToken(account.taxTreatment)
  if (existing) return existing

  const kind = normalizeInvestmentAccountKind(account)
  if (!kind) return undefined

  if (kind === 'brokerage') return 'taxable'
  if (kind === '401k' || kind === 'ira' || kind === 'rrsp')
    return 'tax_deferred'
  if (kind === 'roth_ira' || kind === 'tfsa') return 'tax_free'
  if (kind === 'hsa') return 'hsa'
  if (kind === '529') return 'education'
  return 'other'
}

export function normalizeAccountLiquidity(
  account: Pick<
    MoneyAccount,
    | 'type'
    | 'subtype'
    | 'name'
    | 'officialName'
    | 'currentBalance'
    | 'isAsset'
    | 'isLiability'
    | 'investmentAccountKind'
    | 'taxTreatment'
    | 'liquidity'
    | 'liquidityTier'
    | 'extensions'
  >,
): {
  liquidityTier?: 0 | 1 | 2 | 3
  liquidity: MoneyAccountLiquidity
  liquidityClass: MoneyLiquidityClass
} {
  const override = normalizeLiquidityToken(
    primitiveString(account.extensions?.liquidity?.class) ?? account.liquidity,
  )
  if (override) return liquidityResult(override)

  const tierOverride = normalizeLiquidityTier(account.liquidityTier)
  if (tierOverride !== undefined)
    return liquidityResult(liquidityFromTier(tierOverride), tierOverride)

  const isLiability =
    account.isLiability ??
    (account.currentBalance < 0 ||
      ['credit', 'loan', 'mortgage'].includes(account.type))
  if (isLiability) return { liquidity: 'na', liquidityClass: 'na' }

  const subtype = account.subtype?.trim().toLowerCase()
  const kind = normalizeInvestmentAccountKind(account)
  const taxTreatment = normalizeTaxTreatment({
    ...account,
    investmentAccountKind: kind,
  })
  if (
    (kind && ILLIQUID_INVESTMENT_KINDS.has(kind)) ||
    (taxTreatment && ILLIQUID_TAX_TREATMENTS.has(taxTreatment)) ||
    (subtype && ILLIQUID_SUBTYPES.has(subtype))
  ) {
    return liquidityResult('illiquid')
  }

  if ((subtype && NEAR_CASH_SUBTYPES.has(subtype)) || kind === 'hsa') {
    return liquidityResult('near_cash')
  }

  if (
    (account.type === 'investment' &&
      (kind === 'brokerage' || taxTreatment === 'taxable')) ||
    matchesAny(
      [subtype, account.name, account.officialName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
      CRYPTO_MARKERS,
    )
  ) {
    return liquidityResult('marketable')
  }

  if (account.type === 'cash' || (subtype && CASH_SUBTYPES.has(subtype))) {
    return liquidityResult('cash')
  }

  if (account.isAsset ?? account.currentBalance > 0)
    return liquidityResult('illiquid')

  return { liquidity: 'na', liquidityClass: 'na' }
}

function normalizeAssetClassToken(
  value: string | undefined,
): MoneyAssetClass | null {
  const normalized = value
    ?.trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
  if (!normalized) return null
  if (['stock', 'stocks', 'equity', 'equities'].includes(normalized))
    return 'stocks'
  if (['bond', 'bonds', 'fixed-income', 'treasury'].includes(normalized)) {
    return 'bonds'
  }
  if (['cash', 'money-market'].includes(normalized)) return 'cash'
  if (['crypto', 'cryptocurrency'].includes(normalized)) return 'crypto'
  if (
    ['fund', 'funds', 'etf', 'mutual-fund', 'index-fund'].includes(normalized)
  ) {
    return 'funds'
  }
  if (['option', 'options', 'derivative', 'derivatives'].includes(normalized)) {
    return 'options'
  }
  if (normalized === 'other') return 'other'
  return null
}

export function normalizeLiquidityToken(
  value: string | undefined,
): MoneyAccountLiquidity | null {
  const normalized = value
    ?.trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  if (!normalized) return null
  if (['cash', 'spendable'].includes(normalized)) return 'cash'
  if (['near_cash', 'nearcash', 'cd', 'treasury'].includes(normalized))
    return 'near_cash'
  if (['marketable', 'brokerage', 'taxable', 'crypto'].includes(normalized))
    return 'marketable'
  if (['illiquid', 'locked', 'hard_asset', 'hard_assets'].includes(normalized))
    return 'illiquid'
  if (['na', 'n_a', 'none', 'not_applicable'].includes(normalized)) return 'na'
  return null
}

function liquidityResult(
  liquidity: MoneyAccountLiquidity,
  tierOverride?: number,
): {
  liquidityTier?: 0 | 1 | 2 | 3
  liquidity: MoneyAccountLiquidity
  liquidityClass: MoneyLiquidityClass
} {
  const tier =
    normalizeLiquidityTier(tierOverride) ?? tierFromLiquidity(liquidity)
  return {
    liquidityTier: tier,
    liquidity,
    liquidityClass:
      tier === undefined ? 'na' : tier <= 2 ? 'liquid' : 'illiquid',
  }
}

function tierFromLiquidity(
  liquidity: MoneyAccountLiquidity,
): 0 | 1 | 2 | 3 | undefined {
  if (liquidity === 'cash') return 0
  if (liquidity === 'near_cash') return 1
  if (liquidity === 'marketable') return 2
  if (liquidity === 'illiquid') return 3
  return undefined
}

function liquidityFromTier(tier: 0 | 1 | 2 | 3): MoneyAccountLiquidity {
  if (tier === 0) return 'cash'
  if (tier === 1) return 'near_cash'
  if (tier === 2) return 'marketable'
  return 'illiquid'
}

function normalizeLiquidityTier(
  value: number | undefined,
): 0 | 1 | 2 | 3 | undefined {
  if (value === 0 || value === 1 || value === 2 || value === 3) return value
  return undefined
}

function primitiveString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function normalizeInvestmentAccountKindToken(
  value: string | undefined,
): MoneyInvestmentAccountKind | null {
  const normalized = value
    ?.trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  if (!normalized) return null
  if (['brokerage', 'taxable'].includes(normalized)) return 'brokerage'
  if (['401k', '401_k', '403b', '403_b', '457'].includes(normalized))
    return '401k'
  if (['ira', 'traditional_ira'].includes(normalized)) return 'ira'
  if (['roth_ira', 'roth'].includes(normalized)) return 'roth_ira'
  if (normalized === 'rrsp') return 'rrsp'
  if (normalized === 'tfsa') return 'tfsa'
  if (normalized === 'hsa') return 'hsa'
  if (normalized === '529') return '529'
  if (normalized === 'other') return 'other'
  return null
}

function normalizeTaxTreatmentToken(
  value: string | undefined,
): MoneyTaxTreatment | null {
  const normalized = value
    ?.trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  if (!normalized) return null
  if (['taxable', 'brokerage'].includes(normalized)) return 'taxable'
  if (['tax_deferred', 'deferred', 'pre_tax', 'pretax'].includes(normalized)) {
    return 'tax_deferred'
  }
  if (['tax_free', 'roth'].includes(normalized)) return 'tax_free'
  if (normalized === 'hsa') return 'hsa'
  if (['education', '529'].includes(normalized)) return 'education'
  if (normalized === 'other') return 'other'
  return null
}

function matchesAny(haystack: string, markers: string[]): boolean {
  return markers.some((marker) => haystack.includes(marker))
}
