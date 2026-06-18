import { ArrowLeft, Check, Loader2, Search, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Button } from '../lib/moldable-ui'
import type { TemplateMeta } from '../../shared/templates/types'

interface TemplatePickerProps {
  title: string
  confirmLabel?: string
  currentTemplateId?: string
  allowBlank?: boolean
  busy?: boolean
  onPick: (templateId: string | null) => void
  onClose: () => void
}

// Two-step picker: browse the gallery of live title-slide previews, then open a
// full-deck preview (scroll every slide) before committing. Used at deck
// creation and to change a deck's style.
export function TemplatePicker({
  title,
  confirmLabel = 'Use this style',
  currentTemplateId,
  allowBlank,
  busy,
  onPick,
  onClose,
}: TemplatePickerProps) {
  const [templates, setTemplates] = useState<TemplateMeta[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoadingTemplates(true)
    fetch('/api/templates')
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load styles (${res.status})`)
        return res.json() as Promise<TemplateMeta[]>
      })
      .then((items) => {
        if (!active) return
        setTemplates(items)
        setTemplateError(null)
      })
      .catch((error) => {
        if (!active) return
        setTemplateError(
          error instanceof Error ? error.message : 'Failed to load styles.',
        )
      })
      .finally(() => {
        if (active) setLoadingTemplates(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Category chips, ordered by a canonical taxonomy, limited to what exists.
  const categories = useMemo(() => {
    const ORDER = [
      'Company',
      'Creative',
      'Education',
      'Reporting',
      'Project Management',
      'Fundraising',
      'Sales',
      'Marketing',
      'Consulting',
      'People',
      'Strategy',
    ]
    const present = new Set(templates.flatMap((t) => t.categories))
    const ordered = ORDER.filter((c) => present.has(c))
    const extras = [...present].filter((c) => !ORDER.includes(c)).sort()
    return [...ordered, ...extras]
  }, [templates])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return templates.filter((t) => {
      if (category && !t.categories.includes(category)) return false
      if (!q) return true
      return [t.name, t.tagline, t.description, ...t.categories, ...t.audiences]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [templates, query, category])

  const previewTemplate = previewId
    ? templates.find((template) => template.id === previewId)
    : undefined

  const galleryScrollRef = useRef<HTMLDivElement>(null)
  const galleryScrollTopRef = useRef(0)
  const previewScrollRef = useRef<HTMLDivElement>(null)

  const openPreview = (templateId: string) => {
    galleryScrollTopRef.current = galleryScrollRef.current?.scrollTop ?? 0
    setPreviewId(templateId)
  }

  // Gallery and preview are separate scroll contexts. Keep the gallery where
  // the user left it, but always open each deck preview at the top.
  useLayoutEffect(() => {
    if (previewId && previewScrollRef.current) {
      previewScrollRef.current.scrollTop = 0
    } else if (!previewId && galleryScrollRef.current) {
      galleryScrollRef.current.scrollTop = galleryScrollTopRef.current
    }
  }, [previewId])

  // Progressive-disclosure search: a loupe that expands into an input.
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  // Single-row category strip: fade the edges to hint horizontal scroll.
  const chipScrollRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: true })
  const updateEdges = useCallback(() => {
    const el = chipScrollRef.current
    if (!el) return
    setEdges({
      start: el.scrollLeft <= 1,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
    })
  }, [])
  useEffect(() => {
    updateEdges()
    window.addEventListener('resize', updateEdges)
    return () => window.removeEventListener('resize', updateEdges)
  }, [updateEdges, categories, searchOpen])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 pb-[calc(var(--chat-safe-padding,0px)+1.5rem)]"
      onClick={onClose}
    >
      <div
        className="bg-background border-border flex max-h-[calc(100dvh-var(--chat-safe-padding,0px)-3rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {previewTemplate ? (
          // ── Full-deck preview ──────────────────────────────────────────
          <>
            <header className="border-border flex items-center justify-between gap-4 border-b px-5 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  onClick={() => setPreviewId(null)}
                  title="Back to all templates"
                  className="text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer rounded-md p-1.5"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {previewTemplate.name}
                  </div>
                  <div className="text-muted-foreground truncate text-xs">
                    {previewTemplate.tagline} · {previewTemplate.slideCount}{' '}
                    slides
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </header>

            <div
              key="template-preview-scroll"
              ref={previewScrollRef}
              className="min-h-0 flex-1 overflow-y-auto px-6 py-7"
              style={{ background: previewTemplate.stageBg ?? undefined }}
            >
              <div className="mx-auto flex max-w-[940px] flex-col gap-6">
                {Array.from({ length: previewTemplate.slideCount }, (_, i) => (
                  <div
                    key={i}
                    className="aspect-[16/9] w-full overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/10"
                  >
                    <iframe
                      loading="lazy"
                      src={`/api/templates/${previewTemplate.id}/preview/index.html?thumb=1&active=${i}`}
                      title={`${previewTemplate.name} — slide ${i + 1}`}
                      className="h-full w-full border-0"
                      scrolling="no"
                      sandbox="allow-scripts"
                    />
                  </div>
                ))}
              </div>
            </div>

            <footer className="border-border flex items-center justify-end gap-3 border-t px-5 py-3.5">
              <Button
                disabled={busy}
                onClick={() => onPick(previewTemplate.id)}
                className="cursor-pointer"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                {confirmLabel}
              </Button>
            </footer>
          </>
        ) : (
          // ── Gallery ────────────────────────────────────────────────────
          <>
            <header className="border-border flex items-center gap-3 border-b px-5 py-3">
              <div className="shrink-0 text-base font-semibold">{title}</div>

              {/* Category strip — one scrollable row, edges faded to hint scroll. */}
              <div className="relative min-w-0 flex-1">
                <div
                  ref={chipScrollRef}
                  onScroll={updateEdges}
                  className="flex gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  <CategoryChip
                    label="All"
                    active={category === null}
                    onClick={() => setCategory(null)}
                  />
                  {categories.map((c) => (
                    <CategoryChip
                      key={c}
                      label={c}
                      active={category === c}
                      onClick={() => setCategory(category === c ? null : c)}
                    />
                  ))}
                </div>
                <div
                  className={`from-background pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r to-transparent transition-opacity duration-200 ${
                    edges.start ? 'opacity-0' : 'opacity-100'
                  }`}
                />
                <div
                  className={`from-background pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l to-transparent transition-opacity duration-200 ${
                    edges.end ? 'opacity-0' : 'opacity-100'
                  }`}
                />
              </div>

              {/* Search (loupe → input) + close */}
              <div className="flex shrink-0 items-center gap-1">
                {searchOpen ? (
                  <div className="relative flex items-center">
                    <Search className="text-muted-foreground pointer-events-none absolute left-2.5 size-4" />
                    <input
                      ref={searchRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          if (query) setQuery('')
                          else setSearchOpen(false)
                        }
                      }}
                      onBlur={() => {
                        if (!query.trim()) setSearchOpen(false)
                      }}
                      placeholder="Search styles…"
                      className="border-border bg-muted/40 placeholder:text-muted-foreground focus:border-primary/40 h-9 w-52 rounded-full border pl-8 pr-8 text-sm outline-none"
                    />
                    {query ? (
                      <button
                        onClick={() => {
                          setQuery('')
                          searchRef.current?.focus()
                        }}
                        title="Clear search"
                        className="text-muted-foreground hover:text-foreground absolute right-2.5 cursor-pointer"
                      >
                        <X className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <button
                    onClick={() => setSearchOpen(true)}
                    title="Search styles"
                    aria-label="Search styles"
                    className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors"
                  >
                    <Search className="size-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>
            </header>

            <div
              key="template-gallery-scroll"
              ref={galleryScrollRef}
              onScroll={(event) => {
                galleryScrollTopRef.current = event.currentTarget.scrollTop
              }}
              className="min-h-0 flex-1 overflow-y-auto p-5"
            >
              {templateError ? (
                <div className="text-destructive py-16 text-center text-sm">
                  {templateError}
                </div>
              ) : loadingTemplates ? (
                <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
                  <Loader2 className="size-4 animate-spin" /> Loading styles
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                  {filtered.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => openPreview(t.id)}
                      className={`group overflow-hidden rounded-xl border text-left transition-all hover:shadow-md ${
                        currentTemplateId === t.id
                          ? 'border-primary ring-primary/30 ring-2'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <div className="bg-muted relative aspect-[16/9] w-full">
                        <TemplateThumb id={t.id} name={t.name} />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
                          <span className="bg-background text-foreground rounded-full px-3.5 py-1.5 text-xs font-semibold shadow">
                            Preview deck
                          </span>
                        </span>
                        {currentTemplateId === t.id ? (
                          <span className="bg-primary text-primary-foreground absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow">
                            Current
                          </span>
                        ) : null}
                      </div>
                      <div className="px-3 py-2.5">
                        <div className="text-sm font-semibold">{t.name}</div>
                        <div className="text-muted-foreground mt-0.5 truncate text-xs">
                          {t.tagline}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {!loadingTemplates && !templateError && filtered.length === 0 ? (
                <div className="text-muted-foreground py-16 text-center text-sm">
                  No styles match your filters.
                </div>
              ) : null}
            </div>

            {allowBlank ? (
              <footer className="border-border flex items-center justify-between gap-3 border-t px-5 py-3.5">
                <span className="text-muted-foreground text-xs">
                  {filtered.length} styles
                </span>
                <button
                  onClick={() => onPick(null)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer text-sm"
                >
                  Start from blank instead
                </button>
              </footer>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

// Lightweight gallery thumbnail: a pre-rendered cover JPG (cheap, instant) with
// a live-deck-iframe fallback only if the thumb is missing (e.g. a brand-new
// template before thumbs are regenerated).
function TemplateThumb({ id, name }: { id: string; name: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <iframe
        loading="lazy"
        src={`/api/templates/${id}/preview/index.html?thumb=1&active=0`}
        title={`${name} preview`}
        className="pointer-events-none h-full w-full border-0"
        scrolling="no"
        sandbox="allow-scripts"
      />
    )
  }
  return (
    <img
      src={`/api/templates/${id}/thumb`}
      alt={`${name} preview`}
      loading="lazy"
      onError={() => setFailed(true)}
      className="pointer-events-none h-full w-full object-cover"
    />
  )
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
      }`}
    >
      {label}
    </button>
  )
}
