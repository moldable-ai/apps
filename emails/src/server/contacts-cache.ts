import {
  ensureDir,
  getAppDataDir,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import type { MailContact } from './gmail-service'

interface CachedContacts {
  cachedAt: string
  contacts: MailContact[]
}

function contactsCachePath(workspaceId: string) {
  return safePath(getAppDataDir(workspaceId), 'contacts.json')
}

export async function readCachedContacts(workspaceId: string) {
  const cached = await readJson<CachedContacts | null>(
    contactsCachePath(workspaceId),
    null,
  )
  return cached?.contacts ?? null
}

export async function writeCachedContacts(
  workspaceId: string,
  contacts: MailContact[],
) {
  await ensureDir(getAppDataDir(workspaceId))
  await writeJson(contactsCachePath(workspaceId), {
    cachedAt: new Date().toISOString(),
    contacts,
  } satisfies CachedContacts)
}
