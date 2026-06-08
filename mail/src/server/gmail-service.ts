import { invokeAivaultJson } from './aivault'
import { readCachedContacts, writeCachedContacts } from './contacts-cache'
import { isAuthenticated } from './gmail-auth'
import {
  mergeCachedBodyIntoSummary,
  readCachedAttachment,
  readCachedMessage,
  readCachedMessages,
  reconcileCachedFolderPage,
  updateCachedMessageLabels,
  updateCachedThreadLabels,
  writeCachedAttachment,
  writeCachedMessage,
  writeCachedMessageSummary,
} from './message-cache'
import {
  getActiveSnoozeIds,
  listActiveSnoozes,
  popExpiredSnoozes,
  snoozeMessage,
  unsnoozeMessage,
} from './snooze'
import { gmail_v1 } from 'googleapis'

export interface MailProfile {
  emailAddress?: string | null
  messagesTotal?: number | null
  threadsTotal?: number | null
  historyId?: string | null
}

export interface MailMessageSummary {
  id: string
  threadId: string
  from: string
  to: string
  subject: string
  date: string
  snippet: string
  labelIds: string[]
  unread: boolean
  starred: boolean
  important: boolean
  internalDate: number
  snoozedUntil?: number
  bodyText?: string
  bodyHtmlText?: string
  bodyCached?: boolean
  attachments?: MailAttachment[]
  unsubscribe?: MailUnsubscribe
}

export interface MailMessageDetail extends MailMessageSummary {
  cc: string
  bodyText: string
  bodyHtml: string
  bodyHtmlText: string
  attachments: MailAttachment[]
}

export interface MailThreadDetail {
  id: string
  messages: MailMessageDetail[]
}

export interface MailAttachment {
  id: string
  filename: string
  mimeType: string
  size: number
  attachmentId?: string
  inline: boolean
}

export interface MailUnsubscribe {
  mailto?: string
  url?: string
  oneClick?: boolean
}

export type MessageAction =
  | 'archive'
  | 'trash'
  | 'untrash'
  | 'markRead'
  | 'markUnread'
  | 'star'
  | 'unstar'
  | 'important'
  | 'unimportant'
  | 'spam'
  | 'notSpam'
  | 'snooze'
  | 'unsnooze'

export interface MessageActionOptions {
  /** Wake time for snooze, epoch milliseconds. */
  until?: number
}

export interface SendMailInput {
  to: string
  cc?: string
  bcc?: string
  subject: string
  body: string
  threadId?: string
}

export interface MailAttachmentDownload {
  data: Buffer
  mimeType: string
}

export interface MailContact {
  id: string
  name: string
  email: string
}

const detailWarmups = new Map<string, Promise<MailMessageDetail>>()
const contactsWarmups = new Map<string, Promise<MailContact[]>>()
const contactsScopeWarnings = new Set<string>()
const gmailTokenKeepalives = new Map<string, ReturnType<typeof setInterval>>()
const messageListSyncs = new Map<string, Promise<void>>()
const messageListSyncedAt = new Map<string, number>()
const mailBackgroundSyncs = new Map<string, ReturnType<typeof setInterval>>()
const mailBackgroundRefreshes = new Set<string>()

const GMAIL_TOKEN_KEEPALIVE_INTERVAL_MS = 55 * 60 * 1000
const GMAIL_TOKEN_KEEPALIVE_INITIAL_DELAY_MS = 30 * 1000
const BACKGROUND_MESSAGE_SYNC_MIN_INTERVAL_MS = 5_000
const MAIL_BACKGROUND_SYNC_INTERVAL_MS = 60_000
const GMAIL_METADATA_CONCURRENCY = 4
const CACHE_PAGE_TOKEN_PREFIX = 'cache:'

function detailWarmupKey(workspaceId: string, id: string) {
  return `${workspaceId}:${id}`
}

function messageListSyncKey(workspaceId: string, options: ListMessagesOptions) {
  return JSON.stringify({
    workspaceId,
    labelId: options.labelId ?? 'INBOX',
    query: options.query ?? '',
    maxResults: options.maxResults ?? 20,
  })
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
) {
  const results: R[] = []

  for (let index = 0; index < items.length; index += concurrency) {
    const batch = items.slice(index, index + concurrency)
    results.push(...(await Promise.all(batch.map(mapper))))
  }

  return results
}

export function isAuthError(error: unknown) {
  const candidate = error as {
    code?: number
    status?: number
    response?: { status?: number }
    message?: string
  }
  const message = candidate.message ?? ''

  return (
    candidate.code === 401 ||
    candidate.status === 401 ||
    candidate.response?.status === 401 ||
    message.includes('client_secret is missing') ||
    message.includes('invalid_grant') ||
    message.includes('oauth2 token endpoint returned 400') ||
    message.includes('secret revoked')
  )
}

export function isInsufficientAuthScope(error: unknown) {
  const candidate = error as {
    code?: number | string
    status?: number
    response?: { status?: number; json?: unknown }
  }
  const body = candidate.response?.json as
    | {
        error?: {
          details?: Array<{
            reason?: unknown
            metadata?: { service?: unknown; method?: unknown }
          }>
        }
      }
    | undefined

  return (
    (candidate.status === 403 ||
      candidate.code === 403 ||
      candidate.response?.status === 403) &&
    (body?.error?.details ?? []).some(
      (detail) => detail.reason === 'ACCESS_TOKEN_SCOPE_INSUFFICIENT',
    )
  )
}

async function ensureGmailConnected(workspaceId: string) {
  if (!(await isAuthenticated(workspaceId))) {
    const error = new Error('Gmail is not connected')
    error.name = 'GmailNotConnected'
    throw error
  }
}

async function gmailJson<T>(
  workspaceId: string,
  capability: string,
  options: { method?: string; path: string; body?: Record<string, unknown> },
) {
  await ensureGmailConnected(workspaceId)
  return invokeAivaultJson<T>(workspaceId, capability, {
    method: options.method ?? 'GET',
    path: options.path,
    headers: options.body ? { 'content-type': 'application/json' } : undefined,
    body: options.body,
  })
}

function gmailPath(pathname: string, params?: URLSearchParams) {
  const query = params?.toString()
  return `/gmail/v1/users/me${pathname}${query ? `?${query}` : ''}`
}

function peoplePath(pathname: string, params?: URLSearchParams) {
  // Google People API field masks require comma-separated paths. When this path
  // is passed through aivault, an encoded comma is forwarded literally to
  // Google, so keep commas readable in query values.
  const query = params?.toString().replace(/%2C/gi, ',')
  return `${pathname}${query ? `?${query}` : ''}`
}

