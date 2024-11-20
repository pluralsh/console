import { ComponentProps, useEffect, useMemo } from 'react'
import { Button, EmptyState, Table } from '@pluralsh/design-system'
import { useNavigate } from 'react-router'
import { useTheme } from 'styled-components'
import type { Row } from '@tanstack/react-table'
import isEmpty from 'lodash/isEmpty'
import { PolicyConstraint, PolicyConstraintsQuery } from 'generated/graphql'
import { Edge } from 'utils/graphql'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { getPolicyDetailsPath } from 'routes/policiesRoutesConsts'

import { ColActions } from 'components/home/clusteroverview/ClusterOverviewTable'

import { DEFAULT_REACT_VIRTUAL_OPTIONS } from '../utils/table/useFetchPaginatedData'

import {
  ColCluster,
  ColDescription,
  ColPolicyName,
  ColViolations,
} from './PoliciesColumns'
import { TableFillLevel } from '@pluralsh/design-system/dist/components/table/Table'

const columns = [ColPolicyName, ColCluster, ColViolations, ColDescription]
const columnsWithActions = [
  ColPolicyName,
  ColCluster,
  ColViolations,
  ColDescription,
  ColActions,
]

export function PoliciesTable({
  caret = false,
  setRefetch,
  refetch,
  data,
  fetchNextPage,
  loading,
  setVirtualSlice,
  resetFilters,
  fillLevel,
}: {
  caret?: boolean
  setRefetch?: (refetch: () => () => void) => void
  refetch: () => void
  data: PolicyConstraintsQuery
  fetchNextPage: () => void
  loading: boolean
  setVirtualSlice: any
  resetFilters?: () => void
  fillLevel?: TableFillLevel
}) {
  const theme = useTheme()
  const navigate = useNavigate()

  useEffect(() => {
    setRefetch?.(() => refetch)
  }, [refetch, setRefetch])

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] =
    useMemo(
      () => ({
        meta: {
          refetch,
        },
      }),
      [refetch]
    )

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        height: '100%',
        width: '100%',
      }}
    >
      {!data ? (
        <LoadingIndicator />
      ) : !isEmpty(data?.policyConstraints?.edges) ? (
        <FullHeightTableWrap>
          <Table
            virtualizeRows
            fillLevel={fillLevel}
            data={data?.policyConstraints?.edges || []}
            columns={caret ? columnsWithActions : columns}
            css={{
              maxHeight: 'unset',
              height: '100%',
            }}
            onRowClick={(_e, { original }: Row<Edge<PolicyConstraint>>) =>
              navigate(
                getPolicyDetailsPath({
                  policyId: original.node?.id,
                })
              )
            }
            hasNextPage={data?.policyConstraints?.pageInfo?.hasNextPage}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={loading}
            reactTableOptions={reactTableOptions}
            reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
            onVirtualSliceChange={setVirtualSlice}
          />
        </FullHeightTableWrap>
      ) : (
        <div css={{ height: '100%' }}>
          <EmptyState message="No policies found" />
          <Button
            css={{ margin: 'auto' }}
            onClick={resetFilters}
          >
            Reset Filters
          </Button>
        </div>
      )}
    </div>
  )
}
