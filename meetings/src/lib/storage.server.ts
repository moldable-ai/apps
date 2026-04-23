/**
 * Server-side storage for meetings using filesystem
 *
 * Data is stored in MOLDABLE_APP_DATA_DIR (or ./data in dev):
 * - meetings/{id}.json - one file per meeting
 * - templates/{id}.json - one file per custom template
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
} from '@moldable-ai/storage'
import type { Meeting, MeetingSettings } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import type { MeetingTemplate } from './templates'
import fs from 'node:fs/promises'

/** Get the meetings directory */
function getMeetingsDir(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'meetings')
}

/** Get the meeting audio directory */
function getAudioDir(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'audio')
}

/** Get the custom templates directory */
function getTemplatesDir(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'templates')
}

/** Get the path to a meeting file */
function getMeetingPath(id: string, workspaceId?: string): string {
  const safeId = sanitizeId(id)
  return safePath(getMeetingsDir(workspaceId), `${safeId}.json`)
}

function getAudioExtension(contentType: string): string {
  if (contentType.includes('audio/l16')) return 'wav'
  if (contentType.includes('audio/wav')) return 'wav'
  if (contentType.includes('audio/mp4')) return 'm4a'
  if (contentType.includes('audio/ogg')) return 'ogg'
  return 'webm'
}

function getAudioMimeType(contentType: string): string {
  if (contentType.includes('audio/l16')) return 'audio/wav'
  return contentType
}

function inferAudioMimeType(audioPath: string): string {
  if (audioPath.endsWith('.wav')) return 'audio/wav'
  if (audioPath.endsWith('.m4a')) return 'audio/mp4'
  if (audioPath.endsWith('.ogg')) return 'audio/ogg'
  return 'audio/webm'
}

function isPcm16ContentType(contentType: string): boolean {
  return contentType.includes('audio/l16')
}

function getAudioFileName(
  meetingId: string,
  sessionId: string,
  contentType: string,
): string {
  return `${sanitizeId(meetingId)}-${sanitizeId(sessionId)}.${getAudioExtension(contentType)}`
}

