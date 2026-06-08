import { Loader2 } from 'lucide-react'
import {
  Badge,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  cn,
} from '@moldable-ai/ui'
import { formatDate, formatMoney } from '../../ui-kit/lib/format'
import type { MoneyTransactionRow } from '../../ui-kit/lib/types'
import { MerchantChip } from '../../ui-kit/cards/MerchantChip'
import { useApplyLabel } from '../data/labeling'

/** The same budget.need axis used in Categorize, for a single transaction. */
const NEED_OPTIONS: Array<{ value: string; label: string; dot: string }> = [
  { value: 'required', label: 'Required', dot: 'bg-success' },
  { value: 'useful', label: 'Useful', dot: 'bg-[var(--chart-3)]' },
  { value: 'optional', label: 'Optional', dot: 'bg-warning' },
  { value: 'waste', label: 'Waste', dot: 'bg-destructive' },
]

function humanizeCategory(raw: string): string {
  return raw
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * Inspect a single transaction and (optionally) label it. Complements the
 * merchant-level Categorize: this is for one-off corrections and a closer look.
 */
export function TransactionDetailSheet({
  tx,
  onClose,
}: {
  tx: MoneyTransactionRow | null
  onClose: () => void
}) {
  const apply = useApplyLabel()
  const open = tx !== null

  const label = (need: string) => {
    if (!tx) return
    apply.mutate({
      selector: { transactionIds: [tx.id] },
      namespace: 'budget',
      values: { need },
    })
  }

  const cat = tx?.category?.find(
    (c) => c && c !== 'OTHER' && c !== 'OTHER_OTHER',
  )
  const sign =
    tx?.direction === 'income' ? '+' : tx?.direction === 'expense' ? '−' : ''
  const tone =
    tx?.direction === 'income'
      ? 'text-success'
      : tx?.direction === 'transfer'
        ? 'text-muted-foreground'
        : 'text-foreground'

  return (
    <Sheet open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-sm"
      >
        <SheetHeader className="border-border/60 gap-0 border-b px-5 py-4">
          <SheetTitle className="sr-only">Transaction detail</SheetTitle>
          {tx ? (
            <div className="flex items-center gap-3">
              <MerchantChip name={tx.merchantName || tx.name} size={40} />
              <div className="min-w-0">
                <div className="truncate text-base font-semibold">
                  {tx.merchantName || tx.name}
                </div>
                <div className="text-muted-foreground text-xs">
                  {formatDate(tx.date, { weekday: 'short' })}
                </div>
              </div>
            </div>
          ) : null}
        </SheetHeader>

        {tx ? (
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <div
              className={cn(
                'uk-nums text-3xl font-semibold tabular-nums tracking-tight',
                tone,
              )}
            >
              {sign}
              {formatMoney(Math.abs(tx.amount), {
                currency: tx.isoCurrencyCode,
                cents: true,
              })}
            </div>

            <dl className="space-y-2.5 text-sm">
              <Field label="Description" value={tx.name} />
              {cat ? (
                <Field label="Category" value={humanizeCategory(cat)} />
              ) : null}
              {tx.userCategory ? (
                <Field label="Your category" value={tx.userCategory} />
              ) : null}
              <Field label="Direction" value={cap(tx.direction)} />
              {tx.pending ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      Pending
                    </Badge>
                  </dd>
                </div>
              ) : null}
            </dl>

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                How essential is this?
                {apply.isPending ? (
                  <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {NEED_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={apply.isPending}
                    onClick={() => label(opt.value)}
                    className="border-border/60 bg-background/40 hover:border-foreground/40 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors"
                  >
                    <span className={cn('size-2 rounded-full', opt.dot)} />
                    {opt.label}
                  </button>
                ))}
              </div>
              {apply.isSuccess ? (
                <p className="text-success mt-2 text-xs">
                  Labeled. It’ll show up in your dashboards.
                </p>
              ) : null}
              <p className="text-muted-foreground mt-2 text-[11px]">
                Labels just this transaction. To teach a rule for the whole
                merchant, use Categorize.
              </p>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{value}</dd>
    </div>
  )
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
