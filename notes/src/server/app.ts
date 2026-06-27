import {
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  safePath,
  sanitizeId,
} from '@moldable-ai/storage'
import type { Note } from '../lib/types'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import fs from 'node:fs/promises'
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
const appUrlOrigin = (() => {
  const appUrl = process.env.MOLDABLE_APP_URL
  if (!appUrl) return null

  try {
    return new URL(appUrl).origin
  } catch {
    return null
  }
})()

app.use(
  '/api/*',
  cors({
    origin: (origin) => {
      if (!origin) return ''
      if (appUrlOrigin && origin === appUrlOrigin) return origin
      return ''
    },
  }),
)

const workspaceIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/)

const isoDateSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)))

const noteSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9_-]+$/),
  title: z.string(),
  content: z.string(),
  isPinned: z.boolean(),
  isArchived: z.boolean(),
  isDeleted: z.boolean(),
  labels: z.array(z.string()),
  color: z.string().optional(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
})

const notesBulkSaveSchema = z.array(noteSchema)

const notePatchSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  labels: z.array(z.string()).optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  color: z.string().optional(),
})

class NotesValidationError extends Error {}

const rpcRequestSchema = z.object({
  method: z.string(),
  params: z.unknown().optional(),
})

const notesListParamsSchema = z
  .object({
    query: z.string().optional(),
    includeArchived: z.boolean().optional(),
    includeDeleted: z.boolean().optional(),
    includeContent: z.boolean().optional(),
    label: z.string().optional(),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .optional()

const noteGetParamsSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9_-]+$/),
})

const noteCreateParamsSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  labels: z.array(z.string()).optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  color: z.string().optional(),
})

const noteUpdateParamsSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9_-]+$/),
  title: z.string().optional(),
  content: z.string().optional(),
  labels: z.array(z.string()).optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  color: z.string().optional(),
})

function getNotesDir(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'notes')
}

function getNotePath(id: string, workspaceId?: string): string {
  const safeId = sanitizeId(id)
  return safePath(getNotesDir(workspaceId), `${safeId}.json`)
}

function validateWorkspaceId(
  workspaceId: string | undefined,
): string | undefined {
  if (!workspaceId) return undefined
  return workspaceIdSchema.parse(workspaceId)
}

function getHttpWorkspaceId(request: Request): string | undefined {
  return validateWorkspaceId(getWorkspaceFromRequest(request))
}

function assertUniqueNoteIds(notes: Note[]) {
  const ids = new Set<string>()

  for (const note of notes) {
    if (ids.has(note.id)) {
      throw new NotesValidationError(`Duplicate note ID "${note.id}"`)
    }
    ids.add(note.id)
  }
}

async function loadNotes(workspaceId?: string): Promise<Note[]> {
  const notesDir = getNotesDir(workspaceId)
  try {
    await ensureDir(notesDir)
    const files = await fs.readdir(notesDir)
    const jsonFiles = files.filter((file) => file.endsWith('.json'))

    const notes: Note[] = []
    for (const file of jsonFiles) {
      try {
        const filePath = safePath(notesDir, file)
        const data = await fs.readFile(filePath, 'utf-8')
        const parsed = noteSchema.safeParse(JSON.parse(data))
        if (parsed.success) {
          notes.push(parsed.data)
        } else {
          console.warn(`Skipping invalid note file: ${file}`)
        }
      } catch (error) {
        console.warn(`Skipping unreadable note file: ${file}`, error)
      }
    }

    return notes.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  } catch {
    return []
  }
}

async function readNote(
  id: string,
  workspaceId?: string,
): Promise<Note | null> {
  try {
    const data = await fs.readFile(getNotePath(id, workspaceId), 'utf-8')
    return noteSchema.parse(JSON.parse(data))
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null
    }

    throw error
  }
}

