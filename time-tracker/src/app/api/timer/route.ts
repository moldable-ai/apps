import { NextResponse } from 'next/server'
import {
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { TimeEntry, TimerState } from '@/lib/types'
import { v4 as uuidv4 } from 'uuid'

function getTimerPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'timer.json')
}

function getEntriesPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'entries.json')
}

const defaultTimer: TimerState = {
  isRunning: false,
  projectId: null,
  description: '',
  startTime: null,
  lastProjectId: null,
}

export async function GET(request: Request) {
  const workspaceId = getWorkspaceFromRequest(request)
  const timer = await readJson<TimerState>(
    getTimerPath(workspaceId),
    defaultTimer,
  )
  return NextResponse.json(timer)
}

// Start timer
export async function POST(request: Request) {
  const workspaceId = getWorkspaceFromRequest(request)
  const body = await request.json()
  const { projectId, description } = body

  if (!projectId) {
    return NextResponse.json(
      { error: 'Project ID is required' },
      { status: 400 },
    )
  }

  const timer: TimerState = {
    isRunning: true,
    projectId,
    description: description || '',
    startTime: new Date().toISOString(),
    lastProjectId: projectId, // Remember this project
  }

  await writeJson(getTimerPath(workspaceId), timer)

  return NextResponse.json(timer)
}

// Stop timer and save entry
export async function DELETE(request: Request) {
  const workspaceId = getWorkspaceFromRequest(request)
  const timer = await readJson<TimerState>(
    getTimerPath(workspaceId),
    defaultTimer,
  )

  if (!timer.isRunning || !timer.startTime || !timer.projectId) {
    return NextResponse.json({ error: 'No timer running' }, { status: 400 })
  }

  const endTime = new Date().toISOString()
  const startMs = new Date(timer.startTime).getTime()
  const endMs = new Date(endTime).getTime()
  const duration = Math.floor((endMs - startMs) / 1000)

  // Create time entry
  const entry: TimeEntry = {
    id: uuidv4(),
    projectId: timer.projectId,
    description: timer.description,
    startTime: timer.startTime,
    endTime,
    duration,
  }

  // Save entry
  const entries = await readJson<TimeEntry[]>(getEntriesPath(workspaceId), [])
  entries.push(entry)
  await writeJson(getEntriesPath(workspaceId), entries)

  // Reset timer but keep lastProjectId
  const resetTimer: TimerState = {
    ...defaultTimer,
    lastProjectId: timer.projectId,
  }
  await writeJson(getTimerPath(workspaceId), resetTimer)

  return NextResponse.json({ entry, timer: resetTimer })
}

// Update timer state (description, projectId, or lastProjectId)
export async function PATCH(request: Request) {
  const workspaceId = getWorkspaceFromRequest(request)
  const body = await request.json()
  const { description, projectId, lastProjectId } = body

  const timer = await readJson<TimerState>(
    getTimerPath(workspaceId),
    defaultTimer,
  )

  if (description !== undefined) {
    timer.description = description
  }
  if (projectId !== undefined) {
    timer.projectId = projectId
  }
  if (lastProjectId !== undefined) {
    timer.lastProjectId = lastProjectId
  }

  await writeJson(getTimerPath(workspaceId), timer)

  return NextResponse.json(timer)
}
