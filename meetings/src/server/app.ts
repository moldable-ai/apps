import { getWorkspaceFromRequest } from '@moldable-ai/storage'
import { invokeAivaultJsonWithStatus } from '../lib/aivault'
import {
  generateEnhancedNotes,
  streamEnhancedNotes,
} from '../lib/enhancement.server'
import {
  appendMeetingAudioChunk,
  deleteCustomTemplate,
  deleteMeeting,
  finalizeMeetingAudio,
  getMeeting,
  getMeetingAudioAsset,
  loadCustomTemplates,
  loadMeetings,
  loadSettings,
  saveCustomTemplate,
  saveMeeting,
  saveMeetingAudio,
  saveSettings,
} from '../lib/storage.server'
import {
  DEFAULT_MEETING_TEMPLATE_ID,
  MEETING_TEMPLATES,
  type MeetingTemplate,
  getTemplateById,
} from '../lib/templates'
import type { Meeting, MeetingSettings } from '../types'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createReadStream } from 'node:fs'
import { Readable } from 'node:stream'
import { z } from 'zod'

type DeepgramGrantResponse = {
  access_token?: string
  expires_in?: number
  err_code?: string
  err_msg?: string
  message?: string
}

const rpcRequestSchema = z.object({
  method: z.string(),
  params: z.unknown().optional(),
})

function markdownTextStream(markdown: string) {
  const encoder = new TextEncoder()
  const tokens = markdown.match(/\S+\s*/g) ?? [markdown]

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const token of tokens) {
        controller.enqueue(encoder.encode(token))
        await new Promise((resolve) => setTimeout(resolve, 8))
      }
      controller.close()
    },
  })
}

const listMeetingsParamsSchema = z
  .object({
    limit: z.number().int().min(1).max(100).optional(),
    includeTranscript: z.boolean().optional(),
  })
  .optional()

const searchMeetingsParamsSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional(),
  includeTranscript: z.boolean().optional(),
})

const getMeetingParamsSchema = z.object({
  id: z.string().min(1),
  includeTranscript: z.boolean().optional(),
})

const updateMeetingParamsSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  notes: z.string().optional(),
  enhancedNotes: z.string().optional(),
  enhancedTemplateId: z.string().optional(),
})

const enhanceMeetingParamsSchema = z.object({
  id: z.string().min(1),
  templateId: z.string().optional(),
  save: z.boolean().optional(),
})

const templatesGetParamsSchema = z.object({
  id: z.string().min(1),
})

const templateSaveParamsSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().optional(),
  description: z.string().optional(),
  context: z.string().optional(),
  writingStyle: z.enum(['direct', 'narrative', 'objective']).optional(),
  sections: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      prompt: z.string().min(1),
      format: z.enum(['paragraph', 'list']).optional(),
      length: z.enum(['concise', 'standard', 'detailed']).optional(),
      required: z.boolean().optional(),
    }),
  ),
})

const settingsUpdateParamsSchema = z.object({
  saveAudio: z.boolean().optional(),
  model: z.enum(['nova-3', 'nova-3-medical']).optional(),
  language: z.string().optional(),
  enableDiarization: z.boolean().optional(),
  mipOptOut: z.boolean().optional(),
})

interface MeetingApiRecord {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  endedAt?: string
  duration: number
  notes?: string
  enhancedNotes?: string
  enhancedTemplateId?: string
  enhancedAt?: string
  hasAudio: boolean
  transcriptPreview?: string
  transcript?: string
  segmentCount: number
  recordingSessionCount: number
}

function getRpcWorkspaceId(request: Request): string | undefined {
  return (
    request.headers.get('x-moldable-workspace-id') ??
    getWorkspaceFromRequest(request)
  )
}

function meetingTranscript(meeting: Meeting): string {
  return meeting.segments
    .filter((segment) => segment.text.trim().length > 0)
    .map((segment) => {
      const speaker = segment.speaker?.trim()
      return speaker ? `${speaker}: ${segment.text}` : segment.text
    })
    .join('\n')
}

function serializeDate(value: Date | string | undefined): string | undefined {
  if (!value) return undefined
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString()
}

