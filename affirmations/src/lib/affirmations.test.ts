import { getDailyAffirmation, getDayKey } from './affirmations'
import { describe, expect, it } from 'vitest'

describe('affirmation date helpers', () => {
  it('formats day keys in the local calendar day instead of UTC', () => {
    expect(getDayKey(new Date(2026, 0, 5, 23, 59, 59))).toBe('2026-01-05')
  })

  it('returns a stable daily affirmation for a given date', () => {
    const date = new Date(2026, 5, 2, 9, 30)

    expect(getDailyAffirmation(date)).toBe(getDailyAffirmation(date))
  })
})
