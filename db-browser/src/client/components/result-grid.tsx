import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@moldable-ai/ui'

interface ResultGridProps {
  columns: string[]
  rows: Record<string, unknown>[]
  selectedRowIndex?: number | null
  onSelectRow?: (index: number | null) => void
}

const ROW_NUMBER_WIDTH = 44
const MIN_COLUMN_WIDTH = 72
const MAX_DEFAULT_COLUMN_WIDTH = 360

function formatCell(value: unknown): string {
  if (value === null) return 'NULL'
  if (value === undefined) return ''
  if (typeof value === 'string') return value
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value)
  }

  return JSON.stringify(value)
}

function defaultColumnWidth(column: string) {
  return Math.min(
    MAX_DEFAULT_COLUMN_WIDTH,
    Math.max(140, column.length * 10 + 72),
  )
}

export function ResultGrid({
  columns,
  rows,
  selectedRowIndex = null,
  onSelectRow,
}: ResultGridProps) {
  const selectedRowRef = useRef<HTMLTableRowElement | null>(null)
  const [columnWidths, setColumnWidths] = useState<Record<number, number>>({})
  const widths = useMemo(
    () =>
      columns.map(
        (column, index) => columnWidths[index] ?? defaultColumnWidth(column),
      ),
    [columns, columnWidths],
  )
  const tableWidth = useMemo(
    () => ROW_NUMBER_WIDTH + widths.reduce((sum, width) => sum + width, 0),
    [widths],
  )

  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    })
  }, [selectedRowIndex])

  function startColumnResize(
    event: ReactPointerEvent<HTMLSpanElement>,
    columnIndex: number,
    startWidth: number,
  ) {
    event.preventDefault()
    event.stopPropagation()

    const startX = event.clientX
    const originalCursor = document.body.style.cursor
    const originalUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    function handlePointerMove(moveEvent: PointerEvent) {
      const nextWidth = Math.max(
        MIN_COLUMN_WIDTH,
        Math.round(startWidth + moveEvent.clientX - startX),
      )
      setColumnWidths((current) => ({
        ...current,
        [columnIndex]: nextWidth,
      }))
    }

    function handlePointerUp() {
      document.body.style.cursor = originalCursor
      document.body.style.userSelect = originalUserSelect
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  if (columns.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        This query did not return tabular data.
      </div>
    )
  }

  return (
    <div className="bg-background h-full min-h-0 overflow-auto pb-[var(--chat-safe-padding,0px)]">
      <Table
        className="table-fixed border-collapse text-[12px]"
        style={{ minWidth: tableWidth, width: '100%' }}
      >
        <colgroup>
          <col style={{ width: ROW_NUMBER_WIDTH }} />
          {widths.map((width, index) => (
            <col key={`${columns[index]}-${index}`} style={{ width }} />
          ))}
          <col />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead className="border-border/60 bg-muted/90 text-muted-foreground sticky top-0 z-20 h-7 border-b border-r px-2 text-left font-medium backdrop-blur">
              #
            </TableHead>
            {columns.map((column, index) => (
              <TableHead
                key={`${column}-${index}`}
                className="border-border/60 bg-muted/90 text-foreground sticky top-0 z-20 h-7 border-b border-r px-2 text-left font-medium backdrop-blur"
              >
                <span className="block truncate font-mono text-[11px]">
                  {column}
                </span>
                <span
                  role="separator"
                  aria-orientation="vertical"
                  className="hover:bg-primary/35 absolute inset-y-0 -right-1 z-20 w-2 cursor-col-resize"
                  onPointerDown={(event) =>
                    startColumnResize(event, index, widths[index])
                  }
                />
              </TableHead>
            ))}
            <TableHead className="border-border/60 bg-muted/90 sticky top-0 z-20 h-7 border-b backdrop-blur" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + 2}
                className="text-muted-foreground px-3 py-8 text-center text-xs"
              >
                No rows returned.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => {
              const isSelected = selectedRowIndex === index

              return (
                <TableRow
                  key={index}
                  ref={isSelected ? selectedRowRef : undefined}
                  className={cn(
                    'h-7 cursor-pointer align-middle transition',
                    isSelected
                      ? 'bg-primary/15'
                      : 'even:bg-muted/12 hover:bg-muted/35',
                  )}
                  onClick={() => onSelectRow?.(index)}
                >
                  <TableCell className="border-border/60 text-muted-foreground h-7 border-b border-r px-2 py-0 font-mono text-[11px]">
                    {index + 1}
                  </TableCell>
                  {columns.map((column, columnIndex) => (
                    <TableCell
                      key={`${index}-${column}-${columnIndex}`}
                      className="border-border/60 h-7 border-b border-r px-2 py-0 align-middle"
                    >
                      <div
                        className="w-full truncate font-mono text-[11px] leading-5"
                        title={formatCell(row[column])}
                      >
                        {formatCell(row[column])}
                      </div>
                    </TableCell>
                  ))}
                  <TableCell className="border-border/60 h-7 border-b px-0 py-0" />
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
