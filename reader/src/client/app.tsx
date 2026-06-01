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
    setView((current) =>
      current.kind === 'reader' ? { kind: 'library' } : current,
    )
    navEntryRef.current = null
  })

  // Deep link: /?book=<id> opens a book directly (used by the Today resume rail).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const bookId = params.get('book')
    if (bookId) openBook(bookId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="bg-background text-foreground h-full min-h-0 overflow-hidden">
      {view.kind === 'library' ? (
        <LibraryView onOpenBook={openBook} />
      ) : (
        <ReaderView bookId={view.bookId} onClose={() => closeBook(false)} />
      )}
    </main>
  )
}
