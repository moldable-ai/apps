import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  popMoldableNavigation,
  pushMoldableNavigation,
  resetMoldableNavigation,
  useMoldableCommands,
  useMoldableNavigationPop,
  useWorkspace,
} from '@moldable-ai/ui'
import {
  type ProjectFormState,
  type TaskFormState,
  parseJsonResponse,
  parseLabels,
} from './lib/forms'
import {
  buildProjectHash,
  buildTaskHash,
  parseTasksHash,
} from './lib/task-links'
import {
  ProjectEditorScreen,
  TaskDetailScreen,
  TaskEditorScreen,
} from './components/editor-screens'
import { ProjectDirectory } from './components/project-directory'
import { ProjectPageHeader } from './components/project-page-header'
import { ProjectTabs } from './components/project-tabs'
import {
  type TaskFiltersState,
  applyTaskFilters,
  emptyTaskFilters,
  hasActiveTaskFilters,
} from './components/task-filters'
import type { ViewMode } from './components/toolbar'
import { getAllLabels, sortTasks } from '@/shared/task-utils'
import type { Project, ProjectWithTasks, Task, TaskLabel } from '@/shared/types'

interface ProjectsResponse {
  projects: ProjectWithTasks[]
}

type EditorState =
  | { type: 'project'; mode: 'create' | 'edit'; project?: Project }
  | { type: 'task'; mode: 'create' | 'edit'; task?: Task }
  | { type: 'task-detail'; task: Task }

type DeleteTarget =
  | { type: 'project'; project: Project }
  | { type: 'task'; task: Task }

const VIEW_MODE_STORAGE_KEY = 'tasks:view-mode'

function readStoredViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'list'

  const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY)
  return stored === 'kanban' || stored === 'list' ? stored : 'list'
}

