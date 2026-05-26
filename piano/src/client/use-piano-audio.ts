import { useCallback, useEffect, useRef, useState } from 'react'
import type { PianoInstrumentPack } from '../shared/audio'
import {
  PIANO_SAMPLE_BASE_URL,
  PIANO_SAMPLE_NOTES,
  type PianoPresetId,
  pianoPresetById,
} from './audio-presets'
import {
  CacheStorage,
  type LoadProgress,
  SampleLoader,
  Sampler,
  type Smplr,
  type SmplrPreset,
  SplendidGrandPiano,
} from 'smplr'

type PianoInstrument = Smplr
type FetchWithWorkspace = (
  input: string,
  init?: RequestInit,
) => Promise<Response>
type PianoSampleLoader = Pick<SampleLoader, 'load'>

interface SfzPresetResponse {
  packId: string
  instrument: {
    id: string
    name: string
  }
  preset: SmplrPreset
}

export interface AudioLoadState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  loaded: number
  total: number
  error: string | null
}

function createAudioContext() {
  return new AudioContext()
}

function velocityToMidi(velocity: number | undefined, scale: number) {
  const normalized = velocity ?? 0.72
  return Math.min(127, Math.max(1, Math.round(normalized * 127 * scale)))
}

export function usePianoAudio(
  presetId: PianoPresetId,
  activePack: PianoInstrumentPack | null,
  activeInstrumentId: string | null,
  fetchWithWorkspace: FetchWithWorkspace,
) {
  const audioContextRef = useRef<AudioContext | null>(null)
  const loaderRef = useRef<SampleLoader | null>(null)
  const sfzLoaderRef = useRef<PianoSampleLoader | null>(null)
  const activeInstrumentRef = useRef<PianoInstrument | null>(null)
  const instrumentPromisesRef = useRef<Map<string, Promise<PianoInstrument>>>(
    new Map(),
  )
  const [loadState, setLoadState] = useState<AudioLoadState>({
    status: 'idle',
    loaded: 0,
    total: 0,
    error: null,
  })

  const getAudioContext = useCallback(() => {
    audioContextRef.current ??= createAudioContext()
    loaderRef.current ??= SampleLoader(audioContextRef.current, {
      storage: CacheStorage('piano-samples'),
    })
    sfzLoaderRef.current ??= createSfzSampleLoader(
      audioContextRef.current,
      fetchWithWorkspace,
    )
    return audioContextRef.current
  }, [fetchWithWorkspace])

  const resume = useCallback(async () => {
    const audioContext = getAudioContext()
    if (audioContext.state === 'suspended') await audioContext.resume()
  }, [getAudioContext])

  const loadPreset = useCallback(
    async (nextPresetId: PianoPresetId, pack: PianoInstrumentPack | null) => {
      const selectedPack =
        pack?.status === 'installed'
          ? pack
          : {
              id: 'splendid-grand-piano',
              playbackEngine: 'smplr-splendid-grand',
            }
      const playableInstrument =
        pack?.instruments.find(
          (instrument) =>
            instrument.id === activeInstrumentId && instrument.playable,
        ) ??
        pack?.instruments.find((instrument) => instrument.playable) ??
        null
      const instrumentKey =
        selectedPack.playbackEngine === 'smplr-sfz' && playableInstrument
          ? `${nextPresetId}:${selectedPack.id}:${playableInstrument.id}`
          : `${nextPresetId}:splendid-grand-piano`

      const existing = instrumentPromisesRef.current.get(instrumentKey)
      if (existing) {
        const instrument = await existing
        activeInstrumentRef.current = instrument
        setLoadState((current) => ({
          ...current,
          status: 'ready',
          error: null,
        }))
        return instrument
      }

      const audioContext = getAudioContext()
      const preset = pianoPresetById(nextPresetId)
      const parameters = preset.parameters
      setLoadState({ status: 'loading', loaded: 0, total: 0, error: null })

      const promise = Promise.resolve()
        .then(async () => {
          const onLoadProgress = (progress: LoadProgress) => {
            setLoadState({
              status: 'loading',
              loaded: progress.loaded,
              total: progress.total,
              error: null,
            })
          }

          const instrument =
            selectedPack.playbackEngine === 'smplr-sfz' && playableInstrument
              ? await loadSfzInstrument(
                  audioContext,
                  fetchWithWorkspace,
                  selectedPack.id,
                  playableInstrument.id,
                  {
                    decayTime: parameters.decayTime,
                    detune: parameters.detune,
                    loader: sfzLoaderRef.current,
                    onLoadProgress,
                    volume: parameters.volume,
                  },
                )
              : SplendidGrandPiano(audioContext, {
                  baseUrl: PIANO_SAMPLE_BASE_URL,
                  decayTime: parameters.decayTime,
                  detune: parameters.detune,
                  formats: ['m4a'],
                  loader: loaderRef.current ?? undefined,
                  notesToLoad: {
                    notes: PIANO_SAMPLE_NOTES,
                    velocityRange: [1, 127],
                  },
                  onLoadProgress,
                  velocity: 100,
                  volume: parameters.volume,
                })

          await instrument.ready
          setLoadState((current) => ({
            ...current,
            status: 'ready',
            error: null,
          }))
          return instrument
        })
        .catch((error: unknown) => {
          const message =
            error instanceof Error
              ? error.message
              : 'Could not load piano samples'
          instrumentPromisesRef.current.delete(instrumentKey)
          setLoadState({
            status: 'error',
            loaded: 0,
            total: 0,
            error: message,
          })
          throw error
        })

      instrumentPromisesRef.current.set(instrumentKey, promise)
      const instrument = await promise
      activeInstrumentRef.current = instrument
      return instrument
    },
    [activeInstrumentId, fetchWithWorkspace, getAudioContext],
  )

  const prepare = useCallback(async () => {
    setLoadState((current) =>
      current.status === 'ready'
        ? current
        : { status: 'loading', loaded: 0, total: 0, error: null },
    )
    await resume()
    await loadPreset(presetId, activePack)
  }, [activePack, loadPreset, presetId, resume])

  const prewarm = useCallback(async () => {
    await loadPreset(presetId, activePack)
  }, [activePack, loadPreset, presetId])

  const playMidi = useCallback(
    (midi: number, duration: number, velocity = 0.72, delay = 0) => {
      const instrument = activeInstrumentRef.current
      const audioContext = audioContextRef.current
      if (!instrument || !audioContext) return

      const preset = pianoPresetById(presetId)
      instrument.start({
        note: midi,
        time: audioContext.currentTime + Math.max(0, delay),
        duration: Math.max(0.08, duration),
        velocity: velocityToMidi(velocity, preset.parameters.velocityScale),
      })
    },
    [presetId],
  )

  const stopAll = useCallback(() => {
    activeInstrumentRef.current?.stop()
    activeInstrumentRef.current?.scheduler.stop()
  }, [])

  useEffect(() => {
    if (loadState.status === 'ready') {
      void loadPreset(presetId, activePack).catch(() => undefined)
    }
  }, [activePack, activeInstrumentId, loadPreset, loadState.status, presetId])

  useEffect(() => {
    const instrumentPromises = instrumentPromisesRef.current
    return () => {
      for (const promise of instrumentPromises.values()) {
        void promise
          .then((instrument) => instrument.dispose())
          .catch(() => undefined)
      }
    }
  }, [])

  return { loadState, playMidi, prepare, prewarm, resume, stopAll }
}

