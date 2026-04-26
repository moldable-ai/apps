import {
  Archive,
  Ban,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  Reply,
  Trash2,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from '@moldable-ai/ui'
import { useLabels } from '../hooks/use-mail'
import type { MailLabel } from '../types'
import { SnoozeMenu } from './snooze-menu'

interface EmailActionDockProps {
  onReply: () => void
  onArchive: () => void
  onSnooze: (until: number) => void
  onUnsnooze: () => void
  isSnoozed: boolean
  onTrash: () => void
  onSpam: () => void
}

export function EmailActionDock({
  onReply,
  onArchive,
  onSnooze,
  onUnsnooze,
  isSnoozed,
  onTrash,
  onSpam,
}: EmailActionDockProps) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4"
      style={{
        bottom:
          'calc(var(--emails-action-dock-safe-padding, var(--chat-safe-padding, 0px)) + 1.5rem)',
      }}
    >
      <div
        className={cn(
          'emails-dock bg-background/95 shadow-foreground/10 pointer-events-auto flex h-14 items-center gap-1 rounded-full border px-2 shadow-xl backdrop-blur-xl',
        )}
      >
        <DockIconButton icon={Archive} title="Archive" onClick={onArchive} />
        <DockSnoozeButton
          onSnooze={onSnooze}
          onUnsnooze={onUnsnooze}
          isSnoozed={isSnoozed}
        />
        <DockIconButton
          icon={Ban}
          title="Mark as spam"
          destructive
          onClick={onSpam}
        />
        <DockIconButton
          icon={Trash2}
          title="Move to trash"
          destructive
          onClick={onTrash}
        />

        <div className="bg-border mx-1 h-7 w-px" />

        <Button
          type="button"
          size="sm"
          onClick={onReply}
          className="h-10 cursor-pointer gap-2 rounded-full px-5 text-sm font-medium"
        >
          <Reply className="size-4" />
          Reply
        </Button>
      </div>
    </div>
  )
}

interface BulkEmailActionDockProps {
  selectedCount: number
  onClear: () => void
  onArchive: () => void
  onArchiveWithLabel: (labelId: string) => void
  onSnooze: (until: number) => void
  onSpam: () => void
  onTrash: () => void
}

export function BulkEmailActionDock({
  selectedCount,
  onClear,
  onArchive,
  onArchiveWithLabel,
  onSnooze,
  onSpam,
  onTrash,
}: BulkEmailActionDockProps) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4"
      style={{
        bottom:
          'calc(var(--emails-action-dock-safe-padding, var(--chat-safe-padding, 0px)) + 1.5rem)',
      }}
    >
      <div className="emails-dock bg-background/95 shadow-foreground/10 pointer-events-auto flex h-14 items-center gap-1 rounded-full border px-2 shadow-xl backdrop-blur-xl">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-muted-foreground hover:bg-muted hover:text-foreground h-10 cursor-pointer gap-2 rounded-full px-3 text-sm font-medium"
        >
          <X className="size-4" />
          {selectedCount}
        </Button>

        <div className="bg-border mx-1 h-7 w-px" />

        <BulkArchiveButton
          onArchive={onArchive}
          onArchiveWithLabel={onArchiveWithLabel}
        />
        <SnoozeMenu
          align="center"
          onSnooze={onSnooze}
          trigger={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Snooze selected"
              className="text-muted-foreground hover:bg-muted hover:text-foreground size-10 cursor-pointer rounded-full"
            >
              <Clock className="size-4" />
            </Button>
          }
        />
        <DockIconButton
          icon={Ban}
          title="Mark selected as spam"
          destructive
          onClick={onSpam}
        />
        <DockIconButton
          icon={Trash2}
          title="Move selected to trash"
          destructive
          onClick={onTrash}
        />
      </div>
    </div>
  )
}

function BulkArchiveButton({
  onArchive,
  onArchiveWithLabel,
}: {
  onArchive: () => void
  onArchiveWithLabel: (labelId: string) => void
}) {
  const labelsQuery = useLabels()
  const [open, setOpen] = useState(false)
  const [labelSearch, setLabelSearch] = useState('')
  const labels = useMemo(
    () =>
      (labelsQuery.data ?? [])
        .filter((label) => label.type === 'user')
        .sort(compareLabels),
    [labelsQuery.data],
  )

  const handleSelect = (labelId: string) => {
    onArchiveWithLabel(labelId)
    setLabelSearch('')
    setOpen(false)
  }

  return (
    <div className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-10 items-center rounded-full transition-colors">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onArchive}
            aria-label="Archive selected"
            className="hover:text-foreground h-10 w-9 cursor-pointer rounded-full rounded-r-none hover:bg-transparent"
          >
            <Archive className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Archive selected</p>
        </TooltipContent>
      </Tooltip>

      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) setLabelSearch('')
        }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Archive selected with label"
                className="hover:text-foreground -ml-2 h-10 w-7 cursor-pointer rounded-full rounded-l-none px-0 hover:bg-transparent"
              >
                <ChevronDown className="size-3.5" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Archive with label</p>
          </TooltipContent>
        </Tooltip>
        <PopoverContent align="center" side="top" className="w-64 p-0">
          <Command>
            <CommandInput
              value={labelSearch}
              onValueChange={setLabelSearch}
              placeholder="Archive with label..."
              className="h-9"
            />
            <CommandList>
              {labelsQuery.isLoading ? (
                <div className="text-muted-foreground flex items-center gap-2 px-3 py-4 text-xs">
                  <Loader2 className="size-3.5 animate-spin" />
                  Loading labels
                </div>
              ) : labels.length === 0 ? (
                <CommandEmpty>
                  No custom labels yet. Create them in Gmail.
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {labels.map((label) => (
                    <CommandItem
                      key={label.id}
                      value={label.name}
                      onSelect={() => handleSelect(label.id)}
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
                      <Check className="ml-2 size-3.5 opacity-0" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function DockSnoozeButton({
  onSnooze,
  onUnsnooze,
  isSnoozed,
}: {
  onSnooze: (until: number) => void
  onUnsnooze: () => void
  isSnoozed: boolean
}) {
  return (
    <SnoozeMenu
      align="center"
      onSnooze={onSnooze}
      onUnsnooze={onUnsnooze}
      isSnoozed={isSnoozed}
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Snooze"
          className="text-muted-foreground hover:bg-muted hover:text-foreground size-10 cursor-pointer rounded-full"
        >
          <Clock className="size-4" />
        </Button>
      }
    />
  )
}

function formatLabelName(name: string) {
  return name.replace(/^CATEGORY_/, '').replace(/\//g, ' / ')
}

function compareLabels(a: MailLabel, b: MailLabel) {
  return formatLabelName(a.name).localeCompare(
    formatLabelName(b.name),
    undefined,
    { sensitivity: 'base' },
  )
}

function DockIconButton({
  icon: Icon,
  title,
  disabled,
  destructive,
  onClick,
}: {
  icon: LucideIcon
  title: string
  disabled?: boolean
  destructive?: boolean
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={onClick}
          aria-label={title}
          className={cn(
            'text-muted-foreground hover:bg-muted hover:text-foreground size-10 cursor-pointer rounded-full',
            destructive && 'hover:text-destructive',
          )}
        >
          <Icon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{title}</p>
      </TooltipContent>
    </Tooltip>
  )
}
