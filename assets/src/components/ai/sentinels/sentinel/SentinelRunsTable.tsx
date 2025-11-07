import {
  CaretRightIcon,
  Flex,
  IconFrame,
  Table,
  TableProps,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { POLL_INTERVAL } from 'components/cluster/constants'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { Body2BoldP, Body2P } from 'components/utils/typography/Text'
import {
  SentinelRunFragment,
  SentinelRunStatus,
  useSentinelRunsQuery,
} from 'generated/graphql'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AI_SENTINELS_RUNS_REL_PATH } from 'routes/aiRoutesConsts'
import { fromNow } from 'utils/datetime'
import { mapExistingNodes } from 'utils/graphql'
import { SentinelStatusChip } from '../SentinelsTableCols'

export function SentinelRunsTables({ id }: { id: string }) {
  const latestRunQuery = useSentinelRunsQuery({
    variables: { id, first: 1 },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const { data, error, loading, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useSentinelRunsQuery, keyPath: ['sentinel', 'runs'] },
      { id }
    )

  const latestRun = latestRunQuery.data?.sentinel?.runs?.edges?.[0]?.node
  const { loading: latestRunLoading, error: latestRunError } = latestRunQuery

  const historicalRunsLoading = !data && loading

  const historicalRuns = useMemo(
    () =>
      mapExistingNodes(data?.sentinel?.runs).filter(
        (run) => run.id !== latestRun?.id
      ),
    [data?.sentinel?.runs, latestRun?.id]
  )
  const numHistoricalRuns = historicalRuns?.length ?? 0

  return (
    <>
      {(latestRun || latestRunError || latestRunLoading) && (
        <Flex
          direction="column"
          gap="xsmall"
        >
          <Body2BoldP $color="text">Latest run</Body2BoldP>
          {latestRunError && <GqlError error={latestRunError} />}
          {latestRun && (
            <SentinelRunsTable
              runs={[latestRun]}
              loading={latestRunLoading}
            />
          )}
        </Flex>
      )}
      <Flex
        direction="column"
        gap="xsmall"
        overflow="hidden"
      >
        <StackedText
          loading={historicalRunsLoading}
          first={`Historical runs (${numHistoricalRuns > 99 ? '100+' : numHistoricalRuns})`}
          firstPartialType="body2Bold"
          firstColor="text"
          second="Previous executions of this sentinel"
          secondPartialType="body2"
          secondColor="text-light"
        />
        {error ? (
          <GqlError error={error} />
        ) : (
          <SentinelRunsTable
            runs={historicalRuns}
            loading={historicalRunsLoading}
            hasNextPage={pageInfo?.hasNextPage}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={loading}
            onVirtualSliceChange={setVirtualSlice}
          />
        )}
      </Flex>
    </>
  )
}

function SentinelRunsTable({
  runs,
  ...props
}: { runs: SentinelRunFragment[] } & Omit<TableProps, 'data' | 'columns'>) {
  return (
    <Table
      hideHeader
      rowBg="base"
      fillLevel={1}
      fullHeightWrap
      virtualizeRows
      data={runs}
      columns={runsCols}
      getRowLink={({ original }) => (
        <Link
          to={`${AI_SENTINELS_RUNS_REL_PATH}/${(original as SentinelRunFragment).id}`}
        />
      )}
      emptyStateProps={{ message: 'No runs found.' }}
      {...props}
    />
  )
}

const columnHelper = createColumnHelper<SentinelRunFragment>()

const runsCols = [
  columnHelper.accessor((run) => getRunNameFromId(run.id), {
    id: 'name',
    meta: { gridTemplate: '1fr' },
    cell: function Cell({ getValue }) {
      return <Body2P $color="text">{getValue()}</Body2P>
    },
  }),
  columnHelper.accessor((run) => run, {
    id: 'startedAt',
    cell: function Cell({ getValue }) {
      const { status, insertedAt } = getValue()
      return !!insertedAt && status !== SentinelRunStatus.Pending
        ? fromNow(insertedAt)
        : '---'
    },
  }),
  columnHelper.accessor((run) => run, {
    id: 'status',
    cell: function Cell({ getValue }) {
      const { status, insertedAt } = getValue()
      return (
        <SentinelStatusChip
          showSeverity
          lastRunAt={insertedAt}
          status={status}
        />
      )
    },
  }),
  columnHelper.display({
    id: 'actions',
    cell: function Cell() {
      return (
        <IconFrame
          clickable
          tooltip="View run details"
          icon={<CaretRightIcon />}
        />
      )
    },
  }),
]

export const getRunNameFromId = (id: string) => `run-${id.split('-').shift()}`
