import {
  Check,
  ChevronDown,
  Loader2,
  PartyPopper,
  Sparkles,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  cn,
} from '@moldable-ai/ui'
import { formatDate, formatMoney } from '../../ui-kit/lib/format'
import { CardShell } from '../../ui-kit/cards'
import { MerchantChip } from '../../ui-kit/cards/MerchantChip'
import {
  type BudgetProposal,
  type ReviewGroup,
  suggestedNeedForGroup,
  useApplyLabel,
  useBudgetProposals,
  useClassifyBudget,
  useReviewGroups,
} from '../data/labeling'
import { SubscriptionsScreen } from './SubscriptionsScreen'

const EMPTY_PROPOSALS: Map<string, BudgetProposal> = new Map()

/**
 * "How essential is this?" — the `budget.need` axis. The clearest, most
 * card-powering human decision: it splits spending into required vs waste and
 * feeds the BudgetLabels collection (`Expenses.Where(need = "required")`).
 */
const NEED_OPTIONS: Array<{
  value: string
  label: string
  hint: string
  dot: string
  ring: string
  tint: string
}> = [
  {
    value: 'required',
    label: 'Required',
    hint: 'Rent, bills, groceries',
    dot: 'bg-success',
    ring: 'hover:border-success/60',
    tint: 'border-success/50 bg-success/10',
  },
  {
    value: 'useful',
    label: 'Useful',
    hint: 'Tools, health, growth',
    dot: 'bg-[var(--chart-3)]',
    ring: 'hover:border-[var(--chart-3)]/60',
    tint: 'border-[var(--chart-3)]/50 bg-[var(--chart-3)]/10',
  },
  {
    value: 'optional',
    label: 'Optional',
    hint: 'Dining, fun, extras',
    dot: 'bg-warning',
    ring: 'hover:border-warning/60',
    tint: 'border-warning/50 bg-warning/10',
  },
  {
    value: 'waste',
    label: 'Waste',
    hint: 'Wish I hadn’t',
    dot: 'bg-destructive',
    ring: 'hover:border-destructive/60',
    tint: 'border-destructive/50 bg-destructive/10',
  },
]

/**
 * The human-in-the-loop surface, reframed as **categorization**. Agents handle
 * the rest; here you make the one decision that powers your dashboards — how
 * essential each merchant's spending is. One answer labels all of that merchant's
 * transactions.
 */
