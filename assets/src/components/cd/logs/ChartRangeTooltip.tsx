import { Flex } from '@pluralsh/design-system'
import { useCallback, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from 'styled-components'

import { LogLevel, logLevelToColor } from './LogLine'
import { LegendColor } from './LogsLegend'
import {
  BucketRangeStats,
  CHART_CANVAS_HEIGHT,
  formatRangeTime,
  LogsTimeRange,
} from './logsMetricsUtils'

const X_AXIS_HEIGHT = 28

const STACK_ORDER = [
  LogLevel.SUCCESS,
  LogLevel.WARN,
  LogLevel.ERROR,
  LogLevel.INFO,
  LogLevel.UNKNOWN,
] as const

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
  stats: BucketRangeStats
  anchorRef: React.RefObject<HTMLElement | null>
  offsetX: number
}) {
  const theme = useTheme()
  const coords = usePortalCoords(anchorRef, offsetX)

  const visibleLevels = STACK_ORDER.filter((level) => stats.levels[level] > 0)

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
          flexDirection: 'column',
          gap: theme.spacing.medium,
          padding: theme.spacing.small,
        }}
      >
        {visibleLevels.length > 0 && (
          <Flex
            gap="medium"
            alignItems="flex-start"
            justifyContent="space-between"
          >
            <Flex
              direction="column"
              css={{
                ...theme.partials.text.caption,
                color: theme.colors['text-light'],
                gap: 10,
              }}
            >
              {visibleLevels.map((level) => (
                <Flex
                  gap="xsmall"
                  alignItems="center"
                  key={level}
                >
                  <LegendColor color={logLevelToColor[level]} />
                  <span>{level}</span>
                </Flex>
              ))}
            </Flex>
            <div
              css={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                alignItems: 'flex-end',
                ...theme.partials.text.caption,
                color: theme.colors['text-xlight'],
              }}
            >
              {visibleLevels.map((level) => (
                <span key={level}>{stats.levels[level]}</span>
              ))}
            </div>
          </Flex>
        )}
        <div
          css={{
            ...theme.partials.text.caption,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: theme.spacing.small,
            borderTop: theme.borders['fill-two'],

            '& > span:first-child': {
              color: theme.colors['text-long-form'],
            },

            '& > span:last-child': {
              color: theme.colors.text,
            },
          }}
        >
          <span>Total</span>
          <span>{stats.total}</span>
        </div>
      </div>
    </div>,
    document.body
  )
}
