import {
  ensureDir,
  getAppDataDir,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'

const SNOOZE_FILENAME = 'snooze.json'

interface SnoozeEntry {
  id: string
  threadId?: string
  until: number
  snoozedAt: number
}

interface SnoozeStore {
  version: 1
  entries: SnoozeEntry[]
}

const EMPTY_STORE: SnoozeStore = { version: 1, entries: [] }

function getSnoozePath(workspaceId?: string) {
  return safePath(getAppDataDir(workspaceId), SNOOZE_FILENAME)
}

async function readSnoozeStore(workspaceId?: string): Promise<SnoozeStore> {
  const stored = await readJson<SnoozeStore | null>(
    getSnoozePath(workspaceId),
    null,
  )
  if (!stored || stored.version !== 1 || !Array.isArray(stored.entries)) {
    return { ...EMPTY_STORE }
  }
  return stored
}

async function writeSnoozeStore(
  workspaceId: string | undefined,
  store: SnoozeStore,
) {
  await ensureDir(getAppDataDir(workspaceId))
  await writeJson(getSnoozePath(workspaceId), store)
}

export async function snoozeMessage({
  workspaceId,
  id,
  threadId,
  until,
}: {
  workspaceId?: string
  id: string
  threadId?: string
  until: number
}) {
  const store = await readSnoozeStore(workspaceId)
  const now = Date.now()
  const filtered = store.entries.filter((entry) => entry.id !== id)
  filtered.push({ id, threadId, until, snoozedAt: now })
  await writeSnoozeStore(workspaceId, { version: 1, entries: filtered })
}

export async function unsnoozeMessage({
  workspaceId,
  id,
}: {
  workspaceId?: string
  id: string
}) {
  const store = await readSnoozeStore(workspaceId)
  const filtered = store.entries.filter((entry) => entry.id !== id)
  if (filtered.length !== store.entries.length) {
    await writeSnoozeStore(workspaceId, { version: 1, entries: filtered })
  }
}

export async function getActiveSnoozeIds(workspaceId?: string) {
  const store = await readSnoozeStore(workspaceId)
  const now = Date.now()
  return new Set(
    store.entries.filter((entry) => entry.until > now).map((entry) => entry.id),
  )
}

export async function listActiveSnoozes(workspaceId?: string) {
  const store = await readSnoozeStore(workspaceId)
  const now = Date.now()
  return store.entries
    .filter((entry) => entry.until > now)
    .sort((a, b) => a.until - b.until)
}

export async function popExpiredSnoozes(workspaceId?: string) {
  const store = await readSnoozeStore(workspaceId)
  const now = Date.now()
  const expired: SnoozeEntry[] = []
  const remaining: SnoozeEntry[] = []
  for (const entry of store.entries) {
    if (entry.until <= now) expired.push(entry)
    else remaining.push(entry)
  }
  if (expired.length > 0) {
    await writeSnoozeStore(workspaceId, { version: 1, entries: remaining })
  }
  return expired
}

export async function getSnoozeEntry(
  workspaceId: string | undefined,
  id: string,
) {
  const store = await readSnoozeStore(workspaceId)
  return store.entries.find((entry) => entry.id === id) ?? null
}
