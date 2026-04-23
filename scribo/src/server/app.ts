import {
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  safePath,
  sanitizeId,
  writeJson,
} from '@moldable-ai/storage'
import { invokeAivaultRaw } from '../lib/aivault'
import type { Language } from '../lib/languages'
import {
  applyTranslatedXml,
  callDeepL,
  extractBlocksWithHashes,
} from '../lib/translation-service'
import { DEFAULT_VOICE_ID, MULTILINGUAL_MODEL } from '../lib/tts/voice-ids'
import type { JournalEntry, TranslationCache } from '../lib/types'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import fs from 'node:fs/promises'
import { z } from 'zod'

interface FreeDictionaryLanguage {
  code: string
  name: string
}

interface FreeDictionaryTranslation {
  language: FreeDictionaryLanguage
  word: string
}

interface FreeDictionarySense {
  definition: string
  examples?: string[]
  translations?: FreeDictionaryTranslation[]
}

interface FreeDictionaryPronunciation {
  type: string
  text: string
  tags?: string[]
}

interface FreeDictionaryEntry {
  language: FreeDictionaryLanguage
  partOfSpeech: string
  pronunciations?: FreeDictionaryPronunciation[]
  senses: FreeDictionarySense[]
}

interface FreeDictionaryResponse {
  word: string
  entries: FreeDictionaryEntry[]
}

export interface LookupResult {
  word: string
  language: string
  phonetic?: string
  meanings: {
    partOfSpeech: string
    definition: string
    example?: string
  }[]
  translations?: {
    language: string
    word: string
  }[]
  error?: string
}

const TranslateRequestSchema = z.object({
  markdown: z.string(),
  from: z.string().min(2).max(5),
  to: z.string().min(2).max(5),
  cache: z
    .object({
      sourceLang: z.string(),
      targetLang: z.string(),
      blocks: z.record(z.string(), z.string()),
    })
    .optional()
    .nullable(),
})

const TtsRequestSchema = z.object({
  text: z.string().min(1),
  languageCode: z.string().optional(),
})

const rpcRequestSchema = z.object({
  method: z.string(),
  params: z.unknown().optional(),
})

const entriesListParamsSchema = z
  .object({
    query: z.string().optional(),
    sourceLanguage: z.string().optional(),
    targetLanguage: z.string().optional(),
    includeTranslation: z.boolean().optional(),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .optional()

const entryGetParamsSchema = z.object({
  id: z.string().min(1),
})

const entryCreateParamsSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  translation: z.string().optional(),
  sourceLanguage: z.string().optional(),
  targetLanguage: z.string().optional(),
})

const entryUpdateParamsSchema = entryCreateParamsSchema.partial().extend({
  id: z.string().min(1),
})

export const app = new Hono()

app.use('/api/*', cors())

function getEntriesDir(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'entries')
}

function getEntryPath(id: string, workspaceId?: string): string {
  const safeId = sanitizeId(id)
  return safePath(getEntriesDir(workspaceId), `${safeId}.json`)
}

function getRpcWorkspaceId(request: Request): string | undefined {
  return (
    request.headers.get('x-moldable-workspace-id') ??
    getWorkspaceFromRequest(request)
  )
}

async function loadEntries(workspaceId?: string): Promise<JournalEntry[]> {
  const entriesDir = getEntriesDir(workspaceId)

  try {
    await ensureDir(entriesDir)
    const files = await fs.readdir(entriesDir)
    const jsonFiles = files.filter((file) => file.endsWith('.json'))

    const entries: JournalEntry[] = []
    for (const file of jsonFiles) {
      try {
        const filePath = safePath(entriesDir, file)
        const data = await fs.readFile(filePath, 'utf-8')
        const entry = JSON.parse(data) as Partial<JournalEntry>

        entries.push({
          ...entry,
          id: entry.id ?? sanitizeId(file.replace(/\.json$/, '')),
          title: entry.title ?? '',
          content: entry.content ?? '',
          translation: entry.translation ?? '',
        } as JournalEntry)
      } catch (error) {
        console.error(`Failed to read entry file ${file}:`, error)
      }
    }

    return entries.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  } catch {
    return []
  }
}

