import type { Language } from './languages'

/**
 * Cache of block-level translations.
 * Maps source text hash → translated text.
 * Only valid for the specified language pair.
 */
export interface TranslationCache {
  /** Source language this cache is valid for */
  sourceLang: Language
  /** Target language this cache is valid for */
  targetLang: Language
  /** Map of source text hash → translated text */
  blocks: Record<string, string>
}

export interface JournalEntry {
  id: string
  title: string
  content: string
  translation: string
  sourceLanguage: Language
  targetLanguage: Language
  createdAt: Date
  updatedAt: Date
  /**
   * Cached translations at the block level.
   * Used to avoid re-translating unchanged content.
   */
  translationCache?: TranslationCache
}
