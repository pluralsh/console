import { Flyover, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import {
  LogAggregationQueryResult,
  LogFacetInput,
  LogLineFragment,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useCallback, useRef, useState } from 'react'
import { useTheme } from 'styled-components'
import { LogContextPanel } from './LogContextPanel'
import { LogLine } from './LogLine'
import { DEFAULT_LOG_QUERY_LENGTH, secondsToDuration } from './Logs'
import { LogsFlyoverFiltersT } from './LogsFilters'

const columnHelper = createColumnHelper<LogLineFragment>()

export function LogsTable({
  logs,
  loading,
  initialLoading,
  filters,
  fetchMore,
  setLive,
  addLabel,
  labels,
  clusterId,
  serviceId,
}: {
  logs: LogLineFragment[]
  loading?: boolean
  initialLoading?: boolean
  filters: LogsFlyoverFiltersT
  fetchMore: LogAggregationQueryResult['fetchMore']
  live: boolean
  setLive: (live: boolean) => void
  addLabel: (key: string, value: string) => void
  labels: LogFacetInput[]
  clusterId?: string
  serviceId?: string
}) {
  const theme = useTheme()
  const [contextPanelOpen, setContextPanelOpen] = useState(false)
  const [logLine, setLogLine] = useState<Nullable<LogLineFragment>>(null)
  const [hasNextPage, setHasNextPage] = useState(true)
  const { queryLength, sinceSeconds } = filters
  const duration = secondsToDuration(sinceSeconds)

  const fetchOlderLogs = useCallback(() => {
    if (loading || !hasNextPage) return
    fetchMore({
      variables: {
        limit: queryLength || DEFAULT_LOG_QUERY_LENGTH,
        time: { before: logs[logs.length - 1]?.timestamp, duration },
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

  const lastScrollTop = useRef(0)
  const onScrollCapture = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const scrollTop = e.currentTarget.scrollTop
      if (scrollTop === 0 && !filters.date) setLive(true)
      // if user scrolls away from the top, disable live logs
      else if (scrollTop > 0 && lastScrollTop.current === 0) setLive(false)
      lastScrollTop.current = scrollTop
    },
    [setLive, filters.date]
  )

  return (
    <>
      <Table
        flush
        fullHeightWrap
        virtualizeRows
        hideHeader
        loadingSkeletonRows={12}
        rowBg="raised"
        data={logs}
        columns={cols}
        isFetchingNextPage={loading}
        hasNextPage={
          hasNextPage &&
          logs.length >= (queryLength || DEFAULT_LOG_QUERY_LENGTH)
        }
        reactVirtualOptions={{ overscan: 25 }}
        fetchNextPage={fetchOlderLogs}
        loading={!!initialLoading}
        padCells={!!initialLoading}
        onScrollCapture={onScrollCapture}
        onRowClick={(_, row) => {
          setLogLine(row.original)
          setContextPanelOpen(true)
        }}
        background={
          logs.length ? theme.colors['fill-zero-selected'] : 'transparent'
        }
        {...{
          // stretches the skeleton loaders out to the end
          '& td *': { maxWidth: 'unset' },
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
            curDuration={duration}
            queryVars={{
              clusterId,
              serviceId,
              facets: labels,
            }}
          />
        </Flyover>
      )}
    </>
  )
}

const cols = [
  columnHelper.accessor((line) => line, {
    id: 'row',
    cell: function Cell({ getValue }) {
      const line = getValue()
      return <LogLine line={line} />
    },
  }),
]
