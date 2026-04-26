import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useWorkspace } from '@moldable-ai/ui'
import type {
  ComposerState,
  MailContact,
  MailDraft,
  MailLabel,
  MailMessageDetail,
  MailMessageSummary,
  MailStatus,
  MessageAction,
  MessagesResponse,
} from '../types'

const CACHE_PREFIX = 'moldable:emails:v1'

function cacheKey(parts: Array<string | number | null | undefined>) {
  return [CACHE_PREFIX, ...parts.map((part) => part ?? '')].join(':')
}

function readCachedValue<T>(key: string): T | undefined {
  if (typeof window === 'undefined') return undefined

  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : undefined
  } catch {
    return undefined
  }
}

function writeCachedValue<T>(key: string, value: T) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Cache writes are best-effort. The network-backed query result is still valid.
  }
}

export function useMailStatus() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const statusCacheKey = cacheKey(['status', workspaceId])

  return useQuery({
    queryKey: ['mail-status', workspaceId],
    initialData: () => {
      const cached = readCachedValue<MailStatus>(statusCacheKey)
      return cached?.authenticated ? cached : undefined
    },
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/status')
      if (!res.ok) throw new Error('Failed to load Gmail status')
      const status = (await res.json()) as MailStatus
      writeCachedValue(statusCacheKey, status)
      return status
    },
    refetchInterval: (query) =>
      query.state.data?.authenticated ? false : 2000,
    refetchIntervalInBackground: true,
  })
}

export function useMailMessages({
  folderId,
  query,
  enabled,
}: {
  folderId: string
  query: string
  enabled: boolean
}) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const messagesCacheKey = cacheKey(['messages', workspaceId, folderId, query])

  const fetchMessageDetail = async (id: string) => {
    const res = await fetchWithWorkspace(`/api/messages/${id}`)
    if (!res.ok) throw new Error('Failed to load message')
    const data = (await res.json()) as { message: MailMessageDetail }
    writeCachedValue(cacheKey(['message', workspaceId, id]), data.message)
    return data.message
  }

  return useQuery({
    queryKey: ['mail-messages', workspaceId, folderId, query],
    enabled,
    initialData: () => readCachedValue<MessagesResponse>(messagesCacheKey),
    refetchOnMount: 'always',
    refetchInterval: folderId === 'INBOX' && !query ? 15_000 : false,
    refetchIntervalInBackground: true,
    queryFn: async () => {
      const params = new URLSearchParams({
        labelId: folderId,
        maxResults: '24',
      })
      if (query) params.set('q', query)

      const res = await fetchWithWorkspace(`/api/messages?${params.toString()}`)
      if (res.status === 401) {
        await queryClient.invalidateQueries({ queryKey: ['mail-status'] })
        throw new Error('Reconnect Gmail to continue')
      }
      if (!res.ok) throw new Error('Failed to load messages')

      const data = (await res.json()) as MessagesResponse
      writeCachedValue(messagesCacheKey, data)

      for (const message of data.messages) {
        void queryClient.prefetchQuery({
          queryKey: ['mail-message', workspaceId, message.id],
          queryFn: () => fetchMessageDetail(message.id),
          staleTime: 5 * 60_000,
        })
      }

      return data
    },
  })
}

export function useWarmMailFolders({ enabled }: { enabled: boolean }) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const warmedWorkspaceRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    if (warmedWorkspaceRef.current === workspaceId) return
    warmedWorkspaceRef.current = workspaceId

    let cancelled = false
    const foldersToWarm = ['INBOX', 'SNOOZED', 'SENT', 'all', 'SPAM', 'TRASH']

    const warm = async () => {
      for (const folderId of foldersToWarm) {
        if (cancelled) return

        const query = ''
        const params = new URLSearchParams({
          labelId: folderId,
          maxResults: '24',
        })

        try {
          const res = await fetchWithWorkspace(
            `/api/messages?${params.toString()}`,
          )
          if (!res.ok) continue

          const data = (await res.json()) as MessagesResponse
          const queryKey = ['mail-messages', workspaceId, folderId, query]
          queryClient.setQueryData(queryKey, data)
          writeCachedValue(
            cacheKey(['messages', workspaceId, folderId, query]),
            data,
          )

          for (const message of data.messages) {
            void queryClient.prefetchQuery({
              queryKey: ['mail-message', workspaceId, message.id],
              queryFn: async () => {
                const detailRes = await fetchWithWorkspace(
                  `/api/messages/${message.id}`,
                )
                if (!detailRes.ok) throw new Error('Failed to load message')
                const detailData = (await detailRes.json()) as {
                  message: MailMessageDetail
                }
                writeCachedValue(
                  cacheKey(['message', workspaceId, message.id]),
                  detailData.message,
                )
                return detailData.message
              },
              staleTime: 5 * 60_000,
            })
          }
        } catch (error) {
          console.warn(`Failed to warm ${folderId} mail:`, error)
        }
      }
    }

    void warm()

    return () => {
      cancelled = true
    }
  }, [enabled, fetchWithWorkspace, queryClient, workspaceId])
}

