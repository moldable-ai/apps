'use client'

import { Plus, Settings } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, useWorkspace } from '@moldable-ai/ui'
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
  const [audioSource, setAudioSource] = useState<'microphone' | 'system'>(
    'microphone',
  )
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
  const audioStreamingEnabledRef = useRef(false)
  const activeDurationBaseRef = useRef(0)
  const calendarLoadIdRef = useRef(0)

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

  // System audio hook (for Moldable desktop)
  const systemAudio = useSystemAudio({
    onAudioData: (buffer: ArrayBuffer) => {
      if (!audioStreamingEnabledRef.current) return
      // Send raw PCM to Deepgram
      deepgram.sendAudio(buffer)
    },
    onError: (error: Error) => console.error('System audio error:', error),
  })

  // Audio recorder hook (for browser microphone)
  const audioRecorder = useAudioRecorder({
    onDataAvailable: async (blob) => {
      if (!audioStreamingEnabledRef.current) return
      const buffer = await blob.arrayBuffer()
      if (!audioStreamingEnabledRef.current) return
      deepgram.sendAudio(buffer)
    },
    onStateChange: (state) => {
      updateDuration(activeDurationBaseRef.current + state.duration)
    },
    onError: (error) => console.error('Recorder error:', error),
  })

  // Auto-select system audio if available
  useEffect(() => {
    if (systemAudio.isAvailable) {
      setAudioSource('system')
      console.log(
        '[Meetings] System audio available in Moldable, using as default',
      )
    }
  }, [systemAudio.isAvailable])

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
    async (titleOverride?: unknown) => {
      const id = uuidv4()
      const calendarTitle =
        typeof titleOverride === 'string' ? titleOverride.trim() : ''
      const title =
        calendarTitle || `Meeting ${new Date().toLocaleDateString()}`
      const initialRecordingSession = createRecordingSession()
      const newMeeting = startMeeting(
        id,
        title,
        currentSettings.saveAudio,
        initialRecordingSession,
      )

      // Add to meetings list immediately so it appears in sidebar
      activeDurationBaseRef.current = 0
      addMeeting(newMeeting)
      setSelectedMeeting(null) // Clear any selection, show active meeting
      setPreferredDetailView(null)
      setCurrentInterim(null)
      setIsMeetingPaused(false)
      setIsAppendingTranscript(false)

      if (audioSource === 'system' && systemAudio.isAvailable) {
        // System audio mode - use linear16 encoding for raw PCM
        console.log('[Meetings] Starting with system audio capture')
        audioStreamingEnabledRef.current = true
        await deepgram.connect('linear16')
        await systemAudio.start('systemAudio')
      } else {
        // Microphone mode - use webm/opus from browser
        console.log('[Meetings] Starting with microphone capture')
        audioStreamingEnabledRef.current = true
        await deepgram.connect('webm')
        await audioRecorder.start()
      }
    },
    [
      startMeeting,
      currentSettings.saveAudio,
      deepgram,
      audioRecorder,
      systemAudio,
      audioSource,
      addMeeting,
      createRecordingSession,
    ],
  )

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
      updateActiveMeeting(resumedMeeting)
      updateMeeting(resumedMeeting)
      setSelectedMeeting(null)
      setPreferredDetailView('transcript')
      setCurrentInterim(null)
      setIsMeetingPaused(false)
      setIsAppendingTranscript(true)
      audioStreamingEnabledRef.current = true

      if (audioSource === 'system' && systemAudio.isAvailable) {
        await deepgram.connect('linear16')
        await systemAudio.start('systemAudio')
      } else {
        await deepgram.connect('webm')
        await audioRecorder.start()
      }
    },
    [
      audioRecorder,
      audioSource,
      createRecordingSession,
      deepgram,
      meeting,
      systemAudio,
      updateActiveMeeting,
      updateMeeting,
      upsertRecordingSession,
    ],
  )

  const handleStopAppendingTranscript = useCallback(async () => {
    audioStreamingEnabledRef.current = false
    setIsMeetingPaused(false)
    setCurrentInterim(null)

    if (audioSource === 'system') {
      await systemAudio.stop()
    } else {
      audioRecorder.stop()
    }
    deepgram.disconnect()

    if (meeting) {
      const completedMeeting = finishActiveRecordingSession(meeting) ?? meeting
      const stoppedMeeting = {
        ...completedMeeting,
        endedAt: new Date(),
        updatedAt: new Date(),
      }

      updateMeeting(stoppedMeeting)
      setSelectedMeeting(stoppedMeeting)
      setPreferredDetailView('transcript')
    }

    clearMeeting()
    activeDurationBaseRef.current = 0
    setIsAppendingTranscript(false)
  }, [
    audioRecorder,
    audioSource,
    clearMeeting,
    deepgram,
    finishActiveRecordingSession,
    meeting,
    systemAudio,
    updateMeeting,
  ])

  // Pause recording
  const handlePause = useCallback(async () => {
    audioStreamingEnabledRef.current = false
    setIsMeetingPaused(true)
    setCurrentInterim(null)

    if (audioSource === 'system' && systemAudio.isCapturing) {
      await systemAudio.stop()
    } else {
      audioRecorder.pause()
    }
    deepgram.disconnect()

    const updated = finishActiveRecordingSession(meeting)
    if (updated) {
      updateActiveMeeting(updated)
      updateMeeting(updated)
    }
  }, [
    audioRecorder,
    deepgram,
    finishActiveRecordingSession,
    meeting,
    systemAudio,
    audioSource,
    updateActiveMeeting,
    updateMeeting,
  ])

  // Resume recording
  const handleResume = useCallback(async () => {
    const nextSession = createRecordingSession()
    if (meeting) {
      const updated = upsertRecordingSession(meeting, nextSession)
      updateActiveMeeting(updated)
      updateMeeting(updated)
    }

    setCurrentInterim(null)
    setIsMeetingPaused(false)
    audioStreamingEnabledRef.current = true

    if (audioSource === 'system' && systemAudio.isAvailable) {
      await deepgram.connect('linear16')
      await systemAudio.start('systemAudio')
    } else {
      await deepgram.connect('webm')
      await audioRecorder.resume()
    }
  }, [
    audioRecorder,
    audioSource,
    createRecordingSession,
    deepgram,
    meeting,
    systemAudio,
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
      let resolvedTemplateId = templateId
      try {
        const response = await fetchWithWorkspace(
          `/api/meetings/${targetMeeting.id}/enhance`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ meeting: targetMeeting, templateId }),
          },
        )
        const body = (await response.json()) as {
          markdown?: string
          templateId?: string
          error?: string
        }

        if (!response.ok || typeof body.markdown !== 'string') {
          throw new Error(body.error || 'Failed to generate enhanced notes')
        }

        enhancedNotes = body.markdown
        resolvedTemplateId = body.templateId ?? templateId
      } catch (error) {
        console.error('Failed to generate enhanced notes:', error)
        setEnhancement(null)
        return
      }

      const steps = 28
      const stepMs = 70

      for (let step = 1; step <= steps; step += 1) {
        const timer = setTimeout(() => {
          const nextLength = Math.ceil((enhancedNotes.length * step) / steps)
          const content = enhancedNotes.slice(0, nextLength)

          setEnhancement({
            meetingId: targetMeeting.id,
            content,
            isEnhancing: step < steps,
          })

          if (step === steps) {
            const completedMeeting = {
              ...targetMeeting,
              enhancedNotes,
              enhancedTemplateId: resolvedTemplateId,
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
          }
        }, step * stepMs)

        enhancementTimersRef.current.push(timer)
      }
    },
    [fetchWithWorkspace, updateMeeting],
  )

  // End meeting
  const handleEndMeeting = useCallback(async () => {
    let audioBlob: Blob | null = null
    audioStreamingEnabledRef.current = false
    setIsMeetingPaused(false)

    if (audioSource === 'system') {
      await systemAudio.stop()
    } else {
      audioBlob = audioRecorder.stop()
    }
    deepgram.disconnect()

    // Save audio if enabled (only for microphone mode currently)
    let audioPath: string | undefined
    if (currentSettings.saveAudio && audioSource === 'microphone') {
      if (audioBlob) {
        const url = URL.createObjectURL(audioBlob)
        audioPath = url
      }
    }

    // Update meeting in list and keep it selected
    if (meeting) {
      const completedMeeting = finishActiveRecordingSession(meeting) ?? meeting
      const endedMeeting = {
        ...completedMeeting,
        endedAt: new Date(),
        updatedAt: new Date(),
        audioPath,
      }
      updateMeeting(endedMeeting)
      setSelectedMeeting(endedMeeting)
      setPreferredDetailView(isAppendingTranscript ? 'transcript' : 'enhanced')
      clearMeeting()
      activeDurationBaseRef.current = 0
      setIsAppendingTranscript(false)

      if (!isAppendingTranscript) {
        void runEnhancement(endedMeeting)
      }
    }
  }, [
    audioRecorder,
    deepgram,
    currentSettings.saveAudio,
    finishActiveRecordingSession,
    meeting,
    updateMeeting,
    clearMeeting,
    systemAudio,
    audioSource,
    runEnhancement,
    isAppendingTranscript,
  ])

  // View a past meeting
  const handleSelectMeeting = useCallback((m: Meeting) => {
    setSelectedMeeting(m)
    setPreferredDetailView(null)
  }, [])

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
            onBack={() => {
              setSelectedMeeting(null)
              setPreferredDetailView(null)
            }}
            onMoveToTrash={() => {
              deleteMeeting(selectedMeeting.id)
              setSelectedMeeting(null)
              setPreferredDetailView(null)
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
              void handleStartMeeting(event.title || 'Calendar meeting')
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
          audioLevel={audioRecorder.state.audioLevel}
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
