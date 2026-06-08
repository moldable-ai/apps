import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  Database,
  ExternalLink,
  LayoutGrid,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, useWorkspace } from '@moldable-ai/ui'
import { navigate } from './ui-kit/router'

interface PlaidStatus {
  appUrl: string
  redirectUri: string
  environment: 'production'
  capabilities: {
    linkToken: {
      id: string
      available: boolean
      error?: string
    }
    publicTokenExchange: {
      id: string
      available: boolean
      error?: string
    }
    accountsSync: {
      id: string
      available: boolean
      error?: string
    }
    transactionsSync: {
      id: string
      available: boolean
      error?: string
    }
    itemRemove: {
      id: string
      available: boolean
      error?: string
    }
    liabilitiesSync: {
      id: string
      available: boolean
      error?: string
    }
    investmentsSync: {
      id: string
      available: boolean
      error?: string
    }
  }
  setupHint: string
  readiness: {
    endpoint: string
    method: 'POST'
    description: string
  }
}

interface PlaidReadinessResult {
  ok: boolean
  checkedAt: string
  linkTokenCreated: boolean
  expiration?: string
  requestId?: string
  redirectUri: string
  capabilityId: string
  environment: 'production'
  error?: {
    code: string
    message: string
    setupCommands?: string[]
  }
}

interface LinkTokenResponse {
  linkToken: string
  expiration?: string
  requestId?: string
  redirectUri: string
}

interface PlaidConnectSessionResponse {
  id: string
  url: string
  redirectUri: string
  expiresAt: string
  mode: 'create' | 'update'
  itemId?: string
  productsToAdd?: string[]
  requestId?: string
}

interface PlaidConnectSessionDetails {
  id: string
  linkToken: string
  workspaceId: string
  redirectUri: string
  expiresAt: string
  mode: 'create' | 'update'
  itemId?: string
  productsToAdd?: string[]
}

interface CompleteLinkResponse {
  ok: boolean
  exchanged?: boolean
  updated?: boolean
  message: string
}

interface EvaluatedCard {
  id: string
  title: string
  kind:
    | 'metric'
    | 'ratio'
    | 'list'
    | 'status'
    | 'trend'
    | 'breakdown'
    | 'entity-list'
    | 'optimizer'
    | 'comparison'
    | 'forecast'
  formula: string
  format: 'currency' | 'percent' | 'number' | 'compact' | 'duration' | 'date'
  value: unknown
  displayValue: string
}

interface CollectionMetric {
  id: string
  label: string
  value: number
  count: number
}

interface MoneySnapshot {
  generatedAt: string
  accounts: unknown[]
  transactions: unknown[]
  debts: unknown[]
  holdings: unknown[]
  collections: CollectionMetric[]
  cards: EvaluatedCard[]
}

interface MoneyConnection {
  itemId: string
  institutionName: string
  status: 'connected' | 'needs_reauth' | 'error'
  products: string[]
  connectedAt: string
  lastSyncAt?: string
  lastError?: string
}

interface SyncScheduleStatus {
  settings: {
    sync: {
      scheduledRefreshEnabled: boolean
      intervalMinutes: number
      updatedAt: string
    }
  }
  syncState: {
    status: 'idle' | 'blocked' | 'syncing' | 'error'
    lastAttemptAt?: string
    lastSyncAt?: string
    nextScheduledRunAt?: string
    lastError?: string
  }
  due: boolean
  reason: string
  connectionCount: number
  activeConnectionCount: number
  generatedAt: string
}

interface PlaidConnectionCheck {
  ok: boolean
  generatedAt: string
  counts: {
    connections: number
    activeConnections: number
    accounts: number
    transactions: number
    debts: number
    holdings: number
    rawEvidence: number
  }
  syncState: SyncScheduleStatus['syncState']
  checks: Array<{
    id: string
    ok: boolean
    label: string
    detail: string
    count?: number
  }>
}

interface AttentionSettingsResponse {
  settings: {
    largeTransactionThreshold: number
    lookbackDays: number
    categoryThresholds: Array<{
      category: string
      monthlyLimit: number
      enabled: boolean
    }>
    updatedAt: string
  }
  generatedAt: string
}

interface PlaidHandler {
  open: () => void
  exit: (options?: { force?: boolean }) => void
}

interface PlaidCreateOptions {
  token: string
  receivedRedirectUri?: string
  onSuccess: (publicToken: string | null, metadata: unknown) => void
  onExit?: (error: unknown, metadata: unknown) => void
  onEvent?: (eventName: string, metadata: unknown) => void
}

declare global {
  interface Window {
    Plaid?: {
      create: (options: PlaidCreateOptions) => PlaidHandler
    }
  }
}

const WORKSPACE_HEADER = 'x-moldable-workspace'
const PLAID_DASHBOARD_URL = 'https://dashboard.plaid.com/developers/api'
const PLAID_OAUTH_DOCS_URL = 'https://plaid.com/docs/link/oauth/'
const EXTERNAL_SESSION_KEY = 'money.plaid.externalSession'
const LINK_TOKEN_KEY = 'money.plaid.linkToken'
const WORKSPACE_ID_KEY = 'money.plaid.workspaceId'

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function openExternalUrl(url: string) {
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'moldable:open-url', url }, '*')
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

