'use client'

import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Captions,
  Check,
  ChevronDown,
  List,
  Loader2,
  type LucideIcon,
  MoreHorizontal,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MarkdownEditor } from '@moldable-ai/editor'
import {
  Button,
  Calendar as DatePickerCalendar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
  useWorkspace,
} from '@moldable-ai/ui'
import { formatRelativeTime } from '@/lib/format'
import { normalizeGeneratedMarkdown } from '@/lib/markdown'
import {
  DEFAULT_MEETING_TEMPLATE_ID,
  MEETING_TEMPLATES,
  type MeetingTemplate,
  getTemplateById,
} from '@/lib/templates'
import { EnhancingEditor } from './enhancing-editor'
import { AllTemplatesModal } from './template-selector/all-templates-modal'
import { TemplateDropdownMenu } from './template-selector/template-dropdown-menu'
import {
  createTemplateCopy,
  createUntitledTemplate,
  deleteCustomTemplate,
  loadCustomTemplates,
  saveCustomTemplate,
} from './template-selector/template-storage'
import { TranscriptView } from './transcript-view'
import type { Meeting } from '@/types'

export type MeetingViewMode = 'manual' | 'enhanced' | 'transcript'

export interface EnhancementStatus {
  meetingId: string
  content: string
  isEnhancing: boolean
}

interface MeetingViewProps {
  meeting: Meeting
  isActive?: boolean
  enhancement?: EnhancementStatus | null
  currentInterim?: string | null
  currentRecordingSessionId?: string | null
  isPaused?: boolean
  preferredView?: MeetingViewMode
  onUpdateMeeting?: (meeting: Meeting) => void
  onMoveToTrash?: () => void
  onBack?: () => void
  backDisabled?: boolean
  onResumeRecording?: () => void
  onPauseRecording?: () => void
}

function hasGeneratedEnhancedDraft(meeting: Meeting) {
  return Boolean(meeting.enhancedAt || meeting.enhancedTemplateId)
}

function getInitialView(meeting: Meeting): MeetingViewMode {
  if (hasGeneratedEnhancedDraft(meeting)) return 'enhanced'
  return 'manual'
}

function formatMeetingDay(date: Date) {
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })
}

function getPrimaryParticipant(title: string) {
  const parts = title
    .split(/\s+(?:and|&)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean)

  return parts.length > 1 ? parts.at(-1) : null
}

