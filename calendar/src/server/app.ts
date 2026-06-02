import { getWorkspaceFromRequest } from '@moldable-ai/storage'
import { invokeAivaultJson } from '../lib/aivault'
import {
  clearTokens,
  getAuthUrl,
  isAuthenticated,
  saveTokens,
} from '../lib/calendar/google-auth'
import type { calendar_v3 } from 'googleapis'
import { Hono } from 'hono'
import { z } from 'zod'

export const app = new Hono()

interface CalendarEvent {
  id: string | null | undefined
  iCalUID?: string | null | undefined
  title: string | null | undefined
  start: string | null | undefined
  end: string | null | undefined
  isAllDay: boolean
  location: string | null | undefined
  link: string | null | undefined
  status: string | null | undefined
  colorId: string | null | undefined
  organizer?: {
    email?: string | null
    displayName?: string | null
    self?: boolean | null
  } | null
  attendees?: {
    email?: string | null
    displayName?: string | null
    responseStatus?: string | null
    optional?: boolean | null
    organizer?: boolean | null
    self?: boolean | null
  }[]
  selfResponseStatus?: string | null
  conferenceUrl?: string | null
  conferenceProvider?: string | null
}

interface CalendarListResponse {
  items?: calendar_v3.Schema$CalendarListEntry[]
}

interface EventListResponse {
  items?: calendar_v3.Schema$Event[]
}

const rpcRequestSchema = z.object({
  method: z.string(),
  params: z.unknown().optional(),
})

const dateTimeParamSchema = z.string().refine((value) => {
  return !Number.isNaN(Date.parse(value))
}, 'Expected a parseable date-time string.')

const eventsListParamsSchema = z
  .object({
    timeMin: dateTimeParamSchema.optional(),
    timeMax: dateTimeParamSchema.optional(),
    onlyFuture: z.boolean().optional(),
    includeDeclined: z.boolean().optional(),
    maxResults: z.number().int().min(1).max(2500).optional(),
    query: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (!value.timeMin || !value.timeMax) return

    const min = Date.parse(value.timeMin)
    const max = Date.parse(value.timeMax)
    if (min >= max) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'timeMin must be before timeMax.',
        path: ['timeMax'],
      })
      return
    }

    const maxRangeMs = 366 * 24 * 60 * 60 * 1000
    if (max - min > maxRangeMs) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Date range cannot exceed 366 days.',
        path: ['timeMax'],
      })
    }
  })
  .optional()

const upcomingEventsParamsSchema = z
  .object({
    days: z.number().int().min(1).max(90).optional(),
    includeDeclined: z.boolean().optional(),
    maxResults: z.number().int().min(1).max(2500).optional(),
  })
  .optional()

const eventGetParamsSchema = z.object({
  id: z.string().min(1),
})

const eventFindByICalUidParamsSchema = z.object({
  iCalUid: z.string().min(1),
})

const eventRsvpParamsSchema = z
  .object({
    eventId: z.string().min(1).optional(),
    iCalUid: z.string().min(1).optional(),
    responseStatus: z.enum([
      'accepted',
      'tentative',
      'declined',
      'needsAction',
    ]),
    sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional(),
  })
  .refine((value) => value.eventId || value.iCalUid, {
    message: 'Either eventId or iCalUid is required.',
  })

function mapGoogleEvent(event: calendar_v3.Schema$Event): CalendarEvent {
  const selfAttendee = event.attendees?.find((attendee) => attendee.self)
  const conferenceEntryPoint = event.conferenceData?.entryPoints?.find(
    (entryPoint) =>
      entryPoint.entryPointType === 'video' && Boolean(entryPoint.uri),
  )

  return {
    id: event.id,
    iCalUID: event.iCalUID,
    title: event.summary || 'Untitled event',
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    isAllDay: !!event.start?.date,
    location: event.location,
    link: event.htmlLink,
    status: event.status,
    colorId: event.colorId,
    organizer: event.organizer
      ? {
          email: event.organizer.email,
          displayName: event.organizer.displayName,
          self: event.organizer.self,
        }
      : null,
    attendees: event.attendees?.map((attendee) => ({
      email: attendee.email,
      displayName: attendee.displayName,
      responseStatus: attendee.responseStatus,
      optional: attendee.optional,
      organizer: attendee.organizer,
      self: attendee.self,
    })),
    selfResponseStatus: selfAttendee?.responseStatus ?? null,
    conferenceUrl: conferenceEntryPoint?.uri ?? event.hangoutLink ?? null,
    conferenceProvider: event.conferenceData?.conferenceSolution?.name ?? null,
  }
}

