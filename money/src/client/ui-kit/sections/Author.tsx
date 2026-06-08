import { Check, CircleAlert, Loader2, Plus, Save, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
} from '@moldable-ai/ui'
import type {
  CardDefinitionInput,
  CardKind,
  CardTemplate,
  CardTestResult,
  EvaluatedCard,
  FormulaOutputType,
  MoneyValueFormat,
  PreviewResult,
} from '../lib/types'
import { CardRenderer } from '../cards'
import {
  useCardTemplatesQuery,
  usePreviewMutation,
  useSaveCardMutation,
  useTestCardsMutation,
} from '../data/hooks'
import { FormulaEditor } from './FormulaEditor'
import { SectionHeader } from './Shell'

const CARD_KINDS: CardKind[] = [
  'metric',
  'ratio',
  'list',
  'trend',
  'breakdown',
  'entity-list',
  'status',
  'optimizer',
  'comparison',
  'forecast',
]

const FORMATS: MoneyValueFormat[] = [
  'currency',
  'percent',
  'number',
  'compact',
  'duration',
  'date',
]

function outputFormat(t: FormulaOutputType): MoneyValueFormat {
  switch (t) {
    case 'money':
      return 'currency'
    case 'percent':
      return 'percent'
    case 'duration':
      return 'duration'
    case 'date':
      return 'date'
    case 'count':
    case 'number':
      return 'number'
    default:
      return 'currency'
  }
}

function outputKind(t: FormulaOutputType): CardKind {
  switch (t) {
    case 'series':
      return 'trend'
    case 'table':
      return 'breakdown'
    case 'entity-list':
      return 'entity-list'
    case 'duration':
    case 'forecast':
      return 'forecast'
    default:
      return 'metric'
  }
}

interface Draft {
  title: string
  formula: string
  secondary: string
  description: string
  kind: CardKind
  format: MoneyValueFormat
}

const BLANK: Draft = {
  title: '',
  formula: 'Expenses.ThisMonth().Sum()',
  secondary: '',
  description: '',
  kind: 'metric',
  format: 'currency',
}

function draftToInput(d: Draft): CardDefinitionInput {
  const secondary = d.secondary.trim()
  return {
    title: d.title.trim() || 'Untitled card',
    primaryFormula: d.formula.trim(),
    kind: d.kind,
    format: d.format,
    description: d.description.trim() || undefined,
    secondaryFormulas: secondary ? { secondary } : undefined,
  }
}

function previewToCard(d: Draft, result: PreviewResult): EvaluatedCard {
  return {
    id: 'author-preview',
    title: d.title.trim() || 'Untitled card',
    kind: d.kind,
    format: d.format,
    value: result.value,
    displayValue: result.displayValue,
    formula: result.formula,
    secondaryFormulas: d.secondary.trim()
      ? { secondary: d.secondary.trim() }
      : undefined,
    referencedCollections: result.referencedCollections,
    description:
      d.description.trim() || 'Live preview against your workspace facts.',
  }
}

/**
 * Card authoring: pick a starter template (or start blank), edit the formula
 * with live preview, derive a compatible kind/format, validate against the
 * backend (`POST /api/cards/test`), then save (`POST /api/cards`). A saved card
 * shows up immediately on the Live dashboard.
 */
