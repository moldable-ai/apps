import {
  addFolder,
  deleteBook,
  deleteFolder,
  foldersResponse,
  getBookMeta,
  getChapter,
  getCover,
  getProgress,
  getResourcePath,
  getSettings,
  importBook,
  listBooks,
  moveBook,
  readFolders,
  renameFolder,
  reorderFolders,
  saveSettings,
  seedDefaultBooks,
  setProgress,
} from './book-store'
import {
  getFeatured,
  getInstalledIds,
  getStoreStatus,
  installFromStore,
  searchStore,
} from './gutenberg-catalog'
import {
  getAssetDataDir,
  getDataDir,
  getWorkspaceId,
  jsonError,
} from './moldable'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

export const app = new Hono()

app.use('/api/*', cors())

// ─── Moldable lifecycle ──────────────────────────────────────────────

app.get('/api/moldable/health', (c) => {
  return c.json({
    appId: process.env.MOLDABLE_APP_ID ?? 'reader',
    status: 'ok',
  })
})

app.get('/api/moldable/today', async (c) => {
  const items: unknown[] = []
  let resume: unknown = null
  try {
    const dataDir = getDataDir(c)
    await seedDefaultBooks(dataDir)
    const books = await listBooks(dataDir)
    const inProgress = books
      .filter(
        (book) =>
          book.progress &&
          book.progress.percent > 0.005 &&
          book.progress.percent < 0.995,
      )
      .sort((a, b) =>
        (b.progress?.updatedAt ?? '').localeCompare(
          a.progress?.updatedAt ?? '',
        ),
      )
    const top = inProgress[0]
    if (top && top.progress) {
      resume = {
        title: top.title,
        subtitle: `${Math.round(top.progress.percent * 100)}% · ${
          top.author ?? 'Unknown author'
        }`,
        icon: '📖',
        deepLink: `/?book=${encodeURIComponent(top.id)}`,
        lastTouchedAt: top.progress.updatedAt,
      }
    }
  } catch (error) {
    console.error('today route failed', error)
  }
  return c.json({ items, resume, generatedAt: new Date().toISOString() })
})

app.get('/api/moldable/commands', (c) => {
  return c.json({
    commands: [
      {
        id: 'import-book',
        label: 'Import book',
        shortcut: 'i',
        icon: 'plus',
        group: 'Library',
        action: { type: 'message', command: 'import-book', payload: {} },
      },
      {
        id: 'new-folder',
        label: 'New folder',
        icon: 'folder',
        group: 'Library',
        action: { type: 'message', command: 'new-folder', payload: {} },
      },
      {
        id: 'search-library',
        label: 'Search library',
        shortcut: '/',
        icon: 'filter',
        group: 'Library',
        action: { type: 'message', command: 'search-library', payload: {} },
      },
    ],
  })
})

// ─── App-to-app RPC ──────────────────────────────────────────────────

app.post('/api/moldable/rpc', async (c) => {
  const dataDir = getDataDir(c)
  let body: { method?: string; params?: Record<string, unknown> }
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return jsonError(c, 'Invalid JSON body', 400)
  }
  const method = body.method ?? ''
  const params = body.params ?? {}
  try {
    switch (method) {
      case 'books.list': {
        const books = await listBooks(dataDir)
        return c.json({ books })
      }
      case 'folders.list': {
        return c.json(await foldersResponse(dataDir))
      }
      case 'store.search': {
        const query = String(params.query ?? params.q ?? '')
        const page = Math.max(0, Number(params.page ?? 0) || 0)
        return c.json(await searchStore(dataDir, query, page))
      }
      case 'store.install': {
        const id = params.id
        if (typeof id !== 'string' && typeof id !== 'number') {
          return jsonError(c, 'A valid book id is required', 400)
        }
        const book = await installFromStore(dataDir, id)
        return c.json({ book })
      }
      case 'books.import': {
        const filePath = String(params.filePath ?? '')
        if (!filePath) return jsonError(c, 'filePath is required', 400)
        const buffer = await readFile(filePath)
        const meta = await importBook(
          dataDir,
          basename(filePath),
          new Uint8Array(buffer),
        )
        if (typeof params.folderName === 'string' && params.folderName) {
          const folders = await readFolders(dataDir)
          let folder = folders.find(
            (entry) =>
              entry.name.toLowerCase() ===
              String(params.folderName).toLowerCase(),
          )
          if (!folder && params.createFolder) {
            folder = await addFolder(dataDir, String(params.folderName))
          }
          if (folder) await moveBook(dataDir, meta.id, folder.id)
        }
        return c.json({ book: meta })
      }
      default:
        return jsonError(c, `Unknown method: ${method}`, 400)
    }
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'RPC failed',
      500,
    )
  }
})

