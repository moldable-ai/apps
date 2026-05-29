import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChartArea,
  ChartBar,
  ChartBarStacked,
  ChartColumn,
  ChartLine,
  ChartPie,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock3,
  Edit3,
  GripVertical,
  Hash,
  Info,
  ListStart,
  Loader2,
  type LucideIcon,
  Pipette,
  Plus,
  RefreshCw,
  RotateCcw,
  Rows3,
  Save,
  ScatterChart as ScatterChartIcon,
  SlidersHorizontal,
  Sparkles,
  Table2,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import {
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Button,
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
  useWorkspace,
} from '@moldable-ai/ui'
import { apiJson } from '../lib/api'
import {
  createDashboardChart,
  createDefaultVisibleRange,
  displayChartTitle,
  displayDashboardTitle,
} from '../lib/dashboards'
import { CONNECTION_COLORS } from '../lib/sql'
import type {
  ConnectionSummary,
  Dashboard,
  DashboardChart,
  DashboardChartComparisonMode,
  DashboardChartSeries,
  DashboardChartSize,
  DashboardChartType,
  DashboardChartVisibleRange,
  DashboardChartVisibleRangeMode,
  QueryResultResponse,
} from '../../shared/types'
import { DialogField, EmptyPane } from './shared'
import {
  DndContext,
  type DragEndEvent,
  type DragMoveEvent,
  DragOverlay,
  type DragStartEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'

const SqlEditor = lazy(() =>
  import('./sql-editor').then((module) => ({ default: module.SqlEditor })),
)

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]
const AXIS_LINE = { stroke: 'var(--border)' }
const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 11 }
const EMPTY_ROWS: Record<string, unknown>[] = []
const EMPTY_COLUMNS: string[] = []
const DEFAULT_TABLE_PAGE_SIZE = 25
const CHART_TYPE_TILES: ChartTypeTile[] = [
  { value: 'bar', label: 'Bar', icon: ChartColumn },
  { value: 'line', label: 'Line', icon: ChartLine },
  { value: 'composed', label: 'Combo', icon: BarChart3 },
  { value: 'area', label: 'Area', icon: ChartArea },
  { value: 'pie', label: 'Pie', icon: ChartPie },
  { value: 'scatter', label: 'Scatter', icon: ScatterChartIcon },
  { value: 'number', label: 'Big number', icon: Hash },
  { value: 'table', label: 'Table', icon: Table2 },
  { value: 'stacked-bar', label: 'Stacked', icon: ChartBarStacked },
  { value: 'horizontal-bar', label: 'Horizontal', icon: ChartBar },
  { value: 'donut', label: 'Donut', icon: CircleDot },
  { value: 'bubble', label: 'Bubble', icon: CircleDot },
]
const CHART_SIZE_TILES: ChartSizeTile[] = [
  {
    value: 'sm',
    label: 'Small',
    description: 'Compact metric or simple trend',
    previewClass: 'col-span-2 row-span-2',
  },
  {
    value: 'md',
    label: 'Medium',
    description: 'Default dashboard card',
    previewClass: 'col-span-3 row-span-3',
  },
  {
    value: 'lg',
    label: 'Large',
    description: 'Wide, taller analysis panel',
    previewClass: 'col-span-4 row-span-4',
  },
  {
    value: 'xl',
    label: 'Full width',
    description: 'Spans every dashboard column',
    previewClass: 'col-span-6 row-span-4',
  },
]
const VISIBLE_RANGE_MODE_TILES: VisibleRangeModeTile[] = [
  { value: 'all', label: 'All rows', icon: Rows3 },
  { value: 'latest', label: 'Latest', icon: Clock3 },
  { value: 'first', label: 'First', icon: ListStart },
  { value: 'custom', label: 'Custom', icon: SlidersHorizontal },
]

interface ChartLegendItem {
  id: string
  name: string
  color: string
}

interface ChartAxesFrame {
  xTicks: string[]
  yTicks: string[]
}

type ChartGridOrientation = 'horizontal' | 'vertical' | 'both'

interface ChartViewportRange {
  start: number
  end: number
}

interface ChartTypeTile {
  value: DashboardChartType
  label: string
  icon: LucideIcon
}

interface ChartSizeTile {
  value: DashboardChartSize
  label: string
  description: string
  previewClass: string
}

interface VisibleRangeModeTile {
  value: DashboardChartVisibleRangeMode
  label: string
  icon: LucideIcon
}

interface DragHandleProps {
  attributes: DraggableAttributes
  listeners?: DraggableSyntheticListeners
}

type DashboardDropIntent =
  | {
      kind: 'row'
      index: number
      top: number
    }
  | {
      kind: 'side'
      targetId: string
      side: 'left' | 'right'
    }

