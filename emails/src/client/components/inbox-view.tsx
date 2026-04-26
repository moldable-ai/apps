import { Archive, Ban, Check, Clock, CornerUpLeft, EyeOff } from 'lucide-react'
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react'
import { useMemo, useState } from 'react'
import {
  ScrollArea,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from '@moldable-ai/ui'
import {
  cleanSnippet,
  formatMessageTime,
  formatSnoozedUntilTime,
  groupMessagesByDay,
  groupMessagesBySnoozeUntil,
  initials,
  senderName,
} from '../lib/mail-format'
import { useInboxBriefing } from '../hooks/use-briefing'
import type { MailMessageSummary } from '../types'
import { InboxBriefing } from './inbox-briefing'
import { SnoozeMenu } from './snooze-menu'

interface InboxViewProps {
  messages: MailMessageSummary[]
  selectedId: string | null
  loading: boolean
  error: unknown
  folderId: string
  query: string
  account?: string | null
  unreadCount: number
  actionError: unknown
  onSelect: (id: string) => void
  onReply: (id: string) => void
  onArchive: (id: string) => void
  onUnsubscribeArchive: (id: string) => void
  onSnooze: (id: string, until: number) => void
  onUnsnooze: (id: string) => void
  onSpam: (id: string) => void
  selectedMessageIds: Set<string>
  selectionActive: boolean
  onToggleMessageSelected: (id: string) => void
}

export function InboxView({
  messages,
  selectedId,
  loading,
  error,
  folderId,
  query,
  account,
  unreadCount,
  actionError,
  onSelect,
  onReply,
  onArchive,
  onUnsubscribeArchive,
  onSnooze,
  onUnsnooze,
  onSpam,
  selectedMessageIds,
  selectionActive,
  onToggleMessageSelected,
}: InboxViewProps) {
  const groups = useMemo(
    () =>
      folderId === 'SNOOZED'
        ? groupMessagesBySnoozeUntil(messages)
        : groupMessagesByDay(messages),
    [folderId, messages],
  )

  const briefingEnabled =
    folderId === 'INBOX' && !query && messages.length > 0 && !loading
  const briefing = useInboxBriefing({
    messages,
    account: account ?? null,
    enabled: briefingEnabled,
  })

  if (loading && messages.length === 0) {
    return (
      <ScrollArea className="h-full px-5 pt-4">
        <div className="mx-auto w-full max-w-[44rem] space-y-8 pb-[calc(var(--chat-safe-padding,0px)+6rem)]">
          <InboxSkeleton showBriefing={folderId === 'INBOX' && !query} />
        </div>
      </ScrollArea>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <div className="max-w-sm space-y-2">
          <p className="text-sm font-medium">Couldn&apos;t load messages</p>
          <p className="text-muted-foreground text-xs">
            {error instanceof Error
              ? error.message
              : 'Try refreshing this view.'}
          </p>
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 pb-[var(--chat-safe-padding)] text-center">
        <div className="max-w-sm space-y-2">
          <p className="emails-serif text-2xl">
            {folderId === 'DRAFTS'
              ? 'No drafts'
              : folderId === 'SNOOZED'
                ? 'No snoozed messages'
                : 'Inbox clear'}
          </p>
          <p className="text-muted-foreground text-sm">
            {query
              ? `No mail matches "${query}".`
              : folderId === 'INBOX'
                ? 'Nothing new right now. Take a breath.'
                : folderId === 'DRAFTS'
                  ? 'No saved drafts.'
                  : folderId === 'SNOOZED'
                    ? 'No messages are snoozed.'
                    : 'No messages in this folder.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full px-5 pt-3">
      <div className="mx-auto w-full max-w-[44rem] space-y-8 pb-[calc(var(--chat-safe-padding,0px)+6rem)]">
        {briefingEnabled ? (
          <InboxBriefing briefing={briefing} unreadCount={unreadCount} />
        ) : null}

        {actionError ? (
          <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border px-4 py-2 text-xs font-medium">
            {actionError instanceof Error
              ? actionError.message
              : 'Message action failed'}
          </div>
        ) : null}

        {groups.map((group) => (
          <section key={group.key}>
            <h2 className="text-muted-foreground/80 mb-2 pl-4 text-xs font-medium uppercase tracking-wider">
              {group.label}
            </h2>
            <div className="border-border/70 bg-muted/30 dark:bg-muted/20 overflow-hidden rounded-2xl border">
              {group.messages.map((message, index) => (
                <MessageRow
                  key={message.id}
                  message={message}
                  selected={message.id === selectedId}
                  bulkSelected={selectedMessageIds.has(message.id)}
                  selectionActive={selectionActive}
                  selectionEnabled={folderId !== 'DRAFTS'}
                  showSeparator={index < group.messages.length - 1}
                  onSelect={() => onSelect(message.id)}
                  onToggleSelected={() => onToggleMessageSelected(message.id)}
                  onReply={() => onReply(message.id)}
                  onArchive={() => onArchive(message.id)}
                  onUnsubscribeArchive={() => onUnsubscribeArchive(message.id)}
                  onSnooze={(until) => onSnooze(message.id, until)}
                  onUnsnooze={() => onUnsnooze(message.id)}
                  onSpam={() => onSpam(message.id)}
                  showActions={folderId !== 'DRAFTS'}
                  showSnoozedUntil={folderId === 'SNOOZED'}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </ScrollArea>
  )
}

function MessageRow({
  message,
  selected,
  bulkSelected,
  selectionActive,
  selectionEnabled,
  showSeparator,
  onSelect,
  onToggleSelected,
  onReply,
  onArchive,
  onUnsubscribeArchive,
  onSnooze,
  onUnsnooze,
  onSpam,
  showActions,
  showSnoozedUntil,
}: {
  message: MailMessageSummary
  selected: boolean
  bulkSelected: boolean
  selectionActive: boolean
  selectionEnabled: boolean
  showSeparator: boolean
  onSelect: () => void
  onToggleSelected: () => void
  onReply: () => void
  onArchive: () => void
  onUnsubscribeArchive: () => void
  onSnooze: (until: number) => void
  onUnsnooze: () => void
  onSpam: () => void
  showActions: boolean
  showSnoozedUntil: boolean
}) {
  const snippet = cleanSnippet(message.snippet)
  const [avatarHovered, setAvatarHovered] = useState(false)

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect()
    }
  }

  return (
    <div
      className={cn(
        'group relative transition-colors',
        '[--emails-row-hover:color-mix(in_oklch,var(--background)_90%,var(--muted))]',
        bulkSelected
          ? 'bg-primary/10'
          : selected
            ? 'bg-background shadow-[inset_2px_0_0_0_var(--primary)]'
            : 'hover:bg-[var(--emails-row-hover)]',
        showSeparator && 'emails-dashed-separator',
      )}
      style={{ ['--emails-dash-inset' as string]: '3.5rem' } as CSSProperties}
    >
      {selectionEnabled ? (
        <button
          type="button"
          aria-label={`${bulkSelected ? 'Deselect' : 'Select'} ${message.subject || senderName(message.from)}`}
          aria-pressed={bulkSelected}
          onMouseEnter={() => setAvatarHovered(true)}
          onMouseLeave={() => setAvatarHovered(false)}
          onFocus={() => setAvatarHovered(true)}
          onBlur={() => setAvatarHovered(false)}
          onClick={(event) => {
            event.stopPropagation()
            onToggleSelected()
          }}
          className={cn(
            'absolute left-4 top-3 z-20 flex size-9 cursor-pointer items-center justify-center rounded-full transition-all',
            'focus-visible:ring-ring/60 focus-visible:outline-none focus-visible:ring-2',
            bulkSelected
              ? 'text-primary-foreground opacity-100'
              : 'text-muted-foreground opacity-0',
            (avatarHovered || selectionActive) &&
              !bulkSelected &&
              'opacity-100',
          )}
        >
          <span
            className={cn(
              'bg-background/95 flex size-5 items-center justify-center rounded-md border shadow-sm backdrop-blur',
              bulkSelected ? 'border-primary bg-primary' : 'border-border',
            )}
          >
            <Check className={cn('size-3.5', !bulkSelected && 'opacity-0')} />
          </span>
        </button>
      ) : null}
      <button
        type="button"
        onClick={onSelect}
        onKeyDown={handleKeyDown}
        className="focus-visible:ring-ring/60 grid w-full cursor-pointer grid-cols-[auto_1fr_auto] items-start gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
      >
        <div
          className={cn(
            'transition-opacity',
            selectionEnabled &&
              (bulkSelected || selectionActive) &&
              'opacity-0',
            selectionEnabled && avatarHovered && 'opacity-0',
          )}
        >
          <Avatar from={message.from} size="md" />
        </div>
        <div className="min-w-0 pt-0.5">
          <div className="flex items-center gap-2">
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
        <div className="flex shrink-0 flex-col items-end gap-1 pt-1 transition-opacity group-hover:opacity-0">
          <span className="text-muted-foreground text-[11px] font-medium">
            {showSnoozedUntil
              ? formatSnoozedUntilTime(message)
              : formatMessageTime(message)}
          </span>
          {message.starred ? (
            <span className="text-amber-500 dark:text-amber-400">★</span>
          ) : null}
        </div>
      </button>
      {showActions && !selectionActive ? (
        <MessageRowActions
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
      ) : null}
    </div>
  )
}

function MessageRowActions({
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
        'pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center gap-0.5 pl-48 pr-3',
        'opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100',
        'group-focus-within:pointer-events-auto group-focus-within:opacity-100',
        '[--emails-row-hover:color-mix(in_oklch,var(--background)_90%,var(--muted))]',
        'bg-[linear-gradient(to_left,var(--emails-row-hover)_0%,var(--emails-row-hover)_55%,color-mix(in_oklch,var(--emails-row-hover)_96%,transparent)_65%,color-mix(in_oklch,var(--emails-row-hover)_78%,transparent)_76%,color-mix(in_oklch,var(--emails-row-hover)_45%,transparent)_88%,color-mix(in_oklch,var(--emails-row-hover)_15%,transparent)_96%,transparent_100%)]',
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <RowActionButton label="Reply" onClick={onReply} icon={CornerUpLeft} />
      <RowActionButton label="Archive" onClick={onArchive} icon={Archive} />
      <RowSnoozeButton
        onSnooze={onSnooze}
        onUnsnooze={onUnsnooze}
        isSnoozed={isSnoozed}
      />
      {canUnsubscribe ? (
        <RowActionButton
          label="Unsubscribe and archive"
          onClick={onUnsubscribeArchive}
          icon={EyeOff}
        />
      ) : null}
      <RowActionButton label="Report spam" onClick={onSpam} icon={Ban} />
    </div>
  )
}

function RowSnoozeButton({
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

function RowActionButton({
  label,
  onClick,
  icon: Icon,
}: {
  label: string
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
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

function InboxSkeleton({ showBriefing }: { showBriefing: boolean }) {
  return (
    <>
      {showBriefing ? (
        <div className="border-border/70 bg-muted/25 dark:bg-muted/15 rounded-2xl border px-5 pb-4 pt-4">
          <div className="flex items-center gap-2">
            <Skeleton className="bg-foreground/10 size-5 rounded-full" />
            <Skeleton className="bg-foreground/10 h-3 w-24" />
          </div>
          <div className="mt-3 space-y-2">
            <Skeleton className="bg-foreground/10 h-3 w-5/6" />
            <Skeleton className="bg-foreground/10 h-3 w-3/5" />
            <div className="mt-3 space-y-1.5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="bg-foreground/5 h-3 w-full" />
              ))}
            </div>
          </div>
        </div>
      ) : null}
      <div className="space-y-2">
        <Skeleton className="bg-foreground/10 ml-4 h-3 w-20" />
        <div className="border-border/70 bg-muted/30 overflow-hidden rounded-2xl border">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="bg-foreground/10 size-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="bg-foreground/10 h-3 w-32" />
                <Skeleton className="bg-foreground/5 h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export function Avatar({
  from,
  size,
}: {
  from: string
  size: 'sm' | 'md' | 'lg'
}) {
  const classes =
    size === 'sm'
      ? 'size-7 text-[10px]'
      : size === 'lg'
        ? 'size-11 text-sm'
        : 'size-9 text-[11px]'

  return (
    <span
      className={cn(
        'text-background relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold',
        classes,
      )}
      style={{ backgroundColor: avatarBg(from) }}
    >
      <span className="relative z-10 select-none">{initials(from)}</span>
    </span>
  )
}

function avatarBg(from: string) {
  const source = from.toLowerCase()
  let hash = 0
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0
  }
  const palette = [
    'oklch(0.7 0.12 30)',
    'oklch(0.72 0.12 85)',
    'oklch(0.68 0.11 150)',
    'oklch(0.68 0.1 200)',
    'oklch(0.7 0.13 250)',
    'oklch(0.72 0.13 310)',
    'oklch(0.73 0.13 345)',
  ]
  return palette[hash % palette.length]!
}
