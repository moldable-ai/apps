import {
  ChevronLeft,
  ChevronRight,
  List,
  RotateCw,
  Type,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Progress,
  Spinner,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  isInMoldable,
  sendToMoldable,
  useTheme,
} from '@moldable-ai/ui'
import type { ChapterRef } from '../../shared/book'
import {
  READER_FONT_STACKS,
  resolveReaderTheme,
  tokenizeWords,
} from '../../shared/reader-settings'
import type { ReaderViewProps } from '../reader-types'
import { useBook, useChapter } from '../use-book'
import { useProgressWriter } from '../use-progress'
import { useReaderSettings } from '../use-reader-settings'
import { SpeedReader } from './speed-reader'
import { TocDrawer } from './toc-drawer'
import { TypographyPanel } from './typography-panel'

const PAGE_PADDING_X = 56
const PAGE_PADDING_Y = 40
const EMPTY_CHAPTERS: ChapterRef[] = []

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function normalizeEbookPath(path: string): string {
  const decoded = safeDecode(path)
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^\.\//, '')
  const parts: string[] = []
  for (const part of decoded.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') {
      parts.pop()
    } else {
      parts.push(part)
    }
  }
  return parts.join('/')
}

function dirname(path: string): string {
  const normalized = normalizeEbookPath(path)
  const index = normalized.lastIndexOf('/')
  return index >= 0 ? normalized.slice(0, index) : ''
}

function basename(path: string): string {
  const normalized = normalizeEbookPath(path)
  const index = normalized.lastIndexOf('/')
  return index >= 0 ? normalized.slice(index + 1) : normalized
}

function splitHref(href: string): { path: string; anchor?: string } {
  const trimmed = href.trim()
  const hashIndex = trimmed.indexOf('#')
  const beforeHash = hashIndex >= 0 ? trimmed.slice(0, hashIndex) : trimmed
  const rawAnchor = hashIndex >= 0 ? trimmed.slice(hashIndex + 1) : ''
  const queryIndex = beforeHash.indexOf('?')
  const path = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash
  const anchorQueryIndex = rawAnchor.indexOf('?')
  const anchor = safeDecode(
    anchorQueryIndex >= 0 ? rawAnchor.slice(0, anchorQueryIndex) : rawAnchor,
  )
  return { path, anchor: anchor || undefined }
}

function isExternalHref(href: string): boolean {
  return /^(https?:|mailto:|tel:)/i.test(href.trim())
}

function isUnsupportedHref(href: string): boolean {
  return /^[a-z][a-z\d+.-]*:/i.test(href.trim()) && !isExternalHref(href)
}

function findAnchorElement(
  root: HTMLElement,
  anchor: string,
): HTMLElement | null {
  const candidates = root.querySelectorAll<HTMLElement>('[id], a[name]')
  for (const candidate of candidates) {
    if (candidate.id === anchor || candidate.getAttribute('name') === anchor) {
      return candidate
    }
  }
  return null
}

