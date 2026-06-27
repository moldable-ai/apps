import {
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import {
  UnsupportedSourceImageError,
  isSupportedSourceImageMimeType,
  isSupportedSourceImageName,
  normalizeLocalSourceImage,
  normalizeUploadedSourceImage,
  sourceFileExtensionForMime,
  sourceFileExtensionForName,
  supportedSourceImageError,
} from './image-conversion'
import { imageRequest } from './moldable'
import { Hono } from 'hono'
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
const REMOVE_BG_TIMEOUT_MS = 180_000
const REMOVE_BG_SECRET_NAME = 'REMOVE_BG_API_KEY'
const REMOVE_BG_CAPABILITY_ID = 'remove-bg/background-removal'
const REMOVE_BG_PATH = '/v1.0/removebg'
const SERVER_STARTED_AT_MS = Date.now()
const ORPHANED_GENERATION_MESSAGE =
  'Images restarted before this generation finished. Retry to start it again.'
const storeMutationQueues = new Map<string, Promise<void>>()
const WORKSPACE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/

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
  kind: 'generation' | 'edit' | 'upload' | 'background-removal'
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
  id?: string
  kind: 'generation' | 'edit'
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
  pendingIterations?: PendingIteration[]
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

const generateFromReferenceParamsSchema = editParamsSchema

const importGeneratedParamsSchema = z.object({
  id: z.string().trim().min(1).optional(),
  imagePath: z.string().trim().min(1),
  prompt: z.string().trim().optional(),
  title: z.string().trim().optional(),
  aspectRatio: aspectRatioSchema.optional(),
  quality: qualitySchema.optional(),
})

const setAspectRatioParamsSchema = z.object({
  id: z.string().trim().min(1),
  aspectRatio: aspectRatioSchema,
  baseIterationId: z.string().trim().min(1).optional(),
})

const removeBackgroundParamsSchema = z.object({
  id: z.string().trim().min(1),
  iterationId: z.string().trim().min(1).optional(),
})

const removeBgKeyParamsSchema = z.object({
  apiKey: z.string().trim().min(1),
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
  if (typeof record.iterationId === 'string') {
    parts.push(`iterationId=${record.iterationId}`)
  }
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

type AivaultSecretMeta = {
  secretId: string
  name: string
  aliases?: string[]
  scope?: string | Record<string, unknown>
  revokedAtMs?: number | null
}

async function readAivaultJson<T>(
  args: string[],
  timeoutMs = 10_000,
): Promise<T> {
  const output = await runAivault(args, { timeoutMs })
  return JSON.parse(output.toString('utf8')) as T
}

function isGlobalAivaultSecret(secret: AivaultSecretMeta): boolean {
  return secret.scope === 'global'
}

function aivaultSecretMatchesName(
  secret: AivaultSecretMeta,
  name: string,
): boolean {
  return (
    secret.name === name ||
    Boolean(secret.aliases?.some((alias) => alias === name))
  )
}

async function listAivaultSecrets(): Promise<AivaultSecretMeta[]> {
  try {
    return await readAivaultJson<AivaultSecretMeta[]>([
      'secrets',
      'list',
      '--verbose',
    ])
  } catch (error) {
    console.warn(
      `[Images remove-bg] failed_to_list_secrets message=${errorMessage(error, 'unknown')}`,
    )
    return []
  }
}

async function findRemoveBgSecret(): Promise<AivaultSecretMeta | null> {
  const secrets = await listAivaultSecrets()
  return (
    secrets.find(
      (secret) =>
        !secret.revokedAtMs &&
        isGlobalAivaultSecret(secret) &&
        aivaultSecretMatchesName(secret, REMOVE_BG_SECRET_NAME),
    ) ?? null
  )
}

async function hasRemoveBgSecret(): Promise<boolean> {
  return Boolean(await findRemoveBgSecret())
}

async function upsertRemoveBgSecret(
  apiKey: string,
): Promise<AivaultSecretMeta> {
  const value = apiKey.trim()
  if (!value) throw new Error('Remove.bg API key is required.')

  const existing = await findRemoveBgSecret()
  if (existing) {
    await runAivault(
      ['secrets', 'rotate', '--id', existing.secretId, '--value', value],
      { timeoutMs: 10_000 },
    )
    return { ...existing, revokedAtMs: null }
  }

  await runAivault(
    [
      'secrets',
      'create',
      '--name',
      REMOVE_BG_SECRET_NAME,
      '--value',
      value,
      '--scope',
      'global',
    ],
    { timeoutMs: 10_000 },
  )

  const created = await findRemoveBgSecret()
  if (!created) throw new Error('Remove.bg API key was not saved to aivault.')
  return created
}

function parseWorkspaceId(
  value: string | null | undefined,
): string | undefined {
  const id = value?.trim()
  if (!id) return undefined
  if (!WORKSPACE_ID_PATTERN.test(id)) {
    throw new Error('Invalid workspace ID.')
  }
  return id
}

function getWorkspaceId(
  request: Request,
  options: { allowQuery?: boolean } = {},
): string | undefined {
  const fromHeader =
    request.headers.get('x-moldable-workspace-id') ??
    getWorkspaceFromRequest(request)
  const fromQuery = options.allowQuery
    ? new URL(request.url).searchParams.get('workspace')
    : null
  return parseWorkspaceId(fromHeader ?? fromQuery)
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

function storeMutationKey(workspaceId?: string): string {
  return workspaceId?.trim() || 'default'
}

async function withStoreMutation<T>(
  workspaceId: string | undefined,
  operation: () => Promise<T>,
): Promise<T> {
  const key = storeMutationKey(workspaceId)
  const previous = storeMutationQueues.get(key) ?? Promise.resolve()
  let release!: () => void
  const current = new Promise<void>((resolve) => {
    release = resolve
  })
  const next = previous.then(
    () => current,
    () => current,
  )
  storeMutationQueues.set(key, next)

  await previous.catch(() => undefined)

  try {
    return await operation()
  } finally {
    release()
    if (storeMutationQueues.get(key) === next) {
      storeMutationQueues.delete(key)
    }
  }
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

function hasActiveReferenceRequest(
  thread: ImageThread,
  requestId: string,
): boolean {
  return (
    thread.status === 'generating' &&
    Boolean(
      thread.pendingIterations?.some(
        (iteration) => iteration.requestId === requestId,
      ),
    )
  )
}

function withoutPendingReferenceRequest(
  thread: ImageThread,
  requestId: string,
): PendingIteration[] | undefined {
  const remaining = (thread.pendingIterations ?? []).filter(
    (iteration) => iteration.requestId !== requestId,
  )
  return remaining.length > 0 ? remaining : undefined
}

function statusAfterPendingReferenceSettles(
  thread: ImageThread,
  remainingPendingIterations: PendingIteration[] | undefined,
): NonNullable<ImageThread['status']> {
  if (thread.pendingIteration || remainingPendingIterations?.length) {
    return 'generating'
  }
  return latestIteration(thread) ? 'ready' : 'failed'
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
      pendingIterations: undefined,
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
      imagePath: assetPath(workspaceId, thread.id, iteration.fileName),
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

function sniffImageMimeType(buffer: Buffer): string | null {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a'
  ) {
    return 'image/png'
  }

  if (
    buffer.length >= 3 &&
    buffer.subarray(0, 3).toString('hex') === 'ffd8ff'
  ) {
    return 'image/jpeg'
  }

  if (buffer.length >= 6) {
    const gif = buffer.subarray(0, 6).toString('ascii')
    if (gif === 'GIF87a' || gif === 'GIF89a') return 'image/gif'
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp'
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(4, 8).toString('ascii') === 'ftyp'
  ) {
    const brand = buffer.subarray(8, 12).toString('ascii')
    if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) {
      return 'image/heic'
    }
  }

  const prefix = buffer.subarray(0, 512).toString('utf8').trimStart()
  if (
    prefix.startsWith('<svg') ||
    (prefix.startsWith('<?xml') && prefix.includes('<svg'))
  ) {
    return 'image/svg+xml'
  }

  return null
}

function resolveImageMimeType(buffer: Buffer, declared: string, name: string) {
  const sniffed = sniffImageMimeType(buffer)
  const named = imageMimeTypeForName(name)
  const declaredImage = declared.startsWith('image/') ? declared : null

  if (sniffed) return sniffed
  if (named === 'image/heic' || named === 'image/heif') return named
  if (declaredImage === 'image/heic' || declaredImage === 'image/heif') {
    return declaredImage
  }
  return null
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
  const normalized = await normalizeUploadedSourceImage({
    workspaceId,
    originalName: file.name,
    mimeType: file.type,
    buffer: Buffer.from(await file.arrayBuffer()),
  })
  const mimeType = resolveImageMimeType(
    normalized.buffer,
    normalized.mimeType,
    normalized.originalName,
  )
  if (!mimeType) {
    throw new Error(`${file.name || 'File'} is not a supported image.`)
  }

  const dimensions = detectImageDimensions(normalized.buffer, mimeType)
  const extension =
    sourceFileExtensionForMime(mimeType) ??
    sourceFileExtensionForName(normalized.originalName) ??
    normalized.extension
  const fileName = `${iterationId}.${extension}`
  const path = assetPath(workspaceId, threadId, fileName)
  await ensureDir(safePath(dataDir(workspaceId), 'assets', threadId))
  await writeFile(path, normalized.buffer)

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
  if (!isSupportedSourceImageName(originalName)) {
    throw supportedSourceImageError(originalName)
  }

  const normalized = await normalizeLocalSourceImage({
    workspaceId,
    sourcePath,
    originalName,
  })
  const mimeType = resolveImageMimeType(
    normalized.buffer,
    normalized.mimeType,
    normalized.originalName,
  )
  if (!mimeType) {
    throw new Error(`${originalName || 'File'} is not a supported image.`)
  }

  const dimensions = detectImageDimensions(normalized.buffer, mimeType)
  const extension =
    sourceFileExtensionForMime(mimeType) ??
    sourceFileExtensionForName(normalized.originalName) ??
    normalized.extension
  const fileName = `${iterationId}.${extension}`
  const path = assetPath(workspaceId, threadId, fileName)
  await ensureDir(safePath(dataDir(workspaceId), 'assets', threadId))
  await writeFile(path, normalized.buffer)

  return {
    fileName,
    mimeType,
    size: dimensions ? `${dimensions.width}x${dimensions.height}` : 'unknown',
    width: dimensions?.width,
    height: dimensions?.height,
    originalName: normalized.originalName,
  }
}

async function saveBufferImageAsset({
  workspaceId,
  threadId,
  iterationId,
  buffer,
  mimeType,
  extension,
}: {
  workspaceId?: string
  threadId: string
  iterationId: string
  buffer: Buffer
  mimeType: string
  extension: string
}): Promise<{
  fileName: string
  size: string
  width?: number
  height?: number
}> {
  const dimensions = detectImageDimensions(buffer, mimeType)
  const fileName = `${iterationId}.${extension}`
  const path = assetPath(workspaceId, threadId, fileName)
  await ensureDir(safePath(dataDir(workspaceId), 'assets', threadId))
  await writeFile(path, buffer)

  return {
    fileName,
    size: dimensions ? `${dimensions.width}x${dimensions.height}` : 'unknown',
    width: dimensions?.width,
    height: dimensions?.height,
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

  await withStoreMutation(workspaceId, async () => {
    const threads = await loadThreads(workspaceId)
    await saveThreads(workspaceId, [...importedThreads, ...threads])
  })
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

  await withStoreMutation(workspaceId, async () => {
    const threads = await loadThreads(workspaceId)
    await saveThreads(workspaceId, [...importedThreads, ...threads])
  })
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

  await withStoreMutation(workspaceId, async () => {
    const threads = await loadThreads(workspaceId)
    threads.unshift(thread)
    await saveThreads(workspaceId, threads)
  })

  void finishGeneratingThread(workspaceId, thread.id, params, requestId)
  return thread
}

async function requestImageEdit({
  workspaceId,
  sourceThreadId,
  base,
  prompt,
  aspectRatio,
  quality,
}: {
  workspaceId: string | undefined
  sourceThreadId: string
  base: ImageIteration
  prompt: string
  aspectRatio: AspectRatioId
  quality: Quality
}): Promise<{
  b64Json: string
  size?: string
  quality?: Quality
}> {
  const aspect = ASPECT_RATIOS[aspectRatio]
  const baseImagePath = assetPath(workspaceId, sourceThreadId, base.fileName)
  const response = await invokeOpenAIImages<OpenAIImageResponse>(workspaceId, {
    method: 'POST',
    path: '/v1/images/edits',
    multipartFields: {
      model: MODEL,
      prompt,
      size: aspect.size,
      quality,
      output_format: 'png',
    },
    multipartFiles: {
      'image[]': baseImagePath,
    },
    timeoutMs: IMAGE_GENERATION_TIMEOUT_MS,
  })
  return imageFromResponse(response)
}

async function retryThreadGeneration(
  workspaceId: string | undefined,
  params: z.infer<typeof retryParamsSchema>,
  requestId: string,
): Promise<ImageThread | null> {
  let retryParams: z.infer<typeof generateParamsSchema> | null = null
  const updated = await withStoreMutation(workspaceId, async () => {
    const threads = await loadThreads(workspaceId)
    const threadIndex = threads.findIndex((thread) => thread.id === params.id)
    const thread = threads[threadIndex]
    if (!thread) return null

    if (thread.status !== 'failed') {
      return thread
    }

    retryParams = {
      prompt: thread.prompt,
      aspectRatio: thread.aspectRatio,
      quality: params.quality ?? thread.quality ?? DEFAULT_QUALITY,
    }
    const queued: ImageThread = {
      ...thread,
      status: 'generating',
      errorMessage: undefined,
      pendingRequestId: requestId,
      updatedAt: new Date().toISOString(),
    }

    threads.splice(threadIndex, 1)
    threads.unshift(queued)
    await saveThreads(workspaceId, threads)
    return queued
  })

  if (!updated) return null
  if (!retryParams) return updated

  console.info(
    `[Images generation ${requestId}] retry_queued thread=${updated.id} workspace=${workspaceLabel(workspaceId)}`,
  )
  void finishGeneratingThread(workspaceId, updated.id, retryParams, requestId)
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
    const saved = await withStoreMutation(workspaceId, async () => {
      const threads = await loadThreads(workspaceId)
      const pendingIndex = threads.findIndex((thread) => thread.id === threadId)
      if (pendingIndex === -1) {
        console.warn(
          `[Images generation ${requestId}] missing_pending_thread_after_generation thread=${threadId} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
        )
        return false
      }
      if (!isActiveRequest(threads[pendingIndex], requestId)) {
        console.info(
          `[Images generation ${requestId}] background_cancelled_after_generation thread=${threadId} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
        )
        return false
      }
      threads.splice(pendingIndex, 1)
      threads.unshift(readyThread)
      await saveThreads(workspaceId, threads)
      return true
    })
    if (!saved) return
    console.info(
      `[Images generation ${requestId}] background_success thread=${threadId} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
    )
  } catch (error) {
    const rpcError = rpcErrorFromUnknown(error)
    await withStoreMutation(workspaceId, async () => {
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
    })
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
  return withStoreMutation(workspaceId, async () => {
    const threads = await loadThreads(workspaceId)
    const threadIndex = threads.findIndex((thread) => thread.id === params.id)
    const thread = threads[threadIndex]
    if (!thread) return null

    const isGenerating = thread.status === 'generating'
    const hasPendingWork =
      isGenerating ||
      Boolean(thread.pendingIteration) ||
      Boolean(thread.pendingIterations?.length)
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
      pendingIterations: undefined,
      pendingRequestId: undefined,
      updatedAt: now,
    }

    threads[threadIndex] = updated
    await saveThreads(workspaceId, threads)
    console.info(
      `[Images cancel ${requestId}] cleared_pending_thread thread=${thread.id} workspace=${workspaceLabel(workspaceId)}`,
    )
    return { cancelled: true, deleted: false, thread: updated }
  })
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
  const result = await withStoreMutation(workspaceId, async () => {
    const threads = await loadThreads(workspaceId)
    const threadIndex = threads.findIndex((thread) => thread.id === params.id)
    const thread = threads[threadIndex]
    if (!thread) return null

    threads.splice(threadIndex, 1)
    await saveThreads(workspaceId, threads)

    return {
      deleted: true,
      deletedIterations: thread.iterations.length,
      id: thread.id,
    } as const
  })

  if (!result) return null

  await rm(safePath(dataDir(workspaceId), 'assets', result.id), {
    force: true,
    recursive: true,
  })

  console.info(
    `[Images delete ${requestId}] deleted_thread thread=${result.id} workspace=${workspaceLabel(workspaceId)} iterations=${result.deletedIterations}`,
  )

  return result
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
  const filesToRemove: string[] = []
  const result = await withStoreMutation(workspaceId, async () => {
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

    filesToRemove.push(
      ...iterationsToDelete.map((iteration) =>
        assetPath(workspaceId, thread.id, iteration.fileName),
      ),
    )

    const remainingIterations = thread.iterations.filter(
      (candidate) => !deletedIterationIdSet.has(candidate.id),
    )

    if (remainingIterations.length === 0) {
      threads.splice(threadIndex, 1)
      await saveThreads(workspaceId, threads)
      console.info(
        `[Images delete ${requestId}] deleted_iterations_and_thread thread=${thread.id} iterations=${deletedIterationIds.length} workspace=${workspaceLabel(workspaceId)}`,
      )
      return {
        deleted: true,
        deletedThread: true,
        deletedIterationIds,
        notFoundIterationIds,
      } as const
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
    } as const
  })

  if (!result) return null

  if (result.deletedThread) {
    await rm(safePath(dataDir(workspaceId), 'assets', params.id), {
      force: true,
      recursive: true,
    })
  } else {
    await Promise.all(filesToRemove.map((path) => rm(path, { force: true })))
  }

  return result
}

async function queueReferenceGeneration(
  workspaceId: string | undefined,
  params: z.infer<typeof generateFromReferenceParamsSchema>,
  requestId: string,
): Promise<ImageThread | null> {
  let finishParams: z.infer<typeof generateFromReferenceParamsSchema> | null =
    null
  const queued = await withStoreMutation(workspaceId, async () => {
    const threads = await loadThreads(workspaceId)
    const threadIndex = threads.findIndex((thread) => thread.id === params.id)
    const thread = threads[threadIndex]
    if (!thread) return null

    const base = baseIterationForEdit(thread, params.baseIterationId)
    if (!base)
      throw new Error('Image thread does not have an image to reference.')

    const aspectRatio = params.aspectRatio ?? base.aspectRatio
    const quality = params.quality ?? base.quality ?? DEFAULT_QUALITY
    const now = new Date().toISOString()
    const pendingId = randomUUID()
    const nextThread: ImageThread = {
      ...thread,
      aspectRatio,
      quality,
      status: 'generating',
      errorMessage: undefined,
      pendingIterations: [
        ...(thread.pendingIterations ?? []),
        {
          id: pendingId,
          kind: 'generation',
          prompt: params.prompt,
          aspectRatio,
          quality,
          baseIterationId: base.id,
          requestId,
          startedAt: now,
        },
      ],
      updatedAt: now,
    }

    threads.splice(threadIndex, 1)
    threads.unshift(nextThread)
    await saveThreads(workspaceId, threads)
    finishParams = {
      id: params.id,
      baseIterationId: base.id,
      prompt: params.prompt,
      aspectRatio,
      quality,
    }
    return nextThread
  })

  const queuedFinishParams = finishParams as z.infer<
    typeof generateFromReferenceParamsSchema
  > | null
  if (!queued || !queuedFinishParams) return queued

  console.info(
    `[Images reference ${requestId}] queued thread=${queued.id} base=${queuedFinishParams.baseIterationId} workspace=${workspaceLabel(workspaceId)}`,
  )
  void finishReferenceGeneration(workspaceId, queuedFinishParams, requestId)
  return queued
}

async function finishReferenceGeneration(
  workspaceId: string | undefined,
  params: z.infer<typeof generateFromReferenceParamsSchema>,
  requestId: string,
): Promise<void> {
  const startedAt = Date.now()
  try {
    console.info(
      `[Images reference ${requestId}] background_start thread=${params.id} workspace=${workspaceLabel(workspaceId)}`,
    )
    const initialThreads = await loadThreads(workspaceId)
    const pending = initialThreads.find((thread) => thread.id === params.id)
    const base = pending
      ? baseIterationForEdit(pending, params.baseIterationId)
      : undefined
    if (!pending || !base) {
      throw new Error('Reference image was not found.')
    }
    if (!hasActiveReferenceRequest(pending, requestId)) {
      console.info(
        `[Images reference ${requestId}] background_cancelled thread=${params.id} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return
    }

    const aspectRatio = params.aspectRatio ?? base.aspectRatio
    const quality = params.quality ?? base.quality ?? DEFAULT_QUALITY
    const aspect = ASPECT_RATIOS[aspectRatio]
    const image = await requestImageEdit({
      workspaceId,
      sourceThreadId: pending.id,
      base,
      prompt: params.prompt,
      aspectRatio,
      quality,
    })

    const now = new Date().toISOString()
    const iterationId = randomUUID()
    const fileName = await saveImageAsset({
      workspaceId,
      threadId: params.id,
      iterationId,
      b64Json: image.b64Json,
    })
    const saved = await withStoreMutation(workspaceId, async () => {
      const currentThreads = await loadThreads(workspaceId)
      const pendingIndex = currentThreads.findIndex(
        (thread) => thread.id === params.id,
      )
      if (pendingIndex === -1) return false
      const currentThread = currentThreads[pendingIndex]
      if (!hasActiveReferenceRequest(currentThread, requestId)) {
        console.info(
          `[Images reference ${requestId}] background_cancelled_after_generation thread=${params.id} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
        )
        return false
      }

      const pendingIterations = withoutPendingReferenceRequest(
        currentThread,
        requestId,
      )
      const readyThread: ImageThread = {
        ...currentThread,
        aspectRatio,
        quality,
        status:
          currentThread.pendingIteration || pendingIterations?.length
            ? 'generating'
            : 'ready',
        errorMessage: undefined,
        pendingIterations,
        coverIterationId: iterationId,
        updatedAt: now,
        iterations: [
          ...currentThread.iterations,
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

      currentThreads.splice(pendingIndex, 1)
      currentThreads.unshift(readyThread)
      await saveThreads(workspaceId, currentThreads)
      return true
    })
    if (!saved) return
    console.info(
      `[Images reference ${requestId}] background_success thread=${params.id} iteration=${iterationId} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
    )
  } catch (error) {
    const rpcError = rpcErrorFromUnknown(error)
    await withStoreMutation(workspaceId, async () => {
      const threads = await loadThreads(workspaceId)
      const threadIndex = threads.findIndex((thread) => thread.id === params.id)
      if (
        threadIndex !== -1 &&
        hasActiveReferenceRequest(threads[threadIndex], requestId)
      ) {
        const pendingIterations = withoutPendingReferenceRequest(
          threads[threadIndex],
          requestId,
        )
        threads[threadIndex] = {
          ...threads[threadIndex],
          status: statusAfterPendingReferenceSettles(
            threads[threadIndex],
            pendingIterations,
          ),
          errorMessage: rpcError.message,
          pendingIterations,
          updatedAt: new Date().toISOString(),
        }
        await saveThreads(workspaceId, threads)
      }
    })
    console.error(
      `[Images reference ${requestId}] background_failed thread=${params.id} workspace=${workspaceLabel(workspaceId)} code=${rpcError.code} durationMs=${elapsedMs(startedAt)} message=${errorMessage(error, rpcError.message)}`,
    )
  }
}

async function importGeneratedImage(
  workspaceId: string | undefined,
  params: z.infer<typeof importGeneratedParamsSchema>,
  requestId: string,
): Promise<ImageThread | null> {
  const now = new Date().toISOString()
  const prompt = params.prompt ?? ''
  const title =
    params.title?.trim() ||
    (prompt
      ? titleFromPrompt(prompt)
      : titleFromFileName(basename(params.imagePath)))
  const quality = params.quality ?? DEFAULT_QUALITY

  if (params.id !== undefined) {
    const threadExists = await withStoreMutation(workspaceId, async () => {
      const threads = await loadThreads(workspaceId)
      return threads.some((thread) => thread.id === params.id)
    })
    if (!threadExists) return null
  }

  const threadId = params.id ?? randomUUID()
  const iterationId = randomUUID()
  const asset = await saveLocalImageAsset({
    workspaceId,
    threadId,
    iterationId,
    sourcePath: params.imagePath,
  })
  const aspectRatio =
    params.aspectRatio ?? inferAspectRatio(asset.width, asset.height)

  const iteration: ImageIteration = {
    id: iterationId,
    prompt,
    kind: 'generation',
    aspectRatio,
    size: asset.size,
    quality,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    originalName: asset.originalName,
    createdAt: now,
  }

  const updated = await withStoreMutation(workspaceId, async () => {
    const threads = await loadThreads(workspaceId)
    const threadIndex =
      params.id === undefined
        ? -1
        : threads.findIndex((thread) => thread.id === params.id)

    if (params.id !== undefined && threadIndex === -1) return null

    const nextThread: ImageThread =
      threadIndex === -1
        ? {
            id: threadId,
            title,
            prompt,
            aspectRatio,
            quality,
            status: 'ready',
            coverIterationId: iterationId,
            createdAt: now,
            updatedAt: now,
            iterations: [iteration],
          }
        : {
            ...threads[threadIndex],
            title: threads[threadIndex].title || title,
            prompt: threads[threadIndex].prompt || prompt,
            aspectRatio,
            quality,
            status: 'ready',
            errorMessage: undefined,
            pendingIteration: undefined,
            pendingRequestId: undefined,
            coverIterationId: iterationId,
            updatedAt: now,
            iterations: [...threads[threadIndex].iterations, iteration],
          }

    if (threadIndex === -1) {
      threads.unshift(nextThread)
    } else {
      threads.splice(threadIndex, 1)
      threads.unshift(nextThread)
    }
    await saveThreads(workspaceId, threads)
    return nextThread
  })

  if (!updated) return null

  console.info(
    `[Images import-generated ${requestId}] saved thread=${updated.id} workspace=${workspaceLabel(workspaceId)} path=${params.imagePath}`,
  )
  return updated
}

async function queueThreadEdit(
  workspaceId: string | undefined,
  params: z.infer<typeof editParamsSchema>,
  requestId: string,
): Promise<ImageThread | null> {
  let finishParams: z.infer<typeof editParamsSchema> | null = null
  const queued = await withStoreMutation(workspaceId, async () => {
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
    const nextThread: ImageThread = {
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
    threads.unshift(nextThread)
    await saveThreads(workspaceId, threads)
    finishParams = {
      id: params.id,
      baseIterationId: base.id,
      prompt: params.prompt,
      aspectRatio,
      quality,
    }
    return nextThread
  })

  const queuedFinishParams = finishParams as z.infer<
    typeof editParamsSchema
  > | null
  if (!queued || !queuedFinishParams) return queued

  console.info(
    `[Images edit ${requestId}] queued thread=${queued.id} workspace=${workspaceLabel(workspaceId)}`,
  )
  void finishEditingThread(workspaceId, queuedFinishParams, requestId)
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
  const image = await requestImageEdit({
    workspaceId,
    sourceThreadId: thread.id,
    base,
    prompt: params.prompt,
    aspectRatio,
    quality,
  })
  const now = new Date().toISOString()
  const iterationId = randomUUID()
  const fileName = await saveImageAsset({
    workspaceId,
    threadId: params.id,
    iterationId,
    b64Json: image.b64Json,
  })

  return withStoreMutation(workspaceId, async () => {
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
  })
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
    await withStoreMutation(workspaceId, async () => {
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
    })
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
  let finishParams: z.infer<typeof editParamsSchema> | null = null
  const queued = await withStoreMutation(workspaceId, async () => {
    const threads = await loadThreads(workspaceId)
    const threadIndex = threads.findIndex((thread) => thread.id === params.id)
    const thread = threads[threadIndex]
    if (!thread) return null

    if (thread.status === 'generating' && thread.pendingIteration) {
      return thread
    }

    const base = baseIterationForEdit(thread, params.baseIterationId)
    if (!base) throw new Error('Image thread does not have an image to edit.')

    const aspect = ASPECT_RATIOS[params.aspectRatio]
    const quality = thread.quality ?? base.quality ?? DEFAULT_QUALITY
    const prompt = `Regenerate this image with a ${aspect.label.toLowerCase()} ${aspect.ratio} aspect ratio. Preserve the subject, style, and visual intent of the current image.`
    const now = new Date().toISOString()
    const nextThread: ImageThread = {
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
        baseIterationId: base.id,
        requestId,
        startedAt: now,
      },
      updatedAt: now,
    }

    threads.splice(threadIndex, 1)
    threads.unshift(nextThread)
    await saveThreads(workspaceId, threads)
    finishParams = {
      id: params.id,
      baseIterationId: base.id,
      prompt,
      aspectRatio: params.aspectRatio,
      quality,
    }
    return nextThread
  })

  const queuedFinishParams = finishParams as z.infer<
    typeof editParamsSchema
  > | null
  if (!queued || !queuedFinishParams) return queued

  console.info(
    `[Images edit ${requestId}] queued thread=${queued.id} workspace=${workspaceLabel(workspaceId)}`,
  )
  void finishEditingThread(workspaceId, queuedFinishParams, requestId)
  return queued
}

async function removeBackgroundFromThread(
  workspaceId: string | undefined,
  params: z.infer<typeof removeBackgroundParamsSchema>,
  requestId: string,
): Promise<ImageThread | null> {
  if (!(await hasRemoveBgSecret())) {
    throw new Error('Add a Remove.bg API key before removing backgrounds.')
  }

  const threads = await loadThreads(workspaceId)
  const threadIndex = threads.findIndex((thread) => thread.id === params.id)
  const thread = threads[threadIndex]
  if (!thread) return null

  const base = params.iterationId
    ? thread.iterations.find((iteration) => iteration.id === params.iterationId)
    : displayIteration(thread)
  if (!base) {
    throw new Error('Image thread does not have an image to process.')
  }

  const sourcePath = assetPath(workspaceId, thread.id, base.fileName)
  const startedAt = Date.now()
  console.info(
    `[Images remove-bg ${requestId}] start thread=${thread.id} iteration=${base.id} workspace=${workspaceLabel(workspaceId)}`,
  )

  const buffer = await runAivault(
    [
      'invoke',
      ...aivaultContextArgs(workspaceId),
      '--method',
      'POST',
      '--path',
      REMOVE_BG_PATH,
      '--multipart-field',
      'size=auto',
      '--multipart-field',
      'format=png',
      '--multipart-file',
      `image_file=${sourcePath}`,
      '--timeout-ms',
      String(REMOVE_BG_TIMEOUT_MS),
      '--stream',
      REMOVE_BG_CAPABILITY_ID,
    ],
    { timeoutMs: REMOVE_BG_TIMEOUT_MS + 5_000 },
  )

  const now = new Date().toISOString()
  const iterationId = randomUUID()
  const asset = await saveBufferImageAsset({
    workspaceId,
    threadId: thread.id,
    iterationId,
    buffer,
    mimeType: 'image/png',
    extension: 'png',
  })

  const updated = await withStoreMutation(workspaceId, async () => {
    const currentThreads = await loadThreads(workspaceId)
    const currentThreadIndex = currentThreads.findIndex(
      (candidate) => candidate.id === params.id,
    )
    const currentThread = currentThreads[currentThreadIndex]
    if (!currentThread) return null
    const currentBase = currentThread.iterations.find(
      (iteration) => iteration.id === base.id,
    )
    if (!currentBase) return null

    const nextThread: ImageThread = {
      ...currentThread,
      status: 'ready',
      errorMessage: undefined,
      coverIterationId: iterationId,
      updatedAt: now,
      iterations: [
        ...currentThread.iterations,
        {
          id: iterationId,
          prompt: currentBase.prompt
            ? `${currentBase.prompt}\n\nBackground removed with remove.bg.`
            : 'Background removed with remove.bg.',
          kind: 'background-removal',
          aspectRatio: inferAspectRatio(asset.width, asset.height),
          size: asset.size,
          quality: currentBase.quality,
          fileName: asset.fileName,
          mimeType: 'image/png',
          parentIterationId: currentBase.id,
          width: asset.width,
          height: asset.height,
          createdAt: now,
        },
      ],
    }

    currentThreads.splice(currentThreadIndex, 1)
    currentThreads.unshift(nextThread)
    await saveThreads(workspaceId, currentThreads)
    return nextThread
  })
  if (!updated) return null

  console.info(
    `[Images remove-bg ${requestId}] success thread=${thread.id} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
  )
  return updated
}

function errorResponse(error: unknown, fallback: string) {
  return {
    error: error instanceof Error ? error.message : fallback,
  }
}

export const app = new Hono()

app.use('/api/moldable/today', async (c, next) => {
  if (c.req.method !== 'GET') {
    await next()
    return
  }

  await next()

  const response = c.res
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return

  const data = (await response
    .clone()
    .json()
    .catch(() => null)) as unknown
  if (!isMoldableTodayResponse(data)) return

  const dismissals = await readMoldableTodayDismissals(c.req.raw)
  const items = filterMoldableTodayDismissedItems(data.items, dismissals)
  if (items.length === data.items.length) return

  const headers = new Headers(response.headers)
  headers.delete('content-length')
  c.res = new Response(JSON.stringify({ ...data, items }), {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
})
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

app.get('/api/moldable/today', async (c) => {
  const generatedAt = new Date().toISOString()
  const items: unknown[] = []
  const resume: unknown = null

  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    const threads = await loadThreads(workspaceId)

    // Quiet by default. Only a failed generation (needs unblocking) or an
    // actively-rendering generation earns a card. A finished/ready image is a
    // done state, not unfinished work, so it never becomes a resume.
    const failed = threads.find((thread) => threadStatus(thread) === 'failed')
    const generating = threads.find(
      (thread) => threadStatus(thread) === 'generating',
    )

    if (failed) {
      const label = failed.title || titleFromPrompt(failed.prompt)
      items.push({
        id: 'render:blocked',
        kind: 'blocked',
        surface: 'nudge',
        title: label || 'Image generation',
        subtitle:
          failed.errorMessage ?? 'Generation failed — retry to run it again',
        icon: '⚠️',
        priority: 95,
        actions: [
          {
            type: 'rpc',
            label: 'Retry',
            method: 'images.retry',
            params: { id: failed.id },
          },
          { type: 'open-app', label: 'Open Images' },
        ],
      })
    } else if (generating) {
      const label = generating.title || titleFromPrompt(generating.prompt)
      items.push({
        id: 'render:active',
        kind: 'active',
        surface: 'nudge',
        title: label || 'Untitled image',
        subtitle: 'Rendering now',
        icon: '🎨',
        priority: 90,
        dismissible: false,
        actions: [{ type: 'open-app', label: 'View' }],
      })
    }
  } catch {
    return c.json({ items: [], resume: null, generatedAt })
  }

  return c.json({ items, resume, generatedAt })
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
      .filter(
        (file) =>
          file.size > 0 &&
          (isSupportedSourceImageMimeType(file.type) ||
            isSupportedSourceImageName(file.name)),
      )

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
    if (error instanceof UnsupportedSourceImageError) {
      return c.json({ error: error.message }, 400)
    }
    return c.json(errorResponse(error, 'Failed to import images'), 500)
  }
})

app.post('/api/images/import-paths', async (c) => {
  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    const payload = importPathsSchema.parse(await c.req.json())
    const imagePaths = payload.paths.filter((path) =>
      isSupportedSourceImageName(path),
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
    if (error instanceof UnsupportedSourceImageError) {
      return c.json({ error: error.message }, 400)
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
    const workspaceId = getWorkspaceId(c.req.raw, { allowQuery: true })
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
        'Content-Security-Policy': 'sandbox',
        'Content-Type': iteration.mimeType,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Failed to read image asset:', error)
    return c.text('Not found', 404)
  }
})

app.get('/api/remove-bg/status', async (c) => {
  try {
    return c.json({ available: await hasRemoveBgSecret() })
  } catch (error) {
    return c.json(errorResponse(error, 'Failed to inspect remove.bg key'), 500)
  }
})

app.post('/api/remove-bg/key', async (c) => {
  try {
    const params = removeBgKeyParamsSchema.parse(await c.req.json())
    await upsertRemoveBgSecret(params.apiKey)
    return c.json({ available: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid remove.bg API key.' }, 400)
    }
    return c.json(errorResponse(error, 'Failed to save remove.bg key'), 500)
  }
})

app.post('/api/remove-bg', async (c) => {
  const requestId = randomUUID()
  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    const params = removeBackgroundParamsSchema.parse(await c.req.json())
    const thread = await removeBackgroundFromThread(
      workspaceId,
      params,
      requestId,
    )
    if (!thread) return c.json({ error: 'Image thread was not found' }, 404)
    return c.json(serializeThread(thread, workspaceId))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid remove background options.' }, 400)
    }
    return c.json(errorResponse(error, 'Failed to remove background'), 500)
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

    if (body.method === 'images.generateFromReference') {
      const params = generateFromReferenceParamsSchema.parse(body.params)
      const thread = await queueReferenceGeneration(
        workspaceId,
        params,
        requestId,
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

    if (body.method === 'images.importGenerated') {
      const params = importGeneratedParamsSchema.parse(body.params)
      const thread = await importGeneratedImage(workspaceId, params, requestId)
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

    if (body.method === 'images.removeBackground') {
      const params = removeBackgroundParamsSchema.parse(body.params)
      const thread = await removeBackgroundFromThread(
        workspaceId,
        params,
        requestId,
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

app.post('/api/moldable/today/dismiss', async (c) => {
  const body = (await c.req.json().catch(() => null)) as unknown
  if (!isMoldableTodayDismissalRequest(body)) {
    return c.json({ error: 'Invalid Today dismissal payload.' }, 400)
  }

  const dismissals = await recordMoldableTodayDismissal(c.req.raw, {
    id: body.id,
    dismissalKey: body.dismissalKey,
    materialDismissalKey: body.materialDismissalKey,
    dismissedAt: body.dismissedAt ?? new Date().toISOString(),
    item: body.item,
  })

  return c.json({ ok: true, dismissals: dismissals.length })
})

type MoldableTodayItem = {
  id?: unknown
  kind?: unknown
  title?: unknown
  subtitle?: unknown
  groupHint?: unknown
}

type MoldableTodayDismissal = {
  id: string
  dismissalKey?: string
  materialDismissalKey?: string
  dismissedAt: string
  item?: {
    kind?: string
    title?: string
    subtitle?: string
    groupHint?: string
  }
}

function isMoldableTodayResponse(value: unknown): value is {
  items: MoldableTodayItem[]
  [key: string]: unknown
} {
  return isMoldableTodayRecord(value) && Array.isArray(value.items)
}

function isMoldableTodayDismissalRequest(
  value: unknown,
): value is MoldableTodayDismissal {
  if (!isMoldableTodayRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    optionalMoldableTodayString(value.dismissalKey) &&
    optionalMoldableTodayString(value.materialDismissalKey) &&
    optionalMoldableTodayString(value.dismissedAt) &&
    (value.item === undefined || isMoldableTodayDismissalItem(value.item))
  )
}

function isMoldableTodayDismissalItem(value: unknown): value is {
  kind?: string
  title?: string
  subtitle?: string
  groupHint?: string
} {
  if (!isMoldableTodayRecord(value)) return false
  return (
    optionalMoldableTodayString(value.kind) &&
    optionalMoldableTodayString(value.title) &&
    optionalMoldableTodayString(value.subtitle) &&
    optionalMoldableTodayString(value.groupHint)
  )
}

function optionalMoldableTodayString(value: unknown): boolean {
  return value === undefined || typeof value === 'string'
}

function isMoldableTodayRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function recordMoldableTodayDismissal(
  request: Request,
  dismissal: MoldableTodayDismissal,
): Promise<MoldableTodayDismissal[]> {
  const current = await readMoldableTodayDismissals(request)
  const key = dismissal.dismissalKey ?? dismissal.id
  const next = [
    ...current.filter((entry) => (entry.dismissalKey ?? entry.id) !== key),
    dismissal,
  ].sort((a, b) => a.id.localeCompare(b.id))
  await writeMoldableTodayDismissals(request, next)
  return next
}

async function readMoldableTodayDismissals(
  request: Request,
): Promise<MoldableTodayDismissal[]> {
  const filePath = await moldableTodayDismissalsPath(request)
  const { readFile } = await import('node:fs/promises')
  try {
    const data = JSON.parse(await readFile(filePath, 'utf8')) as unknown
    return Array.isArray(data)
      ? data.filter(isMoldableTodayDismissalRequest)
      : []
  } catch (error) {
    if (isNodeFileNotFound(error)) return []
    throw error
  }
}

async function writeMoldableTodayDismissals(
  request: Request,
  dismissals: MoldableTodayDismissal[],
): Promise<void> {
  const filePath = await moldableTodayDismissalsPath(request)
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const tempPath = path.join(
    path.dirname(filePath),
    '.' +
      path.basename(filePath) +
      '.' +
      process.pid +
      '.' +
      Date.now() +
      '.tmp',
  )
  await fs.writeFile(tempPath, JSON.stringify(dismissals, null, 2), 'utf8')
  await fs.rename(tempPath, filePath)
}

async function moldableTodayDismissalsPath(request: Request): Promise<string> {
  const path = await import('node:path')
  return path.join(moldableTodayDataDir(request), 'today-dismissals.json')
}

function moldableTodayDataDir(request: Request): string {
  const workspaceId =
    request.headers.get('x-moldable-workspace') ??
    request.headers.get('x-moldable-workspace-id') ??
    process.env.MOLDABLE_WORKSPACE_ID ??
    'personal'
  const appId = process.env.MOLDABLE_APP_ID

  if (appId) {
    const home =
      process.env.MOLDABLE_HOME ??
      (process.env.HOME ?? process.cwd()) + '/.moldable'
    return home + '/workspaces/' + workspaceId + '/apps/' + appId + '/data'
  }

  return process.env.MOLDABLE_APP_DATA_DIR ?? process.cwd() + '/data'
}

function filterMoldableTodayDismissedItems<T extends MoldableTodayItem>(
  items: T[],
  dismissals: MoldableTodayDismissal[],
): T[] {
  if (dismissals.length === 0) return items
  const dismissedIds = new Set(dismissals.map((entry) => entry.id))
  const dismissedMaterialKeys = new Set(
    dismissals
      .map((entry) => entry.materialDismissalKey)
      .filter((key): key is string => Boolean(key)),
  )

  return items.filter((item) => {
    if (typeof item.id === 'string' && dismissedIds.has(item.id)) return false
    return !dismissedMaterialKeys.has(moldableTodayMaterialKey(item))
  })
}

function moldableTodayMaterialKey(item: MoldableTodayItem): string {
  return [
    'material',
    process.env.MOLDABLE_APP_ID ?? '',
    typeof item.kind === 'string' ? item.kind : '',
    'text',
    normalizeMoldableTodayText(item.title),
    normalizeMoldableTodayText(item.subtitle),
    typeof item.groupHint === 'string' ? item.groupHint : '',
    '',
  ].join('\u001e')
}

function normalizeMoldableTodayText(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').toLowerCase()
    : ''
}

function isNodeFileNotFound(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  )
}
