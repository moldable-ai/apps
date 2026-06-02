import type { TranslationRecord } from '../lib/types'
import { app } from './app'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const workspaceId = 'review-workspace'
const appId = 'translate-test'

const originalEnv = {
  MOLDABLE_APP_DATA_DIR: process.env.MOLDABLE_APP_DATA_DIR,
  MOLDABLE_APP_ID: process.env.MOLDABLE_APP_ID,
  MOLDABLE_HOME: process.env.MOLDABLE_HOME,
}

let tempHome: string

function historyPath() {
  return path.join(
    tempHome,
    'workspaces',
    workspaceId,
    'apps',
    appId,
    'data',
    'history.json',
  )
}

async function writeHistory(records: unknown[]) {
  const filePath = historyPath()
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(records), 'utf-8')
}

function request(pathname: string, init?: RequestInit) {
  return app.request(pathname, {
    ...init,
    headers: {
      'x-moldable-workspace': workspaceId,
      ...init?.headers,
    },
  })
}

describe('Translate API', () => {
  beforeEach(async () => {
    tempHome = await fs.mkdtemp(path.join(os.tmpdir(), 'translate-app-'))
    process.env.MOLDABLE_HOME = tempHome
    process.env.MOLDABLE_APP_ID = appId
    delete process.env.MOLDABLE_APP_DATA_DIR
  })

  afterEach(async () => {
    if (originalEnv.MOLDABLE_HOME === undefined)
      delete process.env.MOLDABLE_HOME
    else process.env.MOLDABLE_HOME = originalEnv.MOLDABLE_HOME

    if (originalEnv.MOLDABLE_APP_ID === undefined) {
      delete process.env.MOLDABLE_APP_ID
    } else {
      process.env.MOLDABLE_APP_ID = originalEnv.MOLDABLE_APP_ID
    }

    if (originalEnv.MOLDABLE_APP_DATA_DIR === undefined) {
      delete process.env.MOLDABLE_APP_DATA_DIR
    } else {
      process.env.MOLDABLE_APP_DATA_DIR = originalEnv.MOLDABLE_APP_DATA_DIR
    }

    await fs.rm(tempHome, { recursive: true, force: true })
  })

  it('filters malformed persisted history records', async () => {
    const newest: TranslationRecord = {
      id: 'newest',
      createdAt: '2026-06-02T12:00:00.000Z',
      sourceText: 'Hello',
      translatedText: 'Bonjour',
      requestedSource: 'auto',
      sourceLanguage: 'en',
      targetLanguage: 'fr',
    }
    const oldest: TranslationRecord = {
      id: 'oldest',
      createdAt: '2026-06-01T12:00:00.000Z',
      sourceText: 'Goodbye',
      translatedText: 'Adios',
      requestedSource: 'en',
      sourceLanguage: 'en',
      targetLanguage: 'es',
    }

    await writeHistory([
      { id: 'missing-required-fields' },
      {
        ...newest,
        id: 'invalid-language',
        targetLanguage: 'toString',
      },
      oldest,
      newest,
    ])

    const res = await request('/api/history')

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual([newest, oldest])
  })

  it('rejects history records with unsupported language codes', async () => {
    const res = await request('/api/history', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sourceText: 'Hello',
        translatedText: 'Hallo',
        requestedSource: 'auto',
        sourceLanguage: 'en',
        targetLanguage: 'constructor',
      }),
    })

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining('Unsupported language code'),
    })
  })

  it('returns same-language translations without requiring provider credentials', async () => {
    const res = await request('/api/translate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: 'Keep this local',
        from: 'en',
        to: 'en',
      }),
    })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      translatedText: 'Keep this local',
      detectedSourceLanguage: 'en',
    })
  })

  it('rejects malformed translate JSON as a bad request', async () => {
    const res = await request('/api/translate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    })

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Invalid JSON' })
  })

  it('persists RPC translations to workspace history', async () => {
    const res = await request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'translate.text',
        params: {
          text: 'Remember me',
          from: 'en',
          to: 'en',
        },
      }),
    })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      result: {
        translatedText: 'Remember me',
        detectedSourceLanguage: 'en',
      },
    })

    const historyRes = await request('/api/history')
    expect(historyRes.status).toBe(200)
    await expect(historyRes.json()).resolves.toMatchObject([
      {
        sourceText: 'Remember me',
        translatedText: 'Remember me',
        requestedSource: 'en',
        sourceLanguage: 'en',
        targetLanguage: 'en',
      },
    ])
  })

  it('rejects malformed RPC JSON as invalid params', async () => {
    const res = await request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    })

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: 'invalid_params',
        message: 'Translate received invalid JSON.',
      },
    })
  })

  it('serializes concurrent history writes for the same workspace', async () => {
    const writes = Array.from({ length: 20 }, (_, index) =>
      request('/api/history', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sourceText: `Source ${index}`,
          translatedText: `Translated ${index}`,
          requestedSource: 'en',
          sourceLanguage: 'en',
          targetLanguage: 'es',
        }),
      }),
    )

    const responses = await Promise.all(writes)
    expect(responses.every((res) => res.status === 200)).toBe(true)

    const historyRes = await request('/api/history')
    expect(historyRes.status).toBe(200)
    const history = (await historyRes.json()) as TranslationRecord[]

    expect(history).toHaveLength(20)
    expect(new Set(history.map((record) => record.sourceText)).size).toBe(20)
  })
})