export function ReaderView({ bookId, onClose }: ReaderViewProps) {
  const bookQuery = useBook(bookId)
  const { settings, update } = useReaderSettings()
  const save = useProgressWriter(bookId)

  const book = bookQuery.data?.book ?? null
  const initialProgress = bookQuery.data?.progress ?? null

  const chapters = book?.chapters ?? EMPTY_CHAPTERS
  const chapterCount = chapters.length

  const [chapterIndex, setChapterIndex] = useState(0)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageCount, setPageCount] = useState(1)
  const [scrollRatio, setScrollRatio] = useState(0)
  const [pendingAnchor, setPendingAnchor] = useState<{
    chapterIndex: number
    anchor: string
    nonce: number
  } | null>(null)

  const [tocOpen, setTocOpen] = useState(false)
  const [typoOpen, setTypoOpen] = useState(false)
  const [speedOpen, setSpeedOpen] = useState(false)

  // Initialize from saved progress once the book has loaded.
  const initializedRef = useRef(false)
  useEffect(() => {
    if (initializedRef.current || !book) return
    initializedRef.current = true
    const startChapter = Math.min(
      Math.max(0, initialProgress?.chapterIndex ?? 0),
      Math.max(0, chapterCount - 1),
    )
    setChapterIndex(startChapter)
    setPageIndex(Math.max(0, initialProgress?.blockIndex ?? 0))
  }, [book, initialProgress, chapterCount])

  const chapterQuery = useChapter(bookId, book ? chapterIndex : null)
  const chapter = chapterQuery.data ?? null

  const { resolvedTheme } = useTheme()
  const theme = resolveReaderTheme(
    settings.theme,
    resolvedTheme === 'dark' ? 'dark' : 'light',
  )

  // --- Pagination ---
  const pageViewportRef = useRef<HTMLDivElement | null>(null)
  const paginatedContentRef = useRef<HTMLDivElement | null>(null)
  const anchorJumpNonceRef = useRef(0)
  const [pageWidth, setPageWidth] = useState(0)
  const [animate, setAnimate] = useState(false)

  const columnGap = PAGE_PADDING_X * 2

  const recomputePages = useCallback(() => {
    const viewport = pageViewportRef.current
    const content = paginatedContentRef.current
    if (!viewport || !content) return

    const width = viewport.clientWidth
    if (width <= 0) return

    const step = width + columnGap
    // A multi-column element's scrollWidth is roughly:
    //   columnCount * width + (columnCount - 1) * gap
    // Add the gap back before dividing so we count actual columns rather than
    // accidentally treating the trailing gap math as an extra blank page.
    const count = Math.max(
      1,
      Math.round((content.scrollWidth + columnGap) / step),
    )

    setPageWidth(width)
    setPageCount(count)
    setPageIndex((current) => Math.min(current, count - 1))
  }, [columnGap])

  // Recompute on resize.
  useEffect(() => {
    if (settings.layout !== 'paginated') return
    const viewport = pageViewportRef.current
    if (!viewport) return
    const observer = new ResizeObserver(() => {
      recomputePages()
    })
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [settings.layout, recomputePages, chapter])

  // Recompute on settings/content change (debounced).
  useEffect(() => {
    if (settings.layout !== 'paginated' || !chapter) return
    const first = window.setTimeout(recomputePages, 60)
    // Some EPUB pages contain images or custom fonts; run one later pass too so
    // pagination does not leave the reader sitting on a now-empty trailing page.
    const second = window.setTimeout(recomputePages, 300)
    return () => {
      window.clearTimeout(first)
      window.clearTimeout(second)
    }
  }, [
    settings.layout,
    settings.font,
    settings.fontSize,
    settings.lineHeight,
    settings.contentWidth,
    settings.justify,
    chapter,
    recomputePages,
  ])

  // Recompute again as lazy resources inside the chapter settle.
  useEffect(() => {
    if (settings.layout !== 'paginated' || !chapter) return
    const content = paginatedContentRef.current
    if (!content) return

    let cancelled = false
    const recomputeIfMounted = () => {
      if (!cancelled) recomputePages()
    }

    const images = Array.from(content.querySelectorAll('img'))
    for (const image of images) {
      if (!image.complete) {
        image.addEventListener('load', recomputeIfMounted)
        image.addEventListener('error', recomputeIfMounted)
      }
    }

    if (document.fonts) {
      void document.fonts.ready.then(recomputeIfMounted)
    }

    return () => {
      cancelled = true
      for (const image of images) {
        image.removeEventListener('load', recomputeIfMounted)
        image.removeEventListener('error', recomputeIfMounted)
      }
    }
  }, [settings.layout, chapter, recomputePages])

  // When switching chapters, jump page changes are instant (no slide animation).
  const restoreLastPageRef = useRef(false)
  useEffect(() => {
    if (!chapter) return
    setAnimate(false)
  }, [chapter])

  // After a chapter loads and pages compute, clamp to last page if requested
  // (used when paging backwards into the previous chapter).
  useEffect(() => {
    if (restoreLastPageRef.current) {
      setPageIndex(Math.max(0, pageCount - 1))
      restoreLastPageRef.current = false
    }
  }, [pageCount])

  const enableAnim = useCallback(() => {
    if (!prefersReducedMotion()) setAnimate(true)
  }, [])

  const goToChapter = useCallback(
    (next: number, atLastPage = false) => {
      const clamped = Math.min(Math.max(0, next), Math.max(0, chapterCount - 1))
      if (clamped === chapterIndex) return
      restoreLastPageRef.current = atLastPage
      setChapterIndex(clamped)
      setPageIndex(0)
      setScrollRatio(0)
    },
    [chapterCount, chapterIndex],
  )

  const resolveInternalLink = useCallback(
    (href: string): { chapterIndex: number; anchor?: string } | null => {
      if (!chapter) return null
      const { path, anchor } = splitHref(href)
      const currentHref = chapters[chapterIndex]?.href ?? ''

      if (!path) return { chapterIndex, anchor }
      if (!currentHref) return null

      const baseDir = dirname(currentHref)
      const targetPath = normalizeEbookPath(
        path.startsWith('/') || !baseDir ? path : `${baseDir}/${path}`,
      )
      const targetBase = basename(targetPath)

      let targetIndex = chapters.findIndex(
        (item) => normalizeEbookPath(item.href) === targetPath,
      )

      // Some EPUBs mix absolute-ish and relative hrefs. If exact resolution does
      // not match, fall back to the file basename rather than leaving the link to
      // navigate the Moldable iframe.
      if (targetIndex < 0 && targetBase) {
        targetIndex = chapters.findIndex(
          (item) => basename(item.href) === targetBase,
        )
      }

      if (targetIndex < 0) return null
      return { chapterIndex: targetIndex, anchor }
    },
    [chapter, chapterIndex, chapters],
  )

  const jumpToInternalLink = useCallback(
    (target: { chapterIndex: number; anchor?: string }) => {
      setAnimate(false)
      restoreLastPageRef.current = false

      if (target.chapterIndex !== chapterIndex) {
        setChapterIndex(target.chapterIndex)
      }

      if (settings.layout === 'scroll') {
        const el = scrollRef.current
        if (el) el.scrollTop = 0
      }

      setPageIndex(0)
      setScrollRatio(0)

      if (target.anchor) {
        anchorJumpNonceRef.current += 1
        setPendingAnchor({
          chapterIndex: target.chapterIndex,
          anchor: target.anchor,
          nonce: anchorJumpNonceRef.current,
        })
      }
    },
    [chapterIndex, settings.layout],
  )

  const openExternalLink = useCallback((href: string) => {
    if (/^https?:/i.test(href) && isInMoldable()) {
      sendToMoldable({ type: 'moldable:open-url', url: href })
    } else {
      window.open(href, '_blank', 'noopener,noreferrer')
    }
  }, [])

  const nextPage = useCallback(() => {
    if (settings.layout !== 'paginated') return
    if (pageIndex < pageCount - 1) {
      enableAnim()
      setPageIndex((p) => p + 1)
    } else if (chapterIndex < chapterCount - 1) {
      goToChapter(chapterIndex + 1)
    }
  }, [
    settings.layout,
    pageIndex,
    pageCount,
    chapterIndex,
    chapterCount,
    enableAnim,
    goToChapter,
  ])

  const prevPage = useCallback(() => {
    if (settings.layout !== 'paginated') return
    if (pageIndex > 0) {
      enableAnim()
      setPageIndex((p) => p - 1)
    } else if (chapterIndex > 0) {
      goToChapter(chapterIndex - 1, true)
    }
  }, [settings.layout, pageIndex, chapterIndex, enableAnim, goToChapter])

  const handleReaderClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null
      const link = target?.closest<HTMLAnchorElement>('a[href]')
      if (link) {
        const href = link.getAttribute('href') ?? ''
        event.preventDefault()
        event.stopPropagation()

        if (!href || isUnsupportedHref(href)) return
        if (isExternalHref(href)) {
          openExternalLink(href)
          return
        }

        const internal = resolveInternalLink(href)
        if (internal) jumpToInternalLink(internal)
        return
      }

      if (settings.layout !== 'paginated') return
      if (target?.closest('button, [role="button"]')) return

      const rect = event.currentTarget.getBoundingClientRect()
      const x = event.clientX - rect.left
      if (x < rect.width / 3) {
        prevPage()
      } else if (x > (rect.width * 2) / 3) {
        nextPage()
      }
    },
    [
      jumpToInternalLink,
      nextPage,
      openExternalLink,
      prevPage,
      resolveInternalLink,
      settings.layout,
    ],
  )

  // --- Scroll layout progress ---
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget
    const max = el.scrollHeight - el.clientHeight
    setScrollRatio(max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0)
  }, [])

  // Reset scroll on chapter change.
  useEffect(() => {
    if (settings.layout === 'scroll') {
      const el = scrollRef.current
      if (el) el.scrollTop = 0
      setScrollRatio(0)
    }
  }, [chapterIndex, settings.layout])

  // Complete jumps to internal EPUB anchors once the destination chapter has
  // rendered. In paginated mode the anchor's column determines the page.
  useEffect(() => {
    if (!pendingAnchor || !chapter) return
    if (pendingAnchor.chapterIndex !== chapterIndex) return

    const id = window.setTimeout(() => {
      if (settings.layout === 'paginated') {
        const viewport = pageViewportRef.current
        const content = paginatedContentRef.current
        if (!viewport || !content) return

        const target = findAnchorElement(content, pendingAnchor.anchor)
        if (!target) {
          setPendingAnchor(null)
          return
        }

        const width = viewport.clientWidth
        if (width <= 0) return

        const step = width + columnGap
        const count = Math.max(
          1,
          Math.round((content.scrollWidth + columnGap) / step),
        )
        const contentRect = content.getBoundingClientRect()
        const targetRect = target.getBoundingClientRect()
        const x = Math.max(0, targetRect.left - contentRect.left)
        const targetPage = Math.min(count - 1, Math.floor((x + 1) / step))

        setAnimate(false)
        setPageWidth(width)
        setPageCount(count)
        setPageIndex(targetPage)
      } else {
        const scroller = scrollRef.current
        if (!scroller) return
        const target = findAnchorElement(scroller, pendingAnchor.anchor)
        if (!target) {
          setPendingAnchor(null)
          return
        }

        target.scrollIntoView({ block: 'start' })
        window.requestAnimationFrame(() => {
          const max = scroller.scrollHeight - scroller.clientHeight
          setScrollRatio(
            max > 0 ? Math.min(1, Math.max(0, scroller.scrollTop / max)) : 0,
          )
        })
      }

      setPendingAnchor(null)
    }, 80)

    return () => window.clearTimeout(id)
  }, [chapter, chapterIndex, columnGap, pendingAnchor, settings.layout])

  // --- Intra-chapter fraction + overall percent ---
  const intraFraction = useMemo(() => {
    if (settings.layout === 'scroll') return scrollRatio
    if (pageCount <= 1) return 0
    return pageIndex / (pageCount - 1)
  }, [settings.layout, scrollRatio, pageIndex, pageCount])

  const overallPercent = useMemo(() => {
    if (chapterCount === 0) return 0
    return (chapterIndex + intraFraction) / Math.max(1, chapterCount)
  }, [chapterIndex, intraFraction, chapterCount])

  // --- Persist progress (debounced) ---
  useEffect(() => {
    if (!book || !chapter) return
    const approxWordIndex = Math.round(chapter.wordCount * intraFraction)
    const blockIndex =
      settings.layout === 'scroll' ? Math.round(scrollRatio * 1000) : pageIndex
    const id = window.setTimeout(() => {
      void save({
        chapterIndex,
        blockIndex,
        wordIndex: approxWordIndex,
        percent: overallPercent,
      })
    }, 600)
    return () => window.clearTimeout(id)
  }, [
    book,
    chapter,
    chapterIndex,
    pageIndex,
    scrollRatio,
    intraFraction,
    overallPercent,
    settings.layout,
    save,
  ])

  // --- Chat context ---
  useEffect(() => {
    if (!book || !chapter || !isInMoldable()) return
    const pct = Math.round(overallPercent * 100)
    sendToMoldable({
      type: 'moldable:set-chat-instructions',
      text: `Reading "${book.title}" by ${book.author ?? 'Unknown'}. Chapter ${
        chapterIndex + 1
      }/${chapterCount}: "${chapter.title}". ${pct}% complete. Prefer the Reader app APIs for library changes.`,
    })
    // overallPercent intentionally omitted to avoid spamming on every page turn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, chapter, chapterIndex, chapterCount])

  // --- Keyboard ---
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (speedOpen) {
          setSpeedOpen(false)
          return
        }
        if (typoOpen) {
          setTypoOpen(false)
          return
        }
        if (tocOpen) {
          setTocOpen(false)
          return
        }
        onClose()
        return
      }
      if (speedOpen || typoOpen || tocOpen) return
      if (settings.layout !== 'paginated') return
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        nextPage()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        prevPage()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    speedOpen,
    typoOpen,
    tocOpen,
    settings.layout,
    nextPage,
    prevPage,
    onClose,
  ])

  // --- Speed reader words + start index ---
  const speedWords = useMemo(
    () => (chapter ? tokenizeWords(chapter.text) : []),
    [chapter],
  )
  // Start speed reading from the CURRENT spot you're on, not where the book was
  // opened. Use the fraction at the START of the current page (page/pageCount)
  // or the scroll position, so it lines up with what you can see right now.
  const speedStartIndex = useMemo(() => {
    if (speedWords.length === 0) return 0
    const fraction =
      settings.layout === 'scroll'
        ? scrollRatio
        : pageCount > 0
          ? pageIndex / pageCount
          : 0
    const clamped = Math.min(1, Math.max(0, fraction))
    return Math.min(
      Math.round(speedWords.length * clamped),
      Math.max(0, speedWords.length - 1),
    )
  }, [speedWords.length, settings.layout, scrollRatio, pageIndex, pageCount])

  // --- Loading / error states ---
  const isLoading = bookQuery.isLoading || (chapterQuery.isLoading && !chapter)
  const hasError =
    bookQuery.isError || chapterQuery.isError || (!!book && chapterCount === 0)

  if (isLoading && !book) {
    return (
      <div
        className="flex h-full min-h-0 items-center justify-center overflow-hidden"
        style={{ backgroundColor: theme.bg, color: theme.fg }}
      >
        <Spinner className="size-6" />
      </div>
    )
  }

  if (hasError || !book) {
    return (
      <div
        className="flex h-full min-h-0 flex-col items-center justify-center gap-4 overflow-hidden px-6 text-center"
        style={{ backgroundColor: theme.bg, color: theme.fg }}
      >
        <p className="text-sm" style={{ color: theme.muted }}>
          {chapterCount === 0 && book
            ? 'This book has no readable chapters.'
            : 'This book could not be loaded.'}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void bookQuery.refetch()
              void chapterQuery.refetch()
            }}
            className="border-border bg-background text-foreground hover:bg-muted inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
          >
            <RotateCw className="size-4" aria-hidden />
            Retry
          </button>
          <button
            type="button"
            onClick={onClose}
            className="border-border bg-background text-foreground hover:bg-muted inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
          >
            <ChevronLeft className="size-4" aria-hidden />
            Library
          </button>
        </div>
      </div>
    )
  }

  const fontStack = READER_FONT_STACKS[settings.font]
  const chapterLoading = chapterQuery.isLoading && !chapter

  const columnStyle: React.CSSProperties = {
    fontFamily: fontStack,
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
    textAlign: settings.justify ? 'justify' : 'left',
  }

  return (
    <TooltipProvider delayDuration={400}>
      <div
        className="flex h-full min-h-0 flex-col overflow-hidden"
        style={{ backgroundColor: theme.bg, color: theme.fg }}
      >
        {/* Top bar */}
        <header
          className="flex shrink-0 items-center gap-3 px-3 py-2.5"
          style={{ borderBottom: `1px solid ${theme.muted}22` }}
        >
          <ChromeButton label="Back to library" theme={theme} onClick={onClose}>
            <ChevronLeft className="size-5" aria-hidden />
          </ChromeButton>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">
              {book.title}
            </p>
            <p
              className="truncate text-xs leading-tight"
              style={{ color: theme.muted }}
            >
              {chapter?.title ?? chapters[chapterIndex]?.title ?? ''}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ChromeButton
              label="Contents"
              theme={theme}
              onClick={() => setTocOpen(true)}
            >
              <List className="size-5" aria-hidden />
            </ChromeButton>
            <ChromeButton
              label="Typography"
              theme={theme}
              onClick={() => setTypoOpen(true)}
            >
              <Type className="size-5" aria-hidden />
            </ChromeButton>
            <ChromeButton
              label="Speed read"
              theme={theme}
              onClick={() => setSpeedOpen(true)}
            >
              <Zap className="size-5" aria-hidden />
            </ChromeButton>
          </div>
        </header>

        {/* Reading surface */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {chapterLoading ? (
            <div className="flex h-full items-center justify-center">
              <Spinner className="size-6" />
            </div>
          ) : settings.layout === 'paginated' ? (
            <div
              className="reader-prose h-full"
              onClick={handleReaderClick}
              style={{
                ['--reader-fg' as string]: theme.fg,
                ['--reader-accent' as string]: theme.accent,
              }}
            >
              <div
                className="mx-auto h-full"
                style={{
                  maxWidth: `${settings.contentWidth + PAGE_PADDING_X * 2}px`,
                  padding: `${PAGE_PADDING_Y}px ${PAGE_PADDING_X}px`,
                }}
              >
                <div
                  ref={pageViewportRef}
                  className="reader-prose h-full overflow-hidden"
                >
                  <div
                    ref={paginatedContentRef}
                    className="reader-paginated"
                    style={{
                      ...columnStyle,
                      width: pageWidth > 0 ? `${pageWidth}px` : '100%',
                      height: '100%',
                      columnWidth:
                        pageWidth > 0
                          ? `${pageWidth}px`
                          : `${settings.contentWidth}px`,
                      columnGap: `${columnGap}px`,
                      columnFill: 'auto',
                      transform: `translateX(-${
                        pageIndex * (pageWidth + columnGap)
                      }px)`,
                      transition:
                        animate && !prefersReducedMotion()
                          ? 'transform 200ms ease-out'
                          : 'none',
                      willChange: animate ? 'transform' : undefined,
                    }}
                    dangerouslySetInnerHTML={{ __html: chapter?.html ?? '' }}
                  />
                </div>
              </div>

              {/* On-screen affordances */}
              <PageArrow
                side="left"
                theme={theme}
                onClick={prevPage}
                disabled={pageIndex === 0 && chapterIndex === 0}
              />
              <PageArrow
                side="right"
                theme={theme}
                onClick={nextPage}
                disabled={
                  pageIndex >= pageCount - 1 && chapterIndex >= chapterCount - 1
                }
              />
            </div>
          ) : (
            <div
              ref={scrollRef}
              onClick={handleReaderClick}
              onScroll={handleScroll}
              className="reader-scrollbar reader-prose h-full overflow-y-auto"
              style={{
                ['--reader-fg' as string]: theme.fg,
                ['--reader-accent' as string]: theme.accent,
              }}
            >
              <div
                className="mx-auto"
                style={{
                  ...columnStyle,
                  maxWidth: `${settings.contentWidth}px`,
                  padding: `${PAGE_PADDING_Y}px ${PAGE_PADDING_X}px`,
                  paddingBottom: 'calc(var(--chat-safe-padding, 0px) + 4rem)',
                }}
                dangerouslySetInnerHTML={{ __html: chapter?.html ?? '' }}
              />
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <footer
          className="flex shrink-0 items-center gap-3 px-4 py-2.5"
          style={{
            borderTop: `1px solid ${theme.muted}22`,
            paddingBottom: 'calc(var(--chat-safe-padding, 0px) + 0.625rem)',
          }}
        >
          <ChromeButton
            label="Previous chapter"
            theme={theme}
            onClick={() => goToChapter(chapterIndex - 1)}
            disabled={chapterIndex === 0}
            small
          >
            <ChevronLeft className="size-4" aria-hidden />
          </ChromeButton>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: theme.muted }}>
                Chapter {chapterIndex + 1} of {chapterCount}
              </span>
              <span style={{ color: theme.muted }} className="tabular-nums">
                {settings.layout === 'paginated'
                  ? `${Math.min(pageIndex + 1, pageCount)} / ${pageCount}`
                  : `${Math.round(intraFraction * 100)}%`}
              </span>
            </div>
            <Progress
              value={intraFraction * 100}
              className="h-1"
              style={{ backgroundColor: `${theme.muted}33` }}
            />
          </div>

          <ChromeButton
            label="Next chapter"
            theme={theme}
            onClick={() => goToChapter(chapterIndex + 1)}
            disabled={chapterIndex >= chapterCount - 1}
            small
          >
            <ChevronRight className="size-4" aria-hidden />
          </ChromeButton>
        </footer>

        {/* Overlays */}
        <TocDrawer
          open={tocOpen}
          onOpenChange={setTocOpen}
          chapters={chapters}
          currentIndex={chapterIndex}
          onSelect={(index) => {
            goToChapter(index)
            setTocOpen(false)
          }}
        />
        <TypographyPanel
          open={typoOpen}
          onOpenChange={setTypoOpen}
          settings={settings}
          update={update}
        />
        <SpeedReader
          open={speedOpen}
          onClose={() => setSpeedOpen(false)}
          title={book.title}
          words={speedWords}
          startIndex={speedStartIndex}
          settings={settings}
          onSettingsChange={update}
          onProgress={(wordIndex) => {
            void save({ chapterIndex, wordIndex })
          }}
        />
      </div>
    </TooltipProvider>
  )
}

