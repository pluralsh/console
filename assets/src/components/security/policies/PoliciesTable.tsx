import { Table } from '@pluralsh/design-system'
import { VirtualSlice } from 'components/utils/table/useFetchPaginatedData'
import { PageInfoFragment, PoliciesQuery } from 'generated/graphql'
import styled from 'styled-components'
import {
  ColActions,
  ColName,
  ColProject,
  ColType,
  ColUpdated,
} from './PoliciesColumns'

const columns = [ColName, ColProject, ColUpdated, ColType, ColActions]

export function PoliciesTable({
  data,
  loading,
  pageInfo,
  fetchNextPage,
  setVirtualSlice,
}: {
  data?: PoliciesQuery
  loading: boolean
  pageInfo?: PageInfoFragment
  fetchNextPage: () => void
  setVirtualSlice: (slice: VirtualSlice) => void
}) {
  return (
    <WrapperSC>
      <Table
        fullHeightWrap
        virtualizeRows
        data={data?.policies?.edges || []}
        loading={!data && loading}
        columns={columns}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        emptyStateProps={{ message: 'No policies found.' }}
      />
    </WrapperSC>
  )
}

const WrapperSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  height: '100%',
  overflow: 'hidden',
})
