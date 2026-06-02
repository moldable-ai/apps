import { isLanguage, resolveLanguage } from './languages'
import { describe, expect, it } from 'vitest'

describe('language helpers', () => {
  it('accepts only supported language own-properties', () => {
    expect(isLanguage('en')).toBe(true)
    expect(isLanguage('toString')).toBe(false)
    expect(isLanguage('constructor')).toBe(false)
  })

  it('normalizes provider language variants to supported base languages', () => {
    expect(resolveLanguage('PT-BR')).toBe('pt')
    expect(resolveLanguage('ZH-HANS')).toBe('zh')
    expect(resolveLanguage('unknown', 'fr')).toBe('fr')
  })
})
