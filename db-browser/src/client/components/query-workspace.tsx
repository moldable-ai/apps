import {
  ChevronLeft,
  ChevronRight,
  Database,
  FileSearch,
  Loader2,
  MessageSquare,
  Paintbrush,
  PanelBottom,
  PanelBottomClose,
  Play,
  RefreshCw,
  Table2,
} from 'lucide-react'
import {
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  Suspense,
  lazy,
  useState,
} from 'react'
import {
  Button,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from '@moldable-ai/ui'
import { formatSql } from '../lib/sql'
import { splitSqlStatements } from '../lib/sql-statements'
import type { ConnectionSummary } from '../../shared/types'
import { ResultGrid } from './result-grid'
import { EmptyPane } from './shared'

const SqlEditor = lazy(() =>
  import('./sql-editor').then((module) => ({ default: module.SqlEditor })),
)

export function QueryWorkspace({
  activeConnection,
  resultTitle,
  resultMeta,
  sql,
  columns,
  rows,
  selectedRowIndex,
  queryError,
  previewError,
  errorSql,
  resultLoading,
  editorHeight,
  refreshing,
  running,
  resultsPanelOpen,
  previewPagination,
  onSqlChange,
  onEditorHeightChange,
  onRunCurrent,
  onRunAll,
  onNewSqlTab,
  onRefresh,
  onOpenConnection,
  onSelectRow,
  onToggleResultsPanel,
}: {
  activeConnection: ConnectionSummary | null
  resultTitle: string
  resultMeta: string
  sql: string
  columns: string[]
  rows: Record<string, unknown>[]
  selectedRowIndex: number | null
  queryError: Error | null
  previewError: Error | null
  errorSql: string
  resultLoading: boolean
  editorHeight: number
  refreshing: boolean
  running: boolean
  resultsPanelOpen: boolean
  previewPagination: {
    offset: number
    hasMore: boolean
    loading: boolean
    onPrevious: () => void
    onNext: () => void
  } | null
  onSqlChange: (value: string) => void
  onEditorHeightChange: (height: number, persist?: boolean) => void
  onRunCurrent: (sql: string) => void
  onRunAll: (statements: string[]) => void
  onNewSqlTab: () => void
  onRefresh: () => void
  onOpenConnection: () => void
  onSelectRow: (index: number | null) => void
  onToggleResultsPanel: () => void
}) {
  const [formatting, setFormatting] = useState(false)
  const canRun = Boolean(activeConnection && !running)

  async function handleBeautifySql() {
    if (!sql.trim() || formatting) return
    setFormatting(true)
    try {
      onSqlChange(await formatSql(sql))
    } finally {
      setFormatting(false)
    }
  }

  function handleEditorResizePointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    event.preventDefault()
    const startY = event.clientY
    const startHeight = editorHeight
    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect

    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'

    function nextHeight(clientY: number) {
      return Math.max(96, Math.min(520, startHeight + clientY - startY))
    }

    function handlePointerMove(moveEvent: PointerEvent) {
      onEditorHeightChange(nextHeight(moveEvent.clientY))
    }

    function handlePointerUp(upEvent: PointerEvent) {
      onEditorHeightChange(nextHeight(upEvent.clientY), true)
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  return (
    <section className="bg-background h-full min-h-0 overflow-hidden">
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-border/70 bg-background z-10 flex h-9 shrink-0 items-center justify-between gap-3 border-b pl-3 pr-2">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-xs font-semibold">{resultTitle}</h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <ToolbarTooltip label="Beautify SQL">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="cursor-pointer"
                onClick={() => void handleBeautifySql()}
                disabled={!sql.trim() || formatting}
                aria-label="Beautify SQL"
              >
                {formatting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Paintbrush className="size-3.5" />
                )}
              </Button>
            </ToolbarTooltip>
            <ToolbarTooltip label="Refresh">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="cursor-pointer"
                onClick={onRefresh}
                disabled={!activeConnection}
                aria-label="Refresh"
              >
                <RefreshCw
                  className={refreshing ? 'size-3.5 animate-spin' : 'size-3.5'}
                />
              </Button>
            </ToolbarTooltip>
            <ToolbarTooltip label="Run">
              <Button
                type="button"
                size="icon-xs"
                className="cursor-pointer"
                onClick={() =>
                  onRunAll(
                    splitSqlStatements(sql).map((statement) => statement.sql),
                  )
                }
                disabled={!canRun}
                aria-label="Run"
              >
                {running ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Play className="size-3.5" />
                )}
              </Button>
            </ToolbarTooltip>
          </div>
        </div>

        <div
          className={cn(
            'border-border/70 bg-background z-10 flex flex-col border-b',
            resultsPanelOpen ? 'shrink-0' : 'min-h-0 flex-1',
          )}
          style={resultsPanelOpen ? { height: editorHeight } : undefined}
        >
          <div className="min-h-0 flex-1">
            <Suspense fallback={<SqlEditorSkeleton />}>
              <SqlEditor
                value={sql}
                canRun={canRun}
                onChange={onSqlChange}
                onRunCurrent={onRunCurrent}
                onRunAll={onRunAll}
                onNewSqlTab={onNewSqlTab}
              />
            </Suspense>
          </div>
          {resultsPanelOpen ? (
            <button
              type="button"
              className="bg-background group flex h-1.5 w-full cursor-row-resize items-center justify-center"
              onPointerDown={handleEditorResizePointerDown}
              aria-label="Resize SQL editor"
            >
              <span className="bg-border group-hover:bg-primary/70 h-px w-full" />
            </button>
          ) : null}
        </div>

        {resultsPanelOpen ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="border-border/70 bg-background flex h-8 shrink-0 items-center justify-between gap-3 border-b px-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-muted-foreground truncate text-xs">
                  {activeConnection ? resultMeta : 'Open a connection'}
                </span>
                <PreviewPaginationControls
                  previewPagination={previewPagination}
                />
              </div>
              <ResultsPanelToggle
                open={resultsPanelOpen}
                onToggle={onToggleResultsPanel}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <ResultSurface
                activeConnection={activeConnection}
                currentColumns={columns}
                currentRows={rows}
                selectedRowIndex={selectedRowIndex}
                queryError={queryError}
                previewError={previewError}
                errorSql={errorSql}
                loading={resultLoading}
                onOpenConnection={onOpenConnection}
                onSelectRow={onSelectRow}
              />
            </div>
          </div>
        ) : (
          <div className="border-border/70 bg-background flex h-8 shrink-0 items-center justify-end border-t px-2">
            <ResultsPanelToggle
              open={resultsPanelOpen}
              onToggle={onToggleResultsPanel}
            />
          </div>
        )}
      </div>
    </section>
  )
}