export function ReviewScreen({ demo = false }: { demo?: boolean }) {
  const [mode, setMode] = useState<'categorize' | 'subscriptions'>('categorize')
  const groupsQuery = useReviewGroups(!demo)
  const proposalsQuery = useBudgetProposals(!demo)
  const apply = useApplyLabel()
  const classify = useClassifyBudget()
  const [resolved, setResolved] = useState<Set<string>>(new Set())
  const [confirmAgent, setConfirmAgent] = useState(false)
  // Delayed-commit + undo: a tap optimistically clears the card, but the real
  // write (and forward-rule teach) only fires after a grace window — so Undo is
  // instant and costs nothing. Prevents a mis-tap from mislabeling + teaching.
  const [toast, setToast] = useState<{ name: string; label: string } | null>(
    null,
  )
  const pendingRef = useRef<{
    group: ReviewGroup
    kind: 'label' | 'skip'
    need?: string
  } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const allGroups = demo ? [] : (groupsQuery.data?.groups ?? [])
  const groups = allGroups.filter((g) => !resolved.has(g.id))
  const loading = !demo && groupsQuery.isLoading
  const done = !loading && groups.length === 0 && !toast

  const resolve = (id: string) => setResolved((prev) => new Set(prev).add(id))
  const unresolve = (id: string) =>
    setResolved((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })

  const fire = (p: {
    group: ReviewGroup
    kind: 'label' | 'skip'
    need?: string
  }) => {
    if (p.kind === 'label' && p.need) {
      apply.mutate({
        selector: p.group.labelSelector,
        namespace: 'budget',
        values: { need: p.need },
        // Teach a forward rule so future charges from this merchant auto-label.
        teachRule: true,
        rule: {
          scope: 'merchant',
          match: p.group.labelSelector,
          name: p.group.name,
        },
      })
    } else if (p.kind === 'skip') {
      const action = p.group.notSpendingAction
      if (action?.selector && action.namespace && action.values) {
        apply.mutate({
          selector: action.selector,
          namespace: action.namespace,
          values: action.values,
          teachRule: action.teachRule ?? true,
        })
      }
    }
  }

  // Commit any queued action immediately (called before a new one, on undo's
  // sibling path, and on unmount so nothing is silently dropped).
  const flush = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    if (pendingRef.current) fire(pendingRef.current)
    pendingRef.current = null
  }

  const enqueue = (
    group: ReviewGroup,
    kind: 'label' | 'skip',
    need?: string,
  ) => {
    flush() // a new decision commits the previous one
    resolve(group.id)
    pendingRef.current = { group, kind, need }
    setToast({
      name: group.name,
      label: kind === 'skip' ? 'skipped' : (need ?? ''),
    })
    timerRef.current = setTimeout(() => {
      if (pendingRef.current) fire(pendingRef.current)
      pendingRef.current = null
      timerRef.current = null
      setToast(null)
    }, 4500)
  }

  const undo = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    const p = pendingRef.current
    pendingRef.current = null
    setToast(null)
    if (p) unresolve(p.group.id)
  }

  // Commit a pending write if the screen unmounts (e.g. tab switch). Use a ref
  // so the cleanup always calls the latest closure without re-subscribing.
  const flushRef = useRef(flush)
  flushRef.current = flush
  useEffect(() => () => flushRef.current(), [])

  const label = (group: ReviewGroup, need: string) =>
    enqueue(group, 'label', need)
  const skip = (group: ReviewGroup) => {
    if (group.notSpendingAction?.selector) enqueue(group, 'skip')
    else resolve(group.id)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-[calc(var(--chat-safe-padding,0px)+5rem)] pt-6 sm:px-6">
      <div
        role="group"
        aria-label="Review mode"
        className="bg-muted mb-4 inline-flex rounded-lg p-0.5 text-sm"
      >
        {(['categorize', 'subscriptions'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={cn(
              'rounded-md px-3 py-1 font-medium capitalize transition-colors',
              mode === m
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === 'subscriptions' ? (
        <SubscriptionsScreen demo={demo} />
      ) : (
        <CategorizeBody
          loading={loading}
          error={groupsQuery.isError}
          onRetry={() => void groupsQuery.refetch()}
          demo={demo}
          done={done}
          groups={groups}
          proposals={proposalsQuery.data ?? EMPTY_PROPOSALS}
          onLabel={label}
          onSkip={skip}
          agentPending={classify.isPending}
          agentProposed={classify.data?.ran ? classify.data.proposed : null}
          agentError={
            classify.isError ? (classify.error as Error).message : null
          }
          onAgentPass={() => setConfirmAgent(true)}
        />
      )}

      <AlertDialog open={confirmAgent} onOpenChange={setConfirmAgent}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Let agents take a first pass?</AlertDialogTitle>
            <AlertDialogDescription>
              Agents will read your unlabeled expenses and suggest how essential
              each merchant is. Nothing is applied automatically — each
              suggestion shows up pre-selected on the cards below, and you
              confirm (or change) it. This uses AI on a batch of your
              transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmAgent(false)
                classify.mutate()
              }}
            >
              <Sparkles className="size-4" />
              Let agents categorize
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {toast ? (
        <UndoToast name={toast.name} label={toast.label} onUndo={undo} />
      ) : null}
    </div>
  )
}

/** Transient confirmation with an Undo, shown above the tab bar after a tap. */
function UndoToast({
  name,
  label,
  onUndo,
}: {
  name: string
  label: string
  onUndo: () => void
}) {
  const verb = label === 'skipped' ? 'Skipped' : 'Labeled'
  const detail = label === 'skipped' ? '' : ` · ${cap(label)}`
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-[calc(var(--chat-safe-padding,0px)+4.75rem)] z-40 flex justify-center px-4"
    >
      <div className="border-border/60 bg-foreground text-background flex items-center gap-3 rounded-full border px-4 py-2 text-sm shadow-lg">
        <span className="truncate">
          <span className="font-medium">{verb}</span> {name}
          <span className="text-background/70">{detail}</span>
        </span>
        <button
          type="button"
          onClick={onUndo}
          className="text-background shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold underline-offset-2 hover:underline"
        >
          Undo
        </button>
      </div>
    </div>
  )
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function CategorizeBody({
  loading,
  error,
  onRetry,
  demo,
  done,
  groups,
  proposals,
  onLabel,
  onSkip,
  agentPending,
  agentProposed,
  agentError,
  onAgentPass,
}: {
  loading: boolean
  error: boolean
  onRetry: () => void
  demo: boolean
  done: boolean
  groups: ReviewGroup[]
  proposals: Map<string, BudgetProposal>
  onLabel: (g: ReviewGroup, need: string) => void
  onSkip: (g: ReviewGroup) => void
  agentPending: boolean
  agentProposed: number | null
  agentError: string | null
  onAgentPass: () => void
}) {
  return (
    <>
      <div className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight">Categorize</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          One tap sets how essential a merchant is — it labels every charge
          there and remembers it.
        </p>
      </div>

      {!demo && !loading && !error && !done ? (
        <AgentPass
          pending={agentPending}
          proposed={agentProposed}
          error={agentError}
          onRun={onAgentPass}
        />
      ) : null}

      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="border-border/50 bg-card h-[88px] animate-pulse rounded-2xl border"
            />
          ))}
        </div>
      ) : error ? (
        <CardShell
          title="Categorize"
          state="error"
          errorMessage="Couldn’t load what needs categorizing."
          onRetry={onRetry}
        />
      ) : done ? (
        <div className="border-border/70 bg-card/40 flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-14 text-center">
          <PartyPopper className="text-success size-8" />
          <p className="font-medium">All categorized</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            {demo
              ? 'When there’s spending to label, it shows up here — one quick tap per merchant.'
              : 'Nothing left to label. New transactions will appear here as they come in.'}
          </p>
        </div>
      ) : (
        <>
          <Legend remaining={groups.length} />
          <div className="space-y-2.5">
            {groups.slice(0, 30).map((g) => (
              <GroupCard
                key={g.id}
                group={g}
                suggested={suggestedNeedForGroup(g, proposals)}
                onPick={(need) => onLabel(g, need)}
                onSkip={() => onSkip(g)}
              />
            ))}
          </div>
        </>
      )}
    </>
  )
}

