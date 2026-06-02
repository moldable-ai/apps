import { calculateStreakCount } from './use-streak'
import { describe, expect, it } from 'vitest'

describe('calculateStreakCount', () => {
  it('starts a new streak when there is no previous visit', () => {
    expect(calculateStreakCount(null, '2026-06-02')).toBe(1)
  })

  it('keeps the count when the app has already been opened today', () => {
    expect(
      calculateStreakCount({ count: 4, lastVisit: '2026-06-02' }, '2026-06-02'),
    ).toBe(4)
  })

  it('increments across consecutive local calendar days', () => {
    expect(
      calculateStreakCount({ count: 4, lastVisit: '2026-06-01' }, '2026-06-02'),
    ).toBe(5)
  })

  it('resets after a skipped day', () => {
    expect(
      calculateStreakCount({ count: 4, lastVisit: '2026-05-31' }, '2026-06-02'),
    ).toBe(1)
  })
})
