import { generateId, readJson, safePath, writeJson } from '@moldable-ai/storage'
import {
  DEFAULT_PIANO_PRESET_ID,
  PIANO_INSTRUMENT_PACKS,
  PIANO_PRESETS,
  PIANO_SAMPLE_SETS,
  PIANO_SETTING_CONTROLS,
  type PianoAudioSettings,
  type PianoPresetParameters,
  defaultPianoAudioSettings,
  pianoPresetById,
} from '../shared/audio'
import { type Folder, toneFromSeed } from '../shared/folder'
import {
  type PianoSong,
  type SongSummary,
  getSongDuration,
} from '../shared/song'
import { defaultSongs, retiredDefaultSongIds } from './default-songs'
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
import { mkdir, readdir, rm } from 'node:fs/promises'

export const app = new Hono()

app.use('/api/*', cors())

function songsDir(dataDir: string) {
  return safePath(dataDir, 'songs')
}

function songPath(dataDir: string, songId: string) {
  return safePath(songsDir(dataDir), `${songId}.json`)
}

function audioSettingsPath(dataDir: string) {
  return safePath(dataDir, 'audio-settings.json')
}

function foldersPath(dataDir: string) {
  return safePath(dataDir, 'folders.json')
}

async function readFolders(dataDir: string): Promise<Folder[]> {
  const raw = await readJson<Folder[] | null>(foldersPath(dataDir), null)
  if (!Array.isArray(raw)) return []
  return raw
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
      createdAt: folder.createdAt ?? new Date().toISOString(),
      updatedAt:
        folder.updatedAt ?? folder.createdAt ?? new Date().toISOString(),
    }))
}

async function writeFolders(dataDir: string, folders: Folder[]) {
  await mkdir(dataDir, { recursive: true })
  await writeJson(foldersPath(dataDir), folders)
}

function isValidSongId(songId: string) {
  return /^[a-z0-9-]+$/.test(songId)
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

function summarizeSong(song: PianoSong): SongSummary {
  return {
    id: song.id,
    title: song.title,
    source: song.source,
    composer: song.sourceInfo?.composer,
    artist: song.sourceInfo?.artist,
    bpm: song.bpm,
    beatsPerBar: song.beatsPerBar,
    noteCount: song.notes.length,
    duration: getSongDuration(song),
    updatedAt: song.updatedAt,
  }
}

function catalogSongTitle(title: string, opus: string | undefined) {
  if (!opus || title.toLowerCase().includes(opus.toLowerCase())) return title
  return `${title}, ${opus}`
}

async function ensureSeedSongs(dataDir: string) {
  await mkdir(songsDir(dataDir), { recursive: true })

  for (const id of retiredDefaultSongIds) {
    const path = songPath(dataDir, id)
    const existing = await readJson<PianoSong | null>(path, null)
    if (existing?.sourceInfo?.provider === 'Mutopia Project') {
      await rm(path, { force: true })
    }
  }

  for (const song of defaultSongs()) {
    const path = songPath(dataDir, song.id)
    const existing = await readJson<PianoSong | null>(path, null)
    if (!existing) {
      await writeJson(path, song)
    }
  }
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
      createdAt: now,
      updatedAt: now,
    }
    await writeFolders(dataDir, [folder, ...folders])
    return c.json(folder, 201)
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to create folder',
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
