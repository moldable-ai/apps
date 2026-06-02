import { getAppDataDir } from '@moldable-ai/storage'
import { app } from './app'
import { resolveStaticFilePath } from './static'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

type RpcResponse<T> =
  | { ok: true; result: T }
  | { ok: false; error?: { code?: string; message?: string } }

type FolderResponse = {
  id: string
  designCount: number
}

type DesignResponse = {
  id: string
  status?: 'generating' | 'ready' | 'failed'
  folderId?: string | null
  pendingIterations?: Array<{ requestId?: string }>
  iterations: Array<{ kind: string }>
}

async function createTempPng(): Promise<{ dir: string; imagePath: string }> {
  const dir = await mkdtemp(path.join(tmpdir(), 'redecorate-test-'))
  const imagePath = path.join(dir, 'room.png')
  await writeFile(
    imagePath,
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
      'base64',
    ),
  )
  return { dir, imagePath }
}

async function cleanup(workspaceId: string, tempDir?: string): Promise<void> {
  await rm(getAppDataDir(workspaceId), { recursive: true, force: true })
  if (tempDir) await rm(tempDir, { recursive: true, force: true })
}

describe('resolveStaticFilePath', () => {
  it('resolves built asset paths under dist', () => {
    const filePath = resolveStaticFilePath('/assets/index-abc123.js')
    const expectedPath = path.join(
      process.cwd(),
      'dist',
      'assets/index-abc123.js',
    )

    expect(filePath).toBe(expectedPath)
    expect(path.relative(path.join(process.cwd(), 'dist'), filePath)).toBe(
      'assets/index-abc123.js',
    )
  })
})

