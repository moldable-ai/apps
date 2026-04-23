import {
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import {
  PROJECT_COLORS,
  type Project,
  type TimeEntry,
  type TimerState,
  formatHoursDecimal,
} from '@/lib/types'
import { format } from 'date-fns'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const defaultTimer: TimerState = {
  isRunning: false,
  projectId: null,
  description: '',
  startTime: null,
  lastProjectId: null,
}

type RpcRequest = {
  method?: unknown
  params?: unknown
}

type RpcParams = Record<string, unknown>
type RpcStatus = 400 | 404 | 500

export const app = new Hono()

app.use('/api/*', cors())

function getProjectsPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'projects.json')
}

function getEntriesPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'entries.json')
}

function getTimerPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'timer.json')
}

async function readTimer(workspaceId?: string) {
  const timer = await readJson<TimerState>(
    getTimerPath(workspaceId),
    defaultTimer,
  )

  return { ...defaultTimer, ...timer }
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

function booleanParam(params: RpcParams, key: string): boolean | undefined {
  const value = params[key]
  return typeof value === 'boolean' ? value : undefined
}

function numberParam(params: RpcParams, key: string): number | undefined {
  const value = params[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function limited<T>(items: T[], params: RpcParams, fallback = 100): T[] {
  const limit = Math.max(
    1,
    Math.min(numberParam(params, 'limit') ?? fallback, 500),
  )
  return items.slice(0, limit)
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

async function readProjects(workspaceId?: string): Promise<Project[]> {
  return readJson<Project[]>(getProjectsPath(workspaceId), [])
}

async function writeProjects(
  projects: Project[],
  workspaceId?: string,
): Promise<void> {
  await writeJson(getProjectsPath(workspaceId), projects)
}

async function readEntries(workspaceId?: string): Promise<TimeEntry[]> {
  return readJson<TimeEntry[]>(getEntriesPath(workspaceId), [])
}

async function writeEntries(
  entries: TimeEntry[],
  workspaceId?: string,
): Promise<void> {
  await writeJson(getEntriesPath(workspaceId), entries)
}

function filterEntries(entries: TimeEntry[], params: RpcParams): TimeEntry[] {
  const startDate = stringParam(params, 'startDate')
  const endDate = stringParam(params, 'endDate')
  const projectId = stringParam(params, 'projectId')
  const query = stringParam(params, 'query')?.toLowerCase()
  let result = [...entries]

  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`)
    result = result.filter((entry) => new Date(entry.startTime) >= start)
  }
  if (endDate) {
    const end = new Date(`${endDate}T23:59:59.999`)
    result = result.filter((entry) => new Date(entry.startTime) <= end)
  }
  if (projectId) {
    result = result.filter((entry) => entry.projectId === projectId)
  }
  if (query) {
    result = result.filter((entry) =>
      entry.description.toLowerCase().includes(query),
    )
  }

  result.sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  )
  return limited(result, params)
}

function summarizeTime(
  entries: TimeEntry[],
  projects: Project[],
  params: RpcParams,
) {
  const filteredEntries = filterEntries(entries, {
    ...params,
    limit: 500,
  })
  const projectMap = new Map(projects.map((project) => [project.id, project]))
  const byProject = new Map<
    string,
    { project: Project | null; seconds: number }
  >()
  let totalSeconds = 0

  for (const entry of filteredEntries) {
    const seconds = entry.duration ?? 0
    totalSeconds += seconds
    const existing = byProject.get(entry.projectId) ?? {
      project: projectMap.get(entry.projectId) ?? null,
      seconds: 0,
    }
    existing.seconds += seconds
    byProject.set(entry.projectId, existing)
  }

  return {
    totalSeconds,
    totalHours: Number(formatHoursDecimal(totalSeconds)),
    entries: filteredEntries.length,
    byProject: Array.from(byProject.entries()).map(([projectId, value]) => ({
      projectId,
      projectName: value.project?.name ?? 'Unknown',
      seconds: value.seconds,
      hours: Number(formatHoursDecimal(value.seconds)),
    })),
  }
}

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null

  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'time-tracker',
      port,
      status: 'ok',
      ts: Date.now(),
    },
    200,
    {
      ...corsHeaders,
      'Cache-Control': 'no-store',
    },
  )
})

app.options('/api/moldable/health', (c) =>
  c.body(null, 204, {
    ...corsHeaders,
    'Cache-Control': 'no-store',
  }),
)

app.get('/api/projects', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const projects = await readJson<Project[]>(getProjectsPath(workspaceId), [])
  return c.json(projects)
})

app.post('/api/projects', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const body = await c.req.json<{ name?: unknown; color?: unknown }>()
  const name = typeof body.name === 'string' ? body.name : ''
  const color = typeof body.color === 'string' ? body.color : undefined

  if (!name) {
    return c.json({ error: 'Name is required' }, 400)
  }

  const projects = await readJson<Project[]>(getProjectsPath(workspaceId), [])
  const usedColors = new Set(projects.map((project) => project.color))
  const availableColor =
    color ??
    PROJECT_COLORS.find((projectColor) => !usedColors.has(projectColor)) ??
    PROJECT_COLORS[projects.length % PROJECT_COLORS.length]

  const newProject: Project = {
    id: crypto.randomUUID(),
    name,
    color: availableColor,
    createdAt: new Date().toISOString(),
  }

  projects.push(newProject)
  await writeJson(getProjectsPath(workspaceId), projects)

  return c.json(newProject)
})

app.patch('/api/projects/:id', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const id = c.req.param('id')
  const body = await c.req.json<Partial<Project>>()

  const projects = await readJson<Project[]>(getProjectsPath(workspaceId), [])
  const index = projects.findIndex((project) => project.id === id)

  if (index === -1) {
    return c.json({ error: 'Project not found' }, 404)
  }

  projects[index] = { ...projects[index], ...body }
  await writeJson(getProjectsPath(workspaceId), projects)

  return c.json(projects[index])
})

app.delete('/api/projects/:id', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const id = c.req.param('id')

  const projects = await readJson<Project[]>(getProjectsPath(workspaceId), [])
  const filtered = projects.filter((project) => project.id !== id)

  if (filtered.length === projects.length) {
    return c.json({ error: 'Project not found' }, 404)
  }

  await writeJson(getProjectsPath(workspaceId), filtered)

  const entries = await readJson<TimeEntry[]>(getEntriesPath(workspaceId), [])
  const filteredEntries = entries.filter((entry) => entry.projectId !== id)
  await writeJson(getEntriesPath(workspaceId), filteredEntries)

  return c.json({ success: true })
})

app.get('/api/entries', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const startDate = c.req.query('startDate')
  const endDate = c.req.query('endDate')
  const projectId = c.req.query('projectId')

  let entries = await readJson<TimeEntry[]>(getEntriesPath(workspaceId), [])

  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`)
    entries = entries.filter((entry) => new Date(entry.startTime) >= start)
  }

  if (endDate) {
    const end = new Date(`${endDate}T23:59:59.999`)
    entries = entries.filter((entry) => new Date(entry.startTime) <= end)
  }

  if (projectId) {
    entries = entries.filter((entry) => entry.projectId === projectId)
  }

  entries.sort(
    (entryA, entryB) =>
      new Date(entryB.startTime).getTime() -
      new Date(entryA.startTime).getTime(),
  )

  return c.json(entries)
})

app.post('/api/entries', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const body = await c.req.json<Partial<TimeEntry>>()
  const { projectId, description, startTime, endTime, duration } = body

  if (!projectId || !startTime) {
    return c.json({ error: 'Project and start time are required' }, 400)
  }

  const entries = await readJson<TimeEntry[]>(getEntriesPath(workspaceId), [])
  const newEntry: TimeEntry = {
    id: crypto.randomUUID(),
    projectId,
    description: description ?? '',
    startTime,
    endTime,
    duration,
  }

  entries.push(newEntry)
  await writeJson(getEntriesPath(workspaceId), entries)

  return c.json(newEntry)
})

