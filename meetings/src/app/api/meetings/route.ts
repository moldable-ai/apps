import { NextResponse } from 'next/server'
import { getWorkspaceFromRequest } from '@moldable/storage'
import { loadMeetings, saveMeeting } from '@/lib/storage.server'
import type { Meeting } from '@/types'

/**
 * GET /api/meetings - List all meetings
 */
export async function GET(request: Request) {
  try {
    const workspaceId = getWorkspaceFromRequest(request)
    const meetings = await loadMeetings(workspaceId)
    return NextResponse.json(meetings)
  } catch (error) {
    console.error('Failed to load meetings:', error)
    return NextResponse.json(
      { error: 'Failed to load meetings' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/meetings - Save a meeting (create or update)
 */
export async function POST(request: Request) {
  try {
    const workspaceId = getWorkspaceFromRequest(request)
    const meeting = (await request.json()) as Meeting
    await saveMeeting(meeting, workspaceId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to save meeting:', error)
    return NextResponse.json(
      { error: 'Failed to save meeting' },
      { status: 500 },
    )
  }
}
