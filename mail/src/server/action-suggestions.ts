import {
  ensureDir,
  getAppDataDir,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import type { MailLabel, MailMessageSummary } from '../client/types'
import { generateJson } from './moldable'
import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

const SIGNALS_FILENAME = 'triage-signals.json'
const RULES_FILENAME = 'triage-rules.json'
const SUGGESTIONS_CACHE_FILENAME = 'action-suggestions-cache.json'
const SUGGESTIONS_CACHE_VERSION = 8
const RULES_VERSION = 1
const MAX_SIGNALS = 500
const MAX_RULES = 200
const MAX_RULES_IN_PROMPT = 80
const MAX_CACHED_SUGGESTIONS = 2_000
const RECENT_SIGNALS_IN_PROMPT = 80
const MAX_MESSAGES_IN_PROMPT = 40
const MAX_SNIPPET_CHARS = 520
const MAX_BODY_CHARS = 1_800

export const ACTION_GROUPS = [
  'archive',
  'label-archive',
  'keep-inbox',
  'follow-up',
  'waiting-on',
  'reply-needed',
  'read-later',
  'unsubscribe-archive',
  'trash',
  'spam',
  'needs-review',
] as const

export type MailActionGroupId = (typeof ACTION_GROUPS)[number]

export interface MailActionSuggestion {
  id: string
  messageId: string
  groupId: MailActionGroupId
  confidence: number
  reason?: string
  suggestedLabelId?: string
  suggestedLabelName?: string
  matchedRuleIds?: string[]
}

export interface MailTriageSignal {
  id: string
  createdAt: string
  account?: string | null
  message: Pick<
    MailMessageSummary,
    'id' | 'from' | 'subject' | 'snippet' | 'labelIds'
  >
  suggestedGroupId?: MailActionGroupId
  finalGroupId: MailActionGroupId
  outcome: 'approved' | 'corrected' | 'label_changed' | 'dismissed'
  suggestedLabelId?: string
  suggestedLabelName?: string
  finalLabelId?: string
  finalLabelName?: string
  reason?: string
}

export interface TriageRule {
  id: string
  title: string
  body: string
  action: {
    groupId: MailActionGroupId
    labelName?: string
  }
  status: 'draft' | 'active' | 'archived'
  confidence: number
  createdAt: string
  updatedAt: string
  evidenceSignalIds: string[]
  exceptions?: string[]
}

interface TriageRulesFile {
  version: typeof RULES_VERSION
  updatedAt: string
  rules: TriageRule[]
}

interface CachedSuggestionEntry {
  messageId: string
  messageFingerprint: string
  labelsFingerprint: string
  rulesFingerprint: string
  generatedAt: string
  suggestion: MailActionSuggestion
}

interface ActionSuggestionsCache {
  version: typeof SUGGESTIONS_CACHE_VERSION
  updatedAt: string
  entries: Record<string, CachedSuggestionEntry>
}

export interface ActionSuggestionsInput {
  messages: MailMessageSummary[]
  labels: MailLabel[]
  account?: string | null
  force?: boolean
}

const actionGroupSchema = z.enum([...ACTION_GROUPS] as [
  MailActionGroupId,
  ...MailActionGroupId[],
])

const actionSuggestionJsonSchema = z
  .object({
    messageId: z.string(),
    groupId: actionGroupSchema,
    confidence: z.number().min(0).max(1),
    reason: z.string(),
    suggestedLabelId: z.string(),
    suggestedLabelName: z.string(),
    matchedRuleIds: z.array(z.string()),
  })
  .strict()

const actionSuggestionsJsonResponseSchema = z
  .object({
    suggestions: z.array(actionSuggestionJsonSchema),
  })
  .strict()

const triageRuleJsonSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    body: z.string(),
    action: z
      .object({
        groupId: actionGroupSchema,
        labelName: z.string(),
      })
      .strict(),
    status: z.enum(['draft', 'active', 'archived']),
    confidence: z.number().min(0).max(1),
    evidenceSignalIds: z.array(z.string()),
    exceptions: z.array(z.string()),
  })
  .strict()

const triageRulesJsonResponseSchema = z
  .object({
    rules: z.array(triageRuleJsonSchema),
  })
  .strict()

type TriageRulesJsonResponse = z.infer<typeof triageRulesJsonResponseSchema>

type ActionSuggestionsJsonResponse = z.infer<
  typeof actionSuggestionsJsonResponseSchema
>

function stripProviderFragileSchemaKeywords(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripProviderFragileSchemaKeywords)
  }

  if (!value || typeof value !== 'object') return value

  const next: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    if (key === 'minimum' || key === 'maximum') continue
    next[key] = stripProviderFragileSchemaKeywords(child)
  }
  return next
}

function toAppJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const jsonSchema = zodToJsonSchema(schema, {
    target: 'jsonSchema7',
    $refStrategy: 'none',
  }) as Record<string, unknown>

  delete jsonSchema.$schema
  return stripProviderFragileSchemaKeywords(jsonSchema) as Record<
    string,
    unknown
  >
}

const actionSuggestionsJsonSchema = toAppJsonSchema(
  actionSuggestionsJsonResponseSchema,
)
const triageRulesJsonSchema = toAppJsonSchema(triageRulesJsonResponseSchema)

const groupDescriptions: Record<MailActionGroupId, string> = {
  archive: 'Archive: message likely needs no further attention.',
  'label-archive':
    'Label & Archive: useful reference mail; suggest an existing label and remove from inbox.',
  'keep-inbox':
    'To Do / Keep in Inbox: represents work the user wants visible in the inbox.',
  'follow-up': 'Follow Up: user should follow up later or track this.',
  'waiting-on':
    'Waiting On: user is waiting on someone else or an external event.',
  'reply-needed': 'Reply Needed: user likely needs to respond.',
  'read-later': 'Read Later: worth reading, but not urgent.',
  'unsubscribe-archive':
    'Unsubscribe & Archive: mailing-list style message the user likely does not want.',
  trash: 'Trash: unwanted but not necessarily spam.',
  spam: 'Spam: abusive, scammy, phishing, or spam-filter-worthy message.',
  'needs-review':
    'Needs triaging: LLM is uncertain, failed, or user judgment is required.',
}

// Triage preferences are user data, not application defaults. Do not add
// user-, account-, sender-, label-, or vendor-specific triage rules in source.
// Learned/custom rules are stored per workspace and per email account under the
// app data directory.

const validGroupIds = new Set<string>(ACTION_GROUPS)

function normalizeAccount(account?: string | null) {
  const normalized = (account ?? '').trim().toLowerCase()
  return normalized || null
}

function accountStorageKey(account?: string | null) {
  const normalized = normalizeAccount(account)
  if (!normalized) return 'account-default'

  const hash = createHash('sha256')
    .update(normalized)
    .digest('hex')
    .slice(0, 12)
  const slug = normalized
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
  return `account-${slug || 'mail'}-${hash}`
}

function triageDataDir(workspaceId?: string, account?: string | null) {
  return safePath(
    getAppDataDir(workspaceId),
    'triage',
    accountStorageKey(account),
  )
}

function signalsPath(workspaceId?: string, account?: string | null) {
  return safePath(triageDataDir(workspaceId, account), SIGNALS_FILENAME)
}

function rulesPath(workspaceId?: string, account?: string | null) {
  return safePath(triageDataDir(workspaceId, account), RULES_FILENAME)
}

function suggestionsCachePath(workspaceId?: string, account?: string | null) {
  return safePath(
    triageDataDir(workspaceId, account),
    SUGGESTIONS_CACHE_FILENAME,
  )
}

function emptySuggestionsCache(): ActionSuggestionsCache {
  return {
    version: SUGGESTIONS_CACHE_VERSION,
    updatedAt: new Date().toISOString(),
    entries: {},
  }
}

const serializedTriageWrites = new Map<string, Promise<unknown>>()

function serializeTriageWrite<T>(
  workspaceId: string | undefined,
  account: string | null | undefined,
  task: () => Promise<T>,
): Promise<T> {
  const key = `${workspaceId ?? 'default'}:${accountStorageKey(account)}`
  const previous = serializedTriageWrites.get(key) ?? Promise.resolve()
  const next = previous.catch(() => undefined).then(task)
  const tracked = next.finally(() => {
    if (serializedTriageWrites.get(key) === tracked) {
      serializedTriageWrites.delete(key)
    }
  })
  serializedTriageWrites.set(key, tracked)
  return next
}

async function readJsonOrThrow<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return await readJson<T>(filePath, fallback)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`Corrupt JSON data file: ${filePath}. ${detail}`)
  }
}

