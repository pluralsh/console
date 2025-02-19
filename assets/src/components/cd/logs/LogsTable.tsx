import { Table } from '@pluralsh/design-system'
import { createColumnHelper, Row } from '@tanstack/react-table'
import { LogLineFragment } from 'generated/graphql'
import { useTheme } from 'styled-components'
import { LogLine } from './LogLine'

const columnHelper = createColumnHelper<LogLineFragment>()

export function LogsTable({
  data,
  loading,
  initialLoading,
  fetchMore,
  hasNextPage = false,
  onRowClick,
  onScrollCapture,
}: {
  data: LogLineFragment[]
  loading?: boolean
  initialLoading?: boolean
  fetchMore?: () => void
  hasNextPage?: boolean
  onRowClick?: (_e: any, row: Row<LogLineFragment>) => void
  onScrollCapture?: (e: React.UIEvent<HTMLDivElement>) => void
}) {
  const theme = useTheme()
  return (
    <Table
      flush
      fullHeightWrap
      virtualizeRows
      hideHeader
      loadingSkeletonRows={12}
      rowBg="raised"
      data={data}
      onRowClick={onRowClick}
      columns={cols}
      isFetchingNextPage={loading}
      hasNextPage={!!fetchMore && hasNextPage}
      fetchNextPage={fetchMore}
      loading={!!initialLoading}
      padCells={!!initialLoading}
      onScrollCapture={onScrollCapture}
      background={
        data.length ? theme.colors['fill-zero-selected'] : 'transparent'
      }
      {...{
        // stretches the skeleton loaders out to the end
        '& td *': { maxWidth: 'unset' },
      }}
    />
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
