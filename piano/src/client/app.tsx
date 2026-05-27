import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  popMoldableNavigation,
  pushMoldableNavigation,
  resetMoldableNavigation,
  useMoldableNavigationPop,
  useWorkspace,
} from '@moldable-ai/ui'
import { LibraryView } from './components/library-view'
import { PracticeView } from './components/practice-view'
import {
  readActiveInstrumentId,
  readActivePackId,
  writeActiveInstrumentId,
  writeActivePackId,
} from './components/sound-picker'
import {
  type PianoAudioSettings,
  type PianoInstrumentPack,
  type PianoSoundChoice,
  SPLENDID_GRAND_SAMPLE_SET_ID,
  type SongSoundSettingsResponse,
} from '../shared/audio'
import type { Folder } from '../shared/folder'
import {
  DEFAULT_SPLIT_MIDI,
  type PracticePart,
  noteMatchesPracticePart,
  suggestSplitMidi,
} from '../shared/practice-part'
import type {
  PianoSong,
  SongSummary,
  SongWorkspacePracticeSettings,
} from '../shared/song'
import { getSongDuration } from '../shared/song'
import { PIANO_PRESETS, type PianoPresetId } from './audio-presets'
import { formatDuration } from './piano-utils'
import { useAudioOptions } from './use-audio-options'
import { useFolders } from './use-folders'
import { usePianoAudio } from './use-piano-audio'

interface SongsResponse {
  songsDir: string
  songs: SongSummary[]
}

interface AudioSettingsResponse {
  settings: PianoAudioSettings
}

interface LibraryRevisionResponse {
  revision: string
  updatedAt: string | null
  fileCount: number
}

interface SongWorkspaceSettingsResponse {
  settings: SongWorkspacePracticeSettings | null
  effective: {
    playbackSpeed: number
  }
}

function isPianoPresetId(value: string | undefined): value is PianoPresetId {
  return Boolean(value && PIANO_PRESETS.some((preset) => preset.id === value))
}

const APP_SOURCE_PATH = '/Users/rob/.moldable/shared/apps/piano'
const INSTRUMENTS_STORAGE_PATH =
  '~/.moldable/workspaces/{workspace-id}/apps/piano/data/instruments'
const AUDIO_MODEL_PATH = `${APP_SOURCE_PATH}/src/shared/audio.ts`
const AUDIO_SCHEDULE_LOOKAHEAD_SECONDS = 0.12

