import { getWorkspaceFromRequest } from '@moldable-ai/storage'
import {
  deleteMeeting,
  getMeeting,
  loadMeetings,
  loadSettings,
  saveMeeting,
  saveSettings,
} from '../lib/storage.server'
import type { Meeting, MeetingSettings } from '../types'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

type ProjectsResponse = {
  projects?: Array<{
    project_id?: string
  }>
}

type DeepgramKeyResponse = {
  key?: string
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
  const deepgramApiKey = process.env.DEEPGRAM_API_KEY

  if (!deepgramApiKey) {
    return c.json({ error: 'DEEPGRAM_API_KEY not configured' }, 500)
  }

  try {
    const body = (await c.req
      .json<{ ttl_seconds?: number }>()
      .catch(() => ({}))) as { ttl_seconds?: number }
    const ttlSeconds = body.ttl_seconds || 600

    const projectsResponse = await fetch(
      'https://api.deepgram.com/v1/projects',
      {
        headers: {
          Authorization: `Token ${deepgramApiKey}`,
          'Content-Type': 'application/json',
        },
      },
    )

    if (!projectsResponse.ok) {
      throw new Error(
        `Failed to fetch projects: ${projectsResponse.statusText}`,
      )
    }

    const { projects } = (await projectsResponse.json()) as ProjectsResponse
    const projectId = projects?.[0]?.project_id

    if (!projectId) {
      throw new Error('No Deepgram projects found')
    }

    const keyResponse = await fetch(
      `https://api.deepgram.com/v1/projects/${projectId}/keys`,
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${deepgramApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: 'Meetings app temporary key',
          scopes: ['usage:write'],
          time_to_live_in_seconds: ttlSeconds,
        }),
      },
    )

    if (!keyResponse.ok) {
      const errorText = await keyResponse.text()
      throw new Error(`Failed to create temporary key: ${errorText}`)
    }

    const keyData = (await keyResponse.json()) as DeepgramKeyResponse

    return c.json({
      access_token: keyData.key,
      expires_in: ttlSeconds,
    })
  } catch (error) {
    console.error('Deepgram token error:', error)
    return c.json({ error: 'Failed to generate Deepgram token' }, 500)
  }
})
