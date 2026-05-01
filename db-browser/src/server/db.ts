import { readJson, safePath, sanitizeId, writeJson } from '@moldable-ai/storage'
import type {
  ConnectionInput,
  ConnectionPolicyMode,
  ConnectionSummary,
  ConnectionTestResponse,
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
import {
  deleteCredentialIfExists,
  deleteWorkspaceSecret,
  invokePostgresCapability,
  upsertPostgresCredential,
} from './aivault'
import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

interface StoredConnection {
  id: string
  engine: 'postgres'
  name: string
  host: string
  port: number
  database: string
  user: string
  ssl: boolean
  color?: string | null
  environment?: string | null
  policyMode?: ConnectionPolicyMode
  credentialId?: string
  secretName?: string
  passwordSecretName?: string
  password?: string
  createdAt: string
  updatedAt: string
}

interface AivaultTableRow {
  schema?: string
  schema_name?: string
  name?: string
  table_name?: string
  type?: string
  table_type?: string
}

interface AivaultColumn {
  name: string
  dataType?: string
  data_type?: string
  nullable?: boolean
}

interface AivaultQueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount?: number
  row_count?: number
  executionMs?: number
  execution_ms?: number
  command?: string
  readOnly?: boolean
  read_only?: boolean
}

interface AivaultExecuteResult {
  columns?: string[]
  rows?: Record<string, unknown>[]
  rowCount?: number
  row_count?: number
  affectedRows?: number
  affected_rows?: number
  maxAffectedRows?: number
  max_affected_rows?: number
  executionMs?: number
  execution_ms?: number
  command?: string
  readOnly?: boolean
  read_only?: boolean
  admin?: boolean
}

interface AivaultExportResult {
  content: string
  format?: string
  bytes?: number
  rowCount?: number
  row_count?: number
  executionMs?: number
  execution_ms?: number
}

interface AivaultImportResult {
  affectedRows?: number
  affected_rows?: number
  rowCount?: number
  row_count?: number
  sourceBytes?: number
  source_bytes?: number
  executionMs?: number
  execution_ms?: number
}

interface AivaultPreviewResult extends AivaultQueryResult {
  schema: string
  table: string
  limit?: number
  offset?: number
}

const CONNECTIONS_FILE = 'connections.json'
const PREFERENCES_FILE = 'preferences.json'
const SQL_WORKSPACES_DIR = 'sql-workspaces'
const QUERY_HISTORY_DIR = 'query-history'
const MAX_SQL_TABS = 30
const MAX_SQL_LENGTH = 250_000
const MAX_QUERY_HISTORY_ITEMS = 200
const DEFAULT_SQL_EDITOR_HEIGHT = 128
const MIN_SQL_EDITOR_HEIGHT = 96
const MAX_SQL_EDITOR_HEIGHT = 520
const DEFAULT_QUERY_TIMEOUT_MS = 5_000
const MIN_QUERY_TIMEOUT_MS = 1_000
const MAX_QUERY_TIMEOUT_MS = 30_000
const DEFAULT_EXPORT_LIMIT = 1_000
const MAX_EXPORT_BYTES = 10_485_760
const MAX_IMPORT_BYTES = 10_485_760
const DEFAULT_IMPORT_MAX_ROWS = 1_000
const MAX_IMPORT_ROWS = 10_000
const EXPLORER_QUERY = `
  SELECT
    table_schema AS schema_name,
    table_name,
    table_type
  FROM information_schema.tables
  WHERE table_schema NOT IN ('information_schema')
    AND table_schema NOT LIKE 'pg_%'
  ORDER BY table_schema, table_name
`
function connectionsPath(dataDir: string) {
  return safePath(dataDir, CONNECTIONS_FILE)
}

function preferencesPath(dataDir: string) {
  return safePath(dataDir, PREFERENCES_FILE)
}

function sqlWorkspacePath(dataDir: string, connectionId: string) {
  return safePath(
    dataDir,
    SQL_WORKSPACES_DIR,
    `${sanitizeId(connectionId)}.json`,
  )
}

function queryHistoryPath(dataDir: string, connectionId: string) {
  return safePath(
    dataDir,
    QUERY_HISTORY_DIR,
    `${sanitizeId(connectionId)}.json`,
  )
}

async function readConnections(dataDir: string): Promise<StoredConnection[]> {
  return readJson<StoredConnection[]>(connectionsPath(dataDir), [])
}

async function writeConnections(
  dataDir: string,
  connections: StoredConnection[],
) {
  await writeJson(connectionsPath(dataDir), connections)
}

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value === 'true'
  return false
}

function normalizeOptionalString(value: unknown): string | null {
  const normalized = asTrimmedString(value)
  return normalized || null
}

function normalizeSqlEditorHeight(value: unknown) {
  const height =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim())
        : Number.NaN

  if (!Number.isFinite(height)) return DEFAULT_SQL_EDITOR_HEIGHT

  return Math.max(
    MIN_SQL_EDITOR_HEIGHT,
    Math.min(MAX_SQL_EDITOR_HEIGHT, Math.round(height)),
  )
}

function normalizeQueryTimeoutMs(value: unknown) {
  const timeout =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim())
        : Number.NaN

  if (!Number.isFinite(timeout)) return DEFAULT_QUERY_TIMEOUT_MS

  return Math.max(
    MIN_QUERY_TIMEOUT_MS,
    Math.min(MAX_QUERY_TIMEOUT_MS, Math.round(timeout)),
  )
}

function aivaultTimeoutBody(timeoutMs?: number) {
  return timeoutMs ? { timeoutMs: normalizeQueryTimeoutMs(timeoutMs) } : {}
}

function aivaultReadOnlyPolicyBody() {
  return { policyMode: 'read-only' }
}

function aivaultVaultRoot() {
  return (
    process.env.AIVAULT_DIR?.trim() ||
    join(homedir(), '.aivault', 'data', 'vault')
  )
}

function aivaultPolicyMode(connection: Pick<StoredConnection, 'policyMode'>) {
  return normalizeConnectionPolicyMode(connection.policyMode)
}

