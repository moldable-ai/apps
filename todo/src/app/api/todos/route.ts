/**
 * Server-side storage for todos using @moldable-ai/storage
 *
 * Data is stored in workspace-specific data directory:
 * - {workspace}/apps/{app-id}/data/todos.json
 */
import { NextResponse } from 'next/server'
import {
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import 'server-only'

interface Todo {
  id: string
  title: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

/** Get the path to todos.json */
function getTodosPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'todos.json')
}

export async function GET(request: Request) {
  try {
    const workspaceId = getWorkspaceFromRequest(request)
    await ensureDir(getAppDataDir(workspaceId))
    const todos = await readJson<Todo[]>(getTodosPath(workspaceId), [])
    return NextResponse.json(todos)
  } catch (error) {
    console.error('Failed to read todos:', error)
    return NextResponse.json({ error: 'Failed to read todos' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const workspaceId = getWorkspaceFromRequest(request)
    const todos: Todo[] = await request.json()
    await writeJson(getTodosPath(workspaceId), todos)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save todos:', error)
    return NextResponse.json({ error: 'Failed to save todos' }, { status: 500 })
  }
}
