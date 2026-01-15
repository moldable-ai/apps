'use client'

import { useQuery } from '@tanstack/react-query'
import { Pin } from 'lucide-react'
import { Card, CardContent, Markdown, useWorkspace } from '@moldable-ai/ui'
import type { Note } from '../../lib/types'

const GHOST_EXAMPLES = [
  {
    title: 'Project brainstorm',
    content: 'Here are some initial ideas for the new project...',
    tags: ['Work'],
  },
  {
    title: 'Grocery list',
    content: '- Milk\n- Eggs\n- Bread\n- Coffee',
    tags: ['Personal'],
  },
  {
    title: 'Book notes',
    content: 'Notes from "The Great Gatsby"',
    tags: ['Research'],
  },
]

export default function WidgetPage() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  const { data: notes = [] } = useQuery<Note[]>({
    queryKey: ['notes', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/notes')
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  // Show pinned first, otherwise newest
  const displayNotes =
    notes.length > 0
      ? notes.filter((n) => n.isPinned).length > 0
        ? notes.filter((n) => n.isPinned).slice(0, 3)
        : notes.slice(0, 3)
      : []

  if (notes.length === 0) {
    return (
      <div className="bg-background flex h-full flex-col p-2">
        <div className="flex-1 space-y-1.5 overflow-hidden">
          {GHOST_EXAMPLES.map((example, idx) => (
            <div
              key={idx}
              className="border-border/40 bg-muted/20 rounded-md border px-2.5 py-1.5 opacity-50"
            >
              <div className="flex items-start justify-between gap-2 overflow-hidden">
                <h3 className="text-foreground flex-1 truncate text-xs font-semibold">
                  {example.title}
                </h3>
              </div>
              <p className="text-muted-foreground mt-0.5 line-clamp-1 text-[11px]">
                {example.content}
              </p>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground shrink-0 pt-1.5 text-center text-[11px]">
          No notes yet. Click to start!
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-2">
      {displayNotes.map((note) => (
        <Card
          key={note.id}
          className="border-border/50 bg-card/50 flex-none shadow-none"
        >
          <CardContent className="space-y-1 p-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="flex-1 truncate text-xs font-semibold">
                {note.title || 'Untitled'}
              </h3>
              {note.isPinned && <Pin className="text-primary size-3" />}
            </div>
            <div className="text-muted-foreground pointer-events-none line-clamp-2 overflow-hidden">
              <Markdown markdown={note.content} proseSize="xs" />
            </div>
          </CardContent>
        </Card>
      ))}
      {notes.length > 3 && (
        <p className="text-muted-foreground text-center text-[10px]">
          + {notes.length - 3} more notes
        </p>
      )}
    </div>
  )
}
