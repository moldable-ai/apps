import {
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import type { AppCommand, CommandsResponse } from '@moldable-ai/ui'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'

interface Todo {
  id: string
  title: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

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

const rpcRequestSchema = z.object({
  method: z.string(),
  params: z.unknown().optional(),
})

const todoListParamsSchema = z
  .object({
    query: z.string().optional(),
    includeCompleted: z.boolean().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    dueBefore: z.string().optional(),
    dueAfter: z.string().optional(),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .optional()

const todoGetParamsSchema = z.object({
  id: z.string().min(1),
})

const todoCreateParamsSchema = z.object({
  title: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.string().nullable().optional(),
  completed: z.boolean().optional(),
})

const todoUpdateParamsSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  completed: z.boolean().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.string().nullable().optional(),
})

function getTodosPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'todos.json')
}

async function loadTodos(workspaceId?: string): Promise<Todo[]> {
  await ensureDir(getAppDataDir(workspaceId))
  return readJson<Todo[]>(getTodosPath(workspaceId), [])
}

async function saveTodos(todos: Todo[], workspaceId?: string): Promise<void> {
  await ensureDir(getAppDataDir(workspaceId))
  await writeJson(getTodosPath(workspaceId), todos)
}

function getRpcWorkspaceId(request: Request): string | undefined {
  return (
    request.headers.get('x-moldable-workspace-id') ??
    getWorkspaceFromRequest(request)
  )
}

function filterTodos(
  todos: Todo[],
  params: z.infer<typeof todoListParamsSchema>,
) {
  let result = [...todos]

  if (!params?.includeCompleted) {
    result = result.filter((todo) => !todo.completed)
  }
  if (params?.priority) {
    result = result.filter((todo) => todo.priority === params.priority)
  }
  if (params?.query?.trim()) {
    const query = params.query.toLowerCase()
    result = result.filter((todo) => todo.title.toLowerCase().includes(query))
  }
  if (params?.dueBefore) {
    const dueBefore = new Date(params.dueBefore).getTime()
    result = result.filter(
      (todo) => todo.dueDate && new Date(todo.dueDate).getTime() <= dueBefore,
    )
  }
  if (params?.dueAfter) {
    const dueAfter = new Date(params.dueAfter).getTime()
    result = result.filter(
      (todo) => todo.dueDate && new Date(todo.dueDate).getTime() >= dueAfter,
    )
  }

  result.sort(
    (a, b) =>
      Number(a.completed) - Number(b.completed) ||
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )

  return result.slice(0, params?.limit ?? 100)
}

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null

  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'todo',
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

// Today contribution: only dated work that has slipped past or is due today
// earns a card. A to-do list has no "in-progress editing" state, so there is
// no resume. Silent when nothing is overdue or due today.
app.get('/api/moldable/today', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const todos = await loadTodos(workspaceId)
  const active = todos.filter((t) => !t.completed)

  const now = new Date()
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  ).getTime()
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime()

  const dueTs = (t: Todo) => (t.dueDate ? Date.parse(t.dueDate) : NaN)
  const overdue = active
    .filter((t) => {
      const d = dueTs(t)
      return Number.isFinite(d) && d < startOfToday
    })
    .sort((a, b) => dueTs(a) - dueTs(b))
  const dueTodayHigh = active.filter((t) => {
    const d = dueTs(t)
    return (
      Number.isFinite(d) &&
      d >= startOfToday &&
      d <= endOfToday &&
      t.priority === 'high'
    )
  })

  const items: unknown[] = []

  if (overdue.length === 1) {
    const top = overdue[0]
    items.push({
      id: 'todo:overdue',
      kind: 'blocked',
      surface: 'nudge',
      title: top.title,
      subtitle: 'Overdue',
      icon: '⚠️',
      priority: 82,
      dismissible: true,
      actions: [
        {
          type: 'rpc',
          label: 'Mark done',
          method: 'todos.complete',
          params: { id: top.id, completed: true },
        },
        { type: 'open-app', label: 'Open' },
      ],
    })
  } else if (overdue.length > 1) {
    items.push({
      id: 'todo:overdue',
      kind: 'blocked',
      surface: 'nudge',
      title: `${overdue.length} overdue to-dos`,
      subtitle: `Oldest: ${overdue[0].title}`,
      icon: '⚠️',
      priority: 82,
      dismissible: true,
      actions: [{ type: 'open-app', label: 'Open' }],
    })
  }

  if (dueTodayHigh.length === 1) {
    const top = dueTodayHigh[0]
    items.push({
      id: 'todo:due-today',
      kind: 'timely',
      surface: 'text',
      title: top.title,
      subtitle: 'High priority · due today',
      icon: '🔴',
      priority: 70,
      dismissible: true,
      actions: [
        {
          type: 'rpc',
          label: 'Mark done',
          method: 'todos.complete',
          params: { id: top.id, completed: true },
        },
        { type: 'open-app', label: 'Open' },
      ],
    })
  } else if (dueTodayHigh.length > 1) {
    items.push({
      id: 'todo:due-today',
      kind: 'timely',
      surface: 'text',
      title: `${dueTodayHigh.length} high-priority to-dos due today`,
      icon: '🔴',
      priority: 70,
      dismissible: true,
      actions: [{ type: 'open-app', label: 'Open' }],
    })
  }

  return c.json({
    items,
    resume: null,
    generatedAt: new Date().toISOString(),
  })
})

