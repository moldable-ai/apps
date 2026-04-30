import { Search, Trash2 } from 'lucide-react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  ScrollArea,
  cn,
} from '@moldable-ai/ui'
import type { ConnectionSummary } from '../../shared/types'
import { QuietState } from './shared'

export function ConnectionDialog({
  connections,
  search,
  selectedConnectionId,
  onSearchChange,
  onSelectConnection,
  onClose,
  onNew,
  onOpen,
  onDelete,
}: {
  connections: ConnectionSummary[]
  search: string
  selectedConnectionId: string | null
  onSearchChange: (value: string) => void
  onSelectConnection: (id: string) => void
  onClose: () => void
  onNew: () => void
  onOpen: () => void
  onDelete: (id: string) => void
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="border-border/70 border-b px-4 py-3">
          <DialogTitle className="text-base">Open connection</DialogTitle>
          <DialogDescription className="text-xs">
            Saved PostgreSQL connections.
          </DialogDescription>
        </DialogHeader>

        <div className="p-3">
          <div className="relative mb-3">
            <Search className="text-muted-foreground absolute left-2.5 top-2 size-3.5" />
            <Input
              className="h-8 pl-8 text-sm"
              placeholder="Search connections"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              autoFocus
            />
          </div>

          <ScrollArea className="h-[min(21rem,55vh)]">
            {connections.length === 0 ? (
              <QuietState title="No saved connections" />
            ) : (
              <div className="border-border/70 bg-muted/25 dark:bg-muted/15 overflow-hidden rounded-2xl border">
                {connections.map((connection, index) => {
                  const isSelected = connection.id === selectedConnectionId

                  return (
                    <div
                      key={connection.id}
                      className={cn(
                        'grid grid-cols-[1fr_auto] items-center',
                        index < connections.length - 1 &&
                          'border-border/60 border-b',
                        isSelected ? 'bg-background' : 'hover:bg-background/70',
                      )}
                    >
                      <button
                        type="button"
                        className="grid min-w-0 cursor-pointer grid-cols-[auto_1fr] items-center gap-3 px-3 py-3 text-left"
                        onClick={() => onSelectConnection(connection.id)}
                        onDoubleClick={onOpen}
                      >
                        <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-full text-[11px] font-semibold">
                          Pg
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {connection.name}
                          </span>
                          <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                            {connection.host}:{connection.port} /{' '}
                            {connection.database}
                          </span>
                        </span>
                      </button>
                      <div className="flex items-center gap-1.5 pr-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground hover:text-destructive cursor-pointer"
                          onClick={(event) => {
                            event.stopPropagation()
                            onDelete(connection.id)
                          }}
                          aria-label={`Delete ${connection.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="border-border/70 flex-row justify-between border-t px-4 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={onNew}
            >
              New
            </Button>
            <Button
              type="button"
              size="sm"
              className="cursor-pointer"
              onClick={onOpen}
              disabled={!selectedConnectionId}
            >
              Open
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
