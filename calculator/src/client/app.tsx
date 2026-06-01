import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRightLeft,
  Delete,
  History as HistoryIcon,
  Loader2,
  Search,
  Sigma,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Tabs,
  TabsContent,
  ToggleGroup,
  ToggleGroupItem,
  useWorkspace,
} from '@moldable-ai/ui'
import {
  BASIC_KEYS,
  type Key,
  SCIENTIFIC_KEYS,
  balanceParens,
  toggleSign,
} from './lib/keypad'
import { evaluate, formatResult } from '@/lib/calc'
import type { HistoryEntry } from '@/lib/history'
import { CATEGORIES, type CategoryId, convert, unitSymbol } from '@/lib/units'
import { cn } from '@/lib/utils'

type AngleMode = 'deg' | 'rad'

interface CalcSeed {
  expr: string
  nonce: number
}

// ---------------------------------------------------------------------------
// History data hooks (shared across panes)
// ---------------------------------------------------------------------------

function useRecordHistory() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (entry: {
      kind: HistoryEntry['kind']
      expression: string
      result: string
      resultValue: number
    }) => {
      const res = await fetchWithWorkspace('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
      if (!res.ok) throw new Error('Failed to record')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history', workspaceId] })
    },
  })
}

// ---------------------------------------------------------------------------
// Calculator
// ---------------------------------------------------------------------------

const KEYBOARD_MAP: Record<string, string> = {
  '*': '×',
  '/': '÷',
  '-': '−',
  '+': '+',
  '^': '^',
  '(': '(',
  ')': ')',
  '!': '!',
}

function CalculatorPane({ seed }: { seed: CalcSeed }) {
  const [expr, setExpr] = useState('')
  const [lastExpression, setLastExpression] = useState('')
  const [bigResult, setBigResult] = useState('')
  const [justEvaluated, setJustEvaluated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scientific, setScientific] = useState(false)
  const [angleMode, setAngleMode] = useState<AngleMode>('deg')
  const record = useRecordHistory()

  // Seed the buffer when the user re-uses an entry from History.
  useEffect(() => {
    if (seed.nonce === 0) return
    setExpr(seed.expr)
    setJustEvaluated(false)
    setError(null)
    setBigResult('')
    setLastExpression('')
  }, [seed])

  const preview = useMemo(() => {
    if (!expr.trim()) return null
    try {
      const value = evaluate(balanceParens(expr), angleMode)
      return formatResult(value)
    } catch {
      return null
    }
  }, [expr, angleMode])

  const doEquals = useCallback(() => {
    if (!expr.trim()) return
    try {
      const balanced = balanceParens(expr)
      const value = evaluate(balanced, angleMode)
      const formatted = formatResult(value)
      record.mutate({
        kind: 'calc',
        expression: balanced,
        result: formatted,
        resultValue: value,
      })
      setLastExpression(balanced)
      setBigResult(formatted)
      // Chain from the raw numeric value (no grouping commas).
      setExpr(String(value))
      setJustEvaluated(true)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }, [expr, angleMode, record])

  const handleKey = useCallback(
    (key: Key) => {
      setError(null)

      if (key.action === 'clear') {
        setExpr('')
        setJustEvaluated(false)
        setBigResult('')
        setLastExpression('')
        return
      }
      if (key.action === 'back') {
        setJustEvaluated(false)
        setExpr((prev) => prev.slice(0, -1))
        return
      }
      if (key.action === 'sign') {
        setJustEvaluated(false)
        setExpr((prev) => toggleSign(prev))
        return
      }
      if (key.action === 'equals') {
        doEquals()
        return
      }
      if (!key.append) return

      // After "=", a number/function starts fresh; an operator continues from
      // the result so you can keep computing.
      if (justEvaluated) {
        setJustEvaluated(false)
        if (key.kind === 'op') {
          setExpr((prev) => prev + key.append)
        } else {
          setExpr(key.append)
        }
        return
      }
      setExpr((prev) => prev + key.append)
    },
    [doEquals, justEvaluated],
  )

  // Physical keyboard support.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      // Don't hijack typing in inputs (e.g. the Convert/History fields).
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      ) {
        return
      }

      if (e.key >= '0' && e.key <= '9') {
        handleKey({ label: e.key, kind: 'num', append: e.key })
      } else if (e.key === '.') {
        handleKey({ label: '.', kind: 'num', append: '.' })
      } else if (e.key === '%') {
        handleKey({ label: '%', kind: 'op', append: '/100' })
      } else if (e.key in KEYBOARD_MAP) {
        const append = KEYBOARD_MAP[e.key]
        handleKey({
          label: append,
          kind: e.key === '(' || e.key === ')' || e.key === '!' ? 'fn' : 'op',
          append,
        })
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault()
        handleKey({ label: '=', kind: 'action', action: 'equals' })
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        handleKey({ label: '⌫', kind: 'action', action: 'back' })
      } else if (e.key === 'Escape') {
        handleKey({ label: 'AC', kind: 'action', action: 'clear' })
      } else {
        return
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleKey])

  const bigText = justEvaluated ? bigResult : expr || '0'
  const subText = justEvaluated
    ? lastExpression
    : preview
      ? `= ${preview}`
      : ' '

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      {/* Display */}
      <div className="border-border bg-card rounded-2xl border p-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setScientific((s) => !s)}
            className={cn(
              'text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors',
              scientific && 'text-foreground',
            )}
          >
            <Sigma className="size-3.5" />
            Scientific
          </button>
          {scientific && (
            <ToggleGroup
              type="single"
              size="sm"
              value={angleMode}
              onValueChange={(v) => v && setAngleMode(v as AngleMode)}
              className="bg-muted rounded-md p-0.5"
            >
              <ToggleGroupItem value="deg" className="px-2.5 text-xs">
                DEG
              </ToggleGroupItem>
              <ToggleGroupItem value="rad" className="px-2.5 text-xs">
                RAD
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>

        <div className="mt-3 text-right">
          <div className="text-muted-foreground h-5 truncate font-mono text-sm">
            {error ? (
              <span className="text-destructive">{error}</span>
            ) : (
              subText
            )}
          </div>
          <div className="text-foreground mt-1 truncate font-mono text-4xl font-semibold tabular-nums tracking-tight">
            {bigText}
          </div>
        </div>
      </div>

      {/* Scientific keypad */}
      {scientific && (
        <div className="grid grid-cols-4 gap-2">
          {SCIENTIFIC_KEYS.map((key) => (
            <KeypadButton key={key.label} k={key} onPress={handleKey} science />
          ))}
        </div>
      )}

      {/* Basic keypad */}
      <div className="grid grid-cols-4 gap-2">
        {BASIC_KEYS.map((key) => (
          <KeypadButton key={key.label} k={key} onPress={handleKey} />
        ))}
      </div>
    </div>
  )
}

