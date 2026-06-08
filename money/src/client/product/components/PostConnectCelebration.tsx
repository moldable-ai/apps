import {
  ArrowRight,
  CheckCircle2,
  Receipt,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@moldable-ai/ui'

const CONFETTI_COLORS = [
  '#22c55e', // success green
  '#f97316', // orange (chart-1)
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#22d3ee', // cyan
  '#facc15', // gold
]

/** Two-sided streamer confetti for ~2s. Lazy-loads the lib so it never weighs
 * down the initial bundle. */
async function fireConfetti() {
  const confetti = (await import('canvas-confetti')).default
  const end = Date.now() + 2000
  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: CONFETTI_COLORS,
    })
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: CONFETTI_COLORS,
    })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}

/**
 * The "your real numbers are in" moment — fires once, the first time a user's
 * demo dashboards flip to their real connected data. This is the payoff of the
 * whole FTUE: they installed dashboards, saw the shape of the value on sample
 * data, connected a bank, and now the same dashboards are *theirs*. We make that
 * transition feel earned instead of letting the DEMO badges silently vanish.
 */
export function PostConnectCelebration({
  accounts,
  transactions,
  onDismiss,
}: {
  accounts?: number
  transactions?: number
  onDismiss: () => void
}) {
  // Tiny entrance: mount → next frame → animate in (no animation lib needed).
  const [shown, setShown] = useState(false)
  const ctaRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    void fireConfetti()
    // Move focus into the dialog and let Escape dismiss it (this is a custom
    // overlay, so it doesn't get the ui-kit Dialog's focus handling for free).
    ctaRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('keydown', onKey)
    }
  }, [onDismiss])

  const fmt = (n?: number) =>
    typeof n === 'number' ? n.toLocaleString('en-US') : '—'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Your account is connected"
      className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
    >
      <div
        className={[
          'border-border/60 bg-card relative w-full max-w-md overflow-hidden rounded-2xl border p-7 text-center shadow-2xl transition-all duration-500',
          shown
            ? 'translate-y-0 scale-100 opacity-100'
            : 'translate-y-3 scale-95 opacity-0',
        ].join(' ')}
      >
        {/* warm glow behind the seal */}
        <div
          aria-hidden
          className="from-[var(--chart-1)]/25 pointer-events-none absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-gradient-to-b to-transparent blur-2xl"
        />

        <div className="relative">
          <div className="bg-success/12 text-success mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl">
            <CheckCircle2 className="size-9" />
          </div>

          <div className="mb-1 flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wide text-[var(--chart-1)]">
            <Sparkles className="size-3.5" />
            Your real numbers are in
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">You’re live</h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-xs text-sm">
            Your dashboards just refreshed with your actual accounts and
            spending — no more sample data.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Stat
              icon={<Wallet className="size-4" />}
              value={fmt(accounts)}
              label={accounts === 1 ? 'account' : 'accounts'}
            />
            <Stat
              icon={<Receipt className="size-4" />}
              value={fmt(transactions)}
              label="transactions"
            />
          </div>

          <Button
            ref={ctaRef}
            size="lg"
            className="mt-7 w-full"
            onClick={onDismiss}
          >
            Explore your dashboards
            <ArrowRight className="size-4" />
          </Button>
          <p className="text-muted-foreground mt-3 text-xs">
            Tip: tap any card to see the transactions behind it.
          </p>
        </div>
      </div>
    </div>
  )
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: string
  label: string
}) {
  return (
    <div className="border-border/60 bg-background/50 rounded-xl border px-3 py-3">
      <div className="text-muted-foreground mb-1 flex items-center justify-center">
        {icon}
      </div>
      <div className="text-xl font-semibold tabular-nums tracking-tight">
        {value}
      </div>
      <div className="text-muted-foreground text-xs">{label}</div>
    </div>
  )
}
