import { NextResponse } from 'next/server'
import {
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { Project, TimeEntry } from '@/lib/types'

function getProjectsPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'projects.json')
}

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

  const projects = await readJson<Project[]>(getProjectsPath(workspaceId), [])
  const index = projects.findIndex((p) => p.id === id)

  if (index === -1) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  projects[index] = { ...projects[index], ...body }
  await writeJson(getProjectsPath(workspaceId), projects)

  return NextResponse.json(projects[index])
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const workspaceId = getWorkspaceFromRequest(request)
  const { id } = await params

  const projects = await readJson<Project[]>(getProjectsPath(workspaceId), [])
  const filtered = projects.filter((p) => p.id !== id)

  if (filtered.length === projects.length) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  await writeJson(getProjectsPath(workspaceId), filtered)

  // Also delete all time entries for this project
  const entries = await readJson<TimeEntry[]>(getEntriesPath(workspaceId), [])
  const filteredEntries = entries.filter((e) => e.projectId !== id)
  await writeJson(getEntriesPath(workspaceId), filteredEntries)

  return NextResponse.json({ success: true })
}
