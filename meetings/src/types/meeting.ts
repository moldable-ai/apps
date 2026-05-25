export interface TranscriptSegment {
  id: string
  text: string
  startTime: number
  endTime: number
  recordingSessionId?: string
  speaker?: string
  speakerId?: number
  confidence?: number
  isFinal: boolean
  createdAt: Date
}

export interface RecordingSession {
  id: string
  startedAt: Date
  endedAt?: Date
  audioPath?: string
  audioMimeType?: string
}

export interface MeetingParticipant {
  name?: string
  email?: string
  responseStatus?: string
  optional?: boolean
  organizer?: boolean
  self?: boolean
}

export interface MeetingCalendarContext {
  eventId?: string
  iCalUID?: string
  title?: string
  start?: string
  end?: string
  isAllDay?: boolean
  location?: string
  link?: string
  organizer?: MeetingParticipant
  attendees?: MeetingParticipant[]
  selfResponseStatus?: string
  conferenceUrl?: string
  conferenceProvider?: string
}

export interface Meeting {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
  endedAt?: Date
  duration: number // in seconds
  segments: TranscriptSegment[]
  recordingSessions?: RecordingSession[]
  notes?: string // User's notes (markdown)
  enhancedNotes?: string // Generated structured notes (markdown)
  enhancedTemplateId?: string // Template used for the current enhanced note
  enhancedAt?: Date
  calendarContext?: MeetingCalendarContext
}

export type RecordingState = 'idle' | 'recording' | 'paused'

export interface MeetingSettings {
  saveAudio: boolean
  model: 'nova-3' | 'nova-3-medical'
  language: string
  enableDiarization: boolean
  mipOptOut: boolean
}

export const DEFAULT_SETTINGS: MeetingSettings = {
  saveAudio: false,
  model: 'nova-3',
  language: 'multi',
  enableDiarization: true,
  mipOptOut: true,
}
