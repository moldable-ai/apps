import { Loader2, Reply, Send, Sparkles, X } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  Button,
  Input,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from '@moldable-ai/ui'
import { errorMessage } from '../lib/mail-format'
import type { ComposerState, MailContact } from '../types'

export function Composer({
  composer,
  contacts,
  error,
  sending,
  onChange,
  onContactSearch,
  onClose,
  onSubmit,
}: {
  composer: ComposerState
  contacts: MailContact[]
  error: unknown
  sending: boolean
  onChange: (composer: ComposerState) => void
  onContactSearch: (query: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  const [showCcBcc, setShowCcBcc] = useState(
    Boolean(composer.cc || composer.bcc),
  )
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (composer.mode === 'reply') {
      bodyRef.current?.focus()
    }
  }, [composer.mode])

  const title = composer.mode === 'reply' ? 'Reply' : 'New message'

  return (
    <div
      className="bg-background/50 fixed inset-0 z-40 flex items-center justify-center p-3 pb-[calc(var(--chat-safe-padding,0px)+0.75rem)] backdrop-blur-md sm:p-6 sm:pb-[calc(var(--chat-safe-padding,0px)+1.5rem)]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <form
        className="border-border bg-background emails-fade-in flex h-[min(46rem,calc(100vh-var(--chat-safe-padding,0px)-2.75rem))] max-h-full w-[min(56rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <header className="border-border/70 flex h-14 shrink-0 items-center justify-between border-b px-4">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            {composer.mode === 'reply' ? (
              <Reply className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            <span className="text-foreground font-medium">{title}</span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:bg-muted hover:text-foreground size-8 cursor-pointer rounded-full"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Close</p>
            </TooltipContent>
          </Tooltip>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-10">
          <div className="mx-auto w-full max-w-[42rem]">
            <AddressField
              label="To"
              value={composer.to}
              placeholder="recipient@example.com"
              autoFocus={composer.mode === 'new'}
              contacts={contacts}
              onContactSearch={onContactSearch}
              onChange={(value) => onChange({ ...composer, to: value })}
              trailing={
                !showCcBcc ? (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground cursor-pointer text-xs font-medium"
                    onClick={() => setShowCcBcc(true)}
                  >
                    Cc / Bcc
                  </button>
                ) : null
              }
            />
            {showCcBcc ? (
              <>
                <AddressField
                  label="Cc"
                  value={composer.cc}
                  placeholder="Optional"
                  contacts={contacts}
                  onContactSearch={onContactSearch}
                  onChange={(value) => onChange({ ...composer, cc: value })}
                />
                <AddressField
                  label="Bcc"
                  value={composer.bcc}
                  placeholder="Optional"
                  contacts={contacts}
                  onContactSearch={onContactSearch}
                  onChange={(value) => onChange({ ...composer, bcc: value })}
                />
              </>
            ) : null}

            <Input
              value={composer.subject}
              onChange={(event) =>
                onChange({ ...composer, subject: event.target.value })
              }
              placeholder="Subject"
              className="emails-subject-input text-foreground placeholder:text-muted-foreground mt-8 h-auto rounded-none border-0 !bg-transparent px-0 text-[1.875rem] font-semibold leading-tight shadow-none focus-visible:ring-0"
            />

            <Textarea
              ref={bodyRef}
              value={composer.body}
              onChange={(event) =>
                onChange({ ...composer, body: event.target.value })
              }
              placeholder="Write your message..."
              className={cn(
                'text-foreground/90 mt-5 min-h-[22rem] resize-none rounded-none border-0 !bg-transparent px-0 py-0 text-[15px] leading-[1.7] shadow-none focus-visible:ring-0',
                'placeholder:text-muted-foreground',
              )}
            />
          </div>
        </div>

        <footer className="border-border/70 bg-muted/30 flex shrink-0 items-center gap-3 border-t px-4 py-3">
          <p className="text-destructive min-w-0 flex-1 truncate text-xs">
            {error ? errorMessage(error) : ''}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:bg-muted hover:text-foreground h-9 cursor-pointer rounded-full px-3 text-xs"
              disabled={sending}
            >
              Discard
            </Button>
            <Button
              type="submit"
              className="h-9 cursor-pointer gap-2 rounded-full px-5 text-sm font-medium"
              disabled={sending}
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Send
            </Button>
          </div>
        </footer>
      </form>
    </div>
  )
}

const recipientSeparators = /[,;\s]+/
const trailingRecipientSeparator = /[,;\s]$/

