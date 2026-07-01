import {
  ensureDir,
  getAppDataDir,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { findWorkspaceSecret, upsertWorkspaceSecret } from '../aivault'
import { HostingError } from './errors'
import { netlifyOAuthClientId } from './providers/netlify'
import { connectionId, saveConnection } from './store'
import type { HostingConnection, HostingProviderId } from './types'
import { randomBytes } from 'node:crypto'

interface PendingOAuthState {
  provider: HostingProviderId
  workspaceId: string
  state: string
  createdAt: number
}

interface VercelTokenResponse {
  ok?: boolean
  tokens?: {
    access_token?: string
    token_type?: string
    user_id?: string
    team_id?: string
    installation_id?: string
  }
  error?: { code?: string; message?: string }
}

const VERCEL_SECRET_NAME = 'VERCEL_TOKEN'
const NETLIFY_SECRET_NAME = 'NETLIFY_TOKEN'
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000

export function secretNameForProvider(provider: HostingProviderId) {
  return provider === 'vercel' ? VERCEL_SECRET_NAME : NETLIFY_SECRET_NAME
}

export async function providerConnected(
  workspaceId: string,
  provider: HostingProviderId,
): Promise<boolean> {
  return !!(await findWorkspaceSecret(
    workspaceId,
    secretNameForProvider(provider),
  ))
}

export async function createOAuthLoginUrl(
  workspaceId: string,
  provider: HostingProviderId,
): Promise<string> {
  const state = randomBytes(32).toString('base64url')
  const redirectUri = getRedirectUri()
  let url: string

  if (provider === 'vercel') {
    url = createVercelInstallUrl(state)
  } else {
    const netlifyUrl = new URL('https://app.netlify.com/authorize')
    netlifyUrl.searchParams.set('client_id', netlifyOAuthClientId)
    netlifyUrl.searchParams.set('redirect_uri', redirectUri)
    netlifyUrl.searchParams.set('response_type', 'token')
    netlifyUrl.searchParams.set('state', state)
    url = netlifyUrl.toString()
  }

  await savePendingState({
    provider,
    workspaceId,
    state,
    createdAt: Date.now(),
  })
  return url
}

export async function completeVercelOAuth(
  code: string,
  state: string | undefined,
  callback: { teamId?: string; configurationId?: string } = {},
): Promise<HostingConnection> {
  const pending = await consumePendingState('vercel', state)
  const brokerResponse = await fetch(`${authBrokerUrl()}/api/vercel/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: envValue('VERCEL_INTEGRATION_CLIENT_ID'),
      code,
      redirectUri: getRedirectUri(),
    }),
  })
  const body = (await brokerResponse
    .json()
    .catch(() => null)) as VercelTokenResponse | null
  const token = body?.tokens?.access_token
  if (!brokerResponse.ok || !token) {
    throw new HostingError(
      'vercel_oauth_failed',
      body?.error?.message ??
        body?.error?.code ??
        'Vercel token exchange failed',
      502,
    )
  }

  await upsertWorkspaceSecret(pending.workspaceId, VERCEL_SECRET_NAME, token)
  return saveConnection(pending.workspaceId, {
    id: connectionId('vercel'),
    provider: 'vercel',
    name: 'Vercel',
    accountId:
      body?.tokens?.installation_id ??
      callback.configurationId ??
      body?.tokens?.user_id,
    teamId: body?.tokens?.team_id ?? callback.teamId,
    secretName: VERCEL_SECRET_NAME,
    status: 'connected',
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

export async function completeNetlifyOAuth(input: {
  accessToken: string
  state: string
}): Promise<HostingConnection> {
  const pending = await consumePendingState('netlify', input.state)
  if (!input.accessToken.trim()) {
    throw new HostingError(
      'netlify_oauth_failed',
      'Missing Netlify access token',
    )
  }

  await upsertWorkspaceSecret(
    pending.workspaceId,
    NETLIFY_SECRET_NAME,
    input.accessToken.trim(),
  )
  return saveConnection(pending.workspaceId, {
    id: connectionId('netlify'),
    provider: 'netlify',
    name: 'Netlify',
    secretName: NETLIFY_SECRET_NAME,
    status: 'connected',
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

export function oauthCallbackHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Connecting hosting account</title>
  <style>${authPageStyles()}</style>
</head>
<body>
  <div class="card">
    <div class="badge">...</div>
    <h1>Finishing connection</h1>
    <p id="message">You can close this window when the connection completes.</p>
  </div>
  <script>
    (async function () {
      var params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      var token = params.get('access_token');
      var state = params.get('state');
      var message = document.getElementById('message');
      try {
        if (!token || !state) throw new Error('Missing Netlify OAuth response.');
        var res = await fetch('/api/hosting/oauth/netlify/implicit-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-artifacts-client': '1' },
          body: JSON.stringify({ accessToken: token, state: state })
        });
        var body = await res.json().catch(function () { return {}; });
        if (!res.ok) throw new Error(body.error || 'Could not save Netlify connection.');
        if (window.opener) window.opener.postMessage({ type: 'hosting-oauth-success', provider: 'netlify' }, '*');
        message.textContent = 'Netlify connected. You can close this window.';
      } catch (error) {
        message.textContent = error && error.message ? error.message : 'Connection failed.';
      }
    })();
  </script>
</body>
</html>`
}

export function oauthSuccessHtml(provider: HostingProviderId) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hosting connected</title>
  <style>${authPageStyles()}</style>
</head>
<body>
  <div class="card">
    <div class="badge ok">OK</div>
    <h1>${providerName(provider)} connected</h1>
    <p>You can close this window.</p>
  </div>
  <script>
    if (window.opener) window.opener.postMessage({ type: 'hosting-oauth-success', provider: '${provider}' }, '*');
  </script>
</body>
</html>`
}

export function oauthFailureHtml(message: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hosting connection failed</title>
  <style>${authPageStyles()}</style>
</head>
<body>
  <div class="card">
    <div class="badge err">!</div>
    <h1>Connection failed</h1>
    <p>${escapeHtml(message)}</p>
  </div>
</body>
</html>`
}

function getRedirectUri(): string {
  try {
    const url = new URL(
      '/api/hosting/oauth/callback',
      envValue('MOLDABLE_APP_URL'),
    )
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.localhost')) {
      throw new Error(
        'MOLDABLE_APP_URL must be a Portless .localhost HTTPS URL',
      )
    }
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch (error) {
    if (error instanceof HostingError) throw error
    throw new HostingError(
      'oauth_not_configured',
      error instanceof Error
        ? error.message
        : 'MOLDABLE_APP_URL is not configured for hosting OAuth',
      500,
    )
  }
}

function authBrokerUrl() {
  return (process.env.MOLDABLE_AUTH_URL ?? 'https://auth.moldable.sh').replace(
    /\/+$/,
    '',
  )
}

function envValue(name: string) {
  const value = process.env[name]?.trim()
  if (value) return value

  throw new HostingError(
    'oauth_not_configured',
    `${name} is not configured for hosting OAuth`,
    500,
  )
}

function createVercelInstallUrl(state: string): string {
  const url = new URL(envValue('VERCEL_INTEGRATION_INSTALL_URL'))
  if (url.protocol !== 'https:' || url.hostname !== 'vercel.com') {
    throw new HostingError(
      'oauth_not_configured',
      'VERCEL_INTEGRATION_INSTALL_URL must be a https://vercel.com URL',
      500,
    )
  }
  url.searchParams.set('state', state)
  return url.toString()
}

function pendingAuthDir() {
  return safePath(getAppDataDir(), 'hosting', 'pending-oauth')
}

function pendingAuthPath(state: string) {
  return safePath(pendingAuthDir(), `${state}.json`)
}

async function savePendingState(state: PendingOAuthState) {
  await ensureDir(pendingAuthDir())
  await writeJson(pendingAuthPath(state.state), state)
}

async function consumePendingState(
  provider: HostingProviderId,
  state: string | undefined,
): Promise<PendingOAuthState> {
  if (!state || !/^[A-Za-z0-9_-]+$/.test(state)) {
    throw new HostingError('oauth_state_invalid', 'OAuth state mismatch')
  }
  const path = pendingAuthPath(state)
  const pending = await readJson<PendingOAuthState | null>(path, null)
  await writeJson(path, null).catch(() => {})
  if (!pending || pending.provider !== provider || pending.state !== state) {
    throw new HostingError('oauth_state_invalid', 'OAuth state mismatch')
  }
  if (Date.now() - pending.createdAt > OAUTH_STATE_TTL_MS) {
    throw new HostingError('oauth_state_expired', 'OAuth flow expired')
  }
  return pending
}

function providerName(provider: HostingProviderId) {
  return provider === 'vercel' ? 'Vercel' : 'Netlify'
}

function authPageStyles() {
  return `
    :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, sans-serif; }
    body { min-height: 100vh; margin: 0; display: grid; place-items: center; background: Canvas; color: CanvasText; }
    .card { width: min(420px, calc(100vw - 32px)); border: 1px solid color-mix(in srgb, CanvasText 12%, transparent); border-radius: 12px; padding: 28px; box-shadow: 0 18px 60px color-mix(in srgb, CanvasText 10%, transparent); }
    .badge { display: inline-grid; place-items: center; width: 32px; height: 32px; border-radius: 999px; background: color-mix(in srgb, CanvasText 8%, transparent); font-size: 12px; font-weight: 700; }
    .badge.ok { background: #16a34a; color: white; }
    .badge.err { background: #dc2626; color: white; }
    h1 { margin: 18px 0 8px; font-size: 22px; line-height: 1.2; }
    p { margin: 0; color: color-mix(in srgb, CanvasText 70%, transparent); line-height: 1.5; }
  `
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
