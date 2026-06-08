import { RotateCcw, SquareFunction, X } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Badge, Button, cn } from '@moldable-ai/ui'
import { riseStyle, useReducedMotion } from '../lib/motion'
import { MicroLabel } from './atoms'

export type CardState = 'ready' | 'loading' | 'empty' | 'error'

export interface CardShellProps {
  title: string
  icon?: ReactNode
  /** Small badge top-right (e.g. the card kind). */
  kindBadge?: string
  /** Primary formula shown in the inspector. */
  formula?: string
  secondaryFormulas?: Record<string, string>
  /** Plain-English explanation of what the formula computes. */
  formulaExplain?: string
  referencedCollections?: string[]
  /** Secondary stat row pinned to the card foot. */
  footer?: ReactNode
  state?: CardState
  emptyMessage?: string
  errorMessage?: string
  onRetry?: () => void
  /** Stagger index for the entrance animation. */
  index?: number
  /** Show the inspect-formula control (defaults to true when a formula exists). */
  inspectable?: boolean
  action?: ReactNode
  className?: string
  children?: ReactNode
}

const CARD_SURFACE =
  'flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card p-4 sm:p-5 ' +
  'transition-shadow duration-200 group-hover:border-border group-hover:shadow-lg group-hover:shadow-black/20'

const ICON_BTN =
  'inline-flex size-6 items-center justify-center rounded-md text-muted-foreground/70 ' +
  'hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card'

/**
 * The base card chrome for every Money card. Low-chrome surface, a header with
 * an uppercase micro-label, a body, and an optional secondary-stat footer. The
 * formula inspector opens as a centered modal (rather than an in-place flip) so
 * the formula is fully readable even on small cards — and the backdrop means
 * only one card's formula is open at a time. Bakes in loading/empty/error.
 */
export function CardShell({
  title,
  icon,
  kindBadge,
  formula,
  secondaryFormulas,
  formulaExplain,
  referencedCollections,
  footer,
  state = 'ready',
  emptyMessage = 'No data yet.',
  errorMessage,
  onRetry,
  index = 0,
  inspectable,
  action,
  className,
  children,
}: CardShellProps) {
  const reduced = useReducedMotion()
  const [inspecting, setInspecting] = useState(false)
  const canInspect = (inspectable ?? Boolean(formula)) && state === 'ready'

  return (
    <div
      className={cn(
        'group relative h-full',
        'uk-rise motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:-translate-y-0.5',
        className,
      )}
      style={riseStyle(index, 55, reduced)}
    >
      <div className={CARD_SURFACE}>
        <div className="mb-3 flex items-start justify-between gap-2">
          <MicroLabel icon={icon}>{title}</MicroLabel>
          <div className="flex shrink-0 items-center gap-1">
            {kindBadge ? (
              <Badge
                variant="secondary"
                className="h-5 px-1.5 text-[10px] font-medium"
              >
                {kindBadge}
              </Badge>
            ) : null}
            {action}
            {canInspect ? (
              <button
                type="button"
                onClick={() => setInspecting(true)}
                aria-label="Show formula"
                className={cn('-mr-1', ICON_BTN)}
              >
                <SquareFunction className="size-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {state === 'loading' ? (
            <CardSkeleton />
          ) : state === 'empty' ? (
            <CardEmpty message={emptyMessage} />
          ) : state === 'error' ? (
            <CardError message={errorMessage} onRetry={onRetry} />
          ) : (
            children
          )}
        </div>

        {footer && state === 'ready' ? (
          <div className="border-border/50 mt-3.5 flex flex-wrap items-end gap-x-6 gap-y-2 border-t pt-3">
            {footer}
          </div>
        ) : null}
      </div>

      {inspecting ? (
        <FormulaModal
          title={title}
          formula={formula}
          secondaryFormulas={secondaryFormulas}
          explain={formulaExplain}
          referencedCollections={referencedCollections}
          reduced={reduced}
          onClose={() => setInspecting(false)}
        />
      ) : null}
    </div>
  )
}

/**
 * Centered, fully-readable formula inspector. Flips/scales in from the middle of
 * the screen (respecting reduced-motion), dims everything behind it, and closes
 * on backdrop click / Escape / ×.
 */
function FormulaModal({
  title,
  formula,
  secondaryFormulas,
  explain,
  referencedCollections,
  reduced,
  onClose,
}: {
  title: string
  formula?: string
  secondaryFormulas?: Record<string, string>
  explain?: string
  referencedCollections?: string[]
  reduced: boolean
  onClose: () => void
}) {
  const secondaries = Object.entries(secondaryFormulas ?? {})
  const [shown, setShown] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true))
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ perspective: 1200 }}
    >
      <button
        type="button"
        aria-label="Close formula"
        onClick={onClose}
        className={cn(
          'bg-background/70 absolute inset-0 cursor-default backdrop-blur-sm transition-opacity duration-200',
          shown ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${title} formula`}
        className={cn(
          'border-border/60 bg-card relative flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border p-5 shadow-2xl',
          'transition-all duration-300 ease-out',
          shown ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          transform: shown
            ? 'none'
            : reduced
              ? 'scale(0.96)'
              : 'rotateY(-35deg) scale(0.92)',
          transformOrigin: 'center',
        }}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <MicroLabel icon={<SquareFunction />}>{title} · formula</MicroLabel>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cn('-mr-1 shrink-0', ICON_BTN)}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-0.5">
          {explain ? (
            <p className="text-muted-foreground text-sm leading-relaxed">
              {explain}
            </p>
          ) : null}

          {formula ? <CodeLine label="primary" code={formula} /> : null}
          {secondaries.map(([key, code]) => (
            <CodeLine key={key} label={key} code={code} />
          ))}
          {!formula && secondaries.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No formula recorded for this card.
            </p>
          ) : null}

          {referencedCollections?.length ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-muted-foreground/70 text-[11px] font-medium uppercase tracking-wide">
                Uses
              </span>
              {referencedCollections.map((c) => (
                <Badge
                  key={c}
                  variant="outline"
                  className="h-5 px-1.5 font-mono text-[10px]"
                >
                  {c}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function CodeLine({ label, code }: { label: string; code: string }) {
  return (
    <div>
      <div className="text-muted-foreground/70 mb-1 text-[11px] font-medium uppercase tracking-wide">
        {label}
      </div>
      <code className="bg-muted/70 text-foreground/90 block whitespace-pre-wrap break-words rounded-lg px-3 py-2 font-mono text-xs leading-relaxed [overflow-wrap:anywhere]">
        {code}
      </code>
    </div>
  )
}

/* ------------------------------------------------------------------ states */

function CardSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="bg-muted h-9 w-2/3 animate-pulse rounded-md" />
      <div className="bg-muted/70 mt-auto h-16 w-full animate-pulse rounded-md" />
    </div>
  )
}

function CardEmpty({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  )
}

function CardError({
  message,
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-2 py-4">
      <p className="text-foreground text-sm font-medium">
        Couldn’t load this card
      </p>
      {message ? (
        <p className="text-muted-foreground line-clamp-3 text-xs">{message}</p>
      ) : null}
      {onRetry ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-1 cursor-pointer"
          onClick={onRetry}
        >
          <RotateCcw className="size-3.5" />
          Retry
        </Button>
      ) : null}
    </div>
  )
}
