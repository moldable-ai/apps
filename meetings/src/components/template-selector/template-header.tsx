'use client'

import { Copy, MoreHorizontal, Trash2 } from 'lucide-react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Textarea,
} from '@moldable-ai/ui'
import type { MeetingTemplate } from '@/lib/templates'

interface TemplateHeaderProps {
  template: MeetingTemplate
  editable: boolean
  deleting?: boolean
  onChange: (updates: Partial<MeetingTemplate>) => void
  onDuplicate: () => void
  onDelete: () => void
}

export function TemplateHeader({
  template,
  editable,
  deleting,
  onChange,
  onDuplicate,
  onDelete,
}: TemplateHeaderProps) {
  return (
    <div className="mb-5 flex items-start gap-4 px-6">
      <div className="bg-muted/60 flex size-10 shrink-0 items-center justify-center rounded-md">
        {editable ? (
          <Input
            value={template.icon}
            onChange={(event) => onChange({ icon: event.target.value })}
            className="h-8 w-8 border-0 bg-transparent p-0 text-center text-2xl shadow-none hover:bg-transparent focus:bg-transparent focus-visible:border-transparent focus-visible:bg-transparent focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent dark:focus:bg-transparent dark:focus-visible:bg-transparent"
            aria-label="Template icon"
          />
        ) : (
          <span className="text-2xl">{template.icon}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start gap-3">
          {editable ? (
            <Input
              value={template.name}
              onChange={(event) => onChange({ name: event.target.value })}
              className="h-auto min-w-0 flex-1 truncate rounded-none border-0 bg-transparent px-0 py-0 text-xl font-semibold shadow-none hover:bg-transparent focus:bg-transparent focus-visible:border-transparent focus-visible:bg-transparent focus-visible:outline-none focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent dark:focus:bg-transparent dark:focus-visible:bg-transparent"
              placeholder="Template name"
            />
          ) : (
            <h2 className="min-w-0 flex-1 truncate text-xl font-semibold">
              {template.name}
            </h2>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 cursor-pointer rounded-full"
                title="Template actions"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={onDuplicate}
              >
                <Copy className="mr-2 size-4" />
                Duplicate template
              </DropdownMenuItem>
              {editable ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={deleting}
                    className="text-destructive focus:text-destructive cursor-pointer"
                    onClick={onDelete}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete template
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {editable ? (
          <Textarea
            value={template.description}
            onChange={(event) => onChange({ description: event.target.value })}
            className="text-muted-foreground mt-1 min-h-8 resize-none rounded-none border-0 bg-transparent px-0 py-0 text-sm leading-relaxed shadow-none hover:bg-transparent focus:bg-transparent focus-visible:border-transparent focus-visible:bg-transparent focus-visible:outline-none focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent dark:focus:bg-transparent dark:focus-visible:bg-transparent"
            placeholder="Template description"
          />
        ) : (
          <p className="text-muted-foreground mt-1 truncate text-sm">
            {template.description}
          </p>
        )}
      </div>
    </div>
  )
}
