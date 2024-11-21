import { Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { TableSkeleton } from 'components/utils/SkeletonLoaders'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  FetchPaginatedDataResult,
} from 'components/utils/table/useFetchPaginatedData'
import {
  AiPinFragment,
  AiPinsQuery,
  ChatThreadsQuery,
  ChatThreadTinyFragment,
  useCreateAiPinMutation,
  useDeleteAiPinMutation,
} from 'generated/graphql'
import { useTheme } from 'styled-components'
import { AITableEntry } from './AITableEntry.tsx'
import { TableProps } from '@pluralsh/design-system/dist/components/table/Table'

export function AITable({
  modal = false,
  hidePins = false,
  query,
  rowData,
  ...props
}: {
  modal?: boolean
  hidePins?: boolean
  query: FetchPaginatedDataResult<AiPinsQuery | ChatThreadsQuery>
  rowData: AiPinFragment[] | ChatThreadTinyFragment[]
} & Omit<TableProps, 'data' | 'columns'>) {
  const theme = useTheme()

  const reactTableOptions = {
    meta: { modal, hidePins },
  }

  if (query.error) return <GqlError error={query.error} />

  if (!query.data)
    return (
      <TableSkeleton
        numColumns={1}
        height={70}
        centered={true}
        styles={{
          background: theme.colors['fill-one'],
          height: '100%',
          padding: theme.spacing.xlarge,
          '> svg': {
            width: '100%',
          },
        }}
      />
    )

  return (
    <Table
      virtualizeRows
      padCells={false}
      data={rowData}
      columns={columns}
      hideHeader
      hasNextPage={query.pageInfo?.hasNextPage}
      fetchNextPage={query.fetchNextPage}
      isFetchingNextPage={query.loading}
      onVirtualSliceChange={query.setVirtualSlice}
      reactTableOptions={reactTableOptions}
      reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
      css={{
        height: '100%',
        overflowX: 'hidden',
        border: theme.borders['fill-one'],
      }}
      emptyStateProps={{ message: 'No entries found.' }}
      {...props}
    />
  )
}

const columnHelper = createColumnHelper<
  AiPinFragment | ChatThreadTinyFragment
>()

// putting the whole row into a single column, easier to customize
const TableRow = columnHelper.accessor((item) => item, {
  id: 'row',
  cell: function Cell({ getValue, table }) {
    const item = getValue()
    const isPin = item.__typename === 'AiPin'
    const thread = isPin ? item.thread : (item as ChatThreadTinyFragment)

    const [pinThread, { loading: pinLoading }] = useCreateAiPinMutation({
      awaitRefetchQueries: true,
      refetchQueries: ['AIPins', 'ChatThreads'],
      variables: {
        attributes: {
          threadId: thread?.id,
          insightId: thread?.insight?.id,
          name: thread?.summary.substring(0, 250),
        },
      },
    })

    const [unpinThread, { loading: unpinLoading }] = useDeleteAiPinMutation({
      awaitRefetchQueries: true,
      refetchQueries: ['AIPins', 'ChatThreads'],
      variables: {
        id: item.id,
      },
    })

    return (
      <AITableEntry
        item={item}
        onClickPin={() => (isPin ? unpinThread() : pinThread())}
        pinLoading={pinLoading || unpinLoading}
        modal={table.options.meta?.modal}
        hidePins={table.options.meta?.hidePins}
      />
    )
  },
})

export const columns = [TableRow]
