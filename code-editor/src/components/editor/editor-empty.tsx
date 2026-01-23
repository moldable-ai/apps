'use client'

import { FileCode } from 'lucide-react'

export function EditorEmpty() {
  return (
    <div className="text-muted-foreground/40 flex h-full flex-col items-center justify-center">
      <FileCode className="mb-4 size-16" strokeWidth={1} />
      <h2 className="text-lg font-medium">No file open</h2>
      <p className="mt-1 text-sm">Select a file from the sidebar to edit</p>
      <p className="mt-4 text-xs">
        <kbd className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono">
          ⌘P
        </kbd>{' '}
        to search files
      </p>
    </div>
  )
}
