'use client'

import {
  Mic,
  Monitor,
  Pause,
  Play,
  Settings,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Collapsible,
  CollapsibleContent,
  Input,
  ScrollArea,
  cn,
  useWorkspace,
} from '@moldable/ui'
import { formatDuration } from '@/lib/format'
import { MeetingCard } from '@/components/two-pane-meeting-view'
import {
  AudioLevelIndicator,
  EmptyState,
  SettingsPanel,
  TwoPaneMeetingView,
} from '@/components'
import {
  useActiveMeeting,
  useAudioRecorder,
  useDeepgram,
  useMeetings,
  useSystemAudio,
} from '@/hooks'
import type { Meeting, MeetingSettings, TranscriptSegment } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'
import { v4 as uuidv4 } from 'uuid'

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
      .then(setSettings)
      .catch(() => setSettings(DEFAULT_SETTINGS))
  }, [workspaceId, fetchWithWorkspace])

  // Use default settings until loaded
  const currentSettings = settings ?? DEFAULT_SETTINGS

  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [audioSource, setAudioSource] = useState<'microphone' | 'system'>(
    'microphone',
  )

  // Hooks
  const { meetings, addMeeting, updateMeeting, deleteMeeting } = useMeetings()
  const {
    meeting,
    startMeeting,
    addSegment,
    updateDuration,
    endMeeting,
    clearMeeting,
  } = useActiveMeeting()

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

  // Handle new segments from Deepgram
  const handleSegment = useCallback(
    (segment: TranscriptSegment) => {
      addSegment(segment)
    },
    [addSegment],
  )

  // Deepgram hook
  const deepgram = useDeepgram({
    settings: currentSettings,
    onSegment: handleSegment,
    onError: (error) => console.error('Deepgram error:', error),
  })

  // System audio hook (for Moldable desktop)
  const systemAudio = useSystemAudio({
    onAudioData: (buffer: ArrayBuffer) => {
      // Send raw PCM to Deepgram
      deepgram.sendAudio(buffer)
    },
    onError: (error: Error) => console.error('System audio error:', error),
  })

  // Audio recorder hook (for browser microphone)
  const audioRecorder = useAudioRecorder({
    onDataAvailable: async (blob) => {
      const buffer = await blob.arrayBuffer()
      deepgram.sendAudio(buffer)
    },
    onStateChange: (state) => {
      updateDuration(state.duration)
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

  // Start a new meeting
  const handleStartMeeting = useCallback(async () => {
    const id = uuidv4()
    const title = `Meeting ${new Date().toLocaleDateString()}`
    const newMeeting = startMeeting(id, title, currentSettings.saveAudio)

    // Add to meetings list immediately so it appears in sidebar
    addMeeting(newMeeting)
    setSelectedMeeting(null) // Clear any selection, show active meeting

    if (audioSource === 'system' && systemAudio.isAvailable) {
      // System audio mode - use linear16 encoding for raw PCM
      console.log('[Meetings] Starting with system audio capture')
      await deepgram.connect('linear16')
      await systemAudio.start('systemAudio')
    } else {
      // Microphone mode - use webm/opus from browser
      console.log('[Meetings] Starting with microphone capture')
      await deepgram.connect('webm')
      await audioRecorder.start()
    }
  }, [
    startMeeting,
    currentSettings.saveAudio,
    deepgram,
    audioRecorder,
    systemAudio,
    audioSource,
    addMeeting,
  ])

  // Pause recording
  const handlePause = useCallback(() => {
    if (audioSource === 'system' && systemAudio.isCapturing) {
      systemAudio.stop()
    } else {
      audioRecorder.pause()
    }
    deepgram.disconnect()
  }, [audioRecorder, deepgram, systemAudio, audioSource])

  // Resume recording
  const handleResume = useCallback(async () => {
    if (audioSource === 'system' && systemAudio.isAvailable) {
      await deepgram.connect('linear16')
      await systemAudio.start('systemAudio')
    } else {
      await deepgram.connect('webm')
      audioRecorder.resume()
    }
  }, [deepgram, audioRecorder, systemAudio, audioSource])

  // End meeting
  const handleEndMeeting = useCallback(async () => {
    if (audioSource === 'system') {
      systemAudio.stop()
    } else {
      audioRecorder.stop()
    }
    deepgram.disconnect()

    // Save audio if enabled (only for microphone mode currently)
    let audioPath: string | undefined
    if (currentSettings.saveAudio && audioSource === 'microphone') {
      const audioBlob = audioRecorder.stop()
      if (audioBlob) {
        const url = URL.createObjectURL(audioBlob)
        audioPath = url
      }
    }

    endMeeting(audioPath)

    // Update meeting in list and keep it selected
    if (meeting) {
      const endedMeeting = {
        ...meeting,
        endedAt: new Date(),
        audioPath,
      }
      updateMeeting(endedMeeting)
      setSelectedMeeting(endedMeeting)
      clearMeeting()
    }
  }, [
    audioRecorder,
    deepgram,
    currentSettings.saveAudio,
    endMeeting,
    meeting,
    updateMeeting,
    clearMeeting,
    systemAudio,
    audioSource,
  ])

  // View a past meeting
  const handleSelectMeeting = useCallback((m: Meeting) => {
    setSelectedMeeting(m)
  }, [])

  // Update meeting handler (for notes changes)
  const handleUpdateMeeting = useCallback(
    (updated: Meeting) => {
      updateMeeting(updated)
    },
    [updateMeeting],
  )

  // Determine what to show in the main area
  const isRecording = audioRecorder.state.isRecording || systemAudio.isCapturing
  const isPaused =
    audioRecorder.state.isPaused ||
    (audioSource === 'system' && !systemAudio.isCapturing && meeting?.id)
  const hasActiveMeeting = meeting !== null
  const isViewingPastMeeting = selectedMeeting !== null

  return (
    <div className="bg-background flex h-screen">
      {/* Sidebar */}
      <div className="border-border flex w-64 flex-col border-r">
        {/* Header: New Meeting + Settings */}
        <div className="border-border flex h-12 items-center gap-2 border-b px-2">
          <Button
            size="sm"
            onClick={handleStartMeeting}
            disabled={hasActiveMeeting}
            className="flex-1 cursor-pointer"
          >
            {audioSource === 'system' ? (
              <Monitor className="mr-2 size-4" />
            ) : (
              <Mic className="mr-2 size-4" />
            )}
            New Meeting
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            className="size-8 shrink-0 cursor-pointer"
          >
            {showSettings ? (
              <X className="size-4" />
            ) : (
              <Settings className="size-4" />
            )}
          </Button>
        </div>

        {/* Settings Panel (collapsible) */}
        <Collapsible open={showSettings}>
          <CollapsibleContent>
            <div className="border-border border-b px-3 py-2">
              <SettingsPanel
                settings={currentSettings}
                onChange={handleSettingsChange}
              />
              {/* Audio Source Toggle (only show if in Moldable) */}
              {systemAudio.isInMoldable && (
                <div className="border-border mt-3 border-t pt-3">
                  <label className="mb-2 block text-xs font-medium">
                    Audio Source
                  </label>
                  <div className="flex gap-2">
                    <Button
                      variant={
                        audioSource === 'microphone' ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => setAudioSource('microphone')}
                      disabled={isRecording}
                      className="flex-1 cursor-pointer"
                    >
                      <Mic className="mr-1.5 size-3.5" />
                      Mic
                    </Button>
                    <Button
                      variant={audioSource === 'system' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAudioSource('system')}
                      disabled={isRecording || !systemAudio.isAvailable}
                      className="flex-1 cursor-pointer"
                      title={
                        !systemAudio.isAvailable
                          ? 'System audio requires a signed app build'
                          : undefined
                      }
                    >
                      <Monitor className="mr-1.5 size-3.5" />
                      System
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Meeting List */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-2 py-2">
            {meetings.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-muted-foreground text-xs">No meetings yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {meetings.map((m) => (
                  <AlertDialog key={m.id}>
                    <div className="group relative">
                      <MeetingCard
                        meeting={m}
                        isSelected={selectedMeeting?.id === m.id}
                        onClick={() => handleSelectMeeting(m)}
                      />
                      <AlertDialogTrigger asChild>
                        <button
                          className={cn(
                            'absolute right-1.5 top-1.5 flex size-5 cursor-pointer items-center justify-center rounded-sm opacity-0 transition-opacity group-hover:opacity-100',
                            selectedMeeting?.id === m.id
                              ? 'text-primary-foreground hover:bg-primary-foreground/20'
                              : 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </AlertDialogTrigger>
                    </div>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete meeting?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete &quot;
                          {m.title || 'Untitled meeting'}&quot;. This action
                          cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            deleteMeeting(m.id)
                            if (selectedMeeting?.id === m.id) {
                              setSelectedMeeting(null)
                            }
                          }}
                          className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Active Meeting Header with Recording Controls */}
        {hasActiveMeeting && (
          <div className="border-border flex h-12 shrink-0 items-center justify-between border-b px-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{meeting.title}</span>
              {audioSource === 'system' && (
                <span className="bg-muted text-muted-foreground flex items-center gap-1 rounded px-2 py-0.5 text-xs">
                  <Monitor className="size-3" />
                  System
                </span>
              )}
            </div>

            {/* Recording Controls */}
            <div className="flex items-center gap-3">
              {/* Audio Level + Duration */}
              <div className="flex items-center gap-2">
                <AudioLevelIndicator
                  level={audioRecorder.state.audioLevel}
                  isRecording={isRecording}
                  isPaused={!!isPaused}
                />
                <span className="text-muted-foreground font-mono text-xs tabular-nums">
                  {formatDuration(
                    audioSource === 'system'
                      ? meeting.duration
                      : audioRecorder.state.duration,
                  )}
                </span>
              </div>

              {/* Pause/Resume */}
              <Button
                variant="ghost"
                size="icon"
                onClick={isPaused ? handleResume : handlePause}
                className="size-8 cursor-pointer"
              >
                {isPaused ? (
                  <Play className="size-4" />
                ) : (
                  <Pause className="size-4" />
                )}
              </Button>

              {/* End Meeting */}
              <Button
                variant="destructive"
                size="sm"
                onClick={handleEndMeeting}
                className="cursor-pointer gap-1.5"
              >
                <Square className="size-3" fill="currentColor" />
                End
              </Button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {isViewingPastMeeting ? (
            // Viewing a past meeting - show header with title + two pane view
            <div className="flex h-full flex-col overflow-hidden">
              {/* Past Meeting Header */}
              <div className="border-border flex h-12 shrink-0 items-center border-b px-4">
                <Input
                  value={selectedMeeting.title || 'Untitled meeting'}
                  onChange={(e) => {
                    const updated = {
                      ...selectedMeeting,
                      title: e.target.value,
                    }
                    setSelectedMeeting(updated)
                    updateMeeting(updated)
                  }}
                  className="h-8 w-80 border-none bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Meeting title"
                />
              </div>
              {/* Two pane view */}
              <TwoPaneMeetingView
                meeting={selectedMeeting}
                isActive={false}
                onUpdateMeeting={(updated) => {
                  setSelectedMeeting(updated)
                  handleUpdateMeeting(updated)
                }}
              />
            </div>
          ) : hasActiveMeeting ? (
            // Active recording - two pane view with live transcript
            <TwoPaneMeetingView
              meeting={meeting}
              isActive={isRecording}
              onUpdateMeeting={handleUpdateMeeting}
            />
          ) : (
            // Empty state
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  )
}
