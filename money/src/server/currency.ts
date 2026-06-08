import type {
  MoneyExtensionPrimitive,
  MoneyFxRate,
  MoneyFxRateSource,
  MoneyFxRateStatus,
  MoneySettings,
  MoneyTransaction,
} from './money-types'

export interface ConvertedMoney {
  amount: number
  currency: string
  rate: number
  asOf: string
  source: MoneyFxRateSource | 'same-currency'
  status: MoneyFxRateStatus
}

export function normalizeCurrencyCode(
  value: unknown,
  fallback = 'USD',
): string {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().toUpperCase()
  return /^[A-Z0-9]{3,12}$/.test(normalized) ? normalized : fallback
}

export function normalizeFxRates(rates: MoneyFxRate[]): MoneyFxRate[] {
  const now = new Date().toISOString()
  const normalized = rates
    .map((rate): MoneyFxRate | null => {
      const baseCurrency = normalizeCurrencyCode(rate.baseCurrency, '')
      const quoteCurrency = normalizeCurrencyCode(rate.quoteCurrency, '')
      const amount =
        typeof rate.rate === 'number' && Number.isFinite(rate.rate)
          ? rate.rate
          : 0
      const asOf = normalizeDate(rate.asOf)
      if (
        !baseCurrency ||
        !quoteCurrency ||
        baseCurrency === quoteCurrency ||
        amount <= 0 ||
        !asOf
      ) {
        return null
      }
      const source = normalizeFxRateSource(rate.source)
      const status = rate.status === 'locked' ? 'locked' : 'estimated'
      const id = safeFxRateId(
        rate.id || `${baseCurrency}-${quoteCurrency}-${asOf}-${source}`,
      )
      return {
        id,
        baseCurrency,
        quoteCurrency,
        rate: amount,
        asOf,
        source,
        status,
        createdAt: normalizeTimestamp(rate.createdAt) ?? now,
        updatedAt: normalizeTimestamp(rate.updatedAt) ?? now,
      }
    })
    .filter((rate): rate is MoneyFxRate => Boolean(rate))
    .sort(
      (a, b) =>
        b.asOf.localeCompare(a.asOf) ||
        a.baseCurrency.localeCompare(b.baseCurrency) ||
        a.quoteCurrency.localeCompare(b.quoteCurrency) ||
        a.id.localeCompare(b.id),
    )

  return [...new Map(normalized.map((rate) => [rate.id, rate])).values()]
}

export function convertMoney(
  amount: number,
  fromCurrency: string | undefined,
  toCurrency: string,
  asOf: string | undefined,
  rates: MoneyFxRate[],
): ConvertedMoney | undefined {
  if (!Number.isFinite(amount)) return undefined
  const baseCurrency = normalizeCurrencyCode(fromCurrency, '')
  const quoteCurrency = normalizeCurrencyCode(toCurrency, '')
  if (!baseCurrency || !quoteCurrency) return undefined
  if (baseCurrency === quoteCurrency) {
    return {
      amount,
      currency: quoteCurrency,
      rate: 1,
      asOf: normalizeDate(asOf) ?? new Date(0).toISOString().slice(0, 10),
      source: 'same-currency',
      status: 'locked',
    }
  }

  const rate = findFxRate(rates, baseCurrency, quoteCurrency, asOf)
  if (!rate) return undefined
  return {
    amount: amount * rate.rate,
    currency: quoteCurrency,
    rate: rate.rate,
    asOf: rate.asOf,
    source: rate.source,
    status: rate.status,
  }
}