// ─── Books ───────────────────────────────────────────────────────────

app.get('/api/books', async (c) => {
  const dataDir = getDataDir(c)
  await seedDefaultBooks(dataDir)
  const books = await listBooks(dataDir)
  return c.json({ books })
})

app.post('/api/books/import', async (c) => {
  const dataDir = getDataDir(c)
  const contentType = c.req.header('content-type') ?? ''
  try {
    if (contentType.includes('application/json')) {
      const body = (await c.req.json()) as { filePath?: string }
      if (!body.filePath) return jsonError(c, 'filePath is required', 400)
      const buffer = await readFile(body.filePath)
      const meta = await importBook(
        dataDir,
        basename(body.filePath),
        new Uint8Array(buffer),
      )
      return c.json({ book: meta })
    }
    const form = await c.req.parseBody()
    const file = form['file']
    if (!file || typeof file === 'string') {
      return jsonError(c, 'No file uploaded', 400)
    }
    const arrayBuffer = await file.arrayBuffer()
    const meta = await importBook(
      dataDir,
      file.name || 'book.epub',
      new Uint8Array(arrayBuffer),
    )
    return c.json({ book: meta })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Import failed',
      422,
    )
  }
})

app.get('/api/books/:id', async (c) => {
  const dataDir = getDataDir(c)
  const meta = await getBookMeta(dataDir, c.req.param('id'))
  if (!meta) return jsonError(c, 'Book not found', 404)
  const progress = await getProgress(dataDir, meta.id)
  return c.json({ book: meta, progress })
})

app.delete('/api/books/:id', async (c) => {
  const dataDir = getDataDir(c)
  await deleteBook(dataDir, c.req.param('id'))
  return c.json({ ok: true })
})

app.get('/api/books/:id/chapter/:index', async (c) => {
  const dataDir = getDataDir(c)
  const index = Number(c.req.param('index'))
  if (!Number.isInteger(index) || index < 0) {
    return jsonError(c, 'Invalid chapter index', 400)
  }
  const workspaceId = getWorkspaceId(c)
  const assetQuery = workspaceId ? `w=${encodeURIComponent(workspaceId)}` : ''
  const chapter = await getChapter(
    dataDir,
    c.req.param('id'),
    index,
    assetQuery,
  )
  if (!chapter) return jsonError(c, 'Chapter not found', 404)
  return c.json(chapter)
})

app.get('/api/books/:id/cover', async (c) => {
  const dataDir = getAssetDataDir(c)
  const cover = await getCover(dataDir, c.req.param('id'))
  if (!cover) return jsonError(c, 'No cover', 404)
  const data = await readFile(cover.path)
  return c.body(new Uint8Array(data), 200, {
    'Content-Type': cover.contentType,
    'Cache-Control': 'private, max-age=86400',
  })
})

app.get('/api/books/:id/resource/*', async (c) => {
  const dataDir = getAssetDataDir(c)
  const prefix = `/api/books/${c.req.param('id')}/resource/`
  const url = new URL(c.req.url)
  const relPath = decodeURIComponent(url.pathname.slice(prefix.length))
  const resource = await getResourcePath(dataDir, c.req.param('id'), relPath)
  if (!resource) return jsonError(c, 'Resource not found', 404)
  const data = await readFile(resource.path)
  return c.body(new Uint8Array(data), 200, {
    'Content-Type': resource.contentType,
    'Cache-Control': 'private, max-age=86400',
  })
})

