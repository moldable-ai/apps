import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Unplug,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  cn,
} from '@moldable-ai/ui'
import { formatMoney, timeAgo } from '../../ui-kit/lib/format'
import { ManualAccountForm } from '../components/ManualAccountForm'
import { NetWorthTrend } from '../components/NetWorthTrend'
import { CardShell } from '../../ui-kit/cards'
import {
  type MoneyAccount,
  type MoneyConnection,
  type SyncModel,
  useAccountsList,
  useConnections,
  useDisconnect,
  useReconnect,
} from '../data/accounts'
import {
  accountCurrency,
  assetKindLabel,
  nativeValue,
  normalizedValue,
} from '../data/assets'

/** Accounts & connections management: status, last-synced, per-account sync, disconnect, add. */
export function AccountsScreen({
  onConnect,
  sync,
}: {
  onConnect?: () => void
  sync?: SyncModel
}) {
  const connectionsQuery = useConnections()
  const accountsQuery = useAccountsList()
  const disconnect = useDisconnect()
  const reconnect = useReconnect()
  const [pendingDisconnect, setPendingDisconnect] =
    useState<MoneyConnection | null>(null)
  const [addAssetOpen, setAddAssetOpen] = useState(false)
  const [editAsset, setEditAsset] = useState<MoneyAccount | null>(null)

  const connections = connectionsQuery.data ?? []
  const accounts = accountsQuery.data ?? []
  const manualAccounts = accounts.filter((a) => a.source === 'manual')
  const accountsByItem = new Map<string, MoneyAccount[]>()
  for (const a of accounts) {
    const key = a.itemId ?? a.connectionId ?? 'unknown'
    accountsByItem.set(key, [...(accountsByItem.get(key) ?? []), a])
  }

  // Use the signed net-worth contribution (matches the dashboard cards). When
  // the backend supplies `reportingValue` this is FX-normalized; otherwise it's
  // a best-effort native sum (the per-account rows show each native currency).
  const values = accounts.map(normalizedValue)
  const netWorth = values.reduce((s, v) => s + v, 0)
  const assets = values.filter((v) => v > 0).reduce((s, v) => s + v, 0)
  const liabilities = values
    .filter((v) => v < 0)
    .reduce((s, v) => s + Math.abs(v), 0)

  const loading = connectionsQuery.isLoading || accountsQuery.isLoading
  const busy = Boolean(sync?.busy)
  const hasReauth = connections.some((c) => c.status === 'needs_reauth')

  return (
    <div className="mx-auto max-w-3xl px-4 pb-[calc(var(--chat-safe-padding,0px)+5rem)] pt-6 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
          {busy ? (
            <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
              <Loader2 className="size-3.5 shrink-0 animate-spin text-[var(--chart-1)]" />
              <span>{sync?.label ?? 'Syncing…'}</span>
            </p>
          ) : sync?.phase === 'error' ? (
            <p className="text-destructive mt-1 flex items-center gap-1.5 text-sm">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{sync.label}</span>
            </p>
          ) : (
            <p className="text-muted-foreground mt-1 text-sm">
              {sync?.label ??
                'The banks, cards, and brokerages feeding your dashboards.'}
            </p>
          )}
        </div>
        {connections.length > 0 && sync ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => sync.runAll()}
            disabled={busy}
            aria-busy={busy}
          >
            <RefreshCw className={cn('size-3.5', busy && 'animate-spin')} />
            {busy
              ? sync.phase === 'processing'
                ? 'Updating…'
                : 'Syncing…'
              : 'Sync all'}
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <CardShell key={i} title="Loading" state="loading" />
          ))}
        </div>
      ) : connectionsQuery.isError || accountsQuery.isError ? (
        // Don't mistake a load failure for "no accounts" — that would tell a user
        // who *has* accounts that they have none and prompt a needless reconnect.
        <CardShell
          title="Accounts"
          state="error"
          errorMessage="Couldn’t load your accounts. Check that the app is running and try again."
          onRetry={() => {
            void connectionsQuery.refetch()
            void accountsQuery.refetch()
          }}
        />
      ) : connections.length === 0 ? (
        <div className="border-border/70 bg-card/40 flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center">
          <Building2 className="text-muted-foreground size-8" />
          <div>
            <p className="font-medium">No accounts connected</p>
            <p className="text-muted-foreground text-sm">
              Connect your first account to replace sample data with your real
              numbers.
            </p>
          </div>
          <Button onClick={onConnect}>
            <Plus className="size-4" />
            Connect an account
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="border-border/60 bg-card rounded-2xl border p-4">
            <div className="text-muted-foreground/70 text-[11px] font-semibold uppercase tracking-wide">
              Net worth
            </div>
            <div className="uk-nums mt-0.5 text-[1.9rem] font-semibold tabular-nums tracking-tight">
              {formatMoney(netWorth)}
            </div>
            <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs">
              <span>
                Assets{' '}
                <span className="uk-nums text-foreground font-medium">
                  {formatMoney(assets)}
                </span>
              </span>
              {liabilities > 0 ? (
                <span>
                  Debts{' '}
                  <span className="uk-nums text-foreground font-medium">
                    {formatMoney(liabilities)}
                  </span>
                </span>
              ) : null}
            </div>
            <NetWorthTrend />
          </div>

          {connections.map((conn) => (
            <ConnectionCard
              key={conn.itemId}
              connection={conn}
              accounts={accountsByItem.get(conn.itemId) ?? []}
              syncingThis={sync?.pendingItemId === conn.itemId}
              lockBusy={busy}
              onSync={sync ? () => sync.runOne(conn.itemId) : undefined}
              onDisconnect={() => setPendingDisconnect(conn)}
              onReconnect={() => reconnect.mutate(conn.itemId)}
              reconnecting={
                reconnect.isPending && reconnect.variables === conn.itemId
              }
              reconnectError={
                reconnect.isError && reconnect.variables === conn.itemId
                  ? (reconnect.error as Error).message
                  : null
              }
            />
          ))}

          <button
            type="button"
            onClick={onConnect}
            className="border-border/70 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-4 text-sm font-medium transition-colors"
          >
            <Plus className="size-4" />
            Connect another account
          </button>

          {/* Manual accounts — assets or liabilities Plaid can't see (home, mortgage…). */}
          <div className="pt-2">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Manual accounts</h2>
                <p className="text-muted-foreground text-xs">
                  Track a home, car, mortgage, or loan — counts toward net
                  worth.
                </p>
              </div>
              {manualAccounts.length ? (
                <button
                  type="button"
                  onClick={() => setAddAssetOpen(true)}
                  className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 text-xs font-medium"
                >
                  <Plus className="size-3.5" /> Add
                </button>
              ) : null}
            </div>
            {manualAccounts.length ? (
              <div className="divide-border/50 border-border/60 bg-card divide-y overflow-hidden rounded-2xl border">
                {manualAccounts.map((a) => {
                  const v = nativeValue(a)
                  const liability = a.isLiability || v < 0
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setEditAsset(a)}
                      className="hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                    >
                      <span className="bg-muted text-foreground/80 flex size-9 shrink-0 items-center justify-center rounded-lg">
                        <Wallet className="size-4.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {a.name}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {assetKindLabel(a)}
                          {a.asOf ? ` · as of ${timeAgo(a.asOf)}` : ''}
                        </div>
                      </div>
                      <div
                        className={cn(
                          'uk-nums shrink-0 text-sm font-semibold tabular-nums',
                          liability && 'text-destructive',
                        )}
                      >
                        {formatMoney(v, { currency: accountCurrency(a) })}
                      </div>
                      <Pencil className="text-muted-foreground/50 size-3.5 shrink-0" />
                    </button>
                  )
                })}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddAssetOpen(true)}
                className="border-border/70 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-4 text-sm font-medium transition-colors"
              >
                <Plus className="size-4" />
                Add a manual account (home, mortgage, …)
              </button>
            )}
          </div>
        </div>
      )}

      {sync?.error ? (
        <p role="alert" className="text-destructive mt-3 text-sm">
          {sync.error}
        </p>
      ) : sync && sync.partialFailedCount > 0 ? (
        <p
          role="alert"
          className="text-warning mt-3 flex items-start gap-1.5 text-sm"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Synced, but {sync.partialFailedCount}{' '}
            {sync.partialFailedCount === 1 ? 'account' : 'accounts'} couldn’t
            update. {hasReauth ? 'Reconnect below.' : 'Try again.'}
          </span>
        </p>
      ) : null}

      <AlertDialog
        open={pendingDisconnect !== null}
        onOpenChange={(o) => !o && setPendingDisconnect(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Disconnect{' '}
              {pendingDisconnect?.institutionName ?? 'this institution'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Its accounts and transactions will stop updating and be removed
              from your dashboards. You can reconnect later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep connected</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDisconnect)
                  disconnect.mutate(pendingDisconnect.itemId)
                setPendingDisconnect(null)
              }}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ManualAccountForm
        open={addAssetOpen}
        onClose={() => setAddAssetOpen(false)}
      />
      <ManualAccountForm
        open={editAsset !== null}
        account={editAsset}
        onClose={() => setEditAsset(null)}
      />
    </div>
  )
}

