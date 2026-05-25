import {
  PIANO_PRESETS as ALL_PIANO_PRESETS,
  pianoPresetById,
} from '../shared/audio'

export {
  DEFAULT_PIANO_PRESET_ID,
  PIANO_SAMPLE_BASE_URL,
  PIANO_SAMPLE_NOTES,
  pianoPresetById,
} from '../shared/audio'
export type { PianoPreset, PianoPresetParameters } from '../shared/audio'

export type PianoPresetId = string

const headerPresetIds = ['classic-grand', 'soft-grand', 'bright-grand']

export const PIANO_PRESETS = headerPresetIds.map((id) => {
  const preset = pianoPresetById(id)
  if (id === 'classic-grand') return { ...preset, name: 'Classic' }
  if (id === 'soft-grand') return { ...preset, name: 'Soft' }
  return { ...preset, name: 'Bright' }
})

export const ALL_AUDIO_PRESETS = ALL_PIANO_PRESETS
