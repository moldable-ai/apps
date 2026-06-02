import type { Language } from './languages'
import type { SourceSelection } from './types'

export const DEEPL_TEXT_REQUEST_LIMIT_BYTES = 128 * 1024

const encoder = new TextEncoder()

function toDeepLSourceLanguage(code: Language): string {
  return code.toUpperCase()
}

function toDeepLTargetLanguage(code: Language): string {
  if (code === 'en') return 'EN-US'
  if (code === 'pt') return 'PT-PT'
  if (code === 'zh') return 'ZH-HANS'
  return code.toUpperCase()
}

export function createDeepLTranslateRequestBody(
  text: string,
  from: SourceSelection,
  to: Language,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    text: [text],
    target_lang: toDeepLTargetLanguage(to),
  }

  if (from !== 'auto') {
    body.source_lang = toDeepLSourceLanguage(from)
  }

  return body
}

export function getDeepLTranslateRequestBytes(
  text: string,
  from: SourceSelection,
  to: Language,
): number {
  return encoder.encode(
    JSON.stringify(createDeepLTranslateRequestBody(text, from, to)),
  ).length
}

export function isWithinDeepLTextRequestLimit(
  text: string,
  from: SourceSelection,
  to: Language,
): boolean {
  return (
    getDeepLTranslateRequestBytes(text, from, to) <=
    DEEPL_TEXT_REQUEST_LIMIT_BYTES
  )
}

export function formatByteCount(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KiB`
}

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff
}

/**
 * The number of leading characters of `text` that still fit within DeepL's
 * request-size limit for the given language pair. Everything from this index
 * onward is what would push the request over the limit — i.e. the slice the UI
 * highlights as "won't be sent". Returns `text.length` when the whole input
 * fits. Never splits a UTF-16 surrogate pair.
 */
export function getDeepLFittingTextLength(
  text: string,
  from: SourceSelection,
  to: Language,
): number {
  if (isWithinDeepLTextRequestLimit(text, from, to)) return text.length

  // Largest prefix length whose request body stays within the byte limit.
  let lo = 0
  let hi = text.length
  let best = 0
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (
      getDeepLTranslateRequestBytes(text.slice(0, mid), from, to) <=
      DEEPL_TEXT_REQUEST_LIMIT_BYTES
    ) {
      best = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }

  // Don't end the kept prefix on a lone high surrogate; push the whole pair
  // into the highlighted overflow instead.
  if (
    best > 0 &&
    best < text.length &&
    isHighSurrogate(text.charCodeAt(best - 1))
  ) {
    best -= 1
  }

  return best
}
