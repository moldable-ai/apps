import {
  WORKSPACE_HEADER,
  getAppDataDir,
  getWorkspaceFromRequest,
} from '@moldable-ai/storage'
import type { Context } from 'hono'

type JsonErrorStatus = 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 502 | 503
const WORKSPACE_ID_RE = /^[A-Za-z0-9_-]{1,128}$/

export function isValidWorkspaceId(value: string): boolean {
  return WORKSPACE_ID_RE.test(value)
}

export function rawWorkspaceId(c: Context): string | undefined {
  return (
    c.req.header(WORKSPACE_HEADER) ??
    getWorkspaceFromRequest(c.req.raw) ??
    c.req.query('workspace') ??
    undefined
  )
}

export function getWorkspaceId(c: Context): string | undefined {
  // Iframe `src` URLs (preview/thumbnails) can't set headers, so also accept a
  // `?workspace=` query param. Header still wins when present.
  const workspaceId = rawWorkspaceId(c)
  if (!workspaceId) return undefined
  if (!isValidWorkspaceId(workspaceId)) {
    throw new Error('Invalid workspace id')
  }
  return workspaceId
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
  response?: { json?: T; status?: number }
  error?: { message?: string; code?: string }
  code?: string
  message?: string
}

// Image generation/editing via the host AI proxy (gpt-image). No API key needed;
// the proxy injects credentials. Mirrors the Redecorate/Images image path.
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
      purpose: 'images.openai-image-generation',
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

export async function generateJson<T = unknown>(body: Record<string, unknown>) {
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

  if (!res.ok) {
    throw new Error(`LLM JSON generation failed with status ${res.status}`)
  }

  return res.json() as Promise<{ json: T; model: string; usage?: unknown }>
}

export { WORKSPACE_HEADER }
