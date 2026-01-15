'use client'

import { BookOpen, Loader2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Markdown, cn } from '@moldable-ai/ui'
import type { Language } from '@/lib/languages'

// Map our language codes to BCP 47 language tags for the lang attribute
// This enables browser/OS-level dictionary lookups (e.g., macOS Dictionary, context menu)
const LANG_TO_BCP47: Record<Language, string> = {
  en: 'en',
  fr: 'fr',
  es: 'es',
  de: 'de',
  it: 'it',
  pt: 'pt',
  ja: 'ja',
  zh: 'zh',
  ko: 'ko',
  pl: 'pl',
  ru: 'ru',
  nl: 'nl',
  tr: 'tr',
  sv: 'sv',
  id: 'id',
  cs: 'cs',
  ro: 'ro',
  hu: 'hu',
  el: 'el',
  fi: 'fi',
  uk: 'uk',
  ar: 'ar',
  da: 'da',
}

interface TranslationViewProps {
  translation: string
  targetLanguage: Language
  sourceLanguage: Language
  isTranslating: boolean
  className?: string
}

interface LookupResult {
  word: string
  language: string
  phonetic?: string
  meanings: {
    partOfSpeech: string
    definition: string
    example?: string
  }[]
  translations?: {
    language: string
    word: string
  }[]
  error?: string
}

interface WordPopup {
  word: string
  x: number
  y: number
  isLoading: boolean
  result?: LookupResult
}

/**
 * TranslationView renders the translated text with:
 * 1. Proper `lang` attribute for browser/OS dictionary lookup (e.g., force-touch on macOS)
 * 2. Double-click on words to see definition
 */
function normalizeLookupWord(raw: string): string {
  // Trim common punctuation so double-clicking “commander,” works.
  // Uses unicode property escapes to keep letters/marks/numbers.
  return raw.replace(/^[^\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+$/gu, '')
}

export function TranslationView({
  translation,
  targetLanguage,
  sourceLanguage,
  isTranslating,
  className,
}: TranslationViewProps) {
  const [popup, setPopup] = useState<WordPopup | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close popup when clicking outside
  useEffect(() => {
    if (!popup) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setPopup(null)
      }
    }

    // Close on scroll
    const handleScroll = () => setPopup(null)

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [popup])

  // Lookup word via API
  const lookupWord = useCallback(
    async (word: string, x: number, y: number) => {
      setPopup({ word, x, y, isLoading: true })

      try {
        const params = new URLSearchParams({
          word,
          lang: targetLanguage,
          to: sourceLanguage,
        })

        const response = await fetch(`/api/lookup?${params.toString()}`)
        const result: LookupResult = await response.json()

        setPopup((prev) =>
          prev?.word === word ? { ...prev, isLoading: false, result } : prev,
        )
      } catch (error) {
        console.error('Lookup failed:', error)
        setPopup((prev) =>
          prev?.word === word
            ? {
                ...prev,
                isLoading: false,
                result: {
                  word,
                  language: targetLanguage,
                  meanings: [],
                  error: 'Failed to look up word',
                },
              }
            : prev,
        )
      }
    },
    [sourceLanguage, targetLanguage],
  )

  // Handle double-click to select and look up word
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const selection = window.getSelection()
      const selected = selection?.toString().trim() ?? ''
      const word = normalizeLookupWord(selected)

      if (word && word.length > 0 && !word.includes(' ') && word.length < 50) {
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          lookupWord(word, e.clientX - rect.left, e.clientY - rect.top)
        }
      }
    },
    [lookupWord],
  )

  const closePopup = useCallback(() => setPopup(null), [])

  const bcp47Lang = LANG_TO_BCP47[targetLanguage]

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      lang={bcp47Lang}
      onDoubleClick={handleDoubleClick}
    >
      {translation ? (
        <Markdown
          markdown={translation}
          className="w-full [&_.prose]:break-words [&_.prose]:[overflow-wrap:anywhere]"
        />
      ) : (
        <p className="text-muted-foreground italic">
          Translation will appear here...
        </p>
      )}

      {/* Word popup */}
      {popup && (
        <div
          className="border-border bg-popover absolute z-50 min-w-[220px] max-w-[360px] rounded-lg border p-3 shadow-lg"
          style={{
            left: Math.min(Math.max(popup.x - 110, 10), 180),
            top: popup.y + 20,
          }}
        >
          {popup.isLoading ? (
            <div className="text-muted-foreground flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span>Looking up...</span>
            </div>
          ) : popup.result ? (
            <div className="space-y-2">
              {/* Word header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-foreground text-lg font-semibold">
                    {popup.result.word}
                  </div>
                  {popup.result.phonetic && (
                    <div className="text-muted-foreground text-sm">
                      {popup.result.phonetic}
                    </div>
                  )}
                </div>
                <button
                  onClick={closePopup}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 cursor-pointer rounded p-1"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Translations (e.g., French → English) */}
              {popup.result.translations &&
                popup.result.translations.length > 0 && (
                  <div className="bg-muted/50 rounded-md px-2 py-1.5 text-sm">
                    <div className="text-muted-foreground text-xs font-medium">
                      Translation
                    </div>
                    <div className="text-foreground">
                      {Array.from(
                        new Set(popup.result.translations.map((t) => t.word)),
                      )
                        .slice(0, 3)
                        .join(', ')}
                    </div>
                  </div>
                )}

              {/* Meanings */}
              {popup.result.meanings.length > 0 ? (
                <div className="space-y-2">
                  {popup.result.meanings.slice(0, 3).map((meaning, i) => (
                    <div key={i} className="text-sm">
                      <span className="text-primary font-medium">
                        {meaning.partOfSpeech}
                      </span>
                      <p className="text-foreground mt-0.5">
                        {meaning.definition}
                      </p>
                      {meaning.example && (
                        <p className="text-muted-foreground mt-1 text-xs italic">
                          &quot;{meaning.example}&quot;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : popup.result.error ? (
                <div className="text-muted-foreground text-sm">
                  {popup.result.error}
                  <div className="mt-2 text-xs">
                    <strong>Tip:</strong> Select the word and use Force Touch
                    (macOS) or right-click → &quot;Look Up&quot;
                  </div>
                </div>
              ) : null}

              {/* Source indicator */}
              <div className="text-muted-foreground/60 flex items-center gap-1 pt-1 text-xs">
                <BookOpen className="size-3" />
                <span>FreeDictionaryAPI.com</span>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Hint for dictionary lookups */}
      {!isTranslating && translation && (
        <div className="text-muted-foreground/60 mt-4 flex items-center gap-1.5 text-xs">
          <BookOpen className="size-3" />
          <span>Double-click a word to look it up</span>
        </div>
      )}
    </div>
  )
}
