import { TrendingDown, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn } from '@moldable-ai/ui'
import { formatMoney } from '../../ui-kit/lib/format'
import { type BalanceSnapshot, useBalanceSnapshots } from '../data/accounts'

type Metric = { kind: string; label: string }

// The aggregate snapshot kinds the backend writes each sync. We show a tab per
// metric that actually has history, so users without investments don't see an
// empty Investments tab.
const METRICS: Metric[] = [
  { kind: 'netWorth', label: 'Net worth' },
  { kind: 'assets', label: 'Assets' },
  { kind: 'liabilities', label: 'Debts' },
  { kind: 'investment', label: 'Investments' },
]

/**
 * A compact balance trend on the Accounts summary card, backed by the snapshot
 * collections the backend writes each sync. A small metric switcher flips
 * between net worth / assets / debts / investments; each draws a hand-rolled SVG
 * sparkline (matching the ui-kit chart style) plus the change since the first
 * tracked point. History accrues one row per sync, so a brand-new workspace
 * shows a gentle "tracking starts now" hint instead of a misleading flat line.
 */
export function NetWorthTrend({ enabled = true }: { enabled?: boolean }) {
  const [metric, setMetric] = useState('netWorth')

  // One query per aggregate kind (fixed order → hook-safe). Cheap: a handful of
  // rows each, and they share the same backend shard reads.
  const net = useBalanceSnapshots('netWorth', enabled)
  const assets = useBalanceSnapshots('assets', enabled)
  const debts = useBalanceSnapshots('liabilities', enabled)
  const invest = useBalanceSnapshots('investment', enabled)
  const byKind: Record<string, BalanceSnapshot[]> = {
    netWorth: net.data ?? [],
    assets: assets.data ?? [],
    liabilities: debts.data ?? [],
    investment: invest.data ?? [],
  }
  const anyLoading =
    net.isLoading || assets.isLoading || debts.isLoading || invest.isLoading

  // Only offer tabs for metrics that have at least one snapshot.
  const available = METRICS.filter((m) => (byKind[m.kind] ?? []).length > 0)
  const points = byKind[metric] ?? []

  if (anyLoading) return null
  // Nothing tracked yet at all → the building-history hint (no tabs).
  if (available.length === 0) {
    return (
      <p className="border-border/50 text-muted-foreground mt-3 border-t pt-3 text-xs">
        Your balance trend will chart here as history builds — we save a point
        each time your accounts sync.
      </p>
    )
  }

  return (
    <div className="border-border/50 mt-3 border-t pt-3">
      {available.length > 1 ? (
        <div
          role="group"
          aria-label="Trend metric"
          className="mb-2 flex flex-wrap gap-1"
        >
          {available.map((m) => (
            <button
              key={m.kind}
              type="button"
              onClick={() => setMetric(m.kind)}
              aria-pressed={metric === m.kind}
              className={cn(
                'rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors',
                metric === m.kind
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      ) : null}

      {points.length < 2 ? (
        <p className="text-muted-foreground text-xs">
          One point so far — the trend line fills in as your accounts sync over
          time.
        </p>
      ) : (
        <Sparkline points={points} />
      )}
    </div>
  )
}

function Sparkline({ points }: { points: BalanceSnapshot[] }) {
  const { path, area, up, delta, deltaPct, first, last } = useMemo(() => {
    const W = 100
    const H = 28
    const values = points.map((p) => p.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = max - min || 1
    const stepX = W / (points.length - 1)
    const xy = points.map((p, i) => {
      const x = i * stepX
      const y = H - ((p.value - min) / span) * H
      return [x, y] as const
    })
    const path = xy
      .map(
        ([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`,
      )
      .join(' ')
    const area = `${path} L${W},${H} L0,${H} Z`
    const first = values[0]
    const last = values[values.length - 1]
    const delta = last - first
    const deltaPct = first !== 0 ? (delta / Math.abs(first)) * 100 : 0
    return { path, area, up: delta >= 0, delta, deltaPct, first, last }
  }, [points])

  const tone = up ? 'text-success' : 'text-destructive'
  const stroke = up ? 'var(--success)' : 'var(--destructive)'

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div
          className={`flex items-center gap-1.5 text-xs font-medium ${tone}`}
        >
          {up ? (
            <TrendingUp className="size-3.5" />
          ) : (
            <TrendingDown className="size-3.5" />
          )}
          <span className="uk-nums tabular-nums">
            {up ? '+' : '−'}
            {formatMoney(Math.abs(delta))}
          </span>
          {Number.isFinite(deltaPct) && deltaPct !== 0 ? (
            <span className="text-muted-foreground">
              ({up ? '+' : '−'}
              {Math.abs(deltaPct).toFixed(1)}%)
            </span>
          ) : null}
        </div>
        <span className="text-muted-foreground text-[11px]">
          since {fmtDate(points[0].date)}
        </span>
      </div>
      <svg
        viewBox="0 0 100 28"
        preserveAspectRatio="none"
        className="mt-2 h-8 w-full"
        role="img"
        aria-label={`Trend from ${formatMoney(first)} to ${formatMoney(last)}`}
      >
        <path d={area} fill={stroke} fillOpacity={0.1} />
        <path
          d={path}
          fill="none"
          stroke={stroke}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </>
  )
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}
