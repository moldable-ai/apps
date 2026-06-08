import { Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge, Button, cn } from '@moldable-ai/ui'
import { formatScalar, summarizeValue } from '../lib/format'
import type {
  CardKind,
  CollectionMetric,
  EvaluatedCard,
  FormulaOutputType,
  MoneyValueFormat,
  PreviewResult,
} from '../lib/types'
import { CardRenderer } from '../cards'
import { usePreviewMutation, useSchemaQuery } from '../data/hooks'
import { FormulaEditor } from './FormulaEditor'
import { SectionHeader } from './Shell'

const EXAMPLES = [
  'Accounts.Sum()',
  '(Income.ThisMonth().Sum() - Expenses.ThisMonth().Sum()) / Income.ThisMonth().Sum()',
  'Expenses.Rolling(6mo).Monthly().Trend()',
  'Expenses.GroupBy(category).PercentOfTotal()',
  'Expenses.Sort(amount, "desc").Top(5)',
  'Runway(Cash.Sum(), Expenses.MonthlyAverage(6))',
  'Subscriptions.ThisMonth().Sum()',
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
      return 'forecast'
    default:
      return 'metric'
  }
}

function previewToCard(result: PreviewResult): EvaluatedCard {
  return {
    id: 'preview-result',
    title: 'Result',
    kind: outputKind(result.outputType),
    format: outputFormat(result.outputType),
    value: result.value,
    displayValue: result.displayValue,
    formula: result.formula,
    description: 'Live preview against your workspace facts.',
  }
}

/**
 * Live formula playground: edit a formula, preview it against the real backend,
 * and render the typed result with the same renderers cards use — plus a
 * schema-driven palette so an agent (or user) can discover what's available.
 */
export function FormulaPlayground() {
  const schemaQuery = useSchemaQuery()
  const preview = usePreviewMutation()
  const [formula, setFormula] = useState(EXAMPLES[1])
  const [collections, setCollections] = useState<CollectionMetric[]>([])

  function run(next = formula) {
    if (!next.trim()) return
    preview.mutate(next, {
      onSuccess: (res) => {
        if (res.ok) setCollections(res.collections)
      },
    })
  }

  // Debounced auto-evaluate on load and on edit; the Evaluate button and ⌘⏎
  // still trigger an immediate run.
  useEffect(() => {
    const t = setTimeout(() => run(formula), 550)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formula])

  const schema = schemaQuery.data
  const response = preview.data
  const collectionDefs = schema?.collections.definitions ?? []
  const liveValue = (id: string) => collections.find((c) => c.id === id)

  function append(token: string) {
    setFormula((f) => (f.trim().length ? `${f}${token}` : token))
  }

  return (
    <div>
      <SectionHeader
        label="Playground"
        title="Write a formula, see the card"
        description="Formulas evaluate server-side (Langium, never eval). The typed result flows through the same renderers."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 space-y-4">
          <div className="border-border/60 bg-card rounded-xl border p-1.5">
            <FormulaEditor
              value={formula}
              onChange={setFormula}
              onRun={() => run()}
              placeholder="Expenses.ThisMonth().Sum()"
            />
            <div className="mt-2 flex items-center justify-between px-1.5 pb-1">
              <span className="text-muted-foreground text-xs">
                ⌃Space suggest · ⌘⏎ run
              </span>
              <Button
                size="sm"
                className="cursor-pointer"
                disabled={preview.isPending}
                onClick={() => run()}
              >
                <Play className="size-3.5" />
                {preview.isPending ? 'Evaluating…' : 'Evaluate'}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setFormula(ex)
                  run(ex)
                }}
                className="bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground max-w-full truncate rounded-lg px-2.5 py-1 font-mono text-xs"
              >
                {ex}
              </button>
            ))}
          </div>

          {/* result */}
          {response?.ok ? (
            <div className="space-y-3">
              <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline" className="font-mono">
                  {response.result.outputType}
                </Badge>
                <span className="uk-nums">
                  {summarizeValue(
                    response.result.value,
                    outputFormat(response.result.outputType),
                  )}
                </span>
                {response.result.referencedCollections.map((c) => (
                  <Badge
                    key={c}
                    variant="secondary"
                    className="font-mono text-[10px]"
                  >
                    {c}
                  </Badge>
                ))}
              </div>
              <div className="max-w-xl">
                <CardRenderer card={previewToCard(response.result)} />
              </div>
            </div>
          ) : response && !response.ok ? (
            <Diagnostics
              message={response.error.message}
              formula={formula}
              diagnostics={response.error.diagnostics}
            />
          ) : preview.isPending ? (
            <div className="text-muted-foreground text-sm">Evaluating…</div>
          ) : null}
        </div>

        {/* palette */}
        <aside className="space-y-4">
          <PaletteGroup title="Collections">
            <div className="flex flex-col gap-1">
              {collectionDefs.map((c) => {
                const live = liveValue(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => append(c.id)}
                    className="hover:bg-muted flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left"
                  >
                    <span className="text-foreground/90 font-mono text-xs">
                      {c.id}
                    </span>
                    {live ? (
                      <span className="uk-nums text-muted-foreground text-[11px]">
                        {formatScalar(
                          live.value,
                          c.entity === 'account' ? 'currency' : 'currency',
                        )}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </PaletteGroup>

          <PaletteGroup title="Methods">
            <ChipRow
              tokens={(schema?.methods ?? []).map((m) => m.name)}
              onPick={(t) => append(`.${t}()`)}
            />
          </PaletteGroup>

          <PaletteGroup title="Functions">
            <ChipRow
              tokens={(schema?.functions ?? []).map((f) => f.name)}
              onPick={(t) => append(`${t}()`)}
            />
          </PaletteGroup>
        </aside>
      </div>
    </div>
  )
}

function PaletteGroup({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="border-border/60 bg-card rounded-xl border p-3">
      <div className="text-muted-foreground/80 mb-2 text-[11px] font-semibold uppercase tracking-[0.06em]">
        {title}
      </div>
      {children}
    </div>
  )
}

function ChipRow({
  tokens,
  onPick,
}: {
  tokens: string[]
  onPick: (t: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {tokens.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onPick(t)}
          className="bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-1.5 py-0.5 font-mono text-[11px]"
        >
          {t}
        </button>
      ))}
    </div>
  )
}

function Diagnostics({
  message,
  formula,
  diagnostics,
}: {
  message: string
  formula: string
  diagnostics?: Array<{
    message: string
    range?: { start: { character: number }; end: { character: number } }
  }>
}) {
  const range = diagnostics?.[0]?.range
  return (
    <div className="border-destructive/40 bg-card space-y-2 rounded-xl border p-3">
      <div className="text-destructive text-sm font-medium">{message}</div>
      <pre className="bg-muted/70 text-foreground/80 overflow-x-auto rounded-lg px-3 py-2 font-mono text-xs">
        {formula}
        {range ? (
          <span className={cn('text-destructive block')}>
            {' '.repeat(Math.max(0, range.start.character))}
            {'^'.repeat(
              Math.max(1, range.end.character - range.start.character),
            )}
          </span>
        ) : null}
      </pre>
    </div>
  )
}
