'use client'

import { useCallback, useEffect, useState } from 'react'
import { useProject } from '@/hooks/use-project'
import { IDELayout } from '@/components/layout'
import { ProjectSelector } from '@/components/project'

type PendingOpenFile = {
  nonce: number
  projectPath: string
  filePath: string
}

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

  const [pendingOpenFile, setPendingOpenFile] =
    useState<PendingOpenFile | null>(null)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'moldable:open-file') return

      const projectPath =
        typeof event.data.projectPath === 'string'
          ? event.data.projectPath
          : null
      const filePath =
        typeof event.data.filePath === 'string' ? event.data.filePath : null

      if (!projectPath || !filePath) return

      setPendingOpenFile({
        nonce: Date.now(),
        projectPath,
        filePath,
      })

      if (rootPath !== projectPath) {
        void openProject(projectPath)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [openProject, rootPath])

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
        pendingOpenFile={pendingOpenFile}
        onPendingOpenFileDone={(nonce) => {
          setPendingOpenFile((pending) =>
            pending?.nonce === nonce ? null : pending,
          )
        }}
        onSelectProject={handleSelectProject}
        onOpenFolder={handleOpenFolder}
        onCloseProject={handleCloseProject}
        onPreviewUrlChange={setPreviewUrl}
        onTabsChange={handleTabsChange}
      />
    </div>
  )
}
