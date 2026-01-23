'use client'

import { X } from 'lucide-react'
import { cn } from '@moldable-ai/ui'
import { FileIcon } from '../file-tree/file-icon'

interface Tab {
  path: string
  name: string
  isDirty?: boolean
}

interface EditorTabsProps {
  tabs: Tab[]
  activeTab: string | null
  onTabSelect: (path: string) => void
  onTabClose: (path: string) => void
}

export function EditorTabs({
  tabs,
  activeTab,
  onTabSelect,
  onTabClose,
}: EditorTabsProps) {
  if (tabs.length === 0) return null

  // Deduplicate tabs by path to prevent React key warnings
  const uniqueTabs = tabs.filter(
    (tab, index, self) => self.findIndex((t) => t.path === tab.path) === index,
  )

  return (
    <div className="bg-muted/30 flex h-9 shrink-0 border-b">
      <div className="flex-1 overflow-x-auto">
        <div className="flex h-full">
          {uniqueTabs.map((tab) => (
            <button
              key={tab.path}
              onClick={() => onTabSelect(tab.path)}
              className={cn(
                'border-border/50 group relative flex h-full cursor-pointer items-center gap-2 border-r px-3 text-xs transition-colors',
                activeTab === tab.path
                  ? 'bg-background text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
            >
              {/* Active indicator */}
              {activeTab === tab.path && (
                <div className="bg-primary absolute inset-x-0 bottom-0 h-0.5" />
              )}

              <FileIcon filename={tab.name} className="size-3.5" />
              <span className="max-w-[120px] truncate">{tab.name}</span>

              {/* Dirty indicator or close button */}
              <div className="flex size-4 items-center justify-center">
                {tab.isDirty ? (
                  <span className="bg-primary size-2 rounded-full" />
                ) : (
                  <X
                    className="hover:bg-accent size-3 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      onTabClose(tab.path)
                    }}
                  />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
