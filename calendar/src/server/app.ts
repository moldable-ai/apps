import { getWorkspaceFromRequest } from '@moldable-ai/storage'
import {
  clearTokens,
  getAuthUrl,
  getOAuth2Client,
  saveTokens,
} from '../lib/calendar/google-auth'
import { calendar_v3, google } from 'googleapis'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'

export const app = new Hono()

app.use('/api/*', cors())

interface CalendarEvent {
  id: string | null | undefined
  title: string | null | undefined
  start: string | null | undefined
  end: string | null | undefined
  isAllDay: boolean
  location: string | null | undefined
  link: string | null | undefined
  status: string | null | undefined
  colorId: string | null | undefined
}

const rpcRequestSchema = z.object({
  method: z.string(),
  params: z.unknown().optional(),
})

const eventsListParamsSchema = z
  .object({
    timeMin: z.string().optional(),
    timeMax: z.string().optional(),
    onlyFuture: z.boolean().optional(),
    includeDeclined: z.boolean().optional(),
    maxResults: z.number().int().min(1).max(2500).optional(),
  })
  .optional()

function mapGoogleEvent(event: calendar_v3.Schema$Event): CalendarEvent {
  return {
    id: event.id,
    title: event.summary || 'Untitled event',
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    isAllDay: !!event.start?.date,
    location: event.location,
    link: event.htmlLink,
    status: event.status,
    colorId: event.colorId,
  }
}

async function fetchCalendarEvents(
  workspaceId: string,
  options: {
    timeMin?: string
    timeMax?: string
    includeDeclined?: boolean
    maxResults?: number
  } = {},
): Promise<CalendarEvent[]> {
  const auth = await getOAuth2Client(workspaceId)

  if (
    !auth.credentials ||
    (!auth.credentials.access_token && !auth.credentials.refresh_token)
  ) {
    const error = new Error('Calendar is not connected')
    error.name = 'CalendarNotConnected'
    throw error
  }

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
    timeMin: options.timeMin || defaultMin,
    timeMax: options.timeMax || defaultMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: options.maxResults ?? 2500,
  })

  return (response.data.items ?? [])
    .filter((event) => options.includeDeclined || event.status !== 'cancelled')
    .map(mapGoogleEvent)
}

function todayRange(onlyFuture = true) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  )

  return {
    timeMin: (onlyFuture ? now : start).toISOString(),
    timeMax: end.toISOString(),
  }
}

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
    const workspaceId = getWorkspaceFromRequest(c.req.raw) ?? 'personal'
    const timeMin = c.req.query('timeMin')
    const timeMax = c.req.query('timeMax')
    const events = await fetchCalendarEvents(workspaceId, { timeMin, timeMax })

    return c.json({ events })
  } catch (error) {
    console.error('Failed to fetch events:', error)
    const errorMessage = error instanceof Error ? error.message : ''
    const errorCode = (error as { code?: number })?.code
    const errorStatus = (error as { status?: number })?.status

    if (error instanceof Error && error.name === 'CalendarNotConnected') {
      return c.json({ events: [], authenticated: false }, 401)
    }

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

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId =
    c.req.header('x-moldable-workspace-id') ??
    getWorkspaceFromRequest(c.req.raw) ??
    'personal'

  try {
    const body = rpcRequestSchema.parse(await c.req.json())
    const params = eventsListParamsSchema.parse(body.params)

    if (body.method === 'events.today') {
      const { timeMin, timeMax } = todayRange(params?.onlyFuture ?? true)
      const events = await fetchCalendarEvents(workspaceId, {
        timeMin,
        timeMax,
        includeDeclined: params?.includeDeclined,
        maxResults: params?.maxResults,
      })

      return c.json({ ok: true, result: events })
    }

    if (body.method === 'events.list') {
      const events = await fetchCalendarEvents(workspaceId, {
        timeMin: params?.timeMin,
        timeMax: params?.timeMax,
        includeDeclined: params?.includeDeclined,
        maxResults: params?.maxResults,
      })

      return c.json({ ok: true, result: events })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Calendar does not expose ${body.method}.`,
        },
      },
      404,
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'CalendarNotConnected') {
      return c.json({
        ok: false,
        error: {
          code: 'calendar_not_connected',
          message: 'Connect Calendar before other apps can show events.',
        },
      })
    }

    if (error instanceof z.ZodError) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_params',
            message: 'Calendar received invalid RPC parameters.',
            detail: error.flatten(),
          },
        },
        400,
      )
    }

    console.error('Calendar RPC failed:', error)
    return c.json(
      {
        ok: false,
        error: {
          code: 'calendar_rpc_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Calendar could not complete the request.',
        },
      },
      500,
    )
  }
})
