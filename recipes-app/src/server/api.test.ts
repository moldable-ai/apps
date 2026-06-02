import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Point @moldable-ai/storage at a throwaway data dir before importing the app,
// so folder + media routes read/write into an isolated temp directory.
let dataDir: string
beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'recipes-test-'))
  process.env.MOLDABLE_APP_DATA_DIR = dataDir
})
afterAll(() => {
  rmSync(dataDir, { recursive: true, force: true })
})

const { app } = await import('./app')
const { resolveStaticFilePath } = await import('./index')

function req(path: string, init?: RequestInit) {
  return app.fetch(new Request(`http://test${path}`, init))
}

function jsonReq(path: string, method: string, body: unknown) {
  return req(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('folder routes', () => {
  it('creates, lists, moves, reorders, renames and deletes folders', async () => {
    // Empty to start.
    const empty = await (await req('/api/folders')).json()
    expect(empty.folders).toEqual([])

    // Create two folders.
    const weeknight = await (
      await jsonReq('/api/folders', 'POST', { name: 'Weeknight dinners' })
    ).json()
    const desserts = await (
      await jsonReq('/api/folders', 'POST', { name: 'Desserts' })
    ).json()
    expect(weeknight.id).toBeTruthy()
    expect(weeknight.tone).toMatch(/^#[0-9a-f]{3,8}$/i)
    expect(weeknight.recipeIds).toEqual([])

    const listed = await (await req('/api/folders')).json()
    expect(listed.folders).toHaveLength(2)

    // Move a recipe into a folder.
    const moved = await (
      await jsonReq('/api/folders/move', 'POST', {
        recipeId: 'recipe-1',
        folderId: weeknight.id,
      })
    ).json()
    const movedWeeknight = moved.folders.find(
      (f: { id: string }) => f.id === weeknight.id,
    )
    expect(movedWeeknight.recipeIds).toEqual(['recipe-1'])

    // Moving to a different folder removes it from the first.
    const moved2 = await (
      await jsonReq('/api/folders/move', 'POST', {
        recipeId: 'recipe-1',
        folderId: desserts.id,
      })
    ).json()
    expect(
      moved2.folders.find((f: { id: string }) => f.id === weeknight.id)
        .recipeIds,
    ).toEqual([])
    expect(
      moved2.folders.find((f: { id: string }) => f.id === desserts.id)
        .recipeIds,
    ).toEqual(['recipe-1'])

    // Reorder so desserts is first.
    const reordered = await (
      await jsonReq('/api/folders/reorder', 'POST', {
        folderIds: [desserts.id, weeknight.id],
      })
    ).json()
    expect(reordered.folders[0].id).toBe(desserts.id)

    // Rename.
    const renamed = await (
      await jsonReq(`/api/folders/${weeknight.id}`, 'PATCH', {
        name: 'Quick weeknights',
      })
    ).json()
    expect(renamed.name).toBe('Quick weeknights')

    // Delete.
    const del = await req(`/api/folders/${desserts.id}`, { method: 'DELETE' })
    expect(del.status).toBe(200)
    const afterDelete = await (await req('/api/folders')).json()
    expect(afterDelete.folders).toHaveLength(1)
    expect(afterDelete.folders[0].id).toBe(weeknight.id)
  })

  it('rejects a folder with no name', async () => {
    const res = await jsonReq('/api/folders', 'POST', { name: '   ' })
    expect(res.status).toBe(400)
  })
})

describe('recipe routes', () => {
  it('rejects whitespace-only RPC recipe titles', async () => {
    const res = await jsonReq('/api/moldable/rpc', 'POST', {
      method: 'recipes.create',
      params: { title: '   ' },
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe('invalid_params')
  })

  it('rejects malformed whole-array saves', async () => {
    const before = await (await req('/api/recipes')).json()
    const res = await jsonReq('/api/recipes', 'POST', [
      {
        id: 'bad-recipe',
        title: 'Broken',
      },
    ])

    expect(res.status).toBe(400)
    const after = await (await req('/api/recipes')).json()
    expect(after).toEqual(before)
  })
})

describe('static file resolution', () => {
  it('serves built assets and app routes from dist', () => {
    expect(resolveStaticFilePath('/assets/app.js')).toMatch(
      /\/dist\/assets\/app\.js$/,
    )
    expect(resolveStaticFilePath('/recipes/demo')).toMatch(
      /\/dist\/index\.html$/,
    )
  })

  it('rejects traversal outside dist', () => {
    expect(resolveStaticFilePath('/../package.json')).toBeNull()
    expect(resolveStaticFilePath('/assets/../../package.json')).toBeNull()
    expect(resolveStaticFilePath('/%2e%2e/package.json')).toBeNull()
  })
})

// A 1x1 transparent PNG.
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

describe('media routes', () => {
  it('uploads an image and serves it back by path', async () => {
    const bytes = Buffer.from(PNG_BASE64, 'base64')
    const form = new FormData()
    form.append('file', new File([bytes], 'hero.png', { type: 'image/png' }))

    const upload = await req('/api/recipes/media', {
      method: 'POST',
      body: form,
    })
    expect(upload.status).toBe(201)
    const media = await upload.json()
    expect(media.kind).toBe('image')
    expect(media.src).toMatch(/^assets\/.+\.png$/)

    const served = await req(
      `/api/recipes/media?path=${encodeURIComponent(media.src)}`,
    )
    expect(served.status).toBe(200)
    expect(served.headers.get('Content-Type')).toBe('image/png')
    const servedBytes = Buffer.from(await served.arrayBuffer())
    expect(servedBytes.equals(bytes)).toBe(true)
  })

  it('rejects a non-image upload', async () => {
    const form = new FormData()
    form.append('file', new File(['hello'], 'note.txt', { type: 'text/plain' }))
    const res = await req('/api/recipes/media', { method: 'POST', body: form })
    expect(res.status).toBe(400)
  })

  it('rejects uploads with unsupported image media types', async () => {
    const form = new FormData()
    form.append(
      'file',
      new File(['hello'], 'image', { type: 'image/x-unknown' }),
    )
    const res = await req('/api/recipes/media', { method: 'POST', body: form })
    expect(res.status).toBe(400)
  })

  it('returns 404 for a missing asset', async () => {
    const res = await req('/api/recipes/media?path=assets/does-not-exist.png')
    expect(res.status).toBe(404)
  })
})
