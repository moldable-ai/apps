import { NextResponse } from 'next/server'
import {
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'

interface Preferences {
  panelSizes?: Record<string, number[]>
  [key: string]: unknown
}

const PREFERENCES_FILE = 'preferences.json'

function getPreferencesPath(workspaceId?: string): string {
  const dataDir = getAppDataDir(workspaceId)
  return safePath(dataDir, PREFERENCES_FILE)
}

export async function GET(request: Request) {
  try {
    const workspaceId = getWorkspaceFromRequest(request)
    const prefsPath = getPreferencesPath(workspaceId)
    const prefs = await readJson<Preferences>(prefsPath, {})
    return NextResponse.json(prefs)
  } catch (error) {
    console.error('Failed to read preferences:', error)
    return NextResponse.json({})
  }
}

export async function POST(request: Request) {
  try {
    const workspaceId = getWorkspaceFromRequest(request)
    const prefsPath = getPreferencesPath(workspaceId)
    const body = await request.json()

    // Read existing preferences and merge
    const existing = await readJson<Preferences>(prefsPath, {})
    const updated = { ...existing, ...body }

    await writeJson(prefsPath, updated)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to write preferences:', error)
    return NextResponse.json(
      { error: 'Failed to save preferences' },
      { status: 500 },
    )
  }
}
