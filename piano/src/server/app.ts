import { generateId, readJson, safePath, writeJson } from '@moldable-ai/storage'
import {
  DEFAULT_PIANO_PRESET_ID,
  PIANO_INSTRUMENT_PACKS,
  PIANO_PRESETS,
  PIANO_SAMPLE_SETS,
  PIANO_SETTING_CONTROLS,
  type PianoAudioSettings,
  type PianoPresetParameters,
  type PianoSoundChoice,
  type SongSoundSettings,
  type SongSoundSettingsResponse,
  defaultPianoAudioSettings,
  pianoPresetById,
} from '../shared/audio'
import type { CourseProgress, PianoCourse } from '../shared/course'
import { type Folder, toneFromSeed } from '../shared/folder'
import {
  type PianoSong,
  type SongSummary,
  type SongWorkspacePracticeSettings,
  getSongDuration,
} from '../shared/song'
import { defaultCourseIds, defaultCourses } from './courses'
import {
  defaultClassicsIds,
  defaultSongs,
  defaultTutorialIds,
  retiredDefaultSongIds,
} from './default-songs'
import {
  installInstrumentPack,
  withInstrumentInstallState,
  withInstrumentInstallStates,
} from './instrument-installer'
import { getDataDir, jsonError } from './moldable'
import {
  ensureMutopiaPianoIndex,
  fetchMutopiaMidi,
  readMutopiaPianoIndexStatus,
  rebuildMutopiaPianoIndex,
  searchMutopiaPianoIndex,
} from './mutopia-catalog'
import { readSfzInstrumentPreset } from './sfz-preset'
import { midiBytesToSong } from './song-importer'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createHash } from 'node:crypto'
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { basename, extname, parse } from 'node:path'

export const app = new Hono()

app.use('/api/*', cors())

function songsDir(dataDir: string) {
  return safePath(dataDir, 'songs')
}

function songSourcesDir(dataDir: string) {
  return safePath(dataDir, 'song-sources')
}

function songPath(dataDir: string, songId: string) {
  return safePath(songsDir(dataDir), `${songId}.json`)
}

function copiedMidiPath(dataDir: string, songId: string, filePath: string) {
  const extension =
    extname(filePath).toLowerCase() === '.midi' ? '.midi' : '.mid'
  return safePath(songSourcesDir(dataDir), `${songId}${extension}`)
}

function audioSettingsPath(dataDir: string) {
  return safePath(dataDir, 'audio-settings.json')
}

function songSoundSettingsDir(dataDir: string) {
  return safePath(dataDir, 'song-sounds')
}

function songSoundSettingsPath(dataDir: string, songId: string) {
  return safePath(songSoundSettingsDir(dataDir), `${songId}.json`)
}

function songWorkspaceSettingsDir(dataDir: string) {
  return safePath(dataDir, 'song-workspace-settings')
}

function songWorkspaceSettingsPath(dataDir: string, songId: string) {
  return safePath(songWorkspaceSettingsDir(dataDir), `${songId}.json`)
}

function foldersPath(dataDir: string) {
  return safePath(dataDir, 'folders.json')
}

function coursesDir(dataDir: string) {
  return safePath(dataDir, 'courses')
}

function coursePath(dataDir: string, courseId: string) {
  return safePath(coursesDir(dataDir), `${courseId}.json`)
}

function courseProgressPath(dataDir: string) {
  return safePath(dataDir, 'course-progress.json')
}

function compareByName(a: { name: string }, b: { name: string }) {
  return a.name.localeCompare(b.name, undefined, {
    sensitivity: 'base',
    numeric: true,
  })
}

function sortFolders(folders: Folder[]) {
  const hasCustomOrder = folders.some(
    (folder) => typeof folder.sortOrder === 'number',
  )
  return [...folders].sort((a, b) => {
    if (!hasCustomOrder) return compareByName(a, b)
    const aOrder =
      typeof a.sortOrder === 'number' ? a.sortOrder : Number.POSITIVE_INFINITY
    const bOrder =
      typeof b.sortOrder === 'number' ? b.sortOrder : Number.POSITIVE_INFINITY
    if (aOrder !== bOrder) return aOrder - bOrder
    return compareByName(a, b)
  })
}

function nextFolderSortOrder(folders: Folder[]) {
  const orders = folders
    .map((folder) => folder.sortOrder)
    .filter(
      (order): order is number =>
        typeof order === 'number' && Number.isFinite(order),
    )
  if (orders.length === 0) return undefined
  return Math.max(...orders) + 1
}

async function readFolders(dataDir: string): Promise<Folder[]> {
  const raw = await readJson<Folder[] | null>(foldersPath(dataDir), null)
  if (!Array.isArray(raw)) return []
  const folders = raw
    .filter(
      (folder): folder is Folder =>
        !!folder &&
        typeof folder.id === 'string' &&
        typeof folder.name === 'string' &&
        Array.isArray(folder.songIds),
    )
    .map((folder) => ({
      id: folder.id,
      name: folder.name,
      tone:
        typeof folder.tone === 'string' && folder.tone
          ? folder.tone
          : toneFromSeed(folder.name),
      songIds: folder.songIds.filter((id) => typeof id === 'string'),
      sortOrder:
        typeof folder.sortOrder === 'number' &&
        Number.isFinite(folder.sortOrder)
          ? folder.sortOrder
          : undefined,
      createdAt: folder.createdAt ?? new Date().toISOString(),
      updatedAt:
        folder.updatedAt ?? folder.createdAt ?? new Date().toISOString(),
    }))
  return sortFolders(folders)
}

async function writeFolders(dataDir: string, folders: Folder[]) {
  await mkdir(dataDir, { recursive: true })
  await writeJson(foldersPath(dataDir), folders)
}

// ─── Courses ─────────────────────────────────────────────────────────

function defaultCourseProgress(courseId: string): CourseProgress {
  return {
    courseId,
    completedLessonIds: [],
    currentLessonId: null,
    updatedAt: new Date().toISOString(),
  }
}

function countCourseLessons(course: PianoCourse): number {
  return course.modules.reduce(
    (total, module) => total + module.lessons.length,
    0,
  )
}

function courseHasLesson(course: PianoCourse, lessonId: string): boolean {
  return course.modules.some((module) =>
    module.lessons.some((lesson) => lesson.id === lessonId),
  )
}

function nextUncompleted(
  course: PianoCourse,
  completed: Set<string>,
  afterLessonId: string,
): string | null {
  const allLessons = course.modules.flatMap((module) => module.lessons)
  const startIndex = allLessons.findIndex(
    (lesson) => lesson.id === afterLessonId,
  )
  if (startIndex === -1) return null
  for (let i = startIndex + 1; i < allLessons.length; i += 1) {
    if (!completed.has(allLessons[i].id)) return allLessons[i].id
  }
  // Wrap from the start
  for (let i = 0; i < startIndex; i += 1) {
    if (!completed.has(allLessons[i].id)) return allLessons[i].id
  }
  return null
}

async function ensureSeedCourses(dataDir: string) {
  await mkdir(coursesDir(dataDir), { recursive: true })
  for (const course of defaultCourses) {
    const path = coursePath(dataDir, course.id)
    const existing = await readJson<PianoCourse | null>(path, null)
    if (!existing) {
      await writeJson(path, course)
    }
  }
}

async function readCourses(dataDir: string): Promise<PianoCourse[]> {
  const courses: PianoCourse[] = []
  // Default-order — read the seeded ids first, then any user-added ones
  const seen = new Set<string>()
  for (const id of defaultCourseIds) {
    const course = await readJson<PianoCourse | null>(
      coursePath(dataDir, id),
      null,
    )
    if (course) {
      courses.push(course)
      seen.add(course.id)
    }
  }
  try {
    const entries = await readdir(coursesDir(dataDir), { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue
      const id = entry.name.replace(/\.json$/, '')
      if (seen.has(id)) continue
      const course = await readJson<PianoCourse | null>(
        coursePath(dataDir, id),
        null,
      )
      if (course?.id) {
        courses.push(course)
        seen.add(course.id)
      }
    }
  } catch {
    // directory may not exist yet — fine
  }
  return courses
}

async function readCourse(
  dataDir: string,
  courseId: string,
): Promise<PianoCourse | null> {
  if (!/^[a-z0-9-]+$/.test(courseId)) return null
  return readJson<PianoCourse | null>(coursePath(dataDir, courseId), null)
}

async function readAllCourseProgress(
  dataDir: string,
): Promise<Record<string, CourseProgress>> {
  const raw = await readJson<Record<string, CourseProgress> | null>(
    courseProgressPath(dataDir),
    null,
  )
  if (!raw || typeof raw !== 'object') return {}
  return raw
}

async function writeAllCourseProgress(
  dataDir: string,
  progress: Record<string, CourseProgress>,
) {
  await mkdir(dataDir, { recursive: true })
  await writeJson(courseProgressPath(dataDir), progress)
}

async function updateCourseProgress(
  dataDir: string,
  courseId: string,
  update: (current: CourseProgress) => CourseProgress,
): Promise<CourseProgress> {
  const all = await readAllCourseProgress(dataDir)
  const current = all[courseId] ?? defaultCourseProgress(courseId)
  const next = update(current)
  all[courseId] = next
  await writeAllCourseProgress(dataDir, all)
  return next
}

function isValidSongId(songId: string) {
  return /^[a-z0-9-]+$/.test(songId)
}

function slugifySongId(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function isPresetId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    PIANO_PRESETS.some((preset) => preset.id === value)
  )
}

function numberInRange(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  )
}

function sanitizeAudioOverrides(
  value: unknown,
): Partial<PianoPresetParameters> {
  if (!value || typeof value !== 'object') return {}

  const source = value as Record<string, unknown>
  const overrides: Partial<PianoPresetParameters> = {}

  if (numberInRange(source.volume, 60, 127)) {
    overrides.volume = source.volume
  }
  if (numberInRange(source.decayTime, 0.2, 2)) {
    overrides.decayTime = source.decayTime
  }
  if (numberInRange(source.velocityScale, 0.45, 1.45)) {
    overrides.velocityScale = source.velocityScale
  }
  if (
    source.velocityCurve === 'soft' ||
    source.velocityCurve === 'balanced' ||
    source.velocityCurve === 'firm' ||
    source.velocityCurve === 'wide'
  ) {
    overrides.velocityCurve = source.velocityCurve
  }
  if (numberInRange(source.tone, -1, 1)) {
    overrides.tone = source.tone
  }
  if (numberInRange(source.room, 0, 1)) {
    overrides.room = source.room
  }
  if (numberInRange(source.width, -1, 1)) {
    overrides.width = source.width
  }
  if (numberInRange(source.detune, -12, 12)) {
    overrides.detune = source.detune
  }

  return overrides
}

