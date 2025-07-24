import { useResizeObserver } from '@pluralsh/design-system'
import usePersistedState from 'components/hooks/usePersistedState'
import { clamp } from 'lodash'
import { useState } from 'react'

const STORAGE_KEY = 'chatbot-panel-width'

export function useResizablePane(minWidthPx: number, maxWidthVw: number) {
  const clampNewWidth = (newWidth: number) =>
    // maxWidthVw could be smaller than minWidthPx on narrow screens
    clamp(
      newWidth,
      minWidthPx,
      Math.max(minWidthPx, window.innerWidth * (maxWidthVw / 100))
    )

  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, width: 0 })

  const [calculatedPanelWidth, setCalculatedPanelWidthState] =
    usePersistedState(STORAGE_KEY, minWidthPx, 1000)
  const setPanelWidth = (newWidth: number) =>
    setCalculatedPanelWidthState(clampNewWidth(newWidth))

  // clamps the current width if necessary when window size changes
  useResizeObserver({ current: document.body }, () =>
    setPanelWidth(calculatedPanelWidth)
  )

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
