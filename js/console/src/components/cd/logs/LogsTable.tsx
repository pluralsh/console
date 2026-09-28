import { Button, Flex, Flyover, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import {
  LogAggregationQueryResult,
  LogFacetInput,
  LogLineFragment,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useCallback, useMemo, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { LogContextPanel } from './LogContextPanel'
import { LogLine } from './LogLine'
import { DEFAULT_LOG_QUERY_LENGTH, secondsToDuration } from './Logs'
import { LogsFiltersT } from './LogsFilters'
import type { LogsTimeRange } from './Logs'
import { isLogSearchActive, logMatchesSearch } from './logSearch'

const columnHelper = createColumnHelper<LogLineFragment>()

export function LogsTable({
  logs,
  query,
  loading,
  initialLoading,
  filters,
  fetchMore,
  setLive,
  addLabel,
  labels,
  clusterId,
  serviceId,
  rangeFilter,
}: {
  logs: LogLineFragment[]
  query: string
  loading?: boolean
  initialLoading?: boolean
  filters: LogsFiltersT
  fetchMore: LogAggregationQueryResult['fetchMore']
  live: boolean
  setLive: (live: boolean) => void
  addLabel: (key: string, value: string) => void
  labels: LogFacetInput[]
  clusterId?: string
  serviceId?: string
  rangeFilter?: LogsTimeRange | null
}) {
  const theme = useTheme()
  const [contextPanelOpen, setContextPanelOpen] = useState(false)
  const [logLine, setLogLine] = useState<Nullable<LogLineFragment>>(null)
  const [exhaustedPageKey, setExhaustedPageKey] = useState('')
  const [matchNav, setMatchNav] = useState({ key: '', index: 0 })
  const { queryLength, sinceSeconds, queryOperator } = filters
  const duration = secondsToDuration(sinceSeconds)
  const searchActive = isLogSearchActive(query)
  const pageKey = useMemo(
    () =>
      JSON.stringify({
        query,
        queryOperator,
        labels,
        clusterId,
        serviceId,
        rangeFilter,
        sinceSeconds,
        date: filters.date,
        queryLength,
      }),
    [
      query,
      queryOperator,
      labels,
      clusterId,
      serviceId,
      rangeFilter,
      sinceSeconds,
      filters.date,
      queryLength,
    ]
  )
  const hasNextPage = exhaustedPageKey !== pageKey

  const displayedLogs = useMemo(
    () =>
      searchActive
        ? logs.filter((log) => logMatchesSearch(log.log, query, queryOperator))
        : logs,
    [logs, query, queryOperator, searchActive]
  )
  const matchCount = displayedLogs.length
  const navIndex = matchNav.key === pageKey ? matchNav.index : 0
  const activeMatchIndex = matchCount ? Math.min(navIndex, matchCount - 1) : 0
  const activeRowId =
    searchActive && matchCount ? `${activeMatchIndex}` : undefined

  const updateActiveMatchIndex = useCallback(
    (update: (index: number) => number) => {
      setMatchNav((prev) => {
        const current =
          prev.key === pageKey
            ? Math.min(prev.index, Math.max(matchCount - 1, 0))
            : 0
        return { key: pageKey, index: update(current) }
      })
    },
    [matchCount, pageKey]
  )

  const fetchOlderLogs = useCallback(() => {
    if (loading || !hasNextPage) return
    fetchMore({
      variables: {
        clusterId,
        serviceId,
        query,
        limit: queryLength || DEFAULT_LOG_QUERY_LENGTH,
        time: { before: logs[logs.length - 1]?.timestamp, duration },
        operator: queryOperator,
        facets: labels,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        // first log will be duplicate of last since range is inclusive
        const newLogs = fetchMoreResult.logAggregation?.slice(1) ?? []
        if (isEmpty(newLogs)) {
          setExhaustedPageKey(pageKey)
          return prev
        }
        return { logAggregation: [...(prev.logAggregation ?? []), ...newLogs] }
      },
    })
  }, [
    loading,
    hasNextPage,
    fetchMore,
    clusterId,
    serviceId,
    query,
    queryLength,
    logs,
    duration,
    queryOperator,
    labels,
    pageKey,
  ])

  const lastScrollTop = useRef(0)
  const onScrollCapture = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const scrollTop = e.currentTarget.scrollTop
      if (scrollTop === 0 && !filters.date && !rangeFilter) setLive(true)
      // if user scrolls away from the top, disable live logs
      else if (scrollTop > 0 && lastScrollTop.current === 0) setLive(false)
      lastScrollTop.current = scrollTop
    },
    [setLive, filters.date, rangeFilter]
  )

  const cols = useMemo(
    () => [
      columnHelper.accessor((line) => line, {
        id: 'row',
        cell: function Cell({ getValue, row }) {
          const line = getValue()
          return (
            <LogLine
              line={line}
              searchQuery={query}
              highlighted={searchActive && row.index === activeMatchIndex}
            />
          )
        },
      }),
    ],
    [activeMatchIndex, query, searchActive]
  )

  return (
    <>
      {searchActive && (
        <SearchSummarySC
          align="center"
          justify="space-between"
        >
          <span>
            {matchCount
              ? `${activeMatchIndex + 1} / ${matchCount} loaded matches`
              : 'No loaded matches'}
          </span>
          <Flex gap="xsmall">
            <Button
              small
              secondary
              disabled={matchCount <= 1}
              onClick={() =>
                updateActiveMatchIndex((i) =>
                  i === 0 ? matchCount - 1 : i - 1
                )
              }
            >
              Previous
            </Button>
            <Button
              small
              secondary
              disabled={matchCount <= 1}
              onClick={() =>
                updateActiveMatchIndex((i) => (i + 1) % Math.max(matchCount, 1))
              }
            >
              Next
            </Button>
          </Flex>
        </SearchSummarySC>
      )}
      <Table
        flush
        fullHeightWrap
        virtualizeRows
        hideHeader
        loadingSkeletonRows={12}
        rowBg="raised"
        data={displayedLogs}
        columns={cols}
        isFetchingNextPage={loading}
        highlightedRowId={activeRowId}
        hasNextPage={
          !rangeFilter &&
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
              operator: queryOperator,
            }}
          />
        </Flyover>
      )}
    </>
  )
}

const SearchSummarySC = styled(Flex)(({ theme }) => ({
  minHeight: 36,
  padding: `${theme.spacing.xxsmall}px ${theme.spacing.small}px`,
  borderBottom: theme.borders['fill-two'],
  backgroundColor: theme.colors['fill-one'],
  color: theme.colors['text-light'],
  ...theme.partials.text.body2,
}))
