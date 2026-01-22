'use client'

import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  useWorkspace,
} from '@moldable-ai/ui'
import { PROJECT_COLORS, Project } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useTimeTracker } from './time-tracker-context'

interface NewProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewProjectDialog({
  open,
  onOpenChange,
}: NewProjectDialogProps) {
  const { fetchWithWorkspace } = useWorkspace()
  const { selectedProjectId, setSelectedProjectId, refreshProjects } =
    useTimeTracker()

  const [newProjectName, setNewProjectName] = useState('')
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0])

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setNewProjectName('')
      setSelectedColor(PROJECT_COLORS[0])
    }
  }, [open])

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
      onOpenChange(false)
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return
    createMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
  )
}
