import { readJson, safePath, writeJson } from '@moldable-ai/storage'
import { getDataDir, jsonError } from './moldable'
import {
  PROJECT_KEY_LENGTH,
  makeProjectKey,
  normalizeProjectKey,
  taskKey,
} from '@/shared/task-utils'
import type {
  Project,
  Task,
  TaskAttachment,
  TaskComment,
  TaskLabel,
  TaskStatus,
  TasksData,
} from '@/shared/types'
import { TASK_STATUSES } from '@/shared/types'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'

const DEFAULT_LABEL_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
]

export const app = new Hono()

app.use('/api/moldable/today', async (c, next) => {
  if (c.req.method !== 'GET') {
    await next()
    return
  }

  await next()

  const response = c.res
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return

  const data = (await response
    .clone()
    .json()
    .catch(() => null)) as unknown
  if (!isMoldableTodayResponse(data)) return

  const dismissals = await readMoldableTodayDismissals(c.req.raw)
  const items = filterMoldableTodayDismissedItems(data.items, dismissals)
  if (items.length === data.items.length) return

  const headers = new Headers(response.headers)
  headers.delete('content-length')
  c.res = new Response(JSON.stringify({ ...data, items }), {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
})
app.use('/api/*', cors())

const labelSchema = z.object({
  id: z.string().trim().min(1).max(80).optional(),
  name: z.string().trim().min(1).max(40),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#6366f1'),
})

const attachmentSchema = z
  .object({
    id: z.string().trim().min(1).max(120).optional(),
    name: z.string().trim().min(1).max(240),
    size: z
      .number()
      .int()
      .min(0)
      .max(10 * 1024 * 1024),
    type: z.string().trim().max(120).default('application/octet-stream'),
    dataUrl: z
      .string()
      .max(14 * 1024 * 1024)
      .regex(/^data:[^;]+;base64,/)
      .optional(),
    path: z.string().trim().max(1000).optional(),
    createdAt: z.string().datetime().optional(),
  })
  .refine((attachment) => attachment.path || attachment.dataUrl, {
    message: 'Attachment must include a saved path or file data',
  })

const projectKeySchema = z
  .string()
  .trim()
  .transform((value) => normalizeProjectKey(value))
  .refine((value) => value.length === PROJECT_KEY_LENGTH, {
    message: `Project key must be exactly ${PROJECT_KEY_LENGTH} letters`,
  })

const projectInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  key: z.union([projectKeySchema, z.literal('')]).optional(),
  summary: z.string().trim().max(180).default(''),
  description: z.string().max(20000).default(''),
  logoUrl: z
    .string()
    .trim()
    .max(14 * 1024 * 1024)
    .regex(/^data:image\/(png|jpeg|jpg|webp);base64,|^https?:\/\//)
    .nullable()
    .default(null),
  websiteUrl: z.string().trim().max(240).default(''),
  labels: z.array(labelSchema).max(20).default([]),
})

const taskInputSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().max(20000).default(''),
  acceptanceCriteria: z.string().max(12000).default(''),
  attachments: z.array(attachmentSchema).max(10).default([]),
  status: z.enum(TASK_STATUSES).default('open'),
  labels: z.array(labelSchema).max(10).default([]),
  priority: z.enum(['none', 'low', 'medium', 'high']).default('none'),
})

const taskPatchSchema = z.object({
  title: z.string().trim().min(1).max(180).optional(),
  description: z.string().max(20000).optional(),
  acceptanceCriteria: z.string().max(12000).optional(),
  attachments: z.array(attachmentSchema).max(10).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  labels: z.array(labelSchema).max(10).optional(),
  priority: z.enum(['none', 'low', 'medium', 'high']).optional(),
  completed: z.boolean().optional(),
})

const commentInputSchema = z.object({
  content: z.string().trim().min(1).max(12000),
  authorName: z.string().trim().min(1).max(80).optional(),
})

const rpcRequestSchema = z.object({
  method: z.string().trim().min(1),
  params: z.unknown().optional(),
})

const projectSelectorSchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  projectKey: z.string().trim().min(1).optional(),
  projectName: z.string().trim().min(1).optional(),
})

const taskSelectorSchema = z.object({
  taskId: z.string().trim().min(1).optional(),
  taskKey: z.string().trim().min(1).optional(),
  projectId: z.string().trim().min(1).optional(),
  projectKey: z.string().trim().min(1).optional(),
  number: z.number().int().positive().optional(),
})

const projectsListParamsSchema = z
  .object({
    query: z.string().trim().optional(),
    includeTasks: z.boolean().default(false),
    limit: z.number().int().min(1).max(200).default(100),
  })
  .optional()

const projectPatchSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  key: z.union([projectKeySchema, z.literal('')]).optional(),
  summary: z.string().trim().max(180).optional(),
  description: z.string().max(20000).optional(),
  logoUrl: z
    .string()
    .trim()
    .max(14 * 1024 * 1024)
    .regex(/^data:image\/(png|jpeg|jpg|webp);base64,|^https?:\/\//)
    .nullable()
    .optional(),
  websiteUrl: z.string().trim().max(240).optional(),
  labels: z.array(labelSchema).max(20).optional(),
})

const projectCreateRpcSchema = projectInputSchema

const projectUpdateRpcSchema = projectSelectorSchema.and(projectPatchSchema)

const projectDeleteRpcSchema = projectSelectorSchema

const labelSelectorSchema = projectSelectorSchema.extend({
  labelId: z.string().trim().min(1).optional(),
  labelName: z.string().trim().min(1).optional(),
})

const labelCreateRpcSchema = projectSelectorSchema.and(labelSchema)

const labelUpdateRpcSchema = labelSelectorSchema.and(labelSchema.partial())

const labelDeleteRpcSchema = labelSelectorSchema

const taskLabelsRpcSchema = z.object({
  labels: z.array(labelSchema).max(10).optional(),
  labelIds: z.array(z.string().trim().min(1)).max(10).optional(),
  labelNames: z.array(z.string().trim().min(1)).max(10).optional(),
})

