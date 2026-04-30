import Editor, { type Monaco } from '@monaco-editor/react'
import { useCallback, useMemo, useRef } from 'react'
import { Spinner, useTheme } from '@moldable-ai/ui'
import {
  getSqlStatementAtOffset,
  splitSqlStatements,
} from '../lib/sql-statements'
import type { editor } from 'monaco-editor'

interface SqlEditorProps {
  value: string
  canRun: boolean
  onChange: (value: string) => void
  onRunCurrent: (sql: string) => void
  onRunAll: (statements: string[]) => void
  onNewSqlTab: () => void
}

export function SqlEditor({
  value,
  canRun,
  onChange,
  onRunCurrent,
  onRunAll,
  onNewSqlTab,
}: SqlEditorProps) {
  const { resolvedTheme } = useTheme()
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const canRunRef = useRef(canRun)
  const onRunCurrentRef = useRef(onRunCurrent)
  const onRunAllRef = useRef(onRunAll)
  const onNewSqlTabRef = useRef(onNewSqlTab)

  canRunRef.current = canRun
  onRunCurrentRef.current = onRunCurrent
  onRunAllRef.current = onRunAll
  onNewSqlTabRef.current = onNewSqlTab

  const theme =
    resolvedTheme === 'dark' ? 'moldable-db-dark' : 'moldable-db-light'

  const handleBeforeMount = useCallback((monaco: Monaco) => {
    monaco.editor.defineTheme('moldable-db-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#181818',
        'editor.foreground': '#f4f4f5',
        'editorLineNumber.foreground': '#71717a',
        'editorCursor.foreground': '#f97316',
        'editor.lineHighlightBackground': '#27272a66',
        'editor.selectionBackground': '#f973163d',
        'editor.inactiveSelectionBackground': '#71717a33',
      },
    })

    monaco.editor.defineTheme('moldable-db-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#fafafa',
        'editor.foreground': '#18181b',
        'editorLineNumber.foreground': '#a1a1aa',
        'editorCursor.foreground': '#f97316',
        'editor.lineHighlightBackground': '#e4e4e766',
        'editor.selectionBackground': '#f9731633',
        'editor.inactiveSelectionBackground': '#a1a1aa33',
      },
    })
  }, [])

  const handleMount = useCallback(
    (mountedEditor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
      editorRef.current = mountedEditor

      mountedEditor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        () => {
          if (canRunRef.current) {
            const model = mountedEditor.getModel()
            const position = mountedEditor.getPosition()
            if (!model || !position) return

            const offset = model.getOffsetAt(position)
            const statement = getSqlStatementAtOffset(model.getValue(), offset)
            if (statement) onRunCurrentRef.current(statement)
          }
        },
      )
      mountedEditor.addCommand(
        monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        () => {
          if (canRunRef.current) {
            const model = mountedEditor.getModel()
            if (!model) return

            const statements = splitSqlStatements(model.getValue()).map(
              (statement) => statement.sql,
            )
            if (statements.length > 0) onRunAllRef.current(statements)
          }
        },
      )
      mountedEditor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN,
        () => {
          onNewSqlTabRef.current()
        },
      )
      mountedEditor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyT,
        () => {
          onNewSqlTabRef.current()
        },
      )

      mountedEditor.focus()
    },
    [],
  )

  const options = useMemo<editor.IStandaloneEditorConstructionOptions>(
    () => ({
      acceptSuggestionOnCommitCharacter: true,
      automaticLayout: true,
      bracketPairColorization: { enabled: true },
      contextmenu: true,
      cursorBlinking: 'smooth',
      fontFamily:
        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
      fontSize: 13,
      folding: false,
      glyphMargin: false,
      guides: {
        bracketPairs: true,
        indentation: false,
      },
      lineDecorationsWidth: 22,
      lineNumbers: 'on',
      lineNumbersMinChars: 4,
      minimap: { enabled: false },
      overviewRulerBorder: false,
      padding: { top: 12, bottom: 12 },
      renderLineHighlight: 'line',
      roundedSelection: false,
      scrollbar: {
        alwaysConsumeMouseWheel: false,
        horizontal: 'auto',
        vertical: 'auto',
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
      },
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      tabSize: 2,
      wordWrap: 'on',
    }),
    [],
  )

  return (
    <Editor
      height="100%"
      language="sql"
      theme={theme}
      value={value}
      beforeMount={handleBeforeMount}
      onMount={handleMount}
      onChange={(nextValue) => onChange(nextValue ?? '')}
      loading={
        <div className="bg-background flex h-full items-center justify-center">
          <Spinner className="text-muted-foreground size-5" />
        </div>
      }
      options={options}
    />
  )
}
