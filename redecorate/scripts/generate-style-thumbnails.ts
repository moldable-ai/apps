#!/usr/bin/env -S pnpm exec tsx
import { STYLE_PRESETS, type StylePreset } from '../src/shared/catalog'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const CODEX_IMAGE_SOURCE = 'moldable-openai-codex-oauth:gpt-image-2'
const THUMB_EXTENSIONS = ['webp', 'jpg', 'jpeg', 'png', 'avif'] as const
const MAX_IMAGES_PER_RUN = 200
const DEFAULT_LIMIT = MAX_IMAGES_PER_RUN
const DEFAULT_DELAY_MS = 30_000
const DEFAULT_CONCURRENCY = 3
const MAX_CONCURRENCY = 8
const DEFAULT_MAX_RETRIES = 4
const DEFAULT_RETRY_DELAY_MS = 60_000
const DEFAULT_BUDGET = 200
const DEFAULT_AIVAULT_TIMEOUT_MS = 420_000
const CODEX_RESPONSES_MODEL = 'gpt-5.5'
const CODEX_IMAGE_INSTRUCTIONS = 'You are an image generation assistant.'
const AIVAULT_BIN = process.env.AIVAULT_BIN?.trim() || 'aivault'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(scriptDir, '..')
const defaultOutDir = join(appRoot, 'public', 'styles')

type ThumbExtension = (typeof THUMB_EXTENSIONS)[number]

type Options = {
  limit: number
  delayMs: number
  concurrency: number
  maxRetries: number
  retryDelayMs: number
  aivaultTimeoutMs: number
  budget: number
  model: string
  size: string
  quality: string
  outputFormat: ThumbExtension
  outputCompression: number
  outDir: string
  overwrite: boolean
  dryRun: boolean
  onlyIds: Set<string> | null
  categories: Set<string> | null
  startAfter: string | null
}

type ManifestItem = {
  id: string
  name: string
  category: string
  file: string
  prompt: string
  model: string
  size: string
  quality: string
  outputFormat: string
  outputCompression: number
  generatedAt: string
}

type Manifest = {
  version: 1
  updatedAt: string
  source: string
  items: Record<string, ManifestItem>
}

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string
    revised_prompt?: string
  }>
  error?: {
    message?: string
    code?: string
  }
}

type CodexImageEvent = {
  type?: string
  item?: {
    type?: string
    result?: string
    revised_prompt?: string
  }
  response?: {
    output?: Array<{
      type?: string
      result?: string
      revised_prompt?: string
    }>
  }
  error?: {
    code?: string
    message?: string
  }
  message?: string
}

class ImageGenerationError extends Error {
  status: number

  constructor(message: string, status = 0) {
    super(message)
    this.name = 'ImageGenerationError'
    this.status = status
  }
}

function usage(exitCode = 2): never {
  console.error(`Usage:
  pnpm generate-style-thumbnails [options]

Options:
  --limit <n>                 Number of thumbnails to generate this run. Default: ${DEFAULT_LIMIT}
  --delay-ms <n>              Minimum delay between request starts. Default: ${DEFAULT_DELAY_MS}
  --concurrency <n>           Maximum in-flight image requests. Default: ${DEFAULT_CONCURRENCY}
  --max-retries <n>           Retries per preset for 429/5xx failures. Default: ${DEFAULT_MAX_RETRIES}
  --retry-delay-ms <n>        Base retry delay for 429/5xx failures. Default: ${DEFAULT_RETRY_DELAY_MS}
  --aivault-timeout-ms <n>    Upstream aivault request timeout per image. Default: ${DEFAULT_AIVAULT_TIMEOUT_MS}
  --budget <n>                Maximum style thumbnails to create in total. Default: ${DEFAULT_BUDGET}
  --model <id>                OpenAI image model. Default: gpt-image-2
  --size <WxH|auto>           Image size. Default: 1024x768
  --quality <value>           Image quality. Default: medium
  --output-format <ext>       One of: webp, png, jpeg. Default: webp
  --output-compression <n>    Output compression, 0-100. Default: 72
  --out-dir <path>            Output directory. Default: public/styles
  --only <ids>                Comma-separated preset ids to generate
  --category <keys>           Comma-separated preset category keys to generate
  --start-after <id>          Skip presets through this id
  --overwrite                 Replace existing matching thumbnail files
  --dry-run                   Print planned presets without generating images
`)
  process.exit(exitCode)
}

