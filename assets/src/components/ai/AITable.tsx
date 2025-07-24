import { Table, TableProps } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { TableSkeleton } from 'components/utils/SkeletonLoaders'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  FetchPaginatedDataResult,
} from 'components/utils/table/useFetchPaginatedData'
import {
  AiPinsQuery,
  ChatThreadsQuery,
  ChatThreadTinyFragment,
} from 'generated/graphql'
import { useTheme } from 'styled-components'
import { AITableEntry } from './AITableEntry.tsx'

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
  rowData: ChatThreadTinyFragment[]
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
      rowBg="base"
      fullHeightWrap
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
      emptyStateProps={{ message: 'No entries found.' }}
      {...props}
    />
  )
}

const columnHelper = createColumnHelper<ChatThreadTinyFragment>()

// putting the whole row into a single column, easier to customize
const TableRow = columnHelper.accessor((item) => item, {
  id: 'row',
  cell: function Cell({ getValue, table }) {
    const item = getValue()

    return (
      <AITableEntry
        item={item}
        modal={table.options.meta?.modal}
        hidePins={table.options.meta?.hidePins}
      />
    )
  },
})

export const columns = [TableRow]
