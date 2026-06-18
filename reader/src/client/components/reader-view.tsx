import {
  ChevronLeft,
  ChevronRight,
  List,
  RotateCw,
  Search as SearchIcon,
  Type,
  Undo2,
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
  useWorkspace,
} from '@moldable-ai/ui'
import type { BookSearchResult, ChapterRef } from '../../shared/book'
import {
  READER_FONT_STACKS,
  READER_READING_PACE_WPM,
  resolveReaderTheme,
  tokenizeWords,
} from '../../shared/reader-settings'
import type { ReaderViewProps } from '../reader-types'
import { useBook, useChapter } from '../use-book'
import { useProgressWriter } from '../use-progress'
import { useReaderSettings } from '../use-reader-settings'
import { SearchDrawer } from './search-drawer'
import { SpeedReader } from './speed-reader'
import { TocDrawer } from './toc-drawer'
import { TypographyPanel } from './typography-panel'

const PAGE_PADDING_X = 56
const PAGE_PADDING_Y = 40
const EMPTY_CHAPTERS: ChapterRef[] = []

function clampReadingPace(wpm: number): number {
  return Math.round(
    Math.min(
      READER_READING_PACE_WPM.max,
      Math.max(READER_READING_PACE_WPM.min, wpm),
    ),
  )
}

function formatReadingTime(minutes: number, scope: 'chapter' | 'book'): string {
  const rounded = Math.max(1, Math.ceil(minutes))
  const hours = Math.floor(rounded / 60)
  const mins = rounded % 60
  const time =
    hours > 0
      ? mins > 0
        ? `${hours}h ${mins}m`
        : `${hours}h`
      : `${rounded} min`
  return `${time} left in ${scope}`
}

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

interface ReaderLocation {
  chapterIndex: number
  pageIndex: number
  scrollRatio: number
}

interface PendingSearchJump {
  chapterIndex: number
  textStart: number
  textLength: number
  query: string
  nonce: number
}

interface RenderedWordDebug {
  index: number
  text: string
  rect: {
    top: number
    left: number
    width: number
    height: number
  }
}

interface RenderedWordCapture {
  firstVisibleWordIndex: number | null
  visibleWordsInDomOrder: RenderedWordDebug[]
  visibleWordsInVisualOrder: RenderedWordDebug[]
  viewport: {
    top: number
    left: number
    width: number
    height: number
  }
}

function roundRect(rect: DOMRect): RenderedWordDebug['rect'] {
  return {
    top: Math.round(rect.top),
    left: Math.round(rect.left),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  }
}

function wordWindow(words: string[], center: number, before = 30, after = 180) {
  const start = Math.max(0, Math.round(center) - before)
  const end = Math.min(words.length, Math.round(center) + after)
  return {
    start,
    end,
    words: words.slice(start, end).map((text, offset) => ({
      index: start + offset,
      text,
    })),
  }
}

function findTextPoint(
  root: HTMLElement,
  targetOffset: number,
): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let cursor = 0
  let lastTextNode: Text | null = null

  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    const parent = node.parentElement
    if (parent?.closest('script, style')) continue

    const text = node.nodeValue ?? ''
    if (!text) continue
    lastTextNode = node
    if (cursor + text.length >= targetOffset) {
      return {
        node,
        offset: Math.min(text.length, Math.max(0, targetOffset - cursor)),
      }
    }
    cursor += text.length
  }

  if (!lastTextNode) return null
  return { node: lastTextNode, offset: lastTextNode.length }
}

function findSearchTextOffset(
  root: HTMLElement,
  result: PendingSearchJump,
  chapterText: string,
): number {
  const rawText = root.textContent ?? ''
  if (!rawText) return 0

  const approx = Math.round(
    (result.textStart / Math.max(1, chapterText.length)) * rawText.length,
  )
  const needle = result.query.trim().toLocaleLowerCase()
  if (needle.length < 2) return approx

  const haystack = rawText.toLocaleLowerCase()
  const searchStart = Math.max(0, approx - 1500)
  const nearby = haystack.indexOf(needle, searchStart)
  if (nearby >= 0 && Math.abs(nearby - approx) < 5000) return nearby

  const first = haystack.indexOf(needle)
  return first >= 0 ? first : approx
}

