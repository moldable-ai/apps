import {
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  safePath,
} from '@moldable-ai/storage'
import {
  getCompositionPath,
  getExportsDir,
  getProjectDir,
  getProjectsDir,
  readProject,
  readProjectIndex,
  readProjectMetadata,
  writeCompositionCode,
  writeProject,
  writeProjectIndex,
  writeProjectMetadata,
} from '../lib/storage'
import {
  type CreateProjectInput,
  DEFAULT_COMPOSITION_CODE,
  type ProjectMetadata,
  type UpdateProjectInput,
} from '../lib/types'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { lookup } from 'mime-types'
import { execFile } from 'node:child_process'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { v4 as uuidv4 } from 'uuid'

const execFileAsync = promisify(execFile)

export const app = new Hono()

app.use('/api/*', cors())

type RpcRequest = {
  method?: unknown
  params?: unknown
}

type RpcParams = Record<string, unknown>
type RpcStatus = 400 | 404 | 500

const SAFE_CHILD_ENV_KEYS = new Set([
  'HOME',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'LOGNAME',
  'PATH',
  'SHELL',
  'TMP',
  'TMPDIR',
  'USER',
])

function getSafeChildEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string' && SAFE_CHILD_ENV_KEYS.has(key)) {
      env[key] = value
    }
  }
  return env
}

function getRpcWorkspaceId(request: Request): string | undefined {
  return (
    request.headers.get('x-moldable-workspace-id') ??
    getWorkspaceFromRequest(request)
  )
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

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null

  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'remotion',
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

app.get('/api/projects', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const projectIds = await readProjectIndex(workspaceId)
    const projects: ProjectMetadata[] = []

    for (const id of projectIds) {
      const metadata = await readProjectMetadata(workspaceId, id)
      if (metadata) {
        projects.push(metadata)
      }
    }

    projects.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )

    return c.json(projects)
  } catch (error) {
    console.error('Failed to read projects:', error)
    return c.json({ error: 'Failed to read projects' }, 500)
  }
})

app.post('/api/projects', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const input = await c.req.json<CreateProjectInput>()
    const now = new Date().toISOString()
    const projectId = uuidv4()

    const metadata: ProjectMetadata = {
      id: projectId,
      name: input.name || 'Untitled Project',
      description: input.description || '',
      createdAt: now,
      updatedAt: now,
      width: input.width ?? 1920,
      height: input.height ?? 1080,
      fps: input.fps ?? 30,
      durationInFrames: input.durationInFrames ?? 450,
      autoDuration: input.autoDuration ?? false,
    }

    const compositionCode = input.compositionCode ?? DEFAULT_COMPOSITION_CODE

    await ensureDir(getProjectsDir(workspaceId))
    await writeProject(workspaceId, { ...metadata, compositionCode })

    const projectIds = await readProjectIndex(workspaceId)
    projectIds.push(projectId)
    await writeProjectIndex(workspaceId, projectIds)

    return c.json({ ...metadata, compositionCode })
  } catch (error) {
    console.error('Failed to create project:', error)
    return c.json({ error: 'Failed to create project' }, 500)
  }
})

app.get('/api/projects/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const project = await readProject(workspaceId, id)

    if (!project) {
      return c.json({ error: 'Project not found' }, 404)
    }

    return c.json(project)
  } catch (error) {
    console.error('Failed to read project:', error)
    return c.json({ error: 'Failed to read project' }, 500)
  }
})

app.put('/api/projects/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const existing = await readProjectMetadata(workspaceId, id)

    if (!existing) {
      return c.json({ error: 'Project not found' }, 404)
    }

    const input = await c.req.json<UpdateProjectInput>()
    const { compositionCode, ...metadataUpdates } = input
    const updatedMetadata = {
      ...existing,
      ...metadataUpdates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    }

    await writeProjectMetadata(workspaceId, id, updatedMetadata)

    if (compositionCode !== undefined) {
      await writeCompositionCode(workspaceId, id, compositionCode)
    }

    const project = await readProject(workspaceId, id)
    return c.json(project)
  } catch (error) {
    console.error('Failed to update project:', error)
    return c.json({ error: 'Failed to update project' }, 500)
  }
})

app.delete('/api/projects/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const existing = await readProjectMetadata(workspaceId, id)

    if (!existing) {
      return c.json({ error: 'Project not found' }, 404)
    }

    await rm(getProjectDir(workspaceId, id), { recursive: true, force: true })

    const projectIds = await readProjectIndex(workspaceId)
    await writeProjectIndex(
      workspaceId,
      projectIds.filter((pid) => pid !== id),
    )

    return c.json({ success: true })
  } catch (error) {
    console.error('Failed to delete project:', error)
    return c.json({ error: 'Failed to delete project' }, 500)
  }
})

