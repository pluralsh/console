import { Flyover, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import {
  LogAggregationQueryResult,
  LogFacetInput,
  LogLineFragment,
  LogQueryOperator,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useCallback, useRef, useState } from 'react'
import { useTheme } from 'styled-components'
import { LogContextPanel } from './LogContextPanel'
import { LogLine } from './LogLine'

const columnHelper = createColumnHelper<LogLineFragment>()

export function LogsTable({
  logs,
  loading,
  initialLoading,
  queryLength,
  queryOperator,
  duration,
  rangeStart,
  fetchMore,
  setFollowing,
  addLabel,
  labels,
  clusterId,
  serviceId,
}: {
  logs: LogLineFragment[]
  loading?: boolean
  initialLoading?: boolean
  queryLength: number
  queryOperator: LogQueryOperator
  /** ISO 8601 duration of the selected window, e.g. `PT900S`. */
  duration: string
  /** Start of an absolute window; older pages stop here. */
  rangeStart?: Date
  fetchMore: LogAggregationQueryResult['fetchMore']
  /** Called with `false` when scrolled away from the newest logs, `true` on return. */
  setFollowing?: (following: boolean) => void
  addLabel: (key: string, value: string) => void
  labels: LogFacetInput[]
  clusterId?: string
  serviceId?: string
}) {
  const theme = useTheme()
  const [contextPanelOpen, setContextPanelOpen] = useState(false)
  const [logLine, setLogLine] = useState<Nullable<LogLineFragment>>(null)
  const [hasNextPage, setHasNextPage] = useState(true)

  const fetchOlderLogs = useCallback(() => {
    if (loading || !hasNextPage) return
    const before = logs[logs.length - 1]?.timestamp
    fetchMore({
      variables: {
        limit: queryLength,
        time: rangeStart
          ? { before, after: rangeStart.toISOString() }
          : { before, duration },
        operator: queryOperator,
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
    fetchMore,
    queryLength,
    logs,
    duration,
    rangeStart,
    queryOperator,
  ])

  const lastScrollTop = useRef(0)
  const onScrollCapture = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const scrollTop = e.currentTarget.scrollTop
      if (scrollTop === 0) setFollowing?.(true)
      else if (lastScrollTop.current === 0) setFollowing?.(false)
      lastScrollTop.current = scrollTop
    },
    [setFollowing]
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
        hasNextPage={hasNextPage && logs.length >= queryLength}
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
              operator: queryOperator,
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
