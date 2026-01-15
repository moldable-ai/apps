import type { Language } from './languages'
import type { TranslationCache } from './types'

interface TranslationResponse {
  translatedText: string
  cache: TranslationCache
}

interface TranslationErrorResponse {
  error: string
  code?: 'MISSING_API_KEY' | 'VALIDATION_ERROR' | 'API_ERROR' | 'INTERNAL_ERROR'
}

export class TranslationError extends Error {
  code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'TranslationError'
    this.code = code
  }
}

/**
 * Result of a translation, including the updated cache to save with the entry.
 */
export interface TranslationResult {
  translatedText: string
  cache: TranslationCache
}

/**
 * Translate markdown content using the API route.
 * Preserves markdown structure (headings, lists, formatting, etc.)
 *
 * @param markdown - The markdown content to translate
 * @param from - Source language
 * @param to - Target language
 * @param existingCache - Existing translation cache from the saved entry (used to skip re-translating unchanged blocks)
 * @param signal - AbortSignal for cancellation
 * @returns The translated text and updated cache to save with the entry
 */
export async function translateText(
  markdown: string,
  from: Language,
  to: Language,
  existingCache?: TranslationCache | null,
  signal?: AbortSignal,
): Promise<TranslationResult> {
  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ markdown, from, to, cache: existingCache }),
    signal,
  })

  if (!response.ok) {
    const errorData: TranslationErrorResponse = await response
      .json()
      .catch(() => ({ error: 'Translation failed' }))
    throw new TranslationError(
      errorData.error || 'Translation failed',
      errorData.code,
    )
  }

  const data: TranslationResponse = await response.json()
  return {
    translatedText: data.translatedText,
    cache: data.cache,
  }
}