const tasksListParamsSchema = projectSelectorSchema
  .extend({
    query: z.string().trim().optional(),
    status: z.enum(TASK_STATUSES).optional(),
    priority: z.enum(['none', 'low', 'medium', 'high']).optional(),
    labelId: z.string().trim().min(1).optional(),
    labelName: z.string().trim().min(1).optional(),
    includeCompleted: z.boolean().default(true),
    limit: z.number().int().min(1).max(500).default(100),
  })
  .optional()

const taskCreateRpcSchema = projectSelectorSchema
  .and(
    taskInputSchema
      .omit({ labels: true })
      .partial({ status: true, priority: true }),
  )
  .and(z.object({ title: z.string().trim().min(1).max(180) }))
  .and(taskLabelsRpcSchema)

const taskUpdateRpcSchema = taskSelectorSchema
  .and(taskPatchSchema.omit({ labels: true }).partial())
  .and(taskLabelsRpcSchema)

const taskDeleteRpcSchema = taskSelectorSchema

const commentsListParamsSchema = taskSelectorSchema

const commentCreateRpcSchema = taskSelectorSchema.and(commentInputSchema)

const commentUpdateRpcSchema = taskSelectorSchema.and(
  z.object({
    commentId: z.string().trim().min(1),
    content: z.string().trim().min(1).max(12000),
  }),
)

const commentDeleteRpcSchema = taskSelectorSchema.extend({
  commentId: z.string().trim().min(1),
})

const attachmentsListParamsSchema = taskSelectorSchema

const viewModeSchema = z.enum(['list', 'kanban'])

const settingsSchema = z.object({
  viewMode: viewModeSchema,
})

const settingsInputSchema = z.object({
  viewMode: viewModeSchema,
})

type TasksSettings = z.infer<typeof settingsSchema>

const DEFAULT_SETTINGS: TasksSettings = {
  viewMode: 'list',
}

function dataPath(dataDir: string) {
  return safePath(dataDir, 'tasks-data.json')
}

function settingsPath(dataDir: string) {
  return safePath(dataDir, 'tasks-settings.json')
}

function nowIso() {
  return new Date().toISOString()
}

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

function sanitizeFilename(filename: string) {
  const safe = Array.from(filename)
    .map((char) =>
      char.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(char) ? '-' : char,
    )
    .join('')
    .replace(/^\.+$/, 'file')
    .trim()

  return safe || 'attachment'
}

function isPathInside(parent: string, child: string) {
  const relative = path.relative(parent, child)
  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  )
}

function normalizeLabels(labels: z.infer<typeof labelSchema>[]): TaskLabel[] {
  return labels.map((label, index) => ({
    id: label.id?.trim() || newId('label'),
    name: label.name.trim(),
    color:
      label.color || DEFAULT_LABEL_COLORS[index % DEFAULT_LABEL_COLORS.length],
  }))
}

async function persistAttachment(
  c: Parameters<typeof getDataDir>[0],
  attachment: z.infer<typeof attachmentSchema>,
): Promise<TaskAttachment> {
  const id = attachment.id?.trim() || newId('attachment')
  const name = attachment.name.trim()
  const type = attachment.type || 'application/octet-stream'
  const createdAt = attachment.createdAt ?? nowIso()

  if (attachment.path) {
    const dataDir = path.resolve(getDataDir(c))
    const attachmentPath = path.resolve(attachment.path)
    if (!isPathInside(dataDir, attachmentPath)) {
      throw new Error('Attachment path must be inside the app data directory')
    }
    return {
      id,
      name,
      size: attachment.size,
      type,
      path: attachmentPath,
      createdAt,
    }
  }

  const match = attachment.dataUrl?.match(/^data:([^;]+);base64,(.*)$/)
  if (!match) throw new Error('Invalid attachment data')

  const dataDir = getDataDir(c)
  const attachmentDir = safePath(dataDir, 'attachments')
  await mkdir(attachmentDir, { recursive: true })

  const filePath = safePath(attachmentDir, `${id}-${sanitizeFilename(name)}`)
  await writeFile(filePath, Buffer.from(match[2] ?? '', 'base64'))

  return {
    id,
    name,
    size: attachment.size,
    type,
    path: filePath,
    createdAt,
  }
}

async function normalizeAttachments(
  c: Parameters<typeof getDataDir>[0],
  attachments: z.infer<typeof attachmentSchema>[],
): Promise<TaskAttachment[]> {
  return Promise.all(
    attachments.map((attachment) => persistAttachment(c, attachment)),
  )
}

function normalizeCommentAuthor(authorName?: string) {
  const name = authorName?.trim() || 'You'
  return {
    authorName: name,
    authorInitial: name.charAt(0).toUpperCase() || 'Y',
  }
}

function makeComment(input: z.infer<typeof commentInputSchema>): TaskComment {
  const createdAt = nowIso()
  const author = normalizeCommentAuthor(input.authorName)
  return {
    id: newId('comment'),
    content: input.content,
    ...author,
    createdAt,
    updatedAt: createdAt,
  }
}

async function readData(
  c: Parameters<typeof getDataDir>[0],
): Promise<TasksData> {
  const data = await readJson<TasksData>(dataPath(getDataDir(c)), {
    projects: [],
    tasks: [],
  })
  const projects = Array.isArray(data.projects)
    ? data.projects.map((project) => ({
        ...project,
        key: normalizeProjectKey(project.key) || makeProjectKey(project.name),
        logoUrl: project.logoUrl ?? null,
        websiteUrl: project.websiteUrl ?? '',
      }))
    : []
  const tasks = Array.isArray(data.tasks)
    ? await Promise.all(
        data.tasks.map(async (task) => ({
          ...task,
          acceptanceCriteria: task.acceptanceCriteria ?? '',
          attachments: await normalizeAttachments(c, task.attachments ?? []),
          comments: task.comments ?? [],
        })),
      )
    : []

  return { projects, tasks }
}

async function writeData(c: Parameters<typeof getDataDir>[0], data: TasksData) {
  await writeJson(dataPath(getDataDir(c)), data)
}

