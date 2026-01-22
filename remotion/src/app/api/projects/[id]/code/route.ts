import { NextResponse } from 'next/server'
import { getWorkspaceFromRequest } from '@moldable-ai/storage'
import { getCompositionPath, readProjectMetadata } from '@/lib/storage'
import { readFile, writeFile } from 'fs/promises'

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET /api/projects/[id]/code - Get just the composition code
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params
  const workspaceId = getWorkspaceFromRequest(request)

  const metadata = await readProjectMetadata(workspaceId, id)
  if (!metadata) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const compositionPath = getCompositionPath(workspaceId, id)

  try {
    const code = await readFile(compositionPath, 'utf-8')
    return NextResponse.json({ code, path: compositionPath })
  } catch {
    return NextResponse.json({ code: '', path: compositionPath })
  }
}

// PUT /api/projects/[id]/code - Update just the composition code
export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params
  const workspaceId = getWorkspaceFromRequest(request)

  const metadata = await readProjectMetadata(workspaceId, id)
  if (!metadata) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const { code } = await request.json()

  if (typeof code !== 'string') {
    return NextResponse.json(
      { error: 'Code must be a string' },
      { status: 400 },
    )
  }

  const compositionPath = getCompositionPath(workspaceId, id)
  await writeFile(compositionPath, code, 'utf-8')

  return NextResponse.json({ success: true, path: compositionPath })
}
