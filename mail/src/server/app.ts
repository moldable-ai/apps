import { getWorkspaceFromRequest } from '@moldable-ai/storage'
import type { MailLabel, MailMessageSummary } from '../client/types'
import {
  ACTION_GROUPS,
  appendTriageSignal,
  archiveTriageRule,
  clearActionSuggestionsCache,
  computeActionSuggestionsFingerprint,
  generateActionSuggestions,
  readTriageRules,
  readTriageSignals,
  regenerateTriageRules,
  upsertTriageRule,
} from './action-suggestions'
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
  getThread,
  isAuthError,
  listContacts,
  listMessages,
  modifyMessageLabels,
  sendMessage,
  startGmailTokenKeepalive,
  startMailBackgroundSync,
  unsubscribeAndArchive,
} from './gmail-service'
import { readCachedProfile, writeCachedProfile } from './profile-cache'
import { generateMailSearchQuery } from './search-query'
import { readCachedToday, writeCachedToday } from './today-cache'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'

export const app = new Hono()

app.use('/api/*', cors())

const profileRefreshes = new Map<string, Promise<void>>()
const profileRefreshedAt = new Map<string, number>()
const PROFILE_REFRESH_MIN_INTERVAL_MS = 60_000

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

const searchQuerySchema = z.object({
  query: z.string().trim().min(1).max(500),
  currentLabelId: z.string().trim().optional(),
})

const messageSearchParamsSchema = z
  .object({
    query: z.string().optional(),
    labelId: z.string().optional(),
    maxResults: z.number().int().min(1).max(50).optional(),
  })
  .optional()

const messageListParamsSchema = z
  .object({
    query: z.string().optional(),
    labelId: z.string().optional(),
    pageToken: z.string().optional(),
    maxResults: z.number().int().min(1).max(100).optional(),
    includeBodies: z.boolean().optional(),
  })
  .optional()

const triageClassifyParamsSchema = z
  .object({
    query: z.string().optional(),
    labelId: z.string().optional(),
    pageToken: z.string().optional(),
    maxResults: z.number().int().min(1).max(100).optional(),
    force: z.boolean().optional(),
    includeMessages: z.boolean().optional(),
    account: z.string().nullable().optional(),
  })
  .optional()

const triageClassifyMessagesParamsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  force: z.boolean().optional(),
  includeMessages: z.boolean().optional(),
  account: z.string().nullable().optional(),
})

const triageRulesListParamsSchema = z
  .object({
    account: z.string().nullable().optional(),
  })
  .optional()

const triageRuleUpsertParamsSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  body: z.string().min(1),
  groupId: z.enum([...ACTION_GROUPS] as [string, ...string[]]),
  labelName: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  confidence: z.number().min(0).max(1).optional(),
  exceptions: z.array(z.string()).optional(),
  account: z.string().nullable().optional(),
})

const triageRuleArchiveParamsSchema = z.object({
  id: z.string().min(1),
  account: z.string().nullable().optional(),
})

const triageCacheClearParamsSchema = z
  .object({
    account: z.string().nullable().optional(),
  })
  .optional()

const messageGetParamsSchema = z.object({
  id: z.string().min(1),
})

function getWorkspaceId(request: Request) {
  const urlWorkspace = new URL(request.url).searchParams.get('workspace')
  return getWorkspaceFromRequest(request) ?? urlWorkspace ?? 'personal'
}

async function resolveTriageAccount(
  workspaceId: string,
  explicitAccount?: string | null,
) {
  if (explicitAccount !== undefined) return explicitAccount?.trim() || null
  return (await getProfile(workspaceId).catch(() => null))?.emailAddress ?? null
}

function senderName(raw: string) {
  if (!raw) return 'Unknown sender'
  const match = raw.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/)
  if (match && match[1]) return match[1].trim()
  const emailMatch = raw.match(/<([^>]+)>/) ?? raw.match(/([\w.+-]+@[\w.-]+)/)
  if (emailMatch && emailMatch[1]) return emailMatch[1].trim()
  return raw.trim()
}

function numberQuery(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback)
  return Number.isFinite(parsed) ? parsed : fallback
}

