// A generic, provider-agnostic collapsible row for the "Publish to" list. It
// knows nothing about any specific host — the header shows an icon, a name, and
// an optional status/toggle slot; expanding reveals the provider's controls.
// Keeping this dumb lets each provider own its own logic without leaking
// provider-specific branching into shared chrome.
import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

export function ProviderRow({
  icon,
  name,
  status,
  open,
  onOpenChange,
  children,
}: {
  icon: ReactNode
  name: string
  /** Right-aligned header slot — a status chip and/or a toggle control. */
  status?: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  children?: ReactNode
}) {
  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <div className="flex items-center gap-2 pr-2.5">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => onOpenChange(!open)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-2.5 pl-2.5 text-left"
        >
          <ChevronDown
            className={`text-muted-foreground size-3.5 shrink-0 transition-transform ${open ? '' : '-rotate-90'}`}
          />
          <span className="flex size-5 shrink-0 items-center justify-center">
            {icon}
          </span>
          <span className="truncate text-sm font-medium">{name}</span>
        </button>
        {status ? <div className="shrink-0">{status}</div> : null}
      </div>
      {open && children ? (
        <div className="border-border/70 border-t px-3 py-3">{children}</div>
      ) : null}
    </div>
  )
}
