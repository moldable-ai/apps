import {
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { isWithinDeepLTextRequestLimit } from '../lib/deepl-limits'
import { type Language, isLanguage } from '../lib/languages'
import { translateText } from '../lib/translation-service'
import type { SourceSelection, TranslationRecord } from '../lib/types'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import fs from 'node:fs/promises'
import { z } from 'zod'

const HISTORY_LIMIT = 100

const languageCodeSchema = z.string().refine(isLanguage, {
  message: 'Unsupported language code',
})

const sourceSelectionSchema = z.union([z.literal('auto'), languageCodeSchema])

const translateRequestSchema = z
  .object({
    text: z.string(),
    from: sourceSelectionSchema.default('auto'),
    to: languageCodeSchema,
  })
  .refine(
    (input) => isWithinDeepLTextRequestLimit(input.text, input.from, input.to),
    {
      message: 'DeepL text translation requests must be 128 KiB or smaller.',
      path: ['text'],
    },
  )

const historyRecordSchema = z.object({
  sourceText: z.string(),
  translatedText: z.string(),
  requestedSource: sourceSelectionSchema,
  sourceLanguage: languageCodeSchema,
  targetLanguage: languageCodeSchema,
})

const rpcRequestSchema = z.object({
  method: z.string(),
  params: z.unknown().optional(),
})

const historyListParamsSchema = z
  .object({
    limit: z.number().int().min(1).max(HISTORY_LIMIT).optional(),
  })
  .optional()

const detectParamsSchema = z
  .object({
    text: z.string().min(1),
  })
  .refine((input) => isWithinDeepLTextRequestLimit(input.text, 'auto', 'en'), {
    message: 'DeepL text translation requests must be 128 KiB or smaller.',
    path: ['text'],
  })

export const app = new Hono()

app.use('/api/*', cors())

function getHistoryPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'history.json')
}

function getRpcWorkspaceId(request: Request): string | undefined {
  return (
    request.headers.get('x-moldable-workspace-id') ??
    getWorkspaceFromRequest(request)
  )
}

async function loadHistory(workspaceId?: string): Promise<TranslationRecord[]> {
  try {
    const raw = await fs.readFile(getHistoryPath(workspaceId), 'utf-8')
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return (parsed as TranslationRecord[])
      .filter((record) => record && typeof record.id === 'string')
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
  } catch {
    return []
  }
}

async function saveHistory(
  records: TranslationRecord[],
  workspaceId?: string,
): Promise<void> {
  await ensureDir(getAppDataDir(workspaceId))
  await writeJson(getHistoryPath(workspaceId), records.slice(0, HISTORY_LIMIT))
}

async function addHistoryRecord(
  input: z.infer<typeof historyRecordSchema>,
  workspaceId?: string,
): Promise<TranslationRecord> {
  const record: TranslationRecord = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  }
  const existing = await loadHistory(workspaceId)
  await saveHistory([record, ...existing], workspaceId)
  return record
}

async function runTranslation(input: z.infer<typeof translateRequestSchema>) {
  const trimmed = input.text.trim()
  if (!trimmed) {
    return {
      translatedText: '',
      detectedSourceLanguage: (input.from === 'auto'
        ? 'en'
        : input.from) as Language,
    }
  }
  return translateText(input.text, input.from, input.to)
}

function isMissingCredentialError(message: string): boolean {
  return (
    message.includes('deepl/translate') ||
    message.includes('CredentialNotFound') ||
    message.toLowerCase().includes('credential')
  )
}

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null

  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'translate',
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
  let resume: unknown = null

  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const history = await loadHistory(workspaceId)

    const now = Date.now()
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000

    // Resume the most recent translation, but only while it is genuinely fresh.
    // A translation tool has no pending work to nag about, so items stay empty;
    // we only offer to pick the last phrase back up if it was recent.
    const latest = history.find((record) => {
      const at = new Date(record.createdAt).getTime()
      return (
        Number.isFinite(at) &&
        now - at <= threeDaysMs &&
        record.sourceText.trim().length > 0
      )
    })

    if (latest) {
      const preview =
        latest.sourceText.trim().length > 60
          ? `${latest.sourceText.trim().slice(0, 60)}…`
          : latest.sourceText.trim()
      resume = {
        title: preview,
        subtitle: `${latest.sourceLanguage.toUpperCase()} → ${latest.targetLanguage.toUpperCase()}`,
        icon: '🌐',
        lastTouchedAt: latest.createdAt,
      }
    }
  } catch (error) {
    console.error('Translate today endpoint failed:', error)
    return c.json({ items: [], resume: null, generatedAt })
  }

  return c.json({ items: [], resume, generatedAt })
})

