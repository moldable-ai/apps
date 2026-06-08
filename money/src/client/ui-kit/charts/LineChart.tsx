import { useId, useState } from 'react'
import { type GradientStops, HERO_GRADIENT } from '../lib/colors'
import { useReducedMotion } from '../lib/motion'
import { approxLength, areaPath, scaleSeries, smoothPath } from './geometry'
import { useElementWidth } from './use-size'

export interface LinePoint {
  index: number
  value: number
  label?: string
}

interface LineChartProps {
  values: number[]
  labels?: string[]
  height?: number
  width?: number
  showArea?: boolean
  showEndpoint?: boolean
  showMinMax?: boolean
  gradient?: GradientStops
  strokeWidth?: number
  format?: (n: number) => string
  animate?: boolean
  onScrub?: (point: LinePoint | null) => void
  className?: string
}

/**
 * The signature hero chart: a smooth orange→violet gradient line with a soft
 * area fill, a single endpoint knob, optional min/max anchors (no axes/grid),
 * and optional cursor scrubbing. Built to the Robinhood/Copilot fingerprint.
 */
export function LineChart({
  values,
  labels,
  height = 168,
  width,
  showArea = true,
  showEndpoint = true,
  showMinMax = false,
  gradient = HERO_GRADIENT,
  strokeWidth = 2.5,
  format = (n) => String(Math.round(n)),
  animate = true,
  onScrub,
  className,
}: LineChartProps) {
  const [ref, measured] = useElementWidth<HTMLDivElement>(width ?? 480)
  const reduced = useReducedMotion()
  const [hover, setHover] = useState<number | null>(null)
  const gid = useId()
  const w = width ?? measured

  if (values.length < 2) {
    return <div ref={ref} className={className} style={{ height }} />
  }

  const padTop = showMinMax ? 22 : 10
  const padBottom = showMinMax ? 18 : 8
  const padX = Math.max(strokeWidth + 1, showEndpoint ? 10 : strokeWidth + 1)
  const innerH = height - padTop - padBottom
  const { pts, minIndex, maxIndex } = scaleSeries(values, {
    width: w,
    height: innerH,
    padX,
    padY: 2,
  })
  const shifted = pts.map((p) => ({ x: p.x, y: p.y + padTop }))
  const d = smoothPath(shifted, 0.2)
  const len = approxLength(shifted)
  const last = shifted[shifted.length - 1]
  const floorY = height - padBottom

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!onScrub && !showEndpoint) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    let nearest = 0
    let best = Infinity
    shifted.forEach((p, i) => {
      const dist = Math.abs(p.x - x)
      if (dist < best) {
        best = dist
        nearest = i
      }
    })
    setHover(nearest)
    onScrub?.({
      index: nearest,
      value: values[nearest],
      label: labels?.[nearest],
    })
  }
  function handleLeave() {
    setHover(null)
    onScrub?.(null)
  }

  const active = hover !== null ? shifted[hover] : null
  const drawStyle =
    animate && !reduced
      ? ({ ['--uk-draw-len' as string]: `${len}` } as React.CSSProperties)
      : undefined
  // Remount the animated paths when the series identity changes so the draw-in
  // keyframe replays (e.g. on a timeframe switch) instead of snapping.
  const dataKey = `${values.length}:${values[0]}:${values[values.length - 1]}`

  return (
    <div
      ref={ref}
      className={className}
      style={{ width: width ?? '100%', height }}
    >
      <svg
        width={w}
        height={height}
        viewBox={`0 0 ${w} ${height}`}
        role="img"
        aria-hidden
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        style={{
          touchAction: 'none',
          cursor: onScrub ? 'crosshair' : 'default',
        }}
      >
        <defs>
          <linearGradient id={`line-${gid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={gradient.from} />
            <stop offset="100%" stopColor={gradient.to} />
          </linearGradient>
          <linearGradient id={`area-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradient.from} stopOpacity={0.22} />
            <stop offset="85%" stopColor={gradient.to} stopOpacity={0} />
          </linearGradient>
        </defs>

        {showArea ? (
          <path
            key={`area-${dataKey}`}
            d={areaPath(d, shifted, floorY)}
            fill={`url(#area-${gid})`}
            className={animate && !reduced ? 'uk-fade' : undefined}
            style={
              animate && !reduced ? { animationDelay: '260ms' } : undefined
            }
          />
        ) : null}

        <path
          key={`line-${dataKey}`}
          d={d}
          fill="none"
          stroke={`url(#line-${gid})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={animate && !reduced ? 'uk-draw' : undefined}
          style={drawStyle}
        />

        {/* min / max anchors replace the axis */}
        {showMinMax ? (
          <>
            <MinMaxLabel
              p={shifted[maxIndex]}
              text={format(values[maxIndex])}
              place="above"
              width={w}
            />
            <MinMaxLabel
              p={shifted[minIndex]}
              text={format(values[minIndex])}
              place="below"
              width={w}
            />
          </>
        ) : null}

        {/* hover scrub guide */}
        {active ? (
          <>
            <line
              x1={active.x}
              y1={padTop - 4}
              x2={active.x}
              y2={floorY + 2}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <circle
              cx={active.x}
              cy={active.y}
              r={4}
              fill={gradient.to}
              stroke="var(--card)"
              strokeWidth={2}
            />
          </>
        ) : null}

        {/* endpoint knob */}
        {showEndpoint && hover === null ? (
          <>
            <circle
              cx={last.x}
              cy={last.y}
              r={9}
              fill={gradient.to}
              opacity={0.14}
            />
            <circle
              cx={last.x}
              cy={last.y}
              r={4}
              fill={gradient.to}
              stroke="var(--card)"
              strokeWidth={2}
            />
          </>
        ) : null}
      </svg>
    </div>
  )
}

function MinMaxLabel({
  p,
  text,
  place,
  width,
}: {
  p: { x: number; y: number }
  text: string
  place: 'above' | 'below'
  width: number
}) {
  const dy = place === 'above' ? -9 : 15
  // Keep the label inside the plot: right-align near the right edge, left-align
  // near the left, centered otherwise.
  let anchor: 'start' | 'middle' | 'end' = 'middle'
  let x = p.x
  if (p.x < 34) {
    anchor = 'start'
    x = 2
  } else if (p.x > width - 34) {
    anchor = 'end'
    x = width - 2
  }
  return (
    <text
      x={x}
      y={p.y + dy}
      textAnchor={anchor}
      className="uk-nums"
      style={{ fontSize: 11, fontWeight: 500, fill: 'var(--muted-foreground)' }}
    >
      {text}
    </text>
  )
}

/** Net-worth style area chart — a LineChart preset with a fuller fill. */
export function AreaChart(props: Omit<LineChartProps, 'showArea'>) {
  return (
    <LineChart {...props} showArea showEndpoint={props.showEndpoint ?? false} />
  )
}
