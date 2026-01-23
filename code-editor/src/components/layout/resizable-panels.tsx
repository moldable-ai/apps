'use client'

import {
  type CSSProperties,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { cn, useWorkspace } from '@moldable-ai/ui'

// ============================================================================
// Types
// ============================================================================

type SetSizesAction = number[] | ((prev: number[]) => number[])

interface PanelGroupContextValue {
  orientation: 'horizontal' | 'vertical'
  sizes: number[]
  setSizes: (action: SetSizesAction) => void
  registerPanel: (id: string, index: number) => void
  startResize: (handleIndex: number) => void
}

interface PanelGroupProps {
  children: ReactNode
  orientation?: 'horizontal' | 'vertical'
  className?: string
  style?: CSSProperties
  /** Key for persistence */
  storageKey?: string
}

interface PanelProps {
  children: ReactNode
  /** Default size as percentage (0-100) */
  defaultSize?: number
  /** Minimum size as percentage */
  minSize?: number
  /** Maximum size as percentage */
  maxSize?: number
  /** Whether this panel can be collapsed */
  collapsible?: boolean
  /** Collapsed state (controlled) */
  collapsed?: boolean
  /** Called when collapsed state changes */
  onCollapsedChange?: (collapsed: boolean) => void
  className?: string
  style?: CSSProperties
  id?: string
}

interface PanelResizeHandleProps {
  className?: string
}

// ============================================================================
// Context
// ============================================================================

const PanelGroupContext = createContext<PanelGroupContextValue | null>(null)

function usePanelGroup() {
  const ctx = useContext(PanelGroupContext)
  if (!ctx) throw new Error('Panel must be used within PanelGroup')
  return ctx
}

// ============================================================================
// PanelGroup
// ============================================================================

export function PanelGroup({
  children,
  orientation = 'horizontal',
  className,
  style,
  storageKey,
}: PanelGroupProps) {
  const [sizes, setSizesState] = useState<number[]>([])
  const [isResizing, setIsResizing] = useState(false)
  const [_isLoaded, setIsLoaded] = useState(false)
  const panelCount = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const resizeHandleIndex = useRef<number | null>(null)
  const panelConfigs = useRef<
    Map<number, { minSize: number; maxSize: number }>
  >(new Map())
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { fetchWithWorkspace } = useWorkspace()

  // Load sizes from server on mount
  useEffect(() => {
    if (storageKey) {
      fetchWithWorkspace('/api/preferences')
        .then((res) => res.json())
        .then((prefs) => {
          const stored = prefs?.panelSizes?.[storageKey]
          if (
            Array.isArray(stored) &&
            stored.every((n) => typeof n === 'number')
          ) {
            setSizesState(stored)
          }
          setIsLoaded(true)
        })
        .catch(() => {
          setIsLoaded(true)
        })
    } else {
      setIsLoaded(true)
    }
  }, [storageKey, fetchWithWorkspace])

  // Save sizes to server (debounced)
  const setSizes = useCallback(
    (action: SetSizesAction) => {
      setSizesState((prev) => {
        const newSizes = typeof action === 'function' ? action(prev) : action

        if (storageKey) {
          // Debounce saves to avoid hammering the server while resizing
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
          }
          saveTimeoutRef.current = setTimeout(() => {
            fetchWithWorkspace('/api/preferences', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ panelSizes: { [storageKey]: newSizes } }),
            }).catch(() => {
              // Ignore save errors
            })
          }, 500)
        }

        return newSizes
      })
    },
    [storageKey, fetchWithWorkspace],
  )

  const registerPanel = useCallback((id: string, index: number) => {
    panelCount.current = Math.max(panelCount.current, index + 1)
  }, [])

  const startResize = useCallback((handleIndex: number) => {
    resizeHandleIndex.current = handleIndex
    setIsResizing(true)
  }, [])

  // Handle pointer move during resize
  // Using pointer events with capture for reliable tracking even when
  // the pointer moves outside the window or over iframes
  useEffect(() => {
    if (!isResizing) return

    const handlePointerMove = (e: PointerEvent) => {
      const container = containerRef.current
      if (!container || resizeHandleIndex.current === null) return

      const rect = container.getBoundingClientRect()
      const isHorizontal = orientation === 'horizontal'
      const totalSize = isHorizontal ? rect.width : rect.height
      const position = isHorizontal
        ? e.clientX - rect.left
        : e.clientY - rect.top
      const percentage = (position / totalSize) * 100

      const handleIdx = resizeHandleIndex.current

      // Calculate cumulative size up to this handle
      let cumulativeBeforeHandle = 0
      for (let i = 0; i < handleIdx; i++) {
        cumulativeBeforeHandle += sizes[i] || 0
      }

      // New size for panel before handle
      const newSizeLeft = Math.max(
        5,
        Math.min(95, percentage - cumulativeBeforeHandle),
      )

      // Adjust sizes
      const newSizes = [...sizes]
      const oldSizeLeft = newSizes[handleIdx] || 0
      const oldSizeRight = newSizes[handleIdx + 1] || 0
      const totalBothPanels = oldSizeLeft + oldSizeRight

      // Clamp to min/max
      const leftConfig = panelConfigs.current.get(handleIdx)
      const rightConfig = panelConfigs.current.get(handleIdx + 1)

      let clampedLeft = newSizeLeft
      if (leftConfig) {
        clampedLeft = Math.max(
          leftConfig.minSize,
          Math.min(leftConfig.maxSize, clampedLeft),
        )
      }

      let newSizeRight = totalBothPanels - clampedLeft
      if (rightConfig) {
        newSizeRight = Math.max(
          rightConfig.minSize,
          Math.min(rightConfig.maxSize, newSizeRight),
        )
        clampedLeft = totalBothPanels - newSizeRight
      }

      newSizes[handleIdx] = clampedLeft
      newSizes[handleIdx + 1] = newSizeRight

      setSizes(newSizes)
    }

    const stopResizing = () => {
      setIsResizing(false)
      resizeHandleIndex.current = null
    }

    // Use pointer events for better cross-browser/iframe handling
    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', stopResizing)
    // Also stop on pointercancel (e.g., touch interrupted) and when window loses focus
    document.addEventListener('pointercancel', stopResizing)
    window.addEventListener('blur', stopResizing)

    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', stopResizing)
      document.removeEventListener('pointercancel', stopResizing)
      window.removeEventListener('blur', stopResizing)
    }
  }, [isResizing, orientation, sizes, setSizes])

  // Store panel configs for min/max enforcement
  const setPanelConfig = useCallback(
    (index: number, minSize: number, maxSize: number) => {
      panelConfigs.current.set(index, { minSize, maxSize })
    },
    [],
  )

  // Index counters for panels and handles (reset on each render cycle)
  const panelIndexRef = useRef(0)
  const handleIndexRef = useRef(0)

  // Reset counters at start of each render
  panelIndexRef.current = 0
  handleIndexRef.current = 0

  const getNextPanelIndex = useCallback(() => {
    return panelIndexRef.current++
  }, [])

  const getNextHandleIndex = useCallback(() => {
    return handleIndexRef.current++
  }, [])

  const configContextValue = {
    setPanelConfig,
    getNextPanelIndex,
    getNextHandleIndex,
  }

  return (
    <PanelGroupContext.Provider
      value={{ orientation, sizes, setSizes, registerPanel, startResize }}
    >
      <div
        ref={containerRef}
        className={cn(
          'flex',
          orientation === 'horizontal' ? 'flex-row' : 'flex-col',
          isResizing && 'select-none',
          className,
        )}
        style={{
          ...style,
          cursor: isResizing
            ? orientation === 'horizontal'
              ? 'col-resize'
              : 'row-resize'
            : undefined,
        }}
      >
        <PanelConfigContext.Provider value={configContextValue}>
          {children}
        </PanelConfigContext.Provider>
      </div>
    </PanelGroupContext.Provider>
  )
}

