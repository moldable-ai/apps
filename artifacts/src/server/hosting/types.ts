export type HostingProviderId = 'vercel' | 'netlify'

export type HostingConnectionStatus = 'connected' | 'error'

export interface HostingProviderInfo {
  id: HostingProviderId
  name: string
  description: string
  auth: 'oauth'
  connected: boolean
  connection?: HostingConnection
  setupError?: string
}

export interface HostingConnection {
  id: string
  provider: HostingProviderId
  name: string
  accountId?: string
  accountName?: string
  teamId?: string
  teamName?: string
  secretName: string
  status: HostingConnectionStatus
  error?: string | null
  createdAt: string
  updatedAt: string
}

export type HostingTargetStatus = 'ready' | 'deploying' | 'error'

export interface HostingTarget {
  id: string
  artifactId: string
  provider: HostingProviderId
  connectionId: string
  name: string
  remoteId?: string
  remoteName?: string
  projectId?: string
  teamId?: string
  url?: string
  adminUrl?: string
  lastDeploymentId?: string
  lastPublishedAt?: string
  status: HostingTargetStatus
  error?: string | null
  createdAt: string
  updatedAt: string
}

export interface PublishBundleFile {
  path: string
  contentType: string
  sourcePath: string
  size: number
  sha1: string
}

export interface PublishBundle {
  artifactId: string
  kind: string
  title: string
  entrypoint: string
  sourceDir: string
  metadata: Record<string, string>
  files: PublishBundleFile[]
}

export interface DeployResult {
  target: HostingTarget
  url: string
  deploymentId: string
  status: HostingTargetStatus
}

export interface HostingProvider {
  id: HostingProviderId
  name: string
  description: string
  secretName: string
  deploy(input: {
    workspaceId: string
    target: HostingTarget
    bundle: PublishBundle
  }): Promise<DeployResult>
}