/** One compact reference for the four levels — so the cards don't repeat hints. */
function Legend({ remaining }: { remaining: number }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {NEED_OPTIONS.map((o) => (
          <span
            key={o.value}
            className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px]"
          >
            <span className={cn('size-2 rounded-full', o.dot)} />
            {o.label}
          </span>
        ))}
      </div>
      <span className="text-muted-foreground/70 shrink-0 text-[11px] font-medium tabular-nums">
        {remaining} left
      </span>
    </div>
  )
}

/**
 * The agentic-first entry point: kick off a classifier pass that pre-suggests a
 * `budget.need` for each merchant. The suggestions land pre-selected on the
 * cards below (via `group.suggested`), so this turns the human's job from
 * "label everything" into "confirm or correct what the agent proposed."
 */
function AgentPass({
  pending,
  proposed,
  error,
  onRun,
}: {
  pending: boolean
  proposed: number | null
  error: string | null
  onRun: () => void
}) {
  if (pending) {
    return (
      <div className="border-[var(--chart-4)]/30 bg-[var(--chart-4)]/8 mb-3 flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm">
        <Loader2 className="size-4 shrink-0 animate-spin text-[var(--chart-4)]" />
        <span className="font-medium">Reading your spending…</span>
      </div>
    )
  }
  if (proposed !== null) {
    return (
      <div className="border-success/30 bg-success/8 mb-3 flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm">
        <Check className="text-success size-4 shrink-0" />
        <span>
          <span className="font-medium">
            {proposed > 0 ? `Pre-sorted ${proposed}.` : 'Agents took a pass.'}
          </span>{' '}
          <span className="text-muted-foreground">
            Confirm the ✨ suggestions below.
          </span>
        </span>
      </div>
    )
  }
  return (
    <div className="border-[var(--chart-4)]/30 from-[var(--chart-4)]/10 to-[var(--chart-1)]/10 mb-3 flex items-center gap-3 rounded-xl border bg-gradient-to-r px-3.5 py-2.5">
      <Sparkles className="size-4 shrink-0 text-[var(--chart-4)]" />
      <span className="min-w-0 flex-1 text-sm">
        <span className="font-medium">Let agents pre-sort these</span>
        <span className="text-muted-foreground"> — you just confirm.</span>
        {error ? (
          <span className="text-destructive mt-0.5 block text-xs">{error}</span>
        ) : null}
      </span>
      <button
        type="button"
        onClick={onRun}
        className="bg-foreground text-background inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
      >
        <Sparkles className="size-3.5" />
        {error ? 'Try again' : 'Auto-categorize'}
      </button>
    </div>
  )
}

