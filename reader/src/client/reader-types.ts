import type { ReaderSettings } from '../shared/reader-settings'

/**
 * Prop contracts shared between app.tsx and the major views built by the
 * workflow. Each view implements exactly these props.
 */

export interface LibraryViewProps {
  /** Open a book in the reader. */
  onOpenBook: (bookId: string) => void
}

export interface ReaderViewProps {
  bookId: string
  /** Return to the library. */
  onClose: () => void
}

export interface SpeedReaderProps {
  open: boolean
  onClose: () => void
  /** Title shown in the speed-reader chrome (book or chapter title). */
  title: string
  /** Ordered word tokens for the current chapter. */
  words: string[]
  /** Word index to start from. */
  startIndex: number
  /** Live reader settings (uses wpm, chunkSize, punctuationPause, theme). */
  settings: ReaderSettings
  /** Persist a settings change (e.g. wpm tweak from the speed-reader chrome). */
  onSettingsChange: (patch: Partial<ReaderSettings>) => void
  /** Called as the reader advances so the host can persist resume position. */
  onProgress?: (wordIndex: number) => void
}
