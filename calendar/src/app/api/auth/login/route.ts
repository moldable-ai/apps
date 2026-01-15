import { NextResponse } from 'next/server'
import { getWorkspaceFromRequest } from '@moldable-ai/storage'
import { getAuthUrl } from '@/lib/calendar/google-auth'

export async function GET(request: Request) {
  try {
    const workspaceId = getWorkspaceFromRequest(request)
    const url = await getAuthUrl(workspaceId)
    return NextResponse.json({ url })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate auth URL',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
