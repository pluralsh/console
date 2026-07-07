import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'

import {
  CHART_CANVAS_HEIGHT,
  formatRangeTime,
  LogsTimeRange,
} from './logsMetricsUtils'

const X_AXIS_HEIGHT = 28

function useFixedCoords(
  anchorRef: React.RefObject<HTMLElement | null>,
  offsetX: number
) {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null)

  useLayoutEffect(() => {
    const update = () => {
      const anchor = anchorRef.current
      if (!anchor) {
        setCoords(null)
        return
      }
      const rect = anchor.getBoundingClientRect()
      const x = rect.left + offsetX
      const y = rect.top + CHART_CANVAS_HEIGHT + X_AXIS_HEIGHT
      setCoords((prev) => (prev?.x === x && prev?.y === y ? prev : { x, y }))
    }

    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [anchorRef, offsetX])

  return coords
}

export function ChartRangeTooltip({
  anchorRef,
  left,
  range,
  count,
}: {
  anchorRef: React.RefObject<HTMLElement | null>
  left: number
  range: LogsTimeRange
  count: number
}) {
  const coords = useFixedCoords(anchorRef, left)

  if (!coords) return null

  return createPortal(
    <TooltipSC
      $x={coords.x}
      $y={coords.y}
    >
      <TimeSC>
        {formatRangeTime(range.start)} - {formatRangeTime(range.end)}
      </TimeSC>
      <TotalSC>
        <span>Total</span>
        <span>{count}</span>
      </TotalSC>
    </TooltipSC>,
    document.body
  )
}

const TooltipSC = styled.div<{ $x: number; $y: number }>(
  ({ theme, $x, $y }) => ({
    position: 'fixed',
    left: $x,
    top: $y,
    transform: 'translateX(-50%)',
    minWidth: 100,
    border: theme.borders['fill-two'],
    borderRadius: theme.borderRadiuses.medium,
    background: theme.colors['fill-one'],
    boxShadow: theme.boxShadows.moderate,
    pointerEvents: 'none',
    zIndex: theme.zIndexes.tooltip,
  })
)

const TimeSC = styled.div(({ theme }) => ({
  ...theme.partials.text.code,
  fontSize: 12,
  color: theme.colors['text-xlight'],
  padding: theme.spacing.xsmall,
}))

const TotalSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing.medium,
  padding: theme.spacing.xsmall,
  ...theme.partials.text.caption,
  '& > span:first-child': { color: theme.colors['text-long-form'] },
  '& > span:last-child': { color: theme.colors.text },
}))
