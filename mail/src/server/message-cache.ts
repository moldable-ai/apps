import {
  ensureDir,
  getAppDataDir,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import type { MailMessageDetail, MailMessageSummary } from './gmail-service'
import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'

export interface CachedMailMessage {
  cachedAt: string
  detailCached: boolean
  message: MailMessageDetail
}

function messageCacheDir(workspaceId: string) {
  return safePath(getAppDataDir(workspaceId), 'messages')
}

function cacheFileName(id: string) {
  const safeName = id.replace(/[^a-zA-Z0-9_-]/g, '_') || 'item'
  if (safeName.length <= 80) return `${safeName}.json`

  const digest = createHash('sha256').update(id).digest('hex').slice(0, 16)
  return `${safeName.slice(0, 64)}_${digest}.json`
}

function cacheDirName(id: string) {
  return cacheFileName(id).replace(/\.json$/, '')
}

function messageCachePath(workspaceId: string, id: string) {
  return safePath(messageCacheDir(workspaceId), cacheFileName(id))
}

function attachmentCacheDir(workspaceId: string, messageId: string) {
  return safePath(
    getAppDataDir(workspaceId),
    'attachments',
    cacheDirName(messageId),
  )
}

function attachmentCachePath(
  workspaceId: string,
  messageId: string,
  attachmentId: string,
) {
  return safePath(
    attachmentCacheDir(workspaceId, messageId),
    cacheFileName(attachmentId),
  )
}

export async function readCachedMessage(
  workspaceId: string,
  id: string,
  options: { requireDetail?: boolean } = {},
): Promise<MailMessageDetail | null> {
  const cached = await readJson<CachedMailMessage | null>(
    messageCachePath(workspaceId, id),
    null,
  )

  if (!cached?.message || cached.message.id !== id) return null
  if (options.requireDetail && !cached.detailCached) return null
  return cached.message
}

export async function writeCachedMessage(
  workspaceId: string,
  message: MailMessageDetail,
  options: { detailCached?: boolean } = {},
) {
  await ensureDir(messageCacheDir(workspaceId))
  await writeJson(messageCachePath(workspaceId, message.id), {
    cachedAt: new Date().toISOString(),
    detailCached: options.detailCached === true,
    message,
  } satisfies CachedMailMessage)
}

export async function writeCachedMessageSummary(
  workspaceId: string,
  summary: MailMessageSummary,
) {
  await ensureDir(messageCacheDir(workspaceId))

  const current = await readJson<CachedMailMessage | null>(
    messageCachePath(workspaceId, summary.id),
    null,
  )
  const currentMessage = current?.message
  const detailCached = current?.detailCached === true

  const message: MailMessageDetail = {
    ...(currentMessage ?? {
      cc: '',
      bodyText: '',
      bodyHtml: '',
      bodyHtmlText: '',
      attachments: [],
    }),
    ...summary,
    cc: currentMessage?.cc ?? '',
    bodyText: currentMessage?.bodyText ?? summary.bodyText ?? '',
    bodyHtml: currentMessage?.bodyHtml ?? '',
    bodyHtmlText: currentMessage?.bodyHtmlText ?? summary.bodyHtmlText ?? '',
    attachments: currentMessage?.attachments ?? summary.attachments ?? [],
  }

  await writeJson(messageCachePath(workspaceId, summary.id), {
    cachedAt: new Date().toISOString(),
    detailCached,
    message,
  } satisfies CachedMailMessage)
}

export async function readCachedMessages(workspaceId: string) {
  let entries: string[]
  try {
    entries = await readdir(messageCacheDir(workspaceId))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }

  const messages = await Promise.all(
    entries
      .filter((entry) => entry.endsWith('.json'))
      .map(async (entry) => {
        const cached = await readJson<CachedMailMessage | null>(
          safePath(messageCacheDir(workspaceId), entry),
          null,
        )
        return cached?.message ?? null
      }),
  )
  return messages.filter(
    (message): message is MailMessageDetail => message !== null,
  )
}

export async function readCachedAttachment(
  workspaceId: string,
  messageId: string,
  attachmentId: string,
): Promise<Buffer | null> {
  try {
    return await readFile(
      attachmentCachePath(workspaceId, messageId, attachmentId),
    )
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

export async function writeCachedAttachment({
  workspaceId,
  messageId,
  attachmentId,
  data,
}: {
  workspaceId: string
  messageId: string
  attachmentId: string
  data: Buffer
}) {
  await ensureDir(attachmentCacheDir(workspaceId, messageId))
  await writeFile(
    attachmentCachePath(workspaceId, messageId, attachmentId),
    data,
  )
}

function applyLabelChanges<T extends MailMessageDetail>(
  message: T,
  changes: { addLabelIds?: string[]; removeLabelIds?: string[] },
): T {
  const labelIds = new Set(message.labelIds)
  for (const labelId of changes.removeLabelIds ?? []) labelIds.delete(labelId)
  for (const labelId of changes.addLabelIds ?? []) labelIds.add(labelId)

  const nextLabelIds = [...labelIds]
  return {
    ...message,
    labelIds: nextLabelIds,
    unread: labelIds.has('UNREAD'),
    starred: labelIds.has('STARRED'),
    important: labelIds.has('IMPORTANT'),
  }
}

export async function updateCachedMessageLabels(
  workspaceId: string,
  id: string,
  changes: { addLabelIds?: string[]; removeLabelIds?: string[] },
) {
  const cached = await readJson<CachedMailMessage | null>(
    messageCachePath(workspaceId, id),
    null,
  )

  if (!cached?.message || cached.message.id !== id) return

  await writeJson(messageCachePath(workspaceId, id), {
    ...cached,
    cachedAt: new Date().toISOString(),
    message: applyLabelChanges(cached.message, changes),
  } satisfies CachedMailMessage)
}

export async function updateCachedThreadLabels(
  workspaceId: string,
  threadId: string,
  changes: { addLabelIds?: string[]; removeLabelIds?: string[] },
) {
  let entries: string[]
  try {
    entries = await readdir(messageCacheDir(workspaceId))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 0
    throw error
  }

  let changed = 0
  await Promise.all(
    entries
      .filter((entry) => entry.endsWith('.json'))
      .map(async (entry) => {
        const filePath = safePath(messageCacheDir(workspaceId), entry)
        const cached = await readJson<CachedMailMessage | null>(filePath, null)
        const message = cached?.message
        if (!cached || !message || message.threadId !== threadId) return

        await writeJson(filePath, {
          ...cached,
          cachedAt: new Date().toISOString(),
          message: applyLabelChanges(message, changes),
        } satisfies CachedMailMessage)
        changed += 1
      }),
  )

  return changed
}

export async function reconcileCachedFolderPage({
  workspaceId,
  labelId,
  freshMessages,
  nextPageToken,
}: {
  workspaceId: string
  labelId: string
  freshMessages: MailMessageSummary[]
  nextPageToken?: string
}) {
  const freshIds = new Set(freshMessages.map((message) => message.id))
  const oldestFreshDate = Math.min(
    ...freshMessages.map((message) => message.internalDate),
  )
  const completeFolder = !nextPageToken

  if (freshIds.size === 0 && !completeFolder) return 0

  let entries: string[]
  try {
    entries = await readdir(messageCacheDir(workspaceId))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 0
    throw error
  }

  let changed = 0
  await Promise.all(
    entries
      .filter((entry) => entry.endsWith('.json'))
      .map(async (entry) => {
        const filePath = safePath(messageCacheDir(workspaceId), entry)
        const cached = await readJson<CachedMailMessage | null>(filePath, null)
        const message = cached?.message
        if (!cached || !message || freshIds.has(message.id)) return
        if (!message.labelIds.includes(labelId)) return
        if (!completeFolder && message.internalDate < oldestFreshDate) return

        const labelIds = message.labelIds.filter((id) => id !== labelId)
        await writeJson(filePath, {
          ...cached,
          cachedAt: new Date().toISOString(),
          message: {
            ...message,
            labelIds,
            unread: labelIds.includes('UNREAD'),
            starred: labelIds.includes('STARRED'),
            important: labelIds.includes('IMPORTANT'),
          },
        } satisfies CachedMailMessage)
        changed += 1
      }),
  )

  return changed
}

export function mergeCachedBodyIntoSummary(
  summary: MailMessageSummary,
  cached: MailMessageDetail,
): MailMessageSummary {
  return {
    ...summary,
    bodyText: cached.bodyText,
    bodyHtmlText: cached.bodyHtmlText,
    attachments: cached.attachments ?? [],
    bodyCached: true,
  }
}
