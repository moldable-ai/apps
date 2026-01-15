import {
  getAppDataDir,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import crypto from 'crypto'
import { google } from 'googleapis'

// Token type for Google OAuth
interface GoogleTokens {
  access_token?: string
  refresh_token?: string
  expiry_date?: number
  token_type?: string
  scope?: string
}

interface PKCEState {
  code_verifier: string
  created_at: number
  workspace_id?: string
}

// Moldable's OAuth credentials for Google Calendar
// Desktop application type - credentials expected to be in binary
const CLIENT_ID =
  '41613180648-695hpsmivjfsi02vkge9k713j3un09i4.apps.googleusercontent.com'
const CLIENT_SECRET = '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'

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

// Helper to get the redirect URI based on current port
function getRedirectUri(): string {
  // Default to 3006, but this could be made dynamic if needed
  const port = process.env.PORT || '3006'
  // Use localhost (not 127.0.0.1) for Google Desktop app OAuth
  return `http://localhost:${port}/api/auth/callback`
}

// Generate PKCE code verifier (random string)
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url')
}

// Generate PKCE code challenge from verifier (SHA256 hash)
function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}

export async function getOAuth2Client(workspaceId?: string) {
  const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    getRedirectUri(),
  )

  // Try to load existing tokens
  const dataDir = getAppDataDir(workspaceId)
  const tokenPath = safePath(dataDir, 'tokens.json')
  const tokens = await readJson<GoogleTokens | null>(tokenPath, null)
  if (tokens) {
    oauth2Client.setCredentials(tokens)
  }

  return oauth2Client
}

export async function getAuthUrl(workspaceId?: string) {
  const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    getRedirectUri(),
  )

  // Generate PKCE values
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)

  // Store the code verifier temporarily (needed for token exchange)
  // Note: Store PKCE state in default app data dir (not workspace-specific)
  // because the OAuth callback won't have workspace context
  const dataDir = getAppDataDir()
  const pkcePath = safePath(dataDir, 'pkce-state.json')
  await writeJson(pkcePath, {
    code_verifier: codeVerifier,
    created_at: Date.now(),
    workspace_id: workspaceId,
  } satisfies PKCEState)

  // Generate auth URL with PKCE
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    code_challenge_method: 'S256' as const,
    code_challenge: codeChallenge,
  } as Parameters<typeof oauth2Client.generateAuthUrl>[0])
}

export async function saveTokens(code: string) {
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

  const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    getRedirectUri(),
  )

  // Exchange code for tokens with PKCE verifier
  console.log('Token exchange params:', {
    code: code.substring(0, 20) + '...',
    codeVerifier: pkceState.code_verifier.substring(0, 20) + '...',
    redirect_uri: getRedirectUri(),
  })

  try {
    const { tokens } = await oauth2Client.getToken({
      code,
      codeVerifier: pkceState.code_verifier,
      redirect_uri: getRedirectUri(),
    })

    // Save tokens to workspace-specific location (using workspace from PKCE state)
    const workspaceDataDir = getAppDataDir(pkceState.workspace_id)
    const tokenPath = safePath(workspaceDataDir, 'tokens.json')
    await writeJson(tokenPath, tokens)

    // Clean up PKCE state
    await writeJson(pkcePath, null)

    return tokens
  } catch (error: unknown) {
    // Log detailed error for debugging
    const gaxiosError = error as { response?: { data?: unknown } }
    console.error('Token exchange failed:', gaxiosError.response?.data || error)
    throw error
  }
}

export async function isAuthenticated(workspaceId?: string): Promise<boolean> {
  const dataDir = getAppDataDir(workspaceId)
  const tokenPath = safePath(dataDir, 'tokens.json')
  const tokens = await readJson<GoogleTokens | null>(tokenPath, null)
  return tokens !== null && !!tokens.access_token
}

export async function clearTokens(workspaceId?: string): Promise<void> {
  const dataDir = getAppDataDir(workspaceId)
  const tokenPath = safePath(dataDir, 'tokens.json')
  await writeJson(tokenPath, null)
}
