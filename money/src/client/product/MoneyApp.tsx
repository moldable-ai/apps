import { AlertCircle, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type AppCommand,
  Button,
  useMoldableAppCommands,
  useMoldableCommands,
} from '@moldable-ai/ui'
import { ConnectBanner } from './components/ConnectBanner'
import { ConnectDialog } from './components/ConnectDialog'
import { FirstSyncSetup } from './components/FirstSyncSetup'
import { PostConnectCelebration } from './components/PostConnectCelebration'
import { type Tab, TabBar } from './components/TabBar'
import { Toaster } from './components/Toaster'
import { useConnections, useSyncStatusModel } from './data/accounts'
import { DEMO_DASHBOARD_BY_ID } from './data/demo'
import {
  type ResolvedDashboard,
  useDataHealth,
  useProvisionDashboards,
  useReorderDashboards,
  useResolvedDashboards,
} from './data/hooks'
import { useReviewCount } from './data/labeling'
import {
  useCelebrated,
  useDashboardOrder,
  useOnboarding,
} from './data/onboarding'
import { PERSONA_DASHBOARDS } from './personas'
import { AccountsScreen } from './screens/AccountsScreen'
import { DashboardsView } from './screens/DashboardsView'
import { OnboardingCarousel } from './screens/OnboardingCarousel'
import { ReviewScreen } from './screens/ReviewScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { TransactionsScreen } from './screens/TransactionsScreen'

const PERSONA_IDS = PERSONA_DASHBOARDS.map((p) => p.id)

/**
 * The Money product. First-run "install a dashboard" carousel → the installed
 * dashboards on sample data (badged DEMO, with a prompt to connect a real
 * account) → live data once connected. Top-level sections live in a bottom tab
 * bar; Dashboards is one scroll of all dashboards with reorderable pills.
 */
