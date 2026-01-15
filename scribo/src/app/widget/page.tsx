'use client'

import { LANGUAGES } from '@/lib/languages'
import { useEntries } from '@/hooks/use-entries'

const GHOST_EXAMPLES = [
  { content: 'Today I learned...', source: '🇬🇧', target: '🇫🇷' },
  { content: 'Mi familia vive...', source: '🇪🇸', target: '🇬🇧' },
  { content: '昨日、友達と...', source: '🇯🇵', target: '🇬🇧' },
]

export default function Widget() {
  const { data: entries = [] } = useEntries()
  const recentEntries = entries.slice(0, 5)

  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="flex h-full flex-col bg-background p-2">
      {/* Recent entries list */}
      <div className="scrollbar-hide flex-1 space-y-1 overflow-y-auto">
        {recentEntries.length === 0 ? (
          <div className="flex h-full flex-col">
            <div className="flex-1 space-y-1">
              {GHOST_EXAMPLES.map((example, idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-border/40 bg-muted/20 px-2.5 py-1.5 opacity-50"
                >
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span>
                      {example.source} → {example.target}
                    </span>
                  </div>
                  <div className="line-clamp-1 text-[13px] text-foreground">
                    {example.content}
                  </div>
                </div>
              ))}
            </div>
            <p className="pt-1.5 text-center text-[11px] text-muted-foreground">
              No entries yet. Click to start!
            </p>
          </div>
        ) : (
          recentEntries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-md bg-muted/50 px-2.5 py-1.5"
            >
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span>
                  {LANGUAGES[entry.sourceLanguage].flag} →{' '}
                  {LANGUAGES[entry.targetLanguage].flag}
                </span>
                <span>·</span>
                <span>{formatDate(entry.createdAt)}</span>
              </div>
              <div className="line-clamp-1 text-[13px] text-foreground">
                {entry.title || entry.content || 'Untitled entry...'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