function KeypadButton({
  k,
  onPress,
  science,
}: {
  k: Key
  onPress: (k: Key) => void
  science?: boolean
}) {
  const isEquals = k.action === 'equals'
  const isOp = k.kind === 'op'
  const isAction = k.kind === 'action' && !isEquals

  return (
    <Button
      type="button"
      variant={
        isEquals ? 'default' : isOp || isAction ? 'secondary' : 'outline'
      }
      onClick={() => onPress(k)}
      className={cn(
        'calc-key h-14 select-none text-lg font-medium',
        science && 'h-11 text-sm',
        isEquals && 'bg-primary text-primary-foreground',
        isOp && 'text-primary font-semibold',
        k.label === 'AC' && 'text-destructive',
      )}
    >
      {k.label === '⌫' ? <Delete className="size-5" /> : k.label}
    </Button>
  )
}

// ---------------------------------------------------------------------------
// Convert
// ---------------------------------------------------------------------------

function ConvertPane() {
  const [categoryId, setCategoryId] = useState<CategoryId>('length')
  const [value, setValue] = useState('1')
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const category = useMemo(
    () => CATEGORIES.find((c) => c.id === categoryId) ?? CATEGORIES[0],
    [categoryId],
  )
  const [from, setFrom] = useState(category.units[0].id)
  const [to, setTo] = useState(category.units[1]?.id ?? category.units[0].id)
  const record = useRecordHistory()
  const isCurrency = categoryId === 'currency'

  // Live exchange rates — only fetched while the Currency category is active.
  const ratesQuery = useQuery({
    queryKey: ['rates', workspaceId],
    enabled: isCurrency,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/rates')
      if (!res.ok) throw new Error('Rates unavailable')
      return (await res.json()) as {
        base: string
        rates: Record<string, number>
        updatedAt: string | null
        nextUpdateAt: string | null
        fetchedAt: string
      }
    },
  })
  const rates = ratesQuery.data?.rates

  // Reset unit selection when the category changes.
  useEffect(() => {
    setFrom(category.units[0].id)
    setTo(category.units[1]?.id ?? category.units[0].id)
  }, [category])

  const parsed = Number(value)
  const computed = useMemo(() => {
    if (value.trim() === '' || !Number.isFinite(parsed)) return null
    // Currency results wait for live rates.
    if (isCurrency && !rates) return null
    try {
      const res = convert(parsed, from, to, categoryId, rates)
      return formatResult(res.result)
    } catch {
      return null
    }
  }, [parsed, from, to, categoryId, value, isCurrency, rates])

  const swap = () => {
    setFrom(to)
    setTo(from)
  }

  const save = () => {
    if (computed === null) return
    try {
      const res = convert(parsed, from, to, categoryId, rates)
      record.mutate({
        kind: 'convert',
        expression: `${formatResult(parsed)} ${unitSymbol(from)} → ${unitSymbol(to)}`,
        result: `${computed} ${unitSymbol(to)}`,
        resultValue: res.result,
      })
    } catch {
      // Ignore — the button is disabled when no result is available.
    }
  }

  const ratesUpdatedLabel = useMemo(() => {
    const iso = ratesQuery.data?.updatedAt ?? ratesQuery.data?.fetchedAt
    if (!iso) return null
    const ms = Date.parse(iso)
    if (!Number.isFinite(ms)) return null
    return new Date(ms).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  }, [ratesQuery.data])

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategoryId(cat.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              cat.id === categoryId
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            <span className="mr-1">{cat.icon}</span>
            {cat.name}
          </button>
        ))}
      </div>

      <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-5">
        {/* From */}
        <div className="space-y-1.5">
          <label className="text-muted-foreground text-xs font-medium">
            From
          </label>
          <div className="flex gap-2">
            <Input
              value={value}
              inputMode="decimal"
              onChange={(e) => setValue(e.target.value)}
              className="font-mono text-lg tabular-nums"
              placeholder="0"
            />
            <UnitSelect
              units={category.units}
              value={from}
              onChange={setFrom}
            />
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={swap}
            className="text-muted-foreground hover:text-foreground rounded-full"
            aria-label="Swap units"
          >
            <ArrowRightLeft className="size-4" />
          </Button>
        </div>

        {/* To */}
        <div className="space-y-1.5">
          <label className="text-muted-foreground text-xs font-medium">
            To
          </label>
          <div className="flex gap-2">
            <div className="border-input bg-muted/40 flex h-9 flex-1 items-center justify-end rounded-md border px-3 font-mono text-lg tabular-nums">
              {computed ?? '—'}
            </div>
            <UnitSelect units={category.units} value={to} onChange={setTo} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        {isCurrency ? (
          ratesQuery.isError ? (
            <Badge variant="destructive" className="text-[11px] font-normal">
              Live rates unavailable — check your connection
            </Badge>
          ) : ratesQuery.isLoading ? (
            <Badge variant="secondary" className="text-[11px] font-normal">
              <Loader2 className="mr-1 size-3 animate-spin" />
              Fetching live rates…
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[11px] font-normal">
              Live rates{ratesUpdatedLabel ? ` · ${ratesUpdatedLabel}` : ''}
            </Badge>
          )
        ) : (
          <span />
        )}
        <Button
          type="button"
          variant="secondary"
          onClick={save}
          disabled={computed === null}
        >
          Save to history
        </Button>
      </div>
    </div>
  )
}