function cleanText(raw: string | undefined, maxChars: number) {
  const text = (raw ?? '')
    .replace(/\u200b|\u200c|\u200d|\ufeff|\u00ad/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars).trimEnd()}...`
}

function simpleSender(raw: string) {
  const match = raw.match(/^\s*"?([^"<]+?)"?\s*<([^>]+)>\s*$/)
  if (match?.[1]) return match[1].trim()
  const emailMatch = raw.match(/<([^>]+)>/) ?? raw.match(/([\w.+-]+@[\w.-]+)/)
  if (emailMatch?.[1]) return emailMatch[1].trim()
  return raw.trim() || 'Unknown sender'
}

function currentTriageDay() {
  return new Date().toISOString().slice(0, 10)
}

function formatDateValueForPrompt(raw: string | number | undefined | null) {
  if (raw === undefined || raw === null || raw === '') return ''
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return String(raw)
  return date.toISOString()
}

function formatMessageDateForPrompt(message: MailMessageSummary) {
  const received = formatDateValueForPrompt(message.internalDate)
  const header = formatDateValueForPrompt(message.date)
  if (received && header && received !== header) {
    return `Received: ${received}; Date header: ${header}`
  }
  return received ? `Received: ${received}` : header ? `Date: ${header}` : ''
}

function suggestionId(messageId: string, groupId: MailActionGroupId) {
  const digest = createHash('sha256')
    .update(`${messageId}:${groupId}`)
    .digest('hex')
    .slice(0, 12)
  return `${messageId}:${digest}`
}

function computeLabelsFingerprint(labels: MailLabel[]) {
  const hasher = createHash('sha256')
  for (const label of userLabels(labels).sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    hasher.update('\0')
    hasher.update(label.id)
    hasher.update('|')
    hasher.update(label.name)
  }
  return hasher.digest('hex').slice(0, 32)
}

function computeRulesFingerprint(rules: TriageRule[]) {
  const hasher = createHash('sha256')
  for (const rule of rules
    .filter((item) => item.status !== 'archived')
    .sort((a, b) => a.id.localeCompare(b.id))) {
    hasher.update('\0')
    hasher.update(rule.id)
    hasher.update('|')
    hasher.update(rule.title)
    hasher.update('|')
    hasher.update(rule.body)
    hasher.update('|')
    hasher.update(rule.action.groupId)
    hasher.update('|')
    hasher.update(rule.action.labelName ?? '')
    hasher.update('|')
    hasher.update((rule.exceptions ?? []).join('\n'))
    hasher.update('|')
    hasher.update(rule.status)
  }
  return hasher.digest('hex').slice(0, 32)
}

function computeMessageFingerprint(message: MailMessageSummary) {
  const hasher = createHash('sha256')
  hasher.update('v5')
  hasher.update('\0')
  hasher.update(currentTriageDay())
  hasher.update('\0')
  hasher.update(message.id)
  hasher.update('\0')
  hasher.update(message.threadId)
  hasher.update('\0')
  hasher.update(message.from)
  hasher.update('\0')
  hasher.update(message.subject)
  hasher.update('\0')
  hasher.update(message.snippet)
  hasher.update('\0')
  hasher.update(message.bodyText ?? '')
  hasher.update('\0')
  hasher.update(message.bodyHtmlText ?? '')
  hasher.update('\0')
  hasher.update(message.unsubscribe ? 'unsubscribe' : '')
  return hasher.digest('hex').slice(0, 32)
}

export function computeActionSuggestionsFingerprint(
  { messages, labels, account }: ActionSuggestionsInput,
  rules: TriageRule[] = [],
) {
  const hasher = createHash('sha256')
  hasher.update(
    `v6:${currentTriageDay()}:${account ?? ''}:${computeLabelsFingerprint(labels)}:${computeRulesFingerprint(
      rules,
    )}`,
  )
  for (const message of messages) {
    hasher.update('\0')
    hasher.update(message.id)
    hasher.update('|')
    hasher.update(computeMessageFingerprint(message))
  }
  return hasher.digest('hex').slice(0, 32)
}

export async function readTriageSignals(
  workspaceId?: string,
  account?: string | null,
) {
  return readJsonOrThrow<MailTriageSignal[]>(
    signalsPath(workspaceId, account),
    [],
  )
}

export async function readTriageRules(
  workspaceId?: string,
  account?: string | null,
) {
  const file = await readJsonOrThrow<TriageRulesFile | null>(
    rulesPath(workspaceId, account),
    null,
  )
  return file?.version === RULES_VERSION && Array.isArray(file.rules)
    ? file.rules
    : []
}

async function writeTriageRules(
  workspaceId: string | undefined,
  account: string | null | undefined,
  rules: TriageRule[],
) {
  await ensureDir(triageDataDir(workspaceId, account))
  await writeJson(rulesPath(workspaceId, account), {
    version: RULES_VERSION,
    updatedAt: new Date().toISOString(),
    rules: rules
      .slice()
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, MAX_RULES),
  } satisfies TriageRulesFile)
}

export async function upsertTriageRule(
  workspaceId: string | undefined,
  account: string | null | undefined,
  rawRule: unknown,
) {
  const rules = await readTriageRules(workspaceId, account)
  const byId = new Map(rules.map((rule) => [rule.id, rule]))
  const rule = normalizeTriageRule(rawRule, byId, new Date().toISOString())
  if (!rule) throw new Error('Invalid triage rule')
  const nextRules = [rule, ...rules.filter((item) => item.id !== rule.id)]
  await writeTriageRules(workspaceId, account, nextRules)
  await clearActionSuggestionsCache(workspaceId, account)
  return rule
}

export async function archiveTriageRule(
  workspaceId: string | undefined,
  account: string | null | undefined,
  id: string,
) {
  const rules = await readTriageRules(workspaceId, account)
  const existing = rules.find((rule) => rule.id === id)
  if (!existing) throw new Error(`Unknown triage rule: ${id}`)
  const archived: TriageRule = {
    ...existing,
    status: 'archived',
    updatedAt: new Date().toISOString(),
  }
  await writeTriageRules(workspaceId, account, [
    archived,
    ...rules.filter((rule) => rule.id !== id),
  ])
  await clearActionSuggestionsCache(workspaceId, account)
  return archived
}

export async function clearActionSuggestionsCache(
  workspaceId?: string,
  account?: string | null,
) {
  await writeSuggestionsCache(workspaceId, account, emptySuggestionsCache())
}

function formatRuleForPrompt(rule: TriageRule) {
  const exceptions = (rule.exceptions ?? [])
    .map((exception) => `    - ${exception}`)
    .join('\n')
  return [
    `- ID: ${rule.id}`,
    `  Title: ${rule.title}`,
    `  Status: ${rule.status}`,
    `  Action: ${rule.action.groupId}${
      rule.action.labelName ? ` label=${rule.action.labelName}` : ''
    }`,
    `  Rule: ${rule.body}`,
    exceptions ? `  Exceptions:\n${exceptions}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

