import { ArrowLeft, Search, Sparkles, Wand2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
  cn,
} from '@moldable-ai/ui'
import type {
  PresetCategory,
  PromptTemplate,
  SpaceKind,
  StylePreset,
} from '../../shared/catalog'

export type Catalog = {
  categories: PresetCategory[]
  presets: StylePreset[]
  templates: PromptTemplate[]
}

type SpaceFilter = SpaceKind | 'all'

function matchesSpace(applies: SpaceKind, filter: SpaceFilter) {
  if (filter === 'all') return true
  return applies === filter || applies === 'both'
}

function fillTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{([^}]+)\}/g, (match, key: string) => {
    const value = values[key.trim()]
    return value && value.trim() ? value.trim() : match
  })
}

function TemplateForm({
  template,
  busy,
  onBack,
  onApply,
}: {
  template: PromptTemplate
  busy: boolean
  onBack: () => void
  onApply: (prompt: string) => void
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const preview = fillTemplate(template.template, values)
  const ready = template.placeholders.every((p) => (values[p.key] ?? '').trim())

  return (
    <div className="animate-rd-chrome-in flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground -ml-1.5 mb-3 inline-flex h-7 w-fit cursor-pointer items-center gap-1 rounded-md px-1.5 text-xs transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        All templates
      </button>
      <h3 className="rd-serif text-foreground text-2xl font-semibold tracking-tight">
        {template.name}
      </h3>
      <p className="text-muted-foreground mt-1 text-sm leading-6">
        {template.blurb}
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {template.placeholders.map((placeholder) => (
          <div key={placeholder.key} className="min-w-0">
            <label className="text-foreground/80 mb-1.5 block text-xs font-medium capitalize">
              {placeholder.key.replace(/_/g, ' ')}
            </label>
            <Input
              value={values[placeholder.key] ?? ''}
              placeholder={placeholder.examples[0] ?? ''}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [placeholder.key]: event.target.value,
                }))
              }
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {placeholder.examples.slice(0, 5).map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() =>
                    setValues((current) => ({
                      ...current,
                      [placeholder.key]: example,
                    }))
                  }
                  className={cn(
                    'cursor-pointer rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                    (values[placeholder.key] ?? '') === example
                      ? 'border-foreground/40 bg-foreground text-background'
                      : 'border-border/70 text-muted-foreground hover:bg-muted/50',
                  )}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-border/60 bg-muted/30 mt-5 rounded-xl border p-3">
        <p className="text-muted-foreground/80 mb-1 text-[10px] font-medium uppercase tracking-[0.16em]">
          Prompt preview
        </p>
        <p className="text-foreground/90 text-[13px] leading-6">{preview}</p>
      </div>

      <div className="mt-auto flex justify-end pt-5">
        <Button
          type="button"
          disabled={!ready || busy}
          className="cursor-pointer gap-1.5 rounded-full px-5"
          onClick={() => onApply(preview)}
        >
          <Wand2 className="size-4" />
          Apply edit
        </Button>
      </div>
    </div>
  )
}