export function MoneyApp() {
  const ob = useOnboarding()
  const live = useResolvedDashboards()
  const provision = useProvisionDashboards()
  const dataHealth = useDataHealth()

  const accounts = dataHealth.data?.counts.accounts
  const accountsKnown = accounts !== undefined
  const hasAccounts = (accounts ?? 0) > 0

  // `?ftue` previews the whole first-run + sample-data flow on any workspace;
  // `?celebrate` previews the one-time post-connect celebration overlay.
  const { forcedFtue, forceCelebrate, forceSetup } = useMemo(() => {
    if (typeof window === 'undefined')
      return { forcedFtue: false, forceCelebrate: false, forceSetup: false }
    const params = new URLSearchParams(window.location.search)
    return {
      forcedFtue: params.has('ftue'),
      forceCelebrate: params.has('celebrate'),
      forceSetup: params.has('setup'),
    }
  }, [])

  const connectionsQuery = useConnections()
  // The real account count (not the connected-institution count) for the rail pill.
  const accountCount =
    dataHealth.data?.counts.accounts ?? connectionsQuery.data?.length
  // One sync/ETL poller for the whole app, shared by the global pill + Accounts.
  const sync = useSyncStatusModel(accountsKnown && hasAccounts)
  const reviewCount = useReviewCount(!forcedFtue && hasAccounts)
  const { order, setOrder } = useDashboardOrder()
  const reorderDashboards = useReorderDashboards()

  const [view, setView] = useState<Tab>('dashboards')
  const [continued, setContinued] = useState(false)
  const [reopen, setReopen] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)
  const [pendingInstall, setPendingInstall] = useState<string[]>(ob.installed)

  // Existing users with a connected account skip the carousel: auto-install the
  // curated dashboards once so the home is never empty.
  const autoCompleted = useRef(false)
  useEffect(() => {
    if (autoCompleted.current || forcedFtue) return
    if (accountsKnown && hasAccounts && !ob.onboarded) {
      autoCompleted.current = true
      ob.complete(PERSONA_IDS)
      provision.mutate(PERSONA_IDS)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountsKnown, hasAccounts, ob.onboarded, forcedFtue])

  const needsOnboard = accountsKnown && !hasAccounts && !ob.onboarded
  const showCarousel = (!continued && (forcedFtue || needsOnboard)) || reopen

  const installedIds = ob.installed.length ? ob.installed : pendingInstall
  const demoMode = forcedFtue || (accountsKnown && !hasAccounts)

  // One-time "your real numbers are in" celebration: fire the first time demo
  // data flips to a real connected account. We watch the demo→live transition
  // (not just `hasAccounts`) so existing/auto-onboarded users don't see it.
  const { celebrated, markCelebrated } = useCelebrated()
  const [celebrating, setCelebrating] = useState(forceCelebrate)
  const wasDemoRef = useRef<boolean | null>(null)
  useEffect(() => {
    if (!accountsKnown) return
    const prev = wasDemoRef.current
    wasDemoRef.current = demoMode
    if (prev === true && demoMode === false && !celebrated) {
      setCelebrating(true)
      markCelebrated()
    }
  }, [accountsKnown, demoMode, celebrated, markCelebrated])

  const dashboards: ResolvedDashboard[] = useMemo(() => {
    const base: ResolvedDashboard[] = demoMode
      ? installedIds
          .map((id) => DEMO_DASHBOARD_BY_ID[id])
          .filter((d): d is ResolvedDashboard => Boolean(d))
      : // Live mode: ALL backend dashboards (so agent-created ones appear).
        [...live.dashboards]
    // Apply the user's drag-to-reorder order (first = default), then personas,
    // then anything else, so new/unordered dashboards still show.
    const userRank = new Map(order.map((id, i) => [id, i]))
    const personaRank = new Map(PERSONA_IDS.map((id, i) => [id, 100 + i]))
    const rank = (id: string) => userRank.get(id) ?? personaRank.get(id) ?? 999
    return base.sort((a, b) => rank(a.id) - rank(b.id))
  }, [demoMode, installedIds, live.dashboards, order])

  // Reorder: optimistic local order for instant feedback, then persist to the
  // server (live only) so the default syncs across devices.
  const handleReorder = useCallback(
    (ids: string[]) => {
      setOrder(ids)
      if (!demoMode) reorderDashboards.mutate(ids)
    },
    [setOrder, demoMode, reorderDashboards],
  )

  // Adopt the server's saved order on first live load, so a default arranged on
  // another device shows here. Once the user drags, local order takes over and
  // writes back to the server.
  const adoptedOrder = useRef(false)
  useEffect(() => {
    if (adoptedOrder.current || demoMode) return
    if (!live.isLoading && live.dashboards.length > 0 && order.length === 0) {
      adoptedOrder.current = true
      setOrder(live.dashboards.map((d) => d.id))
    }
  }, [demoMode, live.isLoading, live.dashboards, order.length, setOrder])

  // First-sync ETL takeover: when a brand-new connection lands we kick off the
  // initial sync (`complete-link` only marks the item connected — it doesn't
  // import), set `setupActive`, and show "Setting up your money" until cards
  // materialize. Tracked explicitly (not inferred from `sync.busy`) so existing
  // users never see it, even mid-background-sync.
  const liveCardCount = useMemo(
    () => live.dashboards.reduce((n, d) => n + d.cards.length, 0),
    [live.dashboards],
  )
  const [setupActive, setSetupActive] = useState(false)
  const sawSetupBusy = useRef(false)
  useEffect(() => {
    if (!setupActive) {
      sawSetupBusy.current = false
      return
    }
    if (sync.busy) sawSetupBusy.current = true
    // Exit once cards land (success) or the pass finished without them (error/no-op).
    else if (liveCardCount > 0 || sawSetupBusy.current) setSetupActive(false)
  }, [setupActive, sync.busy, liveCardCount])
  const firstSync = forceSetup || setupActive

  const changeTab = (tab: Tab) => setView(tab)

  const toggleInstall = useCallback(
    (id: string) => {
      setPendingInstall((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id)
        provision.mutate([id])
        return [...prev, id]
      })
    },
    [provision],
  )

  const finishCarousel = () => {
    ob.complete(pendingInstall)
    provision.mutate(pendingInstall)
    setOrder(pendingInstall)
    setContinued(true)
    setReopen(false)
    setView('dashboards')
  }

  const connect = () => setConnectOpen(true)

  // A brand-new connection just landed → import its data and show the setup state.
  const handleConnected = () => {
    setSetupActive(true)
    sync.runAll()
  }

  // Publish quick actions to the host command menu (discoverable + agent-friendly).
  const commands = useMemo<AppCommand[]>(
    () => [
      {
        id: 'money.dashboards',
        label: 'Dashboards',
        icon: 'LayoutGrid',
        group: 'Money',
        action: { type: 'message', payload: null, command: 'money.dashboards' },
      },
      {
        id: 'money.review',
        label: 'Review',
        description: reviewCount > 0 ? `${reviewCount} need you` : undefined,
        icon: 'Inbox',
        group: 'Money',
        action: { type: 'message', payload: null, command: 'money.review' },
      },
      {
        id: 'money.activity',
        label: 'Transactions',
        icon: 'Receipt',
        group: 'Money',
        action: { type: 'message', payload: null, command: 'money.activity' },
      },
      {
        id: 'money.accounts',
        label: 'Accounts',
        icon: 'Building2',
        group: 'Money',
        action: { type: 'message', payload: null, command: 'money.accounts' },
      },
      {
        id: 'money.connect',
        label: 'Connect an account',
        icon: 'Landmark',
        group: 'Money',
        action: { type: 'message', payload: null, command: 'money.connect' },
      },
      {
        id: 'money.settings',
        label: 'Settings',
        icon: 'Settings',
        group: 'Money',
        action: { type: 'message', payload: null, command: 'money.settings' },
      },
    ],
    [reviewCount],
  )
  useMoldableAppCommands('money', commands)
  useMoldableCommands({
    'money.dashboards': () => changeTab('dashboards'),
    'money.review': () => changeTab('review'),
    'money.activity': () => changeTab('transactions'),
    'money.accounts': () => changeTab('accounts'),
    'money.settings': () => changeTab('settings'),
    'money.connect': () => setConnectOpen(true),
  })

  // Wait for the account signal before deciding carousel, demo, or live mode.
  if (!forcedFtue && !accountsKnown) {
    // A transient failure of the one bootstrap query must not dead-end on a
    // blank screen — give a clear error with a retry instead.
    if (dataHealth.isError) {
      return (
        <main className="bg-background text-foreground flex min-h-[100dvh] flex-col items-center justify-center gap-3 px-6 text-center">
          <AlertCircle className="text-muted-foreground size-9" />
          <div>
            <p className="font-medium">Couldn’t load your money</p>
            <p className="text-muted-foreground mt-1 max-w-sm text-sm">
              Something went wrong reaching Money. Make sure the app is running,
              then try again.
            </p>
          </div>
          <Button
            onClick={() => void dataHealth.refetch()}
            disabled={dataHealth.isFetching}
          >
            {dataHealth.isFetching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Try again
          </Button>
        </main>
      )
    }
    return <main className="bg-background min-h-[100dvh]" />
  }

  if (showCarousel) {
    return (
      <main className="bg-background text-foreground min-h-[100dvh]">
        <OnboardingCarousel
          installed={pendingInstall}
          onToggle={toggleInstall}
          onContinue={finishCarousel}
        />
      </main>
    )
  }

  // First-sync takeover: a brand-new connection is importing → show the setup
  // state full-screen until the dashboards materialize.
  if (firstSync) {
    return (
      <main className="bg-background text-foreground min-h-[100dvh]">
        <FirstSyncSetup label={sync.busy ? sync.label : undefined} />
        <Toaster />
      </main>
    )
  }

  return (
    <main className="bg-background text-foreground min-h-[100dvh]">
      {demoMode ? <ConnectBanner onConnect={connect} /> : null}

      {view === 'dashboards' ? (
        <DashboardsView
          dashboards={dashboards}
          isLoading={!demoMode && live.isLoading}
          isError={!demoMode && live.isError}
          demo={demoMode}
          accountCount={accountCount}
          reviewCount={reviewCount}
          onReorder={handleReorder}
          onAddDashboard={() => {
            setPendingInstall(ob.installed)
            setContinued(false)
            setReopen(true)
          }}
          onOpenAccounts={() => changeTab('accounts')}
          onOpenReview={() => changeTab('review')}
          sync={demoMode ? undefined : sync}
        />
      ) : view === 'review' ? (
        <ReviewScreen demo={demoMode} />
      ) : view === 'transactions' ? (
        <TransactionsScreen demo={demoMode} onConnect={connect} />
      ) : view === 'accounts' ? (
        <AccountsScreen
          onConnect={connect}
          sync={demoMode ? undefined : sync}
        />
      ) : (
        <SettingsScreen
          demoMode={demoMode}
          onConnect={connect}
          onReplayOnboarding={() => ob.reset()}
          sync={demoMode ? undefined : sync}
        />
      )}

      <TabBar
        active={view}
        onChange={changeTab}
        badges={{ review: reviewCount }}
      />
      <ConnectDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        onConnected={handleConnected}
      />
      <Toaster />

      {celebrating ? (
        <PostConnectCelebration
          accounts={dataHealth.data?.counts.accounts ?? accountCount}
          transactions={dataHealth.data?.counts.transactions}
          onDismiss={() => {
            setCelebrating(false)
            setView('dashboards')
          }}
        />
      ) : null}
    </main>
  )
}
