import { CaretRightIcon, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { RunStatusChip } from 'components/ai/infra-research/details/InfraResearch'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { CaptionP } from 'components/utils/typography/Text'
import {
  WorkbenchJobTinyFragment,
  useWorkbenchJobsQuery,
} from 'generated/graphql'
import { truncate } from 'lodash'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import { mapExistingNodes } from 'utils/graphql'

export function WorkbenchJobsTable({ workbenchId }: { workbenchId: string }) {
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useWorkbenchJobsQuery, keyPath: ['workbench', 'runs'] },
      { id: workbenchId }
    )
  const jobs = useMemo(() => mapExistingNodes(data?.workbench?.runs), [data])

  if (error) return <GqlError error={error} />

  return (
    <Table
      hideHeader
      fullHeightWrap
      virtualizeRows
      data={jobs}
      columns={columns}
      loading={!data && loading}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      emptyStateProps={{ message: 'No jobs found.' }}
      getRowLink={({ original }) => {
        const { id: jobId } = original as WorkbenchJobTinyFragment
        return <Link to={getWorkbenchJobAbsPath({ workbenchId, jobId })} />
      }}
    />
  )
}

const columnHelper = createColumnHelper<WorkbenchJobTinyFragment>()
const columns = [
  columnHelper.accessor(
    ({ prompt }) => truncate(prompt ?? '', { length: 150 }),
    { id: 'prompt', meta: { gridTemplate: '1fr' } }
  ),
  columnHelper.accessor(({ user }) => user?.name, {
    id: 'creator',
    cell: ({ getValue }) => {
      const name = getValue()
      if (!name) return null
      return <CaptionP $color="text-xlight">{name}</CaptionP>
    },
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
