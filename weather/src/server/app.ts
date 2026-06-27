import { getWorkspaceFromRequest } from '@moldable-ai/storage'
import type { ForecastDay, WeatherData, WeatherLocation } from '../lib/types'
import { weatherEmoji } from '../lib/wmo'
import {
  InvalidWeatherInputError,
  WeatherError,
  type WeatherQuery,
  clearLocationPreference,
  getLocationPreference,
  getWeatherData,
  isLocation,
  searchLocations,
  setLocationPreference,
} from './weather'
import { Hono } from 'hono'
import type { Context } from 'hono'
import { cors } from 'hono/cors'

export const app = new Hono()
app.use('/api/moldable/today', async (c, next) => {
  if (c.req.method !== 'GET') {
    await next()
    return
  }

  await next()

  const response = c.res
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return

  const data = (await response
    .clone()
    .json()
    .catch(() => null)) as unknown
  if (!isMoldableTodayResponse(data)) return

  const dismissals = await readMoldableTodayDismissals(c.req.raw)
  const items = filterMoldableTodayDismissedItems(data.items, dismissals)
  if (items.length === data.items.length) return

  const headers = new Headers(response.headers)
  headers.delete('content-length')
  c.res = new Response(JSON.stringify({ ...data, items }), {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
})

app.use('/api/*', cors())

// --- shared helpers ---------------------------------------------------------

/** Parse the optional `lat`, `lon`, `unit` inputs shared by every surface. */
function normalizeQuery(input: {
  lat?: unknown
  lon?: unknown
  unit?: unknown
}): WeatherQuery {
  const query: WeatherQuery = {}
  const lat = Number(input.lat)
  const lon = Number(input.lon)
  if (input.lat !== undefined || input.lon !== undefined) {
    query.latitude = lat
    query.longitude = lon
  }
  const unit = String(input.unit ?? '').toLowerCase()
  if (unit === 'c' || unit === 'celsius') query.unit = 'celsius'
  else if (unit === 'f' || unit === 'fahrenheit') query.unit = 'fahrenheit'
  return query
}

function queryFromContext(c: Context): WeatherQuery {
  const query = normalizeQuery({
    lat: c.req.query('lat'),
    lon: c.req.query('lon'),
    unit: c.req.query('unit'),
  })
  query.workspaceId = workspaceFromContext(c)
  return query
}

function errorMessage(err: unknown): string {
  if (err instanceof WeatherError) return err.message
  if (err instanceof Error) return err.message
  return 'Weather lookup failed'
}

function errorStatus(err: unknown): 400 | 502 {
  return err instanceof InvalidWeatherInputError ? 400 : 502
}

function workspaceFromContext(c: Context): string | undefined {
  return getWorkspaceFromRequest(c.req.raw)
}

function normalizeLocation(
  input: Record<string, unknown>,
): WeatherLocation | null {
  const latitude = Number(input.latitude)
  const longitude = Number(input.longitude)

  const location: WeatherLocation = {
    latitude,
    longitude,
    name: typeof input.name === 'string' ? input.name : undefined,
    region: typeof input.region === 'string' ? input.region : undefined,
    country: typeof input.country === 'string' ? input.country : undefined,
    timezone: typeof input.timezone === 'string' ? input.timezone : undefined,
  }
  return isLocation(location) ? location : null
}

/**
 * Decide whether today's weather is worth surfacing on the home screen, and if
 * so why. Returns null when nothing is notable (the common case) — see the
 * "quiet by default" rule for the Today view.
 */
function notableReason(data: WeatherData, today: ForecastDay): string | null {
  if (data.current.code >= 95) return 'Storms expected'
  const precip = today.precipitationProbability
  if (precip >= 50 || (data.current.code >= 51 && precip >= 30)) {
    return `${data.current.label} · ${precip}% chance`
  }
  if (
    (data.unit === 'fahrenheit' && today.high >= 95) ||
    (data.unit === 'celsius' && today.high >= 35)
  ) {
    return 'Heat — stay hydrated'
  }
  if (
    (data.unit === 'fahrenheit' && today.low <= 32) ||
    (data.unit === 'celsius' && today.low <= 0)
  ) {
    return 'Freezing — bundle up'
  }
  return null
}

// --- Moldable surfaces -------------------------------------------------------

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'weather',
      port: portRaw ? Number(portRaw) : null,
      status: 'ok',
      ts: Date.now(),
    },
    200,
    { 'Cache-Control': 'no-store' },
  )
})

