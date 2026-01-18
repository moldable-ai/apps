import { NextResponse } from 'next/server'
import {
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { PROJECT_COLORS, Project } from '@/lib/types'
import { v4 as uuidv4 } from 'uuid'

function getProjectsPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'projects.json')
}

export async function GET(request: Request) {
  const workspaceId = getWorkspaceFromRequest(request)
  const projects = await readJson<Project[]>(getProjectsPath(workspaceId), [])
  return NextResponse.json(projects)
}

export async function POST(request: Request) {
  const workspaceId = getWorkspaceFromRequest(request)
  const body = await request.json()
  const { name, color } = body

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const projects = await readJson<Project[]>(getProjectsPath(workspaceId), [])

  // Auto-assign color if not provided
  const usedColors = new Set(projects.map((p) => p.color))
  const availableColor =
    color ||
    PROJECT_COLORS.find((c) => !usedColors.has(c)) ||
    PROJECT_COLORS[projects.length % PROJECT_COLORS.length]

  const newProject: Project = {
    id: uuidv4(),
    name,
    color: availableColor,
    createdAt: new Date().toISOString(),
  }

  projects.push(newProject)
  await writeJson(getProjectsPath(workspaceId), projects)

  return NextResponse.json(newProject)
}
