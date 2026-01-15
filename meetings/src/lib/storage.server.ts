/**
 * Server-side storage for meetings using filesystem
 *
 * Data is stored in MOLDABLE_APP_DATA_DIR (or ./data in dev):
 * - meetings/{id}.json - one file per meeting
 * - settings.json - user settings
 *
 * Each meeting is stored in its own file to handle long transcripts efficiently.
 */
import {
  ensureDir,
  getAppDataDir,
  readJson,
  safePath,
  sanitizeId,
  writeJson,
} from '@moldable/storage'
import type { Meeting, MeetingSettings } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'
import fs from 'fs/promises'
import 'server-only'

/** Get the meetings directory */
function getMeetingsDir(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'meetings')
}

/** Get the path to a meeting file */
function getMeetingPath(id: string, workspaceId?: string): string {
  const safeId = sanitizeId(id)
  return safePath(getMeetingsDir(workspaceId), `${safeId}.json`)
}

/** Get the path to settings.json */
function getSettingsPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'settings.json')
}

/** Parse date fields in a meeting object */
function parseMeetingDates(m: Meeting): Meeting {
  return {
    ...m,
    createdAt: new Date(m.createdAt),
    updatedAt: new Date(m.updatedAt),
    endedAt: m.endedAt ? new Date(m.endedAt) : undefined,
    segments: m.segments.map((s) => ({
      ...s,
      createdAt: new Date(s.createdAt),
    })),
  }
}

/**
 * Load all meetings from filesystem (reads individual files)
 */
export async function loadMeetings(workspaceId?: string): Promise<Meeting[]> {
  const meetingsDir = getMeetingsDir(workspaceId)

  try {
    await ensureDir(meetingsDir)
    const files = await fs.readdir(meetingsDir)
    const jsonFiles = files.filter((f) => f.endsWith('.json'))

    const meetings: Meeting[] = []
    for (const file of jsonFiles) {
      try {
        const filePath = safePath(meetingsDir, file)
        const data = await fs.readFile(filePath, 'utf-8')
        const meeting = JSON.parse(data) as Meeting
        meetings.push(parseMeetingDates(meeting))
      } catch (e) {
        console.error(`Failed to read meeting file ${file}:`, e)
      }
    }

    // Sort by createdAt descending (newest first)
    return meetings.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )
  } catch {
    return []
  }
}

/**
 * Save a single meeting (creates or updates)
 */
export async function saveMeeting(
  meeting: Meeting,
  workspaceId?: string,
): Promise<void> {
  await ensureDir(getMeetingsDir(workspaceId))
  await writeJson(getMeetingPath(meeting.id, workspaceId), meeting)
}

/**
 * Delete a meeting
 */
export async function deleteMeeting(
  meetingId: string,
  workspaceId?: string,
): Promise<void> {
  try {
    const filePath = getMeetingPath(meetingId, workspaceId)
    await fs.unlink(filePath)
  } catch {
    // File might not exist, that's ok
  }
}

/**
 * Get a single meeting by ID
 */
export async function getMeeting(
  meetingId: string,
  workspaceId?: string,
): Promise<Meeting | null> {
  try {
    const meeting = await readJson<Meeting | null>(
      getMeetingPath(meetingId, workspaceId),
      null,
    )
    return meeting ? parseMeetingDates(meeting) : null
  } catch {
    return null
  }
}

/**
 * Load settings
 */
export async function loadSettings(
  workspaceId?: string,
): Promise<MeetingSettings> {
  return await readJson<MeetingSettings>(
    getSettingsPath(workspaceId),
    DEFAULT_SETTINGS,
  )
}

/**
 * Save settings
 */
export async function saveSettings(
  settings: MeetingSettings,
  workspaceId?: string,
): Promise<void> {
  await ensureDir(getAppDataDir(workspaceId))
  await writeJson(getSettingsPath(workspaceId), settings)
}

/**
 * Export transcript as markdown
 */
export function exportTranscriptMarkdown(meeting: Meeting): string {
  const lines: string[] = []

  lines.push(`# ${meeting.title}`)
  lines.push('')
  lines.push(
    `**Date:** ${new Date(meeting.createdAt).toLocaleDateString()} ${new Date(meeting.createdAt).toLocaleTimeString()}`,
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
