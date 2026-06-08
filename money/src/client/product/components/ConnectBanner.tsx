import { Landmark, Sparkles } from 'lucide-react'
import { Badge, Button } from '@moldable-ai/ui'

/** The small DEMO chip shown on dashboards that are still on sample data. */
export function DemoBadge() {
  return (
    <Badge variant="secondary" className="gap-1 uppercase tracking-wide">
      <Sparkles className="size-3" />
      Demo
    </Badge>
  )
}

/**
 * The clear, persistent "make it real" prompt shown while the product is on
 * sample data (no account connected). This is the conversion moment: the user
 * has installed dashboards and seen value; now we ask for their first account.
 */
export function ConnectBanner({
  onConnect,
  connecting,
}: {
  onConnect: () => void
  connecting?: boolean
}) {
  return (
    <div className="border-border/60 from-[var(--chart-1)]/12 to-[var(--chart-4)]/12 border-b bg-gradient-to-r">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6">
        <Sparkles className="size-4 shrink-0 text-[var(--chart-1)]" />
        <span className="text-sm">
          <span className="text-foreground font-medium">
            You’re viewing sample data.
          </span>{' '}
          <span className="text-muted-foreground">
            Connect your first account to see these dashboards with your real
            numbers.
          </span>
        </span>
        <Button
          size="sm"
          className="ml-auto"
          onClick={onConnect}
          disabled={connecting}
        >
          <Landmark className="size-3.5" />
          {connecting ? 'Connecting…' : 'Connect an account'}
        </Button>
      </div>
    </div>
  )
}
