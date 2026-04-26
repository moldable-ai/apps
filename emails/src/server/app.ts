import { getWorkspaceFromRequest } from '@moldable-ai/storage'
import type { MailMessageSummary } from '../client/types'
import {
  type BriefingCache,
  computeBriefingFingerprint,
  generateInboxBriefing,
  readCachedBriefing,
  streamInboxBriefing,
  writeCachedBriefing,
} from './briefing'
import { deleteDraft, listDrafts, saveDraft } from './drafts'
import {
  clearTokens,
  getAuthUrl,
  isAuthenticated,
  saveTokens,
} from './gmail-auth'
import {
  applyMessageAction,
  getAttachment,
  getLabels,
  getMessage,
  getProfile,
  isAuthError,
  listContacts,
  listMessages,
  modifyMessageLabels,
  sendMessage,
  unsubscribeAndArchive,
} from './gmail-service'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'

export const app = new Hono()

app.use('/api/*', cors())

const sendMailSchema = z.object({
  to: z.string().trim().min(1),
  cc: z.string().trim().optional(),
  bcc: z.string().trim().optional(),
  subject: z.string().trim().min(1),
  body: z.string().trim().min(1),
  threadId: z.string().trim().optional(),
})

const draftComposerSchema = z.object({
  mode: z.enum(['new', 'reply']),
  draftId: z.string().trim().optional(),
  to: z.string(),
  cc: z.string(),
  bcc: z.string(),
  subject: z.string(),
  body: z.string(),
  threadId: z.string().trim().optional(),
})

const messageActionSchema = z.object({
  action: z.enum([
    'archive',
    'trash',
    'untrash',
    'markRead',
    'markUnread',
    'star',
    'unstar',
    'important',
    'unimportant',
    'spam',
    'notSpam',
    'snooze',
    'unsnooze',
  ]),
  until: z.number().int().positive().optional(),
})

const rpcRequestSchema = z.object({
  method: z.string(),
  params: z.unknown().optional(),
})

const messageSearchParamsSchema = z
  .object({
    query: z.string().optional(),
    labelId: z.string().optional(),
    maxResults: z.number().int().min(1).max(50).optional(),
  })
  .optional()

const messageGetParamsSchema = z.object({
  id: z.string().min(1),
})

function getWorkspaceId(request: Request) {
  const urlWorkspace = new URL(request.url).searchParams.get('workspace')
  return getWorkspaceFromRequest(request) ?? urlWorkspace ?? 'personal'
}

function numberQuery(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback)
  return Number.isFinite(parsed) ? parsed : fallback
}

function errorDetails(error: unknown) {
  if (!(error instanceof Error)) return { value: error }

  const candidate = error as Error & {
    code?: unknown
    status?: unknown
    response?: unknown
    stack?: string
  }
  return {
    name: error.name,
    message: error.message,
    code: candidate.code,
    status: candidate.status,
    response: candidate.response,
    stack: candidate.stack,
  }
}

function logGmailError(error: unknown, context: Record<string, unknown>) {
  try {
    console.error(
      '[emails:gmail-error]',
      JSON.stringify(
        {
          ...context,
          error: errorDetails(error),
        },
        null,
        2,
      ),
    )
  } catch {
    console.error('[emails:gmail-error]', context, error)
  }
}

function gmailErrorResponse(
  error: unknown,
  context: Record<string, unknown> = {},
) {
  logGmailError(error, context)

  if (error instanceof Error && error.name === 'GmailNotConnected') {
    return {
      body: { error: 'Gmail is not connected', authenticated: false },
      status: 401 as const,
    }
  }

  if (isAuthError(error)) {
    return {
      body: { error: 'Gmail authorization expired', authenticated: false },
      status: 401 as const,
    }
  }

  const message =
    error instanceof Error ? error.message : 'Gmail request failed'

  return {
    body: {
      error: message,
      code: message.includes('Gmail API has not been used')
        ? 'gmail_api_disabled'
        : 'gmail_failed',
    },
    status: 500 as const,
  }
}