app.get('/api/moldable/commands', (c) => {
  const commands: AppCommand[] = [
    {
      id: 'add-todo',
      label: 'Add todo',
      shortcut: 'n',
      icon: 'plus',
      group: 'Actions',
      action: { type: 'message', payload: { focus: 'add-input' } },
    },
    {
      id: 'filter-all',
      label: 'Show all todos',
      group: 'Filter',
      action: { type: 'message', payload: { filter: 'all' } },
    },
    {
      id: 'filter-active',
      label: 'Show active todos',
      group: 'Filter',
      action: { type: 'message', payload: { filter: 'active' } },
    },
    {
      id: 'filter-completed',
      label: 'Show completed todos',
      group: 'Filter',
      action: { type: 'message', payload: { filter: 'completed' } },
    },
    {
      id: 'clear-completed',
      label: 'Clear completed todos',
      icon: 'trash-2',
      group: 'Actions',
      action: { type: 'message', payload: { action: 'clear-completed' } },
    },
  ]

  return c.json<CommandsResponse>({ commands }, 200, {
    'Cache-Control': 'no-store',
  })
})

app.get('/api/todos', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const todos = await loadTodos(workspaceId)
    return c.json(todos)
  } catch (error) {
    console.error('Failed to read todos:', error)
    return c.json({ error: 'Failed to read todos' }, 500)
  }
})

app.post('/api/todos', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const todos = await c.req.json<Todo[]>()
    await saveTodos(todos, workspaceId)
    return c.json({ success: true })
  } catch (error) {
    console.error('Failed to save todos:', error)
    return c.json({ error: 'Failed to save todos' }, 500)
  }
})

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getRpcWorkspaceId(c.req.raw)

  try {
    const body = rpcRequestSchema.parse(await c.req.json())
    const todos = await loadTodos(workspaceId)

    if (body.method === 'todos.list' || body.method === 'todos.search') {
      const params = todoListParamsSchema.parse(body.params)
      return c.json({ ok: true, result: filterTodos(todos, params) })
    }

    if (body.method === 'todos.get') {
      const params = todoGetParamsSchema.parse(body.params)
      const todo = todos.find((item) => item.id === params.id)

      if (!todo) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'todo_not_found',
              message: `Todo ${params.id} was not found.`,
            },
          },
          404,
        )
      }

      return c.json({ ok: true, result: todo })
    }

    if (body.method === 'todos.create') {
      const params = todoCreateParamsSchema.parse(body.params)
      const now = new Date().toISOString()
      const todo: Todo = {
        id: crypto.randomUUID(),
        title: params.title,
        completed: params.completed ?? false,
        priority: params.priority ?? 'medium',
        dueDate: params.dueDate ?? null,
        createdAt: now,
        updatedAt: now,
      }

      await saveTodos([todo, ...todos], workspaceId)
      return c.json({ ok: true, result: todo })
    }

    if (body.method === 'todos.update' || body.method === 'todos.complete') {
      const params = todoUpdateParamsSchema.parse(body.params)
      const index = todos.findIndex((item) => item.id === params.id)

      if (index === -1) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'todo_not_found',
              message: `Todo ${params.id} was not found.`,
            },
          },
          404,
        )
      }

      todos[index] = {
        ...todos[index],
        ...('title' in params ? { title: params.title } : {}),
        ...('completed' in params ? { completed: params.completed } : {}),
        ...('priority' in params ? { priority: params.priority } : {}),
        ...('dueDate' in params ? { dueDate: params.dueDate } : {}),
        updatedAt: new Date().toISOString(),
      }

      await saveTodos(todos, workspaceId)
      return c.json({ ok: true, result: todos[index] })
    }

    if (body.method === 'todos.delete') {
      const params = todoGetParamsSchema.parse(body.params)
      const filtered = todos.filter((item) => item.id !== params.id)

      if (filtered.length === todos.length) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'todo_not_found',
              message: `Todo ${params.id} was not found.`,
            },
          },
          404,
        )
      }

      await saveTodos(filtered, workspaceId)
      return c.json({ ok: true, result: { deleted: true, id: params.id } })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Todo does not expose ${body.method}.`,
        },
      },
      404,
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_params',
            message: 'Todo received invalid RPC parameters.',
            detail: error.flatten(),
          },
        },
        400,
      )
    }

    console.error('Todo RPC failed:', error)
    return c.json(
      {
        ok: false,
        error: {
          code: 'todo_rpc_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Todo could not complete the request.',
        },
      },
      500,
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
