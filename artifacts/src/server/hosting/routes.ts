import { getWorkspaceId } from '../moldable'
import { HostingError } from './errors'
import {
  completeNetlifyOAuth,
  completeVercelOAuth,
  oauthCallbackHtml,
  oauthFailureHtml,
  oauthSuccessHtml,
} from './oauth'
import {
  artifactTargets,
  assertWorkspace,
  deleteArtifactTarget,
  deployTarget,
  disconnectProvider,
  ensureArtifactTarget,
  providerInfos,
  startConnection,
} from './service'
import { listConnections } from './store'
import { Hono } from 'hono'
import type { Context } from 'hono'

export const hostingRoutes = new Hono()

hostingRoutes.get('/hosting/providers', async (c) => {
  return run(c, async () => providerInfos(assertWorkspace(getWorkspaceId(c))))
})

hostingRoutes.get('/hosting/connections', async (c) => {
  return run(c, async () => listConnections(assertWorkspace(getWorkspaceId(c))))
})

hostingRoutes.post('/hosting/connections/:provider/start', async (c) => {
  return run(c, async () =>
    startConnection(
      assertWorkspace(getWorkspaceId(c)),
      c.req.param('provider'),
    ),
  )
})

hostingRoutes.post('/hosting/connections/:provider/disconnect', async (c) => {
  return run(c, async () =>
    disconnectProvider(
      assertWorkspace(getWorkspaceId(c)),
      c.req.param('provider'),
    ),
  )
})

hostingRoutes.get('/hosting/oauth/callback', async (c) => {
  const error = c.req.query('error') || c.req.query('error_description')
  if (error) return c.html(oauthFailureHtml(error), 400)

  const code = c.req.query('code')
  if (!code) return c.html(oauthCallbackHtml())

  try {
    await completeVercelOAuth(code, c.req.query('state'), {
      teamId: c.req.query('teamId'),
      configurationId: c.req.query('configurationId'),
    })
    return c.html(oauthSuccessHtml('vercel'))
  } catch (err) {
    return c.html(
      oauthFailureHtml(
        err instanceof Error ? err.message : 'Connection failed',
      ),
      500,
    )
  }
})

hostingRoutes.post('/hosting/oauth/netlify/implicit-token', async (c) => {
  return run(c, async () => {
    const body = (await c.req.json().catch(() => ({}))) as {
      accessToken?: string
      state?: string
    }
    return completeNetlifyOAuth({
      accessToken: body.accessToken ?? '',
      state: body.state ?? '',
    })
  })
})

hostingRoutes.get('/artifacts/:id/hosting-targets', async (c) => {
  return run(c, async () =>
    artifactTargets(assertWorkspace(getWorkspaceId(c)), c.req.param('id')),
  )
})

hostingRoutes.post('/artifacts/:id/hosting-targets', async (c) => {
  return run(c, async () =>
    ensureArtifactTarget(
      assertWorkspace(getWorkspaceId(c)),
      c.req.param('id'),
      await c.req.json().catch(() => ({})),
    ),
  )
})

hostingRoutes.post(
  '/artifacts/:id/hosting-targets/:targetId/deploy',
  async (c) => {
    return run(c, async () =>
      deployTarget(
        assertWorkspace(getWorkspaceId(c)),
        c.req.param('id'),
        c.req.param('targetId'),
      ),
    )
  },
)

hostingRoutes.delete('/artifacts/:id/hosting-targets/:targetId', async (c) => {
  return run(c, async () =>
    deleteArtifactTarget(
      assertWorkspace(getWorkspaceId(c)),
      c.req.param('id'),
      c.req.param('targetId'),
    ),
  )
})

async function run<T>(c: Context, fn: () => Promise<T> | T): Promise<Response> {
  try {
    return c.json((await fn()) as Record<string, unknown>)
  } catch (error) {
    if (error instanceof HostingError) {
      return c.json(
        { error: error.message, code: error.code },
        error.status as 400,
      )
    }
    return c.json(
      {
        error:
          error instanceof Error ? error.message : 'Hosting request failed',
      },
      500,
    )
  }
}