function normalizePreferences(value: unknown): DbBrowserPreferences {
  const body =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

  return {
    sqlEditorHeight: normalizeSqlEditorHeight(body.sqlEditorHeight),
    activeConnectionId: normalizeOptionalString(body.activeConnectionId),
    queryTimeoutMs: normalizeQueryTimeoutMs(body.queryTimeoutMs),
  }
}

function parseSqlWorkspaceInput(
  connectionId: string,
  value: unknown,
): SqlWorkspaceResponse {
  if (!value || typeof value !== 'object') {
    throw new Error('SQL workspace is required')
  }

  const body = value as Record<string, unknown>
  const rawTabs = Array.isArray(body.tabs) ? body.tabs : []

  if (rawTabs.length > MAX_SQL_TABS) {
    throw new Error(`A SQL workspace can contain at most ${MAX_SQL_TABS} tabs`)
  }

  const seenIds = new Set<string>()
  const now = new Date().toISOString()
  const tabs: SqlEditorTab[] = rawTabs.map((rawTab) => {
    if (!rawTab || typeof rawTab !== 'object') {
      throw new Error('Each SQL tab must be an object')
    }

    const tab = rawTab as Record<string, unknown>
    const id = asTrimmedString(tab.id) || randomUUID()
    const sql = typeof tab.sql === 'string' ? tab.sql : ''

    if (seenIds.has(id)) {
      throw new Error('SQL tab ids must be unique')
    }
    if (sql.length > MAX_SQL_LENGTH) {
      throw new Error('SQL tab content is too large')
    }

    seenIds.add(id)
    return {
      id,
      title: asTrimmedString(tab.title) || 'SQL Query',
      sql,
      createdAt: asTrimmedString(tab.createdAt) || now,
      updatedAt: asTrimmedString(tab.updatedAt) || now,
    }
  })

  const requestedActiveTabId = asTrimmedString(body.activeTabId)
  const activeTabId = tabs.some((tab) => tab.id === requestedActiveTabId)
    ? requestedActiveTabId
    : (tabs[0]?.id ?? null)

  return {
    connectionId,
    activeTabId,
    tabs,
    updatedAt: now,
  }
}

function parseQueryHistoryInput(
  value: unknown,
): Omit<QueryHistoryItem, 'id' | 'timestamp'> {
  if (!value || typeof value !== 'object') {
    throw new Error('Query history item is required')
  }

  const body = value as Record<string, unknown>
  const sql = typeof body.sql === 'string' ? body.sql.trim() : ''
  if (!sql) throw new Error('SQL query is required')

  const rowCount =
    typeof body.rowCount === 'number' && Number.isFinite(body.rowCount)
      ? body.rowCount
      : null
  const executionMs =
    typeof body.executionMs === 'number' && Number.isFinite(body.executionMs)
      ? body.executionMs
      : null

  return {
    sql,
    title:
      asTrimmedString(body.title) ||
      sql.split('\n')[0]?.slice(0, 80) ||
      'SQL query',
    rowCount,
    executionMs,
  }
}

function normalizeLimit(value: unknown, fallback: number, max: number) {
  const limit =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim())
        : Number.NaN

  if (!Number.isFinite(limit)) return fallback
  return Math.max(1, Math.min(max, Math.round(limit)))
}

function createSqlTabRecord(
  index: number,
  title: string | null,
  sql: string,
): SqlEditorTab {
  if (sql.length > MAX_SQL_LENGTH) {
    throw new Error('SQL tab content is too large')
  }

  const now = new Date().toISOString()

  return {
    id: randomUUID(),
    title: title || (index > 1 ? `SQL Query ${index}` : 'SQL Query'),
    sql,
    createdAt: now,
    updatedAt: now,
  }
}

function normalizeConnectionColor(value: unknown): string | null {
  const normalized = normalizeOptionalString(value)
  if (!normalized) return null
  const color = normalized.startsWith('#') ? normalized : `#${normalized}`
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : null
}

function normalizeConnectionEnvironment(value: unknown): string | null {
  const normalized = normalizeOptionalString(value)?.toLowerCase()
  if (!normalized) return null
  const allowed = new Set([
    'local',
    'testing',
    'development',
    'staging',
    'production',
  ])
  return allowed.has(normalized) ? normalized : null
}

function normalizeConnectionPolicyMode(value: unknown): ConnectionPolicyMode {
  const normalized = normalizeOptionalString(value)?.toLowerCase()
  if (normalized === 'write' || normalized === 'admin') return normalized
  return 'read-only'
}

function normalizeDataFormat(value: unknown): 'csv' | 'jsonl' {
  const normalized = normalizeOptionalString(value)?.toLowerCase()
  return normalized === 'csv' ? 'csv' : 'jsonl'
}

function normalizePositiveInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim())
        : Number.NaN

  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, Math.round(parsed)))
}

function normalizeImportColumns(value: unknown): string[] {
  const columns = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : []

  const seen = new Set<string>()
  const normalized = columns
    .map((column) => asTrimmedString(column))
    .filter(Boolean)
    .filter((column) => {
      const key = column.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  if (normalized.length === 0) {
    throw new Error('Import columns are required')
  }

  return normalized
}

function normalizeSourceContent(value: unknown) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Import file content is required')
  }
  if (Buffer.byteLength(value, 'utf8') > MAX_IMPORT_BYTES) {
    throw new Error(`Import file must be ${MAX_IMPORT_BYTES} bytes or smaller`)
  }
  return value
}

function safeImportFilename(format: 'csv' | 'jsonl') {
  return `db-browser-${Date.now()}-${randomUUID()}.${format}`
}

async function writeTemporaryImportSource(
  sourceContent: string,
  format: 'csv' | 'jsonl',
) {
  const importRoot = join(aivaultVaultRoot(), 'postgres', 'imports')
  await mkdir(importRoot, { recursive: true, mode: 0o700 })
  const sourcePath = join(importRoot, safeImportFilename(format))
  await writeFile(sourcePath, sourceContent, { mode: 0o600 })
  return sourcePath
}

function exportFilename(value: unknown, format: 'csv' | 'jsonl') {
  const base = asTrimmedString(value)
    .replaceAll(/[/\\:]/g, '-')
    .replaceAll(/[^\w .-]/g, '_')
    .trim()
    .replace(/^\.+/, '')
  const fallback = `query-export-${new Date().toISOString().slice(0, 19).replaceAll(':', '')}`
  const filename = base || fallback
  return filename.toLowerCase().endsWith(`.${format}`)
    ? filename
    : `${filename}.${format}`
}

