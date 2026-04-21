'use client'

import { useCallback } from 'react'
import { useProject } from '@/hooks/use-project'
import { IDELayout } from '@/components/layout'
import { ProjectSelector } from '@/components/project'

export default function App() {
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

  const handleSelectProject = useCallback(
    async (
      path: string,
      currentOpenFiles: string[],
      currentActiveFile: string | null,
    ) => {
      await saveCurrentProjectTabs(currentOpenFiles, currentActiveFile)
      await openProject(path)
    },
    [saveCurrentProjectTabs, openProject],
  )

  const handleOpenFolder = useCallback(
    async (currentOpenFiles: string[], currentActiveFile: string | null) => {
      await saveCurrentProjectTabs(currentOpenFiles, currentActiveFile)
      await openFolderPicker()
    },
    [saveCurrentProjectTabs, openFolderPicker],
  )

  const handleCloseProject = useCallback(
    async (currentOpenFiles: string[], currentActiveFile: string | null) => {
      await saveCurrentProjectTabs(currentOpenFiles, currentActiveFile)
      await closeProject()
    },
    [saveCurrentProjectTabs, closeProject],
  )

  const handleTabsChange = useCallback(
    (openFiles: string[], activeFile: string | null) => {
      void saveCurrentProjectTabs(openFiles, activeFile)
    },
    [saveCurrentProjectTabs],
  )

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

  const savedTabs = getSavedTabs(rootPath)

  return (
    <div className="h-full w-full">
      <IDELayout
        rootPath={rootPath}
        previewUrl={previewUrl}
        savedTabs={savedTabs}
        recentProjects={recentProjects}
        onSelectProject={handleSelectProject}
        onOpenFolder={handleOpenFolder}
        onCloseProject={handleCloseProject}
        onPreviewUrlChange={setPreviewUrl}
        onTabsChange={handleTabsChange}
      />
    </div>
  )
}
