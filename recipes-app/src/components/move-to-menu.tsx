import {
  Check,
  FolderInput,
  FolderPlus,
  MoreVertical,
  Trash2,
} from 'lucide-react'
import type { MouseEvent, ReactNode } from 'react'
import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger, cn } from '@moldable-ai/ui'
import type { Folder } from '../client/use-folders'

interface MoveToMenuProps {
  folders: Folder[]
  currentFolderId: string | null
  onMove: (folderId: string | null) => void
  onNewFolder: () => void
  onDelete?: () => void
  triggerClassName?: string
  trigger?: ReactNode
  align?: 'start' | 'end' | 'center'
}

/**
 * Per-recipe "move to folder" menu, modeled on the Piano app. Lives on a card
 * (revealed on hover) or in the detail header. Lets you move into any folder,
 * back to the library, create a new folder inline, or delete the recipe.
 */
export function MoveToMenu({
  folders,
  currentFolderId,
  onMove,
  onNewFolder,
  onDelete,
  triggerClassName,
  trigger,
  align = 'end',
}: MoveToMenuProps) {
  const [open, setOpen] = useState(false)

  const stop = (event: MouseEvent) => event.stopPropagation()

  const defaultTrigger = (
    <button
      type="button"
      onClick={stop}
      aria-label="Move to folder"
      className={cn(
        'inline-flex size-8 cursor-pointer items-center justify-center rounded-full transition-all',
        'bg-background/70 text-foreground/80 hover:bg-background hover:text-foreground',
        'border-border/50 border backdrop-blur',
        'opacity-0 focus-visible:opacity-100 group-hover:opacity-100',
        open && 'opacity-100',
        triggerClassName,
      )}
    >
      <MoreVertical className="size-4" />
    </button>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger ?? defaultTrigger}</PopoverTrigger>
      <PopoverContent
        align={align}
        side="bottom"
        sideOffset={6}
        onClick={stop}
        className="w-[240px] p-1"
      >
        <p className="text-muted-foreground/80 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em]">
          Move to
        </p>

        {currentFolderId !== null ? (
          <button
            type="button"
            onClick={(event) => {
              stop(event)
              onMove(null)
              setOpen(false)
            }}
            className="hover:bg-muted/55 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px]"
          >
            <FolderInput className="text-muted-foreground size-3.5" />
            All recipes (no folder)
          </button>
        ) : null}

        {folders.length === 0 ? (
          <p className="text-muted-foreground px-2 py-1.5 text-[11.5px] italic">
            No folders yet — create one below.
          </p>
        ) : (
          folders.map((folder) => {
            const isCurrent = folder.id === currentFolderId
            return (
              <button
                key={folder.id}
                type="button"
                onClick={(event) => {
                  stop(event)
                  if (!isCurrent) onMove(folder.id)
                  setOpen(false)
                }}
                className="hover:bg-muted/55 flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px]"
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: folder.tone }}
                  />
                  <span className="truncate">{folder.name}</span>
                </span>
                {isCurrent ? (
                  <Check className="text-muted-foreground size-3.5" />
                ) : null}
              </button>
            )
          })
        )}

        <div className="bg-border/40 my-1 h-px" />
        <button
          type="button"
          onClick={(event) => {
            stop(event)
            onNewFolder()
            setOpen(false)
          }}
          className="hover:bg-muted/55 text-foreground flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px]"
        >
          <FolderPlus className="text-muted-foreground size-3.5" />
          New folder…
        </button>

        {onDelete ? (
          <>
            <div className="bg-border/40 my-1 h-px" />
            <button
              type="button"
              onClick={(event) => {
                stop(event)
                onDelete()
                setOpen(false)
              }}
              className="text-destructive hover:bg-destructive/10 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px]"
            >
              <Trash2 className="size-3.5" />
              Delete recipe…
            </button>
          </>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
