import {
  DEEPL_TEXT_REQUEST_LIMIT_BYTES,
  createDeepLTranslateRequestBody,
  formatByteCount,
  getDeepLTranslateRequestBytes,
  isWithinDeepLTextRequestLimit,
} from './deepl-limits'
import { describe, expect, it } from 'vitest'

describe('DeepL text request limits', () => {
  it('builds the same request body shape sent to DeepL', () => {
    expect(createDeepLTranslateRequestBody('Hello', 'auto', 'es')).toEqual({
      text: ['Hello'],
      target_lang: 'ES',
    })

    expect(createDeepLTranslateRequestBody('Hello', 'en', 'es')).toEqual({
      text: ['Hello'],
      target_lang: 'ES',
      source_lang: 'EN',
    })
  })

  it('uses DeepL target variants for ambiguous UI languages', () => {
    expect(createDeepLTranslateRequestBody('Hello', 'auto', 'en')).toEqual({
      text: ['Hello'],
      target_lang: 'EN-US',
    })

    expect(createDeepLTranslateRequestBody('Hello', 'auto', 'pt')).toEqual({
      text: ['Hello'],
      target_lang: 'PT-PT',
    })

    expect(createDeepLTranslateRequestBody('Hello', 'auto', 'zh')).toEqual({
      text: ['Hello'],
      target_lang: 'ZH-HANS',
    })
  })

  it('measures the UTF-8 encoded JSON request body', () => {
    expect(getDeepLTranslateRequestBytes('aaaa', 'auto', 'es')).toBe(
      new TextEncoder().encode('{"text":["aaaa"],"target_lang":"ES"}').length,
    )
  })

  it('allows requests up to the DeepL 128 KiB text body limit', () => {
    expect(
      isWithinDeepLTextRequestLimit(
        'a'.repeat(DEEPL_TEXT_REQUEST_LIMIT_BYTES),
        'auto',
        'es',
      ),
    ).toBe(false)
  })

  it('formats byte counts for display', () => {
    expect(formatByteCount(999)).toBe('999 B')
    expect(formatByteCount(128 * 1024)).toBe('128.0 KiB')
  })
})
