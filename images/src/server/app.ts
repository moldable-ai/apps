import {
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { imageRequest } from './moldable'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { basename, extname, isAbsolute } from 'node:path'
import { z } from 'zod'

const MODEL = 'gpt-image-2'
const DEFAULT_QUALITY = 'medium'
const STORE_FILE = 'image-threads.json'
const IMAGE_GENERATION_TIMEOUT_MS = 600_000
const SERVER_STARTED_AT_MS = Date.now()
const ORPHANED_GENERATION_MESSAGE =
  'Images restarted before this generation finished. Retry to start it again.'

const aspectRatioSchema = z.enum([
  'square',
  'portrait',
  'story',
  'landscape',
  'widescreen',
])
const qualitySchema = z.enum(['low', 'medium', 'high', 'auto'])

type AspectRatioId = z.infer<typeof aspectRatioSchema>
type Quality = z.infer<typeof qualitySchema>

type AspectRatio = {
  id: AspectRatioId
  label: string
  ratio: string
  size: `${number}x${number}`
}

const ASPECT_RATIOS: Record<AspectRatioId, AspectRatio> = {
  square: {
    id: 'square',
    label: 'Square',
    ratio: '1:1',
    size: '1024x1024',
  },
  portrait: {
    id: 'portrait',
    label: 'Portrait',
    ratio: '3:4',
    size: '1200x1600',
  },
  story: {
    id: 'story',
    label: 'Story',
    ratio: '9:16',
    size: '1088x1936',
  },
  landscape: {
    id: 'landscape',
    label: 'Landscape',
    ratio: '4:3',
    size: '1600x1200',
  },
  widescreen: {
    id: 'widescreen',
    label: 'Widescreen',
    ratio: '16:9',
    size: '1936x1088',
  },
}

type ImageIteration = {
  id: string
  prompt: string
  kind: 'generation' | 'edit' | 'upload'
  aspectRatio: AspectRatioId
  size: string
  quality: Quality
  fileName: string
  mimeType: string
  model?: typeof MODEL
  parentIterationId?: string
  width?: number
  height?: number
  originalName?: string
  createdAt: string
}

type PendingIteration = {
  kind: 'edit'
  prompt: string
  aspectRatio: AspectRatioId
  quality: Quality
  baseIterationId?: string
  requestId?: string
  startedAt: string
}

type ImageThread = {
  id: string
  title: string
  prompt: string
  aspectRatio: AspectRatioId
  quality?: Quality
  status?: 'generating' | 'ready' | 'failed'
  errorMessage?: string
  pendingIteration?: PendingIteration
  pendingRequestId?: string
  coverIterationId?: string
  createdAt: string
  updatedAt: string
  iterations: ImageIteration[]
}

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string
    output_format?: string
    quality?: string
    size?: string
  }>
  error?: {
    message?: string
    code?: string
    type?: string
  }
}

type AivaultRequest = {
  method?: string
  path?: string
  headers?: Record<string, string>
  body?: Record<string, unknown>
  multipartFields?: Record<string, string>
  multipartFiles?: Record<string, string>
  timeoutMs?: number
}

type RpcErrorBody = {
  code: string
  message: string
  detail?: unknown
}

const rpcRequestSchema = z.object({
  method: z.string(),
  params: z.unknown().optional(),
})

const listParamsSchema = z
  .object({
    limit: z.number().int().min(1).max(100).optional(),
  })
  .optional()

const generateParamsSchema = z.object({
  prompt: z.string().trim().min(1),
  aspectRatio: aspectRatioSchema.optional(),
  quality: qualitySchema.optional(),
})

const getParamsSchema = z.object({
  id: z.string().trim().min(1),
})

const deleteThreadParamsSchema = getParamsSchema

const deleteIterationParamsSchema = z.object({
  id: z.string().trim().min(1),
  iterationId: z.array(z.string().trim().min(1)).min(1),
})

const retryParamsSchema = z.object({
  id: z.string().trim().min(1),
  quality: qualitySchema.optional(),
})

const cancelParamsSchema = z.object({
  id: z.string().trim().min(1),
  deleteEmptyThread: z.boolean().optional(),
})

const editParamsSchema = z.object({
  id: z.string().trim().min(1),
  baseIterationId: z.string().trim().min(1).optional(),
  prompt: z.string().trim().min(1),
  aspectRatio: aspectRatioSchema.optional(),
  quality: qualitySchema.optional(),
})

const setAspectRatioParamsSchema = z.object({
  id: z.string().trim().min(1),
  aspectRatio: aspectRatioSchema,
})

const importModeSchema = z.enum(['group', 'separate'])
const importPathsSchema = z.object({
  paths: z.array(z.string().min(1)).min(1).max(50),
  mode: importModeSchema.optional(),
})

const AIVAULT_ENV_KEYS = [
  'AIVAULT_DIR',
  'AIVAULTD_SOCKET',
  'AIVAULTD_SHARED_SOCKET',
  'HOME',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'LOGNAME',
  'PATH',
  'SHELL',
  'TMP',
  'TMPDIR',
  'USER',
] as const

function aivaultContextArgs(workspaceId?: string): string[] {
  const id = workspaceId?.trim()
  if (!id) return []

  const groupId =
    process.env.MOLDABLE_GROUP_ID?.trim() ||
    process.env.AIVAULT_GROUP_ID?.trim() ||
    id

  return ['--workspace-id', id, '--group-id', groupId]
}

function getAivaultEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const key of AIVAULT_ENV_KEYS) {
    const value = process.env[key]
    if (value) env[key] = value
  }
  const home = env.HOME
  if (home) {
    const preferredPath = [`${home}/.cargo/bin`, `${home}/.local/bin`]
    env.PATH = [preferredPath.join(':'), env.PATH].filter(Boolean).join(':')
  }
  return env
}

function aivaultBinary(): string {
  const explicit = process.env.AIVAULT_BIN?.trim()
  if (explicit) return explicit

  const home = process.env.HOME?.trim()
  const candidates = home
    ? [`${home}/.cargo/bin/aivault`, `${home}/.local/bin/aivault`]
    : []
  return candidates.find((candidate) => existsSync(candidate)) ?? 'aivault'
}

function workspaceLabel(workspaceId?: string): string {
  return workspaceId?.trim() || 'default'
}

