import type { ImageQuality } from '../../shared/types'
import { invokeAivaultJson } from '../aivault'
import { downloadAssets, findFirstValue } from './assets'
import { MODEL_DOWNLOAD_TIMEOUT_MS, MODEL_REQUEST_TIMEOUT_MS } from './timeouts'
import type {
  CreatedModelTask,
  DownloadedModel,
  ModelRenderProvider,
  ModelRenderStatus,
} from './types'

const CAPABILITY_ID = 'fal/image-to-3d'
const POLL_INTERVAL_MS = 8_000
const MAX_POLLS = 90
const TRANSIENT_RETRY_ATTEMPTS = 3
const TRANSIENT_RETRY_DELAY_MS = 4_000
const RAPID_MODEL = 'fal-ai/hunyuan-3d/v3.1/rapid/image-to-3d'
const PRO_MODEL = 'fal-ai/hunyuan-3d/v3.1/pro/image-to-3d'

type FalTask = {
  modelId: string
  requestId: string
  statusPath?: string
  responsePath?: string
}

function selectModel(quality?: ImageQuality): string {
  return quality === 'high' ? PRO_MODEL : RAPID_MODEL
}

function modelDetail(modelId: string): string {
  return modelId.includes('/pro/') ? 'Pro' : 'Rapid'
}

function encodeTaskId(task: FalTask): string {
  return `fal-${Buffer.from(JSON.stringify(task)).toString('base64url')}`
}

function decodeTaskId(taskId: string): FalTask {
  if (!taskId.startsWith('fal-')) {
    return { modelId: RAPID_MODEL, requestId: taskId }
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(taskId.slice(4), 'base64url').toString('utf8'),
    ) as Partial<FalTask> & {
      request_id?: string
      response_url?: string
      status_url?: string
    }
    return {
      modelId: parsed.modelId ?? RAPID_MODEL,
      requestId: parsed.requestId ?? parsed.request_id ?? taskId,
      statusPath: parsed.statusPath ?? pathFromUrl(parsed.status_url),
      responsePath: parsed.responsePath ?? pathFromUrl(parsed.response_url),
    }
  } catch {
    return { modelId: RAPID_MODEL, requestId: taskId }
  }
}

function pathFromUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  try {
    const url = new URL(value)
    if (url.hostname !== 'queue.fal.run') return undefined
    return `${url.pathname}${url.search}`
  } catch {
    return undefined
  }
}

function statusPath(task: FalTask): string {
  const path =
    task.statusPath ??
    `/${task.modelId}/requests/${encodeURIComponent(task.requestId)}/status`
  return path.includes('?') ? `${path}&logs=1` : `${path}?logs=1`
}

function responsePath(task: FalTask): string {
  return (
    task.responsePath ??
    `/${task.modelId}/requests/${encodeURIComponent(task.requestId)}`
  )
}

function isTransientFalError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return (
    /request failed with (429|502|503|504)\b/i.test(message) ||
    /timed out|ECONNRESET|ETIMEDOUT|socket hang up/i.test(message)
  )
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function withTransientRetries<T>(
  operation: () => Promise<T>,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= TRANSIENT_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (!isTransientFalError(error) || attempt === TRANSIENT_RETRY_ATTEMPTS) {
        throw error
      }
      await wait(TRANSIENT_RETRY_DELAY_MS * attempt)
    }
  }
  throw lastError
}

function normalizeStatus(status: unknown): ModelRenderStatus {
  const value = String(status ?? '')
    .trim()
    .toLowerCase()
  if (!value) return 'queued'
  if (['in_queue', 'queued', 'pending'].includes(value)) return 'queued'
  if (['in_progress', 'running', 'processing'].includes(value)) return 'running'
  if (
    ['completed', 'complete', 'done', 'success', 'succeeded'].includes(value)
  ) {
    return 'success'
  }
  if (['failed', 'error', 'cancelled', 'canceled'].includes(value))
    return 'failed'
  return 'running'
}

function hasExplicitNullResponseUrl(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false
  const record = raw as Record<string, unknown>
  return record.response_url === null || record.responseUrl === null
}

async function createTask({
  workspaceId,
  inputImageUrl,
  quality,
}: {
  workspaceId?: string
  inputImageUrl: string
  quality?: ImageQuality
}): Promise<CreatedModelTask> {
  const modelId = selectModel(quality)
  const raw = await withTransientRetries(() =>
    invokeAivaultJson<unknown>(workspaceId, CAPABILITY_ID, {
      method: 'POST',
      path: `/${modelId}`,
      headers: { 'content-type': 'application/json' },
      body: {
        input_image_url: inputImageUrl,
        enable_pbr: false,
      },
      timeoutMs: MODEL_REQUEST_TIMEOUT_MS,
    }),
  )
  const requestId = findFirstValue(raw, ['request_id', 'requestId', 'id'])
  if (!requestId)
    throw new Error('fal task response did not include a request id.')

  return {
    taskId: encodeTaskId({
      modelId,
      requestId,
      statusPath: pathFromUrl(findFirstValue(raw, ['status_url', 'statusUrl'])),
      responsePath: pathFromUrl(
        findFirstValue(raw, ['response_url', 'responseUrl']),
      ),
    }),
    modelDetail: modelDetail(modelId),
    maxPolls: MAX_POLLS,
    pollIntervalMs: POLL_INTERVAL_MS,
  }
}

async function getStatus(
  workspaceId: string | undefined,
  taskId: string,
): Promise<ModelRenderStatus> {
  const task = decodeTaskId(taskId)
  let raw: unknown
  try {
    raw = await withTransientRetries(() =>
      invokeAivaultJson<unknown>(workspaceId, CAPABILITY_ID, {
        method: 'GET',
        path: statusPath(task),
        timeoutMs: MODEL_REQUEST_TIMEOUT_MS,
      }),
    )
  } catch (error) {
    if (isTransientFalError(error)) return 'running'
    throw error
  }
  const status = normalizeStatus(findFirstValue(raw, ['status']))
  if (status === 'success' && findFirstValue(raw, ['error', 'error_type'])) {
    return 'failed'
  }
  if (status === 'success' && hasExplicitNullResponseUrl(raw)) {
    throw new Error(
      'fal completed the queue job but did not publish a 3D model result. The 2D image is still available; regenerate the 3D model to retry.',
    )
  }
  return status
}

async function downloadModel(
  workspaceId: string | undefined,
  taskId: string,
): Promise<DownloadedModel> {
  const task = decodeTaskId(taskId)
  const raw = await withTransientRetries(() =>
    invokeAivaultJson<unknown>(workspaceId, CAPABILITY_ID, {
      method: 'GET',
      path: responsePath(task),
      timeoutMs: MODEL_REQUEST_TIMEOUT_MS,
    }),
  )
  return downloadAssets(raw, MODEL_DOWNLOAD_TIMEOUT_MS, 'fal')
}

export const falProvider: ModelRenderProvider = {
  id: 'fal',
  label: 'fal Hunyuan3D',
  createTask,
  getStatus,
  downloadModel,
}
