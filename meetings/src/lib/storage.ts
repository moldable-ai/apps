/**
 * Client-side storage API for meetings
 *
 * This module calls the server API routes which persist to the filesystem.
 * No localStorage is used.
 */
import type { Meeting, MeetingSettings } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'

/**
 * Load all meetings from the server
 */
export async function loadMeetings(): Promise<Meeting[]> {
  try {
    const res = await fetch('/api/meetings')
    if (!res.ok) {
      console.error('Failed to load meetings:', res.statusText)
      return []
    }
    const meetings = (await res.json()) as Meeting[]
    // Convert date strings back to Date objects
    return meetings.map((m) => ({
      ...m,
      createdAt: new Date(m.createdAt),
      updatedAt: new Date(m.updatedAt),
      endedAt: m.endedAt ? new Date(m.endedAt) : undefined,
      segments: m.segments.map((s) => ({
        ...s,
        createdAt: new Date(s.createdAt),
      })),
    }))
  } catch (e) {
    console.error('Failed to load meetings:', e)
    return []
  }
}

/**
 * Save a single meeting (creates or updates)
 */
export async function saveMeeting(meeting: Meeting): Promise<void> {
  try {
    await fetch('/api/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meeting),
    })
  } catch (e) {
    console.error('Failed to save meeting:', e)
  }
}

/**
 * Delete a meeting
 */
export async function deleteMeeting(meetingId: string): Promise<void> {
  try {
    await fetch(`/api/meetings/${meetingId}`, {
      method: 'DELETE',
    })
  } catch (e) {
    console.error('Failed to delete meeting:', e)
  }
}

/**
 * Get a single meeting by ID
 */
export async function getMeeting(meetingId: string): Promise<Meeting | null> {
  try {
    const res = await fetch(`/api/meetings/${meetingId}`)
    if (!res.ok) {
      return null
    }
    const meeting = (await res.json()) as Meeting
    return {
      ...meeting,
      createdAt: new Date(meeting.createdAt),
      updatedAt: new Date(meeting.updatedAt),
      endedAt: meeting.endedAt ? new Date(meeting.endedAt) : undefined,
      segments: meeting.segments.map((s) => ({
        ...s,
        createdAt: new Date(s.createdAt),
      })),
    }
  } catch (e) {
    console.error('Failed to get meeting:', e)
    return null
  }
}

/**
 * Load settings from the server
 */
export async function loadSettings(): Promise<MeetingSettings> {
  try {
    const res = await fetch('/api/settings')
    if (!res.ok) {
      return DEFAULT_SETTINGS
    }
    return (await res.json()) as MeetingSettings
  } catch {
    return DEFAULT_SETTINGS
  }
}

/**
 * Save settings to the server
 */
export async function saveSettings(settings: MeetingSettings): Promise<void> {
  try {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
  } catch (e) {
    console.error('Failed to save settings:', e)
  }
}

/**
 * Export transcript as markdown (client-side helper)
 */
export function exportTranscriptMarkdown(meeting: Meeting): string {
  const lines: string[] = []

  lines.push(`# ${meeting.title}`)
  lines.push('')
  lines.push(
    `**Date:** ${meeting.createdAt.toLocaleDateString()} ${meeting.createdAt.toLocaleTimeString()}`,
  )
  lines.push(
    `**Duration:** ${Math.floor(meeting.duration / 60)}m ${Math.floor(meeting.duration % 60)}s`,
  )
  lines.push('')
  lines.push('## Transcript')
  lines.push('')

  let currentSpeaker: string | undefined = undefined

  for (const segment of meeting.segments) {
    if (segment.speaker && segment.speaker !== currentSpeaker) {
      lines.push('')
      lines.push(`**${segment.speaker}:**`)
      currentSpeaker = segment.speaker
    }

    const timestamp = `[${formatTime(segment.startTime)}]`
    lines.push(`${timestamp} ${segment.text}`)
  }

  return lines.join('\n')
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