export function MeetingView({
  meeting,
  isActive = false,
  enhancement,
  currentInterim,
  currentRecordingSessionId,
  isPaused,
  preferredView,
  onUpdateMeeting,
  onMoveToTrash,
  onBack,
  backDisabled = false,
  onResumeRecording,
  onPauseRecording,
}: MeetingViewProps) {
  const { fetchWithWorkspace } = useWorkspace()
  const [activeView, setActiveView] = useState<MeetingViewMode>(() =>
    getInitialView(meeting),
  )
  const [manualNotes, setManualNotes] = useState(meeting.notes || '')
  const [enhancedNotes, setEnhancedNotes] = useState(
    normalizeGeneratedMarkdown(meeting.enhancedNotes || ''),
  )
  const [titleDraft, setTitleDraft] = useState(meeting.title || '')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false)
  const [customTemplates, setCustomTemplates] = useState<MeetingTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    meeting.enhancedTemplateId ?? DEFAULT_MEETING_TEMPLATE_ID,
  )
  const [generatingTemplateId, setGeneratingTemplateId] = useState<
    string | null
  >(null)
  const [localEnhancement, setLocalEnhancement] =
    useState<EnhancementStatus | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const previousMeetingIdRef = useRef(meeting.id)
  const wasEnhancingRef = useRef(false)

  const templates = useMemo(
    () => [...customTemplates, ...MEETING_TEMPLATES],
    [customTemplates],
  )
  const selectedTemplate = getTemplateById(selectedTemplateId, templates)
  const hasGeneratedEnhancedNotes = hasGeneratedEnhancedDraft(meeting)

  const activeEnhancement =
    localEnhancement && localEnhancement.meetingId === meeting.id
      ? localEnhancement
      : enhancement && enhancement.meetingId === meeting.id
        ? enhancement
        : null

  useEffect(() => {
    if (preferredView) {
      setActiveView(preferredView)
    }
  }, [preferredView])

  useEffect(() => {
    if (previousMeetingIdRef.current !== meeting.id) {
      previousMeetingIdRef.current = meeting.id
      setActiveView(getInitialView(meeting))
      setLastSaved(null)
      setLocalEnhancement(null)
    }

    setManualNotes(meeting.notes || '')
    setEnhancedNotes(normalizeGeneratedMarkdown(meeting.enhancedNotes || ''))
    setTitleDraft(meeting.title || '')
    setSelectedTemplateId(
      meeting.enhancedTemplateId ?? DEFAULT_MEETING_TEMPLATE_ID,
    )
  }, [meeting])

  useEffect(() => {
    let cancelled = false

    async function loadTemplates() {
      try {
        const templates = await loadCustomTemplates(fetchWithWorkspace)
        if (cancelled) return
        setCustomTemplates(templates)
      } catch (error) {
        console.error('Failed to load custom templates:', error)
        if (!cancelled) setCustomTemplates([])
      }
    }

    void loadTemplates()

    return () => {
      cancelled = true
    }
  }, [fetchWithWorkspace])

  useEffect(() => {
    if (activeEnhancement?.isEnhancing) {
      wasEnhancingRef.current = true
      setActiveView('enhanced')
      return
    }

    if (wasEnhancingRef.current && hasGeneratedEnhancedNotes) {
      wasEnhancingRef.current = false
      setActiveView('enhanced')
    }
  }, [activeEnhancement?.isEnhancing, hasGeneratedEnhancedNotes])

  const persistMeeting = useCallback(
    async (updatedMeeting: Meeting) => {
      setIsSaving(true)
      if (onUpdateMeeting) {
        onUpdateMeeting(updatedMeeting)
      } else {
        await fetchWithWorkspace('/api/meetings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedMeeting),
        })
      }
      setLastSaved(new Date())
      setIsSaving(false)
    },
    [fetchWithWorkspace, onUpdateMeeting],
  )

  const handleManualNotesChange = useCallback(
    (newNotes: string) => {
      setManualNotes(newNotes)
      void persistMeeting({
        ...meeting,
        notes: newNotes,
        updatedAt: new Date(),
      })
    },
    [meeting, persistMeeting],
  )

  const handleEnhancedNotesChange = useCallback(
    (newNotes: string) => {
      setEnhancedNotes(newNotes)
      void persistMeeting({
        ...meeting,
        enhancedNotes: newNotes,
        enhancedAt: meeting.enhancedAt ?? new Date(),
        updatedAt: new Date(),
      })
    },
    [meeting, persistMeeting],
  )

  const participant = getPrimaryParticipant(titleDraft)
  const enhancementContent = activeEnhancement?.content ?? ''
  const originalEnhancementNotes = enhancedNotes || manualNotes
  const showEnhancingEditor = Boolean(
    activeView === 'enhanced' &&
      activeEnhancement &&
      (activeEnhancement.isEnhancing || enhancementContent),
  )

  const handleTitleChange = useCallback(
    (nextTitle: string) => {
      setTitleDraft(nextTitle)
      void persistMeeting({
        ...meeting,
        title: nextTitle,
        updatedAt: new Date(),
      })
    },
    [meeting, persistMeeting],
  )

  const handleMeetingDateChange = useCallback(
    (nextDate: Date | undefined) => {
      if (!nextDate) return

      const createdAt = new Date(meeting.createdAt)
      createdAt.setFullYear(
        nextDate.getFullYear(),
        nextDate.getMonth(),
        nextDate.getDate(),
      )

      void persistMeeting({
        ...meeting,
        createdAt,
        updatedAt: new Date(),
      })
      setIsDatePickerOpen(false)
    },
    [meeting, persistMeeting],
  )

  const handleGenerateTemplate = useCallback(
    async (template: MeetingTemplate) => {
      setGeneratingTemplateId(template.id)
      setSelectedTemplateId(template.id)
      setActiveView('enhanced')
      setIsMenuOpen(false)
      setLocalEnhancement({
        meetingId: meeting.id,
        content: '',
        isEnhancing: true,
      })

      let nextEnhancedNotes = ''
      try {
        const response = await fetchWithWorkspace(
          `/api/meetings/${meeting.id}/enhance/stream`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ meeting, template }),
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

          nextEnhancedNotes += decoder.decode(value, { stream: true })
          setLocalEnhancement({
            meetingId: meeting.id,
            content: normalizeGeneratedMarkdown(nextEnhancedNotes),
            isEnhancing: true,
          })
        }

        nextEnhancedNotes += decoder.decode()
        nextEnhancedNotes = normalizeGeneratedMarkdown(nextEnhancedNotes)

        if (!nextEnhancedNotes) {
          throw new Error('AI response did not include enhanced notes.')
        }

        setLocalEnhancement({
          meetingId: meeting.id,
          content: nextEnhancedNotes,
          isEnhancing: false,
        })

        const updatedMeeting = {
          ...meeting,
          enhancedNotes: nextEnhancedNotes,
          enhancedTemplateId: template.id,
          enhancedAt: new Date(),
          updatedAt: new Date(),
        }

        setEnhancedNotes(nextEnhancedNotes)
        await persistMeeting(updatedMeeting)

        window.setTimeout(() => {
          setLocalEnhancement((current) =>
            current?.meetingId === meeting.id && !current.isEnhancing
              ? null
              : current,
          )
        }, 1200)
      } catch (error) {
        console.error('Failed to generate enhanced notes:', error)
        setLocalEnhancement(null)
      } finally {
        setGeneratingTemplateId(null)
      }
    },
    [fetchWithWorkspace, meeting, persistMeeting],
  )

  const handleCreateTemplate = useCallback(() => {
    const template = createUntitledTemplate()
    setCustomTemplates((current) => [template, ...current])
    setSelectedTemplateId(template.id)
    setIsMenuOpen(false)
    setIsTemplatesModalOpen(true)
    void saveCustomTemplate(fetchWithWorkspace, template).catch((error) => {
      console.error('Failed to save custom template:', error)
    })
    return template
  }, [fetchWithWorkspace])

  const handleDuplicateTemplate = useCallback(
    (template: MeetingTemplate) => {
      const duplicate = createTemplateCopy(template)
      setCustomTemplates((current) => [duplicate, ...current])
      setSelectedTemplateId(duplicate.id)
      void saveCustomTemplate(fetchWithWorkspace, duplicate).catch((error) => {
        console.error('Failed to save custom template:', error)
      })
      return duplicate
    },
    [fetchWithWorkspace],
  )

  const handleDeleteTemplate = useCallback(
    (templateId: string) => {
      setCustomTemplates((current) =>
        current.filter((template) => template.id !== templateId),
      )
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId(DEFAULT_MEETING_TEMPLATE_ID)
      }
      void deleteCustomTemplate(fetchWithWorkspace, templateId).catch(
        (error) => {
          console.error('Failed to delete custom template:', error)
        },
      )
    },
    [fetchWithWorkspace, selectedTemplateId],
  )

  return (
    <div className="bg-background relative flex h-full flex-col overflow-hidden">
      <div className="pointer-events-none absolute right-4 top-3 z-20 flex items-center gap-3">
        <SaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
        <div className="pointer-events-auto flex items-center gap-3">
          {onMoveToTrash ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:bg-muted hover:text-foreground size-9 cursor-pointer rounded-full"
                  title="Meeting actions"
                >
                  <MoreHorizontal className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={onMoveToTrash}
                >
                  <Trash2 className="mr-2 size-4" />
                  Move to trash
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <div className="relative">
            <div className="bg-muted flex h-10 items-center gap-0.5 rounded-full p-0.5">
              <div className="flex items-center">
                <ChromeButton
                  active={activeView === 'manual'}
                  icon={List}
                  title="Notes"
                  onClick={() => {
                    setActiveView('manual')
                    setIsMenuOpen(false)
                  }}
                />
                <div className="relative">
                  <EnhancedNotesButton
                    active={activeView === 'enhanced'}
                    open={isMenuOpen}
                    onClick={() => {
                      if (activeView === 'enhanced') {
                        setIsMenuOpen((open) => !open)
                      } else {
                        setActiveView('enhanced')
                        setIsMenuOpen(false)
                      }
                    }}
                  />
                  <TemplateDropdownMenu
                    open={isMenuOpen}
                    templates={templates}
                    selectedTemplate={selectedTemplate}
                    selectedTemplateId={selectedTemplateId}
                    generated={hasGeneratedEnhancedNotes}
                    generatingTemplateId={generatingTemplateId}
                    onGenerateTemplate={(template) =>
                      void handleGenerateTemplate(template)
                    }
                    onOpenAllTemplates={() => {
                      setIsMenuOpen(false)
                      setIsTemplatesModalOpen(true)
                    }}
                    onCreateTemplate={handleCreateTemplate}
                  />
                </div>
                <ChromeButton
                  active={activeView === 'transcript'}
                  icon={Captions}
                  title="Transcript"
                  onClick={() => {
                    setActiveView('transcript')
                    setIsMenuOpen(false)
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-auto px-6 pb-[var(--chat-safe-padding)] sm:px-10 lg:px-16"
      >
        <div className="mx-auto min-h-full w-full max-w-[44rem] pt-[54px]">
          <header className="mb-8">
            {onBack ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onBack}
                disabled={backDisabled}
                className="text-muted-foreground hover:bg-muted hover:text-foreground -ml-2 mb-6 h-8 cursor-pointer gap-1.5 rounded-full px-2.5 text-xs disabled:pointer-events-none disabled:opacity-45"
                title="Back to meetings"
              >
                <ArrowLeft className="size-3.5" />
                <span>Meetings</span>
              </Button>
            ) : null}
            <Input
              value={titleDraft}
              onChange={(event) => handleTitleChange(event.target.value)}
              className="meetings-detail-title-input h-auto w-full truncate border-none !bg-transparent px-0 py-0 text-2xl font-normal leading-tight shadow-none outline-none focus-visible:!bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:text-3xl"
              placeholder="Untitled meeting"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <DateMetadataPill
                date={meeting.createdAt}
                open={isDatePickerOpen}
                onOpenChange={setIsDatePickerOpen}
                onSelectDate={handleMeetingDateChange}
              />
              {participant && <MetadataPill icon={Users} label={participant} />}
            </div>
          </header>

          {showEnhancingEditor ? (
            <EnhancingEditor
              key="enhancing-editor"
              originalNotes={originalEnhancementNotes}
              enhancedContent={enhancementContent}
              isEnhancing={Boolean(activeEnhancement?.isEnhancing)}
              className="min-h-full"
              scrollContainer={scrollContainerRef.current}
            />
          ) : activeView === 'manual' ? (
            <MarkdownEditor
              value={manualNotes}
              onChange={handleManualNotesChange}
              placeholder="Write your notes here..."
              minHeight="100%"
              maxHeight="none"
              className="meetings-document-editor"
              contentClassName="meetings-document-content"
              hideMarkdownHint
            />
          ) : activeView === 'enhanced' ? (
            hasGeneratedEnhancedNotes ? (
              <MarkdownEditor
                value={enhancedNotes}
                onChange={handleEnhancedNotesChange}
                placeholder="No notes were generated for this meeting"
                minHeight="100%"
                maxHeight="none"
                className="meetings-document-editor"
                contentClassName="meetings-document-content meetings-enhanced-document-content"
                hideMarkdownHint
              />
            ) : (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <div className="bg-muted mb-4 flex size-12 items-center justify-center rounded-full">
                  <Sparkles className="text-muted-foreground size-5" />
                </div>
                <h3 className="text-sm font-medium">No enhanced draft yet</h3>
                <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                  End the meeting to turn your notes and transcript into a
                  structured draft.
                </p>
              </div>
            )
          ) : (
            <TranscriptView
              meetingId={meeting.id}
              segments={meeting.segments}
              recordingSessions={meeting.recordingSessions}
              isLive={isActive}
              isPaused={isPaused}
              currentInterim={currentInterim}
              currentRecordingSessionId={currentRecordingSessionId}
              startedAt={meeting.createdAt}
              duration={meeting.duration}
              className="meetings-transcript-document min-h-[420px]"
              onResumeRecording={onResumeRecording}
              onPauseRecording={onPauseRecording}
            />
          )}
        </div>
      </div>

      <AllTemplatesModal
        open={isTemplatesModalOpen}
        onOpenChange={setIsTemplatesModalOpen}
        templates={templates}
        selectedTemplateId={selectedTemplateId}
        generatingTemplateId={generatingTemplateId}
        onTemplateSelect={(template) => void handleGenerateTemplate(template)}
        onCreateTemplate={handleCreateTemplate}
        onDuplicateTemplate={handleDuplicateTemplate}
        onDeleteTemplate={handleDeleteTemplate}
        onUpdateTemplate={(updatedTemplate) => {
          setCustomTemplates((current) =>
            current.map((template) =>
              template.id === updatedTemplate.id ? updatedTemplate : template,
            ),
          )
          void saveCustomTemplate(fetchWithWorkspace, updatedTemplate).catch(
            (error) => {
              console.error('Failed to save custom template:', error)
            },
          )
        }}
      />
    </div>
  )
}

