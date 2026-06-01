import {
  generateId,
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
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

app.use('/api/*', cors())

const HISTORY_LIMIT = 500

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
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const limitRaw = c.req.query('limit')
  const query = c.req.query('q')
  let entries = await readHistory(workspaceId)
  if (query) entries = searchHistory(entries, query)
  const limit = limitRaw ? Number(limitRaw) : undefined
  if (limit && Number.isFinite(limit)) entries = entries.slice(0, limit)
  return c.json({ entries })
})

// Record a calculation or conversion the client already computed locally.
app.post('/api/history', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const parsed = recordEntrySchema.safeParse(await c.req.json())
  if (!parsed.success) {
    return c.json({ error: 'Invalid history entry' }, 400)
  }
  const record = await appendEntry(workspaceId, parsed.data)
  return c.json(record, 201)
})

// Delete one entry.
app.delete('/api/history/:id', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
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
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
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
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
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
  const workspaceId =
    c.req.header('x-moldable-workspace-id') ??
    getWorkspaceFromRequest(c.req.raw) ??
    'personal'

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
  const workspaceId =
    c.req.header('x-moldable-workspace-id') ??
    getWorkspaceFromRequest(c.req.raw) ??
    'personal'

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
