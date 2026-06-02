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

type RpcRequest = {
  method?: unknown
  params?: unknown
}

type RpcParams = Record<string, unknown>
type RpcStatus = 400 | 403 | 404 | 500

const DEFAULT_CONFIG: ProjectConfig = {
  rootPath: null,
  recentProjects: [],
  previewUrl: 'http://localhost:3000',
  projectTabs: {},
}

const PREFERENCES_FILE = 'preferences.json'
const gitignoreCache = new Map<string, { ig: Ignore; mtime: number }>()
const WORKSPACE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/
const PUBLIC_API_PATHS = new Set([
  '/api/moldable/health',
  '/api/moldable/today',
])

export const app = new Hono()

app.use('/api/*', async (c, next) => {
  if (PUBLIC_API_PATHS.has(new URL(c.req.url).pathname)) {
    await next()
    return
  }

  if (!getTrustedWorkspaceId(c.req.raw)) {
    return c.json({ error: 'Workspace header is required' }, 403)
  }

  await next()
})

function getConfigPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'config.json')
}

function getPreferencesPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), PREFERENCES_FILE)
}

function normalizeWorkspaceId(
  value: string | null | undefined,
): string | undefined {
  if (!value || !WORKSPACE_ID_PATTERN.test(value)) return undefined
  return value
}

function getTrustedWorkspaceId(request: Request): string | undefined {
  return (
    normalizeWorkspaceId(getWorkspaceFromRequest(request)) ??
    normalizeWorkspaceId(request.headers.get('x-moldable-workspace-id'))
  )
}

function getRequestWorkspaceId(request: Request): string | undefined {
  const queryWorkspace = new URL(request.url).searchParams.get('workspace')
  return getTrustedWorkspaceId(request) ?? normalizeWorkspaceId(queryWorkspace)
}

function asParams(value: unknown): RpcParams {
  return value && typeof value === 'object' ? (value as RpcParams) : {}
}

function stringParam(params: RpcParams, key: string): string | undefined {
  const value = params[key]
  return typeof value === 'string' ? value : undefined
}

