import {
  Archive,
  Ban,
  BookOpen,
  Check,
  Clock,
  CornerUpLeft,
  Eye,
  EyeOff,
  Inbox,
  Info,
  Loader2,
  MessageSquareReply,
  Pencil,
  RefreshCcw,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentType, KeyboardEvent, MouseEvent } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from '@moldable-ai/ui'
import { cleanSnippet, formatMessageTime, senderName } from '../lib/mail-format'
import type {
  ActionSuggestionsResponse,
  MailActionGroupId,
  MailActionSuggestion,
  MailLabel,
  MailMessageSummary,
  MailTriageSignalInput,
} from '../types'
import { Avatar } from './inbox-view'
import { SnoozeMenu } from './snooze-menu'

interface ActionGroupDefinition {
  id: MailActionGroupId
  label: string
  description: string
  icon: LucideIcon
  risky?: boolean
}

const ACTION_GROUPS: ActionGroupDefinition[] = [
  {
    id: 'reply-needed',
    label: 'Reply Needed',
    description: 'Likely needs a response.',
    icon: MessageSquareReply,
  },
  {
    id: 'keep-inbox',
    label: 'To Do / Keep in Inbox',
    description: 'Keep visible as an inbox task.',
    icon: Inbox,
  },
  {
    id: 'follow-up',
    label: 'Follow Up',
    description: 'Track for later.',
    icon: Clock,
  },
  {
    id: 'waiting-on',
    label: 'Waiting On',
    description: 'Pending someone else.',
    icon: Eye,
  },
  {
    id: 'read-later',
    label: 'Read Later',
    description: 'Worth reading, not urgent.',
    icon: BookOpen,
  },
  {
    id: 'label-archive',
    label: 'Label & Archive',
    description: 'File for reference and remove from inbox.',
    icon: Tag,
  },
  {
    id: 'archive',
    label: 'Archive',
    description: 'No further attention needed.',
    icon: Archive,
  },
  {
    id: 'unsubscribe-archive',
    label: 'Unsubscribe & Archive',
    description: 'Leave the list and remove from inbox.',
    icon: Archive,
    risky: true,
  },
  {
    id: 'trash',
    label: 'Trash',
    description: 'Move to trash.',
    icon: Trash2,
    risky: true,
  },
  {
    id: 'spam',
    label: 'Spam',
    description: 'Mark as spam.',
    icon: Ban,
    risky: true,
  },
  {
    id: 'needs-review',
    label: 'Untriaged',
    description: 'Needs another classification pass.',
    icon: Sparkles,
  },
]

const ACTION_GROUP_BY_ID = new Map(
  ACTION_GROUPS.map((group) => [group.id, group]),
)

function scrollParentFor(element: HTMLElement | null) {
  let current = element?.parentElement ?? null
  while (current) {
    const style = window.getComputedStyle(current)
    if (
      /(auto|scroll)/.test(style.overflowY) &&
      current.scrollHeight > current.clientHeight
    ) {
      return current
    }
    current = current.parentElement
  }
  return null
}

