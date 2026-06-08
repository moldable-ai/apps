import { Building2, Inbox, LayoutGrid, Receipt, Settings } from 'lucide-react'
import type { ComponentType } from 'react'
import { cn } from '@moldable-ai/ui'

export type Tab =
  | 'dashboards'
  | 'review'
  | 'transactions'
  | 'accounts'
  | 'settings'

const TABS: Array<{
  id: Tab
  label: string
  icon: ComponentType<{ className?: string }>
}> = [
  { id: 'dashboards', label: 'Dashboards', icon: LayoutGrid },
  { id: 'review', label: 'Review', icon: Inbox },
  { id: 'transactions', label: 'Activity', icon: Receipt },
  { id: 'accounts', label: 'Accounts', icon: Building2 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

/** Fixed bottom navigation for the product's top-level sections. */
export function TabBar({
  active,
  onChange,
  badges,
}: {
  active: Tab
  onChange: (tab: Tab) => void
  badges?: Partial<Record<Tab, number>>
}) {
  return (
    <nav
      aria-label="Primary"
      className="border-border/60 bg-background/90 fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur"
      style={{ paddingBottom: 'var(--chat-safe-padding, 0px)' }}
    >
      <div className="mx-auto flex max-w-2xl items-stretch justify-around px-1">
        {TABS.map((t) => {
          const Icon = t.icon
          const on = active === t.id
          const badge = badges?.[t.id] ?? 0
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              aria-current={on ? 'page' : undefined}
              aria-label={
                badge > 0 ? `${t.label}, ${badge} need review` : t.label
              }
              className={cn(
                'relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium transition-colors',
                on
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="relative">
                <Icon className={cn('size-5', on && 'text-[var(--chart-1)]')} />
                {badge > 0 ? (
                  <span
                    aria-hidden="true"
                    className="bg-destructive absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold text-white"
                  >
                    {badge > 9 ? '9+' : badge}
                  </span>
                ) : null}
              </span>
              {t.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