function parseNumber(value: string | undefined, name: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new Error(`${name} must be a number`)
  return parsed
}

function parseSet(value: string | undefined): Set<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  )
}

function parseOptions(): Options {
  const argv = process.argv.slice(2)
  if (argv.includes('-h') || argv.includes('--help')) usage(0)

  const options: Options = {
    limit: DEFAULT_LIMIT,
    delayMs: DEFAULT_DELAY_MS,
    concurrency: DEFAULT_CONCURRENCY,
    maxRetries: DEFAULT_MAX_RETRIES,
    retryDelayMs: DEFAULT_RETRY_DELAY_MS,
    aivaultTimeoutMs: DEFAULT_AIVAULT_TIMEOUT_MS,
    budget: DEFAULT_BUDGET,
    model: 'gpt-image-2',
    size: '1024x768',
    quality: 'medium',
    outputFormat: 'webp',
    outputCompression: 72,
    outDir: defaultOutDir,
    overwrite: false,
    dryRun: false,
    onlyIds: null,
    categories: null,
    startAfter: null,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    const next = argv[i + 1]
    switch (arg) {
      case '--limit':
        options.limit = parseNumber(next, '--limit')
        i += 1
        break
      case '--delay-ms':
        options.delayMs = parseNumber(next, '--delay-ms')
        i += 1
        break
      case '--concurrency':
        options.concurrency = parseNumber(next, '--concurrency')
        i += 1
        break
      case '--max-retries':
        options.maxRetries = parseNumber(next, '--max-retries')
        i += 1
        break
      case '--retry-delay-ms':
        options.retryDelayMs = parseNumber(next, '--retry-delay-ms')
        i += 1
        break
      case '--aivault-timeout-ms':
        options.aivaultTimeoutMs = parseNumber(next, '--aivault-timeout-ms')
        i += 1
        break
      case '--budget':
        options.budget = parseNumber(next, '--budget')
        i += 1
        break
      case '--model':
        options.model = next ?? ''
        i += 1
        break
      case '--size':
        options.size = next ?? ''
        i += 1
        break
      case '--quality':
        options.quality = next ?? ''
        i += 1
        break
      case '--output-format':
        if (!isThumbExtension(next)) {
          throw new Error(
            '--output-format must be webp, png, jpeg, jpg, or avif',
          )
        }
        options.outputFormat = next === 'jpg' ? 'jpeg' : next
        i += 1
        break
      case '--output-compression':
        options.outputCompression = parseNumber(next, '--output-compression')
        i += 1
        break
      case '--out-dir':
        options.outDir = resolve(next ?? '')
        i += 1
        break
      case '--only':
        options.onlyIds = parseSet(next)
        i += 1
        break
      case '--category':
        options.categories = parseSet(next)
        i += 1
        break
      case '--start-after':
        options.startAfter = next ?? null
        i += 1
        break
      case '--overwrite':
        options.overwrite = true
        break
      case '--dry-run':
        options.dryRun = true
        break
      default:
        throw new Error(`Unknown arg: ${arg}`)
    }
  }

  if (!options.model) throw new Error('--model is required')
  if (!options.size) throw new Error('--size is required')
  if (!options.quality) throw new Error('--quality is required')
  if (!Number.isInteger(options.limit) || options.limit <= 0) {
    throw new Error('--limit must be a positive integer')
  }
  if (options.limit > MAX_IMAGES_PER_RUN) {
    throw new Error(`--limit cannot exceed ${MAX_IMAGES_PER_RUN}`)
  }
  if (!Number.isInteger(options.delayMs) || options.delayMs < 0) {
    throw new Error('--delay-ms must be a non-negative integer')
  }
  if (
    !Number.isInteger(options.concurrency) ||
    options.concurrency <= 0 ||
    options.concurrency > MAX_CONCURRENCY
  ) {
    throw new Error(
      `--concurrency must be an integer between 1 and ${MAX_CONCURRENCY}`,
    )
  }
  if (!Number.isInteger(options.budget) || options.budget <= 0) {
    throw new Error('--budget must be a positive integer')
  }
  if (
    !Number.isInteger(options.aivaultTimeoutMs) ||
    options.aivaultTimeoutMs <= 0
  ) {
    throw new Error('--aivault-timeout-ms must be a positive integer')
  }
  if (options.budget > DEFAULT_BUDGET) {
    throw new Error(`--budget cannot exceed ${DEFAULT_BUDGET}`)
  }
  if (options.outputCompression < 0 || options.outputCompression > 100) {
    throw new Error('--output-compression must be between 0 and 100')
  }

  return options
}

