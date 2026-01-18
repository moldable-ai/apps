'use client'

import { useMutation } from '@tanstack/react-query'
import { Archive, ArchiveRestore, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  useWorkspace,
} from '@moldable-ai/ui'
import { PROJECT_COLORS, Project } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useTimeTracker } from './time-tracker-context'

export function ProjectManager() {
  const { fetchWithWorkspace } = useWorkspace()
  const {
    projects,
    activeProjects,
    selectedProjectId,
    setSelectedProjectId,
    refreshProjects,
  } = useTimeTracker()

  const [isOpen, setIsOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0])
  const [showArchived, setShowArchived] = useState(false)
  const [archivingProject, setArchivingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithWorkspace('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName, color: selectedColor }),
      })
      return res.json() as Promise<Project>
    },
    onSuccess: (newProject) => {
      // If no project is currently selected, select the newly created one
      if (!selectedProjectId) {
        setSelectedProjectId(newProject.id)
      }
      refreshProjects()
      setNewProjectName('')
      setIsOpen(false)
    },
  })

  // Archive/Unarchive mutation
  const archiveMutation = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const res = await fetchWithWorkspace(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived }),
      })
      return res.json()
    },
    onSuccess: (_, { id, archived }) => {
      // If we just archived the currently selected project, select the next available one
      if (archived && selectedProjectId === id) {
        // Find remaining active projects (excluding the one being archived)
        const remainingActive = activeProjects.filter((p) => p.id !== id)
        if (remainingActive.length > 0) {
          setSelectedProjectId(remainingActive[0].id)
        } else {
          setSelectedProjectId(null)
        }
      }
      refreshProjects()
      setArchivingProject(null)
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithWorkspace(`/api/projects/${id}`, {
        method: 'DELETE',
      })
      return res.json()
    },
    onSuccess: (_, id) => {
      // If we just deleted the currently selected project, select the next available one
      if (selectedProjectId === id) {
        // Find remaining active projects (excluding the one being deleted)
        const remainingActive = activeProjects.filter((p) => p.id !== id)
        if (remainingActive.length > 0) {
          setSelectedProjectId(remainingActive[0].id)
        } else {
          setSelectedProjectId(null)
        }
      }
      refreshProjects()
      setDeletingProject(null)
    },
  })

  const handleArchive = () => {
    if (archivingProject) {
      archiveMutation.mutate({ id: archivingProject.id, archived: true })
    }
  }

  const handleDelete = () => {
    if (deletingProject) {
      deleteMutation.mutate(deletingProject.id)
    }
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return
    createMutation.mutate()
  }

  const archivedProjects = projects.filter((p) => p.archived)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Projects</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="size-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                placeholder="Project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                autoFocus
              />
              <div className="space-y-2">
                <label className="text-muted-foreground text-sm">Color</label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        'size-8 rounded-full transition-all',
                        selectedColor === color
                          ? 'ring-ring ring-2 ring-offset-2'
                          : 'hover:scale-110',
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={!newProjectName.trim() || createMutation.isPending}
              >
                Create Project
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active projects */}
      <div className="space-y-2">
        {activeProjects.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No projects yet. Create one to start tracking time.
          </p>
        ) : (
          activeProjects.map((project) => (
            <div
              key={project.id}
              className="border-border hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="size-4 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <span className="font-medium">{project.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground size-8"
                  onClick={() => setArchivingProject(project)}
                >
                  <Archive className="size-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Archived projects */}
      {archivedProjects.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="text-muted-foreground hover:text-foreground cursor-pointer text-sm"
          >
            {showArchived ? 'Hide' : 'Show'} archived ({archivedProjects.length}
            )
          </button>
          {showArchived &&
            archivedProjects.map((project) => (
              <div
                key={project.id}
                className="border-border flex items-center justify-between rounded-lg border p-3 opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="size-4 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="font-medium">{project.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground size-8"
                    onClick={() =>
                      archiveMutation.mutate({
                        id: project.id,
                        archived: false,
                      })
                    }
                  >
                    <ArchiveRestore className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive size-8"
                    onClick={() => setDeletingProject(project)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Archive Confirmation Dialog */}
      <AlertDialog
        open={!!archivingProject}
        onOpenChange={(open) => !open && setArchivingProject(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive project?</AlertDialogTitle>
            <AlertDialogDescription>
              Archiving &quot;{archivingProject?.name}&quot; will hide it from
              the project list. You can restore it later from the archived
              section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={archiveMutation.isPending}
            >
              {archiveMutation.isPending ? 'Archiving...' : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingProject}
        onOpenChange={(open) => !open && setDeletingProject(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deletingProject?.name}&quot;
              and all its time entries. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