async function readSettings(
  c: Parameters<typeof getDataDir>[0],
): Promise<TasksSettings> {
  const data = await readJson<unknown>(
    settingsPath(getDataDir(c)),
    DEFAULT_SETTINGS,
  )
  const parsed = settingsSchema.safeParse(data)
  return parsed.success ? parsed.data : DEFAULT_SETTINGS
}

async function writeSettings(
  c: Parameters<typeof getDataDir>[0],
  settings: TasksSettings,
) {
  await writeJson(settingsPath(getDataDir(c)), settings)
}

function uniqueProjectKey(
  data: TasksData,
  desiredKey: string,
  projectId?: string,
) {
  const base = normalizeProjectKey(desiredKey || 'TSK') || 'TSK'
  let key = base
  let suffix = 0
  while (
    data.projects.some(
      (project) =>
        project.id !== projectId && project.key.toUpperCase() === key,
    )
  ) {
    const letter = String.fromCharCode(65 + (suffix % 26))
    const secondLetter = String.fromCharCode(
      65 + (Math.floor(suffix / 26) % 26),
    )
    key =
      suffix < 26
        ? `${base.slice(0, PROJECT_KEY_LENGTH - 1)}${letter}`
        : `${base.slice(0, PROJECT_KEY_LENGTH - 2)}${secondLetter}${letter}`
    suffix += 1
  }
  return key
}

function projectSummary(data: TasksData) {
  return data.projects.map((project) => ({
    ...project,
    tasks: data.tasks.filter((task) => task.projectId === project.id),
  }))
}

function projectTaskCounts(data: TasksData, projectId: string) {
  const tasks = data.tasks.filter((task) => task.projectId === projectId)
  return {
    total: tasks.length,
    backlog: tasks.filter((task) => task.status === 'backlog').length,
    open: tasks.filter((task) => task.status === 'open').length,
    inProgress: tasks.filter((task) => task.status === 'in_progress').length,
    completed: tasks.filter((task) => task.status === 'completed').length,
    closed: tasks.filter((task) => task.status === 'closed').length,
  }
}

function enrichProject(
  data: TasksData,
  project: Project,
  includeTasks = false,
) {
  const tasks = data.tasks.filter((task) => task.projectId === project.id)
  return {
    ...project,
    taskCounts: projectTaskCounts(data, project.id),
    ...(includeTasks
      ? {
          tasks: tasks.map((task) => enrichTask(data, task)),
        }
      : {}),
  }
}

function enrichTask(data: TasksData, task: Task) {
  const project = data.projects.find((item) => item.id === task.projectId)
  return {
    ...task,
    key: project ? taskKey(project, task) : String(task.number),
    project: project
      ? {
          id: project.id,
          name: project.name,
          key: project.key,
        }
      : null,
  }
}

function findProject(
  data: TasksData,
  selector: z.infer<typeof projectSelectorSchema>,
) {
  const normalizedKey = selector.projectKey
    ? normalizeProjectKey(selector.projectKey)
    : ''
  const normalizedName = selector.projectName?.trim().toLowerCase()

  return data.projects.find((project) => {
    if (selector.projectId && project.id === selector.projectId) return true
    if (normalizedKey && project.key.toUpperCase() === normalizedKey)
      return true
    return Boolean(
      normalizedName && project.name.trim().toLowerCase() === normalizedName,
    )
  })
}

function requireProject(
  data: TasksData,
  selector: z.infer<typeof projectSelectorSchema>,
) {
  const project = findProject(data, selector)
  if (!project) throw new Error('project_not_found')
  return project
}

function hasProjectSelector(selector: z.infer<typeof projectSelectorSchema>) {
  return Boolean(
    selector.projectId || selector.projectKey || selector.projectName,
  )
}

function splitTaskKey(value: string) {
  const match = value.trim().match(/^([A-Za-z]+)-(\d+)$/)
  if (!match) return null
  return {
    projectKey: normalizeProjectKey(match[1] ?? ''),
    number: Number(match[2]),
  }
}

function findTask(
  data: TasksData,
  selector: z.infer<typeof taskSelectorSchema>,
) {
  if (selector.taskId) {
    const task = data.tasks.find((item) => item.id === selector.taskId)
    if (!task) return undefined
    const project = data.projects.find((item) => item.id === task.projectId)
    if (selector.projectId && task.projectId !== selector.projectId) {
      return undefined
    }
    const projectKey = selector.projectKey
      ? normalizeProjectKey(selector.projectKey)
      : ''
    if (projectKey && project?.key.toUpperCase() !== projectKey) {
      return undefined
    }
    return task
  }

  const taskKeyParts = selector.taskKey ? splitTaskKey(selector.taskKey) : null
  const projectKey =
    taskKeyParts?.projectKey ??
    (selector.projectKey ? normalizeProjectKey(selector.projectKey) : '')
  const number = taskKeyParts?.number ?? selector.number

  if (!number) return undefined

  const project = taskKeyParts?.projectKey
    ? data.projects.find((item) => item.key.toUpperCase() === projectKey)
    : selector.projectId
      ? data.projects.find((item) => item.id === selector.projectId)
      : data.projects.find((item) => item.key.toUpperCase() === projectKey)

  if (!project) return undefined
  if (selector.projectId && selector.projectId !== project.id) return undefined
  return data.tasks.find(
    (task) => task.projectId === project.id && task.number === number,
  )
}

function requireTask(
  data: TasksData,
  selector: z.infer<typeof taskSelectorSchema>,
) {
  const task = findTask(data, selector)
  if (!task) throw new Error('task_not_found')
  return task
}

function findProjectLabel(
  project: Project,
  selector: z.infer<typeof labelSelectorSchema>,
) {
  const normalizedName = selector.labelName?.trim().toLowerCase()
  return project.labels.find((label) => {
    if (selector.labelId && label.id === selector.labelId) return true
    return Boolean(
      normalizedName && label.name.trim().toLowerCase() === normalizedName,
    )
  })
}

function requireProjectLabel(
  project: Project,
  selector: z.infer<typeof labelSelectorSchema>,
) {
  const label = findProjectLabel(project, selector)
  if (!label) throw new Error('label_not_found')
  return label
}

