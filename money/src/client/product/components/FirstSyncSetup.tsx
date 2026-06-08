import { Loader2, Sparkles } from 'lucide-react'

/**
 * The first-run ETL moment: a user just connected their first institution and
 * the backend is extracting → transforming → materializing. Instead of a blank
 * or stale board, we show a warm "setting up your money" state with skeleton
 * tiles and the live phase label ("Importing transactions…", "Building your
 * dashboards…"), so the wait feels like progress. Clears itself the moment the
 * first cards materialize (the poll invalidates and real cards replace this).
 */
export function FirstSyncSetup({ label }: { label?: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-[calc(var(--chat-safe-padding,0px)+5rem)] pt-10 sm:px-6">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="bg-[var(--chart-1)]/12 mb-4 flex size-14 items-center justify-center rounded-2xl text-[var(--chart-1)]">
          <Sparkles className="size-7" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Setting up your money
        </h1>
        <p className="text-muted-foreground mt-2 max-w-sm text-sm">
          Pulling in your accounts and transactions — this can take a moment the
          first time.
        </p>
        <div className="border-border/60 bg-card text-muted-foreground mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium">
          <Loader2 className="size-3.5 animate-spin text-[var(--chart-1)]" />
          {label ?? 'Importing transactions…'}
        </div>
      </div>

      {/* skeleton bento — mirrors the real dashboard layout so the swap is calm */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SKELETON.map((s, i) => (
          <SkeletonCard key={i} tall={s} />
        ))}
      </div>
    </div>
  )
}

// A mix of small + tall tiles, matching the bento size palette.
const SKELETON = [false, false, false, true, false, false]

function SkeletonCard({ tall }: { tall: boolean }) {
  return (
    <div className="border-border/60 bg-card rounded-xl border p-5">
      <div className="bg-muted h-3 w-24 animate-pulse rounded" />
      <div className="bg-muted mt-4 h-8 w-32 animate-pulse rounded-md" />
      {tall ? (
        <div className="bg-muted/70 mt-5 h-28 w-full animate-pulse rounded-lg" />
      ) : (
        <div className="bg-muted/60 mt-3 h-3 w-20 animate-pulse rounded" />
      )}
    </div>
  )
}
