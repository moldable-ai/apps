import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useWorkspace } from '@moldable-ai/ui'
import type { MailMessageSummary } from '../types'

export interface BriefingCacheEntry {
  fingerprint: string
  markdown: string
  generatedAt: string
  messageCount: number
  unreadCount: number
  account?: string | null
}

interface BriefingCacheResponse {
  cached: BriefingCacheEntry | null
  match: boolean | null
}

export type BriefingState = {
  fingerprint: string | null
  markdown: string
  generatedAt: string | null
  linkedMessageIds: string[]
  source: 'cache' | 'stream' | null
  status: 'idle' | 'loading' | 'streaming' | 'ready' | 'error'
  error: string | null
}

const INITIAL_STATE: BriefingState = {
  fingerprint: null,
  markdown: '',
  generatedAt: null,
  linkedMessageIds: [],
  source: null,
  status: 'idle',
  error: null,
}

type MessageSnapshot = Map<string, string>

function messageStateKey(message: MailMessageSummary) {
  return [
    message.unread ? 'u' : 'r',
    message.starred ? 's' : '-',
    message.important ? 'i' : '-',
  ].join('')
}

function createMessageSnapshot(
  messages: MailMessageSummary[],
): MessageSnapshot {
  return new Map(
    messages.map((message) => [message.id, messageStateKey(message)]),
  )
}

function extractLinkedMessageIds(markdown: string) {
  const ids = new Set<string>()
  const pattern = /<!--\s*message-ids:\s*([^>]+?)\s*-->/gi
  let match: RegExpExecArray | null

  while ((match = pattern.exec(markdown)) !== null) {
    for (const id of (match[1] ?? '').split(',')) {
      const normalized = id.trim()
      if (normalized) ids.add(normalized)
    }
  }

  return [...ids]
}

function canKeepCurrentBriefing({
  previous,
  current,
  linkedMessageIds,
}: {
  previous: MessageSnapshot | null
  current: MessageSnapshot
  linkedMessageIds: string[]
}) {
  if (!previous) return false

  const linked = new Set(linkedMessageIds)

  for (const [id, currentState] of current) {
    const previousState = previous.get(id)
    if (!previousState) return false
    if (previousState !== currentState && linked.has(id)) return false
  }

  for (const id of previous.keys()) {
    if (!current.has(id)) {
      if (linked.has(id)) return false
    }
  }

  return true
}

/**
 * Compute the same fingerprint as the server. Uses a simple FNV-1a hash over
 * the same fields, so client + server agree on cache hits before we bother
 * calling the LLM endpoint.
 */