interface ThemeColors {
  bg: string
  fg: string
  muted: string
  accent: string
}

function ChromeButton({
  label,
  theme,
  onClick,
  disabled,
  small,
  children,
}: {
  label: string
  theme: ThemeColors
  onClick: () => void
  disabled?: boolean
  small?: boolean
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
          className={`flex items-center justify-center rounded-md transition-colors ${
            small ? 'size-8' : 'size-9'
          } ${disabled ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'}`}
          style={{
            color: theme.fg,
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            if (!disabled)
              e.currentTarget.style.backgroundColor = `${theme.muted}22`
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function PageArrow({
  side,
  theme,
  onClick,
  disabled,
}: {
  side: 'left' | 'right'
  theme: ThemeColors
  onClick: () => void
  disabled: boolean
}) {
  if (disabled) return null
  return (
    <button
      type="button"
      aria-label={side === 'left' ? 'Previous page' : 'Next page'}
      onClick={onClick}
      className={`absolute top-1/2 z-10 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full opacity-0 transition-opacity hover:opacity-100 ${
        side === 'left' ? 'left-2' : 'right-2'
      }`}
      style={{ color: theme.muted, backgroundColor: `${theme.muted}1a` }}
    >
      {side === 'left' ? (
        <ChevronLeft className="size-5" aria-hidden />
      ) : (
        <ChevronRight className="size-5" aria-hidden />
      )}
    </button>
  )
}
