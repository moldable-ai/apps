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

const CAPABILITY_ID = 'tripo/image-to-3d'
const MODEL_VERSION = 'P1-20260311'
const POLL_INTERVAL_MS = 8_000
const MAX_POLLS = 90

type TripoFileInput =
  | { type: 'image'; file_token: string }
  | { type: 'image'; object: { bucket: string; key: string } }

function textureQuality(quality?: ImageQuality): 'standard' | 'detailed' {
  return quality === 'high' ? 'detailed' : 'standard'
}

function faceLimit(quality?: ImageQuality): number {
  return quality === 'high' ? 20_000 : 12_000
}

function decodeTaskId(taskId: string): string {
  return taskId.startsWith('tripo-') ? taskId.slice(6) : taskId
}

function encodeTaskId(taskId: string): string {
  return `tripo-${taskId}`
}

function assertOk(raw: unknown): void {
  if (!raw || typeof raw !== 'object') return
  const record = raw as Record<string, unknown>
  if (typeof record.code === 'number' && record.code !== 0) {
    const message =
      findFirstValue(raw, ['message', 'msg', 'error']) ??
      `Tripo returned code ${record.code}.`
    throw new Error(message)
  }
}

function normalizeStatus(status: unknown): ModelRenderStatus {
  const value = String(status ?? '')
    .trim()
    .toLowerCase()
  if (!value) return 'queued'
  if (['queued', 'pending'].includes(value)) return 'queued'
  if (['running', 'processing'].includes(value)) return 'running'
  if (
    ['success', 'succeeded', 'completed', 'complete', 'done'].includes(value)
  ) {
    return 'success'
  }
  if (
    [
      'failed',
      'error',
      'banned',
      'expired',
      'cancelled',
      'canceled',
      'unknown',
    ].includes(value)
  ) {
    return 'failed'
  }
  return 'running'
}

function fileInputFromUpload(raw: unknown): TripoFileInput {
  const resourceUri = findFirstValue(raw, [
    'resource_uri',
    'resourceUri',
    'key',
  ])
  if (resourceUri) {
    return {
      type: 'image',
      object: {
        bucket: findFirstValue(raw, ['bucket']) ?? 'tripo-data',
        key: resourceUri,
      },
    }
  }

  const fileToken = findFirstValue(raw, [
    'image_token',
    'imageToken',
    'file_token',
    'fileToken',
  ])
  if (fileToken) return { type: 'image', file_token: fileToken }

  throw new Error(
    'Tripo upload response did not include an image token or object key.',
  )
}

async function uploadImage(
  workspaceId: string | undefined,
  sourcePath: string,
): Promise<TripoFileInput> {
  const raw = await invokeAivaultJson<unknown>(workspaceId, CAPABILITY_ID, {
    method: 'POST',
    path: '/v2/openapi/upload/sts',
    multipartFiles: {
      file: sourcePath,
    },
    timeoutMs: MODEL_REQUEST_TIMEOUT_MS,
  })
  assertOk(raw)
  return fileInputFromUpload(raw)
}

async function createTask({
  workspaceId,
  sourcePath,
  quality,
}: {
  workspaceId?: string
  sourcePath: string
  quality?: ImageQuality
}): Promise<CreatedModelTask> {
  const file = await uploadImage(workspaceId, sourcePath)
  const raw = await invokeAivaultJson<unknown>(workspaceId, CAPABILITY_ID, {
    method: 'POST',
    path: '/v2/openapi/task',
    headers: { 'content-type': 'application/json' },
    body: {
      type: 'image_to_model',
      file,
      model_version: MODEL_VERSION,
      face_limit: faceLimit(quality),
      texture: true,
      pbr: true,
      texture_quality: textureQuality(quality),
      texture_alignment: 'original_image',
      orientation: 'align_image',
      export_uv: true,
      enable_image_autofix: false,
    },
    timeoutMs: MODEL_REQUEST_TIMEOUT_MS,
  })
  assertOk(raw)
  const taskId = findFirstValue(raw, ['task_id', 'taskId', 'id'])
  if (!taskId) throw new Error('Tripo task response did not include a task id.')

  return {
    taskId: encodeTaskId(taskId),
    modelDetail: MODEL_VERSION,
    maxPolls: MAX_POLLS,
    pollIntervalMs: POLL_INTERVAL_MS,
  }
}

async function getStatus(
  workspaceId: string | undefined,
  taskId: string,
): Promise<ModelRenderStatus> {
  const raw = await invokeAivaultJson<unknown>(workspaceId, CAPABILITY_ID, {
    method: 'GET',
    path: `/v2/openapi/task/${encodeURIComponent(decodeTaskId(taskId))}`,
    timeoutMs: MODEL_REQUEST_TIMEOUT_MS,
  })
  assertOk(raw)
  return normalizeStatus(findFirstValue(raw, ['status']))
}

async function downloadModel(
  workspaceId: string | undefined,
  taskId: string,
): Promise<DownloadedModel> {
  const raw = await invokeAivaultJson<unknown>(workspaceId, CAPABILITY_ID, {
    method: 'GET',
    path: `/v2/openapi/task/${encodeURIComponent(decodeTaskId(taskId))}`,
    timeoutMs: MODEL_REQUEST_TIMEOUT_MS,
  })
  assertOk(raw)
  return downloadAssets(raw, MODEL_DOWNLOAD_TIMEOUT_MS, 'Tripo')
}

export const tripoProvider: ModelRenderProvider = {
  id: 'tripo',
  label: 'Tripo',
  createTask,
  getStatus,
  downloadModel,
}
