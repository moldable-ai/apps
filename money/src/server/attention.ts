import type { MoneySettings, MoneyTransaction } from './money-types'

export interface MoneyTodayItem {
  id: string
  appId: 'money'
  kind: 'blocked' | 'attention'
  title: string
  subtitle: string
  icon: string
}

export interface MoneyDueSeries {
  id: string
  name: string
  nextDueDate?: string
  monthlyAmount?: number
  latestTransaction?: {
    name: string
    merchantName?: string
    amount: number
    isoCurrencyCode?: string
    currencyCode?: string
    reportingCurrency?: string
    reportingValue?: number
    valueForSum?: number
  }
}

export function buildMoneyAttentionItems(
  transactions: MoneyTransaction[],
  settings: MoneySettings['attention'],
  dueSeries: MoneyDueSeries[] = [],
  now = new Date(),
): MoneyTodayItem[] {
  const items: MoneyTodayItem[] = []

  for (const series of dedupeDueSeries(dueSeries).slice(0, 3)) {
    if (!series.nextDueDate) continue
    const due = relativeDueLabel(series.nextDueDate, now)
    // Skip already-past obligations. A recurring nextDueDate in the past is far
    // more likely stale-after-payment (the user's mortgage is paid monthly) than a
    // genuinely missed bill — and a false "overdue mortgage" is exactly the
    // alarm Today should never raise. Only surface genuinely upcoming bills.
    if (due === 'overdue') continue
    const amount = dueSeriesAmount(series)
    const name = displayName(series.name)
    const merchant = displayName(
      series.latestTransaction?.merchantName ?? series.name,
    )
    const money = formatCurrency(amount.value, amount.currency)
    items.push({
      id: `money-due-${safeId(series.id)}`,
      appId: 'money',
      kind: 'attention',
      title: `${name} due ${due}`,
      // Don't echo the name we already show in the title; only add the merchant
      // when it's meaningfully different (e.g. a "Rent" series paid to a bank).
      subtitle:
        merchant.toLowerCase() === name.toLowerCase()
          ? money
          : `${money} · ${merchant}`,
      icon: '💵',
    })
  }

  const monthPrefix = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const categoryBreaches = settings.categoryThresholds
    .filter((entry) => entry.enabled)
    .map((threshold) => {
      const matching = transactions.filter((transaction) => {
        if (!transaction.isExpense && transaction.direction !== 'expense')
          return false
        if (!transaction.date.startsWith(monthPrefix)) return false
        return transactionMatchesCategory(transaction, threshold.category)
      })
      const currency = dominantCurrency(matching)
      const spent = matching.reduce(
        (total, transaction) =>
          total + Math.abs(moneyAmount(transaction).value),
        0,
      )

      return {
        category: threshold.category,
        monthlyLimit: threshold.monthlyLimit,
        spent,
        currency,
      }
    })
    .filter((entry) => entry.spent > entry.monthlyLimit)
    .sort((a, b) => b.spent - b.monthlyLimit - (a.spent - a.monthlyLimit))

  if (categoryBreaches.length > 0) {
    const first = categoryBreaches[0]
    const categories = categoryBreaches
      .map((entry) => entry.category)
      .join(', ')
    const title =
      categoryBreaches.length === 1
        ? `${first.category} is over budget`
        : `${categoryBreaches.length} budget categories are over`
    items.push({
      id: 'money-category-thresholds',
      appId: 'money',
      kind: 'attention',
      title,
      subtitle:
        categoryBreaches.length === 1
          ? `${formatCurrency(first.spent, first.currency)} spent this month vs ${formatCurrency(first.monthlyLimit, first.currency)} limit.`
          : categories,
      icon: '💵',
    })
  }

  return items.slice(0, 6)
}

function dedupeDueSeries(series: MoneyDueSeries[]): MoneyDueSeries[] {
  const seen = new Set<string>()
  return [...series]
    .filter((entry) => Boolean(entry.nextDueDate))
    .sort(
      (a, b) =>
        (a.nextDueDate ?? '9999-12-31').localeCompare(
          b.nextDueDate ?? '9999-12-31',
        ) || a.name.localeCompare(b.name),
    )
    .filter((entry) => {
      const key = safeId(entry.name || entry.id)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function dueSeriesAmount(series: MoneyDueSeries): {
  value: number
  currency: string
} {
  if (series.latestTransaction) {
    return moneyAmount(series.latestTransaction)
  }
  return { value: Math.abs(series.monthlyAmount ?? 0), currency: 'USD' }
}

function moneyAmount(transaction: {
  amount: number
  isoCurrencyCode?: string
  currencyCode?: string
  reportingCurrency?: string
  reportingValue?: number
  valueForSum?: number
}): { value: number; currency: string } {
  if (
    typeof transaction.reportingValue === 'number' &&
    Number.isFinite(transaction.reportingValue) &&
    transaction.reportingCurrency
  ) {
    return {
      value: Math.abs(transaction.reportingValue),
      currency: transaction.reportingCurrency,
    }
  }
  return {
    value: Math.abs(transaction.valueForSum ?? transaction.amount),
    currency: transaction.currencyCode ?? transaction.isoCurrencyCode ?? 'USD',
  }
}

function dominantCurrency(transactions: MoneyTransaction[]): string {
  const counts = new Map<string, number>()
  for (const transaction of transactions) {
    const currency = moneyAmount(transaction).currency
    counts.set(currency, (counts.get(currency) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'USD'
}

function relativeDueLabel(date: string, now: Date): string {
  const due = Date.parse(`${date.slice(0, 10)}T00:00:00Z`)
  const today = Date.parse(`${isoDate(now)}T00:00:00Z`)
  if (!Number.isFinite(due) || !Number.isFinite(today)) return date
  const days = Math.round((due - today) / 86_400_000)
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days <= 7) {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone: 'UTC',
    }).format(new Date(due))
  }
  return date
}

function transactionMatchesCategory(
  transaction: MoneyTransaction,
  category: string,
): boolean {
  const needle = category.trim().toLowerCase()
  if (!needle) return false
  const labels = [
    transaction.userCategory,
    transaction.category.join(' '),
    ...transaction.category,
  ]
    .filter(Boolean)
    .map((entry) => String(entry).toLowerCase())

  return labels.some((entry) => entry === needle || entry.includes(needle))
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function safeId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Soften shouty provider names for display: "MORTGAGE SERVICER" →
 * "Mortgage Servicer", while leaving already-cased names and short acronyms
 * (AMEX, Example CU, IRS) intact.
 */
function displayName(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  const allCaps = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)
  if (!allCaps || (!trimmed.includes(' ') && trimmed.length <= 4))
    return trimmed
  return trimmed.toLowerCase().replace(/\b[a-z]/g, (ch) => ch.toUpperCase())
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}
