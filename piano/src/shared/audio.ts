export type PianoAudioEngine = 'smplr-splendid-grand'

export type PianoSettingControlType = 'slider' | 'select' | 'toggle'

export interface PianoSampleSet {
  id: string
  name: string
  engine: PianoAudioEngine
  description: string
  baseUrl: string
  formats: string[]
  sampleCount: number
  sizeMb: number
  license: {
    name: string
    url: string
    attributionRequired: boolean
  }
  coverage: {
    minMidi: number
    maxMidi: number
    loadedNotes: number[]
    velocityLayers: string[]
  }
}

export interface PianoInstrumentPack {
  id: string
  name: string
  developer: string
  status: 'installed' | 'downloadable' | 'candidate'
  engine: 'smplr' | 'sfz'
  playbackEngine: 'smplr-splendid-grand' | 'smplr-sfz'
  format: Array<'m4a' | 'flac' | 'wav' | 'sfz' | 'kontakt'>
  category: 'grand' | 'upright' | 'harpsichord' | 'collection'
  description: string
  sourceUrl: string
  downloadUrl?: string
  downloadMethod: 'bundled' | 'direct' | 'bittorrent' | 'manual-review'
  installedPath?: string
  sizeMb?: number
  copyProtection?: 'none' | 'unknown'
  redistribution: 'cleared' | 'attribution-required' | 'needs-review'
  download: {
    enabled: boolean
    strategy: 'bundled' | 'direct' | 'manual-review'
    note: string
  }
  license: {
    name: string
    url?: string
    attributionRequired: boolean
    commercialUse: boolean
    redistributionNote: string
  }
  attribution: {
    title: string
    author: string
    text: string
    url: string
  }
  instruments: Array<{
    id: string
    name: string
    type: 'grand' | 'upright' | 'harpsichord'
    sfzPath?: string
    playable?: boolean
    notes?: string
  }>
}

export interface PianoPresetParameters {
  volume: number
  decayTime: number
  velocityScale: number
  velocityCurve: 'soft' | 'balanced' | 'firm' | 'wide'
  tone: number
  room: number
  width: number
  detune: number
}

export interface PianoPreset {
  id: string
  name: string
  family: 'grand' | 'practice' | 'cinematic' | 'band'
  description: string
  sampleSetId: string
  parameters: PianoPresetParameters
}

export interface PianoSettingControlBase {
  id: keyof PianoPresetParameters
  label: string
  description: string
  type: PianoSettingControlType
}

export interface PianoSliderSettingControl extends PianoSettingControlBase {
  type: 'slider'
  min: number
  max: number
  step: number
  unit?: string
}

export interface PianoSelectSettingControl extends PianoSettingControlBase {
  type: 'select'
  options: Array<{
    value: PianoPresetParameters['velocityCurve']
    label: string
  }>
}

export interface PianoToggleSettingControl extends PianoSettingControlBase {
  type: 'toggle'
}

export type PianoSettingControl =
  | PianoSliderSettingControl
  | PianoSelectSettingControl
  | PianoToggleSettingControl

export interface PianoAudioOptionsResponse {
  defaultPresetId: string
  instrumentPacks: PianoInstrumentPack[]
  sampleSets: PianoSampleSet[]
  presets: PianoPreset[]
  controls: PianoSettingControl[]
}

export interface PianoAudioSettings {
  presetId: string
  instrumentPackId: string
  instrumentId: string
  overrides: Partial<PianoPresetParameters>
  updatedAt: string
}

export const SPLENDID_GRAND_SAMPLE_SET_ID = 'splendid-grand-piano'

export const PIANO_SAMPLE_BASE_URL = '/instruments/splendid-grand-piano'

export const PIANO_SAMPLE_NOTES = [
  21, 24, 28, 31, 36, 40, 43, 48, 52, 55, 60, 64, 67, 72, 76, 79, 84, 88, 91,
  96, 100, 103, 108,
]

export const DEFAULT_PIANO_PRESET_ID = 'classic-grand'

