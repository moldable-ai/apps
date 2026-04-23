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
