/**
 * Server-side storage for journal entries using @moldable/storage
 *
 * Data is stored in workspace-specific data directory:
 * - {workspace}/apps/{app-id}/data/entries/{id}.json
 *
 * Each entry is stored in its own file to handle long content efficiently.
 */
import { NextResponse } from 'next/server'
import {
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  safePath,
  sanitizeId,
  writeJson,
} from '@moldable/storage'
import type { JournalEntry } from '@/lib/types'
import fs from 'fs/promises'
import 'server-only'

/** Get the entries directory */
function getEntriesDir(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'entries')
}

/** Get the path to an entry file */
function getEntryPath(id: string, workspaceId?: string): string {
  const safeId = sanitizeId(id)
  return safePath(getEntriesDir(workspaceId), `${safeId}.json`)
}

/**
 * Load all entries from filesystem
 */
async function loadEntries(workspaceId?: string): Promise<JournalEntry[]> {
  const entriesDir = getEntriesDir(workspaceId)

  try {
    await ensureDir(entriesDir)
    const files = await fs.readdir(entriesDir)
    const jsonFiles = files.filter((f) => f.endsWith('.json'))

    const entries: JournalEntry[] = []
    for (const file of jsonFiles) {
      try {
        const filePath = safePath(entriesDir, file)
        const data = await fs.readFile(filePath, 'utf-8')
        const entry = JSON.parse(data)

        // Data migration: ensure all required fields have default values
        const migratedEntry: JournalEntry = {
          ...entry,
          title: entry.title ?? '',
          content: entry.content ?? '',
          translation: entry.translation ?? '',
        }

        entries.push(migratedEntry)
      } catch (e) {
        console.error(`Failed to read entry file ${file}:`, e)
      }
    }

    // Sort by createdAt descending (newest first)
    return entries.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  } catch {
    return []
  }
}

/**
 * Save a single entry
 */
async function saveEntry(
  entry: JournalEntry,
  workspaceId?: string,
): Promise<void> {
  await ensureDir(getEntriesDir(workspaceId))
  await writeJson(getEntryPath(entry.id, workspaceId), entry)
}

/**
 * Delete an entry
 */
async function deleteEntry(id: string, workspaceId?: string): Promise<void> {
  try {
    const filePath = getEntryPath(id, workspaceId)
    await fs.unlink(filePath)
  } catch {
    // File might not exist
  }
}

export async function GET(request: Request) {
  try {
    const workspaceId = getWorkspaceFromRequest(request)
    const entries = await loadEntries(workspaceId)
    return NextResponse.json(entries)
  } catch (error) {
    console.error('Failed to read entries:', error)
    return NextResponse.json(
      { error: 'Failed to read entries' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const workspaceId = getWorkspaceFromRequest(request)
    const entries: JournalEntry[] = await request.json()

    // Read existing entries to find ones that need to be deleted
    const existingEntries = await loadEntries(workspaceId)
    const newIds = new Set(entries.map((e) => e.id))

    // Delete entries that are no longer in the list
    for (const existing of existingEntries) {
      if (!newIds.has(existing.id)) {
        await deleteEntry(existing.id, workspaceId)
      }
    }

    // Write each entry to its own file
    for (const entry of entries) {
      await saveEntry(entry, workspaceId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save entries:', error)
    return NextResponse.json(
      { error: 'Failed to save entries' },
      { status: 500 },
    )
  }
}
