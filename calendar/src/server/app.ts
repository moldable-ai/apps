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
import { cors } from 'hono/cors'
import { z } from 'zod'

export const app = new Hono()

app.use('/api/*', cors())

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
  selfResponseStatus?: string | null
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

const eventsListParamsSchema = z
  .object({
    timeMin: z.string().optional(),
    timeMax: z.string().optional(),
    onlyFuture: z.boolean().optional(),
    includeDeclined: z.boolean().optional(),
    maxResults: z.number().int().min(1).max(2500).optional(),
    query: z.string().optional(),
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
    selfResponseStatus: selfAttendee?.responseStatus ?? null,
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
  if (!(await isAuthenticated(workspaceId))) {
    const error = new Error('Calendar is not connected')
    error.name = 'CalendarNotConnected'
    throw error
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
    .filter((event) => options.includeDeclined || event.status !== 'cancelled')
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

  return (response.items ?? []).map((item) => ({
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

  return invokeAivaultJson<calendar_v3.Schema$Event>(
    workspaceId,
    'google-calendar/events',
    {
      method: 'GET',
      path: calendarPath(
        `/calendars/primary/events/${encodeURIComponent(eventId)}`,
      ),
    },
  )
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
  return Array.from(params.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('&')
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

function filterEventsByQuery(events: CalendarEvent[], query?: string) {
  if (!query?.trim()) return events
  const normalized = query.toLowerCase()
  return events.filter((event) =>
    [event.title, event.location, event.status]
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

    if (errorMessage.includes('Missing') || isCalendarAuthError(error)) {
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

      return c.json({
        ok: true,
        result: filterEventsByQuery(events, params?.query),
      })
    }

    if (body.method === 'events.upcoming') {
      const upcomingParams = upcomingEventsParamsSchema.parse(body.params)
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
      const eventParams = eventGetParamsSchema.parse(body.params)
      const events = await fetchCalendarEvents(workspaceId)
      const event = events.find((item) => item.id === eventParams.id)

      if (!event) {
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

      return c.json({ ok: true, result: event })
    }

    if (body.method === 'events.findByICalUid') {
      const eventParams = eventFindByICalUidParamsSchema.parse(body.params)
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
      const eventParams = eventRsvpParamsSchema.parse(body.params)
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
