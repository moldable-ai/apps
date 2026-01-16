'use client'

const GHOST_ROWS = [
  { text: 'Create your first Moldable app', icon: '🚀' },
  { text: 'Learn the core concepts', icon: '📚' },
  { text: 'Build a fun game', icon: '🎮' },
]

export default function WidgetPage() {
  return (
    <div className="flex h-full flex-col p-2">
      {/* Compact Header */}
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="text-base">👋</span>
        <h2 className="text-foreground text-sm font-semibold">
          Welcome, tap here!
        </h2>
      </div>

      {/* Compact Ghost rows */}
      <div className="space-y-1">
        {GHOST_ROWS.map((row, idx) => (
          <div
            key={idx}
            className="border-border/30 bg-muted/20 flex items-center gap-2 rounded-md border px-2 py-1.5 opacity-60"
          >
            <span className="text-[11px]">{row.icon}</span>
            <span className="text-foreground/80 text-[11px]">{row.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