async function loadSfzInstrument(
  audioContext: AudioContext,
  fetchWithWorkspace: FetchWithWorkspace,
  packId: string,
  instrumentId: string,
  options: {
    decayTime: number
    detune: number
    loader: PianoSampleLoader | null
    onLoadProgress: (progress: LoadProgress) => void
    volume: number
  },
) {
  const response = await fetchWithWorkspace(
    `/api/audio/instrument-packs/${packId}/instruments/${instrumentId}/preset`,
  )
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(body?.error ?? 'Failed to load SFZ instrument preset')
  }

  const body = (await response.json()) as SfzPresetResponse
  return Sampler(audioContext, {
    preset: body.preset,
    decayTime: options.decayTime,
    detune: options.detune,
    loader: options.loader ?? undefined,
    onLoadProgress: options.onLoadProgress,
    volume: options.volume,
  })
}

function createSfzSampleLoader(
  audioContext: AudioContext,
  fetchWithWorkspace: FetchWithWorkspace,
): PianoSampleLoader {
  const cache = new Map<string, Promise<AudioBuffer>>()

  const loadBuffer = (url: string) => {
    let promise = cache.get(url)
    if (promise) return promise

    promise = fetchWithWorkspace(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load sample ${url}: ${response.status}`)
        }
        return response.arrayBuffer()
      })
      .then(async (arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))

    cache.set(url, promise)
    return promise
  }

  return {
    async load(preset, options) {
      const format = preset.samples.formats[0] ?? 'wav'
      const baseUrl = preset.samples.baseUrl.replace(/\/$/, '')
      const sampleNames = new Set<string>()

      for (const group of preset.groups) {
        for (const region of group.regions) {
          sampleNames.add(region.sample)
        }
      }

      const total = sampleNames.size
      let loaded = 0
      const buffers = new Map<string, AudioBuffer>()

      await Promise.all(
        [...sampleNames].map(async (sample) => {
          const mappedPath = preset.samples.map?.[sample] ?? sample
          const buffer = await loadBuffer(`${baseUrl}/${mappedPath}.${format}`)
          buffers.set(sample, buffer)
          loaded += 1
          if (typeof options === 'function') {
            options(loaded, total)
          } else {
            options?.onProgress?.(loaded, total)
          }
        }),
      )

      return buffers
    },
  }
}
