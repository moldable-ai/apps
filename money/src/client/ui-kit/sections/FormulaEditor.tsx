import Editor, { type Monaco } from '@monaco-editor/react'
import { useCallback, useRef, useState } from 'react'
import { Spinner, useTheme, useWorkspace } from '@moldable-ai/ui'
import type { Position, editor, languages } from 'monaco-editor'

/**
 * A Monaco-based money-formula editor: real tokenization + a completion provider
 * wired to the backend's context-aware `POST /api/formulas/complete` (valid next
 * methods, field arguments, enum values), themed to match the app. Drop-in for
 * the hand-rolled `FormulaInput` (same value/onChange/onRun contract).
 *
 * Monaco is lazy-loaded from CDN by `@monaco-editor/react` (as in the DB Browser
 * app), so it adds ~nothing to the initial bundle and only loads when an editor
 * mounts.
 */

interface FormulaEditorProps {
  value: string
  onChange: (next: string) => void
  onRun: () => void
  placeholder?: string
}

const LANGUAGE_ID = 'moneyFormula'

// Known domain functions, for keyword coloring in the tokenizer.
const FUNCTIONS = [
  'Runway',
  'SavingsRate',
  'ChangeVs',
  'DebtPayoff',
  'FreedomAge',
  'Forecast',
  'ForecastScenario',
  'CreditUtilization',
  'AllocationDrift',
  'ContributionRoom',
  'InterestDrag',
]

/**
 * The completion provider is registered once on the shared monaco instance, so
 * it can't close over React state. This holder lets the live component feed the
 * workspace-scoped fetch to the provider.
 */
const providerState: {
  fetchComplete:
    | ((formula: string, cursor: number) => Promise<CompleteResponse | null>)
    | null
} = { fetchComplete: null }

interface CompleteItem {
  label: string
  kind: string
  insert: string
  detail?: string
  signature?: string
  replaceRange?: { start: number; end: number }
}
interface CompleteResponse {
  context?: string
  completions: CompleteItem[]
}

let registered = false

function registerMoneyFormula(monaco: Monaco) {
  if (registered) return
  registered = true

  monaco.languages.register({ id: LANGUAGE_ID })

  monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, {
    functions: FUNCTIONS,
    tokenizer: {
      root: [
        // duration literals: 6mo, 45d, 1y, 3w
        [/\d+(?:mo|d|w|y)\b/, 'number.duration'],
        [/\d+(?:\.\d+)?/, 'number'],
        // dates 2026-01-01
        [/\d{4}-\d{2}-\d{2}/, 'number'],
        [/"[^"]*"/, 'string'],
        [/'[^']*'/, 'string'],
        // .method(  → function
        [/\.([A-Za-z_]\w*)/, 'function'],
        // Known domain functions / Capitalized collections
        [
          /[A-Z]\w*/,
          { cases: { '@functions': 'keyword', '@default': 'type' } },
        ],
        [/[a-z_]\w*/, 'identifier'],
        [/[=<>!+\-*/]+/, 'operator'],
        [/[(),.]/, 'delimiter'],
      ],
    },
  } as languages.IMonarchLanguage)

  function defineTheme(
    name: string,
    base: 'vs' | 'vs-dark',
    bg: string,
    fg: string,
  ) {
    monaco.editor.defineTheme(name, {
      base,
      inherit: true,
      rules: [
        { token: 'type', foreground: 'f97316' }, // collections — brand orange
        { token: 'keyword', foreground: 'a855f7' }, // domain functions — violet
        { token: 'function', foreground: '38bdf8' }, // methods — sky
        { token: 'number', foreground: '22c55e' },
        { token: 'number.duration', foreground: '22c55e' },
        { token: 'string', foreground: 'eab308' },
        {
          token: 'operator',
          foreground: base === 'vs-dark' ? 'a1a1aa' : '71717a',
        },
      ],
      colors: {
        'editor.background': bg,
        'editor.foreground': fg,
        'editorCursor.foreground': '#f97316',
        'editor.lineHighlightBackground': '#00000000',
        'editorLineNumber.foreground': '#71717a',
      },
    })
  }
  defineTheme('money-formula-dark', 'vs-dark', '#00000000', '#f4f4f5')
  defineTheme('money-formula-light', 'vs', '#00000000', '#18181b')

  const kindMap: Record<string, languages.CompletionItemKind> = {
    collection: monaco.languages.CompletionItemKind.Class,
    method: monaco.languages.CompletionItemKind.Method,
    function: monaco.languages.CompletionItemKind.Function,
    field: monaco.languages.CompletionItemKind.Field,
    enum: monaco.languages.CompletionItemKind.EnumMember,
    keyword: monaco.languages.CompletionItemKind.Keyword,
  }

  monaco.languages.registerCompletionItemProvider(LANGUAGE_ID, {
    triggerCharacters: ['.', '(', ' ', ',', '='],
    async provideCompletionItems(model: editor.ITextModel, position: Position) {
      const fetchComplete = providerState.fetchComplete
      if (!fetchComplete) return { suggestions: [] }
      const formula = model.getValue()
      const cursor = model.getOffsetAt(position)
      const res = await fetchComplete(formula, cursor).catch(() => null)
      if (!res) return { suggestions: [] }

      const word = model.getWordUntilPosition(position)
      const suggestions: languages.CompletionItem[] = res.completions.map(
        (c) => {
          const range = c.replaceRange
            ? {
                startLineNumber: model.getPositionAt(c.replaceRange.start)
                  .lineNumber,
                startColumn: model.getPositionAt(c.replaceRange.start).column,
                endLineNumber: model.getPositionAt(c.replaceRange.end)
                  .lineNumber,
                endColumn: model.getPositionAt(c.replaceRange.end).column,
              }
            : {
                startLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endLineNumber: position.lineNumber,
                endColumn: word.endColumn,
              }
          return {
            label: c.label,
            kind: kindMap[c.kind] ?? monaco.languages.CompletionItemKind.Text,
            insertText: c.insert,
            detail: c.detail,
            documentation: c.signature,
            range,
          }
        },
      )
      return { suggestions }
    },
  })
}

