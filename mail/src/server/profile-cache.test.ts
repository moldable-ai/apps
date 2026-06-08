import { readCachedProfile, writeCachedProfile } from './profile-cache'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let moldableHome: string

beforeEach(async () => {
  moldableHome = await mkdtemp(path.join(tmpdir(), 'mail-profile-cache-'))
  vi.stubEnv('MOLDABLE_HOME', moldableHome)
  vi.stubEnv('MOLDABLE_APP_ID', 'mail')
  vi.unstubAllGlobals()
})

afterEach(async () => {
  vi.unstubAllEnvs()
  await rm(moldableHome, { recursive: true, force: true })
})

describe('profile cache', () => {
  it('returns null when no cached profile exists', async () => {
    expect(await readCachedProfile('personal')).toBeNull()
  })

  it('persists cached profile per workspace', async () => {
    await mkdir(
      path.join(moldableHome, 'workspaces', 'personal', 'apps', 'mail'),
      { recursive: true },
    )

    await writeCachedProfile('personal', {
      emailAddress: 'user@example.com',
      messagesTotal: 12,
      threadsTotal: 8,
    })

    expect(await readCachedProfile('personal')).toMatchObject({
      emailAddress: 'user@example.com',
      messagesTotal: 12,
      threadsTotal: 8,
    })
    expect(await readCachedProfile('work')).toBeNull()
  })
})