function toPort(value: unknown): number {
  const port =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim())
        : Number.NaN

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Port must be a number between 1 and 65535')
  }

  return port
}

function connectionSecretName(connectionId: string) {
  return `DB_BROWSER_CONNECTION_${connectionId}_POSTGRES_URL`
}

function connectionCredentialId(connectionId: string) {
  return `db-browser-${connectionId}`
}

function legacyPasswordSecretName(connectionId: string) {
  return `DB_BROWSER_CONNECTION_${connectionId}_PASSWORD`
}

export function parseConnectionInput(value: unknown): ConnectionInput {
  if (!value || typeof value !== 'object') {
    throw new Error('Connection details are required')
  }

  const body = value as Record<string, unknown>
  const host = asTrimmedString(body.host)
  const database = asTrimmedString(body.database)
  const user = asTrimmedString(body.user)
  const password = typeof body.password === 'string' ? body.password : ''
  const port = toPort(body.port)

  if (!host) throw new Error('Host is required')
  if (!database) throw new Error('Database is required')
  if (!user) throw new Error('User is required')

  const name = asTrimmedString(body.name) || `${database} @ ${host}`

  return {
    name,
    host,
    port,
    database,
    user,
    password,
    ssl: asBoolean(body.ssl),
    color: normalizeConnectionColor(body.color),
    environment: normalizeConnectionEnvironment(body.environment),
    policyMode: normalizeConnectionPolicyMode(body.policyMode),
  }
}

function encodeConnectionPart(value: string) {
  return encodeURIComponent(value)
}

function buildPostgresUrl(
  connection: Pick<
    ConnectionInput,
    'host' | 'port' | 'database' | 'user' | 'ssl'
  >,
  password?: string,
) {
  const authPassword =
    typeof password === 'string' && password.length > 0
      ? `:${encodeConnectionPart(password)}`
      : ''
  const auth = `${encodeConnectionPart(connection.user)}${authPassword}`
  const database = connection.database
    .split('/')
    .map((part) => encodeConnectionPart(part))
    .join('/')
  const sslmode = connection.ssl ? 'require' : 'disable'

  return `postgresql://${auth}@${connection.host}:${connection.port}/${database}?sslmode=${sslmode}`
}

function sortConnections(connections: StoredConnection[]) {
  return [...connections].sort((left, right) => {
    return right.updatedAt.localeCompare(left.updatedAt)
  })
}

async function migrateLegacyPasswords(
  workspaceId: string,
  dataDir: string,
  connections: StoredConnection[],
): Promise<StoredConnection[]> {
  let changed = false
  const migrated: StoredConnection[] = []

  for (const connection of connections) {
    if (!connection.password || connection.credentialId) {
      migrated.push(connection)
      continue
    }

    const secretName =
      connection.secretName || connectionSecretName(connection.id)
    const credentialId =
      connection.credentialId || connectionCredentialId(connection.id)

    await upsertPostgresCredential({
      workspaceId,
      credentialId,
      secretName,
      connectionUrl: buildPostgresUrl(connection, connection.password),
      host: connection.host,
      port: connection.port,
      maxPolicyMode: normalizeConnectionPolicyMode(connection.policyMode),
    })

    migrated.push({
      ...connection,
      credentialId,
      secretName,
      passwordSecretName: undefined,
      password: undefined,
      updatedAt: new Date().toISOString(),
    })
    changed = true
  }

  if (changed) {
    await writeConnections(dataDir, migrated)
  }

  return migrated
}

function toSummary(connection: StoredConnection): ConnectionSummary {
  return {
    id: connection.id,
    engine: 'postgres',
    name: connection.name,
    host: connection.host,
    port: connection.port,
    database: connection.database,
    user: connection.user,
    ssl: connection.ssl,
    color: connection.color ?? null,
    environment: connection.environment ?? null,
    policyMode: normalizeConnectionPolicyMode(connection.policyMode),
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
  }
}

function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (Buffer.isBuffer(value)) return value.toString('base64')
  if (Array.isArray(value)) return value.map((item) => normalizeValue(item))
  if (value instanceof Date) return value.toISOString()

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        normalizeValue(entry),
      ]),
    )
  }

  return value
}

function normalizeRows(rows: unknown[]): Record<string, unknown>[] {
  return rows.map((row) => normalizeValue(row) as Record<string, unknown>)
}

async function getStoredConnection(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
): Promise<StoredConnection> {
  const connections = await migrateLegacyPasswords(
    workspaceId,
    dataDir,
    await readConnections(dataDir),
  )
  const connection = connections.find((entry) => entry.id === connectionId)

  if (!connection) {
    throw new Error('Saved connection not found')
  }

  return connection
}

async function getConnectionCredential(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
): Promise<{ connection: StoredConnection; credentialId: string }> {
  const connection = await getStoredConnection(
    workspaceId,
    dataDir,
    connectionId,
  )

  if (connection.credentialId) {
    return { connection, credentialId: connection.credentialId }
  }

  throw new Error(
    'Edit this legacy connection and save it to create its aivault credential',
  )
}

function stripLeadingSqlComments(rawSql: string): string {
  let index = 0

  while (index < rawSql.length) {
    while (index < rawSql.length && /\s/.test(rawSql[index] ?? '')) {
      index += 1
    }

    if (rawSql[index] === '-' && rawSql[index + 1] === '-') {
      index += 2
      while (index < rawSql.length && rawSql[index] !== '\n') {
        index += 1
      }
      continue
    }

    if (rawSql[index] === '/' && rawSql[index + 1] === '*') {
      const commentEnd = rawSql.indexOf('*/', index + 2)
      if (commentEnd === -1) return rawSql.slice(index)
      index = commentEnd + 2
      continue
    }

    break
  }

  return rawSql.slice(index)
}

