import {
  generateId,
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  sanitizeId,
  writeJson,
} from '@moldable-ai/storage'
import { CalcError, evaluate, formatResult } from '../lib/calc'
import type { HistoryEntry, HistoryKind } from '../lib/history'
import {
  CATEGORIES,
  type CategoryId,
  ConvertError,
  type RateTable,
  convert,
  unitSymbol,
} from '../lib/units'
import { getRates } from './rates'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'

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

const HISTORY_LIMIT = 500

function normalizeWorkspaceId(
  value: string | null | undefined,
): string | undefined {
  if (!value) return undefined
  try {
    return sanitizeId(value)
  } catch {
    return undefined
  }
}

function getRequestWorkspaceId(request: Request): string | undefined {
  return normalizeWorkspaceId(
    getWorkspaceFromRequest(request) ??
      request.headers.get('x-moldable-workspace-id'),
  )
}

function getHistoryPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'history.json')
}

async function readHistory(workspaceId?: string): Promise<HistoryEntry[]> {
  return readJson<HistoryEntry[]>(getHistoryPath(workspaceId), [])
}

async function writeHistory(
  workspaceId: string | undefined,
  entries: HistoryEntry[],
): Promise<void> {
  await writeJson(getHistoryPath(workspaceId), entries.slice(0, HISTORY_LIMIT))
}

async function appendEntry(
  workspaceId: string | undefined,
  entry: {
    kind: HistoryKind
    expression: string
    result: string
    resultValue: number
  },
): Promise<HistoryEntry> {
  const history = await readHistory(workspaceId)
  const record: HistoryEntry = {
    id: generateId(),
    kind: entry.kind,
    expression: entry.expression,
    result: entry.result,
    resultValue: entry.resultValue,
    createdAt: new Date().toISOString(),
  }
  // Newest first.
  history.unshift(record)
  await writeHistory(workspaceId, history)
  return record
}

const angleModeSchema = z.enum(['deg', 'rad'])

const rpcRequestSchema = z.object({
  method: z.string(),
  params: z.unknown().optional(),
})

const evaluateParamsSchema = z.object({
  expression: z.string().min(1),
  angleMode: angleModeSchema.optional(),
  record: z.boolean().optional(),
})

const convertParamsSchema = z.object({
  value: z.number(),
  from: z.string().min(1),
  to: z.string().min(1),
  category: z
    .enum([
      'length',
      'mass',
      'temperature',
      'volume',
      'area',
      'speed',
      'data',
      'time',
      'currency',
    ])
    .optional(),
  record: z.boolean().optional(),
})

const recordEntrySchema = z.object({
  kind: z.enum(['calc', 'convert']),
  expression: z.string().min(1),
  result: z.string().min(1),
  resultValue: z.number(),
})

const recentParamsSchema = z
  .object({ limit: z.number().int().min(1).max(HISTORY_LIMIT).optional() })
  .optional()

const searchParamsSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(HISTORY_LIMIT).optional(),
})

function searchHistory(entries: HistoryEntry[], query: string): HistoryEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return entries
  return entries.filter(
    (e) =>
      e.expression.toLowerCase().includes(q) ||
      e.result.toLowerCase().includes(q),
  )
}

async function parseJsonBody(c: { req: { json: () => Promise<unknown> } }) {
  try {
    return await c.req.json()
  } catch {
    return undefined
  }
}

function parseLimit(limitRaw: string | undefined): number | undefined {
  if (limitRaw === undefined) return undefined
  const limit = Number(limitRaw)
  if (!Number.isFinite(limit) || limit < 1) return undefined
  return Math.min(Math.floor(limit), HISTORY_LIMIT)
}

// Evaluate an expression and (optionally) record it, returning a uniform shape.
function runEvaluate(expression: string, mode: 'deg' | 'rad') {
  const value = evaluate(expression, mode)
  return {
    expression,
    value,
    formatted: formatResult(value),
  }
}

// Run a conversion and produce display-friendly labels.
function runConvert(
  value: number,
  from: string,
  to: string,
  category?: CategoryId,
  rates?: RateTable,
) {
  const res = convert(value, from, to, category, rates)
  const fromSym = unitSymbol(from)
  const toSym = unitSymbol(to)
  const expression = `${formatResult(value)} ${fromSym} → ${toSym}`
  const label = `${formatResult(res.result)} ${toSym}`
  return {
    value: res.value,
    from: res.from,
    to: res.to,
    category: res.category,
    resultValue: res.result,
    fromSym,
    toSym,
    expression,
    label,
  }
}

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null

  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'calculator',
      port,
      status: 'ok',
      ts: Date.now(),
    },
    200,
    { 'Cache-Control': 'no-store' },
  )
})

// List history. Supports ?limit and ?q (search).
app.get('/api/history', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  const limitRaw = c.req.query('limit')
  const query = c.req.query('q')
  let entries = await readHistory(workspaceId)
  if (query) entries = searchHistory(entries, query)
  const limit = parseLimit(limitRaw)
  if (limit !== undefined) entries = entries.slice(0, limit)
  return c.json({ entries })
})

// Record a calculation or conversion the client already computed locally.
app.post('/api/history', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  const body = await parseJsonBody(c)
  const parsed = recordEntrySchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Invalid history entry' }, 400)
  }
  const record = await appendEntry(workspaceId, parsed.data)
  return c.json(record, 201)
})

