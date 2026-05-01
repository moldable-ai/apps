import type { ConnectionFormState } from '../types'

export const DEFAULT_SQL =
  'select current_database() as database, current_user as user, now() as connected_at;'

export const PREVIEW_LIMIT = 100
export const CONNECTION_COLORS = [
  '#e35261',
  '#ee6f4b',
  '#e98b2c',
  '#e3a42f',
  '#a5c94f',
  '#68bf50',
  '#24bf93',
  '#28b6d2',
  '#4f8dff',
  '#6977f2',
  '#9b72ef',
  '#bd65d8',
] as const

export const CONNECTION_ENVIRONMENTS = [
  'local',
  'testing',
  'development',
  'staging',
  'production',
] as const

export const CONNECTION_POLICY_MODES = ['read-only', 'write', 'admin'] as const

export type SqlExecutionKind = 'read-only' | 'write' | 'admin'

export function blankConnectionForm(): ConnectionFormState {
  return {
    connectionUrl: '',
    name: '',
    host: 'localhost',
    port: '5432',
    database: '',
    user: '',
    password: '',
    ssl: false,
    color: CONNECTION_COLORS[0],
    environment: null,
    policyMode: 'read-only',
  }
}

export function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`
}

export function ensureSqlTerminator(sql: string) {
  const trimmedEnd = sql.trimEnd()
  if (!trimmedEnd) return ''
  return trimmedEnd.endsWith(';') ? trimmedEnd : `${trimmedEnd};`
}

export function sqlExecutionKind(sql: string): SqlExecutionKind {
  const trimmed = sql.trim().replace(/;+$/g, '').trim()
  const firstKeyword = trimmed.match(/^[a-z]+/i)?.[0].toLowerCase()
  if (!firstKeyword) return 'read-only'
  if (
    firstKeyword === 'insert' ||
    firstKeyword === 'update' ||
    firstKeyword === 'delete'
  ) {
    return 'write'
  }
  if (
    [
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
    ].includes(firstKeyword)
  ) {
    return 'admin'
  }
  return 'read-only'
}

export async function formatSql(sql: string) {
  const trimmed = sql.trim()
  if (!trimmed) return ''

  try {
    const { format } = await import('sql-formatter')
    const formatted = format(trimmed, {
      language: 'postgresql',
      keywordCase: 'lower',
      tabWidth: 2,
      expressionWidth: 80,
      linesBetweenQueries: 1,
    }).trim()

    return ensureSqlTerminator(formatted)
  } catch {
    return sql
  }
}

function decodeUrlPart(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function parsePostgresConnectionUrl(
  connectionUrl: string,
): ConnectionFormState {
  const trimmed = connectionUrl.trim()
  const url = new URL(trimmed)

  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error('Use a postgres:// or postgresql:// URL')
  }

  const database = decodeUrlPart(url.pathname.replace(/^\/+/, ''))
  const sslMode = url.searchParams.get('sslmode')?.toLowerCase()
  const tlsMode =
    url.searchParams.get('tLSMode') ?? url.searchParams.get('tlsMode')
  const name = url.searchParams.get('name')?.trim()
  const rawColor = url.searchParams.get('statusColor')?.trim()
  const rawEnvironment = url.searchParams.get('env')?.trim().toLowerCase()
  const rawPolicyMode = url.searchParams.get('policyMode')?.trim().toLowerCase()
  const color = rawColor
    ? `#${rawColor.replace(/^#/, '').slice(0, 6)}`
    : CONNECTION_COLORS[0]
  const environment =
    rawEnvironment &&
    CONNECTION_ENVIRONMENTS.includes(
      rawEnvironment as (typeof CONNECTION_ENVIRONMENTS)[number],
    )
      ? rawEnvironment
      : ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
        ? 'local'
        : null
  const policyMode =
    rawPolicyMode &&
    CONNECTION_POLICY_MODES.includes(
      rawPolicyMode as (typeof CONNECTION_POLICY_MODES)[number],
    )
      ? (rawPolicyMode as (typeof CONNECTION_POLICY_MODES)[number])
      : 'read-only'

  return {
    connectionUrl: trimmed,
    name: name || (database ? `${database} @ ${url.hostname}` : url.hostname),
    host: url.hostname,
    port: url.port || '5432',
    database,
    user: decodeUrlPart(url.username),
    password: decodeUrlPart(url.password),
    ssl:
      sslMode === 'require' ||
      sslMode === 'verify-ca' ||
      sslMode === 'verify-full' ||
      (tlsMode !== null && tlsMode !== '' && tlsMode !== '0'),
    color,
    environment,
    policyMode,
  }
}

function encodeUrlPart(value: string) {
  return encodeURIComponent(value)
}

export function buildPostgresConnectionUrl(form: ConnectionFormState) {
  const user = encodeUrlPart(form.user)
  const password = form.password ? `:${encodeUrlPart(form.password)}` : ''
  const auth = user ? `${user}${password}@` : ''
  const port = form.port && form.port !== '5432' ? `:${form.port}` : ''
  const database = form.database
    .split('/')
    .filter(Boolean)
    .map((part) => encodeUrlPart(part))
    .join('/')
  const params = new URLSearchParams({
    statusColor: (form.color ?? CONNECTION_COLORS[0])
      .replace(/^#/, '')
      .toUpperCase(),
    env: form.environment ?? '',
    policyMode: form.policyMode ?? 'read-only',
    name: form.name,
    tLSMode: form.ssl ? '1' : '0',
    usePrivateKey: 'false',
    safeModeLevel: '0',
    advancedSafeModeLevel: '0',
    driverVersion: '0',
    lazyload: 'false',
  })

  return `postgresql://${auth}${form.host}${port}/${database}?${params.toString()}`
}

export function connectionPayload(form: ConnectionFormState) {
  return {
    name: form.name,
    host: form.host,
    port: Number(form.port),
    database: form.database,
    user: form.user,
    password: form.password,
    ssl: form.ssl,
    color: form.color,
    environment: form.environment,
    policyMode: form.policyMode,
  }
}