function googleSelfResponseStatus(event: calendar_v3.Schema$Event) {
  return (
    event.attendees?.find((attendee) => attendee.self)?.responseStatus ?? null
  )
}

function shouldIncludeGoogleEvent(
  event: calendar_v3.Schema$Event,
  includeDeclined = false,
) {
  if (event.status === 'cancelled') return false
  if (!includeDeclined && googleSelfResponseStatus(event) === 'declined') {
    return false
  }
  return true
}

function visibleCalendarListEntry(item: calendar_v3.Schema$CalendarListEntry) {
  return item.hidden !== true
}

async function fetchPrimaryCalendarListEntry(workspaceId: string) {
  if (!(await isAuthenticated(workspaceId))) {
    const error = new Error('Calendar is not connected')
    error.name = 'CalendarNotConnected'
    throw error
  }

  return invokeAivaultJson<calendar_v3.Schema$CalendarListEntry>(
    workspaceId,
    'google-calendar/lists',
    {
      method: 'GET',
      path: calendarPath('/users/me/calendarList/primary'),
    },
  )
}

async function primaryCalendarIsVisible(workspaceId: string) {
  const primary = await fetchPrimaryCalendarListEntry(workspaceId)
  return visibleCalendarListEntry(primary)
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
  if (!(await isAuthenticated(workspaceId))) {
    const error = new Error('Calendar is not connected')
    error.name = 'CalendarNotConnected'
    throw error
  }

  if (!(await primaryCalendarIsVisible(workspaceId))) {
    return []
  }

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
    23,
    59,
    59,
    999,
  ).toISOString()

  const params = new URLSearchParams()
  appendParam(params, 'timeMin', options.timeMin || defaultMin)
  appendParam(params, 'timeMax', options.timeMax || defaultMax)
  appendParam(params, 'singleEvents', true)
  appendParam(params, 'orderBy', 'startTime')
  appendParam(params, 'maxResults', options.maxResults ?? 2500)

  const response = await invokeAivaultJson<EventListResponse>(
    workspaceId,
    'google-calendar/events',
    {
      method: 'GET',
      path: calendarPath('/calendars/primary/events', params),
    },
  )

  return (response.items ?? [])
    .filter((event) => shouldIncludeGoogleEvent(event, options.includeDeclined))
    .map(mapGoogleEvent)
}

async function fetchCalendarList(workspaceId: string) {
  if (!(await isAuthenticated(workspaceId))) {
    const error = new Error('Calendar is not connected')
    error.name = 'CalendarNotConnected'
    throw error
  }

  const response = await invokeAivaultJson<CalendarListResponse>(
    workspaceId,
    'google-calendar/lists',
    {
      method: 'GET',
      path: calendarPath('/users/me/calendarList'),
    },
  )

  return (response.items ?? [])
    .filter(visibleCalendarListEntry)
    .map((item) => ({
      id: item.id,
      summary: item.summary,
      description: item.description,
      primary: item.primary,
      accessRole: item.accessRole,
      backgroundColor: item.backgroundColor,
      foregroundColor: item.foregroundColor,
    }))
}

async function fetchEventById(workspaceId: string, eventId: string) {
  if (!(await isAuthenticated(workspaceId))) {
    const error = new Error('Calendar is not connected')
    error.name = 'CalendarNotConnected'
    throw error
  }

  if (!(await primaryCalendarIsVisible(workspaceId))) {
    const notFound = new Error('Calendar event was not found')
    notFound.name = 'CalendarEventNotFound'
    throw notFound
  }

  try {
    return await invokeAivaultJson<calendar_v3.Schema$Event>(
      workspaceId,
      'google-calendar/events',
      {
        method: 'GET',
        path: calendarPath(
          `/calendars/primary/events/${encodeURIComponent(eventId)}`,
        ),
      },
    )
  } catch (error) {
    const status = (
      error as { status?: number; response?: { status?: number } }
    ).status
    const responseStatus = (
      error as { status?: number; response?: { status?: number } }
    ).response?.status
    if (status === 404 || responseStatus === 404) {
      const notFound = new Error('Calendar event was not found')
      notFound.name = 'CalendarEventNotFound'
      throw notFound
    }
    throw error
  }
}

