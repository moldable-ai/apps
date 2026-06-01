import {
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { type Folder, toneFromSeed } from '../lib/types'
import type { Hono } from 'hono'
import { randomUUID } from 'node:crypto'

const FOLDERS_FILE = 'folders.json'

function foldersPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), FOLDERS_FILE)
}

function sortFolders(folders: Folder[]): Folder[] {
  return [...folders]
    .sort((a, b) => {
      const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER
      const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER
      if (orderA !== orderB) return orderA - orderB
      return a.createdAt.localeCompare(b.createdAt)
    })
    .map((folder, index) => ({ ...folder, sortOrder: index }))
}

export async function readFolders(workspaceId?: string): Promise<Folder[]> {
  await ensureDir(getAppDataDir(workspaceId))
  const folders = await readJson<Folder[]>(foldersPath(workspaceId), [])
  return sortFolders(folders)
}

async function writeFolders(
  workspaceId: string | undefined,
  folders: Folder[],
): Promise<void> {
  await ensureDir(getAppDataDir(workspaceId))
  await writeJson(foldersPath(workspaceId), sortFolders(folders))
}

function workspaceOf(request: Request): string | undefined {
  return (
    request.headers.get('x-moldable-workspace-id') ??
    getWorkspaceFromRequest(request) ??
    undefined
  )
}

const HEX_TONE = /^#[0-9a-fA-F]{3,8}$/

/**
 * Registers folder CRUD + reorder + move endpoints, mirroring the Piano app's
 * folder model so the Recipes library gets the same organisation UX.
 */
