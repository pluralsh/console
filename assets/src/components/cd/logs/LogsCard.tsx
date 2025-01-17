import { Card, Flyover } from '@pluralsh/design-system'
import LogsScrollIndicator from 'components/cd/logs/LogsScrollIndicator'
import { GqlError } from 'components/utils/Alert'
import {
  LogFacetInput,
  LogLineFragment,
  LogTimeRange,
  useLogAggregationQuery,
} from 'generated/graphql'
import { memo, useCallback, useMemo, useState } from 'react'
import { LogContextPanel } from './LogContextPanel'
import { secondsToDuration } from './Logs'
import { LogsTable } from './LogsTable'
import { isEmpty } from 'lodash'

const LIMIT = 250
const POLL_INTERVAL = 10 * 1000

export const LogsCard = memo(function LogsCard({
  serviceId,
  clusterId,
  query,
  limit,
  time,
  labels,
  addLabel,
}: {
  serviceId?: string
  clusterId?: string
  query?: string
  limit?: number
  time?: LogTimeRange
  labels?: LogFacetInput[]
  addLabel?: (key: string, value: string) => void
}) {
  const [contextPanelOpen, setContextPanelOpen] = useState(false)
  const [logLine, setLogLine] = useState<Nullable<LogLineFragment>>(null)
  const [live, setLive] = useState(true)
  const [hasNextPage, setHasNextPage] = useState(true)

  const { data, loading, error, fetchMore, startPolling, stopPolling } =
    useLogAggregationQuery({
      variables: {
        clusterId,
        query,
        limit: limit || LIMIT,
        serviceId,
        time,
        facets: labels,
      },
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
      skip: !(clusterId || serviceId),
    })

  const logs = useMemo(
    () =>
      data?.logAggregation?.filter(
        (log): log is LogLineFragment => log !== null
      ) ?? [],
    [data]
  )

  const toggleLive = useCallback(() => {
    if (live) stopPolling()
    else startPolling(POLL_INTERVAL)
    setLive(!live)
  }, [live, startPolling, stopPolling])

  const fetchOlderLogs = useCallback(() => {
    if (loading || !hasNextPage) return
    if (live) toggleLive()
    fetchMore({
      variables: {
        limit: limit || LIMIT,
        time: {
          before: logs[logs.length - 1]?.timestamp,
          duration: time?.duration,
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
  }, [
    loading,
    hasNextPage,
    live,
    toggleLive,
    fetchMore,
    limit,
    logs,
    time?.duration,
  ])

  const initialLoading = !data && loading

  return error ? (
    <GqlError error={error} />
  ) : (
    <Card
      height="100%"
      overflow="hidden"
      header={{
        size: 'large',
        content: (
          <LogsScrollIndicator
            live={live}
            toggleLive={toggleLive}
          />
        ),
      }}
    >
      <LogsTable
        data={logs}
        loading={loading}
        initialLoading={initialLoading}
        fetchMore={fetchOlderLogs}
        hasNextPage={hasNextPage && logs.length >= (limit || LIMIT)}
        onRowClick={(_, row) => {
          setLogLine(row.original)
          setContextPanelOpen(true)
        }}
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
            curDuration={time?.duration ?? secondsToDuration(900)}
            queryVars={{
              clusterId,
              serviceId,
              query,
              facets: labels,
            }}
          />
        </Flyover>
      )}
    </Card>
  )
})