function containsSemicolonOutsideSqlSyntax(sql: string): boolean {
  let index = 0
  let quote: "'" | '"' | '`' | null = null
  let dollarQuote: string | null = null
  let lineComment = false
  let blockComment = false

  while (index < sql.length) {
    const char = sql[index]
    const next = sql[index + 1]

    if (lineComment) {
      if (char === '\n') lineComment = false
      index += 1
      continue
    }

    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false
        index += 2
        continue
      }
      index += 1
      continue
    }

    if (dollarQuote) {
      if (sql.startsWith(dollarQuote, index)) {
        index += dollarQuote.length
        dollarQuote = null
        continue
      }
      index += 1
      continue
    }

    if (quote) {
      if (char === quote) {
        if (quote === "'" && next === "'") {
          index += 2
          continue
        }
        quote = null
      }
      index += 1
      continue
    }

    if (char === '-' && next === '-') {
      lineComment = true
      index += 2
      continue
    }

    if (char === '/' && next === '*') {
      blockComment = true
      index += 2
      continue
    }

    if (char === "'" || char === '"' || char === '`') {
      quote = char
      index += 1
      continue
    }

    if (char === '$') {
      const match = sql.slice(index).match(/^\$[a-zA-Z_][a-zA-Z0-9_]*\$|^\$\$/)
      if (match) {
        dollarQuote = match[0]
        index += dollarQuote.length
        continue
      }
    }

    if (char === ';') return true
    index += 1
  }

  return false
}

function normalizeReadOnlySql(rawSql: string): string {
  const trimmed = stripLeadingSqlComments(rawSql).trim()
  if (!trimmed) throw new Error('SQL query is required')

  const withoutTrailingSemicolons = trimmed.replace(/;+$/g, '').trim()
  if (!withoutTrailingSemicolons) {
    throw new Error('SQL query is required')
  }

  if (containsSemicolonOutsideSqlSyntax(withoutTrailingSemicolons)) {
    throw new Error(
      'Only a single read-only statement can be executed at a time',
    )
  }

  const firstKeyword = withoutTrailingSemicolons
    .match(/^[a-z]+/i)?.[0]
    .toLowerCase()
  const allowedKeywords = new Set([
    'select',
    'with',
    'show',
    'explain',
    'values',
  ])

  if (!firstKeyword || !allowedKeywords.has(firstKeyword)) {
    throw new Error(
      'Read-only mode only allows SELECT, WITH, SHOW, EXPLAIN, and VALUES statements',
    )
  }

  return withoutTrailingSemicolons
}

type SqlExecutionKind = 'read-only' | 'write' | 'admin'

function normalizeSingleSql(rawSql: string): string {
  const trimmed = stripLeadingSqlComments(rawSql).trim()
  if (!trimmed) throw new Error('SQL query is required')

  const withoutTrailingSemicolons = trimmed.replace(/;+$/g, '').trim()
  if (!withoutTrailingSemicolons) {
    throw new Error('SQL query is required')
  }

  if (containsSemicolonOutsideSqlSyntax(withoutTrailingSemicolons)) {
    throw new Error('Only a single statement can be executed at a time')
  }

  return withoutTrailingSemicolons
}

function firstSqlKeyword(sql: string) {
  return sql.match(/^[a-z]+/i)?.[0].toLowerCase() ?? ''
}

function sqlTokens(sql: string) {
  return sql.match(/[a-z_]+/gi)?.map((token) => token.toLowerCase()) ?? []
}

function withStatementKind(sql: string): SqlExecutionKind | null {
  const tokens = sqlTokens(sql)
  if (tokens[0] !== 'with') return null
  if (
    tokens.some(
      (token) => token === 'insert' || token === 'update' || token === 'delete',
    )
  ) {
    return 'write'
  }
  if (
    tokens.some((token) =>
      new Set([
        'create',
        'alter',
        'drop',
        'truncate',
        'grant',
        'revoke',
        'vacuum',
        'analyze',
        'reindex',
        'refresh',
        'comment',
      ]).has(token),
    )
  ) {
    return 'admin'
  }
  return null
}

function classifySqlExecution(rawSql: string): {
  sql: string
  kind: SqlExecutionKind
} {
  const sql = normalizeSingleSql(rawSql)
  const firstKeyword = firstSqlKeyword(sql)

  const withKind = withStatementKind(sql)
  if (withKind) {
    return { sql, kind: withKind }
  }

  if (
    new Set(['select', 'with', 'show', 'explain', 'values']).has(firstKeyword)
  ) {
    return { sql: normalizeReadOnlySql(rawSql), kind: 'read-only' }
  }

  if (new Set(['insert', 'update', 'delete']).has(firstKeyword)) {
    return { sql, kind: 'write' }
  }

  if (
    new Set([
      'create',
      'alter',
      'drop',
      'truncate',
      'grant',
      'revoke',
      'vacuum',
      'analyze',
      'reindex',
      'refresh',
      'comment',
    ]).has(firstKeyword)
  ) {
    return { sql, kind: 'admin' }
  }

  throw new Error(
    'SQL mode only allows read-only statements, writes, and admin statements',
  )
}

export async function listConnections(
  workspaceId: string,
  dataDir: string,
): Promise<ConnectionSummary[]> {
  const connections = await migrateLegacyPasswords(
    workspaceId,
    dataDir,
    await readConnections(dataDir),
  )

  return sortConnections(connections).map((connection) => toSummary(connection))
}

export async function resolveConnectionId(
  workspaceId: string,
  dataDir: string,
  requestedConnectionId?: unknown,
): Promise<string> {
  const requested = asTrimmedString(requestedConnectionId)
  if (requested) {
    await getStoredConnection(workspaceId, dataDir, requested)
    return requested
  }

  const preferences = await getPreferences(dataDir)
  if (preferences.activeConnectionId) {
    const preferred = await getStoredConnection(
      workspaceId,
      dataDir,
      preferences.activeConnectionId,
    ).catch(() => null)
    if (preferred) return preferences.activeConnectionId
  }

  const connections = await listConnections(workspaceId, dataDir)
  const firstConnectionId = connections[0]?.id
  if (!firstConnectionId) {
    throw new Error('No saved database connections')
  }

  return firstConnectionId
}

export async function getPreferences(
  dataDir: string,
): Promise<DbBrowserPreferences> {
  const saved = await readJson<Partial<DbBrowserPreferences>>(
    preferencesPath(dataDir),
    {},
  )
  return normalizePreferences(saved)
}

