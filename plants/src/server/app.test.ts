import type { Plant } from '../lib/types'
import { app } from './app'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const originalEnv = { ...process.env }

let tempHome: string | undefined

function request(
  path: string,
  init: RequestInit = {},
  workspaceId = 'review',
): Request {
  const headers = new Headers(init.headers)
  headers.set('x-moldable-workspace-id', workspaceId)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return new Request(`http://plants.test${path}`, {
    ...init,
    headers,
  })
}

async function json<T>(response: Response): Promise<T> {
  expect(response.ok).toBe(true)
  return (await response.json()) as T
}

describe('Plants server mutations', () => {
  beforeEach(async () => {
    tempHome = await mkdtemp(join(tmpdir(), 'plants-app-'))
    process.env = { ...originalEnv }
    process.env.MOLDABLE_HOME = tempHome
    process.env.MOLDABLE_APP_ID = 'plants'
    delete process.env.MOLDABLE_APP_DATA_DIR
    delete process.env.MOLDABLE_APP_TOKEN
  })

  afterEach(async () => {
    process.env = originalEnv
    if (tempHome) {
      await rm(tempHome, { recursive: true, force: true })
      tempHome = undefined
    }
  })

  it('preserves concurrent plant creates in the same workspace', async () => {
    await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        app.fetch(
          request('/api/plants', {
            method: 'POST',
            body: JSON.stringify({ commonName: `Plant ${index + 1}` }),
          }),
        ),
      ),
    )

    const plants = await json<Plant[]>(await app.fetch(request('/api/plants')))

    expect(plants).toHaveLength(8)
    expect(new Set(plants.map((plant) => plant.commonName)).size).toBe(8)
  })

  it('preserves concurrent watering updates for different plants', async () => {
    const [first, second] = await Promise.all(
      ['Aloe', 'Pothos'].map(async (commonName) =>
        json<Plant>(
          await app.fetch(
            request('/api/plants', {
              method: 'POST',
              body: JSON.stringify({ commonName, waterIntervalDays: 7 }),
            }),
          ),
        ),
      ),
    )

    await Promise.all([
      app.fetch(
        request(`/api/plants/${first.id}/water`, {
          method: 'POST',
          body: JSON.stringify({ at: '2026-06-01T10:00:00.000Z' }),
        }),
      ),
      app.fetch(
        request(`/api/plants/${second.id}/water`, {
          method: 'POST',
          body: JSON.stringify({ at: '2026-06-01T11:00:00.000Z' }),
        }),
      ),
    ])

    const plants = await json<Plant[]>(await app.fetch(request('/api/plants')))

    expect(plants.find((plant) => plant.id === first.id)?.lastWateredAt).toBe(
      '2026-06-01T10:00:00.000Z',
    )
    expect(plants.find((plant) => plant.id === second.id)?.lastWateredAt).toBe(
      '2026-06-01T11:00:00.000Z',
    )
  })
})
