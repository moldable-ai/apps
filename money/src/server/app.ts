import { buildMoneyAttentionItems } from './attention'
import { moneyRoutes } from './money-routes'
import {
  readConnections,
  readSettings,
  readSyncState,
  readVisibleTransactions,
} from './money-storage'
import { plaidRoutes } from './plaid'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

export const app = new Hono()

app.use('/api/*', cors())
app.route('/', plaidRoutes)
app.route('/', moneyRoutes)

app.get('/api/moldable/health', (c) => {
  return c.json({
    appId: process.env.MOLDABLE_APP_ID ?? 'money',
    status: 'ok',
    appUrl: process.env.MOLDABLE_APP_URL ?? null,
  })
})

app.get('/api/moldable/today', async (c) => {
  try {
    const [connections, syncState, settings, transactions] = await Promise.all([
      readConnections(c),
      readSyncState(c),
      readSettings(c),
      readVisibleTransactions(c),
    ])
    const needsReauth = connections.filter(
      (connection) => connection.status === 'needs_reauth',
    )
    const items = needsReauth.map((connection) => ({
      id: `money-reauth-${connection.itemId}`,
      appId: 'money',
      kind: 'blocked',
      title: `Reconnect ${connection.institutionName}`,
      subtitle: 'Plaid needs reauthorization before Money can sync.',
      icon: '💵',
    }))

    if (syncState.status === 'error') {
      items.push({
        id: 'money-sync-error',
        appId: 'money',
        kind: 'blocked',
        title: 'Money sync failed',
        subtitle:
          syncState.lastError?.split('\n')[0] ??
          'Open Money to review the latest Plaid sync error.',
        icon: '💵',
      })
    }

    items.push(...buildMoneyAttentionItems(transactions, settings.attention))

    return c.json({
      items,
      resume: connections.length
        ? {
            title: 'Review Money',
            subtitle: `${connections.length} connected institution${connections.length === 1 ? '' : 's'}`,
            icon: '💵',
          }
        : null,
      generatedAt: new Date().toISOString(),
    })
  } catch {
    return c.json({
      items: [],
      resume: null,
      generatedAt: new Date().toISOString(),
    })
  }
})

app.get('/api/connections', async (c) => {
  const connections = await readConnections(c)
  return c.json(connections)
})
