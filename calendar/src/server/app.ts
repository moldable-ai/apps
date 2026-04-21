import { getWorkspaceFromRequest } from '@moldable-ai/storage'
import {
  clearTokens,
  getAuthUrl,
  getOAuth2Client,
  saveTokens,
} from '../lib/calendar/google-auth'
import { google } from 'googleapis'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

export const app = new Hono()

app.use('/api/*', cors())

function authSuccessHtml() {
  return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Authentication Successful</title>
      </head>
      <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #000; color: #fff;">
        <div style="text-align: center;">
          <h1 style="color: #4ade80;">✓ Authenticated!</h1>
          <p>Redirecting back to Calendar...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'oauth-success' }, '*');
              setTimeout(() => window.close(), 1000);
            } else {
              setTimeout(() => window.location.href = '/', 1000);
            }
          </script>
        </div>
      </body>
    </html>`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function authFailureHtml(message: string) {
  return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Authentication Failed</title>
      </head>
      <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #000; color: #fff;">
        <div style="text-align: center; max-width: 400px;">
          <h1 style="color: #f87171;">✗ Authentication Failed</h1>
          <p style="color: #a1a1aa;">${escapeHtml(message)}</p>
          <p style="margin-top: 20px;"><a href="/" style="color: #60a5fa;">Return to Calendar</a></p>
        </div>
      </body>
    </html>`
}

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null

  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'calendar',
      port,
      status: 'ok',
      ts: Date.now(),
    },
    200,
    {
      'Cache-Control': 'no-store',
    },
  )
})

app.get('/api/auth/login', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const url = await getAuthUrl(workspaceId)
    return c.json({ url })
  } catch (error) {
    console.error('Login error:', error)
    return c.json(
      {
        error: 'Failed to generate auth URL',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})

app.get('/api/auth/callback', async (c) => {
  const code = c.req.query('code')

  if (!code) {
    return c.json({ error: 'No code provided' }, 400)
  }

  try {
    await saveTokens(code)
    return c.html(authSuccessHtml())
  } catch (error) {
    console.error('Auth error:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to exchange code'
    return c.html(authFailureHtml(errorMessage), 500)
  }
})

app.post('/api/auth/logout', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    await clearTokens(workspaceId)
    return c.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return c.json({ error: 'Failed to logout' }, 500)
  }
})

app.get('/api/events', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const auth = await getOAuth2Client(workspaceId)

    if (
      !auth.credentials ||
      (!auth.credentials.access_token && !auth.credentials.refresh_token)
    ) {
      return c.json({ events: [], authenticated: false }, 401)
    }

    const timeMin = c.req.query('timeMin')
    const timeMax = c.req.query('timeMax')
    const calendar = google.calendar({ version: 'v3', auth })

    const now = new Date()
    const defaultMin = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    ).toISOString()
    const defaultMax = new Date(
      now.getFullYear(),
      now.getMonth() + 2,
      0,
    ).toISOString()

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin || defaultMin,
      timeMax: timeMax || defaultMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 2500,
    })

    const events =
      response.data.items?.map((event) => ({
        id: event.id,
        title: event.summary,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        isAllDay: !!event.start?.date,
        location: event.location,
        link: event.htmlLink,
        status: event.status,
        colorId: event.colorId,
      })) || []

    return c.json({ events })
  } catch (error) {
    console.error('Failed to fetch events:', error)
    const errorMessage = error instanceof Error ? error.message : ''
    const errorCode = (error as { code?: number })?.code
    const errorStatus = (error as { status?: number })?.status

    if (
      errorMessage.includes('Missing') ||
      errorCode === 401 ||
      errorStatus === 401
    ) {
      return c.json({ events: [], authenticated: false }, 401)
    }

    return c.json(
      {
        error: 'Failed to fetch events',
        detail: errorMessage,
        code: errorCode,
        status: errorStatus,
      },
      500,
    )
  }
})