async function fetchGoogleEventsByICalUid(
  workspaceId: string,
  iCalUid: string,
) {
  if (!(await isAuthenticated(workspaceId))) {
    const error = new Error('Calendar is not connected')
    error.name = 'CalendarNotConnected'
    throw error
  }

  if (!(await primaryCalendarIsVisible(workspaceId))) {
    return []
  }

  const params = new URLSearchParams()
  appendParam(params, 'iCalUID', iCalUid)
  appendParam(params, 'maxResults', 10)
  appendParam(params, 'showDeleted', false)

  const response = await invokeAivaultJson<EventListResponse>(
    workspaceId,
    'google-calendar/events',
    {
      method: 'GET',
      path: calendarPath('/calendars/primary/events', params),
    },
  )

  return response.items ?? []
}

async function findGoogleEventByICalUid(workspaceId: string, iCalUid: string) {
  const events = await fetchGoogleEventsByICalUid(workspaceId, iCalUid)
  return (
    events.find((event) => event.status !== 'cancelled') ?? events[0] ?? null
  )
}

async function rsvpToGoogleEvent(
  workspaceId: string,
  options: {
    eventId?: string
    iCalUid?: string
    responseStatus: 'accepted' | 'tentative' | 'declined' | 'needsAction'
    sendUpdates?: 'all' | 'externalOnly' | 'none'
  },
) {
  const event = options.eventId
    ? await fetchEventById(workspaceId, options.eventId)
    : options.iCalUid
      ? await findGoogleEventByICalUid(workspaceId, options.iCalUid)
      : null

  if (!event?.id) {
    const error = new Error('Calendar event was not found')
    error.name = 'CalendarEventNotFound'
    throw error
  }

  const attendees = event.attendees ?? []
  const selfIndex = attendees.findIndex((attendee) => attendee.self)

  if (selfIndex === -1) {
    const error = new Error(
      'Calendar event does not identify your attendee record',
    )
    error.name = 'CalendarAttendeeNotFound'
    throw error
  }

  const updatedAttendees = attendees.map((attendee, index) =>
    index === selfIndex
      ? { ...attendee, responseStatus: options.responseStatus }
      : attendee,
  )

  const params = new URLSearchParams()
  appendParam(params, 'sendUpdates', options.sendUpdates ?? 'all')

  const updated = await invokeAivaultJson<calendar_v3.Schema$Event>(
    workspaceId,
    'google-calendar/events',
    {
      method: 'PATCH',
      path: calendarPath(
        `/calendars/primary/events/${encodeURIComponent(event.id)}`,
        params,
      ),
      body: {
        attendees: updatedAttendees,
      },
    },
  )

  return updated
}

function calendarPath(pathname: string, params?: URLSearchParams) {
  const query = rawQuery(params)
  return `/calendar/v3${pathname}${query ? `?${query}` : ''}`
}

function rawQuery(params?: URLSearchParams) {
  if (!params) return ''
  return params.toString()
}

function appendParam(
  params: URLSearchParams,
  name: string,
  value: string | number | boolean | undefined,
) {
  if (value === undefined || value === '') return
  params.append(name, String(value))
}

function isCalendarAuthError(error: unknown) {
  const candidate = error as {
    code?: number
    status?: number
    response?: { status?: number }
    message?: string
  }
  const message = candidate.message ?? ''

  return (
    candidate.code === 401 ||
    candidate.status === 401 ||
    candidate.response?.status === 401 ||
    message.includes('client_secret is missing') ||
    message.includes('invalid_grant') ||
    message.includes('oauth2 token endpoint returned 400')
  )
}

function workspaceIdFromRequest(request: Request): string | null {
  return (
    request.headers.get('x-moldable-workspace-id') ??
    getWorkspaceFromRequest(request) ??
    null
  )
}

function workspaceRequiredResponse() {
  return {
    ok: false,
    error: {
      code: 'workspace_required',
      message: 'Calendar requires an explicit Moldable workspace.',
    },
  }
}

function isBrokerRpcRequest(request: Request) {
  return request.headers.get('x-moldable-rpc') === '1'
}