function appendParam(
  params: URLSearchParams,
  name: string,
  value: string | number | boolean | undefined,
) {
  if (value === undefined || value === '') return
  params.append(name, String(value))
}

function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string,
) {
  return (
    headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())
      ?.value ?? ''
  )
}

function decodeBase64Url(data: string | null | undefined) {
  if (!data) return ''
  return Buffer.from(normalizeBase64Url(data), 'base64').toString('utf8')
}

function normalizeBase64Url(data: string) {
  const normalized = data.replaceAll('-', '+').replaceAll('_', '/')
  const padding = normalized.length % 4
  return padding === 0
    ? normalized
    : normalized.padEnd(normalized.length + 4 - padding, '=')
}

function stripHtml(html: string) {
  return decodeEntities(
    html
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  )
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function parseListUnsubscribe(
  value: string,
  postValue: string,
): MailUnsubscribe | undefined {
  const headerValue = value.trim()
  if (!headerValue) return undefined

  const bracketed = Array.from(headerValue.matchAll(/<([^>]+)>/g))
    .map((match) => match[1]?.trim())
    .filter((candidate): candidate is string => Boolean(candidate))
  const candidates = bracketed.length
    ? bracketed
    : headerValue
        .split(',')
        .map((candidate) => candidate.trim().replace(/^<|>$/g, ''))
        .filter(Boolean)

  const oneClick = /list-unsubscribe\s*=\s*one-click/i.test(postValue)
  const mailto = candidates.find((candidate) => /^mailto:/i.test(candidate))
  const url = candidates.find((candidate) => /^https:\/\//i.test(candidate))

  if (url && oneClick) return { url, oneClick }
  if (mailto) return { mailto, oneClick }
  return undefined
}

function normalizeCid(value: string) {
  const withoutProtocol = value
    .trim()
    .replace(/^cid:/i, '')
    .replace(/^<|>$/g, '')

  try {
    return decodeURIComponent(withoutProtocol).toLowerCase()
  } catch {
    return withoutProtocol.toLowerCase()
  }
}

function attachmentIdentifiers(part: gmail_v1.Schema$MessagePart) {
  return [
    getHeader(part.headers, 'Content-ID'),
    getHeader(part.headers, 'X-Attachment-Id'),
    getHeader(part.headers, 'Content-Location'),
  ]
    .filter(Boolean)
    .map(normalizeCid)
}

function contentDisposition(part: gmail_v1.Schema$MessagePart) {
  return getHeader(part.headers, 'Content-Disposition').toLowerCase()
}

async function getAttachmentData(
  workspaceId: string,
  messageId: string,
  part: gmail_v1.Schema$MessagePart,
) {
  if (part.body?.data) return normalizeBase64Url(part.body.data)
  if (!part.body?.attachmentId) return ''

  const attachment = await gmailJson<gmail_v1.Schema$MessagePartBody>(
    workspaceId,
    'google-gmail/messages-read',
    {
      path: gmailPath(
        `/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(
          part.body.attachmentId,
        )}`,
      ),
    },
  )

  return attachment.data ? normalizeBase64Url(attachment.data) : ''
}

export async function getAttachment(
  workspaceId: string,
  messageId: string,
  attachmentId: string,
  mimeType = 'application/octet-stream',
): Promise<MailAttachmentDownload> {
  const cached = await readCachedAttachment(
    workspaceId,
    messageId,
    attachmentId,
  )
  if (cached) {
    return {
      data: cached,
      mimeType,
    }
  }

  const attachment = await gmailJson<gmail_v1.Schema$MessagePartBody>(
    workspaceId,
    'google-gmail/messages-read',
    {
      path: gmailPath(
        `/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(
          attachmentId,
        )}`,
      ),
    },
  )

  const data = Buffer.from(normalizeBase64Url(attachment.data ?? ''), 'base64')
  await writeCachedAttachment({
    workspaceId,
    messageId,
    attachmentId,
    data,
  })

  return {
    data,
    mimeType,
  }
}

function replaceCidReferences(html: string, attachments: Map<string, string>) {
  if (attachments.size === 0) return html

  return html.replace(/cid:([^"')\s>]+)/gi, (match, cid: string) => {
    return attachments.get(normalizeCid(cid)) ?? match
  })
}

function removeExecutableEmailMarkup(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?<\/embed>/gi, '')
}

async function extractBody(
  workspaceId: string,
  messageId: string,
  payload: gmail_v1.Schema$MessagePart | undefined,
  options: { resolveInlineImages?: boolean } = {},
) {
  const textParts: string[] = []
  const htmlParts: string[] = []
  const attachments: MailAttachment[] = []
  const inlineAttachments = new Map<string, string>()

  async function visit(part: gmail_v1.Schema$MessagePart | undefined) {
    if (!part) return

    const mimeType = part.mimeType?.toLowerCase() ?? ''
    const filename = decodeEntities(part.filename ?? '').trim()
    const disposition = contentDisposition(part)
    const attachmentId = part.body?.attachmentId ?? undefined
    const inline = disposition.includes('inline')

    if (attachmentId && !inline && filename) {
      attachments.push({
        id: part.partId ?? attachmentId ?? `${attachments.length}`,
        filename,
        mimeType: part.mimeType ?? 'application/octet-stream',
        size: Number(part.body?.size ?? 0),
        attachmentId,
        inline,
      })
    }

    const body = decodeBase64Url(part.body?.data)
    if (mimeType === 'text/plain' && body) textParts.push(decodeEntities(body))
    if (mimeType === 'text/html' && body) htmlParts.push(body)

    if (options.resolveInlineImages && mimeType.startsWith('image/')) {
      const identifiers = attachmentIdentifiers(part)
      const data = identifiers.length
        ? await getAttachmentData(workspaceId, messageId, part)
        : ''

      if (data) {
        const dataUri = `data:${mimeType};base64,${data}`
        for (const identifier of identifiers) {
          inlineAttachments.set(identifier, dataUri)
        }
      }
    }

    for (const child of part.parts ?? []) await visit(child)
  }

  await visit(payload)

  const bodyHtml = removeExecutableEmailMarkup(
    replaceCidReferences(htmlParts.join('\n\n').trim(), inlineAttachments),
  )

  return {
    bodyText: textParts.join('\n\n').trim(),
    bodyHtml,
    bodyHtmlText: stripHtml(bodyHtml),
    attachments,
  }
}

function mapMessage(message: gmail_v1.Schema$Message): MailMessageSummary {
  const headers = message.payload?.headers
  const labelIds = message.labelIds ?? []
  const unsubscribe = parseListUnsubscribe(
    getHeader(headers, 'List-Unsubscribe'),
    getHeader(headers, 'List-Unsubscribe-Post'),
  )

  return {
    id: message.id ?? '',
    threadId: message.threadId ?? message.id ?? '',
    from: getHeader(headers, 'From'),
    to: getHeader(headers, 'To'),
    subject: decodeEntities(getHeader(headers, 'Subject') || '(no subject)'),
    date: getHeader(headers, 'Date'),
    snippet: decodeEntities(message.snippet ?? ''),
    labelIds,
    unread: labelIds.includes('UNREAD'),
    starred: labelIds.includes('STARRED'),
    important: labelIds.includes('IMPORTANT'),
    internalDate: Number(message.internalDate ?? 0),
    ...(unsubscribe ? { unsubscribe } : {}),
  }
}

async function mapMessageDetail(
  workspaceId: string,
  message: gmail_v1.Schema$Message,
  options: { resolveInlineImages?: boolean } = {},
): Promise<MailMessageDetail> {
  const summary = mapMessage(message)
  const { bodyText, bodyHtml, bodyHtmlText, attachments } = await extractBody(
    workspaceId,
    summary.id,
    message.payload,
    options,
  )

  return {
    ...summary,
    cc: getHeader(message.payload?.headers, 'Cc'),
    bodyText,
    bodyHtml,
    bodyHtmlText,
    attachments,
  }
}

async function getMessageSummary(workspaceId: string, id: string) {
  const params = new URLSearchParams()
  params.set('format', 'metadata')
  for (const header of [
    'From',
    'To',
    'Subject',
    'Date',
    'List-Unsubscribe',
    'List-Unsubscribe-Post',
  ]) {
    params.append('metadataHeaders', header)
  }

  const message = await gmailJson<gmail_v1.Schema$Message>(
    workspaceId,
    'google-gmail/messages-read',
    { path: gmailPath(`/messages/${encodeURIComponent(id)}`, params) },
  )

  return mapMessage(message)
}

async function getMessageDetailFromGmail(
  workspaceId: string,
  id: string,
  options: { detailCached?: boolean; resolveInlineImages?: boolean } = {},
) {
  const params = new URLSearchParams()
  params.set('format', 'full')
  const message = await gmailJson<gmail_v1.Schema$Message>(
    workspaceId,
    'google-gmail/messages-read',
    { path: gmailPath(`/messages/${encodeURIComponent(id)}`, params) },
  )

  const detail = await mapMessageDetail(workspaceId, message, {
    resolveInlineImages: options.resolveInlineImages,
  })
  await writeCachedMessage(workspaceId, detail, {
    detailCached: options.detailCached,
  })
  return detail
}

async function getOrWarmMessageDetail(
  workspaceId: string,
  id: string,
  options: { detailCached?: boolean; resolveInlineImages?: boolean } = {},
) {
  const key = detailWarmupKey(workspaceId, id)
  const existing = detailWarmups.get(key)
  if (existing) return existing

  const warmup = getMessageDetailFromGmail(workspaceId, id, options).finally(
    () => {
      detailWarmups.delete(key)
    },
  )
  detailWarmups.set(key, warmup)
  return warmup
}

async function hydrateSummaryBody(
  workspaceId: string,
  summary: MailMessageSummary,
) {
  const cached = await readCachedMessage(workspaceId, summary.id)
  if (cached) return mergeCachedBodyIntoSummary(summary, cached)
  return summary
}

async function hydrateSummaryBodies(
  workspaceId: string,
  messages: MailMessageSummary[],
) {
  const hydrated: MailMessageSummary[] = []
  const concurrency = 4

  for (let index = 0; index < messages.length; index += concurrency) {
    const batch = messages.slice(index, index + concurrency)
    hydrated.push(
      ...(await Promise.all(
        batch.map((message) => hydrateSummaryBody(workspaceId, message)),
      )),
    )
  }

  return hydrated
}

async function warmMessageAttachments(
  workspaceId: string,
  message: MailMessageDetail,
) {
  const downloadable = (message.attachments ?? []).filter(
    (attachment) => attachment.attachmentId && !attachment.inline,
  )
  if (downloadable.length === 0) return

  const concurrency = 3
  for (let index = 0; index < downloadable.length; index += concurrency) {
    const batch = downloadable.slice(index, index + concurrency)
    await Promise.all(
      batch.map(async (attachment) => {
        if (!attachment.attachmentId) return

        try {
          await getAttachment(
            workspaceId,
            message.id,
            attachment.attachmentId,
            attachment.mimeType,
          )
        } catch (error) {
          console.warn(
            `Failed to warm attachment ${attachment.attachmentId} for ${message.id}:`,
            error,
          )
        }
      }),
    )
  }
}

async function warmMessageDetails(
  workspaceId: string,
  messages: MailMessageSummary[],
) {
  const concurrency = 3
  for (let index = 0; index < messages.length; index += concurrency) {
    const batch = messages.slice(index, index + concurrency)
    await Promise.all(
      batch.map(async (message) => {
        const cached = await readCachedMessage(workspaceId, message.id, {
          requireDetail: true,
        })
        if (cached) {
          await warmMessageAttachments(workspaceId, cached)
          return
        }

        try {
          const detail = await getOrWarmMessageDetail(workspaceId, message.id, {
            detailCached: true,
            resolveInlineImages: true,
          })
          await warmMessageAttachments(workspaceId, detail)
        } catch (error) {
          console.warn(`Failed to warm message ${message.id}:`, error)
        }
      }),
    )
  }
}

export async function getProfile(workspaceId: string) {
  return gmailJson<MailProfile>(workspaceId, 'google-gmail/profile', {
    path: gmailPath('/profile'),
  })
}

async function keepGmailTokenFresh(workspaceId: string) {
  if (!(await isAuthenticated(workspaceId))) return
  await getProfile(workspaceId)
}

export function startGmailTokenKeepalive(workspaceId: string) {
  if (gmailTokenKeepalives.has(workspaceId)) return

  const refresh = () => {
    void keepGmailTokenFresh(workspaceId).catch((error) => {
      if (isAuthError(error)) return
      console.warn('Failed to refresh Gmail token in background:', error)
    })
  }

  const timeout = setTimeout(refresh, GMAIL_TOKEN_KEEPALIVE_INITIAL_DELAY_MS)
  const interval = setInterval(refresh, GMAIL_TOKEN_KEEPALIVE_INTERVAL_MS)
  gmailTokenKeepalives.set(workspaceId, interval)
  interval.unref?.()
  timeout.unref?.()
}

export async function getLabels(workspaceId: string) {
  const response = await gmailJson<gmail_v1.Schema$ListLabelsResponse>(
    workspaceId,
    'google-gmail/labels',
    { path: gmailPath('/labels') },
  )
  return response.labels ?? []
}

interface PeopleName {
  displayName?: string
}

interface PeopleEmailAddress {
  value?: string
}

interface PeoplePerson {
  resourceName?: string
  names?: PeopleName[]
  emailAddresses?: PeopleEmailAddress[]
}

interface PeopleConnectionsResponse {
  connections?: PeoplePerson[]
  nextPageToken?: string
}

interface PeopleSearchContactsResponse {
  results?: Array<{ person?: PeoplePerson }>
}

function normalizeContacts(people: PeoplePerson[]) {
  const contacts = new Map<string, MailContact>()

  for (const person of people) {
    const name =
      person.names?.find((item) => item.displayName)?.displayName ?? ''
    for (const emailAddress of person.emailAddresses ?? []) {
      const email = emailAddress.value?.trim()
      if (!email) continue

      const key = email.toLowerCase()
      if (contacts.has(key)) continue

      contacts.set(key, {
        id: person.resourceName ?? key,
        name: name.trim(),
        email,
      })
    }
  }

  return [...contacts.values()].sort((a, b) => {
    const aLabel = a.name || a.email
    const bLabel = b.name || b.email
    return aLabel.localeCompare(bLabel, undefined, { sensitivity: 'base' })
  })
}

function mergeContacts(...groups: MailContact[][]) {
  const contacts = new Map<string, MailContact>()
  for (const group of groups) {
    for (const contact of group) {
      const key = contact.email.toLowerCase()
      const existing = contacts.get(key)
      if (existing?.name && !contact.name) continue
      contacts.set(key, contact)
    }
  }
  return [...contacts.values()].sort((a, b) => {
    const aLabel = a.name || a.email
    const bLabel = b.name || b.email
    return aLabel.localeCompare(bLabel, undefined, { sensitivity: 'base' })
  })
}

function parseAddressContacts(value: string) {
  const contacts: MailContact[] = []
  const parts = value
    .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((part) => part.trim())
    .filter(Boolean)

  for (const part of parts) {
    const match = part.match(/^(?:"?([^"<]*)"?\s*)?<([^<>@\s]+@[^<>\s]+)>$/)
    const email = (match?.[2] ?? part.match(/[^\s<>;,]+@[^\s<>;,]+/)?.[0] ?? '')
      .trim()
      .replace(/^mailto:/i, '')
    if (!email) continue

    const name = (match?.[1] ?? '').replace(/^"|"$/g, '').trim()
    contacts.push({
      id: `mail-cache:${email.toLowerCase()}`,
      name,
      email,
    })
  }

  return contacts
}

async function listCachedCorrespondents(workspaceId: string) {
  const people: PeoplePerson[] = []
  for (const message of await readCachedMessages(workspaceId)) {
    for (const value of [message.from, message.to, message.cc]) {
      for (const contact of parseAddressContacts(value)) {
        people.push({
          resourceName: contact.id,
          names: contact.name ? [{ displayName: contact.name }] : undefined,
          emailAddresses: [{ value: contact.email }],
        })
      }
    }
  }
  return normalizeContacts(people)
}

function filterContacts(contacts: MailContact[], query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return contacts

  return contacts
    .map((contact) => ({
      contact,
      score: contactSearchScore(contact, normalized),
    }))
    .filter((item) => item.score < Number.POSITIVE_INFINITY)
    .sort(
      (a, b) => a.score - b.score || compareContactLabels(a.contact, b.contact),
    )
    .map((item) => item.contact)
    .slice(0, 50)
}

function compareContactLabels(a: MailContact, b: MailContact) {
  const aLabel = a.name || a.email
  const bLabel = b.name || b.email
  return aLabel.localeCompare(bLabel, undefined, { sensitivity: 'base' })
}

function contactSearchScore(contact: MailContact, query: string) {
  const name = contact.name.toLowerCase()
  const email = contact.email.toLowerCase()
  if (!name.includes(query) && !email.includes(query)) {
    return Number.POSITIVE_INFINITY
  }

  const local = email.split('@')[0] ?? email
  const hasName = name.length > 0
  const machineAddress =
    /(^|[._+-])(no-?reply|do-?not-?reply|unsubscribe|unsub|bounce|mailer)([._+-]|$)/i.test(
      local,
    ) || local.length > 40
  if (machineAddress && !hasName) return Number.POSITIVE_INFINITY

  let score = 100
  if (name === query || email === query) score = 0
  else if (name.startsWith(query)) score = 5
  else if (name.split(/\s+/).some((part) => part.startsWith(query))) score = 10
  else if (local.startsWith(query)) score = 20
  else if (email.startsWith(query)) score = 25
  else if (name.includes(query)) score = 35
  else if (email.includes(query)) score = 55

  if (!hasName) score += 20
  if (machineAddress) score += 35
  if (contact.id.startsWith('people/')) score -= 5
  return score
}

async function searchContactsFromGoogle(workspaceId: string, query: string) {
  const params = new URLSearchParams({
    query,
    pageSize: '25',
    readMask: 'names,emailAddresses',
  })
  const response = await gmailJson<PeopleSearchContactsResponse>(
    workspaceId,
    'google-gmail/contacts-read',
    { path: peoplePath('/v1/people:searchContacts', params) },
  )
  return normalizeContacts(
    (response.results ?? [])
      .map((result) => result.person)
      .filter((person): person is PeoplePerson => !!person),
  )
}

async function syncContactsFromGoogle(workspaceId: string) {
  const people: PeoplePerson[] = []
  let pageToken: string | undefined

  for (let page = 0; page < 10; page += 1) {
    const params = new URLSearchParams({
      pageSize: '1000',
      personFields: 'names,emailAddresses',
      sortOrder: 'FIRST_NAME_ASCENDING',
    })
    appendParam(params, 'pageToken', pageToken)

    const response = await gmailJson<PeopleConnectionsResponse>(
      workspaceId,
      'google-gmail/contacts-read',
      { path: peoplePath('/v1/people/me/connections', params) },
    )

    people.push(...(response.connections ?? []))
    pageToken = response.nextPageToken
    if (!pageToken) break
  }

  const contacts = normalizeContacts(people)
  await writeCachedContacts(workspaceId, contacts)
  return contacts
}

function warmContacts(workspaceId: string) {
  const existing = contactsWarmups.get(workspaceId)
  if (existing) return existing

  const warmup = syncContactsFromGoogle(workspaceId).finally(() => {
    contactsWarmups.delete(workspaceId)
  })
  contactsWarmups.set(workspaceId, warmup)
  return warmup
}

function warnContactsScopeMissingOnce(workspaceId: string, error: unknown) {
  if (contactsScopeWarnings.has(workspaceId)) return
  contactsScopeWarnings.add(workspaceId)

  const candidate = error as {
    response?: { json?: unknown; status?: number }
    status?: number
  }
  console.warn('[emails:contacts-scope-missing]', {
    workspaceId,
    message:
      'Google contacts are unavailable until Gmail is reconnected with the contacts.readonly scope.',
    status: candidate.status ?? candidate.response?.status,
    response: candidate.response?.json,
  })
}

export async function listContacts(workspaceId: string, query = '') {
  const cachedCorrespondents = await listCachedCorrespondents(workspaceId)
  const cached = await readCachedContacts(workspaceId)
  const normalizedQuery = query.trim()

  if (normalizedQuery) {
    try {
      const searched = await searchContactsFromGoogle(
        workspaceId,
        normalizedQuery,
      )
      return filterContacts(
        mergeContacts(searched, cached ?? [], cachedCorrespondents),
        normalizedQuery,
      )
    } catch (error) {
      if (isInsufficientAuthScope(error)) {
        warnContactsScopeMissingOnce(workspaceId, error)
        return filterContacts(
          mergeContacts(cached ?? [], cachedCorrespondents),
          normalizedQuery,
        )
      }
      throw error
    }
  }

  if (cached) {
    void warmContacts(workspaceId).catch((error) => {
      if (isInsufficientAuthScope(error)) {
        warnContactsScopeMissingOnce(workspaceId, error)
        return
      }
      console.warn('Failed to refresh contacts:', error)
    })
    return filterContacts(mergeContacts(cached, cachedCorrespondents), query)
  }

  try {
    return filterContacts(
      mergeContacts(await warmContacts(workspaceId), cachedCorrespondents),
      query,
    )
  } catch (error) {
    if (isInsufficientAuthScope(error)) {
      warnContactsScopeMissingOnce(workspaceId, error)
      return filterContacts(cachedCorrespondents, query)
    }
    throw error
  }
}

async function wakeExpiredSnoozes(workspaceId: string) {
  const expired = await popExpiredSnoozes(workspaceId)
  if (expired.length === 0) return
  for (const entry of expired) {
    try {
      await gmailJson<unknown>(workspaceId, 'google-gmail/messages-modify', {
        method: 'POST',
        path: gmailPath(`/messages/${encodeURIComponent(entry.id)}/modify`),
        body: { addLabelIds: ['INBOX', 'UNREAD'] },
      })
      await updateCachedMessageLabels(workspaceId, entry.id, {
        addLabelIds: ['INBOX', 'UNREAD'],
      })
    } catch (error) {
      console.warn(`Failed to wake snoozed message ${entry.id}:`, error)
    }
  }
}

interface ListMessagesOptions {
  labelId?: string
  query?: string
  pageToken?: string
  maxResults?: number
}

interface MessageListResponse {
  messages: MailMessageSummary[]
  nextPageToken?: string
  resultSizeEstimate: number
  source?: 'cache' | 'gmail'
  syncing?: boolean
  syncedAt?: string
}

function normalizeListQuery(query: string | undefined) {
  return query?.trim().toLowerCase() ?? ''
}

function supportsCachedListQuery(query: string | undefined) {
  const normalized = normalizeListQuery(query)
  return (
    normalized === '' ||
    normalized === 'is:unread' ||
    normalized === 'is:important is:unread' ||
    normalized === 'is:unread is:important'
  )
}

function messageMatchesListQuery(
  message: MailMessageSummary,
  query: string | undefined,
) {
  const normalized = normalizeListQuery(query)
  if (!normalized) return true
  if (normalized === 'is:unread') return message.unread
  if (
    normalized === 'is:important is:unread' ||
    normalized === 'is:unread is:important'
  ) {
    return message.important && message.unread
  }
  return false
}

function messageMatchesFolder(
  message: MailMessageSummary,
  labelId: string | undefined,
  activeSnoozeIds: Set<string> | null,
) {
  const folderId = labelId ?? 'INBOX'
  if (folderId === 'all') {
    return (
      !message.labelIds.includes('SPAM') && !message.labelIds.includes('TRASH')
    )
  }
  if (folderId === 'SNOOZED') return activeSnoozeIds?.has(message.id) ?? false
  if (folderId === 'INBOX') {
    return (
      message.labelIds.includes('INBOX') &&
      !(activeSnoozeIds?.has(message.id) ?? false)
    )
  }
  return message.labelIds.includes(folderId)
}

function cacheOffsetFromPageToken(pageToken: string | undefined) {
  if (!pageToken) return 0
  if (!pageToken.startsWith(CACHE_PAGE_TOKEN_PREFIX)) return null

  const offset = Number(pageToken.slice(CACHE_PAGE_TOKEN_PREFIX.length))
  return Number.isInteger(offset) && offset >= 0 ? offset : null
}

async function listMessagesFromCache(
  workspaceId: string,
  options: ListMessagesOptions,
): Promise<MessageListResponse | null> {
  if (!supportsCachedListQuery(options.query)) return null

  const offset = cacheOffsetFromPageToken(options.pageToken)
  if (offset === null) return null

  const cachedMessages = await readCachedMessages(workspaceId)
  if (cachedMessages.length === 0) return null

  const activeSnoozeIds =
    options.labelId === 'INBOX' ||
    !options.labelId ||
    options.labelId === 'SNOOZED'
      ? await getActiveSnoozeIds(workspaceId)
      : null
  const maxResults = options.maxResults ?? 20
  const filtered = cachedMessages
    .filter((message) =>
      messageMatchesFolder(message, options.labelId, activeSnoozeIds),
    )
    .filter((message) => messageMatchesListQuery(message, options.query))
    .sort((a, b) => b.internalDate - a.internalDate)

  const page = filtered.slice(offset, offset + maxResults)
  const nextOffset = offset + page.length
  return {
    messages: page,
    nextPageToken:
      nextOffset < filtered.length
        ? `${CACHE_PAGE_TOKEN_PREFIX}${nextOffset}`
        : undefined,
    resultSizeEstimate: filtered.length,
    source: 'cache',
  }
}

async function cacheMessageSummaries(
  workspaceId: string,
  messages: MailMessageSummary[],
) {
  await Promise.all(
    messages.map((message) => writeCachedMessageSummary(workspaceId, message)),
  )
}

function syncedAtFor(key: string) {
  const syncedAt = messageListSyncedAt.get(key)
  return syncedAt ? new Date(syncedAt).toISOString() : undefined
}

function syncMessagesInBackground(
  workspaceId: string,
  options: ListMessagesOptions,
) {
  const syncOptions = { ...options, pageToken: undefined }
  const key = messageListSyncKey(workspaceId, syncOptions)
  const existing = messageListSyncs.get(key)
  if (existing) return true

  const lastSyncedAt = messageListSyncedAt.get(key) ?? 0
  if (Date.now() - lastSyncedAt < BACKGROUND_MESSAGE_SYNC_MIN_INTERVAL_MS) {
    return false
  }

  const sync = listMessagesFromGmail(workspaceId, syncOptions)
    .then(() => {
      messageListSyncedAt.set(key, Date.now())
    })
    .catch((error) => {
      if (isAuthError(error)) return
      console.warn('Failed to sync mail in background:', error)
    })
    .finally(() => {
      if (messageListSyncs.get(key) === sync) messageListSyncs.delete(key)
    })
  messageListSyncs.set(key, sync)
  return true
}

export function startMailBackgroundSync(workspaceId: string) {
  if (mailBackgroundSyncs.has(workspaceId)) return

  const refresh = () => {
    if (mailBackgroundRefreshes.has(workspaceId)) return
    mailBackgroundRefreshes.add(workspaceId)

    void (async () => {
      try {
        const authenticated = await isAuthenticated(workspaceId)
        if (!authenticated) return

        const folders: ListMessagesOptions[] = [
          { labelId: 'INBOX', maxResults: 24 },
          { labelId: 'INBOX', query: 'is:unread', maxResults: 24 },
          { labelId: 'SENT', maxResults: 24 },
          { labelId: 'all', maxResults: 24 },
          { labelId: 'SNOOZED', maxResults: 24 },
          { labelId: 'SPAM', maxResults: 24 },
          { labelId: 'TRASH', maxResults: 24 },
        ]

        for (const options of folders) {
          syncMessagesInBackground(workspaceId, options)
          const key = messageListSyncKey(workspaceId, {
            ...options,
            pageToken: undefined,
          })
          await messageListSyncs.get(key)
        }
      } catch (error) {
        if (isAuthError(error)) return
        console.warn('Failed to run background mail sync:', error)
      } finally {
        mailBackgroundRefreshes.delete(workspaceId)
      }
    })()
  }

  refresh()
  const interval = setInterval(refresh, MAIL_BACKGROUND_SYNC_INTERVAL_MS)
  interval.unref?.()
  mailBackgroundSyncs.set(workspaceId, interval)
}

async function listMessagesFromGmail(
  workspaceId: string,
  options: ListMessagesOptions = {},
): Promise<MessageListResponse> {
  if (options.labelId === 'SNOOZED') {
    const entries = await listActiveSnoozes(workspaceId)
    const limited = entries.slice(0, options.maxResults ?? 20)
    const summaries = (
      await mapWithConcurrency(
        limited,
        GMAIL_METADATA_CONCURRENCY,
        async (entry): Promise<MailMessageSummary | null> => {
          try {
            const summary = await getMessageSummary(workspaceId, entry.id)
            return {
              ...summary,
              snoozedUntil: entry.until,
              labelIds: summary.labelIds.includes('SNOOZED')
                ? summary.labelIds
                : [...summary.labelIds, 'SNOOZED'],
            }
          } catch (error) {
            console.warn(`Failed to load snoozed message ${entry.id}:`, error)
            return null
          }
        },
      )
    ).filter((message): message is MailMessageSummary => message !== null)
    await cacheMessageSummaries(workspaceId, summaries)
    const messages = await hydrateSummaryBodies(workspaceId, summaries)
    void warmMessageDetails(workspaceId, summaries)

    return {
      messages,
      resultSizeEstimate: messages.length,
    }
  }

  if (
    options.labelId === 'INBOX' ||
    !options.labelId ||
    options.labelId === 'all'
  ) {
    await wakeExpiredSnoozes(workspaceId)
  }

  const labelIds =
    options.labelId && options.labelId !== 'all' ? [options.labelId] : undefined
  const includeSpamTrash =
    options.labelId === 'SPAM' || options.labelId === 'TRASH'
  const params = new URLSearchParams()
  for (const labelId of labelIds ?? []) params.append('labelIds', labelId)
  appendParam(params, 'q', options.query)
  appendParam(params, 'pageToken', options.pageToken)
  appendParam(params, 'maxResults', options.maxResults ?? 20)
  appendParam(params, 'includeSpamTrash', includeSpamTrash)
  const response = await gmailJson<gmail_v1.Schema$ListMessagesResponse>(
    workspaceId,
    'google-gmail/messages-read',
    { path: gmailPath('/messages', params) },
  )
  const messageIds = (response.messages ?? [])
    .map((message) => message.id)
    .filter((id): id is string => !!id)
  const summaries = await mapWithConcurrency(
    messageIds,
    GMAIL_METADATA_CONCURRENCY,
    (id) => getMessageSummary(workspaceId, id),
  )
  await cacheMessageSummaries(workspaceId, summaries)
  const reconciledLabelId =
    options.labelId && options.labelId !== 'all' && !options.query
      ? options.labelId
      : null
  if (reconciledLabelId && !options.pageToken) {
    await reconcileCachedFolderPage({
      workspaceId,
      labelId: reconciledLabelId,
      freshMessages: summaries,
      nextPageToken: response.nextPageToken ?? undefined,
    }).catch((error) => {
      console.warn(`Failed to reconcile ${reconciledLabelId} cache:`, error)
    })
  }

  const activeSnoozeIds =
    options.labelId === 'INBOX' || !options.labelId
      ? await getActiveSnoozeIds(workspaceId)
      : null
  const visible = activeSnoozeIds
    ? summaries.filter((message) => !activeSnoozeIds.has(message.id))
    : summaries

  const messages = await hydrateSummaryBodies(workspaceId, visible)
  void warmMessageDetails(workspaceId, visible)

  return {
    messages,
    nextPageToken: response.nextPageToken ?? undefined,
    resultSizeEstimate: response.resultSizeEstimate ?? messages.length,
    source: 'gmail',
  }
}

export async function listMessages(
  workspaceId: string,
  options: ListMessagesOptions = {},
) {
  await ensureGmailConnected(workspaceId)

  const cached = await listMessagesFromCache(workspaceId, options)
  if (cached) {
    const syncing = syncMessagesInBackground(workspaceId, options)
    const key = messageListSyncKey(workspaceId, {
      ...options,
      pageToken: undefined,
    })
    return {
      ...cached,
      syncing,
      syncedAt: syncedAtFor(key),
    }
  }

  const fresh = await listMessagesFromGmail(workspaceId, options)
  messageListSyncedAt.set(messageListSyncKey(workspaceId, options), Date.now())
  return {
    ...fresh,
    syncedAt: new Date().toISOString(),
  }
}

export async function getMessage(workspaceId: string, id: string) {
  return (
    (await readCachedMessage(workspaceId, id, { requireDetail: true })) ??
    getOrWarmMessageDetail(workspaceId, id, {
      detailCached: true,
      resolveInlineImages: true,
    })
  )
}

export async function getThread(
  workspaceId: string,
  threadId: string,
): Promise<MailThreadDetail> {
  await ensureGmailConnected(workspaceId)

  const params = new URLSearchParams()
  params.set('format', 'full')
  const thread = await gmailJson<gmail_v1.Schema$Thread>(
    workspaceId,
    'google-gmail/messages-read',
    { path: gmailPath(`/threads/${encodeURIComponent(threadId)}`, params) },
  )

  const messages = (
    await Promise.all(
      (thread.messages ?? []).map(async (message) => {
        const detail = await mapMessageDetail(workspaceId, message, {
          resolveInlineImages: true,
        })
        await writeCachedMessage(workspaceId, detail, { detailCached: true })
        return detail
      }),
    )
  ).sort((a, b) => a.internalDate - b.internalDate)

  return {
    id: thread.id ?? threadId,
    messages,
  }
}

type GmailLabelChanges = { addLabelIds?: string[]; removeLabelIds?: string[] }
type GmailLabelResponse = { id?: string; labelIds?: string[] }
type GmailThreadLabelResponse = { messages?: GmailLabelResponse[] }
const LOCAL_ONLY_LABEL_IDS = new Set(['SNOOZED'])
const THREAD_WIDE_LABEL_IDS = new Set(['INBOX', 'SPAM', 'TRASH'])

function splitLocalOnlyLabelChanges(changes: GmailLabelChanges) {
  const gmailChanges = {
    addLabelIds: changes.addLabelIds?.filter(
      (labelId) => !LOCAL_ONLY_LABEL_IDS.has(labelId),
    ),
    removeLabelIds: changes.removeLabelIds?.filter(
      (labelId) => !LOCAL_ONLY_LABEL_IDS.has(labelId),
    ),
  }
  const localChanges = {
    addLabelIds: changes.addLabelIds?.filter((labelId) =>
      LOCAL_ONLY_LABEL_IDS.has(labelId),
    ),
    removeLabelIds: changes.removeLabelIds?.filter((labelId) =>
      LOCAL_ONLY_LABEL_IDS.has(labelId),
    ),
  }
  return { gmailChanges, localChanges }
}

function gmailLabelChangesBody(changes: GmailLabelChanges) {
  const add = changes.addLabelIds ?? []
  const remove = changes.removeLabelIds ?? []
  if (add.length === 0 && remove.length === 0) return null

  const body: Record<string, string[]> = {}
  if (add.length) body.addLabelIds = add
  if (remove.length) body.removeLabelIds = remove
  return body
}

async function modifyGmailMessageLabels(
  workspaceId: string,
  id: string,
  changes: GmailLabelChanges,
) {
  const body = gmailLabelChangesBody(changes)
  if (!body) return { labelIds: undefined }

  return gmailJson<GmailLabelResponse>(
    workspaceId,
    'google-gmail/messages-modify',
    {
      method: 'POST',
      path: gmailPath(`/messages/${encodeURIComponent(id)}/modify`),
      body,
    },
  )
}

async function modifyGmailThreadLabels(
  workspaceId: string,
  threadId: string,
  changes: GmailLabelChanges,
) {
  const body = gmailLabelChangesBody(changes)
  if (!body) return { messages: undefined }

  return gmailJson<GmailThreadLabelResponse>(
    workspaceId,
    'google-gmail/messages-modify',
    {
      method: 'POST',
      path: gmailPath(`/threads/${encodeURIComponent(threadId)}/modify`),
      body,
    },
  )
}

function assertGmailLabels(
  message: GmailLabelResponse,
  expected: { include?: string[]; exclude?: string[] },
) {
  if (!Array.isArray(message.labelIds)) {
    throw new Error('Gmail did not confirm the message label update.')
  }

  const labels = new Set(message.labelIds)
  for (const labelId of expected.include ?? []) {
    if (!labels.has(labelId)) {
      throw new Error(`Gmail did not add the ${labelId} label.`)
    }
  }
  for (const labelId of expected.exclude ?? []) {
    if (labels.has(labelId)) {
      throw new Error(`Gmail did not remove the ${labelId} label.`)
    }
  }
}

function assertGmailThreadLabels(
  thread: GmailThreadLabelResponse,
  expected: { include?: string[]; exclude?: string[] },
) {
  if (!Array.isArray(thread.messages) || thread.messages.length === 0) {
    throw new Error('Gmail did not confirm the thread label update.')
  }

  for (const message of thread.messages) {
    assertGmailLabels(message, expected)
  }
}

function matchesExpectedLabels(
  message: { labelIds: string[] },
  expected: { include?: string[]; exclude?: string[] },
) {
  const labels = new Set(message.labelIds)
  return (
    (expected.include ?? []).every((labelId) => labels.has(labelId)) &&
    (expected.exclude ?? []).every((labelId) => !labels.has(labelId))
  )
}

async function enforceConfirmedGmailThreadLabelChanges(
  workspaceId: string,
  threadId: string,
  changes: GmailLabelChanges,
  expected: { include?: string[]; exclude?: string[] },
) {
  const thread = await getThread(workspaceId, threadId)
  const remainingMessages = thread.messages.filter(
    (message) => !matchesExpectedLabels(message, expected),
  )
  if (remainingMessages.length === 0) return

  await Promise.all(
    remainingMessages.map(async (message) => {
      const updated = await modifyGmailMessageLabels(
        workspaceId,
        message.id,
        changes,
      )
      assertGmailLabels(updated, expected)
      await updateCachedMessageLabels(workspaceId, message.id, changes)
    }),
  )
}

function shouldModifyThreadLabels(changes: GmailLabelChanges) {
  return [
    ...(changes.addLabelIds ?? []),
    ...(changes.removeLabelIds ?? []),
  ].some((labelId) => THREAD_WIDE_LABEL_IDS.has(labelId))
}

async function getThreadIdForMessage(workspaceId: string, id: string) {
  const cached = await readCachedMessage(workspaceId, id)
  if (cached?.threadId) return cached.threadId

  const summary = await getMessageSummary(workspaceId, id)
  return summary.threadId
}

async function applyConfirmedGmailLabelChanges(
  workspaceId: string,
  id: string,
  changes: GmailLabelChanges,
) {
  const body = gmailLabelChangesBody(changes)
  if (!body) return

  const expected = {
    include: changes.addLabelIds,
    exclude: changes.removeLabelIds,
  }

  if (shouldModifyThreadLabels(changes)) {
    const threadId = await getThreadIdForMessage(workspaceId, id)
    const updated = await modifyGmailThreadLabels(
      workspaceId,
      threadId,
      changes,
    )
    assertGmailThreadLabels(updated, expected)
    await updateCachedThreadLabels(workspaceId, threadId, changes)
    await enforceConfirmedGmailThreadLabelChanges(
      workspaceId,
      threadId,
      changes,
      expected,
    )
    return
  }

  const updated = await modifyGmailMessageLabels(workspaceId, id, changes)
  assertGmailLabels(updated, expected)
  await updateCachedMessageLabels(workspaceId, id, changes)
}

export async function modifyMessageLabels(
  workspaceId: string,
  id: string,
  changes: GmailLabelChanges,
) {
  await ensureGmailConnected(workspaceId)
  const { gmailChanges, localChanges } = splitLocalOnlyLabelChanges(changes)
  await applyConfirmedGmailLabelChanges(workspaceId, id, gmailChanges)

  const localBody = gmailLabelChangesBody(localChanges)
  if (localBody) await updateCachedMessageLabels(workspaceId, id, localChanges)

  if (localChanges.removeLabelIds?.includes('SNOOZED')) {
    await unsnoozeMessage({ workspaceId, id })
  }
}

export async function applyMessageAction(
  workspaceId: string,
  id: string,
  action: MessageAction,
  options: MessageActionOptions = {},
) {
  await ensureGmailConnected(workspaceId)

  if (action === 'trash') {
    const changes = {
      addLabelIds: ['TRASH'],
      removeLabelIds: ['INBOX'],
    }
    await applyConfirmedGmailLabelChanges(workspaceId, id, changes)
    await unsnoozeMessage({ workspaceId, id })
    return
  }

  if (action === 'untrash') {
    const changes = { removeLabelIds: ['TRASH'] }
    await applyConfirmedGmailLabelChanges(workspaceId, id, changes)
    return
  }

  if (action === 'snooze') {
    const until = Number(options.until)
    if (!Number.isFinite(until) || until <= Date.now()) {
      throw new Error('Snooze requires a future wake time.')
    }
    const changes = { removeLabelIds: ['INBOX'] }
    await applyConfirmedGmailLabelChanges(workspaceId, id, changes)
    const cached = await readCachedMessage(workspaceId, id)
    await snoozeMessage({
      workspaceId,
      id,
      threadId: cached?.threadId,
      until,
    })
    return
  }

  if (action === 'unsnooze') {
    const changes = { addLabelIds: ['INBOX'] }
    await applyConfirmedGmailLabelChanges(workspaceId, id, changes)
    await unsnoozeMessage({ workspaceId, id })
    return
  }

  const labelChanges: Record<
    Exclude<MessageAction, 'trash' | 'untrash' | 'snooze' | 'unsnooze'>,
    { addLabelIds?: string[]; removeLabelIds?: string[] }
  > = {
    archive: { removeLabelIds: ['INBOX'] },
    markRead: { removeLabelIds: ['UNREAD'] },
    markUnread: { addLabelIds: ['UNREAD'] },
    star: { addLabelIds: ['STARRED'] },
    unstar: { removeLabelIds: ['STARRED'] },
    important: { addLabelIds: ['IMPORTANT'] },
    unimportant: { removeLabelIds: ['IMPORTANT'] },
    spam: { addLabelIds: ['SPAM'], removeLabelIds: ['INBOX'] },
    notSpam: { addLabelIds: ['INBOX'], removeLabelIds: ['SPAM'] },
  }

  const changes = labelChanges[action]
  await applyConfirmedGmailLabelChanges(workspaceId, id, changes)

  if (action === 'archive' || action === 'spam') {
    await unsnoozeMessage({ workspaceId, id })
  }
}

function cleanHeaderValue(value: string) {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

async function requestOneClickUnsubscribe(url: string) {
  const parsed = new URL(url)
  const host = parsed.hostname.toLowerCase()
  const privateHost =
    host === 'localhost' ||
    host === '::1' ||
    host === '[::1]' ||
    host === '0.0.0.0' ||
    host.startsWith('127.') ||
    host.startsWith('10.') ||
    host.startsWith('169.254.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    host.startsWith('192.168.')

  if (parsed.protocol !== 'https:' || privateHost) {
    throw new Error('Unsubscribe URL is not safe to request automatically')
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'text/plain, text/html, */*',
    },
    body: 'List-Unsubscribe=One-Click',
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    throw new Error(`Unsubscribe request failed with ${response.status}`)
  }
}

async function sendMailtoUnsubscribe(workspaceId: string, mailto: string) {
  const parsed = new URL(mailto)
  const to = cleanHeaderValue(decodeURIComponent(parsed.pathname))
  const subject = cleanHeaderValue(
    parsed.searchParams.get('subject') ?? 'Unsubscribe',
  )
  const body = parsed.searchParams.get('body') ?? 'Unsubscribe'

  if (!to) {
    throw new Error('Unsubscribe address is missing')
  }

  await sendMessage(workspaceId, {
    to,
    subject,
    body,
  })
}

export async function unsubscribeAndArchive(workspaceId: string, id: string) {
  await ensureGmailConnected(workspaceId)

  const cached = await getMessage(workspaceId, id)
  const message = cached.unsubscribe
    ? cached
    : await getMessageDetailFromGmail(workspaceId, id, {
        detailCached: true,
        resolveInlineImages: true,
      })
  const unsubscribe = message.unsubscribe

  if (!unsubscribe) {
    throw new Error('No automatic unsubscribe option is available')
  }

  if (unsubscribe.url && unsubscribe.oneClick) {
    await requestOneClickUnsubscribe(unsubscribe.url)
  } else if (unsubscribe.mailto) {
    await sendMailtoUnsubscribe(workspaceId, unsubscribe.mailto)
  } else {
    throw new Error('No automatic unsubscribe option is available')
  }

  await applyMessageAction(workspaceId, id, 'archive')
}

function encodeHeader(value: string) {
  return /[^\x20-\x7e]/.test(value)
    ? `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`
    : value
}

function encodeRawEmail(input: SendMailInput) {
  const headers = [
    `To: ${input.to}`,
    input.cc ? `Cc: ${input.cc}` : null,
    input.bcc ? `Bcc: ${input.bcc}` : null,
    `Subject: ${encodeHeader(input.subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(input.body, 'utf8').toString('base64'),
  ].filter((line): line is string => line !== null)

  return Buffer.from(headers.join('\r\n'))
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

export async function sendMessage(workspaceId: string, input: SendMailInput) {
  const response = await gmailJson<gmail_v1.Schema$Message>(
    workspaceId,
    'google-gmail/send',
    {
      method: 'POST',
      path: gmailPath('/messages/send'),
      body: {
        raw: encodeRawEmail(input),
        threadId: input.threadId,
      },
    },
  )

  return {
    id: response.id,
    threadId: response.threadId,
  }
}
