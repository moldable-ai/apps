export interface TranscriptSegment {
  id: string
  text: string
  startTime: number
  endTime: number
  speaker?: string
  speakerId?: number
  confidence?: number
  isFinal: boolean
  createdAt: Date
}

export interface Meeting {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
  endedAt?: Date
  duration: number // in seconds
  segments: TranscriptSegment[]
  audioPath?: string // path to saved audio file
  saveAudio: boolean
  notes?: string // User's notes (markdown)
}

export type RecordingState = 'idle' | 'recording' | 'paused'

export interface MeetingSettings {
  saveAudio: boolean
  model: 'nova-2' | 'nova-3' | 'nova-3-medical'
  language: string
  enableDiarization: boolean
}

export const DEFAULT_SETTINGS: MeetingSettings = {
  saveAudio: false,
  model: 'nova-3',
  language: 'en-US',
  enableDiarization: true,
}