async function saveEntry(
  entry: JournalEntry,
  workspaceId?: string,
): Promise<void> {
  await ensureDir(getEntriesDir(workspaceId))
  await writeJson(getEntryPath(entry.id, workspaceId), entry)
}

async function deleteEntry(id: string, workspaceId?: string): Promise<void> {
  try {
    await fs.unlink(getEntryPath(id, workspaceId))
  } catch {
    // The entry may already be gone.
  }
}

function normalizeLang(code: string): string {
  return code.toLowerCase().split('-')[0] ?? code.toLowerCase()
}

function summarizeEntry(entry: JournalEntry, includeTranslation = false) {
  return {
    ...entry,
    content:
      entry.content.length > 600
        ? `${entry.content.slice(0, 600)}...`
        : entry.content,
    translation: includeTranslation
      ? entry.translation
      : entry.translation.length > 600
        ? `${entry.translation.slice(0, 600)}...`
        : entry.translation,
  }
}

function filterEntries(
  entries: JournalEntry[],
  params: z.infer<typeof entriesListParamsSchema>,
) {
  let result = [...entries]

  if (params?.sourceLanguage) {
    result = result.filter(
      (entry) => entry.sourceLanguage === params.sourceLanguage,
    )
  }
  if (params?.targetLanguage) {
    result = result.filter(
      (entry) => entry.targetLanguage === params.targetLanguage,
    )
  }
  if (params?.query?.trim()) {
    const query = params.query.toLowerCase()
    result = result.filter((entry) =>
      [entry.title, entry.content, entry.translation]
        .join('\n')
        .toLowerCase()
        .includes(query),
    )
  }

  return result
    .slice(0, params?.limit ?? 100)
    .map((entry) => summarizeEntry(entry, params?.includeTranslation))
}

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null

  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'scribo',
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

app.get('/api/entries', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const entries = await loadEntries(workspaceId)
    return c.json(entries)
  } catch (error) {
    console.error('Failed to read entries:', error)
    return c.json({ error: 'Failed to read entries' }, 500)
  }
})

app.post('/api/entries', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const entries = await c.req.json<JournalEntry[]>()
    const existingEntries = await loadEntries(workspaceId)
    const newIds = new Set(entries.map((entry) => entry.id))

    for (const existing of existingEntries) {
      if (!newIds.has(existing.id)) {
        await deleteEntry(existing.id, workspaceId)
      }
    }

    for (const entry of entries) {
      await saveEntry(entry, workspaceId)
    }

    return c.json({ success: true })
  } catch (error) {
    console.error('Failed to save entries:', error)
    return c.json({ error: 'Failed to save entries' }, 500)
  }
})

app.get('/api/lookup', async (c) => {
  const rawWord = c.req.query('word')
  const lang = c.req.query('lang') || 'en'
  const to = c.req.query('to')

  if (!rawWord?.trim()) {
    return c.json({ error: 'Missing word parameter' }, 400)
  }

  const word = rawWord.trim()
  const langCode = normalizeLang(lang)
  const toCode = to ? normalizeLang(to) : null

  try {
    const url = new URL(
      `https://freedictionaryapi.com/api/v1/entries/${encodeURIComponent(langCode)}/${encodeURIComponent(word)}`,
    )

    if (toCode) {
      url.searchParams.set('translations', 'true')
    }

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      const result: LookupResult = {
        word,
        language: langCode,
        meanings: [],
        error:
          response.status === 404 ? 'No definition found' : 'Lookup failed',
      }
      return c.json(result, response.status === 404 ? 200 : 502)
    }

    const data = (await response.json()) as FreeDictionaryResponse
    const entries = Array.isArray(data.entries) ? data.entries : []

    const phonetic =
      entries
        .flatMap((entry) => entry.pronunciations ?? [])
        .map((pronunciation) => pronunciation.text)
        .find((text) => !!text) ?? undefined

    const meanings: LookupResult['meanings'] = []
    const translations: LookupResult['translations'] = []

    for (const entry of entries) {
      const partOfSpeech = entry.partOfSpeech

      for (const sense of entry.senses ?? []) {
        if (sense.definition) {
          meanings.push({
            partOfSpeech,
            definition: sense.definition,
            example: sense.examples?.[0],
          })
        }

        if (toCode && Array.isArray(sense.translations)) {
          for (const translation of sense.translations) {
            const translationCode = normalizeLang(translation.language.code)
            if (translationCode === toCode && translation.word) {
              translations.push({
                language: translationCode,
                word: translation.word,
              })
            }
          }
        }
      }
    }

    const result: LookupResult = {
      word: data.word || word,
      language: langCode,
      phonetic,
      meanings: meanings.slice(0, 6),
      translations: toCode ? translations.slice(0, 6) : undefined,
      error:
        meanings.length === 0 && (!translations || translations.length === 0)
          ? 'No definition found'
          : undefined,
    }

    return c.json(result, 200, {
      'Cache-Control': 'public, max-age=86400',
    })
  } catch (error) {
    console.error('Dictionary lookup error:', error)
    const result: LookupResult = {
      word,
      language: langCode,
      meanings: [],
      error: 'Failed to look up word',
    }
    return c.json(result, 502)
  }
})

