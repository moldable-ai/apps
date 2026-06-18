// Thin typed client over the app's REST routes. Every call goes through
// `fetchWithWorkspace` so the active workspace header is attached.
import type {
  Deck,
  DeckSummary,
  PublishedInfo,
  Slide,
} from '../../shared/types'

const CLIENT_REQUEST_HEADER = 'x-slides-client'

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

export interface SlideImageResult {
  path: string
  fileName: string
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
    listDecks: () =>
      fetchWithWorkspace('/api/decks').then((r) => json<DeckSummary[]>(r)),
    getDeck: (id: string) =>
      fetchWithWorkspace(`/api/decks/${id}`).then((r) => json<Deck>(r)),
    createDeck: (input?: Partial<Deck>) =>
      post('/api/decks', input ?? {}).then((r) => json<Deck>(r)),
    updateDeck: (id: string, patch: Partial<Deck>) =>
      post(`/api/decks/${id}`, patch, 'PATCH').then((r) => json<Deck>(r)),
    setImageStyle: (id: string, input: { style?: string; presetId?: string }) =>
      post(`/api/decks/${id}/image-style`, input).then((r) => json<Deck>(r)),
    deleteDeck: (id: string) =>
      post(`/api/decks/${id}`, undefined, 'DELETE').then((r) =>
        json<{ ok: boolean }>(r),
      ),
    addSlide: (id: string, input: Partial<Slide>, index?: number) =>
      post(`/api/decks/${id}/slides`, { ...input, index }).then((r) =>
        json<{ deck: Deck; slide: Slide }>(r),
      ),
    updateSlide: (id: string, slideId: string, patch: Partial<Slide>) =>
      post(`/api/decks/${id}/slides/${slideId}`, patch, 'PATCH').then((r) =>
        json<{ deck: Deck; slide: Slide }>(r),
      ),
    removeSlide: (id: string, slideId: string) =>
      post(`/api/decks/${id}/slides/${slideId}`, undefined, 'DELETE').then(
        (r) => json<Deck>(r),
      ),
    move: (id: string, slideId: string, toIndex: number) =>
      post(`/api/decks/${id}/slides/${slideId}/move`, { toIndex }).then((r) =>
        json<Deck>(r),
      ),
    reorder: (id: string, order: string[]) =>
      post(`/api/decks/${id}/slides/reorder`, { order }).then((r) =>
        json<Deck>(r),
      ),
    stagePublish: (id: string) =>
      fetchWithWorkspace(`/api/decks/${id}/stage-publish`).then((r) =>
        json<StagedBundle>(r),
      ),
    publishResult: (
      id: string,
      body: { published?: PublishedInfo; error?: string },
    ) =>
      post(`/api/decks/${id}/publish-result`, body).then((r) => json<Deck>(r)),
    unpublish: (id: string) =>
      post(`/api/decks/${id}/unpublish`).then((r) => json<Deck>(r)),
    applyTemplate: (id: string, templateId: string) =>
      post(`/api/decks/${id}/template`, { templateId }).then((r) =>
        json<Deck>(r),
      ),
    listVersions: (id: string) =>
      fetchWithWorkspace(`/api/decks/${id}/versions`).then((r) =>
        json<VersionMeta[]>(r),
      ),
    revert: (id: string, versionId: string) =>
      post(`/api/decks/${id}/revert`, { versionId }).then((r) => json<Deck>(r)),
    listImages: (id: string) =>
      fetchWithWorkspace(`/api/decks/${id}/images`).then((r) =>
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
      post(`/api/decks/${id}/images/generate`, input).then((r) =>
        json<SlideImageResult>(r),
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
      post(`/api/decks/${id}/images/edit`, input).then((r) =>
        json<SlideImageResult>(r),
      ),
  }
}

export type Api = ReturnType<typeof createApi>
