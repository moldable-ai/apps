import type { EbookFormat } from '../shared/book'

/**
 * Contract shared between the ebook parser (epub-parser.ts) and the book store
 * (book-store.ts). The parser produces a ParsedBook; the store persists it.
 */

export interface ParsedChapter {
  /** Stable order index, 0-based */
  index: number
  /** Title from nav/TOC, or a generated fallback like "Chapter 3" */
  title: string
  /** Original spine href (kept for debugging / TOC mapping) */
  href: string
  /**
   * Sanitized chapter HTML. Any references to bundled resources (images, etc.)
   * MUST use a placeholder src of the form `__RES__/<resourcePath>`, where
   * <resourcePath> matches a ParsedResource.path. The store rewrites these to
   * `/api/books/:id/resource/<resourcePath>` when serving.
   */
  html: string
  /** Plain text extracted from the chapter, used for speed reading + word counts */
  text: string
}

export interface ParsedResource {
  /** Path used in `__RES__/<path>` references (normalized, no leading slash) */
  path: string
  /** Raw file bytes */
  data: Uint8Array
  /** Best-effort mime type */
  contentType: string
}

export interface ParsedCover {
  data: Uint8Array
  contentType: string
  /** File extension without the dot, e.g. "jpg" or "png" */
  ext: string
}

export interface ParsedBook {
  title: string
  author: string | null
  language: string | null
  description: string | null
  publisher: string | null
  format: EbookFormat
  chapters: ParsedChapter[]
  resources: ParsedResource[]
  cover: ParsedCover | null
}

/**
 * A seed book bundled with the app and written into a workspace on first run.
 * Authored as ready-to-render sanitized HTML chapters (no external resources).
 */
export interface SeedBook {
  /** Stable id, lowercase-hyphen */
  id: string
  title: string
  author: string | null
  language?: string | null
  description?: string | null
  chapters: SeedChapter[]
}

export interface SeedChapter {
  title: string
  /** Sanitized HTML for the chapter body */
  html: string
}
