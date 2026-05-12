import { BarChart3, GripVertical, Plus, X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Input,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from '@moldable-ai/ui'
import { displayDashboardTitle } from '../lib/dashboards'
import type { ConnectionSummary, Dashboard } from '../../shared/types'
import { QuietState } from './shared'
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

export function DashboardBrowser({
  activeConnection,
  dashboards,
  activeDashboardId,
  loading,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onReorder,
}: {
  activeConnection: ConnectionSummary | null
  dashboards: Dashboard[]
  activeDashboardId: string | null
  loading: boolean
  onSelect: (dashboardId: string) => void
  onNew: () => void
  onDelete: (dashboardId: string) => void
  onRename: (dashboardId: string, title: string) => void
  onReorder: (dashboards: Dashboard[]) => void
}) {
  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="border-border/60 bg-background flex h-8 shrink-0 items-center justify-between border-b pb-2">
        <span className="text-muted-foreground text-xs font-medium">
          Dashboards
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground cursor-pointer"
              onClick={onNew}
              disabled={!activeConnection}
              aria-label="New dashboard"
            >
              <Plus className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">New dashboard</TooltipContent>
        </Tooltip>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-[calc(var(--chat-safe-padding,0px)+1rem)] pt-2">
        <DashboardBrowserContent
          activeConnection={activeConnection}
          dashboards={dashboards}
          activeDashboardId={activeDashboardId}
          loading={loading}
          onSelect={onSelect}
          onDelete={onDelete}
          onRename={onRename}
          onReorder={onReorder}
        />
      </div>
    </section>
  )
}

function DashboardBrowserContent({
  activeConnection,
  dashboards,
  activeDashboardId,
  loading,
  onSelect,
  onDelete,
  onRename,
  onReorder,
}: {
  activeConnection: ConnectionSummary | null
  dashboards: Dashboard[]
  activeDashboardId: string | null
  loading: boolean
  onSelect: (dashboardId: string) => void
  onDelete: (dashboardId: string) => void
  onRename: (dashboardId: string, title: string) => void
  onReorder: (dashboards: Dashboard[]) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = dashboards.findIndex(
      (dashboard) => dashboard.id === active.id,
    )
    const newIndex = dashboards.findIndex(
      (dashboard) => dashboard.id === over.id,
    )
    if (oldIndex === -1 || newIndex === -1) return

    onReorder(arrayMove(dashboards, oldIndex, newIndex))
  }

  if (!activeConnection) {
    return <QuietState title="Choose a connection" />
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 rounded-lg" />
        <Skeleton className="h-8 rounded-lg" />
        <Skeleton className="h-8 rounded-lg" />
      </div>
    )
  }

  if (dashboards.length === 0) {
    return <QuietState title="No dashboards" />
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={dashboards.map((dashboard) => dashboard.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="overflow-hidden rounded-lg">
          {dashboards.map((dashboard, index) => (
            <SortableDashboardRow
              key={dashboard.id}
              dashboard={dashboard}
              active={dashboard.id === activeDashboardId}
              first={index === 0}
              onSelect={onSelect}
              onDelete={onDelete}
              onRename={onRename}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableDashboardRow({
  dashboard,
  active,
  first,
  onSelect,
  onDelete,
  onRename,
}: {
  dashboard: Dashboard
  active: boolean
  first: boolean
  onSelect: (dashboardId: string) => void
  onDelete: (dashboardId: string) => void
  onRename: (dashboardId: string, title: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dashboard.id })
  const style = {
    transform: CSS.Transform.toString(
      transform && { ...transform, scaleX: 1, scaleY: 1 },
    ),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group/dashboard grid h-7 min-w-0 grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-1.5 rounded-md px-1.5 text-xs transition-colors',
        active
          ? 'bg-muted/70 text-foreground'
          : 'text-muted-foreground hover:bg-muted/45 hover:text-foreground',
        !first && 'mt-0.5',
        isDragging && 'bg-muted z-50 shadow-md',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-muted-foreground/70 hover:text-foreground flex size-4 cursor-grab items-center justify-center rounded-sm opacity-35 transition-opacity focus:opacity-100 group-hover/dashboard:opacity-100"
        aria-label={`Reorder ${displayDashboardTitle(dashboard)}`}
      >
        <GripVertical className="size-3" />
      </button>
      <BarChart3 className="text-muted-foreground size-3.5" />
      {active ? (
        <Input
          className="h-6 min-w-0 border-none !bg-transparent px-0 py-0 text-xs font-medium shadow-none focus-visible:!bg-transparent focus-visible:ring-0"
          value={dashboard.title}
          placeholder="Dashboard"
          onChange={(event) => onRename(dashboard.id, event.target.value)}
          onFocus={() => onSelect(dashboard.id)}
        />
      ) : (
        <button
          type="button"
          className="min-w-0 cursor-pointer truncate text-left font-medium"
          onClick={() => onSelect(dashboard.id)}
        >
          {displayDashboardTitle(dashboard)}
        </button>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            className="text-muted-foreground hover:bg-background/70 hover:text-foreground flex size-5 cursor-pointer items-center justify-center rounded-sm opacity-0 transition-opacity focus:opacity-100 group-hover/dashboard:opacity-100"
            aria-label={`Delete ${dashboard.title || 'dashboard'}`}
          >
            <X className="size-3" />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete dashboard?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the dashboard and every chart on it from this
              connection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="cursor-pointer"
              onClick={() => onDelete(dashboard.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