export function registerFolderRoutes(app: Hono): void {
  app.get('/api/folders', async (c) => {
    try {
      const folders = await readFolders(workspaceOf(c.req.raw))
      return c.json({ folders })
    } catch (error) {
      console.error('Failed to read folders:', error)
      return c.json({ error: 'Failed to read folders' }, 500)
    }
  })

  app.post('/api/folders', async (c) => {
    try {
      const workspaceId = workspaceOf(c.req.raw)
      const body = (await c.req.json().catch(() => null)) as {
        name?: unknown
        tone?: unknown
      } | null
      const rawName = typeof body?.name === 'string' ? body.name.trim() : ''
      if (!rawName) return c.json({ error: 'Folder name is required' }, 400)

      const name = rawName.slice(0, 80)
      const tone =
        typeof body?.tone === 'string' && HEX_TONE.test(body.tone)
          ? body.tone
          : toneFromSeed(name)

      const folders = await readFolders(workspaceId)
      const now = new Date().toISOString()
      const folder: Folder = {
        id: randomUUID(),
        name,
        tone,
        recipeIds: [],
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      }
      await writeFolders(workspaceId, [folder, ...folders])
      return c.json(folder, 201)
    } catch (error) {
      console.error('Failed to create folder:', error)
      return c.json({ error: 'Failed to create folder' }, 500)
    }
  })

  app.post('/api/folders/reorder', async (c) => {
    try {
      const workspaceId = workspaceOf(c.req.raw)
      const body = (await c.req.json().catch(() => null)) as {
        folderIds?: unknown
      } | null
      if (!Array.isArray(body?.folderIds)) {
        return c.json({ error: 'folderIds must be an array' }, 400)
      }

      const folders = await readFolders(workspaceId)
      const byId = new Map(folders.map((folder) => [folder.id, folder]))
      const seen = new Set<string>()
      const requestedIds = body.folderIds.filter((id): id is string => {
        if (typeof id !== 'string' || !byId.has(id) || seen.has(id)) {
          return false
        }
        seen.add(id)
        return true
      })

      if (folders.length > 0 && requestedIds.length === 0) {
        return c.json(
          { error: 'At least one known folder id is required' },
          400,
        )
      }

      const requested = requestedIds
        .map((id) => byId.get(id))
        .filter((folder): folder is Folder => Boolean(folder))
      const remaining = folders.filter((folder) => !seen.has(folder.id))
      const reordered = [...requested, ...remaining].map((folder, index) => ({
        ...folder,
        sortOrder: index,
      }))

      await writeFolders(workspaceId, reordered)
      return c.json({ folders: reordered })
    } catch (error) {
      console.error('Failed to reorder folders:', error)
      return c.json({ error: 'Failed to reorder folders' }, 500)
    }
  })

  app.patch('/api/folders/:folderId', async (c) => {
    try {
      const workspaceId = workspaceOf(c.req.raw)
      const folderId = c.req.param('folderId')
      const body = (await c.req.json().catch(() => null)) as {
        name?: unknown
        tone?: unknown
      } | null
      if (!body) return c.json({ error: 'Body required' }, 400)

      const folders = await readFolders(workspaceId)
      const target = folders.find((folder) => folder.id === folderId)
      if (!target) return c.json({ error: 'Folder not found' }, 404)

      if (typeof body.name === 'string') {
        const trimmed = body.name.trim().slice(0, 80)
        if (trimmed) target.name = trimmed
      }
      if (typeof body.tone === 'string' && HEX_TONE.test(body.tone)) {
        target.tone = body.tone
      }
      target.updatedAt = new Date().toISOString()

      await writeFolders(workspaceId, folders)
      return c.json(target)
    } catch (error) {
      console.error('Failed to update folder:', error)
      return c.json({ error: 'Failed to update folder' }, 500)
    }
  })

  app.delete('/api/folders/:folderId', async (c) => {
    try {
      const workspaceId = workspaceOf(c.req.raw)
      const folderId = c.req.param('folderId')
      const folders = await readFolders(workspaceId)
      const next = folders.filter((folder) => folder.id !== folderId)
      if (next.length === folders.length) {
        return c.json({ error: 'Folder not found' }, 404)
      }
      await writeFolders(workspaceId, next)
      return c.json({ ok: true })
    } catch (error) {
      console.error('Failed to delete folder:', error)
      return c.json({ error: 'Failed to delete folder' }, 500)
    }
  })

  // Move a recipe into a folder (or out to the library when folderId is null).
  // A recipe lives in at most one folder, so we strip it from every other folder.
  app.post('/api/folders/move', async (c) => {
    try {
      const workspaceId = workspaceOf(c.req.raw)
      const body = (await c.req.json().catch(() => null)) as {
        recipeId?: unknown
        folderId?: unknown
      } | null
      if (!body || typeof body.recipeId !== 'string' || !body.recipeId) {
        return c.json({ error: 'recipeId is required' }, 400)
      }
      const recipeId = body.recipeId
      const targetFolderId =
        typeof body.folderId === 'string' && body.folderId
          ? body.folderId
          : null

      const folders = await readFolders(workspaceId)
      if (
        targetFolderId &&
        !folders.some((folder) => folder.id === targetFolderId)
      ) {
        return c.json({ error: 'Folder not found' }, 404)
      }

      const now = new Date().toISOString()
      const updated = folders.map((folder) => {
        const had = folder.recipeIds.includes(recipeId)
        const willHave = folder.id === targetFolderId
        if (had === willHave) return folder
        return {
          ...folder,
          recipeIds: willHave
            ? [...folder.recipeIds.filter((id) => id !== recipeId), recipeId]
            : folder.recipeIds.filter((id) => id !== recipeId),
          updatedAt: now,
        }
      })

      await writeFolders(workspaceId, updated)
      return c.json({ folders: sortFolders(updated) })
    } catch (error) {
      console.error('Failed to move recipe:', error)
      return c.json({ error: 'Failed to move recipe' }, 500)
    }
  })
}

/** Remove a recipe id from every folder (used when a recipe is deleted). */
export async function pruneRecipeFromFolders(
  workspaceId: string | undefined,
  recipeId: string,
): Promise<void> {
  const folders = await readFolders(workspaceId)
  let changed = false
  const next = folders.map((folder) => {
    if (!folder.recipeIds.includes(recipeId)) return folder
    changed = true
    return {
      ...folder,
      recipeIds: folder.recipeIds.filter((id) => id !== recipeId),
      updatedAt: new Date().toISOString(),
    }
  })
  if (changed) await writeFolders(workspaceId, next)
}