export function StyleLibrary({
  open,
  onOpenChange,
  catalog,
  space = 'all',
  busy = false,
  applyLabel = 'Apply style',
  subtitle,
  onApplyPreset,
  onApplyTemplate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  catalog: Catalog | undefined
  space?: SpaceFilter
  busy?: boolean
  applyLabel?: string
  subtitle?: string
  onApplyPreset: (preset: StylePreset) => void
  onApplyTemplate: (template: PromptTemplate, prompt: string) => void
}) {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [spaceFilter, setSpaceFilter] = useState<SpaceFilter>(space)
  const [query, setQuery] = useState('')
  const [activeTemplate, setActiveTemplate] = useState<PromptTemplate | null>(
    null,
  )

  useEffect(() => {
    setSpaceFilter(space)
  }, [space])

  const presets = useMemo(() => catalog?.presets ?? [], [catalog])
  const categories = catalog?.categories ?? []
  const templates = catalog?.templates ?? []

  const normalizedQuery = query.trim().toLowerCase()

  const visiblePresets = useMemo(() => {
    return presets.filter((preset) => {
      if (!matchesSpace(preset.applies, spaceFilter)) return false
      if (activeCategory !== 'all' && preset.category !== activeCategory) {
        return false
      }
      if (normalizedQuery) {
        const haystack = [preset.name, preset.blurb, preset.tags.join(' ')]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(normalizedQuery)) return false
      }
      return true
    })
  }, [presets, spaceFilter, activeCategory, normalizedQuery])

  const isTemplates = activeCategory === 'templates'

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setActiveTemplate(null)
          setQuery('')
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="top-[calc((100dvh-var(--chat-safe-padding,0px))/2)] h-[calc(100dvh-var(--chat-safe-padding,0px)-1.5rem)] w-[calc(100vw-1.5rem)] max-w-none overflow-hidden rounded-2xl border-0 p-0 shadow-2xl sm:max-w-none"
      >
        <DialogTitle className="sr-only">Style library</DialogTitle>
        <DialogDescription className="sr-only">
          Browse design styles and prompt templates to restyle your space.
        </DialogDescription>

        <div className="flex h-full min-h-0">
          {/* Sidebar */}
          <aside className="border-border/60 bg-muted/20 hidden w-60 shrink-0 flex-col border-r md:flex">
            <div className="flex items-center gap-2 px-5 pb-3 pt-5">
              <Sparkles className="text-primary size-4" />
              <span className="rd-serif text-foreground text-lg font-semibold">
                Style library
              </span>
            </div>
            <div className="rd-no-scrollbar min-h-0 flex-1 overflow-y-auto px-2.5 pb-4">
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('all')
                  setActiveTemplate(null)
                }}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
                  activeCategory === 'all'
                    ? 'bg-foreground text-background'
                    : 'text-foreground/80 hover:bg-muted/60',
                )}
              >
                <span className="text-base leading-none">✨</span>
                All styles
                <span className="rd-mono ml-auto text-[11px] opacity-70">
                  {presets.length}
                </span>
              </button>
              {categories.map((category) => {
                const count = presets.filter(
                  (p) =>
                    p.category === category.key &&
                    matchesSpace(p.applies, spaceFilter),
                ).length
                return (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => {
                      setActiveCategory(category.key)
                      setActiveTemplate(null)
                    }}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
                      activeCategory === category.key
                        ? 'bg-foreground text-background'
                        : 'text-foreground/80 hover:bg-muted/60',
                    )}
                  >
                    <span className="text-base leading-none">
                      {category.emoji}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {category.label}
                    </span>
                    <span className="rd-mono text-[11px] opacity-60">
                      {count}
                    </span>
                  </button>
                )
              })}
              <div className="bg-border/50 my-2 h-px" />
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('templates')
                  setActiveTemplate(null)
                }}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
                  isTemplates
                    ? 'bg-foreground text-background'
                    : 'text-foreground/80 hover:bg-muted/60',
                )}
              >
                <Wand2 className="size-4" />
                <span className="min-w-0 flex-1 truncate">Quick edits</span>
                <span className="rd-mono text-[11px] opacity-60">
                  {templates.length}
                </span>
              </button>
            </div>
          </aside>

          {/* Main */}
          <div className="flex min-h-0 flex-1 flex-col">
            <header className="border-border/60 flex items-center gap-3 border-b px-5 py-3.5">
              {!isTemplates ? (
                <div className="relative max-w-sm flex-1">
                  <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2" />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search 140+ styles…"
                    className="border-border/70 bg-muted/30 focus:bg-background focus:border-foreground/30 placeholder:text-muted-foreground/80 h-9 w-full rounded-full border pl-9 pr-3 text-[13px] outline-none transition-colors"
                  />
                </div>
              ) : (
                <p className="text-foreground/80 flex-1 text-sm font-medium">
                  Fill-in-the-blank edits — change one thing, keep everything
                  else.
                </p>
              )}

              {!isTemplates ? (
                <div className="hidden items-center gap-1 sm:flex">
                  {(['all', 'interior', 'exterior'] as SpaceFilter[]).map(
                    (value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSpaceFilter(value)}
                        className={cn(
                          'h-8 cursor-pointer rounded-full px-3 text-[12px] font-medium capitalize transition-colors',
                          spaceFilter === value
                            ? 'bg-foreground text-background'
                            : 'text-muted-foreground hover:bg-muted/50',
                        )}
                      >
                        {value === 'all' ? 'All spaces' : value}
                      </button>
                    ),
                  )}
                </div>
              ) : null}

              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Close style library"
                className="cursor-pointer"
                onClick={() => onOpenChange(false)}
              >
                <X className="size-4" />
              </Button>
            </header>

            {subtitle ? (
              <p className="text-muted-foreground border-border/40 bg-muted/15 border-b px-5 py-2 text-[12px]">
                {subtitle}
              </p>
            ) : null}

            <div className="rd-no-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
              {isTemplates ? (
                activeTemplate ? (
                  <TemplateForm
                    template={activeTemplate}
                    busy={busy}
                    onBack={() => setActiveTemplate(null)}
                    onApply={(prompt) =>
                      onApplyTemplate(activeTemplate, prompt)
                    }
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {templates.map((template, index) => (
                      <button
                        key={template.id}
                        type="button"
                        style={{ animationDelay: `${index * 24}ms` }}
                        onClick={() => setActiveTemplate(template)}
                        className="animate-rd-card-in border-border/60 bg-card hover:border-foreground/25 group flex cursor-pointer flex-col rounded-xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="text-primary mb-2 flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_oklch,var(--primary)_14%,transparent)]">
                          <Wand2 className="size-4" />
                        </div>
                        <h4 className="text-foreground text-sm font-semibold">
                          {template.name}
                        </h4>
                        <p className="text-muted-foreground mt-1 line-clamp-2 text-[12px] leading-5">
                          {template.blurb}
                        </p>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {visiblePresets.map((preset, index) => (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={busy}
                      style={
                        {
                          ['--card-tone']: preset.accent,
                          animationDelay: `${Math.min(index, 24) * 18}ms`,
                        } as React.CSSProperties
                      }
                      onClick={() => onApplyPreset(preset)}
                      className="rd-card-tone animate-rd-card-in border-border/50 group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-default disabled:opacity-60"
                    >
                      <div
                        className="h-1.5 w-full"
                        style={{ background: preset.accent }}
                      />
                      <div className="flex flex-1 flex-col p-3.5">
                        <h4 className="text-foreground text-[13.5px] font-semibold leading-tight">
                          {preset.name}
                        </h4>
                        <p className="text-muted-foreground mt-1 line-clamp-2 text-[11.5px] leading-[1.35]">
                          {preset.blurb}
                        </p>
                        <div className="mt-auto flex items-center gap-1.5 pt-3">
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium opacity-0 transition-opacity group-hover:opacity-100"
                            style={{
                              background: `${preset.accent}22`,
                              color: preset.accent,
                            }}
                          >
                            <Wand2 className="size-2.5" />
                            {applyLabel}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                  {visiblePresets.length === 0 ? (
                    <div className="text-muted-foreground col-span-full py-16 text-center text-sm">
                      No styles match your search.
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
