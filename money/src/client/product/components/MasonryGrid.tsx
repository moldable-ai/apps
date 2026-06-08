import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'

export interface MasonryCell {
  key: string
  /** Column span (clamped to the live column count). Default 1. */
  colSpan?: number
  /** Row span in base-row units. Default 2. The size palette lives in the caller. */
  rowSpan?: number
  node: ReactNode
}

const ROW_PX = 88 // base row height — a "small" tile is 2 of these (≈192px)
const GAP = 16

function colCount(w: number): number {
  if (w < 640) return 1
  if (w < 1024) return 2
  return 3
}

/**
 * A **bento grid**, not a free-form masonry. Cards snap to a small palette of
 * standard sizes (1×2 stat, 1×3 gauge, 2×3 breakdown, 2×4 chart…), and the grid
 * has a fixed base row height. Because every tile is an integer number of the
 * same row/column unit, the pieces actually tessellate — `grid-auto-flow: dense`
 * backfills holes perfectly, which a natural-height masonry can never do (its
 * pieces are all slightly incompatible sizes, so gaps are unavoidable).
 *
 * Cards fill their tile (`h-full`); any slack reads as padding inside a card,
 * not a gap between cards. The size palette is chosen by the caller per card
 * kind — see `tileSize` in DashboardGrid.
 */
export function MasonryGrid({ cells }: { cells: MasonryCell[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(3)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setCols(colCount(el.clientWidth))
    const ro = new ResizeObserver(() => setCols(colCount(el.clientWidth)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridAutoRows: `${ROW_PX}px`,
        gridAutoFlow: 'row dense',
        gap: GAP,
      }}
    >
      {cells.map((cell) => (
        <div
          key={cell.key}
          style={{
            gridColumn: `span ${Math.min(cell.colSpan ?? 1, cols)}`,
            gridRow: `span ${cell.rowSpan ?? 2}`,
          }}
        >
          {cell.node}
        </div>
      ))}
    </div>
  )
}
