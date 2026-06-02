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
  onClose: (wordIndex?: number) => void
  /** Title shown in the speed-reader chrome (book or chapter title). */
  title: string
  /** Ordered word tokens for the current chapter. */
  words: string[]
  /** Word index to start from. */
  startIndex: number
  /** Words before this chapter, used for whole-book progress. */
  wordsBeforeChapter: number
  /** Total words in the book, used for whole-book progress. */
  bookWordCount: number
  /** Words remaining after this chapter, used for whole-book time estimates. */
  remainingWordsAfterChapter: number
  /** Live reader settings (uses wpm, chunkSize, punctuationPause, theme). */
  settings: ReaderSettings
  /** Persist a settings change (e.g. wpm tweak from the speed-reader chrome). */
  onSettingsChange: (patch: Partial<ReaderSettings>) => void
  /** Whether another chapter is available after the current source words. */
  hasNextChapter?: boolean
  /** Auto-resume playback when the parent swaps in the next chapter's words. */
  autoPlayOnSourceChange?: boolean
  /** Called when playback reaches the end of the current chapter. */
  onChapterComplete?: (wordIndex: number) => void
  /** Called as the reader advances so the host can persist resume position. */
  onProgress?: (wordIndex: number) => void
}
