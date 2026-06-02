import {
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { type Plant, dueState } from '../lib/types'
import { generateCareProfile, identifyPlantImage } from './llm'
import { persistImagePath, registerMediaRoutes } from './media'
import { Hono } from 'hono'
import type { Context } from 'hono'
import { cors } from 'hono/cors'
import { basename } from 'node:path'
import { z } from 'zod'

export const app = new Hono()

app.use('/api/*', cors())

registerMediaRoutes(app)

const WATER_HISTORY_CAP = 50

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function getPlantsPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'plants.json')
}

async function loadPlantsRaw(workspaceId?: string): Promise<Plant[]> {
  await ensureDir(getAppDataDir(workspaceId))
  const plants = await readJson<Plant[] | null>(
    getPlantsPath(workspaceId),
    null,
  )
  // Start with an empty library — no demo data.
  if (plants === null) {
    await writeJson(getPlantsPath(workspaceId), [])
    return []
  }
  return plants
}

async function normalizeLoadedPlants(
  plants: Plant[],
  workspaceId?: string,
): Promise<{ plants: Plant[]; changed: boolean }> {
  let changed = false
  const normalized = await Promise.all(
    plants.map(async (plant) => {
      if (!plant.heroImageUrl?.startsWith('/')) return plant
      const heroImageUrl = await normalizeHeroImagePath(
        plant.heroImageUrl,
        workspaceId,
      )
      if (!heroImageUrl || heroImageUrl === plant.heroImageUrl) return plant
      changed = true
      return {
        ...plant,
        heroImageUrl,
        updatedAt: new Date().toISOString(),
      }
    }),
  )
  return { plants: normalized, changed }
}

async function loadPlants(workspaceId?: string): Promise<Plant[]> {
  return withPlantsWriteLock(workspaceId, async () => {
    const rawPlants = await loadPlantsRaw(workspaceId)
    const { plants, changed } = await normalizeLoadedPlants(
      rawPlants,
      workspaceId,
    )
    if (changed) await savePlants(plants, workspaceId)
    return plants
  })
}

async function savePlants(
  plants: Plant[],
  workspaceId?: string,
): Promise<void> {
  await ensureDir(getAppDataDir(workspaceId))
  await writeJson(getPlantsPath(workspaceId), plants)
}

const PLANTS_LOCK_SHARED = '__shared__'
const plantWriteLocks = new Map<string, Promise<void>>()

async function withPlantsWriteLock<T>(
  workspaceId: string | undefined,
  operation: () => Promise<T>,
): Promise<T> {
  const key = workspaceId ?? PLANTS_LOCK_SHARED
  const previous = plantWriteLocks.get(key) ?? Promise.resolve()
  let releaseCurrent!: () => void
  const current = new Promise<void>((resolve) => {
    releaseCurrent = resolve
  })
  const next = previous.catch(() => undefined).then(() => current)
  plantWriteLocks.set(key, next)

  await previous.catch(() => undefined)

  try {
    return await operation()
  } finally {
    releaseCurrent()
    if (plantWriteLocks.get(key) === next) {
      plantWriteLocks.delete(key)
    }
  }
}

async function mutatePlants<T>(
  workspaceId: string | undefined,
  mutator: (plants: Plant[]) => Promise<T> | T,
): Promise<T> {
  return withPlantsWriteLock(workspaceId, async () => {
    const rawPlants = await loadPlantsRaw(workspaceId)
    const { plants } = await normalizeLoadedPlants(rawPlants, workspaceId)
    const result = await mutator(plants)
    await savePlants(plants, workspaceId)
    return result
  })
}

