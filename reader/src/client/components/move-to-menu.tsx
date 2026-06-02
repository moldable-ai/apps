import { Check, FolderInput, FolderPlus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@moldable-ai/ui'
import type { Folder } from '../../shared/folder'

interface MoveToMenuProps {
  folders: Folder[]
  currentFolderIds: string[]
  onToggleFolder: (folderId: string, inFolder: boolean) => void
  onClearFolders: () => void
  onCreateFolder: () => void
  trigger: React.ReactNode
}

export function MoveToMenu({
  folders,
  currentFolderIds,
  onToggleFolder,
  onClearFolders,
  onCreateFolder,
  trigger,
}: MoveToMenuProps) {
  const currentIds = new Set(currentFolderIds)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Folders</DropdownMenuLabel>
        {folders.map((folder) => {
          const checked = currentIds.has(folder.id)
          return (
            <DropdownMenuItem
              key={folder.id}
              className="cursor-pointer"
              onSelect={(event: Event) => {
                event.preventDefault()
                onToggleFolder(folder.id, !checked)
              }}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: folder.tone }}
              />
              <span className="truncate">{folder.name}</span>
              {checked ? (
                <Check className="text-muted-foreground ml-auto size-3.5" />
              ) : null}
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuItem
          className="cursor-pointer"
          disabled={currentFolderIds.length === 0}
          onSelect={onClearFolders}
        >
          <FolderInput className="text-muted-foreground size-3.5" />
          Clear folders
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={() => onCreateFolder()}
        >
          <FolderPlus className="text-muted-foreground size-3.5" />
          New folder
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
