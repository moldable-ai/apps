import { NextResponse } from 'next/server'
import {
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { TimeEntry } from '@/lib/types'

function getEntriesPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'entries.json')
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const workspaceId = getWorkspaceFromRequest(request)
  const { id } = await params
  const body = await request.json()

  const entries = await readJson<TimeEntry[]>(getEntriesPath(workspaceId), [])
  const index = entries.findIndex((e) => e.id === id)

  if (index === -1) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  }

  entries[index] = { ...entries[index], ...body }

  // Recalculate duration if times changed
  if (entries[index].endTime) {
    const start = new Date(entries[index].startTime).getTime()
    const end = new Date(entries[index].endTime!).getTime()
    entries[index].duration = Math.floor((end - start) / 1000)
  }

  await writeJson(getEntriesPath(workspaceId), entries)

  return NextResponse.json(entries[index])
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const workspaceId = getWorkspaceFromRequest(request)
  const { id } = await params

  const entries = await readJson<TimeEntry[]>(getEntriesPath(workspaceId), [])
  const filtered = entries.filter((e) => e.id !== id)

  if (filtered.length === entries.length) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  }

  await writeJson(getEntriesPath(workspaceId), filtered)

  return NextResponse.json({ success: true })
}