export function App() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const { folders } = useFolders()
  const [presetId, setPresetId] = useState<PianoPresetId>('classic-grand')
  const [activeSongId, setActiveSongId] = useState<string | null>(null)
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [cursor, setCursor] = useState(0)
  const [practicePart, setPracticePart] = useState<PracticePart>('all')
  const [splitMidi, setSplitMidi] = useState(DEFAULT_SPLIT_MIDI)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [songSoundLoadingLabel, setSongSoundLoadingLabel] = useState<
    string | null
  >(null)

  const audioOptionsQuery = useAudioOptions()
  const instrumentPacks = useMemo(
    () => audioOptionsQuery.data?.instrumentPacks ?? [],
    [audioOptionsQuery.data?.instrumentPacks],
  )
  const [activePackId, setActivePackId] = useState<string | null>(() =>
    readActivePackId(),
  )
  const [activeInstrumentId, setActiveInstrumentId] = useState<string | null>(
    () => readActiveInstrumentId(),
  )
  const [installingPackIds, setInstallingPackIds] = useState<Set<string>>(
    () => new Set(),
  )
  const audioSettingsQuery = useQuery({
    queryKey: ['audio-settings', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/audio/settings')
      if (!res.ok) throw new Error('Failed to load audio settings')
      return (await res.json()) as AudioSettingsResponse
    },
  })
  const activePack = useMemo<PianoInstrumentPack | null>(() => {
    return (
      instrumentPacks.find((pack) => pack.id === activePackId) ??
      instrumentPacks.find((pack) => pack.id === 'splendid-grand-piano') ??
      instrumentPacks.find((pack) => pack.status === 'installed') ??
      null
    )
  }, [activePackId, instrumentPacks])
  const activeInstrument = useMemo(() => {
    return (
      activePack?.instruments.find(
        (instrument) =>
          instrument.id === activeInstrumentId && instrument.playable,
      ) ??
      activePack?.instruments.find((instrument) => instrument.playable) ??
      null
    )
  }, [activeInstrumentId, activePack])
  const {
    loadState,
    playMidi,
    prepare,
    prewarm,
    resume,
    stopAll,
    getCurrentTime,
  } = usePianoAudio(
    presetId,
    activePack,
    activeInstrument?.id ?? null,
    fetchWithWorkspace,
  )

  const persistAudioSettings = useCallback(
    async (settings: Partial<PianoAudioSettings>) => {
      const res = await fetchWithWorkspace('/api/audio/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) return
      void queryClient.invalidateQueries({
        queryKey: ['audio-settings', workspaceId],
      })
    },
    [fetchWithWorkspace, queryClient, workspaceId],
  )

  const setActiveInstrumentChoice = useCallback(
    (
      packId: string,
      instrumentId: string,
      options: { persist?: boolean } = {},
    ) => {
      setActivePackId(packId)
      setActiveInstrumentId(instrumentId)
      writeActivePackId(packId)
      writeActiveInstrumentId(instrumentId)
      if (options.persist !== false) {
        void persistAudioSettings({
          instrumentPackId: packId,
          instrumentId,
        })
      }
    },
    [persistAudioSettings],
  )

  const persistSongSoundSettings = useCallback(
    async (
      songId: string,
      settings: {
        suggested?: PianoSoundChoice | null
        override?: PianoSoundChoice | null
      },
    ) => {
      const res = await fetchWithWorkspace(
        `/api/songs/${songId}/sound-settings`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        },
      )
      if (!res.ok) return
      void queryClient.invalidateQueries({
        queryKey: ['song-sound-settings', songId, workspaceId],
      })
    },
    [fetchWithWorkspace, queryClient, workspaceId],
  )

  const handleActiveInstrumentChange = useCallback(
    (packId: string, instrumentId: string) => {
      setActiveInstrumentChoice(packId, instrumentId, {
        persist: activeSongId ? false : undefined,
      })
      if (activeSongId) {
        void persistSongSoundSettings(activeSongId, {
          override: { instrumentPackId: packId, instrumentId },
        })
      }
    },
    [activeSongId, persistSongSoundSettings, setActiveInstrumentChoice],
  )

  const handlePresetChange = useCallback(
    (nextPresetId: PianoPresetId) => {
      setPresetId(nextPresetId)
      if (activeSongId) {
        void persistSongSoundSettings(activeSongId, {
          override: { presetId: nextPresetId },
        })
        return
      }
      void persistAudioSettings({ presetId: nextPresetId })
    },
    [activeSongId, persistAudioSettings, persistSongSoundSettings],
  )

  useEffect(() => {
    if (activeSongId) return
    const settings = audioSettingsQuery.data?.settings
    if (!settings) return
    setPresetId(settings.presetId as PianoPresetId)
    const settingsUseDefaultInstrument =
      settings.instrumentPackId === SPLENDID_GRAND_SAMPLE_SET_ID &&
      settings.instrumentId === SPLENDID_GRAND_SAMPLE_SET_ID
    const localPack = instrumentPacks.find((pack) => pack.id === activePackId)
    const localInstrument = localPack?.instruments.find(
      (instrument) =>
        instrument.id === activeInstrumentId && instrument.playable,
    )
    if (
      settingsUseDefaultInstrument &&
      activePackId &&
      activeInstrumentId &&
      localPack?.status === 'installed' &&
      localInstrument &&
      (activePackId !== settings.instrumentPackId ||
        activeInstrumentId !== settings.instrumentId)
    ) {
      setActiveInstrumentChoice(activePackId, activeInstrumentId)
      return
    }

    setActiveInstrumentChoice(
      settings.instrumentPackId,
      settings.instrumentId,
      {
        persist: false,
      },
    )
  }, [
    activeInstrumentId,
    activePackId,
    activeSongId,
    audioSettingsQuery.data?.settings,
    instrumentPacks,
    setActiveInstrumentChoice,
  ])

  useEffect(() => {
    if (instrumentPacks.length === 0) return
    const current = instrumentPacks.find((pack) => pack.id === activePackId)
    if (
      current?.status === 'installed' &&
      current.instruments.some((instrument) => instrument.playable) &&
      current.instruments.some(
        (instrument) =>
          instrument.id === activeInstrumentId && instrument.playable,
      )
    ) {
      return
    }
    const fallbackPack =
      (current?.status === 'installed'
        ? current
        : instrumentPacks.find(
            (pack) =>
              pack.status === 'installed' &&
              pack.instruments.some((instrument) => instrument.playable),
          )) ??
      instrumentPacks[0] ??
      null
    const fallbackInstrument =
      fallbackPack?.instruments.find((instrument) => instrument.playable) ??
      null
    if (fallbackPack && fallbackInstrument) {
      setActiveInstrumentChoice(fallbackPack.id, fallbackInstrument.id, {
        persist: false,
      })
    }
  }, [
    activeInstrumentId,
    activePackId,
    instrumentPacks,
    setActiveInstrumentChoice,
  ])

  const handleInstallPack = useCallback(
    async (
      packId: string,
      options: { select?: boolean; persist?: boolean } = {},
    ) => {
      setInstallingPackIds((current) => new Set(current).add(packId))
      try {
        const res = await fetchWithWorkspace(
          `/api/audio/instrument-packs/${packId}/install`,
          { method: 'POST' },
        )
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string
          } | null
          throw new Error(body?.error ?? 'Failed to install instrument pack')
        }
        const body = (await res.json()) as { pack: { id: string } }
        const installedPack = instrumentPacks.find(
          (pack) => pack.id === body.pack.id,
        )
        const defaultInstrument =
          installedPack?.instruments.find(
            (instrument) => instrument.playable,
          ) ?? null
        if (options.select !== false) {
          if (defaultInstrument) {
            setActiveInstrumentChoice(body.pack.id, defaultInstrument.id, {
              persist: options.persist,
            })
          } else {
            setActivePackId(body.pack.id)
            writeActivePackId(body.pack.id)
          }
        }
        await queryClient.invalidateQueries({
          queryKey: ['audio-options', workspaceId],
        })
      } finally {
        setInstallingPackIds((current) => {
          const next = new Set(current)
          next.delete(packId)
          return next
        })
      }
    },
    [
      fetchWithWorkspace,
      instrumentPacks,
      queryClient,
      setActiveInstrumentChoice,
      workspaceId,
    ],
  )

  const automaticSongSoundInstallRef = useRef<Set<string>>(new Set())
  const playedNotesRef = useRef<Set<string>>(new Set())
  const rafRef = useRef<number | null>(null)
  const playStartCursorRef = useRef(0)
  const playStartPerformanceRef = useRef(0)
  const playStartAudioTimeRef = useRef<number | null>(null)
  const lastCursorRef = useRef(0)
  const lastLibraryRevisionRef = useRef<string | null>(null)
  const [playbackSpeed, setPlaybackSpeedState] = useState(1)
  const playbackSpeedRef = useRef(1)

  const setPlaybackSpeed = useCallback(
    (nextSpeed: number) => {
      const clamped = Math.max(0.1, Math.min(2, nextSpeed))
      setPlaybackSpeedState(clamped)
      // Re-anchor the playback origin so the cursor doesn't jump when speed changes.
      if (playStartPerformanceRef.current !== 0) {
        playStartCursorRef.current = lastCursorRef.current
        playStartPerformanceRef.current = performance.now()
        playStartAudioTimeRef.current = getCurrentTime()
      }
      playbackSpeedRef.current = clamped

      if (activeSongId) {
        void fetchWithWorkspace(
          `/api/songs/${activeSongId}/workspace-settings`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playbackSpeed: clamped }),
          },
        )
          .then((res) => {
            if (!res.ok) throw new Error('Failed to save playback speed')
            return queryClient.invalidateQueries({
              queryKey: ['song-workspace-settings', activeSongId, workspaceId],
            })
          })
          .catch((error) => {
            console.error('Failed to save playback speed', error)
          })
      }
    },
    [
      activeSongId,
      fetchWithWorkspace,
      getCurrentTime,
      queryClient,
      workspaceId,
    ],
  )

  const songsQuery = useQuery({
    queryKey: ['songs', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/songs')
      if (!res.ok) throw new Error('Failed to load songs')
      return (await res.json()) as SongsResponse
    },
  })

  const libraryRevisionQuery = useQuery({
    queryKey: ['library-revision', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/library/revision')
      if (!res.ok) throw new Error('Failed to load library revision')
      return (await res.json()) as LibraryRevisionResponse
    },
    refetchInterval: 2500,
    refetchIntervalInBackground: true,
  })

  const songQuery = useQuery({
    queryKey: ['song', activeSongId, workspaceId],
    enabled: Boolean(activeSongId),
    queryFn: async () => {
      const res = await fetchWithWorkspace(`/api/songs/${activeSongId}`)
      if (!res.ok) throw new Error('Failed to load song')
      return (await res.json()) as PianoSong
    },
  })

  const songSoundSettingsQuery = useQuery({
    queryKey: ['song-sound-settings', activeSongId, workspaceId],
    enabled: Boolean(activeSongId),
    queryFn: async () => {
      const res = await fetchWithWorkspace(
        `/api/songs/${activeSongId}/sound-settings`,
      )
      if (!res.ok) throw new Error('Failed to load song sound settings')
      return (await res.json()) as SongSoundSettingsResponse
    },
  })

  const songWorkspaceSettingsQuery = useQuery({
    queryKey: ['song-workspace-settings', activeSongId, workspaceId],
    enabled: Boolean(activeSongId),
    queryFn: async () => {
      const res = await fetchWithWorkspace(
        `/api/songs/${activeSongId}/workspace-settings`,
      )
      if (!res.ok) throw new Error('Failed to load song workspace settings')
      return (await res.json()) as SongWorkspaceSettingsResponse
    },
  })

  useEffect(() => {
    if (!activeSongId || !songWorkspaceSettingsQuery.data) return
    const nextSpeed = songWorkspaceSettingsQuery.data.effective.playbackSpeed
    setPlaybackSpeedState(nextSpeed)
    playbackSpeedRef.current = nextSpeed
    if (playStartPerformanceRef.current !== 0) {
      playStartCursorRef.current = lastCursorRef.current
      playStartPerformanceRef.current = performance.now()
      playStartAudioTimeRef.current = getCurrentTime()
    }
  }, [activeSongId, getCurrentTime, songWorkspaceSettingsQuery.data])

  // Fetch all songs as full data for the library mini-previews
  const songPreviewQueries = useQuery({
    queryKey: [
      'song-previews',
      workspaceId,
      songsQuery.data?.songs.map((s) => s.id).join(','),
    ],
    enabled: Boolean(songsQuery.data?.songs.length),
    queryFn: async () => {
      const ids = songsQuery.data?.songs.map((s) => s.id) ?? []
      const previews = await Promise.all(
        ids.map(async (id): Promise<[string, PianoSong['notes']]> => {
          const res = await fetchWithWorkspace(`/api/songs/${id}`)
          if (!res.ok) return [id, []]
          const song = (await res.json()) as PianoSong
          return [id, song.notes.slice(0, 32)]
        }),
      )
      return new Map(previews)
    },
  })

  const notePreviewBySong = useMemo(
    () => songPreviewQueries.data ?? new Map<string, PianoSong['notes']>(),
    [songPreviewQueries.data],
  )

  useEffect(() => {
    const revision = libraryRevisionQuery.data?.revision
    if (!revision) return
    if (lastLibraryRevisionRef.current === null) {
      lastLibraryRevisionRef.current = revision
      return
    }
    if (lastLibraryRevisionRef.current === revision) return
    lastLibraryRevisionRef.current = revision

    void queryClient.invalidateQueries({ queryKey: ['songs', workspaceId] })
    void queryClient.invalidateQueries({ queryKey: ['folders', workspaceId] })
    void queryClient.invalidateQueries({
      queryKey: ['song-previews', workspaceId],
    })
    if (activeSongId) {
      void queryClient.invalidateQueries({
        queryKey: ['song', activeSongId, workspaceId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['song-sound-settings', activeSongId, workspaceId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['song-workspace-settings', activeSongId, workspaceId],
      })
    }
  }, [
    activeSongId,
    libraryRevisionQuery.data?.revision,
    queryClient,
    workspaceId,
  ])

  const song = songQuery.data ?? null
  const loadedSongId = song?.id ?? null
  const duration = song ? getSongDuration(song) : 0
  const activeFolder = useMemo(
    () =>
      activeFolderId
        ? (folders.find((folder) => folder.id === activeFolderId) ?? null)
        : null,
    [activeFolderId, folders],
  )
  const visualCursor = cursor
  const practiceNotes = useMemo(() => {
    if (!song) return []
    if (practicePart === 'all') return song.notes
    return song.notes.filter((note) =>
      noteMatchesPracticePart(note, practicePart, splitMidi),
    )
  }, [practicePart, song, splitMidi])
  const suggestedSplitMidi = useMemo(() => {
    if (!song) return DEFAULT_SPLIT_MIDI
    return suggestSplitMidi(song.notes)
  }, [song])
  const songSplitMidi = song?.practiceSettings?.splitMidi ?? DEFAULT_SPLIT_MIDI

  useEffect(() => {
    if (!activeSongId) {
      setSongSoundLoadingLabel(null)
      return
    }
    const effective = songSoundSettingsQuery.data?.effective
    if (!effective) return

    if (
      isPianoPresetId(effective.presetId) &&
      presetId !== effective.presetId
    ) {
      setPresetId(effective.presetId)
    }

    if (!effective.instrumentPackId || !effective.instrumentId) return
    const pack = instrumentPacks.find(
      (candidate) => candidate.id === effective.instrumentPackId,
    )
    if (!pack) return

    if (pack.status !== 'installed') {
      if (
        pack.download.enabled &&
        pack.downloadUrl &&
        !installingPackIds.has(pack.id) &&
        !automaticSongSoundInstallRef.current.has(pack.id)
      ) {
        automaticSongSoundInstallRef.current.add(pack.id)
        setSongSoundLoadingLabel(`Installing suggested piano · ${pack.name}…`)
        void handleInstallPack(pack.id, { select: false, persist: false })
          .catch((error) => {
            setSongSoundLoadingLabel(
              error instanceof Error
                ? error.message
                : `Could not install ${pack.name}`,
            )
          })
          .finally(() => {
            automaticSongSoundInstallRef.current.delete(pack.id)
            setTimeout(() => setSongSoundLoadingLabel(null), 1200)
          })
      }
      return
    }

    const instrument =
      pack.instruments.find(
        (candidate) =>
          candidate.id === effective.instrumentId && candidate.playable,
      ) ?? pack.instruments.find((candidate) => candidate.playable)
    if (!instrument) return

    if (activePackId !== pack.id || activeInstrumentId !== instrument.id) {
      setActiveInstrumentChoice(pack.id, instrument.id, { persist: false })
    }
    setSongSoundLoadingLabel(null)
  }, [
    activeInstrumentId,
    activePackId,
    activeSongId,
    handleInstallPack,
    installingPackIds,
    instrumentPacks,
    presetId,
    setActiveInstrumentChoice,
    songSoundSettingsQuery.data?.effective,
  ])

  const chatInstructions = useMemo(() => {
    const downloadablePacks = instrumentPacks
      .filter((pack) => pack.download.enabled && pack.downloadUrl)
      .map((pack) => `${pack.name} (${pack.id}) -> ${pack.downloadUrl}`)
      .join('; ')
    const songsFolder =
      songsQuery.data?.songsDir ?? 'the Piano app data songs folder'
    const currentFolderContext = activeFolder
      ? `Current folder: "${activeFolder.name}" (id ${activeFolder.id}). If creating a song in the current folder, prefer Piano RPC methods such as songs.upsert, songs.patch, songs.upsertFromFile, or songs.patchFromFile and assign folderId ${activeFolder.id}. For large generated songs, write a temporary JSON payload outside the songs folder and call songs.upsertFromFile or songs.patchFromFile so the app validates and persists once.`
      : `Current folder: Library root (no folder is open). If creating a song in the current folder, prefer Piano RPC methods such as songs.upsert, songs.patch, songs.upsertFromFile, or songs.patchFromFile and do not add it to any folder unless the user names one. For large generated songs, write a temporary JSON payload outside the songs folder and call songs.upsertFromFile or songs.patchFromFile so the app validates and persists once.`
    const songContext = song
      ? `The user is practicing ${song.title}. Song JSON files are stored in ${songsFolder}. Current cursor: ${formatDuration(cursor)} of ${formatDuration(duration)}. ${currentFolderContext}`
      : `The user is browsing the Piano app library. ${currentFolderContext}`

    return `${songContext}

If the user asks to install a piano instrument pack, do not use shell curl/wget. Prefer the app installer endpoint: POST /api/audio/instrument-packs/{pack-id}/install. The app installs packs under ${INSTRUMENTS_STORAGE_PATH}/{pack-id} and then GET /api/audio/options reflects installed status from the local manifest. Playable SFZ instruments expose GET /api/audio/instrument-packs/{pack-id}/instruments/{instrument-id}/preset for the browser sampler. Use only packs returned by GET /api/audio/options with download.enabled=true and a direct downloadUrl. Current downloadable packs: ${downloadablePacks || 'none'}. Preserve license/attribution files. If changing code, run pnpm check-types, pnpm lint, pnpm test, and pnpm build from ${APP_SOURCE_PATH}. Reference model: ${AUDIO_MODEL_PATH}.`
  }, [
    activeFolder,
    cursor,
    duration,
    instrumentPacks,
    song,
    songsQuery.data?.songsDir,
  ])

  useEffect(() => {
    setCursor(0)
    setPlaybackSpeedState(1)
    playbackSpeedRef.current = 1
    setIsPlaying(false)
    playedNotesRef.current = new Set()
    playStartPerformanceRef.current = 0
    playStartAudioTimeRef.current = null
    lastCursorRef.current = 0
  }, [activeSongId])

  useEffect(() => {
    if (!loadedSongId) return
    setSplitMidi(songSplitMidi)
    playedNotesRef.current = new Set()
  }, [loadedSongId, songSplitMidi])

  useEffect(() => {
    stopAll()
    setIsPlaying(false)
  }, [activeInstrument?.id, activePackId, stopAll])

  const resetPlayedNotesForPart = useCallback(
    (nextPart: PracticePart, nextSplitMidi: number) => {
      if (!song) {
        playedNotesRef.current = new Set()
        return
      }
      playedNotesRef.current = new Set(
        song.notes
          .filter(
            (note) =>
              noteMatchesPracticePart(note, nextPart, nextSplitMidi) &&
              note.start + note.duration < cursor,
          )
          .map((note) => note.id),
      )
    },
    [cursor, song],
  )

  const handlePracticePartChange = useCallback(
    (nextPart: PracticePart) => {
      setPracticePart(nextPart)
      stopAll()
      resetPlayedNotesForPart(nextPart, splitMidi)
    },
    [resetPlayedNotesForPart, splitMidi, stopAll],
  )

  const handleSplitMidiChange = useCallback(
    (nextSplitMidi: number) => {
      const bounded = Math.max(21, Math.min(108, nextSplitMidi))
      setSplitMidi(bounded)
      stopAll()
      resetPlayedNotesForPart(practicePart, bounded)
      if (isPlaying) {
        stopAll()
        playStartCursorRef.current = cursor
        playStartPerformanceRef.current = performance.now()
        playStartAudioTimeRef.current = getCurrentTime()
        lastCursorRef.current = cursor
      }
      if (activeSongId) {
        void fetchWithWorkspace(
          `/api/songs/${activeSongId}/practice-settings`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ splitMidi: bounded }),
          },
        )
          .then((res) => {
            if (!res.ok) throw new Error('Failed to save split note')
            return queryClient.invalidateQueries({
              queryKey: ['song', activeSongId, workspaceId],
            })
          })
          .catch((error) => {
            console.error('Failed to save split note', error)
          })
      }
    },
    [
      activeSongId,
      cursor,
      fetchWithWorkspace,
      getCurrentTime,
      isPlaying,
      practicePart,
      queryClient,
      resetPlayedNotesForPart,
      stopAll,
      workspaceId,
    ],
  )

  useEffect(() => {
    window.parent.postMessage(
      {
        type: 'moldable:set-chat-instructions',
        text: chatInstructions,
      },
      '*',
    )
  }, [chatInstructions])

  useEffect(() => {
    resetMoldableNavigation()
  }, [])

  useEffect(() => {
    if (activeSongId) return
    if (audioOptionsQuery.isLoading || audioSettingsQuery.isLoading) return
    void prewarm().catch(() => undefined)
  }, [
    activeSongId,
    audioOptionsQuery.isLoading,
    audioSettingsQuery.isLoading,
    prewarm,
  ])

  const activeMidi = useMemo(() => {
    return new Set(
      practiceNotes
        .filter(
          (note) =>
            visualCursor >= note.start &&
            visualCursor < note.start + note.duration,
        )
        .map((note) => note.midi),
    )
  }, [practiceNotes, visualCursor])

  const upcomingMidi = useMemo(() => {
    return new Set(
      practiceNotes
        .filter(
          (note) =>
            note.start > visualCursor && note.start <= visualCursor + 1.6,
        )
        .map((note) => note.midi),
    )
  }, [practiceNotes, visualCursor])

  const startPlayback = useCallback(async () => {
    if (!song) return
    // Clear stale scheduled notes before starting. Server restarts can leave the
    // browser audio graph alive, so each play needs a fresh scheduler anchor.
    stopAll()
    await prepare()
    const startCursor = cursor >= duration - 0.05 ? 0 : cursor
    setCursor(startCursor)
    playedNotesRef.current = new Set(
      practiceNotes
        .filter((note) => note.start + note.duration < startCursor)
        .map((note) => note.id),
    )
    playStartCursorRef.current = startCursor
    playStartPerformanceRef.current = performance.now()
    playStartAudioTimeRef.current = getCurrentTime()
    lastCursorRef.current = startCursor
    setIsPlaying(true)
  }, [cursor, duration, getCurrentTime, practiceNotes, prepare, song, stopAll])

  const pausePlayback = useCallback(() => {
    setIsPlaying(false)
    stopAll()
    playStartPerformanceRef.current = 0
    playStartAudioTimeRef.current = null
  }, [stopAll])

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pausePlayback()
    } else {
      void startPlayback()
    }
  }, [isPlaying, pausePlayback, startPlayback])

  const restartPlayback = useCallback(() => {
    setIsPlaying(false)
    stopAll()
    setCursor(0)
    playedNotesRef.current = new Set()
    playStartPerformanceRef.current = 0
    playStartAudioTimeRef.current = null
    lastCursorRef.current = 0
  }, [stopAll])

  const seekTo = useCallback(
    (nextCursor: number) => {
      const bounded = Math.min(Math.max(nextCursor, 0), duration)
      setCursor(bounded)
      lastCursorRef.current = bounded
      if (song) {
        playedNotesRef.current = new Set(
          practiceNotes
            .filter((note) => note.start + note.duration < bounded)
            .map((note) => note.id),
        )
      }
      if (isPlaying) {
        stopAll()
        playStartCursorRef.current = bounded
        playStartPerformanceRef.current = performance.now()
        playStartAudioTimeRef.current = getCurrentTime()
      }
    },
    [duration, getCurrentTime, isPlaying, practiceNotes, song, stopAll],
  )

  const startScrubbing = useCallback(() => {
    setIsScrubbing(true)
    stopAll()
  }, [stopAll])

  const endScrubbing = useCallback(
    (nextCursor: number) => {
      seekTo(nextCursor)
      setIsScrubbing(false)
    },
    [seekTo],
  )

  useEffect(() => {
    if (!isPlaying || !song || isScrubbing) return

    const tick = () => {
      const speed = playbackSpeedRef.current
      const audioNow = getCurrentTime()
      const audioStart = playStartAudioTimeRef.current
      const elapsed =
        audioNow !== null && audioStart !== null
          ? Math.max(0, audioNow - audioStart)
          : Math.max(
              0,
              (performance.now() - playStartPerformanceRef.current) / 1000,
            )
      const nextCursor = Math.min(
        duration,
        playStartCursorRef.current + elapsed * speed,
      )
      const previousCursor = lastCursorRef.current
      const audioLookahead = AUDIO_SCHEDULE_LOOKAHEAD_SECONDS * speed

      for (const note of practiceNotes) {
        if (playedNotesRef.current.has(note.id)) continue
        if (
          note.start >= previousCursor - 0.02 &&
          note.start <= nextCursor + audioLookahead
        ) {
          const musicDelay = Math.max(0, note.start - nextCursor)
          // Audio delay/duration are in wall-clock seconds, so divide by speed.
          playMidi(
            note.midi,
            note.duration / speed,
            note.velocity,
            musicDelay / speed,
          )
          playedNotesRef.current.add(note.id)
        }
      }

      setCursor(nextCursor)
      lastCursorRef.current = nextCursor

      if (nextCursor >= duration) {
        setIsPlaying(false)
        playStartPerformanceRef.current = 0
        playStartAudioTimeRef.current = null
        return
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [
    duration,
    getCurrentTime,
    isPlaying,
    isScrubbing,
    playMidi,
    practiceNotes,
    song,
  ])

  const previewKey = useCallback(
    async (midi: number) => {
      await resume()
      await prepare()
      playMidi(midi, 0.45, 0.65)
    },
    [playMidi, prepare, resume],
  )

  const closeSong = useCallback(
    (sync: 'pop' | 'none' = 'pop') => {
      if (sync === 'pop') popMoldableNavigation()
      setIsPlaying(false)
      stopAll()
      setCursor(0)
      setActiveSongId(null)
    },
    [stopAll],
  )

  const closeFolder = useCallback((sync: 'pop' | 'none' = 'pop') => {
    if (sync === 'pop') popMoldableNavigation()
    setActiveFolderId(null)
  }, [])

  const openFolder = useCallback((folder: Folder) => {
    pushMoldableNavigation({
      id: `folder:${folder.id}`,
      title: folder.name,
    })
    setActiveFolderId(folder.id)
  }, [])

  const openSong = useCallback((nextSong: SongSummary) => {
    pushMoldableNavigation({
      id: `song:${nextSong.id}`,
      title: nextSong.title,
    })
    setActiveSongId(nextSong.id)
  }, [])

  useMoldableNavigationPop(() => {
    if (activeSongId) {
      closeSong('none')
      return
    }
    if (activeFolderId) {
      closeFolder('none')
    }
  })

  return (
    <main className="bg-background text-foreground flex h-full min-h-0 flex-col overflow-hidden">
      {activeSongId && song ? (
        <PracticeView
          key={song.id}
          song={song}
          practiceNotes={practiceNotes}
          practicePart={practicePart}
          splitMidi={splitMidi}
          suggestedSplitMidi={suggestedSplitMidi}
          onPracticePartChange={handlePracticePartChange}
          onSplitMidiChange={handleSplitMidiChange}
          duration={duration}
          cursor={cursor}
          visualCursor={visualCursor}
          isPlaying={isPlaying}
          activeMidi={activeMidi}
          upcomingMidi={upcomingMidi}
          presetId={presetId}
          loadState={loadState}
          soundLoadingLabel={songSoundLoadingLabel}
          isSongLoading={songQuery.isLoading}
          isSongError={songQuery.isError}
          onBack={closeSong}
          onTogglePlay={togglePlay}
          onRestart={restartPlayback}
          onSeek={seekTo}
          onScrubStart={startScrubbing}
          onScrubEnd={endScrubbing}
          onPresetChange={handlePresetChange}
          onPreviewKey={previewKey}
          playbackSpeed={playbackSpeed}
          onPlaybackSpeedChange={setPlaybackSpeed}
          instrumentPacks={instrumentPacks}
          activePackId={activePackId}
          activeInstrumentId={activeInstrument?.id ?? null}
          onActiveInstrumentChange={handleActiveInstrumentChange}
          onInstallPack={handleInstallPack}
          installingPackIds={installingPackIds}
          isAudioOptionsLoading={audioOptionsQuery.isLoading}
        />
      ) : (
        <LibraryView
          songs={songsQuery.data?.songs ?? []}
          isLoading={songsQuery.isLoading}
          isError={songsQuery.isError}
          notePreviewBySong={notePreviewBySong}
          openFolderId={activeFolderId}
          onOpenFolder={openFolder}
          onCloseFolder={closeFolder}
          onSelect={openSong}
        />
      )}
    </main>
  )
}