function authSuccessHtml() {
  return `<!doctype html>
    <html>
      <head><meta charset="utf-8"><title>Gmail connected</title></head>
      <body style="font-family: system-ui, sans-serif; display: grid; place-items: center; height: 100vh; margin: 0; background: #09090b; color: #fafafa;">
        <main style="text-align: center;">
          <h1>Gmail connected</h1>
          <p style="color: #a1a1aa;">You can close this window.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'oauth-success', appId: 'emails' }, '*');
              setTimeout(() => window.close(), 700);
            }
          </script>
        </main>
      </body>
    </html>`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function contentDisposition(
  filename: string,
  disposition: 'attachment' | 'inline',
) {
  const safeFilename = filename.replaceAll(/[\r\n"]/g, '_')
  return `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(
    filename,
  )}`
}

function authFailureHtml(message: string) {
  return `<!doctype html>
    <html>
      <head><meta charset="utf-8"><title>Gmail connection failed</title></head>
      <body style="font-family: system-ui, sans-serif; display: grid; place-items: center; height: 100vh; margin: 0; background: #09090b; color: #fafafa;">
        <main style="max-width: 420px; text-align: center;">
          <h1>Gmail connection failed</h1>
          <p style="color: #a1a1aa;">${escapeHtml(message)}</p>
        </main>
      </body>
    </html>`
}

app.get('/api/moldable/health', (c) => {
  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'emails',
      port: Number(process.env.MOLDABLE_PORT ?? process.env.PORT ?? 0) || null,
      status: 'ok',
      ts: Date.now(),
    },
    200,
    { 'Cache-Control': 'no-store' },
  )
})

app.get('/api/moldable/commands', async (c) => {
  const draftCount = (await listDrafts(getWorkspaceId(c.req.raw))).length

  return c.json(
    {
      commands: [
        {
          id: 'mail.compose',
          label: 'Compose email',
          description: 'Start a new message',
          icon: 'pen-line',
          group: 'Mail',
          action: { type: 'message', command: 'mail.compose' },
        },
        {
          id: 'mail.search',
          label: 'Search mail',
          description: 'Focus the mail search field',
          icon: 'search',
          group: 'Mail',
          action: { type: 'message', command: 'mail.search' },
        },
        {
          id: 'mail.refresh',
          label: 'Refresh mail',
          description: 'Fetch the latest messages',
          icon: 'refresh-cw',
          group: 'Mail',
          action: { type: 'message', command: 'mail.refresh' },
        },
        {
          id: 'mail.open-inbox',
          label: 'Open Inbox',
          icon: 'folder',
          group: 'Folders',
          action: { type: 'message', command: 'mail.open-inbox' },
        },
        {
          id: 'mail.open-sent',
          label: 'Open Sent',
          icon: 'send',
          group: 'Folders',
          action: { type: 'message', command: 'mail.open-sent' },
        },
        {
          id: 'mail.open-all',
          label: 'Open All Mail',
          icon: 'archive',
          group: 'Folders',
          action: { type: 'message', command: 'mail.open-all' },
        },
        {
          id: 'mail.open-spam',
          label: 'Open Spam',
          icon: 'ban',
          group: 'Folders',
          action: { type: 'message', command: 'mail.open-spam' },
        },
        {
          id: 'mail.open-trash',
          label: 'Open Trash',
          icon: 'trash-2',
          group: 'Folders',
          action: { type: 'message', command: 'mail.open-trash' },
        },
        ...(draftCount > 0
          ? [
              {
                id: 'mail.open-drafts',
                label: 'Open Drafts',
                description: 'Show saved local drafts',
                icon: 'file-text',
                group: 'Folders',
                action: { type: 'message', command: 'mail.open-drafts' },
              },
            ]
          : []),
      ],
    },
    200,
    { 'Cache-Control': 'no-store' },
  )
})

app.get('/api/auth/login', async (c) => {
  try {
    const url = await getAuthUrl(getWorkspaceId(c.req.raw))
    return c.json({ url })
  } catch (error) {
    console.error('Gmail login failed:', error)
    return c.json(gmailErrorResponse(error).body, 500)
  }
})

app.get('/api/auth/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  if (!code) return c.json({ error: 'No code provided' }, 400)

  try {
    await saveTokens(code, state)
    return c.html(authSuccessHtml())
  } catch (error) {
    console.error('Gmail callback failed:', error)
    return c.html(
      authFailureHtml(
        error instanceof Error ? error.message : 'Failed to connect Gmail',
      ),
      500,
    )
  }
})

app.post('/api/auth/logout', async (c) => {
  await clearTokens(getWorkspaceId(c.req.raw))
  return c.json({ success: true })
})

