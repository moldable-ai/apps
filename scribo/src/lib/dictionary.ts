import type { Language } from './languages'

// Free Dictionary API supports these languages
// https://dictionaryapi.dev/
const DICTIONARY_API_LANGUAGES = new Set([
  'en',
  'es',
  'fr',
  'de',
  'it',
  'pt',
  'ru',
  'ar',
  'tr',
  'ko',
  'ja',
  'zh',
  'hi',
])

export interface DictionaryEntry {
  word: string
  phonetic?: string
  meanings: Array<{
    partOfSpeech: string
    definitions: Array<{
      definition: string
      example?: string
    }>
  }>
}

export interface WordLookupResult {
  word: string
  language: Language
  entry?: DictionaryEntry
  error?: string
}

/**
 * Look up a word in the dictionary using the Free Dictionary API
 * Falls back gracefully if the language isn't supported or word isn't found
 */
export async function lookupWord(
  word: string,
  language: Language,
  signal?: AbortSignal,
): Promise<WordLookupResult> {
  // Check if language is supported
  if (!DICTIONARY_API_LANGUAGES.has(language)) {
    return {
      word,
      language,
      error: `Dictionary lookup not available for this language. Use system lookup (Force Touch or ⌃⌘D).`,
    }
  }

  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/${language}/${encodeURIComponent(word)}`,
      { signal },
    )

    if (!response.ok) {
      if (response.status === 404) {
        return {
          word,
          language,
          error: `No definition found for "${word}"`,
        }
      }
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()

    if (!Array.isArray(data) || data.length === 0) {
      return {
        word,
        language,
        error: `No definition found for "${word}"`,
      }
    }

    // Take the first entry
    const entry = data[0]

    return {
      word,
      language,
      entry: {
        word: entry.word,
        phonetic: entry.phonetic || entry.phonetics?.[0]?.text,
        meanings: (entry.meanings || []).map((m: Record<string, unknown>) => ({
          partOfSpeech: m.partOfSpeech as string,
          definitions: ((m.definitions as Array<Record<string, unknown>>) || [])
            .slice(0, 3) // Limit to 3 definitions per part of speech
            .map((d) => ({
              definition: d.definition as string,
              example: d.example as string | undefined,
            })),
        })),
      },
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }

    return {
      word,
      language,
      error: 'Failed to look up word. Try system lookup (Force Touch or ⌃⌘D).',
    }
  }
}
