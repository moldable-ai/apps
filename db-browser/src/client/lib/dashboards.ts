import type {
  Dashboard,
  DashboardChart,
  DashboardChartSeries,
  DashboardChartSize,
  DashboardChartType,
  DashboardChartVisibleRange,
  DashboardWorkspaceResponse,
} from '../../shared/types'

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

export function displayDashboardTitle(dashboard: Pick<Dashboard, 'title'>) {
  return dashboard.title.trim() || 'Untitled dashboard'
}

export function displayChartTitle(chart: Pick<DashboardChart, 'title'>) {
  return chart.title.trim() || 'Untitled chart'
}

export function createDashboard(index: number): Dashboard {
  const now = new Date().toISOString()

  return {
    id: newId(),
    title: index > 1 ? `Dashboard ${index}` : 'Dashboard',
    description: '',
    charts: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function createDashboardChart(
  index: number,
  overrides: Partial<DashboardChart> = {},
): DashboardChart {
  const now = new Date().toISOString()

  return {
    id: newId(),
    title: index > 1 ? `Chart ${index}` : 'Chart',
    description: '',
    type: 'bar',
    sql: '',
    size: 'md',
    xAxis: '',
    series: [],
    categoryColumn: '',
    valueColumn: '',
    colorColumn: '',
    sizeColumn: '',
    labelColumn: '',
    metricColumn: '',
    comparisonColumn: '',
    comparisonMode: 'auto',
    tableColumns: [],
    maxRows: 500,
    visibleRange: createDefaultVisibleRange(),
    showLegend: true,
    showAxes: true,
    showGrid: true,
    showDots: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function createDefaultVisibleRange(): DashboardChartVisibleRange {
  return {
    mode: 'all',
    count: 60,
    start: 1,
    end: 60,
  }
}

export function normalizeDashboardWorkspace(
  connectionId: string,
  workspace: DashboardWorkspaceResponse | null | undefined,
): DashboardWorkspaceResponse {
  const dashboards = workspace?.dashboards ?? []
  const activeDashboardId =
    dashboards.find(
      (dashboard) => dashboard.id === workspace?.activeDashboardId,
    )?.id ??
    dashboards[0]?.id ??
    null

  return {
    connectionId,
    activeDashboardId,
    dashboards,
    updatedAt: workspace?.updatedAt ?? new Date().toISOString(),
  }
}

export function renameDashboard(
  dashboard: Dashboard,
  title: string,
): Dashboard {
  return {
    ...dashboard,
    title,
    updatedAt: new Date().toISOString(),
  }
}

export function updateDashboardDescription(
  dashboard: Dashboard,
  description: string,
): Dashboard {
  return {
    ...dashboard,
    description,
    updatedAt: new Date().toISOString(),
  }
}

export function updateDashboardCharts(
  dashboard: Dashboard,
  charts: DashboardChart[],
): Dashboard {
  return {
    ...dashboard,
    charts,
    updatedAt: new Date().toISOString(),
  }
}

export function normalizeSeriesInput(value: string): DashboardChartSeries[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((entry, index) => {
      const [column, name] = entry.split(':').map((part) => part.trim())

      return {
        id: `series-${index + 1}`,
        column: column ?? entry,
        name: name || column || entry,
      }
    })
}

export function seriesToInput(series: DashboardChartSeries[]) {
  return series
    .map((item) =>
      item.name === item.column ? item.column : `${item.column}:${item.name}`,
    )
    .join(', ')
}

export const chartTypes: Array<{ value: DashboardChartType; label: string }> = [
  { value: 'bar', label: 'Bar' },
  { value: 'stacked-bar', label: 'Stacked bar' },
  { value: 'horizontal-bar', label: 'Horizontal bar' },
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'composed', label: 'Composed' },
  { value: 'pie', label: 'Pie' },
  { value: 'donut', label: 'Donut' },
  { value: 'scatter', label: 'Scatter' },
  { value: 'bubble', label: 'Bubble' },
  { value: 'number', label: 'Big number' },
  { value: 'table', label: 'Table' },
]

export const chartSizes: Array<{ value: DashboardChartSize; label: string }> = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Full width' },
]
