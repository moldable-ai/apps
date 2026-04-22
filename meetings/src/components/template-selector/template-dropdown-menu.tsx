'use client'

import {
  Check,
  Grid2X2,
  Loader2,
  type LucideIcon,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { cn } from '@moldable-ai/ui'
import type { MeetingTemplate } from '@/lib/templates'

interface TemplateDropdownMenuProps {
  open: boolean
  templates: MeetingTemplate[]
  selectedTemplate: MeetingTemplate | undefined
  selectedTemplateId: string
  generated: boolean
  generatingTemplateId: string | null
  onGenerateTemplate: (template: MeetingTemplate) => void
  onOpenAllTemplates: () => void
  onCreateTemplate: () => void
}

export function TemplateDropdownMenu({
  open,
  templates,
  selectedTemplate,
  selectedTemplateId,
  generated,
  generatingTemplateId,
  onGenerateTemplate,
  onOpenAllTemplates,
  onCreateTemplate,
}: TemplateDropdownMenuProps) {
  if (!open) return null

  return (
    <div className="border-border/80 bg-popover text-popover-foreground absolute right-0 top-12 z-30 w-64 overflow-hidden rounded-xl border p-1.5 shadow-xl">
      <button
        type="button"
        onClick={() => {
          if (selectedTemplate) onGenerateTemplate(selectedTemplate)
        }}
        disabled={!selectedTemplate || Boolean(generatingTemplateId)}
        className="bg-muted/60 hover:bg-muted flex h-10 w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Sparkles className="text-muted-foreground size-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">Enhanced notes</span>
        {generatingTemplateId ? (
          <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
        ) : (
          <>
            <RefreshCw className="text-muted-foreground size-3.5" />
            {generated ? <Check className="text-primary size-3.5" /> : null}
          </>
        )}
      </button>

      <div className="text-muted-foreground px-2.5 py-2 text-[11px] font-medium">
        Templates
      </div>

      {templates.slice(0, 5).map((template, index) => {
        const selected = selectedTemplateId === template.id
        const generating = generatingTemplateId === template.id

        return (
          <button
            key={template.id}
            type="button"
            onClick={() => {
              if (!generating) onGenerateTemplate(template)
            }}
            disabled={Boolean(generatingTemplateId)}
            className={cn(
              'hover:bg-muted group relative flex h-9 w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60',
              selected && 'bg-muted/40',
            )}
          >
            {selected ? (
              <span className="bg-primary absolute bottom-2 left-0 top-2 w-[3px] rounded-r-sm" />
            ) : null}
            <span className="shrink-0 text-sm">{template.icon}</span>
            <span className="min-w-0 flex-1 truncate">{template.name}</span>
            <span className="bg-muted text-muted-foreground flex size-[17px] shrink-0 items-center justify-center rounded-sm text-[10px]">
              {generating ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                index + 1
              )}
            </span>
          </button>
        )
      })}

      <div className="border-border/70 my-1 border-t" />
      <TemplateMenuItem
        icon={Grid2X2}
        label="All templates..."
        onClick={onOpenAllTemplates}
      />
      <TemplateMenuItem
        icon={Plus}
        label="New template"
        onClick={onCreateTemplate}
      />
    </div>
  )
}

interface TemplateMenuItemProps {
  icon: LucideIcon
  label: string
  onClick: () => void
}

function TemplateMenuItem({
  icon: Icon,
  label,
  onClick,
}: TemplateMenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-muted flex h-9 w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-xs transition-colors"
    >
      <Icon className="text-muted-foreground size-3.5 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  )
}
