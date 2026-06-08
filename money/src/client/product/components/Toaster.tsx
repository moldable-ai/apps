import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@moldable-ai/ui'

/**
 * A tiny, dependency-free toast system (sonner isn't installed). Module-level
 * store so non-React callers — e.g. the sync mutations in `data/accounts.ts` —
 * can fire a toast, with a single `<Toaster/>` mounted once at the app root.
 * Matches the app's existing fixed-bottom, low-chrome toast aesthetic.
 */
export type ToastTone = 'success' | 'warning' | 'error' | 'info'

export interface ToastItem {
  id: string
  /** Bumped on every (re-)fire so the dismiss timer restarts even when id is reused. */
  nonce: number
  tone: ToastTone
  title: string
  description?: string
}

let items: ToastItem[] = []
let seq = 0
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

/** Fire a toast. Re-using an `id` replaces the existing one (de-dupes). */
export function showToast(
  t: Omit<ToastItem, 'id' | 'nonce'> & { id?: string },
): string {
  const nonce = ++seq
  const id = t.id ?? `toast-${nonce}`
  items = [
    ...items.filter((i) => i.id !== id),
    { id, nonce, tone: t.tone, title: t.title, description: t.description },
  ]
  emit()
  return id
}

export function dismissToast(id: string) {
  items = items.filter((i) => i.id !== id)
  emit()
}

function useToasts(): ToastItem[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => items,
    () => items,
  )
}

const TONE: Record<ToastTone, { icon: typeof Info; cls: string }> = {
  success: { icon: CheckCircle2, cls: 'text-success' },
  warning: { icon: AlertTriangle, cls: 'text-warning' },
  error: { icon: XCircle, cls: 'text-destructive' },
  info: { icon: Info, cls: 'text-[var(--chart-1)]' },
}

/** Mount once at the app root. */
export function Toaster() {
  const toasts = useToasts()
  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--chat-safe-padding,0px)+4.75rem)] z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <ToastRow key={t.id} toast={t} />
      ))}
    </div>,
    document.body,
  )
}

function ToastRow({ toast }: { toast: ToastItem }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true))
    // Keyed on nonce too, so a replace-by-id re-fire restarts the dwell timer.
    const timer = setTimeout(() => dismissToast(toast.id), 4400)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [toast.id, toast.nonce])

  const { icon: Icon, cls } = TONE[toast.tone]
  return (
    <div
      className={cn(
        'border-border/60 bg-card pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-3.5 py-2.5 shadow-lg shadow-black/20 transition-all duration-200',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
      )}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', cls)} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{toast.title}</div>
        {toast.description ? (
          <div className="text-muted-foreground text-xs">
            {toast.description}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        aria-label="Dismiss"
        className="text-muted-foreground/60 hover:text-foreground -mr-1 shrink-0 rounded-md p-0.5"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}
