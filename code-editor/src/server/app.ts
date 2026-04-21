import {
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { MAX_SEARCH_RESULTS } from '../lib/constants'
import { getImageMimeType, isImageFile } from '../lib/file-utils'
import fg from 'fast-glob'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import ignore, { type Ignore } from 'ignore'
import fs from 'node:fs/promises'
import path from 'node:path'

interface ProjectTabs {
  openFiles: string[]
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
  projectTabs: Record<string, ProjectTabs>
}

interface Preferences {
  panelSizes?: Record<string, number[]>
  [key: string]: unknown
}

const DEFAULT_CONFIG: ProjectConfig = {
  rootPath: null,
  recentProjects: [],
  previewUrl: 'http://localhost:3000',
  projectTabs: {},
}

const PREFERENCES_FILE = 'preferences.json'
const gitignoreCache = new Map<string, { ig: Ignore; mtime: number }>()

export const app = new Hono()

app.use('/api/*', cors())

function getConfigPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'config.json')
}

function getPreferencesPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), PREFERENCES_FILE)
}

async function getGitignore(projectRoot: string): Promise<Ignore | null> {
  const gitignorePath = path.join(projectRoot, '.gitignore')

  try {
    const stat = await fs.stat(gitignorePath)
    const mtime = stat.mtimeMs
    const cached = gitignoreCache.get(projectRoot)

    if (cached && cached.mtime === mtime) {
      return cached.ig
    }

    const content = await fs.readFile(gitignorePath, 'utf-8')
    const ig = ignore().add(content)
    gitignoreCache.set(projectRoot, { ig, mtime })
    return ig
  } catch {
    return null
  }
}

function findProjectRoot(dirPath: string): string {
  let current = dirPath
  const root = path.parse(current).root

  while (current !== root) {
    if (current.includes('node_modules')) {
      current = path.dirname(current)
      continue
    }
    return current.split('/node_modules')[0].split('/.')[0] || current
  }

  return dirPath
}

async function getGitignorePatterns(root: string): Promise<string[]> {
  const gitignorePath = path.join(root, '.gitignore')

  try {
    const content = await fs.readFile(gitignorePath, 'utf-8')
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((pattern) => {
        if (pattern.startsWith('!')) return null
        if (pattern.endsWith('/')) return `**/${pattern}**`
        if (!pattern.startsWith('/') && !pattern.includes('/')) {
          return `**/${pattern}`
        }
        if (pattern.startsWith('/')) return pattern.slice(1)
        return `**/${pattern}`
      })
      .filter((pattern): pattern is string => pattern !== null)
  } catch {
    return ['**/node_modules/**', '**/.git/**']
  }
}

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null

  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'code-editor',
      port,
      status: 'ok',
      ts: Date.now(),
    },
    200,
    {
      'Cache-Control': 'no-store',
    },
  )
})

app.get('/api/config', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const config = await readJson<ProjectConfig>(
    getConfigPath(workspaceId),
    DEFAULT_CONFIG,
  )
  return c.json(config)
})

app.post('/api/config', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const configPath = getConfigPath(workspaceId)
  const existingConfig = await readJson<ProjectConfig>(
    configPath,
    DEFAULT_CONFIG,
  )
  const updates = await c.req.json<Partial<ProjectConfig>>()
  const newConfig: ProjectConfig = {
    ...existingConfig,
    ...updates,
  }

  await writeJson(configPath, newConfig)
  return c.json(newConfig)
})

app.get('/api/preferences', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const prefs = await readJson<Preferences>(
      getPreferencesPath(workspaceId),
      {},
    )
    return c.json(prefs)
  } catch (error) {
    console.error('Failed to read preferences:', error)
    return c.json({})
  }
})

app.post('/api/preferences', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const prefsPath = getPreferencesPath(workspaceId)
    const body = await c.req.json<Preferences>()
    const existing = await readJson<Preferences>(prefsPath, {})
    const updated = { ...existing, ...body }

    await writeJson(prefsPath, updated)
    return c.json({ success: true })
  } catch (error) {
    console.error('Failed to write preferences:', error)
    return c.json({ error: 'Failed to save preferences' }, 500)
  }
})