function getRpcWorkspaceId(request: Request): string | undefined {
  return (
    request.headers.get('x-moldable-workspace-id') ??
    getWorkspaceFromRequest(request)
  )
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const rpcRequestSchema = z.object({
  method: z.string(),
  params: z.unknown().optional(),
})

const idCandidateSchema = z.object({
  name: z.string(),
  commonName: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
})

const identificationSchema = z.object({
  confidence: z.number().min(0).max(1).optional(),
  source: z.enum(['chat', 'manual', 'vision']).optional(),
  candidates: z.array(idCandidateSchema).optional(),
  confirmedAt: z.string().datetime().optional(),
  inaturalistUrl: z.string().optional(),
  wikipediaUrl: z.string().optional(),
})

const intervalDaysSchema = z.number().int().min(1).max(365)
const amountMlSchema = z.number().int().min(1).max(10_000)

const careWaterSchema = z.object({
  intervalDays: intervalDaysSchema.optional(),
  amountMl: amountMlSchema.optional(),
  method: z.string().optional(),
  notes: z.string().optional(),
})

const careFeedingSchema = z.object({
  intervalDays: intervalDaysSchema.optional(),
  fertilizer: z.string().optional(),
  season: z.string().optional(),
  notes: z.string().optional(),
})

const careSchema = z.object({
  summary: z.string().optional(),
  light: z.string().optional(),
  water: careWaterSchema.optional(),
  humidity: z.string().optional(),
  temperatureF: z
    .object({ min: z.number().optional(), max: z.number().optional() })
    .optional(),
  soil: z.string().optional(),
  feeding: careFeedingSchema.optional(),
  toxicity: z.string().optional(),
  commonProblems: z.array(z.string()).optional(),
  careMarkdown: z.string().optional(),
  generatedAt: z.string().datetime().optional(),
  model: z.string().optional(),
})

const plantsListParamsSchema = z
  .object({
    room: z.string().optional(),
    query: z.string().optional(),
    favoriteOnly: z.boolean().optional(),
    dueOnly: z.boolean().optional(),
    includeDeleted: z.boolean().optional(),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .optional()

const plantGetParamsSchema = z.object({ id: z.string().min(1) })

const plantCreateParamsSchema = z.object({
  commonName: z.string().min(1),
  scientificName: z.string().optional(),
  family: z.string().optional(),
  nickname: z.string().optional(),
  room: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  light: z.string().optional(),
  heroImagePath: z.string().optional(),
  waterIntervalDays: intervalDaysSchema.optional(),
  identification: identificationSchema.optional(),
  care: careSchema.optional(),
})

const plantIdentifyAndCreateParamsSchema = z.object({
  commonName: z.string().min(1),
  scientificName: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  candidates: z.array(idCandidateSchema).optional(),
  heroImagePath: z.string().optional(),
  room: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
})

const plantIdentifyFromImageParamsSchema = z.object({
  heroImagePath: z.string().min(1),
  imagePath: z.string().min(1).optional(),
  room: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
})

const plantUpdateParamsSchema = z.object({
  id: z.string().min(1),
  commonName: z.string().min(1).optional(),
  scientificName: z.string().optional(),
  family: z.string().optional(),
  nickname: z.string().optional(),
  heroImageUrl: z.string().optional(),
  room: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  light: z.string().optional(),
  care: careSchema.optional(),
  waterIntervalDays: intervalDaysSchema.optional(),
  lastWateredAt: z.string().datetime().optional(),
  identification: identificationSchema.optional(),
  isFavorite: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
})

const plantWaterParamsSchema = z.object({
  id: z.string().min(1),
  at: z.string().datetime().optional(),
})

const plantWaterBodySchema = z.object({
  at: z.string().datetime().optional(),
})

const plantFavoriteParamsSchema = z.object({
  id: z.string().min(1),
  isFavorite: z.boolean(),
})

const plantDeleteParamsSchema = z.object({ id: z.string().min(1) })

const plantGenerateCareParamsSchema = z.object({ id: z.string().min(1) })

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function filterPlants(
  plants: Plant[],
  params: z.infer<typeof plantsListParamsSchema>,
) {
  let result = [...plants]

  if (!params?.includeDeleted) {
    result = result.filter((plant) => !plant.isDeleted)
  }
  if (params?.favoriteOnly) {
    result = result.filter((plant) => plant.isFavorite)
  }
  if (params?.room?.trim()) {
    const room = params.room.toLowerCase()
    result = result.filter((plant) => plant.room?.toLowerCase() === room)
  }
  if (params?.dueOnly) {
    result = result.filter((plant) => {
      const state = dueState(plant)
      return state === 'overdue' || state === 'today'
    })
  }
  if (params?.query?.trim()) {
    const query = params.query.toLowerCase()
    result = result.filter((plant) =>
      [
        plant.commonName,
        plant.scientificName,
        plant.family,
        plant.nickname,
        plant.room,
        plant.location,
        plant.notes,
      ]
        .filter(Boolean)
        .join('\n')
        .toLowerCase()
        .includes(query),
    )
  }

  return result
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, params?.limit ?? 100)
}

function applyCareDefaults(plant: Plant): void {
  // If the effective interval is unset, seed it from the generated care.
  if (
    (plant.waterIntervalDays === undefined ||
      plant.waterIntervalDays === null) &&
    plant.care?.water?.intervalDays
  ) {
    plant.waterIntervalDays = plant.care.water.intervalDays
  }
}

async function normalizeHeroImagePath(
  heroImagePath: string | undefined,
  workspaceId?: string,
): Promise<string | undefined> {
  if (!heroImagePath?.trim()) return undefined
  if (heroImagePath.startsWith('/assets/')) {
    return heroImagePath.slice(1)
  }
  if (!heroImagePath.startsWith('/')) return heroImagePath
  try {
    const imported = await persistImagePath(workspaceId, heroImagePath)
    return imported.path
  } catch (error) {
    console.error('Failed to import hero image path:', error)
    return heroImagePath
  }
}

function imagePathForIdentification(
  params: z.infer<typeof plantIdentifyFromImageParamsSchema>,
  workspaceId?: string,
): string {
  const candidate = params.imagePath ?? params.heroImagePath
  if (candidate.startsWith('/')) return candidate
  return safePath(getAppDataDir(workspaceId), 'assets', basename(candidate))
}

// ---------------------------------------------------------------------------
// iNaturalist + Wikipedia identification confirmation (free, no key)
// ---------------------------------------------------------------------------

type InatMatch = {
  name: string
  commonName?: string
  photo?: string
  wikipediaUrl?: string
}

type WikiSummary = {
  title: string
  extract: string
  thumbnail?: string
}

async function fetchInaturalist(name: string): Promise<InatMatch[]> {
  try {
    const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(
      name,
    )}&per_page=6&rank=species,genus`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const body = (await res.json()) as {
      results?: Array<{
        name?: string
        preferred_common_name?: string
        default_photo?: { medium_url?: string }
        wikipedia_url?: string
      }>
    }
    const results = Array.isArray(body.results) ? body.results : []
    return results
      .filter((r) => typeof r.name === 'string')
      .map((r) => ({
        name: r.name as string,
        commonName: r.preferred_common_name,
        photo: r.default_photo?.medium_url,
        wikipediaUrl: r.wikipedia_url,
      }))
  } catch {
    return []
  }
}

async function fetchWikipedia(name: string): Promise<WikiSummary | undefined> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      name,
    )}`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return undefined
    const body = (await res.json()) as {
      title?: string
      extract?: string
      thumbnail?: { source?: string }
    }
    if (!body.title || !body.extract) return undefined
    return {
      title: body.title,
      extract: body.extract,
      thumbnail: body.thumbnail?.source,
    }
  } catch {
    return undefined
  }
}

// ---------------------------------------------------------------------------
// Routes: health, commands, today
// ---------------------------------------------------------------------------

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null

  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'plants',
      port,
      status: 'ok',
      ts: Date.now(),
    },
    200,
    { 'Cache-Control': 'no-store' },
  )
})

