import { readCachedToday, writeCachedToday } from './today-cache'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let moldableHome: string

beforeEach(async () => {
  moldableHome = await mkdtemp(path.join(tmpdir(), 'mail-today-cache-'))
  vi.stubEnv('MOLDABLE_HOME', moldableHome)
  vi.stubEnv('MOLDABLE_APP_ID', 'mail')
  vi.unstubAllGlobals()
})

afterEach(async () => {
  vi.unstubAllEnvs()
  await rm(moldableHome, { recursive: true, force: true })
})

describe('today cache', () => {
  it('returns null when no cached Today payload exists', async () => {
    expect(await readCachedToday('personal')).toBeNull()
  })

  it('persists the Today payload per workspace', async () => {
    await mkdir(
      path.join(moldableHome, 'workspaces', 'personal', 'apps', 'mail'),
      { recursive: true },
    )

    await writeCachedToday('personal', {
      generatedAt: '2026-06-01T18:00:00.000Z',
      items: [
        {
          id: 'mail:important-unread',
          kind: 'timely',
          title: '2 important emails unread',
        },
      ],
      resume: {
        title: 'Draft reply',
      },
    })

    expect(await readCachedToday('personal')).toMatchObject({
      generatedAt: '2026-06-01T18:00:00.000Z',
      items: [
        {
          id: 'mail:important-unread',
          title: '2 important emails unread',
        },
      ],
      resume: {
        title: 'Draft reply',
      },
    })
    expect(await readCachedToday('work')).toBeNull()
  })
})
