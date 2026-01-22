'use client'

import { Clock, Film, MoreVertical, Plus, Trash2 } from 'lucide-react'
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
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
} from '@moldable-ai/ui'
import { useCreateProject, useDeleteProject, useProjects } from '@/lib/hooks'
import { CreateProjectInput } from '@/lib/types'
import { ProjectSettingsFields } from './project-settings-fields'

type ProjectListProps = {
  selectedProjectId: string | null
  onSelectProject: (projectId: string) => void
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDuration(frames: number, fps: number) {
  const seconds = frames / fps
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = (seconds % 60).toFixed(0)
  return `${minutes}:${remainingSeconds.padStart(2, '0')}`
}

export function ProjectList({
  selectedProjectId,
  onSelectProject,
}: ProjectListProps) {
  const { data: projects, isLoading } = useProjects()
  const createProject = useCreateProject()
  const deleteProject = useDeleteProject()

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectWidth, setNewProjectWidth] = useState('1920')
  const [newProjectHeight, setNewProjectHeight] = useState('1080')
  const [newProjectFps, setNewProjectFps] = useState('30')
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('')

  const selectedProjectToDelete = projects?.find(
    (p) => p.id === projectToDelete,
  )

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return

    const input: CreateProjectInput = {
      name: newProjectName.trim(),
      width: parseInt(newProjectWidth) || 1920,
      height: parseInt(newProjectHeight) || 1080,
      fps: parseInt(newProjectFps) || 30,
      durationInFrames: 300, // Default start, overwritten by Composition logic
      autoDuration: true,
    }

    const project = await createProject.mutateAsync(input)
    onSelectProject(project.id)
    setShowCreateDialog(false)
    setNewProjectName('')
  }

  const handleDeleteProject = async (projectId: string) => {
    await deleteProject.mutateAsync(projectId)
    if (selectedProjectId === projectId) {
      // Clear selection if deleted
      onSelectProject('')
    }
    setProjectToDelete(null)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-border flex h-[65px] items-center justify-between border-b p-4">
        <h2 className="text-foreground text-lg font-semibold">Projects</h2>
        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New
        </Button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {isLoading ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            Loading projects...
          </div>
        ) : projects?.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            No projects yet. Create your first video project!
          </div>
        ) : (
          projects?.map((project) => (
            <Card
              key={project.id}
              className={`cursor-pointer transition-all duration-200 ${
                selectedProjectId === project.id
                  ? 'bg-accent text-accent-foreground ring-primary/50 shadow-sm ring-1'
                  : 'hover:bg-muted/50 border-transparent shadow-none'
              }`}
              onClick={() => onSelectProject(project.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary rounded-md p-2">
                      <Film className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-foreground font-medium">
                        {project.name}
                      </h3>
                      <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                        <span>
                          {project.width}×{project.height}
                        </span>
                        <span>{project.fps} fps</span>
                        <span>
                          {formatDuration(
                            project.durationInFrames,
                            project.fps,
                          )}
                        </span>
                      </div>
                      <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        {formatDate(project.updatedAt)}
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          setProjectToDelete(project.id)
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <ProjectSettingsFields
              name={newProjectName}
              setName={setNewProjectName}
              width={newProjectWidth}
              setWidth={setNewProjectWidth}
              height={newProjectHeight}
              setHeight={setNewProjectHeight}
              fps={newProjectFps}
              setFps={setNewProjectFps}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim() || createProject.isPending}
            >
              {createProject.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!projectToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setProjectToDelete(null)
            setDeleteConfirmationName('')
          }
        }}
      >
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-muted-foreground pt-2 text-sm">
                This action cannot be undone. This will permanently delete the
                project{' '}
                <span className="text-foreground font-bold">
                  &quot;{selectedProjectToDelete?.name}&quot;
                </span>{' '}
                and all associated video data.
                <div className="text-foreground mt-4 space-y-2">
                  <Label htmlFor="project-name-confirm">
                    Type the project name to confirm:
                  </Label>
                  <Input
                    id="project-name-confirm"
                    value={deleteConfirmationName}
                    onChange={(e) => setDeleteConfirmationName(e.target.value)}
                    placeholder={selectedProjectToDelete?.name}
                    autoFocus
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-opacity disabled:opacity-50"
              disabled={
                deleteConfirmationName !== selectedProjectToDelete?.name
              }
              onClick={() =>
                projectToDelete && handleDeleteProject(projectToDelete)
              }
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
