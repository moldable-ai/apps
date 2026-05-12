import { BarChart3, Code2, FolderTree } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from '@moldable-ai/ui'
import type {
  ConnectionSummary,
  Dashboard,
  ExplorerSchema,
  SqlEditorTab,
} from '../../shared/types'
import type { SelectedTable } from '../types'
import { DashboardBrowser } from './dashboard-browser'
import { ObjectBrowser } from './object-browser'
import { SqlWorkspaceBrowser } from './sql-workspace-browser'

export type SidebarMode = 'objects' | 'dashboards' | 'sql'

export function ConnectionSidebar({
  mode,
  activeConnection,
  schemas,
  selectedSchema,
  objectSearch,
  objectsLoading,
  objectsFetching,
  objectsError,
  selectedTable,
  dashboards,
  activeDashboardId,
  sqlTabs,
  activeSqlTabId,
  dashboardsLoading,
  sqlWorkspaceLoading,
  onModeChange,
  onObjectSearchChange,
  onSchemaChange,
  onRefreshObjects,
  onSelectTable,
  onSelectDashboard,
  onNewDashboard,
  onDeleteDashboard,
  onRenameDashboard,
  onReorderDashboards,
  onSelectSqlTab,
  onNewSqlTab,
  onCloseSqlTab,
  onRenameSqlTab,
  onReorderSqlTabs,
}: {
  mode: SidebarMode
  activeConnection: ConnectionSummary | null
  schemas: ExplorerSchema[]
  selectedSchema: string
  objectSearch: string
  objectsLoading: boolean
  objectsFetching: boolean
  objectsError: Error | null
  selectedTable: SelectedTable | null
  dashboards: Dashboard[]
  activeDashboardId: string | null
  sqlTabs: SqlEditorTab[]
  activeSqlTabId: string | null
  dashboardsLoading: boolean
  sqlWorkspaceLoading: boolean
  onModeChange: (mode: SidebarMode) => void
  onObjectSearchChange: (value: string) => void
  onSchemaChange: (schema: string) => void
  onRefreshObjects: () => void
  onSelectTable: (schema: string, table: string) => void
  onSelectDashboard: (dashboardId: string) => void
  onNewDashboard: () => void
  onDeleteDashboard: (dashboardId: string) => void
  onRenameDashboard: (dashboardId: string, title: string) => void
  onReorderDashboards: (dashboards: Dashboard[]) => void
  onSelectSqlTab: (tabId: string) => void
  onNewSqlTab: () => void
  onCloseSqlTab: (tabId: string) => void
  onRenameSqlTab: (tabId: string, title: string) => void
  onReorderSqlTabs: (tabs: SqlEditorTab[]) => void
}) {
  return (
    <aside className="bg-background h-full min-h-0 min-w-0 overflow-hidden">
      <div className="flex h-full min-h-0 min-w-0 flex-col">
        <SidebarModeTabs mode={mode} onModeChange={onModeChange} />
        <div className="min-h-0 flex-1 px-3 pt-3">
          {mode === 'objects' ? (
            <ObjectBrowser
              activeConnection={activeConnection}
              schemas={schemas}
              selectedSchema={selectedSchema}
              search={objectSearch}
              loading={objectsLoading}
              fetching={objectsFetching}
              error={objectsError}
              selectedTable={selectedTable}
              onSearchChange={onObjectSearchChange}
              onSchemaChange={onSchemaChange}
              onRetry={onRefreshObjects}
              onSelectTable={onSelectTable}
            />
          ) : mode === 'dashboards' ? (
            <DashboardBrowser
              activeConnection={activeConnection}
              dashboards={dashboards}
              activeDashboardId={activeDashboardId}
              loading={dashboardsLoading}
              onSelect={onSelectDashboard}
              onNew={onNewDashboard}
              onDelete={onDeleteDashboard}
              onRename={onRenameDashboard}
              onReorder={onReorderDashboards}
            />
          ) : (
            <SqlWorkspaceBrowser
              activeConnection={activeConnection}
              tabs={sqlTabs}
              activeTabId={activeSqlTabId}
              loading={sqlWorkspaceLoading}
              onSelect={onSelectSqlTab}
              onNew={onNewSqlTab}
              onClose={onCloseSqlTab}
              onRename={onRenameSqlTab}
              onReorder={onReorderSqlTabs}
            />
          )}
        </div>
      </div>
    </aside>
  )
}

function SidebarModeTabs({
  mode,
  onModeChange,
}: {
  mode: SidebarMode
  onModeChange: (mode: SidebarMode) => void
}) {
  return (
    <div className="border-border/70 flex h-9 shrink-0 items-center gap-1 border-b px-2.5">
      <ModeButton
        active={mode === 'objects'}
        label="Objects"
        onClick={() => onModeChange('objects')}
      >
        <FolderTree className="size-3.5" />
      </ModeButton>
      <ModeButton
        active={mode === 'dashboards'}
        label="Dashboards"
        onClick={() => onModeChange('dashboards')}
      >
        <BarChart3 className="size-3.5" />
      </ModeButton>
      <ModeButton
        active={mode === 'sql'}
        label="SQL Queries"
        onClick={() => onModeChange('sql')}
      >
        <Code2 className="size-3.5" />
      </ModeButton>
    </div>
  )
}

function ModeButton({
  active,
  label,
  children,
  onClick,
}: {
  active: boolean
  label: string
  children: ReactNode
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn(
            'text-muted-foreground hover:text-foreground size-7 cursor-pointer opacity-55 hover:opacity-85',
            active &&
              'bg-muted text-foreground hover:bg-muted opacity-100 hover:opacity-100',
          )}
          onClick={onClick}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}
