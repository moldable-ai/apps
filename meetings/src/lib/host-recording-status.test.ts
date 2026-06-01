import { hostRecordingConflictsWithTask } from './host-recording-status'
import { describe, expect, it } from 'vitest'

describe('hostRecordingConflictsWithTask', () => {
  it('does not block when the host has no active recording', () => {
    expect(hostRecordingConflictsWithTask(null)).toBe(false)
    expect(hostRecordingConflictsWithTask({ active: false })).toBe(false)
  })

  it('blocks a start when the host has an active recording and no allowed task', () => {
    expect(
      hostRecordingConflictsWithTask({
        active: true,
        taskId: 'meeting-recording:meeting-a',
      }),
    ).toBe(true)
  })

  it('allows resume for the same host task', () => {
    expect(
      hostRecordingConflictsWithTask(
        { active: true, taskId: ' meeting-recording:meeting-a ' },
        'meeting-recording:meeting-a',
      ),
    ).toBe(false)
  })

  it('blocks resume when another host task is active', () => {
    expect(
      hostRecordingConflictsWithTask(
        { active: true, taskId: 'meeting-recording:meeting-a' },
        'meeting-recording:meeting-b',
      ),
    ).toBe(true)
  })
})
