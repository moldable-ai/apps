import { NextResponse } from 'next/server'
import { getWorkspaceFromRequest } from '@moldable-ai/storage'
import { loadSettings, saveSettings } from '@/lib/storage.server'
import type { MeetingSettings } from '@/types'

/**
 * GET /api/settings - Get settings
 */
export async function GET(request: Request) {
  try {
    const workspaceId = getWorkspaceFromRequest(request)
    const settings = await loadSettings(workspaceId)
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Failed to load settings:', error)
    return NextResponse.json(
      { error: 'Failed to load settings' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/settings - Save settings
 */
export async function POST(request: Request) {
  try {
    const workspaceId = getWorkspaceFromRequest(request)
    const settings = (await request.json()) as MeetingSettings
    await saveSettings(settings, workspaceId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to save settings:', error)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 },
    )
  }
}
