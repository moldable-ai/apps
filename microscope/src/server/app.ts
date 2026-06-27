import {
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { CATEGORIES, SPECIMENS } from '../shared/library'
import type {
  GenerateExplorationInput,
  GeneratedExploration,
  ImageQuality,
  LibraryResponse,
  MicroscopeSettings,
  ModelProvider,
  ModelRecipe,
  ModelVariant,
  Specimen,
  VisualStyle,
} from '../shared/types'
import {
  type AivaultRequest,
  invokeAivaultJson,
  invokeAivaultStream,
} from './aivault'
import { getModelRenderProvider } from './model-providers'
import { generateJson, imageRequest } from './moldable'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { randomUUID } from 'node:crypto'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { z } from 'zod'

const MODEL = 'gpt-image-2'
const STORE_FILE = 'microscope-explorations.json'
const SETTINGS_FILE = 'microscope-settings.json'
const IMAGE_GENERATION_TIMEOUT_MS = 600_000
const REMOVE_BG_TIMEOUT_MS = 180_000
const REMOVE_BG_CAPABILITY_ID = 'remove-bg/background-removal'
const DEFAULT_QUALITY: ImageQuality = 'medium'
const DEFAULT_SETTINGS: MicroscopeSettings = {
  modelProvider: 'fal',
  quality: DEFAULT_QUALITY,
  autoRotate: true,
}
const activeModelRenderTokens = new Map<string, string>()
const generatedWriteQueues = new Map<string, Promise<void>>()
const deletedExplorationKeys = new Set<string>()
const WORKSPACE_ID_PATTERN = /^[A-Za-z0-9_-]+$/

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

type ExplorationMetadata = {
  title: string
  subtitle: string
  description: string
  categoryId: string
  observations: string[]
  details: Array<{ label: string; value: string }>
  prompts: string[]
  imagePrompt: string
  visualStyle: VisualStyle
}

const EDUCATIONAL_BY_DEFAULT_CATEGORIES = new Set([
  'cells-microbes',
  'human-body',
  'chemistry-matter',
  'water-worlds',
])

function defaultVisualStyleFor(categoryId: string | undefined): VisualStyle {
  if (!categoryId) return 'realistic'
  return EDUCATIONAL_BY_DEFAULT_CATEGORIES.has(categoryId)
    ? 'educational'
    : 'realistic'
}

const EDUCATIONAL_IMAGE_FRAME = [
  'Create one isolated, high-end educational science render for a magic microscope app.',
  'Style: stylized 3D digital illustration in the spirit of a premium biology textbook or museum learning asset — clean, slightly exaggerated, distinctively colored, painterly-but-precise. NOT photorealistic, NOT a real photograph, NOT a medical scan.',
  'Apply rich saturated educational colors that visually separate organelles, structures, and regions from each other. Each major sub-structure should be clearly identifiable by colour and form. Soft global illumination, gentle highlights, no harsh shadows.',
  'Show one primary subject as a clean cutaway, cross-section, or expanded structural diagram so internal anatomy is visible. Smooth surfaces with subtle texture, expressive contours, exaggerated but accurate proportions.',
  'Plain white or very light neutral background. No environment, no labels, no arrows, no text, no callouts, no hands, no tools, no rulers, no duplicate specimens, no decorative props.',
  'The output must be one complete subject with a clear silhouette, suitable for remove.bg and image-to-3D conversion.',
].join('\n')

const REALISTIC_IMAGE_FRAME = [
  'Create one isolated, high-quality realistic specimen render for a magic microscope app.',
  'Style: photorealistic, naturalistic, scientifically faithful. True-to-life colours, textures, proportions, and surface detail. Like a museum specimen, wildlife reference photograph, or anatomical study.',
  'Soft natural studio lighting from a single key direction with a gentle fill. No stylization, no exaggeration, no painterly effects.',
  'Show exactly one primary subject. If the request asks for a comparison, process, ecosystem, scene, lifecycle, or many objects, choose one representative physical specimen that is well known and likely to have strong model training data.',
  'Centered 3/4 view or clean anatomical cutaway with complete silhouette, clear margins, rich surface texture, strong contour separation, and biologically realistic structure.',
  'Plain white or very light neutral background. No environment, no labels, no arrows, no text, no callouts, no hands, no tools, no duplicate specimens, no decorative props.',
  'The output must be suitable for remove.bg and image-to-3D conversion.',
].join('\n')

function imageFrameFor(visualStyle: VisualStyle): string {
  return visualStyle === 'educational'
    ? EDUCATIONAL_IMAGE_FRAME
    : REALISTIC_IMAGE_FRAME
}

const modelProviderSchema = z.enum(['fal', 'tripo'])

const settingsSchema = z
  .object({
    modelProvider: modelProviderSchema.default(DEFAULT_SETTINGS.modelProvider),
    quality: z.enum(['medium', 'high']).default(DEFAULT_SETTINGS.quality),
    autoRotate: z.boolean().default(DEFAULT_SETTINGS.autoRotate),
  })
  .strict()

const generateSchema = z.object({
  prompt: z.string().trim().min(3),
  categoryId: z.string().trim().optional(),
  quality: z.enum(['low', 'medium', 'high', 'auto']).optional(),
  modelProvider: modelProviderSchema.optional(),
})

const regenerateSchema = z.object({
  id: z.string().trim().min(1),
  quality: z.enum(['low', 'medium', 'high', 'auto']).optional(),
  modelProvider: modelProviderSchema.optional(),
})

const regenerateModelSchema = z.object({
  id: z.string().trim().min(1),
  quality: z.enum(['low', 'medium', 'high', 'auto']).optional(),
  modelProvider: modelProviderSchema.optional(),
})

const modelProviderPreferenceSchema = z.object({
  modelProvider: modelProviderSchema,
})

const cancelSchema = z.object({
  id: z.string().trim().min(1),
})

const moveSchema = z.object({
  id: z.string().trim().min(1),
  categoryId: z.string().trim().min(1),
})

const materializeSchema = z.object({
  id: z.string().trim().min(1),
  quality: z.enum(['low', 'medium', 'high', 'auto']).optional(),
  modelProvider: modelProviderSchema.optional(),
})

const explorationMetadataSchema = z
  .object({
    title: z.string().trim().min(1),
    subtitle: z.string().trim().min(1),
    description: z.string().trim().min(1),
    categoryId: z.string().trim().min(1),
    observations: z.array(z.string().trim().min(1)).min(2).max(5),
    details: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(28),
          value: z.string().trim().min(1).max(90),
        }),
      )
      .min(2)
      .max(6),
    prompts: z.array(z.string().trim().min(1)).min(3).max(6),
    imagePrompt: z.string().trim().min(12),
    visualStyle: z.enum(['educational', 'realistic']),
  })
  .strict()

const rpcRequestSchema = z.object({
  method: z.string(),
  params: z.unknown().optional(),
})

const app = new Hono()

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

export { app }

function getWorkspaceId(
  request: Request,
  options: { allowQuery?: boolean } = {},
): string | undefined {
  const cleanWorkspaceId = (value: string | null | undefined) => {
    const id = value?.trim()
    return id && WORKSPACE_ID_PATTERN.test(id) ? id : undefined
  }
  const fromQuery = new URL(request.url).searchParams.get('workspace')
  return (
    cleanWorkspaceId(request.headers.get('x-moldable-workspace-id')) ??
    cleanWorkspaceId(getWorkspaceFromRequest(request)) ??
    (options.allowQuery ? cleanWorkspaceId(fromQuery) : undefined)
  )
}

function workspaceLabel(workspaceId?: string): string {
  return workspaceId?.trim() || 'default'
}

function modelRenderKey(
  workspaceId: string | undefined,
  explorationId: string,
): string {
  return `${workspaceLabel(workspaceId)}:${explorationId}`
}

function explorationLifecycleKey(
  workspaceId: string | undefined,
  explorationId: string,
): string {
  return modelRenderKey(workspaceId, explorationId)
}

function isExplorationDeleted(
  workspaceId: string | undefined,
  explorationId: string,
): boolean {
  return deletedExplorationKeys.has(
    explorationLifecycleKey(workspaceId, explorationId),
  )
}

async function withGeneratedWriteLock<T>(
  workspaceId: string | undefined,
  action: () => Promise<T>,
): Promise<T> {
  const key = workspaceLabel(workspaceId)
  const previous = generatedWriteQueues.get(key) ?? Promise.resolve()
  let release!: () => void
  const current = new Promise<void>((resolve) => {
    release = resolve
  })
  const queued = previous.catch(() => undefined).then(() => current)
  generatedWriteQueues.set(key, queued)

  await previous.catch(() => undefined)
  try {
    return await action()
  } finally {
    release()
    if (generatedWriteQueues.get(key) === queued) {
      generatedWriteQueues.delete(key)
    }
  }
}

function dataDir(workspaceId?: string): string {
  return getAppDataDir(workspaceId)
}

function storePath(workspaceId?: string): string {
  return safePath(dataDir(workspaceId), STORE_FILE)
}

function settingsPath(workspaceId?: string): string {
  return safePath(dataDir(workspaceId), SETTINGS_FILE)
}

function assetDir(
  workspaceId: string | undefined,
  explorationId: string,
): string {
  return safePath(dataDir(workspaceId), 'assets', explorationId)
}

function assetPath(
  workspaceId: string | undefined,
  explorationId: string,
  fileName: string,
): string {
  return safePath(assetDir(workspaceId, explorationId), fileName)
}

