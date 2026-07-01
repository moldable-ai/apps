import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createApi } from './lib/api'
import {
  isInMoldable,
  popMoldableNavigation,
  pushMoldableNavigation,
  resetMoldableNavigation,
  useMoldableNavigationPop,
  useWorkspace,
} from './lib/moldable-ui'
import { publishArtifact } from './lib/publish'
import { ArtifactGrid } from './components/artifact-grid'
import type { Artifact, ArtifactKind, ArtifactSummary } from '../shared/types'

const DeckEditor = lazy(() =>
  import('./components/deck-editor').then((module) => ({
    default: module.DeckEditor,
  })),
)

const PageEditor = lazy(() =>
  import('./components/page-editor').then((module) => ({
    default: module.PageEditor,
  })),
)

const TemplatePicker = lazy(() =>
  import('./components/template-picker').then((module) => ({
    default: module.TemplatePicker,
  })),
)

interface PublishState {
  publishing: boolean
  error?: string | null
}

function summarizeArtifact(artifact: Artifact): ArtifactSummary {
  return {
    id: artifact.id,
    title: artifact.title,
    subtitle: artifact.subtitle,
    kind: artifact.kind,
    templateId: artifact.templateId,
    slideCount: artifact.slides.length,
    published: Boolean(artifact.published),
    publishedUrl: artifact.published?.url ?? null,
    publishPending: Boolean(artifact.publishPending),
    updatedAt: artifact.updatedAt,
    createdAt: artifact.createdAt,
  }
}