app.get('/api/status', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)

  try {
    if (!(await isAuthenticated(workspaceId))) {
      return c.json({ authenticated: false, profile: null })
    }

    try {
      return c.json({
        authenticated: true,
        profile: await getProfile(workspaceId),
      })
    } catch (error) {
      if (isAuthError(error)) {
        return c.json({ authenticated: false, profile: null })
      }
      console.warn('Gmail profile lookup failed:', error)
      return c.json({ authenticated: true, profile: null })
    }
  } catch (error) {
    const response = gmailErrorResponse(error)
    if (response.status === 401) {
      return c.json({ authenticated: false, profile: null }, 200)
    }
    return c.json(response.body, response.status)
  }
})

app.get('/api/labels', async (c) => {
  try {
    return c.json({ labels: await getLabels(getWorkspaceId(c.req.raw)) })
  } catch (error) {
    const response = gmailErrorResponse(error)
    return c.json(response.body, response.status)
  }
})

app.get('/api/messages', async (c) => {
  try {
    return c.json(
      await listMessages(getWorkspaceId(c.req.raw), {
        labelId: c.req.query('labelId') ?? 'INBOX',
        query: c.req.query('q') ?? undefined,
        pageToken: c.req.query('pageToken') ?? undefined,
        maxResults: numberQuery(c.req.query('maxResults'), 20),
      }),
    )
  } catch (error) {
    const response = gmailErrorResponse(error)
    return c.json(response.body, response.status)
  }
})

app.get('/api/messages/:id', async (c) => {
  try {
    return c.json({
      message: await getMessage(getWorkspaceId(c.req.raw), c.req.param('id')),
    })
  } catch (error) {
    const response = gmailErrorResponse(error)
    return c.json(response.body, response.status)
  }
})

