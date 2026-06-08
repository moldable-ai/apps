export interface LegendItem {
  label: string
  value?: string
  percent?: number
  color: string
}

interface LegendProps {
  items: LegendItem[]
  className?: string
}

/** Vertical legend: color dot + name + right-aligned value + %. */
export function Legend({ items, className }: LegendProps) {
  return (
    <ul className={className}>
      {items.map((it, i) => (
        <li
          key={`${it.label}-${i}`}
          className="flex items-center gap-2.5 py-1 text-sm"
        >
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: it.color }}
            aria-hidden
          />
          <span className="text-foreground/90 min-w-0 flex-1 truncate">
            {it.label}
          </span>
          {it.value !== undefined ? (
            <span className="uk-nums text-foreground/90">{it.value}</span>
          ) : null}
          {it.percent !== undefined ? (
            <span className="uk-nums text-muted-foreground w-10 text-right text-xs">
              {Math.round(it.percent * 100)}%
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