export function DashboardWorkspace({
  activeConnection,
  dashboard,
  loading,
  onCreateDashboard,
  onRenameDashboard,
  onUpdateDashboardDescription,
  onAddChart,
  onUpdateChart,
  onDeleteChart,
  onReorderCharts,
}: {
  activeConnection: ConnectionSummary | null
  dashboard: Dashboard | null
  loading: boolean
  onCreateDashboard: () => void
  onRenameDashboard: (title: string) => void
  onUpdateDashboardDescription: (description: string) => void
  onAddChart: (chart: DashboardChart) => void
  onUpdateChart: (chart: DashboardChart) => void
  onDeleteChart: (chartId: string) => void
  onReorderCharts: (charts: DashboardChart[]) => void
}) {
  const [editingChart, setEditingChart] = useState<DashboardChart | null>(null)
  const [creatingChart, setCreatingChart] = useState(false)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [activeDragSize, setActiveDragSize] = useState<{
    width: number
    height: number
  } | null>(null)
  const [dropIntent, setDropIntent] = useState<DashboardDropIntent | null>(null)
  const chartGridRef = useRef<HTMLDivElement | null>(null)
  const dragCenterRef = useRef<{ x: number; y: number } | null>(null)
  const dropIntentRef = useRef<DashboardDropIntent | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
  const visibleCharts = dashboard?.charts ?? []
  const activeDragChart = activeDragId
    ? visibleCharts.find((chart) => chart.id === activeDragId)
    : null

  useEffect(() => {
    if (!editingChart) return

    const updatedChart = dashboard?.charts.find(
      (chart) => chart.id === editingChart.id,
    )
    if (!updatedChart) {
      setEditingChart(null)
      return
    }

    if (updatedChart.updatedAt !== editingChart.updatedAt) {
      setEditingChart(updatedChart)
    }
  }, [dashboard?.charts, editingChart])

  function handleChartDragStart(event: DragStartEvent) {
    const chartId = String(event.active.id)
    const rect = event.active.rect.current.initial
    setActiveDragId(chartId)
    setActiveDragSize(rect ? { width: rect.width, height: rect.height } : null)
    dragCenterRef.current = rectCenter(rect)
    setDashboardDropIntent(null)
  }

  function handleChartDragMove(event: DragMoveEvent) {
    const dragCenter = rectCenter(
      event.active.rect.current.translated ?? event.active.rect.current.initial,
    )
    dragCenterRef.current = dragCenter
    setDashboardDropIntent(
      findDashboardDropIntent(
        chartGridRef.current,
        dashboard?.charts ?? [],
        String(event.active.id),
        dragCenter,
      ),
    )
  }

  function clearChartDragState() {
    setActiveDragId(null)
    setActiveDragSize(null)
    setDashboardDropIntent(null)
    dragCenterRef.current = null
  }

  function setDashboardDropIntent(intent: DashboardDropIntent | null) {
    dropIntentRef.current = intent
    setDropIntent(intent)
  }

  function handleChartDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!dashboard) {
      clearChartDragState()
      return
    }

    const activeId = String(active.id)
    const overId = over ? String(over.id) : null

    const oldIndex = dashboard.charts.findIndex(
      (chart) => chart.id === activeId,
    )
    if (oldIndex === -1) {
      clearChartDragState()
      return
    }

    const intent =
      dropIntentRef.current ??
      findDashboardDropIntent(
        chartGridRef.current,
        dashboard.charts,
        activeId,
        dragCenterRef.current ??
          rectCenter(
            active.rect.current.translated ?? active.rect.current.initial,
          ),
      )
    if (intent?.kind === 'row') {
      onReorderCharts(
        moveChartToFullWidthSlot(dashboard.charts, oldIndex, intent.index),
      )
      clearChartDragState()
      return
    }

    if (intent?.kind === 'side') {
      onReorderCharts(
        moveChartBesideTarget(
          dashboard.charts,
          oldIndex,
          intent.targetId,
          intent.side,
        ),
      )
      clearChartDragState()
      return
    }

    if (!overId || activeId === overId) {
      clearChartDragState()
      return
    }

    const newIndex = dashboard.charts.findIndex((chart) => chart.id === overId)
    if (newIndex === -1) {
      clearChartDragState()
      return
    }

    onReorderCharts(
      moveChartIntoExistingSlot(dashboard.charts, oldIndex, newIndex),
    )
    clearChartDragState()
  }

  if (!activeConnection) {
    return (
      <section className="bg-background h-full min-h-0">
        <EmptyPane
          title="Open a connection"
          description="Dashboards are scoped to the selected database connection."
        />
      </section>
    )
  }

  if (loading) {
    return (
      <section className="bg-background text-muted-foreground flex h-full min-h-0 items-center justify-center text-sm">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading dashboards
      </section>
    )
  }

  if (!dashboard) {
    return (
      <section className="bg-background h-full min-h-0">
        <EmptyPane
          title="No dashboard selected"
          description="Create a dashboard to start collecting charts for this connection."
          action={
            <Button
              type="button"
              size="sm"
              className="cursor-pointer gap-2"
              onClick={onCreateDashboard}
            >
              <Plus className="size-4" />
              New dashboard
            </Button>
          }
        />
      </section>
    )
  }

  return (
    <section className="bg-background h-full min-h-0 overflow-hidden">
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-border/70 bg-background z-10 flex h-9 shrink-0 items-center justify-between gap-3 border-b pl-3 pr-2">
          <div className="min-w-0 flex-1">
            <Input
              className="h-6 min-w-0 border-none !bg-transparent px-0 py-0 text-xs font-semibold leading-none shadow-none focus-visible:!bg-transparent focus-visible:ring-0 md:text-xs"
              value={dashboard.title}
              placeholder="Dashboard"
              onChange={(event) => onRenameDashboard(event.target.value)}
            />
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <ToolbarTooltip label="Add chart">
              <Button
                type="button"
                size="icon-xs"
                className="cursor-pointer"
                onClick={() => setCreatingChart(true)}
                aria-label="Add chart"
              >
                <Plus className="size-3.5" />
              </Button>
            </ToolbarTooltip>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 pb-[calc(var(--chat-safe-padding,0px)+1rem)]">
          <Textarea
            className="text-muted-foreground mb-3 min-h-9 resize-none border-none !bg-transparent px-0 py-0 text-xs shadow-none focus-visible:!bg-transparent focus-visible:ring-0"
            value={dashboard.description}
            placeholder="Add dashboard notes"
            onChange={(event) =>
              onUpdateDashboardDescription(event.target.value)
            }
          />

          {dashboard.charts.length === 0 ? (
            <div className="flex h-[calc(100%-3rem)] min-h-80 items-center justify-center">
              <EmptyPane
                title="No charts yet"
                description="Add charts backed by read-only SQL queries. Each chart can use its own axes, series, labels, and display type."
                action={
                  <Button
                    type="button"
                    size="sm"
                    className="cursor-pointer gap-2"
                    onClick={() => setCreatingChart(true)}
                  >
                    <Plus className="size-4" />
                    Add chart
                  </Button>
                }
              />
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleChartDragStart}
              onDragMove={handleChartDragMove}
              onDragEnd={handleChartDragEnd}
              onDragCancel={clearChartDragState}
            >
              <SortableContext
                items={visibleCharts.map((chart) => chart.id)}
                strategy={rectSortingStrategy}
              >
                <div
                  ref={chartGridRef}
                  className="relative grid auto-rows-[7rem] grid-cols-12 gap-3 [grid-auto-flow:dense]"
                >
                  <DashboardDropIndicator intent={dropIntent} />
                  {visibleCharts.map((chart) => (
                    <SortableDashboardChartCard
                      key={chart.id}
                      connectionId={activeConnection.id}
                      chart={chart}
                      dropIntent={dropIntent}
                      onEdit={() => setEditingChart(chart)}
                      onUpdate={(updatedChart) => onUpdateChart(updatedChart)}
                      onDelete={() => onDeleteChart(chart.id)}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay adjustScale={false}>
                {activeDragChart ? (
                  <DashboardChartDragPreview
                    chart={activeDragChart}
                    size={activeDragSize}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>

      {creatingChart ? (
        <ChartEditorDialog
          title="New chart"
          connectionId={activeConnection.id}
          dashboard={dashboard}
          mode="create"
          chart={createDashboardChart(dashboard.charts.length + 1, {
            title: '',
            sql: '',
          })}
          onClose={() => setCreatingChart(false)}
          onSave={(chart) => {
            onAddChart(chart)
            setCreatingChart(false)
          }}
        />
      ) : null}

      {editingChart ? (
        <ChartEditorDialog
          title="Edit chart"
          connectionId={activeConnection.id}
          dashboard={dashboard}
          mode="edit"
          chart={editingChart}
          onClose={() => setEditingChart(null)}
          onSave={(chart) => {
            onUpdateChart(chart)
            setEditingChart(null)
          }}
        />
      ) : null}
    </section>
  )
}

function SortableDashboardChartCard({
  connectionId,
  chart,
  dropIntent,
  onEdit,
  onUpdate,
  onDelete,
}: {
  connectionId: string
  chart: DashboardChart
  dropIntent: DashboardDropIntent | null
  onEdit: () => void
  onUpdate: (chart: DashboardChart) => void
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chart.id })
  const style = {
    transform:
      !isDragging && transform
        ? CSS.Transform.toString({ ...transform, scaleX: 1, scaleY: 1 })
        : undefined,
    transition,
  }

  return (
    <DashboardChartCard
      nodeRef={setNodeRef}
      style={style}
      connectionId={connectionId}
      chart={chart}
      dragging={isDragging}
      dropIntent={dropIntent}
      dragHandle={{ attributes, listeners }}
      onEdit={onEdit}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  )
}

function DashboardChartDragPreview({
  chart,
  size,
}: {
  chart: DashboardChart
  size: { width: number; height: number } | null
}) {
  return (
    <article
      className="border-primary/45 bg-card text-card-foreground ring-primary/20 pointer-events-none overflow-hidden rounded-lg border shadow-2xl ring-1"
      style={{
        width: size?.width,
        height: size?.height,
      }}
    >
      <div className="border-border/60 flex h-10 items-center gap-2 border-b px-3">
        <GripVertical className="text-primary size-3.5 shrink-0" />
        <h2 className="truncate text-xs font-semibold">
          {displayChartTitle(chart)}
        </h2>
      </div>
      <div className="text-muted-foreground flex h-[calc(100%-2.5rem)] items-center justify-center px-4 text-center text-xs">
        Drop onto a chart to use that slot, or between rows for a full-width
        slot.
      </div>
    </article>
  )
}

function DashboardDropIndicator({
  intent,
}: {
  intent: DashboardDropIntent | null
}) {
  if (intent?.kind !== 'row') return null

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-50 flex -translate-y-1/2 items-center gap-2"
      style={{ top: intent.top }}
    >
      <span className="bg-primary/70 h-px flex-1 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]" />
      <span className="border-primary/40 bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full border shadow-lg">
        <Plus className="size-3.5" />
      </span>
      <span className="bg-primary/70 h-px flex-1 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]" />
    </div>
  )
}

function DashboardChartCard({
  nodeRef,
  style,
  connectionId,
  chart,
  dropIntent,
  onEdit,
  onUpdate,
  onDelete,
  dragHandle,
  dragging,
}: {
  nodeRef?: (node: HTMLElement | null) => void
  style?: CSSProperties
  connectionId: string
  chart: DashboardChart
  dropIntent: DashboardDropIntent | null
  onEdit: () => void
  onUpdate: (chart: DashboardChart) => void
  onDelete: () => void
  dragHandle?: DragHandleProps
  dragging: boolean
}) {
  const { fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const chartQuery = useQuery({
    queryKey: [
      'db-browser-dashboard-chart',
      connectionId,
      chart.id,
      chart.sql,
      chart.maxRows,
    ],
    enabled: Boolean(connectionId && chart.sql.trim()),
    queryFn: async () => {
      return apiJson<QueryResultResponse>(
        fetchWithWorkspace,
        `/api/connections/${connectionId}/dashboard-chart-query`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: chart.sql, maxRows: chart.maxRows }),
        },
      )
    },
  })

  return (
    <article
      ref={nodeRef}
      data-dashboard-chart-id={chart.id}
      style={style}
      className={cn(
        'group/card border-border/70 bg-card text-card-foreground hover:border-border relative flex h-full min-h-0 flex-col rounded-lg border transition-[border-color,box-shadow,opacity,transform]',
        chartSizeClass(chart.size),
        dropIntent?.kind === 'side' &&
          dropIntent.targetId === chart.id &&
          'border-primary/60 shadow-[0_0_0_1px_var(--primary)]',
        dragging && 'opacity-50',
      )}
    >
      {dropIntent?.kind === 'side' && dropIntent.targetId === chart.id ? (
        <div
          className={cn(
            'bg-primary pointer-events-none absolute inset-y-3 z-30 w-1 rounded-full shadow-[0_0_0_4px_rgba(255,255,255,0.04)]',
            dropIntent.side === 'left' ? 'left-2' : 'right-2',
          )}
        />
      ) : null}
      <div className="pointer-events-none absolute right-2 top-4 z-40 opacity-0 transition-opacity duration-150 group-focus-within/card:opacity-100 group-hover/card:opacity-100">
        <div className="border-border/60 bg-background/85 pointer-events-none flex shrink-0 items-center gap-1 rounded-md border p-0.5 shadow-sm backdrop-blur group-focus-within/card:pointer-events-auto group-hover/card:pointer-events-auto">
          <ToolbarTooltip label="Drag to reorder">
            <button
              type="button"
              className="text-muted-foreground/70 hover:bg-muted hover:text-foreground flex size-6 shrink-0 cursor-grab items-center justify-center rounded-md transition-colors active:cursor-grabbing"
              aria-label="Drag to reorder chart"
              {...dragHandle?.attributes}
              {...dragHandle?.listeners}
            >
              <GripVertical className="size-3.5" />
            </button>
          </ToolbarTooltip>
          <ToolbarTooltip label="Refresh chart">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground cursor-pointer"
              onClick={() =>
                void queryClient.invalidateQueries({
                  queryKey: [
                    'db-browser-dashboard-chart',
                    connectionId,
                    chart.id,
                  ],
                })
              }
              disabled={!chart.sql.trim() || chartQuery.isFetching}
              aria-label="Refresh chart"
            >
              <RefreshCw
                className={
                  chartQuery.isFetching ? 'size-3.5 animate-spin' : 'size-3.5'
                }
              />
            </Button>
          </ToolbarTooltip>
          <ToolbarTooltip label="Edit chart">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground cursor-pointer"
              onClick={onEdit}
              aria-label="Edit chart"
            >
              <Edit3 className="size-3.5" />
            </Button>
          </ToolbarTooltip>
          <ToolbarTooltip label="Delete chart">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground cursor-pointer"
              onClick={onDelete}
              aria-label="Delete chart"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </ToolbarTooltip>
        </div>
      </div>
      <div className="min-h-0 flex-1 p-4">
        <ChartBody chart={chart} query={chartQuery} onUpdate={onUpdate} />
      </div>
    </article>
  )
}

function ChartBody({
  chart,
  query,
  onUpdate,
}: {
  chart: DashboardChart
  onUpdate: (chart: DashboardChart) => void
  query: {
    data?: QueryResultResponse
    error: Error | null
    isLoading: boolean
    isFetching: boolean
  }
}) {
  if (!chart.sql.trim()) {
    return (
      <EmptyChartState
        icon={<BarChart3 className="size-4" />}
        title="Add a query"
        description="Charts run a read-only SQL query and map columns into visual encodings."
      />
    )
  }

  if (query.isLoading) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading chart
      </div>
    )
  }

  if (query.error) {
    return (
      <EmptyChartState
        title="Chart query failed"
        description={query.error.message}
      />
    )
  }

  const rows = query.data?.rows ?? []
  const columns = query.data?.columns ?? []

  if (rows.length === 0 || columns.length === 0) {
    return (
      <EmptyChartState
        title="No data"
        description="The query returned no rows for this chart."
      />
    )
  }

  if (chart.type === 'number') {
    return <NumberChart chart={chart} rows={rows} columns={columns} />
  }

  if (chart.type === 'table') {
    return (
      <TableChart
        chart={chart}
        rows={rows}
        columns={columns}
        onUpdate={onUpdate}
      />
    )
  }

  if (chart.type === 'pie' || chart.type === 'donut') {
    return <PieFamilyChart chart={chart} rows={rows} columns={columns} />
  }

  if (chart.type === 'scatter' || chart.type === 'bubble') {
    return (
      <ScatterFamilyChart
        chart={chart}
        rows={rows}
        columns={columns}
        onUpdate={onUpdate}
      />
    )
  }

  return (
    <CartesianFamilyChart
      chart={chart}
      rows={rows}
      columns={columns}
      onUpdate={onUpdate}
    />
  )
}