function PreviewPaginationControls({
  previewPagination,
}: {
  previewPagination: {
    offset: number
    hasMore: boolean
    loading: boolean
    onPrevious: () => void
    onNext: () => void
  } | null
}) {
  if (!previewPagination) return null

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <ToolbarTooltip label="Previous rows">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={previewPagination.onPrevious}
          disabled={previewPagination.loading || previewPagination.offset === 0}
          aria-label="Previous rows"
        >
          <ChevronLeft className="size-3.5" />
        </Button>
      </ToolbarTooltip>
      <ToolbarTooltip label="Next rows">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={previewPagination.onNext}
          disabled={previewPagination.loading || !previewPagination.hasMore}
          aria-label="Next rows"
        >
          <ChevronRight className="size-3.5" />
        </Button>
      </ToolbarTooltip>
    </div>
  )
}

function ResultsPanelToggle({
  open,
  onToggle,
  className,
}: {
  open: boolean
  onToggle: () => void
  className?: string
}) {
  return (
    <ToolbarTooltip label={open ? 'Hide results' : 'Show results'}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn(
          'text-muted-foreground hover:text-foreground cursor-pointer',
          className,
        )}
        onClick={onToggle}
        aria-label={open ? 'Hide results' : 'Show results'}
      >
        {open ? (
          <PanelBottomClose className="size-4" />
        ) : (
          <PanelBottom className="size-4" />
        )}
      </Button>
    </ToolbarTooltip>
  )
}

