import {
  normalizeInvestmentAccountKind,
  normalizeInvestmentAssetClass,
  normalizeTaxTreatment,
} from './investments'
import { getWorkspaceId, jsonError } from './moldable'
import { readConnections, writeConnections } from './money-storage'
import type {
  DebtType,
  MoneyAccount,
  MoneyConnection,
  MoneyDebt,
  MoneyHolding,
  MoneyTransaction,
} from './money-types'
import type { Context } from 'hono'
import { Hono } from 'hono'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'

const DEFAULT_PRODUCTS = ['transactions'] as const
const DEFAULT_COUNTRY_CODES = ['US', 'CA'] as const
const DEFAULT_TRANSACTIONS_DAYS_REQUESTED = 730
const PLAID_LINK_TOKEN_CAPABILITY =
  process.env.PLAID_LINK_TOKEN_CAPABILITY ?? 'plaid/link-token-create'
const PLAID_LINK_TOKEN_UPDATE_CAPABILITY =
  process.env.PLAID_LINK_TOKEN_UPDATE_CAPABILITY ?? 'plaid/link-token-update'
const PLAID_COMPLETE_LINK_CAPABILITY =
  process.env.PLAID_COMPLETE_LINK_CAPABILITY ?? 'plaid/item-exchange-store'
const PLAID_ACCOUNTS_SYNC_CAPABILITY =
  process.env.PLAID_ACCOUNTS_SYNC_CAPABILITY ?? 'plaid/accounts-sync'
const PLAID_TRANSACTIONS_SYNC_CAPABILITY =
  process.env.PLAID_TRANSACTIONS_SYNC_CAPABILITY ?? 'plaid/transactions-sync'
const PLAID_ITEM_REMOVE_CAPABILITY =
  process.env.PLAID_ITEM_REMOVE_CAPABILITY ?? 'plaid/item-remove'
const PLAID_LIABILITIES_SYNC_CAPABILITY =
  process.env.PLAID_LIABILITIES_SYNC_CAPABILITY ?? 'plaid/liabilities-sync'
const PLAID_INVESTMENTS_SYNC_CAPABILITY =
  process.env.PLAID_INVESTMENTS_SYNC_CAPABILITY ?? 'plaid/investments-sync'
const MAX_TRANSACTION_SYNC_BATCHES = 10

const AIVAULT_ENV_KEYS = [
  'AIVAULT_DIR',
  'AIVAULTD_SOCKET',
  'AIVAULTD_SHARED_SOCKET',
  'HOME',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'LOGNAME',
  'PATH',
  'SHELL',
  'TMP',
  'TMPDIR',
  'USER',
] as const

interface AivaultResult {
  response?: {
    json?: unknown
    status?: number
  }
  json?: unknown
}

interface PlaidLinkTokenResponse {
  link_token?: string
  expiration?: string
  request_id?: string
}

interface PlaidConnectSession {
  id: string
  linkToken: string
  workspaceId: string
  redirectUri: string
  mode: 'create' | 'update'
  itemId?: string
  productsToAdd?: string[]
  createdAt: string
  expiresAt: string
}

interface PlaidLinkTokenRequestBody {
  products?: unknown
  optionalProducts?: unknown
  additionalConsentedProducts?: unknown
  itemId?: unknown
  countryCodes?: unknown
  transactionsDaysRequested?: unknown
  timeoutMs?: unknown
}

export interface PlaidConnectSessionResponse {
  id: string
  url: string
  redirectUri: string
  expiresAt: string
  mode: 'create' | 'update'
  itemId?: string
  productsToAdd?: string[]
  requestId?: string
}

const plaidConnectSessions = new Map<string, PlaidConnectSession>()
const PLAID_CONNECT_SESSION_TTL_MS = 4 * 60 * 60 * 1000

interface PlaidCapabilityResponse<T> {
  capability?: string
  credential?: string
  itemId?: string
  item_id?: string
  result?: T
}

interface PlaidItemRef {
  itemId?: string
  item_id?: string
  credentialRef?: string
  credential_ref?: string
  institutionId?: string
  institution_id?: string
  institutionName?: string
  institution_name?: string
  connectedAt?: string
  connected_at?: string
  requestId?: string
  request_id?: string
}

interface PlaidAccount {
  account_id: string
  name: string
  official_name?: string | null
  type: string
  subtype?: string | null
  mask?: string | null
  balances?: {
    available?: number | null
    current?: number | null
    limit?: number | null
    iso_currency_code?: string | null
    unofficial_currency_code?: string | null
    last_updated_datetime?: string | null
  }
}

interface PlaidAccountsResult {
  accounts?: PlaidAccount[]
}

interface PlaidTransaction {
  transaction_id: string
  account_id: string
  name: string
  merchant_name?: string | null
  amount: number
  date: string
  iso_currency_code?: string | null
  unofficial_currency_code?: string | null
  pending?: boolean
  category?: string[] | null
  payment_channel?: string | null
  personal_finance_category?: {
    primary?: string | null
    detailed?: string | null
  } | null
}

interface PlaidRemovedTransaction {
  transaction_id: string
}

interface PlaidTransactionsResult {
  added?: PlaidTransaction[]
  modified?: PlaidTransaction[]
  removed?: PlaidRemovedTransaction[]
  next_cursor?: string
  nextCursor?: string
  has_more?: boolean
  hasMore?: boolean
  syncBatches?: number
}

interface PlaidCreditLiability {
  account_id: string
  aprs?: Array<{ apr_percentage?: number | null }> | null
  is_overdue?: boolean | null
  last_payment_amount?: number | null
  last_payment_date?: string | null
  last_statement_balance?: number | null
  minimum_payment_amount?: number | null
  next_payment_due_date?: string | null
  statement_balance?: number | null
}

