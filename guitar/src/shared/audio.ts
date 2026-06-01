export type GuitarAudioEngine =
  | 'smplr-sfz'
  | 'smplr-soundfont'
  | 'smplr-versilian'

export type GuitarSettingControlType = 'slider' | 'select' | 'toggle'

export interface GuitarSampleSet {
  id: string
  name: string
  engine: GuitarAudioEngine
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

export interface GuitarInstrumentPack {
  id: string
  name: string
  developer: string
  status: 'installed' | 'downloadable' | 'candidate'
  engine: 'sfz' | 'soundfont' | 'versilian'
  playbackEngine: GuitarAudioEngine
  format: Array<'flac' | 'wav' | 'sfz' | 'mp3'>
  category: 'classical' | 'electric' | 'collection'
  description: string
  sourceUrl: string
  downloadUrl?: string
  downloadMethod: 'bundled' | 'direct' | 'cdn' | 'bittorrent' | 'manual-review'
  installedPath?: string
  sizeMb?: number
  copyProtection?: 'none' | 'unknown'
  redistribution: 'cleared' | 'attribution-required' | 'needs-review'
  download: {
    enabled: boolean
    strategy: 'bundled' | 'direct' | 'cdn' | 'manual-review'
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
    type: 'classical' | 'electric' | 'plucked'
    sfzPath?: string
    soundfontInstrument?: string
    soundfontKit?: 'FluidR3_GM' | 'MusyngKite' | string
    versilianInstrument?: string
    playable?: boolean
    notes?: string
  }>
}

export interface GuitarPresetParameters {
  volume: number
  decayTime: number
  velocityScale: number
  velocityCurve: 'soft' | 'balanced' | 'firm' | 'wide'
  tone: number
  room: number
  width: number
  detune: number
}

export interface GuitarPreset {
  id: string
  name: string
  family: 'grand' | 'practice' | 'cinematic' | 'band'
  description: string
  sampleSetId: string
  parameters: GuitarPresetParameters
}

export interface GuitarSettingControlBase {
  id: keyof GuitarPresetParameters
  label: string
  description: string
  type: GuitarSettingControlType
}

export interface GuitarSliderSettingControl extends GuitarSettingControlBase {
  type: 'slider'
  min: number
  max: number
  step: number
  unit?: string
}

export interface GuitarSelectSettingControl extends GuitarSettingControlBase {
  type: 'select'
  options: Array<{
    value: GuitarPresetParameters['velocityCurve']
    label: string
  }>
}

export interface GuitarToggleSettingControl extends GuitarSettingControlBase {
  type: 'toggle'
}

export type GuitarSettingControl =
  | GuitarSliderSettingControl
  | GuitarSelectSettingControl
  | GuitarToggleSettingControl

export interface GuitarAudioOptionsResponse {
  defaultPresetId: string
  instrumentPacks: GuitarInstrumentPack[]
  sampleSets: GuitarSampleSet[]
  presets: GuitarPreset[]
  controls: GuitarSettingControl[]
}

export interface GuitarSoundChoice {
  presetId?: string
  instrumentPackId?: string
  instrumentId?: string
}

export interface SongSoundSettings {
  songId: string
  suggested?: GuitarSoundChoice
  override?: GuitarSoundChoice
  createdAt: string
  updatedAt: string
}

export interface SongSoundSettingsResponse {
  settings: SongSoundSettings | null
  effective: GuitarSoundChoice
  source: 'global' | 'suggested' | 'override'
}

export interface GuitarAudioSettings {
  presetId: string
  instrumentPackId: string
  instrumentId: string
  overrides: Partial<GuitarPresetParameters>
  updatedAt: string
}

export const FREEPATS_NYLON_GUITAR_PACK_ID = 'freepats-nylon-guitar'
export const DEFAULT_GUITAR_PACK_ID = 'smplr-gm-soundfont-guitars'
export const DEFAULT_GUITAR_INSTRUMENT_ID = 'soundfont-acoustic-guitar-nylon'

export const DEFAULT_GUITAR_PRESET_ID = 'natural-guitar'

export const GUITAR_SAMPLE_SETS: GuitarSampleSet[] = []

export const GUITAR_INSTRUMENT_PACKS: GuitarInstrumentPack[] = [
  {
    id: FREEPATS_NYLON_GUITAR_PACK_ID,
    name: 'FreePats Nylon Guitar',
    developer: 'FreePats / Roberto Perez',
    status: 'downloadable',
    engine: 'sfz',
    playbackEngine: 'smplr-sfz',
    format: ['sfz', 'flac'],
    category: 'classical',
    description:
      'Spanish classical guitar sampled for FreePats; installs locally for offline playback.',
    sourceUrl: 'https://freepats.zenvoid.org/Guitar/acoustic-guitar.html',
    downloadUrl:
      'https://freepats.zenvoid.org/Guitar/SpanishClassicalGuitar/SpanishClassicalGuitar-SFZ+FLAC-20190618.7z',
    downloadMethod: 'direct',
    sizeMb: 4.5,
    copyProtection: 'none',
    redistribution: 'cleared',
    download: {
      enabled: true,
      strategy: 'direct',
      note: 'Small CC0 SFZ/FLAC archive; installs locally for offline playback.',
    },
    license: {
      name: 'CC0-1.0',
      url: 'https://creativecommons.org/publicdomain/zero/1.0/',
      attributionRequired: false,
      commercialUse: true,
      redistributionNote:
        'FreePats publishes this sound bank under the Creative Commons CC0 public domain dedication.',
    },
    attribution: {
      title: 'Spanish Classical Guitar',
      author: 'Roberto Perez / FreePats',
      text: 'Spanish classical guitar sound bank created for the FreePats project and released as CC0.',
      url: 'https://freepats.zenvoid.org/Guitar/acoustic-guitar.html',
    },
    instruments: [
      {
        id: FREEPATS_NYLON_GUITAR_PACK_ID,
        name: 'Nylon Classical',
        type: 'classical',
        sfzPath:
          'SpanishClassicalGuitar-SFZ+FLAC-20190618/SpanishClassicalGuitar-20190618.sfz',
        playable: true,
        notes:
          'Spanish classical guitar recorded with an AKG Perception 120 microphone.',
      },
    ],
  },
  {
    id: 'freepats-clean-electric-small',
    name: 'FreePats Clean Electric',
    developer: 'FreePats',
    status: 'downloadable',
    engine: 'sfz',
    playbackEngine: 'smplr-sfz',
    format: ['sfz', 'flac'],
    category: 'electric',
    description:
      'Small clean Fender-style electric guitar pack, processed through an amp/effects rack.',
    sourceUrl:
      'https://freepats.zenvoid.org/ElectricGuitar/clean-electric-guitar.html',
    downloadUrl:
      'https://freepats.zenvoid.org/ElectricGuitar/FSBS-EGuitar/EGuitarFSBS-bridge-clean-small-SFZ+FLAC-20220911.7z',
    downloadMethod: 'direct',
    sizeMb: 3,
    copyProtection: 'none',
    redistribution: 'cleared',
    download: {
      enabled: true,
      strategy: 'direct',
      note: 'Small CC0 SFZ/FLAC archive; installs locally for offline playback.',
    },
    license: {
      name: 'CC0-1.0',
      url: 'https://creativecommons.org/publicdomain/zero/1.0/',
      attributionRequired: false,
      commercialUse: true,
      redistributionNote:
        'FreePats publishes this sound bank under the Creative Commons CC0 public domain dedication.',
    },
    attribution: {
      title: 'FSBS Electric Guitar Clean #1',
      author: 'FreePats',
      text: 'Clean electric guitar sound bank released as CC0 by FreePats.',
      url: 'https://freepats.zenvoid.org/ElectricGuitar/clean-electric-guitar.html',
    },
    instruments: [
      {
        id: 'freepats-clean-electric-small',
        name: 'Clean Electric',
        type: 'electric',
        sfzPath:
          'EGuitarFSBS-bridge-clean-small-SFZ+FLAC-20220911/EGuitarFSBS-bridge-clean-small-20220911.sfz',
        playable: true,
      },
    ],
  },
  {
    id: 'freepats-jazz-electric-small',
    name: 'FreePats Jazz Electric',
    developer: 'FreePats',
    status: 'downloadable',
    engine: 'sfz',
    playbackEngine: 'smplr-sfz',
    format: ['sfz', 'flac'],
    category: 'electric',
    description:
      'Small jazz-clean electric guitar pack with a warmer bridge-pickup sound.',
    sourceUrl:
      'https://freepats.zenvoid.org/ElectricGuitar/clean-electric-guitar.html',
    downloadUrl:
      'https://freepats.zenvoid.org/ElectricGuitar/FSBS-EGuitar/EGuitarFSBS-bridge-jazz-small-SFZ+FLAC-20220911.7z',
    downloadMethod: 'direct',
    sizeMb: 2.4,
    copyProtection: 'none',
    redistribution: 'cleared',
    download: {
      enabled: true,
      strategy: 'direct',
      note: 'Small CC0 SFZ/FLAC archive; installs locally for offline playback.',
    },
    license: {
      name: 'CC0-1.0',
      url: 'https://creativecommons.org/publicdomain/zero/1.0/',
      attributionRequired: false,
      commercialUse: true,
      redistributionNote:
        'FreePats publishes this sound bank under the Creative Commons CC0 public domain dedication.',
    },
    attribution: {
      title: 'FSBS Electric Guitar Clean #2',
      author: 'FreePats',
      text: 'Jazz clean electric guitar sound bank released as CC0 by FreePats.',
      url: 'https://freepats.zenvoid.org/ElectricGuitar/clean-electric-guitar.html',
    },
    instruments: [
      {
        id: 'freepats-jazz-electric-small',
        name: 'Jazz Electric',
        type: 'electric',
        sfzPath:
          'EGuitarFSBS-bridge-jazz-small-SFZ+FLAC-20220911/EGuitarFSBS-bridge-jazz-small-20220911.sfz',
        playable: true,
      },
    ],
  },
  {
    id: 'smplr-gm-soundfont-guitars',
    name: 'smplr GM Soundfont Guitars',
    developer: 'FluidR3 GM / smplr',
    status: 'installed',
    engine: 'soundfont',
    playbackEngine: 'smplr-soundfont',
    format: ['mp3'],
    category: 'collection',
    description:
      'Compact General MIDI guitar presets loaded through smplr Soundfont for quick nylon, steel, electric, and driven tones.',
    sourceUrl: 'https://github.com/gleitz/midi-js-soundfonts',
    downloadMethod: 'cdn',
    sizeMb: 0,
    copyProtection: 'none',
    redistribution: 'attribution-required',
    download: {
      enabled: false,
      strategy: 'cdn',
      note: 'Loaded from the smplr Soundfont CDN at playback time; requires network access.',
    },
    license: {
      name: 'FluidR3_GM CC-BY 3.0',
      url: 'https://creativecommons.org/licenses/by/3.0/',
      attributionRequired: true,
      commercialUse: true,
      redistributionNote:
        'FluidR3 GM SoundFont samples are hosted through midi-js-soundfonts and require attribution.',
    },
    attribution: {
      title: 'FluidR3 GM SoundFont',
      author: 'Frank Wen / FluidSynth community, hosted by midi-js-soundfonts',
      text: 'FluidR3 GM SoundFont guitar presets are used through smplr Soundfont.',
      url: 'https://github.com/gleitz/midi-js-soundfonts',
    },
    instruments: [
      {
        id: 'soundfont-acoustic-guitar-nylon',
        name: 'GM Nylon Guitar',
        type: 'classical',
        soundfontInstrument: 'acoustic_guitar_nylon',
        soundfontKit: 'FluidR3_GM',
        playable: true,
      },
      {
        id: 'soundfont-acoustic-guitar-steel',
        name: 'GM Steel Guitar',
        type: 'classical',
        soundfontInstrument: 'acoustic_guitar_steel',
        soundfontKit: 'FluidR3_GM',
        playable: true,
      },
      {
        id: 'soundfont-electric-guitar-clean',
        name: 'GM Clean Electric',
        type: 'electric',
        soundfontInstrument: 'electric_guitar_clean',
        soundfontKit: 'FluidR3_GM',
        playable: true,
      },
      {
        id: 'soundfont-electric-guitar-jazz',
        name: 'GM Jazz Electric',
        type: 'electric',
        soundfontInstrument: 'electric_guitar_jazz',
        soundfontKit: 'FluidR3_GM',
        playable: true,
      },
      {
        id: 'soundfont-electric-guitar-muted',
        name: 'GM Muted Electric',
        type: 'electric',
        soundfontInstrument: 'electric_guitar_muted',
        soundfontKit: 'FluidR3_GM',
        playable: true,
      },
      {
        id: 'soundfont-overdriven-guitar',
        name: 'GM Overdriven',
        type: 'electric',
        soundfontInstrument: 'overdriven_guitar',
        soundfontKit: 'FluidR3_GM',
        playable: true,
      },
      {
        id: 'soundfont-distortion-guitar',
        name: 'GM Distortion',
        type: 'electric',
        soundfontInstrument: 'distortion_guitar',
        soundfontKit: 'FluidR3_GM',
        playable: true,
      },
    ],
  },
  {
    id: 'vcsl-strumstick',
    name: 'VCSL Strumstick',
    developer: 'Versilian Studios / smplr',
    status: 'installed',
    engine: 'versilian',
    playbackEngine: 'smplr-versilian',
    format: ['wav'],
    category: 'collection',
    description:
      'CC0 VCSL plucked-string instrument available through smplr; VCSL does not currently expose a classical guitar patch in this catalog.',
    sourceUrl: 'https://github.com/sgossner/VCSL',
    downloadMethod: 'cdn',
    sizeMb: 0,
    copyProtection: 'none',
    redistribution: 'cleared',
    download: {
      enabled: false,
      strategy: 'cdn',
      note: "Available through smplr's VCSL loader; CDN-loaded at playback time.",
    },
    license: {
      name: 'CC0-1.0',
      url: 'https://creativecommons.org/publicdomain/zero/1.0/',
      attributionRequired: false,
      commercialUse: true,
      redistributionNote:
        'VCSL is released under the Creative Commons CC0 public domain dedication.',
    },
    attribution: {
      title: 'Versilian Community Sample Library',
      author: 'Versilian Studios',
      text: 'VCSL Strumstick is distributed as part of the CC0 Versilian Community Sample Library.',
      url: 'https://github.com/sgossner/VCSL',
    },
    instruments: [
      {
        id: 'vcsl-strumstick',
        name: 'Strumstick',
        type: 'plucked',
        versilianInstrument: 'Chordophones/Composite Chordophones/Strumstick',
        playable: true,
      },
    ],
  },
]

export const GUITAR_PRESETS: GuitarPreset[] = [
  {
    id: DEFAULT_GUITAR_PRESET_ID,
    name: 'Natural Guitar',
    family: 'practice',
    description: 'Neutral guitar playback tuned for plucked-string samples.',
    sampleSetId: DEFAULT_GUITAR_PACK_ID,
    parameters: {
      volume: 104,
      decayTime: 0.9,
      velocityScale: 1,
      velocityCurve: 'balanced',
      tone: 0,
      room: 0.08,
      width: 0.12,
      detune: 0,
    },
  },
]

export const GUITAR_SETTING_CONTROLS: GuitarSettingControl[] = [
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

export function guitarPresetById(id: string) {
  return (
    GUITAR_PRESETS.find((preset) => preset.id === id) ??
    GUITAR_PRESETS.find((preset) => preset.id === DEFAULT_GUITAR_PRESET_ID) ??
    GUITAR_PRESETS[0]
  )
}

export function defaultGuitarAudioSettings(
  now = new Date().toISOString(),
): GuitarAudioSettings {
  return {
    presetId: DEFAULT_GUITAR_PRESET_ID,
    instrumentPackId: DEFAULT_GUITAR_PACK_ID,
    instrumentId: DEFAULT_GUITAR_INSTRUMENT_ID,
    overrides: {},
    updatedAt: now,
  }
}
