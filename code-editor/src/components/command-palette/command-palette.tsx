'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@moldable-ai/ui'
import { type SearchResult, useFileSearch } from '@/hooks/use-file-search'
import { FileIcon } from '../file-tree/file-icon'

interface CommandPaletteProps {
  rootPath: string | null
  onFileSelect: (path: string) => void
}

export function CommandPalette({
  rootPath,
  onFileSelect,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { results, isLoading } = useFileSearch(rootPath, query)

  // Cmd+P to open - intercept before Moldable can catch it
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'p' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        e.stopImmediatePropagation()
        if (rootPath) {
          setOpen((prev) => !prev)
        }
        return false
      }
    }
    // Use capture phase at window level to intercept before anything else
    window.addEventListener('keydown', down, true)
    return () => window.removeEventListener('keydown', down, true)
  }, [rootPath])

  const handleSelect = useCallback(
    (path: string) => {
      onFileSelect(path)
      setOpen(false)
      setQuery('')
    },
    [onFileSelect],
  )

  const handleOpenChange = useCallback((open: boolean) => {
    setOpen(open)
    if (!open) {
      setQuery('')
    }
  }, [])

  if (!rootPath) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50" />
        <DialogContent className="bg-popover data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed left-1/2 top-[20%] z-50 max-h-[60vh] w-full max-w-lg -translate-x-1/2 translate-y-0 overflow-hidden rounded-lg border p-0 shadow-lg [&>button]:hidden">
          <DialogTitle className="sr-only">Search files</DialogTitle>
          <DialogDescription className="sr-only">
            Search for files in your project
          </DialogDescription>
          <Command className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:select-none [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:size-5 [&_[data-cmdk-input-wrapper]_svg]:size-5">
            <CommandInput
              className="focus:outline-none focus:ring-0 focus-visible:ring-0 [&_input]:focus:outline-none [&_input]:focus:ring-0"
              placeholder="Search files..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading ? 'Loading files...' : 'No files found.'}
              </CommandEmpty>
              <CommandGroup heading="Files">
                {results.map((file: SearchResult) => (
                  <CommandItem
                    key={file.path}
                    value={file.path}
                    onSelect={() => handleSelect(file.path)}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <FileIcon
                      filename={file.name}
                      className="size-4 shrink-0"
                    />
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="text-muted-foreground max-w-[200px] shrink-0 truncate text-xs">
                      {file.relativePath}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
