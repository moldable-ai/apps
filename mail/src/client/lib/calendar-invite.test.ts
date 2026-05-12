import { parseCalendarInvite } from './calendar-invite'
import { describe, expect, it } from 'vitest'

describe('parseCalendarInvite', () => {
  it('converts Windows timezone invite times to absolute instants', () => {
    const invite = parseCalendarInvite(`BEGIN:VCALENDAR
METHOD:REQUEST
BEGIN:VEVENT
UID:event-1
SUMMARY:CV AI Product Review
DTSTART;TZID=Mountain Standard Time:20260506T130000
DTEND;TZID=Mountain Standard Time:20260506T135500
END:VEVENT
END:VCALENDAR`)

    expect(invite?.start?.toISOString()).toBe('2026-05-06T19:00:00.000Z')
    expect(invite?.end?.toISOString()).toBe('2026-05-06T19:55:00.000Z')
  })

  it('keeps UTC invite times as UTC instants', () => {
    const invite = parseCalendarInvite(`BEGIN:VCALENDAR
METHOD:REQUEST
BEGIN:VEVENT
UID:event-2
SUMMARY:UTC event
DTSTART:20260506T190000Z
DTEND:20260506T195500Z
END:VEVENT
END:VCALENDAR`)

    expect(invite?.start?.toISOString()).toBe('2026-05-06T19:00:00.000Z')
    expect(invite?.end?.toISOString()).toBe('2026-05-06T19:55:00.000Z')
  })
})
