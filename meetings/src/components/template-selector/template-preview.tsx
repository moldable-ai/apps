'use client'

import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@moldable-ai/ui'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@moldable-ai/ui'
import type { MeetingTemplate, MeetingTemplateSection } from '@/lib/templates'
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { v4 as uuidv4 } from 'uuid'

type SectionFormat = NonNullable<MeetingTemplateSection['format']>
type SectionLength = NonNullable<MeetingTemplateSection['length']>
type WritingStyle = NonNullable<MeetingTemplate['writingStyle']>

const writingStyleDescriptions: Record<WritingStyle, string> = {
  direct:
    'Clean, concise meeting notes with concrete bullets and plain-language summaries.',
  narrative:
    'More flowing prose that captures context and nuance while staying skimmable.',
  objective:
    'Fact-based notes that avoid interpretation unless the transcript clearly supports it.',
}

interface TemplatePreviewProps {
  template: MeetingTemplate
}

interface EditableTemplatePreviewProps {
  template: MeetingTemplate
  onTemplateChange: (updates: Partial<MeetingTemplate>) => void
}

export function TemplatePreview({ template }: TemplatePreviewProps) {
  return (
    <div className="space-y-6 px-6">
      <PreviewSection title="Writing Style">
        <p className="text-sm capitalize">
          {template.writingStyle ?? 'direct'}
        </p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {writingStyleDescriptions[template.writingStyle ?? 'direct']}
        </p>
      </PreviewSection>

      <PreviewSection title="Context">
        <p className="text-muted-foreground text-sm leading-relaxed">
          {template.context}
        </p>
      </PreviewSection>

      <div>
        <h3 className="text-muted-foreground mb-4 text-sm font-medium">
          Sections
        </h3>
        <div className="space-y-3">
          {template.sections.map((section) => (
            <div
              key={section.id}
              className="bg-card rounded-lg border px-4 py-3 shadow-sm"
            >
              <div className="text-sm font-medium">{section.title}</div>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {section.prompt}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PreviewSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section>
      <h3 className="text-muted-foreground mb-4 text-sm font-medium">
        {title}
      </h3>
      <div className="bg-card rounded-lg border px-4 py-3 shadow-sm">
        {children}
      </div>
    </section>
  )
}

export function EditableTemplatePreview({
  template,
  onTemplateChange,
}: EditableTemplatePreviewProps) {
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({})
  const [deletedSection, setDeletedSection] = useState<{
    section: MeetingTemplateSection
    index: number
  } | null>(null)
  const sectionsRef = useRef(template.sections)

  useEffect(() => {
    sectionsRef.current = template.sections
  }, [template.sections])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleSectionsChange = useCallback(
    (sections: MeetingTemplateSection[]) => {
      onTemplateChange({ sections })
    },
    [onTemplateChange],
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = template.sections.findIndex(
      (section) => section.id === active.id,
    )
    const newIndex = template.sections.findIndex(
      (section) => section.id === over.id,
    )
    if (oldIndex === -1 || newIndex === -1) return

    handleSectionsChange(arrayMove(template.sections, oldIndex, newIndex))
  }

  const handleUpdateSection = useCallback(
    (sectionId: string, updates: Partial<MeetingTemplateSection>) => {
      handleSectionsChange(
        template.sections.map((section) =>
          section.id === sectionId ? { ...section, ...updates } : section,
        ),
      )
    },
    [handleSectionsChange, template.sections],
  )

  const handleDeleteSection = useCallback(
    (sectionId: string) => {
      const sectionIndex = sectionsRef.current.findIndex(
        (section) => section.id === sectionId,
      )
      const section = sectionsRef.current[sectionIndex]
      if (!section) return

      setDeletedSection({ section, index: sectionIndex })
      handleSectionsChange(
        sectionsRef.current.filter((item) => item.id !== sectionId),
      )
    },
    [handleSectionsChange],
  )

  const handleUndoDelete = useCallback(() => {
    if (!deletedSection) return

    const restoredSections = [...sectionsRef.current]
    restoredSections.splice(
      Math.min(deletedSection.index, restoredSections.length),
      0,
      deletedSection.section,
    )
    setDeletedSection(null)
    handleSectionsChange(restoredSections)
  }, [deletedSection, handleSectionsChange])

  const handleAddSection = useCallback(() => {
    handleSectionsChange([
      ...template.sections,
      {
        id: uuidv4(),
        title: '',
        prompt: '',
        format: 'list',
        length: 'standard',
        required: true,
      },
    ])
  }, [handleSectionsChange, template.sections])

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <section className="px-6">
          <h3 className="text-muted-foreground mb-4 text-sm font-medium">
            Writing Style
          </h3>
          <div className="bg-card rounded-lg border px-4 py-3 shadow-sm">
            <Select
              value={template.writingStyle ?? 'direct'}
              onValueChange={(value) =>
                onTemplateChange({ writingStyle: value as WritingStyle })
              }
            >
              <SelectTrigger className="h-auto w-auto rounded-none border-0 bg-transparent px-0 py-0 text-sm shadow-none hover:bg-transparent focus:bg-transparent focus:ring-0 focus-visible:border-transparent focus-visible:bg-transparent focus-visible:ring-0 data-[state=open]:bg-transparent dark:bg-transparent dark:hover:bg-transparent dark:focus:bg-transparent dark:focus-visible:bg-transparent dark:data-[state=open]:bg-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">Direct</SelectItem>
                <SelectItem value="narrative">Narrative</SelectItem>
                <SelectItem value="objective">Objective</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              {writingStyleDescriptions[template.writingStyle ?? 'direct']}
            </p>
          </div>
        </section>

        <section className="px-6">
          <h3 className="text-muted-foreground mb-4 text-sm font-medium">
            Context
          </h3>
          <div className="bg-card rounded-lg border px-4 py-2 shadow-sm">
            <Textarea
              value={template.context}
              onChange={(event) =>
                onTemplateChange({ context: event.target.value })
              }
              placeholder="Provide context about what this template is for..."
              className="text-muted-foreground min-h-16 resize-none rounded-none border-0 bg-transparent px-0 text-sm leading-relaxed shadow-none focus-visible:outline-none focus-visible:ring-0 dark:bg-transparent"
            />
          </div>
        </section>

        <section className="px-6">
          <h3 className="text-muted-foreground mb-4 text-sm font-medium">
            Sections
          </h3>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={template.sections.map((section) => section.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {template.sections.map((section) => (
                  <SortableSection
                    key={section.id}
                    section={section}
                    collapsed={collapsedSections[section.id] ?? false}
                    onCollapsedChange={(collapsed) =>
                      setCollapsedSections((current) => ({
                        ...current,
                        [section.id]: collapsed,
                      }))
                    }
                    onUpdateSection={handleUpdateSection}
                    onDeleteSection={handleDeleteSection}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {template.sections.length === 0 ? (
            <div className="text-muted-foreground rounded-lg border border-dashed py-10 text-center text-sm">
              No sections yet. Add a section to get started.
            </div>
          ) : null}

          {deletedSection ? (
            <div className="bg-card text-muted-foreground mt-3 flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
              <span className="truncate">
                Deleted “{deletedSection.section.title || 'Untitled section'}”
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleUndoDelete}
                className="h-7 shrink-0 cursor-pointer gap-1.5 px-2 text-xs"
              >
                <RotateCcw className="size-3" />
                Undo
              </Button>
            </div>
          ) : null}

          <div className="pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddSection}
              className="text-muted-foreground hover:text-foreground cursor-pointer gap-2"
            >
              <Plus className="size-4" />
              Add section
            </Button>
          </div>
        </section>
      </div>
    </TooltipProvider>
  )
}

function SortableSection({
  section,
  collapsed,
  onCollapsedChange,
  onUpdateSection,
  onDeleteSection,
}: {
  section: MeetingTemplateSection
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  onUpdateSection: (
    sectionId: string,
    updates: Partial<MeetingTemplateSection>,
  ) => void
  onDeleteSection: (sectionId: string) => void
}) {
  const [localSection, setLocalSection] = useState(section)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id })

  useEffect(() => {
    setLocalSection(section)
  }, [section])

  useEffect(() => {
    const changed =
      localSection.title !== section.title ||
      localSection.prompt !== section.prompt
    if (!changed) return

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      onUpdateSection(section.id, {
        title: localSection.title,
        prompt: localSection.prompt,
      })
      saveTimeoutRef.current = null
    }, 500)

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [
    localSection.prompt,
    localSection.title,
    onUpdateSection,
    section.id,
    section.prompt,
    section.title,
  ])

  const style = {
    transform: CSS.Transform.toString(
      transform && { ...transform, scaleX: 1, scaleY: 1 },
    ),
    transition,
  }

  const flushTitle = () => {
    const title = localSection.title.trim()
    if (title !== section.title) {
      setLocalSection((current) => ({ ...current, title }))
      onUpdateSection(section.id, { title })
    }
  }

  const flushPrompt = () => {
    const prompt = localSection.prompt.trim()
    if (prompt !== section.prompt) {
      setLocalSection((current) => ({ ...current, prompt }))
      onUpdateSection(section.id, { prompt })
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-card group relative rounded-lg border p-4 shadow-sm transition-all',
        isDragging && 'z-50 shadow-lg',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-muted-foreground absolute left-2 top-[18px] cursor-grab opacity-45 transition-opacity hover:opacity-100 group-hover:opacity-100"
        aria-label="Drag section"
      >
        <GripVertical className="size-5" />
      </button>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onDeleteSection(section.id)}
            className="hover:bg-muted absolute right-2 top-2 size-8 cursor-pointer rounded-full opacity-80 hover:opacity-100"
            aria-label="Delete section"
          >
            <X className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent sideOffset={4}>Delete section</TooltipContent>
      </Tooltip>

      <div className="pl-5 pr-5">
        <div className="mb-1 flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onCollapsedChange(!collapsed)}
            className="hover:bg-muted size-6 shrink-0 cursor-pointer rounded-full p-0"
            aria-label={collapsed ? 'Expand section' : 'Collapse section'}
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </Button>
          <Input
            value={localSection.title}
            onChange={(event) =>
              setLocalSection((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            onBlur={flushTitle}
            placeholder="Section name"
            className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 py-0 text-base font-medium shadow-none focus-visible:outline-none focus-visible:ring-0 dark:bg-transparent"
          />
        </div>

        {!collapsed ? (
          <>
            <Textarea
              value={localSection.prompt}
              onChange={(event) =>
                setLocalSection((current) => ({
                  ...current,
                  prompt: event.target.value,
                }))
              }
              onBlur={flushPrompt}
              placeholder="Instructions for this section"
              className="text-muted-foreground min-h-16 resize-none rounded-none border-0 bg-transparent px-0 text-sm leading-relaxed shadow-none focus-visible:outline-none focus-visible:ring-0 dark:bg-transparent"
            />

            <div className="text-muted-foreground mt-2 flex flex-col gap-2 text-sm md:flex-row md:items-center md:gap-4">
              <InlineSelect
                label="Format"
                value={section.format ?? 'list'}
                options={[
                  ['paragraph', 'Paragraph'],
                  ['list', 'List'],
                ]}
                onValueChange={(format) =>
                  onUpdateSection(section.id, {
                    format: format as SectionFormat,
                  })
                }
              />
              <InlineSelect
                label="Length"
                value={section.length ?? 'standard'}
                options={[
                  ['concise', 'Concise'],
                  ['standard', 'Standard'],
                  ['detailed', 'Detailed'],
                ]}
                onValueChange={(length) =>
                  onUpdateSection(section.id, {
                    length: length as SectionLength,
                  })
                }
              />
              <div className="flex items-center gap-2">
                <span>Required:</span>
                <Switch
                  checked={section.required ?? true}
                  onCheckedChange={(required) =>
                    onUpdateSection(section.id, { required })
                  }
                />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function InlineSelect({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string
  value: string
  options: Array<[string, string]>
  onValueChange: (value: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span>{label}:</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="text-foreground h-auto w-auto rounded-none border-0 bg-transparent px-0 py-0 text-sm font-medium shadow-none hover:bg-transparent focus:bg-transparent focus:ring-0 focus-visible:border-transparent focus-visible:bg-transparent focus-visible:ring-0 data-[state=open]:bg-transparent dark:bg-transparent dark:hover:bg-transparent dark:focus:bg-transparent dark:focus-visible:bg-transparent dark:data-[state=open]:bg-transparent">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, label]) => (
            <SelectItem key={optionValue} value={optionValue}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
