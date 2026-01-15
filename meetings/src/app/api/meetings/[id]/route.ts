import { NextResponse } from 'next/server'
import { getWorkspaceFromRequest } from '@moldable/storage'
import { deleteMeeting, getMeeting } from '@/lib/storage.server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/meetings/[id] - Get a single meeting
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const workspaceId = getWorkspaceFromRequest(request)
    const { id } = await params
    const meeting = await getMeeting(id, workspaceId)
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }
    return NextResponse.json(meeting)
  } catch (error) {
    console.error('Failed to get meeting:', error)
    return NextResponse.json(
      { error: 'Failed to get meeting' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/meetings/[id] - Delete a meeting
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const workspaceId = getWorkspaceFromRequest(request)
    const { id } = await params
    await deleteMeeting(id, workspaceId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to delete meeting:', error)
    return NextResponse.json(
      { error: 'Failed to delete meeting' },
      { status: 500 },
    )
  }
}