function isThumbExtension(value: string | undefined): value is ThumbExtension {
  return THUMB_EXTENSIONS.includes(value as ThumbExtension)
}

function existingThumbnail(id: string, outDir: string): string | null {
  for (const ext of THUMB_EXTENSIONS) {
    const filename = `${id}.${ext}`
    if (existsSync(join(outDir, filename))) return filename
  }
  return null
}

function sceneForPreset(preset: StylePreset): string {
  if (preset.category === 'exterior-styles') {
    return 'a front exterior three-quarter curb-appeal view of a detached home'
  }
  if (preset.category === 'backyard-landscape') {
    return 'a private backyard patio and garden viewed from standing height'
  }
  if (preset.subtypes.includes('floorplan')) {
    return 'a clean architectural floorplan or plan-style home design presentation'
  }
  if (preset.subtypes.includes('kitchen')) {
    return 'a bright residential kitchen with cabinetry, counters, fixtures, and natural daylight'
  }
  if (preset.subtypes.includes('bathroom')) {
    return 'a finished residential bathroom with vanity, tile, mirror, fixtures, and soft daylight'
  }
  if (preset.subtypes.includes('bedroom')) {
    return 'a calm residential bedroom with bed, textiles, lighting, art, and window light'
  }
  if (preset.subtypes.includes('home-office')) {
    return 'a residential home office with desk, shelving, task lighting, seating, and daylight'
  }
  if (preset.subtypes.includes('dining-room')) {
    return 'a residential dining room with table setting, lighting, wall treatment, and daylight'
  }
  if (preset.subtypes.includes('entryway')) {
    return 'a residential entryway or foyer with door, storage, lighting, flooring, and decor'
  }
  if (preset.applies === 'exterior') {
    return 'a residential outdoor home space with architecture, hardscape, planting, and daylight'
  }
  return 'a photorealistic residential living room with sofa, seating, windows, rug, lighting, and decor'
}

function promptForPreset(preset: StylePreset): string {
  return [
    'Create one original photorealistic style-library sample image for Redecorate, a home redesign app.',
    `Preset: ${preset.name}.`,
    `Scene: ${sceneForPreset(preset)}.`,
    'Use the preset prompt below as the authoritative aesthetic direction. The image must visibly demonstrate this specific style as a finished design render, not a before-and-after transformation.',
    'Do not include text, labels, watermarks, UI chrome, people, split-screen panels, or visible brand marks. Keep the composition readable as a thumbnail in a style picker.',
    'Preset prompt:',
    preset.prompt,
  ].join('\n\n')
}

function generationDir(outDir: string): string {
  return join(outDir, '.generation')
}

function manifestPath(outDir: string): string {
  return join(generationDir(outDir), 'manifest.json')
}

function logPath(outDir: string): string {
  return join(generationDir(outDir), 'runs.jsonl')
}

function readManifest(outDir: string): Manifest {
  const path = manifestPath(outDir)
  if (!existsSync(path)) {
    return {
      version: 1,
      updatedAt: new Date(0).toISOString(),
      source: CODEX_IMAGE_SOURCE,
      items: {},
    }
  }
  return JSON.parse(readFileSync(path, 'utf8')) as Manifest
}

function writeManifest(outDir: string, manifest: Manifest): void {
  mkdirSync(generationDir(outDir), { recursive: true })
  writeFileSync(manifestPath(outDir), JSON.stringify(manifest, null, 2), 'utf8')
}

function appendLog(outDir: string, event: Record<string, unknown>): void {
  mkdirSync(generationDir(outDir), { recursive: true })
  appendFileSync(logPath(outDir), `${JSON.stringify(event)}\n`, 'utf8')
}

function imageBudgetUsed(outDir: string): number {
  return STYLE_PRESETS.filter((preset) => existingThumbnail(preset.id, outDir))
    .length
}