export function App() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const api = useMemo(() => createApi(fetchWithWorkspace), [fetchWithWorkspace])

  const [openId, setOpenId] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [creating, setCreating] = useState(false)
  const [publishStates, setPublishStates] = useState<
    Record<string, PublishState>
  >({})
  const inFlight = useRef<Set<string>>(new Set())

  const artifactsQuery = useQuery({
    queryKey: ['artifacts', workspaceId],
    queryFn: () => api.listArtifacts(),
    refetchInterval: 4000,
  })

  const artifactQuery = useQuery({
    queryKey: ['artifact', workspaceId, openId],
    queryFn: () => api.getArtifact(openId as string),
    enabled: Boolean(openId),
    refetchInterval: 3000,
  })

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['artifacts', workspaceId] })
    void queryClient.invalidateQueries({ queryKey: ['artifact', workspaceId] })
  }, [queryClient, workspaceId])

  const updateCachedArtifact = useCallback(
    (artifact: Artifact) => {
      queryClient.setQueryData(['artifact', workspaceId, artifact.id], artifact)
      queryClient.setQueryData<ArtifactSummary[]>(
        ['artifacts', workspaceId],
        (current) => {
          if (!current) return current
          const summary = summarizeArtifact(artifact)
          const next = current.some((item) => item.id === artifact.id)
            ? current.map((item) => (item.id === artifact.id ? summary : item))
            : [summary, ...current]
          return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        },
      )
    },
    [queryClient, workspaceId],
  )

  // Live updates: when chat mutates an artifact via an RPC capability, the host
  // posts `moldable:app-api-changed` into this iframe. Invalidate immediately.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'moldable:app-api-changed') return
      const { targetAppId, method } = event.data as {
        targetAppId?: string
        method?: string
      }
      if (targetAppId && targetAppId !== 'artifacts') return
      if (
        typeof method === 'string' &&
        method &&
        !method.startsWith('artifacts.')
      )
        return
      invalidate()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [invalidate])

  const setPub = useCallback((id: string, state: PublishState) => {
    setPublishStates((prev) => ({ ...prev, [id]: state }))
  }, [])

  const publishOne = useCallback(
    async (id: string) => {
      if (inFlight.current.has(id)) return
      inFlight.current.add(id)
      setPub(id, { publishing: true, error: null })
      try {
        if (!isInMoldable()) {
          throw new Error('Open this artifact inside Moldable to publish.')
        }
        const bundle = await api.stagePublish(id)
        const kind = (bundle.metadata?.artifactKind as string) || 'page'
        const result = await publishArtifact({
          kind,
          title: bundle.title,
          entrypoint: bundle.entrypoint,
          metadata: bundle.metadata,
          files: bundle.files.map((f) => ({
            path: f.path,
            contentType: f.contentType,
            sourcePath: f.sourcePath,
          })),
        })
        await api.publishResult(id, {
          published: {
            url: result.url,
            slug: result.slug,
            version: result.version,
            publishedAt: new Date().toISOString(),
          },
        })
        setPub(id, { publishing: false, error: null })
        return { url: result.url }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Publishing failed.'
        await api.publishResult(id, { error: message }).catch(() => {})
        setPub(id, { publishing: false, error: message })
      } finally {
        inFlight.current.delete(id)
        invalidate()
      }
    },
    [api, invalidate, setPub],
  )

  // Bridge: chat calls the `artifacts.publish` RPC, which flags the artifact as
  // pending. Only the open client iframe can actually publish, so complete it
  // here when we observe the flag.
  useEffect(() => {
    const artifacts = artifactsQuery.data
    if (!artifacts) return
    for (const artifact of artifacts) {
      if (artifact.publishPending && !inFlight.current.has(artifact.id)) {
        void publishOne(artifact.id)
      }
    }
  }, [artifactsQuery.data, publishOne])

  const unpublishOne = useCallback(
    async (id: string) => {
      setPub(id, { publishing: true, error: null })
      try {
        await api.unpublish(id)
        setPub(id, { publishing: false, error: null })
      } catch (error) {
        setPub(id, {
          publishing: false,
          error: error instanceof Error ? error.message : 'Unpublish failed.',
        })
      } finally {
        invalidate()
      }
    },
    [api, invalidate, setPub],
  )

  // Use the host navigation stack (its back affordance) rather than an in-app
  // back button. Opening an artifact pushes; the host back gesture pops.
  useEffect(() => {
    resetMoldableNavigation()
  }, [])
  useMoldableNavigationPop(() => setOpenId(null))

  const openArtifact = useCallback((id: string, title: string) => {
    pushMoldableNavigation({ id: `artifact:${id}`, title: title || 'Artifact' })
    setOpenId(id)
  }, [])

  const closeArtifact = useCallback(() => {
    popMoldableNavigation()
    setOpenId(null)
  }, [])

  const createArtifact = useCallback(
    async (templateId: string | null, blankKind: ArtifactKind = 'page') => {
      setCreating(true)
      try {
        const artifact = await api.createArtifact(
          templateId ? { templateId } : { kind: blankKind, title: 'Untitled' },
        )
        invalidate()
        setPicking(false)
        openArtifact(artifact.id, artifact.title)
      } finally {
        setCreating(false)
      }
    },
    [api, invalidate, openArtifact],
  )

  const deleteArtifact = useCallback(
    async (id: string) => {
      await api.deleteArtifact(id)
      if (openId === id) closeArtifact()
      invalidate()
    },
    [api, invalidate, openId, closeArtifact],
  )

  const artifacts: ArtifactSummary[] = artifactsQuery.data ?? []
  const currentArtifact: Artifact | undefined = openId
    ? (artifactQuery.data ?? undefined)
    : undefined

  // The open artifact was deleted out from under us (e.g. via chat): its own
  // fetch 404s.
  useEffect(() => {
    if (openId && artifactQuery.isError) closeArtifact()
  }, [openId, artifactQuery.isError, closeArtifact])

  // Customize the chat system prompt for the current view.
  useEffect(() => {
    let active = true
    void import('./lib/chat-context').then((context) => {
      void (async () => {
        if (!active) return
        const text =
          openId && currentArtifact
            ? await context.artifactChatInstructions(currentArtifact)
            : await context.gridChatInstructions()
        if (!active) return
        window.parent.postMessage(
          { type: 'moldable:set-chat-instructions', text },
          '*',
        )
      })()
    })
    return () => {
      active = false
    }
  }, [openId, currentArtifact])

  useEffect(
    () => () => {
      window.parent.postMessage(
        { type: 'moldable:set-chat-instructions', text: '' },
        '*',
      )
    },
    [],
  )

  if (openId && currentArtifact) {
    const publishState = publishStates[openId] ?? {
      publishing: currentArtifact.publishPending,
    }
    return (
      <Suspense fallback={<FullScreenLoading />}>
        {currentArtifact.kind === 'page' ? (
          <PageEditor
            artifact={currentArtifact}
            workspaceId={workspaceId}
            api={api}
            publishState={publishState}
            onChanged={invalidate}
            onPublish={publishOne}
            onUnpublish={unpublishOne}
          />
        ) : (
          <DeckEditor
            deck={currentArtifact}
            workspaceId={workspaceId}
            api={api}
            publishState={publishState}
            onChanged={invalidate}
            onDeckUpdated={updateCachedArtifact}
            onPublish={publishOne}
            onUnpublish={unpublishOne}
          />
        )}
      </Suspense>
    )
  }

  return (
    <main className="bg-background text-foreground h-full overflow-y-auto">
      <ArtifactGrid
        artifacts={artifacts}
        workspaceId={workspaceId}
        onOpen={openArtifact}
        onNew={() => setPicking(true)}
        onDelete={deleteArtifact}
        creating={creating}
      />
      {picking ? (
        <Suspense fallback={null}>
          <TemplatePicker
            title="Start a new artifact"
            confirmLabel="Create"
            allowBlank
            busy={creating}
            onPick={(templateId) => void createArtifact(templateId)}
            onClose={() => setPicking(false)}
          />
        </Suspense>
      ) : null}
    </main>
  )
}

function FullScreenLoading() {
  return <main className="bg-background h-full" />
}