function formatRulesBlock(rules: TriageRule[]) {
  const usableRules = rules
    .filter((rule) => rule.status !== 'archived')
    .slice(0, MAX_RULES_IN_PROMPT)
  if (usableRules.length === 0) return '(none yet)'
  return usableRules.map(formatRuleForPrompt).join('\n\n')
}

function normalizeRuleAction(value: unknown): TriageRule['action'] | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  const groupId = normalizeGroupId(candidate.groupId)
  return {
    groupId,
    labelName:
      typeof candidate.labelName === 'string' && candidate.labelName.trim()
        ? cleanText(candidate.labelName, 120)
        : undefined,
  }
}

function normalizeTriageRule(
  raw: unknown,
  existingRules: Map<string, TriageRule>,
  now: string,
): TriageRule | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Record<string, unknown>
  const id =
    typeof candidate.id === 'string' && candidate.id.trim()
      ? cleanText(candidate.id, 120)
      : `rule:${randomUUID()}`
  const title =
    typeof candidate.title === 'string' ? cleanText(candidate.title, 160) : ''
  const body =
    typeof candidate.body === 'string' ? cleanText(candidate.body, 900) : ''
  const action = normalizeRuleAction(candidate.action)
  if (!title || !body || !action) return null

  const existing = existingRules.get(id)
  const status =
    candidate.status === 'active' ||
    candidate.status === 'draft' ||
    candidate.status === 'archived'
      ? candidate.status
      : (existing?.status ?? 'draft')
  const confidence = normalizeConfidence(candidate.confidence)
  const evidenceSignalIds = Array.isArray(candidate.evidenceSignalIds)
    ? candidate.evidenceSignalIds
        .filter((item): item is string => typeof item === 'string' && !!item)
        .slice(0, 50)
    : (existing?.evidenceSignalIds ?? [])
  const exceptions = Array.isArray(candidate.exceptions)
    ? candidate.exceptions
        .filter(
          (item): item is string => typeof item === 'string' && !!item.trim(),
        )
        .map((item) => cleanText(item, 300))
        .slice(0, 12)
    : existing?.exceptions

  return {
    id,
    title,
    body,
    action,
    status,
    confidence,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    evidenceSignalIds,
    exceptions,
  }
}

// Rule reconciliation also uses structured output. There is no JSON.parse or
// code-fence cleanup here: the model layer must return schema-valid JSON.
function normalizeRulesPayload(
  payload: TriageRulesJsonResponse,
  existingRules: TriageRule[],
): TriageRule[] {
  const existingById = new Map(existingRules.map((rule) => [rule.id, rule]))
  const nextById = new Map(existingById)
  const now = new Date().toISOString()

  for (const row of payload.rules) {
    const rule = normalizeTriageRule(row, existingById, now)
    if (!rule) continue
    nextById.set(rule.id, rule)
  }

  return [...nextById.values()]
}

function buildRuleGenerationPrompt({
  signal,
  signals,
  rules,
}: {
  signal: MailTriageSignal
  signals: MailTriageSignal[]
  rules: TriageRule[]
}) {
  const recentSignals = signals
    .slice(0, RECENT_SIGNALS_IN_PROMPT)
    .map(formatSignalForPrompt)
    .join('\n')

  return [
    'Latest human triage signal:',
    formatSignalForPrompt(signal),
    '',
    'Current human-readable rules:',
    formatRulesBlock(rules),
    '',
    'Recent signals:',
    recentSignals || '(none)',
  ].join('\n')
}

