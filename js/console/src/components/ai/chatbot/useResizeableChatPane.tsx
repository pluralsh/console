import { useResizeObserver } from '@pluralsh/design-system'
import usePersistedState from 'components/hooks/usePersistedState'
import { clamp, isNil } from 'lodash'
import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'chatbot-panel-width'

export type ResizablePaneOptions = {
  defaultWidthPx?: number
  storageKey?: string
  maxWidthPx?: number
  // the pane edge the drag handle sits on
  handleEdge?: 'left' | 'right'
}

export function useResizablePane(
  minWidthPx: number,
  maxWidthVw: number,
  initialWidthVw?: number,
  {
    defaultWidthPx = minWidthPx,
    storageKey = STORAGE_KEY,
    maxWidthPx = Number.POSITIVE_INFINITY,
    handleEdge = 'left',
  }: ResizablePaneOptions = {}
) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, width: 0 })
  const direction = handleEdge === 'left' ? -1 : 1

  const [storedPanelWidth, setCalculatedPanelWidthState] = usePersistedState(
    storageKey,
    defaultWidthPx,
    1000
  )
  const maxPanelWidth = Math.max(
    minWidthPx,
    Math.min(maxWidthPx, vwToPx(maxWidthVw))
  )
  const calculatedPanelWidth = clamp(
    storedPanelWidth,
    minWidthPx,
    maxPanelWidth
  )
  const setPanelWidth = useCallback(
    (newWidth: number) =>
      setCalculatedPanelWidthState(
        // The maximum could be smaller than the minimum on narrow screens.
        clamp(newWidth, minWidthPx, maxPanelWidth)
      ),
    [maxPanelWidth, minWidthPx, setCalculatedPanelWidthState]
  )

  useEffect(() => {
    if (storedPanelWidth !== calculatedPanelWidth)
      setCalculatedPanelWidthState(calculatedPanelWidth)
  }, [calculatedPanelWidth, setCalculatedPanelWidthState, storedPanelWidth])

  // clamps the current width if necessary when window size changes
  useResizeObserver({ current: document.body }, () =>
    setPanelWidth(calculatedPanelWidth)
  )

  // snap to initial when provided, otherwise return to previous width before initial was set
  const [prevInitialWidthVw, setPrevInitialWidthVw] =
    useState<Nullable<number>>(null)
  const [prevWidth, setPrevWidth] = useState<number>(calculatedPanelWidth)
  if (initialWidthVw !== prevInitialWidthVw) {
    setPrevInitialWidthVw(initialWidthVw)
    if (!isNil(initialWidthVw)) {
      setPrevWidth(calculatedPanelWidth)
      setPanelWidth(vwToPx(initialWidthVw))
    } else {
      setPanelWidth(prevWidth)
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX, width: calculatedPanelWidth })
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const endDrag = () => setIsDragging(false)
  const handlePointerUp = (e: React.PointerEvent) => {
    endDrag()
    if (e.currentTarget.hasPointerCapture?.(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId)
  }
  const handlePointerCancel = (e: React.PointerEvent) => {
    setIsDragging(false)
    if (e.currentTarget.hasPointerCapture?.(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging)
      setPanelWidth(dragStart.width + direction * (e.clientX - dragStart.x))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      e.stopPropagation()
      setPanelWidth(
        calculatedPanelWidth + direction * (e.key === 'ArrowRight' ? 10 : -10)
      )
    }
  }

  const dragHandleProps = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
    onLostPointerCapture: endDrag,
    onKeyDown: handleKeyDown,
  }

  return { calculatedPanelWidth, dragHandleProps, isDragging }
}

const vwToPx = (vw: number) => window.innerWidth * (vw / 100)
