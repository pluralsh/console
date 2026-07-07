import { useCallback, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from 'styled-components'

import {
  CHART_CANVAS_HEIGHT,
  formatRangeTime,
  LogsTimeRange,
} from './logsMetricsUtils'

const X_AXIS_HEIGHT = 28

function usePortalCoords(
  anchorRef: React.RefObject<HTMLElement | null>,
  offsetX: number
) {
  const cached = useRef<{ x: number; y: number } | null>(null)

  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener('scroll', onStoreChange, true)
    window.addEventListener('resize', onStoreChange)
    return () => {
      window.removeEventListener('scroll', onStoreChange, true)
      window.removeEventListener('resize', onStoreChange)
    }
  }, [])

  const getSnapshot = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) {
      cached.current = null
      return null
    }
    const rect = anchor.getBoundingClientRect()
    const x = rect.left + offsetX
    const y = rect.top + CHART_CANVAS_HEIGHT + X_AXIS_HEIGHT
    if (cached.current?.x === x && cached.current?.y === y)
      return cached.current
    cached.current = { x, y }
    return cached.current
  }, [anchorRef, offsetX])

  return useSyncExternalStore(subscribe, getSnapshot, () => null)
}

export function ChartRangeTooltip({
  range,
  stats,
  anchorRef,
  offsetX,
}: {
  range: LogsTimeRange
  stats: number
  anchorRef: React.RefObject<HTMLElement | null>
  offsetX: number
}) {
  const theme = useTheme()
  const coords = usePortalCoords(anchorRef, offsetX)

  if (!coords) return null

  return createPortal(
    <div
      css={{
        position: 'fixed',
        left: coords.x,
        top: coords.y,
        transform: 'translate(-50%, 0)',
        minWidth: 195,
        border: theme.borders['fill-two'],
        borderRadius: theme.borderRadiuses.medium,
        background: theme.colors['fill-one'],
        boxShadow: theme.boxShadows.moderate,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: theme.zIndexes.tooltip,
      }}
    >
      <div
        css={{
          padding: `${theme.spacing.xsmall}px 10px`,
          ...theme.partials.text.code,
          fontSize: 12,
          color: theme.colors['text-xlight'],
        }}
      >
        {formatRangeTime(range.start)} - {formatRangeTime(range.end)}
      </div>
      <div
        css={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing.medium,
          padding: theme.spacing.small,
          ...theme.partials.text.caption,

          '& > span:first-child': {
            color: theme.colors['text-long-form'],
          },

          '& > span:last-child': {
            color: theme.colors.text,
          },
        }}
      >
        <span>Total</span>
        <span>{stats}</span>
      </div>
    </div>,
    document.body
  )
}
