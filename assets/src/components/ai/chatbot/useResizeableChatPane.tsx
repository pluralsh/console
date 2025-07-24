import { useResizeObserver } from '@pluralsh/design-system'
import usePersistedState from 'components/hooks/usePersistedState'
import { clamp } from 'lodash'
import { useState } from 'react'

const STORAGE_KEY = 'chatbot-panel-width'

export function useResizablePane(minWidthPx: number, maxWidthVw: number) {
  const [calculatedPanelWidth, setCalculatedPanelWidth] = usePersistedState(
    STORAGE_KEY,
    minWidthPx,
    1000
  )
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, width: 0 })

  const clampNewWidth = (newWidth: number) =>
    // maxWidthVw could be smaller than minWidthPx on narrow screens
    clamp(
      newWidth,
      minWidthPx,
      Math.max(minWidthPx, window.innerWidth * (maxWidthVw / 100))
    )

  // clamps the current width if necessary when window size changes
  useResizeObserver({ current: document.body }, () => {
    setCalculatedPanelWidth(clampNewWidth(calculatedPanelWidth))
  })

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
    if (isDragging)
      setCalculatedPanelWidth(
        clampNewWidth(dragStart.width + (dragStart.x - e.clientX))
      )
  }

  const dragHandleProps = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
  }

  return { calculatedPanelWidth, dragHandleProps, isDragging }
}