const RULE_GENERATION_SYSTEM_PROMPT = `You maintain human-readable email triage preference rules for an LLM classifier.

Rules:
- Return schema-valid structured JSON only.
- Rules are natural-language guidance, not code.
- Never write regexes, glob patterns, SQL-like predicates, domain match expressions, or hardcoded implementation logic.
- Each rule must be understandable to a human and usable by an LLM as guidance.
- Preserve useful existing rules, revise them when the latest human signal indicates an exception or better wording, and add a new draft rule only when the signal suggests a reusable preference.
- If the latest signal seems one-off, return the existing rules unchanged.
- Each rule must include: id, title, body, action, status, confidence, evidenceSignalIds, and exceptions.
- action.labelName is required; use an empty string when no label applies.
- exceptions is required; use an empty array when there are no exceptions.
- action.groupId must be one of: archive, label-archive, keep-inbox, follow-up, waiting-on, reply-needed, read-later, unsubscribe-archive, trash, spam, needs-review.
- Use status "draft" for new rules unless the evidence is very strong.
- Keep titles short and bodies clear.`

async function reconcileTriageRulesFromSignal(
  workspaceId: string | undefined,
  signal: MailTriageSignal,
) {
  const account = signal.account ?? null
  const rules = await readTriageRules(workspaceId, account)
  const signals = await readTriageSignals(workspaceId, account)
  const result = await generateJson<TriageRulesJsonResponse>({
    workspaceId,
    purpose: 'emails.triage-rules.reconcile',
    system: RULE_GENERATION_SYSTEM_PROMPT,
    prompt: buildRuleGenerationPrompt({ signal, signals, rules }),
    schema: triageRulesJsonSchema,
    schemaName: 'mailTriageRules',
    schemaDescription:
      'Human-readable natural-language mail triage preference rules.',
  })
  const nextRules = normalizeRulesPayload(result.json, rules)
  await writeTriageRules(workspaceId, account, nextRules)
}

export async function regenerateTriageRules(
  workspaceId: string | undefined,
  account?: string | null,
) {
  const signals = await readTriageSignals(workspaceId, account)
  const latestSignal = signals[0]
  if (!latestSignal) return readTriageRules(workspaceId, account)
  await reconcileTriageRulesFromSignal(workspaceId, latestSignal)
  return readTriageRules(workspaceId, account)
}

async function readSuggestionsCache(
  workspaceId?: string,
  account?: string | null,
) {
  const cache = await readJsonOrThrow<ActionSuggestionsCache | null>(
    suggestionsCachePath(workspaceId, account),
    null,
  )
  return cache?.version === SUGGESTIONS_CACHE_VERSION
    ? cache
    : emptySuggestionsCache()
}

async function writeSuggestionsCache(
  workspaceId: string | undefined,
  account: string | null | undefined,
  cache: ActionSuggestionsCache,
) {
  const entries = Object.fromEntries(
    Object.entries(cache.entries)
      .sort(
        ([, a], [, b]) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt),
      )
      .slice(0, MAX_CACHED_SUGGESTIONS),
  )

  await ensureDir(triageDataDir(workspaceId, account))
  await writeJson(suggestionsCachePath(workspaceId, account), {
    version: SUGGESTIONS_CACHE_VERSION,
    updatedAt: new Date().toISOString(),
    entries,
  } satisfies ActionSuggestionsCache)
}

async function updateCachedSuggestionFromSignal(
  workspaceId: string | undefined,
  signal: MailTriageSignal,
) {
  const account = signal.account ?? null
  const cache = await readSuggestionsCache(workspaceId, account)
  const entry = cache.entries[signal.message.id]
  if (!entry) return

  entry.generatedAt = new Date().toISOString()
  entry.suggestion = {
    ...entry.suggestion,
    groupId: signal.finalGroupId,
    confidence: 1,
    reason: signal.reason ?? entry.suggestion.reason,
    suggestedLabelId:
      signal.finalGroupId === 'label-archive'
        ? (signal.finalLabelId ?? entry.suggestion.suggestedLabelId)
        : undefined,
    suggestedLabelName:
      signal.finalGroupId === 'label-archive'
        ? (signal.finalLabelName ?? entry.suggestion.suggestedLabelName)
        : undefined,
  }

  await writeSuggestionsCache(workspaceId, account, cache)
}

