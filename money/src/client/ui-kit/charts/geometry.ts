/**
 * Pure geometry helpers shared by the SVG chart primitives. No React here.
 */

export interface Pt {
  x: number
  y: number
}

export interface ScaleResult {
  pts: Pt[]
  min: number
  max: number
  minIndex: number
  maxIndex: number
}

export interface ScaleOptions {
  width: number
  height: number
  padX?: number
  padY?: number
  /** Force the y-domain floor (e.g. 0 for bar-like series). */
  baseline?: number
}

/**
 * Map a series of numbers into SVG coordinates. y is inverted (0 at top).
 * A flat series renders along the vertical middle.
 */
export function scaleSeries(values: number[], opts: ScaleOptions): ScaleResult {
  const { width, height, padX = 0, padY = 6, baseline } = opts
  const n = values.length
  if (n === 0) {
    return { pts: [], min: 0, max: 0, minIndex: -1, maxIndex: -1 }
  }
  const min = baseline ?? Math.min(...values)
  let max = Math.max(...values)
  if (baseline !== undefined) max = Math.max(max, baseline)
  let minIndex = 0
  let maxIndex = 0
  values.forEach((v, i) => {
    if (v <= values[minIndex]) minIndex = i
    if (v >= values[maxIndex]) maxIndex = i
  })
  const span = max - min || 1
  const innerW = Math.max(0, width - padX * 2)
  const innerH = Math.max(0, height - padY * 2)
  const stepX = n > 1 ? innerW / (n - 1) : 0
  const pts = values.map((v, i) => ({
    x: padX + (n > 1 ? i * stepX : innerW / 2),
    y: padY + innerH - ((v - min) / span) * innerH,
  }))
  return { pts, min, max, minIndex, maxIndex }
}

/**
 * Smooth path through points using a Catmull-Rom → cubic-bezier conversion.
 * `tension` 0 = straight segments, ~0.2 = gentle monotone-ish curve.
 */
export function smoothPath(pts: Pt[], tension = 0.2): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`
  if (pts.length === 2)
    return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`

  let d = `M ${pts[0].x},${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + ((p2.x - p0.x) / 6) * (tension * 6)
    const c1y = p1.y + ((p2.y - p0.y) / 6) * (tension * 6)
    const c2x = p2.x - ((p3.x - p1.x) / 6) * (tension * 6)
    const c2y = p2.y - ((p3.y - p1.y) / 6) * (tension * 6)
    d += ` C ${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`
  }
  return d
}

/** Straight polyline path. */
export function linePath(pts: Pt[]): string {
  if (pts.length === 0) return ''
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ')
}

/** Close a line path into a filled area down to `floorY`. */
export function areaPath(d: string, pts: Pt[], floorY: number): string {
  if (pts.length === 0) return ''
  const first = pts[0]
  const last = pts[pts.length - 1]
  return `${d} L ${last.x.toFixed(2)},${floorY.toFixed(2)} L ${first.x.toFixed(2)},${floorY.toFixed(2)} Z`
}

/** Approximate path length for stroke-dash draw-in animation. */
export function approxLength(pts: Pt[]): number {
  let len = 0
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  }
  return Math.ceil(len * 1.05) || 1
}

/** Polar → cartesian for arc/donut math (0deg = 12 o'clock, clockwise). */
export function polar(cx: number, cy: number, r: number, angleDeg: number): Pt {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}
