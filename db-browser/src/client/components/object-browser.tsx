import { Database, Eye, RefreshCw, Search, Table2 } from 'lucide-react'
import { useState } from 'react'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from '@moldable-ai/ui'
import type { ConnectionSummary, ExplorerSchema } from '../../shared/types'
import type { SelectedTable } from '../types'
import { QuietState } from './shared'

export function ObjectBrowser({
  activeConnection,
  schemas,
  selectedSchema,
  search,
  loading,
  fetching,
  error,
  selectedTable,
  onSearchChange,
  onSchemaChange,
  onRetry,
  onSelectTable,
}: {
  activeConnection: ConnectionSummary | null
  schemas: ExplorerSchema[]
  selectedSchema: string
  search: string
  loading: boolean
  fetching: boolean
  error: Error | null
  selectedTable: SelectedTable | null
  onSearchChange: (value: string) => void
  onSchemaChange: (schema: string) => void
  onRetry: () => void
  onSelectTable: (schema: string, table: string) => void
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const currentSchema =
    schemas.find((schema) => schema.name === selectedSchema) ??
    schemas[0] ??
    null
  const needle = search.trim().toLowerCase()
  const visibleTables = currentSchema
    ? currentSchema.tables.filter((table) =>
        needle ? table.name.toLowerCase().includes(needle) : true,
      )
    : []

  const showControls =
    Boolean(activeConnection) && !loading && !error && schemas.length > 0
  const showSearch = searchOpen || search.trim().length > 0

  return (
    <section className="flex h-full min-h-0 flex-col">
      {showControls ? (
        <div className="border-border/60 bg-background shrink-0 border-b pb-3">
          <ObjectBrowserControls
            schemas={schemas}
            currentSchema={currentSchema}
            selectedSchema={selectedSchema}
            search={search}
            searchOpen={showSearch}
            fetching={fetching}
            onSchemaChange={onSchemaChange}
            onSearchChange={onSearchChange}
            onToggleSearch={() => setSearchOpen((current) => !current)}
            onRetry={onRetry}
          />
        </div>
      ) : null}

      <div className="db-browser-hide-scrollbar min-h-0 flex-1 overflow-y-auto pb-[calc(var(--chat-safe-padding,0px)+1rem)] pt-3">
        <ObjectBrowserContent
          activeConnection={activeConnection}
          currentSchema={currentSchema}
          visibleTables={visibleTables}
          selectedTable={selectedTable}
          loading={loading}
          error={error}
          onRetry={onRetry}
          onSelectTable={onSelectTable}
        />
      </div>
    </section>
  )
}

function ObjectBrowserControls({
  schemas,
  currentSchema,
  selectedSchema,
  search,
  searchOpen,
  fetching,
  onSchemaChange,
  onSearchChange,
  onToggleSearch,
  onRetry,
}: {
  schemas: ExplorerSchema[]
  currentSchema: ExplorerSchema | null
  selectedSchema: string
  search: string
  searchOpen: boolean
  fetching: boolean
  onSchemaChange: (schema: string) => void
  onSearchChange: (value: string) => void
  onToggleSearch: () => void
  onRetry: () => void
}) {
  return (
    <div className="space-y-2">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1.5">
        <Select
          value={selectedSchema || currentSchema?.name}
          onValueChange={onSchemaChange}
        >
          <SelectTrigger
            className="bg-muted/20 h-8 w-full min-w-0 text-sm shadow-none"
            size="sm"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Database className="text-muted-foreground size-3.5 shrink-0" />
              <SelectValue placeholder="Select schema" />
            </div>
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {schemas.map((schema) => (
              <SelectItem key={schema.name} value={schema.name}>
                {schema.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className={cn(
                'text-muted-foreground cursor-pointer',
                searchOpen && 'bg-muted text-foreground',
              )}
              onClick={onToggleSearch}
              aria-label="Toggle table search"
              aria-pressed={searchOpen}
            >
              <Search className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Search tables</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground cursor-pointer"
              onClick={onRetry}
              aria-label="Refresh objects"
            >
              <RefreshCw
                className={cn('size-3.5', fetching && 'animate-spin')}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Refresh objects</TooltipContent>
        </Tooltip>
      </div>

      {searchOpen ? (
        <div className="relative">
          <Search className="text-muted-foreground absolute left-2.5 top-2 size-3.5" />
          <Input
            className="h-8 pl-8 text-sm"
            placeholder="Search tables"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      ) : null}
    </div>
  )
}

function ObjectBrowserContent({
  activeConnection,
  currentSchema,
  visibleTables,
  selectedTable,
  loading,
  error,
  onRetry,
  onSelectTable,
}: {
  activeConnection: ConnectionSummary | null
  currentSchema: ExplorerSchema | null
  visibleTables: ExplorerSchema['tables']
  selectedTable: SelectedTable | null
  loading: boolean
  error: Error | null
  onRetry: () => void
  onSelectTable: (schema: string, table: string) => void
}) {
  if (!activeConnection) {
    return <QuietState title="Choose a connection" />
  }

  if (loading) {
    return <ObjectBrowserSkeleton />
  }

  if (error) {
    return (
      <QuietState
        title="Objects unavailable"
        description={error.message}
        action={
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="mt-2 cursor-pointer"
            onClick={onRetry}
          >
            <RefreshCw className="size-3" />
            Retry
          </Button>
        }
      />
    )
  }

  if (!currentSchema) {
    return <QuietState title="No schemas found" />
  }

  if (visibleTables.length === 0) {
    return <QuietState title="No matching tables" />
  }

  return (
    <div className="border-border/70 bg-muted/25 dark:bg-muted/15 overflow-hidden rounded-2xl border">
      {visibleTables.map((table, index) => {
        const isSelected =
          selectedTable?.schema === currentSchema.name &&
          selectedTable.table === table.name

        return (
          <button
            key={`${currentSchema.name}.${table.name}`}
            type="button"
            title={`${currentSchema.name}.${table.name}`}
            className={cn(
              'group grid w-full min-w-0 cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors',
              isSelected ? 'bg-background' : 'hover:bg-background/70',
            )}
            onClick={() => onSelectTable(currentSchema.name, table.name)}
          >
            {table.type === 'VIEW' ? (
              <Eye
                className="text-muted-foreground size-3.5"
                aria-label="View"
              />
            ) : (
              <Table2
                className="text-muted-foreground size-3.5"
                aria-label="Table"
              />
            )}
            <span className="min-w-0 truncate font-mono text-[12px]">
              {table.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function ObjectBrowserSkeleton() {
  const rows = ['w-32', 'w-44', 'w-40', 'w-36', 'w-48', 'w-28', 'w-40', 'w-32']

  return (
    <div className="space-y-3" aria-label="Loading objects">
      <div className="space-y-2">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1.5">
          <Skeleton className="h-8 rounded-lg" />
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className="size-7 rounded-md" />
        </div>
        <Skeleton className="h-8 rounded-lg" />
      </div>

      <div className="border-border/70 bg-muted/25 dark:bg-muted/15 overflow-hidden rounded-2xl border">
        {rows.map((width, index) => (
          <div
            key={`${width}-${index}`}
            className={cn(
              'grid h-[37px] grid-cols-[auto_minmax(0,1fr)] items-center gap-2 px-3',
              index < rows.length - 1 && 'border-border/60 border-b',
            )}
          >
            <Skeleton className="size-3.5 rounded-sm" />
            <Skeleton className={cn('h-3 rounded-sm', width)} />
          </div>
        ))}
      </div>
    </div>
  )
}