function resolveTaskLabels(
  project: Project,
  input: z.infer<typeof taskLabelsRpcSchema>,
) {
  if (input.labels !== undefined) return normalizeLabels(input.labels)

  const ids = new Set(input.labelIds ?? [])
  const names = new Set(
    (input.labelNames ?? []).map((name) => name.trim().toLowerCase()),
  )

  if (ids.size === 0 && names.size === 0) return undefined

  const labels = project.labels.filter(
    (label) => ids.has(label.id) || names.has(label.name.trim().toLowerCase()),
  )
  if (labels.length !== ids.size + names.size)
    throw new Error('label_not_found')
  return labels
}

function rpcOk(result: unknown) {
  return { ok: true, result }
}

function rpcError(code: string, message: string) {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  }
}

app.get('/api/moldable/health', (c) => {
  return c.json({
    appId: process.env.MOLDABLE_APP_ID ?? 'tasks',
    status: 'ok',
  })
})

app.get('/api/moldable/today', async (c) => {
  const items: unknown[] = []
  let resume: unknown = null

  try {
    const data = await readData(c)
    const inProgress = data.tasks.filter(
      (task) => task.status === 'in_progress',
    )

    // THRESHOLD: too much in flight at once is a WIP bottleneck — open the board
    // to pick what to finish first.
    if (inProgress.length > 5) {
      items.push({
        id: 'tasks:wip',
        kind: 'threshold',
        surface: 'nudge',
        title: `${inProgress.length} tasks in progress`,
        subtitle: 'Too much in flight — pick what to finish first',
        icon: '🌊',
        priority: 70,
        actions: [{ type: 'open-app', label: 'Open Tasks' }],
      })
    }

    // RESUME: a task left in_progress since before today is where to pick back up.
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const stale = inProgress
      .filter(
        (task) => new Date(task.updatedAt).getTime() < startOfToday.getTime(),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

    const top = stale[0]
    if (top) {
      const project = data.projects.find((item) => item.id === top.projectId)
      resume = {
        title: top.title,
        subtitle: project
          ? `${taskKey(project, top)} · in progress`
          : 'In progress',
        icon: '⏳',
        deepLink: `#view=task&project=${encodeURIComponent(top.projectId)}&task=${encodeURIComponent(top.id)}`,
        lastTouchedAt: top.updatedAt,
      }
    }
  } catch {
    return c.json({
      items: [],
      resume: null,
      generatedAt: new Date().toISOString(),
    })
  }

  return c.json({ items, resume, generatedAt: new Date().toISOString() })
})

app.get('/api/moldable/commands', async (c) => {
  try {
    const data = await readData(c)
    return c.json({
      commands: [
        {
          id: 'open-projects',
          label: 'Projects',
          description: 'Open the projects directory',
          icon: 'folder',
          group: 'Projects',
          action: { type: 'message', command: 'open-projects' },
        },
        {
          id: 'new-task',
          label: 'Create Task',
          description: 'Add a task to the selected project',
          icon: 'plus',
          group: 'Tasks',
          action: { type: 'message', command: 'new-task' },
        },
        ...data.projects.map((project) => ({
          id: `open-project:${project.id}`,
          label: project.name,
          description: `${project.key} project`,
          icon: 'folder',
          group: 'Projects',
          action: {
            type: 'message',
            command: 'open-project',
            payload: { projectId: project.id },
          },
        })),
      ],
    })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to load commands',
    )
  }
})

