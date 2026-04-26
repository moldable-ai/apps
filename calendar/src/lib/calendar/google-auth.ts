import {
  ensureDir,
  getAppDataDir,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import {
  deleteWorkspaceSecret,
  findWorkspaceSecret,
  upsertWorkspaceSecret,
} from '../aivault'
import crypto from 'node:crypto'

// Token type for Google OAuth
interface GoogleTokens {
  access_token?: string
  refresh_token?: string
  expiry_date?: number
  token_type?: string
  scope?: string
  expires_in?: number
}

interface BrokerTokenResponse {
  ok?: boolean
  tokens?: GoogleTokens
  error?: {
    code?: string
    message?: string
  }
}

interface PKCEState {
  code_verifier: string
  created_at: number
  state: string
  workspace_id?: string
}

const DEFAULT_CLIENT_ID =
  '41613180648-695hpsmivjfsi02vkge9k713j3un09i4.apps.googleusercontent.com'
const CALENDAR_VAULT_SECRET_NAME = 'GOOGLE_CALENDAR_OAUTH'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
]

// Helper to get the redirect URI based on current port
function getRedirectUri(): string {
  // Default to 3006, but this could be made dynamic if needed
  const port = process.env.MOLDABLE_PORT || process.env.PORT || '3006'
  // Use localhost (not 127.0.0.1) for Google Desktop app OAuth
  return `http://localhost:${port}/api/auth/callback`
}

function getClientCredentials() {
  return {
    clientId:
      process.env.CALENDAR_GOOGLE_CLIENT_ID ??
      process.env.GOOGLE_CLIENT_ID ??
      DEFAULT_CLIENT_ID,
  }
}

function getBrokerUrl() {
  return (
    process.env.GOOGLE_OAUTH_BROKER_URL ??
    process.env.MOLDABLE_AUTH_URL ??
    'https://auth.moldable.sh'
  ).replace(/\/+$/, '')
}

// Generate PKCE code verifier (random string)
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url')
}

// Generate PKCE code challenge from verifier (SHA256 hash)
function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}

function generateOAuthState(): string {
  return crypto.randomBytes(32).toString('base64url')
}

function tokenPath(workspaceId?: string) {
  return safePath(getAppDataDir(workspaceId), 'tokens.json')
}

export async function getAuthUrl(workspaceId?: string) {
  const { clientId } = getClientCredentials()
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)
  const state = generateOAuthState()
  const dataDir = getAppDataDir()
  const pkcePath = safePath(dataDir, 'pkce-state.json')

  await ensureDir(dataDir)
  await writeJson(pkcePath, {
    code_verifier: codeVerifier,
    created_at: Date.now(),
    state,
    workspace_id: workspaceId,
  } satisfies PKCEState)

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', getRedirectUri())
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPES.join(' '))
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('code_challenge', codeChallenge)
  return url.toString()
}

export async function saveTokens(code: string, state: string | undefined) {
  // Load the PKCE code verifier from default data dir (stored there by getAuthUrl)
  const defaultDataDir = getAppDataDir()
  const pkcePath = safePath(defaultDataDir, 'pkce-state.json')
  const pkceState = await readJson<PKCEState | null>(pkcePath, null)

  if (!pkceState) {
    throw new Error('PKCE state not found - auth flow may have expired')
  }

  // Check if PKCE state is too old (10 minutes)
  if (Date.now() - pkceState.created_at > 10 * 60 * 1000) {
    throw new Error('PKCE state expired - please try authenticating again')
  }

  if (!state || state !== pkceState.state) {
    throw new Error('OAuth state mismatch - please try authenticating again')
  }

  const { clientId } = getClientCredentials()
  const response = await fetch(`${getBrokerUrl()}/api/google/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId,
      code,
      codeVerifier: pkceState.code_verifier,
      redirectUri: getRedirectUri(),
    }),
  })
  const brokerResponse = (await response.json()) as BrokerTokenResponse
  const tokens = brokerResponse.tokens

  if (!response.ok || !tokens) {
    throw new Error(
      brokerResponse.error?.message ??
        brokerResponse.error?.code ??
        'Google token exchange failed',
    )
  }

  if (!tokens.refresh_token) {
    throw new Error(
      'Google did not return a refresh token. Please reconnect Calendar.',
    )
  }

  const workspaceId = pkceState.workspace_id ?? 'personal'
  await upsertWorkspaceSecret(
    workspaceId,
    CALENDAR_VAULT_SECRET_NAME,
    toVaultOAuthPayload(tokens),
  )
  await writeJson(pkcePath, null)

  return tokens
}

export async function isAuthenticated(workspaceId?: string): Promise<boolean> {
  const id = workspaceId ?? 'personal'
  await migrateLegacyTokensToVault(id)
  return !!(await findWorkspaceSecret(id, CALENDAR_VAULT_SECRET_NAME))
}

export async function clearTokens(workspaceId?: string): Promise<void> {
  const id = workspaceId ?? 'personal'
  await deleteWorkspaceSecret(id, CALENDAR_VAULT_SECRET_NAME)
  const dataDir = getAppDataDir(workspaceId)
  await ensureDir(dataDir)
  await writeJson(tokenPath(workspaceId), null)
}

function toVaultOAuthPayload(tokens: GoogleTokens) {
  const { clientId } = getClientCredentials()
  const accessTokenExpiresAtMs =
    tokens.expiry_date ??
    (tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined)

  return JSON.stringify({
    clientId,
    refreshToken: tokens.refresh_token ?? '',
    accessToken: tokens.access_token ?? null,
    accessTokenExpiresAtMs: accessTokenExpiresAtMs ?? 0,
  })
}

async function migrateLegacyTokensToVault(workspaceId: string) {
  const legacyTokens = await readJson<GoogleTokens | null>(
    tokenPath(workspaceId),
    null,
  )
  if (!legacyTokens?.refresh_token) return

  await upsertWorkspaceSecret(
    workspaceId,
    CALENDAR_VAULT_SECRET_NAME,
    toVaultOAuthPayload(legacyTokens),
  )
  await writeJson(tokenPath(workspaceId), null)
}
