import type { MailMessageDetail, MailMessageSummary } from './gmail-service'
import {
  readCachedMessage,
  reconcileCachedFolderPage,
  updateCachedThreadLabels,
  writeCachedMessage,
} from './message-cache'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let moldableHome: string

beforeEach(async () => {
  moldableHome = await mkdtemp(path.join(tmpdir(), 'mail-message-cache-'))
  vi.stubEnv('MOLDABLE_HOME', moldableHome)
  vi.stubEnv('MOLDABLE_APP_ID', 'mail')
  vi.unstubAllGlobals()
  await mkdir(
    path.join(moldableHome, 'workspaces', 'personal', 'apps', 'mail'),
    {
      recursive: true,
    },
  )
})

afterEach(async () => {
  vi.unstubAllEnvs()
  await rm(moldableHome, { recursive: true, force: true })
})

function message(
  id: string,
  overrides: Partial<MailMessageDetail> = {},
): MailMessageDetail {
  const labelIds = overrides.labelIds ?? ['INBOX']
  return {
    id,
    threadId: overrides.threadId ?? id,
    from: overrides.from ?? 'Sender <sender@example.com>',
    to: overrides.to ?? 'rob@example.com',
    cc: overrides.cc ?? '',
    subject: overrides.subject ?? `Subject ${id}`,
    date: overrides.date ?? 'Mon, 01 Jun 2026 12:00:00 +0000',
    snippet: overrides.snippet ?? 'Snippet',
    bodyText: overrides.bodyText ?? '',
    bodyHtml: overrides.bodyHtml ?? '',
    bodyHtmlText: overrides.bodyHtmlText ?? '',
    attachments: overrides.attachments ?? [],
    labelIds,
    unread: labelIds.includes('UNREAD'),
    starred: labelIds.includes('STARRED'),
    important: labelIds.includes('IMPORTANT'),
    internalDate: overrides.internalDate ?? 1000,
    snoozedUntil: overrides.snoozedUntil,
    bodyCached: overrides.bodyCached,
    unsubscribe: overrides.unsubscribe,
  }
}

function summary(item: MailMessageDetail): MailMessageSummary {
  return item
}

describe('message cache reconciliation', () => {
  it('removes stale folder labels for missing messages inside the refreshed page window', async () => {
    const fresh = message('fresh', { internalDate: 300 })
    const staleNewer = message('stale-newer', { internalDate: 350 })
    const staleOlder = message('stale-older', { internalDate: 250 })

    await writeCachedMessage('personal', fresh)
    await writeCachedMessage('personal', staleNewer)
    await writeCachedMessage('personal', staleOlder)

    await reconcileCachedFolderPage({
      workspaceId: 'personal',
      labelId: 'INBOX',
      freshMessages: [summary(fresh)],
      nextPageToken: 'next-page',
    })

    expect(
      (await readCachedMessage('personal', 'stale-newer'))?.labelIds,
    ).not.toContain('INBOX')
    expect(await readCachedMessage('personal', 'stale-older')).toMatchObject({
      labelIds: ['INBOX'],
    })
    expect(await readCachedMessage('personal', 'fresh')).toMatchObject({
      labelIds: ['INBOX'],
    })
  })

  it('removes stale folder labels from all missing messages when the refreshed page is complete', async () => {
    const fresh = message('fresh', { internalDate: 300 })
    const staleOlder = message('stale-older', { internalDate: 250 })

    await writeCachedMessage('personal', fresh)
    await writeCachedMessage('personal', staleOlder)

    await reconcileCachedFolderPage({
      workspaceId: 'personal',
      labelId: 'INBOX',
      freshMessages: [summary(fresh)],
    })

    expect(
      (await readCachedMessage('personal', 'stale-older'))?.labelIds,
    ).not.toContain('INBOX')
  })

  it('updates cached labels for every message in a thread', async () => {
    const first = message('thread-message-1', {
      threadId: 'thread-1',
      labelIds: ['INBOX', 'UNREAD'],
    })
    const second = message('thread-message-2', {
      threadId: 'thread-1',
      labelIds: ['INBOX', 'STARRED'],
    })
    const unrelated = message('other-message', {
      threadId: 'thread-2',
      labelIds: ['INBOX'],
    })

    await writeCachedMessage('personal', first)
    await writeCachedMessage('personal', second)
    await writeCachedMessage('personal', unrelated)

    await updateCachedThreadLabels('personal', 'thread-1', {
      removeLabelIds: ['INBOX'],
      addLabelIds: ['IMPORTANT'],
    })

    expect(
      (await readCachedMessage('personal', 'thread-message-1'))?.labelIds,
    ).toEqual(['UNREAD', 'IMPORTANT'])
    expect(
      (await readCachedMessage('personal', 'thread-message-2'))?.labelIds,
    ).toEqual(['STARRED', 'IMPORTANT'])
    expect(await readCachedMessage('personal', 'other-message')).toMatchObject({
      labelIds: ['INBOX'],
    })
  })
})