app.get('/api/moldable/commands', (c) => {
  return c.json({
    commands: [
      { id: 'add-plant', title: 'Add plant', icon: '🪴' },
      { id: 'water-due', title: 'Water due', icon: '💧' },
      { id: 'search', title: 'Search', icon: '🔍' },
      { id: 'refresh', title: 'Refresh', icon: '↻' },
    ],
  })
})

app.get('/api/moldable/today', async (c) => {
  // Build plain objects (the installed @moldable-ai/ui predates the Today*
  // types). Quiet by default: only surface watering that is due or overdue.
  const items: unknown[] = []
  const resume: unknown = null
  const generatedAt = new Date().toISOString()

  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const plants = (await loadPlants(workspaceId)).filter((p) => !p.isDeleted)
    const now = new Date()

    const due = plants.filter((p) => {
      const state = dueState(p, now)
      return state === 'overdue' || state === 'today'
    })

    if (due.length === 0) {
      return c.json({ items: [], resume: null, generatedAt })
    }

    if (due.length === 1) {
      const plant = due[0]!
      const state = dueState(plant, now)
      const subtitleParts = [plant.room, plant.location].filter(
        (part): part is string => Boolean(part && part.trim()),
      )
      if (state === 'overdue') {
        const nextDue = plant.lastWateredAt ?? plant.createdAt
        // Rough overdue-by in days based on the due date.
        const dueDate =
          new Date(nextDue).getTime() +
          (plant.waterIntervalDays ?? 0) * 24 * 60 * 60 * 1000
        const overdueDays = Math.max(
          1,
          Math.round((now.getTime() - dueDate) / (24 * 60 * 60 * 1000)),
        )
        subtitleParts.push(
          `overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`,
        )
      } else {
        subtitleParts.push('due today')
      }

      items.push({
        kind: 'timely',
        priority: 80,
        icon: '🪴',
        title: plant.commonName,
        subtitle: subtitleParts.join(' · '),
        actions: [
          {
            type: 'rpc',
            label: 'Water',
            method: 'plants.water',
            params: { id: plant.id },
          },
          { type: 'open-app', label: 'Open', deepLink: `plant:${plant.id}` },
        ],
      })
    } else {
      items.push({
        kind: 'threshold',
        priority: 75,
        icon: '🪴',
        title: `${due.length} plants need water`,
        subtitle: 'Tap to review and water them.',
        actions: [{ type: 'open-app', label: 'Open' }],
      })
    }
  } catch (error) {
    console.error('Failed to build Today view:', error)
    return c.json({ items: [], resume: null, generatedAt })
  }

  return c.json({ items, resume, generatedAt })
})

