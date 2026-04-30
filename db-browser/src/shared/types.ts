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

export interface ConnectionTestResponse {
  database: string
  user: string
  version: string
}
