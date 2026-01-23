'use client'

import { isImageFile } from '@/lib/file-utils'
import type { OpenFile } from '@/hooks/use-editor-state'
import { EditorEmpty } from './editor-empty'
import { EditorTabs } from './editor-tabs'
import { ImagePreview } from './image-preview'
import { MonacoEditor } from './monaco-editor'

interface EditorPanelProps {
  openFiles: OpenFile[]
  activeFile: OpenFile | null
  activeFilePath: string | null
  isDirty: (path: string) => boolean
  onTabSelect: (path: string) => void
  onTabClose: (path: string) => void
  onContentChange: (path: string, content: string) => void
  onSave: () => void
}

export function EditorPanel({
  openFiles,
  activeFile,
  activeFilePath,
  isDirty,
  onTabSelect,
  onTabClose,
  onContentChange,
  onSave,
}: EditorPanelProps) {
  const tabs = openFiles.map((file) => ({
    path: file.path,
    name: file.name,
    isDirty: isDirty(file.path),
  }))

  return (
    <div className="bg-background flex h-full flex-col">
      {/* Tab bar */}
      <EditorTabs
        tabs={tabs}
        activeTab={activeFilePath}
        onTabSelect={onTabSelect}
        onTabClose={onTabClose}
      />

      {/* Editor, image preview, or empty state */}
      <div className="flex-1 overflow-hidden">
        {activeFile ? (
          isImageFile(activeFile.path) ? (
            <ImagePreview key={activeFile.path} path={activeFile.path} />
          ) : (
            <MonacoEditor
              // No key prop - we reuse the editor and switch models
              path={activeFile.path}
              initialContent={activeFile.content}
              language={activeFile.language}
              onChange={(content) => onContentChange(activeFile.path, content)}
              onSave={onSave}
            />
          )
        ) : (
          <EditorEmpty />
        )}
      </div>
    </div>
  )
}
