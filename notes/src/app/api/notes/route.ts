import { NextResponse } from 'next/server'
import {
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  safePath,
  sanitizeId,
  writeJson,
} from '@moldable-ai/storage'
import type { Note } from '../../../lib/types'
import fs from 'fs/promises'
import 'server-only'

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
    const jsonFiles = files.filter((f) => f.endsWith('.json'))

    const notes: Note[] = []
    for (const file of jsonFiles) {
      try {
        const filePath = safePath(notesDir, file)
        const data = await fs.readFile(filePath, 'utf-8')
        const note = JSON.parse(data)
        notes.push(note)
      } catch (e) {
        console.error(`Failed to read note file ${file}:`, e)
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
    const filePath = getNotePath(id, workspaceId)
    await fs.unlink(filePath)
  } catch {}
}

export async function GET(request: Request) {
  try {
    const workspaceId = getWorkspaceFromRequest(request)
    const notes = await loadNotes(workspaceId)
    return NextResponse.json(notes)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read notes' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const workspaceId = getWorkspaceFromRequest(request)
    const notes: Note[] = await request.json()
    const existingNotes = await loadNotes(workspaceId)
    const newIds = new Set(notes.map((n) => n.id))

    for (const existing of existingNotes) {
      if (!newIds.has(existing.id)) {
        await deleteNote(existing.id, workspaceId)
      }
    }

    for (const note of notes) {
      await saveNote(note, workspaceId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save notes' }, { status: 500 })
  }
}
