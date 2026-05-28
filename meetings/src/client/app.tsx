'use client'

import { Plus, Settings } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Button,
  popMoldableNavigation,
  pushMoldableNavigation,
  resetMoldableNavigation,
  sendToMoldable,
  useMoldableNavigationPop,
  useWorkspace,
} from '@moldable-ai/ui'
import { normalizeGeneratedMarkdown } from '@/lib/markdown'
import { callMoldableApp } from '@/lib/moldable-apps'
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

const RECORDING_BACKGROUND_TASK_KIND = 'meeting-recording'

interface MeetingRecordingStartMessage {
  type: 'moldable:meeting-recording-start'
  title?: string
  provider?: string
  bundleId?: string
  detectedAt?: string
  source?: string
  sessionKey?: string
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
}

interface StartMeetingOptions {
  title?: string
  calendarEvent?: CalendarEvent | null
  detection?: MeetingRecordingStartMessage | null
}

function cleanString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
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
  const activeDetectionSessionKeyRef = useRef<string | null>(null)
  const detectedStopInFlightRef = useRef(false)
  const hasLoggedFirstNativeAudioChunkRef = useRef(false)
  const recordingBackgroundTaskIdRef = useRef<string | null>(null)
  const deepgramSendAudioRef = useRef<
    ((data: ArrayBuffer | Blob) => void) | null
  >(null)

  const startRecordingBackgroundTask = useCallback((nextMeeting: Meeting) => {
    const taskId = `${RECORDING_BACKGROUND_TASK_KIND}:${nextMeeting.id}`
    recordingBackgroundTaskIdRef.current = taskId
    sendToMoldable({
      type: 'moldable:background-task-start',
      id: taskId,
      kind: RECORDING_BACKGROUND_TASK_KIND,
      title: nextMeeting.title,
      meetingId: nextMeeting.id,
      startedAt: new Date().toISOString(),
    })
  }, [])

  const endRecordingBackgroundTask = useCallback(() => {
    const taskId = recordingBackgroundTaskIdRef.current
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
  const { meetings, addMeeting, updateMeeting, deleteMeeting } = useMeetings()
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
    const session = {
      id: uuidv4(),
      startedAt: new Date(),
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
      }

      activeRecordingSessionRef.current = null
      return upsertRecordingSession(targetMeeting, finishedSession)
    },
    [upsertRecordingSession],
  )

  const resetAudioSessionPersistence = useCallback(() => {
    activeAudioContentTypeRef.current = null
  }, [])

  const attachAudioToRecordingSession = useCallback(
    (
      targetMeeting: Meeting,
      sessionId: string,
      audioPath: string,
      audioMimeType: string,
    ): Meeting => ({
      ...targetMeeting,
      recordingSessions: targetMeeting.recordingSessions?.map((session) =>
        session.id === sessionId
          ? { ...session, audioPath, audioMimeType }
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

  const finalizeSessionAudio = useCallback(
    async (
      meetingId: string,
      sessionId: string,
    ): Promise<{ audioPath: string; audioMimeType: string } | null> => {
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

  // System audio hook (for Moldable desktop)
  const systemAudio = useSystemAudio({
    onAudioData: (buffer: ArrayBuffer) => {
      if (!hasLoggedFirstNativeAudioChunkRef.current) {
        hasLoggedFirstNativeAudioChunkRef.current = true
        console.log('[Meetings] Received first native audio chunk', {
          byteLength: buffer.byteLength,
          meetingId: activeMeetingIdRef.current,
          sessionId: activeRecordingSessionRef.current?.id ?? null,
          activeCaptureSource: activeCaptureSourceRef.current,
          audioStreamingEnabled: audioStreamingEnabledRef.current,
        })
      }
      if (!audioStreamingEnabledRef.current) return

      if (activeRecordingSessionRef.current && activeMeetingIdRef.current) {
        void enqueueAudioChunkPersist(
          activeMeetingIdRef.current,
          activeRecordingSessionRef.current.id,
          buffer.slice(0),
          'audio/l16;rate=48000;channels=1',
        )
      }
      // Send raw PCM to Deepgram
      deepgram.sendAudio(buffer)
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
      const useBlendedCapture =
        selectedSource === 'both' && systemAudio.isAvailable
      const useSystemOnlyNativeCapture =
        selectedSource === 'system' && systemAudio.isAvailable

      if (useBlendedCapture) {
        console.log(
          '[Meetings] Starting native blended capture with system audio + microphone sidecar',
        )
        audioStreamingEnabledRef.current = true
        hasLoggedFirstNativeAudioChunkRef.current = false
        stopNativeDurationTimer()
        activeCaptureSourceRef.current = 'both'
        await deepgram.connect('linear16')

        const started = await systemAudio.start('both')
        if (started) {
          return 'both'
        }

        console.warn(
          '[Meetings] Native blended capture failed, falling back to microphone-only capture',
        )
        activeCaptureSourceRef.current = null
        deepgram.disconnect()
        audioStreamingEnabledRef.current = false
      }

      if (useSystemOnlyNativeCapture) {
        console.log(`[Meetings] Starting ${selectedSource} native capture`)
        audioStreamingEnabledRef.current = true
        hasLoggedFirstNativeAudioChunkRef.current = false
        stopNativeDurationTimer()
        await deepgram.connect('linear16')

        const started = await systemAudio.start('systemAudio')
        if (started) {
          activeCaptureSourceRef.current = selectedSource
          return selectedSource
        }

        console.warn(
          `[Meetings] Native ${selectedSource} capture failed, falling back to microphone`,
        )
        deepgram.disconnect()
      }

      console.log('[Meetings] Starting with microphone capture')
      audioStreamingEnabledRef.current = true
      await deepgram.connect('webm')
      if (options.resume) {
        await audioRecorder.resume(true)
      } else {
        await audioRecorder.start()
      }
      activeCaptureSourceRef.current = 'microphone'
      return 'microphone'
    },
    [audioRecorder, deepgram, stopNativeDurationTimer, systemAudio],
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
        await systemAudio.stop(JSON.stringify(stopContext))
      } else if (usingNativeCapture) {
        await systemAudio.stop(JSON.stringify(stopContext))
      } else if (options.pause) {
        await audioRecorder.pause()
      } else {
        await audioRecorder.stop()
      }

      activeCaptureSourceRef.current = null
      stopNativeDurationTimer()
    },
    [
      audioRecorder,
      deepgram.issue?.code,
      deepgram.state,
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
    if (systemAudio.isAvailable) {
      setAudioSource('both')
      console.log(
        '[Meetings] Native audio available in Moldable, using blended capture by default',
      )
    }
  }, [systemAudio.isAvailable])

  useEffect(() => {
    const wasCapturing = previousSystemCapturingRef.current
    const isCapturing = systemAudio.isCapturing

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
    }

    previousSystemCapturingRef.current = isCapturing
  }, [
    deepgram.issue?.code,
    deepgram.state,
    isMeetingPaused,
    systemAudio.isCapturing,
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
      const startOptions: StartMeetingOptions =
        typeof input === 'string'
          ? { title: input }
          : isStartMeetingOptions(input)
            ? input
            : {}
      const matchedCalendarEvent =
        await resolveCalendarEventForStart(startOptions)
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

      // Add to meetings list immediately so it appears in sidebar
      activeDurationBaseRef.current = 0
      activeMeetingIdRef.current = newMeeting.id
      activeDetectionSessionKeyRef.current =
        cleanString(startOptions.detection?.sessionKey) ?? null
      detectedStopInFlightRef.current = false
      addMeeting(newMeeting)
      startRecordingBackgroundTask(newMeeting)
      closeSelectedMeeting('none') // Clear any selection, show active meeting
      setCurrentInterim(null)
      setIsMeetingPaused(false)
      setIsAppendingTranscript(false)
      appendTranscriptActivatedAtRef.current = null
      resetAudioSessionPersistence()

      await startPreferredCapture(audioSource)
    },
    [
      addMeeting,
      closeSelectedMeeting,
      createRecordingSession,
      resetAudioSessionPersistence,
      audioSource,
      startMeeting,
      startPreferredCapture,
      startRecordingBackgroundTask,
      resolveCalendarEventForStart,
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
      if (meeting) return

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
      detectedStopInFlightRef.current = false
      updateActiveMeeting(resumedMeeting)
      updateMeeting(resumedMeeting)
      startRecordingBackgroundTask(resumedMeeting)
      closeSelectedMeeting('none')
      setCurrentInterim(null)
      setIsMeetingPaused(false)
      setIsAppendingTranscript(false)
      appendTranscriptActivatedAtRef.current = null
      resetAudioSessionPersistence()
      await startPreferredCapture(audioSource)
      appendTranscriptActivatedAtRef.current = Date.now()
      setIsAppendingTranscript(true)
    },
    [
      audioSource,
      closeSelectedMeeting,
      createRecordingSession,
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
    deepgram.disconnect()

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

    await stopActiveCapture({
      pause: true,
      reason: 'pause-recording',
    })
    deepgram.disconnect()

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
    finishActiveRecordingSession,
    finalizeSessionAudio,
    meeting,
    stopActiveCapture,
    updateActiveMeeting,
    updateMeeting,
  ])

  // Resume recording
  const handleResume = useCallback(async () => {
    const nextSession = createRecordingSession()
    if (meeting) {
      const updated = upsertRecordingSession(meeting, nextSession)
      activeDurationBaseRef.current = updated.duration
      activeMeetingIdRef.current = updated.id
      updateActiveMeeting(updated)
      updateMeeting(updated)
    }

    setCurrentInterim(null)
    setIsMeetingPaused(false)
    appendTranscriptActivatedAtRef.current = Date.now()
    resetAudioSessionPersistence()
    await startPreferredCapture(audioSource, { resume: true })
  }, [
    audioSource,
    createRecordingSession,
    meeting,
    resetAudioSessionPersistence,
    startPreferredCapture,
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
    endRecordingBackgroundTask()

    await stopActiveCapture({ reason: 'end-meeting' })
    deepgram.disconnect()

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

  useEffect(() => {
    function handleMeetingRecordingStop(event: MessageEvent) {
      if (event.data?.type !== 'moldable:meeting-recording-stop') return
      if (!meeting || detectedStopInFlightRef.current) return

      const message = event.data as MeetingRecordingStopMessage
      const sessionKey = cleanString(message.sessionKey)
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
  const transcriptionStatus = deepgram.issue
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
                ? 'Audio is being saved. Reconnecting...'
                : 'Transcript unavailable. Check Deepgram setup.',
      }
    : deepgram.state === 'connecting'
      ? {
          tone: 'loading' as const,
          message: 'Connecting transcript...',
        }
      : deepgram.state === 'reconnecting'
        ? {
            tone: 'loading' as const,
            message: 'Audio is being saved. Reconnecting...',
          }
        : null

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
        systemAudioAvailable={systemAudio.isAvailable}
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
              deleteMeeting(selectedMeeting.id)
              closeSelectedMeeting('pop')
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
            onDeleteMeeting={deleteMeeting}
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