describe('Redecorate RPC', () => {
  it('imports a local source photo into a folder as an upload iteration', async () => {
    const workspaceId = `test-${randomUUID()}`
    const { dir, imagePath } = await createTempPng()

    try {
      const folderResponse = await app.request(
        `/api/folders?workspace=${workspaceId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Kitchen', emoji: 'K' }),
        },
      )
      expect(folderResponse.status).toBe(200)
      const folder = (await folderResponse.json()) as FolderResponse

      const importResponse = await app.request(
        `/api/moldable/rpc?workspace=${workspaceId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'redecorate.images.import',
            params: {
              imagePath,
              title: 'Kitchen source',
              folderId: folder.id,
            },
          }),
        },
      )
      expect(importResponse.status).toBe(200)
      const imported =
        (await importResponse.json()) as RpcResponse<DesignResponse>

      expect(imported.ok).toBe(true)
      if (!imported.ok) throw new Error('Expected import to succeed')
      expect(imported.result.folderId).toBe(folder.id)
      expect(imported.result.iterations).toHaveLength(1)
      expect(imported.result.iterations[0]?.kind).toBe('upload')

      const foldersResponse = await app.request(
        `/api/folders?workspace=${workspaceId}`,
      )
      const folders = (await foldersResponse.json()) as FolderResponse[]
      expect(folders.find((item) => item.id === folder.id)?.designCount).toBe(1)
    } finally {
      await cleanup(workspaceId, dir)
    }
  })

  it('rejects generation into a missing folder before queueing work', async () => {
    const workspaceId = `test-${randomUUID()}`

    try {
      const response = await app.request(
        `/api/moldable/rpc?workspace=${workspaceId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'redecorate.designs.generate',
            params: {
              prompt: 'A calm reading room',
              folderId: 'missing-folder',
            },
          }),
        },
      )
      expect(response.status).toBe(200)
      const rpc = (await response.json()) as RpcResponse<DesignResponse>

      expect(rpc.ok).toBe(false)
      if (rpc.ok) throw new Error('Expected generation to be rejected')
      expect(rpc.error?.message).toContain('missing-folder')

      const designsResponse = await app.request(
        `/api/designs?workspace=${workspaceId}`,
      )
      const designs = (await designsResponse.json()) as DesignResponse[]
      expect(designs).toHaveLength(0)
    } finally {
      await cleanup(workspaceId)
    }
  })

  it('rejects import into a missing folder before writing assets', async () => {
    const workspaceId = `test-${randomUUID()}`
    const { dir, imagePath } = await createTempPng()

    try {
      const response = await app.request(
        `/api/designs/import-paths?workspace=${workspaceId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paths: [imagePath],
            mode: 'separate',
            folderId: 'missing-folder',
          }),
        },
      )

      expect(response.status).toBe(500)
      const designsResponse = await app.request(
        `/api/designs?workspace=${workspaceId}`,
      )
      const designs = (await designsResponse.json()) as DesignResponse[]
      expect(designs).toHaveLength(0)
      expect(existsSync(path.join(getAppDataDir(workspaceId), 'assets'))).toBe(
        false,
      )
    } finally {
      await cleanup(workspaceId, dir)
    }
  })

  it('preserves pending reference work when importing into an existing design', async () => {
    const workspaceId = `test-${randomUUID()}`
    const { dir, imagePath } = await createTempPng()
    const dataDir = getAppDataDir(workspaceId)
    const threadId = randomUUID()
    const iterationId = randomUUID()
    const pendingRequestId = randomUUID()
    const now = new Date().toISOString()

    try {
      await mkdir(dataDir, { recursive: true })
      await writeFile(
        path.join(dataDir, 'designs.json'),
        JSON.stringify([
          {
            id: threadId,
            title: 'Kitchen',
            prompt: 'Kitchen source',
            aspectRatio: 'square',
            quality: 'medium',
            status: 'generating',
            createdAt: now,
            updatedAt: now,
            iterations: [
              {
                id: iterationId,
                prompt: '',
                kind: 'upload',
                aspectRatio: 'square',
                size: '1x1',
                quality: 'medium',
                fileName: `${iterationId}.png`,
                mimeType: 'image/png',
                createdAt: now,
              },
            ],
            pendingIterations: [
              {
                id: randomUUID(),
                kind: 'generation',
                prompt: 'Add warm wood cabinets',
                aspectRatio: 'square',
                quality: 'medium',
                baseIterationId: iterationId,
                requestId: pendingRequestId,
                startedAt: now,
              },
            ],
          },
        ]),
      )

      const importResponse = await app.request(
        `/api/moldable/rpc?workspace=${workspaceId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'redecorate.images.import',
            params: {
              id: threadId,
              imagePath,
              title: 'Alternate source',
            },
          }),
        },
      )

      expect(importResponse.status).toBe(200)
      const imported =
        (await importResponse.json()) as RpcResponse<DesignResponse>

      expect(imported.ok).toBe(true)
      if (!imported.ok) throw new Error('Expected import to succeed')
      expect(imported.result.status).toBe('generating')
      expect(imported.result.pendingIterations?.[0]?.requestId).toBe(
        pendingRequestId,
      )
      expect(imported.result.iterations).toHaveLength(2)
      expect(imported.result.iterations.at(-1)?.kind).toBe('upload')
    } finally {
      await cleanup(workspaceId, dir)
    }
  })

  it('preserves unrelated pending work when deleting a render', async () => {
    const workspaceId = `test-${randomUUID()}`
    const dataDir = getAppDataDir(workspaceId)
    const threadId = randomUUID()
    const deleteIterationId = randomUUID()
    const baseIterationId = randomUUID()
    const pendingRequestId = randomUUID()
    const now = new Date().toISOString()

    try {
      await mkdir(path.join(dataDir, 'assets', threadId), { recursive: true })
      await writeFile(
        path.join(dataDir, 'assets', threadId, `${deleteIterationId}.png`),
        Buffer.from('delete-me'),
      )
      await writeFile(
        path.join(dataDir, 'assets', threadId, `${baseIterationId}.png`),
        Buffer.from('keep-me'),
      )
      await writeFile(
        path.join(dataDir, 'designs.json'),
        JSON.stringify([
          {
            id: threadId,
            title: 'Kitchen',
            prompt: 'Kitchen source',
            aspectRatio: 'square',
            quality: 'medium',
            status: 'generating',
            createdAt: now,
            updatedAt: now,
            iterations: [
              {
                id: deleteIterationId,
                prompt: '',
                kind: 'upload',
                aspectRatio: 'square',
                size: '1x1',
                quality: 'medium',
                fileName: `${deleteIterationId}.png`,
                mimeType: 'image/png',
                createdAt: now,
              },
              {
                id: baseIterationId,
                prompt: '',
                kind: 'upload',
                aspectRatio: 'square',
                size: '1x1',
                quality: 'medium',
                fileName: `${baseIterationId}.png`,
                mimeType: 'image/png',
                createdAt: now,
              },
            ],
            pendingIterations: [
              {
                id: randomUUID(),
                kind: 'generation',
                prompt: 'Add warm wood cabinets',
                aspectRatio: 'square',
                quality: 'medium',
                baseIterationId,
                requestId: pendingRequestId,
                startedAt: now,
              },
            ],
          },
        ]),
      )

      const response = await app.request(
        `/api/moldable/rpc?workspace=${workspaceId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'redecorate.designs.deleteIteration',
            params: { id: threadId, iterationId: [deleteIterationId] },
          }),
        },
      )

      expect(response.status).toBe(200)
      const rpc = (await response.json()) as RpcResponse<{
        thread?: DesignResponse
      }>

      expect(rpc.ok).toBe(true)
      if (!rpc.ok) throw new Error('Expected delete to succeed')
      expect(rpc.result.thread?.status).toBe('generating')
      expect(rpc.result.thread?.pendingIterations?.[0]?.requestId).toBe(
        pendingRequestId,
      )
      expect(rpc.result.thread?.iterations).toHaveLength(1)
    } finally {
      await cleanup(workspaceId)
    }
  })
})
