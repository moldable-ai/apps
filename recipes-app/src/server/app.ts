import {
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { DEMO_RECIPES } from '../lib/demo-data'
import type { Recipe } from '../lib/types'
import { pruneRecipeFromFolders, registerFolderRoutes } from './folders'
import { registerMediaRoutes } from './media'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'

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

registerFolderRoutes(app)
registerMediaRoutes(app)

const rpcRequestSchema = z.object({
  method: z.string(),
  params: z.unknown().optional(),
})

const nonEmptyStringSchema = z.string().trim().min(1)

const recipesListParamsSchema = z
  .object({
    query: z.string().optional(),
    category: z.string().optional(),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
    favoriteOnly: z.boolean().optional(),
    includeDeleted: z.boolean().optional(),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .optional()

const recipeGetParamsSchema = z.object({
  id: nonEmptyStringSchema,
})

const recipeCreateParamsSchema = z.object({
  title: nonEmptyStringSchema,
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  ingredients: z.array(z.string()).optional(),
  instructions: z.string().optional(),
  category: z.string().optional(),
  cookingTime: z.string().optional(),
  prepTime: z.string().optional(),
  servings: z.string().optional(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
  sourceUrl: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isFavorite: z.boolean().optional(),
})

const recipeUpdateParamsSchema = recipeCreateParamsSchema.partial().extend({
  id: nonEmptyStringSchema,
  isDeleted: z.boolean().optional(),
})

const savedRecipeSchema = z.object({
  id: nonEmptyStringSchema,
  title: nonEmptyStringSchema,
  description: z.string(),
  imageUrl: z.string().optional(),
  ingredients: z.array(z.string()),
  instructions: z.string(),
  category: z.string(),
  cookingTime: z.string().optional(),
  prepTime: z.string().optional(),
  servings: z.string().optional(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
  sourceUrl: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isFavorite: z.boolean(),
  isDeleted: z.boolean(),
  createdAt: nonEmptyStringSchema,
  updatedAt: nonEmptyStringSchema,
}) satisfies z.ZodType<Recipe>

const savedRecipesSchema = z.array(savedRecipeSchema)

function getRecipesPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'recipes.json')
}

async function loadRecipes(workspaceId?: string): Promise<Recipe[]> {
  await ensureDir(getAppDataDir(workspaceId))
  const recipes = await readJson<unknown | null>(
    getRecipesPath(workspaceId),
    null,
  )

  if (recipes === null) {
    await writeJson(getRecipesPath(workspaceId), DEMO_RECIPES)
    return DEMO_RECIPES
  }

  return savedRecipesSchema.parse(recipes)
}

async function saveRecipes(
  recipes: Recipe[],
  workspaceId?: string,
): Promise<void> {
  await ensureDir(getAppDataDir(workspaceId))
  await writeJson(getRecipesPath(workspaceId), recipes)
}

function getRpcWorkspaceId(request: Request): string | undefined {
  return (
    request.headers.get('x-moldable-workspace-id') ??
    getWorkspaceFromRequest(request)
  )
}

function filterRecipes(
  recipes: Recipe[],
  params: z.infer<typeof recipesListParamsSchema>,
) {
  let result = [...recipes]

  if (!params?.includeDeleted) {
    result = result.filter((recipe) => !recipe.isDeleted)
  }
  if (params?.favoriteOnly) {
    result = result.filter((recipe) => recipe.isFavorite)
  }
  if (params?.category?.trim()) {
    const category = params.category.toLowerCase()
    result = result.filter((recipe) =>
      recipe.category.toLowerCase().includes(category),
    )
  }
  if (params?.difficulty) {
    result = result.filter((recipe) => recipe.difficulty === params.difficulty)
  }
  if (params?.query?.trim()) {
    const query = params.query.toLowerCase()
    result = result.filter((recipe) =>
      [
        recipe.title,
        recipe.description,
        recipe.category,
        recipe.cookingTime,
        recipe.difficulty,
        ...recipe.ingredients,
        recipe.instructions,
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

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null

  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'recipes-app',
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
  // Typed loosely on purpose: the installed @moldable-ai/ui predates the
  // Today* types, so we build plain objects here.
  const items: unknown[] = []
  let resume: unknown = null
  const generatedAt = new Date().toISOString()

  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const recipes = (await loadRecipes(workspaceId)).filter(
      (recipe) => !recipe.isDeleted,
    )

    // This app stores only recipes — there is no meal-plan, grocery-list, or
    // timer state to read. Without a planned-for-today meal there is nothing
    // time-sensitive to surface, so we emit no items (no recipe lists, no
    // counts, no empty-state nags). We stay completely quiet by default.
    //
    // The one durable, non-noisy signal is "pick up where you left off": the
    // recipe the user was actually working on. We only surface it when it is
    // (a) a real recipe the user added/edited — not the bundled demo set, which
    // would otherwise nag on every fresh install — and (b) touched recently
    // enough to still be live work rather than a stale entry.
    const RESUME_WINDOW_MS = 14 * 24 * 60 * 60 * 1000
    const now = Date.now()

    const mostRecent = recipes
      .filter((recipe) => !recipe.id.startsWith('demo-'))
      .filter(
        (recipe) =>
          now - new Date(recipe.updatedAt).getTime() <= RESUME_WINDOW_MS,
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )[0]

    if (mostRecent) {
      const subtitleParts = [
        mostRecent.category,
        mostRecent.cookingTime,
      ].filter((part): part is string => Boolean(part && part.trim()))

      resume = {
        title: mostRecent.title,
        subtitle:
          subtitleParts.length > 0 ? subtitleParts.join(' · ') : undefined,
        icon: '🍳',
        deepLink: `recipe:${mostRecent.id}`,
        lastTouchedAt: mostRecent.updatedAt,
      }
    }
  } catch (error) {
    console.error('Failed to build Today view:', error)
    return c.json({ items: [], resume: null, generatedAt })
  }

  return c.json({ items, resume, generatedAt })
})

app.get('/api/recipes', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const recipes = await loadRecipes(workspaceId)
    return c.json(recipes)
  } catch (error) {
    console.error('Failed to read recipes:', error)
    return c.json({ error: 'Failed to read recipes' }, 500)
  }
})

app.post('/api/recipes', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const recipes = savedRecipesSchema.parse(await c.req.json())
    await saveRecipes(recipes, workspaceId)
    return c.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: 'Invalid recipes payload',
          detail: error.flatten(),
        },
        400,
      )
    }
    console.error('Failed to save recipes:', error)
    return c.json({ error: 'Failed to save recipes' }, 500)
  }
})

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getRpcWorkspaceId(c.req.raw)

  try {
    const body = rpcRequestSchema.parse(await c.req.json())
    const recipes = await loadRecipes(workspaceId)

    if (body.method === 'recipes.list' || body.method === 'recipes.search') {
      const params = recipesListParamsSchema.parse(body.params)
      return c.json({ ok: true, result: filterRecipes(recipes, params) })
    }

    if (body.method === 'recipes.get') {
      const params = recipeGetParamsSchema.parse(body.params)
      const recipe = recipes.find((item) => item.id === params.id)

      if (!recipe) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'recipe_not_found',
              message: `Recipe ${params.id} was not found.`,
            },
          },
          404,
        )
      }

      return c.json({ ok: true, result: recipe })
    }

    if (body.method === 'recipes.create') {
      const params = recipeCreateParamsSchema.parse(body.params)
      const now = new Date().toISOString()
      const recipe: Recipe = {
        id: crypto.randomUUID(),
        title: params.title,
        description: params.description ?? '',
        imageUrl: params.imageUrl,
        ingredients: params.ingredients ?? [],
        instructions: params.instructions ?? '',
        category: params.category ?? 'Uncategorized',
        cookingTime: params.cookingTime,
        prepTime: params.prepTime,
        servings: params.servings,
        difficulty: params.difficulty,
        sourceUrl: params.sourceUrl,
        tags: params.tags,
        isFavorite: params.isFavorite ?? false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      }

      await saveRecipes([recipe, ...recipes], workspaceId)
      return c.json({ ok: true, result: recipe })
    }

    if (
      body.method === 'recipes.update' ||
      body.method === 'recipes.favorite' ||
      body.method === 'recipes.delete'
    ) {
      const params = recipeUpdateParamsSchema.parse(body.params)
      const index = recipes.findIndex((item) => item.id === params.id)

      if (index === -1) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'recipe_not_found',
              message: `Recipe ${params.id} was not found.`,
            },
          },
          404,
        )
      }

      const existing = recipes[index]!
      recipes[index] = {
        ...existing,
        ...('title' in params ? { title: params.title } : {}),
        ...('description' in params ? { description: params.description } : {}),
        ...('imageUrl' in params ? { imageUrl: params.imageUrl } : {}),
        ...('ingredients' in params ? { ingredients: params.ingredients } : {}),
        ...('instructions' in params
          ? { instructions: params.instructions }
          : {}),
        ...('category' in params ? { category: params.category } : {}),
        ...('cookingTime' in params ? { cookingTime: params.cookingTime } : {}),
        ...('prepTime' in params ? { prepTime: params.prepTime } : {}),
        ...('servings' in params ? { servings: params.servings } : {}),
        ...('difficulty' in params ? { difficulty: params.difficulty } : {}),
        ...('sourceUrl' in params ? { sourceUrl: params.sourceUrl } : {}),
        ...('tags' in params ? { tags: params.tags } : {}),
        ...('isFavorite' in params ? { isFavorite: params.isFavorite } : {}),
        ...(body.method === 'recipes.delete'
          ? { isDeleted: true }
          : 'isDeleted' in params
            ? { isDeleted: params.isDeleted }
            : {}),
        updatedAt: new Date().toISOString(),
      }

      await saveRecipes(recipes, workspaceId)
      if (body.method === 'recipes.delete') {
        await pruneRecipeFromFolders(workspaceId, params.id)
      }
      return c.json({ ok: true, result: recipes[index] })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Recipes does not expose ${body.method}.`,
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
            message: 'Recipes received invalid RPC parameters.',
            detail: error.flatten(),
          },
        },
        400,
      )
    }

    console.error('Recipes RPC failed:', error)
    return c.json(
      {
        ok: false,
        error: {
          code: 'recipes_rpc_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Recipes could not complete the request.',
        },
      },
      500,
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
