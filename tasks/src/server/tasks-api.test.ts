import { app } from './app'
import { WORKSPACE_HEADER } from './moldable'
import type { Project, Task } from '@/shared/types'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

interface ProjectResponse {
  project: Project
}

interface ProjectsResponse {
  projects: Array<Project & { tasks: Task[] }>
}

interface TaskResponse {
  task: Task
}

interface RpcResponse<T> {
  ok: boolean
  result: T
  error?: {
    code: string
    message: string
  }
}

let tempHome: string

async function json<T>(response: Response): Promise<T> {
  expect(response.ok).toBe(true)
  return response.json() as Promise<T>
}

function request(pathname: string, init: RequestInit = {}) {
  return app.request(pathname, {
    ...init,
    headers: {
      [WORKSPACE_HEADER]: 'test-workspace',
      ...init.headers,
    },
  })
}

async function rpc<T>(method: string, params?: unknown): Promise<T> {
  const response = await json<RpcResponse<T>>(
    await request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, params }),
    }),
  )
  expect(response.ok).toBe(true)
  return response.result
}

describe('tasks api', () => {
  beforeEach(async () => {
    tempHome = await mkdtemp(path.join(tmpdir(), 'tasks-api-'))
    process.env.MOLDABLE_HOME = tempHome
    process.env.MOLDABLE_APP_ID = 'tasks'
  })

  afterEach(async () => {
    delete process.env.MOLDABLE_HOME
    delete process.env.MOLDABLE_APP_ID
    await rm(tempHome, { recursive: true, force: true })
  })

  it('creates projects and manages tasks in a workspace', async () => {
    const createdProject = await json<ProjectResponse>(
      await request('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Personal OS',
          key: 'POS',
          summary: 'Keep projects moving',
          description: '## Goals\n\nShip useful work.',
          websiteUrl: 'https://example.com',
          labels: [{ name: 'Frontend', color: '#6366f1' }],
        }),
      }),
    )

    expect(createdProject.project.key).toBe('POS')
    expect(createdProject.project.websiteUrl).toBe('https://example.com')
    expect(createdProject.project.labels).toHaveLength(1)

    const createdTask = await json<TaskResponse>(
      await request(`/api/projects/${createdProject.project.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Build the task board',
          description: '- List view\n- Board view',
          acceptanceCriteria:
            '- List rows match Shippy\n- Board cards match Shippy',
          attachments: [
            {
              name: 'proof.txt',
              size: 12,
              type: 'text/plain',
              dataUrl: 'data:text/plain;base64,cHJvb2Y=',
            },
          ],
          status: 'open',
          priority: 'high',
          labels: [{ name: 'Frontend', color: '#6366f1' }],
        }),
      }),
    )

    expect(createdTask.task.number).toBe(1)
    expect(createdTask.task.status).toBe('open')
    expect(createdTask.task.acceptanceCriteria).toContain('Board cards')
    expect(createdTask.task.attachments[0]?.name).toBe('proof.txt')
    expect(createdTask.task.comments).toHaveLength(0)

    const createdComment = await json<TaskResponse>(
      await request(`/api/tasks/${createdTask.task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Looks good from the review pass.' }),
      }),
    )

    expect(createdComment.task.comments).toHaveLength(1)
    expect(createdComment.task.comments[0]?.content).toContain('Looks good')
    expect(createdComment.task.comments[0]?.authorName).toBe('You')

    const updatedComment = await json<TaskResponse>(
      await request(
        `/api/tasks/${createdTask.task.id}/comments/${createdComment.task.comments[0]?.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'Updated comment body.' }),
        },
      ),
    )

    expect(updatedComment.task.comments[0]?.content).toBe(
      'Updated comment body.',
    )

    await json<{ task: Task; ok: boolean }>(
      await request(
        `/api/tasks/${createdTask.task.id}/comments/${createdComment.task.comments[0]?.id}`,
        { method: 'DELETE' },
      ),
    )

    const completedTask = await json<TaskResponse>(
      await request(`/api/tasks/${createdTask.task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      }),
    )

    expect(completedTask.task.status).toBe('completed')
    expect(completedTask.task.completedAt).toEqual(expect.any(String))

    const projects = await json<ProjectsResponse>(
      await request('/api/projects'),
    )
    expect(projects.projects).toHaveLength(1)
    expect(projects.projects[0]?.tasks).toHaveLength(1)
    expect(projects.projects[0]?.tasks[0]?.title).toBe('Build the task board')

    await json<{ ok: boolean }>(
      await request(`/api/tasks/${createdTask.task.id}`, { method: 'DELETE' }),
    )

    const afterDelete = await json<ProjectsResponse>(
      await request('/api/projects'),
    )
    expect(afterDelete.projects[0]?.tasks).toHaveLength(0)
  })

  it('normalizes project keys to Shippy-style three-letter prefixes', async () => {
    const createdProject = await json<ProjectResponse>(
      await request('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Testing Project',
          key: 'test-123',
        }),
      }),
    )

    expect(createdProject.project.key).toBe('TES')
  })

  it('propagates project label edits to tasks that use those labels', async () => {
    const createdProject = await json<ProjectResponse>(
      await request('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Label Propagation',
          key: 'LBL',
          labels: [{ name: 'Frontend', color: '#6366f1' }],
        }),
      }),
    )
    const label = createdProject.project.labels[0]
    expect(label).toBeDefined()

    const createdTask = await json<TaskResponse>(
      await request(`/api/projects/${createdProject.project.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Keep labels in sync',
          labels: [label],
        }),
      }),
    )
    expect(createdTask.task.labels[0]?.name).toBe('Frontend')

    await json<ProjectResponse>(
      await request(`/api/projects/${createdProject.project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labels: [{ id: label?.id, name: 'Backend', color: '#10b981' }],
        }),
      }),
    )

    const projects = await json<ProjectsResponse>(
      await request('/api/projects'),
    )
    expect(projects.projects[0]?.tasks[0]?.labels).toEqual([
      expect.objectContaining({
        id: label?.id,
        name: 'Backend',
        color: '#10b981',
      }),
    ])

    await json<ProjectResponse>(
      await request(`/api/projects/${createdProject.project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labels: [] }),
      }),
    )

    const afterDelete = await json<ProjectsResponse>(
      await request('/api/projects'),
    )
    expect(afterDelete.projects[0]?.tasks[0]?.labels).toEqual([])
  })

  it('does not return every task for an unknown project-scoped search', async () => {
    await rpc<Project>('projects.create', {
      name: 'Frontend',
      key: 'FRO',
    })
    await rpc<Task & { key: string }>('tasks.create', {
      projectKey: 'FRO',
      title: 'Scoped task',
    })

    const response = await request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'tasks.search',
        params: { projectKey: 'NOPE' },
      }),
    })
    const body = (await response.json()) as RpcResponse<unknown>

    expect(response.status).toBe(404)
    expect(body.ok).toBe(false)
    expect(body.error?.code).toBe('project_not_found')
  })

  it('exposes a Moldable app API manifest for chat agents', async () => {
    const manifest = JSON.parse(
      await readFile(path.join(process.cwd(), 'moldable.json'), 'utf8'),
    ) as {
      appApi?: {
        capabilities?: Array<{
          scopes?: Array<{ id: string; inputSchema?: unknown }>
        }>
      }
    }

    const scopes =
      manifest.appApi?.capabilities?.flatMap(
        (capability) => capability.scopes?.map((scope) => scope.id) ?? [],
      ) ?? []

    expect(scopes).toEqual(
      expect.arrayContaining([
        'projects.list',
        'projects.create',
        'tasks.list',
        'tasks.create',
        'tasks.update',
        'labels.create',
        'comments.create',
        'attachments.list',
      ]),
    )
  })

  it('supports Shippy-style task management through Moldable RPC', async () => {
    const project = await rpc<Project>('projects.create', {
      name: 'Frontend',
      key: 'FRO',
      summary: 'UI work',
    })

    expect(project.key).toBe('FRO')

    const label = await rpc<{ id: string; name: string; color: string }>(
      'labels.create',
      {
        projectKey: 'FRO',
        name: 'Oak',
        color: '#14b8a6',
      },
    )

    const task = await rpc<Task & { key: string }>('tasks.create', {
      projectKey: 'FRO',
      title: 'Make Tasks callable from chat',
      description: 'Expose projects, tasks, labels, comments, and attachments.',
      status: 'open',
      priority: 'high',
      labelIds: [label.id],
      attachments: [
        {
          name: 'proof.txt',
          size: 5,
          type: 'text/plain',
          dataUrl: 'data:text/plain;base64,cHJvb2Y=',
        },
      ],
    })

    expect(task.key).toBe('FRO-1')
    expect(task.labels[0]?.name).toBe('Oak')
    expect(task.attachments[0]?.path).toEqual(expect.any(String))

    const tasks = await rpc<Array<Task & { key: string }>>('tasks.search', {
      query: 'callable',
    })
    expect(tasks.map((item) => item.key)).toContain('FRO-1')

    const updated = await rpc<Task & { key: string }>('tasks.update', {
      taskKey: 'FRO-1',
      status: 'in_progress',
      priority: 'medium',
    })
    expect(updated.status).toBe('in_progress')
    expect(updated.priority).toBe('medium')

    const commentResult = await rpc<{ comment: { content: string } }>(
      'comments.create',
      {
        taskKey: 'FRO-1',
        content: 'Implemented through Moldable app API.',
      },
    )
    expect(commentResult.comment.content).toContain('Moldable app API')

    const attachments = await rpc<Array<{ name: string; path?: string }>>(
      'attachments.list',
      { taskKey: 'FRO-1' },
    )
    expect(attachments[0]?.name).toBe('proof.txt')
    expect(attachments[0]?.path).toEqual(expect.any(String))
  })
})
