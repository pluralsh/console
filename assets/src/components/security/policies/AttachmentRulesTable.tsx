import { Table } from '@pluralsh/design-system'
import type { Row } from '@tanstack/react-table'
import { VirtualSlice } from 'components/utils/table/useFetchPaginatedData'
import {
  BindingPoliciesQuery,
  BindingPolicyTinyFragment,
  PageInfoFragment,
} from 'generated/graphql'
import { useNavigate } from 'react-router-dom'
import { getAttachmentRuleEditAbsPath } from 'routes/securityRoutesConsts'
import styled from 'styled-components'
import { Edge } from 'utils/graphql'
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
  const navigate = useNavigate()

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
        onRowClick={(
          _e,
          { original }: Row<Edge<BindingPolicyTinyFragment>>
        ) => {
          if (original.node?.id)
            navigate(getAttachmentRuleEditAbsPath(original.node.id))
        }}
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