export function FormulaEditor({
  value,
  onChange,
  onRun,
  placeholder,
}: FormulaEditorProps) {
  const { resolvedTheme } = useTheme()
  const { fetchWithWorkspace } = useWorkspace()
  const onRunRef = useRef(onRun)
  onRunRef.current = onRun
  const [height, setHeight] = useState(60)

  // Feed the latest workspace fetch to the singleton completion provider.
  providerState.fetchComplete = useCallback(
    async (formula: string, cursor: number) => {
      const res = await fetchWithWorkspace('/api/formulas/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formula, cursor }),
      })
      if (!res.ok) return null
      return (await res.json()) as CompleteResponse
    },
    [fetchWithWorkspace],
  )

  const theme =
    resolvedTheme === 'dark' ? 'money-formula-dark' : 'money-formula-light'

  const handleMount = useCallback(
    (ed: editor.IStandaloneCodeEditor, monaco: Monaco) => {
      ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () =>
        onRunRef.current(),
      )
      const apply = () =>
        setHeight(Math.min(220, Math.max(60, ed.getContentHeight())))
      ed.onDidContentSizeChange(apply)
      apply()
    },
    [],
  )

  return (
    <div className="relative" style={{ height }}>
      {!value ? (
        <div className="text-muted-foreground pointer-events-none absolute left-3 top-[11px] z-10 font-mono text-sm">
          {placeholder}
        </div>
      ) : null}
      <Editor
        height={height}
        language={LANGUAGE_ID}
        theme={theme}
        value={value}
        beforeMount={registerMoneyFormula}
        onMount={handleMount}
        onChange={(next) => onChange(next ?? '')}
        loading={<Spinner className="text-muted-foreground size-4" />}
        options={{
          automaticLayout: true,
          minimap: { enabled: false },
          lineNumbers: 'off',
          glyphMargin: false,
          folding: false,
          lineDecorationsWidth: 0,
          lineNumbersMinChars: 0,
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          scrollbar: {
            vertical: 'hidden',
            horizontal: 'hidden',
            alwaysConsumeMouseWheel: false,
          },
          scrollBeyondLastLine: false,
          renderLineHighlight: 'none',
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          fontSize: 13,
          padding: { top: 10, bottom: 10 },
          wordWrap: 'on',
          contextmenu: false,
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          fixedOverflowWidgets: true,
        }}
      />
    </div>
  )
}
