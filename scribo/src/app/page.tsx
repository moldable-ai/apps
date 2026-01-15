'use client'

import {
  ArrowLeftRight,
  Loader2,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { MarkdownEditor } from '@moldable-ai/editor'
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
  Input,
  ScrollArea,
  cn,
} from '@moldable-ai/ui'
import { LANGUAGES, Language, isRTL } from '@/lib/languages'
import { TranslationError, translateText } from '@/lib/translate'
import type { JournalEntry } from '@/lib/types'
import { useDebouncedCallback } from '@/hooks/use-debounce'
import { useElevenLabsTTS } from '@/hooks/use-elevenlabs-tts'
import {
  generateId,
  useEntries,
  useSaveEntries,
  useUpdateEntriesCache,
} from '@/hooks/use-entries'
import { EmptyState } from '@/components/empty-state'
import { LanguagePicker } from '@/components/language-picker'
import { TranslationView } from '@/components/translation-view'

interface ErrorState {
  message: string
  code?: string
}

export default function Home() {
  const { data: entries = [], isLoading } = useEntries()
  const { mutate: saveEntries } = useSaveEntries()
  const updateCache = useUpdateEntriesCache()

  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const [sourceLanguage, setSourceLanguage] = useState<Language>('en')
  const [targetLanguage, setTargetLanguage] = useState<Language>('fr')
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationError, setTranslationError] = useState<ErrorState | null>(
    null,
  )

  // Derive current entry from entries list
  const currentEntry = entries.find((e) => e.id === currentEntryId) ?? null

  // Auto-select first entry when entries load
  const hasAutoSelected = useRef(false)
  if (!hasAutoSelected.current && entries.length > 0 && !currentEntryId) {
    hasAutoSelected.current = true
    const first = entries[0]!
    setCurrentEntryId(first.id)
    setSourceLanguage(first.sourceLanguage)
    setTargetLanguage(first.targetLanguage)
  }

  // AbortController for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null)

  // TTS for speaking translated text
  const {
    speak: speakTTS,
    stop: stopTTS,
    isPlaying: isSpeaking,
    isLoading: isTTSLoading,
  } = useElevenLabsTTS()

  const doTranslate = useCallback(
    async (
      text: string,
      entryId: string,
      srcLang: Language,
      tgtLang: Language,
    ) => {
      if (!text.trim()) return

      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      setIsTranslating(true)
      setTranslationError(null)

      try {
        // Get the current entry's cache (loaded from disk)
        const entry = entries.find((e) => e.id === entryId)
        const existingCache = entry?.translationCache

        const result = await translateText(
          text,
          srcLang,
          tgtLang,
          existingCache,
          abortControllerRef.current.signal,
        )

        // Update entry with translation AND the updated cache (both saved to disk)
        updateCache((prev) => {
          const newEntries = prev.map((e) =>
            e.id === entryId
              ? {
                  ...e,
                  translation: result.translatedText,
                  translationCache: result.cache,
                  updatedAt: new Date(),
                }
              : e,
          )
          // Save in background (persists cache to disk with entry JSON)
          saveEntries(newEntries)
          return newEntries
        })
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }
        console.error('Translation error:', error)
        if (error instanceof TranslationError) {
          setTranslationError({ message: error.message, code: error.code })
        } else {
          setTranslationError({
            message:
              error instanceof Error ? error.message : 'Translation failed',
          })
        }
      } finally {
        setIsTranslating(false)
      }
    },
    [entries, updateCache, saveEntries],
  )

  // Debounced translation - waits 1000ms after typing stops
  const { debouncedCallback: debouncedTranslate, flush: flushTranslate } =
    useDebouncedCallback(doTranslate, 1000)

  const handleTextChange = useCallback(
    (text: string) => {
      if (!currentEntryId) return

      // Optimistically update cache
      updateCache((prev) => {
        const newEntries = prev.map((e) =>
          e.id === currentEntryId
            ? { ...e, content: text, updatedAt: new Date() }
            : e,
        )
        // Save in background
        saveEntries(newEntries)
        return newEntries
      })

      // Trigger debounced translation
      debouncedTranslate(text, currentEntryId, sourceLanguage, targetLanguage)
    },
    [
      currentEntryId,
      debouncedTranslate,
      sourceLanguage,
      targetLanguage,
      updateCache,
      saveEntries,
    ],
  )

  // Handle language changes - update entry, clear stale cache, and retranslate
  const handleSourceLanguageChange = useCallback(
    (newLang: Language) => {
      // Stop any playing TTS since we're changing languages
      stopTTS()

      const newTarget =
        newLang === targetLanguage ? sourceLanguage : targetLanguage

      if (newLang === targetLanguage) {
        setTargetLanguage(sourceLanguage)
      }
      setSourceLanguage(newLang)

      if (currentEntryId && currentEntry) {
        // Update entry and clear stale translation cache (language pair changed)
        updateCache((prev) => {
          const newEntries = prev.map((e) =>
            e.id === currentEntryId
              ? {
                  ...e,
                  sourceLanguage: newLang,
                  targetLanguage: newTarget,
                  translationCache: undefined, // Clear cache - language pair changed
                  updatedAt: new Date(),
                }
              : e,
          )
          saveEntries(newEntries)
          return newEntries
        })

        // Retranslate immediately (no debounce)
        if (currentEntry.content.trim()) {
          flushTranslate(
            currentEntry.content,
            currentEntryId,
            newLang,
            newTarget,
          )
        }
      }
    },
    [
      currentEntry,
      currentEntryId,
      sourceLanguage,
      targetLanguage,
      flushTranslate,
      stopTTS,
      updateCache,
      saveEntries,
    ],
  )

  const handleTargetLanguageChange = useCallback(
    (newLang: Language) => {
      // Stop any playing TTS since we're changing languages
      stopTTS()

      const newSource =
        newLang === sourceLanguage ? targetLanguage : sourceLanguage

      if (newLang === sourceLanguage) {
        setSourceLanguage(targetLanguage)
      }
      setTargetLanguage(newLang)

      if (currentEntryId && currentEntry) {
        // Update entry and clear stale translation cache (language pair changed)
        updateCache((prev) => {
          const newEntries = prev.map((e) =>
            e.id === currentEntryId
              ? {
                  ...e,
                  sourceLanguage: newSource,
                  targetLanguage: newLang,
                  translationCache: undefined, // Clear cache - language pair changed
                  updatedAt: new Date(),
                }
              : e,
          )
          saveEntries(newEntries)
          return newEntries
        })

        // Retranslate immediately (no debounce)
        if (currentEntry.content.trim()) {
          flushTranslate(
            currentEntry.content,
            currentEntryId,
            newSource,
            newLang,
          )
        }
      }
    },
    [
      currentEntry,
      currentEntryId,
      sourceLanguage,
      targetLanguage,
      flushTranslate,
      stopTTS,
      updateCache,
      saveEntries,
    ],
  )

  const createNewEntry = useCallback(() => {
    const now = new Date()
    const newEntry: JournalEntry = {
      id: generateId(),
      title: `Entry ${now.toLocaleDateString()}`,
      content: '',
      translation: '',
      sourceLanguage,
      targetLanguage,
      createdAt: now,
      updatedAt: now,
    }

    updateCache((prev) => {
      const newEntries = [newEntry, ...prev]
      saveEntries(newEntries)
      return newEntries
    })

    setCurrentEntryId(newEntry.id)
    setTranslationError(null)
  }, [sourceLanguage, targetLanguage, updateCache, saveEntries])

  const handleTitleChange = useCallback(
    (title: string) => {
      if (!currentEntryId) return

      updateCache((prev) => {
        const newEntries = prev.map((e) =>
          e.id === currentEntryId ? { ...e, title, updatedAt: new Date() } : e,
        )
        saveEntries(newEntries)
        return newEntries
      })
    },
    [currentEntryId, updateCache, saveEntries],
  )

  const deleteEntry = useCallback(
    (entryId: string) => {
      // Cancel any in-flight translation if deleting current entry
      if (entryId === currentEntryId && abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Stop TTS if playing
      stopTTS()

      updateCache((prev) => {
        const newEntries = prev.filter((e) => e.id !== entryId)
        saveEntries(newEntries)

        // If we deleted the current entry, select the first remaining entry
        if (entryId === currentEntryId) {
          const nextEntry = newEntries[0]
          if (nextEntry) {
            setCurrentEntryId(nextEntry.id)
            setSourceLanguage(nextEntry.sourceLanguage)
            setTargetLanguage(nextEntry.targetLanguage)
          } else {
            setCurrentEntryId(null)
          }
          setTranslationError(null)
          setIsTranslating(false)
        }

        return newEntries
      })
    },
    [currentEntryId, updateCache, saveEntries, stopTTS],
  )

  const selectEntry = useCallback(
    (entry: JournalEntry) => {
      // Cancel any in-flight translation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Stop any playing TTS
      stopTTS()

      setCurrentEntryId(entry.id)
      setSourceLanguage(entry.sourceLanguage)
      setTargetLanguage(entry.targetLanguage)
      setTranslationError(null)
      setIsTranslating(false)
    },
    [stopTTS],
  )

  const handleSwapLanguages = useCallback(() => {
    if (!currentEntry || !currentEntryId) return

    const newSourceLang = targetLanguage
    const newTargetLang = sourceLanguage

    setSourceLanguage(newSourceLang)
    setTargetLanguage(newTargetLang)

    updateCache((prev) => {
      const newEntries = prev.map((e) =>
        e.id === currentEntryId
          ? {
              ...e,
              content: currentEntry.translation,
              translation: currentEntry.content,
              sourceLanguage: newSourceLang,
              targetLanguage: newTargetLang,
              translationCache: undefined, // Clear cache - content swapped
              updatedAt: new Date(),
            }
          : e,
      )
      saveEntries(newEntries)
      return newEntries
    })
  }, [
    currentEntry,
    currentEntryId,
    sourceLanguage,
    targetLanguage,
    updateCache,
    saveEntries,
  ])

  // Show loading state
  if (isLoading) {
    return (
      <div className="bg-background flex h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    )
  }

  // Show full-width empty state when no entries
  if (entries.length === 0) {
    return (
      <div className="bg-background flex h-screen w-full overflow-x-hidden">
        <EmptyState onCreateEntry={createNewEntry} className="flex-1" />
      </div>
    )
  }

  return (
    <div className="bg-background flex h-screen w-full overflow-x-hidden">
      {/* Sidebar - Entry list */}
      <aside className="border-border bg-sidebar flex w-72 shrink-0 flex-col border-r">
        <header className="border-border flex h-12 items-center border-b px-2">
          <Button size="sm" onClick={createNewEntry} className="w-full">
            New Entry
          </Button>
        </header>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  'group relative mb-1 rounded-lg transition',
                  currentEntryId === entry.id
                    ? 'bg-sidebar-accent'
                    : 'hover:bg-sidebar-accent/50',
                )}
              >
                <button
                  onClick={() => selectEntry(entry)}
                  className="w-full cursor-pointer p-3 text-left"
                >
                  <div className="mb-1 line-clamp-1 pr-6 text-sm font-medium">
                    {entry.title || 'Untitled'}
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    <span>
                      {LANGUAGES[entry.sourceLanguage].flag} →{' '}
                      {LANGUAGES[entry.targetLanguage].flag}
                    </span>
                    <span>·</span>
                    <span>{entry.createdAt.toLocaleDateString()}</span>
                  </div>
                </button>

                {/* Delete button - appears on hover */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="hover:bg-destructive/10 hover:text-destructive absolute right-2 top-2 flex size-6 cursor-pointer items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100"
                      title="Delete entry"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete entry?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete &quot;
                        {entry.title || 'Untitled'}&quot;. This action cannot be
                        undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteEntry(entry.id)}
                        className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Main editor area */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Split editor */}
        {currentEntry ? (
          <>
            {/* Header row: title, language selector/flipper, speak button */}
            <header className="border-border flex h-12 items-center border-b px-4">
              <div className="mx-auto flex w-full min-w-0 max-w-6xl items-center gap-2">
                <Input
                  value={currentEntry.title ?? ''}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="h-8 flex-1 border-none bg-transparent px-0 text-lg font-medium shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Entry title"
                />

                {/* Right side: language selector + separator + speak button */}
                <div className="flex items-center gap-2">
                  {/* Language selector with flipper */}
                  <div className="flex items-center gap-1">
                    <LanguagePicker
                      value={sourceLanguage}
                      onChange={handleSourceLanguageChange}
                      excludeLanguage={targetLanguage}
                    />
                    <button
                      onClick={handleSwapLanguages}
                      className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors"
                      title="Swap languages"
                    >
                      <ArrowLeftRight className="size-4" />
                    </button>
                    <LanguagePicker
                      value={targetLanguage}
                      onChange={handleTargetLanguageChange}
                      excludeLanguage={sourceLanguage}
                    />
                    {isTranslating && (
                      <Loader2 className="text-primary ml-1 size-4 animate-spin" />
                    )}
                  </div>

                  {/* Vertical separator */}
                  <div className="bg-border h-5 w-px" />

                  {/* Speak button */}
                  <button
                    onClick={() => {
                      if (isSpeaking) {
                        stopTTS()
                      } else if (currentEntry.translation) {
                        speakTTS(currentEntry.translation, targetLanguage)
                      }
                    }}
                    disabled={
                      isTTSLoading ||
                      isTranslating ||
                      !currentEntry?.translation ||
                      !!translationError
                    }
                    className={cn(
                      'flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors',
                      isSpeaking
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      (isTTSLoading ||
                        isTranslating ||
                        !currentEntry?.translation ||
                        !!translationError) &&
                        'cursor-not-allowed opacity-50',
                    )}
                    title={
                      isSpeaking ? 'Stop speaking' : 'Listen to translation'
                    }
                  >
                    {isTTSLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : isSpeaking ? (
                      <VolumeX className="size-4" />
                    ) : (
                      <Volume2 className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            </header>

            <div className="relative mx-auto flex w-full max-w-6xl flex-1 overflow-hidden">
              {/* Source text */}
              <div className="border-border flex min-w-0 flex-1 flex-col border-r">
                <div
                  dir={isRTL(sourceLanguage) ? 'rtl' : 'ltr'}
                  className="min-w-0 flex-1 overflow-auto p-6 pb-[var(--chat-safe-padding)]"
                >
                  <MarkdownEditor
                    value={currentEntry.content}
                    onChange={handleTextChange}
                    placeholder={`Write in ${LANGUAGES[sourceLanguage].name}...`}
                    autoFocus
                    minHeight="100%"
                    maxHeight="none"
                    hideMarkdownHint
                    contentClassName="prose-base! break-words [overflow-wrap:anywhere]"
                  />
                </div>
              </div>

              {/* Translation */}
              <div className="bg-primary/5 flex min-w-0 flex-1 flex-col">
                {translationError ? (
                  <div className="min-w-0 flex-1 overflow-auto p-6 pb-[var(--chat-safe-padding)]">
                    <div className="border-warning bg-warning/10 rounded-lg border p-4">
                      <div className="text-warning-foreground mb-2 font-medium">
                        {translationError.code === 'MISSING_API_KEY'
                          ? '⚠️ API Key Required'
                          : '⚠️ Translation Error'}
                      </div>
                      <div className="text-warning-foreground/80 mb-3 text-sm">
                        {translationError.message}
                      </div>
                      {translationError.code === 'MISSING_API_KEY' && (
                        <div className="text-warning-foreground/60 text-xs">
                          <div className="mb-1 font-medium">Quick setup:</div>
                          <ol className="list-inside list-decimal space-y-1">
                            <li>
                              Get a free key at{' '}
                              <a
                                href="https://www.deepl.com/pro-api"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                              >
                                deepl.com/pro-api
                              </a>
                            </li>
                            <li>
                              Create{' '}
                              <code className="bg-warning/20 rounded px-1">
                                apps/scribo/.env.local
                              </code>
                            </li>
                            <li>
                              Add:{' '}
                              <code className="bg-warning/20 rounded px-1">
                                DEEPL_API_KEY=your-key
                              </code>
                            </li>
                            <li>Restart the app</li>
                          </ol>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    dir={isRTL(targetLanguage) ? 'rtl' : 'ltr'}
                    className={cn(
                      'min-w-0 flex-1 overflow-auto break-words p-6 pb-[var(--chat-safe-padding)] [overflow-wrap:anywhere]',
                      isTranslating && 'opacity-50',
                    )}
                  >
                    <TranslationView
                      translation={currentEntry.translation}
                      targetLanguage={targetLanguage}
                      sourceLanguage={sourceLanguage}
                      isTranslating={isTranslating}
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          // Entry exists but not selected - auto-select first entry
          <div className="text-muted-foreground flex flex-1 items-center justify-center">
            Select an entry from the sidebar
          </div>
        )}
      </main>
    </div>
  )
}
