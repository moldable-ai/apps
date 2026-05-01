import { Inbox, Loader2, Mail, RefreshCcw } from 'lucide-react'
import { Button } from '@moldable-ai/ui'
import { cleanSnippet, formatMessageTime, senderName } from '../lib/mail-format'
import {
  useConnectGmail,
  useMailMessages,
  useMailStatus,
} from '../hooks/use-mail'
import type { MailMessageSummary } from '../types'

const EMPTY_GHOST_MESSAGES = [
  {
    from: 'Newsletter',
    subject: 'Weekly digest',
    snippet: 'Your latest updates will appear here.',
  },
  {
    from: 'Jordan Lee',
    subject: 'Quick follow-up',
    snippet: 'Recent inbox mail shows in this widget.',
  },
  {
    from: 'Calendar',
    subject: 'Meeting reminder',
    snippet: 'Nothing is waiting in your inbox right now.',
  },
]

export function MailWidget() {
  const connectGmail = useConnectGmail()
  const statusQuery = useMailStatus()
  const messagesQuery = useMailMessages({
    folderId: 'INBOX',
    query: '',
    enabled: statusQuery.data?.authenticated === true,
  })
  const inboxMessages = messagesQuery.data?.messages ?? []
  const unreadCount = inboxMessages.filter((message) => message.unread).length
  const preview = inboxMessages.slice(0, 4)

  if (statusQuery.isLoading) {
    return <WidgetLoading />
  }

  if (!statusQuery.data?.authenticated) {
    return (
      <div className="bg-background flex h-full flex-col justify-between overflow-hidden p-3">
        <div>
          <div className="flex items-center gap-2">
            <Mail className="text-muted-foreground size-3.5" />
            <h2 className="text-sm font-semibold">Email</h2>
          </div>
          <p className="text-muted-foreground mt-2 text-[11px] leading-4">
            Connect Gmail to see recent inbox mail here.
          </p>
        </div>
        <Button
          type="button"
          size="xs"
          className="cursor-pointer"
          onClick={() => void connectGmail()}
        >
          Connect
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-background flex h-full flex-col overflow-hidden p-2">
      <div className="mb-2 flex shrink-0 items-center justify-between px-1">
        <div className="flex min-w-0 items-center gap-2">
          <Inbox className="text-muted-foreground size-3.5 shrink-0" />
          <h2 className="truncate text-sm font-semibold">Inbox</h2>
        </div>
        <span className="text-muted-foreground shrink-0 text-[11px] font-medium">
          {unreadCount > 0
            ? `${unreadCount} unread`
            : inboxMessages.length > 0
              ? `${inboxMessages.length} recent`
              : 'Empty'}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {messagesQuery.isLoading ? (
          <WidgetLoading compact />
        ) : messagesQuery.isError ? (
          <WidgetError onRetry={() => void messagesQuery.refetch()} />
        ) : preview.length === 0 ? (
          <EmptyPreview />
        ) : (
          <ul className="space-y-1">
            {preview.map((message) => (
              <MailRow key={message.id} message={message} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function MailRow({ message }: { message: MailMessageSummary }) {
  return (
    <li className="bg-muted/45 flex min-w-0 items-start gap-2 rounded-md px-2.5 py-1.5">
      <span
        className="mt-1.5 size-2 shrink-0 rounded-full"
        style={{
          backgroundColor: message.unread
            ? 'var(--primary)'
            : 'var(--muted-foreground)',
          opacity: message.unread ? 1 : 0.35,
        }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <p className="truncate text-[12px] font-semibold leading-4">
            {senderName(message.from)}
          </p>
          <span className="text-muted-foreground shrink-0 text-[10px] leading-4">
            {formatMessageTime(message)}
          </span>
        </div>
        <p className="text-foreground/90 truncate text-[11px] font-medium leading-4">
          {message.subject || '(No subject)'}
        </p>
        <p className="text-muted-foreground truncate text-[10px] leading-4">
          {cleanSnippet(message.snippet)}
        </p>
      </div>
    </li>
  )
}

function EmptyPreview() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-1 overflow-hidden">
        {EMPTY_GHOST_MESSAGES.map((message) => (
          <div
            key={message.subject}
            className="border-border/40 bg-muted/20 flex min-w-0 items-start gap-2 rounded-md border px-2.5 py-1.5 opacity-45 grayscale"
          >
            <span className="bg-muted-foreground mt-1.5 size-2 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <p className="truncate text-[12px] font-semibold leading-4">
                  {message.from}
                </p>
                <span className="text-muted-foreground shrink-0 text-[10px] leading-4">
                  —
                </span>
              </div>
              <p className="text-foreground/90 truncate text-[11px] font-medium leading-4">
                {message.subject}
              </p>
              <p className="text-muted-foreground truncate text-[10px] leading-4">
                {message.snippet}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-border/50 bg-muted/20 mt-2 flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-2">
        <span className="bg-background text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-md">
          <Inbox className="size-3.5" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[12px] font-semibold">Inbox empty</div>
          <div className="text-muted-foreground truncate text-[10px]">
            New messages will appear here.
          </div>
        </div>
      </div>
    </div>
  )
}

function WidgetLoading({ compact = false }: { compact?: boolean }) {
  return (
    <div className="bg-background flex h-full flex-col overflow-hidden p-2">
      <div className="space-y-1">
        {Array.from({ length: compact ? 3 : 4 }).map((_, index) => (
          <div
            key={index}
            className="bg-muted/25 flex items-start gap-2 rounded-md px-2.5 py-1.5"
          >
            <Loader2 className="text-muted-foreground/40 mt-0.5 size-3 animate-spin" />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="bg-muted/60 h-3 w-2/3 animate-pulse rounded" />
              <div className="bg-muted/45 h-2.5 w-4/5 animate-pulse rounded" />
              <div className="bg-muted/35 h-2 w-3/5 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function WidgetError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <span className="text-muted-foreground text-[11px]">
        Couldn’t load inbox mail.
      </span>
      <Button
        type="button"
        size="xs"
        variant="outline"
        className="h-7 cursor-pointer gap-1.5 px-2 text-[11px]"
        onClick={onRetry}
      >
        <RefreshCcw className="size-3" />
        Retry
      </Button>
    </div>
  )
}
