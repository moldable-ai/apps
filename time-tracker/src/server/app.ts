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
