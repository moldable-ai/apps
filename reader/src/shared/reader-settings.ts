/** Concrete reading-surface palettes. */
export type ConcreteReaderTheme = 'paper' | 'sepia' | 'slate' | 'dark' | 'night'
/** Reading theme. 'system' follows the app's resolved light/dark mode. */
export type ReaderTheme = ConcreteReaderTheme | 'system'
export type ReaderFont = 'serif' | 'sans' | 'mono' | 'dyslexic'
export type ReaderLayout = 'paginated' | 'scroll'

export interface ReaderSettings {
  font: ReaderFont
  /** Body font size in px */
  fontSize: number
  /** Unitless line height */
  lineHeight: number
  /** Max content column width in px */
  contentWidth: number
  /** Justify body text */
  justify: boolean
  theme: ReaderTheme
  layout: ReaderLayout
  /** Speed-reading words per minute */
  wpm: number
  /** Words shown per flash in speed reading (1..4) */
  chunkSize: number
  /** Add a small pause on sentence-ending punctuation in speed reading */
  punctuationPause: boolean
}

export interface ReaderSettingsResponse {
  settings: ReaderSettings
}

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  font: 'serif',
  fontSize: 19,
  lineHeight: 1.7,
  contentWidth: 660,
  justify: false,
  theme: 'system',
  layout: 'paginated',
  wpm: 350,
  chunkSize: 1,
  punctuationPause: true,
}

export const READER_FONT_STACKS: Record<ReaderFont, string> = {
  serif:
    "'New York', 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif",
  sans: "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace",
  // Bundled OpenDyslexic (see @font-face in globals.css), with sans fallbacks.
  dyslexic:
    "'OpenDyslexic', 'Comic Sans MS', 'Inter', ui-sans-serif, system-ui, sans-serif",
}

export interface ReaderThemeColors {
  /** Reading surface background */
  bg: string
  /** Body text */
  fg: string
  /** Muted text (chapter meta, captions) */
  muted: string
  /** Selection / accent highlight */
  accent: string
  /** Human label */
  label: string
  /** Whether this theme is dark (affects chrome and image dimming) */
  dark: boolean
}

export const READER_THEMES: Record<ConcreteReaderTheme, ReaderThemeColors> = {
  paper: {
    bg: '#fbfbfa',
    fg: '#1d1c1a',
    muted: '#6f6c66',
    accent: '#b4541a',
    label: 'Paper',
    dark: false,
  },
  sepia: {
    bg: '#f4ecd8',
    fg: '#3a2f23',
    muted: '#8a7355',
    accent: '#9a5b1e',
    label: 'Sepia',
    dark: false,
  },
  slate: {
    bg: '#e7e9ec',
    fg: '#23282e',
    muted: '#5f6873',
    accent: '#2f6f8f',
    label: 'Slate',
    dark: false,
  },
  dark: {
    bg: '#1b1b1d',
    fg: '#d8d6d1',
    muted: '#8d8b86',
    accent: '#d98a4a',
    label: 'Dark',
    dark: true,
  },
  night: {
    bg: '#0c0d10',
    fg: '#b9bcc4',
    muted: '#6b6f78',
    accent: '#7aa2d6',
    label: 'Night',
    dark: true,
  },
}

/** The concrete reading theme used for 'system' in each app mode. */
export const SYSTEM_THEME_FOR_MODE: Record<
  'light' | 'dark',
  ConcreteReaderTheme
> = {
  light: 'paper',
  dark: 'dark',
}

/**
 * Resolve a reading theme to concrete colors. 'system' follows the app's
 * resolved light/dark mode so the reader adapts like a native app.
 */
export function resolveReaderTheme(
  theme: ReaderTheme,
  mode: 'light' | 'dark',
): ReaderThemeColors {
  if (theme === 'system') return READER_THEMES[SYSTEM_THEME_FOR_MODE[mode]]
  return READER_THEMES[theme]
}

export const READER_FONT_SIZE = { min: 14, max: 30, step: 1 }
export const READER_LINE_HEIGHT = { min: 1.3, max: 2.2, step: 0.05 }
export const READER_CONTENT_WIDTH = { min: 480, max: 900, step: 20 }
export const READER_WPM = { min: 100, max: 1200, step: 25 }
export const READER_CHUNK = { min: 1, max: 4, step: 1 }

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

/** Validate and clamp an arbitrary partial into a complete ReaderSettings. */
export function normalizeReaderSettings(
  input: Partial<ReaderSettings> | null | undefined,
): ReaderSettings {
  const base = DEFAULT_READER_SETTINGS
  const raw = input ?? {}
  const font: ReaderFont =
    raw.font === 'sans' ||
    raw.font === 'mono' ||
    raw.font === 'serif' ||
    raw.font === 'dyslexic'
      ? raw.font
      : base.font
  const theme: ReaderTheme =
    raw.theme === 'system' || (raw.theme && raw.theme in READER_THEMES)
      ? (raw.theme as ReaderTheme)
      : base.theme
  const layout: ReaderLayout =
    raw.layout === 'scroll' || raw.layout === 'paginated'
      ? raw.layout
      : base.layout
  return {
    font,
    theme,
    layout,
    fontSize: Math.round(
      clampNumber(
        raw.fontSize,
        READER_FONT_SIZE.min,
        READER_FONT_SIZE.max,
        base.fontSize,
      ),
    ),
    lineHeight: clampNumber(
      raw.lineHeight,
      READER_LINE_HEIGHT.min,
      READER_LINE_HEIGHT.max,
      base.lineHeight,
    ),
    contentWidth: Math.round(
      clampNumber(
        raw.contentWidth,
        READER_CONTENT_WIDTH.min,
        READER_CONTENT_WIDTH.max,
        base.contentWidth,
      ),
    ),
    justify: typeof raw.justify === 'boolean' ? raw.justify : base.justify,
    wpm: Math.round(
      clampNumber(raw.wpm, READER_WPM.min, READER_WPM.max, base.wpm),
    ),
    chunkSize: Math.round(
      clampNumber(
        raw.chunkSize,
        READER_CHUNK.min,
        READER_CHUNK.max,
        base.chunkSize,
      ),
    ),
    punctuationPause:
      typeof raw.punctuationPause === 'boolean'
        ? raw.punctuationPause
        : base.punctuationPause,
  }
}

/** Split chapter text into speed-reading word tokens (keeps trailing punctuation). */
export function tokenizeWords(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((word) => word.length > 0)
}
