import { AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@moldable-ai/ui'
import type { SyncModel } from '../data/accounts'

/**
 * The always-visible "is anything happening?" signal, sized for the dashboards
 * pill rail. Quietly shows the last sync time when idle; a spinner + phase label
 * while an ETL pass runs ("Importing transactions…", "Building your dashboards…");
 * and a destructive cue when a connection needs attention. Tapping it triggers a
 * sync when idle, or jumps to Accounts when something's wrong.
 */
export function SyncStatusPill({
  model,
  onOpenAccounts,
}: {
  model: SyncModel
  onOpenAccounts?: () => void
}) {
  const { phase, busy, isStale } = model
  const isError = phase === 'error'

  // Compact label for the rail; the full phase label rides in the tooltip.
  const text = busy
    ? model.label.replace(/…$/, '…')
    : isError
      ? 'Needs attention'
      : model.lastSyncAt
        ? `Updated ${model.label.replace(/^Updated /, '')}`
        : 'Sync'

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        if (isError) onOpenAccounts?.()
        else if (!busy) model.runAll()
      }}
      aria-label={
        busy
          ? model.label
          : isError
            ? 'See accounts that need attention'
            : 'Sync now'
      }
      title={busy ? model.label : isError ? model.label : 'Sync now'}
      className={cn(
        'group inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors',
        isError
          ? 'border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10'
          : 'border-border/60 bg-card text-muted-foreground hover:text-foreground',
        busy && 'cursor-default',
      )}
    >
      {busy ? (
        <Loader2 className="size-3.5 shrink-0 animate-spin text-[var(--chart-1)]" />
      ) : isError ? (
        <AlertCircle className="size-3.5 shrink-0" />
      ) : (
        <span
          className={cn(
            'size-2 shrink-0 rounded-full',
            // Green = genuinely fresh. Never-synced shows neutral, stale amber.
            !model.lastSyncAt
              ? 'bg-muted-foreground/40'
              : isStale
                ? 'bg-warning'
                : 'bg-success',
          )}
          aria-hidden
        />
      )}
      <span className="max-w-[18ch] truncate">{text}</span>
      {!busy && !isError ? (
        <RefreshCw className="text-muted-foreground/40 group-hover:text-muted-foreground size-3 shrink-0 transition-colors" />
      ) : null}
    </button>
  )
}
