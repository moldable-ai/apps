import { NextResponse } from 'next/server'
import {
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'

interface ProjectTabs {
  openFiles: string[] // Array of file paths
  activeFile: string | null
}

interface ProjectConfig {
  rootPath: string | null
  recentProjects: Array<{
    path: string
    name: string
    lastOpened: string
  }>
  previewUrl: string
  // Map of project path -> tabs state for that project
  projectTabs: Record<string, ProjectTabs>
}

const DEFAULT_CONFIG: ProjectConfig = {
  rootPath: null,
  recentProjects: [],
  previewUrl: 'http://localhost:3000',
  projectTabs: {},
}

export async function GET(request: Request) {
  const workspaceId = getWorkspaceFromRequest(request)
  const dataDir = getAppDataDir(workspaceId)
  const configPath = safePath(dataDir, 'config.json')
  const config = await readJson<ProjectConfig>(configPath, DEFAULT_CONFIG)
  return NextResponse.json(config)
}

export async function POST(request: Request) {
  const workspaceId = getWorkspaceFromRequest(request)
  const dataDir = getAppDataDir(workspaceId)
  const configPath = safePath(dataDir, 'config.json')

  // Read existing config
  const existingConfig = await readJson<ProjectConfig>(
    configPath,
    DEFAULT_CONFIG,
  )

  // Merge with updates (partial update support)
  const updates = await request.json()
  const newConfig: ProjectConfig = {
    ...existingConfig,
    ...updates,
  }

  await writeJson(configPath, newConfig)
  return NextResponse.json(newConfig)
}
