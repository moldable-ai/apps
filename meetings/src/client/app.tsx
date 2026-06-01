'use client'

import { Plus, Settings } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Button,
  isInMoldable,
  popMoldableNavigation,
  pushMoldableNavigation,
  resetMoldableNavigation,
  sendToMoldable,
  useMoldableNavigationPop,
  useWorkspace,
} from '@moldable-ai/ui'
import {
  type HostMeetingRecordingStatus,
  hostRecordingConflictsWithTask,
} from '@/lib/host-recording-status'
import { normalizeGeneratedMarkdown } from '@/lib/markdown'
import { callMoldableApp } from '@/lib/moldable-apps'
import { NativePcmMixer } from '@/lib/native-pcm-mixer'
import { DEFAULT_MEETING_TEMPLATE_ID } from '@/lib/templates'
import {
  type EnhancementStatus,
  MeetingView,
  type MeetingViewMode,
} from '@/components/meeting-view'
import {
  type CalendarEvent,
  type CalendarEventsState,
  MeetingsList,
  upcomingCalendarRange,
} from '@/components/meetings-list'
import { EmptyState, RecordingDock, SettingsModal } from '@/components'
import {
  type CaptureMode,
  useActiveMeeting,
  useAudioRecorder,
  useDeepgram,
  useMeetings,
  useSystemAudio,
} from '@/hooks'
import type {
  Meeting,
  MeetingCalendarContext,
  MeetingParticipant,
  MeetingSettings,
  RecordingSession,
  TranscriptSegment,
} from '@/types'
import { DEFAULT_SETTINGS } from '@/types'
import { v4 as uuidv4 } from 'uuid'

function calendarErrorMessage(code: string | undefined, error: unknown) {
  if (code === 'app_access_required' || code === 'app_access_denied') {
    return 'Grant calendar access to show upcoming events.'
  }

  if (code === 'target_app_not_found' || code === 'calendar_not_connected') {
    return 'Install and authorize the Calendar app first before events can be shown.'
  }

  return error instanceof Error
    ? error.message
    : 'Calendar events are unavailable.'
}

type AudioSource = 'microphone' | 'both' | 'system'
type NativeAudioSource = 'microphone' | 'system'

type AudioSourceManifestSource = {
  chunks: number
  bytes: number
  frames: number
  firstSequence?: number
  lastSequence?: number
  firstAudioAt?: string
  lastAudioAt?: string
  peakMax?: number
  rmsMax?: number
}

type AudioSourceManifest = {
  version: 1
  captureSource?: AudioSource
  nativeCaptureSessionId?: string
  sampleRate: number
  channels: number
  mixedAudio: true
  sources: Record<NativeAudioSource, AudioSourceManifestSource>
}

const RECORDING_BACKGROUND_TASK_KIND = 'meeting-recording'
const RECORDING_BACKGROUND_TASK_HEARTBEAT_MS = 10_000
const RECORDING_SESSION_LEASE_MS = 10_000
const RECORDING_SESSION_LEASE_STALE_MS = 60_000
const NATIVE_RECOVERY_REPLAY_LIMIT = 2_000

interface MeetingRecordingStartMessage {
  type: 'moldable:meeting-recording-start'
  title?: string
  provider?: string
  bundleId?: string
  detectedAt?: string
  source?: string
  sessionKey?: string
  recordingRequestId?: string
}

interface MeetingRecordingStopMessage {
  type: 'moldable:meeting-recording-stop'
  title?: string
  provider?: string
  bundleId?: string
  detectedAt?: string
  endedAt?: string
  source?: string
  reason?: string
  sessionKey?: string
  meetingId?: string
}

interface StartMeetingOptions {
  title?: string
  calendarEvent?: CalendarEvent | null
  detection?: MeetingRecordingStartMessage | null
}

function cleanString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function emptyManifestSource(): AudioSourceManifestSource {
  return {
    chunks: 0,
    bytes: 0,
    frames: 0,
  }
}

function createAudioSourceManifest(
  captureSource?: AudioSource,
): AudioSourceManifest {
  return {
    version: 1,
    captureSource,
    sampleRate: 48000,
    channels: 1,
    mixedAudio: true,
    sources: {
      microphone: emptyManifestSource(),
      system: emptyManifestSource(),
    },
  }
}

