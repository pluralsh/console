import { Table } from '@pluralsh/design-system'
import { VirtualSlice } from 'components/utils/table/useFetchPaginatedData'
import { BindingPoliciesQuery, PageInfoFragment } from 'generated/graphql'
import styled from 'styled-components'
import {
  ColActions,
  ColBindPolicy,
  ColRules,
  ColTarget,
} from './AttachmentRulesColumns'

const columns = [ColRules, ColBindPolicy, ColTarget, ColActions]

export function AttachmentRulesTable({
  data,
  loading,
  pageInfo,
  fetchNextPage,
  setVirtualSlice,
}: {
  data?: BindingPoliciesQuery
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
        data={data?.bindingPolicies?.edges || []}
        loading={!data && loading}
        columns={columns}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        emptyStateProps={{ message: 'No attachment rules found.' }}
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