async function launchPlaidLink(options: {
  linkToken: string
  receivedRedirectUri?: string
  onSuccess: (publicToken: string | null, metadata: unknown) => void
  onExit?: (error: unknown, metadata: unknown) => void
  onEvent?: (eventName: string, metadata: unknown) => void
}) {
  await loadPlaidScript()
  if (!window.Plaid) throw new Error('Plaid Link is not available')

  window.Plaid.create({
    token: options.linkToken,
    receivedRedirectUri: options.receivedRedirectUri,
    onSuccess: options.onSuccess,
    onExit: options.onExit,
    onEvent: options.onEvent,
  }).open()
}

async function completePlaidLinkForWorkspace(
  workspaceId: string,
  publicToken: string,
  metadata: unknown,
): Promise<CompleteLinkResponse> {
  const res = await fetch('/api/plaid/complete-link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [WORKSPACE_HEADER]: workspaceId,
    },
    body: JSON.stringify({ publicToken, metadata }),
  })
  const body = await res.json()
  if (!res.ok) {
    const detail =
      typeof body?.error?.message === 'string'
        ? body.error.message
        : 'Failed to complete Plaid Link'
    throw new Error(detail)
  }
  return body as CompleteLinkResponse
}

async function completePlaidUpdateForWorkspace(
  workspaceId: string,
  sessionId: string,
  metadata: unknown,
): Promise<CompleteLinkResponse> {
  const res = await fetch('/api/plaid/complete-update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [WORKSPACE_HEADER]: workspaceId,
    },
    body: JSON.stringify({ sessionId, metadata }),
  })
  const body = await res.json()
  if (!res.ok) {
    const detail =
      typeof body?.error?.message === 'string'
        ? body.error.message
        : 'Failed to complete Plaid update'
    throw new Error(detail)
  }
  return body as CompleteLinkResponse
}