function toMeetingApiRecord(
  meeting: Meeting,
  options: { includeTranscript?: boolean } = {},
): MeetingApiRecord {
  const transcript = meetingTranscript(meeting)
  return {
    id: meeting.id,
    title: meeting.title || 'Untitled meeting',
    createdAt: serializeDate(meeting.createdAt) ?? new Date().toISOString(),
    updatedAt: serializeDate(meeting.updatedAt) ?? new Date().toISOString(),
    endedAt: serializeDate(meeting.endedAt),
    duration: meeting.duration,
    notes: meeting.notes,
    enhancedNotes: meeting.enhancedNotes,
    enhancedTemplateId: meeting.enhancedTemplateId,
    enhancedAt: serializeDate(meeting.enhancedAt),
    hasAudio:
      meeting.recordingSessions?.some((session) =>
        Boolean(session.audioPath),
      ) ?? false,
    transcriptPreview: transcript.slice(0, 600),
    transcript: options.includeTranscript ? transcript : undefined,
    segmentCount: meeting.segments.length,
    recordingSessionCount: meeting.recordingSessions?.length ?? 0,
  }
}

function searchableMeetingText(meeting: Meeting): string {
  return [
    meeting.title,
    meeting.notes,
    meeting.enhancedNotes,
    meetingTranscript(meeting),
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase()
}

function meetingsStats(meetings: Meeting[]) {
  const totalDuration = meetings.reduce(
    (sum, meeting) => sum + (meeting.duration || 0),
    0,
  )
  const withTranscript = meetings.filter(
    (meeting) => meeting.segments.length > 0,
  ).length
  const withEnhancedNotes = meetings.filter((meeting) =>
    Boolean(meeting.enhancedNotes?.trim()),
  ).length

  return {
    totalMeetings: meetings.length,
    totalDurationSeconds: totalDuration,
    withTranscript,
    withEnhancedNotes,
    latestMeetingAt: serializeDate(meetings[0]?.createdAt),
  }
}

type DeepgramTokenResult =
  | {
      ok: true
      accessToken: string
      expiresIn: number
      source: 'auth-grant'
    }
  | {
      ok: false
      code:
        | 'deepgram_capability_unavailable'
        | 'deepgram_permissions'
        | 'deepgram_token_unavailable'
      status: number
      message: string
      retryable: boolean
      detail?: string
    }

function clampTtlSeconds(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 600
  return Math.max(1, Math.min(3600, Math.floor(value)))
}

function getDeepgramErrorMessage(data: DeepgramGrantResponse): string | null {
  if (typeof data.err_msg === 'string' && data.err_msg) return data.err_msg
  if (typeof data.message === 'string' && data.message) return data.message
  return null
}

function isPermissionStatus(status: number | null): boolean {
  return status === 401 || status === 403
}

function isRetryableStatus(status: number | null): boolean {
  return status === null || status === 408 || status === 429 || status >= 500
}

function userFacingDeepgramPermissionError(
  detail?: string,
): DeepgramTokenResult {
  return {
    ok: false,
    code: 'deepgram_permissions',
    status: 403,
    retryable: false,
    message:
      'Transcription is not available because the saved Deepgram key does not have permission to create live transcription tokens. Update the Deepgram key in Moldable settings, then start a new meeting.',
    detail,
  }
}

async function createDeepgramGrantToken(
  ttlSeconds: number,
): Promise<DeepgramTokenResult> {
  try {
    const { json, status } =
      await invokeAivaultJsonWithStatus<DeepgramGrantResponse>(
        'deepgram/auth-grant',
        {
          method: 'POST',
          path: '/v1/auth/grant',
          headers: {
            'content-type': 'application/json',
          },
          body: {
            ttl_seconds: ttlSeconds,
          },
        },
      )

    if (json.access_token) {
      return {
        ok: true,
        accessToken: json.access_token,
        expiresIn: json.expires_in ?? ttlSeconds,
        source: 'auth-grant',
      }
    }

    if (isPermissionStatus(status)) {
      return userFacingDeepgramPermissionError(
        getDeepgramErrorMessage(json) ?? undefined,
      )
    }

    return {
      ok: false,
      code: 'deepgram_token_unavailable',
      status: status ?? 502,
      retryable: isRetryableStatus(status),
      message:
        'Deepgram did not return a live transcription token. Please try again in a moment.',
      detail: getDeepgramErrorMessage(json) ?? undefined,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (
      /not found|unknown capability|path not allowed|PolicyViolation/i.test(
        message,
      )
    ) {
      return {
        ok: false,
        code: 'deepgram_capability_unavailable',
        status: 501,
        retryable: false,
        message: 'Deepgram live token capability is not available.',
        detail: message,
      }
    }

    return {
      ok: false,
      code: 'deepgram_token_unavailable',
      status: 502,
      retryable: true,
      message:
        'Deepgram token service could not be reached. Please try again in a moment.',
      detail: message,
    }
  }
}

function tokenResponseStatus(status: number): 403 | 501 | 502 {
  if (status === 403) return 403
  if (status === 501) return 501
  return 502
}

function parseByteRange(
  range: string | null,
  size: number,
): { start: number; end: number } | null {
  if (!range?.startsWith('bytes=')) return null

  const [startRaw, endRaw] = range.slice('bytes='.length).split('-')
  const suffixLength = Number(endRaw)
  const start =
    startRaw === '' ? Math.max(0, size - suffixLength) : Number(startRaw)
  const end = startRaw === '' || endRaw === '' ? size - 1 : Number(endRaw)

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    (startRaw === '' &&
      (!Number.isFinite(suffixLength) || suffixLength <= 0)) ||
    start < 0 ||
    end < start ||
    start >= size
  ) {
    return null
  }

  return {
    start,
    end: Math.min(end, size - 1),
  }
}

export const app = new Hono()

app.use('/api/*', cors())

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null

  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'meetings',
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

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getRpcWorkspaceId(c.req.raw)

  try {
    const body = rpcRequestSchema.parse(await c.req.json())

    if (body.method === 'meetings.list') {
      const params = listMeetingsParamsSchema.parse(body.params)
      const meetings = await loadMeetings(workspaceId)
      const limit = params?.limit ?? 25

      return c.json({
        ok: true,
        result: meetings.slice(0, limit).map((meeting) =>
          toMeetingApiRecord(meeting, {
            includeTranscript: params?.includeTranscript,
          }),
        ),
      })
    }

    if (body.method === 'meetings.search') {
      const params = searchMeetingsParamsSchema.parse(body.params)
      const query = params.query.toLowerCase()
      const limit = params.limit ?? 25
      const meetings = await loadMeetings(workspaceId)

      return c.json({
        ok: true,
        result: meetings
          .filter((meeting) => searchableMeetingText(meeting).includes(query))
          .slice(0, limit)
          .map((meeting) =>
            toMeetingApiRecord(meeting, {
              includeTranscript: params.includeTranscript,
            }),
          ),
      })
    }

    if (body.method === 'meetings.get') {
      const params = getMeetingParamsSchema.parse(body.params)
      const meeting = await getMeeting(params.id, workspaceId)

      if (!meeting) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'meeting_not_found',
              message: `Meeting ${params.id} was not found.`,
            },
          },
          404,
        )
      }

      return c.json({
        ok: true,
        result: toMeetingApiRecord(meeting, {
          includeTranscript: params.includeTranscript ?? true,
        }),
      })
    }

    if (body.method === 'meetings.stats') {
      const meetings = await loadMeetings(workspaceId)
      return c.json({ ok: true, result: meetingsStats(meetings) })
    }

    if (body.method === 'meetings.update') {
      const params = updateMeetingParamsSchema.parse(body.params)
      const meeting = await getMeeting(params.id, workspaceId)

      if (!meeting) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'meeting_not_found',
              message: `Meeting ${params.id} was not found.`,
            },
          },
          404,
        )
      }

      const updated: Meeting = {
        ...meeting,
        ...('title' in params ? { title: params.title } : {}),
        ...('notes' in params ? { notes: params.notes } : {}),
        ...('enhancedNotes' in params
          ? {
              enhancedNotes: params.enhancedNotes,
              enhancedAt: new Date(),
            }
          : {}),
        ...('enhancedTemplateId' in params
          ? { enhancedTemplateId: params.enhancedTemplateId }
          : {}),
        updatedAt: new Date(),
      }

      await saveMeeting(updated, workspaceId)
      return c.json({
        ok: true,
        result: toMeetingApiRecord(updated, { includeTranscript: true }),
      })
    }

    if (body.method === 'meetings.delete') {
      const params = getMeetingParamsSchema.parse(body.params)
      await deleteMeeting(params.id, workspaceId)
      return c.json({ ok: true, result: { deleted: true, id: params.id } })
    }

    if (body.method === 'meetings.templates.list') {
      const customTemplates = await loadCustomTemplates(workspaceId)
      return c.json({
        ok: true,
        result: [...MEETING_TEMPLATES, ...customTemplates],
      })
    }

    if (body.method === 'meetings.templates.get') {
      const params = templatesGetParamsSchema.parse(body.params)
      const customTemplates = await loadCustomTemplates(workspaceId)
      const template = getTemplateById(params.id, [
        ...customTemplates,
        ...MEETING_TEMPLATES,
      ])
      return c.json({ ok: true, result: template })
    }

    if (body.method === 'meetings.templates.save') {
      const params = templateSaveParamsSchema.parse(body.params)
      const template: MeetingTemplate = {
        id: params.id,
        name: params.name,
        icon: params.icon ?? '📝',
        category: 'My Templates',
        description: params.description ?? '',
        context: params.context ?? '',
        writingStyle: params.writingStyle,
        sections: params.sections,
      }
      await saveCustomTemplate(template, workspaceId)
      return c.json({ ok: true, result: template })
    }

    if (body.method === 'meetings.templates.delete') {
      const params = templatesGetParamsSchema.parse(body.params)
      await deleteCustomTemplate(params.id, workspaceId)
      return c.json({ ok: true, result: { deleted: true, id: params.id } })
    }

    if (body.method === 'meetings.settings.get') {
      return c.json({ ok: true, result: await loadSettings(workspaceId) })
    }

    if (body.method === 'meetings.settings.update') {
      const params = settingsUpdateParamsSchema.parse(body.params)
      const existing = await loadSettings(workspaceId)
      const updated: MeetingSettings = {
        ...existing,
        ...params,
      }
      await saveSettings(updated, workspaceId)
      return c.json({ ok: true, result: updated })
    }

    if (body.method === 'meetings.enhanceNotes') {
      const params = enhanceMeetingParamsSchema.parse(body.params)
      const meeting = await getMeeting(params.id, workspaceId)

      if (!meeting) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'meeting_not_found',
              message: `Meeting ${params.id} was not found.`,
            },
          },
          404,
        )
      }

      const customTemplates = await loadCustomTemplates(workspaceId)
      const template = getTemplateById(params.templateId, [
        ...customTemplates,
        ...MEETING_TEMPLATES,
      ])
      const markdown = await generateEnhancedNotes({
        meeting,
        template,
        workspaceId,
      })

      if (params.save) {
        await saveMeeting(
          {
            ...meeting,
            enhancedNotes: markdown,
            enhancedTemplateId: template.id,
            enhancedAt: new Date(),
            updatedAt: new Date(),
          },
          workspaceId,
        )
      }

      return c.json({
        ok: true,
        result: { markdown, templateId: template.id, saved: !!params.save },
      })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Meetings does not expose ${body.method}.`,
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
            message: 'Meetings received invalid RPC parameters.',
            detail: error.flatten(),
          },
        },
        400,
      )
    }

    console.error('Meetings RPC failed:', error)
    return c.json(
      {
        ok: false,
        error: {
          code: 'meetings_rpc_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Meetings could not complete the request.',
        },
      },
      500,
    )
  }
})

app.get('/api/meetings', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const meetings = await loadMeetings(workspaceId)
    return c.json(meetings)
  } catch (error) {
    console.error('Failed to load meetings:', error)
    return c.json({ error: 'Failed to load meetings' }, 500)
  }
})

app.post('/api/meetings', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const meeting = await c.req.json<Meeting>()
    await saveMeeting(meeting, workspaceId)
    return c.json({ ok: true })
  } catch (error) {
    console.error('Failed to save meeting:', error)
    return c.json({ error: 'Failed to save meeting' }, 500)
  }
})

app.post('/api/meetings/:id/audio', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const meetingId = c.req.param('id')
    const sessionId = c.req.header('x-recording-session-id')

    if (!sessionId) {
      return c.json({ error: 'Missing recording session id' }, 400)
    }

    const arrayBuffer = await c.req.arrayBuffer()
    if (arrayBuffer.byteLength === 0) {
      return c.json({ error: 'Missing audio data' }, 400)
    }

    const saved = await saveMeetingAudio({
      meetingId,
      sessionId,
      contentType: c.req.header('content-type') ?? 'audio/webm',
      data: Buffer.from(arrayBuffer),
      workspaceId,
    })

    return c.json(saved)
  } catch (error) {
    console.error('Failed to save meeting audio:', error)
    return c.json({ error: 'Failed to save meeting audio' }, 500)
  }
})

app.post('/api/meetings/:id/audio/:sessionId/chunk', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const arrayBuffer = await c.req.arrayBuffer()

    if (arrayBuffer.byteLength === 0) {
      return c.json({ error: 'Missing audio data' }, 400)
    }

    const saved = await appendMeetingAudioChunk({
      meetingId: c.req.param('id'),
      sessionId: c.req.param('sessionId'),
      contentType: c.req.header('content-type') ?? 'audio/webm',
      data: Buffer.from(arrayBuffer),
      workspaceId,
    })

    return c.json(saved)
  } catch (error) {
    console.error('Failed to append meeting audio chunk:', error)
    return c.json({ error: 'Failed to save meeting audio chunk' }, 500)
  }
})

app.post('/api/meetings/:id/audio/:sessionId/finalize', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const body = (await c.req
      .json<{ contentType?: string }>()
      .catch(() => ({}))) as { contentType?: string }

    const saved = await finalizeMeetingAudio({
      meetingId: c.req.param('id'),
      sessionId: c.req.param('sessionId'),
      contentType: body.contentType ?? 'audio/webm',
      workspaceId,
    })

    if (!saved) {
      return c.json({ error: 'Audio file not found' }, 404)
    }

    return c.json(saved)
  } catch (error) {
    console.error('Failed to finalize meeting audio:', error)
    return c.json({ error: 'Failed to finalize meeting audio' }, 500)
  }
})

app.get('/api/meetings/:id/audio/:sessionId', async (c) => {
  try {
    const workspaceId =
      getWorkspaceFromRequest(c.req.raw) ?? c.req.query('workspace')
    const asset = await getMeetingAudioAsset({
      meetingId: c.req.param('id'),
      sessionId: c.req.param('sessionId'),
      workspaceId,
    })

    if (!asset) {
      return c.json({ error: 'Audio file not found' }, 404)
    }

    const range = parseByteRange(c.req.header('range') ?? null, asset.size)
    const status = range ? 206 : 200
    const start = range?.start ?? 0
    const end = range?.end ?? asset.size - 1
    const contentLength = end - start + 1
    const body = Readable.toWeb(
      createReadStream(asset.filePath, { start, end }),
    ) as ReadableStream

    return new Response(body, {
      status,
      headers: {
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=60',
        'Content-Type': asset.audioMimeType,
        'Content-Length': String(contentLength),
        ...(range
          ? {
              'Content-Range': `bytes ${start}-${end}/${asset.size}`,
            }
          : {}),
      },
    })
  } catch (error) {
    console.error('Failed to load meeting audio:', error)
    return c.json({ error: 'Failed to load meeting audio' }, 500)
  }
})

app.get('/api/templates', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const templates = await loadCustomTemplates(workspaceId)
    return c.json(templates)
  } catch (error) {
    console.error('Failed to load templates:', error)
    return c.json({ error: 'Failed to load templates' }, 500)
  }
})

app.post('/api/templates', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const template = await c.req.json<MeetingTemplate>()
    await saveCustomTemplate(template, workspaceId)
    return c.json({ ok: true })
  } catch (error) {
    console.error('Failed to save template:', error)
    return c.json({ error: 'Failed to save template' }, 500)
  }
})

app.delete('/api/templates/:id', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    await deleteCustomTemplate(c.req.param('id'), workspaceId)
    return c.json({ ok: true })
  } catch (error) {
    console.error('Failed to delete template:', error)
    return c.json({ error: 'Failed to delete template' }, 500)
  }
})

app.post('/api/meetings/:id/enhance', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const body = (await c.req
      .json<{
        meeting?: Meeting
        template?: MeetingTemplate
        templateId?: string
      }>()
      .catch(() => ({}))) as {
      meeting?: Meeting
      template?: MeetingTemplate
      templateId?: string
    }

    const meeting =
      body.meeting ?? (await getMeeting(c.req.param('id'), workspaceId))

    if (!meeting) {
      return c.json({ error: 'Meeting not found' }, 404)
    }

    const customTemplates = await loadCustomTemplates(workspaceId)
    const template =
      body.template ??
      getTemplateById(
        body.templateId ??
          meeting.enhancedTemplateId ??
          DEFAULT_MEETING_TEMPLATE_ID,
        [...customTemplates, ...MEETING_TEMPLATES],
      )

    if (!template) {
      return c.json({ error: 'Template not found' }, 400)
    }

    const markdown = await generateEnhancedNotes({
      meeting,
      template,
      workspaceId,
    })

    return c.json({ markdown, templateId: template.id })
  } catch (error) {
    console.error('Failed to generate enhanced meeting notes:', error)
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate enhanced notes',
      },
      500,
    )
  }
})

app.post('/api/meetings/:id/enhance/stream', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const body = (await c.req
      .json<{
        meeting?: Meeting
        template?: MeetingTemplate
        templateId?: string
      }>()
      .catch(() => ({}))) as {
      meeting?: Meeting
      template?: MeetingTemplate
      templateId?: string
    }

    const meeting =
      body.meeting ?? (await getMeeting(c.req.param('id'), workspaceId))

    if (!meeting) {
      return c.json({ error: 'Meeting not found' }, 404)
    }

    const customTemplates = await loadCustomTemplates(workspaceId)
    const template =
      body.template ??
      getTemplateById(
        body.templateId ??
          meeting.enhancedTemplateId ??
          DEFAULT_MEETING_TEMPLATE_ID,
        [...customTemplates, ...MEETING_TEMPLATES],
      )

    if (!template) {
      return c.json({ error: 'Template not found' }, 400)
    }

    try {
      const streamResponse = await streamEnhancedNotes({
        meeting,
        template,
        workspaceId,
      })

      return new Response(streamResponse.body, {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-transform',
          'Content-Type': 'text/plain; charset=utf-8',
        },
      })
    } catch (streamError) {
      console.warn(
        'Streaming enhanced meeting notes failed; falling back to buffered generation:',
        streamError,
      )

      const markdown = await generateEnhancedNotes({
        meeting,
        template,
        workspaceId,
      })

      return new Response(markdownTextStream(markdown), {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-transform',
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Meetings-Enhancement-Fallback': 'buffered',
        },
      })
    }
  } catch (error) {
    console.error('Failed to stream enhanced meeting notes:', error)
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to stream enhanced notes',
      },
      500,
    )
  }
})

app.get('/api/meetings/:id', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const meeting = await getMeeting(c.req.param('id'), workspaceId)

    if (!meeting) {
      return c.json({ error: 'Meeting not found' }, 404)
    }

    return c.json(meeting)
  } catch (error) {
    console.error('Failed to get meeting:', error)
    return c.json({ error: 'Failed to get meeting' }, 500)
  }
})

app.delete('/api/meetings/:id', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    await deleteMeeting(c.req.param('id'), workspaceId)
    return c.json({ ok: true })
  } catch (error) {
    console.error('Failed to delete meeting:', error)
    return c.json({ error: 'Failed to delete meeting' }, 500)
  }
})

app.get('/api/settings', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const settings = await loadSettings(workspaceId)
    return c.json(settings)
  } catch (error) {
    console.error('Failed to load settings:', error)
    return c.json({ error: 'Failed to load settings' }, 500)
  }
})

app.post('/api/settings', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const settings = await c.req.json<MeetingSettings>()
    await saveSettings(settings, workspaceId)
    return c.json({ ok: true })
  } catch (error) {
    console.error('Failed to save settings:', error)
    return c.json({ error: 'Failed to save settings' }, 500)
  }
})

app.post('/api/deepgram/token', async (c) => {
  try {
    const body = (await c.req
      .json<{ ttl_seconds?: number }>()
      .catch(() => ({}))) as { ttl_seconds?: number }
    const ttlSeconds = clampTtlSeconds(body.ttl_seconds)

    const tokenResult = await createDeepgramGrantToken(ttlSeconds)

    if (!tokenResult.ok) {
      const logMessage = `${tokenResult.code}: ${tokenResult.detail ?? tokenResult.message}`
      if (tokenResult.retryable) {
        console.warn('Deepgram token unavailable:', logMessage)
      } else {
        console.info('Deepgram token setup issue:', logMessage)
      }

      return c.json(
        {
          error: tokenResult.message,
          code: tokenResult.code,
          retryable: tokenResult.retryable,
          detail: tokenResult.detail,
        },
        tokenResponseStatus(tokenResult.status),
      )
    }

    return c.json({
      access_token: tokenResult.accessToken,
      expires_in: tokenResult.expiresIn,
      source: tokenResult.source,
    })
  } catch (error) {
    console.error('Deepgram token error:', error)
    return c.json(
      {
        error:
          'Transcription could not start because Deepgram token setup failed. Please try again in a moment.',
        code: 'deepgram_token_unavailable',
        retryable: true,
      },
      500,
    )
  }
})