// ---------------------------------------------------------------------------
// REST routes
// ---------------------------------------------------------------------------

app.get('/api/plants', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const includeDeleted = c.req.query('includeDeleted') === 'true'
    const plants = await loadPlants(workspaceId)
    const result = includeDeleted ? plants : plants.filter((p) => !p.isDeleted)
    return c.json(result)
  } catch (error) {
    console.error('Failed to read plants:', error)
    return c.json({ error: 'Failed to read plants' }, 500)
  }
})

app.post('/api/plants', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const params = plantCreateParamsSchema.parse(await c.req.json())
    const plant = await createPlant(params, workspaceId)
    return c.json(plant, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid plant', detail: error.flatten() }, 400)
    }
    console.error('Failed to create plant:', error)
    return c.json({ error: 'Failed to create plant' }, 500)
  }
})

app.post('/api/plants/identify-from-image', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const params = plantIdentifyFromImageParamsSchema.parse(await c.req.json())
    const imagePath = imagePathForIdentification(params, workspaceId)
    const identification = await identifyPlantImage(imagePath, workspaceId)
    if (!identification) {
      return c.json({ error: 'Failed to identify plant from image' }, 502)
    }

    const plant = await identifyAndCreatePlant(
      {
        commonName: identification.commonName,
        scientificName: identification.scientificName,
        confidence: identification.confidence,
        candidates: identification.candidates,
        heroImagePath: params.heroImagePath,
        room: params.room,
        location: params.location,
        notes: params.notes ?? identification.notes,
      },
      workspaceId,
      {
        family: identification.family,
        source: 'vision',
      },
    )
    return c.json(plant, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        { error: 'Invalid image identification', detail: error.flatten() },
        400,
      )
    }
    console.error('Failed to identify plant image:', error)
    return c.json({ error: 'Failed to identify plant from image' }, 500)
  }
})