app.get('/api/projects/:id/code', async (c) => {
  try {
    const id = c.req.param('id')
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const metadata = await readProjectMetadata(workspaceId, id)

    if (!metadata) {
      return c.json({ error: 'Project not found' }, 404)
    }

    const compositionPath = getCompositionPath(workspaceId, id)

    try {
      const code = await readFile(compositionPath, 'utf-8')
      return c.json({ code, path: compositionPath })
    } catch {
      return c.json({ code: '', path: compositionPath })
    }
  } catch (error) {
    console.error('Failed to read project code:', error)
    return c.json({ error: 'Failed to read project code' }, 500)
  }
})

app.put('/api/projects/:id/code', async (c) => {
  try {
    const id = c.req.param('id')
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const metadata = await readProjectMetadata(workspaceId, id)

    if (!metadata) {
      return c.json({ error: 'Project not found' }, 404)
    }

    const { code } = await c.req.json<{ code: unknown }>()

    if (typeof code !== 'string') {
      return c.json({ error: 'Code must be a string' }, 400)
    }

    const compositionPath = getCompositionPath(workspaceId, id)
    await writeFile(compositionPath, code, 'utf-8')

    return c.json({ success: true, path: compositionPath })
  } catch (error) {
    console.error('Failed to update project code:', error)
    return c.json({ error: 'Failed to update project code' }, 500)
  }
})

