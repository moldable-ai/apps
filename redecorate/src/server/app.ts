import {
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import {
  PRESET_CATEGORIES,
  PROMPT_TEMPLATES,
  STARTER_FOLDERS,
  STYLE_PRESETS,
  STYLE_SUBTYPES,
} from '../shared/catalog'
import {
  UnsupportedSourceImageError,
  imageMimeTypeForName,
  isSupportedSourceImageMimeType,
  isSupportedSourceImageName,
  normalizeLocalSourceImage,
  normalizeUploadedSourceImage,
  supportedSourceImageError,
} from './image-conversion'
import { generateJson, imageRequest } from './moldable'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { basename, extname, isAbsolute } from 'node:path'
import { z } from 'zod'

const MODEL = 'gpt-image-2'
const DEFAULT_QUALITY = 'medium'
const STORE_FILE = 'designs.json'
const FOLDERS_FILE = 'folders.json'
const FOLDERS_SEEDED_MARKER = '.starter-folders-seeded'
const IMAGE_GENERATION_TIMEOUT_MS = 600_000
const REMOVE_BG_TIMEOUT_MS = 180_000
const REMOVE_BG_SECRET_NAME = 'REMOVE_BG_API_KEY'
const REMOVE_BG_CAPABILITY_ID = 'remove-bg/background-removal'
const REMOVE_BG_PATH = '/v1.0/removebg'
const SERVER_STARTED_AT_MS = Date.now()
const ORPHANED_GENERATION_MESSAGE =
  'Redecorate restarted before this render finished. Retry to start it again.'

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
  folderId?: string | null
  favorite?: boolean
  archived?: boolean
  basePrompt?: string
  presetId?: string
  status?: 'generating' | 'ready' | 'failed'
  errorMessage?: string
  // True while we're auto-generating a title from the rendered image, so the
  // client can show a skeleton instead of the placeholder prompt-derived title.
  titlePending?: boolean
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
  folderId: z.string().trim().min(1).nullable().optional(),
  presetId: z.string().trim().min(1).optional(),
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
  folderId: z.string().trim().min(1).nullable().optional(),
})

const importImageParamsSchema = importGeneratedParamsSchema