function textRangeRect(root: HTMLElement, offset: number): DOMRect | null {
  const point = findTextPoint(root, offset)
  if (!point) return null

  const range = document.createRange()
  range.setStart(point.node, point.offset)
  range.setEnd(point.node, Math.min(point.node.length, point.offset + 1))
  const rect = range.getBoundingClientRect()
  range.detach()
  return rect.width > 0 || rect.height > 0 ? rect : null
}

function rectIntersectsViewport(rect: DOMRect, viewport: DOMRect): boolean {
  const inset = 2
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.right > viewport.left + inset &&
    rect.left < viewport.right - inset &&
    rect.bottom > viewport.top + inset &&
    rect.top < viewport.bottom - inset
  )
}

function wordMatches(text: string): RegExpMatchArray[] {
  return Array.from(text.matchAll(/\S+/g))
}

function captureVisibleWordsInRenderedText(
  root: HTMLElement,
  viewport: HTMLElement,
  maxWords = 180,
): RenderedWordCapture | null {
  const viewportRect = viewport.getBoundingClientRect()
  if (viewportRect.width <= 0 || viewportRect.height <= 0) return null

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const visibleWordsInDomOrder: RenderedWordDebug[] = []
  let firstVisibleWordIndex: number | null = null
  let wordIndex = 0

  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    const parent = node.parentElement
    if (parent?.closest('script, style')) continue

    const text = node.nodeValue ?? ''
    if (!text.trim()) continue

    const words = wordMatches(text)
    if (words.length === 0) continue

    const nodeRange = document.createRange()
    nodeRange.selectNodeContents(node)
    const nodeVisible = Array.from(nodeRange.getClientRects()).some((rect) =>
      rectIntersectsViewport(rect, viewportRect),
    )
    nodeRange.detach()

    if (!nodeVisible) {
      wordIndex += words.length
      continue
    }

    for (const word of words) {
      const start = word.index ?? 0
      const end = start + word[0].length
      const range = document.createRange()
      range.setStart(node, start)
      range.setEnd(node, end)
      const visibleRect = Array.from(range.getClientRects()).find((rect) =>
        rectIntersectsViewport(rect, viewportRect),
      )
      range.detach()

      if (visibleRect) {
        firstVisibleWordIndex ??= wordIndex
        visibleWordsInDomOrder.push({
          index: wordIndex,
          text: word[0],
          rect: roundRect(visibleRect),
        })
        if (visibleWordsInDomOrder.length >= maxWords) break
      }
      wordIndex += 1
    }

    if (visibleWordsInDomOrder.length >= maxWords) break
  }

  const visibleWordsInVisualOrder = [...visibleWordsInDomOrder].sort((a, b) => {
    const topDelta = a.rect.top - b.rect.top
    if (Math.abs(topDelta) > 4) return topDelta
    return a.rect.left - b.rect.left
  })

  return {
    firstVisibleWordIndex,
    visibleWordsInDomOrder,
    visibleWordsInVisualOrder,
    viewport: roundRect(viewportRect),
  }
}

