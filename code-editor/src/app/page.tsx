'use client'

import { useCallback } from 'react'
import { useProject } from '@/hooks/use-project'
import { IDELayout } from '@/components/layout'
import { ProjectSelector } from '@/components/project'

export default function CodeEditorPage() {
  const {
    rootPath,
    recentProjects,
    previewUrl,
    isLoading,
    openProject,
    openFolderPicker,
    closeProject,
    setPreviewUrl,
    saveCurrentProjectTabs,
    getSavedTabs,
  } = useProject()

  // Wrapper for openFolderPicker that can save tabs first
  const handleChangeProject = useCallback(
    async (currentOpenFiles: string[], currentActiveFile: string | null) => {
      // Save current tabs before switching
      await saveCurrentProjectTabs(currentOpenFiles, currentActiveFile)
      await openFolderPicker()
    },
    [saveCurrentProjectTabs, openFolderPicker],
  )

  // Wrapper for closeProject that saves tabs first
  const handleCloseProject = useCallback(
    async (currentOpenFiles: string[], currentActiveFile: string | null) => {
      // Save current tabs before closing
      await saveCurrentProjectTabs(currentOpenFiles, currentActiveFile)
      await closeProject()
    },
    [saveCurrentProjectTabs, closeProject],
  )

  // Auto-save tabs whenever they change
  const handleTabsChange = useCallback(
    (openFiles: string[], activeFile: string | null) => {
      saveCurrentProjectTabs(openFiles, activeFile)
    },
    [saveCurrentProjectTabs],
  )

  // Show project selector when no project is open
  if (!rootPath) {
    return (
      <div className="h-full w-full">
        <ProjectSelector
          recentProjects={recentProjects}
          isLoading={isLoading}
          onSelectProject={openProject}
          onOpenFolder={openFolderPicker}
        />
      </div>
    )
  }

  // Get saved tabs for this project
  const savedTabs = getSavedTabs(rootPath)

  // Show IDE layout when project is open
  return (
    <div className="h-full w-full">
      <IDELayout
        rootPath={rootPath}
        previewUrl={previewUrl}
        savedTabs={savedTabs}
        onChangeProject={handleChangeProject}
        onCloseProject={handleCloseProject}
        onPreviewUrlChange={setPreviewUrl}
        onTabsChange={handleTabsChange}
      />
    </div>
  )
}