function presetsToGenerate(options: Options): StylePreset[] {
  let presets = STYLE_PRESETS

  if (options.onlyIds) {
    presets = presets.filter((preset) => options.onlyIds?.has(preset.id))
  }
  if (options.categories) {
    presets = presets.filter((preset) =>
      options.categories?.has(preset.category),
    )
  }
  if (options.startAfter) {
    const index = presets.findIndex(
      (preset) => preset.id === options.startAfter,
    )
    if (index >= 0) presets = presets.slice(index + 1)
  }
  if (!options.overwrite) {
    presets = presets.filter(
      (preset) => !existingThumbnail(preset.id, options.outDir),
    )
  }

  const remainingBudget = options.budget - imageBudgetUsed(options.outDir)
  const allowed = options.overwrite
    ? Math.min(options.limit, MAX_IMAGES_PER_RUN)
    : Math.min(options.limit, MAX_IMAGES_PER_RUN, Math.max(remainingBudget, 0))

  return presets.slice(0, allowed)
}

function createCodexImageTool(options: Options): Record<string, unknown> {
  const tool: Record<string, unknown> = {
    type: 'image_generation',
    model: options.model,
    size: options.size,
    quality: options.quality,
    output_format: options.outputFormat,
    background: 'auto',
  }
  if (options.outputFormat === 'webp' || options.outputFormat === 'jpeg') {
    tool.output_compression = Math.trunc(options.outputCompression)
  }
  return tool
}

function createCodexImageBody(
  options: Options,
  preset: StylePreset,
): Record<string, unknown> {
  return {
    model: CODEX_RESPONSES_MODEL,
    input: [
      {
        role: 'user',
        content: [{ type: 'input_text', text: promptForPreset(preset) }],
      },
    ],
    instructions: CODEX_IMAGE_INSTRUCTIONS,
    tools: [createCodexImageTool(options)],
    tool_choice: { type: 'image_generation' },
    stream: true,
    store: false,
  }
}

function parseJsonOrError(text: string): unknown {
  if (!text.trim()) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return { error: { message: text } }
  }
}

function parseCodexImageEvents(text: string): CodexImageEvent[] {
  const events: CodexImageEvent[] = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('data: ')) continue
    const data = line.slice(6).trim()
    if (!data || data === '[DONE]') continue
    try {
      events.push(JSON.parse(data) as CodexImageEvent)
    } catch {
      continue
    }
  }
  return events
}

function imageFromCodexEvent(entry: {
  result?: string
  revised_prompt?: string
}): NonNullable<OpenAIImageResponse['data']>[number] | null {
  if (typeof entry.result !== 'string' || !entry.result) return null
  return {
    b64_json: entry.result,
    ...(entry.revised_prompt ? { revised_prompt: entry.revised_prompt } : {}),
  }
}

function extractCodexImages(text: string): OpenAIImageResponse {
  const events = parseCodexImageEvents(text)
  if (events.length === 0 && text.trim()) {
    const parsed = parseJsonOrError(text) as OpenAIImageResponse | null
    if (parsed?.data || parsed?.error) return parsed
  }

  const failure = events.find(
    (event) => event.type === 'response.failed' || event.type === 'error',
  )
  if (failure) {
    return {
      error: {
        message:
          failure.error?.message ||
          failure.message ||
          failure.error?.code ||
          'Codex image generation failed',
        code: failure.error?.code,
      },
    }
  }

  const outputItemImages = events
    .filter(
      (event) =>
        event.type === 'response.output_item.done' &&
        event.item?.type === 'image_generation_call',
    )
    .map((event) => imageFromCodexEvent(event.item ?? {}))
    .filter(
      (image): image is NonNullable<OpenAIImageResponse['data']>[number] =>
        Boolean(image),
    )

  const completedImages = events
    .flatMap((event) => event.response?.output ?? [])
    .filter((entry) => entry.type === 'image_generation_call')
    .map((entry) => imageFromCodexEvent(entry))
    .filter(
      (image): image is NonNullable<OpenAIImageResponse['data']>[number] =>
        Boolean(image),
    )

  return {
    data: outputItemImages.length > 0 ? outputItemImages : completedImages,
  }
}

