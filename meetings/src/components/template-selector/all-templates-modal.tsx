'use client'

import { Loader2, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@moldable-ai/ui'
import type { MeetingTemplate } from '@/lib/templates'
import { TemplateHeader } from './template-header'
import { TemplateLeftPanel } from './template-left-panel'
import { EditableTemplatePreview, TemplatePreview } from './template-preview'

interface AllTemplatesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templates: MeetingTemplate[]
  selectedTemplateId: string
  generatingTemplateId: string | null
  onTemplateSelect: (template: MeetingTemplate) => void
  onCreateTemplate: () => MeetingTemplate | void
  onDuplicateTemplate: (template: MeetingTemplate) => MeetingTemplate
  onDeleteTemplate: (templateId: string) => void
  onUpdateTemplate: (template: MeetingTemplate) => void
}

export function AllTemplatesModal({
  open,
  onOpenChange,
  templates,
  selectedTemplateId,
  generatingTemplateId,
  onTemplateSelect,
  onCreateTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
  onUpdateTemplate,
}: AllTemplatesModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [previewTemplateId, setPreviewTemplateId] = useState(selectedTemplateId)
  const [isSaving, setIsSaving] = useState(false)
  const saveCompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  useEffect(() => {
    if (!open) return
    setSearchQuery('')
    setPreviewTemplateId(selectedTemplateId)
  }, [open, selectedTemplateId])

  useEffect(() => {
    if (templates.some((template) => template.id === previewTemplateId)) return
    setPreviewTemplateId(templates[0]?.id ?? selectedTemplateId)
  }, [previewTemplateId, selectedTemplateId, templates])

  useEffect(() => {
    return () => {
      if (saveCompleteTimeoutRef.current) {
        clearTimeout(saveCompleteTimeoutRef.current)
      }
    }
  }, [])

  const previewTemplate = useMemo(
    () =>
      templates.find((template) => template.id === previewTemplateId) ??
      templates[0],
    [previewTemplateId, templates],
  )
  const editable = previewTemplate?.category === 'My Templates'

  const handleUpdateTemplate = useCallback(
    (updates: Partial<MeetingTemplate>) => {
      if (!previewTemplate || !editable) return

      if (saveCompleteTimeoutRef.current) {
        clearTimeout(saveCompleteTimeoutRef.current)
        saveCompleteTimeoutRef.current = null
      }

      setIsSaving(true)
      onUpdateTemplate({ ...previewTemplate, ...updates })

      saveCompleteTimeoutRef.current = setTimeout(() => {
        setIsSaving(false)
        saveCompleteTimeoutRef.current = null
      }, 250)
    },
    [editable, onUpdateTemplate, previewTemplate],
  )

  const handleCreateTemplate = useCallback(() => {
    const template = onCreateTemplate()
    if (template) setPreviewTemplateId(template.id)
  }, [onCreateTemplate])

  const handleDuplicateTemplate = useCallback(() => {
    if (!previewTemplate) return
    const duplicate = onDuplicateTemplate(previewTemplate)
    setPreviewTemplateId(duplicate.id)
  }, [onDuplicateTemplate, previewTemplate])

  const handleDeleteTemplate = useCallback(() => {
    if (!previewTemplate || !editable) return
    const nextTemplate = templates.find(
      (template) => template.id !== previewTemplate.id,
    )
    onDeleteTemplate(previewTemplate.id)
    setPreviewTemplateId(nextTemplate?.id ?? '')
  }, [editable, onDeleteTemplate, previewTemplate, templates])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:min-w-3xl max-h-[80vh] w-full min-w-0 max-w-5xl gap-0 overflow-hidden px-0 py-4 sm:max-w-4xl">
        <DialogHeader className="border-border border-b px-4 pb-4">
          <DialogTitle className="text-base font-semibold">
            Templates
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[60vh] min-h-0">
          <TemplateLeftPanel
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            templates={templates}
            previewTemplateId={previewTemplate?.id ?? ''}
            onPreviewTemplate={(template) => setPreviewTemplateId(template.id)}
            onNewTemplate={handleCreateTemplate}
          />

          <main className="min-w-0 flex-1 overflow-y-auto">
            {previewTemplate ? (
              <div className="pt-6">
                <TemplateHeader
                  template={previewTemplate}
                  editable={editable}
                  onChange={handleUpdateTemplate}
                  onDuplicate={handleDuplicateTemplate}
                  onDelete={handleDeleteTemplate}
                />

                <div className="border-border bg-muted border-t py-6">
                  {editable ? (
                    <EditableTemplatePreview
                      template={previewTemplate}
                      onTemplateChange={handleUpdateTemplate}
                    />
                  ) : (
                    <TemplatePreview template={previewTemplate} />
                  )}
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                No templates available.
              </div>
            )}
          </main>
        </div>

        <DialogFooter className="border-border border-t px-4 pt-4">
          <div className="flex w-full items-center justify-end gap-3">
            {isSaving ? (
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Loader2 className="size-3 animate-spin" />
                Saving
              </span>
            ) : (
              <span className="text-muted-foreground text-xs">Saved</span>
            )}
            <Button
              type="button"
              size="sm"
              disabled={!previewTemplate || Boolean(generatingTemplateId)}
              onClick={() => {
                if (!previewTemplate) return
                onTemplateSelect(previewTemplate)
                onOpenChange(false)
              }}
              className="h-8 cursor-pointer text-xs"
            >
              {generatingTemplateId === previewTemplate?.id ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 size-3.5" />
              )}
              Apply template
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
