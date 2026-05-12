export type ConnectionPolicyMode = 'read-only' | 'write' | 'admin'

export interface ConnectionInput {
  name: string
  host: string
  port: number
  database: string
  user: string
  password?: string
  ssl: boolean
  color: string | null
  environment: string | null
  policyMode: ConnectionPolicyMode
}

export interface ConnectionSummary {
  id: string
  engine: 'postgres'
  name: string
  host: string
  port: number
  database: string
  user: string
  ssl: boolean
  color: string | null
  environment: string | null
  policyMode: ConnectionPolicyMode
  createdAt: string
  updatedAt: string
}

export interface ExplorerTable {
  name: string
  type: string
}

export interface ExplorerSchema {
  name: string
  tables: ExplorerTable[]
}

export interface TableColumn {
  name: string
  dataType: string
  nullable: boolean
}

export interface TablePreviewResponse {
  schema: string
  table: string
  columns: TableColumn[]
  rows: Record<string, unknown>[]
  rowCount: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface QueryResultResponse {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number | null
  executionMs: number
  command: string
  readOnly?: boolean
  affectedRows?: number
  maxAffectedRows?: number
  admin?: boolean
}

export interface QueryExportResponse {
  filename: string
  format: 'csv' | 'jsonl'
  content: string
  bytes: number
  rowCount: number
  executionMs: number
}

export interface ImportRowsResponse {
  affectedRows: number
  rowCount: number
  sourceBytes: number
  executionMs: number
}

export interface QueryHistoryItem {
  id: string
  sql: string
  title: string
  timestamp: string
  rowCount: number | null
  executionMs: number | null
}

export interface DbBrowserPreferences {
  sqlEditorHeight: number
  activeConnectionId: string | null
  queryTimeoutMs: number
}

export interface SqlEditorTab {
  id: string
  title: string
  sql: string
  createdAt: string
  updatedAt: string
}

export interface SqlWorkspaceResponse {
  connectionId: string
  activeTabId: string | null
  tabs: SqlEditorTab[]
  updatedAt: string
}

export type DashboardChartType =
  | 'line'
  | 'area'
  | 'bar'
  | 'stacked-bar'
  | 'horizontal-bar'
  | 'composed'
  | 'pie'
  | 'donut'
  | 'scatter'
  | 'bubble'
  | 'number'
  | 'table'

export type DashboardChartSize = 'sm' | 'md' | 'lg' | 'xl'

export type DashboardChartVisibleRangeMode =
  | 'all'
  | 'latest'
  | 'first'
  | 'custom'
export type DashboardChartComparisonMode =
  | 'auto'
  | 'percent'
  | 'previous-value'
  | 'number'

export interface DashboardChartVisibleRange {
  mode: DashboardChartVisibleRangeMode
  count: number
  start: number
  end: number
}

export interface DashboardChartSeries {
  id: string
  name: string
  column: string
  color?: string | null
  chartType?: 'line' | 'area' | 'bar'
}

export interface DashboardChart {
  id: string
  title: string
  description: string
  type: DashboardChartType
  sql: string
  size: DashboardChartSize
  xAxis: string
  series: DashboardChartSeries[]
  categoryColumn: string
  valueColumn: string
  colorColumn: string
  sizeColumn: string
  labelColumn: string
  metricColumn: string
  comparisonColumn: string
  comparisonMode: DashboardChartComparisonMode
  tableColumns: string[]
  maxRows: number
  visibleRange: DashboardChartVisibleRange
  showLegend: boolean
  showAxes: boolean
  showGrid: boolean
  showDots: boolean
  createdAt: string
  updatedAt: string
}

export interface Dashboard {
  id: string
  title: string
  description: string
  charts: DashboardChart[]
  createdAt: string
  updatedAt: string
}

export interface DashboardWorkspaceResponse {
  connectionId: string
  activeDashboardId: string | null
  dashboards: Dashboard[]
  updatedAt: string
}

export interface ConnectionTestResponse {
  database: string
  user: string
  version: string
}
