import {
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

export const app = new Hono()

app.use('/api/*', cors())

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
