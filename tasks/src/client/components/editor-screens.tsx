import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleArrowUp,
  CircleDot,
  FileText,
  Globe,
  ImagePlus,
  Loader2,
  MoreVertical,
  Pencil,
  RefreshCcw,
  Save,
  Settings,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import {
  type ComponentType,
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import { MarkdownEditor } from '@moldable-ai/editor'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Markdown,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from '@moldable-ai/ui'
import {
  type ProjectFormState,
  type TaskFormState,
  emptyProjectForm,
  emptyTaskForm,
  projectToForm,
  taskToForm,
} from '../lib/forms'
import { AppButton } from './app-button'
import { AttachmentList, AttachmentUpload } from './attachment-upload'
import { LabelPicker } from './label-picker'
import { LabelPill, STATUS_META } from './status'
import {
  PRIORITY_LABELS,
  PROJECT_KEY_LENGTH,
  STATUS_LABELS,
  STATUS_ORDER,
  normalizeProjectKey,
  taskKey,
} from '@/shared/task-utils'
import type {
  Project,
  Task,
  TaskAttachment,
  TaskComment,
  TaskLabel,
  TaskStatus,
} from '@/shared/types'

type IconComponent = ComponentType<{ className?: string }>

export function ProjectEditorScreen({
  mode,
  project,
  isPending,
  error,
  onCancel,
  onSubmit,
}: {
  mode: 'create' | 'edit'
  project?: Project
  isPending: boolean
  error: Error | null
  onCancel: () => void
  onSubmit: (form: ProjectFormState) => void
}) {
  const [form, setForm] = useState<ProjectFormState>(emptyProjectForm)

  useEffect(() => {
    setForm(project ? projectToForm(project) : emptyProjectForm())
  }, [project])

  const submitLabel = mode === 'edit' ? 'Save Changes' : 'Create Project'

  return (
    <div className="mx-auto max-w-7xl p-6">
      <form
        id="project-form"
        className="space-y-6"
        onSubmit={(event: FormEvent) => {
          event.preventDefault()
          onSubmit(form)
        }}
      >
        <EditorBreadcrumb>
          {mode === 'edit' && project ? (
            <>
              <button
                type="button"
                onClick={onCancel}
                className="text-foreground hover:text-primary cursor-pointer font-medium"
              >
                {project.name}
              </button>
              <ChevronRight className="size-3.5" />
              <span className="text-foreground">Settings</span>
            </>
          ) : (
            <span className="text-foreground">New Project</span>
          )}
        </EditorBreadcrumb>

        <div className="mx-auto mb-6 flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="border-border border-b sm:border-b-0">
            <nav className="scrollbar-hide -mb-px flex gap-0.5 overflow-x-auto sm:mb-0">
              <button
                type="button"
                className="text-foreground group relative flex shrink-0 cursor-pointer items-center gap-1.5 px-3 py-2.5 text-sm font-medium sm:gap-2 sm:px-4"
              >
                {mode === 'create' ? (
                  <span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full text-xs">
                    1
                  </span>
                ) : (
                  <Settings className="size-4" />
                )}
                <span>General</span>
                <span className="bg-primary absolute bottom-0 left-0 right-0 h-0.5 rounded-full sm:hidden" />
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <AppButton
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={onCancel}
            >
              <ArrowLeft className="size-3.5" />
              Cancel
            </AppButton>
            <AppButton
              type="submit"
              disabled={isPending || !form.name.trim()}
              className="w-full sm:w-auto"
            >
              <Save className="size-3.5" />
              {submitLabel}
            </AppButton>
          </div>
        </div>

        <section className="mx-auto max-w-3xl">
          <div className="border-border bg-accent rounded-lg border">
            <div className="p-4">
              <ProjectLogoPicker
                value={form.logoUrl}
                name={form.name}
                disabled={isPending}
                onChange={(logoUrl) =>
                  setForm((current) => ({ ...current, logoUrl }))
                }
              />
            </div>

            <Separator />

            <div className="px-4 py-3">
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="placeholder:text-muted-foreground/50 h-auto border-0 bg-transparent px-0 text-xl font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent"
                placeholder="Project name"
                required
              />
            </div>

            <Separator />

            <div className="space-y-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground shrink-0 text-sm">
                  Task identifier prefix
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    value={form.key}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        key: normalizeProjectKey(event.target.value),
                      }))
                    }
                    maxLength={PROJECT_KEY_LENGTH}
                    className="placeholder:text-muted-foreground/50 h-auto w-16 border-0 bg-transparent px-0 text-center font-mono text-sm uppercase tracking-widest shadow-none focus-visible:ring-0 dark:bg-transparent"
                    placeholder="TSK"
                  />
                  <span className="text-muted-foreground text-sm">
                    <span className="mr-5">-&gt; </span>
                    {normalizeProjectKey(form.key || 'TSK')}-1
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="px-4 py-3">
              <Input
                value={form.summary}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    summary: event.target.value,
                  }))
                }
                className="placeholder:text-muted-foreground/50 h-auto border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
                placeholder="A short tagline describing your project..."
              />
            </div>

            <Separator />

            <div className="px-4 py-3">
              <MarkdownEditor
                value={form.description}
                onChange={(description) =>
                  setForm((current) => ({ ...current, description }))
                }
                minHeight="120px"
                contentClassName="text-sm"
                placeholder="Add project goals, notes, and useful context..."
              />
            </div>

            <Separator />

            <div className="space-y-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <Globe className="text-muted-foreground size-4 shrink-0" />
                <Input
                  type="url"
                  value={form.websiteUrl}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      websiteUrl: event.target.value,
                    }))
                  }
                  className="placeholder:text-muted-foreground/50 h-auto border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
                  placeholder="https://your-website.com"
                />
              </div>
            </div>

            <Separator />

            <LabelPicker
              value={form.labelsText}
              availableLabels={project?.labels ?? []}
              draftLabels={form.draftLabels}
              onChange={(labelsText) =>
                setForm((current) => ({ ...current, labelsText }))
              }
              onDraftLabelsChange={(draftLabels) =>
                setForm((current) => ({ ...current, draftLabels }))
              }
            />
          </div>
          {error ? (
            <p className="text-destructive mt-3 text-sm">{error.message}</p>
          ) : null}
        </section>
      </form>
    </div>
  )
}

