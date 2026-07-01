import { invokeAivaultJson, invokeAivaultRaw } from '../../aivault'
import { HostingError } from '../errors'
import type {
  DeployResult,
  HostingProvider,
  HostingTarget,
  PublishBundle,
} from '../types'
import {
  poll,
  slugifySiteName,
  statusFromReadyState,
  withQuery,
} from './common'

interface VercelDeployment {
  id?: string
  name?: string
  url?: string
  readyState?: string
  projectId?: string
  error?: { message?: string }
}

interface VercelFileReference {
  file: string
  sha: string
  size: number
}

export const vercelProvider: HostingProvider = {
  id: 'vercel',
  name: 'Vercel',
  description: 'Publish static artifacts to a Vercel project.',
  secretName: 'VERCEL_TOKEN',
  deploy,
}

async function deploy(input: {
  workspaceId: string
  target: HostingTarget
  bundle: PublishBundle
}): Promise<DeployResult> {
  const teamId = input.target.teamId
  const files = await uploadFiles(input.workspaceId, input.bundle, teamId)
  const deployment = await createDeployment(
    input.workspaceId,
    input.target,
    input.bundle,
    files,
  )

  const deploymentId = deployment.id
  if (!deploymentId) {
    throw new HostingError(
      'vercel_deploy_failed',
      'Vercel did not return a deployment id',
    )
  }

  const finalDeployment = await pollDeployment(
    input.workspaceId,
    deploymentId,
    teamId,
  )
  const status = statusFromReadyState(finalDeployment.readyState)
  if (status === 'error') {
    throw new HostingError(
      'vercel_deploy_failed',
      finalDeployment.error?.message ?? 'Vercel deployment failed',
      502,
    )
  }

  const url = normalizeUrl(finalDeployment.url ?? deployment.url)
  if (!url) {
    throw new HostingError(
      'vercel_deploy_failed',
      'Vercel did not return a deployment URL',
    )
  }

  const target: HostingTarget = {
    ...input.target,
    remoteId: deploymentId,
    remoteName: deployment.name ?? input.target.remoteName,
    projectId:
      finalDeployment.projectId ??
      deployment.projectId ??
      input.target.projectId,
    url,
    lastDeploymentId: deploymentId,
    lastPublishedAt: new Date().toISOString(),
    status,
    error: null,
  }

  return { target, url, deploymentId, status }
}

async function uploadFiles(
  workspaceId: string,
  bundle: PublishBundle,
  teamId?: string,
): Promise<VercelFileReference[]> {
  const result: VercelFileReference[] = []
  for (const file of bundle.files) {
    await invokeAivaultRaw(workspaceId, 'vercel/files', {
      method: 'POST',
      path: withQuery('/v2/files', { teamId }),
      headers: {
        'Content-Type': 'application/octet-stream',
        'x-Vercel-Digest': file.sha1,
        'x-Now-Size': String(file.size),
      },
      bodyFilePath: file.sourcePath,
      timeoutMs: 120_000,
    })
    result.push({ file: file.path, sha: file.sha1, size: file.size })
  }
  return result
}

async function createDeployment(
  workspaceId: string,
  target: HostingTarget,
  bundle: PublishBundle,
  files: VercelFileReference[],
): Promise<VercelDeployment> {
  const name = slugifySiteName(
    target.remoteName ?? target.name,
    bundle.artifactId,
  )
  return invokeAivaultJson<VercelDeployment>(
    workspaceId,
    'vercel/deployments',
    {
      method: 'POST',
      path: withQuery('/v13/deployments', {
        teamId: target.teamId,
        skipAutoDetectionConfirmation: '1',
      }),
      body: {
        name,
        target: 'production',
        files,
        projectSettings: {
          framework: null,
          buildCommand: null,
          installCommand: null,
          outputDirectory: null,
        },
        gitMetadata: {
          commitMessage: `Publish ${bundle.title}`,
          commitRef: 'moldable',
          dirty: false,
        },
      },
      timeoutMs: 120_000,
    },
  )
}

async function pollDeployment(
  workspaceId: string,
  deploymentId: string,
  teamId?: string,
): Promise<VercelDeployment> {
  return poll(
    () =>
      invokeAivaultJson<VercelDeployment>(workspaceId, 'vercel/deployments', {
        method: 'GET',
        path: withQuery(
          `/v13/deployments/${encodeURIComponent(deploymentId)}`,
          {
            teamId,
          },
        ),
        timeoutMs: 30_000,
      }),
    (deployment) =>
      deployment.readyState === 'READY' || deployment.readyState === 'ERROR',
  )
}

function normalizeUrl(value: string | undefined): string {
  if (!value) return ''
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}
