'use client'

import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@moldable/ui'
import type { MeetingSettings } from '@/types'

interface SettingsPanelProps {
  settings: MeetingSettings
  onChange: (settings: MeetingSettings) => void
  disabled?: boolean
}

export function SettingsPanel({
  settings,
  onChange,
  disabled,
}: SettingsPanelProps) {
  return (
    <div className="space-y-4 p-4">
      <h3 className="text-sm font-medium">Recording Settings</h3>

      <div className="space-y-4">
        {/* Save Audio Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="save-audio">Save audio</Label>
            <p className="text-xs text-muted-foreground">
              Save audio recording alongside transcript
            </p>
          </div>
          <Switch
            id="save-audio"
            checked={settings.saveAudio}
            onCheckedChange={(checked: boolean) =>
              onChange({ ...settings, saveAudio: checked })
            }
            disabled={disabled}
          />
        </div>

        {/* Speaker Diarization */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="diarization">Speaker detection</Label>
            <p className="text-xs text-muted-foreground">
              Identify different speakers in the meeting
            </p>
          </div>
          <Switch
            id="diarization"
            checked={settings.enableDiarization}
            onCheckedChange={(checked: boolean) =>
              onChange({ ...settings, enableDiarization: checked })
            }
            disabled={disabled}
          />
        </div>

        {/* Model Selection */}
        <div className="space-y-2">
          <Label htmlFor="model">Transcription model</Label>
          <Select
            value={settings.model}
            onValueChange={(value) =>
              onChange({
                ...settings,
                model: value as MeetingSettings['model'],
              })
            }
            disabled={disabled}
          >
            <SelectTrigger id="model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nova-2">Nova 2 (Fast)</SelectItem>
              <SelectItem value="nova-3">Nova 3 (Recommended)</SelectItem>
              <SelectItem value="nova-3-medical">Nova 3 Medical</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {settings.model === 'nova-2'
              ? 'Fast transcription for general use'
              : settings.model === 'nova-3'
                ? 'Most accurate general transcription'
                : 'Optimized for medical terminology'}
          </p>
        </div>

        {/* Language */}
        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Select
            value={settings.language}
            onValueChange={(value) =>
              onChange({ ...settings, language: value })
            }
            disabled={disabled}
          >
            <SelectTrigger id="language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en-US">English (US)</SelectItem>
              <SelectItem value="en-GB">English (UK)</SelectItem>
              <SelectItem value="en-AU">English (Australia)</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
              <SelectItem value="it">Italian</SelectItem>
              <SelectItem value="pt">Portuguese</SelectItem>
              <SelectItem value="nl">Dutch</SelectItem>
              <SelectItem value="ja">Japanese</SelectItem>
              <SelectItem value="zh">Chinese</SelectItem>
              <SelectItem value="ko">Korean</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
