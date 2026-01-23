'use client'

import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  useWorkspace,
} from '@moldable-ai/ui'
import { useEditorState } from '@/hooks/use-editor-state'
import { BrowserPanel } from '../browser'
import { CommandPalette } from '../command-palette'
import { EditorPanel } from '../editor'
import { type FileItem, FileTree } from '../file-tree'
import { Header } from './header'
import { Panel, PanelGroup, PanelResizeHandle } from './resizable-panels'
import { SidebarHeader } from './sidebar-header'

interface SavedTabs {
  openFiles: string[]
  activeFile: string | null
}

interface RecentProject {
  path: string
  name: string
  lastOpened: string
}

interface IDELayoutProps {
  rootPath: string
  previewUrl: string
  savedTabs: SavedTabs | null
  recentProjects: RecentProject[]
  onSelectProject: (
    path: string,
    openFiles: string[],
    activeFile: string | null,
  ) => void
  onOpenFolder: (openFiles: string[], activeFile: string | null) => void
  onCloseProject: (openFiles: string[], activeFile: string | null) => void
  onPreviewUrlChange: (url: string) => void
  onTabsChange?: (openFiles: string[], activeFile: string | null) => void
}

export function IDELayout({
  rootPath,
  previewUrl,
  savedTabs,
  recentProjects,
  onSelectProject,
  onOpenFolder,
  onCloseProject,
  onPreviewUrlChange,
  onTabsChange,
}: IDELayoutProps) {
  const { fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isBrowserCollapsed, setIsBrowserCollapsed] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null)
  const hasRestoredTabs = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    openFiles,
    activeFile,
    activeFilePath,
    isDirty,
    openFile,
    closeFile,
    updateFileContent,
    saveActiveFile,
    setActiveFilePath,
    getOpenFilePaths,
    restoreTabs,
  } = useEditorState(rootPath, { onTabsChange })

  const projectName = rootPath.split('/').pop() ?? 'Project'

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (filePath: string) => {
      const res = await fetchWithWorkspace('/api/files/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete')
      }
      return res.json()
    },
    onSuccess: (_data, filePath) => {
      const parentPath = filePath.substring(0, filePath.lastIndexOf('/'))
      queryClient.invalidateQueries({ queryKey: ['files', parentPath] })
      setFileToDelete(null)
    },
    onError: (error) => {
      alert(error.message)
      setFileToDelete(null)
    },
  })

  const handleDeleteRequest = useCallback((file: FileItem) => {
    setFileToDelete(file)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (fileToDelete) {
      deleteMutation.mutate(fileToDelete.path)
    }
  }, [fileToDelete, deleteMutation])

  // Restore saved tabs when the component mounts with a new project
  useEffect(() => {
    if (
      savedTabs &&
      !hasRestoredTabs.current &&
      savedTabs.openFiles.length > 0
    ) {
      hasRestoredTabs.current = true
      restoreTabs(savedTabs.openFiles, savedTabs.activeFile)
    }
  }, [savedTabs, restoreTabs])

  // Reset the ref when rootPath changes (new project)
  useEffect(() => {
    hasRestoredTabs.current = false
  }, [rootPath])

  // Handle keyboard shortcuts
  // - Cmd/Ctrl+W: Close active tab
  // - Cmd/Ctrl+B: Toggle left sidebar (VS Code standard)
  // - Cmd/Ctrl+Option+B: Toggle right panel/browser (VS Code secondary sidebar)
  useEffect(() => {
    const closeActiveTab = () => {
      if (activeFilePath) {
        closeFile(activeFilePath)
      }
    }

    // Listen for Moldable's close-tab message (sent when Cmd+W is pressed in the desktop)
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'moldable:close-tab') {
        closeActiveTab()
      }
    }

    // Keyboard handler for shortcuts
    // Note: Use e.code for modifier combos since Option+key produces special characters on Mac
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey

      // Cmd/Ctrl+W - Close active tab
      if (isMod && e.code === 'KeyW') {
        e.preventDefault()
        e.stopPropagation()
        closeActiveTab()
        return
      }

      // Cmd/Ctrl+B - Toggle left sidebar (VS Code standard)
      if (isMod && !e.shiftKey && !e.altKey && e.code === 'KeyB') {
        e.preventDefault()
        e.stopPropagation()
        setIsSidebarCollapsed((prev) => !prev)
        return
      }

      // Cmd/Ctrl+Option+B - Toggle right panel/browser (VS Code secondary sidebar)
      if (isMod && e.altKey && !e.shiftKey && e.code === 'KeyB') {
        e.preventDefault()
        e.stopPropagation()
        setIsBrowserCollapsed((prev) => !prev)
        return
      }
    }

    window.addEventListener('message', handleMessage)
    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('message', handleMessage)
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [activeFilePath, closeFile])

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev)
  }, [])

  const handleToggleBrowser = useCallback(() => {
    setIsBrowserCollapsed((prev) => !prev)
  }, [])

  // Wrap onSelectProject to pass current tabs
  const handleSelectProject = useCallback(
    (path: string) => {
      onSelectProject(path, getOpenFilePaths(), activeFilePath)
    },
    [onSelectProject, getOpenFilePaths, activeFilePath],
  )

  // Wrap onOpenFolder to pass current tabs
  const handleOpenFolder = useCallback(() => {
    onOpenFolder(getOpenFilePaths(), activeFilePath)
  }, [onOpenFolder, getOpenFilePaths, activeFilePath])

  // Wrap onCloseProject to pass current tabs
  const handleCloseProject = useCallback(() => {
    onCloseProject(getOpenFilePaths(), activeFilePath)
  }, [onCloseProject, getOpenFilePaths, activeFilePath])

  return (
    <>
      {/* Container for portals to stay within iframe */}
      <div
        ref={containerRef}
        className="pointer-events-none fixed inset-0 z-[9999]"
      />

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!fileToDelete}
        onOpenChange={(open) => !open && setFileToDelete(null)}
      >
        <AlertDialogPortal container={containerRef.current}>
          <AlertDialogOverlay className="pointer-events-auto z-[1]" />
          <AlertDialogPrimitive.Content className="bg-card text-card-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 pointer-events-auto fixed left-[50%] top-[50%] z-[2] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete {fileToDelete?.isDirectory ? 'folder' : 'file'}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{' '}
                <strong>{fileToDelete?.name}</strong>?
                {fileToDelete?.isDirectory &&
                  ' This will delete all contents inside it.'}{' '}
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="justify-end">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogPrimitive.Content>
        </AlertDialogPortal>
      </AlertDialog>

      <div className="bg-background flex h-full w-full flex-col">
        {/* Header */}
        <Header
          projectName={projectName}
          activeFilePath={activeFilePath}
          rootPath={rootPath}
          isSidebarOpen={!isSidebarCollapsed}
          isBrowserOpen={!isBrowserCollapsed}
          onToggleSidebar={handleToggleSidebar}
          onToggleBrowser={handleToggleBrowser}
        />

        {/* Main content */}
        <div className="min-h-0 flex-1">
          <PanelGroup
            orientation="horizontal"
            storageKey="code-editor-layout"
            style={{ height: '100%', width: '100%' }}
          >
            {/* Sidebar */}
            <Panel
              id="sidebar"
              defaultSize={20}
              minSize={10}
              maxSize={40}
              collapsible
              collapsed={isSidebarCollapsed}
              onCollapsedChange={setIsSidebarCollapsed}
            >
              <div className="bg-card flex h-full flex-col overflow-hidden">
                <SidebarHeader
                  projectName={projectName}
                  recentProjects={recentProjects}
                  onSelectProject={handleSelectProject}
                  onOpenFolder={handleOpenFolder}
                  onCloseProject={handleCloseProject}
                />
                <div className="min-h-0 flex-1 overflow-auto">
                  <FileTree
                    rootPath={rootPath}
                    onFileSelect={openFile}
                    selectedPath={activeFilePath}
                    onDeleteRequest={handleDeleteRequest}
                  />
                </div>
              </div>
            </Panel>
            <PanelResizeHandle />

            {/* Editor */}
            <Panel id="editor" defaultSize={50} minSize={20}>
              <EditorPanel
                openFiles={openFiles}
                activeFile={activeFile}
                activeFilePath={activeFilePath}
                isDirty={isDirty}
                onTabSelect={setActiveFilePath}
                onTabClose={closeFile}
                onContentChange={updateFileContent}
                onSave={saveActiveFile}
              />
            </Panel>

            {/* Browser preview */}
            <PanelResizeHandle />
            <Panel
              id="browser"
              defaultSize={30}
              minSize={15}
              maxSize={80}
              collapsible
              collapsed={isBrowserCollapsed}
              onCollapsedChange={setIsBrowserCollapsed}
            >
              <BrowserPanel
                defaultUrl={previewUrl}
                onUrlChange={onPreviewUrlChange}
              />
            </Panel>
          </PanelGroup>
        </div>

        {/* Command palette */}
        <CommandPalette rootPath={rootPath} onFileSelect={openFile} />
      </div>
    </>
  )
}
