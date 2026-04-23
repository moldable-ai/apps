import {
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  safePath,
  sanitizeId,
  writeJson,
} from '@moldable-ai/storage'
import type { Note } from '../lib/types'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import fs from 'node:fs/promises'
import { z } from 'zod'

export const app = new Hono()

app.use('/api/*', cors())

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
  id: z.string().min(1),
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
  id: z.string().min(1),
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
        notes.push(JSON.parse(data) as Note)
      } catch {
        // Ignore individual file read errors.
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

async function saveNote(note: Note, workspaceId?: string): Promise<void> {
  await ensureDir(getNotesDir(workspaceId))
  await writeJson(getNotePath(note.id, workspaceId), note)
}

async function deleteNote(id: string, workspaceId?: string): Promise<void> {
  try {
    await fs.unlink(getNotePath(id, workspaceId))
  } catch {
    // Ignore deletion errors, including files already being gone.
  }
}

function getRpcWorkspaceId(request: Request): string | undefined {
  return (
    request.headers.get('x-moldable-workspace-id') ??
    getWorkspaceFromRequest(request)
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

app.get('/api/notes', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const notes = await loadNotes(workspaceId)
    return c.json(notes)
  } catch (error) {
    console.error('Failed to read notes:', error)
    return c.json({ error: 'Failed to read notes' }, 500)
  }
})

app.post('/api/notes', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const notes = await c.req.json<Note[]>()
    const existingNotes = await loadNotes(workspaceId)
    const newIds = new Set(notes.map((note) => note.id))

    for (const existing of existingNotes) {
      if (!newIds.has(existing.id)) {
        await deleteNote(existing.id, workspaceId)
      }
    }

    for (const note of notes) {
      await saveNote(note, workspaceId)
    }

    return c.json({ success: true })
  } catch (error) {
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