export function useMailMessage({
  selectedId,
  enabled,
}: {
  selectedId: string | null
  enabled: boolean
}) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const messageCacheKey = selectedId
    ? cacheKey(['message', workspaceId, selectedId])
    : null

  return useQuery({
    queryKey: ['mail-message', workspaceId, selectedId],
    enabled: !!selectedId && enabled,
    initialData: () =>
      messageCacheKey
        ? readCachedValue<MailMessageDetail>(messageCacheKey)
        : undefined,
    refetchOnMount: 'always',
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await fetchWithWorkspace(`/api/messages/${selectedId}`)
      if (!res.ok) throw new Error('Failed to load message')
      const data = (await res.json()) as { message: MailMessageDetail }
      if (selectedId) {
        writeCachedValue(
          cacheKey(['message', workspaceId, selectedId]),
          data.message,
        )
      }
      return data.message
    },
  })
}

export function useMailContacts({
  enabled,
  query = '',
}: {
  enabled: boolean
  query?: string
}) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const normalizedQuery = query.trim()
  const contactsCacheKey = cacheKey(['contacts', workspaceId, normalizedQuery])

  return useQuery({
    queryKey: ['mail-contacts', workspaceId, normalizedQuery],
    enabled,
    initialData: () => readCachedValue<MailContact[]>(contactsCacheKey),
    staleTime: 10 * 60_000,
    refetchOnMount: 'always',
    queryFn: async () => {
      const params = new URLSearchParams()
      if (normalizedQuery) params.set('query', normalizedQuery)
      const queryString = params.toString()
      const res = await fetchWithWorkspace(
        `/api/contacts${queryString ? `?${queryString}` : ''}`,
      )
      if (!res.ok) throw new Error('Failed to load contacts')
      const data = (await res.json()) as { contacts: MailContact[] }
      writeCachedValue(contactsCacheKey, data.contacts)
      return data.contacts
    },
  })
}

export function useMailDrafts({ enabled }: { enabled: boolean }) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const draftsCacheKey = cacheKey(['drafts', workspaceId])

  return useQuery({
    queryKey: ['mail-drafts', workspaceId],
    enabled,
    initialData: () => readCachedValue<MailDraft[]>(draftsCacheKey),
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/drafts')
      if (!res.ok) throw new Error('Failed to load drafts')
      const data = (await res.json()) as { drafts: MailDraft[] }
      writeCachedValue(draftsCacheKey, data.drafts)
      return data.drafts
    },
  })
}

export function useSaveMailDraft() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const draftsCacheKey = cacheKey(['drafts', workspaceId])

  return useMutation({
    mutationFn: async (draft: ComposerState) => {
      const res = await fetchWithWorkspace('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? 'Failed to save draft')
      }
      return (await res.json()) as { draft: MailDraft }
    },
    onMutate: async (draft) => {
      await queryClient.cancelQueries({
        queryKey: ['mail-drafts', workspaceId],
      })
      const snapshot = queryClient.getQueryData<MailDraft[]>([
        'mail-drafts',
        workspaceId,
      ])
      const now = Date.now()
      const optimisticId = draft.draftId?.trim() || `optimistic:${now}`
      const existing = (snapshot ?? []).find((item) => item.id === optimisticId)
      const optimisticDraft: MailDraft = {
        id: optimisticId,
        composer: { ...draft, draftId: optimisticId },
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      const next = [
        optimisticDraft,
        ...(snapshot ?? []).filter((item) => item.id !== optimisticId),
      ]
      queryClient.setQueryData<MailDraft[]>(['mail-drafts', workspaceId], next)
      writeCachedValue(draftsCacheKey, next)
      return { snapshot, optimisticId }
    },
    onSuccess: (data, _draft, context) => {
      const current =
        queryClient.getQueryData<MailDraft[]>(['mail-drafts', workspaceId]) ??
        []
      const next = [
        data.draft,
        ...current.filter(
          (draft) =>
            draft.id !== data.draft.id && draft.id !== context?.optimisticId,
        ),
      ]
      queryClient.setQueryData<MailDraft[]>(['mail-drafts', workspaceId], next)
      writeCachedValue(draftsCacheKey, next)
    },
    onError: (_error, _draft, context) => {
      if (!context) return
      const next = context.snapshot ?? []
      queryClient.setQueryData<MailDraft[]>(['mail-drafts', workspaceId], next)
      writeCachedValue(draftsCacheKey, next)
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mail-drafts'] })
    },
  })
}