function numberParam(params: RpcParams, key: string): number | undefined {
  const value = params[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function booleanParam(params: RpcParams, key: string): boolean | undefined {
  const value = params[key]
  return typeof value === 'boolean' ? value : undefined
}

function rpcError(code: string, message: string, status: RpcStatus = 400) {
  return {
    body: {
      ok: false,
      error: { code, message },
    },
    status,
  }
}

function isPathWithinRoot(rootPath: string, targetPath: string): boolean {
  const root = path.resolve(rootPath)
  const target = path.resolve(targetPath)
  const relative = path.relative(root, target)
  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  )
}

function validatePathWithinRoot(
  rootPath: string | null,
  targetPath: string,
): { root: string; target: string } | { error: string; status: 400 | 403 } {
  if (!rootPath) {
    return { error: 'Project root is required', status: 400 }
  }

  const root = path.resolve(rootPath)
  const target = path.resolve(targetPath)

  if (!isPathWithinRoot(root, target)) {
    return { error: 'Path is outside the current project', status: 403 }
  }

  return { root, target }
}

async function getProjectRoot(request: Request): Promise<string | null> {
  const workspaceId = getRequestWorkspaceId(request)
  const config = await readJson<ProjectConfig>(
    getConfigPath(workspaceId),
    DEFAULT_CONFIG,
  )
  return config.rootPath
}

async function validateRequestPath(
  request: Request,
  targetPath: string,
): Promise<
  { root: string; target: string } | { error: string; status: 400 | 403 }
> {
  return validatePathWithinRoot(await getProjectRoot(request), targetPath)
}

function isSafeFileName(name: string): boolean {
  return (
    name.length > 0 &&
    name !== '.' &&
    name !== '..' &&
    !name.includes('/') &&
    !name.includes('\\') &&
    !name.includes('\0')
  )
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
  const normalized = path.resolve(dirPath)
  const parts = normalized.split(path.sep)
  const nodeModulesIndex = parts.lastIndexOf('node_modules')

  if (nodeModulesIndex > 0) {
    return (
      parts.slice(0, nodeModulesIndex).join(path.sep) ||
      path.parse(normalized).root
    )
  }

  return normalized
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

app.get('/api/moldable/today', async (c) => {
  const items: unknown[] = []
  let resume: unknown = null

  try {
    const workspaceId = getRequestWorkspaceId(c.req.raw)
    const config = await readJson<ProjectConfig>(
      getConfigPath(workspaceId),
      DEFAULT_CONFIG,
    )

    const currentPath = config.rootPath
    const recent = Array.isArray(config.recentProjects)
      ? config.recentProjects
      : []

    // RESUME only: the project you were actually editing. Code-editor has no
    // failures/builds/imminent events to surface, and a list of recent projects
    // would just be a recent-item dump — so we stay silent unless there is a
    // real in-progress project to return to.
    if (currentPath) {
      const current = recent.find((p) => p.path === currentPath)
      const name = current?.name ?? path.basename(currentPath)
      const tabs = config.projectTabs?.[currentPath]
      const openCount = Array.isArray(tabs?.openFiles)
        ? tabs.openFiles.length
        : 0

      resume = {
        title: name,
        // Open files are the genuine WIP signal. With nothing open, skip the
        // subtitle rather than echo the action.
        ...(openCount > 0
          ? {
              subtitle: `${openCount} file${openCount === 1 ? '' : 's'} open`,
            }
          : {}),
        icon: '📝',
        deepLink: currentPath,
        lastTouchedAt: current?.lastOpened,
      }
    }
  } catch {
    // No project state / unreadable config: stay quiet.
    return c.json({
      items: [],
      resume: null,
      generatedAt: new Date().toISOString(),
    })
  }

  return c.json({ items, resume, generatedAt: new Date().toISOString() })
})

app.get('/api/config', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  const config = await readJson<ProjectConfig>(
    getConfigPath(workspaceId),
    DEFAULT_CONFIG,
  )
  return c.json(config)
})

app.post('/api/config', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
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
    const workspaceId = getRequestWorkspaceId(c.req.raw)
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
    const workspaceId = getRequestWorkspaceId(c.req.raw)
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
  const requestedRoot = c.req.query('root') || dirPath

  if (!dirPath) {
    return c.json({ error: 'Path is required' }, 400)
  }

  try {
    const configuredRoot = await getProjectRoot(c.req.raw)
    const root = configuredRoot ?? requestedRoot ?? findProjectRoot(dirPath)
    const validation = validatePathWithinRoot(root, dirPath)

    if ('error' in validation) {
      return c.json({ error: validation.error }, validation.status)
    }

    if (
      configuredRoot &&
      requestedRoot &&
      !isPathWithinRoot(configuredRoot, requestedRoot)
    ) {
      return c.json({ error: 'Root is outside the current project' }, 403)
    }

    const gitignore = await getGitignore(root)
    const entries = await fs.readdir(validation.target, { withFileTypes: true })
    const files = entries
      .filter((entry) => entry.name !== '.DS_Store')
      .map((entry) => {
        const fullPath = path.join(validation.target, entry.name)
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

    const validation = await validateRequestPath(c.req.raw, filePath)
    if ('error' in validation) {
      return c.json({ error: validation.error }, validation.status)
    }
    if (validation.target === validation.root) {
      return c.json({ error: 'Cannot delete the project root' }, 400)
    }

    try {
      await fs.access(validation.target)
    } catch {
      return c.json({ error: 'File not found' }, 404)
    }

    const stats = await fs.stat(validation.target)
    if (stats.isDirectory()) {
      await fs.rm(validation.target, { recursive: true })
    } else {
      await fs.unlink(validation.target)
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

    const trimmedNewName = newName?.trim()

    if (!oldPath || !trimmedNewName) {
      return c.json({ error: 'oldPath and newName are required' }, 400)
    }

    if (!isSafeFileName(trimmedNewName)) {
      return c.json({ error: 'Invalid new name' }, 400)
    }

    const validation = await validateRequestPath(c.req.raw, oldPath)
    if ('error' in validation) {
      return c.json({ error: validation.error }, validation.status)
    }
    if (validation.target === validation.root) {
      return c.json({ error: 'Cannot rename the project root' }, 400)
    }

    const dir = path.dirname(validation.target)
    const newPath = path.join(dir, trimmedNewName)
    const newPathValidation = validatePathWithinRoot(validation.root, newPath)
    if ('error' in newPathValidation) {
      return c.json(
        { error: newPathValidation.error },
        newPathValidation.status,
      )
    }

    try {
      await fs.access(validation.target)
    } catch {
      return c.json({ error: 'File not found' }, 404)
    }

    try {
      await fs.access(newPath)
      return c.json({ error: 'A file with that name already exists' }, 409)
    } catch {
      // New path does not exist.
    }

    await fs.rename(validation.target, newPathValidation.target)
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

  const validation = await validateRequestPath(c.req.raw, filePath)
  if ('error' in validation) {
    return c.json({ error: validation.error }, validation.status)
  }

  try {
    const buffer = await fs.readFile(validation.target)
    const mimeType = getImageMimeType(validation.target)

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
    const validation = await validateRequestPath(c.req.raw, filePath)
    if ('error' in validation) {
      return c.json({ error: validation.error }, validation.status)
    }

    const content = await fs.readFile(validation.target, 'utf-8')
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
    const configuredRoot = await getProjectRoot(c.req.raw)
    const validation = validatePathWithinRoot(configuredRoot ?? root, root)
    if ('error' in validation) {
      return c.json({ error: validation.error }, validation.status)
    }
    const searchRoot = validation.target
    const ignorePatterns = new Set(await getGitignorePatterns(searchRoot))
    ignorePatterns.add('**/node_modules/**')
    ignorePatterns.add('**/.git/**')
    ignorePatterns.add('**/.DS_Store')

    const files = await fg('**/*', {
      cwd: searchRoot,
      ignore: Array.from(ignorePatterns),
      onlyFiles: true,
      absolute: true,
      followSymbolicLinks: false,
    })

    const results = files.slice(0, MAX_SEARCH_RESULTS).map((filePath) => ({
      path: filePath,
      name: filePath.split('/').pop() ?? '',
      relativePath: path.relative(searchRoot, filePath),
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

    const validation = await validateRequestPath(c.req.raw, filePath)
    if ('error' in validation) {
      return c.json({ error: validation.error }, validation.status)
    }

    await fs.writeFile(validation.target, content ?? '', 'utf-8')
    return c.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)

  try {
    const body = (await c.req.json()) as RpcRequest
    const method = typeof body.method === 'string' ? body.method : ''
    const params = asParams(body.params)

    if (!method) {
      const error = rpcError('invalid_request', 'method is required')
      return c.json(error.body, error.status)
    }

    if (method === 'code.project.get') {
      const config = await readJson<ProjectConfig>(
        getConfigPath(workspaceId),
        DEFAULT_CONFIG,
      )
      return c.json({ ok: true, result: config })
    }

    if (method === 'code.project.recent') {
      const config = await readJson<ProjectConfig>(
        getConfigPath(workspaceId),
        DEFAULT_CONFIG,
      )
      return c.json({ ok: true, result: config.recentProjects })
    }

    if (method === 'code.project.set') {
      const rootPath = stringParam(params, 'rootPath') ?? null
      const previewUrl = stringParam(params, 'previewUrl')
      const configPath = getConfigPath(workspaceId)
      const existingConfig = await readJson<ProjectConfig>(
        configPath,
        DEFAULT_CONFIG,
      )
      const updated: ProjectConfig = {
        ...existingConfig,
        rootPath,
        ...(previewUrl ? { previewUrl } : {}),
      }
      await writeJson(configPath, updated)
      return c.json({ ok: true, result: updated })
    }

    if (method === 'code.preferences.get') {
      const prefs = await readJson<Preferences>(
        getPreferencesPath(workspaceId),
        {},
      )
      return c.json({ ok: true, result: prefs })
    }

    if (method === 'code.files.search') {
      const config = await readJson<ProjectConfig>(
        getConfigPath(workspaceId),
        DEFAULT_CONFIG,
      )
      const root = stringParam(params, 'root') ?? config.rootPath
      if (!root) {
        const error = rpcError(
          'root_required',
          'root or current project is required',
        )
        return c.json(error.body, error.status)
      }

      const validation = validatePathWithinRoot(config.rootPath ?? root, root)
      if ('error' in validation) {
        const error = rpcError(
          validation.status === 403 ? 'path_outside_project' : 'root_required',
          validation.error,
          validation.status,
        )
        return c.json(error.body, error.status)
      }

      const searchRoot = validation.target
      const ignorePatterns = new Set(await getGitignorePatterns(searchRoot))
      ignorePatterns.add('**/node_modules/**')
      ignorePatterns.add('**/.git/**')
      ignorePatterns.add('**/.DS_Store')
      const files = await fg(stringParam(params, 'pattern') ?? '**/*', {
        cwd: searchRoot,
        ignore: Array.from(ignorePatterns),
        onlyFiles: true,
        absolute: true,
        followSymbolicLinks: false,
      })
      const query = stringParam(params, 'query')?.toLowerCase()
      const limit = Math.max(
        1,
        Math.min(numberParam(params, 'limit') ?? 100, 500),
      )
      const results = files
        .map((filePath) => ({
          path: filePath,
          name: path.basename(filePath),
          relativePath: path.relative(searchRoot, filePath),
        }))
        .filter((item) =>
          query
            ? `${item.name}\n${item.relativePath}`.toLowerCase().includes(query)
            : true,
        )
        .slice(0, limit)

      return c.json({ ok: true, result: results })
    }

    if (method === 'code.files.read') {
      const filePath = stringParam(params, 'path')
      if (!filePath) {
        const error = rpcError('path_required', 'path is required')
        return c.json(error.body, error.status)
      }

      const validation = await validateRequestPath(c.req.raw, filePath)
      if ('error' in validation) {
        const error = rpcError(
          validation.status === 403 ? 'path_outside_project' : 'root_required',
          validation.error,
          validation.status,
        )
        return c.json(error.body, error.status)
      }

      const content = await fs.readFile(validation.target, 'utf-8')
      const maxChars = Math.max(
        1,
        Math.min(numberParam(params, 'maxChars') ?? 20000, 100000),
      )
      return c.json({
        ok: true,
        result: {
          path: validation.target,
          content: content.slice(0, maxChars),
          truncated: content.length > maxChars,
        },
      })
    }

    if (method === 'code.files.list') {
      const dirPath = stringParam(params, 'path')
      if (!dirPath) {
        const error = rpcError('path_required', 'path is required')
        return c.json(error.body, error.status)
      }

      const config = await readJson<ProjectConfig>(
        getConfigPath(workspaceId),
        DEFAULT_CONFIG,
      )
      const root = stringParam(params, 'root') ?? config.rootPath ?? dirPath
      const rootValidation = validatePathWithinRoot(
        config.rootPath ?? root,
        root,
      )
      if ('error' in rootValidation) {
        const error = rpcError(
          rootValidation.status === 403
            ? 'path_outside_project'
            : 'root_required',
          rootValidation.error,
          rootValidation.status,
        )
        return c.json(error.body, error.status)
      }
      const pathValidation = validatePathWithinRoot(
        rootValidation.target,
        dirPath,
      )
      if ('error' in pathValidation) {
        const error = rpcError(
          pathValidation.status === 403
            ? 'path_outside_project'
            : 'root_required',
          pathValidation.error,
          pathValidation.status,
        )
        return c.json(error.body, error.status)
      }

      const gitignore = await getGitignore(rootValidation.target)
      const entries = await fs.readdir(pathValidation.target, {
        withFileTypes: true,
      })
      const includeHidden = booleanParam(params, 'includeHidden') ?? true
      const files = entries
        .filter((entry) => includeHidden || !entry.name.startsWith('.'))
        .filter((entry) => entry.name !== '.DS_Store')
        .map((entry) => {
          const fullPath = path.join(pathValidation.target, entry.name)
          const relativePath = path.relative(rootValidation.target, fullPath)
          const matchPath = entry.isDirectory()
            ? `${relativePath}/`
            : relativePath
          return {
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            isDimmed: gitignore?.ignores(matchPath) ?? false,
          }
        })
      return c.json({ ok: true, result: files })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Code does not expose ${method}.`,
        },
      },
      404,
    )
  } catch (error) {
    console.error('Code RPC failed:', error)
    return c.json(
      {
        ok: false,
        error: {
          code: 'code_rpc_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Code could not complete the request.',
        },
      },
      500,
    )
  }
})