app.patch('/api/entries/:id', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const id = c.req.param('id')
  const body = await c.req.json<Partial<TimeEntry>>()

  const entries = await readJson<TimeEntry[]>(getEntriesPath(workspaceId), [])
  const index = entries.findIndex((entry) => entry.id === id)

  if (index === -1) {
    return c.json({ error: 'Entry not found' }, 404)
  }

  entries[index] = { ...entries[index], ...body }

  if (entries[index].endTime) {
    const start = new Date(entries[index].startTime).getTime()
    const end = new Date(entries[index].endTime).getTime()
    entries[index].duration = Math.floor((end - start) / 1000)
  }

  await writeJson(getEntriesPath(workspaceId), entries)

  return c.json(entries[index])
})

app.delete('/api/entries/:id', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const id = c.req.param('id')

  const entries = await readJson<TimeEntry[]>(getEntriesPath(workspaceId), [])
  const filtered = entries.filter((entry) => entry.id !== id)

  if (filtered.length === entries.length) {
    return c.json({ error: 'Entry not found' }, 404)
  }

  await writeJson(getEntriesPath(workspaceId), filtered)

  return c.json({ success: true })
})

app.get('/api/timer', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const timer = await readTimer(workspaceId)
  return c.json(timer)
})

app.post('/api/timer', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const body = await c.req.json<{
    projectId?: unknown
    description?: unknown
  }>()
  const projectId = typeof body.projectId === 'string' ? body.projectId : ''
  const description =
    typeof body.description === 'string' ? body.description : ''

  if (!projectId) {
    return c.json({ error: 'Project ID is required' }, 400)
  }

  const timer: TimerState = {
    isRunning: true,
    projectId,
    description,
    startTime: new Date().toISOString(),
    lastProjectId: projectId,
  }

  await writeJson(getTimerPath(workspaceId), timer)

  return c.json(timer)
})