export function useDeleteMailDraft() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const draftsCacheKey = cacheKey(['drafts', workspaceId])

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithWorkspace(`/api/drafts/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to discard draft')
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: ['mail-drafts', workspaceId],
      })
      const snapshot = queryClient.getQueryData<MailDraft[]>([
        'mail-drafts',
        workspaceId,
      ])
      const next = (snapshot ?? []).filter((draft) => draft.id !== id)
      queryClient.setQueryData<MailDraft[]>(['mail-drafts', workspaceId], next)
      writeCachedValue(draftsCacheKey, next)
      return { snapshot }
    },
    onError: (_error, _id, context) => {
      if (!context) return
      const next = context.snapshot ?? []
      queryClient.setQueryData<MailDraft[]>(['mail-drafts', workspaceId], next)
      writeCachedValue(draftsCacheKey, next)
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mail-drafts'] })
    },
  })
}

function writeMessagesResponseCache(
  queryKey: readonly unknown[],
  response: MessagesResponse,
) {
  writeCachedValue(
    cacheKey([
      'messages',
      queryKey[1] as string,
      queryKey[2] as string,
      queryKey[3] as string,
    ]),
    response,
  )
}

function restoreMessageListSnapshots(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshots: [readonly unknown[], MessagesResponse | undefined][],
) {
  for (const [queryKey, snapshot] of snapshots) {
    queryClient.setQueryData<MessagesResponse>(queryKey, snapshot)
    if (snapshot && Array.isArray(queryKey)) {
      writeMessagesResponseCache(queryKey, snapshot)
    }
  }
}

function shouldRemoveCurrent(action: MessageAction) {
  return (
    action === 'archive' ||
    action === 'trash' ||
    action === 'spam' ||
    action === 'snooze' ||
    action === 'unsnooze'
  )
}

function applyOptimisticMessageAction({
  queryClient,
  workspaceId,
  id,
  action,
  until,
}: {
  queryClient: ReturnType<typeof useQueryClient>
  workspaceId: string
  id: string
  action: MessageAction
  until?: number
}) {
  const listSnapshots = queryClient.getQueriesData<MessagesResponse>({
    queryKey: ['mail-messages'],
  })
  const detailSnapshot = queryClient.getQueryData<MailMessageDetail>([
    'mail-message',
    workspaceId,
    id,
  ])
  let optimisticMessage: MailMessageSummary | MailMessageDetail | undefined

  for (const [queryKey, current] of listSnapshots) {
    if (!current) continue

    const folderId = Array.isArray(queryKey) ? queryKey[2] : undefined
    const query = Array.isArray(queryKey) ? queryKey[3] : undefined
    let removed = 0
    const messages = current.messages.flatMap((message) => {
      if (message.id !== id) return [message]

      const nextMessage = messageWithAction(message, action, { until })
      optimisticMessage = nextMessage
      if (messageVisibleInFolder(nextMessage, folderId, query, action)) {
        return [nextMessage]
      }
      removed += 1
      return []
    })
    const next = {
      ...current,
      messages,
      resultSizeEstimate: Math.max(0, current.resultSizeEstimate - removed),
    }

    queryClient.setQueryData<MessagesResponse>(queryKey, next)
    if (Array.isArray(queryKey)) writeMessagesResponseCache(queryKey, next)
  }

  queryClient.setQueryData<MailMessageDetail>(
    ['mail-message', workspaceId, id],
    (current) => {
      if (!current) return current
      const next = messageWithAction(current, action, { until })
      optimisticMessage = next
      writeCachedValue(cacheKey(['message', workspaceId, id]), next)
      return next
    },
  )

  const source = optimisticMessage ?? detailSnapshot
  if (source) {
    const nextMessage = messageWithAction(source, action, { until })
    for (const [queryKey] of listSnapshots) {
      if (!Array.isArray(queryKey)) continue
      const folderId = queryKey[2]
      const query = queryKey[3]
      if (!shouldInsertMissingMessage(folderId, query, action)) continue

      const current = queryClient.getQueryData<MessagesResponse>(queryKey)
      if (!current || current.messages.some((message) => message.id === id)) {
        continue
      }
      if (!messageVisibleInFolder(nextMessage, folderId, query, action)) {
        continue
      }

      const next = {
        ...current,
        messages: [nextMessage, ...current.messages],
        resultSizeEstimate: current.resultSizeEstimate + 1,
      }
      queryClient.setQueryData<MessagesResponse>(queryKey, next)
      writeMessagesResponseCache(queryKey, next)
    }
  }

  return { listSnapshots, detailSnapshot }
}

function messageWithAction<T extends MailMessageDetail | MailMessageSummary>(
  message: T,
  action: MessageAction,
  options: { until?: number } = {},
): T {
  const labelIds = new Set(message.labelIds)

  const changes: Record<
    MessageAction,
    { addLabelIds?: string[]; removeLabelIds?: string[] }
  > = {
    archive: { removeLabelIds: ['INBOX', 'SNOOZED'] },
    trash: { addLabelIds: ['TRASH'], removeLabelIds: ['INBOX', 'SNOOZED'] },
    untrash: { removeLabelIds: ['TRASH'] },
    markRead: { removeLabelIds: ['UNREAD'] },
    markUnread: { addLabelIds: ['UNREAD'] },
    star: { addLabelIds: ['STARRED'] },
    unstar: { removeLabelIds: ['STARRED'] },
    important: { addLabelIds: ['IMPORTANT'] },
    unimportant: { removeLabelIds: ['IMPORTANT'] },
    spam: { addLabelIds: ['SPAM'], removeLabelIds: ['INBOX', 'SNOOZED'] },
    notSpam: { addLabelIds: ['INBOX'], removeLabelIds: ['SPAM'] },
    snooze: { addLabelIds: ['SNOOZED'], removeLabelIds: ['INBOX'] },
    unsnooze: { addLabelIds: ['INBOX'], removeLabelIds: ['SNOOZED'] },
  }

  for (const labelId of changes[action].removeLabelIds ?? []) {
    labelIds.delete(labelId)
  }
  for (const labelId of changes[action].addLabelIds ?? []) {
    labelIds.add(labelId)
  }

  return {
    ...message,
    snoozedUntil:
      action === 'snooze'
        ? options.until
        : action === 'unsnooze'
          ? undefined
          : message.snoozedUntil,
    labelIds: [...labelIds],
    unread: labelIds.has('UNREAD'),
    starred: labelIds.has('STARRED'),
    important: labelIds.has('IMPORTANT'),
  }
}

function messageVisibleInFolder(
  message: MailMessageSummary,
  folderId: unknown,
  query: unknown,
  action: MessageAction,
) {
  if (action === 'snooze') return false
  if (typeof folderId !== 'string') return true

  if (folderId === 'SNOOZED') {
    return (
      action !== 'archive' &&
      action !== 'trash' &&
      action !== 'spam' &&
      action !== 'unsnooze'
    )
  }

  if (folderId === 'all') {
    return (
      !message.labelIds.includes('TRASH') &&
      !message.labelIds.includes('SPAM') &&
      messageMatchesQuery(message, query)
    )
  }

  if (!message.labelIds.includes(folderId)) return false
  return messageMatchesQuery(message, query)
}

function messageMatchesQuery(message: MailMessageSummary, query: unknown) {
  if (typeof query !== 'string' || !query) return true
  if (query === 'is:unread') return message.unread
  return true
}

function shouldInsertMissingMessage(
  folderId: unknown,
  query: unknown,
  action: MessageAction,
) {
  if (folderId === 'SNOOZED' && action === 'snooze') return true
  if (folderId === 'TRASH' && action === 'trash' && !query) return true
  if (folderId === 'SPAM' && action === 'spam' && !query) return true
  if (folderId === 'all' && action === 'archive' && !query) return true
  if (
    folderId === 'INBOX' &&
    (action === 'unsnooze' || action === 'notSpam') &&
    !query
  ) {
    return true
  }
  if (query === 'is:unread' && action === 'markUnread') return true
  return false
}

export function useLabels(enabled: boolean = true) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const labelsCacheKey = cacheKey(['labels', workspaceId])

  return useQuery({
    queryKey: ['mail-labels', workspaceId],
    enabled,
    initialData: () => readCachedValue<MailLabel[]>(labelsCacheKey),
    staleTime: 60_000,
    refetchOnMount: 'always',
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/labels')
      if (!res.ok) throw new Error('Failed to load labels')
      const data = (await res.json()) as { labels: MailLabel[] }
      const labels = data.labels ?? []
      writeCachedValue(labelsCacheKey, labels)
      return labels
    },
  })
}

function applyLabelChanges<T extends MailMessageSummary | MailMessageDetail>(
  message: T,
  changes: { addLabelIds?: string[]; removeLabelIds?: string[] },
): T {
  const labelIds = new Set(message.labelIds)
  for (const id of changes.removeLabelIds ?? []) labelIds.delete(id)
  for (const id of changes.addLabelIds ?? []) labelIds.add(id)
  return {
    ...message,
    labelIds: [...labelIds],
    unread: labelIds.has('UNREAD'),
    starred: labelIds.has('STARRED'),
    important: labelIds.has('IMPORTANT'),
  }
}

function messageVisibleWithLabels(
  message: MailMessageSummary,
  folderId: unknown,
  query: unknown,
) {
  if (typeof folderId !== 'string') return true

  if (folderId === 'SNOOZED') {
    return (
      message.labelIds.includes('SNOOZED') &&
      messageMatchesQuery(message, query)
    )
  }

  if (folderId === 'all') {
    return (
      !message.labelIds.includes('TRASH') &&
      !message.labelIds.includes('SPAM') &&
      messageMatchesQuery(message, query)
    )
  }

  if (!message.labelIds.includes(folderId)) return false
  return messageMatchesQuery(message, query)
}

export function useUpdateMessageLabels() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      addLabelIds,
      removeLabelIds,
    }: {
      id: string
      addLabelIds?: string[]
      removeLabelIds?: string[]
    }) => {
      const res = await fetchWithWorkspace(`/api/messages/${id}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addLabelIds, removeLabelIds }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? 'Failed to update labels')
      }
    },
    onMutate: async (variables) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['mail-messages'] }),
        queryClient.cancelQueries({
          queryKey: ['mail-message', workspaceId, variables.id],
        }),
      ])
      const listSnapshots = queryClient.getQueriesData<MessagesResponse>({
        queryKey: ['mail-messages'],
      })
      const detailSnapshot = queryClient.getQueryData<MailMessageDetail>([
        'mail-message',
        workspaceId,
        variables.id,
      ])
      const changes = {
        addLabelIds: variables.addLabelIds,
        removeLabelIds: variables.removeLabelIds,
      }
      for (const [
        queryKey,
        current,
      ] of queryClient.getQueriesData<MessagesResponse>({
        queryKey: ['mail-messages'],
      })) {
        if (!current) continue
        const folderId = Array.isArray(queryKey) ? queryKey[2] : undefined
        const query = Array.isArray(queryKey) ? queryKey[3] : undefined
        let removed = 0
        const next = {
          ...current,
          messages: current.messages.flatMap((message) => {
            if (message.id !== variables.id) return [message]

            const nextMessage = applyLabelChanges(message, changes)
            if (messageVisibleWithLabels(nextMessage, folderId, query)) {
              return [nextMessage]
            }
            removed += 1
            return []
          }),
          resultSizeEstimate: Math.max(0, current.resultSizeEstimate - removed),
        }
        queryClient.setQueryData<MessagesResponse>(queryKey, next)
        if (Array.isArray(queryKey)) {
          writeMessagesResponseCache(queryKey, next)
        }
      }
      queryClient.setQueryData<MailMessageDetail>(
        ['mail-message', workspaceId, variables.id],
        (current) => {
          if (!current) return current
          const next = applyLabelChanges(current, changes)
          writeCachedValue(
            cacheKey(['message', workspaceId, variables.id]),
            next,
          )
          return next
        },
      )
      return { listSnapshots, detailSnapshot, id: variables.id }
    },
    onError: (_error, _variables, context) => {
      if (!context) return
      restoreMessageListSnapshots(queryClient, context.listSnapshots)
      if (context.detailSnapshot) {
        queryClient.setQueryData<MailMessageDetail>(
          ['mail-message', workspaceId, context.id],
          context.detailSnapshot,
        )
        writeCachedValue(
          cacheKey(['message', workspaceId, context.id]),
          context.detailSnapshot,
        )
      }
    },
    onSettled: async (_data, _error, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['mail-messages'] }),
        queryClient.invalidateQueries({
          queryKey: ['mail-message', workspaceId, variables.id],
        }),
      ])
    },
  })
}