function imageUrl(
  explorationId: string,
  fileName: string,
  workspaceId?: string,
  version?: string,
): string {
  const path = `/api/explorations/assets/${encodeURIComponent(explorationId)}/${encodeURIComponent(fileName)}`
  const params = new URLSearchParams()
  if (workspaceId) params.set('workspace', workspaceId)
  if (version) params.set('v', version)
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

function contentTypeForFile(fileName: string): string {
  if (/\.glb$/i.test(fileName)) return 'model/gltf-binary'
  if (/\.gltf$/i.test(fileName)) return 'model/gltf+json'
  if (/\.obj$/i.test(fileName)) return 'model/obj'
  if (/\.mtl$/i.test(fileName)) return 'text/plain'
  if (/\.jpe?g$/i.test(fileName)) return 'image/jpeg'
  return 'image/png'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function stringField(
  value: Record<string, unknown>,
  key: string,
): string | null {
  const field = value[key]
  return typeof field === 'string' && field.trim() ? field.trim() : null
}

function providerErrorFromJson(value: unknown): string | null {
  if (!isRecord(value)) return null

  const errors = value.errors
  if (Array.isArray(errors)) {
    const first = errors.find(isRecord)
    if (first) {
      const title = stringField(first, 'title') ?? stringField(first, 'message')
      const code = stringField(first, 'code')
      if (title && code) return `${title} (${code})`
      if (title) return title
    }
  }

  const error = value.error
  if (isRecord(error)) {
    const message = stringField(error, 'message') ?? stringField(error, 'title')
    const code = stringField(error, 'code')
    if (message && code) return `${message} (${code})`
    if (message) return message
  }

  return stringField(value, 'message') ?? stringField(value, 'title')
}

function providerErrorFromBuffer(buffer: Buffer): string | null {
  const body = buffer.toString('utf8').trim()
  if (!body || (!body.startsWith('{') && !body.startsWith('['))) return null

  try {
    return providerErrorFromJson(JSON.parse(body))
  } catch {
    return null
  }
}

function isPngBuffer(buffer: Buffer): boolean {
  return (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  )
}

async function loadGenerated(
  workspaceId?: string,
): Promise<GeneratedExploration[]> {
  await ensureDir(dataDir(workspaceId))
  const explorations = await readJson<GeneratedExploration[]>(
    storePath(workspaceId),
    [],
  )

  return explorations.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

async function saveGenerated(
  workspaceId: string | undefined,
  explorations: GeneratedExploration[],
): Promise<void> {
  await ensureDir(dataDir(workspaceId))
  await writeJson(storePath(workspaceId), explorations)
}

async function loadSettings(
  workspaceId: string | undefined,
): Promise<MicroscopeSettings> {
  await ensureDir(dataDir(workspaceId))
  const raw = await readJson<unknown>(
    settingsPath(workspaceId),
    DEFAULT_SETTINGS,
  )
  const parsed = settingsSchema.safeParse(raw)
  return parsed.success ? parsed.data : DEFAULT_SETTINGS
}

async function saveSettings(
  workspaceId: string | undefined,
  settings: MicroscopeSettings,
): Promise<MicroscopeSettings> {
  const parsed = settingsSchema.parse(settings)
  await ensureDir(dataDir(workspaceId))
  await writeJson(settingsPath(workspaceId), parsed)
  return parsed
}

function serializeGenerated(
  exploration: GeneratedExploration,
  workspaceId?: string,
): GeneratedExploration {
  const modelVariants = modelVariantsWithUrls(exploration, workspaceId)
  return {
    ...exploration,
    sourceImageUrl: exploration.sourceImageFileName
      ? imageUrl(
          exploration.id,
          exploration.sourceImageFileName,
          workspaceId,
          exploration.updatedAt,
        )
      : null,
    imageUrl: exploration.imageFileName
      ? imageUrl(
          exploration.id,
          exploration.imageFileName,
          workspaceId,
          exploration.updatedAt,
        )
      : null,
    modelUrl: exploration.modelFileName
      ? imageUrl(
          exploration.id,
          exploration.modelFileName,
          workspaceId,
          exploration.updatedAt,
        )
      : null,
    modelMaterialUrl: exploration.modelMaterialFileName
      ? imageUrl(
          exploration.id,
          exploration.modelMaterialFileName,
          workspaceId,
          exploration.updatedAt,
        )
      : null,
    modelTextureUrl: exploration.modelTextureFileName
      ? imageUrl(
          exploration.id,
          exploration.modelTextureFileName,
          workspaceId,
          exploration.updatedAt,
        )
      : null,
    modelVariants,
  }
}

function legacyModelVariant(
  exploration: GeneratedExploration,
): ModelVariant | null {
  if (!exploration.modelProvider) return null
  if (
    !exploration.modelFileName &&
    !exploration.modelTaskId &&
    !exploration.modelStatus
  ) {
    return null
  }
  return {
    provider: exploration.modelProvider,
    status: exploration.modelStatus ?? 'pending',
    taskId: exploration.modelTaskId,
    fileName: exploration.modelFileName,
    materialFileName: exploration.modelMaterialFileName,
    textureFileName: exploration.modelTextureFileName,
    errorMessage: exploration.modelErrorMessage,
    updatedAt: exploration.updatedAt,
  }
}

function modelVariantsForStorage(
  exploration: GeneratedExploration,
): ModelVariant[] {
  const variants = [...(exploration.modelVariants ?? [])]
  const legacy = legacyModelVariant(exploration)
  if (
    legacy &&
    !variants.some((variant) => variant.provider === legacy.provider)
  ) {
    variants.push(legacy)
  }
  return variants
}

function modelVariantsWithUrls(
  exploration: GeneratedExploration,
  workspaceId?: string,
): ModelVariant[] {
  return modelVariantsForStorage(exploration).map((variant) => ({
    ...variant,
    url: variant.fileName
      ? imageUrl(
          exploration.id,
          variant.fileName,
          workspaceId,
          variant.updatedAt,
        )
      : null,
    materialUrl: variant.materialFileName
      ? imageUrl(
          exploration.id,
          variant.materialFileName,
          workspaceId,
          variant.updatedAt,
        )
      : null,
    textureUrl: variant.textureFileName
      ? imageUrl(
          exploration.id,
          variant.textureFileName,
          workspaceId,
          variant.updatedAt,
        )
      : null,
  }))
}

function upsertModelVariant(
  exploration: GeneratedExploration,
  provider: ModelProvider,
  patch: Partial<ModelVariant>,
): ModelVariant[] {
  const now = new Date().toISOString()
  const variants = modelVariantsForStorage(exploration)
  const index = variants.findIndex((variant) => variant.provider === provider)
  const next: ModelVariant = {
    provider,
    status: patch.status ?? variants[index]?.status ?? 'pending',
    ...(index === -1 ? {} : variants[index]),
    ...patch,
    updatedAt: patch.updatedAt ?? now,
  }
  if (index === -1) return [...variants, next]
  return variants.map((variant, variantIndex) =>
    variantIndex === index ? next : variant,
  )
}

function explorationTitle(prompt: string): string {
  const cleaned = prompt.replace(/\s+/g, ' ').trim()
  return cleaned.length > 72 ? `${cleaned.slice(0, 69)}...` : cleaned
}

function hashSeed(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash)
}

function categoryIds() {
  return CATEGORIES.map((category) => category.id)
}

function closestCategoryId(value?: string): string {
  if (value && categoryIds().includes(value)) return value
  const lower = value?.toLowerCase() ?? ''
  return (
    CATEGORIES.find(
      (category) =>
        category.name.toLowerCase() === lower ||
        category.id.toLowerCase() === lower,
    )?.id ?? 'cells-microbes'
  )
}

function modelForPrompt(prompt: string, categoryId?: string): ModelRecipe {
  const lower = prompt.toLowerCase()
  const kind: ModelRecipe['kind'] =
    lower.includes('star') ||
    lower.includes('planet') ||
    lower.includes('galaxy') ||
    lower.includes('black hole')
      ? 'astronomy'
      : lower.includes('storm') ||
          lower.includes('cloud') ||
          lower.includes('hurricane') ||
          lower.includes('weather')
        ? 'weather'
        : lower.includes('battery') ||
            lower.includes('chip') ||
            lower.includes('engine') ||
            lower.includes('machine')
          ? 'machine'
          : 'image-relief'

  const category = CATEGORIES.find((item) => item.id === categoryId)
  const seed = hashSeed(`${prompt}:${categoryId ?? ''}`)
  return {
    kind,
    seed,
    palette: ['#84c7d9', '#3d6f91', '#d7e8ee', '#334155'],
    density: category?.scale === 'cosmic' ? 0.55 : 0.8,
    layers: 6,
    complexity: 0.86,
  }
}

function pickFallbackCategory(prompt: string): (typeof CATEGORIES)[number] {
  const lower = ` ${prompt.toLowerCase()} `
  let best: { category: (typeof CATEGORIES)[number]; score: number } | null =
    null
  for (const category of CATEGORIES) {
    const tokens = [
      category.id,
      ...category.name.toLowerCase().split(/[^a-z]+/),
      ...category.description.toLowerCase().split(/[^a-z]+/),
      ...category.prompts.flatMap((entry) =>
        entry.toLowerCase().split(/[^a-z]+/),
      ),
    ]
      .map((token) => token.trim())
      .filter((token) => token.length > 3)
    let score = 0
    const seen = new Set<string>()
    for (const token of tokens) {
      if (seen.has(token)) continue
      seen.add(token)
      if (lower.includes(` ${token} `) || lower.includes(` ${token}s `)) {
        score += 1
      }
    }
    if (best === null || score > best.score) {
      best = { category, score }
    }
  }
  return best && best.score > 0 ? best.category : CATEGORIES[0]
}

function providerLabel(provider: ModelProvider): string {
  return provider === 'tripo' ? 'Tripo' : 'fal Hunyuan3D'
}

function specimenPrompt(specimen: Specimen): string {
  const details = specimen.details
    .map((detail) => `${detail.label}: ${detail.value}`)
    .join('; ')
  const generationSubject =
    specimen.prompts[0] ?? `Generate an isolated ${specimen.title}.`
  return [
    'Generate this as one isolated educational specimen or clean cutaway, not a scene.',
    `Generation subject: ${generationSubject}`,
    `Library specimen context: ${specimen.title}`,
    `Educational context: ${specimen.description}`,
    details ? `Reference details: ${details}` : '',
    specimen.tags.length ? `Focus on: ${specimen.tags.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function samplePrompts(): string[] {
  const maxLength = Math.max(
    ...CATEGORIES.map((category) => category.prompts.length),
  )
  const prompts: string[] = []
  for (let index = 0; index < maxLength; index += 1) {
    for (const category of CATEGORIES) {
      const prompt = category.prompts[index]
      if (prompt) prompts.push(prompt)
    }
  }
  return prompts
}

function fallbackMetadata(
  input: GenerateExplorationInput,
): ExplorationMetadata {
  const category =
    (input.categoryId
      ? CATEGORIES.find((item) => item.id === input.categoryId)
      : undefined) ?? pickFallbackCategory(input.prompt)

  const subject = explorationTitle(input.prompt) || category.name

  return {
    title: subject,
    subtitle: category.name,
    description: `${subject} — explored at ${category.scale} scale within ${category.name}.`,
    categoryId: category.id,
    observations: [],
    details: [
      { label: 'Subject', value: subject },
      { label: 'Domain', value: category.name },
      { label: 'Scale', value: category.scale },
    ],
    prompts: category.prompts.slice(0, 4),
    imagePrompt: input.prompt,
    visualStyle: input.visualStyle ?? defaultVisualStyleFor(category.id),
  }
}

const explorationMetadataJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    subtitle: { type: 'string' },
    description: { type: 'string' },
    categoryId: {
      type: 'string',
      enum: categoryIds(),
    },
    observations: {
      type: 'array',
      minItems: 2,
      maxItems: 5,
      items: { type: 'string' },
    },
    details: {
      type: 'array',
      minItems: 2,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          label: { type: 'string' },
          value: { type: 'string' },
        },
        required: ['label', 'value'],
      },
    },
    prompts: {
      type: 'array',
      minItems: 3,
      maxItems: 6,
      items: { type: 'string' },
    },
    imagePrompt: { type: 'string' },
    visualStyle: {
      type: 'string',
      enum: ['educational', 'realistic'],
    },
  },
  required: [
    'title',
    'subtitle',
    'description',
    'categoryId',
    'observations',
    'details',
    'prompts',
    'imagePrompt',
    'visualStyle',
  ],
}

function metadataPrompt(
  input: GenerateExplorationInput,
  recentExplorations: GeneratedExploration[],
): string {
  const pinnedCategory = input.categoryId
    ? CATEGORIES.find((category) => category.id === input.categoryId)
    : undefined
  const recentSubjects = recentExplorations.slice(0, 40).map((item) => {
    const category =
      CATEGORIES.find((candidate) => candidate.id === item.categoryId)?.name ??
      item.categoryId
    return `- ${item.title} (${category}; original request: ${item.prompt})`
  })

  return `USER REQUEST:
${input.prompt}

AVAILABLE CATEGORIES:
${CATEGORIES.map((category) => `- ${category.id}: ${category.name} (${category.scale}) — ${category.description}`).join('\n')}

${
  pinnedCategory
    ? `CATEGORY CONSTRAINT:
The user chose this prompt from "${pinnedCategory.name}". You must return categoryId "${pinnedCategory.id}" even if another category might also fit. Keep the generated subject and metadata natural for that category.`
    : `CATEGORY CONSTRAINT:
No category was preselected. Choose the best categoryId from the user's request.`
}

RECENTLY GENERATED IN THIS WORKSPACE:
${recentSubjects.length > 0 ? recentSubjects.join('\n') : '- None yet'}

Pick one specific real-world subject this request points to. If the request is broad (an ecosystem, a process, a comparison, a place, a lifecycle, many objects), pick one well-known representative specimen, organism, organ, structure, mineral, instrument, or body the user would recognise.

Return JSON. Field rules:

title
  - The common name of the subject. 2-6 words.
  - No leading articles ("A", "An", "The") unless the article is part of a proper name.
  - No marketing or text-to-image adjectives ("vibrant", "beautiful", "healthy", "stunning", "detailed").
  - No trailing punctuation.

subtitle
  - 3-7 words.
  - A scientific name, taxonomic position, role, or vivid encyclopedic descriptor.
  - Must not repeat the title.

description
  - 1-2 short sentences, under 240 characters total.
  - Factual prose ABOUT the subject — what it is, where it lives, what it does, why it is notable.
  - Do NOT use: "isolated specimen", "cutaway", "educational view", "this visualization", "look for", "inspect its shape", "prepared as", "use this as", "scientific or medical scan".
  - Do NOT mention rendering, models, images, GPT, remove.bg, generation, files, the app, or the viewer.

categoryId
  - ${
    pinnedCategory
      ? `Must be "${pinnedCategory.id}".`
      : 'Pick the closest match from the list above by subject domain.'
  }

observations
  - 2-4 short factual notes about the subject (each under 140 characters).
  - Each must state a fact ABOUT THE SUBJECT (anatomy, behaviour, scale, role, history, chemistry).
  - Never give instructions to the viewer ("Start with...", "Look for...", "Notice...").
  - Never describe the image, the rendering, or the inspection process.

details
  - 2-5 label/value pairs naming concrete properties of the subject.
  - Labels are 1-3 words ("Habitat", "Scientific name", "Diameter", "Composition", "Order", "Discovered", "Range", "Mass").
  - Values are short concrete facts ("Indo-Pacific reefs", "0.5-2 mm long", "Calcium carbonate", "Cnidaria").
  - Never use a label called "Look for".

prompts
  - 3-5 follow-up subjects the user might want to explore next.
  - Each must be a concrete noun phrase naming one specimen (e.g. "Zooxanthellae symbiosis", "Coral polyp anatomy"), not a question, not an instruction.
  - Do not suggest subjects already listed in RECENTLY GENERATED IN THIS WORKSPACE. Prefer adjacent, surprising, high-curiosity subjects that are still one isolated object or clean cutaway.

imagePrompt
  - Full visual prompt for GPT Image 2 describing the SUBJECT only — its anatomy, materials, distinguishing features, structural details, colours, and orientation. ~2-4 sentences.
  - Do NOT prescribe overall art style, lighting, background, or framing here. The pipeline appends those based on visualStyle.
  - Exactly one centered primary subject, complete silhouette, no labels, no text, no callouts, no scenes.

visualStyle
  - "educational" or "realistic". Pick the render aesthetic best suited to teaching about THIS specific subject.
  - Use "educational" when the subject is normally invisible to the naked eye, abstract, or only really intelligible through diagrammatic cutaway — for example:
      cells and organelles, microbes, viruses, bacteria, protozoa, plankton, pollen, gut/skin microbiome, blood components,
      organ-internal anatomy (heart chambers, kidney nephron, neuron with myelin, lung alveoli),
      molecular structures (atoms, DNA, proteins, crystals, soap molecules),
      chemistry processes, photosynthesis, digestion, immune attack scenes,
      water-scale microbiology (a drop of pond water, microplastics).
    For these, prefer a stylized 3D textbook-illustration aesthetic with saturated colours, exaggerated structures, and clean cutaway — like a top-tier biology textbook or museum diorama.
  - Use "realistic" when the subject is a real-world organism, object, place, or material that the user would expect to look like itself — for example:
      whole animals (shrimp, anglerfish, T-rex, hummingbird, butterfly), whole plants, fungi, mushrooms,
      ecosystems and landscapes, geological features, weather phenomena, astronomical bodies (moons, planets, comets),
      foods and everyday materials, instruments and machines, cultural artefacts.
    For these, prefer photorealistic specimen / wildlife / museum reference style.
  - Never describe rendering style inside imagePrompt. Just pick the right visualStyle and leave the style framing to the pipeline.

EXAMPLE OF THE VOICE YOU SHOULD MATCH

For a request like "show me a healthy coral reef" (animal subject → realistic):
{
  "title": "Coral polyp",
  "subtitle": "Reef-building cnidarian",
  "description": "A single stony coral polyp, the tentacled animal that builds reef skeletons by secreting calcium carbonate around its base.",
  "categoryId": "animals",
  "visualStyle": "realistic",
  "imagePrompt": "A single stony coral polyp extended from a calcium carbonate cup, with a translucent column, fine retractable tentacles ringing the oral disc, and visible mesenterial filaments inside. Pinkish-tan body with hints of brown zooxanthellae freckles, captured in three-quarter view.",
  "observations": [
    "Polyps live in colonies and share a connected gastrovascular cavity.",
    "Each polyp hosts photosynthetic algae called zooxanthellae in its tissue.",
    "Under heat stress, polyps expel their algae and the skeleton turns white."
  ],
  "details": [
    { "label": "Habitat", "value": "Tropical shallow seas" },
    { "label": "Size", "value": "1-3 mm across" },
    { "label": "Phylum", "value": "Cnidaria" },
    { "label": "Skeleton", "value": "Calcium carbonate" }
  ],
  "prompts": [
    "Zooxanthellae symbiosis",
    "Coral bleaching close-up",
    "Branching staghorn coral colony",
    "Crown-of-thorns starfish"
  ]
}

For a request like "animal cell" (microscopic / textbook subject → educational):
{
  "title": "Animal cell",
  "subtitle": "Eukaryotic somatic cell",
  "description": "A generalised animal cell, the building block of vertebrate tissues, with a nucleus and membrane-bound organelles suspended in cytoplasm.",
  "categoryId": "cells-microbes",
  "visualStyle": "educational",
  "imagePrompt": "A generalised animal cell shown as a clean three-quarter cutaway. A prominent purple nucleus with a darker nucleolus dominates one side, surrounded by ribbon-like rough endoplasmic reticulum, a stack of Golgi cisternae, several mitochondria with visible inner cristae, round lysosomes, and a microtubule cytoskeleton threading through the cytoplasm. Outer membrane in pale blue, organelles in distinct saturated colours.",
  "observations": [
    "The nucleus stores DNA and directs protein synthesis through messenger RNA.",
    "Mitochondria generate ATP via oxidative phosphorylation in their inner membrane.",
    "The Golgi apparatus modifies and packages proteins from the endoplasmic reticulum."
  ],
  "details": [
    { "label": "Diameter", "value": "10-30 µm" },
    { "label": "Domain", "value": "Eukaryota" },
    { "label": "DNA location", "value": "Membrane-bound nucleus" },
    { "label": "Cell wall", "value": "Absent" }
  ],
  "prompts": [
    "Mitochondrion cutaway",
    "Rough endoplasmic reticulum",
    "Cell membrane bilayer",
    "Lysosome digesting debris"
  ]
}

EXAMPLES OF VOICE TO AVOID (do not produce text like these):
- "A focused educational view of the subject, prepared as one isolated specimen so you can inspect its shape, texture, and distinguishing structures."
- "Start with the overall silhouette, then look for the surface textures and internal structures that make it recognizable."
- "Use this as an educational visualization of the subject, not as a measured scientific or medical scan."
- "Bright, dense, translucent, or repeated regions often mark the parts worth inspecting more closely."`
}

async function generateExplorationMetadata(
  workspaceId: string | undefined,
  input: GenerateExplorationInput,
): Promise<ExplorationMetadata> {
  try {
    const recentExplorations = await loadGenerated(workspaceId)
    const result = await generateJson<unknown>({
      workspaceId,
      purpose: 'microscope.exploration.metadata',
      reasoningEffort: 'low',
      system: [
        'You write short, factual encyclopedic copy for a science exploration app.',
        'Each entry is built around one specific real-world subject: an organism, organ, cell, mineral, instrument, weather system, astronomical body, structure, or material.',
        "You take a user's request, choose one well-known concrete subject it points to, and produce concise factual writing ABOUT THAT SUBJECT (what it is, where it occurs, what it does, distinctive properties).",
        'Voice: encyclopedic, calm, specific. Prefer real scientific names, taxonomic positions, real measurements, and real locations when natural. Match the tone of a clean museum label or a Britannica micro-entry.',
        "Never describe the image, rendering pipeline, generation process, or app. Never instruct the reader how to look at the specimen. Never use phrases like 'look for', 'inspect', 'start with the silhouette', 'this visualization', 'isolated specimen', 'cutaway', 'use this as'. Never use marketing or text-to-image adjectives like 'vibrant', 'beautiful', 'stunning', 'healthy', 'detailed', 'high-quality'.",
        'Return schema-valid JSON only.',
      ].join('\n'),
      prompt: metadataPrompt(input, recentExplorations),
      schema: explorationMetadataJsonSchema,
      schemaName: 'microscopeExplorationMetadata',
      schemaDescription:
        'Metadata and follow-up prompts for a Microscope generated exploration.',
    })
    const parsed = explorationMetadataSchema.parse(result.json)
    const categoryId = input.categoryId
      ? closestCategoryId(input.categoryId)
      : closestCategoryId(parsed.categoryId)
    return {
      ...parsed,
      categoryId,
      title: parsed.title.slice(0, 72),
      subtitle: parsed.subtitle.slice(0, 72),
      prompts: parsed.prompts.slice(0, 6),
      observations: parsed.observations.slice(0, 5),
      details: parsed.details.slice(0, 6),
    }
  } catch (error) {
    console.warn(
      `[Microscope] metadata_generation_failed workspace=${workspaceLabel(workspaceId)} message=${errorMessage(error, 'unknown')}`,
    )
    return fallbackMetadata(input)
  }
}

function composeImagePrompt(input: GenerateExplorationInput): string {
  const category = CATEGORIES.find((item) => item.id === input.categoryId)
  const visualStyle =
    input.visualStyle ?? defaultVisualStyleFor(input.categoryId)
  return [
    imageFrameFor(visualStyle),
    category
      ? `Domain: ${category.name}. ${category.description}`
      : 'Domain: broad natural world, from microscopic to cosmic scale.',
    'Subject request to translate into one isolated render:',
    input.prompt,
    'Final instruction: return only the specimen render. No caption, no UI, no background scene.',
  ].join('\n')
}

function errorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback
  if (/aivault timed out after \d+ms/i.test(message)) {
    if (/3d|render|model/i.test(fallback)) {
      return 'The 3D model provider took too long to respond. You can keep using the 2D image or regenerate the 3D model.'
    }
    if (/remove\.?bg|background/i.test(fallback)) {
      return 'Background removal took too long. You can try regenerating the image.'
    }
    if (/image/i.test(fallback)) {
      return 'Image generation took too long. Please try again.'
    }
    return 'The request took too long to complete. Please try again.'
  }
  if (/fal\/image-to-3d request failed with (502|503|504)\b/i.test(message)) {
    return 'fal did not return the 3D model in time. You can keep using the 2D image or regenerate the 3D model.'
  }
  return message
}

function isTransientModelProviderError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return (
    /request failed with (429|502|503|504)\b/i.test(message) ||
    /timed out|ECONNRESET|ETIMEDOUT|socket hang up/i.test(message)
  )
}

function canFallbackFromMoldableImageStatus(status?: number): boolean {
  return status === 401 || status === 403 || status === 404
}

async function invokeMoldableImages<T>(
  workspaceId: string | undefined,
  request: AivaultRequest,
): Promise<T | null> {
  let parsed: {
    response?: { json?: unknown; status?: number }
    error?: { message?: string; code?: string }
    code?: string
    message?: string
  }

  try {
    parsed = await imageRequest<T>({
      workspaceId,
      purpose: 'microscope.openai-image-generation',
      ...request,
    })
  } catch (error) {
    const message = errorMessage(error, 'Moldable AI image request failed')
    if (
      message.includes('Moldable AI server environment is not configured') ||
      message.includes('codex_unavailable') ||
      message.includes('status 404')
    ) {
      return null
    }
    throw error
  }

  const status = parsed.response?.status
  if (canFallbackFromMoldableImageStatus(status)) return null

  const json = (parsed.response?.json ?? parsed) as
    | (T & { error?: { message?: string } })
    | undefined

  if (status && status >= 400) {
    throw new Error(
      json?.error?.message ?? `OpenAI image request failed with ${status}`,
    )
  }
  if (!json) throw new Error('OpenAI image request returned no JSON body')
  return json as T
}

async function invokeOpenAIImages<T>(
  workspaceId: string | undefined,
  request: AivaultRequest,
): Promise<T> {
  const moldableResponse = await invokeMoldableImages<T>(workspaceId, request)
  if (moldableResponse) return moldableResponse
  return invokeAivaultJson<T>(workspaceId, 'openai/image-generation', request)
}

function imageFromResponse(response: OpenAIImageResponse): string {
  const image = response.data?.[0]
  if (!image?.b64_json) {
    throw new Error(
      response.error?.message ?? 'OpenAI did not return an image payload.',
    )
  }
  return image.b64_json
}

async function saveImageAsset({
  workspaceId,
  explorationId,
  b64Json,
  fileName = 'microscope-layer.png',
}: {
  workspaceId?: string
  explorationId: string
  b64Json: string
  fileName?: string
}): Promise<string> {
  await ensureDir(safePath(dataDir(workspaceId), 'assets', explorationId))
  await writeFile(
    assetPath(workspaceId, explorationId, fileName),
    Buffer.from(b64Json, 'base64'),
  )
  return fileName
}

async function saveBufferAsset({
  workspaceId,
  explorationId,
  fileName,
  buffer,
}: {
  workspaceId?: string
  explorationId: string
  fileName: string
  buffer: Buffer
}): Promise<string> {
  await ensureDir(safePath(dataDir(workspaceId), 'assets', explorationId))
  await writeFile(assetPath(workspaceId, explorationId, fileName), buffer)
  return fileName
}

function providerAssetFileName(provider: ModelProvider, fileName: string) {
  const trimmed = fileName.trim() || 'asset'
  const extensionIndex = trimmed.lastIndexOf('.')
  if (extensionIndex <= 0) return `${provider}-${trimmed}`
  return `${provider}-${trimmed.slice(0, extensionIndex)}${trimmed.slice(
    extensionIndex,
  )}`
}

async function patchExploration(
  workspaceId: string | undefined,
  explorationId: string,
  update: (exploration: GeneratedExploration) => GeneratedExploration,
): Promise<GeneratedExploration | null> {
  return withGeneratedWriteLock(workspaceId, async () => {
    const explorations = await loadGenerated(workspaceId)
    const index = explorations.findIndex((item) => item.id === explorationId)
    if (index === -1) return null

    const next = update(explorations[index])
    explorations[index] = {
      ...next,
      updatedAt: new Date().toISOString(),
    }
    await saveGenerated(workspaceId, explorations)
    return explorations[index]
  })
}

async function isExplorationCanceled(
  workspaceId: string | undefined,
  explorationId: string,
): Promise<boolean> {
  const explorations = await loadGenerated(workspaceId)
  return explorations.some(
    (item) => item.id === explorationId && item.status === 'canceled',
  )
}

async function isCurrentModelTask(
  workspaceId: string | undefined,
  explorationId: string,
  modelProvider: ModelProvider,
  taskId: string,
): Promise<boolean> {
  const explorations = await loadGenerated(workspaceId)
  const exploration = explorations.find((item) => item.id === explorationId)
  if (!exploration || exploration.status === 'canceled') return false
  return (
    exploration.modelProvider === modelProvider &&
    exploration.modelTaskId === taskId &&
    exploration.modelStatus === 'rendering'
  )
}

function isCurrentModelRenderToken(
  workspaceId: string | undefined,
  explorationId: string,
  token: string,
): boolean {
  return (
    activeModelRenderTokens.get(modelRenderKey(workspaceId, explorationId)) ===
    token
  )
}

async function imageDataUrl(
  workspaceId: string | undefined,
  explorationId: string,
  fileName: string,
): Promise<string> {
  const buffer = await readFile(assetPath(workspaceId, explorationId, fileName))
  return `data:${contentTypeForFile(fileName)};base64,${buffer.toString('base64')}`
}

async function removeBackground(
  workspaceId: string | undefined,
  sourcePath: string,
): Promise<Buffer> {
  const buffer = await invokeAivaultStream(
    workspaceId,
    REMOVE_BG_CAPABILITY_ID,
    {
      method: 'POST',
      path: '/v1.0/removebg',
      multipartFields: {
        size: 'auto',
        format: 'png',
      },
      multipartFiles: {
        image_file: sourcePath,
      },
      timeoutMs: REMOVE_BG_TIMEOUT_MS,
    },
  )

  if (!isPngBuffer(buffer)) {
    const providerMessage = providerErrorFromBuffer(buffer)
    throw new Error(
      providerMessage
        ? `Background removal failed: ${providerMessage}`
        : 'Background removal did not return a PNG image.',
    )
  }

  return buffer
}

async function queueGeneration(
  workspaceId: string | undefined,
  input: GenerateExplorationInput,
): Promise<GeneratedExploration> {
  const now = new Date().toISOString()
  const settings = await loadSettings(workspaceId)
  const modelProvider = input.modelProvider ?? settings.modelProvider
  const quality = input.quality ?? settings.quality ?? DEFAULT_QUALITY
  const metadata = await generateExplorationMetadata(workspaceId, input)
  const category =
    CATEGORIES.find((item) => item.id === metadata.categoryId) ?? CATEGORIES[0]
  const visualStyle =
    metadata.visualStyle ??
    input.visualStyle ??
    defaultVisualStyleFor(category.id)
  const exploration: GeneratedExploration = {
    id: randomUUID(),
    source: 'generated',
    title: metadata.title,
    subtitle: metadata.subtitle || category.name,
    description: metadata.description,
    prompt: input.prompt,
    categoryId: category.id,
    scale: category.scale,
    visualStyle,
    status: 'generating',
    backgroundStatus: 'pending',
    modelStatus: 'pending',
    imageUrl: null,
    sourceImageUrl: null,
    modelUrl: null,
    modelProvider,
    selectedModelProvider: modelProvider,
    model: modelForPrompt(input.prompt, category.id),
    quality,
    createdAt: now,
    updatedAt: now,
    observations: metadata.observations,
    details: metadata.details,
    prompts: metadata.prompts,
  }

  await withGeneratedWriteLock(workspaceId, async () => {
    const explorations = await loadGenerated(workspaceId)
    explorations.unshift(exploration)
    await saveGenerated(workspaceId, explorations)
  })

  void finishGeneration(workspaceId, exploration.id, {
    ...input,
    prompt: metadata.imagePrompt,
    categoryId: category.id,
    modelProvider,
    quality,
    visualStyle,
  })
  return exploration
}

async function queueSpecimenGeneration(
  workspaceId: string | undefined,
  specimenId: string,
  quality?: ImageQuality,
  modelProvider?: ModelProvider,
): Promise<GeneratedExploration | null> {
  const specimen = SPECIMENS.find((item) => item.id === specimenId)
  if (!specimen) return null
  return queueGeneration(workspaceId, {
    prompt: specimenPrompt(specimen),
    categoryId: specimen.categoryId,
    quality,
    modelProvider,
  })
}

async function queueRegeneration(
  workspaceId: string | undefined,
  explorationId: string,
  requestedProvider?: ModelProvider,
  requestedQuality?: ImageQuality,
): Promise<GeneratedExploration | null> {
  const settings = await loadSettings(workspaceId)
  let modelProvider: ModelProvider = requestedProvider ?? settings.modelProvider
  let quality: ImageQuality = requestedQuality ?? settings.quality
  const updated = await patchExploration(workspaceId, explorationId, (item) => {
    modelProvider =
      requestedProvider ?? item.modelProvider ?? settings.modelProvider
    quality = requestedQuality ?? item.quality ?? settings.quality
    const category = CATEGORIES.find(
      (candidate) => candidate.id === item.categoryId,
    )
    const visualStyle =
      item.visualStyle ?? defaultVisualStyleFor(item.categoryId)
    return {
      ...item,
      subtitle: category?.name ?? 'Generated exploration',
      visualStyle,
      status: 'generating',
      backgroundStatus: 'pending',
      modelStatus: 'pending',
      errorMessage: undefined,
      backgroundErrorMessage: undefined,
      modelErrorMessage: undefined,
      imageFileName: undefined,
      sourceImageFileName: undefined,
      imageUrl: null,
      sourceImageUrl: null,
      modelFileName: undefined,
      modelMaterialFileName: undefined,
      modelTextureFileName: undefined,
      modelUrl: null,
      modelMaterialUrl: null,
      modelTextureUrl: null,
      modelVariants: [],
      modelProvider,
      selectedModelProvider: modelProvider,
      modelTaskId: undefined,
      model: modelForPrompt(item.prompt, item.categoryId),
      quality,
    }
  })

  if (!updated) return null

  // Drop the stale asset directory so the previous image and model files are
  // not served while the new generation is in flight. `saveImageAsset` will
  // recreate the directory when the new image is written.
  await rm(assetDir(workspaceId, explorationId), {
    recursive: true,
    force: true,
  }).catch(() => undefined)
  activeModelRenderTokens.delete(modelRenderKey(workspaceId, explorationId))

  void finishGeneration(workspaceId, explorationId, {
    prompt: updated.prompt,
    categoryId: updated.categoryId,
    quality,
    modelProvider,
    visualStyle:
      updated.visualStyle ?? defaultVisualStyleFor(updated.categoryId),
  })
  return updated
}

async function queueModelRegeneration(
  workspaceId: string | undefined,
  explorationId: string,
  requestedProvider?: ModelProvider,
  requestedQuality?: ImageQuality,
): Promise<GeneratedExploration | null> {
  const settings = await loadSettings(workspaceId)
  let modelProvider: ModelProvider = requestedProvider ?? settings.modelProvider
  let imageFileName: string | undefined
  let quality: ImageQuality | undefined = requestedQuality ?? settings.quality

  const updated = await patchExploration(workspaceId, explorationId, (item) => {
    modelProvider =
      requestedProvider ?? item.modelProvider ?? settings.modelProvider
    imageFileName = item.imageFileName ?? item.sourceImageFileName
    quality = requestedQuality ?? item.quality ?? settings.quality
    if (!imageFileName) return item
    return {
      ...item,
      status: 'ready',
      modelStatus: 'rendering',
      errorMessage: undefined,
      modelErrorMessage: undefined,
      modelProvider,
      selectedModelProvider: modelProvider,
      modelTaskId: undefined,
      modelFileName: undefined,
      modelMaterialFileName: undefined,
      modelTextureFileName: undefined,
      modelUrl: null,
      modelMaterialUrl: null,
      modelTextureUrl: null,
      quality,
      modelVariants: upsertModelVariant(item, modelProvider, {
        status: 'rendering',
        taskId: undefined,
        fileName: undefined,
        materialFileName: undefined,
        textureFileName: undefined,
        url: null,
        materialUrl: null,
        textureUrl: null,
        errorMessage: undefined,
      }),
    }
  })

  if (!updated || !imageFileName) return updated

  void finishModelRender(
    workspaceId,
    explorationId,
    imageFileName,
    modelProvider,
    quality,
  )
  return updated
}

async function queueBackgroundRemovalRetry(
  workspaceId: string | undefined,
  explorationId: string,
  requestedProvider?: ModelProvider,
  requestedQuality?: ImageQuality,
): Promise<GeneratedExploration | null> {
  const settings = await loadSettings(workspaceId)
  let sourceImageFileName: string | undefined
  let modelProvider: ModelProvider = requestedProvider ?? settings.modelProvider
  let quality: ImageQuality = requestedQuality ?? settings.quality

  const updated = await patchExploration(workspaceId, explorationId, (item) => {
    sourceImageFileName = item.sourceImageFileName
    modelProvider =
      requestedProvider ?? item.modelProvider ?? settings.modelProvider
    quality = requestedQuality ?? item.quality ?? settings.quality
    if (!sourceImageFileName || item.status === 'canceled') return item
    return {
      ...item,
      status: 'ready',
      backgroundStatus: 'removing',
      backgroundErrorMessage: undefined,
      imageFileName: sourceImageFileName,
      imageUrl: imageUrl(explorationId, sourceImageFileName, workspaceId),
      modelProvider,
      selectedModelProvider: modelProvider,
      quality,
    }
  })

  if (!updated || !sourceImageFileName || updated.status === 'canceled') {
    return updated
  }

  void finishBackgroundRemovalRetry(
    workspaceId,
    explorationId,
    sourceImageFileName,
    modelProvider,
    quality,
  )
  return updated
}

async function cancelGeneration(
  workspaceId: string | undefined,
  explorationId: string,
): Promise<GeneratedExploration | null> {
  return patchExploration(workspaceId, explorationId, (item) => ({
    ...item,
    status: 'canceled',
    backgroundStatus:
      item.backgroundStatus === 'removing' ||
      item.backgroundStatus === 'pending'
        ? 'skipped'
        : item.backgroundStatus,
    modelStatus:
      item.modelStatus === 'rendering' || item.modelStatus === 'pending'
        ? 'skipped'
        : item.modelStatus,
    errorMessage: 'Canceled by user.',
    modelErrorMessage:
      item.modelStatus === 'rendering'
        ? 'Canceled by user.'
        : item.modelErrorMessage,
  }))
}

async function moveExploration(
  workspaceId: string | undefined,
  explorationId: string,
  categoryId: string,
): Promise<GeneratedExploration | null> {
  const category = CATEGORIES.find((item) => item.id === categoryId)
  if (!category) return null

  return patchExploration(workspaceId, explorationId, (item) => ({
    ...item,
    categoryId: category.id,
    subtitle: category.name,
    scale: category.scale,
  }))
}

async function selectExplorationModelProvider(
  workspaceId: string | undefined,
  explorationId: string,
  modelProvider: ModelProvider,
): Promise<GeneratedExploration | null> {
  return patchExploration(workspaceId, explorationId, (item) => ({
    ...item,
    selectedModelProvider: modelProvider,
  }))
}

async function deleteExploration(
  workspaceId: string | undefined,
  explorationId: string,
): Promise<boolean> {
  const deleted = await withGeneratedWriteLock(workspaceId, async () => {
    const explorations = await loadGenerated(workspaceId)
    const next = explorations.filter((item) => item.id !== explorationId)
    if (next.length === explorations.length) return false

    await saveGenerated(workspaceId, next)
    return true
  })
  if (!deleted) return false

  deletedExplorationKeys.add(
    explorationLifecycleKey(workspaceId, explorationId),
  )
  await rm(assetDir(workspaceId, explorationId), {
    recursive: true,
    force: true,
  })
  activeModelRenderTokens.delete(modelRenderKey(workspaceId, explorationId))
  return true
}

async function finishGeneration(
  workspaceId: string | undefined,
  explorationId: string,
  input: GenerateExplorationInput,
): Promise<void> {
  try {
    const modelProvider = input.modelProvider ?? DEFAULT_SETTINGS.modelProvider
    if (
      isExplorationDeleted(workspaceId, explorationId) ||
      (await isExplorationCanceled(workspaceId, explorationId))
    ) {
      return
    }

    const response = await invokeOpenAIImages<OpenAIImageResponse>(
      workspaceId,
      {
        method: 'POST',
        path: '/v1/images/generations',
        headers: {
          'content-type': 'application/json',
        },
        body: {
          model: MODEL,
          prompt: composeImagePrompt(input),
          n: 1,
          size: '1600x1200',
          quality: input.quality ?? DEFAULT_QUALITY,
          output_format: 'png',
        },
        timeoutMs: IMAGE_GENERATION_TIMEOUT_MS,
      },
    )
    if (
      isExplorationDeleted(workspaceId, explorationId) ||
      (await isExplorationCanceled(workspaceId, explorationId))
    ) {
      return
    }
    const sourceFileName = await saveImageAsset({
      workspaceId,
      explorationId,
      b64Json: imageFromResponse(response),
      fileName: 'source-image.png',
    })

    const generated = await patchExploration(
      workspaceId,
      explorationId,
      (item) => {
        if (item.status === 'canceled') return item
        const category = CATEGORIES.find(
          (candidate) => candidate.id === item.categoryId,
        )
        return {
          ...item,
          subtitle: category?.name ?? 'Generated exploration',
          status: 'ready',
          backgroundStatus: 'removing',
          modelStatus: 'pending',
          sourceImageFileName: sourceFileName,
          imageFileName: sourceFileName,
          imageUrl: imageUrl(explorationId, sourceFileName, workspaceId),
          sourceImageUrl: imageUrl(explorationId, sourceFileName, workspaceId),
          updatedAt: new Date().toISOString(),
        }
      },
    )
    if (!generated) {
      await rm(assetDir(workspaceId, explorationId), {
        recursive: true,
        force: true,
      }).catch(() => undefined)
      return
    }
    if (generated.status === 'canceled') return

    let modelSourceFileName = sourceFileName
    try {
      if (
        isExplorationDeleted(workspaceId, explorationId) ||
        (await isExplorationCanceled(workspaceId, explorationId))
      ) {
        return
      }
      const removed = await removeBackground(
        workspaceId,
        assetPath(workspaceId, explorationId, sourceFileName),
      )
      modelSourceFileName = await saveBufferAsset({
        workspaceId,
        explorationId,
        fileName: 'microscope-layer.png',
        buffer: removed,
      })
      const removedBackground = await patchExploration(
        workspaceId,
        explorationId,
        (item) => {
          if (item.status === 'canceled') return item
          return {
            ...item,
            backgroundStatus: 'ready',
            modelStatus: 'rendering',
            modelProvider,
            imageFileName: modelSourceFileName,
            imageUrl: imageUrl(explorationId, modelSourceFileName, workspaceId),
          }
        },
      )
      if (!removedBackground) {
        await rm(assetDir(workspaceId, explorationId), {
          recursive: true,
          force: true,
        }).catch(() => undefined)
        return
      }
    } catch (error) {
      console.warn(
        `[Microscope] remove_bg_failed workspace=${workspaceLabel(workspaceId)} id=${explorationId} message=${errorMessage(error, 'unknown')}`,
      )
      await patchExploration(workspaceId, explorationId, (item) => {
        if (item.status === 'canceled') return item
        return {
          ...item,
          backgroundStatus: 'failed',
          backgroundErrorMessage: errorMessage(error, 'remove.bg failed.'),
          modelStatus: 'rendering',
          modelProvider,
        }
      })
    }

    void finishModelRender(
      workspaceId,
      explorationId,
      modelSourceFileName,
      modelProvider,
      input.quality,
    )
  } catch (error) {
    await patchExploration(workspaceId, explorationId, (item) => {
      if (item.status === 'canceled') return item
      return {
        ...item,
        status: 'failed',
        backgroundStatus: 'skipped',
        modelStatus: 'skipped',
        errorMessage: errorMessage(error, 'Image generation failed.'),
      }
    })
    console.error(
      `[Microscope] generation_failed workspace=${workspaceLabel(workspaceId)} id=${explorationId} message=${errorMessage(error, 'unknown')}`,
    )
  }
}

async function finishBackgroundRemovalRetry(
  workspaceId: string | undefined,
  explorationId: string,
  sourceFileName: string,
  modelProvider: ModelProvider,
  quality?: ImageQuality,
): Promise<void> {
  try {
    if (
      isExplorationDeleted(workspaceId, explorationId) ||
      (await isExplorationCanceled(workspaceId, explorationId))
    ) {
      return
    }
    const removed = await removeBackground(
      workspaceId,
      assetPath(workspaceId, explorationId, sourceFileName),
    )
    const layerFileName = await saveBufferAsset({
      workspaceId,
      explorationId,
      fileName: 'microscope-layer.png',
      buffer: removed,
    })
    if (isExplorationDeleted(workspaceId, explorationId)) {
      await rm(assetDir(workspaceId, explorationId), {
        recursive: true,
        force: true,
      }).catch(() => undefined)
      return
    }
    const updated = await patchExploration(
      workspaceId,
      explorationId,
      (item) => {
        if (item.status === 'canceled') return item
        return {
          ...item,
          status: 'ready',
          backgroundStatus: 'ready',
          backgroundErrorMessage: undefined,
          modelStatus: 'rendering',
          modelProvider,
          modelTaskId: undefined,
          modelFileName: undefined,
          modelMaterialFileName: undefined,
          modelTextureFileName: undefined,
          modelUrl: null,
          modelMaterialUrl: null,
          modelTextureUrl: null,
          modelErrorMessage: undefined,
          imageFileName: layerFileName,
          imageUrl: imageUrl(explorationId, layerFileName, workspaceId),
          modelVariants: upsertModelVariant(item, modelProvider, {
            status: 'rendering',
            taskId: undefined,
            fileName: undefined,
            materialFileName: undefined,
            textureFileName: undefined,
            url: null,
            materialUrl: null,
            textureUrl: null,
            errorMessage: undefined,
          }),
        }
      },
    )
    if (!updated) {
      await rm(assetDir(workspaceId, explorationId), {
        recursive: true,
        force: true,
      }).catch(() => undefined)
      return
    }
    if (updated.status === 'canceled') return

    void finishModelRender(
      workspaceId,
      explorationId,
      layerFileName,
      modelProvider,
      quality,
    )
  } catch (error) {
    await patchExploration(workspaceId, explorationId, (item) => {
      if (item.status === 'canceled') return item
      return {
        ...item,
        status: 'ready',
        backgroundStatus: 'failed',
        backgroundErrorMessage: errorMessage(
          error,
          'Background removal failed.',
        ),
        imageFileName: sourceFileName,
        imageUrl: imageUrl(explorationId, sourceFileName, workspaceId),
      }
    })
    console.error(
      `[Microscope] background_retry_failed workspace=${workspaceLabel(workspaceId)} id=${explorationId} message=${errorMessage(error, 'unknown')}`,
    )
  }
}

async function finishModelRender(
  workspaceId: string | undefined,
  explorationId: string,
  imageFileName: string,
  modelProvider: ModelProvider,
  quality?: ImageQuality,
): Promise<void> {
  let renderTaskId: string | undefined
  const renderToken = randomUUID()
  activeModelRenderTokens.set(
    modelRenderKey(workspaceId, explorationId),
    renderToken,
  )
  try {
    if (
      isExplorationDeleted(workspaceId, explorationId) ||
      (await isExplorationCanceled(workspaceId, explorationId))
    ) {
      return
    }

    const sourcePath = assetPath(workspaceId, explorationId, imageFileName)
    const provider = getModelRenderProvider(modelProvider)
    const task = await provider.createTask({
      workspaceId,
      imageFileName,
      sourcePath,
      inputImageUrl: await imageDataUrl(
        workspaceId,
        explorationId,
        imageFileName,
      ),
      quality,
    })
    if (!isCurrentModelRenderToken(workspaceId, explorationId, renderToken)) {
      return
    }
    renderTaskId = task.taskId
    await patchExploration(workspaceId, explorationId, (item) => ({
      ...(!isCurrentModelRenderToken(workspaceId, explorationId, renderToken) ||
      item.status === 'canceled'
        ? item
        : {
            ...item,
            status: 'ready' as const,
            backgroundStatus:
              item.backgroundStatus === 'pending'
                ? imageFileName === 'microscope-layer.png'
                  ? 'ready'
                  : 'skipped'
                : item.backgroundStatus,
            modelStatus: 'rendering' as const,
            modelProvider,
            modelTaskId: task.taskId,
            modelVariants: upsertModelVariant(item, modelProvider, {
              status: 'rendering',
              taskId: task.taskId,
              modelDetail: task.modelDetail,
              errorMessage: undefined,
            }),
            imageFileName: item.imageFileName ?? imageFileName,
            imageUrl: imageUrl(
              explorationId,
              item.imageFileName ?? imageFileName,
              workspaceId,
            ),
          }),
    }))

    let lastTransientDownloadError: unknown
    for (let poll = 0; poll < task.maxPolls; poll += 1) {
      if (
        !isCurrentModelRenderToken(workspaceId, explorationId, renderToken) ||
        !(await isCurrentModelTask(
          workspaceId,
          explorationId,
          modelProvider,
          task.taskId,
        ))
      ) {
        return
      }
      const status = await provider.getStatus(workspaceId, task.taskId)
      if (status === 'failed') {
        throw new Error(
          `${providerLabel(modelProvider)} reported that the 3D render failed.`,
        )
      }
      if (status === 'success') {
        let model: Awaited<ReturnType<typeof provider.downloadModel>>
        try {
          model = await provider.downloadModel(workspaceId, task.taskId)
        } catch (error) {
          if (
            isTransientModelProviderError(error) &&
            poll < task.maxPolls - 1
          ) {
            lastTransientDownloadError = error
            await new Promise((resolve) =>
              setTimeout(resolve, task.pollIntervalMs),
            )
            continue
          }
          throw error
        }
        if (
          isExplorationDeleted(workspaceId, explorationId) ||
          !isCurrentModelRenderToken(workspaceId, explorationId, renderToken) ||
          !(await isCurrentModelTask(
            workspaceId,
            explorationId,
            modelProvider,
            task.taskId,
          ))
        ) {
          return
        }
        if (isExplorationDeleted(workspaceId, explorationId)) return
        const modelFileName = await saveBufferAsset({
          workspaceId,
          explorationId,
          fileName: providerAssetFileName(modelProvider, model.model.fileName),
          buffer: model.model.buffer,
        })
        const modelMaterialFileName = model.material
          ? await saveBufferAsset({
              workspaceId,
              explorationId,
              fileName: providerAssetFileName(
                modelProvider,
                model.material.fileName,
              ),
              buffer: model.material.buffer,
            })
          : undefined
        const modelTextureFileName = model.texture
          ? await saveBufferAsset({
              workspaceId,
              explorationId,
              fileName: providerAssetFileName(
                modelProvider,
                model.texture.fileName,
              ),
              buffer: model.texture.buffer,
            })
          : undefined
        const updated = await patchExploration(
          workspaceId,
          explorationId,
          (item) => {
            if (
              !isCurrentModelRenderToken(
                workspaceId,
                explorationId,
                renderToken,
              ) ||
              item.status === 'canceled' ||
              item.modelProvider !== modelProvider ||
              item.modelTaskId !== task.taskId
            ) {
              return item
            }
            return {
              ...item,
              status: 'ready',
              backgroundStatus:
                item.backgroundStatus === 'pending'
                  ? imageFileName === 'microscope-layer.png'
                    ? 'ready'
                    : 'skipped'
                  : item.backgroundStatus,
              modelStatus: 'ready',
              imageFileName: item.imageFileName ?? imageFileName,
              imageUrl: imageUrl(
                explorationId,
                item.imageFileName ?? imageFileName,
                workspaceId,
              ),
              modelFileName,
              modelMaterialFileName,
              modelTextureFileName,
              modelVariants: upsertModelVariant(item, modelProvider, {
                status: 'ready',
                taskId: task.taskId,
                fileName: modelFileName,
                materialFileName: modelMaterialFileName,
                textureFileName: modelTextureFileName,
                modelDetail: task.modelDetail,
                errorMessage: undefined,
              }),
              modelUrl: imageUrl(explorationId, modelFileName, workspaceId),
              modelMaterialUrl: modelMaterialFileName
                ? imageUrl(explorationId, modelMaterialFileName, workspaceId)
                : null,
              modelTextureUrl: modelTextureFileName
                ? imageUrl(explorationId, modelTextureFileName, workspaceId)
                : null,
            }
          },
        )
        if (!updated) {
          await rm(assetDir(workspaceId, explorationId), {
            recursive: true,
            force: true,
          }).catch(() => undefined)
        }
        return
      }
      await new Promise((resolve) => setTimeout(resolve, task.pollIntervalMs))
    }

    if (lastTransientDownloadError) {
      throw new Error(
        `${providerLabel(modelProvider)} result fetching kept returning temporary server errors. The 2D image is still available; regenerate the 3D model to retry.`,
      )
    }
    throw new Error(
      `${providerLabel(modelProvider)} render timed out before a model was ready.`,
    )
  } catch (error) {
    if (!isCurrentModelRenderToken(workspaceId, explorationId, renderToken)) {
      return
    }
    if (renderTaskId) {
      const explorations = await loadGenerated(workspaceId)
      const exploration = explorations.find((item) => item.id === explorationId)
      if (
        !exploration ||
        exploration.status === 'canceled' ||
        exploration.modelProvider !== modelProvider ||
        exploration.modelTaskId !== renderTaskId ||
        exploration.modelStatus !== 'rendering'
      ) {
        return
      }
    }
    await patchExploration(workspaceId, explorationId, (item) => ({
      ...(!isCurrentModelRenderToken(workspaceId, explorationId, renderToken) ||
      item.status === 'canceled' ||
      (renderTaskId !== undefined && item.modelTaskId !== renderTaskId)
        ? item
        : {
            ...item,
            status: item.imageFileName || imageFileName ? 'ready' : item.status,
            backgroundStatus:
              item.backgroundStatus === 'pending'
                ? imageFileName === 'microscope-layer.png'
                  ? 'ready'
                  : 'skipped'
                : item.backgroundStatus,
            modelStatus: 'failed' as const,
            modelProvider,
            imageFileName: item.imageFileName ?? imageFileName,
            imageUrl: imageUrl(
              explorationId,
              item.imageFileName ?? imageFileName,
              workspaceId,
            ),
            modelErrorMessage: errorMessage(error, '3D render failed.'),
            modelVariants: upsertModelVariant(item, modelProvider, {
              status: 'failed',
              errorMessage: errorMessage(error, '3D render failed.'),
            }),
          }),
    }))
    console.error(
      `[Microscope] model_render_failed workspace=${workspaceLabel(workspaceId)} id=${explorationId} message=${errorMessage(error, 'unknown')}`,
    )
  } finally {
    if (isCurrentModelRenderToken(workspaceId, explorationId, renderToken)) {
      activeModelRenderTokens.delete(modelRenderKey(workspaceId, explorationId))
    }
  }
}

function shouldRetryModelRender(exploration: GeneratedExploration): boolean {
  if (exploration.status !== 'ready') return false
  if (!exploration.imageFileName) return false
  if (exploration.modelStatus !== 'failed') return false
  const message = exploration.modelErrorMessage ?? ''
  return (
    message.includes('PolicyViolation') ||
    message.includes('effective host') ||
    message.includes('not valid JSON') ||
    message.includes('EOF while parsing')
  )
}

async function resumeRecoverableModelJobs(
  workspaceId: string | undefined,
): Promise<void> {
  const recoverable = await withGeneratedWriteLock(workspaceId, async () => {
    const explorations = await loadGenerated(workspaceId)
    const items = explorations.filter(shouldRetryModelRender)
    if (!items.length) return items

    const now = new Date().toISOString()
    const next = explorations.map((exploration) =>
      shouldRetryModelRender(exploration)
        ? {
            ...exploration,
            modelStatus: 'rendering' as const,
            modelProvider: exploration.modelProvider ?? 'fal',
            modelTaskId: undefined,
            modelFileName: undefined,
            modelMaterialFileName: undefined,
            modelTextureFileName: undefined,
            modelUrl: null,
            modelMaterialUrl: null,
            modelTextureUrl: null,
            modelErrorMessage: undefined,
            updatedAt: now,
          }
        : exploration,
    )
    await saveGenerated(workspaceId, next)
    return items
  })
  if (!recoverable.length) return

  for (const exploration of recoverable) {
    if (!exploration.imageFileName) continue
    void finishModelRender(
      workspaceId,
      exploration.id,
      exploration.imageFileName,
      exploration.modelProvider ?? 'fal',
      exploration.quality,
    )
  }
}

app.get('/api/moldable/health', (c) => {
  return c.json({
    appId: process.env.MOLDABLE_APP_ID ?? 'microscope',
    status: 'ok',
  })
})

app.get('/api/moldable/today', async (c) => {
  const generatedAt = new Date().toISOString()
  const items: unknown[] = []
  let resume: unknown = null

  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    const explorations = await loadGenerated(workspaceId)

    // Something running NOW: an image still generating, or a 3D model rendering.
    const inProgress = explorations.filter(
      (item) =>
        item.status === 'generating' || item.modelStatus === 'rendering',
    )
    // A generation that failed recently and is worth retrying.
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000
    const recentlyFailed = explorations.filter(
      (item) =>
        item.status === 'failed' &&
        new Date(item.updatedAt).getTime() >= dayAgo,
    )

    if (recentlyFailed.length > 0) {
      // Blocked beats active — surface the failure first.
      const failed = recentlyFailed[0]
      items.push({
        id: 'render:failed',
        kind: 'blocked',
        surface: 'nudge',
        title:
          recentlyFailed.length === 1
            ? `${failed.title} failed to render`
            : `${recentlyFailed.length} explorations failed to render`,
        subtitle: failed.errorMessage ?? 'The render did not finish.',
        icon: '⚠️',
        priority: 95,
        actions: [
          {
            type: 'rpc',
            label: 'Retry',
            method: 'microscope.regenerate',
            params: { id: failed.id },
          },
          { type: 'open-app', label: 'Open Microscope' },
        ],
      })
    } else if (inProgress.length > 0) {
      const active = inProgress[0]
      const rendering = active.modelStatus === 'rendering'
      items.push({
        id: 'render:active',
        kind: 'active',
        surface: 'nudge',
        title: rendering
          ? `Rendering 3D model of ${active.title}`
          : `Generating ${active.title}`,
        subtitle:
          inProgress.length > 1
            ? `${inProgress.length} explorations in progress`
            : undefined,
        icon: '🔬',
        priority: 90,
        dismissible: false,
        actions: [
          { type: 'open-app', label: 'Check progress' },
          {
            type: 'rpc',
            label: 'Cancel',
            method: 'microscope.cancel',
            params: { id: active.id },
            confirm: 'Cancel this generation?',
          },
        ],
      })
    }

    // Resume: genuine unfinished work — an exploration whose 2D image is ready
    // but whose 3D model never finished (failed, skipped, or never started) and
    // is not currently rendering. That is the "you started this, the 3D didn't
    // complete, pick it back up" state. Stay silent for fully-finished or
    // empty/failed-from-the-start explorations: a completed render is not
    // "picking up where you left off".
    const unfinished = explorations.find(
      (item) =>
        item.status === 'ready' &&
        Boolean(item.imageFileName) &&
        item.modelStatus !== 'ready' &&
        item.modelStatus !== 'rendering' &&
        item.modelStatus !== 'pending',
    )
    if (unfinished) {
      const backgroundFailed = unfinished.backgroundStatus === 'failed'
      resume = {
        title: unfinished.title,
        subtitle: backgroundFailed
          ? 'Background removal failed — 3D not built'
          : '2D image ready — 3D model not built yet',
        icon: '🔬',
        lastTouchedAt: unfinished.updatedAt,
      }
    }
  } catch {
    return c.json({ items: [], resume: null, generatedAt })
  }

  return c.json({ items, resume, generatedAt })
})

app.get('/api/library', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  await resumeRecoverableModelJobs(workspaceId)
  const generated = (await loadGenerated(workspaceId)).map((item) =>
    serializeGenerated(item, workspaceId),
  )
  const response: LibraryResponse = {
    categories: CATEGORIES,
    specimens: SPECIMENS,
    generated,
  }
  return c.json(response)
})

app.get('/api/explorations', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  await resumeRecoverableModelJobs(workspaceId)
  return c.json(
    (await loadGenerated(workspaceId)).map((item) =>
      serializeGenerated(item, workspaceId),
    ),
  )
})

app.get('/api/settings', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  return c.json(await loadSettings(workspaceId))
})

app.post('/api/settings', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  const parsed = settingsSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) {
    return c.json({ error: 'Invalid settings.' }, 400)
  }
  return c.json(await saveSettings(workspaceId, parsed.data))
})

app.post('/api/explorations/generate', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  const parsed = generateSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) {
    return c.json({ error: 'Prompt is required.' }, 400)
  }

  const exploration = await queueGeneration(workspaceId, parsed.data)
  const response: { exploration: GeneratedExploration } = {
    exploration: serializeGenerated(exploration, workspaceId),
  }
  return c.json(response, 202)
})

app.post('/api/explorations/:id/regenerate', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  const parsed = regenerateSchema
    .omit({ id: true })
    .safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) {
    return c.json({ error: 'Invalid regeneration options.' }, 400)
  }
  const exploration = await queueRegeneration(
    workspaceId,
    c.req.param('id'),
    parsed.data.modelProvider,
    parsed.data.quality,
  )
  if (!exploration) {
    return c.json({ error: 'Generated exploration not found.' }, 404)
  }

  const response: { exploration: GeneratedExploration } = {
    exploration: serializeGenerated(exploration, workspaceId),
  }
  return c.json(response, 202)
})

app.post('/api/explorations/:id/regenerate-model', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  const parsed = regenerateModelSchema
    .omit({ id: true })
    .safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) {
    return c.json({ error: 'Invalid model regeneration options.' }, 400)
  }
  const exploration = await queueModelRegeneration(
    workspaceId,
    c.req.param('id'),
    parsed.data.modelProvider,
    parsed.data.quality,
  )
  if (!exploration) {
    return c.json({ error: 'Generated exploration not found.' }, 404)
  }
  if (!exploration.imageFileName && !exploration.sourceImageFileName) {
    return c.json(
      { error: 'No 2D layer exists for this exploration yet.' },
      409,
    )
  }

  const response: { exploration: GeneratedExploration } = {
    exploration: serializeGenerated(exploration, workspaceId),
  }
  return c.json(response, 202)
})

app.post('/api/explorations/:id/retry-background', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  const parsed = regenerateModelSchema
    .omit({ id: true })
    .safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) {
    return c.json({ error: 'Invalid background retry options.' }, 400)
  }
  const exploration = await queueBackgroundRemovalRetry(
    workspaceId,
    c.req.param('id'),
    parsed.data.modelProvider,
    parsed.data.quality,
  )
  if (!exploration) {
    return c.json({ error: 'Generated exploration not found.' }, 404)
  }
  if (!exploration.sourceImageFileName) {
    return c.json(
      { error: 'No original image exists for this exploration.' },
      409,
    )
  }

  const response: { exploration: GeneratedExploration } = {
    exploration: serializeGenerated(exploration, workspaceId),
  }
  return c.json(response, 202)
})

app.post('/api/explorations/:id/model-provider', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  const parsed = modelProviderPreferenceSchema.safeParse(
    await c.req.json().catch(() => null),
  )
  if (!parsed.success) {
    return c.json({ error: 'Invalid model provider preference.' }, 400)
  }

  const exploration = await selectExplorationModelProvider(
    workspaceId,
    c.req.param('id'),
    parsed.data.modelProvider,
  )
  if (!exploration) {
    return c.json({ error: 'Generated exploration not found.' }, 404)
  }

  const response: { exploration: GeneratedExploration } = {
    exploration: serializeGenerated(exploration, workspaceId),
  }
  return c.json(response, 200)
})

app.post('/api/explorations/:id/cancel', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  const exploration = await cancelGeneration(workspaceId, c.req.param('id'))
  if (!exploration) {
    return c.json({ error: 'Generated exploration not found.' }, 404)
  }

  const response: { exploration: GeneratedExploration } = {
    exploration: serializeGenerated(exploration, workspaceId),
  }
  return c.json(response, 200)
})

app.post('/api/explorations/:id/move', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  const parsed = moveSchema
    .omit({ id: true })
    .safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) {
    return c.json({ error: 'A destination category is required.' }, 400)
  }

  const exploration = await moveExploration(
    workspaceId,
    c.req.param('id'),
    parsed.data.categoryId,
  )
  if (!exploration) {
    return c.json(
      { error: 'Generated exploration or category not found.' },
      404,
    )
  }

  const response: { exploration: GeneratedExploration } = {
    exploration: serializeGenerated(exploration, workspaceId),
  }
  return c.json(response, 200)
})

app.delete('/api/explorations/:id', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  const deleted = await deleteExploration(workspaceId, c.req.param('id'))
  if (!deleted) {
    return c.json({ error: 'Generated exploration not found.' }, 404)
  }
  return c.json({ ok: true }, 200)
})

app.post('/api/specimens/:id/generate', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  const parsed = materializeSchema
    .omit({ id: true })
    .safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) {
    return c.json({ error: 'Invalid specimen generation options.' }, 400)
  }

  const exploration = await queueSpecimenGeneration(
    workspaceId,
    c.req.param('id'),
    parsed.data.quality,
    parsed.data.modelProvider,
  )
  if (!exploration) {
    return c.json({ error: 'Specimen not found.' }, 404)
  }

  const response: { exploration: GeneratedExploration } = {
    exploration: serializeGenerated(exploration, workspaceId),
  }
  return c.json(response, 202)
})

app.get('/api/explorations/assets/:id/:fileName', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw, { allowQuery: true })
  const id = c.req.param('id')
  const fileName = c.req.param('fileName')

  try {
    const content = await readFile(assetPath(workspaceId, id, fileName))
    return new Response(content, {
      headers: {
        'Content-Type': contentTypeForFile(fileName),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return c.json({ error: 'Image asset not found.' }, 404)
  }
})

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  const request = rpcRequestSchema.safeParse(
    await c.req.json().catch(() => null),
  )
  if (!request.success) {
    return c.json(
      { ok: false, error: { message: 'Invalid RPC request.' } },
      400,
    )
  }

  if (request.data.method === 'microscope.list') {
    return c.json({
      ok: true,
      result: {
        categories: CATEGORIES,
        specimens: SPECIMENS,
        generated: (await loadGenerated(workspaceId)).map((item) =>
          serializeGenerated(item, workspaceId),
        ),
      },
    })
  }

  if (request.data.method === 'microscope.prompts') {
    return c.json({
      ok: true,
      result: {
        prompts: samplePrompts(),
        categories: CATEGORIES.map(({ id, name, description, scale }) => ({
          id,
          name,
          description,
          scale,
        })),
      },
    })
  }

  if (request.data.method === 'microscope.settings') {
    return c.json({
      ok: true,
      result: await loadSettings(workspaceId),
    })
  }

  if (request.data.method === 'microscope.updateSettings') {
    const parsed = settingsSchema.safeParse(request.data.params)
    if (!parsed.success) {
      return c.json(
        { ok: false, error: { message: 'Invalid Microscope settings.' } },
        400,
      )
    }
    return c.json({
      ok: true,
      result: await saveSettings(workspaceId, parsed.data),
    })
  }

  if (request.data.method === 'microscope.generate') {
    const parsed = generateSchema.safeParse(request.data.params)
    if (!parsed.success) {
      return c.json(
        { ok: false, error: { message: 'Prompt is required.' } },
        400,
      )
    }
    return c.json({
      ok: true,
      result: serializeGenerated(
        await queueGeneration(workspaceId, parsed.data),
        workspaceId,
      ),
    })
  }

  if (request.data.method === 'microscope.regenerate') {
    const parsed = regenerateSchema.safeParse(request.data.params)
    if (!parsed.success) {
      return c.json(
        {
          ok: false,
          error: { message: 'Generated exploration id is required.' },
        },
        400,
      )
    }
    const exploration = await queueRegeneration(
      workspaceId,
      parsed.data.id,
      parsed.data.modelProvider,
      parsed.data.quality,
    )
    if (!exploration) {
      return c.json(
        { ok: false, error: { message: 'Generated exploration not found.' } },
        404,
      )
    }
    return c.json({
      ok: true,
      result: serializeGenerated(exploration, workspaceId),
    })
  }

  if (request.data.method === 'microscope.regenerateModel') {
    const parsed = regenerateModelSchema.safeParse(request.data.params)
    if (!parsed.success) {
      return c.json(
        {
          ok: false,
          error: { message: 'Generated exploration id is required.' },
        },
        400,
      )
    }
    const exploration = await queueModelRegeneration(
      workspaceId,
      parsed.data.id,
      parsed.data.modelProvider,
      parsed.data.quality,
    )
    if (!exploration) {
      return c.json(
        { ok: false, error: { message: 'Generated exploration not found.' } },
        404,
      )
    }
    if (!exploration.imageFileName && !exploration.sourceImageFileName) {
      return c.json(
        {
          ok: false,
          error: { message: 'No 2D layer exists for this exploration yet.' },
        },
        409,
      )
    }
    return c.json({
      ok: true,
      result: serializeGenerated(exploration, workspaceId),
    })
  }

  if (request.data.method === 'microscope.retryBackground') {
    const parsed = regenerateModelSchema.safeParse(request.data.params)
    if (!parsed.success) {
      return c.json(
        {
          ok: false,
          error: { message: 'Generated exploration id is required.' },
        },
        400,
      )
    }
    const exploration = await queueBackgroundRemovalRetry(
      workspaceId,
      parsed.data.id,
      parsed.data.modelProvider,
      parsed.data.quality,
    )
    if (!exploration) {
      return c.json(
        { ok: false, error: { message: 'Generated exploration not found.' } },
        404,
      )
    }
    if (!exploration.sourceImageFileName) {
      return c.json(
        {
          ok: false,
          error: { message: 'No original image exists for this exploration.' },
        },
        409,
      )
    }
    return c.json({
      ok: true,
      result: serializeGenerated(exploration, workspaceId),
    })
  }

  if (request.data.method === 'microscope.cancel') {
    const parsed = cancelSchema.safeParse(request.data.params)
    if (!parsed.success) {
      return c.json(
        {
          ok: false,
          error: { message: 'Generated exploration id is required.' },
        },
        400,
      )
    }
    const exploration = await cancelGeneration(workspaceId, parsed.data.id)
    if (!exploration) {
      return c.json(
        { ok: false, error: { message: 'Generated exploration not found.' } },
        404,
      )
    }
    return c.json({
      ok: true,
      result: serializeGenerated(exploration, workspaceId),
    })
  }

  if (request.data.method === 'microscope.materialize') {
    const parsed = materializeSchema.safeParse(request.data.params)
    if (!parsed.success) {
      return c.json(
        { ok: false, error: { message: 'Specimen id is required.' } },
        400,
      )
    }
    const exploration = await queueSpecimenGeneration(
      workspaceId,
      parsed.data.id,
      parsed.data.quality,
      parsed.data.modelProvider,
    )
    if (!exploration) {
      return c.json(
        { ok: false, error: { message: 'Specimen not found.' } },
        404,
      )
    }
    return c.json({
      ok: true,
      result: serializeGenerated(exploration, workspaceId),
    })
  }

  return c.json(
    { ok: false, error: { message: `Unknown method: ${request.data.method}` } },
    404,
  )
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