app.delete('/api/timer', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const timer = await readTimer(workspaceId)

  if (!timer.isRunning || !timer.startTime || !timer.projectId) {
    return c.json({ error: 'No timer running' }, 400)
  }

  const endTime = new Date().toISOString()
  const startMs = new Date(timer.startTime).getTime()
  const endMs = new Date(endTime).getTime()
  const duration = Math.floor((endMs - startMs) / 1000)
  const entry: TimeEntry = {
    id: crypto.randomUUID(),
    projectId: timer.projectId,
    description: timer.description,
    startTime: timer.startTime,
    endTime,
    duration,
  }

  const entries = await readJson<TimeEntry[]>(getEntriesPath(workspaceId), [])
  entries.push(entry)
  await writeJson(getEntriesPath(workspaceId), entries)

  const resetTimer: TimerState = {
    ...defaultTimer,
    lastProjectId: timer.projectId,
  }
  await writeJson(getTimerPath(workspaceId), resetTimer)

  return c.json({ entry, timer: resetTimer })
})

app.patch('/api/timer', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const body = await c.req.json<Partial<TimerState>>()
  const timer = await readTimer(workspaceId)

  if (body.description !== undefined) {
    timer.description = body.description
  }

  if (body.projectId !== undefined) {
    timer.projectId = body.projectId
  }

  if (body.lastProjectId !== undefined) {
    timer.lastProjectId = body.lastProjectId
  }

  await writeJson(getTimerPath(workspaceId), timer)

  return c.json(timer)
})