/**
 * Today contribution. Weather is ambient, so we follow the "quiet by default"
 * rule: most days nothing here earns attention and we return no items. We
 * surface one `timely` metric only when today's weather is genuinely notable
 * — likely precipitation, a storm, or a temperature extreme.
 */
app.get('/api/moldable/today', async (c) => {
  const generatedAt = new Date().toISOString()
  try {
    const data = await getWeatherData(queryFromContext(c))
    const today = data.daily[0]
    const items: unknown[] = []

    if (today) {
      const reason = notableReason(data, today)
      if (reason) {
        const degree = data.unit === 'celsius' ? '°C' : '°F'
        const place = data.location.name ? ` · ${data.location.name}` : ''
        items.push({
          id: 'weather:today',
          kind: 'timely',
          surface: 'metric',
          title: `${data.current.temperature}${degree} · ${data.current.label}`,
          subtitle: `${reason} — H ${today.high}° / L ${today.low}°${place}`,
          icon: weatherEmoji(data.current.code, data.current.isDay),
          priority: data.current.code >= 95 ? 70 : 55,
          actions: [{ type: 'open-app', label: 'Open Weather' }],
        })
      }
    }

    return c.json({ items, resume: null, generatedAt })
  } catch (error) {
    // Offline / blocked / no location — stay silent, never break Today.
    console.error('Weather Today view failed:', errorMessage(error))
    return c.json({ items: [], resume: null, generatedAt })
  }
})

/** App API dispatch for cross-app / chat callers (see moldable.json appApi). */
app.post('/api/moldable/rpc', async (c) => {
  let method: string
  let params: { lat?: unknown; lon?: unknown; unit?: unknown }
  try {
    const body = (await c.req.json()) as {
      method?: unknown
      params?: Record<string, unknown>
    }
    if (typeof body.method !== 'string') {
      return c.json(
        {
          ok: false,
          error: { code: 'invalid_params', message: 'Missing method.' },
        },
        400,
      )
    }
    method = body.method
    params = body.params ?? {}
  } catch {
    return c.json(
      {
        ok: false,
        error: { code: 'invalid_params', message: 'Invalid JSON body.' },
      },
      400,
    )
  }

  // Validate the method before doing any (network) work, so unknown methods
  // always 404 deterministically rather than depending on a weather fetch.
  const KNOWN = ['weather.get', 'weather.conditions', 'weather.forecast']
  if (!KNOWN.includes(method)) {
    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Weather does not expose ${method}.`,
        },
      },
      404,
    )
  }

  try {
    const query = normalizeQuery(params)
    query.workspaceId = workspaceFromContext(c)
    const data = await getWeatherData(query)
    if (method === 'weather.get') {
      return c.json({ ok: true, result: data })
    }
    if (method === 'weather.conditions') {
      return c.json({
        ok: true,
        result: {
          unit: data.unit,
          location: data.location,
          current: data.current,
          updatedAt: data.updatedAt,
        },
      })
    }
    if (method === 'weather.forecast') {
      return c.json({
        ok: true,
        result: {
          unit: data.unit,
          location: data.location,
          hourly: data.hourly,
          daily: data.daily,
          updatedAt: data.updatedAt,
        },
      })
    }
    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Weather does not expose ${method}.`,
        },
      },
      404,
    )
  } catch (error) {
    if (error instanceof InvalidWeatherInputError) {
      return c.json(
        {
          ok: false,
          error: { code: 'invalid_params', message: errorMessage(error) },
        },
        400,
      )
    }
    return c.json(
      {
        ok: false,
        error: { code: 'weather_unavailable', message: errorMessage(error) },
      },
      502,
    )
  }
})

// --- Convenience REST surface for this app's own client ----------------------

