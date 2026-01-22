import { NextResponse } from 'next/server'
import { getWorkspaceFromRequest } from '@moldable-ai/storage'
import { ensureDir } from '@moldable-ai/storage'
import {
  getProjectsDir,
  readProjectIndex,
  readProjectMetadata,
  writeProject,
  writeProjectIndex,
} from '@/lib/storage'
import {
  CreateProjectInput,
  DEFAULT_COMPOSITION_CODE,
  ProjectMetadata,
} from '@/lib/types'
import { v4 as uuidv4 } from 'uuid'

// GET /api/projects - List all projects
export async function GET(request: Request) {
  const workspaceId = getWorkspaceFromRequest(request)

  const projectIds = await readProjectIndex(workspaceId)
  const projects: ProjectMetadata[] = []

  for (const id of projectIds) {
    const metadata = await readProjectMetadata(workspaceId, id)
    if (metadata) {
      projects.push(metadata)
    }
  }

  // Sort by updated date, newest first
  projects.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )

  return NextResponse.json(projects)
}

// POST /api/projects - Create a new project
export async function POST(request: Request) {
  const workspaceId = getWorkspaceFromRequest(request)
  const input: CreateProjectInput = await request.json()

  const now = new Date().toISOString()
  const projectId = uuidv4()

  const metadata: ProjectMetadata = {
    id: projectId,
    name: input.name || 'Untitled Project',
    description: input.description || '',
    createdAt: now,
    updatedAt: now,
    width: input.width ?? 1920,
    height: input.height ?? 1080,
    fps: input.fps ?? 30,
    durationInFrames: input.durationInFrames ?? 450, // 15 seconds at 30fps
    autoDuration: input.autoDuration ?? false,
  }

  const compositionCode = input.compositionCode ?? DEFAULT_COMPOSITION_CODE

  // Ensure projects directory exists
  await ensureDir(getProjectsDir(workspaceId))

  // Save project (creates directory, writes metadata + composition file)
  await writeProject(workspaceId, { ...metadata, compositionCode })

  // Update index
  const projectIds = await readProjectIndex(workspaceId)
  projectIds.push(projectId)
  await writeProjectIndex(workspaceId, projectIds)

  // Return full project for immediate use
  return NextResponse.json({ ...metadata, compositionCode })
}
