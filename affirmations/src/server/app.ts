import {
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  sanitizeId,
  writeJson,
} from '@moldable-ai/storage'
import { categories, getAffirmations } from '../lib/affirmations'
import { type StreakState, calculateStreakCount } from '../lib/streak'
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

const rpcRequestSchema = z.object({
  method: z.string(),
  params: z.unknown().optional(),
})

const affirmationsListParamsSchema = z
  .object({
    categoryId: z.string().optional(),
    query: z.string().optional(),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .optional()

const favoritesUpdateParamsSchema = z.object({
  favorites: z.array(z.string()),
})

const favoriteItemSchema = z.object({
  text: z.string().trim().min(1),
  favorite: z.boolean(),
})

const dayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const streakUpdateSchema = z.object({
  dayKey: dayKeySchema,
})

const streakStateSchema = z.object({
  count: z.number().int().positive(),
  lastVisit: dayKeySchema,
})

function normalizeFavorites(favorites: string[]): string[] {
  return Array.from(
    new Set(
      favorites
        .map((favorite) => favorite.trim())
        .filter((favorite) => favorite.length > 0),
    ),
  )
}

const favoritesSchema = z.array(z.string()).transform(normalizeFavorites)

class InvalidWorkspaceIdError extends Error {
  constructor() {
    super('Invalid workspace ID')
    this.name = 'InvalidWorkspaceIdError'
  }
}

function isInvalidWorkspaceIdError(
  error: unknown,
): error is InvalidWorkspaceIdError {
  return error instanceof InvalidWorkspaceIdError
}

function validateWorkspaceId(workspaceId: string | null): string | undefined {
  const trimmed = workspaceId?.trim()
  if (!trimmed) return undefined

  try {
    return sanitizeId(trimmed)
  } catch {
    throw new InvalidWorkspaceIdError()
  }
}

function getRequestWorkspaceId(request: Request): string | undefined {
  return validateWorkspaceId(
    getWorkspaceFromRequest(request) ??
      request.headers.get('x-moldable-workspace-id'),
  )
}

function getFavoritesPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'favorites.json')
}

function getStreakPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'streak.json')
}

async function loadFavorites(workspaceId?: string): Promise<string[]> {
  await ensureDir(getAppDataDir(workspaceId))
  const favorites = await readJson<unknown>(getFavoritesPath(workspaceId), [])
  return favoritesSchema.safeParse(favorites).data ?? []
}

async function loadStreak(workspaceId?: string): Promise<StreakState | null> {
  await ensureDir(getAppDataDir(workspaceId))
  const streak = await readJson<unknown>(getStreakPath(workspaceId), null)
  return streakStateSchema.safeParse(streak).data ?? null
}

function getRpcWorkspaceId(request: Request): string | undefined {
  return getRequestWorkspaceId(request)
}

function allAffirmations() {
  return categories.flatMap((category) =>
    getAffirmations(category.id).map((text) => ({
      text,
      categoryId: category.id,
      categoryName: category.name,
    })),
  )
}

function filterAffirmations(
  params: z.infer<typeof affirmationsListParamsSchema>,
) {
  const category = params?.categoryId
    ? categories.find((item) => item.id === params.categoryId)
    : undefined

  let affirmations = params?.categoryId
    ? category
      ? getAffirmations(category.id).map((text) => ({
          text,
          categoryId: category.id,
          categoryName: category.name,
        }))
      : []
    : allAffirmations()

  const query = params?.query?.trim().toLowerCase()
  if (query) {
    affirmations = affirmations.filter((item) =>
      item.text.toLowerCase().includes(query),
    )
  }

  return affirmations.slice(0, params?.limit ?? 100)
}

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null

  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'affirmations',
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

// Today contribution.
//
// Affirmations is a calm, manual app: its persisted favorites and daily streak
// are private app state, not work that needs attention. A stable count of saved
// favorites or visits is NOT an event that earns attention — surfacing it would
// be exactly the always-on empty-state nag the Today view forbids.
//
// There is no honest signal here and no genuine in-progress state to resume,
// so this app stays silent by default. (Per prds/today-view.prd.md: "Quiet by
// default. Most of the time most apps should emit nothing.")
app.get('/api/moldable/today', (c) => {
  const items: unknown[] = []
  const resume: unknown = null

  return c.json({ items, resume, generatedAt: new Date().toISOString() })
})

app.get('/api/favorites', async (c) => {
  try {
    const workspaceId = getRequestWorkspaceId(c.req.raw)
    const favorites = await loadFavorites(workspaceId)
    return c.json(favorites)
  } catch (error) {
    if (isInvalidWorkspaceIdError(error)) {
      return c.json({ error: 'Invalid workspace ID' }, 400)
    }

    console.error('Failed to read favorite affirmations:', error)
    return c.json({ error: 'Failed to read favorite affirmations' }, 500)
  }
})

