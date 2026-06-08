import { ArrowUpRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@moldable-ai/ui'
import { navigate } from './router'
import { Author } from './sections/Author'
import { ComponentGallery } from './sections/ComponentGallery'
import { ExampleDashboards } from './sections/ExampleDashboards'
import { FormulaPlayground } from './sections/FormulaPlayground'
import { LiveDashboard } from './sections/LiveDashboard'
import { SectionHeader } from './sections/Shell'

const SECTIONS = [
  { id: 'dashboards', label: 'Dashboards' },
  { id: 'live', label: 'Live' },
  { id: 'author', label: 'Author' },
  { id: 'components', label: 'Components' },
  { id: 'playground', label: 'Playground' },
] as const

/**
 * The /ui-kit design surface. Full-height shell (no body scroll), a scope bar
 * with section nav + a link back to the admin route, and a single scroll region
 * honoring the chat safe area.
 */
export function UiKitPage() {
  const [active, setActive] = useState<string>('dashboards')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    )
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  function scrollTo(id: string) {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <main className="bg-background text-foreground flex h-[100dvh] min-h-0 flex-col overflow-hidden">
      <header className="border-border/70 flex h-12 shrink-0 items-center justify-between gap-3 border-b px-4 sm:px-6">
        <div className="flex items-center gap-4 overflow-x-auto">
          <span className="shrink-0 text-sm font-semibold tracking-tight">
            UI Kit
          </span>
          <nav className="flex items-center gap-1">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollTo(s.id)}
                className={cn(
                  'whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                  active === s.id
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium"
        >
          Admin
          <ArrowUpRight className="size-3.5" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-12 px-4 pb-[calc(var(--chat-safe-padding,0px)+5rem)] pt-7 sm:px-6">
          <section id="dashboards" className="scroll-mt-6">
            <SectionHeader
              label="Example dashboards"
              title="One person’s money, four ways"
              description="The same formula-backed card legos compose into very different dashboards depending on what you care about."
            />
            <ExampleDashboards />
          </section>

          <section id="live" className="scroll-mt-6">
            <LiveDashboard />
          </section>

          <section id="author" className="scroll-mt-6">
            <Author />
          </section>

          <section id="components" className="scroll-mt-6">
            <SectionHeader
              label="Component library"
              title="The legos"
              description="Every card renderer and chart primitive an agent can compose into new cards."
            />
            <ComponentGallery />
          </section>

          <section id="playground" className="scroll-mt-6">
            <FormulaPlayground />
          </section>
        </div>
      </div>
    </main>
  )
}
