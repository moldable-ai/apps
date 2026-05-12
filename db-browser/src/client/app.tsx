import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Download,
  History,
  MoreVertical,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  PanelRightClose,
  Pencil,
  Plus,
  Settings,
  Upload,
} from 'lucide-react'
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  type AppCommand,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useMoldableAppCommands,
  useMoldableCommands,
  useWorkspace,
} from '@moldable-ai/ui'
import { apiJson } from './lib/api'
import {
  createDashboard,
  displayDashboardTitle,
  normalizeDashboardWorkspace,
  renameDashboard,
  updateDashboardCharts,
  updateDashboardDescription,
} from './lib/dashboards'
import {
  DEFAULT_SQL,
  PREVIEW_LIMIT,
  blankConnectionForm,
  buildPostgresConnectionUrl,
  connectionPayload,
  quoteIdentifier,
} from './lib/sql'
import {
  createSqlTab,
  displaySqlTabTitle,
  normalizeSqlWorkspace,
  renameSqlTab,
  updateSqlTab,
} from './lib/sql-tabs'
import { ConnectionFormDialog } from './components/connection-form-dialog'
import {
  ConnectionSidebar,
  type SidebarMode,
} from './components/connection-sidebar'
import { ConnectionSwitch } from './components/connection-switch'
import { DashboardWorkspace } from './components/dashboard-workspace'
import {
  type ExportFormat,
  ExportQueryDialog,
  ImportRowsDialog,
  type ImportRowsPayload,
} from './components/data-transfer-dialogs'
import { DbBrowserSettingsDialog } from './components/db-browser-settings-dialog'
import { QueryHistoryDialog } from './components/query-history-dialog'
import { QueryWorkspace } from './components/query-workspace'
import { RowDetails, RowDetailsEmpty } from './components/row-details'
import type {
  ConnectionSummary,
  ConnectionTestResponse,
  Dashboard,
  DashboardChart,
  DashboardWorkspaceResponse,
  DbBrowserPreferences,
  ExplorerSchema,
  ImportRowsResponse,
  QueryExportResponse,
  QueryHistoryItem,
  QueryResultResponse,
  SqlEditorTab,
  SqlWorkspaceResponse,
  TablePreviewResponse,
} from '../shared/types'
import type { ActivityEntry, ConnectionFormState, SelectedTable } from './types'

const DEFAULT_SQL_EDITOR_HEIGHT = 128
const MIN_SQL_EDITOR_HEIGHT = 96
const MAX_SQL_EDITOR_HEIGHT = 520
const SQL_QUERY_COMMAND_LIMIT = 10

function buildActivity(message: string, detail?: string): ActivityEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message,
    detail,
    timestamp: new Date().toISOString(),
  }
}

function previewSql(schema: string, table: string, offset: number) {
  const base = `select * from ${quoteIdentifier(schema)}.${quoteIdentifier(table)} limit ${PREVIEW_LIMIT}`
  return offset > 0 ? `${base} offset ${offset};` : `${base};`
}

function downloadExport(
  filename: string,
  format: ExportFormat,
  content: string,
) {
  const type =
    format === 'csv'
      ? 'text/csv;charset=utf-8'
      : 'application/x-ndjson;charset=utf-8'
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest(
      'input, textarea, select, button, [contenteditable="true"], [role="textbox"]',
    ),
  )
}

function connectionFormFromSummary(
  connection: ConnectionSummary,
): ConnectionFormState {
  const form = {
    connectionUrl: '',
    name: connection.name,
    host: connection.host,
    port: String(connection.port),
    database: connection.database,
    user: connection.user,
    password: '',
    ssl: connection.ssl,
    color: connection.color,
    environment: connection.environment,
    policyMode: connection.policyMode,
  }

  return {
    ...form,
    connectionUrl: buildPostgresConnectionUrl(form),
  }
}

