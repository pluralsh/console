import { ComponentProps, useEffect, useMemo } from 'react'
import { Button, Table, TableProps } from '@pluralsh/design-system'
import { useNavigate } from 'react-router'
import { useTheme } from 'styled-components'
import type { Row } from '@tanstack/react-table'
import {
  PolicyConstraintFragment,
  PolicyConstraintsQuery,
} from 'generated/graphql'
import { Edge } from 'utils/graphql'

import { getPolicyPath } from 'routes/securityRoutesConsts'

import { DEFAULT_REACT_VIRTUAL_OPTIONS } from '../../utils/table/useFetchPaginatedData'

import {
  ColCluster,
  ColDescription,
  ColPolicyName,
  ColViolations,
  ColActions,
} from './PoliciesColumns'

const columns = [ColPolicyName, ColCluster, ColViolations, ColDescription]
const columnsWithActions = [
  ColPolicyName,
  ColCluster,
  ColViolations,
  ColDescription,
  ColActions,
]

type PoliciesTableProps = {
  caret?: boolean
  setRefetch?: (refetch: () => () => void) => void
  refetch: () => void
  data?: PolicyConstraintsQuery
  loading: boolean
  setVirtualSlice: any
  resetFilters?: () => void
}

export function PoliciesTable({
  caret = false,
  setRefetch,
  refetch,
  data,
  loading,
  setVirtualSlice,
  resetFilters,
  ...props
}: PoliciesTableProps &
  Omit<TableProps, keyof PoliciesTableProps | 'data' | 'columns'>) {
  const theme = useTheme()
  const navigate = useNavigate()

  useEffect(() => {
    setRefetch?.(() => refetch)
  }, [refetch, setRefetch])

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] =
    useMemo(() => ({ meta: { refetch } }), [refetch])

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        height: '100%',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <Table
        fullHeightWrap
        virtualizeRows
        data={data?.policyConstraints?.edges || []}
        loading={!data && loading}
        columns={caret ? columnsWithActions : columns}
        onRowClick={(_e, { original }: Row<Edge<PolicyConstraintFragment>>) =>
          navigate(
            getPolicyPath({
              policyId: original.node?.id,
            })
          )
        }
        hasNextPage={data?.policyConstraints?.pageInfo?.hasNextPage}
        isFetchingNextPage={loading}
        reactTableOptions={reactTableOptions}
        reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
        onVirtualSliceChange={setVirtualSlice}
        emptyStateProps={{
          message: 'No policies found.',
          children: (
            <Button
              css={{ margin: 'auto' }}
              onClick={resetFilters}
            >
              Reset Filters
            </Button>
          ),
        }}
        {...props}
      />
    </div>
  )
}
