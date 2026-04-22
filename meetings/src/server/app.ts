import { getWorkspaceFromRequest } from '@moldable-ai/storage'
import { invokeAivaultJsonWithStatus } from '../lib/aivault'
import { generateEnhancedNotes } from '../lib/enhancement.server'
import {
  deleteCustomTemplate,
  deleteMeeting,
  getMeeting,
  loadCustomTemplates,
  loadMeetings,
  loadSettings,
  saveCustomTemplate,
  saveMeeting,
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

type DeepgramGrantResponse = {
  access_token?: string
  expires_in?: number
  err_code?: string
  err_msg?: string
  message?: string
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