function splitRecipients(value: string) {
  return value
    .split(recipientSeparators)
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatRecipients(recipients: string[]) {
  return recipients.join(', ')
}

function AddressField({
  label,
  value,
  placeholder,
  autoFocus,
  contacts,
  onContactSearch,
  onChange,
  trailing,
}: {
  label: string
  value: string
  placeholder: string
  autoFocus?: boolean
  contacts: MailContact[]
  onContactSearch: (query: string) => void
  onChange: (value: string) => void
  trailing?: React.ReactNode
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState('')
  const [focused, setFocused] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(0)
  const [undoRecipient, setUndoRecipient] = useState<string | null>(null)
  const recipients = useMemo(() => splitRecipients(value), [value])
  const suggestions = useMemo(() => {
    const query = draft.trim().toLowerCase()
    if (query.length === 0) return []

    const selected = new Set(
      recipients.map((recipient) => recipient.toLowerCase()),
    )

    return contacts
      .filter((contact) => {
        return (
          !selected.has(contact.email.toLowerCase()) &&
          (contact.name.toLowerCase().includes(query) ||
            contact.email.toLowerCase().includes(query))
        )
      })
      .slice(0, 6)
  }, [contacts, draft, recipients])

  useEffect(() => {
    setActiveSuggestion(0)
  }, [draft])

  useEffect(() => {
    if (!focused) return

    const timeout = window.setTimeout(() => {
      onContactSearch(draft.trim())
    }, 120)

    return () => window.clearTimeout(timeout)
  }, [draft, focused, onContactSearch])

  const commitDraft = useCallback(
    (raw = draft) => {
      const nextRecipients = splitRecipients(raw)
      if (nextRecipients.length === 0) return false

      onChange(formatRecipients([...recipients, ...nextRecipients]))
      setDraft('')
      setUndoRecipient(null)
      return true
    },
    [draft, onChange, recipients],
  )

  const removeRecipient = useCallback(
    (index: number) => {
      const removed = recipients[index]
      if (!removed) return

      onChange(
        formatRecipients(
          recipients.filter((_, itemIndex) => itemIndex !== index),
        ),
      )
      setUndoRecipient(removed)
      inputRef.current?.focus()
    },
    [onChange, recipients],
  )

  const restoreRemovedRecipient = useCallback(() => {
    if (!undoRecipient) return false

    onChange(formatRecipients([...recipients, undoRecipient]))
    setUndoRecipient(null)
    return true
  }, [onChange, recipients, undoRecipient])

  const addRecipient = useCallback(
    (recipient: string) => {
      onChange(formatRecipients([...recipients, recipient]))
      setDraft('')
      setUndoRecipient(null)
      inputRef.current?.focus()
    },
    [onChange, recipients],
  )

  const showSuggestions = focused && suggestions.length > 0

  return (
    <div className="border-border/60 grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-start gap-3 border-b py-2.5">
      <label
        htmlFor={inputId}
        className="text-muted-foreground pt-1.5 text-xs font-medium uppercase tracking-wider"
      >
        {label}
      </label>
      <div
        className="relative flex min-h-8 min-w-0 flex-wrap items-center gap-1.5"
        onClick={() => inputRef.current?.focus()}
      >
        {recipients.map((recipient, index) => (
          <span
            key={`${recipient}-${index}`}
            className="border-border/70 bg-muted/50 text-foreground group inline-flex h-7 max-w-full items-center gap-1 rounded-full border px-2.5 text-sm font-medium"
          >
            <span className="min-w-0 truncate">{recipient}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-ring -mr-1 inline-flex size-5 cursor-pointer items-center justify-center rounded-full opacity-0 transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 group-hover:opacity-100"
                  aria-label={`Remove ${recipient}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    removeRecipient(index)
                  }}
                >
                  <X className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Remove</p>
              </TooltipContent>
            </Tooltip>
          </span>
        ))}
        <input
          id={inputId}
          ref={inputRef}
          value={draft}
          onChange={(event) => {
            const nextValue = event.target.value
            const hasSeparator = recipientSeparators.test(nextValue)

            if (!hasSeparator) {
              setDraft(nextValue)
              return
            }

            const nextRecipients = splitRecipients(nextValue)
            const endsWithSeparator = trailingRecipientSeparator.test(nextValue)
            const committed = endsWithSeparator
              ? nextRecipients
              : nextRecipients.slice(0, -1)
            const remaining = endsWithSeparator
              ? ''
              : (nextRecipients.at(-1) ?? '')

            if (committed.length > 0) {
              onChange(formatRecipients([...recipients, ...committed]))
              setUndoRecipient(null)
            }
            setDraft(remaining)
          }}
          onKeyDown={(event) => {
            if (
              showSuggestions &&
              (event.key === 'ArrowDown' || event.key === 'ArrowUp')
            ) {
              event.preventDefault()
              setActiveSuggestion((index) => {
                const direction = event.key === 'ArrowDown' ? 1 : -1
                return (
                  (index + direction + suggestions.length) % suggestions.length
                )
              })
              return
            }

            if (
              showSuggestions &&
              (event.key === 'Enter' || event.key === 'Tab')
            ) {
              event.preventDefault()
              const contact = suggestions[activeSuggestion]
              if (contact) addRecipient(contact.email)
              return
            }

            if (
              (event.metaKey || event.ctrlKey) &&
              event.key.toLowerCase() === 'z' &&
              restoreRemovedRecipient()
            ) {
              event.preventDefault()
              return
            }

            if (
              event.key === 'Enter' ||
              event.key === ',' ||
              event.key === ';' ||
              event.key === ' '
            ) {
              if (commitDraft()) {
                event.preventDefault()
              }
              return
            }

            if (
              (event.key === 'Backspace' || event.key === 'Delete') &&
              draft.length === 0 &&
              recipients.length > 0
            ) {
              event.preventDefault()
              removeRecipient(recipients.length - 1)
            }
          }}
          placeholder={recipients.length === 0 ? placeholder : ''}
          autoFocus={autoFocus}
          autoComplete="email"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="text-foreground placeholder:text-muted-foreground h-8 min-w-[10rem] flex-1 bg-transparent px-0 text-sm outline-none"
        />
        {showSuggestions ? (
          <div className="border-border bg-popover text-popover-foreground absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border py-1 shadow-xl">
            {suggestions.map((contact, index) => (
              <button
                key={`${contact.id}-${contact.email}`}
                type="button"
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm',
                  index === activeSuggestion
                    ? 'bg-muted text-foreground'
                    : 'hover:bg-muted/70',
                )}
                onMouseDown={(event) => {
                  event.preventDefault()
                  addRecipient(contact.email)
                }}
              >
                <span className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
                  {(contact.name || contact.email).slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {contact.name || contact.email}
                  </span>
                  {contact.name ? (
                    <span className="text-muted-foreground block truncate text-xs">
                      {contact.email}
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="pl-2 pt-1.5">{trailing}</div>
    </div>
  )
}
