import { H1 } from 'honorable'

import { useFetchPaginatedData } from 'components/cd/utils/useFetchPaginatedData'
import { GqlError } from 'components/utils/Alert'
import {
  PolicyAggregate,
  usePolicyConstraintsQuery,
  usePolicyStatisticsQuery,
} from 'generated/graphql'
import { useTheme } from 'styled-components'

import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'

import { POLICIES_QUERY_PAGE_SIZE } from 'components/policies/Policies'

import { PoliciesTable } from 'components/policies/PoliciesTable'

import { TableSkeleton } from 'components/utils/SkeletonLoaders'

import { HOME_CARD_MAX_HEIGHT, HomeCard } from '../../HomeCard'

import { ConstraintViolationsChart } from './ConstraintViolationsChart'

export function ConstraintViolationsCard() {
  const theme = useTheme()
  const {
    data: tableData,
    loading,
    error: tableError,
    refetch,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData({
    queryHook: usePolicyConstraintsQuery,
    pageSize: POLICIES_QUERY_PAGE_SIZE,
    queryKey: 'policyConstraints',
  })

  const { data: chartData, error: chartError } = usePolicyStatisticsQuery({
    variables: {
      aggregate: PolicyAggregate.Cluster,
    },
    pollInterval: POLL_INTERVAL,
  })

  if (chartError) {
    return <GqlError error={chartError} />
  }
  if (tableError) {
    return <GqlError error={tableError} />
  }

  return (
    <HomeCard>
      <div
        css={{
          display: 'flex',
          maxHeight: HOME_CARD_MAX_HEIGHT,
        }}
      >
        <div css={{ minWidth: 'fit-content', padding: theme.spacing.xlarge }}>
          <H1 title2>Constraint Violations</H1>
          <ConstraintViolationsChart data={chartData} />
        </div>
        <div
          css={{
            display: 'flex',
            width: '100%',
            padding: theme.spacing.medium,
          }}
        >
          {!tableData ? (
            <TableSkeleton centered />
          ) : (
            <PoliciesTable
              caret
              data={tableData}
              refetch={refetch}
              fetchNextPage={fetchNextPage}
              loading={loading}
              setVirtualSlice={setVirtualSlice}
            />
          )}
        </div>
      </div>
    </HomeCard>
  )
}