function rpcMessageSummary(message: MailMessageSummary) {
  return {
    id: message.id,
    threadId: message.threadId,
    from: message.from,
    to: message.to,
    subject: message.subject,
    date: message.date,
    snippet: message.snippet,
    labelIds: message.labelIds,
    unread: message.unread,
    starred: message.starred,
    important: message.important,
    internalDate: message.internalDate,
    snoozedUntil: message.snoozedUntil,
    bodyCached: message.bodyCached,
    attachments: message.attachments,
    unsubscribe: message.unsubscribe,
  }
}

function normalizeRpcLabels(
  labels: Awaited<ReturnType<typeof getLabels>>,
): MailLabel[] {
  return labels
    .filter(
      (label): label is MailLabel =>
        typeof label.id === 'string' &&
        typeof label.name === 'string' &&
        (label.type === 'system' || label.type === 'user'),
    )
    .map((label) => ({
      id: label.id,
      name: label.name,
      type: label.type,
      messageListVisibility: label.messageListVisibility,
      labelListVisibility: label.labelListVisibility,
      color: label.color,
    }))
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

function refreshProfileInBackground(workspaceId: string) {
  const existing = profileRefreshes.get(workspaceId)
  if (existing) return true

  const lastRefreshedAt = profileRefreshedAt.get(workspaceId) ?? 0
  if (Date.now() - lastRefreshedAt < PROFILE_REFRESH_MIN_INTERVAL_MS) {
    return false
  }

  const refresh = getProfile(workspaceId)
    .then((profile) => writeCachedProfile(workspaceId, profile))
    .catch((error) => {
      if (isAuthError(error)) return
      console.warn('Gmail profile refresh failed:', error)
    })
    .finally(() => {
      profileRefreshedAt.set(workspaceId, Date.now())
      if (profileRefreshes.get(workspaceId) === refresh) {
        profileRefreshes.delete(workspaceId)
      }
    })

  profileRefreshes.set(workspaceId, refresh)
  return true
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
              window.opener.postMessage({ type: 'oauth-success', appId: 'mail' }, '*');
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
      appId: process.env.MOLDABLE_APP_ID ?? 'mail',
      port: Number(process.env.MOLDABLE_PORT ?? process.env.PORT ?? 0) || null,
      status: 'ok',
      ts: Date.now(),
    },
    200,
    { 'Cache-Control': 'no-store' },
  )
})

app.get('/api/moldable/today', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  const generatedAt = new Date().toISOString()
  const cachedToday = await readCachedToday(workspaceId).catch((error) => {
    console.warn('Failed to read Today mail cache:', error)
    return null
  })
  const items: unknown[] = []
  let resume: unknown = null

  try {
    if (!(await isAuthenticated(workspaceId))) {
      return c.json({ items, resume, generatedAt })
    }

    // TIMELY: surface only the messages Gmail itself flagged as important AND
    // still unread — the genuinely actionable subset, not the raw unread pile.
    // Silent when there's nothing important waiting.
    const important = await listMessages(workspaceId, {
      labelId: 'INBOX',
      query: 'is:important is:unread',
      maxResults: 5,
    })

    if (important && important.messages.length > 0) {
      const messages = important.messages
      const count =
        important.resultSizeEstimate && important.resultSizeEstimate > 0
          ? important.resultSizeEstimate
          : messages.length
      const top = messages[0]
      const sender = senderName(top.from)
      const subject = top.subject.trim() || '(no subject)'

      // A concrete handoff: hand the chat the actual senders/subjects so it can
      // triage, summarize, and draft replies — multistep work no single rpc does.
      const list = messages
        .slice(0, 5)
        .map(
          (m) =>
            `- ${senderName(m.from)}: ${m.subject.trim() || '(no subject)'}`,
        )
        .join('\n')
      const triagePrompt =
        `Help me clear my important unread email. There ${count === 1 ? 'is' : 'are'} ${count} ` +
        `important unread message${count === 1 ? '' : 's'} in my inbox:\n${list}\n\n` +
        `For each, give me a one-line summary of what they want and whether it needs a reply. ` +
        `Draft replies for the ones that do. ` +
        `When you're done, refresh the home view by calling the Moldable app API with targetAppId "today" and method "today.refresh".`

      items.push({
        id: 'mail:important-unread',
        kind: 'timely',
        title:
          count === 1
            ? `${sender}: ${subject}`
            : `${count} important emails unread`,
        subtitle:
          count === 1 ? undefined : `Latest from ${sender} · ${subject}`,
        icon: '📨',
        priority: 75,
        actions: [
          { type: 'open-app', label: 'Open inbox' },
          { type: 'message', label: 'Triage with chat', prompt: triagePrompt },
        ],
      })
    }

    // RESUME: an unfinished draft left untouched for over an hour. Lead with the
    // thing being written, not a "Finish your draft" prefix.
    const drafts = await listDrafts(workspaceId).catch(() => [])
    const staleDraft = drafts.find(
      (draft) => Date.now() - draft.updatedAt > 60 * 60 * 1000,
    )
    if (staleDraft) {
      const subject = staleDraft.composer.subject.trim()
      const recipient = staleDraft.composer.to.trim()
      resume = {
        title: subject || (recipient ? `To ${recipient}` : 'Unsent draft'),
        subtitle: subject && recipient ? `To ${recipient}` : undefined,
        icon: '✍️',
        lastTouchedAt: new Date(staleDraft.updatedAt).toISOString(),
      }
    }
  } catch {
    // Transient Gmail failures should not make Today cards flicker out.
    if (cachedToday) return c.json(cachedToday)
    return c.json({ items: [], resume: null, generatedAt })
  }

  const payload = { items, resume, generatedAt }
  await writeCachedToday(workspaceId, payload).catch((error) => {
    console.warn('Failed to write Today mail cache:', error)
  })
  return c.json(payload)
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
  const workspaceId = getWorkspaceId(c.req.raw)
  await clearTokens(workspaceId)
  await writeCachedProfile(workspaceId, null)
  return c.json({ success: true })
})

