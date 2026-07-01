import { invokeAivaultJson } from '../../aivault'
import { HostingError } from '../errors'
import type {
  DeployResult,
  HostingProvider,
  HostingTarget,
  PublishBundle,
} from '../types'
import { cleanupZip, poll, slugifySiteName, zipDirectory } from './common'

export const netlifyOAuthClientId =
  '04Na8dmCG0ATiAsDH3NyaniQWXfy4zYU0kBlEe8Y7m4'

interface NetlifySite {
  id?: string
  site_id?: string
  name?: string
  url?: string
  ssl_url?: string
  admin_url?: string
}

interface NetlifyDeploy {
  id?: string
  state?: string
  url?: string
  ssl_url?: string
  deploy_url?: string
  deploy_ssl_url?: string
  error_message?: string
}

export const netlifyProvider: HostingProvider = {
  id: 'netlify',
  name: 'Netlify',
  description: 'Publish static artifacts to a Netlify site.',
  secretName: 'NETLIFY_TOKEN',
  deploy,
}

async function deploy(input: {
  workspaceId: string
  target: HostingTarget
  bundle: PublishBundle
}): Promise<DeployResult> {
  const site = input.target.remoteId
    ? null
    : await createSite(input.workspaceId, input.target, input.bundle)
  const siteId = input.target.remoteId ?? site?.id ?? site?.site_id
  if (!siteId) {
    throw new HostingError(
      'netlify_site_failed',
      'Netlify did not return a site id',
    )
  }

  const zipPath = await zipDirectory(input.bundle.sourceDir)
  try {
    const deploy = await createDeploy(input.workspaceId, siteId, zipPath)
    const deployId = deploy.id
    if (!deployId) {
      throw new HostingError(
        'netlify_deploy_failed',
        'Netlify did not return a deploy id',
      )
    }
    const finalDeploy = await pollDeploy(input.workspaceId, deployId)
    if (finalDeploy.state === 'error') {
      throw new HostingError(
        'netlify_deploy_failed',
        finalDeploy.error_message ?? 'Netlify deployment failed',
        502,
      )
    }

    const url =
      finalDeploy.deploy_ssl_url ??
      finalDeploy.ssl_url ??
      finalDeploy.deploy_url ??
      finalDeploy.url ??
      site?.ssl_url ??
      site?.url
    if (!url) {
      throw new HostingError(
        'netlify_deploy_failed',
        'Netlify did not return a deployment URL',
      )
    }

    const target: HostingTarget = {
      ...input.target,
      remoteId: siteId,
      remoteName: site?.name ?? input.target.remoteName ?? input.target.name,
      url,
      adminUrl: site?.admin_url ?? input.target.adminUrl,
      lastDeploymentId: deployId,
      lastPublishedAt: new Date().toISOString(),
      status: finalDeploy.state === 'ready' ? 'ready' : 'deploying',
      error: null,
    }

    return { target, url, deploymentId: deployId, status: target.status }
  } finally {
    await cleanupZip(zipPath)
  }
}

async function createSite(
  workspaceId: string,
  target: HostingTarget,
  bundle: PublishBundle,
): Promise<NetlifySite> {
  const name = slugifySiteName(
    target.remoteName ?? target.name,
    bundle.artifactId,
  )
  return invokeAivaultJson<NetlifySite>(workspaceId, 'netlify/sites', {
    method: 'POST',
    path: '/api/v1/sites',
    body: { name },
    timeoutMs: 60_000,
  })
}

async function createDeploy(
  workspaceId: string,
  siteId: string,
  zipPath: string,
): Promise<NetlifyDeploy> {
  return invokeAivaultJson<NetlifyDeploy>(workspaceId, 'netlify/deploys', {
    method: 'POST',
    path: `/api/v1/sites/${encodeURIComponent(siteId)}/deploys`,
    headers: { 'Content-Type': 'application/zip' },
    bodyFilePath: zipPath,
    timeoutMs: 120_000,
  })
}

async function pollDeploy(
  workspaceId: string,
  deployId: string,
): Promise<NetlifyDeploy> {
  return poll(
    () =>
      invokeAivaultJson<NetlifyDeploy>(workspaceId, 'netlify/deploys', {
        method: 'GET',
        path: `/api/v1/deploys/${encodeURIComponent(deployId)}`,
        timeoutMs: 30_000,
      }),
    (deploy) => deploy.state === 'ready' || deploy.state === 'error',
  )
}
