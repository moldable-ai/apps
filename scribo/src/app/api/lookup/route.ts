import { NextRequest, NextResponse } from 'next/server'

interface FreeDictionaryLanguage {
  code: string
  name: string
}

interface FreeDictionaryTranslation {
  language: FreeDictionaryLanguage
  word: string
}

interface FreeDictionarySense {
  definition: string
  examples?: string[]
  translations?: FreeDictionaryTranslation[]
}

interface FreeDictionaryPronunciation {
  type: string
  text: string
  tags?: string[]
}

interface FreeDictionaryEntry {
  language: FreeDictionaryLanguage
  partOfSpeech: string
  pronunciations?: FreeDictionaryPronunciation[]
  senses: FreeDictionarySense[]
}

interface FreeDictionaryResponse {
  word: string
  entries: FreeDictionaryEntry[]
}

export interface LookupResult {
  word: string
  language: string
  phonetic?: string
  meanings: {
    partOfSpeech: string
    definition: string
    example?: string
  }[]
  translations?: {
    language: string
    word: string
  }[]
  error?: string
}

function normalizeLang(code: string): string {
  return code.toLowerCase().split('-')[0] ?? code.toLowerCase()
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const rawWord = searchParams.get('word')
  const lang = searchParams.get('lang') || 'en'
  const to = searchParams.get('to')

  if (!rawWord) {
    return NextResponse.json(
      { error: 'Missing word parameter' },
      { status: 400 },
    )
  }

  const word = rawWord.trim()
  if (!word) {
    return NextResponse.json(
      { error: 'Missing word parameter' },
      { status: 400 },
    )
  }

  const langCode = normalizeLang(lang)
  const toCode = to ? normalizeLang(to) : null

  try {
    // Docs: https://freedictionaryapi.com/api/v1/entries/{language}/{word}
    const url = new URL(
      `https://freedictionaryapi.com/api/v1/entries/${encodeURIComponent(langCode)}/${encodeURIComponent(word)}`,
    )

    if (toCode) {
      url.searchParams.set('translations', 'true')
    }

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      // cache for 24h
      next: { revalidate: 86400 },
    })

    if (!response.ok) {
      const result: LookupResult = {
        word,
        language: langCode,
        meanings: [],
        error:
          response.status === 404 ? 'No definition found' : 'Lookup failed',
      }
      // For 404, return 200 so the client can show a friendly message.
      return NextResponse.json(result, {
        status: response.status === 404 ? 200 : 502,
      })
    }

    const data: FreeDictionaryResponse = await response.json()
    const entries = Array.isArray(data.entries) ? data.entries : []

    const phonetic =
      entries
        .flatMap((e) => e.pronunciations ?? [])
        .map((p) => p.text)
        .find((t) => !!t) ?? undefined

    const meanings: LookupResult['meanings'] = []
    const translations: LookupResult['translations'] = []

    for (const entry of entries) {
      const partOfSpeech = entry.partOfSpeech

      for (const sense of entry.senses ?? []) {
        if (sense.definition) {
          meanings.push({
            partOfSpeech,
            definition: sense.definition,
            example: sense.examples?.[0],
          })
        }

        if (toCode && Array.isArray(sense.translations)) {
          for (const tr of sense.translations) {
            const trCode = normalizeLang(tr.language.code)
            if (trCode === toCode && tr.word) {
              translations.push({ language: trCode, word: tr.word })
            }
          }
        }
      }
    }

    const result: LookupResult = {
      word: data.word || word,
      language: langCode,
      phonetic,
      meanings: meanings.slice(0, 6),
      translations: toCode ? translations.slice(0, 6) : undefined,
      error:
        meanings.length === 0 && (!translations || translations.length === 0)
          ? 'No definition found'
          : undefined,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Dictionary lookup error:', error)
    const result: LookupResult = {
      word,
      language: langCode,
      meanings: [],
      error: 'Failed to look up word',
    }
    return NextResponse.json(result, { status: 502 })
  }
}
