import { invokeAivaultJson } from './aivault'
import { createDeepLTranslateRequestBody } from './deepl-limits'
import { type Language, resolveLanguage } from './languages'
import type { SourceSelection } from './types'

export interface TranslateTextResult {
  /** The translated text. */
  translatedText: string
  /** The source language DeepL used (detected when source was "auto"). */
  detectedSourceLanguage: Language
}

interface DeepLTranslation {
  text?: string
  detected_source_language?: string
}

interface DeepLResponse {
  translations?: DeepLTranslation[]
}

/**
 * Translate plain text via DeepL, reusing the same aivault `deepl/translate`
 * capability Scribo's translator is built on. Unlike Scribo we keep the text
 * flat (no markdown / XML block handling) since this is standalone text
 * translation. When `from` is "auto" we let DeepL detect the source language.
 */
export async function translateText(
  text: string,
  from: SourceSelection,
  to: Language,
): Promise<TranslateTextResult> {
  const body = createDeepLTranslateRequestBody(text, from, to)

  const data = await invokeAivaultJson<DeepLResponse>('deepl/translate', {
    method: 'POST',
    path: '/v2/translate',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const translation = data.translations?.[0]
  if (!translation || typeof translation.text !== 'string') {
    throw new Error('DeepL returned an invalid translation response')
  }

  const detected = translation?.detected_source_language

  return {
    translatedText: translation.text,
    detectedSourceLanguage: detected
      ? resolveLanguage(detected, from === 'auto' ? 'en' : from)
      : from === 'auto'
        ? 'en'
        : from,
  }
}