export function App() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  )
  const [viewMode, setViewMode] = useState<ViewMode>(readStoredViewMode)
  const [activeTab, setActiveTab] = useState<'tasks' | 'readme'>('tasks')
  const [filters, setFilters] = useState<TaskFiltersState>(emptyTaskFilters)
  const [activeEditor, setActiveEditor] = useState<EditorState | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const didRestoreHashRef = useRef(false)

  const projectsQuery = useQuery({
    queryKey: ['tasks-projects', workspaceId],
    queryFn: async () =>
      parseJsonResponse<ProjectsResponse>(
        await fetchWithWorkspace('/api/projects'),
      ),
  })

  const projectsData = projectsQuery.data?.projects
  const projects = useMemo(() => projectsData ?? [], [projectsData])
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? null

  const openProjects = useCallback((sync: 'reset' | 'none' = 'reset') => {
    if (sync === 'reset') resetMoldableNavigation()
    setActiveEditor(null)
    setSelectedProjectId(null)
  }, [])

  const openProject = useCallback(
    (projectId: string, sync: 'push' | 'none' = 'push') => {
      const project = projects.find((item) => item.id === projectId)
      if (sync === 'push') {
        pushMoldableNavigation({
          id: `project:${projectId}`,
          title: project?.name ?? 'Project',
        })
      }
      setActiveEditor(null)
      setSelectedProjectId(projectId)
    },
    [projects],
  )

  const closeEditor = useCallback((sync: 'pop' | 'none' = 'pop') => {
    if (sync === 'pop') popMoldableNavigation()
    setActiveEditor(null)
  }, [])

  const openProjectEditor = useCallback(
    (mode: 'create' | 'edit', project?: Project) => {
      pushMoldableNavigation({
        id: project ? `project-edit:${project.id}` : 'project:create',
        title: project ? `Edit ${project.name}` : 'New project',
      })
      setActiveEditor({ type: 'project', mode, project })
    },
    [],
  )

  const openTaskEditor = useCallback((mode: 'create' | 'edit', task?: Task) => {
    pushMoldableNavigation({
      id: task ? `task-edit:${task.id}` : 'task:create',
      title: task ? `Edit ${task.title}` : 'New task',
    })
    setActiveEditor({ type: 'task', mode, task })
  }, [])

  const openTaskDetail = useCallback(
    (task: Task, sync: 'push' | 'none' = 'push') => {
      if (sync === 'push') {
        pushMoldableNavigation({
          id: `task:${task.id}`,
          title: task.title,
        })
      }
      setActiveEditor({ type: 'task-detail', task })
    },
    [],
  )

  useEffect(() => {
    resetMoldableNavigation()
  }, [])

  useEffect(() => {
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode)
  }, [viewMode])

  useMoldableNavigationPop(() => {
    if (activeEditor) {
      closeEditor('none')
      return
    }

    if (selectedProjectId) {
      openProjects('none')
    }
  })

  useEffect(() => {
    if (
      selectedProjectId &&
      projectsQuery.isSuccess &&
      !projects.some((project) => project.id === selectedProjectId)
    ) {
      setSelectedProjectId(null)
    }
  }, [projects, projectsQuery.isSuccess, selectedProjectId])

  useEffect(() => {
    if (didRestoreHashRef.current || projects.length === 0) return
    didRestoreHashRef.current = true

    const parsed = parseTasksHash(window.location.hash)
    if (!parsed) return

    const project = projects.find((item) => item.id === parsed.projectId)
    if (!project) return

    openProject(project.id)
    if (parsed.type === 'task') {
      const task = project.tasks.find((item) => item.id === parsed.taskId)
      if (task) openTaskDetail(task)
    }
  }, [openProject, openTaskDetail, projects])

  useEffect(() => {
    const url = new URL(window.location.href)

    if (activeEditor?.type === 'task-detail') {
      url.hash = buildTaskHash(
        activeEditor.task.projectId,
        activeEditor.task.id,
      ).slice(1)
    } else if (selectedProjectId) {
      url.hash = buildProjectHash(selectedProjectId).slice(1)
    } else {
      url.hash = ''
    }

    window.history.replaceState(null, '', url)
  }, [activeEditor, selectedProjectId])

  const invalidateProjects = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: ['tasks-projects', workspaceId],
      }),
    [queryClient, workspaceId],
  )

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'moldable:app-api-changed') return
      if (event.data?.targetAppId !== 'tasks') return
      if (event.data?.workspaceId && event.data.workspaceId !== workspaceId)
        return

      void invalidateProjects()
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [invalidateProjects, workspaceId])

  useEffect(() => {
    if (!activeEditor || !projectsQuery.isSuccess) return

    if (projects.length === 0) {
      setActiveEditor(null)
      return
    }

    if (activeEditor.type === 'project' && activeEditor.project) {
      const project = projects.find(
        (item) => item.id === activeEditor.project?.id,
      )
      if (!project) {
        setActiveEditor(null)
        return
      }
      if (project !== activeEditor.project) {
        setActiveEditor({ type: 'project', mode: activeEditor.mode, project })
      }
    }

    if (activeEditor.type === 'task' && activeEditor.task) {
      const task = projects
        .flatMap((project) => project.tasks)
        .find((item) => item.id === activeEditor.task?.id)
      if (!task) {
        setActiveEditor(null)
        return
      }
      if (task !== activeEditor.task) {
        setActiveEditor({ type: 'task', mode: activeEditor.mode, task })
      }
    }

    if (activeEditor.type === 'task-detail') {
      const task = projects
        .flatMap((project) => project.tasks)
        .find((item) => item.id === activeEditor.task.id)
      if (!task) {
        setActiveEditor(null)
      } else if (task !== activeEditor.task) {
        setActiveEditor({ type: 'task-detail', task })
      }
    }
  }, [activeEditor, projects, projectsQuery.isSuccess])

  const createProject = useMutation({
    mutationFn: async (form: ProjectFormState) => {
      const res = await fetchWithWorkspace('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          key: form.key,
          summary: form.summary,
          description: form.description,
          logoUrl: form.logoUrl,
          websiteUrl: form.websiteUrl,
          labels: parseLabels(form.labelsText, form.draftLabels),
        }),
      })
      return parseJsonResponse<{ project: Project }>(res)
    },
    onSuccess: ({ project }) => {
      popMoldableNavigation()
      openProject(project.id)
      void invalidateProjects()
    },
  })

  const updateProject = useMutation({
    mutationFn: async ({
      project,
      form,
    }: {
      project: Project
      form: ProjectFormState
    }) => {
      const res = await fetchWithWorkspace(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          key: form.key,
          summary: form.summary,
          description: form.description,
          logoUrl: form.logoUrl,
          websiteUrl: form.websiteUrl,
          labels: parseLabels(form.labelsText, [
            ...project.labels,
            ...form.draftLabels,
          ]),
        }),
      })
      return parseJsonResponse<{ project: Project }>(res)
    },
    onSuccess: () => {
      if (activeEditor) closeEditor('pop')
      else setActiveEditor(null)
      void invalidateProjects()
    },
  })

  const deleteProject = useMutation({
    mutationFn: async (project: Project) => {
      const res = await fetchWithWorkspace(`/api/projects/${project.id}`, {
        method: 'DELETE',
      })
      return parseJsonResponse<{ ok: boolean }>(res)
    },
    onSuccess: () => {
      openProjects('reset')
      void invalidateProjects()
    },
  })

  const createTask = useMutation({
    mutationFn: async ({
      project,
      form,
    }: {
      project: ProjectWithTasks
      form: TaskFormState
    }) => {
      const res = await fetchWithWorkspace(
        `/api/projects/${project.id}/tasks`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            acceptanceCriteria: form.acceptanceCriteria,
            attachments: form.attachments,
            status: form.status,
            priority: form.priority,
            labels: parseLabels(form.labelsText, [
              ...project.labels,
              ...form.draftLabels,
            ]),
          }),
        },
      )
      return parseJsonResponse<{ task: Task }>(res)
    },
    onSuccess: ({ task }) => {
      popMoldableNavigation()
      openTaskDetail(task)
      void invalidateProjects()
    },
  })

  const updateTask = useMutation({
    mutationFn: async ({
      task,
      form,
      labels,
    }: {
      task: Task
      form: TaskFormState
      labels: TaskLabel[]
    }) => {
      const res = await fetchWithWorkspace(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          acceptanceCriteria: form.acceptanceCriteria,
          attachments: form.attachments,
          status: form.status,
          priority: form.priority,
          labels: parseLabels(form.labelsText, [
            ...labels,
            ...form.draftLabels,
          ]),
        }),
      })
      return parseJsonResponse<{ task: Task }>(res)
    },
    onSuccess: ({ task }) => {
      closeEditor('pop')
      openTaskDetail(task, 'none')
      void invalidateProjects()
    },
  })

  const patchTask = useMutation({
    mutationFn: async ({
      task,
      patch,
    }: {
      task: Task
      patch: Partial<Task>
    }) => {
      const res = await fetchWithWorkspace(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      return parseJsonResponse<{ task: Task }>(res)
    },
    onSuccess: ({ task }) => {
      setActiveEditor((current) =>
        current?.type === 'task-detail' && current.task.id === task.id
          ? { type: 'task-detail', task }
          : current,
      )
      void invalidateProjects()
    },
  })

  const createComment = useMutation({
    mutationFn: async ({ task, content }: { task: Task; content: string }) => {
      const res = await fetchWithWorkspace(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      return parseJsonResponse<{ task: Task }>(res)
    },
    onSuccess: ({ task }) => {
      setActiveEditor({ type: 'task-detail', task })
      void invalidateProjects()
    },
  })

  const updateComment = useMutation({
    mutationFn: async ({
      task,
      commentId,
      content,
    }: {
      task: Task
      commentId: string
      content: string
    }) => {
      const res = await fetchWithWorkspace(
        `/api/tasks/${task.id}/comments/${commentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        },
      )
      return parseJsonResponse<{ task: Task }>(res)
    },
    onSuccess: ({ task }) => {
      setActiveEditor({ type: 'task-detail', task })
      void invalidateProjects()
    },
  })

  const deleteComment = useMutation({
    mutationFn: async ({
      task,
      commentId,
    }: {
      task: Task
      commentId: string
    }) => {
      const res = await fetchWithWorkspace(
        `/api/tasks/${task.id}/comments/${commentId}`,
        { method: 'DELETE' },
      )
      return parseJsonResponse<{ task: Task }>(res)
    },
    onSuccess: ({ task }) => {
      setActiveEditor({ type: 'task-detail', task })
      void invalidateProjects()
    },
  })

  const deleteTask = useMutation({
    mutationFn: async (task: Task) => {
      const res = await fetchWithWorkspace(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      })
      return parseJsonResponse<{ ok: boolean }>(res)
    },
    onSuccess: () => {
      if (activeEditor) closeEditor('pop')
      else setActiveEditor(null)
      void invalidateProjects()
    },
  })

  const filteredTasks = useMemo(() => {
    if (!selectedProject) return []
    const sortedTasks = sortTasks(selectedProject.tasks)
    return applyTaskFilters({
      tasks: sortedTasks,
      labels: getAllLabels(selectedProject, selectedProject.tasks),
      filters,
      search: '',
    })
  }, [filters, selectedProject])

  useEffect(() => {
    setFilters(emptyTaskFilters())
  }, [selectedProject?.id])

  useMoldableCommands({
    'new-task': () => {
      if (selectedProject) openTaskEditor('create')
    },
    'open-projects': () => {
      openProjects()
    },
    'open-project': (payload) => {
      const projectId = (payload as { projectId?: unknown } | null)?.projectId
      if (typeof projectId === 'string') openProject(projectId)
    },
  })

  const projectLabels = selectedProject
    ? getAllLabels(selectedProject, selectedProject.tasks)
    : []

  const uploadAttachment = async (file: File) => {
    const dataUrl = await fileToDataUrl(file)
    const res = await fetchWithWorkspace('/api/attachments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl,
      }),
    })
    return parseJsonResponse<{ attachment: Task['attachments'][number] }>(res)
  }

  const deleteDialog = (
    <DeleteAlertDialog
      target={deleteTarget}
      isDeleting={deleteProject.isPending || deleteTask.isPending}
      onOpenChange={(open) => {
        if (!open) setDeleteTarget(null)
      }}
      onConfirm={() => {
        if (!deleteTarget) return
        if (deleteTarget.type === 'project') {
          deleteProject.mutate(deleteTarget.project)
        } else {
          deleteTask.mutate(deleteTarget.task)
        }
        setDeleteTarget(null)
      }}
    />
  )

  if (activeEditor?.type === 'project') {
    return (
      <main className="scrollbar-hide bg-background text-foreground h-dvh overflow-y-auto pb-[var(--chat-safe-padding)]">
        <ProjectEditorScreen
          mode={activeEditor.mode}
          project={activeEditor.project}
          isPending={createProject.isPending || updateProject.isPending}
          error={createProject.error ?? updateProject.error}
          onCancel={() => closeEditor('pop')}
          onSubmit={(form) => {
            if (activeEditor.mode === 'edit' && activeEditor.project) {
              updateProject.mutate({ project: activeEditor.project, form })
            } else {
              createProject.mutate(form)
            }
          }}
        />
      </main>
    )
  }

  if (activeEditor?.type === 'task' && selectedProject) {
    return (
      <main className="scrollbar-hide bg-background text-foreground h-dvh overflow-y-auto pb-[var(--chat-safe-padding)]">
        <TaskEditorScreen
          mode={activeEditor.mode}
          project={selectedProject}
          task={activeEditor.task}
          labels={projectLabels}
          isPending={createTask.isPending || updateTask.isPending}
          error={createTask.error ?? updateTask.error}
          onCancel={() => closeEditor('pop')}
          onUploadAttachment={(file) =>
            uploadAttachment(file).then(({ attachment }) => attachment)
          }
          onSubmit={(form) => {
            if (activeEditor.mode === 'edit' && activeEditor.task) {
              updateTask.mutate({
                task: activeEditor.task,
                form,
                labels: projectLabels,
              })
            } else {
              createTask.mutate({ project: selectedProject, form })
            }
          }}
        />
      </main>
    )
  }

  if (activeEditor?.type === 'task-detail' && selectedProject) {
    return (
      <main className="scrollbar-hide bg-background text-foreground h-dvh overflow-y-auto pb-[var(--chat-safe-padding)]">
        <TaskDetailScreen
          project={selectedProject}
          task={activeEditor.task}
          labels={projectLabels}
          isCommentPending={
            createComment.isPending ||
            updateComment.isPending ||
            deleteComment.isPending
          }
          onBack={() => closeEditor('pop')}
          onEdit={() => openTaskEditor('edit', activeEditor.task)}
          onPatchTask={(patch) =>
            patchTask.mutate({ task: activeEditor.task, patch })
          }
          onCreateComment={(content) =>
            createComment.mutate({ task: activeEditor.task, content })
          }
          onUpdateComment={(commentId, content) =>
            updateComment.mutate({
              task: activeEditor.task,
              commentId,
              content,
            })
          }
          onDeleteComment={(commentId) =>
            deleteComment.mutate({ task: activeEditor.task, commentId })
          }
          onDeleteTask={() =>
            setDeleteTarget({ type: 'task', task: activeEditor.task })
          }
        />
        {deleteDialog}
      </main>
    )
  }

  if (!selectedProject) {
    return (
      <ProjectDirectory
        projects={projects}
        isLoading={projectsQuery.isLoading}
        onCreateProject={() => openProjectEditor('create')}
        onSelectProject={(projectId) => openProject(projectId)}
      />
    )
  }

  return (
    <main className="bg-background text-foreground flex h-dvh overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col p-6 pb-0">
        {projectsQuery.isLoading ? (
          <div className="text-muted-foreground py-16 text-center text-sm">
            Loading tasks...
          </div>
        ) : selectedProject ? (
          <>
            <ProjectPageHeader
              selectedProject={selectedProject}
              onBackToProjects={() => {
                popMoldableNavigation()
                setSelectedProjectId(null)
              }}
              onEditProject={() => openProjectEditor('edit', selectedProject)}
              onDeleteProject={() =>
                setDeleteTarget({ type: 'project', project: selectedProject })
              }
            />

            <div className="min-h-0 min-w-0 flex-1">
              <ProjectTabs
                project={selectedProject}
                labels={projectLabels}
                activeTab={activeTab}
                onActiveTabChange={setActiveTab}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                filters={filters}
                onFiltersChange={setFilters}
                visibleTasks={filteredTasks}
                hasActiveFilters={hasActiveTaskFilters(filters)}
                onCreateTask={() => openTaskEditor('create')}
                onEditTask={(task) => openTaskDetail(task)}
                onPatchTask={(task, patch) => patchTask.mutate({ task, patch })}
                onDeleteTask={(task) => setDeleteTarget({ type: 'task', task })}
              />
            </div>
          </>
        ) : null}
      </div>
      {deleteDialog}
    </main>
  )
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Failed to read file'))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function DeleteAlertDialog({
  target,
  isDeleting,
  onOpenChange,
  onConfirm,
}: {
  target: DeleteTarget | null
  isDeleting: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const name =
    target?.type === 'project' ? target.project.name : target?.task.title
  const subject = target?.type === 'project' ? 'project' : 'task'

  return (
    <AlertDialog open={!!target} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {subject}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete{' '}
            {name ? `"${name}"` : `this ${subject}`}.
            {target?.type === 'project'
              ? ' All tasks in this project will also be deleted.'
              : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer" disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="cursor-pointer"
            variant="destructive"
            disabled={isDeleting}
            onClick={onConfirm}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
