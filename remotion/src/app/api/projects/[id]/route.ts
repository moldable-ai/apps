import { NextResponse } from 'next/server'
import { getWorkspaceFromRequest } from '@moldable-ai/storage'
import {
  getProjectDir,
  readProject,
  readProjectIndex,
  readProjectMetadata,
  writeCompositionCode,
  writeProjectIndex,
  writeProjectMetadata,
} from '@/lib/storage'
import { UpdateProjectInput } from '@/lib/types'
import { rm } from 'fs/promises'

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET /api/projects/[id] - Get a single project with composition code
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params
  const workspaceId = getWorkspaceFromRequest(request)

  const project = await readProject(workspaceId, id)

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json(project)
}

// PUT /api/projects/[id] - Update a project
export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params
  const workspaceId = getWorkspaceFromRequest(request)

  const existing = await readProjectMetadata(workspaceId, id)

  if (!existing) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const input: UpdateProjectInput = await request.json()

  // Separate composition code from metadata
  const { compositionCode, ...metadataUpdates } = input

  // Update metadata
  const updatedMetadata = {
    ...existing,
    ...metadataUpdates,
    id: existing.id, // Never allow ID to change
    createdAt: existing.createdAt, // Never allow createdAt to change
    updatedAt: new Date().toISOString(),
  }

  await writeProjectMetadata(workspaceId, id, updatedMetadata)

  // Update composition code if provided
  if (compositionCode !== undefined) {
    await writeCompositionCode(workspaceId, id, compositionCode)
  }

  // Return full project
  const project = await readProject(workspaceId, id)
  return NextResponse.json(project)
}

// DELETE /api/projects/[id] - Delete a project
export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params
  const workspaceId = getWorkspaceFromRequest(request)

  const existing = await readProjectMetadata(workspaceId, id)

  if (!existing) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Delete the entire project directory
  const projectDir = getProjectDir(workspaceId, id)
  await rm(projectDir, { recursive: true, force: true })

  // Update index
  const projectIds = await readProjectIndex(workspaceId)
  const newIds = projectIds.filter((pid) => pid !== id)
  await writeProjectIndex(workspaceId, newIds)

  return NextResponse.json({ success: true })
}
