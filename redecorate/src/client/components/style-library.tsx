import {
  ArrowLeft,
  Check,
  Copy,
  ImagePlus,
  Loader2,
  Paintbrush,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wand2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent, ReactNode } from 'react'
import { MarkdownEditor } from '@moldable-ai/editor'
import { Button, Input, Markdown, cn } from '@moldable-ai/ui'
import { STYLE_SUBTYPES, subtypeLabel } from '../../shared/catalog'
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

type StyleDescribeResult = {
  id: string
  thumbnail: string
  draft: Omit<StyleDraft, 'id'>
}

type StyleDropMessage =
  | { type: 'moldable:file-drag-over'; paths?: string[] }
  | { type: 'moldable:file-drag-leave' }
  | { type: 'moldable:file-drop'; paths?: string[] }

function hasFileDrag(event: DragEvent<HTMLElement>): boolean {
  return Array.from(event.dataTransfer.types).includes('Files')
}

function accentGradient(accent: string): string {
  return `linear-gradient(155deg, ${accent} 0%, color-mix(in oklab, ${accent} 52%, #0b0b0c) 100%)`
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

/** Example render if one exists, otherwise a tinted accent tile with a ghost glyph. */
function StyleThumb({
  preset,
  emoji,
  glyphClassName,
}: {
  preset: StylePreset
  emoji: string
  glyphClassName?: string
}) {
  const [broken, setBroken] = useState(false)
  useEffect(() => setBroken(false), [preset.id])

  if (preset.thumbnail && !broken) {
    return (
      <img
        src={preset.thumbnail}
        alt=""
        loading="lazy"
        draggable="false"
        onError={() => setBroken(true)}
        className="size-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.06]"
      />
    )
  }
  return (
    <div
      className="flex size-full items-center justify-center transition-transform duration-[600ms] ease-out group-hover:scale-[1.06]"
      style={{ background: accentGradient(preset.accent) }}
    >
      <span
        className={cn(
          'select-none opacity-35 drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]',
          glyphClassName ?? 'text-4xl',
        )}
      >
        {emoji}
      </span>
    </div>
  )
}

function TemplateForm({
  template,
  busy,
  onApply,
}: {
  template: PromptTemplate
  busy: boolean
  onApply: (prompt: string) => void
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const preview = fillTemplate(template.template, values)
  const ready = template.placeholders.every((p) => (values[p.key] ?? '').trim())

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="rd-no-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div>
          <h3 className="rd-serif text-foreground text-2xl font-semibold tracking-tight">
            {template.name}
          </h3>
          <p className="text-muted-foreground mt-1 text-[13px] leading-6">
            {template.blurb}
          </p>
        </div>

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
              {placeholder.examples.slice(0, 6).map((example) => (
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
                    'cursor-pointer rounded-full border px-2.5 py-1 text-[11px] transition-colors',
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

        <div className="border-border/60 bg-muted/30 rounded-xl border p-3.5">
          <p className="text-muted-foreground/80 mb-1.5 text-[10px] font-medium uppercase tracking-[0.16em]">
            Prompt preview
          </p>
          <p className="text-foreground/85 text-[13px] leading-6">{preview}</p>
        </div>
      </div>

      <div className="border-border/60 bg-background/95 shrink-0 border-t px-5 py-3.5 backdrop-blur">
        <Button
          type="button"
          disabled={!ready || busy}
          className="h-11 w-full cursor-pointer gap-2 rounded-xl text-sm"
          onClick={() => onApply(preview)}
        >
          <Wand2 className="size-4" />
          Apply edit
        </Button>
      </div>
    </div>
  )
}

/** Read-only detail for a single style: hero, the look, and the full prompt. */
function StyleDetail({
  preset,
  emoji,
  busy,
  cta,
  isCustom,
  onBack,
  onApply,
  onDelete,
}: {
  preset: StylePreset
  emoji: string
  busy: boolean
  cta: string
  isCustom: boolean
  onBack: () => void
  onApply: (promptOverride?: string) => void
  onDelete?: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(preset.prompt)

  useEffect(() => {
    setDraft(preset.prompt)
    setEditing(false)
  }, [preset.id, preset.prompt])

  const editCta =
    cta === 'Redesign this room'
      ? 'Redesign with changes'
      : 'Create with changes'

  return (
    <div className="animate-rd-chrome-in flex min-h-0 flex-1 flex-col">
      <div className="border-border/60 flex h-12 shrink-0 items-center justify-between gap-1 border-b px-3">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex h-8 cursor-pointer items-center gap-1 rounded-md px-2 text-[13px] transition-colors"
        >
          <ArrowLeft className="size-4" />
          All styles
        </button>
        {isCustom && onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete style"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 inline-flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors"
          >
            <Trash2 className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="rd-no-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div className="bg-muted group relative aspect-[4/3] overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5">
          <StyleThumb preset={preset} emoji={emoji} glyphClassName="text-6xl" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent px-4 pb-3.5 pt-14">
            {isCustom ? (
              <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                <Paintbrush className="size-2.5" />
                Your style
              </span>
            ) : null}
            <h3 className="rd-serif text-2xl font-semibold leading-tight text-white drop-shadow-sm">
              {preset.name}
            </h3>
          </div>
        </div>

        {preset.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {preset.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                style={{
                  background: `${preset.accent}22`,
                  color: preset.accent,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {preset.blurb ? (
          <div>
            <p className="text-muted-foreground/80 mb-1.5 text-[10px] font-medium uppercase tracking-[0.16em]">
              The look
            </p>
            <p className="text-foreground/90 text-[15px] leading-7">
              {preset.blurb}
            </p>
          </div>
        ) : null}

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-muted-foreground/80 text-[10px] font-medium uppercase tracking-[0.16em]">
              {editing ? 'Tweak the prompt' : 'Exact prompt'}
            </p>
            {editing ? (
              <button
                type="button"
                onClick={() => {
                  setDraft(preset.prompt)
                  setEditing(false)
                }}
                className="text-muted-foreground hover:text-foreground cursor-pointer text-[11px] transition-colors"
              >
                Reset
              </button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard?.writeText(preset.prompt)
                    setCopied(true)
                    window.setTimeout(() => setCopied(false), 1500)
                  } catch {
                    /* clipboard unavailable */
                  }
                }}
                className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1 text-[11px] transition-colors"
              >
                {copied ? (
                  <Check className="size-3" />
                ) : (
                  <Copy className="size-3" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
          {editing ? (
            <div className="border-border/70 bg-muted/20 focus-within:border-foreground/30 overflow-hidden rounded-xl border transition-colors">
              <MarkdownEditor
                key={preset.id}
                value={draft}
                onChange={setDraft}
                autoFocus
                hideMarkdownHint
                placeholder="Describe the look…"
                minHeight="10rem"
                maxHeight="18rem"
                contentClassName="!text-[13px] px-3.5 py-3 leading-6"
              />
            </div>
          ) : (
            <div className="border-border/60 bg-muted/30 rounded-xl border px-3.5 py-2.5">
              <Markdown
                markdown={preset.prompt}
                proseSize="sm"
                className="text-foreground/85 [&_p+p]:mt-2 [&_p]:my-0"
              />
            </div>
          )}
        </div>
      </div>

      <div className="border-border/60 bg-background/95 shrink-0 border-t px-5 py-3.5 backdrop-blur">
        {editing ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 cursor-pointer rounded-xl"
              onClick={() => {
                setDraft(preset.prompt)
                setEditing(false)
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy || !draft.trim()}
              className="h-11 flex-1 cursor-pointer gap-2 rounded-xl text-sm"
              onClick={() => onApply(draft)}
            >
              <Wand2 className="size-4" />
              {editCta}
            </Button>
          </div>
        ) : (
          <div className="bg-primary text-primary-foreground flex h-11 overflow-hidden rounded-xl shadow-sm">
            <button
              type="button"
              disabled={busy}
              onClick={() => onApply()}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-50"
            >
              <Wand2 className="size-4" />
              {cta}
            </button>
            <div className="bg-primary-foreground/20 my-2 w-px" />
            <button
              type="button"
              disabled={busy}
              aria-label="Tweak the prompt before applying"
              title="Tweak the prompt"
              onClick={() => setEditing(true)}
              className="hover:bg-primary-foreground/10 inline-flex w-11 shrink-0 cursor-pointer items-center justify-center transition-colors disabled:cursor-default disabled:opacity-50"
            >
              <Pencil className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const SPACE_OPTIONS: { value: SpaceKind; label: string }[] = [
  { value: 'interior', label: 'Interior' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'both', label: 'Both' },
]

type StyleDraft = {
  id?: string
  name: string
  blurb: string
  prompt: string
  applies: SpaceKind
  accent: string
  tags: string[]
  subtypes?: string[]
}

/** Create a custom style — from an inspiration image (LLM-described) or by hand. */
function CreateStylePane({
  busy,
  onBack,
  onDescribeImage,
  onDescribeImagePath,
  onCreate,
}: {
  busy: boolean
  onBack: () => void
  onDescribeImage: (file: File) => Promise<StyleDescribeResult>
  onDescribeImagePath: (path: string) => Promise<StyleDescribeResult>
  onCreate: (draft: StyleDraft) => Promise<void>
}) {
  const [draft, setDraft] = useState<StyleDraft>({
    name: '',
    blurb: '',
    prompt: '',
    applies: 'both',
    accent: '#8A8D91',
    tags: [],
  })
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isDropping, setIsDropping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const applyDescribeResult = useCallback((result: StyleDescribeResult) => {
    setThumbnail(result.thumbnail)
    setDraft({ id: result.id, ...result.draft })
  }, [])

  const handleImage = useCallback(
    async (file: File | undefined) => {
      if (!file) return
      setError(null)
      setAnalyzing(true)
      try {
        const result = await onDescribeImage(file)
        applyDescribeResult(result)
      } catch (analyzeError) {
        setError(
          analyzeError instanceof Error
            ? analyzeError.message
            : 'Could not read a style from that image. You can still describe it below.',
        )
      } finally {
        setAnalyzing(false)
      }
    },
    [applyDescribeResult, onDescribeImage],
  )

  const handleImagePath = useCallback(
    async (path: string | undefined) => {
      if (!path) return
      setError(null)
      setAnalyzing(true)
      try {
        const result = await onDescribeImagePath(path)
        applyDescribeResult(result)
      } catch (analyzeError) {
        setError(
          analyzeError instanceof Error
            ? analyzeError.message
            : 'Could not read a style from that image. You can still describe it below.',
        )
      } finally {
        setAnalyzing(false)
      }
    },
    [applyDescribeResult, onDescribeImagePath],
  )

  useEffect(() => {
    const handler = (event: MessageEvent<StyleDropMessage>) => {
      const data = event.data
      if (!data || typeof data !== 'object') return
      if (data.type === 'moldable:file-drag-over') {
        setIsDropping(true)
        return
      }
      if (data.type === 'moldable:file-drag-leave') {
        setIsDropping(false)
        return
      }
      if (data.type !== 'moldable:file-drop') return
      setIsDropping(false)
      void handleImagePath(data.paths?.[0])
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [handleImagePath])

  const canSave = draft.name.trim() && draft.prompt.trim() && !saving && !busy

  return (
    <div className="animate-rd-chrome-in flex min-h-0 flex-1 flex-col">
      <div className="border-border/60 flex h-12 shrink-0 items-center border-b px-3">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex h-8 cursor-pointer items-center gap-1 rounded-md px-2 text-[13px] transition-colors"
        >
          <ArrowLeft className="size-4" />
          All styles
        </button>
      </div>

      <div className="rd-no-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div>
          <h3 className="rd-serif text-foreground text-2xl font-semibold tracking-tight">
            Create a style
          </h3>
          <p className="text-muted-foreground mt-1 text-[13px] leading-6">
            Drop an inspiration photo and we’ll turn it into a reusable style —
            or describe one yourself.
          </p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void handleImage(event.target.files?.[0])
            event.target.value = ''
          }}
        />

        <button
          type="button"
          disabled={analyzing}
          onClick={() => fileRef.current?.click()}
          onDragEnter={(event) => {
            if (!hasFileDrag(event)) return
            event.preventDefault()
            event.stopPropagation()
            setIsDropping(true)
          }}
          onDragOver={(event) => {
            if (!hasFileDrag(event)) return
            event.preventDefault()
            event.stopPropagation()
            event.dataTransfer.dropEffect = 'copy'
            setIsDropping(true)
          }}
          onDragLeave={(event) => {
            if (!hasFileDrag(event)) return
            event.preventDefault()
            event.stopPropagation()
            setIsDropping(false)
          }}
          onDrop={(event) => {
            if (!hasFileDrag(event)) return
            event.preventDefault()
            event.stopPropagation()
            setIsDropping(false)
            void handleImage(event.dataTransfer.files[0])
          }}
          className={cn(
            'border-border/70 hover:border-foreground/30 hover:bg-muted/20 group relative flex aspect-[4/3] w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed transition-colors disabled:cursor-default',
            isDropping && 'border-foreground/45 bg-muted/30',
          )}
        >
          {thumbnail ? (
            <img src={thumbnail} alt="" className="size-full object-cover" />
          ) : (
            <div className="text-muted-foreground flex flex-col items-center gap-2">
              {analyzing ? (
                <>
                  <Loader2 className="size-6 animate-spin" />
                  <span className="text-[13px]">Reading the style…</span>
                </>
              ) : (
                <>
                  <ImagePlus className="size-6" />
                  <span className="text-[13px] font-medium">
                    Upload an inspiration photo
                  </span>
                  <span className="text-[11px]">
                    A magazine shot, Pinterest pin, anything
                  </span>
                </>
              )}
            </div>
          )}
        </button>

        {error ? (
          <p className="text-destructive text-[12px] leading-5">{error}</p>
        ) : null}

        <div className="space-y-3.5">
          <div>
            <label className="text-foreground/80 mb-1.5 block text-xs font-medium">
              Name
            </label>
            <Input
              value={draft.name}
              placeholder="e.g. Warm Minimalist"
              onChange={(event) =>
                setDraft((d) => ({ ...d, name: event.target.value }))
              }
            />
          </div>

          <div>
            <label className="text-foreground/80 mb-1.5 block text-xs font-medium">
              One-line description{' '}
              <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <Input
              value={draft.blurb}
              placeholder="What the look is, in a few words"
              onChange={(event) =>
                setDraft((d) => ({ ...d, blurb: event.target.value }))
              }
            />
          </div>

          <div>
            <label className="text-foreground/80 mb-1.5 block text-xs font-medium">
              Prompt
            </label>
            <div className="border-border/70 bg-muted/20 focus-within:border-foreground/30 overflow-hidden rounded-xl border transition-colors">
              <MarkdownEditor
                key={draft.id ?? 'manual'}
                value={draft.prompt}
                onChange={(value) => setDraft((d) => ({ ...d, prompt: value }))}
                hideMarkdownHint
                placeholder="Describe the materials, palette, furniture, lighting, and mood to apply to a room…"
                minHeight="8rem"
                maxHeight="16rem"
                contentClassName="!text-[13px] px-3 py-2.5 leading-6"
              />
            </div>
          </div>

          <div>
            <label className="text-foreground/80 mb-1.5 block text-xs font-medium">
              Best for
            </label>
            <div className="flex items-center gap-1">
              {SPACE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({ ...d, applies: option.value }))
                  }
                  className={cn(
                    'h-8 flex-1 cursor-pointer rounded-full text-[12px] font-medium transition-colors',
                    draft.applies === option.value
                      ? 'bg-foreground text-background'
                      : 'bg-muted/40 text-muted-foreground hover:bg-muted/70',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {draft.subtypes && draft.subtypes.length > 0 ? (
            <div>
              <label className="text-foreground/80 mb-1.5 block text-xs font-medium">
                Rooms it suits{' '}
                <span className="text-muted-foreground/60">
                  (auto-detected)
                </span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {draft.subtypes.map((key) => (
                  <span
                    key={key}
                    className="border-border/60 text-muted-foreground inline-flex items-center rounded-full border px-2.5 py-1 text-[11px]"
                  >
                    {subtypeLabel(key)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-border/60 bg-background/95 shrink-0 border-t px-5 py-3.5 backdrop-blur">
        <Button
          type="button"
          disabled={!canSave}
          className="h-11 w-full cursor-pointer gap-2 rounded-xl text-sm"
          onClick={async () => {
            setSaving(true)
            setError(null)
            try {
              await onCreate(draft)
              onBack()
            } catch (saveError) {
              setError(
                saveError instanceof Error
                  ? saveError.message
                  : 'Failed to save style',
              )
            } finally {
              setSaving(false)
            }
          }}
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Save style
        </Button>
      </div>
    </div>
  )
}

// Synthetic template for the free-form "Custom prompt" quick edit — the prompt
// is applied verbatim (onApplyTemplate ignores the template body itself).
const CUSTOM_TEMPLATE: PromptTemplate = {
  id: '__custom__',
  name: 'Custom prompt',
  blurb: '',
  template: '',
  placeholders: [],
}

function CustomPromptForm({
  busy,
  onApply,
}: {
  busy: boolean
  onApply: (prompt: string) => void
}) {
  const [value, setValue] = useState('')
  const ready = value.trim().length > 0
  return (
    <div className="animate-rd-chrome-in flex min-h-0 flex-1 flex-col">
      <div className="rd-no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <div>
          <h3 className="rd-serif text-foreground text-2xl font-semibold tracking-tight">
            Custom prompt
          </h3>
          <p className="text-muted-foreground mt-1 text-[13px] leading-6">
            Describe exactly what to change. Anything you don’t mention stays
            as-is.
          </p>
        </div>
        <div className="border-border/70 bg-muted/20 focus-within:border-foreground/30 overflow-hidden rounded-xl border transition-colors">
          <MarkdownEditor
            value={value}
            onChange={setValue}
            autoFocus
            hideMarkdownHint
            placeholder="e.g. Paint the walls warm terracotta, swap the rug for a vintage kilim, and add two large potted olive trees…"
            minHeight="11rem"
            maxHeight="22rem"
            contentClassName="!text-[13px] px-3.5 py-3 leading-6"
          />
        </div>
      </div>
      <div className="border-border/60 bg-background/95 shrink-0 border-t px-5 py-3.5 backdrop-blur">
        <Button
          type="button"
          disabled={!ready || busy}
          className="h-11 w-full cursor-pointer gap-2 rounded-xl text-sm"
          onClick={() => onApply(value)}
        >
          <Wand2 className="size-4" />
          Apply edit
        </Button>
      </div>
    </div>
  )
}

function UtilityTile({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-border/60 hover:border-foreground/30 hover:bg-muted/20 group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-dashed text-left transition-colors"
    >
      <div className="bg-muted/30 flex aspect-[4/3] items-center justify-center">
        <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
          {icon}
        </span>
      </div>
      <div className="px-2.5 py-2">
        <h4 className="text-foreground text-[13px] font-semibold leading-tight">
          {title}
        </h4>
        <p className="text-muted-foreground mt-0.5 line-clamp-1 text-[11px] leading-tight">
          {subtitle}
        </p>
      </div>
    </button>
  )
}

export type PanelState = { room: string | null; query: string }
// Stable identity so an omitted prop doesn't churn effects.
const EMPTY_PANEL_STATE: Record<string, PanelState> = {}

export function StyleLibrary({
  open,
  onOpenChange,
  catalog,
  busy = false,
  applyLabel = 'Apply style',
  contextKey = 'all',
  contextImage,
  contextTitle,
  panelState = EMPTY_PANEL_STATE,
  onSavePanelState,
  onApplyPreset,
  onApplyTemplate,
  onDescribeImage,
  onDescribeImagePath,
  onCreateStyle,
  onDeleteStyle,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  catalog: Catalog | undefined
  space?: SpaceFilter
  busy?: boolean
  applyLabel?: string
  contextKey?: string
  contextImage?: string | null
  contextTitle?: string | null
  panelState?: Record<string, PanelState>
  onSavePanelState?: (contextKey: string, state: PanelState) => void
  onApplyPreset: (preset: StylePreset, promptOverride?: string) => void
  onApplyTemplate: (template: PromptTemplate, prompt: string) => void
  onDescribeImage: (file: File) => Promise<StyleDescribeResult>
  onDescribeImagePath: (path: string) => Promise<StyleDescribeResult>
  onCreateStyle: (draft: StyleDraft) => Promise<void>
  onDeleteStyle: (id: string) => Promise<void>
}) {
  const [room, setRoom] = useState<string | null>(
    () => panelState[contextKey]?.room ?? null,
  )
  const [query, setQuery] = useState(() => panelState[contextKey]?.query ?? '')
  const [selected, setSelected] = useState<StylePreset | null>(null)
  const [activeTemplate, setActiveTemplate] = useState<PromptTemplate | null>(
    null,
  )
  const [creating, setCreating] = useState(false)
  const [templatesMode, setTemplatesMode] = useState(false)
  const [customPrompt, setCustomPrompt] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Restore the saved filter/search for the current image set — only while the
  // panel is closed, so an active session is never clobbered. Re-applies when
  // persisted state hydrates from workspace storage.
  useEffect(() => {
    if (open) return
    const saved = panelState[contextKey]
    setRoom(saved?.room ?? null)
    setQuery(saved?.query ?? '')
  }, [contextKey, panelState, open])

  // Persist filter/search changes (while open = user-driven) to storage.
  useEffect(() => {
    if (!open) return
    onSavePanelState?.(contextKey, { room, query })
  }, [room, query, open, contextKey, onSavePanelState])

  useEffect(() => {
    if (!open) {
      setSelected(null)
      setActiveTemplate(null)
      setCreating(false)
      setTemplatesMode(false)
      setCustomPrompt(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (selected) setSelected(null)
      else if (activeTemplate) setActiveTemplate(null)
      else if (customPrompt) setCustomPrompt(false)
      else if (creating) setCreating(false)
      else if (templatesMode) setTemplatesMode(false)
      else onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    open,
    selected,
    activeTemplate,
    customPrompt,
    creating,
    templatesMode,
    onOpenChange,
  ])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [room, query, templatesMode])

  const presets = useMemo(() => catalog?.presets ?? [], [catalog])
  const categories = useMemo(() => catalog?.categories ?? [], [catalog])
  const templates = catalog?.templates ?? []

  const catLabel = useMemo(() => {
    const map = new Map(categories.map((c) => [c.key, c.label]))
    return (key: string) => map.get(key) ?? ''
  }, [categories])
  const catEmoji = useMemo(() => {
    const map = new Map(categories.map((c) => [c.key, c.emoji]))
    return (key: string) => map.get(key) ?? '🎨'
  }, [categories])
  const subtypeEmoji = useMemo(
    () => new Map(STYLE_SUBTYPES.map((s) => [s.key, s.emoji])),
    [],
  )
  const glyphFor = (preset: StylePreset) =>
    subtypeEmoji.get(preset.subtypes?.[0] ?? '') ?? catEmoji(preset.category)

  const roomChips = useMemo(
    () =>
      STYLE_SUBTYPES.map((s) => ({
        ...s,
        count: presets.filter((p) => (p.subtypes ?? []).includes(s.key)).length,
      })).filter((s) => s.count > 0),
    [presets],
  )

  const q = query.trim().toLowerCase()
  // Search is global — it overrides the room filter (which reactivates when search clears).
  const effRoom = q ? null : room
  const visible = useMemo(
    () =>
      presets.filter((preset) => {
        if (effRoom && !(preset.subtypes ?? []).includes(effRoom)) return false
        if (q) {
          const hay = [
            preset.name,
            preset.blurb,
            preset.tags.join(' '),
            (preset.subtypes ?? []).map(subtypeLabel).join(' '),
            catLabel(preset.category),
          ]
            .join(' ')
            .toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      }),
    [presets, effRoom, q, catLabel],
  )

  const cta =
    applyLabel === 'Redesign' ? 'Redesign this room' : 'Create a render'
  const showLanding = !q && !room
  const activeRoomLabel = effRoom ? subtypeLabel(effRoom) : null

  const closeBtn = (
    <button
      type="button"
      aria-label="Close style library"
      onClick={() => onOpenChange(false)}
      className="text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors"
    >
      <X className="size-4" />
    </button>
  )

  return (
    <div
      className={cn(
        'fixed inset-0 z-50',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close style library"
        tabIndex={open ? 0 : -1}
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 cursor-default bg-transparent"
      />

      <aside
        className={cn(
          'bg-background border-border/70 absolute inset-y-0 right-0 flex w-[min(460px,100vw)] flex-col border-l shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-label="Style library"
      >
        {creating ? (
          <CreateStylePane
            busy={busy}
            onBack={() => setCreating(false)}
            onDescribeImage={onDescribeImage}
            onDescribeImagePath={onDescribeImagePath}
            onCreate={onCreateStyle}
          />
        ) : selected ? (
          <StyleDetail
            preset={selected}
            emoji={glyphFor(selected)}
            busy={busy}
            cta={cta}
            isCustom={selected.category === 'custom'}
            onBack={() => setSelected(null)}
            onApply={(promptOverride) =>
              onApplyPreset(selected, promptOverride)
            }
            onDelete={
              selected.category === 'custom'
                ? () => {
                    void onDeleteStyle(selected.id)
                    setSelected(null)
                  }
                : undefined
            }
          />
        ) : activeTemplate ? (
          <>
            <div className="border-border/60 flex h-12 shrink-0 items-center justify-between border-b px-3">
              <button
                type="button"
                onClick={() => setActiveTemplate(null)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex h-8 cursor-pointer items-center gap-1 rounded-md px-2 text-[13px] transition-colors"
              >
                <ArrowLeft className="size-4" />
                Quick edits
              </button>
              {closeBtn}
            </div>
            <TemplateForm
              template={activeTemplate}
              busy={busy}
              onApply={(prompt) => onApplyTemplate(activeTemplate, prompt)}
            />
          </>
        ) : templatesMode && customPrompt ? (
          <>
            <div className="border-border/60 flex h-12 shrink-0 items-center justify-between border-b px-3">
              <button
                type="button"
                onClick={() => setCustomPrompt(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex h-8 cursor-pointer items-center gap-1 rounded-md px-2 text-[13px] transition-colors"
              >
                <ArrowLeft className="size-4" />
                Quick edits
              </button>
              {closeBtn}
            </div>
            <CustomPromptForm
              busy={busy}
              onApply={(prompt) => onApplyTemplate(CUSTOM_TEMPLATE, prompt)}
            />
          </>
        ) : templatesMode ? (
          <>
            <div className="border-border/60 flex h-12 shrink-0 items-center justify-between border-b px-3">
              <button
                type="button"
                onClick={() => setTemplatesMode(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex h-8 cursor-pointer items-center gap-1 rounded-md px-2 text-[13px] transition-colors"
              >
                <ArrowLeft className="size-4" />
                All styles
              </button>
              {closeBtn}
            </div>
            <div className="px-4 pb-1 pt-3">
              <h3 className="rd-serif text-foreground text-base font-semibold">
                Quick edits
              </h3>
              <p className="text-muted-foreground mt-0.5 text-[12px]">
                Change one thing — keep everything else.
              </p>
            </div>
            <div className="rd-no-scrollbar min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
              <button
                type="button"
                onClick={() => setCustomPrompt(true)}
                className="border-foreground/30 bg-muted/20 hover:border-foreground/50 hover:bg-muted/40 group flex w-full cursor-pointer items-start gap-3 rounded-xl border border-dashed p-3 text-left transition-all"
              >
                <span className="bg-foreground/10 text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Pencil className="size-4" />
                </span>
                <div className="min-w-0">
                  <h4 className="text-foreground text-sm font-semibold">
                    Custom prompt
                  </h4>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[12px] leading-5">
                    Type your own change in plain words.
                  </p>
                </div>
              </button>
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setActiveTemplate(template)}
                  className="border-border/60 bg-card hover:border-foreground/25 group flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition-all hover:shadow-md"
                >
                  <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Wand2 className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-foreground text-sm font-semibold">
                      {template.name}
                    </h4>
                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[12px] leading-5">
                      {template.blurb}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="border-border/60 shrink-0 border-b">
              <div className="flex items-center justify-between gap-2 px-4 pt-4">
                <div className="flex items-center gap-2">
                  <Paintbrush className="text-primary size-4" />
                  <span className="rd-serif text-foreground text-lg font-semibold">
                    Style library
                  </span>
                </div>
                {closeBtn}
              </div>

              {contextTitle ? (
                <div className="bg-muted/40 mx-4 mt-3 flex items-center gap-2.5 rounded-lg p-1.5 pr-3">
                  {contextImage ? (
                    <img
                      src={contextImage}
                      alt=""
                      className="size-9 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md">
                      <Paintbrush className="text-muted-foreground size-4" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-[0.14em]">
                      Restyling
                    </p>
                    <p className="text-foreground truncate text-[13px] font-medium">
                      {contextTitle}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="relative mx-4 mt-3">
                <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={`Search ${presets.length || 150} styles, rooms, vibes…`}
                  className="border-border/70 bg-muted/30 focus:bg-background focus:border-foreground/30 placeholder:text-muted-foreground/80 h-9 w-full rounded-full border pl-9 pr-3 text-[13px] outline-none transition-colors"
                />
              </div>

              <div className="rd-no-scrollbar mt-3 flex gap-1.5 overflow-x-auto px-4 pb-3">
                <button
                  type="button"
                  onClick={() => setRoom(null)}
                  className={cn(
                    'inline-flex h-8 shrink-0 cursor-pointer items-center rounded-full px-3 text-[12.5px] font-medium transition-colors',
                    !effRoom
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-muted/60',
                  )}
                >
                  All
                </button>
                {roomChips.map((rc) => (
                  <button
                    key={rc.key}
                    type="button"
                    onClick={() => setRoom(rc.key)}
                    className={cn(
                      'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-colors',
                      effRoom === rc.key
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:bg-muted/60',
                    )}
                  >
                    <span className="text-sm leading-none">{rc.emoji}</span>
                    {rc.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              ref={scrollRef}
              className="rd-no-scrollbar min-h-0 flex-1 overflow-y-auto p-4"
            >
              {effRoom || q ? (
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-muted-foreground text-[12px]">
                    {activeRoomLabel ? (
                      <span className="text-foreground font-medium">
                        {activeRoomLabel}
                      </span>
                    ) : null}
                    {activeRoomLabel && q ? ' · ' : null}
                    {q ? `“${query.trim()}”` : null}{' '}
                    <span className="rd-mono">{visible.length}</span>{' '}
                    {visible.length === 1 ? 'style' : 'styles'}
                  </p>
                  {room ? (
                    <button
                      type="button"
                      onClick={() => setRoom(null)}
                      className="text-muted-foreground hover:text-foreground shrink-0 text-[12px]"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                {showLanding ? (
                  <>
                    <UtilityTile
                      icon={<Plus className="size-4" />}
                      title="Create a style"
                      subtitle="From a photo or words"
                      onClick={() => setCreating(true)}
                    />
                    {templates.length > 0 ? (
                      <UtilityTile
                        icon={<Wand2 className="size-4" />}
                        title="Quick edits"
                        subtitle="Change one thing"
                        onClick={() => setTemplatesMode(true)}
                      />
                    ) : null}
                  </>
                ) : null}
                {visible.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelected(preset)}
                    className="border-border/50 hover:border-border hover:bg-muted/20 group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="bg-muted relative aspect-[4/3] overflow-hidden">
                      <StyleThumb preset={preset} emoji={glyphFor(preset)} />
                      {preset.category === 'custom' ? (
                        <span className="bg-background/85 text-foreground absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold shadow-sm backdrop-blur">
                          ⭐ Yours
                        </span>
                      ) : null}
                    </div>
                    <div className="px-2.5 py-2">
                      <h4 className="text-foreground truncate text-[13px] font-semibold leading-tight">
                        {preset.name}
                      </h4>
                      <p className="text-muted-foreground mt-0.5 line-clamp-1 text-[11px] leading-tight">
                        {preset.blurb}
                      </p>
                    </div>
                  </button>
                ))}
                {visible.length === 0 ? (
                  <div className="text-muted-foreground col-span-full py-16 text-center text-sm">
                    No styles match{q ? ` “${query.trim()}”` : ''}.
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
