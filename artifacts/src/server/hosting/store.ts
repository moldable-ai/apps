import {
  ensureDir,
  getAppDataDir,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import type {
  HostingConnection,
  HostingProviderId,
  HostingTarget,
} from './types'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'

function nowIso() {
  return new Date().toISOString()
}

function dataDir(workspaceId?: string) {
  return safePath(getAppDataDir(workspaceId), 'hosting')
}

function connectionsPath(workspaceId?: string) {
  return safePath(dataDir(workspaceId), 'connections.json')
}

function targetsPath(workspaceId?: string) {
  return safePath(dataDir(workspaceId), 'targets.json')
}

export function newHostingTargetId() {
  return `host-${randomUUID().slice(0, 8)}`
}

export function connectionId(provider: HostingProviderId) {
  return `${provider}-default`
}

export async function listConnections(
  workspaceId?: string,
): Promise<HostingConnection[]> {
  if (!existsSync(connectionsPath(workspaceId))) return []
  const value = await readJson<HostingConnection[]>(
    connectionsPath(workspaceId),
    [],
  )
  return value
    .map(normalizeConnection)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getConnection(
  workspaceId: string | undefined,
  provider: HostingProviderId,
): Promise<HostingConnection | null> {
  return (
    (await listConnections(workspaceId)).find(
      (connection) => connection.provider === provider,
    ) ?? null
  )
}

export async function saveConnection(
  workspaceId: string | undefined,
  connection: HostingConnection,
): Promise<HostingConnection> {
  await ensureDir(dataDir(workspaceId))
  const current = await listConnections(workspaceId)
  const now = nowIso()
  const next = {
    ...connection,
    id: connection.id || connectionId(connection.provider),
    createdAt: connection.createdAt || now,
    updatedAt: now,
  }
  await writeJson(
    connectionsPath(workspaceId),
    [...current.filter((item) => item.provider !== next.provider), next].sort(
      (a, b) => a.name.localeCompare(b.name),
    ),
  )
  return next
}

export async function removeConnection(
  workspaceId: string | undefined,
  provider: HostingProviderId,
): Promise<void> {
  const current = await listConnections(workspaceId)
  await ensureDir(dataDir(workspaceId))
  await writeJson(
    connectionsPath(workspaceId),
    current.filter((connection) => connection.provider !== provider),
  )
}

export async function listTargets(
  workspaceId?: string,
): Promise<HostingTarget[]> {
  if (!existsSync(targetsPath(workspaceId))) return []
  const value = await readJson<HostingTarget[]>(targetsPath(workspaceId), [])
  return value
    .map(normalizeTarget)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function listArtifactTargets(
  workspaceId: string | undefined,
  artifactId: string,
): Promise<HostingTarget[]> {
  return (await listTargets(workspaceId)).filter(
    (target) => target.artifactId === artifactId,
  )
}

export async function getTarget(
  workspaceId: string | undefined,
  artifactId: string,
  targetId: string,
): Promise<HostingTarget | null> {
  return (
    (await listArtifactTargets(workspaceId, artifactId)).find(
      (target) => target.id === targetId,
    ) ?? null
  )
}

export async function findTargetForProvider(
  workspaceId: string | undefined,
  artifactId: string,
  provider: HostingProviderId,
): Promise<HostingTarget | null> {
  return (
    (await listArtifactTargets(workspaceId, artifactId)).find(
      (target) => target.provider === provider,
    ) ?? null
  )
}

export async function saveTarget(
  workspaceId: string | undefined,
  target: HostingTarget,
): Promise<HostingTarget> {
  await ensureDir(dataDir(workspaceId))
  const current = await listTargets(workspaceId)
  const now = nowIso()
  const next = {
    ...target,
    id: target.id || newHostingTargetId(),
    createdAt: target.createdAt || now,
    updatedAt: now,
  }
  await writeJson(
    targetsPath(workspaceId),
    [...current.filter((item) => item.id !== next.id), next].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    ),
  )
  return next
}

export async function removeTarget(
  workspaceId: string | undefined,
  targetId: string,
): Promise<void> {
  const current = await listTargets(workspaceId)
  await ensureDir(dataDir(workspaceId))
  await writeJson(
    targetsPath(workspaceId),
    current.filter((target) => target.id !== targetId),
  )
}

function normalizeConnection(connection: HostingConnection): HostingConnection {
  const now = nowIso()
  return {
    ...connection,
    id: connection.id || connectionId(connection.provider),
    secretName: connection.secretName,
    status: connection.status === 'error' ? 'error' : 'connected',
    error: connection.error ?? null,
    createdAt: connection.createdAt || now,
    updatedAt: connection.updatedAt || connection.createdAt || now,
  }
}

function normalizeTarget(target: HostingTarget): HostingTarget {
  const now = nowIso()
  return {
    ...target,
    id: target.id || newHostingTargetId(),
    status:
      target.status === 'deploying' || target.status === 'error'
        ? target.status
        : 'ready',
    error: target.error ?? null,
    createdAt: target.createdAt || now,
    updatedAt: target.updatedAt || target.createdAt || now,
  }
}
