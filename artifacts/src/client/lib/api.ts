// Thin typed client over the app's REST routes. Every call goes through
// `fetchWithWorkspace` so the active workspace header is attached.
import type {
  Artifact,
  ArtifactSummary,
  PageDoc,
  PublishedInfo,
  Slide,
} from '../../shared/types'

const CLIENT_REQUEST_HEADER = 'x-artifacts-client'

export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>

export interface StagedFile {
  path: string
  contentType: string
  sourcePath: string
}

export interface StagedBundle {
  entrypoint: string
  title: string
  metadata: Record<string, string>
  files: StagedFile[]
}

export interface VersionMeta {
  versionId: string
  createdAt: string
  label: string
  slideCount: number
}

export interface ArtifactImageResult {
  path: string
  fileName: string
}

export type HostingProviderId = 'vercel' | 'netlify'

export interface HostingConnection {
  id: string
  provider: HostingProviderId
  name: string
  accountId?: string
  accountName?: string
  teamId?: string
  teamName?: string
  secretName: string
  status: 'connected' | 'error'
  error?: string | null
  createdAt: string
  updatedAt: string
}

export interface HostingProviderInfo {
  id: HostingProviderId
  name: string
  description: string
  auth: 'oauth'
  connected: boolean
  connection?: HostingConnection
  setupError?: string
}

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
  status: 'ready' | 'deploying' | 'error'
  error?: string | null
  createdAt: string
  updatedAt: string
}

export interface HostingDeployResult {
  target: HostingTarget
  url: string
  deploymentId: string
  status: HostingTarget['status']
}

export type TextReplaceTarget =
  | { kind: 'artifact'; field: 'title' | 'subtitle' | 'imageStyle' }
  | { kind: 'page'; field: 'html' | 'css' | 'js' | 'background' }
  | {
      kind: 'slide'
      field: 'name' | 'bodyHtml' | 'slideClass' | 'notes'
      slideId: string
    }
  | { kind: 'theme'; field: 'css' | 'stageBg' }

export interface TextReplaceInput {
  target?: TextReplaceTarget
  kind?: TextReplaceTarget['kind']
  field?: string
  slideId?: string
  oldString: string
  newString: string
  replaceAll?: boolean
}

export interface TextReplaceResult {
  artifact: Artifact
  slide?: Slide
  target?: TextReplaceTarget
  targets: TextReplaceTarget[]
  replacements: number
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = (await res.json()) as { error?: string }
      if (body?.error) message = body.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export function createApi(fetchWithWorkspace: Fetcher) {
  const post = (url: string, body?: unknown, method = 'POST') =>
    fetchWithWorkspace(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        [CLIENT_REQUEST_HEADER]: '1',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })

