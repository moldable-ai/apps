import { deleteWorkspaceSecret } from '../aivault'
import { getArtifact } from '../store'
import { createPublishBundle } from './bundle'
import { HostingError, errorMessage } from './errors'
import {
  createOAuthLoginUrl,
  providerConnected,
  secretNameForProvider,
} from './oauth'
import {
  getHostingProvider,
  isHostingProviderId,
  listHostingProviders,
} from './providers'
import {
  connectionId,
  findTargetForProvider,
  getConnection,
  getTarget,
  listArtifactTargets,
  listConnections,
  removeConnection,
  removeTarget,
  saveTarget,
} from './store'
import type {
  DeployResult,
  HostingProviderId,
  HostingProviderInfo,
  HostingTarget,
} from './types'

export async function providerInfos(
  workspaceId: string,
): Promise<HostingProviderInfo[]> {
  const connections = await listConnections(workspaceId)
  return Promise.all(
    listHostingProviders().map(async (provider) => {
      const connection =
        connections.find((item) => item.provider === provider.id) ?? undefined
      const connected =
        Boolean(connection) ||
        (await providerConnected(workspaceId, provider.id))
      return {
        id: provider.id,
        name: provider.name,
        description: provider.description,
        auth: 'oauth',
        connected,
        connection,
      }
    }),
  )
}

export async function startConnection(
  workspaceId: string,
  provider: unknown,
): Promise<{ url: string }> {
  if (!isHostingProviderId(provider)) {
    throw new HostingError(
      'provider_not_supported',
      'Unsupported hosting provider',
      404,
    )
  }
  return { url: await createOAuthLoginUrl(workspaceId, provider) }
}

export async function disconnectProvider(
  workspaceId: string,
  provider: unknown,
): Promise<{ ok: true }> {
  if (!isHostingProviderId(provider)) {
    throw new HostingError(
      'provider_not_supported',
      'Unsupported hosting provider',
      404,
    )
  }
  await deleteWorkspaceSecret(workspaceId, secretNameForProvider(provider))
  await removeConnection(workspaceId, provider)
  return { ok: true }
}

export async function artifactTargets(
  workspaceId: string,
  artifactId: string,
): Promise<HostingTarget[]> {
  return listArtifactTargets(workspaceId, artifactId)
}

export async function ensureArtifactTarget(
  workspaceId: string,
  artifactId: string,
  input: unknown,
): Promise<HostingTarget> {
  const artifact = await getArtifact(workspaceId, artifactId)
  if (!artifact)
    throw new HostingError('artifact_not_found', 'Artifact not found', 404)
  const body = (input ?? {}) as Record<string, unknown>
  const provider = body.provider
  if (!isHostingProviderId(provider)) {
    throw new HostingError('provider_required', 'provider is required')
  }

  const connection = await getConnection(workspaceId, provider)
  if (!connection && !(await providerConnected(workspaceId, provider))) {
    throw new HostingError(
      'provider_not_connected',
      `${getHostingProvider(provider).name} is not connected`,
      409,
    )
  }

  const existing = await findTargetForProvider(
    workspaceId,
    artifactId,
    provider,
  )
  if (existing) return existing

  const now = new Date().toISOString()
  return saveTarget(workspaceId, {
    id: '',
    artifactId,
    provider,
    connectionId: connection?.id ?? connectionId(provider),
    name:
      typeof body.name === 'string' && body.name.trim()
        ? body.name.trim()
        : artifact.title,
    remoteName:
      typeof body.remoteName === 'string' && body.remoteName.trim()
        ? body.remoteName.trim()
        : undefined,
    teamId:
      provider === 'vercel' && typeof body.teamId === 'string'
        ? body.teamId
        : connection?.teamId,
    status: 'ready',
    error: null,
    createdAt: now,
    updatedAt: now,
  })
}

export async function deployTarget(
  workspaceId: string,
  artifactId: string,
  targetId: string,
): Promise<DeployResult> {
  const target = await getTarget(workspaceId, artifactId, targetId)
  if (!target)
    throw new HostingError('target_not_found', 'Hosting target not found', 404)
  const provider = getHostingProvider(target.provider)
  const deploying = await saveTarget(workspaceId, {
    ...target,
    status: 'deploying',
    error: null,
  })

  try {
    const bundle = await createPublishBundle(workspaceId, artifactId)
    const result = await provider.deploy({
      workspaceId,
      target: deploying,
      bundle,
    })
    const saved = await saveTarget(workspaceId, result.target)
    return { ...result, target: saved }
  } catch (error) {
    const failed = await saveTarget(workspaceId, {
      ...deploying,
      status: 'error',
      error: errorMessage(error, 'Deployment failed'),
    })
    if (error instanceof HostingError) throw error
    throw new HostingError(
      'deploy_failed',
      failed.error ?? 'Deployment failed',
      500,
    )
  }
}

export async function deleteArtifactTarget(
  workspaceId: string,
  artifactId: string,
  targetId: string,
): Promise<{ ok: true }> {
  const target = await getTarget(workspaceId, artifactId, targetId)
  if (!target)
    throw new HostingError('target_not_found', 'Hosting target not found', 404)
  await removeTarget(workspaceId, target.id)
  return { ok: true }
}

export function assertWorkspace(workspaceId: string | undefined): string {
  if (!workspaceId) {
    throw new HostingError(
      'workspace_required',
      'Workspace id is required',
      400,
    )
  }
  return workspaceId
}