export function Author() {
  const templatesQuery = useCardTemplatesQuery()
  const preview = usePreviewMutation()
  const test = useTestCardsMutation()
  const save = useSaveCardMutation()

  const [draft, setDraft] = useState<Draft>(BLANK)
  // Once the user overrides kind/format we stop auto-deriving them from preview.
  const [autoShape, setAutoShape] = useState(true)
  const [savedTitle, setSavedTitle] = useState<string | null>(null)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  function loadTemplate(t: CardTemplate) {
    const def = t.definition
    setDraft({
      title: def.title,
      formula: def.primaryFormula ?? def.formula,
      secondary:
        def.secondaryFormulas?.secondary ??
        Object.values(def.secondaryFormulas ?? {})[0] ??
        '',
      description: def.description ?? '',
      kind: def.kind,
      format: def.format,
    })
    setAutoShape(false)
    setSavedTitle(null)
    test.reset()
    save.reset()
  }

  // Debounced live preview on formula change. A passing test/save and any prior
  // preview are stale the moment the formula changes, so clear them — otherwise
  // a green "valid" / enabled Save would refer to the OLD formula.
  useEffect(() => {
    test.reset()
    save.reset()
    setSavedTitle(null)
    if (!draft.formula.trim()) return
    const t = setTimeout(() => {
      preview.mutate(draft.formula)
    }, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.formula])

  // Editing the secondary formula, kind, or format also invalidates a prior
  // test/save result (those flow into draftToInput too).
  useEffect(() => {
    test.reset()
    save.reset()
    setSavedTitle(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.secondary, draft.kind, draft.format])

  // A preview result is only trustworthy when it corresponds to the CURRENT
  // formula and nothing is mid-flight — react-query keeps the last result around
  // across edits, so gate on a formula match, not just `data`.
  const response = preview.data
  const freshPreview =
    response?.ok &&
    !preview.isPending &&
    response.result.formula === draft.formula.trim()
      ? response
      : null

  // Derive a compatible kind/format from the evaluated output type until the
  // user takes manual control.
  useEffect(() => {
    if (!autoShape || !freshPreview) return
    const t = freshPreview.result.outputType
    setDraft((d) => ({ ...d, kind: outputKind(t), format: outputFormat(t) }))
  }, [autoShape, freshPreview])

  const previewCard = freshPreview
    ? previewToCard(draft, freshPreview.result)
    : null
  const testResult = test.data?.cards[0]

  const canSave = Boolean(freshPreview) && Boolean(draft.formula.trim())

  function runTest() {
    setSavedTitle(null)
    test.mutate([draftToInput(draft)])
  }

  function runSave() {
    save.mutate(draftToInput(draft), {
      onSuccess: (res) => {
        if (res.ok) setSavedTitle(draftToInput(draft).title)
      },
    })
  }

  return (
    <div>
      <SectionHeader
        label="Author"
        title="Compose a new card"
        description="Start from a curated template or a blank formula. Preview live, validate against the backend, and save — the card lands on your Live dashboard."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* editor */}
        <div className="min-w-0 space-y-4">
          <Field label="Title">
            <Input
              value={draft.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Monthly cash flow"
              className="h-9"
            />
          </Field>

          <Field label="Primary formula">
            <div className="border-border/60 bg-card rounded-xl border p-1.5">
              <FormulaEditor
                value={draft.formula}
                onChange={(v) => set('formula', v)}
                onRun={() => preview.mutate(draft.formula)}
                placeholder="Expenses.ThisMonth().Sum()"
              />
              <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
                {preview.isPending ? (
                  <>
                    <Loader2 className="size-3 animate-spin" /> Evaluating…
                  </>
                ) : freshPreview ? (
                  <>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {freshPreview.result.outputType}
                    </Badge>
                    {freshPreview.result.referencedCollections.map((rc) => (
                      <Badge
                        key={rc}
                        variant="secondary"
                        className="font-mono text-[10px]"
                      >
                        {rc}
                      </Badge>
                    ))}
                  </>
                ) : response && !response.ok ? (
                  <span role="alert" className="text-destructive">
                    {response.error.message}
                  </span>
                ) : null}
              </div>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Kind">
              <Select
                value={draft.kind}
                onValueChange={(v) => {
                  setAutoShape(false)
                  set('kind', v as CardKind)
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARD_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Format">
              <Select
                value={draft.format}
                onValueChange={(v) => {
                  setAutoShape(false)
                  set('format', v as MoneyValueFormat)
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field
            label="Secondary formula"
            hint="optional — drives a chart, delta, or breakdown"
          >
            <div className="border-border/60 bg-card rounded-xl border p-1.5">
              <FormulaEditor
                value={draft.secondary}
                onChange={(v) => set('secondary', v)}
                onRun={() => undefined}
                placeholder="Expenses.Rolling(6mo).Monthly().Trend()"
              />
            </div>
          </Field>

          <Field
            label="Description"
            hint="optional — shown on the card’s formula back"
          >
            <Textarea
              value={draft.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="What this card tells you at a glance."
              rows={2}
              className="resize-none text-sm"
            />
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={runTest}
              disabled={test.isPending || !draft.formula.trim()}
            >
              {test.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Test card
            </Button>
            <Button
              size="sm"
              onClick={runSave}
              disabled={!canSave || save.isPending}
            >
              {save.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              Save card
            </Button>
            {savedTitle ? (
              <span className="text-success inline-flex items-center gap-1 text-xs font-medium">
                <Check className="size-3.5" />
                Saved “{savedTitle}” — see the Live tab.
              </span>
            ) : null}
            {save.data && !save.data.ok ? (
              <span role="alert" className="text-destructive text-xs">
                {save.data.error?.message}
              </span>
            ) : null}
          </div>

          <TestReport result={testResult} />
        </div>

        {/* preview + templates */}
        <aside className="space-y-4">
          <div>
            <div className="text-muted-foreground/80 mb-2 text-[11px] font-semibold uppercase tracking-[0.06em]">
              Live preview
            </div>
            {previewCard ? (
              <CardRenderer card={previewCard} variant={draft.kind} />
            ) : (
              <div className="border-border/60 text-muted-foreground flex h-32 items-center justify-center rounded-xl border border-dashed text-xs">
                {preview.isPending
                  ? 'Evaluating…'
                  : 'Write a valid formula to preview.'}
              </div>
            )}
          </div>

          <TemplatePicker
            templates={templatesQuery.data?.templates ?? []}
            loading={templatesQuery.isLoading}
            onPick={loadTemplate}
            onBlank={() => {
              setDraft(BLANK)
              setAutoShape(true)
              setSavedTitle(null)
              test.reset()
              save.reset()
            }}
          />
        </aside>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <Label className="text-foreground/90 text-xs font-medium">
          {label}
        </Label>
        {hint ? (
          <span className="text-muted-foreground text-[11px]">{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  )
}

function TestReport({ result }: { result?: CardTestResult }) {
  if (!result) return null
  if (result.ok) {
    return (
      <div className="border-success/40 bg-card flex items-start gap-2 rounded-xl border p-3">
        <Check className="text-success mt-0.5 size-4 shrink-0" />
        <div className="text-sm">
          <div className="text-success font-medium">Card is valid</div>
          <div className="text-muted-foreground text-xs">
            Evaluated to{' '}
            <span className="font-mono">{result.result.outputType}</span> —
            ready to save.
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="border-destructive/40 bg-card space-y-2 rounded-xl border p-3">
      <div className="flex items-start gap-2">
        <CircleAlert className="text-destructive mt-0.5 size-4 shrink-0" />
        <div className="text-destructive text-sm font-medium">
          {result.error.message}
        </div>
      </div>
      {result.repairHints.length ? (
        <ul className="text-muted-foreground ml-6 list-disc space-y-1 text-xs">
          {result.repairHints.slice(0, 3).map((h: string) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function TemplatePicker({
  templates,
  loading,
  onPick,
  onBlank,
}: {
  templates: CardTemplate[]
  loading: boolean
  onPick: (t: CardTemplate) => void
  onBlank: () => void
}) {
  const [category, setCategory] = useState<string>('all')
  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const t of templates) set.add(t.category)
    return ['all', ...[...set].sort()]
  }, [templates])
  const shown =
    category === 'all'
      ? templates
      : templates.filter((t) => t.category === category)

  return (
    <div className="border-border/60 bg-card rounded-xl border p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-muted-foreground/80 text-[11px] font-semibold uppercase tracking-[0.06em]">
          Start from a template
        </div>
        <button
          type="button"
          onClick={onBlank}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px] font-medium"
        >
          <Plus className="size-3" />
          Blank
        </button>
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={cn(
              'rounded-md px-1.5 py-0.5 text-[11px] font-medium capitalize transition-colors',
              category === cat
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {cat.replace('-', ' ')}
          </button>
        ))}
      </div>

      <div className="-mr-1 max-h-[19rem] space-y-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="text-muted-foreground py-6 text-center text-xs">
            Loading templates…
          </div>
        ) : shown.length === 0 ? (
          <div className="text-muted-foreground py-6 text-center text-xs">
            No templates here.
          </div>
        ) : (
          shown.map((t) => {
            const tested = t.test?.ok
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onPick(t)}
                className="hover:bg-muted flex w-full flex-col gap-1 rounded-lg px-2.5 py-2 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-foreground truncate text-sm font-medium">
                    {t.title}
                  </span>
                  {tested === true ? (
                    <Check className="text-success size-3.5 shrink-0" />
                  ) : tested === false ? (
                    <CircleAlert className="text-muted-foreground size-3.5 shrink-0" />
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <Badge
                    variant="secondary"
                    className="h-4 px-1 text-[9px] capitalize"
                  >
                    {t.category.replace('-', ' ')}
                  </Badge>
                  {t.requiredExtensions.map((ext) => (
                    <Badge
                      key={ext}
                      variant="outline"
                      className="h-4 px-1 font-mono text-[9px]"
                    >
                      {ext}
                    </Badge>
                  ))}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
