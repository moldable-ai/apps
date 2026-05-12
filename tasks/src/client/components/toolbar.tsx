import { Columns3, LayoutList } from 'lucide-react'
import { cn } from '@moldable-ai/ui'

export type ViewMode = 'list' | 'kanban'

export function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode
  onChange: (value: ViewMode) => void
}) {
  return (
    <div className="border-border bg-card inline-flex items-center rounded-md border p-0.5">
      {[
        { value: 'list' as const, label: 'List', icon: LayoutList },
        { value: 'kanban' as const, label: 'Board', icon: Columns3 },
      ].map((option) => {
        const Icon = option.icon
        const isActive = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium transition-all',
              isActive
                ? 'bg-accent text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            aria-pressed={isActive}
          >
            <Icon className="size-3.5" />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
