import type { ReactNode } from 'react'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
}

// A styled confirmation dialog (replaces native window.confirm) for destructive
// or consequential actions across the app.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4"
      role="presentation"
      onClick={() => onOpenChange(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={description ? 'confirm-description' : undefined}
        className="bg-background text-foreground border-border w-full max-w-md rounded-lg border p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div>
          <h2 id="confirm-title" className="text-base font-semibold">
            {title}
          </h2>
          {description ? (
            <div
              id="confirm-description"
              className="text-muted-foreground mt-2 text-sm"
            >
              {description}
            </div>
          ) : null}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="border-border bg-background hover:bg-accent cursor-pointer rounded-md border px-3 py-2 text-sm"
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`cursor-pointer rounded-md px-3 py-2 text-sm font-medium ${
              destructive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