function normalizeAudioSettings(settings: PianoAudioSettings | null) {
  const defaults = defaultPianoAudioSettings()
  if (!settings || !isPresetId(settings.presetId)) return defaults
  const instrumentChoice = normalizeInstrumentChoice(
    settings.instrumentPackId,
    settings.instrumentId,
  )

  return {
    presetId: settings.presetId,
    instrumentPackId: instrumentChoice.instrumentPackId,
    instrumentId: instrumentChoice.instrumentId,
    overrides: sanitizeAudioOverrides(settings.overrides),
    updatedAt: settings.updatedAt || new Date().toISOString(),
  } satisfies PianoAudioSettings
}

function normalizeInstrumentChoice(packId: unknown, instrumentId: unknown) {
  const defaults = defaultPianoAudioSettings()
  if (typeof packId !== 'string' || typeof instrumentId !== 'string') {
    return {
      instrumentPackId: defaults.instrumentPackId,
      instrumentId: defaults.instrumentId,
    }
  }

  const pack = PIANO_INSTRUMENT_PACKS.find(
    (candidate) => candidate.id === packId,
  )
  const instrument = pack?.instruments.find(
    (candidate) => candidate.id === instrumentId && candidate.playable,
  )
  if (!pack || !instrument) {
    return {
      instrumentPackId: defaults.instrumentPackId,
      instrumentId: defaults.instrumentId,
    }
  }

  return {
    instrumentPackId: pack.id,
    instrumentId: instrument.id,
  }
}

async function readAudioSettings(dataDir: string) {
  const settings = await readJson<PianoAudioSettings | null>(
    audioSettingsPath(dataDir),
    null,
  )
  return normalizeAudioSettings(settings)
}

function sanitizeSoundChoice(value: unknown): PianoSoundChoice {
  if (!value || typeof value !== 'object') return {}
  const source = value as Record<string, unknown>
  const choice: PianoSoundChoice = {}

  if (source.presetId === undefined || isPresetId(source.presetId)) {
    if (typeof source.presetId === 'string') choice.presetId = source.presetId
  }

  const hasPack = typeof source.instrumentPackId === 'string'
  const hasInstrument = typeof source.instrumentId === 'string'
  if (hasPack || hasInstrument) {
    const instrumentChoice = normalizeInstrumentChoice(
      source.instrumentPackId,
      source.instrumentId,
    )
    choice.instrumentPackId = instrumentChoice.instrumentPackId
    choice.instrumentId = instrumentChoice.instrumentId
  }

  return choice
}

function mergeSoundChoice(
  base: PianoSoundChoice,
  next: PianoSoundChoice | undefined,
): PianoSoundChoice {
  if (!next) return base
  return {
    presetId: next.presetId ?? base.presetId,
    instrumentPackId: next.instrumentPackId ?? base.instrumentPackId,
    instrumentId: next.instrumentId ?? base.instrumentId,
  }
}

function hasSoundChoice(choice: PianoSoundChoice | undefined) {
  return Boolean(
    choice?.presetId || choice?.instrumentPackId || choice?.instrumentId,
  )
}

function optionalSoundChoice(value: unknown) {
  const choice = sanitizeSoundChoice(value)
  return hasSoundChoice(choice) ? choice : undefined
}

async function readSongSoundSettings(dataDir: string, songId: string) {
  const settings = await readJson<SongSoundSettings | null>(
    songSoundSettingsPath(dataDir, songId),
    null,
  )
  if (!settings || settings.songId !== songId) return null
  return {
    songId,
    suggested: optionalSoundChoice(settings.suggested),
    override: optionalSoundChoice(settings.override),
    createdAt: settings.createdAt ?? new Date().toISOString(),
    updatedAt:
      settings.updatedAt ?? settings.createdAt ?? new Date().toISOString(),
  } satisfies SongSoundSettings
}

async function writeSongSoundSettings(
  dataDir: string,
  settings: SongSoundSettings,
) {
  await mkdir(songSoundSettingsDir(dataDir), { recursive: true })
  await writeJson(songSoundSettingsPath(dataDir, settings.songId), settings)
}

async function readSongWorkspaceSettings(dataDir: string, songId: string) {
  const settings = await readJson<SongWorkspacePracticeSettings | null>(
    songWorkspaceSettingsPath(dataDir, songId),
    null,
  )
  if (!settings || settings.songId !== songId) return null
  const playbackSpeed = sanitizePlaybackSpeed(settings.playbackSpeed)
  const now = new Date().toISOString()
  return {
    songId,
    playbackSpeed,
    createdAt: settings.createdAt ?? now,
    updatedAt: settings.updatedAt ?? settings.createdAt ?? now,
  } satisfies SongWorkspacePracticeSettings
}

async function writeSongWorkspaceSettings(
  dataDir: string,
  settings: SongWorkspacePracticeSettings,
) {
  await mkdir(songWorkspaceSettingsDir(dataDir), { recursive: true })
  await writeJson(songWorkspaceSettingsPath(dataDir, settings.songId), settings)
}

async function getSongSoundSettingsResponse(
  dataDir: string,
  songId: string,
): Promise<SongSoundSettingsResponse> {
  const globalSettings = await readAudioSettings(dataDir)
  const settings = await readSongSoundSettings(dataDir, songId)
  const globalChoice: PianoSoundChoice = {
    presetId: globalSettings.presetId,
    instrumentPackId: globalSettings.instrumentPackId,
    instrumentId: globalSettings.instrumentId,
  }
  const suggested = mergeSoundChoice(globalChoice, settings?.suggested)
  const effective = mergeSoundChoice(suggested, settings?.override)
  const source = hasSoundChoice(settings?.override)
    ? 'override'
    : hasSoundChoice(settings?.suggested)
      ? 'suggested'
      : 'global'

  return { settings, effective, source }
}

function summarizeSong(song: PianoSong): SongSummary {
  return {
    id: song.id,
    title: song.title,
    source: song.source,
    composer: song.sourceInfo?.composer,
    artist: song.sourceInfo?.artist,
    bpm: song.bpm,
    beatsPerBar: song.beatsPerBar,
    beatUnit: song.beatUnit,
    tempoMap: song.tempoMap,
    timeSignatureMap: song.timeSignatureMap,
    isTutorial: Boolean(song.tutorial),
    tutorialSummary: song.tutorial?.summary,
    noteCount: song.notes.length,
    duration: getSongDuration(song),
    updatedAt: song.updatedAt,
  }
}

function catalogSongTitle(title: string, opus: string | undefined) {
  if (!opus || title.toLowerCase().includes(opus.toLowerCase())) return title
  return `${title}, ${opus}`
}

interface SongFolderParams {
  folderId?: unknown
  folderName?: unknown
  createFolder?: unknown
}

interface ImportMidiFileParams extends SongFolderParams {
  filePath?: unknown
  path?: unknown
  songId?: unknown
  title?: unknown
  replaceSongId?: unknown
  overwrite?: unknown
  source?: unknown
  composer?: unknown
  artist?: unknown
  license?: unknown
}

interface UpsertSongParams extends SongFolderParams {
  song?: unknown
  overwrite?: unknown
  allowEmpty?: unknown
  soundSettings?: unknown
}

interface UpsertSongFromFileParams extends UpsertSongParams {
  filePath?: unknown
  path?: unknown
}

interface PatchSongParams extends SongFolderParams {
  songId?: unknown
  metadata?: unknown
  noteOperations?: unknown
  sortNotes?: unknown
  allowEmpty?: unknown
  soundSettings?: unknown
}

interface PatchSongFromFileParams extends PatchSongParams {
  filePath?: unknown
  path?: unknown
}

class ImportMidiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: 400 | 404 | 409 | 422 = 400,
  ) {
    super(message)
  }
}

class SongWriteError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: 400 | 404 | 409 | 422 = 400,
  ) {
    super(message)
  }
}