export async function appendTriageSignal(
  workspaceId: string | undefined,
  signal: Omit<MailTriageSignal, 'id' | 'createdAt'>,
) {
  const account = signal.account ?? null
  return serializeTriageWrite(workspaceId, account, async () => {
    const current = await readTriageSignals(workspaceId, account)
    const storedSignal: MailTriageSignal = {
      ...signal,
      account,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    }
    const next: MailTriageSignal[] = [storedSignal, ...current].slice(
      0,
      MAX_SIGNALS,
    )

    await ensureDir(triageDataDir(workspaceId, account))
    await writeJson(signalsPath(workspaceId, account), next)
    await updateCachedSuggestionFromSignal(workspaceId, storedSignal)
    if (
      storedSignal.outcome === 'corrected' ||
      storedSignal.outcome === 'label_changed' ||
      storedSignal.suggestedGroupId === 'needs-review'
    ) {
      void reconcileTriageRulesFromSignal(workspaceId, storedSignal).catch(
        (error) => {
          console.warn('Failed to reconcile triage rules:', error)
        },
      )
    }
    return storedSignal
  })
}

function userLabels(labels: MailLabel[]) {
  return labels.filter((label) => label.type === 'user')
}

function normalizeGroupId(value: unknown): MailActionGroupId {
  if (typeof value === 'string' && validGroupIds.has(value)) {
    return value as MailActionGroupId
  }
  return 'needs-review'
}

function normalizeConfidence(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return 0.5
  return Math.max(0, Math.min(1, number))
}

function normalizeReason(value: unknown) {
  if (typeof value !== 'string') return undefined
  const cleaned = cleanText(value, 160)
  return cleaned || undefined
}

// IMPORTANT TRIAGE ARCHITECTURE NOTE:
//
// Classification is intentionally LLM-only. Do NOT add regexes, sender/domain
// checks, subject keyword rules, hardcoded vendor cases, or other deterministic
// heuristics here to decide whether a message should be archived, trashed,
// labeled, kept, etc.
//
// The TypeScript in this function is only structured-output plumbing:
// - validate the LLM returned one known action group
// - ensure any suggested Gmail label is an existing user label
// - fill missing LLM rows with needs-review / Untriaged
//
// User preferences live as natural-language TriageRule records in workspace-
// and account-scoped data files. The LLM interprets those rules. Code must not
// turn those preferences into regex/classification logic.
function normalizeSuggestionsPayload(
  payload: unknown,
  messages: MailMessageSummary[],
  labels: MailLabel[],
): MailActionSuggestion[] {
  const parsed = actionSuggestionsJsonResponseSchema.safeParse(payload)
  const rows = parsed.success ? parsed.data.suggestions : []
  const messageIds = new Set(messages.map((message) => message.id))
  const labelsById = new Map(labels.map((label) => [label.id, label]))
  const labelsByName = new Map(
    labels.map((label) => [label.name.toLowerCase(), label]),
  )
  const seen = new Set<string>()
  const suggestions: MailActionSuggestion[] = []

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const candidate = row as Record<string, unknown>
    const messageId = String(candidate.messageId ?? '')
    if (!messageIds.has(messageId) || seen.has(messageId)) continue

    const groupId = normalizeGroupId(candidate.groupId)
    let label: MailLabel | undefined
    if (groupId === 'label-archive') {
      const labelId =
        typeof candidate.suggestedLabelId === 'string'
          ? candidate.suggestedLabelId
          : undefined
      const labelName =
        typeof candidate.suggestedLabelName === 'string'
          ? candidate.suggestedLabelName
          : undefined
      label =
        (labelId ? labelsById.get(labelId) : undefined) ??
        (labelName ? labelsByName.get(labelName.toLowerCase()) : undefined)
    }

    const finalGroupId: MailActionGroupId =
      groupId === 'label-archive' && !label ? 'needs-review' : groupId

    seen.add(messageId)
    suggestions.push({
      id: suggestionId(messageId, finalGroupId),
      messageId,
      groupId: finalGroupId,
      confidence: normalizeConfidence(candidate.confidence),
      reason:
        groupId === 'label-archive' && !label
          ? 'LLM suggested a label that does not exist.'
          : normalizeReason(candidate.reason),
      suggestedLabelId: label?.id,
      suggestedLabelName: label?.name,
      matchedRuleIds: Array.isArray(candidate.matchedRuleIds)
        ? candidate.matchedRuleIds.filter(
            (item): item is string => typeof item === 'string' && !!item,
          )
        : undefined,
    })
  }

  for (const message of messages) {
    if (seen.has(message.id)) continue
    suggestions.push(
      needsTriagingSuggestion(message, 'LLM did not classify this message.'),
    )
  }

  return suggestions
}

function formatMessageForPrompt(message: MailMessageSummary, index: number) {
  const flags = [
    message.unread ? 'UNREAD' : null,
    message.important ? 'IMPORTANT' : null,
    message.starred ? 'STARRED' : null,
    message.unsubscribe ? 'HAS_UNSUBSCRIBE' : null,
  ]
    .filter(Boolean)
    .join(', ')
  const body = cleanText(
    message.bodyText || message.bodyHtmlText,
    MAX_BODY_CHARS,
  )
  const snippet = cleanText(message.snippet, MAX_SNIPPET_CHARS)
  const messageDate = formatMessageDateForPrompt(message)

  return [
    `#${index + 1}${flags ? ` [${flags}]` : ''}`,
    `ID: ${message.id}`,
    `From: ${simpleSender(message.from)} (${message.from})`,
    `Subject: ${message.subject || '(no subject)'}`,
    messageDate,
    body ? `Content: ${body}` : `Preview: ${snippet}`,
  ]
    .filter(Boolean)
    .join('\n')
}

