import {
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  safePath,
} from '@moldable-ai/storage'
import type { Hono } from 'hono'
import { randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { basename, extname, isAbsolute } from 'node:path'

const ASSETS_DIR = 'assets'

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',
}

function extOf(name: string): string {
  return extname(name).replace(/^\./, '').toLowerCase()
}

function mimeForName(name: string): string | null {
  return MIME_BY_EXT[extOf(name)] ?? null
}

function extForMime(mimeType: string): string | null {
  const entry = Object.entries(MIME_BY_EXT).find(
    ([, mime]) => mime === mimeType,
  )
  return entry?.[0] ?? null
}

function workspaceOf(request: Request): string | undefined {
  const fromQuery = new URL(request.url).searchParams.get('workspace')
  return (
    request.headers.get('x-moldable-workspace-id') ??
    getWorkspaceFromRequest(request) ??
    fromQuery ??
    undefined
  )
}

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === 'object' &&
    value !== null &&
    'arrayBuffer' in value &&
    'type' in value &&
    'name' in value
  )
}

/**
 * Stored asset reference. `src` is a stable, workspace-relative path
 * (`assets/<uuid>.<ext>`) that the client resolves to a served URL via
 * `resolveMediaUrl`. Shape matches the editor's MarkdownMediaUploadResult.
 */
type MediaResult = {
  src: string
  path: string
  name: string
  altText: string
  kind: 'image'
}

async function persistBytes(
  workspaceId: string | undefined,
  bytes: Buffer,
  mimeType: string,
  originalName: string,
): Promise<MediaResult> {
  const extension = extForMime(mimeType) ?? extOf(originalName) ?? 'img'
  const fileName = `${randomUUID()}.${extension}`
  const relPath = `${ASSETS_DIR}/${fileName}`
  const fullPath = safePath(getAppDataDir(workspaceId), ASSETS_DIR, fileName)
  await ensureDir(safePath(getAppDataDir(workspaceId), ASSETS_DIR))
  await writeFile(fullPath, bytes)
  const altText = basename(originalName, extname(originalName)) || 'image'
  return { src: relPath, path: relPath, name: fileName, altText, kind: 'image' }
}

/**
 * Registers image upload + serving for the Recipes app:
 *  - POST /api/recipes/media        (multipart "file") — browser uploads / paste
 *  - POST /api/recipes/media-paths  (json {paths})     — desktop Finder drops
 *  - GET  /api/recipes/media?path=  — serves stored bytes inline
 */
export function registerMediaRoutes(app: Hono): void {
  app.post('/api/recipes/media', async (c) => {
    try {
      const workspaceId = workspaceOf(c.req.raw)
      const form = await c.req.raw.formData()
      const file = form.get('file')
      if (!isUploadFile(file)) {
        return c.json({ error: 'An image file is required.' }, 400)
      }
      if (file.type && !file.type.startsWith('image/')) {
        return c.json({ error: `${file.name || 'File'} is not an image.` }, 400)
      }
      const mimeType =
        file.type && extForMime(file.type) ? file.type : mimeForName(file.name)
      if (!mimeType) {
        return c.json({ error: `${file.name || 'File'} is not an image.` }, 400)
      }
      const bytes = Buffer.from(await file.arrayBuffer())
      const result = await persistBytes(workspaceId, bytes, mimeType, file.name)
      return c.json(result, 201)
    } catch (error) {
      console.error('Failed to upload recipe media:', error)
      return c.json({ error: 'Failed to upload image' }, 500)
    }
  })

  app.post('/api/recipes/media-paths', async (c) => {
    try {
      const workspaceId = workspaceOf(c.req.raw)
      const body = (await c.req.json().catch(() => null)) as {
        paths?: unknown
      } | null
      const paths = Array.isArray(body?.paths)
        ? body.paths.filter((p): p is string => typeof p === 'string')
        : []
      const imagePaths = paths.filter((p) => isAbsolute(p) && mimeForName(p))
      if (imagePaths.length === 0) {
        return c.json({ error: 'No supported image files were provided.' }, 400)
      }

      const imported: MediaResult[] = []
      for (const sourcePath of imagePaths) {
        const mimeType = mimeForName(sourcePath)
        if (!mimeType) continue
        const bytes = await readFile(sourcePath)
        imported.push(
          await persistBytes(
            workspaceId,
            bytes,
            mimeType,
            basename(sourcePath),
          ),
        )
      }
      if (imported.length === 0) {
        return c.json({ error: 'No supported image files were provided.' }, 400)
      }
      return c.json(imported, 201)
    } catch (error) {
      console.error('Failed to import recipe media paths:', error)
      return c.json({ error: 'Failed to import images' }, 500)
    }
  })

  app.get('/api/recipes/media', async (c) => {
    try {
      const workspaceId = workspaceOf(c.req.raw)
      const requested = c.req.query('path')
      if (!requested) return c.text('Not found', 404)

      // Normalise to a filename under the assets dir — never escape it.
      const fileName = basename(requested)
      const fullPath = safePath(
        getAppDataDir(workspaceId),
        ASSETS_DIR,
        fileName,
      )
      const bytes = await readFile(fullPath)
      const mimeType = mimeForName(fileName) ?? 'application/octet-stream'
      return new Response(new Uint8Array(bytes), {
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Type': mimeType,
        },
      })
    } catch (error) {
      console.error('Failed to read recipe media:', error)
      return c.text('Not found', 404)
    }
  })
}
