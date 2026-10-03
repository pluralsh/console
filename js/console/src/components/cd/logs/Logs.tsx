import {
  Card,
  ChartIcon,
  Input,
  SearchIcon,
  Tooltip,
} from '@pluralsh/design-system'
import { useCallback, useMemo, useState } from 'react'

import { POLL_INTERVAL } from 'components/cluster/constants'
import { useThrottle } from 'components/hooks/useThrottle'
import { GqlError } from 'components/utils/Alert'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { TimeRangeControl } from 'components/utils/timerange/TimeRangeControl'
import {
  rangeDurationMs,
  TIME_RANGE_PRESETS,
  type TimeRange,
} from 'components/utils/timerange/timeRange'
import { useTimeRange } from 'components/utils/timerange/useTimeRange'
import {
  LogFacetInput,
  LogQueryOperator,
  LogTimeRange,
  useLogAggregationQuery,
} from 'generated/graphql'
import styled from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { LogsLabelsPicker, LogsQueryOperatorSelect } from './LogsFilters'
import { LogsLabels } from './LogsLabels'
import { LogsMetricsChart } from './LogsMetricsChart'
import { LogsTable } from './LogsTable'

export type LogsTimeRange = {
  start: Date
  end: Date
}

const LOG_PAGE_SIZE = 100

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const LOG_RANGE_PRESETS = TIME_RANGE_PRESETS.filter(
  ({ durationMs }) => durationMs <= WEEK_MS
)
const DEFAULT_LOG_RANGE: TimeRange = { live: true, durationMs: 15 * 60 * 1000 }

