import {
  appendQueryHistory,
  createSqlWorkspaceTab,
  describeTable,
  editSqlWorkspaceTab,
  getExplorer,
  getPreferences,
  getSqlWorkspace,
  listConnections,
  listQueryHistory,
  parseConnectionInput,
  previewTable,
  removeConnection,
  resolveConnectionId,
  runReadOnlyQuery,
  saveConnection,
  savePreferences,
  saveSqlWorkspace,
  searchSchema,
  selectSqlWorkspaceTab,
  testConnection,
  testSavedConnection,
  updateConnection,
  updateSqlWorkspaceTab,
} from './db'
import { getDataDir, getWorkspaceId, jsonError } from './moldable'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

export const app = new Hono()

app.use('/api/*', cors())

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

async function resolveRpcConnectionId(
  workspaceId: string,
  dataDir: string,
  params: Record<string, unknown>,
) {
  return resolveConnectionId(workspaceId, dataDir, params.connectionId)
}

app.get('/api/moldable/health', (c) => {
  return c.json({
    appId: process.env.MOLDABLE_APP_ID ?? 'db-browser',
    status: 'ok',
  })
})

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = requiredWorkspaceId(
    c.req.header('x-moldable-workspace-id') ?? getWorkspaceId(c),
  )
  const dataDir = getDataDir(c)

  try {
    const body = paramsObject(await c.req.json().catch(() => ({})))
    const method = typeof body.method === 'string' ? body.method : ''
    const params = paramsObject(body.params)

    if (!method) {
      const error = rpcError('invalid_request', 'method is required')
      return c.json(error.body, error.status)
    }

    if (method === 'db.connections.list') {
      return c.json({
        ok: true,
        result: {
          connections: await listConnections(workspaceId, dataDir),
          preferences: await getPreferences(dataDir),
        },
      })
    }

    if (method === 'db.context.get') {
      const connections = await listConnections(workspaceId, dataDir)
      const preferences = await getPreferences(dataDir)
      const connectionId = connections.length
        ? await resolveConnectionId(workspaceId, dataDir, params.connectionId)
        : null
      const includeSchema = params.includeSchema !== false
      const includeSqlWorkspace = params.includeSqlWorkspace !== false

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
              ? await getExplorer(workspaceId, dataDir, connectionId)
              : undefined,
          sqlWorkspace:
            connectionId && includeSqlWorkspace
              ? await getSqlWorkspace(workspaceId, dataDir, connectionId)
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
          schemas: await getExplorer(workspaceId, dataDir, connectionId),
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
      )

      await appendQueryHistory(workspaceId, dataDir, connectionId, {
        sql,
        title: sql.split('\n')[0]?.trim().slice(0, 80) || 'SQL query',
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

      return c.json({
        ok: true,
        result: {
          connectionId,
          ...(await runReadOnlyQuery(workspaceId, dataDir, connectionId, sql)),
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
    return c.json(
      await getExplorer(workspaceId, getDataDir(c), c.req.param('id')),
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

    return c.json(
      await previewTable(
        workspaceId,
        getDataDir(c),
        c.req.param('id'),
        schema,
        table,
        limit,
        offset,
      ),
    )
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
    const body = (await c.req.json().catch(() => ({}))) as { sql?: unknown }
    const sql = typeof body.sql === 'string' ? body.sql : ''

    return c.json(
      await runReadOnlyQuery(
        workspaceId,
        getDataDir(c),
        c.req.param('id'),
        sql,
      ),
    )
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to execute query',
      400,
    )
  }
})
