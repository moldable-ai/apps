import { useCallback, useEffect, useRef, useState } from 'react'
import {
  popMoldableNavigation,
  pushMoldableNavigation,
  useMoldableNavigationPop,
} from '@moldable-ai/ui'
import { LibraryView } from './components/library-view'
import { ReaderView } from './components/reader-view'

type View = { kind: 'library' } | { kind: 'reader'; bookId: string }

export function App() {
  const [view, setView] = useState<View>({ kind: 'library' })
  const navEntryRef = useRef<string | null>(null)

  const openBook = useCallback((bookId: string) => {
    if (navEntryRef.current) {
      popMoldableNavigation(navEntryRef.current)
      navEntryRef.current = null
    }
    setView({ kind: 'reader', bookId })
    const id = pushMoldableNavigation({ title: 'Reading' }) as unknown
    navEntryRef.current = typeof id === 'string' ? id : null
  }, [])

  const closeBook = useCallback((fromHost = false) => {
    setView({ kind: 'library' })
    if (!fromHost && navEntryRef.current) {
      popMoldableNavigation(navEntryRef.current)
    }
    navEntryRef.current = null
  }, [])

  // Host back button.
  useMoldableNavigationPop(() => {
    closeBook(true)
  })

  // Deep link: /?book=<id> opens a book directly (used by the Today resume rail).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const bookId = params.get('book')
    if (bookId) openBook(bookId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep fixed reader controls aligned with the *current* desktop chat state.
  // The generic --chat-safe-padding can be conservative; Mail uses this host
  // event for bottom docks so minimized chat does not leave a large dead zone.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'moldable:chat-state') return
      const safePadding = Number(event.data.safePadding)
      if (!Number.isFinite(safePadding)) return
      const isChatHidden = safePadding <= 0
      document.documentElement.style.setProperty(
        '--reader-control-safe-padding',
        `${Math.max(0, safePadding)}px`,
      )
      document.documentElement.style.setProperty(
        '--reader-page-bottom-gutter',
        isChatHidden ? '1rem' : '4rem',
      )
      document.documentElement.style.setProperty(
        '--reader-speed-control-bottom-gutter',
        isChatHidden ? '1rem' : '1.75rem',
      )
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <main className="bg-background text-foreground h-full min-h-0 overflow-hidden">
      {view.kind === 'library' ? (
        <LibraryView onOpenBook={openBook} />
      ) : (
        <ReaderView
          key={view.bookId}
          bookId={view.bookId}
          onClose={() => closeBook(false)}
        />
      )}
    </main>
  )
}