function makeHostRecordingStatusRequestId() {
  return `meeting-recording-status-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function requestHostMeetingRecordingStatus(filters?: {
  taskId?: string | null
  recordingRequestId?: string | null
  detectionSessionKey?: string | null
  sessionKey?: string | null
}) {
  return new Promise<HostMeetingRecordingStatus | null>((resolve, reject) => {
    if (!isInMoldable()) {
      resolve(null)
      return
    }

    const requestId = makeHostRecordingStatusRequestId()
    const timeout = window.setTimeout(() => {
      window.removeEventListener('message', handleResponse)
      reject(new Error('Meeting recording status request timed out.'))
    }, 5_000)

    function handleResponse(event: MessageEvent) {
      if (event.data?.type !== 'moldable:meeting-recording-status-response') {
        return
      }
      if (event.data?.requestId !== requestId) return

      window.clearTimeout(timeout)
      window.removeEventListener('message', handleResponse)

      if (event.data?.ok !== true) {
        reject(
          new Error(
            event.data?.error?.message ||
              'Failed to read host recording status.',
          ),
        )
        return
      }

      const status = event.data?.result?.status
      resolve(status && typeof status === 'object' ? status : null)
    }

    window.addEventListener('message', handleResponse)
    window.parent.postMessage(
      {
        type: 'moldable:meeting-recording-status-request',
        requestId,
        taskId: filters?.taskId ?? undefined,
        recordingRequestId: filters?.recordingRequestId ?? undefined,
        detectionSessionKey: filters?.detectionSessionKey ?? undefined,
        sessionKey: filters?.sessionKey ?? undefined,
      },
      '*',
    )
  })
}

async function hasConflictingHostRecording(allowedTaskId?: string | null) {
  try {
    const status = await requestHostMeetingRecordingStatus()
    return hostRecordingConflictsWithTask(status, allowedTaskId)
  } catch (error) {
    console.warn('[Meetings] Failed to check host recording state:', error)
    return false
  }
}

function hostRecordingStatusTone(
  status: HostMeetingRecordingStatus,
): 'loading' | 'warning' | 'danger' | null {
  const message =
    `${status.readinessLine ?? status.statusLine ?? ''}`.toLowerCase()
  const transcriptionState = status.transcription?.state
  const captureState = status.capture?.actualState

  if (captureState === 'error' || message.includes('audio error')) {
    return 'danger'
  }
  if (
    transcriptionState === 'connecting' ||
    transcriptionState === 'reconnecting' ||
    captureState === 'restarting' ||
    message.includes('connecting') ||
    message.includes('reconnecting') ||
    message.includes('restarting')
  ) {
    return 'loading'
  }
  if (
    transcriptionState === 'error' ||
    transcriptionState === 'disconnected' ||
    captureState === 'degraded' ||
    status.transcription?.issue ||
    message.includes('paused') ||
    message.includes('unavailable') ||
    message.includes('stale') ||
    message.includes('degraded')
  ) {
    return 'warning'
  }

  return null
}

function normalizeParticipant(
  attendee:
    | NonNullable<CalendarEvent['attendees']>[number]
    | NonNullable<CalendarEvent['organizer']>
    | undefined
    | null,
): MeetingParticipant | undefined {
  if (!attendee) return undefined

  const name = cleanString(
    'displayName' in attendee ? attendee.displayName : undefined,
  )
  const email = cleanString('email' in attendee ? attendee.email : undefined)

  if (!name && !email) return undefined

  return {
    name,
    email,
    responseStatus:
      'responseStatus' in attendee
        ? cleanString(attendee.responseStatus)
        : undefined,
    optional:
      'optional' in attendee && typeof attendee.optional === 'boolean'
        ? attendee.optional
        : undefined,
    organizer:
      'organizer' in attendee && typeof attendee.organizer === 'boolean'
        ? attendee.organizer
        : undefined,
    self:
      'self' in attendee && typeof attendee.self === 'boolean'
        ? attendee.self
        : undefined,
  }
}

function calendarEventToMeetingContext(
  event: CalendarEvent,
): MeetingCalendarContext {
  const organizer = normalizeParticipant(event.organizer)
  const attendees = event.attendees
    ?.map((attendee) => normalizeParticipant(attendee))
    .filter((attendee): attendee is MeetingParticipant => Boolean(attendee))

  return {
    eventId: cleanString(event.id),
    iCalUID: cleanString(event.iCalUID),
    title: cleanString(event.title),
    start: cleanString(event.start),
    end: cleanString(event.end),
    isAllDay: event.isAllDay,
    location: cleanString(event.location),
    link: cleanString(event.link),
    organizer,
    attendees,
    selfResponseStatus: cleanString(event.selfResponseStatus),
    conferenceUrl: cleanString(event.conferenceUrl),
    conferenceProvider: cleanString(event.conferenceProvider),
  }
}

function isStartMeetingOptions(value: unknown): value is StartMeetingOptions {
  return Boolean(
    value &&
      typeof value === 'object' &&
      ('title' in value || 'calendarEvent' in value || 'detection' in value),
  )
}

function eventDate(value: string | undefined): Date | null {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function meetingDetectionDate(message?: MeetingRecordingStartMessage | null) {
  if (!message?.detectedAt) return new Date()
  const date = new Date(message.detectedAt)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function meetingTitleTokens(title: string | undefined) {
  return new Set(
    (title ?? '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter(
        (token) =>
          token.length > 2 &&
          ![
            'call',
            'detected',
            'google',
            'meet',
            'meeting',
            'microsoft',
            'teams',
            'video',
            'webex',
            'zoom',
          ].includes(token),
      ),
  )
}

function providerNeedles(provider: string | undefined) {
  const normalized = provider?.toLowerCase() ?? ''
  if (normalized.includes('zoom')) return ['zoom', 'zoom.us']
  if (normalized.includes('meet')) return ['meet.google', 'google meet']
  if (normalized.includes('teams')) return ['teams.microsoft', 'teams']
  if (normalized.includes('webex')) return ['webex']
  return normalized ? [normalized] : []
}

function scoreCalendarEventMatch(
  event: CalendarEvent,
  detection: MeetingRecordingStartMessage | null | undefined,
  detectedAt: Date,
) {
  const start = eventDate(event.start)
  const end = eventDate(event.end)
  if (!start || !end) return 0

  const detectedTime = detectedAt.getTime()
  const startTime = start.getTime()
  const endTime = end.getTime()
  const tenMinutes = 10 * 60 * 1000
  const fifteenMinutes = 15 * 60 * 1000
  let score = 0

  if (detectedTime >= startTime && detectedTime <= endTime) {
    score += 100
  } else if (
    detectedTime >= startTime - tenMinutes &&
    detectedTime <= endTime + fifteenMinutes
  ) {
    score += 70
  } else if (
    detectedTime < startTime &&
    startTime - detectedTime <= 30 * 60 * 1000
  ) {
    score += 30
  } else {
    return 0
  }

  const eventText = [
    event.title,
    event.location,
    event.link,
    event.conferenceUrl,
    event.conferenceProvider,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  for (const needle of providerNeedles(detection?.provider)) {
    if (eventText.includes(needle)) {
      score += 18
      break
    }
  }

  const detectionTokens = meetingTitleTokens(detection?.title)
  const eventTokens = meetingTitleTokens(event.title)
  let titleMatches = 0
  for (const token of detectionTokens) {
    if (eventTokens.has(token)) titleMatches += 1
  }
  score += Math.min(titleMatches * 8, 24)

  return score
}

function findMatchingCalendarEvent(
  events: CalendarEvent[],
  detection?: MeetingRecordingStartMessage | null,
) {
  const detectedAt = meetingDetectionDate(detection)
  const matches = events
    .map((event) => ({
      event,
      score: scoreCalendarEventMatch(event, detection, detectedAt),
    }))
    .filter((match) => match.score >= 70)
    .sort((a, b) => b.score - a.score)

  return matches[0]?.event ?? null
}

function getOpenRecordingSession(meeting: Meeting) {
  return [...(meeting.recordingSessions ?? [])]
    .reverse()
    .find((session) => !session.endedAt)
}

function recordingSessionLeaseMs(session: RecordingSession) {
  const value = session.leaseUpdatedAt ?? session.startedAt
  const time =
    value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function isRecordingSessionLeaseFresh(session: RecordingSession) {
  const leaseMs = recordingSessionLeaseMs(session)
  return leaseMs > 0 && Date.now() - leaseMs <= RECORDING_SESSION_LEASE_STALE_MS
}

function captureSourceToNativeMode(
  source: RecordingSession['captureSource'],
): CaptureMode | null {
  if (source === 'both') return 'systemMicrophone'
  if (source === 'system') return 'systemAudio'
  return null
}

function findRecoverableRecording(meetings: Meeting[]) {
  return meetings
    .map((candidate) => ({
      meeting: candidate,
      session: getOpenRecordingSession(candidate),
    }))
    .filter(
      (
        candidate,
      ): candidate is { meeting: Meeting; session: RecordingSession } =>
        Boolean(candidate.session && !candidate.meeting.endedAt),
    )
    .sort(
      (a, b) =>
        recordingSessionLeaseMs(b.session) - recordingSessionLeaseMs(a.session),
    )[0]
}

export default function MeetingsPage() {
  // Workspace
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  // State
  const [settings, setSettings] = useState<MeetingSettings | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  // Load settings on mount or workspace change
  useEffect(() => {
    fetchWithWorkspace('/api/settings')
      .then((res) => res.json())
      .then((loadedSettings: Partial<MeetingSettings>) =>
        setSettings({
          ...DEFAULT_SETTINGS,
          ...loadedSettings,
          mipOptOut: loadedSettings.mipOptOut ?? true,
        }),
      )
      .catch(() => setSettings(DEFAULT_SETTINGS))
  }, [workspaceId, fetchWithWorkspace])

  // Use default settings until loaded
  const currentSettings = settings ?? DEFAULT_SETTINGS

  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [audioSource, setAudioSource] = useState<AudioSource>('microphone')
  const [enhancement, setEnhancement] = useState<EnhancementStatus | null>(null)
  const [preferredDetailView, setPreferredDetailView] =
    useState<MeetingViewMode | null>(null)
  const [currentInterim, setCurrentInterim] = useState<string | null>(null)
  const [isMeetingPaused, setIsMeetingPaused] = useState(false)
  const [isAppendingTranscript, setIsAppendingTranscript] = useState(false)
  const [isRecordingStartPending, setIsRecordingStartPending] = useState(false)
  const [hostRecordingStatus, setHostRecordingStatus] =
    useState<HostMeetingRecordingStatus | null>(null)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventsState>({
    status: 'loading',
    events: [],
  })
  const enhancementTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const activeRecordingSessionRef = useRef<RecordingSession | null>(null)
  const activeMeetingIdRef = useRef<string | null>(null)
  const audioStreamingEnabledRef = useRef(false)
  const activeDurationBaseRef = useRef(0)
  const audioPersistQueueRef = useRef<Promise<void>>(Promise.resolve())
  const activeAudioContentTypeRef = useRef<string | null>(null)
  const calendarLoadIdRef = useRef(0)
  const activeCaptureSourceRef = useRef<AudioSource | null>(null)
  const previousSystemCapturingRef = useRef(false)
  const appendTranscriptActivatedAtRef = useRef<number | null>(null)
  const nativeCaptureStartedAtRef = useRef<number | null>(null)
  const nativeDurationIntervalRef = useRef<ReturnType<
    typeof setInterval
  > | null>(null)
  const recordingStartInFlightRef = useRef(false)
  const activeDetectionSessionKeyRef = useRef<string | null>(null)
  const activeRecordingRequestIdRef = useRef<string | null>(null)
  const detectedStopInFlightRef = useRef(false)
  const hasLoggedFirstNativeAudioChunkRef = useRef(false)
  const recordingBackgroundTaskIdRef = useRef<string | null>(null)
  const expectedNativeStopReasonRef = useRef<string | null>(null)
  const activeNativeSequenceRef = useRef<number | null>(null)
  const activeAudioSourceManifestRef = useRef<AudioSourceManifest | null>(null)
  const activeAudioSourceContentTypesRef = useRef<
    Partial<Record<NativeAudioSource, string>>
  >({})
  const recordingRecoveryAttemptedRef = useRef(false)
  const nativePcmMixerRef = useRef(new NativePcmMixer())
  const deepgramSendAudioRef = useRef<
    ((data: ArrayBuffer | Blob) => void) | null
  >(null)

  const startRecordingBackgroundTask = useCallback(
    (
      nextMeeting: Meeting,
      acknowledgement?: {
        recordingRequestId?: string
        detectionSessionKey?: string
      },
    ) => {
      const taskId = `${RECORDING_BACKGROUND_TASK_KIND}:${nextMeeting.id}`
      recordingBackgroundTaskIdRef.current = taskId
      sendToMoldable({
        type: 'moldable:background-task-start',
        id: taskId,
        kind: RECORDING_BACKGROUND_TASK_KIND,
        title: nextMeeting.title,
        meetingId: nextMeeting.id,
        startedAt: new Date().toISOString(),
        recordingRequestId: acknowledgement?.recordingRequestId,
        detectionSessionKey: acknowledgement?.detectionSessionKey,
      })
    },
    [],
  )

  const endRecordingBackgroundTask = useCallback((meetingId?: string) => {
    const fallbackTaskId = meetingId
      ? `${RECORDING_BACKGROUND_TASK_KIND}:${meetingId}`
      : null
    const taskId = recordingBackgroundTaskIdRef.current ?? fallbackTaskId
    if (!taskId) return

    sendToMoldable({
      type: 'moldable:background-task-end',
      id: taskId,
      kind: RECORDING_BACKGROUND_TASK_KIND,
    })
    recordingBackgroundTaskIdRef.current = null
  }, [])

  const closeSelectedMeeting = useCallback((sync: 'pop' | 'none' = 'pop') => {
    if (sync === 'pop') popMoldableNavigation()
    setSelectedMeeting(null)
    setPreferredDetailView(null)
  }, [])

  const openSelectedMeeting = useCallback(
    (
      nextMeeting: Meeting,
      preferredView: MeetingViewMode | null = null,
      sync: 'push' | 'none' = 'push',
    ) => {
      if (sync === 'push') {
        pushMoldableNavigation({
          id: `meeting:${nextMeeting.id}`,
          title: nextMeeting.title,
        })
      }
      setSelectedMeeting(nextMeeting)
      setPreferredDetailView(preferredView)
    },
    [],
  )

  useEffect(() => {
    resetMoldableNavigation()
  }, [])

  useMoldableNavigationPop(() => {
    if (selectedMeeting) closeSelectedMeeting('none')
  })

  // Hooks
  const {
    meetings,
    isLoading: meetingsLoading,
    addMeeting,
    updateMeeting,
    deleteMeeting,
  } = useMeetings()
  const {
    meeting,
    startMeeting,
    addSegment,
    updateDuration,
    updateActiveMeeting,
    clearMeeting,
  } = useActiveMeeting()

  useEffect(() => {
    return () => {
      enhancementTimersRef.current.forEach((timer) => clearTimeout(timer))
      enhancementTimersRef.current = []
    }
  }, [])

  // Handle settings changes
  const handleSettingsChange = useCallback(
    (newSettings: MeetingSettings) => {
      setSettings(newSettings)
      fetchWithWorkspace('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      })
    },
    [fetchWithWorkspace],
  )

  const createRecordingSession = useCallback((): RecordingSession => {
    activeNativeSequenceRef.current = null
    const session = {
      id: uuidv4(),
      startedAt: new Date(),
      leaseUpdatedAt: new Date(),
    }
    activeRecordingSessionRef.current = session
    return session
  }, [])

  const upsertRecordingSession = useCallback(
    (targetMeeting: Meeting, session: RecordingSession): Meeting => {
      const sessions = targetMeeting.recordingSessions ?? []
      const nextSessions = sessions.some((item) => item.id === session.id)
        ? sessions.map((item) => (item.id === session.id ? session : item))
        : [...sessions, session]

      return {
        ...targetMeeting,
        recordingSessions: nextSessions,
        updatedAt: new Date(),
      }
    },
    [],
  )

  const finishActiveRecordingSession = useCallback(
    (targetMeeting: Meeting | null): Meeting | null => {
      const activeSession = activeRecordingSessionRef.current
      if (!targetMeeting || !activeSession) return targetMeeting

      const endedAt = new Date()
      const finishedSession = {
        ...activeSession,
        endedAt,
        leaseUpdatedAt: endedAt,
        lastNativeSequence:
          activeNativeSequenceRef.current ?? activeSession.lastNativeSequence,
      }

      activeRecordingSessionRef.current = null
      activeNativeSequenceRef.current = null
      return upsertRecordingSession(targetMeeting, finishedSession)
    },
    [upsertRecordingSession],
  )

  const updateActiveRecordingSessionLease = useCallback(
    (targetMeeting: Meeting | null): Meeting | null => {
      const activeSession = activeRecordingSessionRef.current
      if (!targetMeeting || !activeSession) return targetMeeting

      const leasedSession: RecordingSession = {
        ...activeSession,
        captureSource:
          activeCaptureSourceRef.current ?? activeSession.captureSource,
        lastNativeSequence:
          activeNativeSequenceRef.current ?? activeSession.lastNativeSequence,
        leaseUpdatedAt: new Date(),
      }

      activeRecordingSessionRef.current = leasedSession
      return upsertRecordingSession(targetMeeting, leasedSession)
    },
    [upsertRecordingSession],
  )

  useEffect(() => {
    if (!meeting || isMeetingPaused || !activeRecordingSessionRef.current) {
      return
    }

    const persistLease = () => {
      const leasedMeeting = updateActiveRecordingSessionLease(meeting)
      if (!leasedMeeting) return
      updateActiveMeeting(leasedMeeting)
      updateMeeting(leasedMeeting)
    }

    const interval = window.setInterval(
      persistLease,
      RECORDING_SESSION_LEASE_MS,
    )

    return () => window.clearInterval(interval)
  }, [
    isMeetingPaused,
    meeting,
    updateActiveMeeting,
    updateActiveRecordingSessionLease,
    updateMeeting,
  ])

  const resetAudioSessionPersistence = useCallback(() => {
    activeAudioContentTypeRef.current = null
    activeAudioSourceManifestRef.current = null
    activeAudioSourceContentTypesRef.current = {}
  }, [])

  const resetAudioSourceManifest = useCallback(
    (captureSource?: AudioSource) => {
      activeAudioSourceManifestRef.current =
        createAudioSourceManifest(captureSource)
    },
    [],
  )

  const updateAudioSourceManifest = useCallback(
    (event: {
      source: NativeAudioSource
      data: ArrayBuffer
      sequence: number
      frameCount?: number
      peak?: number | null
      rms?: number | null
      sessionId?: string
    }) => {
      const manifest = activeAudioSourceManifestRef.current
      if (!manifest) return

      manifest.captureSource =
        activeCaptureSourceRef.current ?? manifest.captureSource
      manifest.nativeCaptureSessionId =
        event.sessionId ?? manifest.nativeCaptureSessionId

      const source = manifest.sources[event.source]
      source.chunks += 1
      source.bytes += event.data.byteLength
      source.frames += event.frameCount ?? Math.floor(event.data.byteLength / 2)
      source.firstSequence ??= event.sequence
      source.lastSequence = event.sequence

      const now = new Date().toISOString()
      source.firstAudioAt ??= now
      source.lastAudioAt = now

      if (typeof event.peak === 'number') {
        source.peakMax = Math.max(source.peakMax ?? 0, event.peak)
      }
      if (typeof event.rms === 'number') {
        source.rmsMax = Math.max(source.rmsMax ?? 0, event.rms)
      }
    },
    [],
  )

  const attachAudioToRecordingSession = useCallback(
    (
      targetMeeting: Meeting,
      sessionId: string,
      audioPath: string,
      audioMimeType: string,
      audioSourceManifestPath?: string,
      audioSources?: RecordingSession['audioSources'],
    ): Meeting => ({
      ...targetMeeting,
      recordingSessions: targetMeeting.recordingSessions?.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              audioPath,
              audioMimeType,
              audioSourceManifestPath:
                audioSourceManifestPath ?? session.audioSourceManifestPath,
              audioSources: {
                ...session.audioSources,
                ...audioSources,
              },
            }
          : session,
      ),
      updatedAt: new Date(),
    }),
    [],
  )

  const enqueueAudioChunkPersist = useCallback(
    async (
      meetingId: string,
      sessionId: string,
      chunk: Blob | ArrayBuffer,
      contentType: string,
    ) => {
      if (!currentSettings.saveAudio) return

      activeAudioContentTypeRef.current = contentType
      const body =
        chunk instanceof Blob ? chunk : new Blob([chunk], { type: contentType })

      audioPersistQueueRef.current = audioPersistQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (body.size === 0) return
          const response = await fetchWithWorkspace(
            `/api/meetings/${meetingId}/audio/${sessionId}/chunk`,
            {
              method: 'POST',
              headers: { 'content-type': contentType },
              body,
            },
          )

          if (!response.ok) {
            throw new Error(`Audio chunk upload failed: ${response.status}`)
          }
        })
        .catch((error) => {
          console.error('Failed to persist meeting audio chunk:', error)
        })
    },
    [currentSettings.saveAudio, fetchWithWorkspace],
  )

  const enqueueAudioSourceChunkPersist = useCallback(
    async (
      meetingId: string,
      sessionId: string,
      source: NativeAudioSource,
      chunk: ArrayBuffer,
      contentType: string,
    ) => {
      if (!currentSettings.saveAudio) return

      activeAudioSourceContentTypesRef.current = {
        ...activeAudioSourceContentTypesRef.current,
        [source]: contentType,
      }
      const body = new Blob([chunk], { type: contentType })

      audioPersistQueueRef.current = audioPersistQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (body.size === 0) return
          const response = await fetchWithWorkspace(
            `/api/meetings/${meetingId}/audio/${sessionId}/source/${source}/chunk`,
            {
              method: 'POST',
              headers: { 'content-type': contentType },
              body,
            },
          )

          if (!response.ok) {
            throw new Error(
              `Source audio chunk upload failed: ${response.status}`,
            )
          }
        })
        .catch((error) => {
          console.error('Failed to persist meeting source audio chunk:', error)
        })
    },
    [currentSettings.saveAudio, fetchWithWorkspace],
  )

  const finalizeSessionAudio = useCallback(
    async (
      meetingId: string,
      sessionId: string,
    ): Promise<{
      audioPath: string
      audioMimeType: string
      audioSourceManifestPath?: string
      audioSources?: RecordingSession['audioSources']
    } | null> => {
      if (!currentSettings.saveAudio || !activeAudioContentTypeRef.current) {
        return null
      }

      await audioPersistQueueRef.current.catch(() => undefined)

      try {
        const response = await fetchWithWorkspace(
          `/api/meetings/${meetingId}/audio/${sessionId}/finalize`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contentType: activeAudioContentTypeRef.current,
              sourceManifest: activeAudioSourceManifestRef.current,
              sourceContentTypes: activeAudioSourceContentTypesRef.current,
            }),
          },
        )

        if (response.status === 404) return null
        if (!response.ok) {
          throw new Error(`Audio finalize failed: ${response.status}`)
        }

        return (await response.json()) as {
          audioPath: string
          audioMimeType: string
          audioSourceManifestPath?: string
          audioSources?: RecordingSession['audioSources']
        }
      } catch (error) {
        console.error('Failed to finalize meeting audio:', error)
        return null
      }
    },
    [currentSettings.saveAudio, fetchWithWorkspace],
  )

  const stopNativeDurationTimer = useCallback(() => {
    if (nativeDurationIntervalRef.current) {
      clearInterval(nativeDurationIntervalRef.current)
      nativeDurationIntervalRef.current = null
    }
    nativeCaptureStartedAtRef.current = null
  }, [])

  const startNativeDurationTimer = useCallback(() => {
    if (nativeDurationIntervalRef.current) return

    nativeCaptureStartedAtRef.current = Date.now()
    nativeDurationIntervalRef.current = setInterval(() => {
      if (nativeCaptureStartedAtRef.current === null) return
      updateDuration(
        activeDurationBaseRef.current +
          (Date.now() - nativeCaptureStartedAtRef.current) / 1000,
      )
    }, 100)
  }, [updateDuration])

  const sendNativePcmBuffer = useCallback(
    (buffer: ArrayBuffer, options: { force?: boolean } = {}) => {
      if (!audioStreamingEnabledRef.current && !options.force) return

      if (activeRecordingSessionRef.current && activeMeetingIdRef.current) {
        void enqueueAudioChunkPersist(
          activeMeetingIdRef.current,
          activeRecordingSessionRef.current.id,
          buffer.slice(0),
          'audio/l16;rate=48000;channels=1',
        )
      }

      deepgramSendAudioRef.current?.(buffer)
    },
    [enqueueAudioChunkPersist],
  )

  const flushNativePcmMixer = useCallback(() => {
    for (const buffer of nativePcmMixerRef.current.flush()) {
      sendNativePcmBuffer(buffer, { force: true })
    }
  }, [sendNativePcmBuffer])

  // Handle new segments from Deepgram
  const handleSegment = useCallback(
    (segment: TranscriptSegment) => {
      setCurrentInterim(null)
      addSegment({
        ...segment,
        recordingSessionId: activeRecordingSessionRef.current?.id,
      })
    },
    [addSegment],
  )

  // Deepgram hook
  const deepgram = useDeepgram({
    settings: currentSettings,
    onSegment: handleSegment,
    onInterim: setCurrentInterim,
    onError: (error) => console.warn('Deepgram transcription issue:', error),
  })

  useEffect(() => {
    deepgramSendAudioRef.current = deepgram.sendAudio
  }, [deepgram.sendAudio])

  useEffect(() => {
    const interval = window.setInterval(() => {
      const taskId = recordingBackgroundTaskIdRef.current
      if (!taskId) return

      const queuedChunks = deepgram.diagnostics.spool.queuedChunks
      const droppedChunks = deepgram.diagnostics.spool.droppedChunks
      const replayedChunks = deepgram.diagnostics.spool.replayedChunks
      const statusLine =
        deepgram.state === 'connected'
          ? 'Recording; transcript connected'
          : deepgram.state === 'connecting'
            ? 'Recording; connecting transcript'
            : deepgram.state === 'reconnecting'
              ? queuedChunks > 0
                ? `Recording; reconnecting transcript (${queuedChunks} chunks buffered)`
                : droppedChunks > 0
                  ? `Recording; reconnecting transcript (${droppedChunks} chunks dropped)`
                  : 'Recording; reconnecting transcript'
              : deepgram.issue?.code === 'deepgram_reconnect_exhausted'
                ? 'Recording; transcript paused'
                : deepgram.issue
                  ? 'Recording; transcript unavailable'
                  : 'Recording'

      sendToMoldable({
        type: 'moldable:background-task-heartbeat',
        id: taskId,
        kind: RECORDING_BACKGROUND_TASK_KIND,
        statusLine,
        transcription: {
          provider: deepgram.diagnostics.provider,
          state: deepgram.state,
          streamMode: 'mixed',
          issue: deepgram.issue?.code ?? null,
          connectionId: deepgram.diagnostics.connectionId,
          connectionGeneration: deepgram.diagnostics.connectionGeneration,
          reconnectAttempts: deepgram.diagnostics.reconnectAttempts,
          maxReconnectAttempts: deepgram.diagnostics.maxReconnectAttempts,
          sentChunks: deepgram.diagnostics.sentChunks,
          queuedChunks,
          droppedChunks,
          replayedChunks,
        },
      })
    }, RECORDING_BACKGROUND_TASK_HEARTBEAT_MS)

    return () => window.clearInterval(interval)
  }, [deepgram.diagnostics, deepgram.issue, deepgram.state])

  // Native audio hook (for Moldable desktop system audio + AudioUnit microphone)
  const systemAudio = useSystemAudio({
    onAudioData: (event) => {
      activeNativeSequenceRef.current = Math.max(
        activeNativeSequenceRef.current ?? 0,
        event.sequence,
      )
      if (activeRecordingSessionRef.current) {
        activeRecordingSessionRef.current = {
          ...activeRecordingSessionRef.current,
          nativeCaptureSessionId:
            event.sessionId ??
            activeRecordingSessionRef.current.nativeCaptureSessionId,
          lastNativeSequence: activeNativeSequenceRef.current,
        }
      }

      if (!hasLoggedFirstNativeAudioChunkRef.current) {
        hasLoggedFirstNativeAudioChunkRef.current = true
        console.log('[Meetings] Received first native audio chunk', {
          byteLength: event.data.byteLength,
          source: event.source,
          peak: event.peak,
          rms: event.rms,
          meetingId: activeMeetingIdRef.current,
          sessionId: activeRecordingSessionRef.current?.id ?? null,
          activeCaptureSource: activeCaptureSourceRef.current,
          audioStreamingEnabled: audioStreamingEnabledRef.current,
        })
      }
      if (!audioStreamingEnabledRef.current) return

      updateAudioSourceManifest(event)
      if (activeRecordingSessionRef.current && activeMeetingIdRef.current) {
        void enqueueAudioSourceChunkPersist(
          activeMeetingIdRef.current,
          activeRecordingSessionRef.current.id,
          event.source,
          event.data.slice(0),
          'audio/l16;rate=48000;channels=1',
        )
      }

      const outputBuffers =
        activeCaptureSourceRef.current === 'both'
          ? nativePcmMixerRef.current.push(event)
          : [event.data]

      for (const outputBuffer of outputBuffers) {
        sendNativePcmBuffer(outputBuffer)
      }
    },
    onError: (error: Error) =>
      console.error('[Meetings] System audio error:', error, {
        meetingId: activeMeetingIdRef.current,
        sessionId: activeRecordingSessionRef.current?.id ?? null,
        activeCaptureSource: activeCaptureSourceRef.current,
        audioStreamingEnabled: audioStreamingEnabledRef.current,
      }),
    onStateChange: (isCapturing: boolean) => {
      console.log('[Meetings] System audio capture state changed', {
        isCapturing,
        meetingId: activeMeetingIdRef.current,
        sessionId: activeRecordingSessionRef.current?.id ?? null,
        activeCaptureSource: activeCaptureSourceRef.current,
        audioStreamingEnabled: audioStreamingEnabledRef.current,
      })
      if (isCapturing) {
        startNativeDurationTimer()
        return
      }
      stopNativeDurationTimer()
    },
  })

  // Audio recorder hook (for browser microphone)
  const audioRecorder = useAudioRecorder({
    onDataAvailable: async (blob) => {
      if (activeRecordingSessionRef.current && activeMeetingIdRef.current) {
        void enqueueAudioChunkPersist(
          activeMeetingIdRef.current,
          activeRecordingSessionRef.current.id,
          blob,
          blob.type || 'audio/webm',
        )
      }

      if (!audioStreamingEnabledRef.current) return
      const buffer = await blob.arrayBuffer()
      if (!audioStreamingEnabledRef.current) return
      deepgram.sendAudio(buffer)
    },
    onStateChange: (state) => {
      updateDuration(activeDurationBaseRef.current + state.duration)
    },
    keepChunks: false,
    onError: (error) => console.error('Recorder error:', error),
  })

  const startPreferredCapture = useCallback(
    async (selectedSource: AudioSource, options: { resume?: boolean } = {}) => {
      const canUseOrRequestNativeBlendedCapture =
        systemAudio.canCaptureSystemMicrophone ||
        (systemAudio.canRequestSystemAudioPermission &&
          systemAudio.capabilities?.canCaptureMicrophone !== false)
      const canUseOrRequestSystemOnlyCapture =
        systemAudio.canCaptureSystemAudio ||
        systemAudio.canRequestSystemAudioPermission
      const useBlendedCapture =
        selectedSource === 'both' && canUseOrRequestNativeBlendedCapture
      const useSystemOnlyNativeCapture =
        selectedSource === 'system' && canUseOrRequestSystemOnlyCapture

      if (useBlendedCapture) {
        expectedNativeStopReasonRef.current = null
        console.log(
          '[Meetings] Starting native systemMicrophone capture with system audio + AudioUnit microphone',
        )
        audioStreamingEnabledRef.current = false
        hasLoggedFirstNativeAudioChunkRef.current = false
        nativePcmMixerRef.current.reset()
        stopNativeDurationTimer()
        activeCaptureSourceRef.current = 'both'
        resetAudioSourceManifest('both')

        const started = await systemAudio.start('systemMicrophone')
        if (started) {
          audioStreamingEnabledRef.current = true
          void deepgram.connect('linear16')
          return 'both'
        }

        console.warn(
          '[Meetings] Native blended capture failed, falling back to microphone-only capture',
        )
        expectedNativeStopReasonRef.current = 'native-blended-start-failed'
        await systemAudio.stop('native-blended-start-failed')
        nativePcmMixerRef.current.reset()
        activeCaptureSourceRef.current = null
        activeAudioSourceManifestRef.current = null
        await deepgram.disconnect({ drainFinal: false })
        audioStreamingEnabledRef.current = false
      }

      if (useSystemOnlyNativeCapture) {
        expectedNativeStopReasonRef.current = null
        console.log(`[Meetings] Starting ${selectedSource} native capture`)
        audioStreamingEnabledRef.current = false
        hasLoggedFirstNativeAudioChunkRef.current = false
        nativePcmMixerRef.current.reset()
        stopNativeDurationTimer()
        resetAudioSourceManifest(selectedSource)

        const started = await systemAudio.start('systemAudio')
        if (started) {
          activeCaptureSourceRef.current = selectedSource
          audioStreamingEnabledRef.current = true
          void deepgram.connect('linear16')
          return selectedSource
        }

        console.warn(
          `[Meetings] Native ${selectedSource} capture failed, falling back to microphone`,
        )
        expectedNativeStopReasonRef.current = 'native-system-start-failed'
        await systemAudio.stop('native-system-start-failed')
        activeAudioSourceManifestRef.current = null
        audioStreamingEnabledRef.current = false
        await deepgram.disconnect({ drainFinal: false })
      }

      console.log('[Meetings] Starting with microphone capture')
      audioStreamingEnabledRef.current = true
      nativePcmMixerRef.current.reset()
      void deepgram.connect('webm')
      const started = options.resume
        ? await audioRecorder.resume(true)
        : await audioRecorder.start()

      if (!started) {
        activeCaptureSourceRef.current = null
        await deepgram.disconnect({ drainFinal: false })
        audioStreamingEnabledRef.current = false
        return null
      }

      activeCaptureSourceRef.current = 'microphone'
      return 'microphone'
    },
    [
      audioRecorder,
      deepgram,
      resetAudioSourceManifest,
      stopNativeDurationTimer,
      systemAudio,
    ],
  )

  const stopActiveCapture = useCallback(
    async (options: { pause?: boolean; reason?: string } = {}) => {
      const activeSource = activeCaptureSourceRef.current
      const usingNativeCapture =
        activeSource === 'both' || activeSource === 'system'
      const stopContext = {
        reason: options.reason ?? 'unspecified',
        pause: options.pause ?? false,
        activeSource,
        meetingId: activeMeetingIdRef.current,
        sessionId: activeRecordingSessionRef.current?.id ?? null,
        isMeetingPaused,
        isAppendingTranscript,
        deepgramState: deepgram.state,
        deepgramIssue: deepgram.issue?.code ?? null,
        audioStreamingEnabled: audioStreamingEnabledRef.current,
        stack:
          new Error().stack
            ?.split('\n')
            .slice(1, 5)
            .map((line) => line.trim())
            .join(' | ') ?? 'no-stack',
      }

      console.log('[Meetings] stopActiveCapture', {
        ...stopContext,
      })

      if (activeSource === 'both') {
        flushNativePcmMixer()
        expectedNativeStopReasonRef.current = stopContext.reason
        await systemAudio.stop(JSON.stringify(stopContext))
      } else if (usingNativeCapture) {
        flushNativePcmMixer()
        expectedNativeStopReasonRef.current = stopContext.reason
        await systemAudio.stop(JSON.stringify(stopContext))
      } else if (options.pause) {
        await audioRecorder.pause()
      } else {
        await audioRecorder.stop()
      }

      activeCaptureSourceRef.current = null
      nativePcmMixerRef.current.reset()
      stopNativeDurationTimer()
    },
    [
      audioRecorder,
      deepgram.issue?.code,
      deepgram.state,
      flushNativePcmMixer,
      isAppendingTranscript,
      isMeetingPaused,
      stopNativeDurationTimer,
      systemAudio,
    ],
  )

  useEffect(() => {
    return () => {
      stopNativeDurationTimer()
    }
  }, [stopNativeDurationTimer])

  // Prefer the 2026-04-26 blended capture path: it was the last known-good
  // default for capturing both local speech and meeting participant audio.
  useEffect(() => {
    if (
      systemAudio.canCaptureSystemMicrophone ||
      (systemAudio.canRequestSystemAudioPermission &&
        systemAudio.capabilities?.canCaptureMicrophone !== false)
    ) {
      setAudioSource('both')
      console.log(
        '[Meetings] Native systemMicrophone capture available in Moldable, using blended capture by default',
      )
    }
  }, [
    systemAudio.canCaptureSystemMicrophone,
    systemAudio.canRequestSystemAudioPermission,
    systemAudio.capabilities?.canCaptureMicrophone,
  ])

  useEffect(() => {
    const wasCapturing = previousSystemCapturingRef.current
    const isCapturing = systemAudio.isCapturing

    if (wasCapturing && !isCapturing) {
      const expectedStopReason = expectedNativeStopReasonRef.current
      if (expectedStopReason) {
        console.log('[Meetings] Native capture stopped as requested', {
          reason: expectedStopReason,
          meetingId: activeMeetingIdRef.current,
          sessionId: activeRecordingSessionRef.current?.id ?? null,
        })
        expectedNativeStopReasonRef.current = null
        previousSystemCapturingRef.current = isCapturing
        return
      }
    }

    if (
      wasCapturing &&
      !isCapturing &&
      activeCaptureSourceRef.current !== null &&
      activeCaptureSourceRef.current !== 'microphone' &&
      activeMeetingIdRef.current &&
      !isMeetingPaused
    ) {
      console.warn('[Meetings] Native capture stopped unexpectedly', {
        meetingId: activeMeetingIdRef.current,
        sessionId: activeRecordingSessionRef.current?.id ?? null,
        activeCaptureSource: activeCaptureSourceRef.current,
        deepgramState: deepgram.state,
        deepgramIssue: deepgram.issue?.code ?? null,
        audioStreamingEnabled: audioStreamingEnabledRef.current,
      })
      audioStreamingEnabledRef.current = false
      setCurrentInterim(null)
      setIsMeetingPaused(true)
      endRecordingBackgroundTask(activeMeetingIdRef.current)
      void deepgram.disconnect({ drainFinal: false })
      activeCaptureSourceRef.current = null
      stopNativeDurationTimer()

      const pausedMeeting = finishActiveRecordingSession(meeting)
      if (pausedMeeting) {
        activeDurationBaseRef.current = pausedMeeting.duration
        updateActiveMeeting(pausedMeeting)
        updateMeeting(pausedMeeting)
      }
    }

    previousSystemCapturingRef.current = isCapturing
  }, [
    deepgram,
    endRecordingBackgroundTask,
    finishActiveRecordingSession,
    isMeetingPaused,
    meeting,
    stopNativeDurationTimer,
    systemAudio.isCapturing,
    updateActiveMeeting,
    updateMeeting,
  ])

  useEffect(() => {
    if (
      recordingRecoveryAttemptedRef.current ||
      meetingsLoading ||
      meeting ||
      recordingStartInFlightRef.current ||
      !systemAudio.isInMoldable
    ) {
      return
    }

    const recoveryCandidate = findRecoverableRecording(meetings)
    if (!recoveryCandidate) {
      recordingRecoveryAttemptedRef.current = true
      return
    }

    const { meeting: recoverableMeeting, session } = recoveryCandidate
    if (!isRecordingSessionLeaseFresh(session)) {
      recordingRecoveryAttemptedRef.current = true
      return
    }

    recordingRecoveryAttemptedRef.current = true
    const captureSource = session.captureSource ?? 'both'
    const nativeMode = captureSourceToNativeMode(captureSource)

    if (!nativeMode) {
      activeRecordingSessionRef.current = session
      activeMeetingIdRef.current = recoverableMeeting.id
      activeDurationBaseRef.current = recoverableMeeting.duration
      updateActiveMeeting(recoverableMeeting)
      setIsMeetingPaused(true)
      closeSelectedMeeting('none')
      return
    }

    let cancelled = false
    recordingStartInFlightRef.current = true
    setIsRecordingStartPending(true)
    activeRecordingSessionRef.current = session
    activeMeetingIdRef.current = recoverableMeeting.id
    activeDetectionSessionKeyRef.current = null
    activeRecordingRequestIdRef.current = null
    detectedStopInFlightRef.current = false
    activeDurationBaseRef.current = recoverableMeeting.duration
    activeCaptureSourceRef.current = captureSource
    activeNativeSequenceRef.current = session.lastNativeSequence ?? null
    audioStreamingEnabledRef.current = true
    activeAudioContentTypeRef.current = 'audio/l16;rate=48000;channels=1'
    resetAudioSourceManifest(captureSource)
    appendTranscriptActivatedAtRef.current = null
    nativePcmMixerRef.current.reset()
    hasLoggedFirstNativeAudioChunkRef.current = false
    setCurrentInterim(null)
    setIsMeetingPaused(false)
    setIsAppendingTranscript(false)
    updateActiveMeeting(recoverableMeeting)

    void (async () => {
      void deepgram.connect('linear16')
      const recovered = await systemAudio.recover(nativeMode, {
        afterSequence: session.lastNativeSequence ?? 0,
        replayLimit: NATIVE_RECOVERY_REPLAY_LIMIT,
      })

      if (cancelled) return

      if (!recovered) {
        audioStreamingEnabledRef.current = false
        activeRecordingSessionRef.current = null
        activeMeetingIdRef.current = null
        activeCaptureSourceRef.current = null
        activeNativeSequenceRef.current = null
        activeAudioSourceManifestRef.current = null
        clearMeeting()
        await deepgram.disconnect({ drainFinal: false })
      } else {
        startRecordingBackgroundTask(recoverableMeeting)
        closeSelectedMeeting('none')
      }

      recordingStartInFlightRef.current = false
      setIsRecordingStartPending(false)
    })()

    return () => {
      cancelled = true
    }
  }, [
    clearMeeting,
    closeSelectedMeeting,
    deepgram,
    meeting,
    meetings,
    meetingsLoading,
    resetAudioSourceManifest,
    startRecordingBackgroundTask,
    systemAudio,
    updateActiveMeeting,
  ])

  const loadCalendarEvents = useCallback(
    async (options: { requestAccess?: boolean } = {}) => {
      const loadId = calendarLoadIdRef.current + 1
      calendarLoadIdRef.current = loadId

      setCalendarEvents((current) => ({
        status: 'loading',
        events: current.events,
      }))

      try {
        const { timeMin, timeMax } = upcomingCalendarRange()
        const events = await callMoldableApp<CalendarEvent[]>(
          'calendar',
          'events.list',
          {
            timeMin,
            timeMax,
            includeDeclined: false,
            maxResults: 25,
          },
          {
            scopes: ['events.list'],
            timeoutMs: 45_000,
            requestAccess: options.requestAccess ?? false,
          },
        )

        if (calendarLoadIdRef.current === loadId) {
          setCalendarEvents({ status: 'ready', events })
        }
      } catch (error) {
        if (calendarLoadIdRef.current === loadId) {
          const code =
            error instanceof Error && 'code' in error
              ? (error as Error & { code?: string }).code
              : undefined

          setCalendarEvents({
            status: 'error',
            events: [],
            message: calendarErrorMessage(code, error),
            action:
              code === 'app_access_required' || code === 'app_access_denied'
                ? 'grant-calendar-access'
                : undefined,
          })
        }
      }
    },
    [],
  )

  const fetchCalendarEventsForDetection = useCallback(
    async (detection?: MeetingRecordingStartMessage | null) => {
      const detectedAt = meetingDetectionDate(detection)
      const timeMin = new Date(
        detectedAt.getTime() - 4 * 60 * 60 * 1000,
      ).toISOString()
      const timeMax = new Date(
        detectedAt.getTime() + 8 * 60 * 60 * 1000,
      ).toISOString()

      try {
        return await callMoldableApp<CalendarEvent[]>(
          'calendar',
          'events.list',
          {
            timeMin,
            timeMax,
            includeDeclined: false,
            maxResults: 20,
          },
          {
            scopes: ['events.list'],
            timeoutMs: 12_000,
            requestAccess: false,
          },
        )
      } catch (error) {
        console.warn(
          '[Meetings] Could not load calendar context for detected meeting:',
          error,
        )
        return []
      }
    },
    [],
  )

  const resolveCalendarEventForStart = useCallback(
    async (options: StartMeetingOptions) => {
      if (options.calendarEvent) return options.calendarEvent
      if (!options.detection) return null

      const cachedMatch =
        calendarEvents.status === 'ready'
          ? findMatchingCalendarEvent(calendarEvents.events, options.detection)
          : null

      if (cachedMatch) return cachedMatch

      const events = await fetchCalendarEventsForDetection(options.detection)
      return findMatchingCalendarEvent(events, options.detection)
    },
    [calendarEvents, fetchCalendarEventsForDetection],
  )

  useEffect(() => {
    if (!meeting) {
      void loadCalendarEvents({ requestAccess: false })
    }
  }, [loadCalendarEvents, meeting, workspaceId])

  useEffect(() => {
    function handleAppAccessChanged(event: MessageEvent) {
      if (event.data?.type !== 'moldable:app-access-changed') return

      const grant = event.data.grant as
        | {
            callerAppId?: string
            targetAppId?: string
            status?: string
          }
        | undefined

      if (
        grant?.callerAppId !== 'meetings' ||
        grant?.targetAppId !== 'calendar' ||
        grant?.status !== 'revoked'
      ) {
        return
      }

      setCalendarEvents({
        status: 'error',
        events: [],
        message: 'Grant calendar access to show upcoming events.',
        action: 'grant-calendar-access',
      })
    }

    window.addEventListener('message', handleAppAccessChanged)
    return () => window.removeEventListener('message', handleAppAccessChanged)
  }, [])

  // Start a new meeting
  const handleStartMeeting = useCallback(
    async (input?: unknown) => {
      if (recordingStartInFlightRef.current || meeting) return
      recordingStartInFlightRef.current = true
      setIsRecordingStartPending(true)

      const startOptions: StartMeetingOptions =
        typeof input === 'string'
          ? { title: input }
          : isStartMeetingOptions(input)
            ? input
            : {}
      const hostRecordingConflict = await hasConflictingHostRecording()
      if (hostRecordingConflict) {
        console.warn(
          '[Meetings] Ignoring start request because a host recording is already active.',
        )
        recordingStartInFlightRef.current = false
        setIsRecordingStartPending(false)
        return
      }

      let matchedCalendarEvent: CalendarEvent | null | undefined
      try {
        matchedCalendarEvent = await resolveCalendarEventForStart(startOptions)
      } catch (error) {
        console.error('[Meetings] Failed to resolve calendar context:', error)
        recordingStartInFlightRef.current = false
        setIsRecordingStartPending(false)
        return
      }
      const calendarContext = matchedCalendarEvent
        ? calendarEventToMeetingContext(matchedCalendarEvent)
        : undefined
      const id = uuidv4()
      const requestedTitle = cleanString(startOptions.title)
      const title =
        calendarContext?.title ||
        requestedTitle ||
        cleanString(startOptions.detection?.title) ||
        `Meeting ${new Date().toLocaleDateString()}`
      const initialRecordingSession = createRecordingSession()
      const newMeeting = startMeeting(id, title, initialRecordingSession, {
        calendarContext,
      })

      try {
        activeDurationBaseRef.current = 0
        activeMeetingIdRef.current = newMeeting.id
        activeDetectionSessionKeyRef.current =
          cleanString(startOptions.detection?.sessionKey) ?? null
        activeRecordingRequestIdRef.current =
          cleanString(startOptions.detection?.recordingRequestId) ?? null
        detectedStopInFlightRef.current = false
        setCurrentInterim(null)
        setIsMeetingPaused(false)
        setIsAppendingTranscript(false)
        appendTranscriptActivatedAtRef.current = null
        resetAudioSessionPersistence()

        const startedSource = await startPreferredCapture(audioSource)
        if (!startedSource) {
          throw new Error('Recording could not start.')
        }

        const leasedSession: RecordingSession = {
          ...initialRecordingSession,
          captureSource: startedSource,
          lastNativeSequence: activeNativeSequenceRef.current ?? undefined,
          leaseUpdatedAt: new Date(),
        }
        activeRecordingSessionRef.current = leasedSession
        const startedMeeting = upsertRecordingSession(newMeeting, leasedSession)
        updateActiveMeeting(startedMeeting)
        addMeeting(startedMeeting)
        startRecordingBackgroundTask(startedMeeting, {
          recordingRequestId: cleanString(
            startOptions.detection?.recordingRequestId,
          ),
          detectionSessionKey:
            activeDetectionSessionKeyRef.current ?? undefined,
        })
        closeSelectedMeeting('none')
      } catch (error) {
        console.error('[Meetings] Failed to start recording:', error)
        endRecordingBackgroundTask(newMeeting.id)
        clearMeeting()
        activeRecordingSessionRef.current = null
        activeDurationBaseRef.current = 0
        activeMeetingIdRef.current = null
        activeDetectionSessionKeyRef.current = null
        activeRecordingRequestIdRef.current = null
        detectedStopInFlightRef.current = false
        audioStreamingEnabledRef.current = false
        appendTranscriptActivatedAtRef.current = null
        setCurrentInterim(null)
        setIsMeetingPaused(false)
        setIsAppendingTranscript(false)
        await deepgram.disconnect({ drainFinal: false })
      } finally {
        recordingStartInFlightRef.current = false
        setIsRecordingStartPending(false)
      }
    },
    [
      addMeeting,
      closeSelectedMeeting,
      clearMeeting,
      createRecordingSession,
      deepgram,
      endRecordingBackgroundTask,
      meeting,
      resetAudioSessionPersistence,
      audioSource,
      startMeeting,
      startPreferredCapture,
      startRecordingBackgroundTask,
      resolveCalendarEventForStart,
      updateActiveMeeting,
      upsertRecordingSession,
    ],
  )

  useEffect(() => {
    function handleMeetingRecordingStart(event: MessageEvent) {
      if (event.data?.type !== 'moldable:meeting-recording-start') return
      if (meeting) return

      const message = event.data as MeetingRecordingStartMessage
      void handleStartMeeting({
        title: message.title || 'Detected meeting',
        detection: message,
      })
    }

    window.addEventListener('message', handleMeetingRecordingStart)
    return () =>
      window.removeEventListener('message', handleMeetingRecordingStart)
  }, [handleStartMeeting, meeting])

  const handleResumeExistingMeeting = useCallback(
    async (targetMeeting: Meeting) => {
      if (meeting || recordingStartInFlightRef.current) return
      recordingStartInFlightRef.current = true
      setIsRecordingStartPending(true)

      const hostRecordingConflict = await hasConflictingHostRecording(
        `${RECORDING_BACKGROUND_TASK_KIND}:${targetMeeting.id}`,
      )
      if (hostRecordingConflict) {
        console.warn(
          '[Meetings] Ignoring resume request because a host recording is already active.',
        )
        recordingStartInFlightRef.current = false
        setIsRecordingStartPending(false)
        return
      }

      const nextSession = createRecordingSession()
      const resumedMeeting = upsertRecordingSession(
        {
          ...targetMeeting,
          endedAt: undefined,
          updatedAt: new Date(),
        },
        nextSession,
      )

      activeDurationBaseRef.current = targetMeeting.duration
      activeMeetingIdRef.current = resumedMeeting.id
      activeDetectionSessionKeyRef.current = null
      activeRecordingRequestIdRef.current = null
      detectedStopInFlightRef.current = false

      try {
        setCurrentInterim(null)
        setIsMeetingPaused(false)
        setIsAppendingTranscript(false)
        appendTranscriptActivatedAtRef.current = null
        resetAudioSessionPersistence()

        const startedSource = await startPreferredCapture(audioSource)
        if (!startedSource) {
          throw new Error('Recording could not resume.')
        }

        const leasedSession: RecordingSession = {
          ...nextSession,
          captureSource: startedSource,
          lastNativeSequence: activeNativeSequenceRef.current ?? undefined,
          leaseUpdatedAt: new Date(),
        }
        activeRecordingSessionRef.current = leasedSession
        const leasedMeeting = upsertRecordingSession(
          resumedMeeting,
          leasedSession,
        )

        updateActiveMeeting(leasedMeeting)
        updateMeeting(leasedMeeting)
        startRecordingBackgroundTask(leasedMeeting)
        closeSelectedMeeting('none')
        appendTranscriptActivatedAtRef.current = Date.now()
        setIsAppendingTranscript(true)
      } catch (error) {
        console.error('[Meetings] Failed to resume recording:', error)
        activeRecordingSessionRef.current = null
        activeMeetingIdRef.current = null
        activeDetectionSessionKeyRef.current = null
        activeRecordingRequestIdRef.current = null
        detectedStopInFlightRef.current = false
        audioStreamingEnabledRef.current = false
        await deepgram.disconnect({ drainFinal: false })
      } finally {
        recordingStartInFlightRef.current = false
        setIsRecordingStartPending(false)
      }
    },
    [
      audioSource,
      closeSelectedMeeting,
      createRecordingSession,
      deepgram,
      meeting,
      resetAudioSessionPersistence,
      startPreferredCapture,
      startRecordingBackgroundTask,
      updateActiveMeeting,
      updateMeeting,
      upsertRecordingSession,
    ],
  )

  const handleStopAppendingTranscript = useCallback(async () => {
    const activatedAt = appendTranscriptActivatedAtRef.current
    if (activatedAt && Date.now() - activatedAt < 1500) {
      console.warn(
        '[Meetings] Ignoring immediate stop-appending-transcript click after resume',
        {
          elapsedMs: Date.now() - activatedAt,
          meetingId: activeMeetingIdRef.current,
          sessionId: activeRecordingSessionRef.current?.id ?? null,
        },
      )
      return
    }

    const sessionId = activeRecordingSessionRef.current?.id

    audioStreamingEnabledRef.current = false
    setIsMeetingPaused(false)
    setCurrentInterim(null)
    endRecordingBackgroundTask()

    await stopActiveCapture({ reason: 'stop-appending-transcript' })
    await deepgram.disconnect()

    if (meeting) {
      const completedMeeting = finishActiveRecordingSession(meeting) ?? meeting
      let stoppedMeeting: Meeting = {
        ...completedMeeting,
        endedAt: new Date(),
        updatedAt: new Date(),
      }

      if (sessionId) {
        const savedAudio = await finalizeSessionAudio(
          stoppedMeeting.id,
          sessionId,
        )
        if (savedAudio) {
          stoppedMeeting = attachAudioToRecordingSession(
            stoppedMeeting,
            sessionId,
            savedAudio.audioPath,
            savedAudio.audioMimeType,
            savedAudio.audioSourceManifestPath,
            savedAudio.audioSources,
          )
        }
      }

      updateMeeting(stoppedMeeting)
      openSelectedMeeting(stoppedMeeting, 'transcript')
    }

    clearMeeting()
    activeDurationBaseRef.current = 0
    activeMeetingIdRef.current = null
    activeDetectionSessionKeyRef.current = null
    activeRecordingRequestIdRef.current = null
    detectedStopInFlightRef.current = false
    appendTranscriptActivatedAtRef.current = null
    setIsAppendingTranscript(false)
  }, [
    attachAudioToRecordingSession,
    clearMeeting,
    deepgram,
    finishActiveRecordingSession,
    finalizeSessionAudio,
    endRecordingBackgroundTask,
    meeting,
    openSelectedMeeting,
    stopActiveCapture,
    updateMeeting,
  ])

  // Pause recording
  const handlePause = useCallback(async () => {
    const sessionId = activeRecordingSessionRef.current?.id

    audioStreamingEnabledRef.current = false
    setIsMeetingPaused(true)
    setCurrentInterim(null)
    appendTranscriptActivatedAtRef.current = null
    endRecordingBackgroundTask()

    await stopActiveCapture({
      pause: true,
      reason: 'pause-recording',
    })
    await deepgram.disconnect()

    const updated = finishActiveRecordingSession(meeting)
    if (updated) {
      let nextMeeting = updated
      if (sessionId) {
        const savedAudio = await finalizeSessionAudio(nextMeeting.id, sessionId)
        if (savedAudio) {
          nextMeeting = attachAudioToRecordingSession(
            nextMeeting,
            sessionId,
            savedAudio.audioPath,
            savedAudio.audioMimeType,
            savedAudio.audioSourceManifestPath,
            savedAudio.audioSources,
          )
        }
      }
      activeDurationBaseRef.current = nextMeeting.duration
      updateActiveMeeting(nextMeeting)
      updateMeeting(nextMeeting)
    }
  }, [
    attachAudioToRecordingSession,
    deepgram,
    endRecordingBackgroundTask,
    finishActiveRecordingSession,
    finalizeSessionAudio,
    meeting,
    stopActiveCapture,
    updateActiveMeeting,
    updateMeeting,
  ])

  // Resume recording
  const handleResume = useCallback(async () => {
    if (recordingStartInFlightRef.current) return
    recordingStartInFlightRef.current = true
    setIsRecordingStartPending(true)

    const hostRecordingConflict = await hasConflictingHostRecording(
      meeting ? `${RECORDING_BACKGROUND_TASK_KIND}:${meeting.id}` : null,
    )
    if (hostRecordingConflict) {
      console.warn(
        '[Meetings] Ignoring pause-resume request because another host recording is already active.',
      )
      recordingStartInFlightRef.current = false
      setIsRecordingStartPending(false)
      return
    }

    const nextSession = createRecordingSession()
    const updated = meeting
      ? upsertRecordingSession(meeting, nextSession)
      : null

    if (updated) {
      activeDurationBaseRef.current = updated.duration
      activeMeetingIdRef.current = updated.id
    }

    setCurrentInterim(null)
    resetAudioSessionPersistence()

    try {
      const startedSource = await startPreferredCapture(audioSource, {
        resume: true,
      })
      if (!startedSource) {
        throw new Error('Recording could not resume.')
      }

      if (updated) {
        const leasedSession: RecordingSession = {
          ...nextSession,
          captureSource: startedSource,
          lastNativeSequence: activeNativeSequenceRef.current ?? undefined,
          leaseUpdatedAt: new Date(),
        }
        activeRecordingSessionRef.current = leasedSession
        const leasedMeeting = upsertRecordingSession(updated, leasedSession)

        updateActiveMeeting(leasedMeeting)
        updateMeeting(leasedMeeting)
        startRecordingBackgroundTask(leasedMeeting)
      }
      setIsMeetingPaused(false)
      appendTranscriptActivatedAtRef.current = Date.now()
    } catch (error) {
      console.error('[Meetings] Failed to resume recording:', error)
      activeRecordingSessionRef.current = null
      audioStreamingEnabledRef.current = false
      await deepgram.disconnect({ drainFinal: false })
    } finally {
      recordingStartInFlightRef.current = false
      setIsRecordingStartPending(false)
    }
  }, [
    audioSource,
    createRecordingSession,
    deepgram,
    meeting,
    resetAudioSessionPersistence,
    startPreferredCapture,
    startRecordingBackgroundTask,
    updateActiveMeeting,
    updateMeeting,
    upsertRecordingSession,
  ])

  const runEnhancement = useCallback(
    async (targetMeeting: Meeting) => {
      enhancementTimersRef.current.forEach((timer) => clearTimeout(timer))
      enhancementTimersRef.current = []

      setEnhancement({
        meetingId: targetMeeting.id,
        content: '',
        isEnhancing: true,
      })

      const templateId =
        targetMeeting.enhancedTemplateId ?? DEFAULT_MEETING_TEMPLATE_ID

      let enhancedNotes = ''
      try {
        const response = await fetchWithWorkspace(
          `/api/meetings/${targetMeeting.id}/enhance/stream`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ meeting: targetMeeting, templateId }),
          },
        )

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as {
            error?: string
          }
          throw new Error(body.error || 'Failed to generate enhanced notes')
        }

        if (!response.body) {
          throw new Error('Enhanced notes stream did not include a body')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          enhancedNotes += decoder.decode(value, { stream: true })
          setEnhancement({
            meetingId: targetMeeting.id,
            content: normalizeGeneratedMarkdown(enhancedNotes),
            isEnhancing: true,
          })
        }

        enhancedNotes += decoder.decode()
        enhancedNotes = normalizeGeneratedMarkdown(enhancedNotes)

        if (!enhancedNotes) {
          throw new Error('AI response did not include enhanced notes.')
        }
      } catch (error) {
        console.error('Failed to generate enhanced notes:', error)
        setEnhancement(null)
        return
      }

      setEnhancement({
        meetingId: targetMeeting.id,
        content: enhancedNotes,
        isEnhancing: false,
      })

      const completedMeeting = {
        ...targetMeeting,
        enhancedNotes,
        enhancedTemplateId: templateId,
        enhancedAt: new Date(),
        updatedAt: new Date(),
      }

      updateMeeting(completedMeeting)
      setSelectedMeeting((current) =>
        current?.id === completedMeeting.id ? completedMeeting : current,
      )

      const clearTimer = setTimeout(() => {
        setEnhancement((current) =>
          current?.meetingId === completedMeeting.id ? null : current,
        )
      }, 1200)
      enhancementTimersRef.current.push(clearTimer)
    },
    [fetchWithWorkspace, updateMeeting],
  )

  // End meeting
  const handleEndMeeting = useCallback(async () => {
    const sessionId = activeRecordingSessionRef.current?.id
    audioStreamingEnabledRef.current = false
    setIsMeetingPaused(false)
    appendTranscriptActivatedAtRef.current = null
    endRecordingBackgroundTask(activeMeetingIdRef.current ?? meeting?.id)

    await stopActiveCapture({ reason: 'end-meeting' })
    await deepgram.disconnect()

    // Update meeting in list and keep it selected
    if (meeting) {
      const completedMeeting = finishActiveRecordingSession(meeting) ?? meeting
      let endedMeeting: Meeting = {
        ...completedMeeting,
        endedAt: new Date(),
        updatedAt: new Date(),
      }

      if (sessionId) {
        const savedAudio = await finalizeSessionAudio(
          endedMeeting.id,
          sessionId,
        )
        if (savedAudio) {
          endedMeeting = attachAudioToRecordingSession(
            endedMeeting,
            sessionId,
            savedAudio.audioPath,
            savedAudio.audioMimeType,
            savedAudio.audioSourceManifestPath,
            savedAudio.audioSources,
          )
        }
      }

      updateMeeting(endedMeeting)
      openSelectedMeeting(
        endedMeeting,
        isAppendingTranscript ? 'transcript' : 'enhanced',
      )
      clearMeeting()
      activeDurationBaseRef.current = 0
      activeMeetingIdRef.current = null
      activeDetectionSessionKeyRef.current = null
      activeRecordingRequestIdRef.current = null
      detectedStopInFlightRef.current = false
      setIsAppendingTranscript(false)

      if (!isAppendingTranscript) {
        void runEnhancement(endedMeeting)
      }
    }
  }, [
    attachAudioToRecordingSession,
    deepgram,
    finishActiveRecordingSession,
    finalizeSessionAudio,
    meeting,
    updateMeeting,
    clearMeeting,
    endRecordingBackgroundTask,
    runEnhancement,
    isAppendingTranscript,
    openSelectedMeeting,
    stopActiveCapture,
  ])

  const handleDeleteMeeting = useCallback(
    async (meetingId: string) => {
      const deletingActiveMeeting =
        meeting?.id === meetingId || activeMeetingIdRef.current === meetingId

      if (deletingActiveMeeting) {
        audioStreamingEnabledRef.current = false
        setIsMeetingPaused(false)
        setCurrentInterim(null)
        appendTranscriptActivatedAtRef.current = null
        recordingStartInFlightRef.current = false
        setIsRecordingStartPending(false)
        endRecordingBackgroundTask(meetingId)

        await stopActiveCapture({ reason: 'delete-meeting' })
        await deepgram.disconnect({ drainFinal: false })
        clearMeeting()
        activeRecordingSessionRef.current = null
        activeDurationBaseRef.current = 0
        activeMeetingIdRef.current = null
        activeDetectionSessionKeyRef.current = null
        activeRecordingRequestIdRef.current = null
        detectedStopInFlightRef.current = false
        setIsAppendingTranscript(false)
      }

      if (selectedMeeting?.id === meetingId) {
        closeSelectedMeeting('pop')
      }

      setEnhancement((current) =>
        current?.meetingId === meetingId ? null : current,
      )
      deleteMeeting(meetingId)
    },
    [
      clearMeeting,
      closeSelectedMeeting,
      deepgram,
      deleteMeeting,
      endRecordingBackgroundTask,
      meeting?.id,
      selectedMeeting?.id,
      stopActiveCapture,
    ],
  )

  useEffect(() => {
    function handleMeetingRecordingStop(event: MessageEvent) {
      if (event.data?.type !== 'moldable:meeting-recording-stop') return
      if (!meeting || detectedStopInFlightRef.current) return

      const message = event.data as MeetingRecordingStopMessage
      const sessionKey = cleanString(message.sessionKey)
      const messageMeetingId = cleanString(message.meetingId)
      const isSingletonConflict = message.reason === 'singleton-conflict'
      const targetsActiveMeeting =
        !messageMeetingId ||
        messageMeetingId === activeMeetingIdRef.current ||
        messageMeetingId === meeting.id

      if (
        isSingletonConflict &&
        message.source === 'desktop-singleton-guard' &&
        targetsActiveMeeting
      ) {
        detectedStopInFlightRef.current = true
        void handleEndMeeting().catch((error) => {
          detectedStopInFlightRef.current = false
          console.error(
            '[Meetings] Failed to stop duplicate singleton recording:',
            error,
          )
        })
        return
      }

      if (!sessionKey || sessionKey !== activeDetectionSessionKeyRef.current) {
        return
      }

      detectedStopInFlightRef.current = true
      void handleEndMeeting().catch((error) => {
        detectedStopInFlightRef.current = false
        console.error(
          '[Meetings] Failed to auto-stop after detected call ended:',
          error,
        )
      })
    }

    window.addEventListener('message', handleMeetingRecordingStop)
    return () =>
      window.removeEventListener('message', handleMeetingRecordingStop)
  }, [handleEndMeeting, meeting])

  // View a past meeting
  const handleSelectMeeting = useCallback(
    (m: Meeting) => {
      openSelectedMeeting(m)
    },
    [openSelectedMeeting],
  )

  // Update meeting handler (for notes changes)
  const handleUpdateMeeting = useCallback(
    (updated: Meeting) => {
      updateMeeting(updated)
      if (meeting?.id === updated.id) {
        updateActiveMeeting(updated)
      }
      if (selectedMeeting?.id === updated.id) {
        setSelectedMeeting(updated)
      }
    },
    [meeting?.id, selectedMeeting?.id, updateActiveMeeting, updateMeeting],
  )

  // Determine what to show in the main area
  const isRecording = audioRecorder.state.isRecording || systemAudio.isCapturing
  const recordingAudioLevel =
    activeCaptureSourceRef.current === 'both'
      ? 0
      : audioRecorder.state.audioLevel
  const hasActiveMeeting = meeting !== null
  const isPaused = hasActiveMeeting && isMeetingPaused
  const isViewingPastMeeting = selectedMeeting !== null
  const isDetailOpen = isViewingPastMeeting || hasActiveMeeting
  const isRecordingSessionActive =
    hasActiveMeeting && (isRecording || !!isPaused)

  useEffect(() => {
    if (!isRecordingSessionActive) {
      setHostRecordingStatus(null)
      return
    }

    let cancelled = false
    const pollHostStatus = async () => {
      try {
        const status = await requestHostMeetingRecordingStatus({
          taskId: recordingBackgroundTaskIdRef.current,
          recordingRequestId: activeRecordingRequestIdRef.current,
          detectionSessionKey: activeDetectionSessionKeyRef.current,
          sessionKey: activeDetectionSessionKeyRef.current,
        })
        if (!cancelled) setHostRecordingStatus(status)
      } catch (error) {
        if (!cancelled) {
          console.warn(
            '[Meetings] Failed to read host recording status:',
            error,
          )
          setHostRecordingStatus(null)
        }
      }
    }

    void pollHostStatus()
    const interval = window.setInterval(() => {
      void pollHostStatus()
    }, 2_000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [isRecordingSessionActive])

  const nativeStatus = systemAudio.status
  const nativeCaptureActive =
    activeCaptureSourceRef.current === 'both' ||
    activeCaptureSourceRef.current === 'system'
  const staleNativeSources = nativeCaptureActive
    ? (['microphone', 'system'] as const).filter(
        (source) =>
          systemAudio.sourceHealth[source].required &&
          systemAudio.sourceHealth[source].stale,
      )
    : []
  const staleNativeSourceLabel = staleNativeSources
    .map((source) => (source === 'microphone' ? 'microphone' : 'system audio'))
    .join(' and ')
  const deepgramQueuedChunks = deepgram.diagnostics.spool.queuedChunks
  const deepgramDroppedChunks = deepgram.diagnostics.spool.droppedChunks
  const deepgramReconnectMessage =
    deepgramQueuedChunks > 0
      ? `Audio is being saved. Reconnecting transcript (${deepgramQueuedChunks} chunks buffered).`
      : deepgramDroppedChunks > 0
        ? `Audio is being saved. Reconnecting transcript (${deepgramDroppedChunks} older chunks dropped).`
        : 'Audio is being saved. Reconnecting transcript...'
  const activeHostRecordingStatus =
    hostRecordingStatus?.active === true ? hostRecordingStatus : null
  const hostReadinessMessage =
    activeHostRecordingStatus?.readinessLine ??
    activeHostRecordingStatus?.statusLine ??
    null
  const hostReadinessStatus =
    activeHostRecordingStatus && hostReadinessMessage
      ? {
          tone:
            hostRecordingStatusTone(activeHostRecordingStatus) ??
            ('loading' as const),
          message: hostReadinessMessage,
        }
      : null
  const readinessStatus =
    hostReadinessStatus ??
    (nativeCaptureActive && nativeStatus?.actualState === 'restarting'
      ? {
          tone: 'loading' as const,
          message:
            'Audio helper restarting. Recording will resume automatically.',
        }
      : nativeCaptureActive && nativeStatus?.actualState === 'error'
        ? {
            tone: 'danger' as const,
            message:
              nativeStatus.degradedReason ??
              nativeStatus.lastCrashReason ??
              'Native audio capture stopped unexpectedly.',
          }
        : nativeCaptureActive && staleNativeSources.length > 0
          ? {
              tone: 'warning' as const,
              message: `${staleNativeSourceLabel} is not producing audio. Still recording available audio.`,
            }
          : nativeCaptureActive && nativeStatus?.degradedReason
            ? {
                tone: 'warning' as const,
                message: nativeStatus.degradedReason,
              }
            : deepgram.issue
              ? {
                  tone:
                    deepgram.issue.code === 'deepgram_permissions' ||
                    deepgram.issue.code === 'deepgram_token_unavailable'
                      ? ('danger' as const)
                      : ('warning' as const),
                  message:
                    deepgram.issue.code === 'deepgram_permissions'
                      ? 'Update Deepgram key to enable transcript.'
                      : deepgram.issue.code === 'deepgram_reconnect_exhausted'
                        ? 'Audio is being saved. Transcript paused.'
                        : deepgram.issue.code === 'deepgram_connection_lost'
                          ? deepgramReconnectMessage
                          : 'Transcript unavailable. Check Deepgram setup.',
                }
              : deepgram.state === 'connecting'
                ? {
                    tone: 'loading' as const,
                    message: isRecording
                      ? 'Recording audio. Connecting transcript...'
                      : 'Connecting transcript...',
                  }
                : deepgram.state === 'reconnecting'
                  ? {
                      tone: 'loading' as const,
                      message: deepgramReconnectMessage,
                    }
                  : null)
  const transcriptionStatus = readinessStatus

  return (
    <div className="bg-background flex h-screen flex-col">
      {!isDetailOpen && (
        <div className="shrink-0 px-5 py-3">
          <div className="mx-auto flex w-full max-w-[44rem] justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleStartMeeting}
              disabled={hasActiveMeeting}
              className="text-muted-foreground hover:bg-muted hover:text-foreground h-8 cursor-pointer rounded-full px-3"
            >
              <Plus className="mr-1.5 size-4" />
              New meeting
            </Button>
            <div className="ml-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(true)}
                className="text-muted-foreground hover:bg-muted hover:text-foreground size-8 shrink-0 cursor-pointer rounded-full"
                title="Settings"
              >
                <Settings className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <SettingsModal
        open={showSettings}
        onOpenChange={setShowSettings}
        settings={currentSettings}
        onSettingsChange={handleSettingsChange}
        audioSource={audioSource}
        onAudioSourceChange={setAudioSource}
        showAudioSource={systemAudio.isInMoldable}
        systemAudioAvailable={systemAudio.canCaptureSystemAudio}
        systemMicrophoneAvailable={systemAudio.canCaptureSystemMicrophone}
        recordingActive={isRecording}
      />

      <div className="min-h-0 flex-1 overflow-hidden">
        {isViewingPastMeeting ? (
          <MeetingView
            meeting={selectedMeeting}
            isActive={false}
            preferredView={preferredDetailView ?? undefined}
            enhancement={enhancement}
            currentInterim={null}
            currentRecordingSessionId={null}
            onBack={() => closeSelectedMeeting('pop')}
            onMoveToTrash={() => {
              void handleDeleteMeeting(selectedMeeting.id)
            }}
            onResumeRecording={() =>
              void handleResumeExistingMeeting(selectedMeeting)
            }
            onUpdateMeeting={(updated) => {
              setSelectedMeeting(updated)
              handleUpdateMeeting(updated)
            }}
          />
        ) : hasActiveMeeting ? (
          <MeetingView
            meeting={meeting}
            isActive={isRecording}
            isPaused={!!isPaused}
            backDisabled
            preferredView={preferredDetailView ?? undefined}
            enhancement={enhancement}
            currentInterim={currentInterim}
            currentRecordingSessionId={activeRecordingSessionRef.current?.id}
            onBack={() => {
              setSelectedMeeting(null)
              setPreferredDetailView(null)
            }}
            onUpdateMeeting={handleUpdateMeeting}
            onResumeRecording={isAppendingTranscript ? handleResume : undefined}
            onPauseRecording={
              isAppendingTranscript ? handleStopAppendingTranscript : undefined
            }
          />
        ) : meetings.length > 0 ? (
          <MeetingsList
            meetings={meetings}
            calendarEvents={calendarEvents}
            onStartEvent={(event) =>
              void handleStartMeeting({
                title: event.title || 'Calendar meeting',
                calendarEvent: event,
              })
            }
            onGrantCalendarAccess={() =>
              void loadCalendarEvents({ requestAccess: true })
            }
            onSelectMeeting={handleSelectMeeting}
            onDeleteMeeting={(meetingId) => void handleDeleteMeeting(meetingId)}
          />
        ) : (
          <EmptyState onStart={handleStartMeeting} />
        )}
      </div>
      {hasActiveMeeting && !isAppendingTranscript && (
        <RecordingDock
          isRecording={isRecordingSessionActive}
          isPaused={!!isPaused}
          duration={meeting.duration}
          audioLevel={recordingAudioLevel}
          isEnhancing={Boolean(enhancement?.isEnhancing)}
          isStarting={isRecordingStartPending}
          transcriptionStatus={transcriptionStatus}
          onStart={handleStartMeeting}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleEndMeeting}
          disabled={!hasActiveMeeting}
        />
      )}
    </div>
  )
}