async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.${crypto.randomUUID()}.tmp`
  const content = JSON.stringify(data, null, 2)

  try {
    await fs.writeFile(tempPath, content, 'utf-8')
    await fs.rename(tempPath, filePath)
  } catch (error) {
    await fs.unlink(tempPath).catch(() => undefined)
    throw error
  }
}

async function saveNote(note: Note, workspaceId?: string): Promise<void> {
  await ensureDir(getNotesDir(workspaceId))
  const validatedNote = noteSchema.parse(note)
  await writeJsonAtomic(
    getNotePath(validatedNote.id, workspaceId),
    validatedNote,
  )
}

async function replaceNotes(
  notes: Note[],
  workspaceId?: string,
): Promise<void> {
  assertUniqueNoteIds(notes)
  await ensureDir(getNotesDir(workspaceId))

  const existingNotes = await loadNotes(workspaceId)
  const newIds = new Set(notes.map((note) => note.id))
  const stagedWrites: Array<{ tempPath: string; finalPath: string }> = []

  try {
    for (const note of notes) {
      const finalPath = getNotePath(note.id, workspaceId)
      const tempPath = `${finalPath}.${process.pid}.${Date.now()}.${crypto.randomUUID()}.tmp`
      await fs.writeFile(tempPath, JSON.stringify(note, null, 2), 'utf-8')
      stagedWrites.push({ tempPath, finalPath })
    }

    for (const staged of stagedWrites) {
      await fs.rename(staged.tempPath, staged.finalPath)
    }

    for (const existing of existingNotes) {
      if (!newIds.has(existing.id)) {
        await deleteNote(existing.id, workspaceId)
      }
    }
  } catch (error) {
    await Promise.all(
      stagedWrites.map((staged) =>
        fs.unlink(staged.tempPath).catch(() => undefined),
      ),
    )
    throw error
  }
}

async function deleteNote(id: string, workspaceId?: string): Promise<void> {
  try {
    await fs.unlink(getNotePath(id, workspaceId))
  } catch {
    // Ignore deletion errors, including files already being gone.
  }
}

function getRpcWorkspaceId(request: Request): string | undefined {
  return validateWorkspaceId(
    request.headers.get('x-moldable-workspace-id') ??
      getWorkspaceFromRequest(request),
  )
}

function summarizeNote(note: Note, includeContent = false): Note {
  return includeContent
    ? note
    : {
        ...note,
        content:
          note.content.length > 400
            ? `${note.content.slice(0, 400)}...`
            : note.content,
      }
}

function filterNotes(
  notes: Note[],
  params: z.infer<typeof notesListParamsSchema>,
) {
  let result = [...notes]

  if (!params?.includeArchived) {
    result = result.filter((note) => !note.isArchived)
  }
  if (!params?.includeDeleted) {
    result = result.filter((note) => !note.isDeleted)
  }
  if (params?.label?.trim()) {
    result = result.filter((note) => note.labels.includes(params.label!))
  }
  if (params?.query?.trim()) {
    const query = params.query.toLowerCase()
    result = result.filter((note) =>
      [note.title, note.content, ...note.labels]
        .join('\n')
        .toLowerCase()
        .includes(query),
    )
  }

  return result
    .slice(0, params?.limit ?? 100)
    .map((note) => summarizeNote(note, params?.includeContent))
}

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null

  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'notes',
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

// Notes intentionally does not contribute to the Today view — quick capture
// has no deadline / blocked / in-progress state worth nudging about. Silent.
app.get('/api/moldable/today', (c) => {
  return c.json({
    items: [],
    resume: null,
    generatedAt: new Date().toISOString(),
  })
})

app.get('/api/notes', async (c) => {
  try {
    const workspaceId = getHttpWorkspaceId(c.req.raw)
    const notes = await loadNotes(workspaceId)
    return c.json(notes)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid workspace ID' }, 400)
    }

    console.error('Failed to read notes:', error)
    return c.json({ error: 'Failed to read notes' }, 500)
  }
})

app.patch('/api/notes/:id', async (c) => {
  try {
    const workspaceId = getHttpWorkspaceId(c.req.raw)
    const { id } = noteGetParamsSchema.parse({ id: c.req.param('id') })
    const patch = notePatchSchema.parse(await c.req.json())
    const note = await readNote(id, workspaceId)

    if (!note) {
      return c.json({ error: 'Note not found' }, 404)
    }

    const updated: Note = {
      ...note,
      ...patch,
      updatedAt: new Date().toISOString(),
    }

    await saveNote(updated, workspaceId)
    return c.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid note update' }, 400)
    }

    console.error('Failed to update note:', error)
    return c.json({ error: 'Failed to update note' }, 500)
  }
})

app.delete('/api/notes/:id', async (c) => {
  try {
    const workspaceId = getHttpWorkspaceId(c.req.raw)
    const { id } = noteGetParamsSchema.parse({ id: c.req.param('id') })
    await deleteNote(id, workspaceId)
    return c.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid note ID' }, 400)
    }

    console.error('Failed to delete note:', error)
    return c.json({ error: 'Failed to delete note' }, 500)
  }
})

app.post('/api/notes', async (c) => {
  try {
    const workspaceId = getHttpWorkspaceId(c.req.raw)
    const body = await c.req.json()

    if (Array.isArray(body)) {
      const notes = notesBulkSaveSchema.parse(body)
      assertUniqueNoteIds(notes)
      await replaceNotes(notes, workspaceId)
      return c.json({ success: true })
    }

    const note = noteSchema.parse(body)
    await saveNote(note, workspaceId)
    return c.json({ success: true, note })
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof NotesValidationError) {
      return c.json({ error: 'Invalid notes payload' }, 400)
    }

    console.error('Failed to save notes:', error)
    return c.json({ error: 'Failed to save notes' }, 500)
  }
})

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getRpcWorkspaceId(c.req.raw)

  try {
    const body = rpcRequestSchema.parse(await c.req.json())
    const notes = await loadNotes(workspaceId)

    if (body.method === 'notes.list' || body.method === 'notes.search') {
      const params = notesListParamsSchema.parse(body.params)
      return c.json({ ok: true, result: filterNotes(notes, params) })
    }

    if (body.method === 'notes.get') {
      const params = noteGetParamsSchema.parse(body.params)
      const note = notes.find((item) => item.id === params.id)

      if (!note) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'note_not_found',
              message: `Note ${params.id} was not found.`,
            },
          },
          404,
        )
      }

      return c.json({ ok: true, result: note })
    }

    if (body.method === 'notes.create') {
      const params = noteCreateParamsSchema.parse(body.params)
      const now = new Date().toISOString()
      const note: Note = {
        id: crypto.randomUUID(),
        title: params.title ?? '',
        content: params.content ?? '',
        isPinned: params.isPinned ?? false,
        isArchived: params.isArchived ?? false,
        isDeleted: false,
        labels: params.labels ?? [],
        color: params.color,
        createdAt: now,
        updatedAt: now,
      }

      await saveNote(note, workspaceId)
      return c.json({ ok: true, result: note })
    }

    if (body.method === 'notes.update') {
      const params = noteUpdateParamsSchema.parse(body.params)
      const note = notes.find((item) => item.id === params.id)

      if (!note) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'note_not_found',
              message: `Note ${params.id} was not found.`,
            },
          },
          404,
        )
      }

      const updated: Note = {
        ...note,
        ...('title' in params ? { title: params.title } : {}),
        ...('content' in params ? { content: params.content } : {}),
        ...('labels' in params ? { labels: params.labels } : {}),
        ...('isPinned' in params ? { isPinned: params.isPinned } : {}),
        ...('isArchived' in params ? { isArchived: params.isArchived } : {}),
        ...('isDeleted' in params ? { isDeleted: params.isDeleted } : {}),
        ...('color' in params ? { color: params.color } : {}),
        updatedAt: new Date().toISOString(),
      }

      await saveNote(updated, workspaceId)
      return c.json({ ok: true, result: updated })
    }

    if (body.method === 'notes.delete') {
      const params = noteGetParamsSchema.parse(body.params)
      const note = notes.find((item) => item.id === params.id)

      if (!note) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'note_not_found',
              message: `Note ${params.id} was not found.`,
            },
          },
          404,
        )
      }

      const deleted: Note = {
        ...note,
        isDeleted: true,
        updatedAt: new Date().toISOString(),
      }
      await saveNote(deleted, workspaceId)
      return c.json({ ok: true, result: deleted })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Notes does not expose ${body.method}.`,
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
            message: 'Notes received invalid RPC parameters.',
            detail: error.flatten(),
          },
        },
        400,
      )
    }

    console.error('Notes RPC failed:', error)
    return c.json(
      {
        ok: false,
        error: {
          code: 'notes_rpc_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Notes could not complete the request.',
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
