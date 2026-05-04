import {
  WORKSPACE_HEADER,
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  safePath,
} from '@moldable-ai/storage'
import type { Context } from 'hono'
import { appendFile } from 'node:fs/promises'

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

function previewText(value: string, maxLength = 1_000) {
  const compact = value.replaceAll(/\s+/g, ' ').trim()
  return compact.length > maxLength
    ? `${compact.slice(0, maxLength)}… (${compact.length} chars total)`
    : compact
}

function summarizeGenerateJsonRequest(body: Record<string, unknown>) {
  const prompt = typeof body.prompt === 'string' ? body.prompt : ''
  return {
    purpose: body.purpose,
    workspaceId: body.workspaceId,
    schemaName: body.schemaName,
    reasoningEffort: body.reasoningEffort,
    promptChars: prompt.length,
    promptMessageCount: (prompt.match(/^ID: /gm) ?? []).length,
    hasSchema: typeof body.schema === 'object' && body.schema !== null,
  }
}

function generateJsonFailureRecord({
  body,
  responseText,
  response,
  parseError,
}: {
  body: Record<string, unknown>
  responseText: string
  response: Response
  parseError?: unknown
}) {
  return {
    timestamp: new Date().toISOString(),
    request: summarizeGenerateJsonRequest(body),
    response: {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      bodyPreview: previewText(responseText),
    },
    parseError:
      parseError instanceof Error
        ? { name: parseError.name, message: parseError.message }
        : parseError
          ? String(parseError)
          : undefined,
  }
}

async function appendGenerateJsonFailureDiagnostic(
  record: ReturnType<typeof generateJsonFailureRecord>,
) {
  const workspaceId =
    typeof record.request.workspaceId === 'string'
      ? record.request.workspaceId
      : undefined
  const dataDir = getAppDataDir(workspaceId)
  await ensureDir(dataDir)
  await appendFile(
    safePath(dataDir, 'llm-generate-json-failures.jsonl'),
    `${JSON.stringify(record)}\n`,
    'utf8',
  )
}

function logGenerateJsonFailure({
  body,
  responseText,
  response,
  parseError,
}: {
  body: Record<string, unknown>
  responseText: string
  response: Response
  parseError?: unknown
}) {
  const record = generateJsonFailureRecord({
    body,
    responseText,
    response,
    parseError,
  })

  try {
    console.warn(
      '[mail:llm-generate-json-failure]',
      JSON.stringify(record, null, 2),
    )
  } catch {
    console.warn('[mail:llm-generate-json-failure]', response.status)
  }

  void appendGenerateJsonFailureDiagnostic(record).catch((error) => {
    console.warn('Failed to write LLM diagnostic:', error)
  })
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

  let responseText = ''
  try {
    responseText = await res.text()
  } catch (error) {
    logGenerateJsonFailure({
      body,
      response: res,
      responseText,
      parseError: error,
    })
    throw new Error(
      `LLM JSON generation failed reading response body: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }

  let data: {
    error?: string
    json?: T
    model?: string
    usage?: unknown
  } = {}
  let parseError: unknown

  try {
    data = JSON.parse(responseText) as typeof data
  } catch (error) {
    parseError = error
  }

  if (!res.ok || parseError) {
    logGenerateJsonFailure({ body, response: res, responseText, parseError })
  }

  if (parseError) {
    throw new Error(
      `LLM JSON generation returned invalid JSON with status ${res.status}`,
    )
  }

  if (!res.ok) {
    throw new Error(
      data.error || `LLM JSON generation failed with status ${res.status}`,
    )
  }

  return data as { json: T; model: string; usage?: unknown }
}

export { WORKSPACE_HEADER }