app.get('/api/files', async (c) => {
  const dirPath = c.req.query('path')
  const projectRoot = c.req.query('root') || dirPath

  if (!dirPath) {
    return c.json({ error: 'Path is required' }, 400)
  }

  try {
    const root = projectRoot || findProjectRoot(dirPath)
    const gitignore = await getGitignore(root)
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const files = entries
      .filter((entry) => entry.name !== '.DS_Store')
      .map((entry) => {
        const fullPath = path.join(dirPath, entry.name)
        const relativePath = path.relative(root, fullPath)
        const matchPath = entry.isDirectory()
          ? `${relativePath}/`
          : relativePath
        const isIgnored = gitignore?.ignores(matchPath) ?? false

        return {
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          isDimmed: isIgnored,
        }
      })
      .sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
        const aDot = a.name.startsWith('.')
        const bDot = b.name.startsWith('.')
        if (aDot !== bDot) return aDot ? -1 : 1
        return a.name.localeCompare(b.name)
      })

    return c.json({ files })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

app.post('/api/files/delete', async (c) => {
  try {
    const { path: filePath } = await c.req.json<{ path?: string }>()

    if (!filePath) {
      return c.json({ error: 'path is required' }, 400)
    }

    try {
      await fs.access(filePath)
    } catch {
      return c.json({ error: 'File not found' }, 404)
    }

    const stats = await fs.stat(filePath)
    if (stats.isDirectory()) {
      await fs.rm(filePath, { recursive: true })
    } else {
      await fs.unlink(filePath)
    }

    return c.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

app.post('/api/files/rename', async (c) => {
  try {
    const { oldPath, newName } = await c.req.json<{
      oldPath?: string
      newName?: string
    }>()

    if (!oldPath || !newName) {
      return c.json({ error: 'oldPath and newName are required' }, 400)
    }

    if (newName.includes('/') || newName.includes('\\')) {
      return c.json({ error: 'New name cannot contain path separators' }, 400)
    }

    const dir = path.dirname(oldPath)
    const newPath = path.join(dir, newName)

    try {
      await fs.access(oldPath)
    } catch {
      return c.json({ error: 'File not found' }, 404)
    }

    try {
      await fs.access(newPath)
      return c.json({ error: 'A file with that name already exists' }, 409)
    } catch {
      // New path does not exist.
    }

    await fs.rename(oldPath, newPath)
    return c.json({ success: true, newPath })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

app.get('/api/image', async (c) => {
  const filePath = c.req.query('path')

  if (!filePath) {
    return c.json({ error: 'Path is required' }, 400)
  }

  if (!isImageFile(filePath)) {
    return c.json({ error: 'Not an image file' }, 400)
  }

  const normalizedPath = path.normalize(filePath)
  if (normalizedPath.includes('..')) {
    return c.json({ error: 'Invalid path' }, 400)
  }

  try {
    const buffer = await fs.readFile(normalizedPath)
    const mimeType = getImageMimeType(normalizedPath)

    return new Response(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

app.get('/api/read', async (c) => {
  const filePath = c.req.query('path')

  if (!filePath) {
    return c.json({ error: 'Path is required' }, 400)
  }

  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return c.json({ content })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

app.get('/api/search', async (c) => {
  const root = c.req.query('root')

  if (!root) {
    return c.json({ error: 'Root path is required' }, 400)
  }

  try {
    const ignorePatterns = await getGitignorePatterns(root)
    ignorePatterns.push('**/.DS_Store')

    const files = await fg('**/*', {
      cwd: root,
      ignore: ignorePatterns,
      onlyFiles: true,
      absolute: true,
      followSymbolicLinks: false,
    })

    const results = files.slice(0, MAX_SEARCH_RESULTS).map((filePath) => ({
      path: filePath,
      name: filePath.split('/').pop() ?? '',
      relativePath: filePath.replace(root, '').replace(/^\//, ''),
    }))

    return c.json({ files: results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

app.post('/api/write', async (c) => {
  try {
    const { path: filePath, content } = await c.req.json<{
      path?: string
      content?: string
    }>()

    if (!filePath) {
      return c.json({ error: 'Path is required' }, 400)
    }

    await fs.writeFile(filePath, content ?? '', 'utf-8')
    return c.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})
