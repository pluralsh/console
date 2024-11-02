import { Table } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { TableSkeleton } from 'components/utils/SkeletonLoaders'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  FetchPaginatedDataResult,
} from 'components/utils/table/useFetchPaginatedData'
import { AiPinFragment, AiPinsQuery } from 'generated/graphql'
import { useTheme } from 'styled-components'
import { pinTableColumns } from './AIThreadsTable'

export function AIPinsTable({
  filteredPins,
  pinsQuery,
  refetch,
}: {
  filteredPins: AiPinFragment[]
  pinsQuery: FetchPaginatedDataResult<AiPinsQuery>
  refetch: () => void
}) {
  const theme = useTheme()
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    pinsQuery
  const reactTableOptions = { meta: { refetch } }

  if (error) return <GqlError error={error} />
  if (!data?.aiPins?.edges) return <TableSkeleton />

  return (
    <FullHeightTableWrap>
      <Table
        virtualizeRows
        padCells={false}
        data={filteredPins}
        columns={pinTableColumns}
        hideHeader
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
        reactTableOptions={reactTableOptions}
        css={{
          height: '100%',
          overflowX: 'hidden',
          border: theme.borders['fill-one'],
        }}
        emptyStateProps={{
          message: 'No chat threads found.',
        }}
      />
    </FullHeightTableWrap>
  )
}