app.get('/api/books/:id/progress', async (c) => {
  const dataDir = getDataDir(c)
  const progress = await getProgress(dataDir, c.req.param('id'))
  return c.json({ progress })
})

app.put('/api/books/:id/progress', async (c) => {
  const dataDir = getDataDir(c)
  const patch = (await c.req.json().catch(() => ({}))) as Record<
    string,
    unknown
  >
  try {
    const progress = await setProgress(dataDir, c.req.param('id'), patch)
    return c.json({ progress })
  } catch (error) {
    if (error instanceof Error && error.message === 'Book not found') {
      return jsonError(c, error.message, 404)
    }
    throw error
  }
})

// ─── Book store ──────────────────────────────────────────────────────

app.get('/api/store/status', async (c) => {
  return c.json(await getStoreStatus(getDataDir(c)))
})

app.get('/api/store/featured', async (c) => {
  const dataDir = getDataDir(c)
  return c.json({
    results: getFeatured(),
    installed: await getInstalledIds(dataDir),
  })
})

app.get('/api/store/search', async (c) => {
  const dataDir = getDataDir(c)
  const q = c.req.query('q') ?? ''
  const page = Math.max(0, Number(c.req.query('page') ?? '0') || 0)
  try {
    const result = await searchStore(dataDir, q, page)
    const installed = await getInstalledIds(dataDir)
    return c.json({ ...result, installed })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Store search failed',
      502,
    )
  }
})

app.post('/api/store/install', async (c) => {
  const dataDir = getDataDir(c)
  const body = (await c.req.json().catch(() => ({}))) as {
    id?: number | string
  }
  if (typeof body.id !== 'string' && typeof body.id !== 'number') {
    return jsonError(c, 'A valid book id is required', 400)
  }
  try {
    const book = await installFromStore(dataDir, body.id)
    return c.json({ book })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Install failed',
      502,
    )
  }
})

// ─── Settings ────────────────────────────────────────────────────────

app.get('/api/settings', async (c) => {
  const settings = await getSettings(getDataDir(c))
  return c.json({ settings })
})

app.put('/api/settings', async (c) => {
  const patch = (await c.req.json().catch(() => ({}))) as Record<
    string,
    unknown
  >
  const settings = await saveSettings(getDataDir(c), patch)
  return c.json({ settings })
})

// ─── Folders ─────────────────────────────────────────────────────────

app.get('/api/folders', async (c) => {
  return c.json(await foldersResponse(getDataDir(c)))
})

app.post('/api/folders', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    name?: string
    tone?: string
  }
  if (!body.name || !body.name.trim())
    return jsonError(c, 'Name is required', 400)
  const folder = await addFolder(getDataDir(c), body.name, body.tone)
  return c.json(folder)
})

app.patch('/api/folders/:id', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { name?: string }
  if (!body.name) return jsonError(c, 'Name is required', 400)
  const folder = await renameFolder(getDataDir(c), c.req.param('id'), body.name)
  if (!folder) return jsonError(c, 'Folder not found', 404)
  return c.json(folder)
})

app.delete('/api/folders/:id', async (c) => {
  await deleteFolder(getDataDir(c), c.req.param('id'))
  return c.json({ ok: true })
})

app.post('/api/folders/reorder', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    folderIds?: string[]
  }
  const folders = await reorderFolders(getDataDir(c), body.folderIds ?? [])
  return c.json({ folders })
})

app.post('/api/folders/move', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    bookId?: string
    folderId?: string | null
    inFolder?: boolean
  }
  if (!body.bookId) return jsonError(c, 'bookId is required', 400)
  try {
    const folders = await moveBook(
      getDataDir(c),
      body.bookId,
      body.folderId ?? null,
      body.inFolder ?? true,
    )
    return c.json({ folders })
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === 'Book not found' ||
        error.message === 'Folder not found')
    ) {
      return jsonError(c, error.message, 404)
    }
    throw error
  }
})
