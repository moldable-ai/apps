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
import { DeckGrid } from './components/deck-grid'
import type { Deck, DeckSummary } from '../shared/types'

const DeckEditor = lazy(() =>
  import('./components/deck-editor').then((module) => ({
    default: module.DeckEditor,
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

function summarizeDeck(deck: Deck): DeckSummary {
  return {
    id: deck.id,
    title: deck.title,
    subtitle: deck.subtitle,
    templateId: deck.templateId,
    slideCount: deck.slides.length,
    published: Boolean(deck.published),
    publishedUrl: deck.published?.url ?? null,
    publishPending: Boolean(deck.publishPending),
    updatedAt: deck.updatedAt,
    createdAt: deck.createdAt,
  }
}

export function App() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const api = useMemo(() => createApi(fetchWithWorkspace), [fetchWithWorkspace])

  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [picking, setPicking] = useState(false)
  const [publishStates, setPublishStates] = useState<
    Record<string, PublishState>
  >({})
  const inFlight = useRef<Set<string>>(new Set())

  const decksQuery = useQuery({
    queryKey: ['decks', workspaceId],
    queryFn: () => api.listDecks(),
    refetchInterval: 4000,
  })

  const deckQuery = useQuery({
    queryKey: ['deck', workspaceId, openId],
    queryFn: () => api.getDeck(openId as string),
    enabled: Boolean(openId),
    refetchInterval: 3000,
  })

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['decks', workspaceId] })
    void queryClient.invalidateQueries({ queryKey: ['deck', workspaceId] })
  }, [queryClient, workspaceId])

  const updateCachedDeck = useCallback(
    (deck: Deck) => {
      queryClient.setQueryData(['deck', workspaceId, deck.id], deck)
      queryClient.setQueryData<DeckSummary[]>(
        ['decks', workspaceId],
        (current) => {
          if (!current) return current
          const summary = summarizeDeck(deck)
          const next = current.some((item) => item.id === deck.id)
            ? current.map((item) => (item.id === deck.id ? summary : item))
            : [summary, ...current]
          return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        },
      )
    },
    [queryClient, workspaceId],
  )

  // Live updates: when chat mutates a deck via an RPC capability, the host posts
  // `moldable:app-api-changed` into this iframe. Invalidate immediately so the
  // editor (and the unpublished-changes dot) reflect it without waiting on the
  // 3–4s poll.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'moldable:app-api-changed') return
      const { targetAppId, method } = event.data as {
        targetAppId?: string
        method?: string
      }
      if (targetAppId && targetAppId !== 'slides') return
      if (typeof method === 'string' && method && !method.startsWith('slides.'))
        return
      invalidate()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [invalidate])

  const setPub = useCallback((id: string, state: PublishState) => {
    setPublishStates((prev) => ({ ...prev, [id]: state }))
  }, [])

  const publishDeck = useCallback(
    async (id: string) => {
      if (inFlight.current.has(id)) return
      inFlight.current.add(id)
      setPub(id, { publishing: true, error: null })
      try {
        if (!isInMoldable()) {
          throw new Error('Open this deck inside Moldable to publish.')
        }
        const bundle = await api.stagePublish(id)
        const result = await publishArtifact({
          kind: 'slides',
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

  // Bridge: chat calls the `slides.deck.publish` RPC, which flags the deck as
  // pending. Only the open client iframe can actually publish, so complete it
  // here when we observe the flag.
  useEffect(() => {
    const decks = decksQuery.data
    if (!decks) return
    for (const deck of decks) {
      if (deck.publishPending && !inFlight.current.has(deck.id)) {
        void publishDeck(deck.id)
      }
    }
  }, [decksQuery.data, publishDeck])

  const unpublishDeck = useCallback(
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
  // back button. Opening a deck pushes; the host back gesture pops.
  useEffect(() => {
    resetMoldableNavigation()
  }, [])
  useMoldableNavigationPop(() => setOpenId(null))

  const openDeck = useCallback((id: string, title: string) => {
    pushMoldableNavigation({ id: `deck:${id}`, title: title || 'Deck' })
    setOpenId(id)
  }, [])

  const closeDeck = useCallback(() => {
    popMoldableNavigation()
    setOpenId(null)
  }, [])

  const createDeck = useCallback(
    async (templateId?: string | null) => {
      setCreating(true)
      try {
        const deck = await api.createDeck(
          templateId
            ? { title: 'Untitled deck', templateId }
            : { title: 'Untitled deck' },
        )
        invalidate()
        setPicking(false)
        openDeck(deck.id, deck.title)
      } finally {
        setCreating(false)
      }
    },
    [api, invalidate, openDeck],
  )

  const deleteDeck = useCallback(
    async (id: string) => {
      await api.deleteDeck(id)
      if (openId === id) closeDeck()
      invalidate()
    },
    [api, invalidate, openId, closeDeck],
  )

  const decks: DeckSummary[] = decksQuery.data ?? []
  const currentDeck: Deck | undefined = openId
    ? (deckQuery.data ?? undefined)
    : undefined

  // The open deck was deleted out from under us (e.g. via chat): its own fetch
  // 404s. (Keying off the deck list instead would race a freshly created deck
  // that the list hasn't picked up yet.)
  useEffect(() => {
    if (openId && deckQuery.isError) closeDeck()
  }, [openId, deckQuery.isError, closeDeck])

  // Customize the chat system prompt for the current view: the deck's style
  // coding guide when a deck is open, otherwise the deck-creation/style guidance.
  // Memoize so polling (which yields a fresh deck object) doesn't re-post the
  // same text — the effect only fires when the instruction string truly changes.
  useEffect(() => {
    let active = true
    void import('./lib/chat-context').then((context) => {
      void (async () => {
        if (!active) return
        const text =
          openId && currentDeck
            ? await context.deckChatInstructions(currentDeck)
            : await context.gridChatInstructions()
        if (!active) return
        window.parent.postMessage(
          {
            type: 'moldable:set-chat-instructions',
            text,
          },
          '*',
        )
      })()
    })
    return () => {
      active = false
    }
  }, [openId, currentDeck])

  useEffect(
    () => () => {
      window.parent.postMessage(
        { type: 'moldable:set-chat-instructions', text: '' },
        '*',
      )
    },
    [],
  )

  if (openId && currentDeck) {
    return (
      <Suspense fallback={<FullScreenLoading />}>
        <DeckEditor
          deck={currentDeck}
          workspaceId={workspaceId}
          api={api}
          publishState={
            publishStates[openId] ?? { publishing: currentDeck.publishPending }
          }
          onChanged={invalidate}
          onDeckUpdated={updateCachedDeck}
          onPublish={publishDeck}
          onUnpublish={unpublishDeck}
        />
      </Suspense>
    )
  }

  return (
    <main className="bg-background text-foreground h-full overflow-y-auto">
      <DeckGrid
        decks={decks}
        workspaceId={workspaceId}
        onOpen={openDeck}
        onNew={() => setPicking(true)}
        onDelete={deleteDeck}
        creating={creating}
      />
      {picking ? (
        <Suspense fallback={null}>
          <TemplatePicker
            title="Start a new deck"
            confirmLabel="Create deck"
            allowBlank
            busy={creating}
            onPick={(templateId) => void createDeck(templateId)}
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
