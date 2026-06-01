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
import type {
  Meeting,
  MeetingSettings,
  RecordingSession,
  TranscriptSegment,
} from '../types'
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

type PersistedAudioSource = 'microphone' | 'system'

function getAudioSourceFileName(
  meetingId: string,
  sessionId: string,
  source: PersistedAudioSource,
  contentType: string,
): string {
  return `${sanitizeId(meetingId)}-${sanitizeId(sessionId)}-${source}.${getAudioExtension(contentType)}`
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

async function finalizePcmWavIfNeeded(filePath: string, contentType: string) {
  if (!isPcm16ContentType(contentType)) return

  const stat = await fs.stat(filePath)
  const dataByteLength = Math.max(0, stat.size - 44)
  const file = await fs.open(filePath, 'r+')
  try {
    await file.write(createWavHeader(dataByteLength), 0, 44, 0)
  } finally {
    await file.close()
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
      leaseUpdatedAt: session.leaseUpdatedAt
        ? new Date(session.leaseUpdatedAt)
        : undefined,
    })),
    segments: m.segments.map((s) => ({
      ...s,
      createdAt: new Date(s.createdAt),
    })),
  }
}

function dateMs(value: Date | string | undefined): number {
  if (!value) return 0
  const parsed = value instanceof Date ? value : new Date(value)
  const time = parsed.getTime()
  return Number.isFinite(time) ? time : 0
}

function latestDate<T extends Date | string | undefined>(
  first: T,
  second: T,
): T {
  return dateMs(second) >= dateMs(first) ? second : first
}

function mergeTranscriptSegments(
  existing: TranscriptSegment[],
  incoming: TranscriptSegment[],
): TranscriptSegment[] {
  const byId = new Map<string, TranscriptSegment>()

  for (const segment of existing) {
    byId.set(segment.id, segment)
  }

  for (const segment of incoming) {
    const existingSegment = byId.get(segment.id)
    byId.set(segment.id, {
      ...existingSegment,
      ...segment,
      createdAt: existingSegment
        ? latestDate(existingSegment.createdAt, segment.createdAt)
        : segment.createdAt,
    })
  }

  return [...byId.values()].sort((a, b) => {
    if (a.startTime !== b.startTime) return a.startTime - b.startTime
    return dateMs(a.createdAt) - dateMs(b.createdAt)
  })
}

function mergeRecordingSession(
  existing: RecordingSession | undefined,
  incoming: RecordingSession,
): RecordingSession {
  if (!existing) return incoming
  const audioSources = {
    ...existing.audioSources,
    ...incoming.audioSources,
  }

  return {
    ...existing,
    ...incoming,
    endedAt: incoming.endedAt ?? existing.endedAt,
    audioPath: incoming.audioPath ?? existing.audioPath,
    audioMimeType: incoming.audioMimeType ?? existing.audioMimeType,
    audioSourceManifestPath:
      incoming.audioSourceManifestPath ?? existing.audioSourceManifestPath,
    audioSources:
      Object.keys(audioSources).length > 0 ? audioSources : undefined,
    captureSource: incoming.captureSource ?? existing.captureSource,
    nativeCaptureSessionId:
      incoming.nativeCaptureSessionId ?? existing.nativeCaptureSessionId,
    lastNativeSequence:
      typeof incoming.lastNativeSequence === 'number'
        ? Math.max(
            existing.lastNativeSequence ?? 0,
            incoming.lastNativeSequence,
          )
        : existing.lastNativeSequence,
    leaseUpdatedAt:
      dateMs(incoming.leaseUpdatedAt) >= dateMs(existing.leaseUpdatedAt)
        ? incoming.leaseUpdatedAt
        : existing.leaseUpdatedAt,
  }
}

function mergeRecordingSessions(
  existing: RecordingSession[] | undefined,
  incoming: RecordingSession[] | undefined,
): RecordingSession[] | undefined {
  if (!existing?.length && !incoming?.length) return undefined

  const byId = new Map<string, RecordingSession>()
  for (const session of existing ?? []) {
    byId.set(session.id, session)
  }

  for (const session of incoming ?? []) {
    byId.set(session.id, mergeRecordingSession(byId.get(session.id), session))
  }

  return [...byId.values()].sort(
    (a, b) => dateMs(a.startedAt) - dateMs(b.startedAt),
  )
}

