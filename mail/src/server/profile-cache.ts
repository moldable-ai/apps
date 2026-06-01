import {
  ensureDir,
  getAppDataDir,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import type { MailProfile } from './gmail-service'

const PROFILE_CACHE_FILENAME = 'profile.json'

export interface CachedMailProfile {
  cachedAt: string
  profile: MailProfile | null
}

function profileCachePath(workspaceId?: string) {
  return safePath(getAppDataDir(workspaceId), PROFILE_CACHE_FILENAME)
}

export async function readCachedProfile(workspaceId?: string) {
  const cached = await readJson<CachedMailProfile | null>(
    profileCachePath(workspaceId),
    null,
  )
  return cached?.profile ?? null
}

export async function writeCachedProfile(
  workspaceId: string | undefined,
  profile: MailProfile | null,
) {
  await ensureDir(getAppDataDir(workspaceId))
  await writeJson(profileCachePath(workspaceId), {
    cachedAt: new Date().toISOString(),
    profile,
  } satisfies CachedMailProfile)
}