function stringParam(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeImportMidiParams(params: ImportMidiFileParams) {
  const filePath = stringParam(params.filePath) || stringParam(params.path)
  if (!filePath) {
    throw new ImportMidiError(
      'A MIDI filePath is required',
      'file_path_required',
    )
  }

  const extension = extname(filePath).toLowerCase()
  if (extension !== '.mid' && extension !== '.midi') {
    throw new ImportMidiError(
      'Only .mid and .midi files can be imported',
      'invalid_file_type',
    )
  }

  const rawTitle = stringParam(params.title)
  const title = rawTitle || parse(filePath).name.replace(/[-_]+/g, ' ')
  const rawSongId =
    stringParam(params.songId) || slugifySongId(parse(filePath).name)
  const songId = slugifySongId(rawSongId)
  if (!isValidSongId(songId)) {
    throw new ImportMidiError('A valid songId is required', 'invalid_song_id')
  }

  const replaceSongId = stringParam(params.replaceSongId)
  if (replaceSongId && !isValidSongId(replaceSongId)) {
    throw new ImportMidiError(
      'replaceSongId is invalid',
      'invalid_replace_song_id',
    )
  }

  return {
    filePath,
    songId,
    title,
    folderId: stringParam(params.folderId),
    folderName: stringParam(params.folderName),
    createFolder: params.createFolder === true,
    replaceSongId,
    overwrite: params.overwrite === true,
    source: stringParam(params.source),
    composer: stringParam(params.composer),
    artist: stringParam(params.artist),
    license: stringParam(params.license),
  }
}

async function findTargetFolder(
  dataDir: string,
  params: { folderId: string; folderName: string; createFolder: boolean },
) {
  if (!params.folderId && !params.folderName) return null

  const folders = await readFolders(dataDir)
  const existing = folders.find((folder) => {
    if (params.folderId) return folder.id === params.folderId
    return folder.name.toLowerCase() === params.folderName.toLowerCase()
  })

  if (existing) return { folder: existing, folders }
  if (!params.folderName || !params.createFolder) {
    throw new SongWriteError('Folder not found', 'folder_not_found', 404)
  }

  const now = new Date().toISOString()
  const folder: Folder = {
    id: generateId(),
    name: params.folderName.slice(0, 80),
    tone: toneFromSeed(params.folderName),
    songIds: [],
    sortOrder: nextFolderSortOrder(folders),
    createdAt: now,
    updatedAt: now,
  }
  return { folder, folders: sortFolders([folder, ...folders]) }
}

type NormalizedImportMidiParams = ReturnType<typeof normalizeImportMidiParams>

async function persistImportedMidiSong(
  dataDir: string,
  params: NormalizedImportMidiParams,
  bytes: Buffer,
  sourceName: string,
  sourceUrl: string,
  copySourceFilePath?: string,
) {
  const destinationSongPath = songPath(dataDir, params.songId)
  const existing = await readJson<PianoSong | null>(destinationSongPath, null)
  const replacingSameSong = params.replaceSongId === params.songId
  if (existing && !params.overwrite && !replacingSameSong) {
    throw new ImportMidiError(
      `Song ${params.songId} already exists. Pass overwrite: true to replace it.`,
      'song_already_exists',
      409,
    )
  }

  const sourceHash = createHash('sha256').update(bytes).digest('hex')
  const sourceMidiPath = copiedMidiPath(dataDir, params.songId, sourceName)
  const now = new Date().toISOString()
  const song = midiBytesToSong(bytes, {
    id: params.songId,
    title: params.title,
    source: params.source || `Imported from MIDI: ${sourceUrl}`,
    sourceInfo: {
      provider: 'User-provided MIDI',
      sourceUrl,
      midiUrl: sourceMidiPath,
      license: params.license || 'User-provided for personal use',
      composer: params.composer || undefined,
      artist: params.artist || undefined,
    },
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    sourceHash,
    sourceFileName: basename(sourceName),
  })

  await mkdir(songsDir(dataDir), { recursive: true })
  await mkdir(songSourcesDir(dataDir), { recursive: true })
  await writeJson(destinationSongPath, song)
  if (copySourceFilePath) {
    await copyFile(copySourceFilePath, sourceMidiPath)
  } else {
    await writeFile(sourceMidiPath, bytes)
  }

  let removedSongId: string | undefined
  if (params.replaceSongId && params.replaceSongId !== params.songId) {
    await rm(songPath(dataDir, params.replaceSongId), { force: true })
    removedSongId = params.replaceSongId
  }

  const folderResult = await findTargetFolder(dataDir, params)
  if (folderResult) {
    const nowForFolder = new Date().toISOString()
    for (const folder of folderResult.folders) {
      folder.songIds = folder.songIds.filter(
        (id) => id !== params.songId && id !== params.replaceSongId,
      )
    }
    folderResult.folder.songIds = [
      ...folderResult.folder.songIds,
      params.songId,
    ]
    folderResult.folder.updatedAt = nowForFolder
    await writeFolders(dataDir, folderResult.folders)
  } else if (removedSongId) {
    const folders = await readFolders(dataDir)
    const updated = folders.map((folder) => ({
      ...folder,
      songIds: folder.songIds.filter((id) => id !== removedSongId),
    }))
    await writeFolders(dataDir, updated)
  }

  return {
    imported: true,
    song: summarizeSong(song),
    sourceMidiPath,
    removedSongId,
    folder: folderResult?.folder,
    midiInfo: song.midiInfo,
  }
}

async function importMidiFile(
  dataDir: string,
  rawParams: ImportMidiFileParams,
) {
  const params = normalizeImportMidiParams(rawParams)
  const fileStats = await stat(params.filePath).catch(() => null)
  if (!fileStats?.isFile()) {
    throw new ImportMidiError('MIDI file not found', 'file_not_found', 404)
  }
  if (fileStats.size > 50 * 1024 * 1024) {
    throw new ImportMidiError(
      'MIDI file is larger than 50 MB',
      'file_too_large',
      422,
    )
  }

  const bytes = await readFile(params.filePath)
  return persistImportedMidiSong(
    dataDir,
    params,
    bytes,
    params.filePath,
    params.filePath,
    params.filePath,
  )
}

function normalizeSongFolderParams(params: SongFolderParams) {
  return {
    folderId: stringParam(params.folderId),
    folderName: stringParam(params.folderName),
    createFolder: params.createFolder === true,
  }
}

function positiveNumber(value: unknown, fallback: number, min = 0) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min
    ? value
    : fallback
}

function sanitizeNote(
  value: unknown,
  index: number,
): PianoSong['notes'][number] | null {
  if (!value || typeof value !== 'object') return null
  const source = value as Record<string, unknown>
  const pitch = stringParam(source.pitch)
  const midi = positiveNumber(source.midi, Number.NaN, 0)
  const start = positiveNumber(source.start, Number.NaN, 0)
  const duration = positiveNumber(source.duration, Number.NaN, 0.001)
  if (
    !pitch ||
    !Number.isFinite(midi) ||
    !Number.isFinite(start) ||
    !Number.isFinite(duration)
  ) {
    return null
  }

  const note: PianoSong['notes'][number] = {
    id: stringParam(source.id) || `note-${index + 1}`,
    pitch,
    midi: Math.round(midi),
    start,
    duration,
  }
  if (typeof source.velocity === 'number' && Number.isFinite(source.velocity)) {
    note.velocity = Math.min(1, Math.max(0, source.velocity))
  }
  if (typeof source.color === 'string' && source.color.trim()) {
    note.color = source.color.trim().slice(0, 40)
  }
  if (typeof source.label === 'string' && source.label.trim()) {
    note.label = source.label.trim().slice(0, 120)
  }
  return note
}

function sanitizeSongDocument(
  value: unknown,
  existing: PianoSong | null,
  options: { allowEmpty?: boolean } = {},
): PianoSong {
  if (!value || typeof value !== 'object') {
    throw new SongWriteError(
      'A complete song object is required',
      'invalid_song',
      400,
    )
  }
  const source = value as Record<string, unknown>
  const id = slugifySongId(stringParam(source.id))
  if (!isValidSongId(id)) {
    throw new SongWriteError(
      'A valid song id is required',
      'invalid_song_id',
      400,
    )
  }
  const title = stringParam(source.title).slice(0, 160)
  if (!title) {
    throw new SongWriteError('Song title is required', 'title_required', 400)
  }
  if (!Array.isArray(source.notes)) {
    throw new SongWriteError(
      'Song notes must be an array',
      'invalid_notes',
      400,
    )
  }
  const notes = source.notes
    .map((note, index) => sanitizeNote(note, index))
    .filter((note): note is PianoSong['notes'][number] => Boolean(note))
    .sort((a, b) => a.start - b.start || a.midi - b.midi)
  if (notes.length === 0 && !options.allowEmpty) {
    throw new SongWriteError(
      'Song must contain at least one valid note',
      'empty_song',
      422,
    )
  }

  const now = new Date().toISOString()
  const bpm = positiveNumber(source.bpm, existing?.bpm ?? 90, 1)
  const beatUnit = Math.round(
    positiveNumber(source.beatUnit, existing?.beatUnit ?? 4, 1),
  )
  const beatsPerBar = Math.round(
    positiveNumber(source.beatsPerBar, existing?.beatsPerBar ?? 4, 1),
  )
  const defaultSecondsPerBeat = positiveNumber(
    source.defaultSecondsPerBeat,
    existing?.defaultSecondsPerBeat ?? 60 / bpm,
    0.001,
  )

  const sourceInfo =
    source.sourceInfo && typeof source.sourceInfo === 'object'
      ? (source.sourceInfo as PianoSong['sourceInfo'])
      : existing?.sourceInfo

  return {
    id,
    title,
    source: stringParam(source.source) || existing?.source,
    sourceInfo,
    bpm,
    beatsPerBar,
    beatUnit,
    defaultSecondsPerBeat,
    tempoMap: Array.isArray(source.tempoMap)
      ? (source.tempoMap as PianoSong['tempoMap'])
      : existing?.tempoMap,
    timeSignatureMap: Array.isArray(source.timeSignatureMap)
      ? (source.timeSignatureMap as PianoSong['timeSignatureMap'])
      : existing?.timeSignatureMap,
    midiInfo: existing?.midiInfo,
    practiceSettings:
      source.practiceSettings === undefined
        ? existing?.practiceSettings
        : sanitizeSongPracticeSettings(source.practiceSettings),
    tutorial:
      source.tutorial === undefined
        ? existing?.tutorial
        : sanitizeSongTutorial(source.tutorial),
    pausePoints:
      source.pausePoints === undefined
        ? existing?.pausePoints
        : sanitizePausePoints(source.pausePoints),
    notes: notes.map((note, index) => ({
      ...note,
      id: note.id || `note-${index + 1}`,
    })),
    createdAt: stringParam(source.createdAt) || existing?.createdAt || now,
    updatedAt: now,
  }
}

async function assignSongToFolder(
  dataDir: string,
  songId: string,
  params: { folderId: string; folderName: string; createFolder: boolean },
) {
  const folderResult = await findTargetFolder(dataDir, params)
  if (!folderResult) return undefined

  const now = new Date().toISOString()
  for (const folder of folderResult.folders) {
    folder.songIds = folder.songIds.filter((id) => id !== songId)
  }
  folderResult.folder.songIds = [...folderResult.folder.songIds, songId]
  folderResult.folder.updatedAt = now
  await writeFolders(dataDir, folderResult.folders)
  return folderResult.folder
}

function sanitizeNotesArray(value: unknown, errorCode = 'invalid_notes') {
  if (!Array.isArray(value)) {
    throw new SongWriteError('Notes must be an array', errorCode, 400)
  }
  const notes = value
    .map((note, index) => sanitizeNote(note, index))
    .filter((note): note is PianoSong['notes'][number] => Boolean(note))
  if (notes.length !== value.length) {
    throw new SongWriteError(
      'Every note must include pitch, midi, start, and duration',
      errorCode,
      400,
    )
  }
  return notes
}

function numberParam(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function stringArrayParam(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string => typeof item === 'string' && item.length > 0,
      )
    : []
}

