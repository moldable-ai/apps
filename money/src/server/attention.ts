import type { MoneySettings, MoneyTransaction } from './money-types'

export interface MoneyTodayItem {
  id: string
  appId: 'money'
  kind: 'blocked' | 'attention'
  title: string
  subtitle: string
  icon: string
}

export function buildMoneyAttentionItems(
  transactions: MoneyTransaction[],
  settings: MoneySettings['attention'],
  now = new Date(),
): MoneyTodayItem[] {
  const items: MoneyTodayItem[] = []
  const today = isoDate(now)
  const cutoff = isoDate(
    new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - settings.lookbackDays + 1,
      ),
    ),
  )

  const largeTransactions = transactions
    .filter((transaction) => {
      if (transaction.direction === 'transfer') return false
      if (transaction.pending) return false
      if (transaction.date < cutoff || transaction.date > today) return false
      return (
        Math.abs(transaction.valueForSum ?? transaction.amount) >=
        settings.largeTransactionThreshold
      )
    })
    .sort((a, b) => {
      const amount =
        Math.abs(b.valueForSum ?? b.amount) -
        Math.abs(a.valueForSum ?? a.amount)
      return amount || b.date.localeCompare(a.date)
    })
    .slice(0, 3)

  for (const transaction of largeTransactions) {
    const amount = Math.abs(transaction.valueForSum ?? transaction.amount)
    items.push({
      id: `money-large-transaction-${safeId(transaction.id)}`,
      appId: 'money',
      kind: 'attention',
      title: `Large ${transaction.direction} detected`,
      subtitle: `${transaction.merchantName ?? transaction.name}: ${formatCurrency(amount)} on ${transaction.date}`,
      icon: '💵',
    })
  }

  const monthPrefix = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  for (const threshold of settings.categoryThresholds.filter(
    (entry) => entry.enabled,
  )) {
    const spent = transactions
      .filter((transaction) => {
        if (!transaction.isExpense && transaction.direction !== 'expense')
          return false
        if (!transaction.date.startsWith(monthPrefix)) return false
        return transactionMatchesCategory(transaction, threshold.category)
      })
      .reduce(
        (total, transaction) =>
          total + Math.abs(transaction.valueForSum ?? transaction.amount),
        0,
      )

    if (spent > threshold.monthlyLimit) {
      items.push({
        id: `money-category-threshold-${safeId(threshold.category)}`,
        appId: 'money',
        kind: 'attention',
        title: `${threshold.category} is over budget`,
        subtitle: `${formatCurrency(spent)} spent this month vs ${formatCurrency(threshold.monthlyLimit)} limit.`,
        icon: '💵',
      })
    }
  }

  return items.slice(0, 6)
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}
