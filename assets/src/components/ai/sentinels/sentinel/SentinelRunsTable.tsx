import { CaretRightIcon, Flex, IconFrame, Table } from '@pluralsh/design-system'
import { createColumnHelper, Row } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { Body2P } from 'components/utils/typography/Text'
import {
  SentinelRunFragment,
  SentinelRunStatus,
  useSentinelRunsQuery,
} from 'generated/graphql'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AI_SENTINELS_RUNS_REL_PATH } from 'routes/aiRoutesConsts'
import { fromNow } from 'utils/datetime'
import { mapExistingNodes } from 'utils/graphql'
import { SentinelStatusChip } from '../SentinelsTableCols'

export function SentinelRunsTable({ id }: { id: string }) {
  const navigate = useNavigate()
  const { data, error, loading, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useSentinelRunsQuery, keyPath: ['sentinel', 'runs'] },
      { id }
    )
  const runsLoading = !data && loading
  const runs = useMemo(
    () => mapExistingNodes(data?.sentinel?.runs),
    [data?.sentinel?.runs]
  )
  const numRuns = runs?.length ?? 0

  return (
    <Flex
      direction="column"
      gap="xsmall"
      overflow="hidden"
    >
      <StackedText
        loading={runsLoading}
        first={`Historical runs (${numRuns > 99 ? '100+' : numRuns})`}
        firstPartialType="body2Bold"
        firstColor="text"
        second="Previous executions of this sentinel"
        secondPartialType="body2"
        secondColor="text-light"
      />
      {error ? (
        <GqlError error={error} />
      ) : (
        <Table
          hideHeader
          rowBg="base"
          fillLevel={1}
          fullHeightWrap
          virtualizeRows
          loading={runsLoading}
          data={runs}
          columns={runsCols}
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          onRowClick={(_e, { original }: Row<SentinelRunFragment>) => {
            if (original.id)
              navigate(`${AI_SENTINELS_RUNS_REL_PATH}/${original.id}`)
          }}
          onVirtualSliceChange={setVirtualSlice}
          emptyStateProps={{ message: 'No runs found.' }}
        />
      )}
    </Flex>
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