app.post('/api/moldable/rpc', async (c) => {
  try {
    const body = rpcRequestSchema.parse(await c.req.json())
    const data = await readData(c)
    const method = body.method

    if (method === 'projects.list' || method === 'projects.search') {
      const params = projectsListParamsSchema.parse(body.params)
      const query = params?.query?.trim().toLowerCase()
      const projects = data.projects
        .filter((project) => {
          if (!query) return true
          return [
            project.name,
            project.key,
            project.summary,
            project.description,
            project.websiteUrl,
          ].some((value) => value.toLowerCase().includes(query))
        })
        .slice(0, params?.limit ?? 100)
        .map((project) => enrichProject(data, project, params?.includeTasks))

      return c.json(rpcOk(projects))
    }

    if (method === 'projects.get') {
      const params = projectSelectorSchema.parse(body.params)
      const project = requireProject(data, params)
      return c.json(rpcOk(enrichProject(data, project, true)))
    }

    if (method === 'projects.create') {
      const params = projectCreateRpcSchema.parse(body.params)
      const createdAt = nowIso()
      const project: Project = {
        id: newId('project'),
        name: params.name,
        key: uniqueProjectKey(data, params.key || makeProjectKey(params.name)),
        summary: params.summary,
        description: params.description,
        logoUrl: params.logoUrl,
        websiteUrl: params.websiteUrl,
        labels: normalizeLabels(params.labels),
        nextTaskNumber: 1,
        createdAt,
        updatedAt: createdAt,
      }

      data.projects.unshift(project)
      await writeData(c, data)
      return c.json(rpcOk(enrichProject(data, project, true)))
    }

    if (method === 'projects.update') {
      const params = projectUpdateRpcSchema.parse(body.params)
      const project = requireProject(data, params)

      if (params.name !== undefined) project.name = params.name
      if (params.key !== undefined) {
        const nextKey =
          params.key || makeProjectKey(params.name ?? project.name)
        project.key = uniqueProjectKey(data, nextKey, project.id)
      }
      if (params.summary !== undefined) project.summary = params.summary
      if (params.description !== undefined)
        project.description = params.description
      if (params.logoUrl !== undefined) project.logoUrl = params.logoUrl
      if (params.websiteUrl !== undefined)
        project.websiteUrl = params.websiteUrl
      if (params.labels !== undefined)
        project.labels = normalizeLabels(params.labels)
      project.updatedAt = nowIso()

      await writeData(c, data)
      return c.json(rpcOk(enrichProject(data, project, true)))
    }

    if (method === 'projects.delete') {
      const params = projectDeleteRpcSchema.parse(body.params)
      const project = requireProject(data, params)

      data.projects = data.projects.filter((item) => item.id !== project.id)
      data.tasks = data.tasks.filter((task) => task.projectId !== project.id)
      await writeData(c, data)
      return c.json(rpcOk({ ok: true, deletedProjectId: project.id }))
    }

    if (method === 'labels.list') {
      const params = projectSelectorSchema.parse(body.params)
      const project = requireProject(data, params)
      return c.json(rpcOk(project.labels))
    }

    if (method === 'labels.create') {
      const params = labelCreateRpcSchema.parse(body.params)
      const project = requireProject(data, params)
      const normalizedName = params.name.trim().toLowerCase()
      if (
        project.labels.some(
          (label) => label.name.trim().toLowerCase() === normalizedName,
        )
      ) {
        return c.json(
          rpcError('label_conflict', `Label "${params.name}" already exists.`),
          409,
        )
      }

      const label = normalizeLabels([params])[0]
      project.labels.push(label)
      project.updatedAt = nowIso()
      await writeData(c, data)
      return c.json(rpcOk(label))
    }

    if (method === 'labels.update') {
      const params = labelUpdateRpcSchema.parse(body.params)
      const project = requireProject(data, params)
      const label = requireProjectLabel(project, params)

      if (params.name !== undefined) label.name = params.name
      if (params.color !== undefined) label.color = params.color
      project.updatedAt = nowIso()

      for (const task of data.tasks) {
        if (task.projectId !== project.id) continue
        task.labels = task.labels.map((taskLabel) =>
          taskLabel.id === label.id ? { ...label } : taskLabel,
        )
      }

      await writeData(c, data)
      return c.json(rpcOk(label))
    }

    if (method === 'labels.delete') {
      const params = labelDeleteRpcSchema.parse(body.params)
      const project = requireProject(data, params)
      const label = requireProjectLabel(project, params)

      project.labels = project.labels.filter((item) => item.id !== label.id)
      project.updatedAt = nowIso()
      for (const task of data.tasks) {
        if (task.projectId !== project.id) continue
        task.labels = task.labels.filter((item) => item.id !== label.id)
      }

      await writeData(c, data)
      return c.json(rpcOk({ ok: true, deletedLabelId: label.id }))
    }

    if (method === 'tasks.list' || method === 'tasks.search') {
      const params = tasksListParamsSchema.parse(body.params)
      const project =
        params && hasProjectSelector(params)
          ? requireProject(data, params)
          : undefined
      const query = params?.query?.trim().toLowerCase()
      const labelName = params?.labelName?.trim().toLowerCase()
      const tasks = data.tasks
        .filter((task) => {
          if (project && task.projectId !== project.id) return false
          if (params?.status && task.status !== params.status) return false
          if (params?.priority && task.priority !== params.priority)
            return false
          if (
            !params?.includeCompleted &&
            ['completed', 'closed'].includes(task.status)
          ) {
            return false
          }
          if (
            params?.labelId &&
            !task.labels.some((label) => label.id === params.labelId)
          ) {
            return false
          }
          if (
            labelName &&
            !task.labels.some(
              (label) => label.name.trim().toLowerCase() === labelName,
            )
          ) {
            return false
          }
          if (!query) return true
          return [
            task.title,
            task.description,
            task.acceptanceCriteria,
            ...task.labels.map((label) => label.name),
          ].some((value) => value.toLowerCase().includes(query))
        })
        .slice(0, params?.limit ?? 100)
        .map((task) => enrichTask(data, task))

      return c.json(rpcOk(tasks))
    }

    if (method === 'tasks.get') {
      const params = taskSelectorSchema.parse(body.params)
      const task = requireTask(data, params)
      return c.json(rpcOk(enrichTask(data, task)))
    }

    if (method === 'tasks.create') {
      const params = taskCreateRpcSchema.parse(body.params)
      const project = requireProject(data, params)
      const labels = resolveTaskLabels(project, params) ?? []
      const createdAt = nowIso()
      const task: Task = {
        id: newId('task'),
        projectId: project.id,
        number: project.nextTaskNumber,
        title: params.title,
        description: params.description ?? '',
        acceptanceCriteria: params.acceptanceCriteria ?? '',
        attachments: await normalizeAttachments(c, params.attachments ?? []),
        comments: [],
        status: params.status ?? 'open',
        labels,
        priority: params.priority ?? 'none',
        createdAt,
        updatedAt: createdAt,
        completedAt: params.status === 'completed' ? createdAt : null,
      }

      project.nextTaskNumber += 1
      project.updatedAt = createdAt
      data.tasks.unshift(task)
      await writeData(c, data)
      return c.json(rpcOk(enrichTask(data, task)))
    }

    if (method === 'tasks.update') {
      const params = taskUpdateRpcSchema.parse(body.params)
      const task = requireTask(data, params)
      const project = requireProject(data, { projectId: task.projectId })
      const labels = resolveTaskLabels(project, params)

      if (params.title !== undefined) task.title = params.title
      if (params.description !== undefined)
        task.description = params.description
      if (params.acceptanceCriteria !== undefined) {
        task.acceptanceCriteria = params.acceptanceCriteria
      }
      if (params.attachments !== undefined) {
        task.attachments = await normalizeAttachments(c, params.attachments)
      }
      if (labels !== undefined) task.labels = labels
      if (params.priority !== undefined) task.priority = params.priority
      if (params.status !== undefined) task.status = params.status as TaskStatus
      if (params.completed !== undefined) {
        task.status = params.completed ? 'completed' : 'open'
      }
      task.completedAt =
        task.status === 'completed' ? (task.completedAt ?? nowIso()) : null
      task.updatedAt = nowIso()
      project.updatedAt = task.updatedAt

      await writeData(c, data)
      return c.json(rpcOk(enrichTask(data, task)))
    }

    if (method === 'tasks.delete') {
      const params = taskDeleteRpcSchema.parse(body.params)
      const task = requireTask(data, params)
      data.tasks = data.tasks.filter((item) => item.id !== task.id)

      const project = data.projects.find((item) => item.id === task.projectId)
      if (project) project.updatedAt = nowIso()

      await writeData(c, data)
      return c.json(rpcOk({ ok: true, deletedTaskId: task.id }))
    }

    if (method === 'comments.list') {
      const params = commentsListParamsSchema.parse(body.params)
      const task = requireTask(data, params)
      return c.json(rpcOk(task.comments ?? []))
    }

    if (method === 'comments.create') {
      const params = commentCreateRpcSchema.parse(body.params)
      const task = requireTask(data, params)
      const comment = makeComment(params)
      task.comments = [...(task.comments ?? []), comment]
      task.updatedAt = comment.createdAt

      const project = data.projects.find((item) => item.id === task.projectId)
      if (project) project.updatedAt = task.updatedAt

      await writeData(c, data)
      return c.json(rpcOk({ task: enrichTask(data, task), comment }))
    }

    if (method === 'comments.update') {
      const params = commentUpdateRpcSchema.parse(body.params)
      const task = requireTask(data, params)
      const comment = (task.comments ?? []).find(
        (item) => item.id === params.commentId,
      )
      if (!comment) throw new Error('comment_not_found')

      comment.content = params.content
      comment.updatedAt = nowIso()
      task.updatedAt = comment.updatedAt

      const project = data.projects.find((item) => item.id === task.projectId)
      if (project) project.updatedAt = task.updatedAt

      await writeData(c, data)
      return c.json(rpcOk({ task: enrichTask(data, task), comment }))
    }

    if (method === 'comments.delete') {
      const params = commentDeleteRpcSchema.parse(body.params)
      const task = requireTask(data, params)
      const initialLength = task.comments.length
      task.comments = task.comments.filter(
        (item) => item.id !== params.commentId,
      )
      if (task.comments.length === initialLength)
        throw new Error('comment_not_found')

      task.updatedAt = nowIso()
      const project = data.projects.find((item) => item.id === task.projectId)
      if (project) project.updatedAt = task.updatedAt

      await writeData(c, data)
      return c.json(rpcOk({ ok: true, deletedCommentId: params.commentId }))
    }

    if (method === 'attachments.list') {
      const params = attachmentsListParamsSchema.parse(body.params)
      const task = requireTask(data, params)
      return c.json(rpcOk(task.attachments ?? []))
    }

    return c.json(
      rpcError('method_not_found', `Tasks does not expose ${method}.`),
      404,
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        rpcError(
          'invalid_params',
          error.issues[0]?.message ?? 'Invalid RPC parameters.',
        ),
        400,
      )
    }

    if (error instanceof Error) {
      const messages: Record<string, string> = {
        project_not_found: 'Project not found.',
        task_not_found: 'Task not found.',
        label_not_found: 'Label not found.',
        comment_not_found: 'Comment not found.',
      }
      if (messages[error.message]) {
        return c.json(rpcError(error.message, messages[error.message]), 404)
      }
      return c.json(rpcError('rpc_failed', error.message), 500)
    }

    return c.json(rpcError('rpc_failed', 'Tasks RPC failed.'), 500)
  }
})