export async function savePreferences(
  dataDir: string,
  value: unknown,
): Promise<DbBrowserPreferences> {
  const current = await getPreferences(dataDir)
  const next = normalizePreferences({
    ...current,
    ...(value && typeof value === 'object' ? value : {}),
  })

  await writeJson(preferencesPath(dataDir), next)
  return next
}

export async function getSqlWorkspace(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
): Promise<SqlWorkspaceResponse> {
  await getStoredConnection(workspaceId, dataDir, connectionId)

  return readJson<SqlWorkspaceResponse>(
    sqlWorkspacePath(dataDir, connectionId),
    {
      connectionId,
      activeTabId: null,
      tabs: [],
      updatedAt: new Date().toISOString(),
    },
  )
}

export async function saveSqlWorkspace(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
  value: unknown,
): Promise<SqlWorkspaceResponse> {
  await getStoredConnection(workspaceId, dataDir, connectionId)

  const workspace = parseSqlWorkspaceInput(connectionId, value)
  await writeJson(sqlWorkspacePath(dataDir, connectionId), workspace)
  return workspace
}

export async function createSqlWorkspaceTab(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
  value: unknown,
): Promise<{ workspace: SqlWorkspaceResponse; tab: SqlEditorTab }> {
  await getStoredConnection(workspaceId, dataDir, connectionId)

  const body =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const current = await getSqlWorkspace(workspaceId, dataDir, connectionId)
  if (current.tabs.length >= MAX_SQL_TABS) {
    throw new Error(`A SQL workspace can contain at most ${MAX_SQL_TABS} tabs`)
  }

  const tab = createSqlTabRecord(
    current.tabs.length + 1,
    normalizeOptionalString(body.title),
    typeof body.sql === 'string' ? body.sql : '',
  )
  const shouldSelect = body.select !== false
  const nextWorkspace: SqlWorkspaceResponse = {
    connectionId,
    tabs: [...current.tabs, tab],
    activeTabId: shouldSelect ? tab.id : current.activeTabId,
    updatedAt: new Date().toISOString(),
  }

  await writeJson(sqlWorkspacePath(dataDir, connectionId), nextWorkspace)
  return { workspace: nextWorkspace, tab }
}

export async function updateSqlWorkspaceTab(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
  tabId: unknown,
  value: unknown,
): Promise<{ workspace: SqlWorkspaceResponse; tab: SqlEditorTab }> {
  await getStoredConnection(workspaceId, dataDir, connectionId)

  const normalizedTabId = asTrimmedString(tabId)
  if (!normalizedTabId) {
    throw new Error('SQL tab id is required')
  }

  const body =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const current = await getSqlWorkspace(workspaceId, dataDir, connectionId)
  let updatedTab: SqlEditorTab | null = null

  const tabs = current.tabs.map((tab) => {
    if (tab.id !== normalizedTabId) return tab

    const nextSql = typeof body.sql === 'string' ? body.sql : tab.sql
    if (nextSql.length > MAX_SQL_LENGTH) {
      throw new Error('SQL tab content is too large')
    }

    updatedTab = {
      ...tab,
      title:
        typeof body.title === 'string'
          ? (normalizeOptionalString(body.title) ?? 'SQL Query')
          : tab.title,
      sql: nextSql,
      updatedAt: new Date().toISOString(),
    }

    return updatedTab
  })

  if (!updatedTab) {
    throw new Error('SQL tab not found')
  }

  const shouldSelect = body.select === true
  const nextWorkspace: SqlWorkspaceResponse = {
    connectionId,
    tabs,
    activeTabId: shouldSelect ? normalizedTabId : current.activeTabId,
    updatedAt: new Date().toISOString(),
  }

  await writeJson(sqlWorkspacePath(dataDir, connectionId), nextWorkspace)
  return { workspace: nextWorkspace, tab: updatedTab }
}

export async function editSqlWorkspaceTab(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
  value: unknown,
): Promise<{
  workspace: SqlWorkspaceResponse
  tab: SqlEditorTab
  replacements: number
}> {
  await getStoredConnection(workspaceId, dataDir, connectionId)

  const body =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const oldString = typeof body.oldString === 'string' ? body.oldString : ''
  const newString = typeof body.newString === 'string' ? body.newString : ''
  const replaceAll = body.replaceAll === true

  if (!oldString) {
    throw new Error('oldString is required')
  }

  const current = await getSqlWorkspace(workspaceId, dataDir, connectionId)
  const requestedTabId = asTrimmedString(body.tabId)
  const targetTabId = requestedTabId || current.activeTabId

  if (!targetTabId) {
    throw new Error('SQL tab id is required')
  }

  let updatedTab: SqlEditorTab | null = null
  let replacements = 0

  const tabs = current.tabs.map((tab) => {
    if (tab.id !== targetTabId) return tab

    if (!tab.sql.includes(oldString)) {
      throw new Error('oldString not found in SQL tab')
    }

    replacements = tab.sql.split(oldString).length - 1
    if (!replaceAll && replacements > 1) {
      throw new Error(
        `oldString found ${replacements} times - must be unique or use replaceAll`,
      )
    }

    const nextSql = replaceAll
      ? tab.sql.replaceAll(oldString, newString)
      : tab.sql.replace(oldString, newString)

    if (nextSql.length > MAX_SQL_LENGTH) {
      throw new Error('SQL tab content is too large')
    }

    updatedTab = {
      ...tab,
      sql: nextSql,
      updatedAt: new Date().toISOString(),
    }

    return updatedTab
  })

  if (!updatedTab) {
    throw new Error('SQL tab not found')
  }

  const shouldSelect = body.select !== false
  const nextWorkspace: SqlWorkspaceResponse = {
    connectionId,
    tabs,
    activeTabId: shouldSelect ? targetTabId : current.activeTabId,
    updatedAt: new Date().toISOString(),
  }

  await writeJson(sqlWorkspacePath(dataDir, connectionId), nextWorkspace)
  return { workspace: nextWorkspace, tab: updatedTab, replacements }
}

