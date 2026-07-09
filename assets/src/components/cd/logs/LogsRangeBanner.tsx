import { CloseIcon, Flex } from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'
import { duration, formatDateTime } from 'utils/datetime'
import type { LogsTimeRange } from './Logs'

export function LogsRangeBanner({
  rangeFilter,
  onClear,
  hasBuckets,
}: {
  rangeFilter: LogsTimeRange | null
  onClear: () => void
  hasBuckets: boolean
}) {
  const theme = useTheme()

  if (!rangeFilter && !hasBuckets) return null
  if (!rangeFilter) return null

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
            {formatDateTime(rangeFilter.start, 'HH:mm:ss', true, true)} –{' '}
            {formatDateTime(rangeFilter.end, 'HH:mm:ss', true, true)}
          </span>
          <span
            css={{
              ...theme.partials.text.body2,
              color: theme.colors['text-long-form'],
            }}
          >
            {duration(rangeFilter.start, rangeFilter.end)} window
          </span>
        </Flex>
        <ClearFilterButtonSC
          type="button"
          onClick={onClear}
        >
          <CloseIcon size={10} />
          Clear
        </ClearFilterButtonSC>
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