interface ChromeButtonProps {
  active: boolean
  icon: LucideIcon
  onClick: () => void
  title: string
}

function ChromeButton({
  active,
  icon: Icon,
  onClick,
  title,
}: ChromeButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      title={title}
      className={cn(
        'hover:bg-background/70 size-9 cursor-pointer rounded-full',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="size-4" />
    </Button>
  )
}

interface EnhancedNotesButtonProps {
  active: boolean
  open: boolean
  onClick: () => void
}

function EnhancedNotesButton({
  active,
  open,
  onClick,
}: EnhancedNotesButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      title="Enhanced notes"
      className={cn(
        'hover:bg-background/70 h-9 cursor-pointer gap-1.5 rounded-full px-3',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Sparkles className="size-4" />
      <ChevronDown
        className={cn(
          'size-3.5 transition-transform duration-200',
          open && 'rotate-180',
        )}
      />
    </Button>
  )
}

interface DateMetadataPillProps {
  date: Date
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectDate: (date: Date | undefined) => void
}

function DateMetadataPill({
  date,
  open,
  onOpenChange,
  onSelectDate,
}: DateMetadataPillProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="border-border/80 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors"
        >
          <CalendarIcon className="size-3.5" />
          <span>{formatMeetingDay(date)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <DatePickerCalendar
          mode="single"
          selected={date}
          onSelect={onSelectDate}
          className="rounded-md"
        />
      </PopoverContent>
    </Popover>
  )
}

interface SaveIndicatorProps {
  isSaving: boolean
  lastSaved: Date | null
}

function SaveIndicator({ isSaving, lastSaved }: SaveIndicatorProps) {
  if (!isSaving && !lastSaved) return null

  return (
    <div className="bg-background/85 text-muted-foreground hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs backdrop-blur-sm sm:flex">
      {isSaving ? (
        <>
          <Loader2 className="size-3 animate-spin" />
          <span>Saving</span>
        </>
      ) : (
        <>
          <Check className="size-3" />
          <span>{lastSaved ? formatRelativeTime(lastSaved) : 'Saved'}</span>
        </>
      )}
    </div>
  )
}

interface MetadataPillProps {
  icon: LucideIcon
  label: string
}

function MetadataPill({ icon: Icon, label }: MetadataPillProps) {
  return (
    <button
      type="button"
      className="border-border/80 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium shadow-sm transition-colors"
    >
      <Icon className="size-3.5" />
      <span>{label}</span>
    </button>
  )
}
