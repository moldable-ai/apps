import {
  ArrowLeftRight,
  Building2,
  Check,
  ChevronRight,
  CreditCard,
  Flame,
  GripVertical,
  Inbox,
  LayoutDashboard,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  type ComponentType,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
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
import { DemoBadge } from '../components/ConnectBanner'
import { DashboardGrid } from '../components/DashboardGrid'
import { SyncStatusPill } from '../components/SyncStatusPill'
import { CardShell } from '../../ui-kit/cards'
import type { SyncModel } from '../data/accounts'
import {
  type ResolvedDashboard,
  useDeleteDashboard,
  useUpdateDashboard,
} from '../data/hooks'
import { PERSONA_BY_ID } from '../personas'

const ICONS: Record<
  string,
  ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  LayoutDashboard,
  Flame,
  ArrowLeftRight,
  CreditCard,
}
function iconFor(
  id: string,
): ComponentType<{ className?: string; strokeWidth?: number }> {
  return ICONS[PERSONA_BY_ID[id]?.icon ?? ''] ?? LayoutDashboard
}

/**
 * The product home: every dashboard in one continuous scroll, with a sticky row
 * of pills that (a) jump to a dashboard, (b) highlight the one you're viewing
 * (scroll-spy), and (c) drag to reorder — the first pill is your default (it's
 * what you land on at the top).
 */
