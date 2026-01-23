'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { sendToMoldable, useWorkspace } from '@moldable-ai/ui'
import { getFileName, getLanguageFromPath } from '@/lib/file-utils'
import { modelManager } from '@/lib/monaco-model-manager'

export interface OpenFile {
  path: string
  name: string
  language: string
  content: string
  originalContent: string // For tracking dirty state (fallback before Monaco loads)
}

interface UseEditorStateOptions {
  onTabsChange?: (
    openFilePaths: string[],
    activeFilePath: string | null,
  ) => void
}

export function useEditorState(
  rootPath: string | null,
  options?: UseEditorStateOptions,
) {
  const { fetchWithWorkspace } = useWorkspace()
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([])
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const activeFile = openFiles.find((f) => f.path === activeFilePath) ?? null
  const isRestoringTabs = useRef(false)

  // Track AGENTS.md content for the current project
  const [agentsMdContent, setAgentsMdContent] = useState<string | null>(null)

  // Fetch AGENTS.md when project root changes
  useEffect(() => {
    if (!rootPath) {
      setAgentsMdContent(null)
      return
    }

    const agentsMdPath = `${rootPath}/AGENTS.md`

    fetchWithWorkspace(`/api/read?path=${encodeURIComponent(agentsMdPath)}`)
      .then(async (res) => {
        if (res.ok) {
          const { content } = await res.json()
          setAgentsMdContent(content)
        } else {
          setAgentsMdContent(null)
        }
      })
      .catch(() => {
        setAgentsMdContent(null)
      })
  }, [rootPath, fetchWithWorkspace])

  // Send chat instructions to Moldable based on current context
  // This tells the AI to edit files in the user's project (not the Code Editor app itself)
  useEffect(() => {
    if (!rootPath) {
      // No project open - clear instructions
      sendToMoldable({
        type: 'moldable:set-chat-instructions',
        text: '',
      })
      return
    }

    const projectName = rootPath.split('/').pop() ?? 'Project'

    // Build AGENTS.md section if it exists
    const agentsMdSection = agentsMdContent
      ? `\n\n<begin agents.md>${agentsMdContent}</end agents.md>`
      : ''

    if (activeFile) {
      // File is active - include file-specific context
      sendToMoldable({
        type: 'moldable:set-chat-instructions',
        text: `The user is using Code Editor to work on a project.

## Current Project

- **Name**: ${projectName}
- **Path**: ${rootPath}

## Active File

- **File**: ${activeFile.name}
- **Path**: ${activeFile.path}
- **Language**: ${activeFile.language}

When the user asks to edit files, create files, search code, or make changes, operate on files within this project directory. The user is currently viewing the file above.

Do NOT edit the Code Editor app itself unless explicitly asked.${agentsMdSection}`,
      })
    } else {
      // Project open but no active file
      sendToMoldable({
        type: 'moldable:set-chat-instructions',
        text: `The user is using Code Editor to work on a project.

## Current Project

- **Name**: ${projectName}
- **Path**: ${rootPath}

When the user asks to edit files, create files, search code, or make changes, operate on files within this project directory.

Do NOT edit the Code Editor app itself unless explicitly asked.${agentsMdSection}`,
      })
    }
  }, [rootPath, activeFile, agentsMdContent])

  // Clean up all models when project changes
  useEffect(() => {
    return () => {
      modelManager.disposeAll()
    }
  }, [rootPath])

  // Notify parent when tabs change (debounced to avoid excessive saves)
  useEffect(() => {
    // Skip if we're in the middle of restoring tabs or no callback provided
    if (isRestoringTabs.current || !options?.onTabsChange) return

    // Skip initial empty state
    if (openFiles.length === 0 && activeFilePath === null) return

    const timeoutId = setTimeout(() => {
      options.onTabsChange?.(
        openFiles.map((f) => f.path),
        activeFilePath,
      )
    }, 500) // Debounce 500ms to avoid excessive API calls

    return () => clearTimeout(timeoutId)
  }, [openFiles, activeFilePath, options])

  // Check if a file has unsaved changes
  // First check the model manager (has accurate state), fall back to React state
  const isDirty = useCallback(
    (path: string) => {
      // If model exists, use model manager's dirty tracking (more accurate)
      if (modelManager.hasModel(path)) {
        return modelManager.isDirty(path)
      }
      // Fallback to React state (before Monaco is loaded)
      const file = openFiles.find((f) => f.path === path)
      return file ? file.content !== file.originalContent : false
    },
    [openFiles],
  )

  // Open a file (fetch content if not already open)
  const openFile = useCallback(
    async (path: string) => {
      // If already open, just activate it
      const existing = openFiles.find((f) => f.path === path)
      if (existing) {
        setActiveFilePath(path)
        return
      }

      // Fetch file content
      const res = await fetchWithWorkspace(
        `/api/read?path=${encodeURIComponent(path)}`,
      )
      if (!res.ok) {
        console.error('Failed to read file:', path)
        return
      }

      const { content } = await res.json()
      const name = getFileName(path)
      const language = getLanguageFromPath(path)

      const newFile: OpenFile = {
        path,
        name,
        language,
        content,
        originalContent: content,
      }

      setOpenFiles((prev) => [...prev, newFile])
      setActiveFilePath(path)
    },
    [openFiles, fetchWithWorkspace],
  )

  // Close a file
  const closeFile = useCallback(
    (path: string) => {
      // Dispose the Monaco model to free memory
      modelManager.disposeModel(path)

      setOpenFiles((prev) => prev.filter((f) => f.path !== path))

      // If closing the active file, switch to another
      if (activeFilePath === path) {
        const remaining = openFiles.filter((f) => f.path !== path)
        setActiveFilePath(
          remaining.length > 0 ? remaining[remaining.length - 1].path : null,
        )
      }
    },
    [activeFilePath, openFiles],
  )

  // Update file content (in memory)
  const updateFileContent = useCallback((path: string, content: string) => {
    setOpenFiles((prev) =>
      prev.map((f) => (f.path === path ? { ...f, content } : f)),
    )
  }, [])

  // Save a file to disk
  const saveFile = useCallback(
    async (path: string) => {
      // Get content from model manager if available (most up-to-date)
      const modelContent = modelManager.getContent(path)
      const file = openFiles.find((f) => f.path === path)

      const content = modelContent ?? file?.content
      if (!content && content !== '') return

      setIsSaving(true)
      try {
        const res = await fetchWithWorkspace('/api/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path, content }),
        })

        if (!res.ok) {
          console.error('Failed to save file:', path)
          return
        }

        // Mark as saved in model manager
        modelManager.markAsSaved(path)

        // Update original content to mark as clean in React state too
        setOpenFiles((prev) =>
          prev.map((f) =>
            f.path === path ? { ...f, content, originalContent: content } : f,
          ),
        )
      } finally {
        setIsSaving(false)
      }
    },
    [openFiles, fetchWithWorkspace],
  )

  // Save the active file
  const saveActiveFile = useCallback(async () => {
    if (activeFilePath) {
      await saveFile(activeFilePath)
    }
  }, [activeFilePath, saveFile])

  // Close all files
  const closeAllFiles = useCallback(() => {
    // Dispose all models
    modelManager.disposeAll()
    setOpenFiles([])
    setActiveFilePath(null)
  }, [])

  // Get current open file paths (for saving tab state)
  const getOpenFilePaths = useCallback(() => {
    return openFiles.map((f) => f.path)
  }, [openFiles])

  // Restore tabs from saved state (opens multiple files)
  const restoreTabs = useCallback(
    async (filePaths: string[], activeFile: string | null) => {
      // Set flag to prevent onTabsChange from firing during restore
      isRestoringTabs.current = true

      // Close existing files first (and dispose models)
      modelManager.disposeAll()
      setOpenFiles([])
      setActiveFilePath(null)

      // Deduplicate file paths to prevent duplicate tabs
      const uniqueFilePaths = [...new Set(filePaths)]

      // Open each file
      for (const path of uniqueFilePaths) {
        try {
          const res = await fetchWithWorkspace(
            `/api/read?path=${encodeURIComponent(path)}`,
          )
          if (!res.ok) {
            console.warn(
              'Failed to restore file (may have been deleted):',
              path,
            )
            continue
          }

          const { content } = await res.json()
          const name = getFileName(path)
          const language = getLanguageFromPath(path)

          const newFile: OpenFile = {
            path,
            name,
            language,
            content,
            originalContent: content,
          }

          setOpenFiles((prev) => {
            // Check if file already exists to prevent duplicates
            if (prev.some((f) => f.path === newFile.path)) {
              return prev
            }
            return [...prev, newFile]
          })
        } catch {
          console.warn('Failed to restore file:', path)
        }
      }

      // Set active file (default to first file if saved active doesn't exist)
      if (activeFile && uniqueFilePaths.includes(activeFile)) {
        setActiveFilePath(activeFile)
      } else if (uniqueFilePaths.length > 0) {
        setActiveFilePath(uniqueFilePaths[0])
      }

      // Clear the flag after a short delay to allow state to settle
      setTimeout(() => {
        isRestoringTabs.current = false
      }, 100)
    },
    [fetchWithWorkspace],
  )

  return {
    openFiles,
    activeFile,
    activeFilePath,
    isSaving,
    isDirty,
    openFile,
    closeFile,
    updateFileContent,
    saveFile,
    saveActiveFile,
    setActiveFilePath,
    closeAllFiles,
    getOpenFilePaths,
    restoreTabs,
  }
}
