export type EbookFormat = 'epub' | 'txt'
export type ReadingMode = 'standard' | 'speed'

export interface ChapterRef {
  /** Stable order index, 0-based */
  index: number
  /** Title from the book's nav/TOC, or a generated fallback */
  title: string
  /** Original spine href (kept for debugging / TOC mapping) */
  href: string
  /** Number of words in the chapter */
  wordCount: number
}

export interface BookMeta {
  id: string
  title: string
  author: string | null
  format: EbookFormat
  language: string | null
  description: string | null
  publisher: string | null
  /** Whether a cover image is stored for this book */
  hasCover: boolean
  /** Deterministic fallback cover color (OKLCH) used when there is no cover */
  coverColor: string
  chapters: ChapterRef[]
  /** Total words across all chapters */
  wordCount: number
  addedAt: string
  updatedAt: string
  /** Original filename the book was imported from, if any */
  source: string | null
}

export interface ReadingProgress {
  bookId: string
  /** Current chapter index */
  chapterIndex: number
  /** Block/paragraph offset within the chapter for scroll/paginated resume */
  blockIndex: number
  /** Word offset within the chapter for speed-reading resume */
  wordIndex: number
  /** Overall reading completion, 0..1 */
  percent: number
  /** Last reader UX used for this book. Missing values are treated as standard. */
  readerMode?: ReadingMode
  updatedAt: string
}

export interface BookSummary {
  id: string
  title: string
  author: string | null
  format: EbookFormat
  hasCover: boolean
  coverColor: string
  chapterCount: number
  wordCount: number
  addedAt: string
  updatedAt: string
  /** Latest reading progress, if the book has been opened */
  progress: ReadingProgress | null
}

export interface BooksResponse {
  books: BookSummary[]
}

export interface ChapterContent {
  bookId: string
  index: number
  title: string
  /** Sanitized HTML with resource URLs rewritten to /api/books/:id/resource/... */
  html: string
  /** Plain text of the chapter, used for speed reading and word counts */
  text: string
  wordCount: number
}

export interface BookSearchResult {
  id: string
  bookId: string
  chapterIndex: number
  chapterTitle: string
  /** Character offset in the chapter's plain text. Used as a jump target. */
  textStart: number
  textLength: number
  /** 0..1 position through the chapter. */
  position: number
  before: string
  match: string
  after: string
}

export interface BookSearchResponse {
  query: string
  results: BookSearchResult[]
  total: number
  truncated: boolean
}

const COVER_HUES = [25, 55, 95, 150, 200, 240, 280, 320]

/** Deterministic OKLCH color from a seed string, used for cover fallbacks. */
export function coverColorFromSeed(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  const hue = COVER_HUES[Math.abs(hash) % COVER_HUES.length] ?? COVER_HUES[0]
  return `oklch(0.62 0.13 ${hue})`
}

/** Count words in a plain-text string. */
export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}
