import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@moldable-ai/ui'

interface NewFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string) => void
}

export function NewFolderDialog({
  open,
  onOpenChange,
  onCreate,
}: NewFolderDialogProps) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (open) setName('')
  }, [open])

  const trimmed = name.trim()

  function submit() {
    if (!trimmed) return
    onCreate(trimmed)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-var(--chat-safe-padding,0px)-2rem)] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
          <DialogDescription>Group books into a folder.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
          className="space-y-2"
        >
          <Label htmlFor="new-folder-name">Name</Label>
          <Input
            id="new-folder-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Folder name"
            autoFocus
          />
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              className="cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="cursor-pointer"
              disabled={!trimmed}
            >
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