export const PIANO_SAMPLE_SETS: PianoSampleSet[] = [
  {
    id: SPLENDID_GRAND_SAMPLE_SET_ID,
    name: 'Splendid Grand Piano',
    engine: 'smplr-splendid-grand',
    description: 'Local reduced grand-piano sample set for instant playback.',
    baseUrl: PIANO_SAMPLE_BASE_URL,
    formats: ['m4a'],
    sampleCount: 65,
    sizeMb: 6.8,
    license: {
      name: 'Public domain',
      url: 'https://github.com/smpldsnds/sfzinstruments-splendid-grand-piano',
      attributionRequired: false,
    },
    coverage: {
      minMidi: 21,
      maxMidi: 108,
      loadedNotes: PIANO_SAMPLE_NOTES,
      velocityLayers: ['PP', 'Mp', 'MF', 'Mf', 'FF'],
    },
  },
]

export const PIANO_INSTRUMENT_PACKS: PianoInstrumentPack[] = [
  {
    id: 'splendid-grand-piano',
    name: 'Splendid Grand Piano',
    developer: 'AKAI / SFZ Instruments',
    status: 'installed',
    engine: 'smplr',
    playbackEngine: 'smplr-splendid-grand',
    format: ['m4a', 'sfz', 'flac'],
    category: 'grand',
    description: 'Public-domain Steinway grand piano sample set.',
    sourceUrl: 'https://github.com/sfzinstruments/SplendidGrandPiano',
    downloadMethod: 'bundled',
    installedPath: '/instruments/splendid-grand-piano',
    sizeMb: 6.8,
    copyProtection: 'none',
    redistribution: 'cleared',
    download: {
      enabled: false,
      strategy: 'bundled',
      note: 'Installed with the app as the default lightweight Web Audio sample set; no download required.',
    },
    license: {
      name: 'Public domain',
      url: 'https://github.com/sfzinstruments/SplendidGrandPiano',
      attributionRequired: false,
      commercialUse: true,
      redistributionNote:
        'Upstream describes the original AKAI samples as public domain. The app currently bundles a reduced local m4a subset.',
    },
    attribution: {
      title: 'Splendid Grand Piano',
      author: 'AKAI; SFZ mapping by kinwie / SFZ Instruments',
      text: 'Public Domain samples by AKAI; fixed, converted, and mapped to SFZ by kinwie.',
      url: 'https://github.com/sfzinstruments/SplendidGrandPiano',
    },
    instruments: [
      {
        id: 'splendid-grand-piano',
        name: 'Splendid Grand Piano',
        type: 'grand',
        playable: true,
        notes:
          'Steinway grand; reduced sample subset is installed for the current Web Audio sampler.',
      },
    ],
  },
  {
    id: 'vcsl-keys',
    name: 'VCSL Keys',
    developer: 'Versilian Studios LLC',
    status: 'downloadable',
    engine: 'sfz',
    playbackEngine: 'smplr-sfz',
    format: ['sfz', 'flac'],
    category: 'collection',
    description:
      'Real SFZ keyboard collection with grands, uprights, and harpsichords from Versilian Community Sample Library.',
    sourceUrl: 'https://versilian-studios.com/vcsl-keys/',
    downloadUrl: 'https://versilian-studios.com/Distro/VCSL_Keys.zip',
    downloadMethod: 'direct',
    sizeMb: 680,
    copyProtection: 'none',
    redistribution: 'cleared',
    download: {
      enabled: true,
      strategy: 'direct',
      note: 'Direct download is suitable for an in-app downloader because VCSL Keys is CC0.',
    },
    license: {
      name: 'CC0-1.0',
      url: 'https://creativecommons.org/publicdomain/zero/1.0/',
      attributionRequired: false,
      commercialUse: true,
      redistributionNote:
        'Versilian describes VCSL Keys as CC0 with no royalties, attribution, credit, restrictions, or limitations.',
    },
    attribution: {
      title: 'VCSL Keys',
      author: 'Versilian Studios LLC; patches by Peter Eastman',
      text: 'VCSL Keys is a CC0 keyboard collection derived from the Versilian Community Sample Library.',
      url: 'https://versilian-studios.com/vcsl-keys/',
    },
    instruments: [
      {
        id: 'vcsl-grand-k',
        name: 'Grand Piano K',
        type: 'grand',
        sfzPath: 'Grand Piano, K.sfz',
        playable: true,
      },
      {
        id: 'vcsl-grand-k-legacy',
        name: 'Grand Piano K Legacy',
        type: 'grand',
        sfzPath: 'Grand Piano, K - Legacy.sfz',
        playable: true,
      },
      {
        id: 'vcsl-grand-s-model-b',
        name: 'Grand Piano S Model B',
        type: 'grand',
        sfzPath: 'Grand Piano, S Model B 1895.sfz',
        playable: true,
      },
      {
        id: 'vcsl-upright-y',
        name: 'Upright Piano Y',
        type: 'upright',
        sfzPath: 'Upright Piano, Y.sfz',
        playable: true,
      },
      {
        id: 'vcsl-upright-knight',
        name: 'Upright Piano Knight',
        type: 'upright',
        sfzPath: 'Upright Piano, Knight.sfz',
        playable: true,
      },
      {
        id: 'vcsl-harpsichord-english',
        name: 'English Harpsichord',
        type: 'harpsichord',
        sfzPath: 'Harpsichord, English - Normal.sfz',
        playable: true,
      },
      {
        id: 'vcsl-harpsichord-flemish',
        name: 'Flemish Harpsichord',
        type: 'harpsichord',
        sfzPath: 'Harpsichord, Flemish - Full.sfz',
        playable: true,
      },
      {
        id: 'vcsl-harpsichord-french',
        name: 'French Harpsichord',
        type: 'harpsichord',
        sfzPath: 'Harpsichord, French.sfz',
        playable: true,
      },
      {
        id: 'vcsl-harpsichord-italian',
        name: 'Italian Harpsichord',
        type: 'harpsichord',
        sfzPath: 'Harpsichord, Italian.sfz',
        playable: true,
      },
      {
        id: 'vcsl-harpsichord-unknown',
        name: 'Unknown Harpsichord',
        type: 'harpsichord',
        sfzPath: 'Harpsichord, Unk.sfz',
        playable: true,
      },
    ],
  },
  {
    id: 'salamander-grand-piano',
    name: 'Salamander Grand Piano',
    developer: 'Alexander Holm',
    status: 'downloadable',
    engine: 'sfz',
    playbackEngine: 'smplr-sfz',
    format: ['sfz', 'wav'],
    category: 'grand',
    description: 'Yamaha C5 grand piano with 16 velocity layers.',
    sourceUrl: 'https://sfzinstruments.github.io/pianos/salamander/',
    downloadUrl:
      'https://freepats.zenvoid.org/Piano/SalamanderGrandPiano/SalamanderGrandPianoV3%2B20161209_44khz16bit.tar.xz',
    downloadMethod: 'direct',
    sizeMb: 394,
    copyProtection: 'none',
    redistribution: 'attribution-required',
    download: {
      enabled: true,
      strategy: 'direct',
      note: 'Direct download is suitable for an in-app downloader with bundled attribution.',
    },
    license: {
      name: 'CC-BY-3.0',
      url: 'https://creativecommons.org/licenses/by/3.0/',
      attributionRequired: true,
      commercialUse: true,
      redistributionNote:
        'Commercial use is compatible with CC-BY, but bundled use must preserve attribution to Alexander Holm.',
    },
    attribution: {
      title: 'Salamander Grand Piano',
      author: 'Alexander Holm',
      text: 'Salamander Grand Piano samples by Alexander Holm, licensed under CC-BY-3.0.',
      url: 'https://sfzinstruments.github.io/pianos/',
    },
    instruments: [
      {
        id: 'salamander-yamaha-c5',
        name: 'Salamander Grand Piano',
        type: 'grand',
        sfzPath:
          'SalamanderGrandPianoV3_44.1khz16bit/SalamanderGrandPianoV3.sfz',
        playable: true,
        notes: 'Yamaha C5 recorded with two AKG C414 microphones.',
      },
    ],
  },
]