app.get('/api/projects', async (c) => {
  try {
    const data = await readData(c)
    return c.json({ projects: projectSummary(data) })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to read projects',
    )
  }
})

app.get('/api/settings', async (c) => {
  try {
    const settings = await readSettings(c)
    return c.json({ settings })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to read settings',
    )
  }
})

app.put('/api/settings', async (c) => {
  try {
    const input = settingsInputSchema.parse(
      await c.req.json().catch(() => ({})),
    )
    const settings = settingsSchema.parse(input)
    await writeSettings(c, settings)
    return c.json({ settings })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError(c, error.issues[0]?.message ?? 'Invalid settings', 400)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to update settings',
    )
  }
})

app.post('/api/attachments', async (c) => {
  try {
    const input = attachmentSchema.parse(await c.req.json().catch(() => ({})))
    const attachment = await persistAttachment(c, input)
    return c.json({ attachment })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(c, error.issues[0]?.message ?? 'Invalid attachment', 400)
    }
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to save attachment',
    )
  }
})

app.post('/api/projects', async (c) => {
  try {
    const input = projectInputSchema.parse(await c.req.json().catch(() => ({})))
    const data = await readData(c)
    const createdAt = nowIso()
    const key = uniqueProjectKey(data, input.key || makeProjectKey(input.name))
    const project: Project = {
      id: newId('project'),
      name: input.name,
      key,
      summary: input.summary,
      description: input.description,
      logoUrl: input.logoUrl,
      websiteUrl: input.websiteUrl,
      labels: normalizeLabels(input.labels),
      nextTaskNumber: 1,
      createdAt,
      updatedAt: createdAt,
    }

    data.projects.unshift(project)
    await writeData(c, data)
    return c.json({ project })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError(c, error.issues[0]?.message ?? 'Invalid project', 400)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to create project',
    )
  }
})

app.patch('/api/projects/:projectId', async (c) => {
  try {
    const input = projectPatchSchema.parse(await c.req.json().catch(() => ({})))
    const data = await readData(c)
    const project = data.projects.find(
      (item) => item.id === c.req.param('projectId'),
    )
    if (!project) return jsonError(c, 'Project not found', 404)

    if (input.name !== undefined) project.name = input.name
    if (input.key !== undefined) {
      const nextKey = input.key || makeProjectKey(input.name ?? project.name)
      project.key = uniqueProjectKey(data, nextKey, project.id)
    }
    if (input.summary !== undefined) project.summary = input.summary
    if (input.description !== undefined) project.description = input.description
    if (input.logoUrl !== undefined) project.logoUrl = input.logoUrl
    if (input.websiteUrl !== undefined) project.websiteUrl = input.websiteUrl
    if (input.labels !== undefined) {
      const previousProjectLabelIds = new Set(
        project.labels.map((label) => label.id),
      )
      project.labels = normalizeLabels(input.labels)
      const nextProjectLabels = new Map(
        project.labels.map((label) => [label.id, label]),
      )

      for (const task of data.tasks) {
        if (task.projectId !== project.id) continue
        task.labels = task.labels.flatMap((label) => {
          if (!previousProjectLabelIds.has(label.id)) return [label]
          const nextLabel = nextProjectLabels.get(label.id)
          return nextLabel ? [nextLabel] : []
        })
      }
    }
    project.updatedAt = nowIso()

    await writeData(c, data)
    return c.json({ project })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError(c, error.issues[0]?.message ?? 'Invalid project', 400)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to update project',
    )
  }
})

