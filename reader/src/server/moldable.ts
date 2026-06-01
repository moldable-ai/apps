import {
  WORKSPACE_HEADER,
  getAppDataDir,
  getWorkspaceFromRequest,
} from '@moldable-ai/storage'
import type { Context } from 'hono'

type JsonErrorStatus = 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 502 | 503

export function getWorkspaceId(c: Context): string | undefined {
  return getWorkspaceFromRequest(c.req.raw)
}

export function getDataDir(c: Context): string {
  return getAppDataDir(getWorkspaceId(c))
}

/**
 * Resolve the data dir for asset subrequests (covers, chapter resources) that
 * the browser loads via <img src> and therefore cannot carry the workspace
 * header. Falls back to a `?w=` query param, then the default workspace.
 */
export function getAssetDataDir(c: Context): string {
  const header = getWorkspaceId(c)
  if (header) return getAppDataDir(header)
  const query = new URL(c.req.url).searchParams.get('w') ?? undefined
  return getAppDataDir(query)
}

export function jsonError(
  c: Context,
  message: string,
  status: JsonErrorStatus = 500,
) {
  return c.json({ error: message }, status)
}

export { WORKSPACE_HEADER }
