import type { ReactNode } from 'react'

export function SectionLabel({
  icon,
  children,
}: {
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div className="text-muted-foreground flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider">
      {icon}
      {children}
    </div>
  )
}

export function QuietState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="text-muted-foreground px-1 py-2 text-xs leading-5">
      <p className="text-foreground/80 font-medium">{title}</p>
      {description ? (
        <p className="mt-1 max-h-24 overflow-auto break-words">{description}</p>
      ) : null}
      {action}
    </div>
  )
}

export function EmptyPane({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center">
      <div className="max-w-sm">
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="text-muted-foreground mt-2 text-xs leading-5">
            {description}
          </p>
        ) : null}
        {action ? (
          <div className="mt-4 flex justify-center">{action}</div>
        ) : null}
      </div>
    </div>
  )
}

export function DialogField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="text-muted-foreground flex flex-col gap-2.5 text-xs font-medium">
      <span className="block leading-none">{label}</span>
      {children}
    </label>
  )
}
