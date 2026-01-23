'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useWorkspace } from '@moldable-ai/ui'

export interface SearchResult {
  path: string
  name: string
  relativePath: string
}

export function useFileSearch(rootPath: string | null, query: string) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  // Fetch all files once (cached)
  const { data: allFiles, isLoading } = useQuery({
    queryKey: ['all-files', rootPath, workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace(
        `/api/search?root=${encodeURIComponent(rootPath!)}`,
      )
      if (!res.ok) throw new Error('Failed to search files')
      return res.json() as Promise<{ files: SearchResult[] }>
    },
    enabled: !!rootPath,
    staleTime: 30000, // Cache for 30s
  })

  // Client-side fuzzy filter
  const results = useMemo(() => {
    if (!allFiles?.files) return []
    if (!query.trim()) return allFiles.files.slice(0, 50) // Show first 50 when no query

    const q = query.toLowerCase()
    const scored = allFiles.files
      .map((file) => {
        const nameMatch = file.name.toLowerCase().includes(q)
        const pathMatch = file.relativePath.toLowerCase().includes(q)
        // Score: exact name match > name contains > path contains
        let score = 0
        if (file.name.toLowerCase() === q) score = 100
        else if (file.name.toLowerCase().startsWith(q)) score = 80
        else if (nameMatch) score = 60
        else if (pathMatch) score = 40
        else score = 0

        return { file, score }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)

    return scored.map((item) => item.file)
  }, [allFiles, query])

  return { results, isLoading }
}
