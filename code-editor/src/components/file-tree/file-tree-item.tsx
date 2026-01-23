'use client'

import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { useCallback, useState } from 'react'
import { cn, useWorkspace } from '@moldable-ai/ui'
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
}

export function FileTreeItem({
  file,
  depth,
  rootPath,
  onFileSelect,
  selectedPath,
}: FileTreeItemProps) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const [isOpen, setIsOpen] = useState(false)
  const isSelected = selectedPath === file.path

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

  const handleClick = useCallback(() => {
    if (file.isDirectory) {
      setIsOpen((prev) => !prev)
    } else {
      onFileSelect(file.path)
    }
  }, [file, onFileSelect])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleClick()
      }
    },
    [handleClick],
  )

  return (
    <div>
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
        <span
          className={cn(
            'min-w-0 flex-1 truncate',
            file.isDimmed ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          {file.name}
        </span>
      </button>

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
            />
          ))}
        </div>
      )}
    </div>
  )
}
