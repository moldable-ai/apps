import {
  type Plant,
  currentWaterIntervalDays,
  dueState,
  isOnWinterSchedule,
  nextDueAt,
} from './types'
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

  it("honors a 'still moist' snooze that pushes the due date out", () => {
    const subject = plant({
      waterIntervalDays: 7,
      lastWateredAt: '2026-06-02T12:00:00.000Z', // interval-due 2026-06-09
      snoozeUntil: '2026-06-12T12:00:00.000Z',
    })
    // The later snooze date wins...
    expect(nextDueAt(subject)).toBe('2026-06-12T12:00:00.000Z')
    // ...so a plant that was overdue now reads as relaxed (3 days out → "ok").
    expect(dueState(subject, new Date('2026-06-09T12:00:00.000Z'))).toBe('ok')
  })

  it('stretches to the winter cadence during dormancy, not in summer', () => {
    const p = plant({
      waterIntervalDays: 7,
      care: { water: { intervalDays: 7, winterIntervalDays: 14 } },
    })
    const jan = new Date('2026-01-15T12:00:00.000Z')
    const jul = new Date('2026-07-15T12:00:00.000Z')
    expect(currentWaterIntervalDays(p, jan)).toBe(14)
    expect(currentWaterIntervalDays(p, jul)).toBe(7)
    expect(isOnWinterSchedule(p, jan)).toBe(true)
    expect(isOnWinterSchedule(p, jul)).toBe(false)
  })

  it('ignores a snooze that is earlier than the interval-based due date', () => {
    expect(
      nextDueAt(
        plant({
          waterIntervalDays: 7,
          lastWateredAt: '2026-06-02T12:00:00.000Z',
          snoozeUntil: '2026-06-04T12:00:00.000Z', // before interval-due
        }),
      ),
    ).toBe('2026-06-09T12:00:00.000Z')
  })
})