function preserveScrollPosition(anchor?: HTMLElement | null) {
  if (typeof window === 'undefined') return
  const scrollParent = scrollParentFor(anchor ?? null)

  if (scrollParent) {
    const top = scrollParent.scrollTop
    requestAnimationFrame(() => {
      scrollParent.scrollTop = top
    })
    return
  }

  const x = window.scrollX
  const y = window.scrollY
  requestAnimationFrame(() => window.scrollTo(x, y))
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

interface ActionSuggestionsPanelProps {
  messages: MailMessageSummary[]
  labels: MailLabel[]
  response?: ActionSuggestionsResponse
  loading: boolean
  error: unknown
  onRefresh: () => void
  onRetriage: (
    suggestions: MailActionSuggestion[],
  ) => Promise<MailActionSuggestion[]>
  onSelectMessage: (id: string) => void
  onReply: (id: string) => void
  onArchive: (id: string) => void
  onUnsubscribeArchive: (id: string) => void
  onSnooze: (id: string, until: number) => void
  onUnsnooze: (id: string) => void
  onSpam: (id: string) => void
  onApprove: (suggestion: MailActionSuggestion) => Promise<void>
  onRecordSignal: (signal: MailTriageSignalInput) => Promise<void>
}

export function ActionSuggestionsPanel({
  messages,
  labels,
  response,
  loading,
  error,
  onRefresh,
  onRetriage,
  onSelectMessage,
  onReply,
  onArchive,
  onUnsubscribeArchive,
  onSnooze,
  onUnsnooze,
  onSpam,
  onApprove,
  onRecordSignal,
}: ActionSuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<MailActionSuggestion[]>([])
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set())
  const [retriagingGroupIds, setRetriagingGroupIds] = useState<
    Set<MailActionGroupId>
  >(() => new Set())
  const [approvalError, setApprovalError] = useState<string | null>(null)
  const [approvingGroupIds, setApprovingGroupIds] = useState<
    Set<MailActionGroupId>
  >(() => new Set())
  const scrollAnchorRef = useRef<HTMLElement | null>(null)
  const originalSuggestionsRef = useRef<Map<string, MailActionSuggestion>>(
    new Map(),
  )

  useEffect(() => {
    if (!response) return
    const nextSuggestions = response.suggestions ?? []
    setSuggestions(nextSuggestions)
    setHiddenIds((current) => {
      const nextMessageIds = new Set(
        nextSuggestions.map((suggestion) => suggestion.messageId),
      )
      return new Set([...current].filter((id) => nextMessageIds.has(id)))
    })
    originalSuggestionsRef.current = new Map(
      nextSuggestions.map((suggestion) => [suggestion.messageId, suggestion]),
    )
  }, [response])

  const messageById = useMemo(
    () => new Map(messages.map((message) => [message.id, message])),
    [messages],
  )
  const userLabels = useMemo(
    () => labels.filter((label) => label.type === 'user').sort(compareLabels),
    [labels],
  )
  const visibleSuggestions = useMemo(
    () =>
      suggestions.filter(
        (suggestion) =>
          !hiddenIds.has(suggestion.messageId) &&
          messageById.has(suggestion.messageId),
      ),
    [hiddenIds, messageById, suggestions],
  )
  const grouped = useMemo(
    () =>
      ACTION_GROUPS.map((group) => ({
        group,
        suggestions: visibleSuggestions.filter(
          (suggestion) => suggestion.groupId === group.id,
        ),
      })).filter((group) => group.suggestions.length > 0),
    [visibleSuggestions],
  )

  const buildSignal = (
    suggestion: MailActionSuggestion,
    outcome: MailTriageSignalInput['outcome'],
    finalGroupId: MailActionGroupId,
    labelName?: string,
  ): MailTriageSignalInput | null => {
    const message = messageById.get(suggestion.messageId)
    if (!message) return null
    const original = originalSuggestionsRef.current.get(suggestion.messageId)
    return {
      message: pickSignalMessage(message),
      suggestedGroupId: original?.groupId ?? suggestion.groupId,
      finalGroupId,
      outcome,
      suggestedLabelId: original?.suggestedLabelId,
      suggestedLabelName: original?.suggestedLabelName,
      finalLabelId: suggestion.suggestedLabelId,
      finalLabelName: labelName ?? suggestion.suggestedLabelName,
      reason: suggestion.reason,
    }
  }

  const record = (
    suggestion: MailActionSuggestion,
    outcome: MailTriageSignalInput['outcome'],
    finalGroupId: MailActionGroupId,
    labelName?: string,
  ) => {
    const signal = buildSignal(suggestion, outcome, finalGroupId, labelName)
    if (!signal) return
    setApprovalError(null)
    void onRecordSignal(signal).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      console.error('Failed to record triage signal:', error)
      setApprovalError(`Failed to record triage signal: ${message}`)
    })
  }

  const handleMove = (
    suggestion: MailActionSuggestion,
    nextGroupId: MailActionGroupId,
  ) => {
    if (suggestion.groupId === nextGroupId) return
    setSuggestions((current) =>
      current.map((item) =>
        item.messageId === suggestion.messageId
          ? { ...item, groupId: nextGroupId }
          : item,
      ),
    )
    record(suggestion, 'corrected', nextGroupId)
  }

  const handleLabelChange = (
    suggestion: MailActionSuggestion,
    labelId: string,
  ) => {
    const label = userLabels.find((item) => item.id === labelId)
    const nextSuggestion = {
      ...suggestion,
      suggestedLabelId: label?.id,
      suggestedLabelName: label?.name,
    }
    setSuggestions((current) =>
      current.map((item) =>
        item.messageId === suggestion.messageId ? nextSuggestion : item,
      ),
    )
    record(nextSuggestion, 'label_changed', 'label-archive', label?.name)
  }

  const approveSuggestion = async (suggestion: MailActionSuggestion) => {
    const signal = buildSignal(
      suggestion,
      'approved',
      suggestion.groupId,
      suggestion.suggestedLabelName,
    )
    if (!signal) return

    setApprovalError(null)
    setHiddenIds((current) => new Set(current).add(suggestion.messageId))
    preserveScrollPosition(scrollAnchorRef.current)

    try {
      await onApprove(suggestion)
      await onRecordSignal(signal)
    } catch (error) {
      const message = formatError(error)
      console.error('Failed to approve triage suggestion:', error)
      setHiddenIds((current) => {
        const next = new Set(current)
        next.delete(suggestion.messageId)
        return next
      })
      setApprovalError(`Failed to approve suggestion: ${message}`)
      preserveScrollPosition(scrollAnchorRef.current)
    }
  }

  const approveGroup = async (
    groupId: MailActionGroupId,
    groupSuggestions: MailActionSuggestion[],
  ) => {
    const approvableSuggestions = groupSuggestions.filter(
      (suggestion) =>
        !requiresLabel(suggestion) || !!suggestion.suggestedLabelId,
    )
    if (approvableSuggestions.length === 0) return

    setApprovalError(null)
    setApprovingGroupIds((current) => new Set(current).add(groupId))
    setHiddenIds((current) => {
      const next = new Set(current)
      for (const suggestion of approvableSuggestions) {
        next.add(suggestion.messageId)
      }
      return next
    })
    preserveScrollPosition(scrollAnchorRef.current)

    const failedMessageIds = new Set<string>()
    const errors: string[] = []

    for (const suggestion of approvableSuggestions) {
      const signal = buildSignal(
        suggestion,
        'approved',
        suggestion.groupId,
        suggestion.suggestedLabelName,
      )
      if (!signal) continue

      try {
        await onApprove(suggestion)
        await onRecordSignal(signal)
      } catch (error) {
        failedMessageIds.add(suggestion.messageId)
        errors.push(formatError(error))
        console.error('Failed to approve triage suggestion:', error)
      }
    }

    if (failedMessageIds.size > 0) {
      setHiddenIds((current) => {
        const next = new Set(current)
        for (const messageId of failedMessageIds) next.delete(messageId)
        return next
      })
      setApprovalError(
        `Failed to approve ${failedMessageIds.size} suggestion${
          failedMessageIds.size === 1 ? '' : 's'
        }: ${errors[0] ?? 'Unknown error'}`,
      )
      preserveScrollPosition(scrollAnchorRef.current)
    }

    setApprovingGroupIds((current) => {
      const next = new Set(current)
      next.delete(groupId)
      return next
    })
  }

  const retriageGroup = async (
    groupId: MailActionGroupId,
    groupSuggestions: MailActionSuggestion[],
  ) => {
    if (groupSuggestions.length === 0 || retriagingGroupIds.has(groupId)) return

    setRetriagingGroupIds((current) => new Set(current).add(groupId))
    try {
      const messageIds = new Set(
        groupSuggestions.map((suggestion) => suggestion.messageId),
      )
      const nextSuggestions = await onRetriage(groupSuggestions)
      const nextByMessageId = new Map(
        nextSuggestions.map((suggestion) => [suggestion.messageId, suggestion]),
      )
      const replacedMessageIds = new Set<string>()

      setSuggestions((current) => {
        const updated = current.flatMap((suggestion) => {
          if (!messageIds.has(suggestion.messageId)) return [suggestion]
          const replacement = nextByMessageId.get(suggestion.messageId)
          if (!replacement) return []
          replacedMessageIds.add(replacement.messageId)
          return [replacement]
        })

        for (const suggestion of nextSuggestions) {
          if (!replacedMessageIds.has(suggestion.messageId)) {
            updated.push(suggestion)
          }
        }

        return updated
      })
      setHiddenIds((current) => {
        const next = new Set(current)
        for (const messageId of messageIds) next.delete(messageId)
        return next
      })
      for (const suggestion of nextSuggestions) {
        originalSuggestionsRef.current.set(suggestion.messageId, suggestion)
      }
    } catch (error) {
      console.error('Failed to re-triage action suggestions:', error)
    } finally {
      setRetriagingGroupIds((current) => {
        const next = new Set(current)
        next.delete(groupId)
        return next
      })
    }
  }

  if (loading && !response) return <ActionSuggestionsSkeleton />

  if (error && !response) {
    return (
      <div className="border-border/70 bg-muted/20 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3">
        <p className="text-muted-foreground text-xs">
          Couldn&apos;t suggest actions. Use Inbox for the raw message list.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="h-8 cursor-pointer gap-2 rounded-full text-xs"
        >
          <RefreshCcw className="size-3.5" />
          Retry
        </Button>
      </div>
    )
  }

  if (visibleSuggestions.length === 0) {
    return (
      <div className="text-muted-foreground flex items-center justify-between gap-3 px-4 py-2 text-xs">
        <span>No triage suggestions for the current inbox.</span>
        <button
          type="button"
          onClick={onRefresh}
          className="hover:text-foreground cursor-pointer rounded-full px-2 py-1 transition-colors"
        >
          Refresh
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="text-muted-foreground flex items-center justify-between gap-3 px-4 text-xs">
        <span>
          Triage · {visibleSuggestions.length} suggestion
          {visibleSuggestions.length === 1 ? '' : 's'}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className={cn(
            'hover:text-foreground flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 transition-colors',
            loading && 'cursor-not-allowed opacity-60',
          )}
        >
          {loading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <RefreshCcw className="size-3" />
          )}
          Refresh
        </button>
      </div>

      {approvalError ? (
        <div className="border-destructive/40 bg-destructive/10 text-destructive mx-4 rounded-xl border px-3 py-2 text-xs">
          {approvalError}
        </div>
      ) : null}

      {grouped.map(({ group, suggestions: groupSuggestions }) => {
        const Icon = group.icon
        const hasMissingRequiredLabel = groupSuggestions.some(
          (suggestion) =>
            requiresLabel(suggestion) && !suggestion.suggestedLabelId,
        )
        const isRetriaging = retriagingGroupIds.has(group.id)
        const isApproving = approvingGroupIds.has(group.id)
        const showRetriage = group.id === 'needs-review'

        return (
          <section key={group.id}>
            <div className="mb-2 flex items-center justify-between gap-3 pl-4 pr-2">
              <div className="flex min-w-0 items-center gap-2">
                <Icon
                  className={cn(
                    'text-muted-foreground size-3.5 shrink-0',
                    group.risky && 'text-destructive',
                  )}
                />
                <h2 className="text-muted-foreground/80 truncate text-xs font-medium uppercase tracking-wider">
                  {group.label}
                </h2>
                <span className="text-muted-foreground/70 shrink-0 text-[11px] tabular-nums">
                  {groupSuggestions.length}
                </span>
                <span className="text-muted-foreground hidden truncate text-[11px] sm:inline">
                  {group.description}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {showRetriage ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Re-triage Untriaged messages"
                        onClick={() =>
                          void retriageGroup(group.id, groupSuggestions)
                        }
                        disabled={isRetriaging}
                        className={cn(
                          'text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors',
                          'focus-visible:ring-ring/60 focus-visible:outline-none focus-visible:ring-2',
                          isRetriaging && 'cursor-not-allowed opacity-60',
                        )}
                      >
                        {isRetriaging ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <RefreshCcw className="size-3.5" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Re-triage Untriaged</p>
                    </TooltipContent>
                  </Tooltip>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    scrollAnchorRef.current = event.currentTarget
                    event.currentTarget.blur()
                    void approveGroup(group.id, groupSuggestions)
                  }}
                  disabled={hasMissingRequiredLabel || isApproving}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground h-7 shrink-0 cursor-pointer gap-1.5 rounded-full px-2.5 text-[11px] disabled:cursor-not-allowed"
                  title={
                    hasMissingRequiredLabel
                      ? 'Choose labels before approving this group'
                      : `Approve ${group.label}`
                  }
                >
                  {isApproving ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Check className="size-3" />
                  )}
                  {isApproving ? 'Approving' : 'Approve'}
                </Button>
              </div>
            </div>

            <div className="border-border/70 bg-muted/30 dark:bg-muted/20 overflow-hidden rounded-2xl border">
              {groupSuggestions.map((suggestion, index) => {
                const message = messageById.get(suggestion.messageId)
                if (!message) return null
                return (
                  <SuggestionRow
                    key={suggestion.messageId}
                    message={message}
                    suggestion={suggestion}
                    userLabels={userLabels}
                    showSeparator={index < groupSuggestions.length - 1}
                    onSelect={() => onSelectMessage(message.id)}
                    onReply={() => onReply(message.id)}
                    onArchive={() => onArchive(message.id)}
                    onUnsubscribeArchive={() =>
                      onUnsubscribeArchive(message.id)
                    }
                    onSnooze={(until) => onSnooze(message.id, until)}
                    onUnsnooze={() => onUnsnooze(message.id)}
                    onSpam={() => onSpam(message.id)}
                    onMove={handleMove}
                    onLabelChange={handleLabelChange}
                    onApprove={(item, anchor) => {
                      scrollAnchorRef.current = anchor
                      void approveSuggestion(item)
                    }}
                  />
                )
              })}
            </div>
          </section>
        )
      })}
    </>
  )
}