app.delete('/api/projects/:projectId', async (c) => {
  try {
    const data = await readData(c)
    const projectId = c.req.param('projectId')
    const projectExists = data.projects.some(
      (project) => project.id === projectId,
    )
    if (!projectExists) return jsonError(c, 'Project not found', 404)

    data.projects = data.projects.filter((project) => project.id !== projectId)
    data.tasks = data.tasks.filter((task) => task.projectId !== projectId)
    await writeData(c, data)
    return c.json({ ok: true })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to delete project',
    )
  }
})

app.post('/api/projects/:projectId/tasks', async (c) => {
  try {
    const input = taskInputSchema.parse(await c.req.json().catch(() => ({})))
    const data = await readData(c)
    const project = data.projects.find(
      (item) => item.id === c.req.param('projectId'),
    )
    if (!project) return jsonError(c, 'Project not found', 404)

    const createdAt = nowIso()
    const task: Task = {
      id: newId('task'),
      projectId: project.id,
      number: project.nextTaskNumber,
      title: input.title,
      description: input.description,
      acceptanceCriteria: input.acceptanceCriteria,
      attachments: await normalizeAttachments(c, input.attachments),
      comments: [],
      status: input.status,
      labels: normalizeLabels(input.labels),
      priority: input.priority,
      createdAt,
      updatedAt: createdAt,
      completedAt: input.status === 'completed' ? createdAt : null,
    }

    project.nextTaskNumber += 1
    project.updatedAt = createdAt
    data.tasks.unshift(task)
    await writeData(c, data)
    return c.json({ task })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError(c, error.issues[0]?.message ?? 'Invalid task', 400)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to create task',
    )
  }
})

app.patch('/api/tasks/:taskId', async (c) => {
  try {
    const input = taskPatchSchema.parse(await c.req.json().catch(() => ({})))
    const data = await readData(c)
    const task = data.tasks.find((item) => item.id === c.req.param('taskId'))
    if (!task) return jsonError(c, 'Task not found', 404)

    if (input.title !== undefined) task.title = input.title
    if (input.description !== undefined) task.description = input.description
    if (input.acceptanceCriteria !== undefined) {
      task.acceptanceCriteria = input.acceptanceCriteria
    }
    if (input.attachments !== undefined) {
      task.attachments = await normalizeAttachments(c, input.attachments)
    }
    if (input.labels !== undefined) task.labels = normalizeLabels(input.labels)
    if (input.priority !== undefined) task.priority = input.priority
    if (input.status !== undefined) task.status = input.status as TaskStatus
    if (input.completed !== undefined) {
      task.status = input.completed ? 'completed' : 'open'
    }
    task.completedAt =
      task.status === 'completed' ? (task.completedAt ?? nowIso()) : null
    task.updatedAt = nowIso()

    const project = data.projects.find((item) => item.id === task.projectId)
    if (project) project.updatedAt = task.updatedAt

    await writeData(c, data)
    return c.json({ task })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError(c, error.issues[0]?.message ?? 'Invalid task', 400)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to update task',
    )
  }
})

app.delete('/api/tasks/:taskId', async (c) => {
  try {
    const data = await readData(c)
    const taskId = c.req.param('taskId')
    const task = data.tasks.find((item) => item.id === taskId)
    if (!task) return jsonError(c, 'Task not found', 404)

    data.tasks = data.tasks.filter((item) => item.id !== taskId)
    const project = data.projects.find((item) => item.id === task.projectId)
    if (project) project.updatedAt = nowIso()

    await writeData(c, data)
    return c.json({ ok: true })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to delete task',
    )
  }
})

app.post('/api/tasks/:taskId/comments', async (c) => {
  try {
    const input = commentInputSchema.parse(await c.req.json().catch(() => ({})))
    const data = await readData(c)
    const task = data.tasks.find((item) => item.id === c.req.param('taskId'))
    if (!task) return jsonError(c, 'Task not found', 404)

    const comment = makeComment(input)
    task.comments = [...(task.comments ?? []), comment]
    task.updatedAt = comment.createdAt

    const project = data.projects.find((item) => item.id === task.projectId)
    if (project) project.updatedAt = task.updatedAt

    await writeData(c, data)
    return c.json({ task, comment })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError(c, error.issues[0]?.message ?? 'Invalid comment', 400)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to create comment',
    )
  }
})

app.patch('/api/tasks/:taskId/comments/:commentId', async (c) => {
  try {
    const input = commentInputSchema
      .pick({ content: true })
      .parse(await c.req.json().catch(() => ({})))
    const data = await readData(c)
    const task = data.tasks.find((item) => item.id === c.req.param('taskId'))
    if (!task) return jsonError(c, 'Task not found', 404)

    const comment = (task.comments ?? []).find(
      (item) => item.id === c.req.param('commentId'),
    )
    if (!comment) return jsonError(c, 'Comment not found', 404)

    comment.content = input.content
    comment.updatedAt = nowIso()
    task.updatedAt = comment.updatedAt

    const project = data.projects.find((item) => item.id === task.projectId)
    if (project) project.updatedAt = task.updatedAt

    await writeData(c, data)
    return c.json({ task, comment })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError(c, error.issues[0]?.message ?? 'Invalid comment', 400)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to update comment',
    )
  }
})

app.delete('/api/tasks/:taskId/comments/:commentId', async (c) => {
  try {
    const data = await readData(c)
    const task = data.tasks.find((item) => item.id === c.req.param('taskId'))
    if (!task) return jsonError(c, 'Task not found', 404)

    const initialLength = task.comments?.length ?? 0
    task.comments = (task.comments ?? []).filter(
      (item) => item.id !== c.req.param('commentId'),
    )
    if (task.comments.length === initialLength) {
      return jsonError(c, 'Comment not found', 404)
    }

    task.updatedAt = nowIso()
    const project = data.projects.find((item) => item.id === task.projectId)
    if (project) project.updatedAt = task.updatedAt

    await writeData(c, data)
    return c.json({ task, ok: true })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to delete comment',
    )
  }
})