function sanitizeSplitMidi(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.max(21, Math.min(108, Math.round(value)))
}

function sanitizePlaybackSpeed(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.max(0.1, Math.min(2, value))
}

function sanitizePausePoints(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined
  const cleaned = value
    .filter(
      (entry): entry is number =>
        typeof entry === 'number' && Number.isFinite(entry) && entry >= 0,
    )
    .map((entry) => Number(entry.toFixed(3)))
  if (cleaned.length === 0) return undefined
  const unique = Array.from(new Set(cleaned)).sort((a, b) => a - b)
  return unique
}

function sanitizeSongPracticeSettings(value: unknown) {
  const source = objectParam(value)
  const splitMidi = sanitizeSplitMidi(source.splitMidi)
  return splitMidi === undefined ? undefined : { splitMidi }
}

function sanitizeTextList(value: unknown, maxItems = 8, maxLength = 360) {
  return Array.isArray(value)
    ? value
        .filter(
          (item): item is string =>
            typeof item === 'string' && item.trim().length > 0,
        )
        .slice(0, maxItems)
        .map((item) => item.trim().slice(0, maxLength))
    : []
}

function sanitizeSongTutorial(value: unknown): PianoSong['tutorial'] {
  const source = objectParam(value)
  const summary = stringParam(source.summary).slice(0, 700)
  const objectives = sanitizeTextList(source.objectives, 8, 220)
  const rawSections = Array.isArray(source.sections) ? source.sections : []
  const sections = rawSections
    .map((rawSection, index) => {
      const section = objectParam(rawSection)
      const title = stringParam(section.title).slice(0, 120)
      const start = positiveNumber(section.start, Number.NaN, 0)
      const end = positiveNumber(section.end, Number.NaN, 0)
      const learn = sanitizeTextList(section.learn, 8, 360)
      if (
        !title ||
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        end <= start ||
        learn.length === 0
      ) {
        return null
      }
      return {
        id: stringParam(section.id) || `section-${index + 1}`,
        title,
        start,
        end,
        focus: stringParam(section.focus).slice(0, 160) || undefined,
        learn,
        tryThis: sanitizeTextList(section.tryThis, 8, 320),
        breakIt: sanitizeTextList(section.breakIt, 8, 320),
        reinforce: sanitizeTextList(section.reinforce, 8, 320),
      }
    })
    .filter((section): section is NonNullable<typeof section> =>
      Boolean(section),
    )

  if (!summary || objectives.length === 0 || sections.length === 0)
    return undefined

  return {
    title: stringParam(source.title).slice(0, 120) || undefined,
    summary,
    level: stringParam(source.level).slice(0, 80) || undefined,
    objectives,
    sections,
  }
}

function objectParam(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

async function readJsonPayloadFile(rawParams: {
  filePath?: unknown
  path?: unknown
}) {
  const filePath =
    stringParam(rawParams.filePath) || stringParam(rawParams.path)
  if (!filePath) {
    throw new SongWriteError(
      'A JSON filePath is required',
      'file_path_required',
      400,
    )
  }
  if (extname(filePath).toLowerCase() !== '.json') {
    throw new SongWriteError(
      'Only .json files can be used for song JSON imports',
      'invalid_file_type',
      400,
    )
  }

  const fileStats = await stat(filePath).catch(() => null)
  if (!fileStats?.isFile()) {
    throw new SongWriteError('JSON file not found', 'file_not_found', 404)
  }
  if (fileStats.size > 50 * 1024 * 1024) {
    throw new SongWriteError(
      'JSON file is larger than 50 MB',
      'file_too_large',
      422,
    )
  }

  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as unknown
  } catch (error) {
    throw new SongWriteError(
      error instanceof SyntaxError
        ? `Invalid JSON: ${error.message}`
        : 'Failed to read JSON file',
      'invalid_json_file',
      400,
    )
  }
}

function mergePatchedSongMetadata(
  existing: PianoSong,
  metadata: Record<string, unknown>,
  notes: PianoSong['notes'],
  options: { allowEmpty?: boolean } = {},
): PianoSong {
  if (notes.length === 0 && !options.allowEmpty) {
    throw new SongWriteError(
      'Song must contain at least one valid note',
      'empty_song',
      422,
    )
  }

  const now = new Date().toISOString()
  const title =
    metadata.title === undefined
      ? existing.title
      : stringParam(metadata.title).slice(0, 160)
  if (!title) {
    throw new SongWriteError('Song title is required', 'title_required', 400)
  }

  const bpm =
    metadata.bpm === undefined
      ? existing.bpm
      : positiveNumber(metadata.bpm, existing.bpm, 1)
  const beatUnit =
    metadata.beatUnit === undefined
      ? existing.beatUnit
      : Math.round(positiveNumber(metadata.beatUnit, existing.beatUnit ?? 4, 1))
  const beatsPerBar =
    metadata.beatsPerBar === undefined
      ? existing.beatsPerBar
      : Math.round(
          positiveNumber(metadata.beatsPerBar, existing.beatsPerBar, 1),
        )
  const defaultSecondsPerBeat =
    metadata.defaultSecondsPerBeat === undefined
      ? existing.defaultSecondsPerBeat
      : positiveNumber(
          metadata.defaultSecondsPerBeat,
          existing.defaultSecondsPerBeat,
          0.001,
        )

  return {
    id: existing.id,
    title,
    source:
      metadata.source === undefined
        ? existing.source
        : stringParam(metadata.source),
    sourceInfo:
      metadata.sourceInfo && typeof metadata.sourceInfo === 'object'
        ? (metadata.sourceInfo as PianoSong['sourceInfo'])
        : existing.sourceInfo,
    bpm,
    beatsPerBar,
    beatUnit,
    defaultSecondsPerBeat,
    tempoMap: Array.isArray(metadata.tempoMap)
      ? (metadata.tempoMap as PianoSong['tempoMap'])
      : existing.tempoMap,
    timeSignatureMap: Array.isArray(metadata.timeSignatureMap)
      ? (metadata.timeSignatureMap as PianoSong['timeSignatureMap'])
      : existing.timeSignatureMap,
    midiInfo: existing.midiInfo,
    practiceSettings:
      metadata.practiceSettings === undefined
        ? existing.practiceSettings
        : sanitizeSongPracticeSettings(metadata.practiceSettings),
    tutorial:
      metadata.tutorial === undefined
        ? existing.tutorial
        : sanitizeSongTutorial(metadata.tutorial),
    notes,
    createdAt: existing.createdAt,
    updatedAt: now,
  }
}

function applyNoteOperations(
  currentNotes: PianoSong['notes'],
  rawOperations: unknown,
  options: { sortNotes: boolean; allowEmpty?: boolean },
) {
  if (!Array.isArray(rawOperations) || rawOperations.length === 0)
    return currentNotes

  let notes = [...currentNotes]
  for (const rawOperation of rawOperations) {
    if (!rawOperation || typeof rawOperation !== 'object') {
      throw new SongWriteError(
        'Each note operation must be an object',
        'invalid_note_operation',
        400,
      )
    }
    const operation = rawOperation as Record<string, unknown>
    const type = stringParam(operation.type)

    if (type === 'append') {
      notes = [...notes, ...sanitizeNotesArray(operation.notes)]
      continue
    }

    if (type === 'replaceAll') {
      notes = sanitizeNotesArray(operation.notes)
      continue
    }

    if (type === 'upsert') {
      const nextNotes = sanitizeNotesArray(operation.notes)
      const byId = new Map(notes.map((note) => [note.id, note]))
      for (const note of nextNotes) byId.set(note.id, note)
      notes = Array.from(byId.values())
      continue
    }

    if (type === 'delete') {
      const ids = new Set(stringArrayParam(operation.ids))
      const start = numberParam(operation.start)
      const end = numberParam(operation.end)
      notes = notes.filter((note) => {
        if (ids.has(note.id)) return false
        if (
          start !== undefined &&
          end !== undefined &&
          note.start >= start &&
          note.start < end
        ) {
          return false
        }
        return true
      })
      continue
    }

    if (type === 'replaceRange') {
      const start = numberParam(operation.start)
      const end = numberParam(operation.end)
      if (start === undefined || end === undefined || end < start) {
        throw new SongWriteError(
          'replaceRange requires start and end numbers',
          'invalid_range',
          400,
        )
      }
      const replacementNotes = sanitizeNotesArray(operation.notes)
      notes = [
        ...notes.filter((note) => note.start < start || note.start >= end),
        ...replacementNotes,
      ]
      continue
    }

    throw new SongWriteError(
      `Unsupported note operation: ${type || 'unknown'}`,
      'unsupported_note_operation',
      400,
    )
  }

  if (options.sortNotes) {
    notes = notes.sort(
      (a, b) =>
        a.start - b.start || a.midi - b.midi || a.id.localeCompare(b.id),
    )
  }
  if (notes.length === 0 && !options.allowEmpty) {
    throw new SongWriteError(
      'Song must contain at least one valid note',
      'empty_song',
      422,
    )
  }
  return notes
}

async function upsertSong(dataDir: string, rawParams: UpsertSongParams) {
  const rawSong =
    rawParams.song && typeof rawParams.song === 'object'
      ? (rawParams.song as Record<string, unknown>)
      : null
  const songId = slugifySongId(stringParam(rawSong?.id))
  if (!isValidSongId(songId)) {
    throw new SongWriteError(
      'A valid song id is required',
      'invalid_song_id',
      400,
    )
  }

  const destinationSongPath = songPath(dataDir, songId)
  const existing = await readJson<PianoSong | null>(destinationSongPath, null)
  if (existing && rawParams.overwrite !== true) {
    throw new SongWriteError(
      `Song ${songId} already exists. Pass overwrite: true to replace it.`,
      'song_already_exists',
      409,
    )
  }

  const song = sanitizeSongDocument(rawParams.song, existing, {
    allowEmpty: rawParams.allowEmpty === true,
  })
  await mkdir(songsDir(dataDir), { recursive: true })
  await writeJson(destinationSongPath, song)

  const folder = await assignSongToFolder(
    dataDir,
    song.id,
    normalizeSongFolderParams(rawParams),
  )

  const suggested = optionalSoundChoice(
    rawParams.soundSettings && typeof rawParams.soundSettings === 'object'
      ? (rawParams.soundSettings as Record<string, unknown>).suggested
      : undefined,
  )
  const override = optionalSoundChoice(
    rawParams.soundSettings && typeof rawParams.soundSettings === 'object'
      ? (rawParams.soundSettings as Record<string, unknown>).override
      : undefined,
  )
  if (suggested || override) {
    const now = new Date().toISOString()
    await writeSongSoundSettings(dataDir, {
      songId: song.id,
      suggested,
      override,
      createdAt: now,
      updatedAt: now,
    })
  }

  return {
    upserted: true,
    song: summarizeSong(song),
    folder,
  }
}