async function deletePlaidConnectSession(sessionId: string): Promise<void> {
  await fetch(`/api/plaid/connect-session/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
  }).catch(() => undefined)
}

function loadPlaidScript(): Promise<void> {
  if (window.Plaid) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-plaid-link]',
    )
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener(
        'error',
        () => reject(new Error('Plaid Link failed to load')),
        {
          once: true,
        },
      )
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
    script.async = true
    script.dataset.plaidLink = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Plaid Link failed to load'))
    document.head.append(script)
  })
}

function isOAuthReturn() {
  return window.location.pathname === '/plaid/oauth-return'
}

function getPlaidConnectSessionId() {
  const sessionId = new URLSearchParams(window.location.search).get('session')
  if (sessionId) return sessionId
  return isOAuthReturn() ? sessionStorage.getItem(EXTERNAL_SESSION_KEY) : null
}

function getReceivedRedirectUri() {
  return isOAuthReturn() ? window.location.href : undefined
}

const FORMULA_EXAMPLES = [
  '(Income.Sum() - Expenses.Sum()) / Income.Sum()',
  'Subscriptions.Monthly().Count()',
  'Expenses.Where(category = "Food").Sum()',
  'Runway(Cash.Sum(), Expenses.MonthlyAverage(6))',
  'DebtPayoff(Debt.Where(balance > 0))',
  'Expenses.Where(date >= 2026-06-01).Trend()',
  'Expenses.GroupBy(category).PercentOfTotal()',
  'Expenses.Sort(desc).Top(3)',
]

export function App() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<string | null>(null)
  const [lastMetadata, setLastMetadata] = useState<unknown>(null)
  const [formula, setFormula] = useState(
    '(Income.Sum() - Expenses.Sum()) / Income.Sum()',
  )
  const [formulaResult, setFormulaResult] = useState<unknown>(null)
  const receivedRedirectUri = useMemo(getReceivedRedirectUri, [])
  const plaidConnectSessionId = useMemo(getPlaidConnectSessionId, [])
  const isExternalPlaidConnect = plaidConnectSessionId !== null

  const statusQuery = useQuery({
    queryKey: ['plaid-status', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/plaid/status')
      if (!res.ok) throw new Error('Failed to load Plaid status')
      return (await res.json()) as PlaidStatus
    },
    enabled: !isExternalPlaidConnect,
  })

  const linkTokenMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithWorkspace('/api/plaid/link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: ['transactions'],
          optionalProducts: ['liabilities', 'investments'],
          countryCodes: ['US', 'CA'],
        }),
      })
      const body = await res.json()
      if (!res.ok) {
        const detail =
          typeof body?.error?.message === 'string'
            ? body.error.message
            : 'Failed to create Plaid Link token'
        throw new Error(detail)
      }
      return body as LinkTokenResponse
    },
  })

  const connectSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithWorkspace('/api/plaid/connect-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: ['transactions'],
          optionalProducts: ['liabilities', 'investments'],
          countryCodes: ['US', 'CA'],
        }),
      })
      const body = await res.json()
      if (!res.ok) {
        const detail =
          typeof body?.error?.message === 'string'
            ? body.error.message
            : 'Failed to create Plaid Link session'
        throw new Error(detail)
      }
      return body as PlaidConnectSessionResponse
    },
  })

  const readinessMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithWorkspace('/api/plaid/readiness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: ['transactions'],
          optionalProducts: ['liabilities', 'investments'],
          countryCodes: ['US'],
          timeoutMs: 5000,
        }),
      })
      if (!res.ok) throw new Error('Failed to run Plaid readiness check')
      return (await res.json()) as PlaidReadinessResult
    },
    onSuccess: (result) => {
      setMessage(
        result.ok
          ? `Plaid readiness passed: a Production Link token was created through ${result.capabilityId}.`
          : result.error?.code === 'plaid_credentials_missing'
            ? 'Plaid readiness needs Production credentials in aivault.'
            : `Plaid readiness failed: ${result.error?.message ?? 'Unknown error'}`,
      )
    },
  })

  const snapshotQuery = useQuery({
    queryKey: ['money-snapshot', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/money/snapshot')
      if (!res.ok) throw new Error('Failed to load Money snapshot')
      return (await res.json()) as MoneySnapshot
    },
    enabled: !isExternalPlaidConnect,
  })

  const connectionsQuery = useQuery({
    queryKey: ['money-connections', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/connections')
      if (!res.ok) throw new Error('Failed to load Money connections')
      return (await res.json()) as MoneyConnection[]
    },
    enabled: !isExternalPlaidConnect,
  })

  const syncScheduleQuery = useQuery({
    queryKey: ['money-sync-schedule', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/sync/settings')
      if (!res.ok) throw new Error('Failed to load sync settings')
      return (await res.json()) as SyncScheduleStatus
    },
    enabled: !isExternalPlaidConnect,
  })

  const connectionCheckQuery = useQuery({
    queryKey: ['plaid-connection-check', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/plaid/connection-check')
      if (!res.ok) throw new Error('Failed to load Plaid connection check')
      return (await res.json()) as PlaidConnectionCheck
    },
    enabled: !isExternalPlaidConnect,
  })

  const attentionSettingsQuery = useQuery({
    queryKey: ['money-attention-settings', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/attention/settings')
      if (!res.ok) throw new Error('Failed to load attention settings')
      return (await res.json()) as AttentionSettingsResponse
    },
    enabled: !isExternalPlaidConnect,
  })

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithWorkspace('/api/dev/seed', {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to seed sample money data')
      return res.json()
    },
    onSuccess: async () => {
      setMessage('Seed data loaded into the workspace data files.')
      await queryClient.invalidateQueries({
        queryKey: ['money-snapshot', workspaceId],
      })
    },
  })

  const formulaMutation = useMutation({
    mutationFn: async (nextFormula: string) => {
      const res = await fetchWithWorkspace('/api/cards/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formula: nextFormula }),
      })
      const body = await res.json()
      if (!res.ok) {
        const detail =
          typeof body?.error?.message === 'string'
            ? body.error.message
            : 'Formula evaluation failed'
        throw new Error(detail)
      }
      return body as { value: unknown }
    },
    onSuccess: (result) => setFormulaResult(result.value),
  })

  const completeLinkMutation = useMutation({
    mutationFn: async (payload: { publicToken: string; metadata: unknown }) => {
      const res = await fetchWithWorkspace('/api/plaid/complete-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json()
      if (!res.ok) throw new Error('Failed to complete Plaid Link')
      return body as { message: string }
    },
    onSuccess: async (result) => {
      setMessage(result.message)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['money-connections', workspaceId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['money-snapshot', workspaceId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['plaid-connection-check', workspaceId],
        }),
      ])
    },
  })

  const removeConnectionMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetchWithWorkspace(
        `/api/connections/${encodeURIComponent(itemId)}`,
        { method: 'DELETE' },
      )
      const body = await res.json()
      if (!res.ok) {
        const detail =
          typeof body?.error?.message === 'string'
            ? body.error.message
            : 'Failed to remove connection'
        throw new Error(detail)
      }
      return body as {
        removedConnection: MoneyConnection
        removedAccounts: number
        removedTransactions: number
        removedDebts: number
        removedHoldings: number
      }
    },
    onSuccess: async (result) => {
      setMessage(
        `Removed ${result.removedConnection.institutionName}: ${result.removedAccounts} accounts, ${result.removedTransactions} transactions, ${result.removedDebts} debts, and ${result.removedHoldings} holdings.`,
      )
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['money-connections', workspaceId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['money-snapshot', workspaceId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['plaid-connection-check', workspaceId],
        }),
      ])
    },
  })

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithWorkspace('/api/sync', { method: 'POST' })
      const body = await res.json()
      if (!res.ok) {
        const detail =
          Array.isArray(body?.errors) && body.errors.length
            ? body.errors.join('\n')
            : 'Failed to sync Plaid data'
        throw new Error(detail)
      }
      return body as {
        syncedConnections: number
        accounts: number
        transactions: number
        debts: number
        holdings: number
      }
    },
    onSuccess: async (result) => {
      setMessage(
        `Synced ${result.syncedConnections} connections: ${result.accounts} accounts, ${result.transactions} transactions, ${result.debts} debts, ${result.holdings} holdings.`,
      )
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['money-connections', workspaceId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['money-snapshot', workspaceId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['money-sync-schedule', workspaceId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['plaid-connection-check', workspaceId],
        }),
      ])
    },
  })

  const syncSettingsMutation = useMutation({
    mutationFn: async (patch: {
      scheduledRefreshEnabled?: boolean
      intervalMinutes?: number
    }) => {
      const res = await fetchWithWorkspace('/api/sync/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error('Failed to update sync settings')
      return (await res.json()) as SyncScheduleStatus
    },
    onSuccess: async () => {
      setMessage('Sync schedule updated.')
      await queryClient.invalidateQueries({
        queryKey: ['money-sync-schedule', workspaceId],
      })
    },
  })

  const attentionSettingsMutation = useMutation({
    mutationFn: async (patch: {
      largeTransactionThreshold?: number
      lookbackDays?: number
    }) => {
      const res = await fetchWithWorkspace('/api/attention/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error('Failed to update attention settings')
      return (await res.json()) as AttentionSettingsResponse
    },
    onSuccess: async () => {
      setMessage('Attention settings updated.')
      await attentionSettingsQuery.refetch()
    },
  })

  const runDueMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithWorkspace('/api/sync/run-due', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const body = await res.json()
      if (!res.ok) {
        const detail =
          Array.isArray(body?.errors) && body.errors.length
            ? body.errors.join('\n')
            : 'Failed to run scheduled sync'
        throw new Error(detail)
      }
      return body as {
        skipped: boolean
        reason?: string
        syncedConnections?: number
      }
    },
    onSuccess: async (result) => {
      setMessage(
        result.skipped
          ? `Scheduled sync skipped: ${result.reason ?? 'not due'}.`
          : `Scheduled sync ran for ${result.syncedConnections ?? 0} connection(s).`,
      )
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['money-connections', workspaceId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['money-snapshot', workspaceId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['money-sync-schedule', workspaceId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['plaid-connection-check', workspaceId],
        }),
      ])
    },
  })

  async function openPlaidLink(linkToken: string, redirectUri?: string) {
    setMessage(null)
    await launchPlaidLink({
      linkToken,
      receivedRedirectUri: redirectUri,
      onSuccess: (publicToken, metadata) => {
        setLastMetadata(metadata)
        const externalWorkspaceId = sessionStorage.getItem(WORKSPACE_ID_KEY)
        if (externalWorkspaceId) {
          if (!publicToken) {
            setMessage('Plaid Link completed without a public token.')
            return
          }
          void completePlaidLinkForWorkspace(
            externalWorkspaceId,
            publicToken,
            metadata,
          )
            .then((result) => {
              setMessage(result.message)
              sessionStorage.removeItem(EXTERNAL_SESSION_KEY)
              sessionStorage.removeItem(LINK_TOKEN_KEY)
              sessionStorage.removeItem(WORKSPACE_ID_KEY)
            })
            .catch((error) =>
              setMessage(
                `Failed to complete Plaid Link: ${errorMessage(
                  error,
                  'Unknown error',
                )}`,
              ),
            )
          return
        }

        if (!publicToken) {
          setMessage('Plaid Link completed without a public token.')
          return
        }
        completeLinkMutation.mutate({ publicToken, metadata })
      },
      onExit: (error) => {
        if (error) setMessage('Plaid Link exited with an error.')
      },
      onEvent: (eventName) => {
        if (eventName === 'OPEN_OAUTH') {
          setMessage(
            'Plaid opened an OAuth institution flow. Complete it in the browser, then return here if prompted.',
          )
        }
      },
    })
  }

  async function startPlaidLink() {
    setMessage(null)
    setLastMetadata(null)
    try {
      const result = await connectSessionMutation.mutateAsync()
      openExternalUrl(result.url)
      setMessage('Opening Plaid Link in your external browser.')
    } catch (error) {
      setMessage(
        `Failed to create Plaid Link session: ${errorMessage(
          error,
          'Unknown error',
        )}`,
      )
    }
  }

  async function resumePlaidOAuth() {
    const linkToken = sessionStorage.getItem(LINK_TOKEN_KEY)
    if (!linkToken) {
      setMessage('No Plaid Link token was found. Start the connection again.')
      return
    }
    try {
      await openPlaidLink(linkToken, receivedRedirectUri)
    } catch (error) {
      setMessage(
        `Failed to resume Plaid Link: ${errorMessage(error, 'Unknown error')}`,
      )
    }
  }

  useEffect(() => {
    if (receivedRedirectUri) {
      setMessage('Plaid OAuth returned to the local HTTPS app route.')
    }
  }, [receivedRedirectUri])

  const status = statusQuery.data
  const linkReady = status?.capabilities.linkToken.available === true
  const syncSchedule = syncScheduleQuery.data
  const attentionSettings = attentionSettingsQuery.data?.settings
  const isConnecting =
    connectSessionMutation.isPending ||
    linkTokenMutation.isPending ||
    completeLinkMutation.isPending

  if (plaidConnectSessionId) {
    return (
      <PlaidExternalConnect
        sessionId={plaidConnectSessionId}
        receivedRedirectUri={receivedRedirectUri}
      />
    )
  }

  return (
    <main className="bg-background text-foreground min-h-screen p-8 pb-[var(--chat-safe-padding)]">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
              <span>💵</span>
              Money
            </h1>
            <p className="text-muted-foreground mt-2 text-base">
              Connect real bank accounts with Plaid Production over Moldable
              local HTTPS.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="border-border bg-card rounded-md border px-3 py-2 text-xs">
              Workspace: {workspaceId}
            </div>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => navigate('/ui-kit')}
            >
              <LayoutGrid className="size-4" />
              UI Kit
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              disabled={isConnecting}
              onClick={() => void startPlaidLink()}
            >
              <Plus className="size-4" />
              Add bank account
            </Button>
          </div>
        </header>

        {statusQuery.isLoading ? (
          <section className="border-border bg-card rounded-lg border p-5">
            <div className="text-sm font-medium">Loading Plaid setup...</div>
            <p className="text-muted-foreground mt-2 text-sm">
              Checking the local HTTPS route and aivault Plaid capabilities.
            </p>
          </section>
        ) : null}

        {statusQuery.error ? (
          <section className="border-destructive/40 bg-card rounded-lg border p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="text-destructive size-4" />
              Money backend did not return Plaid status
            </div>
            <pre className="bg-muted text-muted-foreground mt-3 overflow-auto rounded-md p-3 text-xs">
              {statusQuery.error.message}
            </pre>
          </section>
        ) : null}

        {receivedRedirectUri ? (
          <section className="border-border bg-card rounded-lg border p-5">
            <h2 className="text-lg font-semibold">OAuth return received</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Plaid redirected back to this local HTTPS route. Resume Link to
              complete the public-token handoff.
            </p>
            <code className="bg-muted text-muted-foreground mt-4 block overflow-auto rounded-md px-3 py-2 text-xs">
              {receivedRedirectUri}
            </code>
            <Button
              type="button"
              className="mt-4 cursor-pointer"
              disabled={isConnecting}
              onClick={() => void resumePlaidOAuth()}
            >
              Resume Plaid Link
            </Button>
          </section>
        ) : null}

        <section className="border-border bg-card rounded-lg border p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Plaid production setup</h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Register this redirect URI in Plaid Dashboard for Production.
              </p>
            </div>
            {linkReady ? (
              <CheckCircle2 className="text-primary size-5" />
            ) : (
              <AlertCircle className="text-muted-foreground size-5" />
            )}
          </div>

          <div className="mt-4 grid gap-3">
            <div>
              <div className="text-muted-foreground text-xs">App URL</div>
              <code className="bg-muted mt-1 block overflow-auto rounded-md px-3 py-2 text-xs">
                {status?.appUrl ?? 'Loading...'}
              </code>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Redirect URI</div>
              <code className="bg-muted mt-1 block overflow-auto rounded-md px-3 py-2 text-xs">
                {status?.redirectUri ?? 'Loading...'}
              </code>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              className="cursor-pointer"
              disabled={isConnecting}
              onClick={() => void startPlaidLink()}
            >
              <ExternalLink className="size-4" />
              Add bank account
            </Button>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={readinessMutation.isPending}
              onClick={() => readinessMutation.mutate()}
            >
              Check Plaid readiness
            </Button>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => void statusQuery.refetch()}
            >
              Refresh status
            </Button>
          </div>

          {readinessMutation.data ? (
            <div className="border-border bg-background mt-5 rounded-md border p-4 text-sm">
              <div className="font-medium">
                {readinessMutation.data.ok
                  ? 'Plaid readiness passed'
                  : 'Plaid readiness failed'}
              </div>
              <div className="text-muted-foreground mt-2 grid gap-1 text-xs">
                <div>Capability: {readinessMutation.data.capabilityId}</div>
                <div>Checked: {readinessMutation.data.checkedAt}</div>
                <div>Redirect: {readinessMutation.data.redirectUri}</div>
                {readinessMutation.data.requestId ? (
                  <div>Request: {readinessMutation.data.requestId}</div>
                ) : null}
                {readinessMutation.data.expiration ? (
                  <div>Token expires: {readinessMutation.data.expiration}</div>
                ) : null}
                {readinessMutation.data.error ? (
                  <div className="mt-3 space-y-2">
                    <div>{readinessMutation.data.error.message}</div>
                    {readinessMutation.data.error.setupCommands?.length ? (
                      <pre className="bg-muted overflow-auto rounded-md p-3">
                        {readinessMutation.data.error.setupCommands.join('\n')}
                      </pre>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {!linkReady && status ? (
            <div className="border-border bg-background mt-5 rounded-md border p-4 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <ShieldCheck className="size-4" />
                aivault capability required
              </div>
              <p className="text-muted-foreground mt-2">{status.setupHint}</p>
              <p className="text-muted-foreground mt-2 text-xs">
                Missing capability: {status.capabilities.linkToken.id}
              </p>
              {status.capabilities.linkToken.error ? (
                <pre className="bg-muted text-muted-foreground mt-3 overflow-auto rounded-md p-3 text-xs">
                  {status.capabilities.linkToken.error}
                </pre>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="border-border bg-card rounded-lg border p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Sync schedule</h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Workspace-scoped polling for Plaid refreshes when the app is
                running.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={runDueMutation.isPending}
              onClick={() => runDueMutation.mutate()}
            >
              Run if due
            </Button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="border-border bg-background flex items-center gap-3 rounded-md border p-4 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={
                  syncSchedule?.settings.sync.scheduledRefreshEnabled ?? false
                }
                onChange={(event) =>
                  syncSettingsMutation.mutate({
                    scheduledRefreshEnabled: event.target.checked,
                  })
                }
              />
              <span>Scheduled refresh</span>
            </label>

            <label className="border-border bg-background rounded-md border p-4 text-sm">
              <span className="text-muted-foreground block text-xs">
                Cadence
              </span>
              <select
                className="border-input bg-background text-foreground mt-2 h-9 w-full rounded-md border px-2 text-sm"
                value={syncSchedule?.settings.sync.intervalMinutes ?? 360}
                onChange={(event) =>
                  syncSettingsMutation.mutate({
                    intervalMinutes: Number(event.target.value),
                  })
                }
              >
                <option value={60}>Hourly</option>
                <option value={360}>Every 6 hours</option>
                <option value={720}>Every 12 hours</option>
                <option value={1440}>Daily</option>
              </select>
            </label>

            <div className="border-border bg-background rounded-md border p-4 text-sm">
              <div className="text-muted-foreground text-xs">Next run</div>
              <div className="mt-2 font-medium">
                {syncSchedule?.syncState.nextScheduledRunAt
                  ? new Date(
                      syncSchedule.syncState.nextScheduledRunAt,
                    ).toLocaleString()
                  : 'Not scheduled'}
              </div>
              <div className="text-muted-foreground mt-1 text-xs">
                {syncSchedule?.due
                  ? 'Due now'
                  : (syncSchedule?.reason ?? 'Loading')}
              </div>
            </div>
          </div>

          {syncSettingsMutation.error || runDueMutation.error ? (
            <pre className="bg-muted text-muted-foreground mt-3 overflow-auto rounded-md p-3 text-xs">
              {syncSettingsMutation.error?.message ??
                runDueMutation.error?.message}
            </pre>
          ) : null}
        </section>

        <section className="border-border bg-card rounded-lg border p-5">
          <div>
            <h2 className="text-lg font-semibold">Today signals</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Thresholds for Money items that should surface in Moldable Today.
            </p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="border-border bg-background rounded-md border p-4 text-sm">
              <span className="text-muted-foreground block text-xs">
                Large transaction
              </span>
              <input
                type="number"
                min={0}
                max={1000000}
                step={50}
                className="border-input bg-background text-foreground mt-2 h-9 w-full rounded-md border px-2 text-sm"
                value={attentionSettings?.largeTransactionThreshold ?? 1000}
                onChange={(event) =>
                  attentionSettingsMutation.mutate({
                    largeTransactionThreshold: Number(event.target.value),
                  })
                }
              />
            </label>

            <label className="border-border bg-background rounded-md border p-4 text-sm">
              <span className="text-muted-foreground block text-xs">
                Lookback days
              </span>
              <input
                type="number"
                min={1}
                max={365}
                className="border-input bg-background text-foreground mt-2 h-9 w-full rounded-md border px-2 text-sm"
                value={attentionSettings?.lookbackDays ?? 30}
                onChange={(event) =>
                  attentionSettingsMutation.mutate({
                    lookbackDays: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>

          <div className="text-muted-foreground mt-3 text-xs">
            Category thresholds configured:{' '}
            {attentionSettings?.categoryThresholds.length ?? 0}
          </div>

          {attentionSettingsMutation.error ? (
            <pre className="bg-muted text-muted-foreground mt-3 overflow-auto rounded-md p-3 text-xs">
              {attentionSettingsMutation.error.message}
            </pre>
          ) : null}
        </section>

        <section className="border-border bg-card rounded-lg border p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Connected institutions</h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Removing one asks aivault to revoke the Plaid Item before local
                facts are deleted.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => void connectionsQuery.refetch()}
            >
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={syncMutation.isPending}
              onClick={() => syncMutation.mutate()}
            >
              Sync
            </Button>
          </div>

          <div className="mt-4 grid gap-3">
            {connectionsQuery.data?.length ? (
              connectionsQuery.data.map((connection) => (
                <div
                  key={connection.itemId}
                  className="border-border bg-background flex flex-wrap items-center justify-between gap-3 rounded-md border p-4"
                >
                  <div className="min-w-0">
                    <div className="font-medium">
                      {connection.institutionName}
                    </div>
                    <div className="text-muted-foreground mt-1 text-xs">
                      {connection.status} -{' '}
                      {connection.products.join(', ') || 'no products'}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="cursor-pointer"
                    disabled={removeConnectionMutation.isPending}
                    onClick={() =>
                      removeConnectionMutation.mutate(connection.itemId)
                    }
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                </div>
              ))
            ) : (
              <div className="border-border bg-background text-muted-foreground rounded-md border p-4 text-sm">
                <div>No connected institutions in this workspace.</div>
                <Button
                  type="button"
                  className="mt-3 cursor-pointer"
                  disabled={isConnecting}
                  onClick={() => void startPlaidLink()}
                >
                  <Plus className="size-4" />
                  Add bank account
                </Button>
              </div>
            )}
          </div>

          <div className="border-border bg-background mt-4 rounded-md border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium">Post-Link verification</h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  After connecting a bank, sync once and check these backend
                  gates.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                disabled={connectionCheckQuery.isFetching}
                onClick={() => void connectionCheckQuery.refetch()}
              >
                Check post-Link
              </Button>
            </div>

            {connectionCheckQuery.data ? (
              <>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                  <div>
                    <span className="text-muted-foreground">Connections</span>{' '}
                    <span className="font-medium">
                      {connectionCheckQuery.data.counts.activeConnections}/
                      {connectionCheckQuery.data.counts.connections}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Facts</span>{' '}
                    <span className="font-medium">
                      {connectionCheckQuery.data.counts.accounts} accounts,{' '}
                      {connectionCheckQuery.data.counts.transactions}{' '}
                      transactions
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Evidence</span>{' '}
                    <span className="font-medium">
                      {connectionCheckQuery.data.counts.rawEvidence} files
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid gap-2">
                  {connectionCheckQuery.data.checks.map((check) => (
                    <div
                      key={check.id}
                      className="flex items-start gap-2 text-sm"
                    >
                      {check.ok ? (
                        <CheckCircle2 className="text-primary mt-0.5 size-4 shrink-0" />
                      ) : (
                        <AlertCircle className="text-destructive mt-0.5 size-4 shrink-0" />
                      )}
                      <div>
                        <div className="font-medium">{check.label}</div>
                        <div className="text-muted-foreground text-xs">
                          {check.detail}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {connectionCheckQuery.error ? (
              <pre className="bg-muted text-muted-foreground mt-3 overflow-auto rounded-md p-3 text-xs">
                {connectionCheckQuery.error.message}
              </pre>
            ) : null}
          </div>

          {removeConnectionMutation.error ? (
            <pre className="bg-muted text-muted-foreground mt-3 overflow-auto rounded-md p-3 text-xs">
              {removeConnectionMutation.error.message}
            </pre>
          ) : null}
          {syncMutation.error ? (
            <pre className="bg-muted text-muted-foreground mt-3 overflow-auto rounded-md p-3 text-xs">
              {syncMutation.error.message}
            </pre>
          ) : null}
        </section>

        <section className="border-border bg-card rounded-lg border p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Database className="size-5" />
                Backend data pipeline
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">
                File-backed raw data, normalized collections, and evaluated
                dashboard cards for frontend handoff.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                disabled={seedMutation.isPending}
                onClick={() => seedMutation.mutate()}
              >
                Seed data
              </Button>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => void snapshotQuery.refetch()}
              >
                Refresh
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-5">
            <Metric
              label="Accounts"
              value={snapshotQuery.data?.accounts.length ?? 0}
            />
            <Metric
              label="Transactions"
              value={snapshotQuery.data?.transactions.length ?? 0}
            />
            <Metric
              label="Debts"
              value={snapshotQuery.data?.debts.length ?? 0}
            />
            <Metric
              label="Holdings"
              value={snapshotQuery.data?.holdings.length ?? 0}
            />
            <Metric
              label="Dashboard cards"
              value={snapshotQuery.data?.cards.length ?? 0}
            />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {snapshotQuery.data?.cards.map((card) => (
              <div
                key={card.id}
                className="border-border bg-background rounded-md border p-4"
              >
                <div className="text-muted-foreground text-xs">
                  {card.title}
                </div>
                <div className="mt-1 text-2xl font-semibold">
                  {card.displayValue}
                </div>
                <code className="text-muted-foreground mt-3 block overflow-auto text-xs">
                  {card.formula}
                </code>
              </div>
            ))}
          </div>
        </section>

        <section className="border-border bg-card rounded-lg border p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Calculator className="size-5" />
            Formula test
          </h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              className="border-input bg-background text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-10 flex-1 rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
              value={formula}
              onChange={(event) => setFormula(event.target.value)}
            />
            <Button
              type="button"
              className="cursor-pointer"
              disabled={formulaMutation.isPending}
              onClick={() => formulaMutation.mutate(formula)}
            >
              Evaluate
            </Button>
          </div>
          <div className="text-muted-foreground mt-3 text-sm">
            Result:{' '}
            <span className="text-foreground font-medium">
              {formulaResult === null
                ? 'Not run'
                : typeof formulaResult === 'object'
                  ? JSON.stringify(formulaResult)
                  : String(formulaResult)}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {FORMULA_EXAMPLES.map((example) => (
              <Button
                key={example}
                type="button"
                variant="outline"
                size="sm"
                className="h-auto max-w-full cursor-pointer whitespace-normal break-all text-left"
                onClick={() => setFormula(example)}
              >
                {example}
              </Button>
            ))}
          </div>
          {formulaMutation.error ? (
            <pre className="bg-muted text-muted-foreground mt-3 overflow-auto rounded-md p-3 text-xs">
              {formulaMutation.error.message}
            </pre>
          ) : null}
        </section>

        {linkTokenMutation.error ? (
          <section className="border-border bg-card rounded-lg border p-5">
            <h2 className="text-lg font-semibold">Link token error</h2>
            <pre className="bg-muted text-muted-foreground mt-3 overflow-auto rounded-md p-3 text-xs">
              {linkTokenMutation.error.message}
            </pre>
          </section>
        ) : null}

        {connectSessionMutation.error ? (
          <section className="border-border bg-card rounded-lg border p-5">
            <h2 className="text-lg font-semibold">Plaid Link session error</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Money could not create the external Plaid Link browser session.
            </p>
            <pre className="bg-muted text-muted-foreground mt-3 overflow-auto rounded-md p-3 text-xs">
              {connectSessionMutation.error.message}
            </pre>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => openExternalUrl(PLAID_DASHBOARD_URL)}
              >
                <ExternalLink className="size-4" />
                Open Plaid Dashboard
              </Button>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => openExternalUrl(PLAID_OAUTH_DOCS_URL)}
              >
                <ExternalLink className="size-4" />
                OAuth docs
              </Button>
            </div>
          </section>
        ) : null}

        {message ? (
          <section className="border-border bg-card rounded-lg border p-5">
            <h2 className="text-lg font-semibold">Test status</h2>
            <p className="text-muted-foreground mt-2 text-sm">{message}</p>
          </section>
        ) : null}

        {lastMetadata ? (
          <section className="border-border bg-card rounded-lg border p-5">
            <h2 className="text-lg font-semibold">Plaid metadata</h2>
            <pre className="bg-muted text-muted-foreground mt-3 max-h-80 overflow-auto rounded-md p-3 text-xs">
              {JSON.stringify(lastMetadata, null, 2)}
            </pre>
          </section>
        ) : null}
      </div>
    </main>
  )
}

function PlaidExternalConnect({
  sessionId,
  receivedRedirectUri,
}: {
  sessionId: string
  receivedRedirectUri?: string
}) {
  const startedRef = useRef(false)
  const [status, setStatus] = useState<
    'loading' | 'opening' | 'completing' | 'complete' | 'exited' | 'error'
  >('loading')
  const [message, setMessage] = useState('Preparing Plaid Link...')
  const [metadata, setMetadata] = useState<unknown>(null)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    async function runPlaidLink() {
      try {
        const sessionResponse = await fetch(
          `/api/plaid/connect-session/${encodeURIComponent(sessionId)}`,
        )
        const sessionBody = await sessionResponse.json()
        if (!sessionResponse.ok) {
          const detail =
            typeof sessionBody?.error?.message === 'string'
              ? sessionBody.error.message
              : 'Plaid connect session was not found'
          throw new Error(detail)
        }

        const session = sessionBody as PlaidConnectSessionDetails
        sessionStorage.setItem(EXTERNAL_SESSION_KEY, session.id)
        sessionStorage.setItem(LINK_TOKEN_KEY, session.linkToken)
        sessionStorage.setItem(WORKSPACE_ID_KEY, session.workspaceId)

        setStatus('opening')
        setMessage('Opening Plaid Link...')
        await launchPlaidLink({
          linkToken: session.linkToken,
          receivedRedirectUri,
          onSuccess: (publicToken, nextMetadata) => {
            setStatus('completing')
            setMetadata(nextMetadata)
            setMessage(
              session.mode === 'update'
                ? 'Finishing the Plaid permission update...'
                : 'Finishing the bank connection...',
            )
            const completion =
              session.mode === 'update'
                ? completePlaidUpdateForWorkspace(
                    session.workspaceId,
                    session.id,
                    nextMetadata,
                  )
                : publicToken
                  ? completePlaidLinkForWorkspace(
                      session.workspaceId,
                      publicToken,
                      nextMetadata,
                    )
                  : Promise.reject(
                      new Error('Plaid Link did not return a public token'),
                    )
            void completion
              .then((result) => {
                sessionStorage.removeItem(EXTERNAL_SESSION_KEY)
                sessionStorage.removeItem(LINK_TOKEN_KEY)
                sessionStorage.removeItem(WORKSPACE_ID_KEY)
                void deletePlaidConnectSession(session.id)
                setStatus('complete')
                setMessage(result.message)
              })
              .catch((error) => {
                setStatus('error')
                setMessage(
                  `Failed to complete Plaid Link: ${errorMessage(
                    error,
                    'Unknown error',
                  )}`,
                )
              })
          },
          onExit: (error) => {
            if (error) {
              setStatus('error')
              setMessage('Plaid Link exited with an error.')
              return
            }
            setStatus('exited')
            setMessage('Plaid Link was closed before a bank was connected.')
          },
          onEvent: (eventName) => {
            if (eventName === 'OPEN_OAUTH') {
              setMessage(
                'Complete the bank OAuth flow in this browser window. Plaid will return here automatically.',
              )
            }
          },
        })
      } catch (error) {
        setStatus('error')
        setMessage(errorMessage(error, 'Failed to start Plaid Link'))
      }
    }

    void runPlaidLink()
  }, [receivedRedirectUri, sessionId])

  return (
    <main className="bg-background text-foreground flex min-h-screen items-center justify-center p-8">
      <section className="border-border bg-card w-full max-w-lg rounded-lg border p-6">
        <div className="flex items-center gap-3">
          {status === 'complete' ? (
            <CheckCircle2 className="text-primary size-5" />
          ) : status === 'error' ? (
            <AlertCircle className="text-destructive size-5" />
          ) : (
            <ShieldCheck className="text-primary size-5" />
          )}
          <h1 className="text-xl font-semibold">Connect bank account</h1>
        </div>
        <p className="text-muted-foreground mt-3 text-sm">{message}</p>
        {receivedRedirectUri ? (
          <code className="bg-muted text-muted-foreground mt-4 block overflow-auto rounded-md px-3 py-2 text-xs">
            {receivedRedirectUri}
          </code>
        ) : null}
        {metadata ? (
          <pre className="bg-muted text-muted-foreground mt-4 max-h-64 overflow-auto rounded-md p-3 text-xs">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => window.close()}
          >
            Close window
          </Button>
          {status === 'error' ? (
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => openExternalUrl(PLAID_DASHBOARD_URL)}
            >
              <ExternalLink className="size-4" />
              Plaid Dashboard
            </Button>
          ) : null}
        </div>
      </section>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-border bg-background rounded-md border p-4">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  )
}
