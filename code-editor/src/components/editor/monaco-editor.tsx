'use client'

import Editor, { type Monaco } from '@monaco-editor/react'
import { useCallback, useEffect, useRef } from 'react'
import { Spinner, useTheme } from '@moldable-ai/ui'
import { modelManager } from '@/lib/monaco-model-manager'
import type { editor } from 'monaco-editor'

interface MonacoEditorProps {
  path: string
  initialContent: string
  language: string
  onChange?: (value: string) => void
  onSave?: () => void
  readOnly?: boolean
}

export function MonacoEditor({
  path,
  initialContent,
  language,
  onChange,
  onSave,
  readOnly = false,
}: MonacoEditorProps) {
  const { resolvedTheme } = useTheme()
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)

  // Use refs to always have the latest callbacks
  // This avoids stale closure issues with Monaco's addCommand
  const onSaveRef = useRef(onSave)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Completely disable all TypeScript/JavaScript diagnostics
  // We only want syntax highlighting, not error checking
  const handleBeforeMount = useCallback((monaco: Monaco) => {
    const diagnosticsOff = {
      noSemanticValidation: true,
      noSyntaxValidation: true,
    }
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(
      diagnosticsOff,
    )
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions(
      diagnosticsOff,
    )

    // Store monaco instance for model manager
    monacoRef.current = monaco
    modelManager.setMonaco(monaco)
  }, [])

  const handleMount = useCallback(
    (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
      editorRef.current = editor

      // Get or create the model for this file
      const model = modelManager.getOrCreateModel(
        path,
        initialContent,
        language,
      )
      editor.setModel(model)

      // Listen for content changes
      const disposable = model.onDidChangeContent(() => {
        onChangeRef.current?.(model.getValue())
      })

      // Cmd+S to save - use ref to always get the latest onSave
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        onSaveRef.current?.()
      })

      // Focus the editor
      editor.focus()

      // Cleanup listener when editor unmounts
      return () => {
        disposable.dispose()
      }
    },
    [path, initialContent, language],
  )

  // When the path changes, switch to the appropriate model
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco) return

    // Get or create model for the new path
    const model = modelManager.getOrCreateModel(path, initialContent, language)

    // Only set if different from current model
    if (editor.getModel() !== model) {
      editor.setModel(model)

      // Set up change listener for the new model
      const disposable = model.onDidChangeContent(() => {
        onChangeRef.current?.(model.getValue())
      })

      return () => {
        disposable.dispose()
      }
    }
  }, [path, initialContent, language])

  return (
    <Editor
      height="100%"
      // Don't pass value/language - we manage the model ourselves
      theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light'}
      beforeMount={handleBeforeMount}
      onMount={handleMount}
      loading={
        <div className="flex h-full items-center justify-center">
          <Spinner className="size-6" />
        </div>
      }
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        automaticLayout: true,
        tabSize: 2,
        padding: { top: 12, bottom: 12 },
        renderLineHighlight: 'line',
        cursorBlinking: 'smooth',
        smoothScrolling: true,
        bracketPairColorization: { enabled: true },
        guides: {
          bracketPairs: true,
          indentation: true,
        },
      }}
    />
  )
}
