import { Clock, Film } from 'lucide-react'
import { useProjects } from '@/lib/hooks'

function formatDuration(frames: number, fps: number) {
  const seconds = frames / fps
  if (seconds < 60) {
    return `${seconds.toFixed(0)}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = (seconds % 60).toFixed(0)
  return `${minutes}:${remainingSeconds.padStart(2, '0')}`
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function Widget() {
  const { data: projects, isLoading } = useProjects()
  const recentProjects = projects?.slice(0, 3) ?? []

  return (
    <div className="p-4">
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-muted/30 animate-pulse rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="bg-muted h-4 w-24 rounded" />
                <div className="bg-muted h-3 w-12 rounded" />
              </div>
            </div>
          ))
        ) : recentProjects.length === 0 ? (
          <div className="text-muted-foreground py-6 text-center text-sm">
            <Film className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>No video projects yet</p>
            <p className="mt-1 text-xs">Create one to get started!</p>
          </div>
        ) : (
          recentProjects.map((project) => (
            <div
              key={project.id}
              className="hover:bg-muted/50 rounded-lg p-3 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-foreground text-sm font-medium">
                    {project.name}
                  </h3>
                  <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
                    <span>
                      {project.width}×{project.height}
                    </span>
                    <span>•</span>
                    <span>
                      {formatDuration(project.durationInFrames, project.fps)}
                    </span>
                  </div>
                </div>
                <div className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" />
                  {formatDate(project.updatedAt)}
                </div>
              </div>
            </div>
          ))
        )}

        {!isLoading && recentProjects.length > 0 && (
          <div className="text-muted-foreground pt-2 text-center text-xs">
            {projects?.length} project{projects?.length !== 1 ? 's' : ''} total
          </div>
        )}
      </div>
    </div>
  )
}
