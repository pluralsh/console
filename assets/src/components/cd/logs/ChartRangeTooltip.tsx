import { useTheme } from 'styled-components'
import { LogLevel, logLevelToColor } from './LogLine'
import { LegendColor } from './LogsLegend'
import {
  BucketRangeStats,
  CHART_CANVAS_HEIGHT,
  formatRangeTime,
  LogsTimeRange,
} from './logsMetricsUtils'
import { Flex } from '@pluralsh/design-system'

const X_AXIS_HEIGHT = 28

const STACK_ORDER = [
  LogLevel.SUCCESS,
  LogLevel.WARN,
  LogLevel.ERROR,
  LogLevel.INFO,
  LogLevel.UNKNOWN,
] as const

export function ChartRangeTooltip({
  range,
  stats,
  style,
}: {
  range: LogsTimeRange
  stats: BucketRangeStats
  style?: React.CSSProperties
}) {
  const theme = useTheme()

  const visibleLevels = STACK_ORDER.filter((level) => stats.levels[level] > 0)

  return (
    <div
      css={{
        position: 'absolute',
        top: CHART_CANVAS_HEIGHT + X_AXIS_HEIGHT,
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
      style={style}
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
    </div>
  )
}