app.post('/api/favorites', async (c) => {
  try {
    const workspaceId = getRequestWorkspaceId(c.req.raw)
    const body: unknown = await c.req.json().catch(() => null)
    const parsed = favoritesSchema.safeParse(body)

    if (!parsed.success) {
      return c.json(
        { error: 'Expected an array of favorite affirmations' },
        400,
      )
    }

    const favorites = parsed.data

    await ensureDir(getAppDataDir(workspaceId))
    await writeJson(getFavoritesPath(workspaceId), favorites)

    return c.json({ success: true })
  } catch (error) {
    if (isInvalidWorkspaceIdError(error)) {
      return c.json({ error: 'Invalid workspace ID' }, 400)
    }

    console.error('Failed to save favorite affirmations:', error)
    return c.json({ error: 'Failed to save favorite affirmations' }, 500)
  }
})

app.post('/api/favorites/item', async (c) => {
  try {
    const workspaceId = getRequestWorkspaceId(c.req.raw)
    const body: unknown = await c.req.json().catch(() => null)
    const parsed = favoriteItemSchema.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: 'Expected a favorite item update' }, 400)
    }

    const current = await loadFavorites(workspaceId)
    const favorites = parsed.data.favorite
      ? normalizeFavorites([...current, parsed.data.text])
      : current.filter((favorite) => favorite !== parsed.data.text)

    await ensureDir(getAppDataDir(workspaceId))
    await writeJson(getFavoritesPath(workspaceId), favorites)

    return c.json(favorites)
  } catch (error) {
    if (isInvalidWorkspaceIdError(error)) {
      return c.json({ error: 'Invalid workspace ID' }, 400)
    }

    console.error('Failed to update favorite affirmation:', error)
    return c.json({ error: 'Failed to update favorite affirmation' }, 500)
  }
})

app.post('/api/streak', async (c) => {
  try {
    const workspaceId = getRequestWorkspaceId(c.req.raw)
    const body: unknown = await c.req.json().catch(() => null)
    const parsed = streakUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: 'Expected a valid day key' }, 400)
    }

    const previous = await loadStreak(workspaceId)
    const count = calculateStreakCount(previous, parsed.data.dayKey)
    const next: StreakState = { count, lastVisit: parsed.data.dayKey }

    if (!previous || previous.lastVisit !== next.lastVisit) {
      await ensureDir(getAppDataDir(workspaceId))
      await writeJson(getStreakPath(workspaceId), next)
    }

    return c.json(next)
  } catch (error) {
    if (isInvalidWorkspaceIdError(error)) {
      return c.json({ error: 'Invalid workspace ID' }, 400)
    }

    console.error('Failed to update affirmation streak:', error)
    return c.json({ error: 'Failed to update affirmation streak' }, 500)
  }
})

app.post('/api/moldable/rpc', async (c) => {
  try {
    const workspaceId = getRpcWorkspaceId(c.req.raw)
    const body = rpcRequestSchema.parse(await c.req.json())

    if (body.method === 'affirmations.categories') {
      return c.json({
        ok: true,
        result: categories.map(({ id, name, blurb, accent }) => ({
          id,
          name,
          blurb,
          accent,
          // Kept for backward compatibility: an accent-derived tint that adapts
          // to either theme instead of a hardcoded pale hex.
          color: `color-mix(in srgb, ${accent} 14%, transparent)`,
        })),
      })
    }

    if (
      body.method === 'affirmations.list' ||
      body.method === 'affirmations.search'
    ) {
      const params = affirmationsListParamsSchema.parse(body.params)
      return c.json({ ok: true, result: filterAffirmations(params) })
    }

    if (body.method === 'affirmations.random') {
      const params = affirmationsListParamsSchema.parse(body.params)
      const affirmations = filterAffirmations({ ...params, limit: 200 })
      const item =
        affirmations[Math.floor(Math.random() * affirmations.length)] ?? null
      return c.json({ ok: true, result: item })
    }

    if (body.method === 'affirmations.favorites.list') {
      return c.json({ ok: true, result: await loadFavorites(workspaceId) })
    }

    if (body.method === 'affirmations.favorites.update') {
      const params = favoritesUpdateParamsSchema.parse(body.params)
      const favorites = normalizeFavorites(params.favorites)
      await ensureDir(getAppDataDir(workspaceId))
      await writeJson(getFavoritesPath(workspaceId), favorites)
      return c.json({ ok: true, result: favorites })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Affirmations does not expose ${body.method}.`,
        },
      },
      404,
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_params',
            message: 'Affirmations received invalid RPC parameters.',
            detail: error.flatten(),
          },
        },
        400,
      )
    }

    if (isInvalidWorkspaceIdError(error)) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_workspace',
            message: 'Affirmations received an invalid workspace ID.',
          },
        },
        400,
      )
    }

    console.error('Affirmations RPC failed:', error)
    return c.json(
      {
        ok: false,
        error: {
          code: 'affirmations_rpc_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Affirmations could not complete the request.',
        },
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