export function mergeMeetingForSave(
  existing: Meeting | null,
  incoming: Meeting,
): Meeting {
  if (!existing) return parseMeetingDates(incoming)

  const normalizedIncoming = parseMeetingDates(incoming)
  const incomingIsNewer =
    dateMs(normalizedIncoming.updatedAt) >= dateMs(existing.updatedAt)
  const mergedSessions = mergeRecordingSessions(
    existing.recordingSessions,
    normalizedIncoming.recordingSessions,
  )
  const existingSessionIds = new Set(
    existing.recordingSessions?.map((session) => session.id) ?? [],
  )
  const incomingHasNewOpenSession = Boolean(
    normalizedIncoming.recordingSessions?.some(
      (session) => !session.endedAt && !existingSessionIds.has(session.id),
    ),
  )

  const endedAt =
    normalizedIncoming.endedAt ??
    (existing.endedAt && !(incomingIsNewer && incomingHasNewOpenSession)
      ? existing.endedAt
      : undefined)

  return {
    ...existing,
    ...normalizedIncoming,
    createdAt: existing.createdAt,
    updatedAt: latestDate(existing.updatedAt, normalizedIncoming.updatedAt),
    endedAt,
    duration: Math.max(
      existing.duration ?? 0,
      normalizedIncoming.duration ?? 0,
    ),
    segments: mergeTranscriptSegments(
      existing.segments ?? [],
      normalizedIncoming.segments ?? [],
    ),
    recordingSessions: mergedSessions,
    notes: normalizedIncoming.notes ?? existing.notes,
    enhancedNotes: normalizedIncoming.enhancedNotes ?? existing.enhancedNotes,
    enhancedTemplateId:
      normalizedIncoming.enhancedTemplateId ?? existing.enhancedTemplateId,
    enhancedAt: normalizedIncoming.enhancedAt ?? existing.enhancedAt,
    calendarContext:
      normalizedIncoming.calendarContext ?? existing.calendarContext,
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

export async function mergeAndSaveMeeting(
  meeting: Meeting,
  workspaceId?: string,
): Promise<Meeting> {
  const existing = await getMeeting(meeting.id, workspaceId)
  const merged = mergeMeetingForSave(existing, meeting)
  await saveMeeting(merged, workspaceId)
  return merged
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

export async function appendMeetingAudioSourceChunk({
  meetingId,
  sessionId,
  source,
  contentType,
  data,
  workspaceId,
}: {
  meetingId: string
  sessionId: string
  source: PersistedAudioSource
  contentType: string
  data: Buffer
  workspaceId?: string
}): Promise<{ audioPath: string; audioMimeType: string }> {
  await ensureDir(getAudioDir(workspaceId))

  const fileName = getAudioSourceFileName(
    meetingId,
    sessionId,
    source,
    contentType,
  )
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
  sourceManifest,
  sourceContentTypes,
  workspaceId,
}: {
  meetingId: string
  sessionId: string
  contentType: string
  sourceManifest?: unknown
  sourceContentTypes?: Partial<Record<PersistedAudioSource, string>>
  workspaceId?: string
}): Promise<{
  audioPath: string
  audioMimeType: string
  audioSourceManifestPath?: string
  audioSources?: RecordingSession['audioSources']
} | null> {
  const fileName = getAudioFileName(meetingId, sessionId, contentType)
  const filePath = safePath(getAudioDir(workspaceId), fileName)

  if (!(await pathExists(filePath))) return null

  await finalizePcmWavIfNeeded(filePath, contentType)

  const saved: {
    audioPath: string
    audioMimeType: string
    audioSourceManifestPath?: string
    audioSources?: RecordingSession['audioSources']
  } = {
    audioPath: `audio/${fileName}`,
    audioMimeType: getAudioMimeType(contentType),
  }

  const audioSources: RecordingSession['audioSources'] = {}
  for (const source of ['microphone', 'system'] as const) {
    const sourceContentType = sourceContentTypes?.[source]
    if (!sourceContentType) continue

    const sourceFileName = getAudioSourceFileName(
      meetingId,
      sessionId,
      source,
      sourceContentType,
    )
    const sourceFilePath = safePath(getAudioDir(workspaceId), sourceFileName)
    if (!(await pathExists(sourceFilePath))) continue

    await finalizePcmWavIfNeeded(sourceFilePath, sourceContentType)
    audioSources[source] = {
      audioPath: `audio/${sourceFileName}`,
      audioMimeType: getAudioMimeType(sourceContentType),
    }
  }

  if (Object.keys(audioSources).length > 0) {
    saved.audioSources = audioSources
  }

  if (
    sourceManifest &&
    typeof sourceManifest === 'object' &&
    !Array.isArray(sourceManifest)
  ) {
    const manifestFileName = `${sanitizeId(meetingId)}-${sanitizeId(sessionId)}.sources.json`
    await writeJson(safePath(getAudioDir(workspaceId), manifestFileName), {
      ...sourceManifest,
      meetingId,
      sessionId,
      audioPath: saved.audioPath,
      audioMimeType: saved.audioMimeType,
      audioSources: saved.audioSources,
      finalizedAt: new Date().toISOString(),
    })
    saved.audioSourceManifestPath = `audio/${manifestFileName}`
  }

  return saved
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

  try {
    const audioDir = getAudioDir(workspaceId)
    const safeMeetingPrefix = `${sanitizeId(meetingId)}-`
    const files = await fs.readdir(audioDir)
    for (const file of files) {
      if (file.startsWith(safeMeetingPrefix)) {
        audioPaths.add(`audio/${file}`)
      }
    }
  } catch {
    // Audio directory might not exist, that's ok.
  }

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