export const PIANO_PRESETS: PianoPreset[] = [
  {
    id: 'classic-grand',
    name: 'Classic Grand',
    family: 'grand',
    description: 'Balanced grand piano for everyday practice.',
    sampleSetId: SPLENDID_GRAND_SAMPLE_SET_ID,
    parameters: {
      volume: 104,
      decayTime: 0.72,
      velocityScale: 1,
      velocityCurve: 'balanced',
      tone: 0,
      room: 0.12,
      width: 0.2,
      detune: 0,
    },
  },
  {
    id: 'bright-grand',
    name: 'Bright Grand',
    family: 'grand',
    description: 'Forward attack that cuts through dense arrangements.',
    sampleSetId: SPLENDID_GRAND_SAMPLE_SET_ID,
    parameters: {
      volume: 110,
      decayTime: 0.48,
      velocityScale: 1.18,
      velocityCurve: 'firm',
      tone: 0.34,
      room: 0.08,
      width: 0.1,
      detune: 0,
    },
  },
  {
    id: 'soft-grand',
    name: 'Soft Grand',
    family: 'practice',
    description: 'Lower velocity response with a calmer release.',
    sampleSetId: SPLENDID_GRAND_SAMPLE_SET_ID,
    parameters: {
      volume: 96,
      decayTime: 0.96,
      velocityScale: 0.72,
      velocityCurve: 'soft',
      tone: -0.18,
      room: 0.18,
      width: 0.2,
      detune: 0,
    },
  },
  {
    id: 'warm-ballad',
    name: 'Warm Ballad',
    family: 'grand',
    description: 'Rounder tone and longer sustain for slower pieces.',
    sampleSetId: SPLENDID_GRAND_SAMPLE_SET_ID,
    parameters: {
      volume: 100,
      decayTime: 1.12,
      velocityScale: 0.88,
      velocityCurve: 'balanced',
      tone: -0.28,
      room: 0.24,
      width: 0.32,
      detune: -1,
    },
  },
  {
    id: 'practice-pop',
    name: 'Practice Pop',
    family: 'practice',
    description: 'Tighter release and clear attack for learning timing.',
    sampleSetId: SPLENDID_GRAND_SAMPLE_SET_ID,
    parameters: {
      volume: 105,
      decayTime: 0.38,
      velocityScale: 1.06,
      velocityCurve: 'firm',
      tone: 0.2,
      room: 0.04,
      width: 0,
      detune: 0,
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    family: 'cinematic',
    description: 'Quiet darker grand for late-night practice.',
    sampleSetId: SPLENDID_GRAND_SAMPLE_SET_ID,
    parameters: {
      volume: 88,
      decayTime: 1.24,
      velocityScale: 0.62,
      velocityCurve: 'soft',
      tone: -0.42,
      room: 0.34,
      width: 0.42,
      detune: -2,
    },
  },
  {
    id: 'concert-hall',
    name: 'Concert Hall',
    family: 'cinematic',
    description: 'Wider and more resonant for listening back.',
    sampleSetId: SPLENDID_GRAND_SAMPLE_SET_ID,
    parameters: {
      volume: 102,
      decayTime: 1.44,
      velocityScale: 0.96,
      velocityCurve: 'wide',
      tone: -0.08,
      room: 0.48,
      width: 0.58,
      detune: 0,
    },
  },
  {
    id: 'rock-grand',
    name: 'Rock Grand',
    family: 'band',
    description: 'Harder velocity curve with short release.',
    sampleSetId: SPLENDID_GRAND_SAMPLE_SET_ID,
    parameters: {
      volume: 114,
      decayTime: 0.34,
      velocityScale: 1.28,
      velocityCurve: 'firm',
      tone: 0.42,
      room: 0.06,
      width: 0.08,
      detune: 0,
    },
  },
  {
    id: 'wide-dynamic',
    name: 'Wide Dynamic',
    family: 'practice',
    description: 'Exaggerated dynamics for practicing touch.',
    sampleSetId: SPLENDID_GRAND_SAMPLE_SET_ID,
    parameters: {
      volume: 104,
      decayTime: 0.82,
      velocityScale: 1,
      velocityCurve: 'wide',
      tone: 0.04,
      room: 0.14,
      width: 0.24,
      detune: 0,
    },
  },
  {
    id: 'close-mic',
    name: 'Close Mic',
    family: 'grand',
    description: 'Dry and direct with minimal room.',
    sampleSetId: SPLENDID_GRAND_SAMPLE_SET_ID,
    parameters: {
      volume: 106,
      decayTime: 0.58,
      velocityScale: 0.98,
      velocityCurve: 'balanced',
      tone: 0.14,
      room: 0,
      width: 0,
      detune: 0,
    },
  },
  {
    id: 'mellow-upright',
    name: 'Mellow Upright',
    family: 'practice',
    description: 'A narrower, less polished practice-piano feel.',
    sampleSetId: SPLENDID_GRAND_SAMPLE_SET_ID,
    parameters: {
      volume: 94,
      decayTime: 0.64,
      velocityScale: 0.78,
      velocityCurve: 'soft',
      tone: -0.34,
      room: 0.1,
      width: -0.18,
      detune: 3,
    },
  },
  {
    id: 'long-release',
    name: 'Long Release',
    family: 'cinematic',
    description: 'Extra trailing release for sparse pieces.',
    sampleSetId: SPLENDID_GRAND_SAMPLE_SET_ID,
    parameters: {
      volume: 98,
      decayTime: 1.72,
      velocityScale: 0.84,
      velocityCurve: 'balanced',
      tone: -0.12,
      room: 0.38,
      width: 0.38,
      detune: 0,
    },
  },
]

export const PIANO_SETTING_CONTROLS: PianoSettingControl[] = [
  {
    id: 'volume',
    type: 'slider',
    label: 'Volume',
    description: 'Sampler output level on a MIDI-style 0-127 scale.',
    min: 60,
    max: 127,
    step: 1,
  },
  {
    id: 'decayTime',
    type: 'slider',
    label: 'Release',
    description: 'How long notes trail after note-off.',
    min: 0.2,
    max: 2,
    step: 0.02,
    unit: 's',
  },
  {
    id: 'velocityScale',
    type: 'slider',
    label: 'Touch',
    description: 'Scales incoming song/key velocity before playback.',
    min: 0.45,
    max: 1.45,
    step: 0.01,
  },
  {
    id: 'velocityCurve',
    type: 'select',
    label: 'Curve',
    description: 'How strongly low and high velocities are emphasized.',
    options: [
      { value: 'soft', label: 'Soft' },
      { value: 'balanced', label: 'Balanced' },
      { value: 'firm', label: 'Firm' },
      { value: 'wide', label: 'Wide' },
    ],
  },
  {
    id: 'tone',
    type: 'slider',
    label: 'Tone',
    description: 'Negative values are darker; positive values are brighter.',
    min: -1,
    max: 1,
    step: 0.01,
  },
  {
    id: 'room',
    type: 'slider',
    label: 'Room',
    description: 'Amount of ambience the audio engine should apply.',
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    id: 'width',
    type: 'slider',
    label: 'Width',
    description: 'Stereo spread or narrowing.',
    min: -1,
    max: 1,
    step: 0.01,
  },
  {
    id: 'detune',
    type: 'slider',
    label: 'Detune',
    description: 'Global tuning offset in cents.',
    min: -12,
    max: 12,
    step: 1,
    unit: 'ct',
  },
]

export function pianoPresetById(id: string) {
  return (
    PIANO_PRESETS.find((preset) => preset.id === id) ??
    PIANO_PRESETS.find((preset) => preset.id === DEFAULT_PIANO_PRESET_ID) ??
    PIANO_PRESETS[0]
  )
}

export function defaultPianoAudioSettings(
  now = new Date().toISOString(),
): PianoAudioSettings {
  return {
    presetId: DEFAULT_PIANO_PRESET_ID,
    instrumentPackId: SPLENDID_GRAND_SAMPLE_SET_ID,
    instrumentId: SPLENDID_GRAND_SAMPLE_SET_ID,
    overrides: {},
    updatedAt: now,
  }
}
