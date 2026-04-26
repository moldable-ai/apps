import {
  ArrowLeft,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  File,
  FileArchive,
  FileImage,
  FileText,
  Loader2,
  Mail,
  MoreHorizontal,
  Paperclip,
  Plus,
  Sparkle,
  Star,
  Trash2,
  Type,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
  useWorkspace,
} from '@moldable-ai/ui'
import { folderById } from '../lib/folders'
import {
  cleanSnippet,
  emailAddress,
  formatLongDate,
  senderName,
} from '../lib/mail-format'
import { useLabels, useUpdateMessageLabels } from '../hooks/use-mail'
import type {
  MailAttachment,
  MailLabel,
  MailMessageDetail,
  MailMessageSummary,
} from '../types'
import { HtmlEmailFrame } from './html-email-frame'

export type ReaderMode = 'rendered' | 'plain'

interface EmailViewProps {
  message?: MailMessageDetail
  fallback?: MailMessageSummary
  loading: boolean
  folderId: string
  canGoPrevious: boolean
  canGoNext: boolean
  closing?: boolean
  onBack: () => void
  onPrevious: () => void
  onNext: () => void
  onTrash: () => void
  onToggleStar: () => void
  onToggleRead: () => void
  onMarkImportant: () => void
  onToggleSpam: () => void
}

