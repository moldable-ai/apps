import {
  GUITAR_PRESETS as ALL_GUITAR_PRESETS,
  guitarPresetById,
} from '../shared/audio'

export { DEFAULT_GUITAR_PRESET_ID, guitarPresetById } from '../shared/audio'
export type { GuitarPreset, GuitarPresetParameters } from '../shared/audio'

export type GuitarPresetId = string

export const GUITAR_PRESETS = ALL_GUITAR_PRESETS
export const ALL_AUDIO_PRESETS = ALL_GUITAR_PRESETS
