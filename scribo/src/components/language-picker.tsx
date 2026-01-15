'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger, cn } from '@moldable-ai/ui'
import { LANGUAGES, Language } from '@/lib/languages'

interface LanguagePickerProps {
  value: Language
  onChange: (language: Language) => void
  /** Language to exclude from selection (e.g., the other language in the pair) */
  excludeLanguage?: Language
  disabled?: boolean
  className?: string
}

export function LanguagePicker({
  value,
  onChange,
  excludeLanguage,
  disabled,
  className,
}: LanguagePickerProps) {
  const [open, setOpen] = useState(false)
  const currentLang = LANGUAGES[value]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className={cn(
            'flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
            'hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        >
          <span className="text-base">{currentLang.flag}</span>
          <span>{currentLang.name}</span>
          <ChevronDown className="text-muted-foreground size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <div className="grid grid-cols-4 gap-1">
          {Object.values(LANGUAGES)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((lang) => {
              const isExcluded = lang.code === excludeLanguage
              const isSelected = lang.code === value

              return (
                <button
                  key={lang.code}
                  onClick={() => {
                    if (!isExcluded) {
                      onChange(lang.code)
                      setOpen(false)
                    }
                  }}
                  disabled={isExcluded}
                  className={cn(
                    'flex flex-col items-center gap-0.5 rounded-lg p-2 text-center transition-colors',
                    !isExcluded && 'hover:bg-muted cursor-pointer',
                    isExcluded && 'cursor-not-allowed opacity-30',
                    isSelected &&
                      !isExcluded &&
                      'bg-primary/10 ring-primary ring-1',
                  )}
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span className="text-muted-foreground line-clamp-1 text-xs">
                    {lang.name}
                  </span>
                </button>
              )
            })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