const SYNC_BTN =
  'inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors ' +
  'hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40'

function ConnectionCard({
  connection,
  accounts,
  syncingThis,
  lockBusy,
  onSync,
  onDisconnect,
  onReconnect,
  reconnecting,
  reconnectError,
}: {
  connection: MoneyConnection
  accounts: MoneyAccount[]
  syncingThis: boolean
  lockBusy: boolean
  onSync?: () => void
  onDisconnect: () => void
  onReconnect?: () => void
  reconnecting?: boolean
  reconnectError?: string | null
}) {
  const needsReauth = connection.status === 'needs_reauth'
  const errored = connection.status === 'error' || Boolean(connection.error)
  const firstWarning =
    connection.warnings
      ?.map((w) => (typeof w === 'string' ? w : w?.message))
      .find(Boolean) ?? null

  return (
    <div
      className={cn(
        'border-border/60 bg-card rounded-2xl border p-4 transition-opacity',
        syncingThis && 'opacity-95',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
            <Building2 className="size-4.5 text-foreground/80" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-semibold">
                {connection.institutionName ?? 'Institution'}
              </span>
              {syncingThis ? (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <Loader2 className="size-3 animate-spin" /> Syncing…
                </Badge>
              ) : needsReauth ? (
                <Badge variant="destructive" className="gap-1 text-[10px]">
                  <AlertCircle className="size-3" /> Reconnect needed
                </Badge>
              ) : errored ? (
                <Badge variant="destructive" className="gap-1 text-[10px]">
                  <AlertCircle className="size-3" /> Needs attention
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <CheckCircle2 className="text-success size-3" /> Connected
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              {accounts.length} account{accounts.length === 1 ? '' : 's'}
              {syncingThis ? null : (
                <> · synced {timeAgo(connection.lastSyncAt)}</>
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {needsReauth ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onReconnect}
              disabled={reconnecting}
            >
              {reconnecting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RotateCcw className="size-3.5" />
              )}
              Reconnect
            </Button>
          ) : onSync ? (
            <button
              type="button"
              onClick={onSync}
              disabled={lockBusy}
              aria-label={`Sync ${connection.institutionName ?? 'this institution'}`}
              title={
                lockBusy && !syncingThis
                  ? 'A sync is already running'
                  : 'Sync now'
              }
              className={SYNC_BTN}
            >
              <RefreshCw
                className={cn('size-4', syncingThis && 'animate-spin')}
              />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDisconnect}
            aria-label={`Disconnect ${connection.institutionName ?? 'this institution'}`}
            className="text-muted-foreground hover:bg-muted hover:text-destructive inline-flex size-7 items-center justify-center rounded-md"
          >
            <Unplug className="size-4" />
          </button>
        </div>
      </div>

      {needsReauth ? (
        <p className="text-destructive mt-2 text-xs">
          {reconnectError
            ? `Couldn’t start reconnect: ${reconnectError}`
            : `${connection.institutionName ?? 'This institution'} needs you to sign in again to keep syncing.`}
        </p>
      ) : errored && (connection.error?.message || firstWarning) ? (
        <p className="text-destructive mt-2 text-xs">
          {connection.error?.message ?? firstWarning}
        </p>
      ) : null}

      {accounts.length ? (
        <ul className="divide-border/50 border-border/50 mt-3 divide-y border-t">
          {accounts.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{a.name}</div>
                <div className="text-muted-foreground text-xs capitalize">
                  {[a.subtype || a.type, a.mask ? `••${a.mask}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <div
                className={cn(
                  'uk-nums shrink-0 text-sm font-semibold tabular-nums transition-opacity',
                  syncingThis && 'opacity-50',
                )}
              >
                {typeof a.currentBalance === 'number'
                  ? formatMoney(a.currentBalance, {
                      currency: a.isoCurrencyCode,
                    })
                  : '—'}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