app.post('/api/translate', async (c) => {
  try {
    const body = await c.req.json()
    const parseResult = TranslateRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return c.json(
        { error: `Invalid request: ${parseResult.error.issues[0]?.message}` },
        400,
      )
    }

    const { markdown, from, to, cache: existingCache } = parseResult.data

    if (!markdown.trim()) {
      return c.json({
        translatedText: '',
        cache: { sourceLang: from, targetLang: to, blocks: {} },
      })
    }

    const validCache =
      existingCache &&
      existingCache.sourceLang === from &&
      existingCache.targetLang === to
        ? existingCache.blocks
        : {}

    const extracted = await extractBlocksWithHashes(markdown)

    if (!extracted) {
      return c.json({
        translatedText: markdown,
        cache: { sourceLang: from, targetLang: to, blocks: {} },
      })
    }

    const uncachedBlocks: typeof extracted.blocks = []
    const uncachedIndices: number[] = []
    const cachedTranslations = new Map<number, string>()

    extracted.blocks.forEach((block, index) => {
      const cached = validCache[block.contentHash]
      if (cached) {
        cachedTranslations.set(index, cached)
      } else {
        uncachedBlocks.push(block)
        uncachedIndices.push(index)
      }
    })

    const newCacheBlocks: Record<string, string> = {}
    let translatedBlocksMap: Map<number, string>

    if (uncachedBlocks.length === 0) {
      translatedBlocksMap = cachedTranslations
    } else {
      const xml = uncachedBlocks
        .map((block, index) => `<block id="${index}">${block.xml}</block>`)
        .join('')

      const translatedXml = await callDeepL(xml, from, to)
      const blockRegex = /<block id="(\d+)">([\s\S]*?)<\/block>/g
      translatedBlocksMap = new Map(cachedTranslations)
      let match

      while ((match = blockRegex.exec(translatedXml)) !== null) {
        const localIndex = Number.parseInt(match[1]!, 10)
        const translatedContent = match[2]!
        const originalIndex = uncachedIndices[localIndex]!
        const block = uncachedBlocks[localIndex]!

        translatedBlocksMap.set(originalIndex, translatedContent)
        newCacheBlocks[block.contentHash] = translatedContent
      }
    }

    extracted.blocks.forEach((block) => {
      const cachedValue = validCache[block.contentHash]
      if (cachedValue && !newCacheBlocks[block.contentHash]) {
        newCacheBlocks[block.contentHash] = cachedValue
      }
    })

    const translatedText = await applyTranslatedXml(
      translatedBlocksMap,
      extracted.blocks,
      extracted.structure,
      extracted.editor,
    )

    const updatedCache: TranslationCache = {
      sourceLang: from as Language,
      targetLang: to as Language,
      blocks: newCacheBlocks,
    }

    return c.json({ translatedText, cache: updatedCache })
  } catch (error) {
    console.error('Translation error:', error)

    const message =
      error instanceof Error ? error.message : 'Translation failed'

    if (
      message.includes('deepl/translate') ||
      message.includes('CredentialNotFound') ||
      message.includes('credential')
    ) {
      return c.json({ error: message }, 502)
    }

    return c.json({ error: message }, 500)
  }
})