function SqlEditorSkeleton() {
  return (
    <div className="h-full px-5 py-3">
      <Skeleton className="mb-3 h-4 w-5/6" />
      <Skeleton className="mb-3 h-4 w-2/3" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}

function ToolbarTooltip({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

function ResultSurface({
  activeConnection,
  currentColumns,
  currentRows,
  selectedRowIndex,
  queryError,
  previewError,
  errorSql,
  loading,
  onOpenConnection,
  onSelectRow,
}: {
  activeConnection: ConnectionSummary | null
  currentColumns: string[]
  currentRows: Record<string, unknown>[]
  selectedRowIndex: number | null
  queryError: Error | null
  previewError: Error | null
  errorSql: string
  loading: boolean
  onOpenConnection: () => void
  onSelectRow: (index: number | null) => void
}) {
  if (!activeConnection) {
    return (
      <EmptyPane
        title="Open a connection"
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={onOpenConnection}
          >
            <Database className="size-4" />
            Open
          </Button>
        }
      />
    )
  }

  const error = queryError ?? previewError
  if (error) {
    return (
      <RequestFailedState
        message={error.message}
        onFixInChat={() =>
          sendSqlErrorToChat(activeConnection, errorSql, error.message)
        }
      />
    )
  }

  if (loading) {
    return <ResultSkeleton />
  }

  if (currentColumns.length === 0 && currentRows.length === 0) {
    return <ResultEmptyState />
  }

  return (
    <ResultGrid
      columns={currentColumns}
      rows={currentRows}
      selectedRowIndex={selectedRowIndex}
      onSelectRow={onSelectRow}
    />
  )
}

function RequestFailedState({
  message,
  onFixInChat,
}: {
  message: string
  onFixInChat: () => void
}) {
  return (
    <div className="flex h-full items-start overflow-y-auto px-6 pb-[var(--chat-safe-padding,0px)] pt-8 text-left">
      <div className="max-w-xl">
        <div className="flex items-center gap-3">
          <p className="text-destructive text-sm font-medium">Request failed</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 cursor-pointer rounded-full px-3 text-xs"
            onClick={onFixInChat}
          >
            <MessageSquare className="size-3.5" />
            Fix in chat
          </Button>
        </div>
        <p className="text-destructive/80 mt-3 text-xs leading-5">{message}</p>
      </div>
    </div>
  )
}

function sendSqlErrorToChat(
  connection: ConnectionSummary,
  sql: string,
  errorMessage: string,
) {
  const connectionLabel = `${connection.name} (${connection.host}:${connection.port}/${connection.database})`
  const text = [
    'Help me fix this SQL query in DB Browser.',
    '',
    `Connection: ${connectionLabel}`,
    '',
    'Error:',
    errorMessage,
    '',
    'SQL:',
    '```sql',
    sql.trim(),
    '```',
    '',
    'Please explain the issue briefly and update the current SQL editor in DB Browser with a corrected read-only query. Prefer db.sqlTabs.edit with exact oldString/newString for the smallest surgical change.',
  ].join('\n')

  window.parent.postMessage({ type: 'moldable:set-chat-input', text }, '*')
}

function ResultEmptyState() {
  const examples = [
    {
      icon: <Table2 className="size-3.5" />,
      title: 'public.users',
      meta: 'Browse a table from Objects',
    },
    {
      icon: <FileSearch className="size-3.5" />,
      title: 'select * from orders limit 100;',
      meta: 'Run a read-only query',
    },
    {
      icon: <Database className="size-3.5" />,
      title: 'Rows appear here',
      meta: 'Click a row to inspect fields',
    },
  ]

  return (
    <div className="flex h-full items-start justify-center overflow-y-auto px-6 pb-[var(--chat-safe-padding,0px)] pt-10 text-center">
      <div className="w-full max-w-md">
        <div className="mb-6 space-y-2 text-left">
          {examples.map((example) => (
            <div
              key={example.title}
              className="border-border/50 bg-muted/20 flex items-center gap-3 rounded-lg border px-3 py-2.5 opacity-55"
            >
              <span className="text-muted-foreground bg-background flex size-8 shrink-0 items-center justify-center rounded-md">
                {example.icon}
              </span>
              <span className="min-w-0">
                <span className="text-foreground block truncate font-mono text-xs">
                  {example.title}
                </span>
                <span className="text-muted-foreground block truncate text-[11px]">
                  {example.meta}
                </span>
              </span>
            </div>
          ))}
        </div>
        <p className="text-sm font-medium">No result yet</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Choose a table or run the SQL above.
        </p>
      </div>
    </div>
  )
}

function ResultSkeleton() {
  const columns = ['w-[18%]', 'w-[24%]', 'w-[34%]', 'w-[20%]']
  const rowWidths = [
    ['w-10', 'w-[72%]', 'w-[88%]', 'w-[60%]', 'w-[80%]'],
    ['w-10', 'w-[64%]', 'w-[74%]', 'w-[92%]', 'w-[68%]'],
    ['w-10', 'w-[84%]', 'w-[58%]', 'w-[76%]', 'w-[86%]'],
    ['w-10', 'w-[70%]', 'w-[82%]', 'w-[66%]', 'w-[74%]'],
    ['w-10', 'w-[78%]', 'w-[64%]', 'w-[84%]', 'w-[62%]'],
    ['w-10', 'w-[60%]', 'w-[90%]', 'w-[70%]', 'w-[78%]'],
  ]

  return (
    <div className="bg-background h-full overflow-hidden pb-[var(--chat-safe-padding,0px)]">
      <div className="border-border bg-muted/55 grid h-7 grid-cols-[44px_1fr_1fr_1.25fr_1fr] border-b">
        <div className="border-border border-r px-2 py-2">
          <Skeleton className="h-3 w-3" />
        </div>
        {columns.map((width, index) => (
          <div key={index} className="border-border border-r px-2 py-2">
            <Skeleton className={`h-3 ${width}`} />
          </div>
        ))}
      </div>
      {rowWidths.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="border-border grid h-7 grid-cols-[44px_1fr_1fr_1.25fr_1fr] border-b"
        >
          {row.map((width, cellIndex) => (
            <div key={cellIndex} className="border-border border-r px-2 py-2">
              <Skeleton className={`h-3 ${width}`} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