export function EmailView({
  message,
  fallback,
  loading,
  folderId,
  canGoPrevious,
  canGoNext,
  closing = false,
  onBack,
  onPrevious,
  onNext,
  onTrash,
  onToggleStar,
  onToggleRead,
  onMarkImportant,
  onToggleSpam,
}: EmailViewProps) {
  const display = message ?? fallback
  const [mode, setMode] = useState<ReaderMode>('rendered')

  useEffect(() => {
    if (!message) return
    if (!message.bodyHtml && mode === 'rendered') {
      setMode('plain')
    }
  }, [message, mode])

  if (!display) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center px-8 text-sm">
        Select a message
      </div>
    )
  }

  const folder = folderById(folderId)
  const plainText =
    message?.bodyText || message?.bodyHtmlText || display.snippet
  const hasHtml = Boolean(message?.bodyHtml)
  const isSpam = display.labelIds.includes('SPAM')
  const attachments = (
    message?.attachments ??
    display.attachments ??
    []
  ).filter((attachment) => attachment.attachmentId && !attachment.inline)

  return (
    <div
      className={cn(
        'emails-reader-view bg-background relative flex h-full flex-col overflow-hidden',
        closing ? 'emails-reader-pop-out' : 'emails-reader-pop-in',
      )}
    >
      <div className="pointer-events-none absolute right-4 top-3 z-20 flex items-center gap-2">
        <div className="pointer-events-auto flex items-center gap-2">
          {hasHtml ? (
            <div className="bg-muted flex h-9 items-center gap-0.5 rounded-full p-0.5">
              <ChromeButton
                active={mode === 'rendered'}
                icon={Sparkle}
                label="Rendered"
                onClick={() => setMode('rendered')}
              />
              <ChromeButton
                active={mode === 'plain'}
                icon={Type}
                label="Plain"
                onClick={() => setMode('plain')}
              />
            </div>
          ) : null}

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:bg-muted hover:text-foreground size-9 cursor-pointer rounded-full"
                    aria-label="More actions"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>More actions</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={onToggleRead}
              >
                <Mail className="mr-2 size-4" />
                {display.unread ? 'Mark as read' : 'Mark as unread'}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={onToggleStar}
              >
                <Star
                  className={cn(
                    'mr-2 size-4',
                    display.starred && 'fill-current text-amber-500',
                  )}
                />
                {display.starred ? 'Unstar' : 'Star'}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={onMarkImportant}
              >
                <Sparkle className="mr-2 size-4" />
                {display.important ? 'Remove importance' : 'Mark important'}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={onToggleSpam}
              >
                <Ban className="mr-2 size-4" />
                {isSpam ? 'Mark as not spam' : 'Mark as spam'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer"
                onClick={onTrash}
              >
                <Trash2 className="mr-2 size-4" />
                Move to trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-6 pb-[calc(var(--chat-safe-padding,0px)+8rem)] pt-[54px] sm:px-10 lg:px-16">
          <div className="mx-auto min-h-full w-full max-w-[44rem]">
            <div className="mb-6 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-muted-foreground hover:bg-muted hover:text-foreground -ml-2 h-8 cursor-pointer gap-1.5 rounded-full px-2.5 text-xs"
                title="Back to inbox"
              >
                <ArrowLeft className="size-3.5" />
                <span>Mail</span>
                <ChevronRight className="size-3 opacity-40" />
                <span className="text-foreground/70">{folder.label}</span>
              </Button>
              <div className="flex items-center gap-1">
                <ReaderNavButton
                  label="Previous email"
                  icon={ChevronLeft}
                  disabled={!canGoPrevious}
                  onClick={onPrevious}
                />
                <ReaderNavButton
                  label="Next email"
                  icon={ChevronRight}
                  disabled={!canGoNext}
                  onClick={onNext}
                />
              </div>
            </div>

            <h1 className="emails-serif text-foreground text-3xl leading-tight sm:text-[2.4rem]">
              {display.subject || '(No subject)'}
            </h1>

            <EmailMeta message={display} />

            <div className="from-border/70 via-border/40 mt-6 h-px w-full bg-gradient-to-r to-transparent" />

            {attachments.length > 0 ? (
              <AttachmentGrid
                messageId={display.id}
                attachments={attachments}
              />
            ) : null}

            <div className="emails-document emails-document-body mt-8">
              {loading && !message ? (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  Loading message
                </div>
              ) : mode === 'rendered' && hasHtml ? (
                <HtmlEmailFrame html={message!.bodyHtml} />
              ) : (
                <div className="text-foreground/90 whitespace-pre-wrap text-[1.0625rem] leading-[1.75]">
                  {plainText || cleanSnippet(display.snippet) || (
                    <span className="text-muted-foreground">
                      This message has no readable body.
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

function ReaderNavButton({
  label,
  icon: Icon,
  disabled,
  onClick,
}: {
  label: string
  icon: LucideIcon
  disabled: boolean
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:bg-muted hover:text-foreground size-8 cursor-pointer rounded-full disabled:cursor-not-allowed disabled:opacity-40"
          disabled={disabled}
          aria-label={label}
          onClick={onClick}
        >
          <Icon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}

function AttachmentGrid({
  messageId,
  attachments,
}: {
  messageId: string
  attachments: MailAttachment[]
}) {
  return (
    <section className="mt-6">
      <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider">
        <Paperclip className="size-3.5" />
        <span>
          {attachments.length}{' '}
          {attachments.length === 1 ? 'attachment' : 'attachments'}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {attachments.map((attachment) => (
          <AttachmentCard
            key={attachment.id}
            messageId={messageId}
            attachment={attachment}
          />
        ))}
      </div>
    </section>
  )
}

function AttachmentCard({
  messageId,
  attachment,
}: {
  messageId: string
  attachment: MailAttachment
}) {
  const { fetchWithWorkspace, workspaceId } = useWorkspace()
  const [downloading, setDownloading] = useState(false)
  const [opening, setOpening] = useState(false)
  const [preview, setPreview] = useState<{
    url: string
    kind: 'image' | 'pdf'
    revokeOnClose: boolean
  } | null>(null)
  const Icon = attachmentIcon(attachment)
  const type = attachmentType(attachment)
  const previewKind = attachmentPreviewKind(attachment)
  const attachmentPath = (disposition: 'attachment' | 'inline') => {
    if (!attachment.attachmentId) return null

    const params = new URLSearchParams({
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      disposition,
      workspace: workspaceId,
    })

    return `/api/messages/${encodeURIComponent(
      messageId,
    )}/attachments/${encodeURIComponent(
      attachment.attachmentId,
    )}?${params.toString()}`
  }

  useEffect(() => {
    return () => {
      if (preview?.revokeOnClose) URL.revokeObjectURL(preview.url)
    }
  }, [preview])

  const fetchAttachmentBlob = async (disposition: 'attachment' | 'inline') => {
    const path = attachmentPath(disposition)
    if (!path) return null

    const res = await fetchWithWorkspace(path)
    if (!res.ok) throw new Error('Failed to load attachment')
    return res.blob()
  }

  const handleOpen = async () => {
    if (!attachment.attachmentId || opening || downloading) return
    if (!previewKind) {
      await handleDownload()
      return
    }

    setOpening(true)
    try {
      if (previewKind === 'pdf') {
        const url = attachmentPath('inline')
        if (!url) return
        setPreview({ url, kind: 'pdf', revokeOnClose: false })
        return
      }

      const blob = await fetchAttachmentBlob('inline')
      if (!blob) return
      const url = URL.createObjectURL(blob)
      setPreview({
        url,
        kind: previewKind,
        revokeOnClose: true,
      })
    } catch (error) {
      console.warn('Attachment preview failed:', error)
    } finally {
      setOpening(false)
    }
  }

  const handleDownload = async () => {
    if (!attachment.attachmentId || downloading) return

    setDownloading(true)
    try {
      const blob = await fetchAttachmentBlob('attachment')
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = attachment.filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      console.warn('Attachment download failed:', error)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className="border-border/80 bg-background hover:bg-muted/30 focus-visible:ring-ring group flex min-w-0 cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
        onClick={() => void handleOpen()}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          void handleOpen()
        }}
      >
        <div className="border-border/70 bg-muted/35 text-muted-foreground relative flex size-10 shrink-0 items-center justify-center rounded-md border">
          {opening ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Icon className="size-5" />
          )}
          {type ? (
            <span className="bg-primary text-primary-foreground absolute -bottom-1 -left-1 rounded-[3px] px-1 py-0.5 text-[8px] font-bold uppercase leading-none shadow-sm">
              {type}
            </span>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-medium leading-5">
            {attachment.filename}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {formatAttachmentSize(attachment.size)}
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:bg-muted hover:text-foreground size-8 shrink-0 cursor-pointer rounded-full opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
              aria-label={`Download ${attachment.filename}`}
              disabled={downloading}
              onClick={(event) => {
                event.stopPropagation()
                void handleDownload()
              }}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {downloading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Download</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <Dialog
        open={preview !== null}
        onOpenChange={(open) => !open && setPreview(null)}
      >
        <DialogContent
          showCloseButton={false}
          className="max-h-[calc(100vh-var(--chat-safe-padding,0px)-2rem)] overflow-hidden p-0 sm:max-w-4xl [@media(max-height:640px)]:!top-0 [@media(max-height:760px)]:!top-4 [@media(max-height:760px)]:!translate-y-0"
        >
          <DialogHeader className="border-border border-b px-4 py-3 text-left">
            <div className="flex min-w-0 items-center gap-3">
              <DialogTitle className="min-w-0 flex-1 truncate text-sm font-medium">
                {attachment.filename}
              </DialogTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:bg-muted hover:text-foreground size-8 shrink-0 cursor-pointer rounded-full"
                    aria-label={`Download ${attachment.filename}`}
                    disabled={downloading}
                    onClick={() => void handleDownload()}
                  >
                    {downloading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Download className="size-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Download</p>
                </TooltipContent>
              </Tooltip>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:bg-muted hover:text-foreground size-8 shrink-0 cursor-pointer rounded-full"
                  aria-label="Close attachment preview"
                >
                  <X className="size-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          {preview?.kind === 'image' ? (
            <div className="bg-muted/20 flex max-h-[calc(100vh-var(--chat-safe-padding,0px)-7rem)] items-center justify-center overflow-auto p-4">
              <img
                src={preview.url}
                alt={attachment.filename}
                className="max-h-full max-w-full rounded-md object-contain"
              />
            </div>
          ) : preview ? (
            <iframe
              title={attachment.filename}
              src={preview.url}
              className="bg-background h-[calc(100vh-var(--chat-safe-padding,0px)-7rem)] w-full"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

function attachmentPreviewKind(
  attachment: MailAttachment,
): 'image' | 'pdf' | null {
  const extension = attachment.filename.split('.').pop()?.toLowerCase()
  if (attachment.mimeType.includes('pdf') || extension === 'pdf') return 'pdf'
  if (attachment.mimeType.startsWith('image/')) return 'image'
  return null
}

function attachmentType(attachment: MailAttachment) {
  const extension = attachment.filename.split('.').pop()?.trim().toUpperCase()
  if (extension && extension.length <= 5 && extension !== attachment.filename) {
    return extension
  }

  if (attachment.mimeType.includes('pdf')) return 'PDF'
  if (attachment.mimeType.startsWith('image/')) return 'IMG'
  if (attachment.mimeType.includes('zip')) return 'ZIP'
  return ''
}

function attachmentIcon(attachment: MailAttachment) {
  if (attachment.mimeType.includes('pdf')) return FileText
  if (attachment.mimeType.startsWith('image/')) return FileImage
  if (
    attachment.mimeType.includes('zip') ||
    attachment.mimeType.includes('compressed')
  ) {
    return FileArchive
  }
  return File
}

function formatAttachmentSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown size'
  if (bytes < 1024) return `${bytes} B`

  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`

  const mb = kb / 1024
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`
}

function recipientLabel(raw: string) {
  const list = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (list.length === 0) return ''

  const first = list[0]!
  const primary = senderName(first) || emailAddress(first) || first
  if (list.length === 1) return primary
  return `${primary} +${list.length - 1}`
}

function EmailMeta({
  message,
}: {
  message: MailMessageSummary | MailMessageDetail
}) {
  const address = emailAddress(message.from)
  const name = senderName(message.from)
  const showAddress = Boolean(address) && address !== name
  const date = formatLongDate(message)
  const recipient = message.to ? recipientLabel(message.to) : ''

  return (
    <div className="mt-4 min-w-0">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-foreground truncate text-[13.5px] font-semibold">
          {name || address || message.from}
        </span>
        {showAddress ? (
          <span className="text-muted-foreground truncate text-xs">
            {address}
          </span>
        ) : null}
      </div>
      <p className="text-muted-foreground mt-0.5 truncate text-xs">
        <span>{date}</span>
        {recipient ? (
          <>
            <span aria-hidden> · </span>
            <span>to {recipient}</span>
          </>
        ) : null}
      </p>
      <LabelRow message={message} />
    </div>
  )
}

function LabelRow({
  message,
}: {
  message: MailMessageSummary | MailMessageDetail
}) {
  const labelsQuery = useLabels()
  const updateLabels = useUpdateMessageLabels()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [labelSearch, setLabelSearch] = useState('')

  useEffect(() => {
    const openPicker = () => setPickerOpen(true)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'l') return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const target = event.target as HTMLElement | null
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return
      }

      event.preventDefault()
      openPicker()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mail:open-label-picker', openPicker)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mail:open-label-picker', openPicker)
    }
  }, [])

  const { userLabels, labelById } = useMemo(() => {
    const all = labelsQuery.data ?? []
    const users = all
      .filter((label) => label.type === 'user')
      .sort(compareLabels)
    const byId = new Map<string, MailLabel>()
    for (const label of all) byId.set(label.id, label)
    return { userLabels: users, labelById: byId }
  }, [labelsQuery.data])

  const appliedUserLabels = useMemo(
    () =>
      message.labelIds
        .map((id) => labelById.get(id))
        .filter((label): label is MailLabel => !!label && label.type === 'user')
        .sort(compareLabels),
    [labelById, message.labelIds],
  )

  const appliedIds = new Set(appliedUserLabels.map((label) => label.id))

  const handleToggle = (labelId: string) => {
    if (appliedIds.has(labelId)) {
      updateLabels.mutate({ id: message.id, removeLabelIds: [labelId] })
    } else {
      updateLabels.mutate({ id: message.id, addLabelIds: [labelId] })
    }
    setLabelSearch('')
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {appliedUserLabels.map((label) => (
        <LabelChip
          key={label.id}
          label={label}
          onRemove={() => handleToggle(label.id)}
        />
      ))}
      <Popover
        open={pickerOpen}
        onOpenChange={(open) => {
          setPickerOpen(open)
          if (!open) setLabelSearch('')
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'border-border/70 text-muted-foreground/80 inline-flex h-6 items-center gap-1 rounded-full border border-dashed px-2 text-[11px] font-medium transition-colors',
              'hover:border-border hover:text-foreground',
              appliedUserLabels.length === 0 && 'border-border/60',
            )}
            aria-label="Add label"
          >
            <Plus className="size-3" />
            <span>
              {appliedUserLabels.length === 0 ? 'Add label' : 'Label'}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0">
          <Command>
            <CommandInput
              value={labelSearch}
              onValueChange={setLabelSearch}
              placeholder="Find a label..."
              className="h-9"
            />
            <CommandList>
              {labelsQuery.isLoading ? (
                <div className="text-muted-foreground flex items-center gap-2 px-3 py-4 text-xs">
                  <Loader2 className="size-3.5 animate-spin" />
                  Loading labels
                </div>
              ) : userLabels.length === 0 ? (
                <CommandEmpty>
                  No custom labels yet. Create them in Gmail.
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {userLabels.map((label) => {
                    const active = appliedIds.has(label.id)
                    return (
                      <CommandItem
                        key={label.id}
                        value={label.name}
                        onSelect={() => {
                          handleToggle(label.id)
                          setLabelSearch('')
                        }}
                        className="cursor-pointer"
                      >
                        <span
                          className="mr-2 inline-block size-2 rounded-full"
                          style={{
                            background:
                              label.color?.backgroundColor ?? 'currentColor',
                            opacity: label.color?.backgroundColor ? 1 : 0.45,
                          }}
                        />
                        <span className="flex-1 truncate">
                          {formatLabelName(label.name)}
                        </span>
                        {active ? (
                          <Check className="text-primary ml-2 size-3.5" />
                        ) : null}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function LabelChip({
  label,
  onRemove,
}: {
  label: MailLabel
  onRemove: () => void
}) {
  const background = label.color?.backgroundColor
  const color = label.color?.textColor
  return (
    <span
      className="group/label border-border/60 bg-muted/40 text-foreground/90 inline-flex h-6 items-center gap-1 rounded-full border pl-2 pr-1 text-[11px] font-medium"
      style={
        background
          ? {
              background,
              color: color ?? undefined,
              borderColor: 'transparent',
            }
          : undefined
      }
    >
      <span className="max-w-[14rem] truncate">
        {formatLabelName(label.name)}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label.name}`}
        className="hover:bg-foreground/10 inline-flex size-4 cursor-pointer items-center justify-center rounded-full opacity-60 transition-colors hover:opacity-100"
      >
        <X className="size-2.5" />
      </button>
    </span>
  )
}

function formatLabelName(name: string) {
  const parts = name.split('/')
  return parts[parts.length - 1] ?? name
}

function compareLabels(a: MailLabel, b: MailLabel) {
  return formatLabelName(a.name).localeCompare(
    formatLabelName(b.name),
    undefined,
    { sensitivity: 'base' },
  )
}

interface ChromeButtonProps {
  active: boolean
  icon: LucideIcon
  label: string
  onClick: () => void
}

function ChromeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: ChromeButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClick}
          aria-label={label}
          className={cn(
            'hover:bg-background/70 size-8 cursor-pointer rounded-full',
            active
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="size-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}
