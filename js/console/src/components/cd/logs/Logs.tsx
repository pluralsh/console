import {
  Card,
  ChartIcon,
  Flex,
  Input2,
  SearchIcon,
} from '@pluralsh/design-system'
import { useCallback, useMemo, useState } from 'react'

import { POLL_INTERVAL } from 'components/cluster/constants'
import { useThrottle } from 'components/hooks/useThrottle'
import { GqlError } from 'components/utils/Alert'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { LogFacetInput, useLogAggregationQuery } from 'generated/graphql'
import styled from 'styled-components'
import { toISOStringOrUndef } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import {
  DEFAULT_LOG_FILTERS,
  LogsDateDropdown,
  LogsFiltersT,
  LogsLabelsPicker,
  LogsQueryOperatorSelect,
  LogsSinceSecondsSelect,
} from './LogsFilters'
import { LogsLabels } from './LogsLabels'
import { LogsMetricsChart } from './LogsMetricsChart'
import { LogsRangeBanner } from './LogsRangeBanner'
import { LogsStreamingStatus } from './LogsStreamingStatus'
import { LogsTable } from './LogsTable'

export type LogsTimeRange = {
  start: Date
  end: Date
}

export const DEFAULT_LOG_QUERY_LENGTH = 250

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
  const [filters, setFilters] = useState<LogsFiltersT>(DEFAULT_LOG_FILTERS)
  const [rangeFilter, setRangeFilter] = useState<LogsTimeRange | null>(null)
  const [chartHasBuckets, setChartHasBuckets] = useState(false)
  const [showMetricsChart, setShowMetricsChart] = useState(true)

  const [live, setLiveState] = useState(true)
  const setLive = useCallback((live: boolean) => {
    setLiveState(live)
    if (live) {
      setFilters((prev) => ({ ...prev, date: null }))
      setRangeFilter(null)
    }
  }, [])

  const clearRangeFilter = useCallback(() => setRangeFilter(null), [])

  const handleRangeSelect = useCallback((range: LogsTimeRange) => {
    setLiveState(false)
    setRangeFilter(range)
  }, [])

  const chartTime = useMemo(
    () => ({
      before: live ? undefined : toISOStringOrUndef(filters.date, true),
      duration: secondsToDuration(filters.sinceSeconds),
      reverse: false,
    }),
    [live, filters.date, filters.sinceSeconds]
  )

  const time = useMemo(() => {
    if (rangeFilter) {
      return {
        after: toISOStringOrUndef(rangeFilter.start),
        before: toISOStringOrUndef(rangeFilter.end),
        reverse: false,
      }
    }
    return chartTime
  }, [rangeFilter, chartTime])

  const timeFiltersDisabled = live || !!rangeFilter

  const { data, loading, error, fetchMore } = useLogAggregationQuery({
    variables: {
      clusterId,
      serviceId,
      query: throttledQ,
      limit: filters.queryLength || DEFAULT_LOG_QUERY_LENGTH,
      time,
      facets: labels,
      operator: filters.queryOperator,
    },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    pollInterval: live ? POLL_INTERVAL : 0,
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
      <Flex gap="small">
        <LogsQueryOperatorSelect
          operator={filters.queryOperator}
          setOperator={(queryOperator) =>
            setFilters({ ...filters, queryOperator })
          }
        />
        <Input2
          placeholder="Filter logs"
          startIcon={<SearchIcon size={14} />}
          value={q}
          onChange={({ target: { value } }) => setQ(value)}
          css={{ flexGrow: 1 }}
        />
        <LogsLabelsPicker
          logs={logs}
          clusterId={clusterId}
          serviceId={serviceId}
          query={throttledQ}
          time={time}
          addLabel={addLabel}
          selectedLabels={labels}
        />
      </Flex>
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
          header={{
            size: 'large',
            headerProps: {
              style: { textTransform: 'none', overflow: 'visible' },
            },
            content: (
              <StretchedFlex>
                <Flex gap="small">
                  <LogsSinceSecondsSelect
                    sinceSeconds={filters.sinceSeconds}
                    setSinceSeconds={(sinceSeconds) =>
                      setFilters({ ...filters, sinceSeconds })
                    }
                    disabled={timeFiltersDisabled}
                  />
                  <LogsDateDropdown
                    initialDate={filters.date}
                    setDate={(date) => setFilters({ ...filters, date })}
                    setLive={setLive}
                    disabled={timeFiltersDisabled}
                  />
                </Flex>
                <Flex gap="small">
                  <MetricsChartToggleSC
                    type="button"
                    onClick={() => setShowMetricsChart((show) => !show)}
                  >
                    <ChartIcon size={14} />
                    {showMetricsChart ? 'Hide' : 'Show'}
                  </MetricsChartToggleSC>
                  <LogsStreamingStatus
                    live={live}
                    setLive={setLive}
                  />
                </Flex>
              </StretchedFlex>
            ),
          }}
        >
          <LogsBodySC>
            <LogsRangeBanner
              rangeFilter={rangeFilter}
              onClear={clearRangeFilter}
              hasBuckets={chartHasBuckets}
            />
            {showMetricsChart && (
              <LogsMetricsChart
                clusterId={clusterId}
                serviceId={serviceId}
                query={throttledQ}
                time={chartTime}
                operator={filters.queryOperator}
                facets={labels}
                sinceSeconds={filters.sinceSeconds}
                rangeFilter={rangeFilter}
                onRangeSelect={handleRangeSelect}
                onHasBucketsChange={setChartHasBuckets}
                pollInterval={live ? POLL_INTERVAL : 0}
              />
            )}
            <LogsTableWrapSC>
              <LogsTable
                logs={logs}
                loading={loading}
                initialLoading={initialLoading}
                fetchMore={fetchMore}
                filters={filters}
                live={live}
                setLive={setLive}
                addLabel={addLabel}
                labels={labels}
                clusterId={clusterId}
                serviceId={serviceId}
                rangeFilter={rangeFilter}
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
  gap: theme.spacing.medium,
  height: '100%',
  width: '100%',
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

const MetricsChartToggleSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.body2Bold,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  minHeight: 32,
  padding: `${theme.spacing.xxsmall}px ${theme.spacing.small}px`,
  borderRadius: theme.borderRadiuses.medium,
  border: theme.borders.input,
  backgroundColor: theme.colors['fill-one'],
  color: theme.colors['text-xlight'],
  cursor: 'pointer',
}))