export function Logs({
  serviceId,
  clusterId,
}: {
  serviceId?: string
  clusterId?: string
}) {
  const { popToast } = useSimpleToast()

  const [labels, setLabels] = useState<LogFacetInput[]>([])
  const [q, setQ] = useState('')
  const throttledQ = useThrottle(q, 1000)
  const [queryOperator, setQueryOperator] = useState(LogQueryOperator.Or)
  const [showMetricsChart, setShowMetricsChart] = useState(true)
  const { range, now, revision, setRange, selectWindow } =
    useTimeRange(DEFAULT_LOG_RANGE)
  // Scrolling away from the newest logs pauses polling without changing the
  // range, so the table keeps its place until the user scrolls back up.
  const [following, setFollowing] = useState(true)
  const polling = range.live && following
  const durationSeconds = Math.round(rangeDurationMs(range) / 1000)

  const time = useMemo<LogTimeRange>(
    () =>
      range.live
        ? { duration: secondsToDuration(durationSeconds), reverse: false }
        : {
            after: range.start.toISOString(),
            before: range.end.toISOString(),
            reverse: false,
          },
    [range, durationSeconds]
  )

  const onRangeChange = useCallback(
    (next: TimeRange) => {
      setFollowing(true)
      setRange(next)
    },
    [setRange]
  )
  const onRangeSelect = useCallback(
    (start: Date, end: Date) => {
      setFollowing(true)
      selectWindow(start, end)
    },
    [selectWindow]
  )

  const { data, loading, error, fetchMore } = useLogAggregationQuery({
    variables: {
      clusterId,
      serviceId,
      query: throttledQ,
      limit: LOG_PAGE_SIZE,
      time,
      facets: labels,
      operator: queryOperator,
    },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    pollInterval: polling ? POLL_INTERVAL : 0,
    skip: !(clusterId || serviceId),
  })
  const initialLoading = !data && loading

  const logs = useMemo(
    () => data?.logAggregation?.filter(isNonNullable) ?? [],
    [data]
  )

  const addLabel = useCallback(
    (key: string, value: string) => {
      const alreadyAdded = labels.some((l) => l.key === key)
      if (!alreadyAdded) setLabels([...labels, { key, value }])
      popToast({
        content: `Filter ${key} ${alreadyAdded ? 'already added' : 'added'}`,
        severity: alreadyAdded ? 'danger' : 'success',
        delayTimeout: 2000,
      })
    },
    [labels, popToast]
  )
  const removeLabel = useCallback(
    (key: string) => setLabels(labels.filter((l) => l.key !== key)),
    [labels, setLabels]
  )

  return (
    <MainContentWrapperSC>
      <ToolbarSC>
        <LogsQueryOperatorSelect
          size="small"
          operator={queryOperator}
          setOperator={setQueryOperator}
          shrink={0}
        />
        <Input
          small
          placeholder="Filter logs"
          startIcon={<SearchIcon size={14} />}
          value={q}
          onChange={({ target: { value } }) => setQ(value)}
          css={{ flex: '1 1 200px', minWidth: 120, maxWidth: 420 }}
        />
        <LogsLabelsPicker
          size="small"
          logs={logs}
          clusterId={clusterId}
          serviceId={serviceId}
          query={throttledQ}
          time={time}
          addLabel={addLabel}
          selectedLabels={labels}
          shrink={1}
          minWidth={0}
        />
        <ToolbarEndSC>
          <TimeRangeControl
            value={range}
            now={now}
            onChange={onRangeChange}
            presets={LOG_RANGE_PRESETS}
            width={300}
          />
          <Tooltip
            label={showMetricsChart ? 'Hide histogram' : 'Show histogram'}
            placement="top"
          >
            <ChartToggleSC
              type="button"
              aria-pressed={showMetricsChart}
              aria-label={
                showMetricsChart ? 'Hide histogram' : 'Show histogram'
              }
              onClick={() => setShowMetricsChart((show) => !show)}
            >
              <ChartIcon size={14} />
            </ChartToggleSC>
          </Tooltip>
        </ToolbarEndSC>
      </ToolbarSC>
      <LogsLabels
        labels={labels}
        removeLabel={removeLabel}
      />
      {error ? (
        <GqlError error={error} />
      ) : (
        <Card
          height="100%"
          overflow="hidden"
        >
          <LogsBodySC>
            {showMetricsChart && (
              <LogsMetricsChart
                clusterId={clusterId}
                serviceId={serviceId}
                query={throttledQ}
                time={time}
                operator={queryOperator}
                facets={labels}
                windowSeconds={durationSeconds}
                onRangeSelect={onRangeSelect}
                pollInterval={polling ? POLL_INTERVAL : 0}
              />
            )}
            <LogsTableWrapSC>
              <LogsTable
                key={revision}
                logs={logs}
                loading={loading}
                initialLoading={initialLoading}
                fetchMore={fetchMore}
                queryLength={LOG_PAGE_SIZE}
                queryOperator={queryOperator}
                duration={secondsToDuration(durationSeconds)}
                rangeStart={range.live ? undefined : range.start}
                setFollowing={range.live ? setFollowing : undefined}
                addLabel={addLabel}
                labels={labels}
                clusterId={clusterId}
                serviceId={serviceId}
              />
            </LogsTableWrapSC>
          </LogsBodySC>
        </Card>
      )}
    </MainContentWrapperSC>
  )
}

// convert seconds to ISO 8601 duration string
export const secondsToDuration = (seconds: number) => {
  return `PT${seconds}S`
}

const MainContentWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  height: '100%',
  width: '100%',
}))

const ToolbarSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.small,
  minWidth: 0,
}))

const ToolbarEndSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  flexShrink: 0,
  gap: theme.spacing.xsmall,
  marginLeft: 'auto',
}))

const LogsBodySC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  height: '100%',
  overflow: 'hidden',
})

const LogsTableWrapSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  position: 'relative',
  zIndex: 0,
})

const ChartToggleSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  alignItems: 'center',
  backgroundColor: theme.colors['fill-one'],
  border: theme.borders.input,
  borderRadius: theme.borderRadiuses.medium,
  color: theme.colors['icon-xlight'],
  cursor: 'pointer',
  display: 'flex',
  height: 32,
  justifyContent: 'center',
  width: 32,
  '&[aria-pressed="true"]': {
    color: theme.colors['icon-light'],
  },
  '&:hover': {
    backgroundColor: theme.colors['fill-one-hover'],
  },
  '&:focus-visible': {
    outline: `1px solid ${theme.colors['border-outline-focused']}`,
  },
}))
