'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  Copy,
  History,
  Languages,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge,
  Button,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  Spinner,
  cn,
  useWorkspace,
} from '@moldable-ai/ui'
import { getDeepLFittingTextLength } from '@/lib/deepl-limits'
import {
  LANGUAGES,
  LANGUAGE_LIST,
  type Language,
  isRTL,
  languageLabel,
} from '@/lib/languages'
import type { SourceSelection, TranslationRecord } from '@/lib/types'

interface TranslateResponse {
  translatedText: string
  detectedSourceLanguage: Language
}

interface TranslateError {
  message: string
  missingCredential: boolean
}

function useHistory() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ['history', workspaceId],
    queryFn: async (): Promise<TranslationRecord[]> => {
      const res = await fetchWithWorkspace('/api/history')
      if (!res.ok) throw new Error('Failed to load history')
      return res.json()
    },
  })
}

/** Group the (already newest-first) history into labelled day buckets. */
function groupByDay(
  records: TranslationRecord[],
): { label: string; items: TranslationRecord[] }[] {
  const now = new Date()
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const todayStart = startOfDay(now)
  const dayMs = 24 * 60 * 60 * 1000

  const groups: { label: string; items: TranslationRecord[] }[] = []

  for (const record of records) {
    const date = new Date(record.createdAt)
    const dayStart = startOfDay(date)

    let label: string
    if (dayStart === todayStart) label = 'Today'
    else if (dayStart === todayStart - dayMs) label = 'Yesterday'
    else
      label = date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        ...(date.getFullYear() !== now.getFullYear()
          ? { year: 'numeric' }
          : {}),
      })

    const last = groups[groups.length - 1]
    if (last?.label === label) last.items.push(record)
    else groups.push({ label, items: [record] })
  }

  return groups
}

