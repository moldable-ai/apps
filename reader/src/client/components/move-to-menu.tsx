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
  currentFolderId: string | null
  onMove: (folderId: string | null) => void
  onCreateFolder: () => void
  trigger: React.ReactNode
}

export function MoveToMenu({
  folders,
  currentFolderId,
  onMove,
  onCreateFolder,
  trigger,
}: MoveToMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Move to</DropdownMenuLabel>
        {folders.map((folder) => (
          <DropdownMenuItem
            key={folder.id}
            className="cursor-pointer"
            onSelect={() => onMove(folder.id)}
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: folder.tone }}
            />
            <span className="truncate">{folder.name}</span>
            {currentFolderId === folder.id ? (
              <Check className="text-muted-foreground ml-auto size-3.5" />
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          className="cursor-pointer"
          disabled={currentFolderId === null}
          onSelect={() => onMove(null)}
        >
          <FolderInput className="text-muted-foreground size-3.5" />
          Remove from folder
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
