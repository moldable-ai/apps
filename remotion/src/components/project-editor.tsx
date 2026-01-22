'use client'

import {
  Check,
  CheckCircle,
  Copy,
  Download,
  Film,
  FolderOpen,
  Settings,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@moldable-ai/ui'
import { useWorkspace } from '@moldable-ai/ui'
import { useProject, useRenderProject, useUpdateProject } from '@/lib/hooks'
import { UpdateProjectInput } from '@/lib/types'
import { ProjectSettingsFields } from './project-settings-fields'
import { RemotionPlayer } from './remotion-player'
import { PlayerRef } from '@remotion/player'

/**
 * Send a prompt to Moldable's chat input
 */
function sendToChatInput(text: string) {
  window.parent.postMessage({ type: 'moldable:set-chat-input', text }, '*')
}

/**
 * Set persistent chat instructions that will be included with every AI request
 * Pass empty string or undefined to clear instructions
 */
function setChatInstructions(text: string | undefined) {
  window.parent.postMessage(
    { type: 'moldable:set-chat-instructions', text: text ?? '' },
    '*',
  )
}

/**
 * Show a file in the native file manager (Finder on macOS)
 */
function showInFolder(path: string) {
  window.parent.postMessage({ type: 'moldable:show-in-folder', path }, '*')
}

type ProjectEditorProps = {
  projectId: string
}

export function ProjectEditor({ projectId }: ProjectEditorProps) {
  const { workspaceId } = useWorkspace()
  const { data: project, isLoading } = useProject(projectId)
  const updateProject = useUpdateProject()
  const renderProject = useRenderProject()
  const playerRef = useRef<PlayerRef | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Local state
  const [code, setCode] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showExportProgress, setShowExportProgress] = useState(false)
  const [showExportResult, setShowExportResult] = useState(false)
  const [exportedPath, setExportedPath] = useState('')
  const [exportedFileName, setExportedFileName] = useState('')
  const [exportError, setExportError] = useState<string | null>(null)

  // Settings state
  const [settingsWidth, setSettingsWidth] = useState('')
  const [settingsHeight, setSettingsHeight] = useState('')
  const [settingsFps, setSettingsFps] = useState('')
  const [settingsName, setSettingsName] = useState('')

  // Sync with project data
  useEffect(() => {
    if (project) {
      setCode(project.compositionCode)
    }
  }, [project])

  // Set chat instructions when project is selected so AI knows the context
  useEffect(() => {
    if (project && workspaceId) {
      setChatInstructions(
        `The user is editing a Remotion video project called "${project.name}" (ID: ${project.id}).

Project settings: ${project.width}×${project.height} at ${project.fps} fps, ${project.durationInFrames} frames (${(project.durationInFrames / project.fps).toFixed(1)}s duration).

The composition source code is at: ~/.moldable/workspaces/${workspaceId}/apps/remotion/data/projects/${project.id}/Composition.tsx

When the user asks to make changes to the video, edit the Composition.tsx file. The code uses Remotion's React-based video framework.`,
      )
    }

    // Clear instructions when leaving this project
    return () => {
      setChatInstructions(undefined)
    }
  }, [project, workspaceId])

  // Open settings dialog
  const openSettings = () => {
    if (project) {
      setSettingsName(project.name)
      setSettingsWidth(project.width.toString())
      setSettingsHeight(project.height.toString())
      setSettingsFps(project.fps.toString())
      setShowSettings(true)
    }
  }

  // Save settings
  const handleSaveSettings = async () => {
    if (!project) return

    const fps = parseInt(settingsFps) || project.fps

    const input: UpdateProjectInput = {
      name: settingsName.trim() || project.name,
      width: parseInt(settingsWidth) || project.width,
      height: parseInt(settingsHeight) || project.height,
      fps,
      autoDuration: true,
    }

    await updateProject.mutateAsync({ projectId: project.id, input })
    setShowSettings(false)
  }

  // Handle errors from the player - send to Moldable chat
  const handleError = useCallback(
    (error: string) => {
      sendToChatInput(
        `Fix this Remotion composition error in my "${project?.name || 'project'}" project:\n\n\`\`\`\n${error}\n\`\`\``,
      )
    },
    [project?.name],
  )

  // Export video
  const handleExport = async () => {
    if (!project) return

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    setShowExportProgress(true)
    setExportError(null)

    try {
      const result = await renderProject.mutateAsync({
        projectId: project.id,
        signal: abortControllerRef.current.signal,
      })
      setExportedPath(result.outputPath)
      setExportedFileName(result.fileName)
      setShowExportProgress(false)
      setShowExportResult(true)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // User cancelled - just close the dialog
        setShowExportProgress(false)
      } else if (!abortControllerRef.current?.signal.aborted) {
        // Only show error if not cancelled
        setExportError(error instanceof Error ? error.message : 'Export failed')
      }
    }
  }

  // Cancel export
  const handleCancelExport = () => {
    abortControllerRef.current?.abort()
    renderProject.reset()
    setShowExportProgress(false)
    setExportError(null)
  }

  // Copy path to clipboard
  const [copied, setCopied] = useState(false)

  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(exportedPath)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading project...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Project not found</div>
      </div>
    )
  }

  const duration = (project.durationInFrames / project.fps).toFixed(1)

  return (
    <div className="flex h-full flex-col">
      <div className="border-border flex h-[65px] items-center justify-between border-b p-4 pl-14">
        <div>
          <h1 className="text-foreground text-lg font-semibold leading-none">
            {project.name}
          </h1>
          <div className="text-muted-foreground mt-1.5 text-xs leading-none">
            {project.width}×{project.height} • {project.fps} fps • {duration}s
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={renderProject.isPending}
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export
          </Button>
          <Button variant="ghost" size="icon" onClick={openSettings}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content - Video Preview */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">
          {/* Video player */}
          <RemotionPlayer
            code={code}
            width={project.width}
            height={project.height}
            fps={project.fps}
            durationInFrames={project.durationInFrames}
            playerRef={playerRef}
            onError={handleError}
            className="overflow-hidden rounded-lg shadow-lg"
          />

          {/* Helper text */}
          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              Describe what you want to change and I&apos;ll update your video.
            </p>
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Project Settings</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <ProjectSettingsFields
              name={settingsName}
              setName={setSettingsName}
              width={settingsWidth}
              setWidth={setSettingsWidth}
              height={settingsHeight}
              setHeight={setSettingsHeight}
              fps={settingsFps}
              setFps={setSettingsFps}
              showAutoDurationInfo={true}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={updateProject.isPending}
            >
              {updateProject.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Progress Dialog */}
      <Dialog open={showExportProgress} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Film className="h-5 w-5" />
              Exporting Video
            </DialogTitle>
            <p className="text-muted-foreground text-sm">
              Rendering {project.durationInFrames} frames at {project.fps} fps
            </p>
          </DialogHeader>

          <div className="space-y-4 py-6">
            {/* Indeterminate progress bar */}
            <div className="space-y-2">
              <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
                <div className="bg-primary h-full w-1/3 animate-[indeterminate_1.5s_ease-in-out_infinite] rounded-full" />
              </div>
              <p className="text-muted-foreground text-center text-sm">
                This may take a minute or two...
              </p>
            </div>

            {exportError && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                <p className="text-sm font-medium text-red-500">
                  Export failed
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-xs text-red-400">
                  {exportError}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={handleCancelExport}
              className="w-full"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Success Dialog */}
      <Dialog open={showExportResult} onOpenChange={setShowExportResult}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Export Complete
            </DialogTitle>
            <p className="text-muted-foreground text-sm">
              Your video has been exported successfully
            </p>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-muted/50 space-y-2 rounded-lg p-4">
              <p className="text-foreground break-all text-sm font-medium">
                {exportedFileName}
              </p>
              <p className="text-muted-foreground break-all text-xs">
                {exportedPath}
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setShowExportResult(false)}
              className="sm:flex-1"
            >
              Close
            </Button>
            <Button
              variant="outline"
              onClick={() => showInFolder(exportedPath)}
              className="sm:flex-1"
            >
              <FolderOpen className="mr-1.5 h-4 w-4" />
              Show in Finder
            </Button>
            <Button onClick={handleCopyPath} className="sm:flex-1">
              {copied ? (
                <>
                  <Check className="mr-1.5 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-4 w-4" />
                  Copy Path
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSS for indeterminate animation */}
      <style>{`
        @keyframes indeterminate {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </div>
  )
}