const setAspectRatioParamsSchema = z.object({
  id: z.string().trim().min(1),
  baseIterationId: z.string().trim().min(1).optional(),
  aspectRatio: aspectRatioSchema,
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
  folderId: z.string().trim().min(1).nullable().optional(),
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
        'OpenAI image generation timed out before Redecorate received a response. Try again in a moment, or use a smaller aspect ratio if this keeps happening.',
    }
  }

  if (isCredentialError(error)) {
    return {
      code: 'credential_not_found',
      message:
        'Redecorate could not access the OpenAI image-generation credential.',
    }
  }

  return {
    code: 'redecorate_rpc_failed',
    message: errorMessage(error, 'Redecorate could not complete the request.'),
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
    `[Redecorate moldable-ai] start workspace=${workspaceLabel(workspaceId)} method=${request.method ?? 'POST'} path=${request.path ?? '/v1/images'} body=${request.body ? 'json' : request.multipartFields ? 'multipart' : 'empty'} timeoutMs=${request.timeoutMs ?? 'none'}`,
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
        `[Redecorate moldable-ai] unavailable workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)} message=${message}; falling back to aivault`,
      )
      return null
    }
    throw error
  }

  const status = parsed.response?.status
  if (canFallbackFromMoldableImageStatus(status)) {
    console.warn(
      `[Redecorate moldable-ai] upstream status=${status} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}; falling back to aivault`,
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
    `[Redecorate moldable-ai] success workspace=${workspaceLabel(workspaceId)} method=${request.method ?? 'POST'} path=${request.path ?? '/v1/images'} status=${status ?? 'unknown'} durationMs=${elapsedMs(startedAt)}`,
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
    `[Redecorate aivault] start workspace=${workspaceLabel(workspaceId)} method=${request.method ?? 'POST'} path=${request.path ?? '/v1/images'} body=${request.body ? 'json' : request.multipartFields ? 'multipart' : 'empty'} timeoutMs=${request.timeoutMs ?? 'none'}`,
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
      `[Redecorate aivault] failed workspace=${workspaceLabel(workspaceId)} method=${request.method ?? 'POST'} path=${request.path ?? '/v1/images'} durationMs=${elapsedMs(startedAt)} message=${errorMessage(error, 'aivault failed')}`,
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
    `[Redecorate aivault] success workspace=${workspaceLabel(workspaceId)} method=${request.method ?? 'POST'} path=${request.path ?? '/v1/images'} status=${status ?? 'unknown'} durationMs=${elapsedMs(startedAt)}`,
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
      `[Redecorate remove-bg] failed_to_list_secrets message=${errorMessage(error, 'unknown')}`,
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
      `[Redecorate] recovered_orphaned_generations workspace=${workspaceLabel(workspaceId)} count=${recoveredThreads.recoveredCount}`,
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

function statusWithExistingPending(
  thread: ImageThread,
): NonNullable<ImageThread['status']> {
  return thread.pendingIteration || thread.pendingIterations?.length
    ? 'generating'
    : 'ready'
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
      titlePending: false,
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
  const path = `/api/designs/assets/${encodeURIComponent(threadId)}/${encodeURIComponent(
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
  const buffer = Buffer.from(await file.arrayBuffer())
  const source = await normalizeUploadedSourceImage({
    workspaceId,
    originalName: file.name || 'File',
    mimeType,
    buffer,
  })
  const dimensions = detectImageDimensions(source.buffer, source.mimeType)
  const fileName = `${iterationId}.${source.extension}`
  const path = assetPath(workspaceId, threadId, fileName)
  await ensureDir(safePath(dataDir(workspaceId), 'assets', threadId))
  await writeFile(path, source.buffer)

  return {
    fileName,
    mimeType: source.mimeType,
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
  const source = await normalizeLocalSourceImage({ workspaceId, sourcePath })
  const dimensions = detectImageDimensions(source.buffer, source.mimeType)
  const fileName = `${iterationId}.${source.extension}`
  const path = assetPath(workspaceId, threadId, fileName)
  await ensureDir(safePath(dataDir(workspaceId), 'assets', threadId))
  await writeFile(path, source.buffer)

  return {
    fileName,
    mimeType: source.mimeType,
    size: dimensions ? `${dimensions.width}x${dimensions.height}` : 'unknown',
    width: dimensions?.width,
    height: dimensions?.height,
    originalName: source.originalName || originalName,
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

async function removeIterationAssets(
  workspaceId: string | undefined,
  threadId: string,
  iterations: ImageIteration[],
): Promise<void> {
  await Promise.all(
    iterations.map((iteration) =>
      rm(assetPath(workspaceId, threadId, iteration.fileName), {
        force: true,
      }),
    ),
  )
}

const IMAGE_TITLE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      description:
        'An evocative 5-7 word Title Case name for the space, capturing both the room/area and its style or mood (e.g. "Sunlit Scandinavian Kitchen Retreat", "Moody Industrial Living Room", "Lush Backyard Garden Patio"). No quotes, no trailing punctuation.',
    },
  },
  required: ['title'],
}

// Best-effort concise title for an imported photo. Falls back to null (caller
// keeps the filename-based title) when the model is unavailable.
async function titleFromImagePath(
  workspaceId: string | undefined,
  imagePath: string,
): Promise<string | null> {
  try {
    const result = await generateJson<{ title: string }>({
      workspaceId,
      purpose: 'redecorate.title-from-image',
      system:
        'You write evocative, friendly titles for photos and renders of rooms and outdoor spaces in a home-redesign app.',
      prompt:
        'Give a vivid 5-7 word Title Case title that names the space shown (the room or area) and captures its style or mood. No quotes or punctuation.',
      imagePaths: [imagePath],
      schema: IMAGE_TITLE_SCHEMA,
      schemaName: 'image_title',
      maxOutputTokens: 80,
      timeoutMs: 30_000,
    })
    const title = (result?.title ?? '').replace(/["']/g, '').trim()
    return title ? title.slice(0, 80) : null
  } catch {
    return null
  }
}

// Replace filename-based titles with AI-generated ones where possible.
async function titleImportedThreads(
  workspaceId: string | undefined,
  threads: ImageThread[],
): Promise<void> {
  await Promise.all(
    threads.map(async (thread) => {
      const cover =
        thread.iterations.find((it) => it.id === thread.coverIterationId) ??
        thread.iterations[0]
      if (!cover) return
      const title = await titleFromImagePath(
        workspaceId,
        assetPath(workspaceId, thread.id, cover.fileName),
      )
      if (title) thread.title = title
    }),
  )
}

// After a from-scratch generation lands, replace the prompt-derived title with
// an AI title describing the actual render — but only if the user hasn't renamed
// it in the meantime. Best-effort: never throws, so a titling hiccup can't flip
// the finished render to a failed state.
async function autoTitleGeneratedThread(
  workspaceId: string | undefined,
  thread: ImageThread,
  defaultTitle: string,
  requestId: string,
): Promise<void> {
  let title: string | null = null
  try {
    const cover =
      thread.iterations.find((it) => it.id === thread.coverIterationId) ??
      thread.iterations.at(-1)
    if (cover) {
      title = await titleFromImagePath(
        workspaceId,
        assetPath(workspaceId, thread.id, cover.fileName),
      )
    }
  } catch (error) {
    console.warn(
      `[Redecorate generation ${requestId}] auto_title_failed thread=${thread.id} workspace=${workspaceLabel(workspaceId)} message=${errorMessage(error, 'unknown')}`,
    )
  }

  // Always clear the pending flag so the title skeleton can't get stuck, and
  // apply the new title only if the user hasn't renamed it in the meantime.
  // Best-effort: never throws, so this can't flip the finished render to failed.
  try {
    const threads = await loadThreads(workspaceId)
    const index = threads.findIndex((it) => it.id === thread.id)
    if (index === -1) return
    const current = threads[index]
    if (!current.titlePending) return
    const applied = Boolean(title) && current.title === defaultTitle
    threads[index] = {
      ...current,
      title: applied ? (title as string) : current.title,
      titlePending: false,
      updatedAt: new Date().toISOString(),
    }
    await saveThreads(workspaceId, threads)
    console.info(
      `[Redecorate generation ${requestId}] auto_titled thread=${thread.id} workspace=${workspaceLabel(workspaceId)} applied=${applied}`,
    )
  } catch (error) {
    console.warn(
      `[Redecorate generation ${requestId}] auto_title_persist_failed thread=${thread.id} workspace=${workspaceLabel(workspaceId)} message=${errorMessage(error, 'unknown')}`,
    )
  }
}

async function importImages(
  workspaceId: string | undefined,
  files: File[],
  mode: z.infer<typeof importModeSchema>,
  folderId?: string | null,
): Promise<ImageThread[]> {
  const now = new Date().toISOString()
  if (folderId) await assertFolderExists(workspaceId, folderId)

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

  if (folderId) {
    for (const thread of importedThreads) thread.folderId = folderId
  }
  await titleImportedThreads(workspaceId, importedThreads)
  const threads = await loadThreads(workspaceId)
  await saveThreads(workspaceId, [...importedThreads, ...threads])
  return importedThreads
}

async function importImagePaths(
  workspaceId: string | undefined,
  paths: string[],
  mode: z.infer<typeof importModeSchema>,
  folderId?: string | null,
): Promise<ImageThread[]> {
  const now = new Date().toISOString()
  if (folderId) await assertFolderExists(workspaceId, folderId)

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

  if (folderId) {
    for (const thread of importedThreads) thread.folderId = folderId
  }
  await titleImportedThreads(workspaceId, importedThreads)
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
    titlePending: true,
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
  if (params.folderId) await assertFolderExists(workspaceId, params.folderId)

  const now = new Date().toISOString()
  const thread: ImageThread = {
    id: randomUUID(),
    title: titleFromPrompt(params.prompt),
    prompt: params.prompt,
    aspectRatio: params.aspectRatio ?? 'square',
    quality: params.quality ?? DEFAULT_QUALITY,
    folderId: params.folderId ?? null,
    presetId: params.presetId,
    status: 'generating',
    titlePending: true,
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
  const threads = await loadThreads(workspaceId)
  const threadIndex = threads.findIndex((thread) => thread.id === params.id)
  const thread = threads[threadIndex]
  if (!thread) return null

  if (thread.status !== 'failed') {
    return thread
  }

  const failedIteration = thread.pendingIteration
  if (failedIteration?.kind === 'edit') {
    return queueThreadEdit(
      workspaceId,
      {
        id: thread.id,
        baseIterationId: failedIteration.baseIterationId,
        prompt: failedIteration.prompt,
        aspectRatio: failedIteration.aspectRatio,
        quality: params.quality ?? failedIteration.quality,
      },
      requestId,
    )
  }
  if (
    failedIteration?.kind === 'generation' &&
    failedIteration.baseIterationId
  ) {
    return queueReferenceGeneration(
      workspaceId,
      {
        id: thread.id,
        baseIterationId: failedIteration.baseIterationId,
        prompt: failedIteration.prompt,
        aspectRatio: failedIteration.aspectRatio,
        quality: params.quality ?? failedIteration.quality,
      },
      requestId,
    )
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
    titlePending: true,
    pendingRequestId: requestId,
    updatedAt: new Date().toISOString(),
  }

  threads.splice(threadIndex, 1)
  threads.unshift(updated)
  await saveThreads(workspaceId, threads)

  console.info(
    `[Redecorate generation ${requestId}] retry_queued thread=${thread.id} workspace=${workspaceLabel(workspaceId)}`,
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
      `[Redecorate generation ${requestId}] background_start thread=${threadId} workspace=${workspaceLabel(workspaceId)}`,
    )
    const initialThreads = await loadThreads(workspaceId)
    const pending = initialThreads.find((thread) => thread.id === threadId)
    if (!pending) {
      console.warn(
        `[Redecorate generation ${requestId}] missing_pending_thread thread=${threadId} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return
    }
    if (!isActiveRequest(pending, requestId)) {
      console.info(
        `[Redecorate generation ${requestId}] background_cancelled thread=${threadId} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
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
      await removeIterationAssets(workspaceId, threadId, readyThread.iterations)
      console.warn(
        `[Redecorate generation ${requestId}] missing_pending_thread_after_generation thread=${threadId} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return
    }
    if (!isActiveRequest(threads[pendingIndex], requestId)) {
      await removeIterationAssets(workspaceId, threadId, readyThread.iterations)
      console.info(
        `[Redecorate generation ${requestId}] background_cancelled_after_generation thread=${threadId} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return
    }
    const currentPending = threads[pendingIndex]
    const preservedReadyThread: ImageThread = {
      ...readyThread,
      folderId: currentPending.folderId,
      favorite: currentPending.favorite,
      archived: currentPending.archived,
      presetId: currentPending.presetId,
      pendingRequestId: undefined,
    }

    threads.splice(pendingIndex, 1)
    threads.unshift(preservedReadyThread)
    await saveThreads(workspaceId, threads)
    console.info(
      `[Redecorate generation ${requestId}] background_success thread=${threadId} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
    )

    // Now that the render exists, give it a title that matches the image.
    await autoTitleGeneratedThread(
      workspaceId,
      preservedReadyThread,
      titleFromPrompt(params.prompt),
      requestId,
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
      `[Redecorate generation ${requestId}] background_failed thread=${threadId} workspace=${workspaceLabel(workspaceId)} code=${rpcError.code} durationMs=${elapsedMs(startedAt)} message=${errorMessage(error, rpcError.message)}`,
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
      `[Redecorate cancel ${requestId}] deleted_empty_pending_thread thread=${thread.id} workspace=${workspaceLabel(workspaceId)}`,
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
    `[Redecorate cancel ${requestId}] cleared_pending_thread thread=${thread.id} workspace=${workspaceLabel(workspaceId)}`,
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
    `[Redecorate delete ${requestId}] deleted_thread thread=${thread.id} workspace=${workspaceLabel(workspaceId)} iterations=${thread.iterations.length}`,
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

  await removeIterationAssets(workspaceId, thread.id, iterationsToDelete)

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
      `[Redecorate delete ${requestId}] deleted_iterations_and_thread thread=${thread.id} iterations=${deletedIterationIds.length} workspace=${workspaceLabel(workspaceId)}`,
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
  const nextPendingIteration =
    thread.pendingIteration?.baseIterationId &&
    deletedIterationIdSet.has(thread.pendingIteration.baseIterationId)
      ? undefined
      : thread.pendingIteration
  const nextPendingIterations = thread.pendingIterations?.filter(
    (pending) =>
      !pending.baseIterationId ||
      !deletedIterationIdSet.has(pending.baseIterationId),
  )
  const pendingIterations =
    nextPendingIterations && nextPendingIterations.length > 0
      ? nextPendingIterations
      : undefined
  const updated: ImageThread = {
    ...thread,
    aspectRatio:
      cover?.aspectRatio ?? latest?.aspectRatio ?? thread.aspectRatio,
    quality: latest?.quality ?? thread.quality,
    status:
      nextPendingIteration || pendingIterations?.length
        ? 'generating'
        : latest
          ? 'ready'
          : 'failed',
    errorMessage: undefined,
    pendingIteration: nextPendingIteration,
    pendingIterations,
    pendingRequestId: nextPendingIteration
      ? thread.pendingRequestId
      : undefined,
    coverIterationId: cover?.id,
    iterations: remainingIterations,
    updatedAt: new Date().toISOString(),
  }

  threads.splice(threadIndex, 1)
  threads.unshift(updated)
  await saveThreads(workspaceId, threads)

  console.info(
    `[Redecorate delete ${requestId}] deleted_iterations thread=${thread.id} iterations=${deletedIterationIds.length} workspace=${workspaceLabel(workspaceId)} remaining=${remainingIterations.length}`,
  )

  return {
    deleted: true,
    deletedThread: false,
    deletedIterationIds,
    notFoundIterationIds,
    thread: updated,
  }
}

async function queueReferenceGeneration(
  workspaceId: string | undefined,
  params: z.infer<typeof generateFromReferenceParamsSchema>,
  requestId: string,
): Promise<ImageThread | null> {
  const threads = await loadThreads(workspaceId)
  const threadIndex = threads.findIndex((thread) => thread.id === params.id)
  const thread = threads[threadIndex]
  if (!thread) return null

  const base = baseIterationForEdit(thread, params.baseIterationId)
  if (!base) throw new Error('Design does not have an image to reference.')

  const aspectRatio = params.aspectRatio ?? base.aspectRatio
  const quality = params.quality ?? base.quality ?? DEFAULT_QUALITY
  const now = new Date().toISOString()
  const pendingId = randomUUID()
  const queued: ImageThread = {
    ...thread,
    aspectRatio,
    quality,
    status: 'generating',
    errorMessage: undefined,
    pendingIteration:
      thread.status === 'failed' ? undefined : thread.pendingIteration,
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
  threads.unshift(queued)
  await saveThreads(workspaceId, threads)

  console.info(
    `[Redecorate reference ${requestId}] queued thread=${thread.id} base=${base.id} workspace=${workspaceLabel(workspaceId)}`,
  )
  void finishReferenceGeneration(
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

async function finishReferenceGeneration(
  workspaceId: string | undefined,
  params: z.infer<typeof generateFromReferenceParamsSchema>,
  requestId: string,
): Promise<void> {
  const startedAt = Date.now()
  try {
    console.info(
      `[Redecorate reference ${requestId}] background_start thread=${params.id} workspace=${workspaceLabel(workspaceId)}`,
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
        `[Redecorate reference ${requestId}] background_cancelled thread=${params.id} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
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

    const currentThreads = await loadThreads(workspaceId)
    const pendingIndex = currentThreads.findIndex(
      (thread) => thread.id === params.id,
    )
    if (pendingIndex === -1) return
    if (!hasActiveReferenceRequest(currentThreads[pendingIndex], requestId)) {
      console.info(
        `[Redecorate reference ${requestId}] background_cancelled_after_generation thread=${params.id} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return
    }

    const now = new Date().toISOString()
    const iterationId = randomUUID()
    const fileName = await saveImageAsset({
      workspaceId,
      threadId: params.id,
      iterationId,
      b64Json: image.b64Json,
    })
    const latestThreads = await loadThreads(workspaceId)
    const latestPendingIndex = latestThreads.findIndex(
      (thread) => thread.id === params.id,
    )
    if (
      latestPendingIndex === -1 ||
      !hasActiveReferenceRequest(latestThreads[latestPendingIndex], requestId)
    ) {
      await rm(assetPath(workspaceId, params.id, fileName), { force: true })
      console.info(
        `[Redecorate reference ${requestId}] background_cancelled_after_save thread=${params.id} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return
    }
    const latestPendingIterations = withoutPendingReferenceRequest(
      latestThreads[latestPendingIndex],
      requestId,
    )
    const readyThread: ImageThread = {
      ...latestThreads[latestPendingIndex],
      aspectRatio,
      quality,
      status:
        latestThreads[latestPendingIndex].pendingIteration ||
        latestPendingIterations?.length
          ? 'generating'
          : 'ready',
      errorMessage: undefined,
      pendingIterations: latestPendingIterations,
      coverIterationId: iterationId,
      updatedAt: now,
      iterations: [
        ...latestThreads[latestPendingIndex].iterations,
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
          parentIterationId: base.id,
          createdAt: now,
        },
      ],
    }

    latestThreads.splice(latestPendingIndex, 1)
    latestThreads.unshift(readyThread)
    await saveThreads(workspaceId, latestThreads)
    console.info(
      `[Redecorate reference ${requestId}] background_success thread=${params.id} iteration=${iterationId} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
    )
  } catch (error) {
    const rpcError = rpcErrorFromUnknown(error)
    const threads = await loadThreads(workspaceId)
    const threadIndex = threads.findIndex((thread) => thread.id === params.id)
    if (
      threadIndex !== -1 &&
      hasActiveReferenceRequest(threads[threadIndex], requestId)
    ) {
      const failedPending = threads[threadIndex].pendingIterations?.find(
        (iteration) => iteration.requestId === requestId,
      )
      const pendingIterations = withoutPendingReferenceRequest(
        threads[threadIndex],
        requestId,
      )
      const stillGenerating =
        Boolean(threads[threadIndex].pendingIteration) ||
        Boolean(pendingIterations?.length)
      threads[threadIndex] = {
        ...threads[threadIndex],
        status: stillGenerating ? 'generating' : 'failed',
        errorMessage: rpcError.message,
        pendingIteration:
          !stillGenerating && failedPending
            ? { ...failedPending, requestId: undefined }
            : threads[threadIndex].pendingIteration,
        pendingIterations,
        updatedAt: new Date().toISOString(),
      }
      await saveThreads(workspaceId, threads)
    }
    console.error(
      `[Redecorate reference ${requestId}] background_failed thread=${params.id} workspace=${workspaceLabel(workspaceId)} code=${rpcError.code} durationMs=${elapsedMs(startedAt)} message=${errorMessage(error, rpcError.message)}`,
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
  const threads = await loadThreads(workspaceId)
  const threadIndex =
    params.id === undefined
      ? -1
      : threads.findIndex((thread) => thread.id === params.id)

  if (params.id !== undefined && threadIndex === -1) return null
  if (params.folderId) await assertFolderExists(workspaceId, params.folderId)

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

  const updated: ImageThread =
    threadIndex === -1
      ? {
          id: threadId,
          title,
          prompt,
          aspectRatio,
          quality,
          folderId: params.folderId ?? null,
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
          status: statusWithExistingPending(threads[threadIndex]),
          errorMessage: undefined,
          ...(Object.hasOwn(params, 'folderId')
            ? { folderId: params.folderId }
            : {}),
          coverIterationId: iterationId,
          updatedAt: now,
          iterations: [...threads[threadIndex].iterations, iteration],
        }

  if (threadIndex === -1) {
    threads.unshift(updated)
  } else {
    threads.splice(threadIndex, 1)
    threads.unshift(updated)
  }
  await saveThreads(workspaceId, threads)

  console.info(
    `[Redecorate import-generated ${requestId}] saved thread=${updated.id} workspace=${workspaceLabel(workspaceId)} path=${params.imagePath}`,
  )
  return updated
}

async function importLocalImage(
  workspaceId: string | undefined,
  params: z.infer<typeof importImageParamsSchema>,
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
  const threads = await loadThreads(workspaceId)
  const threadIndex =
    params.id === undefined
      ? -1
      : threads.findIndex((thread) => thread.id === params.id)

  if (params.id !== undefined && threadIndex === -1) return null
  if (params.folderId) await assertFolderExists(workspaceId, params.folderId)

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
    kind: 'upload',
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

  const updated: ImageThread =
    threadIndex === -1
      ? {
          id: threadId,
          title,
          prompt,
          aspectRatio,
          quality,
          folderId: params.folderId ?? null,
          status: 'ready',
          coverIterationId: iterationId,
          createdAt: now,
          updatedAt: now,
          iterations: [iteration],
        }
      : {
          ...threads[threadIndex],
          title: params.title?.trim() || threads[threadIndex].title || title,
          prompt: threads[threadIndex].prompt || prompt,
          aspectRatio,
          quality,
          status: statusWithExistingPending(threads[threadIndex]),
          errorMessage: undefined,
          ...(Object.hasOwn(params, 'folderId')
            ? { folderId: params.folderId }
            : {}),
          coverIterationId: iterationId,
          updatedAt: now,
          iterations: [...threads[threadIndex].iterations, iteration],
        }

  if (threadIndex === -1) {
    threads.unshift(updated)
  } else {
    threads.splice(threadIndex, 1)
    threads.unshift(updated)
  }
  await saveThreads(workspaceId, threads)

  console.info(
    `[Redecorate import-image ${requestId}] saved thread=${updated.id} workspace=${workspaceLabel(workspaceId)} path=${params.imagePath}`,
  )
  return updated
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
  if (!base) throw new Error('Design does not have an image to edit.')

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
    `[Redecorate edit ${requestId}] queued thread=${thread.id} workspace=${workspaceLabel(workspaceId)}`,
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
  if (!base) throw new Error('Design does not have an image to edit.')

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
  const currentThreads = await loadThreads(workspaceId)
  const currentThreadIndex = currentThreads.findIndex(
    (candidate) => candidate.id === params.id,
  )
  const currentThread = currentThreads[currentThreadIndex]
  if (!currentThread) return null
  if (!isActiveRequest(currentThread, requestId)) {
    console.info(
      `[Redecorate edit ${requestId}] background_cancelled_after_edit thread=${params.id} workspace=${workspaceLabel(workspaceId)}`,
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
  const latestThreads = await loadThreads(workspaceId)
  const latestThreadIndex = latestThreads.findIndex(
    (candidate) => candidate.id === params.id,
  )
  const latestThread = latestThreads[latestThreadIndex]
  if (!latestThread || !isActiveRequest(latestThread, requestId)) {
    await rm(assetPath(workspaceId, currentThread.id, fileName), {
      force: true,
    })
    console.info(
      `[Redecorate edit ${requestId}] background_cancelled_after_save thread=${params.id} workspace=${workspaceLabel(workspaceId)}`,
    )
    return latestThread ?? null
  }

  const updated: ImageThread = {
    ...latestThread,
    aspectRatio,
    status: latestThread.pendingIterations?.length ? 'generating' : 'ready',
    errorMessage: undefined,
    pendingIteration: undefined,
    pendingRequestId: undefined,
    coverIterationId: iterationId,
    updatedAt: now,
    iterations: [
      ...latestThread.iterations,
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

  latestThreads.splice(latestThreadIndex, 1)
  latestThreads.unshift(updated)
  await saveThreads(workspaceId, latestThreads)
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
      `[Redecorate edit ${requestId}] background_start thread=${params.id} workspace=${workspaceLabel(workspaceId)}`,
    )
    const thread = await editThread(workspaceId, params, requestId)
    if (!thread) {
      console.warn(
        `[Redecorate edit ${requestId}] image_not_found thread=${params.id} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return
    }
    console.info(
      `[Redecorate edit ${requestId}] background_success thread=${params.id} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
    )
  } catch (error) {
    const rpcError = rpcErrorFromUnknown(error)
    const threads = await loadThreads(workspaceId)
    const threadIndex = threads.findIndex((thread) => thread.id === params.id)
    if (
      threadIndex !== -1 &&
      isActiveRequest(threads[threadIndex], requestId)
    ) {
      const failedPending = threads[threadIndex].pendingIteration
        ? { ...threads[threadIndex].pendingIteration, requestId: undefined }
        : undefined
      const stillGenerating = Boolean(
        threads[threadIndex].pendingIterations?.length,
      )
      threads[threadIndex] = {
        ...threads[threadIndex],
        status: stillGenerating ? 'generating' : 'failed',
        errorMessage: rpcError.message,
        pendingIteration: stillGenerating ? undefined : failedPending,
        pendingRequestId: undefined,
        updatedAt: new Date().toISOString(),
      }
      await saveThreads(workspaceId, threads)
    }
    console.error(
      `[Redecorate edit ${requestId}] background_failed thread=${params.id} workspace=${workspaceLabel(workspaceId)} code=${rpcError.code} durationMs=${elapsedMs(startedAt)} message=${errorMessage(error, rpcError.message)}`,
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

  const base =
    baseIterationForEdit(thread, params.baseIterationId) ??
    latestIteration(thread)
  if (!base) throw new Error('Design does not have an image to edit.')

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
    `[Redecorate edit ${requestId}] queued thread=${thread.id} workspace=${workspaceLabel(workspaceId)}`,
  )
  void finishEditingThread(
    workspaceId,
    {
      id: params.id,
      baseIterationId: base.id,
      prompt,
      aspectRatio: params.aspectRatio,
      quality,
    },
    requestId,
  )
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
    throw new Error('Design does not have an image to process.')
  }

  const sourcePath = assetPath(workspaceId, thread.id, base.fileName)
  const startedAt = Date.now()
  console.info(
    `[Redecorate remove-bg ${requestId}] start thread=${thread.id} iteration=${base.id} workspace=${workspaceLabel(workspaceId)}`,
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

  const currentThreads = await loadThreads(workspaceId)
  const currentThreadIndex = currentThreads.findIndex(
    (candidate) => candidate.id === params.id,
  )
  const currentThread = currentThreads[currentThreadIndex]
  const currentBase = currentThread?.iterations.find(
    (iteration) => iteration.id === base.id,
  )
  if (!currentThread || !currentBase) return null

  const now = new Date().toISOString()
  const iterationId = randomUUID()
  const asset = await saveBufferImageAsset({
    workspaceId,
    threadId: currentThread.id,
    iterationId,
    buffer,
    mimeType: 'image/png',
    extension: 'png',
  })
  const latestThreads = await loadThreads(workspaceId)
  const latestThreadIndex = latestThreads.findIndex(
    (candidate) => candidate.id === params.id,
  )
  const latestThread = latestThreads[latestThreadIndex]
  const latestBase = latestThread?.iterations.find(
    (iteration) => iteration.id === base.id,
  )
  if (!latestThread || !latestBase) {
    await rm(assetPath(workspaceId, currentThread.id, asset.fileName), {
      force: true,
    })
    return null
  }

  const updated: ImageThread = {
    ...latestThread,
    status: statusWithExistingPending(latestThread),
    errorMessage: undefined,
    coverIterationId: iterationId,
    updatedAt: now,
    iterations: [
      ...latestThread.iterations,
      {
        id: iterationId,
        prompt: latestBase.prompt
          ? `${latestBase.prompt}\n\nBackground removed with remove.bg.`
          : 'Background removed with remove.bg.',
        kind: 'background-removal',
        aspectRatio: inferAspectRatio(asset.width, asset.height),
        size: asset.size,
        quality: latestBase.quality,
        fileName: asset.fileName,
        mimeType: 'image/png',
        parentIterationId: latestBase.id,
        width: asset.width,
        height: asset.height,
        createdAt: now,
      },
    ],
  }

  latestThreads.splice(latestThreadIndex, 1)
  latestThreads.unshift(updated)
  await saveThreads(workspaceId, latestThreads)

  console.info(
    `[Redecorate remove-bg ${requestId}] success thread=${thread.id} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
  )
  return updated
}

// ─── Folders & catalog ───────────────────────────────────────────────────────

const FOLDER_TONES = [
  '#C9A66B',
  '#8FA98E',
  '#6E8CA0',
  '#B5836B',
  '#9A7AA0',
  '#C77B5C',
  '#7C9A92',
  '#A0808B',
  '#7E8AA2',
  '#B59A52',
  '#6F9488',
  '#A86F6F',
]

function toneFromSeed(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return FOLDER_TONES[Math.abs(hash) % FOLDER_TONES.length] ?? FOLDER_TONES[0]
}

type SpaceKind = 'interior' | 'exterior' | 'both'

type Folder = {
  id: string
  name: string
  emoji: string
  tone: string
  space: SpaceKind
  blurb?: string
  sortOrder?: number
  createdAt: string
  updatedAt: string
}

const createFolderSchema = z.object({
  name: z.string().trim().min(1).max(80),
  emoji: z.string().trim().min(1).max(8).optional(),
  space: z.enum(['interior', 'exterior', 'both']).optional(),
  blurb: z.string().trim().max(160).optional(),
})

const updateFolderSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(80).optional(),
  emoji: z.string().trim().min(1).max(8).optional(),
  blurb: z.string().trim().max(160).optional(),
})

const reorderFoldersSchema = z.object({
  folderIds: z.array(z.string().trim().min(1)),
})

const moveDesignSchema = z.object({
  id: z.string().trim().min(1),
  folderId: z.string().trim().min(1).nullable(),
})

const favoriteDesignSchema = z.object({
  id: z.string().trim().min(1),
  favorite: z.boolean().optional(),
})

const archiveDesignSchema = z.object({
  id: z.string().trim().min(1),
  archived: z.boolean().optional(),
})

function foldersPath(workspaceId?: string): string {
  return safePath(dataDir(workspaceId), FOLDERS_FILE)
}

function seededMarkerPath(workspaceId?: string): string {
  return safePath(dataDir(workspaceId), FOLDERS_SEEDED_MARKER)
}

function sortFolders(folders: Folder[]): Folder[] {
  return [...folders].sort((a, b) => {
    const ao =
      typeof a.sortOrder === 'number' ? a.sortOrder : Number.POSITIVE_INFINITY
    const bo =
      typeof b.sortOrder === 'number' ? b.sortOrder : Number.POSITIVE_INFINITY
    if (ao !== bo) return ao - bo
    return a.createdAt.localeCompare(b.createdAt)
  })
}

function nextFolderSortOrder(folders: Folder[]): number {
  const orders = folders
    .map((folder) => folder.sortOrder)
    .filter((order): order is number => typeof order === 'number')
  return orders.length > 0 ? Math.max(...orders) + 1 : 0
}

async function readFoldersRaw(workspaceId?: string): Promise<Folder[]> {
  await ensureDir(dataDir(workspaceId))
  const raw = await readJson<Folder[]>(foldersPath(workspaceId), [])
  return Array.isArray(raw) ? raw : []
}

async function seedStarterFolders(workspaceId?: string): Promise<void> {
  await ensureDir(dataDir(workspaceId))
  if (existsSync(seededMarkerPath(workspaceId))) return
  const existing = await readFoldersRaw(workspaceId)
  if (existing.length === 0) {
    const now = new Date().toISOString()
    const seeded: Folder[] = STARTER_FOLDERS.map((folder, index) => ({
      id: randomUUID(),
      name: folder.name,
      emoji: folder.emoji,
      tone: toneFromSeed(folder.name),
      space: folder.space,
      blurb: folder.blurb,
      sortOrder: index,
      createdAt: now,
      updatedAt: now,
    }))
    await writeJson(foldersPath(workspaceId), seeded)
  }
  await writeFile(seededMarkerPath(workspaceId), new Date().toISOString())
}

async function loadFolders(workspaceId?: string): Promise<Folder[]> {
  await seedStarterFolders(workspaceId)
  return sortFolders(await readFoldersRaw(workspaceId))
}

async function saveFolders(
  workspaceId: string | undefined,
  folders: Folder[],
): Promise<void> {
  await ensureDir(dataDir(workspaceId))
  await writeJson(foldersPath(workspaceId), folders)
}

function serializeFolder(
  folder: Folder,
  designs: ImageThread[],
  workspaceId?: string,
) {
  const inFolder = designs.filter(
    (design) => design.folderId === folder.id && !design.archived,
  )
  const covers = inFolder
    .map((design) => {
      const displayed = displayIteration(design)
      return displayed ? imageUrl(design.id, displayed.id, workspaceId) : null
    })
    .filter((url): url is string => Boolean(url))
    .slice(0, 4)
  return { ...folder, designCount: inFolder.length, covers }
}

async function patchThread(
  workspaceId: string | undefined,
  id: string,
  patch: Partial<ImageThread>,
): Promise<ImageThread | null> {
  const threads = await loadThreads(workspaceId)
  const index = threads.findIndex((thread) => thread.id === id)
  if (index === -1) return null
  const updated: ImageThread = {
    ...threads[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  threads[index] = updated
  await saveThreads(workspaceId, threads)
  return updated
}

async function assertFolderExists(
  workspaceId: string | undefined,
  folderId: string,
): Promise<void> {
  const folders = await loadFolders(workspaceId)
  if (!folders.some((folder) => folder.id === folderId)) {
    throw new Error(`Folder ${folderId} was not found.`)
  }
}

// ─── Custom styles (user-created, incl. from an inspiration image) ────────────

type CustomStyle = {
  id: string
  name: string
  blurb: string
  prompt: string
  applies: SpaceKind
  accent: string
  tags: string[]
  subtypes?: string[]
  thumbnailExt?: string
  createdAt: string
}

const SUBTYPE_KEYS = STYLE_SUBTYPES.map((s) => s.key)
const SUBTYPE_KEY_SET = new Set(SUBTYPE_KEYS)

const CUSTOM_STYLES_FILE = 'custom-styles.json'
const STYLE_PANEL_STATE_FILE = 'style-panel-state.json'

type StylePanelEntry = { room: string | null; query: string }

const stylePanelStateSchema = z.object({
  contextKey: z.string().trim().min(1).max(200),
  room: z.string().trim().min(1).nullable().optional(),
  query: z.string().max(200).optional(),
})

const createStyleSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(60),
  blurb: z.string().trim().max(160).optional(),
  prompt: z.string().trim().min(1),
  applies: z.enum(['interior', 'exterior', 'both']).optional(),
  accent: z
    .string()
    .trim()
    .regex(/^#?[0-9a-fA-F]{6}$/)
    .optional(),
  tags: z.array(z.string().trim().min(1)).max(8).optional(),
  subtypes: z.array(z.string().trim().min(1)).max(12).optional(),
})

const describeStylePathSchema = z.object({
  path: z.string().trim().min(1),
})

function customStylesPath(workspaceId?: string): string {
  return safePath(dataDir(workspaceId), CUSTOM_STYLES_FILE)
}

function styleAssetsDir(workspaceId?: string): string {
  return safePath(dataDir(workspaceId), 'style-assets')
}

async function loadCustomStyles(workspaceId?: string): Promise<CustomStyle[]> {
  await ensureDir(dataDir(workspaceId))
  const raw = await readJson<CustomStyle[]>(customStylesPath(workspaceId), [])
  return Array.isArray(raw) ? raw : []
}

async function saveCustomStyles(
  workspaceId: string | undefined,
  styles: CustomStyle[],
): Promise<void> {
  await ensureDir(dataDir(workspaceId))
  await writeJson(customStylesPath(workspaceId), styles)
}

function normalizeAccent(accent?: string): string {
  if (!accent) return '#8A8D91'
  return accent.startsWith('#') ? accent : `#${accent}`
}

function styleThumbnailUrl(
  style: CustomStyle,
  workspaceId?: string,
): string | undefined {
  if (!style.thumbnailExt) return undefined
  const base = `/api/styles/assets/${encodeURIComponent(style.id)}`
  return workspaceId
    ? `${base}?workspace=${encodeURIComponent(workspaceId)}`
    : base
}

const CUSTOM_INTERIOR_SUBTYPES = [
  'living-room',
  'kitchen',
  'bedroom',
  'bathroom',
  'home-office',
  'dining-room',
  'entryway',
]
const CUSTOM_EXTERIOR_SUBTYPES = [
  'facade',
  'backyard',
  'patio-deck',
  'garden',
  'front-yard',
]

function subtypesForApplies(applies: SpaceKind): string[] {
  if (applies === 'exterior') return CUSTOM_EXTERIOR_SUBTYPES
  if (applies === 'both') {
    return [...CUSTOM_INTERIOR_SUBTYPES, ...CUSTOM_EXTERIOR_SUBTYPES]
  }
  return CUSTOM_INTERIOR_SUBTYPES
}

function serializeCustomStyle(style: CustomStyle, workspaceId?: string) {
  return {
    id: style.id,
    name: style.name,
    blurb: style.blurb,
    prompt: style.prompt,
    applies: style.applies,
    accent: style.accent,
    tags: style.tags,
    subtypes:
      style.subtypes && style.subtypes.length
        ? style.subtypes
        : subtypesForApplies(style.applies),
    category: 'custom',
    thumbnail: styleThumbnailUrl(style, workspaceId),
  }
}

async function catalogFor(workspaceId?: string) {
  const [built, custom] = await Promise.all([
    presetsWithThumbnails(),
    loadCustomStyles(workspaceId),
  ])
  const customSerialized = custom
    .slice()
    .reverse()
    .map((style) => serializeCustomStyle(style, workspaceId))
  const categories =
    custom.length > 0
      ? [
          {
            key: 'custom',
            label: 'My styles',
            emoji: '⭐',
            description: 'Styles you created',
          },
          ...PRESET_CATEGORIES,
        ]
      : PRESET_CATEGORIES
  return {
    categories,
    presets: [...customSerialized, ...built],
    templates: PROMPT_TEMPLATES,
  }
}

async function saveStyleAsset(
  workspaceId: string | undefined,
  styleId: string,
  file: File,
): Promise<string> {
  const mimeType = file.type || 'application/octet-stream'
  const source = await normalizeUploadedSourceImage({
    workspaceId,
    originalName: file.name || 'Style reference',
    mimeType,
    buffer: Buffer.from(await file.arrayBuffer()),
  })
  await ensureDir(styleAssetsDir(workspaceId))
  const path = safePath(
    styleAssetsDir(workspaceId),
    `${styleId}.${source.extension}`,
  )
  await writeFile(path, source.buffer)
  return source.extension
}

async function saveStyleAssetFromPath(
  workspaceId: string | undefined,
  styleId: string,
  sourcePath: string,
): Promise<string> {
  const source = await normalizeLocalSourceImage({
    workspaceId,
    sourcePath,
    originalName: basename(sourcePath),
  })
  await ensureDir(styleAssetsDir(workspaceId))
  const path = safePath(
    styleAssetsDir(workspaceId),
    `${styleId}.${source.extension}`,
  )
  await writeFile(path, source.buffer)
  return source.extension
}

async function findStyleAsset(
  workspaceId: string | undefined,
  styleId: string,
): Promise<{ path: string; ext: string } | null> {
  try {
    const entries = await readdir(styleAssetsDir(workspaceId))
    const match = entries.find((name) => name.startsWith(`${styleId}.`))
    if (!match) return null
    return {
      path: safePath(styleAssetsDir(workspaceId), match),
      ext: match.slice(match.lastIndexOf('.') + 1),
    }
  } catch {
    return null
  }
}

export const STYLE_FROM_IMAGE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string', description: 'Short style name, 1-3 words.' },
    blurb: {
      type: ['string', 'null'],
      description: 'One-line description of the look (max ~90 chars).',
    },
    prompt: {
      type: 'string',
      description:
        "A vivid image-generation instruction that restyles a photo of a user's room/space into THIS look while preserving the existing room geometry, windows, and architecture. 1-3 sentences describing materials, palette, furniture, lighting, mood.",
    },
    applies: {
      type: ['string', 'null'],
      enum: ['interior', 'exterior', 'both', null],
    },
    accent: {
      type: ['string', 'null'],
      description: 'A hex color (e.g. #C9A66B) capturing the look.',
    },
    tags: { type: ['array', 'null'], items: { type: 'string' } },
    subtypes: {
      type: ['array', 'null'],
      items: { type: 'string', enum: SUBTYPE_KEYS },
      description:
        'Which room/area subtypes this style suits. Pick every applicable one (1-6). Interior aesthetics that work in any room should include the common interior rooms; a specific room makeover picks that room; outdoor looks pick outdoor areas.',
    },
  },
  required: [
    'name',
    'blurb',
    'prompt',
    'applies',
    'accent',
    'tags',
    'subtypes',
  ],
}

async function describeStyleFromImage(
  workspaceId: string | undefined,
  imagePath: string,
): Promise<{
  name: string
  blurb: string
  prompt: string
  applies: SpaceKind
  accent: string
  tags: string[]
  subtypes: string[]
}> {
  const result = await generateJson<{
    name: string
    blurb: string | null
    prompt: string
    applies: SpaceKind | null
    accent: string | null
    tags: string[] | null
    subtypes: string[] | null
  }>({
    workspaceId,
    purpose: 'redecorate.style-from-image',
    system:
      'You are a senior interior and exterior design expert. The user gives you an inspiration image. Define a reusable STYLE PRESET that recreates this look when applied to a DIFFERENT photo of their own space. Capture materials, color palette, furniture/finishes, lighting, and mood. The prompt must instruct an image model to restyle the user’s space into this look while preserving its existing geometry, windows, and architecture.',
    prompt:
      'Analyze this inspiration image and produce a style preset: a name, one-line blurb, an image-generation prompt, whether it suits interior/exterior/both, an accent hex color, a few tags, and the room/area subtypes it suits.',
    imagePaths: [imagePath],
    schema: STYLE_FROM_IMAGE_SCHEMA,
    schemaName: 'style_preset',
    maxOutputTokens: 700,
    timeoutMs: 60_000,
  })
  const applies = result.applies ?? 'both'
  const subtypes = (
    Array.isArray(result.subtypes) ? result.subtypes : []
  ).filter((k) => SUBTYPE_KEY_SET.has(k))
  return {
    name: (result.name || 'Custom style').slice(0, 60),
    blurb: (result.blurb || '').slice(0, 160),
    prompt: result.prompt,
    applies,
    accent: normalizeAccent(result.accent ?? undefined),
    tags: Array.isArray(result.tags) ? result.tags.slice(0, 6) : [],
    subtypes: subtypes.length ? subtypes : subtypesForApplies(applies),
  }
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
app.use('/api/*', cors())

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null

  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'redecorate',
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
            method: 'redecorate.designs.retry',
            params: { id: failed.id },
          },
          { type: 'open-app', label: 'Open Redecorate' },
        ],
      })
    } else if (generating) {
      const label = generating.title || titleFromPrompt(generating.prompt)
      items.push({
        id: 'render:active',
        kind: 'active',
        surface: 'nudge',
        title: label || 'Untitled design',
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

app.get('/api/designs/aspect-ratios', (c) => {
  return c.json(Object.values(ASPECT_RATIOS))
})

app.get('/api/designs', async (c) => {
  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    const threads = await loadThreads(workspaceId)
    return c.json(threads.map((thread) => serializeThread(thread, workspaceId)))
  } catch (error) {
    return c.json(errorResponse(error, 'Failed to load designs'), 500)
  }
})

app.post('/api/designs/import', async (c) => {
  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    const form = await c.req.raw.formData()
    const files = form
      .getAll('files')
      .filter(isUploadFile)
      .filter((file) => file.size > 0)

    if (files.length === 0) {
      return c.json({ error: 'No image files were provided.' }, 400)
    }
    const unsupported = files.find(
      (file) =>
        !isSupportedSourceImageMimeType(file.type || '') &&
        !isSupportedSourceImageName(file.name),
    )
    if (unsupported) {
      throw supportedSourceImageError(unsupported.name)
    }

    const modeRaw = form.get('mode')
    const mode = importModeSchema.parse(
      typeof modeRaw === 'string'
        ? modeRaw
        : files.length > 1
          ? 'group'
          : 'separate',
    )
    const folderRaw = form.get('folderId')
    const folderId =
      typeof folderRaw === 'string' && folderRaw ? folderRaw : null
    const imported = await importImages(workspaceId, files, mode, folderId)
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
    return c.json(errorResponse(error, 'Failed to import photos'), 500)
  }
})

app.post('/api/designs/import-paths', async (c) => {
  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    const payload = importPathsSchema.parse(await c.req.json())

    if (payload.paths.length === 0) {
      return c.json({ error: 'No image files were provided.' }, 400)
    }
    const unsupported = payload.paths.find(
      (imagePath) => !isSupportedSourceImageName(imagePath),
    )
    if (unsupported) {
      throw supportedSourceImageError(basename(unsupported))
    }

    const imported = await importImagePaths(
      workspaceId,
      payload.paths,
      payload.mode ?? (payload.paths.length > 1 ? 'group' : 'separate'),
      payload.folderId ?? null,
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
    return c.json(errorResponse(error, 'Failed to import photos'), 500)
  }
})

app.get('/api/designs/:id', async (c) => {
  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    const id = c.req.param('id')
    const thread = (await loadThreads(workspaceId)).find(
      (candidate) => candidate.id === id,
    )
    if (!thread) return c.json({ error: 'Design was not found' }, 404)
    return c.json(serializeThread(thread, workspaceId))
  } catch (error) {
    return c.json(errorResponse(error, 'Failed to load image'), 500)
  }
})

app.get('/api/designs/assets/:threadId/:iterationId', async (c) => {
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
    if (!thread) return c.json({ error: 'Design was not found' }, 404)
    return c.json(serializeThread(thread, workspaceId))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid remove background options.' }, 400)
    }
    return c.json(errorResponse(error, 'Failed to remove background'), 500)
  }
})

// Auto-detect example renders dropped into public/styles/<presetId>.<ext>.
// Cached briefly so listing presets stays cheap; new files appear within ~5s.
const THUMB_EXTENSIONS = ['webp', 'jpg', 'jpeg', 'png', 'avif']
let thumbnailCache: { at: number; map: Record<string, string> } | null = null

async function styleThumbnails(): Promise<Record<string, string>> {
  if (thumbnailCache && Date.now() - thumbnailCache.at < 5_000) {
    return thumbnailCache.map
  }
  const map: Record<string, string> = {}
  try {
    const dir = safePath(process.cwd(), 'public', 'styles')
    const entries = await readdir(dir)
    for (const name of entries) {
      const dot = name.lastIndexOf('.')
      if (dot <= 0) continue
      const id = name.slice(0, dot)
      const ext = name.slice(dot + 1).toLowerCase()
      if (THUMB_EXTENSIONS.includes(ext) && !map[id]) {
        map[id] = `/styles/${encodeURIComponent(name)}`
      }
    }
  } catch {
    // No styles directory yet — every preset falls back to its accent gradient.
  }
  thumbnailCache = { at: Date.now(), map }
  return map
}

async function presetsWithThumbnails() {
  const thumbs = await styleThumbnails()
  if (Object.keys(thumbs).length === 0) return STYLE_PRESETS
  return STYLE_PRESETS.map((preset) =>
    thumbs[preset.id] ? { ...preset, thumbnail: thumbs[preset.id] } : preset,
  )
}

app.get('/api/presets', async (c) => {
  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    return c.json(await catalogFor(workspaceId))
  } catch (error) {
    return c.json(errorResponse(error, 'Failed to load styles'), 500)
  }
})

app.post('/api/styles/describe', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  try {
    const form = await c.req.raw.formData()
    const file = form.get('file')
    if (!file || !isUploadFile(file) || file.size === 0) {
      return c.json({ error: 'Upload an image to describe.' }, 400)
    }
    const id = randomUUID()
    const ext = await saveStyleAsset(workspaceId, id, file)
    const asset = safePath(styleAssetsDir(workspaceId), `${id}.${ext}`)
    const draft = await describeStyleFromImage(workspaceId, asset)
    return c.json({
      id,
      thumbnail: `/api/styles/assets/${id}?workspace=${encodeURIComponent(workspaceId ?? '')}`,
      draft,
    })
  } catch (error) {
    if (error instanceof UnsupportedSourceImageError) {
      return c.json({ error: error.message }, 400)
    }
    return c.json(
      errorResponse(error, 'Could not read a style from that image.'),
      500,
    )
  }
})

app.post('/api/styles/describe-path', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  try {
    const params = describeStylePathSchema.parse(await c.req.json())
    const id = randomUUID()
    const ext = await saveStyleAssetFromPath(workspaceId, id, params.path)
    const asset = safePath(styleAssetsDir(workspaceId), `${id}.${ext}`)
    const draft = await describeStyleFromImage(workspaceId, asset)
    return c.json({
      id,
      thumbnail: `/api/styles/assets/${id}?workspace=${encodeURIComponent(workspaceId ?? '')}`,
      draft,
    })
  } catch (error) {
    if (error instanceof UnsupportedSourceImageError) {
      return c.json({ error: error.message }, 400)
    }
    return c.json(
      errorResponse(error, 'Could not read a style from that image.'),
      500,
    )
  }
})

app.post('/api/styles', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  try {
    const params = createStyleSchema.parse(await c.req.json())
    const styles = await loadCustomStyles(workspaceId)
    const id = params.id?.trim() || randomUUID()
    const assetFromDescribe = params.id
      ? await findStyleAsset(workspaceId, id)
      : null
    const applies = params.applies ?? 'both'
    const subtypes = (params.subtypes ?? []).filter((k) =>
      SUBTYPE_KEY_SET.has(k),
    )
    const style: CustomStyle = {
      id,
      name: params.name,
      blurb: params.blurb ?? '',
      prompt: params.prompt,
      applies,
      accent: normalizeAccent(params.accent),
      tags: params.tags ?? [],
      subtypes: subtypes.length ? subtypes : subtypesForApplies(applies),
      thumbnailExt: assetFromDescribe?.ext,
      createdAt: new Date().toISOString(),
    }
    const next = [...styles.filter((s) => s.id !== id), style]
    await saveCustomStyles(workspaceId, next)
    return c.json(serializeCustomStyle(style, workspaceId))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid style.' }, 400)
    }
    return c.json(errorResponse(error, 'Failed to save style'), 500)
  }
})

app.delete('/api/styles/:id', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  try {
    const id = c.req.param('id')
    const styles = await loadCustomStyles(workspaceId)
    const next = styles.filter((s) => s.id !== id)
    if (next.length === styles.length) {
      return c.json({ error: 'Style not found' }, 404)
    }
    await saveCustomStyles(workspaceId, next)
    const asset = await findStyleAsset(workspaceId, id)
    if (asset) await rm(asset.path, { force: true })
    return c.json({ deleted: true, id })
  } catch (error) {
    return c.json(errorResponse(error, 'Failed to delete style'), 500)
  }
})

app.get('/api/styles/assets/:id', async (c) => {
  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    const id = c.req.param('id')
    const asset = await findStyleAsset(workspaceId, id)
    if (!asset) return c.text('Not found', 404)
    const bytes = await readFile(asset.path)
    const mimeType = imageMimeTypeForName(`x.${asset.ext}`) ?? 'image/png'
    return new Response(bytes, {
      headers: { 'Cache-Control': 'no-store', 'Content-Type': mimeType },
    })
  } catch {
    return c.text('Not found', 404)
  }
})

