import { useResizeObserver } from '@pluralsh/design-system'
import usePersistedState from 'components/hooks/usePersistedState'
import { clamp, isNil } from 'lodash'
import { useCallback, useState } from 'react'

const STORAGE_KEY = 'chatbot-panel-width'

export function useResizablePane(
  minWidthPx: number,
  maxWidthVw: number,
  initialWidthVw?: number
) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, width: 0 })

  const [calculatedPanelWidth, setCalculatedPanelWidthState] =
    usePersistedState(STORAGE_KEY, minWidthPx, 1000)
  const setPanelWidth = useCallback(
    (newWidth: number) =>
      setCalculatedPanelWidthState(
        // maxWidthVw could be smaller than minWidthPx on narrow screens
        clamp(newWidth, minWidthPx, Math.max(minWidthPx, vwToPx(maxWidthVw)))
      ),
    [minWidthPx, maxWidthVw, setCalculatedPanelWidthState]
  )

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
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) setPanelWidth(dragStart.width + (dragStart.x - e.clientX))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      e.stopPropagation()
      setPanelWidth(calculatedPanelWidth + (e.key === 'ArrowLeft' ? 10 : -10))
    }
  }

  const dragHandleProps = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onKeyDown: handleKeyDown,
  }

  return { calculatedPanelWidth, dragHandleProps, isDragging }
}

const vwToPx = (vw: number) => window.innerWidth * (vw / 100)