app.post('/api/moldable/today/dismiss', async (c) => {
  const body = (await c.req.json().catch(() => null)) as unknown
  if (!isMoldableTodayDismissalRequest(body)) {
    return c.json({ error: 'Invalid Today dismissal payload.' }, 400)
  }

  const dismissals = await recordMoldableTodayDismissal(c.req.raw, {
    id: body.id,
    dismissalKey: body.dismissalKey,
    materialDismissalKey: body.materialDismissalKey,
    dismissedAt: body.dismissedAt ?? new Date().toISOString(),
    item: body.item,
  })

  return c.json({ ok: true, dismissals: dismissals.length })
})

type MoldableTodayItem = {
  id?: unknown
  kind?: unknown
  title?: unknown
  subtitle?: unknown
  groupHint?: unknown
}

type MoldableTodayDismissal = {
  id: string
  dismissalKey?: string
  materialDismissalKey?: string
  dismissedAt: string
  item?: {
    kind?: string
    title?: string
    subtitle?: string
    groupHint?: string
  }
}

function isMoldableTodayResponse(value: unknown): value is {
  items: MoldableTodayItem[]
  [key: string]: unknown
} {
  return isMoldableTodayRecord(value) && Array.isArray(value.items)
}

function isMoldableTodayDismissalRequest(
  value: unknown,
): value is MoldableTodayDismissal {
  if (!isMoldableTodayRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    optionalMoldableTodayString(value.dismissalKey) &&
    optionalMoldableTodayString(value.materialDismissalKey) &&
    optionalMoldableTodayString(value.dismissedAt) &&
    (value.item === undefined || isMoldableTodayDismissalItem(value.item))
  )
}

function isMoldableTodayDismissalItem(value: unknown): value is {
  kind?: string
  title?: string
  subtitle?: string
  groupHint?: string
} {
  if (!isMoldableTodayRecord(value)) return false
  return (
    optionalMoldableTodayString(value.kind) &&
    optionalMoldableTodayString(value.title) &&
    optionalMoldableTodayString(value.subtitle) &&
    optionalMoldableTodayString(value.groupHint)
  )
}

function optionalMoldableTodayString(value: unknown): boolean {
  return value === undefined || typeof value === 'string'
}

function isMoldableTodayRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function recordMoldableTodayDismissal(
  request: Request,
  dismissal: MoldableTodayDismissal,
): Promise<MoldableTodayDismissal[]> {
  const current = await readMoldableTodayDismissals(request)
  const key = dismissal.dismissalKey ?? dismissal.id
  const next = [
    ...current.filter((entry) => (entry.dismissalKey ?? entry.id) !== key),
    dismissal,
  ].sort((a, b) => a.id.localeCompare(b.id))
  await writeMoldableTodayDismissals(request, next)
  return next
}

async function readMoldableTodayDismissals(
  request: Request,
): Promise<MoldableTodayDismissal[]> {
  const filePath = await moldableTodayDismissalsPath(request)
  const { readFile } = await import('node:fs/promises')
  try {
    const data = JSON.parse(await readFile(filePath, 'utf8')) as unknown
    return Array.isArray(data)
      ? data.filter(isMoldableTodayDismissalRequest)
      : []
  } catch (error) {
    if (isNodeFileNotFound(error)) return []
    throw error
  }
}

async function writeMoldableTodayDismissals(
  request: Request,
  dismissals: MoldableTodayDismissal[],
): Promise<void> {
  const filePath = await moldableTodayDismissalsPath(request)
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const tempPath = path.join(
    path.dirname(filePath),
    '.' +
      path.basename(filePath) +
      '.' +
      process.pid +
      '.' +
      Date.now() +
      '.tmp',
  )
  await fs.writeFile(tempPath, JSON.stringify(dismissals, null, 2), 'utf8')
  await fs.rename(tempPath, filePath)
}

async function moldableTodayDismissalsPath(request: Request): Promise<string> {
  const path = await import('node:path')
  return path.join(moldableTodayDataDir(request), 'today-dismissals.json')
}

function moldableTodayDataDir(request: Request): string {
  const workspaceId =
    request.headers.get('x-moldable-workspace') ??
    request.headers.get('x-moldable-workspace-id') ??
    process.env.MOLDABLE_WORKSPACE_ID ??
    'personal'
  const appId = process.env.MOLDABLE_APP_ID

  if (appId) {
    const home =
      process.env.MOLDABLE_HOME ??
      (process.env.HOME ?? process.cwd()) + '/.moldable'
    return home + '/workspaces/' + workspaceId + '/apps/' + appId + '/data'
  }

  return process.env.MOLDABLE_APP_DATA_DIR ?? process.cwd() + '/data'
}

function filterMoldableTodayDismissedItems<T extends MoldableTodayItem>(
  items: T[],
  dismissals: MoldableTodayDismissal[],
): T[] {
  if (dismissals.length === 0) return items
  const dismissedIds = new Set(dismissals.map((entry) => entry.id))
  const dismissedMaterialKeys = new Set(
    dismissals
      .map((entry) => entry.materialDismissalKey)
      .filter((key): key is string => Boolean(key)),
  )

  return items.filter((item) => {
    if (typeof item.id === 'string' && dismissedIds.has(item.id)) return false
    return !dismissedMaterialKeys.has(moldableTodayMaterialKey(item))
  })
}

function moldableTodayMaterialKey(item: MoldableTodayItem): string {
  return [
    'material',
    process.env.MOLDABLE_APP_ID ?? '',
    typeof item.kind === 'string' ? item.kind : '',
    'text',
    normalizeMoldableTodayText(item.title),
    normalizeMoldableTodayText(item.subtitle),
    typeof item.groupHint === 'string' ? item.groupHint : '',
    '',
  ].join('\u001e')
}

function normalizeMoldableTodayText(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').toLowerCase()
    : ''
}

function isNodeFileNotFound(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  )
}
