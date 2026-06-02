import { type Plant, dueState, nextDueAt } from './types'
import { describe, expect, it } from 'vitest'

function plant(overrides: Partial<Plant> = {}): Plant {
  return {
    id: 'plant-1',
    commonName: 'Test plant',
    createdAt: '2026-06-01T12:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z',
    ...overrides,
  }
}

describe('watering schedule helpers', () => {
  it('returns null when no usable interval is set', () => {
    expect(nextDueAt(plant())).toBeNull()
    expect(nextDueAt(plant({ waterIntervalDays: 0 }))).toBeNull()
  })

  it('uses lastWateredAt as the due-date base when present', () => {
    expect(
      nextDueAt(
        plant({
          waterIntervalDays: 7,
          lastWateredAt: '2026-06-02T12:00:00.000Z',
        }),
      ),
    ).toBe('2026-06-09T12:00:00.000Z')
  })

  it('classifies watering urgency relative to the supplied date', () => {
    const subject = plant({ waterIntervalDays: 7 })

    expect(dueState(subject, new Date('2026-06-09T12:01:00.000Z'))).toBe(
      'overdue',
    )
    expect(dueState(subject, new Date('2026-06-08T06:00:00.000Z'))).toBe(
      'today',
    )
    expect(dueState(subject, new Date('2026-06-06T18:00:00.000Z'))).toBe('soon')
    expect(dueState(subject, new Date('2026-06-03T12:00:00.000Z'))).toBe('ok')
  })
})
