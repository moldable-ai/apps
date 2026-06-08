import { CalendarClock, Loader2, Repeat } from 'lucide-react'
import { Badge, Button, cn } from '@moldable-ai/ui'
import { formatDate, formatMoney } from '../../ui-kit/lib/format'
import { CardShell } from '../../ui-kit/cards'
import { MerchantChip } from '../../ui-kit/cards/MerchantChip'
import {
  type RecurringSeries,
  type ReviewActionPayload,
  useRecurringAction,
  useRecurringSeries,
} from '../data/recurring'

/** Subscriptions & recurring bills — see the monthly load, keep / skip / cancel. */
export function SubscriptionsScreen({ demo = false }: { demo?: boolean }) {
  const query = useRecurringSeries('subscription', !demo)
  const act = useRecurringAction()

  const series = demo ? [] : (query.data?.series ?? [])
  const active = series.filter((s) => s.status === 'active')
  const monthly = active.reduce((sum, s) => sum + (s.monthlyAmount || 0), 0)
  const loading = !demo && query.isLoading

  if (demo) {
    return (
      <div className="border-border/70 bg-card/40 flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-14 text-center">
        <Repeat className="text-muted-foreground size-8" />
        <p className="font-medium">Your subscriptions, all in one place</p>
        <p className="text-muted-foreground max-w-sm text-sm">
          Connect an account and we’ll detect recurring charges — keep, skip, or
          cancel each.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardShell key={i} title="Loading" state="loading" />
        ))}
      </div>
    )
  }
  if (query.isError) {
    return (
      <CardShell
        title="Subscriptions"
        state="error"
        errorMessage="Couldn’t load subscriptions."
        onRetry={() => void query.refetch()}
      />
    )
  }
  if (series.length === 0) {
    return (
      <div className="border-border/70 bg-card/40 flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-12 text-center">
        <Repeat className="text-muted-foreground size-7" />
        <p className="font-medium">No subscriptions detected yet</p>
        <p className="text-muted-foreground max-w-sm text-sm">
          As recurring charges build up, they’ll show up here to manage.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="border-border/60 bg-card rounded-2xl border p-4">
        <div className="text-muted-foreground/70 text-[11px] font-semibold uppercase tracking-wide">
          Monthly subscriptions
        </div>
        <div className="uk-nums mt-0.5 text-[1.9rem] font-semibold tabular-nums tracking-tight">
          {formatMoney(monthly)}
        </div>
        <div className="text-muted-foreground mt-1 text-xs">
          {active.length} active · {formatMoney(monthly * 12)}/yr
        </div>
      </div>

      <ul className="space-y-2">
        {series.map((s) => (
          <SeriesRow
            key={`${s.namespace}-${s.key}`}
            series={s}
            busy={act.isPending}
            onAction={(p) => act.mutate(p)}
          />
        ))}
      </ul>
    </div>
  )
}

function SeriesRow({
  series,
  busy,
  onAction,
}: {
  series: RecurringSeries
  busy: boolean
  onAction: (payload: ReviewActionPayload) => void
}) {
  const ra = series.reviewActions ?? {}
  const dimmed = series.status !== 'active'
  return (
    <li
      className={cn(
        'border-border/60 bg-card rounded-xl border p-3.5',
        dimmed && 'opacity-60',
      )}
    >
      <div className="flex items-center gap-3">
        <MerchantChip name={series.name} size={34} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{series.name}</span>
            {series.status !== 'active' ? (
              <Badge variant="outline" className="text-[10px] capitalize">
                {series.status}
              </Badge>
            ) : null}
          </div>
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span className="capitalize">{series.cadence}</span>
            {series.nextDueDate ? (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="size-3" />
                {formatDate(series.nextDueDate, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="uk-nums text-sm font-semibold tabular-nums">
            {formatMoney(series.monthlyAmount)}
          </div>
          <div className="text-muted-foreground text-[10px]">/mo</div>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-end gap-1.5">
        {busy ? (
          <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
        ) : null}
        {series.status !== 'active' && ra.activate ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5"
            disabled={busy}
            onClick={() => ra.activate && onAction(ra.activate)}
          >
            Keep
          </Button>
        ) : null}
        {ra.skip ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5"
            disabled={busy}
            onClick={() => ra.skip && onAction(ra.skip)}
          >
            Skip next
          </Button>
        ) : null}
        {ra.dismiss ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive h-7 px-2.5"
            disabled={busy}
            onClick={() => ra.dismiss && onAction(ra.dismiss)}
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </li>
  )
}