app.post('/api/tts', async (c) => {
  try {
    const body = await c.req.json()
    const parseResult = TtsRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return c.json({ error: 'Text is required' }, 400)
    }

    const { text, languageCode } = parseResult.data
    const audio = await invokeAivaultRaw('elevenlabs/text-to-speech', {
      method: 'POST',
      path: `/v1/text-to-speech/${DEFAULT_VOICE_ID}?output_format=mp3_44100_128`,
      headers: {
        'content-type': 'application/json',
      },
      body: {
        text,
        model_id: MULTILINGUAL_MODEL,
        voice_settings: {
          speed: 0.9,
        },
        ...(languageCode && { language_code: languageCode }),
      },
    })

    return new Response(new Uint8Array(audio), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('TTS error:', error)
    return c.json({ error: 'Failed to generate speech' }, 500)
  }
})

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getRpcWorkspaceId(c.req.raw)

  try {
    const body = rpcRequestSchema.parse(await c.req.json())
    const entries = await loadEntries(workspaceId)

    if (
      body.method === 'scribo.entries.list' ||
      body.method === 'scribo.entries.search'
    ) {
      const params = entriesListParamsSchema.parse(body.params)
      return c.json({ ok: true, result: filterEntries(entries, params) })
    }

    if (body.method === 'scribo.entries.get') {
      const params = entryGetParamsSchema.parse(body.params)
      const entry = entries.find((item) => item.id === params.id)

      if (!entry) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'entry_not_found',
              message: `Entry ${params.id} was not found.`,
            },
          },
          404,
        )
      }

      return c.json({ ok: true, result: entry })
    }

    if (body.method === 'scribo.entries.create') {
      const params = entryCreateParamsSchema.parse(body.params)
      const now = new Date()
      const entry: JournalEntry = {
        id: crypto.randomUUID(),
        title: params.title ?? 'Untitled',
        content: params.content ?? '',
        translation: params.translation ?? '',
        sourceLanguage: (params.sourceLanguage ?? 'en') as Language,
        targetLanguage: (params.targetLanguage ?? 'fr') as Language,
        createdAt: now,
        updatedAt: now,
      }
      await saveEntry(entry, workspaceId)
      return c.json({ ok: true, result: entry })
    }

    if (body.method === 'scribo.entries.update') {
      const params = entryUpdateParamsSchema.parse(body.params)
      const entry = entries.find((item) => item.id === params.id)

      if (!entry) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'entry_not_found',
              message: `Entry ${params.id} was not found.`,
            },
          },
          404,
        )
      }

      const updated: JournalEntry = {
        ...entry,
        ...('title' in params ? { title: params.title } : {}),
        ...('content' in params ? { content: params.content } : {}),
        ...('translation' in params ? { translation: params.translation } : {}),
        ...('sourceLanguage' in params
          ? { sourceLanguage: params.sourceLanguage as Language }
          : {}),
        ...('targetLanguage' in params
          ? { targetLanguage: params.targetLanguage as Language }
          : {}),
        updatedAt: new Date(),
      }
      await saveEntry(updated, workspaceId)
      return c.json({ ok: true, result: updated })
    }

    if (body.method === 'scribo.entries.delete') {
      const params = entryGetParamsSchema.parse(body.params)
      await deleteEntry(params.id, workspaceId)
      return c.json({ ok: true, result: { deleted: true, id: params.id } })
    }

    if (body.method === 'scribo.translate') {
      const params = TranslateRequestSchema.parse(body.params)
      const response = await app.request('/api/translate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      })
      const result = await response.json()
      if (!response.ok) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'translation_failed',
              message:
                typeof result?.error === 'string'
                  ? result.error
                  : 'Translation failed.',
              detail: result,
            },
          },
          response.status as 400 | 500 | 502,
        )
      }
      return c.json({ ok: true, result })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Scribo does not expose ${body.method}.`,
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
            message: 'Scribo received invalid RPC parameters.',
            detail: error.flatten(),
          },
        },
        400,
      )
    }

    console.error('Scribo RPC failed:', error)
    return c.json(
      {
        ok: false,
        error: {
          code: 'scribo_rpc_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Scribo could not complete the request.',
        },
      },
      500,
    )
  }
})
