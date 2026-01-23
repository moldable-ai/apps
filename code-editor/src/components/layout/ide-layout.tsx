'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditorState } from '@/hooks/use-editor-state'
import { BrowserPanel } from '../browser'
import { CommandPalette } from '../command-palette'
import { EditorPanel } from '../editor'
import { FileTree } from '../file-tree'
import { Header } from './header'
import { Panel, PanelGroup, PanelResizeHandle } from './resizable-panels'
import { SidebarHeader } from './sidebar-header'

interface SavedTabs {
  openFiles: string[]
  activeFile: string | null
}

interface IDELayoutProps {
  rootPath: string
  previewUrl: string
  savedTabs: SavedTabs | null
  onChangeProject: (openFiles: string[], activeFile: string | null) => void
  onCloseProject: (openFiles: string[], activeFile: string | null) => void
  onPreviewUrlChange: (url: string) => void
  onTabsChange?: (openFiles: string[], activeFile: string | null) => void
}

export function IDELayout({
  rootPath,
  previewUrl,
  savedTabs,
  onChangeProject,
  onCloseProject,
  onPreviewUrlChange,
  onTabsChange,
}: IDELayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isBrowserCollapsed, setIsBrowserCollapsed] = useState(false)
  const hasRestoredTabs = useRef(false)

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

  // Wrap onChangeProject to pass current tabs
  const handleChangeProject = useCallback(() => {
    onChangeProject(getOpenFilePaths(), activeFilePath)
  }, [onChangeProject, getOpenFilePaths, activeFilePath])

  // Wrap onCloseProject to pass current tabs
  const handleCloseProject = useCallback(() => {
    onCloseProject(getOpenFilePaths(), activeFilePath)
  }, [onCloseProject, getOpenFilePaths, activeFilePath])

  return (
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
                onChangeProject={handleChangeProject}
                onCloseProject={handleCloseProject}
              />
              <div className="min-h-0 flex-1 overflow-auto">
                <FileTree
                  rootPath={rootPath}
                  onFileSelect={openFile}
                  selectedPath={activeFilePath}
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
  )
}
