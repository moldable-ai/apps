import { invokeAivaultJson } from './aivault'
import { translateText } from './translation-service'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./aivault', () => ({
  invokeAivaultJson: vi.fn(),
}))

const invokeAivaultJsonMock = vi.mocked(invokeAivaultJson)

describe('translation service', () => {
  beforeEach(() => {
    invokeAivaultJsonMock.mockReset()
  })

  it('returns translated text and normalized detected language', async () => {
    invokeAivaultJsonMock.mockResolvedValueOnce({
      translations: [
        {
          text: 'Ola',
          detected_source_language: 'PT-BR',
        },
      ],
    })

    await expect(translateText('Hello', 'auto', 'pt')).resolves.toEqual({
      translatedText: 'Ola',
      detectedSourceLanguage: 'pt',
    })
  })

  it('throws when DeepL returns no translation text', async () => {
    invokeAivaultJsonMock.mockResolvedValueOnce({ translations: [{}] })

    await expect(translateText('Hello', 'auto', 'es')).rejects.toThrow(
      'DeepL returned an invalid translation response',
    )
  })
})
