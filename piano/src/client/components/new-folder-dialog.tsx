import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  cn,
} from '@moldable-ai/ui'

interface NewFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string) => Promise<void> | void
}

export function NewFolderDialog({
  open,
  onOpenChange,
  onCreate,
}: NewFolderDialogProps) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setName('')
      setSubmitting(false)
      return
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80)
    return () => window.clearTimeout(timer)
  }, [open])

  const submit = async () => {
    if (!name.trim() || submitting) return
    setSubmitting(true)
    try {
      await onCreate(name.trim())
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(420px,calc(100vw-2rem))] gap-0 overflow-hidden p-0">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <div className="px-5 pb-4 pt-5">
            <DialogTitle className="piano-serif text-foreground text-lg font-semibold tracking-tight">
              New folder
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-1 text-[12px] leading-5">
              Group pieces however helps you practice — by composer, mood, or
              progress.
            </DialogDescription>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Chopin · Romantic"
              maxLength={80}
              className={cn(
                'border-border/70 bg-muted/30 focus:bg-background focus:border-foreground/30 mt-4 h-10 w-full rounded-full border px-4 text-[13px] outline-none transition-colors',
                'placeholder:text-muted-foreground/80',
              )}
            />
          </div>
          <div className="bg-muted/15 border-border/60 flex items-center justify-end gap-2 border-t px-4 py-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground h-8 cursor-pointer rounded-full px-3 text-[12px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className="bg-foreground text-background h-8 cursor-pointer rounded-full px-3.5 text-[12px] font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create folder'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