function ProjectLogoPicker({
  value,
  name,
  disabled,
  onChange,
}: {
  value: string | null
  name: string
  disabled: boolean
  onChange: (value: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) return

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') onChange(reader.result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="border-muted-foreground/25 hover:border-muted-foreground/50 relative flex size-20 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        {value ? (
          <>
            <img
              src={value}
              alt="Project logo"
              className="size-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
              <ImagePlus className="size-5 text-white" />
            </span>
          </>
        ) : name.trim() ? (
          <span className="text-muted-foreground text-xl font-semibold">
            {name.trim().charAt(0).toUpperCase()}
          </span>
        ) : (
          <Upload className="text-muted-foreground/50 size-6" />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">
          {value ? 'Change logo' : 'Add logo'}
        </span>
        <span className="text-muted-foreground text-xs">
          PNG, JPG or WEBP (max 10MB)
        </span>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            className="text-destructive mt-1 flex cursor-pointer items-center gap-1 text-xs hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="size-3" />
            Remove
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function TaskEditorScreen({
  mode,
  project,
  task,
  labels,
  isPending,
  error,
  onCancel,
  onUploadAttachment,
  onSubmit,
}: {
  mode: 'create' | 'edit'
  project: Project
  task?: Task
  labels: TaskLabel[]
  isPending: boolean
  error: Error | null
  onCancel: () => void
  onUploadAttachment: (file: File) => Promise<TaskAttachment>
  onSubmit: (form: TaskFormState) => void
}) {
  const [form, setForm] = useState<TaskFormState>(emptyTaskForm)
  const statusMeta = STATUS_META[form.status]
  const StatusIcon = statusMeta.icon
  const submitLabel = mode === 'edit' ? 'Save Changes' : 'Create Task'

  useEffect(() => {
    setForm(task ? taskToForm(task) : emptyTaskForm())
  }, [task])

  return (
    <div className="mx-auto max-w-7xl p-6">
      <form
        id="task-form"
        className="space-y-6"
        onSubmit={(event: FormEvent) => {
          event.preventDefault()
          onSubmit(form)
        }}
      >
        <EditorBreadcrumb>
          <button
            type="button"
            onClick={onCancel}
            className="text-foreground hover:text-primary cursor-pointer font-medium"
          >
            {project.name}
          </button>
          <ChevronRight className="size-3.5" />
          <span>Tasks</span>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">
            {mode === 'edit' && task ? taskKey(project, task) : 'New'}
          </span>
        </EditorBreadcrumb>

        <div className="grid gap-6 lg:grid-cols-[1fr_auto_280px]">
          <section className="min-w-0">
            <div className="border-border bg-accent rounded-lg border">
              <div className="px-4 py-3">
                <Input
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  className="placeholder:text-muted-foreground/50 h-auto border-0 bg-transparent px-0 text-xl font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent"
                  placeholder="Task title"
                  required
                />
              </div>

              <Separator />

              <div className="px-4 py-3">
                <MarkdownEditor
                  value={form.description}
                  onChange={(description) =>
                    setForm((current) => ({ ...current, description }))
                  }
                  minHeight="120px"
                  contentClassName="text-sm"
                  placeholder="Add description... (drag & drop images here)"
                />
              </div>

              <Separator />

              <div className="px-4 py-3">
                <MarkdownEditor
                  value={form.acceptanceCriteria}
                  onChange={(acceptanceCriteria) =>
                    setForm((current) => ({ ...current, acceptanceCriteria }))
                  }
                  minHeight="80px"
                  contentClassName="text-sm"
                  placeholder="Acceptance criteria (optional)... What proof should be provided? (drag & drop images here)"
                />
              </div>

              <Separator />

              <div className="space-y-2 px-4 py-3">
                <span className="text-muted-foreground text-xs">
                  Attachments
                </span>
                <AttachmentUpload
                  attachments={form.attachments}
                  disabled={isPending}
                  onUploadFile={onUploadAttachment}
                  onChange={(attachments) =>
                    setForm((current) => ({ ...current, attachments }))
                  }
                />
              </div>

              <Separator />

              <LabelPicker
                value={form.labelsText}
                availableLabels={labels}
                draftLabels={form.draftLabels}
                onChange={(labelsText) =>
                  setForm((current) => ({ ...current, labelsText }))
                }
                onDraftLabelsChange={(draftLabels) =>
                  setForm((current) => ({ ...current, draftLabels }))
                }
              />
            </div>
            {error ? (
              <p className="text-destructive mt-3 text-sm">{error.message}</p>
            ) : null}
          </section>

          <Separator orientation="vertical" className="hidden lg:block" />

          <aside className="space-y-4">
            <AppButton
              type="submit"
              size="sm"
              className="w-full justify-center"
              disabled={isPending || !form.title.trim()}
            >
              <CheckCircle2 className="size-4" />
              {submitLabel}
            </AppButton>

            <Separator />

            <div className="space-y-4 pt-2">
              <SidebarSelectRow
                icon={StatusIcon}
                iconClass={statusMeta.iconClass}
                label="Status"
              >
                <Select
                  value={form.status}
                  onValueChange={(status) =>
                    setForm((current) => ({
                      ...current,
                      status: status as TaskStatus,
                    }))
                  }
                >
                  <SelectTrigger className="border-border h-7 w-32 rounded-md text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_ORDER.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SidebarSelectRow>

              <SidebarSelectRow icon={CircleDot} label="Priority">
                <Select
                  value={form.priority}
                  onValueChange={(priority) =>
                    setForm((current) => ({
                      ...current,
                      priority: priority as Task['priority'],
                    }))
                  }
                >
                  <SelectTrigger className="border-border h-7 w-32 rounded-md text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SidebarSelectRow>
            </div>
          </aside>
        </div>
      </form>
    </div>
  )
}

export function TaskDetailScreen({
  project,
  task,
  labels,
  isCommentPending,
  onBack,
  onEdit,
  onPatchTask,
  onCreateComment,
  onUpdateComment,
  onDeleteComment,
  onDeleteTask,
}: {
  project: Project
  task: Task
  labels: TaskLabel[]
  isCommentPending: boolean
  onBack: () => void
  onEdit: () => void
  onPatchTask: (patch: Partial<Task>) => void
  onCreateComment: (content: string) => void
  onUpdateComment: (commentId: string, content: string) => void
  onDeleteComment: (commentId: string) => void
  onDeleteTask: () => void
}) {
  const statusMeta = STATUS_META[task.status]
  const StatusIcon = statusMeta.icon
  const [newComment, setNewComment] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editComment, setEditComment] = useState('')
  const displayId = taskKey(project, task)

  const submitNewComment = () => {
    if (!newComment.trim()) return
    onCreateComment(newComment)
    setNewComment('')
  }

  const submitEditedComment = () => {
    if (!editingCommentId || !editComment.trim()) return
    onUpdateComment(editingCommentId, editComment)
    setEditingCommentId(null)
    setEditComment('')
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          {project.name}
        </button>
        <span className="text-muted-foreground/50">/</span>
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          Tasks
        </button>
        <span className="text-muted-foreground/50">/</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(displayId)
              }}
              className="text-foreground hover:bg-accent cursor-pointer rounded-sm px-1 py-0.5 transition-colors"
            >
              {displayId}
            </button>
          </TooltipTrigger>
          <TooltipContent>Click to copy</TooltipContent>
        </Tooltip>
      </div>

      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {task.title}
          </h1>

          <div className="flex shrink-0 items-center gap-2">
            <AppButton
              type="button"
              variant="outline"
              className="gap-2 rounded-xl px-4"
              onClick={onEdit}
            >
              <Pencil className="size-4" />
              Edit
            </AppButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-9 cursor-pointer items-center justify-center rounded-lg transition-colors"
                  aria-label="Task actions"
                >
                  <MoreVertical className="size-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                  <Pencil className="mr-2 size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    onPatchTask({
                      status:
                        task.status === 'completed' ? 'open' : 'completed',
                    })
                  }
                  className="cursor-pointer"
                >
                  <CheckCircle2 className="mr-2 size-4" />
                  {task.status === 'completed' ? 'Reopen task' : 'Mark done'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onPatchTask({ status: 'closed' })}
                  className="cursor-pointer"
                >
                  <X className="mr-2 size-4" />
                  Close task
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onDeleteTask}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="border-border border-b">
          <nav className="-mb-px flex gap-8" aria-label="Task tabs">
            <button
              type="button"
              className="text-foreground relative flex cursor-pointer items-center gap-2 py-3 text-sm font-semibold"
              aria-current="page"
            >
              <FileText className="size-4" />
              Details
              <span className="bg-primary absolute bottom-0 left-0 right-0 h-0.5 rounded-full" />
            </button>
          </nav>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_auto_280px]">
          <section className="min-w-0 space-y-8">
            <div className="prose prose-invert max-w-none">
              {task.description ? (
                <Markdown
                  markdown={task.description}
                  proseSize="sm"
                  className="text-base leading-relaxed"
                />
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  No description provided.
                </p>
              )}
            </div>

            <AttachmentList attachments={task.attachments ?? []} />

            {task.acceptanceCriteria ? (
              <div className="border-border bg-muted/30 rounded-lg border p-4">
                <div className="flex gap-3">
                  <FileText className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Acceptance Criteria</p>
                    <Markdown
                      markdown={task.acceptanceCriteria}
                      proseSize="sm"
                      className="text-muted-foreground mt-1"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <Pencil className="size-4" />
              <span className="text-foreground/85 font-medium">Tasks</span>
              <span>edited description</span>
              <span>·</span>
              <span>
                {new Date(task.updatedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>

            <div className="space-y-4">
              <TaskCommentList
                comments={task.comments ?? []}
                editingCommentId={editingCommentId}
                editComment={editComment}
                isPending={isCommentPending}
                onEditCommentChange={setEditComment}
                onStartEdit={(comment) => {
                  setEditingCommentId(comment.id)
                  setEditComment(comment.content)
                }}
                onCancelEdit={() => {
                  setEditingCommentId(null)
                  setEditComment('')
                }}
                onSubmitEdit={submitEditedComment}
                onDeleteComment={onDeleteComment}
              />
              <TaskCommentInput
                value={newComment}
                onChange={setNewComment}
                onSubmit={submitNewComment}
                isLoading={isCommentPending}
              />
            </div>
          </section>

          <Separator orientation="vertical" className="hidden lg:block" />

          <aside className="sticky top-4 space-y-4 self-start">
            <div className="flex items-center justify-between">
              <h2 className="text-muted-foreground text-sm">Properties</h2>
            </div>

            <div className="space-y-3">
              <PropertyRow label="Status">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="border-border hover:bg-accent focus-visible:ring-ring flex h-7 w-36 cursor-pointer items-center justify-between gap-2 rounded-md border bg-transparent px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2"
                      aria-label="Change task status"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <StatusIcon
                          className={cn(
                            'size-3.5 shrink-0',
                            statusMeta.iconClass,
                          )}
                        />
                        <span className="truncate">
                          {STATUS_LABELS[task.status]}
                        </span>
                      </span>
                      <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {STATUS_ORDER.map((status) => {
                      const OptionIcon = STATUS_META[status].icon
                      const isSelected = task.status === status
                      return (
                        <DropdownMenuItem
                          key={status}
                          onClick={() => onPatchTask({ status })}
                          className="cursor-pointer text-xs"
                        >
                          <OptionIcon
                            className={cn(
                              'mr-2 size-3.5',
                              STATUS_META[status].iconClass,
                            )}
                          />
                          <span className="flex-1">
                            {STATUS_LABELS[status]}
                          </span>
                          {isSelected ? (
                            <Check className="text-primary size-3.5" />
                          ) : null}
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </PropertyRow>
              <PropertyRow label="Priority">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="border-border hover:bg-accent focus-visible:ring-ring flex h-7 w-36 cursor-pointer items-center justify-between gap-2 rounded-md border bg-transparent px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2"
                      aria-label="Change task priority"
                    >
                      <span className="text-muted-foreground truncate font-medium">
                        {PRIORITY_LABELS[task.priority]}
                      </span>
                      <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => {
                      const priority = value as Task['priority']
                      const isSelected = task.priority === priority
                      return (
                        <DropdownMenuItem
                          key={priority}
                          onClick={() => onPatchTask({ priority })}
                          className="cursor-pointer text-xs"
                        >
                          <span className="flex-1">{label}</span>
                          {isSelected ? (
                            <Check className="text-primary size-3.5" />
                          ) : null}
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </PropertyRow>
              <div className="space-y-2 py-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Labels</span>
                  <TaskDetailLabelPicker
                    task={task}
                    labels={labels}
                    onChange={(nextLabels) =>
                      onPatchTask({ labels: nextLabels })
                    }
                  />
                </div>
                {task.labels.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {task.labels.map((label) => (
                      <LabelPill key={label.id} label={label} compact />
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    No labels
                  </span>
                )}
              </div>
              <PropertyRow label="Updated">
                <span className="text-xs font-semibold">
                  {new Date(task.updatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </PropertyRow>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function EditorBreadcrumb({ children }: { children: ReactNode }) {
  return (
    <div className="text-muted-foreground flex min-h-8 items-center gap-1.5 text-sm">
      {children}
    </div>
  )
}

function TaskCommentList({
  comments,
  editingCommentId,
  editComment,
  isPending,
  onEditCommentChange,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  onDeleteComment,
}: {
  comments: TaskComment[]
  editingCommentId: string | null
  editComment: string
  isPending: boolean
  onEditCommentChange: (value: string) => void
  onStartEdit: (comment: TaskComment) => void
  onCancelEdit: () => void
  onSubmitEdit: () => void
  onDeleteComment: (commentId: string) => void
}) {
  if (comments.length === 0) return null

  return (
    <div className="space-y-4 pb-4">
      {comments.map((comment) => {
        const isEditing = editingCommentId === comment.id
        return (
          <div key={comment.id} className="group flex gap-3">
            <div className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium">
              {comment.authorInitial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-foreground/85 text-xs">
                  {comment.authorName}
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatTimestamp(comment.createdAt)}
                </span>
                {comment.updatedAt !== comment.createdAt ? (
                  <span className="text-muted-foreground text-xs">edited</span>
                ) : null}
              </div>
              {isEditing ? (
                <div className="mt-2">
                  <TaskCommentInput
                    value={editComment}
                    onChange={onEditCommentChange}
                    onSubmit={onSubmitEdit}
                    onCancel={onCancelEdit}
                    isEditing
                    isLoading={isPending}
                    placeholder="Edit your comment..."
                  />
                </div>
              ) : (
                <Markdown
                  markdown={comment.content}
                  proseSize="sm"
                  className="mt-1"
                />
              )}
            </div>
            {!isEditing ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:bg-accent hover:text-foreground size-6 cursor-pointer rounded-sm opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Comment actions"
                  >
                    <MoreVertical className="mx-auto size-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => onStartEdit(comment)}
                    className="cursor-pointer"
                  >
                    <Pencil className="mr-2 size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDeleteComment(comment.id)}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function TaskCommentInput({
  value,
  onChange,
  onSubmit,
  onCancel,
  isLoading,
  isEditing = false,
  placeholder = 'Leave a comment...',
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel?: () => void
  isLoading: boolean
  isEditing?: boolean
  placeholder?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        if (value.trim()) onSubmit()
      }
      if (event.key === 'Escape' && onCancel) {
        event.preventDefault()
        onCancel()
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, onSubmit, value])

  return (
    <div
      ref={containerRef}
      className="border-border relative rounded-lg border bg-transparent"
    >
      <div className={cn('px-4 py-3', isEditing ? 'pr-24' : 'pr-12')}>
        <MarkdownEditor
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          minHeight="60px"
          contentClassName="text-sm"
        />
      </div>
      <div className="absolute bottom-3 right-3 flex items-center gap-1">
        {isEditing && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer rounded-sm px-2 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-30"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="button"
          onClick={onSubmit}
          disabled={!value.trim() || isLoading}
          className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-30"
          aria-label={isEditing ? 'Save comment' : 'Post comment'}
        >
          {isLoading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <CircleArrowUp className="size-5" />
          )}
        </button>
      </div>
    </div>
  )
}

function TaskDetailLabelPicker({
  task,
  labels,
  onChange,
}: {
  task: Task
  labels: TaskLabel[]
  onChange: (labels: TaskLabel[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [showCreateLabel, setShowCreateLabel] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState(generateRandomLabelColor)
  const allLabels = mergeLabels(labels, task.labels)

  const toggleLabel = (label: TaskLabel) => {
    const isSelected = task.labels.some((item) => item.id === label.id)
    onChange(
      isSelected
        ? task.labels.filter((item) => item.id !== label.id)
        : [...task.labels, label],
    )
  }

  const createLabel = () => {
    const name = newLabelName.trim()
    if (!name || newLabelColor.length !== 7) return
    const label: TaskLabel = {
      id: `label-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name,
      color: newLabelColor,
    }
    onChange([...task.labels, label])
    setNewLabelName('')
    setNewLabelColor(generateRandomLabelColor())
    setShowCreateLabel(false)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground cursor-pointer text-xs transition-colors"
          aria-label="Edit task labels"
        >
          <PlusGlyph />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <div className="space-y-2">
          <div className="text-muted-foreground text-xs font-medium">
            Select labels
          </div>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {allLabels.map((label) => {
              const isSelected = task.labels.some(
                (item) => item.id === label.id,
              )
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => toggleLabel(label)}
                  className={cn(
                    'hover:bg-muted flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                    isSelected && 'bg-muted',
                  )}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: getLabelDot(label.color) }}
                  />
                  <span className="flex-1 truncate">{label.name}</span>
                  {isSelected ? (
                    <Check className="text-primary size-3.5" />
                  ) : null}
                </button>
              )
            })}
            {allLabels.length === 0 ? (
              <p className="text-muted-foreground px-2 py-1 text-xs">
                No labels yet
              </p>
            ) : null}
          </div>
          <Separator />
          {showCreateLabel ? (
            <div className="space-y-2 pt-1">
              <Input
                value={newLabelName}
                onChange={(event) => setNewLabelName(event.target.value)}
                placeholder="Label name"
                className="border-border h-7 rounded-md bg-transparent px-2 text-xs dark:bg-transparent"
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    createLabel()
                  }
                  if (event.key === 'Escape') {
                    setShowCreateLabel(false)
                    setNewLabelName('')
                  }
                }}
              />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setNewLabelColor(generateRandomLabelColor())}
                  className="border-border hover:bg-muted flex size-6 cursor-pointer items-center justify-center rounded-sm border transition-colors"
                  style={{ backgroundColor: `${newLabelColor}30` }}
                >
                  <RefreshCcw
                    className="size-3"
                    style={{ color: newLabelColor }}
                  />
                </button>
                <Input
                  value={newLabelColor.replace('#', '')}
                  onChange={(event) => {
                    const value = event.target.value.replace(
                      /[^0-9A-Fa-f]/g,
                      '',
                    )
                    if (value.length <= 6) setNewLabelColor(`#${value}`)
                  }}
                  className="border-border h-7 flex-1 rounded-sm bg-transparent px-2 font-mono text-xs dark:bg-transparent"
                  placeholder="d73a4a"
                  maxLength={6}
                />
              </div>
              <div className="flex gap-1">
                <AppButton
                  size="sm"
                  variant="ghost"
                  className="h-6 flex-1 text-xs"
                  onClick={() => {
                    setShowCreateLabel(false)
                    setNewLabelName('')
                  }}
                >
                  Cancel
                </AppButton>
                <AppButton
                  size="sm"
                  className="h-6 flex-1 text-xs"
                  disabled={!newLabelName.trim() || newLabelColor.length !== 7}
                  onClick={createLabel}
                >
                  Create
                </AppButton>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowCreateLabel(true)
                setNewLabelColor(generateRandomLabelColor())
              }}
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors"
            >
              <PlusGlyph />
              Create new label
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function PlusGlyph() {
  return <span className="text-lg leading-none">+</span>
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function mergeLabels(...groups: TaskLabel[][]) {
  const byId = new Map<string, TaskLabel>()
  for (const group of groups) {
    for (const label of group) byId.set(label.id, label)
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

function getLabelDot(color: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#6b7280'
}

function generateRandomLabelColor(): string {
  const hue = Math.floor(Math.random() * 360)
  const saturation = 60 + Math.floor(Math.random() * 20)
  const lightness = 45 + Math.floor(Math.random() * 15)
  return hslToHex(hue, saturation, lightness)
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function SidebarSelectRow({
  icon: Icon,
  iconClass,
  label,
  children,
}: {
  icon: IconComponent
  iconClass?: string
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className={cn('text-muted-foreground size-3.5', iconClass)} />
        <span className="text-muted-foreground text-xs">{label}</span>
      </div>
      {children}
    </div>
  )
}

function PropertyRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      {children}
    </div>
  )
}
