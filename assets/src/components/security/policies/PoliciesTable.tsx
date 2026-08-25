import { Table } from '@pluralsh/design-system'
import type { Row } from '@tanstack/react-table'
import { VirtualSlice } from 'components/utils/table/useFetchPaginatedData'
import {
  PageInfoFragment,
  PoliciesQuery,
  PolicyTinyFragment,
} from 'generated/graphql'
import { useNavigate } from 'react-router-dom'
import { getPolicyDetailsAbsPath } from 'routes/securityRoutesConsts'
import styled from 'styled-components'
import { Edge } from 'utils/graphql'
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
  const navigate = useNavigate()

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
        onRowClick={(_e, { original }: Row<Edge<PolicyTinyFragment>>) => {
          if (original.node?.id)
            navigate(getPolicyDetailsAbsPath(original.node.id))
        }}
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