// Internal context for panel config registration and index assignment
const PanelConfigContext = createContext<{
  setPanelConfig: (index: number, minSize: number, maxSize: number) => void
  getNextPanelIndex: () => number
  getNextHandleIndex: () => number
} | null>(null)

// ============================================================================
// Panel
// ============================================================================

export function Panel({
  children,
  defaultSize = 33.33,
  minSize = 0,
  maxSize = 100,
  collapsible = false,
  collapsed = false,
  onCollapsedChange,
  className,
  style,
  id,
}: PanelProps) {
  const { orientation, sizes, setSizes, registerPanel } = usePanelGroup()
  const configCtx = useContext(PanelConfigContext)
  const indexRef = useRef<number | null>(null)
  // Track the last non-collapsed size so we can restore it
  const lastSizeRef = useRef<number>(defaultSize)

  // Assign index on first render using context
  if (indexRef.current === null && configCtx) {
    indexRef.current = configCtx.getNextPanelIndex()
  }
  const index = indexRef.current ?? 0

  // Register panel and config
  useEffect(() => {
    registerPanel(id || `panel-${index}`, index)
    configCtx?.setPanelConfig(
      index,
      collapsible && collapsed ? 0 : minSize,
      maxSize,
    )
  }, [
    id,
    index,
    registerPanel,
    configCtx,
    minSize,
    maxSize,
    collapsible,
    collapsed,
  ])

  // Initialize size if not set
  useEffect(() => {
    if (sizes[index] === undefined) {
      setSizes((prev) => {
        const newSizes = [...prev]
        newSizes[index] = collapsible && collapsed ? 0 : defaultSize
        return newSizes
      })
    }
  }, [index, defaultSize, sizes, setSizes, collapsible, collapsed])

  // Track the last non-collapsed size whenever it changes
  useEffect(() => {
    const currentSize = sizes[index]
    if (currentSize !== undefined && currentSize >= 1) {
      lastSizeRef.current = currentSize
    }
  }, [sizes, index])

  // Handle controlled collapsed state
  useEffect(() => {
    if (collapsible) {
      const currentSize = sizes[index] ?? defaultSize
      const isCurrentlyCollapsed = currentSize < 1

      if (collapsed && !isCurrentlyCollapsed) {
        // Save current size before collapsing
        lastSizeRef.current = currentSize
        // Collapse
        setSizes((prev) => {
          const newSizes = [...prev]
          const freedSpace = newSizes[index] || 0
          newSizes[index] = 0
          // Distribute freed space to adjacent panel
          if (index > 0) {
            newSizes[index - 1] = (newSizes[index - 1] || 0) + freedSpace
          } else if (newSizes.length > 1) {
            newSizes[1] = (newSizes[1] || 0) + freedSpace
          }
          return newSizes
        })
      } else if (!collapsed && isCurrentlyCollapsed) {
        // Expand to the last saved size (or default if never set)
        const restoreSize = lastSizeRef.current
        setSizes((prev) => {
          const newSizes = [...prev]
          newSizes[index] = restoreSize
          // Take space from adjacent panel
          if (index > 0) {
            newSizes[index - 1] = Math.max(
              minSize,
              (newSizes[index - 1] || 0) - restoreSize,
            )
          } else if (newSizes.length > 1) {
            newSizes[1] = Math.max(minSize, (newSizes[1] || 0) - restoreSize)
          }
          return newSizes
        })
      }
    }
  }, [collapsed, collapsible, index, sizes, setSizes, defaultSize, minSize])

  // Notify parent of collapse state changes
  useEffect(() => {
    if (collapsible && onCollapsedChange) {
      const currentSize = sizes[index] ?? defaultSize
      const isCollapsed = currentSize < 1
      onCollapsedChange(isCollapsed)
    }
  }, [sizes, index, collapsible, onCollapsedChange, defaultSize])

  const size = sizes[index] ?? defaultSize
  const isHorizontal = orientation === 'horizontal'

  if (size < 1) {
    return null // Fully collapsed
  }

  return (
    <div
      className={cn('overflow-hidden', className)}
      style={{
        ...style,
        flex: `${size} 1 0%`,
        [isHorizontal ? 'minWidth' : 'minHeight']: 0,
      }}
    >
      {children}
    </div>
  )
}

// ============================================================================
// PanelResizeHandle
// ============================================================================

export function PanelResizeHandle({ className }: PanelResizeHandleProps) {
  const { orientation, startResize } = usePanelGroup()
  const configCtx = useContext(PanelConfigContext)
  const indexRef = useRef<number | null>(null)

  // Assign index on first render using context
  if (indexRef.current === null && configCtx) {
    indexRef.current = configCtx.getNextHandleIndex()
  }
  const index = indexRef.current ?? 0

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      // Capture pointer to ensure we get all events even if pointer leaves the element
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      startResize(index)
    },
    [index, startResize],
  )

  const isHorizontal = orientation === 'horizontal'

  return (
    <div
      className={cn(
        'bg-border hover:bg-primary/50 shrink-0 transition-colors',
        isHorizontal ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize',
        className,
      )}
      onPointerDown={handlePointerDown}
    />
  )
}
