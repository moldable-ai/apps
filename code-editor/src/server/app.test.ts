import { app } from './app'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const workspaceId = 'test-workspace'
const workspaceHeader = { 'x-moldable-workspace': workspaceId }

let tempDir: string
let projectRoot: string
let outsideRoot: string

async function json(response: Response) {
  return (await response.json()) as Record<string, unknown>
}

async function configureProject(rootPath: string) {
  return app.request('/api/config', {
    method: 'POST',
    headers: {
      ...workspaceHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      rootPath,
      recentProjects: [],
      previewUrl: 'http://localhost:3000',
      projectTabs: {},
    }),
  })
}

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'code-editor-test-'))
  projectRoot = path.join(tempDir, 'project')
  outsideRoot = path.join(tempDir, 'outside')

  await fs.mkdir(projectRoot, { recursive: true })
  await fs.mkdir(outsideRoot, { recursive: true })
  await fs.writeFile(path.join(projectRoot, 'inside.txt'), 'inside')
  await fs.writeFile(path.join(outsideRoot, 'outside.txt'), 'outside')

  process.env.MOLDABLE_HOME = tempDir
  process.env.MOLDABLE_APP_ID = 'code-editor'
  delete process.env.MOLDABLE_APP_DATA_DIR
  delete process.env.MOLDABLE_WORKSPACE_ID

  await configureProject(projectRoot)
})

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true })
  delete process.env.MOLDABLE_HOME
  delete process.env.MOLDABLE_APP_ID
})

describe('Code app server file safety', () => {
  it('requires a trusted workspace header for protected API routes', async () => {
    const response = await app.request(
      `/api/read?path=${encodeURIComponent(path.join(projectRoot, 'inside.txt'))}`,
    )

    expect(response.status).toBe(403)
    await expect(json(response)).resolves.toMatchObject({
      error: 'Workspace header is required',
    })
  })

  it('reads files inside the configured project root', async () => {
    const response = await app.request(
      `/api/read?path=${encodeURIComponent(path.join(projectRoot, 'inside.txt'))}`,
      { headers: workspaceHeader },
    )

    expect(response.status).toBe(200)
    await expect(json(response)).resolves.toMatchObject({ content: 'inside' })
  })

  it('rejects reads outside the configured project root', async () => {
    const response = await app.request(
      `/api/read?path=${encodeURIComponent(path.join(outsideRoot, 'outside.txt'))}`,
      { headers: workspaceHeader },
    )

    expect(response.status).toBe(403)
    await expect(json(response)).resolves.toMatchObject({
      error: 'Path is outside the current project',
    })
  })

  it('rejects rename names that traverse to a parent directory', async () => {
    const response = await app.request('/api/files/rename', {
      method: 'POST',
      headers: {
        ...workspaceHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        oldPath: path.join(projectRoot, 'inside.txt'),
        newName: '..',
      }),
    })

    expect(response.status).toBe(400)
    await expect(json(response)).resolves.toMatchObject({
      error: 'Invalid new name',
    })
  })

  it('keeps search results relative to the searched root', async () => {
    await fs.mkdir(path.join(projectRoot, 'src'), { recursive: true })
    await fs.writeFile(path.join(projectRoot, 'src', 'index.ts'), 'export {}')

    const response = await app.request(
      `/api/search?root=${encodeURIComponent(projectRoot)}`,
      { headers: workspaceHeader },
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      files: Array<{ relativePath: string }>
    }
    expect(body.files.map((file) => file.relativePath)).toContain(
      'src/index.ts',
    )
  })
})
