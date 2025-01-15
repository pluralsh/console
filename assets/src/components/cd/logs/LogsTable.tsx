import { Table } from '@pluralsh/design-system'
import { createColumnHelper, Row } from '@tanstack/react-table'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
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
}: {
  data: LogLineFragment[]
  loading?: boolean
  initialLoading?: boolean
  fetchMore?: () => void
  hasNextPage?: boolean
  onRowClick?: (_e: any, row: Row<LogLineFragment>) => void
}) {
  const theme = useTheme()
  return (
    <FullHeightTableWrap
      css={
        initialLoading
          ? { '& td *': { maxWidth: 'unset' } } // stretches the skeleton loaders out to the end
          : { '& td': { minHeight: 0 }, '& > div': { height: '100%' } } // allows rows to fit to content
      }
    >
      <Table
        flush
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
        css={{ background: theme.colors['fill-zero-selected'] }}
      />
    </FullHeightTableWrap>
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