function elapsedMs(startedAt: number): number {
  return Date.now() - startedAt
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function isTimeoutError(error: unknown): boolean {
  const message = errorMessage(error, '').toLowerCase()
  return message.includes('timed out') || message.includes('timeout')
}

function isCredentialError(error: unknown): boolean {
  return errorMessage(error, '').includes('CredentialNotFound')
}

function rpcErrorFromUnknown(error: unknown): RpcErrorBody {
  if (isTimeoutError(error)) {
    return {
      code: 'upstream_timeout',
      message:
        'OpenAI image generation timed out before Images received a response. Try again in a moment, or use a smaller aspect ratio if this keeps happening.',
    }
  }

  if (isCredentialError(error)) {
    return {
      code: 'credential_not_found',
      message:
        'Images could not access the OpenAI image-generation credential.',
    }
  }

  return {
    code: 'images_rpc_failed',
    message: errorMessage(error, 'Images could not complete the request.'),
  }
}

function summarizeRpcParams(params: unknown): string {
  if (!params || typeof params !== 'object') return 'none'
  const record = params as Record<string, unknown>
  const parts: string[] = []

  if (typeof record.id === 'string') parts.push(`id=${record.id}`)
  if (Array.isArray(record.iterationId)) {
    parts.push(`iterationIds=${record.iterationId.length}`)
  }
  if (typeof record.baseIterationId === 'string') {
    parts.push(`baseIterationId=${record.baseIterationId}`)
  }
  if (typeof record.aspectRatio === 'string') {
    parts.push(`aspectRatio=${record.aspectRatio}`)
  }
  if (typeof record.quality === 'string')
    parts.push(`quality=${record.quality}`)
  if (typeof record.prompt === 'string') {
    parts.push(`promptChars=${record.prompt.length}`)
  }
  if (typeof record.limit === 'number') parts.push(`limit=${record.limit}`)

  return parts.length ? parts.join(' ') : 'none'
}

function runAivault(
  args: string[],
  options: { timeoutMs?: number } = {},
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(aivaultBinary(), args, {
      env: getAivaultEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    let timedOut = false
    let settled = false
    const timeout =
      options.timeoutMs && options.timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true
            child.kill('SIGTERM')
          }, options.timeoutMs)
        : null

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk))
    child.on('error', (error) => {
      if (settled) return
      settled = true
      if (timeout) clearTimeout(timeout)
      reject(error)
    })
    child.on('close', (code) => {
      if (settled) return
      settled = true
      if (timeout) clearTimeout(timeout)
      if (timedOut) {
        reject(new Error(`aivault timed out after ${options.timeoutMs}ms`))
        return
      }

      if (code === 0) {
        resolve(Buffer.concat(stdout))
        return
      }

      const message = Buffer.concat(stderr).toString('utf8').trim()
      reject(
        new Error(
          message ||
            `aivault ${args.slice(0, 2).join(' ')} exited with code ${code}`,
        ),
      )
    })
  })
}

function canFallbackFromMoldableImageStatus(status?: number): boolean {
  return status === 401 || status === 403 || status === 404
}

async function invokeMoldableImages<T>(
  workspaceId: string | undefined,
  request: AivaultRequest,
): Promise<T | null> {
  const startedAt = Date.now()
  console.info(
    `[Images moldable-ai] start workspace=${workspaceLabel(workspaceId)} method=${request.method ?? 'POST'} path=${request.path ?? '/v1/images'} body=${request.body ? 'json' : request.multipartFields ? 'multipart' : 'empty'} timeoutMs=${request.timeoutMs ?? 'none'}`,
  )

  let parsed: {
    response?: { json?: unknown; status?: number }
    error?: { message?: string; code?: string }
    code?: string
    message?: string
  }

  try {
    parsed = await imageRequest<T>({
      workspaceId,
      purpose: 'images.openai-image-generation',
      ...request,
    })
  } catch (error) {
    const message = errorMessage(error, 'Moldable AI image request failed')
    if (
      message.includes('Moldable AI server environment is not configured') ||
      message.includes('codex_unavailable') ||
      message.includes('status 404')
    ) {
      console.warn(
        `[Images moldable-ai] unavailable workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)} message=${message}; falling back to aivault`,
      )
      return null
    }
    throw error
  }

  const status = parsed.response?.status
  if (canFallbackFromMoldableImageStatus(status)) {
    console.warn(
      `[Images moldable-ai] upstream status=${status} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}; falling back to aivault`,
    )
    return null
  }

  const json = (parsed.response?.json ?? parsed) as
    | (T & { error?: { message?: string } })
    | undefined
  if (status && status >= 400) {
    throw new Error(
      json?.error?.message ?? `OpenAI image request failed with ${status}`,
    )
  }
  if (!json) throw new Error('OpenAI image request returned no JSON body')

  console.info(
    `[Images moldable-ai] success workspace=${workspaceLabel(workspaceId)} method=${request.method ?? 'POST'} path=${request.path ?? '/v1/images'} status=${status ?? 'unknown'} durationMs=${elapsedMs(startedAt)}`,
  )
  return json as T
}

async function invokeOpenAIImages<T>(
  workspaceId: string | undefined,
  request: AivaultRequest,
): Promise<T> {
  const moldableResponse = await invokeMoldableImages<T>(workspaceId, request)
  if (moldableResponse) return moldableResponse

  const startedAt = Date.now()
  console.info(
    `[Images aivault] start workspace=${workspaceLabel(workspaceId)} method=${request.method ?? 'POST'} path=${request.path ?? '/v1/images'} body=${request.body ? 'json' : request.multipartFields ? 'multipart' : 'empty'} timeoutMs=${request.timeoutMs ?? 'none'}`,
  )

  const args = ['json', ...aivaultContextArgs(workspaceId)]
  if (request.method) args.push('--method', request.method)
  if (request.path) args.push('--path', request.path)
  if (request.timeoutMs) args.push('--timeout-ms', String(request.timeoutMs))
  for (const [name, value] of Object.entries(request.headers ?? {})) {
    args.push('--header', `${name}=${value}`)
  }
  if (request.body !== undefined) {
    args.push('--body', JSON.stringify(request.body))
  }
  for (const [name, value] of Object.entries(request.multipartFields ?? {})) {
    args.push('--multipart-field', `${name}=${value}`)
  }
  for (const [name, value] of Object.entries(request.multipartFiles ?? {})) {
    args.push('--multipart-file', `${name}=${value}`)
  }
  args.push('openai/image-generation')

  let output: Buffer
  try {
    output = await runAivault(args, { timeoutMs: request.timeoutMs })
  } catch (error) {
    console.error(
      `[Images aivault] failed workspace=${workspaceLabel(workspaceId)} method=${request.method ?? 'POST'} path=${request.path ?? '/v1/images'} durationMs=${elapsedMs(startedAt)} message=${errorMessage(error, 'aivault failed')}`,
    )
    throw error
  }

  const parsed = JSON.parse(output.toString('utf8')) as {
    response?: { json?: unknown; status?: number }
    error?: { message?: string }
  }

  const status = parsed.response?.status
  const json = (parsed.response?.json ?? parsed) as
    | (T & { error?: { message?: string } })
    | undefined

  if (status && status >= 400) {
    throw new Error(
      json?.error?.message ?? `OpenAI image request failed with ${status}`,
    )
  }
  if (!json) throw new Error('OpenAI image request returned no JSON body')
  console.info(
    `[Images aivault] success workspace=${workspaceLabel(workspaceId)} method=${request.method ?? 'POST'} path=${request.path ?? '/v1/images'} status=${status ?? 'unknown'} durationMs=${elapsedMs(startedAt)}`,
  )
  return json as T
}

function getWorkspaceId(request: Request): string | undefined {
  const fromQuery = new URL(request.url).searchParams.get('workspace')
  return (
    request.headers.get('x-moldable-workspace-id') ??
    getWorkspaceFromRequest(request) ??
    fromQuery ??
    undefined
  )
}

function dataDir(workspaceId?: string): string {
  return getAppDataDir(workspaceId)
}

function storePath(workspaceId?: string): string {
  return safePath(dataDir(workspaceId), STORE_FILE)
}

function assetPath(
  workspaceId: string | undefined,
  threadId: string,
  fileName: string,
): string {
  return safePath(dataDir(workspaceId), 'assets', threadId, fileName)
}

async function loadThreads(workspaceId?: string): Promise<ImageThread[]> {
  await ensureDir(dataDir(workspaceId))
  const threads = await readJson<ImageThread[]>(storePath(workspaceId), [])
  const recoveredThreads = recoverOrphanedGeneratingThreads(threads)

  if (recoveredThreads.recoveredCount > 0) {
    await saveThreads(workspaceId, recoveredThreads.threads)
    console.warn(
      `[Images] recovered_orphaned_generations workspace=${workspaceLabel(workspaceId)} count=${recoveredThreads.recoveredCount}`,
    )
  }

  return recoveredThreads.threads.sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )
}