export async function selectSqlWorkspaceTab(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
  tabId: unknown,
): Promise<SqlWorkspaceResponse> {
  await getStoredConnection(workspaceId, dataDir, connectionId)

  const normalizedTabId = asTrimmedString(tabId)
  if (!normalizedTabId) {
    throw new Error('SQL tab id is required')
  }

  const current = await getSqlWorkspace(workspaceId, dataDir, connectionId)
  if (!current.tabs.some((tab) => tab.id === normalizedTabId)) {
    throw new Error('SQL tab not found')
  }

  const nextWorkspace: SqlWorkspaceResponse = {
    ...current,
    activeTabId: normalizedTabId,
    updatedAt: new Date().toISOString(),
  }

  await writeJson(sqlWorkspacePath(dataDir, connectionId), nextWorkspace)
  return nextWorkspace
}

export async function listQueryHistory(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
): Promise<QueryHistoryItem[]> {
  await getStoredConnection(workspaceId, dataDir, connectionId)
  return readJson<QueryHistoryItem[]>(
    queryHistoryPath(dataDir, connectionId),
    [],
  )
}

export async function appendQueryHistory(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
  value: unknown,
): Promise<QueryHistoryItem[]> {
  await getStoredConnection(workspaceId, dataDir, connectionId)

  const input = parseQueryHistoryInput(value)
  const item: QueryHistoryItem = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...input,
  }
  const existing = await readJson<QueryHistoryItem[]>(
    queryHistoryPath(dataDir, connectionId),
    [],
  )
  const next = [item, ...existing].slice(0, MAX_QUERY_HISTORY_ITEMS)

  await writeJson(queryHistoryPath(dataDir, connectionId), next)
  return next
}

export async function saveConnection(
  workspaceId: string,
  dataDir: string,
  input: ConnectionInput,
): Promise<ConnectionSummary> {
  const existing = await migrateLegacyPasswords(
    workspaceId,
    dataDir,
    await readConnections(dataDir),
  )
  const now = new Date().toISOString()
  const id = randomUUID()
  const credentialId = connectionCredentialId(id)
  const secretName = connectionSecretName(id)

  await upsertPostgresCredential({
    workspaceId,
    credentialId,
    secretName,
    connectionUrl: buildPostgresUrl(input, input.password),
    host: input.host,
    port: input.port,
    maxPolicyMode: input.policyMode,
  })

  const nextConnection: StoredConnection = {
    id,
    engine: 'postgres',
    name: input.name,
    host: input.host,
    port: input.port,
    database: input.database,
    user: input.user,
    ssl: input.ssl,
    color: input.color,
    environment: input.environment,
    policyMode: input.policyMode,
    credentialId,
    secretName,
    createdAt: now,
    updatedAt: now,
  }

  await writeConnections(
    dataDir,
    sortConnections([...existing, nextConnection]),
  )
  return toSummary(nextConnection)
}

export async function updateConnection(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
  input: ConnectionInput,
): Promise<ConnectionSummary> {
  const connections = await migrateLegacyPasswords(
    workspaceId,
    dataDir,
    await readConnections(dataDir),
  )
  const index = connections.findIndex(
    (connection) => connection.id === connectionId,
  )

  if (index < 0) {
    throw new Error('Saved connection not found')
  }

  const current = connections[index]
  const credentialChanged =
    current.host !== input.host ||
    current.port !== input.port ||
    current.database !== input.database ||
    current.user !== input.user ||
    current.ssl !== input.ssl

  const passwordProvided =
    typeof input.password === 'string' && input.password.length > 0
  const credentialId =
    current.credentialId || connectionCredentialId(connectionId)
  const secretName = current.secretName || connectionSecretName(connectionId)

  if ((credentialChanged || passwordProvided) && !passwordProvided) {
    throw new Error('Password is required to update connection credentials')
  }

  if (credentialChanged || passwordProvided) {
    await upsertPostgresCredential({
      workspaceId,
      credentialId,
      secretName,
      connectionUrl: buildPostgresUrl(input, input.password),
      host: input.host,
      port: input.port,
      maxPolicyMode: input.policyMode,
    })
  }

  const nextConnection: StoredConnection = {
    ...current,
    name: input.name,
    host: input.host,
    port: input.port,
    database: input.database,
    user: input.user,
    ssl: input.ssl,
    color: input.color,
    environment: input.environment,
    policyMode: input.policyMode,
    credentialId:
      credentialChanged || passwordProvided
        ? credentialId
        : current.credentialId,
    secretName:
      credentialChanged || passwordProvided ? secretName : current.secretName,
    passwordSecretName:
      credentialChanged || passwordProvided
        ? undefined
        : current.passwordSecretName,
    password: undefined,
    updatedAt: new Date().toISOString(),
  }
  const nextConnections = [...connections]
  nextConnections[index] = nextConnection
  await writeConnections(dataDir, sortConnections(nextConnections))

  return toSummary(nextConnection)
}

export async function removeConnection(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
): Promise<void> {
  const existing = await migrateLegacyPasswords(
    workspaceId,
    dataDir,
    await readConnections(dataDir),
  )
  const target = existing.find((connection) => connection.id === connectionId)
  const next = existing.filter((connection) => connection.id !== connectionId)

  if (!target) {
    throw new Error('Saved connection not found')
  }

  if (target.credentialId) {
    await deleteCredentialIfExists(target.credentialId)
  }

  if (target.secretName) {
    await deleteWorkspaceSecret(workspaceId, target.secretName)
  } else if (target.passwordSecretName) {
    await deleteWorkspaceSecret(workspaceId, target.passwordSecretName)
  }

  await writeConnections(dataDir, next)
  await rm(sqlWorkspacePath(dataDir, connectionId), { force: true }).catch(
    () => undefined,
  )
  await rm(queryHistoryPath(dataDir, connectionId), { force: true }).catch(
    () => undefined,
  )
}

