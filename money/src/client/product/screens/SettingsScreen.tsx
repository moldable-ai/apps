import {
  Landmark,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Wand2,
} from 'lucide-react'
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@moldable-ai/ui'
import { timeAgo } from '../../ui-kit/lib/format'
import {
  type SyncModel,
  useSyncSettings,
  useUpdateSyncSettings,
} from '../data/accounts'
import { useLabelRules } from '../data/labeling'

const INTERVALS: Array<{ value: string; label: string }> = [
  { value: '60', label: 'Every hour' },
  { value: '360', label: 'Every 6 hours' },
  { value: '720', label: 'Every 12 hours' },
  { value: '1440', label: 'Once a day' },
]

/** Settings: sync schedule, data status, and onboarding controls. */
export function SettingsScreen({
  demoMode,
  onConnect,
  onReplayOnboarding,
  sync,
}: {
  demoMode: boolean
  onConnect?: () => void
  onReplayOnboarding?: () => void
  sync?: SyncModel
}) {
  const settingsQuery = useSyncSettings()
  const updateSettings = useUpdateSyncSettings()
  const rulesQuery = useLabelRules(!demoMode)
  const ruleCount = rulesQuery.data?.rules.length ?? 0

  const schedule = settingsQuery.data?.settings.sync
  const autoEnabled = schedule?.scheduledRefreshEnabled ?? false
  const interval = String(schedule?.intervalMinutes ?? 360)
  // Source the last-synced time from the shared poller so Settings never
  // disagrees with the rail / Accounts.
  const lastSync = sync?.lastSyncAt ?? settingsQuery.data?.syncState?.lastSyncAt
  const syncBusy = Boolean(sync?.busy)

  return (
    <div className="mx-auto max-w-2xl px-4 pb-[calc(var(--chat-safe-padding,0px)+5rem)] pt-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Data, syncing, and your setup.
        </p>
      </div>

      <div className="space-y-6">
        <Section title="Data">
          <Row
            label={demoMode ? 'Sample data' : 'Live data'}
            hint={
              demoMode
                ? 'You’re exploring with sample numbers.'
                : 'Your dashboards reflect your connected accounts.'
            }
          >
            {demoMode ? (
              <Button size="sm" onClick={onConnect}>
                <Landmark className="size-3.5" />
                Connect
              </Button>
            ) : (
              <span className="text-success inline-flex items-center gap-1.5 text-xs font-medium">
                <Sparkles className="size-3.5" /> Live
              </span>
            )}
          </Row>
        </Section>

        {!demoMode ? (
          <Section title="Syncing">
            <Row
              label="Auto-refresh"
              hint="Pull new transactions on a schedule."
            >
              <Switch
                aria-label="Auto-refresh transactions on a schedule"
                checked={autoEnabled}
                onCheckedChange={(v) =>
                  updateSettings.mutate({ scheduledRefreshEnabled: v })
                }
                disabled={settingsQuery.isLoading || updateSettings.isPending}
              />
            </Row>
            {autoEnabled ? (
              <Row label="Frequency">
                <Select
                  value={interval}
                  onValueChange={(v) =>
                    updateSettings.mutate({ intervalMinutes: Number(v) })
                  }
                >
                  <SelectTrigger className="h-8 w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVALS.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>
            ) : null}
            <Row
              label="Last synced"
              hint={syncBusy ? (sync?.label ?? 'Syncing…') : timeAgo(lastSync)}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => sync?.runAll()}
                disabled={!sync || syncBusy}
                aria-busy={syncBusy}
              >
                {syncBusy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                Sync now
              </Button>
            </Row>
          </Section>
        ) : null}

        {!demoMode ? (
          <Section title="Labeling">
            <Row
              label="Rules you’ve taught"
              hint={
                ruleCount > 0
                  ? 'Future transactions auto-label from your past choices.'
                  : 'Categorize spending and we’ll remember it for next time.'
              }
            >
              <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                <Wand2 className="size-3.5 text-[var(--chart-4)]" />
                {ruleCount}
              </span>
            </Row>
          </Section>
        ) : null}

        <Section title="Setup">
          <Row label="Onboarding" hint="See the dashboard install flow again.">
            <Button variant="outline" size="sm" onClick={onReplayOnboarding}>
              <RotateCcw className="size-3.5" />
              Restart
            </Button>
          </Row>
        </Section>
      </div>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="text-muted-foreground/80 mb-2 text-[11px] font-semibold uppercase tracking-[0.06em]">
        {title}
      </div>
      <div className="divide-border/50 border-border/60 bg-card divide-y overflow-hidden rounded-xl border">
        {children}
      </div>
    </div>
  )
}

function Row({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint ? (
          <div className="text-muted-foreground truncate text-xs">{hint}</div>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
