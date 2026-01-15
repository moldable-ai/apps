/**
 * Languages supported by both:
 * - ElevenLabs Multilingual v2: https://elevenlabs.io/blog/eleven-multilingual-v2
 * - DeepL Translator (classic model): https://support.deepl.com/hc/en-us/articles/360019925219
 */
export type Language =
  | 'en'
  | 'fr'
  | 'es'
  | 'de'
  | 'it'
  | 'pt'
  | 'ja'
  | 'zh'
  | 'ko'
  | 'pl'
  | 'ru'
  | 'nl'
  | 'tr'
  | 'sv'
  | 'id'
  | 'cs'
  | 'ro'
  | 'hu'
  | 'el'
  | 'fi'
  | 'uk'
  | 'ar'
  | 'da'

export interface LanguageInfo {
  code: Language
  name: string
  nativeName: string
  flag: string
  rtl?: boolean
}

/** Check if a language is RTL */
export function isRTL(code: Language): boolean {
  return LANGUAGES[code]?.rtl === true
}

export const LANGUAGES: Record<Language, LanguageInfo> = {
  // Common languages first
  en: { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  fr: { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  it: { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  pt: { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  nl: { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  pl: { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  ru: { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  uk: { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },

  // Asian languages
  zh: { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  ko: { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  id: {
    code: 'id',
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    flag: '🇮🇩',
  },

  // Middle Eastern
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    rtl: true,
  },
  tr: { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },

  // Nordic languages
  sv: { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  da: { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
  fi: { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },

  // Other European
  cs: { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿' },
  ro: { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴' },
  hu: { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺' },
  el: { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷' },
}

export const LANGUAGE_LIST = Object.values(LANGUAGES)
