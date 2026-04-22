export interface DeepgramLanguageOption {
  value: string
  label: string
}

export interface DeepgramLanguageModeOption {
  value: string
  label: string
  description: string
  languageSupport: string[]
}

export const DEEPGRAM_RECOMMENDED_LANGUAGE_OPTIONS: DeepgramLanguageModeOption[] =
  [
    {
      value: 'en-US',
      label: 'English',
      description: 'Best default for English meetings.',
      languageSupport: [
        'Dialects: United States, United Kingdom, Australia, Canada, Ireland, India, New Zealand',
      ],
    },
    {
      value: 'multi',
      label: 'Multi',
      description:
        "Detects multilingual conversations across Deepgram's supported live languages.",
      languageSupport: [
        'Supported languages: English, Spanish, French, German, Hindi, Russian, Portuguese, Japanese, Italian, Dutch',
      ],
    },
  ]

export const DEEPGRAM_PINNED_LANGUAGE_OPTIONS: DeepgramLanguageOption[] = [
  { value: 'ar', label: 'Arabic' },
  { value: 'be', label: 'Belarusian' },
  { value: 'bn', label: 'Bengali' },
  { value: 'bs', label: 'Bosnian' },
  { value: 'bg', label: 'Bulgarian' },
  { value: 'ca', label: 'Catalan' },
  { value: 'zh', label: 'Chinese' },
  { value: 'hr', label: 'Croatian' },
  { value: 'cs', label: 'Czech' },
  { value: 'da', label: 'Danish' },
  { value: 'nl', label: 'Dutch' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-AU', label: 'English (Australia)' },
  { value: 'et', label: 'Estonian' },
  { value: 'fi', label: 'Finnish' },
  { value: 'nl-BE', label: 'Flemish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'de-CH', label: 'German (Switzerland)' },
  { value: 'el', label: 'Greek' },
  { value: 'he', label: 'Hebrew' },
  { value: 'hi', label: 'Hindi' },
  { value: 'hu', label: 'Hungarian' },
  { value: 'id', label: 'Indonesian' },
  { value: 'it', label: 'Italian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'kn', label: 'Kannada' },
  { value: 'ko', label: 'Korean' },
  { value: 'lv', label: 'Latvian' },
  { value: 'lt', label: 'Lithuanian' },
  { value: 'mk', label: 'Macedonian' },
  { value: 'ms', label: 'Malay' },
  { value: 'mr', label: 'Marathi' },
  { value: 'no', label: 'Norwegian' },
  { value: 'fa', label: 'Persian (Farsi)' },
  { value: 'pl', label: 'Polish' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ro', label: 'Romanian' },
  { value: 'ru', label: 'Russian' },
  { value: 'sr', label: 'Serbian' },
  { value: 'sk', label: 'Slovak' },
  { value: 'sl', label: 'Slovenian' },
  { value: 'es', label: 'Spanish' },
  { value: 'sv', label: 'Swedish' },
  { value: 'tl', label: 'Tagalog' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'tr', label: 'Turkish' },
  { value: 'uk', label: 'Ukrainian' },
  { value: 'ur', label: 'Urdu' },
  { value: 'vi', label: 'Vietnamese' },
]

export function getDeepgramLanguageOption(
  language: string,
): DeepgramLanguageModeOption | DeepgramLanguageOption {
  return (
    DEEPGRAM_RECOMMENDED_LANGUAGE_OPTIONS.find(
      (option) => option.value === language,
    ) ??
    DEEPGRAM_PINNED_LANGUAGE_OPTIONS.find(
      (option) => option.value === language,
    ) ??
    DEEPGRAM_RECOMMENDED_LANGUAGE_OPTIONS[0]!
  )
}

export function getDeepgramLanguageDescription(language: string): string {
  const recommended = DEEPGRAM_RECOMMENDED_LANGUAGE_OPTIONS.find(
    (option) => option.value === language,
  )
  if (recommended) return recommended.description

  const pinned = getDeepgramLanguageOption(language)
  return `Pinned to ${pinned.label}.`
}