app.get('/api/plants/identify-confirm', async (c) => {
  const name = c.req.query('name')
  if (!name?.trim()) {
    return c.json({ inaturalist: [], wikipedia: undefined })
  }
  const [inaturalist, wikipedia] = await Promise.all([
    fetchInaturalist(name),
    fetchWikipedia(name),
  ])
  return c.json({ inaturalist, wikipedia })
})

app.get('/api/plants/:id', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const plants = await loadPlants(workspaceId)
  const plant = plants.find((p) => p.id === c.req.param('id'))
  if (!plant) return c.json({ error: 'Plant not found' }, 404)
  return c.json(plant)
})

app.patch('/api/plants/:id', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const params = plantUpdateParamsSchema.parse({
      ...(await c.req.json()),
      id: c.req.param('id'),
    })
    const plant = await updatePlant(params, workspaceId)
    if (!plant) return c.json({ error: 'Plant not found' }, 404)
    return c.json(plant)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid update', detail: error.flatten() }, 400)
    }
    console.error('Failed to update plant:', error)
    return c.json({ error: 'Failed to update plant' }, 500)
  }
})

app.delete('/api/plants/:id', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const plant = await softDeletePlant(c.req.param('id'), workspaceId)
  if (!plant) return c.json({ error: 'Plant not found' }, 404)
  return c.json(plant)
})

app.post('/api/plants/:id/water', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const body = plantWaterBodySchema.parse(
      await c.req.json().catch(() => ({})),
    )
    const plant = await waterPlant(c.req.param('id'), body.at, workspaceId)
    if (!plant) return c.json({ error: 'Plant not found' }, 404)
    return c.json(plant)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        { error: 'Invalid watering timestamp', detail: error.flatten() },
        400,
      )
    }
    console.error('Failed to water plant:', error)
    return c.json({ error: 'Failed to water plant' }, 500)
  }
})

app.post('/api/plants/:id/generate-care', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const plant = await regenerateCare(c.req.param('id'), workspaceId)
  if (!plant) return c.json({ error: 'Plant not found' }, 404)
  return c.json(plant)
})

// ---------------------------------------------------------------------------
// Shared mutation helpers (used by REST + RPC)
// ---------------------------------------------------------------------------

async function createPlant(
  params: z.infer<typeof plantCreateParamsSchema>,
  workspaceId?: string,
): Promise<Plant> {
  const now = new Date().toISOString()
  const heroImagePath = await normalizeHeroImagePath(
    params.heroImagePath,
    workspaceId,
  )
  const plant: Plant = {
    id: crypto.randomUUID(),
    commonName: params.commonName,
    scientificName: params.scientificName,
    family: params.family,
    nickname: params.nickname,
    heroImageUrl: heroImagePath,
    room: params.room,
    location: params.location,
    notes: params.notes,
    light: params.light,
    care: params.care,
    waterIntervalDays: params.waterIntervalDays,
    identification: params.identification,
    isFavorite: false,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  }

  // Auto-generate care if it was not supplied. Tolerant of a missing AI server.
  if (!plant.care) {
    const care = await generateCareProfile(plant, workspaceId)
    if (care) plant.care = care
  }
  applyCareDefaults(plant)

  return mutatePlants(workspaceId, (plants) => {
    plants.unshift(plant)
    return plant
  })
}