async function upsertSongFromFile(
  dataDir: string,
  rawParams: UpsertSongFromFileParams,
) {
  const payload = await readJsonPayloadFile(rawParams)
  const payloadObject = objectParam(payload)
  const payloadHasEnvelope = 'song' in payloadObject
  const payloadParams = payloadHasEnvelope ? payloadObject : { song: payload }

  return upsertSong(dataDir, {
    ...(payloadParams as UpsertSongParams),
    song: rawParams.song ?? payloadParams.song,
    folderId: rawParams.folderId ?? payloadParams.folderId,
    folderName: rawParams.folderName ?? payloadParams.folderName,
    createFolder: rawParams.createFolder ?? payloadParams.createFolder,
    overwrite: rawParams.overwrite ?? payloadParams.overwrite,
    allowEmpty: rawParams.allowEmpty ?? payloadParams.allowEmpty,
    soundSettings: rawParams.soundSettings ?? payloadParams.soundSettings,
  })
}

async function patchSong(dataDir: string, rawParams: PatchSongParams) {
  const songId = slugifySongId(stringParam(rawParams.songId))
  if (!isValidSongId(songId)) {
    throw new SongWriteError(
      'A valid song id is required',
      'invalid_song_id',
      400,
    )
  }

  const existing = await readJson<PianoSong | null>(
    songPath(dataDir, songId),
    null,
  )
  if (!existing) {
    throw new SongWriteError('Song not found', 'song_not_found', 404)
  }

  const notes = applyNoteOperations(existing.notes, rawParams.noteOperations, {
    sortNotes: rawParams.sortNotes !== false,
    allowEmpty: rawParams.allowEmpty === true,
  })
  const song = mergePatchedSongMetadata(
    existing,
    objectParam(rawParams.metadata),
    notes,
    {
      allowEmpty: rawParams.allowEmpty === true,
    },
  )

  await writeJson(songPath(dataDir, song.id), song)

  const folder = await assignSongToFolder(
    dataDir,
    song.id,
    normalizeSongFolderParams(rawParams),
  )

  const suggested = optionalSoundChoice(
    rawParams.soundSettings && typeof rawParams.soundSettings === 'object'
      ? (rawParams.soundSettings as Record<string, unknown>).suggested
      : undefined,
  )
  const override = optionalSoundChoice(
    rawParams.soundSettings && typeof rawParams.soundSettings === 'object'
      ? (rawParams.soundSettings as Record<string, unknown>).override
      : undefined,
  )
  if (suggested || override) {
    const now = new Date().toISOString()
    const existingSettings = await readSongSoundSettings(dataDir, song.id)
    await writeSongSoundSettings(dataDir, {
      songId: song.id,
      suggested: suggested ?? existingSettings?.suggested,
      override: override ?? existingSettings?.override,
      createdAt: existingSettings?.createdAt ?? now,
      updatedAt: now,
    })
  }

  return {
    patched: true,
    song: summarizeSong(song),
    folder,
  }
}

async function patchSongFromFile(
  dataDir: string,
  rawParams: PatchSongFromFileParams,
) {
  const payload = await readJsonPayloadFile(rawParams)
  const payloadObject = Array.isArray(payload)
    ? { noteOperations: payload }
    : objectParam(payload)

  return patchSong(dataDir, {
    ...(payloadObject as PatchSongParams),
    songId: rawParams.songId ?? payloadObject.songId,
    metadata: rawParams.metadata ?? payloadObject.metadata,
    noteOperations: rawParams.noteOperations ?? payloadObject.noteOperations,
    folderId: rawParams.folderId ?? payloadObject.folderId,
    folderName: rawParams.folderName ?? payloadObject.folderName,
    createFolder: rawParams.createFolder ?? payloadObject.createFolder,
    sortNotes: rawParams.sortNotes ?? payloadObject.sortNotes,
    allowEmpty: rawParams.allowEmpty ?? payloadObject.allowEmpty,
    soundSettings: rawParams.soundSettings ?? payloadObject.soundSettings,
  })
}

async function readLibraryRevision(dataDir: string) {
  const paths = [
    foldersPath(dataDir),
    songsDir(dataDir),
    songSoundSettingsDir(dataDir),
  ]
  let latest = 0
  let fileCount = 0

  for (const path of paths) {
    const entryStat = await stat(path).catch(() => null)
    if (!entryStat) continue
    latest = Math.max(latest, entryStat.mtimeMs)
    if (entryStat.isFile()) {
      fileCount += 1
      continue
    }
    if (!entryStat.isDirectory()) continue
    const entries = await readdir(path, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      if (!entry.isFile()) continue
      fileCount += 1
      const childStat = await stat(safePath(path, entry.name)).catch(() => null)
      if (childStat) latest = Math.max(latest, childStat.mtimeMs)
    }
  }

  return {
    revision: `${Math.round(latest)}:${fileCount}`,
    updatedAt: latest ? new Date(latest).toISOString() : null,
    fileCount,
  }
}

async function ensureSeedSongs(dataDir: string) {
  await mkdir(songsDir(dataDir), { recursive: true })
  await ensureSeedCourses(dataDir)

  for (const id of retiredDefaultSongIds) {
    const path = songPath(dataDir, id)
    const existing = await readJson<PianoSong | null>(path, null)
    if (existing?.sourceInfo?.provider === 'Mutopia Project') {
      await rm(path, { force: true })
    }
  }

  const newlySeededIds: string[] = []
  for (const song of defaultSongs()) {
    const path = songPath(dataDir, song.id)
    const existing = await readJson<PianoSong | null>(path, null)
    if (!existing) {
      await writeJson(path, song)
      newlySeededIds.push(song.id)
    }
  }

  if (newlySeededIds.length > 0) {
    const seededTutorialIds = newlySeededIds.filter((id) =>
      defaultTutorialIds.includes(id),
    )
    const seededClassicsIds = newlySeededIds.filter((id) =>
      defaultClassicsIds.includes(id),
    )
    if (seededTutorialIds.length > 0) {
      await ensureDefaultFolderHas(dataDir, 'Tutorials', seededTutorialIds)
    }
    if (seededClassicsIds.length > 0) {
      await ensureDefaultFolderHas(dataDir, 'Classics', seededClassicsIds)
    }
  }
}

/**
 * Ensure a default-named folder exists containing the given song ids.
 * Never modifies an existing folder's membership beyond appending songs
 * that aren't already in *any* folder — so the user's custom
 * organization is preserved.
 */
async function ensureDefaultFolderHas(
  dataDir: string,
  folderName: string,
  songIds: string[],
) {
  const folders = await readFolders(dataDir)
  const alreadyAssigned = new Set<string>()
  for (const folder of folders) {
    for (const id of folder.songIds) alreadyAssigned.add(id)
  }
  const idsToAssign = songIds.filter((id) => !alreadyAssigned.has(id))
  if (idsToAssign.length === 0) return

  const now = new Date().toISOString()
  let target = folders.find(
    (folder) => folder.name.toLowerCase() === folderName.toLowerCase(),
  )

  if (!target) {
    target = {
      id: generateId(),
      name: folderName,
      tone: toneFromSeed(folderName),
      songIds: [],
      createdAt: now,
      updatedAt: now,
    }
    folders.unshift(target)
  }

  const existingInTarget = new Set(target.songIds)
  for (const id of idsToAssign) {
    if (!existingInTarget.has(id)) {
      target.songIds.push(id)
      existingInTarget.add(id)
    }
  }
  target.updatedAt = now

  await writeFolders(dataDir, folders)
}

async function readSongs(dataDir: string) {
  await ensureSeedSongs(dataDir)
  const entries = await readdir(songsDir(dataDir), { withFileTypes: true })
  const songs: PianoSong[] = []

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue
    const songId = entry.name.replace(/\.json$/, '')
    if (!isValidSongId(songId)) continue
    const song = await readJson<PianoSong | null>(
      songPath(dataDir, songId),
      null,
    )
    if (song?.id && Array.isArray(song.notes)) {
      songs.push(song)
    }
  }

  return songs.sort((a, b) => a.title.localeCompare(b.title))
}

app.get('/api/moldable/health', (c) => {
  return c.json({
    appId: process.env.MOLDABLE_APP_ID ?? 'piano',
    status: 'ok',
  })
})