function CartesianFamilyChart({
  chart,
  rows,
  columns,
  onUpdate,
}: {
  chart: DashboardChart
  rows: Record<string, unknown>[]
  columns: string[]
  onUpdate: (chart: DashboardChart) => void
}) {
  const categoryColumn =
    chart.xAxis || firstTextColumn(rows, columns) || columns[0]
  const series = resolveSeries(chart, rows, columns, categoryColumn)
  const data = rows.map((row, index) => ({
    category: formatCell(row[categoryColumn] ?? index + 1),
    ...Object.fromEntries(
      series.map((item, seriesIndex) => [
        `series${seriesIndex}`,
        numericValue(row[item.column]),
      ]),
    ),
  }))
  const visibleRange = chart.visibleRange
  const defaultViewport = useMemo(
    () => defaultChartViewport(visibleRange, data.length),
    [data.length, visibleRange],
  )
  const [viewport, setViewport] = useState<ChartViewportRange>(
    () => defaultViewport,
  )

  useEffect(() => {
    setViewport(defaultViewport)
  }, [defaultViewport])

  const visibleData = data.slice(viewport.start, viewport.end)
  const config = chartConfig(series)
  const axesVisible = chart.showAxes !== false
  const common = (
    <>
      <XAxis
        dataKey="category"
        hide={!axesVisible}
        tickLine={false}
        axisLine={AXIS_LINE}
        tick={AXIS_TICK}
        tickMargin={8}
        minTickGap={20}
      />
      <YAxis
        hide={!axesVisible}
        tickLine={false}
        axisLine={AXIS_LINE}
        tick={AXIS_TICK}
        tickMargin={8}
        width={axesVisible ? 52 : 0}
      />
      <ChartTooltip content={<ChartTooltipContent />} />
    </>
  )
  const margin = {
    top: 12,
    right: 16,
    bottom: 8,
    left: 0,
  }
  const legend = chart.showLegend ? seriesLegendItems(series) : []
  const axes = axesVisible
    ? cartesianAxesFrame(visibleData, series.length)
    : undefined
  const viewportControls =
    data.length > 12 ? (
      <ChartViewportControls
        range={viewport}
        defaultRange={defaultViewport}
        total={data.length}
        onChange={setViewport}
        onSaveDefault={(range) =>
          onUpdate({
            ...chart,
            visibleRange: viewportToVisibleRange(range, data.length),
            updatedAt: new Date().toISOString(),
          })
        }
      />
    ) : null

  if (chart.type === 'line') {
    return (
      <ChartPanel
        chart={chart}
        legend={legend}
        axes={axes}
        controls={viewportControls}
        grid={chart.showGrid}
      >
        <ChartContainer config={config} className="h-full w-full">
          <LineChart data={visibleData} margin={margin}>
            {common}
            {series.map((item, index) => (
              <Line
                key={item.id}
                type="monotone"
                dataKey={`series${index}`}
                name={item.name}
                stroke={`var(--color-series${index})`}
                strokeWidth={2}
                dot={chart.showDots}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </ChartPanel>
    )
  }

  if (chart.type === 'area') {
    return (
      <ChartPanel
        chart={chart}
        legend={legend}
        axes={axes}
        controls={viewportControls}
        grid={chart.showGrid}
      >
        <ChartContainer config={config} className="h-full w-full">
          <AreaChart data={visibleData} margin={margin}>
            {common}
            {series.map((item, index) => (
              <Area
                key={item.id}
                type="monotone"
                dataKey={`series${index}`}
                name={item.name}
                stroke={`var(--color-series${index})`}
                fill={`var(--color-series${index})`}
                fillOpacity={0.22}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </ChartPanel>
    )
  }

  if (chart.type === 'horizontal-bar') {
    const horizontalAxes = axesVisible
      ? horizontalBarAxesFrame(visibleData, series.length)
      : undefined
    return (
      <ChartPanel
        chart={chart}
        legend={legend}
        axes={horizontalAxes}
        controls={viewportControls}
        grid={chart.showGrid}
        gridOrientation="vertical"
      >
        <ChartContainer config={config} className="h-full w-full">
          <BarChart data={visibleData} layout="vertical" margin={margin}>
            <XAxis
              type="number"
              hide={!axesVisible}
              tickLine={false}
              axisLine={AXIS_LINE}
              tick={AXIS_TICK}
              tickMargin={8}
            />
            <YAxis
              type="category"
              dataKey="category"
              hide={!axesVisible}
              tickLine={false}
              axisLine={AXIS_LINE}
              tick={AXIS_TICK}
              tickMargin={8}
              width={axesVisible ? 92 : 0}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            {series.map((item, index) => (
              <Bar
                key={item.id}
                dataKey={`series${index}`}
                name={item.name}
                fill={`var(--color-series${index})`}
                radius={3}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </ChartPanel>
    )
  }

  if (chart.type === 'composed') {
    return (
      <ChartPanel
        chart={chart}
        legend={legend}
        axes={axes}
        controls={viewportControls}
        grid={chart.showGrid}
      >
        <ChartContainer config={config} className="h-full w-full">
          <ComposedChart data={visibleData} margin={margin}>
            {common}
            {series.map((item, index) => {
              const key = `series${index}`
              if (item.chartType === 'area') {
                return (
                  <Area
                    key={item.id}
                    type="monotone"
                    dataKey={key}
                    name={item.name}
                    stroke={`var(--color-${key})`}
                    fill={`var(--color-${key})`}
                    fillOpacity={0.18}
                  />
                )
              }
              if (item.chartType === 'line') {
                return (
                  <Line
                    key={item.id}
                    type="monotone"
                    dataKey={key}
                    name={item.name}
                    stroke={`var(--color-${key})`}
                    strokeWidth={2}
                    dot={chart.showDots}
                  />
                )
              }

              return (
                <Bar
                  key={item.id}
                  dataKey={key}
                  name={item.name}
                  fill={`var(--color-${key})`}
                  radius={3}
                />
              )
            })}
          </ComposedChart>
        </ChartContainer>
      </ChartPanel>
    )
  }

  return (
    <ChartPanel
      chart={chart}
      legend={legend}
      axes={axes}
      controls={viewportControls}
      grid={chart.showGrid}
    >
      <ChartContainer config={config} className="h-full w-full">
        <BarChart data={visibleData} margin={margin}>
          {common}
          {series.map((item, index) => (
            <Bar
              key={item.id}
              dataKey={`series${index}`}
              name={item.name}
              stackId={chart.type === 'stacked-bar' ? 'stack' : undefined}
              fill={`var(--color-series${index})`}
              radius={chart.type === 'stacked-bar' ? 0 : 3}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </ChartPanel>
  )
}

function PieFamilyChart({
  chart,
  rows,
  columns,
}: {
  chart: DashboardChart
  rows: Record<string, unknown>[]
  columns: string[]
}) {
  const nameColumn =
    chart.categoryColumn ||
    chart.xAxis ||
    firstTextColumn(rows, columns) ||
    columns[0]
  const valueColumn =
    chart.valueColumn ||
    chart.series[0]?.column ||
    firstNumericColumn(rows, columns)
  const data = rows.map((row, index) => ({
    name: formatCell(row[nameColumn] ?? `Slice ${index + 1}`),
    value: numericValue(row[valueColumn]),
  }))
  const legend = chart.showLegend
    ? data.slice(0, 12).map((entry, index) => ({
        id: `${entry.name}-${index}`,
        name: entry.name,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }))
    : []
  const config = {
    value: {
      label: valueColumn,
      color: CHART_COLORS[0],
    },
  } satisfies ChartConfig

  return (
    <ChartPanel chart={chart} legend={legend}>
      <ChartContainer config={config} className="h-full w-full">
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={chart.type === 'donut' ? 54 : 0}
            outerRadius="78%"
            paddingAngle={chart.type === 'donut' ? 2 : 0}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
    </ChartPanel>
  )
}

function ScatterFamilyChart({
  chart,
  rows,
  columns,
  onUpdate,
}: {
  chart: DashboardChart
  rows: Record<string, unknown>[]
  columns: string[]
  onUpdate: (chart: DashboardChart) => void
}) {
  const xColumn = chart.xAxis || firstNumericColumn(rows, columns)
  const yColumn =
    chart.series[0]?.column ||
    columns.find(
      (column) => column !== xColumn && isNumericColumn(rows, column),
    ) ||
    xColumn
  const sizeColumn = chart.type === 'bubble' ? chart.sizeColumn : ''
  const data = rows.map((row) => ({
    x: numericValue(row[xColumn]),
    y: numericValue(row[yColumn]),
    z: sizeColumn ? Math.max(8, numericValue(row[sizeColumn])) : 24,
    name: chart.labelColumn ? formatCell(row[chart.labelColumn]) : undefined,
  }))
  const visibleRange = chart.visibleRange
  const defaultViewport = useMemo(
    () => defaultChartViewport(visibleRange, data.length),
    [data.length, visibleRange],
  )
  const [viewport, setViewport] = useState<ChartViewportRange>(
    () => defaultViewport,
  )

  useEffect(() => {
    setViewport(defaultViewport)
  }, [defaultViewport])

  const visibleData = data.slice(viewport.start, viewport.end)
  const pointColor = chart.series[0]?.color || CHART_COLORS[0]
  const config = {
    points: {
      label: yColumn,
      color: pointColor,
    },
  } satisfies ChartConfig
  const axesVisible = chart.showAxes !== false
  const legend = chart.showLegend
    ? [{ id: 'points', name: yColumn, color: pointColor }]
    : []
  const axes = axesVisible
    ? {
        yTicks: valueTicks(visibleData.map((item) => item.y)),
        xTicks: valueTicks(visibleData.map((item) => item.x)),
      }
    : undefined
  const viewportControls =
    data.length > 12 ? (
      <ChartViewportControls
        range={viewport}
        defaultRange={defaultViewport}
        total={data.length}
        onChange={setViewport}
        onSaveDefault={(range) =>
          onUpdate({
            ...chart,
            visibleRange: viewportToVisibleRange(range, data.length),
            updatedAt: new Date().toISOString(),
          })
        }
      />
    ) : null

  return (
    <ChartPanel
      chart={chart}
      legend={legend}
      axes={axes}
      controls={viewportControls}
      grid={chart.showGrid}
      gridOrientation="both"
    >
      <ChartContainer config={config} className="h-full w-full">
        <ScatterChart
          margin={{
            top: 12,
            right: 16,
            bottom: 8,
            left: 0,
          }}
        >
          <XAxis
            type="number"
            dataKey="x"
            name={xColumn}
            hide={!axesVisible}
            tickLine={false}
            axisLine={AXIS_LINE}
            tick={AXIS_TICK}
            tickMargin={8}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yColumn}
            hide={!axesVisible}
            tickLine={false}
            axisLine={AXIS_LINE}
            tick={AXIS_TICK}
            tickMargin={8}
            width={axesVisible ? 52 : 0}
          />
          <ZAxis type="number" dataKey="z" range={[48, 360]} />
          <ChartTooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={<ChartTooltipContent />}
          />
          <Scatter
            data={visibleData}
            name={yColumn}
            fill="var(--color-points)"
          />
        </ScatterChart>
      </ChartContainer>
    </ChartPanel>
  )
}

function NumberChart({
  chart,
  rows,
  columns,
}: {
  chart: DashboardChart
  rows: Record<string, unknown>[]
  columns: string[]
}) {
  const metricColumn =
    chart.metricColumn || chart.valueColumn || firstNumericColumn(rows, columns)
  const labelColumn = chart.labelColumn || firstTextColumn(rows, columns)
  const value = rows[0] ? rows[0][metricColumn] : null
  const label = labelColumn && rows[0] ? rows[0][labelColumn] : metricColumn
  const comparison = numberComparison(chart, rows, metricColumn)
  const comparisonLabel = comparison ? formatComparisonChange(comparison) : null
  const comparisonIsPositive = comparison ? comparison.value > 0 : false
  const comparisonIsNegative = comparison ? comparison.value < 0 : false
  const ComparisonIcon = comparisonIsNegative ? ArrowDown : ArrowUp

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChartTitle chart={chart} />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
        <div className="max-w-full truncate text-5xl font-semibold tracking-normal">
          {formatMetric(value)}
        </div>
        {label && formatCell(label) !== displayChartTitle(chart) ? (
          <div className="text-muted-foreground mt-2 max-w-full truncate text-xs font-medium">
            {formatCell(label)}
          </div>
        ) : null}
        {comparison && comparisonLabel ? (
          <div
            className={cn(
              'mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold',
              comparisonIsNegative
                ? 'text-destructive'
                : 'text-muted-foreground',
            )}
            style={
              comparisonIsPositive ? { color: 'var(--chart-2)' } : undefined
            }
          >
            <span>{comparisonLabel}</span>
            {comparison.value !== 0 ? (
              <ComparisonIcon className="size-3.5" />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function TableChart({
  chart,
  rows,
  columns,
  onUpdate,
}: {
  chart: DashboardChart
  rows: Record<string, unknown>[]
  columns: string[]
  onUpdate: (chart: DashboardChart) => void
}) {
  const visibleColumns = chart.tableColumns.length
    ? chart.tableColumns.filter((column) => columns.includes(column))
    : columns
  const visibleRange = chart.visibleRange
  const defaultRange = useMemo(
    () => defaultTableViewport(visibleRange, rows.length),
    [rows.length, visibleRange],
  )
  const [range, setRange] = useState<ChartViewportRange>(() => defaultRange)

  useEffect(() => {
    setRange(defaultRange)
  }, [defaultRange])

  const visibleRows = rows.slice(range.start, range.end)
  const controls =
    rows.length > DEFAULT_TABLE_PAGE_SIZE ? (
      <TableRangeControls
        range={range}
        defaultRange={defaultRange}
        total={rows.length}
        onChange={setRange}
        onSaveDefault={(nextRange) =>
          onUpdate({
            ...chart,
            visibleRange: viewportToVisibleRange(nextRange, rows.length),
            updatedAt: new Date().toISOString(),
          })
        }
      />
    ) : null

  return (
    <div className="group/chart relative flex h-full min-h-0 flex-col">
      <ChartTitle chart={chart} />
      {controls ? <HoverChartControls>{controls}</HoverChartControls> : null}
      <div className="border-border/60 min-h-0 flex-1 overflow-auto rounded-md border">
        <table className="w-full min-w-max border-collapse text-xs">
          <thead className="bg-muted/70 sticky top-0">
            <tr>
              {visibleColumns.map((column) => (
                <th
                  key={column}
                  className="border-border/60 text-muted-foreground border-b px-2 py-1.5 text-left font-medium"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr key={range.start + rowIndex} className="odd:bg-muted/25">
                {visibleColumns.map((column) => (
                  <td
                    key={column}
                    className="border-border/40 max-w-64 truncate border-b px-2 py-1.5"
                  >
                    {formatCell(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ChartPanel({
  chart,
  legend,
  axes,
  controls,
  grid = false,
  gridOrientation = 'horizontal',
  children,
}: {
  chart: DashboardChart
  legend: ChartLegendItem[]
  axes?: ChartAxesFrame
  controls?: ReactNode
  grid?: boolean
  gridOrientation?: ChartGridOrientation
  children: ReactNode
}) {
  const plot = (
    <div className="relative h-full min-h-0 min-w-0">
      {grid ? <ChartGrid orientation={gridOrientation} /> : null}
      <div className="relative z-10 h-full min-h-0 min-w-0">{children}</div>
    </div>
  )

  return (
    <div className="group/chart relative flex h-full min-h-0 flex-col">
      <ChartTitle chart={chart} />
      {controls ? <HoverChartControls>{controls}</HoverChartControls> : null}
      <div
        className={cn(
          'min-h-0 flex-1',
          axes &&
            'grid grid-cols-[3.5rem_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_1.5rem]',
        )}
      >
        {axes ? (
          <>
            <div className="border-border/60 text-muted-foreground flex min-h-0 flex-col justify-between border-r pr-2 text-right text-[11px] tabular-nums">
              {axes.yTicks.map((tick) => (
                <span key={tick} className="leading-none">
                  {tick}
                </span>
              ))}
            </div>
            <div className="min-h-0 min-w-0">{plot}</div>
            <div className="border-border/60 border-r" />
            <div className="border-border/60 text-muted-foreground flex min-w-0 items-start justify-between border-t pt-1 text-[11px]">
              {axes.xTicks.map((tick, index) => (
                <span
                  key={`${tick}-${index}`}
                  className={cn(
                    'max-w-40 truncate leading-none',
                    index === 1 && 'text-center',
                    index === 2 && 'text-right',
                  )}
                >
                  {tick}
                </span>
              ))}
            </div>
          </>
        ) : (
          plot
        )}
      </div>
      {legend.length > 0 ? (
        <div className="text-muted-foreground mt-2 flex max-h-14 shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 overflow-hidden px-2 text-[11px]">
          {legend.map((item) => (
            <div key={item.id} className="flex min-w-0 items-center gap-1.5">
              <span
                className="size-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: item.color }}
              />
              <span className="max-w-36 truncate">{item.name}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ChartTitle({ chart }: { chart: DashboardChart }) {
  return (
    <div className="mb-3 flex h-7 min-w-0 shrink-0 items-center gap-1.5">
      {chart.description ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-5 shrink-0 cursor-help items-center justify-center rounded-md transition-colors"
              aria-label="Chart description"
            >
              <Info className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-80 text-xs leading-5">
            {chart.description}
          </TooltipContent>
        </Tooltip>
      ) : null}
      <h2 className="truncate text-sm font-semibold leading-5">
        {displayChartTitle(chart)}
      </h2>
    </div>
  )
}

function HoverChartControls({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute right-2 top-11 z-30 opacity-0 transition-opacity duration-150 group-focus-within/chart:pointer-events-auto group-focus-within/chart:opacity-100 group-hover/chart:pointer-events-auto group-hover/chart:opacity-100">
      {children}
    </div>
  )
}

function ChartGrid({ orientation }: { orientation: ChartGridOrientation }) {
  const horizontal = orientation === 'horizontal' || orientation === 'both'
  const vertical = orientation === 'vertical' || orientation === 'both'

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {horizontal ? (
        <div className="absolute inset-0 flex flex-col justify-between">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="bg-border/35 h-px" />
          ))}
        </div>
      ) : null}
      {vertical ? (
        <div className="absolute inset-0 flex justify-between">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="bg-border/30 w-px" />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ChartViewportControls({
  range,
  defaultRange,
  total,
  onChange,
  onSaveDefault,
}: {
  range: ChartViewportRange
  defaultRange: ChartViewportRange
  total: number
  onChange: (range: ChartViewportRange) => void
  onSaveDefault: (range: ChartViewportRange) => void
}) {
  const windowSize = Math.max(0, range.end - range.start)
  const full = range.start === 0 && range.end === total
  const defaultActive =
    range.start === defaultRange.start && range.end === defaultRange.end
  const canZoomIn = windowSize > minimumViewportWindow(total)
  const canZoomOut = !full
  const canPanLeft = range.start > 0
  const canPanRight = range.end < total

  return (
    <div className="border-border/60 bg-background/80 text-muted-foreground flex items-center gap-1 rounded-md border px-1 py-0.5 text-[11px] shadow-sm">
      <span className="px-1 tabular-nums">
        {range.start + 1}-{range.end} / {total}
      </span>
      <ToolbarTooltip label="Pan left">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground size-6 cursor-pointer"
          onClick={() => onChange(panViewport(range, total, -1))}
          disabled={!canPanLeft}
          aria-label="Pan left"
        >
          <ChevronLeft className="size-3.5" />
        </Button>
      </ToolbarTooltip>
      <ToolbarTooltip label="Pan right">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground size-6 cursor-pointer"
          onClick={() => onChange(panViewport(range, total, 1))}
          disabled={!canPanRight}
          aria-label="Pan right"
        >
          <ChevronRight className="size-3.5" />
        </Button>
      </ToolbarTooltip>
      <ToolbarTooltip label="Zoom in">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground size-6 cursor-pointer"
          onClick={() => onChange(zoomViewport(range, total, 'in'))}
          disabled={!canZoomIn}
          aria-label="Zoom in"
        >
          <ZoomIn className="size-3.5" />
        </Button>
      </ToolbarTooltip>
      <ToolbarTooltip label="Zoom out">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground size-6 cursor-pointer"
          onClick={() => onChange(zoomViewport(range, total, 'out'))}
          disabled={!canZoomOut}
          aria-label="Zoom out"
        >
          <ZoomOut className="size-3.5" />
        </Button>
      </ToolbarTooltip>
      <ToolbarTooltip label="Save as default view">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground size-6 cursor-pointer"
          onClick={() => onSaveDefault(range)}
          disabled={defaultActive}
          aria-label="Save as default view"
        >
          <Save className="size-3.5" />
        </Button>
      </ToolbarTooltip>
      <ToolbarTooltip label="Reset to default view">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground size-6 cursor-pointer"
          onClick={() => onChange(defaultRange)}
          disabled={defaultActive}
          aria-label="Reset to default view"
        >
          <RotateCcw className="size-3.5" />
        </Button>
      </ToolbarTooltip>
    </div>
  )
}

function TableRangeControls({
  range,
  defaultRange,
  total,
  onChange,
  onSaveDefault,
}: {
  range: ChartViewportRange
  defaultRange: ChartViewportRange
  total: number
  onChange: (range: ChartViewportRange) => void
  onSaveDefault: (range: ChartViewportRange) => void
}) {
  const pageSize = Math.max(1, range.end - range.start)
  const defaultActive =
    range.start === defaultRange.start && range.end === defaultRange.end
  const canPrevious = range.start > 0
  const canNext = range.end < total

  return (
    <div className="border-border/60 bg-background/80 text-muted-foreground flex items-center gap-1 rounded-md border px-1 py-0.5 text-[11px] shadow-sm">
      <span className="px-1 tabular-nums">
        {range.start + 1}-{range.end} / {total}
      </span>
      <ToolbarTooltip label="Previous rows">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground size-6 cursor-pointer"
          onClick={() => onChange(pageTableRange(range, total, -1))}
          disabled={!canPrevious}
          aria-label="Previous rows"
        >
          <ChevronLeft className="size-3.5" />
        </Button>
      </ToolbarTooltip>
      <ToolbarTooltip label="Next rows">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground size-6 cursor-pointer"
          onClick={() => onChange(pageTableRange(range, total, 1))}
          disabled={!canNext}
          aria-label="Next rows"
        >
          <ChevronRight className="size-3.5" />
        </Button>
      </ToolbarTooltip>
      <Select
        value={String(pageSize)}
        onValueChange={(value) =>
          onChange(resizeTableRange(range, total, Number(value)))
        }
      >
        <SelectTrigger className="h-6 w-[4.75rem] border-0 bg-transparent px-1 text-[11px] shadow-none focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[25, 50, 100, 250, 500].map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size} rows
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ToolbarTooltip label="Save as default rows">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground size-6 cursor-pointer"
          onClick={() => onSaveDefault(range)}
          disabled={defaultActive}
          aria-label="Save as default rows"
        >
          <Save className="size-3.5" />
        </Button>
      </ToolbarTooltip>
      <ToolbarTooltip label="Reset to default rows">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground size-6 cursor-pointer"
          onClick={() => onChange(defaultRange)}
          disabled={defaultActive}
          aria-label="Reset to default rows"
        >
          <RotateCcw className="size-3.5" />
        </Button>
      </ToolbarTooltip>
    </div>
  )
}

function ChartSqlEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="border-border/70 bg-muted/30 h-64 overflow-hidden rounded-md border">
      <Suspense
        fallback={
          <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading SQL editor
          </div>
        }
      >
        <SqlEditor
          value={value}
          canRun={false}
          onChange={onChange}
          onRunCurrent={() => undefined}
          onRunAll={() => undefined}
          onNewSqlTab={() => undefined}
        />
      </Suspense>
    </div>
  )
}

function ChartEditorDialog({
  title,
  connectionId,
  dashboard,
  mode,
  chart,
  onClose,
  onSave,
}: {
  title: string
  connectionId: string
  dashboard: Dashboard
  mode: 'create' | 'edit'
  chart: DashboardChart
  onClose: () => void
  onSave: (chart: DashboardChart) => void
}) {
  const { fetchWithWorkspace } = useWorkspace()
  const [draft, setDraft] = useState(chart)
  const [aiEditActive, setAiEditActive] = useState(false)
  const [tableColumnsInput, setTableColumnsInput] = useState(
    chart.tableColumns.join(', '),
  )
  const previewQuery = useQuery({
    queryKey: [
      'db-browser-dashboard-chart-editor-preview',
      connectionId,
      draft.sql,
      draft.maxRows,
    ],
    enabled: Boolean(connectionId && draft.sql.trim()),
    queryFn: async () => {
      return apiJson<QueryResultResponse>(
        fetchWithWorkspace,
        `/api/connections/${connectionId}/dashboard-chart-query`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: draft.sql, maxRows: draft.maxRows }),
        },
      )
    },
  })
  const previewRows = previewQuery.data?.rows ?? EMPTY_ROWS
  const previewColumns = previewQuery.data?.columns ?? EMPTY_COLUMNS

  useEffect(() => {
    setDraft(chart)
    setTableColumnsInput(chart.tableColumns.join(', '))
  }, [chart])

  useEffect(() => {
    if (previewColumns.length === 0) return
    setDraft((current) =>
      inferChartDefaults(current, previewRows, previewColumns),
    )
  }, [previewColumns, previewRows])

  useEffect(() => {
    if (!aiEditActive) return
    setChartChatInstructions({
      connectionId,
      dashboard,
      chart: draft,
      columns: previewColumns,
      rows: previewRows,
      mode,
    })
  }, [
    aiEditActive,
    connectionId,
    dashboard,
    draft,
    mode,
    previewColumns,
    previewRows,
  ])

  function update<K extends keyof DashboardChart>(
    key: K,
    value: DashboardChart[K],
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
      updatedAt: new Date().toISOString(),
    }))
  }

  function updateVisibleRange(value: Partial<DashboardChartVisibleRange>) {
    update('visibleRange', {
      ...(draft.visibleRange ?? createDefaultVisibleRange()),
      ...value,
    })
  }

  function updateSeriesColor(seriesIndex: number, color: string) {
    const nextSeries = seriesForEditor(draft.series).map((item, index) =>
      index === seriesIndex ? { ...item, color } : item,
    )

    update('series', nextSeries)
  }

  function updateSeries(series: DashboardChartSeries[]) {
    update('series', series)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave({
      ...draft,
      series: cleanDashboardSeries(draft.series),
      tableColumns: tableColumnsInput
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
      updatedAt: new Date().toISOString(),
    })
  }

  function handleAiEdit() {
    setAiEditActive(true)
    setChartChatInstructions({
      connectionId,
      dashboard,
      chart: draft,
      columns: previewColumns,
      rows: previewRows,
      mode,
    })
    window.parent.postMessage(
      {
        type: 'moldable:set-chat-input',
        text: chartChatPrompt(dashboard, draft, mode),
      },
      '*',
    )
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="top-[calc((100dvh-var(--chat-safe-padding,0px))/2)] flex h-[min(780px,calc(100dvh-var(--chat-safe-padding,0px)-2rem))] w-[calc(100vw-3rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1080px]"
      >
        <DialogHeader className="border-border/60 flex-row items-center gap-2 space-y-0 border-b px-6 py-3">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <Input
            value={draft.title}
            onChange={(event) => update('title', event.target.value)}
            placeholder="Untitled chart"
            className="h-9 flex-1 border-none !bg-transparent px-0 py-0 text-[15px] font-semibold tracking-tight shadow-none focus-visible:!bg-transparent focus-visible:ring-0"
          />
          <DialogClose
            className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2"
            aria-label="Close"
          >
            <X className="size-4" />
          </DialogClose>
        </DialogHeader>

        <form
          className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
          onSubmit={handleSubmit}
        >
          <div className="md:border-border/60 flex min-h-0 min-w-0 flex-col md:border-r">
            <Tabs defaultValue="data" className="flex min-h-0 flex-1 flex-col">
              <div className="border-border/60 bg-muted/20 border-b px-4 py-2">
                <TabsList className="h-auto w-fit gap-0.5 bg-transparent p-0">
                  <ChartTabTrigger value="data">Data</ChartTabTrigger>
                  <ChartTabTrigger value="style">Style</ChartTabTrigger>
                  <ChartTabTrigger value="layout">Layout</ChartTabTrigger>
                </TabsList>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <TabsContent value="data" className="mt-0 space-y-6">
                  <SectionBlock
                    label="Query"
                    hint="Read-only SQL — the result feeds the chart."
                    action={
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={handleAiEdit}
                            aria-label="Edit chart with AI"
                          >
                            <Sparkles className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          Edit chart with AI
                        </TooltipContent>
                      </Tooltip>
                    }
                  >
                    <ChartSqlEditor
                      value={draft.sql}
                      onChange={(value) => update('sql', value)}
                    />
                  </SectionBlock>

                  <SectionBlock label="Mapping">
                    <ChartMappingFields
                      draft={draft}
                      rows={previewRows}
                      columns={previewColumns}
                      tableColumnsInput={tableColumnsInput}
                      onUpdate={update}
                      onSeriesChange={updateSeries}
                      onSeriesColorChange={updateSeriesColor}
                      onTableColumnsInputChange={setTableColumnsInput}
                    />
                  </SectionBlock>
                </TabsContent>

                <TabsContent value="style" className="mt-0 space-y-6">
                  <SectionBlock label="Chart type">
                    <ChartTypePicker
                      value={draft.type}
                      onChange={(value) => update('type', value)}
                    />
                  </SectionBlock>

                  <SectionBlock label="Display">
                    <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                      <SwitchField
                        label="Legend"
                        checked={draft.showLegend}
                        onCheckedChange={(checked) =>
                          update('showLegend', checked)
                        }
                      />
                      <SwitchField
                        label="Axes"
                        checked={draft.showAxes !== false}
                        onCheckedChange={(checked) =>
                          update('showAxes', checked)
                        }
                      />
                      <SwitchField
                        label="Grid lines"
                        checked={draft.showGrid}
                        onCheckedChange={(checked) =>
                          update('showGrid', checked)
                        }
                      />
                      <SwitchField
                        label="Data points"
                        checked={draft.showDots}
                        onCheckedChange={(checked) =>
                          update('showDots', checked)
                        }
                      />
                    </div>
                  </SectionBlock>

                  <SectionBlock
                    label="Description"
                    hint="Shown in the chart title tooltip."
                  >
                    <Input
                      value={draft.description}
                      onChange={(event) =>
                        update('description', event.target.value)
                      }
                      placeholder="Optional note"
                    />
                  </SectionBlock>
                </TabsContent>

                <TabsContent value="layout" className="mt-0 space-y-6">
                  <SectionBlock label="Dashboard layout">
                    <div className="space-y-5">
                      <DialogField label="Size">
                        <ChartSizePicker
                          value={draft.size}
                          onChange={(value) => update('size', value)}
                        />
                      </DialogField>
                      <DialogField label="Max rows">
                        <div className="max-w-40">
                          <Input
                            type="number"
                            min={1}
                            max={5000}
                            value={draft.maxRows}
                            onChange={(event) =>
                              update(
                                'maxRows',
                                Math.max(1, Number(event.target.value) || 1),
                              )
                            }
                          />
                        </div>
                      </DialogField>
                    </div>
                  </SectionBlock>

                  {chartSupportsViewport(draft.type) ? (
                    <SectionBlock
                      label="Default view"
                      hint="Where the chart lands when first opened. Users can pan and reset."
                    >
                      <VisibleRangeFields
                        value={
                          draft.visibleRange ?? createDefaultVisibleRange()
                        }
                        onChange={updateVisibleRange}
                      />
                    </SectionBlock>
                  ) : null}
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <ChartEditorPreview
            chart={draft}
            query={previewQuery}
            onUpdate={setDraft}
          />

          <DialogFooter className="border-border/60 bg-muted/20 col-span-full flex items-center justify-between gap-3 border-t px-6 py-3 sm:justify-between">
            <span className="text-muted-foreground text-[11px]">
              {previewQuery.isFetching
                ? 'Running preview…'
                : previewColumns.length > 0
                  ? `${previewRows.length} ${previewRows.length === 1 ? 'row' : 'rows'} · ${previewColumns.length} ${previewColumns.length === 1 ? 'column' : 'columns'}`
                  : 'Add a query to preview the chart.'}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                className="cursor-pointer"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="cursor-pointer"
                disabled={!draft.title.trim() || !draft.sql.trim()}
              >
                Save chart
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ChartTabTrigger({
  value,
  children,
}: {
  value: string
  children: ReactNode
}) {
  return (
    <TabsTrigger
      value={value}
      className="text-muted-foreground hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground cursor-pointer rounded-md border-none bg-transparent px-3 py-1.5 text-[13px] font-medium shadow-none transition-colors data-[state=active]:shadow-sm"
    >
      {children}
    </TabsTrigger>
  )
}

function chartChatPrompt(
  dashboard: Dashboard,
  chart: DashboardChart,
  mode: 'create' | 'edit',
) {
  if (mode === 'create') {
    return [
      `Help me build the new "${displayChartTitle(chart)}" chart in the "${displayDashboardTitle(dashboard)}" dashboard.`,
      'I want to change the query or chart settings to...',
    ].join('\n')
  }

  return [
    `Help me edit the "${displayChartTitle(chart)}" chart in the "${displayDashboardTitle(dashboard)}" dashboard.`,
    'I want to change the query or chart settings to...',
  ].join('\n')
}

function setChartChatInstructions({
  connectionId,
  dashboard,
  chart,
  columns,
  rows,
  mode,
}: {
  connectionId: string
  dashboard: Dashboard
  chart: DashboardChart
  columns: string[]
  rows: Record<string, unknown>[]
  mode: 'create' | 'edit'
}) {
  const chartSnapshot = {
    ...chart,
    sql: truncateForChat(chart.sql, 8_000),
  }
  const sampleRows = rows.slice(0, 5)

  window.parent.postMessage(
    {
      type: 'moldable:set-chat-instructions',
      text: [
        'The user is editing a DB Browser dashboard chart. Keep the user focused on the current chart and use the app-owned DB Browser APIs rather than editing files.',
        '',
        'Use listMoldableAppApi if you need the exact schema for app methods. For saved charts, update the chart through callMoldableAppApi with db.dashboardCharts.update using dashboardName/chartName or dashboardId/chartId. Use db.dashboardCharts.edit for surgical SQL-only changes. Preserve existing chart fields unless the user asks to change them. Prefer read-only SQL. Do not run write, admin, import, export, or transaction workflows.',
        mode === 'edit'
          ? 'After calling db.dashboardCharts.update, the open chart editor will refresh from the app-api change event so the user can see the new query/config and keep tweaking.'
          : 'This chart draft is not saved yet. You can help write SQL and choose settings in chat; only call db.dashboardCharts.create if the user explicitly wants you to create a saved chart from this draft.',
        '',
        `Connection id: ${connectionId}`,
        `Dashboard id: ${dashboard.id}`,
        `Dashboard title: ${displayDashboardTitle(dashboard)}`,
        `Chart id: ${chart.id}`,
        `Chart title: ${displayChartTitle(chart)}`,
        '',
        'Current chart config JSON:',
        JSON.stringify(chartSnapshot, null, 2),
        '',
        `Preview columns (${columns.length}): ${columns.join(', ') || 'none yet'}`,
        'Preview sample rows:',
        JSON.stringify(sampleRows, null, 2),
      ].join('\n'),
    },
    '*',
  )
}

function SectionBlock({
  label,
  hint,
  action,
  children,
}: {
  label: string
  hint?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="text-foreground text-[13px] font-semibold tracking-tight">
            {label}
          </h3>
          {action}
        </div>
        {hint ? (
          <span className="text-muted-foreground text-[11px]">{hint}</span>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function ChartTypePicker({
  value,
  onChange,
}: {
  value: DashboardChartType
  onChange: (value: DashboardChartType) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {CHART_TYPE_TILES.map((item) => {
        const selected = value === item.value
        const Icon = item.icon

        return (
          <button
            key={item.value}
            type="button"
            className={cn(
              'border-border/60 bg-background text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground group flex h-[78px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border text-center text-[12px] font-medium transition-colors',
              selected &&
                'border-primary bg-primary/5 text-foreground ring-primary/50 ring-1',
            )}
            onClick={() => onChange(item.value)}
            aria-pressed={selected}
          >
            <Icon
              className={cn(
                'text-muted-foreground group-hover:text-foreground size-5 transition-colors',
                selected && 'text-primary',
              )}
              strokeWidth={1.75}
            />
            <span className="leading-none">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function ChartSizePicker({
  value,
  onChange,
}: {
  value: DashboardChartSize
  onChange: (value: DashboardChartSize) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {CHART_SIZE_TILES.map((item) => {
        const selected = value === item.value

        return (
          <button
            key={item.value}
            type="button"
            className={cn(
              'border-border/60 bg-background hover:border-border hover:bg-muted/40 group flex min-h-[122px] cursor-pointer flex-col gap-4 rounded-lg border p-4 text-left transition-colors',
              selected && 'border-primary bg-primary/5 ring-primary/50 ring-1',
            )}
            onClick={() => onChange(item.value)}
            aria-pressed={selected}
          >
            <span className="border-border/50 bg-muted/30 grid h-14 grid-cols-6 grid-rows-4 gap-1 rounded-md border p-1.5">
              <span
                className={cn(
                  'bg-muted-foreground/30 group-hover:bg-muted-foreground/45 rounded-[3px] transition-colors',
                  item.previewClass,
                  selected && 'bg-primary',
                )}
              />
            </span>
            <span>
              <span
                className={cn(
                  'text-foreground block text-[12px] font-semibold',
                  selected && 'text-primary',
                )}
              >
                {item.label}
              </span>
              <span className="text-muted-foreground mt-1 block text-[11px] leading-4">
                {item.description}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function ChartEditorPreview({
  chart,
  query,
  onUpdate,
}: {
  chart: DashboardChart
  query: {
    data?: QueryResultResponse
    error: Error | null
    isLoading: boolean
    isFetching: boolean
  }
  onUpdate: (chart: DashboardChart) => void
}) {
  return (
    <aside className="bg-muted/20 relative flex min-h-0 min-w-0 flex-col">
      <div className="border-border/60 flex items-center justify-between gap-3 border-b px-5 py-3">
        <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
          Preview
        </span>
        {query.isFetching ? (
          <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
            <Loader2 className="size-3 animate-spin" />
            Running
          </span>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-5">
        <div
          className={cn(
            'border-border/60 bg-card relative flex min-h-0 flex-col overflow-hidden rounded-xl border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-[height,width,max-width]',
            chartPreviewSizeClass(chart.size),
          )}
        >
          <div className="min-h-0 flex-1">
            <ChartBody chart={chart} query={query} onUpdate={onUpdate} />
          </div>
        </div>
      </div>
    </aside>
  )
}

function ChartSeriesEditor({
  series,
  columns,
  rows,
  composed = false,
  maxSeries = 12,
  onChange,
  onColorChange,
}: {
  series: DashboardChartSeries[]
  columns: string[]
  rows: Record<string, unknown>[]
  composed?: boolean
  maxSeries?: number
  onChange: (series: DashboardChartSeries[]) => void
  onColorChange?: (index: number, color: string) => void
}) {
  const editableSeries = series.length > 0 ? series : [blankSeries(0)]
  const canAdd = editableSeries.length < maxSeries
  const numericColumns = columns.filter((column) =>
    isNumericColumn(rows, column),
  )

  function updateSeriesItem(
    index: number,
    value: Partial<DashboardChartSeries>,
  ) {
    onChange(
      editableSeries.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        const next = { ...item, ...value }
        if (
          value.column !== undefined &&
          (!item.name.trim() || item.name === item.column)
        ) {
          next.name = value.column
        }
        return next
      }),
    )
  }

  function applyColor(index: number, color: string) {
    if (onColorChange) {
      onColorChange(index, color)
      return
    }
    onChange(
      editableSeries.map((item, itemIndex) =>
        itemIndex === index ? { ...item, color } : item,
      ),
    )
  }

  function removeSeriesItem(index: number) {
    const next = editableSeries.filter((_, itemIndex) => itemIndex !== index)
    onChange(next.length > 0 ? next : [blankSeries(0)])
  }

  return (
    <div className="space-y-2">
      {editableSeries.map((item, index) => {
        const fallbackColor = CHART_COLORS[index % CHART_COLORS.length]

        return (
          <div
            key={item.id}
            className="border-border/60 bg-background flex flex-col gap-2 rounded-lg border p-2.5"
          >
            <div className="flex items-center gap-2">
              <ColorPopover
                value={item.color || ''}
                fallback={fallbackColor}
                onChange={(color) => applyColor(index, color)}
              />
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <ColumnSelect
                  columns={numericColumns.length > 0 ? numericColumns : columns}
                  value={item.column}
                  onChange={(column) => updateSeriesItem(index, { column })}
                  placeholder={maxSeries === 1 ? 'y column' : 'value column'}
                />
                <Input
                  value={item.name}
                  onChange={(event) =>
                    updateSeriesItem(index, { name: event.target.value })
                  }
                  placeholder={item.column || 'Display name'}
                  className="h-9"
                />
              </div>
              <ToolbarTooltip label="Remove series">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-foreground size-8 shrink-0 cursor-pointer"
                  onClick={() => removeSeriesItem(index)}
                  disabled={editableSeries.length === 1}
                  aria-label="Remove series"
                >
                  <X className="size-3.5" />
                </Button>
              </ToolbarTooltip>
            </div>
            {composed ? (
              <div className="text-muted-foreground flex items-center gap-2 pl-9 text-[11px]">
                <span className="leading-none">Render as</span>
                <Select
                  value={item.chartType ?? 'bar'}
                  onValueChange={(value) =>
                    updateSeriesItem(index, {
                      chartType: value as NonNullable<
                        DashboardChartSeries['chartType']
                      >,
                    })
                  }
                >
                  <SelectTrigger className="h-7 w-28 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="line">Line</SelectItem>
                    <SelectItem value="area">Area</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
        )
      })}
      {canAdd ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground h-8 cursor-pointer gap-1.5 text-xs"
          onClick={() =>
            onChange([...editableSeries, blankSeries(editableSeries.length)])
          }
        >
          <Plus className="size-3.5" />
          Add series
        </Button>
      ) : null}
    </div>
  )
}

function ColorPopover({
  value,
  fallback,
  onChange,
}: {
  value: string
  fallback: string
  onChange: (color: string) => void
}) {
  const [hexDraft, setHexDraft] = useState(value)

  useEffect(() => {
    setHexDraft(value)
  }, [value])

  const displayColor = value || fallback
  const isAuto = !value

  function commitHex(next: string) {
    const trimmed = next.trim()
    if (!trimmed) {
      onChange('')
      return
    }
    if (/^#?[0-9a-fA-F]{3}$|^#?[0-9a-fA-F]{6}$/.test(trimmed)) {
      onChange(trimmed.startsWith('#') ? trimmed : `#${trimmed}`)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="border-border/60 bg-background hover:border-foreground/30 group relative flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors"
          aria-label="Choose series color"
        >
          <span
            className="size-4 rounded-[4px] ring-1 ring-inset ring-black/10"
            style={{ backgroundColor: displayColor }}
          />
          {isAuto ? (
            <span className="bg-muted-foreground/60 ring-background absolute -right-0.5 -top-0.5 size-2 rounded-full ring-2" />
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        className="w-60 p-3"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
            Color
          </span>
          {!isAuto ? (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground cursor-pointer text-[11px] underline-offset-4 hover:underline"
              onClick={() => onChange('')}
            >
              Reset
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {CONNECTION_COLORS.map((color) => {
            const selected = value.toLowerCase() === color.toLowerCase()
            return (
              <button
                key={color}
                type="button"
                className={cn(
                  'border-border/60 relative size-7 cursor-pointer rounded-md border transition-shadow hover:scale-[1.05]',
                  selected &&
                    'ring-ring ring-offset-background ring-2 ring-offset-2',
                )}
                style={{ backgroundColor: color }}
                aria-label={`Use ${color}`}
                aria-pressed={selected}
                onClick={() => onChange(color)}
              >
                {selected ? (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Check
                      className="size-3.5 text-white drop-shadow"
                      strokeWidth={3}
                    />
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Pipette className="text-muted-foreground size-3.5 shrink-0" />
          <Input
            value={hexDraft}
            onChange={(event) => setHexDraft(event.target.value)}
            onBlur={(event) => commitHex(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commitHex(hexDraft)
              }
            }}
            placeholder={isAuto ? `auto · ${fallback}` : '#hex'}
            className="h-7 font-mono text-[11px]"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

function ChartMappingFields({
  draft,
  rows,
  columns,
  tableColumnsInput,
  onUpdate,
  onSeriesChange,
  onSeriesColorChange,
  onTableColumnsInputChange,
}: {
  draft: DashboardChart
  rows: Record<string, unknown>[]
  columns: string[]
  tableColumnsInput: string
  onUpdate: <K extends keyof DashboardChart>(
    key: K,
    value: DashboardChart[K],
  ) => void
  onSeriesChange: (series: DashboardChartSeries[]) => void
  onSeriesColorChange: (index: number, color: string) => void
  onTableColumnsInputChange: (value: string) => void
}) {
  const numericColumns = columns.filter((column) =>
    isNumericColumn(rows, column),
  )
  const textColumns = columns.filter((column) => !isNumericColumn(rows, column))
  const noColumns = columns.length === 0

  if (noColumns) {
    return (
      <div className="border-border/60 bg-muted/20 text-muted-foreground rounded-lg border border-dashed px-3.5 py-3 text-xs">
        Run a query in the SQL panel above to map columns into the chart.
      </div>
    )
  }

  if (draft.type === 'number') {
    return (
      <div className="space-y-3">
        <div className="border-border/70 bg-muted/10 rounded-lg border p-3.5">
          <div className="text-foreground mb-3 text-xs font-semibold">
            Primary value
          </div>
          <div className="grid gap-3 sm:grid-cols-2 [&>label]:min-w-0">
            <DialogField label="Value column">
              <ColumnSelect
                columns={numericColumns.length > 0 ? numericColumns : columns}
                value={draft.metricColumn}
                onChange={(column) => onUpdate('metricColumn', column)}
                placeholder="revenue"
              />
            </DialogField>
            <DialogField label="Label above value">
              <ColumnSelect
                columns={columns}
                value={draft.labelColumn}
                onChange={(column) => onUpdate('labelColumn', column)}
                placeholder="metric label"
              />
            </DialogField>
          </div>
        </div>

        <div className="border-border/70 bg-muted/10 rounded-lg border p-3.5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-foreground text-xs font-semibold">
              Change indicator
            </div>
            <span className="text-muted-foreground text-[11px]">
              Shown below value
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 [&>label]:min-w-0">
            <DialogField label="Comparison source">
              <ColumnSelect
                columns={numericColumns.length > 0 ? numericColumns : columns}
                value={draft.comparisonColumn}
                onChange={(column) => onUpdate('comparisonColumn', column)}
                placeholder="optional"
              />
            </DialogField>
            <DialogField label="Source meaning">
              <ComparisonModeSelect
                value={draft.comparisonMode ?? 'auto'}
                onChange={(value) => onUpdate('comparisonMode', value)}
              />
            </DialogField>
          </div>
        </div>
      </div>
    )
  }

  if (draft.type === 'table') {
    return (
      <DialogField label="Columns">
        <Input
          value={tableColumnsInput}
          onChange={(event) => onTableColumnsInputChange(event.target.value)}
          placeholder="Leave blank for all"
        />
      </DialogField>
    )
  }

  if (draft.type === 'pie' || draft.type === 'donut') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <DialogField label="Label column">
          <ColumnSelect
            columns={textColumns.length > 0 ? textColumns : columns}
            value={draft.categoryColumn}
            onChange={(column) => onUpdate('categoryColumn', column)}
            placeholder="plan"
          />
        </DialogField>
        <DialogField label="Value column">
          <ColumnSelect
            columns={numericColumns.length > 0 ? numericColumns : columns}
            value={draft.valueColumn}
            onChange={(column) => onUpdate('valueColumn', column)}
            placeholder="customers"
          />
        </DialogField>
      </div>
    )
  }

  if (draft.type === 'scatter' || draft.type === 'bubble') {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <DialogField label="X column">
            <ColumnSelect
              columns={numericColumns.length > 0 ? numericColumns : columns}
              value={draft.xAxis}
              onChange={(column) => onUpdate('xAxis', column)}
              placeholder="x"
            />
          </DialogField>
          <DialogField label="Label column">
            <ColumnSelect
              columns={columns}
              value={draft.labelColumn}
              onChange={(column) => onUpdate('labelColumn', column)}
              placeholder="Optional"
            />
          </DialogField>
        </div>
        <SeriesEditorBlock label="Y series">
          <ChartSeriesEditor
            series={seriesForEditor(draft.series).slice(0, 1)}
            columns={numericColumns.length > 0 ? numericColumns : columns}
            rows={rows}
            maxSeries={1}
            onChange={onSeriesChange}
            onColorChange={onSeriesColorChange}
          />
        </SeriesEditorBlock>
        {draft.type === 'bubble' ? (
          <DialogField label="Size column">
            <ColumnSelect
              columns={numericColumns.length > 0 ? numericColumns : columns}
              value={draft.sizeColumn}
              onChange={(column) => onUpdate('sizeColumn', column)}
              placeholder="size"
            />
          </DialogField>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <DialogField label="X column">
        <ColumnSelect
          columns={columns}
          value={draft.xAxis}
          onChange={(column) => onUpdate('xAxis', column)}
          placeholder="month"
        />
      </DialogField>
      <SeriesEditorBlock label="Y series">
        <ChartSeriesEditor
          series={seriesForEditor(draft.series)}
          columns={numericColumns.length > 0 ? numericColumns : columns}
          rows={rows}
          composed={draft.type === 'composed'}
          onChange={onSeriesChange}
          onColorChange={onSeriesColorChange}
        />
      </SeriesEditorBlock>
    </div>
  )
}

function SeriesEditorBlock({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      {children}
    </div>
  )
}

function ComparisonModeSelect({
  value,
  onChange,
}: {
  value: DashboardChartComparisonMode
  onChange: (value: DashboardChartComparisonMode) => void
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as DashboardChartComparisonMode)}
    >
      <SelectTrigger className="cursor-pointer">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="auto">Auto detect</SelectItem>
        <SelectItem value="percent">Percent column</SelectItem>
        <SelectItem value="previous-value">Previous value</SelectItem>
        <SelectItem value="number">Raw number</SelectItem>
      </SelectContent>
    </Select>
  )
}

function ColumnSelect({
  columns,
  value,
  placeholder,
  onChange,
}: {
  columns: string[]
  value: string
  placeholder: string
  onChange: (value: string) => void
}) {
  if (columns.length === 0) {
    return (
      <Input
        className="max-w-full"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    )
  }

  const options =
    value && !columns.includes(value) ? [value, ...columns] : columns

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="min-w-0 max-w-full cursor-pointer overflow-hidden">
        <SelectValue placeholder={placeholder} className="min-w-0 truncate" />
      </SelectTrigger>
      <SelectContent>
        {options.map((column) => (
          <SelectItem key={column} value={column}>
            <span className="flex min-w-0 items-center gap-2">
              <span className="text-muted-foreground min-w-0 truncate font-mono text-[11px]">
                {column}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function VisibleRangeFields({
  value,
  onChange,
}: {
  value: DashboardChartVisibleRange
  onChange: (value: Partial<DashboardChartVisibleRange>) => void
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {VISIBLE_RANGE_MODE_TILES.map((item) => {
          const selected = value.mode === item.value
          const Icon = item.icon

          return (
            <button
              key={item.value}
              type="button"
              className={cn(
                'border-border/60 bg-background text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground group flex h-16 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border text-[12px] font-medium transition-colors',
                selected &&
                  'border-primary bg-primary/5 text-foreground ring-primary/50 ring-1',
              )}
              onClick={() => onChange({ mode: item.value })}
              aria-pressed={selected}
            >
              <Icon
                className={cn(
                  'text-muted-foreground group-hover:text-foreground size-4 transition-colors',
                  selected && 'text-primary',
                )}
                strokeWidth={1.75}
              />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>

      {value.mode === 'latest' || value.mode === 'first' ? (
        <div className="max-w-40">
          <DialogField label="Rows">
            <Input
              type="number"
              min={1}
              max={5000}
              value={value.count}
              onChange={(event) =>
                onChange({
                  count: Math.max(1, Number(event.target.value) || 1),
                })
              }
            />
          </DialogField>
        </div>
      ) : null}

      {value.mode === 'custom' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <DialogField label="Start row">
            <Input
              type="number"
              min={1}
              max={5000}
              value={value.start}
              onChange={(event) =>
                onChange({
                  start: Math.max(1, Number(event.target.value) || 1),
                })
              }
            />
          </DialogField>
          <DialogField label="End row">
            <Input
              type="number"
              min={1}
              max={5000}
              value={value.end}
              onChange={(event) =>
                onChange({
                  end: Math.max(1, Number(event.target.value) || 1),
                })
              }
            />
          </DialogField>
        </div>
      ) : null}
    </div>
  )
}

function truncateForChat(value: string, maxLength: number) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength)}\n/* truncated */`
}

function SwitchField({
  label,
  checked,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <label className="text-foreground/90 hover:bg-muted/40 flex h-9 cursor-pointer items-center justify-between rounded-md px-1 text-[13px]">
      <span>{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="cursor-pointer"
      />
    </label>
  )
}

function EmptyChartState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode
  title: string
  description?: string
}) {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center">
      <div className="text-muted-foreground max-w-xs text-xs">
        {icon ? <div className="mb-2 flex justify-center">{icon}</div> : null}
        <p className="text-foreground/80 font-medium">{title}</p>
        {description ? <p className="mt-1 leading-5">{description}</p> : null}
      </div>
    </div>
  )
}

function ToolbarTooltip({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

function chartSizeClass(size: DashboardChartSize) {
  if (size === 'sm') return 'col-span-12 row-span-2 md:col-span-6 xl:col-span-4'
  if (size === 'lg') return 'col-span-12 row-span-4 xl:col-span-8'
  if (size === 'xl') return 'col-span-12 row-span-5'
  return 'col-span-12 row-span-3 lg:col-span-6'
}

function moveChartIntoExistingSlot(
  charts: DashboardChart[],
  oldIndex: number,
  newIndex: number,
) {
  const slotSizes = charts.map((chart) => chart.size)
  return arrayMove(charts, oldIndex, newIndex).map((chart, index) =>
    chartWithSize(chart, slotSizes[index] ?? chart.size),
  )
}

function moveChartToFullWidthSlot(
  charts: DashboardChart[],
  oldIndex: number,
  insertionIndex: number,
) {
  const movingChart = chartWithSize(charts[oldIndex], 'xl')
  const remainingCharts = charts.filter((_, index) => index !== oldIndex)
  const normalizedIndex =
    oldIndex < insertionIndex ? insertionIndex - 1 : insertionIndex
  const targetIndex = Math.max(
    0,
    Math.min(normalizedIndex, remainingCharts.length),
  )
  return [
    ...remainingCharts.slice(0, targetIndex),
    movingChart,
    ...remainingCharts.slice(targetIndex),
  ]
}

function moveChartBesideTarget(
  charts: DashboardChart[],
  oldIndex: number,
  targetId: string,
  side: 'left' | 'right',
) {
  const movingChart = chartWithSize(charts[oldIndex], 'md')
  const remainingCharts = charts
    .filter((_, index) => index !== oldIndex)
    .map((chart) =>
      chart.id === targetId ? chartWithSize(chart, 'md') : chart,
    )
  const targetIndex = remainingCharts.findIndex(
    (chart) => chart.id === targetId,
  )
  if (targetIndex === -1) return charts

  const insertIndex = side === 'left' ? targetIndex : targetIndex + 1
  return [
    ...remainingCharts.slice(0, insertIndex),
    movingChart,
    ...remainingCharts.slice(insertIndex),
  ]
}

function chartWithSize(chart: DashboardChart, size: DashboardChartSize) {
  if (chart.size === size) return chart
  return {
    ...chart,
    size,
    updatedAt: new Date().toISOString(),
  }
}

function findDashboardDropIntent(
  grid: HTMLElement | null,
  charts: DashboardChart[],
  activeId: string,
  dragCenter: { x: number; y: number } | null,
): DashboardDropIntent | null {
  if (!grid || !dragCenter) return null

  const chartIndexById = new Map(
    charts.map((chart, index) => [chart.id, index]),
  )
  const gridRect = grid.getBoundingClientRect()
  const entries = Array.from(
    grid.querySelectorAll<HTMLElement>('[data-dashboard-chart-id]'),
  )
    .map((node) => ({
      id: node.dataset.dashboardChartId ?? '',
      rect: node.getBoundingClientRect(),
    }))
    .filter(
      (entry) =>
        entry.id && entry.id !== activeId && chartIndexById.has(entry.id),
    )
    .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left)

  if (entries.length === 0) return null

  const sideDrop = entries.find((entry) => {
    if (dragCenter.y < entry.rect.top || dragCenter.y > entry.rect.bottom)
      return false
    const sideBand = Math.min(160, Math.max(72, entry.rect.width * 0.28))
    return (
      dragCenter.x <= entry.rect.left + sideBand ||
      dragCenter.x >= entry.rect.right - sideBand
    )
  })

  if (sideDrop) {
    const side =
      dragCenter.x < sideDrop.rect.left + sideDrop.rect.width / 2
        ? 'left'
        : 'right'
    return {
      kind: 'side',
      targetId: sideDrop.id,
      side,
    }
  }

  const rows: Array<{
    top: number
    bottom: number
    chartIds: string[]
  }> = []

  for (const entry of entries) {
    const row = rows.find(
      (candidate) =>
        entry.rect.top < candidate.bottom - 12 &&
        entry.rect.bottom > candidate.top + 12,
    )
    if (row) {
      row.top = Math.min(row.top, entry.rect.top)
      row.bottom = Math.max(row.bottom, entry.rect.bottom)
      row.chartIds.push(entry.id)
    } else {
      rows.push({
        top: entry.rect.top,
        bottom: entry.rect.bottom,
        chartIds: [entry.id],
      })
    }
  }

  rows.sort((a, b) => a.top - b.top)

  const firstRow = rows[0]
  if (dragCenter.y < firstRow.top + 32) {
    return {
      kind: 'row',
      index: 0,
      top: Math.max(0, firstRow.top - gridRect.top),
    }
  }

  for (let index = 0; index < rows.length - 1; index += 1) {
    const currentRow = rows[index]
    const nextRow = rows[index + 1]
    const boundary = (currentRow.bottom + nextRow.top) / 2
    if (Math.abs(dragCenter.y - boundary) <= 32) {
      return {
        kind: 'row',
        index: rowInsertionIndex(currentRow.chartIds, chartIndexById),
        top: boundary - gridRect.top,
      }
    }
  }

  const lastRow = rows[rows.length - 1]
  if (dragCenter.y > lastRow.bottom - 32) {
    return {
      kind: 'row',
      index: charts.length,
      top: lastRow.bottom - gridRect.top,
    }
  }

  return null
}

function rowInsertionIndex(
  chartIds: string[],
  chartIndexById: Map<string, number>,
) {
  return Math.max(...chartIds.map((id) => chartIndexById.get(id) ?? -1), -1) + 1
}

function rectCenter(
  rect:
    | {
        left: number
        top: number
        width: number
        height: number
      }
    | null
    | undefined,
) {
  if (!rect) return null
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  }
}

function chartPreviewSizeClass(size: DashboardChartSize) {
  if (size === 'sm') return 'h-56 w-full max-w-[18rem]'
  if (size === 'lg') return 'h-[30rem] max-h-full w-full max-w-[38rem]'
  if (size === 'xl') return 'h-full w-full'
  return 'h-72 w-full max-w-[30rem]'
}

function chartConfig(series: DashboardChartSeries[]): ChartConfig {
  return Object.fromEntries(
    series.map((item, index) => [
      `series${index}`,
      {
        label: item.name,
        color: item.color || CHART_COLORS[index % CHART_COLORS.length],
      },
    ]),
  )
}

function seriesLegendItems(series: DashboardChartSeries[]): ChartLegendItem[] {
  return series.map((item, index) => ({
    id: item.id,
    name: item.name,
    color: item.color || CHART_COLORS[index % CHART_COLORS.length],
  }))
}

function blankSeries(_index: number): DashboardChartSeries {
  return {
    id: newSeriesId(),
    name: '',
    column: '',
    color: null,
  }
}

function newSeriesId() {
  return (
    globalThis.crypto?.randomUUID?.() ?? `series-${Date.now()}-${Math.random()}`
  )
}

function seriesForEditor(series: DashboardChartSeries[]) {
  return series.length > 0 ? series : [blankSeries(0)]
}

function cleanDashboardSeries(
  series: DashboardChartSeries[],
): DashboardChartSeries[] {
  return series
    .map((item, index) => {
      const column = item.column.trim()
      const name = item.name.trim() || column
      return {
        ...item,
        id: item.id || `series-${index + 1}`,
        column,
        name,
        color: item.color || null,
      }
    })
    .filter((item) => item.column)
    .slice(0, 12)
}

function inferChartDefaults(
  chart: DashboardChart,
  rows: Record<string, unknown>[],
  columns: string[],
): DashboardChart {
  const numericColumns = columns.filter((column) =>
    isNumericColumn(rows, column),
  )
  const textColumns = columns.filter((column) => !isNumericColumn(rows, column))
  const firstCategory = textColumns[0] ?? columns[0] ?? ''
  const firstNumber =
    numericColumns[0] ??
    columns.find((column) => column !== firstCategory) ??
    columns[0] ??
    ''
  const secondNumber =
    numericColumns.find(
      (column) => column !== firstNumber && column !== firstCategory,
    ) ?? ''
  const next = { ...chart }
  let changed = false

  function assign<K extends keyof DashboardChart>(
    key: K,
    value: DashboardChart[K],
  ) {
    if (next[key] === value) return
    next[key] = value
    changed = true
  }

  if (chart.type === 'number') {
    if (!columns.includes(chart.metricColumn))
      assign('metricColumn', firstNumber)
    if (chart.labelColumn && !columns.includes(chart.labelColumn))
      assign('labelColumn', '')
    if (!columns.includes(chart.comparisonColumn)) {
      assign(
        'comparisonColumn',
        preferredComparisonColumn(columns, rows, firstNumber),
      )
    }
  } else if (chart.type === 'pie' || chart.type === 'donut') {
    if (!columns.includes(chart.categoryColumn))
      assign('categoryColumn', firstCategory)
    if (!columns.includes(chart.valueColumn)) assign('valueColumn', firstNumber)
  } else if (chart.type === 'scatter' || chart.type === 'bubble') {
    if (!columns.includes(chart.xAxis)) assign('xAxis', firstNumber)
    if (chart.labelColumn && !columns.includes(chart.labelColumn))
      assign('labelColumn', '')
    if (chart.type === 'bubble' && !columns.includes(chart.sizeColumn)) {
      assign('sizeColumn', secondNumber)
    }
    const validSeries = cleanDashboardSeries(chart.series).filter((series) =>
      columns.includes(series.column),
    )
    if (validSeries.length === 0 && secondNumber) {
      assign('series', [
        {
          ...blankSeries(0),
          column: secondNumber,
          name: labelFromColumn(secondNumber),
        },
      ])
    }
  } else if (chart.type !== 'table') {
    if (!columns.includes(chart.xAxis)) assign('xAxis', firstCategory)
    const validSeries = cleanDashboardSeries(chart.series).filter((series) =>
      columns.includes(series.column),
    )
    if (
      validSeries.length !==
      chart.series.filter((series) => series.column.trim()).length
    ) {
      assign('series', validSeries)
    }
    if (validSeries.length === 0 && firstNumber) {
      assign('series', [
        {
          ...blankSeries(0),
          column: firstNumber,
          name: labelFromColumn(firstNumber),
        },
      ])
    }
  }

  return changed ? next : chart
}

function labelFromColumn(column: string) {
  return column
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

function chartSupportsViewport(type: DashboardChartType) {
  return type !== 'number' && type !== 'pie' && type !== 'donut'
}

function fullViewport(total: number): ChartViewportRange {
  return { start: 0, end: Math.max(0, total) }
}

function defaultTableViewport(
  range: DashboardChartVisibleRange | undefined,
  total: number,
): ChartViewportRange {
  if (total <= 0) return fullViewport(total)
  if (!range || range.mode === 'all') {
    return {
      start: 0,
      end: Math.min(total, DEFAULT_TABLE_PAGE_SIZE),
    }
  }

  return defaultChartViewport(range, total)
}

function defaultChartViewport(
  range: DashboardChartVisibleRange | undefined,
  total: number,
): ChartViewportRange {
  const visibleRange = range ?? createDefaultVisibleRange()
  if (total <= 0 || visibleRange.mode === 'all') return fullViewport(total)

  if (visibleRange.mode === 'latest') {
    const windowSize = Math.min(total, Math.max(1, visibleRange.count))
    return {
      start: total - windowSize,
      end: total,
    }
  }

  if (visibleRange.mode === 'first') {
    return clampViewport(
      {
        start: 0,
        end: Math.min(total, Math.max(1, visibleRange.count)),
      },
      total,
    )
  }

  const start = Math.max(0, visibleRange.start - 1)
  const end = Math.max(start + 1, visibleRange.end)
  return clampViewport({ start, end }, total)
}

function viewportToVisibleRange(
  range: ChartViewportRange,
  total: number,
): DashboardChartVisibleRange {
  const windowSize = Math.max(1, range.end - range.start)

  if (range.start <= 0 && range.end >= total) {
    return createDefaultVisibleRange()
  }

  if (range.end >= total) {
    return {
      mode: 'latest',
      count: windowSize,
      start: 1,
      end: windowSize,
    }
  }

  if (range.start <= 0) {
    return {
      mode: 'first',
      count: windowSize,
      start: 1,
      end: windowSize,
    }
  }

  return {
    mode: 'custom',
    count: windowSize,
    start: range.start + 1,
    end: range.end,
  }
}

function minimumViewportWindow(total: number) {
  return Math.min(Math.max(4, Math.ceil(total * 0.08)), 24)
}

function clampViewport(
  range: ChartViewportRange,
  total: number,
): ChartViewportRange {
  if (total <= 0) return fullViewport(total)

  const minimumWindow = Math.min(total, minimumViewportWindow(total))
  const requestedWindow = Math.max(minimumWindow, range.end - range.start)
  const windowSize = Math.min(total, requestedWindow)
  const start = Math.max(0, Math.min(range.start, total - windowSize))

  return {
    start,
    end: start + windowSize,
  }
}

function zoomViewport(
  range: ChartViewportRange,
  total: number,
  direction: 'in' | 'out',
): ChartViewportRange {
  if (total <= 0) return fullViewport(total)

  const currentWindow = Math.max(1, range.end - range.start)
  const nextWindow =
    direction === 'in'
      ? Math.max(minimumViewportWindow(total), Math.floor(currentWindow * 0.6))
      : Math.min(total, Math.ceil(currentWindow * 1.6))
  const center = range.start + currentWindow / 2
  const start = Math.round(center - nextWindow / 2)

  return clampViewport({ start, end: start + nextWindow }, total)
}

function panViewport(
  range: ChartViewportRange,
  total: number,
  direction: -1 | 1,
): ChartViewportRange {
  const windowSize = Math.max(1, range.end - range.start)
  const delta = Math.max(1, Math.round(windowSize * 0.35)) * direction

  return clampViewport(
    {
      start: range.start + delta,
      end: range.end + delta,
    },
    total,
  )
}

function pageTableRange(
  range: ChartViewportRange,
  total: number,
  direction: -1 | 1,
): ChartViewportRange {
  const pageSize = Math.max(1, range.end - range.start)
  const start = range.start + pageSize * direction
  return clampTableRange({ start, end: start + pageSize }, total)
}

function resizeTableRange(
  range: ChartViewportRange,
  total: number,
  pageSize: number,
): ChartViewportRange {
  return clampTableRange(
    {
      start: range.start,
      end: range.start + Math.max(1, pageSize),
    },
    total,
  )
}

function clampTableRange(
  range: ChartViewportRange,
  total: number,
): ChartViewportRange {
  if (total <= 0) return fullViewport(total)

  const pageSize = Math.min(total, Math.max(1, range.end - range.start))
  const start = Math.max(0, Math.min(range.start, total - pageSize))

  return {
    start,
    end: Math.min(total, start + pageSize),
  }
}

function cartesianAxesFrame(
  data: Array<Record<string, unknown> & { category: string }>,
  seriesCount: number,
): ChartAxesFrame {
  const values = data.flatMap((item) =>
    Array.from({ length: seriesCount }, (_, index) =>
      numericValue(item[`series${index}`]),
    ),
  )

  return {
    yTicks: valueTicks(values),
    xTicks: categoryTicks(data.map((item) => item.category)),
  }
}

function horizontalBarAxesFrame(
  data: Array<Record<string, unknown> & { category: string }>,
  seriesCount: number,
): ChartAxesFrame {
  const values = data.flatMap((item) =>
    Array.from({ length: seriesCount }, (_, index) =>
      numericValue(item[`series${index}`]),
    ),
  )

  return {
    yTicks: categoryTicks(data.map((item) => item.category)).reverse(),
    xTicks: valueTicks(values).reverse(),
  }
}

function valueTicks(values: number[]): string[] {
  const finiteValues = values.filter((value) => Number.isFinite(value))
  if (finiteValues.length === 0) return ['1', '0']

  const min = Math.min(0, ...finiteValues)
  const max = Math.max(...finiteValues)
  if (max === min) return [formatAxisValue(max), formatAxisValue(min)]

  return [max, min + (max - min) / 2, min].map((value) =>
    formatAxisValue(value),
  )
}

function categoryTicks(values: string[]): string[] {
  if (values.length === 0) return []
  if (values.length === 1) return [values[0]]

  return [
    values[0],
    values[Math.floor(values.length / 2)],
    values[values.length - 1],
  ].map((value) => axisCategoryLabel(value))
}

function axisCategoryLabel(value: string) {
  const parsedDate = Date.parse(value)
  if (Number.isFinite(parsedDate)) {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    }).format(new Date(parsedDate))
  }

  return value
}

function resolveSeries(
  chart: DashboardChart,
  rows: Record<string, unknown>[],
  columns: string[],
  categoryColumn: string,
): DashboardChartSeries[] {
  const configured = chart.series.filter((series) =>
    columns.includes(series.column),
  )
  if (configured.length > 0) return configured

  const numericColumns = columns.filter(
    (column) => column !== categoryColumn && isNumericColumn(rows, column),
  )
  const fallbackColumn =
    numericColumns[0] ?? columns.find((column) => column !== categoryColumn)

  return fallbackColumn
    ? [{ id: 'series-1', name: fallbackColumn, column: fallbackColumn }]
    : [
        {
          id: 'series-1',
          name: columns[0] ?? 'value',
          column: columns[0] ?? 'value',
        },
      ]
}

function firstTextColumn(rows: Record<string, unknown>[], columns: string[]) {
  return columns.find((column) => !isNumericColumn(rows, column)) ?? ''
}

function firstNumericColumn(
  rows: Record<string, unknown>[],
  columns: string[],
) {
  return (
    columns.find((column) => isNumericColumn(rows, column)) ?? columns[0] ?? ''
  )
}

function preferredComparisonColumn(
  columns: string[],
  rows: Record<string, unknown>[],
  metricColumn: string,
) {
  return (
    columns.find(
      (column) =>
        column !== metricColumn &&
        /pct|percent|percentage|change|delta|growth|wow|mom|yoy/i.test(
          column,
        ) &&
        isNumericColumn(rows, column),
    ) ?? ''
  )
}

function isNumericColumn(rows: Record<string, unknown>[], column: string) {
  const sample = rows
    .map((row) => row[column])
    .find((value) => value !== null && value !== undefined && value !== '')

  return finiteNumericValue(sample) !== null
}

function finiteNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null

  const normalized = value.trim().replace(/,/g, '').replace(/%$/, '')
  if (!normalized) return null

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function numericValue(value: unknown) {
  return finiteNumericValue(value) ?? 0
}

function numberComparison(
  chart: DashboardChart,
  rows: Record<string, unknown>[],
  metricColumn: string,
) {
  const currentValue = finiteNumericValue(rows[0]?.[metricColumn])
  if (currentValue === null) return null

  if (chart.comparisonColumn) {
    const explicitValue = finiteNumericValue(rows[0]?.[chart.comparisonColumn])
    if (explicitValue !== null) {
      const mode = resolvedComparisonMode(chart, explicitValue)
      if (mode === 'previous-value') {
        if (explicitValue === 0) return null
        return {
          value:
            ((currentValue - explicitValue) / Math.abs(explicitValue)) * 100,
          display: 'percent' as const,
          source: 'column' as const,
        }
      }

      return {
        value:
          mode === 'percent' && Math.abs(explicitValue) <= 1
            ? explicitValue * 100
            : explicitValue,
        display:
          mode === 'percent' ? ('percent' as const) : ('number' as const),
        source: 'column' as const,
      }
    }
  }

  const previousValue = finiteNumericValue(rows[1]?.[metricColumn])
  if (previousValue === null || previousValue === 0) return null

  return {
    value: ((currentValue - previousValue) / Math.abs(previousValue)) * 100,
    display: 'percent' as const,
    source: 'previous-row' as const,
  }
}

function resolvedComparisonMode(chart: DashboardChart, value: number) {
  if (chart.comparisonMode && chart.comparisonMode !== 'auto')
    return chart.comparisonMode

  if (isPercentComparisonColumn(chart.comparisonColumn)) return 'percent'
  if (Math.abs(value) > 0 && Math.abs(value) <= 1) return 'percent'
  return 'previous-value'
}

function isPercentComparisonColumn(column: string) {
  return /pct|percent|percentage|rate|ratio|growth/i.test(column)
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number') return formatMetric(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return JSON.stringify(value)
}

function formatMetric(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 2,
    }).format(value)
  }

  if (typeof value === 'string' && Number.isFinite(Number(value))) {
    return formatMetric(Number(value))
  }

  return formatCell(value)
}

function formatAxisValue(value: number): string {
  const absolute = Math.abs(value)
  if (absolute >= 1_000_000_000)
    return `${formatCompact(value / 1_000_000_000)}B`
  if (absolute >= 1_000_000) return `${formatCompact(value / 1_000_000)}M`
  if (absolute >= 1_000) return `${formatCompact(value / 1_000)}K`

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: absolute >= 10 ? 0 : 2,
  }).format(value)
}

function formatComparisonChange(comparison: {
  value: number
  display: 'number' | 'percent'
}) {
  if (comparison.display === 'number')
    return formatMetric(Math.abs(comparison.value))
  return formatPercentChange(comparison.value)
}

function formatPercentChange(value: number) {
  const absolute = Math.abs(value)
  const fractionDigits = absolute >= 10 ? 0 : absolute >= 1 ? 1 : 2
  const formatted = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0,
  }).format(absolute)

  return `${formatted}%`
}

function formatCompact(value: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: Math.abs(value) >= 10 ? 0 : 1,
  }).format(value)
}