app.get('/api/projects/:id/public/*', async (c) => {
  const id = c.req.param('id')
  const publicPath = c.req.param('*') ?? ''
  const url = new URL(c.req.url)
  const workspaceId =
    url.searchParams.get('workspace') ||
    c.req.header('x-moldable-workspace') ||
    undefined
  const dataDir = getAppDataDir(workspaceId)
  const pathParts = publicPath.split('/').filter(Boolean)
  const filePath = safePath(dataDir, 'projects', id, 'public', ...pathParts)

  try {
    const stats = await stat(filePath)
    if (!stats.isFile()) {
      return c.json({ error: 'Not a file' }, 404)
    }

    const fileBuffer = await readFile(filePath)
    const fileName = pathParts[pathParts.length - 1] ?? ''
    const contentType = lookup(fileName) || 'application/octet-stream'

    return new Response(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Error serving public file:', error)
    return c.json({ error: 'File not found' }, 404)
  }
})

app.post('/api/projects/:id/render', async (c) => {
  try {
    const id = c.req.param('id')
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const metadata = await readProjectMetadata(workspaceId, id)

    if (!metadata) {
      return c.json({ error: 'Project not found' }, 404)
    }

    const exportsDir = getExportsDir(workspaceId)
    await mkdir(exportsDir, { recursive: true })

    const timestamp = Date.now()
    const sanitizedName = metadata.name.replace(/[^a-zA-Z0-9-_]/g, '_')
    const outputFileName = `${sanitizedName}_${timestamp}.mp4`
    const outputPath = path.join(exportsDir, outputFileName)
    const appRoot = process.cwd()
    const renderScript = path.join(appRoot, 'scripts', 'render.mjs')
    const projectDir = getProjectDir(workspaceId, id)

    const { stdout, stderr } = await execFileAsync(
      'node',
      [renderScript, projectDir, outputPath],
      {
        cwd: appRoot,
        timeout: 5 * 60 * 1000,
        env: {
          ...getSafeChildEnv(),
          NODE_ENV: 'production',
        },
      },
    )

    console.log('Render stdout:', stdout)
    if (stderr) console.error('Render stderr:', stderr)

    return c.json({
      success: true,
      outputPath,
      fileName: outputFileName,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Render error:', errorMessage)
    return c.json({ error: 'Export failed', details: errorMessage }, 500)
  }
})

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getRpcWorkspaceId(c.req.raw)

  try {
    const body = (await c.req.json()) as RpcRequest
    const method = typeof body.method === 'string' ? body.method : ''
    const params = asParams(body.params)

    if (!method) {
      const error = rpcError('invalid_request', 'method is required')
      return c.json(error.body, error.status)
    }

    if (method === 'remotion.projects.list') {
      const projectIds = await readProjectIndex(workspaceId)
      const projects: ProjectMetadata[] = []
      const query = stringParam(params, 'query')?.toLowerCase()
      const limit = Math.max(
        1,
        Math.min(numberParam(params, 'limit') ?? 100, 500),
      )

      for (const id of projectIds) {
        const metadata = await readProjectMetadata(workspaceId, id)
        if (metadata) {
          projects.push(metadata)
        }
      }

      const filtered = projects
        .filter((project) =>
          query
            ? `${project.name}\n${project.description}`
                .toLowerCase()
                .includes(query)
            : true,
        )
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, limit)

      return c.json({ ok: true, result: filtered })
    }

    if (method === 'remotion.projects.get') {
      const id = stringParam(params, 'id')
      if (!id) {
        const error = rpcError('invalid_params', 'id is required')
        return c.json(error.body, error.status)
      }
      const project = await readProject(workspaceId, id)
      if (!project) {
        const error = rpcError(
          'project_not_found',
          'Project was not found',
          404,
        )
        return c.json(error.body, error.status)
      }
      return c.json({ ok: true, result: project })
    }

    if (method === 'remotion.projects.create') {
      const now = new Date().toISOString()
      const projectId = uuidv4()
      const metadata: ProjectMetadata = {
        id: projectId,
        name: stringParam(params, 'name') ?? 'Untitled Project',
        description: stringParam(params, 'description') ?? '',
        createdAt: now,
        updatedAt: now,
        width: numberParam(params, 'width') ?? 1920,
        height: numberParam(params, 'height') ?? 1080,
        fps: numberParam(params, 'fps') ?? 30,
        durationInFrames: numberParam(params, 'durationInFrames') ?? 450,
        autoDuration: booleanParam(params, 'autoDuration') ?? false,
      }
      const compositionCode =
        stringParam(params, 'compositionCode') ?? DEFAULT_COMPOSITION_CODE

      await ensureDir(getProjectsDir(workspaceId))
      await writeProject(workspaceId, { ...metadata, compositionCode })
      const projectIds = await readProjectIndex(workspaceId)
      await writeProjectIndex(workspaceId, [...projectIds, projectId])
      return c.json({ ok: true, result: { ...metadata, compositionCode } })
    }

    if (method === 'remotion.projects.update') {
      const id = stringParam(params, 'id')
      if (!id) {
        const error = rpcError('invalid_params', 'id is required')
        return c.json(error.body, error.status)
      }
      const existing = await readProjectMetadata(workspaceId, id)
      if (!existing) {
        const error = rpcError(
          'project_not_found',
          'Project was not found',
          404,
        )
        return c.json(error.body, error.status)
      }

      const updatedMetadata: ProjectMetadata = {
        ...existing,
        ...(stringParam(params, 'name') !== undefined
          ? { name: stringParam(params, 'name')! }
          : {}),
        ...(stringParam(params, 'description') !== undefined
          ? { description: stringParam(params, 'description')! }
          : {}),
        ...(numberParam(params, 'width') !== undefined
          ? { width: numberParam(params, 'width')! }
          : {}),
        ...(numberParam(params, 'height') !== undefined
          ? { height: numberParam(params, 'height')! }
          : {}),
        ...(numberParam(params, 'fps') !== undefined
          ? { fps: numberParam(params, 'fps')! }
          : {}),
        ...(numberParam(params, 'durationInFrames') !== undefined
          ? { durationInFrames: numberParam(params, 'durationInFrames')! }
          : {}),
        ...(booleanParam(params, 'autoDuration') !== undefined
          ? { autoDuration: booleanParam(params, 'autoDuration')! }
          : {}),
        updatedAt: new Date().toISOString(),
      }
      await writeProjectMetadata(workspaceId, id, updatedMetadata)

      const compositionCode = stringParam(params, 'compositionCode')
      if (compositionCode !== undefined) {
        await writeCompositionCode(workspaceId, id, compositionCode)
      }

      return c.json({
        ok: true,
        result: await readProject(workspaceId, id),
      })
    }

    if (method === 'remotion.projects.delete') {
      const id = stringParam(params, 'id')
      if (!id) {
        const error = rpcError('invalid_params', 'id is required')
        return c.json(error.body, error.status)
      }
      const existing = await readProjectMetadata(workspaceId, id)
      if (!existing) {
        const error = rpcError(
          'project_not_found',
          'Project was not found',
          404,
        )
        return c.json(error.body, error.status)
      }
      await rm(getProjectDir(workspaceId, id), { recursive: true, force: true })
      const projectIds = await readProjectIndex(workspaceId)
      await writeProjectIndex(
        workspaceId,
        projectIds.filter((projectId) => projectId !== id),
      )
      return c.json({ ok: true, result: { deleted: true, id } })
    }

    if (method === 'remotion.projects.code') {
      const id = stringParam(params, 'id')
      if (!id) {
        const error = rpcError('invalid_params', 'id is required')
        return c.json(error.body, error.status)
      }
      const metadata = await readProjectMetadata(workspaceId, id)
      if (!metadata) {
        const error = rpcError(
          'project_not_found',
          'Project was not found',
          404,
        )
        return c.json(error.body, error.status)
      }
      const compositionPath = getCompositionPath(workspaceId, id)
      const code = await readFile(compositionPath, 'utf-8').catch(() => '')
      return c.json({ ok: true, result: { id, path: compositionPath, code } })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Remotion does not expose ${method}.`,
        },
      },
      404,
    )
  } catch (error) {
    console.error('Remotion RPC failed:', error)
    return c.json(
      {
        ok: false,
        error: {
          code: 'remotion_rpc_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Remotion could not complete the request.',
        },
      },
      500,
    )
  }
})