app.get('/api/folders', async (c) => {
  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    const [folders, designs] = await Promise.all([
      loadFolders(workspaceId),
      loadThreads(workspaceId),
    ])
    return c.json(folders.map((f) => serializeFolder(f, designs, workspaceId)))
  } catch (error) {
    return c.json(errorResponse(error, 'Failed to load folders'), 500)
  }
})

app.post('/api/folders', async (c) => {
  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    const params = createFolderSchema.parse(await c.req.json())
    const folders = await loadFolders(workspaceId)
    const now = new Date().toISOString()
    const folder: Folder = {
      id: randomUUID(),
      name: params.name,
      emoji: params.emoji ?? '\u{1F4C1}',
      tone: toneFromSeed(params.name),
      space: params.space ?? 'both',
      blurb: params.blurb,
      sortOrder: nextFolderSortOrder(folders),
      createdAt: now,
      updatedAt: now,
    }
    await saveFolders(workspaceId, [...folders, folder])
    const designs = await loadThreads(workspaceId)
    return c.json(serializeFolder(folder, designs, workspaceId))
  } catch (error) {
    if (error instanceof z.ZodError)
      return c.json({ error: 'Invalid folder.' }, 400)
    return c.json(errorResponse(error, 'Failed to create folder'), 500)
  }
})