interface PlaidMortgageLiability {
  account_id: string
  interest_rate?: { percentage?: number | null } | null
  last_payment_amount?: number | null
  last_payment_date?: string | null
  next_monthly_payment?: number | null
  next_payment_due_date?: string | null
  origination_principal_amount?: number | null
  past_due_amount?: number | null
}

interface PlaidStudentLoanLiability {
  account_id: string
  interest_rate_percentage?: number | null
  last_payment_amount?: number | null
  last_payment_date?: string | null
  minimum_payment_amount?: number | null
  next_payment_due_date?: string | null
  origination_principal_amount?: number | null
  outstanding_interest_amount?: number | null
}

interface PlaidLiabilitiesResult {
  liabilities?: {
    credit?: PlaidCreditLiability[] | null
    mortgage?: PlaidMortgageLiability[] | null
    student?: PlaidStudentLoanLiability[] | null
  } | null
}

interface PlaidHolding {
  account_id: string
  security_id: string
  quantity?: number | null
  institution_price?: number | null
  institution_value?: number | null
  iso_currency_code?: string | null
  unofficial_currency_code?: string | null
}

interface PlaidSecurity {
  security_id: string
  name?: string | null
  ticker_symbol?: string | null
  type?: string | null
  close_price?: number | null
  iso_currency_code?: string | null
  unofficial_currency_code?: string | null
}

interface PlaidInvestmentsResult {
  holdings?: PlaidHolding[]
  securities?: PlaidSecurity[]
}

export interface PlaidSyncResult {
  connection: MoneyConnection
  accounts: MoneyAccount[]
  transactions: MoneyTransaction[]
  debts: MoneyDebt[]
  holdings: MoneyHolding[]
  raw: {
    accounts: PlaidAccountsResult
    transactions: PlaidTransactionsResult
    liabilities?: PlaidLiabilitiesResult
    investments?: PlaidInvestmentsResult
  }
  removedTransactionIds: string[]
  nextCursor?: string
  hasMore: boolean
}

function getAivaultEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const key of AIVAULT_ENV_KEYS) {
    const value = process.env[key]
    if (value) env[key] = value
  }
  return env
}

function getAivaultBin(): string {
  return process.env.AIVAULT_BIN ?? 'aivault'
}

function currentAppUrl(c: Context): string {
  const configured = process.env.MOLDABLE_APP_URL?.replace(/\/+$/, '')
  if (configured) return configured

  const portlessUrl = process.env.PORTLESS_URL?.replace(/\/+$/, '')
  if (portlessUrl) return portlessUrl

  const forwardedHost = c.req.header('x-forwarded-host') ?? c.req.header('host')
  const forwardedProto = c.req.header('x-forwarded-proto')
  if (forwardedHost && forwardedProto) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/+$/, '')
  }

  const url = new URL(c.req.url)
  return url.origin
}

function plaidRedirectUri(c: Context): string {
  return `${currentAppUrl(c)}/plaid/oauth-return`
}

function workspaceUserId(c: Context): string {
  return `moldable-money:${getPlaidWorkspaceId(c)}`
}

function getPlaidWorkspaceId(c: Context): string {
  return getWorkspaceId(c) ?? 'personal'
}

function asStringArray(value: unknown, fallback: readonly string[]): string[] {
  if (!Array.isArray(value)) return [...fallback]
  const entries = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean)
  return entries.length > 0 ? entries : [...fallback]
}

function optionalStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean)
}

function extractAivaultJson(output: unknown): unknown {
  const wrapped = output as AivaultResult
  if (wrapped.response?.status && wrapped.response.status >= 400) {
    throw new Error(
      plaidApiErrorMessage(wrapped.response.status, wrapped.response.json),
    )
  }
  return wrapped.response?.json ?? wrapped.json ?? output
}

function plaidApiErrorMessage(status: number, json: unknown): string {
  const record = json as {
    error_code?: unknown
    error_message?: unknown
    error_type?: unknown
    request_id?: unknown
  }
  const code =
    typeof record.error_code === 'string' ? record.error_code : undefined
  const message =
    typeof record.error_message === 'string' ? record.error_message : undefined
  const requestId =
    typeof record.request_id === 'string' ? record.request_id : undefined
  const type =
    typeof record.error_type === 'string' ? record.error_type : undefined
  const prefix = code
    ? `Plaid ${code}`
    : type
      ? `Plaid ${type}`
      : 'Plaid API error'
  return [
    `${prefix} (${status})`,
    message,
    requestId ? `request_id=${requestId}` : undefined,
  ]
    .filter(Boolean)
    .join(': ')
}

