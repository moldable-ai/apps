import { type ReactNode } from 'react'

/** Small uppercase section label + title + optional description and action. */
export function SectionHeader({
  label,
  title,
  description,
  action,
}: {
  label: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="text-muted-foreground/80 text-[11px] font-semibold uppercase tracking-[0.08em]">
          {label}
        </div>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="text-muted-foreground mt-1 max-w-xl text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

/** A labelled tile used by the component gallery to frame each lego. */
export function GalleryTile({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`border-border/60 bg-card flex flex-col rounded-xl border p-4 ${className ?? ''}`}
    >
      <div className="text-muted-foreground/80 mb-3 text-[11px] font-semibold uppercase tracking-[0.06em]">
        {label}
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        {children}
      </div>
    </div>
  )
}