export default function Home() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  const [source, setSource] = useState<SourceSelection>('auto')
  const [target, setTarget] = useState<Language>('es')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [detected, setDetected] = useState<Language | null>(null)
  const [error, setError] = useState<TranslateError | null>(null)
  const [copied, setCopied] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const { data: history = [] } = useHistory()

  const invalidateHistory = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['history', workspaceId] })
  }, [queryClient, workspaceId])

  const translateMutation = useMutation({
    mutationFn: async (): Promise<TranslateResponse> => {
      const res = await fetchWithWorkspace('/api/translate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: input, from: source, to: target }),
      })
      const data = await res.json()
      if (!res.ok) {
        const err: TranslateError = {
          message:
            typeof data?.error === 'string' ? data.error : 'Translation failed',
          missingCredential: res.status === 502,
        }
        throw err
      }
      return data as TranslateResponse
    },
    onSuccess: async (data) => {
      setOutput(data.translatedText)
      setDetected(source === 'auto' ? data.detectedSourceLanguage : null)
      setError(null)
      if (input.trim() && data.translatedText.trim()) {
        await fetchWithWorkspace('/api/history', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            sourceText: input,
            translatedText: data.translatedText,
            requestedSource: source,
            sourceLanguage:
              source === 'auto' ? data.detectedSourceLanguage : source,
            targetLanguage: target,
          }),
        })
        invalidateHistory()
      }
    },
    onError: (err: TranslateError) => {
      setError(
        err.message
          ? err
          : { message: 'Translation failed', missingCredential: false },
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetchWithWorkspace(`/api/history/${id}`, { method: 'DELETE' })
    },
    onSuccess: invalidateHistory,
  })

  const clearMutation = useMutation({
    mutationFn: async () => {
      await fetchWithWorkspace('/api/history', { method: 'DELETE' })
    },
    onSuccess: invalidateHistory,
  })

  // How much of the input fits inside DeepL's request-size limit. Anything past
  // this index is highlighted in the editor as "won't be sent" so the user can
  // trim it themselves, rather than us silently truncating or showing raw byte
  // counts.
  const fittingLength = useMemo(
    () => getDeepLFittingTextLength(input, source, target),
    [input, source, target],
  )
  const overflowStart = fittingLength < input.length ? fittingLength : null
  const requestIsTooLarge = overflowStart !== null
  const canTranslate =
    input.trim().length > 0 &&
    !requestIsTooLarge &&
    !translateMutation.isPending
  const isPending = translateMutation.isPending

  const handleTranslate = useCallback(() => {
    if (input.trim().length === 0) return
    if (requestIsTooLarge) return
    translateMutation.mutate()
  }, [input, requestIsTooLarge, translateMutation])

  const handleSwap = useCallback(() => {
    const newSource: Language = source === 'auto' ? (detected ?? 'en') : source
    const nextInput = output || input
    setSource(target)
    setTarget(newSource)
    setInput(nextInput)
    setOutput('')
    setDetected(null)
    setError(null)
  }, [source, target, detected, output, input])

  const handleCopy = useCallback(async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
    } catch {
      // Clipboard may be unavailable; fail quietly.
    }
  }, [output])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  const restoreRecord = useCallback((record: TranslationRecord) => {
    setSource(record.requestedSource)
    setTarget(record.targetLanguage)
    setInput(record.sourceText)
    setOutput(record.translatedText)
    setDetected(
      record.requestedSource === 'auto' ? record.sourceLanguage : null,
    )
    setError(null)
    setHistoryOpen(false)
  }, [])

  const sourceLabel = useMemo(() => {
    if (source === 'auto') {
      return detected
        ? `Detected · ${languageLabel(detected)}`
        : 'Detect language'
    }
    return languageLabel(source)
  }, [source, detected])

  const groups = useMemo(() => groupByDay(history), [history])

  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 pb-[calc(var(--chat-safe-padding,0px)+1.5rem)] pt-6 sm:px-6">
        <div className="flex items-center gap-2">
          <LanguageBar
            source={source}
            target={target}
            sourceLabel={sourceLabel}
            onSourceChange={(value) => {
              setSource(value)
              setError(null)
            }}
            onTargetChange={(value) => {
              setTarget(value)
              setError(null)
            }}
            onSwap={handleSwap}
          />

          {history.length > 0 && (
            <>
              <Separator orientation="vertical" className="!h-6" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setHistoryOpen(true)}
                aria-label="Translation history"
                title="History"
                className="text-muted-foreground hover:text-foreground shrink-0 gap-1.5"
              >
                <History className="size-4" />
                <span className="text-xs tabular-nums">{history.length}</span>
              </Button>
            </>
          )}
        </div>

        <div className="border-border divide-border grid min-h-0 flex-1 divide-y overflow-hidden rounded-xl border md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="flex min-h-0 flex-col gap-3 p-4 sm:p-5">
            <div className="text-muted-foreground flex items-center justify-between text-xs font-medium">
              <span>{source === 'auto' ? 'Source' : sourceLabel}</span>
              {input.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setInput('')
                    setOutput('')
                    setDetected(null)
                    setError(null)
                  }}
                  className="hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <X className="size-3" /> Clear
                </button>
              )}
            </div>
            <SourceTextField
              value={input}
              dir={source !== 'auto' && isRTL(source) ? 'rtl' : 'ltr'}
              overflowStart={overflowStart}
              autoFocus
              onChange={setInput}
              onSubmit={handleTranslate}
            />
            <div className="flex items-center justify-between gap-3 text-xs">
              {requestIsTooLarge ? (
                <span className="text-destructive flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  Highlighted text is too long to send — trim it to translate.
                </span>
              ) : (
                <span />
              )}
              <span className="text-muted-foreground hidden shrink-0 sm:inline">
                ⌘↵ to translate
              </span>
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-3 p-4 sm:p-5">
            <div className="text-muted-foreground flex items-center justify-between text-xs font-medium">
              <span>{languageLabel(target)}</span>
              {output && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="size-3" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" /> Copy
                    </>
                  )}
                </button>
              )}
            </div>
            <div
              className={cn(
                'min-h-44 flex-1 overflow-y-auto whitespace-pre-wrap text-sm md:text-base',
                !output && 'text-muted-foreground',
              )}
              dir={isRTL(target) ? 'rtl' : 'ltr'}
            >
              {isPending ? (
                <span className="text-muted-foreground inline-flex items-center gap-2">
                  <Spinner className="size-4" /> Translating…
                </span>
              ) : (
                output || 'Translation will appear here.'
              )}
            </div>
            {detected && source === 'auto' && output && (
              <Badge variant="secondary" className="w-fit">
                Detected {languageLabel(detected)} {LANGUAGES[detected].flag}
              </Badge>
            )}
          </div>
        </div>

        {error && (
          <div className="border-destructive/40 bg-destructive/5 text-destructive flex items-start gap-3 rounded-lg border p-4 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">
                {error.missingCredential
                  ? 'Translation needs a DeepL API key'
                  : 'Translation failed'}
              </p>
              <p className="text-destructive/80">
                {error.missingCredential
                  ? 'Add your DeepL API key in Moldable settings, then try again.'
                  : error.message}
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleTranslate} disabled={!canTranslate} size="lg">
            {isPending ? (
              <>
                <Spinner className="size-4" /> Translating…
              </>
            ) : (
              <>
                <Languages className="size-4" /> Translate
              </>
            )}
          </Button>
        </div>
      </div>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent
          showCloseButton={false}
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <SheetTitle className="text-base">History</SheetTitle>
            <div className="flex items-center gap-1">
              {history.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => clearMutation.mutate()}
                  className="text-muted-foreground hover:text-foreground h-8 text-xs"
                >
                  Clear all
                </Button>
              )}
              <SheetClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Close history"
                >
                  <X className="size-4" />
                </Button>
              </SheetClose>
            </div>
          </div>
          <SheetDescription className="sr-only">
            Your recent translations. Select one to bring it back into the
            editor.
          </SheetDescription>

          {history.length === 0 ? (
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                <History className="size-5" />
              </div>
              <p className="text-sm">No translations yet.</p>
            </div>
          ) : (
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-5 p-3 pb-[calc(var(--chat-safe-padding,0px)+1rem)]">
                {groups.map((group) => (
                  <div key={group.label} className="space-y-2">
                    <p className="text-muted-foreground px-1 text-xs font-medium tracking-wide">
                      {group.label}
                    </p>
                    <ul className="space-y-2">
                      {group.items.map((record) => (
                        <li key={record.id}>
                          <HistoryRow
                            record={record}
                            onRestore={() => restoreRecord(record)}
                            onDelete={() => deleteMutation.mutate(record.id)}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </main>
  )
}

/**
 * The source editor. Renders a transparent textarea over an aligned highlight
 * backdrop so the slice of text that exceeds DeepL's request limit
 * (`overflowStart` onward) is tinted in destructive color — showing the user
 * exactly what won't be sent. Both layers share identical typography and box
 * metrics; the textarea's scroll position is mirrored onto the backdrop.
 */
function SourceTextField({
  value,
  dir,
  overflowStart,
  autoFocus,
  onChange,
  onSubmit,
}: {
  value: string
  dir: 'ltr' | 'rtl'
  overflowStart: number | null
  autoFocus?: boolean
  onChange: (value: string) => void
  onSubmit: () => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  const syncScroll = useCallback(() => {
    const textarea = textareaRef.current
    const backdrop = backdropRef.current
    if (textarea && backdrop) {
      backdrop.scrollTop = textarea.scrollTop
      backdrop.scrollLeft = textarea.scrollLeft
    }
  }, [])

  // Identical typography + box metrics keep the highlight aligned glyph-for-glyph
  // with the textarea. (On macOS — the Moldable desktop target — overlay
  // scrollbars take no layout width, so wrap points stay in sync when scrolled.)
  const typography =
    'min-h-44 w-full whitespace-pre-wrap break-words p-0 font-sans text-sm leading-7 md:text-base'

  return (
    <div className="relative min-h-44 flex-1">
      <div
        ref={backdropRef}
        aria-hidden="true"
        dir={dir}
        className={cn(
          'pointer-events-none absolute inset-0 overflow-hidden text-transparent',
          typography,
        )}
      >
        {overflowStart === null ? (
          value
        ) : (
          <>
            {value.slice(0, overflowStart)}
            <mark className="bg-destructive/25 rounded-[2px] box-decoration-clone text-transparent">
              {value.slice(overflowStart)}
            </mark>
          </>
        )}
        {/* Match the textarea's reserved trailing caret line so the two layers
            share an identical scrollHeight and the highlight stays aligned. */}
        {'\n'}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        autoFocus={autoFocus}
        dir={dir}
        spellCheck={false}
        placeholder="Enter text to translate…"
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault()
            onSubmit()
          }
        }}
        className={cn(
          'placeholder:text-muted-foreground caret-foreground absolute inset-0 resize-none overflow-y-auto border-0 bg-transparent outline-none',
          typography,
        )}
      />
    </div>
  )
}

function LanguageBar({
  source,
  target,
  sourceLabel,
  onSourceChange,
  onTargetChange,
  onSwap,
}: {
  source: SourceSelection
  target: Language
  sourceLabel: string
  onSourceChange: (value: SourceSelection) => void
  onTargetChange: (value: Language) => void
  onSwap: () => void
}) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <Select
        value={source}
        onValueChange={(value) => onSourceChange(value as SourceSelection)}
      >
        <SelectTrigger className="flex-1">
          <SelectValue>{sourceLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent position="popper" className="max-h-72">
          <SelectItem value="auto">Detect language</SelectItem>
          {LANGUAGE_LIST.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onSwap}
        aria-label="Swap languages"
        className="shrink-0"
      >
        <ArrowLeftRight className="size-4" />
      </Button>

      <Select
        value={target}
        onValueChange={(value) => onTargetChange(value as Language)}
      >
        <SelectTrigger className="flex-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" className="max-h-72">
          {LANGUAGE_LIST.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function HistoryRow({
  record,
  onRestore,
  onDelete,
}: {
  record: TranslationRecord
  onRestore: () => void
  onDelete: () => void
}) {
  const time = new Date(record.createdAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div className="border-border hover:bg-muted/50 group relative rounded-lg border transition-colors">
      <button
        type="button"
        onClick={onRestore}
        className="block w-full min-w-0 px-3 py-2.5 text-left"
      >
        <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs">
          <span className="font-medium">
            {record.sourceLanguage.toUpperCase()}
          </span>
          <ArrowLeftRight className="size-3" />
          <span className="font-medium">
            {record.targetLanguage.toUpperCase()}
          </span>
          <span className="ml-auto pr-6">{time}</span>
        </div>
        <p className="truncate text-sm">{record.sourceText}</p>
        <p className="text-muted-foreground truncate text-sm">
          {record.translatedText}
        </p>
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete"
        className="text-muted-foreground hover:text-destructive hover:bg-background absolute right-2 top-2 rounded-md p-1 opacity-0 transition-all focus-visible:opacity-100 group-hover:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  )
}
