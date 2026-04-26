'use client'

import {
  Archive,
  Languages,
  Mic,
  Monitor,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  Waves,
} from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  cn,
} from '@moldable-ai/ui'
import { getDeepgramLanguageDescription } from '@/lib/deepgram-language-options'
import { DeepgramLanguageSelector } from './deepgram-language-selector'
import type { MeetingSettings } from '@/types'

type AudioSource = 'microphone' | 'both' | 'system'

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: MeetingSettings
  onSettingsChange: (settings: MeetingSettings) => void
  audioSource: AudioSource
  onAudioSourceChange: (source: AudioSource) => void
  showAudioSource: boolean
  systemAudioAvailable: boolean
  recordingActive: boolean
}

interface PreferenceSectionProps {
  title: string
  children: ReactNode
}

interface PreferenceRowProps {
  icon: ComponentType<{ className?: string }>
  title: string
  description: ReactNode
  children: ReactNode
  className?: string
}

const modelDescriptions: Record<MeetingSettings['model'], string> = {
  'nova-3': 'Most accurate general transcription',
  'nova-3-medical': 'Optimized for medical terminology',
}

const selectTriggerClassName =
  'h-8 w-48 rounded-lg border-border/70 bg-background/60 text-xs shadow-none hover:bg-background/80 focus:bg-background/80 focus-visible:ring-2 focus-visible:ring-primary/20 data-[state=open]:bg-background/80 dark:bg-background/30 dark:hover:bg-background/45 dark:focus:bg-background/45 dark:data-[state=open]:bg-background/45'