app.get('/api/messages/:id/attachments/:attachmentId', async (c) => {
  try {
    const filename = c.req.query('filename') ?? 'attachment'
    const mimeType = c.req.query('mimeType') ?? 'application/octet-stream'
    const disposition =
      c.req.query('disposition') === 'inline' ? 'inline' : 'attachment'
    const attachment = await getAttachment(
      getWorkspaceId(c.req.raw),
      c.req.param('id'),
      c.req.param('attachmentId'),
      mimeType,
    )

    const body = Uint8Array.from(attachment.data)

    return new Response(body, {
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Length': String(attachment.data.byteLength),
        'Content-Disposition': contentDisposition(filename, disposition),
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (error) {
    const response = gmailErrorResponse(error)
    return c.json(response.body, response.status)
  }
})

app.get('/api/contacts', async (c) => {
  try {
    return c.json({
      contacts: await listContacts(
        getWorkspaceId(c.req.raw),
        c.req.query('query') ?? '',
      ),
    })
  } catch (error) {
    const response = gmailErrorResponse(error)
    return c.json(response.body, response.status)
  }
})

app.get('/api/drafts', async (c) => {
  return c.json({ drafts: await listDrafts(getWorkspaceId(c.req.raw)) })
})

app.post('/api/drafts', async (c) => {
  try {
    const composer = draftComposerSchema.parse(await c.req.json())
    return c.json({
      draft: await saveDraft(getWorkspaceId(c.req.raw), composer),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid draft' }, 400)
    }
    throw error
  }
})

app.delete('/api/drafts/:id', async (c) => {
  await deleteDraft(getWorkspaceId(c.req.raw), c.req.param('id'))
  return c.json({ ok: true })
})

app.post('/api/messages/:id/actions', async (c) => {
  let body: z.infer<typeof messageActionSchema> | null = null
  try {
    body = messageActionSchema.parse(await c.req.json())
    await applyMessageAction(
      getWorkspaceId(c.req.raw),
      c.req.param('id'),
      body.action,
      { until: body.until },
    )
    return c.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid message action' }, 400)
    }
    const response = gmailErrorResponse(error, {
      route: 'POST /api/messages/:id/actions',
      messageId: c.req.param('id'),
      body,
    })
    return c.json(response.body, response.status)
  }
})

app.post('/api/messages/:id/unsubscribe-archive', async (c) => {
  try {
    await unsubscribeAndArchive(getWorkspaceId(c.req.raw), c.req.param('id'))
    return c.json({ ok: true })
  } catch (error) {
    const response = gmailErrorResponse(error, {
      route: 'POST /api/messages/:id/unsubscribe-archive',
      messageId: c.req.param('id'),
    })
    return c.json(response.body, response.status)
  }
})

const labelChangeSchema = z
  .object({
    addLabelIds: z.array(z.string().min(1)).max(50).optional(),
    removeLabelIds: z.array(z.string().min(1)).max(50).optional(),
  })
  .refine(
    (value) =>
      (value.addLabelIds?.length ?? 0) + (value.removeLabelIds?.length ?? 0) >
      0,
    { message: 'At least one label change is required' },
  )

app.post('/api/messages/:id/labels', async (c) => {
  let body: z.infer<typeof labelChangeSchema> | null = null
  try {
    body = labelChangeSchema.parse(await c.req.json())
    await modifyMessageLabels(
      getWorkspaceId(c.req.raw),
      c.req.param('id'),
      body,
    )
    return c.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid label change' }, 400)
    }
    const response = gmailErrorResponse(error, {
      route: 'POST /api/messages/:id/labels',
      messageId: c.req.param('id'),
      body,
    })
    return c.json(response.body, response.status)
  }
})

app.post('/api/send', async (c) => {
  try {
    const body = sendMailSchema.parse(await c.req.json())
    const result = await sendMessage(getWorkspaceId(c.req.raw), body)

    return c.json({ ok: true, ...result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Recipient, subject, and body are required' }, 400)
    }
    const response = gmailErrorResponse(error)
    return c.json(response.body, response.status)
  }
})

const briefingMessageSchema = z.object({
  id: z.string(),
  threadId: z.string().optional().default(''),
  from: z.string().optional().default(''),
  to: z.string().optional().default(''),
  subject: z.string().optional().default(''),
  date: z.string().optional().default(''),
  snippet: z.string().optional().default(''),
  bodyText: z.string().optional(),
  bodyHtmlText: z.string().optional(),
  labelIds: z.array(z.string()).optional().default([]),
  unread: z.boolean().optional().default(false),
  starred: z.boolean().optional().default(false),
  important: z.boolean().optional().default(false),
  internalDate: z.number().optional().default(0),
})

const briefingBodySchema = z.object({
  messages: z.array(briefingMessageSchema).min(1).max(100),
  account: z.string().nullable().optional(),
  force: z.boolean().optional(),
})

function normalizeBriefingMessages(
  raw: z.infer<typeof briefingMessageSchema>[],
): MailMessageSummary[] {
  return raw.map((message) => ({
    id: message.id,
    threadId: message.threadId,
    from: message.from,
    to: message.to,
    subject: message.subject,
    date: message.date,
    snippet: message.snippet,
    bodyText: message.bodyText,
    bodyHtmlText: message.bodyHtmlText,
    labelIds: message.labelIds,
    unread: message.unread,
    starred: message.starred,
    important: message.important,
    internalDate: message.internalDate,
  }))
}

async function cacheBriefing({
  fingerprint,
  markdown,
  generatedAt,
  messages,
  account,
  workspaceId,
}: {
  fingerprint: string
  markdown: string
  generatedAt: string
  messages: MailMessageSummary[]
  account: string | null
  workspaceId: string
}) {
  const unreadCount = messages.filter((m) => m.unread).length
  const entry: BriefingCache = {
    fingerprint,
    markdown,
    generatedAt,
    messageCount: messages.length,
    unreadCount,
    account,
  }
  await writeCachedBriefing(entry, workspaceId)
}

app.get('/api/briefing', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  const cached = await readCachedBriefing(workspaceId)
  if (!cached) return c.json({ cached: null })

  const fingerprint = c.req.query('fingerprint')
  return c.json({
    cached,
    match: fingerprint ? cached.fingerprint === fingerprint : null,
  })
})

app.post('/api/briefing/stream', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)

  let body: z.infer<typeof briefingBodySchema>
  try {
    body = briefingBodySchema.parse(await c.req.json())
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid briefing payload' }, 400)
    }
    throw error
  }

  const messages = normalizeBriefingMessages(body.messages)
  const account = body.account ?? null
  const fingerprint = computeBriefingFingerprint(messages, account)

  if (!body.force) {
    const cached = await readCachedBriefing(workspaceId)
    if (cached && cached.fingerprint === fingerprint && cached.markdown) {
      return new Response(cached.markdown, {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-transform',
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Emails-Briefing-Source': 'cache',
          'X-Emails-Briefing-Fingerprint': fingerprint,
          'X-Emails-Briefing-Generated-At': cached.generatedAt,
        },
      })
    }
  }

  let upstream: Response
  try {
    upstream = await streamInboxBriefing({ messages, account, workspaceId })
  } catch (error) {
    console.error('Failed to stream inbox briefing:', error)
    try {
      const generatedAt = new Date().toISOString()
      const markdown = await generateInboxBriefing({
        messages,
        account,
        workspaceId,
      })

      if (!markdown) {
        throw new Error('Buffered briefing response was empty')
      }

      await cacheBriefing({
        fingerprint,
        markdown,
        generatedAt,
        messages,
        account,
        workspaceId,
      })

      return new Response(markdown, {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-transform',
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Emails-Briefing-Source': 'stream',
          'X-Emails-Briefing-Fallback': 'buffered',
          'X-Emails-Briefing-Fingerprint': fingerprint,
          'X-Emails-Briefing-Generated-At': generatedAt,
        },
      })
    } catch (fallbackError) {
      console.error(
        'Failed to generate buffered inbox briefing:',
        fallbackError,
      )
    }

    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate briefing',
      },
      500,
    )
  }

  if (!upstream.body) {
    return c.json({ error: 'Empty briefing stream' }, 500)
  }

  const started = new Date().toISOString()
  const clientStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader()
      const decoder = new TextDecoder()
      const encoder = new TextEncoder()
      let buffered = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffered += decoder.decode(value, { stream: true })
          controller.enqueue(value)
        }

        buffered += decoder.decode()
      } catch (error) {
        console.warn('Failed to stream inbox briefing:', error)
        controller.error(error)
        return
      } finally {
        reader.releaseLock()
      }

      let markdown = buffered.trim()
      if (!markdown) {
        try {
          markdown = await generateInboxBriefing({
            messages,
            account,
            workspaceId,
          })
          if (markdown) {
            controller.enqueue(encoder.encode(markdown))
          }
        } catch (error) {
          console.warn('Buffered inbox briefing fallback failed:', error)
        }
      }

      controller.close()
      if (!markdown) return

      try {
        await cacheBriefing({
          fingerprint,
          markdown,
          generatedAt: started,
          messages,
          account,
          workspaceId,
        })
      } catch (error) {
        console.warn('Failed to cache inbox briefing:', error)
      }
    },
  })

  return new Response(clientStream, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Emails-Briefing-Source': 'stream',
      'X-Emails-Briefing-Fingerprint': fingerprint,
      'X-Emails-Briefing-Generated-At': started,
    },
  })
})

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)

  try {
    const body = rpcRequestSchema.parse(await c.req.json())

    if (body.method === 'mail.status') {
      return c.json({
        ok: true,
        result: { connected: await isAuthenticated(workspaceId) },
      })
    }

    if (
      body.method === 'messages.search' ||
      body.method === 'messages.unread'
    ) {
      const params = messageSearchParamsSchema.parse(body.params)
      const query =
        body.method === 'messages.unread'
          ? ['is:unread', params?.query].filter(Boolean).join(' ')
          : params?.query
      const result = await listMessages(workspaceId, {
        labelId: params?.labelId ?? 'INBOX',
        query,
        maxResults: params?.maxResults ?? 10,
      })

      return c.json({ ok: true, result: result.messages })
    }

    if (body.method === 'messages.get') {
      const params = messageGetParamsSchema.parse(body.params)
      return c.json({
        ok: true,
        result: await getMessage(workspaceId, params.id),
      })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Mail does not expose ${body.method}.`,
        },
      },
      404,
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'GmailNotConnected') {
      return c.json({
        ok: false,
        error: {
          code: 'gmail_not_connected',
          message: 'Connect Gmail before reading email in this workspace.',
        },
      })
    }

    if (error instanceof z.ZodError) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_params',
            message: 'Mail received invalid RPC parameters.',
            detail: error.flatten(),
          },
        },
        400,
      )
    }

    const response = gmailErrorResponse(error)
    return c.json(
      {
        ok: false,
        error: {
          code:
            response.status === 401 ? 'gmail_not_connected' : 'gmail_failed',
          message: response.body.error,
        },
      },
      response.status,
    )
  }
})
