'use client'

import { Plus, Search, Sparkles } from 'lucide-react'
import { Button, Input, cn } from '@moldable-ai/ui'
import type { MeetingTemplate } from '@/lib/templates'

interface TemplateLeftPanelProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  templates: MeetingTemplate[]
  previewTemplateId: string
  onPreviewTemplate: (template: MeetingTemplate) => void
  onNewTemplate: () => void
}

const categoryOrder = ['My Templates', 'Core', 'General', 'Specialized']

export function TemplateLeftPanel({
  searchQuery,
  onSearchChange,
  templates,
  previewTemplateId,
  onPreviewTemplate,
  onNewTemplate,
}: TemplateLeftPanelProps) {
  const query = searchQuery.trim().toLowerCase()
  const visibleTemplates = query
    ? templates.filter(
        (template) =>
          template.name.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query) ||
          template.category.toLowerCase().includes(query),
      )
    : templates

  return (
    <aside className="border-border h-full w-60 shrink-0 overflow-y-auto border-r pr-2">
      <div className="space-y-6 py-2">
        <div className="relative px-2">
          <Search className="text-muted-foreground absolute left-5 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search templates..."
            className="h-8 min-w-0 rounded-lg pl-9 text-xs"
          />
        </div>

        <div className="space-y-2 px-2">
          <button
            type="button"
            onClick={onNewTemplate}
            className="bg-muted/50 hover:bg-muted flex w-full cursor-pointer items-start gap-3 rounded-lg p-3 text-left text-xs transition-colors"
          >
            <span className="bg-background flex size-6 shrink-0 items-center justify-center rounded-md">
              <Plus className="size-4" />
            </span>
            <span className="min-w-0 flex-1 pt-1 font-medium">
              New template
            </span>
          </button>
        </div>

        {categoryOrder.map((category) => {
          const categoryTemplates = visibleTemplates.filter(
            (template) => template.category === category,
          )
          if (categoryTemplates.length === 0) return null

          return (
            <section key={category}>
              <div className="mb-3 flex items-center px-2 pl-4">
                <h3 className="text-muted-foreground truncate text-xs font-medium">
                  {category === 'Specialized' ? 'Specialties' : category}
                </h3>
              </div>
              <div className="space-y-1">
                {categoryTemplates.map((template) => (
                  <TemplateLeftPanelItem
                    key={template.id}
                    template={template}
                    selected={previewTemplateId === template.id}
                    onSelect={() => onPreviewTemplate(template)}
                  />
                ))}
              </div>
            </section>
          )
        })}

        {visibleTemplates.length === 0 ? (
          <div className="text-muted-foreground px-4 py-6 text-xs">
            No templates found.
          </div>
        ) : null}
      </div>
    </aside>
  )
}

function TemplateLeftPanelItem({
  template,
  selected,
  onSelect,
}: {
  template: MeetingTemplate
  selected: boolean
  onSelect: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onSelect}
      className={cn(
        'hover:bg-muted relative h-auto w-full min-w-0 cursor-pointer justify-start gap-3 rounded-lg px-3 py-2.5 text-left',
        selected && 'bg-muted',
      )}
    >
      {selected ? (
        <span className="bg-primary absolute bottom-2 left-0 top-2 w-[3px] rounded-r-sm" />
      ) : null}
      <span className="bg-muted/60 flex size-7 shrink-0 items-center justify-center rounded-md text-base">
        {template.icon || <Sparkles className="size-4" />}
      </span>
      <span className="min-w-0 flex-1 overflow-hidden">
        <span className="block truncate text-xs font-medium leading-5">
          {template.name}
        </span>
        <span className="text-muted-foreground block truncate text-xs leading-4">
          {template.description}
        </span>
      </span>
    </Button>
  )
}
