import { Input, Label } from '@moldable-ai/ui'

interface ProjectSettingsFieldsProps {
  name: string
  setName: (name: string) => void
  width: string
  setWidth: (width: string) => void
  height: string
  setHeight: (height: string) => void
  fps: string
  setFps: (fps: string) => void
  showAutoDurationInfo?: boolean
}

export function ProjectSettingsFields({
  name,
  setName,
  width,
  setWidth,
  height,
  setHeight,
  fps,
  setFps,
  showAutoDurationInfo = false,
}: ProjectSettingsFieldsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="project-name" className="text-sm font-medium">
          Name
        </Label>
        <Input
          id="project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Creative Video"
          className="bg-muted/30 focus-visible:ring-primary h-11 border-none transition-all"
        />
      </div>

      <div className="space-y-4">
        <h4 className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
          Composition Settings
        </h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label
              htmlFor="width"
              className="text-muted-foreground text-[10px] uppercase tracking-wider"
            >
              Width
            </Label>
            <div className="relative">
              <Input
                id="width"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="bg-muted/30 focus-visible:ring-primary border-none pr-7"
              />
              <span className="text-muted-foreground pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium opacity-50">
                PX
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="height"
              className="text-muted-foreground text-[10px] uppercase tracking-wider"
            >
              Height
            </Label>
            <div className="relative">
              <Input
                id="height"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="bg-muted/30 focus-visible:ring-primary border-none pr-7"
              />
              <span className="text-muted-foreground pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium opacity-50">
                PX
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="fps"
              className="text-muted-foreground text-[10px] uppercase tracking-wider"
            >
              FPS
            </Label>
            <div className="relative">
              <Input
                id="fps"
                value={fps}
                onChange={(e) => setFps(e.target.value)}
                className="bg-muted/30 focus-visible:ring-primary border-none pr-9"
              />
              <span className="text-muted-foreground pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium opacity-50">
                RATE
              </span>
            </div>
          </div>
        </div>
      </div>

      {showAutoDurationInfo && (
        <div className="bg-primary/5 border-primary/10 rounded-lg border p-3 italic">
          <p className="text-primary/80 text-[11px] leading-snug">
            Video duration is automatically managed by scenes in your{' '}
            <code className="font-bold">Composition.tsx</code>.
          </p>
        </div>
      )}
    </div>
  )
}
