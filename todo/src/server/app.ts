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

function getTodosPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'todos.json')
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
    await ensureDir(getAppDataDir(workspaceId))
    const todos = await readJson<Todo[]>(getTodosPath(workspaceId), [])
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
    await ensureDir(getAppDataDir(workspaceId))
    await writeJson(getTodosPath(workspaceId), todos)
    return c.json({ success: true })
  } catch (error) {
    console.error('Failed to save todos:', error)
    return c.json({ error: 'Failed to save todos' }, 500)
  }
})