  return {
    listArtifacts: () =>
      fetchWithWorkspace('/api/artifacts').then((r) =>
        json<ArtifactSummary[]>(r),
      ),
    getArtifact: (id: string) =>
      fetchWithWorkspace(`/api/artifacts/${id}`).then((r) => json<Artifact>(r)),
    createArtifact: (input?: Partial<Artifact>) =>
      post('/api/artifacts', input ?? {}).then((r) => json<Artifact>(r)),
    updateArtifact: (id: string, patch: Partial<Artifact>) =>
      post(`/api/artifacts/${id}`, patch, 'PATCH').then((r) =>
        json<Artifact>(r),
      ),
    setPage: (id: string, patch: Partial<PageDoc>) =>
      post(`/api/artifacts/${id}/page`, patch).then((r) => json<Artifact>(r)),
    replaceText: (id: string, input: TextReplaceInput) =>
      post(`/api/artifacts/${id}/text-replace`, input).then((r) =>
        json<TextReplaceResult>(r),
      ),
    setImageStyle: (id: string, input: { style?: string; presetId?: string }) =>
      post(`/api/artifacts/${id}/image-style`, input).then((r) =>
        json<Artifact>(r),
      ),
    deleteArtifact: (id: string) =>
      post(`/api/artifacts/${id}`, undefined, 'DELETE').then((r) =>
        json<{ ok: boolean }>(r),
      ),
    addSlide: (id: string, input: Partial<Slide>, index?: number) =>
      post(`/api/artifacts/${id}/slides`, { ...input, index }).then((r) =>
        json<{ artifact: Artifact; slide: Slide }>(r),
      ),
    updateSlide: (id: string, slideId: string, patch: Partial<Slide>) =>
      post(`/api/artifacts/${id}/slides/${slideId}`, patch, 'PATCH').then((r) =>
        json<{ artifact: Artifact; slide: Slide }>(r),
      ),
    removeSlide: (id: string, slideId: string) =>
      post(`/api/artifacts/${id}/slides/${slideId}`, undefined, 'DELETE').then(
        (r) => json<Artifact>(r),
      ),
    move: (id: string, slideId: string, toIndex: number) =>
      post(`/api/artifacts/${id}/slides/${slideId}/move`, { toIndex }).then(
        (r) => json<Artifact>(r),
      ),
    reorder: (id: string, order: string[]) =>
      post(`/api/artifacts/${id}/slides/reorder`, { order }).then((r) =>
        json<Artifact>(r),
      ),
    stagePublish: (id: string) =>
      fetchWithWorkspace(`/api/artifacts/${id}/stage-publish`).then((r) =>
        json<StagedBundle>(r),
      ),
    publishResult: (
      id: string,
      body: { published?: PublishedInfo; error?: string },
    ) =>
      post(`/api/artifacts/${id}/publish-result`, body).then((r) =>
        json<Artifact>(r),
      ),
    unpublish: (id: string) =>
      post(`/api/artifacts/${id}/unpublish`).then((r) => json<Artifact>(r)),
    applyTemplate: (id: string, templateId: string) =>
      post(`/api/artifacts/${id}/template`, { templateId }).then((r) =>
        json<Artifact>(r),
      ),
    listVersions: (id: string) =>
      fetchWithWorkspace(`/api/artifacts/${id}/versions`).then((r) =>
        json<VersionMeta[]>(r),
      ),
    revert: (id: string, versionId: string) =>
      post(`/api/artifacts/${id}/revert`, { versionId }).then((r) =>
        json<Artifact>(r),
      ),
    listImages: (id: string) =>
      fetchWithWorkspace(`/api/artifacts/${id}/images`).then((r) =>
        json<{ fileName: string; path: string }[]>(r),
      ),
    generateImage: (
      id: string,
      input: {
        prompt: string
        size?: string
        fileName?: string
        styleRef?: string
      },
    ) =>
      post(`/api/artifacts/${id}/images/generate`, input).then((r) =>
        json<ArtifactImageResult>(r),
      ),
    editImage: (
      id: string,
      input: {
        source: string
        prompt: string
        size?: string
        fileName?: string
      },
    ) =>
      post(`/api/artifacts/${id}/images/edit`, input).then((r) =>
        json<ArtifactImageResult>(r),
      ),
    listHostingProviders: () =>
      fetchWithWorkspace('/api/hosting/providers').then((r) =>
        json<HostingProviderInfo[]>(r),
      ),
    listHostingConnections: () =>
      fetchWithWorkspace('/api/hosting/connections').then((r) =>
        json<HostingConnection[]>(r),
      ),
    startHostingConnection: (provider: HostingProviderId) =>
      post(`/api/hosting/connections/${provider}/start`).then((r) =>
        json<{ url: string }>(r),
      ),
    disconnectHostingProvider: (provider: HostingProviderId) =>
      post(`/api/hosting/connections/${provider}/disconnect`).then((r) =>
        json<{ ok: true }>(r),
      ),
    listHostingTargets: (id: string) =>
      fetchWithWorkspace(`/api/artifacts/${id}/hosting-targets`).then((r) =>
        json<HostingTarget[]>(r),
      ),
    createHostingTarget: (
      id: string,
      input: {
        provider: HostingProviderId
        name?: string
        remoteName?: string
        teamId?: string
      },
    ) =>
      post(`/api/artifacts/${id}/hosting-targets`, input).then((r) =>
        json<HostingTarget>(r),
      ),
    deployHostingTarget: (id: string, targetId: string) =>
      post(`/api/artifacts/${id}/hosting-targets/${targetId}/deploy`).then(
        (r) => json<HostingDeployResult>(r),
      ),
    deleteHostingTarget: (id: string, targetId: string) =>
      post(
        `/api/artifacts/${id}/hosting-targets/${targetId}`,
        undefined,
        'DELETE',
      ).then((r) => json<{ ok: true }>(r)),
  }
}

export type Api = ReturnType<typeof createApi>
