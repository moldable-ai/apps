import {
  ensureDir,
  getAppDataDir,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import type { MailMessageSummary } from '../client/types'
import { streamAppText } from './llm'
import { completion } from './moldable'
import { createHash } from 'node:crypto'

const CACHE_FILENAME = 'briefing.json'
const MAX_MESSAGES_IN_PROMPT = 40
const MAX_SNIPPET_CHARS = 420
const MAX_BODY_CHARS = 2_400

export interface BriefingCache {
  fingerprint: string
  markdown: string
  generatedAt: string
  messageCount: number
  unreadCount: number
  account?: string | null
}

function getCachePath(workspaceId?: string) {
  return safePath(getAppDataDir(workspaceId), CACHE_FILENAME)
}

/**
 * Compute a stable fingerprint for a set of messages. Changes when any message
 * is added, removed, or its unread/starred/important status changes.
 */
export function computeBriefingFingerprint(
  messages: MailMessageSummary[],
  account?: string | null,
) {
  const hasher = createHash('sha256')
  hasher.update(`v2:${account ?? ''}:${messages.length}`)

  for (const message of messages) {
    hasher.update('\0')
    hasher.update(message.id)
    hasher.update('|')
    hasher.update(message.unread ? '1' : '0')
    hasher.update(message.starred ? '1' : '0')
    hasher.update(message.important ? '1' : '0')
  }

  return hasher.digest('hex').slice(0, 32)
}

export async function readCachedBriefing(workspaceId?: string) {
  return readJson<BriefingCache | null>(getCachePath(workspaceId), null)
}

export async function writeCachedBriefing(
  entry: BriefingCache,
  workspaceId?: string,
) {
  await ensureDir(getAppDataDir(workspaceId))
  await writeJson(getCachePath(workspaceId), entry)
}

function cleanSnippet(raw: string) {
  const text = (raw ?? '')
    .replace(/\u200b|\u200c|\u200d|\ufeff|\u00ad/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return ''
  if (text.length <= MAX_SNIPPET_CHARS) return text
  return `${text.slice(0, MAX_SNIPPET_CHARS).trimEnd()}...`
}

function cleanBody(raw: string) {
  const text = (raw ?? '')
    .replace(/\u200b|\u200c|\u200d|\ufeff|\u00ad/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()

  if (!text) return ''
  if (text.length <= MAX_BODY_CHARS) return text
  return `${text.slice(0, MAX_BODY_CHARS).trimEnd()}...`
}

function simpleSender(raw: string) {
  if (!raw) return 'Unknown sender'
  const match = raw.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/)
  if (match && match[1]) return match[1].trim()
  const emailMatch = raw.match(/<([^>]+)>/) ?? raw.match(/([\w.+-]+@[\w.-]+)/)
  if (emailMatch && emailMatch[1]) return emailMatch[1].trim()
  return raw.trim()
}

function formatRelativeDate(date: Date, now: Date) {
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.round(diffMs / 60000)
  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.round(diffHours / 24)
  if (diffDays < 14) return `${diffDays}d ago`
  return date.toISOString().slice(0, 10)
}

function buildMessagesBlock(messages: MailMessageSummary[]) {
  const now = new Date()
  return messages
    .slice(0, MAX_MESSAGES_IN_PROMPT)
    .map((message, index) => {
      const date = new Date(message.internalDate || Date.parse(message.date))
      const when = Number.isFinite(date.getTime())
        ? formatRelativeDate(date, now)
        : message.date
      const flags = [
        message.unread ? 'UNREAD' : null,
        message.important ? 'IMPORTANT' : null,
        message.starred ? 'STARRED' : null,
      ]
        .filter(Boolean)
        .join(', ')

      const lines = [
        `#${index + 1} ${flags ? `[${flags}] ` : ''}From: ${simpleSender(
          message.from,
        )}`,
        `ID: ${message.id}`,
        `Subject: ${message.subject || '(no subject)'}`,
        `When: ${when}`,
      ]
      const body = cleanBody(message.bodyText || message.bodyHtmlText || '')
      if (body) {
        lines.push(`Content:\n${body}`)
      } else {
        const snippet = cleanSnippet(message.snippet)
        if (snippet) lines.push(`Preview: ${snippet}`)
      }
      return lines.join('\n')
    })
    .join('\n\n')
}

const BRIEFING_SYSTEM_PROMPT = `You are a sharp executive assistant writing an inbox briefing. Your only job is to surface the substance of what matters so the reader does not have to open each email to know what is going on.

You are NOT a triage guide. You do not tell the reader to "skim," "open," "check," "review," "look at," "dig in," or "see the email for details." If the detail matters, state it. If it does not matter, drop the email entirely.

For every message you include, extract the actual content:
- Who is asking, approving, deciding, or notifying.
- What the concrete ask, decision, number, amount, date, address, or deadline is.
- If there is a deadline, surface the date. If there is a dollar amount, surface it. If there is a name, address, or PR number, surface it.
- If the sender wants a yes/no or a reply, say so plainly and, when possible, include a one-line recommended response.

Actively omit:
- Newsletters, digests, promotions, social notifications, and automated receipts with no decision, deadline, or dollar amount tied to them.
- Messages whose only useful summary would be "informational." If it is purely informational and unimportant, do not mention it. The briefing is allowed to cover only two or three emails if that is all that matters.
- Any meta commentary about your own process or what the reader should do with the briefing.

Cluster related messages into a single item (for example, two landlord messages about the same AC issue become one line).

Format:
- Output GitHub-flavored Markdown only. Do not wrap in a code fence.
- Be concise. Include only the few items that materially change what the reader should know or do.
- Start with one to two plain sentences (no heading, no greeting) that call out the single most important thing happening right now. Be concrete: names, numbers, dates. It is fine to lead with "The only thing that needs a reply today is..." when that is true.
- Then a short bulleted list (2 to 6 bullets) of the individual items worth knowing. Each bullet:
  - Starts with a bolded 1-3 word label for the sender or topic.
  - Uses an em dash, then states the substance in one or two sentences. Include the ask, amount, deadline, address, or number.
  - If action is needed, end with a short recommended move phrased as a clause, not an instruction to go read the email. Example: "- **Landlord (1226 Love St.)** — tenant reports the AC failed over the weekend; they want approval to send a tech. Reasonable move: approve and ask for the estimate."
  - End the bullet with a hidden HTML comment listing the source message IDs you used, exactly like: <!-- message-ids: 18cabc123,18cdef456 -->. Use the IDs from the message blocks. Do not invent IDs.
  - Never say "skim," "open," "check," "review," "look at," "see below," "read the thread," or "dig in."
- If nothing in the inbox actually matters, write a single reassuring sentence and stop. No bullets.
- Never include a closing line, sign-off, trailing summary, or final heading.

Tone: warm, direct, confident, quiet. Lowercase sentence case. No emoji. No exclamation points. Never apologize. Never hedge with "might," "maybe," or "possibly" unless the email itself is genuinely ambiguous.`

export function buildBriefingPrompt({
  messages,
  account,
}: {
  messages: MailMessageSummary[]
  account?: string | null
}) {
  const unread = messages.filter((m) => m.unread).length
  const total = messages.length
  const block = buildMessagesBlock(messages)
  const header = [
    account ? `Account: ${account}` : null,
    `Messages shown: ${total} (${unread} unread)`,
  ]
    .filter(Boolean)
    .join('\n')

  return `${header}\n\nMessages (most recent first; Content is extracted from the full cached email body when available, otherwise Preview is Gmail's snippet):\n\n${block}`
}

export async function streamInboxBriefing({
  messages,
  account,
  workspaceId,
}: {
  messages: MailMessageSummary[]
  account?: string | null
  workspaceId?: string
}) {
  return streamAppText({
    workspaceId,
    purpose: 'emails.inbox-briefing',
    reasoningEffort: 'medium',
    system: BRIEFING_SYSTEM_PROMPT,
    prompt: buildBriefingPrompt({ messages, account }),
  })
}

export async function generateInboxBriefing({
  messages,
  account,
  workspaceId,
}: {
  messages: MailMessageSummary[]
  account?: string | null
  workspaceId?: string
}) {
  const result = await completion({
    workspaceId,
    purpose: 'emails.inbox-briefing.buffered',
    reasoningEffort: 'medium',
    system: BRIEFING_SYSTEM_PROMPT,
    prompt: buildBriefingPrompt({ messages, account }),
  })

  return result.text.trim()
}
