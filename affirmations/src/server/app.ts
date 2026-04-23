import {
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { categories, getAffirmations } from '../lib/affirmations'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'

export const app = new Hono()

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

function getFavoritesPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'favorites.json')
}

async function loadFavorites(workspaceId?: string): Promise<string[]> {
  await ensureDir(getAppDataDir(workspaceId))
  const favorites = await readJson<unknown>(getFavoritesPath(workspaceId), [])
  return Array.isArray(favorites)
    ? favorites.filter((item): item is string => typeof item === 'string')
    : []
}

function getRpcWorkspaceId(request: Request): string | undefined {
  return (
    request.headers.get('x-moldable-workspace-id') ??
    getWorkspaceFromRequest(request)
  )
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
  let affirmations = params?.categoryId
    ? getAffirmations(params.categoryId).map((text) => ({
        text,
        categoryId: params.categoryId!,
        categoryName:
          categories.find((category) => category.id === params.categoryId)
            ?.name ?? params.categoryId!,
      }))
    : allAffirmations()

  if (params?.query?.trim()) {
    const query = params.query.toLowerCase()
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

app.get('/api/favorites', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const favorites = await loadFavorites(workspaceId)
    return c.json(favorites)
  } catch (error) {
    console.error('Failed to read favorite affirmations:', error)
    return c.json({ error: 'Failed to read favorite affirmations' }, 500)
  }
})

app.post('/api/favorites', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const body: unknown = await c.req.json()
    const favorites = Array.isArray(body)
      ? body.filter((item): item is string => typeof item === 'string')
      : []

    await ensureDir(getAppDataDir(workspaceId))
    await writeJson(getFavoritesPath(workspaceId), favorites)

    return c.json({ success: true })
  } catch (error) {
    console.error('Failed to save favorite affirmations:', error)
    return c.json({ error: 'Failed to save favorite affirmations' }, 500)
  }
})

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getRpcWorkspaceId(c.req.raw)

  try {
    const body = rpcRequestSchema.parse(await c.req.json())

    if (body.method === 'affirmations.categories') {
      return c.json({
        ok: true,
        result: categories.map(({ id, name, color, accent }) => ({
          id,
          name,
          color,
          accent,
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
      await ensureDir(getAppDataDir(workspaceId))
      await writeJson(getFavoritesPath(workspaceId), params.favorites)
      return c.json({ ok: true, result: params.favorites })
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
