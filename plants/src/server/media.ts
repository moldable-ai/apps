import {
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  safePath,
} from '@moldable-ai/storage'
import type { MediaResult } from '../lib/types'
import type { Hono } from 'hono'
import { randomUUID } from 'node:crypto'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { basename, extname, isAbsolute } from 'node:path'

const ASSETS_DIR = 'assets'
const MAX_IMAGE_BYTES = 20 * 1024 * 1024

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
}

const SUPPORTED_IMAGE_MIME_TYPES = new Set(Object.values(MIME_BY_EXT))

class MediaInputError extends Error {}

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

function supportedMimeType(
  fileName: string,
  reportedType?: string,
): string | null {
  if (reportedType && SUPPORTED_IMAGE_MIME_TYPES.has(reportedType)) {
    return reportedType
  }
  if (reportedType?.startsWith('image/')) {
    return null
  }
  const fromName = mimeForName(fileName)
  if (fromName) return fromName
  return null
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

async function persistBytes(
  workspaceId: string | undefined,
  bytes: Buffer,
  mimeType: string,
  originalName: string,
): Promise<MediaResult> {
  if (bytes.length === 0) {
    throw new MediaInputError('The image file is empty.')
  }
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new MediaInputError('Images must be 20 MB or smaller.')
  }

  const extension = extForMime(mimeType) ?? extOf(originalName) ?? 'img'
  const fileName = `${randomUUID()}.${extension}`
  const relPath = `${ASSETS_DIR}/${fileName}`
  const fullPath = safePath(getAppDataDir(workspaceId), ASSETS_DIR, fileName)
  await ensureDir(safePath(getAppDataDir(workspaceId), ASSETS_DIR))
  await writeFile(fullPath, bytes)
  const altText = basename(originalName, extname(originalName)) || 'image'
  return {
    src: relPath,
    path: relPath,
    name: fileName,
    altText,
    kind: 'image',
    // Absolute on-disk path so the client can hand it to the desktop chat for
    // vision-based plant identification.
    absPath: fullPath,
  }
}

export async function persistImagePath(
  workspaceId: string | undefined,
  sourcePath: string,
): Promise<MediaResult> {
  const mimeType = mimeForName(sourcePath)
  if (!mimeType || !isAbsolute(sourcePath)) {
    throw new MediaInputError('Unsupported image path.')
  }

  const info = await stat(sourcePath)
  if (!info.isFile()) {
    throw new MediaInputError('The image path must point to a file.')
  }
  if (info.size === 0) {
    throw new MediaInputError('The image file is empty.')
  }
  if (info.size > MAX_IMAGE_BYTES) {
    throw new MediaInputError('Images must be 20 MB or smaller.')
  }

  const bytes = await readFile(sourcePath)
  return persistBytes(workspaceId, bytes, mimeType, basename(sourcePath))
}

/**
 * Registers image upload + serving for the Plants app:
 *  - POST /api/plants/media        (multipart "file") — browser uploads / paste
 *  - POST /api/plants/media-paths  (json {paths})     — desktop Finder drops
 *  - GET  /api/plants/media?path=  — serves stored bytes inline
 */
export function registerMediaRoutes(app: Hono): void {
  app.post('/api/plants/media', async (c) => {
    try {
      const workspaceId = workspaceOf(c.req.raw)
      const form = await c.req.raw.formData()
      const file = form.get('file')
      if (!isUploadFile(file)) {
        return c.json({ error: 'An image file is required.' }, 400)
      }
      const mimeType = supportedMimeType(file.name, file.type)
      if (!mimeType) {
        return c.json(
          {
            error:
              'Use a PNG, JPEG, WebP, or GIF image so Plants can identify it.',
          },
          400,
        )
      }
      const bytes = Buffer.from(await file.arrayBuffer())
      const result = await persistBytes(workspaceId, bytes, mimeType, file.name)
      return c.json(result, 201)
    } catch (error) {
      if (error instanceof MediaInputError) {
        return c.json({ error: error.message }, 400)
      }
      console.error('Failed to upload plant media:', error)
      return c.json({ error: 'Failed to upload image' }, 500)
    }
  })

  app.post('/api/plants/media-paths', async (c) => {
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
        imported.push(await persistImagePath(workspaceId, sourcePath))
      }
      if (imported.length === 0) {
        return c.json({ error: 'No supported image files were provided.' }, 400)
      }
      return c.json(imported, 201)
    } catch (error) {
      if (error instanceof MediaInputError) {
        return c.json({ error: error.message }, 400)
      }
      console.error('Failed to import plant media paths:', error)
      return c.json({ error: 'Failed to import images' }, 500)
    }
  })

  app.get('/api/plants/media', async (c) => {
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
      console.error('Failed to read plant media:', error)
      return c.text('Not found', 404)
    }
  })
}