export function computeBriefingFingerprint(
  messages: MailMessageSummary[],
  account?: string | null,
) {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193

  const mix = (str: string) => {
    for (let i = 0; i < str.length; i += 1) {
      const code = str.charCodeAt(i)
      h1 = Math.imul(h1 ^ code, 16777619) >>> 0
      h2 = Math.imul(h2 ^ code, 2654435761) >>> 0
    }
    h1 = Math.imul(h1 ^ 0, 16777619) >>> 0
    h2 = Math.imul(h2 ^ 0, 2654435761) >>> 0
  }

  mix(`v1:${account ?? ''}:${messages.length}`)
  for (const m of messages) {
    mix('\0')
    mix(m.id)
    mix('|')
    mix(m.unread ? '1' : '0')
    mix(m.starred ? '1' : '0')
    mix(m.important ? '1' : '0')
  }

  return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`
}

/**
 * The client fingerprint is only used to detect "did anything change since the
 * last render"; the server computes its own fingerprint for cache lookups, so
 * the two don't need to match bit-for-bit. We keep a single-flight guard on
 * the client to avoid duplicate streams.
 */
export function useInboxBriefing({
  messages,
  account,
  enabled,
}: {
  messages: MailMessageSummary[]
  account?: string | null
  enabled: boolean
}) {
  const { fetchWithWorkspace, workspaceId } = useWorkspace()
  const [state, setState] = useState<BriefingState>(INITIAL_STATE)
  const abortRef = useRef<AbortController | null>(null)
  const lastHandledRef = useRef<string | null>(null)
  const lastMessageSnapshotRef = useRef<MessageSnapshot | null>(null)
  const linkedMessageIdsRef = useRef<string[]>([])

  const clientFingerprint = useMemo(() => {
    if (messages.length === 0) return null
    return computeBriefingFingerprint(messages, account ?? null)
  }, [messages, account])

  const run = useCallback(
    async (force: boolean) => {
      if (!enabled || messages.length === 0 || !clientFingerprint) return
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      lastHandledRef.current = clientFingerprint
      lastMessageSnapshotRef.current = createMessageSnapshot(messages)
      setState((prev) => ({
        ...prev,
        status: force
          ? 'loading'
          : prev.status === 'ready'
            ? 'loading'
            : 'loading',
        error: null,
      }))

      try {
        const res = await fetchWithWorkspace('/api/briefing/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messages.map((m) => ({
              id: m.id,
              threadId: m.threadId,
              from: m.from,
              to: m.to,
              subject: m.subject,
              date: m.date,
              snippet: m.snippet,
              bodyText: m.bodyText,
              bodyHtmlText: m.bodyHtmlText,
              labelIds: m.labelIds,
              unread: m.unread,
              starred: m.starred,
              important: m.important,
              internalDate: m.internalDate,
            })),
            account: account ?? null,
            force,
          }),
          signal: controller.signal,
        })

        if (!res.ok || !res.body) {
          const message = await res
            .json()
            .catch(() => ({}) as { error?: string })
          throw new Error(
            (message as { error?: string }).error ?? 'Failed to load briefing',
          )
        }

        const source =
          (res.headers.get('x-emails-briefing-source') as 'cache' | 'stream') ??
          'stream'
        const fingerprint =
          res.headers.get('x-emails-briefing-fingerprint') ?? clientFingerprint
        const generatedAt =
          res.headers.get('x-emails-briefing-generated-at') ??
          new Date().toISOString()

        if (source === 'cache') {
          const markdown = (await res.text()).trim()
          if (!markdown) {
            throw new Error('Cached briefing was empty.')
          }
          if (controller.signal.aborted) return
          const linkedMessageIds = extractLinkedMessageIds(markdown)
          linkedMessageIdsRef.current = linkedMessageIds
          setState({
            fingerprint,
            markdown,
            generatedAt,
            linkedMessageIds,
            source: 'cache',
            status: 'ready',
            error: null,
          })
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''
        setState((prev) => ({
          fingerprint,
          markdown: prev.markdown,
          generatedAt,
          linkedMessageIds: prev.linkedMessageIds,
          source: 'stream',
          status: 'streaming',
          error: null,
        }))

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (controller.signal.aborted) return
          accumulated += decoder.decode(value, { stream: true })
          const nextMarkdown = accumulated.trim()
          if (nextMarkdown) {
            setState((prev) => ({ ...prev, markdown: nextMarkdown }))
          }
        }
        accumulated += decoder.decode()
        if (controller.signal.aborted) return
        const markdown = accumulated.trim()

        if (!markdown) {
          const cached = await fetchWithWorkspace(
            `/api/briefing?fingerprint=${encodeURIComponent(fingerprint)}`,
            { signal: controller.signal },
          )
            .then((cacheRes) => {
              if (!cacheRes.ok) return null
              return cacheRes.json() as Promise<BriefingCacheResponse>
            })
            .catch(() => null)

          const cachedEntry = cached?.cached ?? null
          const cachedMarkdown = cachedEntry?.markdown.trim()
          if (cached?.match && cachedEntry && cachedMarkdown) {
            setState({
              fingerprint,
              markdown: cachedMarkdown,
              generatedAt: cachedEntry.generatedAt,
              linkedMessageIds: extractLinkedMessageIds(cachedMarkdown),
              source: 'cache',
              status: 'ready',
              error: null,
            })
            linkedMessageIdsRef.current =
              extractLinkedMessageIds(cachedMarkdown)
            return
          }

          throw new Error('AI response did not include a briefing.')
        }

        const linkedMessageIds = extractLinkedMessageIds(markdown)
        linkedMessageIdsRef.current = linkedMessageIds
        setState({
          fingerprint,
          markdown,
          generatedAt,
          linkedMessageIds,
          source: 'stream',
          status: 'ready',
          error: null,
        })
      } catch (error) {
        if (controller.signal.aborted) return
        const message =
          error instanceof Error ? error.message : 'Failed to load briefing'
        setState((prev) => ({
          fingerprint: prev.fingerprint,
          markdown: prev.markdown,
          generatedAt: prev.generatedAt,
          linkedMessageIds: prev.linkedMessageIds,
          source: prev.source,
          status: 'error',
          error: message,
        }))
      }
    },
    [account, clientFingerprint, enabled, fetchWithWorkspace, messages],
  )

  useEffect(() => {
    if (!enabled || !clientFingerprint) return
    if (lastHandledRef.current === clientFingerprint) return
    const currentSnapshot = createMessageSnapshot(messages)
    if (
      state.status === 'ready' &&
      canKeepCurrentBriefing({
        previous: lastMessageSnapshotRef.current,
        current: currentSnapshot,
        linkedMessageIds: linkedMessageIdsRef.current,
      })
    ) {
      lastHandledRef.current = clientFingerprint
      lastMessageSnapshotRef.current = currentSnapshot
      return
    }
    void run(false)
  }, [clientFingerprint, enabled, messages, run, state.status])

  useEffect(() => {
    if (!enabled) {
      abortRef.current?.abort()
      lastHandledRef.current = null
      lastMessageSnapshotRef.current = null
      linkedMessageIdsRef.current = []
      setState(INITIAL_STATE)
    }
  }, [enabled])

  useEffect(() => {
    lastHandledRef.current = null
    lastMessageSnapshotRef.current = null
    linkedMessageIdsRef.current = []
  }, [workspaceId])

  useEffect(() => () => abortRef.current?.abort(), [])

  const refresh = useCallback(() => {
    lastHandledRef.current = null
    void run(true)
  }, [run])

  return {
    ...state,
    refresh,
    available: clientFingerprint !== null,
  }
}