function createWavHeader(dataByteLength: number): Buffer {
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataByteLength, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(48000, 24)
  header.writeUInt32LE(48000 * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(dataByteLength, 40)
  return header
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

/** Get the path to a custom template file */
function getTemplatePath(id: string, workspaceId?: string): string {
  const safeId = sanitizeId(id)
  return safePath(getTemplatesDir(workspaceId), `${safeId}.json`)
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
    enhancedAt: m.enhancedAt ? new Date(m.enhancedAt) : undefined,
    recordingSessions: m.recordingSessions?.map((session) => ({
      ...session,
      startedAt: new Date(session.startedAt),
      endedAt: session.endedAt ? new Date(session.endedAt) : undefined,
    })),
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

export async function saveMeetingAudio({
  meetingId,
  sessionId,
  contentType,
  data,
  workspaceId,
}: {
  meetingId: string
  sessionId: string
  contentType: string
  data: Buffer
  workspaceId?: string
}): Promise<{ audioPath: string; audioMimeType: string }> {
  await ensureDir(getAudioDir(workspaceId))

  const fileName = `${sanitizeId(meetingId)}-${sanitizeId(sessionId)}-${Date.now()}.${getAudioExtension(contentType)}`
  const filePath = safePath(getAudioDir(workspaceId), fileName)
  await fs.writeFile(filePath, data)

  return {
    audioPath: `audio/${fileName}`,
    audioMimeType: contentType,
  }
}

export async function appendMeetingAudioChunk({
  meetingId,
  sessionId,
  contentType,
  data,
  workspaceId,
}: {
  meetingId: string
  sessionId: string
  contentType: string
  data: Buffer
  workspaceId?: string
}): Promise<{ audioPath: string; audioMimeType: string }> {
  await ensureDir(getAudioDir(workspaceId))

  const fileName = getAudioFileName(meetingId, sessionId, contentType)
  const filePath = safePath(getAudioDir(workspaceId), fileName)

  if (isPcm16ContentType(contentType) && !(await pathExists(filePath))) {
    await fs.writeFile(filePath, createWavHeader(0))
  }

  await fs.appendFile(filePath, data)

  return {
    audioPath: `audio/${fileName}`,
    audioMimeType: getAudioMimeType(contentType),
  }
}

export async function finalizeMeetingAudio({
  meetingId,
  sessionId,
  contentType,
  workspaceId,
}: {
  meetingId: string
  sessionId: string
  contentType: string
  workspaceId?: string
}): Promise<{ audioPath: string; audioMimeType: string } | null> {
  const fileName = getAudioFileName(meetingId, sessionId, contentType)
  const filePath = safePath(getAudioDir(workspaceId), fileName)

  if (!(await pathExists(filePath))) return null

  if (isPcm16ContentType(contentType)) {
    const stat = await fs.stat(filePath)
    const dataByteLength = Math.max(0, stat.size - 44)
    const file = await fs.open(filePath, 'r+')
    try {
      await file.write(createWavHeader(dataByteLength), 0, 44, 0)
    } finally {
      await file.close()
    }
  }

  return {
    audioPath: `audio/${fileName}`,
    audioMimeType: getAudioMimeType(contentType),
  }
}

export async function getMeetingAudioAsset({
  meetingId,
  sessionId,
  workspaceId,
}: {
  meetingId: string
  sessionId: string
  workspaceId?: string
}): Promise<{
  filePath: string
  audioMimeType: string
  size: number
} | null> {
  const meeting = await getMeeting(meetingId, workspaceId)
  const session = meeting?.recordingSessions?.find(
    (item) => item.id === sessionId,
  )
  const audioPath = session?.audioPath

  if (!session || !audioPath?.startsWith('audio/')) return null

  const filePath = safePath(getAppDataDir(workspaceId), audioPath)

  try {
    const stat = await fs.stat(filePath)
    if (!stat.isFile() || stat.size === 0) return null

    return {
      filePath,
      audioMimeType: session.audioMimeType ?? inferAudioMimeType(audioPath),
      size: stat.size,
    }
  } catch {
    return null
  }
}

/**
 * Delete a meeting
 */
export async function deleteMeeting(
  meetingId: string,
  workspaceId?: string,
): Promise<void> {
  const meeting = await getMeeting(meetingId, workspaceId)
  try {
    const filePath = getMeetingPath(meetingId, workspaceId)
    await fs.unlink(filePath)
  } catch {
    // File might not exist, that's ok
  }

  const audioPaths = new Set(
    [
      ...(meeting?.recordingSessions?.map((session) => session.audioPath) ??
        []),
    ].filter((path): path is string => Boolean(path?.startsWith('audio/'))),
  )

  for (const audioPath of audioPaths) {
    try {
      await fs.unlink(safePath(getAppDataDir(workspaceId), audioPath))
    } catch {
      // File might not exist, that's ok
    }
  }
}

/**
 * Load all workspace custom templates from filesystem.
 */
export async function loadCustomTemplates(
  workspaceId?: string,
): Promise<MeetingTemplate[]> {
  const templatesDir = getTemplatesDir(workspaceId)

  try {
    await ensureDir(templatesDir)
    const files = await fs.readdir(templatesDir)
    const jsonFiles = files.filter((file) => file.endsWith('.json'))

    const templates: MeetingTemplate[] = []
    for (const file of jsonFiles) {
      try {
        const filePath = safePath(templatesDir, file)
        const data = await fs.readFile(filePath, 'utf-8')
        const template = JSON.parse(data) as MeetingTemplate
        if (template.category === 'My Templates') {
          templates.push(template)
        }
      } catch (error) {
        console.error(`Failed to read template file ${file}:`, error)
      }
    }

    return templates.sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    return []
  }
}

/**
 * Save a workspace custom template.
 */
export async function saveCustomTemplate(
  template: MeetingTemplate,
  workspaceId?: string,
): Promise<void> {
  await ensureDir(getTemplatesDir(workspaceId))
  await writeJson(getTemplatePath(template.id, workspaceId), {
    ...template,
    category: 'My Templates',
  })
}

/**
 * Delete a workspace custom template.
 */
export async function deleteCustomTemplate(
  templateId: string,
  workspaceId?: string,
): Promise<void> {
  try {
    await fs.unlink(getTemplatePath(templateId, workspaceId))
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
  const settings = await readJson<Partial<MeetingSettings>>(
    getSettingsPath(workspaceId),
    DEFAULT_SETTINGS,
  )
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    mipOptOut: settings.mipOptOut ?? true,
  }
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
