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

export const app = new Hono()

app.use('/api/*', cors())

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
