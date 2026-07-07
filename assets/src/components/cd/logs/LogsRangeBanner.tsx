import { CloseIcon, Flex } from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'
import {
  formatRangeTime,
  formatRangeWindow,
  LogsTimeRange,
} from './logsMetricsUtils'

export function LogsRangeBanner({
  rangeFilter,
  onClear,
}: {
  rangeFilter: LogsTimeRange | null
  onClear: () => void
}) {
  const theme = useTheme()

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        padding: `${theme.spacing.xsmall}px ${theme.spacing.large - 6}px 0`,
      }}
    >
      <div
        css={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing.xlarge,
          minHeight: 48,
          padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px`,
          borderRadius: theme.borderRadiuses.large,
          background: theme.colors['fill-two'],
          border: theme.borders['fill-two'],
        }}
      >
        {rangeFilter ? (
          <>
            <Flex
              gap="xsmall"
              grow={1}
            >
              <span
                css={{
                  ...theme.partials.text.body2,
                  color: theme.colors['text-xlight'],
                }}
              >
                Filtered to
              </span>
              <span css={{ ...theme.partials.text.code }}>
                {formatRangeTime(rangeFilter.start)} –{' '}
                {formatRangeTime(rangeFilter.end)}
              </span>
              <span
                css={{
                  ...theme.partials.text.body2,
                  color: theme.colors['text-long-form'],
                }}
              >
                {formatRangeWindow(rangeFilter.start, rangeFilter.end)}
              </span>
            </Flex>
            <ClearFilterButtonSC
              type="button"
              onClick={onClear}
            >
              <CloseIcon size={10} />
              Clear
            </ClearFilterButtonSC>
          </>
        ) : (
          <span
            css={{
              ...theme.partials.text.body2,
              color: theme.colors['text-light'],
            }}
          >
            Drag across the chart to filter by time
          </span>
        )}
      </div>
    </div>
  )
}

const ClearFilterButtonSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.buttonSmall,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  padding: `${theme.spacing.xxxsmall}px ${theme.spacing.xsmall}px`,
  borderRadius: theme.borderRadiuses.medium,
  border: theme.borders.input,
  cursor: 'pointer',
}))
