import { CaretRightIcon, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { RunStatusChip } from 'components/ai/infra-research/details/InfraResearch'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  WorkbenchJobTinyFragment,
  useWorkbenchRunsQuery,
} from 'generated/graphql'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getWorkbenchRunAbsPath } from 'routes/workbenchesRoutesConsts'
import { mapExistingNodes } from 'utils/graphql'

export function WorkbenchRunsTable({ workbenchId }: { workbenchId: string }) {
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useWorkbenchRunsQuery, keyPath: ['workbench', 'runs'] },
      { id: workbenchId }
    )
  const runs = useMemo(() => mapExistingNodes(data?.workbench?.runs), [data])

  if (error) return <GqlError error={error} />

  return (
    <Table
      hideHeader
      fullHeightWrap
      virtualizeRows
      data={runs}
      columns={columns}
      loading={!data && loading}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      emptyStateProps={{ message: 'No runs found.' }}
      getRowLink={({ original }) => {
        const { id: runId } = original as WorkbenchJobTinyFragment
        return <Link to={getWorkbenchRunAbsPath({ workbenchId, runId })} />
      }}
    />
  )
}

const columnHelper = createColumnHelper<WorkbenchJobTinyFragment>()

const columns = [
  columnHelper.accessor(({ prompt }) => prompt, {
    id: 'prompt',
    meta: { gridTemplate: '1fr' },
  }),
  columnHelper.accessor(({ status }) => status, {
    id: 'status',
    cell: ({ getValue }) => <RunStatusChip status={getValue()} />,
  }),
  columnHelper.display({
    id: 'insertedAt',
    cell: () => <CaretRightIcon color="icon-xlight" />,
  }),
]
