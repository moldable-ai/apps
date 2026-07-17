import { app } from './app'
import { createDeck, removeDeck } from './operations'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const originalEnv = { ...process.env }
let tempHome = ''

beforeEach(async () => {
  tempHome = await mkdtemp(join(tmpdir(), 'slides-runtime-state-'))
  process.env = {
    ...originalEnv,
    MOLDABLE_HOME: tempHome,
    MOLDABLE_APP_ID: 'slides',
    MOLDABLE_WORKSPACE_ID: 'test',
  }
})

afterEach(async () => {
  process.env = originalEnv
  await rm(tempHome, { recursive: true, force: true })
})

describe('runtime state API', () => {
  it('persists, reads, and clears workspace-scoped deck state', async () => {
    const deck = await createDeck('test', { title: 'State test' })
    const url = `/api/runtime-state/test/${deck.id}/demo:v1`

    const write = await app.request(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-slides-client': '1',
      },
      body: JSON.stringify({ value: { votes: 7, notes: ['ship it'] } }),
    })
    expect(write.status).toBe(200)

    const read = await app.request(url)
    expect(read.status).toBe(200)
    expect(await read.json()).toEqual({
      value: { votes: 7, notes: ['ship it'] },
    })

    const clear = await app.request(url, {
      method: 'DELETE',
      headers: { 'x-slides-client': '1' },
    })
    expect(clear.status).toBe(200)
    expect(await (await app.request(url)).json()).toEqual({ value: null })

    await removeDeck('test', deck.id)
    expect((await app.request(url)).status).toBe(404)
  })

  it('rejects invalid namespaces and unauthenticated writes', async () => {
    const deck = await createDeck('test', { title: 'Validation test' })
    const invalid = await app.request(
      `/api/runtime-state/test/${deck.id}/bad%2Fnamespace`,
    )
    expect(invalid.status).toBe(400)

    const forbidden = await app.request(
      `/api/runtime-state/test/${deck.id}/demo:v1`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: { ok: true } }),
      },
    )
    expect(forbidden.status).toBe(403)
  })
})
