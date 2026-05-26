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
  SPLENDID_GRAND_SAMPLE_SET_ID,
} from '../shared/audio'
import type { Folder } from '../shared/folder'
import type { PianoSong, SongSummary } from '../shared/song'
import { getSongDuration } from '../shared/song'
import { type PianoPresetId } from './audio-presets'
import { formatDuration } from './piano-utils'
import { useAudioOptions } from './use-audio-options'
import { usePianoAudio } from './use-piano-audio'

interface SongsResponse {
  songsDir: string
  songs: SongSummary[]
}

interface AudioSettingsResponse {
  settings: PianoAudioSettings
}

const APP_SOURCE_PATH = '/Users/rob/.moldable/shared/apps/piano'
const INSTRUMENTS_STORAGE_PATH =
  '~/.moldable/workspaces/{workspace-id}/apps/piano/data/instruments'
const AUDIO_MODEL_PATH = `${APP_SOURCE_PATH}/src/shared/audio.ts`
const AUDIO_VISUAL_SYNC_OFFSET_SECONDS = 0.12

export function App() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [presetId, setPresetId] = useState<PianoPresetId>('classic-grand')
  const [activeSongId, setActiveSongId] = useState<string | null>(null)
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [cursor, setCursor] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isScrubbing, setIsScrubbing] = useState(false)

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
  const { loadState, playMidi, prepare, prewarm, resume, stopAll } =
    usePianoAudio(
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

  const handleActiveInstrumentChange = useCallback(
    (packId: string, instrumentId: string) => {
      setActiveInstrumentChoice(packId, instrumentId)
    },
    [setActiveInstrumentChoice],
  )

  const handlePresetChange = useCallback(
    (nextPresetId: PianoPresetId) => {
      setPresetId(nextPresetId)
      void persistAudioSettings({ presetId: nextPresetId })
    },
    [persistAudioSettings],
  )

  useEffect(() => {
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
    async (packId: string) => {
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
        if (defaultInstrument) {
          setActiveInstrumentChoice(body.pack.id, defaultInstrument.id)
        } else {
          setActivePackId(body.pack.id)
          writeActivePackId(body.pack.id)
        }
        void queryClient.invalidateQueries({
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

  const playedNotesRef = useRef<Set<string>>(new Set())
  const rafRef = useRef<number | null>(null)
  const playStartCursorRef = useRef(0)
  const playStartPerformanceRef = useRef(0)
  const lastCursorRef = useRef(0)

  const songsQuery = useQuery({
    queryKey: ['songs', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/songs')
      if (!res.ok) throw new Error('Failed to load songs')
      return (await res.json()) as SongsResponse
    },
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

  const song = songQuery.data ?? null
  const duration = song ? getSongDuration(song) : 0
  const visualCursor =
    isPlaying && !isScrubbing
      ? Math.max(0, cursor - AUDIO_VISUAL_SYNC_OFFSET_SECONDS)
      : cursor

  const chatInstructions = useMemo(() => {
    const downloadablePacks = instrumentPacks
      .filter((pack) => pack.download.enabled && pack.downloadUrl)
      .map((pack) => `${pack.name} (${pack.id}) -> ${pack.downloadUrl}`)
      .join('; ')
    const songContext = song
      ? `The user is practicing ${song.title}. Song JSON files are stored in ${songsQuery.data?.songsDir ?? 'the Piano app data songs folder'}. Current cursor: ${formatDuration(cursor)} of ${formatDuration(duration)}.`
      : 'The user is browsing the Piano app library.'

    return `${songContext}

If the user asks to install a piano instrument pack, do not use shell curl/wget. Prefer the app installer endpoint: POST /api/audio/instrument-packs/{pack-id}/install. The app installs packs under ${INSTRUMENTS_STORAGE_PATH}/{pack-id} and then GET /api/audio/options reflects installed status from the local manifest. Playable SFZ instruments expose GET /api/audio/instrument-packs/{pack-id}/instruments/{instrument-id}/preset for the browser sampler. Use only packs returned by GET /api/audio/options with download.enabled=true and a direct downloadUrl. Current downloadable packs: ${downloadablePacks || 'none'}. Preserve license/attribution files. If changing code, run pnpm check-types, pnpm lint, pnpm test, and pnpm build from ${APP_SOURCE_PATH}. Reference model: ${AUDIO_MODEL_PATH}.`
  }, [cursor, duration, instrumentPacks, song, songsQuery.data?.songsDir])

  useEffect(() => {
    setCursor(0)
    setIsPlaying(false)
    playedNotesRef.current = new Set()
    lastCursorRef.current = 0
  }, [activeSongId])

  useEffect(() => {
    stopAll()
    setIsPlaying(false)
  }, [activeInstrument?.id, activePackId, stopAll])

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
    if (!song) return new Set<number>()
    return new Set(
      song.notes
        .filter(
          (note) =>
            visualCursor >= note.start &&
            visualCursor < note.start + note.duration,
        )
        .map((note) => note.midi),
    )
  }, [song, visualCursor])

  const upcomingMidi = useMemo(() => {
    if (!song) return new Set<number>()
    return new Set(
      song.notes
        .filter(
          (note) =>
            note.start > visualCursor && note.start <= visualCursor + 1.6,
        )
        .map((note) => note.midi),
    )
  }, [song, visualCursor])

  const startPlayback = useCallback(async () => {
    if (!song) return
    await prepare()
    const startCursor = cursor >= duration - 0.05 ? 0 : cursor
    setCursor(startCursor)
    playedNotesRef.current = new Set(
      song.notes
        .filter((note) => note.start + note.duration < startCursor)
        .map((note) => note.id),
    )
    playStartCursorRef.current = startCursor
    playStartPerformanceRef.current = performance.now()
    lastCursorRef.current = startCursor
    setIsPlaying(true)
  }, [cursor, duration, prepare, song])

  const pausePlayback = useCallback(() => {
    setIsPlaying(false)
    stopAll()
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
    lastCursorRef.current = 0
  }, [stopAll])

  const seekTo = useCallback(
    (nextCursor: number) => {
      const bounded = Math.min(Math.max(nextCursor, 0), duration)
      setCursor(bounded)
      lastCursorRef.current = bounded
      if (song) {
        playedNotesRef.current = new Set(
          song.notes
            .filter((note) => note.start + note.duration < bounded)
            .map((note) => note.id),
        )
      }
      if (isPlaying) {
        playStartCursorRef.current = bounded
        playStartPerformanceRef.current = performance.now()
      }
    },
    [duration, isPlaying, song],
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
      const elapsed =
        (performance.now() - playStartPerformanceRef.current) / 1000
      const nextCursor = Math.min(
        duration,
        playStartCursorRef.current + elapsed,
      )
      const previousCursor = lastCursorRef.current

      for (const note of song.notes) {
        if (playedNotesRef.current.has(note.id)) continue
        if (
          note.start >= previousCursor - 0.02 &&
          note.start <= nextCursor + 0.12
        ) {
          const delay = Math.max(0, note.start - nextCursor)
          playMidi(note.midi, note.duration, note.velocity, delay)
          playedNotesRef.current.add(note.id)
        }
      }

      setCursor(nextCursor)
      lastCursorRef.current = nextCursor

      if (nextCursor >= duration) {
        setIsPlaying(false)
        return
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [duration, isPlaying, isScrubbing, playMidi, song])

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
          duration={duration}
          cursor={cursor}
          visualCursor={visualCursor}
          isPlaying={isPlaying}
          activeMidi={activeMidi}
          upcomingMidi={upcomingMidi}
          presetId={presetId}
          loadState={loadState}
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