export function App() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  const [objectSearch, setObjectSearch] = useState('')
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('objects')
  const [showNewConnectionDialog, setShowNewConnectionDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(
    null,
  )
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [connectionForm, setConnectionForm] = useState<ConnectionFormState>(
    blankConnectionForm(),
  )
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(
    null,
  )
  const [selectedSchema, setSelectedSchema] = useState('')
  const [selectedTable, setSelectedTable] = useState<SelectedTable | null>(null)
  const [previewOffset, setPreviewOffset] = useState(0)
  const [sqlEditorHeight, setSqlEditorHeight] = useState(
    DEFAULT_SQL_EDITOR_HEIGHT,
  )
  const [sqlTabs, setSqlTabs] = useState<SqlEditorTab[]>([])
  const [activeSqlTabId, setActiveSqlTabId] = useState<string | null>(null)
  const [loadedSqlWorkspaceConnectionId, setLoadedSqlWorkspaceConnectionId] =
    useState<string | null>(null)
  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [activeDashboardId, setActiveDashboardId] = useState<string | null>(
    null,
  )
  const [loadedDashboardConnectionId, setLoadedDashboardConnectionId] =
    useState<string | null>(null)
  const [queryResult, setQueryResult] = useState<QueryResultResponse | null>(
    null,
  )
  const [resultMode, setResultMode] = useState<'query' | 'preview'>('query')
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [resultsPanelOpen, setResultsPanelOpen] = useState(true)
  const [, setActivityLog] = useState<ActivityEntry[]>([])

  const connectionsQuery = useQuery({
    queryKey: ['db-browser-connections', workspaceId],
    queryFn: async () => {
      return apiJson<ConnectionSummary[]>(
        fetchWithWorkspace,
        '/api/connections',
      )
    },
  })

  const connections = useMemo(
    () => connectionsQuery.data ?? [],
    [connectionsQuery.data],
  )

  const preferencesQuery = useQuery({
    queryKey: ['db-browser-preferences', workspaceId],
    queryFn: async () => {
      return apiJson<DbBrowserPreferences>(
        fetchWithWorkspace,
        '/api/preferences',
      )
    },
  })

  const savePreferencesMutation = useMutation({
    mutationFn: async (preferences: Partial<DbBrowserPreferences>) => {
      return apiJson<DbBrowserPreferences>(
        fetchWithWorkspace,
        '/api/preferences',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(preferences),
        },
      )
    },
    onSuccess: (preferences) => {
      queryClient.setQueryData(
        ['db-browser-preferences', workspaceId],
        preferences,
      )
      void queryClient.invalidateQueries({
        queryKey: ['db-browser-explorer', workspaceId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['db-browser-preview', workspaceId],
      })
    },
  })
  const savePreferences = savePreferencesMutation.mutate

  const persistActiveConnectionId = useCallback(
    (connectionId: string) => {
      queryClient.setQueryData<DbBrowserPreferences>(
        ['db-browser-preferences', workspaceId],
        (current) => ({
          sqlEditorHeight: current?.sqlEditorHeight ?? sqlEditorHeight,
          activeConnectionId: connectionId,
          queryTimeoutMs: current?.queryTimeoutMs ?? 5000,
        }),
      )
      savePreferences({ activeConnectionId: connectionId })
    },
    [queryClient, savePreferences, sqlEditorHeight, workspaceId],
  )

  useEffect(() => {
    if (preferencesQuery.data) {
      setSqlEditorHeight(preferencesQuery.data.sqlEditorHeight)
    }
  }, [preferencesQuery.data])

  const activeConnection = useMemo(
    () =>
      connections.find((connection) => connection.id === activeConnectionId) ??
      null,
    [connections, activeConnectionId],
  )

  useEffect(() => {
    const activeContext = activeConnection
      ? `Active connection: ${activeConnection.name} (${activeConnection.engine}, ${activeConnection.host}:${activeConnection.port}/${activeConnection.database}, policy: ${activeConnection.policyMode}). Connection id: ${activeConnection.id}.`
      : 'No database connection is currently selected.'

    window.parent.postMessage(
      {
        type: 'moldable:set-chat-instructions',
        text: `DB Browser can help write database queries and analytics dashboards through app-owned APIs. Use listMoldableAppApi/callMoldableAppApi with the database-generic db.* methods exposed by this app. Prefer reading schema context first. When fixing existing SQL, prefer db.sqlTabs.edit with exact oldString/newString for surgical edits in the active editor; use db.sqlTabs.update only when a whole-tab rewrite is explicitly appropriate. For analytics views, use db.dashboards.* and db.dashboardCharts.* so dashboards and chart-backed read-only SQL are saved in the app. Dashboard/chart methods accept unique dashboardName and chartName as well as ids; prefer names when the user references visible titles, and use db.dashboardCharts.edit for surgical SQL changes. Only run db.query.runReadonly when the user explicitly asks to execute a read-only query. Do not run writes, admin commands, imports, exports, or transaction workflows through Chat. ${activeContext}`,
      },
      '*',
    )
  }, [activeConnection])

  useEffect(() => {
    setSqlTabs([])
    setActiveSqlTabId(null)
    setLoadedSqlWorkspaceConnectionId(null)
    setDashboards([])
    setActiveDashboardId(null)
    setLoadedDashboardConnectionId(null)
  }, [activeConnectionId])

  useEffect(() => {
    if (connections.length === 0) {
      setActiveConnectionId(null)
      return
    }

    const preferredConnectionId = preferencesQuery.data?.activeConnectionId
    const preferredConnection = preferredConnectionId
      ? connections.find(
          (connection) => connection.id === preferredConnectionId,
        )
      : null

    if (preferredConnection && preferredConnection.id !== activeConnectionId) {
      setActiveConnectionId(preferredConnection.id)
      return
    }

    if (
      !activeConnectionId ||
      !connections.some((item) => item.id === activeConnectionId)
    ) {
      const nextConnectionId = connections[0]?.id ?? null
      setActiveConnectionId(nextConnectionId)
      if (nextConnectionId && !preferredConnectionId) {
        persistActiveConnectionId(nextConnectionId)
      }
    }
  }, [
    activeConnectionId,
    connections,
    persistActiveConnectionId,
    preferencesQuery.data?.activeConnectionId,
  ])

  const explorerQuery = useQuery({
    queryKey: ['db-browser-explorer', workspaceId, activeConnectionId],
    enabled: Boolean(activeConnectionId),
    queryFn: async () => {
      return apiJson<ExplorerSchema[]>(
        fetchWithWorkspace,
        `/api/connections/${activeConnectionId}/explorer`,
      )
    },
  })

  const schemas = useMemo(() => explorerQuery.data ?? [], [explorerQuery.data])

  useEffect(() => {
    if (schemas.length === 0) {
      setSelectedSchema('')
      return
    }

    if (
      selectedSchema &&
      schemas.some((schema) => schema.name === selectedSchema)
    ) {
      return
    }

    const preferredSchema =
      schemas.find((schema) => schema.name === 'public') ?? schemas[0]
    setSelectedSchema(preferredSchema?.name ?? '')
  }, [schemas, selectedSchema])

  const previewQuery = useQuery({
    queryKey: [
      'db-browser-preview',
      workspaceId,
      activeConnectionId,
      selectedTable?.schema,
      selectedTable?.table,
      previewOffset,
    ],
    enabled: Boolean(activeConnectionId && selectedTable),
    queryFn: async () => {
      const params = new URLSearchParams({
        schema: selectedTable?.schema ?? '',
        table: selectedTable?.table ?? '',
        limit: String(PREVIEW_LIMIT),
        offset: String(previewOffset),
      })

      return apiJson<TablePreviewResponse>(
        fetchWithWorkspace,
        `/api/connections/${activeConnectionId}/preview?${params.toString()}`,
      )
    },
  })

  const sqlWorkspaceQuery = useQuery({
    queryKey: ['db-browser-sql-workspace', workspaceId, activeConnectionId],
    enabled: Boolean(activeConnectionId),
    queryFn: async () => {
      return apiJson<SqlWorkspaceResponse>(
        fetchWithWorkspace,
        `/api/connections/${activeConnectionId}/sql-workspace`,
      )
    },
  })

  const dashboardWorkspaceQuery = useQuery({
    queryKey: [
      'db-browser-dashboard-workspace',
      workspaceId,
      activeConnectionId,
    ],
    enabled: Boolean(activeConnectionId),
    queryFn: async () => {
      return apiJson<DashboardWorkspaceResponse>(
        fetchWithWorkspace,
        `/api/connections/${activeConnectionId}/dashboards`,
      )
    },
  })

  const queryHistoryQuery = useQuery({
    queryKey: ['db-browser-query-history', workspaceId, activeConnectionId],
    enabled: Boolean(activeConnectionId),
    queryFn: async () => {
      return apiJson<QueryHistoryItem[]>(
        fetchWithWorkspace,
        `/api/connections/${activeConnectionId}/query-history`,
      )
    },
  })

  const queryHistory = queryHistoryQuery.data ?? []

  useEffect(() => {
    function handleAppApiChanged(event: MessageEvent) {
      if (event.data?.type !== 'moldable:app-api-changed') return
      if (event.data?.targetAppId && event.data.targetAppId !== 'db-browser')
        return

      const method =
        typeof event.data.method === 'string' ? event.data.method : ''
      if (!method.startsWith('db.')) return

      void queryClient.invalidateQueries({
        queryKey: ['db-browser-preferences', workspaceId],
      })

      if (method === 'db.query.runReadonly') {
        void queryClient.invalidateQueries({
          queryKey: [
            'db-browser-query-history',
            workspaceId,
            activeConnectionId,
          ],
        })
      }

      if (method.startsWith('db.sqlTabs.')) {
        void queryClient.invalidateQueries({
          queryKey: [
            'db-browser-sql-workspace',
            workspaceId,
            activeConnectionId,
          ],
        })
      }

      if (
        method.startsWith('db.dashboards.') ||
        method.startsWith('db.dashboardCharts.')
      ) {
        void queryClient.invalidateQueries({
          queryKey: [
            'db-browser-dashboard-workspace',
            workspaceId,
            activeConnectionId,
          ],
        })
      }

      if (method === 'db.connections.list' || method.startsWith('db.schema.')) {
        void queryClient.invalidateQueries({
          queryKey: ['db-browser-connections', workspaceId],
        })
        void queryClient.invalidateQueries({
          queryKey: ['db-browser-explorer', workspaceId, activeConnectionId],
        })
      }
    }

    window.addEventListener('message', handleAppApiChanged)
    return () => window.removeEventListener('message', handleAppApiChanged)
  }, [activeConnectionId, queryClient, workspaceId])

  useEffect(() => {
    if (!activeConnectionId) {
      return
    }

    if (!sqlWorkspaceQuery.data) return

    const workspace = normalizeSqlWorkspace(
      activeConnectionId,
      sqlWorkspaceQuery.data,
    )
    setSqlTabs(workspace.tabs)
    setActiveSqlTabId(workspace.activeTabId)
    setLoadedSqlWorkspaceConnectionId(activeConnectionId)
  }, [activeConnectionId, sqlWorkspaceQuery.data])

  useEffect(() => {
    if (!activeConnectionId) {
      return
    }

    if (!dashboardWorkspaceQuery.data) return

    const workspace = normalizeDashboardWorkspace(
      activeConnectionId,
      dashboardWorkspaceQuery.data,
    )
    setDashboards(workspace.dashboards)
    setActiveDashboardId(workspace.activeDashboardId)
    setLoadedDashboardConnectionId(activeConnectionId)
  }, [activeConnectionId, dashboardWorkspaceQuery.data])

  useEffect(() => {
    if (!activeConnectionId) return
    if (loadedSqlWorkspaceConnectionId !== activeConnectionId) return
    if (sqlTabs.length === 0) return

    const timeoutId = window.setTimeout(() => {
      void apiJson<SqlWorkspaceResponse>(
        fetchWithWorkspace,
        `/api/connections/${activeConnectionId}/sql-workspace`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tabs: sqlTabs,
            activeTabId: activeSqlTabId,
          }),
        },
      ).catch((error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to save SQL workspace'
        setActivityLog((current) => [
          buildActivity('SQL workspace save failed', message),
          ...current,
        ])
      })
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [
    activeConnectionId,
    activeSqlTabId,
    fetchWithWorkspace,
    loadedSqlWorkspaceConnectionId,
    sqlTabs,
  ])

  useEffect(() => {
    if (!activeConnectionId) return
    if (loadedDashboardConnectionId !== activeConnectionId) return

    const timeoutId = window.setTimeout(() => {
      void apiJson<DashboardWorkspaceResponse>(
        fetchWithWorkspace,
        `/api/connections/${activeConnectionId}/dashboards`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dashboards,
            activeDashboardId,
          }),
        },
      ).catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Failed to save dashboards'
        setActivityLog((current) => [
          buildActivity('Dashboard save failed', message),
          ...current,
        ])
      })
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [
    activeConnectionId,
    activeDashboardId,
    dashboards,
    fetchWithWorkspace,
    loadedDashboardConnectionId,
  ])

  useEffect(() => {
    setSelectedRowIndex(null)
  }, [resultMode, queryResult, previewQuery.data])

  useEffect(() => {
    if (resultMode !== 'preview' || !activeConnectionId || !previewQuery.data)
      return
    void queryClient.invalidateQueries({
      queryKey: ['db-browser-query-history', workspaceId, activeConnectionId],
    })
  }, [
    activeConnectionId,
    previewQuery.data,
    queryClient,
    resultMode,
    workspaceId,
  ])

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const path = editingConnectionId
        ? `/api/connections/${editingConnectionId}/test`
        : '/api/connections/test'

      return apiJson<ConnectionTestResponse>(fetchWithWorkspace, path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connectionPayload(connectionForm)),
      })
    },
    onSuccess: (data) => {
      setActivityLog((current) => [
        buildActivity(
          `Connection test succeeded for ${data.database}`,
          `${data.user} • ${data.version}`,
        ),
        ...current,
      ])
    },
  })

  const saveConnectionMutation = useMutation({
    mutationFn: async () => {
      return apiJson<ConnectionSummary>(
        fetchWithWorkspace,
        '/api/connections',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(connectionPayload(connectionForm)),
        },
      )
    },
    onSuccess: async (connection) => {
      await queryClient.invalidateQueries({
        queryKey: ['db-browser-connections', workspaceId],
      })
      persistActiveConnectionId(connection.id)
      setActiveConnectionId(connection.id)
      setShowNewConnectionDialog(false)
      setConnectionForm(blankConnectionForm())
      setActivityLog((current) => [
        buildActivity(`Saved connection ${connection.name}`),
        ...current,
      ])
    },
  })

  const updateConnectionMutation = useMutation({
    mutationFn: async () => {
      if (!editingConnectionId) {
        throw new Error('Select a connection to edit')
      }

      return apiJson<ConnectionSummary>(
        fetchWithWorkspace,
        `/api/connections/${editingConnectionId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(connectionPayload(connectionForm)),
        },
      )
    },
    onSuccess: async (connection) => {
      await queryClient.invalidateQueries({
        queryKey: ['db-browser-connections', workspaceId],
      })
      await queryClient.invalidateQueries({
        queryKey: ['db-browser-explorer', workspaceId, connection.id],
      })
      persistActiveConnectionId(connection.id)
      setActiveConnectionId(connection.id)
      setShowNewConnectionDialog(false)
      setConnectionForm(blankConnectionForm())
      setEditingConnectionId(null)
      setActivityLog((current) => [
        buildActivity(`Updated connection ${connection.name}`),
        ...current,
      ])
    },
  })

  const runQueryMutation = useMutation({
    mutationFn: async ({
      connectionId,
      statement,
    }: {
      connectionId: string
      statement: string
    }) => {
      return apiJson<QueryResultResponse>(
        fetchWithWorkspace,
        `/api/connections/${connectionId}/query`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: statement }),
        },
      )
    },
    onSuccess: (result, variables) => {
      setQueryResult(result)
      setResultMode('query')
      void queryClient.invalidateQueries({
        queryKey: [
          'db-browser-query-history',
          workspaceId,
          variables.connectionId,
        ],
      })
      setActivityLog((current) => [
        buildActivity(
          `${result.command} completed`,
          `${result.rowCount ?? result.rows.length} rows • ${result.executionMs} ms`,
        ),
        ...current,
      ])
    },
  })

  const exportQueryMutation = useMutation({
    mutationFn: async ({
      connectionId,
      format,
      filename,
      statement,
    }: {
      connectionId: string
      format: ExportFormat
      filename: string
      statement: string
    }) => {
      return apiJson<QueryExportResponse>(
        fetchWithWorkspace,
        `/api/connections/${connectionId}/export`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: statement, format, filename }),
        },
      )
    },
    onSuccess: (result) => {
      downloadExport(result.filename, result.format, result.content)
      setShowExportDialog(false)
      appendActivity(
        `Exported ${result.filename}`,
        `${result.rowCount} rows • ${result.bytes} bytes`,
      )
    },
  })

  const importRowsMutation = useMutation({
    mutationFn: async ({
      connectionId,
      payload,
    }: {
      connectionId: string
      payload: ImportRowsPayload
    }) => {
      return apiJson<ImportRowsResponse>(
        fetchWithWorkspace,
        `/api/connections/${connectionId}/import`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
    },
    onSuccess: async (result, variables) => {
      setShowImportDialog(false)
      await queryClient.invalidateQueries({
        queryKey: ['db-browser-explorer', workspaceId, variables.connectionId],
      })
      await queryClient.invalidateQueries({
        queryKey: ['db-browser-preview', workspaceId],
      })
      appendActivity(
        `Imported ${result.affectedRows} rows`,
        `${result.sourceBytes} bytes • ${result.executionMs} ms`,
      )
    },
  })

  const currentColumns =
    resultMode === 'query'
      ? (queryResult?.columns ?? [])
      : (previewQuery.data?.columns.map((column) => column.name) ?? [])
  const currentRows =
    resultMode === 'query'
      ? (queryResult?.rows ?? [])
      : (previewQuery.data?.rows ?? [])
  const activeSqlTab = useMemo(
    () =>
      sqlTabs.find((tab) => tab.id === activeSqlTabId) ?? sqlTabs[0] ?? null,
    [activeSqlTabId, sqlTabs],
  )
  const activeDashboard = useMemo(
    () =>
      dashboards.find((dashboard) => dashboard.id === activeDashboardId) ??
      dashboards[0] ??
      null,
    [activeDashboardId, dashboards],
  )
  const sql = activeSqlTab?.sql ?? DEFAULT_SQL
  const resultTitle =
    resultMode === 'query'
      ? activeSqlTab
        ? displaySqlTabTitle(activeSqlTab)
        : 'SQL Query'
      : selectedTable
        ? `${selectedTable.schema}.${selectedTable.table}`
        : 'Preview'
  const resultMeta =
    resultMode === 'query'
      ? queryResult
        ? `${queryResult.command} • ${queryResult.rowCount ?? queryResult.rows.length} rows • ${queryResult.executionMs} ms`
        : 'No query result loaded'
      : previewQuery.data
        ? previewQuery.data.rowCount > 0
          ? `Rows ${previewQuery.data.offset + 1}-${previewQuery.data.offset + previewQuery.data.rowCount}${previewQuery.data.hasMore ? '+' : ''}`
          : '0 rows previewed'
        : 'No preview loaded'
  const selectedRow =
    selectedRowIndex === null ? null : (currentRows[selectedRowIndex] ?? null)
  useEffect(() => {
    function handleRowNavigation(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
        return
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      if (isTypingTarget(event.target)) return
      if (showNewConnectionDialog || showHistoryDialog) return

      setSelectedRowIndex((current) => {
        if (current === null || currentRows.length === 0) return current

        event.preventDefault()
        if (event.key === 'ArrowDown') {
          return Math.min(current + 1, currentRows.length - 1)
        }

        return Math.max(current - 1, 0)
      })
    }

    window.addEventListener('keydown', handleRowNavigation)
    return () => window.removeEventListener('keydown', handleRowNavigation)
  }, [currentRows.length, showHistoryDialog, showNewConnectionDialog])

  function updateForm<K extends keyof ConnectionFormState>(
    key: K,
    value: ConnectionFormState[K],
  ) {
    setConnectionForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function appendActivity(message: string, detail?: string) {
    setActivityLog((current) => [buildActivity(message, detail), ...current])
  }

  function handleCreateConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (editingConnectionId) {
      updateConnectionMutation.mutate()
      return
    }
    saveConnectionMutation.mutate()
  }

  function handleRunCurrentQuery(statement: string) {
    if (!activeConnectionId || !statement.trim()) return
    setResultsPanelOpen(true)
    runQueryMutation.mutate({ connectionId: activeConnectionId, statement })
  }

  function handleExportQuery(format: ExportFormat, filename: string) {
    if (!activeConnectionId || !sql.trim()) return
    exportQueryMutation.mutate({
      connectionId: activeConnectionId,
      format,
      filename,
      statement: sql,
    })
  }

  function handleImportRows(payload: ImportRowsPayload) {
    if (!activeConnectionId) return
    importRowsMutation.mutate({ connectionId: activeConnectionId, payload })
  }

  function handleRunAllQueries(statements: string[]) {
    if (!activeConnectionId) return
    const runnableStatements = statements.filter((statement) =>
      statement.trim(),
    )
    if (runnableStatements.length === 0) return

    setResultsPanelOpen(true)
    void (async () => {
      for (const statement of runnableStatements) {
        await runQueryMutation.mutateAsync({
          connectionId: activeConnectionId,
          statement,
        })
      }
    })()
  }

  function handleSqlEditorHeightChange(height: number, persist = false) {
    const nextHeight = Math.max(
      MIN_SQL_EDITOR_HEIGHT,
      Math.min(MAX_SQL_EDITOR_HEIGHT, Math.round(height)),
    )

    setSqlEditorHeight(nextHeight)
    if (persist) {
      savePreferencesMutation.mutate({ sqlEditorHeight: nextHeight })
    }
  }

  function updateActiveSql(nextSql: string) {
    if (!activeSqlTabId) {
      const nextTab = updateSqlTab(createSqlTab(1, ''), nextSql)
      setSqlTabs([nextTab])
      setActiveSqlTabId(nextTab.id)
      return
    }

    setSqlTabs((current) =>
      current.map((tab) =>
        tab.id === activeSqlTabId ? updateSqlTab(tab, nextSql) : tab,
      ),
    )
  }

  function openNewSqlTab() {
    const nextTab = createSqlTab(sqlTabs.length + 1, '')
    setSqlTabs((current) => [...current, nextTab])
    setActiveSqlTabId(nextTab.id)
    setSidebarMode('sql')
    setResultMode('query')
    setQueryResult(null)
  }

  function closeSqlTab(tabId: string) {
    setResultMode('query')
    setQueryResult(null)
    setSelectedRowIndex(null)
    setSqlTabs((current) => {
      const nextTabs = current.filter((tab) => tab.id !== tabId)

      if (nextTabs.length === 0) {
        const nextTab = createSqlTab(1, '')
        setActiveSqlTabId(nextTab.id)
        return [nextTab]
      }

      if (activeSqlTabId === tabId) {
        const closedIndex = current.findIndex((tab) => tab.id === tabId)
        const nextActive =
          nextTabs[Math.max(0, Math.min(closedIndex, nextTabs.length - 1))]
        setActiveSqlTabId(nextActive?.id ?? nextTabs[0].id)
      }

      return nextTabs
    })
  }

  function renameActiveSqlTab(tabId: string, title: string) {
    setSqlTabs((current) =>
      current.map((tab) => (tab.id === tabId ? renameSqlTab(tab, title) : tab)),
    )
  }

  function selectSqlTab(tabId: string) {
    setActiveSqlTabId(tabId)
    setSidebarMode('sql')
    setResultMode('query')
    setQueryResult(null)
    setSelectedRowIndex(null)
  }

  function reorderSqlTabs(nextTabs: SqlEditorTab[]) {
    setSqlTabs(nextTabs)
  }

  function openNewDashboard() {
    const nextDashboard = createDashboard(dashboards.length + 1)
    setDashboards((current) => [...current, nextDashboard])
    setActiveDashboardId(nextDashboard.id)
    setSidebarMode('dashboards')
  }

  function selectDashboard(dashboardId: string) {
    setActiveDashboardId(dashboardId)
    setSidebarMode('dashboards')
    setSelectedRowIndex(null)
  }

  function deleteDashboard(dashboardId: string) {
    setDashboards((current) => {
      const nextDashboards = current.filter(
        (dashboard) => dashboard.id !== dashboardId,
      )

      if (activeDashboardId === dashboardId) {
        setActiveDashboardId(nextDashboards[0]?.id ?? null)
      }

      return nextDashboards
    })
  }

  function renameActiveDashboard(dashboardId: string, title: string) {
    setDashboards((current) =>
      current.map((dashboard) =>
        dashboard.id === dashboardId
          ? renameDashboard(dashboard, title)
          : dashboard,
      ),
    )
  }

  function updateActiveDashboardDescription(description: string) {
    if (!activeDashboardId) return
    setDashboards((current) =>
      current.map((dashboard) =>
        dashboard.id === activeDashboardId
          ? updateDashboardDescription(dashboard, description)
          : dashboard,
      ),
    )
  }

  function reorderDashboards(nextDashboards: Dashboard[]) {
    setDashboards(nextDashboards)
  }

  function addChartToActiveDashboard(chart: DashboardChart) {
    if (!activeDashboardId) return
    setDashboards((current) =>
      current.map((dashboard) =>
        dashboard.id === activeDashboardId
          ? updateDashboardCharts(dashboard, [...dashboard.charts, chart])
          : dashboard,
      ),
    )
  }

  function updateChartInActiveDashboard(chart: DashboardChart) {
    if (!activeDashboardId) return
    setDashboards((current) =>
      current.map((dashboard) =>
        dashboard.id === activeDashboardId
          ? updateDashboardCharts(
              dashboard,
              dashboard.charts.map((item) =>
                item.id === chart.id ? chart : item,
              ),
            )
          : dashboard,
      ),
    )
  }

  function deleteChartFromActiveDashboard(chartId: string) {
    if (!activeDashboardId) return
    setDashboards((current) =>
      current.map((dashboard) =>
        dashboard.id === activeDashboardId
          ? updateDashboardCharts(
              dashboard,
              dashboard.charts.filter((chart) => chart.id !== chartId),
            )
          : dashboard,
      ),
    )
  }

  function reorderChartsInActiveDashboard(charts: DashboardChart[]) {
    if (!activeDashboardId) return
    setDashboards((current) =>
      current.map((dashboard) =>
        dashboard.id === activeDashboardId
          ? updateDashboardCharts(dashboard, charts)
          : dashboard,
      ),
    )
  }

  function openConnection(connectionId: string) {
    const connection = connections.find((entry) => entry.id === connectionId)
    if (!connection) return

    persistActiveConnectionId(connection.id)
    setActiveConnectionId(connection.id)
    setSelectedSchema('')
    setSelectedTable(null)
    setPreviewOffset(0)
    setResultMode('query')
    setQueryResult(null)
    setSqlTabs([])
    setActiveSqlTabId(null)
    setLoadedSqlWorkspaceConnectionId(null)
    setDashboards([])
    setActiveDashboardId(null)
    setLoadedDashboardConnectionId(null)

    appendActivity(
      `Opened ${connection.name}`,
      `${connection.host}:${connection.port} • ${connection.database}`,
    )
  }

  function openNewConnectionDialog() {
    setConnectionForm(blankConnectionForm())
    setEditingConnectionId(null)
    testConnectionMutation.reset()
    saveConnectionMutation.reset()
    updateConnectionMutation.reset()
    setShowNewConnectionDialog(true)
  }

  function openEditConnectionDialog(connectionId = activeConnectionId) {
    const connection = connections.find((entry) => entry.id === connectionId)
    if (!connection) return
    setConnectionForm(connectionFormFromSummary(connection))
    setEditingConnectionId(connection.id)
    testConnectionMutation.reset()
    saveConnectionMutation.reset()
    updateConnectionMutation.reset()
    setShowNewConnectionDialog(true)
  }

  function handleSelectTable(schema: string, table: string) {
    const nextSql = previewSql(schema, table, 0)

    setSelectedSchema(schema)
    setSidebarMode('objects')
    setSelectedTable({ schema, table })
    setPreviewOffset(0)
    setResultMode('preview')
    setResultsPanelOpen(true)
    updateActiveSql(nextSql)
    appendActivity(`Previewing ${schema}.${table}`)
  }

  function goToPreviousPreviewPage() {
    if (!selectedTable) return
    setPreviewOffset((current) => {
      const next = Math.max(0, current - PREVIEW_LIMIT)
      const nextSql = previewSql(
        selectedTable.schema,
        selectedTable.table,
        next,
      )
      updateActiveSql(nextSql)
      return next
    })
  }

  function handleSelectResultRow(index: number | null) {
    setSelectedRowIndex(index)
    if (index !== null) {
      setRightPanelOpen(true)
    }
  }

  function goToNextPreviewPage() {
    if (!previewQuery.data?.hasMore || !selectedTable) return
    setPreviewOffset((current) => {
      const next = current + PREVIEW_LIMIT
      const nextSql = previewSql(
        selectedTable.schema,
        selectedTable.table,
        next,
      )
      updateActiveSql(nextSql)
      return next
    })
  }

  const dbBrowserCommands = useMemo<AppCommand[]>(() => {
    const baseCommands: AppCommand[] = [
      {
        id: 'db-browser.show-objects',
        label: 'Show Objects',
        description: 'Browse schemas, tables, and views',
        icon: 'folder',
        group: 'Navigation',
        action: {
          type: 'message',
          command: 'db-browser.show-objects',
          payload: null,
        },
      },
      {
        id: 'db-browser.show-dashboards',
        label: 'Show Dashboards',
        description: 'Open saved analytics dashboards',
        icon: 'bar-chart',
        group: 'Navigation',
        action: {
          type: 'message',
          command: 'db-browser.show-dashboards',
          payload: null,
        },
      },
      {
        id: 'db-browser.show-sql-queries',
        label: 'Show SQL Queries',
        description: 'Open saved SQL editors',
        icon: 'code',
        group: 'Navigation',
        action: {
          type: 'message',
          command: 'db-browser.show-sql-queries',
          payload: null,
        },
      },
      {
        id: 'db-browser.new-sql-query',
        label: 'New SQL Query',
        description: 'Create a new SQL editor',
        icon: 'plus',
        group: 'Actions',
        action: {
          type: 'message',
          command: 'db-browser.new-sql-query',
          payload: null,
        },
      },
      {
        id: 'db-browser.new-dashboard',
        label: 'New Dashboard',
        description: 'Create a dashboard for the active connection',
        icon: 'plus',
        group: 'Actions',
        action: {
          type: 'message',
          command: 'db-browser.new-dashboard',
          payload: null,
        },
      },
      {
        id: 'db-browser.new-connection',
        label: 'Add Connection',
        description: 'Create a PostgreSQL connection',
        icon: 'plus',
        group: 'Actions',
        action: {
          type: 'message',
          command: 'db-browser.new-connection',
          payload: null,
        },
      },
      {
        id: 'db-browser.query-history',
        label: 'Query History',
        description: 'View recent statements for this connection',
        icon: 'archive',
        group: 'Actions',
        action: {
          type: 'message',
          command: 'db-browser.query-history',
          payload: null,
        },
      },
    ]

    const connectionCommands: AppCommand[] = connections
      .filter((connection) => connection.id !== activeConnectionId)
      .map((connection) => ({
        id: `db-browser.switch-connection.${connection.id}`,
        label: connection.name,
        description: `Switch connection • ${connection.host}:${connection.port}/${connection.database}`,
        icon: 'folder',
        indicator: {
          label: connection.environment
            ? `${connection.environment} connection`
            : 'Connection',
          color: connection.color ?? undefined,
        },
        group: 'Connections',
        action: {
          type: 'message',
          command: 'db-browser.switch-connection',
          payload: { connectionId: connection.id },
        },
      }))

    const sqlQueryCommands: AppCommand[] = sqlTabs
      .slice(0, SQL_QUERY_COMMAND_LIMIT)
      .map((tab) => ({
        id: `db-browser.open-sql-query.${tab.id}`,
        label: displaySqlTabTitle(tab),
        description: activeConnection
          ? `Open SQL query • ${activeConnection.name}`
          : 'Open SQL query',
        icon: 'code',
        group: 'SQL Queries',
        action: {
          type: 'message',
          command: 'db-browser.open-sql-query',
          payload: { tabId: tab.id },
        },
      }))

    const dashboardCommands: AppCommand[] = dashboards.map((dashboard) => ({
      id: `db-browser.open-dashboard.${dashboard.id}`,
      label: displayDashboardTitle(dashboard),
      description: activeConnection
        ? `Open dashboard • ${activeConnection.name}`
        : 'Open dashboard',
      icon: 'bar-chart',
      group: 'Dashboards',
      action: {
        type: 'message',
        command: 'db-browser.open-dashboard',
        payload: { dashboardId: dashboard.id },
      },
    }))

    const schemaCommands: AppCommand[] = schemas
      .filter((schema) => schema.name !== selectedSchema)
      .map((schema) => ({
        id: `db-browser.switch-schema.${schema.name}`,
        label: schema.name,
        description: activeConnection
          ? `Switch schema • ${activeConnection.name}`
          : 'Switch schema',
        icon: 'database',
        group: 'Schemas',
        action: {
          type: 'message',
          command: 'db-browser.switch-schema',
          payload: { schema: schema.name },
        },
      }))

    return [
      ...baseCommands,
      ...dashboardCommands,
      ...sqlQueryCommands,
      ...schemaCommands,
      ...connectionCommands,
    ]
  }, [
    activeConnection,
    activeConnectionId,
    connections,
    dashboards,
    schemas,
    selectedSchema,
    sqlTabs,
  ])

  useMoldableAppCommands('db-browser', dbBrowserCommands)
  useMoldableCommands({
    'db-browser.show-objects': () => setSidebarMode('objects'),
    'db-browser.show-dashboards': () => setSidebarMode('dashboards'),
    'db-browser.show-sql-queries': () => setSidebarMode('sql'),
    'db-browser.new-sql-query': () => openNewSqlTab(),
    'db-browser.new-dashboard': () => openNewDashboard(),
    'db-browser.new-connection': () => openNewConnectionDialog(),
    'db-browser.query-history': () => setShowHistoryDialog(true),
    'db-browser.open-sql-query': (payload?: unknown) => {
      if (!payload || typeof payload !== 'object') return
      const tabId = (payload as { tabId?: unknown }).tabId
      if (typeof tabId !== 'string') return
      if (!sqlTabs.some((tab) => tab.id === tabId)) return
      selectSqlTab(tabId)
    },
    'db-browser.open-dashboard': (payload?: unknown) => {
      if (!payload || typeof payload !== 'object') return
      const dashboardId = (payload as { dashboardId?: unknown }).dashboardId
      if (typeof dashboardId !== 'string') return
      if (!dashboards.some((dashboard) => dashboard.id === dashboardId)) return
      selectDashboard(dashboardId)
    },
    'db-browser.switch-connection': (payload?: unknown) => {
      if (!payload || typeof payload !== 'object') return
      const connectionId = (payload as { connectionId?: unknown }).connectionId
      if (typeof connectionId !== 'string') return
      openConnection(connectionId)
    },
    'db-browser.switch-schema': (payload?: unknown) => {
      if (!payload || typeof payload !== 'object') return
      const schema = (payload as { schema?: unknown }).schema
      if (typeof schema !== 'string') return
      if (!schemas.some((entry) => entry.name === schema)) return
      setSelectedSchema(schema)
      setSidebarMode('objects')
    },
  })

  const showingDashboard = sidebarMode === 'dashboards'

  return (
    <main className="bg-background text-foreground h-full min-h-0 overflow-hidden">
      <div className="flex h-full min-h-0 flex-col">
        <header className="border-border/70 bg-background/95 z-30 border-b backdrop-blur">
          <div className="flex h-11 items-center gap-2 px-2">
            <PanelToggleButton
              label={leftPanelOpen ? 'Hide sidebar' : 'Show sidebar'}
              onClick={() => setLeftPanelOpen((open) => !open)}
            >
              {leftPanelOpen ? (
                <PanelLeftClose className="size-4" />
              ) : (
                <PanelLeft className="size-4" />
              )}
            </PanelToggleButton>
            <ConnectionSwitch
              connections={connections}
              value={activeConnectionId}
              disabled={connectionsQuery.isLoading}
              onChange={openConnection}
              onNew={openNewConnectionDialog}
              onEdit={openEditConnectionDialog}
            />

            <div className="flex-1" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground cursor-pointer"
                  aria-label="Connection actions"
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  className="cursor-pointer gap-2"
                  disabled={!activeConnection}
                  onClick={() => openEditConnectionDialog()}
                >
                  <Pencil className="size-3.5" />
                  Edit connection
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer gap-2"
                  onClick={() => setShowHistoryDialog(true)}
                >
                  <History className="size-3.5" />
                  Query history
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer gap-2"
                  disabled={!activeConnection || !sql.trim()}
                  onClick={() => setShowExportDialog(true)}
                >
                  <Download className="size-3.5" />
                  Export query
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer gap-2"
                  disabled={!activeConnection}
                  onClick={() => setShowImportDialog(true)}
                >
                  <Upload className="size-3.5" />
                  Import rows
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer gap-2"
                  onClick={openNewConnectionDialog}
                >
                  <Plus className="size-3.5" />
                  New connection
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer gap-2"
                  onClick={() => setShowSettingsDialog(true)}
                >
                  <Settings className="size-3.5" />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {!showingDashboard ? (
              <PanelToggleButton
                label={rightPanelOpen ? 'Hide row details' : 'Show row details'}
                onClick={() => setRightPanelOpen((open) => !open)}
              >
                {rightPanelOpen ? (
                  <PanelRightClose className="size-4" />
                ) : (
                  <PanelRight className="size-4" />
                )}
              </PanelToggleButton>
            ) : null}
          </div>
        </header>

        <div className="min-h-0 flex-1">
          <ResizablePanelGroup
            key={`${leftPanelOpen ? 'with-left' : 'without-left'}-${rightPanelOpen ? 'with-right' : 'without-right'}`}
            orientation="horizontal"
          >
            {leftPanelOpen ? (
              <>
                <ResizablePanel
                  defaultSize="280px"
                  minSize="220px"
                  maxSize="420px"
                  groupResizeBehavior="preserve-pixel-size"
                >
                  <ConnectionSidebar
                    mode={sidebarMode}
                    activeConnection={activeConnection}
                    schemas={schemas}
                    selectedSchema={selectedSchema}
                    objectSearch={objectSearch}
                    objectsLoading={explorerQuery.isLoading}
                    objectsFetching={explorerQuery.isFetching}
                    objectsError={explorerQuery.error}
                    selectedTable={selectedTable}
                    dashboards={dashboards}
                    activeDashboardId={activeDashboardId}
                    sqlTabs={sqlTabs}
                    activeSqlTabId={activeSqlTabId}
                    dashboardsLoading={dashboardWorkspaceQuery.isLoading}
                    sqlWorkspaceLoading={sqlWorkspaceQuery.isLoading}
                    onModeChange={setSidebarMode}
                    onObjectSearchChange={setObjectSearch}
                    onSchemaChange={setSelectedSchema}
                    onRefreshObjects={() => void explorerQuery.refetch()}
                    onSelectTable={handleSelectTable}
                    onSelectDashboard={selectDashboard}
                    onNewDashboard={openNewDashboard}
                    onDeleteDashboard={deleteDashboard}
                    onRenameDashboard={renameActiveDashboard}
                    onReorderDashboards={reorderDashboards}
                    onSelectSqlTab={selectSqlTab}
                    onNewSqlTab={openNewSqlTab}
                    onCloseSqlTab={closeSqlTab}
                    onRenameSqlTab={renameActiveSqlTab}
                    onReorderSqlTabs={reorderSqlTabs}
                  />
                </ResizablePanel>
                <ResizableHandle />
              </>
            ) : null}
            <ResizablePanel minSize="320px">
              {showingDashboard ? (
                <DashboardWorkspace
                  activeConnection={activeConnection}
                  dashboard={activeDashboard}
                  loading={dashboardWorkspaceQuery.isLoading}
                  onCreateDashboard={openNewDashboard}
                  onRenameDashboard={(title) => {
                    if (activeDashboardId)
                      renameActiveDashboard(activeDashboardId, title)
                  }}
                  onUpdateDashboardDescription={
                    updateActiveDashboardDescription
                  }
                  onAddChart={addChartToActiveDashboard}
                  onUpdateChart={updateChartInActiveDashboard}
                  onDeleteChart={deleteChartFromActiveDashboard}
                  onReorderCharts={reorderChartsInActiveDashboard}
                />
              ) : (
                <QueryWorkspace
                  activeConnection={activeConnection}
                  resultTitle={resultTitle}
                  resultMeta={resultMeta}
                  sql={sql}
                  columns={currentColumns}
                  rows={currentRows}
                  queryResult={resultMode === 'query' ? queryResult : null}
                  selectedRowIndex={selectedRowIndex}
                  queryError={runQueryMutation.error}
                  previewError={
                    resultMode === 'preview' ? previewQuery.error : null
                  }
                  errorSql={runQueryMutation.variables?.statement ?? sql}
                  editorHeight={sqlEditorHeight}
                  resultLoading={
                    runQueryMutation.isPending ||
                    (resultMode === 'preview' && previewQuery.isFetching)
                  }
                  refreshing={explorerQuery.isFetching}
                  running={runQueryMutation.isPending}
                  resultsPanelOpen={resultsPanelOpen}
                  previewPagination={
                    resultMode === 'preview'
                      ? {
                          offset: previewOffset,
                          hasMore: Boolean(previewQuery.data?.hasMore),
                          loading: previewQuery.isFetching,
                          onPrevious: goToPreviousPreviewPage,
                          onNext: goToNextPreviewPage,
                        }
                      : null
                  }
                  onSqlChange={updateActiveSql}
                  onEditorHeightChange={handleSqlEditorHeightChange}
                  onRunCurrent={handleRunCurrentQuery}
                  onRunAll={handleRunAllQueries}
                  onNewSqlTab={openNewSqlTab}
                  onRefresh={() => void explorerQuery.refetch()}
                  onOpenConnection={openNewConnectionDialog}
                  onSelectRow={handleSelectResultRow}
                  onToggleResultsPanel={() =>
                    setResultsPanelOpen((open) => !open)
                  }
                />
              )}
            </ResizablePanel>
            {rightPanelOpen && !showingDashboard ? (
              <>
                <ResizableHandle />
                <ResizablePanel
                  defaultSize="340px"
                  minSize="260px"
                  maxSize="560px"
                  groupResizeBehavior="preserve-pixel-size"
                >
                  {selectedRow ? (
                    <RowDetails
                      columns={currentColumns}
                      row={selectedRow}
                      onClose={() => setRightPanelOpen(false)}
                    />
                  ) : (
                    <RowDetailsEmpty onClose={() => setRightPanelOpen(false)} />
                  )}
                </ResizablePanel>
              </>
            ) : null}
          </ResizablePanelGroup>
        </div>
      </div>

      {showNewConnectionDialog ? (
        <ConnectionFormDialog
          mode={editingConnectionId ? 'edit' : 'create'}
          connectionForm={connectionForm}
          testData={testConnectionMutation.data}
          error={
            testConnectionMutation.error ??
            saveConnectionMutation.error ??
            updateConnectionMutation.error
          }
          testing={testConnectionMutation.isPending}
          saving={
            saveConnectionMutation.isPending ||
            updateConnectionMutation.isPending
          }
          onClose={() => {
            setShowNewConnectionDialog(false)
            setEditingConnectionId(null)
          }}
          onChange={updateForm}
          onTest={() => testConnectionMutation.mutate()}
          onSubmit={handleCreateConnection}
        />
      ) : null}
      {showSettingsDialog ? (
        <DbBrowserSettingsDialog
          preferences={preferencesQuery.data}
          saving={savePreferencesMutation.isPending}
          onClose={() => setShowSettingsDialog(false)}
          onSave={(preferences) => {
            savePreferencesMutation.mutate(preferences, {
              onSuccess: () => setShowSettingsDialog(false),
            })
          }}
        />
      ) : null}

      {showExportDialog ? (
        <ExportQueryDialog
          defaultFilename={
            activeSqlTab
              ? displaySqlTabTitle(activeSqlTab)
                  .replaceAll(/\s+/g, '-')
                  .toLowerCase()
              : 'query-export'
          }
          exporting={exportQueryMutation.isPending}
          error={exportQueryMutation.error}
          onClose={() => {
            setShowExportDialog(false)
            exportQueryMutation.reset()
          }}
          onExport={handleExportQuery}
        />
      ) : null}

      {showImportDialog ? (
        <ImportRowsDialog
          connection={activeConnection}
          schemas={schemas}
          selectedSchema={selectedSchema}
          selectedTable={selectedTable}
          importing={importRowsMutation.isPending}
          error={importRowsMutation.error}
          onClose={() => {
            setShowImportDialog(false)
            importRowsMutation.reset()
          }}
          onImport={handleImportRows}
        />
      ) : null}

      {showHistoryDialog ? (
        <QueryHistoryDialog
          items={queryHistory}
          onClose={() => setShowHistoryDialog(false)}
        />
      ) : null}
    </main>
  )
}

function PanelToggleButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground cursor-pointer"
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