function statusFromAivaultError(stderr: string): number {
  const match = stderr.match(/\b(429|5\d\d|401|403)\b/)
  return match ? Number(match[1]) : 0
}

async function runAivaultWithBodyFile(
  args: string[],
  body: string,
): Promise<string> {
  const tempDir = mkdtempSync(join(tmpdir(), 'redecorate-aivault-'))
  const bodyPath = join(tempDir, 'body.json')
  try {
    writeFileSync(bodyPath, body, { mode: 0o600 })
    return await new Promise((resolvePromise, reject) => {
      const child = spawn(
        AIVAULT_BIN,
        [...args, '--body-file-path', bodyPath],
        {
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      )
      const stdoutChunks: Buffer[] = []
      const stderrChunks: Buffer[] = []
      const maxBuffer = 80 * 1024 * 1024
      let stdoutBytes = 0
      let stderrBytes = 0
      let childError: Error | null = null
      let killedForBuffer = false

      child.stdout.on('data', (chunk: Buffer) => {
        stdoutBytes += chunk.length
        if (stdoutBytes > maxBuffer) {
          killedForBuffer = true
          child.kill('SIGTERM')
          return
        }
        stdoutChunks.push(chunk)
      })

      child.stderr.on('data', (chunk: Buffer) => {
        stderrBytes += chunk.length
        if (stderrBytes > maxBuffer) {
          killedForBuffer = true
          child.kill('SIGTERM')
          return
        }
        stderrChunks.push(chunk)
      })

      child.on('error', (error) => {
        childError = error
      })

      child.on('close', (code, signal) => {
        const stdout = Buffer.concat(stdoutChunks).toString('utf8')
        const stderr = Buffer.concat(stderrChunks).toString('utf8')
        const stderrText = stderr.trim()
        const stdoutText = stdout.trim()

        if (childError) {
          reject(childError)
          return
        }
        if (killedForBuffer) {
          reject(
            new ImageGenerationError(
              `aivault ${args.slice(0, 2).join(' ')} exceeded ${maxBuffer} bytes of buffered output`,
            ),
          )
          return
        }
        if (code !== 0) {
          const exitDetail =
            code === null ? `signal ${signal ?? 'unknown'}` : `code ${code}`
          const output = [stderrText, stdoutText].filter(Boolean).join('\n')
          reject(
            new ImageGenerationError(
              output
                ? `aivault ${args.slice(0, 2).join(' ')} exited with ${exitDetail}\n${output}`
                : `aivault ${args.slice(0, 2).join(' ')} exited with ${exitDetail}`,
              statusFromAivaultError(stderrText),
            ),
          )
          return
        }

        resolvePromise(stdout)
      })
    })
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

async function generateImageResponse(
  options: Options,
  preset: StylePreset,
): Promise<{ status: number; json: OpenAIImageResponse }> {
  const text = await runAivaultWithBodyFile(
    [
      'invoke',
      'openai/codex-responses',
      '--stream',
      '--timeout-ms',
      String(options.aivaultTimeoutMs),
      '--method',
      'POST',
      '--path',
      '/responses',
      '--header',
      'content-type=application/json',
      '--header',
      'accept=text/event-stream',
    ],
    JSON.stringify(createCodexImageBody(options, preset)),
  )
  if (text.includes('<title>Just a moment...</title>')) {
    throw new ImageGenerationError(
      'Codex image endpoint returned a Cloudflare challenge page.',
    )
  }
  const parsed = extractCodexImages(text)
  if (parsed.error?.message) {
    throw new ImageGenerationError(parsed.error.message)
  }
  return {
    status: 200,
    json: parsed,
  }
}

function writeImage(
  image: NonNullable<OpenAIImageResponse['data']>[number],
  outPath: string,
): void {
  if (!image.b64_json) {
    throw new ImageGenerationError(
      'Codex image response did not include image data',
    )
  }
  writeFileSync(outPath, Buffer.from(image.b64_json, 'base64'))
}

function shouldRetry(error: unknown): boolean {
  if (!(error instanceof ImageGenerationError)) return false
  return error.status === 429 || error.status >= 500
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms)
  })
}