export function moneyFlowReportingAmount(
  transaction: MoneyTransaction,
  values: Record<string, MoneyExtensionPrimitive>,
  settings: MoneySettings | undefined,
  rates: MoneyFxRate[] | undefined,
): ConvertedMoney | undefined {
  const reportingValue = numberValue(values.reportingValue)
  const reportingCurrency = normalizeCurrencyCode(
    values.reportingCurrency,
    settings?.currency.reportingCurrency ?? 'USD',
  )
  if (reportingValue !== undefined) {
    return {
      amount: Math.abs(reportingValue),
      currency: reportingCurrency,
      rate: numberValue(values.reportingFxRate) ?? 1,
      asOf: stringValue(values.reportingFxAsOf) ?? transaction.date,
      source: fxSourceValue(values.reportingFxSource) ?? 'provider',
      status:
        values.reportingValueStatus === 'estimated' ? 'estimated' : 'locked',
    }
  }

  if (!settings || !rates) return undefined
  const desiredCurrency = normalizeCurrencyCode(
    settings.currency.reportingCurrency,
  )
  const role = stringValue(values.role)
  const sourceCurrency = normalizeCurrencyCode(
    values.sourceCurrency,
    transaction.currencyCode ?? transaction.isoCurrencyCode,
  )
  const targetCurrency = normalizeCurrencyCode(values.targetCurrency, '')
  const sourceAmount =
    numberValue(values.sourceAmount) ??
    transaction.valueForSum ??
    transaction.amount
  const targetAmount = numberValue(values.targetAmount)
  const feeAmount = numberValue(values.feeAmount)

  if (
    role !== 'fee' &&
    targetAmount !== undefined &&
    targetCurrency &&
    targetCurrency === desiredCurrency
  ) {
    return {
      amount: Math.abs(targetAmount),
      currency: desiredCurrency,
      rate:
        numberValue(values.fxRate) ??
        (sourceAmount === 0 ? 1 : Math.abs(targetAmount / sourceAmount)),
      asOf: transaction.date,
      source: 'provider',
      status: 'locked',
    }
  }

  const amount =
    role === 'fee' && feeAmount !== undefined ? feeAmount : sourceAmount
  return convertMoney(
    Math.abs(amount),
    sourceCurrency,
    desiredCurrency,
    transaction.date,
    rates,
  )
}

export function mergeMoneyFlowReportingValues(
  transaction: MoneyTransaction,
  values: Record<string, MoneyExtensionPrimitive>,
  settings: MoneySettings | undefined,
  rates: MoneyFxRate[] | undefined,
): Record<string, MoneyExtensionPrimitive> {
  const converted = moneyFlowReportingAmount(
    transaction,
    values,
    settings,
    rates,
  )
  if (!converted || values.reportingValue !== undefined) return values
  return {
    ...values,
    reportingCurrency: converted.currency,
    reportingValue: Math.round(converted.amount * 100) / 100,
    reportingValueStatus: converted.status,
    reportingFxRate: converted.rate,
    reportingFxAsOf: converted.asOf,
    reportingFxSource: converted.source,
  }
}

function findFxRate(
  rates: MoneyFxRate[],
  baseCurrency: string,
  quoteCurrency: string,
  asOf: string | undefined,
): ConvertedMoney | undefined {
  const normalizedRates = normalizeFxRates(rates)
  const date = normalizeDate(asOf)
  const direct = latestApplicableRate(
    normalizedRates,
    baseCurrency,
    quoteCurrency,
    date,
  )
  if (direct) {
    return {
      amount: 0,
      currency: quoteCurrency,
      rate: direct.rate,
      asOf: direct.asOf,
      source: direct.source,
      status: direct.status,
    }
  }
  const inverse = latestApplicableRate(
    normalizedRates,
    quoteCurrency,
    baseCurrency,
    date,
  )
  if (!inverse) return undefined
  return {
    amount: 0,
    currency: quoteCurrency,
    rate: 1 / inverse.rate,
    asOf: inverse.asOf,
    source: inverse.source,
    status: inverse.status,
  }
}

function latestApplicableRate(
  rates: MoneyFxRate[],
  baseCurrency: string,
  quoteCurrency: string,
  asOf: string | undefined,
): MoneyFxRate | undefined {
  return rates
    .filter((rate) => {
      if (
        rate.baseCurrency !== baseCurrency ||
        rate.quoteCurrency !== quoteCurrency
      ) {
        return false
      }
      return asOf ? rate.asOf <= asOf : true
    })
    .sort(
      (a, b) =>
        b.asOf.localeCompare(a.asOf) || b.updatedAt.localeCompare(a.updatedAt),
    )[0]
}

function normalizeFxRateSource(source: unknown): MoneyFxRateSource {
  return source === 'user' ||
    source === 'agent' ||
    source === 'provider' ||
    source === 'market'
    ? source
    : 'agent'
}

function fxSourceValue(
  value: MoneyExtensionPrimitive | undefined,
): ConvertedMoney['source'] | undefined {
  if (
    value === 'user' ||
    value === 'agent' ||
    value === 'provider' ||
    value === 'market' ||
    value === 'same-currency'
  ) {
    return value
  }
  return undefined
}

function numberValue(
  value: MoneyExtensionPrimitive | undefined,
): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function stringValue(
  value: MoneyExtensionPrimitive | undefined,
): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function normalizeDate(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim().slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : undefined
}

function normalizeTimestamp(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined
}

function safeFxRateId(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'fx-rate'
  )
}