export function SettingsModal({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  audioSource,
  onAudioSourceChange,
  showAudioSource,
  systemAudioAvailable,
  recordingActive,
}: SettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/80 bg-background top-[calc(50%_-_var(--chat-safe-padding,0px)/2)] !flex max-h-[calc(100dvh_-_var(--chat-safe-padding,0px)_-_2rem)] !w-[min(960px,calc(100vw_-_2rem))] !max-w-[min(960px,calc(100vw_-_2rem))] flex-col gap-0 overflow-hidden rounded-2xl p-0 shadow-2xl sm:!max-w-[min(960px,calc(100vw_-_2rem))]">
        <DialogHeader className="border-border/80 border-b px-6 py-5">
          <DialogTitle className="font-serif text-2xl font-normal leading-none tracking-normal">
            Preferences
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5">
          <div className="space-y-6">
            {showAudioSource ? (
              <PreferenceSection title="Recording">
                <PreferenceRow
                  icon={Waves}
                  title="Audio source"
                  description={
                    recordingActive
                      ? 'Audio source can be changed before the next meeting'
                      : 'Choose what Meetings listens to when a meeting starts'
                  }
                >
                  <div className="border-border bg-muted/35 dark:bg-muted/25 grid w-80 grid-cols-3 rounded-full border p-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={recordingActive}
                      onClick={() => onAudioSourceChange('microphone')}
                      className={cn(
                        'text-muted-foreground hover:bg-background/80 hover:text-foreground h-7 cursor-pointer rounded-full px-2.5 text-xs font-medium shadow-none disabled:cursor-not-allowed',
                        audioSource === 'microphone' &&
                          'bg-background text-foreground hover:bg-background shadow-sm',
                      )}
                    >
                      <Mic className="mr-1.5 size-3.5" />
                      Mic
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={recordingActive || !systemAudioAvailable}
                      onClick={() => onAudioSourceChange('both')}
                      title={
                        !systemAudioAvailable
                          ? 'Mixed audio requires native system capture in Moldable desktop'
                          : undefined
                      }
                      className={cn(
                        'text-muted-foreground hover:bg-background/80 hover:text-foreground h-7 cursor-pointer rounded-full px-2.5 text-xs font-medium shadow-none disabled:cursor-not-allowed',
                        audioSource === 'both' &&
                          'bg-background text-foreground hover:bg-background shadow-sm',
                      )}
                    >
                      <Waves className="mr-1.5 size-3.5" />
                      Blend
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={recordingActive || !systemAudioAvailable}
                      onClick={() => onAudioSourceChange('system')}
                      title={
                        !systemAudioAvailable
                          ? 'System audio requires native system capture in Moldable desktop'
                          : undefined
                      }
                      className={cn(
                        'text-muted-foreground hover:bg-background/80 hover:text-foreground h-7 cursor-pointer rounded-full px-2.5 text-xs font-medium shadow-none disabled:cursor-not-allowed',
                        audioSource === 'system' &&
                          'bg-background text-foreground hover:bg-background shadow-sm',
                      )}
                    >
                      <Monitor className="mr-1.5 size-3.5" />
                      System
                    </Button>
                  </div>
                </PreferenceRow>
              </PreferenceSection>
            ) : null}

            <PreferenceSection title="Transcription">
              <PreferenceRow
                icon={SlidersHorizontal}
                title="Transcription model"
                description={modelDescriptions[settings.model]}
              >
                <Select
                  value={settings.model}
                  onValueChange={(value) =>
                    onSettingsChange({
                      ...settings,
                      model: value as MeetingSettings['model'],
                    })
                  }
                >
                  <SelectTrigger className={selectTriggerClassName}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    sideOffset={6}
                    collisionPadding={160}
                    className="max-h-[min(18rem,calc(100dvh_-_var(--chat-safe-padding,0px)_-_3rem))]"
                  >
                    <SelectItem value="nova-3">Nova 3</SelectItem>
                    <SelectItem value="nova-3-medical">
                      Nova 3 Medical
                    </SelectItem>
                  </SelectContent>
                </Select>
              </PreferenceRow>

              <PreferenceRow
                icon={Languages}
                title="Transcription language"
                description={
                  <>
                    <span>
                      Choose the language behavior used for Deepgram live
                      transcription.
                    </span>
                    <span className="mt-2 block opacity-75">
                      {getDeepgramLanguageDescription(settings.language)}
                    </span>
                  </>
                }
              >
                <DeepgramLanguageSelector
                  value={settings.language}
                  onChange={(value) =>
                    onSettingsChange({ ...settings, language: value })
                  }
                  triggerClassName={selectTriggerClassName}
                  contentClassName="max-h-[min(20rem,calc(100dvh_-_var(--chat-safe-padding,0px)_-_3rem))]"
                />
              </PreferenceRow>

              <PreferenceRow
                icon={UsersRound}
                title="Speaker detection"
                description="Separate transcript lines by speaker when possible"
              >
                <Switch
                  checked={settings.enableDiarization}
                  onCheckedChange={(checked) =>
                    onSettingsChange({
                      ...settings,
                      enableDiarization: checked,
                    })
                  }
                />
              </PreferenceRow>
            </PreferenceSection>

            <PreferenceSection title="Data">
              <PreferenceRow
                icon={ShieldCheck}
                title="Opt out of model training"
                description="Ask Deepgram not to use meeting audio or transcripts for model improvement."
              >
                <Switch
                  checked={settings.mipOptOut !== false}
                  onCheckedChange={(checked) =>
                    onSettingsChange({ ...settings, mipOptOut: checked })
                  }
                />
              </PreferenceRow>

              <PreferenceRow
                icon={Archive}
                title="Save audio"
                description="Keep microphone recordings alongside the transcript"
              >
                <Switch
                  checked={settings.saveAudio}
                  onCheckedChange={(checked) =>
                    onSettingsChange({ ...settings, saveAudio: checked })
                  }
                />
              </PreferenceRow>
            </PreferenceSection>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PreferenceSection({ title, children }: PreferenceSectionProps) {
  return (
    <section className="space-y-2.5">
      <h2 className="text-muted-foreground px-2 text-xs font-semibold">
        {title}
      </h2>
      <div className="border-border/80 bg-card/65 dark:bg-card/45 overflow-hidden rounded-xl border">
        {children}
      </div>
    </section>
  )
}

function PreferenceRow({
  icon: Icon,
  title,
  description,
  children,
  className,
}: PreferenceRowProps) {
  return (
    <div
      className={cn(
        'meetings-dashed-separator flex min-h-20 items-start gap-4 px-4 py-4',
        className,
      )}
    >
      <div className="bg-muted/70 text-muted-foreground dark:bg-muted/50 mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg">
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-foreground truncate text-sm font-medium">
          {title}
        </div>
        <div className="text-muted-foreground mt-1 max-w-md text-xs leading-snug opacity-75">
          {description}
        </div>
      </div>
      <div className="flex shrink-0 items-start">{children}</div>
    </div>
  )
}