app.patch('/api/folders/:id', async (c) => {
  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    const id = c.req.param('id')
    const body = (await c.req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >
    const params = updateFolderSchema.parse({ id, ...body })
    const folders = await loadFolders(workspaceId)
    const idx = folders.findIndex((f) => f.id === id)
    if (idx === -1) return c.json({ error: 'Folder not found' }, 404)
    folders[idx] = {
      ...folders[idx],
      ...(params.name ? { name: params.name } : {}),
      ...(params.emoji ? { emoji: params.emoji } : {}),
      ...(params.blurb !== undefined ? { blurb: params.blurb } : {}),
      updatedAt: new Date().toISOString(),
    }
    await saveFolders(workspaceId, folders)
    const designs = await loadThreads(workspaceId)
    return c.json(serializeFolder(folders[idx], designs, workspaceId))
  } catch (error) {
    if (error instanceof z.ZodError)
      return c.json({ error: 'Invalid folder.' }, 400)
    return c.json(errorResponse(error, 'Failed to update folder'), 500)
  }
})

app.delete('/api/folders/:id', async (c) => {
  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    const id = c.req.param('id')
    const folders = await loadFolders(workspaceId)
    const next = folders.filter((f) => f.id !== id)
    if (next.length === folders.length)
      return c.json({ error: 'Folder not found' }, 404)
    await saveFolders(workspaceId, next)
    const threads = await loadThreads(workspaceId)
    let changed = false
    for (const t of threads) {
      if (t.folderId === id) {
        t.folderId = null
        changed = true
      }
    }
    if (changed) await saveThreads(workspaceId, threads)
    return c.json({ deleted: true, id })
  } catch (error) {
    return c.json(errorResponse(error, 'Failed to delete folder'), 500)
  }
})