export function DashboardsView({
  dashboards,
  isLoading,
  isError,
  demo = false,
  reviewCount = 0,
  accountCount,
  onReorder,
  onAddDashboard,
  onOpenAccounts,
  onOpenReview,
  sync,
}: {
  dashboards: ResolvedDashboard[]
  isLoading: boolean
  isError: boolean
  demo?: boolean
  reviewCount?: number
  accountCount?: number
  onReorder: (ids: string[]) => void
  onAddDashboard: () => void
  onOpenAccounts: () => void
  onOpenReview?: () => void
  sync?: SyncModel
}) {
  const [active, setActive] = useState<string | null>(dashboards[0]?.id ?? null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ResolvedDashboard | null>(
    null,
  )
  const updateDashboard = useUpdateDashboard()
  const deleteDashboard = useDeleteDashboard()

  const removeCard = (dash: ResolvedDashboard, cardId: string) =>
    updateDashboard.mutate({
      id: dash.id,
      cardIds: dash.cardIds.filter((id) => id !== cardId),
    })

  const confirmDelete = () => {
    if (!pendingDelete) return
    const id = pendingDelete.id
    deleteDashboard.mutate(id, {
      onSuccess: () =>
        onReorder(dashboards.map((d) => d.id).filter((x) => x !== id)),
    })
    setEditingId(null)
    setPendingDelete(null)
  }
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map())
  const pillRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const ids = dashboards.map((d) => d.id).join(',')

  // Scroll-spy: the section nearest the top under the sticky pill bar is active.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) setActive(e.target.id.replace('dash-', ''))
      },
      { rootMargin: '-96px 0px -55% 0px', threshold: 0 },
    )
    sectionRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [ids])

  // Keep the active pill visible in the pill rail.
  useEffect(() => {
    if (active)
      pillRefs.current
        .get(active)
        ?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [active])

  const jumpTo = (id: string) =>
    sectionRefs.current
      .get(id)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // Unified pointer drag (mouse + touch). A pill is a tap (jump) until the
  // pointer moves past a small threshold; then it becomes a reorder drag.
  const dragSession = useRef<{
    id: string
    startX: number
    moved: boolean
    pointerId: number
  } | null>(null)

  const pillAtX = (clientX: number): string | null => {
    for (const [id, el] of pillRefs.current) {
      const r = el.getBoundingClientRect()
      if (clientX >= r.left && clientX <= r.right) return id
    }
    return null
  }

  const reorderDuringDrag = useCallback(
    (draggedId: string, clientX: number) => {
      const targetId = pillAtX(clientX)
      if (!targetId || targetId === draggedId) return
      const order = dashboards.map((d) => d.id)
      const from = order.indexOf(draggedId)
      const to = order.indexOf(targetId)
      if (from < 0 || to < 0) return
      // Only swap once the pointer crosses the target's midpoint in the travel
      // direction — prevents adjacent pills from oscillating.
      const r = pillRefs.current.get(targetId)?.getBoundingClientRect()
      if (!r) return
      const mid = (r.left + r.right) / 2
      if ((to > from && clientX > mid) || (to < from && clientX < mid)) {
        order.splice(to, 0, order.splice(from, 1)[0])
        onReorder(order)
      }
    },
    [dashboards, onReorder],
  )

  const onPillPointerDown = (
    e: ReactPointerEvent<HTMLButtonElement>,
    id: string,
  ) => {
    dragSession.current = {
      id,
      startX: e.clientX,
      moved: false,
      pointerId: e.pointerId,
    }
    setDragId(id)
  }
  const onPillPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const s = dragSession.current
    if (!s) return
    if (!s.moved) {
      if (Math.abs(e.clientX - s.startX) < 6) return
      s.moved = true
      try {
        e.currentTarget.setPointerCapture(s.pointerId)
      } catch {
        // capture is best-effort
      }
    }
    reorderDuringDrag(s.id, e.clientX)
  }
  const onPillPointerUp = (id: string) => {
    const s = dragSession.current
    dragSession.current = null
    setDragId(null)
    if (s && !s.moved) jumpTo(id)
  }

  // Keyboard reorder: focus a pill, Arrow Left/Right to move it (a11y for drag).
  const move = useCallback(
    (id: string, dir: -1 | 1) => {
      const order = dashboards.map((d) => d.id)
      const i = order.indexOf(id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= order.length) return
      ;[order[i], order[j]] = [order[j], order[i]]
      onReorder(order)
    },
    [dashboards, onReorder],
  )

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardShell key={i} title="Loading" state="loading" />
          ))}
        </div>
      </div>
    )
  }
  if (isError) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <CardShell
          title="Dashboards"
          state="error"
          errorMessage="Couldn’t load your dashboards."
        />
      </div>
    )
  }

  if (dashboards.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 pt-24 text-center sm:px-6">
        <span className="bg-muted text-foreground/70 mb-4 flex size-14 items-center justify-center rounded-2xl">
          <LayoutDashboard className="size-7" />
        </span>
        <h2 className="text-xl font-semibold tracking-tight">
          No dashboards yet
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Install a ready-made dashboard to see your money at a glance, or ask
          the agent to build one for you.
        </p>
        <button
          type="button"
          onClick={onAddDashboard}
          className="bg-foreground text-background mt-6 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          Browse dashboards
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* sticky pill rail */}
      <div className="border-border/60 bg-background/90 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 sm:px-6">
          <nav
            aria-label="Dashboards — drag to reorder, first is your default"
            className="flex flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {dashboards.map((d) => {
              const Icon = iconFor(d.id)
              const on = active === d.id
              return (
                <button
                  key={d.id}
                  ref={(el) => {
                    if (el) pillRefs.current.set(d.id, el)
                  }}
                  type="button"
                  aria-current={on ? 'true' : undefined}
                  aria-label={`Go to ${d.name}. Drag, or press arrow keys, to reorder.`}
                  onPointerDown={(e) => onPillPointerDown(e, d.id)}
                  onPointerMove={onPillPointerMove}
                  onPointerUp={() => onPillPointerUp(d.id)}
                  onPointerCancel={() => {
                    dragSession.current = null
                    setDragId(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') {
                      e.preventDefault()
                      move(d.id, -1)
                    } else if (e.key === 'ArrowRight') {
                      e.preventDefault()
                      move(d.id, 1)
                    } else if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      jumpTo(d.id)
                    }
                  }}
                  className={cn(
                    'focus-visible:ring-ring group inline-flex shrink-0 touch-pan-y select-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2',
                    on
                      ? 'border-foreground/30 bg-foreground text-background'
                      : 'border-border/60 bg-card text-muted-foreground hover:text-foreground',
                    dragId === d.id && 'opacity-50',
                  )}
                  title="Drag to reorder · first is your default"
                >
                  <GripVertical
                    className={cn(
                      'size-3',
                      on ? 'text-background/60' : 'text-muted-foreground/40',
                    )}
                  />
                  <Icon className="size-3.5" />
                  {d.name}
                </button>
              )
            })}
          </nav>
          {!demo && sync ? (
            <SyncStatusPill model={sync} onOpenAccounts={onOpenAccounts} />
          ) : null}
          <button
            type="button"
            onClick={onOpenAccounts}
            aria-label={accountCount ? `${accountCount} accounts` : 'Accounts'}
            className="border-border/60 bg-card text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium"
          >
            <Building2 className="size-3.5" />
            {accountCount ? accountCount : 'Accounts'}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-[calc(var(--chat-safe-padding,0px)+5rem)] pt-5 sm:px-6">
        {!demo && reviewCount > 0 && onOpenReview ? (
          <button
            type="button"
            onClick={onOpenReview}
            className="border-[var(--chart-1)]/30 bg-[var(--chart-1)]/8 hover:bg-[var(--chart-1)]/12 mb-6 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors"
          >
            <span className="bg-[var(--chart-1)]/15 flex size-8 items-center justify-center rounded-lg text-[var(--chart-1)]">
              <Inbox className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">
                {reviewCount} {reviewCount === 1 ? 'merchant' : 'merchants'} to
                categorize
              </span>
              <span className="text-muted-foreground block text-xs">
                One tap each to label your spending and sharpen these
                dashboards.
              </span>
            </span>
            <ChevronRight className="text-muted-foreground size-4 shrink-0" />
          </button>
        ) : null}

        <div className="space-y-10">
          {dashboards.map((d) => {
            const Icon = iconFor(d.id)
            const tagline = PERSONA_BY_ID[d.id]?.tagline
            return (
              <section
                key={d.id}
                id={`dash-${d.id}`}
                ref={(el) => {
                  if (el) sectionRefs.current.set(d.id, el)
                }}
                className="scroll-mt-24"
              >
                <div className="mb-4 flex items-center gap-2.5">
                  <Icon
                    className="text-muted-foreground/80 size-[1.15rem] shrink-0"
                    strokeWidth={1.75}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {editingId === d.id ? (
                        <input
                          defaultValue={d.name}
                          aria-label="Dashboard name"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur()
                          }}
                          onBlur={(e) => {
                            const name = e.target.value.trim()
                            if (name && name !== d.name)
                              updateDashboard.mutate({ id: d.id, name })
                          }}
                          className="border-border bg-background focus-visible:ring-ring min-w-0 flex-1 rounded-md border px-2 py-0.5 text-lg font-semibold tracking-tight outline-none focus-visible:ring-2"
                        />
                      ) : (
                        <h2 className="truncate text-lg font-semibold tracking-tight">
                          {d.name}
                        </h2>
                      )}
                      {demo ? <DemoBadge /> : null}
                    </div>
                    {tagline ? (
                      <p className="text-muted-foreground truncate text-xs">
                        {tagline}
                      </p>
                    ) : null}
                  </div>
                  {!demo ? (
                    <div className="flex shrink-0 items-center gap-1">
                      {editingId === d.id ? (
                        <button
                          type="button"
                          onClick={() => setPendingDelete(d)}
                          aria-label={`Delete ${d.name} dashboard`}
                          className="text-muted-foreground hover:text-destructive inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium"
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() =>
                          setEditingId((cur) => (cur === d.id ? null : d.id))
                        }
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium"
                      >
                        {editingId === d.id ? (
                          <Check className="size-3.5" />
                        ) : (
                          <Pencil className="size-3.5" />
                        )}
                        {editingId === d.id ? 'Done' : 'Edit'}
                      </button>
                    </div>
                  ) : null}
                </div>
                {d.cards.length ? (
                  <DashboardGrid
                    cards={d.cards}
                    enableDrilldown={!demo}
                    onRemoveCard={
                      editingId === d.id
                        ? (cardId) => removeCard(d, cardId)
                        : undefined
                    }
                  />
                ) : (
                  <CardShell
                    title={d.name}
                    state="empty"
                    emptyMessage="No cards on this dashboard yet."
                  />
                )}
              </section>
            )
          })}

          <button
            type="button"
            onClick={onAddDashboard}
            className="border-border/70 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-5 text-sm font-medium transition-colors"
          >
            <Plus className="size-4" />
            Add a dashboard
          </button>
        </div>
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => (!open ? setPendingDelete(null) : undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{pendingDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the dashboard from your list. The underlying cards
              and your data aren’t deleted — you can re-add a dashboard anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