app.get('/api/export', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const startDate = c.req.query('startDate')
  const endDate = c.req.query('endDate')
  const exportFormat = c.req.query('format') ?? 'csv'
  const projectId = c.req.query('projectId')

  if (!startDate || !endDate) {
    return c.json({ error: 'Start and end date are required' }, 400)
  }

  const entries = await readJson<TimeEntry[]>(getEntriesPath(workspaceId), [])
  const projects = await readJson<Project[]>(getProjectsPath(workspaceId), [])
  const projectMap = new Map(projects.map((project) => [project.id, project]))
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T23:59:59.999`)

  let filteredEntries = entries.filter((entry) => {
    const entryDate = new Date(entry.startTime)
    return entryDate >= start && entryDate <= end && entry.endTime
  })

  if (projectId) {
    filteredEntries = filteredEntries.filter(
      (entry) => entry.projectId === projectId,
    )
  }

  filteredEntries.sort(
    (entryA, entryB) =>
      new Date(entryA.startTime).getTime() -
      new Date(entryB.startTime).getTime(),
  )

  if (exportFormat === 'json') {
    const jsonData = filteredEntries.map((entry) => {
      const project = projectMap.get(entry.projectId)
      return {
        date: format(new Date(entry.startTime), 'yyyy-MM-dd'),
        project: project?.name || 'Unknown',
        description: entry.description,
        startTime: format(new Date(entry.startTime), 'HH:mm'),
        endTime: entry.endTime ? format(new Date(entry.endTime), 'HH:mm') : '',
        hours: formatHoursDecimal(entry.duration || 0),
        durationSeconds: entry.duration || 0,
      }
    })

    return c.json(jsonData, 200, {
      'Content-Disposition': `attachment; filename="time-entries-${startDate}-${endDate}.json"`,
    })
  }

  const csvHeaders = [
    'Date',
    'Project',
    'Description',
    'Start Time',
    'End Time',
    'Hours',
  ]
  const csvRows = filteredEntries.map((entry) => {
    const project = projectMap.get(entry.projectId)
    return [
      format(new Date(entry.startTime), 'yyyy-MM-dd'),
      `"${(project?.name || 'Unknown').replace(/"/g, '""')}"`,
      `"${entry.description.replace(/"/g, '""')}"`,
      format(new Date(entry.startTime), 'HH:mm'),
      entry.endTime ? format(new Date(entry.endTime), 'HH:mm') : '',
      formatHoursDecimal(entry.duration || 0),
    ].join(',')
  })

  const totalSeconds = filteredEntries.reduce(
    (sum, entry) => sum + (entry.duration || 0),
    0,
  )
  csvRows.push('')
  csvRows.push(`Total,,,,,"${formatHoursDecimal(totalSeconds)}"`)

  const csv = [csvHeaders.join(','), ...csvRows].join('\n')

  return c.text(csv, 200, {
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="time-entries-${startDate}-${endDate}.csv"`,
  })
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

    if (method === 'time.projects.list') {
      const projects = await readProjects(workspaceId)
      const includeArchived = booleanParam(params, 'includeArchived') ?? false
      const query = stringParam(params, 'query')?.toLowerCase()
      const filtered = projects.filter((project) => {
        if (!includeArchived && project.archived) return false
        return query ? project.name.toLowerCase().includes(query) : true
      })
      return c.json({ ok: true, result: limited(filtered, params) })
    }

    if (method === 'time.projects.create') {
      const name = stringParam(params, 'name')?.trim()
      if (!name) {
        const error = rpcError('invalid_params', 'name is required')
        return c.json(error.body, error.status)
      }

      const projects = await readProjects(workspaceId)
      const color = stringParam(params, 'color')
      const usedColors = new Set(projects.map((project) => project.color))
      const project: Project = {
        id: crypto.randomUUID(),
        name,
        color:
          color ??
          PROJECT_COLORS.find(
            (projectColor) => !usedColors.has(projectColor),
          ) ??
          PROJECT_COLORS[projects.length % PROJECT_COLORS.length]!,
        createdAt: new Date().toISOString(),
      }
      await writeProjects([...projects, project], workspaceId)
      return c.json({ ok: true, result: project })
    }

    if (method === 'time.projects.update') {
      const id = stringParam(params, 'id')
      const projects = await readProjects(workspaceId)
      const index = projects.findIndex((project) => project.id === id)
      if (!id || index === -1) {
        const error = rpcError(
          'project_not_found',
          'Project was not found',
          404,
        )
        return c.json(error.body, error.status)
      }

      projects[index] = {
        ...projects[index]!,
        ...(stringParam(params, 'name') !== undefined
          ? { name: stringParam(params, 'name')! }
          : {}),
        ...(stringParam(params, 'color') !== undefined
          ? { color: stringParam(params, 'color')! }
          : {}),
        ...(booleanParam(params, 'archived') !== undefined
          ? { archived: booleanParam(params, 'archived') }
          : {}),
      }
      await writeProjects(projects, workspaceId)
      return c.json({ ok: true, result: projects[index] })
    }

    if (method === 'time.entries.list') {
      const entries = await readEntries(workspaceId)
      return c.json({ ok: true, result: filterEntries(entries, params) })
    }

    if (method === 'time.entries.create') {
      const projectId = stringParam(params, 'projectId')
      const startTime = stringParam(params, 'startTime')
      if (!projectId || !startTime) {
        const error = rpcError(
          'invalid_params',
          'projectId and startTime are required',
        )
        return c.json(error.body, error.status)
      }

      const endTime = stringParam(params, 'endTime')
      const entry: TimeEntry = {
        id: crypto.randomUUID(),
        projectId,
        description: stringParam(params, 'description') ?? '',
        startTime,
        endTime,
        duration: numberParam(params, 'duration'),
      }

      if (!entry.duration && entry.endTime) {
        entry.duration = Math.floor(
          (new Date(entry.endTime).getTime() -
            new Date(entry.startTime).getTime()) /
            1000,
        )
      }

      const entries = await readEntries(workspaceId)
      await writeEntries([...entries, entry], workspaceId)
      return c.json({ ok: true, result: entry })
    }

    if (method === 'time.entries.update') {
      const id = stringParam(params, 'id')
      const entries = await readEntries(workspaceId)
      const index = entries.findIndex((entry) => entry.id === id)
      if (!id || index === -1) {
        const error = rpcError('entry_not_found', 'Entry was not found', 404)
        return c.json(error.body, error.status)
      }

      entries[index] = {
        ...entries[index]!,
        ...(stringParam(params, 'projectId') !== undefined
          ? { projectId: stringParam(params, 'projectId')! }
          : {}),
        ...(stringParam(params, 'description') !== undefined
          ? { description: stringParam(params, 'description')! }
          : {}),
        ...(stringParam(params, 'startTime') !== undefined
          ? { startTime: stringParam(params, 'startTime')! }
          : {}),
        ...(stringParam(params, 'endTime') !== undefined
          ? { endTime: stringParam(params, 'endTime')! }
          : {}),
        ...(numberParam(params, 'duration') !== undefined
          ? { duration: numberParam(params, 'duration') }
          : {}),
      }

      if (entries[index]!.endTime) {
        const start = new Date(entries[index]!.startTime).getTime()
        const end = new Date(entries[index]!.endTime!).getTime()
        entries[index]!.duration = Math.floor((end - start) / 1000)
      }

      await writeEntries(entries, workspaceId)
      return c.json({ ok: true, result: entries[index] })
    }

    if (method === 'time.entries.delete') {
      const id = stringParam(params, 'id')
      const entries = await readEntries(workspaceId)
      const filtered = entries.filter((entry) => entry.id !== id)
      if (!id || filtered.length === entries.length) {
        const error = rpcError('entry_not_found', 'Entry was not found', 404)
        return c.json(error.body, error.status)
      }
      await writeEntries(filtered, workspaceId)
      return c.json({ ok: true, result: { deleted: true, id } })
    }

    if (method === 'time.timer.get') {
      return c.json({ ok: true, result: await readTimer(workspaceId) })
    }

    if (method === 'time.timer.start') {
      const projectId = stringParam(params, 'projectId')
      if (!projectId) {
        const error = rpcError('invalid_params', 'projectId is required')
        return c.json(error.body, error.status)
      }

      const timer: TimerState = {
        isRunning: true,
        projectId,
        description: stringParam(params, 'description') ?? '',
        startTime: new Date().toISOString(),
        lastProjectId: projectId,
      }
      await writeJson(getTimerPath(workspaceId), timer)
      return c.json({ ok: true, result: timer })
    }

    if (method === 'time.timer.update') {
      const timer = await readTimer(workspaceId)
      const updated: TimerState = {
        ...timer,
        ...(stringParam(params, 'projectId') !== undefined
          ? { projectId: stringParam(params, 'projectId')! }
          : {}),
        ...(stringParam(params, 'description') !== undefined
          ? { description: stringParam(params, 'description')! }
          : {}),
      }
      await writeJson(getTimerPath(workspaceId), updated)
      return c.json({ ok: true, result: updated })
    }

    if (method === 'time.timer.stop') {
      const timer = await readTimer(workspaceId)
      if (!timer.isRunning || !timer.startTime || !timer.projectId) {
        const error = rpcError('timer_not_running', 'No timer is running', 400)
        return c.json(error.body, error.status)
      }

      const endTime = new Date().toISOString()
      const duration = Math.floor(
        (new Date(endTime).getTime() - new Date(timer.startTime).getTime()) /
          1000,
      )
      const entry: TimeEntry = {
        id: crypto.randomUUID(),
        projectId: timer.projectId,
        description: timer.description,
        startTime: timer.startTime,
        endTime,
        duration,
      }
      const entries = await readEntries(workspaceId)
      await writeEntries([...entries, entry], workspaceId)
      const resetTimer: TimerState = {
        ...defaultTimer,
        lastProjectId: timer.projectId,
      }
      await writeJson(getTimerPath(workspaceId), resetTimer)
      return c.json({ ok: true, result: { entry, timer: resetTimer } })
    }

    if (method === 'time.summary') {
      const [entries, projects] = await Promise.all([
        readEntries(workspaceId),
        readProjects(workspaceId),
      ])
      return c.json({
        ok: true,
        result: summarizeTime(entries, projects, params),
      })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Time Tracker does not expose ${method}.`,
        },
      },
      404,
    )
  } catch (error) {
    console.error('Time Tracker RPC failed:', error)
    return c.json(
      {
        ok: false,
        error: {
          code: 'time_tracker_rpc_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Time Tracker could not complete the request.',
        },
      },
      500,
    )
  }
})