export async function testConnection(
  workspaceId: string,
  input: ConnectionInput,
): Promise<ConnectionTestResponse> {
  const id = randomUUID()
  const credentialId = `db-browser-test-${id}`
  const secretName = `DB_BROWSER_TEST_${id}_POSTGRES_URL`

  try {
    await upsertPostgresCredential({
      workspaceId,
      credentialId,
      secretName,
      connectionUrl: buildPostgresUrl(input, input.password),
      host: input.host,
      port: input.port,
      maxPolicyMode: input.policyMode,
    })

    const result = await invokePostgresCapability<{
      database?: string
      user?: string
      version?: string
    }>(
      workspaceId,
      credentialId,
      'postgres/test-connection',
      aivaultReadOnlyPolicyBody(),
    )

    return {
      database: result.database ?? input.database,
      user: result.user ?? input.user,
      version: result.version ?? 'Unknown PostgreSQL version',
    }
  } finally {
    await deleteCredentialIfExists(credentialId).catch(() => undefined)
    await deleteWorkspaceSecret(workspaceId, secretName).catch(() => undefined)
  }
}

export async function testSavedConnection(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
  input: ConnectionInput,
): Promise<ConnectionTestResponse> {
  const { connection, credentialId } = await getConnectionCredential(
    workspaceId,
    dataDir,
    connectionId,
  )
  const credentialChanged =
    connection.host !== input.host ||
    connection.port !== input.port ||
    connection.database !== input.database ||
    connection.user !== input.user ||
    connection.ssl !== input.ssl
  const passwordProvided =
    typeof input.password === 'string' && input.password.length > 0

  if (!credentialChanged && !passwordProvided) {
    const result = await invokePostgresCapability<{
      database?: string
      user?: string
      version?: string
    }>(
      workspaceId,
      credentialId,
      'postgres/test-connection',
      aivaultReadOnlyPolicyBody(),
    )

    return {
      database: result.database ?? connection.database,
      user: result.user ?? connection.user,
      version: result.version ?? 'Unknown PostgreSQL version',
    }
  }

  if (credentialChanged && !passwordProvided) {
    throw new Error(
      'Password is required to test updated connection credentials',
    )
  }

  return testConnection(workspaceId, input)
}

export async function getExplorer(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
  timeoutMs?: number,
): Promise<ExplorerSchema[]> {
  const { connection, credentialId } = await getConnectionCredential(
    workspaceId,
    dataDir,
    connectionId,
  )
  const result = await invokePostgresCapability<AivaultQueryResult>(
    workspaceId,
    credentialId,
    'postgres/query',
    {
      sql: EXPLORER_QUERY,
      limit: 1000,
      ...aivaultTimeoutBody(timeoutMs),
      ...aivaultReadOnlyPolicyBody(),
    },
  )
  const schemaMap = new Map<string, ExplorerSchema>()

  for (const row of result.rows as AivaultTableRow[]) {
    const schemaName = row.schema_name ?? row.schema
    const tableName = row.table_name ?? row.name
    if (!schemaName || !tableName) continue

    const existingSchema = schemaMap.get(schemaName) ?? {
      name: schemaName,
      tables: [],
    }

    existingSchema.tables.push({
      name: tableName,
      type: row.table_type ?? row.type ?? 'TABLE',
    })

    schemaMap.set(schemaName, existingSchema)
  }

  return Array.from(schemaMap.values())
}

export async function describeTable(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
  schema: string,
  table: string,
  timeoutMs?: number,
): Promise<{
  schema: string
  table: string
  columns: Array<{ name: string; dataType: string; nullable: boolean }>
}> {
  const { connection, credentialId } = await getConnectionCredential(
    workspaceId,
    dataDir,
    connectionId,
  )
  const normalizedSchema = asTrimmedString(schema)
  const normalizedTable = asTrimmedString(table)

  if (!normalizedSchema || !normalizedTable) {
    throw new Error('Schema and table are required')
  }

  const described = await invokePostgresCapability<{
    columns: AivaultColumn[]
  }>(workspaceId, credentialId, 'postgres/describe-table', {
    schema: normalizedSchema,
    table: normalizedTable,
    ...aivaultTimeoutBody(timeoutMs),
    ...aivaultReadOnlyPolicyBody(),
  })

  return {
    schema: normalizedSchema,
    table: normalizedTable,
    columns: described.columns.map((column) => ({
      name: column.name,
      dataType: column.dataType ?? column.data_type ?? 'unknown',
      nullable: Boolean(column.nullable),
    })),
  }
}

export async function searchSchema(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
  query: unknown,
  limitValue?: unknown,
): Promise<{
  connectionId: string
  matches: Array<{ schema: string; table: string; type: string }>
}> {
  const needle = asTrimmedString(query).toLowerCase()
  if (!needle) {
    throw new Error('Search query is required')
  }

  const limit = normalizeLimit(limitValue, 25, 100)
  const schemas = await getExplorer(workspaceId, dataDir, connectionId)
  const matches = schemas.flatMap((schema) =>
    schema.tables
      .filter((table) =>
        `${schema.name}.${table.name}`.toLowerCase().includes(needle),
      )
      .map((table) => ({
        schema: schema.name,
        table: table.name,
        type: table.type,
      })),
  )

  return {
    connectionId,
    matches: matches.slice(0, limit),
  }
}

export async function previewTable(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
  schema: string,
  table: string,
  limit: number,
  offset: number,
  timeoutMs?: number,
): Promise<TablePreviewResponse> {
  const normalizedSchema = asTrimmedString(schema)
  const normalizedTable = asTrimmedString(table)

  if (!normalizedSchema || !normalizedTable) {
    throw new Error('Schema and table are required')
  }

  const described = await describeTable(
    workspaceId,
    dataDir,
    connectionId,
    normalizedSchema,
    normalizedTable,
    timeoutMs,
  )

  if (!described.columns.length) {
    throw new Error('Table not found')
  }

  const { connection, credentialId } = await getConnectionCredential(
    workspaceId,
    dataDir,
    connectionId,
  )
  const preview = await invokePostgresCapability<AivaultPreviewResult>(
    workspaceId,
    credentialId,
    'postgres/preview-table',
    {
      schema: normalizedSchema,
      table: normalizedTable,
      limit: limit + 1,
      offset,
      ...aivaultTimeoutBody(timeoutMs),
      ...aivaultReadOnlyPolicyBody(),
    },
  )
  const normalizedRows = normalizeRows(preview.rows)
  const rows = normalizedRows.slice(0, limit)

  return {
    schema: normalizedSchema,
    table: normalizedTable,
    columns: described.columns,
    rows,
    rowCount: rows.length,
    limit,
    offset,
    hasMore: normalizedRows.length > limit,
  }
}

