'use client'

import { useQuery } from '@tanstack/react-query'
import { ScrollArea, useWorkspace } from '@moldable-ai/ui'
import { type FileItem, FileTreeItem } from './file-tree-item'

interface FileTreeProps {
  rootPath: string
  onFileSelect: (path: string) => void
  selectedPath?: string | null
  onDeleteRequest: (file: FileItem) => void
}

export function FileTree({
  rootPath,
  onFileSelect,
  selectedPath,
  onDeleteRequest,
}: FileTreeProps) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  const { data, isLoading, error } = useQuery({
    queryKey: ['files', rootPath, workspaceId],
    queryFn: async () => {
      const params = new URLSearchParams({
        path: rootPath,
        root: rootPath,
      })
      const res = await fetchWithWorkspace(`/api/files?${params}`)
      if (!res.ok) throw new Error('Failed to fetch files')
      return res.json() as Promise<{ files: FileItem[] }>
    },
    enabled: !!rootPath,
  })

  if (isLoading) {
    return (
      <div className="text-muted-foreground p-2 text-xs">Loading files...</div>
    )
  }

  if (error) {
    return (
      <div className="text-destructive p-2 text-xs">Failed to load files</div>
    )
  }

  if (!data?.files?.length) {
    return (
      <div className="text-muted-foreground p-2 text-xs">No files found</div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="py-1">
        {data.files.map((file) => (
          <FileTreeItem
            key={file.path}
            file={file}
            depth={0}
            rootPath={rootPath}
            onFileSelect={onFileSelect}
            selectedPath={selectedPath}
            onDeleteRequest={onDeleteRequest}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
