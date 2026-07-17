import { app } from './app'
import { createArtifact, removeArtifact } from './operations'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const originalEnv = { ...process.env }
let tempHome = ''

beforeEach(async () => {
  tempHome = await mkdtemp(join(tmpdir(), 'artifacts-runtime-state-'))
  process.env = {
    ...originalEnv,
    MOLDABLE_HOME: tempHome,
    MOLDABLE_APP_ID: 'artifacts',
    MOLDABLE_WORKSPACE_ID: 'test',
  }
})

afterEach(async () => {
  process.env = originalEnv
  await rm(tempHome, { recursive: true, force: true })
})

describe('runtime state API', () => {
  it('persists, reads, and clears workspace-scoped artifact state', async () => {
    const artifact = await createArtifact('test', { title: 'State test' })
    const url = `/api/runtime-state/test/${artifact.id}/demo:v1`

    const write = await app.request(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-artifacts-client': '1',
      },
      body: JSON.stringify({ value: { room: 'kitchen', price: 875000 } }),
    })
    expect(write.status).toBe(200)

    const read = await app.request(url)
    expect(read.status).toBe(200)
    expect(await read.json()).toEqual({
      value: { room: 'kitchen', price: 875000 },
    })

    const clear = await app.request(url, {
      method: 'DELETE',
      headers: { 'x-artifacts-client': '1' },
    })
    expect(clear.status).toBe(200)
    expect(await (await app.request(url)).json()).toEqual({ value: null })

    await removeArtifact('test', artifact.id)
    expect((await app.request(url)).status).toBe(404)
  })

  it('rejects invalid namespaces and unauthenticated writes', async () => {
    const artifact = await createArtifact('test', { title: 'Validation test' })
    const invalid = await app.request(
      `/api/runtime-state/test/${artifact.id}/bad%2Fnamespace`,
    )
    expect(invalid.status).toBe(400)

    const forbidden = await app.request(
      `/api/runtime-state/test/${artifact.id}/demo:v1`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: { ok: true } }),
      },
    )
    expect(forbidden.status).toBe(403)
  })
})
