import { NextResponse } from 'next/server'
import {
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { TimeEntry } from '@/lib/types'
import { v4 as uuidv4 } from 'uuid'

function getEntriesPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'entries.json')
}

export async function GET(request: Request) {
  const workspaceId = getWorkspaceFromRequest(request)
  const url = new URL(request.url)
  const startDate = url.searchParams.get('startDate')
  const endDate = url.searchParams.get('endDate')
  const projectId = url.searchParams.get('projectId')

  let entries = await readJson<TimeEntry[]>(getEntriesPath(workspaceId), [])

  // Filter by date range if provided
  // Parse dates as local time by appending T00:00:00
  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`)
    entries = entries.filter((e) => new Date(e.startTime) >= start)
  }
  if (endDate) {
    const end = new Date(`${endDate}T23:59:59.999`)
    entries = entries.filter((e) => new Date(e.startTime) <= end)
  }

  // Filter by project if provided
  if (projectId) {
    entries = entries.filter((e) => e.projectId === projectId)
  }

  // Sort by start time, newest first
  entries.sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  )

  return NextResponse.json(entries)
}

export async function POST(request: Request) {
  const workspaceId = getWorkspaceFromRequest(request)
  const body = await request.json()
  const { projectId, description, startTime, endTime, duration } = body

  if (!projectId || !startTime) {
    return NextResponse.json(
      { error: 'Project and start time are required' },
      { status: 400 },
    )
  }

  const entries = await readJson<TimeEntry[]>(getEntriesPath(workspaceId), [])

  const newEntry: TimeEntry = {
    id: uuidv4(),
    projectId,
    description: description || '',
    startTime,
    endTime,
    duration,
  }

  entries.push(newEntry)
  await writeJson(getEntriesPath(workspaceId), entries)

  return NextResponse.json(newEntry)
}
