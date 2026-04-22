'use client'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@moldable-ai/ui'
import {
  DEEPGRAM_PINNED_LANGUAGE_OPTIONS,
  DEEPGRAM_RECOMMENDED_LANGUAGE_OPTIONS,
} from '@/lib/deepgram-language-options'

interface DeepgramLanguageSelectorProps {
  value: string
  onChange: (value: string) => void
  triggerClassName?: string
  contentClassName?: string
}

export function DeepgramLanguageSelector({
  value,
  onChange,
  triggerClassName,
  contentClassName,
}: DeepgramLanguageSelectorProps) {
  return (
    <div className="w-48 max-w-48">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder="Select a language" />
        </SelectTrigger>
        <SelectContent
          position="popper"
          sideOffset={6}
          collisionPadding={160}
          className={contentClassName}
        >
          <SelectGroup>
            <SelectLabel>Recommended</SelectLabel>
            {DEEPGRAM_RECOMMENDED_LANGUAGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Pinned language</SelectLabel>
            {DEEPGRAM_PINNED_LANGUAGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}
