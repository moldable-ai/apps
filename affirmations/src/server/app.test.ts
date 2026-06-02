import { app } from './app'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const workspaceHeader = 'x-moldable-workspace'
let moldableHome: string

function favoritesPath(workspaceId: string) {
  return path.join(
    moldableHome,
    'workspaces',
    workspaceId,
    'apps',
    'affirmations',
    'data',
    'favorites.json',
  )
}

async function seedFavorites(workspaceId: string, favorites: string[]) {
  const filePath = favoritesPath(workspaceId)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(favorites), 'utf8')
}

async function readSeededFavorites(workspaceId: string) {
  return JSON.parse(
    await readFile(favoritesPath(workspaceId), 'utf8'),
  ) as string[]
}

async function requestJson(
  pathname: string,
  init: RequestInit & { workspaceId?: string } = {},
) {
  const headers = new Headers(init.headers)
  if (init.workspaceId) headers.set(workspaceHeader, init.workspaceId)

  return app.fetch(
    new Request(`http://affirmations.test${pathname}`, {
      ...init,
      headers,
    }),
  )
}

beforeEach(async () => {
  moldableHome = await mkdtemp(path.join(tmpdir(), 'affirmations-test-'))
  process.env.MOLDABLE_HOME = moldableHome
  process.env.MOLDABLE_APP_ID = 'affirmations'
  delete process.env.MOLDABLE_APP_DATA_DIR
  delete process.env.MOLDABLE_WORKSPACE_ID
})

afterEach(async () => {
  await rm(moldableHome, { recursive: true, force: true })
  delete process.env.MOLDABLE_HOME
  delete process.env.MOLDABLE_APP_ID
})

describe('favorites API', () => {
  it('rejects invalid workspace headers before touching storage', async () => {
    const response = await requestJson('/api/favorites', {
      workspaceId: '../../outside',
    })

    expect(response.status).toBe(400)
  })

  it('rejects invalid favorite save bodies without overwriting existing data', async () => {
    await seedFavorites('personal', ['Keep this'])

    const response = await requestJson('/api/favorites', {
      method: 'POST',
      workspaceId: 'personal',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favorites: [] }),
    })

    expect(response.status).toBe(400)
    expect(await readSeededFavorites('personal')).toEqual(['Keep this'])
  })

  it('normalizes and deduplicates favorite saves', async () => {
    const response = await requestJson('/api/favorites', {
      method: 'POST',
      workspaceId: 'personal',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([' Keep this ', 'Keep this', '', 'Another']),
    })

    expect(response.status).toBe(200)

    const readResponse = await requestJson('/api/favorites', {
      workspaceId: 'personal',
    })
    await expect(readResponse.json()).resolves.toEqual(['Keep this', 'Another'])
  })

  it('updates one favorite item without overwriting unrelated favorites', async () => {
    await seedFavorites('personal', ['Existing'])

    const addResponse = await requestJson('/api/favorites/item', {
      method: 'POST',
      workspaceId: 'personal',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'New favorite', favorite: true }),
    })

    expect(addResponse.status).toBe(200)
    await expect(addResponse.json()).resolves.toEqual([
      'Existing',
      'New favorite',
    ])

    const removeResponse = await requestJson('/api/favorites/item', {
      method: 'POST',
      workspaceId: 'personal',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Existing', favorite: false }),
    })

    expect(removeResponse.status).toBe(200)
    await expect(removeResponse.json()).resolves.toEqual(['New favorite'])
    await expect(readSeededFavorites('personal')).resolves.toEqual([
      'New favorite',
    ])
  })

  it('keeps favorites isolated by workspace', async () => {
    await requestJson('/api/favorites', {
      method: 'POST',
      workspaceId: 'personal',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(['Personal']),
    })
    await requestJson('/api/favorites', {
      method: 'POST',
      workspaceId: 'work',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(['Work']),
    })

    await expect(readSeededFavorites('personal')).resolves.toEqual(['Personal'])
    await expect(readSeededFavorites('work')).resolves.toEqual(['Work'])
  })
})

describe('affirmations RPC', () => {
  it('rejects invalid workspace headers', async () => {
    const response = await requestJson('/api/moldable/rpc', {
      method: 'POST',
      workspaceId: '../bad',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'affirmations.favorites.list' }),
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: 'invalid_workspace' },
    })
  })

  it('returns no results for unknown category IDs', async () => {
    const response = await requestJson('/api/moldable/rpc', {
      method: 'POST',
      workspaceId: 'personal',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'affirmations.list',
        params: { categoryId: 'missing-category' },
      }),
    })

    await expect(response.json()).resolves.toEqual({ ok: true, result: [] })
  })

  it('trims search queries before matching', async () => {
    const response = await requestJson('/api/moldable/rpc', {
      method: 'POST',
      workspaceId: 'personal',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'affirmations.search',
        params: { query: ' peace ', limit: 5 },
      }),
    })
    const body = (await response.json()) as {
      ok: boolean
      result: Array<{ text: string }>
    }

    expect(body.ok).toBe(true)
    expect(body.result.length).toBeGreaterThan(0)
    expect(body.result.every((item) => /peace/i.test(item.text))).toBe(true)
  })
})
