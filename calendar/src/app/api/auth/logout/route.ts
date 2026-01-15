import { NextResponse } from 'next/server'
import { getWorkspaceFromRequest } from '@moldable-ai/storage'
import { clearTokens } from '@/lib/calendar/google-auth'

export async function POST(request: Request) {
  try {
    const workspaceId = getWorkspaceFromRequest(request)
    await clearTokens(workspaceId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 })
  }
}