export async function runReadOnlyQuery(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
  rawSql: string,
  timeoutMs?: number,
): Promise<QueryResultResponse> {
  const { connection, credentialId } = await getConnectionCredential(
    workspaceId,
    dataDir,
    connectionId,
  )
  const sql = normalizeReadOnlySql(rawSql)
  const result = await invokePostgresCapability<AivaultQueryResult>(
    workspaceId,
    credentialId,
    'postgres/query',
    {
      sql,
      limit: 1000,
      ...aivaultTimeoutBody(timeoutMs),
      ...aivaultReadOnlyPolicyBody(),
    },
  )
  const rows = normalizeRows(result.rows)

  return {
    columns: result.columns ?? Object.keys(rows[0] ?? {}),
    rows,
    rowCount: result.rowCount ?? result.row_count ?? rows.length,
    executionMs: result.executionMs ?? result.execution_ms ?? 0,
    command: result.command ?? 'SELECT',
    readOnly: result.readOnly ?? result.read_only ?? true,
  }
}

export async function exportReadOnlyQuery(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
  rawSql: string,
  options: {
    format?: unknown
    filename?: unknown
    timeoutMs?: number
  } = {},
): Promise<QueryExportResponse> {
  const { credentialId } = await getConnectionCredential(
    workspaceId,
    dataDir,
    connectionId,
  )
  const format = normalizeDataFormat(options.format)
  const sql = normalizeReadOnlySql(rawSql)
  const result = await invokePostgresCapability<AivaultExportResult>(
    workspaceId,
    credentialId,
    'postgres/export-query',
    {
      sql,
      format,
      limit: DEFAULT_EXPORT_LIMIT,
      maxExportBytes: MAX_EXPORT_BYTES,
      ...aivaultTimeoutBody(options.timeoutMs),
      ...aivaultReadOnlyPolicyBody(),
    },
  )

  return {
    filename: exportFilename(options.filename, format),
    format,
    content: result.content,
    bytes: result.bytes ?? Buffer.byteLength(result.content, 'utf8'),
    rowCount: result.rowCount ?? result.row_count ?? 0,
    executionMs: result.executionMs ?? result.execution_ms ?? 0,
  }
}

export async function importRows(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
  value: unknown,
  timeoutMs?: number,
): Promise<ImportRowsResponse> {
  if (!value || typeof value !== 'object') {
    throw new Error('Import details are required')
  }
  const body = value as Record<string, unknown>
  const schema = asTrimmedString(body.schema)
  const table = asTrimmedString(body.table)
  if (!schema || !table) {
    throw new Error('Schema and table are required')
  }

  const { connection, credentialId } = await getConnectionCredential(
    workspaceId,
    dataDir,
    connectionId,
  )
  const policyMode = aivaultPolicyMode(connection)
  if (policyMode === 'read-only') {
    throw new Error(
      'This connection is read-only. Enable write access before importing rows.',
    )
  }

  const format = normalizeDataFormat(body.format)
  const sourceContent = normalizeSourceContent(body.sourceContent)
  const sourcePath = await writeTemporaryImportSource(sourceContent, format)
  const maxRows = normalizePositiveInteger(
    body.maxRows,
    DEFAULT_IMPORT_MAX_ROWS,
    1,
    MAX_IMPORT_ROWS,
  )

  try {
    const result = await invokePostgresCapability<AivaultImportResult>(
      workspaceId,
      credentialId,
      'postgres/import-rows',
      {
        policyMode,
        schema,
        table,
        columns: normalizeImportColumns(body.columns),
        format,
        sourcePath,
        maxRows,
        maxImportBytes: MAX_IMPORT_BYTES,
        ...aivaultTimeoutBody(timeoutMs),
      },
    )

    return {
      affectedRows: result.affectedRows ?? result.affected_rows ?? 0,
      rowCount: result.rowCount ?? result.row_count ?? 0,
      sourceBytes: result.sourceBytes ?? result.source_bytes ?? 0,
      executionMs: result.executionMs ?? result.execution_ms ?? 0,
    }
  } finally {
    await rm(sourcePath, { force: true }).catch(() => undefined)
  }
}

export async function runSqlStatement(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
  rawSql: string,
  options: {
    timeoutMs?: number
  } = {},
): Promise<QueryResultResponse> {
  const { connection, credentialId } = await getConnectionCredential(
    workspaceId,
    dataDir,
    connectionId,
  )
  const classified = classifySqlExecution(rawSql)

  if (classified.kind === 'read-only') {
    return runReadOnlyQuery(
      workspaceId,
      dataDir,
      connectionId,
      classified.sql,
      options.timeoutMs,
    )
  }

  const policyMode = aivaultPolicyMode(connection)
  if (classified.kind === 'write' && policyMode === 'read-only') {
    throw new Error(
      'This connection is read-only. Enable write access in connection settings.',
    )
  }
  if (classified.kind === 'admin' && policyMode !== 'admin') {
    throw new Error('This connection is not allowed to run admin statements.')
  }

  const result = await invokePostgresCapability<AivaultExecuteResult>(
    workspaceId,
    credentialId,
    classified.kind === 'write' ? 'postgres/execute' : 'postgres/admin',
    {
      sql: classified.sql,
      policyMode,
      maxAffectedRows: 100,
      ...aivaultTimeoutBody(options.timeoutMs),
    },
  )
  const affectedRows = result.affectedRows ?? result.affected_rows ?? 0
  const rows = Array.isArray(result.rows) ? result.rows : []
  const columns = Array.isArray(result.columns)
    ? result.columns.filter(
        (column): column is string => typeof column === 'string',
      )
    : Object.keys(rows[0] ?? {})
  const rowCount = result.rowCount ?? result.row_count ?? affectedRows

  return {
    columns,
    rows,
    rowCount,
    affectedRows,
    maxAffectedRows: result.maxAffectedRows ?? result.max_affected_rows,
    executionMs: result.executionMs ?? result.execution_ms ?? 0,
    command:
      result.command ?? (classified.kind === 'write' ? 'WRITE' : 'ADMIN'),
    readOnly: result.readOnly ?? result.read_only ?? false,
    admin: Boolean(result.admin),
  }
}
