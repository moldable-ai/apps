import type { Dashboard, DashboardChart } from '../shared/types'
import {
  appendQueryHistory,
  createDashboard,
  createDashboardChart,
  createSqlWorkspaceTab,
  describeTable,
  editSqlWorkspaceTab,
  exportReadOnlyQuery,
  getDashboardWorkspace,
  getExplorer,
  getPreferences,
  getSqlWorkspace,
  importRows,
  listConnections,
  listQueryHistory,
  parseConnectionInput,
  previewTable,
  removeConnection,
  removeDashboard,
  removeDashboardChart,
  resolveConnectionId,
  runReadOnlyQuery,
  runSqlStatement,
  saveConnection,
  saveDashboardWorkspace,
  savePreferences,
  saveSqlWorkspace,
  searchSchema,
  selectDashboard,
  selectSqlWorkspaceTab,
  testConnection,
  testSavedConnection,
  updateConnection,
  updateDashboard,
  updateDashboardChart,
  updateSqlWorkspaceTab,
} from './db'
import { getDataDir, getWorkspaceId, jsonError } from './moldable'
import { Hono } from 'hono'

export const app = new Hono()

function requiredWorkspaceId(workspaceId?: string) {
  return workspaceId ?? 'personal'
}

type RpcStatus = 400 | 404 | 500

function rpcError(code: string, message: string, status: RpcStatus = 400) {
  return {
    status,
    body: {
      ok: false,
      error: {
        code,
        message,
      },
    },
  }
}

function paramsObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {}
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`
}

function ensureSqlTerminator(sql: string) {
  const trimmedEnd = sql.trimEnd()
  if (!trimmedEnd) return ''
  return trimmedEnd.endsWith(';') ? trimmedEnd : `${trimmedEnd};`
}

function queryHistoryTitle(sql: string) {
  return sql.split('\n')[0]?.trim().slice(0, 80) || 'SQL query'
}

function normalizedLookup(value: string) {
  return value.trim().toLowerCase().replaceAll(/\s+/g, ' ')
}

function titleMatches(title: string, query: string) {
  return normalizedLookup(title) === normalizedLookup(query)
}

function previewSql(
  schema: string,
  table: string,
  limit: number,
  offset: number,
) {
  const base = `select * from ${quoteIdentifier(schema)}.${quoteIdentifier(table)} limit ${limit}`
  return ensureSqlTerminator(offset > 0 ? `${base} offset ${offset}` : base)
}

async function resolveRpcConnectionId(
  workspaceId: string,
  dataDir: string,
  params: Record<string, unknown>,
) {
  return resolveConnectionId(workspaceId, dataDir, params.connectionId)
}

function resolveNamedDashboard(
  workspace: { activeDashboardId: string | null; dashboards: Dashboard[] },
  params: Record<string, unknown>,
) {
  const dashboardId =
    typeof params.dashboardId === 'string' ? params.dashboardId.trim() : ''
  if (dashboardId) return dashboardId

  const dashboardName =
    typeof params.dashboardName === 'string'
      ? params.dashboardName.trim()
      : typeof params.currentDashboardTitle === 'string'
        ? params.currentDashboardTitle.trim()
        : ''
  if (dashboardName) {
    const matches = workspace.dashboards.filter((dashboard) =>
      titleMatches(dashboard.title, dashboardName),
    )
    if (matches.length === 1) return matches[0].id
    if (matches.length > 1) {
      throw new Error(
        `Multiple dashboards are named "${dashboardName}". Use dashboardId.`,
      )
    }
    throw new Error(`Dashboard "${dashboardName}" not found`)
  }

  if (workspace.activeDashboardId) return workspace.activeDashboardId
  if (workspace.dashboards.length === 1) return workspace.dashboards[0].id
  throw new Error('Dashboard id or dashboardName is required')
}

function resolveNamedChart(
  dashboard: Dashboard,
  params: Record<string, unknown>,
) {
  const chartId =
    typeof params.chartId === 'string' ? params.chartId.trim() : ''
  if (chartId) return chartId

  const chartName =
    typeof params.chartName === 'string'
      ? params.chartName.trim()
      : typeof params.currentChartTitle === 'string'
        ? params.currentChartTitle.trim()
        : ''
  if (!chartName) throw new Error('Chart id or chartName is required')

  const matches = dashboard.charts.filter((chart) =>
    titleMatches(chart.title, chartName),
  )
  if (matches.length === 1) return matches[0].id
  if (matches.length > 1) {
    throw new Error(`Multiple charts are named "${chartName}". Use chartId.`)
  }
  throw new Error(`Chart "${chartName}" not found`)
}

async function resolveRpcDashboardId(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
  params: Record<string, unknown>,
) {
  const workspace = await getDashboardWorkspace(
    workspaceId,
    dataDir,
    connectionId,
  )
  return resolveNamedDashboard(workspace, params)
}

async function resolveRpcDashboardAndChartId(
  workspaceId: string,
  dataDir: string,
  connectionId: string,
  params: Record<string, unknown>,
) {
  const workspace = await getDashboardWorkspace(
    workspaceId,
    dataDir,
    connectionId,
  )
  const dashboardId = resolveNamedDashboard(workspace, params)
  const dashboard = workspace.dashboards.find((item) => item.id === dashboardId)
  if (!dashboard) throw new Error('Dashboard not found')

  return {
    dashboardId,
    chartId: resolveNamedChart(dashboard, params),
    dashboard,
  }
}

function editDashboardChartSql(
  chart: DashboardChart,
  params: Record<string, unknown>,
) {
  const oldString = typeof params.oldString === 'string' ? params.oldString : ''
  const newString = typeof params.newString === 'string' ? params.newString : ''
  const replaceAll = params.replaceAll === true

  if (!oldString) throw new Error('oldString is required')

  const occurrences = chart.sql.split(oldString).length - 1
  if (occurrences === 0) throw new Error('oldString was not found in chart SQL')
  if (occurrences > 1 && !replaceAll) {
    throw new Error('oldString occurs multiple times. Set replaceAll to true.')
  }

  return {
    ...chart,
    sql: replaceAll
      ? chart.sql.replaceAll(oldString, newString)
      : chart.sql.replace(oldString, newString),
  }
}

app.get('/api/moldable/health', (c) => {
  return c.json({
    appId: process.env.MOLDABLE_APP_ID ?? 'db-browser',
    status: 'ok',
  })
})

app.get('/api/moldable/today', async (c) => {
  const items: unknown[] = []
  let resume: unknown = null
  const generatedAt = new Date().toISOString()

  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const dataDir = getDataDir(c)

    const connections = await listConnections(workspaceId, dataDir)
    if (connections.length === 0) {
      return c.json({ items, resume, generatedAt })
    }

    const connectionId = await resolveConnectionId(workspaceId, dataDir)
    const [workspace, dashboardWorkspace] = await Promise.all([
      getSqlWorkspace(workspaceId, dataDir, connectionId),
      getDashboardWorkspace(workspaceId, dataDir, connectionId),
    ])
    const activeTab =
      workspace.tabs.find((tab) => tab.id === workspace.activeTabId) ?? null
    const activeDashboard =
      dashboardWorkspace.dashboards.find(
        (d) => d.id === dashboardWorkspace.activeDashboardId,
      ) ?? null

    // Resume whichever the user touched most recently: the dashboard they were
    // viewing (e.g. "Daily Analytics") or an in-progress SQL query tab.
    const candidates: { resume: Record<string, unknown>; ts: number }[] = []

    if (activeDashboard) {
      const n = activeDashboard.charts.length
      candidates.push({
        resume: {
          title: activeDashboard.title.trim() || 'Untitled dashboard',
          subtitle: n > 0 ? `${n} chart${n === 1 ? '' : 's'}` : 'Dashboard',
          icon: '📊',
          lastTouchedAt: activeDashboard.updatedAt,
        },
        ts: Date.parse(activeDashboard.updatedAt) || 0,
      })
    }

    if (activeTab && activeTab.sql.trim()) {
      const tabTitle = activeTab.title.trim() || 'Untitled query'
      const connection =
        connections.find((item) => item.id === connectionId) ?? null
      const connectionLabel = connection
        ? connection.environment
          ? `${connection.name} · ${connection.environment}`
          : connection.name
        : null

      const history = await listQueryHistory(workspaceId, dataDir, connectionId)
      const lastRun = history.find(
        (entry) =>
          entry.rowCount != null && titleMatches(entry.title, tabTitle),
      )
      const rowCount = lastRun?.rowCount ?? null
      const rowLabel =
        rowCount != null
          ? `${rowCount.toLocaleString()} ${rowCount === 1 ? 'row' : 'rows'}`
          : null

      const subtitle =
        [rowLabel, connectionLabel].filter(Boolean).join(' · ') || undefined

      candidates.push({
        resume: {
          title: tabTitle,
          ...(subtitle ? { subtitle } : {}),
          icon: '🗂️',
          lastTouchedAt: activeTab.updatedAt,
        },
        ts: Date.parse(activeTab.updatedAt) || 0,
      })
    }

    candidates.sort((a, b) => b.ts - a.ts)
    resume = candidates[0]?.resume ?? null

    return c.json({ items, resume, generatedAt })
  } catch {
    return c.json({ items: [], resume: null, generatedAt })
  }
})

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
  const dataDir = getDataDir(c)

  try {
    const body = paramsObject(await c.req.json().catch(() => ({})))
    const method = typeof body.method === 'string' ? body.method : ''
    const params = paramsObject(body.params)
    const preferences = await getPreferences(dataDir)

    if (!method) {
      const error = rpcError('invalid_request', 'method is required')
      return c.json(error.body, error.status)
    }

    if (method === 'db.connections.list') {
      return c.json({
        ok: true,
        result: {
          connections: await listConnections(workspaceId, dataDir),
          preferences,
        },
      })
    }

    if (method === 'db.context.get') {
      const connections = await listConnections(workspaceId, dataDir)
      const connectionId = connections.length
        ? await resolveConnectionId(workspaceId, dataDir, params.connectionId)
        : null
      const includeSchema = params.includeSchema !== false
      const includeSqlWorkspace = params.includeSqlWorkspace !== false
      const includeDashboards = params.includeDashboards !== false

      return c.json({
        ok: true,
        result: {
          connections,
          activeConnectionId: connectionId,
          activeConnection:
            connections.find((connection) => connection.id === connectionId) ??
            null,
          schemas:
            connectionId && includeSchema
              ? await getExplorer(
                  workspaceId,
                  dataDir,
                  connectionId,
                  preferences.queryTimeoutMs,
                )
              : undefined,
          sqlWorkspace:
            connectionId && includeSqlWorkspace
              ? await getSqlWorkspace(workspaceId, dataDir, connectionId)
              : undefined,
          dashboardWorkspace:
            connectionId && includeDashboards
              ? await getDashboardWorkspace(workspaceId, dataDir, connectionId)
              : undefined,
          preferences,
        },
      })
    }

    if (method === 'db.schema.list') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      return c.json({
        ok: true,
        result: {
          connectionId,
          schemas: await getExplorer(
            workspaceId,
            dataDir,
            connectionId,
            preferences.queryTimeoutMs,
          ),
        },
      })
    }

    if (method === 'db.schema.search') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      return c.json({
        ok: true,
        result: await searchSchema(
          workspaceId,
          dataDir,
          connectionId,
          params.query,
          params.limit,
          preferences.queryTimeoutMs,
        ),
      })
    }

    if (method === 'db.schema.describe') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      return c.json({
        ok: true,
        result: {
          connectionId,
          ...(await describeTable(
            workspaceId,
            dataDir,
            connectionId,
            typeof params.schema === 'string' ? params.schema : '',
            typeof params.table === 'string' ? params.table : '',
            preferences.queryTimeoutMs,
          )),
        },
      })
    }

    if (method === 'db.query.runReadonly') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const sql = typeof params.sql === 'string' ? params.sql : ''
      const result = await runReadOnlyQuery(
        workspaceId,
        dataDir,
        connectionId,
        sql,
        preferences.queryTimeoutMs,
      )

      await appendQueryHistory(workspaceId, dataDir, connectionId, {
        sql: ensureSqlTerminator(sql),
        title: queryHistoryTitle(sql),
        rowCount: result.rowCount,
        executionMs: result.executionMs,
      }).catch(() => undefined)

      return c.json({
        ok: true,
        result: {
          connectionId,
          ...result,
        },
      })
    }

    if (method === 'db.query.explain') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const rawSql = typeof params.sql === 'string' ? params.sql.trim() : ''
      const sql = /^explain\b/i.test(rawSql) ? rawSql : `explain ${rawSql}`

      const result = await runReadOnlyQuery(
        workspaceId,
        dataDir,
        connectionId,
        sql,
        preferences.queryTimeoutMs,
      )

      await appendQueryHistory(workspaceId, dataDir, connectionId, {
        sql: ensureSqlTerminator(sql),
        title: queryHistoryTitle(sql),
        rowCount: result.rowCount,
        executionMs: result.executionMs,
      }).catch(() => undefined)

      return c.json({
        ok: true,
        result: {
          connectionId,
          ...result,
        },
      })
    }

    if (method === 'db.sqlTabs.list') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      return c.json({
        ok: true,
        result: await getSqlWorkspace(workspaceId, dataDir, connectionId),
      })
    }

    if (method === 'db.sqlTabs.create') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const result = await createSqlWorkspaceTab(
        workspaceId,
        dataDir,
        connectionId,
        params,
      )
      await savePreferences(dataDir, { activeConnectionId: connectionId })
      return c.json({ ok: true, result })
    }

    if (method === 'db.sqlTabs.update') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const result = await updateSqlWorkspaceTab(
        workspaceId,
        dataDir,
        connectionId,
        params.tabId,
        params,
      )
      await savePreferences(dataDir, { activeConnectionId: connectionId })
      return c.json({ ok: true, result })
    }

    if (method === 'db.sqlTabs.edit') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const result = await editSqlWorkspaceTab(
        workspaceId,
        dataDir,
        connectionId,
        params,
      )
      await savePreferences(dataDir, { activeConnectionId: connectionId })
      return c.json({ ok: true, result })
    }

    if (method === 'db.sqlTabs.select') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const workspace = await selectSqlWorkspaceTab(
        workspaceId,
        dataDir,
        connectionId,
        params.tabId,
      )
      await savePreferences(dataDir, { activeConnectionId: connectionId })
      return c.json({ ok: true, result: workspace })
    }

    if (method === 'db.dashboards.list') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      return c.json({
        ok: true,
        result: await getDashboardWorkspace(workspaceId, dataDir, connectionId),
      })
    }

    if (method === 'db.dashboards.create') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const result = await createDashboard(
        workspaceId,
        dataDir,
        connectionId,
        params,
      )
      await savePreferences(dataDir, { activeConnectionId: connectionId })
      return c.json({ ok: true, result })
    }

    if (method === 'db.dashboards.update') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const dashboardId = await resolveRpcDashboardId(
        workspaceId,
        dataDir,
        connectionId,
        params,
      )
      const result = await updateDashboard(
        workspaceId,
        dataDir,
        connectionId,
        dashboardId,
        params,
      )
      await savePreferences(dataDir, { activeConnectionId: connectionId })
      return c.json({ ok: true, result })
    }

    if (method === 'db.dashboards.delete') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const dashboardId = await resolveRpcDashboardId(
        workspaceId,
        dataDir,
        connectionId,
        params,
      )
      const result = await removeDashboard(
        workspaceId,
        dataDir,
        connectionId,
        dashboardId,
      )
      await savePreferences(dataDir, { activeConnectionId: connectionId })
      return c.json({ ok: true, result })
    }

    if (method === 'db.dashboards.select') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const dashboardId = await resolveRpcDashboardId(
        workspaceId,
        dataDir,
        connectionId,
        params,
      )
      const result = await selectDashboard(
        workspaceId,
        dataDir,
        connectionId,
        dashboardId,
      )
      await savePreferences(dataDir, { activeConnectionId: connectionId })
      return c.json({ ok: true, result })
    }

    if (method === 'db.dashboardCharts.list') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const workspace = await getDashboardWorkspace(
        workspaceId,
        dataDir,
        connectionId,
      )
      const dashboardId = resolveNamedDashboard(workspace, params)
      const dashboard = workspace.dashboards.find(
        (item) => item.id === dashboardId,
      )
      if (!dashboard) throw new Error('Dashboard not found')
      return c.json({
        ok: true,
        result: {
          connectionId,
          dashboard,
          charts: dashboard.charts,
        },
      })
    }

    if (method === 'db.dashboardCharts.create') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const dashboardId = await resolveRpcDashboardId(
        workspaceId,
        dataDir,
        connectionId,
        params,
      )
      const result = await createDashboardChart(
        workspaceId,
        dataDir,
        connectionId,
        dashboardId,
        params,
      )
      await savePreferences(dataDir, { activeConnectionId: connectionId })
      return c.json({ ok: true, result })
    }

    if (method === 'db.dashboardCharts.update') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const { dashboardId, chartId } = await resolveRpcDashboardAndChartId(
        workspaceId,
        dataDir,
        connectionId,
        params,
      )
      const result = await updateDashboardChart(
        workspaceId,
        dataDir,
        connectionId,
        dashboardId,
        chartId,
        params,
      )
      await savePreferences(dataDir, { activeConnectionId: connectionId })
      return c.json({ ok: true, result })
    }

    if (method === 'db.dashboardCharts.edit') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const { dashboardId, chartId, dashboard } =
        await resolveRpcDashboardAndChartId(
          workspaceId,
          dataDir,
          connectionId,
          params,
        )
      const chart = dashboard.charts.find((item) => item.id === chartId)
      if (!chart) throw new Error('Chart not found')
      const result = await updateDashboardChart(
        workspaceId,
        dataDir,
        connectionId,
        dashboardId,
        chartId,
        editDashboardChartSql(chart, params),
      )
      await savePreferences(dataDir, { activeConnectionId: connectionId })
      return c.json({ ok: true, result })
    }

    if (method === 'db.dashboardCharts.delete') {
      const connectionId = await resolveRpcConnectionId(
        workspaceId,
        dataDir,
        params,
      )
      const { dashboardId, chartId } = await resolveRpcDashboardAndChartId(
        workspaceId,
        dataDir,
        connectionId,
        params,
      )
      const result = await removeDashboardChart(
        workspaceId,
        dataDir,
        connectionId,
        dashboardId,
        chartId,
      )
      await savePreferences(dataDir, { activeConnectionId: connectionId })
      return c.json({ ok: true, result })
    }

    const error = rpcError('method_not_found', `Unknown method: ${method}`, 404)
    return c.json(error.body, error.status)
  } catch (error) {
    return c.json(
      {
        ok: false,
        error: {
          code: 'db_browser_rpc_failed',
          message:
            error instanceof Error ? error.message : 'DB Browser RPC failed',
        },
      },
      400,
    )
  }
})

app.get('/api/connections', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    return c.json(await listConnections(workspaceId, getDataDir(c)))
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to load saved connections',
    )
  }
})

app.get('/api/preferences', async (c) => {
  try {
    return c.json(await getPreferences(getDataDir(c)))
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to load preferences',
    )
  }
})

app.patch('/api/preferences', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    return c.json(await savePreferences(getDataDir(c), body))
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to save preferences',
      400,
    )
  }
})

app.post('/api/connections/test', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const body = await c.req.json().catch(() => ({}))
    const input = parseConnectionInput(body)
    return c.json(await testConnection(workspaceId, input))
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to test connection',
      400,
    )
  }
})

app.post('/api/connections/:id/test', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const body = await c.req.json().catch(() => ({}))
    const input = parseConnectionInput(body)
    return c.json(
      await testSavedConnection(
        workspaceId,
        getDataDir(c),
        c.req.param('id'),
        input,
      ),
    )
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to test connection',
      400,
    )
  }
})

app.post('/api/connections', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const body = await c.req.json().catch(() => ({}))
    const input = parseConnectionInput(body)
    return c.json(await saveConnection(workspaceId, getDataDir(c), input), 201)
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to save connection',
      400,
    )
  }
})

app.patch('/api/connections/:id', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const body = await c.req.json().catch(() => ({}))
    const input = parseConnectionInput(body)
    return c.json(
      await updateConnection(
        workspaceId,
        getDataDir(c),
        c.req.param('id'),
        input,
      ),
    )
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to update connection',
      400,
    )
  }
})

app.delete('/api/connections/:id', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    await removeConnection(workspaceId, getDataDir(c), c.req.param('id'))
    return c.json({ ok: true })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to delete connection',
      404,
    )
  }
})

app.get('/api/connections/:id/explorer', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const dataDir = getDataDir(c)
    const preferences = await getPreferences(dataDir)
    return c.json(
      await getExplorer(
        workspaceId,
        dataDir,
        c.req.param('id'),
        preferences.queryTimeoutMs,
      ),
    )
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to load schema explorer',
      400,
    )
  }
})

app.get('/api/connections/:id/sql-workspace', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    return c.json(
      await getSqlWorkspace(workspaceId, getDataDir(c), c.req.param('id')),
    )
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to load SQL workspace',
      400,
    )
  }
})

app.put('/api/connections/:id/sql-workspace', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const body = await c.req.json().catch(() => ({}))
    return c.json(
      await saveSqlWorkspace(
        workspaceId,
        getDataDir(c),
        c.req.param('id'),
        body,
      ),
    )
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to save SQL workspace',
      400,
    )
  }
})

app.get('/api/connections/:id/dashboards', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    return c.json(
      await getDashboardWorkspace(
        workspaceId,
        getDataDir(c),
        c.req.param('id'),
      ),
    )
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to load dashboards',
      400,
    )
  }
})

app.put('/api/connections/:id/dashboards', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const body = await c.req.json().catch(() => ({}))
    return c.json(
      await saveDashboardWorkspace(
        workspaceId,
        getDataDir(c),
        c.req.param('id'),
        body,
      ),
    )
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to save dashboards',
      400,
    )
  }
})

app.post('/api/connections/:id/dashboard-chart-query', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const dataDir = getDataDir(c)
    const preferences = await getPreferences(dataDir)
    const body = (await c.req.json().catch(() => ({}))) as {
      sql?: unknown
      maxRows?: unknown
    }
    const sql = typeof body.sql === 'string' ? body.sql : ''

    const result = await runReadOnlyQuery(
      workspaceId,
      dataDir,
      c.req.param('id'),
      sql,
      preferences.queryTimeoutMs,
    )
    const maxRows =
      typeof body.maxRows === 'number' && Number.isFinite(body.maxRows)
        ? Math.max(1, Math.min(5_000, Math.round(body.maxRows)))
        : 500

    return c.json({
      ...result,
      rows: result.rows.slice(0, maxRows),
      rowCount: result.rowCount ?? result.rows.length,
    })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to load dashboard chart',
      400,
    )
  }
})

app.get('/api/connections/:id/query-history', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    return c.json(
      await listQueryHistory(workspaceId, getDataDir(c), c.req.param('id')),
    )
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to load query history',
      400,
    )
  }
})

app.post('/api/connections/:id/query-history', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const body = await c.req.json().catch(() => ({}))
    return c.json(
      await appendQueryHistory(
        workspaceId,
        getDataDir(c),
        c.req.param('id'),
        body,
      ),
      201,
    )
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to save query history',
      400,
    )
  }
})

app.get('/api/connections/:id/preview', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const dataDir = getDataDir(c)
    const preferences = await getPreferences(dataDir)
    const schema = c.req.query('schema') ?? ''
    const table = c.req.query('table') ?? ''
    const limit = Number(c.req.query('limit') ?? '100')
    const offset = Number(c.req.query('offset') ?? '0')

    if (!Number.isFinite(limit) || limit < 1 || limit > 200) {
      return jsonError(c, 'Limit must be between 1 and 200', 400)
    }
    if (!Number.isSafeInteger(offset) || offset < 0) {
      return jsonError(c, 'Offset must be a non-negative safe integer', 400)
    }

    const result = await previewTable(
      workspaceId,
      dataDir,
      c.req.param('id'),
      schema,
      table,
      limit,
      offset,
      preferences.queryTimeoutMs,
    )
    await appendQueryHistory(workspaceId, dataDir, c.req.param('id'), {
      sql: previewSql(schema, table, limit, offset),
      title: `${schema}.${table}`,
      rowCount: result.rowCount,
      executionMs: null,
    }).catch(() => undefined)

    return c.json(result)
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to preview table',
      400,
    )
  }
})

app.post('/api/connections/:id/query', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const dataDir = getDataDir(c)
    const preferences = await getPreferences(dataDir)
    const body = (await c.req.json().catch(() => ({}))) as {
      sql?: unknown
    }
    const sql = typeof body.sql === 'string' ? body.sql : ''

    const result = await runSqlStatement(
      workspaceId,
      dataDir,
      c.req.param('id'),
      sql,
      {
        timeoutMs: preferences.queryTimeoutMs,
      },
    )
    await appendQueryHistory(workspaceId, dataDir, c.req.param('id'), {
      sql: ensureSqlTerminator(sql),
      title: queryHistoryTitle(sql),
      rowCount: result.rowCount,
      executionMs: result.executionMs,
    }).catch(() => undefined)

    return c.json(result)
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to execute query',
      400,
    )
  }
})

app.post('/api/connections/:id/export', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const dataDir = getDataDir(c)
    const preferences = await getPreferences(dataDir)
    const body = await c.req.json().catch(() => ({}))
    const params = paramsObject(body)
    const sql = typeof params.sql === 'string' ? params.sql : ''

    return c.json(
      await exportReadOnlyQuery(workspaceId, dataDir, c.req.param('id'), sql, {
        format: params.format,
        filename: params.filename,
        timeoutMs: preferences.queryTimeoutMs,
      }),
    )
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to export query',
      400,
    )
  }
})

app.post('/api/connections/:id/import', async (c) => {
  try {
    const workspaceId = requiredWorkspaceId(getWorkspaceId(c))
    const dataDir = getDataDir(c)
    const preferences = await getPreferences(dataDir)
    const body = await c.req.json().catch(() => ({}))

    return c.json(
      await importRows(
        workspaceId,
        dataDir,
        c.req.param('id'),
        body,
        preferences.queryTimeoutMs,
      ),
    )
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to import rows',
      400,
    )
  }
})