app.get('/api/weather', async (c) => {
  try {
    const data: WeatherData = await getWeatherData(queryFromContext(c))
    return c.json(data)
  } catch (error) {
    return c.json({ error: errorMessage(error) }, errorStatus(error))
  }
})

app.get('/api/locations/search', async (c) => {
  const q = c.req.query('q') ?? ''
  if (q.trim().length < 2) return c.json({ results: [] })

  try {
    const results = await searchLocations(q)
    return c.json({ results })
  } catch (error) {
    return c.json({ error: errorMessage(error), results: [] }, 502)
  }
})

app.get('/api/location', async (c) => {
  try {
    const location = await getLocationPreference(workspaceFromContext(c))
    return c.json({ mode: location ? 'custom' : 'ip', location })
  } catch (error) {
    return c.json({ error: errorMessage(error) }, 502)
  }
})

app.post('/api/location', async (c) => {
  let body: Record<string, unknown>
  try {
    body = (await c.req.json()) as Record<string, unknown>
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  try {
    const location = normalizeLocation(body)
    if (!location) return c.json({ error: 'Invalid location' }, 400)
    const saved = await setLocationPreference(workspaceFromContext(c), location)
    return c.json({ mode: 'custom', location: saved })
  } catch (error) {
    return c.json({ error: errorMessage(error) }, errorStatus(error))
  }
})

app.delete('/api/location', async (c) => {
  try {
    await clearLocationPreference(workspaceFromContext(c))
    return c.json({ mode: 'ip', location: null })
  } catch (error) {
    return c.json({ error: errorMessage(error) }, 502)
  }
})

app.get('/api/conditions', async (c) => {
  try {
    const data = await getWeatherData(queryFromContext(c))
    return c.json({
      unit: data.unit,
      location: data.location,
      current: data.current,
      updatedAt: data.updatedAt,
    })
  } catch (error) {
    return c.json({ error: errorMessage(error) }, errorStatus(error))
  }
})

app.get('/api/forecast', async (c) => {
  try {
    const data = await getWeatherData(queryFromContext(c))
    return c.json({
      unit: data.unit,
      location: data.location,
      hourly: data.hourly,
      daily: data.daily,
      updatedAt: data.updatedAt,
    })
  } catch (error) {
    return c.json({ error: errorMessage(error) }, errorStatus(error))
  }
})

app.post('/api/moldable/today/dismiss', async (c) => {
  const body = (await c.req.json().catch(() => null)) as unknown
  if (!isMoldableTodayDismissalRequest(body)) {
    return c.json({ error: 'Invalid Today dismissal payload.' }, 400)
  }

  const dismissals = await recordMoldableTodayDismissal(c.req.raw, {
    id: body.id,
    dismissalKey: body.dismissalKey,
    materialDismissalKey: body.materialDismissalKey,
    dismissedAt: body.dismissedAt ?? new Date().toISOString(),
    item: body.item,
  })

  return c.json({ ok: true, dismissals: dismissals.length })
})

type MoldableTodayItem = {
  id?: unknown
  kind?: unknown
  title?: unknown
  subtitle?: unknown
  groupHint?: unknown
}

type MoldableTodayDismissal = {
  id: string
  dismissalKey?: string
  materialDismissalKey?: string
  dismissedAt: string
  item?: {
    kind?: string
    title?: string
    subtitle?: string
    groupHint?: string
  }
}

function isMoldableTodayResponse(value: unknown): value is {
  items: MoldableTodayItem[]
  [key: string]: unknown
} {
  return isMoldableTodayRecord(value) && Array.isArray(value.items)
}

function isMoldableTodayDismissalRequest(
  value: unknown,
): value is MoldableTodayDismissal {
  if (!isMoldableTodayRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    optionalMoldableTodayString(value.dismissalKey) &&
    optionalMoldableTodayString(value.materialDismissalKey) &&
    optionalMoldableTodayString(value.dismissedAt) &&
    (value.item === undefined || isMoldableTodayDismissalItem(value.item))
  )
}

function isMoldableTodayDismissalItem(value: unknown): value is {
  kind?: string
  title?: string
  subtitle?: string
  groupHint?: string
} {
  if (!isMoldableTodayRecord(value)) return false
  return (
    optionalMoldableTodayString(value.kind) &&
    optionalMoldableTodayString(value.title) &&
    optionalMoldableTodayString(value.subtitle) &&
    optionalMoldableTodayString(value.groupHint)
  )
}

function optionalMoldableTodayString(value: unknown): boolean {
  return value === undefined || typeof value === 'string'
}

function isMoldableTodayRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function recordMoldableTodayDismissal(
  request: Request,
  dismissal: MoldableTodayDismissal,
): Promise<MoldableTodayDismissal[]> {
  const current = await readMoldableTodayDismissals(request)
  const key = dismissal.dismissalKey ?? dismissal.id
  const next = [
    ...current.filter((entry) => (entry.dismissalKey ?? entry.id) !== key),
    dismissal,
  ].sort((a, b) => a.id.localeCompare(b.id))
  await writeMoldableTodayDismissals(request, next)
  return next
}

async function readMoldableTodayDismissals(
  request: Request,
): Promise<MoldableTodayDismissal[]> {
  const filePath = await moldableTodayDismissalsPath(request)
  const { readFile } = await import('node:fs/promises')
  try {
    const data = JSON.parse(await readFile(filePath, 'utf8')) as unknown
    return Array.isArray(data)
      ? data.filter(isMoldableTodayDismissalRequest)
      : []
  } catch (error) {
    if (isNodeFileNotFound(error)) return []
    throw error
  }
}

async function writeMoldableTodayDismissals(
  request: Request,
  dismissals: MoldableTodayDismissal[],
): Promise<void> {
  const filePath = await moldableTodayDismissalsPath(request)
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const tempPath = path.join(
    path.dirname(filePath),
    '.' +
      path.basename(filePath) +
      '.' +
      process.pid +
      '.' +
      Date.now() +
      '.tmp',
  )
  await fs.writeFile(tempPath, JSON.stringify(dismissals, null, 2), 'utf8')
  await fs.rename(tempPath, filePath)
}

async function moldableTodayDismissalsPath(request: Request): Promise<string> {
  const path = await import('node:path')
  return path.join(moldableTodayDataDir(request), 'today-dismissals.json')
}

function moldableTodayDataDir(request: Request): string {
  const workspaceId =
    request.headers.get('x-moldable-workspace') ??
    request.headers.get('x-moldable-workspace-id') ??
    process.env.MOLDABLE_WORKSPACE_ID ??
    'personal'
  const appId = process.env.MOLDABLE_APP_ID

  if (appId) {
    const home =
      process.env.MOLDABLE_HOME ??
      (process.env.HOME ?? process.cwd()) + '/.moldable'
    return home + '/workspaces/' + workspaceId + '/apps/' + appId + '/data'
  }

  return process.env.MOLDABLE_APP_DATA_DIR ?? process.cwd() + '/data'
}

function filterMoldableTodayDismissedItems<T extends MoldableTodayItem>(
  items: T[],
  dismissals: MoldableTodayDismissal[],
): T[] {
  if (dismissals.length === 0) return items
  const dismissedIds = new Set(dismissals.map((entry) => entry.id))
  const dismissedMaterialKeys = new Set(
    dismissals
      .map((entry) => entry.materialDismissalKey)
      .filter((key): key is string => Boolean(key)),
  )

  return items.filter((item) => {
    if (typeof item.id === 'string' && dismissedIds.has(item.id)) return false
    return !dismissedMaterialKeys.has(moldableTodayMaterialKey(item))
  })
}

function moldableTodayMaterialKey(item: MoldableTodayItem): string {
  return [
    'material',
    process.env.MOLDABLE_APP_ID ?? '',
    typeof item.kind === 'string' ? item.kind : '',
    'text',
    normalizeMoldableTodayText(item.title),
    normalizeMoldableTodayText(item.subtitle),
    typeof item.groupHint === 'string' ? item.groupHint : '',
    '',
  ].join('\u001e')
}

function normalizeMoldableTodayText(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').toLowerCase()
    : ''
}

function isNodeFileNotFound(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  )
}

export default app