app.post('/api/folders/reorder', async (c) => {
  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    const params = reorderFoldersSchema.parse(await c.req.json())
    const folders = await loadFolders(workspaceId)
    const byId = new Map(folders.map((f) => [f.id, f]))
    const seen = new Set<string>()
    const ordered: Folder[] = []
    for (const fid of params.folderIds) {
      const f = byId.get(fid)
      if (f && !seen.has(fid)) {
        seen.add(fid)
        ordered.push(f)
      }
    }
    for (const f of folders) if (!seen.has(f.id)) ordered.push(f)
    const now = new Date().toISOString()
    const renumbered = ordered.map((f, i) => ({
      ...f,
      sortOrder: i,
      updatedAt: now,
    }))
    await saveFolders(workspaceId, renumbered)
    const designs = await loadThreads(workspaceId)
    return c.json(
      renumbered.map((f) => serializeFolder(f, designs, workspaceId)),
    )
  } catch (error) {
    if (error instanceof z.ZodError)
      return c.json({ error: 'Invalid reorder.' }, 400)
    return c.json(errorResponse(error, 'Failed to reorder folders'), 500)
  }
})

app.patch('/api/designs/:id', async (c) => {
  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    const id = c.req.param('id')
    const body = (await c.req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >
    const patch: Partial<ImageThread> = {}
    if (typeof body.favorite === 'boolean') patch.favorite = body.favorite
    if (typeof body.archived === 'boolean') patch.archived = body.archived
    if (body.folderId === null || typeof body.folderId === 'string') {
      if (typeof body.folderId === 'string') {
        await assertFolderExists(workspaceId, body.folderId)
      }
      patch.folderId = body.folderId as string | null
    }
    if (typeof body.title === 'string' && body.title.trim()) {
      patch.title = body.title.trim()
      patch.titlePending = false
    }
    const thread = await patchThread(workspaceId, id, patch)
    if (!thread) return c.json({ error: 'Design not found' }, 404)
    return c.json(serializeThread(thread, workspaceId))
  } catch (error) {
    return c.json(errorResponse(error, 'Failed to update design'), 500)
  }
})