// Delete one entry.
app.delete('/api/history/:id', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  const id = c.req.param('id')
  const history = await readHistory(workspaceId)
  const next = history.filter((e) => e.id !== id)
  if (next.length === history.length) {
    return c.json({ error: 'Not found' }, 404)
  }
  await writeHistory(workspaceId, next)
  return c.json({ ok: true })
})

// Clear all history.
app.delete('/api/history', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  await writeHistory(workspaceId, [])
  return c.json({ ok: true })
})

// Expose conversion categories so the client can render selectors without
// duplicating the table.
app.get('/api/categories', (c) => {
  return c.json({ categories: CATEGORIES })
})

// Live currency exchange rates (units per 1 USD), cached per workspace.
app.get('/api/rates', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  try {
    const payload = await getRates(workspaceId)
    return c.json(payload, 200, { 'Cache-Control': 'no-store' })
  } catch {
    return c.json(
      { error: 'Live exchange rates are currently unavailable.' },
      503,
    )
  }
})

// Today contribution. Calculator is a tool, not a source of obligations, so it
// is quiet by default. The single thing worth a glanceable "resume" is the last
// calculation done *today* — letting you pick the running thread back up. Stale
// (> 24h) history stays silent.
app.get('/api/moldable/today', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw) ?? 'personal'

  try {
    const history = await readHistory(workspaceId)
    const latest = history[0]
    if (!latest) {
      return c.json({
        items: [],
        resume: null,
        generatedAt: new Date().toISOString(),
      })
    }

    const ageMs = Date.now() - Date.parse(latest.createdAt)
    if (!Number.isFinite(ageMs) || ageMs > 24 * 60 * 60 * 1000) {
      return c.json({
        items: [],
        resume: null,
        generatedAt: new Date().toISOString(),
      })
    }

    const resume = {
      title: `${latest.expression} = ${latest.result}`,
      subtitle:
        latest.kind === 'convert' ? 'Last conversion' : 'Last calculation',
      icon: '🧮',
      lastTouchedAt: latest.createdAt,
    }

    return c.json({
      items: [],
      resume,
      generatedAt: new Date().toISOString(),
    })
  } catch {
    return c.json({
      items: [],
      resume: null,
      generatedAt: new Date().toISOString(),
    })
  }
})

// App-to-app RPC surface. Mirrors the capabilities declared in moldable.json.
app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw) ?? 'personal'

  let body: z.infer<typeof rpcRequestSchema>
  try {
    body = rpcRequestSchema.parse(await c.req.json())
  } catch {
    return c.json(
      {
        ok: false,
        error: { code: 'bad_request', message: 'Invalid RPC request.' },
      },
      400,
    )
  }

  try {
    if (body.method === 'compute.evaluate') {
      const params = evaluateParamsSchema.parse(body.params)
      const evald = runEvaluate(params.expression, params.angleMode ?? 'deg')
      if (params.record !== false) {
        await appendEntry(workspaceId, {
          kind: 'calc',
          expression: params.expression,
          result: evald.formatted,
          resultValue: evald.value,
        })
      }
      return c.json({
        ok: true,
        result: {
          expression: evald.expression,
          result: evald.value,
          formatted: evald.formatted,
        },
      })
    }

    if (body.method === 'convert.units') {
      const params = convertParamsSchema.parse(body.params)
      // Currency needs live rates; other categories convert offline.
      const isCurrency =
        params.category === 'currency' ||
        (!params.category &&
          CATEGORIES.find((c) => c.id === 'currency')?.units.some(
            (u) => u.id === params.from,
          ))
      const rates = isCurrency ? (await getRates(workspaceId)).rates : undefined
      const conv = runConvert(
        params.value,
        params.from,
        params.to,
        params.category,
        rates,
      )
      if (params.record !== false) {
        await appendEntry(workspaceId, {
          kind: 'convert',
          expression: conv.expression,
          result: conv.label,
          resultValue: conv.resultValue,
        })
      }
      return c.json({
        ok: true,
        result: {
          value: conv.value,
          from: conv.from,
          to: conv.to,
          category: conv.category,
          result: conv.resultValue,
          formatted: conv.label,
        },
      })
    }

    if (body.method === 'history.recent') {
      const params = recentParamsSchema.parse(body.params)
      const history = await readHistory(workspaceId)
      return c.json({ ok: true, result: history.slice(0, params?.limit ?? 20) })
    }

    if (body.method === 'history.search') {
      const params = searchParamsSchema.parse(body.params)
      const history = await readHistory(workspaceId)
      const matches = searchHistory(history, params.query).slice(
        0,
        params.limit ?? 20,
      )
      return c.json({ ok: true, result: matches })
    }

    if (body.method === 'history.clear') {
      await writeHistory(workspaceId, [])
      return c.json({ ok: true, result: { cleared: true } })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Unknown method: ${body.method}`,
        },
      },
      404,
    )
  } catch (error) {
    if (error instanceof CalcError || error instanceof ConvertError) {
      return c.json(
        { ok: false, error: { code: 'invalid_input', message: error.message } },
        400,
      )
    }
    if (error instanceof z.ZodError) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_params',
            message: error.issues[0]?.message ?? 'Invalid params.',
          },
        },
        400,
      )
    }
    console.error('RPC error:', error)
    return c.json(
      {
        ok: false,
        error: { code: 'internal_error', message: 'Calculator RPC failed.' },
      },
      500,
    )
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