export function useMessageAction({
  onRemoveCurrent,
}: {
  onRemoveCurrent: () => void
}) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      action,
      until,
    }: {
      id: string
      action: MessageAction
      until?: number
    }) => {
      const res = await fetchWithWorkspace(`/api/messages/${id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, until }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? 'Failed to update message')
      }
    },
    onMutate: async (variables) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['mail-messages'] }),
        queryClient.cancelQueries({
          queryKey: ['mail-message', workspaceId, variables.id],
        }),
      ])
      const context = applyOptimisticMessageAction({
        queryClient,
        workspaceId,
        id: variables.id,
        action: variables.action,
        until: variables.until,
      })
      if (shouldRemoveCurrent(variables.action)) {
        onRemoveCurrent()
      }
      return { ...context, id: variables.id }
    },
    onError: (_error, _variables, context) => {
      if (!context) return
      restoreMessageListSnapshots(queryClient, context.listSnapshots)
      if (context.detailSnapshot) {
        queryClient.setQueryData<MailMessageDetail>(
          ['mail-message', workspaceId, context.id],
          context.detailSnapshot,
        )
        writeCachedValue(
          cacheKey(['message', workspaceId, context.id]),
          context.detailSnapshot,
        )
      }
    },
  })
}

export function useUnsubscribeAndArchive({
  onRemoveCurrent,
}: {
  onRemoveCurrent: () => void
}) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithWorkspace(
        `/api/messages/${id}/unsubscribe-archive`,
        {
          method: 'POST',
        },
      )
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? 'Failed to unsubscribe')
      }
    },
    onMutate: async (id) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['mail-messages'] }),
        queryClient.cancelQueries({
          queryKey: ['mail-message', workspaceId, id],
        }),
      ])

      const context = applyOptimisticMessageAction({
        queryClient,
        workspaceId,
        id,
        action: 'archive',
      })
      onRemoveCurrent()

      return { ...context, id }
    },
    onError: (_error, _id, context) => {
      if (!context) return
      restoreMessageListSnapshots(queryClient, context.listSnapshots)
      if (context?.detailSnapshot) {
        queryClient.setQueryData<MailMessageDetail>(
          ['mail-message', workspaceId, context.id],
          context.detailSnapshot,
        )
        writeCachedValue(
          cacheKey(['message', workspaceId, context.id]),
          context.detailSnapshot,
        )
      }
    },
    onSettled: async (_data, _error, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['mail-messages'] }),
        queryClient.invalidateQueries({
          queryKey: ['mail-message', workspaceId, id],
        }),
      ])
    },
  })
}

export function useSendMail() {
  const { fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (draft: ComposerState) => {
      const res = await fetchWithWorkspace('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? 'Failed to send email')
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mail-messages'] })
    },
  })
}

export function useDisconnectGmail() {
  const { fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await fetchWithWorkspace('/api/auth/logout', {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to disconnect Gmail')
    },
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ['mail-messages'] })
      queryClient.removeQueries({ queryKey: ['mail-message'] })
      queryClient.removeQueries({ queryKey: ['mail-contacts'] })
      await queryClient.invalidateQueries({ queryKey: ['mail-status'] })
    },
  })
}

export function useConnectGmail() {
  const { fetchWithWorkspace } = useWorkspace()

  return async () => {
    const res = await fetchWithWorkspace('/api/auth/login')
    const data = (await res.json()) as { url?: string; error?: string }
    if (!data.url) throw new Error(data.error ?? 'Failed to begin Gmail login')

    if (window.parent !== window) {
      window.parent.postMessage(
        { type: 'moldable:open-url', url: data.url },
        '*',
      )
    } else {
      window.open(data.url, '_blank')
    }
  }
}
