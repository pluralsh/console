import { createColumnHelper } from '@tanstack/react-table'

import { Table } from '@pluralsh/design-system'

import { useMemo } from 'react'

import {
  StackFragment,
  StackRunFragment,
  useStackRunsQuery,
} from '../../generated/graphql'
import { FullHeightTableWrap } from '../utils/layout/FullHeightTableWrap'
import {} from '../../routes/kubernetesRoutesConsts'
import { mapExistingNodes } from '../../utils/graphql'

const columnHelper = createColumnHelper<StackRunFragment>()

const columns = [
  columnHelper.accessor((run) => run?.id, {
    id: 'id',
    header: 'ID',
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((run) => run?.status, {
    id: 'status',
    header: 'Status',
    cell: ({ getValue }) => getValue(),
  }),
]

export default function Stack({ stack }: { stack?: Nullable<StackFragment> }) {
  const { data, loading, subscribeToMore, fetchMore } = useStackRunsQuery({
    variables: { id: stack?.id ?? '' },
    fetchPolicy: 'cache-and-network',
  })

  const runs = useMemo(
    () => mapExistingNodes(data?.infrastructureStack?.runs),
    [data?.infrastructureStack?.runs]
  )

  return (
    <FullHeightTableWrap css={{ display: 'flex', flexGrow: 1 }}>
      <Table
        data={runs}
        columns={columns}
        // hasNextPage={hasNextPage}
        // fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        virtualizeRows
        css={{
          maxHeight: 'unset',
          height: '100%',
        }}
      />
    </FullHeightTableWrap>
  )
}