function filterEventsByQuery(events: CalendarEvent[], query?: string) {
  if (!query?.trim()) return events
  const normalized = query.toLowerCase()
  return events.filter((event) =>
    [
      event.title,
      event.location,
      event.status,
      event.conferenceProvider,
      event.conferenceUrl,
      event.organizer?.displayName,
      event.organizer?.email,
      ...(event.attendees ?? []).flatMap((attendee) => [
        attendee.displayName,
        attendee.email,
      ]),
    ]
      .filter(Boolean)
      .join('\n')
      .toLowerCase()
      .includes(normalized),
  )
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

// Shared, theme-aware styles for the OAuth handoff pages. These render in a
// popup that is outside the React app, so they can't use design-system tokens —
// instead they mirror the token palette via prefers-color-scheme so the page
// reads correctly whether the user's system is light or dark.
function authPageStyles() {
  return `
    :root {
      color-scheme: light dark;
      --bg: #ffffff;
      --card: #ffffff;
      --border: #e4e4e7;
      --fg: #18181b;
      --muted: #71717a;
      --accent: #16a34a;
      --accent-soft: #dcfce7;
      --danger: #dc2626;
      --danger-soft: #fee2e2;
      --link: #2563eb;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0a0a0a;
        --card: #161616;
        --border: #27272a;
        --fg: #fafafa;
        --muted: #a1a1aa;
        --accent: #4ade80;
        --accent-soft: rgba(74, 222, 128, 0.12);
        --danger: #f87171;
        --danger-soft: rgba(248, 113, 113, 0.12);
        --link: #60a5fa;
      }
    }
    * { box-sizing: border-box; }
    body {
      font-family: Inter, system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      background: var(--bg);
      color: var(--fg);
    }
    .card {
      width: 100%;
      max-width: 360px;
      text-align: center;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 32px 28px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.06);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 9999px;
      margin: 0 auto 16px;
      font-size: 22px;
    }
    .badge.ok { background: var(--accent-soft); color: var(--accent); }
    .badge.err { background: var(--danger-soft); color: var(--danger); }
    h1 { font-size: 18px; font-weight: 600; margin: 0 0 6px; letter-spacing: -0.01em; }
    p { font-size: 14px; line-height: 1.5; color: var(--muted); margin: 0; }
    a { color: var(--link); text-decoration: none; font-weight: 500; }
    a:hover { text-decoration: underline; }
    .footer { margin-top: 20px; }
  `
}

function authSuccessHtml() {
  return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Authentication Successful</title>
        <style>${authPageStyles()}</style>
      </head>
      <body>
        <div class="card">
          <div class="badge ok">✓</div>
          <h1>Calendar connected</h1>
          <p>Redirecting you back…</p>
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
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Authentication Failed</title>
        <style>${authPageStyles()}</style>
      </head>
      <body>
        <div class="card">
          <div class="badge err">✕</div>
          <h1>Couldn’t connect</h1>
          <p>${escapeHtml(message)}</p>
          <p class="footer"><a href="/">Return to Calendar</a></p>
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
    const workspaceId = workspaceIdFromRequest(c.req.raw)
    if (!workspaceId) {
      return c.json(workspaceRequiredResponse(), 400)
    }

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
  const state = c.req.query('state')

  if (!code) {
    return c.json({ error: 'No code provided' }, 400)
  }

  try {
    await saveTokens(code, state)
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
    const workspaceId = workspaceIdFromRequest(c.req.raw)
    if (!workspaceId) {
      return c.json(workspaceRequiredResponse(), 400)
    }

    await clearTokens(workspaceId)
    return c.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return c.json({ error: 'Failed to logout' }, 500)
  }
})

app.post('/api/rsvp', async (c) => {
  try {
    const workspaceId = workspaceIdFromRequest(c.req.raw)
    if (!workspaceId) {
      return c.json(workspaceRequiredResponse(), 400)
    }

    const eventParams = eventRsvpParamsSchema.parse(await c.req.json())
    const event = await rsvpToGoogleEvent(workspaceId, eventParams)
    return c.json({ ok: true, event: mapGoogleEvent(event) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_params',
            message: 'Calendar received invalid RSVP parameters.',
            detail: error.flatten(),
          },
        },
        400,
      )
    }

    if (error instanceof Error && error.name === 'CalendarEventNotFound') {
      return c.json(
        {
          ok: false,
          error: {
            code: 'event_not_found',
            message: 'Calendar event was not found.',
          },
        },
        404,
      )
    }

    if (error instanceof Error && error.name === 'CalendarAttendeeNotFound') {
      return c.json(
        {
          ok: false,
          error: {
            code: 'attendee_not_found',
            message:
              'Calendar could not find your attendee record for this event.',
          },
        },
        409,
      )
    }

    if (
      (error instanceof Error && error.name === 'CalendarNotConnected') ||
      isCalendarAuthError(error)
    ) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'calendar_not_connected',
            message: 'Connect Calendar before updating events.',
          },
        },
        401,
      )
    }

    console.error('Calendar RSVP failed:', error)
    return c.json(
      {
        ok: false,
        error: {
          code: 'calendar_rsvp_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Calendar could not update the event.',
        },
      },
      500,
    )
  }
})

