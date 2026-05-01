import { Loader2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@moldable-ai/ui'
import type { DbBrowserPreferences } from '../../shared/types'
import { DialogField } from './shared'

const DEFAULT_QUERY_TIMEOUT_MS = 5_000
const MIN_QUERY_TIMEOUT_MS = 1_000
const MAX_QUERY_TIMEOUT_MS = 30_000

export function DbBrowserSettingsDialog({
  preferences,
  saving,
  onClose,
  onSave,
}: {
  preferences: DbBrowserPreferences | undefined
  saving: boolean
  onClose: () => void
  onSave: (preferences: Partial<DbBrowserPreferences>) => void
}) {
  const [queryTimeoutMs, setQueryTimeoutMs] = useState(
    String(preferences?.queryTimeoutMs ?? DEFAULT_QUERY_TIMEOUT_MS),
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = Number(queryTimeoutMs.trim())
    const normalized = Number.isFinite(parsed)
      ? Math.max(
          MIN_QUERY_TIMEOUT_MS,
          Math.min(MAX_QUERY_TIMEOUT_MS, Math.round(parsed)),
        )
      : DEFAULT_QUERY_TIMEOUT_MS

    onSave({ queryTimeoutMs: normalized })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <DialogField label="Query timeout">
            <Input
              type="number"
              min={MIN_QUERY_TIMEOUT_MS}
              max={MAX_QUERY_TIMEOUT_MS}
              step={500}
              className="h-8"
              value={queryTimeoutMs}
              onChange={(event) => setQueryTimeoutMs(event.target.value)}
            />
          </DialogField>
          <p className="text-muted-foreground text-xs leading-5">
            Applies to metadata reads, table previews, and SQL query execution.
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="cursor-pointer"
              disabled={saving}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
