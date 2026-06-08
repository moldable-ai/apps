import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Flame,
  LayoutDashboard,
  Plus,
  Sparkles,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { Badge, Button, cn } from '@moldable-ai/ui'
import { MiniCard } from '../components/MiniCard'
import { DEMO_DASHBOARD_BY_ID } from '../data/demo'
import { PERSONA_DASHBOARDS } from '../personas'

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Flame,
  ArrowLeftRight,
  CreditCard,
}

const PREVIEW_CARDS = 6

/**
 * First-run onboarding as an "install a dashboard" carousel. Each slide is a
 * real dashboard previewed with the demo persona's data so the user sees
 * themselves in it, with an Install toggle. They continue into the app with the
 * dashboards they installed — still on sample data — then connect a bank to go
 * live. Built for FIRE / YNAB / Copilot-type users.
 */
export function OnboardingCarousel({
  installed,
  onToggle,
  onContinue,
}: {
  installed: string[]
  onToggle: (id: string) => void
  onContinue: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const count = PERSONA_DASHBOARDS.length

  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setActive(Math.round(el.scrollLeft / el.clientWidth))
  }, [])

  const goTo = useCallback(
    (i: number) => {
      const el = scrollRef.current
      if (!el) return
      const clamped = Math.max(0, Math.min(count - 1, i))
      el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' })
    },
    [count],
  )

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [onScroll])

  const installedCount = installed.length

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="mx-auto w-full max-w-5xl px-4 pt-9 sm:px-6">
        <div className="bg-muted text-muted-foreground mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
          <Sparkles className="size-3.5" />
          Welcome to Money
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Install your first dashboard
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-base">
          Each one is a complete view of your money, previewed here with sample
          data. Install the ones that look like you — you’ll explore them now
          and connect a bank when you’re ready.
        </p>
      </header>

      <div className="relative mt-6 flex-1">
        <div
          ref={scrollRef}
          tabIndex={0}
          role="region"
          aria-label="Dashboard previews — use the left and right arrow keys to browse"
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              e.preventDefault()
              goTo(active + 1)
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault()
              goTo(active - 1)
            }
          }}
          className="focus-visible:ring-ring flex snap-x snap-mandatory overflow-x-auto scroll-smooth outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-inset [&::-webkit-scrollbar]:hidden"
        >
          {PERSONA_DASHBOARDS.map((persona) => {
            const Icon = ICONS[persona.icon] ?? LayoutDashboard
            const demo = DEMO_DASHBOARD_BY_ID[persona.id]
            const isInstalled = installed.includes(persona.id)
            return (
              <section key={persona.id} className="w-full shrink-0 snap-center">
                <div className="mx-auto max-w-5xl px-4 sm:px-6">
                  <div className="border-border/60 bg-card/60 mb-4 flex flex-wrap items-start justify-between gap-3 rounded-2xl border p-4">
                    <div className="flex items-center gap-3">
                      <span className="bg-muted text-foreground/80 flex size-10 items-center justify-center rounded-xl">
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-semibold tracking-tight">
                            {persona.name}
                          </h2>
                          {isInstalled ? (
                            <Badge
                              variant="secondary"
                              className="gap-1 text-[10px] uppercase"
                            >
                              <Check className="size-3" /> Installed
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-muted-foreground text-sm">
                          “{persona.audience}”
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={isInstalled ? 'outline' : 'default'}
                      onClick={() => onToggle(persona.id)}
                      className="shrink-0"
                    >
                      {isInstalled ? (
                        <>
                          <Check className="size-4" /> Installed
                        </>
                      ) : (
                        <>
                          <Plus className="size-4" /> Install dashboard
                        </>
                      )}
                    </Button>
                  </div>

                  {demo ? (
                    <div className="pointer-events-none grid grid-cols-2 gap-3 lg:grid-cols-3">
                      {demo.cards.slice(0, PREVIEW_CARDS).map((card, i) => (
                        <MiniCard key={`${card.id}-${i}`} card={card} />
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>
            )
          })}
        </div>

        {/* arrows */}
        <button
          type="button"
          onClick={() => goTo(active - 1)}
          disabled={active === 0}
          aria-label="Previous"
          className="border-border/60 bg-card text-muted-foreground hover:text-foreground absolute left-1 top-24 hidden size-9 items-center justify-center rounded-full border shadow-sm disabled:opacity-0 sm:flex"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => goTo(active + 1)}
          disabled={active === count - 1}
          aria-label="Next"
          className="border-border/60 bg-card text-muted-foreground hover:text-foreground absolute right-1 top-24 hidden size-9 items-center justify-center rounded-full border shadow-sm disabled:opacity-0 sm:flex"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* sticky footer */}
      <footer className="border-border/60 bg-background/85 sticky bottom-0 border-t pb-[var(--chat-safe-padding,0px)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-1.5">
            {PERSONA_DASHBOARDS.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to ${p.name}`}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === active
                    ? 'bg-foreground w-5'
                    : 'bg-muted-foreground/40 hover:bg-muted-foreground w-1.5',
                )}
              />
            ))}
          </div>
          <Button
            size="lg"
            disabled={installedCount === 0}
            onClick={onContinue}
          >
            {installedCount === 0
              ? 'Install one to continue'
              : `Continue with ${installedCount} dashboard${installedCount > 1 ? 's' : ''}`}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </footer>
    </div>
  )
}
