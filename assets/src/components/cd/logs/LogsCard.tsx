import {
  Card,
  Flex,
  Flyover,
  IconFrame,
  InfoOutlineIcon,
} from '@pluralsh/design-system'
import { LogsScrollIndicator } from 'components/cd/logs/LogsScrollIndicator'
import { GqlError } from 'components/utils/Alert'
import {
  LogFacetInput,
  LogLineFragment,
  useLogAggregationQuery,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { memo, useCallback, useMemo, useState } from 'react'
import { toISOStringOrUndef } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import { LogContextPanel } from './LogContextPanel'
import { secondsToDuration } from './Logs'
import { type LogsFiltersT } from './LogsFilters'
import LogsLegend from './LogsLegend'
import { LogsTable } from './LogsTable'

const LIMIT = 250
const POLL_INTERVAL = 10 * 1000

export const LogsCard = memo(function LogsCard({
  serviceId,
  clusterId,
  query,
  filters,
  labels,
  addLabel,
  showLegendTooltip = true,
}: {
  serviceId?: string
  clusterId?: string
  query?: string
  filters: LogsFiltersT
  labels?: LogFacetInput[]
  addLabel?: (key: string, value: string) => void
  showLegendTooltip?: boolean
}) {
  const { queryLength, sinceSeconds, date } = filters
  const [contextPanelOpen, setContextPanelOpen] = useState(false)
  const [logLine, setLogLine] = useState<Nullable<LogLineFragment>>(null)
  const [live, setLive] = useState(true)
  const [hasNextPage, setHasNextPage] = useState(true)

  const filterDateStr = toISOStringOrUndef(date)
  const duration = secondsToDuration(sinceSeconds)
  const { data, loading, error, fetchMore, startPolling, stopPolling } =
    useLogAggregationQuery({
      variables: {
        clusterId,
        query,
        limit: filters.queryLength || LIMIT,
        serviceId,
        time: {
          before: live ? undefined : filterDateStr,
          duration,
          reverse: false,
        },
        facets: labels,
      },
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
      skip: !(clusterId || serviceId),
    })

  const logs = useMemo(
    () => data?.logAggregation?.filter(isNonNullable) ?? [],
    [data]
  )

  const toggleLive = useCallback(() => {
    if (live) stopPolling()
    else startPolling(POLL_INTERVAL)
    setLive(!live)
  }, [live, startPolling, stopPolling])

  const fetchOlderLogs = useCallback(() => {
    if (loading || !hasNextPage) return
    fetchMore({
      variables: {
        limit: queryLength || LIMIT,
        time: {
          before: logs[logs.length - 1]?.timestamp,
          duration,
        },
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        // first log will be duplicate of last since range is inclusive
        const newLogs = fetchMoreResult.logAggregation?.slice(1) ?? []
        if (isEmpty(newLogs)) {
          setHasNextPage(false)
          return prev
        }
        return { logAggregation: [...(prev.logAggregation ?? []), ...newLogs] }
      },
    })
  }, [loading, hasNextPage, fetchMore, queryLength, logs, duration])

  const initialLoading = !data && loading

  const onScrollCapture = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const scrollTop = e.currentTarget.scrollTop
      if (scrollTop === 0 && !live) toggleLive()
      else if (scrollTop > 0 && live) toggleLive()
    },
    [live, toggleLive]
  )

  return error ? (
    <GqlError error={error} />
  ) : (
    <Card
      height="100%"
      overflow="hidden"
      header={{
        size: 'large',
        content: (
          <Flex
            width="100%"
            justify="space-between"
          >
            <LogsScrollIndicator
              live={live}
              toggleLive={toggleLive}
            />
            {showLegendTooltip && (
              <IconFrame
                icon={<InfoOutlineIcon color="icon-default" />}
                tooltip={<LogsLegend />}
                tooltipProps={{ placement: 'right' }}
              />
            )}
          </Flex>
        ),
      }}
    >
      <LogsTable
        data={logs}
        loading={loading}
        initialLoading={initialLoading}
        fetchMore={fetchOlderLogs}
        hasNextPage={hasNextPage && logs.length >= (queryLength || LIMIT)}
        onRowClick={(_, row) => {
          setLogLine(row.original)
          setContextPanelOpen(true)
        }}
        onScrollCapture={onScrollCapture}
      />
      {logLine && (
        <Flyover
          open={contextPanelOpen}
          onClose={() => setContextPanelOpen(false)}
          header="Log context"
          width={640}
        >
          <LogContextPanel
            logLine={logLine}
            addLabel={addLabel}
            curDuration={duration}
            queryVars={{
              clusterId,
              serviceId,
              facets: labels,
            }}
          />
        </Flyover>
      )}
    </Card>
  )
})
