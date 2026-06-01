import type { Language } from './languages'

/** A source-language selection: a concrete language, or auto-detect. */
export type SourceSelection = Language | 'auto'

/** A single text translation, persisted to the workspace history. */
export interface TranslationRecord {
  id: string
  /** The original text the user entered. */
  sourceText: string
  /** The translated output. */
  translatedText: string
  /** What the user asked the source to be ("auto" when detected). */
  requestedSource: SourceSelection
  /** The resolved source language (detected when requestedSource is "auto"). */
  sourceLanguage: Language
  /** The target language. */
  targetLanguage: Language
  /** ISO timestamp of when the translation was made. */
  createdAt: string
}