function UnitSelect({
  units,
  value,
  onChange,
}: {
  units: { id: string; name: string; symbol: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-36">
        <SelectValue />
      </SelectTrigger>
      {/* Cap the dropdown against the chat dock's safe-area inset (same pattern
          as Mail's snooze menu) so long lists like currencies stay scrollable
          and never extend behind the chat. */}
      <SelectContent
        position="popper"
        className="max-h-[min(20rem,calc(100vh-var(--chat-safe-padding,0px)-4rem))] overflow-y-auto"
      >
        {units.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            <span className="font-medium">{u.symbol}</span>
            <span className="text-muted-foreground ml-1.5 text-xs">
              {u.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

function relativeTime(iso: string): string {
  const then = Date.parse(iso)
  if (!Number.isFinite(then)) return ''
  const diff = Date.now() - then
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(then).toLocaleDateString()
}

function HistoryPane({ onReuse }: { onReuse: (expr: string) => void }) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const historyQuery = useQuery({
    queryKey: ['history', workspaceId, search],
    queryFn: async () => {
      const url = search
        ? `/api/history?q=${encodeURIComponent(search)}`
        : '/api/history'
      const res = await fetchWithWorkspace(url)
      if (!res.ok) throw new Error('Failed to load history')
      return (await res.json()) as { entries: HistoryEntry[] }
    },
  })

  const deleteOne = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithWorkspace(`/api/history/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['history', workspaceId] }),
  })

  const clearAll = useMutation({
    mutationFn: async () => {
      const res = await fetchWithWorkspace('/api/history', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to clear')
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['history', workspaceId] }),
  })

  const entries = historyQuery.data?.entries ?? []

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-2 px-5 py-3">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search calculations…"
            className="pl-8"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => clearAll.mutate()}
          disabled={!entries.length}
          aria-label="Clear all history"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(var(--chat-safe-padding,0px)+1.5rem)]">
        {entries.length === 0 ? (
          <div className="text-muted-foreground flex h-40 flex-col items-center justify-center gap-2 text-center text-sm">
            <HistoryIcon className="size-6 opacity-40" />
            {search
              ? 'No matching calculations.'
              : 'Calculations you run will appear here.'}
          </div>
        ) : (
          <ul className="divide-border divide-y">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="hover:bg-muted/40 group -mx-1 flex items-center gap-2 rounded-md px-1 py-2.5"
              >
                <button
                  type="button"
                  onClick={() => onReuse(entry.expression)}
                  className="min-w-0 flex-1 text-left"
                  title="Reuse in calculator"
                >
                  <div className="text-muted-foreground truncate font-mono text-xs">
                    {entry.expression}
                  </div>
                  <div className="text-foreground truncate font-mono text-base font-semibold tabular-nums">
                    {entry.result}
                  </div>
                </button>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-muted-foreground whitespace-nowrap text-[10px]">
                    {relativeTime(entry.createdAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteOne.mutate(entry.id)}
                    className="text-muted-foreground hover:text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Delete entry"
                  >
                    <Delete className="size-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// App shell
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'calc', label: 'Calculator' },
  { id: 'convert', label: 'Convert' },
] as const

export function App() {
  const [tab, setTab] = useState('calc')
  const [seed, setSeed] = useState<CalcSeed>({ expr: '', nonce: 0 })
  const [historyOpen, setHistoryOpen] = useState(false)
  const nonce = useRef(0)

  // Re-using a past calculation drops it into the keypad and closes the panel.
  const reuse = useCallback((expr: string) => {
    nonce.current += 1
    setSeed({ expr, nonce: nonce.current })
    setTab('calc')
    setHistoryOpen(false)
  }, [])

  return (
    <div className="bg-background text-foreground flex h-screen flex-col">
      {/* No in-app title — Moldable Desktop shows the app name in the macOS
          title bar, so duplicating it here would be redundant. */}
      <Tabs
        value={tab}
        onValueChange={setTab}
        className="flex min-h-0 flex-1 flex-col"
      >
        {/* Toolbar: the two modes (underline tabs) on the left, History as a
            utility action on the right — History is a record of what you did in
            those modes, not a third mode, so it opens on demand in a panel. */}
        <div className="border-border/60 border-b">
          <div className="mx-auto flex w-full max-w-md items-stretch px-2">
            <nav className="flex items-stretch">
              {TABS.map((t) => {
                const active = tab === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative px-4 py-3.5 text-sm font-medium transition-colors',
                      active
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {t.label}
                    <span
                      className={cn(
                        'bg-primary absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-opacity',
                        active ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </button>
                )
              })}
            </nav>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/60 my-auto ml-auto flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
            >
              <HistoryIcon className="size-4" />
              History
            </button>
          </div>
        </div>

        {/* Pad the bottom by the host chat dock's safe-area inset (same pattern
            as Piano/Mail) so the keypad and Save button are never hidden behind
            the chat. Falls back to 0px outside Moldable. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(var(--chat-safe-padding,0px)+1rem)] pt-4">
          <TabsContent value="calc" className="mt-0">
            <CalculatorPane seed={seed} />
          </TabsContent>
          <TabsContent value="convert" className="mt-0">
            <ConvertPane />
          </TabsContent>
        </div>
      </Tabs>

      {/* History lives in a slide-over panel (like a calculator's paper tape),
          opened from the toolbar — available from either mode. */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent
          side="right"
          className="flex w-full max-w-sm flex-col gap-0 p-0"
          style={{ maxHeight: '100dvh' }}
        >
          <SheetHeader className="border-border border-b px-5 py-4">
            <SheetTitle>History</SheetTitle>
          </SheetHeader>
          <HistoryPane onReuse={reuse} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