function SuggestionRow({
  message,
  suggestion,
  userLabels,
  showSeparator,
  onSelect,
  onReply,
  onArchive,
  onUnsubscribeArchive,
  onSnooze,
  onUnsnooze,
  onSpam,
  onMove,
  onLabelChange,
  onApprove,
}: {
  message: MailMessageSummary
  suggestion: MailActionSuggestion
  userLabels: MailLabel[]
  showSeparator: boolean
  onSelect: () => void
  onReply: () => void
  onArchive: () => void
  onUnsubscribeArchive: () => void
  onSnooze: (until: number) => void
  onUnsnooze: () => void
  onSpam: () => void
  onMove: (suggestion: MailActionSuggestion, groupId: MailActionGroupId) => void
  onLabelChange: (suggestion: MailActionSuggestion, labelId: string) => void
  onApprove: (suggestion: MailActionSuggestion, anchor: HTMLElement) => void
}) {
  const group = ACTION_GROUP_BY_ID.get(suggestion.groupId)
  const labelRequired = requiresLabel(suggestion)
  const canApprove = !labelRequired || !!suggestion.suggestedLabelId
  const snippet = cleanSnippet(message.snippet)
  const [editOpen, setEditOpen] = useState(false)
  const [draftGroupId, setDraftGroupId] = useState<MailActionGroupId>(
    suggestion.groupId,
  )
  const [draftLabelId, setDraftLabelId] = useState(
    suggestion.suggestedLabelId ?? '',
  )

  useEffect(() => {
    setDraftGroupId(suggestion.groupId)
    setDraftLabelId(suggestion.suggestedLabelId ?? '')
  }, [suggestion.groupId, suggestion.suggestedLabelId])

  const selectedLabel = userLabels.find(
    (label) =>
      label.id === suggestion.suggestedLabelId ||
      label.name === suggestion.suggestedLabelName,
  )
  const GroupIcon = group?.icon ?? Sparkles

  const applyEdit = () => {
    const nextSuggestion = { ...suggestion, groupId: draftGroupId }
    if (draftGroupId !== suggestion.groupId) onMove(suggestion, draftGroupId)
    if (
      draftGroupId === 'label-archive' &&
      draftLabelId !== (suggestion.suggestedLabelId ?? '')
    ) {
      onLabelChange(nextSuggestion, draftLabelId)
    }
    setEditOpen(false)
  }

  return (
    <div
      className={cn(
        'hover:bg-background/70 group relative px-4 py-3 transition-colors',
        '[--emails-row-hover:color-mix(in_oklch,var(--background)_90%,var(--muted))]',
        showSeparator && 'emails-dashed-separator',
      )}
      style={{ ['--emails-dash-inset' as string]: '3.5rem' }}
    >
      <button
        type="button"
        onClick={onSelect}
        className="focus-visible:ring-ring/60 grid w-full cursor-pointer grid-cols-[auto_1fr_auto] items-start gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2"
      >
        <Avatar from={message.from} size="md" />
        <div className="min-w-0 pt-0.5">
          <div className="flex min-w-0 items-center gap-2">
            {message.unread ? (
              <span className="emails-row-unread-dot size-1.5 shrink-0 rounded-full" />
            ) : null}
            <p
              className={cn(
                'truncate text-[13.5px] leading-5',
                message.unread
                  ? 'text-foreground font-semibold'
                  : 'text-foreground/95 font-medium',
              )}
            >
              {senderName(message.from)}
            </p>
          </div>
          <p
            className={cn(
              'mt-0.5 truncate text-[13.5px] leading-5',
              message.unread
                ? 'text-foreground font-medium'
                : 'text-foreground/80',
            )}
          >
            {message.subject || '(No subject)'}
          </p>
          {snippet ? (
            <p className="text-muted-foreground mt-1 line-clamp-1 text-xs leading-5">
              {snippet}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 pt-1 transition-opacity group-focus-within:opacity-0 group-hover:opacity-0">
          <span className="text-muted-foreground text-[11px] font-medium">
            {formatMessageTime(message)}
          </span>
          {message.starred ? (
            <span className="text-amber-500 dark:text-amber-400">★</span>
          ) : null}
        </div>
      </button>

      <TriageRowHoverActions
        onReply={onReply}
        onArchive={onArchive}
        onUnsubscribeArchive={onUnsubscribeArchive}
        canUnsubscribe={Boolean(
          message.unsubscribe?.mailto ?? message.unsubscribe?.url,
        )}
        onSnooze={onSnooze}
        onUnsnooze={onUnsnooze}
        isSnoozed={message.labelIds.includes('SNOOZED')}
        onSpam={onSpam}
      />

      <div className="mt-2 flex flex-col gap-2 pl-12 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'border-border/70 bg-background text-foreground/90 inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium',
              group?.risky && 'border-destructive/30 text-destructive',
            )}
          >
            <GroupIcon className="size-3.5 shrink-0" />
            <span className="truncate">{group?.label ?? 'Suggestion'}</span>
          </span>

          {suggestion.groupId === 'label-archive' ? (
            <span
              className={cn(
                'border-border/70 bg-muted/35 inline-flex h-7 max-w-[16rem] items-center gap-1 rounded-full border pl-2.5 pr-1 text-[11px] font-medium',
                !selectedLabel && 'border-destructive/30 text-destructive',
              )}
            >
              <Tag className="size-3.5 shrink-0" />
              <span className="truncate">
                {selectedLabel
                  ? formatLabelName(selectedLabel.name)
                  : 'Choose label'}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Change suggested label"
                    onClick={() => setEditOpen(true)}
                    className="hover:bg-foreground/10 inline-flex size-5 cursor-pointer items-center justify-center rounded-full transition-colors"
                  >
                    <Pencil className="size-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Change label</p>
                </TooltipContent>
              </Tooltip>
            </span>
          ) : null}

          {suggestion.reason ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Why this was suggested"
                  className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-7 cursor-help items-center justify-center rounded-full transition-colors"
                >
                  <Info className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p>{suggestion.reason}</p>
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Edit suggestion"
                onClick={() => setEditOpen(true)}
                className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors"
              >
                <Pencil className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Edit suggestion</p>
            </TooltipContent>
          </Tooltip>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onApprove(suggestion, event.currentTarget)
              event.currentTarget.blur()
            }}
            disabled={!canApprove}
            className="h-8 cursor-pointer gap-1.5 rounded-full px-3 text-xs disabled:cursor-not-allowed"
            title={
              canApprove
                ? `Approve ${group?.label ?? 'suggestion'}`
                : 'Choose a label first'
            }
          >
            <Check className="size-3.5" />
            Approve
          </Button>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit triage suggestion</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <label className="block space-y-1.5">
              <span className="text-muted-foreground text-xs font-medium">
                Action
              </span>
              <select
                aria-label="Move suggestion to action group"
                value={draftGroupId}
                onChange={(event) =>
                  setDraftGroupId(event.target.value as MailActionGroupId)
                }
                className="border-input bg-background text-foreground focus-visible:ring-ring/60 h-9 w-full cursor-pointer rounded-lg border px-3 text-sm outline-none focus-visible:ring-2"
              >
                {ACTION_GROUPS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {draftGroupId === 'label-archive' ? (
              <label className="block space-y-1.5">
                <span className="text-muted-foreground text-xs font-medium">
                  Label
                </span>
                <select
                  aria-label="Choose label before archiving"
                  value={draftLabelId}
                  onChange={(event) => setDraftLabelId(event.target.value)}
                  className="border-input bg-background text-foreground focus-visible:ring-ring/60 h-9 w-full cursor-pointer rounded-lg border px-3 text-sm outline-none focus-visible:ring-2"
                >
                  <option value="">Choose label</option>
                  {userLabels.map((label) => (
                    <option key={label.id} value={label.id}>
                      {formatLabelName(label.name)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={applyEdit}
              disabled={draftGroupId === 'label-archive' && !draftLabelId}
              className="cursor-pointer disabled:cursor-not-allowed"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TriageRowHoverActions({
  onReply,
  onArchive,
  onUnsubscribeArchive,
  canUnsubscribe,
  onSnooze,
  onUnsnooze,
  isSnoozed,
  onSpam,
}: {
  onReply: () => void
  onArchive: () => void
  onUnsubscribeArchive: () => void
  canUnsubscribe: boolean
  onSnooze: (until: number) => void
  onUnsnooze: () => void
  isSnoozed: boolean
  onSpam: () => void
}) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-0.5 pl-24',
        'opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100',
        'group-focus-within:pointer-events-auto group-focus-within:opacity-100',
        'bg-[linear-gradient(to_left,var(--emails-row-hover)_0%,var(--emails-row-hover)_55%,color-mix(in_oklch,var(--emails-row-hover)_96%,transparent)_65%,color-mix(in_oklch,var(--emails-row-hover)_78%,transparent)_76%,color-mix(in_oklch,var(--emails-row-hover)_45%,transparent)_88%,color-mix(in_oklch,var(--emails-row-hover)_15%,transparent)_96%,transparent_100%)]',
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <TriageRowActionButton
        label="Reply"
        onClick={onReply}
        icon={CornerUpLeft}
      />
      <TriageRowActionButton
        label="Archive"
        onClick={onArchive}
        icon={Archive}
      />
      <TriageRowSnoozeButton
        onSnooze={onSnooze}
        onUnsnooze={onUnsnooze}
        isSnoozed={isSnoozed}
      />
      {canUnsubscribe ? (
        <TriageRowActionButton
          label="Unsubscribe and archive"
          onClick={onUnsubscribeArchive}
          icon={EyeOff}
        />
      ) : null}
      <TriageRowActionButton label="Report spam" onClick={onSpam} icon={Ban} />
    </div>
  )
}

function TriageRowSnoozeButton({
  onSnooze,
  onUnsnooze,
  isSnoozed,
}: {
  onSnooze: (until: number) => void
  onUnsnooze: () => void
  isSnoozed: boolean
}) {
  const handleTriggerClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
  }

  return (
    <SnoozeMenu
      onSnooze={onSnooze}
      onUnsnooze={onUnsnooze}
      isSnoozed={isSnoozed}
      trigger={
        <button
          type="button"
          aria-label="Snooze"
          onClick={handleTriggerClick}
          className={cn(
            'text-muted-foreground inline-flex size-8 cursor-pointer items-center justify-center rounded-full',
            'hover:bg-foreground/10 hover:text-foreground transition-colors',
            'focus-visible:ring-ring/60 focus-visible:outline-none focus-visible:ring-2',
          )}
        >
          <Clock className="size-[15px]" />
        </button>
      }
    />
  )
}

function TriageRowActionButton({
  label,
  onClick,
  icon: Icon,
}: {
  label: string
  onClick: () => void
  icon: ComponentType<{ className?: string }>
}) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    event.preventDefault()
    onClick()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.stopPropagation()
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className={cn(
            'text-muted-foreground inline-flex size-8 cursor-pointer items-center justify-center rounded-full',
            'hover:bg-foreground/10 hover:text-foreground transition-colors',
            'focus-visible:ring-ring/60 focus-visible:outline-none focus-visible:ring-2',
          )}
        >
          <Icon className="size-[15px]" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}

function ActionSuggestionsSkeleton() {
  return (
    <>
      <div className="mb-2 flex items-center justify-between px-4">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
      {[0, 1].map((group) => (
        <section key={group}>
          <div className="mb-2 flex items-center gap-2 pl-4">
            <Skeleton className="size-3.5 rounded-full" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="border-border/70 bg-muted/30 overflow-hidden rounded-2xl border px-4 py-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        </section>
      ))}
    </>
  )
}

function requiresLabel(suggestion: MailActionSuggestion) {
  return suggestion.groupId === 'label-archive'
}

function pickSignalMessage(message: MailMessageSummary) {
  return {
    id: message.id,
    from: message.from,
    subject: message.subject,
    snippet: message.snippet,
    labelIds: message.labelIds,
  }
}

function compareLabels(a: MailLabel, b: MailLabel) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
}

function formatLabelName(name: string) {
  return name.replace(/^CATEGORY_/, '').replaceAll('_', ' ')
}
