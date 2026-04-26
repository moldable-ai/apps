import { Inbox, Loader2, Mail } from 'lucide-react'
import { Button } from '@moldable-ai/ui'
import { cleanSnippet, formatMessageTime, senderName } from '../lib/mail-format'
import {
  useConnectGmail,
  useMailMessages,
  useMailStatus,
} from '../hooks/use-mail'

export function MailWidget() {
  const connectGmail = useConnectGmail()
  const statusQuery = useMailStatus()
  const messagesQuery = useMailMessages({
    folderId: 'INBOX',
    query: 'is:unread',
    enabled: statusQuery.data?.authenticated === true,
  })
  const unread = messagesQuery.data?.messages ?? []

  if (statusQuery.isLoading) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center">
        <Loader2 className="size-4 animate-spin" />
      </div>
    )
  }

  if (!statusQuery.data?.authenticated) {
    return (
      <div className="flex h-full flex-col justify-between p-3">
        <div>
          <div className="flex items-center gap-2">
            <Mail className="text-muted-foreground size-3.5" />
            <h2 className="text-sm font-semibold">Email</h2>
          </div>
          <p className="text-muted-foreground mt-2 text-[11px] leading-4">
            Connect Gmail to see unread mail here.
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

  const preview = unread.slice(0, 3)

  return (
    <div className="flex h-full flex-col p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="text-muted-foreground size-3.5" />
          <h2 className="text-sm font-semibold">Inbox</h2>
        </div>
        <span className="text-muted-foreground text-[11px] font-medium">
          {unread.length === 0 ? 'Clear' : `${unread.length} unread`}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {messagesQuery.isLoading ? (
          <div className="text-muted-foreground flex h-full items-center justify-center text-[11px]">
            <Loader2 className="mr-1.5 size-3 animate-spin" />
            Loading
          </div>
        ) : preview.length === 0 ? (
          <EmptyPreview />
        ) : (
          <ul className="space-y-1.5">
            {preview.map((message) => (
              <li
                key={message.id}
                className="border-border/60 bg-muted/20 rounded-lg border px-2 py-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[11.5px] font-semibold">
                    {senderName(message.from)}
                  </p>
                  <span className="text-muted-foreground shrink-0 text-[10px]">
                    {formatMessageTime(message)}
                  </span>
                </div>
                <p className="text-foreground/90 mt-0.5 truncate text-[11px] font-medium">
                  {message.subject || '(No subject)'}
                </p>
                <p className="text-muted-foreground truncate text-[10.5px]">
                  {cleanSnippet(message.snippet)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function EmptyPreview() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
      <span className="emails-serif text-foreground text-lg">Inbox clear</span>
      <span className="text-muted-foreground text-[10.5px]">
        Nothing to triage right now.
      </span>
    </div>
  )
}