function GroupCard({
  group,
  suggested,
  onPick,
  onSkip,
}: {
  group: ReviewGroup
  suggested?: string
  onPick: (need: string) => void
  onSkip: () => void
}) {
  const [open, setOpen] = useState(false)
  const txns = [...(group.transactions ?? [])].sort(
    (a, b) => Math.abs(b.amount) - Math.abs(a.amount),
  )
  const top = txns[0]
  const cat = top?.category?.find(
    (c) => c && c !== 'OTHER' && c !== 'OTHER_OTHER',
  )

  return (
    <div className="border-border/60 bg-card rounded-2xl border p-3.5">
      {/* merchant + amount */}
      <div className="flex items-center gap-3">
        <MerchantChip name={group.name} size={38} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-semibold">{group.name}</span>
            <span className="uk-nums shrink-0 text-sm font-semibold tabular-nums">
              {formatMoney(Math.abs(group.totalAmount))}
            </span>
          </div>
          <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
            <span>
              {group.count} {group.count === 1 ? 'charge' : 'charges'}
            </span>
            {cat ? (
              <span className="truncate">· {humanizeCategory(cat)}</span>
            ) : null}
            {suggested ? (
              <span className="ml-auto inline-flex shrink-0 items-center gap-1 font-medium text-[var(--chart-4)]">
                <Sparkles className="size-3" /> Suggested
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* the one decision — compact 4-way, suggested pre-highlighted */}
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {NEED_OPTIONS.map((opt) => {
          const isSuggested = suggested === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onPick(opt.value)}
              aria-label={`${opt.label}${isSuggested ? ' (suggested)' : ''} — ${opt.hint}`}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-colors',
                isSuggested
                  ? cn('text-foreground font-semibold', opt.tint)
                  : cn(
                      'border-border/60 text-muted-foreground hover:text-foreground',
                      opt.ring,
                    ),
              )}
            >
              <span className={cn('size-2 rounded-full', opt.dot)} />
              {opt.label}
            </button>
          )
        })}
      </div>

      {/* light footer: inspect + skip */}
      <div className="mt-2 flex items-center justify-between text-[11px]">
        {txns.length ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ChevronDown
              className={cn(
                'size-3 transition-transform',
                open && 'rotate-180',
              )}
            />
            {open ? 'Hide charges' : 'Inspect charges'}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onSkip}
          className="text-muted-foreground hover:text-foreground font-medium"
        >
          Not spending
        </button>
      </div>

      {open && txns.length ? (
        <ul className="bg-background/50 mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg p-2 text-xs">
          {txns.slice(0, 30).map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground shrink-0">
                {formatDate(t.date, { month: 'short', day: 'numeric' })}
              </span>
              <span className="min-w-0 flex-1 truncate">{t.name}</span>
              <span className="uk-nums shrink-0 tabular-nums">
                {formatMoney(Math.abs(t.amount), { cents: true })}
              </span>
            </li>
          ))}
          {group.count > txns.length ? (
            <li className="text-muted-foreground/70 pt-0.5 text-center text-[11px]">
              +{group.count - txns.length} more
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}

function humanizeCategory(raw: string): string {
  return raw
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