async function saveThreads(
  workspaceId: string | undefined,
  threads: ImageThread[],
): Promise<void> {
  await ensureDir(dataDir(workspaceId))
  await writeJson(storePath(workspaceId), threads)
}

function latestIteration(thread: ImageThread): ImageIteration | undefined {
  return thread.iterations.at(-1)
}

function baseIterationForEdit(
  thread: ImageThread,
  baseIterationId?: string,
): ImageIteration | undefined {
  return baseIterationId
    ? thread.iterations.find((iteration) => iteration.id === baseIterationId)
    : latestIteration(thread)
}

function displayIteration(thread: ImageThread): ImageIteration | undefined {
  return (
    thread.iterations.find(
      (iteration) => iteration.id === thread.coverIterationId,
    ) ?? latestIteration(thread)
  )
}

function isOrphanedGeneratingThread(thread: ImageThread): boolean {
  if (thread.status !== 'generating') return false

  const updatedAtMs = Date.parse(thread.updatedAt || thread.createdAt)
  return Number.isFinite(updatedAtMs) && updatedAtMs < SERVER_STARTED_AT_MS
}

function isActiveRequest(thread: ImageThread, requestId: string): boolean {
  return (
    thread.status === 'generating' &&
    (!thread.pendingRequestId || thread.pendingRequestId === requestId)
  )
}

function recoverOrphanedGeneratingThreads(threads: ImageThread[]): {
  threads: ImageThread[]
  recoveredCount: number
} {
  let recoveredCount = 0
  const recovered = threads.map((thread) => {
    if (!isOrphanedGeneratingThread(thread)) return thread

    recoveredCount += 1
    const latest = latestIteration(thread)
    return {
      ...thread,
      aspectRatio: latest?.aspectRatio ?? thread.aspectRatio,
      quality: latest?.quality ?? thread.quality,
      status: latest ? 'ready' : 'failed',
      errorMessage: latest ? undefined : ORPHANED_GENERATION_MESSAGE,
      pendingIteration: undefined,
      pendingRequestId: undefined,
      updatedAt: new Date().toISOString(),
    } satisfies ImageThread
  })

  return { threads: recovered, recoveredCount }
}

function threadStatus(thread: ImageThread): NonNullable<ImageThread['status']> {
  return thread.status ?? (latestIteration(thread) ? 'ready' : 'generating')
}

function imageUrl(
  threadId: string,
  iterationId: string,
  workspaceId?: string,
): string {
  const path = `/api/images/assets/${encodeURIComponent(threadId)}/${encodeURIComponent(
    iterationId,
  )}`
  return workspaceId
    ? `${path}?workspace=${encodeURIComponent(workspaceId)}`
    : path
}

function serializeThread(thread: ImageThread, workspaceId?: string) {
  const latest = latestIteration(thread)
  const displayed = displayIteration(thread)
  return {
    ...thread,
    aspectRatio:
      thread.pendingIteration?.aspectRatio ??
      displayed?.aspectRatio ??
      thread.aspectRatio,
    quality: latest?.quality ?? thread.quality,
    status: threadStatus(thread),
    latestImageUrl: displayed
      ? imageUrl(thread.id, displayed.id, workspaceId)
      : null,
    iterations: thread.iterations.map((iteration) => ({
      ...iteration,
      imageUrl: imageUrl(thread.id, iteration.id, workspaceId),
    })),
  }
}

function titleFromPrompt(prompt: string): string {
  const words = prompt
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 7)
    .join(' ')
  return words.length > 56 ? `${words.slice(0, 53)}...` : words
}

function titleFromFileName(name: string): string {
  const baseName = basename(name, extname(name))
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return baseName || 'Imported image'
}

function fileExtensionForMime(mimeType: string): string | null {
  switch (mimeType.toLowerCase()) {
    case 'image/png':
      return 'png'
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg'
    case 'image/webp':
      return 'webp'
    case 'image/gif':
      return 'gif'
    case 'image/svg+xml':
      return 'svg'
    case 'image/heic':
      return 'heic'
    case 'image/heif':
      return 'heif'
    default:
      return null
  }
}

function fileExtensionForName(name: string): string | null {
  const extension = extname(name).replace(/^\./, '').toLowerCase()
  return /^[a-z0-9]{1,8}$/.test(extension) ? extension : null
}

function imageMimeTypeForName(name: string): string | null {
  switch (fileExtensionForName(name)) {
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    case 'svg':
      return 'image/svg+xml'
    case 'heic':
      return 'image/heic'
    case 'heif':
      return 'image/heif'
    default:
      return null
  }
}

function isUploadFile(value: FormDataEntryValue): value is File {
  return (
    typeof value === 'object' &&
    value !== null &&
    'arrayBuffer' in value &&
    'type' in value &&
    'name' in value
  )
}

function readUInt24LE(buffer: Buffer, offset: number): number {
  return buffer[offset] + (buffer[offset + 1] << 8) + (buffer[offset + 2] << 16)
}

function detectImageDimensions(
  buffer: Buffer,
  mimeType: string,
): { width: number; height: number } | null {
  if (mimeType === 'image/png' && buffer.length >= 24) {
    const signature = buffer.subarray(0, 8).toString('hex')
    if (signature === '89504e470d0a1a0a') {
      return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
      }
    }
  }

  if (
    (mimeType === 'image/jpeg' || mimeType === 'image/jpg') &&
    buffer.length > 4
  ) {
    let offset = 2
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) break
      const marker = buffer[offset + 1]
      const length = buffer.readUInt16BE(offset + 2)
      if (length < 2) break
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        }
      }
      offset += 2 + length
    }
  }

  if (mimeType === 'image/gif' && buffer.length >= 10) {
    const header = buffer.subarray(0, 3).toString('ascii')
    if (header === 'GIF') {
      return {
        width: buffer.readUInt16LE(6),
        height: buffer.readUInt16LE(8),
      }
    }
  }

  if (mimeType === 'image/webp' && buffer.length >= 30) {
    const riff = buffer.subarray(0, 4).toString('ascii')
    const webp = buffer.subarray(8, 12).toString('ascii')
    const chunk = buffer.subarray(12, 16).toString('ascii')
    if (riff === 'RIFF' && webp === 'WEBP') {
      if (chunk === 'VP8X' && buffer.length >= 30) {
        return {
          width: readUInt24LE(buffer, 24) + 1,
          height: readUInt24LE(buffer, 27) + 1,
        }
      }
      if (chunk === 'VP8L' && buffer.length >= 25) {
        const bits = buffer.readUInt32LE(21)
        return {
          width: (bits & 0x3fff) + 1,
          height: ((bits >> 14) & 0x3fff) + 1,
        }
      }
    }
  }

  return null
}

function inferAspectRatio(width?: number, height?: number): AspectRatioId {
  if (!width || !height) return 'square'

  const ratio = width / height
  const targets: Record<AspectRatioId, number> = {
    square: 1,
    portrait: 3 / 4,
    story: 9 / 16,
    landscape: 4 / 3,
    widescreen: 16 / 9,
  }

  return Object.entries(targets).reduce<AspectRatioId>((best, [id, value]) => {
    const currentDistance = Math.abs(Math.log(ratio / targets[best]))
    const nextDistance = Math.abs(Math.log(ratio / value))
    return nextDistance < currentDistance ? (id as AspectRatioId) : best
  }, 'square')
}

