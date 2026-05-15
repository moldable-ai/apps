import {
  WORKSPACE_HEADER,
  getAppDataDir,
  getWorkspaceFromRequest,
} from '@moldable-ai/storage'
import type { Context } from 'hono'

type JsonErrorStatus = 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 502 | 503

export type ImageRequest = {
  workspaceId?: string
  purpose?: string
  method?: string
  path?: string
  headers?: Record<string, string>
  body?: Record<string, unknown>
  multipartFields?: Record<string, string>
  multipartFiles?: Record<string, string>
  timeoutMs?: number
}

export type ImageRequestResult<T> = {
  response?: {
    json?: T
    status?: number
  }
  error?: {
    message?: string
    code?: string
  }
  code?: string
  message?: string
}

export async function generateJson<T = unknown>(
  body: Record<string, unknown>,
): Promise<{ json: T; model?: string; usage?: unknown }> {
  const aiServerUrl = process.env.MOLDABLE_AI_SERVER_URL
  const appId = process.env.MOLDABLE_APP_ID
  const appToken = process.env.MOLDABLE_APP_TOKEN

  if (!aiServerUrl || !appId || !appToken) {
    throw new Error('Moldable AI server environment is not configured')
  }

  const res = await fetch(`${aiServerUrl}/api/llm/generate-json`, {
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

  const data = (await res.json().catch(() => ({}))) as {
    error?: string
    json?: T
    model?: string
    usage?: unknown
  }

  if (!res.ok || !data.json) {
    throw new Error(
      data.error ?? `LLM JSON generation failed with ${res.status}`,
    )
  }

  return data as { json: T; model?: string; usage?: unknown }
}

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

export async function imageRequest<T>(
  body: ImageRequest,
): Promise<ImageRequestResult<T>> {
  const aiServerUrl = process.env.MOLDABLE_AI_SERVER_URL
  const appId = process.env.MOLDABLE_APP_ID
  const appToken = process.env.MOLDABLE_APP_TOKEN

  if (!aiServerUrl || !appId || !appToken) {
    throw new Error('Moldable AI server environment is not configured')
  }

  const res = await fetch(`${aiServerUrl}/api/llm/images`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-moldable-app-id': appId,
      'x-moldable-app-token': appToken,
    },
    body: JSON.stringify({
      appId,
      purpose: 'microscope.openai-image-generation',
      ...body,
    }),
  })

  const parsed = (await res.json().catch(() => ({}))) as ImageRequestResult<T>
  if (!res.ok) {
    const message =
      parsed.message ??
      parsed.error?.message ??
      `Moldable image request failed with status ${res.status}`
    throw new Error(message)
  }

  return parsed
}

export { WORKSPACE_HEADER }