async function generateOne(
  options: Options,
  preset: StylePreset,
  manifest: Manifest,
): Promise<void> {
  const filename = `${preset.id}.${options.outputFormat}`
  const outPath = join(options.outDir, filename)

  for (let attempt = 1; attempt <= options.maxRetries + 1; attempt += 1) {
    const startedAt = new Date().toISOString()
    try {
      const { json } = await generateImageResponse(options, preset)
      const image = json.data?.[0]
      if (!image) {
        throw new ImageGenerationError(
          `Codex image response had no images: ${JSON.stringify(json).slice(0, 1000)}`,
        )
      }

      writeImage(image, outPath)

      manifest.items[preset.id] = {
        id: preset.id,
        name: preset.name,
        category: preset.category,
        file: filename,
        prompt: promptForPreset(preset),
        model: options.model,
        size: options.size,
        quality: options.quality,
        outputFormat: options.outputFormat,
        outputCompression: options.outputCompression,
        generatedAt: new Date().toISOString(),
      }
      manifest.updatedAt = new Date().toISOString()
      writeManifest(options.outDir, manifest)
      appendLog(options.outDir, {
        type: 'success',
        id: preset.id,
        attempt,
        startedAt,
        finishedAt: new Date().toISOString(),
        file: filename,
      })
      return
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      appendLog(options.outDir, {
        type: 'error',
        id: preset.id,
        attempt,
        startedAt,
        finishedAt: new Date().toISOString(),
        message,
      })
      if (attempt > options.maxRetries || !shouldRetry(error)) {
        throw error
      }
      const retryDelay = options.retryDelayMs * 2 ** (attempt - 1)
      console.warn(`Retrying ${preset.id} after ${retryDelay}ms (${message})`)
      await sleep(retryDelay)
    }
  }
}

async function generatePlanned(
  options: Options,
  planned: StylePreset[],
  manifest: Manifest,
): Promise<void> {
  const active = new Set<Promise<void>>()
  let nextIndex = 0
  let lastStartAt = 0
  let firstError: unknown = null

  const startOne = (index: number): void => {
    const preset = planned[index]
    lastStartAt = Date.now()
    console.log(
      `[${index + 1}/${planned.length}] Starting ${preset.id} (${preset.name}) ` +
        `[active ${active.size + 1}/${options.concurrency}]`,
    )

    const task = generateOne(options, preset, manifest)
      .catch((error: unknown) => {
        firstError ??= error
      })
      .finally(() => {
        active.delete(task)
      })
    active.add(task)
  }

  while (nextIndex < planned.length && !firstError) {
    while (active.size >= options.concurrency) {
      await Promise.race(active)
      if (firstError) break
    }
    if (firstError) break

    const elapsedSinceStart = Date.now() - lastStartAt
    const waitMs =
      lastStartAt === 0 ? 0 : Math.max(0, options.delayMs - elapsedSinceStart)
    if (waitMs > 0) {
      await sleep(waitMs)
    }
    if (firstError) break

    startOne(nextIndex)
    nextIndex += 1
  }

  await Promise.allSettled(active)
  if (firstError) throw firstError
}

async function main(): Promise<void> {
  const options = parseOptions()
  mkdirSync(options.outDir, { recursive: true })
  mkdirSync(generationDir(options.outDir), { recursive: true })

  const existingCount = imageBudgetUsed(options.outDir)
  const planned = presetsToGenerate(options)

  console.log(
    `Style presets: ${STYLE_PRESETS.length}. Existing thumbnails: ${existingCount}. Planned this run: ${planned.length}.`,
  )

  if (planned.length === 0) {
    console.log('No thumbnails to generate.')
    return
  }

  for (const preset of planned) {
    console.log(`${preset.id}\t${preset.name}\t${preset.category}`)
  }

  if (options.dryRun) return

  const manifest = readManifest(options.outDir)
  const startedAt = new Date().toISOString()
  appendLog(options.outDir, {
    type: 'run-start',
    runId: randomUUID(),
    startedAt,
    count: planned.length,
    model: options.model,
    size: options.size,
    quality: options.quality,
    outputFormat: options.outputFormat,
    concurrency: options.concurrency,
    requestStartDelayMs: options.delayMs,
  })

  await generatePlanned(options, planned, manifest)

  appendLog(options.outDir, {
    type: 'run-finish',
    startedAt,
    finishedAt: new Date().toISOString(),
    count: planned.length,
  })
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