export function ReaderView({ bookId, onClose }: ReaderViewProps) {
  const bookQuery = useBook(bookId)
  const { settings, update } = useReaderSettings()
  const { fetchWithWorkspace } = useWorkspace()
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
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchHistory, setSearchHistory] = useState<ReaderLocation[]>([])
  const [typoOpen, setTypoOpen] = useState(false)
  const [speedOpen, setSpeedOpen] = useState(false)
  const [speedAutoResume, setSpeedAutoResume] = useState(false)
  const resumeSpeedWordIndexRef = useRef<number | null>(null)
  const readingPaceSampleRef = useRef<{
    absoluteWordIndex: number
    timestamp: number
  } | null>(null)
  const lastReadingPaceSaveRef = useRef(0)

  // Initialize from saved progress once the book has loaded.
  const initializedBookIdRef = useRef<string | null>(null)
  const pendingInitialScrollRatioRef = useRef<number | null>(null)
  useEffect(() => {
    if (!book || initializedBookIdRef.current === book.id) return
    initializedBookIdRef.current = book.id
    readingPaceSampleRef.current = null
    const startChapter = Math.min(
      Math.max(0, initialProgress?.chapterIndex ?? 0),
      Math.max(0, chapterCount - 1),
    )
    const blockIndex = Math.max(0, initialProgress?.blockIndex ?? 0)
    setChapterIndex(startChapter)
    setPageIndex(blockIndex)
    pendingInitialScrollRatioRef.current = Math.min(1, blockIndex / 1000)
    setSpeedAutoResume(false)
    if (initialProgress?.readerMode === 'speed') {
      resumeSpeedWordIndexRef.current = Math.max(
        0,
        initialProgress.wordIndex ?? 0,
      )
      setSpeedOpen(true)
    } else {
      resumeSpeedWordIndexRef.current = null
      setSpeedOpen(false)
    }
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
  const scrollContentRef = useRef<HTMLDivElement | null>(null)
  const anchorJumpNonceRef = useRef(0)
  const searchJumpNonceRef = useRef(0)
  const [pendingSearchJump, setPendingSearchJump] =
    useState<PendingSearchJump | null>(null)
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

  const jumpToSearchResult = useCallback(
    (result: BookSearchResult, query: string) => {
      setSearchHistory((history) => [
        ...history,
        { chapterIndex, pageIndex, scrollRatio },
      ])
      setSearchOpen(false)
      setAnimate(false)
      restoreLastPageRef.current = false
      searchJumpNonceRef.current += 1
      setPendingSearchJump({
        chapterIndex: result.chapterIndex,
        textStart: result.textStart,
        textLength: result.textLength,
        query,
        nonce: searchJumpNonceRef.current,
      })

      if (result.chapterIndex !== chapterIndex) {
        setChapterIndex(result.chapterIndex)
      }
      setPageIndex(0)
      setScrollRatio(result.position)
      if (settings.layout === 'scroll') {
        const scroller = scrollRef.current
        if (scroller) {
          const max = scroller.scrollHeight - scroller.clientHeight
          scroller.scrollTop = max > 0 ? max * result.position : 0
        }
      }
    },
    [chapterIndex, pageIndex, scrollRatio, settings.layout],
  )

  const restoreSearchReturnPoint = useCallback(() => {
    const point = searchHistory[searchHistory.length - 1]
    if (!point) return
    setSearchHistory((history) => history.slice(0, -1))
    setAnimate(false)
    restoreLastPageRef.current = false
    setPendingSearchJump(null)

    if (settings.layout === 'scroll') {
      pendingInitialScrollRatioRef.current =
        point.chapterIndex === chapterIndex ? null : point.scrollRatio
      setScrollRatio(point.scrollRatio)
      const scroller = scrollRef.current
      if (point.chapterIndex === chapterIndex && scroller) {
        const max = scroller.scrollHeight - scroller.clientHeight
        scroller.scrollTop = max > 0 ? max * point.scrollRatio : 0
      }
    }

    setChapterIndex(point.chapterIndex)
    setPageIndex(point.pageIndex)
  }, [chapterIndex, searchHistory, settings.layout])

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
    if (settings.layout !== 'scroll' || !chapter) return
    const el = scrollRef.current
    if (!el) return

    const initialRatio = pendingInitialScrollRatioRef.current
    if (initialRatio === null) {
      el.scrollTop = 0
      setScrollRatio(0)
      return
    }

    pendingInitialScrollRatioRef.current = null
    const frame = window.requestAnimationFrame(() => {
      const max = el.scrollHeight - el.clientHeight
      const next = max > 0 ? Math.min(1, Math.max(0, initialRatio)) : 0
      el.scrollTop = max * next
      setScrollRatio(next)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [chapter, chapterIndex, settings.layout])

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

  // Complete jumps from search results once the destination chapter has rendered.
  useEffect(() => {
    if (!pendingSearchJump || !chapter) return
    if (pendingSearchJump.chapterIndex !== chapterIndex) return

    const id = window.setTimeout(() => {
      const root =
        settings.layout === 'paginated'
          ? paginatedContentRef.current
          : scrollContentRef.current
      if (!root) return

      const targetOffset = findSearchTextOffset(
        root,
        pendingSearchJump,
        chapter.text,
      )
      const rect = textRangeRect(root, targetOffset)
      if (!rect) {
        setPendingSearchJump(null)
        return
      }

      if (settings.layout === 'paginated') {
        const viewport = pageViewportRef.current
        const content = paginatedContentRef.current
        if (!viewport || !content) return

        const width = viewport.clientWidth
        if (width <= 0) return

        const step = width + columnGap
        const count = Math.max(
          1,
          Math.round((content.scrollWidth + columnGap) / step),
        )
        const contentRect = content.getBoundingClientRect()
        const x = Math.max(0, rect.left - contentRect.left)
        const targetPage = Math.min(count - 1, Math.floor((x + 1) / step))

        setAnimate(false)
        setPageWidth(width)
        setPageCount(count)
        setPageIndex(targetPage)
      } else {
        const scroller = scrollRef.current
        if (!scroller) return
        const scrollerRect = scroller.getBoundingClientRect()
        const top = rect.top - scrollerRect.top + scroller.scrollTop - 32
        scroller.scrollTop = Math.max(0, top)
        window.requestAnimationFrame(() => {
          const max = scroller.scrollHeight - scroller.clientHeight
          setScrollRatio(
            max > 0 ? Math.min(1, Math.max(0, scroller.scrollTop / max)) : 0,
          )
        })
      }

      setPendingSearchJump(null)
    }, 100)

    return () => window.clearTimeout(id)
  }, [chapter, chapterIndex, columnGap, pendingSearchJump, settings.layout])

  // --- Intra-chapter fraction + overall percent ---
  const intraFraction = useMemo(() => {
    if (settings.layout === 'scroll') return scrollRatio
    if (pageCount <= 1) return 0
    return pageIndex / (pageCount - 1)
  }, [settings.layout, scrollRatio, pageIndex, pageCount])

  // For time estimates, a page is considered read once the user advances past
  // it, so page 2 of 8 means roughly 1/8 of the chapter is behind them.
  // Book progress uses intraFraction so the last page of a chapter can count
  // as the end of that chapter for the footer bar.
  const readingEstimateFraction = useMemo(() => {
    if (settings.layout === 'scroll') return scrollRatio
    if (pageCount <= 0) return 0
    return Math.min(1, Math.max(0, pageIndex / pageCount))
  }, [settings.layout, scrollRatio, pageIndex, pageCount])

  const wordsBeforeChapter = useMemo(
    () =>
      chapters
        .slice(0, chapterIndex)
        .reduce((sum, item) => sum + Math.max(0, item.wordCount), 0),
    [chapters, chapterIndex],
  )

  const overallPercent = useMemo(() => {
    const totalWords = Math.max(0, book?.wordCount ?? 0)
    if (!chapter || totalWords <= 0) return 0
    const absoluteWordIndex =
      wordsBeforeChapter + chapter.wordCount * intraFraction
    return Math.min(1, Math.max(0, absoluteWordIndex / totalWords))
  }, [book?.wordCount, chapter, wordsBeforeChapter, intraFraction])

  const readingTimeLabel = useMemo(() => {
    if (!settings.showReadingTime || !chapter) return null
    const pace = Math.max(1, settings.readingPaceWpm)
    const currentChapterRemaining = Math.max(
      0,
      chapter.wordCount *
        (1 - Math.min(1, Math.max(0, readingEstimateFraction))),
    )
    const remainingWords =
      settings.readingTimeScope === 'chapter'
        ? currentChapterRemaining
        : currentChapterRemaining +
          chapters
            .slice(chapterIndex + 1)
            .reduce((sum, item) => sum + Math.max(0, item.wordCount), 0)

    if (remainingWords <= 0) return `Done with ${settings.readingTimeScope}`
    return formatReadingTime(remainingWords / pace, settings.readingTimeScope)
  }, [
    settings.showReadingTime,
    settings.readingPaceWpm,
    settings.readingTimeScope,
    chapter,
    readingEstimateFraction,
    chapters,
    chapterIndex,
  ])

  // --- Learn reading pace from actual reading progress ---
  useEffect(() => {
    if (!book || !chapter || speedOpen) return

    const now = Date.now()
    const absoluteWordIndex =
      wordsBeforeChapter + chapter.wordCount * readingEstimateFraction
    const previous = readingPaceSampleRef.current

    if (!previous) {
      readingPaceSampleRef.current = { absoluteWordIndex, timestamp: now }
      return
    }

    const elapsedMs = now - previous.timestamp
    const deltaWords = absoluteWordIndex - previous.absoluteWordIndex

    // Backtracking, TOC jumps, very fast skips, and long idle/sleep gaps should
    // reset the baseline rather than pollute the user's learned reading pace.
    if (deltaWords <= 0 || elapsedMs > 30 * 60 * 1000) {
      readingPaceSampleRef.current = { absoluteWordIndex, timestamp: now }
      return
    }
    if (elapsedMs < 4_000 || deltaWords < 15 || deltaWords > 2_500) return

    const sampleWpm = deltaWords / (elapsedMs / 60_000)
    if (sampleWpm < 60 || sampleWpm > 900) {
      readingPaceSampleRef.current = { absoluteWordIndex, timestamp: now }
      return
    }

    const learnedWpm = clampReadingPace(
      settings.readingPaceWpm * 0.82 + sampleWpm * 0.18,
    )
    readingPaceSampleRef.current = { absoluteWordIndex, timestamp: now }

    if (
      Math.abs(learnedWpm - settings.readingPaceWpm) >= 5 &&
      now - lastReadingPaceSaveRef.current > 15_000
    ) {
      lastReadingPaceSaveRef.current = now
      update({ readingPaceWpm: learnedWpm })
    }
  }, [
    book,
    chapter,
    speedOpen,
    wordsBeforeChapter,
    readingEstimateFraction,
    settings.readingPaceWpm,
    update,
  ])

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
        readerMode: speedOpen ? 'speed' : 'standard',
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
    speedOpen,
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
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        if (!speedOpen) setSearchOpen(true)
        return
      }
      if (event.key === 'Escape') {
        if (speedOpen) {
          // The speed-reader overlay owns Escape so it can persist the exact
          // word position before returning to the standard reader.
          return
        }
        if (searchOpen) {
          setSearchOpen(false)
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
      if (speedOpen || searchOpen || typoOpen || tocOpen) return
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
    searchOpen,
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
  // opened. Prefer the first word that is actually rendered in the visible
  // reading viewport; this is much more reliable than estimating by
  // pageIndex/pageCount because some EPUB spine files contain multiple visible
  // chapters plus front matter.
  const speedStartIndex = useMemo(() => {
    if (speedWords.length === 0) return 0
    const resumeWordIndex = resumeSpeedWordIndexRef.current
    if (speedOpen && resumeWordIndex !== null) {
      return Math.min(
        Math.max(0, Math.round(resumeWordIndex)),
        Math.max(0, speedWords.length - 1),
      )
    }
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
  }, [
    speedWords.length,
    speedOpen,
    settings.layout,
    scrollRatio,
    pageIndex,
    pageCount,
  ])

  const remainingWordsAfterCurrentChapter = useMemo(
    () =>
      chapters
        .slice(chapterIndex + 1)
        .reduce((sum, item) => sum + Math.max(0, item.wordCount), 0),
    [chapters, chapterIndex],
  )

  const saveSpeedPosition = useCallback(
    (wordIndex: number, readerMode: 'speed' | 'standard') => {
      const wordCount = Math.max(1, speedWords.length)
      const clampedWordIndex = Math.min(
        Math.max(0, Math.round(wordIndex)),
        wordCount,
      )
      const speedFraction = Math.min(1, clampedWordIndex / wordCount)
      const speedBookPercent = Math.min(
        1,
        Math.max(
          0,
          (wordsBeforeChapter + wordCount * speedFraction) /
            Math.max(1, book?.wordCount ?? 0),
        ),
      )
      const blockIndex =
        settings.layout === 'scroll'
          ? Math.round(speedFraction * 1000)
          : Math.round(speedFraction * Math.max(0, pageCount - 1))

      if (settings.layout === 'scroll') {
        setScrollRatio(speedFraction)
        const scroller = scrollRef.current
        if (scroller) {
          const max = scroller.scrollHeight - scroller.clientHeight
          scroller.scrollTop = max > 0 ? max * speedFraction : 0
        }
      } else {
        setPageIndex(blockIndex)
      }

      void save({
        chapterIndex,
        blockIndex,
        wordIndex: clampedWordIndex,
        percent: speedBookPercent,
        readerMode,
      })
    },
    [
      speedWords.length,
      settings.layout,
      pageCount,
      save,
      chapterIndex,
      wordsBeforeChapter,
      book?.wordCount,
    ],
  )

  const currentRenderedWordCapture =
    useCallback((): RenderedWordCapture | null => {
      if (settings.layout === 'paginated') {
        const root = paginatedContentRef.current
        const viewport = pageViewportRef.current
        if (!root || !viewport) return null
        return captureVisibleWordsInRenderedText(root, viewport)
      }

      const root = scrollContentRef.current
      const viewport = scrollRef.current
      if (!root || !viewport) return null
      return captureVisibleWordsInRenderedText(root, viewport)
    }, [settings.layout])

  const saveSpeedReaderDebugSnapshot = useCallback(
    (
      reason: string,
      startIndex: number,
      capture: RenderedWordCapture | null,
    ) => {
      if (!book || !chapter) return
      const snapshot = {
        reason,
        clientGeneratedAt: new Date().toISOString(),
        book: {
          id: book.id,
          title: book.title,
          author: book.author,
          wordCount: book.wordCount,
        },
        chapter: {
          index: chapterIndex,
          title: chapter.title,
          wordCount: chapter.wordCount,
        },
        readerState: {
          layout: settings.layout,
          pageIndex,
          pageCount,
          scrollRatio,
          chosenSpeedStartIndex: startIndex,
          renderedFirstVisibleWordIndex: capture?.firstVisibleWordIndex ?? null,
        },
        renderedPage: capture,
        speedReaderTokensAroundStart: wordWindow(speedWords, startIndex),
      }

      void fetchWithWorkspace('/api/debug/speed-reader/latest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
      }).catch(() => {
        // Debug-only best effort.
      })
    },
    [
      book,
      chapter,
      chapterIndex,
      fetchWithWorkspace,
      pageCount,
      pageIndex,
      scrollRatio,
      settings.layout,
      speedWords,
    ],
  )

  const handleOpenSpeedReader = useCallback(() => {
    const capture = currentRenderedWordCapture()
    const renderedStartIndex = capture?.firstVisibleWordIndex ?? null
    const startIndex =
      renderedStartIndex === null ? speedStartIndex : renderedStartIndex
    resumeSpeedWordIndexRef.current = startIndex
    saveSpeedReaderDebugSnapshot('open-speed-reader', startIndex, capture)
    setSpeedAutoResume(false)
    setSpeedOpen(true)
    void save({ readerMode: 'speed' })
  }, [
    currentRenderedWordCapture,
    save,
    saveSpeedReaderDebugSnapshot,
    speedStartIndex,
  ])

  const handleSpeedChapterComplete = useCallback(
    (wordIndex: number) => {
      saveSpeedPosition(wordIndex, 'speed')
      if (chapterIndex >= chapterCount - 1) {
        setSpeedAutoResume(false)
        return
      }

      resumeSpeedWordIndexRef.current = 0
      setSpeedAutoResume(true)
      goToChapter(chapterIndex + 1)
    },
    [chapterIndex, chapterCount, goToChapter, saveSpeedPosition],
  )

  const handleCloseSpeedReader = useCallback(
    (wordIndex?: number) => {
      resumeSpeedWordIndexRef.current = null
      setSpeedAutoResume(false)
      setSpeedOpen(false)
      if (typeof wordIndex === 'number') {
        saveSpeedPosition(wordIndex, 'standard')
      } else {
        void save({ readerMode: 'standard' })
      }
    },
    [save, saveSpeedPosition],
  )

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
            {searchHistory.length > 0 ? (
              <ChromeButton
                label={
                  searchHistory.length === 1
                    ? 'Back to previous spot'
                    : `Back ${searchHistory.length} search jumps`
                }
                theme={theme}
                onClick={restoreSearchReturnPoint}
              >
                <span className="relative flex size-5 items-center justify-center">
                  <Undo2 className="size-5" aria-hidden />
                  {searchHistory.length > 1 ? (
                    <span
                      className="absolute -right-1.5 -top-1.5 flex size-3.5 items-center justify-center rounded-full text-[9px] font-medium leading-none"
                      style={{
                        color: theme.bg,
                        backgroundColor: theme.fg,
                      }}
                      aria-hidden
                    >
                      {Math.min(9, searchHistory.length)}
                    </span>
                  ) : null}
                </span>
              </ChromeButton>
            ) : null}
            <ChromeButton
              label="Contents"
              theme={theme}
              onClick={() => setTocOpen(true)}
            >
              <List className="size-5" aria-hidden />
            </ChromeButton>
            <ChromeButton
              label="Search book"
              theme={theme}
              onClick={() => setSearchOpen(true)}
            >
              <SearchIcon className="size-5" aria-hidden />
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
              onClick={handleOpenSpeedReader}
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
                ref={scrollContentRef}
                className="mx-auto"
                style={{
                  ...columnStyle,
                  maxWidth: `${settings.contentWidth}px`,
                  padding: `${PAGE_PADDING_Y}px ${PAGE_PADDING_X}px`,
                  paddingBottom:
                    'calc(var(--reader-control-safe-padding, var(--chat-safe-padding, 0px)) + var(--reader-page-bottom-gutter, 4rem))',
                }}
                dangerouslySetInnerHTML={{ __html: chapter?.html ?? '' }}
              />
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <footer
          className="flex shrink-0 items-center px-4 py-2.5"
          style={{
            paddingBottom:
              'calc(var(--reader-control-safe-padding, var(--chat-safe-padding, 0px)) + 0.625rem)',
          }}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 text-xs">
              <span className="truncate" style={{ color: theme.muted }}>
                Book progress
              </span>
              {readingTimeLabel ? (
                <span
                  className="max-w-[42vw] truncate text-center tabular-nums"
                  style={{ color: theme.muted }}
                >
                  {readingTimeLabel}
                </span>
              ) : (
                <span aria-hidden />
              )}
              <span
                style={{ color: theme.muted }}
                className="truncate text-right tabular-nums"
              >
                {Math.round(overallPercent * 100)}%
              </span>
            </div>
            <Progress
              value={overallPercent * 100}
              className="h-1"
              style={{ backgroundColor: `${theme.muted}33` }}
            />
          </div>
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
        <SearchDrawer
          open={searchOpen}
          onOpenChange={setSearchOpen}
          bookId={book.id}
          currentChapterIndex={chapterIndex}
          onSelect={jumpToSearchResult}
        />
        <TypographyPanel
          open={typoOpen}
          onOpenChange={setTypoOpen}
          settings={settings}
          update={update}
        />
        <SpeedReader
          open={speedOpen}
          onClose={handleCloseSpeedReader}
          title={book.title}
          words={speedWords}
          startIndex={speedStartIndex}
          wordsBeforeChapter={wordsBeforeChapter}
          bookWordCount={book.wordCount}
          remainingWordsAfterChapter={remainingWordsAfterCurrentChapter}
          settings={settings}
          onSettingsChange={update}
          hasNextChapter={chapterIndex < chapterCount - 1}
          autoPlayOnSourceChange={speedAutoResume}
          onChapterComplete={handleSpeedChapterComplete}
          onProgress={(wordIndex) => saveSpeedPosition(wordIndex, 'speed')}
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
