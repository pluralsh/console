import { ComponentProps, useEffect, useMemo } from 'react'
import { EmptyState, Table } from '@pluralsh/design-system'
import { useNavigate } from 'react-router'
import { useTheme } from 'styled-components'
import type { Row } from '@tanstack/react-table'
import isEmpty from 'lodash/isEmpty'
import { PolicyConstraint, PolicyConstraintsQuery } from 'generated/graphql'
import { Edge } from 'utils/graphql'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { getPolicyDetailsPath } from 'routes/policiesRoutesConsts'

import { POLICIES_REACT_VIRTUAL_OPTIONS } from './Policies'
import {
  ColCluster,
  ColDescription,
  ColPolicyName,
  ColViolations,
} from './PoliciesColumns'

const columns = [ColPolicyName, ColCluster, ColViolations, ColDescription]

export function PoliciesTable({
  setRefetch,
  refetch,
  data,
  fetchNextPage,
  loading,
  setVirtualSlice,
}: {
  setRefetch?: (refetch: () => () => void) => void
  refetch: () => void
  data: PolicyConstraintsQuery
  fetchNextPage: () => void
  loading: boolean
  setVirtualSlice: any
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
      }}
    >
      {!data ? (
        <LoadingIndicator />
      ) : !isEmpty(data?.policyConstraints?.edges) ? (
        <FullHeightTableWrap>
          <Table
            virtualizeRows
            data={data?.policyConstraints?.edges || []}
            columns={columns}
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
            reactVirtualOptions={POLICIES_REACT_VIRTUAL_OPTIONS}
            onVirtualSliceChange={setVirtualSlice}
          />
        </FullHeightTableWrap>
      ) : (
        <div css={{ height: '100%' }}>
          <EmptyState message="Looks like you don't have any policies yet." />
        </div>
      )}
    </div>
  )
}