async function saveImageAsset({
  workspaceId,
  threadId,
  iterationId,
  b64Json,
}: {
  workspaceId?: string
  threadId: string
  iterationId: string
  b64Json: string
}): Promise<string> {
  const fileName = `${iterationId}.png`
  const path = assetPath(workspaceId, threadId, fileName)
  await ensureDir(safePath(dataDir(workspaceId), 'assets', threadId))
  await writeFile(path, Buffer.from(b64Json, 'base64'))
  return fileName
}

async function saveUploadedAsset({
  workspaceId,
  threadId,
  iterationId,
  file,
}: {
  workspaceId?: string
  threadId: string
  iterationId: string
  file: File
}): Promise<{
  fileName: string
  mimeType: string
  size: string
  width?: number
  height?: number
}> {
  const mimeType = file.type || 'application/octet-stream'
  if (!mimeType.startsWith('image/')) {
    throw new Error(`${file.name || 'File'} is not an image.`)
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const dimensions = detectImageDimensions(buffer, mimeType)
  const extension =
    fileExtensionForMime(mimeType) ?? fileExtensionForName(file.name) ?? 'img'
  const fileName = `${iterationId}.${extension}`
  const path = assetPath(workspaceId, threadId, fileName)
  await ensureDir(safePath(dataDir(workspaceId), 'assets', threadId))
  await writeFile(path, buffer)

  return {
    fileName,
    mimeType,
    size: dimensions ? `${dimensions.width}x${dimensions.height}` : 'unknown',
    width: dimensions?.width,
    height: dimensions?.height,
  }
}

async function saveLocalImageAsset({
  workspaceId,
  threadId,
  iterationId,
  sourcePath,
}: {
  workspaceId: string | undefined
  threadId: string
  iterationId: string
  sourcePath: string
}): Promise<{
  fileName: string
  mimeType: string
  size: string
  width?: number
  height?: number
  originalName: string
}> {
  if (!isAbsolute(sourcePath)) {
    throw new Error('Dropped image path must be absolute.')
  }

  const originalName = basename(sourcePath)
  const mimeType = imageMimeTypeForName(originalName)
  if (!mimeType) {
    throw new Error(`${originalName || 'File'} is not a supported image.`)
  }

  const buffer = await readFile(sourcePath)
  const dimensions = detectImageDimensions(buffer, mimeType)
  const extension =
    fileExtensionForMime(mimeType) ??
    fileExtensionForName(originalName) ??
    'img'
  const fileName = `${iterationId}.${extension}`
  const path = assetPath(workspaceId, threadId, fileName)
  await ensureDir(safePath(dataDir(workspaceId), 'assets', threadId))
  await writeFile(path, buffer)

  return {
    fileName,
    mimeType,
    size: dimensions ? `${dimensions.width}x${dimensions.height}` : 'unknown',
    width: dimensions?.width,
    height: dimensions?.height,
    originalName,
  }
}

async function importImages(
  workspaceId: string | undefined,
  files: File[],
  mode: z.infer<typeof importModeSchema>,
): Promise<ImageThread[]> {
  const now = new Date().toISOString()
  const createIteration = async (
    workspaceIdForAsset: string | undefined,
    threadId: string,
    file: File,
  ): Promise<ImageIteration> => {
    const iterationId = randomUUID()
    const asset = await saveUploadedAsset({
      workspaceId: workspaceIdForAsset,
      threadId,
      iterationId,
      file,
    })
    const aspectRatio = inferAspectRatio(asset.width, asset.height)

    return {
      id: iterationId,
      prompt: '',
      kind: 'upload',
      aspectRatio,
      size: asset.size,
      quality: DEFAULT_QUALITY,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
      originalName: file.name,
      createdAt: new Date().toISOString(),
    }
  }

  const importedThreads: ImageThread[] = []

  if (mode === 'group') {
    const threadId = randomUUID()
    const iterations: ImageIteration[] = []
    for (const file of files) {
      iterations.push(await createIteration(workspaceId, threadId, file))
    }

    const first = iterations[0]
    const thread: ImageThread = {
      id: threadId,
      title:
        files.length === 1
          ? titleFromFileName(files[0]?.name ?? '')
          : 'Imported images',
      prompt: '',
      aspectRatio: first?.aspectRatio ?? 'square',
      quality: DEFAULT_QUALITY,
      status: 'ready',
      coverIterationId: first?.id,
      createdAt: now,
      updatedAt: new Date().toISOString(),
      iterations,
    }
    importedThreads.push(thread)
  } else {
    for (const file of files) {
      const threadId = randomUUID()
      const iteration = await createIteration(workspaceId, threadId, file)
      importedThreads.push({
        id: threadId,
        title: titleFromFileName(file.name),
        prompt: '',
        aspectRatio: iteration.aspectRatio,
        quality: DEFAULT_QUALITY,
        status: 'ready',
        coverIterationId: iteration.id,
        createdAt: now,
        updatedAt: now,
        iterations: [iteration],
      })
    }
  }

  const threads = await loadThreads(workspaceId)
  await saveThreads(workspaceId, [...importedThreads, ...threads])
  return importedThreads
}

async function importImagePaths(
  workspaceId: string | undefined,
  paths: string[],
  mode: z.infer<typeof importModeSchema>,
): Promise<ImageThread[]> {
  const now = new Date().toISOString()
  const createIteration = async (
    workspaceIdForAsset: string | undefined,
    threadId: string,
    sourcePath: string,
  ): Promise<ImageIteration> => {
    const iterationId = randomUUID()
    const asset = await saveLocalImageAsset({
      workspaceId: workspaceIdForAsset,
      threadId,
      iterationId,
      sourcePath,
    })
    const aspectRatio = inferAspectRatio(asset.width, asset.height)

    return {
      id: iterationId,
      prompt: '',
      kind: 'upload',
      aspectRatio,
      size: asset.size,
      quality: DEFAULT_QUALITY,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
      originalName: asset.originalName,
      createdAt: new Date().toISOString(),
    }
  }

  const importedThreads: ImageThread[] = []

  if (mode === 'group') {
    const threadId = randomUUID()
    const iterations: ImageIteration[] = []
    for (const sourcePath of paths) {
      iterations.push(await createIteration(workspaceId, threadId, sourcePath))
    }

    const first = iterations[0]
    importedThreads.push({
      id: threadId,
      title:
        paths.length === 1
          ? titleFromFileName(basename(paths[0] ?? ''))
          : 'Imported images',
      prompt: '',
      aspectRatio: first?.aspectRatio ?? 'square',
      quality: DEFAULT_QUALITY,
      status: 'ready',
      coverIterationId: first?.id,
      createdAt: now,
      updatedAt: new Date().toISOString(),
      iterations,
    })
  } else {
    for (const sourcePath of paths) {
      const threadId = randomUUID()
      const iteration = await createIteration(workspaceId, threadId, sourcePath)
      importedThreads.push({
        id: threadId,
        title: titleFromFileName(basename(sourcePath)),
        prompt: '',
        aspectRatio: iteration.aspectRatio,
        quality: DEFAULT_QUALITY,
        status: 'ready',
        coverIterationId: iteration.id,
        createdAt: now,
        updatedAt: now,
        iterations: [iteration],
      })
    }
  }

  const threads = await loadThreads(workspaceId)
  await saveThreads(workspaceId, [...importedThreads, ...threads])
  return importedThreads
}

function imageFromResponse(response: OpenAIImageResponse): {
  b64Json: string
  size?: string
  quality?: Quality
} {
  const image = response.data?.[0]
  if (!image?.b64_json) {
    throw new Error(
      response.error?.message ?? 'OpenAI did not return an image payload.',
    )
  }

  return {
    b64Json: image.b64_json,
    size: image.size,
    quality: qualitySchema.safeParse(image.quality).success
      ? (image.quality as Quality)
      : undefined,
  }
}

async function buildGeneratedThread(
  workspaceId: string | undefined,
  threadId: string,
  params: z.infer<typeof generateParamsSchema>,
  options: { createdAt: string },
): Promise<ImageThread> {
  const aspectRatio = params.aspectRatio ?? 'square'
  const quality = params.quality ?? DEFAULT_QUALITY
  const aspect = ASPECT_RATIOS[aspectRatio]
  const response = await invokeOpenAIImages<OpenAIImageResponse>(workspaceId, {
    method: 'POST',
    path: '/v1/images/generations',
    headers: {
      'content-type': 'application/json',
    },
    body: {
      model: MODEL,
      prompt: params.prompt,
      n: 1,
      size: aspect.size,
      quality,
      output_format: 'png',
    },
    timeoutMs: IMAGE_GENERATION_TIMEOUT_MS,
  })
  const image = imageFromResponse(response)
  const now = new Date().toISOString()
  const iterationId = randomUUID()
  const fileName = await saveImageAsset({
    workspaceId,
    threadId,
    iterationId,
    b64Json: image.b64Json,
  })
  const thread: ImageThread = {
    id: threadId,
    title: titleFromPrompt(params.prompt),
    prompt: params.prompt,
    aspectRatio,
    quality,
    status: 'ready',
    createdAt: options.createdAt,
    updatedAt: now,
    iterations: [
      {
        id: iterationId,
        prompt: params.prompt,
        kind: 'generation',
        aspectRatio,
        size: image.size ?? aspect.size,
        quality: image.quality ?? quality,
        fileName,
        mimeType: 'image/png',
        model: MODEL,
        createdAt: now,
      },
    ],
  }
  return thread
}

async function createGeneratingThread(
  workspaceId: string | undefined,
  params: z.infer<typeof generateParamsSchema>,
  requestId: string,
): Promise<ImageThread> {
  const now = new Date().toISOString()
  const thread: ImageThread = {
    id: randomUUID(),
    title: titleFromPrompt(params.prompt),
    prompt: params.prompt,
    aspectRatio: params.aspectRatio ?? 'square',
    quality: params.quality ?? DEFAULT_QUALITY,
    status: 'generating',
    pendingRequestId: requestId,
    createdAt: now,
    updatedAt: now,
    iterations: [],
  }

  const threads = await loadThreads(workspaceId)
  threads.unshift(thread)
  await saveThreads(workspaceId, threads)

  void finishGeneratingThread(workspaceId, thread.id, params, requestId)
  return thread
}

async function retryThreadGeneration(
  workspaceId: string | undefined,
  params: z.infer<typeof retryParamsSchema>,
  requestId: string,
): Promise<ImageThread | null> {
  const threads = await loadThreads(workspaceId)
  const threadIndex = threads.findIndex((thread) => thread.id === params.id)
  const thread = threads[threadIndex]
  if (!thread) return null

  if (thread.status !== 'failed') {
    return thread
  }

  const retryParams: z.infer<typeof generateParamsSchema> = {
    prompt: thread.prompt,
    aspectRatio: thread.aspectRatio,
    quality: params.quality ?? thread.quality ?? DEFAULT_QUALITY,
  }
  const updated: ImageThread = {
    ...thread,
    status: 'generating',
    errorMessage: undefined,
    pendingRequestId: requestId,
    updatedAt: new Date().toISOString(),
  }

  threads.splice(threadIndex, 1)
  threads.unshift(updated)
  await saveThreads(workspaceId, threads)

  console.info(
    `[Images generation ${requestId}] retry_queued thread=${thread.id} workspace=${workspaceLabel(workspaceId)}`,
  )
  void finishGeneratingThread(workspaceId, thread.id, retryParams, requestId)
  return updated
}

async function finishGeneratingThread(
  workspaceId: string | undefined,
  threadId: string,
  params: z.infer<typeof generateParamsSchema>,
  requestId: string,
): Promise<void> {
  const startedAt = Date.now()
  try {
    console.info(
      `[Images generation ${requestId}] background_start thread=${threadId} workspace=${workspaceLabel(workspaceId)}`,
    )
    const initialThreads = await loadThreads(workspaceId)
    const pending = initialThreads.find((thread) => thread.id === threadId)
    if (!pending) {
      console.warn(
        `[Images generation ${requestId}] missing_pending_thread thread=${threadId} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return
    }
    if (!isActiveRequest(pending, requestId)) {
      console.info(
        `[Images generation ${requestId}] background_cancelled thread=${threadId} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return
    }

    const readyThread = await buildGeneratedThread(
      workspaceId,
      threadId,
      params,
      {
        createdAt: pending.createdAt,
      },
    )
    const threads = await loadThreads(workspaceId)
    const pendingIndex = threads.findIndex((thread) => thread.id === threadId)
    if (pendingIndex === -1) {
      console.warn(
        `[Images generation ${requestId}] missing_pending_thread_after_generation thread=${threadId} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return
    }
    if (!isActiveRequest(threads[pendingIndex], requestId)) {
      console.info(
        `[Images generation ${requestId}] background_cancelled_after_generation thread=${threadId} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return
    }
    threads.splice(pendingIndex, 1)
    threads.unshift(readyThread)
    await saveThreads(workspaceId, threads)
    console.info(
      `[Images generation ${requestId}] background_success thread=${threadId} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
    )
  } catch (error) {
    const rpcError = rpcErrorFromUnknown(error)
    const threads = await loadThreads(workspaceId)
    const threadIndex = threads.findIndex((thread) => thread.id === threadId)
    if (
      threadIndex !== -1 &&
      isActiveRequest(threads[threadIndex], requestId)
    ) {
      threads[threadIndex] = {
        ...threads[threadIndex],
        status: 'failed',
        errorMessage: rpcError.message,
        pendingRequestId: undefined,
        updatedAt: new Date().toISOString(),
      }
      await saveThreads(workspaceId, threads)
    }
    console.error(
      `[Images generation ${requestId}] background_failed thread=${threadId} workspace=${workspaceLabel(workspaceId)} code=${rpcError.code} durationMs=${elapsedMs(startedAt)} message=${errorMessage(error, rpcError.message)}`,
    )
  }
}

async function cancelPendingThread(
  workspaceId: string | undefined,
  params: z.infer<typeof cancelParamsSchema>,
  requestId: string,
): Promise<{
  cancelled: boolean
  deleted: boolean
  thread?: ImageThread
} | null> {
  const threads = await loadThreads(workspaceId)
  const threadIndex = threads.findIndex((thread) => thread.id === params.id)
  const thread = threads[threadIndex]
  if (!thread) return null

  const isGenerating = thread.status === 'generating'
  const hasPendingWork = isGenerating || Boolean(thread.pendingIteration)
  if (!hasPendingWork) {
    return { cancelled: false, deleted: false, thread }
  }

  const latest = latestIteration(thread)
  const deleteEmptyThread = params.deleteEmptyThread ?? true
  if (!latest && deleteEmptyThread) {
    threads.splice(threadIndex, 1)
    await saveThreads(workspaceId, threads)
    console.info(
      `[Images cancel ${requestId}] deleted_empty_pending_thread thread=${thread.id} workspace=${workspaceLabel(workspaceId)}`,
    )
    return { cancelled: true, deleted: true }
  }

  const now = new Date().toISOString()
  const updated: ImageThread = {
    ...thread,
    aspectRatio: latest?.aspectRatio ?? thread.aspectRatio,
    quality: latest?.quality ?? thread.quality,
    status: latest ? 'ready' : 'failed',
    errorMessage: latest ? undefined : 'Image generation was cancelled.',
    pendingIteration: undefined,
    pendingRequestId: undefined,
    updatedAt: now,
  }

  threads[threadIndex] = updated
  await saveThreads(workspaceId, threads)
  console.info(
    `[Images cancel ${requestId}] cleared_pending_thread thread=${thread.id} workspace=${workspaceLabel(workspaceId)}`,
  )
  return { cancelled: true, deleted: false, thread: updated }
}

async function deleteThread(
  workspaceId: string | undefined,
  params: z.infer<typeof deleteThreadParamsSchema>,
  requestId: string,
): Promise<{
  deleted: true
  deletedIterations: number
  id: string
} | null> {
  const threads = await loadThreads(workspaceId)
  const threadIndex = threads.findIndex((thread) => thread.id === params.id)
  const thread = threads[threadIndex]
  if (!thread) return null

  threads.splice(threadIndex, 1)
  await saveThreads(workspaceId, threads)

  await rm(safePath(dataDir(workspaceId), 'assets', thread.id), {
    force: true,
    recursive: true,
  })

  console.info(
    `[Images delete ${requestId}] deleted_thread thread=${thread.id} workspace=${workspaceLabel(workspaceId)} iterations=${thread.iterations.length}`,
  )

  return {
    deleted: true,
    deletedIterations: thread.iterations.length,
    id: thread.id,
  }
}

async function deleteIteration(
  workspaceId: string | undefined,
  params: z.infer<typeof deleteIterationParamsSchema>,
  requestId: string,
): Promise<{
  deleted: true
  deletedThread: boolean
  deletedIterationIds: string[]
  notFoundIterationIds: string[]
  thread?: ImageThread
} | null> {
  const threads = await loadThreads(workspaceId)
  const threadIndex = threads.findIndex((thread) => thread.id === params.id)
  const thread = threads[threadIndex]
  if (!thread) return null

  const requestedIterationIds = [...new Set(params.iterationId)]
  const requestedIterationIdSet = new Set(requestedIterationIds)
  const iterationsToDelete = thread.iterations.filter((iteration) =>
    requestedIterationIdSet.has(iteration.id),
  )
  if (iterationsToDelete.length === 0) return null

  const deletedIterationIds = iterationsToDelete.map(
    (iteration) => iteration.id,
  )
  const deletedIterationIdSet = new Set(deletedIterationIds)
  const notFoundIterationIds = requestedIterationIds.filter(
    (id) => !deletedIterationIdSet.has(id),
  )

  await Promise.all(
    iterationsToDelete.map((iteration) =>
      rm(assetPath(workspaceId, thread.id, iteration.fileName), {
        force: true,
      }),
    ),
  )

  const remainingIterations = thread.iterations.filter(
    (candidate) => !deletedIterationIdSet.has(candidate.id),
  )

  if (remainingIterations.length === 0) {
    threads.splice(threadIndex, 1)
    await saveThreads(workspaceId, threads)
    await rm(safePath(dataDir(workspaceId), 'assets', thread.id), {
      force: true,
      recursive: true,
    })
    console.info(
      `[Images delete ${requestId}] deleted_iterations_and_thread thread=${thread.id} iterations=${deletedIterationIds.length} workspace=${workspaceLabel(workspaceId)}`,
    )
    return {
      deleted: true,
      deletedThread: true,
      deletedIterationIds,
      notFoundIterationIds,
    }
  }

  const displayed = thread.coverIterationId
    ? remainingIterations.find(
        (candidate) => candidate.id === thread.coverIterationId,
      )
    : undefined
  const cover = displayed ?? remainingIterations.at(-1)
  const latest = remainingIterations.at(-1)
  const updated: ImageThread = {
    ...thread,
    aspectRatio:
      cover?.aspectRatio ?? latest?.aspectRatio ?? thread.aspectRatio,
    quality: latest?.quality ?? thread.quality,
    status: latest ? 'ready' : 'failed',
    errorMessage: undefined,
    pendingIteration: undefined,
    pendingRequestId: undefined,
    coverIterationId: cover?.id,
    iterations: remainingIterations,
    updatedAt: new Date().toISOString(),
  }

  threads.splice(threadIndex, 1)
  threads.unshift(updated)
  await saveThreads(workspaceId, threads)

  console.info(
    `[Images delete ${requestId}] deleted_iterations thread=${thread.id} iterations=${deletedIterationIds.length} workspace=${workspaceLabel(workspaceId)} remaining=${remainingIterations.length}`,
  )

  return {
    deleted: true,
    deletedThread: false,
    deletedIterationIds,
    notFoundIterationIds,
    thread: updated,
  }
}

async function queueThreadEdit(
  workspaceId: string | undefined,
  params: z.infer<typeof editParamsSchema>,
  requestId: string,
): Promise<ImageThread | null> {
  const threads = await loadThreads(workspaceId)
  const threadIndex = threads.findIndex((thread) => thread.id === params.id)
  const thread = threads[threadIndex]
  if (!thread) return null

  if (thread.status === 'generating' && thread.pendingIteration) {
    return thread
  }

  const base = baseIterationForEdit(thread, params.baseIterationId)
  if (!base) throw new Error('Image thread does not have an image to edit.')

  const aspectRatio = params.aspectRatio ?? base.aspectRatio
  const quality = params.quality ?? base.quality ?? DEFAULT_QUALITY
  const now = new Date().toISOString()
  const queued: ImageThread = {
    ...thread,
    aspectRatio,
    quality,
    status: 'generating',
    errorMessage: undefined,
    pendingRequestId: requestId,
    pendingIteration: {
      kind: 'edit',
      prompt: params.prompt,
      aspectRatio,
      quality,
      baseIterationId: base.id,
      requestId,
      startedAt: now,
    },
    updatedAt: now,
  }

  threads.splice(threadIndex, 1)
  threads.unshift(queued)
  await saveThreads(workspaceId, threads)

  console.info(
    `[Images edit ${requestId}] queued thread=${thread.id} workspace=${workspaceLabel(workspaceId)}`,
  )
  void finishEditingThread(
    workspaceId,
    {
      id: params.id,
      baseIterationId: base.id,
      prompt: params.prompt,
      aspectRatio,
      quality,
    },
    requestId,
  )
  return queued
}

async function editThread(
  workspaceId: string | undefined,
  params: z.infer<typeof editParamsSchema>,
  requestId: string,
): Promise<ImageThread | null> {
  const threads = await loadThreads(workspaceId)
  const threadIndex = threads.findIndex((thread) => thread.id === params.id)
  const thread = threads[threadIndex]
  if (!thread) return null

  const base = baseIterationForEdit(thread, params.baseIterationId)
  if (!base) throw new Error('Image thread does not have an image to edit.')

  const aspectRatio = params.aspectRatio ?? base.aspectRatio
  const quality = params.quality ?? base.quality ?? DEFAULT_QUALITY
  const aspect = ASPECT_RATIOS[aspectRatio]
  const baseImagePath = assetPath(workspaceId, thread.id, base.fileName)
  const response = await invokeOpenAIImages<OpenAIImageResponse>(workspaceId, {
    method: 'POST',
    path: '/v1/images/edits',
    multipartFields: {
      model: MODEL,
      prompt: params.prompt,
      size: aspect.size,
      quality,
      output_format: 'png',
    },
    multipartFiles: {
      'image[]': baseImagePath,
    },
    timeoutMs: IMAGE_GENERATION_TIMEOUT_MS,
  })
  const image = imageFromResponse(response)
  const currentThreads = await loadThreads(workspaceId)
  const currentThreadIndex = currentThreads.findIndex(
    (candidate) => candidate.id === params.id,
  )
  const currentThread = currentThreads[currentThreadIndex]
  if (!currentThread) return null
  if (!isActiveRequest(currentThread, requestId)) {
    console.info(
      `[Images edit ${requestId}] background_cancelled_after_edit thread=${params.id} workspace=${workspaceLabel(workspaceId)}`,
    )
    return currentThread
  }

  const now = new Date().toISOString()
  const iterationId = randomUUID()
  const fileName = await saveImageAsset({
    workspaceId,
    threadId: currentThread.id,
    iterationId,
    b64Json: image.b64Json,
  })

  const updated: ImageThread = {
    ...currentThread,
    aspectRatio,
    status: 'ready',
    errorMessage: undefined,
    pendingIteration: undefined,
    pendingRequestId: undefined,
    coverIterationId: iterationId,
    updatedAt: now,
    iterations: [
      ...currentThread.iterations,
      {
        id: iterationId,
        prompt: params.prompt,
        kind: 'edit',
        aspectRatio,
        size: image.size ?? aspect.size,
        quality: image.quality ?? quality,
        fileName,
        mimeType: 'image/png',
        model: MODEL,
        parentIterationId: base.id,
        createdAt: now,
      },
    ],
  }

  currentThreads.splice(currentThreadIndex, 1)
  currentThreads.unshift(updated)
  await saveThreads(workspaceId, currentThreads)
  return updated
}

async function finishEditingThread(
  workspaceId: string | undefined,
  params: z.infer<typeof editParamsSchema>,
  requestId: string,
): Promise<void> {
  const startedAt = Date.now()
  try {
    console.info(
      `[Images edit ${requestId}] background_start thread=${params.id} workspace=${workspaceLabel(workspaceId)}`,
    )
    const thread = await editThread(workspaceId, params, requestId)
    if (!thread) {
      console.warn(
        `[Images edit ${requestId}] image_not_found thread=${params.id} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return
    }
    console.info(
      `[Images edit ${requestId}] background_success thread=${params.id} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
    )
  } catch (error) {
    const rpcError = rpcErrorFromUnknown(error)
    const threads = await loadThreads(workspaceId)
    const threadIndex = threads.findIndex((thread) => thread.id === params.id)
    if (
      threadIndex !== -1 &&
      isActiveRequest(threads[threadIndex], requestId)
    ) {
      threads[threadIndex] = {
        ...threads[threadIndex],
        status: latestIteration(threads[threadIndex]) ? 'ready' : 'failed',
        errorMessage: rpcError.message,
        pendingIteration: undefined,
        pendingRequestId: undefined,
        updatedAt: new Date().toISOString(),
      }
      await saveThreads(workspaceId, threads)
    }
    console.error(
      `[Images edit ${requestId}] background_failed thread=${params.id} workspace=${workspaceLabel(workspaceId)} code=${rpcError.code} durationMs=${elapsedMs(startedAt)} message=${errorMessage(error, rpcError.message)}`,
    )
  }
}

async function setThreadAspectRatio(
  workspaceId: string | undefined,
  params: z.infer<typeof setAspectRatioParamsSchema>,
  requestId: string,
): Promise<ImageThread | null> {
  const threads = await loadThreads(workspaceId)
  const threadIndex = threads.findIndex((thread) => thread.id === params.id)
  const thread = threads[threadIndex]
  if (!thread) return null

  if (thread.status === 'generating' && thread.pendingIteration) {
    return thread
  }

  const base = latestIteration(thread)
  if (!base) throw new Error('Image thread does not have an image to edit.')

  const aspect = ASPECT_RATIOS[params.aspectRatio]
  const quality = thread.quality ?? base.quality ?? DEFAULT_QUALITY
  const prompt = `Regenerate this image with a ${aspect.label.toLowerCase()} ${aspect.ratio} aspect ratio. Preserve the subject, style, and visual intent of the current image.`
  const now = new Date().toISOString()
  const queued: ImageThread = {
    ...thread,
    aspectRatio: params.aspectRatio,
    quality,
    status: 'generating',
    errorMessage: undefined,
    pendingRequestId: requestId,
    pendingIteration: {
      kind: 'edit',
      prompt,
      aspectRatio: params.aspectRatio,
      quality,
      requestId,
      startedAt: now,
    },
    updatedAt: now,
  }

  threads.splice(threadIndex, 1)
  threads.unshift(queued)
  await saveThreads(workspaceId, threads)

  console.info(
    `[Images edit ${requestId}] queued thread=${thread.id} workspace=${workspaceLabel(workspaceId)}`,
  )
  void finishEditingThread(
    workspaceId,
    {
      id: params.id,
      prompt,
      aspectRatio: params.aspectRatio,
      quality,
    },
    requestId,
  )
  return queued
}

function errorResponse(error: unknown, fallback: string) {
  return {
    error: error instanceof Error ? error.message : fallback,
  }
}

export const app = new Hono()

app.use('/api/*', cors())

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null

  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'images',
      model: MODEL,
      port,
      status: 'ok',
      ts: Date.now(),
    },
    200,
    {
      'Cache-Control': 'no-store',
    },
  )
})

app.get('/api/images/aspect-ratios', (c) => {
  return c.json(Object.values(ASPECT_RATIOS))
})

app.get('/api/images', async (c) => {
  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    const threads = await loadThreads(workspaceId)
    return c.json(threads.map((thread) => serializeThread(thread, workspaceId)))
  } catch (error) {
    return c.json(errorResponse(error, 'Failed to load images'), 500)
  }
})

app.post('/api/images/import', async (c) => {
  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    const form = await c.req.raw.formData()
    const files = form
      .getAll('files')
      .filter(isUploadFile)
      .filter((file) => file.size > 0 && file.type.startsWith('image/'))

    if (files.length === 0) {
      return c.json({ error: 'No image files were provided.' }, 400)
    }

    const modeRaw = form.get('mode')
    const mode = importModeSchema.parse(
      typeof modeRaw === 'string'
        ? modeRaw
        : files.length > 1
          ? 'group'
          : 'separate',
    )
    const imported = await importImages(workspaceId, files, mode)
    return c.json(
      imported.map((thread) => serializeThread(thread, workspaceId)),
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid import options.' }, 400)
    }
    return c.json(errorResponse(error, 'Failed to import images'), 500)
  }
})

app.post('/api/images/import-paths', async (c) => {
  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    const payload = importPathsSchema.parse(await c.req.json())
    const imagePaths = payload.paths.filter((path) =>
      imageMimeTypeForName(path),
    )

    if (imagePaths.length === 0) {
      return c.json({ error: 'No image files were provided.' }, 400)
    }

    const imported = await importImagePaths(
      workspaceId,
      imagePaths,
      payload.mode ?? (imagePaths.length > 1 ? 'group' : 'separate'),
    )
    return c.json(
      imported.map((thread) => serializeThread(thread, workspaceId)),
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid import options.' }, 400)
    }
    return c.json(errorResponse(error, 'Failed to import images'), 500)
  }
})

app.get('/api/images/:id', async (c) => {
  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    const id = c.req.param('id')
    const thread = (await loadThreads(workspaceId)).find(
      (candidate) => candidate.id === id,
    )
    if (!thread) return c.json({ error: 'Image thread was not found' }, 404)
    return c.json(serializeThread(thread, workspaceId))
  } catch (error) {
    return c.json(errorResponse(error, 'Failed to load image'), 500)
  }
})

app.get('/api/images/assets/:threadId/:iterationId', async (c) => {
  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    const threadId = c.req.param('threadId')
    const iterationId = c.req.param('iterationId')
    const thread = (await loadThreads(workspaceId)).find(
      (candidate) => candidate.id === threadId,
    )
    const iteration = thread?.iterations.find(
      (candidate) => candidate.id === iterationId,
    )
    if (!thread || !iteration) return c.text('Not found', 404)

    const bytes = await readFile(
      assetPath(workspaceId, thread.id, iteration.fileName),
    )
    const download = c.req.query('download') === '1'
    return new Response(bytes, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Disposition': download
          ? `attachment; filename="${basename(iteration.fileName)}"`
          : 'inline',
        'Content-Type': iteration.mimeType,
      },
    })
  } catch (error) {
    console.error('Failed to read image asset:', error)
    return c.text('Not found', 404)
  }
})

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  const requestId = randomUUID()
  const startedAt = Date.now()
  let method = 'unknown'

  try {
    const body = rpcRequestSchema.parse(await c.req.json())
    method = body.method
    console.info(
      `[Images RPC ${requestId}] start method=${method} workspace=${workspaceLabel(workspaceId)} params="${summarizeRpcParams(body.params)}"`,
    )

    if (body.method === 'images.list') {
      const params = listParamsSchema.parse(body.params)
      const limit = params?.limit ?? 25
      const result = (await loadThreads(workspaceId))
        .slice(0, limit)
        .map((thread) => serializeThread(thread, workspaceId))
      console.info(
        `[Images RPC ${requestId}] success method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return c.json({
        ok: true,
        result,
      })
    }

    if (body.method === 'images.get') {
      const params = getParamsSchema.parse(body.params)
      const thread = (await loadThreads(workspaceId)).find(
        (candidate) => candidate.id === params.id,
      )
      if (!thread) {
        console.warn(
          `[Images RPC ${requestId}] image_not_found method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)} id=${params.id}`,
        )
        return c.json(
          {
            ok: false,
            error: {
              code: 'image_not_found',
              message: `Image thread ${params.id} was not found.`,
            },
          },
          200,
        )
      }
      console.info(
        `[Images RPC ${requestId}] success method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return c.json({ ok: true, result: serializeThread(thread, workspaceId) })
    }

    if (body.method === 'images.generate') {
      const params = generateParamsSchema.parse(body.params)
      const thread = await createGeneratingThread(
        workspaceId,
        params,
        requestId,
      )
      console.info(
        `[Images RPC ${requestId}] success method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return c.json({
        ok: true,
        result: serializeThread(thread, workspaceId),
      })
    }

    if (body.method === 'images.retry') {
      const params = retryParamsSchema.parse(body.params)
      const thread = await retryThreadGeneration(workspaceId, params, requestId)
      if (!thread) {
        console.warn(
          `[Images RPC ${requestId}] image_not_found method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)} id=${params.id}`,
        )
        return c.json(
          {
            ok: false,
            error: {
              code: 'image_not_found',
              message: `Image thread ${params.id} was not found.`,
            },
          },
          200,
        )
      }
      console.info(
        `[Images RPC ${requestId}] success method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return c.json({ ok: true, result: serializeThread(thread, workspaceId) })
    }

    if (body.method === 'images.cancel') {
      const params = cancelParamsSchema.parse(body.params)
      const result = await cancelPendingThread(workspaceId, params, requestId)
      if (!result) {
        console.warn(
          `[Images RPC ${requestId}] image_not_found method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)} id=${params.id}`,
        )
        return c.json(
          {
            ok: false,
            error: {
              code: 'image_not_found',
              message: `Image thread ${params.id} was not found.`,
            },
          },
          200,
        )
      }
      console.info(
        `[Images RPC ${requestId}] success method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return c.json({
        ok: true,
        result: {
          cancelled: result.cancelled,
          deleted: result.deleted,
          thread: result.thread
            ? serializeThread(result.thread, workspaceId)
            : undefined,
        },
      })
    }

    if (body.method === 'images.deleteThread') {
      const params = deleteThreadParamsSchema.parse(body.params)
      const result = await deleteThread(workspaceId, params, requestId)
      if (!result) {
        console.warn(
          `[Images RPC ${requestId}] image_not_found method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)} id=${params.id}`,
        )
        return c.json(
          {
            ok: false,
            error: {
              code: 'image_not_found',
              message: `Image thread ${params.id} was not found.`,
            },
          },
          200,
        )
      }
      console.info(
        `[Images RPC ${requestId}] success method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return c.json({ ok: true, result })
    }

    if (body.method === 'images.deleteIteration') {
      const params = deleteIterationParamsSchema.parse(body.params)
      const result = await deleteIteration(workspaceId, params, requestId)
      if (!result) {
        console.warn(
          `[Images RPC ${requestId}] image_or_iteration_not_found method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)} id=${params.id} iterations=${params.iterationId.length}`,
        )
        return c.json(
          {
            ok: false,
            error: {
              code: 'image_or_iteration_not_found',
              message: `Image thread ${params.id} or the requested iterations were not found.`,
            },
          },
          200,
        )
      }
      console.info(
        `[Images RPC ${requestId}] success method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return c.json({
        ok: true,
        result: {
          ...result,
          thread: result.thread
            ? serializeThread(result.thread, workspaceId)
            : undefined,
        },
      })
    }

    if (body.method === 'images.edit') {
      const params = editParamsSchema.parse(body.params)
      const thread = await queueThreadEdit(workspaceId, params, requestId)
      if (!thread) {
        console.warn(
          `[Images RPC ${requestId}] image_not_found method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)} id=${params.id}`,
        )
        return c.json(
          {
            ok: false,
            error: {
              code: 'image_not_found',
              message: `Image thread ${params.id} was not found.`,
            },
          },
          200,
        )
      }
      console.info(
        `[Images RPC ${requestId}] success method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return c.json({ ok: true, result: serializeThread(thread, workspaceId) })
    }

    if (body.method === 'images.setAspectRatio') {
      const params = setAspectRatioParamsSchema.parse(body.params)
      const thread = await setThreadAspectRatio(workspaceId, params, requestId)
      if (!thread) {
        console.warn(
          `[Images RPC ${requestId}] image_not_found method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)} id=${params.id}`,
        )
        return c.json(
          {
            ok: false,
            error: {
              code: 'image_not_found',
              message: `Image thread ${params.id} was not found.`,
            },
          },
          200,
        )
      }
      console.info(
        `[Images RPC ${requestId}] success method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return c.json({ ok: true, result: serializeThread(thread, workspaceId) })
    }

    console.warn(
      `[Images RPC ${requestId}] method_not_found method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
    )
    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Images does not expose ${body.method}.`,
        },
      },
      200,
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn(
        `[Images RPC ${requestId}] invalid_params method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_params',
            message: 'Images received invalid RPC parameters.',
            detail: error.flatten(),
          },
        },
        200,
      )
    }

    const rpcError = rpcErrorFromUnknown(error)
    console.error(
      `[Images RPC ${requestId}] failed method=${method} workspace=${workspaceLabel(workspaceId)} code=${rpcError.code} durationMs=${elapsedMs(startedAt)} message=${errorMessage(error, rpcError.message)}`,
    )
    return c.json(
      {
        ok: false,
        error: rpcError,
      },
      200,
    )
  }
})