async function identifyAndCreatePlant(
  params: z.infer<typeof plantIdentifyAndCreateParamsSchema>,
  workspaceId?: string,
  options?: { family?: string; source?: 'chat' | 'manual' | 'vision' },
): Promise<Plant> {
  const now = new Date().toISOString()
  const heroImagePath = await normalizeHeroImagePath(
    params.heroImagePath,
    workspaceId,
  )
  const plant: Plant = {
    id: crypto.randomUUID(),
    commonName: params.commonName,
    scientificName: params.scientificName,
    family: options?.family,
    heroImageUrl: heroImagePath,
    room: params.room,
    location: params.location,
    notes: params.notes,
    identification: {
      source: options?.source ?? 'chat',
      confidence: params.confidence,
      candidates: params.candidates,
      confirmedAt: now,
    },
    isFavorite: false,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  }

  const care = await generateCareProfile(plant, workspaceId)
  if (care) plant.care = care
  applyCareDefaults(plant)

  return mutatePlants(workspaceId, (plants) => {
    plants.unshift(plant)
    return plant
  })
}

async function updatePlant(
  params: z.infer<typeof plantUpdateParamsSchema>,
  workspaceId?: string,
): Promise<Plant | null> {
  const heroImageUrl =
    'heroImageUrl' in params
      ? await normalizeHeroImagePath(params.heroImageUrl, workspaceId)
      : undefined

  return mutatePlants(workspaceId, (plants) => {
    const index = plants.findIndex((p) => p.id === params.id)
    if (index === -1) return null

    const existing = plants[index]!
    const updated: Plant = {
      ...existing,
      ...('commonName' in params ? { commonName: params.commonName } : {}),
      ...('scientificName' in params
        ? { scientificName: params.scientificName }
        : {}),
      ...('family' in params ? { family: params.family } : {}),
      ...('nickname' in params ? { nickname: params.nickname } : {}),
      ...('heroImageUrl' in params ? { heroImageUrl } : {}),
      ...('room' in params ? { room: params.room } : {}),
      ...('location' in params ? { location: params.location } : {}),
      ...('notes' in params ? { notes: params.notes } : {}),
      ...('light' in params ? { light: params.light } : {}),
      ...('care' in params ? { care: params.care } : {}),
      ...('waterIntervalDays' in params
        ? { waterIntervalDays: params.waterIntervalDays }
        : {}),
      ...('lastWateredAt' in params
        ? { lastWateredAt: params.lastWateredAt }
        : {}),
      ...('identification' in params
        ? { identification: params.identification }
        : {}),
      ...('isFavorite' in params ? { isFavorite: params.isFavorite } : {}),
      ...('isDeleted' in params ? { isDeleted: params.isDeleted } : {}),
      updatedAt: new Date().toISOString(),
    } as Plant

    plants[index] = updated
    return updated
  })
}

async function softDeletePlant(
  id: string,
  workspaceId?: string,
): Promise<Plant | null> {
  return mutatePlants(workspaceId, (plants) => {
    const index = plants.findIndex((p) => p.id === id)
    if (index === -1) return null
    plants[index] = {
      ...plants[index]!,
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    }
    return plants[index]!
  })
}

async function waterPlant(
  id: string,
  at?: string,
  workspaceId?: string,
): Promise<Plant | null> {
  return mutatePlants(workspaceId, (plants) => {
    const index = plants.findIndex((p) => p.id === id)
    if (index === -1) return null
    const existing = plants[index]!
    const wateredAt = at ?? new Date().toISOString()
    const history = [...(existing.waterHistory ?? []), { at: wateredAt }].slice(
      -WATER_HISTORY_CAP,
    )
    plants[index] = {
      ...existing,
      lastWateredAt: wateredAt,
      waterHistory: history,
      updatedAt: new Date().toISOString(),
    }
    return plants[index]!
  })
}