function runAivaultJson(args: string[], timeoutMs = 30_000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = spawn(getAivaultBin(), args, {
      env: getAivaultEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`aivault timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk))
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(new Error(safePlaidErrorMessage(error)))
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      const output = Buffer.concat(stdout).toString('utf8').trim()
      if (code !== 0) {
        const message = Buffer.concat(stderr).toString('utf8').trim()
        reject(
          new Error(
            safePlaidErrorMessage(
              new Error(message || `aivault exited with code ${code}`),
            ),
          ),
        )
        return
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(output)
      } catch {
        reject(new Error('aivault returned non-JSON output'))
        return
      }

      try {
        resolve(extractAivaultJson(parsed))
      } catch (error) {
        reject(new Error(safePlaidErrorMessage(error)))
      }
    })
  })
}

async function describeCapability(capability: string): Promise<{
  available: boolean
  error?: string
}> {
  if (
    capability === PLAID_LINK_TOKEN_CAPABILITY ||
    capability === PLAID_LINK_TOKEN_UPDATE_CAPABILITY ||
    capability === PLAID_COMPLETE_LINK_CAPABILITY ||
    capability === PLAID_ACCOUNTS_SYNC_CAPABILITY ||
    capability === PLAID_TRANSACTIONS_SYNC_CAPABILITY ||
    capability === PLAID_ITEM_REMOVE_CAPABILITY ||
    capability === PLAID_LIABILITIES_SYNC_CAPABILITY ||
    capability === PLAID_INVESTMENTS_SYNC_CAPABILITY
  ) {
    return { available: true }
  }

  return {
    available: false,
    error: 'Unknown Plaid capability configured for Money',
  }
}

async function invokePlaidCapability(
  capability: string,
  path: string,
  body: Record<string, unknown>,
  workspaceId?: string,
  timeoutMs = 30_000,
): Promise<unknown> {
  const args = [
    'json',
    capability,
    '--method',
    'POST',
    '--path',
    path,
    '--header',
    'Accept=application/json',
    '--header',
    'Content-Type=application/json',
    '--body',
    JSON.stringify(body),
  ]

  if (workspaceId) {
    args.push('--workspace-id', workspaceId)
  }

  return runAivaultJson(args, timeoutMs)
}

export const plaidRoutes = new Hono()

plaidRoutes.get('/api/plaid/status', async (c) => {
  const linkCapability = await describeCapability(PLAID_LINK_TOKEN_CAPABILITY)
  const exchangeCapability = await describeCapability(
    PLAID_COMPLETE_LINK_CAPABILITY,
  )
  const accountsSyncCapability = await describeCapability(
    PLAID_ACCOUNTS_SYNC_CAPABILITY,
  )
  const transactionsSyncCapability = await describeCapability(
    PLAID_TRANSACTIONS_SYNC_CAPABILITY,
  )
  const liabilitiesSyncCapability = await describeCapability(
    PLAID_LIABILITIES_SYNC_CAPABILITY,
  )
  const investmentsSyncCapability = await describeCapability(
    PLAID_INVESTMENTS_SYNC_CAPABILITY,
  )

  return c.json({
    appUrl: currentAppUrl(c),
    redirectUri: plaidRedirectUri(c),
    environment: 'production',
    capabilities: {
      linkToken: {
        id: PLAID_LINK_TOKEN_CAPABILITY,
        ...linkCapability,
      },
      publicTokenExchange: {
        id: PLAID_COMPLETE_LINK_CAPABILITY,
        ...exchangeCapability,
      },
      accountsSync: {
        id: PLAID_ACCOUNTS_SYNC_CAPABILITY,
        ...accountsSyncCapability,
      },
      transactionsSync: {
        id: PLAID_TRANSACTIONS_SYNC_CAPABILITY,
        ...transactionsSyncCapability,
      },
      itemRemove: {
        id: PLAID_ITEM_REMOVE_CAPABILITY,
        ...(await describeCapability(PLAID_ITEM_REMOVE_CAPABILITY)),
      },
      liabilitiesSync: {
        id: PLAID_LIABILITIES_SYNC_CAPABILITY,
        ...liabilitiesSyncCapability,
      },
      investmentsSync: {
        id: PLAID_INVESTMENTS_SYNC_CAPABILITY,
        ...investmentsSyncCapability,
      },
    },
    setupHint:
      'Configure PLAID_CLIENT_ID and PLAID_SECRET in aivault. Item access tokens are stored by aivault through plaid/item-exchange-store and are not returned to Money.',
    readiness: {
      endpoint: '/api/plaid/readiness',
      method: 'POST',
      description:
        'Runs a short Production Link-token call through aivault and returns only non-secret metadata.',
    },
  })
})

plaidRoutes.post('/api/plaid/readiness', async (c) => {
  const body = (await c.req
    .json()
    .catch(() => ({}))) as PlaidLinkTokenRequestBody
  const checkedAt = new Date().toISOString()
  const timeoutMs = readinessTimeoutMs(body.timeoutMs)

  try {
    const response = await createPlaidLinkToken(c, body, timeoutMs)
    return c.json({
      ok: true,
      checkedAt,
      linkTokenCreated: Boolean(response.link_token),
      expiration: response.expiration,
      requestId: response.request_id,
      redirectUri: plaidRedirectUri(c),
      capabilityId: PLAID_LINK_TOKEN_CAPABILITY,
      environment: 'production',
    })
  } catch (error) {
    const readinessError = plaidReadinessError(error)
    return c.json({
      ok: false,
      checkedAt,
      linkTokenCreated: false,
      redirectUri: plaidRedirectUri(c),
      capabilityId: PLAID_LINK_TOKEN_CAPABILITY,
      environment: 'production',
      error: readinessError,
    })
  }
})

plaidRoutes.post('/api/plaid/link-token', async (c) => {
  try {
    const body = (await c.req
      .json()
      .catch(() => ({}))) as PlaidLinkTokenRequestBody
    const response = await createPlaidLinkToken(c, body)

    if (!response.link_token) {
      return jsonError(c, 'Plaid did not return a link token', 502)
    }

    return c.json({
      linkToken: response.link_token,
      expiration: response.expiration,
      requestId: response.request_id,
      redirectUri: plaidRedirectUri(c),
    })
  } catch (error) {
    return c.json(
      {
        error: {
          code: 'plaid_link_token_failed',
          message: safePlaidErrorMessage(error),
        },
      },
      502,
    )
  }
})

plaidRoutes.post('/api/plaid/connect-session', async (c) => {
  try {
    const body = (await c.req
      .json()
      .catch(() => ({}))) as PlaidLinkTokenRequestBody
    return c.json(await createPlaidBrowserConnectSession(c, body))
  } catch (error) {
    const readinessError = plaidReadinessError(error)
    return c.json(
      {
        error: readinessError,
      },
      502,
    )
  }
})

export async function createPlaidBrowserConnectSession(
  c: Context,
  body: PlaidLinkTokenRequestBody,
): Promise<PlaidConnectSessionResponse> {
  const itemId =
    typeof body.itemId === 'string' && body.itemId.trim()
      ? body.itemId.trim()
      : undefined
  const productsToAdd = uniqueProductStrings([
    ...optionalStringArray(body.additionalConsentedProducts),
    ...optionalStringArray(body.optionalProducts),
  ])
  const response = itemId
    ? await createPlaidUpdateLinkToken(c, {
        ...body,
        itemId,
        additionalConsentedProducts: productsToAdd,
      })
    : await createPlaidLinkToken(c, body)

  if (!response.link_token) {
    throw new Error('Plaid did not return a link token')
  }

  const session = createPlaidConnectSession(
    response.link_token,
    getPlaidWorkspaceId(c),
    plaidRedirectUri(c),
    response.expiration,
    itemId ? 'update' : 'create',
    itemId,
    itemId ? productsToAdd : undefined,
  )
  plaidConnectSessions.set(session.id, session)

  return {
    id: session.id,
    url: `${currentAppUrl(c)}/plaid/connect?session=${encodeURIComponent(session.id)}`,
    redirectUri: session.redirectUri,
    expiresAt: session.expiresAt,
    mode: session.mode,
    itemId: session.itemId,
    productsToAdd: session.productsToAdd,
    requestId: response.request_id,
  }
}

plaidRoutes.get('/api/plaid/connect-session/:sessionId', (c) => {
  const sessionId = c.req.param('sessionId')
  purgeExpiredPlaidConnectSessions()
  const session = plaidConnectSessions.get(sessionId)

  if (!session) {
    return c.json(
      {
        error: {
          code: 'plaid_connect_session_not_found',
          message: 'Plaid connect session was not found or has expired',
        },
      },
      404,
    )
  }

  return c.json({
    id: session.id,
    linkToken: session.linkToken,
    workspaceId: session.workspaceId,
    redirectUri: session.redirectUri,
    expiresAt: session.expiresAt,
    mode: session.mode,
    itemId: session.itemId,
    productsToAdd: session.productsToAdd,
  })
})

plaidRoutes.delete('/api/plaid/connect-session/:sessionId', (c) => {
  const sessionId = c.req.param('sessionId')
  purgeExpiredPlaidConnectSessions()
  return c.json({
    ok: true,
    deleted: plaidConnectSessions.delete(sessionId),
  })
})

async function createPlaidLinkToken(
  c: Context,
  body: PlaidLinkTokenRequestBody,
  timeoutMs = 30_000,
): Promise<PlaidLinkTokenResponse> {
  const products = asStringArray(body.products, DEFAULT_PRODUCTS)
  const optionalProducts = optionalStringArray(body.optionalProducts)
  const countryCodes = asStringArray(body.countryCodes, DEFAULT_COUNTRY_CODES)
  const workspaceId = getPlaidWorkspaceId(c)
  const includesTransactions = products.some(
    (product) => product.toLowerCase() === 'transactions',
  )

  const plaidRequest = {
    client_name: 'Moldable Money',
    country_codes: countryCodes,
    language: 'en',
    products,
    redirect_uri: plaidRedirectUri(c),
    ...(includesTransactions
      ? {
          transactions: {
            days_requested: plaidTransactionsDaysRequested(
              body.transactionsDaysRequested,
            ),
          },
        }
      : {}),
    user: {
      client_user_id: workspaceUserId(c),
    },
    ...(optionalProducts.length ? { optional_products: optionalProducts } : {}),
  }

  return (await invokePlaidCapability(
    PLAID_LINK_TOKEN_CAPABILITY,
    '/link/token/create',
    plaidRequest,
    workspaceId,
    timeoutMs,
  )) as PlaidLinkTokenResponse
}

async function createPlaidUpdateLinkToken(
  c: Context,
  body: PlaidLinkTokenRequestBody & { itemId: string },
  timeoutMs = 30_000,
): Promise<PlaidLinkTokenResponse> {
  const workspaceId = getPlaidWorkspaceId(c)
  const connections = await readConnections(c)
  const connection = connections.find((entry) => entry.itemId === body.itemId)
  if (!connection?.credentialRef) {
    throw new Error(
      'Plaid Item was not found or is missing a credential reference',
    )
  }
  const additionalConsentedProducts = uniqueProductStrings([
    ...optionalStringArray(body.additionalConsentedProducts),
    ...optionalStringArray(body.optionalProducts),
  ])
  const countryCodes = asStringArray(body.countryCodes, DEFAULT_COUNTRY_CODES)
  const plaidRequest = {
    clientName: 'Moldable Money',
    countryCodes,
    language: 'en',
    redirectUri: plaidRedirectUri(c),
    user: {
      client_user_id: workspaceUserId(c),
    },
    itemId: connection.itemId,
    credentialRef: connection.credentialRef,
    additionalConsentedProducts,
  }

  const response = await invokePlaidCapability(
    PLAID_LINK_TOKEN_UPDATE_CAPABILITY,
    '/link/token/create',
    plaidRequest,
    workspaceId,
    timeoutMs,
  )
  return capabilityResult<PlaidLinkTokenResponse>(response)
}

function plaidTransactionsDaysRequested(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_TRANSACTIONS_DAYS_REQUESTED
  }
  return Math.min(
    Math.max(Math.floor(value), 1),
    DEFAULT_TRANSACTIONS_DAYS_REQUESTED,
  )
}

function createPlaidConnectSession(
  linkToken: string,
  workspaceId: string,
  redirectUri: string,
  plaidExpiration?: string,
  mode: 'create' | 'update' = 'create',
  itemId?: string,
  productsToAdd?: string[],
): PlaidConnectSession {
  purgeExpiredPlaidConnectSessions()
  const now = Date.now()
  const fallbackExpiresAt = now + PLAID_CONNECT_SESSION_TTL_MS
  const parsedPlaidExpiration = plaidExpiration
    ? Date.parse(plaidExpiration)
    : NaN
  const expiresAt = Number.isFinite(parsedPlaidExpiration)
    ? Math.min(parsedPlaidExpiration, fallbackExpiresAt)
    : fallbackExpiresAt

  return {
    id: randomUUID(),
    linkToken,
    workspaceId,
    redirectUri,
    mode,
    itemId,
    productsToAdd,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
  }
}

function uniqueProductStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function purgeExpiredPlaidConnectSessions(now = Date.now()): void {
  for (const [id, session] of plaidConnectSessions) {
    if (Date.parse(session.expiresAt) <= now) {
      plaidConnectSessions.delete(id)
    }
  }
}

function readinessTimeoutMs(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(Math.max(Math.floor(value), 1_000), 30_000)
    : 5_000
}

function safePlaidErrorMessage(error: unknown): string {
  const message =
    error instanceof Error ? error.message : 'Plaid readiness check failed'
  return message
    .replace(
      /access-(sandbox|production)-[A-Za-z0-9_-]+/g,
      'access-$1-[redacted]',
    )
    .replace(
      /public-(sandbox|production)-[A-Za-z0-9_-]+/g,
      'public-$1-[redacted]',
    )
    .replace(
      /secret-(sandbox|production)-[A-Za-z0-9_-]+/g,
      'secret-$1-[redacted]',
    )
    .replace(/PLAID_SECRET=\S+/g, 'PLAID_SECRET=[redacted]')
}

function plaidReadinessError(error: unknown): {
  code: string
  message: string
  setupCommands?: string[]
} {
  const message = safePlaidErrorMessage(error)
  if (
    /CredentialNotFound|no credential for capability provider/i.test(message)
  ) {
    return {
      code: 'plaid_credentials_missing',
      message:
        'Plaid Production credentials are not configured in aivault for this workspace.',
      setupCommands: [
        'aivault secrets create --name PLAID_CLIENT_ID --value "..." --scope global',
        'aivault secrets create --name PLAID_SECRET --value "..." --scope global',
      ],
    }
  }

  return {
    code: 'plaid_readiness_failed',
    message,
  }
}

plaidRoutes.post('/api/plaid/complete-link', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    publicToken?: unknown
    metadata?: unknown
  }

  if (typeof body.publicToken !== 'string' || !body.publicToken.trim()) {
    return jsonError(c, 'publicToken is required', 400)
  }

  try {
    const connection = await completePlaidLink(
      c,
      body.publicToken,
      body.metadata,
    )
    return c.json({
      ok: true,
      exchanged: true,
      connection,
      message:
        'Plaid Link completed. The Item access token was stored in aivault and only a credential reference was saved in Money.',
    })
  } catch (error) {
    return c.json(
      {
        error: {
          code: 'plaid_complete_link_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to complete Plaid Link',
        },
      },
      502,
    )
  }
})

plaidRoutes.post('/api/plaid/complete-update', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    sessionId?: unknown
    metadata?: unknown
  }

  if (typeof body.sessionId !== 'string' || !body.sessionId.trim()) {
    return jsonError(c, 'sessionId is required', 400)
  }

  try {
    const connection = await completePlaidUpdateSession(
      c,
      body.sessionId.trim(),
      body.metadata,
    )
    return c.json({
      ok: true,
      updated: true,
      connection,
      nextAction: {
        action: 'sync-item',
        rpc: 'money.connections.sync',
        params: { itemId: connection.itemId },
      },
      message:
        'Plaid Item permissions were updated. Run a sync to import the newly authorized product data.',
    })
  } catch (error) {
    return c.json(
      {
        error: {
          code: 'plaid_complete_update_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to complete Plaid update mode',
        },
      },
      502,
    )
  }
})

export async function completePlaidLink(
  c: Context,
  publicToken: string,
  metadata: unknown,
): Promise<MoneyConnection> {
  const workspaceId = getPlaidWorkspaceId(c)
  const products = metadataProducts(metadata)
  const response = await invokePlaidCapability(
    PLAID_COMPLETE_LINK_CAPABILITY,
    '/item/public_token/exchange',
    {
      publicToken,
      metadata,
      institutionId: metadataString(metadata, [
        'institution',
        'institution_id',
      ]),
      institutionName: metadataString(metadata, ['institution', 'name']),
      products,
    },
    workspaceId,
  )
  const itemRef = capabilityResult<PlaidItemRef>(response)
  const itemId = itemRef.itemId ?? itemRef.item_id
  const credentialRef = itemRef.credentialRef ?? itemRef.credential_ref
  if (!itemId || !credentialRef) {
    throw new Error('aivault did not return a Plaid Item reference')
  }

  const connection: MoneyConnection = {
    itemId,
    credentialRef,
    institutionId:
      itemRef.institutionId ??
      itemRef.institution_id ??
      metadataString(metadata, ['institution', 'institution_id']) ??
      'unknown',
    institutionName:
      itemRef.institutionName ??
      itemRef.institution_name ??
      metadataString(metadata, ['institution', 'name']) ??
      'Plaid institution',
    status: 'connected',
    products,
    connectedAt:
      itemRef.connectedAt ?? itemRef.connected_at ?? new Date().toISOString(),
  }

  const connections = await readConnections(c)
  const next = upsertConnection(connections, connection)
  await writeConnections(c, next)
  return connection
}

export async function completePlaidUpdateSession(
  c: Context,
  sessionId: string,
  _metadata: unknown,
): Promise<MoneyConnection> {
  purgeExpiredPlaidConnectSessions()
  const session = plaidConnectSessions.get(sessionId)
  if (!session || session.mode !== 'update' || !session.itemId) {
    throw new Error('Plaid update session was not found or has expired')
  }
  const workspaceId = getPlaidWorkspaceId(c)
  if (session.workspaceId !== workspaceId) {
    throw new Error('Plaid update session belongs to a different workspace')
  }
  const connections = await readConnections(c)
  const existing = connections.find((entry) => entry.itemId === session.itemId)
  if (!existing) {
    throw new Error('Plaid Item was not found in this workspace')
  }
  const connection: MoneyConnection = {
    ...existing,
    status: 'connected',
    products: uniqueProductStrings([
      ...existing.products,
      ...(session.productsToAdd ?? []),
    ]),
    lastError: undefined,
  }
  await writeConnections(c, upsertConnection(connections, connection))
  plaidConnectSessions.delete(sessionId)
  return connection
}

export async function syncPlaidConnection(
  c: Context,
  connection: MoneyConnection,
  cursor?: string,
): Promise<PlaidSyncResult> {
  const workspaceId = getPlaidWorkspaceId(c)
  const accountsResponse = await invokePlaidCapability(
    PLAID_ACCOUNTS_SYNC_CAPABILITY,
    '/accounts/get',
    { credentialRef: connection.credentialRef },
    workspaceId,
    60_000,
  )
  const accountsResult = capabilityResult<PlaidAccountsResult>(accountsResponse)
  const accounts = (accountsResult.accounts ?? []).map((account) =>
    mapPlaidAccount(account, connection),
  )

  const transactionsResult = await syncPlaidTransactions(
    connection,
    workspaceId,
    cursor,
  )
  const transactions = [
    ...(transactionsResult.added ?? []),
    ...(transactionsResult.modified ?? []),
  ].map((transaction) => mapPlaidTransaction(transaction, connection))
  const accountById = new Map(accounts.map((account) => [account.id, account]))

  const liabilitiesResult = connectionHasProduct(connection, 'liabilities')
    ? capabilityResult<PlaidLiabilitiesResult>(
        await invokePlaidCapability(
          PLAID_LIABILITIES_SYNC_CAPABILITY,
          '/liabilities/get',
          { credentialRef: connection.credentialRef },
          workspaceId,
          60_000,
        ),
      )
    : undefined
  const debts = liabilitiesResult
    ? mapPlaidLiabilities(liabilitiesResult, connection, accountById)
    : []

  const investmentsResult = connectionHasProduct(connection, 'investments')
    ? capabilityResult<PlaidInvestmentsResult>(
        await invokePlaidCapability(
          PLAID_INVESTMENTS_SYNC_CAPABILITY,
          '/investments/holdings/get',
          { credentialRef: connection.credentialRef },
          workspaceId,
          60_000,
        ),
      )
    : undefined
  const holdings = investmentsResult
    ? mapPlaidHoldings(investmentsResult, connection, accountById)
    : []

  return {
    connection: {
      ...connection,
      status: 'connected',
      lastSyncAt: new Date().toISOString(),
    },
    accounts,
    transactions,
    debts,
    holdings,
    raw: {
      accounts: accountsResult,
      transactions: transactionsResult,
      liabilities: liabilitiesResult,
      investments: investmentsResult,
    },
    removedTransactionIds: (transactionsResult.removed ?? []).map(
      (transaction) => transaction.transaction_id,
    ),
    nextCursor:
      transactionsResult.next_cursor ?? transactionsResult.nextCursor ?? cursor,
    hasMore: transactionsResult.has_more ?? transactionsResult.hasMore ?? false,
  }
}

async function syncPlaidTransactions(
  connection: MoneyConnection,
  workspaceId: string,
  cursor?: string,
): Promise<PlaidTransactionsResult> {
  const added: PlaidTransaction[] = []
  const modified: PlaidTransaction[] = []
  const removed: PlaidRemovedTransaction[] = []
  let nextCursor = cursor
  let hasMore = false
  let syncBatches = 0

  do {
    const response = await invokePlaidCapability(
      PLAID_TRANSACTIONS_SYNC_CAPABILITY,
      '/transactions/sync',
      {
        credentialRef: connection.credentialRef,
        cursor: nextCursor,
        count: 500,
        maxPages: 8,
      },
      workspaceId,
      120_000,
    )
    const result = capabilityResult<PlaidTransactionsResult>(response)
    added.push(...(result.added ?? []))
    modified.push(...(result.modified ?? []))
    removed.push(...(result.removed ?? []))
    nextCursor = result.next_cursor ?? result.nextCursor ?? nextCursor
    hasMore = result.has_more ?? result.hasMore ?? false
    syncBatches += 1
  } while (hasMore && nextCursor && syncBatches < MAX_TRANSACTION_SYNC_BATCHES)

  if (hasMore) {
    throw new Error(
      `Plaid transaction sync did not finish after ${MAX_TRANSACTION_SYNC_BATCHES} batches; no partial cursor was stored, so retry sync after increasing the batch limit or narrowing the import.`,
    )
  }

  return {
    added,
    modified,
    removed,
    next_cursor: nextCursor,
    nextCursor,
    has_more: false,
    hasMore: false,
    syncBatches,
  }
}

export async function removePlaidConnection(
  c: Context,
  connection: MoneyConnection,
): Promise<unknown> {
  const response = await invokePlaidCapability(
    PLAID_ITEM_REMOVE_CAPABILITY,
    '/item/remove',
    {
      itemId: connection.itemId,
      credentialRef: connection.credentialRef,
    },
    getPlaidWorkspaceId(c),
  )
  return capabilityResult<unknown>(response)
}

function capabilityResult<T>(response: unknown): T {
  const wrapped = response as PlaidCapabilityResponse<T>
  return (wrapped.result ?? response) as T
}

function upsertConnection(
  existing: MoneyConnection[],
  connection: MoneyConnection,
): MoneyConnection[] {
  const byItem = new Map(existing.map((entry) => [entry.itemId, entry]))
  byItem.set(connection.itemId, {
    ...byItem.get(connection.itemId),
    ...connection,
  })
  return [...byItem.values()]
}

function mapPlaidAccount(
  account: PlaidAccount,
  connection: MoneyConnection,
): MoneyAccount {
  const current = account.balances?.current ?? 0
  const type = mapAccountType(account.type, account.subtype ?? undefined)
  const isLiability = ['credit', 'loan', 'mortgage'].includes(type)
  const currentBalance = isLiability ? -Math.abs(current) : current
  const now = new Date().toISOString()
  const currencyCode =
    account.balances?.iso_currency_code ??
    account.balances?.unofficial_currency_code ??
    'USD'
  const creditLimit = account.balances?.limit ?? undefined
  const availableCredit =
    type === 'credit' && creditLimit !== undefined
      ? Math.max(creditLimit - Math.abs(currentBalance), 0)
      : undefined
  const utilization =
    type === 'credit' && creditLimit && creditLimit > 0
      ? Math.abs(currentBalance) / creditLimit
      : undefined
  const investmentAccountKind = normalizeInvestmentAccountKind({
    type,
    subtype: account.subtype ?? undefined,
    name: account.name,
    officialName: account.official_name ?? undefined,
  })
  const taxTreatment = normalizeTaxTreatment({
    type,
    subtype: account.subtype ?? undefined,
    name: account.name,
    officialName: account.official_name ?? undefined,
    investmentAccountKind,
  })

  return {
    id: account.account_id,
    source: 'plaid',
    connectionId: connection.itemId,
    itemId: connection.itemId,
    institutionName: connection.institutionName,
    name: account.name,
    officialName: account.official_name ?? undefined,
    type,
    subtype: account.subtype ?? undefined,
    mask: account.mask ?? undefined,
    currentBalance,
    isoCurrencyCode: currencyCode,
    asOf: account.balances?.last_updated_datetime ?? now,
    balance: {
      available: account.balances?.available ?? undefined,
      current: currentBalance,
      limit: account.balances?.limit ?? undefined,
      currencyCode,
      updatedAt: account.balances?.last_updated_datetime ?? now,
    },
    currencyCode,
    valueForSum: currentBalance,
    creditLimit,
    availableCredit,
    utilization,
    investmentAccountKind,
    taxTreatment,
    isAsset: !isLiability,
    isLiability,
    updatedAt: account.balances?.last_updated_datetime ?? now,
  }
}

function mapPlaidTransaction(
  transaction: PlaidTransaction,
  connection: MoneyConnection,
): MoneyTransaction {
  const primaryCategory =
    transaction.personal_finance_category?.primary ?? undefined
  const detailedCategory =
    transaction.personal_finance_category?.detailed ?? undefined
  const category = [
    ...(primaryCategory ? [primaryCategory] : []),
    ...(detailedCategory ? [detailedCategory] : []),
    ...(transaction.category ?? []),
  ].filter(Boolean)
  const uniqueCategory = [...new Set(category)]
  const direction = transactionDirection(transaction)
  const transferReason = plaidTransferReason(transaction)
  const amount = Math.abs(transaction.amount)
  const currencyCode =
    transaction.iso_currency_code ??
    transaction.unofficial_currency_code ??
    'USD'

  return {
    id: transaction.transaction_id,
    source: 'plaid',
    connectionId: connection.itemId,
    itemId: connection.itemId,
    accountId: transaction.account_id,
    merchantName: transaction.merchant_name ?? undefined,
    name: transaction.name,
    amount,
    direction,
    category: uniqueCategory.length ? uniqueCategory : ['Uncategorized'],
    providerCategoryPrimary: primaryCategory,
    providerCategoryDetailed: detailedCategory,
    providerPaymentChannel: transaction.payment_channel ?? undefined,
    transferReason,
    date: transaction.date,
    isoCurrencyCode: currencyCode,
    currencyCode,
    pending: transaction.pending ?? false,
    recurring: false,
    valueForSum: amount,
    isIncome: direction === 'income',
    isExpense: direction === 'expense',
  }
}

function mapPlaidLiabilities(
  result: PlaidLiabilitiesResult,
  connection: MoneyConnection,
  accountById: Map<string, MoneyAccount>,
): MoneyDebt[] {
  const liabilities = result.liabilities
  if (!liabilities) return []

  return [
    ...(liabilities.credit ?? []).map((liability) =>
      mapPlaidDebt(liability, 'credit', connection, accountById),
    ),
    ...(liabilities.mortgage ?? []).map((liability) =>
      mapPlaidDebt(liability, 'mortgage', connection, accountById),
    ),
    ...(liabilities.student ?? []).map((liability) =>
      mapPlaidDebt(liability, 'student', connection, accountById),
    ),
  ]
}

function mapPlaidDebt(
  liability:
    | PlaidCreditLiability
    | PlaidMortgageLiability
    | PlaidStudentLoanLiability,
  type: DebtType,
  connection: MoneyConnection,
  accountById: Map<string, MoneyAccount>,
): MoneyDebt {
  const account = accountById.get(liability.account_id)
  const now = new Date().toISOString()
  const balance = firstNumber([
    account ? Math.abs(account.currentBalance) : undefined,
    'last_statement_balance' in liability
      ? (liability.last_statement_balance ?? undefined)
      : undefined,
    'statement_balance' in liability
      ? (liability.statement_balance ?? undefined)
      : undefined,
    'origination_principal_amount' in liability
      ? (liability.origination_principal_amount ?? undefined)
      : undefined,
  ])
  const statementBalance =
    'last_statement_balance' in liability
      ? (liability.last_statement_balance ?? undefined)
      : 'statement_balance' in liability
        ? (liability.statement_balance ?? undefined)
        : undefined
  const creditLimit = account?.creditLimit ?? account?.balance?.limit
  const normalizedBalance = Math.abs(balance ?? 0)
  const apr = firstNumber([
    'aprs' in liability
      ? (liability.aprs?.find((entry) => entry.apr_percentage !== null)
          ?.apr_percentage ?? undefined)
      : undefined,
    'interest_rate' in liability
      ? (liability.interest_rate?.percentage ?? undefined)
      : undefined,
    'interest_rate_percentage' in liability
      ? (liability.interest_rate_percentage ?? undefined)
      : undefined,
  ])

  return {
    id: `${connection.itemId}:${type}:${liability.account_id}`,
    source: 'plaid',
    itemId: connection.itemId,
    connectionId: connection.itemId,
    accountId: liability.account_id,
    institutionName: connection.institutionName,
    name: account?.name ?? titleFromId(type),
    type,
    balance: normalizedBalance,
    apr,
    creditLimit,
    availableCredit:
      type === 'credit' && creditLimit !== undefined
        ? Math.max(creditLimit - normalizedBalance, 0)
        : undefined,
    statementBalance,
    utilization:
      type === 'credit' && creditLimit && creditLimit > 0
        ? normalizedBalance / creditLimit
        : undefined,
    minimumPayment: firstNumber([
      'minimum_payment_amount' in liability
        ? (liability.minimum_payment_amount ?? undefined)
        : undefined,
      'next_monthly_payment' in liability
        ? (liability.next_monthly_payment ?? undefined)
        : undefined,
    ]),
    nextPaymentDueDate:
      'next_payment_due_date' in liability
        ? (liability.next_payment_due_date ?? undefined)
        : undefined,
    lastPaymentAmount:
      'last_payment_amount' in liability
        ? (liability.last_payment_amount ?? undefined)
        : undefined,
    lastPaymentDate:
      'last_payment_date' in liability
        ? (liability.last_payment_date ?? undefined)
        : undefined,
    isOverdue:
      'is_overdue' in liability
        ? (liability.is_overdue ?? undefined)
        : undefined,
    currencyCode: account?.currencyCode ?? account?.isoCurrencyCode,
    updatedAt: now,
  }
}

function mapPlaidHoldings(
  result: PlaidInvestmentsResult,
  connection: MoneyConnection,
  accountById: Map<string, MoneyAccount>,
): MoneyHolding[] {
  const securitiesById = new Map(
    (result.securities ?? []).map((security) => [
      security.security_id,
      security,
    ]),
  )

  return (result.holdings ?? []).map((holding) => {
    const account = accountById.get(holding.account_id)
    const security = securitiesById.get(holding.security_id)
    const quantity = holding.quantity ?? 0
    const price = holding.institution_price ?? security?.close_price ?? 0
    const marketValue = holding.institution_value ?? quantity * price
    const investmentAccountKind = account
      ? normalizeInvestmentAccountKind(account)
      : undefined
    const taxTreatment = account
      ? normalizeTaxTreatment({ ...account, investmentAccountKind })
      : undefined
    const currencyCode =
      holding.iso_currency_code ??
      security?.iso_currency_code ??
      holding.unofficial_currency_code ??
      security?.unofficial_currency_code ??
      account?.currencyCode ??
      account?.isoCurrencyCode

    return {
      id: `${connection.itemId}:${holding.account_id}:${holding.security_id}`,
      source: 'plaid',
      itemId: connection.itemId,
      connectionId: connection.itemId,
      accountId: holding.account_id,
      institutionName: connection.institutionName,
      securityId: holding.security_id,
      name: security?.name ?? holding.security_id,
      tickerSymbol: security?.ticker_symbol ?? undefined,
      type: security?.type ?? undefined,
      accountSubtype: account?.subtype,
      accountName: account?.name,
      investmentAccountKind,
      taxTreatment,
      assetClass: normalizeInvestmentAssetClass({
        type: security?.type ?? undefined,
        name: security?.name ?? holding.security_id,
        tickerSymbol: security?.ticker_symbol ?? undefined,
        account,
      }),
      quantity,
      price,
      marketValue,
      currencyCode,
      asOf: new Date().toISOString(),
    }
  })
}

function mapAccountType(type: string, subtype?: string) {
  if (type === 'depository') return 'cash'
  if (type === 'credit') return 'credit'
  if (type === 'investment') return 'investment'
  if (type === 'loan' && subtype === 'mortgage') return 'mortgage'
  if (type === 'loan') return 'loan'
  return 'other'
}

function transactionDirection(
  transaction: PlaidTransaction,
): MoneyTransaction['direction'] {
  if (plaidTransferReason(transaction)) return 'transfer'
  if (transaction.amount < 0) return 'income'
  if (transaction.amount > 0) return 'expense'
  return 'transfer'
}

function plaidTransferReason(
  transaction: PlaidTransaction,
): string | undefined {
  const primary = transaction.personal_finance_category?.primary
  const detailed = transaction.personal_finance_category?.detailed
  if (detailed === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT')
    return 'credit_card_payment'
  if (primary === 'TRANSFER_IN') return 'provider_transfer_in'
  if (primary === 'TRANSFER_OUT') return 'provider_transfer_out'
  return undefined
}

function connectionHasProduct(connection: MoneyConnection, product: string) {
  return connection.products.some((entry) => entry.toLowerCase() === product)
}

function firstNumber(values: Array<number | undefined>): number | undefined {
  return values.find(
    (value) => typeof value === 'number' && Number.isFinite(value),
  )
}

function titleFromId(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function metadataProducts(metadata: unknown): string[] {
  const products = (metadata as { products?: unknown })?.products
  return asStringArray(products, DEFAULT_PRODUCTS)
}

function metadataString(metadata: unknown, path: string[]): string | undefined {
  let cursor: unknown = metadata
  for (const key of path) {
    if (!cursor || typeof cursor !== 'object') return undefined
    cursor = (cursor as Record<string, unknown>)[key]
  }
  return typeof cursor === 'string' && cursor.trim() ? cursor.trim() : undefined
}
