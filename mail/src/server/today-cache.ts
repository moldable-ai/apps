import {
  ensureDir,
  getAppDataDir,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'

const TODAY_CACHE_FILENAME = 'today.json'

export interface CachedTodayPayload {
  generatedAt: string
  items: unknown[]
  resume: unknown
}

function todayCachePath(workspaceId?: string) {
  return safePath(getAppDataDir(workspaceId), TODAY_CACHE_FILENAME)
}

export async function readCachedToday(workspaceId?: string) {
  return readJson<CachedTodayPayload | null>(todayCachePath(workspaceId), null)
}

export async function writeCachedToday(
  workspaceId: string | undefined,
  payload: CachedTodayPayload,
) {
  await ensureDir(getAppDataDir(workspaceId))
  await writeJson(todayCachePath(workspaceId), payload)
}