app.get('/api/events', async (c) => {
  try {
    const workspaceId = workspaceIdFromRequest(c.req.raw)
    if (!workspaceId) {
      return c.json(workspaceRequiredResponse(), 400)
    }

    const params = eventsListParamsSchema.parse({
      timeMin: c.req.query('timeMin'),
      timeMax: c.req.query('timeMax'),
    })
    const events = await fetchCalendarEvents(workspaceId, {
      timeMin: params?.timeMin,
      timeMax: params?.timeMax,
      includeDeclined: true,
    })

    return c.json({ events })
  } catch (error) {
    console.error('Failed to fetch events:', error)
    const errorMessage = error instanceof Error ? error.message : ''
    const errorCode = (error as { code?: number })?.code
    const errorStatus = (error as { status?: number })?.status

    if (error instanceof Error && error.name === 'CalendarNotConnected') {
      return c.json({ events: [], authenticated: false }, 401)
    }

    if (errorMessage.includes('Missing') || isCalendarAuthError(error)) {
      return c.json({ events: [], authenticated: false }, 401)
    }

    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: 'Invalid event query parameters',
          detail: error.flatten(),
        },
        400,
      )
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

// Today contribution: surface ONLY an imminent meeting (starting within the next
// ~20 min, or in progress) — the one calendar moment that earns attention. Lead
// with Join (conference URL) when there's a video call, offer in-place RSVP when
// you haven't responded yet, and stay silent for far-off events, finished
// meetings, all-day items, and when Calendar isn't connected.
app.get('/api/moldable/today', async (c) => {
  const workspaceId = workspaceIdFromRequest(c.req.raw)
  if (!workspaceId) {
    return c.json({ items: [], generatedAt: new Date().toISOString() })
  }

  try {
    const { timeMin, timeMax } = todayRange(false)
    const events = await fetchCalendarEvents(workspaceId, {
      timeMin,
      timeMax,
      maxResults: 2500,
    })

    const now = Date.now()
    // The meeting happening right now or starting soonest, excluding ones the
    // user has already declined and all-day blocks (not "imminent" in any sense).
    const next = events
      .filter(
        (e) =>
          !e.isAllDay &&
          e.start &&
          e.end &&
          e.selfResponseStatus !== 'declined' &&
          Date.parse(e.end) > now,
      )
      .sort((a, b) => Date.parse(a.start!) - Date.parse(b.start!))[0]

    if (!next || !next.start || !next.end) {
      return c.json({ items: [], generatedAt: new Date().toISOString() })
    }

    const startMs = Date.parse(next.start)
    const minsUntil = Math.round((startMs - now) / 60000)
    const inProgress = startMs <= now && Date.parse(next.end) > now

    // Quiet unless the meeting is imminent (≤20 min out) or already running.
    if (!inProgress && minsUntil > 20) {
      return c.json({ items: [], generatedAt: new Date().toISOString() })
    }

    const timeLabel = new Date(startMs).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })
    const title = next.title ?? 'Untitled event'

    const when = inProgress
      ? 'now'
      : minsUntil <= 0
        ? 'now'
        : `in ${minsUntil} min`

    const actions: unknown[] = []

    // Richest action first: jump straight into the video call.
    if (next.conferenceUrl) {
      actions.push({
        type: 'open-app',
        label: 'Join',
        deepLink: next.conferenceUrl,
      })
    }

    // If you haven't responded, let you accept in place via the app's own RPC.
    if (next.id && next.selfResponseStatus === 'needsAction') {
      actions.push({
        type: 'rpc',
        label: 'Accept',
        method: 'events.rsvp',
        params: { eventId: next.id, responseStatus: 'accepted' },
      })
    }

    // Fallback to opening the event in Google Calendar.
    actions.push({
      type: 'open-app',
      label: actions.length ? 'View' : 'View event',
      ...(next.link ? { deepLink: next.link } : {}),
    })

    const subtitle =
      next.location ??
      (next.conferenceUrl ? `Video call · ${timeLabel}` : timeLabel)

    const item = {
      id: `event:${next.id}`,
      kind: 'timely',
      surface: 'nudge',
      title: `${title} ${when}`,
      subtitle,
      icon: '📅',
      priority: inProgress ? 96 : 92,
      actions,
    }

    return c.json({ items: [item], generatedAt: new Date().toISOString() })
  } catch {
    // Not connected / transient error → stay quiet.
    return c.json({ items: [], generatedAt: new Date().toISOString() })
  }
})