function formatSignalForPrompt(signal: MailTriageSignal) {
  const sender = simpleSender(signal.message.from)
  const changed =
    signal.suggestedGroupId && signal.suggestedGroupId !== signal.finalGroupId
      ? `${signal.suggestedGroupId} -> ${signal.finalGroupId}`
      : signal.finalGroupId
  const label = signal.finalLabelName ? ` label=${signal.finalLabelName}` : ''
  return `- ${signal.outcome}: ${sender}; subject="${cleanText(
    signal.message.subject,
    120,
  )}"; final=${changed}${label}`
}

function buildPrompt({
  messages,
  labels,
  account,
  signals,
  rules,
}: ActionSuggestionsInput & {
  signals: MailTriageSignal[]
  rules: TriageRule[]
}) {
  const visibleLabels = userLabels(labels)
    .slice(0, 120)
    .map((label) => `- ${label.id}: ${label.name}`)
    .join('\n')
  const recentSignals = signals
    .slice(0, RECENT_SIGNALS_IN_PROMPT)
    .map(formatSignalForPrompt)
    .join('\n')
  const messagesBlock = messages
    .slice(0, MAX_MESSAGES_IN_PROMPT)
    .map(formatMessageForPrompt)
    .join('\n\n')

  return [
    account ? `Account: ${account}` : null,
    `Current triage time: ${new Date().toISOString()}`,
    `Current triage day: ${currentTriageDay()}`,
    'Use the current triage time/day and each message Received/Date field to interpret relative phrases such as today, tomorrow, yesterday, this morning, later today, and this week.',
    'Action groups:',
    ...ACTION_GROUPS.map(
      (groupId) => `- ${groupId}: ${groupDescriptions[groupId]}`,
    ),
    '',
    'Existing Gmail user labels. For label-archive, choose only one of these labels by id/name when a good fit exists. Do not invent labels.',
    visibleLabels || '(none)',
    '',
    'Human-readable triage rules. These are natural-language user preferences; use them as guidance, not as code.',
    formatRulesBlock(rules),
    '',
    'Recent user triage signals. Treat corrections as strong preferences and approvals as weak preferences. Preserve exceptions.',
    recentSignals || '(none yet)',
    '',
    'Messages to classify:',
    messagesBlock,
  ]
    .filter((line) => line !== null)
    .join('\n')
}

const SYSTEM_PROMPT = `You classify email into action-oriented triage queues for a human-in-the-loop mail app.

Rules:
- Include exactly one suggestion per input message ID.
- Each suggestion must include messageId, groupId, confidence, reason, suggestedLabelId, suggestedLabelName, and matchedRuleIds.
- Use empty strings for suggestedLabelId/suggestedLabelName when no label applies.
- Use an empty matchedRuleIds array when no rule influenced the classification.
- Include matchedRuleIds when a human-readable rule influenced the classification.
- groupId must be one of: archive, label-archive, keep-inbox, follow-up, waiting-on, reply-needed, read-later, unsubscribe-archive, trash, spam, needs-review.
- Use general action groups only. Do not create topical categories.
- For label-archive, suggest an existing Gmail label only when the message clearly deserves that specific label. Use suggestedLabelId and suggestedLabelName from the provided labels only. Wrong labels are worse than no label.
- Keep reason under 14 words. It should explain why this action fits.
- Use needs-review when the rules/signals/message are insufficient, ambiguous, or you cannot classify confidently.
- Reply Needed is only for messages from a person or team that directly ask the user to answer. Do not use it for automated notices merely because they contain support/contact boilerplate.
- For label-archive, prefer no label over a weak or merely topical label match. Wrong labels are worse than no label.
- Time-sensitive or perishable messages should be evaluated against the current triage time/day and the message Received/Date fields.
- Do not recommend automatic sending or forwarding.`

function needsTriagingSuggestion(
  message: MailMessageSummary,
  reason = 'Needs triaging.',
): MailActionSuggestion {
  return {
    id: suggestionId(message.id, 'needs-review'),
    messageId: message.id,
    groupId: 'needs-review',
    confidence: 0,
    reason,
  }
}

