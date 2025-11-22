import {
  StackRunFragment,
  StackRunsQuery,
  StackRunsQueryVariables,
  useStackRunsQuery,
} from 'generated/graphql'

import { mapExistingNodes } from 'utils/graphql'

import { useMemo } from 'react'

import { Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import {
  FetchPaginatedDataOptions,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'
import { Link, useParams } from 'react-router-dom'
import { getStackRunsAbsPath } from 'routes/stacksRoutesConsts'
import { StackRunsEntry } from './StackRunsEntry'

export function StackRunsTable({
  variables,
  options,
}: {
  variables: StackRunsQueryVariables
  options: Omit<
    FetchPaginatedDataOptions<StackRunsQuery, StackRunsQueryVariables>,
    'queryHook' | 'keyPath'
  >
}) {
  const { stackId } = useParams()
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useStackRunsQuery,
        keyPath: ['infrastructureStack', 'runs'],
        ...options,
      },
      variables
    )

  const runs = useMemo(
    () => mapExistingNodes(data?.infrastructureStack?.runs),
    [data?.infrastructureStack?.runs]
  )

  if (error) return <GqlError error={error} />

  return (
    <Table
      rowBg="base"
      fillLevel={1}
      hideHeader
      fullHeightWrap
      virtualizeRows
      data={runs}
      loading={!data && loading}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      columns={cols}
      getRowLink={({ original }) => {
        const { id } = original as StackRunFragment
        return <Link to={getStackRunsAbsPath(stackId, id)} />
      }}
      overflowX="hidden"
    />
  )
}

const columnHelper = createColumnHelper<StackRunFragment>()

const cols = [
  columnHelper.accessor((run) => run, {
    id: 'run',
    meta: { gridTemplate: '1fr' },
    cell: function Cell({ getValue }) {
      const run = getValue()
      return (
        <StackRunsEntry
          key={run.id}
          stackRun={run}
        />
      )
    },
  }),
]