app.get('/api/style-panel-state', async (c) => {
  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    await ensureDir(dataDir(workspaceId))
    const map = await readJson<Record<string, StylePanelEntry>>(
      safePath(dataDir(workspaceId), STYLE_PANEL_STATE_FILE),
      {},
    )
    return c.json(map)
  } catch (error) {
    return c.json(errorResponse(error, 'Failed to load panel state'), 500)
  }
})

app.post('/api/style-panel-state', async (c) => {
  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    const params = stylePanelStateSchema.parse(await c.req.json())
    await ensureDir(dataDir(workspaceId))
    const path = safePath(dataDir(workspaceId), STYLE_PANEL_STATE_FILE)
    const map = await readJson<Record<string, StylePanelEntry>>(path, {})
    const room = params.room ?? null
    const query = (params.query ?? '').trim()
    if (!room && !query) {
      delete map[params.contextKey]
    } else {
      map[params.contextKey] = { room, query }
    }
    // Keep the file bounded — drop the oldest entries beyond a cap.
    const keys = Object.keys(map)
    if (keys.length > 200) {
      for (const key of keys.slice(0, keys.length - 200)) delete map[key]
    }
    await writeJson(path, map)
    return c.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid panel state.' }, 400)
    }
    return c.json(errorResponse(error, 'Failed to save panel state'), 500)
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
      `[Redecorate RPC ${requestId}] start method=${method} workspace=${workspaceLabel(workspaceId)} params="${summarizeRpcParams(body.params)}"`,
    )

    if (body.method === 'redecorate.designs.list') {
      const params = listParamsSchema.parse(body.params)
      const limit = params?.limit ?? 25
      const result = (await loadThreads(workspaceId))
        .slice(0, limit)
        .map((thread) => serializeThread(thread, workspaceId))
      console.info(
        `[Redecorate RPC ${requestId}] success method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return c.json({
        ok: true,
        result,
      })
    }

    if (body.method === 'redecorate.designs.get') {
      const params = getParamsSchema.parse(body.params)
      const thread = (await loadThreads(workspaceId)).find(
        (candidate) => candidate.id === params.id,
      )
      if (!thread) {
        console.warn(
          `[Redecorate RPC ${requestId}] image_not_found method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)} id=${params.id}`,
        )
        return c.json(
          {
            ok: false,
            error: {
              code: 'image_not_found',
              message: `Design ${params.id} was not found.`,
            },
          },
          200,
        )
      }
      console.info(
        `[Redecorate RPC ${requestId}] success method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return c.json({ ok: true, result: serializeThread(thread, workspaceId) })
    }

    if (body.method === 'redecorate.designs.generate') {
      const params = generateParamsSchema.parse(body.params)
      const thread = await createGeneratingThread(
        workspaceId,
        params,
        requestId,
      )
      console.info(
        `[Redecorate RPC ${requestId}] success method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return c.json({
        ok: true,
        result: serializeThread(thread, workspaceId),
      })
    }

    if (body.method === 'redecorate.designs.retry') {
      const params = retryParamsSchema.parse(body.params)
      const thread = await retryThreadGeneration(workspaceId, params, requestId)
      if (!thread) {
        console.warn(
          `[Redecorate RPC ${requestId}] image_not_found method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)} id=${params.id}`,
        )
        return c.json(
          {
            ok: false,
            error: {
              code: 'image_not_found',
              message: `Design ${params.id} was not found.`,
            },
          },
          200,
        )
      }
      console.info(
        `[Redecorate RPC ${requestId}] success method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return c.json({ ok: true, result: serializeThread(thread, workspaceId) })
    }

    if (body.method === 'redecorate.designs.cancel') {
      const params = cancelParamsSchema.parse(body.params)
      const result = await cancelPendingThread(workspaceId, params, requestId)
      if (!result) {
        console.warn(
          `[Redecorate RPC ${requestId}] image_not_found method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)} id=${params.id}`,
        )
        return c.json(
          {
            ok: false,
            error: {
              code: 'image_not_found',
              message: `Design ${params.id} was not found.`,
            },
          },
          200,
        )
      }
      console.info(
        `[Redecorate RPC ${requestId}] success method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
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

    if (body.method === 'redecorate.designs.delete') {
      const params = deleteThreadParamsSchema.parse(body.params)
      const result = await deleteThread(workspaceId, params, requestId)
      if (!result) {
        console.warn(
          `[Redecorate RPC ${requestId}] image_not_found method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)} id=${params.id}`,
        )
        return c.json(
          {
            ok: false,
            error: {
              code: 'image_not_found',
              message: `Design ${params.id} was not found.`,
            },
          },
          200,
        )
      }
      console.info(
        `[Redecorate RPC ${requestId}] success method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return c.json({ ok: true, result })
    }

    if (body.method === 'redecorate.designs.deleteIteration') {
      const params = deleteIterationParamsSchema.parse(body.params)
      const result = await deleteIteration(workspaceId, params, requestId)
      if (!result) {
        console.warn(
          `[Redecorate RPC ${requestId}] image_or_iteration_not_found method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)} id=${params.id} iterations=${params.iterationId.length}`,
        )
        return c.json(
          {
            ok: false,
            error: {
              code: 'image_or_iteration_not_found',
              message: `Design ${params.id} or the requested renders were not found.`,
            },
          },
          200,
        )
      }
      console.info(
        `[Redecorate RPC ${requestId}] success method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
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

    if (body.method === 'redecorate.designs.generateFromReference') {
      const params = generateFromReferenceParamsSchema.parse(body.params)
      const thread = await queueReferenceGeneration(
        workspaceId,
        params,
        requestId,
      )
      if (!thread) {
        console.warn(
          `[Redecorate RPC ${requestId}] image_not_found method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)} id=${params.id}`,
        )
        return c.json(
          {
            ok: false,
            error: {
              code: 'image_not_found',
              message: `Design ${params.id} was not found.`,
            },
          },
          200,
        )
      }
      console.info(
        `[Redecorate RPC ${requestId}] success method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return c.json({ ok: true, result: serializeThread(thread, workspaceId) })
    }

    if (body.method === 'redecorate.designs.importGenerated') {
      const params = importGeneratedParamsSchema.parse(body.params)
      const thread = await importGeneratedImage(workspaceId, params, requestId)
      if (!thread) {
        console.warn(
          `[Redecorate RPC ${requestId}] image_not_found method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)} id=${params.id}`,
        )
        return c.json(
          {
            ok: false,
            error: {
              code: 'image_not_found',
              message: `Design ${params.id} was not found.`,
            },
          },
          200,
        )
      }
      console.info(
        `[Redecorate RPC ${requestId}] success method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return c.json({ ok: true, result: serializeThread(thread, workspaceId) })
    }

    if (body.method === 'redecorate.images.import') {
      const params = importImageParamsSchema.parse(body.params)
      const thread = await importLocalImage(workspaceId, params, requestId)
      if (!thread) {
        console.warn(
          `[Redecorate RPC ${requestId}] image_not_found method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)} id=${params.id}`,
        )
        return c.json(
          {
            ok: false,
            error: {
              code: 'image_not_found',
              message: `Design ${params.id} was not found.`,
            },
          },
          200,
        )
      }
      console.info(
        `[Redecorate RPC ${requestId}] success method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return c.json({ ok: true, result: serializeThread(thread, workspaceId) })
    }

    if (body.method === 'redecorate.designs.remix') {
      const params = editParamsSchema.parse(body.params)
      const thread = await queueThreadEdit(workspaceId, params, requestId)
      if (!thread) {
        console.warn(
          `[Redecorate RPC ${requestId}] image_not_found method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)} id=${params.id}`,
        )
        return c.json(
          {
            ok: false,
            error: {
              code: 'image_not_found',
              message: `Design ${params.id} was not found.`,
            },
          },
          200,
        )
      }
      console.info(
        `[Redecorate RPC ${requestId}] success method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return c.json({ ok: true, result: serializeThread(thread, workspaceId) })
    }

    if (body.method === 'redecorate.designs.removeBackground') {
      const params = removeBackgroundParamsSchema.parse(body.params)
      const thread = await removeBackgroundFromThread(
        workspaceId,
        params,
        requestId,
      )
      if (!thread) {
        console.warn(
          `[Redecorate RPC ${requestId}] image_not_found method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)} id=${params.id}`,
        )
        return c.json(
          {
            ok: false,
            error: {
              code: 'image_not_found',
              message: `Design ${params.id} was not found.`,
            },
          },
          200,
        )
      }
      console.info(
        `[Redecorate RPC ${requestId}] success method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return c.json({ ok: true, result: serializeThread(thread, workspaceId) })
    }

    if (body.method === 'redecorate.designs.setAspectRatio') {
      const params = setAspectRatioParamsSchema.parse(body.params)
      const thread = await setThreadAspectRatio(workspaceId, params, requestId)
      if (!thread) {
        console.warn(
          `[Redecorate RPC ${requestId}] image_not_found method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)} id=${params.id}`,
        )
        return c.json(
          {
            ok: false,
            error: {
              code: 'image_not_found',
              message: `Design ${params.id} was not found.`,
            },
          },
          200,
        )
      }
      console.info(
        `[Redecorate RPC ${requestId}] success method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return c.json({ ok: true, result: serializeThread(thread, workspaceId) })
    }

    if (body.method === 'redecorate.folders.list') {
      const [folders, designs] = await Promise.all([
        loadFolders(workspaceId),
        loadThreads(workspaceId),
      ])
      return c.json({
        ok: true,
        result: folders.map((f) => serializeFolder(f, designs, workspaceId)),
      })
    }

    if (body.method === 'redecorate.folders.create') {
      const params = createFolderSchema.parse(body.params)
      const folders = await loadFolders(workspaceId)
      const now = new Date().toISOString()
      const folder: Folder = {
        id: randomUUID(),
        name: params.name,
        emoji: params.emoji ?? '\u{1F4C1}',
        tone: toneFromSeed(params.name),
        space: params.space ?? 'both',
        blurb: params.blurb,
        sortOrder: nextFolderSortOrder(folders),
        createdAt: now,
        updatedAt: now,
      }
      await saveFolders(workspaceId, [...folders, folder])
      const designs = await loadThreads(workspaceId)
      return c.json({
        ok: true,
        result: serializeFolder(folder, designs, workspaceId),
      })
    }

    if (
      body.method === 'redecorate.folders.rename' ||
      body.method === 'redecorate.folders.update'
    ) {
      const params = updateFolderSchema.parse(body.params)
      const folders = await loadFolders(workspaceId)
      const idx = folders.findIndex((f) => f.id === params.id)
      if (idx === -1) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'folder_not_found',
              message: `Folder ${params.id} was not found.`,
            },
          },
          200,
        )
      }
      folders[idx] = {
        ...folders[idx],
        ...(params.name ? { name: params.name } : {}),
        ...(params.emoji ? { emoji: params.emoji } : {}),
        ...(params.blurb !== undefined ? { blurb: params.blurb } : {}),
        updatedAt: new Date().toISOString(),
      }
      await saveFolders(workspaceId, folders)
      const designs = await loadThreads(workspaceId)
      return c.json({
        ok: true,
        result: serializeFolder(folders[idx], designs, workspaceId),
      })
    }

    if (
      body.method === 'redecorate.folders.archive' ||
      body.method === 'redecorate.folders.delete'
    ) {
      const params = getParamsSchema.parse(body.params)
      const folders = await loadFolders(workspaceId)
      const next = folders.filter((f) => f.id !== params.id)
      if (next.length === folders.length) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'folder_not_found',
              message: `Folder ${params.id} was not found.`,
            },
          },
          200,
        )
      }
      await saveFolders(workspaceId, next)
      const threads = await loadThreads(workspaceId)
      let changed = false
      for (const t of threads) {
        if (t.folderId === params.id) {
          t.folderId = null
          changed = true
        }
      }
      if (changed) await saveThreads(workspaceId, threads)
      return c.json({ ok: true, result: { deleted: true, id: params.id } })
    }

    if (body.method === 'redecorate.designs.move') {
      const params = moveDesignSchema.parse(body.params)
      if (params.folderId)
        await assertFolderExists(workspaceId, params.folderId)
      const thread = await patchThread(workspaceId, params.id, {
        folderId: params.folderId,
      })
      if (!thread) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'image_not_found',
              message: `Design ${params.id} was not found.`,
            },
          },
          200,
        )
      }
      return c.json({ ok: true, result: serializeThread(thread, workspaceId) })
    }

    if (body.method === 'redecorate.designs.favorite') {
      const params = favoriteDesignSchema.parse(body.params)
      const current = (await loadThreads(workspaceId)).find(
        (t) => t.id === params.id,
      )
      const nextFavorite = params.favorite ?? !current?.favorite
      const thread = await patchThread(workspaceId, params.id, {
        favorite: nextFavorite,
      })
      if (!thread) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'image_not_found',
              message: `Design ${params.id} was not found.`,
            },
          },
          200,
        )
      }
      return c.json({ ok: true, result: serializeThread(thread, workspaceId) })
    }

    if (body.method === 'redecorate.designs.archive') {
      const params = archiveDesignSchema.parse(body.params)
      const current = (await loadThreads(workspaceId)).find(
        (t) => t.id === params.id,
      )
      const nextArchived = params.archived ?? !current?.archived
      const thread = await patchThread(workspaceId, params.id, {
        archived: nextArchived,
      })
      if (!thread) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'image_not_found',
              message: `Design ${params.id} was not found.`,
            },
          },
          200,
        )
      }
      return c.json({ ok: true, result: serializeThread(thread, workspaceId) })
    }

    if (body.method === 'redecorate.presets.list') {
      return c.json({ ok: true, result: await catalogFor(workspaceId) })
    }

    if (body.method === 'redecorate.styles.list') {
      const styles = await loadCustomStyles(workspaceId)
      return c.json({
        ok: true,
        result: styles.map((style) => serializeCustomStyle(style, workspaceId)),
      })
    }

    if (body.method === 'redecorate.styles.create') {
      const params = createStyleSchema.parse(body.params)
      const styles = await loadCustomStyles(workspaceId)
      const id = params.id?.trim() || randomUUID()
      const asset = params.id ? await findStyleAsset(workspaceId, id) : null
      const createApplies = params.applies ?? 'both'
      const createSubtypes = (params.subtypes ?? []).filter((k) =>
        SUBTYPE_KEY_SET.has(k),
      )
      const style: CustomStyle = {
        id,
        name: params.name,
        blurb: params.blurb ?? '',
        prompt: params.prompt,
        applies: createApplies,
        accent: normalizeAccent(params.accent),
        tags: params.tags ?? [],
        subtypes: createSubtypes.length
          ? createSubtypes
          : subtypesForApplies(createApplies),
        thumbnailExt: asset?.ext,
        createdAt: new Date().toISOString(),
      }
      await saveCustomStyles(workspaceId, [
        ...styles.filter((s) => s.id !== id),
        style,
      ])
      return c.json({
        ok: true,
        result: serializeCustomStyle(style, workspaceId),
      })
    }

    if (body.method === 'redecorate.styles.delete') {
      const params = getParamsSchema.parse(body.params)
      const styles = await loadCustomStyles(workspaceId)
      const next = styles.filter((s) => s.id !== params.id)
      await saveCustomStyles(workspaceId, next)
      const asset = await findStyleAsset(workspaceId, params.id)
      if (asset) await rm(asset.path, { force: true })
      return c.json({ ok: true, result: { deleted: true, id: params.id } })
    }

    console.warn(
      `[Redecorate RPC ${requestId}] method_not_found method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
    )
    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Redecorate does not expose ${body.method}.`,
        },
      },
      200,
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn(
        `[Redecorate RPC ${requestId}] invalid_params method=${method} workspace=${workspaceLabel(workspaceId)} durationMs=${elapsedMs(startedAt)}`,
      )
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_params',
            message: 'Redecorate received invalid RPC parameters.',
            detail: error.flatten(),
          },
        },
        200,
      )
    }

    const rpcError = rpcErrorFromUnknown(error)
    console.error(
      `[Redecorate RPC ${requestId}] failed method=${method} workspace=${workspaceLabel(workspaceId)} code=${rpcError.code} durationMs=${elapsedMs(startedAt)} message=${errorMessage(error, rpcError.message)}`,
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