app.post('/api/moldable/rpc', async (c) => {
  if (!isBrokerRpcRequest(c.req.raw)) {
    return c.json(
      {
        ok: false,
        error: {
          code: 'broker_required',
          message: 'Calendar RPC must be invoked through Moldable.',
        },
      },
      403,
    )
  }

  const workspaceId = workspaceIdFromRequest(c.req.raw)
  if (!workspaceId) {
    return c.json(workspaceRequiredResponse(), 400)
  }

  try {
    const body = rpcRequestSchema.parse(await c.req.json())
    const rawParams = body.params ?? undefined

    if (body.method === 'events.today') {
      const params = eventsListParamsSchema.parse(rawParams)
      const { timeMin, timeMax } = todayRange(params?.onlyFuture ?? true)
      const events = await fetchCalendarEvents(workspaceId, {
        timeMin,
        timeMax,
        includeDeclined: params?.includeDeclined,
        maxResults: params?.maxResults,
      })

      return c.json({
        ok: true,
        result: filterEventsByQuery(events, params?.query),
      })
    }

    if (body.method === 'events.upcoming') {
      const upcomingParams = upcomingEventsParamsSchema.parse(rawParams)
      const now = new Date()
      const end = new Date(now)
      end.setDate(end.getDate() + (upcomingParams?.days ?? 7))
      const events = await fetchCalendarEvents(workspaceId, {
        timeMin: now.toISOString(),
        timeMax: end.toISOString(),
        includeDeclined: upcomingParams?.includeDeclined,
        maxResults: upcomingParams?.maxResults,
      })

      return c.json({ ok: true, result: events })
    }

    if (body.method === 'events.list' || body.method === 'events.search') {
      const params = eventsListParamsSchema.parse(rawParams)
      const events = await fetchCalendarEvents(workspaceId, {
        timeMin: params?.timeMin,
        timeMax: params?.timeMax,
        includeDeclined: params?.includeDeclined,
        maxResults: params?.maxResults,
      })

      return c.json({
        ok: true,
        result: filterEventsByQuery(events, params?.query),
      })
    }

    if (body.method === 'events.get') {
      const eventParams = eventGetParamsSchema.parse(rawParams)
      const event = await fetchEventById(workspaceId, eventParams.id)

      if (!event?.id) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'event_not_found',
              message: `Calendar event ${eventParams.id} was not found.`,
            },
          },
          404,
        )
      }

      return c.json({ ok: true, result: mapGoogleEvent(event) })
    }

    if (body.method === 'events.findByICalUid') {
      const eventParams = eventFindByICalUidParamsSchema.parse(rawParams)
      const event = await findGoogleEventByICalUid(
        workspaceId,
        eventParams.iCalUid,
      )

      return c.json({
        ok: true,
        result: event ? mapGoogleEvent(event) : null,
      })
    }

    if (body.method === 'events.rsvp') {
      const eventParams = eventRsvpParamsSchema.parse(rawParams)
      const event = await rsvpToGoogleEvent(workspaceId, eventParams)

      return c.json({
        ok: true,
        result: mapGoogleEvent(event),
      })
    }

    if (body.method === 'calendar.status') {
      try {
        await fetchCalendarEvents(workspaceId, { maxResults: 1 })
        return c.json({ ok: true, result: { connected: true } })
      } catch (error) {
        if (
          (error instanceof Error && error.name === 'CalendarNotConnected') ||
          isCalendarAuthError(error)
        ) {
          return c.json({ ok: true, result: { connected: false } })
        }
        throw error
      }
    }

    if (body.method === 'calendars.list') {
      return c.json({
        ok: true,
        result: await fetchCalendarList(workspaceId),
      })
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
    if (error instanceof Error && error.name === 'CalendarEventNotFound') {
      return c.json(
        {
          ok: false,
          error: {
            code: 'event_not_found',
            message: 'Calendar event was not found.',
          },
        },
        404,
      )
    }

    if (error instanceof Error && error.name === 'CalendarAttendeeNotFound') {
      return c.json(
        {
          ok: false,
          error: {
            code: 'attendee_not_found',
            message:
              'Calendar could not find your attendee record for this event.',
          },
        },
        409,
      )
    }

    if (
      (error instanceof Error && error.name === 'CalendarNotConnected') ||
      isCalendarAuthError(error)
    ) {
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