async function regenerateCare(
  id: string,
  workspaceId?: string,
): Promise<Plant | null> {
  const plants = await loadPlants(workspaceId)
  const index = plants.findIndex((p) => p.id === id)
  if (index === -1) return null
  const existing = plants[index]!
  const care = await generateCareProfile(existing, workspaceId)
  return mutatePlants(workspaceId, (latestPlants) => {
    const latestIndex = latestPlants.findIndex((p) => p.id === id)
    if (latestIndex === -1) return null
    const latest = latestPlants[latestIndex]!
    if (!care) {
      // AI server unavailable — leave existing care, just touch updatedAt.
      latestPlants[latestIndex] = {
        ...latest,
        updatedAt: new Date().toISOString(),
      }
      return latestPlants[latestIndex]!
    }
    const updated: Plant = {
      ...latest,
      care,
      updatedAt: new Date().toISOString(),
    }
    applyCareDefaults(updated)
    latestPlants[latestIndex] = updated
    return updated
  })
}

// ---------------------------------------------------------------------------
// RPC
// ---------------------------------------------------------------------------

function notFound(c: Context, id: string) {
  return c.json(
    {
      ok: false,
      error: {
        code: 'plant_not_found',
        message: `Plant ${id} was not found.`,
      },
    },
    404,
  )
}

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getRpcWorkspaceId(c.req.raw)

  try {
    const body = rpcRequestSchema.parse(await c.req.json())

    if (body.method === 'plants.list') {
      const params = plantsListParamsSchema.parse(body.params)
      const plants = await loadPlants(workspaceId)
      return c.json({ ok: true, result: filterPlants(plants, params) })
    }

    if (body.method === 'plants.get') {
      const params = plantGetParamsSchema.parse(body.params)
      const plants = await loadPlants(workspaceId)
      const plant = plants.find((p) => p.id === params.id)
      if (!plant) return notFound(c, params.id)
      return c.json({ ok: true, result: plant })
    }

    if (body.method === 'plants.create') {
      const params = plantCreateParamsSchema.parse(body.params)
      const plant = await createPlant(params, workspaceId)
      return c.json({ ok: true, result: plant })
    }

    if (body.method === 'plants.identifyAndCreate') {
      const params = plantIdentifyAndCreateParamsSchema.parse(body.params)
      const plant = await identifyAndCreatePlant(params, workspaceId)
      return c.json({ ok: true, result: plant })
    }

    if (body.method === 'plants.update') {
      const params = plantUpdateParamsSchema.parse(body.params)
      const plant = await updatePlant(params, workspaceId)
      if (!plant) return notFound(c, params.id)
      return c.json({ ok: true, result: plant })
    }

    if (body.method === 'plants.water') {
      const params = plantWaterParamsSchema.parse(body.params)
      const plant = await waterPlant(params.id, params.at, workspaceId)
      if (!plant) return notFound(c, params.id)
      return c.json({ ok: true, result: plant })
    }

    if (body.method === 'plants.generateCare') {
      const params = plantGenerateCareParamsSchema.parse(body.params)
      const plant = await regenerateCare(params.id, workspaceId)
      if (!plant) return notFound(c, params.id)
      return c.json({ ok: true, result: plant })
    }

    if (body.method === 'plants.favorite') {
      const params = plantFavoriteParamsSchema.parse(body.params)
      const plant = await updatePlant(
        { id: params.id, isFavorite: params.isFavorite },
        workspaceId,
      )
      if (!plant) return notFound(c, params.id)
      return c.json({ ok: true, result: plant })
    }

    if (body.method === 'plants.delete') {
      const params = plantDeleteParamsSchema.parse(body.params)
      const plant = await softDeletePlant(params.id, workspaceId)
      if (!plant) return notFound(c, params.id)
      return c.json({ ok: true, result: plant })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Plants does not expose ${body.method}.`,
        },
      },
      404,
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_params',
            message: 'Plants received invalid RPC parameters.',
            detail: error.flatten(),
          },
        },
        400,
      )
    }

    console.error('Plants RPC failed:', error)
    return c.json(
      {
        ok: false,
        error: {
          code: 'plants_rpc_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Plants could not complete the request.',
        },
      },
      500,
    )
  }
})
