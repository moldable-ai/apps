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

export function jsonError(
  c: Context,
  message: string,
  status: JsonErrorStatus = 500,
) {
  return c.json({ error: message }, status)
}

export async function completion(body: Record<string, unknown>) {
  const aiServerUrl = process.env.MOLDABLE_AI_SERVER_URL
  const appId = process.env.MOLDABLE_APP_ID
  const appToken = process.env.MOLDABLE_APP_TOKEN

  if (!aiServerUrl || !appId || !appToken) {
    throw new Error('Moldable AI server environment is not configured')
  }

  const res = await fetch(`${aiServerUrl}/api/llm/completion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-moldable-app-id': appId,
      'x-moldable-app-token': appToken,
    },
    body: JSON.stringify({
      appId,
      ...body,
    }),
  })

  if (!res.ok) {
    throw new Error(`LLM completion failed with status ${res.status}`)
  }

  return res.json() as Promise<{ text: string; model: string; usage?: unknown }>
}

export { WORKSPACE_HEADER }