app.get('/api/status', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)

  try {
    if (!(await isAuthenticated(workspaceId))) {
      return c.json({ authenticated: false, profile: null })
    }

    startGmailTokenKeepalive(workspaceId)
    startMailBackgroundSync(workspaceId)
    const profile = await readCachedProfile(workspaceId)
    const syncing = refreshProfileInBackground(workspaceId)
    return c.json({ authenticated: true, profile, syncing })
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

app.post('/api/search-query', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)

  try {
    const input = searchQuerySchema.parse(await c.req.json())
    const labels = await getLabels(workspaceId).catch((error) => {
      console.warn('Failed to load labels for AI mail search:', error)
      return []
    })
    return c.json(
      await generateMailSearchQuery(
        {
          query: input.query,
          currentLabelId: input.currentLabelId,
          labels,
        },
        workspaceId,
      ),
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Search query is invalid.' }, 400)
    }
    console.warn('Failed to translate natural-language mail search:', error)
    return c.json({ error: 'Failed to translate search query.' }, 500)
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

app.get('/api/threads/:id', async (c) => {
  try {
    return c.json({
      thread: await getThread(getWorkspaceId(c.req.raw), c.req.param('id')),
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

const suggestionLabelSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['system', 'user']),
  messageListVisibility: z.enum(['hide', 'show']).optional(),
  labelListVisibility: z
    .enum(['labelHide', 'labelShow', 'labelShowIfUnread'])
    .optional(),
  color: z
    .object({
      textColor: z.string().optional(),
      backgroundColor: z.string().optional(),
    })
    .optional(),
})

const actionSuggestionsBodySchema = z.object({
  messages: z
    .array(
      briefingMessageSchema.extend({
        unsubscribe: z
          .object({
            mailto: z.string().optional(),
            url: z.string().optional(),
            oneClick: z.boolean().optional(),
          })
          .optional(),
      }),
    )
    .min(1)
    .max(100),
  labels: z.array(suggestionLabelSchema).max(200).optional().default([]),
  account: z.string().nullable().optional(),
  force: z.boolean().optional(),
})

const actionGroupSchema = z.enum([...ACTION_GROUPS] as [string, ...string[]])

const triageSignalBodySchema = z.object({
  account: z.string().nullable().optional(),
  message: z.object({
    id: z.string(),
    from: z.string().optional().default(''),
    subject: z.string().optional().default(''),
    snippet: z.string().optional().default(''),
    labelIds: z.array(z.string()).optional().default([]),
  }),
  suggestedGroupId: actionGroupSchema.optional(),
  finalGroupId: actionGroupSchema,
  outcome: z.enum(['approved', 'corrected', 'label_changed', 'dismissed']),
  suggestedLabelId: z.string().optional(),
  suggestedLabelName: z.string().optional(),
  finalLabelId: z.string().optional(),
  finalLabelName: z.string().optional(),
  reason: z.string().optional(),
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

const BRIEFING_GENERATION_COOLDOWN_MS = 60_000

function briefingIsCoolingDown(cached: BriefingCache) {
  const generatedAt = Date.parse(cached.generatedAt)
  return Number.isFinite(generatedAt)
    ? Date.now() - generatedAt < BRIEFING_GENERATION_COOLDOWN_MS
    : false
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

app.post('/api/action-suggestions', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)

  try {
    const body = actionSuggestionsBodySchema.parse(await c.req.json())
    const messages = normalizeBriefingMessages(body.messages)
    const input = {
      messages: messages.map((message, index) => ({
        ...message,
        unsubscribe: body.messages[index]?.unsubscribe,
      })),
      labels: body.labels,
      account: body.account ?? null,
      force: body.force,
    }
    const result = await generateActionSuggestions(input, workspaceId)
    const account = input.account ?? null
    const [signals, rules] = await Promise.all([
      readTriageSignals(workspaceId, account),
      readTriageRules(workspaceId, account),
    ])

    return c.json({
      suggestions: result.suggestions,
      fingerprint: computeActionSuggestionsFingerprint(input, rules),
      generatedAt: new Date().toISOString(),
      signalCount: signals.length,
      source: result.syncing ? 'cache' : 'generated',
      syncing: result.syncing,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid action suggestion payload' }, 400)
    }
    console.error('Failed to generate action suggestions:', error)
    const message = error instanceof Error ? error.message : String(error)
    return c.json(
      { error: `Failed to generate action suggestions: ${message}` },
      500,
    )
  }
})

app.get('/api/action-suggestions/rules', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  const account = await resolveTriageAccount(
    workspaceId,
    c.req.query('account') ?? undefined,
  )
  return c.json({ rules: await readTriageRules(workspaceId, account), account })
})

app.post('/api/action-suggestions/rules/generate', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  try {
    const body = z
      .object({ account: z.string().nullable().optional() })
      .parse(await c.req.json().catch(() => ({})))
    const account = await resolveTriageAccount(workspaceId, body.account)
    return c.json({
      rules: await regenerateTriageRules(workspaceId, account),
      account,
    })
  } catch (error) {
    console.error('Failed to generate triage rules:', error)
    return c.json({ error: 'Failed to generate triage rules' }, 500)
  }
})

app.post('/api/action-suggestions/signals', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)

  try {
    const body = triageSignalBodySchema.parse(await c.req.json())
    const account = await resolveTriageAccount(workspaceId, body.account)
    const signal = await appendTriageSignal(workspaceId, {
      account,
      message: body.message,
      suggestedGroupId: body.suggestedGroupId as
        | (typeof ACTION_GROUPS)[number]
        | undefined,
      finalGroupId: body.finalGroupId as (typeof ACTION_GROUPS)[number],
      outcome: body.outcome,
      suggestedLabelId: body.suggestedLabelId,
      suggestedLabelName: body.suggestedLabelName,
      finalLabelId: body.finalLabelId,
      finalLabelName: body.finalLabelName,
      reason: body.reason,
    })

    return c.json({ ok: true, signal })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid triage signal' }, 400)
    }
    console.error('Failed to record triage signal:', error)
    const message = error instanceof Error ? error.message : String(error)
    return c.json({ error: `Failed to record triage signal: ${message}` }, 500)
  }
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
    if (cached?.markdown) {
      const exactMatch = cached.fingerprint === fingerprint
      const coolingDown = briefingIsCoolingDown(cached)
      if (exactMatch || coolingDown) {
        return new Response(cached.markdown, {
          status: 200,
          headers: {
            'Cache-Control': 'no-cache, no-transform',
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Emails-Briefing-Source': 'cache',
            'X-Emails-Briefing-Fingerprint': cached.fingerprint,
            'X-Emails-Briefing-Generated-At': cached.generatedAt,
            ...(coolingDown && !exactMatch
              ? { 'X-Emails-Briefing-Cooldown': 'true' }
              : {}),
          },
        })
      }
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

    if (body.method === 'messages.list' || body.method === 'messages.inbox') {
      const params = messageListParamsSchema.parse(body.params)
      const result = await listMessages(workspaceId, {
        labelId:
          body.method === 'messages.inbox'
            ? 'INBOX'
            : (params?.labelId ?? 'INBOX'),
        query: params?.query,
        pageToken: params?.pageToken,
        maxResults: params?.maxResults ?? 25,
      })

      return c.json({
        ok: true,
        result: {
          messages: params?.includeBodies
            ? result.messages
            : result.messages.map(rpcMessageSummary),
          nextPageToken: result.nextPageToken,
          resultSizeEstimate: result.resultSizeEstimate,
        },
      })
    }

    if (body.method === 'messages.get') {
      const params = messageGetParamsSchema.parse(body.params)
      return c.json({
        ok: true,
        result: await getMessage(workspaceId, params.id),
      })
    }

    if (body.method === 'triage.rules.list') {
      const params = triageRulesListParamsSchema.parse(body.params)
      const account = await resolveTriageAccount(workspaceId, params?.account)
      return c.json({
        ok: true,
        result: { rules: await readTriageRules(workspaceId, account), account },
      })
    }

    if (body.method === 'triage.rules.upsert') {
      const params = triageRuleUpsertParamsSchema.parse(body.params)
      const account = await resolveTriageAccount(workspaceId, params.account)
      const rule = await upsertTriageRule(workspaceId, account, {
        id: params.id,
        title: params.title,
        body: params.body,
        action: {
          groupId: params.groupId,
          labelName: params.labelName,
        },
        status: params.status ?? 'active',
        confidence: params.confidence ?? 0.8,
        exceptions: params.exceptions,
        evidenceSignalIds: [],
      })
      return c.json({ ok: true, result: { rule, account } })
    }

    if (body.method === 'triage.rules.archive') {
      const params = triageRuleArchiveParamsSchema.parse(body.params)
      const account = await resolveTriageAccount(workspaceId, params.account)
      return c.json({
        ok: true,
        result: {
          rule: await archiveTriageRule(workspaceId, account, params.id),
          account,
        },
      })
    }

    if (body.method === 'triage.cache.clear') {
      const params = triageCacheClearParamsSchema.parse(body.params)
      const account = await resolveTriageAccount(workspaceId, params?.account)
      await clearActionSuggestionsCache(workspaceId, account)
      return c.json({ ok: true, result: { cleared: true, account } })
    }

    if (body.method === 'triage.reclassify.messages') {
      const params = triageClassifyMessagesParamsSchema.parse(body.params)
      const [labels, messages] = await Promise.all([
        getLabels(workspaceId).then(normalizeRpcLabels),
        Promise.all(params.ids.map((id) => getMessage(workspaceId, id))),
      ])
      const account = await resolveTriageAccount(workspaceId, params.account)
      const result = await generateActionSuggestions(
        {
          messages,
          labels,
          account,
          force: params.force ?? true,
        },
        workspaceId,
      )
      return c.json({
        ok: true,
        result: {
          suggestions: result.suggestions,
          messages: params.includeMessages
            ? messages
            : messages.map(rpcMessageSummary),
        },
      })
    }

    if (
      body.method === 'triage.classify' ||
      body.method === 'triage.reclassify.inbox'
    ) {
      const params = triageClassifyParamsSchema.parse(body.params)
      const labels = normalizeRpcLabels(await getLabels(workspaceId))
      const list = await listMessages(workspaceId, {
        labelId:
          body.method === 'triage.reclassify.inbox'
            ? 'INBOX'
            : (params?.labelId ?? 'INBOX'),
        query: params?.query,
        pageToken: params?.pageToken,
        maxResults: params?.maxResults ?? 25,
      })
      const account = await resolveTriageAccount(workspaceId, params?.account)
      const result = await generateActionSuggestions(
        {
          messages: list.messages,
          labels,
          account,
          force: params?.force ?? body.method === 'triage.reclassify.inbox',
        },
        workspaceId,
      )
      return c.json({
        ok: true,
        result: {
          suggestions: result.suggestions,
          messages: params?.includeMessages
            ? list.messages
            : list.messages.map(rpcMessageSummary),
          nextPageToken: list.nextPageToken,
          resultSizeEstimate: list.resultSizeEstimate,
        },
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
