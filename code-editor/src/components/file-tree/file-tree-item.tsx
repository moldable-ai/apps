'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, FolderOpen, Pencil, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn, useWorkspace } from '@moldable-ai/ui'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { FileIcon } from './file-icon'

export interface FileItem {
  name: string
  path: string
  isDirectory: boolean
  isDimmed?: boolean
}

interface FileTreeItemProps {
  file: FileItem
  depth: number
  rootPath: string
  onFileSelect: (path: string) => void
  selectedPath?: string | null
  onDeleteRequest: (file: FileItem) => void
}

export function FileTreeItem({
  file,
  depth,
  rootPath,
  onFileSelect,
  selectedPath,
  onDeleteRequest,
}: FileTreeItemProps) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(file.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const isSelected = selectedPath === file.path

  // Focus input when entering rename mode
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      // Select filename without extension for files
      if (!file.isDirectory) {
        const lastDot = file.name.lastIndexOf('.')
        if (lastDot > 0) {
          inputRef.current.setSelectionRange(0, lastDot)
        } else {
          inputRef.current.select()
        }
      } else {
        inputRef.current.select()
      }
    }
  }, [isRenaming, file.isDirectory, file.name])

  // Lazy load children when directory is opened
  const { data: children } = useQuery({
    queryKey: ['files', file.path, workspaceId],
    queryFn: async () => {
      const params = new URLSearchParams({
        path: file.path,
        root: rootPath,
      })
      const res = await fetchWithWorkspace(`/api/files?${params}`)
      if (!res.ok) throw new Error('Failed to fetch files')
      return res.json() as Promise<{ files: FileItem[] }>
    },
    enabled: file.isDirectory && isOpen,
  })

  // Rename mutation
  const renameMutation = useMutation({
    mutationFn: async (newName: string) => {
      const res = await fetchWithWorkspace('/api/files/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath: file.path, newName }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to rename')
      }
      return res.json()
    },
    onSuccess: () => {
      // Invalidate parent directory to refresh the tree
      const parentPath = file.path.substring(0, file.path.lastIndexOf('/'))
      queryClient.invalidateQueries({ queryKey: ['files', parentPath] })
      setIsRenaming(false)
    },
    onError: (error) => {
      alert(error.message)
      setRenameValue(file.name)
      setIsRenaming(false)
    },
  })

  const handleClick = useCallback(() => {
    if (isRenaming) return
    if (file.isDirectory) {
      setIsOpen((prev) => !prev)
    } else {
      onFileSelect(file.path)
    }
  }, [file, onFileSelect, isRenaming])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isRenaming) return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleClick()
      }
    },
    [handleClick, isRenaming],
  )

  const handleShowInFinder = useCallback(() => {
    window.parent.postMessage(
      {
        type: 'moldable:show-in-folder',
        path: file.path,
      },
      '*',
    )
  }, [file.path])

  const handleStartRename = useCallback(() => {
    setRenameValue(file.name)
    setIsRenaming(true)
  }, [file.name])

  const handleRenameSubmit = useCallback(() => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== file.name) {
      renameMutation.mutate(trimmed)
    } else {
      setRenameValue(file.name)
      setIsRenaming(false)
    }
  }, [renameValue, file.name, renameMutation])

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleRenameSubmit()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setRenameValue(file.name)
        setIsRenaming(false)
      }
    },
    [handleRenameSubmit, file.name],
  )

  const handleRenameBlur = useCallback(() => {
    handleRenameSubmit()
  }, [handleRenameSubmit])

  // Handle clicks outside the input to save/cancel rename
  useEffect(() => {
    if (!isRenaming) return

    const handleMouseDown = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        handleRenameSubmit()
      }
    }

    // Use mousedown to catch before other click handlers fire
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [isRenaming, handleRenameSubmit])

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            className={cn(
              'flex w-full cursor-pointer items-center gap-1.5 rounded-sm px-2 py-1 text-left text-sm transition-colors',
              'hover:bg-accent/50',
              isSelected && 'bg-accent text-accent-foreground',
              file.isDimmed && 'opacity-50',
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {file.isDirectory ? (
              <ChevronRight
                className={cn(
                  'text-muted-foreground size-3.5 shrink-0 transition-transform',
                  isOpen && 'rotate-90',
                )}
              />
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            <FileIcon
              filename={file.name}
              isDirectory={file.isDirectory}
              isOpen={isOpen}
              className="size-4 shrink-0"
            />
            {isRenaming ? (
              <input
                ref={inputRef}
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={handleRenameKeyDown}
                onBlur={handleRenameBlur}
                className="border-primary bg-background text-foreground min-w-0 flex-1 rounded-sm border px-1 py-0 text-sm outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className={cn(
                  'min-w-0 flex-1 truncate',
                  file.isDimmed ? 'text-muted-foreground' : 'text-foreground',
                )}
              >
                {file.name}
              </span>
            )}
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={handleShowInFinder}>
            <FolderOpen className="size-4" />
            Show in Finder
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleStartRename}>
            <Pencil className="size-4" />
            Rename
          </ContextMenuItem>
          <ContextMenuItem
            variant="destructive"
            onSelect={() => {
              setTimeout(() => onDeleteRequest(file), 0)
            }}
          >
            <Trash2 className="size-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Children (if directory is open) */}
      {file.isDirectory && isOpen && children?.files && (
        <div>
          {children.files.map((child) => (
            <FileTreeItem
              key={child.path}
              file={child}
              depth={depth + 1}
              rootPath={rootPath}
              onFileSelect={onFileSelect}
              selectedPath={selectedPath}
              onDeleteRequest={onDeleteRequest}
            />
          ))}
        </div>
      )}
    </div>
  )
}
