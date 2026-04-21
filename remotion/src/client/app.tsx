import { Film, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@moldable-ai/ui'
import { ProjectEditor } from '@/components/project-editor'
import { ProjectList } from '@/components/project-list'

export default function App() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  )
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  return (
    <div className="bg-background text-foreground flex h-screen overflow-hidden">
      <div
        className={`border-border flex-shrink-0 border-r transition-[width,opacity] duration-300 ease-in-out ${
          isSidebarOpen
            ? 'w-80 opacity-100'
            : 'w-0 overflow-hidden border-r-0 opacity-0'
        }`}
      >
        <div className="h-full w-80">
          <ProjectList
            selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
          />
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div className="absolute left-4 top-[17px] z-50">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-8 w-8 cursor-pointer"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? 'Hide projects list' : 'Show projects list'}
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeftOpen className="h-5 w-5" />
            )}
          </Button>
        </div>

        {selectedProjectId ? (
          <ProjectEditor projectId={selectedProjectId} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="bg-muted/50 rounded-full p-6">
              <Film className="text-muted-foreground h-12 w-12" />
            </div>
            <h2 className="text-foreground mt-4 text-xl font-semibold">
              Select a Project
            </h2>
            <p className="text-muted-foreground mt-2 max-w-md text-center">
              Choose a project from the sidebar or create a new one to start
              editing your Remotion compositions.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