app.post('/api/translate', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = translateRequestSchema.safeParse(body)

    if (!parsed.success) {
      return c.json(
        { error: `Invalid request: ${parsed.error.issues[0]?.message}` },
        400,
      )
    }

    const result = await runTranslation(parsed.data)
    return c.json(result)
  } catch (error) {
    console.error('Translation error:', error)
    const message =
      error instanceof Error ? error.message : 'Translation failed'
    return c.json(
      { error: message },
      isMissingCredentialError(message) ? 502 : 500,
    )
  }
})

app.get('/api/history', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    return c.json(await loadHistory(workspaceId))
  } catch (error) {
    console.error('Failed to read history:', error)
    return c.json({ error: 'Failed to read history' }, 500)
  }
})

app.post('/api/history', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const parsed = historyRecordSchema.safeParse(await c.req.json())
    if (!parsed.success) {
      return c.json(
        { error: `Invalid request: ${parsed.error.issues[0]?.message}` },
        400,
      )
    }
    const record = await addHistoryRecord(parsed.data, workspaceId)
    return c.json(record)
  } catch (error) {
    console.error('Failed to save history:', error)
    return c.json({ error: 'Failed to save history' }, 500)
  }
})

app.delete('/api/history/:id', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const id = c.req.param('id')
    const existing = await loadHistory(workspaceId)
    await saveHistory(
      existing.filter((record) => record.id !== id),
      workspaceId,
    )
    return c.json({ success: true })
  } catch (error) {
    console.error('Failed to delete history record:', error)
    return c.json({ error: 'Failed to delete history record' }, 500)
  }
})

app.delete('/api/history', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    await saveHistory([], workspaceId)
    return c.json({ success: true })
  } catch (error) {
    console.error('Failed to clear history:', error)
    return c.json({ error: 'Failed to clear history' }, 500)
  }
})

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getRpcWorkspaceId(c.req.raw)

  try {
    const body = rpcRequestSchema.parse(await c.req.json())

    if (body.method === 'translate.text') {
      const params = translateRequestSchema.parse(body.params)
      const result = await runTranslation(params)
      return c.json({ ok: true, result })
    }

    if (body.method === 'translate.detect') {
      const params = detectParamsSchema.parse(body.params)
      // Detect by asking DeepL to translate to English and reading back the
      // source language it identified.
      const result = await translateText(params.text, 'auto', 'en')
      return c.json({
        ok: true,
        result: { language: result.detectedSourceLanguage },
      })
    }

    if (body.method === 'translate.history.list') {
      const params = historyListParamsSchema.parse(body.params)
      const history = await loadHistory(workspaceId)
      return c.json({
        ok: true,
        result: history.slice(0, params?.limit ?? 50),
      })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Translate does not expose ${body.method}.`,
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
            message: 'Translate received invalid RPC parameters.',
            detail: error.flatten(),
          },
        },
        400,
      )
    }

    const message =
      error instanceof Error
        ? error.message
        : 'Translate could not complete the request.'

    if (isMissingCredentialError(message)) {
      return c.json(
        {
          ok: false,
          error: { code: 'translation_failed', message },
        },
        502,
      )
    }

    console.error('Translate RPC failed:', error)
    return c.json(
      {
        ok: false,
        error: { code: 'translate_rpc_failed', message },
      },
      500,
    )
  }
})