// IMPORTANT: There are intentionally no classification helper functions here.
// Do not add functions like `isReceiptLike`, `isAutomatedSender`,
// `matchesImportantSender`, `candidateLabelIsAcceptable`, etc. Those become
// hidden regex/heuristic rules. All such preferences must be represented as
// natural-language TriageRule records and interpreted by the LLM.
//
// If the LLM fails, omits a row, or suggests a non-existent label, the safe
// fallback is needs-review / Untriaged — never a deterministic classification.
function isSyntheticFallbackSuggestion(suggestion: MailActionSuggestion) {
  return (
    suggestion.groupId === 'needs-review' &&
    suggestion.confidence === 0 &&
    (suggestion.reason === 'LLM classification unavailable.' ||
      suggestion.reason === 'LLM did not classify this message.')
  )
}

function cacheEntryIsValid(
  entry: CachedSuggestionEntry | undefined,
  message: MailMessageSummary,
  labels: MailLabel[],
  labelsFingerprint: string,
  rulesFingerprint: string,
) {
  if (!entry) return false
  if (entry.messageId !== message.id) return false
  if (entry.messageFingerprint !== computeMessageFingerprint(message))
    return false
  if (entry.labelsFingerprint !== labelsFingerprint) return false
  if (entry.rulesFingerprint !== rulesFingerprint) return false
  if (!validGroupIds.has(entry.suggestion.groupId)) return false
  if (isSyntheticFallbackSuggestion(entry.suggestion)) return false

  if (entry.suggestion.groupId === 'label-archive') {
    if (!entry.suggestion.suggestedLabelId) return true
    return labels.some(
      (label) => label.id === entry.suggestion.suggestedLabelId,
    )
  }

  return true
}

async function generateUncachedActionSuggestions(
  input: ActionSuggestionsInput,
  workspaceId?: string,
) {
  const account = input.account ?? null
  const [signals, rules] = await Promise.all([
    readTriageSignals(workspaceId, account),
    readTriageRules(workspaceId, account),
  ])
  try {
    const result = await generateJson<ActionSuggestionsJsonResponse>({
      workspaceId,
      purpose: 'emails.action-suggestions',
      system: SYSTEM_PROMPT,
      prompt: buildPrompt({ ...input, signals, rules }),
      schema: actionSuggestionsJsonSchema,
      schemaName: 'mailActionSuggestions',
      schemaDescription:
        'One action-oriented triage suggestion for each input email message.',
    })
    return normalizeSuggestionsPayload(
      result.json,
      input.messages,
      input.labels,
    )
  } catch (error) {
    console.warn(
      'Failed to generate action suggestions; leaving messages for triage:',
      error,
    )
    return input.messages.map((message) =>
      needsTriagingSuggestion(message, 'LLM classification unavailable.'),
    )
  }
}

export async function generateActionSuggestions(
  input: ActionSuggestionsInput,
  workspaceId?: string,
): Promise<MailActionSuggestion[]> {
  if (input.messages.length === 0) return []

  const account = input.account ?? null
  const [cache, rules] = await Promise.all([
    readSuggestionsCache(workspaceId, account),
    readTriageRules(workspaceId, account),
  ])
  const labelsFingerprint = computeLabelsFingerprint(input.labels)
  const rulesFingerprint = computeRulesFingerprint(rules)
  const suggestionsByMessageId = new Map<string, MailActionSuggestion>()
  const messagesToGenerate: MailMessageSummary[] = []

  if (!input.force) {
    for (const message of input.messages) {
      const cached = cache.entries[message.id]
      if (
        cacheEntryIsValid(
          cached,
          message,
          input.labels,
          labelsFingerprint,
          rulesFingerprint,
        )
      ) {
        suggestionsByMessageId.set(message.id, cached.suggestion)
      } else {
        messagesToGenerate.push(message)
      }
    }
  } else {
    messagesToGenerate.push(...input.messages)
  }

  if (messagesToGenerate.length > 0) {
    const generated = await generateUncachedActionSuggestions(
      { ...input, messages: messagesToGenerate },
      workspaceId,
    )
    const generatedAt = new Date().toISOString()

    for (const suggestion of generated) {
      const message = messagesToGenerate.find(
        (item) => item.id === suggestion.messageId,
      )
      if (!message) continue
      suggestionsByMessageId.set(message.id, suggestion)

      if (isSyntheticFallbackSuggestion(suggestion)) {
        delete cache.entries[message.id]
        continue
      }

      cache.entries[message.id] = {
        messageId: message.id,
        messageFingerprint: computeMessageFingerprint(message),
        labelsFingerprint,
        rulesFingerprint,
        generatedAt,
        suggestion,
      }
    }

    await writeSuggestionsCache(workspaceId, account, cache)
  }

  return input.messages
    .map((message) => suggestionsByMessageId.get(message.id))
    .filter((suggestion): suggestion is MailActionSuggestion =>
      Boolean(suggestion),
    )
}

export const __testing = {
  actionSuggestionsJsonSchema,
  isSyntheticFallbackSuggestion,
  normalizeSuggestionsPayload,
}