app.post('/api/moldable/rpc', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    method?: unknown
    params?: unknown
  } | null

  if (!body || typeof body.method !== 'string') {
    return c.json(
      {
        ok: false,
        error: {
          code: 'invalid_request',
          message: 'Piano RPC requires a method string.',
        },
      },
      400,
    )
  }

  try {
    const dataDir = getDataDir(c)

    if (body.method === 'songs.list') {
      const songs = await readSongs(dataDir)
      return c.json({ ok: true, result: songs.map(summarizeSong) })
    }

    if (body.method === 'folders.list') {
      return c.json({ ok: true, result: await readFolders(dataDir) })
    }

    if (body.method === 'songs.get') {
      const params =
        body.params && typeof body.params === 'object'
          ? (body.params as { songId?: unknown })
          : {}
      if (typeof params.songId !== 'string' || !isValidSongId(params.songId)) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'invalid_song_id',
              message: 'A valid songId is required.',
            },
          },
          400,
        )
      }
      await ensureSeedSongs(dataDir)
      const song = await readJson<PianoSong | null>(
        songPath(dataDir, params.songId),
        null,
      )
      if (!song) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'song_not_found',
              message: 'Song not found.',
            },
          },
          404,
        )
      }
      return c.json({ ok: true, result: song })
    }

    if (body.method === 'songs.getSoundSettings') {
      const params =
        body.params && typeof body.params === 'object'
          ? (body.params as { songId?: unknown })
          : {}
      if (typeof params.songId !== 'string' || !isValidSongId(params.songId)) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'invalid_song_id',
              message: 'A valid songId is required.',
            },
          },
          400,
        )
      }
      return c.json({
        ok: true,
        result: await getSongSoundSettingsResponse(dataDir, params.songId),
      })
    }

    if (body.method === 'songs.setSoundSettings') {
      const params =
        body.params && typeof body.params === 'object'
          ? (body.params as {
              songId?: unknown
              suggested?: unknown
              override?: unknown
            })
          : {}
      if (typeof params.songId !== 'string' || !isValidSongId(params.songId)) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'invalid_song_id',
              message: 'A valid songId is required.',
            },
          },
          400,
        )
      }
      const existing = await readSongSoundSettings(dataDir, params.songId)
      const now = new Date().toISOString()
      const next: SongSoundSettings = {
        songId: params.songId,
        suggested:
          params.suggested === undefined
            ? existing?.suggested
            : params.suggested === null
              ? undefined
              : mergeSoundChoice(
                  existing?.suggested ?? {},
                  sanitizeSoundChoice(params.suggested),
                ),
        override:
          params.override === undefined
            ? existing?.override
            : params.override === null
              ? undefined
              : mergeSoundChoice(
                  existing?.override ?? {},
                  sanitizeSoundChoice(params.override),
                ),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      await writeSongSoundSettings(dataDir, next)
      return c.json({
        ok: true,
        result: await getSongSoundSettingsResponse(dataDir, params.songId),
      })
    }

    if (body.method === 'songs.importMidiFile') {
      const params =
        body.params && typeof body.params === 'object'
          ? (body.params as ImportMidiFileParams)
          : {}
      return c.json({ ok: true, result: await importMidiFile(dataDir, params) })
    }

    if (body.method === 'songs.upsert') {
      const params =
        body.params && typeof body.params === 'object'
          ? (body.params as UpsertSongParams)
          : {}
      return c.json({ ok: true, result: await upsertSong(dataDir, params) })
    }

    if (body.method === 'songs.upsertFromFile') {
      const params =
        body.params && typeof body.params === 'object'
          ? (body.params as UpsertSongFromFileParams)
          : {}
      return c.json({
        ok: true,
        result: await upsertSongFromFile(dataDir, params),
      })
    }

    if (body.method === 'songs.patch') {
      const params =
        body.params && typeof body.params === 'object'
          ? (body.params as PatchSongParams)
          : {}
      return c.json({ ok: true, result: await patchSong(dataDir, params) })
    }

    if (body.method === 'songs.patchFromFile') {
      const params =
        body.params && typeof body.params === 'object'
          ? (body.params as PatchSongFromFileParams)
          : {}
      return c.json({
        ok: true,
        result: await patchSongFromFile(dataDir, params),
      })
    }

    if (body.method === 'library.revision') {
      return c.json({ ok: true, result: await readLibraryRevision(dataDir) })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Piano does not expose ${body.method}.`,
        },
      },
      404,
    )
  } catch (error) {
    if (error instanceof ImportMidiError || error instanceof SongWriteError) {
      return c.json(
        {
          ok: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        error.status,
      )
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'internal_error',
          message: error instanceof Error ? error.message : 'Piano RPC failed.',
        },
      },
      500,
    )
  }
})

app.get('/api/audio/options', async (c) => {
  const dataDir = getDataDir(c)
  return c.json({
    defaultPresetId: DEFAULT_PIANO_PRESET_ID,
    instrumentPacks: await withInstrumentInstallStates(
      PIANO_INSTRUMENT_PACKS,
      dataDir,
    ),
    sampleSets: PIANO_SAMPLE_SETS,
    presets: PIANO_PRESETS,
    controls: PIANO_SETTING_CONTROLS,
  })
})

app.post('/api/audio/instrument-packs/:packId/install', async (c) => {
  try {
    const packId = c.req.param('packId')
    const pack = PIANO_INSTRUMENT_PACKS.find(
      (candidate) => candidate.id === packId,
    )
    if (!pack) return jsonError(c, 'Instrument pack not found', 404)

    const installedPack = await installInstrumentPack(pack, getDataDir(c))
    return c.json({ pack: installedPack })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to install instrument pack',
      400,
    )
  }
})

app.get(
  '/api/audio/instrument-packs/:packId/instruments/:instrumentId/preset',
  async (c) => {
    try {
      const packId = c.req.param('packId')
      const instrumentId = c.req.param('instrumentId')
      const pack = PIANO_INSTRUMENT_PACKS.find(
        (candidate) => candidate.id === packId,
      )
      if (!pack) return jsonError(c, 'Instrument pack not found', 404)
      if (pack.playbackEngine !== 'smplr-sfz') {
        return jsonError(
          c,
          'Instrument pack does not expose an SFZ preset',
          400,
        )
      }

      const installedPack = await withInstrumentInstallState(
        pack,
        getDataDir(c),
      )
      if (installedPack.status !== 'installed') {
        return jsonError(c, 'Instrument pack is not installed', 409)
      }

      return c.json(await readSfzInstrumentPreset(installedPack, instrumentId))
    } catch (error) {
      return jsonError(
        c,
        error instanceof Error ? error.message : 'Failed to read SFZ preset',
        400,
      )
    }
  },
)

app.get('/api/audio/settings', async (c) => {
  try {
    const settings = await readAudioSettings(getDataDir(c))
    return c.json({
      settings,
      preset: pianoPresetById(settings.presetId),
    })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to read audio settings',
    )
  }
})

app.patch('/api/audio/settings', async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as {
      presetId?: unknown
      instrumentPackId?: unknown
      instrumentId?: unknown
      overrides?: unknown
    } | null

    if (!body || (body.presetId !== undefined && !isPresetId(body.presetId))) {
      return jsonError(c, 'A valid preset id is required', 400)
    }
    if (
      (body.instrumentPackId === undefined) !==
      (body.instrumentId === undefined)
    ) {
      return jsonError(
        c,
        'Instrument pack and instrument id are required together',
        400,
      )
    }

    const dataDir = getDataDir(c)
    await mkdir(dataDir, { recursive: true })
    const current = await readAudioSettings(dataDir)
    const instrumentChoice =
      body.instrumentPackId === undefined
        ? {
            instrumentPackId: current.instrumentPackId,
            instrumentId: current.instrumentId,
          }
        : normalizeInstrumentChoice(body.instrumentPackId, body.instrumentId)
    const settings: PianoAudioSettings = {
      presetId: body.presetId ?? current.presetId,
      instrumentPackId: instrumentChoice.instrumentPackId,
      instrumentId: instrumentChoice.instrumentId,
      overrides:
        body.overrides === undefined
          ? current.overrides
          : sanitizeAudioOverrides(body.overrides),
      updatedAt: new Date().toISOString(),
    }

    await writeJson(audioSettingsPath(dataDir), settings)

    return c.json({
      settings,
      preset: pianoPresetById(settings.presetId),
    })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to write audio settings',
    )
  }
})

app.get('/api/songs/:songId/sound-settings', async (c) => {
  try {
    const songId = c.req.param('songId')
    if (!isValidSongId(songId)) return jsonError(c, 'Invalid song id', 400)
    const dataDir = getDataDir(c)
    await ensureSeedSongs(dataDir)
    const song = await readJson<PianoSong | null>(
      songPath(dataDir, songId),
      null,
    )
    if (!song) return jsonError(c, 'Song not found', 404)
    return c.json(await getSongSoundSettingsResponse(dataDir, songId))
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to read song sound settings',
    )
  }
})

app.patch('/api/songs/:songId/sound-settings', async (c) => {
  try {
    const songId = c.req.param('songId')
    if (!isValidSongId(songId)) return jsonError(c, 'Invalid song id', 400)
    const body = (await c.req.json().catch(() => null)) as {
      suggested?: unknown
      override?: unknown
    } | null
    if (!body) return jsonError(c, 'JSON body required', 400)

    const dataDir = getDataDir(c)
    await ensureSeedSongs(dataDir)
    const song = await readJson<PianoSong | null>(
      songPath(dataDir, songId),
      null,
    )
    if (!song) return jsonError(c, 'Song not found', 404)

    const existing = await readSongSoundSettings(dataDir, songId)
    const now = new Date().toISOString()
    const next: SongSoundSettings = {
      songId,
      suggested:
        body.suggested === undefined
          ? existing?.suggested
          : body.suggested === null
            ? undefined
            : mergeSoundChoice(
                existing?.suggested ?? {},
                sanitizeSoundChoice(body.suggested),
              ),
      override:
        body.override === undefined
          ? existing?.override
          : body.override === null
            ? undefined
            : mergeSoundChoice(
                existing?.override ?? {},
                sanitizeSoundChoice(body.override),
              ),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }

    await writeSongSoundSettings(dataDir, next)
    return c.json(await getSongSoundSettingsResponse(dataDir, songId))
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to write song sound settings',
    )
  }
})

app.get('/api/songs/:songId/workspace-settings', async (c) => {
  try {
    const songId = c.req.param('songId')
    if (!isValidSongId(songId)) return jsonError(c, 'Invalid song id', 400)
    const dataDir = getDataDir(c)
    await ensureSeedSongs(dataDir)
    const song = await readJson<PianoSong | null>(
      songPath(dataDir, songId),
      null,
    )
    if (!song) return jsonError(c, 'Song not found', 404)
    const settings = await readSongWorkspaceSettings(dataDir, songId)
    return c.json({
      settings: settings ?? null,
      effective: {
        playbackSpeed: settings?.playbackSpeed ?? 1,
      },
    })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to read song workspace settings',
    )
  }
})

app.patch('/api/songs/:songId/workspace-settings', async (c) => {
  try {
    const songId = c.req.param('songId')
    if (!isValidSongId(songId)) return jsonError(c, 'Invalid song id', 400)
    const body = (await c.req.json().catch(() => null)) as {
      playbackSpeed?: unknown
    } | null
    if (!body) return jsonError(c, 'JSON body required', 400)
    const playbackSpeed = sanitizePlaybackSpeed(body.playbackSpeed)
    if (playbackSpeed === undefined) {
      return jsonError(c, 'A valid playbackSpeed is required', 400)
    }

    const dataDir = getDataDir(c)
    await ensureSeedSongs(dataDir)
    const song = await readJson<PianoSong | null>(
      songPath(dataDir, songId),
      null,
    )
    if (!song) return jsonError(c, 'Song not found', 404)
    const existing = await readSongWorkspaceSettings(dataDir, songId)
    const now = new Date().toISOString()
    const settings: SongWorkspacePracticeSettings = {
      songId,
      playbackSpeed,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    await writeSongWorkspaceSettings(dataDir, settings)
    return c.json({ settings, effective: { playbackSpeed } })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to write song workspace settings',
    )
  }
})

app.patch('/api/songs/:songId/practice-settings', async (c) => {
  try {
    const songId = c.req.param('songId')
    if (!isValidSongId(songId)) return jsonError(c, 'Invalid song id', 400)
    const body = (await c.req.json().catch(() => null)) as {
      splitMidi?: unknown
    } | null
    if (!body) return jsonError(c, 'JSON body required', 400)
    const splitMidi = sanitizeSplitMidi(body.splitMidi)
    if (splitMidi === undefined) {
      return jsonError(c, 'A valid splitMidi is required', 400)
    }

    const dataDir = getDataDir(c)
    await ensureSeedSongs(dataDir)
    const path = songPath(dataDir, songId)
    const existing = await readJson<PianoSong | null>(path, null)
    if (!existing) return jsonError(c, 'Song not found', 404)
    const now = new Date().toISOString()
    const song: PianoSong = {
      ...existing,
      practiceSettings: {
        ...existing.practiceSettings,
        splitMidi,
      },
      updatedAt: now,
    }
    await writeJson(path, song)
    return c.json(song)
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to write song practice settings',
    )
  }
})

app.get('/api/library/revision', async (c) => {
  try {
    return c.json(await readLibraryRevision(getDataDir(c)))
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to read library revision',
    )
  }
})

app.get('/api/folders', async (c) => {
  try {
    const folders = await readFolders(getDataDir(c))
    return c.json({ folders })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to read folders',
    )
  }
})

app.post('/api/folders', async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as {
      name?: unknown
      tone?: unknown
    } | null
    const rawName = typeof body?.name === 'string' ? body.name.trim() : ''
    if (!rawName) return jsonError(c, 'Folder name is required', 400)
    const name = rawName.slice(0, 80)
    const tone =
      typeof body?.tone === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(body.tone)
        ? body.tone
        : toneFromSeed(name)

    const dataDir = getDataDir(c)
    const folders = await readFolders(dataDir)
    const now = new Date().toISOString()
    const folder: Folder = {
      id: generateId(),
      name,
      tone,
      songIds: [],
      sortOrder: nextFolderSortOrder(folders),
      createdAt: now,
      updatedAt: now,
    }
    await writeFolders(dataDir, sortFolders([folder, ...folders]))
    return c.json(folder, 201)
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to create folder',
    )
  }
})

app.post('/api/folders/reorder', async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as {
      folderIds?: unknown
    } | null
    if (!Array.isArray(body?.folderIds)) {
      return jsonError(c, 'folderIds must be an array', 400)
    }

    const dataDir = getDataDir(c)
    const folders = await readFolders(dataDir)
    const byId = new Map(folders.map((folder) => [folder.id, folder]))
    const seen = new Set<string>()
    const requestedIds = body.folderIds.filter((id): id is string => {
      if (typeof id !== 'string' || !byId.has(id) || seen.has(id)) return false
      seen.add(id)
      return true
    })

    if (folders.length > 0 && requestedIds.length === 0) {
      return jsonError(c, 'At least one known folder id is required', 400)
    }

    const requested = requestedIds
      .map((id) => byId.get(id))
      .filter((folder): folder is Folder => Boolean(folder))
    const remaining = folders.filter((folder) => !seen.has(folder.id))
    const reordered = [...requested, ...remaining].map((folder, index) => ({
      ...folder,
      sortOrder: index,
    }))

    await writeFolders(dataDir, reordered)
    return c.json({ folders: reordered })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to reorder folders',
    )
  }
})

app.patch('/api/folders/:folderId', async (c) => {
  try {
    const folderId = c.req.param('folderId')
    const body = (await c.req.json().catch(() => null)) as {
      name?: unknown
      tone?: unknown
    } | null
    if (!body) return jsonError(c, 'Body required', 400)

    const dataDir = getDataDir(c)
    const folders = await readFolders(dataDir)
    const target = folders.find((folder) => folder.id === folderId)
    if (!target) return jsonError(c, 'Folder not found', 404)

    if (typeof body.name === 'string') {
      const trimmed = body.name.trim().slice(0, 80)
      if (trimmed) target.name = trimmed
    }
    if (
      typeof body.tone === 'string' &&
      /^#[0-9a-fA-F]{3,8}$/.test(body.tone)
    ) {
      target.tone = body.tone
    }
    target.updatedAt = new Date().toISOString()

    await writeFolders(dataDir, folders)
    return c.json(target)
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to update folder',
    )
  }
})

app.delete('/api/folders/:folderId', async (c) => {
  try {
    const folderId = c.req.param('folderId')
    const dataDir = getDataDir(c)
    const folders = await readFolders(dataDir)
    const next = folders.filter((folder) => folder.id !== folderId)
    if (next.length === folders.length) {
      return jsonError(c, 'Folder not found', 404)
    }
    await writeFolders(dataDir, next)
    return c.json({ ok: true })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to delete folder',
    )
  }
})

app.post('/api/folders/move', async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as {
      songId?: unknown
      folderId?: unknown
    } | null
    if (!body || typeof body.songId !== 'string' || !body.songId) {
      return jsonError(c, 'songId is required', 400)
    }
    const targetFolderId =
      typeof body.folderId === 'string' && body.folderId ? body.folderId : null

    const dataDir = getDataDir(c)
    const folders = await readFolders(dataDir)

    if (
      targetFolderId &&
      !folders.some((folder) => folder.id === targetFolderId)
    ) {
      return jsonError(c, 'Folder not found', 404)
    }

    const now = new Date().toISOString()
    const updated = folders.map((folder) => {
      const had = folder.songIds.includes(body.songId as string)
      const willHave = folder.id === targetFolderId
      if (had === willHave) return folder
      return {
        ...folder,
        songIds: willHave
          ? [
              ...folder.songIds.filter((id) => id !== body.songId),
              body.songId as string,
            ]
          : folder.songIds.filter((id) => id !== body.songId),
        updatedAt: now,
      }
    })

    await writeFolders(dataDir, updated)
    return c.json({ folders: updated })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to move song',
    )
  }
})

// ─────────────────────────────────────────────────────────────────────
// Courses
// ─────────────────────────────────────────────────────────────────────

app.get('/api/courses', async (c) => {
  try {
    const dataDir = getDataDir(c)
    await ensureSeedCourses(dataDir)
    const courses = await readCourses(dataDir)
    const progressMap = await readAllCourseProgress(dataDir)
    return c.json({
      courses: courses.map((course) => ({
        course,
        progress: progressMap[course.id] ?? defaultCourseProgress(course.id),
        totalLessons: countCourseLessons(course),
        completedCount: (progressMap[course.id]?.completedLessonIds ?? [])
          .length,
      })),
    })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to list courses',
    )
  }
})

app.get('/api/courses/:courseId', async (c) => {
  try {
    const dataDir = getDataDir(c)
    await ensureSeedCourses(dataDir)
    const course = await readCourse(dataDir, c.req.param('courseId'))
    if (!course) return jsonError(c, 'Course not found', 404)
    const progressMap = await readAllCourseProgress(dataDir)
    return c.json({
      course,
      progress: progressMap[course.id] ?? defaultCourseProgress(course.id),
    })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to read course',
    )
  }
})

app.post('/api/courses/:courseId/complete', async (c) => {
  try {
    const courseId = c.req.param('courseId')
    const body = (await c.req.json().catch(() => null)) as {
      lessonId?: unknown
    } | null
    if (!body || typeof body.lessonId !== 'string') {
      return jsonError(c, 'lessonId is required', 400)
    }
    const dataDir = getDataDir(c)
    const course = await readCourse(dataDir, courseId)
    if (!course) return jsonError(c, 'Course not found', 404)
    if (!courseHasLesson(course, body.lessonId)) {
      return jsonError(c, 'Lesson not found in course', 404)
    }
    const progress = await updateCourseProgress(
      dataDir,
      courseId,
      (current) => {
        const next = new Set(current.completedLessonIds)
        next.add(body.lessonId as string)
        const nextLessonId = nextUncompleted(
          course,
          next,
          body.lessonId as string,
        )
        return {
          ...current,
          completedLessonIds: [...next],
          currentLessonId: nextLessonId,
          updatedAt: new Date().toISOString(),
        }
      },
    )
    return c.json({ course, progress })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to mark lesson complete',
    )
  }
})

app.post('/api/courses/:courseId/uncomplete', async (c) => {
  try {
    const courseId = c.req.param('courseId')
    const body = (await c.req.json().catch(() => null)) as {
      lessonId?: unknown
    } | null
    if (!body || typeof body.lessonId !== 'string') {
      return jsonError(c, 'lessonId is required', 400)
    }
    const dataDir = getDataDir(c)
    const course = await readCourse(dataDir, courseId)
    if (!course) return jsonError(c, 'Course not found', 404)
    const progress = await updateCourseProgress(
      dataDir,
      courseId,
      (current) => {
        const next = current.completedLessonIds.filter(
          (id) => id !== body.lessonId,
        )
        return {
          ...current,
          completedLessonIds: next,
          updatedAt: new Date().toISOString(),
        }
      },
    )
    return c.json({ course, progress })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to undo completion',
    )
  }
})

app.post('/api/courses/:courseId/current', async (c) => {
  try {
    const courseId = c.req.param('courseId')
    const body = (await c.req.json().catch(() => null)) as {
      lessonId?: unknown
    } | null
    const dataDir = getDataDir(c)
    const course = await readCourse(dataDir, courseId)
    if (!course) return jsonError(c, 'Course not found', 404)
    const lessonId =
      typeof body?.lessonId === 'string' &&
      courseHasLesson(course, body.lessonId)
        ? body.lessonId
        : null
    const progress = await updateCourseProgress(
      dataDir,
      courseId,
      (current) => ({
        ...current,
        currentLessonId: lessonId,
        updatedAt: new Date().toISOString(),
      }),
    )
    return c.json({ course, progress })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to set current lesson',
    )
  }
})

app.post('/api/courses/:courseId/reset', async (c) => {
  try {
    const courseId = c.req.param('courseId')
    const dataDir = getDataDir(c)
    const course = await readCourse(dataDir, courseId)
    if (!course) return jsonError(c, 'Course not found', 404)
    const progress = await updateCourseProgress(dataDir, courseId, () => ({
      courseId,
      completedLessonIds: [],
      currentLessonId: null,
      updatedAt: new Date().toISOString(),
    }))
    return c.json({ course, progress })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to reset course',
    )
  }
})

app.get('/api/songs', async (c) => {
  try {
    const dataDir = getDataDir(c)
    const songs = await readSongs(dataDir)
    return c.json({
      dataDir,
      songsDir: songsDir(dataDir),
      songs: songs.map(summarizeSong),
    })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to read songs',
    )
  }
})

app.post('/api/songs', async (c) => {
  try {
    const body = (await c.req
      .json()
      .catch(() => null)) as UpsertSongParams | null
    if (!body) return jsonError(c, 'JSON body required', 400)
    return c.json(await upsertSong(getDataDir(c), body), 201)
  } catch (error) {
    if (error instanceof SongWriteError) {
      return jsonError(c, error.message, error.status)
    }
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to write song',
    )
  }
})

app.patch('/api/songs/:songId', async (c) => {
  try {
    const body = (await c.req
      .json()
      .catch(() => null)) as PatchSongParams | null
    if (!body) return jsonError(c, 'JSON body required', 400)
    return c.json(
      await patchSong(getDataDir(c), {
        ...body,
        songId: c.req.param('songId'),
      }),
    )
  } catch (error) {
    if (error instanceof SongWriteError) {
      return jsonError(c, error.message, error.status)
    }
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to patch song',
    )
  }
})

app.post('/api/song-import/midi-file', async (c) => {
  try {
    const body = (await c.req
      .json()
      .catch(() => null)) as ImportMidiFileParams | null
    if (!body) return jsonError(c, 'JSON body required', 400)
    return c.json(await importMidiFile(getDataDir(c), body), 201)
  } catch (error) {
    if (error instanceof ImportMidiError || error instanceof SongWriteError) {
      return jsonError(c, error.message, error.status)
    }
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to import MIDI file',
    )
  }
})

app.post('/api/song-import/midi-upload', async (c) => {
  try {
    const form = await c.req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return jsonError(c, 'A MIDI file upload is required', 400)
    }

    const fileName = file.name || 'uploaded.mid'
    const extension = extname(fileName).toLowerCase()
    if (extension !== '.mid' && extension !== '.midi') {
      throw new ImportMidiError(
        'Only .mid and .midi files can be imported',
        'invalid_file_type',
      )
    }
    if (file.size > 50 * 1024 * 1024) {
      throw new ImportMidiError(
        'MIDI file is larger than 50 MB',
        'file_too_large',
        422,
      )
    }

    const field = (name: string) => {
      const value = form.get(name)
      return typeof value === 'string' ? value : undefined
    }
    const boolField = (name: string) => field(name) === 'true'
    const params = normalizeImportMidiParams({
      filePath: fileName,
      songId: field('songId'),
      title: field('title'),
      replaceSongId: field('replaceSongId'),
      overwrite: boolField('overwrite'),
      source: field('source'),
      composer: field('composer'),
      artist: field('artist'),
      license: field('license'),
      folderId: field('folderId'),
      folderName: field('folderName'),
      createFolder: boolField('createFolder'),
    })
    const bytes = Buffer.from(await file.arrayBuffer())
    return c.json(
      await persistImportedMidiSong(
        getDataDir(c),
        params,
        bytes,
        fileName,
        fileName,
      ),
      201,
    )
  } catch (error) {
    if (error instanceof ImportMidiError || error instanceof SongWriteError) {
      return jsonError(c, error.message, error.status)
    }
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to import MIDI file',
    )
  }
})

app.get('/api/song-catalog/mutopia/status', async (c) => {
  try {
    return c.json(await readMutopiaPianoIndexStatus(getDataDir(c)))
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to read Mutopia catalog status',
    )
  }
})

app.post('/api/song-catalog/mutopia/rebuild', async (c) => {
  try {
    const index = await rebuildMutopiaPianoIndex(getDataDir(c))
    return c.json({
      repository: index.repository,
      repositoryCommit: index.repositoryCommit,
      generatedAt: index.generatedAt,
      entryCount: index.entries.length,
    })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to rebuild Mutopia catalog',
      502,
    )
  }
})

app.get('/api/song-catalog/search', async (c) => {
  try {
    const query = c.req.query('q') ?? ''
    const limit = Number(c.req.query('limit') ?? 40)
    const dataDir = getDataDir(c)
    const index = await ensureMutopiaPianoIndex(dataDir)
    const installedSongs = await readSongs(dataDir)
    const installedMutopiaIds = new Set(
      installedSongs
        .map((song) => song.sourceInfo?.mutopiaId)
        .filter((id): id is string => Boolean(id)),
    )

    return c.json({
      provider: 'mutopia',
      repository: index.repository,
      repositoryCommit: index.repositoryCommit,
      generatedAt: index.generatedAt,
      results: searchMutopiaPianoIndex(index, query, limit).map((entry) => ({
        ...entry,
        installed: installedMutopiaIds.has(entry.mutopiaId),
      })),
    })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to search Mutopia catalog',
      502,
    )
  }
})

app.post('/api/song-catalog/install', async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as {
      provider?: unknown
      mutopiaId?: unknown
      id?: unknown
    } | null

    if (
      !body ||
      (body.provider !== undefined && body.provider !== 'mutopia') ||
      (typeof body.mutopiaId !== 'string' && typeof body.id !== 'string')
    ) {
      return jsonError(c, 'A Mutopia catalog song id is required', 400)
    }

    const requestedId =
      typeof body.mutopiaId === 'string' ? body.mutopiaId : body.id
    const dataDir = getDataDir(c)
    const index = await ensureMutopiaPianoIndex(dataDir)
    const entry = index.entries.find(
      (candidate) =>
        candidate.mutopiaId === requestedId || candidate.id === requestedId,
    )
    if (!entry) return jsonError(c, 'Catalog song not found', 404)

    await ensureSeedSongs(dataDir)
    const installedSong = (await readSongs(dataDir)).find(
      (song) => song.sourceInfo?.mutopiaId === entry.mutopiaId,
    )
    if (installedSong) {
      return c.json({
        installed: true,
        song: summarizeSong(installedSong),
      })
    }

    const existing = await readJson<PianoSong | null>(
      songPath(dataDir, entry.id),
      null,
    )
    if (existing) {
      return c.json({
        installed: true,
        song: summarizeSong(existing),
      })
    }

    const now = new Date().toISOString()
    const midiBytes = await fetchMutopiaMidi(entry)
    const song = midiBytesToSong(midiBytes, {
      id: entry.id,
      title: catalogSongTitle(entry.title, entry.opus),
      source: `${entry.composer}; ${entry.source ?? 'Mutopia Project'}; Mutopia Project`,
      sourceInfo: {
        provider: 'Mutopia Project',
        sourceUrl: entry.sourceUrl,
        midiUrl: entry.midiUrl,
        license: entry.license,
        composer: entry.composer,
        mutopiaId: entry.mutopiaId,
        lilypondPath: entry.lilypondPath,
        lilypondUrl: entry.lilypondUrl,
        sourceRepository: entry.repository,
      },
      createdAt: now,
      updatedAt: now,
    })

    await writeJson(songPath(dataDir, song.id), song)
    return c.json({
      installed: true,
      song: summarizeSong(song),
    })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to install song',
      502,
    )
  }
})

app.get('/api/songs/:songId', async (c) => {
  try {
    const songId = c.req.param('songId')
    if (!isValidSongId(songId)) return jsonError(c, 'Invalid song id', 400)

    const dataDir = getDataDir(c)
    await ensureSeedSongs(dataDir)
    const song = await readJson<PianoSong | null>(
      songPath(dataDir, songId),
      null,
    )
    if (!song) return jsonError(c, 'Song not found', 404)
    return c.json(song)
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to read song',
    )
  }
})

app.put('/api/songs/:songId', async (c) => {
  try {
    const songId = c.req.param('songId')
    if (!isValidSongId(songId)) return jsonError(c, 'Invalid song id', 400)

    const body = (await c.req.json().catch(() => null)) as PianoSong | null
    if (!body || body.id !== songId || !Array.isArray(body.notes)) {
      return jsonError(c, 'A complete song JSON document is required', 400)
    }

    const now = new Date().toISOString()
    const song: PianoSong = {
      ...body,
      updatedAt: now,
      createdAt: body.createdAt || now,
    }
    await ensureSeedSongs(getDataDir(c))
    await writeJson(songPath(getDataDir(c), songId), song)
    return c.json(song)
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to write song',
    )
  }
})

app.delete('/api/songs/:songId', async (c) => {
  try {
    const songId = c.req.param('songId')
    if (!isValidSongId(songId)) return jsonError(c, 'Invalid song id', 400)

    const dataDir = getDataDir(c)
    const filePath = songPath(dataDir, songId)
    const existing = await readJson<PianoSong | null>(filePath, null)
    if (!existing) return jsonError(c, 'Song not found', 404)

    await rm(filePath, { force: true })

    // Remove from any folders that reference this song
    const folders = await readFolders(dataDir)
    const now = new Date().toISOString()
    let folderTouched = false
    const updatedFolders = folders.map((folder) => {
      if (!folder.songIds.includes(songId)) return folder
      folderTouched = true
      return {
        ...folder,
        songIds: folder.songIds.filter((id) => id !== songId),
        updatedAt: now,
      }
    })
    if (folderTouched) {
      await writeFolders(dataDir, updatedFolders)
    }

    return c.json({ ok: true, id: songId })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to delete song',
    )
  }
})
